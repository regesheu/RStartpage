#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 <major.minor.patch>" >&2
  exit 1
fi

python3 - "$1" <<'PY'
import json, sys
from pathlib import Path
version = sys.argv[1]
p = Path('manifest.json')
data = json.loads(p.read_text(encoding='utf-8'))
data['version'] = version
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
PY

echo "manifest.json version -> $1"
