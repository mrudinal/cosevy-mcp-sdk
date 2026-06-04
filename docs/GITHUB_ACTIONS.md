# GitHub Actions

## Workflows

- `.github/workflows/javascript-sdk-tests.yml`
- `.github/workflows/python-sdk-tests.yml`
- `.github/workflows/mcp-server-tests.yml`

## Schedule

UTC fallback used here:

- Monday 6:00 PM Costa Rica = Tuesday 00:00 UTC
- cron: `0 0 * * 2`

## Dispatch input

All workflows expose:

- `run_live_smoke` — optional boolean

If `run_live_smoke=false`, smoke is skipped.

If `run_live_smoke=true` but `COSEVI_AUTH_KEY` is missing, the workflow logs:

- `SKIPPED - COSEVI_AUTH_KEY secret not configured.`

## Reporting

Every workflow:

- keeps running instead of stopping early
- writes a Markdown summary to `GITHUB_STEP_SUMMARY`
- uploads logs and reports as artifacts

## Secrets

- `COSEVI_AUTH_KEY` is masked when present
- unit/integration/protocol tests do not require the secret
- only optional smoke steps use it
