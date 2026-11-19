/**
 * Safety layer — runs before any recommendation, on-device, nothing stored.
 *
 * Two signals:
 *  - 'crisis'    words about ending one's life or self-harm → the panel shows
 *                help first (Telefono Amico, 112, IASP directory). Media are
 *                still offered underneath: the person is never blocked.
 *  - 'substance' words about drugs or getting high → a gentle note and the
 *                ISS national addiction line (800 94 07 89, free, anonymous).
 *
 * Deliberately simple, high-recall phrase lists: a false alarm costs a card,
 * a miss costs much more. The text itself is never logged or recorded.
 */

import { normalize } from './mood.js';

const CRISIS = [
  'voglio morire', 'vorrei morire', 'voglio morir', 'farla finita', 'finirla qui', 'togliermi la vita',
  'uccidermi', 'ammazzarmi', 'suicid', 'non voglio piu vivere', 'non voglio vivere', 'meglio se non ci fossi',
  'sparire per sempre', 'autolesion', 'tagliarmi', 'mi taglio', 'farmi del male', 'mi faccio del male',
  'want to die', 'wanna die', 'kill myself', 'end my life', 'end it all', 'take my life', 'suicide',
  'self harm', 'selfharm', 'hurt myself', 'cut myself', 'better off dead', 'no reason to live', 'dont want to live',
  'do not want to live', 'not want to be alive',
];

const SUBSTANCE = [
  'drog', 'sballar', 'sballo', 'farmi una canna', 'canna', 'cocaina', 'eroina', 'ketamina', 'keta',
  'mdma', 'ecstasy', 'pasticc', 'lsd', 'crack', 'fentanyl', 'oppio', 'psicofarmac', 'ubriacarmi', 'ubriac',
  'get high', 'getting high', 'drugs', 'cocaine', 'heroin', 'ketamine', 'pills', 'weed', 'smoke a joint', 'get drunk',
];

/**
 * @param {string} text
 * @returns {{ level: 'none'|'substance'|'crisis', matched: boolean }}
 */
/**
 * Everyday words that contain a substance stem but are not about drugs
 * («drogheria» = grocery, «cannella» = cinnamon…). Removed before matching so
 * the help card is not shown for a grocery list. Recall on real mentions is
 * unaffected (tests/unit/safety.test.mjs).
 */
const SUBSTANCE_FALSE_FRIENDS = [
  /\bdrogheri\w*/g, // drogheria, droghiere
  /\bcanna da pesca\b/g,
  /\bcanna fumaria\b/g,
  /\bcanne? d'organo\b/g,
  /\bcrack(?:ed|ing|s)? (?:the|a|an|my|your|open|down)\b/g, // "crack a joke", "cracked my phone"
  /\bcrack(?:ed|ing)\b/g,
];

export function assessSafety(text) {
  const n = ` ${normalize(text).replace(/\s+/g, ' ')} `;
  const squash = n.replace(/\s+/g, ' ');
  if (CRISIS.some((p) => squash.includes(p))) return { level: 'crisis', matched: true };
  let forSubstance = squash;
  for (const re of SUBSTANCE_FALSE_FRIENDS) forSubstance = forSubstance.replace(re, ' ');
  if (SUBSTANCE.some((p) => forSubstance.includes(p.startsWith(' ') || p.endsWith(' ') ? p : ` ${p}`))) {
    return { level: 'substance', matched: true };
  }
  return { level: 'none', matched: false };
}

export const SUPPORT = {
  telefonoAmico: { label: 'Telefono Amico', tel: '+390223272327', display: '02 2327 2327' },
  emergency: { label: 'Emergenze', labelKey: 'supportEmergencyLabel', tel: '112', display: '112' },
  addictionIT: { label: 'Numero Verde Dipendenze (ISS)', labelKey: 'safetyAddictionLabel', tel: '800940789', display: '800 94 07 89' },
  iasp: { href: 'https://www.iasp.info/suicidalthoughts/' },
};
