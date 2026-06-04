# Testing With a Real API Key

Real keys are optional and are not required for unit, integration, or protocol coverage.

## Local smoke

Configure one package-local `.env` file:

```env
COSEVI_AUTH_KEY=YOUR_KEY
COSEVI_BASE_URL=https://cosevi.cloudapi.junar.com/api/v2
COSEVI_REFERER=https://datosabiertos.csv.go.cr/
```

Then run only explicit smoke commands for the package you want to verify.

## GitHub Actions smoke

Secret name:

- `COSEVI_AUTH_KEY`

Only manual dispatch with `run_live_smoke=true` attempts live smoke.

## Rules

- keep traffic low
- keep reads small
- do not print the key
- keep everything read-only
