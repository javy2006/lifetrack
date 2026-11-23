import test from 'node:test';
import assert from 'node:assert/strict';
import { getHumanPlayer } from '../game/gameReducer.ts';
import { DEMO_HUMAN, createDemoGame, demoShowsInsurancePaying, nextDemoStep, playDemoToEnd } from './demoScript.ts';

test('the demo plays all six months through the real engine and ends on the results', () => {
  const final = playDemoToEnd();
  assert.equal(final.status, 'complete');
  assert.equal(final.humanId, DEMO_HUMAN);
  for (const p of final.players) assert.equal(p.history.length, 6, `${p.id} closed six months`);
});

test('the demo is reproducible: the same seed gives identical results every time', () => {
  assert.equal(JSON.stringify(playDemoToEnd()), JSON.stringify(playDemoToEnd()));
});

test('the demo shows insurance paying out, and money is conserved every month for every player', () => {
  const final = playDemoToEnd();
  assert.ok(demoShowsInsurancePaying(final), 'a claim is paid at some point');
  for (const p of final.players) for (const r of p.history) {
    const premiums = r.premiumCharges.reduce((n, c) => n + c.amount, 0);
    const bought = r.actions.reduce((n, a) => n + (a.kind === 'buy' ? a.amount : 0), 0);
    assert.equal(r.cashAtEnd! + r.savingsAtEnd!, r.cashAtStart + r.savingsAtStart + r.income - (r.essentials - r.billsShortfall) - premiums - bought + r.claim!.netCashImpact + r.claim!.shortfall, `${p.id} month ${r.round}`);
  }
  assert.ok(getHumanPlayer(final).policies.some((x) => x.policyId === 'medical'), 'the scripted plan bought medical cover');
});

test('the autopilot waits for the board during rolls and AI turns', () => {
  const s = createDemoGame();
  assert.equal(nextDemoStep(s, 'human-roll').kind, 'dispatch'); // income first
  const decisions = { ...s, phase: 'decisions' as const };
  assert.equal(nextDemoStep(decisions, 'human-roll').kind, 'roll');
  assert.equal(nextDemoStep(decisions, 'ai-turns').kind, 'wait');
  assert.equal(nextDemoStep({ ...s, phase: 'event-draw' }, 'ai-turns').kind, 'wait');
});
