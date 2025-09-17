#!/usr/bin/env bash
set -euo pipefail

echo "[kn-editor-core] Building WASM package"
if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found. Please install: https://rustwasm.github.io/wasm-pack/" >&2
  echo "Skipping build. You can still use the JS fallback." >&2
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

wasm-pack build --release --target web --features rope
echo "[kn-editor-core] Build done. Artifacts in pkg/"

