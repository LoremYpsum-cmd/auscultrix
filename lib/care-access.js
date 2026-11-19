/**
 * Care-media access preference — free-only vs paid-OK.
 * Persisted as chrome.storage.local.careAccessMode.
 * Default: free (safer / more economical).
 */

export const CARE_ACCESS_FREE = 'free';
export const CARE_ACCESS_PAID_OK = 'paid_ok';
export const CARE_ACCESS_DEFAULT = CARE_ACCESS_FREE;

/** Soft boost so free/legal options still rise when paid is allowed. */
export const FREE_ACCESS_SOFT_WEIGHT = 0.18;
/** Strong filter-first / boost when the user chose free-only. */
export const FREE_ACCESS_STRICT_WEIGHT = 0.55;

/**
 * @param {unknown} mode
 * @returns {'free'|'paid_ok'}
 */
export function normalizeCareAccessMode(mode) {
  const m = String(mode || '')
    .trim()
    .toLowerCase();
  if (m === CARE_ACCESS_PAID_OK || m === 'paid' || m === 'commercial') {
    return CARE_ACCESS_PAID_OK;
  }
  return CARE_ACCESS_FREE;
}

/**
 * Whether a catalogue item has a known free/legal primary path
 * (Wikiflix, Open Library books, podcast free tiers).
 * @param {object} item
 * @returns {boolean}
 */
export function itemIsFreeAccess(item) {
  if (!item) return false;
  if (item.wikiflixQ) return true;
  if (item.access === 'free') return true;
  if (item.kind === 'podcast') return true;
  // Books: author + no TMDB id
  if (item.author && !item.tmdbId && item.kind !== 'documentary') return true;
  return false;
}
