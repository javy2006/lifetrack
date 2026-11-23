/**
 * Pure LifeTrack financial engine. Every function returns new objects and never
 * mutates its inputs. Each step is guarded by the round stage so income, bills,
 * premiums and claims can only ever be applied once per round.
 */
import type {
  CharacterId,
  ClaimResult,
  Controller,
  EventCard,
  Money,
  PlayerAction,
  PlayerState,
  PolicyId,
  PolicyOutcome,
  PremiumCharge,
  RoundRecord,
} from './types.ts';
import { GAME_CONFIG } from './constants.ts';
import { POLICIES, POLICY_ORDER } from './policies.ts';
import { formatRM } from './format.ts';

export function sumMoney(values: readonly Money[]): Money {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function createPlayer(id: CharacterId, controller: Controller): PlayerState {
  return {
    id,
    controller,
    cash: GAME_CONFIG.startingCash,
    savings: GAME_CONFIG.startingSavings,
    policies: [],
    actionPoints: 0,
    unpaidShortfall: 0,
    history: [],
  };
}

export function getRoundRecord(player: PlayerState, round: number): RoundRecord | undefined {
  return player.history[round - 1];
}

function replaceRoundRecord(player: PlayerState, round: number, record: RoundRecord): PlayerState {
  const history = player.history.slice();
  history[round - 1] = record;
  return { ...player, history };
}

export function hasPolicy(player: Pick<PlayerState, 'policies'>, policyId: PolicyId): boolean {
  return player.policies.some((owned) => owned.policyId === policyId);
}

export function getMonthlyPremiumTotal(player: Pick<PlayerState, 'policies'>): Money {
  return sumMoney(player.policies.map((owned) => POLICIES[owned.policyId].monthlyPremium));
}

export function getNetPosition(player: Pick<PlayerState, 'cash' | 'savings'>): Money {
  return player.cash + player.savings;
}

export interface PaymentResult {
  cash: Money;
  savings: Money;
  fromCash: Money;
  fromSavings: Money;
  shortfall: Money;
}

/** Pays an unavoidable cost from cash first, then emergency savings. Any remainder is an explicit shortfall. */
export function payFromCashThenSavings(cash: Money, savings: Money, amount: Money): PaymentResult {
  const fromCash = Math.min(cash, amount);
  const remaining = amount - fromCash;
  const fromSavings = Math.min(savings, remaining);
  return {
    cash: cash - fromCash,
    savings: savings - fromSavings,
    fromCash,
    fromSavings,
    shortfall: remaining - fromSavings,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 1: monthly income                                             */
/* ------------------------------------------------------------------ */

export function applyIncome(player: PlayerState, round: number): PlayerState {
  // A record for this round means salary has already been credited.
  if (player.history.length !== round - 1) return player;
  const record: RoundRecord = {
    round,
    stage: 'income-received',
    cashAtStart: player.cash,
    savingsAtStart: player.savings,
    income: GAME_CONFIG.monthlyIncome,
    essentials: 0,
    premiumCharges: [],
    lapsedPolicies: [],
    billsFromSavings: 0,
    billsShortfall: 0,
    actions: [],
    eventId: null,
    claim: null,
    cashAtEnd: null,
    savingsAtEnd: null,
  };
  return { ...player, cash: player.cash + GAME_CONFIG.monthlyIncome, history: [...player.history, record] };
}

/* ------------------------------------------------------------------ */
/* Phase 2: essential expenses and recurring premiums                  */
/* ------------------------------------------------------------------ */

export interface MonthlyBills {
  essentials: Money;
  premiums: PremiumCharge[];
  premiumTotal: Money;
  total: Money;
  lapsed: PolicyId[];
  fromSavings: Money;
  shortfall: Money;
  cashBefore: Money;
  savingsBefore: Money;
  cashAfter: Money;
  savingsAfter: Money;
}

/** Premiums due this round: policies bought in earlier rounds. A new policy's first premium is paid at purchase. */
export function getRecurringPremiums(player: Pick<PlayerState, 'policies'>, round: number): PremiumCharge[] {
  return player.policies
    .filter((owned) => owned.purchasedRound < round)
    .map((owned) => ({ policyId: owned.policyId, amount: POLICIES[owned.policyId].monthlyPremium }));
}

export function calculateMonthlyBills(player: PlayerState, round: number): MonthlyBills {
  const essentials = payFromCashThenSavings(player.cash, player.savings, GAME_CONFIG.essentialExpenses);
  let cash = essentials.cash;
  let savings = essentials.savings;
  let fromSavings = essentials.fromSavings;
  const premiums: PremiumCharge[] = [];
  const lapsed: PolicyId[] = [];
  for (const charge of getRecurringPremiums(player, round)) {
    // Optional premiums never create a shortfall: if they cannot be paid, the policy lapses.
    if (cash + savings < charge.amount) {
      lapsed.push(charge.policyId);
      continue;
    }
    const payment = payFromCashThenSavings(cash, savings, charge.amount);
    cash = payment.cash;
    savings = payment.savings;
    fromSavings += payment.fromSavings;
    premiums.push(charge);
  }
  const premiumTotal = sumMoney(premiums.map((p) => p.amount));
  return {
    essentials: GAME_CONFIG.essentialExpenses,
    premiums,
    premiumTotal,
    total: GAME_CONFIG.essentialExpenses + premiumTotal,
    lapsed,
    fromSavings,
    shortfall: essentials.shortfall,
    cashBefore: player.cash,
    savingsBefore: player.savings,
    cashAfter: cash,
    savingsAfter: savings,
  };
}

export function applyMonthlyBills(player: PlayerState, round: number): PlayerState {
  const record = getRoundRecord(player, round);
  if (!record || record.stage !== 'income-received') return player;
  const bills = calculateMonthlyBills(player, round);
  const updated = replaceRoundRecord(player, round, {
    ...record,
    stage: 'bills-paid',
    essentials: bills.essentials,
    premiumCharges: bills.premiums,
    lapsedPolicies: bills.lapsed,
    billsFromSavings: bills.fromSavings,
    billsShortfall: bills.shortfall,
  });
  return {
    ...updated,
    cash: bills.cashAfter,
    savings: bills.savingsAfter,
    policies: player.policies.filter((owned) => !bills.lapsed.includes(owned.policyId)),
    unpaidShortfall: player.unpaidShortfall + bills.shortfall,
    actionPoints: GAME_CONFIG.actionPointsPerRound,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 3: decisions (identical rules for human and AI players)       */
/* ------------------------------------------------------------------ */

export type DecisionBlocker = 'not-decision-phase' | 'no-action-points' | 'insufficient-cash' | 'already-owned';

export interface DecisionCheck {
  allowed: boolean;
  reason?: DecisionBlocker;
}

function isDecisionOpen(player: PlayerState, round: number): boolean {
  return getRoundRecord(player, round)?.stage === 'bills-paid';
}

export function checkSave(player: PlayerState, round: number): DecisionCheck {
  if (!isDecisionOpen(player, round)) return { allowed: false, reason: 'not-decision-phase' };
  if (player.actionPoints <= 0) return { allowed: false, reason: 'no-action-points' };
  if (player.cash < GAME_CONFIG.saveAmount) return { allowed: false, reason: 'insufficient-cash' };
  return { allowed: true };
}

export function checkPurchase(player: PlayerState, policyId: PolicyId, round: number): DecisionCheck {
  if (!isDecisionOpen(player, round)) return { allowed: false, reason: 'not-decision-phase' };
  if (hasPolicy(player, policyId)) return { allowed: false, reason: 'already-owned' };
  if (player.actionPoints <= 0) return { allowed: false, reason: 'no-action-points' };
  if (player.cash < POLICIES[policyId].monthlyPremium) return { allowed: false, reason: 'insufficient-cash' };
  return { allowed: true };
}

export function checkPass(player: PlayerState, round: number): DecisionCheck {
  if (!isDecisionOpen(player, round)) return { allowed: false, reason: 'not-decision-phase' };
  if (player.actionPoints <= 0) return { allowed: false, reason: 'no-action-points' };
  return { allowed: true };
}

function withAction(
  player: PlayerState,
  round: number,
  action: PlayerAction,
  patch: Partial<Pick<PlayerState, 'cash' | 'savings' | 'policies'>>,
): PlayerState {
  const record = getRoundRecord(player, round) as RoundRecord;
  const updated = replaceRoundRecord(player, round, { ...record, actions: [...record.actions, action] });
  return { ...updated, ...patch, actionPoints: player.actionPoints - 1 };
}

export function applySave(player: PlayerState, round: number): PlayerState {
  if (!checkSave(player, round).allowed) return player;
  const amount = GAME_CONFIG.saveAmount;
  return withAction(player, round, { kind: 'save', amount }, { cash: player.cash - amount, savings: player.savings + amount });
}

export function applyPurchase(player: PlayerState, policyId: PolicyId, round: number): PlayerState {
  if (!checkPurchase(player, policyId, round).allowed) return player;
  const premium = POLICIES[policyId].monthlyPremium;
  return withAction(
    player,
    round,
    { kind: 'buy', policyId, amount: premium },
    { cash: player.cash - premium, policies: [...player.policies, { policyId, purchasedRound: round }] },
  );
}

export function applyPass(player: PlayerState, round: number): PlayerState {
  if (!checkPass(player, round).allowed) return player;
  return withAction(player, round, { kind: 'pass', amount: 0 }, {});
}

/** Locks a player's decisions once every action point has been used. */
export function lockDecisions(player: PlayerState, round: number): PlayerState {
  const record = getRoundRecord(player, round);
  if (!record || record.stage !== 'bills-paid' || player.actionPoints > 0) return player;
  return replaceRoundRecord(player, round, { ...record, stage: 'decisions-locked' });
}

export interface PurchasePreview {
  premium: Money;
  cashBefore: Money;
  cashAfter: Money;
  futurePayments: number;
  totalIfKept: Money;
  monthlyPremiumsAfter: Money;
}

export function previewPurchase(player: PlayerState, policyId: PolicyId, round: number): PurchasePreview {
  const premium = POLICIES[policyId].monthlyPremium;
  const futurePayments = GAME_CONFIG.totalRounds - round;
  return {
    premium,
    cashBefore: player.cash,
    cashAfter: player.cash - premium,
    futurePayments,
    totalIfKept: premium * (futurePayments + 1),
    monthlyPremiumsAfter: getMonthlyPremiumTotal(player) + premium,
  };
}

/* ------------------------------------------------------------------ */
/* Phases 4 and 5: events and claims                                   */
/* ------------------------------------------------------------------ */

export function getEventTotal(event: EventCard): Money {
  return sumMoney(event.expenses.map((expense) => expense.amount));
}

/** Hospital expenses count as eligible medical expenses only when the event involves a hospital admission. */
export function getEligibleMedicalExpense(event: EventCard): Money {
  if (!event.triggers.hospitalAdmission) return 0;
  return sumMoney(event.expenses.filter((expense) => expense.kind === 'hospital').map((expense) => expense.amount));
}

export interface ReimbursementBreakdown {
  eligibleAmount: Money;
  deductibleApplied: Money;
  amountAfterDeductible: Money;
  payout: Money;
  limitReached: boolean;
  amountAboveLimit: Money;
  playerShare: Money;
}

/** payout = MIN(coverage limit, MAX(0, eligible bill - deductible)); player share = eligible bill - payout. */
export function calculateReimbursement(eligibleAmount: Money, deductible: Money, coverageLimit: Money): ReimbursementBreakdown {
  const amountAfterDeductible = Math.max(0, eligibleAmount - deductible);
  const payout = Math.min(coverageLimit, amountAfterDeductible);
  return {
    eligibleAmount,
    deductibleApplied: Math.min(deductible, eligibleAmount),
    amountAfterDeductible,
    payout,
    limitReached: amountAfterDeductible > coverageLimit,
    amountAboveLimit: Math.max(0, amountAfterDeductible - coverageLimit),
    playerShare: eligibleAmount - payout,
  };
}

/**
 * How a policy would respond to an event, independent of ownership. A payout
 * only happens when the event meets the policy's defined trigger.
 */
export function assessCoverage(policyId: PolicyId, event: EventCard): PolicyOutcome {
  const policy = POLICIES[policyId];
  const note = event.coverageNotes[policyId];
  const triggered = event.triggers[policy.trigger];
  const benefit = policy.benefit;

  if (benefit.kind === 'reimbursement') {
    const eligible = getEligibleMedicalExpense(event);
    if (!triggered || eligible === 0) {
      const excluded = event.expenses.some((expense) => policy.excludedExpenseKinds.includes(expense.kind));
      return { policyId, benefitKind: benefit.kind, status: excluded ? 'excluded' : 'not-covered', payout: 0, reason: note };
    }
    const r = calculateReimbursement(eligible, benefit.deductible, benefit.coverageLimit);
    const detail = r.limitReached
      ? `${formatRM(eligible)} eligible bill − ${formatRM(r.deductibleApplied)} deductible = ${formatRM(r.amountAfterDeductible)}, capped at the ${formatRM(benefit.coverageLimit)} coverage limit.`
      : `${formatRM(eligible)} eligible bill − ${formatRM(r.deductibleApplied)} deductible = ${formatRM(r.payout)} reimbursed.`;
    return {
      policyId,
      benefitKind: benefit.kind,
      status: r.payout > 0 ? 'paid' : 'below-deductible',
      payout: r.payout,
      reason: r.payout > 0 ? detail : `The ${formatRM(eligible)} bill is within the ${formatRM(benefit.deductible)} deductible.`,
      eligibleAmount: eligible,
      deductibleApplied: r.deductibleApplied,
      amountAfterDeductible: r.amountAfterDeductible,
      coverageLimit: benefit.coverageLimit,
      limitReached: r.limitReached,
      amountAboveLimit: r.amountAboveLimit,
    };
  }

  if (!triggered) return { policyId, benefitKind: benefit.kind, status: 'not-covered', payout: 0, reason: note };
  const label = benefit.kind === 'fixed' ? 'fixed cash benefit' : 'lump-sum benefit';
  return {
    policyId,
    benefitKind: benefit.kind,
    status: 'paid',
    payout: benefit.amount,
    reason: `${note} ${formatRM(benefit.amount)} ${label} paid to you.`,
  };
}

/** True when at least one policy would pay something for this event. */
export function isInsurableEvent(event: EventCard): boolean {
  return POLICY_ORDER.some((policyId) => assessCoverage(policyId, event).payout > 0);
}

export function calculateClaim(player: PlayerState, event: EventCard): ClaimResult {
  const totalExpense = getEventTotal(event);
  const outcomes: PolicyOutcome[] = POLICY_ORDER.map((policyId) => {
    if (hasPolicy(player, policyId)) return assessCoverage(policyId, event);
    return {
      policyId,
      benefitKind: POLICIES[policyId].benefit.kind,
      status: 'not-owned',
      payout: 0,
      reason: 'Not owned.',
    };
  });
  const reimbursement = sumMoney(outcomes.filter((o) => o.benefitKind === 'reimbursement').map((o) => o.payout));
  const fixedBenefits = sumMoney(outcomes.filter((o) => o.benefitKind !== 'reimbursement').map((o) => o.payout));
  const outOfPocket = totalExpense - reimbursement;
  const netCashImpact = fixedBenefits - outOfPocket;

  let cashAfter = player.cash;
  let savingsAfter = player.savings;
  let creditedToCash = 0;
  let paidFromCash = 0;
  let paidFromSavings = 0;
  let shortfall = 0;
  if (netCashImpact >= 0) {
    // Fixed benefits cover the out-of-pocket cost; any surplus is credited to cash.
    creditedToCash = netCashImpact;
    cashAfter += netCashImpact;
  } else {
    const payment = payFromCashThenSavings(player.cash, player.savings, -netCashImpact);
    cashAfter = payment.cash;
    savingsAfter = payment.savings;
    paidFromCash = payment.fromCash;
    paidFromSavings = payment.fromSavings;
    shortfall = payment.shortfall;
  }

  return {
    eventId: event.id,
    totalExpense,
    eligibleMedicalExpense: getEligibleMedicalExpense(event),
    reimbursement,
    fixedBenefits,
    outOfPocket,
    netCashImpact,
    creditedToCash,
    paidFromCash,
    paidFromSavings,
    shortfall,
    cashBefore: player.cash,
    savingsBefore: player.savings,
    cashAfter,
    savingsAfter,
    outcomes,
  };
}

export function applyEventOutcome(player: PlayerState, event: EventCard, round: number): PlayerState {
  const record = getRoundRecord(player, round);
  if (!record || record.stage !== 'decisions-locked') return player;
  const claim = calculateClaim(player, event);
  const updated = replaceRoundRecord(player, round, { ...record, stage: 'claim-resolved', eventId: event.id, claim });
  return {
    ...updated,
    cash: claim.cashAfter,
    savings: claim.savingsAfter,
    unpaidShortfall: player.unpaidShortfall + claim.shortfall,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 6: round close and summaries                                  */
/* ------------------------------------------------------------------ */

export function closeRound(player: PlayerState, round: number): PlayerState {
  const record = getRoundRecord(player, round);
  if (!record || record.stage !== 'claim-resolved') return player;
  return replaceRoundRecord(player, round, {
    ...record,
    stage: 'closed',
    cashAtEnd: player.cash,
    savingsAtEnd: player.savings,
  });
}

export interface RoundSummary {
  round: number;
  income: Money;
  essentials: Money;
  recurringPremiums: Money;
  newPolicyPremiums: Money;
  premiums: Money;
  saved: Money;
  eventCost: Money;
  reimbursement: Money;
  fixedBenefits: Money;
  benefits: Money;
  outOfPocket: Money;
  shortfall: Money;
  cashStart: Money;
  savingsStart: Money;
  cashEnd: Money;
  savingsEnd: Money;
  netChange: Money;
  actions: PlayerAction[];
  boughtPolicies: PolicyId[];
  lapsedPolicies: PolicyId[];
}

export function getRoundSummary(player: PlayerState, round: number): RoundSummary | null {
  const record = getRoundRecord(player, round);
  if (!record) return null;
  const claim = record.claim;
  const recurringPremiums = sumMoney(record.premiumCharges.map((c) => c.amount));
  const buys = record.actions.filter((a): a is Extract<PlayerAction, { kind: 'buy' }> => a.kind === 'buy');
  const newPolicyPremiums = sumMoney(buys.map((a) => a.amount));
  const cashEnd = record.cashAtEnd ?? player.cash;
  const savingsEnd = record.savingsAtEnd ?? player.savings;
  return {
    round,
    income: record.income,
    essentials: record.essentials,
    recurringPremiums,
    newPolicyPremiums,
    premiums: recurringPremiums + newPolicyPremiums,
    saved: sumMoney(record.actions.filter((a) => a.kind === 'save').map((a) => a.amount)),
    eventCost: claim?.totalExpense ?? 0,
    reimbursement: claim?.reimbursement ?? 0,
    fixedBenefits: claim?.fixedBenefits ?? 0,
    benefits: (claim?.reimbursement ?? 0) + (claim?.fixedBenefits ?? 0),
    outOfPocket: claim?.outOfPocket ?? 0,
    shortfall: record.billsShortfall + (claim?.shortfall ?? 0),
    cashStart: record.cashAtStart,
    savingsStart: record.savingsAtStart,
    cashEnd,
    savingsEnd,
    netChange: cashEnd + savingsEnd - (record.cashAtStart + record.savingsAtStart),
    actions: record.actions,
    boughtPolicies: buys.map((a) => a.policyId),
    lapsedPolicies: record.lapsedPolicies,
  };
}

export interface PlayerTotals {
  income: Money;
  essentials: Money;
  premiums: Money;
  saved: Money;
  eventCosts: Money;
  reimbursements: Money;
  fixedBenefits: Money;
  benefits: Money;
  outOfPocket: Money;
  savingsUsed: Money;
  shortfall: Money;
  claimsPaid: number;
}

export function getPlayerTotals(player: PlayerState): PlayerTotals {
  const totals: PlayerTotals = {
    income: 0,
    essentials: 0,
    premiums: 0,
    saved: 0,
    eventCosts: 0,
    reimbursements: 0,
    fixedBenefits: 0,
    benefits: 0,
    outOfPocket: 0,
    savingsUsed: 0,
    shortfall: player.unpaidShortfall,
    claimsPaid: 0,
  };
  for (const record of player.history) {
    totals.income += record.income;
    totals.essentials += record.essentials;
    totals.premiums += sumMoney(record.premiumCharges.map((c) => c.amount));
    for (const action of record.actions) {
      if (action.kind === 'buy') totals.premiums += action.amount;
      if (action.kind === 'save') totals.saved += action.amount;
    }
    totals.savingsUsed += record.billsFromSavings;
    if (record.claim) {
      totals.eventCosts += record.claim.totalExpense;
      totals.reimbursements += record.claim.reimbursement;
      totals.fixedBenefits += record.claim.fixedBenefits;
      totals.outOfPocket += record.claim.outOfPocket;
      totals.savingsUsed += record.claim.paidFromSavings;
      totals.claimsPaid += record.claim.outcomes.filter((o) => o.status === 'paid').length;
    }
  }
  totals.benefits = totals.reimbursements + totals.fixedBenefits;
  return totals;
}

/** Net position (cash + savings) at the end of every completed round, starting with the opening balance. */
export function getNetPositionTimeline(player: PlayerState): Money[] {
  const timeline: Money[] = [GAME_CONFIG.startingCash + GAME_CONFIG.startingSavings];
  for (const record of player.history) {
    if (record.cashAtEnd !== null && record.savingsAtEnd !== null) timeline.push(record.cashAtEnd + record.savingsAtEnd);
  }
  return timeline;
}
