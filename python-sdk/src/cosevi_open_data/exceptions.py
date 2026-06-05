"""This file defines the Python SDK exception hierarchy."""

from __future__ import annotations

from typing import Any

# -----------------------------------------------------------------------------
# Base exceptions
# -----------------------------------------------------------------------------


# -----------------------------------------------------------------------------
# Exception classes
# -----------------------------------------------------------------------------
class CoseviConfigError(Exception):
    """Raised for bad configuration (missing API key, invalid params)."""


# -----------------------------------------------------------------------------
# API errors
# -----------------------------------------------------------------------------


class CoseviApiError(Exception):
    """Raised when the COSEVI/Junar API returns an error response."""

    # Stores HTTP metadata alongside the API error message.
    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        response_body: Any = None,
        safe_url: str | None = None,
    ) -> None:
        """Create a new API error with optional HTTP status, response body, and safe URL."""
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body
        self.safe_url = safe_url
        # Alias for compatibility
        self.body = response_body


# -----------------------------------------------------------------------------
# Auth errors
# -----------------------------------------------------------------------------


class CoseviAuthError(CoseviApiError):
    """Raised on 401/403 authentication failures."""


# -----------------------------------------------------------------------------
# Rate limit errors
# -----------------------------------------------------------------------------


class CoseviRateLimitError(CoseviApiError):
    """Raised on 429 rate limit responses."""

    # Stores HTTP metadata alongside the API error message.
    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        response_body: Any = None,
        safe_url: str | None = None,
        retry_after_seconds: float | None = None,
    ) -> None:
        """Create a rate-limit error, optionally including the Retry-After value in seconds."""
        super().__init__(message, status_code, response_body, safe_url)
        self.retry_after_seconds = retry_after_seconds
