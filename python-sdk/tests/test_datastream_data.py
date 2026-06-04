import httpx
import respx

from cosevi_open_data import CoseviClient


@respx.mock
def test_datastream_data_endpoints_and_accept_headers():
    json_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.json").mock(return_value=httpx.Response(200, json=[]))
    csv_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.csv").mock(return_value=httpx.Response(200, text="a,b"))
    xml_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.xml").mock(return_value=httpx.Response(200, text="<xml/>"))
    html_route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/tableau.html").mock(return_value=httpx.Response(200, text="<html />"))

    client = CoseviClient("test-key")
    client.get_datastream_data("ABC", format="json")
    client.get_datastream_raw_text("ABC", format="csv")
    client.get_datastream_raw_text("ABC", format="xml")
    client.get_datastream_tableau("ABC")

    assert json_route.calls.last.request.headers["Accept"] == "application/json"
    assert csv_route.calls.last.request.headers["Accept"] == "text/csv"
    assert "application/xml" in xml_route.calls.last.request.headers["Accept"]
    assert html_route.calls.last.request.headers["Accept"] == "text/html"
