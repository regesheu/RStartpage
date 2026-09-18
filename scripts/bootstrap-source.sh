#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import base64
import pathlib
import tarfile
import tempfile

root = pathlib.Path.cwd()
parts = sorted((root / 'source-bundle').glob('part*'))
if not parts:
    raise SystemExit('source-bundle parts are missing')

payload = ''.join(part.read_text(encoding='utf-8').strip() for part in parts)
archive_bytes = base64.b64decode(payload)

with tempfile.NamedTemporaryFile(suffix='.tar.gz') as tmp:
    tmp.write(archive_bytes)
    tmp.flush()
    with tarfile.open(tmp.name, 'r:gz') as tar:
        for member in tar.getmembers():
            target = (root / member.name).resolve()
            if root.resolve() not in target.parents and target != root.resolve():
                raise SystemExit(f'Unsafe path in source bundle: {member.name}')
        try:
            tar.extractall(root, filter='data')
        except TypeError:  # Python < 3.12
            tar.extractall(root)

print(f'Restored {len(parts)} source bundle parts into {root}')
PY

if [[ -f "$ROOT_DIR/scripts/patch-proxy-routing.py" ]]; then
  python3 "$ROOT_DIR/scripts/patch-proxy-routing.py"
fi
