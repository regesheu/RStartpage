'use strict';

// Opera has no reliable extension sync service. Keep that logical area local,
// in a separate namespace, so sync.get(null)/clear cannot expose/remove local data.
const ROperaStorage = (() => {
  const prefix = 'rstartpageOperaPreferences:';
  const local = chrome.storage.local;
  const listeners = new Map();
  const sync = {
    async get(keys = null) {
      const all = await local.get(null);
      const values = Object.fromEntries(Object.entries(all)
        .filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
      if (keys === null) return values;
      const defaults = typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
      const names = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(defaults);
      return Object.fromEntries(names.filter(key => key in values || key in defaults)
        .map(key => [key, key in values ? values[key] : defaults[key]]));
    },
    async set(values) { await local.set(Object.fromEntries(Object.entries(values).map(([key, value]) => [prefix + key, value]))); },
    async remove(keys) { await local.remove((Array.isArray(keys) ? keys : [keys]).map(key => prefix + key)); },
    async clear() { await this.remove(Object.keys(await this.get(null))); },
    async getBytesInUse(keys = null) { return new TextEncoder().encode(JSON.stringify(await this.get(keys))).length; },
  };
  const onChanged = {
    addListener(listener) {
      if (listeners.has(listener)) return;
      const wrapped = (changes, area) => {
        if (area !== 'local') { if (area !== 'sync') listener(changes, area); return; }
        const localChanges = {}, syncChanges = {};
        for (const [key, change] of Object.entries(changes)) {
          if (key.startsWith(prefix)) syncChanges[key.slice(prefix.length)] = change;
          else localChanges[key] = change;
        }
        if (Object.keys(localChanges).length) listener(localChanges, 'local');
        if (Object.keys(syncChanges).length) listener(syncChanges, 'sync');
      };
      listeners.set(listener, wrapped);
      chrome.storage.onChanged.addListener(wrapped);
    },
    removeListener(listener) {
      const wrapped = listeners.get(listener);
      if (wrapped) chrome.storage.onChanged.removeListener(wrapped);
      listeners.delete(listener);
    },
    hasListener(listener) { return listeners.has(listener); },
  };
  return { local, session: chrome.storage.session, sync, onChanged };
})();
