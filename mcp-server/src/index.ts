// This file boots the COSEVI MCP server and wires in the registered tools.

// -----------------------------------------------------------------------------
// Server initialization
// -----------------------------------------------------------------------------

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { CoseviClient } from "cosevi-open-data";
import { registerCoseviTools } from "./tools.js";

// -----------------------------------------------------------------------------
// Client initialization
// -----------------------------------------------------------------------------

/**
 * Creates and returns a configured `McpServer` with all COSEVI tools registered.
 * Accepts an optional pre-built `CoseviClient` for testing.
 */
// -----------------------------------------------------------------------------
// Public exports
// -----------------------------------------------------------------------------
export function createCoseviMcpServer(client = new CoseviClient({
  maxRequestsPerSecond: parseInt(process.env.COSEVI_MAX_REQUESTS_PER_SECOND ?? "4", 10),
  retryDelayMs: parseInt(process.env.COSEVI_RETRY_DELAY_MS ?? "1200", 10),
  maxRetries: parseInt(process.env.COSEVI_MAX_RETRIES ?? "2", 10),
})) {
  const server = new McpServer({
    name: "cosevi-open-data-mcp",
    version: "0.1.0",
  });

  // -----------------------------------------------------------------------------
  // Tool registration
  // -----------------------------------------------------------------------------

  registerCoseviTools(server, client);
  return server;
}

// -----------------------------------------------------------------------------
// Transport
// -----------------------------------------------------------------------------

/** Starts the MCP server using the stdio transport for local process communication. */
export async function startStdioServer() {
  const server = createCoseviMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await startStdioServer();
}
