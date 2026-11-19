/**
 * Cover image for the Vision palette.
 *
 * Privacy (5.1): only the YouTube thumbnail of the video already opened in the
 * player is used. Up to 5.0 the extension also sent artist and title of every
 * track to the Apple iTunes Search API and to the Deezer API to look for album
 * art — a disclosure of the person's mood-driven listening to two more
 * companies, for a purely decorative purpose. Without a video id the palette
 * falls back to the calm default colours.
 */

function youtubeThumb(videoId) {
  const m = String(videoId || '').match(/[A-Za-z0-9_-]{11}/);
  return m ? `https://i.ytimg.com/vi/${m[0]}/hqdefault.jpg` : null;
}

/**
 * @param {object} track
 * @returns {Promise<string|null>}
 */
export async function resolveCoverUrl(track) {
  if (!track) return null;
  if (track.coverUrl && /^https:\/\/i\.ytimg\.com\//.test(track.coverUrl)) return track.coverUrl;
  return youtubeThumb(track.youtubeVideoId);
}
