# cosevi-open-data Python SDK

Read-only Python SDK for the COSEVI Datos Abiertos / Junar API.

## Setup

```bash
pip install cosevi-open-data
```

Set the `COSEVI_AUTH_KEY` environment variable (never hardcode):

```bash
export COSEVI_AUTH_KEY=your_key_here
```

Or use a local `.env` file with `python-dotenv` (never commit it).

## Quick start

```python
from cosevi_open_data import CoseviClient

# Reads COSEVI_AUTH_KEY from environment
client = CoseviClient()

# Search the catalog
results = client.search_resources(query="fallecidos", resources=["ds"], limit=10)

# List datasets
datasets = client.list_datasets(limit=20)

# Get a specific dataset
dataset = client.get_dataset("MY-DATASET-GUID")

# List datastreams
datastreams = client.list_datastreams(query="accidentes")

# Get datastream metadata
ds = client.get_datastream("MY-DS-GUID")

# Fetch datastream data (pjson = list of row dicts)
rows = client.get_datastream_data(
    "MY-DS-GUID",
    format="pjson",
    limit=50,
    page=1,
    apply_format=-1,
    parameters=["2024"],
)

# Fetch raw CSV
csv = client.get_datastream_raw_text("MY-DS-GUID", format="csv", limit=100)

# Fetch Tableau HTML embed
html = client.get_datastream_tableau("MY-DS-GUID", ["2024"])

# Filters, sorting, grouping
filtered = client.get_datastream_data(
    "MY-DS-GUID",
    format="pjson",
    filters=["column0[>]100"],
    order_by=["column1[D]"],
    group_by=["column2"],
    functions=["COUNT[column0]"],
    where="column0[>]50",
)

# List visualizations
vizs = client.list_visualizations(limit=20)
viz = client.get_visualization("MY-VZ-GUID")

# List dashboards
dbs = client.list_dashboards(limit=20)
db = client.get_dashboard("MY-DB-GUID")

# Extract resources from a dashboard
resources = CoseviClient.extract_dashboard_resources(db)

# Portal stats
stats = client.get_portal_stats(days=7)

# Known COSEVI dashboards (returns KnownCoseviDashboard dataclasses)
all_dbs = client.list_known_dashboards()
fallecidos = client.list_known_dashboards("fallecidos")
entry = client.get_known_dashboard("fallecidos_en_sitio")
dashboard_data = client.get_known_dashboard_data("fallecidos_en_sitio")

# Discovery
found = client.discover_resources_by_topic("infracciones", limit=10)

# Pagination
for page in client.iter_resources(query="fallecidos", max_pages=3):
    print(page)

for page in client.iter_datastream_data("MY-DS-GUID", max_pages=2):
    print(page)

# Build filter strings
f = CoseviClient.build_filter("column0", ">", 100)  # "column0[>]100"
```

## Configuration options

```python
client = CoseviClient(
    api_key="...",                  # default: COSEVI_AUTH_KEY env var
    base_url="https://...",         # default: COSEVI_BASE_URL env var or Junar endpoint
    referer="https://...",          # default: COSEVI_REFERER env var or datosabiertos.csv.go.cr
    timeout=30.0,                   # default: 30s
    max_requests_per_second=4,      # default: 4
    retry_on_rate_limit=True,       # default: True
    retry_delay_seconds=1.2,        # default: 1.2s
    max_retries=2,                  # default: 2
)
```

Use as a context manager to ensure connection cleanup:

```python
with CoseviClient() as client:
    data = client.get_datastream_data("MY-DS-GUID")
```

## Error types

```python
from cosevi_open_data import CoseviConfigError, CoseviApiError, CoseviAuthError, CoseviRateLimitError

# CoseviConfigError: bad configuration (missing key, invalid params)
# CoseviApiError: API returned an error (has .status_code, .safe_url, .response_body)
# CoseviAuthError: 401/403 authentication failure
# CoseviRateLimitError: 429 rate limit (has .retry_after_seconds)
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
