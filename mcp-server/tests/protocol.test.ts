// This file tests the MCP stdio protocol behavior end to end.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------
describe("mcp stdio protocol", () => {
  it("lists tools and calls safe tools over stdio without an llm", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "tests/fixtures/protocol-server.ts"],
      env: {
        ...process.env,
        COSEVI_AUTH_KEY: "DUMMY_SECRET",
      },
    });

    const client = new Client({ name: "cosevi-test-client", version: "0.0.0" });
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "cosevi_health_check")).toBe(true);
    expect(tools.tools.length).toBe(30);

    const health = await client.callTool({
      name: "cosevi_health_check",
      arguments: { checkReachability: false },
    });
    const known = await client.callTool({
      name: "cosevi_get_known_dashboard",
      arguments: { keyOrGuid: "fallecidos_en_sitio" },
    });

    expect(JSON.stringify(health)).not.toContain("DUMMY_SECRET");
    expect(JSON.stringify(known)).toContain("FALLE-EN-SITIO");

    await client.close();
  }, 15000);
});
