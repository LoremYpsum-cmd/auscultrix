/**
 * Underground corpus — quality independent music for discovery.
 *
 * Hand-picked repertoire from independent, underground and cult scenes:
 * ambient/drone, slowcore, dream pop, shoegaze, outsider folk, spiritual
 * jazz, leftfield electronica, krautrock, post-rock. Chosen for craft and
 * emotional clarity, not chart presence — the tracks the algorithm-driven
 * platforms rarely surface.
 *
 * Same rules as the therapy corpus: factual metadata only (no audio),
 * hand-annotated (energy, valence) coordinates in the Russell plane.
 * Discovery logic (playlist.js) gives these tracks a gentle freshness
 * bonus so sessions keep bringing new music instead of the same loop.
 */

export const UNDERGROUND_SOURCE = 'underground_corpus';

/** @type {Array<object>} */
export const UNDERGROUND_CORPUS = [
  // ---------- Ambient / drone / minimal (deep calm) ----------
  { id: 'ug-001', title: "Heavy Water/I'd Rather Be Sleeping", artist: 'Grouper', year: 2008, energy: 0.15, valence: 0.42, tags: ['ambient', 'dream'] },
  { id: 'ug-002', title: 'Requiem for Dying Mothers, Part 1', artist: 'Stars of the Lid', year: 2001, energy: 0.08, valence: 0.4, tags: ['drone', 'calm'] },
  { id: 'ug-003', title: 'Black Refraction', artist: 'Tim Hecker', year: 2013, energy: 0.14, valence: 0.4, tags: ['ambient'] },
  { id: 'ug-004', title: 'dlp 1.1', artist: 'William Basinski', year: 2002, energy: 0.06, valence: 0.35, tags: ['drone', 'mirror'] },
  { id: 'ug-005', title: 'Blink', artist: 'Hiroshi Yoshimura', year: 1986, energy: 0.12, valence: 0.6, tags: ['ambient', 'kankyō'] },
  { id: 'ug-006', title: "Mr. Henri Rousseau's Dream", artist: 'Midori Takada', year: 1983, energy: 0.2, valence: 0.55, tags: ['ambient', 'percussion'] },
  { id: 'ug-007', title: 'Evensong', artist: 'Sarah Davachi', year: 2018, energy: 0.08, valence: 0.42, tags: ['drone', 'organ'] },
  { id: 'ug-008', title: 'Living Torch I', artist: 'Kali Malone', year: 2022, energy: 0.1, valence: 0.35, tags: ['drone'] },
  { id: 'ug-009', title: 'Fantas', artist: 'Caterina Barbieri', year: 2019, energy: 0.4, valence: 0.5, tags: ['synth', 'minimal'] },
  { id: 'ug-010', title: 'Uoon I', artist: 'Alva Noto & Ryuichi Sakamoto', year: 2002, energy: 0.12, valence: 0.45, tags: ['minimal', 'piano'] },
  { id: 'ug-011', title: 'The Homeless Wanderer', artist: 'Emahoy Tsegué-Maryam Guèbrou', year: 1963, energy: 0.22, valence: 0.5, tags: ['piano', 'reflection'] },
  { id: 'ug-012', title: 'Summer Water', artist: 'Colleen', year: 2005, energy: 0.2, valence: 0.55, tags: ['ambient', 'acoustic'] },
  { id: 'ug-013', title: 'Envelop', artist: 'Julianna Barwick', year: 2011, energy: 0.18, valence: 0.55, tags: ['voice', 'ambient'] },
  { id: 'ug-014', title: '#3 (Rhubarb)', artist: 'Aphex Twin', year: 1994, energy: 0.1, valence: 0.5, tags: ['ambient'] },
  { id: 'ug-015', title: 'Glass', artist: 'Hania Rani', year: 2019, energy: 0.35, valence: 0.55, tags: ['piano', 'minimal'] },
  { id: 'ug-016', title: 'A Glacier', artist: 'Peter Broderick', year: 2008, energy: 0.18, valence: 0.45, tags: ['piano', 'calm'] },
  { id: 'ug-017', title: 'Threnody', artist: 'Goldmund', year: 2005, energy: 0.12, valence: 0.4, tags: ['piano', 'mirror'] },

  // ---------- Slowcore / sadcore / outsider folk (ISO mirror) ----------
  { id: 'ug-018', title: 'Inside Out', artist: 'Duster', year: 1998, energy: 0.25, valence: 0.35, tags: ['slowcore', 'mirror'] },
  { id: 'ug-019', title: 'Lullaby', artist: 'Low', year: 1994, energy: 0.15, valence: 0.3, tags: ['slowcore', 'mirror'] },
  { id: 'ug-020', title: 'D', artist: 'Codeine', year: 1990, energy: 0.2, valence: 0.28, tags: ['slowcore', 'mirror'] },
  { id: 'ug-021', title: 'Katy Song', artist: 'Red House Painters', year: 1993, energy: 0.25, valence: 0.28, tags: ['sadcore', 'mirror'] },
  { id: 'ug-022', title: 'Farewell Transmission', artist: 'Songs: Ohia', year: 2003, energy: 0.38, valence: 0.35, tags: ['alt-country', 'mirror'] },
  { id: 'ug-023', title: 'Through the Trees Pt. 2', artist: 'Mount Eerie', year: 2017, energy: 0.18, valence: 0.28, tags: ['folk', 'mirror'] },
  { id: 'ug-024', title: 'Riding for the Feeling', artist: 'Bill Callahan', year: 2011, energy: 0.28, valence: 0.45, tags: ['folk', 'reflection'] },
  { id: 'ug-025', title: 'Tonight', artist: 'Sibylle Baier', year: 2006, energy: 0.15, valence: 0.35, tags: ['folk', 'mirror'] },
  { id: 'ug-026', title: 'Something on Your Mind', artist: 'Karen Dalton', year: 1971, energy: 0.28, valence: 0.38, tags: ['folk', 'nostalgia'] },
  { id: 'ug-027', title: 'Back, Baby', artist: 'Jessica Pratt', year: 2015, energy: 0.22, valence: 0.45, tags: ['folk', 'dream'] },
  { id: 'ug-028', title: 'Bloodhail', artist: 'Have a Nice Life', year: 2008, energy: 0.55, valence: 0.25, tags: ['post-punk', 'tension'] },
  { id: 'ug-029', title: 'Fade Into You', artist: 'Mazzy Star', year: 1993, energy: 0.3, valence: 0.45, tags: ['dream', 'nostalgia'] },
  { id: 'ug-030', title: 'Tugboat', artist: 'Galaxie 500', year: 1988, energy: 0.42, valence: 0.5, tags: ['dream', 'indie'] },
  { id: 'ug-031', title: 'Tears in the Typing Pool', artist: 'Broadcast', year: 2005, energy: 0.25, valence: 0.4, tags: ['psych', 'mirror'] },
  { id: 'ug-032', title: 'A Little Lost', artist: 'Arthur Russell', year: 1994, energy: 0.35, valence: 0.6, tags: ['songwriter', 'warm'] },

  // ---------- Dream pop / shoegaze (soft lift) ----------
  { id: 'ug-033', title: 'Cherry-Coloured Funk', artist: 'Cocteau Twins', year: 1990, energy: 0.45, valence: 0.55, tags: ['dream', 'shoegaze'] },
  { id: 'ug-034', title: 'Alison', artist: 'Slowdive', year: 1993, energy: 0.5, valence: 0.55, tags: ['shoegaze'] },
  { id: 'ug-035', title: 'Space Song', artist: 'Beach House', year: 2015, energy: 0.45, valence: 0.55, tags: ['dream'] },
  { id: 'ug-036', title: 'Show Me How', artist: 'Men I Trust', year: 2018, energy: 0.4, valence: 0.55, tags: ['dream', 'indie'] },
  { id: 'ug-037', title: 'Locket', artist: 'Crumb', year: 2017, energy: 0.45, valence: 0.55, tags: ['psych', 'indie'] },
  { id: 'ug-038', title: 'Dreams Tonite', artist: 'Alvvays', year: 2017, energy: 0.45, valence: 0.55, tags: ['dream', 'indie'] },
  { id: 'ug-039', title: 'Nurse!', artist: 'bar italia', year: 2023, energy: 0.55, valence: 0.5, tags: ['indie', 'post-punk'] },

  // ---------- Songwriter / folk (warm target) ----------
  { id: 'ug-040', title: 'Northern Sky', artist: 'Nick Drake', year: 1971, energy: 0.32, valence: 0.68, tags: ['folk', 'warm'] },
  { id: 'ug-041', title: "Just Another Diamond Day", artist: 'Vashti Bunyan', year: 1970, energy: 0.25, valence: 0.65, tags: ['folk', 'warm'] },
  { id: 'ug-042', title: 'anything', artist: 'Adrianne Lenker', year: 2020, energy: 0.28, valence: 0.5, tags: ['folk', 'intimate'] },
  { id: 'ug-043', title: 'Paul', artist: 'Big Thief', year: 2016, energy: 0.35, valence: 0.45, tags: ['indie', 'folk'] },
  { id: 'ug-044', title: 'The Barrel', artist: 'Aldous Harding', year: 2019, energy: 0.42, valence: 0.55, tags: ['folk', 'art-pop'] },
  { id: 'ug-045', title: 'Home to You', artist: 'Cate Le Bon', year: 2019, energy: 0.38, valence: 0.5, tags: ['art-pop'] },
  { id: 'ug-046', title: 'Andromeda', artist: 'Weyes Blood', year: 2019, energy: 0.4, valence: 0.55, tags: ['baroque-pop', 'warm'] },

  // ---------- Spiritual / modern jazz (reflection & rise) ----------
  { id: 'ug-047', title: 'Journey in Satchidananda', artist: 'Alice Coltrane', year: 1971, energy: 0.38, valence: 0.52, tags: ['spiritual-jazz'] },
  { id: 'ug-048', title: 'Astral Traveling', artist: 'Pharoah Sanders', year: 1971, energy: 0.3, valence: 0.6, tags: ['spiritual-jazz', 'warm'] },
  { id: 'ug-049', title: 'Love Theme from Spartacus', artist: 'Yusef Lateef', year: 1961, energy: 0.25, valence: 0.55, tags: ['jazz', 'calm'] },
  { id: 'ug-050', title: 'Midnight Black Earth', artist: 'Bohren & der Club of Gore', year: 2000, energy: 0.12, valence: 0.3, tags: ['dark-jazz', 'mirror'] },
  { id: 'ug-051', title: 'Hopopono', artist: 'GoGo Penguin', year: 2014, energy: 0.5, valence: 0.6, tags: ['jazz', 'minimal'] },
  { id: 'ug-052', title: 'Ruins', artist: 'Portico Quartet', year: 2012, energy: 0.45, valence: 0.55, tags: ['jazz', 'ambient'] },
  { id: 'ug-053', title: 'I Feel You', artist: 'Melanie De Biasio', year: 2013, energy: 0.25, valence: 0.4, tags: ['jazz', 'intimate'] },
  { id: 'ug-054', title: 'Mohabbat', artist: 'Arooj Aftab', year: 2021, energy: 0.25, valence: 0.5, tags: ['neo-sufi', 'calm'] },
  { id: 'ug-055', title: 'Hacia el vacío', artist: 'Mabe Fratti', year: 2021, energy: 0.32, valence: 0.45, tags: ['cello', 'experimental'] },
  { id: 'ug-056', title: 'Through the Night', artist: 'Duval Timothy', year: 2020, energy: 0.3, valence: 0.55, tags: ['piano', 'minimal'] },

  // ---------- Leftfield electronica (focus & activation) ----------
  { id: 'ug-057', title: 'Roygbiv', artist: 'Boards of Canada', year: 1998, energy: 0.5, valence: 0.6, tags: ['idm', 'warm'] },
  { id: 'ug-058', title: 'Archangel', artist: 'Burial', year: 2007, energy: 0.55, valence: 0.4, tags: ['garage', 'night'] },
  { id: 'ug-059', title: 'Angel Echoes', artist: 'Four Tet', year: 2010, energy: 0.5, valence: 0.6, tags: ['electronica', 'warm'] },
  { id: 'ug-060', title: 'Immunity', artist: 'Jon Hopkins', year: 2013, energy: 0.35, valence: 0.5, tags: ['electronica', 'piano'] },
  { id: 'ug-061', title: 'Recovery', artist: 'Rival Consoles', year: 2018, energy: 0.55, valence: 0.55, tags: ['electronica'] },
  { id: 'ug-062', title: 'On', artist: 'Kelly Lee Owens', year: 2020, energy: 0.6, valence: 0.6, tags: ['techno-pop'] },
  { id: 'ug-063', title: "Can't Do Without You", artist: 'Caribou', year: 2014, energy: 0.7, valence: 0.75, tags: ['electronica', 'uplift'] },
  { id: 'ug-064', title: 'Blurred', artist: 'Kiasmos', year: 2017, energy: 0.65, valence: 0.6, tags: ['minimal-techno'] },
  { id: 'ug-065', title: 'Silhouettes (I, II & III)', artist: 'Floating Points', year: 2015, energy: 0.6, valence: 0.6, tags: ['electronica', 'jazz'] },
  { id: 'ug-066', title: 'Feather', artist: 'Nujabes', year: 2005, energy: 0.55, valence: 0.7, tags: ['jazz-hop', 'warm'] },
  { id: 'ug-067', title: 'Time: The Donut of the Heart', artist: 'J Dilla', year: 2006, energy: 0.5, valence: 0.65, tags: ['instrumental-hiphop'] },
  { id: 'ug-068', title: "Slim's Return", artist: 'Madlib', year: 2003, energy: 0.55, valence: 0.65, tags: ['jazz-hop'] },

  // ---------- Groove, kraut, desert & post-rock (motion & rise) ----------
  { id: 'ug-069', title: 'August 10', artist: 'Khruangbin', year: 2018, energy: 0.5, valence: 0.65, tags: ['groove', 'warm'] },
  { id: 'ug-070', title: 'Afrique Victime', artist: 'Mdou Moctar', year: 2021, energy: 0.78, valence: 0.6, tags: ['desert-blues', 'activation'] },
  { id: 'ug-071', title: 'Debe', artist: 'Ali Farka Touré & Toumani Diabaté', year: 2005, energy: 0.4, valence: 0.65, tags: ['mali', 'warm'] },
  { id: 'ug-072', title: 'Vitamin C', artist: 'Can', year: 1972, energy: 0.7, valence: 0.6, tags: ['krautrock', 'groove'] },
  { id: 'ug-073', title: 'Hallogallo', artist: 'Neu!', year: 1972, energy: 0.65, valence: 0.65, tags: ['krautrock', 'motion'] },
  { id: 'ug-074', title: 'Deluxe (Immer Wieder)', artist: 'Harmonia', year: 1975, energy: 0.55, valence: 0.6, tags: ['kosmische'] },
  { id: 'ug-075', title: 'Your Hand in Mine', artist: 'Explosions in the Sky', year: 2003, energy: 0.5, valence: 0.6, tags: ['post-rock', 'rise'] },
  { id: 'ug-076', title: 'Take Me Somewhere Nice', artist: 'Mogwai', year: 2001, energy: 0.35, valence: 0.4, tags: ['post-rock', 'mirror'] },
  { id: 'ug-077', title: 'They Move on Tracks of Never-Ending Light', artist: 'This Will Destroy You', year: 2008, energy: 0.5, valence: 0.55, tags: ['post-rock', 'rise'] },
];

/** Normalized track shape shared with the other corpora. */
export function undergroundTracks() {
  return UNDERGROUND_CORPUS.map((entry) => ({
    id: entry.id,
    title: entry.title,
    artist: entry.artist,
    artists: [entry.artist],
    album: null,
    year: entry.year,
    durationMs: null,
    popularity: null, // deliberately unknown: these live outside the charts
    energy: entry.energy,
    valence: entry.valence,
    energySource: 'underground_corpus',
    valenceSource: 'underground_corpus',
    genre: (entry.tags || [])[0] || null,
    genres: entry.tags || [],
    source: UNDERGROUND_SOURCE,
    youtubeVideoId: null,
    onBandcamp: true,
  }));
}
