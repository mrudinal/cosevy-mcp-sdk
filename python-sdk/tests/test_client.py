"""This file tests the main Python client behavior and endpoint mapping."""

import httpx
import pytest
import respx

from cosevi_open_data import CoseviClient, CoseviConfigError


# -----------------------------------------------------------------------------
# Helpers and test cases
# -----------------------------------------------------------------------------
@respx.mock
def test_constructor_env_config_and_base_url_override(monkeypatch: pytest.MonkeyPatch):
    """Tests constructor env config and base url override."""
    monkeypatch.setenv("COSEVI_AUTH_KEY", "env-key")
    monkeypatch.setenv("COSEVI_BASE_URL", "https://env.example/api")
    monkeypatch.setenv("COSEVI_REFERER", "https://portal.example/")
    route = respx.get("https://override.example/api/datasets.json").mock(return_value=httpx.Response(200, json={"results": []}))

    client = CoseviClient(base_url="https://override.example/api")
    client.list_datasets(limit=1)

    assert route.called
    assert client.get_sanitized_config() == {
        "hasApiKey": True,
        "baseUrl": "https://override.example/api",
        "hasReferer": True,
    }


def test_missing_api_key_raises():
    """Tests missing api key raises."""
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setenv("COSEVI_AUTH_KEY", "")
    try:
        with pytest.raises(CoseviConfigError):
            CoseviClient(api_key="")
    finally:
        monkeypatch.undo()


@respx.mock
def test_referer_header_support():
    """Tests referer header support."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/resources.json").mock(
        return_value=httpx.Response(200, json={"results": []})
    )
    client = CoseviClient("test-key", referer="https://custom.portal/")
    client.search_resources(query="fallecidos", resources=["ds"], limit=5)
    assert route.calls.last.request.headers["Referer"] == "https://custom.portal/"


@respx.mock
def test_search_resources_builds_expected_request():
    """Tests search resources builds expected request."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/resources.json").mock(
        return_value=httpx.Response(200, json={"results": []})
    )
    client = CoseviClient("test-key")
    client.search_resources(query="fallecidos", resources=["ds"], categories=["seguridad-vial"], limit=5, offset=3, order="top")
    request = route.calls.last.request
    assert "query=fallecidos" in str(request.url)
    assert "resources=ds" in str(request.url)
    assert "categories=seguridad-vial" in str(request.url)
    assert "limit=5" in str(request.url)
    assert "offset=3" in str(request.url)
    assert "order=top" in str(request.url)


@respx.mock
def test_metadata_endpoints_and_guid_encoding():
    """Tests metadata endpoints and guid encoding."""
    dataset_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets/ABC%20DEF.json").mock(return_value=httpx.Response(200, json={"guid": "ABC DEF"}))
    datastream_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/REGIS-DE-FALLE-EN-SITIO.json").mock(return_value=httpx.Response(200, json={"guid": "REGIS-DE-FALLE-EN-SITIO"}))
    visualization_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/visualizations/VIS%201.json").mock(return_value=httpx.Response(200, json={"guid": "VIS 1"}))
    dashboard_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards/DB%201.json").mock(return_value=httpx.Response(200, json={"guid": "DB 1"}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets.json").mock(return_value=httpx.Response(200, json={"results": []}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams.json").mock(return_value=httpx.Response(200, json={"results": []}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/visualizations.json").mock(return_value=httpx.Response(200, json={"results": []}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards.json").mock(return_value=httpx.Response(200, json={"results": []}))

    client = CoseviClient("test-key")
    client.list_datasets(limit=5)
    client.get_dataset("ABC DEF")
    client.list_datastreams()
    client.get_datastream("REGIS-DE-FALLE-EN-SITIO")
    client.list_visualizations()
    client.get_visualization("VIS 1")
    client.list_dashboards()
    client.get_dashboard("DB 1")
    assert dataset_route.called and datastream_route.called and visualization_route.called and dashboard_route.called


@respx.mock
def test_datastream_data_mapping_and_accept_headers():
    """Tests datastream data mapping and accept headers."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/REGIS-DE-FALLE-EN-SITIO/data.pjson").mock(
        return_value=httpx.Response(200, json=[{"row": 1}])
    )
    client = CoseviClient("test-key")
    client.get_datastream_data(
        "REGIS-DE-FALLE-EN-SITIO",
        format="pjson",
        limit=5,
        page=1,
        parameters=["2024", "San José"],
        filters=["column5[>]1900000", "column0[=]San José"],
        where="filter0 and filter1",
        order_by=["column1[D]"],
        group_by=["column0"],
        functions=["COUNT[column10]"],
        apply_format=-1,
        format_config={"table": [{"id": "column10", "type": "NUMBER"}]},
    )
    request = route.calls.last.request
    assert request.headers["Accept"] == "application/json"
    assert "pArgument0=2024" in str(request.url)
    assert "pArgument1=San+Jos%C3%A9" in str(request.url)
    assert "filter0=column5%5B%3E%5D1900000" in str(request.url)
    assert "orderBy0=column1%5BD%5D" in str(request.url)
    assert "groupBy0=column0" in str(request.url)
    assert "function0=COUNT%5Bcolumn10%5D" in str(request.url)
    assert "applyFormat=-1" in str(request.url)
    assert "format=%7B" in str(request.url)


@respx.mock
def test_raw_text_and_tableau_endpoints():
    """Tests raw text and tableau endpoints."""
    csv_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.csv").mock(
        return_value=httpx.Response(200, text="a,b")
    )
    xml_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.xml").mock(
        return_value=httpx.Response(200, text="<xml/>")
    )
    jsonp_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.jsonp").mock(
        return_value=httpx.Response(200, text="callback({})")
    )
    tableau_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC%20DEF/tableau.html").mock(
        return_value=httpx.Response(200, text="<html></html>")
    )
    client = CoseviClient("test-key")

    assert client.get_datastream_raw_text("ABC", format="csv") == "a,b"
    assert client.get_datastream_raw_text("ABC", format="xml") == "<xml/>"
    assert client.get_datastream_raw_text("ABC", format="jsonp") == "callback({})"
    assert client.get_datastream_tableau("ABC DEF", parameters=["2024", True]) == "<html></html>"

    assert csv_route.calls.last.request.headers["Accept"] == "text/csv"
    assert "application/xml" in xml_route.calls.last.request.headers["Accept"]
    assert "text/javascript" in jsonp_route.calls.last.request.headers["Accept"]
    assert tableau_route.calls.last.request.headers["Accept"] == "text/html"
    assert "pArgument0=2024" in str(tableau_route.calls.last.request.url)


@respx.mock
def test_extract_dashboard_resources_and_portal_stats():
    """Tests extract dashboard resources and portal stats."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/stats/").mock(return_value=httpx.Response(200, json={"total": 1}))
    client = CoseviClient("test-key")
    resources = client.extract_dashboard_resources(
        {
            "resources": [{"type": "ds", "guid": "one"}],
            "datastreams": [{"type": "ds", "guid": "two"}],
            "visualizations": [{"type": "vz", "guid": "three"}],
        },
        ["ds"],
    )
    assert resources == [{"type": "ds", "guid": "one"}, {"type": "ds", "guid": "two"}]

    client.get_portal_stats(days=7, limit=5, group_by="day", order="desc", channel="API")
    assert "days=7" in str(route.calls.last.request.url)
    assert "limit=5" in str(route.calls.last.request.url)
    assert "group_by=day" in str(route.calls.last.request.url)
    assert "groupBy=day" not in str(route.calls.last.request.url)


def test_reserved_extra_params_and_invalid_input_are_rejected():
    """Tests reserved extra params and invalid input are rejected."""
    client = CoseviClient("test-key")
    with pytest.raises(CoseviConfigError, match="reserved key"):
        client.get_datastream_data("ABC", extra_params={"auth_key": "override"})
    with pytest.raises(CoseviConfigError, match="reserved key"):
        client.get_datastream_data("ABC", extra_params={"pArgument0": "2024"})
    with pytest.raises(CoseviConfigError, match="semicolons|unsafe"):
        client.get_datastream_data("ABC", where="bad;drop")
    with pytest.raises(CoseviConfigError, match="empty"):
        client.get_datastream_data("ABC", filters=[""])
