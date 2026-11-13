# Architecture

## Frontend
- Plain HTML/CSS/JS, no framework. Source: `src/index.html`, `src/styles.css`, `src/config.js`, `src/app.js`.
- `node scripts/build.mjs` inlines CSS/JS into `dist/karmic-waves-website.html` (the single-file deploy artifact) and copies `src/` to `dist/` unbundled for debugging.
- Single config object `KW.config` (`src/config.js`): business number, Pixel ID, lead endpoint, canonical/og URLs, trust data, approved reviews, month → element/Hz/tracks map.
- Mobile-first, max width 460px. Fonts: Cormorant Garamond 600 (display) + Inter 400/600 (body). Two families, three weights total.

## State machine (frontend)
`idle` → (valid DOB) `ready` → (click CTA) `processing` (6.5 s, 4 nodes) → `result` → (valid phone + submit) `submitting` → `sent` (lead accepted, WhatsApp opened) | `error`.

The result card is shown only after processing completes. The Pixel `Lead` is fired only in `sent`, once per page load, with `event_id = lead id returned by the backend`.

## Processing visuals
- Canvas sine wave: DPR-aware, single rAF loop stored in a handle, cancelled on completion / page hide / reduced motion.
- Hz counter: time-based interpolation 136.1 → 432.0 → 528.0 (visual effect, not a measurement).
- Beam: CSS `transform` animation 6.5 s, four nodes toggled by `setTimeout`s computed from a single start timestamp so they stay in order even when a tab is throttled; all timers tracked and cleared.
- Haptics: `navigator.vibrate` behind feature detection + Android UA check.
- Web Audio: created on CTA click only. 432 Hz sine + 216 Hz sine → low-pass → gain (fade in 1 s, fade out last 1.2 s) + chime at 6.2 s. Mute toggle. `AudioContext.close()` on completion. Handles `suspended` (resume) and unsupported (silently skipped).

## Backend (Vercel serverless, Node 20)
- `api/lead.js` — POST JSON `{ dob, phone, consent, attribution }`. Server re-validates (real calendar, year range, +91 mobile regex), rate limits per IP (in-memory token bucket per instance + optional Upstash), dedupes by phone hash within `LEAD_DEDUPE_HOURS`, stores via adapter, optionally fires Conversions API, returns `{ ok, leadId, eventId, stored: true|"pending" }`.
- `api/whatsapp-webhook.js` — GET verify challenge, POST with `X-Hub-Signature-256` verification. On an inbound customer message that matches the prefill pattern, extracts month, looks up the 3 tracks in `lib/audio-library.js`, sends via Cloud API adapter or records a `MANUAL_SEND_REQUIRED` entry.
- Adapters (`lib/adapters/*`): `storage-supabase.js`, `storage-sheet.js`, `storage-memory.js` (dev), `pixel-capi.js`, `whatsapp-cloud.js`, `whatsapp-manual.js`. Each exposes `isConfigured()` and returns `{ status: 'ok' | 'pending' }` — never a fake success.
- `scripts/validate-audio.mjs` — asserts all 36 `file` entries resolve (local path or HEAD on URL / media ID presence). Exit 1 if any month is incomplete; wired into `npm run build`.

## Security headers
`vercel.json` sets CSP (self + connect.facebook.net + fonts), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`.

## Data stored per lead
`id, created_at, dob (YYYY-MM-DD), birth_month (1-12), phone_e164, phone_hash, consent (bool), consent_at, consent_text_version, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, referrer, landing_path, ip_hash, user_agent, delivery_status (NEW | MANUAL_SEND_REQUIRED | ACCEPTED | DELIVERED | FAILED)`.
Retention: `LEAD_RETENTION_DAYS` (default 365, `[CLIENT TO CONFIRM]`).
