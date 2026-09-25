'use strict';

const RS = RStartpage;
const ui = {};
let language = 'en';
let busy = false;
let sessionNoticeTimer = null;
let popupNoticeTimer = null;
const groupOptions = new Map();

const TXT = {
  en: { sessions:'Sessions', hint:'Save or restore a browser session', save:'Save', restore:'Restore', empty:'No saved sessions', tabs:'{count} tabs', saved:'Session saved', restored:'Session opened in a new window', failed:'Action failed', home:'Home', addLink:'Add link', name:'Name', url:'URL', group:'Group', description:'Description', cancel:'Cancel', add:'Add link', added:'Link added to {group}.', invalidName:'Enter a link name.', invalidUrl:'Enter a valid URL.', noGroup:'No bookmark group is available.', createNote:'Create note', noteOpenFailed:'Could not open note creation.' },
  ru: { sessions:'Сессии', hint:'Сохранить или открыть сессию браузера', save:'Сохранить', restore:'Открыть', empty:'Сохранённых сессий нет', tabs:'{count} вкладок', saved:'Сессия сохранена', restored:'Сессия открыта в новом окне', failed:'Не удалось выполнить действие', home:'Главная', addLink:'Добавить ссылку', name:'Название', url:'URL', group:'Группа', description:'Описание', cancel:'Отмена', add:'Добавить ссылку', added:'Ссылка добавлена в «{group}».', invalidName:'Введите название ссылки.', invalidUrl:'Введите корректный URL.', noGroup:'Нет доступной группы закладок.', createNote:'Создать заметку', noteOpenFailed:'Не удалось открыть создание заметки.' },
};

function qt(key, params = {}) { const template = TXT[language]?.[key] ?? TXT.en[key] ?? key; return RS.productText(String(template).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''))); }
window.addEventListener('DOMContentLoaded', init);

async function init() {
  cache();
  const settings = await RS.loadSettings(); language = settings.language === 'ru' ? 'ru' : 'en'; RS.setLanguage(language); RS.setProductName(settings.productName || settings.tabTitle); document.documentElement.dataset.theme = settings.theme; RS.applyAccent(document.documentElement, settings);
  document.title = RS.getProductName(); ui.popupProductName.textContent = RS.getProductName(); applyText(); bind(); ui.createNoteButton?.addEventListener('click', createNoteFromCurrentTab); RS.enableScriptActions(); await Promise.all([refreshProxy(), refreshSessions()]);
}

async function createNoteFromCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const sourceUrl = RS.isNavigableUrl(tab?.url || '') ? tab.url : '';
    await RNotes.savePendingDraft({ title: tab?.title || '', content: '', sourceUrl });
    await chrome.tabs.create({ url: chrome.runtime.getURL('notes.html?new=1') });
    window.close();
  } catch (error) { showPopupNotice(qt('noteOpenFailed'), true); }
}

function cache() { document.querySelectorAll('[id]').forEach((node) => { ui[node.id] = node; }); }

function applyText() {
  document.documentElement.lang = language;
  ui.proxyLabel.textContent = ProxyStore.t(language, 'proxy'); ui.sessionsLabel.textContent = qt('sessions'); ui.sessionsHint.textContent = qt('hint'); ui.saveSessionQuickButton.textContent = `${qt('save')}`;
  ui.homeButton.setAttribute('aria-label', qt('home')); ui.createNoteButton.textContent = `${qt('createNote')}`; ui.homeButton.title = qt('home'); ui.addLinkToggleLabel.textContent = `${qt('addLink')}`; ui.linkNameLabel.textContent = qt('name'); ui.linkUrlLabel.textContent = qt('url'); ui.linkGroupLabel.textContent = qt('group'); ui.linkDescriptionLabel.textContent = qt('description'); ui.addLinkCancel.textContent = qt('cancel'); ui.addLinkSubmit.textContent = qt('add');
}

function bind() {
  ui.homeButton.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') }));
  ui.masterToggle.addEventListener('change', toggleProxy);
  ui.saveSessionQuickButton.addEventListener('click', saveCurrentSessionQuick);
  ui.addLinkToggle.addEventListener('click', toggleAddLinkPanel);
  ui.addLinkCancel.addEventListener('click', closeAddLinkPanel);
  ui.addLinkForm.addEventListener('submit', saveLink);
  chrome.storage.onChanged.addListener((_changes, area) => { refreshProxy(); if (area === 'local') refreshSessions(); });
}

async function toggleAddLinkPanel() {
  const open = ui.addLinkPanel.hidden; if (!open) { closeAddLinkPanel(); return; }
  ui.addLinkPanel.hidden = false; ui.addLinkToggle.setAttribute('aria-expanded', 'true'); ui.addLinkError.textContent = ''; ui.addLinkSubmit.disabled = true;
  try { await prepareLinkForm(); ui.addLinkSubmit.disabled = false; ui.linkNameInput.focus(); }
  catch (error) { ui.addLinkError.textContent = error.message || qt('failed'); }
}

function closeAddLinkPanel() { ui.addLinkPanel.hidden = true; ui.addLinkToggle.setAttribute('aria-expanded', 'false'); ui.addLinkError.textContent = ''; }

async function prepareLinkForm() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = RS.isNavigableUrl(tab?.url || '') ? tab.url : '';
  ui.linkUrlInput.value = url; ui.linkNameInput.value = String(tab?.title || (url ? RS.hostFromUrl(url) : '')).slice(0, 300); ui.linkDescriptionInput.value = '';
  const structure = await RS.getStructure(); groupOptions.clear(); ui.linkGroupSelect.replaceChildren();
  for (const workspace of structure.workspaces) {
    let groups = RS.groupsForWorkspace(workspace);
    if (!groups.length) { const created = await RS.ensureGroup(workspace.id, RS.DEFAULT_GROUP); groups = [{ ...created, bookmarks: [] }]; }
    for (const group of groups) {
      const key = `${workspace.id}:${group.id}`; groupOptions.set(key, { workspace, group }); const option = document.createElement('option'); option.value = key; option.textContent = `${workspace.title} / ${group.title}`; ui.linkGroupSelect.append(option);
    }
  }
  if (!ui.linkGroupSelect.options.length) throw new Error(qt('noGroup'));
  ui.linkGroupSelect.selectedIndex = 0;
}

async function saveLink(event) {
  event.preventDefault(); ui.addLinkError.textContent = '';
  const title = ui.linkNameInput.value.trim(); const url = RS.normalizeUrl(ui.linkUrlInput.value); const target = groupOptions.get(ui.linkGroupSelect.value); const description = ui.linkDescriptionInput.value.trim();
  if (!title) { ui.addLinkError.textContent = qt('invalidName'); ui.linkNameInput.focus(); return; }
  if (!RS.isNavigableUrl(url)) { ui.addLinkError.textContent = qt('invalidUrl'); ui.linkUrlInput.focus(); return; }
  if (!target) { ui.addLinkError.textContent = qt('noGroup'); return; }
  ui.addLinkSubmit.disabled = true;
  try {
    const parentId = target.group.virtual ? target.group.parentId : target.group.id; const created = await chrome.bookmarks.create({ parentId, title, url });
    await RS.setMeta(RS.bookmarkParts(target.workspace.title, target.group.title, created.title, created.url), { description }); closeAddLinkPanel(); showPopupNotice(qt('added', { group: target.group.title }));
  } catch (error) { ui.addLinkError.textContent = error.message || qt('failed'); }
  finally { ui.addLinkSubmit.disabled = false; }
}

async function toggleProxy() {
  if (busy) return; busy = true; ui.masterToggle.disabled = true;
  try { const response = await chrome.runtime.sendMessage({ type: ui.masterToggle.checked ? 'proxy:toggle' : 'proxy:disable' }); if (!response?.ok) throw new Error(response?.error || qt('failed')); await refreshProxy(); }
  catch (error) { showPopupNotice(error.message || qt('failed'), true); }
  finally { busy = false; ui.masterToggle.disabled = false; }
}

async function refreshProxy() {
  const response = await chrome.runtime.sendMessage({ type:'proxy:getStatus' }); if (!response?.ok) return; const { state, profiles, active, selected, tests } = response; ui.masterToggle.checked = !!state.enabled; ui.profileList.replaceChildren();
  if (state.lastError) { ui.statusCard.hidden = false; ui.statusCard.className = 'status-card error'; ui.statusTitle.textContent = ProxyStore.t(language,'statusError'); ui.statusDetail.textContent = state.lastError; ui.statusBadge.textContent = 'ERR'; }
  else if (state.enabled && active) ui.statusCard.hidden = true;
  else { ui.statusCard.hidden = false; ui.statusCard.className = 'status-card off'; ui.statusTitle.textContent = ProxyStore.t(language,'statusOff'); ui.statusDetail.textContent = selected ? `${ProxyStore.t(language,'selected')}: ${selected.name}` : ''; ui.statusBadge.textContent = 'OFF'; }
  profiles.forEach((profile) => {
    const test = tests?.[profile.id]; const isActive = !!(state.enabled && active?.id === profile.id); const button = document.createElement('button'); button.type = 'button'; button.className = `profile-button${isActive ? ' active' : ''}`; const latency = test?.ok ? ` · ${test.latencyMs} ms` : ''; const dot = isActive ? '<span class="profile-state-dot" aria-hidden="true"></span>' : '';
    button.innerHTML = `<span class="profile-main"><strong>${dot}${RS.escapeHtml(profile.name)}</strong><span>${RS.escapeHtml(profile.scheme.toUpperCase())} · ${RS.escapeHtml(profile.host)}:${profile.port}${latency}</span></span><span class="profile-mini-badge">${RS.escapeHtml(ProxyStore.normalizeBadge(profile.name,profile.badge))}</span>`;
    button.addEventListener('click', async () => { if (busy) return; busy = true; button.disabled = true; try { const result = await chrome.runtime.sendMessage({ type:'proxy:activate', id:profile.id }); if (!result?.ok) throw new Error(result?.error || qt('failed')); await refreshProxy(); } catch (error) { showPopupNotice(error.message || qt('failed'), true); } finally { busy = false; button.disabled = false; } }); ui.profileList.append(button);
  });
}

async function refreshSessions() {
  try {
    const sessions = await RTools.getSessions(); ui.sessionQuickList.replaceChildren();
    if (!sessions.length) { const empty = document.createElement('div'); empty.className = 'session-quick-empty'; empty.textContent = qt('empty'); ui.sessionQuickList.append(empty); return; }
    for (const session of sessions) { const button = document.createElement('button'); button.type = 'button'; button.className = 'session-quick-item'; button.title = session.name; button.innerHTML = `<span class="session-quick-main"><strong>${RS.escapeHtml(session.name)}</strong><span>${RS.escapeHtml(qt('tabs',{count:session.tabs.length}))}</span></span><span class="session-quick-open">${RS.escapeHtml(qt('restore'))}</span>`; button.addEventListener('click', async () => { button.disabled = true; try { await RTools.openSession(session.id,'new-window'); showSessionNotice(qt('restored')); } catch (error) { showSessionNotice(error.message || qt('failed'),true); } finally { button.disabled = false; } }); ui.sessionQuickList.append(button); }
  } catch (error) { showSessionNotice(error.message || qt('failed'),true); }
}

async function saveCurrentSessionQuick() { if (busy) return; busy = true; ui.saveSessionQuickButton.disabled = true; try { const session = await RTools.captureCurrentWindow(''); showSessionNotice(`${qt('saved')}: ${session.name}`); await refreshSessions(); } catch (error) { showSessionNotice(error.message || qt('failed'),true); } finally { busy = false; ui.saveSessionQuickButton.disabled = false; } }
function showSessionNotice(message,error=false){clearTimeout(sessionNoticeTimer);ui.sessionQuickNotice.textContent=message;ui.sessionQuickNotice.classList.toggle('error',error);ui.sessionQuickNotice.hidden=false;sessionNoticeTimer=setTimeout(()=>{ui.sessionQuickNotice.hidden=true},3500)}
function showPopupNotice(message,error=false){clearTimeout(popupNoticeTimer);ui.popupNotice.textContent=message;ui.popupNotice.classList.toggle('error',error);ui.popupNotice.hidden=false;popupNoticeTimer=setTimeout(()=>{ui.popupNotice.hidden=true},4000)}
