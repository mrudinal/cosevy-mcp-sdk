// This file tests MCP response formatting and redaction helpers.

import { describe, expect, it } from "vitest";
import { safeErrorText, safeJsonText, summarizeListResponse, toErrorContent, toRawTextContent, toTextContent } from "../src/format.js";

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe("safeJsonText", () => {
  it("redacts auth_key in objects", () => {
    const text = safeJsonText({ auth_key: "SECRET", data: "ok" });
    expect(text).toContain("[REDACTED]");
    expect(text).not.toContain("SECRET");
  });

  it("redacts apiKey in nested objects", () => {
    const text = safeJsonText({ nested: { apiKey: "tok", value: 1 } });
    expect(text).toContain("[REDACTED]");
    expect(text).not.toContain("tok");
  });

  it("truncates long output with message", () => {
    const text = safeJsonText({ value: "x".repeat(200) }, { maxChars: 50 });
    expect(text.length).toBeGreaterThan(50);
    expect(text).toContain("truncated");
  });

  it("returns full text when within limit", () => {
    const text = safeJsonText({ a: 1 }, { maxChars: 1000 });
    expect(text).toContain('"a": 1');
  });

  it("handles circular values safely", () => {
    const value: Record<string, unknown> = { name: "root" };
    value.self = value;
    const text = safeJsonText(value);
    expect(text).toContain("[Circular]");
  });
});

describe("safeErrorText", () => {
  it("redacts auth_key from error message", () => {
    const err = new Error("Request failed: https://example.com?auth_key=ACTUAL_KEY&limit=5");
    const text = safeErrorText(err);
    expect(text).toContain("auth_key=REDACTED");
    expect(text).not.toContain("ACTUAL_KEY");
  });

  it("includes HTTP status and safeUrl when present", () => {
    const err = Object.assign(new Error("bad"), {
      safeUrl: "https://example.test?auth_key=REDACTED",
      status: 500
    });
    const text = safeErrorText(err);
    expect(text).toContain("HTTP 500");
    expect(text).toContain("URL:");
  });

  it("handles non-Error values", () => {
    const text = safeErrorText("some auth_key=SECRET string");
    expect(text).toContain("auth_key=REDACTED");
    expect(text).not.toContain("SECRET");
  });

  it("redacts dummy secrets from messages", () => {
    const text = safeErrorText(new Error("boom DUMMY_SECRET auth_key=REAL"));
    expect(text).not.toContain("DUMMY_SECRET");
    expect(text).not.toContain("REAL");
  });
});

describe("summarizeListResponse", () => {
  it("returns total/showing/results structure from array", () => {
    const result = summarizeListResponse([{ id: 1 }, { id: 2 }, { id: 3 }], { maxResults: 2 });
    const parsed = JSON.parse(result);
    expect(parsed.showing).toBe(2);
    expect(parsed.results.length).toBe(2);
  });

  it("extracts from nested result object keys", () => {
    const result = summarizeListResponse({ total: 50, result: [{ a: 1 }] });
    const parsed = JSON.parse(result);
    expect(parsed.total).toBe(50);
    expect(parsed.results.length).toBe(1);
  });
});

describe("toRawTextContent", () => {
  it("returns text unchanged when within limit", () => {
    const result = toRawTextContent("short text");
    expect(result.content[0].text).toBe("short text");
  });

  it("truncates long text with message", () => {
    const long = "x".repeat(10000);
    const result = toRawTextContent(long, { maxChars: 100 });
    expect(result.content[0].text.length).toBeGreaterThan(100);
    expect(result.content[0].text).toContain("truncated");
  });
});

describe("content helpers", () => {
  it("toTextContent wraps safe text in MCP content format", () => {
    expect(toTextContent).toBeTypeOf("function");
    const result = toTextContent({ auth_key: "SECRET", value: "ok" });
    expect(result).toHaveProperty("content");
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain('"value": "ok"');
    expect(result.content[0].text).not.toContain("SECRET");
  });

  it("toErrorContent wraps safe error text in MCP error content format", () => {
    expect(toErrorContent).toBeTypeOf("function");
    const result = toErrorContent(new Error("boom DUMMY_SECRET auth_key=SECRET COSEVI_AUTH_KEY"));
    expect(result).toHaveProperty("content");
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error:");
    expect(result.content[0].text).not.toContain("DUMMY_SECRET");
    expect(result.content[0].text).not.toContain("SECRET");
    expect(result.content[0].text).not.toContain("COSEVI_AUTH_KEY");
  });
});
