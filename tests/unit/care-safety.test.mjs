// Comforting media: clinical content-safety gate (lib/care-safety.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib, readText } from '../helpers/env.mjs';

installChromeMock();
const CS = await importLib('lib/care-safety.js');
const B = await importLib('lib/bibliotherapy.js');
const F = await importLib('lib/cinematherapy.js');
const C = await importLib('lib/care-media.js');
const V = await importLib('lib/videogames.js');
const D = await importLib('lib/director-filmographies.js');

const curated = [...B.THERAPEUTIC_BOOKS, ...F.THERAPEUTIC_FILMS, ...C.THERAPEUTIC_SERIES, ...C.THERAPEUTIC_OTHER_MEDIA, ...V.THERAPEUTIC_VIDEOGAMES];
const curatedIds = new Set(curated.map((x) => x.id));

const moods = [];
for (const v of [0.1, 0.3, 0.5, 0.7, 0.9]) {
  for (const e of [0.15, 0.5, 0.85]) {
    moods.push({ valence: v, energy: e, targetValence: Math.min(1, v + 0.2), targetEnergy: e > 0.6 ? e - 0.25 : e });
  }
}
const contexts = [];
for (const uiLocale of ['it', 'en']) for (const musicLanguageMode of ['native', 'world']) for (const level of ['none', 'crisis']) contexts.push({ uiLocale, musicLanguageMode, level });

function everyRecommendation(cb) {
  for (const m of moods) {
    for (const c of contexts) {
      const mood = { ...m, careSafetyLevel: c.level };
      for (let seed = 0; seed < 3; seed++) {
        const o = { count: 3, seed, uiLocale: c.uiLocale, musicLanguageMode: c.musicLanguageMode };
        const set = F.recommendFilmSet(mood, o);
        cb('books', B.recommendBooks(mood, o), mood);
        cb('films', [...set.wikiflix, ...set.tmdb], mood);
        cb('series', C.recommendSeries(mood, o), mood);
        cb('other', C.recommendOtherMedia(mood, o), mood);
        cb('games', V.recommendVideogames(mood, o), mood);
      }
    }
  }
}

test('UT-CARE-01 the review is complete and consistent: every curated title is approved or excluded with a reason', () => {
  for (const id of Object.keys(CS.APPROVED_CARE_ITEMS)) assert.ok(curatedIds.has(id), `approved id not in catalogues: ${id}`);
  for (const [id, reasons] of Object.entries(CS.EXCLUDED_CARE_ITEMS)) {
    assert.ok(curatedIds.has(id), `excluded id not in catalogues: ${id}`);
    assert.ok(!CS.APPROVED_CARE_ITEMS[id], `${id} both approved and excluded`);
    assert.ok(reasons.length && reasons.every((r) => CS.EXCLUSION_CRITERIA.includes(r)), `${id}: ${reasons}`);
  }
  const unreviewed = [...curatedIds].filter((id) => !CS.APPROVED_CARE_ITEMS[id] && !CS.EXCLUDED_CARE_ITEMS[id]);
  assert.deepEqual(unreviewed, [], 'curated titles without a review decision');
});

test('UT-CARE-02 nothing excluded or unreviewed is ever recommended (incl. the 726 director films)', () => {
  const directorIds = new Set([...D.DIRECTOR_FILMS, ...D.AFFINE_FILMS].map((f) => f.id));
  let n = 0;
  everyRecommendation((medium, items) => {
    for (const it of items) {
      n++;
      assert.ok(CS.APPROVED_CARE_ITEMS[it.id], `${medium}: ${it.id} not approved`);
      assert.ok(!directorIds.has(it.id) || CS.APPROVED_CARE_ITEMS[it.id], `${medium}: director film ${it.id}`);
    }
  });
  assert.ok(n > 1000, `only ${n} recommendations checked`);
});

test('UT-CARE-03 suicide and self-harm portrayals are excluded by name (WHO media guidance)', () => {
  for (const id of ['game_static_speaks', 'film_okuribito_koe', 'film_dead_poets', 'tv_aff_burning_bush', 'tv_strappare_lungo_i_bordi', 'book_midnight_library', 'film_groundhog']) {
    assert.ok(CS.EXCLUDED_CARE_ITEMS[id]?.includes('suicide'), id);
    const item = curated.find((x) => x.id === id);
    assert.equal(CS.careItemAllowed(item, { valence: 0.8 }).ok, false, id);
  }
});

test('UT-CARE-04 grief themes are not offered at very low mood or in a crisis; in a crisis only gentle items', () => {
  const up = F.THERAPEUTIC_FILMS.find((f) => f.id === 'film_up');
  assert.equal(CS.careItemAllowed(up, { valence: 0.6, careSafetyLevel: 'none' }).ok, true);
  assert.equal(CS.careItemAllowed(up, { valence: 0.2, careSafetyLevel: 'none' }).reason, 'grief_at_low_mood');
  assert.equal(CS.careItemAllowed(up, { valence: 0.6, careSafetyLevel: 'crisis' }).ok, false);
  // the rule reads the declared valence, not the one blended with the playlist
  assert.equal(CS.careItemAllowed(up, { valence: 0.45, declaredValence: 0.3 }).ok, false);
  everyRecommendation((medium, items, mood) => {
    for (const it of items) {
      if (mood.careSafetyLevel === 'crisis') {
        assert.ok(!CS.APPROVED_CARE_ITEMS[it.id].grief && it.energy <= CS.CRISIS_MAX_ENERGY, `${medium} crisis: ${it.id}`);
      }
      if (mood.valence < CS.GRIEF_MIN_VALENCE) assert.ok(!CS.APPROVED_CARE_ITEMS[it.id].grief, `${medium} low mood: ${it.id}`);
    }
  });
});

test('UT-CARE-05 every medium still offers something for every mood (outside a crisis)', () => {
  const empty = new Set();
  everyRecommendation((medium, items, mood) => {
    if (mood.careSafetyLevel === 'none' && !items.length) empty.add(`${medium} v${mood.valence} e${mood.energy}`);
  });
  assert.deepEqual([...empty], []);
});

test('UT-CARE-06 cards make no promise of effect, and grief has a content note', () => {
  assert.equal(CS.publicCareNote('Utile per ridimensionare l’ansia. Natura grande, poche parole, molto respiro.'), 'Natura grande, poche parole, molto respiro.');
  assert.equal(CS.publicCareNote('Helpful when the world is too loud. Soft, safe affection.'), 'Soft, safe affection.');
  const claim = /\b(ansia|depress|terap|guari|sintom|cura\b|curare|anxiety|depression|therap|heal|symptom|cure)/i;
  for (const id of Object.keys(CS.APPROVED_CARE_ITEMS)) {
    const it = curated.find((x) => x.id === id);
    for (const note of [it.noteIt, it.noteEn]) {
      const shown = CS.publicCareNote(note);
      assert.ok(!claim.test(shown), `${id}: «${shown}»`);
    }
  }
  // coherence: a note describes the work, it does not route through a director («Per i silenzi di Kitano»)
  const detour = /^(Per [^:]*\b(di|del|della) [A-ZÀ-Ý][\wà-ÿ’']+[^:]*:|For [^:]*(-style|’s|'s) [^:]*:)/;
  for (const id of Object.keys(CS.APPROVED_CARE_ITEMS)) {
    const it = curated.find((x) => x.id === id);
    for (const note of [it.noteIt, it.noteEn]) assert.ok(!detour.test(CS.publicCareNote(note)), `${id}: «${note}»`);
  }
  assert.ok(CS.careContentNote(F.THERAPEUTIC_FILMS.find((f) => f.id === 'film_coco'), 'it'));
  assert.equal(CS.careContentNote(F.THERAPEUTIC_FILMS.find((f) => f.id === 'film_totoro'), 'it'), null);
  const panel = readText('sidepanel.js');
  assert.match(panel, /publicCareNote\(note\)/);
  assert.match(panel, /careSafetyLevel: safetyLevelFor\(analysis\)/);
  assert.match(panel, /declaredValence: analysis\?\.valence/);
});
