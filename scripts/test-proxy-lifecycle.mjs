import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); }, emit(...args) { for (const fn of this.listeners) fn(...args); } });
const tick = () => new Promise(resolve => setImmediate(resolve));

async function worker(initial = {}, applyGate = null) {
  const onChanged = event(), onMessage = event(), installed = event(), startup = event();
  const localData = structuredClone(initial), syncData = {};
  function storage(data, area) {
    return {
      async get(keys) {
        if (keys === null) return structuredClone(data);
        return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in data).map(key => [key, structuredClone(data[key])]));
      },
      async set(patch) {
        const changes = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, { oldValue: structuredClone(data[key]), newValue: structuredClone(value) }]));
        Object.assign(data, structuredClone(patch)); onChanged.emit(changes, area);
      },
      async remove(keys) {
        const changes = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) { changes[key] = { oldValue: data[key] }; delete data[key]; }
        onChanged.emit(changes, area);
      },
    };
  }
  let effective = { mode: 'system' }, firstApply = true;
  const settings = {
    async get() { return { levelOfControl: 'controllable_by_this_extension', value: effective }; },
    async set({ value }) {
      if (firstApply && applyGate) { firstApply = false; applyGate.enter(); await applyGate.promise; }
      effective = structuredClone(value);
    },
    async clear() { effective = { mode: 'system' }; },
  };
  const errors = [];
  const canvasContext = new Proxy({}, { get: (target, key) => target[key] || (() => ({})) });
  const chrome = {
    storage: { local: storage(localData, 'local'), sync: storage(syncData, 'sync'), onChanged },
    proxy: { settings, onProxyError: event() },
    runtime: { onMessage, onInstalled: installed, onStartup: startup },
    contextMenus: { onClicked: event(), removeAll: cb => cb(), create: (_, cb) => cb() },
    webRequest: { onAuthRequired: event(), onCompleted: event(), onErrorOccurred: event() },
    commands: { onCommand: event() },
    action: { setBadgeText: async () => {}, setIcon: async () => {}, setTitle: async () => {} },
  };
  const context = vm.createContext({ chrome, URL, TextEncoder, crypto: webcrypto, performance, AbortController,
    console: { error: (...args) => errors.push(args.map(String).join(' ')), log() {} },
    OffscreenCanvas: class { getContext() { return canvasContext; } },
    // Allow the actual test's short settle delay; skip unrelated delayed health probes.
    setTimeout: (fn, ms) => ms === 220 ? setTimeout(fn, 0) : 0, clearTimeout,
    fetch: async () => ({ status: 200 }),
    importScripts() {},
  });
  vm.runInContext(fs.readFileSync(new URL('../proxy-shared.js', import.meta.url), 'utf8') + '\nglobalThis.ProxyStore = ProxyStore;', context);
  const store = context.ProxyStore;
  const a = await store.saveProfile({ id: 'a', name: 'Fallback', scheme: 'http', host: 'fallback.test', port: 8080 });
  const b = await store.saveProfile({ id: 'b', name: 'Rule', scheme: 'http', host: 'route.test', port: 9090 });
  await store.saveRule({ id: 'rule', pattern: '*.example.test', targetId: 'b' });
  localData[store.STATE_KEY] = { enabled: true, activeId: 'a', smartRouting: true };
  vm.runInContext(fs.readFileSync(new URL('../background.js', import.meta.url), 'utf8'), context);
  const drain = async () => {
    for (let i = 0; i < 5; i++) { await tick(); await vm.runInContext('proxyOperations', context); }
    assert.deepEqual(errors, []);
  };
  const command = message => new Promise(resolve => onMessage.emit(message, {}, resolve));
  const route = () => {
    assert.equal(effective.mode, 'pac_script');
    const pac = { shExpMatch: (value, pattern) => new RegExp('^' + pattern.replaceAll('.', '\\.').replaceAll('*', '.*') + '$').test(value), dnsDomainIs: (host, suffix) => host.endsWith(suffix), isPlainHostName: host => !host.includes('.'), isInNet: () => false };
    vm.createContext(pac); vm.runInContext(effective.pacScript.data, pac);
    return pac.FindProxyForURL('https://sub.example.test/path', 'sub.example.test');
  };
  return { store, a, b, command, startup, installed, drain, route, effective: () => effective };
}

const w = await worker();
await w.drain();
assert.equal(w.route(), 'PROXY route.test:9090', 'worker startup restores Smart Routing');
w.startup.emit(); w.installed.emit(); await w.drain();
assert.equal(w.route(), 'PROXY route.test:9090', 'browser startup and update preserve rules');
await w.store.saveRule({ id: 'rule', pattern: '*.example.test', targetId: 'DIRECT' }); await w.drain();
assert.equal(w.route(), 'DIRECT', 'editing a rule takes effect without toggling');
await w.store.setRuleOrder(['rule']);
const test = w.command({ type: 'proxy:test', id: 'b' });
await tick();
await w.store.saveRule({ id: 'rule', pattern: '*.example.test', targetId: 'b' });
const disable = w.command({ type: 'proxy:disable' });
assert.equal((await test).ok, true); assert.equal((await disable).ok, true); await w.drain();
assert.equal(w.effective().mode, 'system', 'queued disable wins over test restoration');
await w.command({ type: 'proxy:activate', id: 'a' }); await w.drain();
assert.equal(w.route(), 'PROXY route.test:9090', 'test restores fresh edited rules');
await w.store.setState({ enabled: false }); await w.drain();
assert.equal(w.effective().mode, 'system', 'external saved-state changes reconcile routing');

let release, entered;
const enteredPromise = new Promise(resolve => { entered = resolve; });
const gate = { enter: entered, promise: new Promise(resolve => { release = resolve; }) };
const raced = await worker({}, gate);
await enteredPromise;
const disableDuringStartup = raced.command({ type: 'proxy:disable' });
release();
assert.equal((await disableDuringStartup).ok, true); await raced.drain();
assert.equal(raced.effective().mode, 'system', 'slow startup cannot overwrite a newer disable');
assert.equal((await raced.store.getState()).enabled, false);
console.log('Proxy lifecycle: Smart Routing on worker wake/update, live rule edits, ordered test/disable, external state and startup race passed');
