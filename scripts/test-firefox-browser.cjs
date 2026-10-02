// Install the actual Firefox package in a disposable profile. Network tests use
// local HTTP/proxy servers; neither Google nor a user's proxy is contacted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rstartpage-firefox-'));
  const extension = path.join(temp, 'extension');
  fs.cpSync(path.resolve(__dirname, '../dist/firefox'), extension, { recursive: true });
  let resolveResult;
  const resultPromise = new Promise(resolve => { resolveResult = resolve; });
  const report = http.createServer((req, res) => {
    if (req.url === '/report') {
      let body = ''; req.on('data', chunk => { body += chunk; });
      req.on('end', () => { resolveResult(JSON.parse(body)); res.end('ok'); });
    } else { res.end('DIRECT'); }
  });
  const proxy = http.createServer((req, res) => res.end('FALLBACK'));
  const authenticatedProxy = http.createServer((req, res) => {
    if (req.headers['proxy-authorization'] !== 'Basic ' + Buffer.from('test:password').toString('base64')) {
      res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="RStartpage test"' }); res.end();
    } else res.end('AUTHENTICATED');
  });
  const reportPort = await listen(report), proxyPort = await listen(proxy), authPort = await listen(authenticatedProxy);
  const uuid = '908d290b-e51c-4a5c-90da-610762788b95';
  fs.writeFileSync(path.join(extension, 'test-capture.js'), `globalThis.__testErrors = [];
    addEventListener('error', e => __testErrors.push(e.message));
    addEventListener('unhandledrejection', e => __testErrors.push(String(e.reason)));`);
  // Application code and tests share the extension's normal CSP and API realm.
  fs.writeFileSync(path.join(extension, 'test-page.js'), `
    addEventListener('load', async () => {
      try {
        const deadline = Date.now() + 15000;
        while (!document.querySelector('.app-version') || (document.querySelector('#appNavigation') && !document.querySelector('#appNavigation a'))) {
          if (Date.now() > deadline) throw new Error('Page initialization timed out');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (location.pathname === '/notes.html') {
          document.querySelector('#newNoteButton').click();
          document.querySelector('#noteTitle').value = 'Firefox UI note';
          document.querySelector('#noteContent').value = 'Saved through the real Firefox form';
          document.querySelector('#noteSave').click();
          while (document.querySelector('#noteDialog').open && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
          if (!(await RNotes.listNotes()).some(note => note.title === 'Firefox UI note')) throw new Error('Note form did not save');
        }
        await browser.runtime.sendMessage({ type: 'test:page', page: location.pathname, errors: __testErrors });
      } catch (error) { await browser.runtime.sendMessage({ type: 'test:page', page: location.pathname, errors: [...__testErrors, String(error)] }); }
    });`);
  for (const file of fs.readdirSync(extension).filter(file => file.endsWith('.html'))) {
    const filePath = path.join(extension, file);
    fs.writeFileSync(filePath, fs.readFileSync(filePath, 'utf8').replace('<head>', '<head><script src="test-capture.js"></script>').replace('</body>', '<script src="test-page.js"></script></body>'));
  }
  fs.writeFileSync(path.join(extension, 'test-probe.js'), `
    (async () => {
      const expect = (value, message) => { if (!value) throw new Error(message); };
      const pages = new Map();
      const networkErrors = [];
      browser.webRequest.onErrorOccurred.addListener(details => networkErrors.push({url: details.url, error: details.error}), { urls: ['<all_urls>'] });
      browser.proxy.onError.addListener(error => networkErrors.push({proxyError: error.message}));
      browser.runtime.onMessage.addListener(message => { if (message.type === 'test:page') pages.set(message.page, message.errors); });
      let result;
      try {
        await restoreProxyState();
        const settings = await RStartpage.loadSettings();
        expect(settings.language === 'en' && settings.theme === 'dark', 'English/dark defaults');
        const root = await RStartpage.ensureRoot();
        expect(root.parentId === 'unfiled_____', 'Workspace belongs in Firefox Other Bookmarks');
        const note = await RNotes.saveNote({ title: 'Firefox API note', content: 'Offline content', sync: false });
        expect((await RNotes.listNotes()).some(item => item.id === note.id), 'Persisted local note');
        const snapshot = await RTransfer.collect(['notes', 'settings']);
        expect(snapshot.sections.notes.notes.length > 0, 'Portable Chrome-compatible archive');
        expect(RDrive.isConfigured() === !!globalThis.RFirefoxConfig.driveClientId, 'OAuth matches build configuration');
        const a = await ProxyStore.saveProfile({ id: 'ff-a', name: 'Fallback', scheme: 'http', host: '127.0.0.1', port: ${proxyPort}, bypass: ['127.0.0.1'] });
        const b = await ProxyStore.saveProfile({ id: 'ff-b', name: 'Authenticated', scheme: 'http', host: '127.0.0.1', port: ${authPort}, username: 'test', bypass: [] }, { password: 'password' });
        await ProxyStore.saveRule({ id: 'ff-rule', pattern: 'route.invalid', targetId: b.id, enabled: true });
        // runtime.sendMessage excludes the sending background context. Exercise
        // its queued handlers here; normal extension pages test messaging.
        expect((await runProxyOperation(() => setActiveProxy(a.id))).ok, 'Activate fallback');
        await runProxyOperation(() => ProxyStore.setSmartRouting(true));
        const get = async url => {
          try { return await (await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })).text(); }
          catch (error) { throw new Error(url + ': ' + error); }
        };
        expect(await get('http://fallback.invalid/test') === 'FALLBACK', 'Smart fallback reaches real proxy');
        expect(await get('http://route.invalid/test') === 'AUTHENTICATED', 'Ordered route and HTTP 407 credentials');
        expect(await get('http://127.0.0.1:${reportPort}/direct') === 'DIRECT', 'Bypass reaches direct server');
        await restoreProxyState();
        expect(await get('http://route.invalid/restore') === 'AUTHENTICATED', 'Restart restoration retains Smart Routing');
        await ProxyStore.saveRule({ id: 'ff-rule', pattern: 'route.invalid', targetId: a.id, enabled: true });
        await runProxyOperation(() => ProxyStore.refreshCurrentConfig());
        expect(await get('http://route.invalid/edited') === 'FALLBACK', 'Live rule edit without toggling');
        expect((await runProxyOperation(() => testProxy(b.id))).ok, 'Temporary profile test');
        expect(await get('http://route.invalid/after-test') === 'FALLBACK', 'Profile test restores edited rules');
        await ProxyStore.disable();
        for (const page of ['newtab.html', 'notes.html', 'sessions.html', 'tools.html', 'proxy.html', 'settings.html', 'popup.html']) {
          const tab = await browser.tabs.create({ url: browser.runtime.getURL(page), active: false });
          const deadline = Date.now() + 20000;
          while (!pages.has('/' + page) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
          expect(pages.has('/' + page), page + ' did not finish');
          expect(pages.get('/' + page).length === 0, page + ': ' + pages.get('/' + page).join('; '));
          await browser.tabs.remove(tab.id);
        }
        expect(__testErrors.length === 0, __testErrors.join('; '));
        result = { ok: true, browser: await browser.runtime.getBrowserInfo(), redirect: browser.identity.getRedirectURL(), driveConfigured: RDrive.isConfigured(), pages: [...pages.keys()] };
      } catch (error) { result = { ok: false, error: String(error), stack: error.stack, backgroundErrors: __testErrors, networkErrors }; }
      await ProxyStore.disable().catch(() => {});
      await fetch('http://127.0.0.1:${reportPort}/report', { method: 'POST', body: JSON.stringify(result) });
    })();`);
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.background.scripts.unshift('test-capture.js');
  manifest.background.scripts.push('test-probe.js');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const options = new firefox.Options().addArguments('-headless');
  if (process.env.FIREFOX_BINARY) options.setBinary(process.env.FIREFOX_BINARY);
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ 'rstartpage@regesh.ru': uuid }));
  options.setPreference('extensions.webextensions.userScripts.enabled', false);
  let driver, timer;
  try {
    driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
    await driver.installAddon(extension, true);
    const result = await Promise.race([resultPromise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Firefox integration timed out')), 180000); })]);
    assert.equal(result.ok, true, JSON.stringify(result));
    console.log('Firefox real extension integration passed:', JSON.stringify(result));
  } finally {
    clearTimeout(timer);
    if (driver) await driver.quit();
    for (const server of [report, proxy, authenticatedProxy]) { server.closeAllConnections(); server.close(); }
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
