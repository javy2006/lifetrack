// LifeTrack presentation-demo QA: the demo runs by itself, every control works, it reaches the
// final results, and the player's own saved game and board are byte-for-byte untouched.
//   node demo.mjs http://127.0.0.1:5174/ ./shots
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://127.0.0.1:5174/', out = './shots'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const fails = [], errors = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); if (!ok) fails.push(name); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });

for (const [tag, viewport] of [['desk', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror ${e.message}`));
  page.on('dialog', (d) => d.accept());
  const saved = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('lifetrack.') && !k.includes('lang') && !k.includes('audio')).map((k) => [k, localStorage.getItem(k)])));
  // A real game in progress first: collect income so there is a save to protect.
  await page.goto(url);
  await page.locator('.hero-actions .button').first().click();
  await page.locator('button.character-option').first().click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.game-action-layer .button').last().click();
  await page.waitForTimeout(400);
  await page.locator('.exit-button').click();
  const before = await saved();
  check(`${tag}: a normal save exists before the demo`, Boolean(before['lifetrack.game.v1']));

  await page.locator('.demo-link').click();
  await page.locator('.demo-panel').waitFor({ timeout: 15000 });
  check(`${tag}: demo panel shows`, await page.locator('.demo-panel').isVisible());
  check(`${tag}: opening narration shows`, await page.locator('.demo-tip').isVisible().catch(() => false));
  await page.screenshot({ path: path.join(out, `demo-${tag}-1-start.png`) });
  // It plays by itself: at 8x it reaches the decisions and then a later phase without any clicks.
  await page.locator('.demo-speed', { hasText: '8×' }).click();
  check(`${tag}: speed 8x is selected`, (await page.locator('.demo-speed', { hasText: '8×' }).getAttribute('aria-pressed')) === 'true');
  const reached = await page.locator('.summary-card').waitFor({ timeout: 60000 }).then(() => true, () => false);
  check(`${tag}: autopilot plays month 1 through to the recap`, reached);
  await page.screenshot({ path: path.join(out, `demo-${tag}-2-recap.png`) });
  // Pause holds the state.
  await page.locator('.demo-panel .demo-btn').first().click();
  const heldTitle = await page.locator('.content-heading h1').textContent();
  await page.waitForTimeout(2500);
  check(`${tag}: pause holds the current step`, (await page.locator('.content-heading h1').textContent()) === heldTitle && await page.locator('.demo-state').isVisible());
  // Next milestone: jumps to the next month's recap, then pauses there.
  await page.getByRole('button', { name: /next milestone/i }).click();
  const month2 = await page.locator('.summary-card .eyebrow', { hasText: '2' }).waitFor({ timeout: 60000 }).then(() => true, () => false);
  check(`${tag}: next milestone reaches the month 2 recap`, month2);
  check(`${tag}: and pauses there`, await page.locator('.demo-state').waitFor({ timeout: 4000 }).then(() => true, () => false));
  // Skip to results.
  await page.getByRole('button', { name: /skip to results/i }).click();
  const results = await page.locator('.standings-card').waitFor({ timeout: 90000 }).then(() => true, () => false);
  check(`${tag}: skip to results ends on the final standings`, results);
  if (results) {
    const rows = await page.locator('.standing-row').count();
    check(`${tag}: four players in the standings`, rows === 4, `rows=${rows}`);
    check(`${tag}: net worth chart shows`, await page.locator('.chart-wide svg polyline').count() === 4);
    await page.locator('.standings-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `demo-${tag}-3-results.png`) });
  }
  // Restart replays from month 1; exit returns home with the normal save untouched.
  await page.getByRole('button', { name: /restart demo/i }).click();
  const restarted = await page.locator('.content-heading .eyebrow', { hasText: /Month 1 /i }).waitFor({ timeout: 15000 }).then(() => true, () => false);
  check(`${tag}: restart goes back to month 1`, restarted);
  await page.getByRole('button', { name: /exit demo/i }).click();
  await page.locator('.hero-actions .button').first().waitFor();
  const after = await saved();
  check(`${tag}: normal save and board are untouched by the demo`, JSON.stringify(before) === JSON.stringify(after));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${tag}: no horizontal overflow`, sw <= 1, `${sw}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${fails.length} failures, ${errors.length} console errors`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('ERR', e);
process.exitCode = fails.length ? 1 : 0;
