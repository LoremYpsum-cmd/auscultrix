// End-to-end: tab ownership, auto-advance, end of playlist, Vision choices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, openPanel, storage, sessionArea, youtubeTabs, sleep, waitFor, startSession, playwrightAvailable } from './harness.mjs';

const skip = !(await playwrightAvailable()) && 'Playwright not installed';

async function playToEnd(page) {
  await page.evaluate(async () => {
    const v = document.querySelector('video');
    v.muted = true;
    await v.play().catch(() => {});
    v.playbackRate = 16;
  });
}

test('E2E-06 a video ending in the person\'s own YouTube tab never moves that tab (no hijack)', { skip, timeout: 90000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'mi sento tranquillo');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    for (const p of await youtubeTabs(ctx)) await p.close(); // session ends with the player tab
    await sleep(6000);
    const own = await ctx.context.newPage();
    await own.goto('https://www.youtube.com/watch?v=USERVIDEO01');
    await sleep(3000);
    await playToEnd(own);
    await sleep(6000);
    assert.equal(own.url(), 'https://www.youtube.com/watch?v=USERVIDEO01');
    // even during a running session, another YouTube tab cannot advance it
    // (an adult's natural session end may show the gentle support sheet: close it)
    if (await page.locator('#donation-pip:not(.hidden)').count()) await page.click('#donation-pip-later');
    await page.click('#btn-play');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 2, { message: 'new player tab' });
    const idx0 = (await storage(ctx, ['playlistIndex'])).playlistIndex;
    await own.goto('https://www.youtube.com/watch?v=USERVIDEO02');
    await sleep(3000);
    await playToEnd(own);
    await sleep(6000);
    assert.equal(own.url(), 'https://www.youtube.com/watch?v=USERVIDEO02');
    assert.equal((await storage(ctx, ['playlistIndex'])).playlistIndex, idx0);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-07 browser restart: no tab id survives on disk; the next session opens a new player tab', { skip, timeout: 90000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ausc-restart-'));
  let ctx = await launch({ userDataDir: dir });
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono stanco');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
  } finally {
    await ctx.context.close();
  }
  ctx = await launch({ userDataDir: dir });
  try {
    const local = await storage(ctx, null);
    assert.equal(local.playerTabId, undefined);
    assert.equal(local.youtubeTabId, undefined);
    assert.deepEqual(Object.keys(await sessionArea(ctx)).filter((k) => /tab/i.test(k)), []);
    const user = await ctx.context.newPage();
    await user.goto('https://www.youtube.com/watch?v=USERVIDEO03');
    const page = await openPanel(ctx);
    await page.waitForSelector('#btn-play:not([disabled])');
    await page.click('#btn-play');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 2, { message: 'separate player tab' });
    assert.equal(user.url(), 'https://www.youtube.com/watch?v=USERVIDEO03');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-08 auto-advance: the end of a track in the player tab opens the next one', { skip, timeout: 90000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'oggi sono malinconico');
    const player = await waitFor(async () => (await youtubeTabs(ctx))[0], { message: 'player' });
    const first = player.url();
    await sleep(3000);
    await playToEnd(player);
    await waitFor(async () => (await storage(ctx, ['playlistIndex'])).playlistIndex === 1, { timeout: 20000, message: 'index 1' });
    await waitFor(async () => player.url() !== first, { timeout: 10000, message: 'player navigated' });
    assert.equal((await youtubeTabs(ctx)).length, 1, 'same tab reused');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-09 end of playlist: the session closes, it never jumps back to the first track', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono agitato');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    const { playlist } = await storage(ctx, ['playlist']);
    const last = playlist.length - 1;
    // play the last track from the list (as a person would), then ask for the next one
    await page.click('#btn-playlist-toggle');
    await page.locator('#playlist-list .playlist-track').nth(last).click();
    await waitFor(async () => (await storage(ctx, ['playlistIndex'])).playlistIndex === last, { message: 'last track selected' });
    // wait until the worker has actually started the last track (PLAY_TRACK handled)
    await waitFor(async () => {
      const st = await storage(ctx, ['currentTrack']);
      const se = await sessionArea(ctx);
      return st.currentTrack?.id === playlist[last].id && se.listeningSessionActive === true;
    }, { message: 'last track playing in the worker' });
    await ctx.sw.evaluate(() => chrome.storage.local.set({ lastAutoAdvanceAt: 0 }));
    const res = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'ADVANCE_PLAYLIST', source: 'manual' }));
    assert.equal(res.finished, true);
    assert.equal((await storage(ctx, ['playlistIndex'])).playlistIndex, last);
    assert.equal((await sessionArea(ctx)).listeningSessionActive, undefined);
    await waitFor(async () => /fondo|end of this session/i.test(await page.textContent('#now-playing')), { message: 'finished message' });
    // «Next» on the last track from the panel does the same (no wrap-around)
    await page.click('#btn-next');
    await sleep(500);
    assert.equal((await storage(ctx, ['playlistIndex'])).playlistIndex, last);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-10 Vision: an explicit «off» is respected on the next tracks', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono contento');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    await page.uncheck('#vj-toggle');
    await sleep(400);
    await page.click('#btn-next');
    await sleep(1500);
    await page.click('#btn-next');
    await sleep(1500);
    assert.equal((await storage(ctx, ['vjEnabled'])).vjEnabled, false);
    assert.equal(await page.isChecked('#vj-toggle'), false);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-11 Vision: with «reduce motion» it never switches on by itself', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startSession(page, 'sono rilassato');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player' });
    await sleep(1500);
    assert.notEqual((await storage(ctx, ['vjEnabled'])).vjEnabled, true);
  } finally {
    await ctx.context.close();
  }
});

const hasOverlay = (p) => p.evaluate(() => !!document.getElementById('auscultrix-vj-root'));

test('E2E-18 a video the person picks in the player tab is theirs: it never advances the playlist, YouTube carries on, ▶ resumes', { skip, timeout: 150000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'oggi sono malinconico');
    const player = await waitFor(async () => (await youtubeTabs(ctx))[0], { message: 'player' });
    await waitFor(async () => (await sessionArea(ctx)).sessionVideo?.landed === true, { timeout: 20000, message: 'session video on screen' });
    const idx0 = (await storage(ctx, ['playlistIndex'])).playlistIndex;
    // the person chooses an unrelated video in the same tab
    await player.goto('https://www.youtube.com/watch?v=PERSONVID01');
    await waitFor(async () => (await sessionArea(ctx)).playerDetached === true, { message: 'Auscultrix steps aside' });
    await waitFor(async () => /pausa|paused/i.test(await page.textContent('#now-playing')), { message: 'the panel says the playlist is paused' });
    await sleep(3500);
    assert.equal(await hasOverlay(player), false, 'no Vision on their video');
    // their video ends: nothing moves (on the real site YouTube's autoplay carries on)
    await playToEnd(player);
    await sleep(8000);
    assert.equal(player.url(), 'https://www.youtube.com/watch?v=PERSONVID01', 'their video stays');
    assert.equal((await storage(ctx, ['playlistIndex'])).playlistIndex, idx0, 'playlist not advanced');
    assert.equal(((await storage(ctx, ['currentTrack'])).currentTrack?.youtubeVideoId || '').includes('PERSONVID01'), false, 'their video is not taken as the track');
    // ▶ brings the playlist back, and the end of its own video advances again
    await page.click('#btn-play');
    await waitFor(async () => !player.url().includes('PERSONVID01'), { message: 'back to the playlist' });
    await waitFor(async () => {
      const se = await sessionArea(ctx);
      return se.playerDetached !== true && se.sessionVideo?.landed === true;
    }, { timeout: 20000, message: 'session resumed' });
    await sleep(3000);
    await ctx.sw.evaluate(() => chrome.storage.local.set({ lastAutoAdvanceAt: 0 }));
    await playToEnd(player);
    await waitFor(async () => (await storage(ctx, ['playlistIndex'])).playlistIndex === idx0 + 1, { timeout: 20000, message: 'advanced after resuming' });
    assert.deepEqual(ctx.log.pageErrors, []);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-19 Vision appears only on the session\'s own video, never in the person\'s other YouTube tabs', { skip, timeout: 90000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'mi sento tranquillo');
    const player = await waitFor(async () => (await youtubeTabs(ctx))[0], { message: 'player' });
    assert.equal((await storage(ctx, ['vjEnabled'])).vjEnabled, true, 'Vision is on for the session');
    await waitFor(() => hasOverlay(player), { timeout: 20000, message: 'Vision on the session video' });
    const own = await ctx.context.newPage();
    await own.goto('https://www.youtube.com/watch?v=USERVIDEO03');
    await sleep(4500);
    assert.equal(await hasOverlay(own), false, 'no Vision on a video in another tab');
    await own.goto('https://www.youtube.com/');
    await sleep(3000);
    assert.equal(await hasOverlay(own), false, 'no Vision on YouTube pages without a video');
    assert.equal(await hasOverlay(player), true, 'the session keeps its Vision');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-20 a track opened through a YouTube search: the result becomes the session\'s video and its end advances', { skip, timeout: 120000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'sono un po\' giù');
    const player = await waitFor(async () => (await youtubeTabs(ctx))[0], { message: 'player' });
    const idx0 = (await storage(ctx, ['playlistIndex'])).playlistIndex;
    // a track without a known video id opens a YouTube search; the bridge opens the result
    await page.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'PLAY_TRACK', track: { id: 'e2e-search-only', artist: 'Artista di prova', title: 'Brano senza id' } }),
    );
    await waitFor(async () => /watch\?v=AAAAAAAAAAA/.test(player.url()), { timeout: 40000, message: 'the bridge opened the search result' });
    await waitFor(async () => (await sessionArea(ctx)).sessionVideo?.videoId === 'AAAAAAAAAAA', { timeout: 15000, message: 'result adopted as the session video' });
    await sleep(3000);
    await ctx.sw.evaluate(() => chrome.storage.local.set({ lastAutoAdvanceAt: 0 }));
    await playToEnd(player);
    await waitFor(async () => (await storage(ctx, ['playlistIndex'])).playlistIndex === idx0 + 1, { timeout: 20000, message: 'advanced' });
  } finally {
    await ctx.context.close();
  }
});
