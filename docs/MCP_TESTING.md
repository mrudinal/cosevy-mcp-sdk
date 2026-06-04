# MCP Testing

The MCP server test strategy avoids live COSEVI calls and does not require an LLM.

## Layers

- Unit tests: mocked SDK client, direct handler delegation checks
- Schema tests: zod input validation checks
- Protocol tests: stdio server + MCP client SDK

## Commands

```powershell
cd ".\mcp-server"
npm test
npm run test:unit
npm run test:protocol
```

## Protocol test behavior

- starts a stdio MCP server
- uses a fake SDK client
- lists tools
- calls safe tools
- verifies the dummy secret is not exposed

## Live API usage

- unit tests: no live API
- schema tests: no live API
- protocol tests: no live API
- optional smoke only: live API, read-only, explicit opt-in
