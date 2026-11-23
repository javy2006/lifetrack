# Audio credits and licences

Every sound LifeTrack plays is stored locally in `public/audio/` as MP3; nothing is hotlinked. The default music file is 0.94 MB (Cheery Monday); the 2.3 MB Sunshine backup is never requested unless it is switched in code. The music
streams only once the player has interacted with the page. The effects total about 220 KB, and only the
essential ones are fetched after the first interaction. The game is fully playable with sound off, or if
any file fails to load.

## Background music (CC BY 4.0, attribution required)

| File | Track | Role | Source | Licence |
|---|---|---|---|---|
| `music-cheery-monday.mp3` | "Cheery Monday", Kevin MacLeod | **Default background music** | incompetech.com catalogue (file `Cheery Monday.mp3`, ISRC USUAN1700065) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `music-sunshine.mp3` | "Sunshine", Kevin MacLeod | Backup only, never played by default | incompetech.com catalogue (file `Sunshine A.mp3`, ISRC USUAN1100517) | CC BY 4.0 |

**Required attribution.** It is shown in the game's sound settings panel and reproduced here:

> "Cheery Monday" by Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License. http://creativecommons.org/licenses/by/4.0/

If Sunshine is ever enabled, credit it the same way: "Sunshine" by Kevin MacLeod (incompetech.com),
CC BY 4.0. What was checked: both files were downloaded from incompetech.com's own royalty-free catalogue,
and incompetech states that its music is licensed under CC BY 4.0 (commercial use permitted with
attribution). Each track was trimmed at its loop point, level-matched to about −23 dBFS RMS and
re-encoded (stereo, 112 kbps). No other changes were made.

**Choice.** Cheery Monday was chosen by the product owner. Sunshine had been the developer's earlier pick,
based on publisher tags and measurements; the developer could not listen to either track.

**Seamless loop.** At 65.88 s Cheery Monday returns to its opening material (chroma similarity 0.974
against a 0.76 average, found by matching the first 6 s against the last 40 s). The file ends 1.2 s
after that point. `MusicPlayer.ts` starts a second element from the top exactly there and fades the first
out over one second, while both play the same notes.

Why two elements: MP3 in an `<audio loop>` leaves a small silent gap at each repeat in browsers (encoder
padding), and decoding the whole track into Web Audio costs tens of MB on phones. Only these two elements
ever exist. Both play only during the one-second hand-over, which is verified by `scripts/qa/audio.mjs`.

## Sound effects (Kenney, CC0)

| Pack | Author | Source | Licence |
|---|---|---|---|
| Casino Audio 1.1 | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/casino-audio | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| RPG Audio | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/rpg-audio | CC0 1.0 |
| Impact Sounds | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/impact-sounds | CC0 1.0 |
| Music Jingles | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/music-jingles | CC0 1.0 |
| Interface Sounds | Kenney Vleugels (Kenney.nl) | https://kenney.nl/assets/interface-sounds | CC0 1.0 |

CC0 dedicates the work to the public domain: commercial use and redistribution in a game are permitted,
and attribution is not required (credited here anyway). The licence file in each pack was checked when it
was downloaded (24 November 2026). Each clip was trimmed, peak-normalised for 100% default volume, given a
short fade-out and re-encoded (mono, 96 kbps).

| LifeTrack file(s) | Used for | Source clip(s) |
|---|---|---|
| `dice-shake-1..3` | dice shaken in the hand (random variation) | Casino Audio `dice-shake-1..3` |
| `dice-land-1..3` | die rolls, bounces and settles on the table | Casino Audio `die-throw-1..3` |
| `step-1..4` | wooden token hops from space to space | Impact Sounds `impactWood_light_000..003` |
| `land-1..2` | token placed on an ordinary space | Impact Sounds `impactWood_medium_000..001` |
| `land-key` | token placed on an important space (salary, cover, final checkpoint) | RPG Audio `bookPlace1` |
| `card-1..3` | decision card drawn | Casino Audio `card-slide-1..3` |
| `select-1..3` | option card placed (picked) | Casino Audio `card-place-1..3` |
| `confirm` | moves confirmed (cards pushed forward) | Casino Audio `card-shove-1` |
| `event` | life event card turned over | Casino Audio `card-fan-1` |
| `coins-1..2` | income received | RPG Audio `handleCoins`, `handleCoins2` |
| `pay` | bills and premiums paid from the purse | RPG Audio `handleSmallLeather` |
| `save-1..2` | money stacked into savings | Casino Audio `chips-stack-4..5` |
| `purchase` | insurance cover bought (policy folder closed) | RPG Audio `bookClose` |
| `warning` | an uncovered cost paid from your own money | RPG Audio `dropLeather` |
| `claim` | insurance pays a benefit | Music Jingles `jingles_PIZZI16` (rising) |
| `month` | month recap (milestone) | Music Jingles `jingles_PIZZI15` (rising) |
| `winner` | final results, you finished first | Music Jingles `jingles_PIZZI02` (largest rise) |
| `results` | final results, another player finished first | Music Jingles `jingles_PIZZI10` (gentle rise) |
| `quiz-correct` / `quiz-wrong` | quiz answer | Music Jingles `jingles_PIZZI04` (rising) / `jingles_PIZZI09` (gentle fall) |
| `click` | general button press (quiet) | Interface Sounds `click_002` |

The jingles were classified by measured pitch contour (start versus end of the melody), since the pack
does not label their mood. Only rising, resolving jingles are used for positive moments. Music dips briefly
under each jingle.

Fallback: if the dice, step or landing file cannot be loaded, a short Web Audio synthesised sound
(`src/lifetrack/components/synthSounds.ts`) is used instead. It is generated in code, not recorded.

## Defaults and behaviour

- Music and effects are on at 100% for a first visit. Changes are saved (`lifetrack.audio.v3`) and kept
  across language changes, reloads and resumed games.
- Nothing plays before the first click, tap or key press. The music then fades in. If the browser refuses
  playback, the next interaction retries; the sound button shows a waiting state meanwhile.
- One music instance continues across all screens without restarting. It fades out and pauses while the
  tab is hidden, and fades back in when the tab is visible again.

## Rebuilding

`scripts/assets/build_audio.py <kenney-extract-root> <music-dir> public/audio` rebuilds every file (it
needs `soundfile`, `numpy` and `lameenc`). Download the packs and the track from the URLs above, and keep
this table up to date. Files under `public/audio/` must stay plain git blobs, not LFS pointers (see
`public/.gitattributes`).
