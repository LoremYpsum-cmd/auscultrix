/**
 * «Le tue cose» — the diary drawn on the valence–arousal plane.
 *
 * Each remembered session is an arrow from the declared state to the ISO
 * target chosen for it; older sessions are fainter. The same numbers are
 * offered as a table (WCAG 1.1.1: text alternative for non-text content).
 * Wording is deliberate: these are self-reports and design targets, not
 * measurements of health, and the map draws no trend line.
 */
import { loadUserModel } from './user-model.js';
import { drawArrow, drawPlane, summarizeEntries } from './circumplex.js';
import { t, uiLocale } from './i18n.js';

const pct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}` : '—');

export async function renderDiaryMap({ mapEl, captionEl, tableEl }) {
  if (!mapEl) return;
  const { entries } = await loadUserModel();
  const pts = entries.filter((e) => Number.isFinite(e.valence) && Number.isFinite(e.energy));
  mapEl.replaceChildren();
  tableEl?.replaceChildren();
  const s = summarizeEntries(pts);
  const fold = tableEl?.closest('details');
  if (fold) fold.hidden = !s.n;
  if (!s.n) {
    if (captionEl) captionEl.textContent = t('diaryMapEmpty') || 'La mappa si disegna dopo la prima sessione.';
    return;
  }
  const svg = drawPlane({
    title: t('diaryMapTitle') || 'Le tue sessioni sul piano umore–energia',
    desc: t('diaryMapDesc', [String(s.n), pct(s.valence), pct(s.arousal)]),
    labels: {
      valence: t('circumplexValence') || 'umore',
      arousal: t('circumplexArousal') || 'energia',
      q: {
        'neg-high': t('circumplexTense') || 'teso',
        'pos-high': t('circumplexBright') || 'vivace',
        'neg-low': t('circumplexLow') || 'giù',
        'pos-low': t('circumplexCalm') || 'sereno',
      },
    },
  });
  pts.forEach((e, i) => {
    const age = (pts.length - 1 - i) / Math.max(1, pts.length - 1);
    const to = Number.isFinite(e.targetValence)
      ? { valence: e.targetValence, arousal: e.targetEnergy }
      : { valence: e.valence, arousal: e.energy };
    drawArrow(svg, { valence: e.valence, arousal: e.energy }, to, 1 - 0.75 * age);
  });
  mapEl.append(svg);
  if (captionEl) {
    captionEl.textContent = t('diaryMapCaption', [
      String(s.n),
      pct(s.valence),
      pct(s.arousal),
      s.meanShift == null ? '—' : pct(s.meanShift),
    ]);
  }
  if (tableEl) {
    const table = document.createElement('table');
    table.className = 'diary-table';
    const cap = document.createElement('caption');
    cap.className = 'sr-only';
    cap.textContent = t('diaryTableLabel') || 'I numeri della mappa';
    table.append(cap);
    const head = document.createElement('tr');
    for (const k of ['diaryColWhen', 'diaryColMood', 'diaryColEnergy', 'diaryColTarget', 'diaryColActivity']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = t(k) || k;
      head.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(head);
    const tbody = document.createElement('tbody');
    const fmt = new Intl.DateTimeFormat(uiLocale() === 'it' ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    for (const e of [...pts].reverse()) {
      const tr = document.createElement('tr');
      const cells = [
        Number.isFinite(e.at) ? fmt.format(new Date(e.at)) : '—',
        pct(e.valence),
        pct(e.energy),
        Number.isFinite(e.targetValence) ? `${pct(e.targetValence)} / ${pct(e.targetEnergy)}` : '—',
        t(`activity_${e.activity}`) || e.activity || '—',
      ];
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = c;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    tableEl.append(table);
  }
}
