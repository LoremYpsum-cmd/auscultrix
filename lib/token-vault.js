/**
 * Best-effort AES-GCM wrap for OAuth tokens in chrome.storage.local (MV3).
 * Key is derived from chrome.runtime.id — device-local obfuscation, not HSM.
 */

const VAULT_KEY = 'spotifyTokenVault';
const SALT = new TextEncoder().encode('Auscultrix.spotify.v1');

async function deriveKey() {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(chrome.runtime.id),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function b64encode(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * @param {object} tokens
 */
export async function saveTokens(tokens) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(tokens));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  await chrome.storage.local.set({
    [VAULT_KEY]: {
      iv: b64encode(iv),
      data: b64encode(cipher),
    },
  });
}

/**
 * @returns {Promise<object|null>}
 */
export async function loadTokens() {
  const stored = await chrome.storage.local.get(VAULT_KEY);
  const vault = stored[VAULT_KEY];
  if (!vault?.iv || !vault?.data) return null;
  try {
    const key = await deriveKey();
    const iv = b64decode(vault.iv);
    const data = b64decode(vault.data);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

export async function clearTokens() {
  await chrome.storage.local.remove(VAULT_KEY);
}
