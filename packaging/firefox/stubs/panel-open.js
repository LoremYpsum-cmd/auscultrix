/**
 * Firefox build — uses sidebarAction instead of the Chrome-only sidebar API.
 * Replaces lib/panel-open.js in the Firefox package.
 */

function sidebarApi() {
  try {
    return globalThis.browser?.sidebarAction || chrome.sidebarAction || null;
  } catch {
    return null;
  }
}

/**
 * Resolve a normal browser window id for sidebarAction.open.
 * MV3 event pages often have no "current" window — getCurrent() fails.
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
 * Open the Auscultrix sidebar in a specific (or best-effort) window.
 * @param {number} [windowId]
 */
export async function openPanel(windowId) {
  const api = sidebarApi();
  if (!api?.open) {
    throw new Error('Sidebar API unavailable');
  }
  const id = await resolveWindowId(windowId);
  if (id == null) {
    throw new Error('No browser window available for sidebar');
  }
  await api.open({ windowId: id });
}

let toolbarWired = false;

/**
 * Toolbar button opens the sidebar (persisted per click — Firefox has no
 * openPanelOnActionClick equivalent for sidebarAction).
 * No default_popup is declared on purpose (it would hijack the desktop
 * toolbar click into a popup instead of the sidebar). On platforms without
 * a sidebar (Firefox for Android) the click falls back to opening
 * sidepanel.html in a normal tab — full-page, touch-friendly.
 * Safe to call on every event-page wake: wires the listener only once.
 */
export function installPanelBehavior() {
  if (toolbarWired) return;
  toolbarWired = true;
  try {
    const action =
      globalThis.browser?.action || chrome.action || null;
    if (action?.onClicked?.addListener) {
      action.onClicked.addListener(() => {
        openPanel().catch(() => {
          openPanelTab().catch((err) => {
            console.warn('[panel] open', err?.message || err);
          });
        });
      });
    }
  } catch (err) {
    console.warn('[panel] installPanelBehavior', err?.message || err);
  }
}

function panelTabUrl() {
  try {
    if (globalThis.browser?.runtime?.getURL) {
      return globalThis.browser.runtime.getURL('sidepanel.html');
    }
  } catch {
    // fall through to chrome namespace
  }
  return chrome.runtime.getURL('sidepanel.html');
}

async function openPanelTab() {
  await chrome.tabs.create({ url: panelTabUrl(), active: true });
}
