/**
 * Bibliotherapy — curated therapeutic reading list mapped on the Russell plane
 * (energy × valence) with clinical intent tags. Each suggestion opens on
 * Open Library (free/borrow search) via media-links.js.
 * Selection follows the ISO principle: validate the current state, then open
 * gently toward the target state. All matching is local.
 */

import { careItemAllowed } from './care-safety.js';
import {
  CARE_ACCESS_FREE,
  CARE_ACCESS_PAID_OK,
  FREE_ACCESS_SOFT_WEIGHT,
  FREE_ACCESS_STRICT_WEIGHT,
  itemIsFreeAccess,
  normalizeCareAccessMode,
} from './care-access.js';
import {
  cochraneOutcomeAffinity,
  cochraneOutcomesFromMood,
} from './cochrane-evidence.js';
import { openLibrarySearchUrl } from './media-links.js';
import {
  MUSIC_LANGUAGE_DEFAULT,
  MUSIC_LANGUAGE_NATIVE,
  normalizeMusicLanguageMode,
} from './music-language.js';
import {
  filterCareItemsByGeoZone,
  GEO_WORLD,
  normalizeMusicGeoZone,
} from './music-geo.js';

/** Strong native boost when widening beyond the language filter (same spirit as music). */
const NATIVE_CARE_LANGUAGE_WEIGHT = 0.55;

/**
 * tags: anxiety | sadness | low_motivation | fatigue | relax | joy | focus
 * energy/valence: affect the book meets the reader in (not the book's "plot").
 * cochraneOutcomes: depression | anxiety | mental_state | social_functioning | quality_of_life
 */
export const THERAPEUTIC_BOOKS = [
  {
    id: 'book_man_search_meaning',
    language: 'en',
    geoCountry: 'at',
    title: "Man's Search for Meaning",
    author: 'Viktor E. Frankl',
    year: 1946,
    energy: 0.35,
    valence: 0.45,
    tags: ['sadness', 'low_motivation'],
    cochraneOutcomes: ['depression', 'mental_state', 'quality_of_life'],
    noteIt: 'Utile quando tutto sembra senza senso. Un sopravvissuto racconta come trovare un perché anche nei giorni duri.',
    noteEn: 'Helpful when life feels meaningless. A survivor explains how to find a why even on hard days.',
  },
  {
    id: 'book_wherever_you_go',
    language: 'en',
    geoCountry: 'us',
    title: 'Wherever You Go, There You Are',
    author: 'Jon Kabat-Zinn',
    year: 1994,
    energy: 0.2,
    valence: 0.6,
    tags: ['anxiety', 'relax'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile quando la mente non sta ferma. Pagine brevi per tornare al respiro, senza parole complicate.',
    noteEn: 'Helpful when your mind won’t sit still. Short pages to return to the breath, without jargon.',
  },
  {
    id: 'book_boy_mole_fox_horse',
    language: 'en',
    geoCountry: 'gb',
    title: 'The Boy, the Mole, the Fox and the Horse',
    author: 'Charlie Mackesy',
    year: 2019,
    energy: 0.25,
    valence: 0.75,
    tags: ['sadness', 'anxiety', 'relax'],
    cochraneOutcomes: ['depression', 'anxiety', 'quality_of_life'],
    noteIt: 'Utile nelle sere fragili. Un libriccino illustrato, dolce e corto, da tenere sul comodino.',
    noteEn: 'Helpful on fragile evenings. A gentle illustrated little book for the bedside.',
  },
  {
    id: 'book_reasons_stay_alive',
    language: 'en',
    geoCountry: 'gb',
    title: 'Reasons to Stay Alive',
    author: 'Matt Haig',
    year: 2015,
    energy: 0.3,
    valence: 0.5,
    tags: ['sadness', 'anxiety'],
    cochraneOutcomes: ['depression', 'anxiety'],
    noteIt: 'Utile se stai attraversando un periodo depressivo. Un racconto onesto, scritto da chi c’è passato.',
    noteEn: 'Helpful in a depressive stretch. An honest account written by someone who has been there.',
  },
  {
    id: 'book_midnight_library',
    language: 'en',
    geoCountry: 'gb',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    year: 2020,
    energy: 0.45,
    valence: 0.65,
    tags: ['sadness', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile quando ti senti bloccato. Un romanzo sulle vite possibili che aiuta a rimettere un piede avanti.',
    noteEn: 'Helpful when you feel stuck. A novel about possible lives that helps you take one step forward.',
  },
  {
    id: 'book_body_keeps_score',
    language: 'en',
    geoCountry: 'us',
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk',
    year: 2014,
    energy: 0.5,
    valence: 0.45,
    tags: ['anxiety', 'focus'],
    cochraneOutcomes: ['anxiety', 'mental_state'],
    noteIt: 'Utile per capire come corpo e memoria restano legati dopo eventi difficili. Da leggere piano, senza fretta.',
    noteEn: 'Helpful to understand how body and memory stay linked after hard events. Read slowly.',
  },
  {
    id: 'book_atomic_habits',
    language: 'en',
    geoCountry: 'us',
    title: 'Atomic Habits',
    author: 'James Clear',
    year: 2018,
    energy: 0.7,
    valence: 0.7,
    tags: ['low_motivation', 'focus'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'Utile quando manca la motivazione. Spiega come cambiare con passi piccoli e ripetibili.',
    noteEn: 'Helpful when motivation is low. Shows how to change with small, repeatable steps.',
  },
  {
    id: 'book_ikigai',
    language: 'es',
    geoCountry: 'es',
    title: 'Ikigai: The Japanese Secret to a Long and Happy Life',
    author: 'Héctor García, Francesc Miralles',
    year: 2016,
    energy: 0.5,
    valence: 0.7,
    tags: ['low_motivation', 'joy'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile se cerchi una ragione semplice per alzarti. Lettura leggera sul senso del quotidiano.',
    noteEn: 'Helpful if you want a simple reason to get up. A light read on everyday purpose.',
  },
  {
    id: 'book_when_things_fall_apart',
    language: 'en',
    geoCountry: 'us',
    title: 'When Things Fall Apart',
    author: 'Pema Chödrön',
    year: 1996,
    energy: 0.25,
    valence: 0.5,
    tags: ['anxiety', 'sadness', 'relax'],
    cochraneOutcomes: ['anxiety', 'depression', 'quality_of_life'],
    noteIt: 'Utile quando le cose crollano. Consigli di cuore, calmi, dalla tradizione contemplativa.',
    noteEn: 'Helpful when things fall apart. Warm, calm advice from a contemplative tradition.',
  },
  {
    id: 'book_the_comfort_book',
    language: 'en',
    geoCountry: 'gb',
    title: 'The Comfort Book',
    author: 'Matt Haig',
    year: 2021,
    energy: 0.2,
    valence: 0.65,
    tags: ['sadness', 'fatigue', 'relax'],
    cochraneOutcomes: ['depression', 'mental_state', 'quality_of_life'],
    noteIt: 'Utile per un conforto breve. Si apre a caso: frasi corte che fanno da coperta.',
    noteEn: 'Helpful for a short comfort. Open it at random: short lines that feel like a blanket.',
  },
  {
    id: 'book_flow',
    language: 'en',
    geoCountry: 'us',
    title: 'Flow: The Psychology of Optimal Experience',
    author: 'Mihaly Csikszentmihalyi',
    year: 1990,
    energy: 0.65,
    valence: 0.7,
    tags: ['focus', 'joy', 'low_motivation'],
    cochraneOutcomes: ['mental_state', 'quality_of_life', 'depression'],
    noteIt: 'Utile quando non riesci a concentrarti. Spiega come entrare nel “flusso” del lavoro o dello studio.',
    noteEn: 'Helpful when focus is hard. Explains how to enter the “flow” of work or study.',
  },
  {
    id: 'book_big_magic',
    language: 'en',
    geoCountry: 'us',
    title: 'Big Magic: Creative Living Beyond Fear',
    author: 'Elizabeth Gilbert',
    year: 2015,
    energy: 0.75,
    valence: 0.8,
    tags: ['joy', 'low_motivation'],
    cochraneOutcomes: ['quality_of_life', 'depression'],
    noteIt: 'Utile se la paura blocca la creatività. Energizza senza urlare e senza forzarti.',
    noteEn: 'Helpful if fear blocks creativity. Energising without shouting or pushing you.',
  },
  {
    id: 'book_untethered_soul',
    language: 'en',
    geoCountry: 'us',
    title: 'The Untethered Soul',
    author: 'Michael A. Singer',
    year: 2007,
    energy: 0.3,
    valence: 0.6,
    tags: ['anxiety', 'relax'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile quando i pensieri ti trascinano. Aiuta a osservare la voce interiore senza seguirla sempre.',
    noteEn: 'Helpful when thoughts drag you around. Helps you watch the inner voice without always following it.',
  },
  {
    id: 'book_musicophilia',
    language: 'en',
    geoCountry: 'us',
    title: 'Musicophilia: Tales of Music and the Brain',
    author: 'Oliver Sacks',
    year: 2007,
    energy: 0.55,
    valence: 0.65,
    tags: ['focus', 'joy'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Utile se vuoi capire perché la musica ti tocca. Storie vere su cervello e ascolto.',
    noteEn: 'Helpful if you want to know why music moves you. True stories of brain and listening.',
  },
  {
    id: 'book_rest',
    language: 'en',
    geoCountry: 'us',
    title: 'Rest: Why You Get More Done When You Work Less',
    author: 'Alex Soojung-Kim Pang',
    year: 2016,
    energy: 0.3,
    valence: 0.6,
    tags: ['fatigue', 'relax', 'focus'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Utile quando ti senti in colpa a riposare. Mostra il riposo come parte del fare, non come resa.',
    noteEn: 'Helpful when rest feels like guilt. Shows rest as care, not as giving up.',
  },
  {
    id: 'book_little_prince',
    language: 'fr',
    geoCountry: 'fr',
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    year: 1943,
    energy: 0.35,
    valence: 0.8,
    tags: ['sadness', 'joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per una cura dolce. Rileggerlo da adulti è una compagnia quieta.',
    noteEn: 'Helpful for gentle care. Re-reading it as an adult is quiet company.',
  },
  {
    id: 'book_maybe_you_should_talk',
    language: 'en',
    geoCountry: 'us',
    title: 'Maybe You Should Talk to Someone',
    author: 'Lori Gottlieb',
    year: 2019,
    energy: 0.5,
    valence: 0.6,
    tags: ['sadness', 'anxiety', 'joy'],
    cochraneOutcomes: ['depression', 'anxiety', 'quality_of_life'],
    noteIt: 'Utile se pensi di chiedere aiuto. Una psicoterapeuta racconta il proprio studio e la propria vita: umano e divertente.',
    noteEn: 'Helpful if you’re considering asking for help. A psychotherapist tells of her practice and her own life: human and funny.',
  },
  {
    id: 'book_siddhartha',
    language: 'de',
    geoCountry: 'de',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    year: 1922,
    energy: 0.3,
    valence: 0.65,
    tags: ['relax', 'focus', 'sadness'],
    cochraneOutcomes: ['quality_of_life', 'mental_state', 'depression'],
    noteIt: 'Utile se cerchi quiete. Un cammino verso la calma raccontato come un fiume.',
    noteEn: 'Helpful if you seek quiet. A path toward calm told like a river.',
  },
  {
    id: 'book_arte_essere_fragili',
    language: 'it',
    geoCountry: 'it',
    geoCity: 'palermo',
    title: "L'arte di essere fragili",
    author: 'Alessandro D’Avenia',
    year: 2016,
    energy: 0.35,
    valence: 0.55,
    tags: ['sadness', 'anxiety', 'low_motivation'],
    cochraneOutcomes: ['depression', 'anxiety', 'quality_of_life'],
    noteIt: 'Utile quando ti senti troppo fragile. Mostra la fragilità come forza e compagnia.',
    noteEn: 'Helpful when you feel too fragile. Shows fragility as strength and companionship.',
  },
  {
    id: 'book_otto_montagne',
    language: 'it',
    geoCountry: 'it',
    geoRegion: 'valle-daosta',
    geoCity: 'cervinia',
    title: 'Le otto montagne',
    author: 'Paolo Cognetti',
    year: 2016,
    energy: 0.4,
    valence: 0.6,
    tags: ['sadness', 'relax', 'focus'],
    cochraneOutcomes: ['depression', 'mental_state', 'quality_of_life'],
    noteIt: 'Utile quando hai bisogno di lentezza. Montagna e amicizia: un passo quieto.',
    noteEn: 'Helpful when you need slowness. Mountains and friendship: a quiet step.',
  },
  {
    id: 'book_se_questo_uomo',
    language: 'it',
    geoCountry: 'it',
    geoCity: 'torino',
    title: 'Se questo è un uomo',
    author: 'Primo Levi',
    year: 1947,
    energy: 0.3,
    valence: 0.4,
    tags: ['sadness', 'focus'],
    cochraneOutcomes: ['depression', 'mental_state', 'quality_of_life'],
    noteIt: 'Utile per una lettura di testimonianza e rispetto. Da affrontare senza fretta.',
    noteEn: 'Helpful for a reading of witness and respect. Take it without rushing.',
  },
  {
    id: 'book_casa_sguardi',
    language: 'it',
    geoCountry: 'it',
    geoCity: 'roma',
    title: 'La casa degli sguardi',
    author: 'Daniele Mencarelli',
    year: 2018,
    energy: 0.35,
    valence: 0.5,
    tags: ['sadness', 'anxiety', 'joy'],
    cochraneOutcomes: ['depression', 'anxiety', 'quality_of_life'],
    noteIt: 'Utile quando ti serve umanità vicina. Cura e sguardi che salvano, senza retorica.',
    noteEn: 'Helpful when you need nearby humanity. Care and glances that save, without rhetoric.',
  },
  {
    id: 'book_marcovaldo',
    language: 'it',
    geoCountry: 'it',
    geoCity: 'torino',
    title: 'Marcovaldo',
    author: 'Italo Calvino',
    year: 1963,
    energy: 0.4,
    valence: 0.7,
    tags: ['relax', 'joy', 'sadness'],
    cochraneOutcomes: ['quality_of_life', 'depression'],
    noteIt: 'Utile per alleggerire senza sforzo. Piccole meraviglie di città, a dose leggera.',
    noteEn: 'Helpful to lighten up without effort. Small city wonders, in a light dose.',
  },
  {
    id: 'book_deserto_tartari',
    language: 'it',
    geoCountry: 'it',
    title: 'Il deserto dei Tartari',
    author: 'Dino Buzzati',
    year: 1940,
    energy: 0.25,
    valence: 0.45,
    tags: ['anxiety', 'fatigue', 'sadness'],
    cochraneOutcomes: ['anxiety', 'depression', 'mental_state'],
    noteIt: 'Utile se vivi nell’attesa. Racconta il tempo che passa e l’ansia quieta di aspettare.',
    noteEn: 'Helpful if you live in waiting. It names the quiet anxiety of time passing.',
  },
  {
    id: 'book_bar_sotto_mare',
    language: 'it',
    geoCountry: 'it',
    title: 'Il bar sotto il mare',
    author: 'Stefano Benni',
    year: 1987,
    energy: 0.55,
    valence: 0.75,
    tags: ['joy', 'low_motivation', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile quando serve un sorriso. Invenzione e leggerezza, senza prediche.',
    noteEn: 'Helpful when you need a smile. Invention and lightness, without lectures.',
  },
  {
    id: 'book_pride_prejudice',
    language: 'en',
    geoCountry: 'gb',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    energy: 0.4,
    valence: 0.75,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per staccare dal presente. Ironia gentile e un mondo in ordine.',
    noteEn: 'Helpful for leaving the present behind. Gentle irony and a world in order.',
  },
  {
    id: 'book_persuasion',
    language: 'en',
    geoCountry: 'gb',
    title: 'Persuasion',
    author: 'Jane Austen',
    year: 1817,
    energy: 0.3,
    valence: 0.6,
    tags: ['sadness', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per le seconde occasioni. Tristezza mite che si scioglie piano.',
    noteEn: 'Helpful for second chances. A mild sadness that melts slowly.',
  },
  {
    id: 'book_little_women',
    language: 'en',
    geoCountry: 'us',
    title: 'Little Women',
    author: 'Louisa May Alcott',
    year: 1868,
    energy: 0.45,
    valence: 0.7,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'social_functioning', 'quality_of_life'],
    noteIt: 'Utile per sentirsi in famiglia. Quattro sorelle, una casa calda.',
    noteEn: 'Helpful for feeling at home. Four sisters, one warm house.',
  },
  {
    id: 'book_anne_green_gables',
    language: 'en',
    geoCountry: 'ca',
    title: 'Anne of Green Gables',
    author: 'L. M. Montgomery',
    year: 1908,
    energy: 0.5,
    valence: 0.8,
    tags: ['joy', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile quando serve luce. Anna parla troppo e il mondo diventa migliore.',
    noteEn: 'Helpful when you need light. Anne talks too much and the world gets better.',
  },
  {
    id: 'book_secret_garden',
    language: 'en',
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    year: 1911,
    energy: 0.4,
    valence: 0.7,
    tags: ['sadness', 'joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per ricominciare. Un giardino chiuso che torna a fiorire, come capita.',
    noteEn: 'Helpful for starting over. A locked garden blooming again, as happens.',
  },
  {
    id: 'book_winnie_pooh',
    language: 'en',
    geoCountry: 'gb',
    title: 'Winnie-the-Pooh',
    author: 'A. A. Milne',
    year: 1926,
    energy: 0.35,
    valence: 0.8,
    tags: ['relax', 'joy'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per tornare bambini. Niente fretta nel Bosco dei Cento Acri.',
    noteEn: 'Helpful for becoming a child again. No hurry in the Hundred Acre Wood.',
  },
  {
    id: 'book_hobbit',
    language: 'en',
    geoCountry: 'gb',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    year: 1937,
    energy: 0.55,
    valence: 0.7,
    tags: ['joy', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per partire piano. Un hobbit che non voleva avventure, eppure.',
    noteEn: 'Helpful for starting gently. A hobbit who wanted no adventures, and yet.',
  },
  {
    id: 'book_momo',
    language: 'de',
    geoCountry: 'de',
    title: 'Momo',
    author: 'Michael Ende',
    year: 1973,
    energy: 0.4,
    valence: 0.65,
    tags: ['anxiety', 'relax'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile contro la fretta. Una bambina che restituisce il tempo agli adulti.',
    noteEn: 'Helpful against hurry. A girl who gives time back to grown-ups.',
  },
  {
    id: 'book_neverending_story',
    language: 'de',
    geoCountry: 'de',
    title: 'Die unendliche Geschichte',
    author: 'Michael Ende',
    year: 1979,
    energy: 0.5,
    valence: 0.65,
    tags: ['joy', 'sadness', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per credere ancora alle storie. Chi legge salva Fantàsia.',
    noteEn: 'Helpful for believing in stories again. Whoever reads saves Fantastica.',
  },
  {
    id: 'book_favole_telefono',
    language: 'it',
    geoCountry: 'it',
    title: 'Favole al telefono',
    author: 'Gianni Rodari',
    year: 1962,
    energy: 0.5,
    valence: 0.8,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per addormentarsi sereni. Una favola breve al telefono, ogni sera.',
    noteEn: 'Helpful for falling asleep peacefully. One short tale by phone, every night.',
  },
  {
    id: 'book_barone_rampante',
    language: 'it',
    geoCountry: 'it',
    title: 'Il barone rampante',
    author: 'Italo Calvino',
    year: 1957,
    energy: 0.5,
    valence: 0.7,
    tags: ['joy', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per guardare dall’alto. Un ragazzo sugli alberi che non scende mai.',
    noteEn: 'Helpful for seeing from above. A boy in the trees who never comes down.',
  },
  {
    id: 'book_uomo_pianta_alberi',
    language: 'fr',
    geoCountry: 'fr',
    title: "L'homme qui plantait des arbres",
    author: 'Jean Giono',
    year: 1953,
    energy: 0.3,
    valence: 0.7,
    tags: ['relax', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per la pazienza. Un uomo pianta ghiande e cambia una valle.',
    noteEn: 'Helpful for patience. A man plants acorns and changes a valley.',
  },
  {
    id: 'book_profeta',
    language: 'en',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    year: 1923,
    energy: 0.25,
    valence: 0.65,
    tags: ['relax', 'sadness'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile a piccole dosi. Pagine brevi su amore, lavoro e addii.',
    noteEn: 'Helpful in small doses. Short pages on love, work and farewells.',
  },
  {
    id: 'book_walden',
    language: 'en',
    geoCountry: 'us',
    title: 'Walden',
    author: 'Henry David Thoreau',
    year: 1854,
    energy: 0.3,
    valence: 0.65,
    tags: ['relax', 'anxiety'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per semplificare. Una capanna, un lago, il necessario.',
    noteEn: 'Helpful for simplifying. A cabin, a lake, the essentials.',
  },
  {
    id: 'book_kitchen',
    language: 'ja',
    geoCountry: 'jp',
    title: 'Kitchen',
    author: 'Banana Yoshimoto',
    year: 1988,
    energy: 0.35,
    valence: 0.6,
    tags: ['sadness', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per i lutti piccoli. Si ricomincia da una cucina illuminata.',
    noteEn: 'Helpful for small griefs. You start over from a lit kitchen.',
  },
  {
    id: 'book_visconte_dimezzato',
    language: 'it',
    geoCountry: 'it',
    title: 'Il visconte dimezzato',
    author: 'Italo Calvino',
    year: 1952,
    energy: 0.5,
    valence: 0.6,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per le metà di sé. Metà cattivo e metà buono fanno un uomo intero.',
    noteEn: 'Helpful for your halves. Half bad and half good make a whole person.',
  },
  {
    id: 'book_luna_falo',
    language: 'it',
    geoCountry: 'it',
    title: 'La luna e i falò',
    author: 'Cesare Pavese',
    year: 1950,
    energy: 0.3,
    valence: 0.5,
    tags: ['sadness', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per tornare ai luoghi. Malinconia contadina che fa compagnia.',
    noteEn: 'Helpful for returning to places. A rural melancholy that keeps company.',
  },
  {
    id: 'book_amica_geniale_romanzo',
    language: 'it',
    geoCountry: 'it',
    title: "L'amica geniale",
    author: 'Elena Ferrante',
    year: 2011,
    energy: 0.45,
    valence: 0.55,
    tags: ['sadness', 'joy'],
    cochraneOutcomes: ['depression', 'social_functioning', 'quality_of_life'],
    noteIt: 'Utile sulle amicizie che formano. Due bambine, un rione, una vita.',
    noteEn: 'Helpful on friendships that shape you. Two girls, one neighbourhood, one life.',
  },
  {
    id: 'book_io_non_ho_paura',
    language: 'it',
    geoCountry: 'it',
    title: 'Io non ho paura',
    author: 'Niccolò Ammaniti',
    year: 2001,
    energy: 0.5,
    valence: 0.55,
    tags: ['anxiety', 'joy'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per il coraggio dei piccoli. Un’estate di grano e una scelta buona.',
    noteEn: 'Helpful for small courage. A wheat-field summer and one good choice.',
  },
  {
    id: 'book_fu_mattia_pascal',
    language: 'it',
    geoCountry: 'it',
    title: 'Il fu Mattia Pascal',
    author: 'Luigi Pirandello',
    year: 1904,
    energy: 0.35,
    valence: 0.5,
    tags: ['sadness', 'anxiety'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'Utile per chi si sente fuori posto. Ricominciare da zero non è semplice, ma si ride.',
    noteEn: 'Helpful for feeling out of place. Starting over is not simple, but there is laughter.',
  },
  {
    id: 'book_questione_privata',
    language: 'it',
    geoCountry: 'it',
    title: 'Una questione privata',
    author: 'Beppe Fenoglio',
    year: 1963,
    energy: 0.4,
    valence: 0.5,
    tags: ['sadness', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per gli amori assoluti. Breve, feroce, indimenticabile.',
    noteEn: 'Helpful for absolute loves. Short, fierce, unforgettable.',
  },
  {
    id: 'book_alchimista',
    language: 'pt',
    geoCountry: 'br',
    title: "O Alquimista",
    author: 'Paulo Coelho',
    year: 1988,
    energy: 0.45,
    valence: 0.7,
    tags: ['low_motivation', 'joy'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per rimettersi in cammino. Un pastore, un deserto, una leggenda personale.',
    noteEn: 'Helpful for setting off again. A shepherd, a desert, a personal legend.',
  },
  {
    id: 'book_devotions',
    language: 'en',
    geoCountry: 'us',
    title: 'Devotions',
    author: 'Mary Oliver',
    year: 2017,
    energy: 0.25,
    valence: 0.75,
    tags: ['relax', 'anxiety'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per guardare fuori. Poesie brevi su uccelli, alberi e attenzione.',
    noteEn: 'Helpful for looking outside. Short poems on birds, trees and attention.',
  },
  {
    id: 'book_odi_elementari',
    language: 'es',
    geoCountry: 'cl',
    title: 'Odas elementales',
    author: 'Pablo Neruda',
    year: 1954,
    energy: 0.3,
    valence: 0.7,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per le cose piccole. Odi al pane, alla cipolla, alle cose vere.',
    noteEn: 'Helpful for small things. Odes to bread, onions, real things.',
  },
  {
    id: 'book_lettere_giovane_poeta',
    language: 'de',
    title: 'Briefe an einen jungen Dichter',
    author: 'Rainer Maria Rilke',
    year: 1929,
    energy: 0.25,
    valence: 0.6,
    tags: ['anxiety', 'relax', 'sadness'],
    cochraneOutcomes: ['anxiety', 'depression', 'quality_of_life'],
    noteIt: 'Utile per le domande senza risposta. Lettere che fanno da compagnia.',
    noteEn: 'Helpful for unanswered questions. Letters that keep company.',
  },
  {
    id: 'book_foglie_erba',
    language: 'en',
    geoCountry: 'us',
    title: 'Leaves of Grass',
    author: 'Walt Whitman',
    year: 1855,
    energy: 0.35,
    valence: 0.65,
    tags: ['joy', 'relax', 'low_motivation'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per sentirsi parte del tutto. Canta te stesso, dice, e il resto segue.',
    noteEn: 'Helpful for feeling part of everything. Celebrate yourself, he says, and the rest follows.',
  },
  {
    id: 'book_comfort_book',
    language: 'en',
    geoCountry: 'gb',
    title: 'The Comfort Book',
    author: 'Matt Haig',
    year: 2021,
    energy: 0.3,
    valence: 0.7,
    tags: ['sadness', 'anxiety', 'relax'],
    cochraneOutcomes: ['depression', 'anxiety', 'quality_of_life'],
    noteIt: 'Utile nei giorni storti. Piccole pagine di conforto, una tira l’altra.',
    noteEn: 'Helpful on crooked days. Small pages of comfort, one after another.',
  },
  {
    id: 'book_miracolo_presenza',
    language: 'en',
    title: 'The Miracle of Mindfulness',
    author: 'Thich Nhat Hanh',
    year: 1975,
    energy: 0.2,
    valence: 0.65,
    tags: ['anxiety', 'relax'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per rallentare davvero. Lavare i piatti come fosse la cosa più importante.',
    noteEn: 'Helpful for truly slowing down. Washing dishes as if it were the most important thing.',
  },
  {
    id: 'book_barone_lamberto',
    language: 'it',
    geoCountry: 'it',
    title: "C'era due volte il barone Lamberto",
    author: 'Gianni Rodari',
    year: 1978,
    energy: 0.5,
    valence: 0.75,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per ridere da grandi. Il barone che ripete il suo nome e non muore mai.',
    noteEn: 'Helpful for laughing as a grown-up. The baron who repeats his name and never dies.',
  },
  {
    id: 'book_rose_insalata',
    language: 'it',
    geoCountry: 'it',
    title: "Rose nell'insalata",
    author: 'Bruno Munari',
    year: 1974,
    energy: 0.4,
    valence: 0.75,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Utile per guardare con occhi nuovi. Un libro da sfogliare piano, anche da grandi.',
    noteEn: 'Helpful for seeing with new eyes. A book to leaf through slowly, even grown up.',
  },
  {
    id: 'book_mostri_selvaggi',
    language: 'en',
    geoCountry: 'us',
    title: 'Where the Wild Things Are',
    author: 'Maurice Sendak',
    year: 1963,
    energy: 0.45,
    valence: 0.65,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per la rabbia buona. Una festa coi mostri, poi a casa dove è caldo.',
    noteEn: 'Helpful for good anger. A party with monsters, then home where it is warm.',
  },
  {
    id: 'book_albero_shel',
    language: 'en',
    geoCountry: 'us',
    title: 'The Giving Tree',
    author: 'Shel Silverstein',
    year: 1964,
    energy: 0.3,
    valence: 0.55,
    tags: ['sadness', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Utile per chi dà troppo. Un albero che ama fino in fondo, in poche pagine.',
    noteEn: 'Helpful for those who give too much. A tree that loves to the end, in few pages.',
  },
  {
    id: 'book_aff_apropos_nothing',
    language: 'en',
    geoCountry: 'us',
    title: 'Apropos of Nothing',
    author: 'Woody Allen',
    year: 2020,
    energy: 0.4,
    valence: 0.6,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Autobiografia di Allen: infanzia a Brooklyn e battute anche sul serio.',
    noteEn: 'Allen’s autobiography: Brooklyn childhood and jokes even when serious.',
  },
  {
    id: 'book_aff_almodovar_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Almodóvar on Almodóvar',
    author: 'Frédéric Strauss',
    year: 2006,
    energy: 0.4,
    valence: 0.65,
    tags: ['joy', 'focus'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Il regista si racconta a Strauss: madri, colori e desideri senza vergogna.',
    noteEn: 'The director tells himself to Strauss: mothers, colours, shameless desires.',
  },
  {
    id: 'book_aff_magnifica_ossessione',
    language: 'it',
    geoCountry: 'it',
    title: 'La mia magnifica ossessione',
    author: 'Bernardo Bertolucci',
    year: 2010,
    energy: 0.35,
    valence: 0.6,
    tags: ['focus', 'relax'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Scritti e ricordi di Bertolucci: il cinema come ossessione gentile.',
    noteEn: 'Bertolucci’s writings and memories: cinema as a gentle obsession.',
  },
  {
    id: 'book_aff_burton_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Burton on Burton',
    author: 'Mark Salisbury',
    year: 2006,
    energy: 0.4,
    valence: 0.65,
    tags: ['joy', 'focus'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Burton racconta Burton: forbici, pipistrelli e outsider teneri.',
    noteEn: 'Burton on Burton: scissors, bats and tender outsiders.',
  },
  {
    id: 'book_aff_lebowski',
    language: 'en',
    geoCountry: 'us',
    title: "I'm a Lebowski, You're a Lebowski",
    author: 'Bill Green',
    year: 2007,
    energy: 0.45,
    valence: 0.75,
    tags: ['joy', 'relax'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Per il mondo dei Coen: il culto del Drugo tra tappeti e White Russian.',
    noteEn: 'For the Coen world: the Dude’s cult of rugs and White Russians.',
  },
  {
    id: 'book_aff_cronenberg_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Cronenberg on Cronenberg',
    author: 'Chris Rodley',
    year: 1997,
    energy: 0.4,
    valence: 0.5,
    tags: ['focus', 'anxiety'],
    cochraneOutcomes: ['anxiety', 'mental_state'],
    noteIt: 'Cronenberg spiega il corpo che cambia: interviste senza paura.',
    noteEn: 'Cronenberg on the changing body: fearless interviews.',
  },
  {
    id: 'book_aff_turnaround',
    language: 'en',
    geoCountry: 'us',
    title: 'Turnaround',
    author: 'Miloš Forman',
    year: 1994,
    energy: 0.4,
    valence: 0.6,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Memorie di Forman: da Praga a Hollywood passando per il manicomio.',
    noteEn: 'Forman’s memoir: from Prague to Hollywood via the asylum.',
  },
  {
    id: 'book_aff_godard_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Godard on Godard',
    author: 'Jean-Luc Godard',
    year: 1972,
    energy: 0.35,
    valence: 0.55,
    tags: ['focus'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Godard giovane che spiega il cinema nuovo: Cahiers e rivoluzione.',
    noteEn: 'Young Godard on new cinema: Cahiers and revolution.',
  },
  {
    id: 'book_aff_like_water_chocolate',
    language: 'es',
    geoCountry: 'mx',
    title: 'Como agua para chocolate',
    author: 'Laura Esquivel',
    year: 1989,
    energy: 0.4,
    valence: 0.7,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Per il Messico magico di Iñárritu: cucina, amori e realismo incantato.',
    noteEn: 'For Iñárritu-style magic Mexico: cooking, loves and enchanted realism.',
  },
  {
    id: 'book_aff_paterson_wcw',
    language: 'en',
    geoCountry: 'us',
    title: 'Paterson',
    author: 'William Carlos Williams',
    year: 1958,
    energy: 0.3,
    valence: 0.6,
    tags: ['relax', 'focus'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Il poema che dà il nome al film di Jarmusch: una città qualunque, poesia ovunque.',
    noteEn: 'The poem naming Jarmusch’s film: any town, poetry everywhere.',
  },
  {
    id: 'book_aff_drunkard',
    language: 'zh',
    geoCountry: 'cn',
    title: 'The Drunkard',
    author: 'Liu Yichang',
    year: 1962,
    energy: 0.35,
    valence: 0.5,
    tags: ['sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Il romanzo dietro 2040 e In the Mood: Hong Kong che beve e ricorda.',
    noteEn: 'The novel behind 2046 and In the Mood: a Hong Kong that drinks and remembers.',
  },
  {
    id: 'book_aff_kiffe_kiffe',
    language: 'fr',
    geoCountry: 'fr',
    title: 'Kiffe kiffe demain',
    author: 'Faïza Guène',
    year: 2004,
    energy: 0.45,
    valence: 0.65,
    tags: ['joy', 'sadness'],
    cochraneOutcomes: ['depression', 'social_functioning', 'quality_of_life'],
    noteIt: 'Una ragazza racconta la sua periferia con ironia e tenerezza.',
    noteEn: 'A girl tells of her suburb with irony and tenderness.',
  },
  {
    id: 'book_aff_boy_kitano',
    language: 'ja',
    geoCountry: 'jp',
    title: 'Boy',
    author: 'Takeshi Kitano',
    year: 1987,
    energy: 0.35,
    valence: 0.55,
    tags: ['sadness', 'joy'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Romanzo di Kitano: infanzia povera e madre severa, tenerezza ruvida.',
    noteEn: 'Kitano’s novel: poor childhood and a stern mother, rough tenderness.',
  },
  {
    id: 'book_aff_kusturica_memoir',
    language: 'sr',
    title: 'Where Am I in This Story',
    author: 'Emir Kusturica',
    year: 2013,
    energy: 0.4,
    valence: 0.55,
    tags: ['sadness', 'joy'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Memorie di Kusturica: Sarajevo, il cinema e la Jugoslavia perduta.',
    noteEn: 'Kusturica’s memoir: Sarajevo, cinema and lost Yugoslavia.',
  },
  {
    id: 'book_aff_catching_fish',
    language: 'en',
    geoCountry: 'us',
    title: 'Catching the Big Fish',
    author: 'David Lynch',
    year: 2006,
    energy: 0.25,
    valence: 0.65,
    tags: ['relax', 'focus'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Lynch sulla meditazione: pescare idee profonde in acque calme.',
    noteEn: 'Lynch on meditation: catching big ideas in calm waters.',
  },
  {
    id: 'book_aff_heat2',
    language: 'en',
    geoCountry: 'us',
    title: 'Heat 2',
    author: 'Michael Mann',
    year: 2022,
    energy: 0.5,
    valence: 0.55,
    tags: ['focus', 'anxiety'],
    cochraneOutcomes: ['anxiety', 'mental_state'],
    noteIt: 'Mann continua Heat in romanzo: professionisti del crimine prima e dopo.',
    noteEn: 'Mann continues Heat as a novel: crime professionals before and after.',
  },
  {
    id: 'book_aff_go_down_together',
    language: 'en',
    geoCountry: 'us',
    title: 'Go Down Together',
    author: 'Jeff Guinn',
    year: 2009,
    energy: 0.4,
    valence: 0.5,
    tags: ['focus', 'sadness'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'La vera storia di Bonnie e Clyde, per il west di Penn.',
    noteEn: 'The true Bonnie and Clyde story, for Penn’s west.',
  },
  {
    id: 'book_aff_roman_polanski',
    language: 'en',
    geoCountry: 'gb',
    title: 'Roman',
    author: 'Roman Polanski',
    year: 1984,
    energy: 0.35,
    valence: 0.45,
    tags: ['sadness', 'focus'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'Autobiografia di Polanski: infanzia in guerra e cinema come fuga.',
    noteEn: 'Polanski’s autobiography: wartime childhood and cinema as escape.',
  },
  {
    id: 'book_aff_out_of_africa',
    language: 'en',
    geoCountry: 'dk',
    title: 'Out of Africa',
    author: 'Karen Blixen',
    year: 1937,
    energy: 0.35,
    valence: 0.6,
    tags: ['relax', 'sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Il libro dietro il film di Pollack: Kenya, amore e nostalgia coloniale.',
    noteEn: 'The book behind Pollack’s film: Kenya, love and colonial nostalgia.',
  },
  {
    id: 'book_aff_scorsese_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Scorsese on Scorsese',
    author: 'Ian Christie',
    year: 2003,
    energy: 0.4,
    valence: 0.6,
    tags: ['focus', 'joy'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Scorsese si racconta: Little Italy, il rock e la grazia cercata.',
    noteEn: 'Scorsese on himself: Little Italy, rock and sought grace.',
  },
  {
    id: 'book_aff_getting_away',
    language: 'en',
    geoCountry: 'us',
    title: 'Getting Away with It',
    author: 'Steven Soderbergh',
    year: 1999,
    energy: 0.4,
    valence: 0.6,
    tags: ['focus', 'joy'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Soderbergh intervistato sul mestiere: come si gira liberi a Hollywood.',
    noteEn: 'Soderbergh interviewed on the craft: shooting free in Hollywood.',
  },
  {
    id: 'book_aff_chasing_light',
    language: 'en',
    geoCountry: 'us',
    title: 'Chasing the Light',
    author: 'Oliver Stone',
    year: 2020,
    energy: 0.4,
    valence: 0.55,
    tags: ['focus', 'low_motivation'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'Memorie di Stone fino a Platoon: Vietnam, rabbia e cinema.',
    noteEn: 'Stone’s memoir up to Platoon: Vietnam, rage and cinema.',
  },
  {
    id: 'book_aff_trier_on',
    language: 'en',
    geoCountry: 'gb',
    title: 'Trier on von Trier',
    author: 'Stig Björkman',
    year: 2003,
    energy: 0.35,
    valence: 0.5,
    tags: ['focus', 'anxiety'],
    cochraneOutcomes: ['anxiety', 'mental_state'],
    noteIt: 'Von Trier senza filtri: provocazioni, paure e metodo.',
    noteEn: 'Von Trier unfiltered: provocations, fears and method.',
  },
  {
    id: 'book_aff_emotion_pictures',
    language: 'en',
    geoCountry: 'de',
    title: 'Emotion Pictures',
    author: 'Wim Wenders',
    year: 1986,
    energy: 0.3,
    valence: 0.6,
    tags: ['relax', 'focus'],
    cochraneOutcomes: ['anxiety', 'quality_of_life'],
    noteIt: 'Wenders scrive di cinema e strade: saggi brevi da leggere piano.',
    noteEn: 'Wenders on cinema and roads: short essays to read slowly.',
  },
  {
    id: 'book_aff_john_woo_interviews',
    language: 'en',
    geoCountry: 'us',
    title: 'John Woo: Interviews',
    author: 'Robert Kenneth Hall',
    year: 2005,
    energy: 0.4,
    valence: 0.6,
    tags: ['focus', 'joy'],
    cochraneOutcomes: ['mental_state', 'quality_of_life'],
    noteIt: 'Woo racconta Woo: colombe, rallenty e onore tra Hong Kong e Hollywood.',
    noteEn: 'Woo on Woo: doves, slow motion and honour from Hong Kong to Hollywood.',
  },
  {
    id: 'book_aff_savage_detectives',
    language: 'es',
    title: 'Los detectives salvajes',
    author: 'Roberto Bolaño',
    year: 1998,
    energy: 0.45,
    valence: 0.55,
    tags: ['sadness', 'joy'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Per il Messico di Iñárritu: poeti perduti tra Città del Messico e deserto.',
    noteEn: 'For Iñárritu’s Mexico: lost poets between Mexico City and desert.',
  },
  {
    id: 'book_aff_unbearable_lightness',
    language: 'en',
    title: 'The Unbearable Lightness of Being',
    author: 'Milan Kundera',
    year: 1984,
    energy: 0.35,
    valence: 0.5,
    tags: ['sadness', 'focus'],
    cochraneOutcomes: ['depression', 'mental_state'],
    noteIt: 'Per Forman e Praga: amore e Storia con leggerezza insostenibile.',
    noteEn: 'For Forman and Prague: love and History with unbearable lightness.',
  },
  {
    id: 'book_aff_assommoir',
    language: 'fr',
    geoCountry: 'fr',
    title: "L'Assommoir",
    author: 'Émile Zola',
    year: 1877,
    energy: 0.35,
    valence: 0.45,
    tags: ['sadness'],
    cochraneOutcomes: ['depression', 'quality_of_life'],
    noteIt: 'Per le periferie di Kassovitz prima delle periferie: Parigi operaia di Zola.',
    noteEn: 'For pre-projects Kassovitz peripheries: Zola’s working-class Paris.',
  },
];

/** Primary open URL: Open Library search (economical / borrowable editions). */
export function goodreadsUrl(book) {
  return openLibrarySearchUrl(book);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function proximity(e1, v1, e2, v2) {
  return 1 - Math.hypot(e1 - e2, v1 - v2) / Math.SQRT2;
}

/** Dominant clinical tags from the mood analysis. */
export function moodTags(mood) {
  const tags = [];
  if ((mood?.anxiety ?? 0) >= 0.6) tags.push('anxiety');
  if ((mood?.sadness ?? 0) >= 0.6) tags.push('sadness');
  if (mood?.isLowMotivation) tags.push('low_motivation');
  if ((mood?.energy ?? 0.5) <= 0.3) tags.push('fatigue');
  if ((mood?.relaxation ?? 0) >= 0.7) tags.push('relax');
  if ((mood?.happiness ?? 0) >= 0.7) tags.push('joy');
  if ((mood?.concentration ?? 0) >= 0.7) tags.push('focus');
  return tags.length ? tags : ['relax'];
}

/**
 * ISO language code for a care-media catalogue item (`language` / `lang`).
 * Defaults to `en` when unannotated so ranking stays deterministic.
 * @param {object} item
 * @returns {string}
 */
export function careItemLanguage(item) {
  const raw = String(item?.language || item?.lang || '')
    .trim()
    .toLowerCase();
  if (!raw) return 'en';
  if (raw === 'italian' || raw === 'italiano') return 'it';
  if (raw === 'english' || raw === 'inglese') return 'en';
  return raw.slice(0, 2);
}

/**
 * Locale → preferred catalogue language for native mode.
 * @param {'it'|'en'|string} [locale]
 * @returns {'it'|'en'}
 */
export function preferredCareLanguage(locale = 'en') {
  return locale === 'it' ? 'it' : 'en';
}

/**
 * Rank items (books, films, series, other media with energy/valence/tags)
 * against a mood using ISO logic + Cochrane outcome affinity:
 * 40% meet current state, 35% open toward target, 15% clinical tags,
 * 10% overlap with Cochrane outcomes (CD004517 / CD004025).
 *
 * Native language mode (`musicLanguageMode: 'native'`): filter-first on items
 * matching the UI locale language, then widen with a strong boost if too few.
 *
 * Care access mode (`careAccessMode: 'free'|'paid_ok'`): free-only filter-first
 * on Wikiflix / Open Library / free-tier items; paid-OK still soft-boosts free.
 *
 * Publication zone (`musicGeoZone`): same hard locality filter as music when
 * zone ≠ world; empty pools stay empty (no wrong-country fill-in).
 *
 * @param {object[]} items
 * @param {object} mood
 * @param {{
 *   count?: number,
 *   seed?: number,
 *   musicLanguageMode?: string,
 *   musicGeoZone?: string,
 *   uiLocale?: 'it'|'en',
 *   careAccessMode?: string,
 *   excludeIds?: string[],
 * }} [options]
 */
export function rankTherapeuticItems(items, mood, options = {}) {
  const count = options.count ?? 3;
  const seed = options.seed ?? 0;
  const mode = normalizeMusicLanguageMode(
    options.musicLanguageMode ?? MUSIC_LANGUAGE_DEFAULT,
  );
  const accessMode = normalizeCareAccessMode(
    options.careAccessMode ?? CARE_ACCESS_FREE,
  );
  const locale = options.uiLocale === 'it' ? 'it' : 'en';
  const preferNative = mode === MUSIC_LANGUAGE_NATIVE;
  const wanted = preferredCareLanguage(locale);
  const geoZone = normalizeMusicGeoZone(options.musicGeoZone ?? GEO_WORLD);
  const exclude = new Set(
    (Array.isArray(options.excludeIds) ? options.excludeIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );

  let pool = Array.isArray(items) ? items : [];
  if (exclude.size) {
    pool = pool.filter((it) => !exclude.has(String(it?.id || '')));
  }
  // Clinical content-safety gate (lib/care-safety.js): reviewed items only,
  // and no grief themes at very low mood or during a crisis.
  pool = pool.filter((it) => careItemAllowed(it, mood).ok);
  // Hard locality filter (same spirit as music): empty → empty.
  pool = filterCareItemsByGeoZone(pool, geoZone);
  if (!pool.length) return [];

  const e0 = clamp01(mood?.energy ?? 0.5);
  const v0 = clamp01(mood?.valence ?? 0.5);
  const e1 = clamp01(mood?.targetEnergy ?? e0);
  const v1 = clamp01(mood?.targetValence ?? v0);
  const tags = moodTags(mood);
  const cochrane = cochraneOutcomesFromMood(mood);

  const scored = pool.map((item, i) => {
    const tagHits = (item.tags || []).filter((t) => tags.includes(t)).length;
    const tagScore = tagHits ? Math.min(1, tagHits / Math.max(1, tags.length)) : 0;
    const cochraneScore = cochraneOutcomeAffinity(item.cochraneOutcomes, cochrane);
    let s =
      0.4 * proximity(item.energy, item.valence, e0, v0) +
      0.35 * proximity(item.energy, item.valence, e1, v1) +
      0.15 * tagScore +
      0.1 * cochraneScore;
    const jitter = Math.abs(Math.sin(seed + i * 12.9898)) * 0.03;
    s += jitter;
    return {
      item,
      score: s,
      lang: careItemLanguage(item),
      free: itemIsFreeAccess(item),
    };
  });

  const byScore = (a, b) => b.score - a.score;
  const take = (pool) => {
    pool.sort(byScore);
    return pool.slice(0, count).map((s) => s.item);
  };
  const boost = (pool, weight, affinityFn) => {
    for (const s of pool) {
      const affinity = affinityFn(s) ? 1 : 0;
      s.score = s.score * (1 - weight) + affinity * weight;
    }
  };

  // Free + native: prefer free∩native, then native (soft free), then free (soft native).
  // Avoids English-only Wikiflix/PD fills when the UI asks for Italian titles.
  if (accessMode === CARE_ACCESS_FREE && preferNative) {
    const freeNative = scored.filter((s) => s.free && s.lang === wanted);
    if (freeNative.length >= count) return take(freeNative);

    const nativeOnly = scored.filter((s) => s.lang === wanted);
    if (nativeOnly.length >= count) {
      boost(nativeOnly, FREE_ACCESS_SOFT_WEIGHT, (s) => s.free);
      return take(nativeOnly);
    }

    const freeOnly = scored.filter((s) => s.free);
    if (freeOnly.length >= count) {
      boost(freeOnly, NATIVE_CARE_LANGUAGE_WEIGHT, (s) => s.lang === wanted);
      return take(freeOnly);
    }

    boost(scored, FREE_ACCESS_STRICT_WEIGHT, (s) => s.free);
    boost(scored, NATIVE_CARE_LANGUAGE_WEIGHT, (s) => s.lang === wanted);
    return take(scored);
  }

  // Access preference: free-first (strict) or soft economical boost (paid OK)
  if (accessMode === CARE_ACCESS_FREE) {
    const freeOnly = scored.filter((s) => s.free);
    if (freeOnly.length >= count) return take(freeOnly);
    boost(scored, FREE_ACCESS_STRICT_WEIGHT, (s) => s.free);
  } else if (accessMode === CARE_ACCESS_PAID_OK) {
    boost(scored, FREE_ACCESS_SOFT_WEIGHT, (s) => s.free);
  }

  if (preferNative) {
    const matching = scored.filter((s) => s.lang === wanted);
    if (matching.length >= count) return take(matching);
    boost(scored, NATIVE_CARE_LANGUAGE_WEIGHT, (s) => s.lang === wanted);
  }

  return take(scored);
}

/**
 * @param {object} mood
 * @param {{
 *   count?: number,
 *   seed?: number,
 *   musicLanguageMode?: string,
 *   musicGeoZone?: string,
 *   uiLocale?: 'it'|'en',
 *   careAccessMode?: string,
 *   excludeIds?: string[],
 * }} [options]
 * @returns {object[]} top therapeutic books for this mood
 */
export function recommendBooks(mood, options = {}) {
  return rankTherapeuticItems(THERAPEUTIC_BOOKS, mood, options);
}
