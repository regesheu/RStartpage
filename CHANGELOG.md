# Changelog

## 1.1.0 — 2026-09-18

### Navigation and settings
- Added one sticky navigation bar across the start page, Proxy, Sessions, Tools, Settings, Data and Proxy Help pages.
- Moved settings into a full-page editor and added controls for the product name, visible navigation sections and tab favicon.
- The custom product name is now used throughout the runtime interface, browser-tab titles and toolbar action title.
- Moved Session Manager to its own page and kept bookmark diagnostics on the Tools page.

### Proxy
- Added standalone JSON import and export controls, including an explicit opt-in for exporting passwords.
- Added a dedicated Proxy Help page with pattern examples and the exact routing priority.
- Simplified the Proxy page so profiles and Smart Rules remain the focus.

### Bookmark maintenance and popup
- Duplicate results can now be edited in place and checked individually, by group or all together.
- Simplified the toolbar popup, added a Home button and an inline Add Link form prefilled from the active tab.
- Replaced the old application footers with a compact bottom-right author credit.

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
