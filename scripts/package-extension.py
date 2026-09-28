#!/usr/bin/env python3
"""Package explicit runtime assets; derive Firefox without mutating Chrome files."""
import json
import os
from pathlib import Path
import re
import shutil
import sys
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = sys.argv[1] if len(sys.argv) > 1 else 'chrome'
if TARGET not in ('chrome', 'firefox', 'opera'):
    raise SystemExit('Usage: package-extension.py [chrome|firefox|opera]')
manifest = json.loads((ROOT / 'manifest.json').read_text())
client_id = os.environ.get({'firefox': 'FIREFOX_DRIVE_CLIENT_ID', 'opera': 'OPERA_DRIVE_CLIENT_ID', 'chrome': 'DRIVE_CLIENT_ID'}[TARGET], '')
if client_id and not re.fullmatch(r'[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com', client_id):
    raise SystemExit('Invalid Google OAuth client ID')

stage = ROOT / 'dist' / TARGET
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir(parents=True)
for path in sorted(ROOT.iterdir()):
    if path.is_file() and path.suffix in ('.html', '.css', '.js'):
        if (TARGET != 'firefox' and path.name.startswith('firefox-')) or (TARGET != 'opera' and path.name.startswith('opera-')):
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
elif TARGET == 'opera':
    manifest.pop('oauth2', None)
    manifest.pop('chrome_url_overrides', None)
    manifest['key'] = (ROOT / 'opera-public-key.txt').read_text().strip()
    manifest['description'] = manifest['description'].replace('Chrome', 'Opera')
    (stage / 'opera-config.js').write_text('globalThis.ROperaConfig = ' + json.dumps({'driveClientId': client_id}) + ';\n')
    for path in stage.iterdir():
        if path.suffix not in ('.html', '.js') or path.name.startswith('opera-'):
            continue
        source = path.read_text()
        source = source.replace('chrome.storage', 'ROperaStorage')
        source = source.replace('RFirefoxDriveAuth', 'ROperaDriveAuth')
        source = source.replace('These preferences sync through Chrome.', 'These preferences are saved on this device. Use Google Drive for note sync and backups.')
        source = source.replace('Эти параметры синхронизируются через Chrome.', 'Эти параметры сохраняются на устройстве. Для синхронизации заметок и резервных копий подключите Google Drive.')
        source = source.replace('Profiles and rules sync through Chrome Sync. Passwords stay on this device unless you explicitly enable password sync.', 'Profiles, rules and passwords stay on this device. Use Settings → Data to transfer them.')
        source = source.replace('Профили и правила синхронизируются через Chrome Sync. Пароли остаются на устройстве, пока вы явно не включите их синхронизацию.', 'Профили, правила и пароли сохраняются на этом устройстве. Для переноса используйте настройки → «Данные».')
        source = source.replace('Avoid password sync on shared Chrome profiles.', 'Do not save proxy passwords in a shared browser profile.')
        source = source.replace('Не синхронизируйте пароль в общем профиле Chrome.', 'Не сохраняйте пароли прокси в общем профиле браузера.')
        source = source.replace('Chrome Sync', 'local browser storage').replace('Chrome Bookmarks', 'Opera Bookmarks')
        source = re.sub(r'\bChrome\b', 'Opera', source)
        if path.name == 'background.js':
            source = source.replace("importScripts(", "importScripts('opera-storage.js', 'opera-config.js', 'opera-drive-auth.js', 'opera-newtab.js', ", 1)
        if path.name == 'proxy.html':
            source = source.replace('<label class="checkbox-setting"><input id="syncPasswordInput"', '<label class="checkbox-setting" hidden><input id="syncPasswordInput"')
            source = source.replace('<p id="syncWarning"', '<p hidden id="syncWarning"')
        if path.name == 'proxy.js':
            source = source.replace('ui.syncPasswordInput.checked = !!profile?.syncPassword;', 'ui.syncPasswordInput.checked = false;')
        if path.name == 'notes-shared.js':
            source = source.replace('sync: raw.sync === true', 'sync: false')
        if path.name == 'notes.js':
            # No extension sync service exists in Opera; Drive status stays intact.
            source = source.replace('ui.syncMeter.hidden = driveConnected;', 'ui.syncMeter.hidden = true;')
            source = source.replace('ui.syncToggle.hidden = driveConnected;', 'ui.syncToggle.hidden = true;')
            source = source.replace('node.hidden = driveConnected;', 'node.hidden = true;')
            source = source.replace("${driveConnected?'hidden':''}", 'hidden')
            source = re.sub(r"helpSync:'[^']*'", lambda m: "helpSync:'" + ('Синхронизация заметок в Opera доступна через Google Drive. Без него заметки остаются на этом устройстве.' if 'Пока' in m.group() else 'In Opera, connect Google Drive to sync notes. Otherwise notes stay on this device.') + "'", source)
        if path.name == 'notes.html':
            source = re.sub(r'(<p id="notesHelpSync">).*?(</p>)', r'\1In Opera, connect Google Drive to sync notes. Otherwise notes stay on this device.\2', source)
        if path.suffix == '.html':
            scripts = '<script src="opera-storage.js"></script><script src="opera-config.js"></script><script src="opera-drive-auth.js"></script>'
            source = source.replace('<head>', '<head>' + scripts, 1)
        path.write_text(source)
else:
    if client_id:
        manifest['oauth2']['client_id'] = client_id

(stage / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
name = f"RStartpage-{TARGET.capitalize() + '-' if TARGET != 'chrome' else ''}{manifest['version']}.zip"
archive = ROOT / 'dist' / name
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    for path in sorted(stage.rglob('*')):
        if path.is_file():
            info = zipfile.ZipInfo(path.relative_to(stage).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, path.read_bytes())
print(archive)

if TARGET == 'opera':
    subprocess.run([sys.executable, str(ROOT / 'scripts/package-opera-crx.py'), str(archive)], check=True)
