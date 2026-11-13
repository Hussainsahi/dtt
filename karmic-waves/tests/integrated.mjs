/* Checks the integrated build: host ₹299 site + free tool view. Runs against the file directly (no server).
 * Usage: node tests/integrated.mjs [path]   (default dist/karmic-waves-website-with-free-tool.preview.html)
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = 'file://' + resolve(process.argv[2] || 'dist/karmic-waves-website-with-free-tool.preview.html');
const failures = [];
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failures.push(name); };

const browser = await chromium.launch();
for (const vp of [{ w: 390, h: 844 }, { w: 1366, h: 900 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(file);
  await page.waitForTimeout(300);
  const tag = `@${vp.w}`;

  // Host home intact
  check(`host home visible ${tag}`, await page.locator('[data-view="home"]').isVisible());
  check(`host #processing still exists ${tag}`, (await page.$('#processing')) !== null);
  check(`host price card intact ${tag}`, (await page.textContent('.offer-price .amount')).includes('₹299'));
  check(`promo card on home ${tag}`, await page.locator('.fb-promo').isVisible());
  check(`nav has Free Birth Sound ${tag}`, (await page.$$eval('#nav a', (a) => a.map((x) => x.textContent))).includes('Free Birth Sound'));
  check(`free view hidden on home ${tag}`, await page.locator('[data-view="free-birth-sound"]').isHidden());

  // Navigate via promo
  await page.click('.fb-promo a');
  await page.waitForTimeout(200);
  check(`route → #/free-birth-sound ${tag}`, (await page.evaluate(() => location.hash)) === '#/free-birth-sound');
  check(`home hidden, free view shown ${tag}`, await page.locator('[data-view="home"]').isHidden() && await page.locator('#fb-dob-console').isVisible());
  check(`title updated ${tag}`, (await page.title()).startsWith('Free Birth-Month Sound'));
  check(`no horizontal scroll ${tag}`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check(`no price inside free view ${tag}`, !(await page.textContent('[data-view="free-birth-sound"]')).includes('₹'));
  const col = await page.locator('.fb-page').boundingBox();
  check(`column ≤ 460px ${tag}`, col && col.width <= 460, String(col && col.width));

  // Flow
  await page.selectOption('#fb-dob-day', '31'); await page.selectOption('#fb-dob-month', '2'); await page.selectOption('#fb-dob-year', '2000');
  check(`31 Feb rejected ${tag}`, await page.locator('#fb-dob-error').isVisible());
  await page.selectOption('#fb-dob-day', '14'); await page.selectOption('#fb-dob-month', '11'); await page.selectOption('#fb-dob-year', '1990');
  check(`readout ${tag}`, (await page.textContent('#fb-readout')).includes('417 Hz'));
  await page.click('#fb-synth-btn');
  check(`processing shown ${tag}`, await page.locator('#fb-processing').isVisible());
  await page.waitForSelector('#fb-result:not([hidden])', { timeout: 9000 });
  check(`4 nodes done ${tag}`, await page.$$eval('#fb-nodes .node.is-done', (n) => n.length === 4));
  check(`kit name ${tag}`, (await page.textContent('#fb-result-title')).trim() === 'KarmicWaves_November_FreeKit');
  await page.fill('#fb-phone', '9876543210'); await page.click('#fb-send-btn'); await page.waitForTimeout(200);
  const status = await page.textContent('#fb-lead-status');
  check(`preview status shows WhatsApp message ${tag}`, status.includes('DOB: 14/11/1990'));

  // Modals + back to home
  await page.click('[data-modal="privacy"]'); check(`privacy modal ${tag}`, await page.locator('#fb-modal [role="dialog"]').isVisible());
  await page.keyboard.press('Escape'); check(`modal closes ${tag}`, await page.locator('#fb-modal').isHidden());
  if (!(await page.locator('#nav a[data-nav="home"]').isVisible())) await page.click('.menu-toggle'); // mobile: nav behind hamburger
  await page.click('#nav a[data-nav="home"]'); await page.waitForTimeout(200);
  check(`back to home ${tag}`, await page.locator('[data-view="home"]').isVisible() && await page.locator('[data-view="free-birth-sound"]').isHidden());
  check(`no console errors ${tag}`, errors.length === 0, errors.join(' | ').slice(0, 300));
  if (vp.w === 390) { await page.click('.fb-promo a'); await page.waitForTimeout(300); await page.screenshot({ path: 'docs/screenshots/integrated-390.png', fullPage: true }); }
  else { await page.screenshot({ path: 'docs/screenshots/integrated-home-1366.png' }); }
  await page.close();
}
await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED');
process.exit(failures.length ? 1 : 0);
