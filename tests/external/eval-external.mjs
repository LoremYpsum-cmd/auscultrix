/**
 * External validation of the text-affect engine on HUMAN-ANNOTATED corpora
 * the engine was never tuned on.
 *
 *  - EmoBank (Buechel & Hahn, 2017): 10,062 English sentences rated for
 *    Valence/Arousal/Dominance (1–5). Only the official TEST split (n = 1,000)
 *    is used. Licence CC BY-SA 4.0. https://github.com/JULIELab/EmoBank
 *  - VADER ground truth (Hutto & Gilbert, 2014): 4 sets of English snippets
 *    (tweets, movie reviews, NYT editorials, Amazon reviews) with the mean of
 *    ~20 human ratings on −4…+4. https://github.com/cjhutto/vaderSentiment
 *
 *  - MultiEmotions-It (Sprugnoli, 2020): 3,240 Italian comments to YouTube music
 *    videos, YouTube ads and Facebook ads, manually annotated for polarity
 *    (POS/NEG, both = mixed, neither = neutral) and emotions. Licence CC BY-NC-SA
 *    4.0. https://github.com/RacheleSprugnoli/Esercitazioni_SA (dataset/).
 *    Expected at <data>/italian/multiemotions-it/MultiEmotions-It.tsv.
 *    Gold value for correlations: POS − NEG ∈ {−1, 0, +1}; comments marked
 *    UNRELATED are excluded.
 *  - FEEL-IT (Bianchi, Nozza & Hovy, 2021), if available (access by request
 *    form): CSV text,label (positive|negative) at <data>/italian/feelit.csv.
 *
 * Usage: node tests/external/eval-external.mjs <dataDir> [--out file.json]
 * Engines compared: 4.33 (archive) and current (lib/mood.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
globalThis.chrome ??= { i18n: { getMessage: () => '', getUILanguage: () => 'en' }, runtime: { getURL: (p) => p } };

/* ---------------------------- statistics ---------------------------- */
export function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
/** 95 % CI of a correlation via Fisher z. */
export function corrCI(r, n) {
  if (n < 4) return [null, null];
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  const t = (v) => (Math.exp(2 * v) - 1) / (Math.exp(2 * v) + 1);
  return [t(z - 1.96 * se), t(z + 1.96 * se)];
}
/** Wilson score 95 % interval for a proportion. */
export function wilson(k, n, z = 1.96) {
  if (!n) return [null, null];
  const p = k / n;
  const den = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / den, (c + h) / den];
}
/** Exact two-sided McNemar test on discordant pairs (b, c). */
export function mcnemarExact(b, c) {
  const n = b + c;
  if (!n) return 1;
  const k = Math.min(b, c);
  let p = 0;
  let logC = 0; // log C(n, 0)
  const logs = [0];
  for (let i = 1; i <= n; i++) logs[i] = logs[i - 1] + Math.log(i);
  for (let i = 0; i <= k; i++) {
    logC = logs[n] - logs[i] - logs[n - i];
    p += Math.exp(logC - n * Math.LN2);
  }
  return Math.min(1, 2 * p);
}

/* ------------------------------ datasets ---------------------------- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function loadEmoBankTest(dir) {
  const f = path.join(dir, 'emobank', 'corpus', 'emobank.csv');
  if (!fs.existsSync(f)) return null;
  const rows = parseCsv(fs.readFileSync(f, 'utf8'));
  const head = rows.shift();
  const col = (n) => head.indexOf(n);
  return rows
    .filter((r) => r[col('split')] === 'test' && r[col('text')])
    .map((r) => ({ text: r[col('text')], V: Number(r[col('V')]), A: Number(r[col('A')]) }));
}

export function loadVader(dir, name) {
  const f = path.join(dir, 'vader_gt', 'hutto_ICWSM_2014', `${name}_GroundTruth.txt`);
  if (!fs.existsSync(f)) return null;
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((p) => p.length >= 3 && p[2].trim())
    .map((p) => ({ text: p.slice(2).join('\t').trim(), score: Number(p[1]) }))
    .filter((x) => Number.isFinite(x.score));
}

export function loadMultiEmotionsIt(dir) {
  const f = path.join(dir, 'italian', 'multiemotions-it', 'MultiEmotions-It.tsv');
  if (!fs.existsSync(f)) return null;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split('\t');
  const col = (n) => head.indexOf(n);
  return lines
    .map((l) => l.split('\t'))
    .filter((r) => r.length === head.length && r[col('comment')] && r[col('UNRELATED')] !== '1')
    .map((r) => ({
      text: r[col('comment')],
      type: r[col('type')],
      pos: r[col('POS')] === '1',
      neg: r[col('NEG')] === '1',
      sarcasm: r[col('SARCASM')] === '1',
    }));
}

export function loadFeelIt(dir) {
  const f = path.join(dir, 'italian', 'feelit.csv');
  if (!fs.existsSync(f)) return null;
  const rows = parseCsv(fs.readFileSync(f, 'utf8'));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const t = head.indexOf('text'), l = head.indexOf('label');
  return rows.filter((r) => r[t]).map((r) => ({ text: r[t], label: String(r[l]).trim().toLowerCase() }));
}

/* ------------------------------ engines ----------------------------- */
async function loadEngine(file) {
  const mod = await import(pathToFileURL(file).href);
  return (text) => mod.analyzeMoodHeuristic({ input: text, energy: 0.5 });
}

function polarityOf(v) {
  if (v >= 0.55) return 1;
  if (v <= 0.45) return -1;
  return 0;
}

function evaluateValence(items, analyze, getGold, polarThreshold) {
  const pred = [], gold = [];
  let polarN = 0, polarHit = 0, covered = 0, coveredHit = 0;
  const hits = [];
  for (const it of items) {
    const out = analyze(it.text);
    const v = Number(out?.valence ?? 0.5);
    const g = getGold(it);
    pred.push(v); gold.push(g.value);
    if (g.polarity !== 0) {
      polarN++;
      const p = polarityOf(v);
      const ok = p === g.polarity;
      if (ok) polarHit++;
      if (p !== 0) { covered++; if (ok) coveredHit++; }
      hits.push(ok);
    }
  }
  const r = pearson(pred, gold);
  return {
    n: items.length,
    pearson: r,
    pearsonCI: corrCI(r, items.length),
    spearman: spearman(pred, gold),
    polarItems: polarN,
    polarityAccuracy: polarN ? polarHit / polarN : null,
    polarityAccuracyCI: wilson(polarHit, polarN),
    coverage: polarN ? covered / polarN : null,
    accuracyWhenDecided: covered ? coveredHit / covered : null,
    polarThreshold,
    _hits: hits,
  };
}

function evaluateArousal(items, analyze) {
  const pred = [], gold = [];
  for (const it of items) {
    const out = analyze(it.text);
    pred.push(Number(out?.arousal ?? out?.energy ?? 0.5));
    gold.push(it.A);
  }
  const r = pearson(pred, gold);
  return { n: items.length, pearson: r, pearsonCI: corrCI(r, items.length), spearman: spearman(pred, gold) };
}

export async function runExternal(dataDir) {
  const engines = {
    'v4.33': path.join(ROOT, 'archive', '_unpacked', '4.33', 'lib', 'mood.js'),
    current: path.join(ROOT, 'lib', 'mood.js'),
  };
  const out = { generatedAt: new Date().toISOString(), datasets: {}, engines: Object.keys(engines) };
  const emobank = loadEmoBankTest(dataDir);
  const vader = {};
  for (const n of ['tweets', 'movieReviewSnippets', 'nytEditorialSnippets', 'amazonReviewSnippets']) vader[n] = loadVader(dataDir, n);

  const meit = loadMultiEmotionsIt(dataDir);
  const feelit = loadFeelIt(dataDir);
  const itGold = (it) => ({ value: (it.pos ? 1 : 0) - (it.neg ? 1 : 0), polarity: it.pos && !it.neg ? 1 : it.neg && !it.pos ? -1 : 0 });
  const IT_RULE = 'POS only → positive, NEG only → negative; mixed/neutral not polar; value = POS − NEG';
  const results = {};
  for (const [name, file] of Object.entries(engines)) {
    if (!fs.existsSync(file)) continue;
    const analyze = await loadEngine(file);
    results[name] = {};
    if (emobank) {
      results[name].emobank_valence = evaluateValence(emobank, analyze, (it) => ({
        value: it.V,
        polarity: it.V >= 3.5 ? 1 : it.V <= 2.5 ? -1 : 0,
      }), 'V ≥ 3.5 positive, V ≤ 2.5 negative (1–5 scale)');
      results[name].emobank_arousal = evaluateArousal(emobank, analyze);
    }
    if (meit) {
      results[name].it_multiemotions_all = evaluateValence(meit, analyze, itGold, IT_RULE);
      results[name].it_multiemotions_music_videos = evaluateValence(meit.filter((x) => x.type === 'YouTube music video'), analyze, itGold, IT_RULE);
      results[name].it_multiemotions_ads = evaluateValence(meit.filter((x) => x.type !== 'YouTube music video'), analyze, itGold, IT_RULE);
      results[name].it_multiemotions_no_sarcasm = evaluateValence(meit.filter((x) => !x.sarcasm), analyze, itGold, IT_RULE);
    }
    if (feelit) {
      results[name].it_feelit = evaluateValence(feelit, analyze, (it) => {
        const p = it.label === 'positive' ? 1 : it.label === 'negative' ? -1 : 0;
        return { value: p, polarity: p };
      }, 'label positive/negative');
    }
    for (const [n, items] of Object.entries(vader)) {
      if (!items) continue;
      results[name][`vader_${n}`] = evaluateValence(items, analyze, (it) => ({
        value: it.score,
        polarity: it.score >= 1 ? 1 : it.score <= -1 ? -1 : 0,
      }), 'mean rating ≥ +1 positive, ≤ −1 negative (−4…+4 scale)');
    }
  }
  // Paired comparison 4.33 vs current on polar items (exact McNemar).
  const comparisons = {};
  if (results['v4.33'] && results.current) {
    for (const key of Object.keys(results.current)) {
      const a = results['v4.33'][key]?._hits, b = results.current[key]?._hits;
      if (!a || !b || a.length !== b.length) continue;
      let onlyOld = 0, onlyNew = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] && !b[i]) onlyOld++;
        if (!a[i] && b[i]) onlyNew++;
      }
      comparisons[key] = { improvedItems: onlyNew, worsenedItems: onlyOld, mcnemarP: mcnemarExact(onlyOld, onlyNew) };
    }
  }
  for (const e of Object.values(results)) for (const m of Object.values(e)) delete m._hits;
  out.datasets = {
    emobank_test: emobank ? emobank.length : 0,
    ...Object.fromEntries(Object.entries(vader).map(([k, v]) => [`vader_${k}`, v ? v.length : 0])),
    it_multiemotions: meit ? meit.length : 0,
    it_feelit: feelit ? feelit.length : 0,
  };
  out.results = results;
  out.comparisons = comparisons;
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dataDir = process.argv[2];
  if (!dataDir) {
    console.error('usage: node tests/external/eval-external.mjs <dataDir> [--out file.json]');
    process.exit(2);
  }
  const res = await runExternal(dataDir);
  const outIdx = process.argv.indexOf('--out');
  if (outIdx > 0) fs.writeFileSync(process.argv[outIdx + 1], `${JSON.stringify(res, null, 2)}\n`);
  const f = (x) => (x == null ? '—' : x.toFixed(3));
  for (const [eng, r] of Object.entries(res.results)) {
    for (const [k, m] of Object.entries(r)) {
      console.log(`${eng.padEnd(8)} ${k.padEnd(34)} n=${String(m.n).padStart(5)} r=${f(m.pearson)} [${f(m.pearsonCI?.[0])}, ${f(m.pearsonCI?.[1])}] ρ=${f(m.spearman)}${m.polarityAccuracy != null ? ` acc=${f(m.polarityAccuracy)} [${f(m.polarityAccuracyCI[0])}, ${f(m.polarityAccuracyCI[1])}] cov=${f(m.coverage)} n_polar=${m.polarItems}` : ''}`);
    }
  }
  for (const [k, c] of Object.entries(res.comparisons)) console.log(`4.33→current ${k}: +${c.improvedItems} / −${c.worsenedItems}, McNemar p=${c.mcnemarP.toExponential(2)}`);
}
