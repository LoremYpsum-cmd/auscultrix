/**
 * Audio measurements used to verify the soundscape on its own output
 * (tests/acoustic/) — pure functions on Float32Array channels, no Web Audio.
 *
 *  - sample peak (dBFS) and RMS (dBFS);
 *  - integrated loudness, ITU-R BS.1770-4 (K-weighting, 400 ms blocks with
 *    75 % overlap, absolute gate −70 LUFS, relative gate −10 LU);
 *  - spectral centroid (Hann-windowed FFT, magnitude-weighted mean frequency);
 *  - onset rate: half-wave-rectified spectral flux with median-adaptive
 *    threshold and peak picking (Bello et al., 2005).
 */

const EPS = 1e-12;
export const toDb = (x) => 20 * Math.log10(Math.max(EPS, x));

export function peakDb(channels) {
  let p = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]));
  return toDb(p);
}

export function rmsDb(channels) {
  let s = 0, n = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) s += ch[i] * ch[i];
    n += ch.length;
  }
  return toDb(Math.sqrt(s / Math.max(1, n)));
}

/** DC offset (mean) of each channel. */
export function dcOffset(channels) {
  return channels.map((ch) => {
    let s = 0;
    for (let i = 0; i < ch.length; i++) s += ch[i];
    return s / Math.max(1, ch.length);
  });
}

// ─── ITU-R BS.1770-4 ───────────────────────────────────────────────────────
/** K-weighting biquads. Exact published coefficients at 48 kHz; RBJ design otherwise. */
export function kWeightingCoefficients(rate) {
  if (rate === 48000) {
    return [
      { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] },
      { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] },
    ];
  }
  // Stage 1: high shelf +4 dB at 1681.97 Hz (Q 0.7072); stage 2: high-pass 38.14 Hz (Q 0.5003)
  const shelf = (() => {
    const G = 3.99984385397, fc = 1681.97445095, Q = 0.7071752369554193;
    const K = Math.tan((Math.PI * fc) / rate);
    const Vh = 10 ** (G / 20), Vb = Vh ** 0.499666774155;
    const a0 = 1 + K / Q + K * K;
    return {
      b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
      a: [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0],
    };
  })();
  const hp = (() => {
    const fc = 38.13547087613982, Q = 0.5003270373253953;
    const K = Math.tan((Math.PI * fc) / rate);
    const a0 = 1 + K / Q + K * K;
    return { b: [1, -2, 1], a: [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  })();
  return [shelf, hp];
}

function biquad(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

/**
 * Integrated loudness (LUFS) of 1 or 2 channels (L, R; weights 1).
 * @returns {number} LUFS, or −Infinity for silence
 */
export function integratedLoudness(channels, rate) {
  const [s1, s2] = kWeightingCoefficients(rate);
  const filtered = channels.map((ch) => biquad(biquad(ch, s1), s2));
  const block = Math.round(0.4 * rate);
  const hop = Math.round(0.1 * rate);
  const n = filtered[0].length;
  const z = [];
  for (let start = 0; start + block <= n; start += hop) {
    let sum = 0;
    for (const ch of filtered) {
      let s = 0;
      for (let i = start; i < start + block; i++) s += ch[i] * ch[i];
      sum += s / block;
    }
    z.push(sum);
  }
  const lk = (ms) => -0.691 + 10 * Math.log10(Math.max(EPS, ms));
  const abs = z.filter((m) => lk(m) > -70);
  if (!abs.length) return -Infinity;
  const relGate = lk(abs.reduce((s, m) => s + m, 0) / abs.length) - 10;
  const rel = abs.filter((m) => lk(m) > relGate);
  return lk(rel.reduce((s, m) => s + m, 0) / rel.length);
}

// ─── spectral analysis ─────────────────────────────────────────────────────
/** In-place iterative radix-2 FFT. re, im: Float64Array of length 2^k. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

function mono(channels) {
  const n = channels[0].length;
  const m = new Float64Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) m[i] += ch[i] / channels.length;
  return m;
}

/** Magnitude spectra of Hann-windowed frames. */
export function stft(x, size = 2048, hop = 1024) {
  const win = new Float64Array(size);
  for (let i = 0; i < size; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  const frames = [];
  for (let s = 0; s + size <= x.length; s += hop) {
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = x[s + i] * win[i];
    fft(re, im);
    const mag = new Float64Array(size / 2);
    for (let k = 0; k < size / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    frames.push(mag);
  }
  return frames;
}

/** Spectral centroid (Hz), averaged over frames weighted by their energy. */
export function spectralCentroid(channels, rate, size = 4096) {
  const frames = stft(mono(channels), size, size / 2);
  let num = 0, den = 0;
  for (const mag of frames) {
    for (let k = 1; k < mag.length; k++) {
      const f = (k * rate) / size;
      num += f * mag[k];
      den += mag[k];
    }
  }
  return den > 0 ? num / den : 0;
}

/**
 * Onsets per minute: spectral flux of log-compressed magnitudes (bins above
 * minHz), half-wave rectified; a frame is an onset if it is a local maximum,
 * exceeds k × the local median AND rel × the largest flux of the excerpt
 * (Bello et al., 2005; log compression after Böck & Widmer, 2013).
 * @returns {{ perMin: number, times: number[] }}
 */
export function onsetRate(channels, rate, { size = 1024, hop = 512, minHz = 300, k = 2, rel = 0.2, minGapS = 0.25, gamma = 100 } = {}) {
  const frames = stft(mono(channels), size, hop).map((mag) => mag.map((m) => Math.log1p(gamma * m)));
  const k0 = Math.ceil((minHz * size) / rate);
  const flux = frames.map((mag, i) => {
    if (i === 0) return 0;
    let s = 0;
    const prev = frames[i - 1];
    for (let b = k0; b < mag.length; b++) s += Math.max(0, mag[b] - prev[b]);
    return s;
  });
  const maxFlux = flux.reduce((m, v) => Math.max(m, v), 0);
  const times = [];
  const W = 10;
  let last = -Infinity;
  for (let i = 1; i < flux.length - 1; i++) {
    let isMax = true;
    for (let j = Math.max(0, i - 3); j <= Math.min(flux.length - 1, i + 3); j++) if (flux[j] > flux[i]) isMax = false;
    if (!isMax) continue;
    const win = flux.slice(Math.max(0, i - W), Math.min(flux.length, i + W + 1)).sort((x, y) => x - y);
    const med = win[Math.floor(win.length / 2)];
    if (flux[i] < k * med || flux[i] < rel * maxFlux || flux[i] <= 1e-9) continue;
    const t = (i * hop) / rate;
    if (t - last < minGapS) continue;
    times.push(t);
    last = t;
  }
  const minutes = channels[0].length / rate / 60;
  return { perMin: times.length / Math.max(minutes, 1e-9), times };
}

/** Pearson correlation. */
export function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** Spearman rank correlation (average ranks for ties). */
export function spearman(x, y) {
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  return pearson(rank(x), rank(y));
}
