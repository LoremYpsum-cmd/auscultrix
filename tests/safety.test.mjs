globalThis.chrome = { i18n: { getMessage: (k) => k, getUILanguage: () => 'it' }, runtime: {} };
const { assessSafety } = await import('../lib/safety.js');
const cases = [
  ['voglio morire', 'crisis'], ['Non voglio più vivere', 'crisis'], ["I don't want to live anymore", 'crisis'],
  ['ho pensato di farla finita', 'crisis'], ['I want to kill myself', 'crisis'], ['mi faccio del male', 'crisis'],
  ['stasera voglio drogarmi', 'substance'], ['mi fumo una canna', 'substance'], ['I want to get high', 'substance'],
  ['sono triste', 'none'], ['ho sete di coca cola', 'none'], ['sono stanco morto', 'none'], ['I love this song', 'none'],
  ['muoio dal ridere', 'none'], ['mi sono tagliato i capelli', 'none'],
];
let fail = 0;
for (const [s, want] of cases) {
  const got = assessSafety(s).level;
  if (got !== want) { fail++; console.log('FAIL', s, 'want', want, 'got', got); }
}
console.log(JSON.stringify({ safetyCases: cases.length, failures: fail }));
process.exit(fail ? 1 : 0);
