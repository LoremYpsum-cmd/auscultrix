/**
 * Care-media open URLs — official / affordable legal access, not metadata-only DBs.
 *
 * Priority (free-first, always legal):
 *  - Films/docs with Wikiflix Q → free legal player (Toolforge)
 *  - Else, when the chosen player maps to a free video path (YouTube) → YouTube search
 *  - Else in free-only mode → YouTube search as legal free discovery
 *  - Else → JustWatch (free/cheap legal by region)
 *  - Books → Open Library (borrow / free editions)
 *  - Podcasts → Spotify / YouTube / Apple Podcasts from playbackProviderId
 *
 * Privacy: public search / deep links only; no Auscultrix server.
 */

import {
  CARE_ACCESS_FREE,
  CARE_ACCESS_PAID_OK,
  normalizeCareAccessMode,
} from './care-access.js';

/**
 * @typedef {object} CareOpenOptions
 * @property {'it'|'en'|string} [uiLocale]
 * @property {'free'|'paid_ok'|string} [careAccessMode]
 * @property {string} [playbackProviderId]
 */

/**
 * Normalize legacy (uiLocale, careAccessMode) or options-object call shapes.
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 * @returns {{ uiLocale: string, careAccessMode: 'free'|'paid_ok', playbackProviderId: string }}
 */
export function normalizeCareOpenOptions(
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  if (uiLocaleOrOpts && typeof uiLocaleOrOpts === 'object') {
    const o = /** @type {CareOpenOptions} */ (uiLocaleOrOpts);
    return {
      uiLocale: o.uiLocale || 'en',
      careAccessMode: normalizeCareAccessMode(o.careAccessMode ?? CARE_ACCESS_FREE),
      playbackProviderId: String(o.playbackProviderId || ''),
    };
  }
  return {
    uiLocale: String(uiLocaleOrOpts || 'en'),
    careAccessMode: normalizeCareAccessMode(careAccessMode),
    playbackProviderId: String(playbackProviderId || ''),
  };
}

/** @param {'it'|'en'|string} [uiLocale] */
export function justWatchRegion(uiLocale) {
  return uiLocale === 'it' ? 'it' : 'us';
}

/**
 * JustWatch title search — legal free/cheap streaming by region.
 * @param {string} title
 * @param {'it'|'en'|string} [uiLocale]
 */
export function justWatchSearchUrl(title, uiLocale = 'en') {
  const region = justWatchRegion(uiLocale);
  const path = region === 'it' ? 'cerca' : 'search';
  const q = encodeURIComponent(String(title || '').trim());
  return `https://www.justwatch.com/${region}/${path}?q=${q}`;
}

/**
 * YouTube web search — free legal discovery / playback path.
 * @param {string} query
 */
export function youtubeSearchUrl(query) {
  const q = encodeURIComponent(String(query || '').trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

/**
 * YouTube Music search (music-adjacent free path).
 * @param {string} query
 */
export function youtubeMusicSearchUrl(query) {
  const q = encodeURIComponent(String(query || '').trim());
  return `https://music.youtube.com/search?q=${q}`;
}

/**
 * Wikiflix entry deep link (Wikidata numeric Q without prefix).
 * @param {string|number} q
 */
export function wikiflixEntryUrl(q) {
  const id = String(q || '')
    .trim()
    .replace(/^Q/i, '');
  return `https://wikiflix.toolforge.org/#/entry/${id}`;
}

/**
 * Wikiflix title search (hash SPA).
 * @param {string} title
 */
export function wikiflixSearchUrl(title) {
  const q = encodeURIComponent(String(title || '').trim());
  return `https://wikiflix.toolforge.org/#/search/${q}`;
}

/**
 * Open Library search — borrow / free editions.
 * @param {{ title?: string, author?: string }} book
 */
export function openLibrarySearchUrl(book) {
  const q = encodeURIComponent(
    `${book?.title || ''} ${book?.author || ''}`.trim() || String(book?.title || ''),
  );
  return `https://openlibrary.org/search?q=${q}`;
}

/**
 * Spotify show search — official podcast player (free tier available).
 * @param {{ title?: string, creator?: string, searchQuery?: string }} pod
 */
export function spotifyPodcastSearchUrl(pod) {
  const raw =
    pod?.searchQuery ||
    `${pod?.title || ''} ${pod?.creator || ''}`.trim() ||
    String(pod?.title || '');
  return `https://open.spotify.com/search/${encodeURIComponent(raw)}/shows`;
}

/**
 * Apple Podcasts search (locale-aware).
 * @param {{ title?: string, creator?: string, searchQuery?: string }} pod
 * @param {'it'|'en'|string} [uiLocale]
 */
export function applePodcastsSearchUrl(pod, uiLocale = 'en') {
  const region = justWatchRegion(uiLocale);
  const raw =
    pod?.searchQuery ||
    `${pod?.title || ''} ${pod?.creator || ''}`.trim() ||
    String(pod?.title || '');
  return `https://podcasts.apple.com/${region}/search?term=${encodeURIComponent(raw)}`;
}

/**
 * Videogame store search — itch.io for free games, Steam for paid ones.
 * Search pages only (no invented store ids); qualified with creator.
 * @param {{ title?: string, creator?: string, access?: string }} game
 */
export function gameStoreUrl(game) {
  const q = encodeURIComponent(
    `${game?.title || ''} ${game?.creator || ''}`.trim() || String(game?.title || ''),
  );
  if (game?.access === 'free') return `https://itch.io/search?q=${q}`;
  return `https://store.steampowered.com/search/?term=${q}`;
}

/** @param {string} providerId */
function isYoutubeFamily(providerId) {
  const id = String(providerId || '').toLowerCase();
  return id === 'youtube' || id === 'youtube_music';
}

/** @param {string} providerId */
function isSpotifyFamily(providerId) {
  return String(providerId || '').toLowerCase() === 'spotify';
}

/** @param {string} providerId */
function isAppleFamily(providerId) {
  const id = String(providerId || '').toLowerCase();
  return id === 'apple_music' || id === 'itunes';
}

/**
 * Podcast query string shared across providers.
 * @param {{ title?: string, creator?: string, searchQuery?: string }} pod
 */
function podcastQuery(pod) {
  return (
    pod?.searchQuery ||
    `${pod?.title || ''} ${pod?.creator || ''}`.trim() ||
    String(pod?.title || '')
  );
}

/**
 * Qualified search query: title + director/creator + year.
 * Title-only searches miss on common titles ("Soul", "Her", "It");
 * the qualifier disambiguates without any API key.
 * Accepts a catalog item or a bare title string (legacy callers).
 * @param {object|string} itemOrTitle
 */
export function videoQuery(itemOrTitle) {
  if (typeof itemOrTitle === 'string' || !itemOrTitle) {
    return String(itemOrTitle || '').trim();
  }
  const q = [
    itemOrTitle.title || '',
    itemOrTitle.director || itemOrTitle.creator || '',
    itemOrTitle.year || '',
  ]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(' ');
  return q || String(itemOrTitle.title || '').trim();
}

/**
 * Free-first video destination when Wikiflix is unavailable.
 * YouTube (chosen or free-only fallback) before JustWatch / subscription discovery.
 * @param {object|string} itemOrTitle catalog item (qualified query) or bare title
 * @param {{ uiLocale: string, careAccessMode: 'free'|'paid_ok', playbackProviderId: string }} opts
 */
function videoOpenWithoutWikiflix(itemOrTitle, opts) {
  const q = videoQuery(itemOrTitle);
  if (isYoutubeFamily(opts.playbackProviderId)) {
    return youtubeSearchUrl(q);
  }
  // Free-only: prefer YouTube legal free search over JustWatch (often paid shelves).
  if (opts.careAccessMode === CARE_ACCESS_FREE) {
    return youtubeSearchUrl(q);
  }
  return justWatchSearchUrl(q, opts.uiLocale);
}

/**
 * Primary open URL for a film: Wikiflix when curated free, else platform / free-first.
 * @param {{ title?: string, wikiflixQ?: string|number }} film
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 */
export function filmOpenUrl(
  film,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  const opts = normalizeCareOpenOptions(
    uiLocaleOrOpts,
    careAccessMode,
    playbackProviderId,
  );
  if (film?.wikiflixQ) return wikiflixEntryUrl(film.wikiflixQ);
  return videoOpenWithoutWikiflix(film || '', opts);
}

/**
 * Primary open URL for a TV series.
 * Curated TMDB id + paid_ok → exact TMDB deep link (no search guessing).
 * Otherwise a qualified search (title + year) on the free-first destination.
 * @param {{ title?: string, year?: string|number, tmdbId?: number }} series
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 */
export function seriesOpenUrl(
  series,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  const opts = normalizeCareOpenOptions(
    uiLocaleOrOpts,
    careAccessMode,
    playbackProviderId,
  );
  if (series?.tmdbId && opts.careAccessMode === CARE_ACCESS_PAID_OK) {
    return `https://www.themoviedb.org/tv/${series.tmdbId}`;
  }
  return videoOpenWithoutWikiflix(series || '', opts);
}

/**
 * Documentaries: Wikiflix when curated, else platform / free-first.
 * @param {{ title?: string, wikiflixQ?: string|number }} doc
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 */
export function docOpenUrl(
  doc,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  const opts = normalizeCareOpenOptions(
    uiLocaleOrOpts,
    careAccessMode,
    playbackProviderId,
  );
  if (doc?.wikiflixQ) return wikiflixEntryUrl(doc.wikiflixQ);
  return videoOpenWithoutWikiflix(doc || '', opts);
}

/**
 * Podcast open URL driven by the user's playback platform (free tiers preferred).
 * @param {{ title?: string, creator?: string, searchQuery?: string }} pod
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 */
export function podcastOpenUrl(
  pod,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  const opts = normalizeCareOpenOptions(
    uiLocaleOrOpts,
    careAccessMode,
    playbackProviderId,
  );
  const q = podcastQuery(pod);
  if (isYoutubeFamily(opts.playbackProviderId)) {
    return youtubeSearchUrl(q);
  }
  if (isAppleFamily(opts.playbackProviderId)) {
    return applePodcastsSearchUrl(pod, opts.uiLocale);
  }
  // Spotify (chosen) or default free-tier show search.
  if (isSpotifyFamily(opts.playbackProviderId) || !opts.playbackProviderId) {
    return spotifyPodcastSearchUrl(pod);
  }
  // Other music players: free-only → YouTube; paid_ok → Spotify free tier.
  if (opts.careAccessMode === CARE_ACCESS_FREE) {
    return youtubeSearchUrl(q);
  }
  return spotifyPodcastSearchUrl(pod);
}

/**
 * @param {{ kind?: string, title?: string, wikiflixQ?: string|number, creator?: string, searchQuery?: string }} item
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 */
export function otherMediaOpenUrl(
  item,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  if (item?.kind === 'podcast') {
    return podcastOpenUrl(item, uiLocaleOrOpts, careAccessMode, playbackProviderId);
  }
  return docOpenUrl(item, uiLocaleOrOpts, careAccessMode, playbackProviderId);
}

/**
 * Human-readable destination label for UI (short, not didactic).
 * @param {'book'|'film'|'series'|'podcast'|'documentary'|string} kind
 * @param {CareOpenOptions|string} [uiLocaleOrOpts]
 * @param {'free'|'paid_ok'|string} [careAccessMode]
 * @param {string} [playbackProviderId]
 * @returns {string}
 */
export function careDestinationHint(
  kind,
  uiLocaleOrOpts = 'en',
  careAccessMode = CARE_ACCESS_FREE,
  playbackProviderId = '',
) {
  const opts = normalizeCareOpenOptions(
    uiLocaleOrOpts,
    careAccessMode,
    playbackProviderId,
  );
  if (kind === 'book') return 'Open Library';
  if (kind === 'podcast') {
    if (isYoutubeFamily(opts.playbackProviderId)) return 'YouTube';
    if (isAppleFamily(opts.playbackProviderId)) return 'Apple Podcasts';
    if (
      isSpotifyFamily(opts.playbackProviderId) ||
      opts.careAccessMode === CARE_ACCESS_PAID_OK
    ) {
      return 'Spotify';
    }
    return opts.playbackProviderId ? 'YouTube' : 'Spotify';
  }
  // film / series / documentary
  if (isYoutubeFamily(opts.playbackProviderId)) return 'YouTube / Wikiflix';
  if (opts.careAccessMode === CARE_ACCESS_FREE) return 'Wikiflix / YouTube';
  return 'Wikiflix / JustWatch';
}

/** Optional metadata fallbacks (catalogs — not primary open targets). */
export function goodreadsMetaUrl(book) {
  const q = encodeURIComponent(`${book?.title || ''} ${book?.author || ''}`.trim());
  return `https://www.goodreads.com/search?q=${q}`;
}

export function tmdbMovieMetaUrl(film) {
  if (film?.tmdbId) return `https://www.themoviedb.org/movie/${film.tmdbId}`;
  return `https://www.themoviedb.org/search?query=${encodeURIComponent(videoQuery(film))}`;
}

export function tmdbTvMetaUrl(series) {
  if (series?.tmdbId) return `https://www.themoviedb.org/tv/${series.tmdbId}`;
  return `https://www.themoviedb.org/search?query=${encodeURIComponent(videoQuery(series))}`;
}
