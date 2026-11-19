/**
 * Auscultrix — generative soundscape, pure part (no Web Audio in this file).
 *
 * The soundscape is an algorithmic composition that follows the same ISO
 * trajectory as the playlist (lib/playlist.js → isoWaypoint): it starts on the
 * declared state (valence, arousal) and moves slowly toward the ISO target,
 * then holds it. Everything is computed on the device; nothing is fetched.
 *
 * Three layers, named after R. M. Schafer's soundscape categories
 * (The Tuning of the World, 1977):
 *   - keynote  → a drone («bordone», Augoyard & Torgue 1995): root, fifth and a
 *                modal third, additive synthesis, slow «breathing» envelope;
 *   - soundmark→ a procedural environmental texture (wind, sea, rain) made of
 *                filtered noise, after A. Farnell, Designing Sound (2010);
 *   - signals  → sparse bell-like events, placed in space (angle, radius) and
 *                attenuated with the inverse-distance law.
 *
 * The mapping from affect to sound uses the musical cues whose emotional
 * effect is best documented (Juslin & Laukka 2003; Gagnon & Peretz 2003;
 * Eerola, Friberg & Bresin 2013): mode and register for valence; tempo
 * (event density), loudness, brightness and articulation for arousal.
 * The table MAPPING_TABLE states every mapping, its type (one-to-one,
 * one-to-many, many-to-one) and its source. The effect of the soundscape on
 * the listener has NOT been measured: these are design rules grounded in
 * perception studies, not a validated intervention.
 *
 * Determinism: the same mood, settings and seed always produce the same score
 * (seeded PRNG), so a session can be archived, re-rendered and analysed.
 */
import { isoWaypoint, ISO_SHIFT_WINDOW_MS } from './playlist.js';

export const SOUNDSCAPE_VERSION = 'soundscape-1.0';

/** Control rate of the score: one set of parameters every N seconds. */
export const CONTROL_PERIOD_S = 10;

/**
 * Safety limits. They are applied in mapAffectToParams and again by the
 * audio graph (limiter), so no combination of inputs can exceed them.
 */
export const SAFETY = Object.freeze({
  /** linear gain of the master bus before the limiter */
  maxMasterGain: 0.5,
  /** brick-wall-like limiter on the master bus (dBFS) */
  limiterThresholdDb: -6,
  /** «crénau»: no sound starts or stops abruptly */
  minFadeInS: 8,
  minFadeOutS: 6,
  /** nothing below 40 Hz (inaudible rumble on laptops, masking of speech) */
  minFreqHz: 40,
  /** nothing above 12 kHz (harsh, and useless on small speakers) */
  maxFreqHz: 12000,
  /** at most one event every 2.5 s on average: never a pulse to entrain to */
  maxEventsPerMin: 24,
  /** amplitude modulation slower than 0.25 Hz: no tremolo, no flicker-like beat */
  maxLfoHz: 0.25,
  /** shortest attack of an event (avoids clicks) */
  minAttackS: 0.004,
});

/** Acoustic spaces (simulated). RT60 as in ISO 3382-1; open field = no reverb. */
export const SPACES = Object.freeze({
  room: { id: 'room', rt60: 0.6, preDelayS: 0.008, wet: 0.16 },
  hall: { id: 'hall', rt60: 2.8, preDelayS: 0.035, wet: 0.3 },
  open: { id: 'open', rt60: 0, preDelayS: 0, wet: 0 },
});

export const SOUNDMARKS = Object.freeze(['wind', 'sea', 'rain', 'none']);

/** Possible roots of the drone (Hz): A2, B2, C3, D3. Chosen once per seed. */
export const ROOTS_HZ = Object.freeze([110, 123.47, 130.81, 146.83]);

/**
 * Modes in just intonation (ratios to the root). Five-note collections avoid
 * semitone clashes when events overlap in the reverb.
 */
export const MODES = Object.freeze({
  minor: { id: 'minor', ratios: [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5], third: 6 / 5 },
  suspended: { id: 'suspended', ratios: [1, 9 / 8, 4 / 3, 3 / 2, 16 / 9], third: 4 / 3 },
  major: { id: 'major', ratios: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], third: 5 / 4 },
});

/** Valence thresholds between modes, with hysteresis (no flapping at a border). */
export const MODE_THRESHOLDS = Object.freeze({ low: 0.38, high: 0.6, hysteresis: 0.04 });

/**
 * Every mapping, stated once. Used by the documentation, the panel and the
 * tests (a parameter that is not here cannot be driven).
 */
export const MAPPING_TABLE = Object.freeze([
  { param: 'mode', from: ['valence'], type: 'one-to-one', cue: 'mode (minor / suspended / major)', ref: 'Gagnon & Peretz 2003; Eerola et al. 2013' },
  { param: 'registerOct', from: ['valence'], type: 'one-to-one', cue: 'register of the signals', ref: 'Eerola et al. 2013; Juslin & Laukka 2003' },
  { param: 'widthDeg', from: ['valence'], type: 'one-to-one', cue: 'spatial width of the signals', ref: 'design choice (not an emotional cue)' },
  { param: 'eventsPerMin', from: ['arousal'], type: 'one-to-one', cue: 'tempo / event density', ref: 'Gagnon & Peretz 2003; Juslin & Laukka 2003' },
  { param: 'attackS', from: ['arousal'], type: 'one-to-one', cue: 'articulation (attack)', ref: 'Juslin & Laukka 2003' },
  { param: 'decayS', from: ['arousal'], type: 'one-to-one', cue: 'articulation (legato)', ref: 'Juslin & Laukka 2003' },
  { param: 'droneDb', from: ['arousal'], type: 'one-to-one', cue: 'sound level', ref: 'Juslin & Laukka 2003; Eerola et al. 2013' },
  { param: 'textureDb', from: ['arousal'], type: 'one-to-one', cue: 'level of the masking texture', ref: 'Augoyard & Torgue 1995 (masking)' },
  { param: 'textureMotion', from: ['arousal'], type: 'one-to-one', cue: 'speed of the texture (gusts, waves, drops)', ref: 'Farnell 2010' },
  { param: 'breathHz', from: ['arousal'], type: 'one-to-one', cue: 'slow amplitude envelope (~6/min when calm)', ref: 'Lehrer & Gevirtz 2014 (plausible, not measured here)' },
  { param: 'repetition', from: ['arousal'], type: 'one-to-one', cue: 'repetition of short cells (predictability)', ref: 'Augoyard & Torgue 1995 (repetition); Huron 2006' },
  { param: 'brightnessHz', from: ['valence', 'arousal'], type: 'many-to-one', cue: 'timbre brightness (low-pass cut-off)', ref: 'Eerola et al. 2013' },
  { param: 'tilt', from: ['valence', 'arousal'], type: 'many-to-one', cue: 'spectral tilt of the drone', ref: 'Eerola et al. 2013' },
  { param: 'night', from: ['hour'], type: 'one-to-many', cue: 'environment-dependent: darker and sparser at night', ref: 'design choice (time of day)' },
]);

// ─── small numerical helpers ───────────────────────────────────────────────
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x) => clamp(Number.isFinite(x) ? x : 0.5, 0, 1);
const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

/** mulberry32: small, fast, well-distributed 32-bit PRNG (deterministic). */
export function makeRng(seed) {
  let s = (Number(seed) >>> 0) || 0x9e3779b9;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Night = 21:00–05:59 local time. */
export function isNight(hour) {
  const h = Number(hour);
  return Number.isFinite(h) && (h >= 21 || h < 6);
}

/**
 * Mode for a valence value, with hysteresis around the thresholds.
 * @param {number} valence 0–1
 * @param {string} [prev] previous mode id
 */
export function modeFor(valence, prev) {
  const v = clamp01(valence);
  const { low, high, hysteresis: h } = MODE_THRESHOLDS;
  if (prev === 'minor' && v < low + h) return 'minor';
  if (prev === 'major' && v > high - h) return 'major';
  if (prev === 'suspended' && v >= low - h && v <= high + h) return 'suspended';
  if (v < low) return 'minor';
  if (v > high) return 'major';
  return 'suspended';
}

/**
 * Map one affective point to the sound parameters (all clamped to SAFETY).
 * @param {{ valence: number, arousal: number }} point
 * @param {{ hour?: number, prevMode?: string }} [ctx]
 */
export function mapAffectToParams(point, ctx = {}) {
  const v = clamp01(point?.valence);
  const a = clamp01(point?.arousal);
  const night = isNight(ctx.hour);
  const nightK = night ? 0.85 : 1;

  const brightnessHz = clamp(250 * 8 ** (0.65 * a + 0.35 * v) * nightK, 200, 4000);
  const eventsPerMin = clamp((2 + 22 * a * a) * (night ? 0.8 : 1), 1, SAFETY.maxEventsPerMin);
  const breathHz = clamp(a <= 0.45 ? 0.1 : 0.1 + (0.1 * (a - 0.45)) / 0.55, 0.05, SAFETY.maxLfoHz);

  return {
    valence: round(v, 3),
    arousal: round(a, 3),
    mode: modeFor(v, ctx.prevMode),
    registerOct: round(1 + 2 * v, 3), // 1 → 3 octaves above the root
    widthDeg: round(30 + 40 * v, 1), // ±30° → ±70°
    eventsPerMin: round(eventsPerMin, 3),
    attackS: round(clamp(0.004 + 0.06 * (1 - a), SAFETY.minAttackS, 0.2), 4),
    decayS: round(2.5 + 3.5 * (1 - a), 3),
    droneDb: round(-20 + 4 * a, 2),
    textureDb: round(-28 + 8 * a, 2),
    textureMotion: round(0.2 + 0.8 * a, 3),
    breathHz: round(breathHz, 4),
    breathDepthDb: 3,
    repetition: round(0.15 + 0.35 * (1 - a), 3),
    brightnessHz: round(brightnessHz, 1),
    tilt: round(1.6 - 0.8 * (0.5 * a + 0.5 * v), 3),
    night,
  };
}

/** Steps of the first-order Markov chain over scale degrees (weights). */
const STEP_WEIGHTS = [
  [0, 0.18], [1, 0.25], [-1, 0.25], [2, 0.1], [-2, 0.1], [3, 0.05], [-3, 0.05], [4, 0.02],
];

function pickStep(rng) {
  let r = rng();
  for (const [step, w] of STEP_WEIGHTS) {
    if ((r -= w) <= 0) return step;
  }
  return 0;
}

/**
 * Build the whole score of a session: control points and events.
 *
 * Events follow a non-homogeneous Poisson process whose rate is the
 * eventsPerMin of the current control point, sampled by thinning
 * (Lewis & Shedler 1979). Pitches follow a first-order Markov chain over the
 * five degrees of the current mode, with occasional repetition of the last
 * three-note cell.
 *
 * @param {object} mood analyzeMoodHeuristic output (energy, valence, targetEnergy, targetValence)
 * @param {{ durationS?: number, seed?: number, space?: string, soundmark?: string,
 *           hour?: number, shiftWindowS?: number, fadeOut?: boolean }} [opts]
 */
export function buildScore(mood, opts = {}) {
  const durationS = clamp(Number(opts.durationS) || 600, 20, 2 * 3600);
  const seed = (Number(opts.seed) >>> 0) || 1;
  const rng = makeRng(seed);
  const space = SPACES[opts.space] ? opts.space : 'room';
  const soundmark = SOUNDMARKS.includes(opts.soundmark) ? opts.soundmark : 'wind';
  const hour = Number.isFinite(opts.hour) ? opts.hour : 12;
  const shiftWindowMs = Number(opts.shiftWindowS) > 0 ? Number(opts.shiftWindowS) * 1000 : ISO_SHIFT_WINDOW_MS;
  const root = ROOTS_HZ[Math.floor(rng() * ROOTS_HZ.length)];

  const controls = [];
  let prevMode;
  for (let t = 0; t <= durationS + 1e-9; t += CONTROL_PERIOD_S) {
    const wp = isoWaypoint(mood, 0, 0, { elapsedMs: t * 1000, shiftWindowMs });
    // A mode change is allowed only on a phrase boundary (every 60 s).
    const onBoundary = Math.round(t) % 60 === 0;
    const p = mapAffectToParams({ valence: wp.valence, arousal: wp.energy }, { hour, prevMode });
    if (!onBoundary && prevMode) p.mode = prevMode;
    prevMode = p.mode;
    controls.push({ t: round(t, 3), phase: wp.phase, ...p });
  }

  const controlAt = (t) => controls[Math.min(controls.length - 1, Math.max(0, Math.floor(t / CONTROL_PERIOD_S)))];
  const fadeInS = Math.max(SAFETY.minFadeInS, 10);
  const fadeOutS = opts.fadeOut === false ? 0 : Math.max(SAFETY.minFadeOutS, 12);

  const events = [];
  const lambdaMax = SAFETY.maxEventsPerMin / 60;
  let t = 2 + rng() * 2; // first signal after the drone has begun to breathe
  let degree = 0;
  const cell = [];
  while (t < durationS - fadeOutS - 2) {
    t += -Math.log(1 - rng()) / lambdaMax;
    if (t >= durationS - fadeOutS - 2) break;
    const c = controlAt(t);
    if (rng() > c.eventsPerMin / 60 / lambdaMax) continue; // thinning
    const mode = MODES[c.mode];
    if (cell.length === 3 && rng() < c.repetition) {
      degree = cell[0];
      cell.push(cell.shift()); // rotate: the cell is played again
    } else {
      degree = clamp(degree + pickStep(rng), -2, 7);
      cell.push(degree);
      if (cell.length > 3) cell.shift();
    }
    const oct = Math.floor(degree / 5);
    const idx = ((degree % 5) + 5) % 5;
    const octave = Math.floor(c.registerOct + rng() * 0.6) + oct;
    let freq = root * mode.ratios[idx] * 2 ** octave;
    while (freq > SAFETY.maxFreqHz / 5) freq /= 2; // the 3rd partial (×4.25) must stay < maxFreq
    while (freq < SAFETY.minFreqHz * 2) freq *= 2;
    const width = c.widthDeg;
    events.push({
      t: round(t, 4),
      freq: round(freq, 3),
      gain: round(0.18 + 0.12 * rng(), 4),
      angleDeg: round((rng() * 2 - 1) * width, 2),
      radiusM: round(1 + rng() * 3, 3),
      attackS: c.attackS,
      decayS: round(c.decayS * (0.8 + 0.4 * rng()), 3),
    });
  }

  const shiftEndS = shiftWindowMs / 1000;
  return {
    version: SOUNDSCAPE_VERSION,
    seed,
    root,
    space,
    soundmark,
    hour,
    durationS,
    fadeInS,
    fadeOutS,
    controlPeriodS: CONTROL_PERIOD_S,
    shiftEndS,
    start: { valence: round(clamp01(mood?.valence), 3), arousal: round(clamp01(mood?.energy), 3) },
    target: { valence: round(clamp01(mood?.targetValence ?? mood?.valence), 3), arousal: round(clamp01(mood?.targetEnergy ?? mood?.energy), 3) },
    controls,
    events,
  };
}

/** Control point active at time t (seconds) of a score. */
export function controlAtTime(score, t) {
  const i = Math.floor(Math.max(0, t) / score.controlPeriodS);
  return score.controls[Math.min(score.controls.length - 1, i)];
}

/** Short numeric summary of a score (for the panel, the report and the tests). */
export function summarizeScore(score) {
  const minutes = score.durationS / 60;
  const modes = {};
  for (const c of score.controls) modes[c.mode] = (modes[c.mode] || 0) + 1;
  const first = score.controls[0];
  const last = score.controls[score.controls.length - 1];
  return {
    events: score.events.length,
    eventsPerMin: round(score.events.length / Math.max(minutes, 1e-9), 2),
    modes,
    from: { valence: first.valence, arousal: first.arousal, mode: first.mode },
    to: { valence: last.valence, arousal: last.arousal, mode: last.mode },
    minFreq: Math.min(...score.events.map((e) => e.freq), Infinity),
    maxFreq: Math.max(...score.events.map((e) => e.freq * 4.25), 0),
  };
}

/** Preference defaults for the panel (stored as soundscapePrefsV1). */
export const SOUNDSCAPE_DEFAULT_PREFS = Object.freeze({
  space: 'room',
  soundmark: 'wind',
  volume: 0.6,
  minutes: 20,
});

/** Sanitize stored preferences (never trust storage shape). */
export function normalizeSoundscapePrefs(p) {
  const d = SOUNDSCAPE_DEFAULT_PREFS;
  const minutes = [0, 10, 20, 30, 45].includes(Number(p?.minutes)) ? Number(p.minutes) : d.minutes;
  return {
    space: SPACES[p?.space] ? p.space : d.space,
    soundmark: SOUNDMARKS.includes(p?.soundmark) ? p.soundmark : d.soundmark,
    volume: Number.isFinite(Number(p?.volume)) ? clamp(Number(p.volume), 0, 1) : d.volume,
    minutes,
  };
}
