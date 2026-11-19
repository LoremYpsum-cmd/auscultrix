// Whose video is in the player tab? Auscultrix acts only on the video it put
// there; any other video belongs to the person (YouTube's autoplay carries on).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib, readText } from '../helpers/env.mjs';

installChromeMock();
const S = await importLib('lib/session-state.js');

test('UT-OWN-01 video ids are read from every YouTube URL form, and only from YouTube', () => {
  const id = 'malJUMz2A9Y';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&autoplay=1&mute=1`,
    `https://m.youtube.com/watch?list=PL1&v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?t=3`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
  ]) {
    assert.equal(S.youtubeVideoIdFromUrl(url), id, url);
  }
  for (const url of [
    'https://www.youtube.com/results?search_query=nina+simone',
    'https://www.youtube.com/',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=has spaces!',
    `https://youtube.com.example.org/watch?v=${id}`,
    `https://notyoutube.com/watch?v=${id}`,
    'not a url',
    '',
    null,
  ]) {
    assert.equal(S.youtubeVideoIdFromUrl(url), null, String(url));
  }
});

test('UT-OWN-02 a video in the player tab is the session\'s, adopted from its search, pending, or the person\'s', () => {
  const t0 = 1_000_000;
  const grace = S.NAVIGATION_GRACE_MS;
  const direct = { videoId: 'AAAAAAAAAAA', landed: false, until: t0 + grace };
  assert.equal(S.classifyPlayerVideo(direct, 'AAAAAAAAAAA', t0), 'owned');
  // YouTube's autoplay flashes another video before Auscultrix's page lands
  assert.equal(S.classifyPlayerVideo(direct, 'BBBBBBBBBBB', t0 + 1000), 'pending');
  // after the grace, or once the session's video is on screen, it is the person's choice
  assert.equal(S.classifyPlayerVideo(direct, 'BBBBBBBBBBB', t0 + grace + 1), 'foreign');
  assert.equal(S.classifyPlayerVideo({ ...direct, landed: true }, 'BBBBBBBBBBB', t0 + 1000), 'foreign');
  // a track opened through a YouTube search: its first result becomes the session's video
  const search = { videoId: null, landed: false, until: t0 + grace };
  assert.equal(S.classifyPlayerVideo(search, 'CCCCCCCCCCC', t0 + 60_000), 'adopt');
  assert.equal(S.classifyPlayerVideo({ ...search, landed: true }, 'CCCCCCCCCCC', t0), 'foreign');
  assert.equal(S.classifyPlayerVideo(direct, null, t0), 'unknown');
  assert.equal(S.classifyPlayerVideo(null, 'AAAAAAAAAAA', t0), 'foreign', 'no record: never take over');
});

test('UT-OWN-03 only the end of the session\'s own video advances the playlist', () => {
  const now = 2_000_000;
  const sessionVideo = { videoId: 'AAAAAAAAAAA', landed: true, until: now - 1 };
  const base = { active: true, fromPlayerTab: true, detached: false, sessionVideo, now };
  assert.deepEqual(S.decideTrackEnd({ ...base, endedVideoId: 'AAAAAAAAAAA' }), { advance: true, reason: 'owned' });
  // the reported bug: the person played an unrelated video in the player tab
  assert.deepEqual(S.decideTrackEnd({ ...base, endedVideoId: 'UNRELATED01' }), { advance: false, reason: 'other_video', detach: true });
  assert.equal(S.decideTrackEnd({ ...base, detached: true, endedVideoId: 'AAAAAAAAAAA' }).advance, false);
  assert.equal(S.decideTrackEnd({ ...base, fromPlayerTab: false, endedVideoId: 'AAAAAAAAAAA' }).advance, false);
  assert.equal(S.decideTrackEnd({ ...base, active: false, endedVideoId: 'AAAAAAAAAAA' }).advance, false);
  assert.equal(S.decideTrackEnd({ ...base, endedVideoId: null }).advance, false);
  // while the next track is loading, a flashed recommendation neither advances nor detaches
  const loading = { ...base, sessionVideo: { videoId: 'NEXTTRACK01', landed: false, until: now + 5000 } };
  assert.deepEqual(S.decideTrackEnd({ ...loading, endedVideoId: 'RECOMMEND01' }), { advance: false, reason: 'navigation_pending' });
  // a track opened through a search: the end of its first result advances, and adopts it
  const search = { ...base, sessionVideo: { videoId: null, landed: false, until: now - 1 } };
  assert.deepEqual(S.decideTrackEnd({ ...search, endedVideoId: 'CCCCCCCCCCC' }), { advance: true, reason: 'adopt', adopt: true });
});

test('UT-OWN-04 session video state: recorded, adopted, cleared with the session', async () => {
  await S.setSessionActive(true);
  await S.setSessionVideo({ videoId: null, trackId: 't1', now: 10 });
  await S.markSessionVideoLanded('CCCCCCCCCCC');
  assert.deepEqual(await S.getSessionVideo(), { videoId: 'CCCCCCCCCCC', trackId: 't1', landed: true, until: 10 + S.NAVIGATION_GRACE_MS });
  await S.markSessionNavigating(100);
  assert.equal((await S.getSessionVideo()).landed, false);
  await S.setPlayerDetached(true);
  assert.equal(await S.isPlayerDetached(), true);
  // a new track resets the detachment
  await S.setSessionVideo({ videoId: 'AAAAAAAAAAA', trackId: 't2' });
  assert.equal(await S.isPlayerDetached(), false);
  await S.setPlayerDetached(true);
  await S.setSessionActive(false);
  assert.equal(await S.getSessionVideo(), null);
  assert.equal(await S.isPlayerDetached(), false);
});

test('UT-OWN-05 the worker and the overlay follow the rule (no self-enabling Vision, no adopting any video)', () => {
  const bg = readText('background.js');
  const end = bg.slice(bg.indexOf("case 'TRACK_ENDED'"), bg.indexOf("case 'ADVANCE_PLAYLIST'"));
  assert.match(end, /decideTrackEnd\(/, 'end of track is judged per video');
  const det = bg.slice(bg.indexOf("case 'YOUTUBE_VIDEO_DETECTED'"), bg.indexOf("case 'OPEN_SIDE_PANEL'"));
  assert.match(det, /classifyPlayerVideo\(/);
  assert.match(det, /detachPlayer\(/);
  const vj = readText('content/vj-overlay.js');
  assert.ok(!/enabled\s*=\s*data\.vjEnabled\s*===\s*true/.test(vj), 'the overlay never switches itself on from the stored setting');
  assert.match(vj, /reply\?\.vision/, 'the overlay asks the worker');
});
