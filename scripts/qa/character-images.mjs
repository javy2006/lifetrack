// LifeTrack character-image QA: the four official full-body character images load on the selection screen (desktop + phone),
// are cropped with object-fit: cover, and fall back to labelled initials when blocked. Same setup as journey.mjs:
//   node ../lt-qa/character-images.mjs http://127.0.0.1:4174/ ./shots/select
// Character selection: all four official portraits load (no broken images), at desktop and phone.
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let ok = true;
for (const [tag, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage();
  const bad = []; page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  const warn = []; page.on('console', (m) => { if (m.type() === 'error' || /failed to load/.test(m.text())) warn.push(m.text()); });
  await page.goto(base);
  await page.locator('button', { hasText: /Play the game/ }).first().click();
  await page.locator('button.character-option').first().waitFor();
  await page.waitForTimeout(1500);
  const imgs = await page.evaluate(() => [...document.querySelectorAll('.character-option img')].map((i) => ({ src: new URL(i.src).pathname, ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, fit: getComputedStyle(i).objectFit, alt: i.alt })));
  const fallbacks = await page.locator('.character-portrait-fallback').count();
  const pass = imgs.length === 4 && imgs.every((i) => i.ok && i.w === 440 && i.fit === 'cover') && fallbacks === 0 && bad.length === 0;
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${tag}: ${imgs.map((i) => `${i.src} ${i.ok ? i.w + 'px' : 'BROKEN'} ${i.fit}`).join(' | ')} fallbacks=${fallbacks} bad=${bad.join(',')} warn=${warn.join(',')}`);
  await page.screenshot({ path: `${out}-${tag}.png` });
  await page.context().close();
}
// Fallback path: block the portrait requests and confirm initials replace broken images.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/assets/characters/**', (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(base);
  await page.locator('button', { hasText: /Play the game/ }).first().click();
  await page.waitForTimeout(1500);
  const n = await page.locator('.character-option .character-portrait-fallback').count();
  const labels = await page.locator('.character-option .character-portrait-fallback').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const pass = n === 4 && labels.every(Boolean);
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} fallback when portraits fail: ${n} initials, labels ${labels.join(' / ')}`);
  await page.screenshot({ path: `${out}-fallback.png` });
  await ctx.close();
}
await browser.close();
process.exit(ok ? 0 : 1);
