import type { CharacterId, GameState, PolicyId } from '../types.ts';
import { createNewGame, gameReducer, getHumanPlayer } from '../gameReducer.ts';
import type { GameAction } from '../gameReducer.ts';
import { QUIZ_QUESTIONS } from '../quiz.ts';
import { createRng } from '../rng.ts';

export type HumanPlan = (state: GameState) => GameAction;

export const savingPlan: HumanPlan = () => ({ type: 'decision/save' });

export function randomPlan(seed: number): HumanPlan {
  const rng = createRng(seed);
  const policies: PolicyId[] = ['medical', 'accident', 'critical'];
  return () => {
    const roll = rng();
    if (roll < 0.25) return { type: 'decision/buy', policyId: policies[Math.floor(rng() * policies.length)] };
    if (roll < 0.85) return { type: 'decision/save' };
    return { type: 'decision/pass' };
  };
}

export function dispatch(state: GameState | null, action: GameAction): GameState {
  const next = gameReducer(state, action);
  if (!next) throw new Error('Reducer returned null');
  return next;
}

/** Plays a whole game through the reducer, the same way the UI does, and returns every intermediate state. */
export function playFullGame(
  seed: number,
  humanId: CharacterId = 'aisyah',
  plan: HumanPlan = savingPlan,
  quizAnswers: 'correct' | 'wrong' = 'correct',
): { final: GameState; states: GameState[] } {
  let state = createNewGame(humanId, seed);
  const states: GameState[] = [state];
  for (let guard = 0; state.status === 'playing' && guard < 400; guard++) {
    let action: GameAction;
    switch (state.phase) {
      case 'income':
        action = { type: 'round/collect-income' };
        break;
      case 'expenses':
        action = { type: 'round/pay-bills' };
        break;
      case 'decisions': {
        if (getHumanPlayer(state).actionPoints === 0) {
          action = { type: 'decision/confirm' };
          break;
        }
        action = plan(state);
        // Invalid choices (e.g. unaffordable) fall back to saving, then passing.
        if (gameReducer(state, action) === state) action = { type: 'decision/save' };
        if (gameReducer(state, action) === state) action = { type: 'decision/pass' };
        break;
      }
      case 'event-draw':
        action = { type: 'event/draw' };
        break;
      case 'event':
        action = { type: 'event/resolve' };
        break;
      case 'claims':
        action = { type: 'claims/continue' };
        break;
      case 'summary':
        action = { type: 'round/next' };
        break;
    }
    state = dispatch(state, action);
    states.push(state);
  }
  for (const question of QUIZ_QUESTIONS) {
    const optionId =
      quizAnswers === 'correct'
        ? question.correctOptionId
        : (question.options.find((option) => option.id !== question.correctOptionId)?.id ?? question.correctOptionId);
    state = dispatch(state, { type: 'quiz/answer', questionId: question.id, optionId });
  }
  state = dispatch(state, { type: 'quiz/finish' });
  states.push(state);
  return { final: state, states };
}
