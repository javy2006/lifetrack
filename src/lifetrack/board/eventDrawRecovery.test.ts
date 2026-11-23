import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameState } from '../game/types.ts';
import { createNewGame, gameReducer, getHumanPlayer } from '../game/gameReducer.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { POLICIES } from '../game/policies.ts';
import { dispatch, playFullGame, randomPlan, type HumanPlan } from '../game/__tests__/helpers.ts';
import { readBoardSave } from './useBoardController.ts';
import { createBoardProgress, getAiTurnOrder, getEventDrawBoardStep, moveBoardPlayer, rollBoardDie, type BoardProgress } from './boardTypes.ts';

/** Pure mirror of useBoardController.runAiTurns (without animation waits). */
function completeAiTurns(state: GameState, progress: BoardProgress): BoardProgress {
  const queue = progress.stage === 'ai-turns' ? progress.aiQueue : getAiTurnOrder(state.players.map((p) => p.id), state.humanId);
  let next: BoardProgress = { ...progress, stage: 'ai-turns', aiQueue: queue };
  for (const id of queue) next = { ...moveBoardPlayer(next, id, rollBoardDie(state.seed, state.round, id)), stage: 'ai-turns', aiQueue: next.aiQueue.slice(1), activePlayer: null };
  return { ...next, stage: 'complete', aiQueue: [], activePlayer: null };
}

/** Pure mirror of the GameScreen event-draw effect. Returns how many times it dispatched event/draw. */
function driveEventDraw(state: GameState, progress: BoardProgress) {
  let draws = 0;
  for (let tick = 0; tick < 10 && state.status === 'playing' && state.phase === 'event-draw'; tick++) {
    const step = getEventDrawBoardStep(progress.stage);
    if (step === 'run-ai-turns') progress = completeAiTurns(state, progress);
    else if (step === 'draw-event') { state = dispatch(state, { type: 'event/draw' }); draws++; }
    else break; // The effect would wait forever: soft-lock.
  }
  return { state, progress, draws };
}

/** A game state paused in event-draw for round 1, as a resumed save would be. */
function eventDrawState(seed: number): GameState {
  let state = createNewGame('alex', seed);
  for (const type of ['round/collect-income', 'round/pay-bills', 'decision/save', 'decision/save', 'decision/confirm'] as const) state = dispatch(state, { type });
  assert.equal(state.phase, 'event-draw');
  return state;
}

const ids = (s: GameState) => s.players.map((p) => p.id);
const recoveryCases: Record<string, (s: GameState) => BoardProgress> = {
  'missing board save': (s) => readBoardSave(null, s.seed, s.round, ids(s)),
  'malformed board save': (s) => readBoardSave('{oops', s.seed, s.round, ids(s)),
  'board save from another game seed': (s) => readBoardSave(JSON.stringify(createBoardProgress(s.seed + 1, s.round, ids(s))), s.seed, s.round, ids(s)),
  // useBoardController resets a previous round's progress to human-roll when the round changes.
  'stale board save from an earlier round': (s) => {
    const old = readBoardSave(JSON.stringify({ ...createBoardProgress(s.seed, s.round - 1, ids(s)), stage: 'complete' }), s.seed, s.round, ids(s));
    assert.equal(old.stage, 'complete');
    return old.round !== s.round ? { ...old, round: s.round, stage: 'human-roll', aiQueue: [], activePlayer: null, lastMovement: null } : old;
  },
};

for (const [label, recover] of Object.entries(recoveryCases)) {
  test(`event-draw resumes after ${label} and draws the shared event exactly once`, () => {
    const state = eventDrawState(4242);
    const progress = recover(state);
    assert.equal(progress.stage, 'human-roll', 'recovered board starts before the human roll');
    const result = driveEventDraw(state, progress);
    assert.equal(result.state.phase, 'event', 'game must not stall in event-draw');
    assert.equal(result.draws, 1);
    assert.equal(result.state.currentEventId, state.deck[0], 'event identity comes from the seeded deck');
    assert.deepEqual(result.state.players, state.players, 'board recovery never changes money');
    assert.equal(gameReducer(result.state, { type: 'event/draw' }), result.state, 'a second draw is ignored');
  });
}

test('normal and mid-AI-turn resumes still draw exactly once', () => {
  const state = eventDrawState(77);
  const landed = { ...moveBoardPlayer(createBoardProgress(state.seed, 1, ids(state)), 'alex', 3), stage: 'human-landed' as const };
  const midAi: BoardProgress = { ...landed, stage: 'ai-turns', aiQueue: getAiTurnOrder(ids(state), 'alex').slice(1) };
  for (const progress of [landed, midAi, { ...landed, stage: 'complete' as const }]) {
    const result = driveEventDraw(state, progress);
    assert.equal(result.state.phase, 'event');
    assert.equal(result.draws, 1);
  }
  assert.equal(getEventDrawBoardStep('human-roll'), 'run-ai-turns');
});

/** Plays a whole game, losing the board save at every event-draw, and checks finances match an undisturbed game. */
function playWithBoardLoss(seed: number, plan: HumanPlan): GameState {
  let state = createNewGame('aisyah', seed);
  for (let guard = 0; state.status === 'playing' && guard < 400; guard++) {
    if (state.phase === 'event-draw') {
      const result = driveEventDraw(state, readBoardSave(null, state.seed, state.round, ids(state)));
      assert.equal(result.draws, 1, `round ${state.round} drew once`);
      state = result.state;
      continue;
    }
    if (state.phase === 'decisions') {
      let action = getHumanPlayer(state).actionPoints === 0 ? { type: 'decision/confirm' as const } : plan(state);
      if (gameReducer(state, action) === state) action = { type: 'decision/save' };
      if (gameReducer(state, action) === state) action = { type: 'decision/pass' };
      state = dispatch(state, action);
      continue;
    }
    const next = { income: 'round/collect-income', expenses: 'round/pay-bills', event: 'event/resolve', claims: 'claims/continue', summary: 'round/next' } as const;
    state = dispatch(state, { type: next[state.phase as keyof typeof next] });
  }
  return state;
}

test('board-save loss every month leaves salary, premiums, claims and events identical to a normal game', () => {
  for (const seed of [1, 2026, 31337, 900001]) {
    const recovered = playWithBoardLoss(seed, randomPlan(seed));
    const reference = playFullGame(seed, 'aisyah', randomPlan(seed)).states.find((s) => s.status === 'review')!;
    assert.equal(recovered.status, 'review');
    assert.deepEqual(recovered.players, reference.players, 'identical financial outcome');
    for (const player of recovered.players) {
      assert.equal(player.history.length, GAME_CONFIG.totalRounds);
      player.history.forEach((record, i) => {
        assert.equal(record.income, GAME_CONFIG.monthlyIncome, 'salary once per month');
        assert.equal(record.eventId, recovered.deck[i], 'one shared event per month');
        assert.equal(record.stage, 'closed');
        assert.ok(record.claim, 'claim resolved once');
        const dueBefore = player.policies.filter((p) => p.purchasedRound < i + 1).map((p) => p.policyId).sort();
        assert.deepEqual(record.premiumCharges.map((c) => c.policyId).sort(), dueBefore, 'premiums charged once');
        for (const c of record.premiumCharges) assert.equal(c.amount, POLICIES[c.policyId].monthlyPremium);
      });
    }
  }
});
