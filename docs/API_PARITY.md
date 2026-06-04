# API Parity

## Shared read-only surface

Both SDKs provide:

- catalog search
- dataset metadata
- datastream metadata
- datastream data / raw text / tableau
- visualization metadata
- dashboard metadata
- dashboard resource extraction
- portal stats
- known dashboard helpers
- discovery helper
- bounded pagination helpers
- sanitized config reporting

## MCP subset

The MCP server exposes the same read-only domain through tool calls, but intentionally:

- truncates oversized output
- redacts secret-like values
- keeps pagination bounded
- avoids uncontrolled raw iteration from the protocol surface
