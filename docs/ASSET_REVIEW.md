# Asset review: Visual & UX overhaul (2026-11-24)

Every owner-supplied image was opened and inspected at full size and at its real display size before use.
Originals (~140 MB, 2048 px PNG data, several saved as `.jpg`) were moved from `public/assets/` to the local,
untracked `art-source/` folder. Left in `public/`, Vite would copy all of it into every deployment.
`scripts/assets/build_overhaul_assets.py` builds the small WebP copies the game uses (~1.3 MB in total).

Decision key: **USE** as is (resized) · **MODIFY** crop / background removal · **RECREATE** rebuilt in code (reference only) · **REJECT** not used.

## Characters (identity assets: never redrawn)

| Source | Decision | Output | Notes |
| --- | --- | --- | --- |
| `characters/<name>/<name>-avatar.jpg` ×4 | USE (crop) | `characters/portraits/<id>.webp` 320 px | Head-and-shoulders crop for round avatars. Replaces the deleted old portraits at the same path, so every existing use (HUD, dashboard, standings) picks them up. |
| `characters/<name>/<name>-full.jpg` ×4 | USE (crop) | `characters/full/<id>.webp` 440×800 | Full-body crop on the character's own pastel backdrop. Used on the homepage cast and the character selection cards. |

Vikram keeps the internal id `daniel` (engine and saves unchanged). Only the file name maps it.

## Card artwork

| Source | Decision | Output | Used for |
| --- | --- | --- | --- |
| `cards/savings/savings.jpg` | MODIFY: cropped off a dark picture-frame band on the right | `art/savings.webp` | "Save RM300" choice card |
| `cards/insurance/medical-insurance.jpg` | USE | `art/medical.webp` | Medical protection card |
| `cards/insurance/accident-insurance.jpg` | USE | `art/accident.webp` | Personal accident card |
| `cards/insurance/critical-illness.jpg` | USE | `art/critical.webp` | Critical illness card |
| `cards/insurance/life-insurance.jpg` | REJECT | — | The game has no life-insurance product; showing it would teach a choice that does not exist |
| `cards/income/salary-increase.jpg` | MODIFY: cropped out the picture-in-picture frame | `art/income.webp` | Payday card |
| `cards/expenses/budget-planning.jpg` | USE | `art/bills.webp` | Monthly essentials (bills) card |
| `cards/savings/emergency-fund.jpg` | USE | `art/emergency-fund.webp` | Claim / cover breakdown card |
| `cards/savings/investment.jpg` | REJECT | — | Picture-in-picture framing, and the game has no investment mechanic (misleading) |
| `cards/expenses/unexpected-expense.png` | USE (trim transparent margin) | `art/event-repair.webp` | Repair / breakage life events |
| `cards/events/charity-giving.png` | USE (trim) | `art/event-family.webp` | Family and social life events |
| `cards/events/market-crash.png` | USE (trim) | `art/event-income-shock.webp` | Income-shock events (job loss, unpaid leave) |
| `cards/expenses/home-purchase.png` | USE (trim) | `art/event-home.webp` | Moving-out event |
| `cards/events/bonus-reward.png` | USE (trim) | `art/event-calm.webp` | Calm months (no cost) |
| `cards/education/education-skills.png` | USE (trim) | `art/learning.webp` | Learning / quiz cards |

Medical-type events keep the matching insurance artwork (medical, accident, critical). No figures are baked into any image; amounts always come from the engine.

## Category icons

| Source | Decision | Output |
| --- | --- | --- |
| `income-icon`, `insurance-icon`, `investment-icon`, `savings-icon` | USE (trim, 160 px) | `icons/{income,protection,growth,savings}.webp` |
| `events-icon`, `expenses-icon` | MODIFY: a grey/white "transparency" checkerboard was painted into the pixels. Removed by growing the background region from the border; the object is untouched | `icons/{event,expense}.webp` |

The 3D icons stay readable down to about 40 px. Below that (HUD stats, buttons), the existing lucide line icons are kept, because the 3D icons turn to mush at 16–20 px.

## Scenes and environment

| Source | Decision | Notes |
| --- | --- | --- |
| `backgrounds/homepage-city.png` | MODIFY: 1672 and 960 px WebP | Homepage backdrop, under a sky-blue scrim on the text side so the title stays readable. Not used behind dense UI. |
| `backgrounds/monthly-results.png` | MODIFY: WebP | Backdrop band for the end-of-game results header only (a scrim keeps text contrast). |
| `backgrounds/card-tabletop.png` | REJECT | Props (plants, globe, books) are cut off at the edges, and it reads as a stock desk photo. The table look is done in CSS instead. |
| `environment/central-landmark.png` | RECREATE | Flat painting. It inspired the 3D civic hall (dome, clock, fountain plaza) in `board3d/City3D.tsx`. |
| `environment/city-assets-sheet.png` | RECREATE | Sprite sheet on a cream background, not cut-out sprites. It inspired the 3D buildings, lamps and trees. |

## Design references (`design-references/`, untracked)

16 images: 8 portrait UI mock-ups (Chinese copy), 6 character line-ups, 1 card spread and 1 homepage. They are used for direction only (never shipped or traced):
- deep blue sky gradient app background with cream rounded panels;
- one red primary call to action per screen; gold for rewards and highlights;
- choice cards with a coloured header band (title plus English sub-label), an illustration, one line of description and a large amount pill;
- a player strip of four avatars with net worth; the current player is highlighted;
- the board centred, with a red-shield landmark tower in the middle.
