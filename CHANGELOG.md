# Changelog

## 1.8.3 — 2026-09-25

- Made English the clean-install default throughout the visible interface and removed hard-coded Russian text from the popup/settings shell.
- Localized the popup Create note action and its error state through the selected language.
- Replaced the misaligned Add Link text chevron with a centered SVG chevron.
- Updated the release version to 1.8.3.

## 1.8.2 — 2026-09-24

- Rebuilt the 128×128 extension icon as a valid PNG so Chrome Web Store can process the package.
- Removed the unused placeholder OAuth configuration and `identity` permission from the initial Web Store build; Google Drive remains disabled until a real Chrome Extension OAuth client is configured for the assigned Extension ID.
- Added stricter release packaging checks for declared icon assets.
- Updated Chrome Web Store submission metadata and version checks for 1.8.2.

## 1.8.1 — 2026-09-22

- Replaced the truncated default wallpaper with a complete 1536 × 1024 PNG and corrected background layering so the image fills every full page. Renamed the background choice to Default / По умолчанию.
- Made Quick Access global: pinned links from every bookmark section now appear in the same block.
- Replaced module transfer text with a compact Export / Import icon beside the shared Help control; removed the redundant shortcut from Tools and aligned Help buttons across modules.
- Renamed Settings → Data and added focused help for archives, restore modes, Google Drive and sensitive proxy data.
- Grouped Smart Proxy Rules and the opt-in Proxy passwords control under Proxy in archive selection.
- Added Sessions help and refreshed Notes help to point to the unified Data section.

## 1.8.0 — Unified data settings and Alpine Glass refinement

- Moved all import/export into Settings → Data and sections, with module selection, ZIP archives, legacy JSON support, preview and explicit restore confirmation.
- Full backups include links, note groups/tags/sync choices, proxy profiles/rules/preferences, sessions, extension settings and custom wallpaper. Proxy passwords remain opt-in.
- Replaced module import/export controls with a single settings shortcut. Existing data-page URLs redirect to the settings hub.
- Restored Google Drive below local transfers: connection state, backup creation, paginated list, ZIP download, restore preview and deletion. Unconfigured builds explain why connection is unavailable and show disabled cloud controls.
- Corrected Drive multipart upload endpoint and authorization state handling; background requests never trigger interactive authorization.
- Added compact bottom-left version text; refined glass navigation, settings sidebar, form alignment, notes toolbar/card actions and the settings gear SVG.
- Fixed note search handling and retained active group/tag filters. Archive restore preserves note identity and rejects capacity/quota errors before changing other sections.


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
