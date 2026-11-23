# LifeTrack QA Report

Environment: Windows 11, Node 22.23.5, pnpm 10.34.3, Vite 8.1.7, React 19.2.4, TypeScript 5.9.3.

## Baseline (2026-11-23, commit `df0a775`)

| Check | Result |
| --- | --- |
| `pnpm test` | 51/51 pass |
| `tsc --noEmit` | Clean |
| `vite build` | Pass, 2157 modules, JS 322.23 kB (99.76 kB gzip). Output hashes identical to the existing `dist/`. |

## Phase 4.3C-1: event-draw recovery soft-lock (2026-11-23)

### Reproduction

The regression test `src/lifetrack/board/eventDrawRecovery.test.ts` mirrors the `GameScreen` event-draw effect and `useBoardController.runAiTurns` as pure functions. Against the original rule it failed in all 6 tests: the game stayed in `event-draw` (`actual: 'event-draw'`, expected `'event'`) and drew 0 events.

### Scenarios covered (all pass after the fix)

| Scenario | Expected and verified |
| --- | --- |
| Board save missing | Rivals move, the event is drawn once, it is `deck[round-1]`, players' money unchanged by the board, a second `event/draw` is ignored |
| Board save malformed JSON | Same as above |
| Board save from another game seed | Same as above |
| Board save from an earlier round (reset to `human-roll`) | Same as above |
| Normal `human-landed`, mid-AI `ai-turns` resume, already `complete` | Event drawn exactly once |
| Board save lost at **every** event-draw for full 6-month games (4 seeds, random human plans) | Final `players` deep-equal to an undisturbed reducer game. Per player, per month: salary credited once, premiums charged once for policies bought earlier, one shared event equal to the deck card, claim resolved once, round closed |

### Results after the fix

| Check | Result |
| --- | --- |
| `pnpm test` | **57/57 pass** (51 existing + 6 new) |
| `tsc --noEmit` | Clean |
| `vite build` | Pass, 2157 modules, JS 322.27 kB (99.78 kB gzip) |
| `git diff -- src/lifetrack/game` | Empty: the financial engine is unchanged |

## Phase 4.3C-2a: board progress ahead of the game save (2026-11-23)

The regression test `src/lifetrack/board/boardReconcile.test.ts` has 3 tests. Before the fix, 1 failed: `ai-turns`/`complete` during `income`/`expenses`/`decisions` left no usable control.

| Check | Result |
| --- | --- |
| Inconsistent stage during income/expenses/decisions | Becomes `human-landed`; positions kept; queue and active pawn cleared |
| Consistent stage/phase pairs (9 cases) | Same object returned (no state churn) |
| New round | Still resets to `human-roll`, keeps positions |
| `pnpm test` | **60/60 pass** |
| `tsc --noEmit` | Clean |
| `vite build` | Pass, JS 322.46 kB (99.82 kB gzip) |
| `git diff -- src/lifetrack/game` | Empty |

### Not yet verified

- ~~The recovery path has not been run in a real browser yet.~~ Verified in 4.3C-2b below.
- ~~Multi-viewport layout QA.~~ Done in 4.3C-2b below.

## Phase 4.3C-2b: browser journey and multi-viewport QA (2026-11-23)

**Method.** `scripts/qa/journey.mjs` drives headless Microsoft Edge (playwright-core 1.49.1, installed outside the project) against the dev server. It plays a full 6-month game through the UI at 1440×900. In month 2 it deletes `lifetrack.board.v1` after confirming decisions and reloads (the 4.3C-1 soft-lock scenario). It plays month 1 at 390×844 (phone) and 768×1024 (tablet). Then it validates the saved `lifetrack.game.v1` and checks layout overflow.

### Findings (before fixes)

| Severity | Finding | Status |
| --- | --- | --- |
| **Blocker** | Pre-roll `decisions` modal covered the board's Roll Dice button and had no button of its own, so mouse/touch players were stuck at month 1 | Fixed |
| Major (phone) | Full-screen header balances wrapped to extra rows and spilled 82px over the scene at 390px | Fixed |
| Minor (phone) | "Money" drawer summary overlaps the board card heading | Open |
| A11y nit | Board Roll Dice button stays focusable behind the dock (duplicate control) | Open |

### Results (after fixes)

| Check | Result |
| --- | --- |
| Browser checks | **40/40 pass** |
| Board-save loss + reload during event-draw (real browser) | Recovered, event shown in about 2 s, board reached `complete` |
| Each month's event equals the seeded `deck[round-1]` (6/6) | Pass |
| All 4 players: 6 closed months, salary once, essentials once, two actions, premiums once for earlier policies, one shared event and claim per month, money conserved | Pass |
| Game reaches results after the 3-question quiz | Pass |
| Console errors (all viewports) | None |
| Horizontal overflow / header spill (phone, tablet, desktop) | None |
| `pnpm test` | **63/63 pass** |
| `tsc --noEmit` | Clean |
| `vite build` | Pass, JS 322.76 kB (99.89 kB gzip), CSS 68.16 kB |
| `git diff -- src/lifetrack/game` | Empty |

### Not covered

- Real touch devices and Safari/WebKit (only Edge/Chromium was tested).
- Screen-reader pass.
- Landscape phone (≤700px tall) layout.
