// End-to-end: main flows in a real Chromium with the unpacked extension.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openPanel, storage, youtubeTabs, sleep, waitFor, startSession, playwrightAvailable } from './harness.mjs';

const skip = !(await playwrightAvailable()) && 'Playwright not installed';

test('E2E-01 first run: notice with onboarding steps, focus trapped, «don\'t show again» remembered', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx, { dismissDisclaimer: false });
    await page.waitForSelector('#disclaimer-pip:not(.hidden)');
    assert.equal(await page.locator('#disclaimer-pip .onboarding-steps li').count(), 3);
    assert.equal(await page.getAttribute('#disclaimer-pip', 'role'), 'dialog');
    assert.equal(await page.getAttribute('#disclaimer-pip', 'aria-modal'), 'true');
    const inDialog = await page.evaluate(() => document.getElementById('disclaimer-pip').contains(document.activeElement));
    assert.ok(inDialog, 'focus starts inside the dialog');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.getElementById('disclaimer-pip').contains(document.activeElement)), 'focus stays inside');
    await page.check('#disclaimer-pip-hide');
    await page.click('#disclaimer-pip-close');
    // «Choose for me» stays disabled until there is something about the mood (thesis RF14)
    assert.equal(await page.isDisabled('#btn-choose-for-me'), true);
    await page.fill('#mood-input', 'sono curioso');
    assert.equal(await page.isDisabled('#btn-choose-for-me'), false);
    await page.fill('#mood-input', '');
    assert.equal(await page.isDisabled('#btn-choose-for-me'), true);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.mood-chip').length > 0);
    await sleep(500);
    assert.equal(await page.locator('#disclaimer-pip:not(.hidden)').count(), 0);
    assert.deepEqual(ctx.log.pageErrors, []);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-02 a session: calibrated playlist, compact list, player opened, typed text never on disk', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'oggi mi chiamo Zefiro e sono un po’ giù');
    const rows = await page.locator('#playlist-list .playlist-track').count();
    assert.ok(rows > 0 && rows <= 6, `rows ${rows}`);
    assert.equal(await page.isVisible('#btn-playlist-toggle'), true);
    const calib = await page.textContent('#playlist-calibration');
    assert.ok(calib && calib.length > 10, calib);
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player tab' });
    const all = JSON.stringify(await storage(ctx, null));
    assert.ok(!all.includes('Zefiro'), 'typed text leaked to chrome.storage.local');
    const um = (await storage(ctx, ['userModelV1'])).userModelV1;
    assert.equal(um.entries.length, 1);
    await page.click('#btn-playlist-toggle');
    assert.ok((await page.locator('#playlist-list .playlist-track').count()) > 6);
    // care media are proposed for an adult (thesis RF12–13): at least books and films
    assert.ok((await page.locator('#therapy-books .therapy-card, #therapy-books button').count()) > 0, 'books');
    // read-aloud (RF15) never throws, even where no system voice exists, and
    // uses only on-device voices: without one it says so instead of going online
    const uiLang = String(await page.evaluate(() => document.documentElement.lang || 'it')).slice(0, 2).toLowerCase();
    await page.click('#btn-tts');
    await sleep(1800);
    const voices = await page.evaluate(() => (speechSynthesis.getVoices() || []).map((v) => ({ lang: v.lang, local: v.localService })));
    const speaking = (await page.getAttribute('#btn-tts', 'aria-pressed')) === 'true';
    const statusShown = await page.isVisible('#tts-status');
    const hasLocal = voices.some((v) => v.local && String(v.lang).toLowerCase().startsWith(uiLang));
    assert.ok(hasLocal ? speaking || !statusShown : statusShown && !speaking, `voices ${JSON.stringify(voices)} speaking ${speaking} status ${statusShown}`);
    if (speaking) await page.click('#btn-tts');
    assert.deepEqual(ctx.log.pageErrors, []);
  } finally {
    await ctx.context.close();
  }
});

test('E2E-03 crisis: help first — no player, no sheet, crisis copy, «choose for me» opens nothing, no donation ask', { skip, timeout: 90000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await page.fill('#mood-input', 'non ce la faccio più, voglio farla finita');
    await page.click('#btn-start');
    await page.waitForSelector('#care-alert:not([hidden])');
    assert.equal(await page.getAttribute('#care-alert', 'data-level'), 'crisis');
    assert.ok((await page.textContent('#care-alert')).includes('02 2327 2327'));
    await sleep(1500);
    assert.equal((await youtubeTabs(ctx)).length, 0, 'no autoplay in crisis');
    assert.equal(await page.locator('#session-pip:not(.hidden)').count(), 0);
    const insight = await page.textContent('#insight-text');
    assert.match(insight, /più importante sei tu|matters most is you/i, insight);
    assert.ok(!/spinta|drive|risaliamo|climb/i.test(insight), 'no energy talk in a crisis');
    const pagesBefore = ctx.context.pages().length;
    await page.click('#btn-choose-for-me');
    await sleep(1500);
    assert.equal(ctx.context.pages().length, pagesBefore, '«Scegli per me» opened a tab during a crisis');
    // a session that ends after a crisis never asks for money
    await page.click('#btn-play');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player after explicit Play' });
    await page.click('#btn-stop');
    await sleep(15500);
    assert.equal(await page.locator('#donation-pip:not(.hidden)').count(), 0);
    const s = await storage(ctx, null);
    assert.ok(!JSON.stringify(s).includes('farla finita'));
    assert.ok(!JSON.stringify(s).includes('crisis'), 'crisis level must not reach disk');
  } finally {
    await ctx.context.close();
  }
});

test('E2E-04 substances: the national addiction line is offered, music still allowed', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'stasera voglio sballarmi');
    assert.equal(await page.getAttribute('#care-alert', 'data-level'), 'substance');
    const card = await page.textContent('#care-alert');
    assert.ok(card.includes('800 94 07 89'));
    assert.match(card, /lunedì al venerdì|Monday to Friday/, 'opening days of the ISS line');
    await waitFor(async () => (await youtubeTabs(ctx)).length === 1, { message: 'player tab' });
  } finally {
    await ctx.context.close();
  }
});

test('E2E-05 children: only suitable music, no films, series or games', { skip, timeout: 60000 }, async () => {
  const ctx = await launch();
  try {
    const page = await openPanel(ctx);
    await startSession(page, 'ho 8 anni e sono triste');
    await page.waitForSelector('#therapy-media-section:not(.hidden)');
    assert.ok(await page.evaluate(() => document.getElementById('therapy-media-section').classList.contains('kids-only')));
    for (const id of ['therapy-films-free', 'therapy-films-paid', 'therapy-series', 'therapy-games-free', 'therapy-games-paid', 'therapy-other-free', 'therapy-other-paid']) {
      assert.equal(await page.locator(`#${id} .therapy-card, #${id} button`).count(), 0, id);
    }
    assert.ok(!(await page.textContent('#therapy-media-section')).includes('Red Dead'));
  } finally {
    await ctx.context.close();
  }
});
