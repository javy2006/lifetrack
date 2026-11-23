import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP_HOP_SHARE, getBoardTiming, turnDurationMs } from './boardTiming.ts';

test('steps are slow enough to follow and each step has a visible rest', () => {
  const { human, ai } = getBoardTiming(false);
  for (const t of [human, ai]) assert.ok(t.stepMs >= 300 && t.stepMs <= 400, `step ${t.stepMs}ms within 300-400`);
  assert.equal(ai.stepMs, human.stepMs, 'human and rival pawns move at the same pace');
  assert.ok(STEP_HOP_SHARE > 0.5 && STEP_HOP_SHARE < 0.9);
  assert.ok(human.tumbleMs >= 800 && human.tumbleMs <= 1000, 'die roll 800-1000 ms');
  for (const t of [human, ai]) assert.ok(t.landMs >= 500 && t.landMs <= 700, `landing pause ${t.landMs}ms within 500-700`);
  assert.ok(human.revealMs >= 400, 'rolled value is readable before moving');
});

test('a full human turn stays under five seconds even for a six', () => {
  const t = turnDurationMs(getBoardTiming(false).human, 6);
  assert.ok(t <= 5000, `${t}ms`);
  assert.ok(turnDurationMs(getBoardTiming(false).ai, 6) <= t, 'rival turns are never slower');
});

test('reduced motion drops the tumble but keeps the result and landing visible, and is never slower', () => {
  const full = getBoardTiming(false), reduced = getBoardTiming(true);
  for (const k of ['human', 'ai'] as const) {
    assert.equal(reduced[k].tumbleMs, 0);
    assert.ok(reduced[k].revealMs > 0 && reduced[k].landMs > 0 && reduced[k].stepMs > 0);
    for (let roll = 1; roll <= 6; roll++) assert.ok(turnDurationMs(reduced[k], roll) <= turnDurationMs(full[k], roll));
  }
});

test('turn duration handles invalid rolls without going negative', () => {
  const h = getBoardTiming(false).human;
  assert.equal(turnDurationMs(h, -3), h.tumbleMs + h.revealMs + h.landMs);
});
