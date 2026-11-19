/**
 * Read-aloud stays on the device (thesis RNF1, §11.1).
 *
 * Chrome lists two kinds of voices: the system's own (localService === true)
 * and network voices such as «Google italiano» (localService === false), for
 * which the text is sent to an online speech service. The text read aloud is
 * the mood reading, so only on-device voices are ever used. With no local
 * voice for the language, nothing is read and the panel says why.
 */

/**
 * @param {Array<{ lang?: string, localService?: boolean }>} voices
 * @param {string} lang BCP-47 tag, e.g. 'it-IT'
 * @returns {object|null} the first on-device voice for the language, or null
 */
export function pickLocalVoice(voices, lang) {
  const wanted = String(lang || '').toLowerCase().slice(0, 2);
  if (!wanted || !Array.isArray(voices)) return null;
  return (
    voices.find(
      (v) => v && v.localService === true && String(v.lang || '').toLowerCase().replace('_', '-').startsWith(wanted),
    ) || null
  );
}

/**
 * Chrome fills the voice list asynchronously: wait briefly for it.
 * @param {{ getVoices?: () => any[], addEventListener?: Function, removeEventListener?: Function }} synth
 * @param {number} [timeoutMs]
 * @returns {Promise<any[]>}
 */
export function loadVoices(synth, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!synth || typeof synth.getVoices !== 'function') {
      resolve([]);
      return;
    }
    const now = synth.getVoices() || [];
    if (now.length) {
      resolve(now);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        synth.removeEventListener?.('voiceschanged', finish);
      } catch {
        // ignore
      }
      resolve(synth.getVoices() || []);
    };
    try {
      synth.addEventListener?.('voiceschanged', finish);
    } catch {
      // ignore
    }
    setTimeout(finish, timeoutMs);
  });
}
