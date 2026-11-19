// Energy/valence formulas and provenance of affective coordinates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { installChromeMock, importLib, ROOT } from '../helpers/env.mjs';

installChromeMock();
const te = await importLib('lib/track-energy.js');
const prov = await importLib('lib/affect-provenance.js');
const { mergeSeedMirFeatures } = await importLib('lib/liked-songs-library.js');
const { bandcampYoutubeTracks } = await importLib('lib/bandcamp-youtube-corpus.js');

test('UT-EN-01 thesis §7.4 worked example: «Tutti» (99 BPM, −14.3 dB, D 0.467, A 0.333) → E = 0.584', () => {
  const e = te.computeTrackEnergy({ tempo: 99, loudness: -14.3, danceability: 0.467, acousticness: 0.333 }, { force: true });
  assert.ok(Math.abs(e - 0.5846) < 0.001, `E=${e}`);
});

test('UT-EN-02 normalisations: 60 BPM → 0, 180 BPM → 1; −45 dB → 0, −5 dB → 1 (clamped outside)', () => {
  assert.equal(te.normalizeBpm(60), 0);
  assert.equal(te.normalizeBpm(180), 1);
  assert.equal(te.normalizeBpm(240), 1);
  assert.equal(te.normalizeLoudness(-45), 0);
  assert.equal(te.normalizeLoudness(-5), 1);
  assert.equal(te.normalizeLoudness(-80), 0);
  assert.equal(te.normalizeBpm(0), null);
});

test('UT-EN-03 ordinal validity: fast, loud, danceable, electric > slow, quiet, acoustic', () => {
  const hi = te.computeTrackEnergy({ tempo: 150, loudness: -6, danceability: 0.8, acousticness: 0.05 }, { force: true });
  const lo = te.computeTrackEnergy({ tempo: 70, loudness: -28, danceability: 0.2, acousticness: 0.9 }, { force: true });
  assert.ok(hi > 0.8 && lo < 0.3 && hi > lo, `${hi} vs ${lo}`);
});

test('UT-EN-04 valence is never inferred from popularity (no measured input → neutral 0.5, marked unknown)', () => {
  const t = te.enrichTrackAudioFeatures({ id: 'x', popularity: 95 });
  assert.equal(t.valence, 0.5);
  assert.equal(t.valenceSource, 'neutral_unknown');
  const u = te.enrichTrackAudioFeatures({ id: 'y', popularity: 5 });
  assert.equal(u.valence, 0.5);
  assert.equal(prov.isAffectGrounded(t), false);
});

test('UT-EN-05 the formula label is used only with measured inputs', () => {
  const t = te.enrichTrackAudioFeatures({ id: 'z' });
  assert.notEqual(t.energySource, 'mir_formula');
  const m = te.enrichTrackAudioFeatures({ id: 'w', tempo: 120, loudness: -9, danceability: 0.6, acousticness: 0.2 });
  assert.equal(m.energySource, 'mir_formula');
  assert.equal(prov.isAffectGrounded(m), true);
});

test('UT-PROV-01 annotated corpora and audio measurements are grounded; catalogue placeholders are not', () => {
  for (const src of ['therapy_corpus', 'underground_corpus', 'italian_corpus', 'mir_preview', 'mir_preview+lyrics']) {
    assert.equal(prov.isAffectGrounded({ energySource: src, valenceSource: src }), true, src);
  }
  for (const src of ['unannotated', 'unknown', 'popularity_estimate', 'italy_bandcamp', 'world_bandcamp', '', undefined]) {
    assert.equal(prov.isAffectGrounded({ energySource: src, valenceSource: src }), false, String(src));
  }
});

test('UT-PROV-02 Emergente catalogue: Italy/World Bandcamp placeholders (0.45/0.50) are flagged unannotated', () => {
  const pool = bandcampYoutubeTracks().map((t) => te.enrichTrackAudioFeatures({ ...t }));
  const grounded = pool.filter(prov.isAffectGrounded);
  const placeholders = pool.filter((t) => t.energy === 0.45 && t.valence === 0.5);
  assert.ok(pool.length > 7000, `pool ${pool.length}`);
  assert.equal(grounded.length, 77, 'only the hand-annotated underground corpus is calibrated');
  assert.ok(placeholders.every((t) => !prov.isAffectGrounded(t) || t.energySource === 'underground_corpus'));
});

test('UT-PROV-03 measured seed features are re-attached to the curator catalogue offline (≥ 300 matches)', () => {
  const liked = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/liked-songs-library.json'), 'utf8')).tracks;
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/library-seed.json'), 'utf8')).tracks.map((t) => te.enrichTrackAudioFeatures({ ...t }));
  const { tracks, attached, appended } = mergeSeedMirFeatures(liked, seed);
  assert.ok(attached >= 300, `attached ${attached}`);
  assert.ok(appended >= 100, `appended ${appended}`);
  assert.ok(tracks.filter(prov.isAffectGrounded).length >= 450);
  // pure function: input untouched
  assert.ok(liked.every((t) => t.energy === undefined));
});

test('UT-PROV-04 corpus annotations: coordinates in [0,1], unique ids, all four Russell quadrants covered', async () => {
  const { mergeKnownLibrary } = await importLib('lib/musictherapy-corpus.js');
  const corpora = mergeKnownLibrary([]).filter(prov.isAffectGrounded);
  assert.ok(corpora.length >= 120, `${corpora.length}`);
  const ids = new Set();
  const q = { hh: 0, hl: 0, lh: 0, ll: 0 };
  for (const t of corpora) {
    assert.ok(t.energy >= 0 && t.energy <= 1 && t.valence >= 0 && t.valence <= 1);
    assert.ok(!ids.has(t.id), `dup ${t.id}`);
    ids.add(t.id);
    q[(t.valence >= 0.5 ? 'h' : 'l') + (t.energy >= 0.5 ? 'h' : 'l')]++;
  }
  for (const [k, n] of Object.entries(q)) assert.ok(n >= 5, `quadrant ${k} has ${n}`);
});
