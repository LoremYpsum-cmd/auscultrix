#!/usr/bin/env node
/**
 * Cross-platform build (macOS / Linux / Windows with `zip` or `tar`).
 * Same rules as build-chrome.ps1 / build-firefox.ps1, plus quality gates:
 *   1. tests must pass (affect engine on held-out set, safety layer)
 *   2. every JS file must parse; manifest must be valid JSON
 *   3. Firefox package must not reference Chrome-only APIs
 *   4. nothing private or dev-only ships (.git, tests, .DS_Store, spotify.local.js,
 *      key files, and no Spotify client secret or refresh token in any script)
 *
 *   node packaging/build.mjs            → Chrome, Firefox and Safari packages
 *   node packaging/build.mjs chrome     → Chrome only
 *   node packaging/build.mjs safari     → Safari web extension folder + zip
 *                                         (then packaging/apple/make-xcode-project.sh)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const targets = process.argv[2] ? [process.argv[2]] : ['chrome', 'firefox', 'safari'];
const EXCLUDE_TOP = new Set(['packaging', 'apple', '.claude', 'docs', 'tests', 'tools', 'archive', '.git', '.gitignore', 'README.md', 'CHANGELOG.md', 'package.json']);
const EXCLUDE_ANY = new Set(['.DS_Store', 'spotify.local.js', 'Thumbs.db']);
const FIREFOX_SKIP = new Set(['offscreen.html', 'offscreen-audio.js']);
const SKIP_BY_TARGET = { firefox: FIREFOX_SKIP, safari: FIREFOX_SKIP };
const FORBIDDEN_FF = /sidePanel\.|setPanelBehavior|tabCapture\.|getMediaStreamId|offscreen\.|createDocument|getContexts/;
const SECRET_ASSIGN =/export\s+const\s+(SPOTIFY_CLIENT_SECRET|SPOTIFY_REFRESH_TOKEN)\s*=\s*(['"`])([^'"`]+)\2/;

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
const version = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version;

// 1. quality gate: the full unit suite (pure modules, catalogues, privacy,
//    security, i18n, photosensitivity) must pass before anything is packaged.
//    End-to-end tests run separately: node tests/run-all.mjs
const unitFiles = fs.readdirSync(path.join(root, 'tests', 'unit')).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join('tests', 'unit', f));
run(process.execPath, ['--test', ...unitFiles]);
const heldout = JSON.parse(execFileSync(process.execPath, ['tests/eval.mjs', 'lib/mood.js'], { cwd: root, env: { ...process.env, GOLD: 'mood-heldout.tsv' } }).toString());
if (parseFloat(heldout.valenceAccuracy) < 90 || heldout.polarityFlips > 1 || heldout.isoUnsafe > 0) {
  throw new Error(`affect engine below release bar: ${JSON.stringify(heldout)}`);
}
console.log('✓ unit suite passed; affect engine', heldout.valenceAccuracy, 'valence (in-house held-out), flips', heldout.polarityFlips);

function copyTree(src, dst, top, skipFiles) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE_ANY.has(e.name) || (top && EXCLUDE_TOP.has(e.name)) || (top && skipFiles.has(e.name))) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d, false, skipFiles);
    else fs.copyFileSync(s, d);
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function zipDir(dir, zipPath) {
  fs.rmSync(zipPath, { force: true });
  try {
    execFileSync('zip', ['-qrX', zipPath, '.'], { cwd: dir });
  } catch {
    execFileSync('tar', ['-a', '-cf', zipPath, '.'], { cwd: dir }); // Windows 10+ bsdtar
  }
}

for (const target of targets) {
  const dist = path.join(here, `dist-${target}`);
  fs.rmSync(dist, { recursive: true, force: true });
  copyTree(root, dist, true, SKIP_BY_TARGET[target] || new Set());
  if (target === 'firefox') {
    fs.copyFileSync(path.join(here, 'firefox/stubs/panel-open.js'), path.join(dist, 'lib/panel-open.js'));
    fs.copyFileSync(path.join(here, 'firefox/stubs/tab-audio-capture.js'), path.join(dist, 'lib/tab-audio-capture.js'));
    fs.copyFileSync(path.join(here, 'firefox/background-firefox-loader.js'), path.join(dist, 'background-firefox-loader.js'));
    run(process.execPath, [path.join(here, 'make-firefox-manifest.mjs'), path.join(dist, 'manifest.json')]);
  }
  if (target === 'safari') {
    fs.copyFileSync(path.join(here, 'safari/stubs/panel-open.js'), path.join(dist, 'lib/panel-open.js'));
    fs.copyFileSync(path.join(here, 'safari/stubs/tab-audio-capture.js'), path.join(dist, 'lib/tab-audio-capture.js'));
    fs.copyFileSync(path.join(here, 'safari/build-flags.js'), path.join(dist, 'lib/build-flags.js'));
    fs.copyFileSync(path.join(here, 'safari/background-safari-loader.js'), path.join(dist, 'background-safari-loader.js'));
    run(process.execPath, [path.join(here, 'make-safari-manifest.mjs'), path.join(dist, 'manifest.json')]);
  }
  // vector sources of the app icon belong to the Xcode project, not to the extension
  fs.rmSync(path.join(dist, 'assets', 'icon-source'), { recursive: true, force: true });
  JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
  for (const f of walk(dist)) {
    // 4. never ship credentials: anyone can unzip an extension. The creator's
    //    Spotify secret and refresh token must stay empty in the package.
    if (/\.(pem|key|p12)$/i.test(f) || path.basename(f) === '.env') throw new Error(`private file in package: ${path.relative(dist, f)}`);
    if (/\.(m?js)$/.test(f) && SECRET_ASSIGN.test(fs.readFileSync(f, 'utf8'))) {
      throw new Error(`credential in package: ${path.relative(dist, f)} (empty SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN before building)`);
    }
    if (/\.(m?js)$/.test(f)) execFileSync(process.execPath, ['--check', f]);
    if ((target === 'firefox' || target === 'safari') && f.endsWith('.js')) {
      const code = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
      if (FORBIDDEN_FF.test(code)) throw new Error(`Chrome-only API in ${target} package: ${path.relative(dist, f)}`);
    }
    if (target === 'safari' && f.endsWith('build-flags.js') && /donations:\s*true/.test(fs.readFileSync(f, 'utf8'))) {
      throw new Error('Safari package must not ask for donations (App Store Guideline 3.2.1)');
    }
  }
  const zip = path.join(here, `auscultrix-${version}-${target}.zip`);
  zipDir(dist, zip);
  console.log(`✓ ${target}: ${path.relative(root, zip)} (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
}
