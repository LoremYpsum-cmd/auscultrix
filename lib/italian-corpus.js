/**
 * Italian corpus — quality Italian-language repertoire for «Nella mia lingua».
 *
 * The curator profile is dominated by a handful of artists, so native mode
 * used to collapse onto them. This corpus guarantees breadth: cantautori
 * classics, Italian alternative/indie, Neapolitan scene, rap and modern pop,
 * annotated by hand (energy, valence) in the Russell plane and covering all
 * four quadrants. Every entry declares `language: 'it'` so the language
 * detector is exact, not heuristic.
 *
 * Factual metadata only — no audio is distributed.
 */

export const ITALIAN_SOURCE = 'italian_corpus';

/** @type {Array<object>} */
export const ITALIAN_CORPUS = [
  // ---------- Cantautori (reflection, warmth) ----------
  { id: 'it-001', title: "La canzone dell'amore perduto", artist: 'Fabrizio De André', year: 1966, energy: 0.2, valence: 0.35, tags: ['cantautore', 'mirror'] },
  { id: 'it-002', title: 'Bocca di rosa', artist: 'Fabrizio De André', year: 1967, energy: 0.5, valence: 0.65, tags: ['cantautore', 'warm'] },
  { id: 'it-003', title: 'Emozioni', artist: 'Lucio Battisti', year: 1970, energy: 0.3, valence: 0.5, tags: ['cantautore', 'reflection'] },
  { id: 'it-004', title: 'Il mio canto libero', artist: 'Lucio Battisti', year: 1972, energy: 0.45, valence: 0.7, tags: ['cantautore', 'uplift'] },
  { id: 'it-005', title: 'Caruso', artist: 'Lucio Dalla', year: 1986, energy: 0.35, valence: 0.4, tags: ['cantautore', 'mirror'] },
  { id: 'it-006', title: "Com'è profondo il mare", artist: 'Lucio Dalla', year: 1977, energy: 0.4, valence: 0.5, tags: ['cantautore', 'reflection'] },
  { id: 'it-007', title: 'Via con me', artist: 'Paolo Conte', year: 1981, energy: 0.55, valence: 0.7, tags: ['jazz', 'warm'] },
  { id: 'it-008', title: 'La cura', artist: 'Franco Battiato', year: 1996, energy: 0.3, valence: 0.6, tags: ['art-pop', 'care'] },
  { id: 'it-009', title: 'Centro di gravità permanente', artist: 'Franco Battiato', year: 1981, energy: 0.6, valence: 0.65, tags: ['art-pop', 'motion'] },
  { id: 'it-010', title: 'Se telefonando', artist: 'Mina', year: 1966, energy: 0.5, valence: 0.5, tags: ['classic', 'nostalgia'] },
  { id: 'it-011', title: 'Almeno tu nell’universo', artist: 'Mia Martini', year: 1989, energy: 0.4, valence: 0.5, tags: ['classic', 'intimate'] },
  { id: 'it-012', title: 'Napule è', artist: 'Pino Daniele', year: 1977, energy: 0.25, valence: 0.4, tags: ['napoli', 'mirror'] },
  { id: 'it-013', title: 'Quando', artist: 'Pino Daniele', year: 1991, energy: 0.3, valence: 0.5, tags: ['napoli', 'intimate'] },
  { id: 'it-014', title: 'Ma il cielo è sempre più blu', artist: 'Rino Gaetano', year: 1975, energy: 0.65, valence: 0.7, tags: ['cantautore', 'uplift'] },
  { id: 'it-015', title: 'Nel blu dipinto di blu', artist: 'Domenico Modugno', year: 1958, energy: 0.55, valence: 0.8, tags: ['classic', 'joy'] },
  { id: 'it-016', title: 'Il cielo in una stanza', artist: 'Gino Paoli', year: 1960, energy: 0.25, valence: 0.6, tags: ['classic', 'calm'] },
  { id: 'it-017', title: 'Mi sono innamorato di te', artist: 'Luigi Tenco', year: 1962, energy: 0.2, valence: 0.4, tags: ['cantautore', 'mirror'] },
  { id: 'it-018', title: 'Io che amo solo te', artist: 'Sergio Endrigo', year: 1962, energy: 0.25, valence: 0.55, tags: ['classic', 'warm'] },
  { id: 'it-019', title: 'La donna cannone', artist: 'Francesco De Gregori', year: 1983, energy: 0.35, valence: 0.45, tags: ['cantautore', 'nostalgia'] },
  { id: 'it-020', title: 'Sally', artist: 'Vasco Rossi', year: 1996, energy: 0.4, valence: 0.35, tags: ['rock', 'mirror'] },

  // ---------- Alternative / indie ----------
  { id: 'it-021', title: 'Non è per sempre', artist: 'Afterhours', year: 1999, energy: 0.55, valence: 0.4, tags: ['alt-rock', 'tension'] },
  { id: 'it-022', title: 'Valvonauta', artist: 'Verdena', year: 1999, energy: 0.7, valence: 0.5, tags: ['alt-rock', 'activation'] },
  { id: 'it-023', title: 'Charlie fa surf', artist: 'Baustelle', year: 2008, energy: 0.6, valence: 0.55, tags: ['indie', 'motion'] },
  { id: 'it-024', title: 'Io sto bene', artist: 'CCCP – Fedeli alla linea', year: 1986, energy: 0.65, valence: 0.45, tags: ['punk', 'tension'] },
  { id: 'it-025', title: 'Cupe vampe', artist: 'C.S.I.', year: 1996, energy: 0.55, valence: 0.3, tags: ['alt-rock', 'mirror'] },
  { id: 'it-026', title: 'Il primo dio', artist: 'Massimo Volume', year: 1995, energy: 0.45, valence: 0.3, tags: ['spoken', 'mirror'] },
  { id: 'it-027', title: 'Altre forme di vita', artist: 'Bluvertigo', year: 1999, energy: 0.55, valence: 0.5, tags: ['alt-pop'] },
  { id: 'it-028', title: 'Nuotando nell’aria', artist: 'Marlene Kuntz', year: 1994, energy: 0.5, valence: 0.4, tags: ['alt-rock', 'dream'] },
  { id: 'it-029', title: 'Siberia', artist: 'Diaframma', year: 1984, energy: 0.5, valence: 0.35, tags: ['new-wave', 'mirror'] },
  { id: 'it-030', title: 'Stormi', artist: 'Iosonouncane', year: 2015, energy: 0.5, valence: 0.4, tags: ['experimental', 'rise'] },
  { id: 'it-031', title: 'Musica leggerissima', artist: 'Colapesce, Dimartino', year: 2021, energy: 0.6, valence: 0.7, tags: ['indie-pop', 'uplift'] },
  { id: 'it-032', title: 'Amare', artist: 'La Rappresentante di Lista', year: 2021, energy: 0.5, valence: 0.55, tags: ['art-pop'] },
  { id: 'it-033', title: 'L’ultima festa', artist: 'Cosmo', year: 2016, energy: 0.7, valence: 0.7, tags: ['electro-pop', 'activation'] },
  { id: 'it-034', title: 'Niente di strano', artist: 'Giorgio Poi', year: 2017, energy: 0.45, valence: 0.55, tags: ['indie-pop', 'warm'] },
  { id: 'it-035', title: 'Del tempo che passa la felicità', artist: 'Motta', year: 2016, energy: 0.55, valence: 0.5, tags: ['indie', 'reflection'] },
  { id: 'it-036', title: 'La verità', artist: 'Brunori Sas', year: 2017, energy: 0.45, valence: 0.6, tags: ['cantautore', 'warm'] },
  { id: 'it-037', title: 'Cara catastrofe', artist: 'Le luci della centrale elettrica', year: 2014, energy: 0.5, valence: 0.4, tags: ['indie', 'mirror'] },
  { id: 'it-038', title: 'Amore disperato', artist: 'Nada', year: 1983, energy: 0.6, valence: 0.5, tags: ['pop', 'nostalgia'] },
  { id: 'it-039', title: 'Illa', artist: 'Daniela Pes', year: 2023, energy: 0.4, valence: 0.45, tags: ['experimental', 'dream'] },

  // ---------- Napoli scene / groove ----------
  { id: 'it-040', title: 'Nove maggio', artist: 'Liberato', year: 2017, energy: 0.55, valence: 0.45, tags: ['napoli', 'night'] },
  { id: 'it-041', title: 'Marechià', artist: 'Nu Genea', year: 2022, energy: 0.6, valence: 0.7, tags: ['napoli', 'groove'] },

  // ---------- Rap / modern pop ----------
  { id: 'it-042', title: 'Fuori dal tunnel', artist: 'Caparezza', year: 2003, energy: 0.75, valence: 0.6, tags: ['rap', 'activation'] },
  { id: 'it-043', title: 'Crudelia (I nervi)', artist: 'Marracash', year: 2019, energy: 0.55, valence: 0.35, tags: ['rap', 'mirror'] },
  { id: 'it-044', title: 'Quelli che benpensano', artist: 'Frankie hi-nrg mc', year: 1997, energy: 0.6, valence: 0.45, tags: ['rap', 'tension'] },
  { id: 'it-045', title: 'Soldi', artist: 'Mahmood', year: 2019, energy: 0.65, valence: 0.5, tags: ['pop', 'motion'] },
  { id: 'it-046', title: 'Voce', artist: 'Madame', year: 2020, energy: 0.45, valence: 0.4, tags: ['pop', 'intimate'] },
  { id: 'it-047', title: 'Frigobar', artist: 'Franco126', year: 2019, energy: 0.5, valence: 0.55, tags: ['indie-pop', 'warm'] },
];

/** Normalized track shape shared with the other corpora. */
export function italianTracks() {
  return ITALIAN_CORPUS.map((entry) => ({
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
    energySource: 'italian_corpus',
    valenceSource: 'italian_corpus',
    genre: (entry.tags || [])[0] || null,
    genres: entry.tags || [],
    language: 'it',
    geoCountry: 'it',
    source: ITALIAN_SOURCE,
    youtubeVideoId: null,
  }));
}
