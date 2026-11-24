// LifeTrack renderer QA (UX P3): the 3D board is the default on every viewport, there is no
// 2D/3D toggle in the game UI, and an old stored "svg" choice no longer applies.
// Same setup as journey.mjs:  node ../lt-qa/renderer-default.mjs http://127.0.0.1:4174/
import { chromium } from 'playwright-core';
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const res = []; const check = (n, ok, d = '') => { res.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`); };
const which = async (page) => (await page.locator('.board-3d canvas').count()) ? '3d' : (await page.locator('.life-board').count()) ? 'svg' : 'none';
for (const [tag, vp] of [['desktop', { width: 1440, height: 900 }], ['laptop', { width: 1280, height: 720 }], ['tablet', { width: 768, height: 1024 }], ['phone', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(() => { try { localStorage.setItem('lifetrack.renderer.v1', 'svg'); } catch {} });
  const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base);
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/); await page.locator('.td-start, .td-skip').first().waitFor({ timeout: 30000 }); if (await page.locator('.td-skip').count()) await page.locator('.td-skip').click(); await page.locator('.td-start').click();
  await page.waitForTimeout(2000);
  check(`${tag}: 3D board is shown (old stored 2D choice ignored)`, (await which(page)) === '3d', await which(page));
  check(`${tag}: no 2D/3D toggle in the game UI`, (await page.locator('button.renderer-toggle').count()) === 0);
  check(`${tag}: no console errors`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await browser.close();
process.exit(res.every(Boolean) ? 0 : 1);
