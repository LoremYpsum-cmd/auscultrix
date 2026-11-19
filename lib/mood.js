/**
 * Auscultrix affect engine 5.0 — from a few words to a point in Russell's circumplex.
 *
 * Pipeline (all on-device, deterministic, < 1 ms on a typical sentence):
 *   1. normalize  — lowercase, strip diacritics, expand contractions (n't → not)
 *   2. tokenize   — words, emoji kept aside, clause boundaries remembered
 *   3. match      — longest lexicon match per position (phrases before stems)
 *   4. modify     — negation scope (4 tokens, closed by clause boundary),
 *                   degree adverbs and -issimo, contrastive "ma / but" weighting
 *                   (rules adapted from VADER, Hutto & Gilbert 2014)
 *   5. aggregate  — weighted mean of (valence, arousal); confidence grows with
 *                   evidence; the energy slider is fused as a self-report (SAM,
 *                   Bradley & Lang 1994)
 *   6. ISO target — iso principle (Altshuler 1948; Heiderscheit & Madson 2015):
 *                   start where the person is, then move at most ISO_MAX_STEP
 *                   per session toward a gentler region of the plane.
 *
 * Evaluated with tests/eval.mjs on tests/mood-gold.tsv (development) and
 * tests/mood-heldout.tsv (held out). The output object keeps every field of
 * the 4.x heuristic, so playlist, visuals, wellbeing tips and the user model
 * work unchanged. This is not a diagnosis. Raw text is never stored.
 */

import { t } from './i18n.js';
import { detectListenerAge, kidsPreferredGenres } from './listener-age.js';
import {
  LEXICON, EMOJI, NEGATORS, NEGATION_SCOPE, BOOSTERS, DAMPENERS, DAMPENER_PHRASES, CONTRAST, BOUNDARY,
} from './affect-lexicon.js';

export const ENGINE_VERSION = 'affect-5.0';
/** Largest move per session on each axis of the plane (gradual ISO shift). */
export const ISO_MAX_STEP = 0.3;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const numOr = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ─── 1. normalize ──────────────────────────────────────────────────────────
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/n't\b/g, ' not')
    .replace(/\b(\w+)'(m|re|s|ve|ll|d)\b/g, '$1$2')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, ' ');
}

// ─── 2. tokenize ───────────────────────────────────────────────────────────
/** @returns {{ w: string, clause: number, boundaryBefore: boolean, contrast?: boolean }[]} */
export function tokenize(norm) {
  const out = [];
  let clause = 0;
  let boundary = false;
  for (const m of norm.matchAll(/[a-z0-9%]+|[.,;:!?\n]+/g)) {
    const w = m[0];
    if (/^[.,;:!?\n]+$/.test(w)) { boundary = true; continue; }
    if (CONTRAST.has(w)) {
      clause += 1;
      out.push({ w, clause, boundaryBefore: true, contrast: true });
      boundary = true;
      continue;
    }
    if (BOUNDARY.has(w)) { boundary = true; continue; }
    out.push({ w, clause, boundaryBefore: boundary });
    boundary = false;
  }
  return out;
}

// Pre-compiled lexicon: phrases as token arrays, stems sorted longest-first.
const PHRASES = [];
const STEMS = [];
for (const e of LEXICON) {
  for (const p of e.phrases || []) PHRASES.push({ toks: normalize(p).split(/\s+/).filter(Boolean), e });
  for (const s of e.stems || []) STEMS.push({ stem: normalize(s), e });
}
PHRASES.sort((a, b) => b.toks.length - a.toks.length);
STEMS.sort((a, b) => b.stem.length - a.stem.length);
const DAMPEN_PHRASES = DAMPENER_PHRASES.map(([p, f]) => ({ toks: p.split(' '), f }));

// ─── 3–4. match + modify ───────────────────────────────────────────────────
/** @returns {boolean|'superlative'} */
function negatedAt(tokens, i) {
  if (tokens[i].boundaryBefore) return false;
  for (let k = i - 1; k >= Math.max(0, i - NEGATION_SCOPE); k--) {
    if (NEGATORS.has(tokens[k].w)) {
      // "mai stato cosi felice" / "never been so happy": comparative, not negation
      const between = tokens.slice(k + 1, i).map((x) => x.w);
      if (['mai', 'never'].includes(tokens[k].w) && between.some((w) => ['cosi', 'piu', 'so', 'more', 'happier'].includes(w))) {
        return 'superlative';
      }
      return true;
    }
    // a boundary sits *before* token k: tokens before k are out of scope
    if (tokens[k].boundaryBefore || tokens[k].contrast) return false;
  }
  return false;
}

function degreeAt(tokens, i, len = 1) {
  let f = 1;
  for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
    const w = tokens[k].w;
    if (BOOSTERS.has(w)) f *= BOOSTERS.get(w);
    if (DAMPENERS.has(w)) f *= DAMPENERS.get(w);
    if (tokens[k].boundaryBefore) break;
  }
  for (let j = i; j < i + len; j++) if (/issim[oaie]$/.test(tokens[j].w)) { f *= 1.35; break; }
  return f;
}

/** Returns the list of affective hits with all modifiers applied. */
export function extractHits(raw) {
  const tokens = tokenize(normalize(raw));
  const lastClause = tokens.length ? tokens[tokens.length - 1].clause : 0;
  const hits = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].contrast) continue;
    let match = null;
    let len = 1;
    for (const ph of PHRASES) {
      if (i + ph.toks.length > tokens.length) continue;
      let ok = true;
      for (let j = 0; j < ph.toks.length; j++) if (tokens[i + j].w !== ph.toks[j]) { ok = false; break; }
      if (ok) { match = ph.e; len = ph.toks.length; break; }
    }
    if (!match) {
      const w = tokens[i].w;
      for (const st of STEMS) if (w.startsWith(st.stem)) { match = st.e; break; }
    }
    if (!match) continue;

    let v = match.v;
    let a = match.a;
    let c = match.c;
    let f = degreeAt(tokens, i, len);
    for (const d of DAMPEN_PHRASES) {
      const s = i - d.toks.length;
      if (s >= 0 && d.toks.every((tk, j) => tokens[s + j].w === tk)) f *= d.f;
    }
    v = clamp01(0.5 + (v - 0.5) * f);
    a = clamp01(0.5 + (a - 0.5) * Math.sqrt(f));

    let negated = negatedAt(tokens, i);
    if (negated === 'superlative') {
      negated = false;
      v = clamp01(0.5 + (v - 0.5) * 1.3);
    }
    if (negated) {
      if (v >= 0.5) {
        // "non sto bene", "not happy": a clear negative, low rather than agitated
        v = 0.5 - (v - 0.5) * 0.8;
        c = 'neg';
        a = 0.5 + (a - 0.5) * 0.5 - 0.12;
      } else {
        // "non sono triste": only a faint positive, the state is not named
        v = 0.5 + (0.5 - v) * 0.22;
        c = 'neutral';
        a = 0.5 + (a - 0.5) * 0.5;
      }
    }
    const contrastW = lastClause === 0 ? 1 : tokens[i].clause === lastClause ? 1.5 : 0.5;
    const salience = 0.5 + Math.hypot(v - 0.5, a - 0.5);
    hits.push({ text: tokens.slice(i, i + len).map((x) => x.w).join(' '), v, a, c, negated: !!negated, w: contrastW * salience });
    i += len - 1;
  }

  for (const em of EMOJI) {
    if (em.re.test(String(raw || ''))) {
      hits.push({ text: 'emoji', v: em.v, a: em.a, c: em.c, negated: false, w: 1.1 });
    }
  }
  return hits;
}

// ─── 5. aggregate ──────────────────────────────────────────────────────────
export function estimateAffect(raw, sliderEnergy = 0.5) {
  const hits = extractHits(raw);
  const W = hits.reduce((s, h) => s + h.w, 0);
  const slider = clamp01(numOr(sliderEnergy, 0.5));
  const sliderMoved = Math.abs(slider - 0.5) > 0.02;
  if (!W) {
    return { valence: 0.5, arousal: slider, confidence: 0, hits, cats: {}, sliderMoved };
  }
  const textV = hits.reduce((s, h) => s + h.v * h.w, 0) / W;
  const textA = hits.reduce((s, h) => s + h.a * h.w, 0) / W;
  const confidence = 1 - Math.exp(-W);
  // Self-report fusion: a moved slider is an explicit statement about energy.
  const arousal = sliderMoved ? 0.5 * textA + 0.5 * slider : confidence * textA + (1 - confidence) * slider;
  const cats = {};
  for (const h of hits) cats[h.c] = (cats[h.c] || 0) + h.w;
  return { valence: clamp01(textV), arousal: clamp01(arousal), confidence, hits, cats, sliderMoved };
}

const share = (cats, keys) => {
  const tot = Object.values(cats).reduce((s, x) => s + x, 0) || 1;
  return keys.reduce((s, k) => s + (cats[k] || 0), 0) / tot;
};

// ─── 6. ISO target ─────────────────────────────────────────────────────────
function step(from, to) {
  const d = Math.max(-ISO_MAX_STEP, Math.min(ISO_MAX_STEP, to - from));
  return clamp01(from + d);
}

export function isoTarget({ valence: v, arousal: a }, flags) {
  let tv = v;
  let ta = a;
  if (flags.isAnxious || flags.isAngry || (v < 0.45 && a > 0.62)) {
    ta = 0.32; tv = Math.max(v + 0.25, 0.55);                                   // down-regulate arousal, lift valence
  } else if (flags.isSad || flags.isUnmotivated || v < 0.45) {
    tv = Math.max(v + 0.25, 0.48); ta = Math.max(a, Math.min(a + 0.2, 0.5));     // lift slowly
  } else if (flags.wantsRelaxation) {
    ta = Math.min(a, 0.3); tv = Math.max(v, 0.58);
  } else if (v >= 0.62) {
    ta = a; tv = Math.max(v, 0.7);                                               // sustain good states
  } else {
    tv = v + 0.08; ta = a * 0.85 + 0.5 * 0.15;
  }
  // Bound the move in the Russell plane (Euclidean, like the playlist metric).
  // ≤ 5.0 bounded each axis separately, so a diagonal move could reach
  // 0.3·√2 ≈ 0.42; now the whole displacement is scaled to ≤ ISO_MAX_STEP.
  let dv = step(v, tv) - v;
  let da = step(a, ta) - a;
  const dist = Math.hypot(dv, da);
  if (dist > ISO_MAX_STEP) {
    const k = ISO_MAX_STEP / dist;
    dv *= k;
    da *= k;
  }
  return { targetValence: clamp01(v + dv), targetEnergy: clamp01(a + da) };
}

// ─── public API (4.x compatible) ───────────────────────────────────────────
/**
 * @param {{ input: string, energy: number }} opts
 */
export function analyzeMoodHeuristic({ input, energy }) {
  const raw = String(input || '');
  const est = estimateAffect(raw, energy);
  const { valence, arousal, confidence, cats } = est;
  const has = (...k) => k.some((x) => (cats[x] || 0) > 0);
  const neg = valence < 0.45;

  const isAnxious = has('anx', 'stress') && neg;
  const isAngry = has('anger') && neg;
  const isSad = has('sad', 'lonely', 'neg', 'nostalgia') && neg && !isAnxious && !isAngry;
  const isEuphoric = valence >= 0.82 && arousal >= 0.7;
  const isHappy = valence >= 0.62 && share(cats, ['calm', 'calm_need']) < 0.5;
  const isUnmotivated = has('tired', 'apathy') && arousal < 0.4;
  const isMotivated = has('drive') && arousal >= 0.6 && !neg;
  const wantsRelaxation = has('calm_need', 'calm');
  const wantsFocus = has('focus');
  const hasEmoji = est.hits.some((h) => h.text === 'emoji');
  const anyNegation = est.hits.some((h) => h.negated);

  const motivation = isUnmotivated ? 0.2
    : isEuphoric ? 0.95
      : isMotivated ? 0.85
        : isSad ? 0.25
          : isHappy ? 0.75
            : arousal * 0.7;
  const isLowMotivation = motivation < 0.4;
  const isHighMotivation = motivation >= 0.7;
  const motivationGoal = isLowMotivation ? clamp01(motivation + 0.35)
    : isHighMotivation ? motivation : clamp01(motivation + 0.15);

  const flags = { isAnxious, isAngry, isSad, isUnmotivated, wantsRelaxation };
  let { targetValence, targetEnergy } = isoTarget({ valence, arousal }, flags);

  const listenerAgeInfo = detectListenerAge(raw);
  let energyOut = arousal;
  if (listenerAgeInfo.kidsMode) {
    const caps = { '0-3': [0.35, 0.32, 0.6], '4-7': [0.55, 0.5, 0.58], '8-12': [0.7, 0.65, 0] }[listenerAgeInfo.ageBand];
    if (caps) {
      energyOut = Math.min(energyOut, caps[0]);
      targetEnergy = Math.min(targetEnergy, caps[1]);
      targetValence = Math.max(targetValence, caps[2]);
    }
  }

  const influences = [
    ...(isUnmotivated ? ['stanchezza o apatia percepita'] : []),
    ...(isMotivated ? ['energia e determinazione'] : []),
    ...(isSad ? ['umore basso'] : []),
    ...(isEuphoric ? ['euforia / sto alla grande'] : []),
    ...(isHappy && !isEuphoric ? ['stato positivo'] : []),
    ...(isAnxious ? ['stress e preoccupazione'] : []),
    ...(isAngry ? ['rabbia o frustrazione'] : []),
    ...(arousal > 0.6 ? ['alta energia dichiarata'] : []),
    ...(arousal < 0.4 ? ['bassa energia dichiarata'] : []),
    ...(wantsRelaxation ? ['bisogno di rilassamento'] : []),
    ...(wantsFocus ? ['bisogno di concentrazione'] : []),
    ...(anyNegation ? ['negazione riconosciuta'] : []),
    ...(hasEmoji ? ['segnali emotivi da emoji'] : []),
  ];

  const emotion = isAnxious ? 'anxiety'
    : isAngry ? 'anger'
      : isSad ? 'sadness'
        : isHappy ? 'happiness'
          : 'neutral';

  const negShare = share(cats, ['anx', 'stress', 'anger']);

  return {
    emotion,
    secondaryEmotions: [
      ...(isSad ? ['melancholy'] : []),
      ...(has('lonely') ? ['loneliness'] : []),
      ...(isEuphoric ? ['euphoria', 'joy'] : []),
      ...(isHappy && !isEuphoric ? ['joy'] : []),
      ...(isAnxious || isAngry ? ['tension'] : []),
      ...(isAngry ? ['anger'] : []),
      ...(isUnmotivated ? ['apathy'] : []),
      ...(isMotivated ? ['drive'] : []),
      ...(wantsRelaxation ? ['calm'] : []),
      ...(has('nostalgia') ? ['nostalgia'] : []),
      ...(listenerAgeInfo.kidsMode ? ['child'] : []),
    ],
    energy: energyOut,
    arousal,
    valence,
    targetEnergy,
    targetValence,
    confidence,
    stress: isAnxious || isAngry ? clamp01(0.55 + 0.35 * negShare) : wantsRelaxation ? 0.25 : 0.3,
    motivation,
    motivationGoal,
    isLowMotivation,
    isHighMotivation,
    concentration: wantsFocus ? 0.85 : 0.5,
    relaxation: wantsRelaxation ? 0.85 : 1.0 - energyOut * 0.5,
    nostalgia: has('nostalgia') ? 0.7 : isSad ? 0.6 : 0.2,
    romanticism: has('love') ? 0.7 : 0.3,
    happiness: isEuphoric ? 0.95 : isHappy ? clamp01(0.45 + valence * 0.45) : 0.3,
    sadness: isSad ? clamp01(0.55 + (0.45 - valence)) : 0.2,
    anger: isAngry ? 0.75 : 0.1,
    anxiety: isAnxious ? clamp01(0.6 + (arousal - 0.6) * 0.8) : 0.2,
    motivationInsight: isLowMotivation ? t('insight_motivation_low')
      : isHighMotivation ? t('insight_motivation_high') : t('insight_motivation_mid'),
    musicTherapyDirection: isLowMotivation ? t('insight_direction_low')
      : isHighMotivation ? t('insight_direction_high') : t('insight_direction_mid'),
    rehabilitationInsight: isAnxious || isAngry ? t('insight_rehab_anxious')
      : isSad ? t('insight_rehab_sad') : t('insight_rehab_neutral'),
    motivationInfluences: influences.length ? influences : ['stato generale'],
    rawInput: raw,
    aiProviderId: 'heuristic',
    engine: ENGINE_VERSION,
    isoPrinciple: true,
    listenerAge: listenerAgeInfo.age,
    ageBand: listenerAgeInfo.ageBand,
    kidsMode: listenerAgeInfo.kidsMode,
    listenerAgeSignal: listenerAgeInfo.signal,
  };
}

const KEYWORD_GENRE_RULES = [
  { keywords: ['trist', 'sad', 'depress', 'malincon', 'piang'], genres: ['ambient', 'indie', 'folk', 'soul', 'classical'] },
  { keywords: ['felic', 'happy', 'gioi', 'content', 'alleg'], genres: ['pop', 'funk', 'disco', 'reggae', 'italian'] },
  { keywords: ['ansios', 'anxi', 'ansia', 'preoccup', 'agitat', 'panico'], genres: ['ambient', 'classical', 'lo-fi', 'focus', 'acoustic'] },
  { keywords: ['stress', 'stressed', 'teso'], genres: ['ambient', 'classical', 'lo-fi', 'jazz', 'acoustic'] },
  { keywords: ['energ', 'caric', 'motivat', 'determinat', 'voglio energ', 'power', 'workout'], genres: ['edm', 'rock', 'pop', 'motivational', 'hip-hop', 'metal'] },
  { keywords: ['stanc', 'tired', 'demotiv', 'apat', 'esaust', 'no voglia'], genres: ['motivational', 'pop', 'rock', 'edm'] },
  { keywords: ['rilass', 'relax', 'calm', 'pace', 'seren'], genres: ['ambient', 'classical', 'jazz', 'acoustic', 'lo-fi'] },
  { keywords: ['concentr', 'focus', 'studio', 'study'], genres: ['lo-fi', 'focus', 'ambient', 'classical', 'instrumental'] },
  { keywords: ['nostalg', 'ricord'], genres: ['rock', 'folk', 'indie', 'italian', 'synthwave'] },
  { keywords: ['romant', 'amore', 'love'], genres: ['r&b', 'jazz', 'pop', 'italian', 'acoustic'] },
  { keywords: ['arrabbi', 'rabbia', 'angry', 'fur'], genres: ['rock', 'metal', 'grunge', 'industrial'] },
  { keywords: ['party', 'fest', 'ball'], genres: ['pop', 'edm', 'funk', 'disco', 'dance'] },
];

function moodCorpus(mood) {
  if (!mood || typeof mood !== 'object') return '';
  return [
    mood.emotion,
    ...(mood.secondaryEmotions || []),
    mood.rawInput || '',
    mood.musicTherapyDirection || '',
    mood.motivationInsight || '',
    ...(mood.motivationInfluences || []),
    mood.rehabilitationInsight || '',
  ]
    .join(' ')
    .toLowerCase();
}

function matchesAny(corpus, keywords) {
  return keywords.some((k) => corpus.includes(k));
}

function addScores(scores, genres, weight) {
  genres.forEach((g, i) => {
    scores[g] = (scores[g] || 0) + weight * (genres.length - i);
  });
}

export function preferredGenres(mood) {
  if (!mood || typeof mood !== 'object') return [];
  const corpus = moodCorpus(mood);
  const scores = {};
  for (const rule of KEYWORD_GENRE_RULES) {
    if (!matchesAny(corpus, rule.keywords)) continue;
    addScores(scores, rule.genres, 1);
  }
  switch ((mood.emotion || '').toLowerCase()) {
    case 'sadness':
      addScores(scores, ['ambient', 'indie', 'folk', 'classical'], 3);
      break;
    case 'happiness':
      addScores(scores, ['pop', 'funk', 'reggae', 'italian'], 3);
      break;
    case 'anxiety':
      addScores(scores, ['ambient', 'classical', 'lo-fi', 'acoustic'], 3);
      break;
    default:
      break;
  }
  if (mood?.kidsMode) {
    addScores(scores, kidsPreferredGenres(mood.ageBand || '4-7'), 5);
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
}

export function genreMatchScore(trackGenre, mood) {
  if (!trackGenre) return 0;
  if (!mood || typeof mood !== 'object') return 0;
  const preferred = preferredGenres(mood);
  if (!preferred.length) return 0;
  const normalized = trackGenre.toLowerCase();
  for (let i = 0; i < preferred.length; i++) {
    const genre = preferred[i];
    if (normalized.includes(genre) || genre.includes(normalized)) {
      return clamp01(Math.max(0.4, 1.0 - i * 0.08));
    }
  }
  const corpus = moodCorpus(mood);
  for (const rule of KEYWORD_GENRE_RULES) {
    if (!matchesAny(corpus, rule.keywords)) continue;
    for (const genre of rule.genres) {
      if (normalized.includes(genre)) return 0.55;
    }
  }
  return 0;
}
