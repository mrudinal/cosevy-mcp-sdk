# This script runs all local package installs, audits, builds, and tests.

$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$failures = 0

# Runs each named test step and records failures for the final summary.
function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Name"

    & $Action
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $Name (exit $LASTEXITCODE)"
        $script:failures++
    } else {
        Write-Host "PASSED: $Name"
    }
}

Write-Host "Running local COSEVI toolkit tests from: $root"
Write-Host "Secrets are resolved by each package from its local .env or environment variables."

Set-Location (Join-Path $root "javascript-sdk")
Invoke-Step "javascript-sdk npm install" { npm install }
Invoke-Step "javascript-sdk npm audit" { npm audit }
Invoke-Step "javascript-sdk build" { npm run build }
Invoke-Step "javascript-sdk test" { npm test }

Set-Location (Join-Path $root "python-sdk")
if (!(Test-Path ".venv")) {
    Invoke-Step "python-sdk create venv" { python -m venv .venv }
}
Invoke-Step "python-sdk install dev deps" { .\.venv\Scripts\python.exe -m pip install -e ".[dev]" }
Invoke-Step "python-sdk pytest" { .\.venv\Scripts\python.exe -m pytest }

Set-Location (Join-Path $root "mcp-server")
Invoke-Step "mcp-server npm install" { npm install }
Invoke-Step "mcp-server npm audit" { npm audit }
Invoke-Step "mcp-server build" { npm run build }
Invoke-Step "mcp-server test" { npm test }
Invoke-Step "mcp-server protocol test" { npm run test:protocol }

Set-Location $root

Write-Host ""
if ($failures -gt 0) {
    Write-Host "Completed with $failures failing step(s)."
    exit 1
}

Write-Host "All test steps passed."
