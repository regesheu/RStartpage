'use strict';

// Only a public Web OAuth client ID is embedded. Tokens never enter persistent
// storage, browser sync or backups. Opera does not implement getAuthToken.
const ROperaDriveAuth = (() => {
  const KEY = 'rstartpageOperaDriveToken';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const clientId = globalThis.ROperaConfig?.driveClientId || '';
  let pending = null;
  let generation = 0;
  const isConfigured = () => /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)
    && typeof chrome.identity?.launchWebAuthFlow === 'function' && !!chrome.storage.session;
  // getRedirectURL is absent in some Opera versions. Chromium intercepts this
  // exact extension-owned origin even when the helper itself is unavailable.
  const getRedirectURL = () => typeof chrome.identity?.getRedirectURL === 'function'
    ? chrome.identity.getRedirectURL() : `https://${chrome.runtime.id}.chromiumapp.org/`;
  async function removeToken() { generation++; await chrome.storage.session.remove(KEY); }
  async function authorize(interactive) {
    const current = generation;
    const redirect = getRedirectURL();
    const state = crypto.randomUUID();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirect,
      response_type: 'token', scope: SCOPE, state, ...(interactive ? {} : { prompt: 'none' }) }).toString();
    let result;
    try {
      result = new URL(await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: url.href, interactive }, value => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message)); else resolve(value);
        });
      }));
    } catch (_) { throw new Error('DRIVE_AUTH_REQUIRED'); }
    const expected = new URL(redirect);
    const params = new URLSearchParams(result.hash.slice(1));
    const access = params.get('access_token');
    const lifetime = Number(params.get('expires_in'));
    if (result.origin !== expected.origin || result.pathname !== expected.pathname
      || params.get('state') !== state || params.has('error')
      || !String(params.get('scope') || '').split(' ').includes(SCOPE)
      || !access || params.get('token_type')?.toLowerCase() !== 'bearer'
      || !Number.isFinite(lifetime) || lifetime <= 0 || current !== generation) throw new Error('DRIVE_AUTH_REQUIRED');
    await chrome.storage.session.set({ [KEY]: { token: access, expiresAt: Date.now() + lifetime * 1000 } });
    return access;
  }
  async function token(interactive = false) {
    if (!isConfigured()) throw new Error('DRIVE_NOT_CONFIGURED');
    const saved = (await chrome.storage.session.get(KEY))[KEY];
    if (saved?.token && saved.expiresAt > Date.now() + 60000) return saved.token;
    if (!pending) pending = authorize(interactive).finally(() => { pending = null; });
    return pending;
  }
  return { isConfigured, token, removeToken, getRedirectURL };
})();
