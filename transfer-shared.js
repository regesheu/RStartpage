'use strict';

// One portable format for selective transfers, local ZIPs and Drive backups.
const RTransfer = (() => {
  const FORMAT = 'RStartpage Archive';
  const SECTIONS = ['bookmarks', 'notes', 'proxies', 'sessions', 'settings'];
  const MAX_BYTES = 64 * 1024 * 1024;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function invalid() { throw new Error('ARCHIVE_INVALID'); }

  async function collect(selected = SECTIONS, includePasswords = false) {
    const sections = {};
    for (const key of selected) {
      if (key === 'bookmarks') { sections.bookmarks = await RStartpage.exportPortable(); delete sections.bookmarks.settings; }
      if (key === 'notes') sections.notes = await RNotes.exportNotes();
      if (key === 'proxies') sections.proxies = await ProxyStore.exportData({ includePasswords });
      if (key === 'sessions') sections.sessions = await RTools.exportSessions();
      if (key === 'settings') sections.settings = { preferences: await RStartpage.loadSettings(), backgroundImage: await RStartpage.loadBackgroundImage() };
    }
    if (!Object.keys(sections).length) invalid();
    return { format: FORMAT, version: 1, extensionVersion: chrome.runtime.getManifest().version, exportedAt: new Date().toISOString(), sections };
  }

  function normalize(raw) {
    if (!object(raw)) invalid();
    let sections;
    if (raw.format === FORMAT) {
      if (raw.version !== 1 || !object(raw.sections)) invalid();
      sections = structuredClone(raw.sections);
    } else {
      // Accept archives and per-module JSONs from earlier releases.
      sections = {};
      if (Array.isArray(raw.workspaces)) sections.bookmarks = raw;
      if (raw.settings && object(raw.settings)) sections.settings = { preferences: raw.settings };
      if (Array.isArray(raw.notes)) sections.notes = raw;
      else if (raw.notes?.notes) sections.notes = raw.notes;
      if (Array.isArray(raw.profiles)) sections.proxies = raw;
      else if (raw.proxies?.profiles) sections.proxies = raw.proxies;
      if (Array.isArray(raw.sessions)) sections.sessions = raw;
      else if (raw.sessions?.sessions) sections.sessions = raw.sessions;
      if (raw.format === 'RStartpage Smart Proxy Rules') sections.rules = raw;
      if (!Object.keys(sections).length) sections.bookmarks = RStartpage.detectAndNormalizeImport(raw);
    }
    const keys = Object.keys(sections);
    if (!keys.length || keys.some(key => ![...SECTIONS, 'rules'].includes(key))) invalid();
    if (sections.bookmarks) {
      const data = sections.bookmarks;
      if (!Array.isArray(data.workspaces) || data.workspaces.some(w => !object(w) || !Array.isArray(w.groups) || w.groups.some(g => !object(g) || !Array.isArray(g.bookmarks) || g.bookmarks.some(b => !object(b) || typeof b.url !== 'string')))) invalid();
      sections.bookmarks = data.workspaces.length ? RStartpage.detectAndNormalizeImport(data) : { format: 'RStartpage', version: 3, workspaces: [] };
    }
    if (sections.notes) {
      const data = sections.notes;
      if (!Array.isArray(data.notes) || data.notes.length > 500 || data.notes.some(n => !object(n) || typeof n.content !== 'string' || typeof n.title !== 'string') || (data.groups !== undefined && (!Array.isArray(data.groups) || data.groups.some(g => !object(g) || typeof g.name !== 'string')))) invalid();
    }
    if (sections.proxies) {
      const data = sections.proxies;
      if (!Array.isArray(data.profiles) || data.profiles.length > 1000 || data.profiles.some(p => !object(p) || typeof p.host !== 'string' || !p.host.trim() || !Number.isInteger(p.port) || p.port < 1 || p.port > 65535 || !['http', 'https', 'socks4', 'socks5'].includes(p.scheme))) invalid();
      if (data.rules !== undefined && (!Array.isArray(data.rules) || data.rules.some(r => !object(r) || typeof r.pattern !== 'string' || !r.pattern.trim()))) invalid();
    }
    if (sections.sessions) {
      if (!Array.isArray(sections.sessions.sessions) || sections.sessions.sessions.some(s => !object(s) || !Array.isArray(s.tabs) || !s.tabs.length || s.tabs.some(t => !object(t) || typeof t.url !== 'string'))) invalid();
      RTools.validateSessionImport(sections.sessions);
    }
    if (sections.settings) {
      const data = sections.settings;
      if (!object(data.preferences)) invalid();
      if (data.backgroundImage !== undefined && (typeof data.backgroundImage !== 'string' || (data.backgroundImage && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(data.backgroundImage)))) invalid();
    }
    if (sections.rules && (!Array.isArray(sections.rules.rules) || !Array.isArray(sections.rules.targets))) invalid();
    return { format: FORMAT, version: 1, exportedAt: raw.exportedAt, sections };
  }

  async function restore(raw, selected, mode = 'merge') {
    const archive = normalize(raw);
    const keys = selected.filter(key => Object.hasOwn(archive.sections, key));
    if (!keys.length) invalid();
    // Validate cross-references before the first write.
    if (keys.includes('rules')) await ProxyStore.prepareRulesImport(archive.sections.rules);
    const data = archive.sections;
    const merge = mode !== 'replace';
    if (keys.includes('notes')) await RNotes.prepareRestore(data.notes, { merge });
    if (keys.includes('bookmarks')) await RStartpage.importPortable(data.bookmarks, { mode, skipDuplicates: true, importSettings: false });
    if (keys.includes('notes')) await RNotes.restoreNotes(data.notes, { merge });
    if (keys.includes('proxies')) await ProxyStore.importData(data.proxies, { merge });
    if (keys.includes('sessions')) await RTools.importSessions(data.sessions, { merge });
    if (keys.includes('rules')) await ProxyStore.importRules(data.rules);
    if (keys.includes('settings')) {
      await RStartpage.saveSettings(data.settings.preferences);
      if (Object.hasOwn(data.settings, 'backgroundImage')) await RStartpage.saveBackgroundImage(data.settings.backgroundImage);
    }
    if (keys.includes('proxies') || keys.includes('rules')) await chrome.runtime.sendMessage({ type: 'proxy:refreshConfig' }).catch(() => {});
    return keys;
  }

  async function toZip(archive) {
    const zip = new JSZip();
    zip.file('rstartpage.json', JSON.stringify(archive, null, 2));
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
  async function readFile(file) {
    if (!file || file.size > MAX_BYTES) throw new Error('ARCHIVE_SIZE');
    let json;
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entry = zip.file('rstartpage.json');
      if (!entry || entry._data?.uncompressedSize > MAX_BYTES) invalid();
      json = await entry.async('string');
    } else if (/\.json$/i.test(file.name)) json = await file.text();
    else invalid();
    if (json.length > MAX_BYTES) throw new Error('ARCHIVE_SIZE');
    return normalize(JSON.parse(json));
  }
  async function download(archive, name = `rstartpage-${RStartpage.slugDate()}.zip`) {
    const url = URL.createObjectURL(await toZip(archive));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return { SECTIONS, collect, normalize, restore, toZip, readFile, download };
})();
