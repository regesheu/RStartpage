# RStartpage

RStartpage is a local-first Chrome New Tab workspace for bookmarks, saved browser sessions, bookmark diagnostics, and optional proxy routing.

[Download latest release](https://github.com/regesheu/RStartpage/releases/latest/download/RStartpage-latest.zip) · [All releases](https://github.com/regesheu/RStartpage/releases) · [Project page](https://regesheu.github.io/RStartpage/) · [Privacy](PRIVACY.md)

## Features

- Sections → groups → links, stored as normal Chrome Bookmarks.
- Chrome Sync for bookmarks and supported RStartpage settings.
- Search, drag & drop, pinned links, descriptions, icons, colors and card sizes.
- Light, dark and system themes, custom accent color and custom background.
- English interface by default with optional Russian UI.
- Session Manager for saving and restoring tab sets.
- Duplicate Finder and inline Link Checker for bookmark maintenance.
- Proxy profiles with HTTP/HTTPS/SOCKS support, authentication where supported, bypass lists, latency testing and toolbar switching.
- Smart Proxy Rules for routing matching domains/IPs to DIRECT or a selected proxy profile.
- JSON backup/restore and Chrome bookmark-folder import.
- No advertising, analytics, remote code, or developer-operated backend.

## Install from GitHub

1. Download **RStartpage-latest.zip** from the [latest release](https://github.com/regesheu/RStartpage/releases/latest).
2. Extract it to a permanent folder. Do not install directly from the ZIP.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Optional: pin RStartpage from Chrome's Extensions menu to keep proxy status and quick actions visible next to the address bar.

Chrome will warn about the permissions RStartpage needs for bookmarks, sessions and optional proxy functionality. The extension has no developer-operated backend and does not send your bookmarks or proxy configuration to the developer.

## Updating

GitHub-installed unpacked extensions do not auto-update.

1. Download the newest release ZIP.
2. Extract it **over the same RStartpage folder** you originally loaded into Chrome.
3. Open `chrome://extensions`.
4. Click **Reload** on RStartpage.

Your bookmarks, RStartpage settings and proxy profiles are stored by Chrome and are not removed by replacing the extension files.

## Privacy model

RStartpage is local-first. Bookmarks remain Chrome Bookmarks. Extension preferences use Chrome extension storage. Proxy profiles can sync through Chrome Sync; proxy passwords stay local unless the user explicitly enables password sync. Saved sessions are local unless the user explicitly exports them.

See [PRIVACY.md](PRIVACY.md) for details.

## Development

Clone the repository and restore the extension source bundle:

```bash
git clone https://github.com/regesheu/RStartpage.git
cd RStartpage
bash scripts/bootstrap-source.sh
```

After that, load the repository root as an unpacked Chrome extension or build the distributable ZIP:

```bash
bash scripts/build.sh
```

Change the release version:

```bash
bash scripts/set-version.sh 1.0.1
```

## Releases

The GitHub Actions release workflow can be started manually from **Actions → Build GitHub Release → Run workflow**, or by pushing a tag such as `v1.0.1`.

It restores the source bundle, builds the extension and publishes two assets:

- `RStartpage-<version>.zip` — versioned archive.
- `RStartpage-latest.zip` — stable URL used by the project page and README.

## Author

made by g.khudiakov for self and others  
contact: me@regesh.ru
