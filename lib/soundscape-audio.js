/**
 * Auscultrix — generative soundscape, audio part (Web Audio API).
 *
 * Plays a score built by lib/soundscape.js. The same code runs in a live
 * AudioContext (the panel) and in an OfflineAudioContext (WAV export and the
 * acoustic verification in tests/acoustic/), so what is measured is exactly
 * what is heard.
 *
 * Signal flow
 *
 *   drone (3 voices × 6 harmonics, additive) ─ low-pass ─ level ─ breath ┐
 *   texture (pink noise → filters by soundmark; rain drops)  ─ level ────┤
 *   signals (3-partial bells → HRTF/equal-power panner, 1/r) ────────────┤
 *                                │ dry                       │ send      │
 *                                └───────────┬───────────────┴─ reverb ──┘
 *                                       volume → fade («crénau») → limiter → out
 *
 * The reverb is a convolution with a synthetic impulse response whose energy
 * decays by 60 dB in RT60 seconds (definition of ISO 3382-1), with a one-pole
 * low-pass that darkens the tail over time (air and wall absorption).
 * Direct-to-reverberant ratio falls with the distance of each signal, the
 * main distance cue in rooms (Blesser & Salter 2007).
 */
import { MODES, SAFETY, SPACES, controlAtTime, makeRng } from './soundscape.js';

const dbToGain = (db) => 10 ** (db / 20);
/** Fixed make-up gain: places the default volume near −24 LUFS (measured, tests/acoustic). */
export const OUTPUT_TRIM = 2;
export const DRONE_HARMONICS = [1, 2, 3, 4, 5, 6];
const LN_1000 = Math.log(1000); // amplitude −60 dB

/** Synthetic stereo impulse response (exponential decay, darkening tail). */
export function makeImpulseResponse(ctx, rt60, preDelayS, rng) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.round((preDelayS + rt60 * 1.1) * rate));
  const buf = ctx.createBuffer(2, len, rate);
  const pre = Math.round(preDelayS * rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / rate;
      const env = Math.exp((-LN_1000 * tt) / rt60);
      const k = 0.65 - 0.5 * Math.min(1, tt / rt60); // tail gets darker
      y += k * ((rng() * 2 - 1) - y);
      d[i] = y * env;
    }
  }
  return buf;
}

/** Seeded pink noise (Paul Kellet's refined filter), mono, looped by the source. */
export function makePinkNoise(ctx, seconds, rng) {
  const len = Math.round(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  // short cross-fade at the loop point: no click when the buffer wraps
  const xf = Math.min(len >> 3, Math.round(0.05 * ctx.sampleRate));
  for (let i = 0; i < xf; i++) {
    const g = i / xf;
    d[i] = d[i] * g + d[len - xf + i] * (1 - g);
  }
  return buf;
}

/** One rain drop: a 30 ms falling chirp with exponential decay (after Farnell 2010). */
export function makeDropBuffer(ctx) {
  const rate = ctx.sampleRate;
  const len = Math.round(0.03 * rate);
  const buf = ctx.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / rate;
    const f = 1800 + 1400 * Math.exp(-tt / 0.006);
    phase += (2 * Math.PI * f) / rate;
    const attack = Math.min(1, tt / 0.0015);
    d[i] = Math.sin(phase) * attack * Math.exp(-tt / 0.007);
  }
  return buf;
}

const BELL_PARTIALS = [
  { ratio: 1, amp: 1, decay: 1 },
  { ratio: 2.32, amp: 0.32, decay: 0.55 },
  { ratio: 4.25, amp: 0.12, decay: 0.3 },
];

export class SoundscapePlayer {
  /**
   * @param {BaseAudioContext} ctx
   * @param {object} score from buildScore
   * @param {{ volume?: number, destination?: AudioNode, hrtf?: boolean }} [opts]
   */
  constructor(ctx, score, opts = {}) {
    this.ctx = ctx;
    this.score = score;
    this.offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    this.hrtf = opts.hrtf ?? !this.offline;
    this.volume = Math.min(1, Math.max(0, opts.volume ?? 0.6));
    this.destination = opts.destination || ctx.destination;
    // stems: render one layer alone (measurement, or export for mixing)
    this.stems = { drone: true, texture: true, signals: true, ...(opts.stems || {}) };
    this.rng = makeRng((score.seed ^ 0xa5a5a5a5) >>> 0);
    this.sources = [];
    this.timer = null;
    this.t0 = 0;
    this.nextEvent = 0;
    this.nextDropT = 0;
    this.stopped = false;
    this.build();
  }

  build() {
    const { ctx, score } = this;
    const space = SPACES[score.space] || SPACES.room;

    // master chain
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = SAFETY.limiterThresholdDb;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;
    this.fade = ctx.createGain();
    this.fade.gain.value = 0;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume * SAFETY.maxMasterGain * OUTPUT_TRIM;
    this.master.connect(this.fade).connect(this.limiter).connect(this.destination);

    // reverb send
    this.dry = ctx.createGain();
    this.dry.connect(this.master);
    this.wet = ctx.createGain();
    this.wet.gain.value = space.wet;
    if (space.rt60 > 0) {
      this.convolver = ctx.createConvolver();
      this.convolver.normalize = true;
      this.convolver.buffer = makeImpulseResponse(ctx, space.rt60, space.preDelayS, this.rng);
      this.wet.connect(this.convolver).connect(this.master);
    }

    // signals: their own buses, through the same brightness (low-pass, ×2.5)
    this.signalsTone = ctx.createBiquadFilter();
    this.signalsTone.type = 'lowpass';
    this.signalsTone.Q.value = 0.6;
    this.signalsTone.frequency.value = Math.max(800, score.controls[0].brightnessHz * 2.5);
    this.signalsStem = ctx.createGain();
    this.signalsStem.gain.value = this.stems.signals ? 1 : 0;
    this.signalsDry = ctx.createGain();
    this.signalsWet = ctx.createGain();
    // dry: panner → tone → stem → dry bus; send: panner → stem → reverb
    this.signalsDry.connect(this.signalsTone).connect(this.signalsStem).connect(this.dry);
    this.signalsWetStem = ctx.createGain();
    this.signalsWetStem.gain.value = this.stems.signals ? 1 : 0;
    this.signalsWet.connect(this.signalsWetStem).connect(this.wet);

    this.buildDrone();
    this.buildTexture();
    this.dropBuffer = score.soundmark === 'rain' ? makeDropBuffer(ctx) : null;
  }

  buildDrone() {
    const { ctx, score } = this;
    const c0 = score.controls[0];
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.Q.value = 0.5;
    this.droneFilter.frequency.value = c0.brightnessHz;
    this.droneLevel = ctx.createGain();
    this.droneLevel.gain.value = dbToGain(c0.droneDb);
    // «breath»: gain oscillates between 10^(−depth/20) and 1
    const depth = (1 - dbToGain(-c0.breathDepthDb)) / 2;
    this.breath = ctx.createGain();
    this.breath.gain.value = 1 - depth;
    this.breathLfo = ctx.createOscillator();
    this.breathLfo.frequency.value = c0.breathHz;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth;
    this.breathLfo.connect(lfoDepth).connect(this.breath.gain);
    this.droneFilter.connect(this.droneLevel).connect(this.breath);
    const droneStem = ctx.createGain();
    droneStem.gain.value = this.stems.drone ? 1 : 0;
    this.breath.connect(droneStem);
    droneStem.connect(this.dry);
    const droneSend = ctx.createGain();
    droneSend.gain.value = 0.6;
    droneStem.connect(droneSend).connect(this.wet);

    const third = MODES[c0.mode].third;
    this.voices = [
      { ratio: 1, amp: 1 },
      { ratio: 3 / 2, amp: 0.5 },
      { ratio: third, amp: 0.28, modal: true },
    ].map((v) => {
      const harmonics = DRONE_HARMONICS.map((h) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = score.root * v.ratio * h;
        // slow beating on the fundamental: a second oscillator 3 cents up
        osc.detune.value = h === 1 ? -1.5 : 0;
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g).connect(this.droneFilter);
        this.sources.push(osc);
        let twin = null;
        if (h === 1) {
          twin = ctx.createOscillator();
          twin.frequency.value = score.root * v.ratio;
          twin.detune.value = 1.5;
          twin.connect(g);
          this.sources.push(twin);
        }
        return { h, osc, twin, gain: g };
      });
      return { ...v, harmonics };
    });
    this.sources.push(this.breathLfo);
  }

  buildTexture() {
    const { ctx, score } = this;
    this.textureLevel = ctx.createGain();
    this.textureLevel.gain.value = 0;
    this.textureEnv = ctx.createGain();
    this.textureEnv.gain.value = 1;
    this.textureEnv.connect(this.textureLevel);
    const texStem = ctx.createGain();
    texStem.gain.value = this.stems.texture ? 1 : 0;
    this.textureLevel.connect(texStem);
    texStem.connect(this.dry);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    texStem.connect(send).connect(this.wet);
    if (score.soundmark === 'none') return;

    const noise = ctx.createBufferSource();
    noise.buffer = makePinkNoise(ctx, 9, this.rng);
    noise.loop = true;
    this.sources.push(noise);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = SAFETY.minFreqHz * 1.5;
    noise.connect(hp);

    if (score.soundmark === 'wind') {
      this.windBand = ctx.createBiquadFilter();
      this.windBand.type = 'bandpass';
      this.windBand.Q.value = 1.4;
      this.windBand.frequency.value = 450;
      hp.connect(this.windBand).connect(this.textureEnv);
    } else if (score.soundmark === 'sea') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650;
      hp.connect(lp).connect(this.textureEnv);
      this.textureEnv.gain.value = 0.55;
      this.waveLfo = ctx.createOscillator();
      this.waveLfo.frequency.value = 0.08;
      const wd = ctx.createGain();
      wd.gain.value = 0.45;
      this.waveLfo.connect(wd).connect(this.textureEnv.gain);
      this.sources.push(this.waveLfo);
    } else if (score.soundmark === 'rain') {
      const bp = ctx.createBiquadFilter();
      bp.type = 'highpass';
      bp.frequency.value = 1200;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      const hiss = ctx.createGain();
      hiss.gain.value = 0.5;
      hp.connect(bp).connect(lp).connect(hiss).connect(this.textureEnv);
      this.dropBus = ctx.createGain();
      this.dropBus.gain.value = 0.5;
      this.dropBus.connect(this.textureLevel);
    }
  }

  /** Apply every control point of the score as AudioParam automation. */
  scheduleControls(t0) {
    const { score } = this;
    const tc = 3; // time constant (s): parameters glide («métabole»)
    const fadeIn = score.fadeInS;
    let prevMode = score.controls[0].mode;
    for (const c of score.controls) {
      const at = t0 + c.t;
      this.droneFilter.frequency.setTargetAtTime(c.brightnessHz, at, tc);
      this.signalsTone.frequency.setTargetAtTime(Math.max(800, c.brightnessHz * 2.5), at, tc);
      this.droneLevel.gain.setTargetAtTime(dbToGain(c.droneDb), at, tc);
      this.breathLfo.frequency.setTargetAtTime(c.breathHz, at, tc);
      const texLevel = this.score.soundmark === 'none' ? 0 : dbToGain(c.textureDb) * 2.2;
      this.textureLevel.gain.setTargetAtTime(texLevel, at, tc);
      for (const v of this.voices) {
        const norm = v.harmonics.reduce((s, x) => s + x.h ** -c.tilt, 0);
        for (const x of v.harmonics) {
          x.gain.gain.setTargetAtTime((v.amp * x.h ** -c.tilt) / norm / 1.8, at, tc);
        }
      }
      if (c.mode !== prevMode) {
        const modal = this.voices.find((v) => v.modal);
        for (const x of modal.harmonics) {
          const f = score.root * MODES[c.mode].third * x.h;
          x.osc.frequency.setTargetAtTime(f, at, 2);
          x.twin?.frequency.setTargetAtTime(f, at, 2);
        }
        prevMode = c.mode;
      }
      if (this.windBand) {
        // random walk of the gusts, faster and wider with arousal
        const centre = 300 + (250 + 450 * c.textureMotion) * this.rng();
        this.windBand.frequency.setTargetAtTime(centre, at, 2.5 / c.textureMotion);
        this.textureEnv.gain.setTargetAtTime(0.55 + 0.45 * this.rng(), at, 2.5 / c.textureMotion);
      }
      if (this.waveLfo) {
        this.waveLfo.frequency.setTargetAtTime(Math.min(SAFETY.maxLfoHz, 0.06 + 0.06 * c.textureMotion), at, tc);
      }
    }
    // «crénau»: linear fade-in, and fade-out at the end of a timed score
    this.fade.gain.setValueAtTime(0, t0);
    this.fade.gain.linearRampToValueAtTime(1, t0 + fadeIn);
    if (score.fadeOutS > 0) {
      this.fade.gain.setValueAtTime(1, t0 + score.durationS - score.fadeOutS);
      this.fade.gain.linearRampToValueAtTime(0, t0 + score.durationS);
    }
  }

  playEvent(e, t0) {
    const { ctx } = this;
    const at = t0 + e.t;
    const panner = this.makePanner(e.angleDeg, e.radiusM);
    const env = ctx.createGain();
    env.connect(panner);
    panner.connect(this.signalsDry);
    // farther signals: relatively more reverb (direct-to-reverberant ratio)
    const send = ctx.createGain();
    send.gain.value = Math.min(1, 0.25 + e.radiusM / 4);
    panner.connect(send).connect(this.signalsWet);
    const end = at + e.attackS + e.decayS * 1.2;
    for (const p of BELL_PARTIALS) {
      const f = e.freq * p.ratio;
      if (f > SAFETY.maxFreqHz) continue;
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(e.gain * p.amp, at + e.attackS);
      g.gain.setTargetAtTime(0, at + e.attackS, (e.decayS * p.decay) / 4);
      osc.connect(g).connect(env);
      osc.start(at);
      osc.stop(end);
    }
  }

  makePanner(angleDeg, radiusM) {
    const { ctx } = this;
    const th = (angleDeg * Math.PI) / 180;
    const p = ctx.createPanner();
    p.panningModel = this.hrtf ? 'HRTF' : 'equalpower';
    p.distanceModel = 'inverse'; // gain = ref / (ref + rolloff·(r − ref)) = 1/r
    p.refDistance = 1;
    p.rolloffFactor = 1;
    const x = radiusM * Math.sin(th);
    const z = -radiusM * Math.cos(th);
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = 0;
      p.positionZ.value = z;
    } else {
      p.setPosition(x, 0, z);
    }
    return p;
  }

  playDrop(at, motion) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.dropBuffer;
    src.playbackRate.value = 0.7 + 0.6 * this.rng();
    const g = ctx.createGain();
    g.gain.value = 0.05 + 0.25 * this.rng() * motion;
    const pan = ctx.createStereoPanner();
    pan.pan.value = this.rng() * 1.6 - 0.8;
    src.connect(g).connect(pan).connect(this.dropBus);
    src.start(at);
  }

  /** Schedule events (and rain drops) whose time falls in [from, to). */
  scheduleWindow(from, to) {
    const ev = this.score.events;
    while (this.nextEvent < ev.length && ev[this.nextEvent].t < to) {
      if (ev[this.nextEvent].t >= from - 0.05) this.playEvent(ev[this.nextEvent], this.t0);
      this.nextEvent++;
    }
    if (this.dropBus) {
      const end = Math.min(to, this.score.durationS);
      while (this.nextDropT < end) {
        const c = controlAtTime(this.score, this.nextDropT);
        const rate = 4 + 14 * c.textureMotion; // drops per second
        this.playDrop(this.t0 + this.nextDropT, c.textureMotion);
        this.nextDropT += -Math.log(1 - this.rng()) / rate;
      }
    }
  }

  /** @param {number} [when] context time */
  start(when) {
    const { ctx } = this;
    this.t0 = when ?? ctx.currentTime + 0.05;
    this.scheduleControls(this.t0);
    for (const s of this.sources) s.start(this.t0);
    if (this.offline) {
      this.scheduleWindow(0, this.score.durationS);
    } else {
      // look-ahead scheduler: the timer may be late, the audio clock is not
      const tick = () => {
        if (this.stopped) return;
        const now = ctx.currentTime - this.t0;
        this.scheduleWindow(now, now + 1.2);
        if (now > this.score.durationS + 0.5) this.dispose();
      };
      tick();
      this.timer = setInterval(tick, 250);
    }
    return this.t0;
  }

  /** Seconds since the start (live context). */
  elapsed() {
    return Math.max(0, this.ctx.currentTime - this.t0);
  }

  /** Current control point (phase, mode, valence, arousal). */
  current() {
    return controlAtTime(this.score, this.elapsed());
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, Number(v) || 0));
    this.master.gain.setTargetAtTime(this.volume * SAFETY.maxMasterGain, this.ctx.currentTime, 0.08);
  }

  /** Fade out (never shorter than SAFETY.minFadeOutS) and release everything. */
  stop(fadeS = SAFETY.minFadeOutS) {
    if (this.stopped) return Promise.resolve();
    const f = Math.max(SAFETY.minFadeOutS, fadeS);
    const now = this.ctx.currentTime;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + f);
    this.stopped = true;
    clearInterval(this.timer);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.dispose();
        resolve();
      }, f * 1000 + 100);
    });
  }

  dispose() {
    this.stopped = true;
    clearInterval(this.timer);
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    try {
      this.limiter.disconnect();
    } catch {
      // ignore
    }
  }
}

/**
 * Render a score offline. Returns the AudioBuffer (stereo).
 * @param {object} score
 * @param {{ sampleRate?: number, volume?: number, hrtf?: boolean }} [opts]
 */
export async function renderScoreOffline(score, opts = {}) {
  const rate = opts.sampleRate || 44100;
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const ctx = new Offline(2, Math.ceil(score.durationS * rate), rate);
  const player = new SoundscapePlayer(ctx, score, { volume: opts.volume ?? 0.6, hrtf: opts.hrtf ?? false, stems: opts.stems });
  player.start(0);
  return ctx.startRendering();
}
