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
  // Records whether the old SVG board is ever mounted, even for a moment (it must not be when 3D is active).
  await ctx.addInitScript(() => {
    globalThis.__sawSvgBoard = false;
    new MutationObserver(() => { if (document.querySelector('.life-board')) globalThis.__sawSvgBoard = true; }).observe(document, { childList: true, subtree: true });
  });
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
const decisionsOpen = (page) => page.locator('button.save-action, button.pass-action').first().waitFor({ timeout: 20000 });
const game = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.game.v1') ?? 'null'));
const board = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.board.v1') ?? 'null'));

async function startGame(page, tag, character = 0) {
  await page.goto(url);
  await click(page, /Play the game/, 30000);
  await page.locator('button.character-option').nth(character).click();
  await click(page, /^Continue/);
  await click(page, /Begin month one/);
  // Turn-order draw (shown once for a new game): skip to the result, then start.
  await page.locator('.td-start, .td-skip').first().waitFor({ timeout: 30000 }); if (await page.locator('.td-skip').count()) await page.locator('.td-skip').click(); await page.locator('.td-start').click();
  await btn(page, /Collect monthly income/).waitFor();
  await shot(page, `${tag}-01-income`);
}

async function playMonth(page, month, tag, { loseBoardAtEventDraw = false } = {}) {
  await click(page, /Collect monthly income/);
  await click(page, /Pay monthly essentials/);
  await page.getByRole('button', { name: 'Roll Dice' }).waitFor();
  if (month === 1) {
    await shot(page, `${tag}-02-roll`);
    if (url.includes('renderer=3d')) check(`${tag}: 3D board canvas is active (not the fallback)`, (await page.locator('.board-3d canvas').count()) === 1 && (await page.locator('.life-board').count()) === 0);
    const rollButtons = await page.getByRole('button', { name: /Roll Dice/ }).count();
    check(`${tag}: exactly one accessible Roll Dice control`, rollButtons === 1, `found ${rollButtons}`);
    const clash = await page.evaluate(() => {
      const s = document.querySelector('.financial-drawer>summary')?.getBoundingClientRect();
      const texts = [...document.querySelectorAll('.board-heading .eyebrow, .board-heading h2, .board-key')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
      return s ? texts.some((r) => r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top) : false;
    });
    check(`${tag}: Money drawer does not cover the board heading`, !clash);
    const fit = await page.evaluate(() => {
      const b = document.querySelector('.board-3d canvas, .life-board')?.getBoundingClientRect(), d = document.querySelector('.game-action-dock')?.getBoundingClientRect();
      const ox = d ? Math.max(0, Math.min(b.right, d.right) - Math.max(b.left, d.left)) : 0, oy = d ? Math.max(0, Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top)) : 0;
      return { h: Math.round(b.height), covered: Math.round((ox * oy) / Math.max(1, b.width * b.height) * 100) };
    });
    check(`${tag}: board visible (>=120px tall, <=10% under the dock)`, fit.h >= 120 && fit.covered <= 10, `h=${fit.h} covered=${fit.covered}%`);
  }
  const rolledAt = Date.now();
  await page.getByRole('button', { name: 'Roll Dice' }).click();
  if (month === 1) {
    await page.waitForTimeout(1900); // after tumble + reveal: the pawn is hopping
    const covering = await page.locator('.dice-overlay, .game-action-modal').count();
    check(`${tag}: board stays uncovered while the pawn moves`, covering === 0, `covering=${covering}`);
  }
  await decisionsOpen(page);
  if (month === 1) {
    const g0 = await game(page), b0 = await board(page), roll = b0?.lastDiceRoll?.[g0.humanId] ?? 0;
    const elapsed = Date.now() - rolledAt, minimum = 900 + 500 + 360 * roll + 650 - 200; // board/boardTiming.ts human timing, minus slack
    check(`${tag}: decisions open only after the pawn finishes moving`, roll >= 1 && elapsed >= minimum, `roll=${roll} ${elapsed}ms >= ${minimum}ms`);
  }
  if (month === 1) { await shot(page, `${tag}-03-decisions`); await overflow(page, `${tag} decisions`); }
  const before = await game(page), cashBefore = before.players.find((p) => p.id === before.humanId).cash;
  if (month === 1) {
    // Picks are a draft: select, change and remove freely; nothing is charged before confirming.
    const pass = page.locator('button.pass-action');
    await pass.click();
    check(`${tag}: picked option shows as selected`, (await pass.getAttribute('aria-pressed')) === 'true');
    await page.locator('.decision-slot.is-filled').first().click(); // remove it again
    check(`${tag}: a pick can be removed before confirming`, (await pass.getAttribute('aria-pressed')) === 'false');
  }
  for (let i = 0; i < 2; i++) {
    const save = page.locator('button.save-action');
    if (await save.isEnabled()) await save.click(); else await page.locator('button.pass-action').click();
  }
  const draftCash = (await game(page)).players.find((p) => p.id === before.humanId).cash;
  if (month === 1) check(`${tag}: no money moves until moves are confirmed`, draftCash === cashBefore, `${cashBefore} -> ${draftCash}`);
  // Double-click the confirm button: the transactions must still apply exactly once.
  await page.locator('button.decision-confirm').dblclick();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('lifetrack.game.v1') ?? 'null')?.phase !== 'decisions', null, { timeout: 10000 });
  if (month === 1) {
    const g1 = await game(page), h1 = g1.players.find((p) => p.id === g1.humanId), rec = h1.history[0];
    check(`${tag}: confirming applies the moves exactly once`, rec.actions.length === 2 && h1.savings === rec.actions.filter((a) => a.kind === 'save').length * 300, `actions=${rec.actions.length} savings=${h1.savings}`);
  }
  if (month === 1 || month === 4) {
    // Four-player dashboard shows the same cash and net worth (cash + savings) as the saved game state.
    await page.waitForTimeout(300);
    const g = await game(page);
    const shown = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.board-card .pd-card')].map((card) => {
      const id = [...card.classList].find((c) => c.startsWith('pd-') && !['pd-card', 'pd-you', 'pd-active'].includes(c))?.slice(3);
      const num = (sel) => Number((card.querySelector(sel)?.textContent ?? '').replace(/[^0-9-]/g, ''));
      return [id, { cash: num('.pd-cash dd'), worth: num('.pd-worth dd') }];
    })));
    const ok = g.players.every((p) => shown[p.id] && shown[p.id].cash === p.cash && shown[p.id].worth === p.cash + p.savings);
    check(`${tag} month ${month}: dashboard matches saved cash and net worth for all 4 players`, ok && Object.keys(shown).length === 4, JSON.stringify(shown));
    check(`${tag} month ${month}: no player-facing "Daniel"`, !(await page.evaluate(() => /Daniel/.test(document.body.innerText))));
  }
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
  if (!url.includes('renderer=svg')) check('3D: the old SVG board never appeared (new game, reload and resume)', !(await page.evaluate(() => globalThis.__sawSvgBoard)));
  check('results page uses the name Vikram, never Daniel', !(await page.evaluate(() => /Daniel/.test(document.body.innerText))) && (await page.evaluate(() => /Vikram/.test(document.body.innerText))));
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
// Each viewport plays a different character, so all four are tested as the human player.
for (const [tag, viewport, character] of [['phone', { width: 390, height: 844 }, 1], ['tablet', { width: 768, height: 1024 }, 2], ['landscape', { width: 844, height: 390 }, 3]]) {
  const page = await newPage(viewport, tag);
  await page.goto(url);
  await btn(page, /Play the game/).waitFor({ timeout: 30000 });
  await shot(page, `${tag}-00-menu`); await overflow(page, `${tag} menu`);
  await startGame(page, tag, character);
  check(`${tag}: playing as character ${character}`, (await game(page))?.humanId === ['alex', 'meiling', 'daniel', 'aisyah'][character]);
  await overflow(page, `${tag} income`);
  await playMonth(page, 1, tag);
  if (!url.includes('renderer=svg')) check(`${tag}: 3D: the old SVG board never appeared`, !(await page.evaluate(() => globalThis.__sawSvgBoard)));
  await page.context().close();
}

await browser.close();
log('\nconsole errors:', results.errors.length ? results.errors : 'none');
log('horizontal overflow:', results.overflow.length ? results.overflow : 'none');
const failed = results.checks.filter((c) => !c.ok).length;
log(`checks: ${results.checks.length - failed}/${results.checks.length} pass`);
process.exit(failed ? 1 : 0);
