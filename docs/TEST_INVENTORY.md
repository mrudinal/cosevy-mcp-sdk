# Test Inventory

One row per public method, export, or tool. Test file and test name are exact.

| Public method / export / tool | Layer | Test file | Test name | Status |
|---|---|---|---|---|
| `CoseviClient` constructor | JS SDK | `javascript-sdk/tests/client.test.ts` | `reads constructor env config and supports baseUrl override` | Tested |
| `CoseviClient` constructor (throws on missing key) | JS SDK | `javascript-sdk/tests/client.test.ts` | `throws if no API key is configured` | Tested |
| `CoseviClient.fromEnv` | JavaScript SDK | `javascript-sdk/tests/env-config.test.ts` | `CoseviClient.fromEnv creates a client from resolved environment configuration` | Covered |
| `loadCoseviConfig` | JS SDK | `javascript-sdk/tests/env-config.test.ts` | `constructor value wins` | Tested |
| `loadCoseviConfig` (.env reads) | JS SDK | `javascript-sdk/tests/env-config.test.ts` | `loads dotenv values when present` | Tested |
| `loadCoseviConfig` (OS env fallback) | JS SDK | `javascript-sdk/tests/env-config.test.ts` | `falls back to process environment and defaults` | Tested |
| `loadCoseviConfig` (.env > OS env precedence) | JS SDK | `javascript-sdk/tests/env-config.test.ts` | `.env value wins over OS environment variable` | Tested |
| `DEFAULT_COSEVI_BASE_URL` | JS SDK | `javascript-sdk/tests/public-api.test.ts` | `exports the documented runtime surface` | Tested |
| `DEFAULT_COSEVI_REFERER` | JS SDK | `javascript-sdk/tests/public-api.test.ts` | `exports the documented runtime surface` | Tested |
| `CoseviApiError` | JS SDK | `javascript-sdk/tests/errors.test.ts` | `creates API and auth errors with safe fields` | Tested |
| `CoseviAuthError` | JS SDK | `javascript-sdk/tests/errors.test.ts` | `creates API and auth errors with safe fields` | Tested |
| `CoseviConfigError` | JS SDK | `javascript-sdk/tests/errors.test.ts` | `creates config errors` | Tested |
| `CoseviRateLimitError` | JS SDK | `javascript-sdk/tests/errors.test.ts` | `creates rate limit errors with retry metadata` | Tested |
| `KNOWN_COSEVI_DASHBOARDS` | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `exports top-level helper functions and constant list` | Tested |
| `listKnownDashboards` (standalone) | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `exports top-level helper functions and constant list` | Tested |
| `getKnownDashboard` (standalone) | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `exports top-level helper functions and constant list` | Tested |
| `CoseviClient.searchResources` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds searchResources with expected params` | Tested |
| `CoseviClient.listDatasets` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds list/get metadata endpoints with GUID URL encoding` | Tested |
| `CoseviClient.getDataset` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds list/get metadata endpoints with GUID URL encoding` | Tested |
| `CoseviClient.listDatastreams` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds list/get metadata endpoints with GUID URL encoding` | Tested |
| `CoseviClient.getDatastream` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds list/get metadata endpoints with GUID URL encoding` | Tested |
| `CoseviClient.getDatastreamData` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds getDatastreamData with mappings for parameters, formatConfig, applyFormat and expressions` | Tested |
| `CoseviClient.getDatastreamRawText` | JS SDK | `javascript-sdk/tests/client.test.ts` | `returns text for getDatastreamRawText in csv, xml and jsonp formats` | Tested |
| `CoseviClient.getDatastreamTableau` | JS SDK | `javascript-sdk/tests/client.test.ts` | `builds getDatastreamTableau and uses html accept header` | Tested |
| `CoseviClient.listVisualizations` | JS SDK | `javascript-sdk/tests/metadata-endpoints.test.ts` | `targets dataset, datastream, visualization, dashboard endpoints` | Tested |
| `CoseviClient.getVisualization` | JS SDK | `javascript-sdk/tests/metadata-endpoints.test.ts` | `targets dataset, datastream, visualization, dashboard endpoints` | Tested |
| `CoseviClient.listDashboards` | JS SDK | `javascript-sdk/tests/metadata-endpoints.test.ts` | `targets dataset, datastream, visualization, dashboard endpoints` | Tested |
| `CoseviClient.getDashboard` | JS SDK | `javascript-sdk/tests/metadata-endpoints.test.ts` | `targets dataset, datastream, visualization, dashboard endpoints` | Tested |
| `CoseviClient.extractDashboardResources` | JS SDK | `javascript-sdk/tests/client.test.ts` | `supports extractDashboardResources and portal stats` | Tested |
| `CoseviClient.getPortalStats` | JS SDK | `javascript-sdk/tests/client.test.ts` | `supports extractDashboardResources and portal stats` | Tested |
| `CoseviClient.listKnownDashboards` | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `client helper methods mirror top-level helpers` | Tested |
| `CoseviClient.getKnownDashboard` | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `client helper methods mirror top-level helpers` | Tested |
| `CoseviClient.getKnownDashboardData` | JS SDK | `javascript-sdk/tests/known-dashboards.test.ts` | `delegates known dashboard data lookup through getDashboard` | Tested |
| `CoseviClient.discoverResourcesByTopic` | JS SDK | `javascript-sdk/tests/pagination.test.ts` | `discovery helper delegates to resource search` | Tested |
| `CoseviClient.iterateResources` | JS SDK | `javascript-sdk/tests/pagination.test.ts` | `iterateResources enforces hard caps` | Tested |
| `CoseviClient.iterateDatastreamData` | JS SDK | `javascript-sdk/tests/pagination.test.ts` | `iterateDatastreamData enforces hard caps` | Tested |
| `CoseviClient.buildFilter` | JS SDK | `javascript-sdk/tests/public-api.test.ts` | `exposes buildFilter and sanitized config helpers` | Tested |
| `CoseviClient.getSanitizedConfig` | JS SDK | `javascript-sdk/tests/public-api.test.ts` | `exposes buildFilter and sanitized config helpers` | Tested |
| `CoseviClient.getResolvedConfigSource` | JS SDK | `javascript-sdk/tests/env-config.test.ts` | `is surfaced through CoseviClient without exposing the secret` | Tested |
| `CoseviClient.__init__` | Python SDK | `python-sdk/tests/test_client.py` | `test_constructor_env_config_and_base_url_override` | Tested |
| `CoseviClient.__init__` (throws on missing key) | Python SDK | `python-sdk/tests/test_client.py` | `test_missing_api_key_raises` | Tested |
| `CoseviClient.from_env` | Python SDK | `python-sdk/tests/test_env_config.py` | `test_cosevi_client_from_env_creates_client_from_resolved_environment` | Covered |
| `resolve_cosevi_config` (constructor wins) | Python SDK | `python-sdk/tests/test_env_config.py` | `test_resolve_cosevi_config_prefers_constructor` | Tested |
| `resolve_cosevi_config` (.env reads) | Python SDK | `python-sdk/tests/test_env_config.py` | `test_resolve_cosevi_config_reads_dotenv` | Tested |
| `resolve_cosevi_config` (OS env fallback) | Python SDK | `python-sdk/tests/test_env_config.py` | `test_resolve_cosevi_config_falls_back_to_environment` | Tested |
| `resolve_cosevi_config` (.env > OS env) | Python SDK | `python-sdk/tests/test_env_config.py` | `test_dotenv_wins_over_os_environment` | Tested |
| `DEFAULT_COSEVI_BASE_URL` | Python SDK | `python-sdk/tests/test_public_api.py` | `test_public_api_exports` | Tested |
| `DEFAULT_COSEVI_REFERER` | Python SDK | `python-sdk/tests/test_public_api.py` | `test_public_api_exports` | Tested |
| `CoseviApiError` | Python SDK | `python-sdk/tests/test_errors.py` | `test_error_classes_expose_expected_fields` | Tested |
| `CoseviAuthError` | Python SDK | `python-sdk/tests/test_errors.py` | `test_error_classes_expose_expected_fields` | Tested |
| `CoseviConfigError` | Python SDK | `python-sdk/tests/test_errors.py` | `test_error_classes_expose_expected_fields` | Tested |
| `CoseviRateLimitError` | Python SDK | `python-sdk/tests/test_errors.py` | `test_error_classes_expose_expected_fields` | Tested |
| `KNOWN_COSEVI_DASHBOARDS` | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_top_level_known_dashboard_helpers` | Tested |
| `list_known_dashboards` (standalone) | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_top_level_known_dashboard_helpers` | Tested |
| `get_known_dashboard` (standalone) | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_top_level_known_dashboard_helpers` | Tested |
| `CoseviClient.search_resources` | Python SDK | `python-sdk/tests/test_client.py` | `test_search_resources_builds_expected_request` | Tested |
| `CoseviClient.list_datasets` | Python SDK | `python-sdk/tests/test_client.py` | `test_metadata_endpoints_and_guid_encoding` | Tested |
| `CoseviClient.get_dataset` | Python SDK | `python-sdk/tests/test_client.py` | `test_metadata_endpoints_and_guid_encoding` | Tested |
| `CoseviClient.list_datastreams` | Python SDK | `python-sdk/tests/test_client.py` | `test_metadata_endpoints_and_guid_encoding` | Tested |
| `CoseviClient.get_datastream` | Python SDK | `python-sdk/tests/test_client.py` | `test_metadata_endpoints_and_guid_encoding` | Tested |
| `CoseviClient.get_datastream_data` | Python SDK | `python-sdk/tests/test_client.py` | `test_datastream_data_mapping_and_accept_headers` | Tested |
| `CoseviClient.get_datastream_raw_text` | Python SDK | `python-sdk/tests/test_client.py` | `test_raw_text_and_tableau_endpoints` | Tested |
| `CoseviClient.get_datastream_tableau` | Python SDK | `python-sdk/tests/test_client.py` | `test_raw_text_and_tableau_endpoints` | Tested |
| `CoseviClient.list_visualizations` | Python SDK | `python-sdk/tests/test_metadata_endpoints.py` | `test_metadata_endpoints` | Tested |
| `CoseviClient.get_visualization` | Python SDK | `python-sdk/tests/test_metadata_endpoints.py` | `test_metadata_endpoints` | Tested |
| `CoseviClient.list_dashboards` | Python SDK | `python-sdk/tests/test_metadata_endpoints.py` | `test_metadata_endpoints` | Tested |
| `CoseviClient.get_dashboard` | Python SDK | `python-sdk/tests/test_metadata_endpoints.py` | `test_metadata_endpoints` | Tested |
| `CoseviClient.extract_dashboard_resources` | Python SDK | `python-sdk/tests/test_client.py` | `test_extract_dashboard_resources_and_portal_stats` | Tested |
| `CoseviClient.get_portal_stats` | Python SDK | `python-sdk/tests/test_client.py` | `test_extract_dashboard_resources_and_portal_stats` | Tested |
| `CoseviClient.list_known_dashboards` | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_client_known_dashboard_helpers_delegate_to_get_dashboard` | Tested |
| `CoseviClient.get_known_dashboard` | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_client_known_dashboard_helpers_delegate_to_get_dashboard` | Tested |
| `CoseviClient.get_known_dashboard_data` | Python SDK | `python-sdk/tests/test_known_dashboards.py` | `test_client_known_dashboard_helpers_delegate_to_get_dashboard` | Tested |
| `CoseviClient.discover_resources_by_topic` | Python SDK | `python-sdk/tests/test_pagination.py` | `test_discover_resources_by_topic_delegates_to_search` | Tested |
| `CoseviClient.iter_resources` | Python SDK | `python-sdk/tests/test_pagination.py` | `test_iter_resources_enforces_hard_caps` | Tested |
| `CoseviClient.iter_datastream_data` | Python SDK | `python-sdk/tests/test_pagination.py` | `test_iter_datastream_data_enforces_hard_caps` | Tested |
| `CoseviClient.build_filter` | Python SDK | `python-sdk/tests/test_public_api.py` | `test_build_filter_and_sanitized_config` | Tested |
| `CoseviClient.get_sanitized_config` | Python SDK | `python-sdk/tests/test_public_api.py` | `test_build_filter_and_sanitized_config` | Tested |
| `CoseviClient.get_resolved_config_source` | Python SDK | `python-sdk/tests/test_env_config.py` | `test_client_reports_sanitized_config_source` | Tested |
| `CoseviClient.__enter__` / `__exit__` | Python SDK | — | Not implemented | N/A |
| `CoseviClient.close` | Python SDK | — | Not implemented | N/A |
| `cosevi_health_check` | MCP | `mcp-server/tests/tools.unit.test.ts` | `health check does not call network by default and reports sanitized metadata` | Tested |
| `cosevi_search_resources` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_list_datasets` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_dataset` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_list_datastreams` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_datastream` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_datastream_data` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_query_datastream` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_datastream_raw` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_datastream_tableau` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_list_visualizations` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_visualization` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_list_dashboards` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_dashboard_resources` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_portal_stats` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_list_known_dashboards` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_known_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_known_dashboard_data` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_fatalities_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_fatalities_table_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_accidents_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_accidents_table_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_infractions_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_infractions_by_article_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_licenses_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_get_driving_tests_dashboard` | MCP | `mcp-server/tests/tools.unit.test.ts` | `maps domain shortcut tools to the expected dashboard guids` | Tested |
| `cosevi_discover_resources_by_topic` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_resource_pages` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `cosevi_get_datastream_pages` | MCP | `mcp-server/tests/tools.unit.test.ts` | `delegates list/get/query tools to the matching sdk methods` | Tested |
| `safeJsonText` | MCP helpers | `mcp-server/tests/format.test.ts` | `redacts auth_key in objects` | Tested |
| `safeErrorText` | MCP helpers | `mcp-server/tests/format.test.ts` | `redacts auth_key from error message` | Tested |
| `summarizeListResponse` | MCP helpers | `mcp-server/tests/format.test.ts` | `returns total/showing/results structure from array` | Tested |
| `toTextContent` | MCP server | `mcp-server/tests/format.test.ts` | `toTextContent wraps safe text in MCP content format` | Covered |
| `toErrorContent` | MCP server | `mcp-server/tests/format.test.ts` | `toErrorContent wraps safe error text in MCP error content format` | Covered |
| `toRawTextContent` | MCP helpers | `mcp-server/tests/format.test.ts` | `returns text unchanged when within limit` | Tested |
| `registerCoseviTools` | MCP helpers | `mcp-server/tests/tools.unit.test.ts` | `registers all expected tools` | Tested |

## Tool schema coverage

All 30 MCP tool schemas are validated in `mcp-server/tests/schemas.test.ts` under the generated test name pattern `${definition.name} accepts a minimum valid input`.

## Type-only exports (Documented)

The following are TypeScript type aliases or interfaces with no runtime footprint. They appear in the public API surface but require no separate test row.

| Export | File |
|---|---|
| `KnownCoseviDashboard` | `javascript-sdk/src/known-dashboards.ts` |
| `ApplyFormat` | `javascript-sdk/src/types.ts` |
| `CoseviClientOptions` | `javascript-sdk/src/types.ts` |
| `DatastreamFormat` | `javascript-sdk/src/types.ts` |
| `DatastreamQueryInput` | `javascript-sdk/src/types.ts` |
| `DatastreamRawInput` | `javascript-sdk/src/types.ts` |
| `ListOptions` | `javascript-sdk/src/types.ts` |
| `PortalStatsInput` | `javascript-sdk/src/types.ts` |
| `ResourceType` | `javascript-sdk/src/types.ts` |
| `CoseviConfigInput` | `javascript-sdk/src/config.ts` |
| `CoseviResolvedConfig` | `javascript-sdk/src/config.ts` |
| `CoseviToolDefinition` | `mcp-server/src/tools.ts` |
