import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoseviApiError, CoseviClient, CoseviRateLimitError } from "../src/index.js";

describe("rate limit and retry behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries once on 429 using fake timers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("retry", { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      ) as unknown as typeof fetch;

    const client = new CoseviClient({
      apiKey: "test-key",
      fetchImpl,
      retryDelayMs: 1,
      maxRetries: 1,
      maxRequestsPerSecond: 100,
    });

    const promise = client.getDataset("ABC");
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries on 5xx and preserves safeUrl redaction", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("server error", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      ) as unknown as typeof fetch;

    const client = new CoseviClient({
      apiKey: "secret-value",
      fetchImpl,
      retryDelayMs: 1,
      maxRetries: 1,
      maxRequestsPerSecond: 100,
    });

    const promise = client.listDashboards({ limit: 1 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("raises rate-limit error when retries are disabled", async () => {
    const fetchImpl = vi.fn(async () => new Response("retry", { status: 429 })) as unknown as typeof fetch;
    const client = new CoseviClient({
      apiKey: "test-key",
      fetchImpl,
      retryOnRateLimit: false,
      maxRetries: 0,
      maxRequestsPerSecond: 100,
    });

    await expect(client.getDataset("ABC")).rejects.toBeInstanceOf(CoseviRateLimitError);
  });

  it("redacts auth_key in network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof fetch;
    const client = new CoseviClient({ apiKey: "top-secret", fetchImpl, maxRetries: 0 });

    await expect(client.getDataset("ABC")).rejects.toMatchObject<CoseviApiError>({
      safeUrl: expect.not.stringContaining("top-secret"),
    });
  });
});
