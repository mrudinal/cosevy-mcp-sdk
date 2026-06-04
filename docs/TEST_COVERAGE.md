# Test Coverage Summary

JavaScript SDK Vitest tests run locally and in GitHub Actions.
MCP Vitest tests run locally and in GitHub Actions.
MCP protocol tests run without an LLM by starting the server over stdio and using an MCP client.

## JavaScript SDK

| Area | Coverage |
|---|---|
| Public exports | Verified (`public-api.test.ts`) |
| Config loading and credential precedence | Verified (`env-config.test.ts`) |
| `.env` wins over OS env | Verified (`env-config.test.ts`) |
| Metadata endpoints | Verified (`metadata-endpoints.test.ts`, `client.test.ts`) |
| Datastream formats and accept headers | Verified (`datastream-data.test.ts`, `client.test.ts`) |
| Query mapping and reserved param rejection | Verified (`query-params.test.ts`) |
| Known dashboard helpers | Verified (`known-dashboards.test.ts`) |
| Pagination and discovery helpers | Verified (`pagination.test.ts`) |
| Retry and rate-limit behavior | Verified (`rate-limit.test.ts`) |
| Error classes and safe URL redaction | Verified (`errors.test.ts`) |
| Portal stats `group_by` param name | Verified (`client.test.ts`) |

## Python SDK

| Area | Coverage |
|---|---|
| Public exports | Verified (`test_public_api.py`) |
| Config loading and credential precedence | Verified (`test_env_config.py`) |
| `.env` wins over OS env | Verified (`test_env_config.py`) |
| Metadata endpoints | Verified (`test_metadata_endpoints.py`, `test_client.py`) |
| Datastream formats and accept headers | Verified (`test_datastream_data.py`, `test_client.py`) |
| Query mapping and reserved param rejection | Verified (`test_query_params.py`) |
| Known dashboard helpers | Verified (`test_known_dashboards.py`) |
| Pagination and discovery helpers | Verified (`test_pagination.py`) |
| Retry and rate-limit behavior | Verified (`test_rate_limit.py`) |
| Error classes and safe URL redaction | Verified (`test_errors.py`) |
| Portal stats `group_by` param name | Verified (`test_client.py`) |

## MCP Server

| Area | Coverage |
|---|---|
| Full 30-tool registry asserted | Verified (`public-tools.test.ts`) |
| Domain GUID mapping for shortcut tools | Verified (`public-tools.test.ts`) |
| Delegation checks for all 30 tools | Verified (`tools.unit.test.ts`) |
| Schema validation (valid and invalid inputs) | Verified (`schemas.test.ts`) |
| Format helper redaction and truncation | Verified (`format.test.ts`) |
| Env-config and sanitized health output | Verified (`env-config.test.ts`) |
| Stdio protocol without LLM | Verified (`protocol.test.ts`) |
