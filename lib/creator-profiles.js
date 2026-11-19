/**
 * Creator public profile links (bottom of side panel: library + “follow me” socials).
 * Database is built from this Spotify user’s playlists (+ likes when curator token is present).
 */

export const CREATOR_PROFILES = {
  spotify: {
    id: 'spotify',
    labelKey: 'profileBtnSpotify',
    fallbackLabel: 'Spotify',
    url: 'https://open.spotify.com/user/31ygn4tyesquwap45l4xmrhoxb3y',
  },
  youtube: {
    id: 'youtube',
    labelKey: 'profileBtnYoutube',
    fallbackLabel: 'YouTube',
    url: 'https://www.youtube.com/@LoremYpsumVola',
  },
  instagram: {
    id: 'instagram',
    labelKey: 'profileBtnInstagram',
    fallbackLabel: 'Instagram',
    url: 'https://www.instagram.com/renault_shitnow/',
  },
  telegram: {
    id: 'telegram',
    labelKey: 'profileBtnTelegram',
    fallbackLabel: 'Telegram',
    url: 'https://t.me/auscultrix',
  },
};

/** Spotify user id for curator library sync (playlists by this account). */
export const CREATOR_SPOTIFY_USER_ID = '31ygn4tyesquwap45l4xmrhoxb3y';
