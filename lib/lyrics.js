/**
 * Lyrics-aware mood features — local analysis, no Auscultrix servers.
 *
 * Lyrics are read on demand from LRCLIB (lrclib.net), an open, key-less,
 * community lyrics archive. The text is analyzed here on the device with a
 * bilingual (IT/EN) affective lexicon and then discarded: only derived
 * numbers survive — lyric valence, lyric arousal, a confidence score and a
 * few theme labels — cached in chrome.storage.local. The lyric text itself
 * is never stored and never redistributed.
 *
 * The derived coordinates refine the audio-based (energy, valence) of each
 * track: a song can sound bright and speak of loss — «Ma il cielo è sempre
 * più blu» — and the ISO trajectory should know it.
 */

const LRCLIB_ENDPOINT = 'https://lrclib.net/api/get';
export const LYRICS_CACHE_KEY = 'lyricsFeaturesV1';
const CACHE_MAX_ENTRIES = 600;
/** Blend weights (scaled by confidence): valence leans on words more than energy. */
const VALENCE_LYRIC_WEIGHT = 0.35;
const AROUSAL_LYRIC_WEIGHT = 0.15;

/* ------------------------------ Lexicon (IT/EN) ------------------------------ */

/** Fold to the same accent-free form used by the tokenizer. */
function fold(word) {
  return String(word)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function lexicon(words) {
  return new Set(words.map(fold));
}

const POSITIVE = lexicon([
  // it
  'amore', 'amare', 'sole', 'luce', 'felice', 'felicità', 'sorriso', 'sorridere',
  'ridere', 'bello', 'bella', 'insieme', 'abbraccio', 'abbracciami', 'speranza',
  'libertà', 'libero', 'libera', 'festa', 'ballare', 'balliamo', 'cielo', 'mare',
  'estate', 'dolce', 'fortuna', 'pace', 'carezza', 'fiducia', 'sogno', 'sognare',
  'splende', 'brilla', 'vivo', 'viva', 'rinascere', 'respiro', 'casa', 'baciami',
  'bacio', 'tenerezza', 'meraviglia', 'paradiso', 'oro', 'fiore', 'fiori', 'primavera',
  // en
  'love', 'light', 'sun', 'sunshine', 'smile', 'laugh', 'happy', 'happiness',
  'joy', 'hope', 'free', 'freedom', 'together', 'heaven', 'sweet', 'beautiful',
  'alive', 'shine', 'shining', 'gold', 'golden', 'summer', 'peace', 'home',
  'kiss', 'wonder', 'wonderful', 'paradise', 'bloom', 'spring', 'dream', 'dreams',
]);

const NEGATIVE = lexicon([
  // it
  'morte', 'morire', 'muoio', 'piangere', 'piango', 'lacrime', 'dolore', 'buio',
  'solitudine', 'paura', 'guerra', 'sangue', 'freddo', 'inverno', 'addio', 'perso',
  'persa', 'perdere', 'perduto', 'vuoto', 'niente', 'odio', 'rabbia', 'male',
  'ferita', 'ferite', 'cadere', 'cado', 'scuro', 'nero', 'inferno', 'ansia',
  'tremare', 'tristezza', 'triste', 'veleno', 'colpa', 'rimpianto', 'fantasma',
  'cenere', 'rovina', 'abbandono', 'abbandonato', 'sbagliato', 'bugie', 'menzogna',
  // en
  'death', 'die', 'dying', 'cry', 'crying', 'tears', 'pain', 'hurt', 'dark',
  'darkness', 'alone', 'lonely', 'loneliness', 'fear', 'war', 'blood', 'cold',
  'goodbye', 'lost', 'lose', 'losing', 'empty', 'nothing', 'hate', 'anger',
  'broken', 'wound', 'wounds', 'fall', 'falling', 'black', 'hell', 'anxiety',
  'shake', 'sorrow', 'grief', 'poison', 'guilt', 'regret', 'ghost', 'ashes',
  'ruin', 'abandoned', 'wrong', 'lies', 'liar',
]);

const HIGH_AROUSAL = lexicon([
  // it
  'correre', 'corro', 'gridare', 'grido', 'urlare', 'urlo', 'fuoco', 'esplodere',
  'esplode', 'saltare', 'salta', 'veloce', 'forza', 'lotta', 'lottare', 'combattere',
  'adrenalina', 'tuono', 'tempesta', 'benzina', 'elettrica', 'selvaggio', 'pazzo',
  'pazza', 'forte', 'alza', 'vola', 'volare',
  // en
  'run', 'running', 'scream', 'screaming', 'shout', 'fire', 'explode', 'explosion',
  'jump', 'fast', 'fight', 'fighting', 'burn', 'burning', 'wild', 'crazy', 'loud',
  'thunder', 'storm', 'gasoline', 'electric', 'higher', 'fly', 'flying', 'rage',
]);

const LOW_AROUSAL = lexicon([
  // it
  'dormire', 'dormo', 'lento', 'lenta', 'lentamente', 'piano', 'silenzio',
  'quiete', 'calma', 'calmo', 'riposo', 'riposare', 'culla', 'sussurro',
  'sussurra', 'respirare', 'notte', 'ninna', 'nanna', 'placido', 'immobile',
  // en
  'sleep', 'sleeping', 'slow', 'slowly', 'quiet', 'silence', 'silent', 'calm',
  'rest', 'resting', 'cradle', 'whisper', 'whispering', 'breathe', 'breathing',
  'still', 'soft', 'softly', 'lullaby', 'gentle', 'gently',
]);

/** Theme labels usable by the keyword→genre matcher. */
const THEMES = [
  ['sadness', NEGATIVE],
  ['warmth', POSITIVE],
  ['tension', HIGH_AROUSAL],
  ['calm', LOW_AROUSAL],
];

/* ------------------------------- Pure analysis ------------------------------- */

function tokenizeLyrics(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Analyze lyric text locally → affective features. Pure, offline, testable.
 * @param {string} text plain lyrics
 * @returns {{ lyricValence: number, lyricArousal: number, confidence: number, themes: string[] }|null}
 */
export function analyzeLyricsText(text) {
  const tokens = tokenizeLyrics(text);
  if (tokens.length < 12) return null; // too little material to judge

  let pos = 0;
  let neg = 0;
  let hi = 0;
  let lo = 0;
  for (const tok of tokens) {
    // NFD-stripped lexicon lookups (lexicon entries are accent-free after normalize)
    if (POSITIVE.has(tok)) pos += 1;
    if (NEGATIVE.has(tok)) neg += 1;
    if (HIGH_AROUSAL.has(tok)) hi += 1;
    if (LOW_AROUSAL.has(tok)) lo += 1;
  }

  const affectHits = pos + neg;
  const arousalHits = hi + lo;
  if (affectHits + arousalHits === 0) return null;

  const lyricValence = 0.5 + 0.5 * ((pos - neg) / (affectHits + 2));
  const lyricArousal = 0.5 + 0.5 * ((hi - lo) / (arousalHits + 2));
  const confidence = Math.min(1, (affectHits + arousalHits) / 14);

  const counts = { sadness: neg, warmth: pos, tension: hi, calm: lo };
  const themes = THEMES.filter(([name]) => counts[name] >= 2)
    .sort((a, b) => counts[b[0]] - counts[a[0]])
    .map(([name]) => name)
    .slice(0, 2);

  return {
    lyricValence: Math.max(0, Math.min(1, lyricValence)),
    lyricArousal: Math.max(0, Math.min(1, lyricArousal)),
    confidence,
    themes,
  };
}

/**
 * Blend audio-based coordinates with lyric-based ones (confidence-scaled).
 * Pure — used both at pool build time and in tests.
 * @param {object} track
 * @param {{ lyricValence: number, lyricArousal: number, confidence: number, themes?: string[] }} feats
 * @returns {object} shallow-copied track with refined coordinates
 */
export function applyLyricFeatures(track, feats) {
  if (!track || !feats || !Number.isFinite(feats.confidence)) return track;
  const wV = VALENCE_LYRIC_WEIGHT * feats.confidence;
  const wA = AROUSAL_LYRIC_WEIGHT * feats.confidence;
  const out = { ...track };
  if (Number.isFinite(feats.lyricValence)) {
    const base = Number.isFinite(out.valence) ? out.valence : 0.5;
    out.valence = Math.max(0, Math.min(1, base * (1 - wV) + feats.lyricValence * wV));
    out.valenceSource = `${out.valenceSource || 'unknown'}+lyrics`;
  }
  if (Number.isFinite(feats.lyricArousal)) {
    const base = Number.isFinite(out.energy) ? out.energy : 0.5;
    out.energy = Math.max(0, Math.min(1, base * (1 - wA) + feats.lyricArousal * wA));
    out.energySource = `${out.energySource || 'unknown'}+lyrics`;
  }
  if (Array.isArray(feats.themes) && feats.themes.length) {
    const genres = Array.isArray(out.genres) ? [...out.genres] : [];
    for (const th of feats.themes) if (!genres.includes(th)) genres.push(th);
    out.genres = genres;
    if (!out.genre) out.genre = feats.themes[0];
  }
  out.lyricConfidence = feats.confidence;
  return out;
}

/** Apply cached lyric features to a whole pool. Pure. */
export function applyLyricFeaturesToPool(pool, cache) {
  if (!cache || typeof cache !== 'object') return pool;
  return (pool || []).map((t) => {
    const feats = cache[t?.id];
    return feats && !feats.miss ? applyLyricFeatures(t, feats) : t;
  });
}

/* ------------------------------ Fetch + cache ------------------------------- */

/**
 * Fetch plain lyrics from LRCLIB (open archive, no API key).
 * @returns {Promise<string|null>} plain text or null when not found
 */
export async function fetchLyricsFromLrclib(artist, title, durationSec) {
  const params = new URLSearchParams({
    artist_name: String(artist || '').trim(),
    track_name: String(title || '').trim(),
  });
  if (Number.isFinite(durationSec) && durationSec > 0) {
    params.set('duration', String(Math.round(durationSec)));
  }
  const res = await fetch(`${LRCLIB_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`lrclib HTTP ${res.status}`);
  const data = await res.json();
  const plain = data?.plainLyrics || '';
  if (plain && String(plain).trim().length > 0) return String(plain);
  // Synced-only entries: strip [mm:ss.xx] timestamps
  const synced = String(data?.syncedLyrics || '');
  if (synced) return synced.replace(/\[[^\]]*\]/g, ' ');
  return null;
}

async function loadCache() {
  try {
    const data = await chrome.storage.local.get(LYRICS_CACHE_KEY);
    const cache = data?.[LYRICS_CACHE_KEY];
    return cache && typeof cache === 'object' ? cache : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX_ENTRIES) {
    // Drop the oldest entries by timestamp
    keys
      .sort((a, b) => (cache[a]?.ts || 0) - (cache[b]?.ts || 0))
      .slice(0, keys.length - CACHE_MAX_ENTRIES)
      .forEach((k) => delete cache[k]);
  }
  try {
    await chrome.storage.local.set({ [LYRICS_CACHE_KEY]: cache });
  } catch {
    // storage full or unavailable: cache is best-effort
  }
}

/** @returns {Promise<object>} current lyric features cache (id → feats) */
export async function loadLyricsCache() {
  return loadCache();
}

/**
 * Background enrichment: fetch + analyze lyrics for tracks missing from the
 * cache, throttled to stay polite with the public archive. The lyric text is
 * analyzed in memory and dropped; only derived numbers are cached.
 * @param {object[]} tracksToEnrich
 * @param {{ limit?: number, delayMs?: number }} [opts]
 * @returns {Promise<number>} number of new cache entries
 */
export async function enrichLyricsInBackground(tracksToEnrich, opts = {}) {
  const limit = opts.limit ?? 12;
  const delayMs = opts.delayMs ?? 350;
  const cache = await loadCache();
  let added = 0;

  for (const track of Array.isArray(tracksToEnrich) ? tracksToEnrich : []) {
    if (added >= limit) break;
    const id = track?.id;
    if (!id || cache[id]) continue;
    if (!track?.artist || !track?.title) continue;
    try {
      const text = await fetchLyricsFromLrclib(
        track.artist,
        track.title,
        track.durationMs ? track.durationMs / 1000 : undefined,
      );
      const feats = text ? analyzeLyricsText(text) : null;
      cache[id] = feats
        ? { ...feats, ts: Date.now() }
        : { miss: true, ts: Date.now() };
      added += 1;
    } catch {
      // network hiccup: skip this track, continue with the rest of the batch
      continue;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  if (added > 0) await saveCache(cache);
  return added;
}
