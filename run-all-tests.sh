#!/usr/bin/env sh

set -u

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FAILURES=0

run_step() {
  STEP_NAME="$1"
  shift

  echo
  echo "==> $STEP_NAME"
  "$@"
  CODE=$?

  if [ "$CODE" -ne 0 ]; then
    echo "FAILED: $STEP_NAME (exit $CODE)"
    FAILURES=$((FAILURES + 1))
  else
    echo "PASSED: $STEP_NAME"
  fi
}

echo "Running local COSEVI toolkit tests from: $ROOT_DIR"
echo "Secrets are resolved by each package from its local .env or environment variables."

cd "$ROOT_DIR/javascript-sdk" || exit 1
run_step "javascript-sdk npm install" npm install
run_step "javascript-sdk npm audit" npm audit
run_step "javascript-sdk build" npm run build
run_step "javascript-sdk test" npm test

cd "$ROOT_DIR/python-sdk" || exit 1
if [ ! -d ".venv" ]; then
  run_step "python-sdk create venv" python -m venv .venv
fi
run_step "python-sdk install dev deps" ./.venv/Scripts/python.exe -m pip install -e ".[dev]"
run_step "python-sdk pytest" ./.venv/Scripts/python.exe -m pytest

cd "$ROOT_DIR/mcp-server" || exit 1
run_step "mcp-server npm install" npm install
run_step "mcp-server npm audit" npm audit
run_step "mcp-server build" npm run build
run_step "mcp-server test" npm test
run_step "mcp-server protocol test" npm run test:protocol

echo
if [ "$FAILURES" -ne 0 ]; then
  echo "Completed with $FAILURES failing step(s)."
  exit 1
fi

echo "All test steps passed."
