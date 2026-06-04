export type ResourceType = "dt" | "ds" | "vz" | "db";
export type DatastreamFormat = "json" | "ajson" | "pjson" | "jsonp" | "csv" | "xml" | "xls";
export type ApplyFormat = -1 | 0 | 1;

export interface SearchResourcesInput {
  query?: string;
  limit?: number;
  offset?: number;
  order?: string;
  resources?: ResourceType[];
  categories?: string[];
}

export interface ListOptions {
  query?: string;
  categories?: string[];
  limit?: number;
  offset?: number;
  order?: string;
}

export interface DatastreamQueryInput {
  format?: DatastreamFormat;
  limit?: number;
  page?: number;
  offset?: number;
  parameters?: Array<string | number | boolean>;
  filters?: string[];
  where?: string;
  orderBy?: string[];
  groupBy?: string[];
  functions?: string[];
  applyFormat?: ApplyFormat;
  formatConfig?: unknown;
  extraParams?: Record<string, unknown>;
}

export interface DatastreamRawInput {
  format?: "csv" | "xml" | "jsonp";
  limit?: number;
  page?: number;
  offset?: number;
  parameters?: Array<string | number | boolean>;
  filters?: string[];
  where?: string;
  orderBy?: string[];
  groupBy?: string[];
  functions?: string[];
  applyFormat?: ApplyFormat;
  formatConfig?: unknown;
}

export interface PortalStatsInput {
  days?: number;
  hours?: number;
  minutes?: number;
  from?: string;
  to?: string;
  channel?: "API" | "WEB" | 0 | 1;
  facets?: string;
  limit?: number;
  groupBy?: string;
  order?: string;
}

export interface CoseviClientOptions {
  apiKey?: string;
  baseUrl?: string;
  referer?: string;
  envPath?: string;
  timeoutMs?: number;
  maxRequestsPerSecond?: number;
  retryOnRateLimit?: boolean;
  retryDelayMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}
