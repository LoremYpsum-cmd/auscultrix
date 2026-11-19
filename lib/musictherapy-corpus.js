/**
 * Music therapy corpus — the extension's primary, literature-grounded repertoire.
 *
 * Every entry is a track documented in music therapy / music psychology research
 * or in widely used receptive music therapy repertoires:
 *  - relaxation-research: tracks studied for anxiety/arousal reduction
 *    (e.g. Mindlab/Weightless protocol; slow-tempo classical adagio literature).
 *  - clinical-repertoire: staples of receptive music therapy and GIM-adjacent
 *    programs (Bonny-era classical selections, Pärt, Satie, Einaudi).
 *  - feel-good-research: tracks ranked by mood-lift studies (e.g. Jolij's
 *    feel-good index) and activation/exercise-music research (Karageorghis).
 *  - iso-mirror: melancholic repertoire used for the ISO matching phase
 *    (meeting sadness before shifting), per Altshuler's principle.
 *
 * Only factual metadata is bundled (title, artist, year, mood coordinates):
 * no audio, no lyrics — legally distributable worldwide. Playback opens the
 * user's chosen streaming player, like every other track.
 *
 * Coordinates are (energy, valence) in the Russell plane, hand-annotated from
 * the source literature and MIR-checked where previews were available.
 */

import { italianTracks } from './italian-corpus.js';
import { undergroundTracks } from './underground-corpus.js';

export const CORPUS_SOURCE = 'musictherapy_corpus';

/** @type {Array<object>} */
export const MUSIC_THERAPY_CORPUS = [
  // ---------- De-arousal / anxiety reduction (low energy, mid-high valence) ----
  { id: 'mt-001', title: 'Weightless', artist: 'Marconi Union', year: 2011, energy: 0.12, valence: 0.55, basis: 'relaxation-research', tags: ['calm', 'anxiety', 'ambient'] },
  { id: 'mt-002', title: 'Gymnopédie No. 1', artist: 'Erik Satie', year: 1888, energy: 0.15, valence: 0.5, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },
  { id: 'mt-003', title: 'Clair de Lune', artist: 'Claude Debussy', year: 1905, energy: 0.2, valence: 0.58, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },
  { id: 'mt-004', title: 'Spiegel im Spiegel', artist: 'Arvo Pärt', year: 1978, energy: 0.1, valence: 0.52, basis: 'clinical-repertoire', tags: ['calm', 'minimal'] },
  { id: 'mt-005', title: 'Dream 3 (in the midst of my life)', artist: 'Max Richter', year: 2015, energy: 0.1, valence: 0.5, basis: 'relaxation-research', tags: ['calm', 'sleep', 'ambient'] },
  { id: 'mt-006', title: '1/1', artist: 'Brian Eno', year: 1978, energy: 0.1, valence: 0.55, basis: 'clinical-repertoire', tags: ['calm', 'ambient'] },
  { id: 'mt-007', title: 'Canon in D', artist: 'Johann Pachelbel', year: 1680, energy: 0.28, valence: 0.65, basis: 'relaxation-research', tags: ['calm', 'baroque'] },
  { id: 'mt-008', title: 'Air on the G String', artist: 'Johann Sebastian Bach', year: 1731, energy: 0.22, valence: 0.6, basis: 'relaxation-research', tags: ['calm', 'baroque'] },
  { id: 'mt-009', title: 'Piano Concerto No. 21 — Andante', artist: 'Wolfgang Amadeus Mozart', year: 1785, energy: 0.25, valence: 0.62, basis: 'clinical-repertoire', tags: ['calm', 'classical'] },
  { id: 'mt-010', title: 'Nocturne Op. 9 No. 2', artist: 'Frédéric Chopin', year: 1832, energy: 0.22, valence: 0.55, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },
  { id: 'mt-011', title: 'Watermark', artist: 'Enya', year: 1988, energy: 0.18, valence: 0.58, basis: 'relaxation-research', tags: ['calm', 'ambient'] },
  { id: 'mt-012', title: 'Only Time', artist: 'Enya', year: 2000, energy: 0.25, valence: 0.6, basis: 'relaxation-research', tags: ['calm'] },
  { id: 'mt-013', title: 'Ágætis byrjun', artist: 'Sigur Rós', year: 1999, energy: 0.28, valence: 0.55, basis: 'clinical-repertoire', tags: ['calm', 'post-rock'] },
  { id: 'mt-014', title: 'Una Mattina', artist: 'Ludovico Einaudi', year: 2004, energy: 0.22, valence: 0.55, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },
  { id: 'mt-015', title: 'Experience', artist: 'Ludovico Einaudi', year: 2013, energy: 0.42, valence: 0.6, basis: 'clinical-repertoire', tags: ['bridge', 'piano'] },
  { id: 'mt-016', title: 'The Blue Notebooks', artist: 'Max Richter', year: 2004, energy: 0.18, valence: 0.48, basis: 'clinical-repertoire', tags: ['calm', 'minimal'] },
  { id: 'mt-017', title: 'Méditation (Thaïs)', artist: 'Jules Massenet', year: 1894, energy: 0.2, valence: 0.58, basis: 'clinical-repertoire', tags: ['calm', 'classical'] },
  { id: 'mt-018', title: 'The Lark Ascending', artist: 'Ralph Vaughan Williams', year: 1920, energy: 0.24, valence: 0.62, basis: 'clinical-repertoire', tags: ['calm', 'classical'] },
  { id: 'mt-019', title: 'Gnossienne No. 1', artist: 'Erik Satie', year: 1890, energy: 0.18, valence: 0.42, basis: 'clinical-repertoire', tags: ['calm', 'piano', 'mirror'] },
  { id: 'mt-020', title: 'Horizon Variations', artist: 'Max Richter', year: 2004, energy: 0.16, valence: 0.5, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },

  // ---------- ISO mirror — meeting sadness (low energy, low valence) ----------
  { id: 'mt-021', title: 'Adagio for Strings', artist: 'Samuel Barber', year: 1938, energy: 0.18, valence: 0.2, basis: 'iso-mirror', tags: ['mirror', 'sadness', 'classical'] },
  { id: 'mt-022', title: 'Adagio in G minor', artist: 'Tomaso Albinoni', year: 1958, energy: 0.2, valence: 0.22, basis: 'iso-mirror', tags: ['mirror', 'sadness', 'classical'] },
  { id: 'mt-023', title: 'Moonlight Sonata — Adagio sostenuto', artist: 'Ludwig van Beethoven', year: 1801, energy: 0.2, valence: 0.3, basis: 'iso-mirror', tags: ['mirror', 'piano'] },
  { id: 'mt-024', title: "Dido's Lament", artist: 'Henry Purcell', year: 1689, energy: 0.18, valence: 0.22, basis: 'iso-mirror', tags: ['mirror', 'classical'] },
  { id: 'mt-025', title: 'Nuvole Bianche', artist: 'Ludovico Einaudi', year: 2004, energy: 0.3, valence: 0.38, basis: 'iso-mirror', tags: ['mirror', 'bridge', 'piano'] },
  { id: 'mt-026', title: 'Everybody Hurts', artist: 'R.E.M.', year: 1992, energy: 0.3, valence: 0.3, basis: 'iso-mirror', tags: ['mirror', 'consolation'] },
  { id: 'mt-027', title: 'Tears in Heaven', artist: 'Eric Clapton', year: 1992, energy: 0.28, valence: 0.32, basis: 'iso-mirror', tags: ['mirror', 'consolation'] },
  { id: 'mt-028', title: 'Hurt', artist: 'Johnny Cash', year: 2002, energy: 0.3, valence: 0.22, basis: 'iso-mirror', tags: ['mirror'] },
  { id: 'mt-029', title: 'Mad World', artist: 'Gary Jules', year: 2001, energy: 0.22, valence: 0.25, basis: 'iso-mirror', tags: ['mirror'] },
  { id: 'mt-030', title: 'The Sound of Silence', artist: 'Simon & Garfunkel', year: 1964, energy: 0.28, valence: 0.35, basis: 'iso-mirror', tags: ['mirror'] },
  { id: 'mt-031', title: 'Fix You', artist: 'Coldplay', year: 2005, energy: 0.45, valence: 0.45, basis: 'iso-mirror', tags: ['bridge', 'consolation'] },
  { id: 'mt-032', title: 'The Night We Met', artist: 'Lord Huron', year: 2015, energy: 0.3, valence: 0.32, basis: 'iso-mirror', tags: ['mirror', 'nostalgia'] },
  { id: 'mt-033', title: 'Vltava (The Moldau)', artist: 'Bedřich Smetana', year: 1874, energy: 0.45, valence: 0.55, basis: 'clinical-repertoire', tags: ['bridge', 'classical'] },
  { id: 'mt-034', title: 'Metamorphosis Two', artist: 'Philip Glass', year: 1988, energy: 0.28, valence: 0.4, basis: 'clinical-repertoire', tags: ['mirror', 'bridge', 'minimal'] },

  // ---------- Calm-positive target (low-mid energy, high valence) -------------
  { id: 'mt-035', title: 'What a Wonderful World', artist: 'Louis Armstrong', year: 1967, energy: 0.35, valence: 0.8, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-036', title: 'Somewhere Over the Rainbow', artist: 'Israel Kamakawiwoʻole', year: 1993, energy: 0.32, valence: 0.75, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-037', title: 'Come Away With Me', artist: 'Norah Jones', year: 2002, energy: 0.3, valence: 0.65, basis: 'clinical-repertoire', tags: ['target', 'warm'] },
  { id: 'mt-038', title: 'Better Together', artist: 'Jack Johnson', year: 2005, energy: 0.42, valence: 0.75, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-039', title: 'Here Comes the Sun', artist: 'The Beatles', year: 1969, energy: 0.5, valence: 0.85, basis: 'feel-good-research', tags: ['target', 'uplift'] },
  { id: 'mt-040', title: 'Stand by Me', artist: 'Ben E. King', year: 1961, energy: 0.45, valence: 0.7, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-041', title: 'La vie en rose', artist: 'Édith Piaf', year: 1947, energy: 0.35, valence: 0.72, basis: 'clinical-repertoire', tags: ['target', 'warm'] },
  { id: 'mt-042', title: 'Dream a Little Dream of Me', artist: 'Ella Fitzgerald & Louis Armstrong', year: 1950, energy: 0.35, valence: 0.72, basis: 'clinical-repertoire', tags: ['target', 'warm'] },
  { id: 'mt-043', title: 'Morning Mood (Peer Gynt)', artist: 'Edvard Grieg', year: 1875, energy: 0.35, valence: 0.72, basis: 'clinical-repertoire', tags: ['target', 'classical'] },
  { id: 'mt-044', title: 'The Four Seasons — Spring', artist: 'Antonio Vivaldi', year: 1725, energy: 0.55, valence: 0.8, basis: 'relaxation-research', tags: ['uplift', 'baroque'] },
  { id: 'mt-045', title: 'Banana Pancakes', artist: 'Jack Johnson', year: 2005, energy: 0.4, valence: 0.7, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-046', title: 'Put Your Records On', artist: 'Corinne Bailey Rae', year: 2006, energy: 0.48, valence: 0.75, basis: 'feel-good-research', tags: ['target', 'warm'] },
  { id: 'mt-047', title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', year: 1977, energy: 0.5, valence: 0.85, basis: 'feel-good-research', tags: ['target', 'uplift'] },
  { id: 'mt-048', title: 'Is This Love', artist: 'Bob Marley & The Wailers', year: 1978, energy: 0.48, valence: 0.75, basis: 'feel-good-research', tags: ['target', 'warm'] },

  // ---------- Activation / motivation (high energy, high valence) -------------
  { id: 'mt-049', title: 'Happy', artist: 'Pharrell Williams', year: 2013, energy: 0.8, valence: 0.9, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-050', title: "Don't Stop Me Now", artist: 'Queen', year: 1978, energy: 0.9, valence: 0.9, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-051', title: 'Good Vibrations', artist: 'The Beach Boys', year: 1966, energy: 0.7, valence: 0.85, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-052', title: 'Walking on Sunshine', artist: 'Katrina & The Waves', year: 1983, energy: 0.85, valence: 0.9, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-053', title: 'Dancing Queen', artist: 'ABBA', year: 1976, energy: 0.75, valence: 0.85, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-054', title: 'September', artist: 'Earth, Wind & Fire', year: 1978, energy: 0.85, valence: 0.9, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-055', title: 'Sir Duke', artist: 'Stevie Wonder', year: 1976, energy: 0.75, valence: 0.85, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-056', title: 'Signed, Sealed, Delivered (I\'m Yours)', artist: 'Stevie Wonder', year: 1970, energy: 0.75, valence: 0.85, basis: 'feel-good-research', tags: ['activation'] },
  { id: 'mt-057', title: 'Eye of the Tiger', artist: 'Survivor', year: 1982, energy: 0.88, valence: 0.7, basis: 'feel-good-research', tags: ['activation', 'motivation'] },
  { id: 'mt-058', title: 'Gonna Fly Now (Theme from Rocky)', artist: 'Bill Conti', year: 1976, energy: 0.85, valence: 0.75, basis: 'feel-good-research', tags: ['activation', 'motivation'] },
  { id: 'mt-059', title: 'Lovely Day', artist: 'Bill Withers', year: 1977, energy: 0.6, valence: 0.85, basis: 'feel-good-research', tags: ['uplift', 'warm'] },
  { id: 'mt-060', title: 'Ain\'t No Mountain High Enough', artist: 'Marvin Gaye & Tammi Terrell', year: 1967, energy: 0.75, valence: 0.85, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-061', title: 'I Got You (I Feel Good)', artist: 'James Brown', year: 1965, energy: 0.85, valence: 0.88, basis: 'feel-good-research', tags: ['activation'] },
  { id: 'mt-062', title: 'Mr. Blue Sky', artist: 'Electric Light Orchestra', year: 1977, energy: 0.75, valence: 0.9, basis: 'feel-good-research', tags: ['activation', 'uplift'] },
  { id: 'mt-063', title: 'William Tell Overture — Finale', artist: 'Gioachino Rossini', year: 1829, energy: 0.85, valence: 0.75, basis: 'clinical-repertoire', tags: ['activation', 'classical'] },
  { id: 'mt-064', title: 'Ode to Joy (Symphony No. 9)', artist: 'Ludwig van Beethoven', year: 1824, energy: 0.75, valence: 0.88, basis: 'clinical-repertoire', tags: ['activation', 'classical'] },
  { id: 'mt-065', title: 'Uptown Funk', artist: 'Mark Ronson feat. Bruno Mars', year: 2014, energy: 0.9, valence: 0.85, basis: 'feel-good-research', tags: ['activation'] },

  // ---------- High energy, tension mirror (anger/agitation matching) ----------
  { id: 'mt-066', title: 'O Fortuna (Carmina Burana)', artist: 'Carl Orff', year: 1937, energy: 0.85, valence: 0.3, basis: 'iso-mirror', tags: ['mirror', 'tension', 'classical'] },
  { id: 'mt-067', title: 'In the Hall of the Mountain King', artist: 'Edvard Grieg', year: 1875, energy: 0.8, valence: 0.4, basis: 'iso-mirror', tags: ['mirror', 'tension', 'classical'] },
  { id: 'mt-068', title: 'Seven Nation Army', artist: 'The White Stripes', year: 2003, energy: 0.75, valence: 0.45, basis: 'iso-mirror', tags: ['mirror', 'tension'] },
  { id: 'mt-069', title: 'Smells Like Teen Spirit', artist: 'Nirvana', year: 1991, energy: 0.9, valence: 0.35, basis: 'iso-mirror', tags: ['mirror', 'tension'] },
  { id: 'mt-070', title: 'Summer — Presto (The Four Seasons)', artist: 'Antonio Vivaldi', year: 1725, energy: 0.85, valence: 0.4, basis: 'iso-mirror', tags: ['mirror', 'tension', 'baroque'] },

  // ---------- Nostalgia / reflection (mid energy, mid valence) ----------------
  { id: 'mt-071', title: 'Landslide', artist: 'Fleetwood Mac', year: 1975, energy: 0.32, valence: 0.45, basis: 'clinical-repertoire', tags: ['nostalgia', 'reflection'] },
  { id: 'mt-072', title: 'Vincent (Starry, Starry Night)', artist: 'Don McLean', year: 1971, energy: 0.3, valence: 0.42, basis: 'clinical-repertoire', tags: ['nostalgia', 'reflection'] },
  { id: 'mt-073', title: 'Blackbird', artist: 'The Beatles', year: 1968, energy: 0.35, valence: 0.6, basis: 'clinical-repertoire', tags: ['reflection', 'bridge'] },
  { id: 'mt-074', title: 'Both Sides Now', artist: 'Joni Mitchell', year: 1969, energy: 0.3, valence: 0.48, basis: 'clinical-repertoire', tags: ['nostalgia', 'reflection'] },
  { id: 'mt-075', title: 'Hallelujah', artist: 'Jeff Buckley', year: 1994, energy: 0.3, valence: 0.4, basis: 'clinical-repertoire', tags: ['reflection', 'mirror'] },
  { id: 'mt-076', title: 'Wish You Were Here', artist: 'Pink Floyd', year: 1975, energy: 0.35, valence: 0.42, basis: 'clinical-repertoire', tags: ['nostalgia', 'mirror'] },
  { id: 'mt-077', title: 'River Flows in You', artist: 'Yiruma', year: 2001, energy: 0.3, valence: 0.58, basis: 'clinical-repertoire', tags: ['calm', 'piano'] },
  { id: 'mt-078', title: 'Comptine d\'un autre été', artist: 'Yann Tiersen', year: 2001, energy: 0.35, valence: 0.55, basis: 'clinical-repertoire', tags: ['reflection', 'piano'] },
  { id: 'mt-079', title: 'Bridge Over Troubled Water', artist: 'Simon & Garfunkel', year: 1970, energy: 0.4, valence: 0.55, basis: 'clinical-repertoire', tags: ['consolation', 'bridge'] },
  { id: 'mt-080', title: 'Lean on Me', artist: 'Bill Withers', year: 1972, energy: 0.45, valence: 0.68, basis: 'feel-good-research', tags: ['consolation', 'target'] },
];

/** Normalized track shape shared with the curator database. */
function corpusTrack(entry) {
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
    energySource: 'therapy_corpus',
    valenceSource: 'therapy_corpus',
    genre: null,
    genres: entry.tags || [],
    basis: entry.basis,
    source: CORPUS_SOURCE,
    youtubeVideoId: null,
  };
}

/** @returns {object[]} corpus in the shared track shape */
export function corpusTracks() {
  return MUSIC_THERAPY_CORPUS.map(corpusTrack);
}

/** Dedupe key: lowercase title+artist without punctuation. */
function titleArtistKey(track) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return `${norm(track.title)}::${norm(track.artist || (track.artists || [])[0])}`;
}

/**
 * Active pool = music therapy corpus (primary, guarantees coverage of the
 * Russell plane) + underground corpus (quality discovery repertoire) +
 * Italian corpus (breadth for «in my language» mode) + curator profile
 * tracks (complementary variety). Duplicates of corpus entries are dropped
 * so corpus coordinates win.
 * @param {object[]} curator
 * @returns {object[]}
 */
export function mergeWithCorpus(curator) {
  const pool = corpusTracks();
  const seen = new Set(pool.map(titleArtistKey));
  for (const track of [
    ...undergroundTracks(),
    ...italianTracks(),
    ...(curator || []),
  ]) {
    const key = titleArtistKey(track);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(track);
  }
  return pool;
}

/**
 * «Varia» pool — personal / familiar library only (no Bandcamp emergent).
 * Therapy + Italian corpora + curator Liked Songs (geo-enriched) seed.
 * @param {object[]} curator
 * @returns {object[]}
 */
export function mergeKnownLibrary(curator) {
  const pool = corpusTracks();
  const seen = new Set(pool.map(titleArtistKey));
  for (const track of [...italianTracks(), ...(curator || [])]) {
    const key = titleArtistKey(track);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(track);
  }
  return pool;
}
