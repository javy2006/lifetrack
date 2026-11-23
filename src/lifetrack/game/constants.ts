/**
 * Central LifeTrack configuration. All financial constants live here (or in
 * policies.ts / events.ts) so UI components never hard-code game values.
 */
export const GAME_CONFIG = {
  totalRounds: 6,
  startingCash: 2000,
  startingSavings: 0,
  monthlyIncome: 3500,
  essentialExpenses: 2500,
  actionPointsPerRound: 2,
  saveAmount: 300,
} as const;

/** Monthly amount left before insurance premiums. */
export const MONTHLY_DISPOSABLE_INCOME = GAME_CONFIG.monthlyIncome - GAME_CONFIG.essentialExpenses;

export const SCORING_CONFIG = {
  /** Cash + savings that earns a full Financial Position score. */
  wealthBenchmark: 8000,
  /** Emergency savings that earns a full Emergency Savings score. */
  savingsTarget: 7500,
  /** Weighted maximum points; they add up to 100. */
  maxPoints: { wealth: 60, savings: 25, learning: 15 },
} as const;

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June'] as const;

/** Constraints for the first six cards of a shuffled deck so every game is varied but fair. */
export const DECK_RULES = {
  drawsPerGame: 6,
  /** Raising this above 0 guarantees a claim every game, but also tilts results toward heavy insurance buyers. */
  minInsurableEvents: 0,
  minUncoveredCostEvents: 2,
  maxCalmMonths: 2,
  maxMajorEvents: 2,
  majorEventThreshold: 1500,
  maxShuffleAttempts: 500,
} as const;

/** Deterministic AI strategy parameters. AI players obey the same rules as the human player. */
export const AI_TUNING = {
  saver: {
    /** The only policy the Saver considers: low premium, low cashflow impact. */
    policy: 'accident',
    earliestPurchaseRound: 3,
    minSavingsBeforePurchase: 1200,
    maxMonthlyPremiums: 100,
  },
  balanced: {
    policy: 'medical',
    followUpPolicy: 'accident',
    followUpFromRound: 3,
    followUpMinSavings: 1200,
    maxMonthlyPremiums: 200,
  },
  protection: {
    priority: ['medical', 'critical', 'accident'],
    maxMonthlyPremiums: 250,
  },
} as const;

export const FEATURE_FLAGS = {
  /**
   * Must remain false. LifeTrack only uses invented educational policies and is
   * never connected to real product data, the Product Master or any real
   * insurance calculation engine.
   */
  PRODUCT_SPECIFIC: false,
} as const;

export const DISCLAIMER =
  'All insurance policies, premiums, benefits, events and financial values in LifeTrack are fictional game examples. They do not represent actual insurance or Takaful products, policy terms, quotations, coverage guarantees or financial advice.';
