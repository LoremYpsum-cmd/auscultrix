#!/usr/bin/env node
/**
 * Internal evaluation of the mood engine with the statistics a reviewer asks
 * for: confusion matrices, per-class precision/recall/F1, macro-F1, Cohen's κ
 * against the gold labels, 95 % intervals (Wilson for proportions, seeded
 * percentile bootstrap with B = 5000 for F1 and κ), baselines (majority class,
 * stratified random) and the 4.33 engine, compared with exact McNemar tests.
 *
 *   node tests/stats/internal-eval.mjs   → docs/verifica/valutazione-interna.json
 *
 * Caveats written into the output: the sets are small (102 + 50 Italian
 * sentences), written and labelled by the project, and the held-out set was
 * looked at once before the lexicon was expanded (74 % → see
 * tests/heldout-result-before-expansion.json). They are regression sets, not
 * a validation; external validation is in docs/scientifico/validazione-esterna.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

globalThis.chrome = { i18n: { getMessage: (k) => k, getUILanguage: () => 'it' }, runtime: {} };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const B = 5000;

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const readSet = (f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8').split('\n')
  .filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')).map(([text, val, quad]) => ({ text, val, quad }));

const sign = (v) => (v > 0.58 ? '+' : v < 0.42 ? '-' : '0');
const quad = (m) => {
  const v = m.valence, a = m.energy;
  if (v >= 0.42 && v <= 0.58 && !(m.secondaryEmotions || []).includes('calm')) return 'neutral';
  if (v > 0.5) return a >= 0.5 ? 'pos-high' : 'pos-low';
  return a >= 0.5 ? 'neg-high' : 'neg-low';
};

function wilson(k, n, z = 1.959964) {
  if (!n) return [0, 0];
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - h, c + h];
}

function confusion(gold, pred, labels) {
  const m = Object.fromEntries(labels.map((g) => [g, Object.fromEntries(labels.map((p) => [p, 0]))]));
  gold.forEach((g, i) => { if (m[g] && pred[i] in m[g]) m[g][pred[i]]++; });
  return m;
}

function metrics(gold, pred, labels) {
  const n = gold.length;
  const acc = gold.filter((g, i) => g === pred[i]).length / n;
  const per = {};
  let f1sum = 0, present = 0;
  for (const c of labels) {
    const tp = gold.filter((g, i) => g === c && pred[i] === c).length;
    const fp = gold.filter((g, i) => g !== c && pred[i] === c).length;
    const fn = gold.filter((g, i) => g === c && pred[i] !== c).length;
    const p = tp + fp ? tp / (tp + fp) : 0, r = tp + fn ? tp / (tp + fn) : 0;
    const f1 = p + r ? (2 * p * r) / (p + r) : 0;
    per[c] = { support: tp + fn, precision: +p.toFixed(3), recall: +r.toFixed(3), f1: +f1.toFixed(3) };
    if (tp + fn > 0) { f1sum += f1; present++; }
  }
  // Cohen's κ (engine vs gold)
  const pe = labels.reduce((s, c) => s + (gold.filter((g) => g === c).length / n) * (pred.filter((p) => p === c).length / n), 0);
  const kappa = pe < 1 ? (acc - pe) / (1 - pe) : 1;
  return { accuracy: acc, macroF1: f1sum / Math.max(1, present), kappa, perClass: per };
}

function bootstrap(gold, pred, labels, seed) {
  const rng = mulberry32(seed);
  const n = gold.length;
  const f1s = [], ks = [];
  for (let b = 0; b < B; b++) {
    const g = [], p = [];
    for (let i = 0; i < n; i++) { const j = Math.floor(rng() * n); g.push(gold[j]); p.push(pred[j]); }
    const m = metrics(g, p, labels);
    f1s.push(m.macroF1); ks.push(m.kappa);
  }
  const ci = (xs) => { const s = [...xs].sort((a, b) => a - b); return [s[Math.floor(0.025 * B)], s[Math.floor(0.975 * B) - 1]].map((x) => +x.toFixed(3)); };
  return { macroF1: ci(f1s), kappa: ci(ks) };
}

/** Exact two-sided McNemar on discordant pairs. */
function mcnemar(b, c) {
  const n = b + c;
  if (!n) return 1;
  const k = Math.min(b, c);
  let p = 0;
  let coef = 1;
  for (let i = 0; i <= n; i++) {
    if (i > 0) coef = (coef * (n - i + 1)) / i;
    if (i <= k) p += coef;
  }
  return Math.min(1, (2 * p) / 2 ** n);
}

async function engine(rel) {
  const mod = await import(pathToFileURL(path.join(ROOT, rel)).href);
  return (s) => mod.analyzeMoodHeuristic({ input: s, energy: 0.5 });
}

const VAL = ['+', '0', '-'];
const QUAD = ['pos-high', 'pos-low', 'neg-high', 'neg-low', 'neutral'];
const engines = { '6.0': await engine('lib/mood.js') };
if (fs.existsSync(path.join(ROOT, 'archive/_unpacked/4.33/lib/mood.js'))) engines['4.33'] = await engine('archive/_unpacked/4.33/lib/mood.js');

const out = { generatedAt: new Date().toISOString(), bootstrapResamples: B, caveats: [
  'Small sets (102 development + 50 held-out Italian sentences) written and labelled within the project: regression sets, not a validation.',
  'The held-out set was evaluated once (74 % valence accuracy, tests/heldout-result-before-expansion.json) and the lexicon was expanded afterwards: from then on it is no longer independent.',
  'One annotator: no inter-annotator agreement can be computed; κ here is engine-vs-gold, not annotator agreement.',
], sets: {} };

for (const set of ['mood-gold.tsv', 'mood-heldout.tsv']) {
  const rows = readSet(set);
  const goldV = rows.map((r) => r.val), goldQ = rows.map((r) => r.quad);
  const res = { n: rows.length, distribution: Object.fromEntries(VAL.map((c) => [c, goldV.filter((g) => g === c).length])), systems: {} };
  const correct = {};
  for (const [name, run] of Object.entries(engines)) {
    const preds = rows.map((r) => run(r.text));
    const pv = preds.map((m) => sign(m.valence)), pq = preds.map(quad);
    const mv = metrics(goldV, pv, VAL), mq = metrics(goldQ, pq, QUAD);
    const k = goldV.filter((g, i) => g === pv[i]).length;
    correct[name] = goldV.map((g, i) => g === pv[i]);
    res.systems[name] = {
      valence: { ...mv, accuracyCI95: wilson(k, rows.length).map((x) => +x.toFixed(3)), bootstrapCI95: bootstrap(goldV, pv, VAL, 1), confusion: confusion(goldV, pv, VAL) },
      quadrant: { accuracy: mq.accuracy, macroF1: mq.macroF1, kappa: mq.kappa, bootstrapCI95: bootstrap(goldQ, pq, QUAD, 2) },
      polarityFlips: goldV.filter((g, i) => (g === '+' && pv[i] === '-') || (g === '-' && pv[i] === '+')).length,
    };
  }
  // baselines
  const major = VAL.reduce((a, c) => (goldV.filter((g) => g === c).length > goldV.filter((g) => g === a).length ? c : a), VAL[0]);
  const mb = metrics(goldV, goldV.map(() => major), VAL);
  res.systems.majorityBaseline = { label: major, valence: { accuracy: mb.accuracy, macroF1: mb.macroF1, kappa: mb.kappa } };
  const rng = mulberry32(3);
  const pri = VAL.map((c) => goldV.filter((g) => g === c).length / goldV.length);
  let accSum = 0, f1Sum = 0;
  for (let b = 0; b < 1000; b++) {
    const pr = goldV.map(() => { let r = rng(); for (let i = 0; i < VAL.length; i++) { if ((r -= pri[i]) <= 0) return VAL[i]; } return VAL[0]; });
    const m = metrics(goldV, pr, VAL); accSum += m.accuracy; f1Sum += m.macroF1;
  }
  res.systems.stratifiedRandomBaseline = { valence: { accuracy: accSum / 1000, macroF1: f1Sum / 1000, kappa: 0 } };
  if (correct['4.33']) {
    const b = correct['6.0'].filter((c, i) => c && !correct['4.33'][i]).length;
    const c = correct['6.0'].filter((x, i) => !x && correct['4.33'][i]).length;
    res.mcnemar_6_0_vs_4_33 = { onlyNew: b, onlyOld: c, pExact: mcnemar(b, c) };
  }
  out.sets[set] = res;
}

const dest = path.join(ROOT, 'docs', 'verifica', 'valutazione-interna.json');
fs.writeFileSync(dest, `${JSON.stringify(out, (k, v) => (typeof v === 'number' && !Number.isInteger(v) && k !== 'pExact' ? +v.toFixed(4) : v), 1)}\n`);
for (const [set, r] of Object.entries(out.sets)) {
  const s = r.systems;
  console.log(`${set} n=${r.n}  6.0 acc ${s['6.0'].valence.accuracy.toFixed(3)} [${s['6.0'].valence.accuracyCI95}] macroF1 ${s['6.0'].valence.macroF1.toFixed(3)} ${JSON.stringify(s['6.0'].valence.bootstrapCI95.macroF1)} κ ${s['6.0'].valence.kappa.toFixed(3)} | 4.33 acc ${s['4.33']?.valence.accuracy.toFixed(3)} | majority ${s.majorityBaseline.valence.accuracy.toFixed(3)} | McNemar p ${r.mcnemar_6_0_vs_4_33?.pExact.toExponential(2)}`);
}
