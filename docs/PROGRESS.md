# LifeTrack Progress

Ground rule: `src/lifetrack/game/` (reducer, calculations, AI strategies, policies, seeded deck, scoring) is authoritative. The board layer (`src/lifetrack/board/`) is presentation-only and never changes money, event identity or AI choices.

## Status by phase

| Phase | Scope | Status |
| --- | --- | --- |
| 1–3 | Financial engine, policies, AI rivals, events/claims, quiz, scoring, save/resume, UI screens | Done |
| 4.1 | Board mapping design (`docs/phase4-board-mapping.md`) | Done |
| 4.2 | Playable board: seeded board-only d6, pawn movement, AI pawn turns, separate board save | Done |
| 4.3 | Viewport-fitted full-screen game scene | Done |
| 4.3C-0 | Git baseline | **Done** (2026-11-23, `df0a775`) |
| 4.3C-1 | Event-draw board-state recovery soft-lock | **Done** (2026-11-23) |
| 4.3C-2a | Board progress ahead of the game save | **Done** (2026-11-23) |
| 4.3C-2b | Browser journey / multi-viewport QA, pre-roll modal blocker, phone header | **Done** (2026-11-23) |
| 4.3C-2c | Insight popups (needs product decision) | Open, waiting on product decision |
| 4.3C-2d | Phone: "Money" drawer overlaps board heading | Open (cosmetic) |
| 5.x | Three.js + React Three Fiber 9 board renderer | Not started (dependencies not installed) |

## Tabletop visual upgrade: printed cards, 3D city board, audio fix (2026-11-24) — complete

Reference: the owner's gameplay video (`docs/reference/20261123-1432-40.9480842.mp4`, 14 s portrait clip of a
commercial 3D property board game) was reviewed frame by frame and used for direction only (camera, warmth,
physical dice, landing feedback). No branding, artwork or layouts were copied. The video and the character
reference photos stay untracked (owner's source files).

| Area | What changed | Files |
| --- | --- | --- |
| Printed card system | `TableCard`/`CardMast`: paper stock with fine grain, printed inner frame, layered table shadows, masthead plate with a seal; 8 kinds with their own ink (event, opportunity, investment, protection, expense, emergency, income, special). Payday, bills, event reveal (face-down deck), life events (kind from the engine's expense list), claims, learning, recap, quiz and results all use it. Deal-in animation (none with reduced motion) | `components/TableCard.tsx`, `components/cardKinds.ts` (+test), `screens/GameScreen.tsx`, `src/index.css` |
| Decision hand | Options are choice cards (save = opportunity, policies = protection, pass): staggered deal, picked cards lift with a numbered stamp, unavailable cards greyed with the reason, owned stamp, inspect view (zoomed card with cover details, choose / put back, Esc closes). Ledger previews cash, savings and monthly cover after confirming, from the real reducer. Same draft + lock: nothing is charged before confirm; each move applied once | `components/DecisionCard.tsx` |
| 3D board | Printed spaces (cream face + category stripe on the inner edge; full-colour corners); walnut table lip, thick cream board, printed border; central park (striped lawn, sand paths, plaza) with the new LifeTrack Tower landmark; warmer city palette, autumn trees, warmer light; lower three-quarter camera; rounded ivory die thrown in beside the mover, bouncing and settling on the seeded value; landing sparkles in the space colour; bobbing destination arrow; tokens 12% larger. Touch devices: DPR ≤ 1.75 and 1024 shadow map | `board3d/City3D.tsx`, `board3d/Board3DScene.tsx`, `board3d/camera.ts`, `board3d/Pawn3D.tsx` |
| UI | Warm tabletop background and cream HUD; player dashboard as player mats (colour band per player); How to Play adds "Cards you'll meet" using the real card styles; homepage poster regenerated from the new scene; phone action modal no longer slides under the HUD; hover no longer moves cards (fixed a hover-jitter loop) | `src/index.css`, `components/HowToPlay.tsx`, `public/assets/hero/city.webp` |
| Music start (bug) | Root cause: music retried only on `pointerdown`/`keydown`. On touch devices `pointerdown` is not a user activation (Chrome Android grants it on `pointerup`, iOS Safari on `touchend`/`click`), and "playing" was reported even if the AudioContext stayed suspended, which stopped further retries. Fix: retry on pointerdown/pointerup/touchend/click/keydown; "playing" requires a running context; no second play() while one is in flight; the Play button starts music explicitly; a "Play music" chip appears only after a refusal | `components/MusicPlayer.ts`, `components/AudioControls.tsx`, `screens/MainMenu.tsx` |
| Languages | All new labels in EN/BM/ZH/TA (completeness test covers them) | `i18n/{en,ms,zh,ta}.ts` |

QA (production build, headless Edge): unit 112/112; tsc clean; build OK; `git diff cfe8083 -- src/lifetrack/game` empty.
journey `?renderer=3d` 99/99 and `?renderer=svg` 91/91 (0 console errors, no overflow); `i18n.mjs` 4 languages × desk/phone/landscape 0 failures;
`audio.mjs` 0 failures (updated for the new retry behaviour and the chip); `demo.mjs` 0 failures; `intro.mjs` 0 failures; `renderer-default.mjs` 15/15;
`board3d.mjs` all pass (~281 draws/frame vs limit 300; heap +2.5 MB over 20 remounts; idle ≈15 fps desktop, 0 draws reduced motion);
new scratch check of the inspect flow at 390×844: choose in inspect, Esc, put back, ledger, double-click confirm → cash 3000 → 2660 (save 300 + accident premium 40), savings +300, cover owned once.
Screens reviewed at 1920×1080, 1366×768, 390×844, 360×640, 844×390 and 320×640.

Not verified: real-device audio on iPhone/Android (the activation rules were handled in code and tested in headless Edge only),
and how anything sounds. QA script changes: `audio.mjs` (blocked-play scenario), `demo.mjs` (recap month read from the card masthead).

## Final audio and presentation polish (2026-11-24) — complete

| Item | Status | Files |
| --- | --- | --- |
| Background music: **"Cheery Monday"** (Kevin MacLeod, CC BY 4.0) is the default, as chosen by the owner; "Sunshine" is kept as an unplayed backup. Seamless loop at a measured loop point (65.88 s) | Done | `public/audio/music-cheery-monday.mp3`, `components/MusicPlayer.ts` |
| Tabletop effects: dice shake/roll variations, wooden token steps and landings (weightier on key spaces), card draw/place/confirm/turn, coins, purse, savings stack, policy folder, pizzicato jingles | Done | `public/audio/*.mp3`, `scripts/assets/build_audio.py` |
| Defaults: music and effects on at 100%; independent music/effects switches and volumes plus master mute; saved only once changed (`lifetrack.audio.v3`) | Done | `components/audioPrefs.ts` (+test), `components/AudioControls.tsx` |
| Autoplay: starts on first interaction, retries on the next if refused, waiting state shown; fades; no restart across screens; pauses with the tab; music ducks under jingles | Done | `MusicPlayer.ts`, `AudioControls.tsx` |
| Demo presentation intro (6.5 s, skippable, 4 languages, reduced motion) | Done | `demo/DemoIntro.tsx`, `demo/DemoGame.tsx` |
| Hero/intro 3D fog follows camera distance (portrait views were washed out) | Done | `board3d/Board3DScene.tsx` |
| Credits | Done | `docs/AUDIO_CREDITS.md` (attribution also in the sound settings panel) |

| Demo "Next milestone" race (it could run past the next recap at fast-forward speed) | Fixed | `demo/demoUi.tsx`, `demo/DemoGame.tsx` |

QA (production build): unit tests 110/110; tsc clean; build OK.
- `audio.mjs` 34/34:
  - nothing loads before the first interaction, and the first click starts Cheery Monday;
  - one instance across home, setup, game, resume and modals, continuing through income, bills, dice and decisions;
  - gap-free loop hand-over; tab pause and resume;
  - music on/off and volume work without restarting; effects controls never start music;
  - settings persist through language change and reload;
  - a blocked first play retries on the next interaction; missing files degrade gracefully.
- `demo.mjs` 28/28; `intro.mjs` 63/63 (4 languages × 3 sizes, reduced motion, never in normal play); journey 95/95.

Not verified by the developer: how the music and effects actually sound. They were checked technically
(decoding, levels, loop seam, playback state), not by ear. The owner's listening test is pending.

## Release: polish, immersive 3D, audio, languages, demo (2026-11-24) — complete

Resume point if interrupted: everything below is committed and pushed; nothing is in progress.

| Milestone | Status | Commit | Key files |
| --- | --- | --- | --- |
| Phase 1 re-verification (2.5D flash, decision select/confirm, landscape, results, card overflow) | Done | 3a8a7a8 | `src/index.css`, `DecisionCard.tsx` |
| Languages EN/BM/ZH/TA, demo mode, recap/results charts, focus mode | Done | 938bb40 | `src/lifetrack/i18n/*`, `src/lifetrack/demo/*`, `components/Charts.tsx`, `screens/GameScreen.tsx` |
| Licensed local audio (Kenney CC0 + own cues) | Done | bb8239f | `public/audio/*.mp3`, `docs/AUDIO_CREDITS.md`, `AudioControls.tsx`, `synthSounds.ts` |
| Immersive board (Roll placement, light mood, fitting dashboard) | Done | 8336a37 | `board3d/Board3DScene.tsx`, `src/index.css` |
| Polish (Tamil headings, CJK/Tamil 3D captions, table label) | Done | 6a79b81 | `src/index.css`, `board3d/kit3d.ts` |
| Dynamic-content translation audit, narrow/short screens in all languages | Done | see git log | `i18n/dynamic.test.ts`, `i18n/{ms,zh,ta}.ts`, `GameHeader.tsx`, `scripts/qa/i18n.mjs` |

Translation rules: UI strings use stable keys (`t('decision.choose', { count })`); engine content is overlaid by engine IDs (event, policy, character, quiz, concept, insight) and English AI sentences; numbers are always the engine's `formatRM` output passed in as variables. The engine (`src/lifetrack/game/`) is unchanged.

Tests at completion: 108/108 unit (incl. 120 simulated games × 3 languages: every AI explanation, claim reason, insight and event text translated, RM figures identical, all 24 events reached); tsc clean; build OK. Production preview: journey 95/95, `?renderer=svg` 91/91; `i18n.mjs` 0 failures at 1366×768, 390×844, 844×390, 360×640, 320×640, 568×320, 667×375 in all four languages (no leftover English, clipping, off-screen header items, overflow; language switch keeps the save); `demo.mjs` 28/28; `audio.mjs` 30/30; bills/cards overflow at 12 sizes incl. 568×320 and 667×375.

Remaining / optional: native-speaker review of BM, Chinese and Tamil copy; Insight popups still await a product decision.

## Step 0: Git baseline (2026-11-23)

- Initialized the repo on `main`, with a repo-local identity and Git LFS enabled (local).
- Baseline commit `df0a775` "chore: establish LifeTrack baseline": 79 files (source, tests, config, docs, `pnpm-lock.yaml`, `.figma/` scripts, `public/` assets).
- `.wav` audio is stored through Git LFS, following `.gitattributes`. `public/favicon.png` stays plain git, following `public/.gitattributes`.
- Not committed (already in `.gitignore`): `node_modules/`, `node_modules-clean/`, `.pnpm-store/`, `dist/` (regenerated by `pnpm build`), env, log and temp files.

## Phase 4.3C-1: event-draw soft-lock (2026-11-23)

**Bug.** While the reducer waits in `event-draw`, `GameScreen` advanced the board only for stages `human-landed`, `ai-turns` or `complete`. If the board save was missing, malformed, from another seed, or from an earlier round, `useBoardController` rebuilt the board progress at stage `human-roll`. Nothing then advanced it, and the game stayed on "Rivals are taking their turns" forever.

**Fix.** The decision moved into the pure function `getEventDrawBoardStep(stage)` in `board/boardTypes.ts`. During `event-draw`, every stage except `complete` now runs the rival pawn turns. `runAiTurns` already accepted `human-roll`. Once the pawns finish, the existing `event/draw` dispatch fires once. The human pawn simply doesn't move that month, which is a cosmetic difference only.

**Not touched.** The reducer, calculations, AI strategies, policies, deck, scoring, and both save formats (`lifetrack.game.v1`, `lifetrack.board.v1`).

**Tests.** `src/lifetrack/board/eventDrawRecovery.test.ts`, 6 tests, which failed before the fix and pass after it.

## Phase 4.3C-2a: board ahead of the game save (2026-11-23)

**Bug.** Suppose the board save says `ai-turns`/`complete` for the current round, but the game save is still before `decision/confirm` (`income`/`expenses`/`decisions`). This happens if the game-save write fails while the board-save write succeeds. `GameScreen` then hid the decisions panel, and the roll button needs `human-roll`, so there was no way forward.

**Fix.** The existing round-reset rule moved from `useBoardController` into the pure `reconcileBoardProgress(progress, round, phase)`, which now also maps that inconsistent case to `human-landed`. The human has already moved this month, so there is no second roll. Positions are kept. Consistent progress is returned as the same object, so the effect can't loop. Tests are in `board/boardReconcile.test.ts`, which failed before the fix.

## Open items carried forward

- `state.insight` is set by the reducer but never rendered (no insight popup, and `insight/dismiss` is unused).
- ~~The full browser journey and multi-viewport QA are not yet run.~~ Done in 4.3C-2b below.

## Phase 4.3C-2b: browser journey and multi-viewport QA (2026-11-23)

A real-browser run (headless Edge via `scripts/qa/journey.mjs`) found two pre-existing Phase 4.3 layout bugs, both fixed:

1. **Blocker: the game could not be played past the first roll with a mouse.** In `decisions`, before the human rolled, the action layer was a full-screen blurred modal. Its card said "Roll to open your month" but had no button, and it covered the board's Roll Dice button.
   - **Fix:** the pure `getActionLayerMode(status, phase, stage)` in `board/boardTypes.ts` docks that card (non-blocking) until the pawn has landed. The card also has its own Roll Dice button, which is disabled while rolling and calls the existing, lock-guarded `rollHuman`. Decisions still open as a modal after landing. All other phases are unchanged.
   - **Tests:** `board/actionLayer.test.ts`, which failed before the fix.
2. **Phone header spill.** At ≤480px an older 2-column grid rule plus `.resource-player{grid-column:span 2}` wrapped the full-screen header's balances into extra rows, which spilled 82px over the scene.
   - **Fix:** a phone rule scoped to `.game-fullscreen` in `src/index.css` keeps avatar, name and three balances on one row, and hides only the subtitle and decorative icons.

A code review of the change (project `code-review` skill) found no defects. Its two suggestions were applied: disable the dock button while rolling, and keep the player name visible on phones.

**Still open:** a second Roll Dice button (the board's) stays focusable behind the dock, a duplicate control for screen readers. There is also the phone drawer/heading overlap (4.3C-2d) and insight popups (4.3C-2c).
