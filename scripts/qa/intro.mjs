// Demo presentation intro QA: shows in every language at desktop/phone/landscape sizes, fits the
// screen, Skip works, it advances by itself in about 6.5 s, and reduced motion is respected.
//   node intro.mjs http://127.0.0.1:4174/ ./shots
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://127.0.0.1:4174/', out = './shots'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const fails = [], errors = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); if (!ok) fails.push(name); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const SKIP = { en: 'Skip intro', ms: 'Langkau pengenalan', zh: '跳过片头', ta: 'அறிமுகத்தைத் தவிர்' };

for (const lang of ['en', 'ms', 'zh', 'ta']) for (const [name, viewport] of [['desk', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }], ['land', { width: 844, height: 390 }]]) {
  const tag = `${lang}-${name}`;
  const page = await (await browser.newContext({ viewport })).newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); });
  await page.goto(`${url}?lang=${lang}`);
  await page.locator('.demo-link').click();
  const shown = await page.locator('.demo-intro').waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(`${tag}: intro shows`, shown);
  await page.waitForTimeout(1600);
  const r = await page.evaluate(() => {
    const vis = (s) => [...document.querySelectorAll(s)].every((e) => { const b = e.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1; });
    const clipped = [...document.querySelectorAll('.demo-intro h1, .demo-intro p, .demo-intro-players b, .demo-intro-skip')].filter((e) => e.scrollWidth > e.clientWidth + 2).length;
    const copy = document.querySelector('.demo-intro-copy').getBoundingClientRect(), skip = document.querySelector('.demo-intro-skip').getBoundingClientRect();
    const overlap = !(copy.right < skip.left || copy.left > skip.right || copy.bottom < skip.top || copy.top > skip.bottom);
    return { inView: vis('.demo-intro-copy, .demo-intro-skip'), clipped, overlap, players: document.querySelectorAll('.demo-intro-players li').length, skip: document.querySelector('.demo-intro-skip').textContent.trim(), canvas: Boolean(document.querySelector('.demo-intro canvas, .demo-intro .hero-poster')) };
  });
  check(`${tag}: copy and Skip fit the screen, nothing clipped or overlapping`, r.inView && r.clipped === 0 && !r.overlap, JSON.stringify(r));
  check(`${tag}: four players, city scene, translated Skip`, r.players === 4 && r.canvas && r.skip === SKIP[lang], r.skip);
  await page.screenshot({ path: path.join(out, `intro-${tag}.png`) });
  if (name === 'desk') {
    // Auto-advance: the demo starts on its own within ~7.5 s of opening.
    const t0 = Date.now();
    const advanced = await page.locator('.demo-panel').waitFor({ timeout: 9000 }).then(() => true, () => false);
    check(`${tag}: advances into the demo by itself`, advanced, `${Date.now() - t0 + 1600} ms after opening`);
  } else {
    await page.locator('.demo-intro-skip').click();
    const t0 = Date.now();
    const skipped = await page.locator('.demo-panel').waitFor({ timeout: 4000 }).then(() => true, () => false);
    check(`${tag}: Skip goes straight to the demo`, skipped, `${Date.now() - t0} ms`);
  }
  check(`${tag}: intro removed afterwards`, await page.locator('.demo-intro').count() === 0);
  await page.context().close();
}
{
  // Reduced motion: no intro animations; still shows, still advances.
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })).newPage();
  await page.goto(url);
  await page.locator('.demo-link').click();
  await page.locator('.demo-intro').waitFor();
  const anim = await page.evaluate(() => [...document.querySelectorAll('.demo-intro, .demo-intro-copy > *, .demo-intro-players li')].map((e) => getComputedStyle(e).animationName).filter((n) => n && n !== 'none'));
  check('reduced motion: no intro animations', anim.length === 0, JSON.stringify(anim));
  check('reduced motion: still advances into the demo', await page.locator('.demo-panel').waitFor({ timeout: 10000 }).then(() => true, () => false));
  await page.context().close();
}
{
  // Normal play never shows the intro.
  const page = await (await browser.newContext()).newPage();
  await page.goto(url);
  await page.locator('.hero-actions .button').first().click();
  await page.locator('button.character-option').first().click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.game-action-layer .button').last().waitFor();
  check('normal game: no intro', await page.locator('.demo-intro').count() === 0);
  await page.context().close();
}
await browser.close();
console.log(`\n${fails.length} failures, ${errors.length} console errors`);
for (const e of [...new Set(errors)].slice(0, 8)) console.log('ERR', e);
process.exitCode = fails.length ? 1 : 0;
