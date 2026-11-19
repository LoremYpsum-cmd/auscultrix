/**
 * Side panel UI — mood session, curated creator Spotify library, multi-player playback, VJ.
 * Product: Auscultrix (selection from Auscultrix’s curated catalog).
 * UI strings: chrome.i18n packs (en / it) with optional storage.uiLanguage override.
 */

import { analyzeMoodHeuristic } from './lib/mood.js';
import { assessSafety, SUPPORT } from './lib/safety.js';
import { compressImageToDataUrl, inferMoodFromImage } from './lib/mood-from-image.js';
import { generatePlaylist } from './lib/playlist.js';
import { generateBandcampPlaylist } from './lib/bandcamp-select.js';
import {
  bandcampYoutubeTracks,
  hydrateEmergenteCatalog,
} from './lib/bandcamp-youtube-corpus.js';
import {
  DEFAULT_PROVIDER_ID,
  listProviders,
  bandcampSongPageUrl,
  trackHasBandcampPresence,
} from './lib/playback-providers.js';
import { baselineTips, sessionMoodGuideTips } from './lib/wellbeing-tips.js';
import {
  applyDomI18n,
  initUiLanguage,
  persistUiLanguage,
  t,
  uiLocale,
} from './lib/i18n.js';
import { CREATOR_PROFILES } from './lib/creator-profiles.js';
import { loadLibrarySeed } from './lib/library-seed.js';
import {
  LIKED_SONGS_BUNDLE_VERSION,
  loadLikedSongsLibrary,
  mergeCuratorWithLikedSongs,
  mergeSeedMirFeatures,
} from './lib/liked-songs-library.js';
import { mergeKnownLibrary } from './lib/musictherapy-corpus.js';
import {
  applyLyricFeaturesToPool,
  enrichLyricsInBackground,
  loadLyricsCache,
  LYRICS_CACHE_KEY,
} from './lib/lyrics.js';
import {
  applyUserPrior,
  clearUserModel,
  recordMoodEntry,
  userModelSummary,
} from './lib/user-model.js';
import { goodreadsUrl, recommendBooks } from './lib/bibliotherapy.js';
import {
  recommendFilmSet,
  recommendFilms,
  tmdbDiscoveryUrl,
  tmdbUrl,
} from './lib/cinematherapy.js';
import {
  otherMediaUrl,
  recommendOtherMedia,
  recommendSeries,
  tmdbTvUrl,
} from './lib/care-media.js';
import { recommendVideogames } from './lib/videogames.js';
import { gameStoreUrl } from './lib/media-links.js';
import {
  CARE_ACCESS_FREE,
  CARE_ACCESS_PAID_OK,
  itemIsFreeAccess,
} from './lib/care-access.js';
import {
  MUSIC_LANGUAGE_NATIVE,
  normalizeMusicLanguageMode,
} from './lib/music-language.js';
import {
  GEO_DEFAULT,
  GEO_STORAGE_KEY,
  GEO_WORLD,
  cascadeFromZoneId,
  listGeoCitiesForUi,
  listGeoCountriesForUi,
  listGeoProvincesForUi,
  listGeoRegionsForUi,
  migrateLanguageModeToGeo,
  musicGeoStatusLine,
  normalizeMusicGeoZone,
  zoneIdFromCascade,
} from './lib/music-geo.js';
import {
  MUSIC_CATALOG_DEFAULT,
  MUSIC_CATALOG_EMERGING,
  MUSIC_CATALOG_KEY,
  MUSIC_CATALOG_KNOWN,
  normalizeMusicCatalogMode,
} from './lib/music-catalog.js';
import { kidsMusicStatusLine } from './lib/listener-age.js';
import {
  clearSessionState,
  getPlayerTabId,
  getSessionSafetyLevel,
  isPlayerDetached,
  isSessionActive,
  setSessionSafetyLevel,
} from './lib/session-state.js';
import { isAffectGrounded } from './lib/affect-provenance.js';
import { createSoundscapePanel } from './lib/soundscape-panel.js';
import { renderDiaryMap } from './lib/diary-map.js';
import { BUILD_FLAGS } from './lib/build-flags.js';
import { careContentNote, publicCareNote } from './lib/care-safety.js';
import { loadVoices, pickLocalVoice } from './lib/tts-voice.js';
import {
  LYRICS_LOOKUP_KEY,
  keysToErase,
  LEGACY_PERSONAL_LOCAL_KEYS,
  persistableMood,
  SESSION_IMAGE_KEYS,
} from './lib/data-inventory.js';

const HIDE_DISCLAIMER_PIP_KEY = 'hideClinicalDisclaimerPip';
const HIDE_DONATION_PIP_KEY = 'hideDonationPip';
/** Mood photo lives in chrome.storage.session only (never on disk). */
const MOOD_IMAGE_KEY = SESSION_IMAGE_KEYS.image;
const MOOD_IMAGE_FEELING_KEY = SESSION_IMAGE_KEYS.feeling;
/** The person switched Vision off: never switch it back on by itself. */
const VJ_USER_OPT_OUT_KEY = 'vjUserOptOut';
/** Persistent memory of already-offered tracks (novelty engine). */
const RECOMMENDED_HISTORY_KEY = 'recommendedHistoryV1';
const RECOMMENDED_HISTORY_MAX = 400;
/** Persistent memory of already-offered care media (books/films/series/other). */
const CARE_HISTORY_KEY = 'careHistoryV1';
const CARE_HISTORY_MAX = 200;
/** Soft cap for stored JPEG data URL (~storage-friendly). */
const MOOD_IMAGE_MAX_CHARS = 180_000;
/** Delay before donation PiP after a listening session ends. */
const DONATION_PIP_DELAY_MS = 14_000;
const PAYPAL_DONATE_URL =
  'https://paypal.me/rinocaccamoleafox?locale.x=it_IT&country.x=IT';

const els = {
  moodInput: document.getElementById('mood-input'),
  energySlider: document.getElementById('energy-slider'),
  energyValue: document.getElementById('energy-value'),
  btnStart: document.getElementById('btn-start'),
  btnChooseForMe: document.getElementById('btn-choose-for-me'),
  chooseStatus: document.getElementById('choose-status'),
  btnTts: document.getElementById('btn-tts'),
  yourDataSummary: document.getElementById('your-data-summary'),
  yourDataStatus: document.getElementById('your-data-status'),
  btnClearData: document.getElementById('btn-clear-data'),
  therapyMediaSection: document.getElementById('therapy-media-section'),
  therapyBooks: document.getElementById('therapy-books'),
  therapyFilmsFree: document.getElementById('therapy-films-free'),
  therapyFilmsPaid: document.getElementById('therapy-films-paid'),
  therapySeries: document.getElementById('therapy-series'),
  therapyOtherFree: document.getElementById('therapy-other-free'),
  therapyOtherPaid: document.getElementById('therapy-other-paid'),
  therapyGamesFree: document.getElementById('therapy-games-free'),
  therapyGamesPaid: document.getElementById('therapy-games-paid'),
  insightSection: document.getElementById('insight-section'),
  insightText: document.getElementById('insight-text'),
  therapyText: document.getElementById('therapy-text'),
  playlistSection: document.getElementById('playlist-section'),
  playlistList: document.getElementById('playlist-list'),
  playlistCalibration: document.getElementById('playlist-calibration'),
  btnPlaylistToggle: document.getElementById('btn-playlist-toggle'),
  lyricsToggle: document.getElementById('lyrics-toggle'),
  btnPlay: document.getElementById('btn-play'),
  btnNext: document.getElementById('btn-next'),
  btnStop: document.getElementById('btn-stop'),
  btnMoreResults: document.getElementById('btn-more-results'),
  btnMoreMedia: document.getElementById('btn-more-media'),
  ffAudioBanner: document.getElementById('ff-audio-banner'),
  ffAudioBannerClose: document.getElementById('ff-audio-banner-close'),
  nowPlaying: document.getElementById('now-playing'),
  vjToggle: document.getElementById('vj-toggle'),
  providerSelect: document.getElementById('provider-select'),
  providerHint: document.getElementById('provider-hint'),
  musicCatalogEmerging: document.getElementById('music-catalog-emerging'),
  musicCatalogKnown: document.getElementById('music-catalog-known'),
  musicGeoCountry: document.getElementById('music-geo-country'),
  musicGeoRegion: document.getElementById('music-geo-region'),
  musicGeoProvince: document.getElementById('music-geo-province'),
  musicGeoCity: document.getElementById('music-geo-city'),
  musicGeoStatus: document.getElementById('music-geo-status'),
  baselineTips: document.getElementById('baseline-tips'),
  sessionPip: document.getElementById('session-pip'),
  sessionPipList: document.getElementById('session-pip-list'),
  sessionPipClose: document.getElementById('session-pip-close'),
  moodImageInput: document.getElementById('mood-image-input'),
  moodImageDrop: document.getElementById('mood-image-drop'),
  moodImageDropIdle: document.getElementById('mood-image-drop-idle'),
  moodImagePreview: document.getElementById('mood-image-preview'),
  moodImageHint: document.getElementById('mood-image-hint'),
  moodImageStatus: document.getElementById('mood-image-status'),
  moodFeelingWrap: document.getElementById('mood-feeling-wrap'),
  moodImageFeeling: document.getElementById('mood-image-feeling'),
  btnMoodAnalyze: document.getElementById('btn-mood-analyze'),
  btnMoodImageClear: document.getElementById('btn-mood-image-clear'),
  uiLangBtn: document.getElementById('ui-lang-btn'),
  uiLangMenu: document.getElementById('ui-lang-menu'),
  uiLangFlag: document.getElementById('ui-lang-flag'),
  uiLangCode: document.getElementById('ui-lang-code'),
  disclaimerPip: document.getElementById('disclaimer-pip'),
  disclaimerPipHide: document.getElementById('disclaimer-pip-hide'),
  disclaimerPipClose: document.getElementById('disclaimer-pip-close'),
  donationPip: document.getElementById('donation-pip'),
  donationPipHide: document.getElementById('donation-pip-hide'),
  donationPipLater: document.getElementById('donation-pip-later'),
  donationPipDonate: document.getElementById('donation-pip-donate'),
  trackPip: document.getElementById('track-pip'),
  trackPipBody: document.getElementById('track-pip-body'),
  trackPipOpen: document.getElementById('track-pip-open'),
  trackPipClose: document.getElementById('track-pip-close'),
  brand: document.getElementById('brand'),
  brandVersion: document.getElementById('brand-version'),
  brandSrOnly: document.getElementById('brand-sr-only'),
};

/** @type {object[]} active pool (music therapy corpus + curator profile) */
let tracks = [];
/** @type {object[]} curator Spotify profile tracks (complementary variety) */
let curatorTracks = [];
/** @type {object|null} */
let mood = null;
/** @type {object[]} */
let playlist = [];
let playlistIndex = 0;
/** @type {string[]} */
let playedIds = [];
/** @type {string[]} ids of every track ever offered (capped, persisted) */
let recommendedHistory = [];
/** Skip-signal: neighbourhoods rejected by quick skips, session-only (never stored). */
let sessionAvoid = [];
/** When the current track started playing (to detect quick manual skips). */
let sessionPlayStartAt = 0;
/** A skip counts as rejection when the track played less than this. */
const QUICK_SKIP_MS = 30_000;
/** @type {string[]} ids of every care-media item ever offered (capped, persisted) */
let careHistoryIds = [];
/** Seed for care-media ranking: renewed on every new session, stable otherwise. */
let therapySeed = Math.floor(Date.now() / 3_600_000);
/** @type {object|null} */
let currentTrack = null;
let playbackProviderId = DEFAULT_PROVIDER_ID;
/** @type {string} publication zone id (world → country → …) */
let musicGeoZone = GEO_DEFAULT;
/** Last geo filter match count (null = unknown / world). */
let lastGeoMatchCount = null;
/** Care media still uses language mode (native to UI); not shown in music prefs. */
/** @type {'native'|'international'} */
let musicLanguageMode = MUSIC_LANGUAGE_NATIVE;
/** @type {'free'|'paid_ok'} */
let careAccessMode = CARE_ACCESS_FREE;
/** @type {'known'|'emerging'} */
let musicCatalogMode = MUSIC_CATALOG_DEFAULT;
/** @type {'spotify'|'seed'|null} */
let librarySource = null;
/** @type {string|null} compressed mood image data URL */
let moodImageDataUrl = null;
/** @type {string|null} last auto mood phrase from image */
let moodImagePhrase = null;
/** @type {HTMLElement[]} */
let pipFocusables = [];
/** @type {HTMLElement|null} */
let pipPreviousFocus = null;
/** @type {HTMLElement|null} currently open dream PiP */
let activePip = null;
/** @type {object|null} mood waiting for session PiP after clinical dismiss */
let pendingSessionMood = null;
/** True while a listening session is underway (Inizia / play until Stop or player tab close). */
let sessionActive = false;
/** @type {ReturnType<typeof setTimeout>|null} */
let donationTimerId = null;
/** Show donation PiP once disclaimer (or other PiP) closes. */
let pendingDonationPip = false;
/** Highest safety level seen in this browser session ('none' | 'substance' | 'crisis'). */
let sessionSafety = 'none';
/** Guards against rapid repeated activation of long actions (double clicks). */
let startInFlight = false;
let chooseInFlight = false;
let regenerateInFlight = false;
/** Latest play request wins: older pending plays are dropped. */
let playRequestSeq = 0;
/** Show the whole playlist (otherwise only the next few tracks). */
let playlistExpanded = false;
const PLAYLIST_PREVIEW_COUNT = 6;
/** Calibration summary of the current playlist (ISO honesty). */
let lastCalibration = null;

function fillProviderSelect(selectedId) {
  const providers = listProviders();
  if (!els.providerSelect) return;
  els.providerSelect.replaceChildren();
  for (const p of providers) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    els.providerSelect.appendChild(opt);
  }
  const next = providers.some((p) => p.id === selectedId) ? selectedId : DEFAULT_PROVIDER_ID;
  playbackProviderId = next;
  els.providerSelect.value = next;
}

/**
 * Sync top-right language control with effective UI locale.
 */
function syncUiLangControl() {
  const lang = uiLocale();
  const flag = lang === 'it' ? '🇮🇹' : '🇬🇧';
  const code = lang === 'it' ? 'IT' : 'EN';
  if (els.uiLangFlag) els.uiLangFlag.textContent = flag;
  if (els.uiLangCode) els.uiLangCode.textContent = code;
  document.querySelectorAll('#ui-lang-menu [data-lang]').forEach((opt) => {
    const selected = opt.getAttribute('data-lang') === lang;
    opt.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function setUiLangMenuOpen(open) {
  if (!els.uiLangMenu || !els.uiLangBtn) return;
  els.uiLangMenu.classList.toggle('hidden', !open);
  els.uiLangBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    // Escape panel stacking: pin to viewport so Presence/mood sections
    // cannot cover the listbox (root cause of “language button does nothing”).
    const r = els.uiLangBtn.getBoundingClientRect();
    els.uiLangMenu.classList.add('is-fixed');
    els.uiLangMenu.style.top = `${Math.round(r.bottom + 4)}px`;
    els.uiLangMenu.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
    els.uiLangMenu.style.left = 'auto';
    els.uiLangMenu.style.zIndex = '3000';
  } else {
    els.uiLangMenu.classList.remove('is-fixed');
    els.uiLangMenu.style.top = '';
    els.uiLangMenu.style.right = '';
    els.uiLangMenu.style.left = '';
    els.uiLangMenu.style.zIndex = '';
  }
}

/**
 * Show manifest version next to the brand (keeps in sync with manifest.json).
 */
function fillBrandVersion() {
  let version = '';
  try {
    version = chrome.runtime?.getManifest?.()?.version || '';
  } catch {
    version = '';
  }
  if (!version || !els.brandVersion) return;
  els.brandVersion.textContent = version;
  const label =
    t('brandWithVersionAria', version) || `Auscultrix version ${version}`;
  if (els.brand) els.brand.setAttribute('aria-label', label);
  if (els.brandSrOnly) els.brandSrOnly.textContent = label;
}

/**
 * Re-apply chrome messages after language change (tips, providers, status).
 */
function refreshLocalizedChrome() {
  applyDomI18n();
  fillBrandVersion();
  syncUiLangControl();
  fillProviderSelect(playbackProviderId);
  syncMusicGeoUi();
  syncMusicCatalogUi();
  renderPresenceGuide();
  if (mood && els.sessionPip && !els.sessionPip.classList.contains('hidden')) {
    renderTipList(els.sessionPipList, sessionMoodGuideTips(mood));
  }
  if (mood) showInsight(mood);
  if (els.moodImageHint && !moodImageDataUrl) {
    els.moodImageHint.textContent = t('moodImagePrivacy') || t('moodImageHint');
  }
  syncChooseForMeUi();
  renderUserDataPanel().catch(() => {});
  if (mood) renderTherapyMedia(mood);
}

function setProviderHint(text, { live = false } = {}) {
  els.providerHint.textContent = text || '';
  els.providerHint.classList.toggle('has-live', live && !!text);
}

function updateProviderHint() {
  setProviderHint('', { live: false });
  if (els.vjToggle) els.vjToggle.disabled = false;
}

function buildSessionPlaylist() {
  const opts = {
    size: 40,
    sessionSeed: Date.now(),
    recentlyRecommendedTrackIds: recommendedHistory.slice(-RECOMMENDED_HISTORY_MAX),
    musicGeoZone,
    uiLocale: uiLocale(),
    kidsMode: !!mood?.kidsMode,
    listenerAge: mood?.listenerAge ?? null,
    ageBand: mood?.ageBand || 'adult',
    avoidNeighborhood: sessionAvoid,
  };
  const generated =
    musicCatalogMode === MUSIC_CATALOG_EMERGING
      ? generateBandcampPlaylist(tracks, mood, opts)
      : generatePlaylist(tracks, mood, opts);
  lastGeoMatchCount = generated.geoFiltered
    ? (generated.geoMatchCount ?? generated.tracks?.length ?? 0)
    : null;
  lastCalibration = generated.calibration || null;
  playlistExpanded = false;
  syncMusicGeoStatus();
  rememberRecommendations(generated.tracks);
  scheduleLyricsEnrichment(generated.tracks);
  return generated;
}

/** Persist offered track ids so future sessions favour new music. */
function rememberRecommendations(list) {
  if (!list?.length) return;
  const seen = new Set(recommendedHistory);
  for (const track of list) {
    if (!track?.id || seen.has(track.id)) continue;
    recommendedHistory.push(track.id);
    seen.add(track.id);
  }
  if (recommendedHistory.length > RECOMMENDED_HISTORY_MAX) {
    recommendedHistory = recommendedHistory.slice(-RECOMMENDED_HISTORY_MAX);
  }
  chrome.storage.local
    .set({ [RECOMMENDED_HISTORY_KEY]: recommendedHistory })
    .catch?.(() => {});
}

function fillSelectOptions(selectEl, options, { placeholder, value, enabled }) {
  if (!selectEl) return;
  selectEl.replaceChildren();
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder;
  selectEl.appendChild(ph);
  for (const opt of options) {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    selectEl.appendChild(el);
  }
  const ok = options.some((o) => o.value === value);
  selectEl.value = ok ? value : '';
  selectEl.disabled = !enabled;
}

function readMusicGeoCascadeFromDom() {
  return {
    country: els.musicGeoCountry?.value || '',
    region: els.musicGeoRegion?.value || '',
    province: els.musicGeoProvince?.value || '',
    city: els.musicGeoCity?.value || '',
  };
}

function fillMusicGeoCascade() {
  const locale = uiLocale();
  const worldLabel =
    t('musicGeoWorld') ||
    (locale === 'en' ? 'Start here: from the world' : 'Parti da qui: dal mondo');
  const anyLabel = t('musicGeoAny') || (locale === 'en' ? '—' : '—');
  const cascade = cascadeFromZoneId(musicGeoZone);

  // Country (level 1)
  if (els.musicGeoCountry) {
    els.musicGeoCountry.replaceChildren();
    const worldOpt = document.createElement('option');
    worldOpt.value = '';
    worldOpt.textContent = worldLabel;
    els.musicGeoCountry.appendChild(worldOpt);
    for (const c of listGeoCountriesForUi(locale)) {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = locale === 'en' ? c.labelEn : c.labelIt;
      els.musicGeoCountry.appendChild(opt);
    }
    const countryOk = listGeoCountriesForUi(locale).some(
      (c) => c.value === cascade.country,
    );
    els.musicGeoCountry.value = countryOk ? cascade.country : '';
    els.musicGeoCountry.disabled = false;
  }

  const country = els.musicGeoCountry?.value || '';
  const regions = country
    ? listGeoRegionsForUi(country, locale).map((r) => ({
        value: r.value,
        label: locale === 'en' ? r.labelEn : r.labelIt,
      }))
    : [];
  const regionWanted = country ? cascade.region : '';
  fillSelectOptions(els.musicGeoRegion, regions, {
    placeholder: anyLabel,
    value: regionWanted,
    enabled: Boolean(country) && regions.length > 0,
  });

  const region = els.musicGeoRegion?.value || '';
  const provinces = country
    ? listGeoProvincesForUi(country, region, locale).map((p) => ({
        value: p.value,
        label: locale === 'en' ? p.labelEn : p.labelIt,
      }))
    : [];
  // Only keep stored province if it is a distinct cascade option
  const provinceWanted =
    country && provinces.some((p) => p.value === cascade.province)
      ? cascade.province
      : '';
  fillSelectOptions(els.musicGeoProvince, provinces, {
    placeholder: anyLabel,
    value: provinceWanted,
    enabled: Boolean(country) && provinces.length > 0,
  });

  const province = els.musicGeoProvince?.value || '';
  const cities = country
    ? listGeoCitiesForUi(country, region, province, locale).map((c) => ({
        value: c.value,
        label: locale === 'en' ? c.labelEn : c.labelIt,
      }))
    : [];
  const cityWanted = country ? cascade.city : '';
  fillSelectOptions(els.musicGeoCity, cities, {
    placeholder: anyLabel,
    value: cityWanted,
    enabled: Boolean(country) && cities.length > 0,
  });
}

function syncMusicGeoUi() {
  fillMusicGeoCascade();
  syncMusicGeoStatus();
}

function syncMusicGeoStatus() {
  if (!els.musicGeoStatus) return;
  const geoLine = musicGeoStatusLine(musicGeoZone, uiLocale(), {
    matchCount: lastGeoMatchCount,
  });
  const kidsLine = kidsMusicStatusLine(
    mood?.kidsMode
      ? {
          age: mood.listenerAge ?? null,
          ageBand: mood.ageBand || '4-7',
          kidsMode: true,
          signal: mood.listenerAgeSignal || '',
        }
      : null,
    uiLocale(),
  );
  const line = [kidsLine, geoLine].filter(Boolean).join(' · ');
  els.musicGeoStatus.textContent = line;
  els.musicGeoStatus.hidden = !line;
}

function onMusicGeoCascadeChange(changedLevel) {
  const sel = readMusicGeoCascadeFromDom();
  // Climb-up: clearing a parent clears deeper fields via DOM refill after apply
  if (changedLevel === 'country') {
    sel.region = '';
    sel.province = '';
    sel.city = '';
  } else if (changedLevel === 'region') {
    sel.province = '';
    sel.city = '';
  } else if (changedLevel === 'province') {
    sel.city = '';
  }
  const zone = zoneIdFromCascade(sel);
  applyMusicGeoZone(zone, { rebuild: true, userChosen: true }).catch(() => {});
}

function syncMusicCatalogUi() {
  const emerging = musicCatalogMode === MUSIC_CATALOG_EMERGING;
  if (els.musicCatalogEmerging) {
    els.musicCatalogEmerging.setAttribute('aria-checked', emerging ? 'true' : 'false');
  }
  if (els.musicCatalogKnown) {
    els.musicCatalogKnown.setAttribute('aria-checked', emerging ? 'false' : 'true');
  }
}

async function applyMusicCatalogMode(mode, { rebuild = true } = {}) {
  musicCatalogMode = normalizeMusicCatalogMode(mode);
  syncMusicCatalogUi();
  rebuildTrackPool();
  await chrome.storage.local.set({ [MUSIC_CATALOG_KEY]: musicCatalogMode });
  if (!rebuild || !mood) return;
  const generated = buildSessionPlaylist();
  playlist = generated.tracks;
  playlistIndex = 0;
  currentTrack = null;
  await persistSession();
  renderPlaylist();
  enablePlayback();
}

/**
 * Rebuild suggestions when publication zone changes (keeps mood if present).
 */
async function applyMusicGeoZone(zoneId, { rebuild = true, userChosen = true } = {}) {
  musicGeoZone = normalizeMusicGeoZone(zoneId);
  if (musicGeoZone === GEO_DEFAULT) lastGeoMatchCount = null;
  syncMusicGeoUi();
  const patch = { [GEO_STORAGE_KEY]: musicGeoZone };
  if (userChosen) patch.musicGeoUserChosen = true;
  await chrome.storage.local.set(patch);
  if (mood) renderTherapyMedia(mood);
  if (!rebuild || !mood) return;

  const generated = buildSessionPlaylist();
  playlist = generated.tracks;
  playlistIndex = 0;
  currentTrack = null;
  await persistSession();
  renderPlaylist();
  enablePlayback();
}

/** @deprecated language UI removed — kept for care media soft hint */
async function applyMusicLanguageMode(mode, { rebuild = true, userChosen = true } = {}) {
  musicLanguageMode = normalizeMusicLanguageMode(mode);
  const patch = { musicLanguageMode };
  if (userChosen) patch.musicLanguageUserChosen = true;
  await chrome.storage.local.set(patch);
  if (mood) renderTherapyMedia(mood);
  if (!rebuild || !mood || !tracks.length) return;
}

/** Lyric-derived features cache (id → {lyricValence, lyricArousal, confidence, themes}). */
let lyricsCache = {};

/**
 * Active pool = music therapy corpus (primary, literature-grounded) +
 * curator profile tracks (complementary variety, deduped against corpus),
 * refined with locally-derived lyric features where available.
 */
function rebuildTrackPool() {
  const pool =
    musicCatalogMode === MUSIC_CATALOG_KNOWN
      ? mergeKnownLibrary(curatorTracks)
      : bandcampYoutubeTracks();
  tracks = applyLyricFeaturesToPool(pool, lyricsCache);
}

/**
 * After a playlist is generated: fetch lyrics for its first tracks from the
 * open LRCLIB archive (throttled), analyze them on-device, keep only numbers.
 * The refined coordinates enter the pool at the next rebuild.
 */
function scheduleLyricsEnrichment(list) {
  // Opt-in only: reading lyrics sends title and artist to lrclib.net.
  if (!els.lyricsToggle?.checked) return;
  const pending = (list || []).filter((t) => t?.id && !lyricsCache[t.id]);
  if (!pending.length) return;
  enrichLyricsInBackground(pending.slice(0, 15))
    .then(async (added) => {
      if (added > 0) {
        lyricsCache = await loadLyricsCache();
        rebuildTrackPool();
      }
    })
    .catch(() => {});
}

/**
 * Curator profile: Liked Songs geo catalog (9350) lives in the packaged JSON
 * and is held in memory for Varia. Spotify sync overlays MIR/artwork
 * when present. We do **not** persist the full 9350 into chrome.storage
 * (10 MB quota); only sync snapshots / legacy seeds stay there.
 */
async function loadLibrary() {
  const data = await chrome.storage.local.get([
    'tracks',
    'librarySource',
    'likedSongsBundleVersion',
  ]);

  let liked = null;
  try {
    liked = await loadLikedSongsLibrary();
  } catch (err) {
    console.warn('liked songs library failed', err);
  }

  const live = Array.isArray(data.tracks) ? data.tracks : [];
  const liveIsSpotify = data.librarySource === 'spotify' && live.length > 0;
  // Ignore tiny legacy MIR seed once the Liked Songs bundle is available.
  const liveForMerge = liveIsSpotify
    ? live
    : liked && live.length < (liked.tracks?.length || 0) * 0.5
      ? []
      : live;

  if (liked?.tracks?.length) {
    curatorTracks = mergeCuratorWithLikedSongs(liveForMerge, liked);
    // Keep the empirical base: MIR features measured on audio previews
    // (data/library-seed.json) re-attached even when offline.
    try {
      const seed = await loadLibrarySeed();
      curatorTracks = mergeSeedMirFeatures(curatorTracks, seed.tracks).tracks;
    } catch (err) {
      console.warn('MIR seed merge failed', err);
    }
    librarySource = liveIsSpotify ? 'spotify' : 'liked_songs';
    const bundleVersion = liked.meta?.version ?? LIKED_SONGS_BUNDLE_VERSION;
    if (data.likedSongsBundleVersion !== bundleVersion || data.librarySource === 'seed') {
      const patch = {
        likedSongsBundleVersion: bundleVersion,
        trackCount: curatorTracks.length,
        selectionProvider: 'Auscultrix',
      };
      if (data.librarySource === 'seed' || !data.librarySource) {
        patch.librarySource = 'liked_songs';
        // Drop legacy seed rows from storage to free quota.
        if (!liveIsSpotify) patch.tracks = [];
      }
      await chrome.storage.local.set(patch);
    }
  } else if (live.length > 0) {
    curatorTracks = live;
    librarySource = data.librarySource || 'spotify';
  } else {
    await loadBundledSeed();
  }

  lyricsCache = await loadLyricsCache();
  rebuildTrackPool();
}

async function loadBundledSeed() {
  try {
    const liked = await loadLikedSongsLibrary();
    curatorTracks = liked.tracks;
    librarySource = 'liked_songs';
    await chrome.storage.local.set({
      trackCount: curatorTracks.length,
      artistCounts: {},
      genreCounts: {},
      librarySource: 'liked_songs',
      likedSongsBundleVersion: liked.meta?.version ?? LIKED_SONGS_BUNDLE_VERSION,
      selectionProvider: 'Auscultrix',
    });
    return;
  } catch {
    /* fall through to legacy MIR seed */
  }
  try {
    const seed = await loadLibrarySeed();
    curatorTracks = seed.tracks;
    librarySource = 'seed';
    await chrome.storage.local.set({
      tracks: curatorTracks,
      trackCount: curatorTracks.length,
      artistCounts: seed.artistCounts,
      genreCounts: {},
      librarySource: 'seed',
      selectionProvider: 'Auscultrix',
    });
  } catch (err) {
    curatorTracks = [];
    librarySource = null;
    console.warn('bundled seed failed', err);
  }
}

async function applySyncedLibraryFromStorage() {
  const data = await chrome.storage.local.get(['tracks', 'librarySource']);
  if (!Array.isArray(data.tracks) || data.tracks.length === 0) return;
  let liked = null;
  try {
    liked = await loadLikedSongsLibrary();
  } catch {
    liked = null;
  }
  curatorTracks = liked
    ? mergeCuratorWithLikedSongs(data.tracks, liked)
    : data.tracks;
  librarySource = data.librarySource || 'spotify';
  rebuildTrackPool();
}

/* --------------------- Your data (local user model panel) --------------------- */

async function renderUserDataPanel() {
  if (els.yourDataSummary) {
    try {
      els.yourDataSummary.textContent = await userModelSummary(uiLocale());
    } catch {
      els.yourDataSummary.textContent = '';
    }
  }
  try {
    await renderDiaryMap({
      mapEl: document.getElementById('diary-map'),
      captionEl: document.getElementById('diary-map-caption'),
      tableEl: document.getElementById('diary-table'),
    });
  } catch (err) {
    console.warn('diary map failed', err);
  }
}

/**
 * Generative soundscape (lib/soundscape*.js). Without a mood yet, pressing
 * «Ascolta il paesaggio» reads the diary exactly as «Inizia» does.
 */
const soundscape = createSoundscapePanel({
  getMood: () => mood,
  ensureMood: async () => {
    // no words: the energy slider alone still gives a starting point
    const energy = Number(els.energySlider.value) / 100;
    mood = analyzeMoodHeuristic({ input: composeMoodInput(), energy });
    mood = await applyUserPrior(mood);
    noteSafetyFromAnalysis(mood);
    renderSafety(mood.rawInput || '');
    showInsight(mood);
    recordMoodEntry(mood, { activity: 'soundscape' })
      .then(() => renderUserDataPanel())
      .catch(() => {});
    return mood;
  },
  isCrisis: (m) => isCrisis(m),
  onWillPlay: async () => {
    // one listening at a time: the YouTube session gives way
    if (sessionActive || currentTrack) await endListeningSession({ reason: 'soundscape' });
  },
});

async function clearAllLocalData() {
  cancelDonationTimer();
  soundscape?.stop().catch(() => {});
  sessionActive = false;
  await closeDonationPip({ persistHide: false }).catch(() => {});
  // Stop the worker's session first, so no late write (palette, current
  // track) can re-create what is being erased.
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_SESSION', reason: 'erase' });
  } catch {
    // SW may be asleep
  }
  await clearSessionState().catch(() => {});
  await clearUserModel();
  // Full erase: every key except the non-personal catalogue caches
  // (lib/data-inventory.js is the single list of what is stored and why).
  const present = Object.keys(await chrome.storage.local.get(null));
  const remove = keysToErase(present);
  if (remove.length) await chrome.storage.local.remove(remove);
  await clearSessionState().catch(() => {});
  try {
    await chrome.storage.session?.remove?.([MOOD_IMAGE_KEY, MOOD_IMAGE_FEELING_KEY]);
  } catch {
    // ignore
  }
  // Safe defaults again (Vision off, photosensitive-safe on, YouTube player).
  await chrome.storage.local.set({
    vjEnabled: false,
    vjPhotosensitiveSafe: true,
    playbackProviderId: DEFAULT_PROVIDER_ID,
  });
  mood = null;
  playlist = [];
  playlistIndex = 0;
  playedIds = [];
  recommendedHistory = [];
  careHistoryIds = [];
  lyricsCache = {};
  currentTrack = null;
  sessionSafety = 'none';
  lastCalibration = null;
  if (els.vjToggle) els.vjToggle.checked = false;
  if (els.lyricsToggle) els.lyricsToggle.checked = false;
  if (els.btnMoreMedia) els.btnMoreMedia.disabled = true;
  setMoodImagePreview(null);
  els.moodInput.value = '';
  renderSafety('');
  els.insightSection?.classList.add('hidden');
  els.playlistSection?.classList.add('hidden');
  els.therapyMediaSection?.classList.add('hidden');
  els.nowPlaying.textContent = t('nowPlayingEmpty') || '—';
  enablePlayback();
  syncChooseForMeUi();
  await soundscape?.reloadPrefs();
  await renderUserDataPanel();
  if (els.yourDataStatus) {
    els.yourDataStatus.textContent = t('yourDataCleared');
    els.yourDataStatus.hidden = false;
    setTimeout(() => {
      if (els.yourDataStatus) els.yourDataStatus.hidden = true;
    }, 4000);
  }
}

async function loadPersisted() {
  const data = await chrome.storage.local.get([
    'mood',
    'playlist',
    'playlistIndex',
    'playedIds',
    'currentTrack',
    'vjEnabled',
    'playbackProviderId',
    'musicLanguageMode',
    GEO_STORAGE_KEY,
    'musicGeoUserChosen',
    'careAccessMode',
    MUSIC_CATALOG_KEY,
    RECOMMENDED_HISTORY_KEY,
    CARE_HISTORY_KEY,
    LYRICS_LOOKUP_KEY,
  ]);
  // ≤ 5.0 kept the typed text (mood.rawInput), the mood photo and tab ids on
  // disk. Purge them once; from now on they live in memory / session only.
  await chrome.storage.local.remove([...LEGACY_PERSONAL_LOCAL_KEYS]).catch(() => {});
  if (data.mood && (data.mood.rawInput != null || data.mood.motivationInfluences != null)) {
    data.mood = persistableMood(data.mood);
    await chrome.storage.local.set({ mood: data.mood }).catch(() => {});
  }
  sessionSafety = await getSessionSafetyLevel().catch(() => 'none');
  if (els.lyricsToggle) els.lyricsToggle.checked = data[LYRICS_LOOKUP_KEY] === true;

  mood = data.mood || null;
  playlist = data.playlist || [];
  playlistIndex = data.playlistIndex || 0;
  playedIds = data.playedIds || [];
  recommendedHistory = Array.isArray(data[RECOMMENDED_HISTORY_KEY])
    ? data[RECOMMENDED_HISTORY_KEY]
    : [];
  careHistoryIds = Array.isArray(data[CARE_HISTORY_KEY])
    ? data[CARE_HISTORY_KEY]
    : [];
  currentTrack = data.currentTrack || null;
  // A session is running only if the worker says so (browser-session flag);
  // a track left on disk by a previous browser session is not a running session.
  sessionActive = !!currentTrack && (await isSessionActive().catch(() => false));
  playbackProviderId = data.playbackProviderId || DEFAULT_PROVIDER_ID;
  musicCatalogMode = normalizeMusicCatalogMode(data[MUSIC_CATALOG_KEY] ?? MUSIC_CATALOG_DEFAULT);
  musicLanguageMode = normalizeMusicLanguageMode(
    data.musicLanguageMode ?? MUSIC_LANGUAGE_NATIVE,
  );
  if (data[GEO_STORAGE_KEY]) {
    musicGeoZone = normalizeMusicGeoZone(data[GEO_STORAGE_KEY]);
  } else if (data.musicLanguageMode && !data.musicGeoUserChosen) {
    musicGeoZone = migrateLanguageModeToGeo(data.musicLanguageMode, uiLocale());
    chrome.storage.local.set({ [GEO_STORAGE_KEY]: musicGeoZone }).catch?.(() => {});
  } else {
    musicGeoZone = GEO_DEFAULT;
  }
  careAccessMode = CARE_ACCESS_FREE;
  syncMusicGeoUi();
  syncMusicCatalogUi();

  if (data.vjEnabled !== undefined) els.vjToggle.checked = data.vjEnabled === true;

  fillProviderSelect(playbackProviderId);
  if (mood) showInsight(mood);
  if (playlist.length) {
    renderPlaylist();
    enablePlayback();
  }
  if (currentTrack) {
    els.nowPlaying.textContent = `${currentTrack.artist} — ${currentTrack.title}`;
    // the person is watching another video in the player tab: say so
    if (await isPlayerDetached().catch(() => false)) showPlayerDetached();
  }

  // Mood photo: restored only within the same browser session (memory storage).
  let img = {};
  try {
    img = (await chrome.storage.session?.get?.([MOOD_IMAGE_KEY, MOOD_IMAGE_FEELING_KEY])) || {};
  } catch {
    img = {};
  }
  if (typeof img[MOOD_IMAGE_KEY] === 'string' && img[MOOD_IMAGE_KEY].startsWith('data:image')) {
    setMoodImagePreview(img[MOOD_IMAGE_KEY], { analyze: false });
    if (typeof img[MOOD_IMAGE_FEELING_KEY] === 'string' && img[MOOD_IMAGE_FEELING_KEY]) {
      els.moodImageFeeling.value = img[MOOD_IMAGE_FEELING_KEY];
      els.moodFeelingWrap.classList.remove('hidden');
    }
  }
}

function setMoodImagePreview(dataUrl, { analyze = true } = {}) {
  moodImageDataUrl = dataUrl || null;
  if (els.moodImageStatus) {
    els.moodImageStatus.textContent = '';
    els.moodImageStatus.classList.add('hidden');
  }
  if (!moodImageDataUrl) {
    els.moodImagePreview.src = '';
    els.moodImagePreview.classList.add('hidden');
    els.moodImageDropIdle?.classList.remove('hidden');
    if (els.moodImageHint) {
      els.moodImageHint.textContent = t('moodImageHint');
      els.moodImageHint.classList.remove('hidden');
    }
    els.btnMoodAnalyze.disabled = true;
    els.btnMoodImageClear.classList.add('hidden');
    els.moodFeelingWrap.classList.add('hidden');
    els.moodImageFeeling.value = '';
    moodImagePhrase = null;
    syncChooseForMeUi();
    return;
  }
  els.moodImagePreview.src = moodImageDataUrl;
  els.moodImagePreview.classList.remove('hidden');
  els.moodImageDropIdle?.classList.add('hidden');
  // Keep the collapsible image block open while an image is loaded
  document.querySelector('.mood-image-fold')?.setAttribute('open', '');
  els.btnMoodAnalyze.disabled = false;
  els.btnMoodImageClear.classList.remove('hidden');
  syncChooseForMeUi();
  if (analyze) {
    analyzeMoodImage().catch(() => {});
  }
}

/** The photo stays in memory storage: survives reopening the panel, not the browser. */
async function persistMoodImage() {
  const area = chrome.storage.session;
  if (!area) return;
  try {
    if (moodImageDataUrl && moodImageDataUrl.length <= MOOD_IMAGE_MAX_CHARS) {
      await area.set({
        [MOOD_IMAGE_KEY]: moodImageDataUrl,
        [MOOD_IMAGE_FEELING_KEY]: els.moodImageFeeling?.value?.trim() || '',
      });
    } else {
      await area.remove([MOOD_IMAGE_KEY, MOOD_IMAGE_FEELING_KEY]);
    }
  } catch {
    // ignore: the photo simply will not be restored
  }
}

async function handleMoodImageFile(file) {
  if (!file || !String(file.type || '').startsWith('image/')) return;
  try {
    const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, quality: 0.7 });
    setMoodImagePreview(dataUrl, { analyze: true });
    await persistMoodImage();
  } catch (err) {
    console.warn('mood image failed', err);
    if (els.moodImageStatus) {
      els.moodImageStatus.textContent = t('moodImageError') || 'Image error';
      els.moodImageStatus.classList.remove('hidden');
    } else if (els.moodImageHint) {
      els.moodImageHint.textContent = t('moodImageError') || 'Image error';
      els.moodImageDropIdle?.classList.remove('hidden');
    }
  }
}

async function analyzeMoodImage() {
  if (!moodImageDataUrl) return;
  els.btnMoodAnalyze.disabled = true;
  if (els.moodImageStatus) {
    els.moodImageStatus.textContent = t('moodImageAnalyzing') || '…';
    els.moodImageStatus.classList.remove('hidden');
  }
  try {
    const caption = els.moodInput.value.trim();
    const result = await inferMoodFromImage(moodImageDataUrl, {
      caption,
      locale: uiLocale(),
    });
    moodImagePhrase = result.moodPhrase;
    els.moodImageFeeling.value = result.description;
    els.moodFeelingWrap.classList.remove('hidden');
    const energyPct = Math.round(result.suggestedEnergy * 100);
    els.energySlider.value = String(energyPct);
    els.energyValue.textContent = `${energyPct}%`;
    await persistMoodImage();
    if (els.moodImageStatus) {
      els.moodImageStatus.textContent = '';
      els.moodImageStatus.classList.add('hidden');
    }
  } catch (err) {
    console.warn('mood image analyze failed', err);
    if (els.moodImageStatus) {
      els.moodImageStatus.textContent = t('moodImageError') || 'Image error';
      els.moodImageStatus.classList.remove('hidden');
    }
  } finally {
    els.btnMoodAnalyze.disabled = !moodImageDataUrl;
  }
}

function composeMoodInput() {
  const text = els.moodInput.value.trim();
  const feeling = els.moodImageFeeling?.value?.trim() || '';
  const phrase = moodImagePhrase || '';
  const parts = [text, feeling, phrase].filter(Boolean);
  if (!parts.length) return t('moodNeutralDefault') || 'neutral';
  return parts.join(' · ');
}

function getPipFocusables(root) {
  if (!root) return [];
  return [
    ...root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

function openPip(root, preferFocus) {
  if (!root) return;
  if (!activePip) {
    pipPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  activePip = root;
  root.classList.remove('hidden');
  document.body.classList.add('pip-open');
  pipFocusables = getPipFocusables(root);
  const first = preferFocus || pipFocusables[0];
  first?.focus();
}

function restoreFocusAfterPip() {
  document.body.classList.remove('pip-open');
  pipPreviousFocus?.focus?.();
  pipPreviousFocus = null;
  activePip = null;
  pipFocusables = [];
}

function openDisclaimerPip() {
  openPip(els.disclaimerPip, els.disclaimerPipClose);
}

async function closeDisclaimerPip() {
  if (!els.disclaimerPip) return;
  if (els.disclaimerPipHide?.checked) {
    await chrome.storage.local.set({ [HIDE_DISCLAIMER_PIP_KEY]: true });
  }
  els.disclaimerPip.classList.add('hidden');
  if (activePip === els.disclaimerPip) {
    restoreFocusAfterPip();
  }
  if (!pendingSessionMood) {
    flushPendingDonationPip();
  }
}

function openSessionMoodPip(analysis) {
  if (!els.sessionPip || !els.sessionPipList) return;
  // Prefer session guidance after clinical dismiss; if still open, wait.
  if (els.disclaimerPip && !els.disclaimerPip.classList.contains('hidden')) {
    pendingSessionMood = analysis;
    return;
  }
  pendingSessionMood = null;
  renderTipList(els.sessionPipList, sessionMoodGuideTips(analysis));
  openPip(els.sessionPip, els.sessionPipClose);
}

function closeSessionMoodPip() {
  if (!els.sessionPip) return;
  els.sessionPip.classList.add('hidden');
  if (activePip === els.sessionPip) {
    restoreFocusAfterPip();
  }
  flushPendingDonationPip();
}

function cancelDonationTimer() {
  if (donationTimerId != null) {
    clearTimeout(donationTimerId);
    donationTimerId = null;
  }
  pendingDonationPip = false;
}

/** Clinical / session PiPs take priority — never stack donation on top. */
function blockingPipOpen() {
  if (els.disclaimerPip && !els.disclaimerPip.classList.contains('hidden')) return true;
  if (els.sessionPip && !els.sessionPip.classList.contains('hidden')) return true;
  return false;
}

/** @type {ReturnType<typeof setTimeout>|null} */
let trackPipTimer = null;
/** @type {string|null} */
let trackPipUrl = null;

function closeTrackPip() {
  if (trackPipTimer != null) {
    clearTimeout(trackPipTimer);
    trackPipTimer = null;
  }
  if (!els.trackPip) return;
  els.trackPip.classList.add('hidden');
  if (activePip === els.trackPip) restoreFocusAfterPip();
  trackPipUrl = null;
}

/**
 * Calm Bandcamp PiP on track change — only when the track is actually on Bandcamp.
 * Non-Bandcamp Varia / Liked Songs: no PiP (and dismiss any prior track PiP).
 */
function showTrackPip(track) {
  if (!track || !els.trackPip || !els.trackPipBody) return;
  if (!trackHasBandcampPresence(track)) {
    closeTrackPip();
    return;
  }
  if (blockingPipOpen()) return;
  if (activePip && activePip !== els.trackPip && activePip !== els.donationPip) return;

  trackPipUrl = bandcampSongPageUrl(track);
  els.trackPipBody.textContent = `${track.artist} — ${track.title}`;
  if (activePip === els.donationPip) {
    els.donationPip.classList.add('hidden');
  }
  openPip(els.trackPip, els.trackPipOpen || els.trackPipClose);
  if (trackPipTimer != null) clearTimeout(trackPipTimer);
  trackPipTimer = setTimeout(() => closeTrackPip(), 7000);
}

function openDonationPip() {
  if (!els.donationPip) return;
  if (els.donationPipHide) els.donationPipHide.checked = false;
  openPip(els.donationPip, els.donationPipDonate || els.donationPipLater);
}

/**
 * Never ask for money after a session where help was shown (crisis or
 * substances) nor from a minor. A request for support is fine for an adult
 * at ease; it is not fine for someone who has just written about not wanting
 * to live.
 */
function donationAskAllowed() {
  // App Store build: no donation request at all (Guideline 3.2.1(vi))
  if (!BUILD_FLAGS.donations) return false;
  if (sessionSafety !== 'none') return false;
  if (mood && (isMinorListener(mood) || safetyLevelFor(mood) !== 'none')) return false;
  return true;
}

async function tryShowDonationPip() {
  donationTimerId = null;
  if (!donationAskAllowed()) {
    pendingDonationPip = false;
    return;
  }
  const data = await chrome.storage.local.get([HIDE_DONATION_PIP_KEY]);
  if (data[HIDE_DONATION_PIP_KEY]) {
    pendingDonationPip = false;
    return;
  }
  if (sessionActive) {
    pendingDonationPip = false;
    return;
  }
  if (blockingPipOpen() || (activePip && activePip !== els.donationPip)) {
    pendingDonationPip = true;
    return;
  }
  pendingDonationPip = false;
  openDonationPip();
}

function flushPendingDonationPip() {
  if (!pendingDonationPip) return;
  if (blockingPipOpen()) return;
  pendingDonationPip = false;
  tryShowDonationPip().catch(() => {});
}

/**
 * Start the 14s donation timer after a natural session stop.
 * Cancelled if a new session starts before it fires.
 */
async function scheduleDonationPipAfterStop() {
  cancelDonationTimer();
  if (!donationAskAllowed()) return;
  const data = await chrome.storage.local.get([HIDE_DONATION_PIP_KEY]);
  if (data[HIDE_DONATION_PIP_KEY]) return;
  donationTimerId = setTimeout(() => {
    tryShowDonationPip().catch(() => {});
  }, DONATION_PIP_DELAY_MS);
}

async function closeDonationPip({ persistHide = true } = {}) {
  if (!els.donationPip) return;
  if (persistHide && els.donationPipHide?.checked) {
    await chrome.storage.local.set({ [HIDE_DONATION_PIP_KEY]: true });
  }
  els.donationPip.classList.add('hidden');
  if (activePip === els.donationPip) {
    restoreFocusAfterPip();
  }
}

async function openPayPalDonate() {
  if (els.donationPipHide?.checked) {
    await chrome.storage.local.set({ [HIDE_DONATION_PIP_KEY]: true });
  }
  await closeDonationPip({ persistHide: false });
  try {
    await chrome.tabs.create({ url: PAYPAL_DONATE_URL, active: true });
  } catch {
    window.open(PAYPAL_DONATE_URL, '_blank', 'noopener,noreferrer');
  }
}

/** Begin / resume listening — cancels a pending donation ask. */
function noteSessionStarted() {
  sessionActive = true;
  cancelDonationTimer();
  if (els.donationPip && !els.donationPip.classList.contains('hidden')) {
    closeDonationPip({ persistHide: false }).catch(() => {});
  }
  enablePlayback();
}

/**
 * Natural session end: Stop button, or player tab closed.
 * Schedules the donation PiP 14s later (unless hidden / cancelled by a new start).
 */
async function endListeningSession({ reason = 'stop' } = {}) {
  hideResumeBar();
  if (reason !== 'soundscape') soundscape?.stop().catch(() => {});
  const hadSession = sessionActive || !!currentTrack;
  if (!hadSession) return;
  sessionActive = false;
  currentTrack = null;
  if (els.nowPlaying) {
    els.nowPlaying.textContent = t('nowPlayingEmpty') || '—';
  }
  // Avoid a second STOP_SESSION round-trip when the player tab already closed.
  if (reason !== 'player_tab_closed') {
    try {
      await chrome.runtime.sendMessage({ type: 'STOP_SESSION', reason });
    } catch {
      // SW may be asleep
    }
  }
  await persistSession();
  enablePlayback();
  await scheduleDonationPipAfterStop();
}

async function closeActivePip() {
  if (activePip === els.donationPip) {
    await closeDonationPip();
    return;
  }
  if (activePip === els.sessionPip) {
    closeSessionMoodPip();
    return;
  }
  if (activePip === els.disclaimerPip) {
    await closeDisclaimerPip();
    if (pendingSessionMood) {
      const next = pendingSessionMood;
      pendingSessionMood = null;
      openSessionMoodPip(next);
    } else {
      flushPendingDonationPip();
    }
  }
}

async function setVjEnabled(enabled) {
  const on = !!enabled;
  if (els.vjToggle) els.vjToggle.checked = on;
  try {
    await chrome.runtime.sendMessage({ type: 'SET_VJ_ENABLED', enabled: on });
  } catch (err) {
    console.warn('SET_VJ_ENABLED failed', err);
  }
}

/**
 * Auto-enable VJ for extension-driven listening (Inizia / play / next / playlist pick).
 * Does not run on casual YouTube browsing — only side-panel triggered plays.
 * Re-enables even if the user turned VJ off mid-session.
 * When already enabled, still asks the background to (re)apply the overlay on
 * the player tab — storage-only opt-in before PLAY_TRACK is not enough alone.
 */
function prefersReducedMotion() {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Vision may switch on by itself for extension-driven listening only when the
 * person never switched it off and the system does not ask for reduced motion.
 * An explicit «off» is respected for good (photosensitivity, motion sickness,
 * or simple preference) until the person turns it back on.
 */
async function visionAutoEnableAllowed() {
  if (prefersReducedMotion()) return false;
  const data = await chrome.storage.local.get([VJ_USER_OPT_OUT_KEY]);
  return data[VJ_USER_OPT_OUT_KEY] !== true;
}

async function ensureVjEnabledForExtensionPlay() {
  if (!(await visionAutoEnableAllowed())) {
    // Keep the stored state honest and the overlay off.
    const { vjEnabled } = await chrome.storage.local.get(['vjEnabled']);
    if (vjEnabled === true && !els.vjToggle?.checked) await setVjEnabled(false);
    return;
  }
  const data = await chrome.storage.local.get(['vjEnabled']);
  if (data.vjEnabled === true && els.vjToggle?.checked) {
    try {
      await chrome.runtime.sendMessage({ type: 'SET_VJ_ENABLED', enabled: true });
    } catch (err) {
      console.warn('VJ re-apply failed', err);
    }
    return;
  }
  await setVjEnabled(true);
}

async function maybeShowDisclaimerPip() {
  const data = await chrome.storage.local.get([HIDE_DISCLAIMER_PIP_KEY]);
  if (!data[HIDE_DISCLAIMER_PIP_KEY]) {
    openDisclaimerPip();
  }
}

/** First-run: clinical notice only. */
async function maybeShowStartupPips() {
  await maybeShowDisclaimerPip();
}

function renderTipList(container, tips) {
  container.replaceChildren();
  for (const tip of tips) {
    const li = document.createElement('li');
    li.className = 'tip-item';
    const titleEl = document.createElement('span');
    titleEl.className = 'tip-title';
    titleEl.textContent = tip.title || '';
    const bodyEl = document.createElement('span');
    bodyEl.className = 'tip-body';
    bodyEl.textContent = tip.body || '';
    // Space between inline title/body so «Respira:» + body never run together.
    if (tip.title && tip.body) {
      li.append(titleEl, document.createTextNode(' '), bodyEl);
    } else {
      li.append(titleEl, bodyEl);
    }
    container.appendChild(li);
  }
}

function renderPresenceGuide() {
  renderTipList(els.baselineTips, baselineTips());
}

/* ------------------------------ Safety first ------------------------------- */

/**
 * Shows help before anything else when the words call for it.
 * Built with DOM APIs (no innerHTML); the text is never stored.
 */
const SAFETY_RANK = { none: 0, substance: 1, crisis: 2 };

/**
 * Safety level for the analysis just made, merged with what was already seen
 * in this browser session (kept in memory storage only, never on disk).
 * @param {object|null} analysis
 * @returns {'none'|'substance'|'crisis'}
 */
function noteSafetyFromAnalysis(analysis) {
  const level = assessSafety(analysis?.rawInput || '').level;
  if (SAFETY_RANK[level] > SAFETY_RANK[sessionSafety]) {
    sessionSafety = level;
    setSessionSafetyLevel(level).catch(() => {});
  }
  return level;
}

/** Level that decides the help card: this analysis if it has text, else the session's. */
function safetyLevelFor(analysis) {
  if (analysis?.rawInput) return assessSafety(analysis.rawInput).level;
  return sessionSafety;
}

function isCrisis(analysis) {
  return safetyLevelFor(analysis) === 'crisis';
}

/** Minors (declared or detected) are never asked for money and get kids-safe media only. */
function isMinorListener(analysis) {
  if (analysis?.kidsMode) return true;
  const band = String(analysis?.ageBand || '');
  return /^(0-3|4-7|8-12|13-17)$/.test(band);
}

/**
 * @param {string|{level: string}} input raw text, or {level} when the text is gone
 */
function renderSafety(input) {
  const box = document.getElementById('care-alert');
  if (!box) return;
  const level =
    typeof input === 'object' && input
      ? input.level
      : assessSafety(String(input || '')).level;
  box.replaceChildren();
  box.hidden = level === 'none';
  box.dataset.level = level;
  if (level === 'none') return;
  const h = document.createElement('p');
  h.className = 'care-alert-title';
  h.textContent = t(level === 'crisis' ? 'safetyCrisisTitle' : 'safetySubstanceTitle');
  const body = document.createElement('p');
  body.className = 'care-alert-body';
  body.textContent = t(level === 'crisis' ? 'safetyCrisisBody' : 'safetySubstanceBody');
  const list = document.createElement('div');
  list.className = 'care-alert-actions';
  const call = (entry, primary) => {
    const a = document.createElement('a');
    a.className = primary ? 'care-call primary' : 'care-call';
    a.href = `tel:${entry.tel}`;
    const l = document.createElement('span');
    l.textContent = entry.labelKey ? t(entry.labelKey) : entry.label;
    const n = document.createElement('strong');
    n.textContent = entry.display;
    a.append(l, n);
    return a;
  };
  if (level === 'crisis') {
    list.append(call(SUPPORT.telefonoAmico, true), call(SUPPORT.emergency, false));
    const intl = document.createElement('a');
    intl.className = 'care-link';
    intl.href = SUPPORT.iasp.href;
    intl.target = '_blank';
    intl.rel = 'noopener';
    intl.textContent = t('supportIaspLabel');
    list.append(intl);
  } else {
    list.append(call(SUPPORT.addictionIT, true), call(SUPPORT.telefonoAmico, false));
  }
  box.append(h, body, list);
  box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function showInsight(analysis) {
  const level = safetyLevelFor(analysis);
  renderSafety({ level });
  els.insightSection.classList.remove('hidden');
  if (level === 'crisis') {
    // Words about ending one's life: no talk of energy or playlists here.
    els.insightText.textContent = t('safetyInsightCrisis');
    els.therapyText.textContent = t('safetyInsightCrisisNext');
  } else {
    els.insightText.textContent = analysis.motivationInsight || '';
    els.therapyText.textContent = analysis.musicTherapyDirection || '';
  }
  // A mood exists now: «Altri risultati» can regenerate everything from it.
  if (els.btnMoreMedia) els.btnMoreMedia.disabled = false;
}

/* ------------------------------ Text-to-speech ------------------------------ */

let ttsSpeaking = false;

function ttsText() {
  const parts = [];
  if (els.insightText?.textContent) parts.push(els.insightText.textContent);
  if (els.therapyText?.textContent) parts.push(els.therapyText.textContent);
  if (mood) {
    for (const tip of sessionMoodGuideTips(mood)) {
      parts.push(`${tip.title}. ${tip.body}`);
    }
  }
  return parts.join('\n');
}

let ttsPending = false;

function showTtsStatus(message) {
  const el = document.getElementById('tts-status');
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

function stopTts() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
  ttsSpeaking = false;
  els.btnTts?.setAttribute('aria-pressed', 'false');
  els.btnTts?.classList.remove('is-speaking');
}

async function toggleTts() {
  if (!('speechSynthesis' in window)) {
    showTtsStatus(t('ttsNoLocalVoice'));
    return;
  }
  if (ttsSpeaking) {
    stopTts();
    return;
  }
  if (ttsPending) return;
  const text = ttsText();
  if (!text.trim()) return;
  const lang = uiLocale() === 'it' ? 'it-IT' : 'en-US';
  ttsPending = true;
  let voice = null;
  try {
    voice = pickLocalVoice(await loadVoices(window.speechSynthesis), lang);
  } finally {
    ttsPending = false;
  }
  // Only a voice that runs on this device: a network voice would send the
  // mood reading to an online speech service (thesis RNF1).
  if (!voice) {
    showTtsStatus(t('ttsNoLocalVoice'));
    return;
  }
  showTtsStatus('');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onend = () => stopTts();
  utterance.onerror = () => stopTts();
  ttsSpeaking = true;
  els.btnTts?.setAttribute('aria-pressed', 'true');
  els.btnTts?.classList.add('is-speaking');
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/* ----------------------- Therapeutic books & films ----------------------- */

function therapyCard({ title, meta, note, url, ariaLabel }) {
  const li = document.createElement('li');
  li.className = 'therapy-card';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'therapy-card-btn';
  btn.setAttribute('aria-label', ariaLabel);

  const titleEl = document.createElement('span');
  titleEl.className = 'therapy-card-title';
  titleEl.textContent = title;

  const metaEl = document.createElement('span');
  metaEl.className = 'therapy-card-meta';
  metaEl.textContent = meta;

  const noteEl = document.createElement('span');
  noteEl.className = 'therapy-card-note';
  // descriptions only, never a promise of effect (lib/care-safety.js)
  noteEl.textContent = publicCareNote(note);

  btn.append(titleEl, metaEl, noteEl);
  btn.addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url, active: true });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });

  li.appendChild(btn);
  return li;
}

/** Calm empty state when locality filter yields no care-media match. */
function therapyEmptyNote(mediumLabel) {
  const li = document.createElement('li');
  li.className = 'therapy-card therapy-card-empty';
  const note = document.createElement('p');
  note.className = 'status muted';
  const locale = uiLocale();
  const geoActive = musicGeoZone && musicGeoZone !== GEO_WORLD;
  if (geoActive) {
    note.textContent =
      t('therapyGeoEmpty', [mediumLabel]) ||
      (locale === 'en'
        ? `No ${mediumLabel} from this place in the catalogue.`
        : `Niente da questo posto in questo catalogo (${mediumLabel}).`);
  } else {
    note.textContent =
      t('therapyEmpty') ||
      (locale === 'en' ? 'Nothing to suggest right now.' : 'Niente da suggerire per ora.');
  }
  li.appendChild(note);
  return li;
}

function appendTherapyItems(listEl, items, mapCard, mediumLabel) {
  if (!listEl) return;
  listEl.replaceChildren();
  if (!items.length) {
    listEl.appendChild(therapyEmptyNote(mediumLabel));
    return;
  }
  for (const item of items) {
    const card = mapCard(item);
    const contentNote = careContentNote(item, uiLocale());
    if (contentNote) {
      const cn = document.createElement('span');
      cn.className = 'therapy-card-content-note';
      cn.textContent = contentNote;
      card.querySelector('.therapy-card-btn')?.append(cn);
    }
    listEl.appendChild(card);
  }
}

/**
 * Centroid of the current music playlist on the Russell plane (null when empty).
 */
function playlistCentroid() {
  if (!Array.isArray(playlist) || !playlist.length) return null;
  let e = 0;
  let v = 0;
  let n = 0;
  for (const t of playlist) {
    if (!t || typeof t !== 'object') continue;
    e += t.energy ?? 0.5;
    v += t.valence ?? 0.5;
    n++;
  }
  if (!n) return null;
  return { energy: e / n, valence: v / n };
}

/**
 * Cross-media coherence: books, films, series, games and other media are
 * ranked against a mood gently pulled toward the music actually playing
 * (70% declared mood, 30% playlist centroid), so the whole session breathes
 * the same air instead of rolling separate dice per medium.
 */
function harmonizeCareMood(analysis) {
  const anchor = playlistCentroid();
  if (!anchor || !analysis || typeof analysis !== 'object') return analysis;
  return {
    ...analysis,
    energy: 0.7 * (analysis.energy ?? 0.5) + 0.3 * anchor.energy,
    valence: 0.7 * (analysis.valence ?? 0.5) + 0.3 * anchor.valence,
  };
}

/**
 * Young listeners: the book/film/series/game catalogues carry no verified age
 * ratings (some titles are PEGI 18), so for minors only music is proposed and
 * the media section says why.
 */
function renderKidsCareNotice() {
  for (const el of [
    els.therapyBooks,
    els.therapyFilmsFree,
    els.therapyFilmsPaid,
    els.therapySeries,
    els.therapyOtherFree,
    els.therapyOtherPaid,
    els.therapyGamesFree,
    els.therapyGamesPaid,
  ]) {
    el?.replaceChildren();
  }
  const note = document.createElement('li');
  note.className = 'therapy-empty';
  note.textContent = t('careKidsNotice');
  els.therapyBooks?.appendChild(note);
  els.therapyMediaSection?.classList.remove('hidden');
  els.therapyMediaSection?.classList.add('kids-only');
}

function renderTherapyMedia(analysis, { record = false } = {}) {
  if (!els.therapyMediaSection || !els.therapyBooks) return;
  if (isMinorListener(analysis)) {
    renderKidsCareNotice();
    return;
  }
  els.therapyMediaSection.classList.remove('kids-only');
  analysis = {
    ...harmonizeCareMood(analysis),
    careSafetyLevel: safetyLevelFor(analysis),
    declaredValence: analysis?.valence,
  };
  const seed = therapySeed;
  const locale = uiLocale();
  const freeOpts = {
    uiLocale: locale,
    careAccessMode: CARE_ACCESS_FREE,
    playbackProviderId: DEFAULT_PROVIDER_ID,
  };
  const paidOpts = {
    uiLocale: locale,
    careAccessMode: CARE_ACCESS_PAID_OK,
    playbackProviderId: DEFAULT_PROVIDER_ID,
  };
  // One distinct pick per medium; same publication zone as music.
  const careGeo = {
    count: 1,
    seed,
    musicLanguageMode,
    musicGeoZone,
    uiLocale: locale,
  };
  const freeLang = {
    ...careGeo,
    careAccessMode: CARE_ACCESS_FREE,
  };
  const paidLang = {
    ...careGeo,
    seed: seed + 17,
    careAccessMode: CARE_ACCESS_PAID_OK,
  };

  // New session (record:true): exclude everything ever offered, so every list
  // is new and never equal to the previous one. Passive re-renders (language
  // / geo menu changes) keep the current session stable instead.
  const usedIds = record ? [...careHistoryIds] : [];
  const books = recommendBooks(analysis, { ...freeLang, excludeIds: usedIds });
  usedIds.push(...books.map((b) => b.id).filter(Boolean));
  appendTherapyItems(
    els.therapyBooks,
    books,
    (book) =>
      therapyCard({
        title: book.title,
        meta: `${book.author} · ${book.year}`,
        note: locale === 'it' ? book.noteIt : book.noteEn,
        url: goodreadsUrl(book),
        ariaLabel: t('therapyOpenGoodreads', [book.title]) || book.title,
      }),
    locale === 'it' ? 'libri' : 'books',
  );

  const filmSet = recommendFilmSet(analysis, {
    seed,
    musicLanguageMode,
    musicGeoZone,
    uiLocale: locale,
    excludeIds: usedIds,
  });
  usedIds.push(
    ...filmSet.wikiflix.map((f) => f.id).filter(Boolean),
    ...filmSet.tmdb.map((f) => f.id).filter(Boolean),
  );

  appendTherapyItems(
    els.therapyFilmsFree,
    filmSet.wikiflix,
    (film) =>
      therapyCard({
        title: film.title,
        meta: `${film.director} · ${film.year}`,
        note: locale === 'it' ? film.noteIt : film.noteEn,
        url: tmdbUrl(film, freeOpts),
        ariaLabel: t('therapyOpenWikiflix', [film.title]) || film.title,
      }),
    locale === 'it' ? 'film gratis' : 'free films',
  );

  appendTherapyItems(
    els.therapyFilmsPaid,
    filmSet.tmdb,
    (film) =>
      therapyCard({
        title: film.title,
        meta: `${film.director} · ${film.year}`,
        note: locale === 'it' ? film.noteIt : film.noteEn,
        url: tmdbDiscoveryUrl(film),
        ariaLabel: t('therapyOpenTmdb', [film.title]) || film.title,
      }),
    locale === 'it' ? 'film TMDB' : 'TMDB films',
  );

  const series = recommendSeries(analysis, { ...paidLang, excludeIds: usedIds });
  usedIds.push(...series.map((s) => s.id).filter(Boolean));
  appendTherapyItems(
    els.therapySeries,
    series,
    (s) =>
      therapyCard({
        title: s.title,
        meta: `Serie · ${s.year}`,
        note: locale === 'it' ? s.noteIt : s.noteEn,
        url: tmdbTvUrl(s, paidOpts),
        ariaLabel: t('therapyOpenSeries', [s.title]) || s.title,
      }),
    locale === 'it' ? 'serie' : 'series',
  );

  const otherFree = recommendOtherMedia(analysis, {
    ...freeLang,
    count: 6,
    excludeIds: usedIds,
  }).filter((item) => itemIsFreeAccess(item) || item.kind === 'podcast');
  usedIds.push(...otherFree.slice(0, 1).map((i) => i.id).filter(Boolean));
  appendTherapyItems(
    els.therapyOtherFree,
    otherFree.slice(0, 1),
    (item) => {
      const kindLabel =
        item.kind === 'podcast'
          ? 'Podcast'
          : locale === 'it'
            ? 'Documentario'
            : 'Documentary';
      const meta =
        item.kind === 'podcast'
          ? `${kindLabel} · ${item.creator || item.year}`
          : `${kindLabel} · ${item.year}`;
      return therapyCard({
        title: item.title,
        meta,
        note: locale === 'it' ? item.noteIt : item.noteEn,
        url: otherMediaUrl(item, freeOpts),
        ariaLabel: t('therapyOpenOther', [item.title]) || item.title,
      });
    },
    locale === 'it' ? 'podcast / doc gratis' : 'free podcasts / docs',
  );

  const otherPaid = recommendOtherMedia(analysis, {
    ...paidLang,
    count: 6,
    excludeIds: usedIds,
  }).filter((item) => !itemIsFreeAccess(item) && item.kind !== 'podcast');
  appendTherapyItems(
    els.therapyOtherPaid,
    otherPaid.slice(0, 1),
    (item) => {
      const kindLabel = locale === 'it' ? 'Documentario' : 'Documentary';
      return therapyCard({
        title: item.title,
        meta: `${kindLabel} · ${item.year}`,
        note: locale === 'it' ? item.noteIt : item.noteEn,
        url: otherMediaUrl(item, paidOpts),
        ariaLabel: t('therapyOpenOther', [item.title]) || item.title,
      });
    },
    locale === 'it' ? 'documentari' : 'documentaries',
  );

  // Calm videogames: finite, no loot boxes, no daily pressure — free on
  // itch.io, paid on Steam. One per tier, rotating via the same memory.
  const gameCard = (game) =>
    therapyCard({
      title: game.title,
      meta: `${locale === 'it' ? 'Videogioco' : 'Videogame'} · ${game.creator || ''} · ${game.year || ''}`.replace(/\s·\s*$/, ''),
      note: locale === 'it' ? game.noteIt : game.noteEn,
      url: gameStoreUrl(game),
      ariaLabel: t('therapyOpenOther', [game.title]) || game.title,
    });
  const gamesFree = recommendVideogames(analysis, {
    ...freeLang,
    count: 6,
    excludeIds: usedIds,
  }).filter((g) => itemIsFreeAccess(g));
  usedIds.push(...gamesFree.slice(0, 1).map((i) => i.id).filter(Boolean));
  appendTherapyItems(
    els.therapyGamesFree,
    gamesFree.slice(0, 1),
    gameCard,
    locale === 'it' ? 'videogiochi gratis' : 'free videogames',
  );

  const gamesPaid = recommendVideogames(analysis, {
    ...paidLang,
    count: 6,
    excludeIds: usedIds,
  }).filter((g) => !itemIsFreeAccess(g));
  usedIds.push(...gamesPaid.slice(0, 1).map((i) => i.id).filter(Boolean));
  appendTherapyItems(
    els.therapyGamesPaid,
    gamesPaid.slice(0, 1),
    gameCard,
    locale === 'it' ? 'videogiochi a pagamento' : 'paid videogames',
  );

  els.therapyMediaSection.classList.remove('hidden');
  if (record) {
    // Remember only genuinely new picks (history seeds were excluded above).
    const fresh = usedIds.filter((id) => id && !careHistoryIds.includes(id));
    if (fresh.length) {
      careHistoryIds = [...careHistoryIds, ...fresh].slice(-CARE_HISTORY_MAX);
      chrome.storage.local
        .set({ [CARE_HISTORY_KEY]: careHistoryIds })
        .catch?.(() => {});
    }
  }
}

/* ------------------------------ Choose for me ------------------------------ */

/** «Scegli per me» needs an input about how the user feels first. */
function hasMoodInput() {
  return !!(
    els.moodInput?.value.trim() ||
    moodImageDataUrl ||
    els.moodImageFeeling?.value?.trim()
  );
}

function syncChooseForMeUi() {
  if (!els.btnChooseForMe) return;
  const ready = hasMoodInput();
  els.btnChooseForMe.disabled = !ready;
  const hint = ready ? t('chooseForMe') : t('chooseForMeHint');
  els.btnChooseForMe.title = hint;
  if (els.chooseStatus && !ready) {
    els.chooseStatus.hidden = true;
  }
}

/**
 * Weighted pick among music / book / film / series / other care media.
 * Music remains the backbone (Cochrane music-therapy outcomes); story media
 * expand personal care when energy is low or sadness is high.
 */
function chooseActivity(analysis) {
  let wMusic = 0.5;
  let wBook = 0.15;
  let wFilm = 0.15;
  let wSeries = 0.12;
  let wOther = 0.08;
  if ((analysis.anxiety ?? 0) >= 0.6) {
    wMusic = 0.55; wBook = 0.15; wFilm = 0.1; wSeries = 0.1; wOther = 0.1;
  } else if ((analysis.sadness ?? 0) >= 0.6 && (analysis.energy ?? 0.5) <= 0.4) {
    wMusic = 0.3; wBook = 0.2; wFilm = 0.2; wSeries = 0.2; wOther = 0.1;
  } else if (analysis.isLowMotivation) {
    wMusic = 0.45; wBook = 0.15; wFilm = 0.15; wSeries = 0.15; wOther = 0.1;
  } else if ((analysis.happiness ?? 0) >= 0.7) {
    wMusic = 0.6; wBook = 0.1; wFilm = 0.1; wSeries = 0.12; wOther = 0.08;
  }
  const counts = analysis.userPrior?.activityCounts;
  if (counts) {
    const total =
      (counts.music || 0) +
      (counts.book || 0) +
      (counts.film || 0) +
      (counts.series || 0) +
      (counts.other || 0);
    if (total >= 5) {
      const tilt = 0.15;
      const blend = (w, key) => w * (1 - tilt) + tilt * ((counts[key] || 0) / total);
      wMusic = blend(wMusic, 'music');
      wBook = blend(wBook, 'book');
      wFilm = blend(wFilm, 'film');
      wSeries = blend(wSeries, 'series');
      wOther = blend(wOther, 'other');
    }
  }
  const sum = wMusic + wBook + wFilm + wSeries + wOther;
  let r = Math.random() * sum;
  if (r < wMusic) return 'music';
  r -= wMusic;
  if (r < wBook) return 'book';
  r -= wBook;
  if (r < wFilm) return 'film';
  r -= wFilm;
  if (r < wSeries) return 'series';
  return 'other';
}

function showChooseStatus(text) {
  if (!els.chooseStatus) return;
  els.chooseStatus.textContent = text;
  els.chooseStatus.hidden = !text;
}

async function chooseForMe() {
  if (!hasMoodInput() || chooseInFlight) return;
  chooseInFlight = true;
  els.btnChooseForMe?.setAttribute('aria-busy', 'true');
  try {
    await chooseForMeNow();
  } finally {
    chooseInFlight = false;
    els.btnChooseForMe?.removeAttribute('aria-busy');
  }
}

async function chooseForMeNow() {
  const energy = Number(els.energySlider.value) / 100;
  mood = analyzeMoodHeuristic({
    input: composeMoodInput(),
    energy,
  });
  mood = await applyUserPrior(mood);
  const level = noteSafetyFromAnalysis(mood);
  showInsight(mood);
  therapySeed = Date.now();
  renderTherapyMedia(mood, { record: true });

  if (level === 'crisis') {
    // Help first: nothing is opened on the person's behalf. The media stay
    // below the help card for whenever they want them.
    showChooseStatus(t('chooseCrisisHold'));
    recordMoodEntry(mood, { activity: 'music' })
      .then(() => renderUserDataPanel())
      .catch(() => {});
    sessionAvoid = [];
    const generated = buildSessionPlaylist();
    playlist = generated.tracks;
    playlistIndex = 0;
    currentTrack = null;
    await persistSession();
    renderPlaylist();
    enablePlayback();
    return;
  }

  const activity = chooseActivity(mood);
  recordMoodEntry(mood, { activity })
    .then(() => renderUserDataPanel())
    .catch(() => {});
  const seed = therapySeed;
  const careLocale = uiLocale();
  const careLang = {
    seed,
    musicLanguageMode,
    musicGeoZone,
    uiLocale: careLocale,
    careAccessMode,
  };
  const openOpts = {
    uiLocale: careLocale,
    careAccessMode,
    playbackProviderId: DEFAULT_PROVIDER_ID,
  };

  if (activity === 'book') {
    const [book] = recommendBooks(mood, { count: 1, ...careLang });
    if (book) {
      showChooseStatus(t('chooseChoseBook', [book.title]));
      els.therapyMediaSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      try {
        await chrome.tabs.create({ url: goodreadsUrl(book), active: true });
      } catch {
        window.open(goodreadsUrl(book), '_blank', 'noopener,noreferrer');
      }
      return;
    }
  }

  if (activity === 'film') {
    const preferFree = careAccessMode !== CARE_ACCESS_PAID_OK;
    const [film] = recommendFilms(mood, {
      count: 1,
      ...careLang,
      filmPool: preferFree ? 'wikiflix' : 'tmdb',
    });
    if (film) {
      const filmUrl = preferFree ? tmdbUrl(film, openOpts) : tmdbDiscoveryUrl(film);
      showChooseStatus(t('chooseChoseFilm', [film.title]));
      els.therapyMediaSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      try {
        await chrome.tabs.create({
          url: filmUrl,
          active: true,
        });
      } catch {
        window.open(filmUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
  }

  if (activity === 'series') {
    const [series] = recommendSeries(mood, { count: 1, ...careLang });
    if (series) {
      showChooseStatus(t('chooseChoseSeries', [series.title]));
      els.therapyMediaSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      try {
        await chrome.tabs.create({ url: tmdbTvUrl(series, openOpts), active: true });
      } catch {
        window.open(tmdbTvUrl(series, openOpts), '_blank', 'noopener,noreferrer');
      }
      return;
    }
  }

  if (activity === 'other') {
    const [item] = recommendOtherMedia(mood, { count: 1, ...careLang });
    if (item) {
      showChooseStatus(t('chooseChoseOther', [item.title]));
      els.therapyMediaSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const url = otherMediaUrl(item, openOpts);
      try {
        await chrome.tabs.create({ url, active: true });
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
  }

  // Music session (default / fallback)
  if (!tracks.length) return;
  showChooseStatus(t('chooseChoseMusic'));
  noteSessionStarted();
  openSessionMoodPip(mood);
  sessionAvoid = [];
  const generated = buildSessionPlaylist();
  playlist = generated.tracks;
  playlistIndex = 0;
  currentTrack = null;
  await persistSession();
  renderPlaylist();
  enablePlayback();
  if (playlist.length) {
    await playCurrent();
  }
}

function enablePlayback() {
  els.btnPlay.disabled = playlist.length === 0;
  els.btnNext.disabled = playlist.length === 0;
  if (els.btnStop) {
    els.btnStop.disabled = !sessionActive && !currentTrack;
  }
}

function trackIsCalibrated(track) {
  if (track?.affectCalibrated === false) return false;
  if (track?.affectCalibrated === true) return true;
  return isAffectGrounded(track);
}

/** One honest line about how much of this playlist is mood-calibrated. */
function playlistCalibrationLine() {
  const total = playlist.length;
  if (!total) return '';
  const calibrated = playlist.filter(trackIsCalibrated).length;
  if (lastCalibration && lastCalibration.iso === false) return t('playlistNotCalibrated');
  if (calibrated === total) return t('playlistCalibratedAll');
  return t('playlistCalibrationNote', [String(calibrated), String(total)]);
}

function renderPlaylist() {
  els.playlistSection.classList.remove('hidden');
  els.playlistList.replaceChildren();
  if (!playlist.length) {
    const li = document.createElement('li');
    li.className = 'playlist-item playlist-empty';
    const note = document.createElement('p');
    note.className = 'status muted';
    note.textContent =
      lastGeoMatchCount === 0
        ? t('musicGeoEmpty') ||
          (uiLocale() === 'en'
            ? 'No tracks from this place in the catalog.'
            : 'Nessun brano da questo posto nel catalogo.')
        : t('playlistEmpty') ||
          (uiLocale() === 'en' ? 'Playlist empty.' : 'Playlist vuota.');
    li.appendChild(note);
    els.playlistList.appendChild(li);
    syncPlaylistToggle();
    return;
  }
  if (els.playlistCalibration) {
    els.playlistCalibration.textContent = playlistCalibrationLine();
    els.playlistCalibration.hidden = !els.playlistCalibration.textContent;
  }
  // Show what comes next; the whole list only on request (a 40-row list
  // made the panel ~6,400 px tall).
  const from = playlistExpanded ? 0 : Math.max(0, Math.min(playlistIndex, playlist.length - 1));
  const to = playlistExpanded ? playlist.length : Math.min(playlist.length, from + PLAYLIST_PREVIEW_COUNT);
  for (let index = from; index < to; index++) {
    const track = playlist[index];
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.value = index + 1;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-track';
    if (index === playlistIndex) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');
    }
    const title = track.title || '';
    const artist = track.artist || '';
    btn.setAttribute(
      'aria-label',
      t('playlistTrackPlay', [title, artist]) ||
        `Play ${title} by ${artist}`,
    );
    const titleEl = document.createElement('span');
    titleEl.className = 'title';
    titleEl.textContent = title;
    const metaEl = document.createElement('span');
    metaEl.className = 'meta';
    // Coordinates are shown only when they are real (annotated or measured);
    // a placeholder is never displayed as if it were a value.
    if (trackIsCalibrated(track) && track.energy != null) {
      metaEl.textContent = `${artist} · E ${(track.energy * 100).toFixed(0)}%`;
    } else {
      metaEl.textContent = artist;
      const badge = document.createElement('span');
      badge.className = 'track-badge';
      badge.textContent = t('trackDiscoveryBadge');
      badge.title = t('trackDiscoveryHint');
      metaEl.append(' · ', badge);
    }
    btn.append(titleEl, metaEl);
    // Native button: click + Enter/Space → same PLAY_TRACK path as Play.
    btn.addEventListener('click', () => {
      playlistIndex = index;
      playCurrent();
    });

    li.appendChild(btn);
    els.playlistList.appendChild(li);
  }
  syncPlaylistToggle();
}

function syncPlaylistToggle() {
  const btn = els.btnPlaylistToggle;
  if (!btn) return;
  const hiddenCount = playlist.length - PLAYLIST_PREVIEW_COUNT;
  btn.hidden = playlist.length <= PLAYLIST_PREVIEW_COUNT;
  btn.setAttribute('aria-expanded', playlistExpanded ? 'true' : 'false');
  const label = btn.querySelector('span');
  if (label) {
    label.textContent = playlistExpanded
      ? t('playlistShowLess')
      : t('playlistShowAll', [String(playlist.length)]);
  }
  if (hiddenCount <= 0) btn.hidden = true;
}

async function persistSession() {
  await chrome.storage.local.set({
    // Numbers, labels and generated sentences only — never the typed text.
    mood: persistableMood(mood),
    playlist,
    playlistIndex,
    playedIds,
    currentTrack,
    trackCount: tracks.length,
    playbackProviderId,
    musicLanguageMode,
    [GEO_STORAGE_KEY]: musicGeoZone,
  });
}

/**
 * True when open actually succeeded even if the reply said otherwise.
 * Never flash «Errore: apertura player» when playerTabId / tab is alive.
 */
async function playerOpenSucceeded(response, track) {
  if (response?.ok === true) return true;
  if (response?.tabId != null) return true;
  try {
    const data = await chrome.storage.local.get(['currentTrack']);
    const tabId = await getPlayerTabId();
    if (tabId == null) return false;
    try {
      await chrome.tabs.get(tabId);
    } catch {
      return false;
    }
    // Tab exists after play: success. Prefer matching currentTrack when present.
    const stored = data.currentTrack;
    if (track?.id != null && stored?.id != null && stored.id !== track.id) {
      // Different track claimed — still count as open success (player is up).
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

async function playTrack(track) {
  if (!track) return;
  hideResumeBar();
  const mySeq = ++playRequestSeq;
  noteSessionStarted();
  // Persist Vision opt-in *before* PLAY_TRACK (storage only — no tabCapture yet),
  // unless the person switched Vision off or the system asks for reduced motion.
  try {
    if (await visionAutoEnableAllowed()) {
      if (els.vjToggle) els.vjToggle.checked = true;
      await chrome.storage.local.set({ vjEnabled: true });
    }
  } catch (err) {
    console.warn('VJ pre-enable before play', err);
  }
  // Open player next; tabCapture starts from background after navigate settles.
  currentTrack = track;
  sessionPlayStartAt = Date.now();
  els.nowPlaying.textContent = `${track.artist} — ${track.title}`;
  if (!playedIds.includes(track.id)) playedIds.push(track.id);
  await persistSession();
  renderPlaylist();
  // A newer play request arrived while we were saving: let that one drive the player.
  if (mySeq !== playRequestSeq) return;

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: 'PLAY_TRACK',
      track,
      providerId: playbackProviderId,
    });
  } catch (err) {
    // Channel dropped (e.g. SW restart) — player tab may still have opened.
    console.warn('PLAY_TRACK message failed', err);
    response = null;
  }

  // Only show an error on explicit ok:false with a real failure AND no live player tab.
  // Undefined/null / channel drop / tabId present / storage playerTabId must not
  // flash «apertura player».
  const explicitFail = response && response.ok === false;
  if (explicitFail && !(await playerOpenSucceeded(response, track))) {
    const detail = String(response.error || '').trim();
    console.warn('PLAY_TRACK failed', detail || response);
    els.nowPlaying.textContent = t('playError', [
      detail || t('playErrorFallback'),
    ]);
    // Still try VJ flag for next attempt; do not block on it.
    ensureVjEnabledForExtensionPlay().catch(() => {});
    return;
  }

  // Spurious ok:false with a live tab — clear error status, show track.
  els.nowPlaying.textContent = `${track.artist} — ${track.title}`;
  if (response?.note) {
    setProviderHint(response.note, { live: true });
  }

  // Extension-driven play: enable VJ after the player tab is open (Inizia / play /
  // next / playlist pick). Casual YT browse never hits this path.
  ensureVjEnabledForExtensionPlay().catch((err) =>
    console.warn('VJ auto-enable after play', err),
  );
  showTrackPip(track);
  watchPlaybackState(track);
}

/**
 * Firefox autoplay banner (top of the panel): visible only on Firefox and
 * only while the browser is blocking audio. Dismissing hides it for the
 * current track; a new block shows it again.
 */
function isFirefoxPanel() {
  try {
    return /firefox/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
}

let ffBannerDismissedForTrackId = null;

function syncFirefoxBanner(state, trackId) {
  if (!els.ffAudioBanner) return;
  const show =
    isFirefoxPanel() &&
    state?.autoplayBlocked === true &&
    ffBannerDismissedForTrackId !== (trackId || null);
  els.ffAudioBanner.classList.toggle('hidden', !show);
}

els.ffAudioBannerClose?.addEventListener('click', () => {
  ffBannerDismissedForTrackId = currentTrack?.id || null;
  els.ffAudioBanner?.classList.add('hidden');
});
/**
 * Poll the bridge's honest playback report and reflect it under the track:
 * plain title when audible, muted hint when starting muted, blocked hint
 * when the browser refuses everything (Firefox "block audio and video").
 * Stale polls (track changed meanwhile) never overwrite the current one.
 * Also drives the Firefox autoplay banner at the top of the panel.
 */
function watchPlaybackState(track) {
  const stamp = `${track?.artist || ''} — ${track?.title || ''}`;
  const myToken = `${stamp}#${Date.now()}`;
  watchPlaybackState.token = myToken;
  const delays = [1500, 3500, 6000, 9000];
  for (const delay of delays) {
    setTimeout(async () => {
      if (watchPlaybackState.token !== myToken) return;
      if (!currentTrack || currentTrack.id !== track?.id) return;
      let st = {};
      try {
        st = await chrome.storage.local.get([
          'playerMuted',
          'playerPlaying',
          'autoplayBlocked',
        ]);
      } catch {
        return;
      }
      if (watchPlaybackState.token !== myToken) return;
      if (!currentTrack || currentTrack.id !== track?.id) return;
      syncFirefoxBanner(st, track?.id);
      if (st.autoplayBlocked === true) {
        els.nowPlaying.textContent = t('nowPlayingBlocked', [stamp]) || stamp;
      } else if (st.playerPlaying === true && st.playerMuted === true) {
        els.nowPlaying.textContent = t('nowPlayingMuted', [stamp]) || stamp;
      } else if (st.playerPlaying === true && st.playerMuted === false) {
        els.nowPlaying.textContent = stamp;
      }
      // Unknown yet: leave the plain title alone.
    }, delay);
  }
}

async function playCurrent() {
  const track = playlist[playlistIndex];
  if (!track) return;
  await playTrack(track);
}

async function playNext() {
  if (!playlist.length) return;
  // Manual skip shortly after start = rejection: avoid this neighbourhood
  // for the rest of the session (in-memory only, never stored).
  try {
    const cur = playlist[playlistIndex];
    if (cur && sessionPlayStartAt && Date.now() - sessionPlayStartAt < QUICK_SKIP_MS) {
      sessionAvoid.push({
        energy: cur.energy ?? 0.5,
        valence: cur.valence ?? 0.5,
      });
      if (sessionAvoid.length > 10) sessionAvoid = sessionAvoid.slice(-10);
    }
  } catch {
    // ignore
  }
  if (playlistIndex >= playlist.length - 1) {
    // End of the path: the ISO trajectory ends at its target, it never jumps
    // back to the first (most distant) track.
    await finishPlaylistInPanel('manual');
    return;
  }
  playlistIndex += 1;
  await playCurrent();
}

/**
 * The person chose another video in the player tab. Auscultrix steps aside
 * (no auto-advance, no Vision on their video; YouTube's autoplay carries on)
 * and the playlist waits: ▶ brings it back.
 */
function showPlayerDetached() {
  if (els.nowPlaying) els.nowPlaying.textContent = t('playerDetached');
  const bar = document.getElementById('resume-bar');
  // Resuming makes sense only while there is a playlist to go back to.
  if (bar) bar.hidden = !playlist.length;
}

function hideResumeBar() {
  const bar = document.getElementById('resume-bar');
  if (bar) bar.hidden = true;
}

/**
 * Back to the session after the person watched something else: the same
 * track (from the start) or the next one, and from there auto-advance again.
 * Not counted as a quick skip: the person did not reject the track.
 */
async function resumeSession({ next = false } = {}) {
  hideResumeBar();
  if (!playlist.length) return;
  if (next) {
    if (playlistIndex >= playlist.length - 1) {
      await finishPlaylistInPanel('manual');
      return;
    }
    playlistIndex += 1;
  }
  await playCurrent();
}

/** Playlist completed (last track ended, or «Next» on the last track). */
async function finishPlaylistInPanel(reason) {
  await endListeningSession({ reason: reason === 'manual' ? 'stop' : 'player_tab_closed' });
  if (els.nowPlaying) els.nowPlaying.textContent = t('playlistFinished');
  renderPlaylist();
}

// Events
els.energySlider.addEventListener('input', () => {
  els.energyValue.textContent = `${els.energySlider.value}%`;
});

document.querySelectorAll('.mood-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    const text = (btn.textContent || '').trim();
    const energyPct = Number(btn.dataset.moodEnergy);
    els.moodInput.value = text;
    if (Number.isFinite(energyPct)) {
      els.energySlider.value = String(energyPct);
      els.energyValue.textContent = `${energyPct}%`;
    }
    syncChooseForMeUi();
    els.moodInput.focus();
  });
});

els.providerSelect?.addEventListener('change', async () => {
  playbackProviderId = els.providerSelect.value || DEFAULT_PROVIDER_ID;
  await chrome.runtime.sendMessage({
    type: 'SET_PLAYBACK_PROVIDER',
    providerId: playbackProviderId,
  });
});

els.musicCatalogEmerging?.addEventListener('click', () => {
  applyMusicCatalogMode(MUSIC_CATALOG_EMERGING).catch(() => {});
});
els.musicCatalogKnown?.addEventListener('click', () => {
  applyMusicCatalogMode(MUSIC_CATALOG_KNOWN).catch(() => {});
});

els.musicGeoCountry?.addEventListener('change', () => {
  onMusicGeoCascadeChange('country');
});
els.musicGeoRegion?.addEventListener('change', () => {
  onMusicGeoCascadeChange('region');
});
els.musicGeoProvince?.addEventListener('change', () => {
  onMusicGeoCascadeChange('province');
});
els.musicGeoCity?.addEventListener('change', () => {
  onMusicGeoCascadeChange('city');
});

els.moodImageInput?.addEventListener('change', async () => {
  const file = els.moodImageInput.files?.[0];
  await handleMoodImageFile(file);
  els.moodImageInput.value = '';
});

els.btnMoodAnalyze?.addEventListener('click', () => {
  analyzeMoodImage().catch(() => {});
});

els.btnMoodImageClear?.addEventListener('click', async () => {
  setMoodImagePreview(null);
  try {
    await chrome.storage.session?.remove?.([MOOD_IMAGE_KEY, MOOD_IMAGE_FEELING_KEY]);
  } catch {
    // ignore
  }
});

els.moodImageFeeling?.addEventListener('change', () => {
  persistMoodImage().catch(() => {});
});

['dragenter', 'dragover'].forEach((ev) => {
  els.moodImageDrop?.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.moodImageDrop.classList.add('is-dragover');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  els.moodImageDrop?.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.moodImageDrop.classList.remove('is-dragover');
  });
});
els.moodImageDrop?.addEventListener('drop', async (e) => {
  const file = e.dataTransfer?.files?.[0];
  await handleMoodImageFile(file);
});
els.moodImageDrop?.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  els.moodImageInput?.click();
});
els.moodImageDrop?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.moodImageInput?.click();
  }
});

els.uiLangBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const open = els.uiLangBtn.getAttribute('aria-expanded') !== 'true';
  setUiLangMenuOpen(open);
});

els.uiLangMenu?.querySelectorAll('[data-lang]').forEach((opt) => {
  opt.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const lang = opt.getAttribute('data-lang');
    setUiLangMenuOpen(false);
    if (!lang) return;
    if (lang === uiLocale()) {
      syncUiLangControl();
      return;
    }
    await persistUiLanguage(lang);
    refreshLocalizedChrome();
  });
});

document.addEventListener('click', (e) => {
  if (!els.uiLangMenu || els.uiLangMenu.classList.contains('hidden')) return;
  const switcher = document.getElementById('ui-lang-switch');
  if (switcher && !switcher.contains(e.target)) {
    setUiLangMenuOpen(false);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && els.uiLangMenu && !els.uiLangMenu.classList.contains('hidden')) {
    setUiLangMenuOpen(false);
    els.uiLangBtn?.focus();
  }
});

els.disclaimerPipClose?.addEventListener('click', () => {
  closeActivePip().catch(() => {});
});

els.sessionPipClose?.addEventListener('click', () => {
  closeSessionMoodPip();
});

document.addEventListener('keydown', (e) => {
  if (!activePip || activePip.classList.contains('hidden')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeActivePip().catch(() => {});
    return;
  }
  if (e.key !== 'Tab' || !pipFocusables.length) return;
  const first = pipFocusables[0];
  const last = pipFocusables[pipFocusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/**
 * New alternative results for EVERYTHING with the same mood: fresh music
 * playlist (novelty memory guarantees a different path) plus fresh books,
 * films, series, games and other care media (new seed + history exclusion).
 * Powers both «Un'altra magia» (playlist section) and «Altri risultati»
 * (start row) — same action, within reach wherever the person is.
 */
async function regenerateAllMedia() {
  if (!mood || !tracks.length || regenerateInFlight) return;
  regenerateInFlight = true;
  try {
    await regenerateAllMediaNow();
  } finally {
    regenerateInFlight = false;
  }
}

async function regenerateAllMediaNow() {
  sessionAvoid = [];
  const generated = buildSessionPlaylist();
  playlist = generated.tracks;
  playlistIndex = 0;
  currentTrack = null;
  therapySeed = Date.now();
  renderTherapyMedia(mood, { record: true });
  await persistSession();
  renderPlaylist();
  enablePlayback();
  if (playlist.length && !isCrisis(mood) && sessionSafety !== 'crisis') {
    await playCurrent();
  }
}

els.btnStart.addEventListener('click', async () => {
  const withSoundscape = !!soundscape?.usedByDefault();
  if ((!tracks.length && !withSoundscape) || startInFlight) return;
  // the AudioContext may only start inside the click (autoplay policy)
  if (withSoundscape) soundscape.prime();
  startInFlight = true;
  els.btnStart.setAttribute('aria-busy', 'true');
  try {
    await startSession();
  } catch (err) {
    console.warn('start failed', err);
  } finally {
    startInFlight = false;
    els.btnStart.removeAttribute('aria-busy');
  }
});

async function startSession() {
  noteSessionStarted();
  const energy = Number(els.energySlider.value) / 100;
  mood = analyzeMoodHeuristic({
    input: composeMoodInput(),
    energy,
  });
  // Local personalization prior (on-device history; GDPR-minimized numbers only)
  mood = await applyUserPrior(mood);
  noteSafetyFromAnalysis(mood);
  sessionAvoid = [];
  const withSoundscape = !!soundscape?.usedByDefault();
  recordMoodEntry(mood, { activity: withSoundscape ? 'soundscape' : 'music' })
    .then(() => renderUserDataPanel())
    .catch(() => {});
  showInsight(mood);
  therapySeed = Date.now();
  if (withSoundscape) {
    // Offline listening: no playlist, no YouTube tab. In a crisis the help
    // card stays first and the soundscape waits for an explicit press.
    if (!isCrisis(mood)) openSessionMoodPip(mood);
    renderTherapyMedia(mood, { record: true });
    await soundscape.play({ automatic: true });
    return;
  }
  // In a crisis the help card must stay in view: no guide sheet on top of it.
  if (!isCrisis(mood)) openSessionMoodPip(mood);

  const generated = buildSessionPlaylist();
  playlist = generated.tracks;
  playlistIndex = 0;
  currentTrack = null;

  await persistSession();
  renderPlaylist();
  // After the playlist exists: care media harmonize with what is playing.
  renderTherapyMedia(mood, { record: true });
  enablePlayback();

  const inCrisis = isCrisis(mood);
  if (playlist.length && !inCrisis) {
    // playTrack opens the player first, then auto-enables VJ (no tabCapture race).
    await playCurrent();
  } else if (inCrisis) {
    // Help first: the playlist is ready, the person chooses when to press Play.
  }
}

els.btnPlaylistToggle?.addEventListener('click', () => {
  playlistExpanded = !playlistExpanded;
  renderPlaylist();
});
els.lyricsToggle?.addEventListener('change', () => {
  chrome.storage.local.set({ [LYRICS_LOOKUP_KEY]: !!els.lyricsToggle.checked }).catch(() => {});
});

els.btnPlay.addEventListener('click', () => playCurrent());
document.getElementById('btn-resume-session')?.addEventListener('click', () => {
  resumeSession().catch((err) => console.warn('resume failed', err));
});
document.getElementById('btn-resume-next')?.addEventListener('click', () => {
  resumeSession({ next: true }).catch((err) => console.warn('resume failed', err));
});
els.btnNext.addEventListener('click', () => playNext());
els.btnMoreResults?.addEventListener('click', () => {
  regenerateAllMedia().catch((err) => console.warn('regenerate failed', err));
});
els.btnMoreMedia?.addEventListener('click', () => {
  regenerateAllMedia().catch((err) => console.warn('regenerate failed', err));
});
els.btnStop?.addEventListener('click', () => {
  endListeningSession({ reason: 'stop' }).catch((err) =>
    console.warn('stop session failed', err),
  );
});

els.donationPipLater?.addEventListener('click', () => {
  closeDonationPip().catch(() => {});
});
els.trackPipClose?.addEventListener('click', () => closeTrackPip());
els.trackPipOpen?.addEventListener('click', async () => {
  if (!trackPipUrl) return;
  try {
    await chrome.tabs.create({ url: trackPipUrl, active: true });
  } catch {
    window.open(trackPipUrl, '_blank', 'noopener,noreferrer');
  }
  closeTrackPip();
});
els.donationPipDonate?.addEventListener('click', () => {
  openPayPalDonate().catch((err) => console.warn('donate open failed', err));
});

els.btnChooseForMe?.addEventListener('click', () => {
  chooseForMe().catch((err) => console.warn('choose for me failed', err));
});

els.moodInput?.addEventListener('input', () => syncChooseForMeUi());
els.moodImageFeeling?.addEventListener('input', () => syncChooseForMeUi());

els.btnTts?.addEventListener('click', () => toggleTts());
if ('speechSynthesis' in window) {
  // Voices often load async; warm the list so the first playback uses the right one.
  window.speechSynthesis.onvoiceschanged = () => {};
}

els.btnClearData?.addEventListener('click', async () => {
  await clearAllLocalData().catch((err) => console.warn('clear data failed', err));
});

els.vjToggle.addEventListener('change', () => {
  const on = els.vjToggle.checked;
  // The person's explicit choice is remembered: «off» is never undone by the app.
  chrome.storage.local.set({ [VJ_USER_OPT_OUT_KEY]: !on }).catch(() => {});
  setVjEnabled(on).catch(() => {});
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'LIBRARY_SYNCED') {
    applySyncedLibraryFromStorage().catch(() => {});
    return;
  }
  if (message?.type === 'EMERGENTE_CATALOG_REFRESHED') {
    hydrateEmergenteCatalog()
      .then(() => rebuildTrackPool())
      .catch(() => {});
    return;
  }
  if (message?.type === 'PLAYER_TAB_CLOSED') {
    endListeningSession({ reason: 'player_tab_closed' }).catch(() => {});
    return;
  }
  if (message?.type === 'PLAYLIST_FINISHED') {
    // The worker already stopped capture/overlay; no second STOP round-trip.
    finishPlaylistInPanel('auto').catch(() => {});
    return;
  }
  if (message?.type === 'PLAYER_DETACHED') {
    showPlayerDetached();
    return;
  }
  if (message?.type === 'PLAYER_REATTACHED') {
    hideResumeBar();
    if (currentTrack && els.nowPlaying) {
      els.nowPlaying.textContent = `${currentTrack.artist} — ${currentTrack.title}`;
    }
    return;
  }
  if (message?.type !== 'PLAYLIST_ADVANCED') return;
  if (typeof message.playlistIndex === 'number') {
    playlistIndex = message.playlistIndex;
  }
  if (message.track) {
    noteSessionStarted();
    currentTrack = message.track;
    els.nowPlaying.textContent = `${message.track.artist} — ${message.track.title}`;
    showTrackPip(message.track);
  }
  renderPlaylist();
  persistSession().catch(() => {});
});

(async function init() {
  await initUiLanguage();
  applyDomI18n();
  fillBrandVersion();
  syncUiLangControl();
  renderPresenceGuide();
  await loadPersisted();
  await hydrateEmergenteCatalog();
  await loadLibrary();
  syncChooseForMeUi();
  await renderUserDataPanel();
  if (mood) renderTherapyMedia(mood);
  await maybeShowStartupPips();
  // Background keeps creator library + emergente catalog fresh.
  // Performance mark (used by tests/e2e/a11y-perf.e2e.mjs; visible in DevTools).
  try {
    performance.mark('auscultrix:ready');
  } catch {
    // ignore
  }
  chrome.runtime.sendMessage({ type: 'SYNC_CREATOR_LIBRARY', reason: 'sidepanel_open' }).catch(() => {});
  chrome.runtime
    .sendMessage({ type: 'SYNC_EMERGENTE_CATALOG', reason: 'sidepanel_open' })
    .then(async () => {
      await hydrateEmergenteCatalog();
      rebuildTrackPool();
    })
    .catch(() => {});
})();

document.querySelectorAll('.profile-btn[data-profile]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.getAttribute('data-profile');
    const profile = CREATOR_PROFILES[key];
    if (!profile?.url) return;
    try {
      await chrome.tabs.create({ url: profile.url, active: true });
    } catch {
      window.open(profile.url, '_blank', 'noopener,noreferrer');
    }
  });
});
