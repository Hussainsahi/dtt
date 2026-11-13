/* Integrates the free Birth-Month Sound tool into the original single-file ₹299 site as a routed view.
 *
 *   node scripts/integrate.mjs            → dist/karmic-waves-website-with-free-tool.html
 *   KW_PREVIEW=1 node scripts/integrate.mjs → dist/karmic-waves-website-with-free-tool.preview.html
 *
 * Host:  host/karmic-waves-website.src.html (the client's original file, untouched)
 * Tool:  src/index.html + src/styles.css + src/config.js + src/app.js (single source of truth)
 *
 * Everything from the tool is namespaced so nothing collides with the host:
 *   - every id gets the prefix "fb-" (host already has #processing, #main, #reviews, …)
 *   - CSS is scoped under .fbs (tokens move from :root to .fbs; keyframes renamed fbs-*)
 *   - JS queries are rooted at #fb-root; config lives at KW.freeBirthSound, helpers at KW.fbs
 * The host gets: a nav item + router title ("free-birth-sound"), the view, and a promo card on the home page.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(resolve(root, p), 'utf8');
const preview = process.env.KW_PREVIEW === '1';

let host = rd('host/karmic-waves-website.src.html');
const toolHtml = rd('src/index.html');
const toolCss = rd('src/styles.css');
const toolJs = rd('src/config.js') + (preview ? '\nwindow.KW.freeBirthSound.previewMode = true; // client preview build\n' : '\n') + rd('src/app.js');

const must = (cond, msg) => { if (!cond) { console.error('integrate: ' + msg); process.exit(1); } };

/* ---------------- 1. Fragment: body of the tool page ---------------- */
let frag = toolHtml.slice(toolHtml.indexOf('<body>') + 6, toolHtml.indexOf('<!-- build:js -->'));
frag = frag.replace(/<a class="skip-link"[\s\S]*?<\/a>\s*/, '');                       // host has its own skip link
frag = frag.replace(/<div class="cosmos" aria-hidden="true">[\s\S]*?<\/div>\s*<\/div>\s*/, ''); // host has its own background
frag = frag.replace('<main id="main" class="fb-page">', '<div id="main" class="fb-page">');
frag = frag.replace(/<\/main>/, '</div>');
frag = frag.replace(/\s*<p class="footer__copy">[\s\S]*?<\/p>/, '');                      // host footer already carries ©

/* ---------------- 2. Prefix every id and every reference to it ---------------- */
const ids = [...new Set([...frag.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))];
const pre = (id) => 'fb-' + id;
for (const id of ids) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  frag = frag
    .replace(new RegExp(`\\bid="${esc}"`, 'g'), () => `id="${pre(id)}"`)
    .replace(new RegExp(`\\bfor="${esc}"`, 'g'), () => `for="${pre(id)}"`)
    .replace(new RegExp(`href="#${esc}"`, 'g'), () => `href="#${pre(id)}"`)
    .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), () => `url(#${pre(id)})`)
    .replace(new RegExp(`(aria-(?:labelledby|describedby|controls)="[^"]*)\\b${esc}\\b`, 'g'), (_, a) => `${a}${pre(id)}`);
}
// aria-describedby with two tokens ("phone-help phone-error"): the loop above handled each token once.

/* ---------------- 3. JS: root queries at #fb-root, prefixed id strings, namespaced globals ---------------- */
let js = toolJs;
// Replacer FUNCTIONS: a replacement string would turn "$$" into "$".
js = js.replace("var $ = function (sel, root) { return (root || document).querySelector(sel); };",
  () => "var fbRoot = document.getElementById('fb-root');\n  var $ = function (sel, root) { return (root || fbRoot).querySelector(sel); };");
js = js.replace("var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };",
  () => "var $$ = function (sel, root) { return Array.prototype.slice.call((root || fbRoot).querySelectorAll(sel)); };");
must(js.includes('var $$ = function (sel, root) { return Array.prototype.slice.call((root || fbRoot)'), '$$ helper lost');
must(js.includes('fbRoot'), 'could not root the query helpers');
for (const id of ids) js = js.replace(new RegExp(`'#${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'), () => `'#${pre(id)}'`);
js = js.replace(/'#tpl-' \+ kind/g, "'#fb-tpl-' + kind");
must(js.includes("'#fb-dob-day'") && js.includes("'#fb-tpl-'"), 'id prefixing in JS failed');

/* ---------------- 4. CSS: scope under .fbs ---------------- */
function scopeCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([a-zA-Z-]+)/g)].map((m) => m[1]);
  let out = '';
  let i = 0;
  function readBlock(start) { // returns [inner, endIndex] for the block whose "{" is at start
    let depth = 0, j = start;
    for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}') { depth--; if (depth === 0) break; } }
    return [css.slice(start + 1, j), j];
  }
  function scopeSelector(sel) {
    sel = sel.trim(); if (!sel) return null;
    if (sel === ':root') return '.fbs';
    if (/^(html|\*)\b/.test(sel)) return null;
    if (/^body\.modal-open$/.test(sel)) return sel;             // body scroll lock stays global
    if (/^body\b/.test(sel)) return null;
    return '.fbs ' + sel;
  }
  function scopeRules(src) {
    let res = '', k = 0;
    while (k < src.length) {
      const open = src.indexOf('{', k); if (open === -1) break;
      const head = src.slice(k, open).trim();
      let depth = 0, close = open;
      for (; close < src.length; close++) { if (src[close] === '{') depth++; else if (src[close] === '}') { depth--; if (depth === 0) break; } }
      const body = src.slice(open + 1, close);
      if (head.startsWith('@media') || head.startsWith('@supports')) res += `${head} {\n${scopeRules(body)}}\n`;
      else if (head.startsWith('@keyframes')) res += `${head.replace(/@keyframes\s+/, '@keyframes fbs-')} {${body}}\n`;
      else {
        const sels = head.split(',').map(scopeSelector).filter(Boolean);
        if (sels.length) res += `${sels.join(', ')} {${body}}\n`;
      }
      k = close + 1;
    }
    return res;
  }
  out = scopeRules(css);
  for (const name of keyframes) out = out.replace(new RegExp(`(animation(?:-name)?:\\s*)${name}\\b`, 'g'), `$1fbs-${name}`);
  out = out.replace('"Inter", system-ui', "'Poppins', 'Inter', system-ui"); // match the host's body font
  return out;
}
const scopedCss = scopeCss(toolCss) + `
/* host overrides inside the free-tool view */
.fbs ul li, .fbs ol li { list-style: none; }
.fbs { font-family: var(--font-body); color: var(--text); }
.page.fbs { max-width: none; padding-left: 0; padding-right: 0; }
.page.fbs h1, .page.fbs h2, .page.fbs h3, .page.fbs p, .page.fbs li { font-family: inherit; }
/* host classes that share a name with tool classes (.hero, .processing, .review, .toast) */
.fbs .hero { display: block; min-height: 0; background: none; border: 0; border-radius: 0; box-shadow: none; overflow: visible; position: static; margin: 0; }
.fbs .processing { text-align: left; }
.fbs .review { display: block; }
.fbs .toast { position: fixed; }
/* promo card on the host home page (host tokens) */
.fb-promo { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; padding: 18px 18px 20px; border-color: rgba(247,196,108,.45); }
.fb-promo__eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-text); font-weight: 600; margin: 0 0 4px; }
.fb-promo h2 { font-family: var(--font-head); font-size: 24px; line-height: 1.15; margin: 0 0 6px; }
.fb-promo p { color: var(--muted); font-size: 14px; margin: 0; }
.fb-promo .btn { width: 100%; white-space: normal; text-align: center; line-height: 1.25; padding: 12px 16px; }
.fbs .card, .fbs .reviews { scroll-margin-top: calc(var(--header-h, 88px) + 12px); } /* sticky host header */
`;
must(scopedCss.includes('.fbs .card {') && scopedCss.includes('@keyframes fbs-beam'), 'CSS scoping failed');

/* ---------------- 5. Inject into the host ---------------- */
const view = `<div class="page fbs" data-view="free-birth-sound" hidden>\n<div id="fb-root">\n${frag}\n</div>\n</div>\n`;
const promo = `
      <!-- Free Birth-Month Sound tool promo -->
      <section class="card fb-promo reveal" aria-labelledby="fb-promo-heading">
        <div>
          <p class="fb-promo__eyebrow">New · 100% free</p>
          <h2 id="fb-promo-heading">Your Birth Date Has a Sound. Hear Yours — Free.</h2>
          <p>Three free Birth-Month Sound Tracks, delivered on WhatsApp. No purchase needed.</p>
        </div>
        <a class="btn btn-gold" href="free-birth-sound.html">Hear My Birth Sound — Free</a>
      </section>

`;

const inject = (needle, replacement, what) => { must(host.includes(needle), `host anchor not found: ${what}`); host = host.replace(needle, () => replacement); };
inject('</style>', `</style>\n<style id="fbs-style">\n${scopedCss}</style>`, 'first </style>');
inject('<div class="page" data-view="how-it-works" hidden>', view + '<div class="page" data-view="how-it-works" hidden>', 'how-it-works view');
inject('    </aside>\n', promo + '    </aside>\n', 'left sidebar (first </aside>)'); // under Special Offers; the DOB card overlaps the hero so the center column is unsafe
inject("{ label: 'About Us', href: 'about.html', key: 'about' }", "{ label: 'About Us', href: 'about.html', key: 'about' },\n    { label: 'Free Birth Sound', href: 'free-birth-sound.html', key: 'free-birth-sound' }", 'nav items');
inject("var titles = {", "var titles = {'free-birth-sound':\"Free Birth-Month Sound — Karmic Waves\",", 'router titles');
inject("<script>\n/* Single-file router:", `<script>\n/* Free Birth-Month Sound tool (namespaced: ids fb-*, CSS .fbs, config KW.freeBirthSound) */\n${js.replace(/<\/script/gi, () => '<\\/script')}\n</script>\n<script>\n/* Single-file router:`, 'router script');

mkdirSync(resolve(root, 'dist'), { recursive: true });
const out = preview ? 'dist/karmic-waves-website-with-free-tool.preview.html' : 'dist/karmic-waves-website-with-free-tool.html';
writeFileSync(resolve(root, out), host);
console.log(`integrated → ${out} (${(host.length / 1024).toFixed(1)} KB, ${ids.length} ids namespaced)`);
