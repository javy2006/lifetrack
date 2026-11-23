import test from 'node:test';
import assert from 'node:assert/strict';
import type { RoundPhase } from '../game/types.ts';
import { createBoardProgress, moveBoardPlayer, reconcileBoardProgress, type BoardProgress, type BoardTurnStage } from './boardTypes.ts';

const ids = ['alex', 'meiling', 'daniel', 'aisyah'] as const;
const at = (stage: BoardTurnStage, round = 2): BoardProgress => ({ ...moveBoardPlayer(createBoardProgress(9, round, ids), 'alex', 4), stage });
/** GameScreen only offers a way forward in decisions when the human can roll (human-roll) or decide (human-landed). */
const humanCanAct = (stage: BoardTurnStage) => stage === 'human-roll' || stage === 'human-landed';

test('a board ahead of a decisions-phase game save is pulled back so the human can act', () => {
  for (const stage of ['ai-turns', 'complete'] as const) {
    for (const phase of ['income', 'expenses', 'decisions'] as const) {
      const fixed = reconcileBoardProgress({ ...at(stage), aiQueue: ['meiling'], activePlayer: 'meiling' }, 2, phase);
      assert.ok(humanCanAct(fixed.stage), `${stage} during ${phase} must not hide every control`);
      assert.equal(fixed.stage, 'human-landed', 'the human already moved this month, so no second roll');
      assert.equal(fixed.positions.alex, 4, 'positions are kept');
      assert.deepEqual(fixed.aiQueue, []);
      assert.equal(fixed.activePlayer, null);
    }
  }
});

test('consistent progress is returned unchanged (same object, no re-render loop)', () => {
  const cases: [BoardTurnStage, RoundPhase][] = [['human-roll', 'income'], ['human-roll', 'decisions'], ['human-landed', 'decisions'], ['ai-turns', 'event-draw'], ['human-landed', 'event-draw'], ['complete', 'event-draw'], ['complete', 'event'], ['complete', 'claims'], ['complete', 'summary']];
  for (const [stage, phase] of cases) {
    const progress = at(stage);
    assert.equal(reconcileBoardProgress(progress, 2, phase), progress, `${stage} during ${phase}`);
  }
});

test('a new round still resets the turn to the human roll and keeps positions', () => {
  const next = reconcileBoardProgress(at('complete', 2), 3, 'income');
  assert.equal(next.round, 3);
  assert.equal(next.stage, 'human-roll');
  assert.equal(next.positions.alex, 4);
  assert.equal(next.lastMovement, null);
});
