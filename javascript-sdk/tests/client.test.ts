import { describe, expect, it, vi } from "vitest";
import { CoseviClient, CoseviConfigError } from "../src/index.js";

function makeJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("CoseviClient public methods", () => {
  it("reads constructor env config and supports baseUrl override", async () => {
    const previousKey = process.env.COSEVI_AUTH_KEY;
    const previousBaseUrl = process.env.COSEVI_BASE_URL;
    const previousReferer = process.env.COSEVI_REFERER;
    process.env.COSEVI_AUTH_KEY = "env-key";
    process.env.COSEVI_BASE_URL = "https://example.test/api";
    process.env.COSEVI_REFERER = "https://portal.test/";

    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calledUrl = String(url);
      return makeJsonResponse({ ok: true });
    }) as unknown as typeof fetch;

    try {
      const client = new CoseviClient({ fetchImpl, baseUrl: "https://override.test/api" });
      await client.listDatasets({ limit: 1 });
      expect(client.getSanitizedConfig()).toEqual({
        hasApiKey: true,
        baseUrl: "https://override.test/api",
        hasReferer: true,
      });
      expect(calledUrl).toContain("https://override.test/api/datasets.json");
    } finally {
      process.env.COSEVI_AUTH_KEY = previousKey;
      process.env.COSEVI_BASE_URL = previousBaseUrl;
      process.env.COSEVI_REFERER = previousReferer;
    }
  });

  it("throws if no API key is configured", () => {
    expect(() => new CoseviClient({ apiKey: "" })).toThrow(CoseviConfigError);
  });

  it("sends referer header support", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Referer")).toBe("https://custom.portal/");
      return makeJsonResponse({ results: [] });
    }) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", referer: "https://custom.portal/", fetchImpl });
    await client.searchResources({ query: "fallecidos", resources: ["ds"], categories: ["road"], limit: 5, offset: 0 });
  });

  it("builds searchResources with expected params", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calledUrl = String(url);
      return makeJsonResponse({ results: [] });
    }) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });
    await client.searchResources({
      query: "fallecidos",
      resources: ["ds"],
      categories: ["seguridad-vial"],
      limit: 5,
      offset: 3,
      order: "top",
    });

    expect(calledUrl).toContain("/resources.json");
    expect(calledUrl).toContain("auth_key=test-key");
    expect(calledUrl).toContain("query=fallecidos");
    expect(calledUrl).toContain("resources=ds");
    expect(calledUrl).toContain("categories=seguridad-vial");
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("offset=3");
    expect(calledUrl).toContain("order=top");
  });

  it("builds list/get metadata endpoints with GUID URL encoding", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return makeJsonResponse({ results: [] });
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    await client.listDatasets({ limit: 5 });
    await client.getDataset("ABC DEF");
    await client.listDatastreams();
    await client.getDatastream("REGIS-DE-FALLE-EN-SITIO");
    await client.listVisualizations();
    await client.getVisualization("VIS 1");
    await client.listDashboards();
    await client.getDashboard("DB 1");

    expect(urls[0]).toContain("/datasets.json");
    expect(urls[1]).toContain("/datasets/ABC%20DEF.json");
    expect(urls[2]).toContain("/datastreams.json");
    expect(urls[3]).toContain("/datastreams/REGIS-DE-FALLE-EN-SITIO.json");
    expect(urls[4]).toContain("/visualizations.json");
    expect(urls[5]).toContain("/visualizations/VIS%201.json");
    expect(urls[6]).toContain("/dashboards.json");
    expect(urls[7]).toContain("/dashboards/DB%201.json");
  });

  it("builds getDatastreamData with mappings for parameters, formatConfig, applyFormat and expressions", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calledUrl = String(url);
      return makeJsonResponse([{ row: 1 }]);
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    await client.getDatastreamData("REGIS-DE-FALLE-EN-SITIO", {
      format: "pjson",
      limit: 5,
      page: 1,
      parameters: ["2024", "San José"],
      filters: ["column5[>]1900000", "column0[=]San José"],
      where: "filter0 and filter1",
      orderBy: ["column1[D]"],
      groupBy: ["column0"],
      functions: ["COUNT[column10]"],
      applyFormat: -1,
      formatConfig: { table: [{ id: "column10", type: "NUMBER" }] },
    });

    expect(calledUrl).toContain("/datastreams/REGIS-DE-FALLE-EN-SITIO/data.pjson");
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("pArgument0=2024");
    expect(calledUrl).toContain("pArgument1=San+Jos%C3%A9");
    expect(calledUrl).toContain("filter0=column5%5B%3E%5D1900000");
    expect(calledUrl).toContain("filter1=column0%5B%3D%5DSan+Jos%C3%A9");
    expect(calledUrl).toContain("where=filter0+and+filter1");
    expect(calledUrl).toContain("orderBy0=column1%5BD%5D");
    expect(calledUrl).toContain("groupBy0=column0");
    expect(calledUrl).toContain("function0=COUNT%5Bcolumn10%5D");
    expect(calledUrl).toContain("applyFormat=-1");
    expect(calledUrl).toContain("format=%7B");
  });

  it("returns text for getDatastreamRawText in csv, xml and jsonp formats", async () => {
    const accepts: string[] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      accepts.push(new Headers(init?.headers).get("Accept") ?? "");
      return new Response("raw-text", { status: 200, headers: { "content-type": "text/plain" } });
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    expect(await client.getDatastreamRawText("ABC", { format: "csv" })).toBe("raw-text");
    expect(await client.getDatastreamRawText("ABC", { format: "xml" })).toBe("raw-text");
    expect(await client.getDatastreamRawText("ABC", { format: "jsonp" })).toBe("raw-text");

    expect(accepts[0]).toContain("text/csv");
    expect(accepts[1]).toContain("application/xml");
    expect(accepts[2]).toContain("text/javascript");
  });

  it("builds getDatastreamTableau and uses html accept header", async () => {
    let calledUrl = "";
    let accept = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calledUrl = String(url);
      accept = new Headers(init?.headers).get("Accept") ?? "";
      return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    }) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });
    const html = await client.getDatastreamTableau("ABC DEF", { parameters: ["2024", true] });

    expect(html).toContain("<html>");
    expect(calledUrl).toContain("/datastreams/ABC%20DEF/tableau.html");
    expect(calledUrl).toContain("pArgument0=2024");
    expect(calledUrl).toContain("pArgument1=true");
    expect(accept).toContain("text/html");
  });

  it("supports extractDashboardResources and portal stats", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calledUrl = String(url);
      return makeJsonResponse({ total: 1 });
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    const extracted = client.extractDashboardResources({
      resources: [{ type: "ds", guid: "one" }],
      datastreams: [{ type: "ds", guid: "two" }],
      visualizations: [{ type: "vz", guid: "three" }],
    }, { resourceTypes: ["ds"] });
    expect(extracted).toEqual([{ type: "ds", guid: "one" }, { type: "ds", guid: "two" }]);

    await client.getPortalStats({ days: 7, limit: 5, groupBy: "day", order: "desc", channel: "API" });
    expect(calledUrl).toContain("/stats/");
    expect(calledUrl).toContain("days=7");
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("group_by=day");
    expect(calledUrl).not.toContain("groupBy=day");
    expect(calledUrl).toContain("channel=API");
  });

  it("rejects reserved extraParams and invalid expressions safely", async () => {
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl: vi.fn() as unknown as typeof fetch });

    await expect(client.getDatastreamData("ABC", { extraParams: { auth_key: "x" } })).rejects.toThrow("reserved key");
    await expect(client.getDatastreamData("ABC", { extraParams: { pArgument0: "2024" } })).rejects.toThrow("reserved key");
    await expect(client.getDatastreamData("ABC", { where: "bad;drop" })).rejects.toThrow("semicolons");
    await expect(client.getDatastreamData("ABC", { filters: [""] })).rejects.toThrow("empty string");
  });
});
