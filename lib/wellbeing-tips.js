/**
 * Local heuristic wellbeing guidance for music-therapy sessions.
 * Strings via chrome.i18n (en default, it for Italian UI).
 */

import { t } from './i18n.js';

/** Presence (always on) — few calm lines, not a caption wall. */
const BASELINE_TIP_IDS = ['breath', 'pause', 'journal'];

/** @deprecated Static session guide — replaced by mood PiP after Inizia. */
const SESSION_GUIDE_TIP_IDS = ['gentle_lift', 'soft_focus'];

function tipFromId(id) {
  return {
    id,
    title: t(`tip_${id}_title`) || id,
    body: t(`tip_${id}_body`) || '',
  };
}

/** Baseline / Presence tips resolved for the current UI locale. */
export function baselineTips() {
  return BASELINE_TIP_IDS.map(tipFromId);
}

/** @deprecated Prefer sessionMoodGuideTips(mood) after Inizia. */
export function sessionGuideTips() {
  return SESSION_GUIDE_TIP_IDS.map(tipFromId);
}

/** @deprecated Prefer baselineTips() — kept for callers that expect a constant array shape. */
export const BASELINE_TIPS = BASELINE_TIP_IDS.map((id) => ({ id, title: id, body: id }));

/**
 * Classify mood into a session-guidance archetype (local heuristics only).
 * @param {object|null} mood
 * @returns {'great'|'sad'|'anxious'|'tired'|'motivated'|'relaxed'|'balanced'}
 */
export function classifySessionMood(mood) {
  if (!mood) return 'balanced';

  const energy = Number(mood.energy) || 0.5;
  const anxiety = Number(mood.anxiety) || 0;
  const sadness = Number(mood.sadness) || 0;
  const stress = Number(mood.stress) || 0;
  const happiness = Number(mood.happiness) || 0;
  const emotion = String(mood.emotion || '').toLowerCase();
  const raw = String(mood.rawInput || '').toLowerCase();
  const secondary = (mood.secondaryEmotions || []).map((s) => String(s).toLowerCase());
  const isLow = !!mood.isLowMotivation;
  const isHigh = !!mood.isHighMotivation;
  const has = (re) => re.test(raw);

  if (
    anxiety >= 0.45 ||
    stress >= 0.5 ||
    emotion === 'anxiety' ||
    secondary.includes('tension') ||
    has(/ansios|anxi|ansia|stress|preoccup/)
  ) {
    return 'anxious';
  }

  if (
    sadness >= 0.45 ||
    emotion === 'sadness' ||
    secondary.includes('melancholy') ||
    has(/gi[uù]|triste|sad|down|malincon/)
  ) {
    return 'sad';
  }

  // Relaxed before tired: wantsRelaxation forces energy ~0.25 in mood.js.
  // Require calm cues — low energy alone also raises mood.relaxation.
  if (secondary.includes('calm') || has(/rilass|relax|calm|seren|tranquill/)) {
    return 'relaxed';
  }

  if (
    secondary.includes('apathy') ||
    has(/stanco|tired|esaust|demotiv|apat|sonn|sleepy/) ||
    (isLow && energy < 0.35) ||
    (energy < 0.3 && sadness < 0.4 && anxiety < 0.4)
  ) {
    return 'tired';
  }

  if (
    secondary.includes('euphoria') ||
    has(/alla grande|feeling great|fantastic|eufor|radios|sul tetto|over the moon/) ||
    (happiness >= 0.9 && energy >= 0.85)
  ) {
    return 'great';
  }

  if (
    secondary.includes('drive') ||
    has(/motivat|determin|caric|energic|pumped|driven|focused/) ||
    (isHigh && energy >= 0.65 && happiness < 0.9)
  ) {
    return 'motivated';
  }

  if (
    emotion === 'happiness' ||
    secondary.includes('joy') ||
    (energy >= 0.75 && happiness >= 0.7)
  ) {
    return 'great';
  }

  if (isLow && energy < 0.4) return 'tired';

  return 'balanced';
}

/**
 * Two short «Per questa sessione» lines tailored to how the person feels.
 * Pure local heuristics — no server.
 * @param {object|null} mood — result of analyzeMoodHeuristic
 * @returns {{ id: string, title: string, body: string }[]}
 */
export function sessionMoodGuideTips(mood) {
  const kind = classifySessionMood(mood);
  return [tipFromId(`session_${kind}_pace`), tipFromId(`session_${kind}_focus`)];
}

/**
 * Direction-aligned suggestions from mood / musicTherapyDirection (local heuristic).
 * @param {object|null} mood — result of analyzeMoodHeuristic
 * @returns {{ id: string, title: string, body: string }[]}
 */
export function sessionWellbeingTips(mood) {
  if (!mood) return [];

  const tips = [];
  const stress = Number(mood.stress) || 0;
  const energy = Number(mood.energy) || 0.5;
  const anxiety = Number(mood.anxiety) || 0;
  const sadness = Number(mood.sadness) || 0;
  const relaxation = Number(mood.relaxation) || 0;
  const concentration = Number(mood.concentration) || 0;
  const isLow = !!mood.isLowMotivation;
  const isHigh = !!mood.isHighMotivation;
  const emotion = String(mood.emotion || '').toLowerCase();
  const direction = String(mood.musicTherapyDirection || '').toLowerCase();

  if (anxiety >= 0.5 || stress >= 0.55 || emotion === 'anxiety') {
    tips.push(tipFromId('calm_pace'));
  }

  if (sadness >= 0.5 || emotion === 'sadness') {
    tips.push(tipFromId('gentle_presence'));
  }

  if (
    isLow ||
    /alta energia|elevare motivazione|energizz|high-energy|high energy|raise motivation|energiz/.test(
      direction,
    )
  ) {
    tips.push(tipFromId('gentle_lift'));
  }

  if (
    isHigh ||
    /mantenere resilienza|momentum|energici coerenti|maintain resilience|energetic tracks/.test(
      direction,
    )
  ) {
    tips.push(tipFromId('sustain'));
  }

  if (relaxation >= 0.7 || /rilass|calm|mix bilanciato|relax|balanced mix/.test(direction)) {
    tips.push(tipFromId('soft_focus'));
  }

  if (concentration >= 0.7) {
    tips.push(tipFromId('focus_window'));
  }

  if (energy < 0.35 && !isLow) {
    tips.push(tipFromId('low_energy'));
  }

  if (!tips.length) {
    tips.push(tipFromId('balanced'));
  }

  return tips.slice(0, 3);
}
