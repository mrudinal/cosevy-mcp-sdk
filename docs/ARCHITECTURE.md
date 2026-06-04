# Architecture

## Package dependency flow

```text
COSEVI / Junar API (read-only)
       ↑
JavaScript SDK (cosevi-open-data)     Python SDK (cosevi-open-data)
  typescript/node, httpx-free               stdlib httpx (sync)
       ↑
  MCP server (cosevi-open-data-mcp)
    wraps JS SDK; exposes MCP tools
       ↑
Claude Desktop / Claude Code / other MCP clients
```

## Three packages

| Package | Language | Entry | Transport |
|---|---|---|---|
| `javascript-sdk/` | TypeScript/Node | `src/index.ts` → `dist/index.js` | native fetch |
| `python-sdk/` | Python 3.10+ | `src/cosevi_open_data/__init__.py` | httpx (sync) |
| `mcp-server/` | TypeScript/Node | `src/index.ts` → `dist/index.js` | MCP stdio |

## Design rules

- All three layers are **read-only** — no POST, PUT, DELETE, or write operations
- The MCP server imports from `cosevi-open-data` (file: link) and adds no HTTP logic of its own
- The Python SDK is independent of the JS SDK
- Auth key (`COSEVI_AUTH_KEY`) is never logged, printed, or included in error messages — only in outgoing request URLs which are immediately stripped for safe error reporting
- Rate limiting: token bucket (4 req/s default), 429 and 5xx retry with Retry-After header support
- Response truncation: MCP tools cap output at 8000 characters via `safeJsonText`/`toRawTextContent`

## Configuration env vars

| Var | Default | Purpose |
|---|---|---|
| `COSEVI_AUTH_KEY` | (required) | Junar API auth token |
| `COSEVI_BASE_URL` | `https://cosevi.cloudapi.junar.com/api/v2` | API base URL |
| `COSEVI_REFERER` | `https://datosabiertos.csv.go.cr/` | Referer header |
| `COSEVI_MAX_REQUESTS_PER_SECOND` | `4` | Rate limit (MCP server) |
| `COSEVI_RETRY_DELAY_MS` | `1200` | Retry delay in ms (MCP server) |
| `COSEVI_MAX_RETRIES` | `2` | Max retry attempts (MCP server) |
