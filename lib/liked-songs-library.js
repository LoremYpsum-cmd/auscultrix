/**
 * Liked Songs (Varia) library — 9350 curator tracks with verified
 * publication zones (5258 with country, 4092 world-only / geoUnknown).
 *
 * Built by scripts/build_liked_songs_library.py from
 * data/liked-songs-publication-zones.csv.
 */

import { enrichTrackAudioFeatures } from './track-energy.js';
import { isAffectGrounded } from './affect-provenance.js';

const LIKED_PATH = 'data/liked-songs-library.json';

/** Bundle version — bump when regenerating the JSON (sidepanel upgrades storage). */
export const LIKED_SONGS_BUNDLE_VERSION = 1;

/** @type {{ tracks: object[], byId: Map<string, object>, meta: object }|null} */
let cache = null;

/**
 * @returns {Promise<{
 *   tracks: object[],
 *   byId: Map<string, object>,
 *   meta: {
 *     version: number,
 *     trackCount: number,
 *     withCountry: number,
 *     withoutCountry: number,
 *     countryCount?: number,
 *   },
 * }>}
 */
export async function loadLikedSongsLibrary() {
  if (cache) return cache;
  const url = chrome.runtime.getURL(LIKED_PATH);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LIKED_SONGS_HTTP_${res.status}`);
  const raw = await res.json();
  const byId = new Map();
  const tracks = (raw.tracks || []).map((t) => {
    const geoUnknown = Boolean(t.geoUnknown) || !t.geoCountry;
    const track = enrichTrackAudioFeatures({
      genre: null,
      genres: [],
      youtubeVideoId: null,
      ...t,
      geoUnknown,
      geoResolved: Boolean(t.geoCountry) && !geoUnknown,
    });
    if (track.id) byId.set(track.id, track);
    if (track.spotifyId && track.spotifyId !== track.id) {
      byId.set(track.spotifyId, track);
    }
    return track;
  });
  cache = {
    tracks,
    byId,
    meta: {
      version: Number(raw.version) || LIKED_SONGS_BUNDLE_VERSION,
      trackCount: tracks.length,
      withCountry: Number(raw.withCountry) || tracks.filter((t) => t.geoCountry).length,
      withoutCountry:
        Number(raw.withoutCountry) || tracks.filter((t) => !t.geoCountry).length,
      countryCount: Number(raw.countryCount) || 0,
    },
  };
  return cache;
}

/**
 * Copy geo fields from the Liked Songs index onto a live/synced track.
 * @param {object} track
 * @param {Map<string, object>} byId
 */
export function applyLikedSongGeo(track, byId) {
  if (!track || !byId) return track;
  const hit =
    (track.id && byId.get(track.id)) ||
    (track.spotifyId && byId.get(track.spotifyId));
  if (!hit) return track;
  const geoUnknown = hit.geoUnknown === true || !hit.geoCountry;
  return {
    ...track,
    geoCountry: hit.geoCountry ?? null,
    geoRegion: hit.geoRegion ?? null,
    geoProvince: hit.geoProvince ?? null,
    geoCity: hit.geoCity ?? null,
    locationRaw: hit.locationRaw || track.locationRaw || null,
    bandcampUrl: hit.bandcampUrl || track.bandcampUrl || null,
    geoSource: hit.geoSource || track.geoSource || null,
    geoUnknown,
    geoResolved: Boolean(hit.geoCountry) && !geoUnknown,
  };
}

function trackKey(t) {
  return t?.id || t?.spotifyId || '';
}

/**
 * Build the Varia curator pool: full Liked Songs catalog as base,
 * overlaying live sync MIR / artwork when present.
 * @param {object[]} liveTracks
 * @param {{ tracks: object[], byId: Map<string, object> }} liked
 * @returns {object[]}
 */
export function mergeCuratorWithLikedSongs(liveTracks, liked) {
  if (!liked?.tracks?.length) {
    return Array.isArray(liveTracks) ? liveTracks.slice() : [];
  }
  const byId = liked.byId || new Map(liked.tracks.map((t) => [t.id, t]));
  const liveById = new Map();
  for (const t of liveTracks || []) {
    const k = trackKey(t);
    if (k) liveById.set(k, applyLikedSongGeo(t, byId));
  }

  const out = [];
  const seen = new Set();
  for (const seed of liked.tracks) {
    const k = trackKey(seed);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const live = liveById.get(k);
    if (!live) {
      out.push(seed);
      continue;
    }
    out.push({
      ...seed,
      ...live,
      geoCountry: seed.geoCountry,
      geoRegion: seed.geoRegion,
      geoProvince: seed.geoProvince,
      geoCity: seed.geoCity,
      locationRaw: seed.locationRaw,
      geoSource: seed.geoSource,
      geoUnknown: seed.geoUnknown,
      geoResolved: seed.geoResolved,
      source: seed.source || live.source,
      playlists: live.playlists || seed.playlists,
    });
  }

  for (const t of liveTracks || []) {
    const k = trackKey(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(applyLikedSongGeo(t, byId));
  }
  return out;
}

const MIR_FIELDS = ['tempo', 'loudness', 'danceability', 'acousticness', 'energy', 'valence', 'energySource', 'valenceSource', 'durationMs'];

function titleArtistKey(t) {
  return `${String(t?.title || '').toLowerCase().trim()}|${String(t?.artist || '').toLowerCase().trim()}`;
}

/**
 * Re-attach the MIR features measured at build time (data/library-seed.json,
 * 30 s previews) to the curator catalogue, matching by Spotify id and then by
 * title|artist, and append measured seed tracks the catalogue does not have.
 * ≤ 5.0 dropped the seed whenever the Liked Songs bundle loaded, so offline
 * the whole curator catalogue had no measured coordinates at all.
 * Pure function (no I/O): live/synced values already present win.
 * @param {object[]} curatorTracks
 * @param {object[]} seedTracks
 * @returns {{ tracks: object[], attached: number, appended: number }}
 */
export function mergeSeedMirFeatures(curatorTracks, seedTracks) {
  // Seed rows measured on audio previews (labelled mir_preview, or mir_formula
  // once the formula has been re-applied to their measured inputs).
  const seeds = (seedTracks || []).filter((t) => t?.tempo != null && isAffectGrounded(t));
  const byId = new Map();
  const byKey = new Map();
  for (const t of seeds) {
    if (t.spotifyId || t.id) byId.set(t.spotifyId || t.id, t);
    byKey.set(titleArtistKey(t), t);
  }
  const used = new Set();
  let attached = 0;
  const out = (curatorTracks || []).map((t) => {
    const hit = byId.get(t?.spotifyId || t?.id) || byKey.get(titleArtistKey(t));
    if (!hit) return t;
    used.add(hit);
    if (isAffectGrounded(t)) return t;
    attached += 1;
    const patch = {};
    for (const k of MIR_FIELDS) if (hit[k] != null && t[k] == null) patch[k] = hit[k];
    // Measured coordinates replace placeholders/unknowns.
    patch.energy = hit.energy;
    patch.valence = hit.valence;
    patch.energySource = hit.energySource || 'mir_preview';
    patch.valenceSource = hit.valenceSource || 'mir_preview';
    return { ...t, ...patch };
  });
  let appended = 0;
  for (const t of seeds) {
    if (used.has(t)) continue;
    out.push({ ...t, source: t.source || 'curator_seed' });
    appended += 1;
  }
  return { tracks: out, attached, appended };
}
