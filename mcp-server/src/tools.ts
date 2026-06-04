import { CoseviClient } from "cosevi-open-data";
import { z } from "zod";
import { safeJsonText, summarizeListResponse, toErrorContent, toRawTextContent, toTextContent } from "./format.js";

// -----------------------------------------------------------------------------
// Constants and shared utilities
// -----------------------------------------------------------------------------

/** Shape of a single MCP tool definition used by `registerCoseviTools`. */
export interface CoseviToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (input: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

const DEFAULT_LIMIT = 20;
export const MAX_MCP_LIMIT = 100;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGES = 5;
const MAX_EXPRESSION_LENGTH = 256;
const MAX_ARRAY_LENGTH = 10;

const allowedFormats = z.enum(["json", "pjson", "ajson", "csv", "xml", "xls"]);
const allowedRawFormats = z.enum(["csv", "xml", "jsonp"]);
const resourceTypes = z.enum(["dt", "ds", "vz", "db"]);
const applyFormatEnum = z.union([z.literal(-1), z.literal(0), z.literal(1)]);

/** Returns true if the string is a safe Junar filter expression (no semicolons or control chars). */
function isSafeExpression(value: string): boolean {
  return value.length > 0
    && value.length <= MAX_EXPRESSION_LENGTH
    && !value.includes(";")
    && !/[\x00-\x1F\x7F]/.test(value);
}

const safeString = z.string().min(1);
const safeExpression = z.string().min(1).max(MAX_EXPRESSION_LENGTH).refine(isSafeExpression, "unsafe expression");
const safeExpressionArray = z.array(safeExpression).max(MAX_ARRAY_LENGTH);

/** Clamps the limit to the MCP-safe range [1, MAX_MCP_LIMIT]. */
function capLimit(limit?: number): number | undefined {
  if (limit === undefined) return undefined;
  return Math.min(Math.max(limit, 1), MAX_MCP_LIMIT);
}

/** Wraps a Junar list API response into the MCP summarized-list text content format. */
function listResult(value: unknown) {
  return { content: [{ type: "text" as const, text: summarizeListResponse(value) }] };
}

/** Mapping from domain shortcut tool name to its stable Junar dashboard GUID. */
export const DOMAIN_TOOL_GUIDS = {
  cosevi_get_fatalities_dashboard: "FALLE-EN-SITIO",
  cosevi_get_fatalities_table_dashboard: "DATOS-PARA-TABLA-INTER-94312",
  cosevi_get_accidents_dashboard: "ACCID-17064",
  cosevi_get_accidents_table_dashboard: "DATOS-PARA-TABLA-INTER-DE",
  cosevi_get_infractions_dashboard: "INFRA-43614",
  cosevi_get_infractions_by_article_dashboard: "CONSU-DE-INFRA-POR-ARTIC",
  cosevi_get_licenses_dashboard: "ACRED-DE-CONDU-2",
  cosevi_get_driving_tests_dashboard: "PRUEB-TEORI-Y-PRACT",
} as const;

/**
 * Returns the full list of 30 COSEVI tool definitions for a given `CoseviClient`.
 * Used by `registerCoseviTools` and schema tests.
 */
export function getCoseviToolDefinitions(client: CoseviClient): CoseviToolDefinition[] {
  const definitions: CoseviToolDefinition[] = [
    {
      name: "cosevi_health_check",
      description: "Read-only health check. Returns sanitized configuration status. Set checkReachability=true for a tiny live API ping.",
      inputSchema: { checkReachability: z.boolean().optional().default(false) },
      handler: async (input) => {
        const configSource = typeof client.getResolvedConfigSource === "function"
          ? client.getResolvedConfigSource()
          : { apiKey: "unknown", os: "unknown" };
        const sanitized = client.getSanitizedConfig();
        const status: Record<string, unknown> = {
          ok: true,
          config: {
            hasApiKey: sanitized.hasApiKey,
            baseUrl: sanitized.baseUrl,
            hasReferer: sanitized.hasReferer,
            apiKeySource: (configSource as { apiKey?: string }).apiKey,
            os: (configSource as { os?: string }).os,
          },
          reachability: { checked: false, ok: false },
        };
        if (input.checkReachability) {
          try {
            await client.searchResources({ query: "fallecidos", resources: ["ds"], limit: 1, offset: 0 });
            status.reachability = { checked: true, ok: true, method: "searchResources" };
          } catch (error) {
            const err = error as { name?: string; status?: number };
            status.ok = false;
            status.reachability = { checked: true, ok: false, errorName: err.name ?? "Error", statusCode: err.status };
          }
        }
        return toTextContent(status);
      },
    },
    {
      name: "cosevi_search_resources",
      description: "Search the COSEVI open data catalog. Resource types: dt=dataset, ds=datastream/view, vz=visualization, db=dashboard.",
      inputSchema: {
        query: z.string().optional(),
        resources: z.array(resourceTypes).optional(),
        categories: z.array(z.string()).optional(),
        order: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.searchResources({
            query: input.query as string | undefined,
            resources: input.resources as Array<"dt" | "ds" | "vz" | "db"> | undefined,
            categories: input.categories as string[] | undefined,
            order: input.order as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_list_datasets",
      description: "List datasets in the COSEVI open data catalog.",
      inputSchema: {
        query: z.string().optional(),
        categories: z.array(z.string()).optional(),
        order: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.listDatasets({
            query: input.query as string | undefined,
            categories: input.categories as string[] | undefined,
            order: input.order as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_dataset",
      description: "Get a specific dataset by GUID from the COSEVI open data catalog.",
      inputSchema: { guid: safeString },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDataset(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_list_datastreams",
      description: "List datastream metadata entries in the COSEVI catalog.",
      inputSchema: {
        query: z.string().optional(),
        categories: z.array(z.string()).optional(),
        order: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.listDatastreams({
            query: input.query as string | undefined,
            categories: input.categories as string[] | undefined,
            order: input.order as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_datastream",
      description: "Get metadata for a specific datastream by GUID.",
      inputSchema: { guid: safeString },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDatastream(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_datastream_data",
      description: "Fetch rows from a COSEVI datastream by GUID. Supports parameters, filters, sorting, grouping, and format options.",
      inputSchema: {
        guid: safeString,
        format: allowedFormats.default("pjson"),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).optional(),
        page: z.number().int().min(1).optional(),
        offset: z.number().int().min(0).optional(),
        parameters: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
        filters: safeExpressionArray.optional(),
        where: safeExpression.optional(),
        orderBy: safeExpressionArray.optional(),
        groupBy: safeExpressionArray.optional(),
        functions: safeExpressionArray.optional(),
        applyFormat: applyFormatEnum.optional(),
        formatConfig: z.record(z.unknown()).optional(),
      },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDatastreamData(input.guid as string, {
            format: input.format as "json" | "pjson" | "ajson" | "csv" | "xml" | "xls",
            limit: capLimit(input.limit as number | undefined),
            page: input.page as number | undefined,
            offset: input.offset as number | undefined,
            parameters: input.parameters as Array<string | number | boolean> | undefined,
            filters: input.filters as string[] | undefined,
            where: input.where as string | undefined,
            orderBy: input.orderBy as string[] | undefined,
            groupBy: input.groupBy as string[] | undefined,
            functions: input.functions as string[] | undefined,
            applyFormat: input.applyFormat as -1 | 0 | 1 | undefined,
            formatConfig: input.formatConfig as Record<string, unknown> | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_query_datastream",
      description: "Fetch rows from a COSEVI datastream using Junar filters, where expressions, sorting, grouping, and functions.",
      inputSchema: {
        guid: safeString,
        format: allowedFormats.default("pjson"),
        filters: safeExpressionArray.optional(),
        where: safeExpression.optional(),
        orderBy: safeExpressionArray.optional(),
        groupBy: safeExpressionArray.optional(),
        functions: safeExpressionArray.optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).optional(),
        page: z.number().int().min(1).optional(),
        applyFormat: applyFormatEnum.optional(),
        formatConfig: z.record(z.unknown()).optional(),
      },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDatastreamData(input.guid as string, {
            format: input.format as "json" | "pjson" | "ajson" | "csv" | "xml" | "xls",
            filters: input.filters as string[] | undefined,
            where: input.where as string | undefined,
            orderBy: input.orderBy as string[] | undefined,
            groupBy: input.groupBy as string[] | undefined,
            functions: input.functions as string[] | undefined,
            limit: capLimit(input.limit as number | undefined),
            page: input.page as number | undefined,
            applyFormat: input.applyFormat as -1 | 0 | 1 | undefined,
            formatConfig: input.formatConfig as Record<string, unknown> | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_datastream_raw",
      description: "Fetch raw text (CSV, XML, JSONP) from a COSEVI datastream. Output is truncated if large.",
      inputSchema: {
        guid: safeString,
        format: allowedRawFormats.default("csv"),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).optional(),
        page: z.number().int().min(1).optional(),
        offset: z.number().int().min(0).optional(),
        parameters: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
        filters: safeExpressionArray.optional(),
        where: safeExpression.optional(),
        orderBy: safeExpressionArray.optional(),
        groupBy: safeExpressionArray.optional(),
        functions: safeExpressionArray.optional(),
        applyFormat: applyFormatEnum.optional(),
        formatConfig: z.record(z.unknown()).optional(),
      },
      handler: async (input) => {
        try {
          return toRawTextContent(await client.getDatastreamRawText(input.guid as string, {
            format: input.format as "csv" | "xml" | "jsonp",
            limit: capLimit(input.limit as number | undefined),
            page: input.page as number | undefined,
            offset: input.offset as number | undefined,
            parameters: input.parameters as Array<string | number | boolean> | undefined,
            filters: input.filters as string[] | undefined,
            where: input.where as string | undefined,
            orderBy: input.orderBy as string[] | undefined,
            groupBy: input.groupBy as string[] | undefined,
            functions: input.functions as string[] | undefined,
            applyFormat: input.applyFormat as -1 | 0 | 1 | undefined,
            formatConfig: input.formatConfig as Record<string, unknown> | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_datastream_tableau",
      description: "Fetch Tableau HTML embed for a COSEVI datastream. Output is truncated if large.",
      inputSchema: {
        guid: safeString,
        parameters: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
      },
      handler: async (input) => {
        try {
          return toRawTextContent(await client.getDatastreamTableau(input.guid as string, {
            parameters: input.parameters as Array<string | number | boolean> | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_list_visualizations",
      description: "List visualizations in the COSEVI catalog.",
      inputSchema: {
        query: z.string().optional(),
        categories: z.array(z.string()).optional(),
        order: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.listVisualizations({
            query: input.query as string | undefined,
            categories: input.categories as string[] | undefined,
            order: input.order as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_visualization",
      description: "Get a specific visualization by GUID.",
      inputSchema: { guid: safeString },
      handler: async (input) => {
        try {
          return toTextContent(await client.getVisualization(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_list_dashboards",
      description: "List dashboards in the COSEVI catalog.",
      inputSchema: {
        query: z.string().optional(),
        categories: z.array(z.string()).optional(),
        order: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.listDashboards({
            query: input.query as string | undefined,
            categories: input.categories as string[] | undefined,
            order: input.order as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_dashboard",
      description: "Get a specific dashboard by GUID.",
      inputSchema: { guid: safeString },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDashboard(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_dashboard_resources",
      description: "Get a dashboard and extract its component resources.",
      inputSchema: {
        guid: safeString,
        resourceTypes: z.array(z.enum(["dt", "ds", "vz", "db", "html"])).optional(),
      },
      handler: async (input) => {
        try {
          const dashboard = await client.getDashboard(input.guid as string);
          const resources = client.extractDashboardResources(dashboard, {
            resourceTypes: input.resourceTypes as Array<"dt" | "ds" | "vz" | "db" | "html"> | undefined,
          });
          return toTextContent({ dashboard, resources });
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_portal_stats",
      description: "Get COSEVI portal usage statistics.",
      inputSchema: {
        days: z.number().int().min(1).optional(),
        hours: z.number().int().min(1).optional(),
        minutes: z.number().int().min(1).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        channel: z.enum(["API", "WEB", "0", "1"]).optional(),
        facets: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).optional(),
        groupBy: safeExpression.optional(),
        order: safeExpression.optional(),
      },
      handler: async (input) => {
        try {
          return toTextContent(await client.getPortalStats({
            days: input.days as number | undefined,
            hours: input.hours as number | undefined,
            minutes: input.minutes as number | undefined,
            from: input.from as string | undefined,
            to: input.to as string | undefined,
            channel: input.channel as "API" | "WEB" | 0 | 1 | undefined,
            facets: input.facets as string | undefined,
            limit: capLimit(input.limit as number | undefined),
            groupBy: input.groupBy as string | undefined,
            order: input.order as string | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_list_known_dashboards",
      description: "List the curated set of known COSEVI dashboards. Optionally filter by category.",
      inputSchema: { category: z.string().optional() },
      handler: async (input) => toTextContent(client.listKnownDashboards(input.category as string | undefined)),
    },
    {
      name: "cosevi_get_known_dashboard",
      description: "Get metadata for a known COSEVI dashboard by key or GUID.",
      inputSchema: { keyOrGuid: safeString },
      handler: async (input) => {
        const result = client.getKnownDashboard(input.keyOrGuid as string);
        return toTextContent(result ?? { found: false, keyOrGuid: input.keyOrGuid });
      },
    },
    {
      name: "cosevi_get_known_dashboard_data",
      description: "Fetch live data for a known COSEVI dashboard by key or GUID.",
      inputSchema: { keyOrGuid: safeString },
      handler: async (input) => {
        try {
          return toTextContent(await client.getKnownDashboardData(input.keyOrGuid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_discover_resources_by_topic",
      description: "Search the COSEVI catalog by topic keyword. Convenience wrapper around searchResources.",
      inputSchema: {
        topic: safeString,
        resources: z.array(resourceTypes).optional(),
        limit: z.number().int().min(1).max(MAX_MCP_LIMIT).default(DEFAULT_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      handler: async (input) => {
        try {
          return listResult(await client.discoverResourcesByTopic(input.topic as string, {
            resources: input.resources as Array<"dt" | "ds" | "vz" | "db"> | undefined,
            limit: capLimit(input.limit as number | undefined),
            offset: input.offset as number | undefined,
          }));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_resource_pages",
      description: "Fetch multiple pages of COSEVI resources. Hard caps: maxPages=5, pageSize=100.",
      inputSchema: {
        query: z.string().optional(),
        resources: z.array(resourceTypes).optional(),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
        maxPages: z.number().int().min(1).max(MAX_PAGES).default(2),
      },
      handler: async (input) => {
        try {
          const pages: unknown[] = [];
          for await (const page of client.iterateResources({
            query: input.query as string | undefined,
            resources: input.resources as Array<"dt" | "ds" | "vz" | "db"> | undefined,
            pageSize: input.pageSize as number,
            maxPages: input.maxPages as number,
          })) {
            pages.push(page);
          }
          return toTextContent({ pageCount: pages.length, pages });
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
    {
      name: "cosevi_get_datastream_pages",
      description: "Fetch multiple pages of datastream data. Hard caps: maxPages=5, pageSize=100.",
      inputSchema: {
        guid: safeString,
        format: z.enum(["json", "pjson", "ajson"]).default("pjson"),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
        maxPages: z.number().int().min(1).max(MAX_PAGES).default(2),
      },
      handler: async (input) => {
        try {
          const pages: unknown[] = [];
          for await (const page of client.iterateDatastreamData(input.guid as string, {
            format: input.format as "json" | "pjson" | "ajson",
            pageSize: input.pageSize as number,
            maxPages: input.maxPages as number,
          })) {
            pages.push(page);
          }
          return toTextContent({ pageCount: pages.length, pages });
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },
  ];

  const domainToolDefinitions = Object.entries(DOMAIN_TOOL_GUIDS).map(([name, guid]) => ({
    name,
    guid,
    description: ({
      cosevi_get_fatalities_dashboard: "Get the COSEVI fatalities (fallecidos en sitio) dashboard.",
      cosevi_get_fatalities_table_dashboard: "Get the COSEVI interactive fatalities table dashboard.",
      cosevi_get_accidents_dashboard: "Get the COSEVI traffic accidents dashboard.",
      cosevi_get_accidents_table_dashboard: "Get the COSEVI interactive accidents table dashboard.",
      cosevi_get_infractions_dashboard: "Get the COSEVI infractions dashboard.",
      cosevi_get_infractions_by_article_dashboard: "Get the COSEVI infractions by article dashboard.",
      cosevi_get_licenses_dashboard: "Get the COSEVI driver licenses dashboard.",
      cosevi_get_driving_tests_dashboard: "Get the COSEVI driving tests dashboard.",
    } as Record<string, string>)[name],
  })).map(({ name, guid, description }) => ({
    name,
    description,
    inputSchema: { includeResources: z.boolean().optional().default(false) },
    handler: async (input: Record<string, unknown>) => {
      try {
        const dashboard = await client.getDashboard(guid);
        if (input.includeResources) {
          return toTextContent({ dashboard, resources: client.extractDashboardResources(dashboard) });
        }
        return toTextContent(dashboard);
      } catch (error) {
        return toErrorContent(error);
      }
    },
  } as CoseviToolDefinition));

  return [...definitions, ...domainToolDefinitions];
}

/**
 * Registers all 30 COSEVI tools on the given `McpServer` instance.
 * Called once during server startup.
 */
export function registerCoseviTools(server: { tool: (name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: CoseviToolDefinition["handler"]) => void }, client: CoseviClient) {
  for (const definition of getCoseviToolDefinitions(client)) {
    server.tool(definition.name, definition.description, definition.inputSchema, definition.handler);
  }
}

/** Returns a JSON string listing all registered tool names for debugging. */
export function describeRegisteredToolNames(client: CoseviClient): string {
  return safeJsonText(getCoseviToolDefinitions(client).map((definition) => definition.name));
}
