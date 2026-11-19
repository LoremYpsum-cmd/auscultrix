/**
 * Bandcamp playlist from Bandcamp ∩ YouTube catalog only (no personal taste).
 * Hard-filtered by publication zone (music-geo), not UI language.
 */

import { generatePlaylist } from './playlist.js';
import {
  filterTracksByGeoZone,
  GEO_DEFAULT,
  GEO_WORLD,
  normalizeMusicGeoZone,
} from './music-geo.js';
import { musicUiLocale } from './music-language.js';
import {
  bandcampYoutubeTracks,
} from './bandcamp-youtube-corpus.js';

function listenerAgeFrom(mood, options = {}) {
  if (options.listenerAgeInfo) return options.listenerAgeInfo;
  if (mood?.kidsMode || options.kidsMode) {
    return {
      age: mood?.listenerAge ?? options.listenerAge ?? null,
      ageBand: mood?.ageBand || options.ageBand || '4-7',
      kidsMode: true,
      signal: mood?.listenerAgeSignal || '',
    };
  }
  return null;
}

const DEFAULT_SIZE = 40;

/**
 * Mood playlist from the Bandcamp∩YouTube intersection only.
 * When a place is selected, only tracks from that place are considered;
 * an empty match pool yields an empty playlist (no world fill-in).
 * @returns {{ tracks: object[], scored: object[], truncated: boolean, candidateCount: number, geoMatchCount: number, geoFiltered: boolean }}
 */
export function generateBandcampPlaylist(_libraryIgnored, mood, options = {}) {
  const size = options.size ?? DEFAULT_SIZE;
  const recent = options.recentlyRecommendedTrackIds ?? [];
  const sessionSeed = options.sessionSeed ?? Date.now();
  const musicGeoZone = normalizeMusicGeoZone(
    options.musicGeoZone ?? GEO_DEFAULT,
  );
  const locale = options.uiLocale || musicUiLocale();
  const ageInfo = listenerAgeFrom(mood, options);
  const geoFiltered = musicGeoZone !== GEO_WORLD;

  const fullPool = bandcampYoutubeTracks();
  if (!fullPool.length && !ageInfo?.kidsMode) {
    return {
      tracks: [],
      scored: [],
      truncated: false,
      candidateCount: 0,
      geoMatchCount: 0,
      geoFiltered,
      kidsMode: false,
    };
  }

  // Same ISO engine as «Varia»: calibrated tracks (hand-annotated underground
  // corpus) build the mood-matched arc; uncalibrated Bandcamp discoveries may
  // appear only after the target is reached, labelled as such. ≤ 5.0 ranked by
  // a mid-path score and shuffled tiers — no ISO trajectory at all.
  const result = generatePlaylist(fullPool, mood, {
    ...options,
    size,
    recentlyRecommendedTrackIds: recent,
    sessionSeed,
    musicGeoZone,
    uiLocale: locale,
    listenerAgeInfo: ageInfo || undefined,
  });
  const geoMatchCount = result.geoMatchCount ?? filterTracksByGeoZone(fullPool, musicGeoZone).length;
  return {
    ...result,
    truncated: (result.tracks?.length || 0) < size,
    candidateCount: geoFiltered ? geoMatchCount : fullPool.length,
    geoMatchCount,
    geoFiltered,
  };
}
