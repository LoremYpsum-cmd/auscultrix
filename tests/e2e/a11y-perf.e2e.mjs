// End-to-end: automated accessibility checks (WCAG 2.2 AA subset) and performance budgets.
// axe-core could not be installed offline; these checks are written from the WCAG
// success criteria and run on the rendered panel in light and dark mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launch, openPanel, storage, sleep, startSession, playwrightAvailable, EXT_DIR } from './harness.mjs';

const skip = !(await playwrightAvailable()) && 'Playwright not installed';
const REPORT = path.join(EXT_DIR, 'docs', 'verifica', 'misure-e2e.json');
const measures = {};
function record(k, v) {
  measures[k] = v;
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(REPORT, 'utf8')); } catch { /* first */ }
  fs.writeFileSync(REPORT, `${JSON.stringify({ ...prev, ...measures, measuredAt: new Date().toISOString() }, null, 2)}\n`);
}

async function auditPage(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !el.closest('[hidden], .hidden');
    };
    const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const nameOf = (el) => {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
      const lb = el.getAttribute('aria-labelledby');
      if (lb) return lb.split(/\s+/).map((id) => txt(document.getElementById(id))).join(' ').trim();
      if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l && txt(l)) return txt(l); }
      const wrap = el.closest('label'); if (wrap && txt(wrap)) return txt(wrap);
      if (el.tagName === 'INPUT' && ['button', 'submit'].includes(el.type)) return el.value;
      return txt(el) || el.getAttribute('title') || '';
    };
    const interactive = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])')].filter(vis);
    const unnamed = interactive.filter((el) => !nameOf(el)).map((el) => el.outerHTML.slice(0, 90));
    const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-40));
    // target size (WCAG 2.2 SC 2.5.8 AA: 24×24; 44×44 reported as AAA share)
    const controls = interactive.filter((el) => el.tagName !== 'A' || el.closest('nav, .controls, .profile-links'));
    const small = [], large = [];
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      // visually-hidden controls operated through a visible proxy (e.g. the file
      // input behind the drop zone) are not targets: they must be out of the tab order
      if (r.width * r.height <= 4 && el.getAttribute('tabindex') === '-1') continue;
      if (el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type)) {
        const lab = el.closest('label');
        const lr = lab ? lab.getBoundingClientRect() : r;
        if (lr.height < 24) small.push(`${el.id || el.type} ${Math.round(lr.width)}×${Math.round(lr.height)}`);
        continue;
      }
      if (r.width < 24 || r.height < 24) small.push(`${el.id || el.className || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
      else if (r.width >= 44 && r.height >= 44) large.push(el);
    }
    // contrast (SC 1.4.3): text nodes vs. resolved solid background
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const bgOf = (el) => {
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const st = getComputedStyle(n);
        if (st.backgroundImage && st.backgroundImage !== 'none' && !/gradient\(\s*(?:[^()]*\([^()]*\))*[^()]*\)/.test('') && n !== document.documentElement && n !== document.body) {
          if (/url\(/.test(st.backgroundImage)) return null; // image behind text: not computable
        }
        const c = parse(st.backgroundColor);
        if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
      return bg;
    };
    const lowContrast = [];
    let checked = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own) continue;
      if (el.closest('[disabled], [aria-disabled="true"]')) continue; // inactive components are exempt
      const st = getComputedStyle(el);
      const fg = parse(st.color);
      const bg = bgOf(el);
      if (!fg || !bg) continue;
      checked++;
      const fgc = fg.a < 1 ? blend(fg, bg) : fg;
      const L1 = lum(fgc), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(st.fontSize);
      const bold = Number(st.fontWeight) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) lowContrast.push(`${ratio.toFixed(2)}<${need} «${txt(el).slice(0, 40)}» ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`);
    }
    const dialogs = [...document.querySelectorAll('[role=dialog]')].map((d) => ({ id: d.id, modal: d.getAttribute('aria-modal'), label: txt(document.getElementById(d.getAttribute('aria-labelledby') || '')) }));
    return { interactive: interactive.length, unnamed, imgsNoAlt, small, largeShare: controls.length ? large.length / controls.length : 0, lowContrast, contrastChecked: checked, dialogs, lang: document.documentElement.lang };
  });
}

for (const scheme of ['light', 'dark']) {
  test(`E2E-A11Y-01 (${scheme}) names, alt text, dialogs, target size ≥ 24 px, text contrast ≥ 4.5:1`, { skip, timeout: 90000 }, async () => {
    const ctx = await launch();
    try {
      const page = await openPanel(ctx);
      await page.emulateMedia({ colorScheme: scheme });
      await sleep(300);
      const home = await auditPage(page);
      await startSession(page, 'oggi sono un po’ giù');
      await sleep(500);
      const results = await auditPage(page);
      record(`a11y_${scheme}`, {
        home: { unnamed: home.unnamed.length, small: home.small.length, lowContrast: home.lowContrast, contrastChecked: home.contrastChecked },
        session: { interactive: results.interactive, unnamed: results.unnamed, small: results.small, share44: Number(results.largeShare.toFixed(2)), lowContrast: results.lowContrast, contrastChecked: results.contrastChecked },
      });
      for (const r of [home, results]) {
        assert.deepEqual(r.unnamed, [], 'controls without an accessible name');
        assert.deepEqual(r.imgsNoAlt, [], 'images without alt');
        assert.deepEqual(r.small, [], 'targets smaller than 24×24');
        assert.deepEqual(r.lowContrast, [], 'text below the contrast minimum');
        for (const d of r.dialogs) {
          assert.equal(d.modal, 'true', d.id);
          assert.ok(d.label, `${d.id} has no label`);
        }
        assert.ok(['it', 'en'].includes(r.lang.slice(0, 2)), `lang=${r.lang}`);
        assert.ok(r.contrastChecked > 30, `only ${r.contrastChecked} text elements checked`);
      }
    } finally {
      await ctx.context.close();
    }
  });
}

test('E2E-A11Y-02 keyboard only: reach the diary, a label and «Begin», focus always visible', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    const seen = [];
    let invisibleFocus = 0;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        // past the last control focus returns to the document (browser UI): not a stop
        if (!el || el === document.body || el === document.documentElement) return { id: '#document', cls: '', visible: true };
        const st = getComputedStyle(el);
        const visible = (st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) > 0) || (st.boxShadow && st.boxShadow !== 'none');
        return { id: el.id, cls: el.className, visible };
      });
      seen.push(info.id || info.cls);
      if (!info.visible) invisibleFocus++;
    }
    assert.ok(seen.includes('mood-input'), 'diary field reachable');
    assert.ok(seen.some((s) => String(s).includes('mood-chip')), 'labels reachable');
    assert.ok(seen.includes('btn-start'), '«Begin» reachable');
    assert.equal(invisibleFocus, 0, 'focus indicator missing on some stops');
    await page.focus('#mood-input');
    await page.keyboard.type('sono sereno');
    await page.focus('#btn-start');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#playlist-section:not(.hidden)');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-PERF-01 budgets: panel ready < 3 s, session built < 1.5 s, heap growth < 25 MB over 20 sessions, storage < 5 MB', { skip, timeout: 180000 }, async () => {
  const ctx = await launch({ exposeGc: true });
  try {
    const ready = [];
    for (let i = 0; i < 5; i++) {
      const p = await ctx.context.newPage();
      await p.goto(`chrome-extension://${ctx.extId}/sidepanel.html`);
      const t = await p.waitForFunction(() => {
        const m = performance.getEntriesByName('auscultrix:ready')[0];
        return m ? m.startTime : false;
      }, null, { timeout: 15000 });
      ready.push(await t.jsonValue());
      await p.close();
    }
    ready.sort((a, b) => a - b);
    const page = await openPanel(ctx);
    const gen = [];
    let heap1 = null, heap20 = null;
    for (let i = 0; i < 20; i++) {
      const dt = await page.evaluate(async (k) => {
        document.getElementById('mood-input').value = `prova ${k}: oggi sono ${k % 2 ? 'triste' : 'contento'}`;
        const t0 = performance.now();
        document.getElementById('btn-start').click();
        await new Promise((res) => {
          const tick = () => (document.querySelector('#playlist-list .playlist-track') && performance.now() - t0 > 5 ? res() : requestAnimationFrame(tick));
          tick();
        });
        return performance.now() - t0;
      }, i);
      gen.push(dt);
      await sleep(250);
      await page.evaluate(() => { document.getElementById('session-pip-close')?.click(); });
      if (i === 0 || i === 19) {
        const h = await page.evaluate(() => { if (globalThis.gc) gc(); return performance.memory?.usedJSHeapSize ?? null; });
        if (i === 0) heap1 = h; else heap20 = h;
      }
    }
    gen.sort((a, b) => a - b);
    const bytes = await ctx.sw.evaluate(() => chrome.storage.local.getBytesInUse(null));
    const result = {
      panelReadyMs: { median: Math.round(ready[2]), max: Math.round(ready[4]) },
      sessionBuildMs: { median: Math.round(gen[10]), p95: Math.round(gen[18]) },
      heapGrowthMB: heap1 && heap20 ? Number(((heap20 - heap1) / 1048576).toFixed(1)) : null,
      storageBytes: bytes,
    };
    record('performance', result);
    assert.ok(result.panelReadyMs.median < 3000, JSON.stringify(result));
    assert.ok(result.sessionBuildMs.median < 1500, JSON.stringify(result));
    if (result.heapGrowthMB != null) assert.ok(result.heapGrowthMB < 25, JSON.stringify(result));
    assert.ok(bytes < 5 * 1024 * 1024, `storage ${bytes}`);
  } finally {
    await ctx.context.close();
  }
});
