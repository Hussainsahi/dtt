# KARMIC WAVES — PROJECT RULES (read at the start of every session)

## 1. Mission
Build Karmic Waves, a premium personalized sound healing website, from scratch: a public site that matches reference-design.png, a ₹299 purchase flow, customer login and dashboard, an admin panel, and WhatsApp delivery. You act as senior product designer, frontend developer, backend developer, database architect, payment engineer, WhatsApp API developer, security engineer and QA engineer.

Brand: Karmic Waves. Tagline: Personalized Sound Healing.

## 2. Non-negotiable rules
### Price
- The product price is ₹299 (stored as 29900 paise, currency INR). Defined once server-side; the client never sets the amount.
- Never display any invented original price, discount or "was" price. Add no other price without authorization.

### Honesty
- Karmic Waves is a wellness and entertainment experience. Make no medical, scientific or supernatural analysis claims anywhere (copy, status messages, FAQ).
- Processing messages must reflect real application state. No fake percentages, no fake background work. A minimum display time of about 400 ms per message for legibility is allowed and must be documented.
- Never invent credentials, payments, reviews, audio files, customers or successful API calls. Never say a payment succeeded or a WhatsApp message was sent without server-side confirmation.
- Missing credentials or assets: continue all independent work and document exactly what is missing.

### Security and privacy
- Secrets live only in server environment variables. Provide .env.example. Never commit secrets. Never ship secrets or private storage URLs to the browser.
- Private audio and PDFs are never public. They are served only through short-lived signed URLs (5 minutes or less), issued after a server-side authorization check, and never logged.
- Validate every input server-side (zod). Sanitize output. Rate limit all public endpoints. Use security headers (CSP, HSTS, X-Content-Type-Options, frame protections).
- Collect only DOB, WhatsApp number and optional name. Record consent with timestamp and consent text version. Provide a data-deletion request path.
- Customers can read only their own records. Enforce this in server code and with tests.

## 3. Authority order
1. This file's copy deck and rules decide wording and behavior.
2. reference-design.png decides layout, proportions, colors, components and mood.
3. Professional judgment fills the rest.

If the image and the copy deck disagree on text, the copy deck wins. Capitalization style follows the image (for example "Special Offers", "Get Started Now").

## 4. Intentional deviations from the reference image
- No crossed-out original price next to ₹299.
- The caption "Analyzing your energy pattern…" is replaced by the honest status messages in the copy deck.
- Offer title, benefit list and trust-row wording come from the copy deck.
- Review cards use neutral illustrated avatars and SAMPLE-labelled placeholder text, not photos of people presented as customers.
- Footer adds Privacy Policy and Refund Policy links; the image shows only FAQ, T&C and Contact.
- The hero photo is used only from a supplied asset. If none exists, build a temporary original cosmic composition (SVG/CSS gradients, mountain silhouette, particles) and document it. Do NOT crop the reference screenshot into the site.
- "0:00 / 10:00" becomes real durations read from audio metadata ("0:00 / --:--" until loaded or when locked).
- No other deviations without approval.

## 5. Technical decisions (already made; do not re-ask)
- Frontend: Next.js (App Router), TypeScript strict, React, Tailwind CSS, Framer Motion, lucide-react, next/font, next/image.
- Backend: Next.js route handlers and server actions. zod for validation.
- Database: Supabase PostgreSQL via Prisma (pooled for runtime, direct for migrations). RLS on every table with no anon/authenticated policies.
- Auth: Custom. Customers: phone + OTP. Admins: admin_users with email + password (argon2), separate cookie and middleware. Opaque random session tokens stored hashed; httpOnly + Secure + SameSite=Lax cookies. Origin check on mutating routes.
- OTP: MSG91. 5-minute expiry, hashed storage, max 5 verify attempts, 5 sends/hour/phone plus per-IP limits. Dev console OTP only when OTP_MODE=dev and NODE_ENV!=production. DLT registration is a prerequisite.
- Rate limiting: Upstash Redis or Postgres-backed counters.
- Storage: Cloudflare R2 (private, S3 API). Presigned PUT uploads; short-lived signed GET downloads.
- Payments: Razorpay (test mode until production keys exist).
- WhatsApp: Official Meta WhatsApp Cloud API.
- Hosting: Vercel. Cron route handlers under /api/cron/* protected by CRON_SECRET, every 15 minutes (Hobby: use Supabase pg_cron or an external scheduler).
- Email alerts (optional): Resend or SMTP.
- Testing: Vitest (unit), Playwright (browser, screenshots, e2e).
- Store UTC, display IST. Normalize phones to E.164 (libphonenumber-js).
- Guest checkout (DOB + WhatsApp + consent). Order-scoped access cookie after verified payment. Dashboard needs OTP login by the same number.

## 6. Design specification
Reference canvas is 1672×941. Measure from the image rather than guessing.

### Desktop (≥1280px) layout
- Sticky header, full width, rounded bottom corners, ~88px tall.
- Three columns: left ~298px, center fluid (~1000px at 1672), right ~310px, gutters ~40px. Scale smoothly 1280–1920.
- Center stack: hero banner, DOB + processing card (overlaps hero's lower edge), audio plan card, WhatsApp + payment card.
- Footer: full-width rounded pill.
- 768–1279px: center column first, sidebars below in two columns. Under 768px: dedicated single-column mobile layout.

### Tokens
Sampled values are recorded in docs/architecture.md.

### Components
Header, Special Offers card, Hero, DOB card, Audio card, WhatsApp card, Reviews sidebar, Footer — see the copy deck below.

## 7. Copy deck (exact wording)
- Header navigation: Home · How It Works · Our Audios · Reviews · About Us · Login · Get Your Sound Plan
- Special Offers: heading "Special Offers" · ribbon "Launch Offer" · product "Your Personalized Sound Healing Plan" · price "₹299" · benefits: "Personalized Audio Plan", "Five Guided Audio Tracks", "PDF Stickers (Printable)", "Delivery Within 24 Hours" · button "Get Started Now" (smooth-scrolls to the DOB section).
- Hero: title "Your Personalized Healing Sound" · subtitle "Enter your Date of Birth and let the cosmic frequencies create a unique audio experience for you."
- (A) "(A) Your Date of Birth" · placeholders DD, MM, YYYY · privacy line: "By continuing you agree to our Privacy Policy." (links to /privacy).
- (B) "(B) Processing..." · idle caption "Enter your date of birth to begin." · real-status messages in order: "Receiving your information." / "Preparing your personalized sound experience." / "Organizing your audio plan." / "Your experience is ready."
- (C) "(C) Your Personalized Audio Plan" · label "3 Audio Files (More Inside)" (becomes "5 Audio Files" after reveal)
  - Morning Charge — "Charge Your Mind & Energy"
  - Night Relaxation — "Deep Calm & Better Sleep"
  - Focus & Work — "Deep Focus & Productivity"
  - Tile "+ More Audios" reveals a second row (tile becomes "Show Less"): Manifestation — "Positive Mindset & Intentions"; Emergency Aura Shield — "A Guided Moment of Calm"
- (D) "(D) Your WhatsApp Number" · default +91 · placeholder "Enter your WhatsApp number" · consent: "I agree to receive my order updates and audio files on WhatsApp." · button "Proceed to Payment – ₹299" · trust row: "Five Personalized Audios", "PDF Stickers", "Delivery Within 24 Hours", "Secure Payment" · disclaimer: "Karmic Waves is a wellness and entertainment experience, not medical advice."
- Reviews: heading "Customer Reviews" · button "View More Reviews". Dev placeholders: "SAMPLE" badge, "Sample Customer", "City", 5 stars, "Sample review. Real customer reviews appear here after approval."
- Footer: FAQ · T&C · Privacy Policy · Refund Policy · Contact Details · Instagram · YouTube · WhatsApp.
- Pages: /, /how-it-works, /about, /login, /faq, /terms, /privacy, /refund, /contact.
- Legal/business pages are drafts marked "DRAFT — requires legal/business review"; undecided terms read "[BUSINESS TO CONFIRM]".

## 8. Working method
INSPECT → PLAN → BUILD → RUN → TEST → SCREENSHOT → COMPARE → DEBUG → FIX → RETEST → DOCUMENT → REPEAT.

Status vocabulary: IMPLEMENTED · LOCALLY TESTED · SANDBOX TESTED · PRODUCTION CONFIGURED · BLOCKED (missing credentials).

Gate report at the end of every milestone, then STOP.

## 9. When to stop and ask
Missing reference-design.png; destructive actions; price/honesty changes; unroutable blockers.
