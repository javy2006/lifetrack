import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, PlayerState, RoundPhase } from '../types.ts';
import { createNewGame, gameReducer, getHumanPlayer, isValidGameState } from '../gameReducer.ts';
import { POLICIES } from '../policies.ts';
import { GAME_CONFIG } from '../constants.ts';
import { sumMoney } from '../calculations.ts';
import { getFinalStandings } from '../scoring.ts';
import { dispatch, playFullGame, randomPlan } from './helpers.ts';

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 37);

function assertRoundInvariants(player: PlayerState, deck: string[]) {
  assert.equal(player.history.length, GAME_CONFIG.totalRounds);
  player.history.forEach((record, index) => {
    const round = index + 1;
    assert.equal(record.round, round);
    assert.equal(record.stage, 'closed');
    assert.equal(record.income, GAME_CONFIG.monthlyIncome, 'salary credited once');
    assert.equal(record.essentials, GAME_CONFIG.essentialExpenses, 'essentials charged once');
    assert.equal(record.actions.length, GAME_CONFIG.actionPointsPerRound, 'exactly two actions');
    assert.equal(record.eventId, deck[round - 1], 'same event card for every player');

    // Premiums: every policy bought in an earlier round is charged exactly once.
    const ownedBefore = player.policies.filter((p) => p.purchasedRound < round).map((p) => p.policyId).sort();
    assert.deepEqual(record.premiumCharges.map((c) => c.policyId).sort(), ownedBefore);
    for (const charge of record.premiumCharges) assert.equal(charge.amount, POLICIES[charge.policyId].monthlyPremium);
    for (const action of record.actions) {
      if (action.kind === 'buy') assert.equal(action.amount, POLICIES[action.policyId].monthlyPremium);
    }

    // Conservation of money for the round.
    const claim = record.claim!;
    const recurring = sumMoney(record.premiumCharges.map((c) => c.amount));
    const purchases = sumMoney(record.actions.map((a) => (a.kind === 'buy' ? a.amount : 0)));
    const expected =
      record.cashAtStart +
      record.savingsAtStart +
      record.income -
      (record.essentials - record.billsShortfall) -
      recurring -
      purchases +
      claim.netCashImpact +
      claim.shortfall;
    assert.equal(record.cashAtEnd! + record.savingsAtEnd!, expected, `money conserved in round ${round}`);
    for (const value of [record.cashAtEnd!, record.savingsAtEnd!, claim.reimbursement, claim.fixedBenefits, claim.shortfall]) {
      assert.ok(Number.isInteger(value) && value >= 0);
    }
    assert.ok(claim.reimbursement <= claim.eligibleMedicalExpense);
  });
  // Each policy bought at most once.
  assert.equal(new Set(player.policies.map((p) => p.policyId)).size, player.policies.length);
}

test('full games keep every financial invariant for all four players', () => {
  for (const seed of SEEDS) {
    const { final } = playFullGame(seed, 'aisyah', randomPlan(seed));
    assert.equal(final.status, 'complete');
    assert.equal(new Set(final.deck.slice(0, 6)).size, 6, 'events drawn without replacement');
    for (const player of final.players) assertRoundInvariants(player, final.deck);
    const standings = getFinalStandings(final);
    assert.deepEqual(standings.map((s) => s.rank), [1, 2, 3, 4]);
  }
});

test('the round follows the six phases in order', () => {
  const { states } = playFullGame(42);
  const phases = states.filter((s) => s.status === 'playing' && s.round === 1).map((s) => s.phase);
  const order: RoundPhase[] = ['income', 'expenses', 'decisions', 'event-draw', 'event', 'claims', 'summary'];
  const unique = phases.filter((phase, i) => phase !== phases[i - 1]);
  assert.deepEqual(unique, order);
});

test('repeated and out-of-phase actions are ignored', () => {
  let state = createNewGame('alex', 7);
  assert.equal(gameReducer(state, { type: 'round/pay-bills' }), state);
  assert.equal(gameReducer(state, { type: 'event/draw' }), state);
  state = dispatch(state, { type: 'round/collect-income' });
  assert.equal(gameReducer(state, { type: 'round/collect-income' }), state, 'salary cannot be collected twice');
  state = dispatch(state, { type: 'round/pay-bills' });
  assert.equal(gameReducer(state, { type: 'round/pay-bills' }), state, 'bills cannot be paid twice');
  assert.equal(gameReducer(state, { type: 'decision/confirm' }), state, 'cannot confirm with action points left');
  state = dispatch(state, { type: 'decision/save' });
  state = dispatch(state, { type: 'decision/save' });
  assert.equal(gameReducer(state, { type: 'decision/save' }), state, 'only two action points');
  state = dispatch(state, { type: 'decision/confirm' });
  assert.equal(gameReducer(state, { type: 'decision/buy', policyId: 'medical' }), state, 'no purchases after confirming');
  state = dispatch(state, { type: 'event/draw' });
  assert.equal(gameReducer(state, { type: 'decision/buy', policyId: 'medical' }), state, 'no retroactive purchases');
  state = dispatch(state, { type: 'event/resolve' });
  assert.equal(gameReducer(state, { type: 'event/resolve' }), state, 'claims resolve once');
});

test('decisions can be undone before confirming', () => {
  let state = createNewGame('meiling', 99);
  state = dispatch(dispatch(state, { type: 'round/collect-income' }), { type: 'round/pay-bills' });
  const before = getHumanPlayer(state);
  state = dispatch(state, { type: 'decision/buy', policyId: 'medical' });
  state = dispatch(state, { type: 'decision/save' });
  assert.equal(getHumanPlayer(state).actionPoints, 0);
  state = dispatch(state, { type: 'decision/reset' });
  assert.deepEqual(getHumanPlayer(state), before);
});

test('quiz answers are locked once given and required before results', () => {
  const { final } = playFullGame(5);
  assert.equal(final.status, 'complete');
  let state: GameState = { ...final, status: 'review', quizAnswers: {} };
  assert.equal(gameReducer(state, { type: 'quiz/finish' }), state);
  state = dispatch(state, { type: 'quiz/answer', questionId: 'deductible', optionId: 'a' });
  assert.equal(gameReducer(state, { type: 'quiz/answer', questionId: 'deductible', optionId: 'b' }), state);
  assert.equal(gameReducer(state, { type: 'quiz/answer', questionId: 'unknown', optionId: 'a' }), state);
});

test('saved games are validated before loading', () => {
  const state = createNewGame('daniel', 3);
  assert.equal(isValidGameState(state), true);
  assert.equal(isValidGameState(JSON.parse(JSON.stringify(state))), true);
  assert.equal(isValidGameState({ ...state, schemaVersion: 2 }), false);
  assert.equal(isValidGameState({ ...state, deck: ['nope'] }), false);
  assert.equal(isValidGameState(null), false);
  assert.equal(gameReducer(state, { type: 'game/load', state: { ...state, round: 9 } }), state);
});
