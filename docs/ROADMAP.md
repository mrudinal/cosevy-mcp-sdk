# Roadmap

## Current MVP (v0.1.0)

All three layers (JS SDK, Python SDK, MCP server) cover the same read-only COSEVI/Junar API surface:

- Catalog search, datasets, datastreams, visualizations, dashboards
- Datastream data in all Junar formats (pjson, json, ajson, csv, xml, xls, jsonp)
- Datastream query expressions (filters, where, orderBy, groupBy, functions, pArgumentN)
- Portal statistics
- 12 known COSEVI dashboards with typed constants
- 8 domain shortcut MCP tools
- Rate limiting (4 req/s), retry on 429 and 5xx, Retry-After header support
- Safe pagination (max 5 pages × 100 rows)
- Auth key redaction in all error paths

## Next steps

1. Async Python client using `httpx.AsyncClient` or `aiohttp`
2. CLI tool wrapping the JS SDK for quick terminal queries
3. MCP resource/prompt support (not just tools)
4. Pagination cursor support if Junar adds it
5. Confirm package name availability (`cosevi-open-data` on npm and PyPI)
6. Replace placeholder GitHub org in all package.json / pyproject.toml metadata
7. Set up CI (GitHub Actions) for automated test runs on PRs
8. Add integration test suite that runs against live API (gated behind env var)
