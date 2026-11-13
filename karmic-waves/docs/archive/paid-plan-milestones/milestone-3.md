# MILESTONE 3 — PAYMENT (₹299) AND PDF DELIVERY
Goal: secure Razorpay (test mode) purchase flow and immediate PDF sticker delivery after verified payment.

- Checkout: server validates DOB, number, consent; records consent; creates order (29900 paise INR, server-defined); creates Razorpay order; opens Checkout. Client never sends an amount.
- Verification: timing-safe HMAC-SHA256 check; fetch payment from Razorpay API and confirm status/amount/currency/order; capture if authorized; idempotent markOrderPaid (transaction + row lock). Never trust frontend callbacks.
- Webhooks: verify X-Razorpay-Signature on raw body; payment.captured, payment.failed, order.paid, refunds; webhook_events unique event ID.
- State machine CREATED → PENDING → PAID | FAILED → REFUNDED; retry on closed popup; reconciliation cron.
- Refunds revoke PDF access (configurable).
- On PAID: paid_at, delivery_deadline = +24h, link PDF, audio deliveries PENDING, admin notifications, order-scoped cookie.
- PDF stickers private in R2, signed URL download, every download logged, inaccessible before payment.
- Success/failure screens (deadline in IST).

Tests: 12, 13, 14, 15, 16, 17 + failed payment, popup closed/retry, tampered signature, wrong amount/currency, refund, reconciliation, concurrent verify + webhook. Razorpay mocked in automated tests; SANDBOX TESTED only after a real test-key run.
