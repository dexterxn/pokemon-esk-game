# Pokémon Emerald — Fan Clone

A top-down, tile-based Pokémon-style adventure that runs entirely in the browser.
No build step, no dependencies, no image or audio files — every sprite, tile and
note is generated at runtime from code.

**Play:** https://dexterxn.github.io/pokemon-esk-game/

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys or `W` `A` `S` `D` |
| A — confirm, talk, interact | `Z` · `Space` · `Enter` |
| B — cancel, hold to run | `X` · `Backspace` · `Shift` |
| Start menu | `Esc` · `Tab` |
| Mute | `M` |
| Fullscreen | `F` |

Touch controls appear automatically on phones and tablets.

## What's in it

- **Overworld** — Littleroot Town, Route 101, Oldale Town, Route 102 and
  Petalburg City, plus house, lab, Poké Center, Poké Mart and Gym interiors.
  Grid movement with smooth interpolation, ledge hops, warps and a clamped camera.
- **Wild encounters** — step into tall grass and you may be ambushed. Each route
  has its own weighted encounter table and level range.
- **Battles** — turn-based, with the Gen-3 damage formula, a full 17-type
  effectiveness chart, STAB, criticals, accuracy/evasion stages, multi-hit and
  draining moves, and six status conditions (burn, poison, paralysis, sleep,
  freeze, confusion) plus flinch and Leech Seed.
- **Catching** — the Gen-3 capture formula, so a weakened or statused target
  really is easier to catch, and better Balls really do help.
- **Progression** — experience, level-ups, learning moves, evolution, a 26-entry
  Pokédex, party of six with PC overflow, a bag, money, a shop and a Gym badge.
- **Trainers** — line-of-sight spotting with the `!` mark, multi-Pokémon parties,
  prize money, and a Gym Leader at the end of the road.
- **Saving** — `SAVE` from the start menu writes to `localStorage`, and the game
  autosaves when you leave the tab. Blacking out returns you to the last
  Pokémon Center you visited.
- **Portable save files** — `EXPORT` in the start menu (or the *Download save
  file* button under the game) downloads your progress as a `.txt` file. Use
  *Load save file…* on any other machine to pick up where you left off.
- **Party order** — in the `POKéMON` menu, press A on a Pokémon and choose
  `SWITCH` to move it to another slot. The first healthy Pokémon leads in battle.

## How it works

The tech is deliberately plain: **vanilla JavaScript ES modules + HTML/CSS**,
rendered to a single 240×160 `<canvas>` (the GBA's resolution) scaled up with
nearest-neighbour filtering. There is no bundler, so the repository *is* the
site — GitHub Pages serves these files directly.

```
index.html            page shell, canvas, on-screen d-pad
styles.css            page chrome around the canvas
js/
  main.js             boot, game loop, world <-> battle handoff
  core/               input mapping, WebAudio chiptune engine, small helpers
  data/               species, moves, types, items, map layouts
  engine/             game state, save/load, Pokémon maths, battle, overworld, menus
  render/             bitmap font, tile atlas, character atlas, sprite rasteriser, UI
```

A few things worth calling out:

- **Sprites are vectors, rasterised.** Each species is a short list of ellipses,
  rectangles and polygons in `data/species.js`. `render/sprites.js` draws them
  into a 32×32 buffer, snaps anti-aliased edges to hard pixels, then walks the
  alpha mask to add a 1px outline. Shapes flagged as face details are dropped to
  produce the back sprite, so one description gives both views.
- **Maps are text.** Every map in `data/maps.js` is an array of equal-length
  strings, one character per tile, which makes them easy to read and edit. Rows
  are padded to a common width at load so a miscount degrades into a wall rather
  than breaking collision.
- **The font is a bitmap.** `render/font.js` holds a hand-authored 5×7 glyph set
  written as binary strings, drawn with run-length `fillRect` calls.
- **The music is synthesised.** `core/audio.js` parses short `"note:beats"`
  strings into scheduled WebAudio oscillators, with a separate bus for one-shot
  sound effects.

## Running locally

Because it uses ES modules, open it through a web server rather than
double-clicking the file:

```bash
# any static server works
npx serve .
# or
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Testing

The game itself has no dependencies, but there's a [Playwright](https://playwright.dev/)
test suite under [`tests/`](./tests) for automated regression testing (`npm install && npx playwright install && npm test`).
See [`tests/README.md`](./tests/README.md) for how it's wired up and how to write
your own tests, and [`TESTING_CHECKLIST.md`](./TESTING_CHECKLIST.md) for a
comprehensive, system-by-system list of everything worth verifying.

## Deployment

`.github/workflows/deploy.yml` publishes the repository root to GitHub Pages on
every push to `main`. It enables Pages automatically on the first run, so no
manual settings change is required.

## Notes

This is a non-commercial fan project made for learning. Pokémon and the names of
the creatures that appear here are trademarks of Nintendo / Creatures Inc. /
GAME FREAK Inc. All artwork and code in this repository are original: no assets
from any official game are used, copied or redistributed.
