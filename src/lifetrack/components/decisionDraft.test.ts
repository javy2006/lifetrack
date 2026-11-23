import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, gameReducer, getHumanPlayer, type GameAction } from '../game/gameReducer.ts';
import type { GameState } from '../game/types.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { POLICIES } from '../game/policies.ts';
import { canAdd, confirmActions, previewDraft, type DraftMove } from './decisionDraft.ts';

function decisionsState(): GameState {
  let s: GameState | null = createNewGame('alex', 424242);
  for (const a of [{ type: 'round/collect-income' }, { type: 'round/pay-bills' }] as GameAction[]) s = gameReducer(s, a);
  assert.equal(s!.phase, 'decisions');
  return s!;
}
const run = (s: GameState, actions: GameAction[]) => actions.reduce<GameState>((acc, a) => gameReducer(acc, a)!, s);

test('drafting never changes the real state, and a selection can be changed freely before confirming', () => {
  const s = decisionsState();
  const before = JSON.stringify(s);
  let draft: DraftMove[] = [{ kind: 'save' }];
  assert.ok(canAdd(s, draft, { kind: 'buy', policyId: 'medical' }));
  draft = [...draft, { kind: 'buy', policyId: 'medical' }];
  assert.equal(previewDraft(s, draft).accepted, 2);
  draft = [{ kind: 'save' }, { kind: 'pass' }]; // change of mind
  assert.equal(previewDraft(s, draft).accepted, 2);
  assert.equal(JSON.stringify(s), before, 'the game state is untouched by drafting');
});

test('the engine decides availability: a policy cannot be picked twice, and moves cannot exceed action points', () => {
  const s = decisionsState();
  assert.equal(canAdd(s, [{ kind: 'buy', policyId: 'accident' }], { kind: 'buy', policyId: 'accident' }), false);
  assert.equal(canAdd(s, [{ kind: 'save' }, { kind: 'save' }], { kind: 'pass' }), false);
});

test('confirming applies each transaction exactly once, pads unused moves with passes, then confirms', () => {
  const s = decisionsState();
  const human = getHumanPlayer(s);
  const actions = confirmActions(s, [{ kind: 'save' }]);
  assert.deepEqual(actions.map((a) => a.type), ['decision/save', 'decision/pass', 'decision/confirm']);
  const after = getHumanPlayer(run(s, actions));
  assert.equal(after.savings, human.savings + GAME_CONFIG.saveAmount);
  assert.equal(after.cash, human.cash - GAME_CONFIG.saveAmount);
  const record = after.history[s.round - 1]!;
  assert.equal(record.actions.length, GAME_CONFIG.actionPointsPerRound);
  assert.equal(record.actions.filter((a) => a.kind === 'save').length, 1, 'saved once, not twice');
  const final = run(s, actions);
  assert.notEqual(final.phase, 'decisions', 'month moved on');
  // Replaying the confirm on the moved-on state changes nothing (no duplicate transaction).
  assert.equal(JSON.stringify(gameReducer(final, { type: 'decision/save' })), JSON.stringify(final));
});

test('a purchase in the draft is charged once on confirmation', () => {
  const s = decisionsState();
  const human = getHumanPlayer(s);
  const after = getHumanPlayer(run(s, confirmActions(s, [{ kind: 'buy', policyId: 'critical' }, { kind: 'save' }])));
  assert.equal(after.policies.filter((p) => p.policyId === 'critical').length, 1);
  assert.equal(after.cash, human.cash - POLICIES.critical.monthlyPremium - GAME_CONFIG.saveAmount);
});
