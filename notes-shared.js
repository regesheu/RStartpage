'use strict';

const RNotes = (() => {
  const NOTES_KEY = 'rstartpageNotesV1';
  const GROUPS_KEY = 'rstartpageNoteGroupsV1';
  const MAX_NOTES = 500;
  const MAX_CONTENT = 20000;

  function uid(prefix = 'n') {
    return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function cleanTags(tags) {
    return [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(',')).map((tag) => String(tag).trim().replace(/^#/, '').slice(0, 40)).filter(Boolean))].slice(0, 20);
  }

  function cleanNote(raw = {}) {
    const now = Date.now();
    return {
      id: String(raw.id || uid()),
      title: String(raw.title || '').trim().slice(0, 180),
      tags: cleanTags(raw.tags),
      content: String(raw.content || '').slice(0, MAX_CONTENT),
      groupId: String(raw.groupId || 'inbox'),
      sourceUrl: String(raw.sourceUrl || '').slice(0, 2000),
      createdAt: Number(raw.createdAt) || now,
      updatedAt: Number(raw.updatedAt) || now,
    };
  }

  function cleanGroup(raw = {}) {
    return { id: String(raw.id || uid('g')), name: String(raw.name || 'Group').trim().slice(0, 80) || 'Group', createdAt: Number(raw.createdAt) || Date.now() };
  }

  async function read() {
    const data = await chrome.storage.sync.get([NOTES_KEY, GROUPS_KEY]);
    const groups = Array.isArray(data[GROUPS_KEY]) ? data[GROUPS_KEY].map(cleanGroup) : [];
    if (!groups.some((group) => group.id === 'inbox')) groups.unshift({ id: 'inbox', name: 'Inbox', createdAt: Date.now() });
    const notes = Array.isArray(data[NOTES_KEY]) ? data[NOTES_KEY].map(cleanNote).filter((note) => note.title || note.content).slice(0, MAX_NOTES) : [];
    return { notes, groups };
  }

  async function write({ notes, groups }) {
    await chrome.storage.sync.set({ [NOTES_KEY]: notes.slice(0, MAX_NOTES), [GROUPS_KEY]: groups.filter((group) => group.id !== 'inbox').slice(0, 100) });
  }

  async function listNotes() { return (await read()).notes.sort((a, b) => b.updatedAt - a.updatedAt); }
  async function listGroups() { return (await read()).groups; }

  async function saveNote(raw) {
    const data = await read();
    const existing = data.notes.find((note) => note.id === raw.id);
    const note = cleanNote({ ...existing, ...raw, id: existing?.id || raw.id || uid(), createdAt: existing?.createdAt || raw.createdAt || Date.now(), updatedAt: Date.now() });
    if (!note.title && !note.content) throw new Error('Note title or content is required.');
    data.notes = existing ? data.notes.map((item) => item.id === note.id ? note : item) : [note, ...data.notes];
    if (!data.groups.some((group) => group.id === note.groupId)) note.groupId = 'inbox';
    await write(data);
    return note;
  }

  async function removeNote(id) { const data = await read(); await write({ ...data, notes: data.notes.filter((note) => note.id !== id) }); }

  async function saveGroup(raw) {
    const data = await read();
    const group = cleanGroup(raw);
    if (group.id === 'inbox') return data.groups[0];
    data.groups = data.groups.some((item) => item.id === group.id) ? data.groups.map((item) => item.id === group.id ? group : item) : [...data.groups, group];
    await write(data);
    return group;
  }

  async function removeGroup(id) {
    if (id === 'inbox') return;
    const data = await read();
    data.notes = data.notes.map((note) => note.groupId === id ? { ...note, groupId: 'inbox', updatedAt: Date.now() } : note);
    await write({ ...data, groups: data.groups.filter((group) => group.id !== id) });
  }

  async function exportNotes() { const data = await read(); return { format: 'RStartpage Notes', version: 1, exportedAt: new Date().toISOString(), notes: data.notes, groups: data.groups.filter((group) => group.id !== 'inbox') }; }

  async function importNotes(bundle, { merge = true } = {}) {
    if (!bundle || !Array.isArray(bundle.notes) || bundle.notes.length > MAX_NOTES) { const error = new Error('Invalid notes file.'); error.code = 'NOTES_INVALID'; throw error; }
    const current = await read();
    const importedGroups = Array.isArray(bundle.groups) ? bundle.groups.map(cleanGroup).filter((group) => group.id !== 'inbox') : [];
    const groups = merge ? [...current.groups, ...importedGroups] : [{ id: 'inbox', name: 'Inbox', createdAt: Date.now() }, ...importedGroups];
    const uniqueGroups = [...new Map(groups.map((group) => [group.id, group])).values()];
    const incoming = bundle.notes.map(cleanNote).filter((note) => note.title || note.content).map((note) => ({ ...note, id: uid(), updatedAt: Date.now() }));
    const notes = merge ? [...incoming, ...current.notes].slice(0, MAX_NOTES) : incoming.slice(0, MAX_NOTES);
    await write({ notes, groups: uniqueGroups });
    return incoming.length;
  }

  async function savePendingDraft(draft) { await chrome.storage.local.set({ rstartpagePendingNote: { ...draft, createdAt: Date.now() } }); }
  async function takePendingDraft() { const data = await chrome.storage.local.get('rstartpagePendingNote'); if (data.rstartpagePendingNote) await chrome.storage.local.remove('rstartpagePendingNote'); return data.rstartpagePendingNote || null; }

  return { NOTES_KEY, GROUPS_KEY, cleanNote, listNotes, listGroups, saveNote, removeNote, saveGroup, removeGroup, exportNotes, importNotes, savePendingDraft, takePendingDraft };
})();
