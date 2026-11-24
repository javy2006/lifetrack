/**
 * Event ownership regression tests (2026-11-24 report: "the last AI's accident was charged to me").
 *
 * Finding: the engine never charges a player for another player's event. Board landings are presentation
 * only (no money moves on any space). Once per month the seeded deck draws ONE shared life event, right
 * after the last pawn lands, and `event/resolve` applies it to every player against that player's own
 * cash, savings and policies. These tests pin that behaviour so any future change that leaks one
 * player's consequences into another's balance fails loudly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CharacterId, GameState, PlayerState, PolicyId } from '../types.ts';
import { createNewGame, gameReducer } from '../gameReducer.ts';
import { calculateClaim, getRoundRecord } from '../calculations.ts';
import { EVENT_CARDS as EVENTS } from '../events.ts';
import { CHARACTERS } from '../characters.ts';

const ids = CHARACTERS.map((c) => c.id);

function step(state: GameState, action: Parameters<typeof gameReducer>[1]): GameState {
  const next = gameReducer(state, action);
  assert.ok(next, 'reducer returned null');
  return next;
}

/** Plays month one up to the event phase with a chosen human plan, then forces a specific event card. */
function toEvent(humanId: CharacterId, seed: number, eventId: string, humanBuys: PolicyId[] = []): GameState {
  let s = createNewGame(humanId, seed);
  s = step(s, { type: 'round/collect-income' });
  s = step(s, { type: 'round/pay-bills' });
  for (const policyId of humanBuys) s = step(s, { type: 'decision/buy', policyId });
  // Unused moves become passes, as the UI does on confirm.
  while (s.players.find((p) => p.id === humanId)!.actionPoints > 0) s = step(s, { type: 'decision/pass' });
  s = step(s, { type: 'decision/confirm' });
  s = step(s, { type: 'event/draw' });
  assert.equal(s.phase, 'event');
  return { ...s, currentEventId: eventId };
}

const byId = (s: GameState) => Object.fromEntries(s.players.map((p) => [p.id, p])) as Record<CharacterId, PlayerState>;
const money = (p: PlayerState) => ({ cash: p.cash, savings: p.savings, shortfall: p.unpaidShortfall });

test('every player is charged only from their own claim, for every event in the deck', () => {
  for (const event of EVENTS) {
    for (const humanId of ids) {
      const before = toEvent(humanId, 4242, event.id, ['accident']);
      const after = step(before, { type: 'event/resolve' });
      const b = byId(before), a = byId(after);
      for (const id of ids) {
        const expected = calculateClaim(b[id], event);
        const claim = getRoundRecord(a[id], 1)?.claim;
        assert.deepEqual(claim, expected, `${event.id}: ${id}'s claim uses ${id}'s own state`);
        assert.equal(a[id].cash, expected.cashAfter, `${event.id}: ${id}'s cash`);
        assert.equal(a[id].savings, expected.savingsAfter, `${event.id}: ${id}'s savings`);
      }
    }
  }
});

test("an AI player's cover and balances never change the human's outcome (and vice versa)", () => {
  for (const humanId of ids) {
    const base = toEvent(humanId, 99, 'road-accident');
    // Give the LAST player in the array (the last AI to act) a different position: rich, fully covered.
    const last = base.players[base.players.length - 1]!;
    assert.notEqual(last.id, humanId);
    const altered: GameState = { ...base, players: base.players.map((p) => p.id === last.id ? { ...p, cash: p.cash + 5000, policies: [] } : p) };
    const human1 = byId(step(base, { type: 'event/resolve' }))[humanId];
    const human2 = byId(step(altered, { type: 'event/resolve' }))[humanId];
    assert.deepEqual(money(human2), money(human1), 'human result is independent of the last AI');
    assert.deepEqual(getRoundRecord(human2, 1)?.claim, getRoundRecord(human1, 1)?.claim);
  }
});

test('insurance is calculated for the player who owns it', () => {
  const s = toEvent('alex', 7, 'road-accident', ['accident']);
  const a = byId(step(s, { type: 'event/resolve' }));
  const human = getRoundRecord(a.alex, 1)!.claim!;
  assert.ok(human.outcomes.some((o) => o.policyId === 'accident' && o.status !== 'not-owned' && o.payout > 0), 'Alex is paid by his own accident cover');
  for (const id of ids.filter((x) => x !== 'alex')) {
    const owns = s.players.find((p) => p.id === id)!.policies.some((p) => p.policyId === 'accident');
    const outcome = getRoundRecord(a[id], 1)!.claim!.outcomes.find((o) => o.policyId === 'accident')!;
    assert.equal(outcome.status === 'not-owned', !owns, `${id}: accident outcome follows ${id}'s own policies`);
  }
});

test('results do not depend on the order players are stored or acted in', () => {
  const base = toEvent('meiling', 31337, 'dengue-admission', ['medical']);
  const reference = byId(step(base, { type: 'event/resolve' }));
  const orders = [[...base.players].reverse(), [base.players[2]!, base.players[0]!, base.players[3]!, base.players[1]!]];
  for (const players of orders) {
    const result = byId(step({ ...base, players }, { type: 'event/resolve' }));
    for (const id of ids) assert.deepEqual(money(result[id]), money(reference[id]), `${id} unchanged under reordering`);
  }
});

test('each event is applied exactly once per player (resolving twice is a no-op)', () => {
  const s = toEvent('aisyah', 5, 'motorcycle-repair');
  const once = step(s, { type: 'event/resolve' });
  const twice = step(once, { type: 'event/resolve' });
  assert.equal(twice, once, 'second resolve ignored');
  for (const p of once.players) assert.equal(p.history.filter((r) => r.round === 1).length, 1);
});

test('only the event changes balances in the event step: no other player state leaks', () => {
  const s = toEvent('daniel', 2026, 'job-loss');
  const after = byId(step(s, { type: 'event/resolve' }));
  for (const p of s.players) {
    const q = after[p.id];
    assert.deepEqual(q.policies, p.policies, `${p.id}: policies unchanged by the event`);
    assert.equal(q.controller, p.controller);
  }
});
