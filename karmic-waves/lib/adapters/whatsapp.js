'use strict';
/* WhatsApp delivery adapters.
 *   cloud  — Meta WhatsApp Cloud API (WA_PHONE_NUMBER_ID + WA_ACCESS_TOKEN). Sends the 3 tracks as audio messages
 *            (by link or by uploaded media ID). Returns per-track { status: 'accepted', messageId } ONLY when the API
 *            returns a message id. 'accepted' ≠ delivered: delivery is confirmed later by status webhooks.
 *   manual — no provider configured. Records a MANUAL_SEND_REQUIRED entry listing the files for a human to send.
 * Current Cloud API audio limit: 16 MB per file (verify against Meta's docs before upload). Larger files should be
 * sent as document messages (100 MB) or as links.
 */
const { tracksForMonth, resolveTrack } = require('../audio-library');

const cloud = {
  name: 'cloud',
  isConfigured: () => !!(process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN),
  _url(p) { return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}/${process.env.WA_PHONE_NUMBER_ID}/${p}`; },
  async _send(payload) {
    const r = await fetch(this._url('messages'), {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload })
    });
    const j = await r.json().catch(() => ({}));
    const id = j && j.messages && j.messages[0] && j.messages[0].id;
    return id ? { status: 'accepted', messageId: id } : { status: 'failed', error: (j && j.error) || r.status };
  },
  async sendText(to, body) { return this._send({ to, type: 'text', text: { body, preview_url: false } }); },
  async sendTrack(to, track) {
    const ref = resolveTrack(track);
    if (!ref || ref.kind === 'path') return { status: 'failed', error: `no sendable reference for ${track.file} (AUDIO_SOURCE=url or media required for Cloud API)` };
    const audio = ref.kind === 'media' ? { id: ref.value } : { link: ref.value };
    return this._send({ to, type: 'audio', audio });
  },
  /** Sends the 3 tracks for a month. Returns { status: 'accepted'|'partial'|'failed', results } */
  async deliverMonth(to, month) {
    const tracks = tracksForMonth(month);
    const intro = await this.sendText(to, `Namaste 🙏 Here are your 3 Free Birth-Month Sound Tracks (${tracks[0].month} kit). Listen with headphones; the third track is for 11:00 PM.`);
    const results = [];
    for (const t of tracks) results.push({ track: t.id, title: t.title, ...(await this.sendTrack(to, t)) });
    const ok = results.filter((r) => r.status === 'accepted').length;
    return { status: ok === 3 ? 'accepted' : ok ? 'partial' : 'failed', intro, results };
  }
};

const manual = {
  name: 'manual',
  isConfigured: () => true,
  async deliverMonth(to, month) {
    const tracks = tracksForMonth(month);
    return {
      status: 'manual_send_required',
      instructions: `Send these 3 files to ${to} from the business WhatsApp:`,
      results: tracks.map((t) => ({ track: t.id, title: t.title, file: t.file, status: 'manual_send_required' }))
    };
  }
};

function pick() { return cloud.isConfigured() ? cloud : manual; }

module.exports = { pick, cloud, manual };
