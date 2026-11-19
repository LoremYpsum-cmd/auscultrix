// Localisation integrity, photosensitive safety, Vision zoom curve, lyrics analysis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { installChromeMock, importLib, readText, listFiles, ROOT } from '../helpers/env.mjs';

installChromeMock();
const it = JSON.parse(readText('_locales/it/messages.json'));
const en = JSON.parse(readText('_locales/en/messages.json'));

test('UT-I18N-01 Italian and English catalogues have the same keys and placeholders', () => {
  assert.deepEqual(Object.keys(it).sort(), Object.keys(en).sort());
  for (const k of Object.keys(it)) {
    const a = Object.keys(it[k].placeholders || {}).sort();
    const b = Object.keys(en[k].placeholders || {}).sort();
    assert.deepEqual(a, b, k);
    for (const name of a) assert.ok(it[k].message.includes(`$${name}$`) && en[k].message.includes(`$${name}$`), `${k}:${name}`);
  }
});

test('UT-I18N-02 every key used in HTML and in t(\'…\') calls exists', () => {
  const missing = [];
  for (const f of ['sidepanel.html', 'options.html']) {
    for (const m of readText(f).matchAll(/data-i18n(?:-aria|-title|-placeholder)?="([^"]+)"/g)) if (!it[m[1]]) missing.push(`${f}:${m[1]}`);
  }
  for (const f of ['sidepanel.js', 'options.js', ...listFiles('lib', (x) => x.endsWith('.js'))]) {
    for (const m of readText(f).matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) if (!it[m[1]]) missing.push(`${f}:${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('UT-I18N-03 no UI copy calls the product a therapy or a cure', () => {
  for (const k of ['disclaimer', 'extDescription', 'yourDataBody']) {
    assert.ok(!/terapia|therapy|cura le|cures?\b/i.test(it[k].message.replace(/non sostituisce una cura|does not replace care/i, '')), `it ${k}`);
    assert.ok(!/terapia|therapy/i.test(en[k].message), `en ${k}`);
  }
  assert.match(it.disclaimer.message, /non è un dispositivo medico/i);
  assert.match(en.disclaimer.message, /not a medical device/i);
});

test('UT-I18N-04 no visible element falls back to its hard-coded text (an empty message would leave one language in the other UI)', () => {
  const leaks = [];
  for (const f of ['sidepanel.html', 'options.html']) {
    for (const m of readText(f).matchAll(/<([a-z0-9]+)\b([^>]*?)\bdata-i18n="([^"]+)"([^>]*)>([^<]*)</g)) {
      const attrs = `${m[2]} ${m[4]}`;
      const fallback = m[5].trim();
      if (!fallback || /\shidden(\s|=|$)/.test(` ${attrs} `)) continue;
      for (const [lang, cat] of [['it', it], ['en', en]]) if (!cat[m[3]]?.message?.trim()) leaks.push(`${f}:${m[3]} (${lang})`);
    }
  }
  assert.deepEqual(leaks, []);
});

/* ------------------------- photosensitive safety ------------------------ */
function gifDelaysMs(buf) {
  const out = [];
  for (let i = 0; i < buf.length - 5; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) out.push((buf[i + 4] | (buf[i + 5] << 8)) * 10);
  }
  return out;
}

test('UT-PHOTO-01 Vision GIFs never change frame faster than 3 per second (delays ≥ 330 ms)', () => {
  for (const f of listFiles('assets/vj', (x) => x.endsWith('.gif'))) {
    const d = gifDelaysMs(fs.readFileSync(path.join(ROOT, f)));
    assert.ok(d.length > 0, f);
    assert.ok(Math.min(...d) >= 330, `${f}: ${Math.min(...d)} ms`);
  }
});

test('UT-PHOTO-02 WCAG 2.3.1 screening of every GIF: ≤ 3 flashes/s, no red flashes (fixture from tools/photosensitivity_check.py)', () => {
  const fx = JSON.parse(readText('tests/fixtures/photosensitivity.json'));
  assert.equal(fx.allPass, true);
  for (const a of fx.assets) {
    assert.ok(a.worstFlashesPerSecond <= 3, a.file);
    assert.equal(a.redStateTransitions, 0, a.file);
  }
});

test('UT-PHOTO-03 SAFE mode caps keep every ambient layer below the WCAG flash definition (opacity × Δlum < 0.10)', () => {
  const fx = JSON.parse(readText('tests/fixtures/photosensitivity.json'));
  const src = readText('content/vj-overlay.js');
  const table = Object.fromEntries([...src.matchAll(/'(ambient_[a-z_]+\.gif)':\s*([0-9.]+)/g)].map((m) => [m[1], Number(m[2])]));
  const target = Number(src.match(/SAFE_STEP_TARGET = ([0-9.]+)/)[1]);
  assert.ok(target < 0.1);
  for (const a of fx.assets.filter((x) => x.file.includes('assets/vj/ambient_'))) {
    const name = path.basename(a.file);
    assert.ok(name in table, `${name} missing from AMBIENT_LUMINANCE_STEP`);
    assert.ok(table[name] >= a.maxBlockLuminanceStep - 1e-4, `${name}: table ${table[name]} < measured ${a.maxBlockLuminanceStep}`);
    const cap = Math.min(1, target / table[name]);
    assert.ok(cap * a.maxBlockLuminanceStep < 0.1, name);
  }
});

/* ------------------------------ zoom curve ----------------------------- */
test('UT-ZOOM-01 thesis §9.4: peak 1.25 exactly at mid-track for 95–420 s, baseline at both ends, symmetric', async () => {
  const z = await importLib('lib/vj-zoom-curve.mjs');
  for (const dur of [95, 180, 210, 300, 420]) {
    assert.ok(Math.abs(z.zoomScaleFromProgress(z.progressFromMedia(dur / 2, dur)) - 1.25) < 1e-12);
    assert.equal(z.zoomScaleFromProgress(z.progressFromMedia(0, dur)), 1);
    assert.equal(z.zoomScaleFromProgress(z.progressFromMedia(dur, dur)), 1);
    for (const p of [0.1, 0.27, 0.4]) assert.ok(Math.abs(z.zoomScaleFromProgress(p) - z.zoomScaleFromProgress(1 - p)) < 1e-12);
  }
  assert.equal(z.progressFromMedia(5, 0), 0);
  assert.equal(z.progressFromMedia(-1, 10), 0);
});

/* -------------------------------- lyrics ------------------------------- */
test('UT-LYR-01 thesis §7.9: sad Italian lyrics lower valence, joyful English raise it, short texts give no verdict, weights capped', async () => {
  const l = await importLib('lib/lyrics.js');
  const sad = l.analyzeLyricsText('piango da sola nel buio, ho perso tutto, il dolore resta e la tristezza non passa, solitudine e lacrime ogni notte senza te');
  const happy = l.analyzeLyricsText('I am so happy tonight, love and joy and sunshine, dancing with my friends, smiling all the way, wonderful beautiful day');
  assert.ok(sad && happy);
  assert.ok(sad.lyricValence < 0.5 && happy.lyricValence > 0.5, `${sad.lyricValence} ${happy.lyricValence}`);
  assert.equal(l.analyzeLyricsText('ciao'), null);
  const accent = l.analyzeLyricsText('perché più è già così però città felicità tristezza dolore lacrime ancora più giù perché');
  assert.ok(accent === null || Number.isFinite(accent.lyricValence));
  const track = Object.freeze({ id: 't', energy: 0.8, valence: 0.8, energySource: 'mir_preview', valenceSource: 'mir_preview' });
  const out = l.applyLyricFeatures(track, { lyricValence: 0, lyricArousal: 0, confidence: 1, themes: [] });
  assert.ok(out.valence >= 0.8 * (1 - 0.35) - 1e-9, `valence moved more than 35 %: ${out.valence}`);
  assert.ok(out.energy >= 0.8 * (1 - 0.15) - 1e-9, `energy moved more than 15 %: ${out.energy}`);
  assert.equal(track.valence, 0.8, 'pure function');
});

test('UT-LYR-02 lyrics lookup is opt-in (off unless the person enables it)', () => {
  const src = readText('sidepanel.js');
  assert.match(src, /if \(!els\.lyricsToggle\?\.checked\) return;/);
  assert.ok(!/id="lyrics-toggle"[^>]*checked/.test(readText('sidepanel.html')));
});
