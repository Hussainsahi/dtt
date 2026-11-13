# ACCEPTANCE MATRIX AND FINAL CHECK

| # | Scenario | Milestone |
|---|---|---|
| 1 | Homepage loads | 1 |
| 2 | Header navigation works | 1 |
| 3 | Special Offers button works | 1 |
| 4 | DOB validation works (client in M1, server in M2) | 1, 2 |
| 5 | Processing animation works | 1 |
| 6 | Audio playback works | 1 |
| 7 | ECG visualizer responds to playback | 1 |
| 8 | Audio access restrictions work | 2 |
| 9 | WhatsApp number validation works | 1 |
| 10 | Customer registration works | 2 |
| 11 | OTP login works with configured provider | 2 |
| 12 | Payment order creation works | 3 |
| 13 | Payment verification works | 3 |
| 14 | Duplicate webhook is handled safely | 3 |
| 15 | PDF unlocks after payment | 3 |
| 16 | PDF remains locked before payment | 3 |
| 17 | Admin receives payment alert | 3, 4 |
| 18 | Admin can upload audio | 4 |
| 19 | Admin can assign audio | 4 |
| 20 | Admin can mark delivery completed | 4 |
| 21 | WhatsApp delivery works with configured credentials | 4 |
| 22 | Customer dashboard works | 2, 4 |
| 23 | Customer cannot access another customer's data | 2 |
| 24 | Admin permissions work | 4 |
| 25 | Mobile layout works (360, 390, 430, tablet, laptop, desktop) | 1 |
| 26 | No broken links | 1 |
| 27 | No critical console errors | 1 |
| 28 | No exposed secrets | 2, 4 |
| 29 | No unauthorized file access | 2, 4 |
| 30 | All critical workflows pass | 4 |

## FINAL CHECK (after Milestone 4)
Re-run every scenario, then verify and report: design accuracy, responsive layout, navigation, DOB validation, audio + ECG, login, DB security and RLS, Razorpay verification, PDF access control, admin, audio assignment, WhatsApp, notifications, delivery tracking, SEO, accessibility, no invented original price, no exposed secrets, no unauthorized access, no console errors, no broken links, deployment readiness. Honest checklist with the five status labels; list credentials and assets still needed.
