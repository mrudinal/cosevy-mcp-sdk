from __future__ import annotations

import json
import re
import time
from collections.abc import Iterator, Mapping, Sequence
from typing import Any, Literal
from urllib.parse import quote

import httpx

from .config import (
    DEFAULT_COSEVI_BASE_URL,
    DEFAULT_COSEVI_REFERER,
    resolve_cosevi_config,
)
from .exceptions import CoseviApiError, CoseviAuthError, CoseviConfigError, CoseviRateLimitError
from .known_dashboards import (
    KNOWN_COSEVI_DASHBOARDS,
    KnownCoseviDashboard,
    get_known_dashboard,
    list_known_dashboards,
)
from .models import ALLOWED_FORMATS, ALLOWED_RESOURCE_TYPES, DatastreamFormat, ResourceType

DEFAULT_BASE_URL = DEFAULT_COSEVI_BASE_URL
DEFAULT_REFERER = DEFAULT_COSEVI_REFERER
MAX_LIMIT = 500
MAX_EXPRESSIONS = 10
MAX_EXPRESSION_LENGTH = 200
RESERVED_EXTRA_PARAM_PATTERNS = [
    re.compile(r"^auth_key$", re.I),
    re.compile(r"^limit$", re.I),
    re.compile(r"^offset$", re.I),
    re.compile(r"^page$", re.I),
    re.compile(r"^where$", re.I),
    re.compile(r"^applyFormat$", re.I),
    re.compile(r"^format$", re.I),
    re.compile(r"^filter\d+$", re.I),
    re.compile(r"^orderBy\d+$", re.I),
    re.compile(r"^groupBy\d+$", re.I),
    re.compile(r"^function\d+$", re.I),
    re.compile(r"^pArgument\d+$", re.I),
]


def _strip_auth_key(url: str) -> str:
    try:
        return re.sub(r"([&?])auth_key=[^&]*", r"\1auth_key=REDACTED", url)
    except Exception:
        return url


def encode_guid(guid: str) -> str:
    return quote(guid, safe="")


def append_indexed_params(params: dict[str, Any], prefix: str, values: Sequence[str] | None) -> None:
    if not values:
        return
    for index, value in enumerate(values):
        params[f"{prefix}{index}"] = value


def append_parameters(params: dict[str, Any], values: Sequence[str | int | float | bool] | None) -> None:
    if not values:
        return
    for index, value in enumerate(values):
        params[f"pArgument{index}"] = value


def assert_no_reserved_extra_params(extra_params: Mapping[str, Any] | None) -> None:
    if not extra_params:
        return
    for key in extra_params:
        if any(pattern.match(key) for pattern in RESERVED_EXTRA_PARAM_PATTERNS):
            raise CoseviConfigError(f"extra_params contains reserved key: {key}")


def validate_expression(value: str, label: str) -> None:
    trimmed = value.strip()
    if not trimmed:
        raise CoseviConfigError(f"{label} entries must not be empty")
    if len(trimmed) > MAX_EXPRESSION_LENGTH:
        raise CoseviConfigError(f"{label} entry is too long")
    if re.search(r"[;\r\n\0]", trimmed):
        raise CoseviConfigError(f"{label} contains unsafe characters")


def validate_expression_list(values: Sequence[str] | None, label: str) -> None:
    if not values:
        return
    if len(values) > MAX_EXPRESSIONS:
        raise CoseviConfigError(f"{label} supports at most {MAX_EXPRESSIONS} entries")
    for value in values:
        validate_expression(value, label)


def get_accept_header(format_name: str) -> str:
    if format_name == "csv":
        return "text/csv"
    if format_name == "xml":
        return "application/xml, text/xml"
    if format_name == "xls":
        return "application/json, application/vnd.ms-excel, */*"
    if format_name == "jsonp":
        return "text/javascript, application/javascript, text/plain"
    if format_name in ("tableau.html", "html"):
        return "text/html"
    return "application/json"


class CoseviClient:
    """Synchronous client for COSEVI Datos Abiertos / Junar API v2."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        referer: str | None = None,
        timeout: float = 30.0,
        client: httpx.Client | None = None,
        max_requests_per_second: int = 4,
        retry_on_rate_limit: bool = True,
        retry_delay_seconds: float = 1.2,
        max_retries: int = 2,
        env_path: str | None = None,
    ) -> None:
        resolved = resolve_cosevi_config(
            api_key=api_key,
            base_url=base_url,
            referer=referer,
            env_path=env_path,
        )
        key = resolved.api_key or ""
        if not key:
            raise CoseviConfigError("COSEVI_AUTH_KEY is required (pass api_key or set env var)")
        self._api_key = key
        # Keep legacy attribute for backward compat
        self.api_key = key
        self._base_url = resolved.base_url.rstrip("/")
        self.base_url = self._base_url
        self._referer = resolved.referer or DEFAULT_REFERER
        self.referer = self._referer
        self._config_source = resolved
        self._owns_client = client is None
        self.max_requests_per_second = max_requests_per_second
        self.retry_on_rate_limit = retry_on_rate_limit
        self.retry_delay_seconds = retry_delay_seconds
        self.max_retries = max_retries
        self._request_timestamps: list[float] = []
        headers: dict[str, str] = {}
        if self._referer:
            headers["Referer"] = self._referer
        self._client = client or httpx.Client(timeout=timeout, headers=headers)

    @classmethod
    def from_env(cls) -> "CoseviClient":
        return cls()

    def get_sanitized_config(self) -> dict[str, Any]:
        return {
            "hasApiKey": bool(self._api_key),
            "baseUrl": self._base_url,
            "hasReferer": bool(self._referer),
        }

    def get_resolved_config_source(self) -> dict[str, Any]:
        return {
            "apiKeySource": self._config_source.api_key_source,
            "baseUrlSource": self._config_source.base_url_source,
            "refererSource": self._config_source.referer_source,
            "os": self._config_source.os_name,
        }

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "CoseviClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ── Rate limiting ──────────────────────────────────────────────────────

    def _enforce_rate_limit(self) -> None:
        now = time.monotonic()
        self._request_timestamps = [stamp for stamp in self._request_timestamps if stamp > now - 1.0]
        if len(self._request_timestamps) >= self.max_requests_per_second:
            wait_for = 1.0 - (now - self._request_timestamps[0])
            if wait_for > 0:
                time.sleep(wait_for)
        self._request_timestamps.append(time.monotonic())

    # ── Core HTTP ──────────────────────────────────────────────────────────

    def _get_retry_delay(self, response: httpx.Response) -> float:
        retry_after = response.headers.get("retry-after")
        if retry_after is None:
            return self.retry_delay_seconds
        try:
            return float(retry_after)
        except ValueError:
            return self.retry_delay_seconds

    def _safe_body(self, response: httpx.Response) -> Any:
        try:
            return response.json()
        except Exception:
            return response.text

    def _safe_limit(self, limit: int) -> int:
        if limit < 1:
            raise CoseviConfigError("limit must be >= 1")
        return min(limit, MAX_LIMIT)

    def _assert_guid(self, guid: str) -> None:
        if not guid or not guid.strip():
            raise CoseviConfigError("guid is required")

    def _request(self, path: str, *, params: Mapping[str, Any] | None = None, accept: str = "application/json") -> httpx.Response:
        merged: dict[str, Any] = {"auth_key": self._api_key}
        if params:
            merged.update(params)
        self._enforce_rate_limit()
        safe_url_base = f"{self._base_url}{path}"
        headers = {"Accept": accept}
        if self._referer:
            headers["Referer"] = self._referer

        for attempt in range(self.max_retries + 1):
            response = self._client.get(safe_url_base, params=merged, headers=headers)
            safe_url = _strip_auth_key(str(response.request.url))

            if response.status_code == 429 and self.retry_on_rate_limit and attempt < self.max_retries:
                time.sleep(self._get_retry_delay(response))
                continue
            if 500 <= response.status_code < 600 and attempt < self.max_retries:
                time.sleep(self.retry_delay_seconds)
                continue
            if response.status_code == 429:
                retry_after: float | None = None
                try:
                    retry_after = float(response.headers.get("retry-after", ""))
                except Exception:
                    pass
                raise CoseviRateLimitError(
                    "COSEVI/Junar rate limit exceeded",
                    response.status_code,
                    self._safe_body(response),
                    safe_url,
                    retry_after,
                )
            if response.status_code in (401, 403):
                raise CoseviAuthError(
                    "COSEVI/Junar authentication failed",
                    response.status_code,
                    self._safe_body(response),
                    safe_url,
                )
            if not response.is_success:
                raise CoseviApiError(
                    f"COSEVI/Junar API error: HTTP {response.status_code}",
                    response.status_code,
                    self._safe_body(response),
                    safe_url,
                )
            return response
        raise CoseviApiError("COSEVI/Junar request failed", safe_url=safe_url_base)

    def _get_json(self, path: str, *, params: Mapping[str, Any] | None = None, accept: str = "application/json") -> Any:
        response = self._request(path, params=params, accept=accept)
        return response.json()

    def _get_text(self, path: str, *, params: Mapping[str, Any] | None = None, accept: str = "text/plain") -> str:
        response = self._request(path, params=params, accept=accept)
        return response.text

    # ── Shared param builder ───────────────────────────────────────────────

    def _build_metadata_list_params(
        self,
        query: str | None,
        categories: Sequence[str] | None,
        order: str | None,
        limit: int,
        offset: int,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": self._safe_limit(limit), "offset": offset}
        if query:
            params["query"] = query
        if categories:
            params["categories"] = ",".join(categories)
        if order:
            params["order"] = order
        return params

    def _build_datastream_params(
        self,
        limit: int | None,
        page: int | None,
        filters: Sequence[str] | None,
        where: str | None,
        order_by: Sequence[str] | None,
        apply_format: Literal[-1, 0, 1] | None,
        group_by: Sequence[str] | None,
        functions: Sequence[str] | None,
        parameters: Sequence[str | int | float | bool] | None,
        format_config: Mapping[str, Any] | None,
        extra_params: Mapping[str, Any] | None,
    ) -> dict[str, Any]:
        if apply_format is not None and apply_format not in {-1, 0, 1}:
            raise CoseviConfigError("apply_format must be -1, 0, or 1")
        validate_expression_list(filters, "filters")
        validate_expression_list(order_by, "order_by")
        validate_expression_list(group_by, "group_by")
        validate_expression_list(functions, "functions")
        if where:
            validate_expression(where, "where")
        assert_no_reserved_extra_params(extra_params)

        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = self._safe_limit(limit)
        if page is not None:
            params["page"] = page
        if where:
            params["where"] = where
        if apply_format is not None:
            params["applyFormat"] = apply_format
        append_indexed_params(params, "filter", filters)
        append_indexed_params(params, "orderBy", order_by)
        append_indexed_params(params, "groupBy", group_by)
        append_indexed_params(params, "function", functions)
        append_parameters(params, parameters)
        if format_config is not None:
            params["format"] = json.dumps(format_config)
        if extra_params:
            params.update(dict(extra_params))
        return params

    # ── Catalog search ─────────────────────────────────────────────────────

    def search_resources(
        self,
        query: str | None = None,
        resources: Sequence[ResourceType] | None = None,
        categories: Sequence[str] | None = None,
        limit: int | None = None,
        offset: int | None = None,
        order: str | None = None,
        # legacy keyword aliases
        resource_types: Sequence[ResourceType] | None = None,
    ) -> Any:
        params = self._build_metadata_list_params(query, categories, order, limit or 20, offset or 0)
        resolved_resources = resources or resource_types
        if resolved_resources:
            invalid = [item for item in resolved_resources if item not in ALLOWED_RESOURCE_TYPES]
            if invalid:
                raise CoseviConfigError(f"Invalid resource type(s): {invalid}")
            params["resources"] = ",".join(resolved_resources)
        return self._get_json("/resources.json", params=params)

    # ── Datasets ───────────────────────────────────────────────────────────

    def list_datasets(
        self,
        query: str | None = None,
        categories: Sequence[str] | None = None,
        limit: int | None = None,
        offset: int | None = None,
        order: str | None = None,
    ) -> Any:
        return self._get_json(
            "/datasets.json",
            params=self._build_metadata_list_params(query, categories, order, limit or 20, offset or 0),
        )

    def get_dataset(self, guid: str) -> Any:
        self._assert_guid(guid)
        return self._get_json(f"/datasets/{encode_guid(guid)}.json")

    # ── Datastreams metadata ───────────────────────────────────────────────

    def list_datastreams(
        self,
        query: str | None = None,
        categories: Sequence[str] | None = None,
        limit: int | None = None,
        offset: int | None = None,
        order: str | None = None,
    ) -> Any:
        return self._get_json(
            "/datastreams.json",
            params=self._build_metadata_list_params(query, categories, order, limit or 20, offset or 0),
        )

    def get_datastream(self, guid: str) -> Any:
        self._assert_guid(guid)
        return self._get_json(f"/datastreams/{encode_guid(guid)}.json")

    # ── Datastream data ────────────────────────────────────────────────────

    def get_datastream_data(
        self,
        guid: str,
        format: DatastreamFormat = "pjson",
        limit: int | None = None,
        page: int | None = None,
        offset: int | None = None,
        parameters: Sequence[str | int | float | bool] | None = None,
        filters: Sequence[str] | None = None,
        where: str | None = None,
        order_by: Sequence[str] | None = None,
        group_by: Sequence[str] | None = None,
        functions: Sequence[str] | None = None,
        apply_format: Literal[-1, 0, 1] | None = None,
        format_config: Mapping[str, Any] | None = None,
        extra_params: Mapping[str, Any] | None = None,
    ) -> Any:
        self._assert_guid(guid)
        if format not in ALLOWED_FORMATS:
            raise CoseviConfigError(f"Invalid format: {format}")
        params = self._build_datastream_params(
            limit, page, filters, where, order_by, apply_format,
            group_by, functions, parameters, format_config, extra_params
        )
        if offset is not None:
            params["offset"] = offset
        path = f"/datastreams/{encode_guid(guid)}/data.{format}"
        text_formats = {"csv", "xml", "jsonp"}
        if format in text_formats:
            return self._get_text(path, params=params, accept=get_accept_header(format))
        if format == "xls":
            response = self._request(path, params=params, accept=get_accept_header(format))
            content_type = response.headers.get("content-type", "")
            if "json" in content_type:
                return response.json()
            return response.text
        return self._get_json(path, params=params, accept=get_accept_header(format))

    def get_datastream_raw_text(
        self,
        guid: str,
        format: Literal["csv", "xml", "jsonp"] = "csv",
        limit: int | None = None,
        page: int | None = None,
        parameters: Sequence[str | int | float | bool] | None = None,
        filters: Sequence[str] | None = None,
        where: str | None = None,
        order_by: Sequence[str] | None = None,
        group_by: Sequence[str] | None = None,
        functions: Sequence[str] | None = None,
        apply_format: Literal[-1, 0, 1] | None = None,
        format_config: Mapping[str, Any] | None = None,
        extra_params: Mapping[str, Any] | None = None,
    ) -> str:
        self._assert_guid(guid)
        params = self._build_datastream_params(
            limit, page, filters, where, order_by, apply_format,
            group_by, functions, parameters, format_config, extra_params
        )
        return self._get_text(
            f"/datastreams/{encode_guid(guid)}/data.{format}",
            params=params,
            accept=get_accept_header(format),
        )

    def get_datastream_tableau(
        self,
        guid: str,
        parameters: Sequence[str | int | float | bool] | None = None,
    ) -> str:
        self._assert_guid(guid)
        params: dict[str, Any] = {}
        append_parameters(params, parameters)
        return self._get_text(
            f"/datastreams/{encode_guid(guid)}/tableau.html",
            params=params,
            accept=get_accept_header("html"),
        )

    # ── Visualizations ─────────────────────────────────────────────────────

    def list_visualizations(
        self,
        query: str | None = None,
        categories: Sequence[str] | None = None,
        limit: int | None = None,
        offset: int | None = None,
        order: str | None = None,
    ) -> Any:
        return self._get_json(
            "/visualizations.json",
            params=self._build_metadata_list_params(query, categories, order, limit or 20, offset or 0),
        )

    def get_visualization(self, guid: str) -> Any:
        self._assert_guid(guid)
        return self._get_json(f"/visualizations/{encode_guid(guid)}.json")

    # ── Dashboards ─────────────────────────────────────────────────────────

    def list_dashboards(
        self,
        query: str | None = None,
        categories: Sequence[str] | None = None,
        limit: int | None = None,
        offset: int | None = None,
        order: str | None = None,
    ) -> Any:
        return self._get_json(
            "/dashboards.json",
            params=self._build_metadata_list_params(query, categories, order, limit or 20, offset or 0),
        )

    def get_dashboard(self, guid: str) -> Any:
        self._assert_guid(guid)
        return self._get_json(f"/dashboards/{encode_guid(guid)}.json")

    @staticmethod
    def extract_dashboard_resources(
        dashboard: Mapping[str, Any],
        resource_types: Sequence[str] | None = None,
    ) -> list[dict[str, Any]]:
        resources: list[dict[str, Any]] = []
        for key in ("resources", "components", "items", "datasets", "datastreams", "visualizations"):
            val = dashboard.get(key)
            if isinstance(val, list):
                for item in val:
                    if not isinstance(item, dict):
                        continue
                    t = item.get("type")
                    if resource_types is None or t in resource_types:
                        resources.append(item)
        return resources

    # ── Portal stats ───────────────────────────────────────────────────────

    def get_portal_stats(
        self,
        days: int | None = None,
        hours: int | None = None,
        minutes: int | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        channel: str | int | None = None,
        facets: str | None = None,
        limit: int | None = None,
        group_by: str | None = None,
        order: str | None = None,
    ) -> Any:
        params: dict[str, Any] = {}
        if days is not None:
            params["days"] = days
        if hours is not None:
            params["hours"] = hours
        if minutes is not None:
            params["minutes"] = minutes
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        if channel is not None:
            params["channel"] = channel
        if facets:
            params["facets"] = facets
        if limit is not None:
            params["limit"] = self._safe_limit(limit)
        if group_by:
            params["group_by"] = group_by
        if order:
            params["order"] = order
        return self._get_json("/stats/", params=params)

    # ── Known dashboards ───────────────────────────────────────────────────

    def list_known_dashboards(self, category: str | None = None) -> list[KnownCoseviDashboard]:
        return list_known_dashboards(category)

    def get_known_dashboard(self, key_or_guid: str) -> KnownCoseviDashboard | None:
        return get_known_dashboard(key_or_guid)

    def get_known_dashboard_data(self, key_or_guid: str) -> Any:
        entry = get_known_dashboard(key_or_guid)
        if not entry:
            raise CoseviConfigError(f"Unknown dashboard key or GUID: {key_or_guid}")
        return self.get_dashboard(entry.guid)

    # ── Discovery helper ───────────────────────────────────────────────────

    def discover_resources_by_topic(
        self,
        topic: str,
        limit: int | None = None,
        offset: int | None = None,
        resources: Sequence[str] | None = None,
    ) -> Any:
        return self.search_resources(
            query=topic,
            resources=list(resources) if resources else None,
            limit=limit,
            offset=offset,
        )

    # ── Pagination helpers ─────────────────────────────────────────────────

    def iter_resources(
        self,
        query: str | None = None,
        resources: Sequence[ResourceType] | None = None,
        max_pages: int = 5,
        page_size: int = 100,
    ) -> Iterator[Any]:
        page_size = min(page_size, 100)
        max_pages = min(max_pages, 5)
        for page_index in range(max_pages):
            result = self.search_resources(
                query=query,
                resources=list(resources) if resources else None,
                limit=page_size,
                offset=page_index * page_size,
            )
            yield result
            items = result.get("result", []) if isinstance(result, dict) else (result if isinstance(result, list) else [])
            if len(items) < page_size:
                break

    def iter_datastream_data(
        self,
        guid: str,
        format: Literal["json", "pjson", "ajson"] = "pjson",
        max_pages: int = 5,
        page_size: int = 100,
        **kwargs: Any,
    ) -> Iterator[Any]:
        page_size = min(page_size, 100)
        max_pages = min(max_pages, 5)
        for page in range(1, max_pages + 1):
            result = self.get_datastream_data(guid, format=format, limit=page_size, page=page, **kwargs)
            yield result
            if not isinstance(result, list) or len(result) < page_size:
                break

    # ── Static helper ──────────────────────────────────────────────────────

    @staticmethod
    def build_filter(column: int | str, operator: str, value: str | int | float) -> str:
        allowed = {"==", ">", "<", "!=", "contains", ">=", "<="}
        if operator not in allowed:
            raise CoseviConfigError(f"Unsupported operator: {operator}")
        operand = f"column{column}" if isinstance(column, int) else column
        return f"{operand}[{operator}]{value}"
