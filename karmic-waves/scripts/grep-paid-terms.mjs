/* Phase-1 guard: greps the shipped frontend (src/ + dist bundle) for paid-flow / old-offer terms.
 * Exit 1 on any unexpected hit. Allowed hits are listed with a justification.
 */
import { readFileSync } from 'node:fs';

const files = ['src/index.html', 'src/styles.css', 'src/config.js', 'src/app.js', 'dist/karmic-waves-website.html'];
const terms = ['299', '₹', 'razorpay', 'payment', 'price', 'order', 'checkout', 'purchase', 'refund', 'sticker', 'pdf', 'login', 'otp', 'msg91', 'five', '24 hours', 'manifestation', 'aura shield'];

/* Allowed: regex → why it is fine. */
const allow = [
  { re: /payment details on this page/i, why: 'Privacy notice states we do NOT collect payment details' },
  { re: /\border=created_at/i, why: 'PostgREST sort param (backend only, not in frontend)' },
  { re: /in order to/i, why: 'ordinary English' }
];

let bad = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const t of terms) {
      const re = /^[\w ]+$/.test(t) ? new RegExp(`\\b${t.replace(/ /g, '\\s+')}\\b`, 'i') : new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!re.test(line)) continue;
      const ok = allow.find((a) => a.re.test(line));
      if (ok) { console.log(`ALLOWED ${f}:${i + 1} [${t}] — ${ok.why}`); continue; }
      console.log(`HIT     ${f}:${i + 1} [${t}] ${line.trim().slice(0, 120)}`);
      bad++;
    }
  });
}
console.log(bad ? `\n${bad} unexpected hit(s)` : '\nclean: no paid-flow terms in the frontend');
process.exit(bad ? 1 : 0);
