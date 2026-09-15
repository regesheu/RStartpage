#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# The public repository stores the larger extension sources in a compressed,
# chunked source bundle so they can be restored deterministically before a
# release is built.
if [[ -d "$ROOT_DIR/source-bundle" ]]; then
  "$ROOT_DIR/scripts/bootstrap-source.sh"
fi

VERSION="$(python3 - <<'PY'
import json
print(json.load(open('manifest.json', encoding='utf-8'))['version'])
PY
)"

REQUIRED_FILES=(
  manifest.json
  newtab.html
  app.js
  shared.js
  styles.css
  background.js
  popup.html
  popup.js
  proxy-shared.js
  proxy.js
  tools-shared.js
  tools.js
  data.js
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Required extension file is missing: $file" >&2
    exit 1
  fi
done

# Catch syntax errors before publishing a release.
for file in ./*.js; do
  node --check "$file" >/dev/null
  echo "Validated $(basename "$file")"
done

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
