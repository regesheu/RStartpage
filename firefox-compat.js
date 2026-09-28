'use strict';

// Firefox's browser namespace provides the Promise API used by shared code.
// contextMenus.create/removeAll deliberately retain their callback contract.
if (globalThis.browser?.runtime?.getBrowserInfo) {
  const nativeChrome = globalThis.chrome;
  globalThis.chrome = { ...globalThis.browser, contextMenus: nativeChrome.contextMenus };
}
