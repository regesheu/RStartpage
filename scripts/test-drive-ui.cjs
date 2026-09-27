// Browser regression test. Install Playwright or set PLAYWRIGHT_MODULE to its module path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    for (const language of ['en', 'ru']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ language }) => {
        const store = {};
        window.testState = { authCalls: 0 };
        window.chrome = { runtime: { getManifest: () => ({ oauth2: { client_id: '12345-test.apps.googleusercontent.com' } }) },
          identity: {
            getAuthToken: async ({ interactive }) => {
              if (!interactive) return { token: 'test-token' };
              testState.authCalls++;
              return new Promise((resolve, reject) => { testState.authorize = () => resolve({ token: 'test-token' }); testState.cancel = () => reject(new Error('The user did not approve access.')); });
            },
            removeCachedAuthToken: async () => {},
          },
          storage: { local: { get: async key => ({ [key]: store[key] }), set: async value => Object.assign(store, value) } },
        };
        window.fetch = async () => {
          if (testState.holdAccessCheck) await new Promise(resolve => { testState.finishAccessCheck = resolve; });
          return { ok: true, status: 200, json: async () => ({ files: [] }) };
        };
        window.RStartpage = { loadSettings: async () => ({ language }), getLanguage: () => language, getBookmarkFoldersForImport: async () => [] };
        window.RTransfer = { SECTIONS: ['bookmarks', 'notes', 'proxies', 'sessions', 'settings'] };
      }, { language });
      await page.route('https://rstartpage.test/**', route => {
        const name = new URL(route.request().url()).pathname.slice(1);
        if (name === 'settings.html') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="settings.css"><link rel="stylesheet" href="glass.css"><link rel="stylesheet" href="refinement.css"></head><body class="settings-page-body"><main class="settings-page"><section id="settingsData"></section></main><dialog id="dataHelpDialog" class="dialog"></dialog><dialog id="driveConnectDialog" class="dialog drive-connect-dialog" aria-labelledby="driveConnectTitle" aria-describedby="driveConnectProgress"></dialog><script src="drive-shared.js"></script><script src="settings-data.js"></script></body></html>` });
        const file = path.join(root, name);
        return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: '' });
      });
      await page.goto('https://rstartpage.test/settings.html');
      const button = page.locator('#driveConnect');
      await button.waitFor();
      const width = (await button.boundingBox()).width;
      await button.click();
      await page.locator('#driveConnectDialog[open]').waitFor();
      assert.equal(await button.isDisabled(), true);
      assert.equal((await button.boundingBox()).width, width, 'busy button keeps its width');
      assert.match(await page.locator('#driveConnectProgress').textContent(), language === 'ru' ? /Ожидаем вход/ : /Waiting for Google/);
      assert.equal(await page.evaluate(() => testState.authCalls), 1);
      const box = await page.locator('#driveConnectDialog').boundingBox();
      assert.ok(box.width <= 432, 'compact dialog');
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `drive-connecting-${language}.png`) });
      await page.evaluate(() => testState.cancel());
      await page.waitForFunction(() => !document.querySelector('#driveConnect').disabled);
      assert.equal(await page.locator('#driveConnectDialog').evaluate(el => el.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'driveConnect');
      assert.match(await page.locator('#driveMessage').textContent(), language === 'ru' ? /недоступен/ : /unavailable/);
      await button.click();
      await page.evaluate(() => { testState.holdAccessCheck = true; testState.authorize(); });
      await page.waitForFunction(() => !!testState.finishAccessCheck);
      assert.match(await page.locator('#driveConnectProgress').textContent(), language === 'ru' ? /Проверяем доступ/ : /Checking Google Drive/);
      await page.evaluate(() => { testState.holdAccessCheck = false; testState.finishAccessCheck(); });
      await page.waitForFunction(() => !document.querySelector('#driveConnect').disabled);
      assert.equal(await page.locator('#driveStatus').textContent(), language === 'ru' ? 'Подключён' : 'Connected');
      assert.equal(await page.locator('#driveCreate').isDisabled(), false);
      await button.click(); // disconnect
      await page.waitForFunction(() => !document.querySelector('#driveConnect').disabled);
      await page.setViewportSize({ width: 390, height: 700 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await button.click();
      const narrow = await page.locator('#driveConnectDialog').boundingBox();
      assert.ok(narrow.x >= 0 && narrow.x + narrow.width <= 390, 'dialog fits narrow viewport');
      assert.equal(await page.locator('.drive-spinner').evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#driveConnectDialog').evaluate(el => el.open), false);
      assert.equal(await button.isDisabled(), true, 'hiding does not start another auth request');
      await page.evaluate(() => testState.cancel());
      await page.waitForFunction(() => !document.querySelector('#driveConnect').disabled);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Drive UI: loading, cancel/retry, access-check stage, success, disconnect, Escape, focus, narrow viewport, reduced motion, EN/RU passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
