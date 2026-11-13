'use strict';
/* Meta Conversions API adapter. Sends a server-side "Lead" event with the SAME event_id the browser
 * Pixel uses, so Meta deduplicates. Enabled only when META_PIXEL_ID + META_CAPI_ACCESS_TOKEN exist.
 * Phone is sent only as SHA-256 of the E.164 number and only when META_CAPI_SEND_HASHED_PHONE=true
 * ([CLIENT TO CONFIRM] — see Privacy Notice §4). DOB is never sent.
 */
const crypto = require('node:crypto');

function isConfigured() { return !!(process.env.META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN); }

async function sendLead({ eventId, phoneE164, ip, userAgent, sourceUrl, fbclid }) {
  if (!isConfigured()) return { status: 'pending', reason: 'META_PIXEL_ID / META_CAPI_ACCESS_TOKEN not set' };
  const user_data = { client_ip_address: ip || undefined, client_user_agent: userAgent || undefined };
  if (process.env.META_CAPI_SEND_HASHED_PHONE === 'true' && phoneE164) {
    user_data.ph = [crypto.createHash('sha256').update(phoneE164.replace('+', '')).digest('hex')];
  }
  if (fbclid) user_data.fbc = `fb.1.${Date.now()}.${fbclid}`;
  const body = {
    data: [{ event_name: 'Lead', event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: 'website', event_source_url: sourceUrl, user_data,
      custom_data: { content_name: 'birth_month_free_kit', content_category: 'free_tool' } }],
    ...(process.env.META_CAPI_TEST_EVENT_CODE ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE } : {})
  };
  const v = process.env.META_GRAPH_VERSION || 'v21.0';
  const r = await fetch(`https://graph.facebook.com/${v}/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_ACCESS_TOKEN)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { status: 'ok', received: j.events_received } : { status: 'failed', error: j.error || r.status };
}

module.exports = { isConfigured, sendLead };
