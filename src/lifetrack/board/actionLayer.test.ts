import test from 'node:test';
import assert from 'node:assert/strict';
import { getActionLayerMode } from './boardTypes.ts';

test('the pre-roll decisions card never blocks the board Roll Dice control', () => {
  assert.equal(getActionLayerMode('playing', 'decisions', 'human-roll'), 'dock');
  assert.equal(getActionLayerMode('playing', 'decisions', null), 'dock', 'board progress not loaded yet');
});

test('decisions open as a modal once the human pawn has landed', () => {
  assert.equal(getActionLayerMode('playing', 'decisions', 'human-landed'), 'modal');
});

test('other phases keep their existing presentation', () => {
  for (const phase of ['income', 'expenses', 'event-draw'] as const) assert.equal(getActionLayerMode('playing', phase, 'human-roll'), 'dock');
  for (const phase of ['event', 'claims', 'summary'] as const) assert.equal(getActionLayerMode('playing', phase, 'complete'), 'modal');
  assert.equal(getActionLayerMode('review', 'summary', 'complete'), 'modal');
  assert.equal(getActionLayerMode('complete', 'summary', null), 'modal');
});
