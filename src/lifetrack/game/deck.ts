import { DECK_RULES } from './constants.ts';
import { EVENT_CARDS, getEvent } from './events.ts';
import { getEventTotal, isInsurableEvent } from './calculations.ts';
import { createRng, shuffle } from './rng.ts';

/**
 * A draw is balanced when the six months mix insurable and uninsured events
 * without stacking too many calm months or major shocks.
 */
export function isBalancedDraw(eventIds: readonly string[]): boolean {
  const cards = eventIds.map(getEvent);
  let insurable = 0;
  let uncoveredCost = 0;
  let calm = 0;
  let major = 0;
  for (const card of cards) {
    const total = getEventTotal(card);
    if (isInsurableEvent(card)) insurable += 1;
    else if (total > 0) uncoveredCost += 1;
    if (total === 0) calm += 1;
    if (total >= DECK_RULES.majorEventThreshold) major += 1;
  }
  return (
    insurable >= DECK_RULES.minInsurableEvents &&
    uncoveredCost >= DECK_RULES.minUncoveredCostEvents &&
    calm <= DECK_RULES.maxCalmMonths &&
    major <= DECK_RULES.maxMajorEvents
  );
}

/** Deterministically shuffles the full deck for a seed. Cards are drawn in order, without replacement. */
export function createEventDeck(seed: number): string[] {
  const rng = createRng(seed);
  const ids = EVENT_CARDS.map((card) => card.id);
  let deck = shuffle(ids, rng);
  for (let attempt = 1; attempt < DECK_RULES.maxShuffleAttempts; attempt++) {
    if (isBalancedDraw(deck.slice(0, DECK_RULES.drawsPerGame))) break;
    deck = shuffle(ids, rng);
  }
  return deck;
}
