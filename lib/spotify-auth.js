/**
 * Creator-only Spotify token refresh (Auscultrix).
 * No chrome.identity / no user Connect flow.
 */

import {
  getCreatorSpotifyConfig,
  hasCreatorPublicFallbackCredentials,
  hasCreatorRefreshCredentials,
} from './spotify-config.js';
import { clearTokens, loadTokens, saveTokens } from './token-vault.js';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = 'user-library-read playlist-read-private playlist-read-collaborative';

/**
 * @returns {Promise<boolean>}
 */
export async function hasCreatorAuth() {
  return hasCreatorRefreshCredentials() || hasCreatorPublicFallbackCredentials();
}

async function refreshWithCreatorToken() {
  const cfg = getCreatorSpotifyConfig();
  if (!cfg.clientId || !cfg.refreshToken) {
    throw new Error('SPOTIFY_CREATOR_REFRESH_MISSING');
  }
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    grant_type: 'refresh_token',
    refresh_token: cfg.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    await clearTokens();
    throw new Error(`SPOTIFY_REFRESH_${res.status}`);
  }
  const json = await res.json();
  const next = {
    access_token: json.access_token,
    refresh_token: json.refresh_token || cfg.refreshToken,
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 30_000,
    token_type: json.token_type || 'Bearer',
    scope: json.scope || SCOPES,
    mode: 'creator_refresh',
  };
  await saveTokens(next);
  return next;
}

async function clientCredentialsToken() {
  const cfg = getCreatorSpotifyConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error('SPOTIFY_CLIENT_CREDENTIALS_MISSING');
  }
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`);
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`SPOTIFY_CLIENT_CREDENTIALS_${res.status}`);
  }
  const json = await res.json();
  const next = {
    access_token: json.access_token,
    refresh_token: null,
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 30_000,
    token_type: json.token_type || 'Bearer',
    scope: json.scope || '',
    mode: 'client_credentials',
  };
  await saveTokens(next);
  return next;
}

/**
 * Bearer access token for creator library sync.
 * Prefers refresh-token path (liked songs + playlists); else client credentials.
 * @returns {Promise<{ accessToken: string, mode: 'creator_refresh'|'client_credentials' }>}
 */
export async function getCreatorAccessToken() {
  let tokens = await loadTokens();
  const preferRefresh = hasCreatorRefreshCredentials();
  const modeOk =
    tokens?.access_token &&
    tokens.expires_at &&
    Date.now() < tokens.expires_at &&
    ((preferRefresh && tokens.mode === 'creator_refresh') ||
      (!preferRefresh && tokens.mode === 'client_credentials'));

  if (modeOk) {
    return { accessToken: tokens.access_token, mode: tokens.mode };
  }

  if (preferRefresh) {
    tokens = await refreshWithCreatorToken();
    return { accessToken: tokens.access_token, mode: 'creator_refresh' };
  }

  if (hasCreatorPublicFallbackCredentials()) {
    tokens = await clientCredentialsToken();
    return { accessToken: tokens.access_token, mode: 'client_credentials' };
  }

  throw new Error('SPOTIFY_CREATOR_AUTH_MISSING');
}

/** @deprecated use getCreatorAccessToken */
export async function getValidAccessToken() {
  const { accessToken } = await getCreatorAccessToken();
  return accessToken;
}

/** Always false for end users — no personal Spotify link. */
export async function isSpotifyConnected() {
  return false;
}

export async function connectSpotify() {
  throw new Error('SPOTIFY_USER_CONNECT_DISABLED');
}

export async function disconnectSpotify() {
  /* no-op for consumers */
}
