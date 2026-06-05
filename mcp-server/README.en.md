# cosevi-open-data-mcp

[Español](README.md) | [English](README.en.md)

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
- `cosevi_get_datastream_data` — JSON formats (`pjson`, `json`, `ajson`, `csv`, `xml`, `xls`)
- `cosevi_query_datastream` — With `filters`, `where`, `orderBy`, `groupBy`, `functions`
- `cosevi_get_datastream_raw` — Raw text (`CSV`/`XML`/`JSONP`), truncated at 8000 chars
- `cosevi_get_datastream_tableau` — Tableau HTML embed

### Portal & discovery
- `cosevi_get_portal_stats`
- `cosevi_discover_resources_by_topic`

### Known COSEVI dashboards
- `cosevi_list_known_dashboards` — Filter by category (`fallecidos`, `accidentes`, etc.)
- `cosevi_get_known_dashboard`
- `cosevi_get_known_dashboard_data`

### Domain shortcuts (fetch by fixed GUID)
- `cosevi_get_fatalities_dashboard` (`FALLE-EN-SITIO`)
- `cosevi_get_fatalities_table_dashboard`
- `cosevi_get_accidents_dashboard` (`ACCID-17064`)
- `cosevi_get_accidents_table_dashboard`
- `cosevi_get_infractions_dashboard` (`INFRA-43614`)
- `cosevi_get_infractions_by_article_dashboard`
- `cosevi_get_licenses_dashboard`
- `cosevi_get_driving_tests_dashboard`

### Pagination helpers
- `cosevi_get_resource_pages` — Up to 5 pages × 100 results
- `cosevi_get_datastream_pages` — Up to 5 pages × 100 rows

### Health
- `cosevi_health_check` — Config status; optional live ping with `checkReachability=true`

## Live example — what this MCP can answer

The following prompt requires **live, structured government data** that no LLM can answer from training alone. The data is updated monthly by COSEVI and was beyond any model's training cutoff.

### Prompt

> *"Analyze traffic fatalities in Costa Rica for April 2026. Which provinces have the most deaths? What road user type dies most? What time of day is deadliest?"*

### Tool call

```json
{
  "tool": "cosevi_get_datastream_data",
  "arguments": {
    "guid": "REGIS-DE-FALLE-EN-SITIO",
    "format": "pjson",
    "limit": 20,
    "applyFormat": -1
  }
}
```

The tool returns structured records — one row per fatality — with fields: `Provincia`, `Canton`, `Rol-persona`, `Tipo-de-accidente`, `Franja`, `Dia`, `Sexo`, `Edad`, `Edad-quinquenal`, `Ano`, `Mes`.

### Analysis produced (real data, April 2026)

**By province**

| Province | Deaths | % |
|---|---|---|
| San José | 7 | 37 % |
| Alajuela | 6 | 32 % |
| Limón | 4 | 21 % |
| Guanacaste | 2 | 11 % |
| Puntarenas | 1 | 5 % |

**By road user role**

| Role | Deaths | % |
|---|---|---|
| Motorcycle rider | 9 | 47 % |
| Car driver | 6 | 32 % |
| Pedestrian | 2 | 11 % |
| Motorcycle passenger | 2 | 11 % |

Motorcyclists (riders + passengers) account for **58 % of all deaths**.

**By time slot**

| Slot | Deaths |
|---|---|
| 18:00–23:59 (evening) | 7 |
| 06:00–11:59 (morning) | 6 |
| 12:00–17:59 (afternoon) | 3 |
| 00:00–05:59 (overnight) | 3 |

**Key conclusions derived by the LLM**

1. San José + Alajuela = 68 % of fatalities — urban concentration.
2. Motorcyclists are the most at-risk group: 6 in 10 deaths.
3. Evening/night (18:00–23:59) is the most dangerous window.
4. Vehicle collisions are the leading cause (58 %).
5. 79 % of victims are male; peak age group 20–29.

This analysis was produced **in seconds** from a single tool call. The manual equivalent — navigating to `datosabiertos.csv.go.cr`, locating the view, downloading, and cross-tabulating five variables — takes 15–20 minutes and introduces copy/paste error risk.

## Running the MCP inspector

```bash
npm run inspector
```

The repository workflows and SDK test coverage docs live in `../docs/GITHUB_ACTIONS.md` and `../docs/TEST_COVERAGE.md`.
