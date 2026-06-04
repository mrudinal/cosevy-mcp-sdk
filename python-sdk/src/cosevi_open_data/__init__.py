"""
cosevi_open_data — Read-only Python SDK for the COSEVI / Junar v2 open-data API.

Public surface: CoseviClient, resolve_cosevi_config, error classes, known dashboards, constants.
"""
from .client import CoseviClient
from .config import (
    DEFAULT_COSEVI_BASE_URL,
    DEFAULT_COSEVI_REFERER,
    CoseviResolvedConfig,
    resolve_cosevi_config,
)
from .exceptions import CoseviApiError, CoseviAuthError, CoseviConfigError, CoseviRateLimitError
from .known_dashboards import (
    KNOWN_COSEVI_DASHBOARDS,
    KnownCoseviDashboard,
    get_known_dashboard,
    list_known_dashboards,
)
from .models import DatastreamFormat, ResourceType

__all__ = [
    "CoseviClient",
    "CoseviResolvedConfig",
    "CoseviApiError",
    "CoseviAuthError",
    "CoseviConfigError",
    "CoseviRateLimitError",
    "DEFAULT_COSEVI_BASE_URL",
    "DEFAULT_COSEVI_REFERER",
    "KNOWN_COSEVI_DASHBOARDS",
    "KnownCoseviDashboard",
    "get_known_dashboard",
    "list_known_dashboards",
    "resolve_cosevi_config",
    "DatastreamFormat",
    "ResourceType",
]
