# RStartpage for Firefox

Desktop Firefox 140 or newer. The Firefox package is built from the same source
as Chrome, with a stable add-on ID: `rstartpage@regesh.ru`. Android is not a
supported target (the New Tab workspace requires desktop extension pages).

## Build and temporarily install

```bash
git clone --branch firefox-support https://github.com/regesheu/RStartpage.git
cd RStartpage
bash scripts/build.sh firefox
```

The unpacked extension is in `dist/firefox`; the uploadable archive is
`dist/RStartpage-Firefox-1.9.2.zip`. Do not load the repository's Chrome manifest
into Firefox.

1. Extract the Firefox ZIP to a folder.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select the extracted `manifest.json`.
4. Open a new tab and allow the New Tab replacement if Firefox asks.
5. In `about:addons` → RStartpage → **Permissions**, allow access to all websites
   for proxy routing and link checks. These features need host access.
6. Pin the toolbar button using Firefox's Extensions menu if desired.

A temporary installation lasts until Firefox closes. Temporary installation
data must not be relied on: export a backup before removing/reinstalling. Normal
permanent installation and store updates require a Mozilla-signed build.

## Move data from Chrome

1. In Chrome RStartpage, open **Settings → Data**, select all sections and export.
2. If you need proxy passwords, explicitly include them; keep that archive safe.
3. In Firefox RStartpage, open **Settings → Data**, select the ZIP, review its
   contents and choose Merge or Replace. Replace overwrites the selected sections.
4. Check bookmarks, groups, notes, sessions and proxy rules before enabling a proxy.

Firefox Sync and Chrome Sync are separate services. This transfer is a snapshot,
not automatic cross-browser synchronization. User-authored Russian note/bookmark
text is preserved on import, even with the English interface selected.

## Browser differences

- Background scripts replace the Chrome service worker.
- Promise-based Firefox APIs are used by all shared pages.
- Bookmarks are created below Firefox's **Other Bookmarks**, not a hard-coded
  Chromium folder ID.
- Fixed profiles and ordered Smart Proxy Rules use `proxy.onRequest`. Global
  bypass patterns take priority; disabling the extension's proxy leaves Firefox's
  existing proxy configuration in charge. Explicit DIRECT rules bypass that
  configuration. A failed selected proxy has no automatic direct fallback.
- HTTP/HTTPS authentication uses `onAuthRequired`. Firefox also supports SOCKS5
  username/password authentication. SOCKS4 password authentication is unavailable.
- SOCKS DNS is resolved through the proxy. IPv4 CIDR rules, like the Chrome PAC
  implementation, may require local DNS lookups to match hostnames.
- Proxy tests temporarily apply a profile and restore the previous routing mode.
- Firefox has no Chrome `_favicon` cache API. Website icons use a packaged local
  globe; custom bookmark icons remain available. Bookmark URLs are not sent to an
  external favicon service.
- UI references to Chrome Sync/Bookmarks become Firefox Sync/Bookmarks in the
  Firefox package. Saved data keys and archive formats stay compatible.

## Use Firefox Sync without Google Drive

Drive is optional. In Firefox Settings → Sync, sign into a Mozilla account and
enable **Bookmarks** and **Add-ons**. Install the same add-on ID on the other
desktop Firefox, then select small notes for synchronization in RStartpage.
Use Settings → Data → Export for complete ZIP backups.

Firefox's extension sync storage permits 100 KB total, 8 KB per item and 512 items;
the separate browser bookmark sync is not charged to this quota. Extension sync
runs about every ten minutes or when the user chooses Sync Now. This is suitable
for preferences and small selected notes, not complete backups, wallpapers or a
large note collection. The current selected-note collection uses one item, so
RStartpage caps its payload at 7 KB in Firefox. Use Drive for larger notes. See [Mozilla's sync-storage documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync).

## Configure Google Drive (optional)

The Chrome Extension OAuth client cannot be reused in Firefox. The Firefox build
uses `identity.launchWebAuthFlow` with a separate public web client ID. Without
that ID the existing UI explains that Drive is not configured; local export and
restore remain available.

1. In the same [Google Cloud project](https://console.cloud.google.com/) as the
   Chrome version, ensure **Google Drive API** is enabled and the OAuth consent
   screen allows `https://www.googleapis.com/auth/drive.appdata`.
2. Load the Firefox build. In `about:debugging#/runtime/this-firefox`, click
   **Inspect** beside RStartpage. In its Console run:
   ```js
   browser.identity.getRedirectURL()
   ```
   Copy the returned HTTPS URL exactly, including its trailing slash.
3. In **Google Auth Platform → Clients → Create client**, select **Web application**,
   name it **RStartpage Firefox**, and add the copied URL under **Authorized redirect
   URIs**. Use its origin (without the final slash) under **Authorized JavaScript
   origins** if requested. Do not use the Chrome Extension client type.
4. Copy only the public client ID (`…apps.googleusercontent.com`). Do not place a
   client secret in the extension, repository, issue or chat.
5. In GitHub **Settings → Secrets and variables → Actions**, create the repository
   secret **FIREFOX_DRIVE_CLIENT_ID**. Open the newest **Verify Firefox** run for
   branch **firefox-support** and select **Re-run all jobs**. Download the
   **RStartpage-Firefox** artifact after it passes, then extract the inner Firefox
   ZIP. The workflow embeds the public ID only in the Firefox package; no merge
   to main is needed. See `FIREFOX_RU.md` for the full no-terminal walkthrough.
   For a local configured build:
   ```bash
   FIREFOX_DRIVE_CLIENT_ID='your-real-id.apps.googleusercontent.com' bash scripts/build.sh firefox
   ```
6. Reload the configured build, open **Settings → Data → Connect Google Drive**,
   and sign in with an allowed test user while the OAuth project is in Testing.
7. Check a note edit and a backup on two installations before announcing Drive
   support. Actual Google consent and cross-browser app-data access require this
   account-level verification; a mock token test does not prove them.

The adapter uses Google's client-side token response through Firefox's intercepted
redirect. It validates redirect, state, granted scope, token type and expiry. Access
tokens remain in `storage.session`; they never enter browser sync or export/backup
archives. It uses silent authorization after expiry where Google permits it;
otherwise the existing reconnect state is shown. There is no stored refresh token
or client secret, and no guaranteed unattended sign-in after browser restart.
This is the legacy implicit OAuth flow; migrating to Google's recommended
authorization-code architecture would require a separately designed OAuth service
or a supported public-client registration, not embedding a web client secret.

## Publish on Mozilla Add-ons

1. Create/sign in to your [Mozilla developer account](https://addons.mozilla.org/developers/).
2. Choose **Submit a New Add-on** and **On this site** for public listing and updates.
3. Upload the Firefox ZIP, review validation results, and provide the listing,
   screenshots, support URL and [privacy policy](https://regesheu.github.io/RStartpage/privacy.html).
4. Use this permanent add-on ID for every update. Do not regenerate it after the
   first submission: it also determines OAuth redirects and Firefox Sync identity.
5. The manifest declares data transmission involved in user-enabled sync, proxy
   authentication/routing and link checking. No analytics or developer-operated
   data endpoint is added. Explain these destinations to reviewers; do not claim
   “no transmission” just because the developer does not receive data.
6. If Mozilla asks for source/build instructions, provide this branch/tag and the
   source ZIP, and point to `scripts/bootstrap-source.sh`, `scripts/build.sh firefox`
   and `scripts/package-extension.py`. The `source-bundle` contains readable source
   after restoration. `vendor/jszip.min.js` is the bundled third-party JSZip library.
7. Submit for review. After signing/approval, install from the listing; later
   signed versions with the same ID can update automatically through Mozilla.

Do not submit the Chrome ZIP. An unsigned ZIP renamed to `.xpi` is still unsigned.
GitHub release creation does not automatically sign or publish Firefox builds.

## Verification

```bash
bash scripts/build.sh
bash scripts/build.sh firefox
node scripts/test-firefox.mjs
web-ext lint --source-dir dist/firefox
node scripts/test-firefox-browser.cjs
```

The last command needs `selenium-webdriver`, Firefox and geckodriver; it uses a
disposable profile and localhost test servers. `.github/workflows/firefox.yml`
installs these dependencies, tests real routing/authentication and opens all seven
main pages. Review its result before merging. Google login and a real SOCKS server
still need a configured integration check.

References: [Firefox backgrounds](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background),
[proxy routing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/onRequest),
[data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/),
[OAuth client-side flow](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow),
[Mozilla submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).
