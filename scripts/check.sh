#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 -m json.tool manifest.json >/dev/null

python3 - <<'PY'
import json
import pathlib
import re
import struct
import zlib

root = pathlib.Path.cwd()
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))

if manifest.get("manifest_version") != 3:
    raise SystemExit("manifest_version must be 3")

version = manifest.get("version", "")
if not re.fullmatch(r"(?:0|[1-9]\\d*)(?:\\.(?:0|[1-9]\\d*)){0,3}", version):
    raise SystemExit(f"Invalid Chrome extension version: {version!r}")

client_id = (manifest.get("oauth2") or {}).get("client_id", "")
if client_id and re.search(r"REPLACE|PLACEHOLDER|YOUR_", client_id, re.I):
    raise SystemExit("Placeholder OAuth client_id must not be shipped")

required_sizes = {"16": 16, "32": 32, "48": 48, "128": 128}
icons = manifest.get("icons") or {}

def validate_png(path: pathlib.Path, expected_size: int) -> None:
    data = path.read_bytes()
    if data[:8] != b"\\x89PNG\\r\\n\\x1a\\n":
        raise SystemExit(f"{path}: not a PNG")
    pos = 8
    width = height = None
    saw_iend = False
    while pos + 12 <= len(data):
        length = struct.unpack(">I", data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        end = pos + 12 + length
        if end > len(data):
            raise SystemExit(f"{path}: truncated PNG chunk")
        chunk_data = data[pos+8:pos+8+length]
        stored_crc = struct.unpack(">I", data[pos+8+length:end])[0]
        actual_crc = zlib.crc32(chunk_type)
        actual_crc = zlib.crc32(chunk_data, actual_crc) & 0xffffffff
        if stored_crc != actual_crc:
            raise SystemExit(f"{path}: invalid PNG CRC in {chunk_type!r}")
        if chunk_type == b"IHDR":
            width, height = struct.unpack(">II", chunk_data[:8])
        if chunk_type == b"IEND":
            saw_iend = True
            if end != len(data):
                raise SystemExit(f"{path}: trailing bytes after IEND")
            break
        pos = end
    if not saw_iend:
        raise SystemExit(f"{path}: missing IEND chunk")
    if (width, height) != (expected_size, expected_size):
        raise SystemExit(f"{path}: expected {expected_size}x{expected_size}, got {width}x{height}")

for key, size in required_sizes.items():
    icon_path = icons.get(key)
    if not icon_path:
        raise SystemExit(f"manifest.icons is missing {key}x{key}")
    path = root / icon_path
    if not path.is_file():
        raise SystemExit(f"Missing icon file: {icon_path}")
    validate_png(path, size)

print("Manifest and PNG icons validated")
PY

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
