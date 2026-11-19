/**
 * Mood-aware playlist scoring with ISO (iso-moodic) trajectory.
 * Matching (reflect current affect) → gradual shifting toward targetEnergy/targetValence
 * (Altshuler). Local-only — no Auscultrix servers.
 *
 * Publication zone: hard filter first (only music from the selected place);
 * «dal mondo» leaves the full pool unchanged.
 */

import { genreMatchScore } from './mood.js';
import {
  filterTracksByGeoZone,
  GEO_DEFAULT,
  GEO_WORLD,
  normalizeMusicGeoZone,
} from './music-geo.js';
import { musicUiLocale } from './music-language.js';
import { enrichTracksAudioFeatures } from './track-energy.js';
import { isAffectGrounded } from './affect-provenance.js';
import {
  ageAppropriateScoreBias,
  filterTracksForAge,
} from './listener-age.js';
import { mergeKidsCorpus } from './kids-corpus.js';

function listenerAgeFrom(mood, options = {}) {
  if (options.listenerAgeInfo) return options.listenerAgeInfo;
  if (mood?.kidsMode || options.kidsMode) {
    return {
      age: mood?.listenerAge ?? options.listenerAge ?? null,
      ageBand: mood?.ageBand || options.ageBand || '4-7',
      kidsMode: true,
      signal: mood?.listenerAgeSignal || '',
    };
  }
  return null;
}

const WEIGHTS = {
  energy: 0.14,
  valence: 0.14,
  stress: 0.05,
  motivation: 0.22,
  concentration: 0.04,
  relaxation: 0.05,
  nostalgia: 0.04,
  romanticism: 0.03,
  happiness: 0.07,
  sadness: 0.04,
  anger: 0.03,
  anxiety: 0.04,
  tasteAffinity: 0.06,
  keywordGenreMatch: 0.14,
};

const DEFAULT_PLAYLIST_SIZE = 40;
/** Share of the track score given to the distance from the ISO waypoint. */
export const ISO_PROXIMITY_WEIGHT = 0.7;
/** Width of the Gaussian proximity kernel in the Russell plane (design parameter). */
export const ISO_SIGMA = 0.15;
/** Sum of the context weights (everything in WEIGHTS but energy/valence, + low-motivation goal term). */
const CONTEXT_WEIGHT_SUM =
  Object.entries(WEIGHTS)
    .filter(([k]) => k !== 'energy' && k !== 'valence')
    .reduce((a, [, v]) => a + v, 0) + 0.04;
/** First fraction of playlist: strong matching to current mood (ISO phase 1). */
const MATCH_FRACTION = 0.28;

function similarity(a, b) {
  return 1 - Math.abs(a - b);
}

function aboveTarget(value, target) {
  if (value >= target) return 1;
  return similarity(value, target);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

const SQRT2 = Math.SQRT2;

/**
 * Euclidean proximity in Russell plane (energy × valence), 1 = same point.
 */
function russellProximity(e1, v1, e2, v2) {
  const d = Math.hypot(e1 - e2, v1 - v2);
  return 1 - d / SQRT2;
}

function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

/**
 * ISO shift window: the trajectory reaches the target within this much
 * listening time, then holds it ("consolidation"). Design parameter, not an
 * empirically optimised value (see docs/scientifico): with the 5.0 index-based
 * path a 40-track playlist took ~2.5 h to shift and ~40 min only to mirror.
 */
export const ISO_SHIFT_WINDOW_MS = 25 * 60 * 1000;
/** Duration assumed for a track whose length is unknown (typical pop track). */
export const DEFAULT_TRACK_MS = 210_000;

export function trackDurationMs(track) {
  const d = Number(track?.durationMs);
  return Number.isFinite(d) && d >= 30_000 && d <= 30 * 60_000 ? d : DEFAULT_TRACK_MS;
}

/**
 * Desired (energy, valence) along the ISO path.
 * - Time-based (preferred): pass opts.elapsedMs = listening time before this
 *   slot; t = elapsed / shift window, capped at 1 (then the path holds the target).
 * - Index-based (legacy, used when elapsedMs is absent): t = index / (size − 1).
 * Shape: matching phase (first 28 % of t, ≤ 18 % of the way), then smoothstep.
 * @returns {{ energy: number, valence: number, t: number, phase: 'matching'|'shifting'|'holding' }}
 */
export function isoWaypoint(mood, index, size, opts = {}) {
  let t;
  if (Number.isFinite(opts?.elapsedMs)) {
    const win = Number(opts.shiftWindowMs) > 0 ? Number(opts.shiftWindowMs) : ISO_SHIFT_WINDOW_MS;
    t = Math.max(0, Math.min(1, opts.elapsedMs / win));
  } else {
    const n = Math.max(1, size);
    t = n <= 1 ? 1 : index / (n - 1);
  }
  // Ease: linger on matching, then accelerate shift (smoothstep-ish)
  const matchEnd = MATCH_FRACTION;
  let u;
  if (t <= matchEnd) {
    u = (t / matchEnd) * 0.18; // stay near start
  } else {
    const s = (t - matchEnd) / (1 - matchEnd);
    u = 0.18 + 0.82 * (s * s * (3 - 2 * s));
  }
  const e0 = clamp01(mood?.energy ?? 0.5);
  const v0 = clamp01(mood?.valence ?? 0.5);
  const e1 = clamp01(mood?.targetEnergy ?? mood?.motivationGoal ?? e0);
  const v1 = clamp01(mood?.targetValence ?? (v0 + 0.1));
  const phase = t <= matchEnd ? 'matching' : t < 1 ? 'shifting' : 'holding';
  return { energy: lerp(e0, e1, u), valence: lerp(v0, v1, u), t: u, phase };
}

function isMotivationalGenre(track) {
  const genre = (track.genre || '').toLowerCase();
  return (
    genre.includes('motiv') ||
    genre.includes('uplift') ||
    genre.includes('energ') ||
    genre.includes('workout') ||
    genre.includes('pop')
  );
}

function motivationalCompatibility(track, mood) {
  const trackEnergy = track.energy ?? 0.5;
  const trackValence = track.valence ?? 0.5;
  const goal = mood.motivationGoal ?? 0.5;
  const motivGenre = isMotivationalGenre(track);

  if (mood.isLowMotivation) {
    return Math.min(
      1,
      aboveTarget(trackEnergy, goal) * 0.5 +
        aboveTarget(trackValence, goal) * 0.35 +
        (motivGenre ? 0.15 : 0),
    );
  }
  if (mood.isHighMotivation) {
    return Math.min(
      1,
      similarity(trackEnergy, mood.energy) * 0.4 +
        similarity(trackValence, mood.valence) * 0.35 +
        similarity(trackEnergy, mood.motivation) * 0.25,
    );
  }
  return Math.min(
    1,
    similarity(trackEnergy, goal) * 0.45 +
      similarity(trackValence, goal) * 0.35 +
      similarity(trackEnergy, mood.motivation) * 0.2,
  );
}

/**
 * Score track against a waypoint (energy/valence) + residual mood dims.
 * @param {object} track
 * @param {object} mood
 * @param {{ energy: number, valence: number }} waypoint
 * @param {string[]} [recentlyRecommendedTrackIds]
 * @param {{ musicGeoZone?: string, uiLocale?: 'it'|'en' }} [options]
 */
export function scoreTrackAtWaypoint(
  track,
  mood,
  waypoint,
  recentlyRecommendedTrackIds = [],
  options = {},
) {
  if (!track || typeof track !== 'object') return 0;
  if (!mood || typeof mood !== 'object') return 0;
  const wp = waypoint && typeof waypoint === 'object' ? waypoint : { energy: 0.5, valence: 0.5 };
  const trackEnergy = track.energy ?? 0.5;
  const trackValence = track.valence ?? 0.5;
  const w = WEIGHTS;
  let score = 0;

  // ISO trajectory: the distance to the waypoint in the Russell plane is the
  // main term (thesis §7.5). ≤ 5.0 gave it 28 % of the score while the other
  // heuristics — several anchored on the *target*, not on the waypoint —
  // pulled the first tracks away from the declared state, breaking the
  // matching phase. 5.1: Gaussian proximity kernel (σ = ISO_SIGMA) weighs
  // ISO_PROXIMITY_WEIGHT; the context heuristics below share the rest.
  const dWp = Math.hypot(trackEnergy - (wp.energy ?? 0.5), trackValence - (wp.valence ?? 0.5));
  const isoProximity = Math.exp(-(dWp * dWp) / (2 * ISO_SIGMA * ISO_SIGMA));

  if (mood.isLowMotivation) {
    const goal = mood.motivationGoal ?? 0.5;
    score += w.stress * similarity(1 - trackEnergy, mood.stress);
    score += w.motivation * motivationalCompatibility(track, mood);
    score += w.concentration * similarity(1 - trackEnergy, mood.concentration);
    score += w.relaxation * similarity(1 - trackEnergy, mood.relaxation);
    score += w.nostalgia * similarity(trackValence, mood.nostalgia);
    score += w.romanticism * similarity(trackValence, mood.romanticism);
    score += w.happiness * aboveTarget(trackValence, mood.happiness);
    score += w.sadness * similarity(1 - trackValence, mood.sadness);
    score += w.anger * similarity(trackEnergy, mood.anger);
    score += w.anxiety * similarity(1 - trackEnergy, mood.anxiety);
    score += 0.04 * aboveTarget(trackEnergy, goal);
  } else {
    score += w.stress * similarity(trackEnergy, mood.stress);
    score += w.motivation * motivationalCompatibility(track, mood);
    score += w.concentration * similarity(1 - trackEnergy, mood.concentration);
    score += w.relaxation * similarity(1 - trackEnergy, mood.relaxation);
    score += w.nostalgia * similarity(trackValence, mood.nostalgia);
    score += w.romanticism * similarity(trackValence, mood.romanticism);
    score += w.happiness * similarity(trackValence, mood.happiness);
    score += w.sadness * similarity(1 - trackValence, mood.sadness);
    score += w.anger * similarity(trackEnergy, mood.anger);
    score += w.anxiety * similarity(trackEnergy, mood.anxiety);
  }

  score += w.tasteAffinity * 0.5;
  score += w.keywordGenreMatch * genreMatchScore(track.genre, mood);

  // Context heuristics normalised to [0, 1], then blended under the ISO term.
  const contextScore = Math.max(0, Math.min(1, score / CONTEXT_WEIGHT_SUM));
  score = ISO_PROXIMITY_WEIGHT * isoProximity + (1 - ISO_PROXIMITY_WEIGHT) * contextScore;

  const ageInfo = listenerAgeFrom(mood, options);
  if (ageInfo?.kidsMode) {
    score += 0.28 * ageAppropriateScoreBias(track, ageInfo);
  }

  score = Math.max(0, Math.min(1, score));
  const recentList = Array.isArray(recentlyRecommendedTrackIds)
    ? recentlyRecommendedTrackIds
    : recentlyRecommendedTrackIds instanceof Set
      ? [...recentlyRecommendedTrackIds]
      : [];
  const recentHas =
    recentlyRecommendedTrackIds instanceof Set
      ? recentlyRecommendedTrackIds.has(track.id)
      : recentList.includes(track?.id);
  if (recentHas) {
    score = Math.max(0, score - 0.22);
  }
  // Session skip-signal: the person skipped a track quickly → avoid its
  // neighbourhood for the rest of this session (in-memory only, never stored).
  const avoid = Array.isArray(options?.avoidNeighborhood) ? options.avoidNeighborhood : [];
  if (avoid.length) {
    let prox = 0;
    for (const a of avoid) {
      if (!a || typeof a !== 'object') continue;
      const p = russellProximity(
        trackEnergy,
        trackValence,
        a.energy ?? 0.5,
        a.valence ?? 0.5,
      );
      if (p > prox) prox = p;
    }
    if (prox > 0.6) score = Math.max(0, score - 0.3 * prox);
  }
  return score;
}

/** @deprecated use scoreTrackAtWaypoint — kept for callers expecting mid-path score */
export function scoreTrack(track, mood, recentlyRecommendedTrackIds = [], options = {}) {
  const mid = isoWaypoint(mood, Math.floor(DEFAULT_PLAYLIST_SIZE / 2), DEFAULT_PLAYLIST_SIZE);
  return scoreTrackAtWaypoint(track, mood, mid, recentlyRecommendedTrackIds, options);
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deterministic per-track jitter for a given session: breaks the tie between
 * near-equal candidates so the same mood never yields the same playlist twice.
 * Returns a value in [0, 1).
 */
function sessionJitter(trackId, sessionSeed) {
  let h = sessionSeed >>> 0;
  const s = String(trackId || '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  }
  h = (h * 2654435761) >>> 0;
  return (h % 10_000) / 10_000;
}

/** Every Nth slot is reserved for tracks never recommended before (discovery). */
const DISCOVERY_SLOT_EVERY = 3;
/** Every Nth slot prefers literature-grounded therapy corpus (scientific core). */
const THERAPY_SLOT_EVERY = 4;
/** Max tracks by the same artist in one playlist (variety guarantee). */
const MAX_PER_ARTIST = 3;
/** Session-to-session variety: jitter amplitude added to each candidate score. */
const JITTER_AMPLITUDE = 0.07;
/** Bonus for tracks the person has never been offered. */
const FRESHNESS_BONUS = 0.06;
/** Extra nudge for fresh underground repertoire (quality discovery). */
const UNDERGROUND_BONUS = 0.04;
/** Priority for literature-grounded therapy corpus in ISO selection. */
const THERAPY_CORPUS_BONUS = 0.1;
/** Soft floor for other annotated corpora (Italian / underground). */
const ANNOTATED_CORPUS_BONUS = 0.04;
/** Soft penalty for curator-only tracks without MIR / corpus provenance. */
const CURATOR_UNGROUNDED_PENALTY = 0.06;

function isTherapyCorpus(track) {
  return (
    track?.source === 'musictherapy_corpus' ||
    track?.energySource === 'therapy_corpus' ||
    track?.valenceSource === 'therapy_corpus'
  );
}

function isAnnotatedCorpus(track) {
  // Hand-annotated corpora only. Italy/World Bandcamp entries carry a
  // catalogue placeholder (0.45/0.50) and are NOT annotations (≤ 5.0 bug).
  return (
    isTherapyCorpus(track) ||
    track?.energySource === 'underground_corpus' ||
    track?.energySource === 'italian_corpus' ||
    track?.energySource === 'kids_corpus'
  );
}

function hasMirProvenance(track) {
  const src = String(track?.energySource || '');
  return src.includes('mir') || src === 'spotify_audio_features';
}

/**
 * Scientific provenance boost: literature first, then annotated corpora,
 * then MIR-measured curator tracks; soft-penalize ungrounded estimates.
 */
function scientificProvenanceBonus(track) {
  if (isTherapyCorpus(track)) return THERAPY_CORPUS_BONUS;
  if (isAnnotatedCorpus(track)) return ANNOTATED_CORPUS_BONUS;
  if (hasMirProvenance(track)) return 0.02;
  const src = String(track?.energySource || '');
  if (src.includes('popularity') || src === 'unknown' || !src) {
    return -CURATOR_UNGROUNDED_PENALTY;
  }
  return 0;
}

/**
 * Build ISO playlist: for each slot, pick best unused track near that waypoint.
 */
function artistKey(track) {
  return String(track?.artist || '')
    .toLowerCase()
    .trim();
}

/** Consecutive tracks farther apart than this (Russell plane) are penalised. */
export const ISO_MAX_STEP_BETWEEN_TRACKS = 0.35;
const JUMP_PENALTY = 0.8;
/** In the holding phase, every Nth slot may host an uncalibrated discovery. */
const UNKNOWN_DISCOVERY_EVERY = 4;

function selectIsoTrajectory(pool, mood, size, sessionSeed, recent, geoOpts, extras = {}) {
  const used = new Set();
  const selected = [];
  const artistCounts = new Map();
  const recentSet = recent instanceof Set ? recent : new Set(recent || []);
  let candidates = seededShuffle(pool, sessionSeed);
  const hasFresh = candidates.some((t) => !recentSet.has(t.id));
  const hasTherapy = candidates.some((t) => isTherapyCorpus(t));
  const discoveryPool = Array.isArray(extras.discoveryPool) ? extras.discoveryPool : [];
  const shiftWindowMs = extras.shiftWindowMs ?? ISO_SHIFT_WINDOW_MS;
  let elapsedMs = 0;

  for (let i = 0; i < size; i++) {
    const wp = isoWaypoint(mood, i, size, { elapsedMs, shiftWindowMs });

    // Uncalibrated discoveries never enter the mood-matched arc: only after
    // the target is reached (holding phase), sparsely, and labelled as such.
    if (wp.phase === 'holding' && discoveryPool.length && i % UNKNOWN_DISCOVERY_EVERY === 0) {
      let pick = null;
      let pickScore = -1;
      for (const track of discoveryPool) {
        if (used.has(track.id)) continue;
        if ((artistCounts.get(artistKey(track)) || 0) >= MAX_PER_ARTIST) continue;
        const fresh = !recentSet.has(track.id);
        const s = (fresh ? FRESHNESS_BONUS : 0) + JITTER_AMPLITUDE * sessionJitter(track.id, sessionSeed);
        if (s > pickScore) {
          pickScore = s;
          pick = track;
        }
      }
      if (pick) {
        used.add(pick.id);
        artistCounts.set(artistKey(pick), (artistCounts.get(artistKey(pick)) || 0) + 1);
        selected.push({
          track: pick,
          score: pickScore,
          isoT: wp.t,
          phase: 'discovery',
          calibrated: false,
          waypointEnergy: wp.energy,
          waypointValence: wp.valence,
        });
        elapsedMs += trackDurationMs(pick);
        continue;
      }
    }

    // Discovery slots: reserved for music never offered before, so every
    // session brings something genuinely new (when the pool allows it).
    const discoverySlot = hasFresh && i % DISCOVERY_SLOT_EVERY === 1;
    // Therapy slots: keep the ISO path anchored in literature-grounded repertoire.
    const therapySlot = hasTherapy && i % THERAPY_SLOT_EVERY === 0;
    let best = null;
    let bestScore = -Infinity;
    // Continuity is judged against the last mood-calibrated pick (a labelled
    // discovery in between has unknown coordinates and must not reset it).
    let prev = null;
    for (let k = selected.length - 1; k >= 0; k--) {
      if (selected[k].calibrated !== false) {
        prev = selected[k].track;
        break;
      }
    }
    const prevCalibrated = !!prev;
    const consider = (track, { requireFresh, requireTherapy }) => {
      if (used.has(track.id)) return;
      // Artist diversity: never let one artist dominate the playlist
      if ((artistCounts.get(artistKey(track)) || 0) >= MAX_PER_ARTIST) return;
      const fresh = !recentSet.has(track.id);
      if (requireFresh && !fresh) return;
      if (requireTherapy && !isTherapyCorpus(track)) return;
      let s = scoreTrackAtWaypoint(track, mood, wp, recentSet, geoOpts);
      // Scientific provenance: literature-grounded tracks outrank taste alone
      s += scientificProvenanceBonus(track);
      // Freshness first: favour music the person hasn't been offered yet,
      // with a nudge for quality underground repertoire.
      if (fresh) {
        s += FRESHNESS_BONUS;
        if (track.source === 'underground_corpus') s += UNDERGROUND_BONUS;
      }
      // Session jitter: same mood, different day → different picks
      s += JITTER_AMPLITUDE * sessionJitter(track.id, sessionSeed);
      // ISO continuity: penalise big Euclidean jumps from the previous pick
      if (prev && prevCalibrated) {
        const jump = Math.hypot(
          (track.energy ?? 0.5) - (prev.energy ?? 0.5),
          (track.valence ?? 0.5) - (prev.valence ?? 0.5),
        );
        if (jump > ISO_MAX_STEP_BETWEEN_TRACKS) s -= JUMP_PENALTY * (jump - ISO_MAX_STEP_BETWEEN_TRACKS);
      }
      if (s > bestScore) {
        bestScore = s;
        best = track;
      }
    };
    for (const track of candidates) consider(track, { requireFresh: discoverySlot, requireTherapy: therapySlot });
    // Reserved slot with no candidate: fall back to the full pool for this index
    if (!best && (therapySlot || discoverySlot)) {
      for (const track of candidates) consider(track, { requireFresh: false, requireTherapy: false });
    }
    if (!best) break;
    used.add(best.id);
    artistCounts.set(artistKey(best), (artistCounts.get(artistKey(best)) || 0) + 1);
    selected.push({
      track: best,
      score: bestScore,
      isoT: wp.t,
      phase: wp.phase,
      calibrated: true,
      waypointEnergy: wp.energy,
      waypointValence: wp.valence,
    });
    elapsedMs += trackDurationMs(best);
  }
  return selected;
}

/** Minimum calibrated tracks needed to build an honest ISO path. */
export const MIN_CALIBRATED_POOL = 12;

/**
 * Not enough calibrated tracks (e.g. a small place selected): a discovery
 * list, honestly labelled — no ISO claim, artist variety kept.
 */
function discoveryList(pool, size, sessionSeed, recent) {
  const recentSet = recent instanceof Set ? recent : new Set(recent || []);
  const shuffled = seededShuffle(pool, sessionSeed);
  const fresh = shuffled.filter((t) => !recentSet.has(t.id));
  const ordered = [...fresh, ...shuffled.filter((t) => recentSet.has(t.id))];
  const out = [];
  const artistCounts = new Map();
  for (const track of ordered) {
    if (out.length >= size) break;
    if ((artistCounts.get(artistKey(track)) || 0) >= MAX_PER_ARTIST) continue;
    artistCounts.set(artistKey(track), (artistCounts.get(artistKey(track)) || 0) + 1);
    out.push({ track, score: 0, isoT: null, phase: 'discovery', calibrated: isAffectGrounded(track) });
  }
  return out;
}

/**
 * Rank tracks and return a playlist of top matches (ISO matching→shifting).
 * Hard-filters by publication zone when zone ≠ world; empty pool → empty playlist.
 * @returns {{ tracks: object[], scored: {track: object, score: number}[], iso: true, geoMatchCount: number, geoFiltered: boolean }}
 */
export function generatePlaylist(tracks, mood, options = {}) {
  const size = options.size ?? DEFAULT_PLAYLIST_SIZE;
  const recent = options.recentlyRecommendedTrackIds ?? [];
  const sessionSeed = options.sessionSeed ?? Date.now();
  const musicGeoZone = normalizeMusicGeoZone(
    options.musicGeoZone ?? GEO_DEFAULT,
  );
  const locale = options.uiLocale || musicUiLocale();
  const ageInfo = listenerAgeFrom(mood, options);
  const geoOpts = {
    musicGeoZone,
    uiLocale: locale,
    ageInfo,
    avoidNeighborhood: options.avoidNeighborhood ?? [],
  };
  const geoFiltered = musicGeoZone !== GEO_WORLD;

  if (!tracks?.length && !ageInfo?.kidsMode) {
    return {
      tracks: [],
      scored: [],
      iso: true,
      geoMatchCount: 0,
      geoFiltered,
      kidsMode: false,
    };
  }

  const enriched = enrichTracksAudioFeatures(tracks || []);
  let geoPool = filterTracksByGeoZone(enriched, musicGeoZone);
  // Kids: inject family-safe seed (world-scoped; not geo-blocked) then age-filter.
  if (ageInfo?.kidsMode) {
    geoPool = mergeKidsCorpus(geoPool, ageInfo.ageBand);
    geoPool = filterTracksForAge(geoPool, ageInfo);
  }
  const geoMatchCount = filterTracksByGeoZone(enriched, musicGeoZone).length;

  if (geoFiltered && geoMatchCount === 0 && !ageInfo?.kidsMode) {
    return {
      tracks: [],
      scored: [],
      iso: true,
      geoMatchCount: 0,
      geoFiltered: true,
      kidsMode: false,
    };
  }

  const grounded = geoPool.filter((t) => isAffectGrounded(t));
  const unknown = geoPool.filter((t) => !isAffectGrounded(t));
  const shiftWindowMs = options.shiftWindowMs ?? ISO_SHIFT_WINDOW_MS;

  let selected;
  let calibrated;
  if (grounded.length >= MIN_CALIBRATED_POOL) {
    // Keep compute bounded: rank calibrated tracks by closeness to the whole
    // path (start, middle, target) and keep the nearest 400.
    const startWp = isoWaypoint(mood, 0, size, { elapsedMs: 0, shiftWindowMs });
    const midWp = isoWaypoint(mood, 0, size, { elapsedMs: shiftWindowMs * 0.5, shiftWindowMs });
    const endWp = isoWaypoint(mood, 0, size, { elapsedMs: shiftWindowMs, shiftWindowMs });
    const nearPath = (t) => {
      const e = t.energy ?? 0.5;
      const v = t.valence ?? 0.5;
      return Math.max(
        russellProximity(e, v, startWp.energy, startWp.valence),
        russellProximity(e, v, midWp.energy, midWp.valence),
        russellProximity(e, v, endWp.energy, endWp.valence),
      ) + 0.05 * genreMatchScore(t.genre, mood);
    };
    const isoPool =
      grounded.length > 400
        ? grounded
            .map((t) => ({ t, q: nearPath(t) }))
            .sort((a, b) => b.q - a.q)
            .slice(0, 400)
            .map((x) => x.t)
        : grounded;
    const discoveryPool =
      options.allowUncalibratedDiscovery === false ? [] : seededShuffle(unknown, sessionSeed).slice(0, 150);
    selected = selectIsoTrajectory(isoPool, mood, size, sessionSeed, recent, geoOpts, {
      discoveryPool,
      shiftWindowMs,
    });
    calibrated = true;
  } else {
    selected = discoveryList(geoPool, size, sessionSeed, recent);
    calibrated = false;
  }

  const calibratedCount = selected.filter((s) => s.calibrated).length;
  return {
    tracks: selected.map((s) => ({
      ...s.track,
      isoPhase: s.phase,
      affectCalibrated: s.calibrated === true,
    })),
    scored: selected,
    iso: calibrated,
    calibration: {
      iso: calibrated,
      calibratedPool: grounded.length,
      uncalibratedPool: unknown.length,
      calibratedInPlaylist: calibratedCount,
      shiftWindowMs,
    },
    geoMatchCount,
    geoFiltered,
    kidsMode: !!ageInfo?.kidsMode,
    ageBand: ageInfo?.ageBand || 'adult',
  };
}
