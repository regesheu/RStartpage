#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 -m json.tool manifest.json >/dev/null
python3 scripts/validate-ui.py
node scripts/test-core.mjs

for file in ./*.js; do
  node --check "$file" >/dev/null
done

if rg -n '\bconfirm\(' --glob '*.js' >/dev/null; then
  echo 'Native confirm() remains in extension JavaScript' >&2
  exit 1
fi

echo 'Static verification passed'
