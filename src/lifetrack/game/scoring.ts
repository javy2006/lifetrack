import type { CharacterId, Controller, GameState, Money, PlayerState } from './types.ts';
import { SCORING_CONFIG } from './constants.ts';
import { QUIZ_QUESTIONS, countCorrectAnswers, getAiQuizCorrect } from './quiz.ts';

export interface ScoreBreakdown {
  playerId: CharacterId;
  controller: Controller;
  financialPosition: Money;
  emergencySavings: Money;
  /** Normalised component scores, each 0-100. */
  wealthScore: number;
  savingsScore: number;
  learningScore: number;
  /** Weighted points: wealth x 0.60, savings x 0.25, learning x 0.15. */
  wealthPoints: number;
  savingsPoints: number;
  learningPoints: number;
  total: number;
  learningCorrect: number;
  learningTotal: number;
}

export interface Standing extends ScoreBreakdown {
  rank: number;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Financial Resilience Score = Wealth x 0.60 + Savings x 0.25 + Learning x 0.15.
 * There is no bonus for owning insurance: two players with the same balances
 * and quiz result always receive the same score.
 */
export function calculateResilienceScore(
  player: Pick<PlayerState, 'id' | 'controller' | 'cash' | 'savings'>,
  learningCorrect: number,
  learningTotal: number = QUIZ_QUESTIONS.length,
): ScoreBreakdown {
  const financialPosition = player.cash + player.savings;
  const wealthScore = clampPercent((financialPosition / SCORING_CONFIG.wealthBenchmark) * 100);
  const savingsScore = clampPercent((player.savings / SCORING_CONFIG.savingsTarget) * 100);
  const learningScore = learningTotal > 0 ? clampPercent((learningCorrect / learningTotal) * 100) : 0;
  const wealthPoints = roundToTenth((wealthScore * SCORING_CONFIG.maxPoints.wealth) / 100);
  const savingsPoints = roundToTenth((savingsScore * SCORING_CONFIG.maxPoints.savings) / 100);
  const learningPoints = roundToTenth((learningScore * SCORING_CONFIG.maxPoints.learning) / 100);
  return {
    playerId: player.id,
    controller: player.controller,
    financialPosition,
    emergencySavings: player.savings,
    wealthScore,
    savingsScore,
    learningScore,
    wealthPoints,
    savingsPoints,
    learningPoints,
    total: roundToTenth(wealthPoints + savingsPoints + learningPoints),
    learningCorrect,
    learningTotal,
  };
}

/** Highest total first; ties broken by financial position, then savings, then seat order. */
export function rankScores(scores: readonly ScoreBreakdown[]): Standing[] {
  return scores
    .map((score, seat) => ({ score, seat }))
    .sort(
      (a, b) =>
        b.score.total - a.score.total ||
        b.score.financialPosition - a.score.financialPosition ||
        b.score.emergencySavings - a.score.emergencySavings ||
        a.seat - b.seat,
    )
    .map(({ score }, index) => ({ ...score, rank: index + 1 }));
}

export function getLearningCorrect(state: GameState, player: PlayerState): number {
  if (player.controller === 'human') return countCorrectAnswers(state.quizAnswers);
  return getAiQuizCorrect(player.controller);
}

export function getFinalStandings(state: GameState): Standing[] {
  return rankScores(state.players.map((player) => calculateResilienceScore(player, getLearningCorrect(state, player))));
}

export interface ResilienceStatus {
  level: 0 | 1 | 2 | 3;
  label: string;
}

const STATUS_LEVELS: readonly { min: number; label: string }[] = [
  { min: 44, label: 'Strong' },
  { min: 32, label: 'Steady' },
  { min: 20, label: 'Building' },
  { min: 0, label: 'Getting started' },
];

/** In-game status based on the financial parts of the score (learning is only known at the end). */
export function getResilienceStatus(player: Pick<PlayerState, 'id' | 'controller' | 'cash' | 'savings'>): ResilienceStatus {
  const score = calculateResilienceScore(player, 0);
  const points = score.wealthPoints + score.savingsPoints;
  const index = STATUS_LEVELS.findIndex((level) => points >= level.min);
  return { level: (3 - index) as ResilienceStatus['level'], label: STATUS_LEVELS[index].label };
}
