import { describe, expect, it, vi } from "vitest";
import { CoseviClient } from "../src/index.js";

describe("datastream data endpoints", () => {
  it("uses expected accept headers and endpoint paths", async () => {
    const accepts: string[] = [];
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      urls.push(String(url));
      accepts.push(new Headers(init?.headers).get("Accept") ?? "");
      return new Response(urls.length === 4 ? "<html />" : "{}", {
        status: 200,
        headers: { "content-type": urls.length === 4 ? "text/html" : "application/json" },
      });
    }) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });
    await client.getDatastreamData("ABC", { format: "json" });
    await client.getDatastreamRawText("ABC", { format: "csv" });
    await client.getDatastreamRawText("ABC", { format: "xml" });
    await client.getDatastreamTableau("ABC");

    expect(urls[0]).toContain("/datastreams/ABC/data.json");
    expect(urls[1]).toContain("/datastreams/ABC/data.csv");
    expect(urls[2]).toContain("/datastreams/ABC/data.xml");
    expect(urls[3]).toContain("/datastreams/ABC/tableau.html");
    expect(accepts[0]).toBe("application/json");
    expect(accepts[1]).toBe("text/csv");
    expect(accepts[2]).toContain("application/xml");
    expect(accepts[3]).toBe("text/html");
  });
});
