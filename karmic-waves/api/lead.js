'use strict';
/* POST /api/lead — stores a lead, optionally fires Meta CAPI, returns { ok, leadId, eventId, stored }.
 * Vercel Node serverless function. Exported handler(req, res) is also used by scripts/dev-server.mjs and tests.
 */
const crypto = require('node:crypto');
const { validateLeadBody } = require('../lib/validate');
const rateLimit = require('../lib/rate-limit');
const storage = require('../lib/adapters/storage');
const capi = require('../lib/adapters/pixel-capi');

const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  return (Array.isArray(xf) ? xf[0] : (xf || '')).split(',')[0].trim() || req.socket?.remoteAddress || '0.0.0.0';
}
function ipHash(ip) { return crypto.createHash('sha256').update((process.env.PHONE_HASH_SALT || 'dev-salt-change-me') + ip).digest('hex').slice(0, 32); }

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel pre-parses JSON
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 16 * 1024) throw new Error('body too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function originAllowed(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true; // same-origin deployment; browsers enforce CORS for cross-site POSTs
  const o = req.headers.origin || '';
  return allowed.includes(o);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' });
  if (!originAllowed(req)) return json(res, 403, { ok: false, error: 'origin not allowed' });

  const ip = clientIp(req);
  const perIp = await rateLimit.hit(`lead:ip:${ip}`, Number(process.env.RATE_LIMIT_PER_IP || 10), 10 * 60 * 1000);
  if (!perIp.allowed) return json(res, 429, { ok: false, error: 'too many requests' });

  let body;
  try { body = await readJson(req); } catch { return json(res, 400, { ok: false, error: 'invalid JSON' }); }
  const v = validateLeadBody(body);
  if (!v.ok) return json(res, 400, { ok: false, error: v.error });

  const lead = v.lead;
  const hash = storage.phoneHash(lead.phone_e164);
  const perPhone = await rateLimit.hit(`lead:ph:${hash}`, Number(process.env.RATE_LIMIT_PER_PHONE || 3), 60 * 60 * 1000);
  if (!perPhone.allowed) return json(res, 429, { ok: false, error: 'too many requests for this number' });

  const eventId = lead.client_event_id || crypto.randomUUID();
  const record = {
    ...lead, phone_hash: hash, ip_hash: ipHash(ip), user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    event_id: eventId, delivery_status: 'NEW',
    retention_until: new Date(Date.now() + Number(process.env.LEAD_RETENTION_DAYS || 365) * 86400000).toISOString()
  };

  const store = storage.pick();
  let stored = 'pending', leadId = null, duplicate = false;
  if (store.isConfigured()) {
    try {
      const since = new Date(Date.now() - Number(process.env.LEAD_DEDUPE_HOURS || 24) * 3600000).toISOString();
      const existing = await store.findRecent(hash, since);
      if (existing) { duplicate = true; leadId = existing.id; stored = true; }
      else { leadId = (await store.insert(record)).id; stored = true; }
    } catch (e) {
      console.error('[lead] storage failed:', e.message);
      stored = 'pending';
    }
  } else {
    console.warn(`[lead] storage "${store.name}" not configured — lead NOT stored (PENDING)`);
  }

  /* Conversions API: only when the lead was really stored (so browser + server events refer to a real lead). */
  let capiStatus = 'pending';
  if (stored === true && !duplicate && capi.isConfigured()) {
    try {
      const r = await capi.sendLead({ eventId, phoneE164: lead.phone_e164, ip, userAgent: record.user_agent, sourceUrl: (req.headers.referer || '').split('?')[0], fbclid: lead.fbclid });
      capiStatus = r.status;
    } catch (e) { capiStatus = 'failed'; console.error('[lead] capi failed:', e.message); }
  }

  /* The browser only treats ok:true as permission to fire the Pixel + open WhatsApp. If nothing could store the lead we
   * still return ok:true with stored:"pending" ONLY when ALLOW_UNSTORED_LEADS=true (manual-delivery launch mode). */
  if (stored !== true && process.env.ALLOW_UNSTORED_LEADS !== 'true') {
    return json(res, 503, { ok: false, error: 'Lead storage is not available right now. Please try again shortly.' });
  }
  return json(res, 200, { ok: true, leadId, eventId, stored, duplicate, capi: capiStatus });
};
