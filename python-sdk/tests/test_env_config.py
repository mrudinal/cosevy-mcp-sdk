"""Tests for COSEVI config resolution and credential precedence."""
from pathlib import Path

import pytest

from cosevi_open_data import (
    CoseviClient,
    DEFAULT_COSEVI_BASE_URL,
    DEFAULT_COSEVI_REFERER,
    resolve_cosevi_config,
)
from cosevi_open_data import config as config_module


def test_resolve_cosevi_config_prefers_constructor(monkeypatch: pytest.MonkeyPatch):
    """Verify that explicit constructor arguments win over .env and OS env."""
    env_path = Path("virtual.env")
    monkeypatch.setattr(Path, "exists", lambda self: self == env_path)
    monkeypatch.setattr(
        config_module,
        "dotenv_values",
        lambda path: {"COSEVI_AUTH_KEY": "dotenv-secret", "COSEVI_BASE_URL": "https://dotenv.example/api"},
    )
    monkeypatch.setenv("COSEVI_AUTH_KEY", "env-secret")

    resolved = resolve_cosevi_config(
        api_key="constructor-secret",
        base_url="https://constructor.example/api",
        referer="https://constructor.example/",
        env_path=env_path,
    )

    assert resolved.api_key == "constructor-secret"
    assert resolved.base_url == "https://constructor.example/api"
    assert resolved.api_key_source == "constructor"
    assert resolved.os_name


def test_resolve_cosevi_config_reads_dotenv(monkeypatch: pytest.MonkeyPatch):
    """Verify that .env file values are used when no constructor arg is given."""
    env_path = Path("virtual.env")
    monkeypatch.setattr(Path, "exists", lambda self: self == env_path)
    monkeypatch.setattr(
        config_module,
        "dotenv_values",
        lambda path: {
            "COSEVI_AUTH_KEY": "dotenv-secret",
            "COSEVI_BASE_URL": "https://dotenv.example/api",
            "COSEVI_REFERER": "https://dotenv.example/",
        },
    )
    monkeypatch.delenv("COSEVI_AUTH_KEY", raising=False)
    monkeypatch.delenv("COSEVI_BASE_URL", raising=False)
    monkeypatch.delenv("COSEVI_REFERER", raising=False)

    resolved = resolve_cosevi_config(env_path=env_path)

    assert resolved.api_key == "dotenv-secret"
    assert resolved.base_url == "https://dotenv.example/api"
    assert resolved.referer == "https://dotenv.example/"
    assert resolved.api_key_source == ".env"
    assert resolved.base_url_source == ".env"
    assert resolved.referer_source == ".env"


def test_resolve_cosevi_config_falls_back_to_environment(monkeypatch: pytest.MonkeyPatch):
    """Verify that OS env vars are used when no .env file is present."""
    monkeypatch.setenv("COSEVI_AUTH_KEY", "env-secret")
    monkeypatch.delenv("COSEVI_BASE_URL", raising=False)
    monkeypatch.delenv("COSEVI_REFERER", raising=False)

    resolved = resolve_cosevi_config(env_path=Path.cwd() / "missing.env")

    assert resolved.api_key == "env-secret"
    assert resolved.base_url == DEFAULT_COSEVI_BASE_URL
    assert resolved.referer == DEFAULT_COSEVI_REFERER
    assert resolved.api_key_source == "environment"
    assert resolved.base_url_source == "default"
    assert isinstance(resolved.os_name, str)


def test_client_reports_sanitized_config_source(monkeypatch: pytest.MonkeyPatch):
    """Verify that get_resolved_config_source returns source labels without leaking secrets."""
    monkeypatch.setenv("COSEVI_AUTH_KEY", "env-secret")
    client = CoseviClient(env_path=str(Path.cwd() / "missing.env"))

    assert client.get_resolved_config_source()["apiKeySource"] == "environment"
    assert "env-secret" not in str(client.get_resolved_config_source())


def test_cosevi_client_from_env_creates_client_from_resolved_environment(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("COSEVI_AUTH_KEY", "py-from-env-secret")
    monkeypatch.setenv("COSEVI_BASE_URL", "https://example.test/api/v2")
    monkeypatch.setenv("COSEVI_REFERER", "https://example.test/")

    assert callable(CoseviClient.from_env)

    client = CoseviClient.from_env()

    assert isinstance(client, CoseviClient)
    assert client.get_sanitized_config() == {
        "hasApiKey": True,
        "baseUrl": "https://example.test/api/v2",
        "hasReferer": True,
    }
    assert client.get_resolved_config_source()["apiKeySource"] == "environment"
    assert "py-from-env-secret" not in str(client.get_sanitized_config())


def test_dotenv_wins_over_os_environment(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("COSEVI_AUTH_KEY", "os-secret")
    env_file = Path("virtual.env")
    monkeypatch.setattr(Path, "exists", lambda self: self == env_file)
    monkeypatch.setattr(
        config_module,
        "dotenv_values",
        lambda path: {"COSEVI_AUTH_KEY": "dotenv-secret"},
    )

    resolved = resolve_cosevi_config(env_path=env_file)

    assert resolved.api_key == "dotenv-secret"
    assert resolved.api_key_source == ".env"
