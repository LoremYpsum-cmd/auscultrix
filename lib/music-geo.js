/**
 * Music publication zones — where a track “comes from”, not UI language.
 *
 * Hierarchy (broad → narrow): world → country → region → province → city.
 * If a narrower menu level is empty, selection climbs to the selected parent.
 * Default / top option: «parti da qui: dal mondo» (no geo filter).
 *
 * When a place is selected, playlist generation applies a **hard filter**:
 * only tracks that match that level (city / province / region / country).
 * Empty match pools stay empty (no world-music fill-in).
 *
 * Zone list is derived from:
 *  - Bandcamp artist locations in the Emergente catalog (`bandcamp-geo-data.js`)
 *  - Liked Songs with a verified country (`liked-songs-geo-zones.js`, 5258 tracks)
 *  - country-level Italy for the Italian corpus
 *
 * Tracks without a verified country (Liked Songs geoUnknown) appear only under
 * «dal mondo» — never under a country / region / province / city filter.
 */

import {
  GEO_ZONES_FROM_CATALOG,
  BANDCAMP_TRACK_GEO,
  BANDCAMP_ARTIST_GEO,
  BANDCAMP_GEO_META,
} from './bandcamp-geo-data.js';
import {
  GEO_ZONES_FROM_LIKED_SONGS,
  LIKED_SONGS_GEO_META,
} from './liked-songs-geo-zones.js';
import {
  WORLD_GEO_ZONES,
  WORLD_TRACK_GEO,
  WORLD_ARTIST_GEO,
} from './world-bandcamp-geo-data.js';

export const GEO_WORLD = 'world';
export const GEO_STORAGE_KEY = 'musicGeoZone';
export const GEO_DEFAULT = GEO_WORLD;

/** @deprecated Soft bias retired — kept for callers; filter is hard. */
export const GEO_MATCH_THRESHOLD = 1;

export {
  BANDCAMP_TRACK_GEO,
  BANDCAMP_ARTIST_GEO,
  BANDCAMP_GEO_META,
  LIKED_SONGS_GEO_META,
};

/** Extra zones required by non-Bandcamp corpora packaged in the extension. */
const EXTRA_CORPUS_ZONES = [
  {
    id: 'country:it',
    country: 'it',
    labelIt: 'Italia',
    labelEn: 'Italy',
    aliases: ['italy', 'italian', 'italiano', 'italiana', 'it'],
  },
];

/**
 * Publication zones: world + Bandcamp + Liked Songs locations (+ corpus extras).
 * @type {Array<{ id: string, country?: string, region?: string, province?: string, city?: string, labelIt: string, labelEn: string, aliases?: string[] }>}
 */
export const GEO_ZONES = (() => {
  const byId = new Map();
  for (const z of GEO_ZONES_FROM_CATALOG) {
    if (z?.id) byId.set(z.id, z);
  }
  for (const z of GEO_ZONES_FROM_LIKED_SONGS) {
    if (z?.id && !byId.has(z.id)) byId.set(z.id, z);
  }
  for (const z of WORLD_GEO_ZONES) {
    if (z?.id && !byId.has(z.id)) byId.set(z.id, z);
  }
  for (const z of EXTRA_CORPUS_ZONES) {
    if (!byId.has(z.id)) byId.set(z.id, z);
  }
  if (!byId.has(GEO_WORLD)) {
    byId.set(GEO_WORLD, {
      id: GEO_WORLD,
      labelIt: 'Parti da qui: dal mondo',
      labelEn: 'Start here: from the world',
    });
  }
  return [...byId.values()];
})();

/**
 * @param {unknown} id
 * @returns {string}
 */
export function normalizeMusicGeoZone(id) {
  const raw = String(id || '').trim();
  if (!raw || raw === GEO_WORLD || raw === 'mondo' || raw === 'international') {
    return GEO_WORLD;
  }
  if (GEO_ZONES.some((z) => z.id === raw)) return raw;
  // Legacy curated Italy city ids → nearest country still in the list
  if (raw.startsWith('city:it-') || raw.startsWith('province:it-') || raw.startsWith('region:it-')) {
    return GEO_ZONES.some((z) => z.id === 'country:it') ? 'country:it' : GEO_WORLD;
  }
  if (raw.startsWith('country:') && GEO_ZONES.some((z) => z.id === raw)) return raw;
  return GEO_WORLD;
}

/**
 * Sorted options for UI: world first, then alpha by display label.
 * Kept for callers that need a flat list; the sidepanel uses cascading menus.
 * @param {'it'|'en'} locale
 */
export function listGeoZonesForUi(locale = 'it') {
  const world = GEO_ZONES.find((z) => z.id === GEO_WORLD);
  const rest = GEO_ZONES.filter((z) => z.id !== GEO_WORLD)
    .slice()
    .sort((a, b) => {
      const la = locale === 'en' ? a.labelEn : a.labelIt;
      const lb = locale === 'en' ? b.labelEn : b.labelIt;
      return la.localeCompare(lb, locale === 'en' ? 'en' : 'it', { sensitivity: 'base' });
    });
  return world ? [world, ...rest] : rest;
}

function localeCompareLabel(a, b, locale) {
  const la = locale === 'en' ? a.labelEn : a.labelIt;
  const lb = locale === 'en' ? b.labelEn : b.labelIt;
  return la.localeCompare(lb, locale === 'en' ? 'en' : 'it', { sensitivity: 'base' });
}

function titleCaseSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function leafLabel(zone, locale) {
  const full = locale === 'en' ? zone.labelEn : zone.labelIt;
  const parts = String(full || '')
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || full || zone.id;
}

/**
 * Cascade selection derived from a stored zone id.
 * @param {string} zoneId
 * @returns {{ country: string, region: string, province: string, city: string }}
 */
export function cascadeFromZoneId(zoneId) {
  const z = getGeoZone(zoneId);
  if (!z || z.id === GEO_WORLD) {
    return { country: '', region: '', province: '', city: '' };
  }
  return {
    country: z.country || '',
    region: z.region || '',
    province: z.province || '',
    city: z.city || '',
  };
}

/**
 * Resolve the most specific catalog zone for a cascade selection.
 * Empty country ⇒ world. Deeper empty fields climb to the selected parent.
 * @param {{ country?: string, region?: string, province?: string, city?: string }} sel
 */
export function zoneIdFromCascade(sel = {}) {
  const country = String(sel.country || '').trim();
  if (!country) return GEO_WORLD;
  const region = String(sel.region || '').trim();
  const province = String(sel.province || '').trim();
  const city = String(sel.city || '').trim();

  if (city) {
    const exact = `city:${country}-${city}`;
    if (GEO_ZONES.some((z) => z.id === exact)) return exact;
    const hit = GEO_ZONES.find(
      (z) =>
        z.id.startsWith('city:') &&
        z.country === country &&
        z.city === city &&
        (!region || !z.region || z.region === region) &&
        (!province || !z.province || z.province === province),
    );
    if (hit) return hit.id;
  }

  if (province) {
    const exact = `province:${country}-${province}`;
    if (GEO_ZONES.some((z) => z.id === exact)) return exact;
    const hit = GEO_ZONES.find(
      (z) =>
        z.id.startsWith('province:') &&
        z.country === country &&
        z.province === province &&
        (!region || !z.region || z.region === region),
    );
    if (hit) return hit.id;
    // No dedicated province zone: climb to region/country (Bandcamp often
    // duplicates city as province).
  }

  if (region) {
    const exact = `region:${country}-${region}`;
    if (GEO_ZONES.some((z) => z.id === exact)) return exact;
  }

  const countryId = `country:${country}`;
  return GEO_ZONES.some((z) => z.id === countryId) ? countryId : GEO_WORLD;
}

/**
 * Countries present in the catalog (for cascade level 1).
 * @param {'it'|'en'} locale
 * @returns {Array<{ id: string, value: string, labelIt: string, labelEn: string }>}
 */
export function listGeoCountriesForUi(locale = 'it') {
  return GEO_ZONES.filter((z) => z.id.startsWith('country:') && z.country)
    .map((z) => ({
      id: z.id,
      value: z.country,
      labelIt: z.labelIt,
      labelEn: z.labelEn,
    }))
    .sort((a, b) => localeCompareLabel(a, b, locale));
}

/**
 * Regions under a country (cascade level 2).
 * @param {string} country
 * @param {'it'|'en'} locale
 */
export function listGeoRegionsForUi(country, locale = 'it') {
  const cc = String(country || '').trim();
  if (!cc) return [];
  return GEO_ZONES.filter((z) => z.id.startsWith('region:') && z.country === cc && z.region)
    .map((z) => ({
      id: z.id,
      value: z.region,
      labelIt: leafLabel(z, 'it'),
      labelEn: leafLabel(z, 'en'),
    }))
    .sort((a, b) => localeCompareLabel(a, b, locale));
}

/**
 * Provinces under country (+ optional region). Only distinct province scopes
 * (dedicated province zones, or province ≠ city) so the menu does not twin cities.
 * @param {string} country
 * @param {string} [region]
 * @param {'it'|'en'} locale
 */
export function listGeoProvincesForUi(country, region = '', locale = 'it') {
  const cc = String(country || '').trim();
  if (!cc) return [];
  const rr = String(region || '').trim();
  /** @type {Map<string, { id: string, value: string, labelIt: string, labelEn: string }>} */
  const byProv = new Map();

  for (const z of GEO_ZONES) {
    if (z.country !== cc || !z.province) continue;
    if (rr && z.region && z.region !== rr) continue;
    if (rr && !z.region) continue;

    const isProvinceZone = z.id.startsWith('province:');
    const distinctFromCity = Boolean(z.city && z.province !== z.city);
    const provinceOnly = isProvinceZone || (!z.city && z.province);
    if (!isProvinceZone && !distinctFromCity && !provinceOnly) continue;

    if (!byProv.has(z.province)) {
      byProv.set(z.province, {
        id: isProvinceZone ? z.id : `province:${cc}-${z.province}`,
        value: z.province,
        labelIt: isProvinceZone ? leafLabel(z, 'it') : titleCaseSlug(z.province),
        labelEn: isProvinceZone ? leafLabel(z, 'en') : titleCaseSlug(z.province),
      });
    }
  }

  return [...byProv.values()].sort((a, b) => localeCompareLabel(a, b, locale));
}

/**
 * Cities under country (+ optional region/province).
 * @param {string} country
 * @param {string} [region]
 * @param {string} [province]
 * @param {'it'|'en'} locale
 */
export function listGeoCitiesForUi(country, region = '', province = '', locale = 'it') {
  const cc = String(country || '').trim();
  if (!cc) return [];
  const rr = String(region || '').trim();
  const pp = String(province || '').trim();
  return GEO_ZONES.filter((z) => {
    if (!z.id.startsWith('city:') || z.country !== cc || !z.city) return false;
    if (rr && z.region && z.region !== rr) return false;
    if (rr && !z.region) return false;
    if (pp && z.province && z.province !== pp) return false;
    if (pp && !z.province) return false;
    return true;
  })
    .map((z) => ({
      id: z.id,
      value: z.city,
      labelIt: leafLabel(z, 'it'),
      labelEn: leafLabel(z, 'en'),
    }))
    .sort((a, b) => localeCompareLabel(a, b, locale));
}

export function getGeoZone(id) {
  const nid = normalizeMusicGeoZone(id);
  return GEO_ZONES.find((z) => z.id === nid) || GEO_ZONES[0];
}

/**
 * Levels present on the selected zone (for climb-up matching).
 * @param {string} zoneId
 * @returns {{ country?: string, region?: string, province?: string, city?: string } | null}
 */
export function selectedGeoLevels(zoneId) {
  const z = getGeoZone(zoneId);
  if (!z || z.id === GEO_WORLD) return null;
  return {
    country: z.country,
    region: z.region,
    province: z.province,
    city: z.city,
  };
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/**
 * Attach Bandcamp-derived geo onto a track object (non-destructive copy fields).
 * @param {object} track
 */
export function withBandcampGeo(track) {
  if (!track || typeof track !== 'object') return track;
  const fromId = track.id ? BANDCAMP_TRACK_GEO[track.id] || WORLD_TRACK_GEO[track.id] : null;
  const fromArtist =
    !fromId && track.artist ? BANDCAMP_ARTIST_GEO[track.artist] || WORLD_ARTIST_GEO[track.artist] : null;
  const g = fromId || fromArtist;
  if (!g) return track;
  return {
    ...track,
    geoCountry: track.geoCountry || g.geoCountry || null,
    geoRegion: track.geoRegion || g.geoRegion || null,
    geoProvince: track.geoProvince || g.geoProvince || null,
    geoCity: track.geoCity || g.geoCity || null,
    locationRaw: track.locationRaw || g.locationRaw || null,
    bandcampUrl: track.bandcampUrl || g.bandcampUrl || null,
    geoSource: track.geoSource || g.geoSource || 'bandcamp_artist_location',
  };
}

function trackBlob(track) {
  const genres = Array.isArray(track?.genres)
    ? track.genres.join(' ')
    : String(track?.genre || '');
  return norm(
    [
      track?.geoCountry,
      track?.geoRegion,
      track?.geoProvince,
      track?.geoCity,
      track?.locationRaw,
      track?.country,
      track?.market,
      track?.isrc,
      track?.artist,
      track?.album,
      track?.title,
      genres,
      track?.recordLabel,
      track?.label,
      ...(track?.geoAliases || []),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Resolve track geography. Explicit catalog fields win; heuristics are last resort.
 * Tracks marked geoUnknown / geoResolved=false never get a place (world-only).
 * @param {object} track
 */
export function inferTrackGeo(track) {
  if (track?.geoUnknown === true || track?.geoResolved === false) {
    return { country: '', region: '', province: '', city: '' };
  }
  const enriched = withBandcampGeo(track);
  if (enriched?.geoCountry || enriched?.geoCity) {
    return {
      country: norm(enriched.geoCountry),
      region: norm(enriched.geoRegion),
      province: norm(enriched.geoProvince),
      city: norm(enriched.geoCity),
    };
  }
  // Soft heuristic fallback only when Bandcamp/catalog geo is missing
  const blob = trackBlob(enriched);
  const isrc = String(enriched?.isrc || '').toUpperCase();
  let country = '';
  if (isrc.length >= 2) {
    const cc = isrc.slice(0, 2);
    const map = { IT: 'it', US: 'us', GB: 'gb', FR: 'fr', DE: 'de', JP: 'jp', CA: 'ca', SE: 'se' };
    country = map[cc] || '';
  }
  if (!country) {
    if (/\b(italy|italia|italiano|italiana)\b/.test(blob)) country = 'it';
    else if (/\b(usa|america|american)\b/.test(blob)) country = 'us';
    else if (/\b(uk|britain|british|england|scotland)\b/.test(blob)) country = 'gb';
    else if (/\b(france|french|français)\b/.test(blob)) country = 'fr';
    else if (/\b(germany|deutsch|german|berlin)\b/.test(blob)) country = 'de';
    else if (/\b(japan|japanese)\b/.test(blob)) country = 'jp';
    else if (/\b(canada|canadian|montreal|toronto)\b/.test(blob)) country = 'ca';
  }
  return { country, region: '', province: '', city: '' };
}

/**
 * True when track belongs under the selected region via catalog membership
 * (covers tracks that only expose city/province but sit in that region).
 * @param {{ country?: string, region?: string, province?: string, city?: string }} g
 * @param {{ country?: string, region?: string }} levels
 */
function trackUnderRegion(g, levels) {
  if (!levels?.region || !levels?.country) return false;
  if (g.region && g.region === levels.region) return true;
  if (g.country && g.country !== levels.country) return false;
  return GEO_ZONES.some(
    (z) =>
      z.country === levels.country &&
      z.region === levels.region &&
      ((g.city && z.city === g.city) ||
        (g.province && z.province === g.province)),
  );
}

/**
 * True when track belongs under the selected province (any city in it).
 * @param {{ country?: string, region?: string, province?: string, city?: string }} g
 * @param {{ country?: string, region?: string, province?: string }} levels
 */
function trackUnderProvince(g, levels) {
  if (!levels?.province) return false;
  if (g.province && g.province === levels.province) return true;
  // Bandcamp often stores the city slug as province when they coincide
  if (g.city && g.city === levels.province) return true;
  if (!g.city) return false;
  return GEO_ZONES.some(
    (z) =>
      z.city === g.city &&
      z.province === levels.province &&
      (!levels.country || !z.country || z.country === levels.country) &&
      (!levels.region || !z.region || z.region === levels.region),
  );
}

/**
 * Strict place match at the selected cascade level (no soft climb / affinity).
 * City → only that city; province → that province (any city under it);
 * region → that region; country → that country; world → always.
 * @param {object} track
 * @param {string} zoneId
 */
export function matchesGeoZone(track, zoneId) {
  const nid = normalizeMusicGeoZone(zoneId);
  if (nid === GEO_WORLD) return true;
  const levels = selectedGeoLevels(nid);
  if (!levels) return true;
  const g = inferTrackGeo(track);
  // Hard place filter: no verified country → world-only (never in a place menu).
  if (!g.country) return false;

  if (levels.city) {
    if (!g.city || g.city !== levels.city) return false;
    if (levels.country && g.country !== levels.country) return false;
    return true;
  }
  if (levels.province) {
    if (!trackUnderProvince(g, levels)) return false;
    if (levels.country && g.country !== levels.country) return false;
    return true;
  }
  if (levels.region) {
    return trackUnderRegion(g, levels);
  }
  if (levels.country) {
    return g.country === levels.country;
  }
  return true;
}

/**
 * Hard filter: keep only tracks from the selected place (world → unchanged).
 * @param {object[]} tracks
 * @param {string} zoneId
 */
export function filterTracksByGeoZone(tracks, zoneId) {
  const list = Array.isArray(tracks) ? tracks : [];
  const nid = normalizeMusicGeoZone(zoneId);
  if (nid === GEO_WORLD) return list;
  return list.filter((t) => matchesGeoZone(t, nid));
}

/** Language code → default origin country for care-media catalogues. */
const CARE_LANG_TO_COUNTRY = {
  it: 'it',
  en: 'us',
  ja: 'jp',
  fr: 'fr',
  de: 'de',
  ko: 'kr',
  es: 'es',
  pt: 'pt',
  nl: 'nl',
  sv: 'se',
  da: 'dk',
  no: 'no',
  pl: 'pl',
  zh: 'cn',
};

/**
 * Infer publication / origin geo for a care-media catalogue item
 * (book, film, series, doc, podcast). Explicit `geoCountry` wins;
 * otherwise language → country. Items without country stay world-only.
 * @param {object} item
 * @returns {{ country: string, region: string, province: string, city: string }}
 */
export function inferCareItemGeo(item) {
  const country = norm(
    item?.geoCountry ||
      item?.country ||
      CARE_LANG_TO_COUNTRY[
        String(item?.language || item?.lang || '')
          .trim()
          .toLowerCase()
          .slice(0, 2)
      ] ||
      '',
  );
  return {
    country,
    region: norm(item?.geoRegion || item?.region || ''),
    province: norm(item?.geoProvince || item?.province || ''),
    city: norm(item?.geoCity || item?.city || ''),
  };
}

/**
 * Hard place match for care media. World → always. No country on the item →
 * world-only (never under a place menu). Country of the selected cascade must
 * match. When the item has region/province/city, those levels are enforced;
 * country-only items match any sub-zone of that country (catalogues are coarse).
 * @param {object} item
 * @param {string} zoneId
 */
export function matchesCareGeoZone(item, zoneId) {
  const nid = normalizeMusicGeoZone(zoneId);
  if (nid === GEO_WORLD) return true;
  const levels = selectedGeoLevels(nid);
  if (!levels) return true;
  const g = inferCareItemGeo(item);
  if (!g.country) return false;
  if (levels.country && g.country !== levels.country) return false;

  if (levels.city) {
    if (g.city) return g.city === levels.city;
    // Country-only care item: match any city under its country.
    return true;
  }
  if (levels.province) {
    if (g.province) return g.province === levels.province;
    if (g.city && g.city === levels.province) return true;
    return !g.city && !g.province;
  }
  if (levels.region) {
    if (g.region) return g.region === levels.region;
    return !g.region && !g.province && !g.city;
  }
  return true;
}

/**
 * Hard filter for care-media catalogues (world → unchanged).
 * @param {object[]} items
 * @param {string} zoneId
 */
export function filterCareItemsByGeoZone(items, zoneId) {
  const list = Array.isArray(items) ? items : [];
  const nid = normalizeMusicGeoZone(zoneId);
  if (nid === GEO_WORLD) return list;
  return list.filter((it) => matchesCareGeoZone(it, nid));
}

/**
 * Calm status line for empty care-media locality pools.
 * @param {string} zoneId
 * @param {'it'|'en'} [locale]
 * @param {{ medium?: string }} [opts]
 */
export function careGeoStatusLine(zoneId, locale = 'it', opts = {}) {
  const z = getGeoZone(zoneId);
  if (z.id === GEO_WORLD) return '';
  const label = locale === 'en' ? z.labelEn : z.labelIt;
  const medium = String(opts.medium || '').trim();
  if (locale === 'en') {
    return medium
      ? `No ${medium} from ${label} in this catalogue.`
      : `No care media from ${label} in this catalogue.`;
  }
  return medium
    ? `Niente da ${label} in questo catalogo (${medium}).`
    : `Nessun media di cura da ${label} in questo catalogo.`;
}

/**
 * Affinity ∈ {0, 0.5, 1}: strict match (1), world neutral (0.5), else 0.
 * Kept for diagnostics / sort stability; playlist no longer soft-mixes this.
 * @param {object} track
 * @param {string} zoneId
 */
export function musicGeoAffinity(track, zoneId) {
  if (normalizeMusicGeoZone(zoneId) === GEO_WORLD) return 0.5;
  return matchesGeoZone(track, zoneId) ? 1 : 0;
}

/** @deprecated Use matchesGeoZone — same hard semantics. */
export function isLikelyGeoMatch(track, zoneId) {
  return matchesGeoZone(track, zoneId);
}

/**
 * @deprecated Soft geo bias retired; pool is filtered first. Returns moodScore unchanged.
 * @param {number} moodScore
 * @param {object} _track
 * @param {string} _zoneId
 */
export function applyMusicGeoBias(moodScore, _track, _zoneId) {
  return moodScore;
}

/**
 * Search hint for YouTube when a zone is selected (publication place cue).
 * @param {string} query
 * @param {{ musicGeoZone?: string, uiLocale?: string }} options
 */
export function withGeoSearchHint(query, options = {}) {
  const zoneId = normalizeMusicGeoZone(options.musicGeoZone);
  if (zoneId === GEO_WORLD) return query;
  const z = getGeoZone(zoneId);
  const locale = options.uiLocale === 'en' ? 'en' : 'it';
  const place = locale === 'en' ? z.labelEn : z.labelIt;
  const short =
    z.city || z.province || z.region || z.country || place.split('·').pop()?.trim() || '';
  if (!short) return query;
  const q = String(query || '').trim();
  if (norm(q).includes(norm(short))) return q;
  return `${q} ${short}`.trim();
}

/**
 * Status line under the cascade menus.
 * @param {string} zoneId
 * @param {'it'|'en'} [locale]
 * @param {{ matchCount?: number|null }} [opts] — when 0, explain empty pool
 */
export function musicGeoStatusLine(zoneId, locale = 'it', opts = {}) {
  const z = getGeoZone(zoneId);
  if (z.id === GEO_WORLD) return '';
  const label = locale === 'en' ? z.labelEn : z.labelIt;
  if (opts.matchCount === 0) {
    return locale === 'en'
      ? `No tracks from ${label} in this catalog.`
      : `Nessun brano da ${label} in questo catalogo.`;
  }
  return locale === 'en'
    ? `Only music from: ${label}`
    : `Solo musica da: ${label}`;
}

/**
 * Migrate legacy musicLanguageMode → geo zone id.
 * @param {unknown} legacyMode
 * @param {'it'|'en'} [uiLocale]
 */
export function migrateLanguageModeToGeo(legacyMode, uiLocale = 'it') {
  const m = String(legacyMode || '').trim().toLowerCase();
  if (!m || m === 'international' || m === GEO_WORLD || m === 'mondo') {
    return GEO_WORLD;
  }
  if (m === 'native') {
    return uiLocale === 'en' ? 'country:us' : 'country:it';
  }
  return normalizeMusicGeoZone(m);
}

/**
 * Parse a Bandcamp location string (e.g. "Montreal, Québec") into geo fields.
 * Used by on-device Emergente refresh when discovering new artists.
 * @param {string|null|undefined} raw
 */
export function parseBandcampLocation(raw) {
  const empty = { geoCountry: null, geoRegion: null, geoProvince: null, geoCity: null, locationRaw: raw || null };
  if (!raw || !String(raw).trim()) return empty;
  const parts = String(raw)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return empty;

  const COUNTRY = {
    'united states': 'us',
    usa: 'us',
    'united kingdom': 'gb',
    uk: 'gb',
    england: 'gb',
    scotland: 'gb',
    wales: 'gb',
    canada: 'ca',
    france: 'fr',
    germany: 'de',
    italy: 'it',
    italia: 'it',
    japan: 'jp',
    sweden: 'se',
    belgium: 'be',
    poland: 'pl',
    iceland: 'is',
    'new zealand': 'nz',
    niger: 'ne',
    mali: 'ml',
    guatemala: 'gt',
    chile: 'cl',
  };
  const US_STATES = {
    california: 'california',
    'new york': 'new-york',
    texas: 'texas',
    oregon: 'oregon',
    illinois: 'illinois',
    michigan: 'michigan',
    maryland: 'maryland',
    massachusetts: 'massachusetts',
    minnesota: 'minnesota',
    connecticut: 'connecticut',
    missouri: 'missouri',
  };
  const CA_PROV = { quebec: 'quebec', québec: 'quebec', ontario: 'ontario' };
  const slug = (s) =>
    norm(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  if (parts.length === 1) {
    const tok = norm(parts[0]);
    if (COUNTRY[tok]) {
      return { ...empty, geoCountry: COUNTRY[tok], locationRaw: raw };
    }
    const known = {
      'new york': ['us', 'new-york', 'new-york'],
      london: ['gb', 'england', 'london'],
      berlin: ['de', 'berlin', 'berlin'],
    };
    if (known[tok]) {
      const [c, r, ci] = known[tok];
      return {
        geoCountry: c,
        geoRegion: r,
        geoProvince: ci,
        geoCity: ci,
        locationRaw: raw,
      };
    }
    return { ...empty, geoCity: slug(parts[0]), locationRaw: raw };
  }

  const last = norm(parts[parts.length - 1]);
  let country = COUNTRY[last] || null;
  let region = null;
  let rest = parts.slice(0, -1);
  if (!country && US_STATES[last]) {
    country = 'us';
    region = US_STATES[last];
  } else if (!country && CA_PROV[last]) {
    country = 'ca';
    region = CA_PROV[last];
  }
  const cityTok = rest[0] || parts[0];
  for (const tok of rest.slice(1)) {
    const nk = norm(tok);
    if (US_STATES[nk]) region = region || US_STATES[nk];
    else if (CA_PROV[nk]) region = region || CA_PROV[nk];
    else if (!region) region = slug(tok);
  }
  // "England, UK" / "Scotland, UK"
  if (country === 'gb' && /^(england|scotland|wales)$/.test(norm(cityTok))) {
    return {
      geoCountry: 'gb',
      geoRegion: slug(cityTok),
      geoProvince: null,
      geoCity: null,
      locationRaw: raw,
    };
  }
  const city = slug(cityTok);
  return {
    geoCountry: country,
    geoRegion: region,
    geoProvince: city && country ? city : null,
    geoCity: city || null,
    locationRaw: raw,
  };
}
