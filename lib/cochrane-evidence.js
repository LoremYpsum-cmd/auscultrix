/**
 * Cochrane Library evidence registry — scientific backbone for Auscultrix media selection.
 *
 * Primary source: https://www.cochranelibrary.com
 *
 * Music therapy reviews (Aalbers 2017; Geretsegger 2017) report short-term benefits
 * for depressive symptoms, anxiety, mental state, social functioning and quality of
 * life when music experiences accompany care. Auscultrix is NOT clinical music therapy:
 * it translates those *outcome targets* into a local ISO (matching→shifting) catalogue
 * for receptive listening and allied care media (books, films, series, documentaries,
 * podcasts). Every recommended item declares which Cochrane outcome it serves.
 */

export const COCHRANE_LIBRARY_URL = 'https://www.cochranelibrary.com';

/** @typedef {'depression'|'anxiety'|'mental_state'|'social_functioning'|'quality_of_life'} CochraneOutcome */

/**
 * @type {Array<{
 *   id: string,
 *   cd: string,
 *   doi: string,
 *   title: string,
 *   citation: string,
 *   url: string,
 *   outcomes: CochraneOutcome[],
 *   summaryIt: string,
 *   summaryEn: string,
 * }>}
 */
export const COCHRANE_REVIEWS = [
  {
    id: 'cd004517',
    cd: 'CD004517',
    doi: '10.1002/14651858.CD004517.pub3',
    title: 'Music therapy for depression',
    citation:
      'Aalbers S et al. Music therapy for depression. Cochrane Database Syst Rev. 2017;(11):CD004517.',
    url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004517.pub3/full',
    outcomes: ['depression', 'anxiety', 'quality_of_life'],
    summaryIt:
      'Evidenza di qualità moderata: la musicoterapia aggiunta alle cure usuali riduce i sintomi depressivi e l’ansia nel breve termine.',
    summaryEn:
      'Moderate-quality evidence: music therapy added to usual care reduces depressive symptoms and anxiety in the short term.',
  },
  {
    id: 'cd004025',
    cd: 'CD004025',
    doi: '10.1002/14651858.CD004025.pub4',
    title: 'Music therapy for people with schizophrenia and schizophrenia-like disorders',
    citation:
      'Geretsegger M et al. Music therapy for people with schizophrenia and schizophrenia-like disorders. Cochrane Database Syst Rev. 2017;(5):CD004025.',
    url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004025.pub4/full',
    outcomes: ['mental_state', 'social_functioning', 'quality_of_life', 'depression', 'anxiety'],
    summaryIt:
      'Come add-on alle cure standard può migliorare stato globale, sintomi negativi, funzionamento sociale e qualità di vita (evidenza bassa–moderata; dose e qualità contano).',
    summaryEn:
      'As an add-on to standard care it may improve global state, negative symptoms, social functioning and quality of life (low–moderate evidence; dose and quality matter).',
  },
];

/** Map mood signals → Cochrane outcomes the catalogue should serve. */
export function cochraneOutcomesFromMood(mood) {
  /** @type {CochraneOutcome[]} */
  const out = [];
  if ((mood?.sadness ?? 0) >= 0.55 || mood?.isLowMotivation) out.push('depression');
  if ((mood?.anxiety ?? 0) >= 0.55 || (mood?.stress ?? 0) >= 0.65) out.push('anxiety');
  if ((mood?.energy ?? 0.5) <= 0.35) out.push('mental_state');
  if ((mood?.relaxation ?? 0) >= 0.65 || (mood?.happiness ?? 0) >= 0.65) {
    out.push('quality_of_life');
  }
  if ((mood?.motivation ?? 0.5) >= 0.6) out.push('social_functioning');
  if (!out.length) out.push('quality_of_life', 'mental_state');
  return [...new Set(out)];
}

/**
 * Boost for catalogue items whose declared Cochrane outcomes overlap the mood.
 * Pure: used by rankTherapeuticItems.
 */
export function cochraneOutcomeAffinity(itemOutcomes, moodOutcomes) {
  if (!itemOutcomes?.length || !moodOutcomes?.length) return 0;
  const hits = itemOutcomes.filter((o) => moodOutcomes.includes(o)).length;
  return Math.min(1, hits / Math.max(1, moodOutcomes.length));
}

export function cochraneReviewById(id) {
  return COCHRANE_REVIEWS.find((r) => r.id === id || r.cd === id) || null;
}

/** Short UI line pointing to the Cochrane Library. */
export function cochraneAttribution(locale = 'it') {
  if (locale === 'en') {
    return 'Selection outcomes follow Cochrane music-therapy reviews (CD004517, CD004025) — open library.';
  }
  return 'Gli esiti della selezione seguono le review Cochrane di musicoterapia (CD004517, CD004025) — apri la library.';
}
