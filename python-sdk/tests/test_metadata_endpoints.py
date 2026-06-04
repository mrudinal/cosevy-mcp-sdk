import httpx
import respx

from cosevi_open_data import CoseviClient


@respx.mock
def test_metadata_endpoints():
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets.json").mock(return_value=httpx.Response(200, json={"results": []}))
    dataset = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datasets/A%20B.json").mock(return_value=httpx.Response(200, json={"guid": "A B"}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams.json").mock(return_value=httpx.Response(200, json={"results": []}))
    datastream = respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/DS%201.json").mock(return_value=httpx.Response(200, json={"guid": "DS 1"}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/visualizations.json").mock(return_value=httpx.Response(200, json={"results": []}))
    visualization = respx.get("https://cosevi.cloudapi.junar.com/api/v2/visualizations/V%201.json").mock(return_value=httpx.Response(200, json={"guid": "V 1"}))
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards.json").mock(return_value=httpx.Response(200, json={"results": []}))
    dashboard = respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards/DB%201.json").mock(return_value=httpx.Response(200, json={"guid": "DB 1"}))

    client = CoseviClient("test-key")
    client.list_datasets()
    client.get_dataset("A B")
    client.list_datastreams()
    client.get_datastream("DS 1")
    client.list_visualizations()
    client.get_visualization("V 1")
    client.list_dashboards()
    client.get_dashboard("DB 1")

    assert dataset.called and datastream.called and visualization.called and dashboard.called
