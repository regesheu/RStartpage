'use strict';

// Causal multi-value registers. Each device publishes immutable snapshots, so
// two devices never overwrite the same Drive file. Tombstones are retained.
const RNoteSync = (() => {
  const KEY = 'rstartpageNotesDriveV1';
  const DEVICE_KEY = 'rstartpageDeviceV1';
  const STATUS_KEY = 'rstartpageNotesDriveStatus';
  const PREFIX = 'rstartpage-notes-v1-';
  const LOCAL_KEY = 'rstartpageNotesLocalV2';
  const GROUP_KEY = 'rstartpageNoteGroupsLocalV2';
  const DETACHED_KEY = 'rstartpageNotesChromeDetached';
  const fallbackLocks = new Map();
  function lock(name, fn) {
    if (globalThis.navigator?.locks) return navigator.locks.request(name, fn);
    const next = (fallbackLocks.get(name) || Promise.resolve()).catch(() => {}).then(fn);
    fallbackLocks.set(name, next); return next;
  }
  const noteLock = fn => lock('rstartpage-notes', fn);
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
  const uuid = () => crypto.randomUUID();
  const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
  const join = clocks => clocks.reduce((out, c) => { for (const [id, n] of Object.entries(c || {})) out[id] = Math.max(out[id] || 0, n); return out; }, {});
  function dominates(a, b) { return Object.entries(b).every(([id, n]) => (a[id] || 0) >= n) && Object.entries(a).some(([id, n]) => n > (b[id] || 0)); }
  function merge(...documents) {
    const all = new Map();
    for (const doc of documents) for (const e of doc.entries || []) {
      const key = `${e.kind}:${e.key}`;
      if (!all.has(key)) all.set(key, new Map());
      all.get(key).set(e.id, e);
    }
    const entries = [];
    for (const versions of all.values()) {
      const list = [...versions.values()];
      entries.push(...list.filter(e => !list.some(other => other.id !== e.id && dominates(other.clock, e.clock))));
    }
    entries.sort((a, b) => a.id.localeCompare(b.id));
    return { format: 'RStartpage Notes Sync', version: 1, entries };
  }
  function validate(doc) {
    if (doc?.format !== 'RStartpage Notes Sync' || doc.version !== 1 || !Array.isArray(doc.entries)) throw new Error('DRIVE_SYNC_INVALID');
    for (const e of doc.entries) {
      if (!e || !['note', 'group'].includes(e.kind) || typeof e.key !== 'string' || !e.key || typeof e.id !== 'string' || !e.id || !Number.isFinite(e.stamp) || !e.clock || Array.isArray(e.clock) || typeof e.clock !== 'object' || !Object.values(e.clock).every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('DRIVE_SYNC_INVALID');
      if (e.value !== null && (!e.value || typeof e.value !== 'object' || e.value.id !== e.key || (e.kind === 'note' ? typeof e.value.title !== 'string' || typeof e.value.content !== 'string' || !Array.isArray(e.value.tags) : typeof e.value.name !== 'string'))) throw new Error('DRIVE_SYNC_INVALID');
    }
    return doc;
  }
  function heads(doc, kind, key) { return doc.entries.filter(e => e.kind === kind && e.key === key); }
  function winner(list) { return [...list].sort((a, b) => b.stamp - a.stamp || b.id.localeCompare(a.id))[0]; }
  function withConflicts(doc) {
    const extra = [];
    const keys = new Set(doc.entries.filter(e => e.kind === 'note').map(e => e.key));
    for (const key of keys) {
      const list = heads(doc, 'note', key), best = winner(list);
      for (const e of list) {
        if (e === best || !e.value || canonical(e.value) === canonical(best.value)) continue;
        const copyId = `conflict-${e.id}`;
        if (keys.has(copyId)) continue; // includes a deleted/edited conflict copy
        extra.push({ ...e, id: `copy-${e.id}`, key: copyId, value: { ...e.value, id: copyId, conflictOf: key } });
      }
    }
    return merge(doc, { entries: extra });
  }
  function materialize(doc) {
    const notes = [], groups = [{ id: 'inbox', name: 'Inbox', createdAt: 0 }];
    const records = new Map();
    for(const e of doc.entries) {const key=`${e.kind}:${e.key}`;if(!records.has(key)) records.set(key,[]);records.get(key).push(e);}
    for (const list of records.values()) {
      const best = winner(list);
      if (!best.value) continue;
      const value = { ...best.value, _clock: join(list.map(e => e.clock)) };
      if (best.kind === 'note') notes.push({ ...value, sync: false });
      else if (value.id !== 'inbox') groups.push(value);
    }
    const groupIds = new Set(groups.map(g => g.id));
    return { notes: notes.map(n => groupIds.has(n.groupId) ? n : {...n, groupId:'inbox'}), groups };
  }
  function cleanValue(value) { const { _clock, sync, ...rest } = value; return rest; }
  async function device() {
    return lock('rstartpage-device', async () => {
      const saved = (await chrome.storage.local.get(DEVICE_KEY))[DEVICE_KEY];
      if (saved) return saved;
      const platform = globalThis.navigator?.userAgentData?.platform || (globalThis.browser?.runtime?.getBrowserInfo ? 'Firefox' : 'Chrome');
      const value = { id: uuid(), name: `${platform} · ${uuid().slice(0, 4)}` };
      await chrome.storage.local.set({ [DEVICE_KEY]: value }); return value;
    });
  }
  async function state() { return (await chrome.storage.local.get(KEY))[KEY] || null; }
  async function enabled() { return !!(await state())?.active; }
  async function status(patch) {
    const old = (await chrome.storage.local.get(STATUS_KEY))[STATUS_KEY] || {};
    await chrome.storage.local.set({ [STATUS_KEY]: { ...old, ...patch } });
  }
  async function persist(s, extra = {}) {
    s.doc = withConflicts(s.doc);
    const data = materialize(s.doc);
    await chrome.storage.local.set({ [KEY]: s, [LOCAL_KEY]: data.notes, [GROUP_KEY]: data.groups.filter(g => g.id !== 'inbox'), [DETACHED_KEY]: true, ...extra });
    return data;
  }
  // Called while holding the note lock, in the same transaction as note data.
  async function commit(data, options = {}) {
    const s = await state();
    if (!s?.active) return false;
    const dev = await device();
    const old = materialize(s.doc), changes = [];
    s.counter = s.doc.entries.reduce((n,e) => Math.max(n,e.clock[dev.id]||0),s.counter||0);
    for (const [kind, list, previous] of [['note', data.notes, old.notes], ['group', data.groups, old.groups]]) {
      const before = new Map(previous.map(x => [x.id, x])), after = new Map(list.filter(x => x.id !== 'inbox').map(x => [x.id, x]));
      for (const key of new Set([...before.keys(), ...after.keys()])) {
        if (key === 'inbox') continue;
        const value = after.has(key) ? cleanValue(after.get(key)) : null;
        if (canonical(value) === canonical(before.has(key) ? cleanValue(before.get(key)) : null)) continue;
        const versions = heads(s.doc, kind, key);
        // Editors carry their observed clock. Restores deliberately replace the
        // current version and therefore acknowledge all currently known heads.
        let base = !options.restore && after.get(key)?._clock || join(versions.map(e => e.clock));
        // A draft opened just before Drive was connected has no causal clock.
        // Match its observed content to the imported version when still present.
        if(kind === 'note' && options.baseId === key && options.base && !Object.keys(after.get(key)?._clock || {}).length) {
          base = join(versions.filter(e => canonical(e.value) === canonical(cleanValue(options.base))).map(e => e.clock));
        }
        s.counter++;
        changes.push({ kind, key, id: uuid(), clock: { ...base, [dev.id]: s.counter }, stamp: Date.now(), value });
      }
    }
    if (!changes.length) return true;
    s.doc = merge(s.doc, { entries: changes }); s.dirty = true; s.revision = uuid();
    await persist(s, { [STATUS_KEY]: { phase: 'pending', dirty: true, bytes: bytes({ notes: data.notes.map(cleanValue), groups: data.groups.map(cleanValue) }), lastSync: s.lastSync || 0 } });
    chrome.runtime.sendMessage?.({ type: 'drive:schedule' }).catch(() => {});
    return true;
  }
  async function bind(accountId, data) {
    return noteLock(async () => {
      data ||= await RNotes.read();
      let s = await state();
      if (s && s.accountId !== accountId) {
        await chrome.storage.local.set({ [`${KEY}:${s.accountId}`]: s });
        s = (await chrome.storage.local.get(`${KEY}:${accountId}`))[`${KEY}:${accountId}`] || null;
      }
      if (!s) s = { accountId, active: true, doc: merge(), counter: 0, dirty: false, revision: uuid() };
      s.active = true;
      // Keep prior tombstones and treat edits made while disconnected as changes.
      await chrome.storage.local.set({ [KEY]: s });
      await commit(data);
      s = await state();
      const current = await persist(s);
      await status({phase:'pending',dirty:s.dirty,lastSync:s.lastSync||0,bytes:bytes({notes:current.notes.map(cleanValue),groups:current.groups.map(cleanValue)})});
    });
  }
  async function disconnect() {
    await noteLock(async () => {
      const s = await state(); if (!s) return;
      s.active = false;
      await persist(s, { [STATUS_KEY]: { phase: 'disconnected', dirty: s.dirty, lastSync: s.lastSync || 0 } });
    });
  }
  async function sync() {
    return lock('rstartpage-drive-network', async () => {
      const connection = await RDrive.state();
      const initial = await state();
      if (!connection.connected || !initial?.active || connection.accountId !== initial.accountId) return;
      try {
        await status({ phase: 'syncing' });
        // Pin one verified token to the whole operation; a changed Google account
        // cannot receive data through a token acquired by a later request.
        const access = await RDrive.session(initial.accountId);
        const { files } = await RDrive.list(access);
        let remote = merge();
        for (const file of files.filter(f => f.name.startsWith(PREFIX))) {
          remote = merge(remote, validate(await RDrive.download(file.id, access)));
        }
        let upload;
        await noteLock(async () => {
          const s = await state();
          if (!s?.active || s.accountId !== initial.accountId) return;
          const joined = withConflicts(merge(s.doc, remote));
          s.doc = joined;
          if (canonical(joined) !== canonical(withConflicts(remote))) s.dirty = true;
          if (s.dirty) upload = { doc: s.doc, revision: s.revision };
          await persist(s);
        });
        const dev = await device();
        if (upload) {
          // Immutable upload: interrupted retries may create duplicates, which
          // are harmless because entries have stable IDs and causal clocks.
          const name = `${PREFIX}${dev.id}-${uuid()}.json`;
          await RDrive.upload(name, upload.doc, '', { kind: 'notes-sync', deviceId: dev.id }, access);
        }
        await noteLock(async () => {
          const s = await state(); if (!s?.active || s.accountId !== initial.accountId) return;
          if (upload && s.revision === upload.revision) s.dirty = false;
          s.lastSync = Date.now();
          const data = materialize(s.doc);
          await persist(s, { [STATUS_KEY]: { phase: s.dirty ? 'pending' : 'synced', dirty: s.dirty, lastSync: s.lastSync, bytes: bytes({ notes: data.notes.map(cleanValue), groups: data.groups.map(cleanValue) }) } });
        });
        // Delete only this device's older snapshots after a confirmed upload;
        // that upload includes their tombstones and all revisions we observed.
        if (upload) for (const file of files.filter(f => f.name.startsWith(`${PREFIX}${dev.id}-`))) {
          try { await RDrive.remove(file.id, access); } catch (_) { /* Retry cleanup next cycle. */ }
        }
      } catch (error) {
        const phase = error.message === 'DRIVE_ACCOUNT_CHANGED' ? 'accountChanged' : error.message === 'DRIVE_AUTH_REQUIRED' || error.status === 401 ? 'auth' : error.status === 403 ? 'access' : globalThis.navigator?.onLine === false ? 'offline' : 'error';
        await status({ phase });
        throw error;
      }
    });
  }
  return { KEY, DEVICE_KEY, STATUS_KEY, DETACHED_KEY, PREFIX, noteLock, lock, bytes, canonical, join, dominates, merge, validate, materialize, withConflicts, device, state, enabled, commit, bind, disconnect, sync, cleanValue };
})();
