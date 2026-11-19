/**
 * Credential-free library sync from the curator's PUBLIC Spotify profile.
 * Reads open.spotify.com embed pages (no login, no API key, no user data out):
 * each embed page carries the playlist track list as JSON. MIR features are
 * re-attached from the bundled seed when available.
 */

import { CURATOR_PLAYLISTS, CURATOR_PROFILE_URL } from './curator-playlists.js';
import { seedFeatureMap } from './library-seed.js';
import { enrichTrackAudioFeatures } from './track-energy.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchEmbedEntity(playlistId) {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
    credentials: 'omit',
  });
  if (!res.ok) throw new Error(`EMBED_HTTP_${res.status}`);
  const html = await res.text();
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  if (!m) throw new Error('EMBED_DATA_MISSING');
  const json = JSON.parse(m[1]);
  const entity = json?.props?.pageProps?.state?.data?.entity;
  if (!entity?.trackList) throw new Error('EMBED_TRACKLIST_MISSING');
  return entity;
}

function trackFromEmbedItem(item, playlistName, features) {
  const uri = String(item?.uri || '');
  const id = uri.startsWith('spotify:track:') ? uri.slice('spotify:track:'.length) : null;
  if (!id || !item.title) return null;
  const artists = String(item.subtitle || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seedF = features.get(id) || null;
  return enrichTrackAudioFeatures({
    id,
    spotifyId: id,
    title: item.title,
    artist: artists[0] || item.subtitle || '',
    artists,
    album: null,
    durationMs: Number(item.duration) || 0,
    genre: null,
    genres: [],
    youtubeVideoId: null,
    playlists: [playlistName],
    selectionBy: 'Auscultrix',
    ...(seedF || {}),
  });
}

/**
 * Sync the whole public profile into chrome.storage.local (same shape as
 * the credentialed sync). Throws when nothing could be fetched.
 */
export async function syncPublicProfileLibrary() {
  const features = await seedFeatureMap().catch(() => new Map());
  const byId = new Map();
  let okPlaylists = 0;

  for (const pl of CURATOR_PLAYLISTS) {
    try {
      const entity = await fetchEmbedEntity(pl.id);
      const name = entity.name || pl.name;
      for (const item of entity.trackList || []) {
        const t = trackFromEmbedItem(item, name, features);
        if (!t) continue;
        const existing = byId.get(t.id);
        if (existing) {
          if (!existing.playlists.includes(name)) existing.playlists.push(name);
        } else {
          byId.set(t.id, t);
        }
      }
      okPlaylists++;
      await sleep(250);
    } catch (err) {
      console.warn('[library] public playlist skipped', pl.id, err?.message || err);
    }
  }

  const tracks = [...byId.values()];
  if (!tracks.length || !okPlaylists) {
    throw new Error('PUBLIC_LIBRARY_EMPTY');
  }

  const artistCounts = {};
  for (const t of tracks) {
    artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
  }

  const syncedAt = Date.now();
  await chrome.storage.local.set({
    tracks,
    trackCount: tracks.length,
    artistCounts,
    genreCounts: {},
    librarySource: 'spotify',
    librarySyncedAt: syncedAt,
    librarySyncMode: 'public_profile_embed',
    libraryProfileUrl: CURATOR_PROFILE_URL,
    selectionProvider: 'Auscultrix',
  });

  return { tracks, artistCounts, syncedAt, source: 'spotify', syncMode: 'public_profile_embed' };
}
