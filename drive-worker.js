'use strict';

// Service-worker lifecycle: alarms survive idle suspension; startup recreates
// missing alarms. Dirty data itself lives in storage, never only in a timer.
const RDriveWorker = (() => {
  const ALARM = 'rstartpage-drive-poll';
  const SOON = 'rstartpage-drive-pending';
  let pendingTimer;
  let running = null;
  async function cycle() {
    if (running) return running;
    running = (async () => {
      if (!RDrive.isConfigured() || !(await RDrive.state()).connected) return;
      // Old 1.8.5 connections have no verified account binding. Require an
      // explicit reconnect instead of guessing where local notes should go.
      if (!(await RDrive.state()).accountId) {
        await chrome.storage.local.set({ [RNoteSync.STATUS_KEY]: { phase: 'auth', dirty: true } }); return;
      }
      try { await RNoteSync.sync(); } catch (_) { return; }
      try { await RBackups.create('auto'); }
      catch (_) { await chrome.storage.local.set({ rstartpageBackupError: true }); return; }
      await chrome.storage.local.set({ rstartpageBackupError: false });
    })().finally(() => { running = null; });
    return running;
  }
  async function schedule() {
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => cycle(), 3000);
    // Durable fallback if Chrome terminates the idle worker before the debounce.
    await chrome.alarms.create(SOON, { delayInMinutes: 0.5 });
  }
  async function startup() {
    if (!await chrome.alarms.get(ALARM)) await chrome.alarms.create(ALARM, { periodInMinutes: 1 });
    await cycle();
  }
  chrome.alarms.onAlarm.addListener(alarm => { if ([ALARM, SOON].includes(alarm.name)) return cycle(); });
  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (!['drive:sync', 'drive:schedule'].includes(message?.type)) return;
    (message.type === 'drive:sync' ? cycle() : schedule()).then(() => respond({ ok: true })).catch(() => respond({ ok: false }));
    return true;
  });
  startup().catch(() => {});
  return { cycle, schedule };
})();
