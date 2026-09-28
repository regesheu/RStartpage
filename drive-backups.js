'use strict';

const RBackups = (() => {
  const KEY = 'rstartpageAutoBackupV1';
  const RECOVERY_KEY = 'rstartpageBeforeRestoreV1';
  const DAY = 24 * 60 * 60 * 1000;
  async function digest(archive) {
    // Export timestamps are not content changes.
    const stable = JSON.parse(JSON.stringify(archive, (key, value) => key === 'exportedAt' || key === '_clock' ? undefined : value));
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(RNoteSync.canonical(stable)));
    return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
  }
  async function create(kind = 'manual', includePasswords = false) {
    return RNoteSync.lock('rstartpage-drive-network', async () => {
      const connection = await RDrive.state();
      if (!connection.connected || !connection.accountId) throw new Error('DRIVE_AUTH_REQUIRED');
      const access = await RDrive.session(connection.accountId);
      const saved = (await chrome.storage.local.get(KEY))[KEY] || {};
      const previous = saved[connection.accountId] || {};
      if (kind === 'auto' && Date.now() - (previous.lastChecked || previous.lastAt || 0) < DAY) return null;
      const archive = await RTransfer.collect(RTransfer.SECTIONS, kind === 'manual' && includePasswords);
      const fingerprint = await digest(archive);
      if (kind === 'auto' && previous.digest === fingerprint) {
        saved[connection.accountId] = {...previous,lastChecked:Date.now()};
        await chrome.storage.local.set({[KEY]:saved}); return null;
      }
      const device = await RNoteSync.device();
      const name = `rstartpage-archive-${kind}-${Date.now()}-${device.id.slice(0, 8)}.json`;
      const file = await RDrive.upload(name, archive, '', { kind, deviceId: device.id, deviceName: device.name }, access);
      if (kind === 'auto') {
        saved[connection.accountId] = { lastAt: Date.now(), lastChecked: Date.now(), digest: fingerprint };
        await chrome.storage.local.set({ [KEY]: saved });
        const { files } = await RDrive.list(access);
        // Keep the latest 10 automatic copies across devices. Manual and
        // pre-restore copies are never pruned by this policy.
        const autos = files.filter(f => f.appProperties?.kind === 'auto').sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || '') || b.id.localeCompare(a.id));
        for (const old of autos.slice(10)) await RDrive.remove(old.id, access);
      }
      return file;
    });
  }
  async function beforeRestore() {
    // Always retain a local recovery archive, including when Drive is offline.
    // Fail closed: if this cannot be saved, do not start a destructive restore.
    const archive = await RTransfer.collect(RTransfer.SECTIONS, false);
    await chrome.storage.local.set({ [RECOVERY_KEY]: archive });
    if ((await RDrive.state()).connected) await create('before-restore');
  }
  async function downloadRecovery() {
    const archive = (await chrome.storage.local.get(RECOVERY_KEY))[RECOVERY_KEY];
    if (!archive) throw new Error('NO_RECOVERY_COPY');
    await RTransfer.download(archive, `rstartpage-before-restore-${RStartpage.slugDate()}.zip`);
  }
  return { KEY, RECOVERY_KEY, DAY, create, beforeRestore, downloadRecovery, digest };
})();
