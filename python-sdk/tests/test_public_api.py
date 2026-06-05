"""This file tests the public Python SDK exports."""

from cosevi_open_data import (
    CoseviApiError,
    CoseviClient,
    DEFAULT_COSEVI_BASE_URL,
    DEFAULT_COSEVI_REFERER,
    KNOWN_COSEVI_DASHBOARDS,
    get_known_dashboard,
    list_known_dashboards,
    resolve_cosevi_config,
)


# -----------------------------------------------------------------------------
# Helpers and test cases
# -----------------------------------------------------------------------------
def test_public_api_exports():
    """Tests public api exports."""
    assert CoseviClient is not None
    assert CoseviApiError is not None
    assert DEFAULT_COSEVI_BASE_URL.startswith("https://")
    assert DEFAULT_COSEVI_REFERER.startswith("https://")
    assert len(KNOWN_COSEVI_DASHBOARDS) > 0
    assert callable(resolve_cosevi_config)
    assert callable(list_known_dashboards)
    assert callable(get_known_dashboard)


def test_build_filter_and_sanitized_config(monkeypatch):
    """Tests build filter and sanitized config."""
    monkeypatch.setenv("COSEVI_AUTH_KEY", "dummy-key")
    client = CoseviClient()
    assert CoseviClient.build_filter(1, ">=", 5) == "column1[>=]5"
    assert client.get_sanitized_config() == {
        "hasApiKey": True,
        "baseUrl": DEFAULT_COSEVI_BASE_URL,
        "hasReferer": True,
    }
