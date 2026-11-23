import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEventDeck, isBalancedDraw } from '../deck.ts';
import { EVENT_CARDS } from '../events.ts';
import { DECK_RULES } from '../constants.ts';

test('the deck is a deterministic permutation of every event card', () => {
  const deck = createEventDeck(12345);
  assert.deepEqual(createEventDeck(12345), deck);
  assert.deepEqual([...deck].sort(), EVENT_CARDS.map((e) => e.id).sort());
  assert.notDeepEqual(createEventDeck(54321), deck);
});

test('the six drawn months follow the balance rules', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    assert.ok(isBalancedDraw(createEventDeck(seed).slice(0, DECK_RULES.drawsPerGame)), `seed ${seed}`);
  }
});
