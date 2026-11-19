/**
 * Emergente catalog refresh — Bandcamp ∩ YouTube, on-device, no Auscultrix server.
 *
 * Strategy (throttled):
 * 1. Verify known YouTube ids via oEmbed; drop dead ones.
 * 2. Resolve missing ids with a light YouTube search HTML parse.
 * 3. Peek a few artist Bandcamp /music pages for new track slugs; add extras
 *    when a YouTube match is also found.
 *
 * Results live in chrome.storage.local and merge over the bundled corpus.
 */

import { UNDERGROUND_CORPUS } from './underground-corpus.js';
import { BANDCAMP_YOUTUBE_VIDEO_IDS } from './bandcamp-youtube-ids.js';
import { ITALY_BANDCAMP_CORPUS } from './italy-bandcamp-corpus.js';
import { ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS } from './italy-bandcamp-youtube-ids.js';
import { WORLD_BANDCAMP_CORPUS } from './world-bandcamp-corpus.js';
import { WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS } from './world-bandcamp-youtube-ids.js';
import { parseBandcampLocation } from './music-geo.js';

/** Bundled Emergente entries (underground + Italy + world Bandcamp). */
const EMERGENTE_CORPUS = [...UNDERGROUND_CORPUS, ...ITALY_BANDCAMP_CORPUS, ...WORLD_BANDCAMP_CORPUS];
const EMERGENTE_VIDEO_IDS = {
  ...BANDCAMP_YOUTUBE_VIDEO_IDS,
  ...ITALY_BANDCAMP_YOUTUBE_VIDEO_IDS,
  ...WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS,
};

export const EMERGENTE_STORAGE_KEY = 'emergenteCatalogOverridesV1';
export const EMERGENTE_ALARM = 'emergente-catalog-refresh';
/** Daily soft refresh. */
export const EMERGENTE_PERIOD_MINUTES = 24 * 60;
/** Max artists to probe per run (Bandcamp). */
const ARTISTS_PER_RUN = 6;
/** Max YouTube resolve attempts per run. */
const YT_RESOLVE_PER_RUN = 10;
/** Cap on-device discovered extras (grows Italy coverage over time). */
const EXTRAS_CAP = 400;

/**
 * @typedef {object} EmergenteOverrides
 * @property {string} refreshedAt
 * @property {Record<string, string>} videoIds
 * @property {Record<string, string>} bandcampUrls
 * @property {Record<string, {geoCountry?:string|null,geoRegion?:string|null,geoProvince?:string|null,geoCity?:string|null,locationRaw?:string|null,geoSource?:string,bandcampUrl?:string}>} [artistGeo]
 * @property {Array<object>} extras
 * @property {number} [cursor]
 */

/** @returns {Promise<EmergenteOverrides>} */
export async function loadEmergenteOverrides() {
  try {
    const data = await chrome.storage.local.get([EMERGENTE_STORAGE_KEY]);
    const raw = data[EMERGENTE_STORAGE_KEY];
    if (!raw || typeof raw !== 'object') {
      return emptyOverrides();
    }
    return {
      refreshedAt: String(raw.refreshedAt || ''),
      videoIds: raw.videoIds && typeof raw.videoIds === 'object' ? raw.videoIds : {},
      bandcampUrls:
        raw.bandcampUrls && typeof raw.bandcampUrls === 'object' ? raw.bandcampUrls : {},
      artistGeo:
        raw.artistGeo && typeof raw.artistGeo === 'object' ? raw.artistGeo : {},
      extras: Array.isArray(raw.extras) ? raw.extras : [],
      cursor: Number.isFinite(raw.cursor) ? raw.cursor : 0,
    };
  } catch {
    return emptyOverrides();
  }
}

function emptyOverrides() {
  return {
    refreshedAt: '',
    videoIds: {},
    bandcampUrls: {},
    artistGeo: {},
    extras: [],
    cursor: 0,
  };
}

/** @param {EmergenteOverrides} ov */
export async function saveEmergenteOverrides(ov) {
  await chrome.storage.local.set({ [EMERGENTE_STORAGE_KEY]: ov });
}

function enc(s) {
  return encodeURIComponent(String(s || '').trim());
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return normalize(s)
    .split(' ')
    .filter((w) => w.length > 1);
}

function overlap(queryTokens, text) {
  if (!queryTokens.length) return 0;
  const hay = ` ${normalize(text)} `;
  let hit = 0;
  for (const tok of queryTokens) {
    if (hay.includes(` ${tok} `) || hay.includes(tok)) hit += 1;
  }
  return hit / queryTokens.length;
}

function matchTitleArtist(artist, title, candidate) {
  return (
    overlap(tokens(title), candidate) >= 0.45 &&
    overlap(tokens(artist), candidate) >= 0.35
  );
}

function artistSubdomains(artist) {
  const a = String(artist || '')
    .toLowerCase()
    .trim();
  const compact = a.replace(/[^a-z0-9]/g, '');
  const dashed = a.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [...new Set([compact, dashed, `${compact}music`, `${dashed}music`].filter((s) => s.length >= 2))];
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'text/html,application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** @param {string} videoId */
export async function youtubeIdAlive(videoId) {
  if (!videoId) return false;
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${enc(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Best-effort YouTube video id from public search HTML.
 * @param {string} artist
 * @param {string} title
 */
export async function resolveYoutubeVideoId(artist, title) {
  const q = `${artist} ${title}`.trim();
  if (!q) return null;
  try {
    const html = await fetchText(
      `https://www.youtube.com/results?search_query=${enc(q)}`,
    );
    const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
    const titles = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/g)].map(
      (m) => m[1],
    );
    for (let i = 0; i < Math.min(ids.length, 12); i++) {
      const label = titles[i] || '';
      if (matchTitleArtist(artist, title, `${label} ${artist}`)) {
        return ids[i];
      }
    }
    // Fallback: first result if title tokens appear anywhere nearby
    for (const id of ids.slice(0, 5)) {
      const alive = await youtubeIdAlive(id);
      if (alive) return id;
    }
  } catch {
    // network / parse soft-fail
  }
  return null;
}

/**
 * @param {string} artist
 * @returns {Promise<{tracks: Array<{title:string,href:string,url:string}>, locationRaw: string|null, rootUrl: string|null}>}
 */
async function listBandcampTracksForArtist(artist) {
  const out = [];
  let locationRaw = null;
  let rootUrl = null;
  for (const sub of artistSubdomains(artist)) {
    for (const path of ['/music', '/']) {
      try {
        const pageUrl = `https://${sub}.bandcamp.com${path}`;
        const html = await fetchText(pageUrl);
        if (html.length < 4000 || !/bandcamp/i.test(html)) continue;
        if (/Signup \| Bandcamp/i.test(html) && !/band-name-location/i.test(html)) {
          continue;
        }
        if (!locationRaw) {
          const m = html.match(
            /id="band-name-location"[^>]*>[\s\S]*?<span class="location[^"]*"[^>]*>([^<]*)<\/span>/i,
          );
          if (m && m[1].trim()) locationRaw = m[1].trim();
        }
        if (!rootUrl) rootUrl = `https://${sub}.bandcamp.com/`;
        const links = [...html.matchAll(/href="(\/track\/[^"]+)"[^>]*>([^<]{0,160})/g)];
        for (const m of links) {
          const href = m[1];
          const title = (m[2] || href.split('/').pop() || '')
            .replace(/-/g, ' ')
            .trim();
          if (!title) continue;
          out.push({
            title,
            href,
            url: `https://${sub}.bandcamp.com${href}`,
          });
        }
        if (out.length) return { tracks: out, locationRaw, rootUrl };
      } catch {
        // try next subdomain
      }
    }
  }
  return { tracks: out, locationRaw, rootUrl };
}

function slugId(artist, title) {
  const n = (s) =>
    normalize(s)
      .replace(/\s+/g, '-')
      .slice(0, 48);
  return `em-${n(artist)}-${n(title)}`.slice(0, 80);
}

/**
 * One throttled refresh tick.
 * @returns {Promise<{verified:number,resolved:number,discovered:number}>}
 */
export async function runEmergenteRefresh(reason = 'alarm') {
  const ov = await loadEmergenteOverrides();
  // Soft throttle: skip network if refreshed recently (side panel open, etc.).
  const softReasons = new Set(['sidepanel', 'sidepanel_open', 'manual']);
  if (softReasons.has(reason) && ov.refreshedAt) {
    const last = Date.parse(ov.refreshedAt);
    if (Number.isFinite(last) && Date.now() - last < 12 * 60 * 60 * 1000) {
      return { verified: 0, resolved: 0, discovered: 0, skipped: true };
    }
  }
  let verified = 0;
  let resolved = 0;
  let discovered = 0;

  const corpus = EMERGENTE_CORPUS;
  // 1) Verify / repair a small batch of bundled ids
  const start = (ov.cursor || 0) % Math.max(1, corpus.length);
  const batch = [];
  for (let i = 0; i < Math.min(YT_RESOLVE_PER_RUN, corpus.length); i++) {
    batch.push(corpus[(start + i) % corpus.length]);
  }
  ov.cursor = (start + batch.length) % Math.max(1, corpus.length);

  for (const entry of batch) {
    const bundled =
      EMERGENTE_VIDEO_IDS[entry.id] || entry.youtubeVideoId || null;
    const current = ov.videoIds[entry.id] || bundled;
    if (current) {
      const ok = await youtubeIdAlive(current);
      if (ok) {
        verified += 1;
      } else {
        const fresh = await resolveYoutubeVideoId(entry.artist, entry.title);
        if (fresh) {
          ov.videoIds[entry.id] = fresh;
          resolved += 1;
        } else if (ov.videoIds[entry.id]) {
          delete ov.videoIds[entry.id];
        }
      }
    } else {
      const fresh = await resolveYoutubeVideoId(entry.artist, entry.title);
      if (fresh) {
        ov.videoIds[entry.id] = fresh;
        resolved += 1;
      }
    }
  }

  // 2) Discover new Bandcamp tracks for a rotating artist slice
  const artists = [...new Set(corpus.map((e) => e.artist))];
  const aStart = Math.floor((ov.cursor || 0) / Math.max(1, ARTISTS_PER_RUN)) % Math.max(1, artists.length);
  const artistBatch = [];
  for (let i = 0; i < Math.min(ARTISTS_PER_RUN, artists.length); i++) {
    artistBatch.push(artists[(aStart + i) % artists.length]);
  }

  const knownKeys = new Set(
    corpus.map((e) => `${normalize(e.artist)}::${normalize(e.title)}`),
  );
  for (const ex of ov.extras) {
    knownKeys.add(`${normalize(ex.artist)}::${normalize(ex.title)}`);
  }

  for (const artist of artistBatch) {
    const { tracks, locationRaw, rootUrl } = await listBandcampTracksForArtist(artist);
    if (locationRaw || rootUrl) {
      const geo = parseBandcampLocation(locationRaw);
      ov.artistGeo = ov.artistGeo || {};
      ov.artistGeo[artist] = {
        ...geo,
        bandcampUrl: rootUrl || undefined,
        geoSource: locationRaw ? 'bandcamp_artist_location' : 'bandcamp_page_no_location',
      };
    }
    for (const tr of tracks.slice(0, 6)) {
      const key = `${normalize(artist)}::${normalize(tr.title)}`;
      if (knownKeys.has(key)) continue;
      const yt = await resolveYoutubeVideoId(artist, tr.title);
      if (!yt) continue;
      const id = slugId(artist, tr.title);
      const geo = parseBandcampLocation(locationRaw);
      ov.extras.push({
        id,
        title: tr.title,
        artist,
        youtubeVideoId: yt,
        bandcampUrl: tr.url,
        energy: 0.45,
        valence: 0.5,
        tags: ['emergente', 'discovered'],
        ...geo,
        geoSource: locationRaw ? 'bandcamp_artist_location' : 'bandcamp_discovered',
      });
      knownKeys.add(key);
      discovered += 1;
      if (discovered >= 4) break;
    }
    if (discovered >= 4) break;
  }

  // Cap extras growth (on-device Italy + underground discoveries)
  if (ov.extras.length > EXTRAS_CAP) {
    ov.extras = ov.extras.slice(-EXTRAS_CAP);
  }

  ov.refreshedAt = new Date().toISOString();
  await saveEmergenteOverrides(ov);
  console.info(
    `[emergente] refresh (${reason}): verified=${verified} resolved=${resolved} discovered=${discovered}`,
  );
  return { verified, resolved, discovered };
}
