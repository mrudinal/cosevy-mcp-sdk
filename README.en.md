# COSEVI Open Data Toolkit

[Español](README.md) | [English](README.en.md)

Read-only toolkit for accessing Costa Rica **COSEVI Datos Abiertos** through the Junar v2 open-data API.

This repository contains three packages:

* `javascript-sdk/` — Node.js / TypeScript SDK
* `python-sdk/` — Python SDK
* `mcp-server/` — MCP server built on top of the JavaScript SDK

Repository URL: `https://github.com/mrudinal/cosevy-mcp-sdk`

> Note: the repository name uses `cosevy-mcp-sdk`, but the toolkit targets COSEVI Datos Abiertos.

## What this repository does

This project gives developers and MCP clients a safe, read-only way to work with COSEVI open data.

With this repo you can:

* Search COSEVI/Junar open-data resources
* Read datasets, datastreams, visualizations, dashboards, and portal stats
* Query datastreams with filters, ordering, grouping, functions, formatting, and pagination
* Use known COSEVI dashboard shortcuts for fatalities, accidents, infractions, licenses, and driving tests
* Use the same COSEVI data through JavaScript, Python, or MCP tools
* Test the MCP server locally without any LLM

All COSEVI/Junar operations in this repository are **read-only**.

## Architecture

```text
COSEVI / Junar API
   ↑
JavaScript SDK       Python SDK
   ↑
MCP server
```

* `javascript-sdk/` is the main TypeScript SDK and is also used internally by the MCP server.
* `python-sdk/` mirrors the same read-only API surface for Python users.
* `mcp-server/` registers safe MCP tools, validates inputs, and redacts/truncates tool output for LLM clients.

## API coverage

The SDKs and MCP server cover the main COSEVI/Junar read-only surfaces:

* Resource catalog search
* Dataset metadata
* Datastream metadata
* Datastream data reads
* Raw CSV/XML/JSONP datastream reads
* Tableau HTML datastream endpoint
* Visualization metadata
* Dashboard metadata
* Dashboard resource extraction
* Portal stats
* Known COSEVI dashboard helpers
* Controlled pagination helpers
* Safe query helpers
* Rate limit / retry behavior
* MCP unit, schema, and stdio protocol tests

See [API parity](docs/API_PARITY.md) and [MCP tools reference](docs/MCP_TOOLS.md) for the complete feature list.

## Quick JavaScript example

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

## Quick Python example

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

## Credential precedence

The SDKs and MCP server resolve `COSEVI_AUTH_KEY` and related config values in this order:

1. Explicit constructor/config value
2. Local `.env` file in the package working directory
3. OS environment variable on Windows, Linux, or macOS
4. Default/missing value

The `.env` value wins over any pre-existing OS environment variable.

The key must never be committed. `.env` files are git-ignored.

## Configuration values

```env
COSEVI_AUTH_KEY=YOUR_KEY
COSEVI_BASE_URL=https://cosevi.cloudapi.junar.com/api/v2
COSEVI_REFERER=https://datosabiertos.csv.go.cr/
```

`COSEVI_BASE_URL` and `COSEVI_REFERER` have safe defaults, but `COSEVI_AUTH_KEY` is required for live COSEVI API calls.

## Local `.env` setup

From the repository root:

```powershell
Copy-Item .\javascript-sdk\.env.example .\javascript-sdk\.env
Copy-Item .\python-sdk\.env.example .\python-sdk\.env
Copy-Item .\mcp-server\.env.example .\mcp-server\.env

notepad .\javascript-sdk\.env
```

Each package reads its own local `.env` when commands are run from that package folder.

## Windows PowerShell environment setup

For the current PowerShell session:

```powershell
$env:COSEVI_AUTH_KEY="your-key-here"
$env:COSEVI_BASE_URL="https://cosevi.cloudapi.junar.com/api/v2"
$env:COSEVI_REFERER="https://datosabiertos.csv.go.cr/"
```

For your Windows user account:

```powershell
[Environment]::SetEnvironmentVariable("COSEVI_AUTH_KEY", "your-key-here", "User")
[Environment]::SetEnvironmentVariable("COSEVI_BASE_URL", "https://cosevi.cloudapi.junar.com/api/v2", "User")
[Environment]::SetEnvironmentVariable("COSEVI_REFERER", "https://datosabiertos.csv.go.cr/", "User")
```

Open a new terminal after setting persistent user variables.

## Linux / macOS environment setup

```bash
export COSEVI_AUTH_KEY="your-key-here"
export COSEVI_BASE_URL="https://cosevi.cloudapi.junar.com/api/v2"
export COSEVI_REFERER="https://datosabiertos.csv.go.cr/"
```

## GitHub Actions secret setup

In GitHub:

```text
Repository → Settings → Secrets and variables → Actions → New repository secret
```

Secret name:

```text
COSEVI_AUTH_KEY
```

Notes:

* Unit tests do not require this secret.
* Schema tests do not require this secret.
* MCP protocol tests do not require this secret.
* Scheduled workflows run every Monday at 6:00 PM Costa Rica time.
* If `COSEVI_AUTH_KEY` is configured, scheduled workflows can run low-volume live smoke checks.
* The key is masked with `::add-mask::` and must never be printed in logs or reports.

## Local testing

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

## MCP testing without an LLM

The MCP server test suite does not require an LLM.

It has three layers:

* **Unit tests** — mock the SDK client and verify tool delegation.
* **Schema tests** — validate representative valid and invalid inputs.
* **Protocol stdio tests** — start the MCP server over stdio and use the MCP client SDK to call tools.

The protocol test proves that the MCP server can start, list tools, and respond to safe tool calls without Claude Desktop, Claude Code, Cursor, VS Code, or any LLM.

See [MCP testing](docs/MCP_TESTING.md) for details.

## Optional live smoke tests

Live smoke tests are optional.

They:

* require a real `COSEVI_AUTH_KEY`
* should stay low-volume
* are read-only
* are not required for unit, schema, or protocol coverage
* may be used manually or by scheduled GitHub workflows when the repository secret is configured

Known low-volume test datastream:

```text
REGIS-DE-FALLE-EN-SITIO
```

## MCP server usage

This repository provides a local stdio MCP server, not a remote HTTP connector URL.

Build the SDK and MCP server:

```powershell
cd ".\javascript-sdk"
npm install
npm run build

cd "..\mcp-server"
npm install
npm run build
```

Run the MCP server directly:

```powershell
node .\dist\index.js
```

Configure your MCP client to run the local `mcp-server` command.

Example local MCP server command:

```json
{
  "command": "node",
  "args": [
    "C:\\Users\\maxry\\Desktop\\Github Repos\\cosevi-mcp-sdks\\mcp-server\\dist\\index.js"
  ],
  "env": {
    "COSEVI_AUTH_KEY": "YOUR_KEY",
    "COSEVI_BASE_URL": "https://cosevi.cloudapi.junar.com/api/v2",
    "COSEVI_REFERER": "https://datosabiertos.csv.go.cr/"
  }
}
```

General MCP client setup examples are documented in [MCP client configs](docs/MCP_CLIENTS.md).

## GitHub Actions

There are three workflows:

* `.github/workflows/javascript-sdk-tests.yml`
* `.github/workflows/python-sdk-tests.yml`
* `.github/workflows/mcp-server-tests.yml`

They:

* support manual dispatch
* run on the Monday 6:00 PM Costa Rica schedule using UTC fallback
* do not stop early
* always write Markdown summaries
* always upload report artifacts
* mask `COSEVI_AUTH_KEY` before any live smoke usage
* can run low-volume live smoke checks when the secret is configured

See [GitHub Actions](docs/GITHUB_ACTIONS.md) for details.

## Test inventory

Every public runtime method/export/tool is listed in:

* [Test inventory](docs/TEST_INVENTORY.md)

This inventory maps each public surface to a direct test file and test name.

## Documentation

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

## Safety

This project is read-only.

It does not implement COSEVI/Junar write operations, publishing operations, deletion operations, or administrative actions.

The MCP server validates inputs, redacts secrets, and truncates large output before returning content to MCP clients.
