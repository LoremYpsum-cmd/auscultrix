// Minimal stand-in for the WebExtension API, for the local preview only
// (tools/preview/server.mjs). Storage lives in sessionStorage of the preview tab.
(() => {
  const area = (name) => {
    const key = `mock-${name}`;
    const read = () => { try { return JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { return {}; } };
    const write = (d) => sessionStorage.setItem(key, JSON.stringify(d));
    return {
      async get(keys) {
        const d = read();
        if (keys == null) return d;
        const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
        const out = {};
        for (const k of list) if (k in d) out[k] = d[k];
        return out;
      },
      async set(obj) { write({ ...read(), ...JSON.parse(JSON.stringify(obj)) }); },
      async remove(keys) { const d = read(); for (const k of [].concat(keys)) delete d[k]; write(d); },
      async clear() { write({}); },
    };
  };
  // ?demo=1: no opening sheet and a few invented sessions, for screenshots only
  if (new URLSearchParams(location.search).has('demo') && !sessionStorage.getItem('mock-local')) {
    const now = Date.now();
    const pts = [[0.22, 0.78, 0.45, 0.52], [0.30, 0.35, 0.50, 0.42], [0.55, 0.62, 0.62, 0.55], [0.40, 0.70, 0.58, 0.45], [0.68, 0.30, 0.70, 0.30], [0.25, 0.25, 0.48, 0.40]];
    const entries = pts.map(([v, e, tv, te], i) => ({ at: now - (pts.length - i) * 86400000, energy: e, valence: v, targetValence: tv, targetEnergy: te, activity: i % 2 ? 'soundscape' : 'music' }));
    sessionStorage.setItem('mock-local', JSON.stringify({ hideClinicalDisclaimerPip: true, userModelV1: { entries, stats: { sessions: entries.length } } }));
  }
  // ?only=id1,id2 shows just those sections; ?play=1 starts the soundscape (screenshots)
  const q = new URLSearchParams(location.search);
  if (q.has('only') || q.has('play')) {
    addEventListener('load', () => setTimeout(() => {
      if (q.has('play')) {
        const input = document.getElementById('mood-input');
        if (input) input.value = q.get('mood') || 'sono agitato e ho la testa piena';
        document.getElementById('btn-soundscape-play')?.click();
      }
      if (q.has('only')) {
        const keep = q.get('only').split(',');
        document.querySelectorAll('main section, .dream-section, aside.care-alert').forEach((el) => {
          if (!keep.includes(el.id) && !keep.some((k) => el.querySelector('#' + k))) el.style.display = 'none';
        });
        document.querySelector('.dream-header, header')?.style.setProperty('display', 'none');
      }
    }, 1200));
  }
  const listeners = [];
  globalThis.chrome = {
    storage: { local: area('local'), session: area('session'), onChanged: { addListener() {} } },
    i18n: { getUILanguage: () => navigator.language || 'it', getMessage: () => '' },
    runtime: {
      id: 'preview',
      getURL: (p) => new URL(p, location.origin + '/').href,
      getManifest: () => ({ version: 'preview' }),
      sendMessage: async () => undefined,
      onMessage: { addListener: (f) => listeners.push(f) },
      lastError: undefined,
    },
    tabs: { create: async ({ url }) => { window.open(url, '_blank', 'noopener'); return {}; }, get: async () => ({}) },
  };
})();
