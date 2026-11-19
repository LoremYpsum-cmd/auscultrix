/**
 * Test environment: a faithful in-memory stand-in for the parts of the
 * WebExtension API the pure modules touch (storage.local/session, i18n,
 * runtime.getURL + fetch of packaged files). No network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function makeArea() {
  const data = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  return {
    _data: data,
    async get(keys) {
      const out = {};
      if (keys == null) {
        for (const [k, v] of data) out[k] = clone(v);
        return out;
      }
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      for (const k of list) if (data.has(k)) out[k] = clone(data.get(k));
      return out;
    },
    async set(obj) {
      for (const [k, v] of Object.entries(obj)) data.set(k, clone(v));
    },
    async remove(keys) {
      for (const k of typeof keys === 'string' ? [keys] : keys) data.delete(k);
    },
    async clear() {
      data.clear();
    },
  };
}

export function installChromeMock({ locale = 'it' } = {}) {
  const messages = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', locale, 'messages.json'), 'utf8'));
  globalThis.chrome = {
    storage: { local: makeArea(), session: makeArea() },
    i18n: {
      getUILanguage: () => locale,
      getMessage: (k, subs) => {
        const e = messages[k];
        if (!e) return '';
        let m = e.message;
        if (e.placeholders) {
          for (const [name, ph] of Object.entries(e.placeholders)) m = m.replaceAll(`$${name.toUpperCase()}$`, ph.content);
        }
        const list = subs == null ? [] : Array.isArray(subs) ? subs : [subs];
        return m.replace(/\$(\d)/g, (_, n) => String(list[Number(n) - 1] ?? ''));
      },
    },
    runtime: {
      id: 'test-extension-id',
      getURL: (p) => pathToFileURL(path.join(ROOT, p)).href,
      getManifest: () => JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')),
      sendMessage: async () => undefined,
    },
  };
  // fetch() of packaged files (file:// URLs produced by getURL)
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith('file://')) {
      const body = fs.readFileSync(fileURLToPath(u));
      return new Response(body, { status: 200 });
    }
    if (realFetch && process.env.ALLOW_NETWORK === '1') return realFetch(url, init);
    throw new TypeError('network disabled in tests');
  };
  return globalThis.chrome;
}

export function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

export function listFiles(dirRel, filter = () => true) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) walk(rel);
      else if (filter(rel)) out.push(rel);
    }
  };
  walk(dirRel);
  return out;
}

export const importLib = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
