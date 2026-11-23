// LifeTrack browser QA journey. Not a project dependency: run from a folder with playwright-core installed, e.g.
//   npm i --prefix ../lt-qa playwright-core@1.49.1 && cp scripts/qa/journey.mjs ../lt-qa/ && node ../lt-qa/journey.mjs http://127.0.0.1:5174/ ./qa-shots  (ESM ignores NODE_PATH)
// Uses the installed Microsoft Edge (channel msedge), headless.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://127.0.0.1:5174/', out = './shots'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const log = (...a) => console.log(...a);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = { errors: [], overflow: [], checks: [] };
const check = (name, ok, detail = '') => { results.checks.push({ name, ok, detail }); log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

async function newPage(viewport, label) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') results.errors.push(`[${label}] ${m.text()}`); });
  page.on('pageerror', (e) => results.errors.push(`[${label}] pageerror ${e.message}`));
  page.on('dialog', (d) => d.accept());
  return page;
}
const btn = (page, re) => page.locator('button', { hasText: re }).first();
async function click(page, re, timeout = 15000) { const b = btn(page, re); await b.waitFor({ state: 'visible', timeout }); await b.click(); }
async function shot(page, name) { await page.screenshot({ path: path.join(out, `${name}.png`) }); }
async function overflow(page, label) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  if (o.sw > o.w + 1) results.overflow.push(`${label}: scrollWidth ${o.sw} > ${o.w}`);
  const strip = await page.evaluate(() => { const s = document.querySelector('.resource-strip'); if (!s) return null; const r = s.getBoundingClientRect(); const kids = [...s.children].map((c) => c.getBoundingClientRect()); return { bottom: r.bottom, maxKid: Math.max(...kids.map((k) => k.bottom)), rows: new Set(kids.map((k) => Math.round(k.top))).size }; });
  if (strip && strip.maxKid > strip.bottom + 1) results.overflow.push(`${label}: header resource strip spills ${Math.round(strip.maxKid - strip.bottom)}px (${strip.rows} rows)`);
}
const game = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.game.v1') ?? 'null'));
const board = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.board.v1') ?? 'null'));

async function startGame(page, tag) {
  await page.goto(url);
  await click(page, /Play the game/, 30000);
  await page.locator('button.character-option').first().click();
  await click(page, /^Continue/);
  await click(page, /Begin month one/);
  await btn(page, /Collect monthly income/).waitFor();
  await shot(page, `${tag}-01-income`);
}

async function playMonth(page, month, tag, { loseBoardAtEventDraw = false } = {}) {
  await click(page, /Collect monthly income/);
  await click(page, /Pay monthly essentials/);
  await btn(page, /Roll Dice/).waitFor();
  if (month === 1) {
    await shot(page, `${tag}-02-roll`);
    const rollButtons = await page.getByRole('button', { name: /Roll Dice/ }).count();
    check(`${tag}: exactly one accessible Roll Dice control`, rollButtons === 1, `found ${rollButtons}`);
    const clash = await page.evaluate(() => {
      const s = document.querySelector('.financial-drawer>summary')?.getBoundingClientRect();
      const texts = [...document.querySelectorAll('.board-heading .eyebrow, .board-heading h2, .board-key')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
      return s ? texts.some((r) => r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top) : false;
    });
    check(`${tag}: Money drawer does not cover the board heading`, !clash);
    const fit = await page.evaluate(() => {
      const b = document.querySelector('.life-board')?.getBoundingClientRect(), d = document.querySelector('.game-action-dock')?.getBoundingClientRect();
      const ox = d ? Math.max(0, Math.min(b.right, d.right) - Math.max(b.left, d.left)) : 0, oy = d ? Math.max(0, Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top)) : 0;
      return { h: Math.round(b.height), covered: Math.round((ox * oy) / Math.max(1, b.width * b.height) * 100) };
    });
    check(`${tag}: board visible (>=120px tall, <=10% under the dock)`, fit.h >= 120 && fit.covered <= 10, `h=${fit.h} covered=${fit.covered}%`);
  }
  await page.locator('.game-action-layer button', { hasText: /Roll Dice/ }).click();
  await click(page, /Continue to decisions/);
  if (month === 1) { await shot(page, `${tag}-03-decisions`); await overflow(page, `${tag} decisions`); }
  for (let i = 0; i < 2; i++) {
    const save = page.locator('button.save-action');
    if (await save.isEnabled()) await save.click(); else await page.locator('button.pass-action').click();
  }
  await click(page, /Confirm decisions/);
  if (loseBoardAtEventDraw) {
    const g = await game(page);
    check('month 2 game save is in event-draw before reload', g?.phase === 'event-draw', `phase=${g?.phase}`);
    await page.evaluate(() => localStorage.removeItem('lifetrack.board.v1'));
    await page.reload();
    await page.evaluate(() => localStorage.removeItem('lifetrack.board.v1')); // in case an unload write raced
    await click(page, /Continue saved game/, 30000);
    const t0 = Date.now();
    const recovered = await btn(page, /Resolve this month/).waitFor({ timeout: 20000 }).then(() => true, () => false);
    check('event-draw recovers after board save loss + reload', recovered, `${Date.now() - t0}ms`);
    if (!recovered) { await shot(page, `${tag}-STUCK`); throw new Error('soft-lock reproduced in browser'); }
    const b = await board(page);
    check('recovered board reached complete stage', b?.stage === 'complete', `stage=${b?.stage}`);
  }
  await btn(page, /Resolve this month/).waitFor({ timeout: 20000 });
  if (month === 1) { await shot(page, `${tag}-04-event`); await overflow(page, `${tag} event`); }
  const g = await game(page);
  check(`month ${month} event is the seeded deck card`, g.currentEventId === g.deck[month - 1], g.currentEventId);
  await click(page, /Resolve this month/);
  await click(page, /Continue to month recap/);
  if (month === 1) await shot(page, `${tag}-05-summary`);
  await click(page, month === 6 ? /Go to learning review/ : /Continue to next month/);
}

// 1) Full desktop journey with board-save loss in month 2.
{
  const tag = 'desktop';
  const page = await newPage({ width: 1440, height: 900 }, tag);
  await startGame(page, tag);
  for (let m = 1; m <= 6; m++) await playMonth(page, m, tag, { loseBoardAtEventDraw: m === 2 });
  for (let q = 0; q < 3; q++) { await page.locator('button.quiz-option').first().click(); }
  await click(page, /See final results/);
  await btn(page, /Play again/).waitFor();
  await shot(page, `${tag}-06-results`);
  const g = await game(page);
  check('game complete', g.status === 'complete');
  for (const p of g.players) {
    const h = p.history;
    check(`${p.id}: 6 closed months`, h.length === 6 && h.every((r) => r.stage === 'closed'));
    check(`${p.id}: salary once per month`, h.every((r) => r.income === 3500));
    check(`${p.id}: essentials once per month`, h.every((r) => r.essentials === 2500));
    check(`${p.id}: one shared event per month`, h.every((r, i) => r.eventId === g.deck[i] && r.claim?.eventId === g.deck[i]));
    check(`${p.id}: premiums once for earlier policies`, h.every((r, i) => JSON.stringify(r.premiumCharges.map((c) => c.policyId).sort()) === JSON.stringify(p.policies.filter((x) => x.purchasedRound < i + 1).map((x) => x.policyId).sort())));
    check(`${p.id}: two actions per month`, h.every((r) => r.actions.length === 2));
    const conserved = h.every((r) => {
      const rec = r.premiumCharges.reduce((n, c) => n + c.amount, 0);
      const buy = r.actions.reduce((n, a) => n + (a.kind === 'buy' ? a.amount : 0), 0);
      return r.cashAtEnd + r.savingsAtEnd === r.cashAtStart + r.savingsAtStart + r.income - (r.essentials - r.billsShortfall) - rec - buy + r.claim.netCashImpact + r.claim.shortfall;
    });
    check(`${p.id}: money conserved every month`, conserved);
  }
  await page.context().close();
}

// 2) Phone and tablet: month 1 screens + layout overflow.
for (const [tag, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 768, height: 1024 }], ['landscape', { width: 844, height: 390 }]]) {
  const page = await newPage(viewport, tag);
  await page.goto(url);
  await btn(page, /Play the game/).waitFor({ timeout: 30000 });
  await shot(page, `${tag}-00-menu`); await overflow(page, `${tag} menu`);
  await startGame(page, tag);
  await overflow(page, `${tag} income`);
  await playMonth(page, 1, tag);
  await page.context().close();
}

await browser.close();
log('\nconsole errors:', results.errors.length ? results.errors : 'none');
log('horizontal overflow:', results.overflow.length ? results.overflow : 'none');
const failed = results.checks.filter((c) => !c.ok).length;
log(`checks: ${results.checks.length - failed}/${results.checks.length} pass`);
process.exit(failed ? 1 : 0);
