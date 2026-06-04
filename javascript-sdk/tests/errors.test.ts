import { describe, expect, it } from "vitest";
import { CoseviApiError, CoseviAuthError, CoseviConfigError, CoseviRateLimitError } from "../src/index.js";

describe("exported error classes", () => {
  it("creates config errors", () => {
    const error = new CoseviConfigError("bad config");
    expect(error.name).toBe("CoseviConfigError");
    expect(error.message).toBe("bad config");
  });

  it("creates API and auth errors with safe fields", () => {
    const apiError = new CoseviApiError("bad", 500, { ok: false }, "https://example.test?auth_key=REDACTED");
    const authError = new CoseviAuthError("unauthorized", 401, "nope", "https://example.test?auth_key=REDACTED");

    expect(apiError.status).toBe(500);
    expect(apiError.responseBody).toEqual({ ok: false });
    expect(apiError.safeUrl).toContain("REDACTED");
    expect(authError.name).toBe("CoseviAuthError");
  });

  it("creates rate limit errors with retry metadata", () => {
    const error = new CoseviRateLimitError("slow down", 429, "body", "https://example.test", 1.5);
    expect(error.name).toBe("CoseviRateLimitError");
    expect(error.retryAfterSeconds).toBe(1.5);
  });
});
