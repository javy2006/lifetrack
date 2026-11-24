// P0 regression: the life event screen must be usable with touch alone on small phones (no Playwright auto-scroll).
// Loads a save paused on month 2's Temporary Job Loss (make-event-save.ts), then per viewport:
//  - the Continue button is on screen and is the element under its own centre (nothing covers it);
//  - "Will my cover help?" and "Why it matters" open with a tap;
//  - a double tap on Continue resolves the event exactly once, each player charged from their own claim;
//  - the claim and recap screens' buttons are reachable by scrolling (wheel), then tapped to advance.
//   node event-mobile.mjs <url> <event-save.json> [sizes] [langs]   e.g. 360x640 en,ms,zh,ta
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const [url, json, sizes = '390x844,360x640,320x640,844x390,1366x768', langs = 'en'] = process.argv.slice(2); const state = fs.readFileSync(json, 'utf8');
const b = await chromium.launch({ channel: 'msedge', headless: true });
let fails = 0; const check = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`); };
const reach = (p, sel) => p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return { ok: false, why: 'missing' }; const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { ok: r.top >= 0 && r.bottom <= innerHeight && el.contains(hit), r: [Math.round(r.top), Math.round(r.bottom), innerHeight] }; }, sel);
async function scrollTo(p, sel) { // what a user can do: scroll the modal with the wheel until the target shows
  const box = await p.locator('.game-action-modal .primary-column').boundingBox();
  // Wheel by exactly the distance needed (down if below the column, up if above), like a careful finger.
  for (let i = 0; i < 12 && !(await reach(p, sel)).ok; i++) {
    const t = await p.locator(sel).first().boundingBox(); if (!t) break;
    const dy = t.y + t.height > box.y + box.height - 8 ? t.y + t.height - (box.y + box.height - 8) : t.y < box.y + 8 ? t.y - (box.y + 8) : 0;
    await p.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height - 10, 60)); await p.mouse.wheel(0, Math.round(dy) || 40); await p.waitForTimeout(150);
  }
  return reach(p, sel);
}
const tapCentre = async (p, sel) => { const r = await p.locator(sel).first().boundingBox(); if (r) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
for (const lang of langs.split(',')) for (const size of sizes.split(',')) {
  const s = `${lang} ${size}`;
  const [w, h] = size.split('x').map(Number); const touch = w < 900;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: touch });
  await ctx.addInitScript(([st, lang]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('lifetrack.game.v1', st); localStorage.setItem('lifetrack.lang.v1', lang); localStorage.removeItem('lifetrack.board.v1'); sessionStorage.setItem('seeded', '1'); } }, [state, lang]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.locator('.hero-actions .button').first().click(); // "Continue saved game" in any language
  await p.locator('.event-card').waitFor(); await p.waitForTimeout(900);
  const before = JSON.parse(await p.evaluate(() => localStorage.getItem('lifetrack.game.v1')));
  const c0 = await reach(p, 'button.event-continue');
  check(`${s}: Continue visible and not covered on arrival`, c0.ok, JSON.stringify(c0.r));
  await scrollTo(p, '.event-coverage > summary'); await tapCentre(p, '.event-coverage > summary');
  check(`${s}: "Will my cover help?" opens with a tap`, await p.locator('.event-coverage').evaluate((d) => d.open));
  await scrollTo(p, '.event-copy .learn-more > summary'); await tapCentre(p, '.event-copy .learn-more > summary');
  check(`${s}: "Why it matters" opens with a tap`, await p.locator('.event-copy .learn-more').evaluate((d) => d.open));
  const c1 = await scrollTo(p, 'button.event-continue');
  check(`${s}: Continue still reachable after expanding`, c1.ok, JSON.stringify(c1.r));
  const r = await p.locator('button.event-continue').boundingBox();
  await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('lifetrack.game.v1')).phase === 'claims', null, { timeout: 8000 }).catch(() => {});
  const after = JSON.parse(await p.evaluate(() => localStorage.getItem('lifetrack.game.v1')));
  check(`${s}: event resolved, game moved to claims`, after.phase === 'claims', after.phase);
  const ok = after.players.every((q) => { const rec = q.history.filter((x) => x.round === 2); const prev = before.players.find((o) => o.id === q.id); return rec.length === 1 && rec[0].claim && q.cash === rec[0].claim.cashAfter && q.savings === rec[0].claim.savingsAfter && rec[0].claim.cashAfter <= prev.cash; });
  check(`${s}: applied exactly once, each player from their own claim`, ok);
  const claimBtn = '.claim-learning .button';
  const k = await scrollTo(p, claimBtn); check(`${s}: claim screen button reachable`, k.ok, JSON.stringify(k.r));
  await tapCentre(p, claimBtn); await p.locator('.summary-card').waitFor({ timeout: 8000 }).catch(() => {});
  const m = await scrollTo(p, '.summary-card > .button'); check(`${s}: recap button reachable`, m.ok, JSON.stringify(m.r));
  await tapCentre(p, '.summary-card > .button');
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('lifetrack.game.v1')).round === 3, null, { timeout: 8000 }).catch(() => {});
  check(`${s}: month 3 begins`, JSON.parse(await p.evaluate(() => localStorage.getItem('lifetrack.game.v1'))).round === 3);
  check(`${s}: no console errors`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
console.log(fails ? `${fails} failures` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
