const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const script = readFileSync(path.join(root, 'js/main.js'), 'utf8');
const dictionaries = Object.fromEntries(['tr', 'en'].map((lang) => [
  lang, JSON.parse(readFileSync(path.join(root, `locales/${lang}.json`), 'utf8'))
]));

function element(attributes = {}) {
  const attrs = { ...attributes };
  const handlers = {};
  const classes = new Set();
  return {
    children: [], childNodes: [], dataset: {}, value: '', removed: false,
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name)
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return attrs[name] ?? null; },
    hasAttribute(name) { return Object.hasOwn(attrs, name); },
    removeAttribute(name) { delete attrs[name]; },
    addEventListener(name, handler) { handlers[name] = handler; },
    dispatch(name, event = {}) { handlers[name]?.(event); },
    insertAdjacentElement(_position, child) { this.inserted = child; },
    remove() { this.removed = true; },
    contains() { return false; },
    focus() { this.focused = true; }
  };
}

function launch(fetchImpl) {
  const html = element();
  const langSelect = element();
  const nav = element();
  const navToggle = element();
  const themeToggle = element();
  const navList = element();
  const tablist = element();
  const heading = element();
  heading.dataset.langKey = 'hero-title-part1';
  const meta = new Map();
  const ids = new Map([
    ['lang-select', langSelect], ['main-nav', nav], ['nav-toggle', navToggle],
    ['theme-toggle', themeToggle], ['nav-list', navList]
  ]);
  const document = {
    documentElement: html, readyState: 'complete', title: '',
    getElementById: (id) => ids.get(id) || null,
    querySelectorAll: (selector) => selector === '[data-lang-key]' ? [heading] : [],
    querySelector: (selector) => {
      if (selector === '.command-tabs') return tablist;
      if (!meta.has(selector)) meta.set(selector, element());
      return meta.get(selector);
    },
    createElement: () => element(),
    addEventListener() {}
  };
  const storage = new Map();
  vm.runInNewContext(script, {
    document, window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    fetch: fetchImpl, console: { error() {} }, Node: { TEXT_NODE: 3 }
  });
  return { document, html, langSelect, heading, meta, storage };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const okFetch = (url) => Promise.resolve({ ok: true, json: () => dictionaries[url.includes('/en.') ? 'en' : 'tr'] });

test('switching to English updates copy, document metadata, and saved choice', async () => {
  const page = launch(okFetch);
  await flush();
  page.langSelect.value = 'en';
  page.langSelect.dispatch('change');
  await flush();
  assert.equal(page.html.lang, 'en');
  assert.equal(page.heading.textContent, dictionaries.en['hero-title-part1']);
  assert.equal(page.document.title, dictionaries.en['page-title']);
  assert.equal(page.meta.get('meta[name="description"]').getAttribute('content'), dictionaries.en['page-description']);
  assert.equal(page.meta.get('meta[property="og:locale"]').getAttribute('content'), 'en_US');
  assert.equal(page.storage.get('holy-citizen-language'), 'en');
});

test('failed locale load keeps current language and a later choice retries', async () => {
  let fail = true;
  const page = launch((url) => fail ? Promise.reject(new Error('offline')) : okFetch(url));
  await flush();
  page.langSelect.value = 'en';
  page.langSelect.dispatch('change');
  await flush();
  assert.equal(page.html.lang, undefined);
  assert.equal(page.langSelect.value, 'tr');
  assert.equal(page.langSelect.inserted.getAttribute('role'), 'status');
  fail = false;
  page.langSelect.value = 'en';
  page.langSelect.dispatch('change');
  await flush();
  assert.equal(page.html.lang, 'en');
  assert.equal(page.langSelect.inserted.removed, true);
});
