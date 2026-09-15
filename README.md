# RStartpage

RStartpage is a customizable Chrome New Tab workspace built around the browser's own bookmarks and sync features. It combines bookmark organization, saved browser sessions, bookmark diagnostics, and optional user-configured proxy routing in one local-first extension.

## Features

- Sections → groups → links, stored as normal Chrome Bookmarks.
- Chrome Sync for bookmark data and supported RStartpage settings.
- Search, drag & drop, pinned links, descriptions, icons, colors and card sizes.
- Light, dark and system themes, custom accent color and custom background.
- English interface by default with optional Russian UI.
- Session Manager for saving and restoring tab sets.
- Duplicate Finder and inline Link Checker for bookmark maintenance.
- Proxy profiles with HTTP/HTTPS/SOCKS support, authentication where supported, bypass lists, latency testing and toolbar switching.
- Smart Proxy Rules for routing matching domains/IPs to DIRECT or a selected proxy profile.
- JSON backup/restore and Chrome bookmark-folder import.
- No advertising, analytics, remote code, or developer-operated backend.

## Privacy model

RStartpage is local-first. Bookmarks remain Chrome Bookmarks. Extension preferences use Chrome extension storage. Proxy profiles can sync through Chrome Sync; proxy passwords stay local unless the user explicitly enables password sync. Saved sessions are local unless the user explicitly exports them.

See [PRIVACY.md](PRIVACY.md) for details.

## Install locally

1. Download or clone the repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository directory containing `manifest.json`.

## Development update

Keep the same unpacked extension directory, replace/edit files, then click **Reload** on the RStartpage card in `chrome://extensions`. Removing and re-adding the extension is not required.

## Build

```bash
./scripts/build.sh
```

The Chrome Web Store ZIP is written to `dist/RStartpage-<version>.zip` with `manifest.json` at the archive root.

To change the release version:

```bash
./scripts/set-version.sh 1.0.1
```

## Release flow

A tag such as `v1.0.0` triggers the GitHub Release workflow and attaches the built ZIP. After Chrome Web Store API credentials are configured, publishing a GitHub Release also uploads that package to the Chrome Web Store and submits it for review. Once Google approves and publishes the update, Chrome updates installed Store versions automatically.

## Author

made by g.khudiakov for self and others  
contact: me@regesh.ru
