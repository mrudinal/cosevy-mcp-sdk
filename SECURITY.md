# Security Policy

## API keys

- Do not commit COSEVI/Junar API keys.
- Use `.env` or host-level secret storage.
- The MCP server must read `COSEVI_AUTH_KEY` from the environment.
- Keep the MCP server read-only.

## MCP safety

This project exposes public open data. It must not expose tools that execute shell commands, read arbitrary local files, or write to external systems.

## Rate limits

Junar public API usage should be throttled below 5 requests per second. The clients should default to conservative usage and allow caching at the app layer.
