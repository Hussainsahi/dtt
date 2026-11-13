'use strict';
/* Server-side view of the audio library.
 * Source of truth is src/config.js (months → tracks). This module reads it so the
 * webhook and the validator use exactly the same mapping the page shows.
 *
 * Each track may resolve to one of three locations, chosen by AUDIO_SOURCE:
 *   - "local"  : files under AUDIO_LOCAL_DIR (default ./audio) — validated by stat()
 *   - "url"    : AUDIO_BASE_URL + "/" + file — validated by HTTP HEAD
 *   - "media"  : WhatsApp media IDs from AUDIO_MEDIA_IDS_JSON ({ "<file>": "<mediaId>" })
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadMonths() {
  const file = path.resolve(__dirname, '..', 'src', 'config.js');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.window.KW.config.months;
}

const months = loadMonths();

function tracksForMonth(m) {
  const mo = months[Number(m)];
  if (!mo) throw new Error(`unknown month ${m}`);
  return mo.tracks.map((t) => ({ ...t, month: mo.name }));
}

function source() {
  const mode = (process.env.AUDIO_SOURCE || 'local').toLowerCase();
  const mediaIds = process.env.AUDIO_MEDIA_IDS_JSON ? JSON.parse(process.env.AUDIO_MEDIA_IDS_JSON) : {};
  return { mode, localDir: process.env.AUDIO_LOCAL_DIR || path.resolve(__dirname, '..', 'audio'), baseUrl: (process.env.AUDIO_BASE_URL || '').replace(/\/$/, ''), mediaIds };
}

/** Resolves a track to a sendable reference: { kind: 'link'|'media', value } or null. */
function resolveTrack(track) {
  const s = source();
  if (s.mode === 'media') return s.mediaIds[track.file] ? { kind: 'media', value: s.mediaIds[track.file] } : null;
  if (s.mode === 'url') return s.baseUrl ? { kind: 'link', value: `${s.baseUrl}/${encodeURIComponent(track.file)}` } : null;
  const p = path.join(s.localDir, track.file);
  return fs.existsSync(p) ? { kind: 'path', value: p } : null;
}

/** Checks every one of the 36 files. Returns { ok, missing: [{month, file}], total } */
async function validateAll({ fetchImpl } = {}) {
  const s = source();
  const missing = [];
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const mo = months[m];
    if (!mo || mo.tracks.length !== 3) { missing.push({ month: m, file: '(month entry incomplete)' }); continue; }
    for (const t of mo.tracks) {
      total++;
      if (s.mode === 'url') {
        if (!s.baseUrl) { missing.push({ month: mo.name, file: t.file }); continue; }
        try {
          const r = await (fetchImpl || fetch)(`${s.baseUrl}/${encodeURIComponent(t.file)}`, { method: 'HEAD' });
          if (!r.ok) missing.push({ month: mo.name, file: t.file });
        } catch { missing.push({ month: mo.name, file: t.file }); }
      } else if (!resolveTrack(t)) {
        missing.push({ month: mo.name, file: t.file });
      }
    }
  }
  return { ok: missing.length === 0, missing, total, mode: s.mode };
}

module.exports = { months, tracksForMonth, resolveTrack, validateAll };
