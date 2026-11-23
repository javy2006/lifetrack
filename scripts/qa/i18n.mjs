// LifeTrack language QA: plays month 1 (and opens the recap) in every language at desktop and
// phone sizes, flags leftover English, horizontal overflow, clipped text and console errors, and
// checks that switching language mid-game keeps the game state. Run like journey.mjs:
//   node --experimental-strip-types i18n.mjs http://127.0.0.1:5174/ ./shots <path-to-repo>
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [url = 'http://127.0.0.1:5174/', out = './shots', repo = process.cwd(), only = 'en,ms,zh,ta', sizeArg = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const imp = (p) => import(pathToFileURL(path.join(repo, p)).href);
const en = (await imp('src/lifetrack/i18n/en.ts')).default;
const { EVENT_CARDS } = await imp('src/lifetrack/game/events.ts');
const packs = { ms: (await imp('src/lifetrack/i18n/ms.ts')).default, zh: (await imp('src/lifetrack/i18n/zh.ts')).default, ta: (await imp('src/lifetrack/i18n/ta.ts')).default };
const leaves = (o) => typeof o === 'string' ? [o] : Object.values(o ?? {}).flatMap(leaves);
const words = (s) => (s.match(/[A-Za-z]{4,}/g) ?? []).map((w) => w.toLowerCase());
const englishWords = new Set([...leaves(en), ...EVENT_CARDS.flatMap((e) => [e.title, e.story])].flatMap(words));
const ALLOW = new Set(['lifetrack', 'alex', 'ling', 'vikram', 'aisyah', 'kuala', 'lumpur', 'ipoh', 'takaful', 'futsal', 'aircond']);

const results = { errors: [], fails: [] };
const fail = (m) => { results.fails.push(m); console.log('FAIL', m); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function scan(page, lang, where) {
  const own = new Set(leaves(packs[lang]?.ui ?? {}).concat(leaves(packs[lang]?.content ?? {})).flatMap(words));
  const report = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
    const texts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { const el = n.parentElement; if (!el || el.closest('script,style,svg title,.sr-only,option,details:not([open])>*:not(summary)') || !vis(el)) continue; const t = n.textContent.trim(); if (t) texts.push(t); }
    const attrs = [...document.querySelectorAll('[aria-label],[title]')].filter((e) => !e.closest('option')).flatMap((e) => [e.getAttribute('aria-label'), e.getAttribute('title')]).filter(Boolean);
    // Text clipped by its own box (single-line ellipsis-free overflow) in buttons and headings.
    const clipped = [...document.querySelectorAll('button, h1, h2, .eyebrow, .stage-dot, .pd-card dt, .resource-item small')].filter((e) => vis(e) && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent.trim().slice(0, 40));
    // Header items must sit fully inside the viewport (the game page locks scrolling, so overflow would just be cut off).
    const offscreen = [...document.querySelectorAll('.game-topbar > *, .topbar-right > *, .resource-strip > *, .landing-nav > *, .setup-topbar > *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map((e) => e.className || e.tagName);
    const wrappedPill = [...document.querySelectorAll('.round-pill')].filter((e) => vis(e) && e.getBoundingClientRect().height > 40).length;
    return { texts, attrs, clipped, offscreen, wrappedPill, sw: document.documentElement.scrollWidth, w: innerWidth };
  });
  if (report.sw > report.w + 1) fail(`${lang} ${where}: horizontal overflow ${report.sw} > ${report.w}`);
  if (report.clipped.length) fail(`${lang} ${where}: clipped ${JSON.stringify(report.clipped)}`);
  if (report.offscreen.length) fail(`${lang} ${where}: outside the viewport ${JSON.stringify(report.offscreen)}`);
  if (report.wrappedPill) fail(`${lang} ${where}: month pill wraps`);
  if (lang === 'en') return;
  const leftovers = new Set();
  for (const t of [...report.texts, ...report.attrs]) for (const w of words(t)) if (englishWords.has(w) && !own.has(w) && !ALLOW.has(w)) leftovers.add(`${w} ← "${t.slice(0, 60)}"`);
  if (leftovers.size) fail(`${lang} ${where}: untranslated ${JSON.stringify([...leftovers].slice(0, 8))}`);
}

const primary = (page) => page.locator('.game-action-layer .button:not([disabled])').last();
async function run(lang, viewport, tag) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('qa-init')) { localStorage.clear(); localStorage.setItem('lifetrack.lang.v1', l); sessionStorage.setItem('qa-init', '1'); } }, lang);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') results.errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => results.errors.push(`[${tag}] pageerror ${e.message}`));
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await page.locator('.hero-actions .button').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  if (!htmlLang.startsWith(lang)) fail(`${tag}: html lang is ${htmlLang}`);
  await scan(page, lang, 'home'); await page.screenshot({ path: path.join(out, `${tag}-1-home.png`) });
  await page.locator('.hero-actions .button').first().click();
  await page.locator('button.character-option').nth(1).click();
  await scan(page, lang, 'select'); await page.screenshot({ path: path.join(out, `${tag}-2-select.png`) });
  await page.locator('.selection-footer .button').click();
  await scan(page, lang, 'intro');
  await page.locator('.selection-footer .button').click();
  await primary(page).waitFor({ timeout: 20000 });
  await scan(page, lang, 'income'); await page.screenshot({ path: path.join(out, `${tag}-3-income.png`) });
  await primary(page).click();
  await scan(page, lang, 'bills');
  await primary(page).click();
  await page.locator('.roll-main').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await scan(page, lang, 'roll'); await page.screenshot({ path: path.join(out, `${tag}-4-roll.png`) });
  await page.locator('.roll-main').click();
  await page.locator('button.save-action').waitFor({ timeout: 20000 });
  await scan(page, lang, 'decisions'); await page.screenshot({ path: path.join(out, `${tag}-5-decisions.png`) });
  // Switch language mid-decision: the game (and the board) must be unchanged.
  const before = await page.evaluate(() => [localStorage.getItem('lifetrack.game.v1'), localStorage.getItem('lifetrack.board.v1')]);
  const other = lang === 'en' ? 'zh' : 'en';
  const sel = page.locator('.game-topbar .language-select select');
  await sel.selectOption(other); await page.waitForTimeout(700);
  const after = await page.evaluate(() => [localStorage.getItem('lifetrack.game.v1'), localStorage.getItem('lifetrack.board.v1')]);
  if (before[0] !== after[0] || before[1] !== after[1]) fail(`${tag}: switching language changed the saved game/board`);
  if (!(await page.locator('button.save-action').isVisible())) fail(`${tag}: decision card lost after switching language`);
  await sel.selectOption(lang); await page.waitForTimeout(500);
  await page.locator('button.save-action').click(); await page.locator('button.save-action').click();
  await page.locator('button.decision-confirm').click();
  for (let i = 0; i < 40; i++) {
    const phase = await page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.game.v1') ?? 'null')?.phase);
    if (phase === 'summary') break;
    if (await primary(page).isVisible().catch(() => false)) {
      const cls = await page.locator('.game-action-layer .game-card, .game-action-layer .surface-card').first().getAttribute('class').catch(() => '');
      await scan(page, lang, cls?.split(' ').find((c) => c.endsWith('-card')) ?? phase);
      if (phase === 'event') await page.screenshot({ path: path.join(out, `${tag}-6-event.png`) });
      if (phase === 'claims') await page.screenshot({ path: path.join(out, `${tag}-7-claim.png`) });
      await primary(page).click();
    }
    await page.waitForTimeout(700);
  }
  await page.locator('.summary-card').waitFor({ timeout: 20000 });
  await page.locator('.summary-card .chart').waitFor({ timeout: 5000 }).catch(() => fail(`${tag}: recap chart missing`));
  await scan(page, lang, 'summary'); await page.screenshot({ path: path.join(out, `${tag}-8-summary.png`) });
  // Persistence: reload keeps the language and the game.
  await page.reload();
  await page.locator('.hero-actions .button').first().waitFor({ timeout: 30000 });
  if (!(await page.evaluate(() => document.documentElement.lang)).startsWith(lang)) fail(`${tag}: language not kept after reload`);
  await ctx.close();
}

for (const lang of only.split(',')) {
  const sizes = sizeArg ? sizeArg.split(',').map((v) => { const [width, height] = v.split('x').map(Number); return [v, { width, height }]; })
    : [['desk', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }], ['land', { width: 844, height: 390 }]];
  for (const [name, viewport] of sizes) {
    const tag = `${lang}-${name}`;
    try { await run(lang, viewport, tag); console.log('done', tag); } catch (e) { fail(`${tag}: ${e.message.split('\n')[0]}`); }
  }
}
await browser.close();
console.log(`\n${results.fails.length} failures, ${results.errors.length} console errors`);
for (const e of [...new Set(results.errors)].slice(0, 15)) console.log('ERR', e);
process.exitCode = results.fails.length ? 1 : 0;
