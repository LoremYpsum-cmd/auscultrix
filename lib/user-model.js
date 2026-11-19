/**
 * Local user model — privacy-preserving, on-device data collection.
 *
 * Auscultrix keeps a small history of declared moods and sessions so it can
 * understand the person over time (recurring states, usual energy, what was
 * chosen). Lawful-by-design under GDPR:
 *  - storage limitation: capped history (last N entries), oldest dropped;
 *  - data minimization: only energy, valence, ISO target and chosen activity —
 *    never free text, images, voice transcripts or symptom-like scores;
 *  - locality: chrome.storage.local only; Auscultrix has no servers, nothing
 *    is transmitted, sold or shared;
 *  - user control: full erase with one action (see clearUserModel).
 */

const KEY = 'userModelV1';
const MAX_ENTRIES = 60;

/** @returns {Promise<{entries: object[], stats: object}>} */
export async function loadUserModel() {
  const data = await chrome.storage.local.get([KEY]);
  const model = data[KEY];
  if (model && Array.isArray(model.entries)) {
    // Entries written by ≤ 5.0 carried anxiety/sadness/happiness: drop them
    // (they are rewritten without those fields at the next save).
    model.entries = model.entries.map(({ anxiety, sadness, happiness, ...rest }) => rest);
    if (model.stats) {
      delete model.stats.avgAnxiety;
      delete model.stats.avgSadness;
    }
    return model;
  }
  return { entries: [], stats: {} };
}

/**
 * Record a mood/session event. Only scalar mood dimensions are kept:
 * no free text, no image, no transcript (data minimization).
 * @param {object} mood analyzeMoodHeuristic output
 * @param {{ activity?: 'music'|'soundscape'|'book'|'film'|'series'|'other' }} [meta]
 */
/**
 * Writes are queued: two quick actions (e.g. «Inizia» then «Scegli per me»)
 * used to read the same model and overwrite each other's entry.
 */
let writeQueue = Promise.resolve();

export function recordMoodEntry(mood, meta = {}) {
  const run = writeQueue.then(() => recordMoodEntryNow(mood, meta));
  writeQueue = run.catch(() => {});
  return run;
}

async function recordMoodEntryNow(mood, meta) {
  if (!mood || typeof mood !== 'object') return;
  const model = await loadUserModel();
  model.entries.push({
    at: Date.now(),
    energy: round2(mood.energy),
    valence: round2(mood.valence),
    targetEnergy: round2(mood.targetEnergy),
    targetValence: round2(mood.targetValence),
    // 5.1: no anxiety/sadness/happiness scores on disk. They were never used by
    // the prior and a history of «anxiety» values reads like symptom monitoring,
    // which is neither needed (GDPR art. 5(1)(c)) nor within the wellbeing purpose.
    activity: meta.activity || 'music',
  });
  if (model.entries.length > MAX_ENTRIES) {
    model.entries = model.entries.slice(-MAX_ENTRIES);
  }
  model.stats = computeStats(model.entries);
  await chrome.storage.local.set({ [KEY]: model });
}

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Aggregates used by the personalization prior and the data panel. */
function computeStats(entries) {
  if (!entries.length) return {};
  const avg = (k) => {
    const vals = entries.map((e) => e[k]).filter((v) => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const counts = { music: 0, soundscape: 0, book: 0, film: 0, series: 0, other: 0 };
  for (const e of entries) counts[e.activity] = (counts[e.activity] || 0) + 1;
  return {
    sessions: entries.length,
    avgEnergy: round2(avg('energy')),
    avgValence: round2(avg('valence')),
    activityCounts: counts,
    lastAt: entries[entries.length - 1].at,
  };
}

/**
 * Personalization prior from local history: a gentle pull (max ±0.08) of the
 * declared starting point toward the person's recurring state, and activity
 * hints for «Choose for me». Purely local; empty history → neutral prior.
 * @param {object} mood analyzeMoodHeuristic output (mutated copy returned)
 * @returns {Promise<object>} mood adjusted with prior
 */
export async function applyUserPrior(mood) {
  const { entries, stats } = await loadUserModel();
  if (!entries.length || entries.length < 3 || !mood) return mood;
  const adjusted = { ...mood };
  const w = Math.min(0.16, 0.02 * entries.length); // caps at ±0.08 pull
  if (stats.avgEnergy != null && adjusted.energy != null) {
    adjusted.energy = clamp01(adjusted.energy + (stats.avgEnergy - adjusted.energy) * (w / 2));
  }
  if (stats.avgValence != null && adjusted.valence != null) {
    adjusted.valence = clamp01(adjusted.valence + (stats.avgValence - adjusted.valence) * (w / 2));
  }
  adjusted.userPrior = {
    sessions: stats.sessions,
    avgEnergy: stats.avgEnergy,
    avgValence: stats.avgValence,
    activityCounts: stats.activityCounts,
  };
  return adjusted;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Full erase — GDPR right to erasure, one action.
 */
export async function clearUserModel() {
  // Wait for pending writes so an erase cannot be undone by a late write.
  await writeQueue.catch(() => {});
  await chrome.storage.local.remove([KEY]);
}

/**
 * Human-readable summary of what is stored locally, for the «Your data»
 * panel (transparency: the person can see exactly what the model knows).
 * @param {'it'|'en'} locale
 * @returns {Promise<string>}
 */
export async function userModelSummary(locale = 'it') {
  const { entries, stats } = await loadUserModel();
  if (!entries.length) {
    return locale === 'it'
      ? 'Nessun dato ancora raccolto.'
      : 'No data collected yet.';
  }
  const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  if (locale === 'it') {
    const sess = stats.sessions === 1 ? '1 sessione ricordata' : `${stats.sessions} sessioni ricordate`;
    return (
      `${sess} (max ${MAX_ENTRIES}). ` +
      `Energia media ${pct(stats.avgEnergy)}, umore medio ${pct(stats.avgValence)}. ` +
      `Attività: ${stats.activityCounts.music || 0} musica, ${stats.activityCounts.soundscape || 0} paesaggi sonori, ${stats.activityCounts.book || 0} libri, ${stats.activityCounts.film || 0} film, ${stats.activityCounts.series || 0} serie, ${stats.activityCounts.other || 0} altri media.`
    );
  }
  const sessEn = stats.sessions === 1 ? '1 session remembered' : `${stats.sessions} sessions remembered`;
  return (
    `${sessEn} (max ${MAX_ENTRIES}). ` +
    `Average energy ${pct(stats.avgEnergy)}, average mood ${pct(stats.avgValence)}. ` +
    `Activities: ${stats.activityCounts.music || 0} music, ${stats.activityCounts.soundscape || 0} soundscapes, ${stats.activityCounts.book || 0} books, ${stats.activityCounts.film || 0} films, ${stats.activityCounts.series || 0} series, ${stats.activityCounts.other || 0} other media.`
  );
}
