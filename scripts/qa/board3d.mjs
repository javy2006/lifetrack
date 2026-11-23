// LifeTrack 3D board QA (M7): context loss, renderer toggling (heap/context leaks), idle GPU, draw calls,
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
  await page.locator('.game-action-layer button', { hasText: /Roll Dice/ }).click();
  const ok = await page.locator('button', { hasText: /Continue to decisions/ }).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  check('game playable after context loss', ok);
  console.log('context-loss logs:', JSON.stringify(logs, null, 1));
  await page.context().close();
}
// 3) Toggle 2D/3D repeatedly: no context exhaustion, bounded heap.
{
  const { page, logs } = await setup('?renderer=svg'); // start on 2D; the toggle switches in-session
  const toggle = page.locator('button.renderer-toggle');
  const heap = async () => page.evaluate(() => { globalThis.gc?.(); return performance.memory.usedJSHeapSize; });
  await toggle.click(); await page.locator('.board-3d canvas').waitFor(); await toggle.click(); await page.locator('.life-board').waitFor();
  const h0 = await heap();
  for (let i = 0; i < 20; i++) { await toggle.click(); await page.locator('.board-3d canvas').waitFor(); await page.waitForTimeout(150); await toggle.click(); await page.locator('.life-board').waitFor(); }
  await page.waitForTimeout(500);
  const h1 = await heap();
  check('20 renderer round-trips: heap growth < 8 MB', h1 - h0 < 8e6, `${((h1 - h0) / 1e6).toFixed(2)} MB`);
  check('no "too many WebGL contexts" warnings', !logs.some((l) => /Too many active WebGL contexts/i.test(l)));
  console.log('toggle logs:', JSON.stringify([...new Set(logs)], null, 1));
  await page.context().close();
}
// 4) Idle GPU: with frameloop="demand" a settled board issues no draw calls.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    globalThis.__draws = 0; globalThis.__frames = 0;
    const raf = globalThis.requestAnimationFrame.bind(globalThis);
    for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const f = P[k]; if (f) P[k] = function (...a) { globalThis.__draws++; return f.apply(this, a); };
    }
    // A rendered frame of this scene starts with the shadow pass binding its framebuffer.
    for (const P of [WebGL2RenderingContext.prototype]) { const f = P.bindFramebuffer; P.bindFramebuffer = function (t, fb) { if (fb) globalThis.__frames++; return f.call(this, t, fb); }; }
  });
  const page = await ctx.newPage();
  const click = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.waitFor({ timeout: 30000 }); await b.click(); };
  await page.goto(base + '?renderer=3d');
  await click(/Play the game/); await page.locator('button.character-option').first().click();
  await click(/^Continue/); await click(/Begin month one/);
  await page.locator('.board-3d canvas').waitFor();
  await page.waitForTimeout(3500);
  const d0 = await page.evaluate(() => globalThis.__draws);
  await page.waitForTimeout(2000);
  const d1 = await page.evaluate(() => globalThis.__draws);
  check('idle 3D board issues no draw calls over 2 s', d1 === d0, `${d1 - d0} draws (startup total ${d0})`);
  await click(/Collect monthly income/); await click(/Pay monthly essentials/);
  await page.locator('.game-action-layer button', { hasText: /Roll Dice/ }).click();
  await click(/Continue to decisions/);
  await page.waitForTimeout(3000);
  const d2 = await page.evaluate(() => globalThis.__draws);
  await page.waitForTimeout(2000);
  const d3 = await page.evaluate(() => globalThis.__draws);
  check('board goes idle again after a roll and move', d3 === d2, `${d3 - d2} draws`);
  const perFrame = await page.evaluate(() => Math.round(globalThis.__draws / Math.max(1, globalThis.__frames)));
  check('draw calls per frame (shadow + main) <= 250', perFrame <= 250, `~${perFrame} per frame, ${await page.evaluate(() => globalThis.__frames)} frames`);
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
  await page.locator('.game-action-layer button', { hasText: /Roll Dice/ }).click();
  check('no WebGL: roll completes', await page.locator('button', { hasText: /Continue to decisions/ }).first().waitFor({ timeout: 15000 }).then(() => true, () => false));
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
  await page.locator('.game-action-layer button', { hasText: /Roll Dice/ }).click();
  check('reduced motion: roll completes on the 3D board', await page.locator('button', { hasText: /Continue to decisions/ }).first().waitFor({ timeout: 15000 }).then(() => true, () => false) && (await page.locator('.board-3d canvas').count()) === 1);
  check('reduced motion: no console errors', errs.length === 0, errs.join(' | '));
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
