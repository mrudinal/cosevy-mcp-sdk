# cosevi-open-data JavaScript SDK

[Español](README.md) | [English](README.en.md)

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

## Real-world example — analyzing April 2026 traffic fatalities

This is the kind of question this SDK was built to answer in seconds. The data is live and official: it came directly from the COSEVI API and reflects April 2026, beyond any LLM training cutoff.

```ts
import { CoseviClient } from "cosevi-open-data";

const client = new CoseviClient(); // reads COSEVI_AUTH_KEY from env

// Fetch the most recent fatality records
const response = await client.getDatastreamData("REGIS-DE-FALLE-EN-SITIO", {
  format: "pjson",
  limit: 20,
  applyFormat: -1,
}) as { result: Array<Record<string, string>> };

const records = response.result.filter(r => r["Ano"]); // drop metadata row

// Analyze by province
const byProvince = records.reduce<Record<string, number>>((acc, r) => {
  acc[r["Provincia"]] = (acc[r["Provincia"]] ?? 0) + 1;
  return acc;
}, {});

// Analyze by road user role
const byRole = records.reduce<Record<string, number>>((acc, r) => {
  acc[r["Rol-persona"]] = (acc[r["Rol-persona"]] ?? 0) + 1;
  return acc;
}, {});

// Analyze by time slot
const bySlot = records.reduce<Record<string, number>>((acc, r) => {
  acc[r["Franja"]] = (acc[r["Franja"]] ?? 0) + 1;
  return acc;
}, {});

console.table(byProvince);
// San José: 7  Alajuela: 6  Limón: 4  Guanacaste: 2  Puntarenas: 1

console.table(byRole);
// Conductor de motocicleta: 9 (47%)
// Conductor: 6 (32%)
// Peatón: 2  Pasajero moto: 2

console.table(bySlot);
// 18:00–23:59: 7  06:00–11:59: 6  12:00–17:59: 3  00:00–05:59: 3
```

**Findings from real April 2026 data:**
- San José + Alajuela = **68 % of all fatalities**
- Motorcyclists (rider + passenger) = **58 % of victims**
- Evening slot 18:00–23:59 = **most dangerous window**
- 79 % of victims are male; peak age group 20–29

## Tests

Comprehensive SDK unit coverage is mapped in `../docs/TEST_COVERAGE.md`.

GitHub workflow details are documented in `../docs/GITHUB_ACTIONS.md`.
