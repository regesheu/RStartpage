// Loads the real extension/service worker; Google transport alone is simulated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rstartpage-extension-'));
  const extension = path.join(temp, 'extension');
  const excluded = new Set(['.git', '.github', 'dist', 'source-bundle', 'scripts', 'docs', 'store']);
  fs.cpSync(root, extension, { recursive: true, filter: file => !path.relative(root, file).split(path.sep).some(p => excluded.has(p)) });
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.oauth2.client_id = '12345-test.apps.googleusercontent.com';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const context = await chromium.launchPersistentContext(path.join(temp,'profile'), {channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await worker.evaluate(async () => {
      if (typeof RDriveWorker !== 'object') throw new Error('Drive worker did not initialize');
      await RNotes.saveNote({id:'large-note',title:'Worker test',content:'x'.repeat(150000)});
      globalThis.testCloud = [];
      RDrive.isConfigured = () => true;
      RDrive.session = async expected => { if(expected !== 'test-account') throw new Error('wrong account'); return {accountId:expected,token:'mock'}; };
      RDrive.list = async () => ({files:testCloud.map(({data,...file})=>file)});
      RDrive.download = async id => testCloud.find(f=>f.id===id).data;
      RDrive.upload = async (name,data,old,appProperties) => { const file={id:crypto.randomUUID(),name,data,appProperties,createdTime:new Date().toISOString()};testCloud.push(file);return {id:file.id}; };
      RDrive.remove = async id => { testCloud=testCloud.filter(f=>f.id!==id); };
      await RNoteSync.bind('test-account');
      await chrome.storage.local.set({[RDrive.META_KEY]:{connected:true,accountId:'test-account',account:'test@example.com'}});
      await RDriveWorker.cycle();
    });
    const state = await worker.evaluate(async () => ({status:(await chrome.storage.local.get(RNoteSync.STATUS_KEY))[RNoteSync.STATUS_KEY],alarms:await chrome.alarms.getAll(),files:testCloud.map(f=>({name:f.name,kind:f.appProperties.kind})),sync:(await chrome.storage.sync.get(RNotes.SYNC_KEY))[RNotes.SYNC_KEY]}));
    assert.equal(state.status.phase,'synced');
    assert.ok(state.status.bytes>100000);
    assert.ok(state.alarms.some(a=>a.name==='rstartpage-drive-poll'));
    assert.ok(state.files.some(f=>f.kind==='notes-sync'));
    assert.ok(state.files.some(f=>f.kind==='auto'));
    assert.equal(state.sync.notes.length,0,'large Drive note never enters Chrome Sync');
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`chrome-extension://${id}/notes.html`);
    await page.locator('#notesDriveStatus').waitFor();
    assert.equal(await page.locator('#notesSyncMeter').isVisible(),false);
    await page.locator('[data-edit]').first().click();
    await page.locator('#noteContent').fill('Updated from real extension page '.repeat(4000));
    await page.locator('#noteSave').click();
    await page.waitForFunction(()=>!document.querySelector('#noteDialog').open);
    await worker.evaluate(()=>RDriveWorker.cycle());
    assert.ok(await worker.evaluate(()=>testCloud.some(f=>f.appProperties.kind==='notes-sync'&&f.data.entries.some(e=>e.value?.content.startsWith('Updated from real')))));
    assert.deepEqual(errors,[]);
    console.log('Real extension: service-worker imports, alarms, Chrome storage, cross-context Web Locks, large-note save, Drive sync and automatic backup passed');
  } finally { await context.close();fs.rmSync(temp,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1});
