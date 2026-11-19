/**
 * Provenance of a track's affective coordinates (energy/arousal, valence).
 *
 * A coordinate is "grounded" when it comes from a documented annotation
 * (literature-based therapy corpus, hand-annotated corpora) or from a
 * measurement of the audio signal (MIR on the 30 s preview, Spotify audio
 * features). Everything else is a placeholder (catalogue default, popularity
 * guess, formula with no measured input) and must neither be used for mood
 * matching on the ISO path nor be shown to the person as if it were a value.
 *
 * Lyrics refinements are recorded as suffixes ("mir_preview+lyrics"): the
 * base provenance decides.
 */

export const GROUNDED_SOURCES = Object.freeze([
  'therapy_corpus',
  'underground_corpus',
  'italian_corpus',
  'kids_corpus',
  'mir_preview',
  'spotify_audio_features',
  'csv',
]);

const GROUNDED = new Set(GROUNDED_SOURCES);

/** Sources that look like annotations but are catalogue placeholders. */
export const PLACEHOLDER_SOURCES = Object.freeze(['unannotated', 'unknown', 'popularity_estimate', 'neutral_unknown']);

function base(src) {
  return String(src || '').split('+')[0].trim();
}

function hasMeasuredEnergyInputs(track) {
  return track?.tempo != null || track?.loudness != null;
}

function hasMeasuredValenceInputs(track) {
  return track?.danceability != null || track?.acousticness != null || track?.mode != null;
}

/** @returns {boolean} energy is annotated or measured */
export function isEnergyGrounded(track) {
  const s = base(track?.energySource);
  if (GROUNDED.has(s)) return true;
  // The formula is only as good as its inputs: grounded when fed by measurements.
  return s === 'mir_formula' && hasMeasuredEnergyInputs(track);
}

/** @returns {boolean} valence is annotated or measured */
export function isValenceGrounded(track) {
  const s = base(track?.valenceSource);
  if (GROUNDED.has(s)) return true;
  return s === 'mir_formula' && hasMeasuredValenceInputs(track);
}

/** Both coordinates grounded: the track may occupy a mood-matched ISO slot. */
export function isAffectGrounded(track) {
  return isEnergyGrounded(track) && isValenceGrounded(track);
}

/**
 * Summary of a playlist's calibration, for honest UI copy and tests.
 * @param {object[]} tracks
 */
export function calibrationSummary(tracks) {
  const list = Array.isArray(tracks) ? tracks : [];
  const grounded = list.filter(isAffectGrounded).length;
  return { total: list.length, grounded, unknown: list.length - grounded };
}
