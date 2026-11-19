#!/usr/bin/env node
/**
 * Local preview of the panel without installing the extension:
 *   node tools/preview/server.mjs [port]   → http://localhost:5178/preview/sidepanel.html
 * Serves the project read-only and injects tools/preview/chrome-mock.js.
 * Also serves the acoustic bench: http://localhost:5178/tests/acoustic/bench.html
 * Binds to 127.0.0.1 only.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.argv[2]) || 5178;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/preview/sidepanel.html') {
    const html = fs.readFileSync(path.join(ROOT, 'sidepanel.html'), 'utf8')
      .replace('<head>', '<head><base href="/"><script src="/tools/preview/chrome-mock.js"></script>');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`preview on http://localhost:${PORT}/preview/sidepanel.html`));
