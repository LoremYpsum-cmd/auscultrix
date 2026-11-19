/**
 * Chrome-only: tabCapture → offscreen AnalyserNode for audio-reactive Visione.
 * Firefox build replaces this file with no-op stubs (no tabCapture / offscreen /
 * getContexts identifiers) so AMO static analysis stays clean.
 */

const OFFSCREEN_URL = 'offscreen.html';
const OFFSCREEN_PATH = chrome.runtime.getURL(OFFSCREEN_URL);
const CAPTURE_TAB_SESSION_KEY = 'capturingTabId';

/** In-memory mirror; also persisted to chrome.storage.session when available. */
let capturingTabId = null;

export function getCapturingTabId() {
  return capturingTabId;
}

async function persistCapturingTabId(tabId) {
  capturingTabId = tabId;
  try {
    if (chrome.storage?.session) {
      if (tabId == null) {
        await chrome.storage.session.remove(CAPTURE_TAB_SESSION_KEY);
      } else {
        await chrome.storage.session.set({ [CAPTURE_TAB_SESSION_KEY]: tabId });
      }
    }
  } catch {
    // session storage may be unavailable
  }
}

/** Restore capture tab id after service-worker restart (best-effort). */
export async function restoreCapturingTabId() {
  if (capturingTabId != null) return capturingTabId;
  try {
    if (!chrome.storage?.session) return null;
    const data = await chrome.storage.session.get(CAPTURE_TAB_SESSION_KEY);
    const id = data?.[CAPTURE_TAB_SESSION_KEY];
    capturingTabId = typeof id === 'number' ? id : null;
    return capturingTabId;
  } catch {
    return null;
  }
}

function hasOffscreenApi() {
  return typeof chrome.offscreen?.createDocument === 'function';
}

function hasTabCaptureApi() {
  return typeof chrome.tabCapture?.getMediaStreamId === 'function';
}

async function listOffscreenContexts() {
  if (typeof chrome.runtime.getContexts !== 'function') return null;
  try {
    return await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [OFFSCREEN_PATH],
    });
  } catch (err) {
    console.warn('[capture] getContexts', err?.message || err);
    return null;
  }
}

async function pingOffscreen(timeoutMs = 800) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, timeoutMs);
    try {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING' }, (response) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const err = chrome.runtime.lastError;
        resolve(!err && response?.ok === true);
      });
    } catch {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Ensure the offscreen document exists and can receive messages.
 * Retries create + ping — createDocument can resolve before listeners attach.
 */
async function ensureOffscreen() {
  if (!hasOffscreenApi()) {
    throw new Error('Offscreen API unavailable');
  }

  const existing = await listOffscreenContexts();
  if (existing?.length) {
    if (await pingOffscreen()) return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
      justification:
        'Analisi audio reale della tab per VJ reattivo (AnalyserNode) mantenendo l’ascolto.',
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/already|exists/i.test(msg)) throw err;
  }

  for (let i = 0; i < 8; i++) {
    if (await pingOffscreen(400)) return;
    await new Promise((r) => setTimeout(r, 50 * (i + 1)));
  }
  throw new Error('Offscreen document not ready');
}

async function closeOffscreenIfAny() {
  if (typeof chrome.offscreen?.closeDocument !== 'function') return;
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/no.*document|does not exist|not found|no active/i.test(msg)) {
      console.warn('[capture] closeDocument', msg);
    }
  }
}

export async function stopTabAudioCapture() {
  try {
    await chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_TAB_AUDIO' });
  } catch {
    // offscreen may be absent
  }
  await persistCapturingTabId(null);
  await closeOffscreenIfAny();
}

/**
 * Start tab-audio capture for Visione. Returns false when APIs/permissions fail
 * (caller keeps duration-based motion). Never throws to callers that ignore result.
 */
export async function startTabAudioCapture(tabId) {
  if (tabId == null) return false;
  if (!hasTabCaptureApi() || !hasOffscreenApi()) {
    console.warn('[capture] tabCapture/offscreen unavailable');
    return false;
  }

  await stopTabAudioCapture();

  try {
    await ensureOffscreen();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });
    if (!streamId) {
      console.warn('[capture] empty media stream id');
      await closeOffscreenIfAny();
      return false;
    }

    const response = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'OFFSCREEN_START_TAB_AUDIO', streamId },
          (res) => {
            const err = chrome.runtime.lastError;
            if (err) resolve({ ok: false, error: err.message });
            else resolve(res || { ok: false, error: 'no response' });
          },
        );
      } catch (err) {
        resolve({ ok: false, error: String(err?.message || err) });
      }
    });

    if (!response?.ok) {
      console.warn('[capture] offscreen start failed', response?.error);
      await closeOffscreenIfAny();
      await persistCapturingTabId(null);
      return false;
    }

    await persistCapturingTabId(tabId);
    return true;
  } catch (err) {
    console.warn('[capture] tab audio capture failed', err?.message || err);
    await persistCapturingTabId(null);
    try {
      await closeOffscreenIfAny();
    } catch {
      // ignore
    }
    return false;
  }
}
