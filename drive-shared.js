'use strict';

/* Google Drive App Data transport. Set oauth2.client_id in manifest.json before publishing. */
const RDrive = (() => {
  const ROOT = 'rstartpage-drive';
  const META_KEY = 'rstartpageDriveState';
  const API = 'https://www.googleapis.com/drive/v3';
  async function state() { const data = await chrome.storage.local.get(META_KEY); return data[META_KEY] || { connected: false, account: '' }; }
  async function token(interactive = true) {
    if (!chrome.identity?.getAuthToken) throw new Error('Google Drive is unavailable in this browser.');
    const result = await chrome.identity.getAuthToken({ interactive });
    return typeof result === 'string' ? result : result?.token;
  }
  async function request(path, options = {}, interactive = true) {
    const access = await token(interactive);
    const response = await fetch(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${access}`, ...(options.headers || {}) } });
    if (!response.ok) { const body = await response.text(); const error = new Error(body || `Google Drive error ${response.status}`); error.status = response.status; throw error; }
    return response.status === 204 ? null : response.json();
  }
  async function list() { return request(`/files?spaces=appDataFolder&fields=files(id,name,size,createdTime,modifiedTime)&orderBy=createdTime%20desc&q=${encodeURIComponent("trashed=false")}`); }
  async function connect() { await token(true); await chrome.storage.local.set({ [META_KEY]: { connected: true, account: 'Google Drive', connectedAt: Date.now() } }); return state(); }
  async function disconnect() { try { const access = await token(false); await chrome.identity.removeCachedAuthToken({ token: access }); } catch (_) {} await chrome.storage.local.set({ [META_KEY]: { connected: false, account: '' } }); }
  async function upload(name, value, existingId = '') {
    const body = JSON.stringify(value);
    const metadata = { name, mimeType: 'application/json', ...(existingId ? {} : { parents: ['appDataFolder'] }) };
    const boundary = `rstartpage-${Date.now()}`;
    const multipart = [`--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata), `--${boundary}`, 'Content-Type: application/json', '', body, `--${boundary}--`].join('\r\n');
    const path = existingId ? `/files/${encodeURIComponent(existingId)}?uploadType=multipart` : '/files?uploadType=multipart';
    return request(path, { method: existingId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart });
  }
  async function download(id) { const file = await request(`/files/${encodeURIComponent(id)}?alt=media`); return file; }
  async function remove(id) { await request(`/files/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  return { ROOT, state, connect, disconnect, list, upload, download, remove };
})();
