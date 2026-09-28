'use strict';

// Public OAuth client ID only. Tokens stay in browser-session memory and are
// excluded from local storage, sync, exports and backups. No client secret.
const RFirefoxDriveAuth = (() => {
  const KEY = 'rstartpageFirefoxDriveToken';
  const clientId = globalThis.RFirefoxConfig?.driveClientId || '';
  let pending = null;
  const isConfigured = () => /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId);
  async function removeToken() { await browser.storage.session.remove(KEY); }
  async function authorize(interactive) {
    const redirect = browser.identity.getRedirectURL();
    const state = crypto.randomUUID();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirect,
      response_type: 'token', scope: 'https://www.googleapis.com/auth/drive.appdata',
      state, ...(interactive ? {} : { prompt: 'none' }) }).toString();
    let result;
    try { result = new URL(await browser.identity.launchWebAuthFlow({ url: url.href, interactive })); }
    catch (_) { throw new Error('DRIVE_AUTH_REQUIRED'); }
    const expected = new URL(redirect);
    const params = new URLSearchParams(result.hash.slice(1));
    if (result.origin !== expected.origin || result.pathname !== expected.pathname || params.get('state') !== state) throw new Error('DRIVE_AUTH_REQUIRED');
    const access = params.get('access_token');
    const lifetime = Number(params.get('expires_in'));
    if (params.has('error') || !String(params.get('scope') || '').split(' ').includes('https://www.googleapis.com/auth/drive.appdata') || !access || params.get('token_type')?.toLowerCase() !== 'bearer' || !Number.isFinite(lifetime) || lifetime <= 0) throw new Error('DRIVE_AUTH_REQUIRED');
    await browser.storage.session.set({ [KEY]: { token: access, expiresAt: Date.now() + lifetime * 1000 } });
    return access;
  }
  async function token(interactive = false) {
    if (!isConfigured()) throw new Error('DRIVE_NOT_CONFIGURED');
    const saved = (await browser.storage.session.get(KEY))[KEY];
    if (saved?.token && saved.expiresAt > Date.now() + 60000) return saved.token;
    if (!pending) pending = authorize(interactive).finally(() => { pending = null; });
    return pending;
  }
  return { isConfigured, token, removeToken };
})();
