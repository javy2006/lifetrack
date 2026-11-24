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

## P0 fix: life event screen unresponsive on phones (2026-11-24)

**Reproduced** with month 2 "Temporary Job Loss" (`scripts/qa/make-event-save.ts`, seed 37) using touch and wheel only. Playwright's `click()` scrolls elements into view even inside `overflow: hidden`, which is why earlier journeys passed while real players were stuck. At 360×640 and 320×640 the action button sat at y≈800 on a 640 px screen: no swipe or wheel could reach it. At 390×844 it was half off-screen.

**Root causes (two, both CSS; no game logic involved):**
1. `.table-card.event-card { overflow: hidden }` (printed-card styles, `src/index.css`) overrode the modal rule `.game-action-modal .event-card { max-height: …; overflow: auto }`, which has equal specificity and comes earlier.
   - The card was capped at the column height and clipped its own content.
   - The scrolling column then had nothing to scroll.
   - The job-loss card is tall, and the shared-event note added in the turn-order milestone made it taller.
2. The overhaul's screen fade-in animated `transform` on `.game-content`. A transformed element becomes the containing block of `position: fixed` descendants, so the fixed action layer started under the header instead of at the top of the screen. The modal column (sized against the viewport) then hung below the screen by the header height. This hit every modal on phones and landscape.

**Fix (presentation only; engine untouched, `git diff -- src/lifetrack/game` empty):**
- In modals the event card grows with its content; the modal column is the single scroll container.
- New sticky **Continue** bar at the bottom of the column, with the safe-area inset, full-width on phones and a 52 px tap target.
  - It disables itself on first tap; the reducer also ignores a second `event/resolve`.
  - The old label "Resolve this month" is kept as its accessible description.
- Event illustration capped at 110–160 px on phones and hidden on short landscape.
- The game-content fade is opacity-only (setup screens keep their slide, since they have no fixed children).
- **Tap-through guard:** the touch test showed a double tap could also press the next screen's button in the same spot (skipping the claim breakdown; no money duplicated). A freshly dealt card now ignores pointer input for 450 ms. The guard is decided in the same render, so even an instant second tap is ignored.

**QA (executed):**
- New `scripts/qa/event-mobile.mjs` (touch/wheel only, no auto-scroll): **ALL PASS, 200 checks**, for EN/BM/ZH/TA × 390×844, 360×640, 320×640, 844×390 and 1366×768. Checks:
  - Continue is visible and uncovered;
  - "Will my cover help?" and "Why it matters" open with a tap;
  - Continue is still reachable after expanding them;
  - a double tap resolves once, and every player is charged from their own claim;
  - the claim and recap buttons are reachable;
  - month 3 begins; no console errors.
- unit 126/126; tsc clean; build OK; journey 3D 99/99, SVG 91/91; cards (360, 390, 1366) ALL PASS; turnorder ALL PASS; demo, audio, intro 0 failures; board3d pass (~225 draw calls); character-images pass; i18n 4 languages 0 failures.
- journey's board-recovery check is now race-aware: with the seeded order the human can move last, so the event may already be drawn before the test's reload.

## Event ownership investigation + seeded turn order with draw ceremony (2026-11-24)

**Report:** "the last AI landed on ACCIDENT and my money was deducted; when I landed on ACCIDENT nothing happened".

**Root cause (traced: dice → mover → movement → landing → event → claim → balances → UI). There is no wrong-player transaction.**
- Landing on a space never moves money. This is by design since Phase 4: `docs/phase4-board-mapping.md` says "Dice movement is presentation-only: it cannot select an event, change a balance…".
- Once a month the engine draws ONE seeded life event (`event/draw`) and resolves it for every player (`event/resolve` maps `applyEventOutcome` over `state.players`). Each player is charged from their own cash and savings, and only their own policies pay. Nothing in that path refers to the human or to the last mover.
- The draw is triggered right after the LAST rival pawn lands, and only the human's claim was shown. So the shared event looked like the last AI's landing being charged to the human.
- The board's space labels (ACCIDENT, MEDICAL…) reinforce that impression.

**Done (no rule, formula or balance change; `src/lifetrack/game/` source unchanged):**
- Regression tests `game/__tests__/eventOwnership.test.ts` (6 tests):
  - every event × every human: each player's claim equals `calculateClaim(own state)`;
  - the last AI's state never changes the human's outcome;
  - insurance follows the owner;
  - results don't depend on the order players are stored in;
  - resolving twice is a no-op;
  - no other state leaks.
- Clarity in the game:
  - the event card says the event happens to all four players, each paying from their own money with their own cover;
  - the claim card adds "How everyone fared", each player's own out-of-pocket and payout from their own record;
  - after a landing, the board says landing never changes money.
- **Open, needs the owner's decision:** landing-triggered personal events would be a rule change. Today the dice deliberately never decide money.

**Seeded turn order** (`board/turnOrder.ts`; presentation layer, like the board):
- `getTurnOrder(seed, ids)` is an unbiased Fisher–Yates shuffle of the canonical character order. It uses its own salted PRNG, so it is independent of the deck shuffle and of `state.players` (where the human is stored first).
- It is drawn once per game from the game seed:
  - reload re-derives the same order, so there is no redraw and no save-schema change;
  - the demo uses DEMO_SEED (fixed, in-memory board).
- Each month: rivals before the human move first (new board stage `pre-turns`, during decisions, before the Roll button appears), then the human, then the remaining rivals at `event-draw`.
- `BoardProgress.moved` records who has moved. It is optional, so old board saves stay valid.
- Rival financial choices are still made by the engine at confirm, as before.
- Dashboard mats are sorted 1st–4th with a number badge.

**Draw ceremony** (`screens/TurnOrderDraw.tsx`):
- Shown only after "Begin month one" for a newly created game, never for a resumed save.
- Deal 0.6 s, four flips at 0.8 s each, then the players line up in order with a small burst: about 4.6 s.
- Skip jumps to the result; reduced motion shows the result at once.
- It never dispatches an action: the save is byte-identical before and after.

**QA (executed):**
- unit 126/126 (new: 6 ownership, 8 turn-order tests, including fairness over 24,000 seeds: each player ±1.5% of 25% per position, all 24 orders); tsc clean; build OK.
- New `scripts/qa/turnorder.mjs` ALL PASS at 1366×768 and 390×844: draw, skip, unchanged save, rivals-before-human, drawn order kept all month, last mover, each player's own claim shown, reload without a redraw.
- journey 3D 99/99 and SVG 91/91; cards (390, 1366) ALL PASS; audio, demo, intro 0 failures; renderer-default 15 PASS; board3d all pass (~293 draw calls); character-images all pass; i18n (4 languages × 3 layouts, now including the draw screen) 0 failures.
- QA scripts now step through the draw.

## Visual & UX overhaul, milestone 1: assets, design system, homepage, cards, landmark (2026-11-24)

Resume point: committed. The next steps are listed under "Overhaul: next milestones" below.

| Area | What changed | Files |
| --- | --- | --- |
| Asset pipeline | Owner art (~140 MB) moved from `public/assets/` to the untracked `art-source/` (gitignored), so Vite no longer ships it. 29 optimised WebP files (~1.3 MB) are built by a script. Each image has a decision (use / modify / recreate / reject) with its reason | `scripts/assets/build_overhaul_assets.py`, `docs/ASSET_REVIEW.md`, `public/assets/{art,icons,scenes,characters/full,characters/portraits}` |
| Design system | Tokens (sky, cream, gold, red, category colours, radii, shadows, Nunito display type) and the restyle of every screen in one stylesheet loaded after `index.css`. Pressable 3D buttons, blue HUD, cream panels | `src/lifetrack/styles/overhaul.css`, `src/main.tsx`, `index.html` |
| Homepage | City backdrop (with a scrim for readability), big Play button, guide tiles, the four full-body characters as a fanned hand, 3D category icons. The 3D chunk is preloaded from the menu | `screens/MainMenu.tsx` |
| Character selection | Full-body character art (round portrait as fallback) | `screens/CharacterSelection.tsx` |
| Cards | Artwork on every decision card, the inspect view, payday/bills (modal only), life events (art chosen from the engine's event category) and claims. Per-product colours. Art never carries numbers | `components/art.tsx`, `components/DecisionCard.tsx`, `screens/GameScreen.tsx` |
| Dashboard | Each player mat shows cash, savings, net worth and monthly costs, plus three cover pips. The identical income line was dropped. The game has no debt or asset mechanics, so none are shown | `components/PlayerDashboard.tsx` |
| 3D board | LifeTrack Civic Hall replaces the old tower: cream hall, blue roofs, lit windows, columned entrance, clock tower with the shield, blue dome with a gold spire, forecourt fountain. Turned to face the camera, inside the plaza | `board3d/City3D.tsx` |
| Results | Plaza backdrop and a podium for the top three | `screens/GameScreen.tsx` |
| Languages | New labels (`menu.castAria`, `dashboard.coverCount`) in EN/BM/ZH/TA | `i18n/*.ts` |

Verified, not changed: the turn rhythm in `board/boardTiming.ts` already matches the brief (900 ms dice, 360 ms per step, 650 ms landing pause, reduced-motion variant). The decision draft/confirm-once flow is unchanged.

QA (production build, headless Edge, all executed): unit 112/112; tsc clean; build OK; `git diff -- src/lifetrack/game` empty.
- journey `?renderer=3d` 99/99 and `?renderer=svg` 91/91, with 0 console errors and no overflow.
- `character-images` all pass. Updated: it now expects the 440 px full-body art, and the fallback blocks all character art.
- `cards.mjs` ALL PASS at 390×844, 1366×768 and 360×640.
- `audio.mjs` 0 failures; `intro.mjs` 0 failures; `renderer-default` all pass.
- `board3d.mjs` all pass (~293 draw calls/frame against the 300 limit).
- `i18n.mjs` (4 languages) 0 failures.
- `demo.mjs` 0 failures. Fixed a race in the test: at 8× the autopilot can pass the recap before the pause lands, and the next milestone is then that month's own recap.
- Visual sweep at 1920×1080, 1440×900, 1366×768, 1024×768, 844×390, 390×844, 360×640 and 320×640: no horizontal overflow.

### Milestone 2 (same day): board haze + month recap
- The 3D background and fog are now a sky haze (`#d3e6f5`), so the horizon blends into the page. Draw calls ~292/300.
- Month recap: reward chips (amount moved to savings; cover payout when there is one), and an art header on screens at least 900 px tall.
- QA re-run after this: journey 3D 99/99, SVG 91/91; board3d, demo, cards, audio, i18n (4 languages) all 0 failures; unit 112/112; engine diff empty.

### Milestone 3 (resumed after the turn-order work): results standings
- Standings rows are cards: medal-coloured rank, name, large total, and on phones three score chips (wealth, savings, learning) under the name. The disclaimer under the results sits on a cream strip.
- Checked with `scripts/qa/results-view.mjs` (a completed engine game injected) at 390×844, 360×640 and 1366×768: no overflow. Journey 3D 99/99 re-run.

### Milestone 4: richer 3D city, tactile cards, dashboard debt, homepage depth (2026-11-24)
- **Assets:** no new files in `design-references/` or `public/assets/` since `docs/ASSET_REVIEW.md` (16 references and the same production set re-checked), so every decision there still stands.
- **3D board** (`board3d/City3D.tsx`):
  - Towers used a six-material box, which cost 12 draws each and could not be batched. Now: one facade material plus a roof slab, merged per colour.
  - With that headroom the city gained a second skyline row, more homes and street trees, plus lamps, benches and flower beds on the plaza paths (palette colours only, so no new materials).
  - Draw calls went from ~293 to ~227 per frame with much more detail.
- **Decision cards:**
  - foil sheen on hover/focus, a press dip, a tilted lift with the art zooming slightly when selected;
  - on confirm the picks pulse and the other cards step back;
  - the pick stamp is a gold seal (an old rule had painted it red under a dark check);
  - selected-hover keeps the same transform (no jitter); reduced motion turns it all off.
- **Dashboard:**
  - adds **Debt**, the engine's `unpaidShortfall` (costs a player could not cover). Net worth stays the engine's cash + savings, as before.
  - Floating +/− chips when cash or savings change.
  - Turn number on the avatar corner and cover marks under the name, so names no longer truncate at 1366 px.
- **Homepage:** a slow drift on the city backdrop, a warm glow behind the title, a bigger logo, a gently pulsing Play button. Setup and game screens fade in.
- **QA (executed):**
  - unit 126/126; tsc clean; build OK; engine diff empty.
  - journey 3D 99/99 (twice), SVG 91/91; cards at 390, 1366 and 360 ALL PASS; turnorder ALL PASS.
  - audio, demo, intro 0 failures; renderer-default and character-images no failures; board3d pass (~227 draw calls).
  - i18n 4 languages 0 failures.
  - Gameplay sweep at 1920×1080, 1440×900, 1366×768, 1024×768, 844×390, 390×844, 360×640 and 320×640: 0 console errors.

### Overhaul: next milestones
1. Optional: use the ~70 draw calls of headroom for animated touches (fountain water, flags) if they stay idle-friendly.
2. Owner decision pending: should landing on a space trigger personal events? That would be a rule change; today dice never decide money.
4. Audio review by ear (not possible headless).

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
