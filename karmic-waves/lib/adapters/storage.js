'use strict';
/* Lead storage adapters. Selected by LEAD_STORAGE = supabase | sheet | memory.
 * Every adapter implements:
 *   isConfigured(): boolean
 *   findRecent(phoneHash, sinceIso): Promise<lead|null>
 *   insert(lead): Promise<{ id }>
 *   updateDelivery(id|phoneHash, patch): Promise<void>
 * Unconfigured adapters throw; api/lead.js turns that into stored:"pending" — never a fake success.
 */
const crypto = require('node:crypto');

function phoneHash(e164) {
  const salt = process.env.PHONE_HASH_SALT || 'dev-salt-change-me';
  return crypto.createHmac('sha256', salt).update(e164).digest('hex');
}

/* ---------- memory (dev / tests only) ---------- */
const mem = [];
const memory = {
  name: 'memory',
  isConfigured: () => true,
  async findRecent(hash, sinceIso) { return mem.find((l) => l.phone_hash === hash && l.created_at >= sinceIso) || null; },
  async insert(lead) { const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...lead }; mem.push(row); return { id: row.id }; },
  async updateDelivery(sel, patch) { for (const l of mem) if (l.id === sel || l.phone_hash === sel) Object.assign(l, patch); },
  async latestByPhoneHash(hash) { return [...mem].reverse().find((l) => l.phone_hash === hash) || null; },
  _all: () => mem, _reset: () => mem.splice(0)
};

/* ---------- Supabase (PostgREST) ---------- */
const supabase = {
  name: 'supabase',
  isConfigured: () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  _headers() {
    const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' };
  },
  _table() { return `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${process.env.SUPABASE_LEADS_TABLE || 'leads'}`; },
  async findRecent(hash, sinceIso) {
    const r = await fetch(`${this._table()}?phone_hash=eq.${hash}&created_at=gte.${encodeURIComponent(sinceIso)}&select=id,created_at,birth_month&limit=1`, { headers: this._headers() });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    const rows = await r.json(); return rows[0] || null;
  },
  async insert(lead) {
    const r = await fetch(this._table(), { method: 'POST', headers: { ...this._headers(), Prefer: 'return=representation' }, body: JSON.stringify(lead) });
    if (!r.ok) throw new Error(`supabase insert ${r.status}: ${await r.text()}`);
    const [row] = await r.json(); return { id: row.id };
  },
  async updateDelivery(sel, patch) {
    const q = /^[0-9a-f-]{36}$/i.test(sel) ? `id=eq.${sel}` : `phone_hash=eq.${sel}`;
    const r = await fetch(`${this._table()}?${q}`, { method: 'PATCH', headers: this._headers(), body: JSON.stringify(patch) });
    if (!r.ok) throw new Error(`supabase patch ${r.status}`);
  },
  async latestByPhoneHash(hash) {
    const r = await fetch(`${this._table()}?phone_hash=eq.${hash}&order=created_at.desc&limit=1`, { headers: this._headers() });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    const rows = await r.json(); return rows[0] || null;
  }
};

/* ---------- Google Sheet via Apps Script web-app (append-only) ---------- */
const sheet = {
  name: 'sheet',
  isConfigured: () => !!process.env.SHEET_WEBAPP_URL,
  async findRecent() { return null; }, // append-only endpoint; dedupe handled by rate limit + memory window
  async insert(lead) {
    const r = await fetch(process.env.SHEET_WEBAPP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: process.env.SHEET_WEBAPP_SECRET || '', lead }) });
    if (!r.ok) throw new Error(`sheet ${r.status}`);
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error('sheet rejected');
    return { id: j.id || crypto.randomUUID() };
  },
  async updateDelivery() { /* not supported for sheets; delivery is tracked in the webhook log */ },
  async latestByPhoneHash() { return null; }
};

function pick() {
  const mode = (process.env.LEAD_STORAGE || (process.env.NODE_ENV === 'production' ? '' : 'memory')).toLowerCase();
  const a = { supabase, sheet, memory }[mode];
  if (!a) return { name: mode || 'none', isConfigured: () => false };
  return a;
}

module.exports = { pick, phoneHash, memory, supabase, sheet };
