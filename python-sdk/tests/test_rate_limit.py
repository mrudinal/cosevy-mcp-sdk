"""This file tests Python retry and rate-limit behavior."""

import httpx
import pytest
import respx

from cosevi_open_data import CoseviApiError, CoseviClient, CoseviRateLimitError


# -----------------------------------------------------------------------------
# Helpers and test cases
# -----------------------------------------------------------------------------
@respx.mock
def test_retries_rate_limit_once(monkeypatch: pytest.MonkeyPatch):
    """Tests retries rate limit once."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets/ABC.json")
    route.side_effect = [
        httpx.Response(429, text="retry", headers={"retry-after": "0"}),
        httpx.Response(200, json={"ok": True}),
    ]
    sleeps: list[float] = []
    monkeypatch.setattr("cosevi_open_data.client.time.sleep", lambda value: sleeps.append(value))
    client = CoseviClient("test-key", retry_delay_seconds=0, max_retries=1)
    assert client.get_dataset("ABC") == {"ok": True}
    assert sleeps == [0.0]


@respx.mock
def test_retries_5xx_once(monkeypatch: pytest.MonkeyPatch):
    """Tests retries 5xx once."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards.json")
    route.side_effect = [
        httpx.Response(503, text="server"),
        httpx.Response(200, json={"ok": True}),
    ]
    sleeps: list[float] = []
    monkeypatch.setattr("cosevi_open_data.client.time.sleep", lambda value: sleeps.append(value))
    client = CoseviClient("test-key", retry_delay_seconds=0.01, max_retries=1)
    assert client.list_dashboards(limit=1) == {"ok": True}
    assert sleeps == [0.01]


@respx.mock
def test_raises_rate_limit_when_retry_disabled():
    """Tests raises rate limit when retry disabled."""
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets/ABC.json").mock(return_value=httpx.Response(429, text="retry"))
    client = CoseviClient("test-key", retry_on_rate_limit=False, max_retries=0)
    with pytest.raises(CoseviRateLimitError):
        client.get_dataset("ABC")


@respx.mock
def test_safe_url_redacts_auth_key():
    """Tests safe url redacts auth key."""
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets/ABC.json").mock(return_value=httpx.Response(500, text="boom"))
    client = CoseviClient("super-secret", max_retries=0)
    with pytest.raises(CoseviApiError) as error:
        client.get_dataset("ABC")
    assert "super-secret" not in (error.value.safe_url or "")
    assert "REDACTED" in (error.value.safe_url or "")
