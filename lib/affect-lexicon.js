/**
 * Auscultrix affect lexicon — IT / EN.
 *
 * Every entry is placed in Russell's circumplex (1980): valence v and arousal a,
 * both on [0, 1] with 0.5 = neutral. Coordinates were set BY HAND by the
 * author, using the published ranges of the NRC VAD Lexicon (Mohammad, 2018)
 * and of the Italian ANEW adaptation (Montefinese et al., 2014) only as a
 * qualitative reference. No numerical fitting against those lexicons has been
 * done yet (see docs/scientifico/piano-di-validazione.md, V-1). `c` is a coarse
 * category used for explanations and for the ISO strategy, never shown as a
 * diagnosis.
 *
 * Matching rules (see mood.js):
 *  - `stems` match the START of a token (Italian inflection: trist → triste,
 *    tristezza, tristi). A stem never matches inside a word.
 *  - `phrases` match whole normalized word sequences ("cuore spezzato").
 *  - Ambiguous Italian words ("solo" = alone / only, "bene" inside
 *    "non sto bene") are only listed as phrases, never as bare stems.
 */

/** @typedef {{ v: number, a: number, c: string }} Affect */

/** @type {Array<{ stems?: string[], phrases?: string[] } & Affect>} */
export const LEXICON = [
  // ── Joy / elation (high valence, mid-high arousal)
  { c: 'joy', v: 0.9, a: 0.8, stems: ['euforic', 'entusiast', 'ecstatic', 'elated', 'thrilled', 'esalt', 'excited', 'emozionat', 'gasat'],
    phrases: ['alla grande', 'alla grandissima', 'al settimo cielo', 'on top of the world', 'over the moon', 'sul tetto del mondo', 'feeling great', 'super felice'] },
  { c: 'joy', v: 0.85, a: 0.65, stems: ['felic', 'happy', 'gioi', 'joy', 'allegr', 'radios', 'contentissim', 'fantastic', 'amazing', 'wonderful', 'meraviglios', 'splendid', 'cheerful', 'glad'] },
  { c: 'joy', v: 0.78, a: 0.6, stems: ['positiv', 'ottim', 'great', 'sorrid', 'smil', 'divert'],
    phrases: ['fun', 'good day', 'bella giornata', 'giornata bella', 'bellissima giornata'] },
  { c: 'joy', v: 0.82, a: 0.72, stems: ['ballar', 'dance', 'dancing', 'festegg', 'celebrat'],
    phrases: ['che bello', 'ho passato', 'ce l ho fatta', 'i did it', 'passed the', 'finalmente'] },
  // contentment: positive but quiet
  { c: 'content', v: 0.72, a: 0.4, stems: ['content', 'soddisfatt', 'satisfied', 'leggero', 'leggera', 'sereno', 'serena', 'grato', 'grata', 'grateful', 'gratitud', 'meglio', 'better'],
    phrases: ['bene', 'benissimo', 'good', 'okay', 'ok', 'not bad', 'non male', 'doing okay', 'sto bene', 'mi sento bene', 'tutto bene', 'feel good', 'feeling good', 'i am good', 'im good', 'im fine', 'i am fine', 'sto benissimo', 'molto bene', 'tutto ok', 'sto meglio'] },
  { c: 'love', v: 0.85, a: 0.6, stems: ['innamorat', 'romantic', 'amore', 'loved'],
    phrases: ['in love', 'mi sono innamorato', 'mi sono innamorata'] },

  // ── Calm (positive valence, low arousal)
  { c: 'calm', v: 0.72, a: 0.2, stems: ['calm', 'tranquill', 'rilassat', 'relaxed', 'pacific', 'peaceful', 'quiet', 'sereni'],
    phrases: ['in pace', 'at peace'] },
  { c: 'calm_need', v: 0.55, a: 0.25, stems: ['rilass', 'relax', 'riposar', 'rest'],
    phrases: ['ho bisogno di calma', 'need to relax', 'voglio staccare', 'staccare la spina', 'unwind', 'wind down'] },

  // ── Drive / motivation (positive valence, high arousal)
  { c: 'drive', v: 0.72, a: 0.85, stems: ['motivat', 'determinat', 'carico', 'carica', 'carichi', 'energic', 'determined', 'pumped', 'grint', 'focused', 'pronto', 'pronta', 'ready'],
    phrases: ['ho energia', 'voglio energia', 'pieno di energia', 'piena di energia', 'full of energy', 'lets go', 'si parte'] },
  { c: 'focus', v: 0.55, a: 0.5, stems: ['concentr', 'focus', 'studi', 'study', 'lavor', 'work'] },

  // ── Sadness (low valence, low arousal)
  { c: 'sad', v: 0.15, a: 0.3, stems: ['depress', 'disperat', 'devastat', 'heartbroken', 'hopeless', 'distrutt', 'miserab'],
    phrases: ['cuore spezzato', 'a pezzi', 'broken heart', 'heart is broken', 'mi sento vuoto', 'mi sento vuota', 'feel empty', 'feeling empty', 'non ce la faccio', 'cant take it', 'cannot take it',
      'not feel anything', 'non provo niente', 'non sento niente', 'non provo nulla', 'numb'] },
  { c: 'sad', v: 0.25, a: 0.3, stems: ['trist', 'sad', 'malincon', 'melanchol', 'piang', 'crying', 'cried', 'unhappy', 'infelic', 'abbattut', 'scoraggiat', 'delus', 'disappoint', 'lutto', 'mort', 'died', 'passed away', 'colpa', 'guilt', 'guilty', 'inutil', 'useless', 'worthless', 'grief', 'griev', 'mancan', 'vuoto', 'vuota', 'empty'],
    phrases: ['giu', 'down', 'low', 'blue', 'giu di morale', 'mi sento giu', 'sono giu', 'feeling down', 'feel down', 'a bit low', 'feeling low', 'feel blue', 'mi manca', 'mi manchi', 'i miss'] },
  { c: 'lonely', v: 0.25, a: 0.3, stems: ['solitudin', 'lonely', 'loneliness', 'isolat', 'abbandonat'],
    // 'alone' is unambiguous in English; Italian 'solo' only inside phrases

    phrases: ['mi sento solo', 'mi sento sola', 'sono rimasto solo', 'sono rimasta sola', 'da solo', 'da sola', 'tutto solo', 'tutta sola', 'feel alone', 'feeling alone', 'all alone', 'nessuno mi capisce', 'alone'] },
  { c: 'nostalgia', v: 0.38, a: 0.3, stems: ['nostalg', 'ricord', 'rimpiang', 'remember', 'memories'] },

  // ── Tiredness / apathy (mid-low valence, very low arousal)
  { c: 'tired', v: 0.35, a: 0.12, stems: ['stanc', 'tired', 'esaust', 'exhaust', 'sfinit', 'assonnat', 'sleepy', 'fatigu', 'drained', 'burnout'],
    phrases: ['senza energia', 'no energy', 'senza forze', 'cotto', 'burned out', 'burnt out'] },
  { c: 'apathy', v: 0.35, a: 0.18, stems: ['demotivat', 'apatic', 'svogliat', 'annoiat', 'noia', 'nois', 'annoi', 'bored', 'boring', 'unmotivated', 'lazy', 'pigr'],
    phrases: ['senza voglia', 'non ho voglia', 'no voglia', 'nessuna voglia', 'cant be bothered'] },

  // ── Anxiety / fear (low valence, high arousal)
  { c: 'anx', v: 0.22, a: 0.82, stems: ['panic', 'terrorizz', 'terrified', 'angosc'],
    phrases: ['attacco di panico', 'panic attack', 'non respiro', 'cant breathe', 'cannot breathe'] },
  { c: 'anx', v: 0.32, a: 0.66, phrases: ['cannot focus', 'cant focus', 'cannot concentrate', 'non riesco a concentrarmi', 'non riesco a dormire', 'cannot sleep', 'cant sleep'] },
  { c: 'anx', v: 0.28, a: 0.75, stems: ['ansi', 'anxi', 'agitat', 'preoccup', 'worried', 'worry', 'nervos', 'nervous', 'paur', 'scared', 'afraid', 'fear', 'insicur', 'insecur', 'inquiet', 'restless', 'overwhelm', 'sopraffatt'] },
  { c: 'stress', v: 0.3, a: 0.72, stems: ['stress', 'tense', 'tension', 'pressione', 'pressure', 'scaden', 'deadline'],
    phrases: ['teso', 'tesa', 'tesissimo', 'tesissima'] },

  // ── Anger (low valence, high arousal)
  { c: 'anger', v: 0.15, a: 0.75, stems: ['merda', 'cazz', 'fuck', 'shit'] },
  { c: 'anger', v: 0.18, a: 0.85, stems: ['arrabbiat', 'incazz', 'furios', 'furious', 'rabbia', 'angry', 'anger', 'rage', 'odio', 'hate', 'irritat', 'annoyed', 'frustrat'],
    phrases: ['fuori di me', 'pissed off', 'mi da fastidio'] },

  // ── Generic negative (low valence, neutral arousal)
  { c: 'neg', v: 0.25, a: 0.4, stems: ['male', 'malissim', 'terribl', 'awful', 'orribil', 'horribl', 'schifo', 'bad', 'worse', 'worst', 'peggio', 'difficil', 'pesant', 'heavy'],
    phrases: ['sto male', 'mi sento male', 'giornata no', 'brutta giornata', 'giornata pesante', 'bad day', 'rough day', 'hard day', 'non va', 'uno schifo'] },
];

/** Emoji → affect. Emoji carry strong, low-ambiguity signal (Novak et al., 2015). */
export const EMOJI = [
  { re: /[\u{1F622}\u{1F62D}\u{1F614}\u{1F61E}\u{1F613}\u{1F629}\u{1F63F}\u{2639}\u{1F494}]/u, v: 0.2, a: 0.32, c: 'sad' },
  { re: /[\u{1F60A}\u{1F604}\u{1F603}\u{1F601}\u{1F600}\u{1F642}\u{1F60D}\u{1F389}\u{1F970}\u{2764}]/u, v: 0.85, a: 0.62, c: 'joy' },
  { re: /[\u{1F630}\u{1F628}\u{1F627}\u{1F626}\u{1F97A}\u{1F61F}\u{1F631}]/u, v: 0.25, a: 0.78, c: 'anx' },
  { re: /[\u{1F634}\u{1F971}\u{1F62A}]/u, v: 0.38, a: 0.12, c: 'tired' },
  { re: /[\u{1F4AA}\u{1F525}\u{26A1}\u{1F3C6}\u{1F680}]/u, v: 0.75, a: 0.88, c: 'drive' },
  { re: /[\u{1F620}\u{1F621}\u{1F92C}\u{1F624}]/u, v: 0.18, a: 0.85, c: 'anger' },
  { re: /[\u{1F60C}\u{1F9D8}\u{1F343}\u{2615}]/u, v: 0.7, a: 0.2, c: 'calm' },
];

/** Negators open a scope over the next NEGATION_SCOPE tokens (Hutto & Gilbert, 2014). */
export const NEGATORS = new Set([
  'non', 'mai', 'niente', 'nulla', 'nessun', 'nessuno', 'nessuna', 'neanche', 'nemmeno', 'neppure', 'senza',
  'not', 'no', 'never', 'nothing', 'none', 'nor', 'without', 'hardly', 'barely', 'cannot', 'cant', 'dont', 'didnt', 'isnt', 'wasnt',
]);
export const NEGATION_SCOPE = 4;

/** Degree adverbs scale the distance from neutral. */
export const BOOSTERS = new Map([
  ['molto', 1.3], ['tanto', 1.25], ['troppo', 1.35], ['davvero', 1.25], ['veramente', 1.25], ['proprio', 1.2],
  ['super', 1.3], ['estremamente', 1.45], ['incredibilmente', 1.4], ['cosi', 1.2], ['tantissimo', 1.4], ['assolutamente', 1.35],
  ['very', 1.3], ['so', 1.25], ['really', 1.25], ['extremely', 1.45], ['totally', 1.3], ['incredibly', 1.4], ['too', 1.3], ['absolutely', 1.35],
]);
export const DAMPENERS = new Map([
  ['poco', 0.55], ['abbastanza', 0.8], ['leggermente', 0.6], ['piuttosto', 0.85], ['quasi', 0.7], ['forse', 0.75],
  ['slightly', 0.6], ['somewhat', 0.7], ['kinda', 0.7], ['kind', 0.75], ['bit', 0.65], ['little', 0.65], ['maybe', 0.75], ['fairly', 0.8],
]);
/** Multi-word dampeners, matched on the normalized text before tokenizing. */
export const DAMPENER_PHRASES = [['un po', 0.65], ['un pochino', 0.55], ['a bit', 0.65], ['a little', 0.65], ['sort of', 0.7], ['kind of', 0.7]];

/** Contrastive conjunctions: the clause after carries more weight. */
export const CONTRAST = new Set(['ma', 'pero', 'tuttavia', 'eppure', 'invece', 'but', 'however', 'yet', 'though']);

/** Clause boundaries close a negation scope. */
export const BOUNDARY = new Set(['e', 'ed', 'and', 'perche', 'because', 'quindi', 'so that', 'poi', 'then']);
