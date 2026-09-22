# Privacy Policy — RStartpage

Last updated: 2026-09-22

RStartpage is a Chrome extension that replaces the New Tab page and provides bookmark organization, notes, saved tab sessions, bookmark diagnostics, data backups, and optional user-configured proxy controls.

## Data accessed

RStartpage accesses Chrome bookmarks because bookmark reading and editing are required for its bookmark workspace. It stores display preferences and presentation metadata, including optional user-entered descriptions, using Chrome extension storage.

When the user explicitly saves or updates a browser session, RStartpage reads the titles, URLs, and relevant tab state needed to restore that session later.

Notes are stored in Chrome extension storage. When the user explicitly creates a note from the toolbar popup, a bookmark, a page, or selected page text, RStartpage stores the title, source URL, selected text, and other note content that the user chooses to save. Notes stay local by default; the user may opt individual notes into Chrome Sync.

When the user explicitly runs Link Checker, RStartpage makes HTTP/HTTPS requests to the selected bookmark URLs to determine whether those links are reachable. These requests use the user's current browser network/proxy configuration and are not sent to a developer-operated service.

When the user enables proxy features, RStartpage accesses Chrome proxy settings and proxy authentication events to apply user-configured proxy profiles, Smart Proxy Rules, bypass rules, and credentials where supported.

RStartpage can export selected data to an archive chosen by the user. In builds configured with Google OAuth, the user may also connect Google Drive and explicitly create a full backup in the extension's private application-data folder. RStartpage can list, download, restore, and delete those backups at the user's request.

## Data collection and transmission

RStartpage does **not** operate a developer-controlled backend and does not transmit bookmark data, sessions, settings, proxy profiles, browsing data, or credentials to the developer, analytics services, advertising systems, or tracking services.

Network activity occurs only as needed for user-facing features. For example, Link Checker contacts the bookmark URLs selected by the user, proxy mode routes browser traffic through proxy servers configured by the user, and an explicitly connected Google Drive account receives backup data when the user creates a cloud backup.

RStartpage does not use analytics, advertising SDKs, trackers, or remotely hosted executable code.

Chrome/Google may synchronize bookmarks, supported extension settings, proxy profile definitions, and user-selected notes when Chrome Sync is enabled. That synchronization is a Chrome browser feature and is not operated by RStartpage.

Proxy passwords are stored locally by default. A user may explicitly opt in to password synchronization and may explicitly include passwords in a local or Google Drive backup. Archives are not encrypted. Saved sessions and notes remain local unless the user explicitly synchronizes or backs them up. Google OAuth access tokens are managed by Chrome and are never included in RStartpage archives.

## Data sharing

RStartpage does not sell, rent, share, or transfer user data to third parties for advertising, profiling, or unrelated purposes.

## Retention and deletion

Bookmarks remain in the user's Chrome Bookmarks until the user removes them. Notes, sessions, preferences, and metadata remain in Chrome extension storage until changed, reset, or removed by the user. Google Drive backups remain until the user deletes them through RStartpage or Google Drive. Uninstalling RStartpage does not intentionally delete the user's bookmark folder or Google Drive backups.

## Limited Use

The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

me@regesh.ru
