// Results screen visual check: injects a completed engine-generated game and screenshots the results at 3 sizes (also reports horizontal overflow).
//   node results-view.mjs <url> <completed-game.json> <outDir>
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const [url, json, out] = process.argv.slice(2); const state = fs.readFileSync(json, 'utf8');
const b = await chromium.launch({ channel: 'msedge', headless: true });
for (const [w, h] of [[390, 844], [360, 640], [1366, 768]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.addInitScript((s) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('lifetrack.game.v1', s); sessionStorage.setItem('x', '1'); } }, state);
  const p = await ctx.newPage(); await p.goto(url); await p.locator('button', { hasText: /Continue saved game/ }).first().click();
  await p.locator('.results-layout').waitFor(); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/res-${w}.png`, fullPage: false });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log(w, 'overflow', ov);
  await p.locator('.standings-card').scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/res-${w}-mid.png` }); await p.locator('.primary-column').evaluate((e) => e.scrollTo(0, 99999)); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/res-${w}-end.png` });
}
await b.close();
