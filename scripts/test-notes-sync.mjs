import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const source = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
class Storage {
  constructor() { this.values = {}; this.writes = 0; }
  async get(keys) { return structuredClone(Object.fromEntries((keys == null ? Object.keys(this.values) : Array.isArray(keys) ? keys : [keys]).map(k => [k, this.values[k]]))); }
  async set(patch) { this.writes++; Object.assign(this.values, structuredClone(patch)); }
  async remove(key) { delete this.values[key]; }
}
const cloud = new Map(); let fileId = 0, time = Date.now();
function client(account = 'account-a') {
  const local = new Storage(), chromeSync = new Storage();
  const status = { account, offline: false, failUpload: false, uploadBarrier: null };
  const Clock = class extends Date { static now() { return ++time; } };
  const ctx = vm.createContext({ console, Date: Clock, TextEncoder, crypto: webcrypto, structuredClone, setTimeout, clearTimeout, navigator: { onLine: true },
    chrome: { storage: { local, sync: chromeSync }, runtime: { sendMessage: async () => ({ok:true}), getManifest: () => ({version:'1.8.6'}) } } });
  const load = (name, global) => { vm.runInContext(source(name)+`\nglobalThis.${global}=${global}`, ctx); return ctx[global]; };
  const engine = load('notes-sync.js','RNoteSync');
  const notes = load('notes-shared.js','RNotes');
  ctx.RDrive = {
    state: async () => local.values.rstartpageDriveState || {connected:false},
    session: async expected => { if(status.offline) throw new Error('NETWORK'); if(expected!==status.account) throw new Error('DRIVE_ACCOUNT_CHANGED'); return {accountId:status.account}; },
    list: async access => ({ files:[...cloud.values()].filter(f=>f.account===access.accountId).map(({data,...f})=>structuredClone(f)) }),
    download: async id => structuredClone(cloud.get(id).data),
    upload: async (name,data,existing,appProperties,access) => {
      if (status.failUpload) throw new Error('UPLOAD_FAILED');
      if (status.uploadBarrier) await status.uploadBarrier();
      const id=String(++fileId);cloud.set(id,{id,name,data:structuredClone(data),appProperties,createdTime:new Date(++time).toISOString(),account:access.accountId});return {id};
    }, remove: async id => { cloud.delete(id); },
  };
  async function connect() { await engine.bind(status.account,await notes.read());await local.set({rstartpageDriveState:{connected:true,accountId:status.account,account:status.account}}); }
  async function disconnect() { await engine.disconnect();await local.set({rstartpageDriveState:{...local.values.rstartpageDriveState,connected:false}}); }
  return {ctx,engine,notes,local,chromeSync,status,connect,disconnect,load};
}
const a=client(), b=client();
await a.notes.saveNote({id:'original',title:'Large note',content:'a'.repeat(140000),sync:false});
await a.connect();const chromeWrites=a.chromeSync.writes;
await a.engine.sync();await b.connect();await b.engine.sync();
assert.equal((await b.notes.listNotes())[0].content.length,140000);
assert.equal(a.chromeSync.writes,chromeWrites,'Drive does not write into Chrome Sync');
let note=(await a.notes.listNotes())[0];await a.notes.saveNote({...note,content:'sequential'});await a.engine.sync();await b.engine.sync();
assert.equal((await b.notes.listNotes()).length,1,'sequential edits do not create conflicts');
const draftA=(await a.notes.listNotes())[0],draftB=(await b.notes.listNotes())[0];
await a.notes.saveNote({...draftA,content:'edit on A'});await b.notes.saveNote({...draftB,content:'newer edit on B'});
await Promise.all([a.engine.sync(),b.engine.sync()]);await a.engine.sync();await b.engine.sync();
assert.deepEqual(Array.from(await a.notes.listNotes(),n=>n.content).sort(),['edit on A','newer edit on B']);
assert.equal((await a.notes.listNotes()).find(n=>n.id==='original').content,'newer edit on B');
assert.equal((await a.notes.listNotes()).filter(n=>n.conflictOf).length,1);
assert.equal(a.engine.canonical((await a.engine.state()).doc),b.engine.canonical((await b.engine.state()).doc),'both devices converge');
// Remove a conflict copy; its tombstone suppresses regeneration on later merges.
const conflict=(await a.notes.listNotes()).find(n=>n.conflictOf);await a.notes.removeNote(conflict.id);await a.engine.sync();await b.engine.sync();
assert.equal((await b.notes.listNotes()).length,1);
// A stale editor after a download retains both independent texts.
const stale=(await b.notes.listNotes())[0];
await a.notes.saveNote({...((await a.notes.listNotes())[0]),content:'remote while editor open'});await a.engine.sync();await b.engine.sync();
await b.notes.saveNote({...stale,content:'draft based on old revision'});await b.engine.sync();await a.engine.sync();
assert.ok((await a.notes.listNotes()).some(n=>n.content==='remote while editor open'));
assert.ok((await a.notes.listNotes()).some(n=>n.content==='draft based on old revision'));
// An offline device with no edit must not resurrect a deleted note.
const c=client();await c.connect();await c.engine.sync();
await a.notes.removeNote('original');await a.engine.sync();await c.engine.sync();
assert.equal((await c.notes.listNotes()).some(n=>n.id==='original'),false);
// Independent delete/edit: delete is newer, editing text remains as conflict copy.
await a.notes.saveNote({id:'delete-edit',title:'test',content:'base'});await a.engine.sync();await b.engine.sync();
const editDraft=(await b.notes.listNotes()).find(n=>n.id==='delete-edit');await b.notes.saveNote({...editDraft,content:'offline edit'});await a.notes.removeNote('delete-edit');
await a.engine.sync();await b.engine.sync();await a.engine.sync();
assert.equal((await a.notes.listNotes()).some(n=>n.id==='delete-edit'),false);
assert.ok((await a.notes.listNotes()).some(n=>n.conflictOf==='delete-edit'&&n.content==='offline edit'));
// Durable dirty state survives offline and interrupted uploads.
a.status.offline=true;await a.notes.saveNote({id:'offline',title:'offline',content:'kept'});await assert.rejects(a.engine.sync());assert.equal((await a.engine.state()).dirty,true);
a.status.offline=false;a.status.failUpload=true;await assert.rejects(a.engine.sync());assert.equal((await a.engine.state()).dirty,true);
a.status.failUpload=false;
const restarted=client();restarted.local.values=structuredClone(a.local.values);await restarted.engine.sync();assert.equal((await restarted.engine.state()).dirty,false,'restart resumes the persisted queue');
await a.engine.sync();await b.engine.sync();assert.ok((await b.notes.listNotes()).some(n=>n.id==='offline'));
// Local edit while a network upload is in flight remains pending and is sent later.
await a.notes.saveNote({id:'inflight',title:'one',content:'one'});
let releaseUpload,started;const began=new Promise(r=>started=r);a.status.uploadBarrier=()=>{started();return new Promise(r=>releaseUpload=r)};
const upload=a.engine.sync();await began;await a.notes.saveNote({...((await a.notes.listNotes()).find(n=>n.id==='inflight')),content:'two'});releaseUpload();await upload;
assert.equal((await a.engine.state()).dirty,true);a.status.uploadBarrier=null;await a.engine.sync();await b.engine.sync();assert.equal((await b.notes.listNotes()).find(n=>n.id==='inflight').content,'two');
// A sequential edit with a clock behind the old timestamp still wins causally.
await a.notes.saveNote({id:'skew',title:'Clock skew',content:'first'});await a.engine.sync();await b.engine.sync();
const savedTime=time;time-=3600000;await b.notes.saveNote({...((await b.notes.listNotes()).find(n=>n.id==='skew')),content:'second with slower clock'});time=savedTime;await b.engine.sync();await a.engine.sync();
assert.equal((await a.notes.listNotes()).find(n=>n.id==='skew').content,'second with slower clock');
assert.equal((await a.notes.listNotes()).filter(n=>n.conflictOf==='skew').length,0);
// More than 500 notes, long titles/content and restore without the Chrome quota.
const many=Array.from({length:510},(_,i)=>({id:`many-${i}`,title:'t'.repeat(200),content:i?'text':'x'.repeat(150000),tags:[],sync:true}));
await a.notes.restoreNotes({notes:many,groups:[]},{merge:false});assert.equal((await a.notes.listNotes()).length,510);assert.equal((await a.notes.listNotes()).find(n=>n.id==='many-0').content.length,150000);
await a.engine.sync();await b.engine.sync();assert.equal((await b.notes.listNotes()).length,510);
await a.disconnect();assert.equal((await a.notes.listNotes()).length,510);assert.equal((await a.notes.listNotes()).some(n=>n.sync),false);
await a.notes.saveNote({id:'disconnected',title:'Local',content:'survives reconnect'});await a.connect();await a.engine.sync();await b.engine.sync();assert.ok((await b.notes.listNotes()).some(n=>n.id==='disconnected'));
// An account switch pauses upload instead of silently sending notes elsewhere.
const before=cloud.size;a.status.account='account-b';await assert.rejects(a.engine.sync(),/DRIVE_ACCOUNT_CHANGED/);assert.equal(cloud.size,before);assert.equal(a.local.values[a.engine.STATUS_KEY].phase,'accountChanged');
// Group/tag operations use the same sync path.
b.status.account='account-a';const group=await b.notes.saveGroup({id:'work',name:'Work'});await b.notes.saveNote({id:'tagged',title:'Tags',content:'body',tags:['before'],groupId:group.id});await b.notes.renameTag('before','after');await b.engine.sync();await c.engine.sync();assert.deepEqual(Array.from((await c.notes.listNotes()).find(n=>n.id==='tagged').tags),['after']);
await b.notes.removeGroup('work');await b.engine.sync();await c.engine.sync();assert.equal((await c.notes.listNotes()).find(n=>n.id==='tagged').groupId,'inbox');
// Manual, daily and pre-restore backup retention; automatic copies omit secrets.
const backup=client();await backup.connect();let contentVersion=0;const passwordChoices=[];
backup.ctx.RTransfer={SECTIONS:['notes'],collect:async(_sections,passwords)=>{passwordChoices.push(passwords);return {format:'RStartpage Archive',exportedAt:new Date().toISOString(),sections:{notes:{notes:[{content:String(contentVersion)}]}}}},download:async()=>{}};
backup.ctx.RStartpage={slugDate:()=> 'today'};const backups=backup.load('drive-backups.js','RBackups');
await backups.create('manual',true);await backups.create('before-restore',true);
for(let i=0;i<12;i++){time+=backups.DAY+1;contentVersion++;await backups.create('auto',true);}
const autoFiles=[...cloud.values()].filter(f=>f.appProperties?.kind==='auto');assert.equal(autoFiles.length,10);
assert.ok([...cloud.values()].some(f=>f.appProperties?.kind==='manual'));assert.ok([...cloud.values()].some(f=>f.appProperties?.kind==='before-restore'));
const count=cloud.size;await backups.create('auto');assert.equal(cloud.size,count);time+=backups.DAY+1;await backups.create('auto');assert.equal(cloud.size,count,'unchanged data does not create another backup');
assert.equal(passwordChoices[0],true);assert.equal(passwordChoices.slice(1).some(Boolean),false);
await backup.disconnect();await backups.beforeRestore();assert.ok(backup.local.values[backups.RECOVERY_KEY]);
console.log('Drive notes: two-device convergence, causal conflicts, clock-independent sequencing, tombstones, stale editors, offline/retry, concurrent save, >500 notes, >100KB, groups/tags, account isolation, restore and backup retention passed');
