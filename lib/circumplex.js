/**
 * The valence–arousal plane (Russell, 1980) drawn as an accessible SVG.
 * Used by the soundscape (live ISO path) and by the diary map (past sessions).
 *
 * Accessibility: the SVG has role="img" with a <title> and <desc> that say in
 * words what the picture shows; the diary also offers the same numbers as a
 * table. Colours come from CSS custom properties, so light, dark and forced
 * colours work. The figure never animates by itself.
 */
const NS = 'http://www.w3.org/2000/svg';
export const MAP_SIZE = 240;
const PAD = 26;

/** Plane → SVG coordinates: valence on x (left → right), arousal on y (bottom → top). */
export function toXY(valence, arousal, size = MAP_SIZE, pad = PAD) {
  const v = Math.min(1, Math.max(0, Number(valence) || 0));
  const a = Math.min(1, Math.max(0, Number(arousal) || 0));
  const w = size - 2 * pad;
  return { x: pad + v * w, y: pad + (1 - a) * w };
}

/** Quadrant of a point, with the same thresholds used everywhere in the docs. */
export function quadrantOf(valence, arousal) {
  if (valence >= 0.5) return arousal >= 0.5 ? 'pos-high' : 'pos-low';
  return arousal >= 0.5 ? 'neg-high' : 'neg-low';
}

/** Summary of diary entries: n, centroid of declared states, mean ISO displacement. */
export function summarizeEntries(entries) {
  const pts = (entries || []).filter((e) => Number.isFinite(e?.valence) && Number.isFinite(e?.energy));
  if (!pts.length) return { n: 0 };
  const mean = (f) => pts.reduce((s, e) => s + f(e), 0) / pts.length;
  const withTarget = pts.filter((e) => Number.isFinite(e.targetValence) && Number.isFinite(e.targetEnergy));
  const shift = withTarget.length
    ? withTarget.reduce((s, e) => s + Math.hypot(e.targetValence - e.valence, e.targetEnergy - e.energy), 0) / withTarget.length
    : null;
  const quadrants = { 'pos-high': 0, 'pos-low': 0, 'neg-high': 0, 'neg-low': 0 };
  for (const e of pts) quadrants[quadrantOf(e.valence, e.energy)]++;
  return {
    n: pts.length,
    valence: Math.round(mean((e) => e.valence) * 100) / 100,
    arousal: Math.round(mean((e) => e.energy) * 100) / 100,
    meanShift: shift == null ? null : Math.round(shift * 100) / 100,
    quadrants,
  };
}

function el(name, attrs = {}, text) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text != null) n.textContent = text;
  return n;
}

/**
 * Base plane with axes and labels.
 * @param {{ title: string, desc: string, labels: { valence: string, arousal: string,
 *          q: Record<string,string> } }} o
 */
export function drawPlane(o) {
  const s = MAP_SIZE;
  const svg = el('svg', { viewBox: `0 0 ${s} ${s}`, role: 'img', class: 'circumplex', 'aria-labelledby': '', focusable: 'false' });
  const uid = `cx${Math.random().toString(36).slice(2, 8)}`;
  const title = el('title', { id: `${uid}-t` }, o.title);
  const desc = el('desc', { id: `${uid}-d` }, o.desc);
  svg.setAttribute('aria-labelledby', `${uid}-t ${uid}-d`);
  svg.append(title, desc);
  const w = s - 2 * PAD;
  svg.append(el('rect', { x: PAD, y: PAD, width: w, height: w, rx: 10, class: 'cx-field' }));
  svg.append(el('line', { x1: PAD, y1: s / 2, x2: s - PAD, y2: s / 2, class: 'cx-axis' }));
  svg.append(el('line', { x1: s / 2, y1: PAD, x2: s / 2, y2: s - PAD, class: 'cx-axis' }));
  svg.append(el('text', { x: s - PAD, y: s - 8, 'text-anchor': 'end', class: 'cx-label' }, `${o.labels.valence} →`));
  svg.append(el('text', { x: 8, y: PAD - 9, class: 'cx-label' }, `↑ ${o.labels.arousal}`));
  const q = o.labels.q || {};
  const qPos = { 'neg-high': [PAD + 6, PAD + 16, 'start'], 'pos-high': [s - PAD - 6, PAD + 16, 'end'], 'neg-low': [PAD + 6, s - PAD - 8, 'start'], 'pos-low': [s - PAD - 6, s - PAD - 8, 'end'] };
  for (const [k, [x, y, anchor]] of Object.entries(qPos)) {
    if (q[k]) svg.append(el('text', { x, y, 'text-anchor': anchor, class: 'cx-quad' }, q[k]));
  }
  return svg;
}

/** Polyline of points [{valence, arousal}] with optional class. */
export function drawPath(svg, points, cls = 'cx-path') {
  if (!points.length) return null;
  const d = points.map((p, i) => {
    const { x, y } = toXY(p.valence, p.arousal);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const path = el('path', { d, class: cls, fill: 'none' });
  svg.append(path);
  return path;
}

export function drawDot(svg, p, cls = 'cx-dot', r = 4) {
  const { x, y } = toXY(p.valence, p.arousal);
  const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, class: cls });
  svg.append(c);
  return c;
}

/** Move an existing dot (no animation: the position simply updates). */
export function moveDot(dot, p) {
  const { x, y } = toXY(p.valence, p.arousal);
  dot.setAttribute('cx', x.toFixed(1));
  dot.setAttribute('cy', y.toFixed(1));
}

/** Arrow from the declared state to the ISO target of a session. */
export function drawArrow(svg, from, to, opacity = 1) {
  const a = toXY(from.valence, from.arousal);
  const b = toXY(to.valence, to.arousal);
  const g = el('g', { class: 'cx-session', opacity: opacity.toFixed(2) });
  g.append(el('line', { x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1), class: 'cx-arrow' }));
  g.append(el('circle', { cx: a.x.toFixed(1), cy: a.y.toFixed(1), r: 3.2, class: 'cx-from' }));
  g.append(el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 1.8, class: 'cx-to' }));
  svg.append(g);
  return g;
}
