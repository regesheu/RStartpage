#!/usr/bin/env python3
"""Independently parse and verify the actual Opera upload artifact."""
import base64
import hashlib
import io
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
version = json.loads((ROOT / 'manifest.json').read_text())['version']
path = ROOT / 'dist' / f'RStartpage-Opera-{version}.crx'
crx = path.read_bytes()
assert crx[:4] == b'Cr24', 'A renamed ZIP is not a CRX package'
format_version, size = struct.unpack('<II', crx[4:12])
assert format_version == 3 and 0 < size < 65536
header = crx[12:12 + size]
archive = crx[12 + size:]
assert archive.startswith(b'PK\x03\x04')


def fields(data):
    offset = 0
    def integer():
        nonlocal offset
        value = shift = 0
        while True:
            assert offset < len(data) and shift < 64
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if not byte & 128:
                return value
            shift += 7
    values = {}
    while offset < len(data):
        tag = integer()
        assert tag & 7 == 2, 'Unexpected protobuf wire type'
        length = integer()
        end = offset + length
        assert end <= len(data)
        values[tag >> 3] = data[offset:end]
        offset = end
    return values


parsed = fields(header)
proof = fields(parsed[3])
public, signature = proof[1], proof[2]
signed = parsed[10000]
assert fields(signed)[1] == hashlib.sha256(public).digest()[:16]
message = b'CRX3 SignedData\0' + struct.pack('<I', len(signed)) + signed + archive
with tempfile.TemporaryDirectory(dir=ROOT / 'dist') as folder:
    folder = Path(folder)
    (folder / 'public.der').write_bytes(public)
    (folder / 'signature').write_bytes(signature)
    command = ['openssl', 'dgst', '-sha256', '-verify', str(folder / 'public.der'),
               '-keyform', 'DER', '-signature', str(folder / 'signature')]
    assert subprocess.run(command, input=message, capture_output=True).returncode == 0
    assert subprocess.run(command, input=message[:-1] + bytes([message[-1] ^ 1]), capture_output=True).returncode != 0, 'Modified archive must invalidate the signature'

with zipfile.ZipFile(io.BytesIO(archive)) as package, zipfile.ZipFile(path.with_suffix('.zip')) as unpacked:
    assert 'manifest.json' in package.namelist()
    manifest = json.loads(package.read('manifest.json'))
    assert manifest['version'] == version == '1.9.0'
    assert base64.b64decode(manifest['key']) == public
    assert package.testzip() is None and unpacked.testzip() is None
    assert package.namelist() == unpacked.namelist()
    for name in package.namelist():
        assert not name.endswith('.pem') and 'persona.ini' not in name
        if name != 'manifest.json':
            assert package.read(name) == unpacked.read(name), name
    development = json.loads(unpacked.read('manifest.json'))
    assert development['version'] == version
    assert development['key'] == (ROOT / 'opera-public-key.txt').read_text().strip()
    assert {k:v for k,v in development.items() if k != 'key'} == {k:v for k,v in manifest.items() if k != 'key'}
print('Opera CRX3: signature, tamper rejection, package identity, root manifest, version, ZIP parity and private-key exclusion passed')
