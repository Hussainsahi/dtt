/* Backend tests (no network): validation, lead route, webhook signature + month parsing, audio validator.
 * Usage: node tests/api.test.mjs
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);

process.env.LEAD_STORAGE = 'memory';
process.env.PHONE_HASH_SALT = 'test-salt';
process.env.META_APP_SECRET = 'app-secret';
process.env.WA_WEBHOOK_VERIFY_TOKEN = 'verify-me';
process.env.AUDIO_SOURCE = 'local';
process.env.AUDIO_LOCAL_DIR = '/nonexistent-dir';

const { validateDob, normalizePhoneIN, validateLeadBody } = require('../lib/validate.js');
const storage = require('../lib/adapters/storage.js');
const rateLimit = require('../lib/rate-limit.js');
const lead = require('../api/lead.js');
const wa = require('../api/whatsapp-webhook.js');
const { validateAll, tracksForMonth } = require('../lib/audio-library.js');

let passed = 0, failed = 0;
const t = async (name, fn) => { try { await fn(); passed++; console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '—', e.message); } };

function mockReq({ method = 'POST', body, headers = {}, url = '/api/lead', raw }) {
  const req = new EventEmitter();
  Object.assign(req, { method, headers: { 'content-type': 'application/json', ...headers }, url, socket: { remoteAddress: '1.2.3.4' }, readable: true });
  const data = raw !== undefined ? raw : JSON.stringify(body ?? {});
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from(data); };
  return req;
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; this.done = true; } };
  res.json = () => JSON.parse(res.body || '{}');
  return res;
}

/* ---- validation ---- */
await t('validateDob accepts 29 Feb 2000', () => assert.equal(validateDob('2000-02-29').ok, true));
await t('validateDob rejects 29 Feb 1999', () => assert.equal(validateDob('1999-02-29').ok, false));
await t('validateDob rejects 31 Apr', () => assert.equal(validateDob('1990-04-31').ok, false));
await t('validateDob rejects year 2009 and 1954', () => { assert.equal(validateDob('2009-01-01').ok, false); assert.equal(validateDob('1954-12-31').ok, false); });
await t('validateDob rejects garbage', () => assert.equal(validateDob('14/11/1990').ok, false));
await t('normalizePhoneIN variants', () => {
  assert.equal(normalizePhoneIN('9876543210'), '+919876543210');
  assert.equal(normalizePhoneIN('+91 98765 43210'), '+919876543210');
  assert.equal(normalizePhoneIN('09876543210'), '+919876543210');
  assert.equal(normalizePhoneIN('5876543210'), null);
  assert.equal(normalizePhoneIN('98765'), null);
  assert.equal(normalizePhoneIN('+447700900000'), null);
});
await t('validateLeadBody requires consent and matching month', () => {
  assert.equal(validateLeadBody({ dob: '1990-11-14', phone: '9876543210', consent: false }).ok, false);
  assert.equal(validateLeadBody({ dob: '1990-11-14', phone: '9876543210', consent: true, birthMonth: 5 }).ok, false);
  const v = validateLeadBody({ dob: '1990-11-14', phone: '9876543210', consent: true, birthMonth: 11, attribution: { utm_source: 'meta' } });
  assert.equal(v.ok, true); assert.equal(v.lead.birth_month, 11); assert.equal(v.lead.utm_source, 'meta');
});

/* ---- /api/lead ---- */
const good = { dob: '1990-11-14', birthMonth: 11, phone: '9876543210', consent: true, consentAt: new Date().toISOString(), consentTextVersion: 'v1', clientEventId: crypto.randomUUID(), attribution: { utm_source: 'meta', fbclid: 'x' } };
await t('lead: GET → 405', async () => { const r = mockRes(); await lead(mockReq({ method: 'GET' }), r); assert.equal(r.statusCode, 405); });
await t('lead: invalid JSON → 400', async () => { const r = mockRes(); await lead(mockReq({ raw: '{nope' }), r); assert.equal(r.statusCode, 400); });
await t('lead: bad dob → 400', async () => { const r = mockRes(); await lead(mockReq({ body: { ...good, dob: '1999-02-29' } }), r); assert.equal(r.statusCode, 400); });
await t('lead: stores and returns eventId = clientEventId', async () => {
  storage.memory._reset(); rateLimit._reset();
  const r = mockRes(); await lead(mockReq({ body: good }), r);
  assert.equal(r.statusCode, 200); const j = r.json();
  assert.equal(j.ok, true); assert.equal(j.stored, true); assert.equal(j.eventId, good.clientEventId); assert.equal(j.duplicate, false);
  const row = storage.memory._all()[0];
  assert.equal(row.phone_e164, '+919876543210'); assert.equal(row.birth_month, 11); assert.equal(row.consent, true); assert.ok(row.phone_hash); assert.equal(row.delivery_status, 'NEW');
  assert.equal(row.utm_source, 'meta');
});
await t('lead: duplicate within window is not stored twice', async () => {
  const r = mockRes(); await lead(mockReq({ body: { ...good, clientEventId: crypto.randomUUID() } }), r);
  assert.equal(r.json().duplicate, true); assert.equal(storage.memory._all().length, 1);
});
await t('lead: per-phone rate limit → 429', async () => {
  rateLimit._reset();
  for (let i = 0; i < 3; i++) { const r = mockRes(); await lead(mockReq({ body: good, headers: { 'x-forwarded-for': `10.0.0.${i}` } }), r); assert.equal(r.statusCode, 200); }
  const r = mockRes(); await lead(mockReq({ body: good, headers: { 'x-forwarded-for': '10.0.0.9' } }), r); assert.equal(r.statusCode, 429);
});
await t('lead: per-IP rate limit → 429', async () => {
  rateLimit._reset();
  for (let i = 0; i < 10; i++) { const r = mockRes(); await lead(mockReq({ body: { ...good, phone: `98765432${String(10 + i).padStart(2, '0')}` }, headers: { 'x-forwarded-for': '9.9.9.9' } }), r); }
  const r = mockRes(); await lead(mockReq({ body: good, headers: { 'x-forwarded-for': '9.9.9.9' } }), r); assert.equal(r.statusCode, 429);
});
await t('lead: unconfigured storage → 503 (never fake success) unless ALLOW_UNSTORED_LEADS', async () => {
  rateLimit._reset(); process.env.LEAD_STORAGE = 'supabase'; // not configured (no URL/key)
  let r = mockRes(); await lead(mockReq({ body: good }), r); assert.equal(r.statusCode, 503); assert.equal(r.json().ok, false);
  process.env.ALLOW_UNSTORED_LEADS = 'true'; rateLimit._reset();
  r = mockRes(); await lead(mockReq({ body: good }), r); assert.equal(r.statusCode, 200); assert.equal(r.json().stored, 'pending');
  process.env.ALLOW_UNSTORED_LEADS = 'false'; process.env.LEAD_STORAGE = 'memory';
});

/* ---- webhook ---- */
await t('webhook: GET verification', async () => {
  const r = mockRes(); await wa({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '123' }, headers: {} }, r);
  assert.equal(r.statusCode, 200); assert.equal(r.body, '123');
  const r2 = mockRes(); await wa({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '123' }, headers: {} }, r2); assert.equal(r2.statusCode, 403);
});
await t('webhook: bad signature → 401', async () => {
  const r = mockRes(); await wa(mockReq({ url: '/api/whatsapp-webhook', raw: '{}', headers: { 'x-hub-signature-256': 'sha256=deadbeef' } }), r); assert.equal(r.statusCode, 401);
});
await t('webhook: month parsed from prefill text', () => {
  assert.equal(wa.monthFromText('Namaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: 14/11/1990'), 11);
  assert.equal(wa.monthFromText('DOB: 29/02/1999'), null);
  assert.equal(wa.monthFromText('hello'), null);
});
await t('webhook: inbound message → manual_send_required with 3 files; lead status updated', async () => {
  storage.memory._reset(); rateLimit._reset();
  await lead(mockReq({ body: good }), mockRes());
  const payload = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '919876543210', type: 'text', text: { body: 'Namaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: 14/11/1990' } }] } }] }] });
  const sig = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(payload).digest('hex');
  const r = mockRes(); await wa(mockReq({ url: '/api/whatsapp-webhook', raw: payload, headers: { 'x-hub-signature-256': sig } }), r);
  assert.equal(r.statusCode, 200); assert.equal(r.json().handled, 1);
  const row = storage.memory._all()[0];
  assert.equal(row.delivery_status, 'MANUAL_SEND_REQUIRED');
  const detail = JSON.parse(row.delivery_detail);
  assert.deepEqual(detail.results.map((x) => x.file), ['11-nov_morning.mp3', '11-nov_day.mp3', '11-nov_night.mp3']);
});
await t('webhook: status "delivered" updates lead', async () => {
  const payload = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ status: 'delivered', recipient_id: '919876543210' }] } }] }] });
  const sig = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(payload).digest('hex');
  await wa(mockReq({ url: '/api/whatsapp-webhook', raw: payload, headers: { 'x-hub-signature-256': sig } }), mockRes());
  assert.equal(storage.memory._all()[0].delivery_status, 'DELIVERED');
});

/* ---- audio library ---- */
await t('tracksForMonth: every month → 3 distinct files, 36 total', () => {
  const all = new Set();
  for (let m = 1; m <= 12; m++) { const tr = tracksForMonth(m); assert.equal(tr.length, 3); tr.forEach((x) => all.add(x.file)); }
  assert.equal(all.size, 36);
});
await t('validateAll fails loudly when files are missing', async () => { const r = await validateAll(); assert.equal(r.ok, false); assert.equal(r.missing.length, 36); });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
