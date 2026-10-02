// Exercise actual Chromium proxy transport and service-worker termination in a
// disposable extension profile. All selected proxy traffic ends at localhost.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rstartpage-routing-'));
  const extension = path.join(temp, 'extension');
  const source = path.resolve(__dirname, '../dist/opera');
  const excluded = new Set(['.git', '.github', 'dist', 'scripts', 'source-bundle', 'docs', 'store']);
  fs.cpSync(source, extension, { recursive: true, filter: file => !path.relative(source, file).split(path.sep).some(part => excluded.has(part)) });
  const servers = ['FALLBACK', 'RULE', 'DIRECT'].map(label => http.createServer((req, res) => res.end(label)));
  const [fallbackPort, rulePort, directPort] = await Promise.all(servers.map(listen));
  let context;
  try {
    context = await chromium.launchPersistentContext(path.join(temp, 'profile'), { channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/proxy.html`);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(async ({ fallbackPort, rulePort }) => {
      await ProxyStore.saveProfile({ id: 'test-fallback', name: 'Fallback', scheme: 'http', host: '127.0.0.1', port: fallbackPort });
      await ProxyStore.saveProfile({ id: 'test-route', name: 'Rule', scheme: 'http', host: '127.0.0.1', port: rulePort });
      await ProxyStore.saveRule({ id: 'test-rule', pattern: 'route.invalid', targetId: 'test-route' });
      for (const message of [{ type: 'proxy:activate', id: 'test-fallback' }, { type: 'proxy:setSmartRouting', enabled: true }]) {
        const result = await chrome.runtime.sendMessage(message); if (!result?.ok) throw new Error(JSON.stringify(result));
      }
    }, { fallbackPort, rulePort });
    const get = async host => page.evaluate(async host => (await fetch('http://' + host + '/test?nonce=' + crypto.randomUUID(), { cache: 'no-store', signal: AbortSignal.timeout(10000) })).text(), host);
    assert.equal(await get('fallback.invalid'), 'FALLBACK');
    assert.equal(await get('route.invalid'), 'RULE');
    assert.equal(await get('127.0.0.1:' + directPort), 'DIRECT');
    await page.evaluate(async () => {
      await ProxyStore.saveRule({ id: 'test-rule', pattern: 'route.invalid', targetId: 'test-fallback' });
      const result = await chrome.runtime.sendMessage({ type: 'proxy:refreshConfig' }); if (!result?.ok) throw new Error(JSON.stringify(result));
    });
    assert.equal(await get('route.invalid'), 'FALLBACK', 'edited rule applies without toggling');
    const cdp = await context.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    assert.equal(await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'proxy:getStatus' })).ok), true);
    assert.equal(await page.evaluate(async () => (await chrome.proxy.settings.get({ incognito: false })).value.mode), 'pac_script', 'woken worker preserves PAC');
    assert.equal(await get('route.invalid'), 'FALLBACK');
    await page.evaluate(async () => {
      await ProxyStore.saveRule({ id: 'test-rule', pattern: 'route.invalid', targetId: 'test-route' });
      await chrome.runtime.sendMessage({ type: 'proxy:refreshConfig' });
      const result = await chrome.runtime.sendMessage({ type: 'proxy:test', id: 'test-fallback' }); if (!result?.ok) throw new Error(JSON.stringify(result));
    });
    assert.equal(await get('route.invalid'), 'RULE', 'profile test restores Smart Routing');
    assert.equal(await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'proxy:disable' })).ok), true);
    assert.deepEqual(errors, []);
    console.log('Chromium real transport: fallback/rule/direct, live edit, stopped/woken worker and profile-test restoration passed');
  } finally {
    if (context) await context.close();
    for (const server of servers) { server.closeAllConnections(); server.close(); }
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
