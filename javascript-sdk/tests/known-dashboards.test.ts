import { describe, expect, it, vi } from "vitest";
import {
  CoseviClient,
  KNOWN_COSEVI_DASHBOARDS,
  getKnownDashboard,
  listKnownDashboards,
} from "../src/index.js";

describe("known dashboard helpers", () => {
  it("exports top-level helper functions and constant list", () => {
    expect(KNOWN_COSEVI_DASHBOARDS.length).toBeGreaterThan(5);
    expect(listKnownDashboards("fallecidos").every((item) => item.category === "fallecidos")).toBe(true);
    expect(getKnownDashboard("fallecidos_en_sitio")?.guid).toBe("FALLE-EN-SITIO");
    expect(getKnownDashboard("FALLE-EN-SITIO")?.key).toBe("fallecidos_en_sitio");
    expect(getKnownDashboard("missing")).toBeUndefined();
  });

  it("delegates known dashboard data lookup through getDashboard", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ guid: "FALLE-EN-SITIO" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "test-key", fetchImpl });

    const value = await client.getKnownDashboardData("fallecidos_en_sitio");
    expect(value).toEqual({ guid: "FALLE-EN-SITIO" });
  });

  it("client helper methods mirror top-level helpers", () => {
    const client = new CoseviClient({
      apiKey: "test-key",
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    expect(client.listKnownDashboards("accidentes")).toEqual(listKnownDashboards("accidentes"));
    expect(client.getKnownDashboard("ACCID-17064")).toEqual(getKnownDashboard("ACCID-17064"));
  });
});
