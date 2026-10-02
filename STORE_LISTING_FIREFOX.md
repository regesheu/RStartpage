# Mozilla Add-ons listing — RStartpage for Firefox

Change the listing in Mozilla Developer Hub. Uploading a new ZIP does not
automatically replace the manually entered Summary or Description.

## Summary

A customizable Firefox start page for bookmarks, notes, sessions, link tools and optional proxy routing.

## Description

RStartpage replaces Firefox's New Tab page with a local-first workspace built around your existing Firefox bookmarks.

Keep everyday browsing organized with bookmark groups, notes, saved sessions and optional proxy routing.

Key features:

- Bookmark workspace with sections, groups, search, drag and drop, descriptions, icons, colors and multiple card sizes.
- One shared Quick Access area for pinned links from any section.
- Local notes with groups, tags, search and source links. Small selected notes can use Firefox Sync.
- Optional Google Drive synchronization for notes, groups and tags, plus manual and automatic backups. Offline edits synchronize when connectivity and authorization are available.
- Session Manager for saving and restoring tab sets with their order and pinned state.
- Bookmark tools for finding duplicate URLs and checking links for errors or timeouts.
- HTTP, HTTPS, SOCKS4 and SOCKS5 proxy profiles, bypass rules, latency tests and ordered Smart Proxy Rules.
- Selective ZIP export, import preview, and merge or replace restore modes.
- Light, dark and system themes, accent colors, custom title, favicon and wallpaper.

Privacy:

RStartpage has no ads, analytics or developer-operated backend. Bookmarks remain Firefox bookmarks. Notes, sessions and preferences are stored using Firefox extension storage. Browser synchronization is controlled by your Mozilla account settings. Network requests are used for enabled features, including link checks and traffic routed through a proxy you configured. Google Drive is optional and is available only in builds configured for it; connecting it stores application data in your Google account. Proxy passwords are kept locally unless you explicitly choose password synchronization or export.

## Release notes — 1.9.2

Fixed Smart Proxy Rules restoration and overlapping routing updates. Rule edits now apply without restarting the extension. Proxy tests restore the latest saved configuration. Enabled Google Drive in the configured Firefox build; Google login was verified by the project owner.
