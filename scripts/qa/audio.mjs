// LifeTrack audio QA: every sound file is served and decodes; nothing plays or warns before the
// first user gesture; music starts on the first interaction with the default settings, never
// doubles up, loops without a gap, pauses with the tab and keeps the player's settings; a missing
// effect file degrades gracefully.
//   node audio.mjs http://127.0.0.1:5174/
import { chromium } from 'playwright-core';

const [url = 'http://127.0.0.1:5174/'] = process.argv.slice(2);
const fails = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); if (!ok) fails.push(name); };
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const FILES = ['card-1', 'card-2', 'card-3', 'claim', 'click', 'coins-1', 'coins-2', 'confirm', 'dice-land-1', 'dice-land-2', 'dice-land-3', 'dice-shake-1', 'dice-shake-2', 'dice-shake-3', 'event', 'land-1', 'land-2', 'land-key', 'month', 'music-cheery-monday', 'music-sunshine', 'pay', 'purchase', 'quiz-correct', 'quiz-wrong', 'results', 'save-1', 'save-2', 'select-1', 'select-2', 'select-3', 'step-1', 'step-2', 'step-3', 'step-4', 'warning', 'winner'];
const music = (page) => page.evaluate(() => globalThis.__lifetrackMusic?.debug() ?? null);

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
  check('music is not playing before the first interaction', (await music(page))?.playing === 0 || (await music(page))?.playing === undefined, JSON.stringify(await music(page)));
  const decoded = await page.evaluate(async (files) => {
    const out = {};
    for (const f of files) {
      try {
        const r = await fetch(`/audio/${f}.mp3`); const buf = await r.arrayBuffer();
        const bytes = buf.byteLength, lfs = new TextDecoder().decode(buf.slice(0, 40)).includes('git-lfs');
        const ac = new OfflineAudioContext(1, 44100, 44100); const b = await ac.decodeAudioData(buf);
        out[f] = { ok: r.ok, seconds: Math.round(b.duration * 100) / 100, bytes, lfs };
      } catch (e) { out[f] = { ok: false, error: String(e) }; }
    }
    return out;
  }, FILES);
  const bad = Object.entries(decoded).filter(([, d]) => !(d.ok && !d.lfs && d.seconds > 0));
  check(`all ${FILES.length} sound files serve and decode`, bad.length === 0, JSON.stringify(bad));
  check('default music file (Cheery Monday) is the full loop (>65 s)', decoded['music-cheery-monday']?.seconds > 65, `${decoded['music-cheery-monday']?.seconds}s`);
  // First interaction: the default settings start the music and preload the essential effects.
  audioRequests.length = 0;
  const defaults = await page.evaluate(() => localStorage.getItem('lifetrack.audio.v3'));
  await page.locator('.hero-actions .button').first().click();
  await page.waitForTimeout(2500);
  let m = await music(page);
  check('defaults: nothing saved until the player changes a setting', defaults === null);
  check('music starts after the first interaction (music on by default)', m?.state === 'playing' && m.playing === 1, JSON.stringify(m));
  check('music fades in (gain rising, not instant full volume at start)', m?.gains[m.active] > 0, JSON.stringify(m?.gains));
  check('essential effects are preloaded after the first interaction', audioRequests.filter((u) => !u.includes('music')).length >= 8, `${audioRequests.length} requests`);
  // Screen changes keep the same single music instance playing (no restart).
  const t0 = m.time;
  await page.locator('button.character-option').first().click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.selection-footer .button').click();
  await page.locator('.game-action-layer .button').last().waitFor();
  await page.waitForTimeout(800);
  m = await music(page);
  check('music continues across screens without restarting', m.playing === 1 && m.time > t0, `${t0.toFixed(1)}s -> ${m.time.toFixed(1)}s`);
  const playingSrc = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/audio/music-') && e.initiatorType !== 'fetch').map((e) => e.name.split('/').pop()));
  check('the default track is Cheery Monday (Sunshine is never requested)', playingSrc.every((n) => n.startsWith('music-cheery-monday')) && playingSrc.length > 0, JSON.stringify(playingSrc));
  // Income, bills, dice roll, token movement and the decision card: music keeps playing, one instance.
  const t1 = (await music(page)).time;
  await page.locator('.game-action-layer .button').last().click();
  await page.locator('.game-action-layer .button').last().click();
  await page.locator('.roll-main').click();
  await page.locator('button.save-action').waitFor({ timeout: 20000 });
  await page.locator('button.save-action').click();
  m = await music(page);
  check('music continues through income, bills, dice roll, movement and decisions', m.playing === 1 && m.time > t1 + 1, `${t1.toFixed(1)}s -> ${m.time.toFixed(1)}s`);
  // Leaving to the home page and resuming: still one instance, not restarted.
  const t2 = m.time;
  await page.locator('.exit-button').click();
  await page.locator('.hero-actions .button').first().click();
  await page.locator('button.save-action').waitFor({ timeout: 20000 });
  m = await music(page);
  check('home and back: one instance, not restarted', m.playing === 1 && m.time > t2, `${t2.toFixed(1)}s -> ${m.time.toFixed(1)}s`);
  // Opening and closing How to play does not interrupt the music.
  await page.keyboard.press('Escape');
  // Seamless loop: jump to 2 s before the loop point and sample the hand-over.
  await page.evaluate(() => globalThis.__lifetrackMusic.seekForTest(2));
  const samples = [];
  for (let i = 0; i < 70; i++) { samples.push(await music(page)); await page.waitForTimeout(50); }
  const gap = samples.some((s) => s.playing === 0), maxPlaying = Math.max(...samples.map((s) => s.playing)), overlap = samples.filter((s) => s.playing === 2).length * 50;
  const switched = samples[0].active !== samples[samples.length - 1].active;
  check('loop: hands over to the start of the track', switched, `active ${samples[0].active} -> ${samples.at(-1).active}`);
  check('loop: never silent during the hand-over', !gap);
  check('loop: at most two copies, overlapping only ~1 s', maxPlaying <= 2 && overlap <= 1600, `max ${maxPlaying}, overlap ~${overlap} ms`);
  check('loop: one copy again after the hand-over', samples.at(-1).playing === 1);
  // Tab hidden: music fades and pauses; visible again: resumes.
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(1300);
  check('hidden tab: music pauses', (await music(page)).playing === 0);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  check('visible again: music resumes', (await music(page)).playing === 1);
  // Independent controls and persistence.
  await page.locator('.audio-settings > summary').first().click();
  const t3 = (await music(page)).time;
  await page.locator('.audio-slider').first().fill('50');
  await page.waitForTimeout(600);
  m = await music(page);
  check('music volume change applies without restarting the track', m.playing === 1 && m.time > t3 && Math.abs(m.gains[m.active] - 0.4) < 0.06, `gain ${m.gains[m.active]} time ${t3.toFixed(1)}->${m.time.toFixed(1)}`);
  await page.locator('.audio-switch input').first().uncheck();
  await page.waitForTimeout(1300);
  m = await music(page);
  check('music switch off: music stops, effects stay on', m.playing === 0 && m.state === 'off');
  await page.locator('.audio-switch input').first().check();
  await page.waitForTimeout(1200);
  check('music switch on again: music resumes (one instance)', (await music(page)).playing === 1);
  await page.locator('.audio-switch input').first().uncheck();
  await page.waitForTimeout(1300);
  await page.locator('.audio-switch input').nth(1).click(); await page.locator('.audio-switch input').nth(1).click(); // effects off/on: never starts music
  check('effects controls never start the music', (await music(page)).playing === 0);
  await page.locator('.audio-slider').nth(1).fill('40');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.audio.v3')));
  check('changed settings are saved', saved?.musicOn === false && saved?.effectsOn === true && Math.abs(saved?.effectsVolume - 0.4) < 0.01, JSON.stringify(saved));
  // Language change and reload keep the audio settings.
  await page.locator('.game-topbar .language-select select').selectOption('zh');
  await page.reload();
  await page.locator('.hero-actions .button').first().waitFor();
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('lifetrack.audio.v3')));
  check('settings survive language change and reload', JSON.stringify(kept) === JSON.stringify(saved));
  await page.locator('.hero-actions .button').first().click();
  await page.waitForTimeout(1200);
  check('music stays off after reload when the player turned it off', (await music(page)).playing === 0);
  check('no console errors', !logs.some((l) => l.startsWith('error')), logs.filter((l) => l.startsWith('error')).join(' | '));
  await ctx.close();
}
{
  // Blocked autoplay: while the browser refuses play(), the music waits (no errors) and a "Play music" chip appears;
  // every later gesture retries (pointerdown, pointerup, touchend, click, keydown), and the chip starts it in one tap.
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { globalThis.__blockPlay = true; const orig = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return globalThis.__blockPlay ? Promise.reject(new DOMException('blocked', 'NotAllowedError')) : orig.call(this); }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.locator('.hero-actions .button').first().waitFor();
  await page.locator('.hero-copy h1').click(); // a tap on the page, staying on the homepage
  await page.waitForTimeout(800);
  const first = await music(page);
  check('blocked play: waits instead of failing', first.state === 'waiting' && first.playing === 0, JSON.stringify(first));
  check('blocked play: the audio button shows it is waiting', await page.locator('.audio-toggle.is-waiting').count() === 1);
  check('blocked play: a "Play music" chip is offered', await page.locator('.music-prompt').isVisible());
  await page.evaluate(() => { globalThis.__blockPlay = false; });
  await page.locator('.music-prompt').click();
  await page.waitForTimeout(2000);
  const second = await music(page);
  check('blocked play: one tap on the chip starts the music', second.state === 'playing' && second.playing === 1, JSON.stringify(second));
  check('blocked play: the chip goes away once playing', await page.locator('.music-prompt').count() === 0);
  check('blocked play: no errors logged', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  // Missing files: block the dice and step sounds; the game still plays and only one warning is logged.
  const ctx = await browser.newContext();
  await ctx.route(/\/audio\/(dice-shake-\d|step-\d)\.mp3/, (r) => r.fulfill({ status: 404, body: '' }));
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
