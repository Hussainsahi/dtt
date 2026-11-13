# MILESTONE 1 — COMPLETE FRONTEND (no real backend yet)

Goal: the entire public site, matching reference-design.png, with working interactions. Backend calls are replaced by clearly marked stubs (`// STUB: replaced in Milestone 2`).

## Build
- Project setup, documents, design tokens from sampled reference colors, Playwright + screenshot script.
- Header: sticky, dark glass, glowing active indicator (scroll-spy on /, route-based elsewhere), smooth scrolling, hamburger on mobile.
- Special Offers sidebar per copy deck; Get Started Now scrolls to DOB; headphone illustration with animated sound wave.
- Hero: supplied asset or documented temporary composition. Particles, ECG squiggles, reduced-motion fallback.
- Section A (DOB): three dropdowns; required, real calendar date (leap years, month lengths), no future dates, inline errors. Arrow submits. No second DOB.
- Section B (processing): idle, processing, ready, error. Circular loader, ECG lines, frequency lines, "step N of 4" (no percentage). Each message shown when its stubbed async step completes.
- Section C (audio): three cards + "+ More Audios" tile (reveal / Show Less). Custom player: play/pause, waveform from precomputed peaks, played-part highlight, click-to-seek, current time + duration from metadata. One audio at a time; pause keeps position. ECG visualizer moves while playing. One free sample from /assets; if none supplied, disabled "Sample coming soon" state. Locked cards show a lock badge; play → "Available after purchase" + scroll to D.
- Section D (WhatsApp): country code selector (+91 default), validation (E.164, India 10-digit mobile rule), required consent, button disabled until valid; stub notice "Payment is added in Milestone 3". Trust row + disclaimer.
- Reviews sidebar: SAMPLE placeholders (development only), View More Reviews stub.
- Footer: all links + social icons (placeholder URLs from config).
- Pages: how-it-works, about, faq, terms, privacy, refund, contact, login (UI only: number step + OTP step).
- SEO / performance / accessibility; responsive (360, 390, 430, 768, 1024, 1366, 1672) with no horizontal scroll.

## Acceptance criteria
- At 1672×941 the page is visually close to the reference. Remaining differences listed; major ones fixed.
- Every deviation is in the approved list in CLAUDE.md section 4.
- No ₹599 anywhere (automated grep test).
- Zero critical console errors. No broken links.

## Tests
1, 2, 3, 4 (client), 5, 6, 7, 9 (client), 25, 26, 27 + More Audios reveal/Show Less, one-audio-at-a-time, locked-card behavior, reduced motion, keyboard-only flow.
