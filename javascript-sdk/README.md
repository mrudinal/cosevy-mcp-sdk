# cosevi-open-data JavaScript SDK

Read-only TypeScript/JavaScript SDK for the COSEVI Datos Abiertos / Junar API.

## Setup

```bash
npm install cosevi-open-data
```

Set the `COSEVI_AUTH_KEY` environment variable (never hardcode):

```bash
export COSEVI_AUTH_KEY=your_key_here
```

Or use a local `.env` file (never commit it):

```env
COSEVI_AUTH_KEY=your_key_here
```

## Quick start

```ts
import { CoseviClient } from "cosevi-open-data";

// Reads COSEVI_AUTH_KEY from environment
const client = new CoseviClient();

// Search the catalog
const results = await client.searchResources({ query: "fallecidos", resources: ["ds"], limit: 10 });

// List datasets
const datasets = await client.listDatasets({ limit: 20 });

// Get a specific dataset
const dataset = await client.getDataset("MY-DATASET-GUID");

// List datastreams
const datastreams = await client.listDatastreams({ query: "accidentes" });

// Get datastream metadata
const ds = await client.getDatastream("MY-DS-GUID");

// Fetch datastream data (pjson = array of row objects)
const rows = await client.getDatastreamData("MY-DS-GUID", {
  format: "pjson",
  limit: 50,
  page: 1,
  applyFormat: -1,
  parameters: ["2024"],
});

// Fetch raw CSV
const csv = await client.getDatastreamRawText("MY-DS-GUID", { format: "csv", limit: 100 });

// Fetch Tableau HTML embed
const html = await client.getDatastreamTableau("MY-DS-GUID", { parameters: ["2024"] });

// Filters, sorting, grouping
const filtered = await client.getDatastreamData("MY-DS-GUID", {
  format: "pjson",
  filters: ["column0[>]100"],
  orderBy: ["column1[D]"],
  groupBy: ["column2"],
  functions: ["COUNT[column0]"],
  where: "column0[>]50",
});

// List visualizations
const vizs = await client.listVisualizations({ limit: 20 });
const viz = await client.getVisualization("MY-VZ-GUID");

// List dashboards
const dbs = await client.listDashboards({ limit: 20 });
const db = await client.getDashboard("MY-DB-GUID");

// Extract resources from a dashboard
const resources = client.extractDashboardResources(db);

// Portal stats
const stats = await client.getPortalStats({ days: 7 });

// Known COSEVI dashboards
const knownDbs = client.listKnownDashboards();
const knownFallecidos = client.listKnownDashboards("fallecidos");
const entry = client.getKnownDashboard("fallecidos_en_sitio");
const dashboardData = await client.getKnownDashboardData("fallecidos_en_sitio");

// Discovery
const found = await client.discoverResourcesByTopic("infracciones", { limit: 10 });

// Pagination
for await (const page of client.iterateResources({ query: "fallecidos", maxPages: 3 })) {
  console.log(page);
}
for await (const page of client.iterateDatastreamData("MY-DS-GUID", { maxPages: 2 })) {
  console.log(page);
}

// Build filter strings
const filter = CoseviClient.buildFilter("column0", ">", 100); // "column0[>]100"
```

## Configuration options

```ts
const client = new CoseviClient({
  apiKey: "...",                    // default: COSEVI_AUTH_KEY env var
  baseUrl: "https://...",           // default: COSEVI_BASE_URL env var or Junar endpoint
  referer: "https://...",           // default: COSEVI_REFERER env var or datosabiertos.csv.go.cr
  timeoutMs: 30000,                 // default: 30s
  maxRequestsPerSecond: 4,          // default: 4
  retryOnRateLimit: true,           // default: true
  retryDelayMs: 1200,               // default: 1200ms
  maxRetries: 2,                    // default: 2
  fetchImpl: customFetch,           // optional: inject fetch implementation for testing
});
```

## Error types

```ts
import { CoseviConfigError, CoseviApiError, CoseviAuthError, CoseviRateLimitError } from "cosevi-open-data";

// CoseviConfigError: bad configuration (missing key, invalid params)
// CoseviApiError: API returned an error (has .status, .safeUrl, .responseBody)
// CoseviAuthError: 401/403 authentication failure
// CoseviRateLimitError: 429 rate limit (has .retryAfterSeconds)
```

## Known COSEVI dashboard keys

| Key | GUID | Category |
|---|---|---|
| `datos_pais` | DATOS-PAIS | general |
| `infracciones` | INFRA-43614 | infracciones |
| `fallecidos_en_sitio` | FALLE-EN-SITIO | fallecidos |
| `accidentes_transito` | ACCID-17064 | accidentes |
| `conductores_licencias` | ACRED-DE-CONDU-2 | licencias |
| `pruebas_teoricas_practicas` | PRUEB-TEORI-Y-PRACT | pruebas |
| `tabla_interactiva_fallecidos` | DATOS-PARA-TABLA-INTER-94312 | fallecidos |
| `tabla_interactiva_accidentes` | DATOS-PARA-TABLA-INTER-DE | accidentes |
| `accidentes_con_victimas` | ACCID | accidentes |
| `caracteristicas_infracciones` | CARAC-DE-INFRA | infracciones |
| `consulta_infracciones_articulo` | CONSU-DE-INFRA-POR-ARTIC | infracciones |
| `infracciones_detalle` | INFRA-46061 | infracciones |

## Tests

Comprehensive SDK unit coverage is mapped in `../docs/TEST_COVERAGE.md`.

GitHub workflow details are documented in `../docs/GITHUB_ACTIONS.md`.
