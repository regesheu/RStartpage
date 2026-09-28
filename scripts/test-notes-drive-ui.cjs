// Run with PLAYWRIGHT_MODULE set when Playwright is installed outside the project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chromium', headless: true });
  try {
    for (const language of ['en', 'ru']) {
      for (const initiallyConnected of [false, true]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(({ language, initiallyConnected }) => {
          const listeners = [];
          const notes = [0, 1, 2].map(i => ({ id: `n${i}`, title: `Sample ${i}`, content: 'x'.repeat(19000), tags: [], groupId: 'inbox', sync: true, createdAt: 1, updatedAt: 1 }));
          const local = { rstartpageNotesLocalV2: notes, rstartpageDriveState: { connected: initiallyConnected, accountId:'test-account' } };
          const sync = { rstartpageSyncedNotesV2: { version: 2, notes, groups: [] } };
          const storage = (store, area) => ({
            get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, store[key]])),
            set: async values => {
              const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { oldValue: store[key], newValue }]));
              Object.assign(store, values);
              listeners.forEach(fn => fn(changes, area));
            }, remove: async key => { delete store[key]; },
          });
          window.chrome = { runtime: { getManifest: () => ({ oauth2: { client_id: '123-test.apps.googleusercontent.com' } }) }, identity: { getAuthToken: async () => ({ token: 'test' }) }, storage: { local: storage(local, 'local'), sync: storage(sync, 'sync'), onChanged: { addListener: fn => listeners.push(fn) } } };
          local.rstartpageNotesDriveV1 = {accountId:'test-account',active:initiallyConnected,dirty:false,revision:'initial',counter:0,doc:{format:'RStartpage Notes Sync',version:1,entries:notes.map((n,i)=>({kind:'note',key:n.id,id:`initial-${i}`,stamp:1,clock:{fixture:i+1},value:{...n,sync:undefined}}))}};
          local.rstartpageNotesDriveStatus = {phase:'synced',bytes:57000,lastSync:Date.now()};
          if(initiallyConnected){local.rstartpageNotesChromeDetached=true;local.rstartpageNotesLocalV2=notes.map(n=>({...n,sync:false,_clock:{fixture:Number(n.id.slice(1))+1}}));}
          window.chrome.runtime.sendMessage=async()=>({ok:true});
          window.testState = { local, sync, connect: async connected => {
            if(connected) await RNoteSync.bind('test-account'); else await RNoteSync.disconnect();
            await chrome.storage.local.set({ rstartpageDriveState: { connected,accountId:'test-account' } });
          } };
          window.RStartpage = {
            loadSettings: async () => ({ language }), loadBackgroundImage: async () => null, applyPageSettings: () => {}, mountNavigation: () => {},
            enableScriptActions: () => document.querySelectorAll('[data-js-action]').forEach(el => { el.disabled = false; }),
            pageTitle: s => s, escapeHtml: s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
          };
        }, { language, initiallyConnected });
        await page.route('https://rstartpage.test/**', route => {
          const name = new URL(route.request().url()).pathname.slice(1);
          if (name === 'shared.js') return route.fulfill({ contentType: 'application/javascript', body: '' });
          return route.fulfill({ path: path.join(root, name) });
        });
        await page.goto('https://rstartpage.test/notes.html');
        await page.locator('.note-card').first().waitFor();
        assert.equal(await page.locator('#notesSyncMeter').isVisible(), !initiallyConnected);
        assert.equal(await page.locator('[data-sync]').first().isVisible(), !initiallyConnected);
        if (!initiallyConnected) assert.equal(await page.locator('#notesNotice').isVisible(), true);
        await page.locator('[data-edit]').first().click();
        await page.locator('#noteTitle').fill('Unsaved draft');
        assert.equal(await page.locator('#noteSyncToggle').isVisible(), !initiallyConnected);
        assert.equal(await page.locator('#noteSync').isChecked(), !initiallyConnected);
        if (!initiallyConnected) await page.locator('#noteSync').focus();
        await page.evaluate(() => testState.connect(true));
        await page.waitForFunction(() => document.querySelector('#notesSyncMeter').hidden);
        assert.equal(await page.locator('#noteSyncToggle').isVisible(), false);
        assert.equal(await page.locator('[data-sync]').first().isVisible(), false);
        assert.equal(await page.locator('#notesNotice').isVisible(), false);
        assert.equal(await page.locator('#noteTitle').inputValue(), 'Unsaved draft');
        if (!initiallyConnected) assert.equal(await page.evaluate(() => document.activeElement.id), 'noteSave');
        await page.locator('#noteSave').click();
        await page.waitForFunction(() => !document.querySelector('#noteDialog').open);
        assert.equal(await page.evaluate(() => testState.local.rstartpageNotesLocalV2.find(n=>n.id==='n0').sync), false);
        assert.equal(await page.evaluate(() => testState.local.rstartpageNotesLocalV2.find(n=>n.id==='n0').title), 'Unsaved draft');
        await page.evaluate(() => testState.connect(false));
        await page.waitForFunction(() => !document.querySelector('#notesSyncMeter').hidden);
        assert.equal(await page.locator('[data-sync]').first().isVisible(), true);
        assert.equal(await page.locator('[data-sync]').first().isChecked(), false);
        // A pending checkbox choice in an open draft must survive connection changes.
        await page.locator('[data-edit]').first().click();
        await page.locator('#noteSync').check();
        await page.evaluate(() => testState.connect(true));
        await page.waitForFunction(() => document.querySelector('#noteSyncToggle').hidden);
        await page.evaluate(() => testState.connect(false));
        await page.waitForFunction(() => !document.querySelector('#noteSyncToggle').hidden);
        assert.equal(await page.locator('#noteSync').isChecked(), true);
        await page.keyboard.press('Escape');
        await page.evaluate(() => testState.connect(true));
        await page.waitForFunction(() => document.querySelector('#notesSyncMeter').hidden);
        await page.setViewportSize({ width: 390, height: 700 });
        await page.locator('#newNoteButton').click();
        await page.locator('#noteTitle').fill('New local note');
        await page.locator('#noteContent').fill('Content without the old character limit. '.repeat(3000));
        assert.equal(await page.locator('#noteSyncToggle').isVisible(), false);
        await page.locator('#noteSave').click();
        await page.waitForFunction(() => !document.querySelector('#noteDialog').open);
        assert.equal(await page.evaluate(() => testState.local.rstartpageNotesLocalV2.find(n => n.title === 'New local note').sync), false);
        assert.equal(await page.locator('.note-sync-chip:visible').count(), 0);
        assert.equal(await page.locator('.note-card').count(), 4);
        assert.equal(await page.locator('#notesDriveStatus').isVisible(), true);
        assert.match(await page.locator('#notesDriveSize').textContent(), /KB|КБ/);
        assert.ok(await page.evaluate(() => testState.local.rstartpageNotesLocalV2.find(n=>n.title==='New local note').content.length > 100000));
        if (language === 'en') assert.doesNotMatch(await page.locator('body').innerText(), /[А-Яа-яЁё]/);
        if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `notes-drive-${language}-${initiallyConnected}.png`) });
        assert.deepEqual(errors, []);
        await page.close();
      }
    }
    console.log('Notes + Drive: initial states, live connect/disconnect, quota prompt, card/editor visibility, focus, draft/sync preservation, save/create, narrow viewport and EN/RU passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
