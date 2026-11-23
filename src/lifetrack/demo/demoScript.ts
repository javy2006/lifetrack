/**
 * Presentation demo: a fixed, reproducible scenario played through the real engine. The human
 * seat follows a scripted, sensible plan (validated by the reducer exactly like a real player's
 * picks); AI players use their normal strategies; the seeded deck decides events. Nothing here
 * changes rules or numbers, so every presentation shows the same game at any speed.
 */
import type { CharacterId, GameState } from '../game/types.ts';
import { createNewGame, gameReducer, getHumanPlayer, type GameAction } from '../game/gameReducer.ts';
import { getQuizProgress } from '../hooks/quizProgress.ts';
import { confirmActions, previewDraft, type DraftMove } from '../components/decisionDraft.ts';

/** Chosen so the six months show insurance paying out, an uncovered expense and calm months. */
export const DEMO_SEED = 20261124;
export const DEMO_HUMAN: CharacterId = 'meiling';

/** Scripted human moves per month (1-based). Anything the engine rejects becomes a pass. */
const PLAN: Record<number, DraftMove[]> = {
  1: [{ kind: 'buy', policyId: 'medical' }, { kind: 'save' }],
  2: [{ kind: 'save' }, { kind: 'save' }],
  3: [{ kind: 'buy', policyId: 'accident' }, { kind: 'save' }],
  4: [{ kind: 'save' }, { kind: 'save' }],
  5: [{ kind: 'save' }, { kind: 'pass' }],
  6: [{ kind: 'save' }, { kind: 'save' }],
};

export function createDemoGame(seed = DEMO_SEED): GameState {
  return createNewGame(DEMO_HUMAN, seed);
}

/** The human's confirmed actions for this month (the engine-accepted part of the plan, then passes, then confirm). */
export function demoDecisionActions(state: GameState): GameAction[] {
  const plan = PLAN[state.round] ?? [{ kind: 'save' }, { kind: 'save' }];
  const { accepted } = previewDraft(state, plan);
  return confirmActions(state, plan.slice(0, accepted));
}

export type DemoStep =
  | { kind: 'dispatch'; actions: GameAction[]; delayMs: number }
  | { kind: 'roll'; delayMs: number }
  | { kind: 'wait' }
  | { kind: 'done' };

/**
 * What the autopilot does next. `boardStage` is the board controller's stage (null without a
 * board); the event draw after AI turns is handled by the game screen itself, so it is a wait.
 */
export function nextDemoStep(state: GameState, boardStage: string | null): DemoStep {
  if (state.status === 'complete') return { kind: 'done' };
  if (state.status === 'review') {
    const progress = getQuizProgress(state.quizAnswers);
    if (progress.allAnswered) return { kind: 'dispatch', actions: [{ type: 'quiz/finish' }], delayMs: 1800 };
    const q = progress.currentQuestion!;
    return { kind: 'dispatch', actions: [{ type: 'quiz/answer', questionId: q.id, optionId: q.correctOptionId }], delayMs: 1600 };
  }
  switch (state.phase) {
    case 'income': return { kind: 'dispatch', actions: [{ type: 'round/collect-income' }], delayMs: 1800 };
    case 'expenses': return { kind: 'dispatch', actions: [{ type: 'round/pay-bills' }], delayMs: 1800 };
    case 'decisions':
      if (boardStage === 'human-roll') return { kind: 'roll', delayMs: 1200 };
      if (boardStage === 'human-landed' || boardStage === null) return { kind: 'dispatch', actions: demoDecisionActions(state), delayMs: 2600 };
      return { kind: 'wait' };
    case 'event-draw': return boardStage === null ? { kind: 'dispatch', actions: [{ type: 'event/draw' }], delayMs: 600 } : { kind: 'wait' };
    case 'event': return { kind: 'dispatch', actions: [{ type: 'event/resolve' }], delayMs: 4200 };
    case 'claims': return { kind: 'dispatch', actions: [{ type: 'claims/continue' }], delayMs: 4200 };
    case 'summary': return { kind: 'dispatch', actions: [{ type: 'round/next' }], delayMs: 3200 };
    default: return { kind: 'wait' };
  }
}

/** Plays the whole demo through the reducer without a board (for tests and seed checks). */
export function playDemoToEnd(seed = DEMO_SEED): GameState {
  let s = createDemoGame(seed);
  for (let guard = 0; guard < 500; guard++) {
    const step = nextDemoStep(s, null);
    if (step.kind === 'done') return s;
    if (step.kind !== 'dispatch') throw new Error(`demo stalled in ${s.status}/${s.phase}`);
    for (const a of step.actions) s = gameReducer(s, a)!;
  }
  throw new Error('demo did not finish');
}

/** True when this human state shows a paid claim in some month (used to pick a representative seed). */
export function demoShowsInsurancePaying(final: GameState): boolean {
  return getHumanPlayer(final).history.some((r) => (r.claim?.reimbursement ?? 0) + (r.claim?.fixedBenefits ?? 0) > 0);
}
