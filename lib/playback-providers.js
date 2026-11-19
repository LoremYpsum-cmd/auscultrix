/**
 * Playback: YouTube only. Bandcamp is for the track PiP (song page), not the player.
 */

import {
  GEO_DEFAULT,
  GEO_WORLD,
  normalizeMusicGeoZone,
  withGeoSearchHint,
} from './music-geo.js';
import { musicUiLocale } from './music-language.js';

/**
 * @typedef {object} TrackLike
 * @property {string} [artist]
 * @property {string} [title]
 * @property {string} [album]
 * @property {string} [spotifyId]
 * @property {string} [youtubeVideoId]
 * @property {string} [bandcampUrl]
 * @property {boolean} [onBandcamp]
 * @property {string} [source]
 */

/**
 * @typedef {object} PlaybackProvider
 * @property {string} id
 * @property {string} name
 * @property {boolean} [supportsVj]
 * @property {boolean} [consumerWeb]
 * @property {string} [labelKey]
 * @property {(artist: string, title: string, track?: TrackLike) => string} buildUrl
 * @property {string[]} [tabUrlPatterns]
 */

function q(artist, title) {
  return `${artist || ''} ${title || ''}`.trim();
}

function enc(s) {
  return encodeURIComponent(s);
}

/** @type {PlaybackProvider[]} */
export const PLAYBACK_PROVIDERS = [
  {
    id: 'youtube',
    name: 'YouTube',
    labelKey: 'providerYoutubeLabel',
    supportsVj: true,
    consumerWeb: true,
    buildUrl(artist, title, track) {
      const rawId = String(track?.youtubeVideoId || '').trim();
      // Tolerate ids stored with extra params ("id&t=30s", full URLs): keep the
      // 11-char token so the watch URL never breaks (Firefox stalls on those).
      const m = rawId.match(/[A-Za-z0-9_-]{11}/);
      if (m) {
        const u = new URL('https://www.youtube.com/watch');
        u.searchParams.set('v', m[0]);
        // autoplay=1&mute=1: browsers allow muted autoplay without a user
        // gesture; player-bridge then unmutes once playback is stable.
        u.searchParams.set('autoplay', '1');
        u.searchParams.set('mute', '1');
        return u.href;
      }
      return `https://www.youtube.com/results?search_query=${enc(q(artist, title))}`;
    },
    tabUrlPatterns: [
      '*://www.youtube.com/*',
      '*://youtube.com/*',
      '*://m.youtube.com/*',
    ],
  },
];

export const DEFAULT_PROVIDER_ID = 'youtube';

export function getProvider(id) {
  return PLAYBACK_PROVIDERS.find((p) => p.id === id) || PLAYBACK_PROVIDERS[0];
}

/**
 * Whether this track should open the calm Bandcamp track PiP.
 * Emergente / underground (onBandcamp) and tracks with a real bandcampUrl qualify;
 * Varia / Liked Songs without Bandcamp presence must not get a Bandcamp search PiP.
 * @param {TrackLike|null|undefined} track
 */
export function trackHasBandcampPresence(track) {
  if (!track || typeof track !== 'object') return false;
  if (track.onBandcamp === true) return true;
  const url = typeof track.bandcampUrl === 'string' ? track.bandcampUrl.trim() : '';
  if (url && /(?:^https?:\/\/)?(?:[\w-]+\.)?bandcamp\.com\b/i.test(url)) {
    return true;
  }
  const src = String(track.source || '');
  return src === 'underground_corpus' || src === 'italy_bandcamp';
}

/**
 * Bandcamp page for PiP — known URL or search (only for tracks with Bandcamp presence).
 * @param {TrackLike} track
 */
export function bandcampSongPageUrl(track) {
  if (track?.bandcampUrl) return track.bandcampUrl;
  const parts = [track?.artist, track?.title];
  if (track?.album) parts.push(track.album);
  const query = parts.filter(Boolean).join(' ').trim();
  return `https://bandcamp.com/search?q=${enc(query)}`;
}

/**
 * Deep link for display / PiP. Prefer Bandcamp song page when present.
 * @param {string} [_providerId]
 * @param {TrackLike} track
 * @returns {string|null}
 */
export function trackPageUrl(_providerId, track) {
  if (!trackHasBandcampPresence(track)) return null;
  return bandcampSongPageUrl(track);
}

export function listProviders() {
  return PLAYBACK_PROVIDERS.map(({ id, name, supportsVj, consumerWeb }) => ({
    id,
    name,
    supportsVj: consumerWeb !== false && supportsVj !== false,
    consumerWeb: consumerWeb !== false,
    note: null,
  }));
}

export function providerNote() {
  return null;
}

/**
 * @param {string} providerId
 * @param {TrackLike} track
 * @param {{ musicGeoZone?: string, uiLocale?: 'it'|'en' }} [options]
 */
export function buildPlaybackUrl(providerId, track, options = {}) {
  const provider = getProvider(providerId || DEFAULT_PROVIDER_ID);
  const zone = normalizeMusicGeoZone(options.musicGeoZone ?? GEO_DEFAULT);
  const locale = options.uiLocale || musicUiLocale();
  const artist = track?.artist || '';
  const title = track?.title || '';
  const usesDirect = !!track?.youtubeVideoId;

  let finalTitle = title;
  let searchTrack = track;
  if (!usesDirect && zone !== GEO_WORLD) {
    const baseQuery = q(artist, title);
    const hinted = withGeoSearchHint(baseQuery, {
      musicGeoZone: zone,
      uiLocale: locale,
    });
    if (hinted !== baseQuery) {
      const suffix = hinted.slice(baseQuery.length).trim();
      if (suffix) {
        finalTitle = `${title} ${suffix}`.trim();
        searchTrack = { ...track, title: finalTitle };
      }
    }
  }

  return {
    provider,
    url: provider.buildUrl(artist, finalTitle, searchTrack),
  };
}
