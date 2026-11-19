/**
 * Auscultrix Vision (VJ) — Apple × dreamcore × lofi landscape overlay.
 * Mood-stabilizing GIF hills + ambient rain/fog, soft frosted chrome,
 * warmer grain + vinyl vignette. Paint / audio sampling locked at 3 FPS
 * for calm lofi cadence and photosensitive safety (default SAFE).
 * Track-synced slow zoom (in to mid → out to end = baseline). No strobes.
 *
 * Wrapped in an IIFE with a re-entry guard: chrome.scripting.executeScript may
 * re-inject after manifest injection; top-level `const` would throw and (when
 * batched) used to block player-bridge.js from loading — killing autoplay.
 */
(function initAuscultrixVjOverlay() {
  if (globalThis.__auscultrixVjOverlayLoaded) return;

  const ROOT_ID = 'auscultrix-vj-root';
  const STYLE_ID = 'auscultrix-vj-hide';

  /**
   * Vision is YouTube-only. Bandcamp (and other hosts) must never show the overlay —
   * Bandcamp is an optional PiP song page (only when the track is on Bandcamp), not the player.
   */
  function isVisionHost() {
    try {
      const host = String(location.hostname || '').toLowerCase();
      return (
        host === 'www.youtube.com' ||
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'music.youtube.com'
      );
    } catch {
      return false;
    }
  }

  if (!isVisionHost()) {
    // Tear down a leftover overlay if an older build injected Vision here.
    try {
      document.getElementById(ROOT_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    } catch {
      // ignore
    }
    return;
  }

  globalThis.__auscultrixVjOverlayLoaded = true;

// —— Vision runtime (YouTube only) ——

/** Photosensitive safety + lofi cadence limits (large-area motion) */
const SAFETY = {
  /** Paint / reactivity sample rate — calm lofi, far below dangerous flicker */
  paintFps: 3,
  /** Max full-screen luminance flicker (Hz) — hard cap ≪ photosensitive guidance */
  maxFlickerHz: 0.5,
  /** Soft landscape crossfade duration (ms) — cozy, not club */
  crossfadeMs: 2800,
  /** Narrow brightness swing around 1.0 */
  brightnessDeltaMax: 0.035,
  /** Soft vignette opacity range (vinyl-ish) */
  vignetteMin: 0.22,
  vignetteMax: 0.42,
  /** Parallax px cap */
  parallaxMaxPx: 8,
  /** Drift speed multiplier range from audio energy */
  driftSpeedMin: 0.7,
  driftSpeedMax: 1.15,
  /** Audio EMA (extra low-pass on top of offscreen EMA) */
  audioSmooth: 0.05,
  /** Always-on lofi rain opacity floor */
  rainBaseOpacity: 0.12,
  /** Max rain opacity for melancholic / anxious moods */
  rainMaxOpacity: 0.42,
  /** Soft grain opacity */
  grainOpacity: 0.07,
  /**
   * Track-synced landscape zoom (Apple / dreamcore calm).
   * Progress 0 = start, 0.5 = mid (max zoom), 1 = end (= baseline, cycle closes).
   * Driven ONLY by p = currentTime/duration — not by GIF loops or wall-clock.
   */
  trackZoomMin: 1.0,
  trackZoomMax: 1.25,
  /** Light EMA toward target — keep responsive to real duration (4 Hz samples) */
  trackZoomSmooth: 0.35,
  /**
   * Last-resort duration when NO media clock and NO playlist hint.
   * Never overrides a known media/playlist duration.
   */
  typicalTrackSec: 210,
  /**
   * Minimum believable media duration (sec) before trusting HTMLMediaElement.
   * Filters 1–2s hover previews / ad stubs.
   */
  minTrustedDurationSec: 5,
  /** Media clock + zoom CSS updates (2–4×/s; paint may stay at 3 fps) */
  mediaSampleMs: 250,
};

/**
 * Mood → landscape map (each preset / energy band → unique primary).
 * See assets/vj/LICENSES.md for CC0 sources.
 *
 * | Bucket                         | Landscape   | Ambient accent        |
 * |--------------------------------|-------------|------------------------|
 * | joy / «sto alla grande» + ~100%| sunflower   | sunbeams (no rain)     |
 * | happiness + high energy        | sunflower   | sunbeams               |
 * | happiness + mid energy         | golden      | sunbeams soft          |
 * | happiness + low energy         | meadow      | drizzle light          |
 * | motivated / drive              | dawn        | fog soft               |
 * | relaxed / calm                 | calm        | drizzle                |
 * | anxious / tension              | pastoral    | rain + fog + window    |
 * | sadness / melancholy           | mist        | rain + fog + night     |
 * | tired / low motivation         | dusk        | fog + night            |
 * | neutral + high energy          | dawn        | drizzle                |
 * | neutral + mid                  | day         | drizzle                |
 * | neutral + low                  | calm        | drizzle + fog          |
 */
const LANDSCAPE_KEYS = [
  'sunflower',
  'golden',
  'meadow',
  'day',
  'calm',
  'dusk',
  'pastoral',
  'mist',
  'dawn',
];

function energyBand(energy) {
  if (!Number.isFinite(energy)) return 'mid';
  if (energy >= 0.72) return 'high';
  if (energy < 0.38) return 'low';
  return 'mid';
}

/**
 * Mood → calming landscape destination (always soothing, never chaotic).
 * Distinct presets + energy bands map to distinct CC0 landscapes.
 */
function landscapeKeyFromMood(mood) {
  if (!mood || typeof mood !== 'object') return 'day';
  const emotion = String(mood.emotion || '').toLowerCase();
  const energy = Number(mood.energy);
  const band = energyBand(energy);
  const anxiety = Number(mood.anxiety);
  const stress = Number(mood.stress);
  const sadness = Number(mood.sadness);
  const happiness = Number(mood.happiness);
  const relaxation = Number(mood.relaxation);
  const valence = Number(mood.valence);
  const secondary = mood.secondaryEmotions || [];
  const raw = String(mood.rawInput || '').toLowerCase();

  const isEuphoric =
    /sto alla grande|alla grande|feeling great|fantastic|amazing|ecstatic|euforic|sul tetto|on top of the world/.test(
      raw,
    ) ||
    (secondary.includes('euphoria') && band === 'high');

  if (
    emotion === 'anxiety' ||
    anxiety >= 0.55 ||
    stress >= 0.6 ||
    secondary.includes('tension')
  ) {
    return band === 'high' ? 'pastoral' : band === 'low' ? 'mist' : 'pastoral';
  }
  if (emotion === 'sadness' || sadness >= 0.55 || secondary.includes('melancholy')) {
    return band === 'high' ? 'meadow' : band === 'mid' ? 'mist' : 'dusk';
  }
  if (
    isEuphoric ||
    ((emotion === 'happiness' || happiness >= 0.65 || valence >= 0.65) && band === 'high')
  ) {
    return 'sunflower';
  }
  if (emotion === 'happiness' || happiness >= 0.65 || (Number.isFinite(valence) && valence >= 0.65)) {
    if (band === 'mid') return 'golden';
    return 'meadow';
  }
  if (secondary.includes('drive') || mood.isHighMotivation) {
    return band === 'low' ? 'meadow' : 'dawn';
  }
  // Intentional calm / relax before generic low-energy dusk (tired uses apathy)
  if (relaxation >= 0.7 || secondary.includes('calm')) {
    return 'calm';
  }
  if (
    mood.isLowMotivation ||
    secondary.includes('apathy') ||
    (Number.isFinite(energy) && energy < 0.38)
  ) {
    return 'dusk';
  }
  if (band === 'high') return 'dawn';
  if (band === 'low') return 'calm';
  return 'day';
}

/**
 * Soft rain intensity 0..1 — always a lofi floor; higher for sad / anxious.
 * Sunflower / golden joy keeps rain near zero.
 */
function rainIntensityFromMood(mood) {
  let intensity = 0.22; // soft always-on drizzle vibe
  if (!mood || typeof mood !== 'object') return intensity;
  const key = landscapeKeyFromMood(mood);
  const emotion = String(mood.emotion || '').toLowerCase();
  const anxiety = Number(mood.anxiety) || 0;
  const stress = Number(mood.stress) || 0;
  const sadness = Number(mood.sadness) || 0;
  const energy = Number(mood.energy);

  if (key === 'sunflower' || key === 'golden') {
    return 0.06;
  }
  if (key === 'meadow' || key === 'dawn') {
    intensity = 0.14;
  }
  if (emotion === 'sadness' || sadness >= 0.45 || key === 'mist') {
    intensity = Math.max(intensity, 0.55 + sadness * 0.35);
  }
  if (emotion === 'anxiety' || anxiety >= 0.5 || stress >= 0.55 || key === 'pastoral') {
    intensity = Math.max(intensity, 0.48 + Math.max(anxiety, stress) * 0.3);
  }
  if (emotion === 'happiness' || (Number.isFinite(energy) && energy > 0.7)) {
    intensity = Math.min(intensity, 0.28);
  }
  return Math.min(1, Math.max(0, intensity));
}

/** Pick ambient GIF stack for current mood (local CC0 only). */
function ambientLayersForMood(mood) {
  const key = landscapeKeyFromMood(mood);
  const intensity = rainIntensityFromMood(mood);
  const layers = [];

  if (key === 'sunflower' || key === 'golden') {
    layers.push({ file: 'ambient_sunbeams.gif', role: 'sunbeams', weight: key === 'sunflower' ? 0.75 : 0.45 });
    if (key === 'golden') {
      layers.push({ file: 'ambient_drizzle.gif', role: 'drizzle', weight: 0.2 });
    }
    return { layers, intensity };
  }

  layers.push({ file: 'ambient_drizzle.gif', role: 'drizzle', weight: 0.55 });
  if (intensity >= 0.4) {
    layers.push({ file: 'ambient_rain.gif', role: 'rain', weight: 0.85 });
  }
  if (intensity >= 0.5 || key === 'mist' || key === 'pastoral') {
    layers.push({ file: 'ambient_window_rain.gif', role: 'window', weight: 0.65 });
  }
  if (key === 'mist' || key === 'dusk' || key === 'pastoral' || key === 'dawn' || key === 'calm') {
    layers.push({
      file: 'ambient_fog.gif',
      role: 'fog',
      weight: key === 'dawn' || key === 'calm' ? 0.28 : 0.5,
    });
  }
  if (key === 'dusk' || key === 'mist') {
    layers.push({ file: 'ambient_night_window.gif', role: 'night', weight: 0.4 });
  }
  if (key === 'meadow') {
    layers.push({ file: 'ambient_sunbeams.gif', role: 'sunbeams', weight: 0.22 });
  }
  return { layers, intensity };
}

const COVER_SELECTORS = [
  '[data-testid="cover-art-image"] img',
  '[data-testid="entity-image"] img',
  'img[src*="i.scdn.co"]',
  'img[src*="mosaic.scdn.co"]',
  'img[src*="mzstatic.com"]',
  'img[src*="is1-ssl.mzstatic.com"]',
  'img[src*="deezer.com"]',
  'img[src*="dzcdn.net"]',
  'img[src*="tidal.com"]',
  'img[src*="audio-ssl.itunes"]',
  'img[src*="m.media-amazon.com"]',
  'img[src*="ssl-images-amazon.com"]',
  'img[src*="pandora.com"]',
  'img[src*="iheart.com"]',
  'img[src*="static-v2.jiosaavn"]',
  'img[src*="saavn.com"]',
  'img[src*="boomplaymusic"]',
  'img[src*="anghcdn"]',
  'img[src*="music.126.net"]',
  'img[src*="y.gtimg.cn"]',
  'img[src*="qobuz.com"]',
  'img[src*="joox.com"]',
  'img[src*="music-flo.com"]',
  'img[data-testid="artwork"]',
  'img.cover',
  'img.album-art',
  'img.albumArt',
  '.cover-art img',
  '.album-cover img',
  '.track-cover img',
];

const FALLBACK_BASE = [
  '#7eb8d4', '#a8d4a0', '#c8e4f0', '#6a9e6e',
  '#e8dcc0', '#9cc4b8', '#b8cce0', '#d4e8c8',
];

let enabled = false;
/** Default SAFE — respects storage + prefers-reduced-motion */
let photosensitiveSafe = true;
let landscapeKey = 'day';
let currentMood = null;
let rainIntensity = 0.22;
let activeLayerIndex = 0;
let colors = FALLBACK_BASE.slice();
let rafId = 0;
let lastPaintMs = 0;
let startTime = performance.now();
let currentVideoId = null;
let lastCoverSrc = null;
let rootEl = null;
let layers = [];
let ambientEls = [];
let frostEl = null;
let vignetteEl = null;
let grainEl = null;
let hideBtn = null;
let safeBadge = null;

let audio = { bass: 0.12, mid: 0.1, treble: 0.08, energy: 0.1 };

/** Track-synced zoom state (progress 0→1 → scale 1 → max → 1) */
let trackZoomDisplayed = SAFETY.trackZoomMin;
let trackZoomTarget = SAFETY.trackZoomMin;
let trackProgress = 0;
let trackStartedAtMs = performance.now();
/** Wall-clock anchor only while estimate mode is actively advancing */
let estimateAnchorMs = performance.now();
let estimateElapsedSec = 0;
/** Hint duration from playlist / PLAY_TRACK (ms); 0 = unknown */
let trackDurationHintMs = 0;
/** Stable key for current track (videoId / cover / href) — reset zoom on change */
let trackZoomKey = null;
/** Last trusted media sample used for zoom */
let mediaClock = {
  currentTime: 0,
  duration: 0,
  paused: true,
  hasMedia: false,
  source: 'none',
};
let lastMediaTimeSec = 0;
let lastTrustedDurationSec = 0;
let mediaSampleTimerId = 0;

const REDUCE_MOTION =
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

const FRAME_MS = 1000 / SAFETY.paintFps;

/** Opt-in debug: storage.vjZoomDebug or `globalThis.__AUSCULTRIX_VJ_DEBUG__ = true` */
let vjZoomDebug = false;

function vjDebug(...args) {
  try {
    if (vjZoomDebug || globalThis.__AUSCULTRIX_VJ_DEBUG__) {
      console.debug('[Auscultrix VJ]', ...args);
    }
  } catch {
    // ignore
  }
}

function clamp01(x) {
  return Math.min(1, Math.max(0, Number(x) || 0));
}

/** Smoothstep — keep in sync with lib/vj-zoom-curve.mjs */
function easeInOutSmooth(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Parabolic zoom curve from track progress p ∈ [0, 1]:
 * Z(p) = min + (max − min) · (1 − (2p − 1)²) — peak exactly at p=0.5.
 * Keep in sync with lib/vj-zoom-curve.mjs → zoomScaleFromProgress.
 */
function zoomScaleFromProgress(p, min = SAFETY.trackZoomMin, max = SAFETY.trackZoomMax) {
  const progress = clamp01(p);
  const x = 2 * progress - 1;
  const parabola = 1 - x * x;
  return min + (max - min) * parabola;
}

function zoomFromTrackProgress(p) {
  const zMin = SAFETY.trackZoomMin;
  let zMax = SAFETY.trackZoomMax;
  if (REDUCE_MOTION) zMax = zMin + (zMax - zMin) * 0.35;
  else if (!photosensitiveSafe) zMax = zMin + (zMax - zMin) * 1.05;
  return zoomScaleFromProgress(p, zMin, zMax);
}

/** Parse "M:SS" / "H:MM:SS" → seconds */
function parseClockToSec(text) {
  const raw = String(text || '')
    .trim()
    .replace(/[^\d:]/g, '');
  if (!raw) return 0;
  const parts = raw.split(':').map((x) => Number(x));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/** YouTube / YT Music on-page time labels (fallback when media.duration missing). */
function readDomPlayerClock() {
  try {
    if (location.hostname.includes('music.youtube.com')) {
      const info = document.querySelector('ytmusic-player-bar .time-info');
      const txt = info?.textContent || '';
      const m = txt.match(/([\d:]+)\s*\/\s*([\d:]+)/);
      if (m) {
        const currentTime = parseClockToSec(m[1]);
        const duration = parseClockToSec(m[2]);
        if (duration >= SAFETY.minTrustedDurationSec) {
          return { currentTime, duration, paused: null, source: 'ytmusic-dom' };
        }
      }
    }
    if (isYouTube()) {
      const curEl =
        document.querySelector('.ytp-time-current') ||
        document.querySelector('.ytp-time-display .ytp-time-current');
      const durEl =
        document.querySelector('.ytp-time-duration') ||
        document.querySelector('.ytp-time-display .ytp-time-duration');
      const currentTime = parseClockToSec(curEl?.textContent);
      const duration = parseClockToSec(durEl?.textContent);
      if (duration >= SAFETY.minTrustedDurationSec) {
        return { currentTime, duration, paused: null, source: 'youtube-dom' };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function resetTrackZoom(reasonKey) {
  trackZoomKey = reasonKey || trackZoomKey;
  trackStartedAtMs = performance.now();
  estimateAnchorMs = trackStartedAtMs;
  estimateElapsedSec = 0;
  trackProgress = 0;
  trackZoomTarget = SAFETY.trackZoomMin;
  trackZoomDisplayed = SAFETY.trackZoomMin;
  lastMediaTimeSec = 0;
  lastTrustedDurationSec = 0;
  mediaClock = {
    currentTime: 0,
    duration: 0,
    paused: true,
    hasMedia: false,
    source: 'none',
  };
  if (rootEl) {
    rootEl.style.setProperty('--vj-track-zoom', SAFETY.trackZoomMin.toFixed(4));
  }
  vjDebug('zoom reset', reasonKey || trackZoomKey);
}

/** Collect audio/video from light DOM and open shadow roots. */
function collectMediaElements(root, out = []) {
  if (!root) return out;
  try {
    for (const el of root.querySelectorAll('audio, video')) {
      if (el instanceof HTMLMediaElement) out.push(el);
    }
  } catch {
    // ignore
  }
  try {
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
      if (el.shadowRoot) collectMediaElements(el.shadowRoot, out);
    }
  } catch {
    // ignore
  }
  return out;
}

/**
 * Prefer the playing media element (YouTube main player, YT Music, audio hosts).
 * Skips tiny preview clips when a longer track is available.
 */
function findPrimaryMedia() {
  const ytSelectors = [
    '#movie_player video.html5-main-video',
    '#movie_player video',
    'ytmusic-player video',
    'ytmusic-player-bar video',
    '#player video.html5-main-video',
    'ytd-player video',
    'video.html5-main-video',
    '#player video',
    'video',
    'audio',
  ];
  if (isYouTube()) {
    // Prefer a playing main video when several exist (ads / previews)
    const candidates = [];
    for (const sel of ytSelectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (el instanceof HTMLMediaElement) candidates.push(el);
        });
      } catch {
        // ignore
      }
    }
    const uniq = [...new Set(candidates)];
    let best = null;
    let bestScore = -1;
    for (const el of uniq) {
      const dur = Number(el.duration);
      const t = Number(el.currentTime) || 0;
      const playing = !el.paused && !el.ended && el.readyState >= 2;
      const finiteDur = Number.isFinite(dur) && dur > 0;
      if (finiteDur && dur < SAFETY.minTrustedDurationSec && !playing) continue;
      const score =
        (playing ? 100000 : 0) +
        (finiteDur && dur >= SAFETY.minTrustedDurationSec ? 5000 : 0) +
        (finiteDur ? Math.min(dur, 7200) : 0) +
        Math.min(t, 7200);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) return best;
  }
  const medias = collectMediaElements(document);
  let best = null;
  let bestScore = -1;
  for (const el of medias) {
    const dur = Number(el.duration);
    const t = Number(el.currentTime) || 0;
    const playing = !el.paused && !el.ended;
    const finiteDur = Number.isFinite(dur) && dur > 0;
    if (finiteDur && dur < SAFETY.minTrustedDurationSec && !playing) continue;
    const score =
      (playing ? 100000 : 0) +
      (finiteDur && dur >= SAFETY.minTrustedDurationSec ? 5000 : 0) +
      (finiteDur ? Math.min(dur, 7200) : 0) +
      Math.min(t, 7200) +
      (el.tagName === 'AUDIO' ? 50 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/** YouTube IFrame/HTML5 player API when exposed on #movie_player. */
function readYouTubePlayerClock() {
  if (!isYouTube()) return null;
  try {
    const player = document.querySelector('#movie_player');
    if (!player) return null;
    let t = NaN;
    let dur = NaN;
    let paused = true;
    if (typeof player.getCurrentTime === 'function') {
      t = Number(player.getCurrentTime());
    }
    if (typeof player.getDuration === 'function') {
      dur = Number(player.getDuration());
    }
    if (typeof player.getPlayerState === 'function') {
      const ps = player.getPlayerState();
      // 1 playing, 3 buffering — treat as advancing
      paused = ps !== 1 && ps !== 3;
    }
    if (!Number.isFinite(t) && !Number.isFinite(dur)) return null;
    return {
      currentTime: Number.isFinite(t) ? Math.max(0, t) : 0,
      duration: Number.isFinite(dur) && dur > 0 ? dur : 0,
      paused,
      source: 'youtube-api',
    };
  } catch {
    return null;
  }
}

function isSessionPlaying() {
  try {
    const ms = navigator.mediaSession;
    if (ms && ms.playbackState === 'playing') return true;
    if (ms && ms.playbackState === 'paused') return false;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sample real media clock into `mediaClock`.
 * Priority: HTMLMedia playing element → YT player API → on-page time labels.
 * Called every paint (~3 Hz) and on a ~4 Hz timer (zoom CSS can update here).
 */
function sampleMediaClock() {
  const yt = readYouTubePlayerClock();
  const media = findPrimaryMedia();
  const domClock = readDomPlayerClock();

  let currentTime = 0;
  let duration = 0;
  let paused = true;
  let hasMedia = false;
  let source = 'none';

  if (media) {
    hasMedia = true;
    currentTime = Number(media.currentTime) || 0;
    const d = Number(media.duration);
    if (Number.isFinite(d) && d > 0) duration = d;
    paused = !!media.paused || !!media.ended;
    source = 'html-media';
  }

  // Prefer YT API when it reports a usable duration / time (SPA / ads edge cases)
  if (yt) {
    hasMedia = true;
    if (yt.duration >= SAFETY.minTrustedDurationSec) {
      duration = yt.duration;
      currentTime = yt.currentTime;
      paused = yt.paused;
      source = yt.source;
    } else if (!media) {
      currentTime = yt.currentTime;
      if (yt.duration > 0) duration = yt.duration;
      paused = yt.paused;
      source = yt.source;
    } else if (yt.currentTime > currentTime + 0.5) {
      currentTime = yt.currentTime;
      if (yt.duration > 0) duration = yt.duration;
      paused = yt.paused;
      source = yt.source;
    }
  }

  // DOM time labels fill gaps (YT Music bar, ytp-time-*) when media.duration is NaN/0
  if (domClock) {
    if (duration < SAFETY.minTrustedDurationSec && domClock.duration >= SAFETY.minTrustedDurationSec) {
      duration = domClock.duration;
      if (!hasMedia || currentTime <= 0) currentTime = domClock.currentTime;
      source = domClock.source;
      hasMedia = true;
    } else if (
      duration >= SAFETY.minTrustedDurationSec &&
      Math.abs(domClock.currentTime - currentTime) > 1.25 &&
      domClock.currentTime > currentTime
    ) {
      // Stale media node — trust newer DOM playhead
      currentTime = domClock.currentTime;
      source = `${source}+${domClock.source}`;
    }
  }

  // Seek: large playhead jump (back or forward) → resync zoom to new p
  if (hasMedia && lastMediaTimeSec > 0) {
    const delta = currentTime - lastMediaTimeSec;
    const seekBack = delta < -2 && lastMediaTimeSec > 8;
    const seekFwd = delta > 4;
    if (seekBack || seekFwd) {
      const hintSec =
        trackDurationHintMs > 0 ? trackDurationHintMs / 1000 : 0;
      const durForSeek =
        duration >= SAFETY.minTrustedDurationSec
          ? duration
          : hintSec >= SAFETY.minTrustedDurationSec
            ? hintSec
            : 0;
      if (durForSeek >= SAFETY.minTrustedDurationSec) {
        const remapped = clamp01(currentTime / durForSeek);
        trackStartedAtMs = performance.now();
        estimateAnchorMs = trackStartedAtMs;
        estimateElapsedSec = currentTime;
        trackProgress = remapped;
        trackZoomTarget = zoomFromTrackProgress(remapped);
        trackZoomDisplayed = trackZoomTarget;
        applyTrackZoomCss(true);
        vjDebug('seek resync', {
          currentTime,
          lastMediaTimeSec,
          delta,
          remapped,
          durForSeek,
        });
      }
    }
  }
  if (hasMedia) lastMediaTimeSec = currentTime;

  // Duration became known or changed meaningfully → remap p without hard jump
  if (
    duration >= SAFETY.minTrustedDurationSec &&
    lastTrustedDurationSec > 0 &&
    Math.abs(duration - lastTrustedDurationSec) > 1.5
  ) {
    const oldP = clamp01(trackProgress);
    const remapped = clamp01(currentTime / duration);
    trackProgress = remapped;
    estimateElapsedSec = currentTime;
    estimateAnchorMs = performance.now();
    vjDebug('duration change remap', {
      from: lastTrustedDurationSec,
      to: duration,
      oldP,
      remapped,
    });
  } else if (
    duration >= SAFETY.minTrustedDurationSec &&
    lastTrustedDurationSec <= 0 &&
    (trackProgress > 0 || currentTime > 0)
  ) {
    const remapped = clamp01(currentTime / duration);
    trackProgress = remapped;
    estimateElapsedSec = currentTime;
    estimateAnchorMs = performance.now();
    vjDebug('duration acquired', { duration, remapped, currentTime });
  }
  if (duration >= SAFETY.minTrustedDurationSec) {
    lastTrustedDurationSec = duration;
  }

  mediaClock = { currentTime, duration, paused, hasMedia, source };
  return mediaClock;
}

function effectiveDurationSec() {
  const mediaDur = mediaClock.duration;
  if (mediaDur >= SAFETY.minTrustedDurationSec) return mediaDur;
  if (trackDurationHintMs > 0) {
    const hint = trackDurationHintMs / 1000;
    if (hint >= SAFETY.minTrustedDurationSec) return hint;
  }
  return 0; // unknown — do NOT silently substitute 210 here
}

/**
 * Measure track progress 0→1 from real media time whenever possible.
 * Single source of truth: p = clamp(currentTime / duration) of playing media.
 * Playlist durationMs is next; wall-clock÷210 is last resort only (never overrides known duration).
 */
function measureTrackProgress() {
  sampleMediaClock();
  const { currentTime: t, duration: mediaDur, paused, hasMedia } = mediaClock;
  const sessionPlaying = isSessionPlaying();
  const advancing =
    (hasMedia && !paused) ||
    sessionPlaying === true ||
    (hasMedia && t > 0 && sessionPlaying !== false);

  // 1) Real HTMLMedia / YT / DOM duration
  if (mediaDur >= SAFETY.minTrustedDurationSec) {
    estimateElapsedSec = t;
    estimateAnchorMs = performance.now();
    return clamp01(t / mediaDur);
  }

  const hintSec = effectiveDurationSec();

  // 2) Have media playhead but duration still unknown — use playlist hint if any
  if (hasMedia && (t > 0 || !paused)) {
    if (!paused || advancing) {
      estimateElapsedSec = Math.max(t, estimateElapsedSec);
      estimateAnchorMs = performance.now();
    }
    if (hintSec >= SAFETY.minTrustedDurationSec) {
      return clamp01(t / hintSec);
    }
    // No duration yet: hold progress at 0 (baseline) — do not invent 210s motion
    return 0;
  }

  // 3) No accessible media: advance only with playlist hint (not bare 210) while playing
  if ((advancing || sessionPlaying === true) && hintSec >= SAFETY.minTrustedDurationSec) {
    const now = performance.now();
    estimateElapsedSec += (now - estimateAnchorMs) / 1000;
    estimateAnchorMs = now;
    return clamp01(estimateElapsedSec / hintSec);
  }

  // 4) Absolute last resort: typical length wall estimate (only if nothing else)
  if (advancing || sessionPlaying === true) {
    const now = performance.now();
    estimateElapsedSec += (now - estimateAnchorMs) / 1000;
    estimateAnchorMs = now;
    return clamp01(estimateElapsedSec / SAFETY.typicalTrackSec);
  }

  // 5) Paused / unknown: hold
  estimateAnchorMs = performance.now();
  if (estimateElapsedSec <= 0 && t <= 0) return 0;
  return clamp01(trackProgress);
}

function applyTrackZoomCss(hard = false) {
  if (!rootEl) return;
  if (!hard) {
    const zoomSmooth = REDUCE_MOTION ? 0.2 : SAFETY.trackZoomSmooth;
    trackZoomDisplayed += (trackZoomTarget - trackZoomDisplayed) * zoomSmooth;
  } else {
    trackZoomDisplayed = trackZoomTarget;
  }
  if (Math.abs(trackZoomDisplayed - trackZoomTarget) < 0.00015) {
    trackZoomDisplayed = trackZoomTarget;
  }
  rootEl.style.setProperty('--vj-track-zoom', trackZoomDisplayed.toFixed(4));
}

function syncTrackZoomFromMedia() {
  maybeResetZoomForTrackIdentity();
  trackProgress = measureTrackProgress();
  trackZoomTarget = zoomFromTrackProgress(trackProgress);
  applyTrackZoomCss(false);
}

function maybeResetZoomForTrackIdentity() {
  const id = getVideoId();
  const key = id || location.href.split('#')[0];
  if (key && key !== trackZoomKey) {
    resetTrackZoom(key);
  }
}

function ensureMediaSampleTimer() {
  if (mediaSampleTimerId) return;
  mediaSampleTimerId = setInterval(() => {
    if (!enabled) return;
    // 4 Hz: progress + zoom transform even when paint stays at 3 fps
    syncTrackZoomFromMedia();
  }, SAFETY.mediaSampleMs);
}

function assetUrl(file) {
  try {
    return chrome.runtime.getURL(`assets/vj/${file}`);
  } catch {
    return `assets/vj/${file}`;
  }
}

function landscapeSrc(key, preferGif = false) {
  // JPG stills: track-synced CSS zoom is the ONLY zoom (GIF Ken Burns loops ~2.6s
  // and previously drowned out duration-based scale — root cause of 3.6.7 “fix”).
  const k = LANDSCAPE_KEYS.includes(key) ? key : 'day';
  return assetUrl(preferGif ? `landscape_${k}.gif` : `landscape_${k}.jpg`);
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return { r: 120, g: 160, b: 180 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function buildPalette(rawColors) {
  const out = [];
  const seen = new Set();
  for (const c of rawColors || []) {
    if (!c || typeof c !== 'string') continue;
    const hex = c.startsWith('#') ? c.toLowerCase() : `#${c}`.toLowerCase();
    if (hex.length < 7 || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= 8) break;
  }
  while (out.length < 8) out.push(FALLBACK_BASE[out.length % FALLBACK_BASE.length]);
  return out;
}

function quantizeRgba(rgba, count = 8) {
  const buckets = new Map();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const r = rgba[i] >> 4;
    const g = rgba[i + 1] >> 4;
    const b = rgba[i + 2] >> 4;
    const lum = r + g + b;
    if (lum < 2 || lum > 44) continue;
    const key = (r << 8) | (g << 4) | b;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  if (!buckets.size) return buildPalette(FALLBACK_BASE);
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [key] of sorted) {
    if (out.length >= count) break;
    const r = ((key >> 8) & 0xf) * 17;
    const g = ((key >> 4) & 0xf) * 17;
    const b = (key & 0xf) * 17;
    out.push(
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
    );
  }
  return buildPalette(out);
}

function getVideoId() {
  try {
    const url = new URL(location.href);
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const short = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (short) return short[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function isYouTube() {
  return location.hostname.includes('youtube.com');
}

/**
 * REMOVED (was maybeAutoOpenFirstSearchResult): the overlay must NEVER
 * auto-open the first result of a YouTube search page on its own — that
 * hijacked normal user searches (first video started by itself).
 * Search → watch navigation for extension plays is handled exclusively by
 * player-bridge.js on BRIDGE_AUTOPLAY (background-initiated only).
 */
async function colorsFromBlobOrBitmap(source) {
  const bitmap = source instanceof ImageBitmap ? source : await createImageBitmap(source);
  const c = document.createElement('canvas');
  c.width = 80;
  c.height = 80;
  const cctx = c.getContext('2d');
  cctx.drawImage(bitmap, 0, 0, 80, 80);
  if (typeof bitmap.close === 'function') bitmap.close();
  return quantizeRgba(cctx.getImageData(0, 0, 80, 80).data, 8);
}

async function extractColorsFromUrl(imageUrl) {
  if (!imageUrl) return buildPalette(FALLBACK_BASE);
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(String(res.status));
    return colorsFromBlobOrBitmap(await res.blob());
  } catch {
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imageUrl;
      });
      return colorsFromBlobOrBitmap(img);
    } catch {
      return buildPalette(FALLBACK_BASE);
    }
  }
}

async function extractColorsFromVideoId(videoId) {
  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];
  for (const url of candidates) {
    const cols = await extractColorsFromUrl(url);
    if (cols?.length) return cols;
  }
  return buildPalette(FALLBACK_BASE);
}

function findDomCoverImage() {
  const candidates = [];
  for (const sel of COVER_SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      if (el instanceof HTMLImageElement && el.naturalWidth > 40) candidates.push(el);
    });
  }
  document.querySelectorAll('img').forEach((el) => {
    if (!(el instanceof HTMLImageElement)) return;
    if (el.naturalWidth < 80 || el.naturalHeight < 80) return;
    const ratio = el.naturalWidth / el.naturalHeight;
    if (ratio < 0.7 || ratio > 1.4) return;
    candidates.push(el);
  });

  let best = null;
  let bestScore = 0;
  for (const img of candidates) {
    const area = img.naturalWidth * img.naturalHeight;
    const ratio = img.naturalWidth / Math.max(img.naturalHeight, 1);
    const squareBonus = 1 - Math.min(Math.abs(1 - ratio), 1);
    const score = area * (0.5 + squareBonus);
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  return best;
}

async function colorsFromDomCover() {
  const img = findDomCoverImage();
  if (!img?.src) return null;
  if (img.src === lastCoverSrc) return null;
  lastCoverSrc = img.src;
  try {
    return await extractColorsFromUrl(img.currentSrc || img.src);
  } catch {
    try {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 80;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0, 80, 80);
      return quantizeRgba(cctx.getImageData(0, 0, 80, 80).data, 8);
    } catch {
      return null;
    }
  }
}

function setMediaDimmed(hide) {
  let style = document.getElementById(STYLE_ID);
  if (!hide) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = `
    ytd-player video,
    #movie_player video,
    .html5-main-video {
      opacity: 0.06 !important;
      filter: blur(22px) saturate(0.4) !important;
    }
    .ytp-chrome-top,
    .ytp-gradient-top,
    .ytp-gradient-bottom {
      opacity: 0.3 !important;
    }
    img[src*="i.scdn.co"],
    img[src*="mzstatic.com"],
    img[src*="dzcdn.net"],
    img[src*="deezer.com"],
    img[data-testid="cover-art-image"],
    [data-testid="cover-art-image"] img {
      opacity: 0.14 !important;
      filter: blur(12px) saturate(0.45) !important;
    }
    #auscultrix-vj-root {
      pointer-events: none;
    }
    #auscultrix-vj-root .auscultrix-vj-toggle {
      pointer-events: auto;
    }
  `;
}

function applyFrostTint() {
  if (!frostEl) return;
  const c = hexToRgb(colors[0] || FALLBACK_BASE[0]);
  const c2 = hexToRgb(colors[2] || FALLBACK_BASE[2]);
  // Warmer lofi wash — soft amber edge on frost
  frostEl.style.background = `
    radial-gradient(
      ellipse 80% 60% at 50% 32%,
      rgba(255, 248, 235, 0.14) 0%,
      rgba(${c.r}, ${c.g}, ${c.b}, 0.07) 40%,
      rgba(255, 255, 255, 0) 58%
    ),
    linear-gradient(
      180deg,
      rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.09) 0%,
      rgba(255, 236, 210, 0.05) 42%,
      rgba(24, 20, 16, 0.2) 100%
    )`;
}

function syncAmbientLayers() {
  if (!rootEl) return;
  const stack = rootEl.querySelector('.auscultrix-vj-ambient');
  if (!stack) return;
  const { layers: specs, intensity } = ambientLayersForMood(currentMood);
  rainIntensity = intensity;
  stack.replaceChildren();
  ambientEls = [];
  for (const spec of specs) {
    const img = document.createElement('img');
    img.className = `auscultrix-vj-ambient-layer auscultrix-vj-ambient-${spec.role}`;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.src = assetUrl(spec.file);
    img.dataset.weight = String(spec.weight);
    img.dataset.file = spec.file;
    stack.appendChild(img);
    ambientEls.push(img);
  }
  applyAmbientOpacity();
}

/**
 * Largest frame-to-frame relative-luminance step of each ambient GIF, measured
 * per 1/16 of the frame by tools/photosensitivity_check.py (WCAG 2.3.1 screen).
 * In SAFE mode (default) each layer's opacity is capped so that
 * opacity × step stays below SAFE_STEP_TARGET (< 0.10, the WCAG flash
 * definition): the overlay then produces no "flash" at all, not merely fewer
 * than three per second. Re-run the tool and update this table if a GIF changes.
 */
const AMBIENT_LUMINANCE_STEP = {
  'ambient_drizzle.gif': 0.3748,
  'ambient_fog.gif': 0.1809,
  'ambient_rain.gif': 0.2854,
  'ambient_window_rain.gif': 0.5696,
  'ambient_sunbeams.gif': 0.0404,
  'ambient_night_window.gif': 0.0007,
};
const SAFE_STEP_TARGET = 0.08;

function safeOpacityCap(file) {
  const step = AMBIENT_LUMINANCE_STEP[file];
  if (!Number.isFinite(step) || step <= 0) return 0.08; // unknown asset: very faint
  return Math.min(1, SAFE_STEP_TARGET / step);
}

function applyAmbientOpacity() {
  const base =
    SAFETY.rainBaseOpacity +
    (SAFETY.rainMaxOpacity - SAFETY.rainBaseOpacity) * rainIntensity;
  const scale = REDUCE_MOTION ? 0.55 : photosensitiveSafe ? 1 : 1.05;
  for (const el of ambientEls) {
    const w = Number(el.dataset.weight) || 0.6;
    let opacity = base * w * scale;
    if (photosensitiveSafe || REDUCE_MOTION) {
      opacity = Math.min(opacity, safeOpacityCap(el.dataset.file || ''));
    }
    el.style.opacity = opacity.toFixed(3);
  }
}

function ensureDom() {
  if (document.getElementById(ROOT_ID)) {
    rootEl = document.getElementById(ROOT_ID);
    layers = [...rootEl.querySelectorAll('.auscultrix-vj-layer')];
    frostEl = rootEl.querySelector('.auscultrix-vj-frost');
    vignetteEl = rootEl.querySelector('.auscultrix-vj-vignette');
    grainEl = rootEl.querySelector('.auscultrix-vj-grain');
    hideBtn = rootEl.querySelector('.auscultrix-vj-toggle');
    safeBadge = rootEl.querySelector('.auscultrix-vj-safe-badge');
    ambientEls = [...rootEl.querySelectorAll('.auscultrix-vj-ambient-layer')];
    return;
  }

  rootEl = document.createElement('div');
  rootEl.id = ROOT_ID;
  rootEl.className = 'auscultrix-vj-root auscultrix-vj-lofi';
  rootEl.style.setProperty('--vj-crossfade-ms', `${SAFETY.crossfadeMs}ms`);
  rootEl.style.setProperty('--vj-grain', String(SAFETY.grainOpacity));
  rootEl.style.setProperty('--vj-track-zoom', SAFETY.trackZoomMin.toFixed(4));

  const stack = document.createElement('div');
  stack.className = 'auscultrix-vj-landscapes';
  layers = [];
  for (let i = 0; i < 2; i++) {
    const img = document.createElement('img');
    img.className = 'auscultrix-vj-layer';
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.src = landscapeSrc(landscapeKey);
    if (i === 0) img.classList.add('is-active', 'is-drifting');
    stack.appendChild(img);
    layers.push(img);
  }
  rootEl.appendChild(stack);

  const ambient = document.createElement('div');
  ambient.className = 'auscultrix-vj-ambient';
  rootEl.appendChild(ambient);

  frostEl = document.createElement('div');
  frostEl.className = 'auscultrix-vj-frost';
  rootEl.appendChild(frostEl);

  grainEl = document.createElement('div');
  grainEl.className = 'auscultrix-vj-grain';
  rootEl.appendChild(grainEl);

  vignetteEl = document.createElement('div');
  vignetteEl.className = 'auscultrix-vj-vignette';
  rootEl.appendChild(vignetteEl);

  hideBtn = document.createElement('button');
  hideBtn.type = 'button';
  hideBtn.className = 'auscultrix-vj-toggle';
  hideBtn.textContent = vjToggleLabel(true);
  hideBtn.addEventListener('click', () => {
    setEnabled(!enabled);
    chrome.runtime.sendMessage({ type: 'SET_VJ_ENABLED', enabled }).catch(() => {});
  });
  rootEl.appendChild(hideBtn);

  safeBadge = document.createElement('div');
  safeBadge.className = 'auscultrix-vj-safe-badge';
  safeBadge.textContent = photosensitiveSafe ? 'Safe · lofi 3fps' : 'Vision · lofi';
  rootEl.appendChild(safeBadge);

  document.documentElement.appendChild(rootEl);
  applyFrostTint();
  syncAmbientLayers();
  activeLayerIndex = 0;
}

function setLandscape(nextKey, { force = false } = {}) {
  const key = LANDSCAPE_KEYS.includes(nextKey) ? nextKey : 'day';
  if (!force && key === landscapeKey && layers.length) return;
  landscapeKey = key;
  if (!layers.length) return;

  const incoming = 1 - activeLayerIndex;
  const outLayer = layers[activeLayerIndex];
  const inLayer = layers[incoming];
  if (!outLayer || !inLayer) return;

  inLayer.src = landscapeSrc(key, false);
  inLayer.onerror = () => {
    inLayer.onerror = null;
    inLayer.src = landscapeSrc(key, true);
  };

  // Dual-buffer crossfade ≥ crossfadeMs (no hard cut)
  requestAnimationFrame(() => {
    inLayer.classList.add('is-active', 'is-drifting');
    outLayer.classList.remove('is-active');
    outLayer.classList.remove('is-drifting');
    activeLayerIndex = incoming;
  });
}

function reactivityScale() {
  if (REDUCE_MOTION) return 0.2;
  if (!photosensitiveSafe) return 0.45;
  return 0.32;
}

function paint(now) {
  rafId = requestAnimationFrame(paint);
  if (!enabled || !rootEl) return;
  // Hard 3 FPS paint cadence — softens reactivity + matches GIF loops
  if (now - lastPaintMs < FRAME_MS) return;
  lastPaintMs = now;

  const t = (now - startTime) / 1000;
  const scale = reactivityScale();
  const bass = audio.bass * scale;
  const mid = audio.mid * scale;
  const energy = audio.energy * scale;

  // Track-synced zoom: p = currentTime/duration (also updated ~4 Hz on timer)
  syncTrackZoomFromMedia();
  if ((vjZoomDebug || globalThis.__AUSCULTRIX_VJ_DEBUG__) && Math.floor(now / 2000) !== Math.floor((now - FRAME_MS) / 2000)) {
    vjDebug('zoom', {
      p: trackProgress.toFixed(3),
      z: trackZoomDisplayed.toFixed(4),
      t: mediaClock.currentTime.toFixed(1),
      dur: mediaClock.duration.toFixed(1),
      src: mediaClock.source,
      hintMs: trackDurationHintMs,
    });
  }

  // Soft sine envelope ≤ maxFlickerHz — never hard flashes (≪ 1 Hz)
  const pulseHz = Math.min(SAFETY.maxFlickerHz, photosensitiveSafe ? 0.22 : 0.35);
  const envelope = 0.5 + 0.5 * Math.sin(t * pulseHz * Math.PI * 2);

  const brightDelta =
    SAFETY.brightnessDeltaMax * (0.3 + energy * 0.55) * (0.65 + 0.35 * envelope);
  const brightness = 1 + (photosensitiveSafe ? brightDelta * 0.65 : brightDelta);
  const saturate = 0.86 + mid * 0.06;
  const hue = (mid - 0.5) * (photosensitiveSafe ? 3 : 6);
  const warm = 1 + mid * 0.015; // slight warmer lofi lift
  const parallax =
    Math.sin(t * 0.08 + bass * 0.3) * SAFETY.parallaxMaxPx * (0.35 + energy * 0.5);
  const vignette =
    SAFETY.vignetteMin +
    (SAFETY.vignetteMax - SAFETY.vignetteMin) *
      (0.5 + 0.3 * energy + 0.15 * envelope * (photosensitiveSafe ? 0.45 : 0.7));
  const driftMul =
    SAFETY.driftSpeedMin +
    (SAFETY.driftSpeedMax - SAFETY.driftSpeedMin) * Math.min(1, energy * 1.05);
  const baseDrift = REDUCE_MOTION ? 140 : photosensitiveSafe ? 64 : 48;
  const grain =
    SAFETY.grainOpacity * (REDUCE_MOTION ? 0.6 : 1) * (0.9 + 0.1 * envelope);

  rootEl.style.setProperty('--vj-brightness', (brightness * warm).toFixed(4));
  rootEl.style.setProperty('--vj-saturate', saturate.toFixed(4));
  rootEl.style.setProperty('--vj-hue', `${hue.toFixed(2)}deg`);
  rootEl.style.setProperty('--vj-parallax-x', `${parallax.toFixed(2)}px`);
  // Tiny audio breathe on top of track zoom (keeps calm; track zoom is primary)
  rootEl.style.setProperty('--vj-parallax-scale', (1 + bass * 0.008).toFixed(4));
  // --vj-track-zoom already set by syncTrackZoomFromMedia / applyTrackZoomCss
  rootEl.style.setProperty('--vj-vignette', vignette.toFixed(4));
  rootEl.style.setProperty('--vj-frost', (0.16 + mid * 0.06).toFixed(4));
  rootEl.style.setProperty('--vj-drift-s', `${(baseDrift / driftMul).toFixed(1)}s`);
  rootEl.style.setProperty('--vj-grain', grain.toFixed(4));
  rootEl.style.setProperty(
    '--vj-rain',
    (
      SAFETY.rainBaseOpacity +
      (SAFETY.rainMaxOpacity - SAFETY.rainBaseOpacity) * rainIntensity
    ).toFixed(3),
  );
  applyAmbientOpacity();
}

function setEnabled(next) {
  enabled = !!next;
  if (!enabled) {
    setMediaDimmed(false);
    document.getElementById(ROOT_ID)?.remove();
    rootEl = null;
    layers = [];
    ambientEls = [];
    frostEl = null;
    vignetteEl = null;
    grainEl = null;
    hideBtn = null;
    safeBadge = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (mediaSampleTimerId) {
      clearInterval(mediaSampleTimerId);
      mediaSampleTimerId = 0;
    }
    lastPaintMs = 0;
    return;
  }
  ensureDom();
  ensureMediaSampleTimer();
  rootEl?.classList.remove('auscultrix-vj-hidden');
  if (hideBtn) hideBtn.textContent = vjToggleLabel(true);
  if (safeBadge) {
    safeBadge.textContent = photosensitiveSafe ? 'Safe · lofi 3fps' : 'Vision · lofi';
  }
  setLandscape(landscapeKey, { force: true });
  syncAmbientLayers();
  applyFrostTint();
  setMediaDimmed(true);
  sampleMediaClock();
  if (!rafId) {
    startTime = performance.now();
    lastPaintMs = 0;
    rafId = requestAnimationFrame(paint);
  }
}

function vjToggleLabel(isEnabled) {
  try {
    const key = isEnabled ? 'vjHide' : 'vjShow';
    const msg = chrome.i18n?.getMessage?.(key);
    if (msg) return msg;
  } catch {
    // ignore
  }
  return isEnabled ? 'Hide Vision' : 'Show Vision';
}

async function applyPalette(nextColors, coverUrl) {
  if (Array.isArray(nextColors) && nextColors.length) {
    colors = buildPalette(nextColors);
  } else if (coverUrl) {
    colors = await extractColorsFromUrl(coverUrl);
  }
  applyFrostTint();
  if (enabled) setEnabled(true);
}

function applyMoodFromStorage(mood) {
  currentMood = mood || null;
  const key = landscapeKeyFromMood(mood);
  setLandscape(key);
  rainIntensity = rainIntensityFromMood(mood);
  if (enabled) syncAmbientLayers();
}

/**
 * A new video is on the page. Vision belongs only on the listening session's
 * own video in the session's own tab: the worker decides and replies. Any
 * other YouTube tab, or another video the person picks in the player tab,
 * never shows the overlay (the Vision setting alone is not enough).
 */
async function onVideoChange(videoId) {
  if (!videoId) return;
  currentVideoId = videoId;
  resetTrackZoom(videoId);
  let reply = null;
  try {
    reply = await chrome.runtime.sendMessage({ type: 'YOUTUBE_VIDEO_DETECTED', videoId });
  } catch {
    reply = null;
  }
  if (videoId !== currentVideoId) return; // a newer video arrived meanwhile
  if (!reply?.vision) {
    if (enabled) setEnabled(false);
    return;
  }
  colors = await extractColorsFromVideoId(videoId);
  if (videoId !== currentVideoId) return;
  applyFrostTint();
  setEnabled(true);
}

function watchPage() {
  let last = location.href;
  const check = async () => {
    if (location.href !== last) {
      last = location.href;
      const id = getVideoId();
      if (id && id !== currentVideoId) await onVideoChange(id);
      else maybeResetZoomForTrackIdentity();
    }
    if (enabled && !isYouTube()) {
      const fromDom = await colorsFromDomCover();
      if (fromDom) {
        colors = fromDom;
        applyFrostTint();
      }
    }
  };
  setInterval(check, 1200);
  const obs = new MutationObserver(() => {
    check().catch(() => {});
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === 'VJ_PING') {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'VJ_SET_ENABLED') {
      setEnabled(!!message.enabled);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'VJ_APPLY_COVER') {
      const trackKey =
        message.trackId ||
        message.youtubeVideoId ||
        message.coverUrl ||
        getVideoId() ||
        location.href.split('#')[0];
      if (trackKey && trackKey !== trackZoomKey) {
        resetTrackZoom(String(trackKey));
      } else if (!trackZoomKey) {
        resetTrackZoom(String(trackKey || 'cover'));
      }
      const hintMs = Number(message.durationMs);
      if (Number.isFinite(hintMs) && hintMs > 0) {
        const prevHint = trackDurationHintMs;
        trackDurationHintMs = hintMs;
        // Playlist duration arrived/changed while estimate was running → remap
        if (
          prevHint !== hintMs &&
          mediaClock.duration < SAFETY.minTrustedDurationSec &&
          (estimateElapsedSec > 0 || mediaClock.currentTime > 0)
        ) {
          sampleMediaClock();
          const t = mediaClock.currentTime || estimateElapsedSec;
          const remapped = clamp01(t / (hintMs / 1000));
          trackProgress = remapped;
          estimateElapsedSec = t;
          estimateAnchorMs = performance.now();
          vjDebug('hint duration apply', { hintMs, remapped, t });
        }
      }
      await applyPalette(message.colors, message.coverUrl);
      if (message.enabled !== undefined) setEnabled(!!message.enabled);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'VJ_AUDIO_LEVELS') {
      const next = {
        bass: Number(message.bass) || 0,
        mid: Number(message.mid) || 0,
        treble: Number(message.treble) || 0,
        energy: Number(message.energy) || 0,
      };
      const s = SAFETY.audioSmooth;
      audio.bass += (next.bass - audio.bass) * s;
      audio.mid += (next.mid - audio.mid) * s;
      audio.treble += (next.treble - audio.treble) * s;
      audio.energy += (next.energy - audio.energy) * s;
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'VJ_APPLY_MOOD') {
      if (message.mood) applyMoodFromStorage(message.mood);
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false });
  })().catch(() => sendResponse({ ok: false }));
  return true;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.mood) {
    applyMoodFromStorage(changes.mood.newValue);
  }
  if (changes.vjPhotosensitiveSafe) {
    photosensitiveSafe = changes.vjPhotosensitiveSafe.newValue !== false;
    if (safeBadge) {
      safeBadge.textContent = photosensitiveSafe ? 'Safe · lofi 3fps' : 'Vision · lofi';
    }
  }
  if (changes.vjZoomDebug) {
    vjZoomDebug = changes.vjZoomDebug.newValue === true;
  }
});

chrome.storage.local.get(
  ['vjEnabled', 'vjPalette', 'vjCoverUrl', 'mood', 'vjPhotosensitiveSafe', 'vjZoomDebug'],
  async (data) => {
    // The Vision setting alone never switches the overlay on: the worker
    // decides per tab and per video (onVideoChange, VJ_APPLY_COVER), so the
    // person's own YouTube tabs and the videos they choose stay untouched.
    enabled = false;
    // Default SAFE unless explicitly set false
    photosensitiveSafe = data.vjPhotosensitiveSafe !== false;
    vjZoomDebug = data.vjZoomDebug === true;
    if (Array.isArray(data.vjPalette) && data.vjPalette.length) {
      colors = buildPalette(data.vjPalette);
    } else if (data.vjEnabled === true && data.vjCoverUrl) {
      colors = await extractColorsFromUrl(data.vjCoverUrl);
    }
    if (data.mood) {
      currentMood = data.mood;
      landscapeKey = landscapeKeyFromMood(data.mood);
      rainIntensity = rainIntensityFromMood(data.mood);
    }
    const id = getVideoId();
    if (id) await onVideoChange(id);
    watchPage();
  },
);

})(); // end Vision YouTube-only runtime (IIFE + re-entry guard)
