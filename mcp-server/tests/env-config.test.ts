// This file tests MCP environment configuration behavior.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CoseviClient } from "cosevi-open-data";
import { registerCoseviTools } from "../src/tools.js";
import { createServerRecorder } from "./helpers.js";

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe("mcp env config behavior", () => {
  it("reports sanitized source metadata from the javascript sdk config loader", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "cosevi-mcp-env-"));
    const envPath = join(tempDir, ".env");
    writeFileSync(envPath, "COSEVI_AUTH_KEY=dotenv-secret\nCOSEVI_BASE_URL=https://dotenv.example/api\n");
    const client = new CoseviClient({ envPath });
    const server = createServerRecorder();

    registerCoseviTools(server, client as any);
    const result = await server.tools.get("cosevi_health_check")!.handler({ checkReachability: false });

    expect(result.content[0].text).toContain('"apiKeySource": ".env"');
    expect(result.content[0].text).toContain('"baseUrl": "https://dotenv.example/api"');
    expect(result.content[0].text).toContain('"os"');
    expect(result.content[0].text).not.toContain("dotenv-secret");
  });
});
