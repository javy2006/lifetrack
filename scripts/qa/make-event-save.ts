// Writes a saved game paused on month 2's 'Temporary Job Loss' event (seed found from the engine's own deck), for event-mobile.mjs.
//   node --experimental-strip-types scripts/qa/make-event-save.ts <out.json>   (run from the repo; imports the real engine)
import { writeFileSync } from 'node:fs';
const base = new URL('../../src/lifetrack/game/', import.meta.url).href;
const { createNewGame, gameReducer } = await import(base + 'gameReducer.ts');
// Find a seed whose month-2 card is the job-loss event, then play to month 2's event phase exactly as the UI does.
let seed = 1; for (; seed < 100000; seed++) if (createNewGame('alex', seed).deck[1] === 'job-loss') break;
let s = createNewGame('alex', seed);
const go = (a: unknown) => { s = gameReducer(s, a); };
for (let round = 1; round <= 2; round++) {
  go({ type: 'round/collect-income' }); go({ type: 'round/pay-bills' });
  while (s.players.find((p: { id: string }) => p.id === s.humanId).actionPoints > 0) go({ type: 'decision/pass' });
  go({ type: 'decision/confirm' }); go({ type: 'event/draw' });
  if (round === 1) { go({ type: 'event/resolve' }); go({ type: 'claims/continue' }); go({ type: 'round/next' }); }
}
console.log(seed, s.round, s.phase, s.currentEventId);
writeFileSync(process.argv[2], JSON.stringify(s));
