/**
 * Short educational insights. Each has one explanation, one numerical example
 * drawn from the player's actual numbers where possible, and one takeaway.
 */
import type { ClaimResult, ConceptId, EventCard, PlayerState, PolicyId } from './types.ts';
import { GAME_CONFIG } from './constants.ts';
import { POLICIES } from './policies.ts';
import { getMonthlyPremiumTotal, previewPurchase } from './calculations.ts';
import { formatRM } from './format.ts';

export interface InsightContent {
  concept: ConceptId;
  title: string;
  explanation: string;
  example?: string;
  takeaway: string;
}

export const CONCEPTS: Record<ConceptId, { label: string; summary: string }> = {
  premium: { label: 'Premiums', summary: 'The recurring cost of keeping protection active.' },
  'recurring-premium': { label: 'Premiums without claims', summary: 'Premiums are paid even in months with no claim.' },
  'emergency-savings': { label: 'Emergency savings', summary: 'A buffer for costs insurance does not cover.' },
  deductible: { label: 'Deductibles', summary: 'The part of an eligible bill you pay first.' },
  'coverage-limit': { label: 'Coverage limits', summary: 'The most a policy pays for one event.' },
  exclusions: { label: 'Exclusions and conditions', summary: 'Policies only pay for the events they define.' },
  'fixed-benefit': { label: 'Fixed cash benefits', summary: 'A set amount paid when a defined event happens.' },
  'lump-sum': { label: 'Lump-sum benefits', summary: 'One payment on diagnosis, not a bill reimbursement.' },
  shortfall: { label: 'Shortfalls', summary: 'What happens when cash and savings run out.' },
};

export const CONCEPT_ORDER: readonly ConceptId[] = [
  'premium',
  'recurring-premium',
  'deductible',
  'coverage-limit',
  'fixed-benefit',
  'lump-sum',
  'exclusions',
  'emergency-savings',
];

export function getPurchaseInsight(player: PlayerState, policyId: PolicyId, round: number): InsightContent {
  const policy = POLICIES[policyId];
  const preview = previewPurchase(player, policyId, round);
  const remaining = preview.futurePayments;
  return {
    concept: 'premium',
    title: `${policy.name} is active`,
    explanation: 'Your monthly premium is the recurring amount you pay to maintain this fictional protection.',
    example:
      remaining > 0
        ? `You paid ${formatRM(policy.monthlyPremium)} today and ${formatRM(policy.monthlyPremium)} will come out at the start of each of the ${remaining} remaining month${remaining === 1 ? '' : 's'}: ${formatRM(preview.totalIfKept)} in total if you keep it. Your premiums now total ${formatRM(getMonthlyPremiumTotal(player))} a month.`
        : `You paid ${formatRM(policy.monthlyPremium)} today for this final month of cover.`,
    takeaway: 'Protection has an ongoing cost. Make sure it fits your monthly budget.',
  };
}

export function getSavingsInsight(player: PlayerState): InsightContent {
  return {
    concept: 'emergency-savings',
    title: 'Emergency savings are growing',
    explanation: 'Emergency savings remain important because some unexpected expenses may not be covered by insurance.',
    example: `Your savings are now ${formatRM(player.savings)}. Costs like repairs, family help or job disruption are paid from cash first, then from savings.`,
    takeaway: `Each ${formatRM(GAME_CONFIG.saveAmount)} you set aside is a cushion for the costs no policy covers.`,
  };
}

export function getClaimInsight(claim: ClaimResult, event: EventCard, monthlyPremiums = 0): InsightContent {
  const medical = claim.outcomes.find((o) => o.policyId === 'medical');
  const accident = claim.outcomes.find((o) => o.policyId === 'accident');
  const critical = claim.outcomes.find((o) => o.policyId === 'critical');

  if (claim.shortfall > 0) {
    return {
      concept: 'shortfall',
      title: 'Your buffer ran out',
      explanation: 'When cash and emergency savings cannot cover an unavoidable cost, LifeTrack records an unpaid shortfall instead of creating debt.',
      example: `This event left ${formatRM(claim.shortfall)} unpaid after using ${formatRM(claim.paidFromCash)} of cash and ${formatRM(claim.paidFromSavings)} of savings.`,
      takeaway: 'A larger buffer, or protection for the risks you face, reduces the chance of a shortfall.',
    };
  }
  if (medical?.status === 'paid' && medical.limitReached) {
    return {
      concept: 'coverage-limit',
      title: 'The coverage limit was reached',
      explanation: 'A coverage limit is the maximum amount this game policy pays for the defined event.',
      example: `${formatRM(medical.eligibleAmount ?? 0)} bill − ${formatRM(medical.deductibleApplied ?? 0)} deductible = ${formatRM(medical.amountAfterDeductible ?? 0)}, but the limit is ${formatRM(medical.coverageLimit ?? 0)}. You paid ${formatRM(claim.outOfPocket)} yourself.`,
      takeaway: 'Large bills can exceed a policy limit. Savings fill the gap.',
    };
  }
  if (medical?.status === 'paid' || medical?.status === 'below-deductible') {
    return {
      concept: 'deductible',
      title: 'The deductible came first',
      explanation: 'A deductible is the amount you pay first before the fictional insurer begins paying eligible expenses.',
      example: `On a ${formatRM(medical.eligibleAmount ?? 0)} bill you paid the first ${formatRM(medical.deductibleApplied ?? 0)} and Medical Protection reimbursed ${formatRM(medical.payout)}.`,
      takeaway: 'Even with cover, keep enough cash for the deductible.',
    };
  }
  if (critical?.status === 'paid') {
    return {
      concept: 'lump-sum',
      title: 'A lump sum, not a reimbursement',
      explanation: 'Critical Illness Protection pays one fixed amount on diagnosis. It does not depend on the size of any bill.',
      example: `The policy paid ${formatRM(critical.payout)} against ${formatRM(claim.totalExpense)} of recovery costs and lost income, a net change of ${formatRM(claim.netCashImpact, 'always')}.`,
      takeaway: 'Lump sums give flexibility for costs a hospital bill never shows.',
    };
  }
  if (accident?.status === 'paid') {
    return {
      concept: 'fixed-benefit',
      title: 'A fixed benefit was paid',
      explanation: 'Personal Accident pays a set cash amount for a specified injury. It is not tied to what the treatment cost.',
      example: `The bill was ${formatRM(claim.totalExpense)}; the fixed benefit was ${formatRM(accident.payout)}. Net change: ${formatRM(claim.netCashImpact, 'always')}.`,
      takeaway: 'Reimbursement follows the bill. A fixed benefit follows the event.',
    };
  }
  const ownedButNotPaying = claim.outcomes.filter((o) => o.status === 'excluded' || o.status === 'not-covered');
  if (claim.totalExpense > 0 && ownedButNotPaying.length > 0) {
    const excluded = ownedButNotPaying.find((o) => o.status === 'excluded') ?? ownedButNotPaying[0];
    return {
      concept: 'exclusions',
      title: 'Not covered by your policies',
      explanation: 'Insurance does not cover every possible loss. Always understand the exclusions and conditions.',
      example: `${POLICIES[excluded.policyId].name}: ${excluded.reason} You paid the full ${formatRM(claim.totalExpense)}.`,
      takeaway: 'Know what each policy does not cover, and keep savings for the rest.',
    };
  }
  if (claim.totalExpense > 0) {
    return {
      concept: 'emergency-savings',
      title: 'Your own money covered this',
      explanation: 'Emergency savings remain important because some unexpected expenses may not be covered by insurance.',
      example: `This ${formatRM(claim.totalExpense)} cost was paid with ${formatRM(claim.paidFromCash)} of cash and ${formatRM(claim.paidFromSavings)} of savings.`,
      takeaway: event.lesson.text,
    };
  }
  return {
    concept: 'recurring-premium',
    title: 'A month without claims',
    explanation:
      'You paid your premium this month even though no claim occurred. Insurance is a way of managing uncertain financial risks, not a guaranteed return.',
    example:
      monthlyPremiums > 0
        ? `You paid ${formatRM(monthlyPremiums)} in premiums this month and made no claim.`
        : 'You had no premiums to pay this month, and no claim to make.',
    takeaway: 'Calm months are a chance to build your cushion.',
  };
}
