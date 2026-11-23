import type { ConceptId, StrategyId } from './types.ts';
import { POLICIES } from './policies.ts';
import { calculateReimbursement } from './calculations.ts';
import { formatRM } from './format.ts';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  concept: ConceptId;
  prompt: string;
  options: readonly QuizOption[];
  correctOptionId: string;
  explanation: string;
  /**
   * Deterministic answers for AI rivals. Each persona holds one common
   * misconception, so every AI scores 2 of 3 on Learning Mastery.
   */
  aiAnswers: Record<StrategyId, string>;
}

const medical = POLICIES.medical.benefit;
const accident = POLICIES.accident.benefit;
const critical = POLICIES.critical.benefit;
const EXAMPLE_BILL = 800;
const example =
  medical.kind === 'reimbursement' ? calculateReimbursement(EXAMPLE_BILL, medical.deductible, medical.coverageLimit) : null;
const accidentAmount = accident.kind === 'fixed' ? accident.amount : 0;
const criticalAmount = critical.kind === 'lump-sum' ? critical.amount : 0;

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'deductible',
    concept: 'deductible',
    prompt: 'What is a deductible?',
    options: [
      { id: 'a', text: 'The monthly amount you pay to keep a policy active' },
      { id: 'b', text: 'The amount you pay first, before the insurer starts paying eligible expenses' },
      { id: 'c', text: 'The maximum amount a policy pays for one event' },
      { id: 'd', text: 'A refund you receive when you make no claims' },
    ],
    correctOptionId: 'b',
    explanation: example
      ? `In LifeTrack, Medical Protection has a ${formatRM(example.deductibleApplied)} deductible. For a ${formatRM(EXAMPLE_BILL)} hospital bill you pay the first ${formatRM(example.deductibleApplied)} and the policy reimburses ${formatRM(example.payout)}. The monthly amount is the premium; the maximum payout is the coverage limit.`
      : 'A deductible is the part of an eligible bill you pay before reimbursement starts.',
    aiAnswers: { saver: 'b', balanced: 'a', protection: 'b' },
  },
  {
    id: 'coverage-scope',
    concept: 'exclusions',
    prompt: 'Does insurance cover every unexpected expense?',
    options: [
      { id: 'a', text: 'Yes. Once you have a policy, every emergency is covered' },
      { id: 'b', text: 'No. Each policy only pays for defined events and has exclusions and limits' },
      { id: 'c', text: 'Only after you have paid premiums for a full year' },
    ],
    correctOptionId: 'b',
    explanation:
      'Family emergencies, job loss, repairs and dental treatment were not covered by any LifeTrack policy. That is why emergency savings still matter when you have insurance.',
    aiAnswers: { saver: 'b', balanced: 'b', protection: 'a' },
  },
  {
    id: 'benefit-types',
    concept: 'fixed-benefit',
    prompt: 'What is the difference between medical reimbursement and a fixed cash benefit?',
    options: [
      {
        id: 'a',
        text: 'Reimbursement pays toward an eligible bill, after the deductible and up to a limit. A fixed benefit pays a set amount when a defined event happens',
      },
      { id: 'b', text: 'There is no difference. Both always pay the exact amount of your bill' },
      { id: 'c', text: 'A fixed cash benefit can only be spent on hospital bills' },
    ],
    correctOptionId: 'a',
    explanation: `Medical Protection reimbursed part of eligible hospital bills. Personal Accident paid a fixed ${formatRM(accidentAmount)} whatever the bill, and Critical Illness paid a ${formatRM(criticalAmount)} lump sum you could use for anything.`,
    aiAnswers: { saver: 'b', balanced: 'a', protection: 'a' },
  },
];

export function getQuestion(questionId: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((question) => question.id === questionId);
}

export function countCorrectAnswers(answers: Partial<Record<string, string>>): number {
  return QUIZ_QUESTIONS.filter((question) => answers[question.id] === question.correctOptionId).length;
}

export function getAiQuizAnswers(strategy: StrategyId): Record<string, string> {
  return Object.fromEntries(QUIZ_QUESTIONS.map((question) => [question.id, question.aiAnswers[strategy]]));
}

export function getAiQuizCorrect(strategy: StrategyId): number {
  return countCorrectAnswers(getAiQuizAnswers(strategy));
}
