/**
 * ISO trajectory quality on the REAL bundled catalogues (no browser needed).
 * For a fixed set of declared moods, builds playlists in both catalogue modes
 * and measures: share of mood-calibrated tracks, mean Russell distance between
 * each calibrated track and its waypoint, consecutive jumps, time to reach the
 * target. Usage: node tests/sim/iso-quality.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
globalThis.chrome ??= { i18n: { getMessage: () => '', getUILanguage: () => 'it' }, runtime: { getURL: (p) => p } };

const { analyzeMoodHeuristic } = await import(path.join(ROOT, 'lib/mood.js'));
const { generatePlaylist, isoWaypoint, trackDurationMs, ISO_SHIFT_WINDOW_MS } = await import(path.join(ROOT, 'lib/playlist.js'));
const { generateBandcampPlaylist } = await import(path.join(ROOT, 'lib/bandcamp-select.js'));
const { mergeKnownLibrary } = await import(path.join(ROOT, 'lib/musictherapy-corpus.js'));
const { mergeSeedMirFeatures } = await import(path.join(ROOT, 'lib/liked-songs-library.js'));
const { enrichTrackAudioFeatures } = await import(path.join(ROOT, 'lib/track-energy.js'));
const { isAffectGrounded } = await import(path.join(ROOT, 'lib/affect-provenance.js'));

export const MOODS = [
  { id: 'ansia', text: 'sono ansioso e agitato per domani', energy: 0.7 },
  { id: 'tristezza', text: 'oggi sono molto triste e stanco', energy: 0.25 },
  { id: 'euforia', text: 'sto alla grande, pieno di energia', energy: 0.85 },
  { id: 'rabbia', text: 'sono arrabbiato con tutti', energy: 0.75 },
  { id: 'calma', text: 'mi sento rilassato e sereno', energy: 0.35 },
  { id: 'apatia', text: 'non ho voglia di fare niente', energy: 0.3 },
];

export function variaPool() {
  const liked = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/liked-songs-library.json'), 'utf8')).tracks;
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/library-seed.json'), 'utf8')).tracks.map((t) =>
    enrichTrackAudioFeatures({ ...t }),
  );
  const merged = mergeSeedMirFeatures(liked, seed).tracks;
  return mergeKnownLibrary(merged);
}

export function measure(result, mood) {
  const sel = result.scored || [];
  let elapsed = 0;
  const dists = [];
  const jumps = [];
  let reachedAt = null;
  let prevCal = null;
  for (const s of sel) {
    const wp = isoWaypoint(mood, 0, 0, { elapsedMs: elapsed });
    if (s.calibrated) {
      dists.push(Math.hypot((s.track.energy ?? 0.5) - wp.energy, (s.track.valence ?? 0.5) - wp.valence));
      if (prevCal) {
        jumps.push(Math.hypot((s.track.energy ?? 0.5) - (prevCal.energy ?? 0.5), (s.track.valence ?? 0.5) - (prevCal.valence ?? 0.5)));
      }
      prevCal = s.track;
    }
    if (reachedAt == null && wp.phase === 'holding') reachedAt = elapsed;
    elapsed += trackDurationMs(s.track);
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return {
    n: sel.length,
    calibratedShare: sel.length ? sel.filter((s) => s.calibrated).length / sel.length : 0,
    meanDistToWaypoint: mean(dists),
    maxJump: jumps.length ? Math.max(...jumps) : 0,
    jumpsOver040: jumps.filter((j) => j > 0.4).length,
    transitions: jumps.length,
    minutesToTarget: reachedAt == null ? null : reachedAt / 60000,
    iso: result.iso !== false,
  };
}

export function runAll({ seedBase = 20261106 } = {}) {
  const varia = variaPool();
  const out = [];
  MOODS.forEach((m, k) => {
    const mood = analyzeMoodHeuristic({ input: m.text, energy: m.energy });
    const opts = { size: 40, sessionSeed: seedBase + k, uiLocale: 'it' };
    out.push({ mood: m.id, mode: 'emergente', ...measure(generateBandcampPlaylist([], mood, opts), mood) });
    out.push({ mood: m.id, mode: 'varia', ...measure(generatePlaylist(varia, mood, opts), mood) });
  });
  return { shiftWindowMin: ISO_SHIFT_WINDOW_MS / 60000, variaCalibratedPool: varia.filter((t) => isAffectGrounded(enrichTrackAudioFeatures({ ...t }))).length, rows: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = runAll();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(`shift window ${res.shiftWindowMin} min · Varia calibrated pool ${res.variaCalibratedPool}`);
    for (const r of res.rows) {
      console.log(
        `${r.mood.padEnd(10)} ${r.mode.padEnd(9)} n=${r.n} calibrated=${(r.calibratedShare * 100).toFixed(0)}% meanDist=${r.meanDistToWaypoint?.toFixed(3)} maxJump=${r.maxJump.toFixed(2)} >0.4=${r.jumpsOver040}/${r.transitions} target@${r.minutesToTarget?.toFixed(1)}min iso=${r.iso}`,
      );
    }
  }
}
