import { CoseviApiError, CoseviAuthError, CoseviConfigError, CoseviRateLimitError } from "./errors.js";
import { loadCoseviConfig } from "./config.js";
import type {
  ApplyFormat,
  CoseviClientOptions,
  DatastreamFormat,
  DatastreamQueryInput,
  DatastreamRawInput,
  ListOptions,
  PortalStatsInput,
  ResourceType,
  SearchResourcesInput,
} from "./types.js";
import { getKnownDashboard, listKnownDashboards, KNOWN_COSEVI_DASHBOARDS } from "./known-dashboards.js";
import type { KnownCoseviDashboard } from "./known-dashboards.js";

// -----------------------------------------------------------------------------
// Constants and validation
// -----------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://cosevi.cloudapi.junar.com/api/v2";
const DEFAULT_REFERER = "https://datosabiertos.csv.go.cr/";
const MAX_LIMIT = 500;
const MAX_EXPRESSION_LENGTH = 256;
const MAX_ARRAY_LENGTH = 10;

const ALLOWED_FORMATS = new Set<DatastreamFormat>(["json", "pjson", "ajson", "jsonp", "csv", "xml", "xls"]);
const TEXT_FORMATS = new Set<DatastreamFormat>(["csv", "xml", "jsonp"]);
const RESERVED_KEY_PATTERNS = [
  /^auth_key$/,
  /^limit$/,
  /^offset$/,
  /^page$/,
  /^where$/,
  /^applyFormat$/,
  /^format$/,
  /^filter\d+$/,
  /^orderBy\d+$/,
  /^groupBy\d+$/,
  /^function\d+$/,
  /^pArgument\d+$/,
];

/** Returns true if the given key matches a reserved Junar query parameter pattern. */
function isReservedKey(key: string): boolean {
  return RESERVED_KEY_PATTERNS.some(p => p.test(key));
}

/** Validates a single filter/where/orderBy expression for length and unsafe characters. */
function validateExpression(value: string, label: string): void {
  if (value.length === 0) throw new CoseviConfigError(`${label}: empty string not allowed`);
  if (value.includes(";")) throw new CoseviConfigError(`${label}: semicolons not allowed`);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(value)) throw new CoseviConfigError(`${label}: control characters not allowed`);
  if (value.length > MAX_EXPRESSION_LENGTH) throw new CoseviConfigError(`${label}: expression too long (max ${MAX_EXPRESSION_LENGTH})`);
}

/** Validates an array of filter/sort/group expressions and enforces the max-array length cap. */
function validateArray(arr: string[], label: string): void {
  if (arr.length > MAX_ARRAY_LENGTH) throw new CoseviConfigError(`${label}: too many values (max ${MAX_ARRAY_LENGTH})`);
  arr.forEach((v, i) => validateExpression(v, `${label}[${i}]`));
}

/** Removes the `auth_key` query parameter from a URL so it is safe to log or include in error messages. */
function stripAuthKey(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("auth_key");
    return u.toString();
  } catch {
    return url.replace(/([&?])auth_key=[^&]*/g, "$1auth_key=REDACTED");
  }
}

/** Maps a datastream format (or "html") to the appropriate HTTP Accept header value. */
function acceptHeaderForFormat(format: DatastreamFormat | "html"): string {
  switch (format) {
    case "json": case "pjson": case "ajson": return "application/json";
    case "csv": return "text/csv";
    case "xml": return "application/xml, text/xml";
    case "xls": return "application/json, application/vnd.ms-excel, */*";
    case "jsonp": return "text/javascript, application/javascript, text/plain";
    case "html": return "text/html";
    default: return "application/json";
  }
}

/** Returns a promise that resolves after `ms` milliseconds. Used for retry delays. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// CoseviClient class
// -----------------------------------------------------------------------------

/**
 * Read-only client for the COSEVI / Junar v2 open-data API.
 *
 * Handles authentication, rate limiting, automatic retries, and safe URL
 * redaction. All methods are read-only GET requests.
 */
export class CoseviClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly referer?: string;
  private readonly timeoutMs: number;
  private readonly maxRequestsPerSecond: number;
  private readonly retryOnRateLimit: boolean;
  private readonly retryDelayMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly configSource: ReturnType<typeof loadCoseviConfig>["source"];

  // Simple token bucket for rate limiting
  private requestTimestamps: number[] = [];

  /**
   * Creates a new `CoseviClient`.
   * Reads `COSEVI_AUTH_KEY`, `COSEVI_BASE_URL`, and `COSEVI_REFERER` with
   * the precedence: constructor option > `.env` file > OS environment variable.
   * Throws `CoseviConfigError` if no API key can be resolved.
   */
  constructor(options: CoseviClientOptions = {}) {
    const resolved = loadCoseviConfig({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      referer: options.referer,
      envPath: (options as { envPath?: string }).envPath,
    });
    const key = resolved.apiKey ?? "";
    if (!key) throw new CoseviConfigError("COSEVI_AUTH_KEY is required (pass apiKey option or set env var)");
    this.apiKey = key;
    this.baseUrl = resolved.baseUrl.replace(/\/$/, "");
    this.referer = resolved.referer ?? DEFAULT_REFERER;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRequestsPerSecond = options.maxRequestsPerSecond ?? 4;
    this.retryOnRateLimit = options.retryOnRateLimit ?? true;
    this.retryDelayMs = options.retryDelayMs ?? 1200;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.configSource = resolved.source;
  }

  /** Creates a new `CoseviClient` reading all configuration from the environment. */
  static fromEnv(): CoseviClient {
    return new CoseviClient();
  }

  /** Returns sanitized config metadata safe to log: booleans for secrets, plain string for baseUrl. */
  getSanitizedConfig(): { hasApiKey: boolean; baseUrl: string; hasReferer: boolean } {
    return {
      hasApiKey: this.apiKey.length > 0,
      baseUrl: this.baseUrl,
      hasReferer: Boolean(this.referer),
    };
  }

  /** Returns the source metadata (where each config value came from) without exposing secrets. */
  getResolvedConfigSource(): typeof this.configSource {
    return this.configSource;
  }

  // -----------------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------------

  /** Enforces the per-second request rate using a sliding token-bucket window. */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const windowMs = 1000;
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < windowMs);
    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldest = this.requestTimestamps[0];
      const waitMs = windowMs - (now - oldest) + 10;
      if (waitMs > 0) await sleep(waitMs);
    }
    this.requestTimestamps.push(Date.now());
  }

  // -----------------------------------------------------------------------------
  // Core HTTP
  // -----------------------------------------------------------------------------

  /** Appends the `auth_key` to the given params and returns them. */
  private buildParams(extra: URLSearchParams): URLSearchParams {
    extra.set("auth_key", this.apiKey);
    return extra;
  }

  /**
   * Executes a throttled HTTP GET request. Handles 429/5xx retries,
   * 401/403 auth errors, and strips `auth_key` from error URLs.
   */
  private async request(path: string, params: URLSearchParams, accept: string, attempt = 0): Promise<Response> {
    await this.throttle();
    const fullParams = this.buildParams(params);
    const url = `${this.baseUrl}${path}?${fullParams.toString()}`;
    const headers: Record<string, string> = { Accept: accept };
    if (this.referer) headers["Referer"] = this.referer;

    let response: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        response = await this.fetchImpl(url, { headers, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      throw new CoseviApiError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        undefined, undefined, stripAuthKey(url)
      );
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader ? parseFloat(retryAfterHeader) : undefined;
      if (this.retryOnRateLimit && attempt < this.maxRetries) {
        const delayMs = retryAfterSeconds ? retryAfterSeconds * 1000 : this.retryDelayMs;
        await sleep(delayMs);
        return this.request(path, new URLSearchParams(params), accept, attempt + 1);
      }
      throw new CoseviRateLimitError(
        "COSEVI/Junar rate limit exceeded",
        429, await response.text().catch(() => ""), stripAuthKey(url), retryAfterSeconds
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new CoseviAuthError(
        "COSEVI/Junar authentication failed",
        response.status, await response.text().catch(() => ""), stripAuthKey(url)
      );
    }

    // Retry on 5xx for GET requests
    if (response.status >= 500 && attempt < this.maxRetries) {
      await sleep(this.retryDelayMs);
      return this.request(path, new URLSearchParams(params), accept, attempt + 1);
    }

    if (!response.ok) {
      throw new CoseviApiError(
        `COSEVI/Junar API error: HTTP ${response.status}`,
        response.status, await response.text().catch(() => ""), stripAuthKey(url)
      );
    }

    return response;
  }

  /** Issues a GET request and parses the response as JSON. */
  private async getJson(path: string, params: URLSearchParams, format: DatastreamFormat = "json"): Promise<unknown> {
    const response = await this.request(path, params, acceptHeaderForFormat(format));
    return response.json();
  }

  /** Issues a GET request and returns the response body as a string. */
  private async getText(path: string, params: URLSearchParams, format: DatastreamFormat | "html" = "csv"): Promise<string> {
    const response = await this.request(path, params, acceptHeaderForFormat(format));
    return response.text();
  }

  // -----------------------------------------------------------------------------
  // Shared query builder
  // -----------------------------------------------------------------------------

  /** Converts SDK input options into Junar-compatible `URLSearchParams`. */
  private buildDatastreamParams(options: DatastreamQueryInput | DatastreamRawInput): URLSearchParams {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(this.safeLimit(options.limit)));
    if (options.page !== undefined) params.set("page", String(options.page));
    if ("offset" in options && options.offset !== undefined) params.set("offset", String(options.offset));
    if (options.where) {
      validateExpression(options.where, "where");
      params.set("where", options.where);
    }
    if (options.applyFormat !== undefined) params.set("applyFormat", String(options.applyFormat));
    if (options.formatConfig !== undefined) params.set("format", JSON.stringify(options.formatConfig));

    // pArgumentN
    if (options.parameters?.length) {
      options.parameters.forEach((v, i) => params.set(`pArgument${i}`, String(v)));
    }

    // filters
    if (options.filters?.length) {
      validateArray(options.filters, "filters");
      options.filters.forEach((v, i) => params.set(`filter${i}`, v));
    }

    // orderBy
    if (options.orderBy?.length) {
      validateArray(options.orderBy, "orderBy");
      options.orderBy.forEach((v, i) => params.set(`orderBy${i}`, v));
    }

    // groupBy
    if (options.groupBy?.length) {
      validateArray(options.groupBy, "groupBy");
      options.groupBy.forEach((v, i) => params.set(`groupBy${i}`, v));
    }

    // functions
    if (options.functions?.length) {
      validateArray(options.functions, "functions");
      options.functions.forEach((v, i) => params.set(`function${i}`, v));
    }

    // extraParams
    if ("extraParams" in options && options.extraParams) {
      for (const [key, value] of Object.entries(options.extraParams)) {
        if (isReservedKey(key)) throw new CoseviConfigError(`extraParams contains reserved key: ${key}`);
        if (value !== undefined) params.set(key, String(value));
      }
    }

    return params;
  }

  /** Clamps a limit value to the allowed range [1, MAX_LIMIT]. Throws if less than 1. */
  private safeLimit(limit: number): number {
    if (limit < 1) throw new CoseviConfigError("limit must be >= 1");
    return Math.min(limit, MAX_LIMIT);
  }

  // -----------------------------------------------------------------------------
  // Catalog search
  // -----------------------------------------------------------------------------

  /** Searches the COSEVI open data catalog by keyword, resource type, and category. */
  async searchResources(input: SearchResourcesInput = {}): Promise<unknown> {
    const params = new URLSearchParams();
    params.set("limit", String(this.safeLimit(input.limit ?? 20)));
    params.set("offset", String(input.offset ?? 0));
    if (input.query) params.set("query", input.query);
    if (input.order) params.set("order", input.order);
    if (input.categories?.length) params.set("categories", input.categories.join(","));
    if (input.resources?.length) params.set("resources", input.resources.join(","));
    return this.getJson("/resources.json", params);
  }

  // -----------------------------------------------------------------------------
  // Dataset methods
  // -----------------------------------------------------------------------------

  /** Lists datasets in the COSEVI catalog with optional filtering. */
  async listDatasets(options: ListOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    params.set("limit", String(this.safeLimit(options.limit ?? 20)));
    params.set("offset", String(options.offset ?? 0));
    if (options.query) params.set("query", options.query);
    if (options.order) params.set("order", options.order);
    if (options.categories?.length) params.set("categories", options.categories.join(","));
    return this.getJson("/datasets.json", params);
  }

  /** Fetches a single dataset by its Junar GUID. */
  async getDataset(guid: string): Promise<unknown> {
    if (!guid) throw new CoseviConfigError("guid is required");
    return this.getJson(`/datasets/${encodeURIComponent(guid)}.json`, new URLSearchParams());
  }

  // -----------------------------------------------------------------------------
  // Datastream metadata
  // -----------------------------------------------------------------------------

  /** Lists datastream metadata entries in the COSEVI catalog with optional filtering. */
  async listDatastreams(options: ListOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    params.set("limit", String(this.safeLimit(options.limit ?? 20)));
    params.set("offset", String(options.offset ?? 0));
    if (options.query) params.set("query", options.query);
    if (options.order) params.set("order", options.order);
    if (options.categories?.length) params.set("categories", options.categories.join(","));
    return this.getJson("/datastreams.json", params);
  }

  /** Fetches metadata for a single datastream by its Junar GUID. */
  async getDatastream(guid: string): Promise<unknown> {
    if (!guid) throw new CoseviConfigError("guid is required");
    return this.getJson(`/datastreams/${encodeURIComponent(guid)}.json`, new URLSearchParams());
  }

  // -----------------------------------------------------------------------------
  // Datastream data
  // -----------------------------------------------------------------------------

  /** Fetches rows from a COSEVI datastream. Supports parameters, filters, sorting, grouping, and format options. */
  async getDatastreamData<T = unknown>(guid: string, options: DatastreamQueryInput = {}): Promise<T | string> {
    if (!guid) throw new CoseviConfigError("guid is required");
    const format = options.format ?? "pjson";
    if (!ALLOWED_FORMATS.has(format)) throw new CoseviConfigError(`Invalid format: ${format}`);
    const params = this.buildDatastreamParams(options);
    const path = `/datastreams/${encodeURIComponent(guid)}/data.${format}`;
    if (TEXT_FORMATS.has(format)) {
      return this.getText(path, params, format) as Promise<T | string>;
    }
    // xls: try JSON, fall back to text
    if (format === "xls") {
      const text = await this.getText(path, params, format);
      try { return JSON.parse(text) as T; } catch { return text; }
    }
    return this.getJson(path, params, format) as Promise<T | string>;
  }

  /** Fetches raw text (CSV, XML, JSONP) from a COSEVI datastream. */
  async getDatastreamRawText(guid: string, options: DatastreamRawInput = {}): Promise<string> {
    if (!guid) throw new CoseviConfigError("guid is required");
    const format = options.format ?? "csv";
    const params = this.buildDatastreamParams(options);
    const path = `/datastreams/${encodeURIComponent(guid)}/data.${format}`;
    return this.getText(path, params, format);
  }

  /** Fetches the Tableau HTML embed for a COSEVI datastream. */
  async getDatastreamTableau(guid: string, options: { parameters?: Array<string | number | boolean> } = {}): Promise<string> {
    if (!guid) throw new CoseviConfigError("guid is required");
    const params = new URLSearchParams();
    if (options.parameters?.length) {
      options.parameters.forEach((v, i) => params.set(`pArgument${i}`, String(v)));
    }
    return this.getText(`/datastreams/${encodeURIComponent(guid)}/tableau.html`, params, "html");
  }

  // -----------------------------------------------------------------------------
  // Visualization methods
  // -----------------------------------------------------------------------------

  /** Lists visualization metadata entries in the COSEVI catalog with optional filtering. */
  async listVisualizations(options: ListOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    params.set("limit", String(this.safeLimit(options.limit ?? 20)));
    params.set("offset", String(options.offset ?? 0));
    if (options.query) params.set("query", options.query);
    if (options.order) params.set("order", options.order);
    if (options.categories?.length) params.set("categories", options.categories.join(","));
    return this.getJson("/visualizations.json", params);
  }

  /** Fetches metadata for a single visualization by its Junar GUID. */
  async getVisualization(guid: string): Promise<unknown> {
    if (!guid) throw new CoseviConfigError("guid is required");
    return this.getJson(`/visualizations/${encodeURIComponent(guid)}.json`, new URLSearchParams());
  }

  // -----------------------------------------------------------------------------
  // Dashboard methods
  // -----------------------------------------------------------------------------

  /** Lists dashboard metadata entries in the COSEVI catalog with optional filtering. */
  async listDashboards(options: ListOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    params.set("limit", String(this.safeLimit(options.limit ?? 20)));
    params.set("offset", String(options.offset ?? 0));
    if (options.query) params.set("query", options.query);
    if (options.order) params.set("order", options.order);
    if (options.categories?.length) params.set("categories", options.categories.join(","));
    return this.getJson("/dashboards.json", params);
  }

  /** Fetches metadata for a single dashboard by its Junar GUID. */
  async getDashboard(guid: string): Promise<unknown> {
    if (!guid) throw new CoseviConfigError("guid is required");
    return this.getJson(`/dashboards/${encodeURIComponent(guid)}.json`, new URLSearchParams());
  }

  /**
   * Extracts resource items (datasets, datastreams, visualizations) from a Junar dashboard response.
   * Optionally filters by resource type.
   */
  extractDashboardResources(dashboard: unknown, options: { resourceTypes?: Array<"dt" | "ds" | "vz" | "db" | "html"> } = {}): unknown[] {
    if (!dashboard || typeof dashboard !== "object") return [];
    const d = dashboard as Record<string, unknown>;
    const resources: unknown[] = [];
    const collect = (val: unknown) => {
      if (Array.isArray(val)) {
        for (const item of val) {
          const t = (item as Record<string, unknown>)?.type as string | undefined;
          if (!options.resourceTypes || !t || options.resourceTypes.includes(t as "dt")) {
            resources.push(item);
          }
        }
      }
    };
    // Common Junar dashboard shapes
    for (const key of ["resources", "components", "items", "datasets", "datastreams", "visualizations"]) {
      if (Array.isArray(d[key])) collect(d[key]);
    }
    return resources;
  }

  // -----------------------------------------------------------------------------
  // Portal stats
  // -----------------------------------------------------------------------------

  /** Fetches portal usage statistics from the Junar `/stats/` endpoint. */
  async getPortalStats(options: PortalStatsInput = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (options.days !== undefined) params.set("days", String(options.days));
    if (options.hours !== undefined) params.set("hours", String(options.hours));
    if (options.minutes !== undefined) params.set("minutes", String(options.minutes));
    if (options.from) params.set("from", options.from);
    if (options.to) params.set("to", options.to);
    if (options.channel !== undefined) params.set("channel", String(options.channel));
    if (options.facets) params.set("facets", options.facets);
    if (options.limit !== undefined) params.set("limit", String(this.safeLimit(options.limit)));
    if (options.groupBy) params.set("group_by", options.groupBy);
    if (options.order) params.set("order", options.order);
    return this.getJson("/stats/", params);
  }

  // -----------------------------------------------------------------------------
  // Known dashboard helpers
  // -----------------------------------------------------------------------------

  /** Returns all known dashboards, optionally filtered by category. Delegates to the standalone helper. */
  listKnownDashboards(category?: string): KnownCoseviDashboard[] {
    return listKnownDashboards(category);
  }

  /** Looks up a known dashboard by key or GUID. Returns undefined if not found. */
  getKnownDashboard(keyOrGuid: string): KnownCoseviDashboard | undefined {
    return getKnownDashboard(keyOrGuid);
  }

  /** Resolves a known dashboard by key/GUID and fetches its data from the API. */
  async getKnownDashboardData(keyOrGuid: string): Promise<unknown> {
    const entry = getKnownDashboard(keyOrGuid);
    if (!entry) throw new CoseviConfigError(`Unknown dashboard key or GUID: ${keyOrGuid}`);
    return this.getDashboard(entry.guid);
  }

  // -----------------------------------------------------------------------------
  // Pagination helpers
  // -----------------------------------------------------------------------------

  /**
   * Discovers COSEVI resources matching a topic string.
   * Delegates to `searchResources` with the topic as the query.
   */
  async discoverResourcesByTopic(
    topic: string,
    options: { limit?: number; offset?: number; resources?: ResourceType[] } = {}
  ): Promise<unknown> {
    return this.searchResources({
      query: topic,
      limit: options.limit,
      offset: options.offset,
      resources: options.resources,
    });
  }

  /**
   * Async generator that pages through catalog search results.
   * Hard-capped at 5 pages and 100 items per page.
   */
  async *iterateResources(options: SearchResourcesInput & { maxPages?: number; pageSize?: number } = {}): AsyncGenerator<unknown> {
    const maxPages = Math.min(options.maxPages ?? 5, 5);
    const pageSize = Math.min(options.pageSize ?? 100, 100);
    for (let page = 0; page < maxPages; page++) {
      const result = await this.searchResources({ ...options, limit: pageSize, offset: page * pageSize });
      yield result;
      // If result has fewer items than pageSize, we're done
      const items = Array.isArray((result as Record<string, unknown>)?.result)
        ? ((result as Record<string, unknown>).result as unknown[])
        : Array.isArray(result) ? result : [];
      if (items.length < pageSize) break;
    }
  }

  /**
   * Async generator that pages through datastream rows.
   * Hard-capped at 5 pages and 100 items per page.
   */
  async *iterateDatastreamData(
    guid: string,
    options: DatastreamQueryInput & { maxPages?: number; pageSize?: number } = {}
  ): AsyncGenerator<unknown> {
    const maxPages = Math.min(options.maxPages ?? 5, 5);
    const pageSize = Math.min(options.pageSize ?? 100, 100);
    for (let page = 1; page <= maxPages; page++) {
      const result = await this.getDatastreamData(guid, { ...options, limit: pageSize, page });
      yield result;
      // If not an array or fewer items, stop
      if (!Array.isArray(result) || (result as unknown[]).length < pageSize) break;
    }
  }

  // -----------------------------------------------------------------------------
  // Static helpers
  // -----------------------------------------------------------------------------

  /**
   * Builds a Junar filter expression string.
   * Example: `buildFilter(0, "==", "San José")` → `"column0[==]San José"`
   */
  static buildFilter(column: number | string, operator: string, value: string | number): string {
    const allowed = new Set(["==", ">", "<", "!=", "contains", ">=", "<="]);
    if (!allowed.has(operator)) throw new CoseviConfigError(`Unsupported operator: ${operator}`);
    const operand = typeof column === "number" ? `column${column}` : column;
    return `${operand}[${operator}]${value}`;
  }
}
