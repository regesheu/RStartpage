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
  AbortController,
  Blob,
  fetch,
  performance,
  crypto: webcrypto,
  structuredClone,
  setTimeout,
  clearTimeout,
  chrome: {
    runtime: { getURL: (path) => `chrome-extension://test/${String(path).replace(/^\//, '')}` },
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

console.log('Core behavior tests passed');
