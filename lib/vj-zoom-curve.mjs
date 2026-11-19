/**
 * Pure track-zoom curve for Auscultrix Vision.
 * Shared by content overlay + Node asserts (no DOM).
 *
 * Parabolic curve Z(p): peak exactly at p=0.5 (mid-track), baseline at p=0 and p=1.
 *   Z(p) = min + (max − min) · (1 − (2p − 1)²)
 */

export function clamp01(x) {
  return Math.min(1, Math.max(0, Number(x) || 0));
}

/** Kept for callers that still ease other motions. */
export function easeInOutSmooth(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Parabolic zoom scale from track progress.
 * @param {number} p progress 0→1 (currentTime / duration)
 * @param {{ min?: number, max?: number }} [opts]
 * @returns {number} CSS scale factor
 */
export function zoomScaleFromProgress(p, opts = {}) {
  const min = Number.isFinite(opts.min) ? opts.min : 1.0;
  const max = Number.isFinite(opts.max) ? opts.max : 1.25;
  const progress = clamp01(p);
  const x = 2 * progress - 1; // −1 … 1, 0 at mid-track
  const parabola = 1 - x * x; // 0 at ends, 1 at p=0.5
  return min + (max - min) * parabola;
}

/**
 * Progress from media clock. Single source of truth when duration known.
 * @param {number} currentTime sec
 * @param {number} duration sec
 * @returns {number} p ∈ [0, 1]
 */
export function progressFromMedia(currentTime, duration) {
  const d = Number(duration);
  const t = Number(currentTime);
  if (!Number.isFinite(d) || d <= 0) return 0;
  if (!Number.isFinite(t) || t < 0) return 0;
  return clamp01(t / d);
}
