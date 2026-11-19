/**
 * Options — calm, localized information page in the diary style.
 * Developer notes only behind #developer (never linked in UI).
 */
import { applyDomI18n, initUiLanguage, t, uiLocale } from './lib/i18n.js';

(async function initOptions() {
  try {
    await initUiLanguage();
    applyDomI18n();
    document.documentElement.lang = uiLocale();
    const v = document.getElementById('options-version');
    if (v) v.textContent = t('optionsVersion', [chrome.runtime.getManifest().version]);
  } catch {
    // static Italian text stays
  }
  const panel = document.getElementById('developer-panel');
  if (location.hash === '#developer' && panel) {
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
  }
})();
