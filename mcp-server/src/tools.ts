// This file defines the COSEVI MCP tool registry and request normalization helpers.

import { CoseviClient } from "cosevi-open-data";
import { z } from "zod";
import { safeJsonText, summarizeListResponse, toErrorContent, toRawTextContent, toTextContent } from "./format.js";

// -----------------------------------------------------------------------------
// Constants and shared utilities
// -----------------------------------------------------------------------------

/** Shape of a single MCP tool definition used by `registerCoseviTools`. */
// -----------------------------------------------------------------------------
// Public exports
// -----------------------------------------------------------------------------
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
const simpleJunarFieldPattern = /^column\d+$/i;
const junarFilterPattern = /^(.+?)\[(==|=|!=|<>|>=|<=|>|<)\](.+)$/;
const simpleSqlClausePattern = /^["']?([^"'=<>!]+?)["']?\s*(==|=|!=|<>|>=|<=|>|<)\s*(.+)$/;

const allowedFormats = z.enum(["json", "pjson", "ajson", "csv", "xml", "xls"]).describe(
  "Response format. pjson (default) returns an array of row objects — best for analysis. " +
  "json/ajson are alternative Junar JSON shapes. csv/xml return plain text. " +
  "xls attempts JSON parsing and falls back to raw text."
);

const allowedRawFormats = z.enum(["csv", "xml", "jsonp"]).describe(
  "Text-only format. csv = comma-separated, xml = XML markup, jsonp = JavaScript callback. " +
  "Use csv when you need spreadsheet-compatible output."
);

const resourceTypes = z.enum(["dt", "ds", "vz", "db"]).describe(
  "Resource type: dt=raw dataset file, ds=datastream/API view (queryable rows), " +
  "vz=visualization/chart, db=dashboard/collection."
);

const applyFormatEnum = z.union([z.literal(-1), z.literal(0), z.literal(1)]).describe(
  "Junar value formatting flag: -1 = raw unformatted values (recommended for analysis), " +
  "0 = Junar default, 1 = apply the datastream's configured display formatting."
);

/** Returns true when a Junar expression is short, non-empty, and free of unsafe characters. */
function isSafeExpression(value: string): boolean {
  return value.length > 0
    && value.length <= MAX_EXPRESSION_LENGTH
    && !value.includes(";")
    && !/[\x00-\x1F\x7F]/.test(value);
}

const safeString = z.string().min(1);
const safeExpression = z.string().min(1).max(MAX_EXPRESSION_LENGTH).refine(isSafeExpression, "unsafe expression");
const safeExpressionArray = z.array(safeExpression).max(MAX_ARRAY_LENGTH);

// Shared field descriptions reused across multiple tools
const guidField = safeString.describe(
  "Junar resource GUID, e.g. REGIS-DE-FALLE-EN-SITIO. " +
  "Obtain from cosevi_search_resources, cosevi_list_datastreams, or the known-dashboards list."
);

const queryField = z.string().optional().describe(
  "Keyword to search for in Spanish or English, e.g. \"fallecidos\", \"accidentes\", \"infracciones\"."
);

const categoriesField = z.array(z.string()).optional().describe(
  "Filter by catalog category names, e.g. [\"Fallecidos\", \"Accidentes\"]."
);

const orderField = z.string().optional().describe(
  "Sort order for list results. Common values: \"top\" (most popular), \"date\" (most recent)."
);

const limitField = (max = MAX_MCP_LIMIT, def = DEFAULT_LIMIT) =>
  z.number().int().min(1).max(max).default(def).describe(
    `Maximum number of results to return (1–${max}, default ${def}).`
  );

const offsetField = z.number().int().min(0).default(0).describe(
  "Number of results to skip for pagination. Use with limit."
);

const filtersField = safeExpressionArray.optional().describe(
  "Junar filter expressions applied as AND conditions. Use columnN[op]value syntax, " +
  "e.g. [\"column5[>]2020\", \"column2[==]San José\"]. " +
  "Human field names work when fieldMap is provided, e.g. [\"Ano[>]2022\"]."
);

const whereField = safeExpression.optional().describe(
  "Logical combination of filter references, e.g. \"filter0 and filter1\" or \"filter0 or filter1\". " +
  "Simple SQL-like expressions also work: \"Ano = 2024\" or \"Provincia = San José\". " +
  "When using named fields, provide fieldMap."
);

const fieldMapField = z.record(z.string()).optional().describe(
  "Maps human-readable field names to Junar column tokens. Required when filters or where use " +
  "column names instead of columnN syntax. Example: {\"Provincia\":\"column2\", \"Ano\":\"column5\"}. " +
  "Check the datastream metadata to find column positions."
);

const orderByField = safeExpressionArray.optional().describe(
  "Sort expressions in Junar syntax. columnN[A] = ascending, columnN[D] = descending. " +
  "Example: [\"column5[D]\"] sorts by column 5 descending (newest first)."
);

const groupByField = safeExpressionArray.optional().describe(
  "Group-by column references for aggregation, e.g. [\"column2\"]. " +
  "Combine with functions to aggregate grouped results."
);

const functionsField = safeExpressionArray.optional().describe(
  "Junar aggregation functions applied after grouping. " +
  "Examples: [\"COUNT[column0]\", \"SUM[column1]\", \"AVG[column3]\"]."
);

const parametersField = z.array(z.union([z.string(), z.number(), z.boolean()])).optional().describe(
  "Positional parameters for parameterized datastreams, mapped to pArgument0, pArgument1, … " +
  "on the Junar API. Example: [\"2024\"] sets pArgument0=2024."
);

const pageField = z.number().int().min(1).optional().describe(
  "1-based page number for paginated datastream data. Use with limit."
);

const formatConfigField = z.record(z.unknown()).optional().describe(
  "Advanced Junar formatConfig object passed as the 'format' query parameter. " +
  "Used to configure column types or display hints for specific datastreams."
);

const keyOrGuidField = safeString.describe(
  "Known dashboard key (e.g. fallecidos_en_sitio) or Junar GUID (e.g. FALLE-EN-SITIO). " +
  "Use cosevi_list_known_dashboards to see all available keys."
);

const includeResourcesField = z.boolean().optional().default(false).describe(
  "If true, also extracts and returns the list of component resources " +
  "(datasets, datastreams, visualizations) embedded in the dashboard."
);

/** Clamps a requested limit into the MCP-safe range. */
function capLimit(limit?: number): number | undefined {
  if (limit === undefined) return undefined;
  return Math.min(Math.max(limit, 1), MAX_MCP_LIMIT);
}

/** Wraps a list-style response in summarized MCP text content. */
function listResult(value: unknown) {
  return { content: [{ type: "text" as const, text: summarizeListResponse(value) }] };
}

/** Normalizes a human field name for accent-insensitive matching. */
function normalizeFieldKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Normalizes supported comparison operators into Junar-compatible form. */
function normalizeOperator(operator: string): "==" | "!=" | ">=" | "<=" | ">" | "<" {
  if (operator === "=") return "==";
  if (operator === "<>") return "!=";
  if (operator === "==" || operator === "!=" || operator === ">=" || operator === "<=" || operator === ">" || operator === "<") {
    return operator;
  }
  throw new Error(`Operador no soportado: ${operator}. Usa =, !=, >=, <=, > o <.`);
}

/** Removes matching single or double quotes around a value. */
function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Resolves a human field name or Junar column token to a stable `columnN` reference. */
function resolveFieldReference(field: string, fieldMap?: Record<string, string>): string {
  const trimmed = stripWrappingQuotes(field);
  if (simpleJunarFieldPattern.test(trimmed)) return trimmed.toLowerCase();
  const normalized = normalizeFieldKey(trimmed);
  const resolved = Object.entries(fieldMap ?? {}).find(([key]) => normalizeFieldKey(key) === normalized)?.[1];
  if (resolved && simpleJunarFieldPattern.test(resolved)) return resolved.toLowerCase();
  throw new Error(
    `No pude mapear el campo "${trimmed}" a una columna Junar. Usa columnN[...] o agrega fieldMap, por ejemplo {"${trimmed}":"column0"}.`
  );
}

/** Translates a friendly filter expression into Junar filter syntax when possible. */
function translateFilterExpression(expression: string, fieldMap?: Record<string, string>): string {
  const trimmed = expression.trim();
  const match = trimmed.match(junarFilterPattern);
  if (!match) return trimmed;
  const [, rawField, rawOperator, rawValue] = match;
  const field = resolveFieldReference(rawField, fieldMap);
  const operator = normalizeOperator(rawOperator);
  return `${field}[${operator}]${stripWrappingQuotes(rawValue)}`;
}

/** Detects whether a `where` expression already references existing `filterN` tokens. */
function isFilterReferenceWhere(where: string): boolean {
  return /^[\s\w()]+$/i.test(where) && /\bfilter\d+\b/i.test(where) && !/[=<>!]/.test(where);
}

/** Splits a simple logical `where` expression into clauses and join operators. */
function splitLogicalClauses(where: string): { clauses: string[]; joins: string[] } {
  const joins = Array.from(where.matchAll(/\s+(and|or)\s+/gi)).map((match) => match[1].toLowerCase());
  const clauses = where.split(/\s+(?:and|or)\s+/i).map((part) => part.trim()).filter(Boolean);
  return { clauses, joins };
}

/** Translates a friendly `where` expression into Junar filters and filter references. */
function translateWhereExpression(
  where: string | undefined,
  filters: string[],
  fieldMap?: Record<string, string>
): { filters: string[]; where?: string } {
  if (!where) return { filters };
  const trimmed = where.trim();
  if (!trimmed) return { filters };
  if (isFilterReferenceWhere(trimmed)) return { filters, where: trimmed };
  if (!/[=<>!]/.test(trimmed)) return { filters, where: trimmed };

  const { clauses, joins } = splitLogicalClauses(trimmed);
  if (!clauses.length) return { filters };

  const translatedFilters = [...filters];
  const references: string[] = [];

  for (const clause of clauses) {
    const match = clause.match(simpleSqlClausePattern);
    if (!match) {
      throw new Error(
        `No pude traducir where="${trimmed}". Usa where con filter0/filter1 o una expresión simple como "Ano = 2024", junto con fieldMap cuando no uses columnN.`
      );
    }
    const [, rawField, rawOperator, rawValue] = match;
    const field = resolveFieldReference(rawField, fieldMap);
    const operator = normalizeOperator(rawOperator);
    translatedFilters.push(`${field}[${operator}]${stripWrappingQuotes(rawValue)}`);
    references.push(`filter${translatedFilters.length - 1}`);
  }

  const translatedWhere = references.reduce((result, reference, index) => {
    if (index === 0) return reference;
    return `${result} ${joins[index - 1] ?? "and"} ${reference}`;
  }, "");

  return { filters: translatedFilters, where: translatedWhere };
}

/** Normalizes friendly datastream query input before delegating to the SDK. */
function normalizeDatastreamQueryInput(input: Record<string, unknown>) {
  const fieldMap = input.fieldMap as Record<string, string> | undefined;
  const initialFilters = ((input.filters as string[] | undefined) ?? []).map((value) => translateFilterExpression(value, fieldMap));
  return translateWhereExpression(input.where as string | undefined, initialFilters, fieldMap);
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

/** Human-readable descriptions for each domain shortcut tool. */
const DOMAIN_TOOL_DESCRIPTIONS: Record<string, string> = {
  cosevi_get_fatalities_dashboard:
    "Fetch the COSEVI on-site fatalities (fallecidos en sitio) dashboard. " +
    "Contains aggregated death counts broken down by Provincia, Canton, Rol-persona, " +
    "Tipo-de-accidente, Franja (time slot), and Ano. " +
    "Use this to explore who dies, where, and when in Costa Rica traffic accidents. " +
    "Set includeResources=true to also retrieve the component datastreams and datasets.",

  cosevi_get_fatalities_table_dashboard:
    "Fetch the COSEVI interactive fatalities table dashboard (DATOS-PARA-TABLA-INTER-94312). " +
    "Provides the row-level data that powers the official COSEVI interactive table of " +
    "on-site fatalities. Each row represents one death with fields: Provincia, Canton, " +
    "Rol-persona, Tipo-de-accidente, Franja, Dia, Sexo, Edad, Ano, Mes. " +
    "Use this — or cosevi_get_datastream_data with guid REGIS-DE-FALLE-EN-SITIO — " +
    "for individual-record analysis.",

  cosevi_get_accidents_dashboard:
    "Fetch the COSEVI traffic accidents (accidentes de tránsito) dashboard (ACCID-17064). " +
    "Contains accident counts, severity breakdowns, and geographic distribution. " +
    "Use this to understand accident frequency, hotspot provinces and cantons, and trends over time.",

  cosevi_get_accidents_table_dashboard:
    "Fetch the COSEVI interactive accidents table dashboard (DATOS-PARA-TABLA-INTER-DE). " +
    "Provides row-level accident records used by the official interactive accident table. " +
    "Use for detailed accident-level analysis or cross-tabulation.",

  cosevi_get_infractions_dashboard:
    "Fetch the COSEVI infractions (infracciones de tránsito) dashboard (INFRA-43614). " +
    "Contains traffic violation counts grouped by type, province, canton, and year. " +
    "Use this to understand which violations are most common and where enforcement is concentrated.",

  cosevi_get_infractions_by_article_dashboard:
    "Fetch the COSEVI infractions-by-article dashboard (CONSU-DE-INFRA-POR-ARTIC). " +
    "Breaks down infractions by the specific legal article violated. " +
    "Use this when you need to know which law articles generate the most citations.",

  cosevi_get_licenses_dashboard:
    "Fetch the COSEVI driver licenses and accreditation dashboard (ACRED-DE-CONDU-2). " +
    "Contains statistics on active licenses, license categories, renewals, and driver demographics. " +
    "Use this to answer questions about the licensed driver population in Costa Rica.",

  cosevi_get_driving_tests_dashboard:
    "Fetch the COSEVI driving tests dashboard (PRUEB-TEORI-Y-PRACT). " +
    "Contains pass/fail rates and volumes for theoretical and practical driving exams. " +
    "Use this to analyze exam performance, regional differences, or testing trends over time.",
};

/**
 * Returns the full list of 30 COSEVI tool definitions for a given `CoseviClient`.
 * Used by `registerCoseviTools` and schema tests.
 */
export function getCoseviToolDefinitions(client: CoseviClient): CoseviToolDefinition[] {
  const definitions: CoseviToolDefinition[] = [
    // -------------------------------------------------------------------------
    // Health check
    // -------------------------------------------------------------------------
    {
      name: "cosevi_health_check",
      description:
        "Verify the MCP server configuration and optionally test live COSEVI API connectivity. " +
        "Use this first when diagnosing connection issues or confirming the API key is loaded. " +
        "Returns hasApiKey, baseUrl, apiKeySource (constructor/env/.env/missing), and OS info. " +
        "Set checkReachability=true to make one small live request and confirm the API responds.",
      inputSchema: {
        checkReachability: z.boolean().optional().default(false).describe(
          "If true, makes one tiny live request to cosevi_search_resources to verify the COSEVI API is reachable. " +
          "Leave false (default) to check configuration only without any network calls."
        ),
      },
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

    // -------------------------------------------------------------------------
    // Catalog search
    // -------------------------------------------------------------------------
    {
      name: "cosevi_search_resources",
      description:
        "Search the full COSEVI open data catalog across all resource types at once. " +
        "Use this as the entry point when you don't know which specific dataset or datastream to use, " +
        "or when you want to discover what COSEVI data exists on a topic. " +
        "Returns titles, GUIDs, types, and links you can pass to more specific tools. " +
        "Filter by type: ds=datastream (queryable rows, best for analysis), " +
        "dt=dataset (raw files), vz=visualization, db=dashboard. " +
        "Use cosevi_discover_resources_by_topic for a simpler keyword-only search.",
      inputSchema: {
        query: queryField,
        resources: z.array(resourceTypes).optional().describe(
          "Limit results to specific resource types. Omit to search all types. " +
          "Use [\"ds\"] to find queryable datastreams, [\"db\"] to find dashboards."
        ),
        categories: categoriesField,
        order: orderField,
        limit: limitField(),
        offset: offsetField,
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

    // -------------------------------------------------------------------------
    // Dataset tools
    // -------------------------------------------------------------------------
    {
      name: "cosevi_list_datasets",
      description:
        "List raw dataset files (type=dt) in the COSEVI catalog. " +
        "Datasets are static file exports (Excel, CSV) rather than live queryable API views. " +
        "Use cosevi_list_datastreams instead when you need row-level queryable data. " +
        "Use this when looking for downloadable file exports or bulk data transfers.",
      inputSchema: {
        query: queryField,
        categories: categoriesField,
        order: orderField,
        limit: limitField(),
        offset: offsetField,
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
      description:
        "Fetch metadata for a single COSEVI dataset by its Junar GUID. " +
        "Returns title, description, source, frequency, category, and download links. " +
        "Use cosevi_list_datasets or cosevi_search_resources to discover GUIDs first.",
      inputSchema: { guid: guidField },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDataset(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Datastream metadata tools
    // -------------------------------------------------------------------------
    {
      name: "cosevi_list_datastreams",
      description:
        "List datastream metadata entries (type=ds) in the COSEVI catalog. " +
        "Datastreams are live API views with queryable rows — the primary data surface for analysis. " +
        "Use this to discover which datastreams exist, then pass their GUIDs to " +
        "cosevi_get_datastream_data or cosevi_query_datastream to fetch actual rows.",
      inputSchema: {
        query: queryField,
        categories: categoriesField,
        order: orderField,
        limit: limitField(),
        offset: offsetField,
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
      description:
        "Fetch metadata for a single COSEVI datastream by its Junar GUID. " +
        "Returns title, description, column definitions, update frequency, source, and category. " +
        "Use this to inspect column names and positions before writing filters or fieldMap entries. " +
        "The column index shown here maps directly to columnN syntax (e.g. column0, column1).",
      inputSchema: { guid: guidField },
      handler: async (input) => {
        try {
          return toTextContent(await client.getDatastream(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Datastream data tools
    // -------------------------------------------------------------------------
    {
      name: "cosevi_get_datastream_data",
      description:
        "Fetch rows from a COSEVI datastream by GUID. Use this for straightforward data retrieval — " +
        "optionally with positional parameters, pagination, or basic filtering. " +
        "Prefer cosevi_query_datastream when you need filters, where clauses, groupBy, or aggregation functions. " +
        "Returns pjson (array of row objects) by default — best format for data analysis. " +
        "Known datastream for fatality records: REGIS-DE-FALLE-EN-SITIO (fields: Provincia, Canton, " +
        "Rol-persona, Tipo-de-accidente, Franja, Dia, Sexo, Edad, Ano, Mes).",
      inputSchema: {
        guid: guidField,
        format: allowedFormats,
        limit: limitField(MAX_MCP_LIMIT, 20),
        page: pageField,
        offset: z.number().int().min(0).optional().describe("Number of rows to skip (alternative to page-based pagination)."),
        parameters: parametersField,
        filters: filtersField,
        where: whereField,
        fieldMap: fieldMapField,
        orderBy: orderByField,
        groupBy: groupByField,
        functions: functionsField,
        applyFormat: applyFormatEnum.optional(),
        formatConfig: formatConfigField,
      },
      handler: async (input) => {
        try {
          const translated = normalizeDatastreamQueryInput(input);
          return toTextContent(await client.getDatastreamData(input.guid as string, {
            format: input.format as "json" | "pjson" | "ajson" | "csv" | "xml" | "xls",
            limit: capLimit(input.limit as number | undefined),
            page: input.page as number | undefined,
            offset: input.offset as number | undefined,
            parameters: input.parameters as Array<string | number | boolean> | undefined,
            filters: translated.filters,
            where: translated.where,
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
      description:
        "Query a COSEVI datastream with filters, WHERE logic, sorting, grouping, and aggregation functions. " +
        "Use this instead of cosevi_get_datastream_data when you need to filter rows, compute totals, " +
        "sort by a column, or group results. " +
        "Supports friendly SQL-like WHERE expressions (e.g. 'Ano = 2024 and Provincia = San José') " +
        "when combined with fieldMap. Also accepts raw Junar filter syntax (column5[>]2020). " +
        "Example: filter fatality records by province and year, then count by road-user role.",
      inputSchema: {
        guid: guidField,
        format: allowedFormats,
        filters: filtersField,
        where: whereField,
        fieldMap: fieldMapField,
        orderBy: orderByField,
        groupBy: groupByField,
        functions: functionsField,
        limit: limitField(),
        page: pageField,
        applyFormat: applyFormatEnum.optional(),
        formatConfig: formatConfigField,
      },
      handler: async (input) => {
        try {
          const translated = normalizeDatastreamQueryInput(input);
          return toTextContent(await client.getDatastreamData(input.guid as string, {
            format: input.format as "json" | "pjson" | "ajson" | "csv" | "xml" | "xls",
            filters: translated.filters,
            where: translated.where,
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
      description:
        "Fetch a COSEVI datastream as raw text in CSV, XML, or JSONP format. " +
        "Use this when you need spreadsheet-compatible CSV output, XML for structured parsing, " +
        "or JSONP for legacy JavaScript embedding. " +
        "Prefer cosevi_get_datastream_data (pjson) for analysis — this tool returns plain text " +
        "which is harder to work with programmatically. Output is truncated at 8000 characters.",
      inputSchema: {
        guid: guidField,
        format: allowedRawFormats,
        limit: limitField(),
        page: pageField,
        offset: z.number().int().min(0).optional().describe("Number of rows to skip."),
        parameters: parametersField,
        filters: filtersField,
        where: whereField,
        fieldMap: fieldMapField,
        orderBy: orderByField,
        groupBy: groupByField,
        functions: functionsField,
        applyFormat: applyFormatEnum.optional(),
        formatConfig: formatConfigField,
      },
      handler: async (input) => {
        try {
          const translated = normalizeDatastreamQueryInput(input);
          return toRawTextContent(await client.getDatastreamRawText(input.guid as string, {
            format: input.format as "csv" | "xml" | "jsonp",
            limit: capLimit(input.limit as number | undefined),
            page: input.page as number | undefined,
            offset: input.offset as number | undefined,
            parameters: input.parameters as Array<string | number | boolean> | undefined,
            filters: translated.filters,
            where: translated.where,
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
      description:
        "Fetch the Tableau HTML embed snippet for a COSEVI datastream. " +
        "Use this when you need to embed a COSEVI data view into a Tableau-compatible dashboard " +
        "or extract the HTML embed code for a visualization. " +
        "Returns raw HTML — output is truncated at 8000 characters if large.",
      inputSchema: {
        guid: guidField,
        parameters: parametersField,
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

    // -------------------------------------------------------------------------
    // Visualization tools
    // -------------------------------------------------------------------------
    {
      name: "cosevi_list_visualizations",
      description:
        "List chart and visualization resources (type=vz) in the COSEVI catalog. " +
        "Visualizations are pre-built charts linked to underlying datastreams. " +
        "Use this to discover available charts, then fetch their GUIDs for cosevi_get_visualization.",
      inputSchema: {
        query: queryField,
        categories: categoriesField,
        order: orderField,
        limit: limitField(),
        offset: offsetField,
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
      description:
        "Fetch metadata for a single COSEVI visualization by GUID. " +
        "Returns the chart type, linked datastream, title, and embed configuration. " +
        "Use cosevi_list_visualizations to discover GUIDs first.",
      inputSchema: { guid: guidField },
      handler: async (input) => {
        try {
          return toTextContent(await client.getVisualization(input.guid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Dashboard tools
    // -------------------------------------------------------------------------
    {
      name: "cosevi_list_dashboards",
      description:
        "List dashboard collections (type=db) in the COSEVI catalog. " +
        "Dashboards group related datasets, datastreams, and visualizations into a thematic collection. " +
        "Use this to discover available dashboards. For the most important COSEVI dashboards, " +
        "use cosevi_list_known_dashboards or the domain shortcut tools (cosevi_get_fatalities_dashboard, etc.).",
      inputSchema: {
        query: queryField,
        categories: categoriesField,
        order: orderField,
        limit: limitField(),
        offset: offsetField,
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
      description:
        "Fetch a COSEVI dashboard by its Junar GUID. " +
        "Returns the dashboard metadata and its embedded component resources. " +
        "For named COSEVI dashboards (fatalities, accidents, infractions, licenses, tests), " +
        "prefer the domain shortcut tools or cosevi_get_known_dashboard_data for a simpler interface.",
      inputSchema: { guid: guidField },
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
      description:
        "Fetch a COSEVI dashboard and extract its component resources (datasets, datastreams, visualizations). " +
        "Use this when you need to identify which datastreams are embedded in a dashboard " +
        "so you can query them individually with cosevi_get_datastream_data. " +
        "Filter resourceTypes to narrow to specific component types.",
      inputSchema: {
        guid: guidField,
        resourceTypes: z.array(z.enum(["dt", "ds", "vz", "db", "html"])).optional().describe(
          "Limit extracted resources to specific types. Omit to extract all. " +
          "Use [\"ds\"] to get only the queryable datastreams inside this dashboard."
        ),
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

    // -------------------------------------------------------------------------
    // Portal stats
    // -------------------------------------------------------------------------
    {
      name: "cosevi_get_portal_stats",
      description:
        "Fetch COSEVI open data portal usage statistics — how many API calls were made, " +
        "by which channel (API vs web), and for which resources. " +
        "Use this to understand which datasets are most accessed or to audit portal activity. " +
        "Specify a time window using days, hours, or minutes (relative to now), " +
        "or use from/to for an absolute date range.",
      inputSchema: {
        days: z.number().int().min(1).optional().describe(
          "Return stats for the last N days relative to now. Example: 7 = last week."
        ),
        hours: z.number().int().min(1).optional().describe(
          "Return stats for the last N hours relative to now."
        ),
        minutes: z.number().int().min(1).optional().describe(
          "Return stats for the last N minutes relative to now."
        ),
        from: z.string().optional().describe(
          "Start of date range in ISO 8601 format, e.g. '2024-01-01'. Use with 'to'."
        ),
        to: z.string().optional().describe(
          "End of date range in ISO 8601 format, e.g. '2024-12-31'. Use with 'from'."
        ),
        channel: z.enum(["API", "WEB", "0", "1"]).optional().describe(
          "Filter by access channel: API = programmatic access, WEB = browser access."
        ),
        facets: z.string().optional().describe(
          "Comma-separated facet dimensions to include in the response, e.g. 'resource,channel'."
        ),
        limit: limitField().optional().describe(
          "Maximum number of stat entries to return."
        ),
        groupBy: safeExpression.optional().describe(
          "Group stats by a dimension, e.g. 'day', 'resource', or 'channel'."
        ),
        order: safeExpression.optional().describe(
          "Sort the stat results, e.g. 'count' or 'date'."
        ),
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

    // -------------------------------------------------------------------------
    // Known COSEVI dashboard helpers
    // -------------------------------------------------------------------------
    {
      name: "cosevi_list_known_dashboards",
      description:
        "List the curated set of well-known COSEVI dashboards with their keys and Junar GUIDs. " +
        "Use this to discover dashboard identifiers you can pass to cosevi_get_known_dashboard_data " +
        "or the domain shortcut tools. Optionally filter by category. " +
        "Valid categories: fallecidos, accidentes, infracciones, licencias, pruebas, general.",
      inputSchema: {
        category: z.string().optional().describe(
          "Filter by category. Valid values: fallecidos (deaths), accidentes (accidents), " +
          "infracciones (violations), licencias (licenses), pruebas (driving tests), general."
        ),
      },
      handler: async (input) => toTextContent(client.listKnownDashboards(input.category as string | undefined)),
    },
    {
      name: "cosevi_get_known_dashboard",
      description:
        "Look up metadata for a known COSEVI dashboard by its short key or Junar GUID. " +
        "Returns key, guid, title, category, and description without making a live API call. " +
        "Use cosevi_list_known_dashboards to see all available keys and GUIDs.",
      inputSchema: { keyOrGuid: keyOrGuidField },
      handler: async (input) => {
        const result = client.getKnownDashboard(input.keyOrGuid as string);
        return toTextContent(result ?? { found: false, keyOrGuid: input.keyOrGuid });
      },
    },
    {
      name: "cosevi_get_known_dashboard_data",
      description:
        "Fetch live dashboard data from COSEVI for a known dashboard identified by key or GUID. " +
        "This is the simplest way to retrieve data for the main COSEVI thematic dashboards " +
        "(fatalities, accidents, infractions, licenses, driving tests) without needing to know the exact GUID. " +
        "For named shortcuts with richer descriptions, use the domain tools like cosevi_get_fatalities_dashboard.",
      inputSchema: { keyOrGuid: keyOrGuidField },
      handler: async (input) => {
        try {
          return toTextContent(await client.getKnownDashboardData(input.keyOrGuid as string));
        } catch (error) {
          return toErrorContent(error);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Discovery helper
    // -------------------------------------------------------------------------
    {
      name: "cosevi_discover_resources_by_topic",
      description:
        "Search the COSEVI catalog by topic keyword — the simplest way to start exploring what data exists. " +
        "Use this when you have a topic in mind (e.g. 'fallecidos', 'infracciones', 'motocicletas') " +
        "but don't know the specific dataset or datastream GUID yet. " +
        "This is a convenience wrapper around cosevi_search_resources with query-only input. " +
        "Use cosevi_search_resources directly when you also need to filter by type or category.",
      inputSchema: {
        topic: safeString.describe(
          "Search keyword in Spanish or English. Examples: 'fallecidos', 'accidentes de tránsito', " +
          "'infracciones', 'licencias de conducir', 'pruebas teóricas'."
        ),
        resources: z.array(resourceTypes).optional().describe(
          "Optionally limit to specific resource types. Use [\"ds\"] to find only queryable datastreams."
        ),
        limit: limitField(),
        offset: offsetField,
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

    // -------------------------------------------------------------------------
    // Pagination helpers
    // -------------------------------------------------------------------------
    {
      name: "cosevi_get_resource_pages",
      description:
        "Fetch multiple pages of COSEVI catalog resources in a single call. " +
        "Use this when you need more results than a single request returns and want to collect " +
        "them in one step. Hard caps: maxPages ≤ 5, pageSize ≤ 100. " +
        "Returns all pages as an array with a pageCount summary.",
      inputSchema: {
        query: queryField,
        resources: z.array(resourceTypes).optional().describe(
          "Limit to specific resource types. Use [\"ds\"] for datastreams only."
        ),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20).describe(
          `Rows per page (1–${MAX_PAGE_SIZE}, default 20). Capped at ${MAX_PAGE_SIZE}.`
        ),
        maxPages: z.number().int().min(1).max(MAX_PAGES).default(2).describe(
          `Maximum pages to fetch (1–${MAX_PAGES}, default 2). Stops early if fewer results exist.`
        ),
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
      description:
        "Fetch multiple pages of rows from a COSEVI datastream in a single call. " +
        "Use this when a datastream has more rows than the single-request limit and you want " +
        "to collect several pages at once for analysis. Hard caps: maxPages ≤ 5, pageSize ≤ 100. " +
        "Only supports JSON formats (pjson, json, ajson) — use cosevi_get_datastream_raw for CSV/XML.",
      inputSchema: {
        guid: guidField,
        format: z.enum(["json", "pjson", "ajson"]).default("pjson").describe(
          "JSON-only format. pjson (default) returns an array of row objects. " +
          "json/ajson are alternative Junar JSON response shapes."
        ),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(20).describe(
          `Rows per page (1–${MAX_PAGE_SIZE}, default 20). Capped at ${MAX_PAGE_SIZE}.`
        ),
        maxPages: z.number().int().min(1).max(MAX_PAGES).default(2).describe(
          `Maximum pages to fetch (1–${MAX_PAGES}, default 2). Stops early if the last page has fewer rows than pageSize.`
        ),
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

  // -------------------------------------------------------------------------
  // Domain shortcut tools (one per known COSEVI dashboard)
  // -------------------------------------------------------------------------
  const domainToolDefinitions = Object.entries(DOMAIN_TOOL_GUIDS).map(([name, guid]) => ({
    name,
    description: DOMAIN_TOOL_DESCRIPTIONS[name] ?? `Fetch the COSEVI dashboard with GUID ${guid}.`,
    inputSchema: { includeResources: includeResourcesField },
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

/** Describes registered tool names. */
export function describeRegisteredToolNames(client: CoseviClient): string {
  return safeJsonText(getCoseviToolDefinitions(client).map((definition) => definition.name));
}
