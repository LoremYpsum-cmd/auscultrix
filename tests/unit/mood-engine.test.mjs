// Text-affect engine: accuracy gates on the in-house sets, robustness, determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { installChromeMock, importLib, ROOT } from '../helpers/env.mjs';

installChromeMock();
const { analyzeMoodHeuristic, isoTarget, ISO_MAX_STEP } = await importLib('lib/mood.js');

const sign = (v) => (v > 0.58 ? '+' : v < 0.42 ? '-' : '0');
function evalSet(file) {
  const rows = fs.readFileSync(path.join(ROOT, 'tests', file), 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
  let ok = 0, flips = 0, isoUnsafe = 0;
  for (const [s, gv, gq] of rows) {
    const m = analyzeMoodHeuristic({ input: s, energy: 0.5 });
    const pv = sign(m.valence);
    if (pv === gv) ok++;
    if ((gv === '+' && pv === '-') || (gv === '-' && pv === '+')) flips++;
    if (gv === '-' && gq === 'neg-high' && m.targetEnergy > m.energy + 0.05) isoUnsafe++;
  }
  return { n: rows.length, acc: ok / rows.length, flips, isoUnsafe };
}

test('UT-MOOD-01 development set (n=102): valence ≥ 95 %, no polarity flip, no ISO-unsafe target', () => {
  const r = evalSet('mood-gold.tsv');
  assert.equal(r.n, 102);
  assert.ok(r.acc >= 0.95, `valence accuracy ${r.acc}`);
  assert.equal(r.flips, 0);
  assert.equal(r.isoUnsafe, 0);
});

test('UT-MOOD-02 held-out set (n=50, contaminated after 5.0 lexicon expansion): valence ≥ 90 %, ≤ 1 flip, no ISO-unsafe', () => {
  const r = evalSet('mood-heldout.tsv');
  assert.equal(r.n, 50);
  assert.ok(r.acc >= 0.9, `valence accuracy ${r.acc}`);
  assert.ok(r.flips <= 1);
  assert.equal(r.isoUnsafe, 0);
});

test('UT-MOOD-03 negation flips polarity (IT/EN)', () => {
  for (const [pos, neg] of [['sto bene', 'non sto bene'], ['sono felice', 'non sono felice'], ['I am happy', 'I am not happy at all']]) {
    const a = analyzeMoodHeuristic({ input: pos, energy: 0.5 }).valence;
    const b = analyzeMoodHeuristic({ input: neg, energy: 0.5 }).valence;
    assert.ok(a > 0.5 && b < 0.5, `${pos} ${a} vs ${neg} ${b}`);
  }
});

test('UT-MOOD-04 robustness: empty, whitespace, emoji only, 100k chars, markup, non-strings never throw and stay in [0,1]', () => {
  const inputs = ['', '   ', '😢😢', 'a'.repeat(100_000), '<script>alert(1)</script> sono triste', '\u0000‮', 'ÀÈÌÒÙ àèìòù', null, undefined, 42, { x: 1 }];
  for (const input of inputs) {
    const m = analyzeMoodHeuristic({ input, energy: 0.5 });
    for (const k of ['energy', 'valence', 'targetEnergy', 'targetValence']) {
      assert.ok(Number.isFinite(m[k]) && m[k] >= 0 && m[k] <= 1, `${String(input).slice(0, 20)} → ${k}=${m[k]}`);
    }
  }
});

test('UT-MOOD-05 slider extremes and invalid energy are clamped', () => {
  for (const energy of [-5, 0, 1, 7, NaN, undefined, '0.3']) {
    const m = analyzeMoodHeuristic({ input: 'sono stanco', energy });
    assert.ok(m.energy >= 0 && m.energy <= 1, `energy ${energy} → ${m.energy}`);
  }
});

test('UT-MOOD-06 deterministic: same input → same output', () => {
  const a = analyzeMoodHeuristic({ input: 'oggi sono in ansia ma contento', energy: 0.4 });
  const b = analyzeMoodHeuristic({ input: 'oggi sono in ansia ma contento', energy: 0.4 });
  assert.deepEqual(a, b);
});

test('UT-MOOD-07 ISO target never farther than ISO_MAX_STEP from the start', () => {
  const texts = ['sono disperato', 'sono furioso', 'sto benissimo', 'ho paura', 'sono stanco morto', 'non ho voglia di niente', 'I feel great', 'I am terrified'];
  for (const input of texts) {
    for (const energy of [0, 0.25, 0.5, 0.75, 1]) {
      const m = analyzeMoodHeuristic({ input, energy });
      const step = Math.hypot(m.targetEnergy - m.energy, m.targetValence - m.valence);
      assert.ok(step <= ISO_MAX_STEP + 1e-9, `${input}@${energy}: step ${step}`);
    }
  }
  assert.equal(typeof isoTarget, 'function');
});

test('UT-MOOD-08 the analysis keeps the raw text only in memory fields that the persistence layer strips', async () => {
  const { persistableMood } = await importLib('lib/data-inventory.js');
  const m = analyzeMoodHeuristic({ input: 'mi chiamo Anna e sono triste', energy: 0.5 });
  assert.equal(m.rawInput, 'mi chiamo Anna e sono triste');
  const p = persistableMood(m);
  assert.ok(!JSON.stringify(p).includes('Anna'));
});
