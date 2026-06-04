import { describe, expect, it, vi } from "vitest";
import { CoseviClient } from "../src/index.js";

describe("pagination helpers", () => {
  it("iterateResources enforces hard caps", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ result: [{ id: 1 }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl, maxRequestsPerSecond: 100 });
    const pages: unknown[] = [];

    for await (const page of client.iterateResources({ maxPages: 10, pageSize: 500, query: "fallecidos" })) {
      pages.push(page);
    }

    expect(pages.length).toBeLessThanOrEqual(5);
    const firstUrl = String((fetchImpl as any).mock.calls[0][0]);
    expect(firstUrl).toContain("limit=100");
  });

  it("iterateDatastreamData enforces hard caps", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([{ row: 1 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl, maxRequestsPerSecond: 100 });
    const pages: unknown[] = [];

    for await (const page of client.iterateDatastreamData("ABC", { maxPages: 10, pageSize: 500, format: "pjson" })) {
      pages.push(page);
    }

    expect(pages.length).toBeLessThanOrEqual(5);
    const firstUrl = String((fetchImpl as any).mock.calls[0][0]);
    expect(firstUrl).toContain("limit=100");
    expect(firstUrl).toContain("page=1");
  });

  it("discovery helper delegates to resource search", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain("query=fallecidos");
      return new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });
    await client.discoverResourcesByTopic("fallecidos", { resources: ["ds"], limit: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
