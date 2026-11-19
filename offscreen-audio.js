/**
 * Offscreen document — tab audio capture + Web Audio AnalyserNode.
 * Relays smoothed bass/mid/treble/energy to the service worker (photosensitive-safe).
 */

let audioCtx = null;
let analyser = null;
let source = null;
let stream = null;
let rafId = 0;
let lastPost = 0;

/** EMA state for smooth, non-strobe motion */
const ema = { bass: 0, mid: 0, treble: 0, energy: 0 };
const EMA_ALPHA = 0.12;

function stop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  try {
    source?.disconnect();
  } catch {
    // ignore
  }
  try {
    analyser?.disconnect();
  } catch {
    // ignore
  }
  try {
    stream?.getTracks()?.forEach((t) => t.stop());
  } catch {
    // ignore
  }
  try {
    audioCtx?.close();
  } catch {
    // ignore
  }
  source = null;
  analyser = null;
  stream = null;
  audioCtx = null;
}

function bandMean(data, from, to) {
  let sum = 0;
  let n = 0;
  const end = Math.min(to, data.length);
  for (let i = from; i < end; i++) {
    sum += data[i];
    n++;
  }
  return n ? sum / n / 255 : 0;
}

function tick() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const bassRaw = bandMean(data, 1, 6);
  const midRaw = bandMean(data, 6, 24);
  const trebleRaw = bandMean(data, 24, 64);
  const energyRaw = bandMean(data, 1, 48);

  ema.bass += (bassRaw - ema.bass) * EMA_ALPHA;
  ema.mid += (midRaw - ema.mid) * EMA_ALPHA;
  ema.treble += (trebleRaw - ema.treble) * EMA_ALPHA;
  ema.energy += (energyRaw - ema.energy) * EMA_ALPHA;

  const now = performance.now();
  // ~3 Hz updates — matches VJ paint FPS (lofi / photosensitive-safe)
  if (now - lastPost > 333) {
    lastPost = now;
    chrome.runtime
      .sendMessage({
        type: 'VJ_AUDIO_FRAME',
        bass: ema.bass,
        mid: ema.mid,
        treble: ema.treble,
        energy: ema.energy,
      })
      .catch(() => {});
  }

  rafId = requestAnimationFrame(tick);
}

async function start(streamId) {
  stop();
  if (!streamId) {
    throw new Error('Missing tab media stream id');
  }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  audioCtx = new AudioContext();
  source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source.connect(analyser);
  // Tab capture redirects audio to this stream — play through so the user still hears music
  analyser.connect(audioCtx.destination);

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  tick();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === 'OFFSCREEN_PING') {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'OFFSCREEN_START_TAB_AUDIO') {
      await start(message.streamId);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'OFFSCREEN_STOP_TAB_AUDIO') {
      stop();
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false });
  })().catch((err) => {
    console.warn('[offscreen]', err?.message || err);
    sendResponse({ ok: false, error: String(err?.message || err) });
  });
  return true;
});
