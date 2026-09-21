'use strict';

const RS = RStartpage;
const t = (key, params) => RS.t(key, params);
const ui = {};
let pendingImport = null;
let noticeTimer = null;

window.addEventListener('DOMContentLoaded', initDataPage);

async function initDataPage() {
  cache();
  bind();
  RS.enableScriptActions();
  await applyPageSettings();
  await refreshFolderSelect();
}

async function applyPageSettings() {
  const settings = await RS.loadSettings();
  const backgroundImage = await RS.loadBackgroundImage();
  RS.applyPageSettings(settings, backgroundImage, document);
  RS.mountNavigation(ui.appNavigation, settings);
  const language = settings.language === 'ru' ? 'ru' : 'en';
  if (ui.exportProxiesLabel) ui.exportProxiesLabel.textContent = language === 'ru' ? 'Включить профили прокси' : 'Include proxy profiles';
  if (ui.exportProxyPasswordsLabel) ui.exportProxyPasswordsLabel.textContent = ProxyStore.t(language, 'exportPasswords');
  if (ui.importProxiesLabel) ui.importProxiesLabel.textContent = ProxyStore.t(language, 'importProxies');
  if (ui.exportSessionsLabel) ui.exportSessionsLabel.textContent = language === 'ru' ? 'Включить сохранённые сессии' : 'Include saved sessions';
  if (ui.importSessionsLabel) ui.importSessionsLabel.textContent = language === 'ru' ? 'Импортировать сохранённые сессии' : 'Import saved sessions when present';
  document.title = RS.pageTitle(t('data.title'));
}

function cache() {
  Object.assign(ui, {
    appNavigation: document.querySelector('#appNavigation'),
    exportButton: document.querySelector('#exportButton'),
    exportProxies: document.querySelector('#exportProxies'),
    exportProxyPasswords: document.querySelector('#exportProxyPasswords'),
    exportProxiesLabel: document.querySelector('#exportProxiesLabel'),
    exportProxyPasswordsLabel: document.querySelector('#exportProxyPasswordsLabel'),
    exportSessions: document.querySelector('#exportSessions'),
    exportSessionsLabel: document.querySelector('#exportSessionsLabel'),
    jsonFileInput: document.querySelector('#jsonFileInput'),
    fileDrop: document.querySelector('#fileDrop'),
    fileDropTitle: document.querySelector('#fileDropTitle'),
    fileDropHint: document.querySelector('#fileDropHint'),
    importPreview: document.querySelector('#importPreview'),
    previewFormat: document.querySelector('#previewFormat'),
    previewCounts: document.querySelector('#previewCounts'),
    importButton: document.querySelector('#importButton'),
    skipDuplicates: document.querySelector('#skipDuplicates'),
    importSettings: document.querySelector('#importSettings'),
    importProxies: document.querySelector('#importProxies'),
    importProxiesLabel: document.querySelector('#importProxiesLabel'),
    importSessions: document.querySelector('#importSessions'),
    importSessionsLabel: document.querySelector('#importSessionsLabel'),
    bookmarkFolderSelect: document.querySelector('#bookmarkFolderSelect'),
    folderImportButton: document.querySelector('#folderImportButton'),
    resetButton: document.querySelector('#resetButton'), exportNotesDataButton: document.querySelector('#exportNotesDataButton'), importNotesDataButton: document.querySelector('#importNotesDataButton'), notesDataFile: document.querySelector('#notesDataFile'),
    pageNotice: document.querySelector('#pageNotice'),
  });
}

function bind() {
  ui.exportButton.addEventListener('click', exportData);
  ui.jsonFileInput.addEventListener('change', () => handleFile(ui.jsonFileInput.files?.[0]));
  ui.importButton.addEventListener('click', runJsonImport);
  ui.folderImportButton.addEventListener('click', runFolderImport);
  ui.resetButton.addEventListener('click', resetData);
  ui.exportNotesDataButton?.addEventListener('click', async () => { RS.downloadJson(`rstartpage-notes-${RS.slugDate()}.json`, await RNotes.exportNotes()); showNotice('Экспорт заметок готов.'); });
  ui.importNotesDataButton?.addEventListener('click', () => ui.notesDataFile.click());
  ui.notesDataFile?.addEventListener('change', async () => { const file = ui.notesDataFile.files?.[0]; ui.notesDataFile.value = ''; if (!file) return; try { const count = await RNotes.importNotes(JSON.parse(await file.text()), { merge: true }); showNotice(`Импортировано заметок: ${count}.`); } catch (error) { showNotice(error.message || 'Не удалось импортировать заметки.', true); } });

  ['dragenter', 'dragover'].forEach((name) => ui.fileDrop.addEventListener(name, (event) => {
    event.preventDefault();
    ui.fileDrop.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach((name) => ui.fileDrop.addEventListener(name, (event) => {
    event.preventDefault();
    ui.fileDrop.classList.remove('drag-over');
  }));
  ui.fileDrop.addEventListener('drop', (event) => handleFile(event.dataTransfer?.files?.[0]));
}

async function exportData() {
  ui.exportButton.disabled = true;
  try {
    const data = await RS.exportPortable();
    if (ui.exportProxies?.checked) data.proxies = await ProxyStore.exportData({ includePasswords: !!ui.exportProxyPasswords?.checked });
    if (ui.exportSessions?.checked) data.sessions = await RTools.exportSessions();
    RS.downloadJson(`rstartpage-backup-${RS.slugDate()}.json`, data);
    showNotice(t('data.exportDone'));
  } catch (error) {
    console.error(error);
    showNotice(error.message || t('data.exportFailed'), true);
  } finally {
    ui.exportButton.disabled = false;
  }
}

async function handleFile(file) {
  pendingImport = null;
  ui.importButton.disabled = true;
  ui.importPreview.hidden = true;
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
    showNotice(t('data.fileJsonOnly'), true);
    return;
  }
  try {
    const text = await file.text();
    const raw = JSON.parse(text);
    let portable = null;
    let bookmarkError = null;
    try {
      portable = RS.detectAndNormalizeImport(raw);
    } catch (error) {
      bookmarkError = error;
    }
    const proxyBundle = raw?.proxies && Array.isArray(raw.proxies.profiles) ? raw.proxies : null;
    const sessionBundle = raw?.sessions && Array.isArray(raw.sessions.sessions) ? raw.sessions : null;
    const hasBookmarks = !!portable?.workspaces?.length;
    const hasProxies = !!proxyBundle?.profiles?.length;
    const hasSessions = !!sessionBundle?.sessions?.length;
    if (!hasBookmarks && !hasProxies && !hasSessions) throw bookmarkError || new Error(t('data.noSections'));
    const counts = hasBookmarks ? countPortable(portable) : { workspaces: 0, groups: 0, bookmarks: 0 };
    pendingImport = { portable, proxies: proxyBundle, sessions: sessionBundle };
    ui.fileDropTitle.textContent = file.name;
    ui.fileDropHint.textContent = t('data.fileParsed', { size: formatBytes(file.size) });
    ui.previewFormat.textContent = RS.productText(portable?.format || (hasProxies ? 'RStartpage Proxy' : (hasSessions ? 'RStartpage Sessions' : 'JSON')));
    const proxyCount = proxyBundle?.profiles?.length || 0;
    const sessionCount = sessionBundle?.sessions?.length || 0;
    ui.previewCounts.textContent = `${t('data.previewCounts', { sections: counts.workspaces, groups: counts.groups, links: counts.bookmarks })}${proxyCount ? ` · ${proxyCount} proxy` : ''}${sessionCount ? ` · ${sessionCount} sessions` : ''}`;
    ui.importPreview.hidden = false;
    ui.importButton.disabled = false;
    showNotice(t('data.fileReady'));
  } catch (error) {
    console.error(error);
    ui.fileDropTitle.textContent = file.name;
    ui.fileDropHint.textContent = t('data.fileUnrecognized');
    showNotice(error.message || t('data.invalidJson'), true);
  }
}

async function runJsonImport() {
  if (!pendingImport) return;
  const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
  if (mode === 'replace') {
    const accepted = await RS.confirmAction({ title: t('data.replace'), message: t('data.confirmReplace'), confirmLabel: t('data.replace') });
    if (!accepted) return;
  }
  setBusy(ui.importButton, true, t('data.importBusy'));
  try {
    let result = { createdWorkspaces: 0, createdGroups: 0, createdBookmarks: 0, skippedBookmarks: 0 };
    if (pendingImport.portable?.workspaces?.length) {
      result = await RS.importPortable(pendingImport.portable, {
        mode,
        skipDuplicates: ui.skipDuplicates.checked,
        importSettings: ui.importSettings.checked,
      });
    }
    let proxyResult = { imported: 0, skipped: 0 };
    if (ui.importProxies?.checked && pendingImport.proxies) {
      proxyResult = await ProxyStore.importData(pendingImport.proxies, { merge: mode !== 'replace' });
      await chrome.runtime.sendMessage({ type: 'proxy:refreshConfig' }).catch(() => {});
      await chrome.runtime.sendMessage({ type: 'proxy:refreshAction' }).catch(() => {});
    }
    let sessionResult = { imported: 0 };
    if (ui.importSessions?.checked && pendingImport.sessions) sessionResult = await RTools.importSessions(pendingImport.sessions, { merge: mode !== 'replace' });
    if (ui.importSettings.checked && pendingImport.portable?.settings) await applyPageSettings();
    let message = t('data.importDone', {
      sections: result.createdWorkspaces,
      groups: result.createdGroups,
      links: result.createdBookmarks,
      skipped: result.skippedBookmarks,
    });
    if (proxyResult.imported || proxyResult.skipped || proxyResult.rulesImported) message += ` · Proxy: ${proxyResult.imported}, rules: ${proxyResult.rulesImported || 0}, skipped: ${proxyResult.skipped}`;
    if (sessionResult.imported) message += ` · Sessions: ${sessionResult.imported}`;
    showNotice(message);
    await refreshFolderSelect();
  } catch (error) {
    console.error(error);
    showNotice(error.message || t('data.importFailed'), true);
  } finally {
    setBusy(ui.importButton, false, t('data.importButton'));
  }
}

async function refreshFolderSelect() {
  try {
    const folders = await RS.getBookmarkFoldersForImport();
    ui.bookmarkFolderSelect.replaceChildren();
    if (!folders.length) {
      const option = document.createElement('option');
      option.textContent = t('data.noFolders');
      option.value = '';
      ui.bookmarkFolderSelect.append(option);
      ui.folderImportButton.disabled = true;
      return;
    }
    folders.forEach((folder) => {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = `${'· '.repeat(Math.min(folder.depth, 4))}${folder.path}`;
      ui.bookmarkFolderSelect.append(option);
    });
    ui.folderImportButton.disabled = false;
  } catch (error) {
    console.error(error);
    ui.bookmarkFolderSelect.innerHTML = `<option value="">${RS.escapeHtml(t('data.folderLoadFailed'))}</option>`;
    ui.folderImportButton.disabled = true;
  }
}

async function runFolderImport() {
  const folderId = ui.bookmarkFolderSelect.value;
  if (!folderId) return;
  setBusy(ui.folderImportButton, true, t('data.copyBusy'));
  try {
    const portable = await RS.portableFromFolderId(folderId);
    const result = await RS.importPortable(portable, { mode: 'merge', skipDuplicates: true, importSettings: false });
    showNotice(t('data.copyDone', { groups: result.createdGroups, links: result.createdBookmarks }));
  } catch (error) {
    console.error(error);
    showNotice(error.message || t('data.copyFailed'), true);
  } finally {
    setBusy(ui.folderImportButton, false, t('data.copyButton'));
  }
}

async function resetData() {
  const accepted = await RS.confirmAction({ title: t('data.resetTitle'), message: t('data.confirmReset'), confirmLabel: t('data.reset') });
  if (!accepted) return;
  ui.resetButton.disabled = true;
  try {
    const root = await RS.ensureRoot();
    const children = await chrome.bookmarks.getChildren(root.id);
    for (const child of children) {
      if (child.url) await chrome.bookmarks.remove(child.id);
      else await chrome.bookmarks.removeTree(child.id);
    }
    await RS.removeMetaWhere(() => true);
    const sectionTitle = RS.getLanguage() === 'ru' ? 'Главная' : RS.DEFAULT_WORKSPACE;
    const groupTitle = RS.getLanguage() === 'ru' ? 'Избранное' : RS.DEFAULT_GROUP;
    const workspace = await chrome.bookmarks.create({ parentId: root.id, title: sectionTitle });
    await chrome.bookmarks.create({ parentId: workspace.id, title: groupTitle });
    showNotice(t('data.resetDone'));
  } catch (error) {
    console.error(error);
    showNotice(error.message || t('data.resetFailed'), true);
  } finally {
    ui.resetButton.disabled = false;
  }
}

function countPortable(portable) {
  let groups = 0;
  let bookmarks = 0;
  portable.workspaces.forEach((workspace) => {
    groups += workspace.groups.length;
    workspace.groups.forEach((group) => { bookmarks += group.bookmarks.length; });
  });
  return { workspaces: portable.workspaces.length, groups, bookmarks };
}

function showNotice(message, error = false) {
  clearTimeout(noticeTimer);
  ui.pageNotice.textContent = message;
  ui.pageNotice.classList.toggle('error', error);
  ui.pageNotice.hidden = false;
  ui.pageNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  noticeTimer = setTimeout(() => { ui.pageNotice.hidden = true; }, 7000);
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
