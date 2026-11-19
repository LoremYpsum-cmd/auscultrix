/**
 * Music catalog mode — Varia/Varied (personal library; storage id `known`) vs Emergente (Bandcamp∩YouTube).
 * Playback is always YouTube; Bandcamp is the PiP destination only when the track is on Bandcamp.
 */

export const MUSIC_CATALOG_KNOWN = 'known';
export const MUSIC_CATALOG_EMERGING = 'emerging';
export const MUSIC_CATALOG_DEFAULT = MUSIC_CATALOG_EMERGING;
export const MUSIC_CATALOG_KEY = 'musicCatalogMode';

/**
 * @param {unknown} mode
 * @returns {'known'|'emerging'}
 */
export function normalizeMusicCatalogMode(mode) {
  const m = String(mode || '')
    .trim()
    .toLowerCase();
  if (m === MUSIC_CATALOG_KNOWN || m === 'conosciuta' || m === 'familiar' || m === 'varia' || m === 'varied') {
    return MUSIC_CATALOG_KNOWN;
  }
  return MUSIC_CATALOG_EMERGING;
}
