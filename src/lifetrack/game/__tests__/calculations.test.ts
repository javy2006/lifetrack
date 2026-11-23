import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlayerState, PolicyId } from '../types.ts';
import {
  applyEventOutcome,
  applyIncome,
  applyMonthlyBills,
  applyPass,
  applyPurchase,
  applySave,
  assessCoverage,
  calculateClaim,
  calculateReimbursement,
  checkPurchase,
  checkSave,
  closeRound,
  createPlayer,
  getRoundSummary,
  lockDecisions,
  payFromCashThenSavings,
} from '../calculations.ts';
import { EVENT_CARDS, getEvent } from '../events.ts';
import { POLICIES, POLICY_ORDER } from '../policies.ts';
import { GAME_CONFIG } from '../constants.ts';
import { formatRM } from '../format.ts';

function playerWith(policies: PolicyId[], cash = 2000, savings = 0): PlayerState {
  return { ...createPlayer('aisyah', 'human'), cash, savings, policies: policies.map((policyId) => ({ policyId, purchasedRound: 1 })) };
}

test('medical reimbursement matches the specification example (RM2,500 bill)', () => {
  const r = calculateReimbursement(2500, 300, 2000);
  assert.equal(r.payout, 2000);
  assert.equal(r.playerShare, 500);
  assert.equal(r.deductibleApplied, 300);
  assert.equal(r.limitReached, true);
  assert.equal(r.amountAboveLimit, 200);
});

test('medical reimbursement within the limit pays the bill minus the deductible', () => {
  assert.deepEqual([2000, 1800, 800].map((bill) => calculateReimbursement(bill, 300, 2000).payout), [1700, 1500, 500]);
  assert.deepEqual([2000, 1800, 800].map((bill) => calculateReimbursement(bill, 300, 2000).playerShare), [300, 300, 300]);
});

test('bills at or below the deductible are not reimbursed', () => {
  for (const bill of [0, 200, 300]) {
    const r = calculateReimbursement(bill, 300, 2000);
    assert.equal(r.payout, 0);
    assert.equal(r.playerShare, bill);
    assert.equal(r.deductibleApplied, Math.min(300, bill));
  }
});

test('payments use cash first, then savings, then record an explicit shortfall', () => {
  assert.deepEqual(payFromCashThenSavings(1000, 500, 800), { cash: 200, savings: 500, fromCash: 800, fromSavings: 0, shortfall: 0 });
  assert.deepEqual(payFromCashThenSavings(300, 500, 600), { cash: 0, savings: 200, fromCash: 300, fromSavings: 300, shortfall: 0 });
  assert.deepEqual(payFromCashThenSavings(300, 400, 2500), { cash: 0, savings: 0, fromCash: 300, fromSavings: 400, shortfall: 1800 });
});

test('salary and essential expenses apply exactly once per round', () => {
  let p = createPlayer('alex', 'saver');
  p = applyIncome(p, 1);
  assert.equal(p.cash, GAME_CONFIG.startingCash + GAME_CONFIG.monthlyIncome);
  assert.equal(applyIncome(p, 1), p, 'second salary credit is ignored');
  p = applyMonthlyBills(p, 1);
  assert.equal(p.cash, GAME_CONFIG.startingCash + GAME_CONFIG.monthlyIncome - GAME_CONFIG.essentialExpenses);
  assert.equal(p.actionPoints, GAME_CONFIG.actionPointsPerRound);
  assert.equal(applyMonthlyBills(p, 1), p, 'second bill payment is ignored');
});

test('a new policy charges its first premium at purchase and then once per later round', () => {
  let p = applyMonthlyBills(applyIncome(createPlayer('meiling', 'balanced'), 1), 1);
  p = applyPurchase(p, 'medical', 1);
  assert.equal(p.cash, 3000 - 120);
  assert.equal(applyPurchase(p, 'medical', 1), p, 'a policy can only be bought once');
  p = lockDecisions(applyPass(p, 1), 1);
  p = closeRound(applyEventOutcome(p, getEvent('quiet-month'), 1), 1);
  const r1 = getRoundSummary(p, 1);
  assert.equal(r1?.newPolicyPremiums, 120);
  assert.equal(r1?.recurringPremiums, 0);

  p = applyMonthlyBills(applyIncome(p, 2), 2);
  const r2 = getRoundSummary(p, 2);
  assert.equal(r2?.recurringPremiums, 120);
  assert.equal(r2?.newPolicyPremiums, 0);
  assert.equal(p.cash, 2880 + 3500 - 2500 - 120);
  assert.equal(p.history[1].premiumCharges.length, 1);
});

test('decisions are blocked without action points, cash, or when already owned', () => {
  let p = applyMonthlyBills(applyIncome(createPlayer('daniel', 'protection'), 1), 1);
  assert.equal(checkPurchase(p, 'critical', 1).allowed, true);
  p = applyPurchase(p, 'critical', 1);
  assert.equal(checkPurchase(p, 'critical', 1).reason, 'already-owned');
  p = applySave(p, 1);
  assert.equal(p.actionPoints, 0);
  assert.equal(checkSave(p, 1).reason, 'no-action-points');
  assert.equal(applySave(p, 1), p);

  const broke = { ...applyMonthlyBills(applyIncome(createPlayer('alex', 'saver'), 1), 1), cash: 100 };
  assert.equal(checkSave(broke, 1).reason, 'insufficient-cash');
  assert.equal(checkPurchase(broke, 'medical', 1).reason, 'insufficient-cash');
  assert.equal(checkPurchase(broke, 'accident', 1).allowed, true);
});

test('saving moves exactly RM300 from cash to emergency savings', () => {
  const p = applyMonthlyBills(applyIncome(createPlayer('alex', 'saver'), 1), 1);
  const saved = applySave(p, 1);
  assert.equal(saved.cash, p.cash - 300);
  assert.equal(saved.savings, p.savings + 300);
  assert.equal(saved.cash + saved.savings, p.cash + p.savings);
});

test('road accident: Medical Protection reimburses RM1,700 and Personal Accident pays a fixed RM1,000', () => {
  const claim = calculateClaim(playerWith(['medical', 'accident']), getEvent('road-accident'));
  assert.equal(claim.totalExpense, 2000);
  assert.equal(claim.reimbursement, 1700);
  assert.equal(claim.fixedBenefits, 1000);
  assert.equal(claim.outOfPocket, 300);
  assert.equal(claim.netCashImpact, 700);
  assert.equal(claim.creditedToCash, 700);
  assert.equal(claim.cashAfter, 2700);
});

test('hospitalisation reaches the coverage limit', () => {
  const claim = calculateClaim(playerWith(['medical']), getEvent('dengue-admission'));
  const medical = claim.outcomes.find((o) => o.policyId === 'medical');
  assert.equal(medical?.status, 'paid');
  assert.equal(medical?.limitReached, true);
  assert.equal(claim.reimbursement, 2000);
  assert.equal(claim.outOfPocket, 500);
  assert.equal(claim.cashAfter, 1500);
});

test('critical illness pays a lump sum and is not reimbursed by Medical Protection', () => {
  const withCritical = calculateClaim(playerWith(['critical']), getEvent('critical-illness'));
  assert.equal(withCritical.fixedBenefits, 2500);
  assert.equal(withCritical.netCashImpact, 500);
  const withMedicalOnly = calculateClaim(playerWith(['medical']), getEvent('critical-illness'));
  assert.equal(withMedicalOnly.reimbursement, 0);
  assert.equal(withMedicalOnly.outcomes.find((o) => o.policyId === 'medical')?.status, 'not-covered');
  assert.equal(withMedicalOnly.paidFromCash, 2000);
});

test('excluded and outpatient events never produce a payout', () => {
  const all: PolicyId[] = ['medical', 'accident', 'critical'];
  const dental = calculateClaim(playerWith(all), getEvent('wisdom-tooth'));
  assert.equal(dental.outcomes.find((o) => o.policyId === 'medical')?.status, 'excluded');
  assert.equal(dental.reimbursement + dental.fixedBenefits, 0);
  for (const id of ['er-visit', 'futsal-sprain', 'back-strain', 'bad-flu', 'family-clinic', 'job-loss', 'family-emergency']) {
    const claim = calculateClaim(playerWith(all), getEvent(id));
    assert.equal(claim.reimbursement + claim.fixedBenefits, 0, `${id} should not pay`);
  }
});

test('owning a policy only pays when the event meets its defined trigger', () => {
  for (const event of EVENT_CARDS) {
    for (const policyId of POLICY_ORDER) {
      const outcome = assessCoverage(policyId, event);
      if (outcome.payout > 0) assert.equal(event.triggers[POLICIES[policyId].trigger], true, `${policyId} paid on ${event.id}`);
    }
  }
});

test('policies that are not owned never pay', () => {
  const claim = calculateClaim(playerWith([]), getEvent('road-accident'));
  assert.ok(claim.outcomes.every((o) => o.status === 'not-owned' && o.payout === 0));
  assert.equal(claim.outOfPocket, 2000);
});

test('unaffordable event costs drain cash, then savings, then record a shortfall without debt', () => {
  const claim = calculateClaim(playerWith([], 500, 400), getEvent('dengue-admission'));
  assert.equal(claim.paidFromCash, 500);
  assert.equal(claim.paidFromSavings, 400);
  assert.equal(claim.shortfall, 1600);
  assert.equal(claim.cashAfter, 0);
  assert.equal(claim.savingsAfter, 0);
});

test('an event resolves only once per round', () => {
  let p = applyMonthlyBills(applyIncome(playerWith(['medical']), 1), 1);
  p = lockDecisions(applyPass(applyPass(p, 1), 1), 1);
  const resolved = applyEventOutcome(p, getEvent('dengue-admission'), 1);
  assert.notEqual(resolved, p);
  assert.equal(applyEventOutcome(resolved, getEvent('dengue-admission'), 1), resolved);
});

test('every event card has valid integer costs and complete educational content', () => {
  assert.ok(EVENT_CARDS.length >= 12);
  assert.equal(new Set(EVENT_CARDS.map((e) => e.id)).size, EVENT_CARDS.length);
  for (const event of EVENT_CARDS) {
    assert.ok(event.title && event.story && event.riskLabel && event.lesson.text);
    for (const policyId of POLICY_ORDER) assert.ok(event.coverageNotes[policyId]);
    for (const expense of event.expenses) assert.ok(Number.isInteger(expense.amount) && expense.amount > 0);
  }
});

test('currency formatting uses RM with thousands separators', () => {
  assert.equal(formatRM(2500), 'RM2,500');
  assert.equal(formatRM(-300), '\u2212RM300');
  assert.equal(formatRM(1000, 'always'), '+RM1,000');
  assert.equal(formatRM(0, 'always'), 'RM0');
});
