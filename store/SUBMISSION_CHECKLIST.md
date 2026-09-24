# Chrome Web Store submission checklist

## Listing
- Name: `RStartpage`
- Category: `Productivity`
- Primary language: English
- Add Russian localization after the English listing is complete.
- Paste the short and detailed descriptions from `STORE_LISTING.md`.
- Upload the 128×128 extension icon.
- Upload at least one 1280×800 screenshot; 3–5 are recommended.
- Optional small promo tile: 440×280.
- Optional marquee image: 1400×560.

## Privacy
- Use the single-purpose statement and permission justifications from `STORE_LISTING.md`.
- Declare no remote code.
- Complete the data-use disclosures so they match `PRIVACY.md` exactly.
- Publish `docs/privacy.html` via GitHub Pages and use that public HTTPS URL as the privacy-policy URL.

## Distribution
- Choose Public for the final release.
- For a pre-release smoke test, Unlisted is acceptable, but it is reviewed under the same policies.

## First release
- Version 1.8.2 intentionally omits the `identity` permission and `oauth2` manifest block until a real Chrome Extension OAuth client can be created for the assigned Web Store Extension ID. Google Drive controls remain unconfigured in this build.
- Upload `dist/RStartpage-1.8.2.zip` manually in the Chrome Web Store Developer Dashboard.
- Complete Store listing, Privacy and Distribution tabs.
- Submit for review.
- After the item exists, record the Extension ID and Publisher ID for GitHub Actions.

## Automated updates
After the first store item exists:
- Add repository variable `CWS_PUBLISHER_ID`.
- Add repository variable `CWS_EXTENSION_ID`.
- Add repository secret `CWS_SERVICE_ACCOUNT_JSON`.
- Create and link a Google Cloud service account to the Chrome Web Store publisher account.
- Future GitHub Releases can then upload and submit the matching ZIP automatically.
