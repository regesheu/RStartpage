import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { webcrypto } from 'node:crypto';

class StorageArea {
  constructor(initial = {}) { this.values = structuredClone(initial); }
  async get(keys) {
    if (keys == null) return structuredClone(this.values);
    if (typeof keys === 'string') return { [keys]: structuredClone(this.values[keys]) };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map((key) => [key, structuredClone(this.values[key])]).filter(([, value]) => value !== undefined));
    return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, structuredClone(this.values[key] ?? fallback)]));
  }
  async set(patch) { Object.assign(this.values, structuredClone(patch)); }
  async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete this.values[key]; }
}

const sync = new StorageArea();
const local = new StorageArea();
const updates = [];
const context = vm.createContext({
  console,
  URL,
  URLSearchParams,
  TextEncoder,
  AbortSignal,
  AbortController,
  Blob,
  fetch,
  performance,
  crypto: webcrypto,
  structuredClone,
  setTimeout,
  setImmediate,
  Uint8Array,
  ArrayBuffer,
  clearTimeout,
  chrome: {
    runtime: { getURL: (path) => `chrome-extension://test/${String(path).replace(/^\//, '')}`, getManifest: () => ({ version: '1.8.0', oauth2: { client_id: 'REPLACE_WITH_CLIENT.apps.googleusercontent.com' } }), sendMessage: async () => {} },
    storage: { sync, local },
    bookmarks: {
      async get() { return []; },
      async update(id, patch) { updates.push({ id, patch }); return { id, ...patch }; },
      async remove() {},
    },
    proxy: { settings: { async set() {}, async clear() {}, async get() { return { levelOfControl: 'controllable_by_this_extension' }; } } },
  },
});

function load(file, globalName) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  vm.runInContext(`${source}\nglobalThis.${globalName} = ${globalName};`, context, { filename: file });
  return context[globalName];
}

const RS = load('shared.js', 'RStartpage');
RS.setLanguage('en');
RS.setProductName('Dashboard');
assert.equal(RS.pageTitle(), 'Dashboard');
assert.equal(RS.pageTitle('Tools'), 'Tools — Dashboard');
assert.equal(RS.t('search.placeholder'), 'Search Dashboard');
assert.equal(RS.normalizeProductName('  Dashboard\n'), 'Dashboard');
assert.equal(RS.normalizeUrl('example.com'), 'https://example.com');

const ProxyStore = load('proxy-shared.js', 'ProxyStore');
assert.match(ProxyStore.t('en', 'badgeHelp'), /Dashboard/);

const profileA = ProxyStore.cleanProfile({ id: 'a', name: 'Fallback', scheme: 'http', host: 'fallback.test', port: 8080, bypass: ['*.local'] });
const profileB = ProxyStore.cleanProfile({ id: 'b', name: 'Route', scheme: 'http', host: 'route.test', port: 3128, bypass: ['10.0.0.0/8'] });
const rule = ProxyStore.cleanRule({ id: 'r', name: 'Example', pattern: '*.example.com', targetId: 'b', enabled: true });
await sync.set({
  [`${ProxyStore.PROFILE_PREFIX}a`]: profileA,
  [`${ProxyStore.PROFILE_PREFIX}b`]: profileB,
  [ProxyStore.ORDER_KEY]: ['a', 'b'],
  [`${ProxyStore.RULE_PREFIX}r`]: rule,
  [ProxyStore.RULE_ORDER_KEY]: ['r'],
});
const pac = (await ProxyStore.toSmartProxyConfig(profileA)).pacScript.data;
assert.ok(pac.indexOf('return "DIRECT"') < pac.indexOf('PROXY route.test:3128'), 'bypass must precede Smart Rules');
assert.ok(pac.indexOf('PROXY route.test:3128') < pac.lastIndexOf('PROXY fallback.test:8080'), 'Smart Rule must precede fallback');

await local.set({ rsp_proxy_secret_v1_a: { password: 'secret' } });
const safeExport = await ProxyStore.exportData({ includePasswords: false });
assert.equal('password' in safeExport.profiles.find((item) => item.id === 'a'), false);
const secretExport = await ProxyStore.exportData({ includePasswords: true });
assert.equal(secretExport.profiles.find((item) => item.id === 'a').password, 'secret');
const rulesExport = await ProxyStore.exportRules();
assert.equal(rulesExport.format, 'RStartpage Smart Proxy Rules');
assert.equal(rulesExport.rules.length, 1);
assert.equal(rulesExport.targets[0].id, 'b');
const rulesImport = await ProxyStore.importRules({ ...rulesExport, rules: [...rulesExport.rules, { name: 'Internal', pattern: '*.internal.test', targetId: 'b', enabled: true }] });
assert.equal(rulesImport.rulesImported, 1);
assert.equal((await ProxyStore.getRules()).length, 2);
await assert.rejects(() => ProxyStore.prepareRulesImport({ format: 'RStartpage Smart Proxy Rules', version: 1, targets: [], rules: [{ name: 'Missing', pattern: '*.missing.test', targetId: 'unknown', enabled: true }] }), /RULES_TARGET/);

const RTools = load('tools-shared.js', 'RTools');
assert.equal(RTools.normalizedDuplicateUrl('HTTPS://Example.COM:443/#section'), 'https://example.com');
let movedMeta = null;
RS.moveBookmarkMeta = async (before, after) => { movedMeta = { before, after }; };
const updated = await RTools.updateBookmarkEntry({ id: '42', title: 'Old', url: 'https://old.test', path: 'Bookmarks / RStartpage / Work / Favorites' }, { title: 'New', url: 'new.test' });
assert.equal(JSON.stringify(updates.at(-1)), JSON.stringify({ id: '42', patch: { title: 'New', url: 'https://new.test' } }));
assert.equal(updated.url, 'https://new.test');
assert.equal(movedMeta.before[0], 'b');
assert.equal(movedMeta.after.at(-2), 'New');

const RNotes = load('notes-shared.js', 'RNotes');
await RNotes.saveGroup({ id: 'work', name: 'Работа' });
const note = await RNotes.saveNote({ title: 'Пример', content: 'Текст', tags: ['тег'], groupId: 'work', sourceUrl: 'https://example.com', sync: true });
await RS.saveSettings({ language: 'ru', productName: 'My workspace' });
await RS.saveBackgroundImage('data:image/png;base64,YWJj');
await RTools.saveSession({ name: 'Window', tabs: [{ url: 'https://example.com', title: 'Example', pinned: true }] });
// Bookmark storage is already covered by the legacy importer. Here its export is
// a fixture so transfer tests can exercise every other real store without a browser.
RS.exportPortable = async () => ({ format: 'RStartpage', version: 3, settings: { language: 'en' }, workspaces: [{ title: 'Work', groups: [{ title: 'Links', bookmarks: [{ title: 'Example', url: 'https://example.com' }] }] }] });
const bookmarkWrites = [];
RS.importPortable = async (data, options) => { bookmarkWrites.push({ data, options }); };
vm.runInContext(fs.readFileSync(new URL('../vendor/jszip.min.js', import.meta.url), 'utf8'), context);
const RTransfer = load('transfer-shared.js', 'RTransfer');
const archive = await RTransfer.collect();
assert.deepEqual(Object.keys(archive.sections).sort(), ['bookmarks', 'notes', 'proxies', 'sessions', 'settings']);
assert.equal(archive.sections.settings.backgroundImage, 'data:image/png;base64,YWJj');
assert.equal(archive.sections.bookmarks.settings, undefined, 'bookmark-only transfer must not change settings');
assert.equal(archive.sections.proxies.profiles.some(p => p.password), false, 'default archive excludes proxy passwords');
assert.equal((await RTransfer.collect(['proxies'], true)).sections.proxies.profiles.find(p => p.id === 'a').password, 'secret');
const zip = await RTransfer.toZip(archive);
assert.equal((new Uint8Array(await zip.arrayBuffer()))[0], 0x50, 'download is a real ZIP');
const parsed = await RTransfer.readFile({ name: 'backup.zip', size: zip.size, arrayBuffer: () => zip.arrayBuffer() });
assert.equal(parsed.sections.notes.notes[0].sourceUrl, 'https://example.com');
assert.equal(RTransfer.normalize({ format: 'RStartpage Sessions', sessions: archive.sections.sessions }).sections.sessions.sessions.length, 1, 'legacy wrapped sessions import');
assert.equal(RTransfer.normalize(archive.sections.notes).sections.notes.notes.length, 1, 'legacy notes JSON import');
assert.equal(RTransfer.normalize({ format: 'RStartpage', version: 3, workspaces: [] }).sections.bookmarks.workspaces.length, 0, 'empty backups remain valid');
assert.throws(() => RTransfer.normalize({ format: 'RStartpage Archive', version: 99, sections: {} }), /ARCHIVE_INVALID/);
await assert.rejects(() => RTransfer.readFile({ name: 'large.zip', size: 65 * 1024 * 1024 }), /ARCHIVE_SIZE/);

await RNotes.saveNote({ id: note.id, title: 'Changed', content: 'Changed', sync: false });
await RTransfer.restore(parsed, ['notes'], 'replace');
assert.equal((await RNotes.listNotes())[0].title, 'Пример');
assert.equal((await RNotes.listNotes())[0].sync, true, 'restore preserves sync choice');
assert.equal((await RNotes.listNotes())[0].id, note.id, 'restore preserves identity');
await RTransfer.restore(parsed, ['notes'], 'merge');
assert.equal((await RNotes.listNotes()).length, 1, 'repeat restore does not duplicate a note');
assert.equal(bookmarkWrites.length, 0, 'unselected bookmarks untouched');
await RS.saveSettings({ language: 'en', productName: 'Changed' });
await RS.saveBackgroundImage('');
await RTransfer.restore(parsed, ['settings'], 'replace');
assert.equal((await RS.loadSettings()).productName, 'My workspace');
assert.equal(await RS.loadBackgroundImage(), 'data:image/png;base64,YWJj');

const before = JSON.stringify({ sync: sync.values, local: local.values });
const invalidArchive = structuredClone(archive); invalidArchive.sections.proxies.profiles[0].port = -1;
await assert.rejects(() => RTransfer.restore(invalidArchive, ['notes', 'proxies'], 'replace'), /ARCHIVE_INVALID/);
assert.equal(JSON.stringify({ sync: sync.values, local: local.values }), before, 'invalid multi-section archive makes no writes');
const oversizedNotes = structuredClone(archive);
oversizedNotes.sections.notes.notes = Array.from({ length: 5 }, (_, i) => ({ ...note, id: String(i), content: 'x'.repeat(20000), sync: true }));
await assert.rejects(() => RTransfer.restore(oversizedNotes, ['bookmarks', 'notes'], 'replace'), /SYNC_QUOTA/);
assert.equal(bookmarkWrites.length, 0, 'quota preflight precedes writes to other sections');

const requests = [];
context.chrome.identity = { getAuthToken: async () => ({ token: 'test-token' }), removeCachedAuthToken: async () => {} };
const RDrive = load('drive-shared.js', 'RDrive');
assert.equal(RDrive.isConfigured(), false);
await assert.rejects(() => RDrive.connect(), /DRIVE_NOT_CONFIGURED/);
assert.equal((await RDrive.state()).connected, false);
context.chrome.runtime.getManifest = () => ({ version: '1.8.0', oauth2: { client_id: '12345-real.apps.googleusercontent.com' } });
context.fetch = async (url, options) => {
  requests.push({ url, options });
  return { ok: true, status: options.method === 'DELETE' ? 204 : 200, json: async () => url.includes('pageToken=next') ? { files: [{ id: 'second' }] } : url.includes('spaces=appDataFolder') ? { nextPageToken: 'next', files: [{ id: 'first' }] } : { id: 'uploaded' } };
};
await RDrive.connect();
assert.equal((await RDrive.state()).connected, true);
assert.equal((await RDrive.list()).files.length, 2, 'Drive follows pagination');
await RDrive.upload('rstartpage-archive-test.json', archive);
assert.match(requests.at(-1).url, /^https:\/\/www.googleapis.com\/upload\/drive\/v3\/files\?uploadType=multipart$/);
assert.ok(requests.at(-1).options.body.includes('"parents":["appDataFolder"]'));
await RDrive.remove('a/b');
assert.match(requests.at(-1).url, /files\/a%2Fb$/);
assert.equal(requests.at(-1).options.method, 'DELETE');
await RDrive.disconnect();
assert.equal((await RDrive.state()).connected, false);
context.fetch = async () => ({ ok: false, status: 403, text: async () => 'Forbidden' });
await assert.rejects(() => RDrive.connect(), /Forbidden/);
assert.equal((await RDrive.state()).connected, false, 'failed authorization never reports connected');
console.log('Core, archive round-trip, selective restore, validation and Drive transport tests passed');
