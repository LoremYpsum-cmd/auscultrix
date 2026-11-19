/**
 * World Bandcamp corpus builder — Bandcamp Discover (public, no key) × YouTube.
 *
 * Only tracks with a VERIFIED place (parsed Bandcamp artist location) and a
 * VERIFIED YouTube id (search + oEmbed check) enter the catalog. Anything
 * ambiguous is skipped — geography stays perfect by construction.
 *
 * Usage (from extension root):
 *   node packaging/tools/build-world-bandcamp.mjs --collect --genres electronic,rock --pages 2 --max-resolves 150
 *   node packaging/tools/build-world-bandcamp.mjs --finalize
 *
 * State: packaging/tools/world-results.json (resumable, deduped).
 * Output: lib/world-bandcamp-corpus.js, lib/world-bandcamp-youtube-ids.js,
 *         lib/world-bandcamp-geo-data.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..');
const RESULTS_PATH = resolve(here, 'world-results.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(s) {
  return norm(s).replace(/\s+/g, '-');
}

const COUNTRY_MAP = {
  'germany': 'de', 'deutschland': 'de',
  'france': 'fr',
  'united kingdom': 'gb', 'uk': 'gb', 'great britain': 'gb', 'england': 'gb',
  'scotland': 'gb', 'wales': 'gb', 'northern ireland': 'gb',
  'italy': 'it', 'italia': 'it',
  'spain': 'es', 'espana': 'es',
  'portugal': 'pt',
  'netherlands': 'nl', 'holland': 'nl',
  'belgium': 'be', 'belgique': 'be', 'belgie': 'be',
  'austria': 'at', 'osterreich': 'at',
  'switzerland': 'ch', 'schweiz': 'ch', 'suisse': 'ch',
  'poland': 'pl', 'polska': 'pl',
  'sweden': 'se', 'sverige': 'se',
  'norway': 'no', 'norge': 'no',
  'denmark': 'dk', 'finland': 'fi', 'suomi': 'fi',
  'ireland': 'ie',
  'greece': 'gr',
  'czech republic': 'cz', 'czechia': 'cz',
  'hungary': 'hu', 'romania': 'ro', 'croatia': 'hr', 'serbia': 'rs',
  'ukraine': 'ua', 'bulgaria': 'bg', 'slovakia': 'sk', 'slovenia': 'si',
  'lithuania': 'lt', 'latvia': 'lv', 'estonia': 'ee',
  'united states': 'us', 'usa': 'us', 'us': 'us', 'america': 'us',
  'canada': 'ca',
  'mexico': 'mx', 'brazil': 'br', 'brasil': 'br', 'argentina': 'ar',
  'chile': 'cl', 'colombia': 'co', 'peru': 'pe', 'venezuela': 've',
  'japan': 'jp', 'south korea': 'kr', 'korea': 'kr', 'china': 'cn',
  'taiwan': 'tw', 'india': 'in', 'indonesia': 'id', 'thailand': 'th',
  'australia': 'au', 'new zealand': 'nz',
  'turkey': 'tr', 'turkiye': 'tr', 'israel': 'il',
  'south africa': 'za', 'nigeria': 'ng', 'mali': 'ml', 'niger': 'ne',
  'ghana': 'gh', 'senegal': 'sn', 'ethiopia': 'et', 'kenya': 'ke',
  'egypt': 'eg', 'morocco': 'ma',
  'iceland': 'is', 'island': 'is',
  'guatemala': 'gt', 'costa rica': 'cr', 'cuba': 'cu',
  'russia': 'ru', 'georgia': 'ge', 'armenia': 'am',
};

const US_STATES = new Set(['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming','district of columbia','washington dc','dc','puerto rico']);
const CA_PROVINCES = new Set(['ontario','quebec','british columbia','alberta','manitoba','saskatchewan','nova scotia','new brunswick','newfoundland and labrador','prince edward island','northwest territories','yukon','nunavut']);
const AU_STATES = new Set(['new south wales','victoria','queensland','western australia','south australia','tasmania','australian capital territory','northern territory']);
const UK_REGIONS = new Set(['england', 'scotland', 'wales', 'northern ireland']);

/**
 * Parse "City, Country" / "City, State" / "Region, Country" Bandcamp locations.
 * Returns null when the place cannot be verified — caller must skip.
 */
function parseLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const first = norm(parts[0]);
  const second = norm(parts[1]);
  if (!first || !second) return null;

  // "City, US-State" / "City, CA-Province" / "City, AU-State"
  if (US_STATES.has(second)) {
    return { geoCountry: 'us', geoRegion: slug(parts[1]), geoProvince: null, geoCity: slug(parts[0]), locationRaw: raw };
  }
  if (CA_PROVINCES.has(second)) {
    return { geoCountry: 'ca', geoRegion: slug(parts[1]), geoProvince: null, geoCity: slug(parts[0]), locationRaw: raw };
  }
  if (AU_STATES.has(second)) {
    return { geoCountry: 'au', geoRegion: slug(parts[1]), geoProvince: null, geoCity: slug(parts[0]), locationRaw: raw };
  }
  // "England, UK" — first part is a region, not a city
  if (UK_REGIONS.has(first) && COUNTRY_MAP[second]) {
    return { geoCountry: COUNTRY_MAP[second], geoRegion: slug(parts[0]), geoProvince: null, geoCity: null, locationRaw: raw };
  }
  const cc = COUNTRY_MAP[second];
  if (!cc) return null;
  return { geoCountry: cc, geoRegion: null, geoProvince: null, geoCity: slug(parts[0]), locationRaw: raw };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function discover(genre, page) {
  const url = `https://bandcamp.com/api/discover/3/get_web?g=${encodeURIComponent(genre)}&s=top&p=${page}&gn=0&f=all&w=0&lo=true`;
  const d = await fetchJson(url);
  return d.items || [];
}

/** First YouTube result for "artist title", verified playable via oEmbed. */
async function resolveYouTube(artist, title) {
  const q = `${artist} ${title}`.trim();
  const html = await fetchText(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  );
  const ids = [];
  for (const m of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
    if (ids.length >= 3) break;
  }
  for (const id of ids) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
        { headers: { 'User-Agent': UA } },
      );
      if (res.ok) {
        const meta = await res.json();
        if (meta && meta.html) return { videoId: id, videoTitle: meta.title || '' };
      }
    } catch {
      // try next candidate
    }
    await sleep(300);
  }
  return null;
}

function loadResults() {
  if (!existsSync(RESULTS_PATH)) return [];
  try {
    const arr = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function loadExistingKeys() {
  const keys = new Set();
  try {
    // Dynamic import of bundled corpora for dedupe (best-effort).
    const fs = readFileSync(resolve(ROOT, 'lib/italy-bandcamp-corpus.js'), 'utf8');
    for (const m of fs.matchAll(/"artist":\s*"((?:[^"\\]|\\.)*)"\s*,\s*"year"[^}]*?"title":\s*"((?:[^"\\]|\\.)*)"|"title":\s*"((?:[^"\\]|\\.)*)"\s*,\s*"artist":\s*"((?:[^"\\]|\\.)*)"/g)) {
      // handled generically below instead
    }
  } catch {
    // ignore
  }
  return keys;
}

function itemKey(artist, title) {
  return `${norm(artist)}|${norm(title)}`;
}

async function collect({ genres, pageOffset = 0, pages, maxResolves, sleepMs }) {
  const results = loadResults();
  const seen = new Set(results.map((r) => itemKey(r.artist, r.title)));
  // Dedupe against bundled corpora (loaded lazily, best-effort).
  try {
    const mod = await import('../../lib/italy-bandcamp-corpus.js');
    for (const e of mod.ITALY_BANDCAMP_CORPUS || []) seen.add(itemKey(e.artist, e.title));
  } catch {
    // ignore
  }
  try {
    const mod = await import('../../lib/underground-corpus.js');
    for (const e of mod.UNDERGROUND_CORPUS || []) seen.add(itemKey(e.artist, e.title));
  } catch {
    // ignore
  }

  let resolves = 0;
  let added = 0;
  let skipped = 0;
  for (const genre of genres) {
    for (let p = pageOffset; p < pageOffset + pages; p++) {
      let items = [];
      try {
        items = await discover(genre, p);
      } catch (err) {
        console.warn(`discover ${genre} p${p} failed: ${err.message}`);
        continue;
      }
      for (const it of items) {
        if (resolves >= maxResolves) break;
        const artist = (it.secondary_text || '').trim();
        const trackTitle = ((it.featured_track || {}).title || it.package_title || '').trim();
        if (!artist || !trackTitle) { skipped++; continue; }
        const key = itemKey(artist, trackTitle);
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);

        const geo = parseLocation(it.location_text);
        if (!geo) { skipped++; continue; } // no verified place → skip (geo stays perfect)

        const hints = it.url_hints || {};
        const bcBase = hints.subdomain ? `https://${hints.subdomain}.bandcamp.com` : null;
        const bcPath = hints.slug ? (hints.item_type === 't' ? `/track/${hints.slug}` : `/album/${hints.slug}`) : '';
        if (!bcBase) { skipped++; continue; }

        let yt = null;
        try {
          resolves++;
          yt = await resolveYouTube(artist, trackTitle);
        } catch (err) {
          console.warn(`youtube resolve failed for ${artist} - ${trackTitle}: ${err.message}`);
        }
        await sleep(sleepMs);
        if (!yt) { skipped++; continue; } // not on YouTube → skip

        let year = null;
        const m = String(it.publish_date || '').match(/(19|20)\d{2}/);
        if (m) year = Number(m[0]);

        results.push({
          artist,
          title: trackTitle,
          year,
          genre,
          youtubeVideoId: yt.videoId,
          youtubeVideoTitle: yt.videoTitle,
          bandcampUrl: bcBase + bcPath,
          ...geo,
          geoSource: 'bandcamp_discover',
        });
        added++;
        if (added % 25 === 0) {
          writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 1));
          console.log(`… ${added} added, ${resolves} resolves (${genre} p${p})`);
        }
      }
      if (resolves >= maxResolves) break;
      await sleep(400);
    }
    if (resolves >= maxResolves) break;
  }
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 1));
  console.log(`DONE: +${added} new tracks, ${resolves} resolves, ${skipped} skipped. Total: ${results.length}`);
}

const COUNTRY_NAMES = {
  de: 'Germania', fr: 'Francia', gb: 'Regno Unito', it: 'Italia', es: 'Spagna',
  pt: 'Portogallo', nl: 'Paesi Bassi', be: 'Belgio', at: 'Austria', ch: 'Svizzera',
  pl: 'Polonia', se: 'Svezia', no: 'Norvegia', dk: 'Danimarca', fi: 'Finlandia',
  ie: 'Irlanda', gr: 'Grecia', cz: 'Cechia', hu: 'Ungheria', ro: 'Romania',
  hr: 'Croazia', rs: 'Serbia', ua: 'Ucraina', us: 'Stati Uniti', ca: 'Canada',
  mx: 'Messico', br: 'Brasile', ar: 'Argentina', cl: 'Cile', co: 'Colombia',
  pe: 'Perù', jp: 'Giappone', kr: 'Corea del Sud', au: 'Australia', nz: 'Nuova Zelanda',
};
const COUNTRY_NAMES_EN = {
  de: 'Germany', fr: 'France', gb: 'United Kingdom', it: 'Italy', es: 'Spain',
  pt: 'Portugal', nl: 'Netherlands', be: 'Belgium', at: 'Austria', ch: 'Switzerland',
  pl: 'Poland', se: 'Sweden', no: 'Norway', dk: 'Denmark', fi: 'Finland',
  ie: 'Ireland', gr: 'Greece', cz: 'Czechia', hu: 'Hungary', ro: 'Romania',
  hr: 'Croatia', rs: 'Serbia', ua: 'Ukraine', us: 'United States', ca: 'Canada',
  mx: 'Mexico', br: 'Brazil', ar: 'Argentina', cl: 'Chile', co: 'Colombia',
  pe: 'Peru', jp: 'Japan', kr: 'South Korea', au: 'Australia', nz: 'New Zealand',
};

function titleCase(s) {
  return String(s || '').split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function finalize() {
  const results = loadResults();
  if (!results.length) {
    console.log('nothing to finalize — run --collect first');
    return;
  }
  const corpus = results.map((r, i) => ({
    id: `wbc-${String(i + 1).padStart(4, '0')}`,
    title: r.title,
    artist: r.artist,
    year: r.year ?? null,
    energy: 0.45,
    valence: 0.5,
    tags: [r.genre, 'bandcamp', 'emergente'],
    geoCountry: r.geoCountry,
    geoRegion: r.geoRegion ?? null,
    geoProvince: null,
    geoCity: r.geoCity ?? null,
    locationRaw: r.locationRaw,
    bandcampUrl: r.bandcampUrl,
    geoSource: r.geoSource,
  }));
  const ids = {};
  for (const [i, r] of results.entries()) {
    ids[`wbc-${String(i + 1).padStart(4, '0')}`] = r.youtubeVideoId;
  }

  // Geo maps + zones for music-geo.js
  const trackGeo = {};
  const artistGeo = {};
  const zoneMap = new Map();
  for (const [i, r] of results.entries()) {
    const id = `wbc-${String(i + 1).padStart(4, '0')}`;
    trackGeo[id] = {
      geoCountry: r.geoCountry,
      geoRegion: r.geoRegion ?? null,
      geoProvince: null,
      geoCity: r.geoCity ?? null,
      locationRaw: r.locationRaw,
      bandcampUrl: r.bandcampUrl,
      geoSource: r.geoSource,
    };
    if (!artistGeo[r.artist]) artistGeo[r.artist] = trackGeo[id];
    const cc = r.geoCountry;
    const cId = `country:${cc}`;
    if (!zoneMap.has(cId)) {
      zoneMap.set(cId, {
        id: cId, country: cc,
        labelIt: COUNTRY_NAMES[cc] || cc.toUpperCase(),
        labelEn: COUNTRY_NAMES_EN[cc] || cc.toUpperCase(),
        aliases: [cc],
      });
    }
    if (r.geoRegion) {
      const rId = `region:${cc}-${r.geoRegion}`;
      if (!zoneMap.has(rId)) {
        zoneMap.set(rId, {
          id: rId, country: cc, region: r.geoRegion,
          labelIt: `${zoneMap.get(cId).labelIt} · ${titleCase(r.geoRegion)}`,
          labelEn: `${zoneMap.get(cId).labelEn} · ${titleCase(r.geoRegion)}`,
        });
      }
    }
    if (r.geoCity) {
      const cityId = `city:${cc}-${r.geoCity}`;
      if (!zoneMap.has(cityId)) {
        const z = { id: cityId, country: cc, city: r.geoCity };
        if (r.geoRegion) z.region = r.geoRegion;
        z.labelIt = `${zoneMap.get(cId).labelIt} · ${titleCase(r.geoCity)}`;
        z.labelEn = `${zoneMap.get(cId).labelEn} · ${titleCase(r.geoCity)}`;
        zoneMap.set(cityId, z);
      }
    }
  }

  const head = (what, gen) => `/**\n * World Bandcamp corpus — ${what}.\n * Generated by packaging/tools/build-world-bandcamp.mjs (${gen}).\n * Bandcamp Discover (public) × YouTube (verified ids). Factual metadata only.\n */\n\n`;
  const stamp = new Date().toISOString();
  writeFileSync(resolve(ROOT, 'lib/world-bandcamp-corpus.js'),
    head('Emergente corpus (Bandcamp ∩ YouTube, worldwide)', stamp) +
    `export const WORLD_BANDCAMP_SOURCE = 'world_bandcamp';\n\n` +
    `export const WORLD_BANDCAMP_META = ${JSON.stringify({ generatedAt: stamp, trackCount: corpus.length })};\n\n` +
    `/** @type {Array<object>} */\nexport const WORLD_BANDCAMP_CORPUS = ${JSON.stringify(corpus)};\n`);
  writeFileSync(resolve(ROOT, 'lib/world-bandcamp-youtube-ids.js'),
    head('curated YouTube video ids', stamp) +
    `export const WORLD_BANDCAMP_YOUTUBE_VIDEO_IDS = ${JSON.stringify(ids)};\n`);
  writeFileSync(resolve(ROOT, 'lib/world-bandcamp-geo-data.js'),
    head('geo maps + zones', stamp) +
    `export const WORLD_TRACK_GEO = ${JSON.stringify(trackGeo)};\n\n` +
    `export const WORLD_ARTIST_GEO = ${JSON.stringify(artistGeo)};\n\n` +
    `export const WORLD_GEO_ZONES = ${JSON.stringify([...zoneMap.values()])};\n\n` +
    `export const WORLD_GEO_META = ${JSON.stringify({ generatedAt: stamp, trackCount: corpus.length, zoneCount: zoneMap.size })};\n`);
  console.log(`FINALIZED: ${corpus.length} tracks, ${zoneMap.size} zones → lib/world-bandcamp-*.js`);
}

const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  const m = rawArgs[i].match(/^--([^=]+)(=(.*))?$/);
  if (!m) continue;
  if (m[3] !== undefined) {
    args[m[1]] = m[3];
  } else if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--')) {
    args[m[1]] = rawArgs[++i];
  } else {
    args[m[1]] = true;
  }
}

if (args.finalize) {
  finalize();
} else {
  const genres = String(args.genres || 'electronic,rock,pop,hip-hop,jazz,ambient').split(',').map((s) => s.trim()).filter(Boolean);
  const pageOffset = Number(args['page-offset'] || 0);
  const pages = Number(args.pages || 2);
  const maxResolves = Number(args['max-resolves'] || 150);
  const sleepMs = Number(args.sleep || 800);
  mkdirSync(here, { recursive: true });
  console.log(`collect: genres=[${genres.join(', ')}] pages=${pageOffset}..${pageOffset + pages - 1} maxResolves=${maxResolves}`);
  await collect({ genres, pageOffset, pages, maxResolves, sleepMs });
}
