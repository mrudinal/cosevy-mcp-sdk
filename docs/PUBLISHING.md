# Publishing Preparation

Do not publish from this repository until package names, repository URLs, and release credentials are verified.

Final repository destination:
`https://github.com/mrudinal/cosevy-mcp-sdk`

## Package names to verify

- PyPI: `cosevi-open-data`
- npm: `cosevi-open-data`
- npm: `cosevi-open-data-mcp`

Availability must be confirmed before any release.

## JavaScript SDK release-prep

```powershell
cd javascript-sdk
npm install
npm run build
npm test
npm audit --omit=dev
npm pack --dry-run
```

Optional combined check:

```powershell
npm run release:check
```

## Python SDK release-prep

```powershell
cd python-sdk
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
pytest
python -m build
```

## MCP server release-prep

```powershell
cd javascript-sdk
npm install
npm run build

cd mcp-server
npm install
npm run build
npm test
npm audit --omit=dev
npm pack --dry-run
```

Optional combined check:

```powershell
npm run release:check
```

## Final pre-publish checklist

- Verify package names are still available.
- Replace placeholder repository metadata if needed.
- Confirm README instructions match the final package behavior.
- Confirm no real `.env` files or secrets are present in the repository.
- Confirm live smoke tests were run locally only when needed.
