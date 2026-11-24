import test from 'node:test';
import assert from 'node:assert/strict';
import { eventKind } from './cardKinds.ts';
import { EVENT_CARDS } from '../game/events.ts';

test('every event card maps to a card kind from its own expenses', () => {
  for (const e of EVENT_CARDS) {
    const total = e.expenses.reduce((n, x) => n + x.amount, 0);
    assert.equal(eventKind(e), total > 0 ? 'emergency' : 'event', e.id);
  }
});

test('quiet and costly months both occur in the deck', () => {
  const kinds = new Set(EVENT_CARDS.map(eventKind));
  assert.ok(kinds.has('event') && kinds.has('emergency'));
});
