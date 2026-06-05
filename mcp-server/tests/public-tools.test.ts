// This file tests the public MCP tool definitions exposed by the server.

import { describe, expect, it } from "vitest";
import { DOMAIN_TOOL_GUIDS, getCoseviToolDefinitions } from "../src/tools.js";
import { createMockClient } from "./helpers.js";

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe("mcp public tool definitions", () => {
  /** Verifies every tool is present with a non-trivial description and at least one schema field. */
  it("exposes every documented tool with description and schema", () => {
    const definitions = getCoseviToolDefinitions(createMockClient() as any);
    expect(definitions.length).toBe(30);
    for (const definition of definitions) {
      expect(definition.name).toMatch(/^cosevi_/);
      expect(definition.description.length).toBeGreaterThan(10);
      expect(Object.keys(definition.inputSchema).length).toBeGreaterThanOrEqual(1);
    }
  });

  /** Verifies every tool description is substantive (≥60 chars) and contains action guidance. */
  it("has substantive descriptions that guide LLM tool selection", () => {
    const definitions = getCoseviToolDefinitions(createMockClient() as any);
    for (const definition of definitions) {
      expect(
        definition.description.length,
        `${definition.name} description is too short`
      ).toBeGreaterThanOrEqual(60);
    }
    // Key tools must mention when/how to use them
    const byName = new Map(definitions.map((d) => [d.name, d]));
    expect(byName.get("cosevi_health_check")!.description).toContain("Use this");
    expect(byName.get("cosevi_search_resources")!.description).toContain("entry point");
    expect(byName.get("cosevi_get_datastream_data")!.description).toContain("cosevi_query_datastream");
    expect(byName.get("cosevi_query_datastream")!.description).toContain("cosevi_get_datastream_data");
    expect(byName.get("cosevi_list_known_dashboards")!.description).toContain("fallecidos");
    expect(byName.get("cosevi_get_fatalities_dashboard")!.description).toContain("Provincia");
    expect(byName.get("cosevi_get_fatalities_table_dashboard")!.description).toContain("REGIS-DE-FALLE-EN-SITIO");
    expect(byName.get("cosevi_discover_resources_by_topic")!.description).toContain("cosevi_search_resources");
  });

  /** Verifies that every schema field has a .describe() annotation set. */
  it("has .describe() on all schema fields", () => {
    const definitions = getCoseviToolDefinitions(createMockClient() as any);
    for (const definition of definitions) {
      for (const [fieldName, schema] of Object.entries(definition.inputSchema)) {
        const description = (schema as { description?: string }).description;
        expect(
          description,
          `${definition.name}.${fieldName} is missing a .describe() annotation`
        ).toBeTruthy();
        expect(
          description!.length,
          `${definition.name}.${fieldName} description is too short`
        ).toBeGreaterThanOrEqual(10);
      }
    }
  });

  /** Verifies the domain tool guid mapping is stable and complete. */
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
