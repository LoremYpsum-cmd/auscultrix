/**
 * Detect listener age / child signals from «Come stai?» free text (IT + EN).
 * Used only to bias playlist selection toward age-appropriate music.
 * No clinical claims; local heuristic only.
 */

/** @typedef {'adult'|'0-3'|'4-7'|'8-12'|'13-17'} AgeBand */

/**
 * @typedef {object} ListenerAgeInfo
 * @property {number|null} age — parsed years when present
 * @property {AgeBand} ageBand
 * @property {boolean} kidsMode — true for bands needing family-safer music
 * @property {string} signal — short detection reason (debug / status)
 */

const ADULT = /** @type {ListenerAgeInfo} */ ({
  age: null,
  ageBand: 'adult',
  kidsMode: false,
  signal: '',
});

/**
 * @param {number} age
 * @returns {AgeBand}
 */
export function ageBandFromYears(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0) return 'adult';
  if (n <= 3) return '0-3';
  if (n <= 7) return '4-7';
  if (n <= 12) return '8-12';
  if (n <= 17) return '13-17';
  return 'adult';
}

/**
 * @param {AgeBand} band
 * @returns {boolean}
 */
export function isKidsModeBand(band) {
  return band === '0-3' || band === '4-7' || band === '8-12' || band === '13-17';
}

/**
 * Parse age / child cues from mood input.
 * @param {string} input
 * @returns {ListenerAgeInfo}
 */
export function detectListenerAge(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ...ADULT };

  const lower = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  /** @type {number|null} */
  let age = null;
  /** @type {string} */
  let signal = '';
  let kidsCue = false;
  let toddlerCue = false;

  const numericPatterns = [
    // IT first person: ho 2 anni / ho due anni
    // «ho 5 anni» but not «ho 5 anni di esperienza / fa / che…» (adults talk about years too)
    /\bho\s+(\d{1,2})\s+anni?\b(?!\s+(?:di|da|fa|che|in|e\s+mezzo\s+di|ormai\s+di)\b)/,
    /\bho\s+(un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici)\s+anni?\b(?!\s+(?:di|da|fa|che|in)\b)/,
    /\bson[oa]\s+(?:un[oa]?\s+)?(?:bambin[oa]|bimbo|bimba|ragazzin[oa])\s*(?:di\s+)?(\d{1,2})?\b/,
    /\b(?:bambin[oa]|bimbo|bimba|ragazzin[oa])\s+di\s+(\d{1,2})\s+anni?\b/,
    // EN first person
    /\bi\s*(?:'?m|am)\s+(\d{1,2})\s*(?:years?\s*old|yrs?\.?|yo)\b/,
    /\bi\s*(?:'?m|am)\s+(\d{1,2})\s+years?\b/,
    /\bi\s*(?:'?m|am)\s+(\d{1,2})\b(?!\s*(?:percent|%|euro|dollars?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|km|miles?|kg|lbs?|pounds?|points?|times?|steps?|pages?|floors?|\/|:|\.\d))/,
    /\b(\d{1,2})\s*(?:years?\s*old|yrs?\.?|yo)\b/,
    // Parent speaking about a child (still wants kids music)
    /\b(?:mio|mia|my)\s+(?:figlio|figlia|bambin[oa]|bimbo|bimba|son|daughter|kid|child)\s+(?:ha|is|has)?\s*(\d{1,2})\b/,
    /\b(?:figlio|figlia|bambin[oa]|son|daughter)\s+(?:ha|is|has)\s+(\d{1,2})\b/,
  ];

  const WORD_AGES = {
    un: 1,
    una: 1,
    due: 2,
    tre: 3,
    quattro: 4,
    cinque: 5,
    sei: 6,
    sette: 7,
    otto: 8,
    nove: 9,
    dieci: 10,
    undici: 11,
    dodici: 12,
  };

  for (const re of numericPatterns) {
    const m = lower.match(re);
    if (!m) continue;
    const token = m[1];
    if (token == null || token === '') {
      // e.g. «sono un bambino» matched without a number
      kidsCue = true;
      if (!signal) signal = m[0].trim();
      continue;
    }
    const n = WORD_AGES[token] ?? Number(token);
    if (Number.isFinite(n) && n >= 0 && n <= 99) {
      age = n;
      signal = m[0].trim();
      break;
    }
  }

  const childPhrases = [
    'sono un bambino',
    'sono una bambina',
    'sono un bimbo',
    'sono una bimba',
    'sono un ragazzino',
    'sono una ragazzina',
    'sono piccolo',
    'sono piccola',
    'vado all asilo',
    "vado all'asilo",
    'vado allasilo',
    'scuola materna',
    'scuola elementare',
    'i am a child',
    "i'm a child",
    'i am a kid',
    "i'm a kid",
    'i am a toddler',
    "i'm a toddler",
    'i am a baby',
    "i'm a baby",
    'little kid',
    'preschool',
    'kindergarten',
    'nursery school',
    'elementary school',
  ];

  const toddlerPhrases = [
    'ninna nanna',
    'ninnananna',
    'lullaby',
    'toddler',
    'neonato',
    'neonata',
    'bebè',
    'bebe',
    'infante',
  ];

  for (const p of childPhrases) {
    const compact = p.replace(/'/g, '');
    if (lower.includes(p) || lower.includes(compact)) {
      kidsCue = true;
      if (!signal) signal = p;
      break;
    }
  }
  for (const p of toddlerPhrases) {
    if (lower.includes(p)) {
      toddlerCue = true;
      kidsCue = true;
      if (!signal) signal = p;
      break;
    }
  }
  // «baby» alone is weak; only with child context or age already found
  if (!kidsCue && /\bbaby\b/.test(lower) && (age != null || /\b(?:i'?m|i am|sono)\b/.test(lower))) {
    toddlerCue = true;
    kidsCue = true;
    if (!signal) signal = 'baby';
  }

  if (age == null && !kidsCue) return { ...ADULT };

  if (age == null) {
    age = toddlerCue ? 2 : 7; // default when only qualitative child cue
  }

  let band = ageBandFromYears(age);
  if (kidsCue && band === 'adult' && age <= 17) {
    band = ageBandFromYears(age);
  }
  // Qualitative child without high age → keep in kids bands
  if (kidsCue && age > 17) {
    band = toddlerCue ? '0-3' : '4-7';
    age = toddlerCue ? 2 : 6;
  }

  if (!isKidsModeBand(band)) {
    return { age, ageBand: 'adult', kidsMode: false, signal };
  }

  return {
    age,
    ageBand: band,
    kidsMode: true,
    signal: signal || `age ${age}`,
  };
}

/** Soft / family-safe lexical cues in title·artist·genre·tags */
const KIDS_POSITIVE = [
  'lullaby',
  'ninna',
  'nanna',
  'nursery',
  'kids',
  'kid ',
  'children',
  'childrens',
  "children's",
  'bambini',
  'bambino',
  'canzone per bambini',
  'filastrocc',
  'twinkle',
  'nursery rhyme',
  'abc song',
  'alphabet',
  'brahms lullaby',
  'frere jacques',
  'frère jacques',
  'old macdonald',
  'wheels on the bus',
  'baby shark',
  'peppa',
  'cocomelon',
  'soft instrumental',
  'music box',
  'carillon',
  'berceuse',
  'family',
  'disney',
  'soundtrack kids',
];

const FAMILY_SOFT = [
  'ambient',
  'classical',
  'piano',
  'acoustic',
  'lo-fi',
  'lofi',
  'folk',
  'calm',
  'sleep',
  'lullaby',
  'instrumental',
  'guitar',
  'harp',
  'flute',
  'orchestra',
  'baroque',
  'chill',
  'soft',
  'gentle',
  'nursery',
];

const ADULT_HARD = [
  'explicit',
  'nsfw',
  'parental advisory',
  '[e]',
  '(explicit)',
  'xxx',
];

const AGGRESSIVE = [
  'metal',
  'death metal',
  'black metal',
  'grindcore',
  'hardcore',
  'punk',
  'industrial',
  'drill',
  'trap metal',
  'horrorcore',
  'gabber',
  'noise',
  'thrash',
  'slam',
  'pornogrind',
];

const ADULT_THEMES = [
  'erotic',
  'sex ',
  'sexy',
  'nude',
  'strip',
  'drugs',
  'cocaine',
  'heroin',
  'weed anthem',
  'kill ',
  'murder',
  'suicide',
  'rape',
];

function trackBlob(track) {
  const tags = Array.isArray(track?.tags)
    ? track.tags.join(' ')
    : Array.isArray(track?.genres)
      ? track.genres.join(' ')
      : '';
  return [
    track?.title,
    track?.artist,
    ...(track?.artists || []),
    track?.genre,
    track?.album,
    tags,
    track?.source,
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * @param {object} track
 * @param {ListenerAgeInfo|null|undefined} ageInfo
 * @returns {boolean} true = keep
 */
export function isAgeAppropriateTrack(track, ageInfo) {
  if (!ageInfo?.kidsMode) return true;
  const blob = trackBlob(track);
  const band = ageInfo.ageBand;

  if (ADULT_HARD.some((k) => blob.includes(k))) return false;
  if (ADULT_THEMES.some((k) => blob.includes(k))) return false;

  if (band === '0-3' || band === '4-7') {
    if (AGGRESSIVE.some((k) => blob.includes(k))) return false;
    if (track?.source === 'underground_corpus') return false;
    // High-arousal non-kids tracks out for toddlers/young kids
    const e = Number(track?.energy);
    if (Number.isFinite(e) && e > (band === '0-3' ? 0.42 : 0.62)) {
      const kidsHit = KIDS_POSITIVE.some((k) => blob.includes(k));
      if (!kidsHit) return false;
    }
  }

  if (band === '8-12') {
    if (AGGRESSIVE.some((k) => blob.includes(k))) return false;
  }

  if (band === '13-17') {
    // Soft: only hard-block explicit / adult themes (already above)
    return true;
  }

  return true;
}

/**
 * Score bias ∈ [-1, +1] added (scaled) into playlist ranking.
 * @param {object} track
 * @param {ListenerAgeInfo|null|undefined} ageInfo
 */
export function ageAppropriateScoreBias(track, ageInfo) {
  if (!ageInfo?.kidsMode) return 0;
  const blob = trackBlob(track);
  const band = ageInfo.ageBand;
  let bias = 0;

  if (KIDS_POSITIVE.some((k) => blob.includes(k))) bias += 0.45;
  if (FAMILY_SOFT.some((k) => blob.includes(k))) bias += 0.18;
  if (track?.source === 'kids_corpus') bias += 0.55;
  if (track?.source === 'musictherapy_corpus') {
    const tags = blob;
    if (tags.includes('calm') || tags.includes('piano') || tags.includes('classical')) {
      bias += band === '0-3' || band === '4-7' ? 0.22 : 0.1;
    }
  }
  if (track?.source === 'underground_corpus') {
    bias -= band === '8-12' ? 0.25 : band === '13-17' ? 0.08 : 0.5;
  }
  if (AGGRESSIVE.some((k) => blob.includes(k))) bias -= 0.7;
  if (ADULT_HARD.some((k) => blob.includes(k))) bias -= 1;

  const e = Number(track?.energy);
  if (Number.isFinite(e)) {
    if (band === '0-3' && e <= 0.35) bias += 0.12;
    if (band === '4-7' && e <= 0.5) bias += 0.08;
    if ((band === '0-3' || band === '4-7') && e >= 0.75) bias -= 0.2;
  }

  return Math.max(-1, Math.min(1, bias));
}

/**
 * @param {object[]} pool
 * @param {ListenerAgeInfo|null|undefined} ageInfo
 */
export function filterTracksForAge(pool, ageInfo) {
  if (!ageInfo?.kidsMode || !pool?.length) return pool || [];
  const kept = pool.filter((t) => isAgeAppropriateTrack(t, ageInfo));
  // Never return empty if filter was too strict — fall back to soft-biased original
  return kept.length ? kept : pool;
}

/**
 * Calm status line when kids mode is active.
 * @param {ListenerAgeInfo|null|undefined} ageInfo
 * @param {'it'|'en'} [locale]
 */
export function kidsMusicStatusLine(ageInfo, locale = 'it') {
  if (!ageInfo?.kidsMode) return '';
  if (locale === 'en') {
    if (ageInfo.ageBand === '0-3') return 'Music for the little ones';
    if (ageInfo.ageBand === '4-7') return 'Music suitable for young children';
    if (ageInfo.ageBand === '8-12') return 'Family-friendly music for kids';
    return 'Softer picks for teens';
  }
  if (ageInfo.ageBand === '0-3') return 'Musica per i più piccoli';
  if (ageInfo.ageBand === '4-7') return 'Musica adatta ai bambini';
  if (ageInfo.ageBand === '8-12') return 'Musica adatta ai ragazzi';
  return 'Selezione più soft per adolescenti';
}

/**
 * Preferred genre hints when kids mode is on (for mood.preferredGenres path).
 * @param {AgeBand} band
 * @returns {string[]}
 */
export function kidsPreferredGenres(band) {
  switch (band) {
    case '0-3':
      return ['lullaby', 'nursery', 'ambient', 'classical', 'piano', 'acoustic'];
    case '4-7':
      return ['kids', 'nursery', 'pop', 'folk', 'classical', 'acoustic', 'disney'];
    case '8-12':
      return ['pop', 'folk', 'acoustic', 'classical', 'indie', 'soundtrack'];
    case '13-17':
      return ['pop', 'indie', 'folk', 'electronic', 'rock'];
    default:
      return [];
  }
}
