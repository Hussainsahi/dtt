'use strict';
/* Meta WhatsApp Cloud API webhook.
 *   GET  — verification handshake (hub.verify_token must equal WA_WEBHOOK_VERIFY_TOKEN).
 *   POST — signed with X-Hub-Signature-256 (HMAC-SHA256 of the RAW body with META_APP_SECRET).
 *
 * On an inbound customer text that matches the landing-page prefill ("... for DOB: DD/MM/YYYY"), we:
 *   1. extract the month,
 *   2. look up the 3 tracks in the audio library,
 *   3. deliver via the configured adapter (Cloud API → 'ACCEPTED' only when message ids come back; otherwise
 *      'MANUAL_SEND_REQUIRED' with the file list logged for a human),
 *   4. update the lead's delivery_status when storage knows the number.
 * Status callbacks (sent/delivered/read/failed) update delivery_status to DELIVERED / FAILED.
 */
const crypto = require('node:crypto');
const storage = require('../lib/adapters/storage');
const whatsapp = require('../lib/adapters/whatsapp');
const { validateDob, normalizePhoneIN } = require('../lib/validate');

const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };

async function rawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (req.body && typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object' && !req.readable) return JSON.stringify(req.body); // best effort; see vercel.json bodyParser note
  const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks).toString('utf8');
}

function verifySignature(raw, header) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header || !header.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Extracts a month (1-12) from "DOB: DD/MM/YYYY" style text; returns null if absent/invalid. */
function monthFromText(text) {
  const m = /DOB:\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i.exec(text || '');
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const v = validateDob(iso);
  return v.ok ? v.m : null;
}

async function handleInbound(msg) {
  const from = normalizePhoneIN(msg.from);
  const text = msg.text && msg.text.body;
  const month = monthFromText(text);
  const store = storage.pick();
  const hash = from ? storage.phoneHash(from) : null;

  if (!month) {
    // Fall back to the stored lead's month when the customer typed something else.
    let lead = null;
    if (store.isConfigured() && hash && store.latestByPhoneHash) { try { lead = await store.latestByPhoneHash(hash); } catch { /* ignore */ } }
    if (!lead) { console.log('[wa] inbound without DOB and no stored lead', { from: hash && hash.slice(0, 8) }); return { action: 'ignored' }; }
    return deliver(from, lead.birth_month, store, hash);
  }
  return deliver(from, month, store, hash);
}

async function deliver(to, month, store, hash) {
  const adapter = whatsapp.pick();
  const result = await adapter.deliverMonth(to.replace('+', ''), month);
  const statusMap = { accepted: 'ACCEPTED', partial: 'FAILED', failed: 'FAILED', manual_send_required: 'MANUAL_SEND_REQUIRED' };
  const delivery_status = statusMap[result.status] || 'FAILED';
  if (delivery_status === 'MANUAL_SEND_REQUIRED') console.warn('[wa] MANUAL SEND REQUIRED', JSON.stringify({ to: hash && hash.slice(0, 8), month, files: result.results.map((r) => r.file) }));
  if (store.isConfigured() && hash) {
    try { await store.updateDelivery(hash, { delivery_status, delivery_detail: JSON.stringify(result).slice(0, 2000), delivery_updated_at: new Date().toISOString() }); } catch (e) { console.error('[wa] could not update lead', e.message); }
  }
  return { action: 'delivery', adapter: adapter.name, delivery_status, result };
}

async function handleStatus(st) {
  // st.status: sent | delivered | read | failed ; st.recipient_id: phone without "+"
  const to = normalizePhoneIN(st.recipient_id);
  if (!to) return;
  const map = { delivered: 'DELIVERED', read: 'DELIVERED', failed: 'FAILED' };
  const delivery_status = map[st.status];
  if (!delivery_status) return;
  const store = storage.pick();
  if (store.isConfigured()) {
    try { await store.updateDelivery(storage.phoneHash(to), { delivery_status, delivery_updated_at: new Date().toISOString() }); } catch (e) { console.error('[wa] status update failed', e.message); }
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q['hub.mode'] === 'subscribe' && process.env.WA_WEBHOOK_VERIFY_TOKEN && q['hub.verify_token'] === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
      res.statusCode = 200; res.setHeader('Content-Type', 'text/plain'); return res.end(String(q['hub.challenge'] || ''));
    }
    return json(res, 403, { ok: false });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false });

  const raw = await rawBody(req);
  if (!verifySignature(raw, req.headers['x-hub-signature-256'])) return json(res, 401, { ok: false, error: 'bad signature' });

  let payload; try { payload = JSON.parse(raw); } catch { return json(res, 400, { ok: false }); }
  const outcomes = [];
  for (const entry of payload.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      for (const m of v.messages || []) { if (m.type === 'text') outcomes.push(await handleInbound(m)); }
      for (const s of v.statuses || []) await handleStatus(s);
    }
  }
  return json(res, 200, { ok: true, handled: outcomes.length });
};

module.exports.monthFromText = monthFromText;
module.exports.verifySignature = verifySignature;
