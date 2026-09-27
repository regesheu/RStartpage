# Chrome Web Store releases and Google Drive

The workflow `.github/workflows/release.yml` builds a ZIP, creates a GitHub release,
uploads the same ZIP to the existing Chrome Web Store item and submits it for review
on each push to `main`. Increment `manifest.json` version before each push to `main`.
Chrome publishes the reviewed version and then updates store-installed extensions.

## Google Drive authentication

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) and create
   or select a project. Enable **Google Drive API** in **APIs & Services → Library**.
2. In **Google Auth Platform → Branding / Audience / Data Access**, provide the app
   name, support email and developer contact; choose **External** if users outside
   your organization need backups. Add scope
   `https://www.googleapis.com/auth/drive.appdata`. Configure production status and
   any verification requested by Google; while in testing, only test users can connect.
3. In **Google Auth Platform → Clients**, create an OAuth client of type
   **Chrome Extension**, enter extension ID `bigmfdkckifbkpgeanocaibckjakllca`.
   Copy its client ID (`…apps.googleusercontent.com`).
4. Add this ID as GitHub Actions repository secret **DRIVE_CLIENT_ID** in
   **Settings → Secrets and variables → Actions → New repository secret**. It is
   embedded in the ZIP manifest during the release build. This OAuth client has
   no client secret and is different from the Web Store publishing client below.

## Automatic Chrome Web Store submission

1. In Google Cloud Console enable **Chrome Web Store API** (in the same project
   or another one). Configure its OAuth consent screen and add your publishing
   Google account as a test user if the app is in testing.
2. Create a second OAuth client, type **Web application**, with authorized redirect
   URI `https://developers.google.com/oauthplayground`. Copy its client ID and
   client secret.
3. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   In settings select **Use your own OAuth credentials**, enter the web client
   ID and secret. Enter scope `https://www.googleapis.com/auth/chromewebstore`,
   authorize with the Google account that owns the published extension and
   **Exchange authorization code for tokens**. Copy the **refresh token**.
4. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   open **Publisher → Settings**, copy **Publisher ID**.
5. Add four GitHub Actions repository secrets: **CWS_CLIENT_ID**,
   **CWS_CLIENT_SECRET**, **CWS_REFRESH_TOKEN**, **CWS_PUBLISHER_ID**. Do not
   commit the client secret or refresh token and do not post them in an issue.
6. After all five secrets are set, merge this change or run **Actions → Build and
   publish extension → Run workflow**. Check the run for `Submitted for Chrome
   Web Store review` and then check the Developer Dashboard review status.

If the ZIP is built locally without `DRIVE_CLIENT_ID`, Google Drive remains
disabled. Use `DRIVE_CLIENT_ID=... bash scripts/build.sh` for a configured local
ZIP; the supplied ID must belong to the published extension ID. A locally
unpacked copy may have a different ID unless its manifest includes the store
public key. On `main`, each new build needs a higher manifest version; running
the workflow again with an existing release version intentionally fails.

Official guides: [extension OAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth),
[Drive app data](https://developers.google.com/workspace/drive/api/guides/appdata),
[Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api).
