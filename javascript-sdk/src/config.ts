import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";
import { resolve } from "node:path";
import { parse as dotenvParse } from "dotenv";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Default Junar/COSEVI API v2 base URL. */
export const DEFAULT_COSEVI_BASE_URL = "https://cosevi.cloudapi.junar.com/api/v2";

/** Default HTTP Referer header value sent with every request. */
export const DEFAULT_COSEVI_REFERER = "https://datosabiertos.csv.go.cr/";

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------

/** Optional inputs that override config resolution. */
export interface CoseviConfigInput {
  /** Explicit API key — wins over .env and OS environment. */
  apiKey?: string;
  /** Explicit base URL override. */
  baseUrl?: string;
  /** Explicit Referer header value. */
  referer?: string;
  /** Path to the .env file to read. Defaults to `<cwd>/.env`. */
  envPath?: string;
}

/** Fully resolved configuration with source metadata. */
export interface CoseviResolvedConfig {
  /** Resolved API key, or undefined if missing. */
  apiKey?: string;
  /** Resolved base URL (always set). */
  baseUrl: string;
  /** Resolved Referer header value. */
  referer?: string;
  /** Metadata describing where each value came from. */
  source: {
    /** Where the API key was resolved from. */
    apiKey: "constructor" | ".env" | "environment" | "missing";
    /** Where the base URL was resolved from. */
    baseUrl: "constructor" | ".env" | "environment" | "default";
    /** Where the Referer was resolved from. */
    referer: "constructor" | ".env" | "environment" | "default" | "missing";
    /** Operating-system platform string. */
    os: NodeJS.Platform;
  };
}

// -----------------------------------------------------------------------------
// Dotenv parsing
// -----------------------------------------------------------------------------

/**
 * Reads and parses a .env file into a key/value map without mutating
 * `process.env`. Returns an empty object if the file does not exist or
 * cannot be parsed.
 */
function readDotenvValues(envPath: string): Record<string, string> {
  if (!existsSync(envPath)) return {};
  try {
    return dotenvParse(readFileSync(envPath));
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// Config resolution
// -----------------------------------------------------------------------------

/**
 * Resolves the full COSEVI configuration using explicit precedence:
 *   1. Explicit constructor/input value
 *   2. Local `.env` file (read directly, never merged into `process.env`)
 *   3. OS environment variable (`process.env`)
 *   4. Compiled default / "missing"
 *
 * The `.env` file is parsed with `dotenv/parse` and NOT loaded into
 * `process.env`, so OS env vars are never silently overwritten.
 */
export function loadCoseviConfig(input: CoseviConfigInput = {}): CoseviResolvedConfig {
  const envPath = input.envPath ?? resolve(process.cwd(), ".env");
  const dotenvValues = readDotenvValues(envPath);

  const finalApiKey = input.apiKey ?? dotenvValues.COSEVI_AUTH_KEY ?? process.env.COSEVI_AUTH_KEY;
  const finalBaseUrl = input.baseUrl ?? dotenvValues.COSEVI_BASE_URL ?? process.env.COSEVI_BASE_URL ?? DEFAULT_COSEVI_BASE_URL;
  const finalReferer = input.referer ?? dotenvValues.COSEVI_REFERER ?? process.env.COSEVI_REFERER ?? DEFAULT_COSEVI_REFERER;

  return {
    apiKey: finalApiKey,
    baseUrl: finalBaseUrl,
    referer: finalReferer,
    source: {
      apiKey: input.apiKey ? "constructor" : dotenvValues.COSEVI_AUTH_KEY ? ".env" : process.env.COSEVI_AUTH_KEY ? "environment" : "missing",
      baseUrl: input.baseUrl ? "constructor" : dotenvValues.COSEVI_BASE_URL ? ".env" : process.env.COSEVI_BASE_URL ? "environment" : "default",
      referer: input.referer ? "constructor" : dotenvValues.COSEVI_REFERER ? ".env" : process.env.COSEVI_REFERER ? "environment" : "default",
      os: platform(),
    },
  };
}
