// This file provides a lightweight MCP server fixture for protocol tests.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCoseviTools } from "../../src/tools.js";

const client = {
  getSanitizedConfig: () => ({ hasApiKey: true, baseUrl: "https://cosevi.cloudapi.junar.com/api/v2", hasReferer: true }),
  getResolvedConfigSource: () => ({ apiKey: "environment", baseUrl: "default", referer: "default", os: process.platform }),
  searchResources: async () => ({ results: [{ guid: "A" }] }),
  listDatasets: async () => ({ results: [] }),
  getDataset: async (guid: string) => ({ guid }),
  listDatastreams: async () => ({ results: [] }),
  getDatastream: async (guid: string) => ({ guid }),
  getDatastreamData: async () => ({ results: [] }),
  getDatastreamRawText: async () => "raw text",
  getDatastreamTableau: async () => "<html></html>",
  listVisualizations: async () => ({ results: [] }),
  getVisualization: async (guid: string) => ({ guid }),
  listDashboards: async () => ({ results: [] }),
  getDashboard: async (guid: string) => ({ guid, resources: [{ type: "ds", guid: "A" }] }),
  extractDashboardResources: () => [{ type: "ds", guid: "A" }],
  getPortalStats: async () => ({ total: 1 }),
  listKnownDashboards: () => [{ key: "fallecidos_en_sitio", guid: "FALLE-EN-SITIO" }],
  getKnownDashboard: () => ({ key: "fallecidos_en_sitio", guid: "FALLE-EN-SITIO" }),
  getKnownDashboardData: async () => ({ guid: "FALLE-EN-SITIO" }),
  discoverResourcesByTopic: async () => ({ results: [] }),
  async *iterateResources() { yield { results: [{ guid: "A" }] }; },
  async *iterateDatastreamData() { yield [{ row: 1 }]; },
};

const server = new McpServer({ name: "cosevi-protocol-test", version: "0.0.0" });
registerCoseviTools(server, client as any);
await server.connect(new StdioServerTransport());
