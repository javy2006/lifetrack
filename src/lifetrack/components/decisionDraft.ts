/**
 * Pure decision-draft logic (no React): the player's picks are validated and previewed by running
 * the real reducer on a copy of the state, and only turned into game actions on confirmation.
 */
import type { GameState, PolicyId } from '../game/types.ts';
import { gameReducer, getHumanPlayer, type GameAction } from '../game/gameReducer.ts';

/** A move the player has picked but not yet confirmed. */
export type DraftMove = { kind: 'save' } | { kind: 'pass' } | { kind: 'buy'; policyId: PolicyId };
export const toAction = (m: DraftMove): GameAction => m.kind === 'buy' ? { type: 'decision/buy', policyId: m.policyId } : { type: m.kind === 'save' ? 'decision/save' : 'decision/pass' };
export const sameMove = (a: DraftMove, b: DraftMove) => a.kind === b.kind && (a.kind !== 'buy' || (b.kind === 'buy' && a.policyId === b.policyId));

/** Applies the draft to a copy of the state with the real reducer; returns the result and how many moves the engine accepted. */
export function previewDraft(state: GameState, draft: readonly DraftMove[]): { state: GameState; accepted: number } {
  let s = state, accepted = 0;
  for (const m of draft) {
    const next = gameReducer(s, toAction(m));
    if (!next || getHumanPlayer(next).actionPoints === getHumanPlayer(s).actionPoints) break;
    s = next; accepted++;
  }
  return { state: s, accepted };
}

/** Whether the engine would accept `move` after the current draft. */
export function canAdd(state: GameState, draft: readonly DraftMove[], move: DraftMove): boolean {
  const base = previewDraft(state, draft).state;
  const next = gameReducer(base, toAction(move));
  return Boolean(next) && getHumanPlayer(next!).actionPoints < getHumanPlayer(base).actionPoints;
}


/**
 * The exact actions dispatched on confirmation: the accepted picks, a pass for each unused move,
 * then `decision/confirm`. Built once, so every transaction is applied exactly once.
 */
export function confirmActions(state: GameState, draft: readonly DraftMove[]): GameAction[] {
  const { accepted } = previewDraft(state, draft);
  const moves = draft.slice(0, accepted).map(toAction);
  const passes = Array.from({ length: Math.max(0, getHumanPlayer(state).actionPoints - accepted) }, (): GameAction => ({ type: 'decision/pass' }));
  return [...moves, ...passes, { type: 'decision/confirm' }];
}
