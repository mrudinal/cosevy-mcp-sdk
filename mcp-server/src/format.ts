// This file formats MCP responses, summaries, and safe error output.

// Constants
// -----------------------------------------------------------------------------

/** Keys whose values are always replaced with `[REDACTED]` in JSON output. */
const REDACT_KEYS = new Set(["auth_key", "authKey", "apiKey", "token", "secret"]);
const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_MAX_RESULTS = 20;

// -----------------------------------------------------------------------------
// Secret redaction
// -----------------------------------------------------------------------------

/** Recursively redacts sensitive keys and preserves circular-reference safety. */
function redactObject(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactObject(item, seen));
  const result: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
    result[entryKey] = REDACT_KEYS.has(entryKey) ? "[REDACTED]" : redactObject(entryValue, seen);
  }
  return result;
}

// -----------------------------------------------------------------------------
// JSON formatting
// -----------------------------------------------------------------------------

/**
 * Serializes a value to indented JSON, redacting secret keys and truncating
 * output at `maxChars` characters with an explanatory message.
 */
export function safeJsonText(
  value: unknown,
  options: { maxChars?: number; redactKeys?: string[] } = {}
): string {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const redacted = redactObject(value);
  let text: string;
  try {
    text = JSON.stringify(redacted, null, 2);
  } catch {
    text = String(redacted);
  }
  if (text.length > maxChars) {
    return text.slice(0, maxChars) + `\n\n[Response truncated to ${maxChars} characters. Use lower limit/page or a more specific query.]`;
  }
  return text;
}

// -----------------------------------------------------------------------------
// Error formatting
// -----------------------------------------------------------------------------

/**
 * Formats an error value into a human-readable string, redacting any
 * `auth_key=...` substrings and known dummy secret tokens.
 * Includes HTTP status and safe URL if the error carries them.
 */
export function safeErrorText(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
      .replace(/auth_key=[^&\s]*/gi, "auth_key=REDACTED")
      .replace(/COSEVI_AUTH_KEY/gi, "[REDACTED]")
      .replace(/DUMMY_SECRET/gi, "[REDACTED]");
    const safeUrl = (error as { safeUrl?: string }).safeUrl;
    const status = (error as { status?: number }).status;
    const parts = [msg];
    if (status) parts.push(`HTTP ${status}`);
    if (safeUrl) parts.push(`URL: ${safeUrl}`);
    return parts.join(" | ");
  }
  return String(error)
    .replace(/auth_key=[^&\s]*/gi, "auth_key=REDACTED")
    .replace(/COSEVI_AUTH_KEY/gi, "[REDACTED]")
    .replace(/DUMMY_SECRET/gi, "[REDACTED]");
}

// -----------------------------------------------------------------------------
// List summarization
// -----------------------------------------------------------------------------

/**
 * Extracts items from a Junar list response (which may be a bare array or
 * a `{ result: [...] }` object) and produces a `{ total, showing, results }`
 * summary JSON string.
 */
export function summarizeListResponse(
  value: unknown,
  options: { maxResults?: number; maxChars?: number } = {}
): string {
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  let items: unknown[] = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (value && typeof value === "object") {
    const listResponse = value as Record<string, unknown>;
    items = Array.isArray(listResponse.result) ? listResponse.result :
            Array.isArray(listResponse.objects) ? listResponse.objects :
            Array.isArray(listResponse.items) ? listResponse.items : [];
  }
  const total = (value as Record<string, unknown>)?.total ?? (value as Record<string, unknown>)?.count ?? items.length;
  const sliced = items.slice(0, maxResults);
  const summary = { total, showing: sliced.length, results: sliced };
  return safeJsonText(summary, { maxChars });
}

// -----------------------------------------------------------------------------
// Content helpers
// -----------------------------------------------------------------------------

/** Wraps JSON-safe text output in the standard MCP content envelope. */
export function toTextContent(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: safeJsonText(value) }] };
}

/** Wraps safe error text in the standard MCP content envelope. */
export function toErrorContent(error: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: `Error: ${safeErrorText(error)}` }] };
}

/**
 * Wraps a raw text string (CSV, XML, JSONP) in the standard MCP text content
 * envelope, truncating at `maxChars` if necessary.
 */
export function toRawTextContent(text: string, options: { maxChars?: number } = {}): { content: Array<{ type: "text"; text: string }> } {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  if (text.length > maxChars) {
    return {
      content: [{
        type: "text",
        text: text.slice(0, maxChars) + `\n\n[Response truncated to ${maxChars} characters. Use lower limit/page or a more specific query.]`
      }]
    };
  }
  return { content: [{ type: "text", text }] };
}
