#!/usr/bin/env node
/**
 * Runs the whole verification suite and writes the test report from the
 * ACTUAL run (nothing is copied from previous runs except where stated).
 *
 *   node tests/run-all.mjs                 unit + simulation + e2e (if Playwright)
 *   node tests/run-all.mjs --unit          unit + simulation only
 *   AUSCULTRIX_EXTERNAL_DATA=<dir> node tests/run-all.mjs
 *       also recomputes the external validation (EmoBank, VADER ground truth)
 *
 * Outputs: docs/verifica/rapporto-test.md and docs/verifica/rapporto-test.json
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'verifica');
fs.mkdirSync(OUT_DIR, { recursive: true });
const unitOnly = process.argv.includes('--unit');

function parseTap(text) {
  const tests = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(ok|not ok) \d+ - (.+?)(?: # (SKIP|TODO)\b(.*))?$/);
    if (!m) continue;
    if (m[1].length > 0) continue; // nested
    const name = m[3].trim();
    let duration = null;
    let error = null;
    for (let j = i + 1; j < Math.min(lines.length, i + 40); j++) {
      if (/^(ok|not ok) \d+ - /.test(lines[j])) break;
      const d = lines[j].match(/duration_ms: ([0-9.]+)/);
      if (d && duration == null) duration = Number(d[1]);
      const e = lines[j].match(/^\s+error: (.*)$/);
      if (e && error == null) error = e[1].replace(/^['|-]+\s*/, '').slice(0, 300);
    }
    const status = m[4] === 'SKIP' ? 'skipped' : m[2] === 'ok' ? 'passed' : 'failed';
    tests.push({ name, status, durationMs: duration, error: status === 'failed' ? error : null, note: m[4] ? (m[5] || '').trim() : null });
  }
  return tests;
}

function runNodeTests(files, label) {
  if (!files.length) return { label, tests: [], exitCode: 0 };
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...files], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env },
  });
  const tests = parseTap(r.stdout || '');
  return { label, tests, exitCode: r.status, wallMs: Date.now() - t0, stderr: (r.stderr || '').slice(-2000) };
}

const list = (dir, suffix) =>
  fs.existsSync(path.join(ROOT, dir))
    ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(suffix)).sort().map((f) => path.join(dir, f))
    : [];

const started = new Date();
const suites = [];
suites.push(runNodeTests(list('tests/unit', '.test.mjs'), 'unit'));
if (!unitOnly) suites.push(runNodeTests(list('tests/e2e', '.e2e.mjs'), 'e2e'));

// Simulation: ISO trajectory quality on the real catalogues
const sim = await import(pathToFileURL(path.join(ROOT, 'tests/sim/iso-quality.mjs')).href);
const simResult = sim.runAll();

// External validation: recomputed when the data are available, otherwise the
// stored result is reported with its own date.
let external = null;
let externalSource = 'none';
if (process.env.AUSCULTRIX_EXTERNAL_DATA) {
  const ext = await import(pathToFileURL(path.join(ROOT, 'tests/external/eval-external.mjs')).href);
  external = await ext.runExternal(process.env.AUSCULTRIX_EXTERNAL_DATA);
  fs.writeFileSync(path.join(OUT_DIR, 'validazione-esterna.json'), `${JSON.stringify(external, null, 2)}\n`);
  externalSource = 'recomputed in this run';
} else if (fs.existsSync(path.join(OUT_DIR, 'validazione-esterna.json'))) {
  external = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'validazione-esterna.json'), 'utf8'));
  externalSource = `stored result of ${external.generatedAt}`;
}

let measures = null;
try {
  measures = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'misure-e2e.json'), 'utf8'));
} catch {
  measures = null;
}

let chromium = null;
try {
  const { loadPlaywright } = await import(pathToFileURL(path.join(ROOT, 'tests/e2e/harness.mjs')).href);
  const pw = await loadPlaywright();
  if (pw) chromium = pw.chromium.executablePath();
} catch {
  chromium = null;
}

const all = suites.flatMap((s) => s.tests.map((t) => ({ suite: s.label, ...t })));
const count = (st) => all.filter((t) => t.status === st).length;
const summary = { total: all.length, passed: count('passed'), failed: count('failed'), skipped: count('skipped') };
const env = {
  date: started.toISOString(),
  node: process.version,
  platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  chromium,
  extensionVersion: JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version,
};
const json = { env, summary, suites: suites.map(({ label, exitCode, wallMs }) => ({ label, exitCode, wallMs })), tests: all, simulation: simResult, external: external ? { source: externalSource, results: external.results, comparisons: external.comparisons, datasets: external.datasets } : null, measures };
fs.writeFileSync(path.join(OUT_DIR, 'rapporto-test.json'), `${JSON.stringify(json, null, 2)}\n`);

/* ------------------------------- markdown ------------------------------- */
const f3 = (x) => (x == null ? '—' : Number(x).toFixed(3));
const f2 = (x) => (x == null ? '—' : Number(x).toFixed(2));
const md = [];
md.push('# Rapporto dei test — Auscultrix');
md.push('');
md.push('> Generato automaticamente da `node tests/run-all.mjs` a partire dall\'esecuzione reale. Non modificare a mano.');
md.push('');
md.push(`- Data: ${env.date}`);
md.push(`- Versione dell'estensione: ${env.extensionVersion}`);
md.push(`- Node: ${env.node} · Sistema: ${env.platform}`);
md.push(`- Chromium per i test end-to-end: ${chromium ? 'disponibile (Playwright, headless)' : 'non disponibile: test end-to-end saltati'}`);
md.push('');
md.push(`**Esito: ${summary.passed} superati, ${summary.failed} falliti, ${summary.skipped} saltati, su ${summary.total}.**`);
md.push('');
for (const s of suites) {
  md.push(`## Suite «${s.label}» (${s.tests.length} test, ${Math.round((s.wallMs || 0) / 1000)} s)`);
  md.push('');
  md.push('| Esito | Test | Durata |');
  md.push('|---|---|---|');
  for (const t of s.tests) {
    const mark = t.status === 'passed' ? 'superato' : t.status === 'failed' ? '**FALLITO**' : 'saltato';
    md.push(`| ${mark} | ${t.name.replace(/\|/g, '\\|')}${t.error ? ` — ${t.error.replace(/\|/g, '\\|')}` : ''}${t.note ? ` (${t.note})` : ''} | ${t.durationMs == null ? '—' : `${Math.round(t.durationMs)} ms`} |`);
  }
  md.push('');
}
md.push('## Simulazione: qualità della traiettoria ISO sui cataloghi reali');
md.push('');
md.push(`Finestra di spostamento: ${simResult.shiftWindowMin} minuti. Brani calibrati nel catalogo «Varia»: ${simResult.variaCalibratedPool}.`);
md.push('');
md.push('| Umore | Catalogo | Brani | Calibrati | Distanza media dal punto ISO | Salto massimo | Salti > 0,4 |');
md.push('|---|---|---|---|---|---|---|');
for (const r of simResult.rows) md.push(`| ${r.mood} | ${r.mode} | ${r.n} | ${Math.round(r.calibratedShare * 100)} % | ${f3(r.meanDistToWaypoint)} | ${f2(r.maxJump)} | ${r.jumpsOver040}/${r.transitions} |`);
md.push('');
if (external) {
  md.push('## Validazione esterna del motore testuale');
  md.push('');
  md.push(`Fonte dei numeri: ${externalSource}. Dati annotati da persone, mai usati per tarare il motore.`);
  md.push('');
  md.push('| Corpus | Versione | n | r di Pearson [IC 95 %] | Accuratezza di polarità [IC 95 %] | Copertura |');
  md.push('|---|---|---|---|---|---|');
  for (const [eng, res] of Object.entries(external.results || {})) {
    for (const [k, m] of Object.entries(res)) {
      md.push(`| ${k} | ${eng} | ${m.n} | ${f3(m.pearson)} [${f3(m.pearsonCI?.[0])}, ${f3(m.pearsonCI?.[1])}] | ${m.polarityAccuracy == null ? '—' : `${f3(m.polarityAccuracy)} [${f3(m.polarityAccuracyCI?.[0])}, ${f3(m.polarityAccuracyCI?.[1])}]`} | ${m.coverage == null ? '—' : f2(m.coverage)} |`);
    }
  }
  md.push('');
}
if (measures?.performance) {
  const p = measures.performance;
  md.push('## Prestazioni misurate (end-to-end)');
  md.push('');
  md.push(`- Pannello pronto: mediana ${p.panelReadyMs.median} ms, massimo ${p.panelReadyMs.max} ms (5 aperture)`);
  md.push(`- Costruzione della sessione (analisi + playlist + resa): mediana ${p.sessionBuildMs.median} ms, 95° percentile ${p.sessionBuildMs.p95} ms (20 sessioni)`);
  md.push(`- Crescita della memoria JS dopo 20 sessioni: ${p.heapGrowthMB ?? '—'} MB`);
  md.push(`- Spazio occupato in chrome.storage.local: ${Math.round(p.storageBytes / 1024)} KB`);
  md.push(`- Misurato il: ${measures.measuredAt}`);
  md.push('');
}
md.push('## Cosa questi test non coprono');
md.push('');
md.push('- Firefox e Safari reali: i test girano su Chromium. La variante Firefox è verificata solo staticamente (manifest derivato, assenza di API Chrome-only).');
md.push('- YouTube reale: le pagine YouTube sono simulate in locale (stesso URL, elemento video reale); i cambiamenti del sito YouTube non sono coperti.');
md.push('- Accessibilità: controlli automatici scritti sui criteri WCAG 2.2 (nomi, alternative testuali, contrasto, dimensione dei bersagli, tastiera, dialoghi); axe-core e prove con lettori di schermo non sono stati eseguiti.');
md.push('- Validità del motore in italiano: misurata su commenti annotati (MultiEmotions-It, r = 0,31; `docs/verifica/validazione-esterna-italiano.json`), non ancora su autodescrizioni; vedi il piano di validazione.');
md.push('');
fs.writeFileSync(path.join(OUT_DIR, 'rapporto-test.md'), `${md.join('\n')}\n`);

/* -------------------------- traceability matrix ------------------------- */
const reqs = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'requirements.json'), 'utf8')).requirements;
const byId = (id) => all.filter((t) => t.name === id || t.name.startsWith(`${id} `));
const tr = [];
tr.push('# Matrice di tracciabilità requisiti → test');
tr.push('');
tr.push(`> Generata da \`node tests/run-all.mjs\` il ${env.date} (versione ${env.extensionVersion}) a partire da \`tests/requirements.json\` e dall'esecuzione reale dei test. Origine: RF/RNF = capitolo 4 della tesi; gli altri sono stati aggiunti nella revisione 5.0/5.1.`);
tr.push('');
tr.push('| Requisito | Origine | Descrizione | Test | Esito |');
tr.push('|---|---|---|---|---|');
let reqOk = 0, reqKo = 0, reqMissing = 0;
for (const r of reqs) {
  const found = r.tests.map((id) => ({ id, runs: byId(id) }));
  const missing = found.filter((f) => !f.runs.length).map((f) => f.id);
  const failed = found.flatMap((f) => f.runs).filter((t) => t.status === 'failed');
  const skipped = found.flatMap((f) => f.runs).filter((t) => t.status === 'skipped');
  let verdict;
  if (failed.length) { verdict = '**NON SODDISFATTO**'; reqKo++; }
  else if (missing.length) { verdict = `incompleto (manca: ${missing.join(', ')})`; reqMissing++; }
  else if (skipped.length) { verdict = 'non verificato (test saltati)'; reqMissing++; }
  else { verdict = 'verificato'; reqOk++; }
  tr.push(`| ${r.id} | ${r.origin} | ${r.text} | ${r.tests.join(', ')} | ${verdict} |`);
}
tr.push('');
tr.push(`**${reqOk} requisiti verificati, ${reqKo} non soddisfatti, ${reqMissing} incompleti o non verificati, su ${reqs.length}.**`);
tr.push('');
tr.push('Non verificabili automaticamente qui: funzionamento in Firefox e Safari reali, YouTube reale, prove con lettori di schermo, efficacia sul benessere (vedi `docs/scientifico/piano-di-validazione.md`).');
fs.mkdirSync(path.join(ROOT, 'docs', 'tecnico'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'tecnico', 'tracciabilita.md'), `${tr.join('\n')}\n`);

console.log(`requirements: ${reqOk} verified, ${reqKo} failed, ${reqMissing} incomplete (of ${reqs.length})`);
console.log(`tests: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped (of ${summary.total})`);
console.log(`report: ${path.relative(ROOT, path.join(OUT_DIR, 'rapporto-test.md'))}`);
process.exit(summary.failed ? 1 : 0);
