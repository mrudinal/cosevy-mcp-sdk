// This file provides shared helpers for MCP server test suites.

import { vi } from "vitest";
import { z } from "zod";

// -----------------------------------------------------------------------------
// Public exports
// -----------------------------------------------------------------------------
export interface RegisteredTool {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: (input: any) => Promise<any>;
}

/** Creates a lightweight tool-registration recorder for MCP server tests. */
export function createServerRecorder() {
  const tools = new Map<string, RegisteredTool>();
  return {
    tools,
    tool(name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: RegisteredTool["handler"]) {
      tools.set(name, { name, description, schema, handler });
    },
  };
}

/** Creates a mocked COSEVI client with predictable test responses. */
export function createMockClient() {
  return {
    getSanitizedConfig: vi.fn(() => ({ hasApiKey: true, baseUrl: "https://cosevi.cloudapi.junar.com/api/v2", hasReferer: true })),
    getResolvedConfigSource: vi.fn(() => ({ apiKey: "environment", baseUrl: "default", referer: "default", os: "win32" })),
    searchResources: vi.fn(async () => ({ results: [{ guid: "A" }] })),
    listDatasets: vi.fn(async () => ({ results: [] })),
    getDataset: vi.fn(async () => ({ guid: "D1" })),
    listDatastreams: vi.fn(async () => ({ results: [] })),
    getDatastream: vi.fn(async () => ({ guid: "DS1" })),
    getDatastreamData: vi.fn(async () => ({ results: [] })),
    getDatastreamRawText: vi.fn(async () => "raw text"),
    getDatastreamTableau: vi.fn(async () => "<html></html>"),
    listVisualizations: vi.fn(async () => ({ results: [] })),
    getVisualization: vi.fn(async () => ({ guid: "V1" })),
    listDashboards: vi.fn(async () => ({ results: [] })),
    getDashboard: vi.fn(async (guid: string) => ({ guid, resources: [{ type: "ds", guid: "A" }] })),
    extractDashboardResources: vi.fn((_dashboardResponse: any, _resourceOptions?: any) => [{ type: "ds", guid: "A" }]),
    getPortalStats: vi.fn(async () => ({ total: 1 })),
    listKnownDashboards: vi.fn(() => [{ key: "fallecidos_en_sitio", guid: "FALLE-EN-SITIO", category: "fallecidos", title: "Fallecidos en sitio" }]),
    getKnownDashboard: vi.fn(() => ({ key: "fallecidos_en_sitio", guid: "FALLE-EN-SITIO", category: "fallecidos", title: "Fallecidos en sitio" })),
    getKnownDashboardData: vi.fn(async () => ({ guid: "FALLE-EN-SITIO" })),
    discoverResourcesByTopic: vi.fn(async () => ({ results: [] })),
    iterateResources: vi.fn(async function* () {
      yield { results: [{ guid: "A" }] };
    }),
    iterateDatastreamData: vi.fn(async function* () {
      yield [{ row: 1 }];
    }),
  };
}

/** Parses one MCP input schema against a candidate value. */
export function parseSchema(schema: Record<string, z.ZodTypeAny>, value: unknown) {
  return z.object(schema).safeParse(value);
}
