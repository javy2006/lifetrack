import type { PolicyDefinition, PolicyId } from './types.ts';
import { formatRM } from './format.ts';

const MEDICAL_PREMIUM = 120;
const MEDICAL_LIMIT = 2000;
const MEDICAL_DEDUCTIBLE = 300;
const ACCIDENT_PREMIUM = 40;
const ACCIDENT_BENEFIT = 1000;
const CRITICAL_PREMIUM = 70;
const CRITICAL_BENEFIT = 2500;

/**
 * Three invented educational policies. They are not real insurance or Takaful
 * products and are never linked to real product data.
 */
export const POLICIES: Record<PolicyId, PolicyDefinition> = {
  medical: {
    id: 'medical',
    name: 'Medical Protection',
    shortName: 'Medical',
    protectionType: 'Medical reimbursement',
    monthlyPremium: MEDICAL_PREMIUM,
    benefit: { kind: 'reimbursement', coverageLimit: MEDICAL_LIMIT, deductible: MEDICAL_DEDUCTIBLE },
    trigger: 'hospitalAdmission',
    excludedExpenseKinds: ['dental'],
    coveredEvent: 'Hospital admission for an illness or injury',
    covers: ['Eligible hospitalisation expenses', 'Eligible treatment resulting from a covered hospital stay'],
    exclusions: [
      'Cosmetic procedures',
      'Dental treatment',
      'Outpatient visits without a hospital admission',
      'Non-eligible personal expenses',
    ],
    explanation: `Reimburses part of an eligible hospital bill. You pay the first ${formatRM(MEDICAL_DEDUCTIBLE)} (the deductible); the policy pays the rest, up to ${formatRM(MEDICAL_LIMIT)} per eligible event.`,
    exampleEventId: 'dengue-admission',
  },
  accident: {
    id: 'accident',
    name: 'Personal Accident Protection',
    shortName: 'Accident',
    protectionType: 'Fixed cash benefit',
    monthlyPremium: ACCIDENT_PREMIUM,
    benefit: { kind: 'fixed', amount: ACCIDENT_BENEFIT },
    trigger: 'specifiedAccidentalInjury',
    excludedExpenseKinds: [],
    coveredEvent: 'Specified accidental injuries, such as road accidents and fractures',
    covers: [`A fixed ${formatRM(ACCIDENT_BENEFIT)} cash benefit for a specified accidental injury`],
    exclusions: ['General illness', 'Non-accidental medical events', 'Gradual strains and wear'],
    explanation: `Pays a set ${formatRM(ACCIDENT_BENEFIT)} cash benefit when a specified accident happens, whatever the size of the bill. It is not a medical reimbursement.`,
    exampleEventId: 'road-accident',
  },
  critical: {
    id: 'critical',
    name: 'Critical Illness Protection',
    shortName: 'Critical Illness',
    protectionType: 'Lump-sum benefit',
    monthlyPremium: CRITICAL_PREMIUM,
    benefit: { kind: 'lump-sum', amount: CRITICAL_BENEFIT },
    trigger: 'definedCriticalIllness',
    excludedExpenseKinds: [],
    coveredEvent: 'The one critical illness defined in this game',
    covers: [`A one-off ${formatRM(CRITICAL_BENEFIT)} lump sum on diagnosis of the defined critical illness`],
    exclusions: ['Illnesses not defined as critical in this game', 'Accidents and injuries', 'Reimbursement of hospital bills'],
    explanation: `Pays a one-off ${formatRM(CRITICAL_BENEFIT)} lump sum when the defined critical illness is diagnosed. You choose how to use it, which is different from reimbursing a hospital bill.`,
    exampleEventId: 'critical-illness',
  },
};

export const POLICY_ORDER: readonly PolicyId[] = ['medical', 'accident', 'critical'];

export function getPolicy(policyId: PolicyId): PolicyDefinition {
  return POLICIES[policyId];
}
