// End-to-end: rapid actions, offline, persistence, erase, extension restart, options page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, openPanel, storage, sessionArea, youtubeTabs, sleep, waitFor, startSession, playwrightAvailable } from './harness.mjs';

const skip = !(await playwrightAvailable()) && 'Playwright not installed';
const NON_PERSONAL = ['tracks', 'trackCount', 'artistCounts', 'genreCounts', 'librarySource', 'librarySyncedAt', 'librarySyncAttemptAt', 'librarySyncMode', 'libraryProfileUrl', 'libraryCreatorName', 'spotifyConnected', 'spotifyCreatorUserId', 'likedSongsBundleVersion', 'selectionProvider', 'emergenteCatalogOverridesV1', 'vjOptInMigrated_3_2_2', 'spotifyTokenVault'];
const DEFAULTS = ['vjEnabled', 'vjPhotosensitiveSafe', 'playbackProviderId'];

test('E2E-12 rapid repeated actions: triple «Begin» = one session; six quick «Next» stay consistent', { skip, timeout: 90000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await page.fill('#mood-input', 'sono preoccupato');
    await page.evaluate(() => { const b = document.getElementById('btn-start'); b.click(); b.click(); b.click(); });
    await page.waitForSelector('#playlist-section:not(.hidden)');
    await sleep(2500);
    if (await page.locator('#session-pip:not(.hidden)').count()) await page.click('#session-pip-close');
    assert.equal((await storage(ctx, ['userModelV1'])).userModelV1.entries.length, 1);
    await page.evaluate(() => { const b = document.getElementById('btn-next'); for (let i = 0; i < 6; i++) b.click(); });
    await sleep(4000);
    const { playlistIndex, playlist, currentTrack } = await storage(ctx, ['playlistIndex', 'playlist', 'currentTrack']);
    assert.ok(playlistIndex >= 1 && playlistIndex <= 6, `index ${playlistIndex}`);
    assert.equal(currentTrack.id, playlist[playlistIndex].id, 'stored current track matches the index');
    assert.equal((await youtubeTabs(ctx)).length, 1, 'one player tab');
    assert.deepEqual(ctx.log.pageErrors, []);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-13 no internet: every external request fails, the panel still works with no error shown', { skip, timeout: 60000 }, async () => {
  const ctx = await launch({ offline: true });
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'mi sento solo');
    assert.ok((await page.locator('#playlist-list .playlist-track').count()) > 0);
    const shown = await page.textContent('#now-playing');
    assert.ok(!/errore|error|non ha funzionato/i.test(shown), shown);
    assert.deepEqual(ctx.log.pageErrors, []);
    const blocked = ctx.log.requests.filter((r) => !/youtube\.com/.test(r.url));
    assert.ok(blocked.every((r) => !/itunes\.apple\.com|api\.deezer\.com|lrclib\.net/.test(r.url)), 'no Apple/Deezer/LRCLIB calls by default');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-14 restart: playlist and preferences persist; typed text and photo do not', { skip, timeout: 90000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ausc-persist-'));
  let ctx = await launch({ userDataDir: dir });
  let ids;
  try {
    const page = await openPanel(ctx);
    await page.locator('#mood-image-input').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    await sleep(800);
    await startSession(page, 'parola-segreta-42 oggi sono nervoso');
    ids = (await storage(ctx, ['playlist'])).playlist.map((t) => t.id);
  } finally {
    await ctx.context.close();
  }
  ctx = await launch({ userDataDir: dir });
  try {
    const local = await storage(ctx, null);
    assert.deepEqual(local.playlist.map((t) => t.id), ids);
    const dump = JSON.stringify(local);
    assert.ok(!dump.includes('parola-segreta-42'));
    assert.ok(!dump.includes('data:image'), 'photo on disk');
    assert.deepEqual(await sessionArea(ctx), {}, 'session storage is empty after a restart');
    const page = await openPanel(ctx);
    assert.equal(await page.inputValue('#mood-input'), '');
    assert.ok((await page.locator('#playlist-list .playlist-track').count()) > 0, 'playlist restored');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-15 «Forget everything»: only public catalogues and safe defaults remain', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono felice');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    await page.click('#btn-clear-data');
    await waitFor(async () => !(await page.isHidden('#your-data-status')), { message: 'confirmation' });
    const keys = Object.keys(await storage(ctx, null));
    const extra = keys.filter((k) => !NON_PERSONAL.includes(k) && !DEFAULTS.includes(k));
    assert.deepEqual(extra, []);
    const sess = await sessionArea(ctx);
    assert.equal(sess.listeningSessionActive, undefined);
    assert.equal(sess.moodImageDataUrl, undefined);
    assert.equal(await page.inputValue('#mood-input'), '');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-16 service worker suspended and restarted (MV3 idle): session state survives, player still owned', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono stanca');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    const before = await sessionArea(ctx);
    assert.ok(Number.isInteger(before.playerTabId));
    const cdp = await ctx.context.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    await sleep(1000);
    // any extension event wakes the worker again
    const reply = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'LIST_PLAYBACK_PROVIDERS' }));
    assert.equal(reply.ok, true);
    const [sw] = ctx.context.serviceWorkers();
    if (sw) ctx.sw = sw;
    const after = await page.evaluate(() => chrome.storage.session.get(null));
    assert.equal(after.playerTabId, before.playerTabId);
    assert.equal(after.listeningSessionActive, true);
    // and «Next» still drives the same player tab
    await page.click('#btn-next');
    await sleep(1500);
    assert.equal((await youtubeTabs(ctx)).length, 1);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-17 options page: diary style, localised, no errors', { skip, timeout: 30000 }, async () => {
  const ctx = await launch();
  try {
    const p = await ctx.context.newPage();
    await p.goto(`chrome-extension://${ctx.extId}/options.html`);
    await p.waitForFunction(() => /\d+\.\d+\.\d+/.test(document.getElementById('options-version').textContent));
    const h1 = await p.textContent('h1');
    assert.ok(h1 && h1.length > 5);
    assert.deepEqual(ctx.log.pageErrors, []);
  } finally {
    await ctx.context.close();
  }
});
