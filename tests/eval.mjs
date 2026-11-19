// Usage: node tests/eval.mjs <path-to-mood.js> [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
globalThis.chrome = { i18n: { getMessage: (k) => k, getUILanguage: () => 'it' }, runtime: {} };
const here = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.resolve(process.argv[2] || path.join(here, '../lib/mood.js'));
const { analyzeMoodHeuristic } = await import(enginePath);
const rows = fs.readFileSync(path.join(here, process.env.GOLD || 'mood-gold.tsv'), 'utf8').split('\n')
  .filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
const sign = (v) => (v > 0.58 ? '+' : v < 0.42 ? '-' : '0');
const quad = (m) => {
  const v = m.valence, a = m.energy;
  if (v >= 0.42 && v <= 0.58 && !(m.secondaryEmotions || []).includes('calm')) return 'neutral';
  if (v > 0.5) return a >= 0.5 ? 'pos-high' : 'pos-low';
  return a >= 0.5 ? 'neg-high' : 'neg-low';
};
let okV = 0, okQ = 0, flips = 0, isoBad = 0;
const fails = [];
for (const [s, gv, gq] of rows) {
  const m = analyzeMoodHeuristic({ input: s, energy: 0.5 });
  const pv = sign(m.valence), pq = quad(m);
  if (pv === gv) okV++;
  if (pq === gq) okQ++;
  // polarity flip: the worst error — a negative state read as positive or vice versa
  if ((gv === '+' && pv === '-') || (gv === '-' && pv === '+')) flips++;
  // ISO safety: a negative state must never be pushed toward *more* arousal by > 0.25
  if (gv === '-' && gq === 'neg-high' && m.targetEnergy > m.energy + 0.05) isoBad++;
  if (pv !== gv || pq !== gq) fails.push(`${s.padEnd(34)} gold ${gv} ${gq.padEnd(8)} got ${pv} ${pq.padEnd(8)} v${m.valence.toFixed(2)} a${m.energy.toFixed(2)}`);
}
const n = rows.length;
const pct = (x) => (100 * x / n).toFixed(1) + '%';
console.log(JSON.stringify({ engine: path.relative(process.cwd(), enginePath), n, valenceAccuracy: pct(okV), quadrantAccuracy: pct(okQ), polarityFlips: flips, isoUnsafe: isoBad }));
if (process.argv.includes('--verbose')) console.log(fails.join('\n'));
