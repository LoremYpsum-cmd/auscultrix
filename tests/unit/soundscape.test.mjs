// Generative soundscape: mapping, score, safety limits, exports and measurements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { installChromeMock, importLib } from '../helpers/env.mjs';

installChromeMock();
const S = await importLib('lib/soundscape.js');
const W = await importLib('lib/wav.js');
const PD = await importLib('lib/pd-patch.js');
const M = await importLib('lib/audio-metrics.js');
const CX = await importLib('lib/circumplex.js');

const anxious = { valence: 0.2, energy: 0.85, targetValence: 0.45, targetEnergy: 0.6 };
const grid = [];
for (let v = 0; v <= 1.0001; v += 0.1) for (let a = 0; a <= 1.0001; a += 0.1) grid.push([v, a]);

test('UT-SND-01 same mood, settings and seed give the same score; another seed gives another', () => {
  const a = S.buildScore(anxious, { durationS: 600, seed: 42, soundmark: 'sea' });
  const b = S.buildScore(anxious, { durationS: 600, seed: 42, soundmark: 'sea' });
  const c = S.buildScore(anxious, { durationS: 600, seed: 43, soundmark: 'sea' });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.events, c.events);
  assert.deepEqual(a.controls, c.controls, 'the trajectory does not depend on the seed');
});

test('UT-SND-02 no input can exceed the safety limits', () => {
  const odd = [[NaN, NaN], [-3, 7], [Infinity, -Infinity], ...grid];
  for (const [v, a] of odd) {
    for (const hour of [3, 12, 22]) {
      const p = S.mapAffectToParams({ valence: v, arousal: a }, { hour });
      assert.ok(p.eventsPerMin <= S.SAFETY.maxEventsPerMin && p.eventsPerMin >= 1, `events ${p.eventsPerMin}`);
      assert.ok(p.breathHz <= S.SAFETY.maxLfoHz && p.breathHz > 0, `breath ${p.breathHz}`);
      assert.ok(p.attackS >= S.SAFETY.minAttackS, `attack ${p.attackS}`);
      assert.ok(p.brightnessHz >= 200 && p.brightnessHz <= 4000);
      assert.ok(p.droneDb <= -16 && p.textureDb <= -20, 'levels stay low before the master');
    }
  }
  for (const [v, a] of [[0, 0], [0, 1], [1, 0], [1, 1], [0.5, 0.5]]) {
    const sc = S.buildScore({ valence: v, energy: a, targetValence: v, targetEnergy: a }, { durationS: 1800, seed: 7 });
    assert.ok(sc.fadeInS >= S.SAFETY.minFadeInS && sc.fadeOutS >= S.SAFETY.minFadeOutS);
    for (const e of sc.events) {
      assert.ok(e.freq >= S.SAFETY.minFreqHz * 2, `low ${e.freq}`);
      assert.ok(e.freq * 4.25 <= S.SAFETY.maxFreqHz, `high partial ${e.freq * 4.25}`);
      assert.ok(e.t < sc.durationS - sc.fadeOutS, 'no event starts inside the fade-out');
      assert.ok(e.radiusM >= 1 && e.radiusM <= 4);
    }
    for (let i = 1; i < sc.events.length; i++) assert.ok(sc.events[i].t >= sc.events[i - 1].t, 'events sorted');
  }
});

test('UT-SND-03 mappings move in the documented direction', () => {
  const at = (v, a, h = 12) => S.mapAffectToParams({ valence: v, arousal: a }, { hour: h });
  for (const v of [0.1, 0.5, 0.9]) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10;
      const lo = at(v, a), hi = at(v, a + 0.1);
      assert.ok(hi.eventsPerMin >= lo.eventsPerMin, 'tempo grows with arousal');
      assert.ok(hi.brightnessHz > lo.brightnessHz, 'brightness grows with arousal');
      assert.ok(hi.attackS < lo.attackS, 'attack sharpens with arousal');
      assert.ok(hi.droneDb > lo.droneDb, 'level grows with arousal');
    }
  }
  for (const a of [0.1, 0.5, 0.9]) {
    for (let i = 0; i < 10; i++) {
      const v = i / 10;
      const lo = at(v, a), hi = at(v + 0.1, a);
      assert.ok(hi.registerOct > lo.registerOct, 'register rises with valence');
      assert.ok(hi.brightnessHz > lo.brightnessHz, 'brightness grows with valence');
    }
  }
  assert.equal(at(0.1, 0.5).mode, 'minor');
  assert.equal(at(0.5, 0.5).mode, 'suspended');
  assert.equal(at(0.9, 0.5).mode, 'major');
  assert.ok(at(0.5, 0.5, 23).brightnessHz < at(0.5, 0.5, 12).brightnessHz, 'darker at night');
  assert.ok(at(0.5, 0.8, 2).eventsPerMin < at(0.5, 0.8, 12).eventsPerMin, 'sparser at night');
});

test('UT-SND-04 mode has hysteresis: no flapping at a threshold', () => {
  let mode = S.modeFor(0.62);
  assert.equal(mode, 'major');
  let changes = 0;
  for (let i = 0; i < 40; i++) {
    const next = S.modeFor(0.6 + (i % 2 ? 0.015 : -0.015), mode);
    if (next !== mode) changes++;
    mode = next;
  }
  assert.equal(changes, 0);
  assert.equal(S.modeFor(0.5, 'major'), 'suspended', 'a real move still changes mode');
});

test('UT-SND-05 the score follows the ISO path and changes mode only on phrase boundaries', () => {
  const sc = S.buildScore(anxious, { durationS: 1800, seed: 3 });
  const first = sc.controls[0], last = sc.controls[sc.controls.length - 1];
  assert.ok(Math.abs(first.valence - anxious.valence) < 0.01 && Math.abs(first.arousal - anxious.energy) < 0.01, 'starts on the declared state');
  assert.ok(Math.abs(last.valence - anxious.targetValence) < 0.01 && Math.abs(last.arousal - anxious.targetEnergy) < 0.01, 'holds the target');
  const phases = [...new Set(sc.controls.map((c) => c.phase))];
  assert.deepEqual(phases, ['matching', 'shifting', 'holding']);
  for (let i = 1; i < sc.controls.length; i++) {
    const c = sc.controls[i];
    if (c.mode !== sc.controls[i - 1].mode) assert.equal(Math.round(c.t) % 60, 0, `mode change at ${c.t}s`);
    const step = Math.hypot(c.valence - sc.controls[i - 1].valence, c.arousal - sc.controls[i - 1].arousal);
    assert.ok(step < 0.03, `smooth: step ${step} at ${c.t}s`);
  }
});

test('UT-SND-06 event rate matches the requested rate (Poisson by thinning)', () => {
  for (const a of [0.2, 0.6, 0.95]) {
    const mood = { valence: 0.5, energy: a, targetValence: 0.5, targetEnergy: a };
    const sc = S.buildScore(mood, { durationS: 7200, seed: 11, fadeOut: false });
    const want = S.mapAffectToParams({ valence: 0.5, arousal: a }).eventsPerMin;
    const got = sc.events.length / ((7200 - 6) / 60);
    // Poisson: sd of the count = sqrt(n); allow 4 sd
    const n = want * 120;
    assert.ok(Math.abs(got * 120 - n) <= 4 * Math.sqrt(n), `a=${a} want ${want}/min got ${got.toFixed(2)}/min`);
    // inter-onset intervals: coefficient of variation ≈ 1 for a Poisson process
    const iois = sc.events.slice(1).map((e, i) => e.t - sc.events[i].t);
    const mean = iois.reduce((s, x) => s + x, 0) / iois.length;
    const sd = Math.sqrt(iois.reduce((s, x) => s + (x - mean) ** 2, 0) / iois.length);
    assert.ok(sd / mean > 0.8 && sd / mean < 1.2, `CV ${sd / mean}`);
  }
});

test('UT-SND-07 melodic motion is mostly stepwise (Markov chain) and stays in the mode', () => {
  const mood = { valence: 0.8, energy: 0.7, targetValence: 0.8, targetEnergy: 0.7 };
  const sc = S.buildScore(mood, { durationS: 3600, seed: 5 });
  const ratios = S.MODES.major.ratios;
  let inMode = 0;
  for (const e of sc.events) {
    let r = e.freq / sc.root;
    while (r >= 2 - 1e-6) r /= 2;
    while (r < 1 - 1e-6) r *= 2;
    if (ratios.some((x) => Math.abs(x - r) < 1e-3)) inMode++;
  }
  assert.equal(inMode, sc.events.length, 'every pitch belongs to the mode');
  const cents = sc.events.slice(1).map((e, i) => Math.abs(1200 * Math.log2(e.freq / sc.events[i].freq)) % 1200);
  const small = cents.filter((c) => c < 450 || c > 750).length / cents.length;
  assert.ok(small > 0.5, `stepwise share ${small}`);
});

test('UT-SND-08 every driven parameter is documented with its type and source', () => {
  const p = S.mapAffectToParams({ valence: 0.5, arousal: 0.5 });
  const documented = new Set(S.MAPPING_TABLE.map((m) => m.param));
  for (const k of ['mode', 'registerOct', 'widthDeg', 'eventsPerMin', 'attackS', 'decayS', 'droneDb', 'textureDb', 'textureMotion', 'breathHz', 'repetition', 'brightnessHz', 'tilt']) {
    assert.ok(k in p, k);
    assert.ok(documented.has(k), `${k} missing from MAPPING_TABLE`);
  }
  for (const m of S.MAPPING_TABLE) {
    assert.ok(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].includes(m.type));
    assert.ok(m.ref && m.cue);
  }
});

test('UT-SND-09 stored preferences are sanitised', () => {
  assert.deepEqual(S.normalizeSoundscapePrefs({ space: 'cave', soundmark: 'fire', volume: 9, minutes: 7 }), { space: 'room', soundmark: 'wind', volume: 1, minutes: 20 });
  assert.deepEqual(S.normalizeSoundscapePrefs({ space: 'open', soundmark: 'none', volume: 0.2, minutes: 0 }), { space: 'open', soundmark: 'none', volume: 0.2, minutes: 0 });
  assert.deepEqual(S.normalizeSoundscapePrefs(null), { ...S.SOUNDSCAPE_DEFAULT_PREFS });
});

test('UT-WAV-01 WAV export: valid RIFF header, exact length, dither within ±1 LSB', () => {
  const n = 4410;
  const L = new Float32Array(n).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 441 * i) / 44100));
  const R = new Float32Array(n).fill(2); // clipped
  const buf = W.encodeWav16([L, R], 44100, { seed: 1 });
  const h = W.readWavHeader(buf);
  assert.deepEqual({ riff: h.riff, wave: h.wave, format: h.format, channels: h.channels, sampleRate: h.sampleRate, bits: h.bits }, { riff: 'RIFF', wave: 'WAVE', format: 1, channels: 2, sampleRate: 44100, bits: 16 });
  assert.equal(h.dataBytes, n * 4);
  assert.equal(buf.byteLength, 44 + n * 4);
  const v = new DataView(buf);
  for (let i = 0; i < n; i++) {
    const l = v.getInt16(44 + i * 4, true);
    assert.ok(Math.abs(l - L[i] * 32767) <= 1.5, 'dither ≤ 1 LSB');
    assert.equal(v.getInt16(46 + i * 4, true), 32767, 'clipped, not wrapped');
  }
});

test('UT-PD-01 the Pure Data twin is structurally valid for every soundmark', () => {
  for (const soundmark of ['wind', 'sea', 'rain', 'none']) {
    const src = PD.buildPdPatch({ root: 110, valence: 0.3, arousal: 0.7, soundmark });
    const chk = PD.checkPdPatch(src);
    assert.ok(chk.ok, `${soundmark}: ${JSON.stringify(chk.bad)}`);
    assert.match(src, /^#N canvas /);
    assert.match(src, /#X obj \d+ \d+ dac~;/);
    assert.match(src, /#X obj \d+ \d+ osc~ 110;/);
    assert.match(src, /#X array scale 5 float 3;/);
    assert.match(src, /clip~ -0\.9 0\.9/);
  }
});

test('UT-PD-02 the patch opens in Pure Data without errors (skipped when Pd is not installed)', (t) => {
  const candidates = [process.env.PD_BIN, '/Applications/Pd-0.56-2.app/Contents/Resources/bin/pd', '/usr/bin/pd', '/usr/local/bin/pd'].filter(Boolean);
  const appDirs = fs.existsSync('/Applications') ? fs.readdirSync('/Applications').filter((d) => /^Pd-/.test(d)) : [];
  for (const d of appDirs) candidates.push(`/Applications/${d}/Contents/Resources/bin/pd`);
  const pd = candidates.find((p) => fs.existsSync(p));
  if (!pd) return t.skip('Pure Data not installed');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ausc-pd-'));
  for (const soundmark of ['wind', 'sea', 'rain']) {
    const file = path.join(dir, `${soundmark}.pd`);
    fs.writeFileSync(file, PD.buildPdPatch({ root: 123.47, valence: 0.7, arousal: 0.3, soundmark }));
    const r = spawnSync(pd, ['-nogui', '-noprefs', '-noaudio', '-nomidi', '-stderr', '-open', file, '-send', 'pd quit'], { encoding: 'utf8', timeout: 15000 });
    const log = `${r.stdout}\n${r.stderr}`;
    assert.ok(!/couldn't create|error/i.test(log), `${soundmark}: ${log.slice(0, 400)}`);
  }
});

test('UT-AM-01 loudness meter follows ITU-R BS.1770-4 (1 kHz, 0 dBFS, one channel = −3.01 LKFS)', () => {
  for (const rate of [48000, 44100]) {
    const n = rate * 5;
    const x = new Float32Array(n).map((_, i) => Math.sin((2 * Math.PI * 1000 * i) / rate));
    const l = M.integratedLoudness([x], rate);
    assert.ok(Math.abs(l - -3.01) < 0.1, `${rate}: ${l}`);
    const quiet = x.map((s) => s * 0.1); // −20 dB
    assert.ok(Math.abs(M.integratedLoudness([quiet], rate) - -23.01) < 0.1);
  }
  assert.equal(M.integratedLoudness([new Float32Array(48000 * 2)], 48000), -Infinity, 'silence is gated out');
  const k = M.kWeightingCoefficients(44100);
  assert.equal(k.length, 2);
});

test('UT-AM-02 spectral centroid and onset detector on known signals', () => {
  const rate = 48000;
  const sine = new Float32Array(rate * 2).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 1500 * i) / rate));
  assert.ok(Math.abs(M.spectralCentroid([sine], rate) - 1500) < 30);
  // decaying tone bursts at known times
  const times = [0.5, 1.3, 2.0, 3.4, 4.1];
  const x = new Float32Array(rate * 5);
  for (const t0 of times) {
    const s0 = Math.round(t0 * rate);
    for (let i = 0; i < rate * 0.6 && s0 + i < x.length; i++) x[s0 + i] += 0.3 * Math.sin((2 * Math.PI * 1200 * i) / rate) * Math.exp(-i / (rate * 0.15));
  }
  const det = M.onsetRate([x], rate).times;
  assert.equal(det.length, times.length, `detected ${det.map((d) => d.toFixed(2))}`);
  det.forEach((d, i) => assert.ok(Math.abs(d - times[i]) <= 0.05, `${d} vs ${times[i]}`));
  assert.ok(Math.abs(M.spearman([1, 2, 3, 4], [10, 20, 25, 40]) - 1) < 1e-9);
  assert.ok(M.peakDb([x]) < 0);
});

test('UT-CX-01 circumplex geometry and diary summary', () => {
  const s = CX.MAP_SIZE;
  assert.deepEqual(CX.toXY(0, 1), { x: 26, y: 26 });
  assert.deepEqual(CX.toXY(1, 0), { x: s - 26, y: s - 26 });
  assert.equal(CX.quadrantOf(0.8, 0.2), 'pos-low');
  assert.equal(CX.quadrantOf(0.2, 0.8), 'neg-high');
  const sum = CX.summarizeEntries([
    { valence: 0.2, energy: 0.8, targetValence: 0.4, targetEnergy: 0.6 },
    { valence: 0.6, energy: 0.4, targetValence: 0.6, targetEnergy: 0.4 },
    { valence: null, energy: 0.5 },
  ]);
  assert.equal(sum.n, 2);
  assert.equal(sum.valence, 0.4);
  assert.equal(sum.meanShift, 0.14);
  assert.equal(sum.quadrants['neg-high'], 1);
  assert.deepEqual(CX.summarizeEntries([]), { n: 0 });
});
