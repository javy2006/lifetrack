# Audio credits and licences

Every sound LifeTrack plays is stored locally in `public/audio/` (nothing is hotlinked) as a small mono MP3
(96 kbps; the optional ambience loop is 64 kbps). Total size is about 190 KB; only the essential effects are
fetched, after the player's first interaction, and the ambience loop is fetched only if music is switched on.
The game is fully playable with sound off or if any file fails to load.

## Third-party sounds: Kenney (CC0)

| Pack | Author | Source | Licence |
|---|---|---|---|
| Casino Audio 1.1 | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/casino-audio | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| Interface Sounds | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/interface-sounds | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |

CC0 dedicates the work to the public domain: use in personal and commercial projects and redistribution in
a game are permitted, and attribution is not required. We credit Kenney here anyway. The licence text
shipped in each pack ("You may use these assets in personal and commercial projects. Credit ... would be
nice but is not mandatory.") was checked when the packs were downloaded (24 November 2026).

Clips were trimmed, peak-normalised, given a short fade-out and re-encoded; no other changes.

| LifeTrack file | Used for | Source clip |
|---|---|---|
| `dice-shake.mp3` | dice shake / tumble | Casino Audio `dice-shake-1.ogg` |
| `dice-land.mp3` | die lands, result shown | Casino Audio `die-throw-1.ogg` |
| `step-1.mp3`, `step-2.mp3`, `step-3.mp3` | token hops between spaces (random variation) | Casino Audio `chip-lay-1/2/3.ogg` |
| `land.mp3` | token lands on its space | Casino Audio `chips-collide-1.ogg` |
| `coins.mp3` | monthly income collected | Casino Audio `chips-handle-3.ogg` |
| `pay.mp3` | bills and premiums paid | Casino Audio `chips-stack-2.ogg` |
| `save.mp3` | money moved to emergency savings | Casino Audio `chips-stack-4.ogg` |
| `card.mp3` | decision card appears | Casino Audio `card-place-1.ogg` |
| `event.mp3` | life event card revealed | Casino Audio `card-slide-3.ogg` |
| `month.mp3` | month recap | Casino Audio `card-fan-1.ogg` |
| `click.mp3` | general button press | Interface Sounds `click_002.ogg` |
| `select.mp3` | option picked | Interface Sounds `select_002.ogg` |
| `purchase.mp3` | insurance cover bought | Interface Sounds `confirmation_002.ogg` |
| `confirm.mp3` | moves confirmed | Interface Sounds `confirmation_001.ogg` |
| `claim.mp3` | insurance pays a benefit | Interface Sounds `confirmation_004.ogg` |
| `warning.mp3` | an uncovered cost is paid from your own money | Interface Sounds `error_004.ogg` |
| `quiz-correct.mp3` | correct quiz answer | Interface Sounds `confirmation_003.ogg` |
| `quiz-wrong.mp3` | incorrect quiz answer | Interface Sounds `error_006.ogg` |

## LifeTrack's own sounds

| File | Used for | Origin |
|---|---|---|
| `winner.mp3` | final results cue | generated for LifeTrack (no third-party material) |
| `lifetrack-ambience.mp3` | optional background ambience (off by default) | generated for LifeTrack (no third-party material) |

Fallback: if the dice, step or landing file cannot be loaded, a short Web Audio synthesised sound
(`src/lifetrack/components/synthSounds.ts`) is used instead.

## Rebuilding

The conversion script is `scripts/assets/build_audio.py` (needs `soundfile`, `numpy` and `lameenc`; run it on the
extracted packs). To change a
sound, download the Kenney pack from the URLs above, re-encode the clip to mono MP3 and keep this table up to date.
New files under `public/audio/` must stay plain git blobs, not LFS pointers (see `public/.gitattributes`).
