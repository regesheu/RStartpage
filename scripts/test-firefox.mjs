import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

class StorageArea {
  values = {};
  async get(keys) {
    if (keys === null) return structuredClone(this.values);
    return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in this.values).map(key => [key, structuredClone(this.values[key])]));
  }
  async set(patch) { Object.assign(this.values, structuredClone(patch)); }
  async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete this.values[key]; }
}
const sync = new StorageArea(), local = new StorageArea(), session = new StorageArea();
let route, permitted = true, dnsCalls = 0, authCalls = 0, authMode = 'ok';
const browser = {
  runtime: { getBrowserInfo: async () => ({ name: 'Firefox' }) },
  storage: { sync, local, session },
  permissions: { contains: async () => permitted },
  proxy: { settings: { get: async () => ({ levelOfControl: 'controllable_by_this_extension' }) }, onRequest: { addListener: fn => { route = fn; } } },
  dns: { resolve: async () => { dnsCalls++; return { addresses: ['10.1.2.3'] }; } },
  identity: {
    getRedirectURL: () => 'https://test.extensions.allizom.org/',
    launchWebAuthFlow: async ({ url, interactive }) => {
      authCalls++;
      const request = new URL(url);
      assert.equal(request.searchParams.get('prompt'), interactive ? null : 'none');
      if (authMode === 'cancel') throw new Error('cancelled');
      const params = new URLSearchParams({ state: authMode === 'state' ? 'wrong' : request.searchParams.get('state'), access_token: 'fake-token', token_type: 'Bearer', expires_in: authMode === 'expired' ? '0' : '3600', scope: authMode === 'scope' ? 'unrelated' : 'https://www.googleapis.com/auth/drive.appdata' });
      return `${authMode === 'origin' ? 'https://wrong.test/' : request.searchParams.get('redirect_uri')}#${params}`;
    },
  },
};
const nativeMenus = {};
const context = vm.createContext({ browser, chrome: { contextMenus: nativeMenus }, URL, URLSearchParams, console, crypto: webcrypto, RFirefoxConfig: { driveClientId: '123-test.apps.googleusercontent.com' } });
function load(file, name) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8') + (name ? `\nglobalThis.${name} = ${name};` : ''), context, { filename: file });
  return context[name];
}
load('firefox-compat.js');
assert.equal(context.chrome.storage, browser.storage);
assert.equal(context.chrome.contextMenus, nativeMenus);
const adapter = load('firefox-proxy.js', 'RFirefoxProxy');
const store = load('proxy-shared.js', 'ProxyStore');
adapter.markReady();
assert.equal((await route({ url: 'https://example.com/' })).length, 0, 'disabled preserves browser settings');
const a = store.cleanProfile({ id: 'a', name: 'Fallback', scheme: 'http', host: 'fallback.test', port: 8080, bypass: ['*.local'] });
const b = store.cleanProfile({ id: 'b', name: 'Rule proxy', scheme: 'socks5', host: 'socks.test', port: 1080, username: 'alice', bypass: ['10.0.0.0/8'] });
await sync.set({ [store.PROFILE_PREFIX + 'a']: a, [store.PROFILE_PREFIX + 'b']: b, [store.RULE_PREFIX + 'r']: { id: 'r', pattern: '*.example.com', targetId: 'b', enabled: true }, [store.RULE_ORDER_KEY]: ['r'] });
await local.set({ rsp_proxy_secret_v1_b: { password: 'secret' } });
await store.applyProfile(a);
let result = await route({ url: 'https://example.com/' });
assert.equal(result[0].host, 'fallback.test');
assert.equal(result[1], null, 'a failed proxy must not silently fall back to DIRECT');
assert.equal(dnsCalls, 0, 'ordinary rules never perform local DNS lookups');
assert.equal(await route({ url: 'https://printer.local/' }), null);
await store.applySmartRouting(a);
assert.equal(await route({ url: 'https://example.com/' }), null, 'CIDR exclusions resolve hostnames as PAC does');
browser.dns.resolve = async () => ({ addresses: ['203.0.113.7'] });
result = await route({ url: 'https://sub.example.com/path' });
assert.equal(result[0].type, 'socks');
assert.equal(result[0].proxyDNS, true);
assert.equal(result[0].username, 'alice');
assert.equal(result[0].password, 'secret');
assert.equal(await route({ url: 'https://10.3.4.5/' }), null, 'global bypass wins before smart rules');
await sync.set({ [store.RULE_PREFIX + 'direct']: { id: 'direct', pattern: '*://sub.example.com/private/*', targetId: 'DIRECT', enabled: true }, [store.RULE_ORDER_KEY]: ['direct', 'r'] });
await store.refreshCurrentConfig();
assert.equal(await route({ url: 'https://sub.example.com/private/1' }), null);
assert.equal((await route({ url: 'https://other.test/' }))[0].host, 'fallback.test');
await store.setSmartRouting(false);
assert.equal((await route({ url: 'https://sub.example.com/' }))[0].type, 'http');
await store.disable();
assert.equal((await route({ url: 'https://example.com/' })).length, 0);
permitted = false;
await assert.rejects(store.applyProfile(a), /Allow access to all websites/);
assert.equal((await store.getState()).enabled, false);
permitted = true;
for (const scheme of ['http', 'https', 'socks4', 'socks5']) {
  await adapter.set({ ...a, scheme });
  assert.equal((await route({ url: 'https://example.com/' }))[0].type, scheme === 'socks5' ? 'socks' : scheme);
}
assert.equal(await adapter.matches('*.example.com', '', 'example.com', () => []), true);
assert.equal(await adapter.matches('.example.com', '', 'badexample.com', () => []), false);
assert.equal(await adapter.matches('<local>', '', 'printer', () => []), true);
assert.equal(await adapter.matches('999.0.0.0/8', '', '10.0.0.1', () => []), false);

const auth = load('firefox-drive-auth.js', 'RFirefoxDriveAuth');
assert.equal(auth.isConfigured(), true);
assert.equal(await auth.token(true), 'fake-token');
assert.equal(await auth.token(false), 'fake-token');
assert.equal(authCalls, 1, 'cached access token does not reopen Google');
assert.equal(JSON.stringify(local.values).includes('fake-token'), false);
assert.equal(JSON.stringify(sync.values).includes('fake-token'), false);
await auth.removeToken();
await Promise.all([auth.token(false), auth.token(false)]);
assert.equal(authCalls, 2, 'concurrent auth is deduplicated');
for (authMode of ['state', 'origin', 'scope', 'expired', 'cancel']) {
  await auth.removeToken();
  await assert.rejects(auth.token(true), /DRIVE_AUTH_REQUIRED/);
  assert.deepEqual(session.values, {});
}
const manifest = JSON.parse(fs.readFileSync(new URL('../dist/firefox/manifest.json', import.meta.url)));
assert.equal(manifest.background.service_worker, undefined);
assert.equal(manifest.permissions.includes('favicon'), false);
assert.equal(manifest.oauth2, undefined);
assert.equal(manifest.browser_specific_settings.gecko.id, 'rstartpage@regesh.ru');
assert.equal(manifest.background.scripts.at(-1), 'background.js');
for (const file of ['newtab.html', 'notes.html', 'settings.html', 'popup.html', 'data.html']) {
  const html = fs.readFileSync(new URL(`../dist/firefox/${file}`, import.meta.url), 'utf8');
  assert.ok(html.includes('firefox-compat.js'));
  if (html.includes('shared.js')) assert.ok(html.indexOf('firefox-compat.js') < html.indexOf('shared.js'));
  assert.equal(html.includes('Chrome Sync'), false);
}
console.log('Firefox: Promise API, proxy protocols/auth/bypass/ordered rules/permissions/disable, OAuth validation/session cache, manifest and page adapters passed');
