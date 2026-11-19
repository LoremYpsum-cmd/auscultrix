/**
 * Sync creator Spotify library (Auscultrix) into local track shape.
 * Liked songs + playlists when refresh token is available; else public playlists.
 * Product / selection brand: Auscultrix.
 */

import { getCreatorAccessToken } from './spotify-auth.js';
import {
  CREATOR_DISPLAY_NAME_DEFAULT,
  getCreatorSpotifyConfig,
  hasCreatorRefreshCredentials,
} from './spotify-config.js';
import { enrichTrackAudioFeatures } from './track-energy.js';

const API = 'https://api.spotify.com/v1';
const PAGE_LIMIT = 50;

/** Fallback stubs when Audio Features API is unavailable — tagged for MIR recompute. */
function estimateFeatures(popularity) {
  const p = typeof popularity === 'number' ? popularity / 100 : 0.5;
  return {
    energy: Math.min(1, Math.max(0.2, 0.35 + p * 0.45)),
    valence: Math.min(1, Math.max(0.2, 0.4 + p * 0.35)),
    danceability: Math.min(1, Math.max(0.2, 0.4 + p * 0.3)),
    acousticness: Math.max(0, 0.55 - p * 0.35),
    instrumentalness: null,
    tempo: null,
    energySource: 'popularity_estimate',
    valenceSource: 'popularity_estimate',
  };
}

function yearFromDate(releaseDate) {
  if (!releaseDate) return null;
  const m = String(releaseDate).match(/^(\d{4})/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function mapTrackObject(t, artistGenres) {
  if (!t || t.is_local || !t.name) return null;
  const artists = Array.isArray(t.artists) ? t.artists : [];
  const primary = artists[0];
  const artistName = primary?.name || artists.map((a) => a.name).filter(Boolean).join('; ');
  if (!artistName) return null;

  const genres = [];
  for (const a of artists) {
    const g = artistGenres.get(a.id);
    if (g) genres.push(...g);
  }
  const uniqueGenres = [...new Set(genres.map((g) => String(g).toLowerCase()).filter(Boolean))];
  const popularity = typeof t.popularity === 'number' ? t.popularity : null;
  const features = estimateFeatures(popularity);

  return enrichTrackAudioFeatures({
    id: t.id || `spotify-${t.uri || t.name}`,
    title: t.name,
    artist: artistName,
    album: t.album?.name || null,
    durationMs: t.duration_ms ?? 0,
    tempo: features.tempo,
    energy: features.energy,
    valence: features.valence,
    danceability: features.danceability,
    acousticness: features.acousticness,
    instrumentalness: features.instrumentalness,
    energySource: features.energySource,
    valenceSource: features.valenceSource,
    musicalKey: null,
    mode: null,
    loudness: null,
    genre: uniqueGenres[0] || null,
    genres: uniqueGenres,
    releaseYear: yearFromDate(t.album?.release_date),
    spotifyId: t.id || null,
    popularity,
    youtubeVideoId: null,
    albumArtUrl: t.album?.images?.[0]?.url || null,
    selectionBy: 'Auscultrix',
  });
}

function mapSavedItem(item, artistGenres) {
  return mapTrackObject(item?.track, artistGenres);
}

function mapPlaylistItem(item, artistGenres) {
  return mapTrackObject(item?.track, artistGenres);
}

async function apiGet(pathOrUrl, accessToken) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) {
    const err = new Error('SPOTIFY_UNAUTHORIZED');
    err.code = 'SPOTIFY_UNAUTHORIZED';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`SPOTIFY_API_${res.status}`);
  }
  return res.json();
}

async function fetchAllPages(firstPath, accessToken) {
  const items = [];
  let nextUrl = firstPath;
  while (nextUrl) {
    const page = await apiGet(nextUrl, accessToken);
    items.push(...(page.items || []));
    nextUrl = page.next || null;
  }
  return items;
}

async function fetchArtistGenres(artistIds, accessToken) {
  const map = new Map();
  const unique = [...new Set(artistIds.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = await apiGet(`/artists?ids=${chunk.join(',')}`, accessToken);
    for (const a of data.artists || []) {
      if (a?.id) map.set(a.id, Array.isArray(a.genres) ? a.genres : []);
    }
  }
  return map;
}

function collectArtistIdsFromSaved(items) {
  const ids = [];
  for (const item of items) {
    for (const a of item?.track?.artists || []) {
      if (a?.id) ids.push(a.id);
    }
  }
  return ids;
}

function buildLibrary(rawTrackMappers, artistGenres) {
  const tracks = [];
  const artistCounts = {};
  const genreCounts = {};
  const seen = new Set();

  for (const mapFn of rawTrackMappers) {
    const track = mapFn(artistGenres);
    if (!track) continue;
    const key = `${(track.title || '').toLowerCase()}|${(track.artist || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push(track);
    artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
    for (const g of track.genres || (track.genre ? [track.genre] : [])) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  return { tracks, artistCounts, genreCounts };
}

async function persistLibrary({ tracks, artistCounts, genreCounts, syncMode, displayName }) {
  const syncedAt = Date.now();
  await chrome.storage.local.set({
    tracks,
    trackCount: tracks.length,
    artistCounts,
    genreCounts,
    librarySource: 'spotify',
    librarySyncedAt: syncedAt,
    libraryCreatorName: displayName,
    librarySyncMode: syncMode,
    selectionProvider: 'Auscultrix',
    spotifyConnected: false,
  });
  return {
    tracks,
    artistCounts,
    genreCounts,
    syncedAt,
    source: 'spotify',
    creatorName: displayName,
    syncMode,
  };
}

/**
 * Full creator sync: liked songs + playlists (refresh token).
 */
async function syncWithRefreshToken(accessToken) {
  const cfg = getCreatorSpotifyConfig();
  const ownerId = cfg.userId || '';
  const liked = await fetchAllPages(`/me/tracks?limit=${PAGE_LIMIT}&offset=0`, accessToken);
  const playlistsRaw = await fetchAllPages(`/me/playlists?limit=${PAGE_LIMIT}&offset=0`, accessToken);
  // Database = playlists created by this Spotify user (Auscultrix).
  const playlists = playlistsRaw.filter((pl) => {
    if (!pl?.id) return false;
    if (!ownerId) return true;
    return pl.owner?.id === ownerId;
  });

  const playlistItems = [];
  for (const pl of playlists) {
    if (!pl?.id) continue;
    try {
      const items = await fetchAllPages(
        `/playlists/${pl.id}/tracks?limit=${PAGE_LIMIT}&offset=0`,
        accessToken,
      );
      playlistItems.push(...items);
    } catch (err) {
      console.warn('playlist sync skip', pl.id, err);
    }
  }

  const allRaw = [...liked, ...playlistItems];
  const genreMap = await fetchArtistGenres(
    collectArtistIdsFromSaved(allRaw).slice(0, 400),
    accessToken,
  );

  const mappers = [
    ...liked.map((item) => (g) => mapSavedItem(item, g)),
    ...playlistItems.map((item) => (g) => mapPlaylistItem(item, g)),
  ];
  const { tracks, artistCounts, genreCounts } = buildLibrary(mappers, genreMap);

  if (!tracks.length) {
    throw new Error('SPOTIFY_LIBRARY_EMPTY');
  }

  // Persist resolved user id if missing
  if (!cfg.userId) {
    try {
      const me = await apiGet('/me', accessToken);
      if (me?.id) {
        await chrome.storage.local.set({ spotifyCreatorUserId: me.id });
      }
      if (me?.display_name) {
        cfg.displayName = me.display_name;
      }
    } catch {
      // ignore
    }
  }

  return persistLibrary({
    tracks,
    artistCounts,
    genreCounts,
    syncMode: 'creator_refresh',
    displayName: cfg.displayName || CREATOR_DISPLAY_NAME_DEFAULT,
  });
}

/**
 * Public playlists only (Client Credentials + SPOTIFY_CREATOR_USER_ID).
 */
async function syncPublicPlaylists(accessToken) {
  const cfg = getCreatorSpotifyConfig();
  const userId = cfg.userId || 'SPOTIFY_CREATOR_USER_ID';
  if (!userId || userId === 'SPOTIFY_CREATOR_USER_ID') {
    throw new Error('SPOTIFY_CREATOR_USER_ID_MISSING');
  }

  const playlists = await fetchAllPages(
    `/users/${encodeURIComponent(userId)}/playlists?limit=${PAGE_LIMIT}&offset=0`,
    accessToken,
  );

  const playlistItems = [];
  for (const pl of playlists) {
    if (!pl?.id || pl.public === false) continue;
    try {
      const items = await fetchAllPages(
        `/playlists/${pl.id}/tracks?limit=${PAGE_LIMIT}&offset=0`,
        accessToken,
      );
      playlistItems.push(...items);
    } catch (err) {
      console.warn('public playlist sync skip', pl.id, err);
    }
  }

  const genreMap = await fetchArtistGenres(
    collectArtistIdsFromSaved(playlistItems).slice(0, 400),
    accessToken,
  );
  const mappers = playlistItems.map((item) => (g) => mapPlaylistItem(item, g));
  const { tracks, artistCounts, genreCounts } = buildLibrary(mappers, genreMap);

  if (!tracks.length) {
    throw new Error('SPOTIFY_LIBRARY_EMPTY');
  }

  return persistLibrary({
    tracks,
    artistCounts,
    genreCounts,
    syncMode: 'public_playlists',
    displayName: cfg.displayName || CREATOR_DISPLAY_NAME_DEFAULT,
  });
}

/**
 * Primary entry: sync Auscultrix library into chrome.storage.local.
 */
export async function syncCreatorLibrary() {
  const { accessToken } = await getCreatorAccessToken();
  if (hasCreatorRefreshCredentials()) {
    return syncWithRefreshToken(accessToken);
  }
  return syncPublicPlaylists(accessToken);
}

/** @deprecated alias */
export async function syncLikedSongsFromSpotify() {
  return syncCreatorLibrary();
}
