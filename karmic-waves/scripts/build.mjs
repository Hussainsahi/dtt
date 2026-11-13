/* Builds dist/karmic-waves-website.html (single-file bundle) from src/.
 * Also copies src/ to dist/ unbundled for debugging and writes dist/robots.txt.
 * Usage: node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => resolve(root, 'src', f);
const dist = (f) => resolve(root, 'dist', f);
mkdirSync(dist(''), { recursive: true });

// Evaluate config.js in a sandbox to read site metadata (no secrets live there).
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(src('config.js'), 'utf8'), sandbox);
const cfg = sandbox.window.KW.config;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const fillMeta = (html) => html
  .replace(/\{\{SITE_TITLE\}\}/g, esc(cfg.site.title))
  .replace(/\{\{SITE_DESCRIPTION\}\}/g, esc(cfg.site.description))
  .replace(/\{\{SITE_URL\}\}/g, esc(cfg.site.url))
  .replace(/\{\{SITE_OG_IMAGE\}\}/g, esc(cfg.site.ogImage))
  .replace(/\{\{SITE_LOCALE\}\}/g, esc(cfg.site.locale));

let html = fillMeta(readFileSync(src('index.html'), 'utf8'));
const css = readFileSync(src('styles.css'), 'utf8');
const preview = process.env.KW_PREVIEW === '1';
const js = readFileSync(src('config.js'), 'utf8') + (preview ? '\nwindow.KW.config.previewMode = true; // client preview build\n' : '\n') + readFileSync(src('app.js'), 'utf8');

// Replacer FUNCTIONS: a replacement string would interpret `$$`, `$&` etc. inside the JS.
const bundle = html
  .replace(/<!-- build:css -->[\s\S]*?<!-- \/build:css -->/, () => `<style>\n${css}\n</style>`)
  .replace(/<!-- build:js -->[\s\S]*?<!-- \/build:js -->/, () => `<script>\n${js.replace(/<\/script/gi, () => '<\\/script')}\n</script>`);

if (preview) { writeFileSync(dist('karmic-waves-client-preview.html'), bundle); console.log('built dist/karmic-waves-client-preview.html (preview mode)'); process.exit(0); }
writeFileSync(dist('karmic-waves-website.html'), bundle);
writeFileSync(dist('index.html'), bundle); // Vercel serves dist/ as the static root
writeFileSync(dist('index.unbundled.html'), html);
for (const f of ['styles.css', 'config.js', 'app.js']) copyFileSync(src(f), dist(f));
writeFileSync(dist('robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.site.url.replace(/\/$/, '')}/sitemap.xml\n`);
writeFileSync(dist('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(cfg.site.url)}</loc></url></urlset>\n`);

console.log(`built dist/karmic-waves-website.html (${(bundle.length / 1024).toFixed(1)} KB)`);
