/**
 * Card kinds for the printed tabletop cards (presentation only). The kind decides a card's ink
 * colour, seal icon and printed label; it is derived from engine data, never the other way round.
 */
import type { EventCard } from '../game/types.ts';

export type CardKind = 'event' | 'opportunity' | 'investment' | 'protection' | 'expense' | 'emergency' | 'income' | 'special';

/** Life events with costs are emergencies; quiet months are plain life events (from the engine's own expense list). */
export function eventKind(event: Pick<EventCard, 'expenses'>): CardKind {
  return event.expenses.some((e) => e.amount > 0) ? 'emergency' : 'event';
}
