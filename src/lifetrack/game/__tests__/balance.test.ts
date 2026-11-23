import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StrategyId } from '../types.ts';
import { getFinalStandings } from '../scoring.ts';
import { playFullGame } from './helpers.ts';

/**
 * Balance guard: across many seeded games no AI strategy should dominate or
 * never win. This protects the lesson that buying more insurance is not
 * automatically better, and neither is buying none.
 */
test('no AI strategy dominates across 1,500 seeded games', () => {
  const wins: Record<StrategyId, number> = { saver: 0, balanced: 0, protection: 0 };
  const games = 1500;
  for (let seed = 1; seed <= games; seed++) {
    const standings = getFinalStandings(playFullGame(seed * 7919).final).filter((s) => s.controller !== 'human');
    wins[standings[0].controller as StrategyId] += 1;
  }
  for (const [strategy, count] of Object.entries(wins)) {
    const share = count / games;
    assert.ok(share > 0.15 && share < 0.6, `${strategy} won ${(share * 100).toFixed(1)}% of games`);
  }
});
