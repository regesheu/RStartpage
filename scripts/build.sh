#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(python3 - <<'PY'
import json
print(json.load(open('manifest.json', encoding='utf-8'))['version'])
PY
)"

OUT_DIR="$ROOT_DIR/dist"
OUT_FILE="$OUT_DIR/RStartpage-${VERSION}.zip"
mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

zip -r "$OUT_FILE" . \
  -x '.git/*' \
     '.github/*' \
     'dist/*' \
     'docs/*' \
     'store/*' \
     'scripts/*' \
     'source-bundle/*' \
     '.gitignore' \
     'README.md' \
     'CHANGELOG.md' \
     'PRIVACY.md' \
     'STORE_LISTING.md' \
     'SECURITY.md' \
     '*.DS_Store' >/dev/null

echo "$OUT_FILE"
