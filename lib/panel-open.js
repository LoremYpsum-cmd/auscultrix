/**
 * Side panel / sidebar open helpers (Chrome Side Panel API).
 * Firefox build replaces this file with a sidebarAction-only stub
 * so AMO never sees chrome.sidePanel / setPanelBehavior references.
 */

/**
 * Resolve a normal browser window id for sidePanel.open.
 * MV3 service workers often have no "current" window — getCurrent() fails.
 */
async function resolveWindowId(preferredId) {
  if (preferredId != null) return preferredId;

  try {
    const focused = await chrome.windows.getLastFocused({
      windowTypes: ['normal'],
    });
    if (focused?.id != null) return focused.id;
  } catch {
    // ignore
  }

  try {
    const current = await chrome.windows.getCurrent({ windowTypes: ['normal'] });
    if (current?.id != null) return current.id;
  } catch {
    // ignore
  }

  try {
    const all = await chrome.windows.getAll({ windowTypes: ['normal'] });
    const focused = all.find((w) => w.focused);
    if (focused?.id != null) return focused.id;
    if (all[0]?.id != null) return all[0].id;
  } catch {
    // ignore
  }

  return null;
}

/**
 * Open the Auscultrix side panel in a specific (or best-effort) window.
 * @param {number} [windowId]
 */
export async function openPanel(windowId) {
  if (!chrome.sidePanel?.open) {
    throw new Error('Side Panel API unavailable');
  }
  const id = await resolveWindowId(windowId);
  if (id == null) {
    throw new Error('No browser window available for side panel');
  }
  await chrome.sidePanel.open({ windowId: id });
}

/**
 * Ensure toolbar action opens the side panel (persisted by Chrome).
 * Call on every service-worker start — not only onInstalled — so a failed
 * first-run setPanelBehavior is retried after SW restart / update.
 */
export function installPanelBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  try {
    const result = chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    });
    if (result?.catch) {
      result.catch((err) => {
        console.warn('[panel] setPanelBehavior', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('[panel] setPanelBehavior', err?.message || err);
  }
}
