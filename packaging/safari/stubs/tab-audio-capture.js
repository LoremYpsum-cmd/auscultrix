/**
 * Safari build (same as Firefox) — no-op stubs with no privileged capture identifiers,
 * Safari has no tabCapture or offscreen documents.
 *
 * On Firefox, Vision runs in calm non-reactive mode: the overlay keeps its
 * slow 3 fps lofi motion driven by track progress, without live audio levels.
 */

/** In-memory mirror; always null on Firefox (no capture API). */
let capturingTabId = null;

export function getCapturingTabId() {
  return capturingTabId;
}

/** Restore capture tab id after event-page restart (always null here). */
export async function restoreCapturingTabId() {
  capturingTabId = null;
  return null;
}

export async function stopTabAudioCapture() {
  capturingTabId = null;
}

/**
 * Start tab-audio capture for Vision. Always false on Firefox
 * (caller keeps duration-based motion). Never throws.
 */
export async function startTabAudioCapture(_tabId) {
  capturingTabId = null;
  return false;
}
