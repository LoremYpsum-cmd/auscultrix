/**
 * Curator public Spotify profile — the only source of the extension database.
 * https://open.spotify.com/user/31ygn4tyesquwap45l4xmrhoxb3y
 */

export const CURATOR_USER_ID = '31ygn4tyesquwap45l4xmrhoxb3y';
export const CURATOR_PROFILE_URL = `https://open.spotify.com/user/${CURATOR_USER_ID}`;

/**
 * Public playlists on the curator profile. The profile page is client-rendered,
 * so ids are pinned here and refreshed by scripts/build_library_seed.mjs.
 * @type {{ id: string, name: string }[]}
 */
export const CURATOR_PLAYLISTS = [
  { id: '3LKO8VIjEZDRDmZp2BNbxJ', name: 'Brani che mi piacciono' },
  { id: '6a5qEPe0V70uQZh149u1Uv', name: 'Frato' },
  { id: '72z5WBI1VWhx8zum4MYaxk', name: 'Dimarino' },
  { id: '0vkTDE3THixH7omlu5JyEz', name: "L'ora della parola" },
  { id: '55IEAmn0DKnDqkZPW1REat', name: 'Calcutta - SEL_62 The Sabaudian Tape Ep' },
  { id: '4x8SjZgbhhJlBpHMStLIDE', name: 'Calcutta - Forse...' },
  { id: '30nB5FIzY8yEccCWhqNVJO', name: 'Gusville Dischi - Tributo a Calcutta [2013]' },
  { id: '64hvxqgnMplgOLFFcMf870', name: 'c-ALL-cutta likes' },
  { id: '3jyndIABUUjC6SglMeCVZH', name: 'LiberaTEN' },
  { id: '05BE7ZFpYQ6QTtHZmNgMgl', name: 'Temporale ⛈️⚡️ likes' },
];
