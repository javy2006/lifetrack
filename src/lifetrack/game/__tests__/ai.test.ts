import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CharacterId, PlayerState, StrategyId } from '../types.ts';
import { CHARACTERS, assignControllers } from '../characters.ts';
import { AI_TUNING } from '../constants.ts';
import { POLICIES } from '../policies.ts';
import { applyIncome, applyMonthlyBills, createPlayer, getRoundRecord } from '../calculations.ts';
import { playAiTurn } from '../aiStrategies.ts';
import { playFullGame } from './helpers.ts';

function byStrategy(players: PlayerState[], strategy: StrategyId): PlayerState {
  const player = players.find((p) => p.controller === strategy);
  if (!player) throw new Error(`missing ${strategy}`);
  return player;
}

function purchaseRound(player: PlayerState, policyId: string): number | undefined {
  return player.policies.find((p) => p.policyId === policyId)?.purchasedRound;
}

test('every character choice produces exactly one AI of each strategy', () => {
  for (const character of CHARACTERS) {
    const controllers = assignControllers(character.id);
    assert.equal(controllers[character.id], 'human');
    const strategies = Object.values(controllers).filter((c) => c !== 'human').sort();
    assert.deepEqual(strategies, ['balanced', 'protection', 'saver']);
  }
});

test('each AI follows its strategy in full games', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const humanId: CharacterId = CHARACTERS[seed % CHARACTERS.length].id;
    const { final } = playFullGame(seed * 13, humanId);
    const saver = byStrategy(final.players, 'saver');
    assert.ok(!purchaseRound(saver, 'medical') && !purchaseRound(saver, 'critical'), 'Saver avoids larger premiums');
    const saverAccident = purchaseRound(saver, 'accident');
    if (saverAccident) {
      assert.ok(saverAccident >= AI_TUNING.saver.earliestPurchaseRound);
      const record = getRoundRecord(saver, saverAccident)!;
      const savingsBeforeBuy = record.savingsAtStart + record.actions.slice(0, record.actions.findIndex((a) => a.kind === 'buy')).reduce((t, a) => t + (a.kind === 'save' ? a.amount : 0), 0);
      assert.ok(savingsBeforeBuy >= AI_TUNING.saver.minSavingsBeforePurchase);
    }

    const balanced = byStrategy(final.players, 'balanced');
    assert.equal(purchaseRound(balanced, 'medical'), 1, 'Balanced buys Medical Protection in month 1');
    assert.equal(purchaseRound(balanced, 'critical'), undefined);
    const balancedAccident = purchaseRound(balanced, 'accident');
    if (balancedAccident) assert.ok(balancedAccident >= AI_TUNING.balanced.followUpFromRound);

    const protection = byStrategy(final.players, 'protection');
    assert.equal(purchaseRound(protection, 'medical'), 1);
    assert.equal(purchaseRound(protection, 'critical'), 1);
    assert.equal(purchaseRound(protection, 'accident'), 2);

    for (const ai of [saver, balanced, protection]) {
      for (const record of ai.history) {
        assert.equal(record.actions.length, 2, 'AI uses exactly two action points');
        assert.ok(record.cashAtEnd! >= 0 && record.savingsAtEnd! >= 0);
      }
    }
  }
});

test('AI purchases obey the same affordability rule as the player', () => {
  for (const strategy of ['saver', 'balanced', 'protection'] as StrategyId[]) {
    let player = applyMonthlyBills(applyIncome(createPlayer('alex', strategy), 1), 1);
    player = { ...player, cash: 100, savings: 5000 };
    const { player: after, turn } = playAiTurn(player, 1);
    for (const action of turn.actions) {
      if (action.kind === 'buy') assert.ok(POLICIES[action.policyId].monthlyPremium <= 100);
      assert.notEqual(action.kind, 'save', 'cannot save RM300 with RM100 cash');
    }
    assert.ok(after.cash >= 0);
    assert.equal(after.savings, 5000, 'AI cannot spend savings on premiums');
  }
});

test('AI decisions are deterministic for identical inputs', () => {
  const player = applyMonthlyBills(applyIncome(createPlayer('daniel', 'protection'), 1), 1);
  assert.deepEqual(playAiTurn(player, 1), playAiTurn(player, 1));
});
