/**
 * Background service worker — multi-player tabs, cover VJ palette, tab-audio analysis.
 */

import {
  DEFAULT_PROVIDER_ID,
  buildPlaybackUrl,
  getProvider,
  listProviders,
  providerNote,
} from './lib/playback-providers.js';
import { resolveCoverUrl } from './lib/cover-art.js';
import { extractColorsFromImageUrl, extractColorsFromVideoId, FALLBACK_COLORS } from './lib/colors.js';
import { syncCreatorLibrary } from './lib/spotify-library.js';
import { syncPublicProfileLibrary } from './lib/spotify-public-library.js';
import { hasCreatorAuth } from './lib/spotify-auth.js';
import { openPanel, installPanelBehavior } from './lib/panel-open.js';
import {
  getCapturingTabId,
  restoreCapturingTabId,
  startTabAudioCapture,
  stopTabAudioCapture,
} from './lib/tab-audio-capture.js';
import {
  EMERGENTE_ALARM,
  EMERGENTE_PERIOD_MINUTES,
  runEmergenteRefresh,
} from './lib/emergente-refresh.js';
import {
  classifyPlayerVideo,
  decideTrackEnd,
  forgetTab,
  getOwnedPlayerTabIds,
  getPlayerTabId,
  getSessionVideo,
  isPlayerDetached,
  isPlayerHostUrl,
  isSessionActive,
  markSessionNavigating,
  markSessionVideoLanded,
  migrateLegacyTabIds,
  setPlayerDetached,
  setPlayerTabId,
  setSessionActive,
  setSessionVideo,
  youtubeVideoIdFromUrl,
} from './lib/session-state.js';

const CREATOR_SYNC_ALARM = 'spotify-creator-sync';
/** Every 6 hours */
const CREATOR_SYNC_PERIOD_MINUTES = 360;
/** Opening the side panel never re-downloads the curator library more often than this. */
const CREATOR_SYNC_SOFT_MIN_MS = 6 * 60 * 60 * 1000;
const SOFT_SYNC_REASONS = new Set(['sidepanel', 'sidepanel_open', 'startup']);

function scheduleEmergenteRefresh() {
  chrome.alarms.create(EMERGENTE_ALARM, {
    periodInMinutes: EMERGENTE_PERIOD_MINUTES,
    delayInMinutes: 2,
  });
}

async function runEmergenteCatalogRefresh(reason) {
  try {
    return await runEmergenteRefresh(reason);
  } catch (err) {
    console.warn('[emergente] refresh failed', reason, err);
    return { ok: false, error: String(err?.message || err) };
  }
}

// Chrome: openPanelOnActionClick on every SW start (retries failed first-run).
// Firefox: toolbar click → sidebarAction (stubbed module in Firefox package).
installPanelBehavior();
restoreCapturingTabId().catch(() => {});
// Tab ids from older versions were kept on disk and could point at an
// unrelated tab after a browser restart: drop them on every worker start.
migrateLegacyTabIds().catch(() => {});

async function runCreatorLibrarySync(reason = 'manual') {
  try {
    // Data minimisation: opening the panel or starting the browser does not
    // re-download the curator's public playlists if they are recent enough.
    if (SOFT_SYNC_REASONS.has(reason)) {
      const { librarySyncedAt, librarySyncAttemptAt } = await chrome.storage.local.get([
        'librarySyncedAt',
        'librarySyncAttemptAt',
      ]);
      const last = Number(librarySyncedAt) || 0;
      const attempt = Number(librarySyncAttemptAt) || 0;
      if (last && Date.now() - last < CREATOR_SYNC_SOFT_MIN_MS) {
        return { ok: true, skipped: true, reason };
      }
      // Offline / blocked: retry at most every 30 minutes, not at every panel open.
      if (attempt && Date.now() - attempt < 30 * 60 * 1000) {
        return { ok: false, skipped: true, reason };
      }
    }
    await chrome.storage.local.set({ librarySyncAttemptAt: Date.now() });
    // Credentialed sync when configured; otherwise the public profile
    // (open.spotify.com embeds) keeps the database fresh without any secret.
    const result = (await hasCreatorAuth())
      ? await syncCreatorLibrary()
      : await syncPublicProfileLibrary();
    try {
      await chrome.runtime.sendMessage({
        type: 'LIBRARY_SYNCED',
        trackCount: result.tracks?.length || 0,
        creatorName: result.creatorName,
        syncedAt: result.syncedAt,
        reason,
      });
    } catch {
      // side panel may be closed
    }
    console.info('[spotify] creator sync ok', result.tracks?.length, reason);
    return { ok: true, trackCount: result.tracks?.length || 0, creatorName: result.creatorName };
  } catch (err) {
    // Offline or blocked: the bundled catalogue keeps working. Not an error for the user.
    console.info('[spotify] creator sync unavailable', reason, String(err?.message || err));
    return { ok: false, error: String(err?.message || err) };
  }
}

function scheduleCreatorSync() {
  chrome.alarms.create(CREATOR_SYNC_ALARM, {
    periodInMinutes: CREATOR_SYNC_PERIOD_MINUTES,
  });
}

const STORAGE_KEYS = {
  vjEnabled: 'vjEnabled',
  vjPhotosensitiveSafe: 'vjPhotosensitiveSafe',
  playbackProviderId: 'playbackProviderId',
  musicLanguageMode: 'musicLanguageMode',
  musicGeoZone: 'musicGeoZone',
  playedIds: 'playedIds',
  vjPalette: 'vjPalette',
  vjCoverUrl: 'vjCoverUrl',
  playlist: 'playlist',
  playlistIndex: 'playlistIndex',
  currentTrack: 'currentTrack',
  lastAutoAdvanceAt: 'lastAutoAdvanceAt',
  playerMuted: 'playerMuted',
  playerPlaying: 'playerPlaying',
  autoplayBlocked: 'autoplayBlocked',
};

const AUTO_ADVANCE_COOLDOWN_MS = 5000;

/** One-time key: ≤3.2.1 defaulted VJ on without opt-in; reset to off. */
const VJ_OPT_IN_MIGRATION_KEY = 'vjOptInMigrated_3_2_2';

chrome.runtime.onInstalled.addListener(() => {
  // Re-assert panel behaviour on install/update (also applied at SW top-level).
  installPanelBehavior();
  chrome.storage.local.get(
    [
      STORAGE_KEYS.vjEnabled,
      STORAGE_KEYS.playbackProviderId,
      STORAGE_KEYS.vjPhotosensitiveSafe,
      VJ_OPT_IN_MIGRATION_KEY,
    ],
    (data) => {
      const patch = {};
      // VJ is opt-in only (side-panel toggle). Never auto-enable on install / YT browse.
      if (data[VJ_OPT_IN_MIGRATION_KEY] === undefined) {
        patch.vjEnabled = false;
        patch[VJ_OPT_IN_MIGRATION_KEY] = true;
      } else if (data.vjEnabled === undefined) {
        patch.vjEnabled = false;
      }
      // Photosensitive SAFE mode on by default
      if (data.vjPhotosensitiveSafe === undefined) {
        patch.vjPhotosensitiveSafe = true;
      }
      if (!data.playbackProviderId) patch.playbackProviderId = DEFAULT_PROVIDER_ID;
      if (Object.keys(patch).length) chrome.storage.local.set(patch);
    },
  );
  scheduleCreatorSync();
  scheduleEmergenteRefresh();
  runCreatorLibrarySync('install');
  runEmergenteCatalogRefresh('install');
});

chrome.runtime.onStartup.addListener(() => {
  scheduleCreatorSync();
  scheduleEmergenteRefresh();
  runCreatorLibrarySync('startup');
  runEmergenteCatalogRefresh('startup');
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === CREATOR_SYNC_ALARM) {
    runCreatorLibrarySync('alarm');
  }
  if (alarm?.name === EMERGENTE_ALARM) {
    runEmergenteCatalogRefresh('alarm');
  }
});

async function getState(keys) {
  return chrome.storage.local.get(keys);
}

function tabLastErrorMessage() {
  try {
    return chrome.runtime.lastError?.message || null;
  } catch {
    return null;
  }
}

function urlsMatchForReuse(existingUrl, nextUrl) {
  if (!existingUrl || !nextUrl) return false;
  try {
    const a = new URL(existingUrl);
    const b = new URL(nextUrl);
    if (a.href === b.href) return true;
    // Same watch/search target with only minor query churn (e.g. YouTube).
    if (a.origin === b.origin && a.pathname === b.pathname) {
      const ak = a.searchParams.get('v') || a.searchParams.get('search_query');
      const bk = b.searchParams.get('v') || b.searchParams.get('search_query');
      if (ak && bk && ak === bk) return true;
    }
  } catch {
    // ignore parse errors
  }
  return existingUrl === nextUrl;
}

/** Record the player tab for this browser session; never throw. */
async function claimPlayerTabId(tabId) {
  if (tabId == null) return;
  try {
    await setPlayerTabId(tabId);
  } catch (err) {
    console.warn('claimPlayerTabId', err?.message || err);
  }
}

/**
 * Find the player tab again after a failed/raced open. Only tabs that
 * Auscultrix itself opened in this browser session qualify, and only while
 * they still show the player site: a person's own YouTube tabs (or any tab
 * that happens to reuse an old id after a restart) are never adopted.
 */
async function recoverPlayerTabId(preferredUrl) {
  let owned = [];
  try {
    const current = await getPlayerTabId();
    owned = await getOwnedPlayerTabIds();
    if (current != null && !owned.includes(current)) owned.push(current);
  } catch {
    return null;
  }
  let best = null;
  for (const id of owned.slice().reverse()) {
    try {
      const tab = await chrome.tabs.get(id);
      const u = tab?.pendingUrl || tab?.url || '';
      if (tab?.id == null || !isPlayerHostUrl(u)) continue;
      if (preferredUrl && urlsMatchForReuse(u, preferredUrl)) {
        best = tab;
        break;
      }
      if (!best) best = tab;
    } catch {
      // closed tab: forget it
      forgetTab(id).catch(() => {});
    }
  }
  if (best?.id != null) {
    await claimPlayerTabId(best.id);
    return best.id;
  }
  return null;
}

/**
 * Open or reuse the web player tab. Never steals browser-window focus
 * (keeps the side-panel reply channel alive). Treats an already-open
 * matching player tab as success even if update is a no-op / races.
 *
 * Reuse is limited to the tab Auscultrix opened in this browser session and
 * only while it is still on the player site; otherwise a new tab is opened.
 */
async function openOrUpdatePlayerTab(url) {
  const reuseId = await getPlayerTabId();
  let openedTabId = null;

  if (reuseId != null) {
    try {
      const tab = await chrome.tabs.get(reuseId);
      const currentUrl = tab?.url || tab?.pendingUrl || '';
      if (tab?.id != null && isPlayerHostUrl(currentUrl)) {
        openedTabId = tab.id;
        // Stop capture before navigate — active tabCapture can make update fail.
        // Must not fail the open: capture stop uses nested runtime messaging.
        if (getCapturingTabId() === tab.id) {
          try {
            await stopTabAudioCapture();
          } catch (err) {
            console.warn('openOrUpdatePlayerTab stopCapture', err?.message || err);
          }
        }

        if (urlsMatchForReuse(currentUrl, url)) {
          // Already on the track/search — activate in-window only, no window focus.
          try {
            await chrome.tabs.update(tab.id, { active: true });
          } catch (err) {
            console.warn('openOrUpdatePlayerTab activate existing', err?.message || err);
          }
          await claimPlayerTabId(tab.id);
          return tab.id;
        }

        try {
          // Activate the player tab but do not focus the browser window —
          // stealing focus can drop the side-panel message channel mid-reply.
          await chrome.tabs.update(tab.id, { url, active: true });
        } catch (err) {
          console.warn('openOrUpdatePlayerTab update', err?.message || tabLastErrorMessage() || String(err));
          // Tab still exists: claim it as success (player may already be navigating).
          await claimPlayerTabId(tab.id);
          return tab.id;
        }
        await claimPlayerTabId(tab.id);
        return tab.id;
      }
      // The tab left the player site (the person is using it for something
      // else): leave it alone and open a fresh player tab.
      await forgetTab(reuseId);
    } catch {
      // tab gone — fall through to create
      await forgetTab(reuseId).catch(() => {});
    }
  }

  try {
    const tab = await chrome.tabs.create({ url, active: true });
    if (tab?.id != null) {
      openedTabId = tab.id;
      await claimPlayerTabId(tab.id);
      return tab.id;
    }
  } catch (err) {
    const detail = err?.message || tabLastErrorMessage() || String(err);
    console.warn('openOrUpdatePlayerTab create', detail);
    if (openedTabId != null) {
      await claimPlayerTabId(openedTabId);
      return openedTabId;
    }
    const recovered = await recoverPlayerTabId(url);
    if (recovered != null) {
      try {
        await chrome.tabs.update(recovered, { url, active: true });
      } catch (updateErr) {
        console.warn('openOrUpdatePlayerTab recover update', updateErr?.message || updateErr);
      }
      return recovered;
    }
    throw new Error(detail || 'player tab open failed');
  }

  // create returned a tab without id — try recovery before failing
  const recovered = await recoverPlayerTabId(url);
  if (recovered != null) return recovered;
  throw new Error(tabLastErrorMessage() || 'player tab open failed');
}

async function ensureContentScript(tabId) {
  // Autoplays need the player bridge. Vision-only ping must NOT skip bridge inject
  // (a failed multi-file inject used to leave VJ alive and bridge dead).
  let bridgeOk = false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'BRIDGE_PING' });
    bridgeOk = true;
  } catch {
    // fall through
  }
  let vjOk = false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'VJ_PING' });
    vjOk = true;
  } catch {
    // fall through
  }
  if (bridgeOk && vjOk) return true;

  try {
    // Vision / player scripts are YouTube-only — never inject on Bandcamp PiP tabs.
    const tab = await chrome.tabs.get(tabId);
    const u = String(tab?.url || tab?.pendingUrl || '');
    // Only the player site (host permission → url visible); anything else, or
    // a tab whose url we cannot see, is never injected.
    if (!isPlayerHostUrl(u)) return false;
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/vj-overlay.css'],
      });
    } catch {
      // css may already be present
    }
    // Inject one file at a time so a Vision re-declare failure never blocks the bridge.
    for (const file of [
      'content/vj-overlay.js',
      'content/auto-advance.js',
      'content/player-bridge.js',
    ]) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [file],
        });
      } catch (err) {
        console.warn('ensureContentScript inject', file, err?.message || err);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve when the tab reaches status complete on the intended URL (or timeout).
 * Critical after tabs.update: status can still be "complete" on the *previous*
 * document for a beat — finishing early sent BRIDGE_AUTOPLAY into a dying page.
 */
function waitForTabComplete(tabId, timeoutMs = 15000, expectedUrl = null) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        chrome.tabs.onUpdated.removeListener(onUpdated);
      } catch {
        // ignore
      }
      resolve();
    };
    const urlMatches = (tab) => {
      if (!expectedUrl) return true;
      const u = String(tab?.url || tab?.pendingUrl || '');
      if (!u || u === 'about:blank' || /^chrome(-extension)?:/i.test(u)) return false;
      if (urlsMatchForReuse(u, expectedUrl)) return true;
      try {
        const a = new URL(u);
        const b = new URL(expectedUrl);
        if (a.origin !== b.origin) return false;
        // Accept watch landings even if we opened a search URL (bridge may have clicked).
        if (a.pathname.startsWith('/watch') && b.pathname.startsWith('/watch')) return true;
        if (a.pathname.startsWith('/results') && b.pathname.startsWith('/results')) return true;
        if (a.pathname.startsWith('/watch') && b.pathname.startsWith('/results')) return true;
      } catch {
        // ignore
      }
      return false;
    };
    const onUpdated = (id, info, tab) => {
      if (id !== tabId) return;
      if (info.status === 'complete' && urlMatches(tab)) finish();
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab?.status === 'complete' && urlMatches(tab)) finish();
      })
      .catch(() => {});
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Serialise playlist moves: a manual «Next» and an end-of-track report that
 * arrive together must not both read the same index (double advance / skip).
 */
let playlistChain = Promise.resolve();
function serializedPlaylistOp(fn) {
  const run = playlistChain.then(fn, fn);
  playlistChain = run.catch(() => {});
  return run;
}

/**
 * End the listening session in the worker: no more tracks, no overlay, no capture.
 * Used when the playlist reaches its last track (an ISO path ends at its
 * target; it never jumps back to the first, most distant, track).
 */
async function finishListeningSession(reason) {
  await setSessionActive(false);
  try {
    await stopTabAudioCapture();
  } catch {
    // ignore
  }
  await chrome.storage.local.remove([STORAGE_KEYS.currentTrack]).catch(() => {});
  await sendToPlayerTab({ type: 'VJ_SET_ENABLED', enabled: false }).catch(() => {});
  try {
    await chrome.runtime.sendMessage({ type: 'PLAYLIST_FINISHED', reason });
  } catch {
    // side panel may be closed
  }
}

/**
 * Sequential next track — same as side-panel «Successivo».
 * At the end of the playlist the session ends (no wrap-around).
 * @returns {Promise<{ ok: boolean, track?: object, index?: number, error?: string, finished?: boolean }>}
 */
function advancePlaylistAndPlay(source = 'auto') {
  return serializedPlaylistOp(() => advancePlaylistAndPlayNow(source));
}

async function advancePlaylistAndPlayNow(source) {
  const data = await getState([
    STORAGE_KEYS.playlist,
    STORAGE_KEYS.playlistIndex,
    STORAGE_KEYS.playbackProviderId,
    STORAGE_KEYS.lastAutoAdvanceAt,
  ]);
  const playlist = Array.isArray(data.playlist) ? data.playlist : [];
  if (!playlist.length) {
    return {
      ok: false,
      error: chrome.i18n.getMessage('errorPlaylistEmpty') || 'Empty playlist',
    };
  }

  const now = Date.now();
  const lastAt = Number(data.lastAutoAdvanceAt) || 0;
  if (source === 'auto' && now - lastAt < AUTO_ADVANCE_COOLDOWN_MS) {
    return {
      ok: false,
      error: chrome.i18n.getMessage('errorAutoAdvanceCooldown') || 'Auto-advance cooldown',
    };
  }

  const prevIndex = Math.max(0, Math.min(playlist.length - 1, Number(data.playlistIndex) || 0));
  if (prevIndex >= playlist.length - 1) {
    await chrome.storage.local.set({ [STORAGE_KEYS.lastAutoAdvanceAt]: now });
    await finishListeningSession(source === 'auto' ? 'playlist_end' : 'playlist_end_manual');
    return { ok: false, finished: true, index: prevIndex };
  }
  const nextIndex = prevIndex + 1;
  const track = playlist[nextIndex];
  if (!track) {
    return {
      ok: false,
      error: chrome.i18n.getMessage('errorNextTrackMissing') || 'Next track missing',
    };
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.playlistIndex]: nextIndex,
    [STORAGE_KEYS.currentTrack]: track,
    [STORAGE_KEYS.lastAutoAdvanceAt]: now,
  });

  const providerId = data.playbackProviderId || DEFAULT_PROVIDER_ID;
  const playResult = await playTrackInternal(track, providerId);

  try {
    await chrome.runtime.sendMessage({
      type: 'PLAYLIST_ADVANCED',
      playlistIndex: nextIndex,
      track,
      source,
    });
  } catch {
    // side panel may be closed
  }

  return {
    ok: !!playResult?.ok,
    track,
    index: nextIndex,
    error: playResult?.error,
    ...playResult,
  };
}

/**
 * Shared PLAY_TRACK body (also used by auto-advance).
 */
async function playTrackInternal(track, providerId) {
  if (!track) {
    return {
      ok: false,
      error: chrome.i18n.getMessage('errorTrackMissing') || 'Track missing',
    };
  }

  let provider;
  let url;
  let tabId = null;
  try {
    const stored = await getState([
      STORAGE_KEYS.playbackProviderId,
      STORAGE_KEYS.vjEnabled,
      STORAGE_KEYS.musicGeoZone,
      STORAGE_KEYS.musicLanguageMode,
    ]);
    const resolvedProviderId = providerId || stored.playbackProviderId || DEFAULT_PROVIDER_ID;
    ({ provider, url } = buildPlaybackUrl(resolvedProviderId, track, {
      musicGeoZone: stored.musicGeoZone,
    }));

    // Remember which video this is: the session acts on this video only, never
    // on one the person later picks in the same tab. A search URL has no id
    // yet: the first video reached from it is adopted.
    await setSessionVideo({ videoId: youtubeVideoIdFromUrl(url), trackId: track.id ?? null });

    try {
      tabId = await openOrUpdatePlayerTab(url);
    } catch (err) {
      const detail = String(err?.message || err || '').trim();
      console.warn('playTrackInternal open', detail, tabLastErrorMessage());
      // Tab may already be open despite the throw — never false-positive the UI.
      tabId = await recoverPlayerTabId(url);
      if (tabId == null) {
        return {
          ok: false,
          error: detail || chrome.i18n.getMessage('playErrorFallback') || 'player open failed',
          url,
          providerId: provider.id,
          providerName: provider.name,
        };
      }
    }

    if (tabId == null) {
      tabId = await recoverPlayerTabId(url);
    }
    if (tabId == null) {
      return {
        ok: false,
        error: chrome.i18n.getMessage('playErrorFallback') || 'player open failed',
        url,
        providerId: provider.id,
        providerName: provider.name,
      };
    }

    // Tab is open: always report success to the side panel even if VJ/storage lag.
    const result = {
      ok: true,
      tabId,
      url,
      providerId: provider.id,
      providerName: provider.name,
      supportsVj: provider.supportsVj !== false && provider.consumerWeb !== false,
      note: providerNote(provider) || null,
    };

    try {
      const { playedIds = [] } = await getState([STORAGE_KEYS.playedIds]);
      const nextPlayed = [...new Set([...playedIds, track.id])].slice(-200);
      await chrome.storage.local.set({
        [STORAGE_KEYS.playedIds]: nextPlayed,
        [STORAGE_KEYS.currentTrack]: track,
        [STORAGE_KEYS.playbackProviderId]: provider.id,
      });
      await claimPlayerTabId(tabId);
      await setSessionActive(true);
    } catch (err) {
      console.warn('playTrackInternal storage', err);
    }

    const vjOn = stored.vjEnabled === true;

    // Player control (auto-advance / messaging) must work with VJ off.
    // Do not wait for cover fetch — inject as soon as the tab exists.
    ensureContentScript(tabId).catch(() => {});

    // Universal bridge: always ask the tab to press play (and, on search pages,
    // open the best matching result). Direct YouTube watch URLs still need a
    // click — browsers often block unmuted autoplay even with &autoplay=1.
    scheduleBridgeAutoplay(tabId, track, url);

    // VJ overlay + tabCapture only when vjEnabled (side-panel toggle or
    // auto-enable from Inizia / extension play). Casual YT browse stays off.
    // Fire-and-forget: must never flip the PLAY_TRACK reply to ok:false.
    if (vjOn) {
      Promise.resolve()
        .then(() => resolveVjPalette(track))
        .then(({ colors, coverUrl }) => {
          const delay = provider.id === 'youtube' ? 2800 : 1800;
          setTimeout(async () => {
            try {
              if (!(await isSessionActive()) || (await isPlayerDetached())) return;
              // only over the session's own video (a search page waits for its result)
              const tabNow = await chrome.tabs.get(tabId).catch(() => null);
              const kindNow = classifyPlayerVideo(
                await getSessionVideo(),
                youtubeVideoIdFromUrl(tabNow?.url || tabNow?.pendingUrl || ''),
              );
              if (kindNow !== 'owned') return;
              await markSessionVideoLanded();
              await pushVjToTab(tabId, {
                colors,
                coverUrl,
                enabled: true,
                durationMs: Number(track.durationMs) || 0,
                trackId: track.id || null,
                youtubeVideoId: track.youtubeVideoId || null,
              });
              await startTabAudioCapture(tabId);
            } catch (err) {
              console.warn('playTrackInternal VJ', err);
            }
          }, delay);
        })
        .catch((err) => console.warn('playTrackInternal palette', err));
    }

    return result;
  } catch (err) {
    const detail = String(err?.message || err || '').trim();
    console.warn('playTrackInternal', detail, tabLastErrorMessage());
    // If we already opened/claimed a tab, success wins over any later exception.
    if (tabId == null) {
      tabId = await recoverPlayerTabId(url);
    }
    if (tabId != null) {
      await claimPlayerTabId(tabId);
      return {
        ok: true,
        tabId,
        url,
        providerId: provider?.id,
        providerName: provider?.name,
        recovered: true,
      };
    }
    return {
      ok: false,
      error: detail || chrome.i18n.getMessage('playErrorFallback') || 'player open failed',
      url,
      providerId: provider?.id,
      providerName: provider?.name,
    };
  }
}

function isFirefoxBackground() {
  try {
    return typeof browser !== 'undefined' && !!browser.runtime;
  } catch {
    return false;
  }
}

/**
 * Firefox (and Chromium fallback): run play kick in the page MAIN world so
 * YouTube's movie_player.playVideo() is reachable. Isolated content scripts
 * alone are often not enough under Firefox autoplay policy.
 * @param {number} tabId
 * @param {{ unmute?: boolean }} [opts]
 */
async function kickYouTubePlayInPage(tabId, opts = {}) {
  const unmute = opts.unmute === true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (doUnmute) => {
        try {
          const player =
            document.getElementById('movie_player') ||
            document.querySelector('.html5-video-player');
          const video =
            document.querySelector('video.html5-main-video') ||
            document.querySelector('#movie_player video') ||
            document.querySelector('video');

          if (!doUnmute) {
            // Already audible — do not remute on later retries.
            if (video && !video.paused && !video.ended && video.muted === false) return;
            // Already playing muted — leave unmute pass to restore audio.
            if (video && !video.paused && !video.ended && video.muted === true) return;

            if (player) {
              try {
                if (typeof player.mute === 'function') player.mute();
                if (typeof player.setVolume === 'function') player.setVolume(0);
              } catch {
                // ignore
              }
              try {
                if (typeof player.playVideo === 'function') player.playVideo();
                else if (typeof player.play === 'function') player.play();
              } catch {
                // ignore
              }
            }
            if (video) {
              try {
                video.muted = true;
                video.defaultMuted = true;
              } catch {
                // ignore
              }
              try {
                const p = video.play?.();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch {
                // ignore
              }
            }
            const large =
              document.querySelector('button.ytp-large-play-button') ||
              document.querySelector('.ytp-large-play-button') ||
              document.querySelector('.ytp-cued-thumbnail-overlay');
            if (large && (!video || video.paused)) {
              try {
                large.click();
              } catch {
                // ignore
              }
            }
            return;
          }

          // Unmute pass — only after muted playback has had a chance to start.
          // Firefox pauses videos unmuted too early: if the video is paused
          // or still at the head, re-kick MUTED instead of unmuting.
          if (video && (video.paused || (video.currentTime || 0) < 0.3)) {
            try {
              if (player && typeof player.mute === 'function') player.mute();
            } catch {
              // ignore
            }
            try {
              if (player && typeof player.playVideo === 'function') player.playVideo();
            } catch {
              // ignore
            }
            if (video) {
              try {
                video.muted = true;
                const p = video.play?.();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch {
                // ignore
              }
            }
            return;
          }
          if (video && !video.paused && video.muted === false) return;
          if (player) {
            try {
              if (typeof player.unMute === 'function') player.unMute();
              if (typeof player.setVolume === 'function') player.setVolume(100);
            } catch {
              // ignore
            }
            try {
              if (video?.paused && typeof player.playVideo === 'function') player.playVideo();
            } catch {
              // ignore
            }
          }
          if (video) {
            try {
              video.muted = false;
              video.volume = 1;
              if (video.paused) {
                const p = video.play?.();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              }
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      },
      args: [unmute],
    });
  } catch {
    // world:MAIN unsupported or tab closed
  }
}

/**
 * Ask the player tab to auto-open the best matching result (with retries while
 * the page loads). Fire-and-forget: never blocks or fails the play reply.
 * Waits for tab `complete` before the first BRIDGE_AUTOPLAY so content scripts
 * are injectable and YouTube's player DOM exists.
 */
/** Monotonic generation of autoplay bursts (one per track start). */
let autoplayGeneration = 0;
/** @type {Set<ReturnType<typeof setTimeout>>} */
const autoplayTimers = new Set();

function scheduleBridgeAutoplay(tabId, track, playUrl) {
  const urlStr = String(playUrl || '');
  // Direct play only when the BUILT url is a watch page — a stored videoId
  // without a valid 11-char token now falls back to a search URL, and the
  // bridge must click results there instead of waiting on a watch page.
  const directPlay =
    /\/watch(\?|$)/i.test(urlStr) ||
    /[?&]v=/.test(urlStr);
  const payload = {
    type: 'BRIDGE_AUTOPLAY',
    artist: track?.artist || '',
    title: track?.title || '',
    directPlay,
    youtubeVideoId: track?.youtubeVideoId || null,
  };
  const ff = isFirefoxBackground();
  // Direct watch: early + dense retries. Search: allow results DOM to paint.
  // Firefox needs denser/longer retries — autoplay unlock is slower and flaky.
  const delays = directPlay
    ? ff
      ? [0, 200, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000, 18000]
      : [0, 400, 1000, 2000, 4000, 7000, 11000, 16000]
    : ff
      ? [600, 1400, 2800, 5000, 8000, 12000, 16000]
      : [800, 2000, 4000, 8000, 12000];

  // A new track supersedes every pending kick of the previous one: rapid
  // «Next» presses must not leave stale retries pressing play on other tracks.
  const generation = ++autoplayGeneration;
  for (const t of autoplayTimers) clearTimeout(t);
  autoplayTimers.clear();

  (async () => {
    try {
      await waitForTabComplete(tabId, ff ? 20000 : 15000, urlStr || null);
    } catch {
      // still attempt below
    }
    if (generation !== autoplayGeneration) return;
    for (const delay of delays) {
      const timer = setTimeout(async () => {
        autoplayTimers.delete(timer);
        if (generation !== autoplayGeneration) return;
        try {
          await ensureContentScript(tabId);
          if (ff || directPlay) {
            // Muted kicks only: unmuting is the in-page bridge's job (it sees
            // the real player state). Background unmute passes used to fight
            // the bridge and toggle play/pause forever on Firefox.
            await kickYouTubePlayInPage(tabId, { unmute: false });
          }
          if (generation !== autoplayGeneration) return;
          await chrome.tabs.sendMessage(tabId, payload);
        } catch {
          // tab may still be loading or was closed
        }
      }, delay);
      autoplayTimers.add(timer);
    }
  })();
}

/**
 * The person chose another video in the player tab: Auscultrix steps aside.
 * No more play kicks for its track, no overlay or tab capture on their video,
 * no auto-advance when it ends (YouTube's own autoplay carries on). The
 * session waits in the panel until the person asks for the playlist again.
 */
async function detachPlayer(reason = 'other_video') {
  if (await isPlayerDetached()) return;
  await setPlayerDetached(true);
  autoplayGeneration++;
  for (const t of autoplayTimers) clearTimeout(t);
  autoplayTimers.clear();
  try {
    await stopTabAudioCapture();
  } catch {
    // ignore
  }
  await sendToPlayerTab({ type: 'VJ_SET_ENABLED', enabled: false }).catch(() => {});
  chrome.runtime.sendMessage({ type: 'PLAYER_DETACHED', reason }).catch(() => {});
}

/** Message the session's own player tab only (never other YouTube tabs). */
async function sendToPlayerTab(message) {
  const playerTabId = await getPlayerTabId();
  if (playerTabId == null) return false;
  try {
    const tab = await chrome.tabs.get(playerTabId);
    if (!isPlayerHostUrl(tab?.url || tab?.pendingUrl)) return false;
    await ensureContentScript(playerTabId);
    await chrome.tabs.sendMessage(playerTabId, message);
    return true;
  } catch {
    return false;
  }
}

async function resolveVjPalette(track, { persist = true } = {}) {
  let coverUrl = null;
  try {
    coverUrl = await resolveCoverUrl(track);
  } catch {
    // ignore
  }

  let colors = [...FALLBACK_COLORS];
  if (coverUrl) {
    colors = await extractColorsFromImageUrl(coverUrl);
  } else if (track?.youtubeVideoId) {
    colors = await extractColorsFromVideoId(track.youtubeVideoId);
    coverUrl = `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`;
  }

  // Only while a session runs: a late palette must never re-create data the
  // person has just erased with «Forget everything».
  if (persist && (await isSessionActive())) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.vjPalette]: colors,
      [STORAGE_KEYS.vjCoverUrl]: coverUrl,
    });
  }

  return { colors, coverUrl };
}

async function pushVjToTab(tabId, { colors, coverUrl, enabled, durationMs, trackId, youtubeVideoId }) {
  await ensureContentScript(tabId);
  await chrome.tabs.sendMessage(tabId, {
    type: 'VJ_APPLY_COVER',
    colors,
    coverUrl,
    enabled,
    durationMs: durationMs || 0,
    trackId: trackId || null,
    youtubeVideoId: youtubeVideoId || null,
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'LIST_PLAYBACK_PROVIDERS': {
        sendResponse({ ok: true, providers: listProviders(), defaultId: DEFAULT_PROVIDER_ID });
        return;
      }

      case 'SET_PLAYBACK_PROVIDER': {
        const id = message.providerId || DEFAULT_PROVIDER_ID;
        const provider = getProvider(id);
        await chrome.storage.local.set({ [STORAGE_KEYS.playbackProviderId]: provider.id });
        sendResponse({ ok: true, providerId: provider.id, name: provider.name });
        return;
      }

      case 'PLAY_TRACK': {
        const track = message.track;
        if (!track) {
          sendResponse({
            ok: false,
            error: chrome.i18n.getMessage('errorTrackMissing') || 'Track missing',
          });
          return;
        }
        // New track, new mission: clear the previous playback-state report.
        try {
          await chrome.storage.local.set({
            [STORAGE_KEYS.playerMuted]: null,
            [STORAGE_KEYS.playerPlaying]: null,
            [STORAGE_KEYS.autoplayBlocked]: false,
          });
        } catch {
          // ignore
        }
        const stored = await getState([STORAGE_KEYS.playbackProviderId]);
        const providerId = message.providerId || stored.playbackProviderId || DEFAULT_PROVIDER_ID;
        let result;
        try {
          result = await serializedPlaylistOp(() => playTrackInternal(track, providerId));
        } catch (err) {
          // Last line of defence: never ok:false if a player tab is alive.
          console.warn('PLAY_TRACK handler', err?.message || err);
          const recovered = await recoverPlayerTabId(null);
          if (recovered != null) {
            result = { ok: true, tabId: recovered, recovered: true };
          } else {
            result = {
              ok: false,
              error:
                String(err?.message || err || '').trim() ||
                chrome.i18n.getMessage('playErrorFallback') ||
                'player open failed',
            };
          }
        }
        // Belt-and-suspenders: ok:false with a live playerTabId → force success.
        if (result && result.ok === false) {
          const recovered =
            result.tabId != null ? result.tabId : await recoverPlayerTabId(result.url || null);
          if (recovered != null) {
            result = { ...result, ok: true, tabId: recovered, recovered: true };
            delete result.error;
          }
        }
        sendResponse(result);
        return;
      }

      case 'PLAYBACK_STATE': {
        // Bridge's honest report from the player page (playing? muted?
        // browser blocking everything?). Persisted for the side panel poll.
        try {
          await chrome.storage.local.set({
            [STORAGE_KEYS.playerMuted]: message.muted === true,
            [STORAGE_KEYS.playerPlaying]: message.playing === true,
            [STORAGE_KEYS.autoplayBlocked]: message.blocked === true,
          });
        } catch {
          // ignore
        }
        sendResponse({ ok: true });
        return;
      }

      case 'TRACK_ENDED': {
        // Only the video Auscultrix put in its own player tab may advance the
        // playlist. A video ending in any other YouTube tab, or another video
        // the person chose in the player tab, is theirs: it is ignored and
        // YouTube's own autoplay carries on — the extension never takes over.
        const playerTabId = await getPlayerTabId();
        const senderTabId = sender.tab?.id;
        const endedVideoId = youtubeVideoIdFromUrl(message.url) || null;
        const decision = decideTrackEnd({
          active: await isSessionActive(),
          fromPlayerTab: senderTabId != null && playerTabId != null && senderTabId === playerTabId,
          detached: await isPlayerDetached(),
          sessionVideo: await getSessionVideo(),
          endedVideoId,
        });
        if (!decision.advance) {
          if (decision.detach) await detachPlayer('other_video');
          sendResponse({
            ok: false,
            ignored: true,
            reason: decision.reason,
            error:
              chrome.i18n.getMessage('errorWrongPlayerTab') || 'Not the active player tab',
          });
          return;
        }
        if (decision.adopt) await markSessionVideoLanded(endedVideoId);
        // until the next track lands, YouTube's own autoplay may flash its
        // recommendation in the tab: that is not the person's choice
        await markSessionNavigating();
        const result = await advancePlaylistAndPlay('auto');
        sendResponse(result);
        return;
      }

      case 'ADVANCE_PLAYLIST': {
        const result = await advancePlaylistAndPlay(message.source || 'manual');
        sendResponse(result);
        return;
      }

      case 'STOP_SESSION': {
        // Soft stop from the side panel: end capture / clear current track,
        // keep the player tab so Play can resume without reopening.
        await setSessionActive(false);
        await stopTabAudioCapture();
        await chrome.storage.local.remove('currentTrack');
        await sendToPlayerTab({ type: 'VJ_SET_ENABLED', enabled: false }).catch(() => {});
        sendResponse({ ok: true, reason: message.reason || 'stop' });
        return;
      }

      case 'SET_VJ_ENABLED': {
        // Persist + reply immediately. Overlay/tabCapture must never block
        // (or fail) the side-panel message that also drives play/open-player.
        const enabled = !!message.enabled;
        await chrome.storage.local.set({ [STORAGE_KEYS.vjEnabled]: enabled });
        sendResponse({ ok: true });

        Promise.resolve()
          .then(async () => {
            // Switching on reaches the tab only while it shows the session's
            // own video; switching off always does.
            const onOwnVideo = (await isSessionActive()) && !(await isPlayerDetached());
            if (!enabled || onOwnVideo) await sendToPlayerTab({ type: 'VJ_SET_ENABLED', enabled });
            const playerTabId = await getPlayerTabId();
            if (enabled && playerTabId != null && onOwnVideo) {
              let { vjPalette, vjCoverUrl, currentTrack } = await getState([
                STORAGE_KEYS.vjPalette,
                STORAGE_KEYS.vjCoverUrl,
                'currentTrack',
              ]);
              // First Inizia used to enable Vision with an empty palette — resolve now.
              if (
                currentTrack &&
                (!Array.isArray(vjPalette) || vjPalette.length === 0)
              ) {
                try {
                  const resolved = await resolveVjPalette(currentTrack);
                  vjPalette = resolved.colors;
                  vjCoverUrl = resolved.coverUrl;
                } catch (err) {
                  console.warn('SET_VJ_ENABLED palette', err);
                }
              }
              await pushVjToTab(playerTabId, {
                colors: vjPalette,
                coverUrl: vjCoverUrl,
                enabled: true,
                durationMs: Number(currentTrack?.durationMs) || 0,
                trackId: currentTrack?.id || null,
                youtubeVideoId: currentTrack?.youtubeVideoId || null,
              });
              await startTabAudioCapture(playerTabId);
            } else if (!enabled) {
              await stopTabAudioCapture();
            }
          })
          .catch((err) => console.warn('SET_VJ_ENABLED deferred', err));
        return;
      }

      case 'VJ_AUDIO_FRAME': {
        // Relay smoothed levels to the player tab overlay
        const levels = {
          type: 'VJ_AUDIO_LEVELS',
          bass: message.bass || 0,
          mid: message.mid || 0,
          treble: message.treble || 0,
          energy: message.energy || 0,
        };
        const playerTabId = await getPlayerTabId();
        if (playerTabId != null) {
          chrome.tabs.sendMessage(playerTabId, levels).catch(() => {});
        }
        sendResponse({ ok: true });
        return;
      }

      case 'YOUTUBE_VIDEO_DETECTED': {
        // A video appeared in a YouTube tab. The reply tells the page whether
        // Vision belongs on it: only on the session's own video, in the
        // session's own tab. Casual YouTube browsing never becomes the player
        // and never gets the overlay or tab capture; a video the person picks
        // in the player tab pauses the session instead of feeding it.
        const playerTabId = await getPlayerTabId();
        const senderTabId = sender.tab?.id;
        const isAuscultrixPlayerTab =
          senderTabId != null && playerTabId != null && senderTabId === playerTabId &&
          (await isSessionActive());
        if (!isAuscultrixPlayerTab || !message.videoId) {
          sendResponse({ ok: true, vision: false, owned: false });
          return;
        }
        const kind = classifyPlayerVideo(await getSessionVideo(), message.videoId);
        if (kind === 'foreign') {
          await detachPlayer('other_video');
          sendResponse({ ok: true, vision: false, owned: false });
          return;
        }
        if (kind !== 'owned' && kind !== 'adopt') {
          // our own navigation has not landed yet: neither ours nor theirs
          sendResponse({ ok: true, vision: false, owned: false });
          return;
        }
        await markSessionVideoLanded(message.videoId);
        if (await isPlayerDetached()) {
          // the person came back to the session's video: the session resumes
          await setPlayerDetached(false);
          chrome.runtime.sendMessage({ type: 'PLAYER_REATTACHED' }).catch(() => {});
        }
        const { vjEnabled, currentTrack } = await getState([STORAGE_KEYS.vjEnabled, 'currentTrack']);
        if (currentTrack) {
          if (kind === 'adopt' || !currentTrack.youtubeVideoId) {
            currentTrack.youtubeVideoId = message.videoId;
            await chrome.storage.local.set({ currentTrack });
          }
          if (vjEnabled === true) {
            const colors = await extractColorsFromVideoId(message.videoId);
            const coverUrl = `https://i.ytimg.com/vi/${message.videoId}/hqdefault.jpg`;
            // the session may have ended (or been erased), or the person may have
            // moved to another video, while the image loaded
            if (!(await isSessionActive()) || (await isPlayerDetached())) {
              sendResponse({ ok: true, vision: false, owned: false });
              return;
            }
            await chrome.storage.local.set({
              [STORAGE_KEYS.vjPalette]: colors,
              [STORAGE_KEYS.vjCoverUrl]: coverUrl,
            });
            await pushVjToTab(senderTabId, {
              colors,
              coverUrl,
              enabled: true,
              durationMs: Number(currentTrack?.durationMs) || 0,
              trackId: currentTrack?.id || null,
              youtubeVideoId: message.videoId || currentTrack?.youtubeVideoId || null,
            });
          }
        }
        sendResponse({ ok: true, vision: vjEnabled === true, owned: true });
        return;
      }

      case 'OPEN_SIDE_PANEL': {
        try {
          await openPanel(sender.tab?.windowId);
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ ok: false, error: String(err?.message || err) });
        }
        return;
      }

      case 'SYNC_CREATOR_LIBRARY': {
        const result = await runCreatorLibrarySync(message.reason || 'sidepanel');
        sendResponse(result);
        return;
      }

      case 'SYNC_EMERGENTE_CATALOG': {
        const result = await runEmergenteCatalogRefresh(message.reason || 'sidepanel');
        try {
          await chrome.runtime.sendMessage({
            type: 'EMERGENTE_CATALOG_REFRESHED',
            ...(result && typeof result === 'object' ? result : {}),
          });
        } catch {
          // side panel may be closed
        }
        sendResponse(result);
        return;
      }

      default:
        sendResponse({
          ok: false,
          error: chrome.i18n.getMessage('errorUnknownMessage') || 'Unknown message',
        });
    }
  })().catch((err) => {
    sendResponse({ ok: false, error: String(err?.message || err) });
  });
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const playerTabId = await getPlayerTabId();
  if (playerTabId === tabId) {
    await forgetTab(tabId);
    await setSessionActive(false);
    // Side panel may schedule a gentle donation ask after a natural session end.
    chrome.runtime.sendMessage({ type: 'PLAYER_TAB_CLOSED', tabId }).catch(() => {});
  } else {
    await forgetTab(tabId).catch(() => {});
  }
  if (getCapturingTabId() === tabId) {
    await stopTabAudioCapture();
  }
});
