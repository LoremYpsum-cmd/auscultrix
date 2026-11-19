/**
 * Extract 16-shade VJ palette from cover art / thumbnails.
 * Design: 8 base tones quantized from the image + 8 complementary hues (+180°).
 */

/** 8 base tones — sabbia / indaco / ocra (luce mediterranea, sobria) */
export const FALLBACK_BASE = [
  '#1e2a3a',
  '#2a3d5c',
  '#3d4f6a',
  '#5a6570',
  '#8a7a5a',
  '#b8893a',
  '#d4b87a',
  '#ebe4d4',
];

const cache = new Map();

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '');
  // Expand short form (#abc → #aabbcc) instead of returning black.
  if (h.length === 3 || h.length === 4) {
    h = [...h].map((c) => c + c).join('');
  }
  if (h.length < 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
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

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function complementaryHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const lift = l < 0.12 ? 0.18 : l > 0.85 ? 0.72 : l;
  const sat = s < 0.15 ? Math.min(0.55, s + 0.35) : s;
  return rgbToHex(hslToRgb((h + 0.5) % 1, sat, lift));
}

/**
 * Exactly 16 shades: 8 base + 8 complements (closed set for washes + pulses).
 * @param {string[]} rawColors
 * @returns {string[]}
 */
export function buildSixteenShadePalette(rawColors) {
  const base = [];
  const seen = new Set();
  for (const c of rawColors || []) {
    if (!c || typeof c !== 'string') continue;
    const hex = c.startsWith('#') ? c.toLowerCase() : `#${c}`.toLowerCase();
    if (hex.length < 7 || seen.has(hex)) continue;
    seen.add(hex);
    base.push(hex);
    if (base.length >= 8) break;
  }
  while (base.length < 8) {
    const fb = FALLBACK_BASE[base.length % FALLBACK_BASE.length];
    if (!seen.has(fb)) {
      seen.add(fb);
      base.push(fb);
    } else {
      base.push(FALLBACK_BASE[(base.length + 3) % FALLBACK_BASE.length]);
    }
  }
  return [...base, ...base.map(complementaryHex)];
}

/** Full 16-shade fallback (8 base + 8 complements) */
export const FALLBACK_COLORS = buildSixteenShadePalette(FALLBACK_BASE);

function quantizeRgba(rgba, count = 8) {
  if (!rgba || rgba.length === 0 || count <= 0) {
    return buildSixteenShadePalette(FALLBACK_BASE);
  }

  const buckets = new Map();
  const accumulate = (filterLum) => {
    for (let i = 0; i + 3 < rgba.length; i += 4) {
      if (rgba[i + 3] < 128) continue;
      const r = rgba[i] >> 4;
      const g = rgba[i + 1] >> 4;
      const b = rgba[i + 2] >> 4;
      if (filterLum) {
        const lum = r + g + b;
        if (lum < 2 || lum > 44) continue;
      }
      const key = (r << 8) | (g << 4) | b;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  };

  accumulate(true);
  if (buckets.size === 0) accumulate(false);
  if (buckets.size === 0) return buildSixteenShadePalette(FALLBACK_BASE);

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const colors = [];
  for (const [key] of sorted) {
    if (colors.length >= count) break;
    const r = ((key >> 8) & 0xf) * 17;
    const g = ((key >> 4) & 0xf) * 17;
    const b = (key & 0xf) * 17;
    colors.push(
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
    );
  }
  while (colors.length < count) {
    colors.push(FALLBACK_BASE[colors.length % FALLBACK_BASE.length]);
  }
  return buildSixteenShadePalette(colors);
}

async function loadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * @param {string} imageUrl
 * @returns {Promise<string[]>} 16 hex shades (8 base + 8 complements)
 */
export async function extractColorsFromImageUrl(imageUrl) {
  if (!imageUrl) return buildSixteenShadePalette(FALLBACK_BASE);
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  try {
    const bitmap = await loadImage(imageUrl);
    const canvas = new OffscreenCanvas(80, 80);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, 80, 80);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, 80, 80);
    const colors = quantizeRgba(imageData.data, 8);
    cache.set(imageUrl, colors);
    return colors;
  } catch {
    return buildSixteenShadePalette(FALLBACK_BASE);
  }
}

/**
 * @param {string} videoId
 * @returns {Promise<string[]>} 16 hex shades (8 base + 8 complements)
 */
export async function extractColorsFromVideoId(videoId) {
  if (!videoId) return buildSixteenShadePalette(FALLBACK_BASE);
  if (cache.has(`yt:${videoId}`)) return cache.get(`yt:${videoId}`);

  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
  ];

  for (const url of candidates) {
    try {
      const bitmap = await loadImage(url);
      const canvas = new OffscreenCanvas(80, 45);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, 80, 45);
      bitmap.close();
      const imageData = ctx.getImageData(0, 0, 80, 45);
      const colors = quantizeRgba(imageData.data, 8);
      cache.set(url, colors);
      cache.set(`yt:${videoId}`, colors);
      return colors;
    } catch {
      // try next
    }
  }

  return buildSixteenShadePalette(FALLBACK_BASE);
}
