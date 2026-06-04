import { describe, expect, it } from "vitest";
import { DOMAIN_TOOL_GUIDS, getCoseviToolDefinitions } from "../src/tools.js";
import { createMockClient } from "./helpers.js";

describe("mcp public tool definitions", () => {
  it("exposes every documented tool with description and schema", () => {
    const definitions = getCoseviToolDefinitions(createMockClient() as any);
    expect(definitions.length).toBe(30);
    for (const definition of definitions) {
      expect(definition.name).toMatch(/^cosevi_/);
      expect(definition.description.length).toBeGreaterThan(10);
      expect(Object.keys(definition.inputSchema).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the expected domain tool guid mapping", () => {
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_fatalities_dashboard).toBe("FALLE-EN-SITIO");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_fatalities_table_dashboard).toBe("DATOS-PARA-TABLA-INTER-94312");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_accidents_dashboard).toBe("ACCID-17064");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_accidents_table_dashboard).toBe("DATOS-PARA-TABLA-INTER-DE");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_infractions_dashboard).toBe("INFRA-43614");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_infractions_by_article_dashboard).toBe("CONSU-DE-INFRA-POR-ARTIC");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_licenses_dashboard).toBe("ACRED-DE-CONDU-2");
    expect(DOMAIN_TOOL_GUIDS.cosevi_get_driving_tests_dashboard).toBe("PRUEB-TEORI-Y-PRACT");
  });
});
