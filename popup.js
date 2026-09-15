'use strict';

const ui = {};
let language = 'en';
let busy = false;
let sessionNoticeTimer = null;

const QUICK_TXT = {
  en: { sessions: 'Sessions', hint: 'Save or restore a browser session', save: 'Save', manage: 'Manage sessions', restore: 'Restore', empty: 'No saved sessions', tabs: '{count} tabs', saved: 'Session saved', restored: 'Session opened in a new window', failed: 'Session action failed' },
  ru: { sessions: 'Сессии', hint: 'Сохранить или восстановить сессию браузера', save: 'Сохранить', manage: 'Управление сессиями', restore: 'Открыть', empty: 'Сохранённых сессий нет', tabs: '{count} вкладок', saved: 'Сессия сохранена', restored: 'Сессия открыта в новом окне', failed: 'Ошибка работы с сессией' },
};

function qt(key, params = {}) {
  const template = QUICK_TXT[language]?.[key] ?? QUICK_TXT.en[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

window.addEventListener('DOMContentLoaded', init);

async function init() {
  Object.assign(ui, {
    proxyLabel: document.querySelector('#proxyLabel'),
    masterToggle: document.querySelector('#masterToggle'),
    statusCard: document.querySelector('#statusCard'),
    statusTitle: document.querySelector('#statusTitle'),
    statusDetail: document.querySelector('#statusDetail'),
    statusBadge: document.querySelector('#statusBadge'),
    profileList: document.querySelector('#profileList'),
    manageButton: document.querySelector('#manageButton'),
    manageLabel: document.querySelector('#manageLabel'),
    toolbarHint: document.querySelector('#toolbarHint'),
    sessionsLabel: document.querySelector('#sessionsLabel'),
    sessionsHint: document.querySelector('#sessionsHint'),
    saveSessionQuickButton: document.querySelector('#saveSessionQuickButton'),
    sessionQuickNotice: document.querySelector('#sessionQuickNotice'),
    sessionQuickList: document.querySelector('#sessionQuickList'),
    manageSessionsButton: document.querySelector('#manageSessionsButton'),
    manageSessionsLabel: document.querySelector('#manageSessionsLabel'),
  });
  language = await ProxyStore.getLanguage();
  applyText();
  bind();
  await Promise.all([refresh(), refreshSessions()]);
}

function applyText() {
  ui.proxyLabel.textContent = ProxyStore.t(language, 'proxy');
  ui.manageLabel.textContent = ProxyStore.t(language, 'manage');
  ui.toolbarHint.textContent = ProxyStore.t(language, 'toolbarHint');
  ui.sessionsLabel.textContent = qt('sessions');
  ui.sessionsHint.textContent = qt('hint');
  ui.saveSessionQuickButton.textContent = `＋ ${qt('save')}`;
  ui.manageSessionsLabel.textContent = qt('manage');
}

function bind() {
  ui.masterToggle.addEventListener('change', async () => {
    if (busy) return;
    busy = true;
    ui.masterToggle.disabled = true;
    const response = await chrome.runtime.sendMessage({ type: ui.masterToggle.checked ? 'proxy:toggle' : 'proxy:disable' });
    if (!response?.ok) console.error(response?.error);
    await refresh();
    busy = false;
    ui.masterToggle.disabled = false;
  });
  ui.manageButton.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('proxy.html') }));
  ui.manageSessionsButton.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('tools.html#sessionsSection') }));
  ui.saveSessionQuickButton.addEventListener('click', saveCurrentSessionQuick);
  chrome.storage.onChanged.addListener((_changes, area) => {
    refresh();
    if (area === 'local') refreshSessions();
  });
}

async function refresh() {
  const response = await chrome.runtime.sendMessage({ type: 'proxy:getStatus' });
  if (!response?.ok) return;
  const { state, profiles, active, selected, tests } = response;
  ui.masterToggle.checked = !!state.enabled;
  ui.profileList.replaceChildren();

  if (state.lastError) {
    ui.statusCard.hidden = false;
    ui.statusCard.className = 'status-card error';
    ui.statusTitle.textContent = ProxyStore.t(language, 'statusError');
    ui.statusDetail.textContent = state.lastError;
    ui.statusBadge.textContent = 'ERR';
  } else if (state.enabled && active) {
    // The active proxy is already highlighted in the list below. Avoid
    // duplicating its name in a separate status card.
    ui.statusCard.hidden = true;
  } else {
    ui.statusCard.hidden = false;
    ui.statusCard.className = 'status-card off';
    ui.statusTitle.textContent = ProxyStore.t(language, 'statusOff');
    ui.statusDetail.textContent = selected ? `${ProxyStore.t(language, 'selected')}: ${selected.name}` : '';
    ui.statusBadge.textContent = 'OFF';
  }

  profiles.forEach((profile) => {
    const test = tests?.[profile.id];
    const isActive = !!(state.enabled && active?.id === profile.id);
    const hasError = !!(isActive && state.lastError);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `profile-button${isActive ? ' active' : ''}${hasError ? ' error' : ''}`;
    const latency = test?.ok ? ` · ${test.latencyMs} ms` : '';
    const statusDot = isActive ? `<span class="profile-state-dot" aria-hidden="true"></span>` : '';
    button.innerHTML = `<span class="profile-main"><strong>${statusDot}${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.scheme.toUpperCase())} · ${escapeHtml(profile.host)}:${profile.port}${latency}</span></span><span class="profile-mini-badge">${escapeHtml(ProxyStore.normalizeBadge(profile.name, profile.badge))}</span>`;
    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      const result = await chrome.runtime.sendMessage({ type: 'proxy:activate', id: profile.id });
      if (!result?.ok) console.error(result?.error);
      await refresh();
      busy = false;
    });
    ui.profileList.append(button);
  });
}


async function refreshSessions() {
  if (!ui.sessionQuickList) return;
  try {
    const sessions = await RTools.getSessions();
    ui.sessionQuickList.replaceChildren();
    if (!sessions.length) {
      const empty = document.createElement('div');
      empty.className = 'session-quick-empty';
      empty.textContent = qt('empty');
      ui.sessionQuickList.append(empty);
      return;
    }
    for (const session of sessions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'session-quick-item';
      button.title = session.name;
      button.innerHTML = `<span class="session-quick-main"><strong>${escapeHtml(session.name)}</strong><span>${escapeHtml(qt('tabs', { count: session.tabs.length }))}</span></span><span class="session-quick-open">${escapeHtml(qt('restore'))}</span>`;
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await RTools.openSession(session.id, 'new-window');
          showSessionNotice(qt('restored'));
        } catch (error) {
          console.error(error);
          showSessionNotice(error.message || qt('failed'), true);
        } finally { button.disabled = false; }
      });
      ui.sessionQuickList.append(button);
    }
  } catch (error) {
    console.error(error);
    showSessionNotice(error.message || qt('failed'), true);
  }
}

async function saveCurrentSessionQuick() {
  if (busy) return;
  busy = true;
  ui.saveSessionQuickButton.disabled = true;
  try {
    const session = await RTools.captureCurrentWindow('');
    showSessionNotice(`${qt('saved')}: ${session.name}`);
    await refreshSessions();
  } catch (error) {
    console.error(error);
    showSessionNotice(error.message || qt('failed'), true);
  } finally {
    busy = false;
    ui.saveSessionQuickButton.disabled = false;
  }
}

function showSessionNotice(message, error = false) {
  clearTimeout(sessionNoticeTimer);
  ui.sessionQuickNotice.textContent = message;
  ui.sessionQuickNotice.classList.toggle('error', error);
  ui.sessionQuickNotice.hidden = false;
  sessionNoticeTimer = setTimeout(() => { ui.sessionQuickNotice.hidden = true; }, 3500);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
