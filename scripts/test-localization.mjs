import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const cyrillic = /[А-Яа-яЁё]/;
const stored = {};
const storage = {
  async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, stored[key]])); },
  async set(values) { Object.assign(stored, values); },
};
const ctx = vm.createContext({ console, URL, setTimeout, clearTimeout, navigator: { language: 'ru-RU', languages: ['ru-RU'] }, chrome: { storage: { sync: storage } } });
vm.runInContext(read('shared.js') + '\nglobalThis.RS = RStartpage;', ctx, { filename: 'shared.js' });
const RS = ctx.RS;
assert.equal((await RS.loadSettings()).language, 'en', 'clean install ignores Russian browser locale');
await RS.saveSettings({ language: 'ru' });
assert.equal((await RS.loadSettings()).language, 'ru', 'explicit Russian choice survives');
await RS.saveSettings({ language: 'de' });
assert.equal((await RS.loadSettings()).language, 'en', 'unsupported languages use English');
delete stored.rstartpageSettingsV1;
stored.nativeStartpageSettings = { language: 'ru' };
vm.runInContext(read('proxy-shared.js') + '\nglobalThis.proxyStore = ProxyStore;', ctx);
assert.equal(await ctx.proxyStore.getLanguage(), 'ru', 'background honors legacy explicit language');
assert.equal((await RS.loadSettings()).language, 'ru');
await RS.saveSettings({ language: 'en' });
assert.equal(await ctx.proxyStore.getLanguage(), 'en', 'current settings override legacy language');
RS.setLanguage('en');
for (const [, key] of read('shared.js').matchAll(/'([^']+)'\s*:/g)) {
  if (!/^[a-zA-Z][\w.]+$/.test(key) || key === 'language.ru') continue; // The language selector uses native language names.
  assert.equal(cyrillic.test(RS.t(key)), false, `English translation: ${key}`);
}
for (const name of fs.readdirSync(new URL('..', import.meta.url)).filter(name => name.endsWith('.html'))) {
  const source = read(name).replaceAll('Русский', 'Russian');
  assert.equal(cyrillic.test(source), false, `${name}: initial shell is English`);
  assert.match(source, /<html lang="en"/, `${name}: initial document language`);
}

// Exercise Notes translations and rendered copy, including closed dialogs and
// dynamic group/tag controls, with English user data in a minimal DOM adapter.
const nodes = new Map();
function element() {
  return { textContent: '', value: '', dataset: {}, style: {}, attributes: {}, children: [], hidden: false,
    classList: { toggle() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    querySelector(selector) { this.nodes ||= new Map(); if (!this.nodes.has(selector)) this.nodes.set(selector, element()); return this.nodes.get(selector); },
    querySelectorAll() { return []; },
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); },
    showModal() {}, focus() {}, close() {},
  };
}
const labelNodes = [...read('notes.html').matchAll(/data-note-i18n="([^"]+)"/g)].map(([, key]) => ({ ...element(), dataset: { noteI18n: key } }));
const document = {
  documentElement: element(),
  querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); },
  querySelectorAll(selector) { return selector === '[data-note-i18n]' ? labelNodes : []; },
  createElement: element,
};
let confirmation;
const note = { id: 'note', title: '', content: 'Example', tags: ['work'], groupId: 'work', updatedAt: 1, createdAt: 1 };
const noteCtx = vm.createContext({ console, document, window: { addEventListener() {} }, setTimeout: fn => fn(),
  RStartpage: { pageTitle: value => value, escapeHtml: value => String(value), confirmAction: async value => { confirmation = value; return false; } },
  RNotes: {
    listNotes: async () => [note], listGroups: async () => [{ id: 'inbox', name: 'Inbox' }, { id: 'work', name: 'Work' }],
    getSyncUsage: async () => ({ used: 0, limit: 71680, percent: 0, count: 0 }),
    setSync: async () => { throw { code: 'SYNC_QUOTA' }; },
    saveNote: async () => { throw { code: 'SYNC_QUOTA' }; },
  },
});
vm.runInContext(read('notes.js') + '\nglobalThis.dictionary = TXT;', noteCtx);
assert.deepEqual(Object.keys(noteCtx.dictionary.en).sort(), Object.keys(noteCtx.dictionary.ru).sort(), 'Notes locale key parity');
assert.equal(cyrillic.test(Object.values(noteCtx.dictionary.en).join(' ')), false);
vm.runInContext('cache(); translate();', noteCtx);
await vm.runInContext('refresh()', noteCtx);
await vm.runInContext('render()', noteCtx);
assert.match(nodes.get('#notesList').children[0].innerHTML, /Untitled/);
assert.equal(cyrillic.test(nodes.get('#notesList').children[0].innerHTML), false);
await vm.runInContext("deleteGroup('work')", noteCtx);
assert.equal(confirmation.title, 'Delete group?');
await vm.runInContext("deleteTag('work')", noteCtx);
assert.equal(confirmation.message, 'The tag #work will be removed from all notes.');
vm.runInContext("openTag('work')", noteCtx);
assert.equal(nodes.get('#tagDialogTitle').textContent, 'Edit tag');
nodes.get('#tagName').value = '';
await vm.runInContext('saveTag({preventDefault(){}})', noteCtx);
assert.equal(nodes.get('#tagError').textContent, 'Enter a tag name.');
nodes.get('#noteTitle').value = 'Test';
nodes.get('#noteContent').value = 'Example';
await vm.runInContext('save({preventDefault(){}})', noteCtx);
assert.equal(nodes.get('#noteError').textContent, 'The 70 KB sync limit has been exceeded.');
await nodes.get('#notesList').children[0].querySelector('[data-sync]').onchange({ target: { checked: true } });
assert.equal(nodes.get('#notesNotice').textContent, 'The 70 KB sync limit has been exceeded.');
for (const [selector, node] of nodes) {
  assert.equal(cyrillic.test([node.textContent, node.innerHTML, node.placeholder, ...Object.values(node.attributes)].join(' ')), false, selector);
}
for (const label of labelNodes) assert.equal(label.textContent, noteCtx.dictionary.en[label.dataset.noteI18n]);
vm.runInContext("language = 'ru'; translate()", noteCtx);
assert.equal(nodes.get('#newGroupButton').textContent, 'Группа');
vm.runInContext("language = 'en'; translate()", noteCtx);
assert.equal(nodes.get('#newGroupButton').textContent, 'Group');

// Test the complete worker with asynchronous, callback-based Chrome 121 menu
// APIs. Concurrent lifecycle/settings events must leave exactly two current items.
function event() { return { listeners: [], addListener(fn) { this.listeners.push(fn); }, async fire(...args) { await Promise.all(this.listeners.map(fn => fn(...args))); } }; }
const menus = new Map();
const errors = [];
let currentLanguage = 'en';
let failCreate = false;
const runtime = { onInstalled: event(), onStartup: event(), onMessage: event(), getURL: path => path };
const changed = event();
const chrome = {
  runtime,
  storage: { onChanged: changed },
  action: { setBadgeText: async () => {}, setIcon: async () => {}, setTitle: async () => {} },
  contextMenus: {
    onClicked: event(),
    removeAll(callback) { setImmediate(() => { menus.clear(); callback(); }); },
    create(item, callback) { setImmediate(() => {
      if (failCreate || menus.has(item.id)) runtime.lastError = { message: 'Menu creation failed' };
      else menus.set(item.id, item);
      callback(); delete runtime.lastError;
    }); return item.id; },
  },
  webRequest: { onAuthRequired: event(), onCompleted: event() },
  proxy: { onProxyError: event() }, commands: { onCommand: event() },
};
const bg = vm.createContext({ console: { error: (...args) => errors.push(args) }, chrome, setTimeout, clearTimeout,
  importScripts() {},
  ProxyStore: { getLanguage: async () => currentLanguage, getProductName: async () => 'RStartpage',
    getState: async () => ({}), getStatus: async () => ({ state: {} }), t: () => 'Proxy is off',
  },
  OffscreenCanvas: class { getContext() { return new Proxy({}, { get: () => () => ({}) }); } },
});
vm.runInContext(read('background.js'), bg);
const settled = () => vm.runInContext('noteMenuUpdate', bg);
await settled();
assert.deepEqual([...menus.values()].map(m => m.title), ['Create note from selection', 'Create note from page']);
currentLanguage = 'ru';
await changed.fire({ rstartpageSettingsV1: { newValue: { language: 'ru' } } }, 'sync');
assert.equal(menus.get('rstartpage-note-page').title, 'Создать заметку из страницы');
currentLanguage = 'en';
await Promise.all([runtime.onInstalled.fire(), runtime.onStartup.fire(), changed.fire({ rstartpageSettingsV1: { newValue: { language: 'en' } } }, 'sync')]);
await settled();
assert.equal(menus.size, 2);
assert.equal(menus.get('rstartpage-note-page').title, 'Create note from page');
assert.equal(errors.length, 0, 'no duplicate-menu or worker errors');
failCreate = true;
await runtime.onStartup.fire();
assert.equal(errors.length, 1, 'menu creation errors are handled');
failCreate = false;
await runtime.onStartup.fire();
assert.equal(menus.size, 2, 'next rebuild recovers from an API failure');
console.log('Localization: English defaults, legacy settings, Notes dialogs/errors, and context-menu lifecycle tests passed');
