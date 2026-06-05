# COSEVI Open Data Toolkit

[Español](README.md) | [English](README.en.md)

Kit de herramientas de solo lectura para acceder a **COSEVI Datos Abiertos** de Costa Rica a través de la API de datos abiertos Junar v2.

Este repositorio contiene tres paquetes:

* `javascript-sdk/` — SDK para Node.js / TypeScript
* `python-sdk/` — SDK para Python
* `mcp-server/` — Servidor MCP construido sobre el SDK de JavaScript

URL del repositorio: `https://github.com/mrudinal/cosevy-mcp-sdk`

> Nota: el nombre del repositorio usa `cosevy-mcp-sdk`, pero el toolkit está dirigido a COSEVI Datos Abiertos.

## ¿Por qué este MCP en lugar de buscar manualmente?

Un LLM sin herramientas solo puede describir datos de tránsito con información de su entrenamiento, que puede tener meses o años de antigüedad y nunca incluirá los registros individuales más recientes.

| Situación | Navegación manual | Con este MCP |
|---|---|---|
| Datos recientes | Buscar en el sitio, descargar y parsear manualmente | Una llamada a `cosevi_get_datastream_data` |
| Cruzar variables (provincia × rol × horario) | Abrir el archivo y filtrar en Excel o similar | El LLM analiza la respuesta estructurada directamente |
| Repetir el análisis el mes siguiente | Volver a descargar y rehacer todo | Misma llamada, datos actualizados automáticamente |
| Riesgo de citar datos incorrectos | Alto — el LLM puede “alucinar” estadísticas | Bajo — los datos vienen de la API oficial de COSEVI |
| Tiempo hasta el resultado | 10–20 minutos de navegación y limpieza | Segundos |

Los datos de COSEVI Datos Abiertos son **oficiales, estructurados y actualizados mensualmente** por el Consejo de Seguridad Vial de Costa Rica. Este MCP los pone directamente en el contexto del LLM, sin que el usuario tenga que descargar ni transformar nada.

## Qué hace este repositorio

Este proyecto ofrece a desarrolladores y clientes MCP una forma segura y de solo lectura de trabajar con datos abiertos de COSEVI.

Con este repositorio puedes:

* Buscar recursos de datos abiertos de COSEVI/Junar
* Leer datasets, datastreams, visualizaciones, dashboards y estadísticas del portal
* Consultar datastreams con filtros, ordenamiento, agrupación, funciones, formato y paginación
* Usar atajos de dashboards conocidos de COSEVI para fallecidos, accidentes, infracciones, licencias y pruebas de manejo
* Usar los mismos datos de COSEVI desde JavaScript, Python o herramientas MCP
* Probar el servidor MCP localmente sin ningún LLM

Todas las operaciones de COSEVI/Junar en este repositorio son **de solo lectura**.

## Arquitectura

```text
COSEVI / Junar API
   ↑
JavaScript SDK       Python SDK
   ↑
MCP server
```

* `javascript-sdk/` es el SDK principal de TypeScript y también es usado internamente por el servidor MCP.
* `python-sdk/` replica la misma superficie de API de solo lectura para usuarios de Python.
* `mcp-server/` registra herramientas MCP seguras, valida entradas y redacta/trunca la salida de herramientas para clientes LLM.

## Cobertura de la API

Los SDKs y el servidor MCP cubren las principales superficies de solo lectura de COSEVI/Junar:

* Búsqueda en el catálogo de recursos
* Metadatos de datasets
* Metadatos de datastreams
* Lecturas de datos de datastreams
* Lecturas raw de datastreams en CSV/XML/JSONP
* Endpoint Tableau HTML de datastreams
* Metadatos de visualizaciones
* Metadatos de dashboards
* Extracción de recursos de dashboards
* Estadísticas del portal
* Helpers de dashboards conocidos de COSEVI
* Helpers de paginación controlada
* Helpers de consultas seguras
* Comportamiento de rate limit / retry
* Pruebas MCP unitarias, de esquema y de protocolo stdio

Consulta [API parity](docs/API_PARITY.md) y [MCP tools reference](docs/MCP_TOOLS.md) para la lista completa de funcionalidades.

## Ejemplo rápido en JavaScript

```ts
import { CoseviClient } from "cosevi-open-data";

const client = new CoseviClient();

const resources = await client.searchResources({
  query: "fallecidos",
  resources: ["ds"],
  limit: 5
});

const rows = await client.getDatastreamData("REGIS-DE-FALLE-EN-SITIO", {
  format: "pjson",
  limit: 5,
  page: 1,
  applyFormat: -1
});

const dashboards = client.listKnownDashboards("fallecidos");
```

## Ejemplo rápido en Python

```python
from cosevi_open_data import CoseviClient

client = CoseviClient()

resources = client.search_resources(
    query="fallecidos",
    resources=["ds"],
    limit=5,
)

rows = client.get_datastream_data(
    "REGIS-DE-FALLE-EN-SITIO",
    format="pjson",
    limit=5,
    page=1,
    apply_format=-1,
)

dashboards = client.list_known_dashboards("fallecidos")
```

## Precedencia de credenciales

Los SDKs y el servidor MCP resuelven `COSEVI_AUTH_KEY` y los valores de configuración relacionados en este orden:

1. Valor explícito de constructor/configuración
2. Archivo local `.env` en el directorio de trabajo del paquete
3. Variable de entorno del sistema operativo en Windows, Linux o macOS
4. Valor por defecto o faltante

El valor de `.env` tiene prioridad sobre cualquier variable de entorno del sistema operativo ya existente.

La llave nunca debe subirse al repositorio. Los archivos `.env` están ignorados por git.

## Valores de configuración

```env
COSEVI_AUTH_KEY=YOUR_KEY
COSEVI_BASE_URL=https://cosevi.cloudapi.junar.com/api/v2
COSEVI_REFERER=https://datosabiertos.csv.go.cr/
```

`COSEVI_BASE_URL` y `COSEVI_REFERER` tienen valores por defecto seguros, pero `COSEVI_AUTH_KEY` es requerido para llamadas en vivo a la API de COSEVI.

## Configuración local de `.env`

Desde la raíz del repositorio:

```powershell
Copy-Item .\javascript-sdk\.env.example .\javascript-sdk\.env
Copy-Item .\python-sdk\.env.example .\python-sdk\.env
Copy-Item .\mcp-server\.env.example .\mcp-server\.env

notepad .\javascript-sdk\.env
```

Cada paquete lee su propio `.env` local cuando los comandos se ejecutan desde la carpeta de ese paquete.

## Configuración de variables de entorno en Windows PowerShell

Para la sesión actual de PowerShell:

```powershell
$env:COSEVI_AUTH_KEY="your-key-here"
$env:COSEVI_BASE_URL="https://cosevi.cloudapi.junar.com/api/v2"
$env:COSEVI_REFERER="https://datosabiertos.csv.go.cr/"
```

Para tu cuenta de usuario de Windows:

```powershell
[Environment]::SetEnvironmentVariable("COSEVI_AUTH_KEY", "your-key-here", "User")
[Environment]::SetEnvironmentVariable("COSEVI_BASE_URL", "https://cosevi.cloudapi.junar.com/api/v2", "User")
[Environment]::SetEnvironmentVariable("COSEVI_REFERER", "https://datosabiertos.csv.go.cr/", "User")
```

Abre una terminal nueva después de configurar variables persistentes de usuario.

## Configuración de variables de entorno en Linux / macOS

```bash
export COSEVI_AUTH_KEY="your-key-here"
export COSEVI_BASE_URL="https://cosevi.cloudapi.junar.com/api/v2"
export COSEVI_REFERER="https://datosabiertos.csv.go.cr/"
```

## Pruebas locales

### JavaScript SDK

```powershell
cd ".\javascript-sdk"
npm install
npm run build
npm test
npm audit --omit=dev
npm pack --dry-run
```

### Python SDK

```powershell
cd ".\python-sdk"
if (!(Test-Path ".venv")) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
pytest
python -m build
```

### MCP server

```powershell
cd ".\mcp-server"
npm install
npm run build
npm test
npm run test:protocol
npm audit --omit=dev
npm pack --dry-run
```

## Uso del servidor MCP

Este repositorio proporciona un servidor MCP local por stdio, no una URL remota de conector HTTP.

Construye el SDK y el servidor MCP:

```powershell
cd ".\javascript-sdk"
npm install
npm run build

cd "..\mcp-server"
npm install
npm run build
```

Ejecuta el servidor MCP directamente:

```powershell
node .\dist\index.js
```

Configura tu cliente MCP para ejecutar el comando local de `mcp-server`.

Ejemplo de comando local de servidor MCP:

```json
{
  "command": "node",
  "args": [
    "/ruta/al/repo/mcp-server/dist/index.js"
  ],
  "env": {
    "COSEVI_AUTH_KEY": "YOUR_KEY",
    "COSEVI_BASE_URL": "https://cosevi.cloudapi.junar.com/api/v2",
    "COSEVI_REFERER": "https://datosabiertos.csv.go.cr/"
  }
}
```

Los ejemplos generales de configuración de clientes MCP están documentados en [MCP client configs](docs/MCP_CLIENTS.md).

## Documentación

* [Test inventory](docs/TEST_INVENTORY.md)
* [Test coverage](docs/TEST_COVERAGE.md)
* [MCP testing](docs/MCP_TESTING.md)
* [MCP client configs](docs/MCP_CLIENTS.md)
* [MCP tools reference](docs/MCP_TOOLS.md)
* [API notes](docs/API_NOTES.md)
* [API parity](docs/API_PARITY.md)
* [GitHub Actions](docs/GITHUB_ACTIONS.md)
* [Testing with API key](docs/TESTING_WITH_API_KEY.md)
* [Architecture](docs/ARCHITECTURE.md)
* [Publishing](docs/PUBLISHING.md)

## Seguridad

Este proyecto es de solo lectura.

No implementa operaciones de escritura de COSEVI/Junar, operaciones de publicación, operaciones de borrado ni acciones administrativas.

El servidor MCP valida entradas, redacta secretos y trunca salidas grandes antes de devolver contenido a clientes MCP.
