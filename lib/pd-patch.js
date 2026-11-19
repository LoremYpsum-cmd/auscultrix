/**
 * Pure Data (vanilla) patch generated from a soundscape state.
 *
 * The patch is a didactic, reduced twin of the Web Audio engine: the same
 * drone (root, fifth, modal third, four harmonics each, spectral tilt), the
 * same one-pole brightness filter, the same «breath» envelope, the soundmark
 * texture and the signals drawn from the same scale. It lets the composition
 * be studied, modified and performed in Pd (Bianchi, Cipriani & Giri, Pure
 * Data: musica elettronica e sound design). Differences from the engine are
 * written in the patch itself: no reverb, no HRTF, signals at a jittered
 * regular rate instead of a Poisson process.
 *
 * Only Pd vanilla objects are used, so the patch opens in any Pd ≥ 0.47.
 */
import { MODES, mapAffectToParams } from './soundscape.js';

/** Same harmonics as the engine (lib/soundscape-audio.js, DRONE_HARMONICS). */
const HARMONICS = [1, 2, 3, 4, 5, 6];

const fmt = (x) => {
  const r = Math.round(x * 1000) / 1000;
  return String(r);
};
/** Pd reserves «,» «;» «$»: escape them in comments. */
const esc = (s) => String(s).replace(/([,;$])/g, ' \\$1').replace(/\s+/g, ' ').trim();

/**
 * @param {{ root: number, valence: number, arousal: number, soundmark?: string,
 *           seed?: number, title?: string, hour?: number }} state
 * @returns {string} contents of a .pd file
 */
export function buildPdPatch(state) {
  const p = mapAffectToParams({ valence: state.valence, arousal: state.arousal }, { hour: state.hour });
  const root = Number(state.root) || 110;
  const mode = MODES[p.mode];
  const soundmark = state.soundmark || 'wind';
  const lines = ['#N canvas 40 60 980 700 12;'];
  let n = 0;
  const conns = [];
  const obj = (x, y, text) => {
    lines.push(`#X obj ${x} ${y} ${text};`);
    return n++;
  };
  const msg = (x, y, text) => {
    lines.push(`#X msg ${x} ${y} ${text};`);
    return n++;
  };
  const text = (x, y, t) => {
    lines.push(`#X text ${x} ${y} ${esc(t)};`);
    return n++;
  };
  const connect = (a, o, b, i) => conns.push(`#X connect ${a} ${o} ${b} ${i};`);
  const dbToGain = (db) => 10 ** (db / 20);

  text(20, 10, `${state.title || 'Auscultrix'} — soundscape twin in Pd vanilla. valence ${fmt(p.valence)} arousal ${fmt(p.arousal)} mode ${p.mode} root ${fmt(root)} Hz`);
  text(20, 34, 'Differences from the browser engine: no reverb, no HRTF, signals at a jittered regular rate (the engine uses a Poisson process). Turn the volume down before DSP on.');

  // DSP on at load
  const lb = obj(20, 70, 'loadbang');
  const dsp = msg(20, 100, '\\; pd dsp 1');
  connect(lb, 0, dsp, 0);

  // master: sum → volume → clip → dac~
  const vol = obj(520, 600, `*~ ${fmt(0.6 * 0.5)}`);
  const clip = obj(520, 630, 'clip~ -0.9 0.9');
  const dac = obj(520, 660, 'dac~');
  connect(vol, 0, clip, 0);
  connect(clip, 0, dac, 0);
  connect(clip, 0, dac, 1);

  // ── keynote: drone ────────────────────────────────────────────────────────
  text(20, 140, `keynote / bordone: 3 voices × 6 harmonics, amplitude ∝ h^-${fmt(p.tilt)}`);
  const lop = obj(20, 440, `lop~ ${fmt(p.brightnessHz)}`);
  const droneLevel = obj(20, 470, `*~ ${fmt(dbToGain(p.droneDb))}`);
  const breathMul = obj(20, 500, '*~');
  connect(lop, 0, droneLevel, 0);
  connect(droneLevel, 0, breathMul, 0);
  connect(breathMul, 0, vol, 0);
  const voices = [
    { ratio: 1, amp: 1 },
    { ratio: 3 / 2, amp: 0.5 },
    { ratio: mode.third, amp: 0.28 },
  ];
  let x = 20;
  for (const v of voices) {
    const norm = HARMONICS.reduce((s, h) => s + h ** -p.tilt, 0);
    for (const h of HARMONICS) {
      const o = obj(x, 170 + (h - 1) * 42, `osc~ ${fmt(root * v.ratio * h)}`);
      const g = obj(x, 190 + (h - 1) * 42, `*~ ${fmt((v.amp * h ** -p.tilt) / norm / 1.8)}`);
      connect(o, 0, g, 0);
      connect(g, 0, lop, 0);
    }
    x += 120;
  }
  // breath: 1 − d + d·sin(2π f t), between −3 dB and 0 dB
  const depth = (1 - dbToGain(-p.breathDepthDb)) / 2;
  text(400, 140, `breath: ${fmt(p.breathHz)} Hz (${fmt(p.breathHz * 60)} per minute)`);
  const lfo = obj(400, 170, `osc~ ${fmt(p.breathHz)}`);
  const lfoD = obj(400, 200, `*~ ${fmt(depth)}`);
  const lfoB = obj(400, 230, `+~ ${fmt(1 - depth)}`);
  connect(lfo, 0, lfoD, 0);
  connect(lfoD, 0, lfoB, 0);
  connect(lfoB, 0, breathMul, 1);

  // ── soundmark: texture ────────────────────────────────────────────────────
  if (soundmark !== 'none') {
    const texGain = dbToGain(p.textureDb) * 2.2;
    text(400, 280, `soundmark: ${soundmark} (filtered noise, after Farnell 2010)`);
    const nz = obj(400, 310, 'noise~');
    const tg = obj(400, 400, `*~ ${fmt(texGain)}`);
    connect(tg, 0, vol, 0);
    if (soundmark === 'wind') {
      const bp = obj(400, 340, 'bp~ 450 1.4');
      connect(nz, 0, bp, 0);
      connect(bp, 0, tg, 0);
    } else if (soundmark === 'sea') {
      const lp = obj(400, 340, 'lop~ 650');
      const env = obj(400, 370, '*~');
      const w = obj(560, 310, `osc~ ${fmt(0.06 + 0.06 * p.textureMotion)}`);
      const wd = obj(560, 340, '*~ 0.45');
      const wb = obj(560, 370, '+~ 0.55');
      connect(nz, 0, lp, 0);
      connect(lp, 0, env, 0);
      connect(w, 0, wd, 0);
      connect(wd, 0, wb, 0);
      connect(wb, 0, env, 1);
      connect(env, 0, tg, 0);
    } else {
      const hp = obj(400, 340, 'hip~ 1200');
      connect(nz, 0, hp, 0);
      connect(hp, 0, tg, 0);
    }
  }

  // ── signals: bells on the scale ───────────────────────────────────────────
  const intervalMs = Math.round(60000 / p.eventsPerMin);
  const jitter = Math.round(intervalMs * 0.8);
  const octave = 2 ** Math.floor(p.registerOct);
  text(700, 140, `signals: every ${intervalMs} ms ± ${Math.round(jitter / 2)} on the ${p.mode} scale`);
  const mOn = obj(700, 170, 'loadbang');
  const metro = obj(700, 200, `metro ${intervalMs}`);
  const rnd = obj(700, 230, 'random 5');
  const tab = obj(700, 260, 'tabread scale');
  const trig = obj(700, 290, 't b f');
  const osc = obj(800, 330, 'osc~');
  const envMsg = msg(700, 330, `0 \\, ${fmt(0.25)} ${Math.round(p.attackS * 1000)} \\, 0 ${Math.round(p.decayS * 1000)} ${Math.round(p.attackS * 1000)}`);
  const vline = obj(700, 360, 'vline~');
  const bell = obj(800, 390, '*~');
  const jr = obj(860, 230, `random ${jitter}`);
  const jb = obj(860, 260, `+ ${intervalMs - Math.round(jitter / 2)}`);
  connect(mOn, 0, metro, 0);
  connect(metro, 0, rnd, 0);
  connect(metro, 0, jr, 0);
  connect(jr, 0, jb, 0);
  connect(jb, 0, metro, 1);
  connect(rnd, 0, tab, 0);
  connect(tab, 0, trig, 0);
  connect(trig, 1, osc, 0);
  connect(trig, 0, envMsg, 0);
  connect(envMsg, 0, vline, 0);
  connect(osc, 0, bell, 0);
  connect(vline, 0, bell, 1);
  connect(bell, 0, vol, 0);

  // scale table (graph-on-parent array)
  const values = mode.ratios.map((r) => fmt(root * r * octave)).join(' ');
  lines.push('#N canvas 0 50 450 250 (subpatch) 0;');
  lines.push('#X array scale 5 float 3;');
  lines.push(`#A 0 ${values};`);
  lines.push(`#X coords 0 ${fmt(root * octave * 2)} 5 0 200 120 1 0 0;`);
  lines.push('#X restore 700 440 graph;');
  n++;

  return `${[...lines, ...conns].join('\n')}\n`;
}

/** Light structural check (used by the tests): every connection points at an existing object. */
export function checkPdPatch(src) {
  const rows = src.split('\n').filter(Boolean);
  let depth = 0, count = 0;
  const conns = [];
  for (const r of rows) {
    if (r.startsWith('#N canvas')) {
      depth++;
      continue;
    }
    if (r.startsWith('#X restore')) {
      depth--;
      if (depth === 1) count++;
      continue;
    }
    if (depth !== 1) continue;
    if (/^#X (obj|msg|text|floatatom|symbolatom) /.test(r)) count++;
    const m = r.match(/^#X connect (\d+) (\d+) (\d+) (\d+);$/);
    if (m) conns.push(m.slice(1).map(Number));
    if (!r.endsWith(';')) return { ok: false, reason: `unterminated: ${r}` };
  }
  const bad = conns.filter(([a, , b]) => a >= count || b >= count);
  return { ok: bad.length === 0 && depth === 1, objects: count, connections: conns.length, bad };
}
