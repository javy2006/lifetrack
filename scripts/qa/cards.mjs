// LifeTrack card QA: inspect view, choose/put back, ledger preview and exactly-once confirm on a double-click.
//   node cards.mjs http://127.0.0.1:4174/ [390x844]   (run from a folder with playwright-core 1.49.1; uses installed Edge)
// Card inspect + exactly-once checks: open the Medical card's inspect view, choose it there, change to Save,
// confirm with a double-click, and verify the engine applied exactly the confirmed moves once.
import { chromium } from 'playwright-core';
const [url, size='390x844'] = process.argv.slice(2); const [w,h]=size.split('x').map(Number);
const fails=[]; const check=(n,ok,d='')=>{console.log(`${ok?'PASS':'FAIL'} ${n} ${d}`); if(!ok) fails.push(n);};
const b = await chromium.launch({ channel:'msedge' }); const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const btn=(re)=>p.locator('button',{hasText:re}).first(); const click=async(re)=>{await btn(re).waitFor({timeout:20000}); await btn(re).click();};
const game=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('lifetrack.game.v1')));
await p.goto(url); await click(/Play the game/); await p.locator('button.character-option').nth(0).click(); await click(/^Continue/); await click(/Begin month one/);
await click(/Collect monthly income/); await click(/Pay monthly essentials/);
await p.getByRole('button',{name:'Roll Dice'}).click(); await p.locator('button.save-action').waitFor({timeout:20000}); await p.waitForTimeout(700);
const before=(await game()).players.find(x=>x.controller==='human');
await p.locator('.policy-medical').locator('xpath=..').locator('.cc-inspect').click();
check('inspect view opens', await p.locator('.cc-zoom').isVisible());
check('inspect shows cover details', (await p.locator('.cc-zoom-body').innerText()).length > 40);
await p.locator('.cc-zoom .button', { hasText: /Choose this card/ }).click();
check('choosing in inspect selects the card', await p.locator('button.policy-medical').getAttribute('aria-pressed') === 'true');
check('no money moved before confirm', JSON.stringify((await game()).players.find(x=>x.controller==='human').cash) === JSON.stringify(before.cash));
await p.locator('.policy-medical').locator('xpath=..').locator('.cc-inspect').click();
await p.keyboard.press('Escape'); check('Escape closes inspect', !(await p.locator('.cc-zoom').count()));
await p.locator('button.policy-medical').click(); check('tapping a picked card puts it back', await p.locator('button.policy-medical').getAttribute('aria-pressed') === 'false');
await p.locator('button.save-action').click(); await p.locator('button.policy-accident').click();
const ledger = await p.locator('.tc-ledger-rows').innerText();
check('ledger previews cash, savings and cover', /RM/.test(ledger) && ledger.split('\n').length >= 6, ledger.replace(/\n/g,' | '));
await p.locator('button.decision-confirm').dblclick(); await p.waitForTimeout(2500);
const after=(await game()).players.find(x=>x.controller==='human');
const rec=after.rounds?.find?.(r=>r.round===1) ?? null;
check('exactly-once: cash fell by save + accident premium only', before.cash - after.cash === 300 + 40, `${before.cash} -> ${after.cash}`);
check('exactly-once: savings +300', after.savings - before.savings === 300, `${before.savings} -> ${after.savings}`);
check('accident cover owned once', after.policies.filter(x=>x.policyId==='accident').length === 1);
check('no console errors', errs.length===0, errs.join(' | '));
console.log(fails.length?`FAILED ${fails.length}`:'ALL PASS'); await b.close();
