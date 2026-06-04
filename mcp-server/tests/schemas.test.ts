import { describe, expect, it } from "vitest";
import { getCoseviToolDefinitions } from "../src/tools.js";
import { createMockClient, parseSchema } from "./helpers.js";

const validInputs: Record<string, unknown> = {
  cosevi_health_check: { checkReachability: false },
  cosevi_search_resources: { limit: 1, offset: 0 },
  cosevi_list_datasets: { limit: 1, offset: 0 },
  cosevi_get_dataset: { guid: "D1" },
  cosevi_list_datastreams: { limit: 1, offset: 0 },
  cosevi_get_datastream: { guid: "DS1" },
  cosevi_get_datastream_data: { guid: "DS1", format: "pjson" },
  cosevi_query_datastream: { guid: "DS1", format: "pjson", where: "filter0" },
  cosevi_get_datastream_raw: { guid: "DS1", format: "csv" },
  cosevi_get_datastream_tableau: { guid: "DS1" },
  cosevi_list_visualizations: { limit: 1, offset: 0 },
  cosevi_get_visualization: { guid: "V1" },
  cosevi_list_dashboards: { limit: 1, offset: 0 },
  cosevi_get_dashboard: { guid: "DB1" },
  cosevi_get_dashboard_resources: { guid: "DB1" },
  cosevi_get_portal_stats: { days: 1 },
  cosevi_list_known_dashboards: {},
  cosevi_get_known_dashboard: { keyOrGuid: "fallecidos_en_sitio" },
  cosevi_get_known_dashboard_data: { keyOrGuid: "fallecidos_en_sitio" },
  cosevi_get_fatalities_dashboard: { includeResources: false },
  cosevi_get_fatalities_table_dashboard: { includeResources: false },
  cosevi_get_accidents_dashboard: { includeResources: false },
  cosevi_get_accidents_table_dashboard: { includeResources: false },
  cosevi_get_infractions_dashboard: { includeResources: false },
  cosevi_get_infractions_by_article_dashboard: { includeResources: false },
  cosevi_get_licenses_dashboard: { includeResources: false },
  cosevi_get_driving_tests_dashboard: { includeResources: false },
  cosevi_discover_resources_by_topic: { topic: "fallecidos", limit: 1, offset: 0 },
  cosevi_get_resource_pages: { pageSize: 10, maxPages: 1 },
  cosevi_get_datastream_pages: { guid: "DS1", format: "pjson", pageSize: 10, maxPages: 1 },
};

describe("mcp tool schemas", () => {
  const definitions = getCoseviToolDefinitions(createMockClient() as any);

  for (const definition of definitions) {
    it(`${definition.name} accepts a minimum valid input`, () => {
      expect(parseSchema(definition.inputSchema, validInputs[definition.name]).success).toBe(true);
    });
  }

  it("rejects invalid types, unsupported formats, unsafe expressions, and oversized page limits", () => {
    const byName = new Map(definitions.map((definition) => [definition.name, definition]));
    expect(parseSchema(byName.get("cosevi_search_resources")!.inputSchema, { limit: 0 }).success).toBe(false);
    expect(parseSchema(byName.get("cosevi_get_datastream_raw")!.inputSchema, { guid: "DS1", format: "xls" }).success).toBe(false);
    expect(parseSchema(byName.get("cosevi_query_datastream")!.inputSchema, { guid: "DS1", where: "bad;drop" }).success).toBe(false);
    expect(parseSchema(byName.get("cosevi_get_resource_pages")!.inputSchema, { pageSize: 101, maxPages: 6 }).success).toBe(false);
    expect(parseSchema(byName.get("cosevi_get_dataset")!.inputSchema, {}).success).toBe(false);
  });
});
