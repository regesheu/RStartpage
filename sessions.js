'use strict';

const RS = RStartpage;
const ui = {};
let language = 'en';
let editingSessionId = '';
let noticeTimer = null;

const TXT = {
  en: {
    page: 'Sessions', intro: 'Save the current window and reopen it later.', manager: 'Session Manager', managerText: 'Each saved session keeps its tab order and pinned state.',
    saveCurrent: 'Save current window', noSessions: 'No saved sessions', noSessionsText: 'Save your current tabs as a session.', openWindow: 'New window', openHere: 'Open here', replace: 'Replace window',
    update: 'Update', rename: 'Rename', remove: 'Delete', tabs: '{count} tabs', updated: 'Updated {date}', saveSession: 'Save session', renameSession: 'Rename session', sessionName: 'Session name',
    cancel: 'Cancel', save: 'Save', close: 'Close', sessionSaved: 'Session saved.', sessionDeleted: 'Session deleted.', sessionUpdated: 'Session updated.',
    replaceTitle: 'Replace current window?', replaceConfirm: 'All tabs in the current window will be replaced with “{name}”.', deleteTitle: 'Delete session?', deleteSession: 'Delete “{name}”? This cannot be undone.',
    failed: 'Operation failed.', required: 'Enter a session name.', exportSessions: 'Export sessions', importSessions: 'Import sessions', importTitle: 'Import sessions', importMode: 'Import mode', merge: 'Merge with existing sessions', replaceExisting: 'Replace existing sessions', import: 'Import', fileReady: '{count} sessions ready to import.', invalidFile: 'Choose a valid RStartpage sessions JSON file.', tooLarge: 'The file is too large (maximum 5 MB).', imported: '{count} sessions imported.', replaceImportTitle: 'Replace saved sessions?', replaceImportConfirm: 'This will remove all currently saved sessions before importing the file.',
  },
  ru: {
    page: 'Сессии', intro: 'Сохраняйте вкладки текущего окна и открывайте их позже.', manager: 'Менеджер сессий', managerText: 'Для каждой сессии сохраняются порядок вкладок и закреплённое состояние.',
    saveCurrent: 'Сохранить текущее окно', noSessions: 'Сохранённых сессий нет', noSessionsText: 'Сохраните текущие вкладки как сессию.', openWindow: 'Новое окно', openHere: 'Открыть здесь', replace: 'Заменить окно',
    update: 'Обновить', rename: 'Переименовать', remove: 'Удалить', tabs: '{count} вкладок', updated: 'Обновлено {date}', saveSession: 'Сохранить сессию', renameSession: 'Переименовать сессию', sessionName: 'Название сессии',
    cancel: 'Отмена', save: 'Сохранить', close: 'Закрыть', sessionSaved: 'Сессия сохранена.', sessionDeleted: 'Сессия удалена.', sessionUpdated: 'Сессия обновлена.',
    replaceTitle: 'Заменить текущее окно?', replaceConfirm: 'Все вкладки текущего окна будут заменены сессией «{name}».', deleteTitle: 'Удалить сессию?', deleteSession: 'Удалить «{name}»? Это действие нельзя отменить.',
    failed: 'Не удалось выполнить операцию.', required: 'Введите название сессии.', exportSessions: 'Экспорт сессий', importSessions: 'Импорт сессий', importTitle: 'Импорт сессий', importMode: 'Режим импорта', merge: 'Объединить с текущими сессиями', replaceExisting: 'Заменить текущие сессии', import: 'Импортировать', fileReady: 'Готово к импорту: {count} сессий.', invalidFile: 'Выберите корректный JSON-файл сессий RStartpage.', tooLarge: 'Файл слишком большой (максимум 5 МБ).', imported: 'Импортировано сессий: {count}.', replaceImportTitle: 'Заменить сохранённые сессии?', replaceImportConfirm: 'Все текущие сохранённые сессии будут удалены перед импортом файла.',
  },
};

function tr(key, params = {}) {
  const template = TXT[language]?.[key] ?? TXT.en[key] ?? key;
  return RS.productText(String(template).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '')));
}

window.addEventListener('DOMContentLoaded', init);

async function init() {
  cache();
  bind();
  RS.enableScriptActions();
  const settings = await RS.loadSettings();
  language = settings.language === 'ru' ? 'ru' : 'en';
  const background = await RS.loadBackgroundImage();
  RS.applyPageSettings(settings, background, document);
  RS.mountNavigation(ui.appNavigation, settings, { active: 'sessions' });
  translate();
  await renderSessions();
}

function cache() {
  Object.assign(ui, {
    appNavigation: document.querySelector('#appNavigation'), sessionsTitle: document.querySelector('#sessionsTitle'), sessionsIntro: document.querySelector('#sessionsIntro'),
    managerTitle: document.querySelector('#managerTitle'), managerText: document.querySelector('#managerText'), saveSessionButton: document.querySelector('#saveSessionButton'),
    sessionsList: document.querySelector('#sessionsList'), sessionsEmpty: document.querySelector('#sessionsEmpty'), sessionsEmptyTitle: document.querySelector('#sessionsEmptyTitle'), sessionsEmptyText: document.querySelector('#sessionsEmptyText'), sessionsNotice: document.querySelector('#sessionsNotice'),
    sessionDialog: document.querySelector('#sessionDialog'), sessionForm: document.querySelector('#sessionForm'), sessionDialogTitle: document.querySelector('#sessionDialogTitle'), sessionDialogClose: document.querySelector('#sessionDialogClose'),
    sessionNameLabel: document.querySelector('#sessionNameLabel'), sessionNameInput: document.querySelector('#sessionNameInput'), sessionFormError: document.querySelector('#sessionFormError'), sessionCancelButton: document.querySelector('#sessionCancelButton'), sessionSaveButton: document.querySelector('#sessionSaveButton'),
    exportSessionsButton: document.querySelector('#exportSessionsButton'), importSessionsButton: document.querySelector('#importSessionsButton'), sessionJsonInput: document.querySelector('#sessionJsonInput'), sessionImportDialog: document.querySelector('#sessionImportDialog'), sessionImportForm: document.querySelector('#sessionImportForm'), sessionImportTitle: document.querySelector('#sessionImportTitle'), sessionImportClose: document.querySelector('#sessionImportClose'), sessionImportSummary: document.querySelector('#sessionImportSummary'), sessionImportModeLabel: document.querySelector('#sessionImportModeLabel'), sessionMergeLabel: document.querySelector('#sessionMergeLabel'), sessionReplaceLabel: document.querySelector('#sessionReplaceLabel'), sessionImportError: document.querySelector('#sessionImportError'), sessionImportCancel: document.querySelector('#sessionImportCancel'), sessionImportSubmit: document.querySelector('#sessionImportSubmit'),
  });
}

function bind() {
  ui.saveSessionButton.addEventListener('click', () => openSessionDialog());
  ui.exportSessionsButton.addEventListener('click', exportSessions);
  ui.importSessionsButton.addEventListener('click', () => ui.sessionJsonInput.click());
  ui.sessionJsonInput.addEventListener('change', prepareSessionImport);
  ui.sessionDialogClose.addEventListener('click', () => ui.sessionDialog.close());
  ui.sessionCancelButton.addEventListener('click', () => ui.sessionDialog.close());
  ui.sessionForm.addEventListener('submit', saveSessionDialog);
  ui.sessionImportClose.addEventListener('click', () => ui.sessionImportDialog.close());
  ui.sessionImportCancel.addEventListener('click', () => ui.sessionImportDialog.close());
  ui.sessionImportForm.addEventListener('submit', importSessions);
}

function translate() {
  document.documentElement.lang = language;
  document.title = RS.pageTitle(tr('page'));
  ui.sessionsTitle.textContent = tr('page'); ui.sessionsIntro.textContent = tr('intro'); ui.managerTitle.textContent = tr('manager'); ui.managerText.textContent = tr('managerText');
  ui.saveSessionButton.textContent = `＋ ${tr('saveCurrent')}`; ui.sessionsEmptyTitle.textContent = tr('noSessions'); ui.sessionsEmptyText.textContent = tr('noSessionsText');
  ui.exportSessionsButton.textContent = `⇩ ${tr('exportSessions')}`; ui.importSessionsButton.textContent = `⇧ ${tr('importSessions')}`; ui.sessionImportTitle.textContent = tr('importTitle'); ui.sessionImportModeLabel.textContent = tr('importMode'); ui.sessionMergeLabel.textContent = tr('merge'); ui.sessionReplaceLabel.textContent = tr('replaceExisting'); ui.sessionImportSubmit.textContent = tr('import'); ui.sessionImportCancel.textContent = tr('cancel'); ui.sessionImportClose.setAttribute('aria-label', tr('close'));
  ui.sessionNameLabel.textContent = tr('sessionName'); ui.sessionCancelButton.textContent = tr('cancel'); ui.sessionSaveButton.textContent = tr('save'); ui.sessionDialogClose.setAttribute('aria-label', tr('close'));
}

async function exportSessions() {
  try {
    const sessions = await RTools.exportSessions();
    RS.downloadJson(`rstartpage-sessions-${RS.slugDate()}.json`, { format: 'RStartpage Sessions', version: 1, exportedAt: new Date().toISOString(), sessions });
    showNotice(tr('exportSessions'));
  } catch (error) { showNotice(error.message || tr('failed'), true); }
}

async function prepareSessionImport(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showNotice(tr('tooLarge'), true); return; }
  try {
    const raw = JSON.parse(await file.text());
    const sessions = RTools.validateSessionImport(raw);
    ui.sessionImportSummary.textContent = tr('fileReady', { count: sessions.length });
    ui.sessionImportError.textContent = '';
    ui.sessionImportDialog._bundle = raw;
    ui.sessionImportDialog.showModal();
  } catch (error) { showNotice(error.code === 'SESSIONS_INVALID' ? tr('invalidFile') : (error.message || tr('invalidFile')), true); }
}

async function importSessions(event) {
  event.preventDefault();
  const bundle = ui.sessionImportDialog._bundle;
  if (!bundle) return;
  const merge = ui.sessionImportForm.querySelector('input[name="sessionImportMode"]:checked')?.value !== 'replace';
  if (!merge) {
    const accepted = await RS.confirmAction({ title: tr('replaceImportTitle'), message: tr('replaceImportConfirm'), confirmLabel: tr('replaceExisting'), tone: 'warning' });
    if (!accepted) return;
  }
  ui.sessionImportSubmit.disabled = true;
  try {
    const count = await RTools.importSessions(bundle, { merge });
    ui.sessionImportDialog.close(); showNotice(tr('imported', { count })); await renderSessions();
  } catch (error) { ui.sessionImportError.textContent = error.code === 'SESSIONS_INVALID' ? tr('invalidFile') : (error.message || tr('failed')); }
  finally { ui.sessionImportSubmit.disabled = false; }
}

async function renderSessions() {
  const sessions = await RTools.getSessions();
  ui.sessionsList.replaceChildren();
  ui.sessionsEmpty.hidden = sessions.length > 0;
  for (const session of sessions) {
    const row = document.createElement('article');
    row.className = 'session-row';
    const preview = session.tabs.slice(0, 8).map((tab) => `<img src="${RS.escapeHtml(RS.faviconUrl(tab.url, 16))}" alt="">`).join('');
    row.innerHTML = `<div class="session-main"><strong>${RS.escapeHtml(session.name)}</strong><span>${RS.escapeHtml(tr('tabs', { count: session.tabs.length }))} · ${RS.escapeHtml(tr('updated', { date: new Date(session.updatedAt).toLocaleString(language) }))}</span></div><div class="session-preview">${preview}</div><div class="session-actions"><button class="button open-window" type="button">${RS.escapeHtml(tr('openWindow'))}</button><button class="button open-here" type="button">${RS.escapeHtml(tr('openHere'))}</button><button class="button replace" type="button">${RS.escapeHtml(tr('replace'))}</button><button class="button update" type="button">${RS.escapeHtml(tr('update'))}</button><button class="button rename" type="button">${RS.escapeHtml(tr('rename'))}</button><button class="button delete danger-quiet" type="button">${RS.escapeHtml(tr('remove'))}</button></div>`;
    row.querySelector('.open-window').addEventListener('click', () => run(() => RTools.openSession(session.id, 'new-window')));
    row.querySelector('.open-here').addEventListener('click', () => run(() => RTools.openSession(session.id, 'current')));
    row.querySelector('.replace').addEventListener('click', async () => {
      const accepted = await RS.confirmAction({ title: tr('replaceTitle'), message: tr('replaceConfirm', { name: session.name }), confirmLabel: tr('replace'), tone: 'warning' });
      if (accepted) await run(() => RTools.openSession(session.id, 'replace'));
    });
    row.querySelector('.update').addEventListener('click', async () => { await run(() => RTools.updateSessionFromCurrentWindow(session.id), tr('sessionUpdated')); await renderSessions(); });
    row.querySelector('.rename').addEventListener('click', () => openSessionDialog(session));
    row.querySelector('.delete').addEventListener('click', async () => {
      const accepted = await RS.confirmAction({ title: tr('deleteTitle'), message: tr('deleteSession', { name: session.name }), confirmLabel: tr('remove') });
      if (!accepted) return;
      await RTools.deleteSession(session.id); showNotice(tr('sessionDeleted')); await renderSessions();
    });
    ui.sessionsList.append(row);
  }
}

function openSessionDialog(session = null) {
  editingSessionId = session?.id || '';
  ui.sessionDialogTitle.textContent = session ? tr('renameSession') : tr('saveSession');
  ui.sessionNameInput.value = session?.name || '';
  ui.sessionFormError.textContent = '';
  ui.sessionDialog.showModal();
  setTimeout(() => ui.sessionNameInput.focus(), 0);
}

async function saveSessionDialog(event) {
  event.preventDefault();
  const name = ui.sessionNameInput.value.trim();
  if (!name) { ui.sessionFormError.textContent = tr('required'); ui.sessionNameInput.focus(); return; }
  ui.sessionSaveButton.disabled = true;
  try {
    if (editingSessionId) {
      const session = await RTools.getSession(editingSessionId);
      if (!session) throw new Error('Session not found');
      await RTools.saveSession({ ...session, name });
    } else {
      await RTools.captureCurrentWindow(name);
    }
    ui.sessionDialog.close(); showNotice(tr('sessionSaved')); await renderSessions();
  } catch (error) { ui.sessionFormError.textContent = error.message || tr('failed'); }
  finally { ui.sessionSaveButton.disabled = false; }
}

async function run(fn, successMessage = '') {
  try { await fn(); if (successMessage) showNotice(successMessage); }
  catch (error) { showNotice(error.message || tr('failed'), true); }
}

function showNotice(message, error = false) {
  clearTimeout(noticeTimer); ui.sessionsNotice.textContent = message; ui.sessionsNotice.classList.toggle('error', error); ui.sessionsNotice.hidden = false;
  noticeTimer = setTimeout(() => { ui.sessionsNotice.hidden = true; }, 5000);
}
