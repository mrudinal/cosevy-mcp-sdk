# MCP Tools Reference

All tools are read-only. No write, POST, PUT, or DELETE operations are exposed.

## Health

### `cosevi_health_check`
Returns sanitized configuration status (key presence, base URL, referer). Set `checkReachability=true` to make one live API call.

Schema: `{ checkReachability?: boolean }`

---

## Catalog & Metadata

### `cosevi_search_resources`
Search the COSEVI catalog across resource types.

Schema: `{ query?, resources?: ("dt"|"ds"|"vz"|"db")[], categories?: string[], order?, limit: 1-100, offset }`

### `cosevi_list_datasets`
List dataset metadata.

Schema: `{ query?, categories?: string[], order?, limit: 1-100, offset }`

### `cosevi_get_dataset`
Get a specific dataset by GUID.

Schema: `{ guid: string }`

### `cosevi_list_datastreams`
List datastream metadata.

Schema: `{ query?, categories?: string[], order?, limit: 1-100, offset }`

### `cosevi_get_datastream`
Get metadata for a specific datastream by GUID.

Schema: `{ guid: string }`

### `cosevi_list_visualizations`
List visualization metadata.

Schema: `{ query?, categories?: string[], order?, limit: 1-100, offset }`

### `cosevi_get_visualization`
Get a specific visualization by GUID.

Schema: `{ guid: string }`

### `cosevi_list_dashboards`
List dashboard metadata.

Schema: `{ query?, categories?: string[], order?, limit: 1-100, offset }`

### `cosevi_get_dashboard`
Get a specific dashboard by GUID.

Schema: `{ guid: string }`

### `cosevi_get_dashboard_resources`
Get a dashboard and extract its embedded resource components.

Schema: `{ guid: string, resourceTypes?: ("dt"|"ds"|"vz"|"db"|"html")[] }`

---

## Datastream Data

### `cosevi_get_datastream_data`
Fetch rows from a datastream. Supports pjson, json, ajson, csv, xml, xls formats.

Schema: `{ guid, format?, limit?, page?, offset?, parameters?: string[], filters?: string[], where?, orderBy?: string[], groupBy?: string[], functions?: string[], applyFormat?: -1|0|1, formatConfig? }`

### `cosevi_query_datastream`
Fetch rows with Junar query expressions (filters, where, orderBy, groupBy, functions).

Schema: `{ guid, format?, filters?, where?, orderBy?, groupBy?, functions?, limit?, page?, applyFormat?, formatConfig? }`

### `cosevi_get_datastream_raw`
Fetch raw text (CSV, XML, or JSONP). Output truncated at 8000 characters.

Schema: `{ guid, format?: "csv"|"xml"|"jsonp", limit?, page?, offset?, parameters?, filters?, where?, orderBy?, groupBy?, functions?, applyFormat?, formatConfig? }`

### `cosevi_get_datastream_tableau`
Fetch Tableau HTML embed for a datastream. Output truncated at 8000 characters.

Schema: `{ guid: string, parameters?: string[] }`

---

## Portal Stats

### `cosevi_get_portal_stats`
Get portal usage statistics.

Schema: `{ days?, hours?, minutes?, from?, to?, channel?: "API"|"WEB"|"0"|"1", facets?, limit?, groupBy?, order? }`

---

## Known Dashboards

### `cosevi_list_known_dashboards`
List curated COSEVI dashboards. Categories: fallecidos, accidentes, infracciones, licencias, pruebas, general.

Schema: `{ category?: string }`

### `cosevi_get_known_dashboard`
Get known dashboard metadata by key or GUID.

Schema: `{ keyOrGuid: string }`

### `cosevi_get_known_dashboard_data`
Fetch live data for a known dashboard by key or GUID.

Schema: `{ keyOrGuid: string }`

---

## Domain Shortcuts

These tools fetch specific COSEVI dashboards by fixed GUID. All accept `{ includeResources?: boolean }`.

| Tool | GUID | Description |
|---|---|---|
| `cosevi_get_fatalities_dashboard` | FALLE-EN-SITIO | Fallecidos en sitio |
| `cosevi_get_fatalities_table_dashboard` | DATOS-PARA-TABLA-INTER-94312 | Tabla interactiva de fallecidos |
| `cosevi_get_accidents_dashboard` | ACCID-17064 | Accidentes de tránsito |
| `cosevi_get_accidents_table_dashboard` | DATOS-PARA-TABLA-INTER-DE | Tabla interactiva de accidentes |
| `cosevi_get_infractions_dashboard` | INFRA-43614 | Infracciones |
| `cosevi_get_infractions_by_article_dashboard` | CONSU-DE-INFRA-POR-ARTIC | Infracciones por artículo |
| `cosevi_get_licenses_dashboard` | ACRED-DE-CONDU-2 | Conductores y licencias |
| `cosevi_get_driving_tests_dashboard` | PRUEB-TEORI-Y-PRACT | Pruebas teóricas y prácticas |

---

## Pagination Helpers

### `cosevi_get_resource_pages`
Fetch multiple pages of catalog resources. Hard caps: maxPages=5, pageSize=100.

Schema: `{ query?, resources?, pageSize: 1-100, maxPages: 1-5 }`

### `cosevi_get_datastream_pages`
Fetch multiple pages of datastream rows (JSON only). Hard caps: maxPages=5, pageSize=100.

Schema: `{ guid: string, format?: "json"|"pjson"|"ajson", pageSize: 1-100, maxPages: 1-5 }`
