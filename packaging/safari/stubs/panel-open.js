/**
 * Safari build — Safari has neither chrome.sidePanel nor sidebarAction.
 * The toolbar button opens the panel (sidepanel.html) in a normal tab, or
 * brings back the one it opened before. A popup is not used on purpose: it
 * closes as soon as it loses focus, which would also stop the soundscape.
 * Replaces lib/panel-open.js in the Safari package.
 */
const TAB_KEY = 'safariPanelTabId';

async function rememberedTab() {
  try {
    const data = await chrome.storage.session.get([TAB_KEY]);
    const id = data[TAB_KEY];
    if (id == null) return null;
    const tab = await chrome.tabs.get(id);
    return tab?.id != null ? tab : null;
  } catch {
    return null;
  }
}

/** Open (or focus) the panel tab. */
export async function openPanel() {
  const existing = await rememberedTab();
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    try {
      if (existing.windowId != null) await chrome.windows.update(existing.windowId, { focused: true });
    } catch {
      // windows API unavailable (iOS): the tab is already active
    }
    return;
  }
  const tab = await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html'), active: true });
  if (tab?.id != null) await chrome.storage.session.set({ [TAB_KEY]: tab.id }).catch(() => {});
}

let wired = false;

/** Toolbar click → panel tab. Safe to call on every worker start. */
export function installPanelBehavior() {
  if (wired) return;
  wired = true;
  try {
    chrome.action?.onClicked?.addListener(() => {
      openPanel().catch((err) => console.warn('[panel] open', err?.message || err));
    });
  } catch (err) {
    console.warn('[panel] installPanelBehavior', err?.message || err);
  }
}
