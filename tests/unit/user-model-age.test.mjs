// Local user model (minimised, capped, erasable) and age detection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib } from '../helpers/env.mjs';

installChromeMock();
const um = await importLib('lib/user-model.js');
const { detectListenerAge } = await importLib('lib/listener-age.js');

const mood = (v, e) => ({ valence: v, energy: e, targetEnergy: e, targetValence: v, anxiety: 0.2, sadness: 0.2, happiness: 0.3, rawInput: 'testo privato' });

test('UT-UM-01 concurrent writes are not lost (queue)', async () => {
  installChromeMock();
  await Promise.all(Array.from({ length: 10 }, (_, i) => um.recordMoodEntry(mood(0.1 * i, 0.5))));
  const m = await um.loadUserModel();
  assert.equal(m.entries.length, 10);
});

test('UT-UM-02 only numbers and labels are stored; history capped at 60', async () => {
  installChromeMock();
  for (let i = 0; i < 70; i++) await um.recordMoodEntry(mood(0.5, 0.5), { activity: 'book' });
  const m = await um.loadUserModel();
  assert.equal(m.entries.length, 60);
  const s = JSON.stringify(m);
  assert.ok(!s.includes('testo privato'));
  for (const e of m.entries) for (const v of Object.values(e)) assert.ok(typeof v === 'number' || typeof v === 'string' || v === null);
});

test('UT-UM-03 personalisation prior moves the declared state by at most 0.08', async () => {
  installChromeMock();
  for (let i = 0; i < 60; i++) await um.recordMoodEntry(mood(1, 1));
  const adj = await um.applyUserPrior({ valence: 0, energy: 0 });
  assert.ok(adj.valence <= 0.08 + 1e-9 && adj.energy <= 0.08 + 1e-9, JSON.stringify(adj));
});

test('UT-UM-04 erase waits for pending writes and leaves nothing', async () => {
  installChromeMock();
  um.recordMoodEntry(mood(0.3, 0.3));
  await um.clearUserModel();
  const m = await um.loadUserModel();
  assert.equal(m.entries.length, 0);
});

test('UT-AGE-01 children are recognised (IT/EN), adults talking about years are not', () => {
  const kids = ['ho 5 anni', 'I am 7 years old', 'sono una bambina di 8 anni', 'mio figlio ha 4 anni', "I'm 9"];
  const adults = ['ho 5 anni di esperienza', 'ho due anni fa smesso', "I'm 10 minutes late", 'i am 30 hours awake', 'ho 20 anni', 'I am 45', 'ho 3 anni di contratto'];
  for (const s of kids) assert.equal(detectListenerAge(s).kidsMode, true, s);
  for (const s of adults) assert.equal(detectListenerAge(s).kidsMode, false, s);
});
