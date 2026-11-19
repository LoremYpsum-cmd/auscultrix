/**
 * Detect real end-of-track on music host pages → ask background to advance playlist.
 * Ignores search/preview noise: only armed media that actually played long enough.
 */

(function initAutoAdvance() {
  // Player is YouTube-only — never arm end-of-track on Bandcamp / other hosts.
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

  const COOLDOWN_MS = 4500;
  const MIN_PLAYED_SEC = 8;
  const MIN_DURATION_SEC = 25;
  const ARM_GRACE_MS = 2500;

  /** @type {WeakSet<HTMLMediaElement>} */
  const attached = new WeakSet();
  /** @type {WeakMap<HTMLMediaElement, { armed: boolean, maxTime: number, startedAt: number }>} */
  const state = new WeakMap();

  let lastReportAt = 0;
  let pageReadyAt = Date.now();
  let ytEndedHooked = false;

  function isLikelySearchPage() {
    try {
      const u = new URL(location.href);
      const host = u.hostname;
      const path = u.pathname;
      if (host.includes('youtube.com')) {
        if (path.startsWith('/results') || path.startsWith('/feed')) return true;
        if (path === '/watch') return false;
        return path !== '/watch' && !path.startsWith('/shorts/');
      }
      if (host.includes('bandcamp.com') && path.includes('/search')) return true;
      if (host.includes('spotify.com') && path.startsWith('/search')) return true;
      if (host.includes('deezer.com') && path.includes('/search')) return true;
      if (host.includes('tidal.com') && path.includes('/search')) return true;
      if (host.includes('music.apple.com') && path.includes('/search')) return true;
      if (host.includes('amazon.com') || host.includes('music.amazon')) {
        if (path.includes('/search')) return true;
      }
      if (path.includes('/search') || path.includes('/results')) return true;
    } catch {
      // ignore
    }
    return false;
  }

  function isYouTubeWatch() {
    try {
      const u = new URL(location.href);
      return u.hostname.includes('youtube.com') && (u.pathname === '/watch' || u.pathname.startsWith('/shorts/'));
    } catch {
      return false;
    }
  }

  function mediaLooksReal(el) {
    const dur = Number(el.duration);
    if (!Number.isFinite(dur) || dur <= 0) {
      // Live / unknown duration: allow only if we played long enough
      const st = state.get(el);
      return !!(st && st.maxTime >= MIN_PLAYED_SEC);
    }
    // Short previews / ads / search hover clips
    if (dur < MIN_DURATION_SEC && !isYouTubeWatch()) return false;
    return true;
  }

  function canReport() {
    if (Date.now() - pageReadyAt < ARM_GRACE_MS) return false;
    if (Date.now() - lastReportAt < COOLDOWN_MS) return false;
    return true;
  }

  function reportEnded(reason) {
    if (!canReport()) return;
    lastReportAt = Date.now();
    chrome.runtime
      .sendMessage({
        type: 'TRACK_ENDED',
        reason: reason || 'media_ended',
        url: location.href,
        hostname: location.hostname,
      })
      .catch(() => {});
  }

  function getState(el) {
    let st = state.get(el);
    if (!st) {
      st = { armed: false, maxTime: 0, startedAt: 0 };
      state.set(el, st);
    }
    return st;
  }

  function arm(el) {
    const st = getState(el);
    st.armed = true;
    if (!st.startedAt) st.startedAt = Date.now();
  }

  function onTimeUpdate(el) {
    const st = getState(el);
    const t = Number(el.currentTime) || 0;
    if (t > st.maxTime) st.maxTime = t;
    if (t >= MIN_PLAYED_SEC) arm(el);
    // Near-end fallback for hosts that skip the ended event
    const dur = Number(el.duration);
    if (
      st.armed &&
      mediaLooksReal(el) &&
      Number.isFinite(dur) &&
      dur >= MIN_DURATION_SEC &&
      t > 0 &&
      dur - t <= 0.35 &&
      !el.paused &&
      !el.seeking
    ) {
      // Will usually get a real ended soon; soft arm only
    }
  }

  function onEnded(el) {
    const st = getState(el);
    if (!st.armed) return;
    if (st.maxTime < MIN_PLAYED_SEC) return;
    if (!mediaLooksReal(el)) return;
    // Search pages: only if this media clearly played as a real track
    if (isLikelySearchPage() && !isYouTubeWatch()) {
      const dur = Number(el.duration);
      if (!Number.isFinite(dur) || dur < MIN_DURATION_SEC) return;
      if (st.maxTime < Math.min(dur * 0.5, 20)) return;
    }
    reportEnded('html_media_ended');
  }

  function attachMedia(el) {
    if (!(el instanceof HTMLMediaElement)) return;
    if (attached.has(el)) return;
    attached.add(el);

    el.addEventListener('playing', () => arm(el), { passive: true });
    el.addEventListener('play', () => arm(el), { passive: true });
    el.addEventListener('timeupdate', () => onTimeUpdate(el), { passive: true });
    el.addEventListener('ended', () => onEnded(el), { passive: true });
  }

  function scanMedia() {
    document.querySelectorAll('audio, video').forEach((el) => attachMedia(el));
  }

  /** YouTube: main player ended + player state ENDED (0) when API is exposed. */
  function bindVideo() {
    const video =
      document.querySelector('#movie_player video.html5-main-video') ||
      document.querySelector('#movie_player video') ||
      document.querySelector('ytd-player video') ||
      document.querySelector('video.html5-main-video');
    if (video) attachMedia(video);
  }

  // Class-based ended mode on the HTML5 player chrome
  function watchEndedClass() {
    if (!isYouTubeWatch()) return;
    const player = document.querySelector('#movie_player');
    if (!player) return;
    if (player.classList.contains('ended-mode')) {
      const video = player.querySelector('video');
      const st = video ? getState(video) : null;
      if (st?.armed && (st.maxTime >= MIN_PLAYED_SEC || (Number(video?.currentTime) || 0) >= MIN_PLAYED_SEC)) {
        reportEnded('youtube_ended_mode');
      }
    }
  }

  /**
   * One observer and one poll for the whole life of the page. YouTube is a
   * single-page app: creating them again at every in-app navigation (as
   * older versions did) piled up observers and intervals without end.
   * Mutation work is debounced so the busy YouTube DOM never floods the main thread.
   */
  let mutationTimer = null;
  function onDomMutations() {
    if (mutationTimer != null) return;
    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      scanMedia();
      bindVideo();
      watchEndedClass();
    }, 250);
  }

  function hookYouTube() {
    if (!location.hostname.includes('youtube.com')) return;
    bindVideo();
    if (ytEndedHooked) return;
    ytEndedHooked = true;

    const obs = new MutationObserver(onDomMutations);
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // Poll YT player state when the page exposes it (not always available to content scripts)
    setInterval(() => {
      if (!isYouTubeWatch()) return;
      bindVideo();
      try {
        const player = document.querySelector('#movie_player');
        if (player && typeof player.getPlayerState === 'function') {
          const ps = player.getPlayerState();
          // 0 = ENDED
          if (ps === 0) {
            const video = player.querySelector('video');
            const st = video ? getState(video) : null;
            if (st?.armed && st.maxTime >= MIN_PLAYED_SEC) {
              reportEnded('youtube_player_state_ended');
            }
          }
        }
      } catch {
        // ignore cross-world limits
      }
      watchEndedClass();
    }, 1200);
  }

  /** Media Session: weak fallback — only when armed media is near end on a watch-like page. */
  function hookMediaSessionFallback() {
    setInterval(() => {
      try {
        const ms = navigator.mediaSession;
        if (!ms || ms.playbackState === 'playing') return;
        const medias = [...document.querySelectorAll('audio, video')];
        for (const el of medias) {
          const st = state.get(el);
          if (!st?.armed || st.maxTime < MIN_PLAYED_SEC) continue;
          if (!mediaLooksReal(el)) continue;
          const dur = Number(el.duration);
          const t = Number(el.currentTime) || 0;
          if (!Number.isFinite(dur) || dur < MIN_DURATION_SEC) continue;
          // Near end and paused / session idle
          if (dur - t <= 1.25 && (el.paused || ms.playbackState === 'none' || ms.playbackState === 'paused')) {
            if (isLikelySearchPage() && !isYouTubeWatch()) continue;
            reportEnded('media_near_end');
            return;
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
  }

  // SPA navigations reset the grace window so an unload-ended does not advance.
  // Observers stay the same: only the per-page state is reset.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      pageReadyAt = Date.now();
      lastReportAt = 0;
      bindVideo();
    }
  }, 500);

  scanMedia();
  hookYouTube();
  hookMediaSessionFallback();
})();
