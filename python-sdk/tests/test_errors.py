from cosevi_open_data import CoseviApiError, CoseviAuthError, CoseviConfigError, CoseviRateLimitError


def test_error_classes_expose_expected_fields():
    config_error = CoseviConfigError("bad config")
    api_error = CoseviApiError("bad", 500, {"ok": False}, "https://example.test?auth_key=REDACTED")
    auth_error = CoseviAuthError("unauthorized", 401, "nope", "https://example.test?auth_key=REDACTED")
    rate_error = CoseviRateLimitError("slow down", 429, "body", "https://example.test", 1.5)

    assert str(config_error) == "bad config"
    assert api_error.status_code == 500
    assert api_error.response_body == {"ok": False}
    assert "REDACTED" in api_error.safe_url
    assert isinstance(auth_error, CoseviApiError)
    assert rate_error.retry_after_seconds == 1.5
