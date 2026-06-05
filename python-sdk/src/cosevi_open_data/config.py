"""This file resolves Python SDK configuration from arguments, .env, and the OS."""

from __future__ import annotations

import os
import platform
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from dotenv import dotenv_values

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

DEFAULT_COSEVI_BASE_URL = "https://cosevi.cloudapi.junar.com/api/v2"
"""Default Junar/COSEVI API v2 base URL."""

DEFAULT_COSEVI_REFERER = "https://datosabiertos.csv.go.cr/"
"""Default HTTP Referer header value sent with every request."""

# -----------------------------------------------------------------------------
# Types
# -----------------------------------------------------------------------------

Source = Literal["constructor", ".env", "environment", "default", "missing"]
"""Discriminated literal describing where a config value was resolved from."""

# -----------------------------------------------------------------------------
# Config dataclass
# -----------------------------------------------------------------------------


# -----------------------------------------------------------------------------
# Configuration models
# -----------------------------------------------------------------------------
@dataclass(frozen=True)
class CoseviResolvedConfig:
    """Fully resolved COSEVI configuration with per-value source metadata."""

    api_key: str | None
    """Resolved API key, or None if missing."""

    base_url: str
    """Resolved base URL (always set)."""

    referer: str | None
    """Resolved Referer header value."""

    api_key_source: Source
    """Where the API key was resolved from."""

    base_url_source: Source
    """Where the base URL was resolved from."""

    referer_source: Source
    """Where the Referer was resolved from."""

    os_name: str
    """Operating-system name (platform.system())."""


# -----------------------------------------------------------------------------
# Config resolution
# -----------------------------------------------------------------------------


# Resolves configuration from explicit arguments, .env, and OS variables.
def resolve_cosevi_config(
    api_key: str | None = None,
    base_url: str | None = None,
    referer: str | None = None,
    env_path: str | Path | None = None,
) -> CoseviResolvedConfig:
    """Resolve the full COSEVI configuration using explicit precedence.

    Precedence order (highest to lowest):
      1. Explicit argument value (``api_key``, ``base_url``, ``referer``)
      2. Local ``.env`` file (read directly, never merged into ``os.environ``)
      3. OS environment variable (``os.environ``)
      4. Compiled default / ``"missing"``

    The ``.env`` file is read with :func:`dotenv.dotenv_values` and NOT loaded
    into ``os.environ``, so OS environment variables are never silently
    overwritten.
    """
    dotenv_path = Path(env_path) if env_path else Path.cwd() / ".env"
    dotenv_values_map = dotenv_values(dotenv_path) if dotenv_path.exists() else {}

    final_api_key = api_key or dotenv_values_map.get("COSEVI_AUTH_KEY") or os.environ.get("COSEVI_AUTH_KEY")
    final_base_url = base_url or dotenv_values_map.get("COSEVI_BASE_URL") or os.environ.get("COSEVI_BASE_URL") or DEFAULT_COSEVI_BASE_URL
    final_referer = referer or dotenv_values_map.get("COSEVI_REFERER") or os.environ.get("COSEVI_REFERER") or DEFAULT_COSEVI_REFERER

    api_key_source: Source = "constructor" if api_key else (
        ".env" if dotenv_values_map.get("COSEVI_AUTH_KEY") else (
            "environment" if os.environ.get("COSEVI_AUTH_KEY") else "missing"
        )
    )
    base_url_source: Source = "constructor" if base_url else (
        ".env" if dotenv_values_map.get("COSEVI_BASE_URL") else (
            "environment" if os.environ.get("COSEVI_BASE_URL") else "default"
        )
    )
    referer_source: Source = "constructor" if referer else (
        ".env" if dotenv_values_map.get("COSEVI_REFERER") else (
            "environment" if os.environ.get("COSEVI_REFERER") else "default"
        )
    )

    return CoseviResolvedConfig(
        api_key=final_api_key,
        base_url=final_base_url,
        referer=final_referer,
        api_key_source=api_key_source,
        base_url_source=base_url_source,
        referer_source=referer_source,
        os_name=platform.system(),
    )
