// LifeTrack 3D board QA (M7): context loss, board remounts (heap/context leaks), idle GPU, draw calls,
// WebGL unavailable and reduced motion. Same setup as journey.mjs (playwright-core + installed Edge):
//   node ../lt-qa/board3d.mjs http://127.0.0.1:4174/   (vite preview of a production build)
import { chromium } from 'playwright-core';
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--js-flags=--expose-gc'] });
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`); };
async function setup(query, viewport = { width: 1280, height: 800 }) {
  const page = await (await browser.newContext({ viewport })).newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => logs.push('pageerror ' + e.message + '\n' + (e.stack ?? '').slice(0, 600)));
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base + query);
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/);
  const t0 = Date.now();
  await click(/Begin month one/);
  return { page, logs, click, t0 };
}
// 1) Time to 3D canvas and first-board render.
{
  const { page, logs, t0 } = await setup('?renderer=3d');
  await page.locator('.board-3d canvas').waitFor({ timeout: 30000 });
  check('3D canvas mounts after starting', true, `${Date.now() - t0} ms`);
  await page.waitForTimeout(1500); // let R3F create its renderer before simulating loss
  // 2) Context loss -> SVG fallback, game still playable.
  const lost = await page.evaluate(() => { const c = document.querySelector('.board-3d canvas'); const gl = c.getContext('webgl2') ?? c.getContext('webgl'); const ext = gl?.getExtension('WEBGL_lose_context'); if (!ext) return false; ext.loseContext(); return true; });
  check('WEBGL_lose_context available', lost);
  await page.waitForTimeout(800);
  check('SVG board takes over after context loss', (await page.locator('.life-board').count()) === 1 && (await page.locator('.board-3d canvas').count()) === 0);
  await page.locator('button', { hasText: /Collect monthly income/ }).first().click();
  await page.locator('button', { hasText: /Pay monthly essentials/ }).first().click();
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  const ok = await page.locator('button.save-action, button.pass-action').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  check('game playable after context loss', ok);
  console.log('context-loss logs:', JSON.stringify(logs, null, 1));
  await page.context().close();
}
// 3) Leave and resume the game repeatedly (mounts/unmounts the 3D board): no context exhaustion, bounded heap.
{
  const { page, logs } = await setup('');
  page.on('dialog', (d) => d.accept());
  // Several GC passes with short waits: one pass left up to ~8 MB of garbage in some runs (an 80-remount trend levels off at ~3 MB).
  const heap = async () => page.evaluate(async () => { for (let i = 0; i < 3; i++) { globalThis.gc?.(); await new Promise((r) => setTimeout(r, 100)); } return performance.memory.usedJSHeapSize; });
  const cycle = async () => {
    await page.locator('button', { hasText: /^\s*Exit/ }).first().click();
    await page.locator('button', { hasText: /Continue saved game/ }).first().click();
    await page.locator('.board-3d canvas').waitFor(); await page.waitForTimeout(150);
  };
  await page.locator('.board-3d canvas').waitFor(); await cycle();
  const h0 = await heap();
  for (let i = 0; i < 20; i++) await cycle();
  await page.waitForTimeout(500);
  const h1 = await heap();
  check('20 board remounts: heap growth < 8 MB', h1 - h0 < 8e6, `${((h1 - h0) / 1e6).toFixed(2)} MB`);
  check('no "too many WebGL contexts" warnings', !logs.some((l) => /Too many active WebGL contexts/i.test(l)));
  await page.context().close();
}
// 4) Idle GPU. With frameloop="demand" the board only renders when something changes. On desktops
// (fine pointer) two ambient cars redraw it at ~15 fps; with reduced motion it must be fully idle.
async function drawCounter(options) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  await ctx.addInitScript(() => {
    globalThis.__draws = 0; globalThis.__frames = 0;
    for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const f = P[k]; if (f) P[k] = function (...a) { globalThis.__draws++; return f.apply(this, a); };
    }
    // Each rendered frame of this scene binds the shadow-map framebuffer once.
    { const P = WebGL2RenderingContext.prototype, f = P.bindFramebuffer; P.bindFramebuffer = function (t, fb) { if (fb) globalThis.__frames++; return f.call(this, t, fb); }; }
  });
  const page = await ctx.newPage();
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base + '?renderer=3d');
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/);
  await page.locator('.board-3d canvas').waitFor();
  await page.waitForTimeout(3500);
  const frames = () => page.evaluate(() => globalThis.__frames);
  return { ctx, page, click, frames };
}
{
  const { ctx, page, click, frames } = await drawCounter({});
  const f0 = await frames(); await page.waitForTimeout(2000); const f1 = await frames();
  check('idle desktop board renders at most ~15 fps (ambient cars only)', f1 - f0 <= 36, `${f1 - f0} frames in 2 s`);
  await click(/Collect monthly income/); await click(/Pay monthly essentials/);
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  await page.locator('button.save-action, button.pass-action').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const f2 = await frames(); await page.waitForTimeout(2000); const f3 = await frames();
  check('after a roll and move the board returns to the ambient rate', f3 - f2 <= 36, `${f3 - f2} frames in 2 s`);
  const perFrame = await page.evaluate(() => Math.round(globalThis.__draws / Math.max(1, globalThis.__frames)));
  check('draw calls per frame (shadow + main) <= 300', perFrame <= 300, `~${perFrame} per frame`);
  await ctx.close();
}
{
  const { ctx, page } = await drawCounter({ reducedMotion: 'reduce' });
  const d0 = await page.evaluate(() => globalThis.__draws); await page.waitForTimeout(2000); const d1 = await page.evaluate(() => globalThis.__draws);
  check('reduced motion: idle board issues no draw calls', d1 === d0, `${d1 - d0} draws`);
  await ctx.close();
}
// 5) WebGL unavailable: SVG fallback and a playable game.
{
  const b2 = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await (await b2.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base + '?renderer=3d');
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/);
  await click(/Collect monthly income/); await click(/Pay monthly essentials/);
  check('no WebGL: SVG board shown', (await page.locator('.life-board').count()) === 1 && (await page.locator('.board-3d').count()) === 0);
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  check('no WebGL: roll completes', await page.locator('button.save-action, button.pass-action').first().waitFor({ timeout: 15000 }).then(() => true, () => false));
  check('no WebGL: no console errors', errs.length === 0, errs.join(' | '));
  await b2.close();
}
// 6) Reduced motion: 3D board completes a roll with no errors.
{
  const page = await (await browser.newContext({ viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base + '?renderer=3d');
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/);
  await click(/Collect monthly income/); await click(/Pay monthly essentials/);
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  check('reduced motion: roll completes on the 3D board', await page.locator('button.save-action, button.pass-action').first().waitFor({ timeout: 15000 }).then(() => true, () => false) && (await page.locator('.board-3d canvas').count()) === 1);
  check('reduced motion: no console errors', errs.length === 0, errs.join(' | '));
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
