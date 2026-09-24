#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# The public repository stores the larger extension sources in a compressed,
# chunked source bundle so they can be restored deterministically before a
# release is built.
if [[ -d "$ROOT_DIR/source-bundle" ]]; then
  bash "$ROOT_DIR/scripts/bootstrap-source.sh"
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
  proxy-help.html
  proxy-help.js
  proxy-help.css
  tools-shared.js
  tools.js
  sessions.html
  sessions.js
  notes.html
  notes.js
  notes-shared.js
  drive-shared.js
  settings.html
  settings.js
  settings-data.js
  transfer-shared.js
  vendor/jszip.min.js
  refinement.css
  settings.css
  data.js
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
  icons/transparent.svg
  glass.css
  assets/alpine-night.png
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Required extension file is missing: $file" >&2
    exit 1
  fi
done

# Run the full release verification before packaging.
bash "$ROOT_DIR/scripts/check.sh"

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
  -x '.git' '.git/*' \
     '.github/*' \
     'dist/*' \
     'docs/*' \
     'store/*' \
     'scripts/*' \
     'source-bundle/*' \
     'pw-profile-*' \
     'pw-tmp/*' \
     '.gitignore' \
     'README.md' \
     'CHANGELOG.md' \
     'PRIVACY.md' \
     'STORE_LISTING.md' \
     'SECURITY.md' \
     'DESIGN.md' \
     'UX-CONTRACT.md' \
     'premium-ui.json' \
     '*.DS_Store' >/dev/null

echo "$OUT_FILE"
