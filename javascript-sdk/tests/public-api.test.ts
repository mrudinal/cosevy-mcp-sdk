import { describe, expect, it } from "vitest";
import * as sdk from "../src/index.js";

describe("javascript-sdk public api", () => {
  it("exports the documented runtime surface", () => {
    expect(sdk.CoseviClient).toBeTypeOf("function");
    expect(sdk.loadCoseviConfig).toBeTypeOf("function");
    expect(sdk.DEFAULT_COSEVI_BASE_URL).toBeTypeOf("string");
    expect(sdk.DEFAULT_COSEVI_REFERER).toBeTypeOf("string");
    expect(sdk.CoseviApiError).toBeTypeOf("function");
    expect(sdk.KNOWN_COSEVI_DASHBOARDS.length).toBeGreaterThan(0);
    expect(sdk.listKnownDashboards).toBeTypeOf("function");
    expect(sdk.getKnownDashboard).toBeTypeOf("function");
  });

  it("exposes buildFilter and sanitized config helpers", () => {
    process.env.COSEVI_AUTH_KEY = "dummy-key";
    const client = new sdk.CoseviClient();
    expect(sdk.CoseviClient.buildFilter(1, ">=", 5)).toBe("column1[>=]5");
    expect(client.getSanitizedConfig()).toEqual({
      hasApiKey: true,
      baseUrl: sdk.DEFAULT_COSEVI_BASE_URL,
      hasReferer: true,
    });
  });
});
