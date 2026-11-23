# LifeTrack Autonomous Roadmap

Owner: product owner (user). Technical lead: Claude (autonomous within the guardrails below).
Vision: a polished, premium financial-education board game. The board is a 2.5D isometric miniature city with animated characters and dice, inside a responsive interface.

## Guardrails (non-negotiable)

- `src/lifetrack/game/` is authoritative: financial engine, AI strategies, insurance, seeded events, scoring and save/resume must not change behavior. Every task's evidence includes `git diff -- src/lifetrack/game` being empty, unless the product owner approves a change.
- 3D and animation are presentation-only. They never decide dice results (`rollBoardDie`), events, money or turn order, and they never dispatch reducer actions from frame or animation callbacks.
- The SVG board remains the fallback until the 3D board passes visual, functional and performance gates.
- Insight popups are excluded unless the product owner explicitly approves them.
- Ask the product owner first for: changes to the game experience or economy, destructive or irreversible actions, paid services, or unresolvable critical issues.
- Git: one commit per logical task, the exact diff reviewed before each commit, no amend, no destructive commands.

## Quality gates (each task)

Unit tests (`pnpm test`), `tsc --noEmit`, production build, and engine diff empty. For UI work, add browser QA (`scripts/qa/journey.mjs`) at phone 390×844, tablet 768×1024 and desktop 1440×900, with no console errors and no overflow.

## Milestones

Status: ✅ done · 🔄 in progress · ⏳ planned · ⛔ blocked

### M0: Foundation ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Git baseline | ✅ | `df0a775` |
| Event-draw soft-lock and board/game save reconciliation | ✅ | `b630d9d`, `31985fd`; 9 regression tests |
| Pre-roll modal blocker, phone header, QA journey | ✅ | `d20b016`; browser 40/40 |
| Project skills | ✅ | `4dd25c0` |
| Phone Money drawer and single Roll Dice control | ✅ | `b15a75b`; browser 44/44, 63/63 tests |

### M1: Phase 4.3C polish leftovers ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 Tablet/desktop: Money drawer covers the board "Current stop" key | ✅ | Heading reserves drawer width ≥481px; browser check "drawer does not cover heading" passes at all 4 viewports |
| 1.2 Landscape phone (844×390) QA pass | ✅ | Board was 0px tall; now 181px with the dock floating right and the modal below the header. New check "board visible ≥120px, ≤10% under dock" passes at all 4 viewports; browser 53/53. Minor: footer disclaimer touches the die panel |

### M2: Phase 5.0, 3D dependencies ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 2.1 Pin `three@0.187.0`, `@react-three/fiber@9.8.2`, `@types/three@0.187.0` (React 19-compatible; fiber peer react `>=19 <19.4`) | ✅ | Lockfile has additions only; tsc clean; 63/63; main bundle hash unchanged (`index-BB1qZMbi.js`, 322.85 kB) |

### M3: Phase 5.1, renderer-independent board model ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 3.1 Pure isometric world mapping of the 24 board spaces (`board3d/boardWorld.ts`) + tests | ✅ | `boardWorld.test.ts`: distinct, centred, loop order, no tile overlap, pawn spread, bounded lerp/hop |
| 3.2 Architecture guard test: `game/` only imports `game/`; `board3d/` never references `gameReducer`, `dispatch(`, `rollBoardDie` or `Math.random` | ✅ | `game/__tests__/architecture.test.ts`; scanner verified on 14 files / 39 imports and flags a planted `../board` import |
| 3.3 Renderer preference (`svg`/`3d`) under `lifetrack.renderer.v1`, default `svg`, `?renderer=` QA override | ✅ | `rendererPreference.ts` + tests (junk values, throwing storage); 70/70, tsc clean |

### M4: Phase 5.2, static 3D board (lazy, with fallback)
| Task | Status | Evidence |
| --- | --- | --- |
| 4.1 `Board3DScene` lazy chunk: orthographic isometric camera, tiles, category colors, centre city block | ⏳ | |
| 4.2 Error boundary + WebGL detection, falling back to the SVG `BoardScene` | ⏳ | |
| 4.3 DOM HUD stays shared (roster, die panel, overlays); canvas is `aria-hidden` with a text summary | ⏳ | |

### M5: Phase 5.3, motion
| Task | Status | Evidence |
| --- | --- | --- |
| 5.1 Pawns ease along the route following `movementStep`/`positions` in `useFrame` (refs only, no per-frame React state) | ⏳ | |
| 5.2 Visual 3D die that lands on the already-decided `rollBoardDie` face | ⏳ | |
| 5.3 `prefers-reduced-motion`: snap instead of tween | ⏳ | |

### M6: Phase 5.4, miniature city art
| Task | Status | Evidence |
| --- | --- | --- |
| 6.1 Character pawns (procedural low-poly figures in each character's palette) | ⏳ | |
| 6.2 Landing and event-category highlight, active-space pulse | ⏳ | |
| 6.3 Isometric buildings (clinic, café, towers, park) from procedural geometry | ⏳ | |

### M7: Phase 5.5, performance and quality
| Task | Status | Evidence |
| --- | --- | --- |
| 7.1 `frameloop="demand"`, DPR cap, disposal, context-loss fallback | ⏳ | |
| 7.2 Bundle budget: main chunk ≤ +5 kB vs. pre-3D; 3D chunk lazy | ⏳ | |
| 7.3 Browser QA with renderer=3d at all viewports; full journey + save/resume | ⏳ | |

### M8: Phase 5.6, 3D as default
| Task | Status | Evidence |
| --- | --- | --- |
| 8.1 Make 3D the default only after M4–M7 gates pass; SVG stays as an automatic fallback and a user setting | ⏳ | |

## Blocked / needs product owner

- Insight popups: excluded pending approval.
