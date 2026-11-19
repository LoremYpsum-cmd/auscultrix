/**
 * E2E harness: loads the unpacked extension in Chromium (headless=new) with
 * Playwright and fakes every external host, so tests are offline-safe and
 * deterministic. YouTube watch/results pages are served by a local stub that
 * contains a real <video> element (silent WAV), enough for the content
 * scripts (player bridge, auto-advance, Vision) to behave as on YouTube.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Playwright is optional: e2e tests are skipped (not failed) when it is absent. */
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    // fall through to explicit paths
  }
  const require = createRequire(import.meta.url);
  const roots = [
    process.env.PLAYWRIGHT_PATH,
    ...String(process.env.NODE_PATH || '').split(path.delimiter),
    '/opt/npm-tools/node_modules',
  ].filter(Boolean);
  for (const root of roots) {
    try {
      return require(require.resolve('playwright', { paths: [root] }));
    } catch {
      // try next
    }
  }
  return null;
}
export const EXT_DIR = process.env.AUSCULTRIX_EXT_DIR || path.resolve(HERE, '..', '..');

/** 16-bit mono PCM WAV of `seconds` of silence. */
export function silentWav(seconds = 30, rate = 8000) {
  const n = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  return buf;
}

const WAV = silentWav(30);

function fakeYouTubeHtml(url) {
  const u = new URL(url);
  const v = u.searchParams.get('v') || '';
  const isResults = u.pathname.startsWith('/results');
  const results = isResults
    ? `<a id="video-title" href="/watch?v=AAAAAAAAAAA" title="${(u.searchParams.get('search_query') || '').replace(/"/g, '')}">${(u.searchParams.get('search_query') || 'result')}</a>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${isResults ? 'results' : 'watch ' + v} - YouTube</title></head>
<body><ytd-app>${results}
<div id="movie_player" class="html5-video-player"><video class="html5-main-video" src="https://www.youtube.com/__fake_media.wav" playsinline></video>
<button class="ytp-large-play-button" onclick="document.querySelector('video').play()">play</button></div>
</ytd-app></body></html>`;
}

/**
 * @param {{ userDataDir?: string, offline?: boolean, extDir?: string }} [opts]
 */
export async function launch(opts = {}) {
  const userDataDir = opts.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'ausc-e2e-'));
  const extDir = opts.extDir || EXT_DIR;
  const pw = await loadPlaywright();
  if (!pw) throw new Error('playwright not available');
  const context = await pw.chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--autoplay-policy=no-user-gesture-required',
      '--headless=new',
      ...(opts.exposeGc ? ['--js-flags=--expose-gc'] : []),
    ],
    viewport: { width: 420, height: 900 },
  });
  const log = { console: [], pageErrors: [], requests: [] };
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (url.startsWith('chrome-extension://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue();
    }
    log.requests.push({ url, type: req.resourceType() });
    let host = '';
    try { host = new URL(url).hostname; } catch { /* ignore */ }
    if (/(^|\.)youtube\.com$/.test(host)) {
      if (url.includes('__fake_media.wav')) {
        return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
      }
      if (url.includes('/oembed')) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: fakeYouTubeHtml(url) });
    }
    if (opts.offline !== false) return route.abort('internetdisconnected');
    return route.continue();
  });
  context.on('page', (p) => attachPageLog(p, log));
  for (const p of context.pages()) attachPageLog(p, log);

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
  sw.on('console', (m) => log.console.push({ where: 'sw', type: m.type(), text: m.text() }));
  const extId = new URL(sw.url()).host;
  return { context, sw, extId, userDataDir, log };
}

function attachPageLog(p, log) {
  p.on('console', (m) => log.console.push({ where: p.url(), type: m.type(), text: m.text() }));
  p.on('pageerror', (e) => log.pageErrors.push({ where: p.url(), message: String(e?.message || e) }));
}

/** Open the side panel document in a normal tab (same code path, testable). */
export async function openPanel(ctx, { dismissDisclaimer = true } = {}) {
  const page = await ctx.context.newPage();
  await page.goto(`chrome-extension://${ctx.extId}/sidepanel.html`);
  await page.waitForFunction(() => document.querySelectorAll('.mood-chip').length > 0);
  // wait until start-up is over (library loaded, start-up sheets shown): on a
  // slow machine the wellbeing notice can appear after the first paint
  await page
    .waitForFunction(() => performance.getEntriesByName('auscultrix:ready').length > 0, null, { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(200);
  if (dismissDisclaimer) {
    const vis = await page.locator('#disclaimer-pip:not(.hidden)').count();
    if (vis) await page.click('#disclaimer-pip-close');
  }
  return page;
}

export async function storage(ctx, keys = null) {
  return ctx.sw.evaluate((k) => chrome.storage.local.get(k), keys);
}

export async function sessionStorageArea(ctx, keys = null) {
  return ctx.sw.evaluate((k) => (chrome.storage.session ? chrome.storage.session.get(k) : {}), keys);
}

export async function youtubeTabs(ctx) {
  return ctx.context.pages().filter((p) => /youtube\.com/.test(p.url()));
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll until fn() is truthy (or throw after timeout). */
export async function waitFor(fn, { timeout = 10000, interval = 100, message = 'condition' } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch {
      // retry
    }
    await sleep(interval);
  }
  throw new Error(`timeout waiting for ${message} (last=${JSON.stringify(last)})`);
}

/** Start a session from the panel and dismiss the session sheet if it appears. */
export async function startSession(page, text, { closeSheet = true } = {}) {
  await page.fill('#mood-input', text);
  await page.click('#btn-start');
  await page.waitForSelector('#playlist-section:not(.hidden)', { timeout: 10000 });
  if (closeSheet) {
    await sleep(300);
    if (await page.locator('#session-pip:not(.hidden)').count()) await page.click('#session-pip-close');
  }
}

/** Keys of chrome.storage.session, read from the service worker. */
export async function sessionArea(ctx) {
  return ctx.sw.evaluate(() => chrome.storage.session.get(null));
}

/** Skip helper for node:test when Playwright/Chromium is missing. */
export async function playwrightAvailable() {
  return !!(await loadPlaywright());
}
