/**
 * Creator Spotify config (Auscultrix) — never user-editable in UI.
 */

import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  SPOTIFY_CREATOR_DISPLAY_NAME,
  SPOTIFY_CREATOR_USER_ID,
} from '../config/spotify.creator.local.js';
import { CREATOR_SPOTIFY_USER_ID } from './creator-profiles.js';

export const CREATOR_DISPLAY_NAME_DEFAULT = 'Auscultrix';

/**
 * @returns {{
 *   clientId: string,
 *   clientSecret: string,
 *   refreshToken: string,
 *   displayName: string,
 *   userId: string,
 * }}
 */
export function getCreatorSpotifyConfig() {
  return {
    clientId: String(SPOTIFY_CLIENT_ID || '').trim(),
    clientSecret: String(SPOTIFY_CLIENT_SECRET || '').trim(),
    refreshToken: String(SPOTIFY_REFRESH_TOKEN || '').trim(),
    displayName:
      String(SPOTIFY_CREATOR_DISPLAY_NAME || '').trim() || CREATOR_DISPLAY_NAME_DEFAULT,
    userId:
      String(SPOTIFY_CREATOR_USER_ID || '').trim() || CREATOR_SPOTIFY_USER_ID,
  };
}

export function hasCreatorRefreshCredentials() {
  const c = getCreatorSpotifyConfig();
  return !!(c.clientId && c.refreshToken);
}

export function hasCreatorPublicFallbackCredentials() {
  const c = getCreatorSpotifyConfig();
  return !!(c.clientId && c.clientSecret && c.userId);
}

/** @deprecated kept for older imports — always empty for end users */
export async function getSpotifyClientId() {
  return getCreatorSpotifyConfig().clientId;
}

/** @deprecated no-op — consumers cannot set Client ID */
export async function setSpotifyClientId() {}

export function spotifyRedirectUri() {
  return 'http://127.0.0.1:8765/callback';
}
