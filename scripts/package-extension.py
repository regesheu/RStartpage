#!/usr/bin/env python3
"""Package explicit runtime assets; derive Firefox without mutating Chrome files."""
import json
import os
from pathlib import Path
import re
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = sys.argv[1] if len(sys.argv) > 1 else 'chrome'
if TARGET not in ('chrome', 'firefox'):
    raise SystemExit('Usage: package-extension.py [chrome|firefox]')
manifest = json.loads((ROOT / 'manifest.json').read_text())
client_id = os.environ.get('FIREFOX_DRIVE_CLIENT_ID' if TARGET == 'firefox' else 'DRIVE_CLIENT_ID', '')
if client_id and not re.fullmatch(r'[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com', client_id):
    raise SystemExit('Invalid Google OAuth client ID')

stage = ROOT / 'dist' / TARGET
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir(parents=True)
for path in sorted(ROOT.iterdir()):
    if path.is_file() and path.suffix in ('.html', '.css', '.js'):
        if TARGET == 'chrome' and path.name.startswith('firefox-'):
            continue
        shutil.copy2(path, stage / path.name)
for folder in ('assets', 'icons', 'vendor'):
    shutil.copytree(ROOT / folder, stage / folder)

if TARGET == 'firefox':
    manifest.pop('minimum_chrome_version', None)
    manifest.pop('oauth2', None)
    # Preserve explicitly requested HTTP link/proxy checks. Firefox MV3's default
    # upgrade-insecure-requests would silently rewrite them to HTTPS.
    manifest['content_security_policy'] = {'extension_pages': "script-src 'self'; object-src 'self';"}
    manifest['description'] = manifest['description'].replace('Chrome', 'Firefox')
    manifest['permissions'] = [p for p in manifest['permissions'] if p != 'favicon'] + ['dns', 'webRequestBlocking']
    manifest['browser_specific_settings'] = {'gecko': {
        'id': 'rstartpage@regesh.ru',
        'strict_min_version': '140.0',
        'data_collection_permissions': {
            'required': ['bookmarksInfo', 'browsingActivity', 'websiteContent', 'authenticationInfo', 'personallyIdentifyingInfo'],
        },
    }}
    # Match the worker dependency order exactly, with Firefox adapters first.
    worker = (stage / 'background.js').read_text()
    imports = re.search(r"importScripts\(([^;]+)\);", worker)
    if not imports:
        raise SystemExit('Cannot determine background dependencies')
    scripts = re.findall(r"'([^']+)'", imports.group(1))
    manifest['background'] = {'scripts': ['firefox-compat.js', 'firefox-config.js',
        'firefox-drive-auth.js', 'firefox-proxy.js', *scripts, 'background.js']}
    (stage / 'firefox-config.js').write_text('globalThis.RFirefoxConfig = ' + json.dumps({'driveClientId': client_id}) + ';\n')
    for path in stage.iterdir():
        if path.suffix not in ('.html', '.js'):
            continue
        source = path.read_text()
        source = source.replace('Chrome Sync', 'Firefox Sync').replace('Chrome Bookmarks', 'Firefox Bookmarks')
        source = source.replace('The 70 KB sync limit has been exceeded.', 'The 7 KB Firefox Sync notes limit has been exceeded.')
        source = source.replace('Лимит синхронизации 70 КБ превышен.', 'Лимит заметок Firefox Sync 7 КБ превышен.')
        source = source.replace('Chrome does not support credentials for SOCKS profiles.', 'Firefox also supports username/password authentication for SOCKS5; SOCKS4 has no password support in RStartpage.')
        source = source.replace('Chrome не поддерживает авторизацию SOCKS.', 'Firefox также поддерживает логин и пароль SOCKS5; авторизация SOCKS4 в RStartpage недоступна.')
        source = source.replace('Chrome profiles', 'Firefox profiles').replace('профиле Chrome', 'профиле Firefox')
        source = re.sub(r'\bChrome\b', 'Firefox', source)
        if path.suffix == '.html':
            scripts = '<script src="firefox-compat.js"></script><script src="firefox-config.js"></script><script src="firefox-drive-auth.js"></script>'
            source = source.replace('<head>', '<head>' + scripts, 1)
        path.write_text(source)
else:
    if client_id:
        manifest['oauth2']['client_id'] = client_id

(stage / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
name = f"RStartpage-{'Firefox-' if TARGET == 'firefox' else ''}{manifest['version']}.zip"
archive = ROOT / 'dist' / name
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for path in sorted(stage.rglob('*')):
        if path.is_file():
            info = zipfile.ZipInfo(path.relative_to(stage).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, path.read_bytes())
print(archive)
