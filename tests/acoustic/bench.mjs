/**
 * Acoustic verification of the soundscape: the engine is rendered offline
 * (OfflineAudioContext, the same graph heard in the panel) and its OUTPUT is
 * measured. Runs in a browser: tests/acoustic/bench.html (local preview server)
 * or tests/acoustic/acoustic.e2e.mjs (Playwright, when installed).
 *
 * Questions
 *  A1 Safety: sample peak ≤ −1 dBFS, |DC| < 0.001, loudness in a quiet band
 *     (−34…−16 LUFS at the default volume) for every state of the grid.
 *  A2 Arousal → tempo: onsets detected in the signals stem match the score
 *     (precision, recall, F within ±50 ms, as in MIREX onset evaluation) and
 *     their rate grows with arousal.
 *  A3 Valence/arousal → brightness: the spectral centroid grows with the
 *     brightness parameter (many-to-one mapping).
 *  A4 ISO in sound: over a compressed session (shift in 120 s) the centroid of
 *     each 15 s window of the drone stem follows the brightness the score asks
 *     for; the full-mix centroid is reported too (it also depends on register).
 *  A5 Reproducibility: two renders with the same seed are identical.
 */
import { buildScore, mapAffectToParams } from '../../lib/soundscape.js';
import { renderScoreOffline } from '../../lib/soundscape-audio.js';
import { dcOffset, integratedLoudness, onsetRate, peakDb, pearson, spearman, spectralCentroid } from '../../lib/audio-metrics.js';

const RATE = 48000;
const r2 = (x) => Math.round(x * 100) / 100;

function stationaryMood(v, a) {
  return { valence: v, energy: a, targetValence: v, targetEnergy: a };
}

async function render(score, opts = {}) {
  const buf = await renderScoreOffline(score, { sampleRate: RATE, volume: 0.6, ...opts });
  return [buf.getChannelData(0), buf.getChannelData(1)];
}

function slice(chs, t0, t1) {
  return chs.map((c) => c.subarray(Math.round(t0 * RATE), Math.round(t1 * RATE)));
}

export async function runAcousticBench({ seconds = 100, grid = [0.15, 0.5, 0.85], log = () => {} } = {}) {
  const t0 = performance.now();
  const rows = [];
  for (const v of grid) {
    for (const a of grid) {
      for (const soundmark of ['wind', 'none']) {
        const score = buildScore(stationaryMood(v, a), { durationS: seconds, seed: 4242, space: 'room', soundmark, hour: 12 });
        const chs = await render(score);
        const body = slice(chs, 12, seconds - 13); // after fade-in, before fade-out
        const p = mapAffectToParams({ valence: v, arousal: a }, { hour: 12 });
        const row = {
          valence: v, arousal: a, soundmark,
          peakDb: r2(peakDb(chs)),
          dc: dcOffset(chs).map((x) => Math.round(x * 1e5) / 1e5),
          lufs: r2(integratedLoudness(body, RATE)),
          centroidHz: Math.round(spectralCentroid(body, RATE)),
          brightnessHz: p.brightnessHz,
          eventsPerMinParam: p.eventsPerMin,
        };
        rows.push(row);
        log(JSON.stringify(row));
      }
    }
  }

  // A2: onset detection on the signals stem, 3 arousal levels × 3 seeds
  const onsetRuns = [];
  let tp = 0, fp = 0, fn = 0;
  for (const a of [0.15, 0.5, 0.85]) {
    for (const seed of [11, 12, 13]) {
      const sc = buildScore(stationaryMood(0.5, a), { durationS: 90, seed, space: 'room', soundmark: 'none', hour: 12 });
      const chs = await render(sc, { stems: { drone: false, texture: false } });
      const det = onsetRate(chs, RATE).times;
      const ref = sc.events.map((e) => e.t);
      const used = new Set();
      let hit = 0;
      for (const r of ref) {
        const j = det.findIndex((d, k) => !used.has(k) && Math.abs(d - r) <= 0.05);
        if (j >= 0) { used.add(j); hit++; }
      }
      tp += hit; fn += ref.length - hit; fp += det.length - hit;
      onsetRuns.push({ arousal: a, seed, scoreEvents: ref.length, detected: det.length, matched: hit, perMinScore: r2(ref.length / 1.5), perMinDetected: r2(det.length / 1.5) });
      log(JSON.stringify(onsetRuns[onsetRuns.length - 1]));
    }
  }
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);

  // A4: compressed ISO session (anxious → calmer), 15 s windows
  const isoMood = { valence: 0.2, energy: 0.85, targetValence: 0.5, targetEnergy: 0.55 };
  const isoScore = buildScore(isoMood, { durationS: 180, seed: 77, space: 'room', soundmark: 'none', hour: 12, shiftWindowS: 120 });
  const isoChs = await render(isoScore);
  const isoDrone = await render(isoScore, { stems: { texture: false, signals: false } });
  const windows = [];
  for (let s = 15; s + 15 <= 165; s += 15) {
    const c = isoScore.controls.filter((x) => x.t >= s && x.t < s + 15);
    const meanB = c.reduce((acc, x) => acc + x.brightnessHz, 0) / c.length;
    windows.push({
      t: s,
      valence: r2(c[0].valence),
      arousal: r2(c[0].arousal),
      brightnessHz: Math.round(meanB),
      droneCentroidHz: Math.round(spectralCentroid(slice(isoDrone, s, s + 15), RATE)),
      mixCentroidHz: Math.round(spectralCentroid(slice(isoChs, s, s + 15), RATE)),
    });
  }

  // A5: reproducibility
  const rep = buildScore(stationaryMood(0.4, 0.6), { durationS: 20, seed: 99, soundmark: 'rain' });
  const [x1, x2] = [await render(rep), await render(rep)];
  let maxDiff = 0;
  for (let c = 0; c < 2; c++) for (let i = 0; i < x1[c].length; i++) maxDiff = Math.max(maxDiff, Math.abs(x1[c][i] - x2[c][i]));

  const none = rows.filter((r) => r.soundmark === 'none');
  const all = rows;
  const onsetScore = onsetRuns.map((o) => o.perMinScore);
  const result = {
    measuredAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sampleRate: RATE,
    secondsPerState: seconds,
    rows,
    A1: {
      maxPeakDb: Math.max(...all.map((r) => r.peakDb)),
      maxAbsDc: Math.max(...all.flatMap((r) => r.dc.map(Math.abs))),
      lufsRange: [Math.min(...all.map((r) => r.lufs)), Math.max(...all.map((r) => r.lufs))],
    },
    A2: {
      runs: onsetRuns,
      precision: r2(precision),
      recall: r2(recall),
      f: r2((2 * precision * recall) / Math.max(1e-9, precision + recall)),
      spearmanArousalDetectedRate: r2(spearman(onsetRuns.map((o) => o.arousal), onsetRuns.map((o) => o.perMinDetected))),
      pearsonScoreVsDetectedRate: r2(pearson(onsetScore, onsetRuns.map((o) => o.perMinDetected))),
    },
    A3: {
      spearmanBrightnessCentroid: r2(spearman(none.map((r) => r.brightnessHz), none.map((r) => r.centroidHz))),
      spearmanBrightnessCentroidWithTexture: r2(spearman(rows.filter((r) => r.soundmark === 'wind').map((r) => r.brightnessHz), rows.filter((r) => r.soundmark === 'wind').map((r) => r.centroidHz))),
    },
    A4: {
      windows,
      spearmanDrone: r2(spearman(windows.map((w) => w.brightnessHz), windows.map((w) => w.droneCentroidHz))),
      spearmanMix: r2(spearman(windows.map((w) => w.brightnessHz), windows.map((w) => w.mixCentroidHz))),
    },
    A5: { maxAbsDifference: maxDiff },
    renderWallSeconds: r2((performance.now() - t0) / 1000),
  };
  return result;
}
