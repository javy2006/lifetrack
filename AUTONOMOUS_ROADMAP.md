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

### M4: Phase 5.2, static 3D board (lazy, with fallback) ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 4.1 `Board3DScene` lazy chunk: orthographic isometric camera, tiles, category colors, centre city block | ✅ | Lazy chunk 928 kB (246 kB gzip); main +4.0 kB (+1.65 kB gzip), within budget. Visual check on desktop |
| 4.2 Error boundary + WebGL detection, falling back to the SVG `BoardScene` | ✅ | Edge with `--disable-webgl --disable-3d-apis` + `?renderer=3d`: SVG shown, game playable, 0 errors |
| 4.3 DOM HUD stays shared (roster, die panel, overlays); canvas is `aria-hidden` with a text summary | ✅ | `BoardScene.renderBoard` slot; `sr-only` board label |
| 4.4 2D/3D toggle (`aria-pressed`, persisted, default 2D) | ✅ | Browser: default svg → toggle 3d (stored) → reload keeps 3d → toggle back svg |
| QA | ✅ | Journey `?renderer=3d` 57/57 (3D canvas active at 4 viewports) and `?renderer=svg` 53/53; 70/70 unit; tsc clean; engine diff empty. Known: R3F 9.8.2 logs a `THREE.Clock` deprecation **warning** on three 0.187 (harmless) |

### M5: Phase 5.3, motion ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 5.1 Pawns ease along the route following `movementStep`/`positions` in `useFrame` (refs only, no per-frame React state) | ✅ | Pure `stepPawnTween` (tested: hop, exact landing, no hop when still). Browser frame mid AI turn shows pawns in transit; final positions equal the seeded rolls |
| 5.2 Visual 3D die that lands on the already-decided `rollBoardDie` face | ✅ | `dieRestRotation` verified with three.js Euler for all 6 faces; die receives `dieValue` from the controller, and the guard test forbids `rollBoardDie`/`Math.random` in `board3d/` |
| 5.3 `prefers-reduced-motion`: snap instead of tween | ✅ | Unit test for snapping; browser run with `reducedMotion: 'reduce'` completes with 0 errors |
| QA | ✅ | 72/72 unit; tsc clean; journey `?renderer=3d` 57/57; main 326.94 kB (+0.06 kB); engine diff empty |

### M6: Phase 5.4, miniature city art ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 6.1 Character pawns (procedural low-poly figures in each character's palette) | ✅ | `Pawn3D.tsx` uses `CHARACTER_LOOKS` (now exported from `CharacterArt`): Alex glasses, Mei Ling long hair, Daniel hard hat, Aisyah red headband + badge; player-colour base, red rim for the human. Pawns face their direction of travel, squash on landing, turn back to the camera at rest; floating marker on the active AI. Pure helpers `headingTowards`/`lerpAngle`/`landingSquash` tested |
| 6.2 Landing and event-category highlight, active-space pulse | ✅ | Tiles: plinth, category-colour frame, cream inset with painted caption (`tileCaption`). Active space glows and its ring pulses for 2.4 s then rests (GPU idle); event-category spaces glow with a static ring. Tiles no longer lift (pawns used to sink into lifted tiles) |
| 6.3 Isometric buildings (clinic, café, towers, park) from procedural geometry | ✅ | `City3D.tsx` + shared `kit3d.ts` (one unit geometry per shape, cached materials/textures, disposed on unmount): towers with window facades, savings bank, clinic, café, cover office, homes, park, roads, lamps, die plaza. Layout follows an occlusion rule (tall buildings front-right only) so no building hides a tile or pawn |
| 6.4 Lighting, shadows, framing | ✅ | Key light from screen upper-left with a 1024² PCF shadow map, fill light, wooden board rim. Fixed: corner tiles intersected (SVG corners are ~0.4 units apart) → `SPACE_WORLD` nudges end tiles inward; new all-pairs footprint test. Fixed: board clipped on phones → `FitCamera` projects the table corners; 3D viewport no longer overflows at 390 px |
| QA | ✅ | 77/77 unit; tsc clean; journey `?renderer=3d` 57/57, 0 console errors, no overflow; main 327.00 kB (+0.06 kB), 3D chunk 942 kB (251 kB gzip); engine diff empty |

### M7: Phase 5.5, performance and quality ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 7.1 `frameloop="demand"`, DPR cap, disposal, context-loss fallback | ✅ | `frameloop="demand"` + `dpr={[1,2]}`; kit geometries/materials/textures and merged batches disposed on unmount. Context loss after the scene is live: SVG board takes over, game playable, **0 console errors**. The M4 "`precision`" error was a test artifact: the old check lost the context before R3F had created its renderer (traced with a logging `gl` factory). If a context is ever lost before creation, `Board3DBoundary` still falls back to SVG (React logs the caught error) |
| 7.2 Bundle budget: main chunk ≤ +5 kB vs. pre-3D; 3D chunk lazy | ✅ | Main 327.00 kB vs 322.85 kB pre-3D (+4.15 kB). 3D chunk 948 kB (252.5 kB gzip), loaded only when the 3D board mounts (~0.5–1 s after "Begin month one" locally) |
| 7.3 Rendering cost | ✅ | `StaticBatch` merges static meshes per material (board, city, tile bases, each pawn figure): ~200 draw calls per frame incl. shadow pass (was ~490). Idle board issues 0 draws; goes idle again after each move |
| 7.4 Memory | ✅ | 80 2D↔3D round trips: heap +5.2 MB at 20, then flat at ~+3 MB (no leak); no "too many WebGL contexts" warnings |
| 7.5 Browser QA (production build) | ✅ | `scripts/qa/board3d.mjs` 14/14 (context loss, toggling, idle GPU, draws/frame, no-WebGL at 390 px, reduced motion at 768 px). Journey `?renderer=3d` 57/57 and `?renderer=svg` 53/53: full 6-month desktop game, month-2 board-save loss + reload resume, money conservation, seeded events, phone/tablet/landscape; 0 console errors, no overflow |
| Known | — | R3F 9.8.2 logs a `THREE.Clock` deprecation **warning** on three 0.187 (inside R3F; harmless, would need an R3F upgrade) |

### M8: Phase 5.6, 3D as default ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 8.1 Default renderer decision | ✅ (superseded by UX P3) | **3D is the default on tablets and desktops; 2D stays the default on phones.** `defaultRendererForViewport`: 3D when the smaller viewport side is ≥ 641 px. Why not phones: at 390 px the fixed isometric board is ~360 px wide and tile captions shrink to ~5 px, while the SVG board pans and stays readable; landscape phones also hide the toggle row (M1), so a 3D default there could not be switched in place. A stored choice and `?renderer=` always win |
| 8.2 SVG fallback and user switch | ✅ | SVG remains the automatic fallback (no WebGL, chunk/scene error, context loss) and a persisted toggle (`aria-pressed`). `scripts/qa/renderer-default.mjs` 23/23: defaults at 1440×900, 1280×720, 768×1024 (3D) and 390×844, 844×390 (2D); toggle, persistence across reload/resume, stored 3D applies in landscape; 0 console errors |
| 8.3 Final gates (production build) | ✅ | 78/78 unit; tsc clean; build OK (main 327.13 kB, +4.28 kB vs pre-3D; 3D chunk 948 kB / 252.5 kB gzip, lazy). Journey default URL 53/53, `?renderer=3d` 57/57, `?renderer=svg` 53/53; `board3d.mjs` 14/14; engine diff empty |

## UX redesign (owner playtest, 2026-11-23)

Owner priorities: P1 visible dice and pawn movement · P2 simpler interface · P3 3D as the primary experience · P4 better 3D characters and a calmer, more readable board.

### P1: Visible dice and pawn movement ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Root cause | ✅ | A full-screen dice dialog covered the board for the whole roll (520 ms tumble, then 135 ms per step), and the decisions modal opened the instant the pawn landed, with a second "Continue to decisions" dialog on top |
| Paced turns | ✅ | `board/boardTiming.ts` (tested): human tumble 950 ms → value shown 650 ms → 380 ms per space → 1100 ms landing rest (a six ≈ 5 s); rivals 550/450/300/650 ms. Reduced motion: no tumble or hops, 220 ms steps, result and landing still shown. `animateTurn` in the controller; progress is committed only after the landing rest, so a reload mid-move replays the same seeded roll instead of moving twice |
| Board stays visible | ✅ | Dice dialog removed; the 3D die tumbles then settles on the decided face; the die panel status follows Rolling… → You rolled N → You landed on X (`aria-live`). The decisions window opens by itself after landing (one less click) |
| Readable steps | ✅ | The highlighted space follows the pawn step by step (ring pulse on each tile, then on the landing tile); 3D hops are 0.32 high and last 72% of each step, so every step has a visible rest; the turn marker shows over the moving pawn (you or a rival). SVG token transition follows the same step timing |
| QA | ✅ | 82/82 unit; tsc clean; build OK; engine diff empty. Journey `?renderer=3d` 65/65 and `?renderer=svg` 61/61 incl. new checks at all 4 viewports: board uncovered while the pawn moves, decisions open only after the full move. `board3d.mjs` 14/14 |

### P3: 3D as the primary experience ✅
| Task | Status | Evidence |
| --- | --- | --- |
| 3D on every device with WebGL | ✅ | Supersedes M8's phone exception at the owner's request. `readRendererOverride`: 3D unless `?renderer=svg` (QA only). The old stored `lifetrack.renderer.v1` choice is ignored so earlier 2D picks cannot trap players without a visible switch |
| No manual switching in the game UI | ✅ | 2D/3D toggle removed from the heading; SVG remains the automatic fallback (no WebGL, load/scene error, context loss) |
| QA | ✅ | 81/81 unit; tsc clean; main 325.73 kB. `renderer-default.mjs` 15/15 (3D at 5 viewports with a stored "svg", no toggle, 0 errors). `board3d.mjs` 14/14 (leak test now remounts the board via Exit → Continue; +3.4 MB over 20 remounts). Journey default URL 61/61, `?renderer=svg` 61/61. Phone readability of the 3D board is addressed in P4 |

### P4: 3D visual quality and readability ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Larger, clearer spaces | ✅ | 3D layout is now its own square ring of 24 equal 1×1 tiles (7 per side, shared corners, pitch 1.08) instead of the SVG-derived 0.86×0.6 tiles; each tile has a canvas-drawn category icon (RM coin, coins, cross, warning, house, shield, star, moon) above its caption, and a start flag on space 1 |
| Camera | ✅ | Front-facing ¾ view (yaw 0, 42° pitch) replaces the diagonal isometric camera: the board projects at its side length rather than its diagonal (~40% larger tiles on portrait phones) and captions read straight across. Pawns rest facing the camera |
| Calmer centre | ✅ | Towers, roads, lamps, café and extra houses removed. Low park with a ring path and fountain, four small landmarks (bank, clinic, home, cover office), six trees and the die plaza; nothing is taller than ~0.6 units |
| Characters | ✅ | `Figure3D.tsx`: chibi board-game miniatures with faces (eyes with highlights, brows, mouth, blush, ears), capsule limbs and distinct silhouettes: Alex glasses and piggy bank, Mei Ling bun, skirt and tablet, Daniel hard hat and hi-vis vest, Aisyah big wavy hair with red headband. Player-colour base, red rim for you |
| Route and positions | ✅ | A pawn alone on a space stands in its centre; shared spaces spread up to 4 pawns without overlap (tested). Once a roll is revealed, dots in the mover's colour mark the spaces it will cross (bigger dot on the destination; `routeSpaces`, tested) |
| QA | ✅ | 83/83 unit; tsc clean; build OK (main 327.92 kB); engine diff empty. Journey default 61/61 and `?renderer=svg` 61/61; `board3d.mjs` 14/14 (~186 draws/frame, +3.1 MB over 20 remounts); `renderer-default.mjs` 15/15 |

### P2: Simpler interface ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Short screens, one obvious action | ✅ | Phase cards are a short title, the key figures and one button ("Payday", "Pay the bills", "Roll the dice", "Pick 2 more"). Month-1-only hints replace instructions repeated every month |
| Learn more | ✅ | New `LearnMore` (native `<details>`, keyboard accessible, closed by default). Policy cards show name, price and headline benefit; type, deductible/limit, what it responds to, exclusions and explanation sit behind Learn more. Event lesson behind "Why it matters"; claim lesson shows the takeaway with the explanation behind Learn more |
| Claims and recap | ✅ | Zero-value claim lines hidden (total and out-of-pocket always shown); only owned cover is listed, with "No cover owned. You paid this yourself." otherwise and the other policies under "What other cover would do". Recap drops the repeated lesson and rival count |
| Setup screens | ✅ | Character select: art, name, job and money-style title (bio and long strategy text removed). Intro: four icon facts built from `GAME_CONFIG` instead of four paragraphs. Disclaimers kept |
| No rule or data changes | ✅ | Only `src/lifetrack/screens`, `components/ui.tsx` and CSS changed; `src/lifetrack/game` diff empty, so all financial wording and figures still come from the engine |
| QA | ✅ | 83/83 unit; tsc clean; build OK (main 325.68 kB). Journey default 61/61 and `?renderer=svg` 61/61 (full 6-month game, money conservation, reload resume, 4 viewports, 0 errors, no overflow); `board3d.mjs` 14/14; `renderer-default.mjs` 15/15. Screens reviewed at 1440×900 and 390×844 |

### Official characters from reference images ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Asset pipeline | ✅ | No image-to-3D service is available (and paid services are out of scope), so the board figures are hand-modelled Three.js approximations of the references, with each head carrying a face texture cropped from the official image. `scripts/assets/build_character_assets.py` (Pillow) builds `public/assets/characters/{portraits,busts,faces}` from `reference/*.jpg`: 192 px WebP portraits (~4 KB), 360×480 WebP busts with the backdrop removed by an edge-connected fill (~16 KB), 256 px face textures faded to the sampled skin tone (~7 KB). The 25 MB references are **not committed** (owner to decide) |
| 3D board models | ✅ | `CharacterModels.tsx`: one shared ~6-heads-tall body plan (lathe jacket torso, tapered trousers, capsule limbs posed with a `Limb` helper). Alex: navy suit, white shirt, red tie, wallet. Mei Ling: sage blazer with rolled sleeves, cream blouse, long straight hair, laptop, watch. Daniel: yellow hard hat with chin strap, navy work jacket with reflective stripes, ID badge, radio, cargo trousers, boots. Aisyah: coral blazer, lanyard and ID card, long wavy hair, red headband, explaining gesture. Heads ~12% larger and tilted up for board readability; face texture lightly self-lit. No pedestal: a thin player-colour ring at the feet (red for you). Face textures load asynchronously and fall back to skin colour, so a missing file never breaks the 3D board |
| Portraits | ✅ | `CharacterPortrait` (round, explicit size, alt text) replaces the old SVG art in the top-left HUD, the "Everyone's money journey" comparison table, the board roster, the final standings and the 2D-fallback tokens. Selection cards show the official head-to-waist bust. The old SVG `CharacterArt` and chibi figures were removed (main bundle −4.4 kB) |
| QA | ✅ | 83/83 unit; tsc clean; build OK; engine diff empty. Journey default 61/61 (4 runs; one run reported a console error whose text was not captured and did not reproduce in 3 reruns) and `?renderer=svg` 61/61; `board3d.mjs` 14/14 (~181 draws/frame); `renderer-default.mjs` 15/15; portraits load 192×192 with no failed requests at 1440×900 and 390×844 |

### Fix: broken character images on the deployed site ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Root cause | ✅ | The root `.gitattributes` stores `*.webp`, `*.jpg` and `*.wav` in Git LFS. The deployment does not fetch LFS objects, so it served LFS pointer text instead of the images (and the sounds in `public/audio`). Reproduced with `GIT_LFS_SKIP_SMUDGE=1` checkouts: `b1feae1` contains pointer text, the fix contains real WebP/JPEG/WAV files. Paths, filenames and casing were already correct |
| Fix | ✅ | `public/.gitattributes` (which already exempted `favicon.png` for the same reason) now exempts `assets/characters/{portraits,faces}` and `audio`; files re-stored as plain blobs (~0.9 MB). **Rule: anything the browser loads from `public/` must not be LFS.** |
| Selection cards | ✅ | Face-centred round crop of the official portrait (320 px WebP, `object-fit: cover`, `object-position: 50% 40%`); busts removed. Age badge kept above the portrait on phones |
| Fallback | ✅ | `CharacterPortrait` shows the character's initial on their colour if an image fails, keeps the name as `aria-label`, and logs the failing URL |
| QA | ✅ | Built from a clean LFS-free checkout (as the deployment does): `character-images.mjs` 3/3 (4 portraits 320 px, `cover`, no failed requests at 1440×900 and 390×844; blocked images show 4 labelled initials). Journey default 61/61 and `?renderer=svg` 61/61, `board3d.mjs` 14/14, `renderer-default.mjs` 15/15; 83/83 unit; tsc clean; engine diff empty |

### Gameplay experience and polish (owner brief, 2026-11-23) ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Vikram | ✅ | Display name Daniel → Vikram (`characters.ts`); internal id `daniel` kept for save compatibility. New test pins names/ids; journey checks no on-screen "Daniel" during play and on results |
| Updated references | ✅ | The owner replaced `reference/{mei-ling,aisyah}.jpg`, added `vikram.jpg` and deleted the outdated generated portraits/faces. Assets regenerated from the new references (script maps `daniel` → `vikram.jpg`, handles RGBA). 3D models updated: Mei Ling round glasses, Vikram beard and skin tone, Aisyah cream hijab over a red underscarf (hood with a face opening + drape) |
| P1 movement | ✅ | Timing: tumble 900 ms, value 500 ms, 360 ms per space, landing 650 ms; rivals use the same step and landing rhythm (tested ranges 800–1000 / 300–400 / 500–700). New landing ring burst in the mover's colour; the decisions window states why it opened ("Rolled 5 · Landed on Family") |
| P3 How to play | ✅ | `HowToPlay`: four numbered, illustrated steps (Roll, Move, Decide, Finish) with one sentence each and gentle animation (static with reduced motion), used in the main-menu guide and in game. Main-menu modals now have a proper panel background |
| P6 dashboard | ✅ | `PlayerDashboard` replaces the roster chips: portrait, name, cash, income, expenses (essentials + premiums), net worth (cash + savings, as in scoring), board space and a turn badge. 2×2 beside the board on desktop, compact 2×2 below it on tablet, one slim row on phones (full 2×2 in the Money drawer). Journey verifies it against the saved state for all 4 players |
| P7 sound | ✅ | Effects on by default, music off; new prefs key (v1 had saved "off" for everyone while the files were broken). One-click mute button + volume popover. Dice/step/landing synthesized with Web Audio (no files); effect files fetched and decoded once; no sound before a user gesture; per-sound throttle and a 4-sound cap; base-URL-aware paths. The 0.5 MB ambience track is no longer downloaded unless music is turned on |
| P5 board | ✅ | Central paved plaza (fountain and the die's landing spot), four roads and four tinted districts: finance (bank), health (clinic), homes (two houses), shops (cover office + shop) |
| P2/P4 | ✅ | Already delivered in UX P2/P3 (short screens, Learn more; 3D everywhere with automatic SVG fallback, no toggle) |
| QA | ✅ | 84/84 unit; tsc clean; build OK. Journey default 75/75 and `?renderer=svg` 75/75 (each viewport plays a different character: Alex desktop full 6 months with save-loss reload, Mei Ling phone, Vikram tablet, Aisyah landscape; dashboard accuracy months 1 and 4; movement before decisions); `board3d.mjs` 14/14 ×3 (heap measured after 3 GC passes; an 80-remount trend levels off at ~3.3 MB); `renderer-default.mjs` 15/15; `character-images.mjs` 3/3 |

### Board-game redesign and interaction fixes (owner brief, 2026-11-23) ✅
| Task | Status | Evidence |
| --- | --- | --- |
| Old 2.5D screen (root cause) | ✅ | `Board3DSlot` used the SVG board as the **Suspense fallback**, so the old 2.5D board rendered every time the game mounted while the 250 kB 3D chunk downloaded (every new game/resume until cached; seconds on slow networks). The game screen also drew the old flat `CityScene` as a backdrop. Fix: a neutral board-shaped loader is the Suspense fallback; SVG only on no-WebGL/error/context loss; the 3D chunk is preloaded on the menu (idle) and by the homepage hero; backdrop removed. Renderer preference was already ignored (P3). Journey now observes the DOM and fails if `.life-board` is ever mounted with 3D active (new game, reload and resume): passes |
| Decision selection (root cause) | ✅ | Every click dispatched straight to the engine (money moved, action point spent); engine rules then disabled the options, and the "Reset choices" control was hidden once both moves were used, so a choice could not be changed. New `DecisionCard`: picks are a UI draft (select, change, remove; slots show the picks; projected cash shown), validated by running the real reducer on a copy (`decisionDraft.ts`, 4 tests); "Confirm my moves" dispatches each move once behind a lock, pads unused moves with passes, then confirms after a short "Locked in" beat. A reload mid-decision just reopens the card (nothing was applied); legacy saves with already-applied moves show them with an Undo. AI flow unchanged (engine) |
| Profession tokens | ✅ | `Tokens3D.tsx` replaces the human figures: Alex calculator on a ledger, Mei Ling design tablet + stylus, Vikram hard hat on a blueprint roll, Aisyah megaphone + phone; cream bases with player-colour rims, red ring for you; hop, squash, landing ring kept. Face textures and human-model code removed |
| Board and camera | ✅ | Perspective camera (`camera.ts`, 4 tests): overview fits the whole board for any aspect; while a token moves the camera eases in to follow it, then back out (overview only with reduced motion). Outer city: ring road with lane marks, pavements, street lights, tall offices behind the board, low homes/shops/trees in front, two ambient cars (~15 fps, desktops only, off with reduced motion). Centre: LifeTrack landmark tower with the shield emblem in a fountain basin, plus the four districts. Fog scales with camera distance |
| Main action | ✅ | Big embossed Roll button on the board itself with a turn label ("Your turn · Vikram" → "Rolled 5" → "Landed on Family"; rivals: "Alex rolled 3"); the pre-roll and rival dock cards are gone so nothing covers the board |
| Cards | ✅ | Decision card with a coloured band, large icon, selectable option cards (selected/unselected/disabled/owned/confirmed states), move slots and projected cash; month cards share a card-stock look with category bands |
| Homepage | ✅ | `HeroBoard`: the live 3D city board with tokens and a slow camera drift (lazy, warms the game chunk); `assets/hero/city.webp` (51 kB, captured from the scene) is the loading poster and no-WebGL fallback |
| How to play / layout | ✅ | Bigger illustrations and type, token in the Move step, shorter lines. Game screen: duplicate board heading removed (board fills the card); dashboard beside (desktop) / below (tablet) / slim row (phone) |
| QA | ✅ | 92/92 unit; tsc clean; build OK; engine diff empty. Journey default 95/95 (new: never-SVG check, select/change/remove, no money before confirm, exactly-once on double-click) and `?renderer=svg` 91/91; `board3d.mjs` 15/15 (idle ≤ ~15 fps on desktop, 0 draws with reduced motion; ~275 draws/frame with the outer city, limit raised 250 → 300); `renderer-default.mjs` 15/15; `character-images.mjs` 3/3 |

## How to run QA (for the next session)

1. `pnpm test`, `pnpm typecheck`, `pnpm build`, then `npx vite preview --port 4174`.
2. In a folder outside the repo: `npm i playwright-core@1.49.1`, copy `scripts/qa/*.mjs` there (ESM ignores NODE_PATH).
3. `node journey.mjs http://127.0.0.1:4174/?renderer=3d ./shots` (and `?renderer=svg`), `node board3d.mjs http://127.0.0.1:4174/`, `node renderer-default.mjs http://127.0.0.1:4174/`. Screenshots stay out of the repo.

## Known remaining issues

- R3F 9.8.2 logs a `THREE.Clock` deprecation warning with three 0.187 (inside R3F; needs an R3F release that uses `THREE.Timer`).
- Landscape phones hide the renderer toggle with the rest of the heading row (by design since M1); switch in portrait.
- If a WebGL context were lost before R3F creates its renderer, the error boundary falls back to SVG but React logs the caught error.
- The 3D chunk is 252 kB gzip; the SVG board shows while it loads, so there is no blank state.

## Next steps (suggested)

- Optional: larger tile captions or a closer camera on small screens if 3D should become the phone default later.
- Optional: upgrade R3F when a release drops `THREE.Clock`, then re-run all QA scripts.

## Blocked / needs product owner

- Insight popups: excluded pending approval.
