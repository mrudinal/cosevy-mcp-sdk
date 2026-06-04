# API Notes

## Base URL & Auth

- Base URL: `https://cosevi.cloudapi.junar.com/api/v2`
- Auth: query parameter `auth_key`, sourced from `COSEVI_AUTH_KEY` env var only
- Referer: `Referer` HTTP header, default `https://datosabiertos.csv.go.cr/`
- All operations are read-only GET requests

## Covered endpoint groups

| Endpoint | Method | Notes |
|---|---|---|
| `/resources.json` | GET | Catalog search |
| `/datasets.json` | GET | List datasets |
| `/datasets/{guid}.json` | GET | Get dataset |
| `/datastreams.json` | GET | List datastreams |
| `/datastreams/{guid}.json` | GET | Get datastream metadata |
| `/datastreams/{guid}/data.{format}` | GET | Fetch datastream data |
| `/datastreams/{guid}/tableau.html` | GET | Tableau HTML embed |
| `/visualizations.json` | GET | List visualizations |
| `/visualizations/{guid}.json` | GET | Get visualization |
| `/dashboards.json` | GET | List dashboards |
| `/dashboards/{guid}.json` | GET | Get dashboard |
| `/stats/` | GET | Portal usage statistics |

## Junar parameter conventions

### Datastream query parameters

| SDK option | Junar param | Notes |
|---|---|---|
| `parameters[0]` | `pArgument0` | Indexed from 0 |
| `parameters[1]` | `pArgument1` | ... |
| `filters[0]` | `filter0` | Syntax: `column0[==]value` |
| `orderBy[0]` | `orderBy0` | Syntax: `column0[A]` or `column0[D]` |
| `groupBy[0]` | `groupBy0` | Column name |
| `functions[0]` | `function0` | e.g. `COUNT[column0]` |
| `formatConfig` | `format` | JSON-serialized column format config |
| `applyFormat` | `applyFormat` | `-1` (none), `0` (raw), `1` (formatted) |

### Portal stats query parameters

| SDK option | Junar param | Notes |
|---|---|---|
| `groupBy` (SDK input field) | `group_by` | Sent as `group_by=day` to `/stats/` |
| `days` | `days` | Integer, time window |
| `hours` | `hours` | Integer, time window |
| `channel` | `channel` | Integer, API channel |
| `limit` | `limit` | Max results |
| `order` | `order` | Sort order |

### Filter syntax

```
column0[==]value
column0[>]100
column0[contains]text
```

### Format options

- `pjson` — array of row objects (most useful)
- `json` — raw Junar JSON
- `ajson` — annotated JSON
- `csv` — text/csv
- `xml` — application/xml
- `xls` — Excel (may return JSON or binary)
- `jsonp` — text/javascript (JSONP callback)

## Rate limits

- Default: 4 requests/second (token bucket)
- 429 responses trigger automatic retry with Retry-After header support
- Default retry delay: 1.2 seconds
- Default max retries: 2

## Safety constraints

- Reserved extra param keys are blocked at the SDK level (auth_key, limit, offset, filter0, pArgument0, etc.)
- GUID path segments are URL-encoded
- Auth key is stripped from error `safeUrl` before logging
- MCP tools truncate responses at 8000 characters
- Control characters and semicolons are rejected in filter/where expressions
