/**
 * Seeded turn order (presentation layer, like the rest of the board).
 *
 * The order is drawn once per game from the game's own seed, so:
 *  - a new game (new seed) gets a new order; reloading a save re-derives the SAME order (nothing extra to
 *    store, so old saves and the save schemas are unchanged and a reload never "redraws");
 *  - the demo (fixed DEMO_SEED) always shows the same order;
 *  - the engine is untouched: in LifeTrack every player's money moves come from the reducer (decisions are
 *    simultaneous at confirm, and the month's single event applies to all players at once), so the order
 *    only decides who moves their pawn when. It can never change a balance, an event or an AI choice.
 *
 * Fairness: an unbiased Fisher–Yates shuffle of a canonical (character-list) order, driven by a hash of the
 * seed with its own salt, so it is independent of the deck shuffle and of where the human sits in
 * `state.players` (the engine stores the human first; this module never relies on that).
 */
import { CHARACTERS } from '../game/characters.ts';
import type { CharacterId } from '../game/types.ts';

const CANONICAL: readonly CharacterId[] = CHARACTERS.map((c) => c.id);
const SALT = 0x7a3c_91e5;

/** Small seeded PRNG (mulberry32) for the turn-order draw only. */
function rng(seed: number): () => number {
  let a = (seed ^ SALT) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The game's fixed turn order: every player exactly once, first to last. */
export function getTurnOrder(seed: number, playerIds: readonly CharacterId[]): CharacterId[] {
  const present = new Set(playerIds);
  const order = [...CANONICAL.filter((id) => present.has(id)), ...playerIds.filter((id) => !CANONICAL.includes(id))];
  const next = rng(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/** Rivals who move BEFORE the human this month and have not moved yet. */
export function turnsBeforeHuman(order: readonly CharacterId[], humanId: CharacterId, moved: readonly CharacterId[]): CharacterId[] {
  const at = order.indexOf(humanId);
  return order.slice(0, Math.max(0, at)).filter((id) => !moved.includes(id));
}

/** Rivals still to move this month (in order), wherever they sit relative to the human. */
export function remainingRivalTurns(order: readonly CharacterId[], humanId: CharacterId, moved: readonly CharacterId[]): CharacterId[] {
  return order.filter((id) => id !== humanId && !moved.includes(id));
}
