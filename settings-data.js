'use strict';

(() => {
  const COPY = {
    ru: {
      transfer: 'Экспорт и импорт', intro: 'Все данные расширения — в одном месте. Выберите разделы или сохраните всё сразу.',
      bookmarks: 'Ссылки', bookmarksHint: 'Разделы, группы и закладки', notes: 'Заметки', notesHint: 'Текст, группы, теги и источники',
      proxies: 'Прокси', proxiesHint: 'Профили и правила маршрутизации', sessions: 'Сессии', sessionsHint: 'Сохранённые окна и вкладки', settings: 'Настройки и фон', settingsHint: 'Внешний вид, меню и изображение', rules: 'Правила прокси',
      all: 'Выбрать всё', passwords: 'Включить пароли прокси', passwordHint: 'По умолчанию пароли не сохраняются. Архив не зашифрован.',
      export: 'Сохранить архив', exportHint: 'ZIP с выбранными разделами. Подходит для переноса на другое устройство.',
      import: 'Загрузить архив', importHint: 'ZIP из RStartpage или JSON из предыдущих версий. Максимум 64 МБ.', choose: 'Выбрать файл',
      preview: 'Восстановление', merge: 'Объединить с текущими данными', replace: 'Заменить выбранные разделы', restore: 'Восстановить', cancel: 'Отмена',
      replaceText: 'Текущие данные выбранных разделов будут заменены. Остальные разделы останутся без изменений.', mergeText: 'Данные будут добавлены. Выбранные настройки и фон заменят текущие. Перед восстановлением сохраните локальный архив.',
      done: 'Данные восстановлены.', exported: 'Архив подготовлен.', select: 'Выберите хотя бы один раздел.', invalid: 'Не удалось прочитать архив. Выберите ZIP или JSON, экспортированный из RStartpage.', size: 'Файл слишком большой. Максимум 64 МБ.', failed: 'Операция не завершена. Часть данных могла сохраниться. Проверьте разделы перед повтором.',
      drive: 'Google Drive', driveHint: 'Резервные копии в папке приложения', connect: 'Подключить Google Drive', disconnect: 'Отключить', connected: 'Подключён', disconnected: 'Не подключён',
      unavailable: 'В этой сборке подключение Google Drive ещё не настроено. Локальное сохранение и восстановление архивов доступны.',
      offline: 'Подключите Google Drive, чтобы сохранять, скачивать и восстанавливать облачные копии.', online: 'Копии доступны только этому расширению. В каждой копии сохраняются все разделы и фон.',
      create: 'Создать копию всего', refresh: 'Обновить список', empty: 'Резервных копий пока нет', emptyHint: 'После подключения здесь появятся ваши облачные копии.', download: 'Скачать', remove: 'Удалить',
      deleteTitle: 'Удалить резервную копию?', deleteText: 'Копия будет удалена из Google Drive без возможности отмены. Данные расширения сохранятся.',
      driveError: 'Google Drive недоступен. Проверьте интернет и разрешение доступа, затем повторите подключение.', saved: 'Резервная копия сохранена.', deleted: 'Копия удалена.', loading: 'Выполняется…',
      folder: 'Из закладок браузера', folderHint: 'Скопировать папку Chrome в ссылки RStartpage.', copy: 'Скопировать папку', copied: 'Закладки скопированы.', noFolders: 'Нет доступных папок',
    },
    en: {
      transfer: 'Export and import', intro: 'All extension data in one place. Choose sections or save everything at once.',
      bookmarks: 'Links', bookmarksHint: 'Workspaces, groups and bookmarks', notes: 'Notes', notesHint: 'Text, groups, tags and sources', proxies: 'Proxy', proxiesHint: 'Profiles and routing rules', sessions: 'Sessions', sessionsHint: 'Saved windows and tabs', settings: 'Settings and wallpaper', settingsHint: 'Appearance, navigation and image', rules: 'Proxy rules',
      all: 'Select all', passwords: 'Include proxy passwords', passwordHint: 'Passwords are excluded by default. The archive is not encrypted.', export: 'Save archive', exportHint: 'A ZIP with the selected sections, ready to move to another device.', import: 'Upload archive', importHint: 'A RStartpage ZIP or JSON from earlier versions. Maximum 64 MB.', choose: 'Choose file', preview: 'Restore data', merge: 'Merge with current data', replace: 'Replace selected sections', restore: 'Restore', cancel: 'Cancel',
      replaceText: 'Current data in the selected sections will be replaced. Other sections will stay unchanged.', mergeText: 'Data will be added. Selected settings and wallpaper will replace current preferences. Save a local archive before restoring.', done: 'Data restored.', exported: 'Archive prepared.', select: 'Choose at least one section.', invalid: 'Cannot read this archive. Choose a ZIP or JSON exported from RStartpage.', size: 'The file is too large. Maximum 64 MB.', failed: 'The operation did not finish. Some data may have been saved. Check the sections before trying again.',
      drive: 'Google Drive', driveHint: 'Backups in the application folder', connect: 'Connect Google Drive', disconnect: 'Disconnect', connected: 'Connected', disconnected: 'Not connected', unavailable: 'Google Drive connection has not been configured in this build. Local archive export and restore are available.', offline: 'Connect Google Drive to save, download and restore cloud backups.', online: 'Only this extension can access these copies. Each backup includes every section and the wallpaper.', create: 'Back up everything', refresh: 'Refresh list', empty: 'No backups yet', emptyHint: 'Your cloud backups will appear here after connecting.', download: 'Download', remove: 'Delete', deleteTitle: 'Delete backup?', deleteText: 'This copy will be permanently deleted from Google Drive. Extension data will be kept.', driveError: 'Google Drive is unavailable. Check your connection and access permission, then reconnect.', saved: 'Backup saved.', deleted: 'Backup deleted.', loading: 'Working…',
      folder: 'From browser bookmarks', folderHint: 'Copy a Chrome folder into RStartpage links.', copy: 'Copy folder', copied: 'Bookmarks copied.', noFolders: 'No folders available',
    },
  };
  let lang = 'en', pending = null, busy = false, connected = false;
  const $ = id => document.getElementById(id);
  const tr = key => COPY[lang][key] || key;
  const text = key => `<span data-transfer-text="${key}">${tr(key)}</span>`;
  const selected = root => [...root.querySelectorAll('input[data-section]:checked')].map(input => input.dataset.section);
  const notice = (message, error = false) => { $('transferNotice').textContent = message; $('transferNotice').classList.toggle('error', error); $('transferNotice').hidden = false; };

  window.addEventListener('DOMContentLoaded', async () => {
    lang = (await RStartpage.loadSettings()).language === 'ru' ? 'ru' : 'en';
    $('settingsData').innerHTML = `
      <div class="data-section-heading"><div><h3>${text('transfer')}</h3><p>${text('intro')}</p></div><button id="selectAllData" type="button" class="button small">${text('all')}</button></div>
      <fieldset id="transferSections" class="transfer-sections"><legend class="sr-only">${text('transfer')}</legend>${RTransfer.SECTIONS.map(key => `<label class="transfer-section-option"><input type="checkbox" data-section="${key}" checked><span><strong>${text(key)}</strong><small>${text(key + 'Hint')}</small></span></label>`).join('')}</fieldset>
      <label class="checkbox-setting transfer-passwords"><input id="transferPasswords" type="checkbox"><span><strong>${text('passwords')}</strong><small>${text('passwordHint')}</small></span></label>
      <div class="transfer-actions-grid"><article class="transfer-card"><h4>${text('export')}</h4><p>${text('exportHint')}</p><button id="archiveExport" class="button primary" type="button">${text('export')}</button></article><article class="transfer-card"><h4>${text('import')}</h4><p>${text('importHint')}</p><label class="button file-button">${text('choose')}<input id="archiveFile" type="file" accept=".zip,.json,application/zip,application/json"></label></article></div>
      <div id="transferNotice" class="transfer-notice" role="status" aria-live="polite" hidden></div>
      <section id="archivePreview" class="archive-preview" aria-labelledby="archivePreviewTitle" hidden><h4 id="archivePreviewTitle">${text('preview')}</h4><p id="archiveFilename"></p><fieldset id="importSections" class="transfer-sections"><legend class="sr-only">${text('preview')}</legend></fieldset><label class="field"><select id="archiveMode" class="select" aria-label="${tr('preview')}"><option value="merge">${tr('merge')}</option><option value="replace">${tr('replace')}</option></select></label><div class="appearance-actions"><button id="archiveRestore" class="button primary" type="button">${text('restore')}</button><button id="archiveCancel" class="button" type="button">${text('cancel')}</button></div></section>
      <details class="browser-folder-import"><summary>${text('folder')}</summary><p>${text('folderHint')}</p><div class="appearance-actions"><select id="browserFolder" class="select" aria-label="${tr('folder')}"></select><button id="browserFolderImport" type="button" class="button">${text('copy')}</button></div></details>
      <section class="drive-settings" aria-labelledby="driveHeading"><div class="data-section-heading"><div><h3 id="driveHeading">${text('drive')}</h3><p>${text('driveHint')}</p></div><span id="driveStatus" class="drive-status"></span></div><p id="driveMessage" class="drive-message"></p><div class="appearance-actions"><button id="driveConnect" class="button" type="button"></button><button id="driveCreate" class="button primary" type="button" disabled>${text('create')}</button><button id="driveRefresh" class="button" type="button" disabled>${text('refresh')}</button></div><div id="driveBackups" class="drive-backups" aria-live="polite"></div></section>`;
    const module = new URLSearchParams(location.search).get('module');
    if (RTransfer.SECTIONS.includes(module)) $('transferSections').querySelectorAll('input').forEach(input => { input.checked = input.dataset.section === module; });
    $('selectAllData').onclick = () => { $('transferSections').querySelectorAll('input').forEach(input => { input.checked = true; }); updateButtons(); };
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
    $('driveConnect').onclick = () => run(async () => { if (connected) await RDrive.disconnect(); else await RDrive.connect(); await refreshDrive(); }, true);
    $('driveRefresh').onclick = () => run(refreshDrive, true);
    $('driveCreate').onclick = () => run(async () => { await RDrive.upload(`rstartpage-archive-${Date.now()}.json`, await RTransfer.collect(RTransfer.SECTIONS, $('transferPasswords').checked)); notice(tr('saved')); await refreshDrive(); }, true);
    $('browserFolderImport').onclick = () => run(async () => { const portable = await RStartpage.portableFromFolderId($('browserFolder').value); await RStartpage.importPortable(portable, { mode: 'merge', skipDuplicates: true, importSettings: false }); notice(tr('copied')); });
    document.addEventListener('rstartpage:settings-change', () => {
      lang = RStartpage.getLanguage() === 'ru' ? 'ru' : 'en';
      $('settingsData').querySelectorAll('[data-transfer-text]').forEach(node => { node.textContent = tr(node.dataset.transferText); });
      $('archiveMode').options[0].textContent = tr('merge'); $('archiveMode').options[1].textContent = tr('replace');
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
    $('driveConnect').disabled = busy || !RDrive.isConfigured();
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
      const message = error.message === 'SYNC_QUOTA' ? (lang === 'ru' ? 'В архиве слишком много заметок с включённой синхронизацией. Лимит Chrome Sync — 70 КБ; данные не изменены.' : 'The archive exceeds the 70 KB Chrome Sync limit for notes. No data was changed.') : error.message === 'NOTES_CAPACITY' ? (lang === 'ru' ? 'После объединения будет превышен лимит 500 заметок или 100 групп. Выберите замену или освободите место.' : 'Merging exceeds the limit of 500 notes or 100 groups. Choose replace or free up space.') : tr(error.message === 'ARCHIVE_INVALID' ? 'invalid' : drive ? 'driveError' : 'failed');
      notice(message, true);
    }
    finally { busy = false; updateButtons(); }
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
  function updateDriveLabels() {
    $('driveStatus').textContent = tr(connected ? 'connected' : 'disconnected');
    $('driveStatus').classList.toggle('connected', connected);
    $('driveConnect').textContent = tr(connected ? 'disconnect' : 'connect');
    $('driveMessage').textContent = tr(!RDrive.isConfigured() ? 'unavailable' : connected ? 'online' : 'offline');
  }
  async function refreshDrive() {
    connected = RDrive.isConfigured() && (await RDrive.state()).connected;
    updateDriveLabels(); updateButtons();
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
        const label = document.createElement('div'); const name = document.createElement('strong'); name.textContent = file.name;
        const date = document.createElement('small'); date.textContent = `${new Date(file.createdTime).toLocaleString(lang)} · ${Math.ceil(Number(file.size || 0) / 1024)} KB`;
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
