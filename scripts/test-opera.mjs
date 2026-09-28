import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = name => fs.readFileSync(new URL(name, root), 'utf8');
class Area {
  values = {};
  async get(keys) {
    if (keys === null) return structuredClone(this.values);
    return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in this.values).map(key => [key, structuredClone(this.values[key])]));
  }
  async set(values) { Object.assign(this.values, structuredClone(values)); }
  async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete this.values[key]; }
}
const local = new Area(), session = new Area(), callbacks = new Set();
let mode = 'ok', calls = 0;
const chrome = {
  runtime: { id: 'abcdefghijklmnopabcdefghijklmnop', getURL: p => `chrome-extension://test/${p}` },
  storage: { local, session, onChanged: { addListener: f => callbacks.add(f), removeListener: f => callbacks.delete(f) } },
  identity: { launchWebAuthFlow({ url, interactive }, callback) {
    calls++;
    const request = new URL(url);
    assert.equal(request.searchParams.get('prompt'), interactive ? null : 'none');
    assert.equal(request.searchParams.get('response_type'), 'token');
    if (mode === 'cancel') { chrome.runtime.lastError = {message:'cancelled'}; callback(); delete chrome.runtime.lastError; return; }
    const params = new URLSearchParams({state:request.searchParams.get('state'), access_token:'test-token', token_type:'Bearer', expires_in:'3600', scope:'https://www.googleapis.com/auth/drive.appdata'});
    if (mode === 'state') params.set('state', 'wrong');
    if (mode === 'scope') params.set('scope', 'wrong');
    if (mode === 'expiry') params.set('expires_in', '0');
    if (mode === 'type') params.set('token_type', 'Basic');
    if (mode === 'error') params.set('error', 'access_denied');
    const redirect = request.searchParams.get('redirect_uri');
    callback((mode === 'origin' ? 'https://attacker.example/' : mode === 'path' ? redirect+'wrong' : redirect) + '#' + params);
  } },
};
const context = vm.createContext({ chrome, crypto:webcrypto, URL, URLSearchParams, TextEncoder, console,
  ROperaConfig:{driveClientId:'123-test.apps.googleusercontent.com'}, structuredClone });
const load = (file, symbol) => vm.runInContext(source(file)+`\n${symbol}`, context);
const storage = load('opera-storage.js', 'ROperaStorage');
await local.set({privateLocal:'keep'});
await storage.sync.set({theme:'dark', other:'value'});
assert.equal((await storage.sync.get(null)).privateLocal, undefined);
assert.equal((await storage.sync.get({missing:123})).missing, 123);
const events = [];
const listener = (changes, area) => events.push({changes,area});
storage.onChanged.addListener(listener);
storage.onChanged.addListener(listener);
assert.equal(callbacks.size,1);
for (const fn of callbacks) fn({'rstartpageOperaPreferences:theme':{newValue:'light'},privateLocal:{newValue:'keep'}},'local');
assert.equal(events.length,2);
assert.equal(events[1].area,'sync');
assert.equal(events[1].changes.theme.newValue,'light');
assert.equal(events[0].changes['rstartpageOperaPreferences:theme'],undefined);
await storage.sync.remove('other');
assert.equal((await storage.sync.get('other')).other,undefined);
await storage.sync.clear();
assert.equal(local.values.privateLocal,'keep');
storage.onChanged.removeListener(listener);
assert.equal(callbacks.size,0);
const auth = load('opera-drive-auth.js','ROperaDriveAuth');
assert.equal(auth.getRedirectURL(),`https://${chrome.runtime.id}.chromiumapp.org/`);
assert.equal(auth.isConfigured(),true);
assert.equal(await auth.token(true),'test-token');
assert.equal(await auth.token(false),'test-token');
assert.equal(calls,1);
assert.equal(JSON.stringify(local.values).includes('test-token'),false);
await auth.removeToken();
await Promise.all([auth.token(false),auth.token(false)]);
assert.equal(calls,2);
for (mode of ['state','scope','expiry','type','error','origin','path','cancel']) {
  await auth.removeToken();
  await assert.rejects(auth.token(true),/DRIVE_AUTH_REQUIRED/);
  assert.equal(Object.keys(session.values).length,0);
}
mode='ok';
const unconfigured = vm.createContext({chrome,ROperaConfig:{driveClientId:''}});
assert.equal(vm.runInContext(source('opera-drive-auth.js')+'\nROperaDriveAuth.isConfigured()',unconfigured),false);
await assert.rejects(vm.runInContext('ROperaDriveAuth.token(true)',unconfigured),/DRIVE_NOT_CONFIGURED/);

let created, updated;
const tabs = new Map();
const updates = [];
chrome.tabs = {
  onCreated:{addListener:f=>created=f},onUpdated:{addListener:f=>updated=f},
  get:async id=>tabs.get(id), update:async(id,value)=>updates.push({id,...value}),
};
load('opera-newtab.js','true');
for (const [id,url] of ['opera://startpage/','chrome://newtab/','https://example.com/','about:blank','opera://settings/'].entries()) {
  const tab={id,url};tabs.set(id,tab);await created(tab);
}
assert.equal(updates.length,2);
assert.equal(updates[0].url,'chrome-extension://test/newtab.html');
await created({id:6,url:'opera://startpage/',incognito:true});
assert.equal(updates.length,2);
tabs.set(7,{id:7,url:'https://navigation-raced.example/'});
await created({id:7,url:'opera://startpage/'});
assert.equal(updates.length,2,'do not overwrite navigation that raced tab creation');
tabs.set(8,{id:8,url:'opera://startpage/'});
updated(8,{url:'opera://startpage/'},tabs.get(8));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(updates.length,3);
for (const [index,url] of ['chrome://startpage/', 'chrome://startpageshared/', 'opera://startpageshared/', 'chrome://startpage', 'opera://newtab/?source=plus'].entries()) {
  const tab={id:20+index,url};tabs.set(tab.id,tab);await created(tab);
}
assert.equal(updates.length,8,'both Opera and Chromium start-page aliases redirect');
// A newly created tab can withhold its URL until the completion event.
tabs.set(30,{id:30});
await created(tabs.get(30));
assert.equal(updates.length,8);
tabs.set(30,{id:30,url:'chrome://startpage/'});
updated(30,{status:'complete'},tabs.get(30));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(updates.length,9,'late URL is handled on completion');
for (const [index,url] of ['https://startpage/', 'chrome://startpage.evil/', 'chrome://startpage/settings', 'about:blank'].entries()) {
  const tab={id:40+index,url};tabs.set(tab.id,tab);await created(tab);
}
assert.equal(updates.length,9,'similar and blank URLs are not replaced');


const manifest = JSON.parse(source('dist/opera/manifest.json'));
assert.equal(manifest.version,JSON.parse(source('manifest.json')).version);
assert.equal(manifest.oauth2,undefined);
assert.equal(manifest.chrome_url_overrides,undefined);
assert.equal(manifest.background.service_worker,'background.js');
assert.ok(manifest.permissions.includes('identity'));
const key = Buffer.from(manifest.key,'base64');
const id = [...createHash('sha256').update(key).digest('hex').slice(0,32)].map(x=>'abcdefghijklmnop'[parseInt(x,16)]).join('');
for (const file of fs.readdirSync(new URL('dist/opera/',root))) {
  assert.equal(file.startsWith('firefox-'),false);
  if (file.endsWith('.html')) {
    const html=source('dist/opera/'+file);
    if(html.includes('<head>')) assert.ok(html.includes('opera-storage.js'));
  }
  if(file.endsWith('.js') && !file.startsWith('opera-')) assert.equal(source('dist/opera/'+file).includes('chrome.storage'),false);
}
assert.ok(source('dist/opera/background.js').includes("importScripts('opera-storage.js', 'opera-config.js', 'opera-drive-auth.js', 'opera-newtab.js'"));
assert.ok(source('dist/opera/drive-shared.js').includes('ROperaDriveAuth.token(interactive)'));
const notes = load('dist/opera/notes-shared.js','RNotes');
await notes.saveNote({title:'Large imported synced note',content:'x'.repeat(100000),sync:true});
assert.equal((await notes.listNotes())[0].sync,false);
assert.equal((await notes.listNotes())[0].content.length,100000);
assert.equal(source('dist/opera/notes.js').includes("${driveConnected?'hidden':''}"),false);
console.log('Opera: OAuth validation/cache/errors, isolated local preferences/events, safe new-tab routing, large notes and package checks passed');
console.log(`Development extension ID: ${id}`);
console.log(`OAuth redirect: https://${id}.chromiumapp.org/`);
