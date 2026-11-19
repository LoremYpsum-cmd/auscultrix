import { UNDERGROUND_CORPUS, UNDERGROUND_SOURCE } from './underground-corpus.js';
import { BANDCAMP_YOUTUBE_VIDEO_IDS } from './bandcamp-youtube-ids.js';
import {
  ITALY_BANDCAMP_CORPUS,
  ITALY_BANDCAMP_SOURCE,
} from './italy-bandcamp-corpus.js';
import { ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS } from './italy-bandcamp-youtube-ids.js';
import {
  WORLD_BANDCAMP_CORPUS,
  WORLD_BANDCAMP_SOURCE,
} from './world-bandcamp-corpus.js';
import { WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS } from './world-bandcamp-youtube-ids.js';
import {
  EMERGENTE_STORAGE_KEY,
  loadEmergenteOverrides,
} from './emergente-refresh.js';
import { withBandcampGeo } from './music-geo.js';

export { BANDCAMP_YOUTUBE_VIDEO_IDS, ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS };

/** Bundled underground intersection size (fixed hand corpus). */
export const UNDERGROUND_BANDCAMP_YOUTUBE_COUNT = 77;

/** Bundled Italy Bandcamp ∩ YouTube size (regenerated). */
export const ITALY_BANDCAMP_YOUTUBE_COUNT = ITALY_BANDCAMP_CORPUS.filter(
  (e) => ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS[e.id] || e.youtubeVideoId,
).length;

/** Bundled world Bandcamp ∩ YouTube size (Discover pipeline, verified ids). */
export const WORLD_BANDCAMP_YOUTUBE_COUNT = WORLD_BANDCAMP_CORPUS.filter(
  (e) => WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS[e.id] || e.youtubeVideoId,
).length;

/** Total bundled Emergente size (underground + Italy + world Bandcamp). */
export const BANDCAMP_YOUTUBE_COUNT =
  UNDERGROUND_BANDCAMP_YOUTUBE_COUNT + ITALY_BANDCAMP_YOUTUBE_COUNT + WORLD_BANDCAMP_YOUTUBE_COUNT;

/** @type {{ videoIds: Record<string,string>, bandcampUrls: Record<string,string>, extras: object[], artistGeo?: Record<string, object> }} */
let liveOverrides = { videoIds: {}, bandcampUrls: {}, extras: [], artistGeo: {} };

/** Pull latest on-device refresh into memory (side panel / SW). */
export async function hydrateEmergenteCatalog() {
  const ov = await loadEmergenteOverrides();
  liveOverrides = {
    videoIds: ov.videoIds || {},
    bandcampUrls: ov.bandcampUrls || {},
    extras: Array.isArray(ov.extras) ? ov.extras : [],
    artistGeo: ov.artistGeo && typeof ov.artistGeo === 'object' ? ov.artistGeo : {},
  };
  return liveOverrides;
}

function toTrack(entry, youtubeVideoId, bandcampUrl, source) {
  const base = {
    id: entry.id,
    title: entry.title,
    artist: entry.artist,
    artists: [entry.artist],
    album: null,
    year: entry.year ?? null,
    durationMs: null,
    popularity: null,
    energy: entry.energy ?? 0.45,
    valence: entry.valence ?? 0.5,
    // Only the hand-annotated underground corpus carries real coordinates;
    // Italy/World Bandcamp entries ship a catalogue placeholder (0.45/0.50).
    energySource: entry.energySource || (source === UNDERGROUND_SOURCE ? source : 'unannotated'),
    valenceSource: entry.valenceSource || (source === UNDERGROUND_SOURCE ? source : 'unannotated'),
    genre: (entry.tags || [])[0] || null,
    genres: entry.tags || [],
    source,
    onBandcamp: true,
    onYoutube: !!youtubeVideoId,
    youtubeVideoId: youtubeVideoId || null,
    bandcampUrl: bandcampUrl || entry.bandcampUrl || null,
    geoCountry: entry.geoCountry ?? null,
    geoRegion: entry.geoRegion ?? null,
    geoProvince: entry.geoProvince ?? null,
    geoCity: entry.geoCity ?? null,
    locationRaw: entry.locationRaw ?? null,
    geoSource: entry.geoSource ?? null,
  };
  let track = withBandcampGeo(base);
  // On-device artist geo overrides (from Emergente refresh)
  const live = liveOverrides.artistGeo?.[entry.artist];
  if (live?.geoCountry || live?.geoCity) {
    track = {
      ...track,
      geoCountry: live.geoCountry || track.geoCountry,
      geoRegion: live.geoRegion || track.geoRegion,
      geoProvince: live.geoProvince || track.geoProvince,
      geoCity: live.geoCity || track.geoCity,
      locationRaw: live.locationRaw || track.locationRaw,
      geoSource: live.geoSource || track.geoSource || 'bandcamp_live',
    };
  }
  return track;
}

/**
 * Whole Bandcamp library playable on YouTube: the Bandcamp-leaning
 * independent catalog (Italy-based library + underground) plus discovered
 * extras from on-device refresh. Tracks with a curated YouTube id play it
 * directly; tracks without one play via YouTube search fallback (the player
 * bridge opens the best matching result), and the refresh resolves missing
 * ids over time.
 * @returns {object[]}
 */
export function bandcampYoutubeTracks() {
  const base = UNDERGROUND_CORPUS.map((entry) => {
    const yt =
      liveOverrides.videoIds[entry.id] ||
      BANDCAMP_YOUTUBE_VIDEO_IDS[entry.id] ||
      null;
    const bc = liveOverrides.bandcampUrls[entry.id] || null;
    return toTrack(entry, yt, bc, UNDERGROUND_SOURCE);
  });

  const seen = new Set(base.map((t) => t.id));
  for (const entry of ITALY_BANDCAMP_CORPUS) {    if (!entry?.id || seen.has(entry.id)) continue;
    // No curated YouTube id → still include: playable via YouTube search
    // fallback (bridge opens the best match) and resolved on-device over time.
    const yt =
      liveOverrides.videoIds[entry.id] ||
      ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS[entry.id] ||
      entry.youtubeVideoId ||
      null;
    seen.add(entry.id);
    const bc =
      liveOverrides.bandcampUrls[entry.id] || entry.bandcampUrl || null;
    base.push(toTrack(entry, yt, bc, ITALY_BANDCAMP_SOURCE));
  }

  for (const entry of WORLD_BANDCAMP_CORPUS) {
    if (!entry?.id || seen.has(entry.id)) continue;
    const yt =
      liveOverrides.videoIds[entry.id] ||
      WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS[entry.id] ||
      entry.youtubeVideoId ||
      null;
    seen.add(entry.id);
    const bc =
      liveOverrides.bandcampUrls[entry.id] || entry.bandcampUrl || null;
    base.push(toTrack(entry, yt, bc, WORLD_BANDCAMP_SOURCE));
  }

  for (const ex of liveOverrides.extras) {
    if (!ex?.id || !ex.title || !ex.artist || seen.has(ex.id)) continue;
    // No YouTube id yet → keep anyway (search fallback at play time).
    seen.add(ex.id);
    base.push(
      toTrack(
        {
          id: ex.id,
          title: ex.title,
          artist: ex.artist,
          year: ex.year,
          energy: ex.energy,
          valence: ex.valence,
          tags: ex.tags || ['emergente'],
          geoCountry: ex.geoCountry,
          geoRegion: ex.geoRegion,
          geoProvince: ex.geoProvince,
          geoCity: ex.geoCity,
          locationRaw: ex.locationRaw,
          geoSource: ex.geoSource || 'bandcamp_discovered',
          bandcampUrl: ex.bandcampUrl,
        },
        ex.youtubeVideoId,
        ex.bandcampUrl || null,
        UNDERGROUND_SOURCE,
      ),
    );
  }
  return base;
}

export { EMERGENTE_STORAGE_KEY };
