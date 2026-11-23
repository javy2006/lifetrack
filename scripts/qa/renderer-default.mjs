// LifeTrack renderer default QA (M8): 3D by default on tablet/desktop, 2D on phones, toggle + persistence.
// Same setup as journey.mjs:  node ../lt-qa/renderer-default.mjs http://127.0.0.1:4174/
import { chromium } from 'playwright-core';
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const res = []; const check = (n, ok, d = '') => { res.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`); };
async function start(page) {
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base);
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/);
  await page.waitForTimeout(2000);
}
const which = async (page) => (await page.locator('.board-3d canvas').count()) ? '3d' : (await page.locator('.life-board').count()) ? 'svg' : 'none';
for (const [tag, vp, want] of [['desktop', { width: 1440, height: 900 }, '3d'], ['laptop', { width: 1280, height: 720 }, '3d'], ['tablet', { width: 768, height: 1024 }, '3d'], ['phone', { width: 390, height: 844 }, 'svg'], ['landscape', { width: 844, height: 390 }, 'svg']]) {
  const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await start(page);
  check(`${tag}: default board is ${want}`, (await which(page)) === want, await which(page));
  const t = page.locator('button.renderer-toggle');
  if (!(await t.isVisible())) {
    // Landscape phones hide the heading row (M1); a choice stored in portrait still applies.
    await page.evaluate(() => localStorage.setItem('lifetrack.renderer.v1', '3d'));
    await page.reload(); await page.locator('button', { hasText: /Continue saved game/ }).first().click(); await page.waitForTimeout(2000);
    check(`${tag}: stored 3D choice applies`, (await which(page)) === '3d');
    check(`${tag}: no console errors`, errs.length === 0, errs.join(' | '));
    await ctx.close(); continue;
  }
  check(`${tag}: toggle aria-pressed matches`, (await t.getAttribute('aria-pressed')) === String(want === '3d'));
  await t.click(); await page.waitForTimeout(1500);
  const other = want === '3d' ? 'svg' : '3d';
  check(`${tag}: toggle switches to ${other}`, (await which(page)) === other);
  await page.reload();
  await page.locator('button', { hasText: /Continue saved game/ }).first().click();
  await page.waitForTimeout(2000);
  check(`${tag}: choice persists across reload/resume`, (await which(page)) === other, await which(page));
  check(`${tag}: no console errors`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await browser.close();
process.exit(res.every(Boolean) ? 0 : 1);
