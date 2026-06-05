"""This file tests Python pagination helpers and limits."""

import httpx
import respx

from cosevi_open_data import CoseviClient


# -----------------------------------------------------------------------------
# Helpers and test cases
# -----------------------------------------------------------------------------
@respx.mock
def test_iter_resources_enforces_hard_caps():
    """Tests iter resources enforces hard caps."""
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/resources.json").mock(
        return_value=httpx.Response(200, json={"result": [{"id": 1}]})
    )
    client = CoseviClient("test-key")
    pages = list(client.iter_resources(query="fallecidos", max_pages=10, page_size=500))
    assert len(pages) <= 5


@respx.mock
def test_iter_datastream_data_enforces_hard_caps():
    """Tests iter datastream data enforces hard caps."""
    respx.get("https://cosevi.cloudapi.junar.com/api/v2/datastreams/ABC/data.pjson").mock(
        return_value=httpx.Response(200, json=[{"row": 1}])
    )
    client = CoseviClient("test-key")
    pages = list(client.iter_datastream_data("ABC", max_pages=10, page_size=500))
    assert len(pages) <= 5


@respx.mock
def test_discover_resources_by_topic_delegates_to_search():
    """Tests discover resources by topic delegates to search."""
    route = respx.get("https://cosevi.cloudapi.junar.com/api/v2/resources.json").mock(
        return_value=httpx.Response(200, json={"result": []})
    )
    client = CoseviClient("test-key")
    client.discover_resources_by_topic("fallecidos", limit=5, resources=["ds"])
    assert "query=fallecidos" in str(route.calls.last.request.url)
