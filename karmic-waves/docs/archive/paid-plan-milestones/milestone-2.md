# MILESTONE 2 — BACKEND, DATABASE, CUSTOMER SYSTEM
Goal: replace Milestone 1 stubs with a real, secure backend. No payments yet.

- Database (Supabase PostgreSQL via Prisma): users, customer_profiles, orders, payments, audio_categories, audio_files, audio_deliveries, pdf_files, notifications, reviews, admin_users, audit_logs + otp_challenges, sessions, consents, webhook_events, personalization_drafts. Indexes, constraints, migrations, seed for five audio categories, RLS on all tables.
- Personalization workflow: real DOB endpoint, anonymous session cookie, stored draft; the four processing messages follow real request stages.
- Customer registration/login via MSG91 OTP (expiry, hashing, attempt/resend/IP limits, logout).
- Customer dashboard (/dashboard): profile, DOB, orders, payments, PDFs, delivery status, WhatsApp contact, settings (edit name, data deletion).
- Audio system: categories, public sample, paid audio only for the owning customer after delivery complete via signed URLs; R2 presigned PUT/GET; public player reads from DB.
- Public reviews API: APPROVED, non-sample only.
- .env.example, env validation, security headers, rate limiting, audit log helper.

Acceptance: OTP works with MSG91 (or dev mode, marked BLOCKED for production); customers cannot read others' data (automated tests); no private URL or secret in client bundles or responses.

Tests: 4 (server), 8, 10, 11, 22, 23, 28, 29 + invalid/expired OTP, attempt limit, resend limit, logout, session fixation, DOB edge dates, mobile dashboard.
