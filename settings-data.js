'use strict';

(() => {
  const COPY = {
    ru: { driveBackupInfo: 'Резервная копия всех разделов и фона создаётся автоматически раз в сутки при изменениях и работающем браузере. Хранятся последние 10 автоматических копий; ручные и копии перед восстановлением не удаляются автоматически. Пароли прокси в автоматические копии не входят. Данные находятся в скрытой папке приложения: скачивание и восстановление доступны здесь, а не в обычном интерфейсе Drive.', accountTitle: 'Сменить Google-аккаунт?', accountText: 'Локальные заметки будут объединены с заметками аккаунта {account}. После подключения они будут отправлены в этот аккаунт. Продолжить?', accountConfirm: 'Объединить и подключить', accountCancelled: 'Подключение отменено. Заметки не отправлены в другой аккаунт.', recovery: 'Скачать копию перед последним восстановлением', recoveryHint: 'Перед заменой данных сохраняется копия на устройстве, а при подключённом Drive — также в облаке. Пароли прокси в неё не входят.', autoBackup: 'Автоматическая копия', manualBackup: 'Ручная копия', safetyBackup: 'Перед восстановлением', unknownDevice: 'Устройство не указано', backupError: 'Автокопию не удалось сохранить. Проверьте доступ и свободное место в Drive.',
      transfer: 'Экспорт и импорт', intro: 'Все данные расширения — в одном месте. Выберите разделы или сохраните всё сразу.',
      bookmarks: 'Ссылки', bookmarksHint: 'Разделы, группы и закладки', notes: 'Заметки', notesHint: 'Текст, группы, теги и источники',
      proxies: 'Прокси', proxiesHint: 'Профили подключения', sessions: 'Сессии', sessionsHint: 'Сохранённые окна и вкладки', settings: 'Настройки и фон', settingsHint: 'Внешний вид, меню и изображение', rules: 'Правила прокси',
      smartRules: 'Smart Proxy Rules', smartRulesHint: 'Входят в раздел «Прокси».', all: 'Выбрать всё', passwords: 'Пароли прокси', passwordHint: 'Не включены по умолчанию. Архив не зашифрован.',
      export: 'Сохранить архив', exportHint: 'ZIP с выбранными разделами. Подходит для переноса на другое устройство.',
      import: 'Загрузить архив', importHint: 'ZIP из RStartpage или JSON из предыдущих версий. Максимум 64 МБ.', choose: 'Выбрать файл',
      preview: 'Восстановление', merge: 'Объединить с текущими данными', replace: 'Заменить выбранные разделы', restore: 'Восстановить', cancel: 'Отмена',
      replaceText: 'Текущие данные выбранных разделов будут заменены. Остальные разделы останутся без изменений.', mergeText: 'Данные будут добавлены. Выбранные настройки и фон заменят текущие. Перед восстановлением сохраните локальный архив.',
      done: 'Данные восстановлены.', exported: 'Архив подготовлен.', select: 'Выберите хотя бы один раздел.', invalid: 'Не удалось прочитать архив. Выберите ZIP или JSON, экспортированный из RStartpage.', size: 'Файл слишком большой. Максимум 64 МБ.', failed: 'Операция не завершена. Часть данных могла сохраниться. Проверьте разделы перед повтором.',
      connecting: 'Подключение Google Drive…', authorizing: 'Ожидаем вход в Google. Окно входа откроется автоматически; это может занять несколько секунд.', checking: 'Вход выполнен. Проверяем доступ к Google Drive…', hideProgress: 'Скрыть', backgroundProgress: 'Подключение продолжится после закрытия этого окна.', drive: 'Google Drive', driveHint: 'Резервные копии в папке приложения', driveDescription: 'Подключите Google Drive, чтобы автоматически синхронизировать все заметки, группы и теги между устройствами с одним Google-аккаунтом. Лимит Chrome Sync 70/100 КБ для этих заметок не применяется. Без интернета изменения сохраняются на устройстве и отправляются после восстановления связи. При конфликте более свежая версия остаётся основной, другая сохраняется отдельной заметкой.', connect: 'Подключить Google Drive', disconnect: 'Отключить', connected: 'Подключён', disconnected: 'Не подключён',
      unavailable: 'В этой сборке подключение Google Drive ещё не настроено. Локальное сохранение и восстановление архивов доступны.',
      offline: 'Подключите Google Drive, чтобы сохранять, скачивать и восстанавливать облачные копии.', online: 'Копии доступны только этому расширению. В каждой копии сохраняются все разделы и фон.',
      create: 'Создать копию всего', refresh: 'Обновить список', empty: 'Резервных копий пока нет', emptyHint: 'После подключения здесь появятся ваши облачные копии.', download: 'Скачать', remove: 'Удалить',
      deleteTitle: 'Удалить резервную копию?', deleteText: 'Копия будет удалена из Google Drive без возможности отмены. Данные расширения сохранятся.',
      driveError: 'Google Drive недоступен. Проверьте интернет и разрешение доступа, затем повторите подключение.', saved: 'Резервная копия сохранена.', deleted: 'Копия удалена.', loading: 'Выполняется…',
      folder: 'Из закладок браузера', folderHint: 'Скопировать папку Chrome в ссылки RStartpage.', copy: 'Скопировать папку', copied: 'Закладки скопированы.', noFolders: 'Нет доступных папок',
      help: 'Помощь', helpTitle: 'Помощь по данным', helpIntro: 'Здесь собраны экспорт, импорт и резервные копии всех разделов RStartpage.', helpLocal: 'Локальный архив. Выберите нужные разделы и сохраните ZIP-файл на устройство. Для полного переноса используйте «Выбрать всё».', helpProxy: 'Прокси. Smart Proxy Rules входят в раздел «Прокси». Пароли добавляются только отдельным флажком, потому что ZIP-архив не зашифрован.', helpRestore: 'Восстановление. Объединение добавляет данные к текущим, а замена перезаписывает только выбранные разделы. Перед заменой рекомендуется сохранить архив.', helpDrive: 'Google Drive автоматически синхронизирует заметки и создаёт ежедневные резервные копии всех разделов при изменениях. Для заметок не используется квота Chrome Sync. Копии доступны только этому расширению.', helpSafety: 'Безопасность. Проверяйте источник архива перед импортом и храните архив с паролями в защищённом месте.', doneHelp: 'Понятно', close: 'Закрыть',
    },
    en: { driveBackupInfo: 'When data changes, a backup of every section and the wallpaper is created once a day while the browser is running. The latest 10 automatic copies are kept; manual and pre-restore copies are not deleted automatically. Automatic backups exclude proxy passwords. Data lives in a hidden application folder: download and restore it here, not in the regular Drive interface.', accountTitle: 'Change Google account?', accountText: 'Local notes will be merged with notes in {account} and uploaded to that account after connecting. Continue?', accountConfirm: 'Merge and connect', accountCancelled: 'Connection cancelled. Notes were not sent to another account.', recovery: 'Download the copy from before the last restore', recoveryHint: 'Before replacing data, a recovery copy is saved on this device and, when connected, in Drive. Proxy passwords are excluded.', autoBackup: 'Automatic backup', manualBackup: 'Manual backup', safetyBackup: 'Before restore', unknownDevice: 'Device not recorded', backupError: 'Automatic backup failed. Check Drive access and available storage.',
      transfer: 'Export and import', intro: 'All extension data in one place. Choose sections or save everything at once.',
      bookmarks: 'Links', bookmarksHint: 'Workspaces, groups and bookmarks', notes: 'Notes', notesHint: 'Text, groups, tags and sources', proxies: 'Proxy', proxiesHint: 'Connection profiles', sessions: 'Sessions', sessionsHint: 'Saved windows and tabs', settings: 'Settings and wallpaper', settingsHint: 'Appearance, navigation and image', rules: 'Proxy rules',
      smartRules: 'Smart Proxy Rules', smartRulesHint: 'Included with the Proxy section.', all: 'Select all', passwords: 'Proxy passwords', passwordHint: 'Excluded by default. The archive is not encrypted.', export: 'Save archive', exportHint: 'A ZIP with the selected sections, ready to move to another device.', import: 'Upload archive', importHint: 'A RStartpage ZIP or JSON from earlier versions. Maximum 64 MB.', choose: 'Choose file', preview: 'Restore data', merge: 'Merge with current data', replace: 'Replace selected sections', restore: 'Restore', cancel: 'Cancel',
      replaceText: 'Current data in the selected sections will be replaced. Other sections will stay unchanged.', mergeText: 'Data will be added. Selected settings and wallpaper will replace current preferences. Save a local archive before restoring.', done: 'Data restored.', exported: 'Archive prepared.', select: 'Choose at least one section.', invalid: 'Cannot read this archive. Choose a ZIP or JSON exported from RStartpage.', size: 'The file is too large. Maximum 64 MB.', failed: 'The operation did not finish. Some data may have been saved. Check the sections before trying again.',
      connecting: 'Connecting Google Drive…', authorizing: 'Waiting for Google sign-in. The sign-in window will open automatically; this may take a few seconds.', checking: 'Signed in. Checking Google Drive access…', hideProgress: 'Hide', backgroundProgress: 'Connecting will continue after you close this window.', drive: 'Google Drive', driveHint: 'Backups in the application folder', driveDescription: 'Connect Google Drive to automatically sync all notes, groups and tags between devices using the same Google account. The 70/100 KB Chrome Sync quota does not apply to these notes. Offline changes are saved on this device and sent after reconnecting. When edits conflict, the newer version stays primary and the other is kept as a separate note.', connect: 'Connect Google Drive', disconnect: 'Disconnect', connected: 'Connected', disconnected: 'Not connected', unavailable: 'Google Drive connection has not been configured in this build. Local archive export and restore are available.', offline: 'Connect Google Drive to save, download and restore cloud backups.', online: 'Only this extension can access these copies. Each backup includes every section and the wallpaper.', create: 'Back up everything', refresh: 'Refresh list', empty: 'No backups yet', emptyHint: 'Your cloud backups will appear here after connecting.', download: 'Download', remove: 'Delete', deleteTitle: 'Delete backup?', deleteText: 'This copy will be permanently deleted from Google Drive. Extension data will be kept.', driveError: 'Google Drive is unavailable. Check your connection and access permission, then reconnect.', saved: 'Backup saved.', deleted: 'Backup deleted.', loading: 'Working…',
      folder: 'From browser bookmarks', folderHint: 'Copy a Chrome folder into RStartpage links.', copy: 'Copy folder', copied: 'Bookmarks copied.', noFolders: 'No folders available',
      help: 'Help', helpTitle: 'Data help', helpIntro: 'Export, import and backups for every RStartpage section live here.', helpLocal: 'Local archive. Select the sections you need and save a ZIP file to this device. Use Select all for a complete transfer.', helpProxy: 'Proxy. Smart Proxy Rules are included with the Proxy section. Passwords require a separate checkbox because the ZIP archive is not encrypted.', helpRestore: 'Restore. Merge adds data to what you have; Replace overwrites only the selected sections. Save an archive before replacing data.', helpDrive: 'Google Drive syncs notes automatically and creates daily backups of all sections when data changes. Notes do not use the Chrome Sync quota. Only this extension can access the copies.', helpSafety: 'Security. Verify where an archive came from before importing it, and keep archives containing passwords in a protected location.', doneHelp: 'Done', close: 'Close',
    },
  };
  let lang = 'en', pending = null, busy = false, connected = false, connectionPhase = '', restoreDriveFocus = false;
  const $ = id => document.getElementById(id);
  const tr = key => COPY[lang][key] || key;
  const text = key => `<span data-transfer-text="${key}">${tr(key)}</span>`;
  const selected = root => [...root.querySelectorAll('input[data-section]:checked')].map(input => input.dataset.section);
  const notice = (message, error = false) => { $('transferNotice').textContent = message; $('transferNotice').classList.toggle('error', error); $('transferNotice').hidden = false; };
  const sectionOption = key => key === 'proxies' ? `
    <div class="transfer-section-option transfer-section-option-proxy">
      <label class="transfer-section-main"><input type="checkbox" data-section="proxies" checked><span><strong>${text('proxies')}</strong><small>${text('proxiesHint')}</small></span></label>
      <div class="transfer-subitems">
        <div class="transfer-subitem transfer-subitem-static"><span class="transfer-subitem-marker" aria-hidden="true">↳</span><span><strong>${text('smartRules')}</strong><small>${text('smartRulesHint')}</small></span></div>
        <label class="transfer-subitem"><input id="transferPasswords" type="checkbox"><span><strong>${text('passwords')}</strong><small>${text('passwordHint')}</small></span></label>
      </div>
    </div>` : `<label class="transfer-section-option"><input type="checkbox" data-section="${key}" checked><span><strong>${text(key)}</strong><small>${text(key + 'Hint')}</small></span></label>`;

  window.addEventListener('DOMContentLoaded', async () => {
    lang = (await RStartpage.loadSettings()).language === 'ru' ? 'ru' : 'en';
    $('settingsData').innerHTML = `
      <div class="data-section-heading"><div><h3>${text('transfer')}</h3><p>${text('intro')}</p></div><div class="data-section-actions"><button id="dataHelpButton" type="button" class="icon-button module-icon-button module-help-button" title="${tr('help')}" aria-label="${tr('help')}">?</button><button id="selectAllData" type="button" class="button small">${text('all')}</button></div></div>
      <fieldset id="transferSections" class="transfer-sections"><legend class="sr-only">${text('transfer')}</legend>${RTransfer.SECTIONS.map(sectionOption).join('')}</fieldset>
      <div class="transfer-actions-grid"><article class="transfer-card"><h4>${text('export')}</h4><p>${text('exportHint')}</p><button id="archiveExport" class="button primary" type="button">${text('export')}</button></article><article class="transfer-card"><h4>${text('import')}</h4><p>${text('importHint')}</p><label class="button file-button">${text('choose')}<input id="archiveFile" type="file" accept=".zip,.json,application/zip,application/json"></label></article></div>
      <div id="transferNotice" class="transfer-notice" role="status" aria-live="polite" hidden></div>
      <section id="archivePreview" class="archive-preview" aria-labelledby="archivePreviewTitle" hidden><h4 id="archivePreviewTitle">${text('preview')}</h4><p id="archiveFilename"></p><fieldset id="importSections" class="transfer-sections"><legend class="sr-only">${text('preview')}</legend></fieldset><label class="field"><select id="archiveMode" class="select" aria-label="${tr('preview')}"><option value="merge">${tr('merge')}</option><option value="replace">${tr('replace')}</option></select></label><div class="appearance-actions"><button id="archiveRestore" class="button primary" type="button">${text('restore')}</button><button id="archiveCancel" class="button" type="button">${text('cancel')}</button></div></section>
      <details class="browser-folder-import"><summary>${text('folder')}</summary><p>${text('folderHint')}</p><div class="appearance-actions"><select id="browserFolder" class="select" aria-label="${tr('folder')}"></select><button id="browserFolderImport" type="button" class="button">${text('copy')}</button></div></details>
      <section class="drive-settings" aria-labelledby="driveHeading"><div class="data-section-heading"><div><h3 id="driveHeading">${text('drive')}</h3><p>${text('driveHint')}</p></div><span id="driveStatus" class="drive-status" role="status"></span></div><p id="driveDescription" class="field-hint">${text('driveDescription')}</p><p class="field-hint">${text('driveBackupInfo')}</p><p class="field-hint">${text('recoveryHint')}</p><button id="downloadRecovery" class="button small" type="button" hidden>${text('recovery')}</button><p id="driveBackupError" class="form-error" role="status" hidden>${text('backupError')}</p><p id="driveMessage" class="drive-message" role="status"></p><div class="appearance-actions"><button id="driveConnect" class="button" type="button"></button><button id="driveCreate" class="button primary" type="button" disabled>${text('create')}</button><button id="driveRefresh" class="button" type="button" disabled>${text('refresh')}</button></div><div id="driveBackups" class="drive-backups" aria-live="polite"></div></section>`;
    $('dataHelpDialog').innerHTML = `<form method="dialog" novalidate><div class="dialog-header"><div><div class="eyebrow">RStartpage</div><h2>${text('helpTitle')}</h2></div><button id="dataHelpClose" class="icon-button small" type="submit" aria-label="${tr('close')}">×</button></div><div class="module-help-content"><p>${text('helpIntro')}</p><p>${text('helpLocal')}</p><p>${text('helpProxy')}</p><p>${text('helpRestore')}</p><p>${text('helpDrive')}</p><p>${text('helpSafety')}</p></div><div class="dialog-actions"><button class="button primary" type="submit">${text('doneHelp')}</button></div></form>`;
    $('driveConnectDialog').innerHTML = `<form method="dialog" novalidate><h2 id="driveConnectTitle">${text('connecting')}</h2><div class="drive-connect-progress" role="status"><span class="drive-spinner" aria-hidden="true"></span><p id="driveConnectProgress"></p></div><p class="field-hint">${text('backgroundProgress')}</p><div class="dialog-actions"><button class="button" type="submit" autofocus>${text('hideProgress')}</button></div></form>`;
    const module = new URLSearchParams(location.search).get('module');
    if (RTransfer.SECTIONS.includes(module)) $('transferSections').querySelectorAll('input[data-section]').forEach(input => { input.checked = input.dataset.section === module; });
    $('selectAllData').onclick = () => { $('transferSections').querySelectorAll('input[data-section]').forEach(input => { input.checked = true; }); updateButtons(); };
    $('dataHelpButton').onclick = () => $('dataHelpDialog').showModal();
    $('transferSections').onchange = updateButtons;
    $('importSections').onchange = updateButtons;
    $('archiveExport').onclick = () => run(async () => { await RTransfer.download(await RTransfer.collect(selected($('transferSections')), $('transferPasswords').checked)); notice(tr('exported')); });
    $('archiveFile').onchange = event => {
      const file = event.target.files[0]; event.target.value = '';
      pending = null; $('archivePreview').hidden = true;
      if (file) run(async () => { try { preview(await RTransfer.readFile(file), file.name); } catch (error) { notice(tr(error.message === 'ARCHIVE_SIZE' ? 'size' : 'invalid'), true); } });
    };
    $('archiveCancel').onclick = () => { pending = null; $('archivePreview').hidden = true; updateButtons(); };
    $('archiveRestore').onclick = () => run(restore);
    $('driveConnect').onclick = () => run(changeDriveConnection, true);
    $('downloadRecovery').onclick = () => run(() => RBackups.downloadRecovery());
    chrome.storage.onChanged?.addListener((changes, area) => { if(area === 'local' && (changes[RBackups.RECOVERY_KEY] || changes.rstartpageBackupError)) updateRecovery(); });
    await updateRecovery();
    $('driveRefresh').onclick = () => run(refreshDrive, true);
    $('driveCreate').onclick = () => run(async () => { await RBackups.create('manual', $('transferPasswords').checked); notice(tr('saved')); await refreshDrive(); }, true);
    $('browserFolderImport').onclick = () => run(async () => { const portable = await RStartpage.portableFromFolderId($('browserFolder').value); await RStartpage.importPortable(portable, { mode: 'merge', skipDuplicates: true, importSettings: false }); notice(tr('copied')); });
    document.addEventListener('rstartpage:settings-change', () => {
      lang = RStartpage.getLanguage() === 'ru' ? 'ru' : 'en';
      document.querySelectorAll('[data-transfer-text]').forEach(node => { node.textContent = tr(node.dataset.transferText); });
      $('archiveMode').options[0].textContent = tr('merge'); $('archiveMode').options[1].textContent = tr('replace');
      $('dataHelpButton').setAttribute('title', tr('help')); $('dataHelpButton').setAttribute('aria-label', tr('help')); $('dataHelpClose').setAttribute('aria-label', tr('close'));
      updateDriveLabels(); updateButtons();
    });
    updateButtons();
    await refreshDrive();
    try {
      const folders = await RStartpage.getBookmarkFoldersForImport();
      for (const folder of folders) { const option = document.createElement('option'); option.value = folder.id; option.textContent = folder.path; $('browserFolder').append(option); }
      if (!folders.length) { const option = document.createElement('option'); option.value = ''; option.textContent = tr('noFolders'); $('browserFolder').append(option); }
    } catch (_) { $('browserFolder').disabled = true; }
    updateButtons();
  });

  function updateButtons() {
    $('settingsData').setAttribute('aria-busy', String(busy));
    $('archiveExport').disabled = busy || !selected($('transferSections')).length;
    $('archiveRestore').disabled = busy || !pending || !selected($('importSections')).length;
    $('archiveCancel').disabled = busy;
    $('archiveFile').disabled = busy;
    $('transferPasswords').disabled = busy || !$('transferSections').querySelector('input[data-section="proxies"]').checked;
    $('driveConnect').disabled = busy || !RDrive.isConfigured();
    $('driveConnect').classList.toggle('drive-connecting', !!connectionPhase);
    $('driveConnect').setAttribute('aria-busy', String(!!connectionPhase));
    $('driveCreate').disabled = busy || !connected;
    $('driveRefresh').disabled = busy || !connected;
    $('browserFolderImport').disabled = busy || !$('browserFolder').value;
    $('driveBackups').querySelectorAll('button').forEach(button => { button.disabled = busy || !connected; });
  }
  async function run(action, drive = false) {
    if (busy) return;
    busy = true; updateButtons();
    try { await action(); }
    catch (error) {
      const message = error.message === 'DRIVE_ACCOUNT_CANCELLED' ? tr('accountCancelled') : error.message === 'SYNC_QUOTA' ? (lang === 'ru' ? 'В архиве слишком много заметок с включённой синхронизацией. Лимит Chrome Sync — 70 КБ; данные не изменены.' : 'The archive exceeds the 70 KB Chrome Sync limit for notes. No data was changed.') : tr(error.message === 'ARCHIVE_INVALID' ? 'invalid' : drive ? 'driveError' : 'failed');
      notice(message, true);
    }
    finally { busy = false; updateButtons(); if (restoreDriveFocus) { restoreDriveFocus = false; $('driveConnect').focus(); } }
  }
  function preview(archive, name) {
    pending = archive;
    $('archiveFilename').textContent = name;
    $('importSections').innerHTML = Object.keys(archive.sections).map(key => `<label class="transfer-section-option"><input type="checkbox" data-section="${key}" checked><span>${text(key)}</span></label>`).join('');
    $('archivePreview').hidden = false;
    $('archiveMode').value = 'merge';
    $('archivePreview').scrollIntoView({ block: 'nearest' });
    updateButtons();
  }
  async function restore() {
    if (!pending) return;
    const mode = $('archiveMode').value;
    const keys = selected($('importSections'));
    if (!keys.length) return notice(tr('select'), true);
    if (!await RStartpage.confirmAction({ title: tr('preview'), message: `${keys.map(tr).join(', ')}. ${tr(mode === 'replace' ? 'replaceText' : 'mergeText')}`, confirmLabel: tr('restore') })) return;
    await RTransfer.restore(pending, keys, mode);
    pending = null; $('archivePreview').hidden = true;
    notice(tr('done'));
    // Refresh the settings form as well as the applied theme after restoration.
    if (keys.includes('settings')) document.dispatchEvent(new CustomEvent('rstartpage:restore-settings'));
  }
  async function changeDriveConnection() {
    if (connected) {
      await RDrive.disconnect();
      await refreshDrive();
      return;
    }
    connectionPhase = 'authorizing';
    updateDriveLabels(); updateButtons();
    $('driveConnectDialog').showModal();
    try {
      await RDrive.connect(() => {
        connectionPhase = 'checking';
        updateDriveLabels();
      }, async (_, account) => {
        $('driveConnectDialog').close();
        return RStartpage.confirmAction({title:tr('accountTitle'),message:tr('accountText').replace('{account}',account),confirmLabel:tr('accountConfirm')});
      });
    } catch (error) {
      // Keep a persistent, local explanation after cancel/error; allow retry.
      connectionPhase = '';
      updateDriveLabels();
      $('driveMessage').textContent = tr('driveError');
      throw error;
    } finally {
      connectionPhase = '';
      restoreDriveFocus = $('driveConnectDialog').open;
      $('driveConnectDialog').close();
      updateButtons();
    }
    await refreshDrive();
  }
  function updateDriveLabels() {
    if (connectionPhase) {
      $('driveStatus').textContent = tr('connecting');
      $('driveStatus').classList.remove('connected');
      $('driveMessage').textContent = tr(connectionPhase);
      $('driveConnectProgress').textContent = tr(connectionPhase);
      return;
    }
    $('driveStatus').textContent = tr(connected ? 'connected' : 'disconnected');
    $('driveStatus').classList.toggle('connected', connected);
    $('driveConnect').textContent = tr(connected ? 'disconnect' : 'connect');
    $('driveMessage').textContent = tr(!RDrive.isConfigured() ? 'unavailable' : connected ? 'online' : 'offline');
  }
  async function updateRecovery() {
    const data = await chrome.storage.local.get([RBackups.RECOVERY_KEY, 'rstartpageBackupError']);
    $('downloadRecovery').hidden = !data[RBackups.RECOVERY_KEY];
    $('driveBackupError').hidden = !data.rstartpageBackupError;
  }
  async function refreshDrive() {
    const connection = await RDrive.state();
    connected = RDrive.isConfigured() && connection.connected;
    updateDriveLabels(); updateButtons();
    if(connected && connection.account) $('driveStatus').textContent += ` · ${connection.account}`;
    await updateRecovery();
    $('driveBackups').replaceChildren();
    if (!connected) {
      $('driveBackups').innerHTML = `<div class="drive-empty"><strong>${text('empty')}</strong><p>${text('emptyHint')}</p><div class="appearance-actions"><button class="button small" disabled>${text('download')}</button><button class="button small" disabled>${text('restore')}</button><button class="button small" disabled>${text('remove')}</button></div></div>`;
      return;
    }
    try {
      const { files } = await RDrive.list();
      const backups = files.filter(file => /^rstartpage-(archive|backup)-/.test(file.name));
      if (!backups.length) $('driveBackups').innerHTML = `<div class="drive-empty"><strong>${text('empty')}</strong></div>`;
      for (const file of backups) {
        const row = document.createElement('article'); row.className = 'drive-backup-row';
        const label = document.createElement('div'); const name = document.createElement('strong'); name.textContent = tr(file.appProperties?.kind === 'auto' ? 'autoBackup' : file.appProperties?.kind === 'before-restore' ? 'safetyBackup' : 'manualBackup'); name.title = file.name;
        const date = document.createElement('small'); date.textContent = `${new Date(file.createdTime).toLocaleString(lang)} · ${new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(Number(file.size || 0) / 1024)} ${lang==='ru'?'КБ':'KB'} · ${file.appProperties?.deviceName || tr('unknownDevice')}`;
        label.append(name, date); row.append(label);
        const actions = document.createElement('div'); actions.className = 'appearance-actions';
        for (const action of ['download', 'restore', 'remove']) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'button small'; button.textContent = tr(action);
          button.onclick = () => run(async () => {
            if (action === 'remove') {
              if (!await RStartpage.confirmAction({ title: tr('deleteTitle'), message: tr('deleteText'), confirmLabel: tr('remove') })) return;
              await RDrive.remove(file.id); await refreshDrive(); notice(tr('deleted'));
            } else {
              const archive = RTransfer.normalize(await RDrive.download(file.id));
              if (action === 'download') await RTransfer.download(archive);
              else preview(archive, file.name);
            }
          }, true);
          actions.append(button);
        }
        row.append(actions); $('driveBackups').append(row);
      }
    } catch (_) { $('driveMessage').textContent = tr('driveError'); }
    updateButtons();
  }
})();
