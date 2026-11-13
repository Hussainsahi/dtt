/* Playwright smoke test for the free Birth-Month Sound landing page.
 * Usage: node tests/smoke.mjs [baseURL]   (default http://localhost:4173)
 * Exits 1 on any failure. Screenshots go to docs/screenshots/.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('docs/screenshots', { recursive: true });
const failures = [];
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failures.push(name); };

const browser = await chromium.launch();

async function session(label, ctxOpts, opts = {}) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  // Stub the backend; record what the page sends.
  const posted = [];
  await page.route('**/api/lead', async (route) => {
    posted.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, leadId: 'test-lead', eventId: 'evt-test', stored: 'pending' }) });
  });
  // Count Pixel Lead calls (page has no Pixel ID by default → we inject a fake fbq to observe).
  await page.addInitScript(() => { window.__leadCalls = 0; window.__waOpened = []; const o = window.open; window.open = (u) => { window.__waOpened.push(u); return { closed: false }; }; });
  await page.goto(base + (opts.query || ''), { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.fonts && document.fonts.ready; });
  return { ctx, page, errors, posted };
}

/* ---------- Desktop full flow ---------- */
{
  const { ctx, page, errors, posted } = await session('desktop', { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }, { query: '?utm_source=meta&utm_campaign=test&fbclid=abc' });
  check('homepage renders H1', (await page.textContent('h1')).includes('Your Birth Date Has a Sound'));
  check('no horizontal scroll (1280)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  check('trust strip hidden without verified data', await page.locator('#trust-strip').isHidden());
  check('reviews hidden without approved data', await page.locator('#reviews').isHidden());
  check('no DOB preselected', await page.evaluate(() => ['dob-day', 'dob-month', 'dob-year'].every((id) => document.getElementById(id).value === '')));
  check('CTA disabled initially', await page.locator('#synth-btn').isDisabled());
  const years = await page.$$eval('#dob-year option:not([disabled])', (o) => o.map((x) => +x.value));
  check('year range 1955–2008', Math.min(...years) === 1955 && Math.max(...years) === 2008);

  // Invalid combos
  await page.selectOption('#dob-day', '31'); await page.selectOption('#dob-month', '2'); await page.selectOption('#dob-year', '2000');
  check('31 Feb rejected', await page.locator('#dob-error').isVisible() && await page.locator('#synth-btn').isDisabled());
  await page.selectOption('#dob-day', '29');
  check('29 Feb 2000 accepted (leap)', await page.locator('#dob-error').isHidden() && await page.locator('#synth-btn').isEnabled());
  await page.selectOption('#dob-year', '1999');
  check('29 Feb 1999 rejected', await page.locator('#dob-error').isVisible());
  await page.selectOption('#dob-day', '31'); await page.selectOption('#dob-month', '4');
  check('31 Apr rejected', await page.locator('#dob-error').isVisible());

  // Valid November DOB
  const r0 = await page.evaluate(() => document.getElementById('mandala').style.transform);
  await page.selectOption('#dob-day', '14'); await page.selectOption('#dob-month', '11'); await page.selectOption('#dob-year', '1990');
  const r1 = await page.evaluate(() => document.getElementById('mandala').style.transform);
  check('mandala rotates on change', r0 !== r1, `${r0} → ${r1}`);
  const readout = await page.textContent('#readout');
  check('readout shows Jala • 417 Hz', readout.includes('Jala') && readout.includes('417 Hz'), readout.trim());
  await page.screenshot({ path: 'docs/screenshots/desktop-console.png' });

  // Processing
  const audioBefore = await page.evaluate(() => !!window.__audioCtxCreated);
  await page.addInitScript(() => {});
  await page.evaluate(() => { const AC = window.AudioContext; window.__ctxs = []; window.AudioContext = function () { const c = new AC(); window.__ctxs.push(c); return c; }; });
  await page.click('#synth-btn');
  check('selectors locked during processing', await page.locator('#dob-month').isDisabled());
  check('processing visible', await page.locator('#processing').isVisible());
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 7500) {
    const active = await page.$$eval('.node', (n) => n.map((x) => x.classList.contains('is-active') || x.classList.contains('is-done')));
    const idx = active.lastIndexOf(true);
    if (idx >= 0 && seen[seen.length - 1] !== idx) seen.push(idx);
    if (!(await page.locator('#result').isHidden())) break;
    await page.waitForTimeout(150);
  }
  check('nodes light in order 0→3', JSON.stringify(seen) === '[0,1,2,3]', JSON.stringify(seen));
  check('audio context created only after click', !audioBefore && (await page.evaluate(() => window.__ctxs.length)) === 1);
  check('hz counter reached 528.0', (await page.textContent('#hz-value')) === '528.0');
  await page.waitForSelector('#result:not([hidden])', { timeout: 3000 });
  check('all 4 nodes done with checkmarks', await page.$$eval('.node.is-done', (n) => n.length === 4));
  check('audio context closed after processing', await page.evaluate(() => window.__ctxs.every((c) => c.state === 'closed')));
  check('result kit name', (await page.textContent('#result-title')).trim() === 'KarmicWaves_November_FreeKit');
  const tracks = await page.$$eval('#result-tracks .result__track-title', (n) => n.map((x) => x.textContent));
  check('result lists 3 tracks', JSON.stringify(tracks) === JSON.stringify(['Morning Aura Igniter', 'Daytime Focus Shield', '11:00 PM Deep Night Ritual']));
  check('no size/format claims while unverified', (await page.$$('.result__track-meta')).length === 0);
  await page.screenshot({ path: 'docs/screenshots/desktop-result.png' });

  // Phone validation
  await page.fill('#phone', '12345');
  await page.click('#send-btn');
  check('short phone rejected', await page.locator('#phone-error').isVisible() && posted.length === 0);
  await page.fill('#phone', '5123456789');
  await page.click('#send-btn');
  check('number starting with 5 rejected', await page.locator('#phone-error').isVisible() && posted.length === 0);
  await page.fill('#phone', '9876543210');
  // Business number is a placeholder in config → page must refuse to open wa.me.
  await page.click('#send-btn');
  await page.waitForTimeout(300);
  check('refuses to open WhatsApp with placeholder business number', posted.length === 0 && (await page.textContent('#lead-status')).includes('not configured'));

  // Now configure a business number + fake Pixel and run the real path.
  await page.evaluate(() => { window.KW.freeBirthSound.businessWhatsApp = '919999999999'; window.fbq = function () { if (arguments[1] === 'Lead') window.__leadCalls++; }; window.KW.fbs.pixel.loaded = true; });
  await page.click('#send-btn');
  await page.waitForFunction(() => window.__waOpened.length > 0, null, { timeout: 5000 }).catch(() => {});
  check('lead POSTed once', posted.length === 1);
  const p = posted[0] || {};
  check('payload has dob/month/phone/consent/attribution', p.dob === '1990-11-14' && p.birthMonth === 11 && p.phone === '+919876543210' && p.consent === true && !!p.consentAt && p.attribution.utm_source === 'meta' && p.attribution.fbclid === 'abc');
  const wa = (await page.evaluate(() => window.__waOpened))[0] || '';
  check('wa.me targets business number', wa.startsWith('https://wa.me/919999999999?text='), wa);
  check('wa.me text correct & no phone in text', decodeURIComponent(wa.split('text=')[1] || '') === 'Namaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: 14/11/1990');
  check('Pixel Lead fired exactly once', (await page.evaluate(() => window.__leadCalls)) === 1);
  // Second click: re-open only, no second lead/Pixel.
  await page.click('#send-btn');
  await page.waitForTimeout(400);
  check('second click does not re-fire Pixel Lead', (await page.evaluate(() => window.__leadCalls)) === 1);

  // Modals
  await page.click('[data-modal="privacy"]');
  check('privacy modal opens with dialog role', await page.locator('[role="dialog"]').isVisible());
  await page.keyboard.press('Escape');
  check('Esc closes modal', await page.locator('#modal').isHidden());
  check('no console errors (desktop)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------- Mobile 390 ---------- */
{
  const { ctx, page, errors } = await session('mobile', { ...devices['iPhone 12'], viewport: { width: 390, height: 844 } });
  check('no horizontal scroll (390)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const btnH = await page.locator('#synth-btn').boundingBox();
  check('touch target ≥ 48px', btnH && btnH.height >= 48);
  await page.screenshot({ path: 'docs/screenshots/mobile-390.png', fullPage: true });
  check('no console errors (390)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------- Tablet 768 ---------- */
{
  const { ctx, page, errors } = await session('tablet', { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
  check('no horizontal scroll (768)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const w = await page.locator('.fb-page').boundingBox();
  check('column capped at 460px', w && w.width <= 460);
  await page.screenshot({ path: 'docs/screenshots/tablet-768.png', fullPage: true });
  check('no console errors (768)', errors.length === 0);
  await ctx.close();
}

/* ---------- Reduced motion ---------- */
{
  const { ctx, page, errors } = await session('rm', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.selectOption('#dob-day', '5'); await page.selectOption('#dob-month', '3'); await page.selectOption('#dob-year', '1988');
  check('reduced motion: mandala does not rotate', (await page.evaluate(() => document.getElementById('mandala').style.transform)) === '');
  await page.click('#synth-btn');
  await page.waitForSelector('#result:not([hidden])', { timeout: 9000 });
  check('reduced motion: flow still completes (March)', (await page.textContent('#result-title')).trim() === 'KarmicWaves_March_FreeKit');
  check('no console errors (reduced motion)', errors.length === 0);
  await ctx.close();
}

/* ---------- Month mapping: 12 months → 36 distinct files ---------- */
{
  const { ctx, page } = await session('map', { viewport: { width: 390, height: 844 } });
  const res = await page.evaluate(() => {
    const m = window.KW.freeBirthSound.months; const files = new Set(); const problems = [];
    const expect = { 1: ['Prithvi', 396], 2: ['Jala', 417], 3: ['Agni', 432.8], 4: ['Vayu', 528], 5: ['Akasha', 639], 6: ['Jala', 417], 7: ['Agni', 432.8], 8: ['Prithvi', 396], 9: ['Vayu', 528], 10: ['Akasha', 741], 11: ['Jala', 417], 12: ['Akasha', 852] };
    for (let i = 1; i <= 12; i++) {
      const mo = m[i]; if (!mo) { problems.push('missing month ' + i); continue; }
      if (mo.element !== expect[i][0] || mo.hz !== expect[i][1]) problems.push('wrong element/hz for ' + i);
      if (mo.tracks.length !== 3) problems.push('month ' + i + ' has ' + mo.tracks.length + ' tracks');
      mo.tracks.forEach((t) => { if (files.has(t.file)) problems.push('duplicate file ' + t.file); files.add(t.file); });
      const titles = mo.tracks.map((t) => t.title).join('|');
      if (titles !== 'Morning Aura Igniter|Daytime Focus Shield|11:00 PM Deep Night Ritual') problems.push('titles wrong for ' + i);
    }
    return { count: files.size, problems };
  });
  check('12 months × 3 distinct files = 36', res.count === 36 && res.problems.length === 0, res.problems.join('; '));
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED');
process.exit(failures.length ? 1 : 0);
