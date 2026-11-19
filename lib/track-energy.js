/**
 * MIR-inspired track energy / valence helpers (local, no Auscultrix servers).
 *
 * Energy ≈ weighted combo of tempo, loudness, danceability, acousticness⁻¹,
 * instrumentalness hint — aligned with common Music Emotion Recognition proxies
 * (BPM↔arousal; loudness/timbre↔perceived intensity). When Spotify Audio Features
 * Energy is already present (CSV export), it is preferred unless recompute is forced.
 */

const BPM_MIN = 60;
const BPM_MAX = 180;

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

/** Tempo → 0–1 (60 BPM → 0, 180 BPM → 1). */
export function normalizeBpm(tempo) {
  const t = Number(tempo);
  if (!Number.isFinite(t) || t <= 0) return null;
  return clamp01((t - BPM_MIN) / (BPM_MAX - BPM_MIN));
}

/**
 * Loudness (dB, typical Spotify −60…0) → 0–1.
 * Missing loudness → null (skipped in weighted mix).
 */
export function normalizeLoudness(loudnessDb) {
  const l = Number(loudnessDb);
  if (!Number.isFinite(l)) return null;
  // Map −45…−5 dB into 0…1 (common pop/rock range)
  return clamp01((l + 45) / 40);
}

/**
 * Compute energy 0–1 from available MIR-like fields.
 * @param {object} track
 * @param {{ force?: boolean }} [opts] force=true ignores existing track.energy
 * @returns {number}
 */
export function computeTrackEnergy(track, opts = {}) {
  if (!opts.force) {
    const existing = clamp01(track?.energy);
    if (existing != null && track?.energySource === 'spotify_audio_features') {
      return existing;
    }
    // Trust CSV/Spotify Audio Features when present and not a pure popularity stub
    if (
      existing != null &&
      (track?.energySource === 'csv' ||
        track?.energySource === 'mir_formula' ||
        (track?.tempo != null && track?.loudness != null))
    ) {
      // Prefer formula when we have rich features; else keep existing
      if (track?.energySource === 'csv' && track?.tempo == null && track?.loudness == null) {
        return existing;
      }
    }
  }

  const bpmN = normalizeBpm(track?.tempo);
  const loudN = normalizeLoudness(track?.loudness);
  const dance = clamp01(track?.danceability);
  const acoustic = clamp01(track?.acousticness);
  const instrumental = clamp01(track?.instrumentalness);
  const popularity =
    typeof track?.popularity === 'number' ? clamp01(track.popularity / 100) : null;

  // Heuristic weights (thesis §7.4), NOT fitted on annotated data:
  // E = 0.20·T_norm + 0.35·L_norm + 0.25·D + 0.20·(1 − A).
  // Note: the thesis writes the last term as −0.20·A; the implemented form
  // 0.20·(1 − A) = 0.20 − 0.20·A differs by a constant +0.20 that keeps E in
  // [0, 1] (weights sum to 1). Rankings are identical; absolute values are not.
  // Weights are renormalised over the features actually available.
  let num = 0;
  let den = 0;
  const add = (v, w) => {
    if (v == null || w <= 0) return;
    num += v * w;
    den += w;
  };

  add(bpmN, 0.2);
  add(loudN, 0.35);
  add(dance, 0.25);
  if (acoustic != null) add(1 - acoustic, 0.2);
  if (instrumental != null && instrumental > 0.6) add(0.35, 0.04); // ambient-ish nudge
  // Last-resort popularity (sync without audio features)
  if (den < 0.25) add(popularity, 0.35);

  if (den <= 0) {
    const fallback = clamp01(track?.energy);
    return fallback != null ? fallback : 0.5;
  }

  const formula = clamp01(num / den);
  // Blend with existing Spotify energy label if both exist
  const existing = clamp01(track?.energy);
  if (!opts.force && existing != null && track?.energySource !== 'popularity_estimate') {
    return clamp01(0.55 * existing + 0.45 * formula);
  }
  return formula ?? 0.5;
}

/**
 * Simple valence proxy when Audio Features valence missing:
 * major mode + danceability up; minor/acoustic down.
 * Without any measured input the valence is unknown: a neutral 0.5 is
 * returned and the caller marks it as such. Popularity is NOT a valence
 * correlate and is never used (it was in ≤ 5.0).
 * @param {object} track
 * @returns {number}
 */
export function computeTrackValence(track) {
  const existing = clamp01(track?.valence);
  if (existing != null && track?.valenceSource !== 'popularity_estimate') {
    return existing;
  }
  const hasInputs =
    track?.danceability != null || track?.acousticness != null || track?.mode != null;
  if (!hasInputs) return 0.5;
  const dance = clamp01(track?.danceability) ?? 0.5;
  const acoustic = clamp01(track?.acousticness) ?? 0.4;
  const mode = track?.mode; // 1 major, 0 minor (Spotify)
  let v = 0.35 + dance * 0.35 + (1 - acoustic) * 0.15;
  if (mode === 1) v += 0.12;
  if (mode === 0) v -= 0.1;
  return clamp01(v) ?? 0.5;
}

/**
 * Enrich a track in place with computed energy/valence + source tags.
 * @param {object} track
 * @returns {object}
 */
export function enrichTrackAudioFeatures(track) {
  if (!track || typeof track !== 'object') return track;
  const hadEnergy = track.energy != null && Number.isFinite(Number(track.energy));
  const fromCsv =
    hadEnergy &&
    (track.tempo != null || track.loudness != null || track.danceability != null);

  const measured =
    track.tempo != null || track.loudness != null || track.danceability != null || track.acousticness != null;
  if (hadEnergy && !track.energySource) {
    track.energySource = fromCsv ? 'csv' : 'unknown';
  }
  if (track.energySource === 'popularity_estimate' || !hadEnergy || fromCsv) {
    const e = computeTrackEnergy(track, {
      force: track.energySource === 'popularity_estimate',
    });
    track.energy = e;
    if (track.energySource !== 'csv') {
      // Honest provenance: the formula label is used only when measured
      // inputs exist; a default/popularity value stays marked as unknown.
      track.energySource = measured
        ? 'mir_formula'
        : track.energySource === 'popularity_estimate'
          ? 'popularity_estimate'
          : 'unknown';
    }
  }
  if (track.valence == null || track.valenceSource === 'popularity_estimate') {
    track.valence = computeTrackValence(track);
    const hasValInputs =
      track.danceability != null || track.acousticness != null || track.mode != null;
    track.valenceSource = hasValInputs ? 'mir_formula' : 'neutral_unknown';
  }
  return track;
}

export function enrichTracksAudioFeatures(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((t) => enrichTrackAudioFeatures({ ...t }));
}
