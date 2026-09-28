'use strict';

// Opera does not support the ordinary newtab manifest override. Redirect only
// its known start-page URLs; never replace arbitrary pages or about:blank tabs.
(() => {
  const startPages = new Set(['opera://startpage/', 'opera://startpageshared/', 'opera://newtab/', 'chrome://newtab/']);
  const pending = new Set();
  const isStartPage = value => {
    try { const url = new URL(value); return startPages.has(`${url.protocol}//${url.host}${url.pathname || '/'}`); }
    catch (_) { return false; }
  };
  async function redirect(tab) {
    if (!tab || tab.incognito || !Number.isInteger(tab.id) || pending.has(tab.id)
      || !isStartPage(tab.pendingUrl || tab.url)) return;
    pending.add(tab.id);
    try {
      const current = await chrome.tabs.get(tab.id);
      if (!current.incognito && isStartPage(current.pendingUrl || current.url)) {
        await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('newtab.html') });
      }
    } catch (_) { /* Closed tab or browser-restricted start page: toolbar Home remains available. */ }
    finally { pending.delete(tab.id); }
  }
  chrome.tabs.onCreated.addListener(redirect);
  chrome.tabs.onUpdated.addListener((id, change, tab) => {
    if (change.url || change.status === 'loading') redirect({ ...tab, id });
  });
})();
