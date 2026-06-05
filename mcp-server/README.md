# cosevi-open-data-mcp

[Español](README.md) | [English](README.en.md)

Servidor MCP de solo lectura para COSEVI Datos Abiertos, construido sobre el SDK de JavaScript.

## Instalación

```bash
# 1. Build the JS SDK first
cd ../javascript-sdk
npm install && npm run build

# 2. Build the MCP server
cd ../mcp-server
npm install && npm run build
npm test
```

Configura la API key (nunca la hardcodees):

```bash
export COSEVI_AUTH_KEY=your_key_here
```

## Configuración del cliente MCP en IDE/LLM

Para clientes como Claude Desktop o Claude Code, agrega una entrada de servidor MCP usando un comando local por stdio (ejemplo abajo):

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

Para archivos repo-local de configuración de Caveman (genérico `.mcp.json`, VS Code `.vscode/mcp.json` y Cursor `.cursor/mcp.json`), consulta `../docs/CONFIGURATION.md`.

Para un mapeo universal de clientes IDE/LLM y ambas formas de esquema JSON soportadas, consulta `../docs/MCP_CLIENTS.md`.

## Variables de entorno

| Var | Default | Purpose |
|---|---|---|
| `COSEVI_AUTH_KEY` | (required) | Junar API auth token |
| `COSEVI_BASE_URL` | Junar endpoint | Override API base URL |
| `COSEVI_REFERER` | datosabiertos.csv.go.cr | Referer header |
| `COSEVI_MAX_REQUESTS_PER_SECOND` | `4` | Rate limit |
| `COSEVI_RETRY_DELAY_MS` | `1200` | Retry delay in ms |
| `COSEVI_MAX_RETRIES` | `2` | Max retry attempts |

## Herramientas (30 en total)

Todas las herramientas son de solo lectura. Consulta [docs/MCP_TOOLS.md](../docs/MCP_TOOLS.md) para los schemas completos.

### Catálogo y metadata
- `cosevi_search_resources` — Busca en todos los tipos de recurso
- `cosevi_list_datasets` / `cosevi_get_dataset`
- `cosevi_list_datastreams` / `cosevi_get_datastream`
- `cosevi_list_visualizations` / `cosevi_get_visualization`
- `cosevi_list_dashboards` / `cosevi_get_dashboard` / `cosevi_get_dashboard_resources`

### Datos de datastream
- `cosevi_get_datastream_data` — Formatos JSON (`pjson`, `json`, `ajson`, `csv`, `xml`, `xls`)
- `cosevi_query_datastream` — Con `filters`, `where`, `orderBy`, `groupBy`, `functions`
- `cosevi_get_datastream_raw` — Texto raw (`CSV`/`XML`/`JSONP`), truncado a 8000 caracteres
- `cosevi_get_datastream_tableau` — Embed HTML de Tableau

### Portal y discovery
- `cosevi_get_portal_stats`
- `cosevi_discover_resources_by_topic`

### Dashboards conocidos de COSEVI
- `cosevi_list_known_dashboards` — Filtra por categoría (`fallecidos`, `accidentes`, etc.)
- `cosevi_get_known_dashboard`
- `cosevi_get_known_dashboard_data`

### Atajos de dominio (consulta por GUID fijo)
- `cosevi_get_fatalities_dashboard` (`FALLE-EN-SITIO`)
- `cosevi_get_fatalities_table_dashboard`
- `cosevi_get_accidents_dashboard` (`ACCID-17064`)
- `cosevi_get_accidents_table_dashboard`
- `cosevi_get_infractions_dashboard` (`INFRA-43614`)
- `cosevi_get_infractions_by_article_dashboard`
- `cosevi_get_licenses_dashboard`
- `cosevi_get_driving_tests_dashboard`

### Helpers de paginación
- `cosevi_get_resource_pages` — Hasta 5 páginas × 100 resultados
- `cosevi_get_datastream_pages` — Hasta 5 páginas × 100 filas

### Salud
- `cosevi_health_check` — Estado de configuración; ping en vivo opcional con `checkReachability=true`

## Ejemplo en vivo — lo que este MCP puede responder

El siguiente prompt requiere **datos gubernamentales en vivo y estructurados** que ningún LLM puede responder solo con entrenamiento. Los datos se actualizan mensualmente por COSEVI y están más allá del corte de entrenamiento del modelo.

### Prompt

> *"Analyze traffic fatalities in Costa Rica for April 2026. Which provinces have the most deaths? What road user type dies most? What time of day is deadliest?"*

### Llamada de herramienta

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

La herramienta retorna registros estructurados, una fila por fallecido, con campos: `Provincia`, `Canton`, `Rol-persona`, `Tipo-de-accidente`, `Franja`, `Dia`, `Sexo`, `Edad`, `Edad-quinquenal`, `Ano`, `Mes`.

### Análisis producido (datos reales, abril 2026)

**Por provincia**

| Province | Deaths | % |
|---|---|---|
| San José | 7 | 37 % |
| Alajuela | 6 | 32 % |
| Limón | 4 | 21 % |
| Guanacaste | 2 | 11 % |
| Puntarenas | 1 | 5 % |

**Por rol vial**

| Role | Deaths | % |
|---|---|---|
| Motorcycle rider | 9 | 47 % |
| Car driver | 6 | 32 % |
| Pedestrian | 2 | 11 % |
| Motorcycle passenger | 2 | 11 % |

Los motociclistas (conductor + pasajero) representan **58 % de todas las muertes**.

**Por franja horaria**

| Slot | Deaths |
|---|---|
| 18:00–23:59 (evening) | 7 |
| 06:00–11:59 (morning) | 6 |
| 12:00–17:59 (afternoon) | 3 |
| 00:00–05:59 (overnight) | 3 |

**Conclusiones clave derivadas por el LLM**

1. San José + Alajuela = 68 % de los fallecidos — concentración urbana.
2. Los motociclistas son el grupo de mayor riesgo: 6 de cada 10 muertes.
3. La tarde-noche (18:00–23:59) es la ventana más peligrosa.
4. Las colisiones vehiculares son la causa principal (58 %).
5. 79 % de las víctimas son hombres; el grupo de edad pico es 20–29.

Este análisis se produjo **en segundos** a partir de una sola llamada de herramienta. El equivalente manual — navegar a `datosabiertos.csv.go.cr`, encontrar la vista, descargar y cruzar cinco variables — toma 15–20 minutos e introduce riesgo de errores de copiado.

## Ejecutar el inspector MCP

```bash
npm run inspector
```

La documentación de workflows del repositorio y de cobertura del SDK vive en `../docs/GITHUB_ACTIONS.md` y `../docs/TEST_COVERAGE.md`.
