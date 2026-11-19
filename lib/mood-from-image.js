/**
 * Local-first mood cues from an uploaded image (dominant color / brightness).
 * No network — canvas sampling only. Maps to keyword phrases for analyzeMoodHeuristic.
 */

const MAX_EDGE = 512;
const SAMPLE = 64;

/**
 * Resize + JPEG-compress a File/Blob to a data URL (max edge 512px).
 * @param {Blob|File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function compressImageToDataUrl(file, opts = {}) {
  const maxEdge = opts.maxEdge ?? MAX_EDGE;
  const quality = opts.quality ?? 0.72;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

/**
 * Sample average HSL + warmth from a data URL.
 * @param {string} dataUrl
 * @returns {Promise<{ avgH: number, avgS: number, avgL: number, warmth: number, contrast: number }>}
 */
async function sampleImageStats(dataUrl) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

  let sumH = 0;
  let sumS = 0;
  let sumL = 0;
  let sumWarm = 0;
  let n = 0;
  const luminances = [];

  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const { h, s, l } = rgbToHsl(r, g, b);
    sumH += h;
    sumS += s;
    sumL += l;
    // Warmth: red/yellow vs blue/cyan (simple chromatic bias)
    sumWarm += (r - b) / 255;
    luminances.push(l);
    n += 1;
  }

  if (!n) {
    return { avgH: 0, avgS: 0, avgL: 0.5, warmth: 0, contrast: 0.2 };
  }

  luminances.sort((a, b) => a - b);
  const p10 = luminances[Math.floor(luminances.length * 0.1)] ?? 0;
  const p90 = luminances[Math.floor(luminances.length * 0.9)] ?? 1;

  return {
    avgH: sumH / n,
    avgS: sumS / n,
    avgL: sumL / n,
    warmth: sumWarm / n,
    contrast: Math.max(0, p90 - p10),
  };
}

/**
 * Map image stats → mood keyword phrase + suggested energy (0–1).
 * Locale drives the description language; heuristic keywords stay bilingual-friendly.
 * @param {string} dataUrl
 * @param {{ caption?: string, locale?: 'it'|'en' }} [opts]
 * @returns {Promise<{ description: string, moodPhrase: string, suggestedEnergy: number, cues: string[] }>}
 */
export async function inferMoodFromImage(dataUrl, opts = {}) {
  const locale = opts.locale === 'en' ? 'en' : 'it';
  const caption = String(opts.caption || '').trim();
  const stats = await sampleImageStats(dataUrl);
  const { avgH: h, avgS: s, avgL: l, warmth, contrast } = stats;

  const cues = [];
  let moodPhrase = '';
  let suggestedEnergy = 0.5;
  let descKey = 'neutral';

  const cool = warmth < -0.08 || (h > 0.45 && h < 0.72);
  const warm = warmth > 0.12 || h < 0.12 || h > 0.92;
  const dark = l < 0.32;
  const bright = l > 0.62;
  const muted = s < 0.22;
  const vivid = s > 0.45;
  const tenseHue = (h > 0.02 && h < 0.08) || (h > 0.9 && vivid); // reds

  if (dark && cool && muted) {
    descKey = 'melancholy';
    moodPhrase = 'triste malinconico low mood';
    suggestedEnergy = 0.28;
    cues.push('dark', 'cool', 'muted');
  } else if (dark && vivid && tenseHue) {
    descKey = 'tense';
    moodPhrase = 'ansioso stress agitato tensione';
    suggestedEnergy = 0.55;
    cues.push('dark', 'vivid', 'red');
  } else if (bright && warm && vivid) {
    descKey = 'joyful';
    moodPhrase = 'felice gioioso contento allegria';
    suggestedEnergy = 0.78;
    cues.push('bright', 'warm', 'vivid');
  } else if (bright && cool && !vivid) {
    descKey = 'calm';
    moodPhrase = 'rilassato calmo sereno pace';
    suggestedEnergy = 0.32;
    cues.push('bright', 'cool');
  } else if (muted && l > 0.35 && l < 0.55 && contrast < 0.25) {
    descKey = 'tired';
    moodPhrase = 'stanco demotivato apatia no energia';
    suggestedEnergy = 0.22;
    cues.push('muted', 'flat');
  } else if (warm && vivid && !dark) {
    descKey = 'energized';
    moodPhrase = 'motivato energia carico determinato';
    suggestedEnergy = 0.82;
    cues.push('warm', 'vivid');
  } else if (cool && vivid && !dark) {
    descKey = 'focused';
    moodPhrase = 'concentrato focus studio calma';
    suggestedEnergy = 0.48;
    cues.push('cool', 'vivid');
  } else if (dark) {
    descKey = 'introspective';
    moodPhrase = 'malinconico riflessivo triste';
    suggestedEnergy = 0.35;
    cues.push('dark');
  } else if (warm) {
    descKey = 'gentle';
    moodPhrase = 'sereno contento rilassato';
    suggestedEnergy = 0.55;
    cues.push('warm');
  } else {
    descKey = 'neutral';
    moodPhrase = 'neutro equilibrato';
    suggestedEnergy = 0.5;
    cues.push('balanced');
  }

  if (contrast > 0.55 && descKey === 'neutral') {
    moodPhrase = 'ansioso stress tensione';
    suggestedEnergy = 0.52;
    descKey = 'tense';
    cues.push('high-contrast');
  }

  const descriptions = {
    it: {
      melancholy: 'L’immagine suggerisce un tono malinconico, freddo e raccolto.',
      tense: 'L’immagine suggerisce tensione o agitazione — colori intensi e scuri.',
      joyful: 'L’immagine suggerisce leggerezza e gioia — luce calda e vivace.',
      calm: 'L’immagine suggerisce calma e serenità — luce fresca e soft.',
      tired: 'L’immagine suggerisce stanchezza o apatia — toni piatti e spenti.',
      energized: 'L’immagine suggerisce energia e spinta — colori caldi e saturi.',
      focused: 'L’immagine suggerisce concentrazione — freddo e nitido.',
      introspective: 'L’immagine suggerisce un momento introspettivo, più scuro.',
      gentle: 'L’immagine suggerisce un tono gentile e abbastanza sereno.',
      neutral: 'L’immagine suggerisce un umore equilibrato, senza picchi forti.',
    },
    en: {
      melancholy: 'The image suggests a melancholic, cool, inward tone.',
      tense: 'The image suggests tension or agitation — intense, darker colors.',
      joyful: 'The image suggests lightness and joy — warm, vivid light.',
      calm: 'The image suggests calm and serenity — cool, soft light.',
      tired: 'The image suggests tiredness or flatness — muted, low-contrast tones.',
      energized: 'The image suggests drive and energy — warm, saturated colors.',
      focused: 'The image suggests focus — cool and clear.',
      introspective: 'The image suggests an introspective, darker moment.',
      gentle: 'The image suggests a gentle, fairly serene tone.',
      neutral: 'The image suggests a balanced mood without strong peaks.',
    },
  };

  let description = descriptions[locale][descKey] || descriptions[locale].neutral;
  if (caption) {
    description =
      locale === 'en'
        ? `${description} Caption: «${caption}».`
        : `${description} Didascalia: «${caption}».`;
    moodPhrase = `${moodPhrase} ${caption}`;
  }

  return {
    description,
    moodPhrase: moodPhrase.trim(),
    suggestedEnergy,
    cues,
  };
}
