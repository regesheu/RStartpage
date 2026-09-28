#!/usr/bin/env python3
"""Create a real CRX3 upload package, leaving the unpacked-development ZIP intact.

Format: Chromium components/crx_file/crx3.proto. ECDSA P-256 / SHA-256 proof.
The private packaging key stays outside both extension archives.
"""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import zipfile


def field(number, value):
    def varint(n):
        result = bytearray()
        while n > 127:
            result.append((n & 127) | 128)
            n >>= 7
        result.append(n)
        return bytes(result)
    return varint(number * 8 + 2) + varint(len(value)) + value


def run(*args, data=None):
    return subprocess.check_output(['openssl', *map(str, args)], input=data, stderr=subprocess.PIPE)


def package(archive):
    archive = Path(archive)
    key_path = archive.parent / 'opera-package-key.pem'
    configured = os.environ.get('OPERA_PACKAGE_PRIVATE_KEY_PEM', '')
    if configured:
        # Restrictive permissions before writing, including on reruns.
        fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        os.chmod(key_path, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(configured)
    elif not key_path.exists():
        private = run('genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256')
        fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as output:
            output.write(private)
    public = run('pkey', '-in', key_path, '-pubout', '-outform', 'DER')
    # Reject a wrong algorithm instead of emitting a proof mislabeled as P-256.
    details = run('pkey', '-in', key_path, '-text_pub', '-noout').decode()
    if 'prime256v1' not in details:
        raise ValueError('Opera CRX packaging requires an EC P-256 private key')
    crx_id = hashlib.sha256(public).digest()[:16]
    extension_id = ''.join('abcdefghijklmnop'[int(n, 16)] for n in crx_id.hex())
    payload = io.BytesIO()
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(payload, 'w') as target:
        for entry in source.infolist():
            data = source.read(entry.filename)
            if entry.filename == 'manifest.json':
                manifest = json.loads(data)
                # A packed extension must use its signing identity, not the
                # separate fixed development key in the unpacked ZIP.
                manifest['key'] = base64.b64encode(public).decode()
                data = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
            if entry.filename.endswith('.pem'):
                raise ValueError('Private key must never enter an extension archive')
            target.writestr(entry, data)
    payload = payload.getvalue()
    signed = field(1, crx_id)
    message = b'CRX3 SignedData\0' + struct.pack('<I', len(signed)) + signed + payload
    signature = run('dgst', '-sha256', '-sign', key_path, data=message)
    proof = field(1, public) + field(2, signature)
    header = field(3, proof) + field(10000, signed)
    crx = archive.with_suffix('.crx')
    crx.write_bytes(b'Cr24' + struct.pack('<II', 3, len(header)) + header + payload)
    # Verify signature with the public key before returning the upload file.
    with tempfile.TemporaryDirectory(dir=archive.parent) as temp:
        temp = Path(temp)
        (temp / 'public.der').write_bytes(public)
        (temp / 'signature').write_bytes(signature)
        run('dgst', '-sha256', '-verify', temp / 'public.der', '-keyform', 'DER',
            '-signature', temp / 'signature', data=message)
    # Browsers may intercept direct .crx downloads as installation attempts.
    # This outer ZIP is only a transport container for the store upload file.
    download = archive.with_name(archive.stem + '-store.zip')
    with zipfile.ZipFile(download, 'w', zipfile.ZIP_DEFLATED) as output:
        output.write(crx, crx.name)
        output.writestr('UPLOAD-TO-OPERA.txt',
            'Extract this ZIP and select the .crx file at https://addons.opera.com/developer/\n'
            'Do not upload this outer ZIP to the store. Do not drag the CRX into the browser.\n'
            'For local testing, extract the separate unpacked ZIP and use Load unpacked\n'
            'at opera://extensions, selecting the folder containing manifest.json.\n')
    print(download)
    print(crx)
    print(f'Packed extension ID: {extension_id}')
    print(f'Keep private packaging key: {key_path} (excluded from extension files)')
    return crx


if __name__ == '__main__':
    package(sys.argv[1])
