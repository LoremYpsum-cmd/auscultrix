/**
 * Panel controller for the generative soundscape (sidepanel.html, section
 * #soundscape-section). Owns its DOM, its AudioContext and its preferences;
 * sidepanel.js only tells it when a session starts or stops.
 *
 * Privacy: nothing leaves the device. Preferences (space, soundmark, volume,
 * duration, «Start plays the soundscape») are stored in soundscapePrefsV1 and
 * erased by «Forget everything». Exports are files the person saves; they
 * contain numbers (valence, arousal, parameters), never the typed text.
 */
import {
  MAPPING_TABLE,
  SOUNDSCAPE_DEFAULT_PREFS,
  SOUNDSCAPE_VERSION,
  buildScore,
  normalizeSoundscapePrefs,
  summarizeScore,
} from './soundscape.js';
import { SoundscapePlayer, renderScoreOffline } from './soundscape-audio.js';
import { encodeWav16 } from './wav.js';
import { buildPdPatch } from './pd-patch.js';
import { drawDot, drawPath, drawPlane, moveDot } from './circumplex.js';
import { t } from './i18n.js';

const SOUNDSCAPE_PREFS_KEY = 'soundscapePrefsV1';
const EXPORT_SECONDS = 120;
const HOUR_S = 3600;

const $ = (id) => document.getElementById(id);

export function createSoundscapePanel({ getMood, ensureMood, isCrisis, onWillPlay }) {
  const els = {
    space: $('soundscape-space'),
    soundmark: $('soundscape-soundmark'),
    minutes: $('soundscape-minutes'),
    volume: $('soundscape-volume'),
    useDefault: $('soundscape-default'),
    play: $('btn-soundscape-play'),
    stop: $('btn-soundscape-stop'),
    map: $('soundscape-map'),
    status: $('soundscape-status'),
    wav: $('btn-soundscape-wav'),
    score: $('btn-soundscape-score'),
    pd: $('btn-soundscape-pd'),
    exportStatus: $('soundscape-export-status'),
  };
  if (!els.play) return null;

  let prefs = { ...SOUNDSCAPE_DEFAULT_PREFS, useByDefault: false };
  let ctx = null;
  let player = null;
  let score = null;
  let dot = null;
  let uiTimer = null;
  let lastPhaseKey = '';

  function audioContext() {
    if (!ctx || ctx.state === 'closed') {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      ctx = new AC({ latencyHint: 'playback' });
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  async function loadPrefs() {
    try {
      const data = await chrome.storage.local.get([SOUNDSCAPE_PREFS_KEY]);
      const raw = data[SOUNDSCAPE_PREFS_KEY] || {};
      prefs = { ...normalizeSoundscapePrefs(raw), useByDefault: raw.useByDefault === true };
    } catch {
      // defaults
    }
    els.space.value = prefs.space;
    els.soundmark.value = prefs.soundmark;
    els.minutes.value = String(prefs.minutes);
    els.volume.value = String(Math.round(prefs.volume * 100));
    els.useDefault.checked = prefs.useByDefault;
  }

  function readPrefs() {
    prefs = {
      ...normalizeSoundscapePrefs({
        space: els.space.value,
        soundmark: els.soundmark.value,
        minutes: Number(els.minutes.value),
        volume: Number(els.volume.value) / 100,
      }),
      useByDefault: !!els.useDefault.checked,
    };
    chrome.storage.local.set({ [SOUNDSCAPE_PREFS_KEY]: prefs }).catch(() => {});
    return prefs;
  }

  function makeScore(mood, seed) {
    const p = prefs;
    const timed = p.minutes > 0;
    return buildScore(mood, {
      durationS: timed ? p.minutes * 60 : HOUR_S,
      fadeOut: timed,
      seed,
      space: p.space,
      soundmark: p.soundmark,
      hour: new Date().getHours(),
    });
  }

  function phaseLabel(phase) {
    return t(`soundscapePhase_${phase}`) || phase;
  }

  function modeLabel(mode) {
    return t(`soundscapeMode_${mode}`) || mode;
  }

  function drawMap(sc) {
    els.map.replaceChildren();
    const svg = drawPlane({
      title: t('soundscapeMapTitle') || 'Percorso del paesaggio sonoro',
      desc: t('soundscapeMapDesc', [
        String(Math.round(sc.start.valence * 100)),
        String(Math.round(sc.start.arousal * 100)),
        String(Math.round(sc.target.valence * 100)),
        String(Math.round(sc.target.arousal * 100)),
      ]),
      labels: {
        valence: t('circumplexValence') || 'umore',
        arousal: t('circumplexArousal') || 'energia',
        q: {},
      },
    });
    drawPath(svg, sc.controls.map((c) => ({ valence: c.valence, arousal: c.arousal })), 'cx-path');
    drawDot(svg, sc.target, 'cx-target', 4);
    dot = drawDot(svg, sc.controls[0], 'cx-now', 5.5);
    els.map.append(svg);
  }

  function updateUi() {
    if (!player || !score) return;
    const c = player.current();
    if (dot) moveDot(dot, c);
    const key = `${c.phase}|${c.mode}`;
    if (key !== lastPhaseKey) {
      lastPhaseKey = key;
      els.status.textContent = t('soundscapeStatus', [
        phaseLabel(c.phase),
        modeLabel(c.mode),
        String(Math.round(c.eventsPerMin)),
      ]);
    }
    if (player.elapsed() >= score.durationS - 0.5) {
      if (prefs.minutes === 0) {
        // «until I stop»: continue from the target, new seed, no gap
        const holding = { ...getMood(), valence: score.target.valence, energy: score.target.arousal };
        startPlayer(holding, (score.seed + 1) >>> 0);
      } else {
        finish();
      }
    }
  }

  function startPlayer(mood, seed) {
    const ac = audioContext();
    const old = player;
    score = makeScore(mood, seed);
    player = new SoundscapePlayer(ac, score, { volume: prefs.volume });
    player.start();
    if (old) old.stop().catch(() => {});
    drawMap(score);
    lastPhaseKey = '';
    clearInterval(uiTimer);
    uiTimer = setInterval(updateUi, 1000);
    updateUi();
  }

  function finish() {
    clearInterval(uiTimer);
    uiTimer = null;
    player = null;
    els.play.disabled = false;
    els.stop.disabled = true;
    els.status.textContent = t('soundscapeEnded') || 'Fine. Il silenzio fa parte del paesaggio.';
  }

  /**
   * @param {{ automatic?: boolean }} [opts] automatic = started by «Start»
   * @returns {Promise<boolean>} true if it plays
   */
  async function play({ automatic = false } = {}) {
    audioContext(); // inside the user gesture
    readPrefs();
    const mood = getMood() || (await ensureMood());
    if (!mood) return false;
    if (automatic && isCrisis(mood)) {
      els.status.textContent = t('soundscapeCrisisHold') || 'Prima l\'aiuto: il paesaggio parte quando lo chiedi tu.';
      return false;
    }
    await onWillPlay?.();
    startPlayer(mood, (Date.now() >>> 0) || 1);
    els.play.disabled = true;
    els.stop.disabled = false;
    return true;
  }

  async function stop() {
    if (!player) return;
    const p = player;
    player = null;
    clearInterval(uiTimer);
    els.stop.disabled = true;
    els.status.textContent = t('soundscapeFading') || 'Sfumo…';
    await p.stop();
    finish();
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function exportStatus(text) {
    els.exportStatus.hidden = !text;
    els.exportStatus.textContent = text || '';
  }

  async function currentOrNewScore(durationS) {
    readPrefs();
    const mood = getMood() || (await ensureMood());
    if (!mood) return null;
    const seed = score?.seed || ((Date.now() >>> 0) || 1);
    const base = makeScore(mood, seed);
    if (durationS == null) return base;
    return buildScore(mood, {
      durationS,
      seed,
      space: base.space,
      soundmark: base.soundmark,
      hour: base.hour,
      fadeOut: true,
    });
  }

  async function exportWav() {
    const sc = await currentOrNewScore(EXPORT_SECONDS);
    if (!sc) return;
    els.wav.disabled = true;
    exportStatus(t('soundscapeRendering') || 'Sto componendo…');
    try {
      const buf = await renderScoreOffline(sc, { sampleRate: 44100, volume: prefs.volume });
      const wav = encodeWav16([buf.getChannelData(0), buf.getChannelData(1)], buf.sampleRate, { seed: sc.seed });
      download(`auscultrix-paesaggio-${sc.seed}.wav`, new Blob([wav], { type: 'audio/wav' }));
      exportStatus(t('soundscapeExported') || 'Fatto.');
    } catch (err) {
      console.warn('soundscape export failed', err);
      exportStatus(t('soundscapeExportFailed') || 'Non sono riuscito a esportare.');
    } finally {
      els.wav.disabled = false;
    }
  }

  async function exportScore() {
    const sc = await currentOrNewScore();
    if (!sc) return;
    const doc = {
      generator: `Auscultrix ${chrome.runtime.getManifest?.().version || ''}`.trim(),
      engine: SOUNDSCAPE_VERSION,
      note: 'Numbers only: valence and arousal of the declared state, ISO target, sound parameters. No typed text.',
      mapping: MAPPING_TABLE,
      summary: summarizeScore(sc),
      score: sc,
    };
    download(`auscultrix-partitura-${sc.seed}.json`, new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    exportStatus(t('soundscapeExported') || 'Fatto.');
  }

  async function exportPd() {
    const sc = await currentOrNewScore();
    if (!sc) return;
    const c = player ? player.current() : sc.controls[0];
    const src = buildPdPatch({ root: sc.root, valence: c.valence, arousal: c.arousal, soundmark: sc.soundmark, hour: sc.hour, title: `Auscultrix seed ${sc.seed}` });
    download(`auscultrix-${sc.seed}.pd`, new Blob([src], { type: 'text/plain' }));
    exportStatus(t('soundscapeExported') || 'Fatto.');
  }

  els.play.addEventListener('click', () => {
    play().catch((err) => console.warn('soundscape play failed', err));
  });
  els.stop.addEventListener('click', () => {
    stop().catch(() => {});
  });
  els.volume.addEventListener('input', () => {
    readPrefs();
    player?.setVolume(prefs.volume);
  });
  for (const k of ['space', 'soundmark', 'minutes', 'useDefault']) {
    els[k].addEventListener('change', () => readPrefs());
  }
  els.wav.addEventListener('click', () => exportWav().catch(() => {}));
  els.score.addEventListener('click', () => exportScore().catch(() => {}));
  els.pd.addEventListener('click', () => exportPd().catch(() => {}));

  loadPrefs().catch(() => {});

  return {
    play,
    stop,
    isPlaying: () => !!player,
    usedByDefault: () => !!els.useDefault.checked,
    /** call synchronously inside a click so the AudioContext may start */
    prime: () => audioContext(),
    reloadPrefs: () => loadPrefs(),
  };
}
