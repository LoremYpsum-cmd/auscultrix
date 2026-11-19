/**
 * Derive the Safari Web Extension manifest from the Chrome manifest.json.
 * Usage: node packaging/make-safari-manifest.mjs [outPath]
 *
 * Safari (17+) has no side panel, no tabCapture and no offscreen documents: those permissions
 * are removed and the toolbar button opens the panel in a tab
 * (packaging/safari/stubs/panel-open.js). Vision stays in its calm,
 * non-reactive mode, as on Firefox. The generative soundscape needs nothing
 * more than Web Audio, so it works as on Chrome.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, '..', 'manifest.json'), 'utf8'));

const DROP = new Set(['sidePanel', 'tabCapture', 'offscreen']);
manifest.permissions = (manifest.permissions || []).filter((p) => !DROP.has(p));
delete manifest.side_panel;
delete manifest.minimum_chrome_version;
delete manifest.options_ui?.open_in_tab;
// Module service workers are not accepted by the Safari converter: a
// non-persistent background page (mandatory on iOS) loads background.js as
// an ES module through a classic loader, as in the Firefox build.
// persistent:false is required on iOS (macOS ignores it and the converter says so).
manifest.background = { scripts: ['background-safari-loader.js'], persistent: false };
manifest.browser_specific_settings = { safari: { strict_min_version: '17.0' } };

const out = `${JSON.stringify(manifest, null, 2)}\n`;
const dest = process.argv[2];
if (dest) writeFileSync(dest, out);
else process.stdout.write(out);
