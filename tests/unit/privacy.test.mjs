// Privacy: what is stored, where, and what «Forget everything» removes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib, readText, listFiles } from '../helpers/env.mjs';

installChromeMock();
const inv = await importLib('lib/data-inventory.js');

test('UT-PRIV-01 persistableMood strips every field that can contain the person\'s own words', () => {
  const m = { valence: 0.2, energy: 0.3, rawInput: 'Mi chiamo Luca, ho litigato con Marta', motivationInfluences: ['litigato', 'Marta'], listenerAgeSignal: 'ho 9 anni', motivationInsight: 'frase generata' };
  const p = inv.persistableMood(m);
  const s = JSON.stringify(p);
  for (const w of ['Luca', 'Marta', 'litigato', '9 anni']) assert.ok(!s.includes(w), w);
  assert.equal(p.valence, 0.2);
  assert.equal(p.motivationInsight, 'frase generata');
  assert.equal(m.rawInput.includes('Luca'), true, 'input object not mutated');
  assert.equal(inv.persistableMood(null), null);
});

test('UT-PRIV-02 erase keeps only non-personal catalogue keys', () => {
  const present = ['userModelV1', 'mood', 'tracks', 'vjPalette', 'vjCoverUrl', 'librarySyncedAt', 'hideDonationPip', 'emergenteCatalogOverridesV1', 'vjUserOptOut', 'uiLanguage'];
  const del = inv.keysToErase(present);
  assert.deepEqual(del.sort(), ['hideDonationPip', 'mood', 'uiLanguage', 'userModelV1', 'vjCoverUrl', 'vjPalette', 'vjUserOptOut'].sort());
});

test('UT-PRIV-03 no code path writes the typed text or the photo to chrome.storage.local', () => {
  const js = ['sidepanel.js', 'background.js', ...listFiles('lib', (f) => f.endsWith('.js'))];
  for (const f of js) {
    const src = readText(f);
    // persistSession must wrap mood with persistableMood
    if (f === 'sidepanel.js') {
      assert.match(src, /mood: persistableMood\(mood\)/);
      assert.ok(!/chrome\.storage\.local\.set\(\{[^}]*MOOD_IMAGE_KEY/.test(src), 'photo written to local');
      assert.ok(!/chrome\.storage\.local\.set\(\{\s*mood\s*[,}]/.test(src), 'raw mood written to local');
    }
    assert.ok(!/rawInput\s*:\s*[^,}]*\)\s*;?\s*\/\/\s*persist/.test(src));
  }
});

test('UT-PRIV-04 every chrome.storage.local key written by the code is inventoried', () => {
  const known = new Set([...inv.NON_PERSONAL_LOCAL_KEYS, ...Object.keys(inv.PERSONAL_LOCAL_KEYS)]);
  // preferences & flags (documented in docs/tecnico, erased with everything else)
  const prefs = ['vjEnabled', 'vjPhotosensitiveSafe', 'vjUserOptOut', 'playbackProviderId', 'musicLanguageMode', 'musicGeoZone', 'musicGeoUserChosen', 'musicCatalogMode', 'careAccessMode', 'hideClinicalDisclaimerPip', 'hideDonationPip', 'uiLanguage', 'lyricsLookupEnabled', 'librarySyncAttemptAt', 'soundscapePrefsV1'];
  for (const k of prefs) known.add(k);
  const files = ['sidepanel.js', 'background.js', ...listFiles('lib', (f) => f.endsWith('.js') && !/corpus|geo-data|youtube-ids/.test(f))];
  const allSrc = files.map((f) => readText(f)).join('\n');
  const resolveConst = (name) => {
    const short = name.split('.').pop();
    const def = allSrc.match(new RegExp(`(?:const|let|var)\\s+${short}\\s*=\\s*'([^']+)'`)) ||
      allSrc.match(new RegExp(`\\b${short}\\s*:\\s*'([^']+)'`));
    return def ? def[1] : name;
  };
  // top-level keys of an object literal (depth-aware, ignores nested objects)
  const topKeys = (body) => {
    const keys = [];
    let depth = 0, token = '';
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if ('{[('.includes(ch)) {
        if (depth === 0 && ch === '[') {
          const end = body.indexOf(']', i);
          const inner = body.slice(i + 1, end);
          if (body.slice(end + 1).trimStart().startsWith(':')) keys.push({ computed: inner.trim() });
          i = end;
          continue;
        }
        depth++;
      } else if ('}])'.includes(ch)) depth--;
      else if (depth === 0 && ch === ':' && /^[A-Za-z_]\w*$/.test(token.trim())) keys.push({ name: token.trim() });
      if (depth === 0 && (ch === ',' || ch === '\n')) token = '';
      else if (depth === 0 && ch !== ':') token += ch;
    }
    return keys;
  };
  const unknown = new Set();
  let scanned = 0;
  for (const f of files) {
    const src = readText(f);
    for (const m of src.matchAll(/chrome\.storage\.local\.set\(\{([\s\S]*?)\}\)\s*(?:;|\.)/g)) {
      for (const k of topKeys(m[1])) {
        scanned++;
        const key = k.computed ? resolveConst(k.computed) : k.name;
        if (!known.has(key)) unknown.add(`${f}: ${key}`);
      }
    }
  }
  assert.ok(scanned >= 30, `only ${scanned} keys scanned: the scanner is not reading the code`);
  assert.deepEqual([...unknown], [], 'storage keys missing from lib/data-inventory.js or the preference list');
});

test('UT-PRIV-05 session-only state: tab ids never in local storage', async () => {
  installChromeMock();
  const s = await importLib('lib/session-state.js');
  await chrome.storage.local.set({ playerTabId: 12, youtubeTabId: 3 });
  await s.migrateLegacyTabIds();
  assert.deepEqual(await chrome.storage.local.get(['playerTabId', 'youtubeTabId']), {});
  await s.setPlayerTabId(42);
  assert.equal(await s.getPlayerTabId(), 42);
  assert.equal(await s.isOwnedPlayerTab(42), true);
  assert.equal(await s.isOwnedPlayerTab(43), false);
  assert.deepEqual(await chrome.storage.local.get(['playerTabId']), {});
  await s.forgetTab(42);
  assert.equal(await s.getPlayerTabId(), null);
  await s.setSessionSafetyLevel('crisis');
  assert.equal(await s.getSessionSafetyLevel(), 'crisis');
  assert.deepEqual(await chrome.storage.local.get(null), {}, 'nothing about the crisis reaches disk');
  await s.clearSessionState();
  assert.equal(await s.getSessionSafetyLevel(), 'none');
});

test('UT-PRIV-06 player-host check accepts YouTube only', async () => {
  const { isPlayerHostUrl } = await importLib('lib/session-state.js');
  for (const u of ['https://www.youtube.com/watch?v=x', 'https://music.youtube.com/', 'https://m.youtube.com/watch']) assert.equal(isPlayerHostUrl(u), true, u);
  for (const u of ['https://mail.google.com/', 'https://youtube.com.evil.example/', 'https://notyoutube.com/', '', null, 'javascript:alert(1)']) assert.equal(isPlayerHostUrl(u), false, String(u));
});

test('UT-PRIV-07 read-aloud uses on-device voices only (a network voice would send the mood reading online)', async () => {
  const { pickLocalVoice, loadVoices } = await importLib('lib/tts-voice.js');
  const google = { name: 'Google italiano', lang: 'it-IT', localService: false };
  const alice = { name: 'Alice', lang: 'it-IT', localService: true };
  const daniel = { name: 'Daniel', lang: 'en-GB', localService: true };
  assert.equal(pickLocalVoice([google, alice], 'it-IT'), alice);
  assert.equal(pickLocalVoice([google, daniel], 'it-IT'), null, 'never a network voice, never another language');
  assert.equal(pickLocalVoice([google], 'it-IT'), null);
  assert.equal(pickLocalVoice([{ lang: 'it_IT', localService: true }], 'it-IT')?.lang, 'it_IT');
  assert.equal(pickLocalVoice([daniel], 'en-US'), daniel);
  for (const bad of [null, undefined, 'x', [null, {}]]) assert.equal(pickLocalVoice(bad, 'it-IT'), null);
  // voices arrive asynchronously in Chrome
  let list = [];
  const listeners = new Set();
  const synth = { getVoices: () => list, addEventListener: (_e, f) => listeners.add(f), removeEventListener: (_e, f) => listeners.delete(f) };
  const pending = loadVoices(synth, 1000);
  list = [alice];
  for (const f of [...listeners]) f();
  assert.deepEqual(await pending, [alice]);
  assert.deepEqual(await loadVoices({ getVoices: () => [] }, 20), []);
  assert.deepEqual(await loadVoices(null), []);
  // the panel no longer falls back to "any voice for the language"
  const panel = readText('sidepanel.js');
  assert.ok(panel.includes('pickLocalVoice('), 'panel uses the on-device voice picker');
  assert.ok(!/voices\.find\(\(v\) => v\.lang\?\.toLowerCase\(\)\.startsWith\(wanted\)\)/.test(panel), 'no fallback to network voices');
});
