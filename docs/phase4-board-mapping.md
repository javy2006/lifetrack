# Phase 4 Board Architecture and Financial Mapping

## Baseline (2026-11-22)

- Node: v26.13.1; pnpm: 10.34.3. `mise` expects the project toolchain; this shell is not on the requested Node 22 version.
- Lockfile v9 is current for the manifests. The preview's existing Windows native bindings had been locked during the earlier install attempt. A clean isolated frozen-lock install succeeded; normal `pnpm test`, `pnpm typecheck`, and `pnpm build` subsequently succeeded.
- Baseline: 42/42 tests pass; TypeScript passes; Vite 8.1.7 build passes (2154 modules). One Node `module.register()` deprecation warning is emitted by the build toolchain.
- `src/lifetrack/game/` is authoritative and remains unchanged. Reducer phases: `income → expenses → decisions → event-draw → event → claims → summary`; after six rounds the reducer enters `review`, then `complete`.
- `decision/confirm` runs all three AI strategies in the same reducer action. The six-month event is drawn from the seeded deck and claim results are calculated by existing engine functions.

## Mapping to the board presentation

| Existing phase / data | Board presentation | Authoritative action |
| --- | --- | --- |
| Income | Salary/start space and human HUD | `round/collect-income` |
| Expenses and premium charges | Monthly checkpoint / outflow cue | `round/pay-bills` |
| Two decision points, savings, policies | Decision space and existing marketplace | `decision/save`, `decision/buy`, `decision/pass`, `decision/confirm` |
| AI strategy turns | Three rival tokens animate to the same monthly checkpoint; rationale stays sourced from `aiTurns` | Existing `decision/confirm` / `playAiTurn` |
| Seeded shared event | Category space/card selected by existing event deck; board landing is illustrative | `event/draw` |
| Claim and policy outcomes | Claim space and payout breakdown | `event/resolve`, existing `applyEventOutcome` |
| Summary and quiz | Monthly checkpoint; existing recap, quiz, and results | `claims/continue`, `round/next`, quiz reducer actions |

## Board position and dice policy

Build a 24-space loop around the local city scene, four monthly spaces per financial round. The board is a visual navigation layer for the existing six-round journey. Dice movement is presentation-only: it cannot select an event, change a balance, charge a premium, or affect scoring. Event identity always comes from the deterministic event deck. Board coordinates are derived from existing round/phase state; no duplicate financial data or independent turn state is saved. Token movement follows the fixed loop; use deterministic six-sided results derived from the game seed and round only for a visible board move, without using them in financial calculations.

## Phase 4.2 playable-turn mapping

Board positions are independent presentation state keyed by the existing four `CharacterId`s and persisted under a separate, validated board-save key linked to `GameState.seed`. A new seed initializes the pawns at the start; reloads restore positions and turn progress without changing financial state. The financial reducer remains the only source of month, balances, event identity, policy effects, claims, quiz progress and scoring.

Per month, turn sequence is: reducer income → reducer expenses → human rolls/moves once → human makes existing two decisions → reducer confirms decisions and runs its existing AI financial strategy → AI pawns roll/move sequentially → reducer draws the single shared seeded event → reducer resolves claims → reducer summary → next month. Dice use a seedable six-sided board-only source; results cannot select events or affect money. Turn completion is committed at safe interaction boundaries; movement animation is transient and a resumed save returns to the last completed pawn position.

## Compatibility and risk

- No schema migration is needed for derived positions. Existing saves stay readable.
- Do not use a die result to choose the event or to make an AI choice.
- Keep each reducer action button gated by its current phase; movement animations must not dispatch financial actions.
- The complete browser journey and multiple viewport QA still need execution after board implementation.
