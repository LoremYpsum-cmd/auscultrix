/**
 * Chrome i18n helpers — UI follows browser/OS locale by default (en / it),
 * with optional chrome.storage.local.uiLanguage override ('it' | 'en').
 * Product name Auscultrix is never translated (same string in both packs).
 */

/** @type {'it'|'en'|null} */
let uiLanguageOverride = null;

/** @type {{ en: object|null, it: object|null }} */
const catalogs = { en: null, it: null };

let catalogsReady = false;

/**
 * @param {unknown} lang
 * @returns {'it'|'en'|null}
 */
export function normalizeUiLanguage(lang) {
  const lower = String(lang || '').toLowerCase().trim();
  if (lower === 'it' || lower.startsWith('it-') || lower.startsWith('it_')) return 'it';
  if (lower === 'en' || lower.startsWith('en-') || lower.startsWith('en_')) return 'en';
  return null;
}

/**
 * Browser / OS UI language (ignores user override).
 * @returns {'it'|'en'}
 */
export function browserUiLocale() {
  let raw = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
      raw = chrome.i18n.getUILanguage() || '';
    }
  } catch {
    // ignore
  }
  if (!raw && typeof navigator !== 'undefined') {
    raw = navigator.language || navigator.userLanguage || '';
  }
  return normalizeUiLanguage(raw) || 'en';
}

/**
 * Resolve effective UI language (override → browser).
 * @returns {'it'|'en'}
 */
export function uiLocale() {
  if (uiLanguageOverride === 'it' || uiLanguageOverride === 'en') {
    return uiLanguageOverride;
  }
  return browserUiLocale();
}

/**
 * In-memory override only (does not persist). Pass null to clear.
 * @param {'it'|'en'|null|string} lang
 */
export function setUiLanguageOverride(lang) {
  uiLanguageOverride = normalizeUiLanguage(lang);
}

/**
 * Persist and apply UI language override.
 * Ensures locale catalogs are loaded so data-i18n can switch immediately
 * (chrome.i18n.getMessage alone cannot honor a runtime override).
 * @param {'it'|'en'|string} lang
 * @returns {Promise<'it'|'en'>}
 */
export async function persistUiLanguage(lang) {
  const next = normalizeUiLanguage(lang) || browserUiLocale();
  uiLanguageOverride = next;
  await loadLocaleCatalogs();
  try {
    await chrome.storage.local.set({ uiLanguage: next });
  } catch {
    // ignore
  }
  return next;
}

/**
 * Load both locale packs so UI can switch without relying on chrome.i18n alone.
 * Retries if a previous attempt left catalogs empty (fetch/CSP race).
 * @returns {Promise<void>}
 */
export async function loadLocaleCatalogs() {
  if (catalogsReady && catalogs.en && catalogs.it) return;
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
    // Without chrome.runtime we cannot fetch packs — leave catalogsReady false
    // so a later call can retry after the extension context is ready.
    return;
  }
  try {
    const [enRes, itRes] = await Promise.all([
      fetch(chrome.runtime.getURL('_locales/en/messages.json')),
      fetch(chrome.runtime.getURL('_locales/it/messages.json')),
    ]);
    if (enRes.ok) catalogs.en = await enRes.json();
    if (itRes.ok) catalogs.it = await itRes.json();
  } catch {
    // Keep any previously loaded pack; do not mark ready-forever on failure.
  }
  catalogsReady = !!(catalogs.en && catalogs.it);
}

/**
 * Read stored override and load catalogs. Call once before applyDomI18n.
 * @returns {Promise<'it'|'en'>}
 */
export async function initUiLanguage() {
  await loadLocaleCatalogs();
  try {
    const data = await chrome.storage.local.get(['uiLanguage']);
    const stored = normalizeUiLanguage(data.uiLanguage);
    if (stored) uiLanguageOverride = stored;
  } catch {
    // ignore
  }
  return uiLocale();
}

/**
 * Resolve catalog entry message, expanding named placeholders to $1$ / $2$.
 * @param {object|undefined} entry
 * @returns {string}
 */
function entryMessage(entry) {
  if (!entry || typeof entry.message !== 'string') return '';
  let msg = entry.message;
  const placeholders = entry.placeholders;
  if (placeholders && typeof placeholders === 'object') {
    for (const [name, meta] of Object.entries(placeholders)) {
      const content = meta?.content;
      if (typeof content !== 'string') continue;
      msg = msg.replace(new RegExp(`\\$${name}\\$`, 'gi'), content);
    }
  }
  return msg;
}

/**
 * @param {string} template
 * @param {string|string[]|undefined} substitutions
 * @returns {string}
 */
function applySubstitutions(template, substitutions) {
  if (substitutions == null || substitutions === '') return template;
  const list = Array.isArray(substitutions) ? substitutions : [substitutions];
  // Chrome packs use $1, $2… (entryMessage already expanded $NAME$ → $1).
  return template.replace(/\$(\d+)/g, (_, n) => {
    const idx = Number(n) - 1;
    return idx >= 0 && idx < list.length ? String(list[idx]) : '';
  });
}

/**
 * @param {string} key
 * @param {string|string[]|undefined} [substitutions]
 * @returns {string}
 */
export function t(key, substitutions) {
  const lang = uiLocale();
  const pack = catalogs[lang];
  if (pack && pack[key]) {
    const raw = entryMessage(pack[key]);
    if (raw) return applySubstitutions(raw, substitutions);
  }
  const other = catalogs[lang === 'it' ? 'en' : 'it'];
  if (other && other[key]) {
    const raw = entryMessage(other[key]);
    if (raw) return applySubstitutions(raw, substitutions);
  }
  // Only fall back to chrome.i18n when no override is active — otherwise the
  // browser UI language would ignore the user's uiLanguage choice.
  if (!uiLanguageOverride) {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
        const msg = chrome.i18n.getMessage(key, substitutions);
        if (msg) return msg;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

/**
 * Apply data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-aria
 * and set documentElement lang from effective UI locale.
 * @param {ParentNode} [root]
 */
export function applyDomI18n(root = document) {
  const lang = uiLocale();
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const msg = t(key);
    if (!msg) return;
    el.textContent = msg;
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const msg = t(key);
    if (msg) el.setAttribute('placeholder', msg);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    const msg = t(key);
    if (msg) el.setAttribute('title', msg);
  });

  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (!key) return;
    const msg = t(key);
    if (msg) el.setAttribute('aria-label', msg);
  });
}
