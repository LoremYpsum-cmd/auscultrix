/**
 * Small family-safe seed corpus for age-appropriate playlists.
 * Metadata only — playback opens the user's YouTube search / player.
 * Used when «Come stai?» indicates a child age.
 */

export const KIDS_CORPUS_SOURCE = 'kids_corpus';

/** @type {Array<object>} */
const KIDS_ENTRIES = [
  // ---- 0–3 lullabies / soft ----
  { id: 'kd-001', title: 'Brahms Lullaby (Wiegenlied)', artist: 'Johannes Brahms', year: 1868, energy: 0.12, valence: 0.62, tags: ['lullaby', 'classical', 'sleep'], bands: ['0-3', '4-7'] },
  { id: 'kd-002', title: 'Twinkle Twinkle Little Star', artist: 'Traditional', year: 1806, energy: 0.2, valence: 0.75, tags: ['nursery', 'lullaby', 'kids'], bands: ['0-3', '4-7'] },
  { id: 'kd-003', title: 'Ninna nanna', artist: 'Tradizionale italiana', year: 1800, energy: 0.15, valence: 0.65, tags: ['lullaby', 'ninna', 'bambini'], bands: ['0-3', '4-7'] },
  { id: 'kd-004', title: 'Frère Jacques', artist: 'Traditional', year: 1780, energy: 0.28, valence: 0.72, tags: ['nursery', 'kids'], bands: ['0-3', '4-7'] },
  { id: 'kd-005', title: 'Rock-a-bye Baby', artist: 'Traditional', year: 1765, energy: 0.15, valence: 0.6, tags: ['lullaby', 'nursery'], bands: ['0-3'] },
  { id: 'kd-006', title: 'Hush Little Baby', artist: 'Traditional', year: 1900, energy: 0.18, valence: 0.65, tags: ['lullaby', 'nursery'], bands: ['0-3', '4-7'] },
  { id: 'kd-007', title: 'All the Pretty Little Horses', artist: 'Traditional', year: 1900, energy: 0.16, valence: 0.6, tags: ['lullaby'], bands: ['0-3'] },
  { id: 'kd-008', title: 'Berceuse Op. 57', artist: 'Frédéric Chopin', year: 1844, energy: 0.18, valence: 0.58, tags: ['lullaby', 'piano', 'classical'], bands: ['0-3', '4-7', '8-12'] },
  { id: 'kd-009', title: 'Gymnopédie No. 1', artist: 'Erik Satie', year: 1888, energy: 0.15, valence: 0.55, tags: ['piano', 'calm', 'classical'], bands: ['0-3', '4-7', '8-12'] },
  { id: 'kd-010', title: 'Clair de Lune', artist: 'Claude Debussy', year: 1905, energy: 0.2, valence: 0.6, tags: ['piano', 'classical', 'calm'], bands: ['0-3', '4-7', '8-12'] },

  // ---- 4–7 nursery / playful ----
  { id: 'kd-011', title: 'The Wheels on the Bus', artist: 'Traditional', year: 1939, energy: 0.45, valence: 0.85, tags: ['nursery', 'kids'], bands: ['4-7'] },
  { id: 'kd-012', title: 'Old MacDonald Had a Farm', artist: 'Traditional', year: 1917, energy: 0.48, valence: 0.88, tags: ['nursery', 'kids'], bands: ['4-7'] },
  { id: 'kd-013', title: 'If You\'re Happy and You Know It', artist: 'Traditional', year: 1950, energy: 0.55, valence: 0.9, tags: ['nursery', 'kids'], bands: ['4-7'] },
  { id: 'kd-014', title: 'Head Shoulders Knees and Toes', artist: 'Traditional', year: 1960, energy: 0.55, valence: 0.88, tags: ['nursery', 'kids'], bands: ['4-7'] },
  { id: 'kd-015', title: 'Row Row Row Your Boat', artist: 'Traditional', year: 1852, energy: 0.35, valence: 0.8, tags: ['nursery', 'kids'], bands: ['0-3', '4-7'] },
  { id: 'kd-016', title: 'ABC Song', artist: 'Traditional', year: 1835, energy: 0.32, valence: 0.8, tags: ['nursery', 'kids', 'alphabet'], bands: ['4-7'] },
  { id: 'kd-017', title: 'Stella stellina', artist: 'Tradizionale italiana', year: 1900, energy: 0.22, valence: 0.7, tags: ['ninna', 'bambini', 'lullaby'], bands: ['0-3', '4-7'] },
  { id: 'kd-018', title: 'Giro giro tondo', artist: 'Tradizionale italiana', year: 1900, energy: 0.4, valence: 0.85, tags: ['filastrocca', 'bambini'], bands: ['4-7'] },
  { id: 'kd-019', title: 'La coccinella', artist: 'Tradizionale italiana', year: 1950, energy: 0.42, valence: 0.85, tags: ['bambini', 'kids'], bands: ['4-7'] },
  { id: 'kd-020', title: 'You Are My Sunshine', artist: 'Jimmie Davis', year: 1939, energy: 0.38, valence: 0.8, tags: ['family', 'warm', 'kids'], bands: ['4-7', '8-12'] },

  // ---- 8–12 family-safe ----
  { id: 'kd-021', title: 'What a Wonderful World', artist: 'Louis Armstrong', year: 1967, energy: 0.35, valence: 0.82, tags: ['family', 'warm'], bands: ['4-7', '8-12', '13-17'] },
  { id: 'kd-022', title: 'Somewhere Over the Rainbow', artist: 'Israel Kamakawiwoʻole', year: 1993, energy: 0.32, valence: 0.78, tags: ['family', 'warm'], bands: ['4-7', '8-12', '13-17'] },
  { id: 'kd-023', title: 'Here Comes the Sun', artist: 'The Beatles', year: 1969, energy: 0.5, valence: 0.85, tags: ['family', 'uplift'], bands: ['8-12', '13-17'] },
  { id: 'kd-024', title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', year: 1977, energy: 0.5, valence: 0.85, tags: ['family', 'uplift'], bands: ['8-12', '13-17'] },
  { id: 'kd-025', title: 'Banana Pancakes', artist: 'Jack Johnson', year: 2005, energy: 0.4, valence: 0.75, tags: ['family', 'acoustic'], bands: ['4-7', '8-12'] },
  { id: 'kd-026', title: 'Octopus\'s Garden', artist: 'The Beatles', year: 1969, energy: 0.48, valence: 0.82, tags: ['family', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-027', title: 'Yellow Submarine', artist: 'The Beatles', year: 1966, energy: 0.52, valence: 0.85, tags: ['family', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-028', title: "You've Got a Friend in Me", artist: 'Randy Newman', year: 1995, energy: 0.45, valence: 0.85, tags: ['disney', 'family', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-029', title: 'Do You Want to Build a Snowman?', artist: 'Kristen Bell', year: 2013, energy: 0.4, valence: 0.7, tags: ['disney', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-030', title: 'Let It Go', artist: 'Idina Menzel', year: 2013, energy: 0.55, valence: 0.75, tags: ['disney', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-031', title: 'How Far I\'ll Go', artist: 'Auliʻi Cravalho', year: 2016, energy: 0.5, valence: 0.78, tags: ['disney', 'kids'], bands: ['8-12', '13-17'] },
  { id: 'kd-032', title: 'Bare Necessities', artist: 'Phil Harris', year: 1967, energy: 0.5, valence: 0.85, tags: ['disney', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-033', title: 'Canon in D', artist: 'Johann Pachelbel', year: 1680, energy: 0.28, valence: 0.68, tags: ['classical', 'calm'], bands: ['0-3', '4-7', '8-12'] },
  { id: 'kd-034', title: 'Morning Mood (Peer Gynt)', artist: 'Edvard Grieg', year: 1875, energy: 0.35, valence: 0.75, tags: ['classical', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-035', title: 'The Carnival of the Animals — Aquarium', artist: 'Camille Saint-Saëns', year: 1886, energy: 0.3, valence: 0.7, tags: ['classical', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-036', title: 'Peter and the Wolf (theme)', artist: 'Sergei Prokofiev', year: 1936, energy: 0.45, valence: 0.7, tags: ['classical', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-037', title: 'Pure Imagination', artist: 'Gene Wilder', year: 1971, energy: 0.35, valence: 0.75, tags: ['family', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-038', title: 'A Whole New World', artist: 'Peabo Bryson & Regina Belle', year: 1992, energy: 0.48, valence: 0.85, tags: ['disney', 'kids'], bands: ['4-7', '8-12'] },
  { id: 'kd-039', title: 'Zip-A-Dee-Doo-Dah', artist: 'James Baskett', year: 1946, energy: 0.5, valence: 0.9, tags: ['disney', 'kids'], bands: ['4-7'] },
  { id: 'kd-040', title: 'Count on Me', artist: 'Bruno Mars', year: 2010, energy: 0.45, valence: 0.82, tags: ['family', 'pop'], bands: ['8-12', '13-17'] },
];

function asTrack(entry) {
  return {
    id: entry.id,
    title: entry.title,
    artist: entry.artist,
    artists: [entry.artist],
    album: null,
    year: entry.year,
    durationMs: null,
    popularity: null,
    energy: entry.energy,
    valence: entry.valence,
    energySource: 'kids_corpus',
    valenceSource: 'kids_corpus',
    genre: (entry.tags || [])[0] || 'kids',
    genres: entry.tags || [],
    tags: entry.tags || [],
    source: KIDS_CORPUS_SOURCE,
    kidsBands: entry.bands || [],
    youtubeVideoId: null,
  };
}

/**
 * @param {string} [ageBand]
 * @returns {object[]}
 */
export function kidsCorpusTracks(ageBand = '4-7') {
  const band = String(ageBand || '4-7');
  return KIDS_ENTRIES.filter((e) => (e.bands || []).includes(band)).map(asTrack);
}

/**
 * Merge kids seed into a pool (kids entries first; dedupe by id).
 * @param {object[]} pool
 * @param {string} [ageBand]
 */
export function mergeKidsCorpus(pool, ageBand) {
  const kids = kidsCorpusTracks(ageBand);
  if (!kids.length) return pool || [];
  const seen = new Set(kids.map((t) => t.id));
  const rest = (pool || []).filter((t) => t?.id && !seen.has(t.id));
  return [...kids, ...rest];
}
