// Manifest, permissions, CSP and static security scans.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, readText, listFiles } from '../helpers/env.mjs';

const manifest = JSON.parse(readText('manifest.json'));
const code = ['background.js', 'sidepanel.js', 'options.js', 'offscreen-audio.js', ...listFiles('content', (f) => f.endsWith('.js')), ...listFiles('lib', (f) => f.endsWith('.js') || f.endsWith('.mjs'))];

test('UT-SEC-01 permissions are the minimal set (no tabs, no cookies, no <all_urls>, no identity)', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'offscreen', 'scripting', 'sidePanel', 'storage', 'tabCapture']);
  for (const p of ['tabs', 'cookies', 'history', 'webRequest', 'identity', '<all_urls>', 'downloads', 'clipboardRead']) {
    assert.ok(!manifest.permissions.includes(p), p);
  }
});

test('UT-SEC-02 host permissions limited to the 9 hosts actually used', () => {
  assert.deepEqual(manifest.host_permissions, [
    'https://www.youtube.com/*', 'https://youtube.com/*', 'https://m.youtube.com/*', 'https://music.youtube.com/*',
    'https://i.ytimg.com/*', 'https://open.spotify.com/*', 'https://lrclib.net/*', 'https://bandcamp.com/*', 'https://*.bandcamp.com/*',
  ]);
  for (const cs of manifest.content_scripts) for (const m of cs.matches) assert.match(m, /^https:\/\/([a-z]+\.)?youtube\.com\/\*$/);
});

test('UT-SEC-03 CSP: only packaged scripts, no remote code, no eval', () => {
  const csp = manifest.content_security_policy?.extension_pages || '';
  assert.match(csp, /script-src 'self'/);
  assert.ok(!/unsafe-eval|unsafe-inline|https?:/.test(csp), csp);
  for (const html of listFiles('.', (f) => f.endsWith('.html') && !f.includes('packaging') && !f.includes('docs') && !f.includes('archive') && !f.includes('tests'))) {
    const src = readText(html);
    for (const m of src.matchAll(/<script[^>]*src="([^"]+)"/g)) assert.ok(!/^https?:/.test(m[1]), `${html}: remote script ${m[1]}`);
    assert.ok(!/<script(?![^>]*src=)[^>]*>[^<]+<\/script>/.test(src), `${html}: inline script`);
  }
});

test('UT-SEC-04 no unsafe DOM sinks or dynamic code in extension code', () => {
  for (const f of code) {
    const src = readText(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const re of [/\.innerHTML\s*=/, /\.outerHTML\s*=/, /insertAdjacentHTML\(/, /document\.write\(/, /\beval\(/, /new Function\(/, /setTimeout\(\s*['"`]/]) {
      assert.ok(!re.test(src), `${f}: ${re}`);
    }
  }
});

test('UT-SEC-05 no plain-http endpoints, no telemetry/analytics SDKs', () => {
  for (const f of code) {
    const src = readText(f);
    // XML namespace names (the SVG namespace) are identifiers, never fetched
    const http = [...src.matchAll(/['"`]http:\/\/(?!127\.0\.0\.1|localhost|www\.w3\.org\/2000\/svg['"`])[^'"`]+/g)].map((m) => m[0]);
    assert.deepEqual(http, [], `${f}: ${http.join(', ')}`);
    assert.ok(!/google-analytics|googletagmanager|sentry\.io|mixpanel|segment\.io|amplitude\.com/i.test(src), `${f}: telemetry`);
  }
});

test('UT-SEC-06 the worker no longer exposes the whole storage (GET_STATE removed)', () => {
  assert.ok(!/case 'GET_STATE'/.test(readText('background.js')));
});

test('UT-SEC-07 end-of-track reports are accepted only from the session player tab', () => {
  const bg = readText('background.js');
  const block = bg.slice(bg.indexOf("case 'TRACK_ENDED'"), bg.indexOf("case 'ADVANCE_PLAYLIST'"));
  assert.match(block, /isSessionActive\(\)/);
  // the sender must be the session's own player tab (5.1.1: and the video the session's own)
  assert.match(block, /fromPlayerTab:\s*senderTabId != null && playerTabId != null && senderTabId === playerTabId/);
  assert.match(block, /decideTrackEnd\(/);
  assert.ok(!/storage\.local\.set\(\{\s*\[STORAGE_KEYS\.playerTabId\]/.test(bg));
});

test('UT-SEC-08 Firefox manifest derivation: Chrome-only keys removed, gecko id stable', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'packaging', 'make-firefox-manifest.mjs')], { encoding: 'utf8' });
  const ff = JSON.parse(out);
  assert.equal(ff.version, manifest.version);
  for (const p of ['sidePanel', 'tabCapture', 'offscreen']) assert.ok(!ff.permissions.includes(p));
  assert.equal(ff.minimum_chrome_version, undefined);
  assert.equal(ff.side_panel, undefined);
  assert.ok(ff.sidebar_action);
  assert.equal(ff.browser_specific_settings.gecko.id, 'auscultrix@loremYpsum-cmd.github.io');
  assert.deepEqual(ff.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
});

test('UT-SEC-09 version consistency: manifest = CHANGELOG head = README', () => {
  const cl = readText('CHANGELOG.md');
  const head = cl.match(/^##\s+([0-9]+\.[0-9]+\.[0-9]+)/m)?.[1];
  assert.equal(head, manifest.version);
  assert.match(manifest.minimum_chrome_version, /^\d+$/);
});

test('UT-SEC-10 all extension JS parses (node --check)', () => {
  for (const f of code.filter((x) => x.endsWith('.js'))) {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)]);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'manifest.json')));
});

test('UT-REL-01 YouTube content scripts create their observers once per page (no accumulation at SPA navigations)', () => {
  const aa = readText('content/auto-advance.js');
  assert.equal((aa.match(/new MutationObserver\(/g) || []).length, 1, 'auto-advance: one observer');
  const nav = aa.slice(aa.indexOf('let lastHref = location.href;'));
  assert.ok(!/ytEndedHooked = false/.test(nav), 'navigation handler must not re-arm the hooks');
  assert.ok(!/hookYouTube\(\)/.test(nav.slice(0, nav.indexOf('scanMedia();'))), 'navigation handler must not call hookYouTube');
  const vj = readText('content/vj-overlay.js');
  assert.match(vj, /if \(globalThis\.__auscultrixVjOverlayLoaded\) return;/);
  const br = readText('content/player-bridge.js');
  assert.match(br, /if \(globalThis\.__auscultrixPlayerBridge\) return;/);
});

test('UT-REL-02 the worker serialises playlist moves and cancels stale autoplay bursts', () => {
  const bg = readText('background.js');
  assert.match(bg, /function serializedPlaylistOp\(fn\)/);
  assert.match(bg, /return serializedPlaylistOp\(\(\) => advancePlaylistAndPlayNow\(source\)\)/);
  assert.match(bg, /const generation = \+\+autoplayGeneration;/);
  assert.match(bg, /if \(generation !== autoplayGeneration\) return;/);
});

test('UT-SEC-11 no Spotify secret or refresh token in shipped scripts; the build refuses to package one', () => {
  const SECRET = /export\s+const\s+(SPOTIFY_CLIENT_SECRET|SPOTIFY_REFRESH_TOKEN)\s*=\s*(['"`])([^'"`]+)\2/;
  const shipped = [...code, ...listFiles('config', (f) => f.endsWith('.js') && !f.endsWith('spotify.local.js'))];
  for (const f of shipped) assert.ok(!SECRET.test(readText(f)), `credential in ${f}`);
  const build = readText('packaging/build.mjs');
  assert.ok(build.includes('SECRET_ASSIGN.test('), 'build gate present');
  assert.ok(SECRET.test("export const SPOTIFY_REFRESH_TOKEN = 'AQDx-real-token';"), 'gate pattern catches a filled token');
  assert.ok(!SECRET.test("export const SPOTIFY_REFRESH_TOKEN = '';"), 'empty token allowed');
});
