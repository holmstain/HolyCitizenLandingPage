/* Holy Citizen landing page interactions — no external dependencies. */
(function () {
  'use strict';

  const htmlEl = document.documentElement;
  const langSelect = document.getElementById('lang-select');
  const themeToggle = document.getElementById('theme-toggle');
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  const navList = document.getElementById('nav-list');
  const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
  const LANG_KEY = 'holy-citizen-language';
  const THEME_KEY = 'holy-citizen-theme';
  const OG_LOCALES = {
    tr: 'tr_TR', en: 'en_US', de: 'de_DE', fr: 'fr_FR', hr: 'hr_HR',
    it: 'it_IT', ja: 'ja_JP', ko: 'ko_KR', pl: 'pl_PL', 'pt-BR': 'pt_BR',
    ro: 'ro_RO', ru: 'ru_RU', sl: 'sl_SI'
  };
  const supportedLocales = new Set(Object.keys(OG_LOCALES));

  let currentLang = 'tr';
  const translations = new Map();
  const pendingTranslations = new Map();
  let localeNotice = null;
  let languageRequest = 0;

  function storedValue(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* Storage can be unavailable. */ }
  }

  function loadLocale(lang) {
    if (translations.has(lang)) return Promise.resolve(translations.get(lang));
    if (pendingTranslations.has(lang)) return pendingTranslations.get(lang);
    const request = fetch(`locales/${lang}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`${lang} locale unavailable`);
        return response.json();
      })
      .then((dictionary) => {
        translations.set(lang, dictionary);
        pendingTranslations.delete(lang);
        return dictionary;
      })
      .catch((error) => {
        pendingTranslations.delete(lang);
        throw error;
      });
    pendingTranslations.set(lang, request);
    return request;
  }

  function showLocaleNotice() {
    if (!langSelect) return;
    if (!localeNotice) {
      localeNotice = document.createElement('span');
      localeNotice.className = 'locale-notice';
      localeNotice.setAttribute('role', 'status');
      langSelect.insertAdjacentElement('afterend', localeNotice);
    }
    localeNotice.textContent = currentLang === 'en'
      ? 'Language files are unavailable. Please try again.'
      : 'Dil dosyaları yüklenemedi. Lütfen yeniden deneyin.';
  }

  function updatePageMetadata(dict, lang) {
    document.title = dict['page-title'];
    const targets = [
      ['meta[name="description"]', dict['page-description']],
      ['meta[property="og:title"]', dict['page-title']],
      ['meta[property="og:description"]', dict['page-description']],
      ['meta[name="twitter:title"]', dict['page-title']],
      ['meta[name="twitter:description"]', dict['page-description']],
      ['meta[property="og:locale"]', OG_LOCALES[lang]],
      ['meta[http-equiv="Content-Language"]', lang]
    ];
    targets.forEach(([selector, content]) => {
      document.querySelector(selector)?.setAttribute('content', content);
    });
  }

  function updateControlNames() {
    const dict = translations.get(currentLang) || translations.get('tr') || {};
    if (langSelect) langSelect.setAttribute('aria-label', dict['lang-label'] || 'Dil seçimi');
    if (navToggle) {
      const open = mainNav?.classList.contains('open');
      navToggle.setAttribute('aria-label', dict[open ? 'nav-close-label' : 'nav-open-label'] || (open ? 'Menüyü kapat' : 'Menüyü aç'));
    }
    if (themeToggle) {
      const dark = htmlEl.hasAttribute('data-theme');
      themeToggle.setAttribute('aria-label', dict[dark ? 'theme-light-label' : 'theme-dark-label'] || (dark ? 'Açık temaya geç' : 'Koyu temaya geç'));
    }
    const tablist = document.querySelector('.command-tabs');
    if (tablist) tablist.setAttribute('aria-label', dict['tabs-label'] || 'Bot komutları');
    if (mainNav) mainNav.setAttribute('aria-label', dict['nav-landmark-label'] || 'Ana menü');
  }

  async function setLang(lang) {
    if (!supportedLocales.has(lang)) return;
    const request = ++languageRequest;
    let turkish = {};
    let selected = {};
    try {
      [turkish, selected] = await Promise.all([
        loadLocale('tr'),
        lang === 'tr' ? loadLocale('tr') : loadLocale(lang)
      ]);
    } catch (error) {
      console.error('Locale files could not be loaded:', error);
      if (request !== languageRequest) return;
      if (langSelect) langSelect.value = currentLang;
      showLocaleNotice();
      return;
    }
    if (request !== languageRequest) return;
    if (localeNotice) localeNotice.remove();
    localeNotice = null;
    currentLang = lang;
    htmlEl.lang = lang;
    htmlEl.dir = 'ltr';
    if (langSelect) langSelect.value = lang;
    const dict = { ...turkish, ...selected };
    updatePageMetadata(dict, lang);
    document.querySelectorAll('[data-lang-key]').forEach((element) => {
      const value = dict[element.dataset.langKey];
      if (value === undefined) return;
      if (element.children.length === 0) {
        element.textContent = value;
      } else {
        const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = value;
      }
    });
    updateControlNames();
    remember(LANG_KEY, lang);
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    if (dark) htmlEl.dataset.theme = 'dark';
    else htmlEl.removeAttribute('data-theme');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(dark));
    updateControlNames();
  }

  function openNav() {
    if (!mainNav || !navToggle) return;
    mainNav.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    updateControlNames();
  }

  function closeNav() {
    if (!mainNav || !navToggle) return;
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    updateControlNames();
  }

  function activateTab(tab, moveFocus = false) {
    const panelId = tab.getAttribute('aria-controls');
    tabBtns.forEach((button) => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.classList.toggle('active', active);
    });
    tabPanels.forEach((panel) => {
      const active = panel.id === panelId;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (moveFocus) tab.focus();
  }

  function initTabs() {
    if (!tabBtns.length) return;
    activateTab(tabBtns.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabBtns[0]);
    tabBtns.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabBtns.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabBtns.length) % tabBtns.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabBtns.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        activateTab(tabBtns[nextIndex], true);
      });
    });
  }

  function init() {
    const savedTheme = storedValue(THEME_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (prefersDark ? 'dark' : 'light'));
    themeToggle?.addEventListener('click', () => {
      const next = htmlEl.hasAttribute('data-theme') ? 'light' : 'dark';
      applyTheme(next);
      remember(THEME_KEY, next);
    });

    langSelect?.addEventListener('change', () => { void setLang(langSelect.value); });
    const savedLang = storedValue(LANG_KEY);
    void setLang(supportedLocales.has(savedLang) ? savedLang : 'tr');

    navToggle?.addEventListener('click', () => {
      mainNav?.classList.contains('open') ? closeNav() : openNav();
    });
    navList?.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNav();
    });
    document.addEventListener('click', (event) => {
      if (mainNav?.classList.contains('open') && !mainNav.contains(event.target) && !navToggle?.contains(event.target)) closeNav();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mainNav?.classList.contains('open')) {
        closeNav();
        navToggle.focus();
      }
    });
    window.matchMedia?.('(min-width: 1080px)').addEventListener?.('change', (event) => {
      if (event.matches) closeNav();
    });
    initTabs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
