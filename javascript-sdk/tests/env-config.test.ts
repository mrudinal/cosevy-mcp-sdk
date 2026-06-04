import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CoseviClient, DEFAULT_COSEVI_BASE_URL, loadCoseviConfig } from "../src/index.js";

const ENV_KEYS = ["COSEVI_AUTH_KEY", "COSEVI_BASE_URL", "COSEVI_REFERER"] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function resetEnv() {
  for (const key of ENV_KEYS) {
    if (ORIGINAL_ENV[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = ORIGINAL_ENV[key];
    }
  }
}

afterEach(() => {
  resetEnv();
});

describe("loadCoseviConfig", () => {
  it("constructor value wins", () => {
    process.env.COSEVI_AUTH_KEY = "env-secret";
    const dir = mkdtempSync(join(tmpdir(), "cosevi-js-env-"));
    const envPath = join(dir, ".env");
    writeFileSync(envPath, "COSEVI_AUTH_KEY=dotenv-secret\nCOSEVI_BASE_URL=https://dotenv.example/api\n");

    try {
      const config = loadCoseviConfig({
        apiKey: "constructor-secret",
        baseUrl: "https://constructor.example/api",
        referer: "https://constructor.example/",
        envPath,
      });
      expect(config.apiKey).toBe("constructor-secret");
      expect(config.baseUrl).toBe("https://constructor.example/api");
      expect(config.source.apiKey).toBe("constructor");
      expect(JSON.stringify(config.source)).not.toContain("constructor-secret");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads dotenv values when present", () => {
    delete process.env.COSEVI_AUTH_KEY;
    delete process.env.COSEVI_BASE_URL;
    delete process.env.COSEVI_REFERER;
    const dir = mkdtempSync(join(tmpdir(), "cosevi-js-dotenv-"));
    const envPath = join(dir, ".env");
    writeFileSync(
      envPath,
      "COSEVI_AUTH_KEY=dotenv-secret\nCOSEVI_BASE_URL=https://dotenv.example/api\nCOSEVI_REFERER=https://dotenv.example/\n"
    );

    try {
      const config = loadCoseviConfig({ envPath });
      expect(config.apiKey).toBe("dotenv-secret");
      expect(config.baseUrl).toBe("https://dotenv.example/api");
      expect(config.referer).toBe("https://dotenv.example/");
      expect(config.source.apiKey).toBe(".env");
      expect(config.source.baseUrl).toBe(".env");
      expect(config.source.referer).toBe(".env");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to process environment and defaults", () => {
    process.env.COSEVI_AUTH_KEY = "env-secret";
    delete process.env.COSEVI_BASE_URL;
    delete process.env.COSEVI_REFERER;
    const config = loadCoseviConfig({ envPath: join(tmpdir(), "missing-cosevi.env") });
    expect(config.apiKey).toBe("env-secret");
    expect(config.baseUrl).toBe(DEFAULT_COSEVI_BASE_URL);
    expect(config.source.apiKey).toBe("environment");
    expect(config.source.baseUrl).toBe("default");
    expect(["win32", "linux", "darwin"]).toContain(config.source.os);
  });

  it("is surfaced through CoseviClient without exposing the secret", () => {
    process.env.COSEVI_AUTH_KEY = "env-secret";
    const client = new CoseviClient({ envPath: join(tmpdir(), "missing-cosevi.env") });
    expect(client.getResolvedConfigSource()).toMatchObject({ apiKey: "environment" });
    expect(JSON.stringify(client.getResolvedConfigSource())).not.toContain("env-secret");
  });

  it("CoseviClient.fromEnv creates a client from resolved environment configuration", () => {
    process.env.COSEVI_AUTH_KEY = "js-fromenv-secret";
    process.env.COSEVI_BASE_URL = "https://example.test/api/v2";
    process.env.COSEVI_REFERER = "https://example.test/";

    expect(CoseviClient.fromEnv).toBeTypeOf("function");

    const client = CoseviClient.fromEnv();

    expect(client).toBeInstanceOf(CoseviClient);
    expect(client.getSanitizedConfig()).toEqual({
      hasApiKey: true,
      baseUrl: "https://example.test/api/v2",
      hasReferer: true,
    });
    expect(client.getResolvedConfigSource()).toMatchObject({
      apiKey: "environment",
      baseUrl: "environment",
      referer: "environment",
    });
    expect(JSON.stringify(client.getSanitizedConfig())).not.toContain("js-fromenv-secret");
  });

  /** Verifies that a local .env value wins over a pre-existing OS environment variable. */
  it(".env value wins over OS environment variable", () => {
    // Set OS env var
    process.env.COSEVI_AUTH_KEY = "os-secret";
    const dir = mkdtempSync(join(tmpdir(), "cosevi-js-precedence-"));
    const envPath = join(dir, ".env");
    // .env has a DIFFERENT value
    writeFileSync(envPath, "COSEVI_AUTH_KEY=dotenv-secret\n");

    try {
      const config = loadCoseviConfig({ envPath });
      // .env must win over OS env
      expect(config.apiKey).toBe("dotenv-secret");
      expect(config.source.apiKey).toBe(".env");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
