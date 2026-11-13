# Karmic Waves — Free Birth-Month Sound landing page

Converts Meta Ads traffic into WhatsApp leads. Visitor picks a date of birth → processing animation → result card → enters WhatsApp number → lead is stored → Meta Pixel `Lead` fires once → WhatsApp opens with a prefilled message → the 3 free tracks for that birth month are delivered on WhatsApp (Cloud API or manual).

No pricing, checkout or paid pitch lives on this page.

## Layout
```
src/            frontend source (edit here)        → index.html, styles.css, config.js, app.js
dist/           build output; karmic-waves-website.html is the single-file bundle (index.html = same file)
api/            Vercel serverless functions       → lead.js, whatsapp-webhook.js
lib/            validation, rate limit, audio library, adapters (storage / pixel CAPI / whatsapp)
scripts/        build.mjs, validate-audio.mjs, dev-server.mjs, grep-paid-terms.mjs
tests/          smoke.mjs (Playwright, browser), api.test.mjs (backend, no network)
docs/           architecture.md, supabase-schema.sql, screenshots/, archive/ (retired paid-plan docs)
audio/          put the 36 mp3 files here when AUDIO_SOURCE=local (not committed)
```

## Run locally
```bash
cd karmic-waves
npm install                      # only playwright (tests)
cp .env.example .env             # fill what you have; defaults = memory storage, manual delivery
npm run build:skip-audio-check   # frontend-only build (production build requires the 36 files)
npm run dev                      # http://localhost:4173  (serves dist/ + /api/lead + /api/whatsapp-webhook)
npm test                         # Playwright smoke test at 390 / 768 / 1280 (+ reduced motion, month map)
npm run test:api                 # backend tests
npm run grep:paid                # guard: no paid-flow terms in the frontend
```
Real adapters locally: `node --env-file=.env scripts/dev-server.mjs`.

## Configure before launch (src/config.js → `KW.freeBirthSound`)
| Key | What |
|---|---|
| `businessWhatsApp` | `91XXXXXXXXXX` → real business number. The page refuses to open wa.me while it is a placeholder. |
| `metaPixelId` | Pixel ID. Empty = no Pixel code injected at all. |
| `site.url`, `site.ogImage` | Production domain + 1200×630 OG image. |
| `trust[]` | Only items with `verified: true` and a value render. |
| `reviews[]` | Only `approved: true` render; section hidden otherwise. |
| `legal.*` | Replace every `[CLIENT TO CONFIRM]`. |
| `months[n].tracks[].file` | Match the real file names; set `verified: true` + format/size only after checking the real file. |

## Deploy (Vercel)
1. Import the repo, set **Root Directory** = `karmic-waves`. `vercel.json` sets build (`npm run build`), output (`dist`) and security headers.
2. Add the environment variables from `.env.example` (Project → Settings → Environment Variables). Minimum for a real launch: `LEAD_STORAGE=supabase` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `PHONE_HASH_SALT`.
3. Run `docs/supabase-schema.sql` in Supabase.
4. Audio: set `AUDIO_SOURCE=url` + `AUDIO_BASE_URL` (public bucket/CDN with the 36 files) or `AUDIO_SOURCE=media` + `AUDIO_MEDIA_IDS_JSON` (uploaded to WhatsApp). The build fails if any of the 36 files is missing — intended.
5. WhatsApp Cloud API: set `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`; in Meta App → WhatsApp → Configuration set the callback URL to `https://<domain>/api/whatsapp-webhook` and subscribe to `messages`. Without these, every inbound lead is logged as `MANUAL_SEND_REQUIRED` with the 3 file names.
6. Meta Pixel: `metaPixelId` in `src/config.js`; optionally `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` for server-side dedupe (`META_CAPI_TEST_EVENT_CODE` while testing in Events Manager).
7. Static-only hosting (Netlify/other, no functions): set `allowWhatsAppWithoutBackend: true` in config — leads are NOT stored and the Pixel Lead will NOT fire; use only for a manual soft launch.

## Status words
WORKING · PENDING (missing credential/asset) · CLIENT TO CONFIRM — see the delivery report in the session / `docs/architecture.md`.
