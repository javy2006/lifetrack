/**
 * LifeTrack domain types.
 *
 * Money is always an integer number of Malaysian Ringgit (RM). Every value the
 * engine produces is an integer, so no floating-point rounding is ever applied
 * to currency.
 */
export type Money = number;

export type PolicyId = 'medical' | 'accident' | 'critical';
export type CharacterId = 'alex' | 'meiling' | 'daniel' | 'aisyah';
export type StrategyId = 'saver' | 'balanced' | 'protection';
export type Controller = 'human' | StrategyId;

export type ConceptId =
  | 'premium'
  | 'recurring-premium'
  | 'emergency-savings'
  | 'deductible'
  | 'coverage-limit'
  | 'exclusions'
  | 'fixed-benefit'
  | 'lump-sum'
  | 'shortfall';

export type EventCategory =
  | 'medical'
  | 'accident'
  | 'critical-illness'
  | 'family'
  | 'income'
  | 'repair'
  | 'recovery'
  | 'calm';

export type ExpenseKind =
  | 'hospital'
  | 'outpatient'
  | 'dental'
  | 'recovery'
  | 'income-loss'
  | 'family'
  | 'household'
  | 'repair';

export interface EventExpense {
  label: string;
  amount: Money;
  kind: ExpenseKind;
}

/** Conditions a fictional policy can respond to. Each event declares which are met. */
export interface EventTriggers {
  /** Admitted to hospital: Medical Protection may reimburse eligible hospital expenses. */
  hospitalAdmission: boolean;
  /** A specified accidental injury: Personal Accident pays its fixed benefit. */
  specifiedAccidentalInjury: boolean;
  /** The single defined critical illness: Critical Illness pays its lump sum. */
  definedCriticalIllness: boolean;
}

export interface EventCard {
  id: string;
  title: string;
  category: EventCategory;
  riskLabel: string;
  story: string;
  expenses: readonly EventExpense[];
  triggers: EventTriggers;
  /** Plain-language explanation of why each policy does or does not respond. */
  coverageNotes: Record<PolicyId, string>;
  lesson: { concept: ConceptId; title: string; text: string };
}

export type PolicyBenefit =
  | { kind: 'reimbursement'; coverageLimit: Money; deductible: Money }
  | { kind: 'fixed'; amount: Money }
  | { kind: 'lump-sum'; amount: Money };

export interface PolicyDefinition {
  id: PolicyId;
  name: string;
  shortName: string;
  protectionType: string;
  monthlyPremium: Money;
  benefit: PolicyBenefit;
  trigger: keyof EventTriggers;
  /** Expense kinds that are explicitly excluded (reported as "excluded" rather than "not covered"). */
  excludedExpenseKinds: readonly ExpenseKind[];
  coveredEvent: string;
  covers: readonly string[];
  exclusions: readonly string[];
  explanation: string;
  exampleEventId: string;
}

export interface OwnedPolicy {
  policyId: PolicyId;
  purchasedRound: number;
}

export type PlayerAction =
  | { kind: 'save'; amount: Money }
  | { kind: 'buy'; policyId: PolicyId; amount: Money }
  | { kind: 'pass'; amount: 0 };

export interface PremiumCharge {
  policyId: PolicyId;
  amount: Money;
}

export type PolicyOutcomeStatus = 'paid' | 'below-deductible' | 'not-covered' | 'excluded' | 'not-owned';

export interface PolicyOutcome {
  policyId: PolicyId;
  benefitKind: PolicyBenefit['kind'];
  status: PolicyOutcomeStatus;
  payout: Money;
  reason: string;
  /** Reimbursement details (Medical Protection only). */
  eligibleAmount?: Money;
  deductibleApplied?: Money;
  amountAfterDeductible?: Money;
  coverageLimit?: Money;
  limitReached?: boolean;
  amountAboveLimit?: Money;
}

export interface ClaimResult {
  eventId: string;
  totalExpense: Money;
  eligibleMedicalExpense: Money;
  /** Medical reimbursement paid toward the eligible bill. */
  reimbursement: Money;
  /** Fixed and lump-sum benefits paid to the player as cash. */
  fixedBenefits: Money;
  /** Total expense minus reimbursement. */
  outOfPocket: Money;
  /** fixedBenefits - outOfPocket. */
  netCashImpact: Money;
  creditedToCash: Money;
  paidFromCash: Money;
  paidFromSavings: Money;
  /** Amount that could not be paid from cash or savings. Recorded, never turned into debt. */
  shortfall: Money;
  cashBefore: Money;
  savingsBefore: Money;
  cashAfter: Money;
  savingsAfter: Money;
  outcomes: PolicyOutcome[];
}

/** Per-player progress through a round. Each financial step is only applied from the expected stage. */
export type RoundStage = 'income-received' | 'bills-paid' | 'decisions-locked' | 'claim-resolved' | 'closed';

export interface RoundRecord {
  round: number;
  stage: RoundStage;
  cashAtStart: Money;
  savingsAtStart: Money;
  income: Money;
  essentials: Money;
  premiumCharges: PremiumCharge[];
  lapsedPolicies: PolicyId[];
  billsFromSavings: Money;
  billsShortfall: Money;
  actions: PlayerAction[];
  eventId: string | null;
  claim: ClaimResult | null;
  cashAtEnd: Money | null;
  savingsAtEnd: Money | null;
}

export interface PlayerState {
  id: CharacterId;
  controller: Controller;
  cash: Money;
  savings: Money;
  policies: OwnedPolicy[];
  actionPoints: number;
  unpaidShortfall: Money;
  history: RoundRecord[];
}

export type RoundPhase = 'income' | 'expenses' | 'decisions' | 'event-draw' | 'event' | 'claims' | 'summary';
export type GameStatus = 'playing' | 'review' | 'complete';

export interface AiTurn {
  playerId: CharacterId;
  round: number;
  strategy: StrategyId;
  actions: PlayerAction[];
  message: string;
  rationale: string;
}

export interface Insight {
  key: number;
  concept: ConceptId;
  round: number;
  policyId?: PolicyId;
}

export interface GameState {
  schemaVersion: 1;
  seed: number;
  status: GameStatus;
  round: number;
  phase: RoundPhase;
  /** Shuffled event ids; round N draws deck[N - 1] (without replacement). */
  deck: string[];
  currentEventId: string | null;
  humanId: CharacterId;
  players: PlayerState[];
  /** Human player state at the start of the decision phase, used to undo choices before confirming. */
  decisionSnapshot: PlayerState | null;
  aiTurns: AiTurn[];
  quizAnswers: Partial<Record<string, string>>;
  conceptsSeen: ConceptId[];
  insight: Insight | null;
  insightCounter: number;
}
