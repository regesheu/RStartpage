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
  notes-sync.js
  drive-backups.js
  drive-worker.js
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

python3 "$ROOT_DIR/scripts/package-extension.py" "${1:-chrome}"
