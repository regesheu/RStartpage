# RStartpage

RStartpage is a local-first Chrome New Tab workspace for bookmarks, notes, saved browser sessions, link maintenance, data backups and optional proxy routing.

[Download latest release](https://github.com/regesheu/RStartpage/releases/latest/download/RStartpage-latest.zip) · [All releases](https://github.com/regesheu/RStartpage/releases) · [Project page](https://regesheu.github.io/RStartpage/) · [Privacy](PRIVACY.md)

## Features

- **Bookmark workspace:** sections → groups → links stored as normal Chrome Bookmarks, with full-width search, drag & drop, descriptions, icons, colors and three card sizes.
- **Global Quick Access:** pin important bookmarks from any section into one shared block.
- **Notes:** create notes from selected page text, the current tab or a bookmark; organize them with groups, tags and search; choose individual notes for Chrome Sync.
- **Session Manager:** save the current window, preserve tab order and pinned state, then open it in a new window, add it to the current window or replace the current window.
- **Bookmark maintenance:** find duplicate URLs, edit results inline and check individual or grouped links for HTTP errors, timeouts and unavailable destinations.
- **Proxy profiles:** configure HTTP, HTTPS, SOCKS4 and SOCKS5 proxies, optional authentication, bypass masks and latency tests, then switch from the toolbar popup.
- **Smart Proxy Rules:** route matching domains, IPs or URL patterns through DIRECT or a selected proxy profile using ordered rules and profile-level exclusions.
- **Unified Data center:** export selected sections to a ZIP archive, preview imports, merge or replace selected data, import legacy RStartpage JSON and copy an existing Chrome bookmark folder.
- **Complete backups:** archives can include links, notes, proxy profiles and rules, sessions, settings and the custom wallpaper. Proxy passwords are excluded unless explicitly selected.
- **Optional Google Drive backups:** builds configured with Google OAuth can create, list, download, restore and delete full backups in the extension's private Drive application data.
- **Personalization:** English and Russian interfaces, shared navigation, custom product name and tab favicon, light/dark/system themes, accent colors and default or custom wallpapers.
- **Local-first operation:** no advertising, analytics, remote executable code or developer-operated backend.

## Install from GitHub

1. Download **RStartpage-latest.zip** from the [latest release](https://github.com/regesheu/RStartpage/releases/latest).
2. Extract it to a permanent folder. Do not install directly from the ZIP.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Optional: pin RStartpage from Chrome's Extensions menu to keep proxy status and quick actions visible next to the address bar.

Chrome will warn about the permissions RStartpage needs for bookmarks, notes, sessions, optional Google Drive backups and proxy functionality. The extension has no developer-operated backend and does not send your data to the developer.

## Updating

GitHub-installed unpacked extensions do not auto-update.

1. Download the newest release ZIP.
2. Extract it **over the same RStartpage folder** you originally loaded into Chrome.
3. Open `chrome://extensions`.
4. Click **Reload** on RStartpage.

Your bookmarks and RStartpage data are stored by Chrome and are not removed by replacing the extension files.

## Data and privacy model

RStartpage is local-first. Bookmarks remain Chrome Bookmarks. Notes and saved sessions stay on the device by default. Users can opt individual notes into Chrome Sync, export selected data to a local archive, or—in a build configured for Google OAuth—connect Google Drive and create a backup in the extension's private application-data folder.

Proxy profile definitions and supported settings can use Chrome Sync. Proxy passwords stay local unless the user explicitly enables password sync or includes them in an archive. Google credentials and access tokens are never included in RStartpage archives.

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
bash scripts/set-version.sh 1.9.0
```

## Releases

The GitHub Actions release workflow can be started manually from **Actions → Build GitHub Release → Run workflow**, or by pushing a tag such as `v1.9.0`.

It restores the source bundle, builds the extension and publishes two assets:

- `RStartpage-<version>.zip` — versioned archive.
- `RStartpage-latest.zip` — stable URL used by the project page and README.

## Author

Extension made by [regesh](mailto:me@regesh.ru).
