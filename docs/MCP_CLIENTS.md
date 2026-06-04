# MCP Client Configurations

These configurations are for local IDE/client discovery and do not modify global Claude, Cursor, VS Code, or OS-level settings.

## Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "cosevi-open-data": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "COSEVI_BASE_URL": "https://cosevi.cloudapi.junar.com/api/v2",
        "COSEVI_REFERER": "https://datosabiertos.csv.go.cr/"
      }
    }
  }
}
```

Note: `COSEVI_AUTH_KEY` is read from your OS environment or `.env` file. Do not hardcode it here.

## VS Code MCP client (Shape B: `servers`)

```json
{
  "servers": {
    "cosevi-open-data": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "COSEVI_BASE_URL": "https://cosevi.cloudapi.junar.com/api/v2",
        "COSEVI_REFERER": "https://datosabiertos.csv.go.cr/"
      }
    }
  }
}
```

## Cursor (Shape A: `mcpServers`)

```json
{
  "mcpServers": {
    "cosevi-open-data": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "COSEVI_BASE_URL": "https://cosevi.cloudapi.junar.com/api/v2",
        "COSEVI_REFERER": "https://datosabiertos.csv.go.cr/"
      }
    }
  }
}
```

## Caveman

```json
{
  "mcpServers": {
    "caveman": {
      "command": "npx",
      "args": ["-y", "caveman"]
    }
  }
}
```

## Repo-local discovery files

The repository contains pre-filled configs for local client discovery:

- `/.mcp.json` — Shape A (`mcpServers`), generic
- `/.vscode/mcp.json` — Shape B (`servers`), VS Code
- `/.cursor/mcp.json` — Shape A (`mcpServers`), Cursor

If your client supports importing repo config, point it to one of these files. Otherwise copy the matching shape into the client's MCP settings.

## IDE/LLM client mapping

| Client | Config shape | Key |
|---|---|---|
| Claude Desktop | A | `mcpServers` |
| Claude Code | A | `mcpServers` |
| VS Code MCP client | B | `servers` |
| Cursor | A | `mcpServers` |
| Other MCP-compatible clients | Either | Depends on client |

## Credential note

`COSEVI_AUTH_KEY` is never hardcoded in MCP client config files. The credential is read with this precedence:

1. Explicit constructor value (code)
2. Local `.env` file in the MCP server working directory
3. OS environment variable

See [Credential Precedence](../README.md#credential-precedence) in the root README for setup instructions.

## Verify server starts

```powershell
cd ".\mcp-server"
npm install
npm run build
node .\dist\index.js
```

The server writes to stdio. If it starts without printing an error, it is ready for a client to connect.
