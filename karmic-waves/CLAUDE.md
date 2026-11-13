# KARMIC WAVES — PROJECT RULES (read at the start of every session)

## 1. Mission
Karmic Waves is a **free Birth-Month Sound landing page** whose only job is to convert Meta Ads traffic into WhatsApp leads.

Flow: Landing → pick DOB → processing animation → result card → enter WhatsApp number → opens WhatsApp with a prefilled message → the 3 free tracks for the user's birth month are delivered on WhatsApp.

Out of scope on this page: pricing, checkout, payment gateways, paid pitches, problem quizzes, customer login, dashboards. Paid offers are handled inside WhatsApp, not here.

Brand: Karmic Waves. Positioning line: "Ancient Vedic Naad-Vigyan • 100% free birth-sound tool".

## 2. Non-negotiable rules
### Never fake
- No live counters, invented ratings, invented testimonials, invented kit counts.
- No "stored", "sent" or "delivered" state unless the backend confirmed it. Opening `wa.me` is **not** delivery.
- Meta Pixel `Lead` fires once, only after the backend accepted the lead, with an `event_id` for dedupe. Never send DOB or phone to the Pixel.
- No file-format or file-size claims unless the track entry is `verified: true` in config.
- No scientific, medical, psychological, financial or astrological validity claims. The month → element/Hz mapping is a traditional-inspired creative mapping; say so when needed, never call it astronomical or validated.

### Privacy and security
- Collect only DOB, phone (+91 only), consent flag + timestamp, and attribution (UTM / fbclid / source). Nothing else.
- Secrets live only in server environment variables. `.env.example` lists them. Nothing secret ships to the browser.
- Backend validates DOB and phone again, rate-limits, deduplicates leads, and retention is configurable.
- Legal pages state exactly what is stored and why. Unknown business facts read `[CLIENT TO CONFIRM]`.

### Accessibility and performance
- Semantic HTML, labelled inputs, keyboard operable, visible focus, skip link, `prefers-reduced-motion` honoured.
- No duplicate listeners; every rAF, interval and AudioContext is cancelled/closed. Audio only starts on a user click.
- Mobile-first, max content width 460px, fast on low-end Android. Limit loaded font weights.

## 3. Audio library contract
- 36 files = 12 months × 3 tracks: **Morning Aura Igniter**, **Daytime Focus Shield**, **11:00 PM Deep Night Ritual**.
- One editable object `KW.config.months` (in `src/config.js`), one entry per month: `{ element, hz, tattva, tracks: [{ id, title, file, format, sizeBytes, verified: false } ×3] }`.
- Element / Hz: Jan Prithvi 396 · Feb Jala 417 · Mar Agni 432.8 · Apr Vayu 528 · May Akasha 639 · Jun Jala 417 · Jul Agni 432.8 · Aug Prithvi 396 · Sep Vayu 528 · Oct Akasha 741 · Nov Jala 417 · Dec Akasha 852.
- Audio is chosen by **birth month only**. Day and year never affect selection.
- `scripts/validate-audio.mjs` must prove all 36 files resolve before deploy and fail loudly otherwise.

## 4. Architecture
- Static frontend, no framework. Source in `src/` (`index.html`, `styles.css`, `config.js`, `app.js`). `node scripts/build.mjs` inlines them into the single-file bundle `dist/karmic-waves-website.html`. **Edit source, rebuild the bundle.**
- Backend: Vercel serverless functions in `api/` (`lead.js`, `whatsapp-webhook.js`) with pluggable adapters in `lib/` for storage, Pixel Conversions API and WhatsApp delivery. Missing credentials → adapter reports `PENDING`, never pretends.
- Config lives in one place: `KW.config` (frontend) and environment variables (backend).

## 5. Copy deck (exact wording)
- Activity bar: "People are exploring their Birth-Month Sound Frequency right now."
- Badge: "ANCIENT VEDIC NAAD-VIGYAN • 100% FREE BIRTH-SOUND TOOL"
- H1: "Your Birth Date Has a Sound. Hear Yours — Free."
- Sub: "Every birth month carries its own vibration in traditional Vedic sound practice. Select your Date of Birth to explore your 3 Free Birth-Month Sound Tracks."
- Readout: "Natal Resonance Detected: [Element] • Base Acoustic Tuning: [Hz]"
- CTA: "Synthesize My Free Birth-Date Audio →"
- Processing nodes: "Matching your birth-month sound profile..." / "Preparing your Vedic-inspired acoustic frequency..." / "Layering Tanpura drone & Singing Bowl-inspired harmonics..." / "Your 3 Free Birth-Month Sound Tracks Are Ready!"
- Kit name: `KarmicWaves_[Month]_FreeKit` (no extension, no exact DOB).
- Form button: "Send My 3 Free Audio Tracks on WhatsApp"
- Consent: "By tapping above, you opt in to receive your customized birth-date audio files on WhatsApp. 100% Free & Private."
- WhatsApp prefill: "Namaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: [DOB]"
- Reviews title: "How People Experience Their Birth-Month Sound at 11:00 PM" (approved reviews from config only; section hidden otherwise)
- Disclaimer: "Disclaimer: Karmic Waves synthesizes personalized acoustic soundscapes inspired by traditional Vedic Naad principles for meditation, relaxation, and mindfulness. This tool does not provide medical, psychological, or financial advice, and results vary by individual practice."

## 6. Palette and type
Outer `#0A0E17`, inner `#141E30`, gold `#D4AF37`, light gold `#F3E5AB`, aqua `#00F2FE`, WhatsApp `#10B981`, text `#F8FAFC`, muted `#94A3B8`. Frosted glass, thin gold borders, aqua glow, cosmic radial gradients, sacred-geometry SVG.

## 7. Working method
INSPECT → BUILD → RUN → TEST (Playwright at 390 / 768 / 1280) → FIX → DOCUMENT. Status words: WORKING · PENDING (missing credential/asset) · CLIENT TO CONFIRM.

## 8. History
The earlier "₹299 personalized plan" direction (paid flow, five-track plan, OTP login, admin panel) is retired. Its scaffold is archived at git tag `backup/paid-plan-scaffold` and `docs/archive/`. Do not reintroduce it.
