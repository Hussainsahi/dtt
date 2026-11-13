# MILESTONE 4 — ADMIN, WHATSAPP, NOTIFICATIONS, DELIVERY TRACKING
Goal: the business operations system, so no paid order is forgotten.

- Admin auth (/admin): email + argon2 password, separate cookie/middleware, rate limiting, roles OWNER/ADMIN/SUPPORT, `npm run admin:create`, audit log.
- Overview metrics; customer, order, audio (direct R2 upload, peaks + duration), PDF and review management.
- WhatsApp Cloud API: webhook (GET challenge, POST X-Hub-Signature-256), status updates, approved confirmation template, audio media delivery with template fallback, ACCEPTED/DELIVERED/FAILED from real API data only, manual fallback with explicit admin confirmation + note.
- Order COMPLETED only when all five audios are assigned and delivery confirmed.
- Notification bell and types; delivery queue sorted by deadline; /api/cron/deadlines every 15 minutes (idempotent).
- Customer side unlocks five audios when COMPLETED.
- Ops docs: backups, Vercel deployment, environment setup, production checklist.

Tests: 17, 18, 19, 20, 21, 24, 30 + bell counts, deadline alerts once, review approve/reject, manual fallback, WhatsApp signature rejection, unauthorized access on every admin route. Then FINAL CHECK.
