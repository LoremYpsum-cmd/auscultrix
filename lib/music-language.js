/**
 * Music language preference — native (UI locale) vs international (no bias).
 * Persisted as chrome.storage.local.musicLanguageMode: 'native' | 'international'.
 *
 * Native mode: filter-first from language-matching subset, then strong score bias;
 * international mode leaves mood ranking unchanged.
 */

import { uiLocale } from './i18n.js';

export const MUSIC_LANGUAGE_NATIVE = 'native';
export const MUSIC_LANGUAGE_INTERNATIONAL = 'international';
/** Default “normale”: no native-language bias. */
export const MUSIC_LANGUAGE_DEFAULT = MUSIC_LANGUAGE_INTERNATIONAL;

/** Affinity ≥ this → “matching” pool for native filter-first. */
export const NATIVE_MATCH_THRESHOLD = 0.52;

/**
 * Strong native bias in score mix (was 0.16 — mood drowned language).
 * Final playlist still filter-first; this keeps matching tracks in the prefilter.
 */
const NATIVE_LANGUAGE_WEIGHT = 0.58;

/** Distinctive Italian lexical cues (title / artist / album). */
const IT_STRONG_WORDS = new Set([
  'che',
  'non',
  'una',
  'della',
  'delle',
  'degli',
  'amore',
  'cuore',
  'vita',
  'sempre',
  'ancora',
  'quando',
  'dove',
  'cosa',
  'tutto',
  'tutti',
  'anche',
  'solo',
  'nella',
  'nel',
  'sul',
  'sulla',
  'sono',
  'sei',
  'canzone',
  'canzoni',
  'sogno',
  'sogni',
  'notte',
  'giorno',
  'sole',
  'luna',
  'mare',
  'tempo',
  'bello',
  'bella',
  'liberta',
  'libertà',
  'senza',
  'contro',
  'perche',
  'perché',
  'oggi',
  'ieri',
  'domani',
  'bambino',
  'bambina',
  'ragazzo',
  'ragazza',
  'mondo',
  'strada',
  'pioggia',
  'vento',
  'fuoco',
  'acqua',
  'stelle',
  'cielo',
  'terra',
  'casa',
  'fiore',
  'fiori',
  'luce',
  'ombra',
  'anima',
  'sangue',
  'guerra',
  'pace',
  'vero',
  'vera',
  'mio',
  'mia',
  'tuo',
  'tua',
  'suo',
  'sua',
  'noi',
  'voi',
  'loro',
]);

/** Weak Italian particles — need company (another cue) to count. */
const IT_WEAK_WORDS = new Set([
  'di',
  'da',
  'del',
  'dei',
  'lo',
  'la',
  'il',
  'gli',
  'le',
  'un',
  'uno',
  'per',
  'con',
  'tra',
  'fra',
  'a',
  'e',
  'o',
]);

const EN_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'you',
  'your',
  'with',
  'from',
  'this',
  'that',
  'love',
  'heart',
  'night',
  'day',
  'life',
  'time',
  'dream',
  'dreams',
  'song',
  'songs',
  'baby',
  'girl',
  'boy',
  'world',
  'never',
  'always',
  'again',
  'into',
  'over',
  'under',
  'about',
  'when',
  'where',
  'what',
  'who',
]);

const IT_GENRE_HINTS = [
  'italian',
  'italiano',
  'italiana',
  'italiane',
  'italiani',
  'canzone italiana',
  'musica italiana',
  'cantautor',
  'cantante italiano',
  'italian pop',
  'italian indie',
  'italian rock',
  'italian hip hop',
  'italian rap',
  'trap italiana',
  'rap italiano',
  'indie italiano',
  'pop italiano',
  'napoletana',
  'napoletano',
  'sicilian',
  'musica latina italiana',
];

const EN_GENRE_HINTS = [
  'english',
  'british',
  'american',
  'uk pop',
  'uk indie',
  'singer-songwriter',
];

const IT_LABEL_HINTS = [
  'italia',
  'italy',
  'italian',
  'italiano',
  'bomba dischi',
  'sugar music',
  'carosello',
  'ricordi',
];

/**
 * Small curated set of well-known Italian artists (helps single-word English titles).
 * Keep short — metadata + text heuristics do the rest.
 */
const IT_KNOWN_ARTISTS = new Set([
  'calcutta',
  'jovanotti',
  'caparezza',
  'gemitaiz',
  'marracash',
  'salmo',
  'fabri fibra',
  'noyz narcos',
  'cesare cremonini',
  'lucio battisti',
  'subsonica',
  'coez',
  'franco126',
  'franco 126',
  'maneskin',
  'måneskin',
  'laura pausini',
  'eros ramazzotti',
  'punkreas',
  'neffa',
  'motta',
  'samuele bersani',
  'pino daniele',
  'ligabue',
  'ritmo tribale',
  'afterhours',
  'verdena',
  'baustelle',
  'daniele silvestri',
  'max gazzè',
  'max gazze',
  'club dogo',
  'guè',
  'gue',
  'sfera ebbasta',
  'ghali',
  'tedua',
  'lazza',
  'mahmood',
  'mia martini',
  'paolo conte',
  'francesco de gregori',
  'fabrizio de andre',
  'fabrizio de andré',
  'lucio dalla',
  'renato zero',
  'gianna nannini',
  'zucchero',
  'madman',
  'nitro',
  'paky',
  'mezzo sangue',
  'mezzosangue',
  'filospada',
  'takagi & ketra',
  'takagi e ketra',
]);

/**
 * @param {unknown} value
 * @returns {'native'|'international'}
 */
export function normalizeMusicLanguageMode(value) {
  const v = String(value || '').toLowerCase().trim();
  if (v === MUSIC_LANGUAGE_NATIVE) return MUSIC_LANGUAGE_NATIVE;
  return MUSIC_LANGUAGE_INTERNATIONAL;
}

/**
 * Primary UI language code for music bias (it / en).
 * @returns {'it'|'en'}
 */
export function musicUiLocale() {
  return uiLocale();
}

/**
 * Short dyslexia-friendly status for native preference (e.g. «Preferenza: italiano»).
 * @param {'native'|'international'} mode
 * @param {'it'|'en'} [locale]
 * @returns {string} empty when international
 */
export function musicLanguageStatusLine(mode, locale = musicUiLocale()) {
  if (normalizeMusicLanguageMode(mode) !== MUSIC_LANGUAGE_NATIVE) return '';
  if (locale === 'it') return 'Preferenza: italiano (musica e media)';
  return 'Preference: English (music & media)';
}

function trackText(track) {
  const genres = Array.isArray(track?.genres)
    ? track.genres
    : String(track?.genre || '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
  const parts = [
    track?.title,
    track?.artist,
    track?.album,
    track?.genre,
    ...genres,
    track?.language,
    track?.lang,
    track?.isrc,
    track?.recordLabel,
    track?.label,
  ];
  return parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase())
    .join(' ');
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function artistLooksItalian(track) {
  const raw = String(track?.artist || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
  if (!raw) return false;
  // Multi-artist: any segment match
  const segments = raw.split(/;|&| feat\.? | ft\.? | with /i).map((s) => s.trim());
  for (const seg of segments) {
    if (IT_KNOWN_ARTISTS.has(seg)) return true;
    // Partial: "Calcutta " / "Guè Pequito"
    for (const known of IT_KNOWN_ARTISTS) {
      if (seg === known || seg.startsWith(`${known} `) || seg.endsWith(` ${known}`)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {object} track
 * @returns {'it'|'en'|string|null}
 */
function explicitLang(track) {
  const raw = String(track?.language || track?.lang || '').toLowerCase().trim();
  if (raw) {
    if (raw.startsWith('it') || raw.includes('italian') || raw.includes('italiano')) {
      return 'it';
    }
    if (raw.startsWith('en') || raw.includes('english')) return 'en';
    return raw.slice(0, 2);
  }
  // ISRC country prefix (e.g. IT-A00-12-00001 → IT)
  const isrc = String(track?.isrc || track?.external_ids?.isrc || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (isrc.length >= 2) {
    const cc = isrc.slice(0, 2);
    if (cc === 'IT') return 'it';
    if (cc === 'US' || cc === 'GB' || cc === 'AU' || cc === 'CA') return 'en';
  }
  return null;
}

function genreLocaleHits(text, hints) {
  let hits = 0;
  for (const hint of hints) {
    if (text.includes(hint)) hits += 1;
  }
  return hits;
}

function labelLocaleHits(track) {
  const label = String(track?.recordLabel || track?.label || '').toLowerCase();
  if (!label) return 0;
  let hits = 0;
  for (const hint of IT_LABEL_HINTS) {
    if (label.includes(hint)) hits += 1;
  }
  return hits;
}

/**
 * Heuristic affinity of a library track to a target locale language ∈ [0, 1].
 * Uses explicit language / ISRC, genre tags, labels, known artists, lexical cues, accents.
 * @param {object} track
 * @param {'it'|'en'} locale
 * @returns {number}
 */
export function nativeLanguageAffinity(track, locale = musicUiLocale()) {
  const text = trackText(track);
  if (!text) return 0.28;

  const explicit = explicitLang(track);
  if (explicit === locale) return 0.99;
  if (explicit && explicit !== locale) return 0.05;

  const titleArtist = `${track?.title || ''} ${track?.artist || ''} ${track?.album || ''}`;
  const tokens = tokenize(titleArtist);
  let score = 0.22;

  if (locale === 'it') {
    const gHits = genreLocaleHits(text, IT_GENRE_HINTS);
    if (gHits > 0) score += Math.min(0.5, 0.28 + gHits * 0.14);

    const lHits = labelLocaleHits(track);
    if (lHits > 0) score += Math.min(0.22, 0.12 + lHits * 0.08);

    if (artistLooksItalian(track)) score += 0.42;

    let strong = 0;
    let weak = 0;
    for (const tok of tokens) {
      if (IT_STRONG_WORDS.has(tok)) strong += 1;
      else if (IT_WEAK_WORDS.has(tok)) weak += 1;
    }
    if (strong >= 2) score += 0.36;
    else if (strong === 1) score += 0.22;
    else if (weak >= 2) score += 0.12;
    else if (weak === 1) score += 0.04;

    if (/[àèéìòù]/i.test(titleArtist)) score += 0.14;

    // Strong English-only signal → lower affinity for Italian native mode
    let enWords = 0;
    for (const tok of tokens) {
      if (EN_STOPWORDS.has(tok)) enWords += 1;
    }
    if (
      enWords >= 3 &&
      strong === 0 &&
      gHits === 0 &&
      lHits === 0 &&
      !artistLooksItalian(track)
    ) {
      score -= 0.28;
    }
  } else {
    // English UI native: prefer English cues; soft-penalize clear Italian
    const gHits = genreLocaleHits(text, EN_GENRE_HINTS);
    if (gHits > 0) score += Math.min(0.35, 0.18 + gHits * 0.1);

    let enWords = 0;
    for (const tok of tokens) {
      if (EN_STOPWORDS.has(tok)) enWords += 1;
    }
    if (enWords >= 2) score += 0.28;
    else if (enWords === 1) score += 0.12;

    const itHits = genreLocaleHits(text, IT_GENRE_HINTS);
    let itStrong = 0;
    for (const tok of tokens) {
      if (IT_STRONG_WORDS.has(tok)) itStrong += 1;
    }
    if (
      itHits > 0 ||
      itStrong >= 2 ||
      artistLooksItalian(track) ||
      /[àèéìòù]/i.test(titleArtist)
    ) {
      score -= 0.38;
    } else if (itStrong === 1) {
      score -= 0.14;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * @param {object} track
 * @param {'it'|'en'} [locale]
 * @returns {boolean}
 */
export function isLikelyNativeLanguage(track, locale = musicUiLocale()) {
  return nativeLanguageAffinity(track, locale) >= NATIVE_MATCH_THRESHOLD;
}

/**
 * Apply native-language bias to a mood score (international → unchanged).
 * @param {number} moodScore
 * @param {object} track
 * @param {{ musicLanguageMode?: string, uiLocale?: 'it'|'en' }} [options]
 * @returns {number}
 */
export function applyMusicLanguageBias(moodScore, track, options = {}) {
  const mode = normalizeMusicLanguageMode(options.musicLanguageMode);
  if (mode !== MUSIC_LANGUAGE_NATIVE) {
    return Math.max(0, Math.min(1, moodScore));
  }
  const locale = options.uiLocale || musicUiLocale();
  const affinity = nativeLanguageAffinity(track, locale);
  // Blend + multiplicative floor so low-affinity tracks cannot outrank strong matches
  // merely via mood when enough native material exists.
  const blended =
    moodScore * (1 - NATIVE_LANGUAGE_WEIGHT) + affinity * NATIVE_LANGUAGE_WEIGHT;
  const gated = blended * (0.42 + 0.58 * affinity);
  return Math.max(0, Math.min(1, gated));
}

function textLooksItalian(query) {
  const q = String(query || '').toLowerCase();
  if (!q) return false;
  if (/[àèéìòù]/i.test(q)) return true;
  if (/\b(italiano|italiana|canzone italiana|musica italiana)\b/i.test(q)) {
    return true;
  }
  const tokens = tokenize(q);
  let strong = 0;
  for (const tok of tokens) {
    if (IT_STRONG_WORDS.has(tok)) strong += 1;
  }
  return strong >= 2;
}

/**
 * Search-query language hint (native mode, search URLs only).
 * @param {'native'|'international'} mode
 * @param {'it'|'en'} [locale]
 * @param {string} [query] — existing query; skip suffix if already language-clear
 * @returns {string} empty or a short suffix
 */
export function languageSearchSuffix(mode, locale = musicUiLocale(), query = '') {
  if (normalizeMusicLanguageMode(mode) !== MUSIC_LANGUAGE_NATIVE) return '';
  if (locale === 'it') {
    if (textLooksItalian(query)) return '';
    return 'canzone italiana';
  }
  if (locale === 'en') {
    const q = String(query || '').toLowerCase();
    if (/\b(english|lyrics)\b/i.test(q)) return '';
    // Don't append if query already looks clearly English (many EN stopwords)
    const tokens = tokenize(q);
    let en = 0;
    for (const tok of tokens) {
      if (EN_STOPWORDS.has(tok)) en += 1;
    }
    if (en >= 2) return '';
    return 'english lyrics';
  }
  return '';
}

/**
 * @param {string} query
 * @param {{ musicLanguageMode?: string, uiLocale?: 'it'|'en' }} [options]
 * @returns {string}
 */
export function withLanguageSearchHint(query, options = {}) {
  const base = String(query || '').trim();
  if (!base) return base;
  const locale = options.uiLocale || musicUiLocale();
  const suffix = languageSearchSuffix(options.musicLanguageMode, locale, base);
  if (!suffix) return base;
  if (new RegExp(`\\b${suffix.replace(/\s+/g, '\\s+')}\\b`, 'i').test(base)) {
    return base;
  }
  return `${base} ${suffix}`;
}
