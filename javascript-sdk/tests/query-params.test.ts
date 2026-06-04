import { describe, expect, it, vi } from "vitest";
import { CoseviClient, CoseviConfigError } from "../src/index.js";

describe("query param mapping and safety", () => {
  it("maps parameters, formatConfig, filters and expressions", async () => {
    let calledUrl = "";
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calledUrl = String(url);
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    await client.getDatastreamData("ABC", {
      parameters: ["2024", "San José"],
      filters: ["column0[=]San José"],
      where: "filter0",
      orderBy: ["column1[D]"],
      groupBy: ["column0"],
      functions: ["COUNT[column1]"],
      applyFormat: -1,
      formatConfig: { enabled: true },
    });

    expect(calledUrl).toContain("pArgument0=2024");
    expect(calledUrl).toContain("pArgument1=San+Jos%C3%A9");
    expect(calledUrl).toContain("filter0=column0%5B%3D%5DSan+Jos%C3%A9");
    expect(calledUrl).toContain("where=filter0");
    expect(calledUrl).toContain("orderBy0=column1%5BD%5D");
    expect(calledUrl).toContain("groupBy0=column0");
    expect(calledUrl).toContain("function0=COUNT%5Bcolumn1%5D");
    expect(calledUrl).toContain("applyFormat=-1");
    expect(calledUrl).toContain("format=%7B");
  });

  it("rejects reserved keys and unsafe expressions", async () => {
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl: vi.fn() as unknown as typeof fetch });
    await expect(client.getDatastreamData("ABC", { extraParams: { auth_key: "bad" } })).rejects.toThrow(CoseviConfigError);
    await expect(client.getDatastreamData("ABC", { where: "bad;drop" })).rejects.toThrow(CoseviConfigError);
    await expect(client.getDatastreamData("ABC", { filters: [""] })).rejects.toThrow(CoseviConfigError);
  });
});
