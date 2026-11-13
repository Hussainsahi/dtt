/* Local dev server: serves dist/ and mounts the two API functions like Vercel does.
 * Usage: npm run dev   → http://localhost:4173
 * Env: copy .env.example to .env and `node --env-file=.env scripts/dev-server.mjs` for real adapters.
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lead = require('../api/lead.js');
const wa = require('../api/whatsapp-webhook.js');

const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  req.query = Object.fromEntries(url.searchParams);
  try {
    if (url.pathname === '/api/lead') return await lead(req, res);
    if (url.pathname === '/api/whatsapp-webhook') return await wa(req, res);
  } catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: e.message })); }
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const f = join('dist', p);
  if (!existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', types[extname(f)] || 'application/octet-stream');
  res.end(readFileSync(f));
}).listen(port, () => console.log(`dev server → http://localhost:${port}  (LEAD_STORAGE=${process.env.LEAD_STORAGE || 'memory'})`));
