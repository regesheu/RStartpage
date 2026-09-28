// Real Chromium MV3 runtime for the Opera package. Does not impersonate Opera
// or claim to verify Google consent; only the Drive transport is mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rstartpage-opera-'));
  const extension = path.join(temp, 'extension');
  fs.cpSync(path.resolve(__dirname, '../dist/opera'), extension, {recursive:true});
  fs.writeFileSync(path.join(extension,'opera-config.js'), 'globalThis.ROperaConfig={driveClientId:"123-test.apps.googleusercontent.com"};');
  const context = await chromium.launchPersistentContext(path.join(temp,'profile'), {
    channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    assert.equal(id,'mmmgbkaajcailpdmghnecgnkbpipkdfb');
    await worker.evaluate(async () => {
      if(typeof RDriveWorker !== 'object') throw new Error('Worker imports failed');
      await RNotes.saveNote({id:'opera-note',title:'Opera test',content:'x'.repeat(150000),sync:true});
    });
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`chrome-extension://${id}/notes.html`);
    await page.locator('.note-card').first().waitFor();
    assert.equal(await page.locator('#notesSyncMeter').isVisible(),false);
    assert.equal(await page.locator('[data-sync]').first().isVisible(),false);
    await page.locator('[data-edit]').first().click();
    assert.equal(await page.locator('#noteSyncToggle').isVisible(),false);
    await page.locator('#noteTitle').fill('Saved in Opera');
    await page.locator('#noteSave').click();
    await page.waitForFunction(()=>!document.querySelector('#noteDialog').open);
    assert.equal(await worker.evaluate(async()=>(await RNotes.listNotes())[0].title),'Saved in Opera');
    await page.goto(`chrome-extension://${id}/settings.html`);
    await page.waitForFunction(()=>document.querySelector('#generalText')?.textContent.includes('saved on this device'));
    await worker.evaluate(async()=>{
      const settings=await RStartpage.loadSettings();
      await ROperaStorage.sync.set({[RStartpage.SETTINGS_KEY]:{...settings,language:'ru'}});
    });
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#generalText')?.textContent.includes('сохраняются на устройстве'));
    for (const name of ['newtab','proxy','sessions','notes','tools','settings','popup']) {
      await page.goto(`chrome-extension://${id}/${name}.html`);
      await page.waitForLoadState('load');
      if(name==='proxy') assert.equal(await page.locator('#syncPasswordInput').isVisible(),false);
    }
    await worker.evaluate(async () => {
      globalThis.testCloud=[];
      RDrive.session=async expected=>{if(expected!=='test-account')throw new Error('wrong account');return {accountId:expected,token:'mock'};};
      RDrive.list=async()=>({files:testCloud.map(({data,...file})=>file)});
      RDrive.download=async id=>testCloud.find(f=>f.id===id).data;
      RDrive.upload=async(name,data,old,appProperties)=>{const file={id:crypto.randomUUID(),name,data,appProperties,createdTime:new Date().toISOString()};testCloud.push(file);return {id:file.id};};
      RDrive.remove=async id=>{testCloud=testCloud.filter(f=>f.id!==id);};
      await RNoteSync.bind('test-account');
      await ROperaStorage.local.set({[RDrive.META_KEY]:{connected:true,accountId:'test-account',account:'test@example.com'}});
      await RDriveWorker.cycle();
    });
    assert.equal(await worker.evaluate(async()=>(await ROperaStorage.local.get(RNoteSync.STATUS_KEY))[RNoteSync.STATUS_KEY].phase),'synced');
    assert.ok(await worker.evaluate(()=>testCloud.some(f=>f.appProperties.kind==='notes-sync')));
    assert.ok(await worker.evaluate(()=>testCloud.some(f=>f.appProperties.kind==='auto')));
    await page.goto(`chrome-extension://${id}/notes.html`);
    await page.locator('#notesDriveStatus').waitFor();
    assert.equal(await page.locator('#notesSyncMeter').isVisible(),false);
    await page.setViewportSize({width:600,height:800});
    await page.locator('[data-edit]').first().click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#noteDialog').evaluate(el=>el.open),false);
    assert.deepEqual(errors,[]);
    console.log('Opera package in Chromium: worker, pages EN/RU, local preferences, large notes, hidden sync controls, Drive sync and backup passed');
  } finally {await context.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
