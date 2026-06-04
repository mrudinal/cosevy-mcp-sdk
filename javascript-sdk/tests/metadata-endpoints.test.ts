import { describe, expect, it, vi } from "vitest";
import { CoseviClient } from "../src/index.js";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("metadata endpoints", () => {
  it("targets dataset, datastream, visualization, dashboard endpoints", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    await client.listDatasets();
    await client.getDataset("A B");
    await client.listDatastreams();
    await client.getDatastream("DS 1");
    await client.listVisualizations();
    await client.getVisualization("V 1");
    await client.listDashboards();
    await client.getDashboard("DB 1");

    expect(urls).toEqual(expect.arrayContaining([
      expect.stringContaining("/datasets.json"),
      expect.stringContaining("/datasets/A%20B.json"),
      expect.stringContaining("/datastreams.json"),
      expect.stringContaining("/datastreams/DS%201.json"),
      expect.stringContaining("/visualizations.json"),
      expect.stringContaining("/visualizations/V%201.json"),
      expect.stringContaining("/dashboards.json"),
      expect.stringContaining("/dashboards/DB%201.json"),
    ]));
  });
});
