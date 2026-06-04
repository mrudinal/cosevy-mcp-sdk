# cosevi-open-data-mcp

Read-only MCP server for COSEVI Datos Abiertos, built on top of the JavaScript SDK.

## Setup

```bash
# 1. Build the JS SDK first
cd ../javascript-sdk
npm install && npm run build

# 2. Build the MCP server
cd ../mcp-server
npm install && npm run build
npm test
```

Set the API key (never hardcode):

```bash
export COSEVI_AUTH_KEY=your_key_here
```

## IDE/LLM MCP client configuration

For clients like Claude Desktop / Claude Code, add an MCP server entry using a local stdio command (example below):

```json
{
  "mcpServers": {
    "cosevi-open-data": {
      "command": "node",
      "args": ["C:/path/to/cosevi-mcp-sdks/mcp-server/dist/index.js"],
      "env": {
        "COSEVI_AUTH_KEY": "your_key_here"
      }
    }
  }
}
```

For repo-local Caveman configuration files (generic `.mcp.json`, VS Code `.vscode/mcp.json`, and Cursor `.cursor/mcp.json`), see `../docs/CONFIGURATION.md`.

For a universal IDE/LLM client mapping and both supported JSON schema shapes, see `../docs/MCP_CLIENTS.md`.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `COSEVI_AUTH_KEY` | (required) | Junar API auth token |
| `COSEVI_BASE_URL` | Junar endpoint | Override API base URL |
| `COSEVI_REFERER` | datosabiertos.csv.go.cr | Referer header |
| `COSEVI_MAX_REQUESTS_PER_SECOND` | `4` | Rate limit |
| `COSEVI_RETRY_DELAY_MS` | `1200` | Retry delay in ms |
| `COSEVI_MAX_RETRIES` | `2` | Max retry attempts |

## Tools (30 total)

All tools are read-only. See [docs/MCP_TOOLS.md](../docs/MCP_TOOLS.md) for full schemas.

### Catalog & metadata
- `cosevi_search_resources` — Search across all resource types
- `cosevi_list_datasets` / `cosevi_get_dataset`
- `cosevi_list_datastreams` / `cosevi_get_datastream`
- `cosevi_list_visualizations` / `cosevi_get_visualization`
- `cosevi_list_dashboards` / `cosevi_get_dashboard` / `cosevi_get_dashboard_resources`

### Datastream data
- `cosevi_get_datastream_data` — JSON formats (pjson, json, ajson, csv, xml, xls)
- `cosevi_query_datastream` — With filters, where, orderBy, groupBy, functions
- `cosevi_get_datastream_raw` — Raw text (CSV/XML/JSONP), truncated at 8000 chars
- `cosevi_get_datastream_tableau` — Tableau HTML embed

### Portal & discovery
- `cosevi_get_portal_stats`
- `cosevi_discover_resources_by_topic`

### Known COSEVI dashboards
- `cosevi_list_known_dashboards` — Filter by category (fallecidos, accidentes, etc.)
- `cosevi_get_known_dashboard`
- `cosevi_get_known_dashboard_data`

### Domain shortcuts (fetch by fixed GUID)
- `cosevi_get_fatalities_dashboard` (FALLE-EN-SITIO)
- `cosevi_get_fatalities_table_dashboard`
- `cosevi_get_accidents_dashboard` (ACCID-17064)
- `cosevi_get_accidents_table_dashboard`
- `cosevi_get_infractions_dashboard` (INFRA-43614)
- `cosevi_get_infractions_by_article_dashboard`
- `cosevi_get_licenses_dashboard`
- `cosevi_get_driving_tests_dashboard`

### Pagination helpers
- `cosevi_get_resource_pages` — Up to 5 pages × 100 results
- `cosevi_get_datastream_pages` — Up to 5 pages × 100 rows

### Health
- `cosevi_health_check` — Config status; optional live ping with `checkReachability=true`

## Running the MCP inspector

```bash
npm run inspector
```

The repository workflows and SDK test coverage docs live in `../docs/GITHUB_ACTIONS.md` and `../docs/TEST_COVERAGE.md`.
