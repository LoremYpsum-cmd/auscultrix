/**
 * Creator Spotify credentials template (Auscultrix).
 *
 * End users never see or edit this. Copy to spotify.creator.local.js
 * (gitignored) or run once:
 *
 * node scripts/spotify_creator_auth.mjs
 *
 * That script writes Client ID + refresh token + Spotify user id locally.
 * Scope: user-library-read playlist-read-private playlist-read-collaborative
 *
 * Public fallback (no refresh token): set CLIENT_ID + CLIENT_SECRET +
 * SPOTIFY_CREATOR_USER_ID to sync public playlists only.
 */
export const SPOTIFY_CLIENT_ID = '';
/** Optional — needed for Client Credentials public-playlist fallback. */
export const SPOTIFY_CLIENT_SECRET = '';
/** Long-lived refresh token for account «Auscultrix» (preferred). */
export const SPOTIFY_REFRESH_TOKEN = '';
export const SPOTIFY_CREATOR_DISPLAY_NAME = 'Auscultrix';
/** Public Spotify user id (Auscultrix; product brand Auscultrix). */
export const SPOTIFY_CREATOR_USER_ID = '31ygn4tyesquwap45l4xmrhoxb3y';
