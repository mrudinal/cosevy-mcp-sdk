# Configuration

## MCP Client Configuration

This repository includes repo-local MCP configuration for Caveman.

### Caveman server command

```json
{
	"command": "npx",
	"args": ["-y", "caveman"]
}
```

### Repo-local client files

Use the file that matches your IDE/LLM client:

- Generic MCP clients that read `.mcp.json`: `/.mcp.json`
- VS Code MCP client config: `/.vscode/mcp.json`
- Cursor MCP client config: `/.cursor/mcp.json`

Current repository values:

`/.mcp.json`

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

`/.vscode/mcp.json`

```json
{
	"servers": {
		"caveman": {
			"command": "npx",
			"args": ["-y", "caveman"]
		}
	}
}
```

`/.cursor/mcp.json`

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

### Claude Desktop / Claude Code

For Claude Desktop or Claude Code, configure the MCP server as a local stdio command (not a remote URL). The MCP server package example is documented in `mcp-server/README.md`.

## Resolution order

All three packages follow the same credential resolution rule:

1. package-local `.env`
2. process environment / `os.environ`
3. GitHub Actions secret only for optional live smoke

Windows does not need registry-specific logic. Node and Python already see Windows environment variables through `process.env` and `os.environ`.

## Values

- `COSEVI_AUTH_KEY`
- `COSEVI_BASE_URL`
- `COSEVI_REFERER`

Defaults:

- `COSEVI_BASE_URL`: `https://cosevi.cloudapi.junar.com/api/v2`
- `COSEVI_REFERER`: `https://datosabiertos.csv.go.cr/`

## Sanitized diagnostics

The MCP health check reports:

- `hasApiKey`
- `baseUrl`
- `hasReferer`
- `apiKeySource`
- `os`

It never returns the actual key.
