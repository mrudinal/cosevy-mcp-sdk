import httpx
import respx

from cosevi_open_data import (
    CoseviClient,
    KNOWN_COSEVI_DASHBOARDS,
    get_known_dashboard,
    list_known_dashboards,
)


def test_top_level_known_dashboard_helpers():
    assert len(KNOWN_COSEVI_DASHBOARDS) > 5
    assert all(item.category == "fallecidos" for item in list_known_dashboards("fallecidos"))
    assert get_known_dashboard("fallecidos_en_sitio").guid == "FALLE-EN-SITIO"
    assert get_known_dashboard("FALLE-EN-SITIO").key == "fallecidos_en_sitio"
    assert get_known_dashboard("missing") is None


@respx.mock
def test_client_known_dashboard_helpers_delegate_to_get_dashboard():
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/dashboards/FALLE-EN-SITIO.json").mock(
        return_value=httpx.Response(200, json={"guid": "FALLE-EN-SITIO"})
    )
    client = CoseviClient("test-key")
    assert client.list_known_dashboards("accidentes") == list_known_dashboards("accidentes")
    assert client.get_known_dashboard("ACCID-17064") == get_known_dashboard("ACCID-17064")
    assert client.get_known_dashboard_data("fallecidos_en_sitio") == {"guid": "FALLE-EN-SITIO"}
    assert route.called
