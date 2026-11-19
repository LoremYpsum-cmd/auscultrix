/**
 * Derive the Firefox MV3 manifest from the Chrome manifest.json.
 * Keeps version, locales, icons, content scripts and host permissions in sync
 * automatically — run via packaging/build-firefox.ps1.
 *
 * Usage: node packaging/make-firefox-manifest.mjs [outPath]
 * Prints the manifest JSON to stdout when outPath is omitted.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const chromeManifestPath = resolve(here, '..', 'manifest.json');
const manifest = JSON.parse(readFileSync(chromeManifestPath, 'utf8'));

// Permissions Firefox does not implement — the Firefox stubs never call them.
const DROP_PERMISSIONS = new Set(['sidePanel', 'tabCapture', 'offscreen']);
manifest.permissions = (manifest.permissions || []).filter(
  (p) => !DROP_PERMISSIONS.has(p),
);

// chrome.sidePanel → sidebar_action.
delete manifest.side_panel;
// Chrome-only key (Firefox uses browser_specific_settings.gecko.strict_min_version).
delete manifest.minimum_chrome_version;

// Firefox MV3 has no background.service_worker: classic event-page loader
// pulls in background.js as an ES module (see background-firefox-loader.js).
manifest.background = { scripts: ['background-firefox-loader.js'] };

manifest.sidebar_action = {
  default_panel: 'sidepanel.html',
  default_title: '__MSG_extName__',
  default_icon: {
    16: 'icons/app_icon_16.png',
    32: 'icons/app_icon_32.png',
    48: 'icons/app_icon_48.png',
    128: 'icons/app_icon_128.png',
  },
  open_at_install: false,
};

// Toolbar button WITHOUT popup: on desktop the click fires onClicked and the
// stub opens the sidebar (unchanged behaviour). On Firefox for Android there
// is no sidebar, so the stub falls back to opening sidepanel.html in a tab.
// (A default_popup was tried and reverted: it hijacked the desktop toolbar
// click into a small popup instead of the sidebar.)
manifest.action = {
  default_title: '__MSG_extName__',
  default_icon: {
    16: 'icons/app_icon_16.png',
    32: 'icons/app_icon_32.png',
    48: 'icons/app_icon_48.png',
    128: 'icons/app_icon_128.png',
  },
};

// Keyboard shortcut to open the sidebar (user-rebindable, Firefox only).
manifest.commands = {
  _execute_sidebar_action: {
    description: '__MSG_extName__',
  },
};

// Stable AMO id — never change after first publication, or updates break.
// data_collection_permissions: none formalises what the architecture already
// guarantees (no Auscultrix servers, no telemetry) for the Firefox 140+
// native consent UI.
manifest.browser_specific_settings = {
  gecko: {
    id: 'auscultrix@loremYpsum-cmd.github.io',
    strict_min_version: '142.0',
    data_collection_permissions: {
      required: ['none'],
    },
  },
};

const out = `${JSON.stringify(manifest, null, 2)}\n`;
const outPath = process.argv[2];
if (outPath) {
  writeFileSync(outPath, out, 'utf8');
  console.log(`firefox manifest written (${manifest.version})`);
} else {
  process.stdout.write(out);
}
