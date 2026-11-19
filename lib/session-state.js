/**
 * Browser-session state for the listening session.
 *
 * Tab ids are unique only within one browser session: after a restart Chrome
 * may give the same id to an unrelated tab. Ids therefore live in
 * chrome.storage.session (memory only, cleared when the browser closes),
 * never in chrome.storage.local. The extension only ever drives tabs it
 * opened itself in the current browser session ("owned" player tabs).
 *
 * chrome.storage.session is readable by extension pages and the service
 * worker, not by content scripts (default TRUSTED_CONTEXTS access level).
 */

const KEY_PLAYER_TAB = 'playerTabId';
const KEY_OWNED_TABS = 'ownedPlayerTabIds';
const KEY_ACTIVE = 'listeningSessionActive';
const KEY_SAFETY = 'sessionSafetyLevel';
const KEY_VIDEO = 'sessionVideo';
const KEY_DETACHED = 'playerDetached';

/**
 * How long Auscultrix's own navigation may take to land before another video
 * in its tab counts as the person's choice (YouTube's autoplay can flash the
 * next recommendation just before the extension's next track loads).
 */
export const NAVIGATION_GRACE_MS = 20000;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Legacy keys that 5.0 and earlier kept in chrome.storage.local. */
export const LEGACY_LOCAL_TAB_KEYS = ['playerTabId', 'youtubeTabId'];

/** In-memory fallback when chrome.storage.session is unavailable. */
const memory = new Map();

function area() {
  try {
    return chrome.storage?.session || null;
  } catch {
    return null;
  }
}

async function get(keys) {
  const a = area();
  if (a) {
    try {
      return await a.get(keys);
    } catch {
      // fall back to memory
    }
  }
  const out = {};
  for (const k of keys) if (memory.has(k)) out[k] = memory.get(k);
  return out;
}

async function set(obj) {
  const a = area();
  if (a) {
    try {
      await a.set(obj);
      return;
    } catch {
      // fall back to memory
    }
  }
  for (const [k, v] of Object.entries(obj)) memory.set(k, v);
}

async function remove(keys) {
  const a = area();
  if (a) {
    try {
      await a.remove(keys);
      return;
    } catch {
      // fall back to memory
    }
  }
  for (const k of keys) memory.delete(k);
}

/** @returns {Promise<number|null>} */
export async function getPlayerTabId() {
  const data = await get([KEY_PLAYER_TAB]);
  const id = data[KEY_PLAYER_TAB];
  return Number.isInteger(id) ? id : null;
}

/** @returns {Promise<number[]>} tabs opened by Auscultrix in this browser session */
export async function getOwnedPlayerTabIds() {
  const data = await get([KEY_OWNED_TABS]);
  const ids = data[KEY_OWNED_TABS];
  return Array.isArray(ids) ? ids.filter((x) => Number.isInteger(x)) : [];
}

/** Record a tab the extension itself opened (or navigated) as the player. */
export async function setPlayerTabId(tabId) {
  if (!Number.isInteger(tabId)) return;
  const owned = await getOwnedPlayerTabIds();
  const next = [...new Set([...owned, tabId])].slice(-20);
  await set({ [KEY_PLAYER_TAB]: tabId, [KEY_OWNED_TABS]: next });
}

export async function isOwnedPlayerTab(tabId) {
  if (!Number.isInteger(tabId)) return false;
  return (await getOwnedPlayerTabIds()).includes(tabId);
}

/** Forget a tab (closed, or no longer usable as the player). */
export async function forgetTab(tabId) {
  const [current, owned] = await Promise.all([getPlayerTabId(), getOwnedPlayerTabIds()]);
  const patch = { [KEY_OWNED_TABS]: owned.filter((x) => x !== tabId) };
  await set(patch);
  if (current === tabId) await remove([KEY_PLAYER_TAB]);
}

export async function setSessionActive(active) {
  if (active) await set({ [KEY_ACTIVE]: true });
  else await remove([KEY_ACTIVE, KEY_VIDEO, KEY_DETACHED]);
}

/* ------------------------------------------------------------------------ */
/*  Whose video is in the player tab?                                        */
/*                                                                           */
/*  Auscultrix opens a tab and puts a video in it. From then on the person   */
/*  may use that tab for anything: a recommendation, a search, a link. The   */
/*  extension acts only on the video it put there; any other video belongs  */
/*  to the person, YouTube's own autoplay carries on, and the session waits  */
/*  («paused») until the person asks for the playlist again.                 */
/* ------------------------------------------------------------------------ */

/** The YouTube video id of a watch, youtu.be, shorts, embed or live URL (null if none). */
export function youtubeVideoIdFromUrl(url) {
  let u;
  try {
    u = new URL(String(url || ''));
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * Record the video Auscultrix is about to put in its player tab. `videoId` is
 * null when the track opens through a YouTube search: the first video reached
 * from there (the bridge's click, or the person's pick among the results of
 * that search) is adopted as the session's video.
 *
 * `previousVideoId` is the video on screen in the player tab when the request
 * was made (for instance one the person chose while the session was paused).
 * It is never adopted: before 6.0.1 a resume through a search could adopt the
 * person's own video, and the session paused again at once.
 */
export async function setSessionVideo({ videoId = null, trackId = null, previousVideoId = null, now = Date.now() } = {}) {
  const id = videoId && VIDEO_ID.test(videoId) ? videoId : null;
  const prev = previousVideoId && VIDEO_ID.test(previousVideoId) && previousVideoId !== id ? previousVideoId : null;
  await set({
    [KEY_VIDEO]: {
      videoId: id,
      trackId: trackId ?? null,
      previousVideoId: prev,
      landed: false,
      until: now + NAVIGATION_GRACE_MS,
    },
  });
  await remove([KEY_DETACHED]);
}

/** @returns {Promise<{ videoId: string|null, trackId: any, landed: boolean, until: number }|null>} */
export async function getSessionVideo() {
  const data = await get([KEY_VIDEO]);
  const v = data[KEY_VIDEO];
  return v && typeof v === 'object' ? v : null;
}

/**
 * The session's video ended and Auscultrix is about to load the next one:
 * until it lands, a video flashed by YouTube's own autoplay is not taken as
 * the person's choice.
 */
export async function markSessionNavigating(now = Date.now()) {
  const current = await getSessionVideo();
  if (!current) return;
  await set({ [KEY_VIDEO]: { ...current, landed: false, until: now + NAVIGATION_GRACE_MS } });
}

/** The session's video is now on screen (adopting it when it came from a search). */
export async function markSessionVideoLanded(videoId) {
  const current = await getSessionVideo();
  if (!current) return;
  const id = current.videoId || (videoId && VIDEO_ID.test(videoId) ? videoId : null);
  await set({ [KEY_VIDEO]: { ...current, videoId: id, previousVideoId: null, landed: true } });
}

/** The person chose another video in the player tab: the session waits. */
export async function setPlayerDetached(detached) {
  if (detached) await set({ [KEY_DETACHED]: true });
  else await remove([KEY_DETACHED]);
}

export async function isPlayerDetached() {
  const data = await get([KEY_DETACHED]);
  return data[KEY_DETACHED] === true;
}

/**
 * Pure: who does `videoId`, seen in the player tab, belong to?
 *  - 'owned'   the video Auscultrix put there
 *  - 'adopt'   the first video reached from Auscultrix's own YouTube search
 *  - 'pending' Auscultrix's navigation has not landed yet (for instance
 *              YouTube's autoplay flashed its next recommendation first)
 *  - 'foreign' the person chose another video
 *  - 'unknown' nothing to judge (not a video page)
 */
export function classifyPlayerVideo(sessionVideo, videoId, now = Date.now()) {
  if (!videoId) return 'unknown';
  const sv = sessionVideo && typeof sessionVideo === 'object' ? sessionVideo : null;
  if (!sv) return 'foreign';
  if (sv.videoId && videoId === sv.videoId) return 'owned';
  // the video that was on screen before Auscultrix's navigation is never
  // adopted: while the navigation is on its way it is neither ours nor theirs
  if (!sv.landed && sv.previousVideoId && videoId === sv.previousVideoId) {
    return now <= Number(sv.until || 0) ? 'pending' : 'foreign';
  }
  if (!sv.videoId && !sv.landed) return 'adopt';
  if (sv.videoId && !sv.landed && now <= Number(sv.until || 0)) return 'pending';
  return 'foreign';
}

/**
 * Pure: should the end of `endedVideoId` advance the playlist?
 * @returns {{ advance: boolean, reason: string, adopt?: boolean, detach?: boolean }}
 */
export function decideTrackEnd({ active, fromPlayerTab, detached, sessionVideo, endedVideoId, now = Date.now() }) {
  if (!active || !fromPlayerTab) return { advance: false, reason: 'not_session_tab' };
  if (detached) return { advance: false, reason: 'other_video' };
  const kind = classifyPlayerVideo(sessionVideo, endedVideoId, now);
  if (kind === 'owned') return { advance: true, reason: 'owned' };
  if (kind === 'adopt') return { advance: true, reason: 'adopt', adopt: true };
  if (kind === 'pending') return { advance: false, reason: 'navigation_pending' };
  if (kind === 'unknown') return { advance: false, reason: 'no_video' };
  return { advance: false, reason: 'other_video', detach: true };
}

export async function isSessionActive() {
  const data = await get([KEY_ACTIVE]);
  return data[KEY_ACTIVE] === true;
}

/**
 * Safety level of the current browser session ('none' | 'substance' | 'crisis').
 * Kept in memory only: a crisis flag is sensitive and must not reach disk.
 */
export async function setSessionSafetyLevel(level) {
  if (level === 'crisis' || level === 'substance') await set({ [KEY_SAFETY]: level });
  else await remove([KEY_SAFETY]);
}

export async function getSessionSafetyLevel() {
  const data = await get([KEY_SAFETY]);
  const v = data[KEY_SAFETY];
  return v === 'crisis' || v === 'substance' ? v : 'none';
}

/** Remove tab ids that older versions persisted on disk (survived restarts). */
export async function migrateLegacyTabIds() {
  try {
    await chrome.storage.local.remove(LEGACY_LOCAL_TAB_KEYS);
  } catch {
    // ignore
  }
}

/** Clear everything this module keeps (used by «Forget everything»). */
export async function clearSessionState() {
  await remove([KEY_PLAYER_TAB, KEY_OWNED_TABS, KEY_ACTIVE, KEY_SAFETY, KEY_VIDEO, KEY_DETACHED]);
}

/** YouTube hosts the player may run on. */
export function isPlayerHostUrl(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase();
    return (
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    );
  } catch {
    return false;
  }
}
