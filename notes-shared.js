'use strict';

const RNotes = (() => {
  const NOTES_LOCAL_KEY = 'rstartpageNotesLocalV2';
  const GROUPS_LOCAL_KEY = 'rstartpageNoteGroupsLocalV2';
  const SYNC_KEY = 'rstartpageSyncedNotesV2';
  const LEGACY_NOTES_KEY = 'rstartpageNotesV1';
  const LEGACY_GROUPS_KEY = 'rstartpageNoteGroupsV1';
  // Firefox stores this collection as one sync item (8 KB including its key).
  // Leave room for the record key; larger collections can use Google Drive.
  const SYNC_LIMIT = globalThis.browser?.runtime?.getBrowserInfo ? 7 * 1024 : 70 * 1024;

  function uid(prefix = 'n') { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  function cleanTags(tags) { return [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(',')).map((tag) => String(tag).trim().replace(/^#/, '').slice(0, 40)).filter(Boolean))].slice(0, 20); }
  function cleanNote(raw = {}) { const now = Date.now(); return { id: String(raw.id || uid()), title: String(raw.title || '').trim(), tags: cleanTags(raw.tags), content: String(raw.content || ''), groupId: String(raw.groupId || 'inbox'), sourceUrl: String(raw.sourceUrl || '').slice(0, 2000), sync: raw.sync === true, createdAt: Number(raw.createdAt) || now, updatedAt: Number(raw.updatedAt) || now, ...(raw._clock ? { _clock: raw._clock } : {}), ...(raw.conflictOf ? { conflictOf: String(raw.conflictOf) } : {}) }; }
  function cleanGroup(raw = {}) { return { id: String(raw.id || uid('g')), name: String(raw.name || 'Group').trim().slice(0, 80) || 'Group', createdAt: Number(raw.createdAt) || Date.now(), ...(raw._clock ? { _clock: raw._clock } : {}) }; }
  function inbox() { return { id: 'inbox', name: 'Inbox', createdAt: 0 }; }

  async function read() {
    const [local, sync] = await Promise.all([chrome.storage.local.get([NOTES_LOCAL_KEY, GROUPS_LOCAL_KEY, 'rstartpageNotesChromeDetached']), chrome.storage.sync.get([SYNC_KEY, LEGACY_NOTES_KEY, LEGACY_GROUPS_KEY])]);
    let notes = Array.isArray(local[NOTES_LOCAL_KEY]) ? local[NOTES_LOCAL_KEY].map(cleanNote) : [];
    let groups = Array.isArray(local[GROUPS_LOCAL_KEY]) ? local[GROUPS_LOCAL_KEY].map(cleanGroup) : [];
    let remote = sync[SYNC_KEY] && typeof sync[SYNC_KEY] === 'object' ? sync[SYNC_KEY] : (Array.isArray(sync[LEGACY_NOTES_KEY]) ? { notes: sync[LEGACY_NOTES_KEY].map((note) => ({ ...note, sync: true })), groups: sync[LEGACY_GROUPS_KEY] || [] } : { notes: [], groups: [] });
    if (local.rstartpageNotesChromeDetached) { const selected = new Set(notes.filter(n => n.sync).map(n => n.id)); remote = { notes: (remote.notes || []).filter(n => selected.has(n.id)), groups: [] }; }
    const byId = new Map(notes.map((note) => [note.id, note]));
    for (const incoming of (remote.notes || []).map((note) => cleanNote({ ...note, sync: true }))) { const current = byId.get(incoming.id); if (!current || incoming.updatedAt >= current.updatedAt) byId.set(incoming.id, incoming); }
    notes = [...byId.values()].filter((note) => note.title || note.content);
    const groupMap = new Map([['inbox', inbox()], ...groups.map((group) => [group.id, group]), ...(remote.groups || []).map((group) => { const cleaned = cleanGroup(group); return [cleaned.id, cleaned]; })]);
    groups = [...groupMap.values()];
    return { notes, groups };
  }

  function syncPayload(data) { const notes = data.notes.filter((note) => note.sync).map((note) => ({ ...note, sync: true })); const ids = new Set(notes.map((note) => note.groupId)); const groups = data.groups.filter((group) => group.id !== 'inbox' && ids.has(group.id)); return { version: 2, notes, groups }; }
  function bytes(value) { return new TextEncoder().encode(JSON.stringify(value)).length; }

  async function write(data, options = {}) { if (typeof RNoteSync !== 'undefined' && await RNoteSync.commit(data, options)) return; const payload = syncPayload(data); const used = bytes(payload); if (used > SYNC_LIMIT) { const error = new Error('Selected notes exceed the sync limit.'); error.code = 'SYNC_QUOTA'; error.used = used; error.limit = SYNC_LIMIT; throw error; } await chrome.storage.local.set({ [NOTES_LOCAL_KEY]: data.notes, [GROUPS_LOCAL_KEY]: data.groups.filter((group) => group.id !== 'inbox') }); await chrome.storage.sync.set({ [SYNC_KEY]: payload }); }
  async function listNotes() { return (await read()).notes.sort((a, b) => b.updatedAt - a.updatedAt); }
  async function listGroups() { return (await read()).groups; }
  async function getSyncUsage() { const data = await read(); const payload = syncPayload(data); const used = bytes(payload); return { used, limit: SYNC_LIMIT, percent: Math.min(100, Math.round((used / SYNC_LIMIT) * 100)), count: payload.notes.length }; }
  async function saveNote(raw) { const data = await read(); const existing = data.notes.find((note) => note.id === raw.id); const note = cleanNote({ ...existing, ...raw, id: existing?.id || raw.id || uid(), createdAt: existing?.createdAt || raw.createdAt || Date.now(), updatedAt: Date.now() }); if (!note.title && !note.content) throw new Error('Note title or content is required.'); if (!data.groups.some((group) => group.id === note.groupId)) note.groupId = 'inbox'; data.notes = existing ? data.notes.map((item) => item.id === note.id ? note : item) : [note, ...data.notes]; await write(data, { baseId: raw.id, base: raw._base }); return note; }
  async function setSync(id, enabled) { const data = await read(); const note = data.notes.find((item) => item.id === id); if (!note) return null; note.sync = enabled === true; note.updatedAt = Date.now(); await write(data); return note; }
  async function removeNote(id) { const data = await read(); await write({ ...data, notes: data.notes.filter((note) => note.id !== id) }); }
  async function saveGroup(raw) { const data = await read(); const group = cleanGroup(raw); if (group.id === 'inbox') return data.groups[0]; data.groups = data.groups.some((item) => item.id === group.id) ? data.groups.map((item) => item.id === group.id ? group : item) : [...data.groups, group]; await write(data); return group; }
  async function removeGroup(id) { if (id === 'inbox') return; const data = await read(); data.notes = data.notes.map((note) => note.groupId === id ? { ...note, groupId: 'inbox', updatedAt: Date.now() } : note); await write({ ...data, groups: data.groups.filter((group) => group.id !== id) }); }
  async function renameTag(from, to) { const oldTag = String(from || '').trim().replace(/^#/, ''); const newTag = String(to || '').trim().replace(/^#/, ''); if (!oldTag || !newTag) throw new Error('Tag name is required.'); const data = await read(); data.notes = data.notes.map((note) => note.tags.includes(oldTag) ? { ...note, tags: cleanTags(note.tags.map((tag) => tag === oldTag ? newTag : tag)), updatedAt: Date.now() } : note); await write(data); }
  async function removeTag(tag) { const target = String(tag || '').trim().replace(/^#/, ''); const data = await read(); data.notes = data.notes.map((note) => note.tags.includes(target) ? { ...note, tags: note.tags.filter((item) => item !== target), updatedAt: Date.now() } : note); await write(data); }
  async function exportNotes() { const data = await read(); return { format: 'RStartpage Notes', version: 2, exportedAt: new Date().toISOString(), notes: data.notes.map(({ _clock, ...note }) => note), groups: data.groups.filter((group) => group.id !== 'inbox').map(({ _clock, ...group }) => group) }; }
  async function importNotes(bundle, { merge = true } = {}) { if (!bundle || !Array.isArray(bundle.notes)) { const error = new Error('Invalid notes file.'); error.code = 'NOTES_INVALID'; throw error; } const current = await read(); const importedGroups = Array.isArray(bundle.groups) ? bundle.groups.map(cleanGroup).filter((group) => group.id !== 'inbox') : []; const groups = merge ? [...current.groups, ...importedGroups] : [inbox(), ...importedGroups]; const uniqueGroups = [...new Map(groups.map((group) => [group.id, group])).values()]; const incoming = bundle.notes.map(cleanNote).filter((note) => note.title || note.content).map((note) => ({ ...note, id: uid(), sync: false, updatedAt: Date.now() })); await write({ notes: merge ? [...incoming, ...current.notes] : incoming, groups: uniqueGroups }); return incoming.length; }
  async function replaceFromCloud(bundle) { return restoreNotes(bundle, { merge: false }); }
  async function savePendingDraft(draft) { await chrome.storage.local.set({ rstartpagePendingNote: { ...draft, createdAt: Date.now() } }); }
  async function takePendingDraft() { const data = await chrome.storage.local.get('rstartpagePendingNote'); if (data.rstartpagePendingNote) await chrome.storage.local.remove('rstartpagePendingNote'); return data.rstartpagePendingNote || null; }
  async function prepareRestore(bundle, { merge = true } = {}) {
    if (!bundle || !Array.isArray(bundle.notes)) throw new Error('NOTES_INVALID');
    const current = merge ? await read() : { notes: [], groups: [inbox()] };
    const notes = new Map(current.notes.map(note => [note.id, note]));
    for (const raw of bundle.notes) { const note = cleanNote(raw); notes.set(note.id, note); }
    const groups = new Map(current.groups.map(group => [group.id, group]));
    for (const raw of bundle.groups || []) { const group = cleanGroup(raw); if (group.id !== 'inbox') groups.set(group.id, group); }
    const data = { notes: [...notes.values()].map(note => ({ ...note, groupId: groups.has(note.groupId) ? note.groupId : 'inbox' })), groups: [...groups.values()] };
    if (!(typeof RNoteSync !== 'undefined' && await RNoteSync.enabled()) && bytes(syncPayload(data)) > SYNC_LIMIT) throw new Error('SYNC_QUOTA');
    return data;
  }
  async function restoreNotes(bundle, options) { const data = await prepareRestore(bundle, options); await write(data, { restore: true }); return data.notes.length; }
  const atomic = fn => (...args) => typeof RNoteSync !== 'undefined' ? RNoteSync.noteLock(() => fn(...args)) : fn(...args);
  return { read, NOTES_LOCAL_KEY, SYNC_KEY, SYNC_LIMIT, cleanNote, listNotes, listGroups, getSyncUsage, saveNote: atomic(saveNote), setSync: atomic(setSync), removeNote: atomic(removeNote), saveGroup: atomic(saveGroup), removeGroup: atomic(removeGroup), renameTag: atomic(renameTag), removeTag: atomic(removeTag), exportNotes, importNotes: atomic(importNotes), prepareRestore, restoreNotes: atomic(restoreNotes), replaceFromCloud: atomic(replaceFromCloud), savePendingDraft, takePendingDraft };
})();
