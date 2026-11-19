// Safety layer: crisis and substance detection (high recall by design).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installChromeMock, importLib } from '../helpers/env.mjs';

installChromeMock();
const { assessSafety, SUPPORT } = await importLib('lib/safety.js');

const CRISIS = ['voglio morire', 'Non voglio più vivere', "I don't want to live anymore", 'ho pensato di farla finita', 'I want to kill myself', 'mi faccio del male', 'VOGLIO MORIRE', 'vorrei morire stanotte', 'sarebbe meglio se non ci fossi', 'I want to end my life', 'thinking about suicide', 'ho pensato al suicidio'];
const SUBSTANCE = ['stasera voglio drogarmi', 'mi fumo una canna', 'I want to get high', 'voglio sballarmi', 'prendo della cocaina', 'I need some pills'];
const NONE = ['sono triste', 'ho sete di coca cola', 'sono stanco morto', 'I love this song', 'muoio dal ridere', 'mi sono tagliato i capelli', 'oggi è una bella giornata', 'canzone', 'cannella', 'drogheria'];

test('UT-SAFE-01 crisis phrases are recognised (recall = 100 % on the reference list)', () => {
  for (const s of CRISIS) assert.equal(assessSafety(s).level, 'crisis', s);
});
test('UT-SAFE-02 substance phrases are recognised', () => {
  for (const s of SUBSTANCE) assert.equal(assessSafety(s).level, 'substance', s);
});
test('UT-SAFE-03 everyday expressions do not raise an alarm', () => {
  for (const s of NONE) assert.equal(assessSafety(s).level, 'none', s);
});
test('UT-SAFE-04 crisis wins over substance in the same text', () => {
  assert.equal(assessSafety('voglio drogarmi e poi voglio morire').level, 'crisis');
});
test('UT-SAFE-05 non-string and huge inputs never throw', () => {
  for (const x of [null, undefined, 3, {}, 'x'.repeat(200_000)]) assert.ok(['none', 'substance', 'crisis'].includes(assessSafety(x).level));
});
test('UT-SAFE-06 help resources are the verified Italian numbers', () => {
  assert.equal(SUPPORT.telefonoAmico.display, '02 2327 2327');
  assert.equal(SUPPORT.emergency.tel, '112');
  assert.equal(SUPPORT.addictionIT.tel, '800940789');
  assert.match(SUPPORT.iasp.href, /^https:\/\/www\.iasp\.info\//);
});
