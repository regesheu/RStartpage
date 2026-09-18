# Changelog

## 1.0.1 — 2026-09-18

### Proxy
- Smart Proxy Rules continue to provide ordered DIRECT/proxy routing.
- Proxy profile bypass lists now have higher priority than all Smart Proxy Rules while SMART routing is enabled.
- All exclusions configured in proxy profiles are compiled into the PAC script before SMART routing rules, so matching destinations always use DIRECT.

## 1.0.0 — 2026-09-15

First public release of RStartpage.

### Start page
- Chrome New Tab replacement with Sections → Groups → Links.
- Native Chrome Bookmarks storage and Chrome Sync integration.
- Search, drag & drop, pinned links, descriptions, card sizing, section/group colors and extended icon selection.
- English and Russian UI, light/dark/system themes, custom accent color, custom title and custom background controls.
- JSON backup/restore and import from an existing Chrome bookmarks folder.

### Sessions and bookmark tools
- Session Manager with quick save/restore from the toolbar popup and full session management.
- Duplicate Finder for all RStartpage bookmarks or a selected section/group.
- Link Checker with inline per-card progress and results for selected sections/groups.

### Proxy
- Unlimited user-defined proxy profiles with HTTP, HTTPS, SOCKS4 and SOCKS5 support.
- HTTP/HTTPS authentication, bypass patterns, latency testing, sorting and quick toolbar switching.
- Synced profile definitions with local-by-default passwords.
- Smart Proxy Rules for ordered domain/IP/URL routing to DIRECT or a saved proxy.
- Conservative proxy error reporting to avoid marking a working proxy as failed due to an isolated destination/tunnel error.

### Privacy
- No advertising, analytics, remote code or developer-operated backend.
