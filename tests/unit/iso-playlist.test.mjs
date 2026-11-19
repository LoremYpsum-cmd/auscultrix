// ISO trajectory: waypoint geometry and selection on the REAL bundled catalogues.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib } from '../helpers/env.mjs';

installChromeMock();
const { analyzeMoodHeuristic } = await importLib('lib/mood.js');
const { isoWaypoint, generatePlaylist, ISO_SHIFT_WINDOW_MS, trackDurationMs, MIN_CALIBRATED_POOL } = await importLib('lib/playlist.js');
const { generateBandcampPlaylist } = await importLib('lib/bandcamp-select.js');
const { isAffectGrounded } = await importLib('lib/affect-provenance.js');
const sim = await importLib('tests/sim/iso-quality.mjs');

const mood = { energy: 0.7, valence: 0.3, targetEnergy: 0.4, targetValence: 0.55 };

test('UT-ISO-01 the path starts on the declared state and holds the target after the shift window', () => {
  const a = isoWaypoint(mood, 0, 40, { elapsedMs: 0 });
  assert.equal(a.energy, 0.7);
  assert.equal(a.valence, 0.3);
  assert.equal(a.phase, 'matching');
  for (const extra of [0, 1, 60_000, 3_600_000]) {
    const z = isoWaypoint(mood, 0, 40, { elapsedMs: ISO_SHIFT_WINDOW_MS + extra });
    assert.ok(Math.abs(z.energy - 0.4) < 1e-9 && Math.abs(z.valence - 0.55) < 1e-9);
    assert.equal(z.phase, 'holding');
  }
});

test('UT-ISO-02 distance to the target never increases along the path; matching phase moves ≤ 18 %', () => {
  let prev = Infinity;
  for (let ms = 0; ms <= ISO_SHIFT_WINDOW_MS; ms += 15_000) {
    const w = isoWaypoint(mood, 0, 0, { elapsedMs: ms });
    const d = Math.hypot(w.energy - 0.4, w.valence - 0.55);
    assert.ok(d <= prev + 1e-12);
    prev = d;
    if (w.phase === 'matching') assert.ok(w.t <= 0.18 + 1e-9);
  }
});

test('UT-ISO-03 legacy index-based waypoints still work (first = start, last = target)', () => {
  const first = isoWaypoint(mood, 0, 10);
  const last = isoWaypoint(mood, 9, 10);
  assert.equal(first.energy, 0.7);
  assert.ok(Math.abs(last.energy - 0.4) < 1e-9);
});

test('UT-ISO-04 unknown or absurd durations fall back to 3.5 min', () => {
  assert.equal(trackDurationMs({}), 210_000);
  assert.equal(trackDurationMs({ durationMs: 5 }), 210_000);
  assert.equal(trackDurationMs({ durationMs: 200_000 }), 200_000);
});

const rows = sim.runAll().rows;

test('UT-ISO-05 every playlist is ISO-calibrated in both catalogues (6 moods × 2 modes)', () => {
  assert.equal(rows.length, 12);
  for (const r of rows) assert.equal(r.iso, true, `${r.mood}/${r.mode}`);
});

test('UT-ISO-06 «Varia»: mean distance track↔waypoint ≤ 0.15 and no consecutive jump > 0.4', () => {
  for (const r of rows.filter((x) => x.mode === 'varia')) {
    assert.ok(r.meanDistToWaypoint <= 0.15, `${r.mood}: ${r.meanDistToWaypoint}`);
    assert.equal(r.jumpsOver040, 0, `${r.mood}: ${r.jumpsOver040} jumps > 0.4`);
  }
});

test('UT-ISO-07 «Emergente»: continuity holds (≤ 1 jump > 0.4 per playlist); coverage gaps are measured, not hidden', () => {
  for (const r of rows.filter((x) => x.mode === 'emergente')) {
    assert.ok(r.jumpsOver040 <= 1, `${r.mood}: ${r.jumpsOver040}`);
    assert.ok(Number.isFinite(r.meanDistToWaypoint));
  }
});

function moodOf(text, energy) {
  return analyzeMoodHeuristic({ input: text, energy });
}

test('UT-ISO-08 no uncalibrated track inside the mood-matched arc; every uncalibrated track is labelled', () => {
  const varia = sim.variaPool();
  for (const [text, e] of [['sono ansioso', 0.7], ['sono triste', 0.2], ['sto benissimo', 0.8]]) {
    const res = generatePlaylist(varia, moodOf(text, e), { size: 40, sessionSeed: 7, uiLocale: 'it' });
    let elapsed = 0;
    for (const s of res.scored) {
      if (!s.calibrated) {
        assert.ok(elapsed >= ISO_SHIFT_WINDOW_MS, `uncalibrated at ${elapsed / 60000} min`);
        assert.equal(s.phase, 'discovery');
      } else {
        assert.ok(isAffectGrounded(s.track), 'calibrated slot holds a grounded track');
      }
      elapsed += trackDurationMs(s.track);
    }
    for (const t of res.tracks) assert.equal(typeof t.affectCalibrated, 'boolean');
  }
});

test('UT-ISO-09 at most 3 tracks per artist and no duplicates', () => {
  const varia = sim.variaPool();
  const res = generatePlaylist(varia, moodOf('sono stanco', 0.3), { size: 40, sessionSeed: 3, uiLocale: 'it' });
  const ids = new Set(), artists = new Map();
  for (const t of res.tracks) {
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`);
    ids.add(t.id);
    const k = String(t.artist).toLowerCase().trim();
    artists.set(k, (artists.get(k) || 0) + 1);
  }
  for (const [a, n] of artists) assert.ok(n <= 3, `${a}: ${n}`);
});

test('UT-ISO-10 novelty: different session seeds give different playlists; history lowers repeats', () => {
  const varia = sim.variaPool();
  const m = moodOf('mi sento giù', 0.3);
  const a = generatePlaylist(varia, m, { size: 30, sessionSeed: 1, uiLocale: 'it' }).tracks.map((t) => t.id);
  const b = generatePlaylist(varia, m, { size: 30, sessionSeed: 2, uiLocale: 'it' }).tracks.map((t) => t.id);
  const overlap = a.filter((x) => b.includes(x)).length / a.length;
  assert.ok(overlap < 0.9, `overlap ${overlap}`);
  const c = generatePlaylist(varia, m, { size: 30, sessionSeed: 1, uiLocale: 'it', recentlyRecommendedTrackIds: a }).tracks.map((t) => t.id);
  const repeat = c.filter((x) => a.includes(x)).length / c.length;
  assert.ok(repeat < overlap + 0.2, `repeat ${repeat}`);
});

test('UT-ISO-11 empty catalogue and an empty place give an empty playlist, never an error', () => {
  const m = moodOf('sono triste', 0.3);
  assert.deepEqual(generatePlaylist([], m, { uiLocale: 'it' }).tracks, []);
  const res = generatePlaylist(sim.variaPool(), m, { uiLocale: 'it', musicGeoZone: 'country:zz' });
  assert.ok(Array.isArray(res.tracks));
});

test('UT-ISO-12 too few calibrated tracks → honest discovery list (iso=false), not a fake ISO path', () => {
  const placeholders = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, title: `t${i}`, artist: `a${i % 10}`, energy: 0.45, valence: 0.5, energySource: 'unannotated', valenceSource: 'unannotated' }));
  const res = generatePlaylist(placeholders, moodOf('sono felice', 0.6), { size: 20, sessionSeed: 1, uiLocale: 'it' });
  assert.ok(MIN_CALIBRATED_POOL > 0);
  assert.equal(res.iso, false);
  assert.equal(res.calibration.iso, false);
  assert.ok(res.tracks.every((t) => t.affectCalibrated === false));
});

test('UT-ISO-13 «Emergente» uses the same ISO engine (calibration metadata present)', () => {
  const res = generateBandcampPlaylist([], moodOf('sono agitato', 0.7), { size: 20, sessionSeed: 5, uiLocale: 'it' });
  assert.ok(res.calibration && typeof res.calibration.iso === 'boolean');
  assert.ok(res.calibration.calibratedPool >= 50, `calibrated pool ${res.calibration.calibratedPool}`);
});
