#!/usr/bin/env sh

set -eu

OUTPUT_ZIP="${1:-cosevi-mcp-sdks-source.zip}"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required but was not found in PATH." >&2
  exit 1
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_PATH="$SCRIPT_DIR/$OUTPUT_ZIP"

case "$OUTPUT_PATH" in
  *.zip) ;;
  *)
    OUTPUT_PATH="${OUTPUT_PATH}.zip"
    ;;
esac

rm -f "$OUTPUT_PATH"

cd "$SCRIPT_DIR"

zip -r "$OUTPUT_PATH" . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".venv/*" \
  -x "*/.venv/*" \
  -x "venv/*" \
  -x "*/venv/*" \
  -x "__pycache__/*" \
  -x "*/__pycache__/*" \
  -x "*.pyc" \
  -x "*.pyo" \
  -x "*.pyd"

echo "Created $OUTPUT_PATH"
