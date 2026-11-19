/**
 * WAV (RIFF, PCM 16-bit) encoder for the soundscape export.
 * Quantisation uses TPDF dither (±1 LSB triangular), the standard way to turn
 * quantisation error into a constant, signal-independent noise floor.
 */
import { makeRng } from './soundscape.js';

/**
 * @param {Float32Array[]} channels 1 or 2 channels of equal length, range [−1, 1]
 * @param {number} sampleRate
 * @param {{ seed?: number, dither?: boolean }} [opts]
 * @returns {ArrayBuffer}
 */
export function encodeWav16(channels, sampleRate, opts = {}) {
  const nch = channels.length;
  if (nch < 1 || nch > 2) throw new Error('1 or 2 channels');
  const n = channels[0].length;
  const dataBytes = n * nch * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const str = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * nch * 2, true);
  v.setUint16(32, nch * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataBytes, true);
  const rng = makeRng(opts.seed ?? 12345);
  const dither = opts.dither !== false;
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      let s = channels[c][i] * 32767;
      if (dither) s += rng() - rng(); // TPDF, ±1 LSB
      s = Math.max(-32768, Math.min(32767, Math.round(s)));
      v.setInt16(o, s, true);
      o += 2;
    }
  }
  return buf;
}

/** Parse the header of a 16-bit PCM WAV (used by the tests). */
export function readWavHeader(buf) {
  const v = new DataView(buf);
  const str = (o, l) => String.fromCharCode(...Array.from({ length: l }, (_, i) => v.getUint8(o + i)));
  return {
    riff: str(0, 4),
    wave: str(8, 4),
    format: v.getUint16(20, true),
    channels: v.getUint16(22, true),
    sampleRate: v.getUint32(24, true),
    byteRate: v.getUint32(28, true),
    bits: v.getUint16(34, true),
    dataBytes: v.getUint32(40, true),
  };
}
