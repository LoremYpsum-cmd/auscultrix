/**
 * Universal player bridge — YouTube-only (Bandcamp is PiP when the track is on Bandcamp, not the player).
 * When the extension opens a *search* page for a track, the bridge:
 *   1. scores visible result links against artist+title tokens,
 *   2. navigates to the best match (watch page),
 *   3. after landing, presses the main play control.
 * On direct watch URLs (youtubeVideoId / /watch), it only presses play —
 * never clicks related-video links (that used to steal autoplay).
 *
 * Firefox: unmuted autoplay is blocked by default. We open with mute=1,
 * unlock via muted play / YT player API, then unmute with verification retries.
 */

(function initPlayerBridge() {
  try {
    if (globalThis.__auscultrixPlayerBridge) return;
    globalThis.__auscultrixPlayerBridge = true;
  } catch {
    // ignore
  }

  // Playback bridge is YouTube-only (Bandcamp is PiP, not the player).
  try {
    const host = String(location.hostname || '').toLowerCase();
    const yt =
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com';
    if (!yt) return;
  } catch {
    return;
  }

  const AUTOPLAY_FLAG = 'auscultrixAutoplayPending';
  const CANDIDATE_HREF =
    /\/(watch\?v=|track\/|song\/|album\/|recording\/|video\/|title\/|watch\/|listen\/)/i;

  const IS_FIREFOX = (function detectFirefox() {
    try {
      if (typeof browser !== 'undefined' && browser.runtime) return true;
    } catch {
      // ignore
    }
    try {
      return /firefox/i.test(navigator.userAgent || '');
    } catch {
      return false;
    }
  })();

  /* ------------------------- text matching ------------------------- */

  /**
   * Loop orchestration: several loops can press play (boot, pending-flag,
   * BRIDGE_AUTOPLAY retries, unmute verification). Once audio is really
   * playing, EVERYTHING stops — otherwise they click play/pause forever.
   */
  let settledAudible = false;
  const loopTimers = new Set();
  function trackTimer(id) {
    if (id) loopTimers.add(id);
    return id;
  }
  function untrackTimer(id) {
    try {
      clearInterval(id);
    } catch {
      // ignore
    }
    loopTimers.delete(id);
  }
  function clearUnmuteLoop() {
    if (unmuteTimer) {
      try {
        clearInterval(unmuteTimer);
      } catch {
        // ignore
      }
      loopTimers.delete(unmuteTimer);
      unmuteTimer = null;
    }
  }
  function settleAudible() {
    settledAudible = true;
    clearUnmuteLoop();
    for (const id of [...loopTimers]) {
      try {
        clearInterval(id);
      } catch {
        // ignore
      }
      loopTimers.delete(id);
    }
  }
  /** Minimum gap between synthetic clicks — concurrent loops must not toggle play/pause. */
  let lastPressClickAt = 0;

  /* ------------- playback-state reporting + gesture unlock ------------- */

  let lastReportedState = '';
  let lastReportAt = 0;
  let stateReporter = null;
  let blockedNoticed = false;
  let notAllowedCount = 0;

  function reportPlaybackState() {
    const media = mainVideo();
    const playing = isMediaPlaying(media);
    const muted = !!media?.muted;
    const key = `${playing}:${muted}:${blockedNoticed}`;
    const now = Date.now();
    if (key === lastReportedState || now - lastReportAt < 2000) return;
    lastReportedState = key;
    lastReportAt = now;
    try {
      const rt =
        (typeof chrome !== 'undefined' && chrome.runtime) ||
        (typeof browser !== 'undefined' && browser.runtime) ||
        null;
      rt?.sendMessage?.({
        type: 'PLAYBACK_STATE',
        playing,
        muted,
        blocked: blockedNoticed,
      }).catch?.(() => {});
    } catch {
      // ignore
    }
  }

  function startStateReporter() {
    if (stateReporter) return;
    reportPlaybackState();
    stateReporter = trackTimer(setInterval(() => {
      if (settledAudible) {
        reportPlaybackState();
        untrackTimer(stateReporter);
        stateReporter = null;
        return;
      }
      reportPlaybackState();
    }, 2000));
  }

  function notePlayRejection(err) {
    try {
      if (err && (err.name === 'NotAllowedError' || /notallowed/i.test(String(err)))) {
        notAllowedCount++;
        // Even muted play() rejected repeatedly = browser blocks everything
        // (e.g. Firefox "Block audio and video"). Say so instead of looping blind.
        if (notAllowedCount >= 3) blockedNoticed = true;
      }
    } catch {
      // ignore
    }
  }

  function requestMediaPlay(media) {
    try {
      const p = media?.play?.();
      if (p && typeof p.catch === 'function') p.catch((err) => notePlayRejection(err));
    } catch (err) {
      notePlayRejection(err);
    }
  }

  /**
   * The first REAL user gesture on the page unlocks audio everywhere —
   * this is the one unmute Firefox can never refuse. The video already
   * plays muted by itself; the instant the person touches the tab, sound on.
   */
  let gestureUnlockWired = false;
  function wireGestureUnlock() {
    if (gestureUnlockWired) return;
    gestureUnlockWired = true;
    const unlock = () => {
      try {
        const media = mainVideo();
        if (media && !media.paused) {
          tryUnmute(media);
          scheduleUnmuteVerification(media);
          reportPlaybackState();
        }
      } catch {
        // ignore
      }
    };
    try {
      document.addEventListener('pointerdown', unlock, { passive: true });
      document.addEventListener('keydown', unlock);
    } catch {
      // ignore
    }
  }

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\(.*?\)|\[.*?\]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    return normalize(s)
      .split(' ')
      .filter((w) => w.length > 1);
  }

  /** 0–1 token overlap of query inside candidate text. */
  function overlapScore(queryTokens, text) {
    if (!queryTokens.length) return 0;
    const hay = ` ${normalize(text)} `;
    let hit = 0;
    for (const tok of queryTokens) {
      if (hay.includes(` ${tok} `) || hay.includes(tok)) hit++;
    }
    return hit / queryTokens.length;
  }

  /* --------------------- result selection + click --------------------- */

  function candidateLinks() {
    const anchors = [...document.querySelectorAll('a[href]')];
    return anchors.filter((a) => {
      const href = a.getAttribute('href') || '';
      if (!CANDIDATE_HREF.test(href)) return false;
      const r = a.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      return true;
    });
  }

  function linkText(a) {
    return [
      a.getAttribute('aria-label'),
      a.getAttribute('title'),
      a.textContent,
      a.closest('[role="row"], li, article, ytd-video-renderer, [data-testid]')?.textContent?.slice(0, 300),
    ]
      .filter(Boolean)
      .join(' ');
  }

  function findBestResult(artist, title) {
    const qTitle = tokens(title);
    const qArtist = tokens(artist);
    let best = null;
    let bestScore = 0;
    for (const a of candidateLinks()) {
      const text = linkText(a);
      const s = 0.65 * overlapScore(qTitle, text) + 0.35 * overlapScore(qArtist, text);
      if (s > bestScore) {
        bestScore = s;
        best = a;
      }
    }
    // Require a solid title match before auto-navigating
    return bestScore >= 0.55 ? best : null;
  }

  function isWatchPage() {
    try {
      return String(location.pathname || '').startsWith('/watch');
    } catch {
      return false;
    }
  }

  function isSearchPage() {
    try {
      const path = String(location.pathname || '');
      return path.startsWith('/results') || path.startsWith('/search');
    } catch {
      return false;
    }
  }

  function mainVideo() {
    return (
      document.querySelector('video.html5-main-video') ||
      document.querySelector('#movie_player video') ||
      document.querySelector('ytd-player video') ||
      document.querySelector('.html5-video-player video') ||
      document.querySelector('video')
    );
  }

  /** YouTube player API object (Firefox needs wrappedJSObject for page methods). */
  function ytPlayerApi() {
    const el =
      document.getElementById('movie_player') ||
      document.querySelector('#movie_player') ||
      document.querySelector('.html5-video-player');
    if (!el) return null;
    try {
      const raw = el.wrappedJSObject || el;
      if (typeof raw.playVideo === 'function' || typeof raw.play === 'function') return raw;
    } catch {
      // ignore
    }
    return el;
  }

  function controlLabel(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('data-title-no-tooltip'),
      el.getAttribute('data-tooltip-text'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  /** true = Play, false = Pause, null = unknown */
  function playControlKind(el) {
    const label = controlLabel(el);
    if (/pause|pausa/.test(label)) return false;
    if (/play|riproduci|reproducir|abspielen|lecture|재생|再生/.test(label)) return true;
    return null;
  }

  function isMediaPlaying(media) {
    return !!(media && !media.paused && !media.ended && media.readyState >= 2);
  }

  function isAudiblyPlaying(media) {
    return isMediaPlaying(media) && media && media.muted === false;
  }

  /** Realistic activation — Firefox often ignores bare .click() for media unlock. */
  function activateElement(el) {
    if (!el) return false;
    lastPressClickAt = Date.now();
    const rect = el.getBoundingClientRect?.() || { left: 0, top: 0, width: 1, height: 1 };
    const cx = rect.left + Math.max(rect.width / 2, 1);
    const cy = rect.top + Math.max(rect.height / 2, 1);
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1,
    };
    try {
      if (typeof PointerEvent === 'function') {
        el.dispatchEvent(
          new PointerEvent('pointerdown', { ...base, pointerId: 1, pointerType: 'mouse' }),
        );
        el.dispatchEvent(
          new PointerEvent('pointerup', { ...base, pointerId: 1, pointerType: 'mouse', buttons: 0 }),
        );
      }
    } catch {
      // ignore
    }
    try {
      el.dispatchEvent(new MouseEvent('mousedown', base));
      el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
      el.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
    } catch {
      try {
        el.click();
      } catch {
        return false;
      }
    }
    return true;
  }

  let unmuteTimer = null;
  let unmuteAttempts = 0;
  let unmuteStalls = 0;
  let lastDidUnmute = false;

  function tryUnmute(vid) {
    const media = vid || mainVideo();
    const player = ytPlayerApi();
    try {
      if (player) {
        if (typeof player.unMute === 'function') player.unMute();
        if (typeof player.setVolume === 'function') player.setVolume(100);
        if (typeof player.unMuteVideo === 'function') player.unMuteVideo();
      }
    } catch {
      // ignore
    }
    if (media) {
      try {
        media.muted = false;
        media.volume = 1;
      } catch {
        // ignore
      }
    }
    // Prefer API unmute; avoid clicking ytp-mute-button (easy to toggle wrong way).
  }

  /**
   * After muted unlock, keep trying to restore audio. Firefox often pauses on
   * the first unmuted=false without a user gesture — remute + replay + retry.
   * Unmute ONLY once muted playback is stable (currentTime past the head);
   * unmuting a paused or just-born video makes Firefox pause it for good.
   */
  function scheduleUnmuteVerification(vid) {
    clearUnmuteLoop();
    unmuteAttempts = 0;
    unmuteStalls = 0;
    lastDidUnmute = false;
    const maxAttempts = IS_FIREFOX ? 40 : 16;
    unmuteTimer = trackTimer(setInterval(() => {
      if (settledAudible) {
        untrackTimer(unmuteTimer);
        unmuteTimer = null;
        return;
      }
      unmuteAttempts++;
      const media = vid || mainVideo();
      if (!media) {
        if (unmuteAttempts >= maxAttempts) {
          untrackTimer(unmuteTimer);
          unmuteTimer = null;
        }
        return;
      }
      if (isAudiblyPlaying(media)) {
        settleAudible();
        return;
      }
      if (!isMediaPlaying(media)) {
        // Paused right after we unmuted → Firefox rejected it. Remute, replay.
        if (lastDidUnmute) {
          unmuteStalls++;
          lastDidUnmute = false;
          // Too many rejected unmutes: stop pressing anything and leave the
          // video playing muted (stable) instead of toggling play/pause forever.
          if (unmuteStalls > 8) {
            try {
              media.muted = true;
            } catch {
              // ignore
            }
            settleAudible();
            return;
          }
        }
        // Unmute may have paused — remute and restart, then unmute again.
        try {
          media.muted = true;
        } catch {
          // ignore
        }
        try {
          const player = ytPlayerApi();
          if (player && typeof player.mute === 'function') player.mute();
          if (player && typeof player.playVideo === 'function') player.playVideo();
        } catch {
          // ignore
        }
        requestMediaPlay(media);
        if (unmuteAttempts >= maxAttempts) {
          untrackTimer(unmuteTimer);
          unmuteTimer = null;
        }
        return;
      }
      // Playing but muted: wait until playback is past the head before unmuting.
      // Firefox pauses videos unmuted too early — patience here is the whole fix.
      try {
        if ((media.currentTime || 0) < 0.4) {
          if (unmuteAttempts >= maxAttempts) {
            untrackTimer(unmuteTimer);
            unmuteTimer = null;
          }
          return;
        }
      } catch {
        // ignore
      }
      lastDidUnmute = true;
      tryUnmute(media);
      if (unmuteAttempts >= maxAttempts) {
        untrackTimer(unmuteTimer);
        unmuteTimer = null;
      }
    }, IS_FIREFOX ? 350 : 450));
  }

  function mutedMediaPlay(vid) {
    if (!vid) return false;
    try {
      vid.muted = true;
      vid.defaultMuted = true;
    } catch {
      // ignore
    }
    try {
      const player = ytPlayerApi();
      if (player) {
        if (typeof player.mute === 'function') player.mute();
        if (typeof player.setVolume === 'function') player.setVolume(0);
        if (typeof player.playVideo === 'function') player.playVideo();
        else if (typeof player.play === 'function') player.play();
      }
    } catch {
      // ignore
    }
    try {
      const p = vid.play?.();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          scheduleUnmuteVerification(vid);
        }).catch((err) => notePlayRejection(err));
      } else {
        scheduleUnmuteVerification(vid);
      }
    } catch (err) {
      notePlayRejection(err);
    }
    return isMediaPlaying(vid);
  }

  /**
   * Press play without toggling Pause. Returns true when playback is running
   * (muted counts — unmute loop continues separately). Never returns true for a
   * failed unmuted play() — callers keep retrying while paused.
   */
  function tryPressPlay() {
    if (settledAudible) return true;
    const media = mainVideo();
    if (isAudiblyPlaying(media)) {
      settleAudible();
      return true;
    }
    // Playing (even muted) is progress — NEVER click any control here.
    // Clicking the toggle while it plays (stale labels included) is what
    // caused the endless play/pause loop. Only push the unmute loop.
    if (isMediaPlaying(media)) {
      scheduleUnmuteVerification(media);
      return true;
    }
    // Paused: throttle synthetic clicks so concurrent loops can't toggle twice.
    if (Date.now() - lastPressClickAt < 800) return isMediaPlaying(mainVideo());

    const largeSelectors = [
      'button.ytp-large-play-button',
      '.ytp-large-play-button',
      'button.ytp-play-button.ytp-large-play-button',
      '.ytp-cued-thumbnail-overlay-image',
      '.ytp-cued-thumbnail-overlay',
      '.ytp-cued-thumbnail-overlay-icon',
      '#movie_player .ytp-cued-thumbnail-overlay',
    ];
    for (const sel of largeSelectors) {
      const large = document.querySelector(sel);
      if (!large) continue;
      activateElement(large);
      const now = mainVideo();
      if (isMediaPlaying(now)) {
        scheduleUnmuteVerification(now);
        return true;
      }
    }

    const selectors = [
      'button.ytp-play-button[data-title-no-tooltip="Play"]',
      'button.ytp-play-button[aria-label*="Play" i]',
      'button.ytp-play-button[aria-label*="Riproduci" i]',
      'button.ytp-play-button[aria-label*="Lecture" i]',
      'button.ytp-play-button',
      '.ytp-play-button',
      '[data-testid="play-button"]',
      'button[aria-label*="play" i]:not([aria-label*="playlist" i]):not([aria-label*="Pause" i]):not([aria-label*="Pausa" i])',
      'button[aria-label*="riproduci" i]',
      'button[title*="play" i]',
      'button[title*="Riproduci" i]',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (!btn) continue;
      const kind = playControlKind(btn);
      // Never click Pause — that stops a muted autoplay that already started.
      if (kind === false) continue;
      if (isMediaPlaying(media)) {
        scheduleUnmuteVerification(media);
        return true;
      }
      const mayClick = kind === true || !media || media.paused;
      if (!mayClick) continue;
      activateElement(btn);
      const after = mainVideo();
      if (isMediaPlaying(after)) {
        scheduleUnmuteVerification(after);
        return true;
      }
      break; // one control click per attempt; then media fallback
    }

    // Browsers (esp. Firefox) block unmuted autoplay: mute → play → unmute loop.
    const vid = media || mainVideo();
    if (vid && vid.paused) {
      if (mutedMediaPlay(vid)) return true;
      // Even if not yet "playing" by readyState, YT API may still be starting.
      if (IS_FIREFOX) scheduleUnmuteVerification(vid);
      return isMediaPlaying(vid);
    }
    if (vid && !vid.paused) {
      scheduleUnmuteVerification(vid);
      return true;
    }
    return isMediaPlaying(vid || mainVideo());
  }

  /* ----------------------------- flow ----------------------------- */

  function withAutoplayParam(href) {
    try {
      const u = new URL(href, location.origin);
      if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay', '1');
      // mute=1 is required for Firefox (and helps Chromium) to start without a gesture.
      if (!u.searchParams.has('mute')) u.searchParams.set('mute', '1');
      return u.href;
    } catch {
      return href;
    }
  }

  function scheduleAutoplayAfterNavigation() {
    try {
      sessionStorage.setItem(AUTOPLAY_FLAG, String(Date.now()));
    } catch {
      // ignore
    }
  }

  function consumePendingAutoplay() {
    let stamp = null;
    try {
      stamp = Number(sessionStorage.getItem(AUTOPLAY_FLAG));
      sessionStorage.removeItem(AUTOPLAY_FLAG);
    } catch {
      return;
    }
    if (!stamp || Date.now() - stamp > 45_000) return;
    // Landing page after a bridge navigation: press play once things render.
    let attempts = 0;
    const max = IS_FIREFOX ? 36 : 20;
    const timer = trackTimer(setInterval(() => {
      attempts++;
      if (settledAudible || tryPressPlay() || attempts >= max) untrackTimer(timer);
    }, IS_FIREFOX ? 400 : 500));
  }

  function handleAutoplayRequest(message, sendResponse) {
    const artist = message.artist || '';
    const title = message.title || '';
    const requestedVideoId = message.youtubeVideoId || null;
    // New track, new mission: reset per-track autoplay state (soft-navs reuse
    // the same document, so stale flags would otherwise stick forever).
    settledAudible = false;
    blockedNoticed = false;
    notAllowedCount = 0;
    lastReportedState = '';
    wireGestureUnlock();
    startStateReporter();
    const directPlay = message.directPlay === true || isWatchPage();
    let attempts = 0;
    const maxAttempts = IS_FIREFOX ? 28 : 16;

    /** User navigated this tab to their own watch page — don't touch it. */
    function watchPageMatchesRequest() {
      if (!requestedVideoId) return true;
      try {
        const u = new URL(location.href);
        const v = u.searchParams.get('v');
        if (!v || v === requestedVideoId) return true;
        // Extension navigations always carry autoplay=1 (direct + bridge clicks).
        if (u.searchParams.get('autoplay') === '1') return true;
        return false;
      } catch {
        return true;
      }
    }

    /** User typed their own search in this tab — don't hijack it. */
    function searchQueryMatchesRequest() {
      try {
        const u = new URL(location.href);
        const q = u.searchParams.get('search_query') || '';
        if (!q) return true;
        const reqToks = [...tokens(artist), ...tokens(title)];
        if (!reqToks.length) return true;
        const hay = ` ${normalize(q)} `;
        let hit = 0;
        for (const tok of reqToks) {
          if (hay.includes(` ${tok} `) || hay.includes(tok)) hit++;
        }
        // Geo suffixes appended by the extension add words — 0.6 tolerates them.
        return hit / reqToks.length >= 0.6;
      } catch {
        return true;
      }
    }

    const attempt = () => {
      attempts++;
      if (isWatchPage() && !watchPageMatchesRequest()) {
        sendResponse?.({ ok: true, skipped: 'user_watch' });
        return true;
      }
      if (!directPlay && isSearchPage() && !searchQueryMatchesRequest()) {
        sendResponse?.({ ok: true, skipped: 'user_search' });
        return true;
      }
      const media = mainVideo();
      // Prefer audible success; muted play still counts so we stop thrashing clicks.
      if (isMediaPlaying(media) && (media.currentTime > 0.15 || attempts > 2)) {
        if (media.muted) scheduleUnmuteVerification(media);
        sendResponse?.({ ok: true, already: 'playing', muted: !!media.muted });
        return true;
      }

      // Search / results only: open the best matching watch link.
      // On /watch (or directPlay from background), NEVER click related videos —
      // that was aborting autoplay on tracks with youtubeVideoId.
      if (!directPlay && isSearchPage()) {
        const best =
          findBestResult(artist, title) ||
          document.querySelector('ytd-video-renderer a#video-title') ||
          document.querySelector('a#video-title-link') ||
          document.querySelector('ytd-video-renderer a[href*="/watch?v="]') ||
          candidateLinks().find((a) => /\/watch\?v=/i.test(a.getAttribute('href') || ''));
        if (best) {
          scheduleAutoplayAfterNavigation();
          const href = withAutoplayParam(best.href || best.getAttribute?.('href') || '');
          try {
            activateElement(best);
          } catch {
            if (href) location.href = href;
          }
          // Soft-nav may not fire click — force navigate with mute+autoplay.
          if (href && isSearchPage()) {
            try {
              location.href = href;
            } catch {
              // ignore
            }
          }
          return true;
        }
      }

      return tryPressPlay();
    };

    if (attempt()) {
      sendResponse?.({ ok: true });
      return;
    }
    const timer = trackTimer(setInterval(() => {
      if (settledAudible || attempt() || attempts >= maxAttempts) {
        untrackTimer(timer);
      }
    }, IS_FIREFOX ? 450 : 700));
    sendResponse?.({ ok: true, deferred: true });
  }

  const runtime =
    (typeof chrome !== 'undefined' && chrome.runtime) ||
    (typeof browser !== 'undefined' && browser.runtime) ||
    null;

  if (runtime?.onMessage) {
    runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'BRIDGE_PING') {
        sendResponse({ ok: true, firefox: IS_FIREFOX });
        return undefined;
      }
      if (message?.type === 'BRIDGE_AUTOPLAY') {
        handleAutoplayRequest(message, sendResponse);
        return undefined;
      }
      return undefined;
    });
  }

  /**
   * True only for extension-initiated landings: the bridge sets the pending
   * flag before navigating, and every extension watch URL carries autoplay=1.
   * Casual user browsing must never be auto-pressed by the extension.
   */
  function isExtensionWatchLanding(hadPendingFlag) {
    if (hadPendingFlag) return true;
    try {
      const u = new URL(location.href);
      if (u.searchParams.get('autoplay') === '1') return true;
    } catch {
      // ignore
    }
    return false;
  }

  function readPendingAutoplayFlag() {
    try {
      const stamp = Number(sessionStorage.getItem(AUTOPLAY_FLAG));
      return !!stamp && Date.now() - stamp <= 45_000;
    } catch {
      return false;
    }
  }

  const hadPendingAutoplay = readPendingAutoplayFlag();
  consumePendingAutoplay();

  // Extension watch landings only (autoplay=1 often blocked unmuted): keep
  // pressing play. Never auto-press on casual user browsing.
  if (isWatchPage() && isExtensionWatchLanding(hadPendingAutoplay)) {
    wireGestureUnlock();
    startStateReporter();
    let bootAttempts = 0;
    const bootMax = IS_FIREFOX ? 30 : 12;
    const boot = trackTimer(setInterval(() => {
      bootAttempts++;
      if (settledAudible || tryPressPlay() || bootAttempts >= bootMax) untrackTimer(boot);
    }, IS_FIREFOX ? 400 : 600));
  }
})();
