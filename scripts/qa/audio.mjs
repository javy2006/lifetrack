// LifeTrack audio QA: every sound file is served and decodes; nothing plays or warns before the
// first user gesture; a missing file degrades gracefully (game continues, one warning, no errors).
//   node audio.mjs http://127.0.0.1:5174/
import { chromium } from 'playwright-core';

const [url = 'http://127.0.0.1:5174/'] = process.argv.slice(2);
const fails = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); if (!ok) fails.push(name); };
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const FILES = ['card', 'claim', 'click', 'coins', 'confirm', 'dice-land', 'dice-shake', 'event', 'land', 'lifetrack-ambience', 'month', 'pay', 'purchase', 'quiz-correct', 'quiz-wrong', 'save', 'select', 'step-1', 'step-2', 'step-3', 'warning', 'winner'];

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const logs = [], audioRequests = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('request', (r) => { if (r.url().includes('/audio/')) audioRequests.push(r.url()); });
  await page.goto(url);
  await page.locator('.hero-actions .button').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  check('no audio is fetched before the first interaction', audioRequests.length === 0, `${audioRequests.length} requests`);
  check('no autoplay warnings on load', !logs.some((l) => /AudioContext|autoplay|play\(\) request/i.test(l)), logs.filter((l) => /audio/i.test(l)).join(' | '));
  const decoded = await page.evaluate(async (files) => {
    const out = {};
    for (const f of files) {
      try {
        const r = await fetch(`/audio/${f}.mp3`); const buf = await r.arrayBuffer();
        const bytes = buf.byteLength, lfs = new TextDecoder().decode(buf.slice(0, 40)).includes('git-lfs');
        const ac = new OfflineAudioContext(1, 44100, 44100); const b = await ac.decodeAudioData(buf);
        out[f] = { ok: r.ok, type: r.headers.get('content-type'), seconds: Math.round(b.duration * 100) / 100, bytes, lfs };
      } catch (e) { out[f] = { ok: false, error: String(e) }; }
    }
    return out;
  }, FILES);
  for (const [f, d] of Object.entries(decoded)) check(`${f}.mp3 serves and decodes`, d.ok && !d.lfs && d.seconds > 0, JSON.stringify(d));
  // First interaction: essentials are preloaded, without errors.
  audioRequests.length = 0;
  await page.locator('.hero-actions .button').first().click();
  await page.waitForTimeout(1500);
  check('essential sounds are preloaded after the first interaction', audioRequests.length >= 8, `${audioRequests.length} requests`);
  check('the optional ambience is not fetched while music is off', !audioRequests.some((u) => u.includes('ambience')));
  check('no console errors', !logs.some((l) => l.startsWith('error')), logs.filter((l) => l.startsWith('error')).join(' | '));
  await ctx.close();
}
{
  // Missing files: block the dice and step sounds; the game still plays and only one warning is logged.
  const ctx = await browser.newContext();
  await ctx.route(/\/audio\/(dice-shake|step-\d)\.mp3/, (r) => r.fulfill({ status: 404, body: '' }));
  const page = await ctx.newPage();
  const logs = [], pageErrors = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(url);
  await page.locator('.hero-actions .button').first().click();
  await page.locator('button.character-option').first().click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.game-action-layer .button').last().click();
  await page.locator('.game-action-layer .button').last().click();
  await page.locator('.roll-main').click();
  const opened = await page.locator('button.save-action').waitFor({ timeout: 20000 }).then(() => true, () => false);
  check('with missing sound files the roll still completes and decisions open', opened);
  check('no page errors with missing sound files', pageErrors.length === 0, pageErrors.join(' | '));
  check('a single "could not be loaded" warning', logs.filter((l) => /could not be loaded/.test(l)).length === 1, `${logs.filter((l) => /could not be loaded/.test(l)).length}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${fails.length} failures`);
process.exitCode = fails.length ? 1 : 0;
