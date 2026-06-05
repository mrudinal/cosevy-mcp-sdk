"""This file tests Python query parameter mapping and safety checks."""

import pytest

from cosevi_open_data import CoseviClient, CoseviConfigError


# -----------------------------------------------------------------------------
# Helpers and test cases
# -----------------------------------------------------------------------------
def test_query_param_mapping(monkeypatch: pytest.MonkeyPatch):
    """Tests query param mapping."""
    monkeypatch.setenv("COSEVI_AUTH_KEY", "test-key")
    client = CoseviClient()

    params = client._build_datastream_params(  # type: ignore[attr-defined]
        limit=5,
        page=1,
        filters=["column0[=]San José"],
        where="filter0",
        order_by=["column1[D]"],
        apply_format=-1,
        group_by=["column0"],
        functions=["COUNT[column1]"],
        parameters=["2024", "San José"],
        format_config={"enabled": True},
        extra_params=None,
    )

    assert params["pArgument0"] == "2024"
    assert params["pArgument1"] == "San José"
    assert params["filter0"] == "column0[=]San José"
    assert params["where"] == "filter0"
    assert params["orderBy0"] == "column1[D]"
    assert params["groupBy0"] == "column0"
    assert params["function0"] == "COUNT[column1]"
    assert params["applyFormat"] == -1
    assert "format" in params


def test_reserved_keys_and_unsafe_expressions_raise():
    """Tests reserved keys and unsafe expressions raise."""
    client = CoseviClient("test-key")
    with pytest.raises(CoseviConfigError):
        client.get_datastream_data("ABC", extra_params={"auth_key": "bad"})
    with pytest.raises(CoseviConfigError):
        client.get_datastream_data("ABC", where="bad;drop")
    with pytest.raises(CoseviConfigError):
        client.get_datastream_data("ABC", filters=[""])
