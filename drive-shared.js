'use strict';

const RDrive = (() => {
  const ROOT = 'rstartpage-drive';
  const META_KEY = 'rstartpageDriveState';
  const API = 'https://www.googleapis.com/drive/v3';
  async function state() { return (await chrome.storage.local.get(META_KEY))[META_KEY] || { connected: false, account: '' }; }
  function isConfigured() { if (typeof RFirefoxDriveAuth !== 'undefined') return RFirefoxDriveAuth.isConfigured(); const id = chrome.runtime.getManifest().oauth2?.client_id || ''; return !!chrome.identity?.getAuthToken && id.endsWith('.apps.googleusercontent.com') && !/REPLACE|PLACEHOLDER/i.test(id); }
  async function removeToken(access) {
    if (typeof RFirefoxDriveAuth !== 'undefined') return RFirefoxDriveAuth.removeToken();
    return chrome.identity.removeCachedAuthToken({ token: access });
  }
  async function token(interactive = false) {
    if (typeof RFirefoxDriveAuth !== 'undefined') return RFirefoxDriveAuth.token(interactive);
    if (!isConfigured()) throw new Error('DRIVE_NOT_CONFIGURED');
    const result = await chrome.identity.getAuthToken({ interactive });
    const access = typeof result === 'string' ? result : result?.token;
    if (!access) throw new Error('DRIVE_AUTH_REQUIRED');
    return access;
  }
  async function fetchJson(path, options, access, upload = false) {
    const response = await fetch(`${upload ? 'https://www.googleapis.com/upload/drive/v3' : API}${path}`, { ...options, signal: AbortSignal.timeout(25000), headers: { Authorization: `Bearer ${access}`, ...(options?.headers || {}) } });
    if (!response.ok) {
      if (response.status === 401) await removeToken(access).catch(() => {});
      const error = new Error(response.status === 401 ? 'DRIVE_AUTH_REQUIRED' : `DRIVE_HTTP_${response.status}`); error.status = response.status; throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  async function session(expectedAccount = '', interactive = false) {
    const access = await token(interactive);
    const about = await fetchJson('/about?fields=user(permissionId,emailAddress,displayName)', {}, access);
    if (!about.user?.permissionId) throw new Error('DRIVE_ACCOUNT_UNKNOWN');
    if (expectedAccount && about.user.permissionId !== expectedAccount) throw new Error('DRIVE_ACCOUNT_CHANGED');
    return { token: access, accountId: about.user.permissionId, account: about.user.emailAddress || about.user.displayName || 'Google Drive' };
  }
  async function request(path, options = {}, access = null, upload = false) {
    const s = access || await session((await state()).accountId);
    return fetchJson(path, options, s.token, upload);
  }
  async function list(access = null) {
    const s = access || await session((await state()).accountId);
    const files = []; let pageToken = '';
    do {
      const query = new URLSearchParams({ spaces: 'appDataFolder', fields: 'nextPageToken,files(id,name,size,createdTime,modifiedTime,appProperties)', orderBy: 'createdTime desc', q: 'trashed=false', pageSize: '100', ...(pageToken ? { pageToken } : {}) });
      const page = await request(`/files?${query}`, {}, s); files.push(...(page.files || [])); pageToken = page.nextPageToken || '';
    } while (pageToken);
    return { files };
  }
  const networkLock = fn => typeof RNoteSync !== 'undefined' ? RNoteSync.lock('rstartpage-drive-network', fn) : fn();
  async function connect(onAuthorized = () => {}, confirmAccount = async () => false) {
    return networkLock(async () => {
      // Interactive auth remains owned by this explicit user click.
      await token(true); onAuthorized();
      const access = await session();
      await list(access);
      const previous = await state();
      if (previous.accountId && previous.accountId !== access.accountId && !await confirmAccount(previous.account, access.account)) throw new Error('DRIVE_ACCOUNT_CANCELLED');
      if (typeof RNoteSync !== 'undefined') await RNoteSync.bind(access.accountId);
      await chrome.storage.local.set({ [META_KEY]: { connected: true, accountId: access.accountId, account: access.account, connectedAt: Date.now() } });
      chrome.runtime.sendMessage?.({ type: 'drive:sync' }).catch(() => {});
      return state();
    });
  }
  async function disconnect() {
    return networkLock(async () => {
      const old = await state();
      if (typeof RNoteSync !== 'undefined') await RNoteSync.disconnect();
      await chrome.storage.local.set({ [META_KEY]: { ...old, connected: false } });
      try {
        if (typeof RFirefoxDriveAuth !== 'undefined') await RFirefoxDriveAuth.removeToken();
        else { const access = await token(false); await removeToken(access); }
      } catch (_) { /* Disconnection works offline. */ }
    });
  }
  async function upload(name, value, existingId = '', appProperties = {}, access = null) {
    const metadata = { name, mimeType: 'application/json', appProperties, ...(existingId ? {} : { parents: ['appDataFolder'] }) };
    const boundary = `rstartpage-${crypto.randomUUID()}`;
    const multipart = [`--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata), `--${boundary}`, 'Content-Type: application/json', '', JSON.stringify(value), `--${boundary}--`].join('\r\n');
    const path = existingId ? `/files/${encodeURIComponent(existingId)}?uploadType=multipart` : '/files?uploadType=multipart';
    return request(path, { method: existingId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart }, access, true);
  }
  const download = (id, access = null) => request(`/files/${encodeURIComponent(id)}?alt=media`, {}, access);
  const remove = (id, access = null) => request(`/files/${encodeURIComponent(id)}`, { method: 'DELETE' }, access);
  return { ROOT, META_KEY, state, isConfigured, session, connect, disconnect, list, upload, download, remove };
})();
