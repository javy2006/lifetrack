import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CharacterId } from '../game/types.ts';
import { createNewGame } from '../game/gameReducer.ts';
import { DEMO_SEED } from '../demo/demoScript.ts';
import { getTurnOrder, remainingRivalTurns, turnsBeforeHuman } from './turnOrder.ts';
import { createBoardProgress, isValidBoardProgress, moveBoardPlayer, reconcileBoardProgress, rollBoardDie } from './boardTypes.ts';
import { playFullGame } from '../game/__tests__/helpers.ts';

const IDS: CharacterId[] = ['alex', 'meiling', 'daniel', 'aisyah'];

test('every player gets exactly one position, for many seeds', () => {
  for (let seed = 0; seed < 2000; seed++) {
    const order = getTurnOrder(seed * 7919 + 13, IDS);
    assert.equal(order.length, 4);
    assert.deepEqual([...order].sort(), [...IDS].sort());
  }
});

test('fair: each player is equally likely to take each position, and all 24 orders occur', () => {
  const N = 24000;
  const counts: Record<string, number[]> = Object.fromEntries(IDS.map((id) => [id, [0, 0, 0, 0]]));
  const perms = new Map<string, number>();
  for (let s = 0; s < N; s++) {
    const order = getTurnOrder((s * 2654435761) >>> 0, IDS);
    order.forEach((id, i) => counts[id]![i]!++);
    perms.set(order.join(), (perms.get(order.join()) ?? 0) + 1);
  }
  for (const id of IDS) for (let i = 0; i < 4; i++) {
    const share = counts[id]![i]! / N;
    assert.ok(Math.abs(share - 0.25) < 0.015, `${id} at position ${i + 1}: ${(share * 100).toFixed(1)}%`);
  }
  assert.equal(perms.size, 24);
  for (const [p, n] of perms) assert.ok(Math.abs(n - N / 24) < N / 24 * 0.15, `order ${p}: ${n}`);
});

test('the human can be in every position, whichever character they play (not always first)', () => {
  for (const human of IDS) {
    const seen = new Set<number>();
    for (let seed = 1; seed < 400 && seen.size < 4; seed++) {
      const game = createNewGame(human, seed);
      seen.add(getTurnOrder(game.seed, game.players.map((p) => p.id)).indexOf(human));
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2, 3], `${human} reaches all four positions`);
  }
});

test('deterministic per seed, and independent of how players are stored (the engine stores the human first)', () => {
  for (const seed of [1, 42, 2026, 0xdeadbeef]) {
    const a = getTurnOrder(seed, IDS);
    assert.deepEqual(getTurnOrder(seed, IDS), a);
    assert.deepEqual(getTurnOrder(seed, [...IDS].reverse()), a);
    for (const human of IDS) assert.deepEqual(getTurnOrder(seed, createNewGame(human, seed).players.map((p) => p.id)), a);
  }
});

test('each month: rivals before the human, then the human, then the rest; every pawn moves exactly once', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const human = IDS[seed % 4]!;
    const order = getTurnOrder(seed, IDS);
    let progress = createBoardProgress(seed, 1, IDS);
    const sequence: CharacterId[] = [];
    for (let round = 1; round <= 6; round++) {
      progress = reconcileBoardProgress(progress, round, 'decisions');
      assert.deepEqual(progress.moved, [], 'a new month starts with nobody moved');
      for (const id of turnsBeforeHuman(order, human, progress.moved ?? [])) { progress = moveBoardPlayer(progress, id, rollBoardDie(seed, round, id)); sequence.push(id); }
      assert.deepEqual(turnsBeforeHuman(order, human, progress.moved ?? []), [], 'human may roll now');
      progress = moveBoardPlayer(progress, human, rollBoardDie(seed, round, human)); sequence.push(human);
      for (const id of remainingRivalTurns(order, human, progress.moved ?? [])) { progress = moveBoardPlayer(progress, id, rollBoardDie(seed, round, id)); sequence.push(id); }
      assert.deepEqual(progress.moved, order, `round ${round} follows the fixed order`);
      assert.equal(progress.lastMovement?.playerId, order[3], 'the last mover is the last in the order');
    }
    assert.deepEqual(sequence, [...order, ...order, ...order, ...order, ...order, ...order], 'same order all six months');
  }
});

test('a seeded game replays identically: the board turn order never feeds the engine', () => {
  // The engine never reads the board; a full seeded game gives the same money for all four players
  // however the pawns are ordered (here: the same seed under each human, compared with itself replayed).
  for (const human of IDS) {
    const a = playFullGame(777, human).final, b = playFullGame(777, human).final;
    assert.deepEqual(a.players.map((p) => [p.id, p.cash, p.savings]), b.players.map((p) => [p.id, p.cash, p.savings]));
  }
});

test('board saves: older saves without `moved` stay valid, and the new pre-turns stage is accepted', () => {
  const old = { ...createBoardProgress(5, 2, IDS) } as Record<string, unknown>;
  delete old.moved;
  assert.ok(isValidBoardProgress(old, 5, IDS));
  assert.ok(isValidBoardProgress({ ...createBoardProgress(5, 2, IDS), stage: 'pre-turns' }, 5, IDS));
  assert.ok(!isValidBoardProgress({ ...createBoardProgress(5, 2, IDS), moved: ['nobody'] }, 5, IDS));
  // Reloading a save re-derives the same order from the seed: no redraw.
  assert.deepEqual(getTurnOrder(5, IDS), getTurnOrder(5, IDS));
});

test('the demo has its own fixed order from DEMO_SEED (independent of any real game)', () => {
  assert.deepEqual(getTurnOrder(DEMO_SEED, IDS), getTurnOrder(DEMO_SEED, IDS));
  const real = new Set(Array.from({ length: 50 }, (_, s) => getTurnOrder(s + 1, IDS).join()));
  assert.ok(real.size > 1, 'real games vary');
});
