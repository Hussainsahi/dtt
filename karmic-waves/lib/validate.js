'use strict';
/* Server-side validation shared by the API routes. No third-party deps. */

const YEAR_MIN = 1955;
const YEAR_MAX = 2008;

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(m, y) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

/** Validates "YYYY-MM-DD". Returns { ok, y, m, d, error }. */
function validateDob(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { ok: false, error: 'dob must be YYYY-MM-DD' };
  const [y, m, d] = iso.split('-').map(Number);
  if (y < YEAR_MIN || y > YEAR_MAX) return { ok: false, error: `year must be ${YEAR_MIN}-${YEAR_MAX}` };
  if (m < 1 || m > 12) return { ok: false, error: 'invalid month' };
  if (d < 1 || d > daysInMonth(m, y)) return { ok: false, error: 'invalid day for month' };
  if (new Date(Date.UTC(y, m - 1, d)).getTime() > Date.now()) return { ok: false, error: 'dob in the future' };
  return { ok: true, y, m, d };
}

/** Indian mobile only. Accepts "+91XXXXXXXXXX", "91XXXXXXXXXX", "0XXXXXXXXXX" or 10 digits. Returns E.164 or null. */
function normalizePhoneIN(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Validates the lead POST body. Returns { ok, lead } or { ok, error }. */
function validateLeadBody(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const dob = validateDob(body.dob);
  if (!dob.ok) return { ok: false, error: dob.error };
  const phone = normalizePhoneIN(body.phone);
  if (!phone) return { ok: false, error: 'invalid Indian mobile number' };
  if (body.consent !== true) return { ok: false, error: 'consent required' };
  if (body.birthMonth !== undefined && Number(body.birthMonth) !== dob.m) return { ok: false, error: 'birthMonth does not match dob' };
  const a = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
  const clientEventId = /^[0-9a-f-]{36}$/i.test(body.clientEventId || '') ? body.clientEventId : null;
  return {
    ok: true,
    lead: {
      dob: body.dob, birth_month: dob.m, phone_e164: phone,
      consent: true, consent_at: str(body.consentAt, 40) || new Date().toISOString(),
      consent_text_version: str(body.consentTextVersion, 32) || 'unknown',
      utm_source: str(a.utm_source, 200), utm_medium: str(a.utm_medium, 200), utm_campaign: str(a.utm_campaign, 200),
      utm_content: str(a.utm_content, 200), utm_term: str(a.utm_term, 200), fbclid: str(a.fbclid, 300),
      referrer: str(a.referrer, 300), landing_path: str(a.landing_path, 600),
      client_event_id: clientEventId
    }
  };
}

module.exports = { validateDob, normalizePhoneIN, validateLeadBody, YEAR_MIN, YEAR_MAX, daysInMonth, isLeap };
