// End-to-end: acoustic verification of the generative soundscape (A1–A5 in
// tests/acoustic/bench.mjs), rendered by Chromium's Web Audio implementation.
// Writes docs/verifica/misure-paesaggio.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadPlaywright, playwrightAvailable, EXT_DIR } from './harness.mjs';

const skip = !(await playwrightAvailable()) && 'Playwright not installed';
const OUT = path.join(EXT_DIR, 'docs', 'verifica', 'misure-paesaggio.json');

function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(root, path.normalize(rel));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('E2E-21 soundscape: safe levels, tempo and brightness follow the mapping, reproducible (A1–A5)', { skip, timeout: 600_000 }, async () => {
  const pw = await loadPlaywright();
  const server = await serve(EXT_DIR);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/acoustic/bench.html`);
    const r = await page.evaluate(() => window.runBench({ seconds: 100 }));
    fs.writeFileSync(OUT, `${JSON.stringify({ _doc: 'Acoustic verification (tests/e2e/soundscape-acoustic.e2e.mjs).', ...r }, null, 1)}\n`);
    assert.ok(r.A1.maxPeakDb <= -1, `peak ${r.A1.maxPeakDb}`);
    assert.ok(r.A1.maxAbsDc < 0.001);
    assert.ok(r.A1.lufsRange[0] >= -34 && r.A1.lufsRange[1] <= -16, `loudness ${r.A1.lufsRange}`);
    assert.ok(r.A2.f >= 0.8, `onset F ${r.A2.f}`);
    assert.ok(r.A2.spearmanArousalDetectedRate >= 0.8);
    assert.ok(r.A3.spearmanBrightnessCentroid >= 0.8);
    assert.ok(r.A4.spearmanDrone >= 0.7);
    assert.ok(r.A5.maxAbsDifference < 1 / 32768, 'same seed, same samples (below 16-bit resolution)');
  } finally {
    await browser.close();
    server.close();
  }
});
