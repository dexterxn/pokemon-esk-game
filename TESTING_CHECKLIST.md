# Testing checklist

This is the master list of everything worth verifying to be confident the
game is bug-free, organized by system. It's written from a read-through of
the actual code (`js/engine/*`, `js/data/*`, `js/render/*`, `js/core/*`), so
each item points at something real, not a generic "test your app" template.

This is a **checklist to work through, not a to-do list to automate all at
once**. Some items are natural fits for the Playwright suite in `tests/`;
some are better as plain unit tests of a pure function (no browser needed);
some are realistically manual/exploratory testing for a while. Each section
notes which. See `tests/README.md` for how the automated side is set up, and
for how to expose more of the game to Playwright as you go (canvas
screenshots, or a `window.__game` test hook).

Check items off (`[x]`) as you cover them, and feel free to add rows —
this is meant to grow with the game.

---

## 1. Boot & page shell

*Fits: Playwright (mostly covered already in `tests/basic.spec.js`).*

- [x] Page loads with correct `<title>`, canvas present at 240×160
- [x] Boot overlay (`#boot`) is visible before start, hidden after clicking Start
- [x] On-screen d-pad renders all 7 `data-key` buttons (`up/down/left/right/a/b/start`)
- [x] No console errors / uncaught exceptions on load
- [ ] Page works with no `localStorage` access at all (private browsing /
      storage blocked) — `save.js` wraps calls in try/catch; confirm the game
      still boots and just can't save
- [ ] Page works if `AudioContext` is unavailable (older browser, or a
      permissions policy blocking it) — `audio.unlock()` guards with
      `window.AudioContext || window.webkitAudioContext`, confirm no crash
- [ ] Re-loading the page mid-game does not corrupt anything (no autosave
      happens on reload, only on `visibilitychange` → hidden; confirm that's
      actually true and acceptable)
- [ ] Resizing the browser window / rotating a mobile device keeps the canvas
      correctly scaled and centered (see `styles.css`)
- [ ] Touch on-screen controls appear on phones/tablets and are hidden (or at
      least not obstructive) on desktop — confirm the responsive breakpoint

## 2. Input handling

*Fits: Playwright for "does it respond / does it throw"; manual for "does it feel right".*

- [ ] Every key in `KEY_MAP` (`js/core/input.js`) does what it should:
      Arrow keys + WASD move, `Z`/`Space`/`Enter`/`J` = A, `X`/`Backspace`/`Shift`/`K` = B, `Esc`/`Tab` = start menu
- [ ] Holding a movement key repeats movement smoothly (no stutter, no double-steps)
- [ ] `wasPressed` (edge-triggered) vs `isDown` (held) are used in the right
      places — e.g. confirm menu cursor moves once per press, not once per frame
- [ ] Pressing two opposite directions at once (e.g. Left+Right) doesn't
      produce broken movement (check `heldDirection()`'s priority order)
- [ ] Losing window focus mid-walk releases all held keys (`blur` → `clearAll()`
      in `input.js`) — walk into a wall's edge case: alt-tab while holding a
      direction, tab back, confirm the character isn't stuck "walking"
- [ ] On-screen touch buttons behave the same as their keyboard equivalents,
      including `pointercancel`/`pointerleave` correctly releasing the button
      (e.g. dragging a finger off a button mid-press)
- [ ] `M` toggles mute and gives feedback (toast); `F` toggles fullscreen
      — note: fullscreen requires a user gesture and may be denied by browser
      permission policy in some contexts (e.g. iframes, some headless
      environments); confirm the game doesn't break either way
- [ ] Rapid, repeated key mashing (start menu open/close, battle menu
      confirm/cancel) doesn't desync the UI or double-fire actions

## 3. Overworld movement & collision

*Fits: mostly manual/exploratory today; candidates for Playwright once a
`window.__game` test hook exists (see `tests/README.md`).*

- [ ] Player cannot walk through walls, buildings, water, or other solid tiles
      on any map (`js/data/maps.js` + collision logic in `world.js`)
- [ ] Player cannot walk through NPCs (`blocked()` / `npcAt()`), and colliding
      with one doesn't get the player stuck
- [ ] Ledges (`ledge === 'down'`) can only be hopped in their facing direction,
      never climbed the "wrong" way
- [ ] Grid movement interpolates smoothly frame-to-frame; no visible jitter or
      snapping at tile boundaries
- [ ] Camera clamps correctly at map edges (never shows out-of-bounds/empty space)
- [ ] Every warp tile (doors, map transitions) sends the player to the correct
      destination map, tile, and facing direction — spot-check each of:
      Littleroot Town, Route 101, Oldale Town, Route 102, Petalburg City, and
      every house/lab/Center/Mart/Gym interior
- [ ] Leaving a town onto a route while `blockRouteExit()` conditions apply
      shows the "Wild Pokémon live in the tall grass" warning at the right
      moment, and doesn't otherwise block legitimate exits
- [ ] Standing in tall grass triggers wild encounters at roughly the expected
      rate (`ENCOUNTER_RATE = 0.12`/step) — not more, not (near) never
- [ ] Wild encounters only trigger when the player has at least one living
      party member (`state.party.length > 0`) — confirm an empty party can't
      trigger a battle it can't fight
- [ ] NPC "wanderers" stay within their tether range and don't clip through
      obstacles while roaming
- [ ] Trainer line-of-sight detection (`checkTrainerSight`, the `!` spotting
      mark) triggers reliably at the right range/direction, and a trainer who
      has already been beaten (`beat:<npcId>` flag) never re-challenges
- [ ] Talking to an NPC always faces the player toward them first, then shows
      the correct dialogue/script (`heal`, shop, generic lines, or a battle
      trigger)

## 4. Wild encounters & the encounter tables

*Fits: unit tests (pure data/logic) + manual spot-checks.*

- [ ] Each route's encounter table (`js/data/maps.js`) only produces species
      and levels within its documented range
- [ ] Encounter tables are weighted as intended — over many samples, common
      species show up more often than rare ones (a statistical/unit test
      sampling the table function directly is a good fit here, no browser needed)
- [ ] A newly-encountered species is marked "seen" in the Pokédex even if the
      battle is fled/lost; only a successful catch marks it "caught"
      (`registerSeen` vs `registerCaught` in `state.js`)

## 5. Battle system

*Fits: heavily unit-testable — `computeDamage`, `catchAttempt`, `moveHits`,
etc. in `js/engine/pokemon.js` are pure functions that don't need a browser
or even Playwright; write them with a plain test runner (e.g. Node's
built-in `node:test`, or add Vitest) alongside the Playwright suite.*

- [ ] Damage formula (`computeDamage`) matches the intended Gen-3-style
      formula across a range of levels/stats — regression-test it with a
      table of known inputs → expected damage
- [ ] All 17 types' effectiveness (`js/data/types.js`) are correct in both
      directions (e.g. Water→Fire super effective, Fire→Water not very, and
      confirm the double-weakness/double-resistance cases like Ice→Dragon/Flying)
- [ ] STAB (same-type attack bonus) applies only when the attacker's type
      matches the move's type
- [ ] Critical hits use the correct rate and damage multiplier
- [ ] Accuracy/evasion stages (`stageMultiplier`, `accuracyMultiplier`,
      clamped to ±6) correctly raise/lower hit chance, and stages reset
      appropriately between battles
- [ ] Multi-hit moves (`move.multiHit`) hit the right number of times
      (2 for a fixed 2-hit move, 2–5 for a variable one) and report a single
      combined damage message
- [ ] Draining moves (`move.drain`) heal the attacker the correct fraction of
      damage dealt, and never over-heal past max HP
- [ ] Flinch (`move.flinch`) only prevents a move on the turn it's applied,
      and doesn't persist
- [ ] All six status conditions behave correctly and clear at the right time:
  - [ ] **Burn** — residual damage each turn; type-immune for Fire types
  - [ ] **Poison** — residual damage each turn; type-immune for Poison/Steel
  - [ ] **Paralysis** — ~25% chance to be fully unable to move; type-immune for Electric
  - [ ] **Sleep** — unable to move for 2–4 turns (`randInt(2,4)`), wakes up after
  - [ ] **Freeze** — unable to move until thawed; type-immune for Ice
  - [ ] **Confusion** — chance to hurt itself instead of executing the chosen move
- [ ] Leech Seed drains the seeded Pokémon (`stats.hp / 8` each turn) and
      heals the other side, and stops draining once the seeded Pokémon faints
      or switches out
- [ ] Struggle is only used when a Pokémon has no PP left on any move, deals
      the fixed 50-power typeless hit, and applies its recoil (25%) to the user
- [ ] Switching a Pokémon out happens *before* the opponent's attack that turn
      (per the comment in `battle.js`) — confirm turn order matches
- [ ] Replacing a fainted Pokémon does **not** hand the opponent a free attack
      (explicitly called out in a code comment — a good regression test target)
- [ ] Wild-battle AI move choice ("pick the move with the best expected
      outcome") doesn't get stuck or pick an obviously-losing move when a
      clearly better option exists
- [ ] Fainting a Pokémon plays the correct message/animation, and the game
      correctly requires picking a new Pokémon when one faints mid-battle
      (and correctly ends the battle in a loss when the whole party faints)
- [ ] Winning, losing, and running from a battle all return control to the
      overworld cleanly, with the world in the right state (see §7 for the
      loss/blackout case specifically)
- [ ] Items usable in battle (Poké Ball, Potion, status healers) apply the
      right effect and are correctly decremented from the bag
      (`item.cures === 'any'` vs a specific status — verify both paths)

## 6. Catching Pokémon

*Fits: unit-testable (`catchAttempt`, `escapeChance` are pure functions).*

- [ ] Catch rate (`catchAttempt`) increases correctly as target HP decreases
- [ ] Catch rate increases correctly when the target has a status condition
- [ ] Better Balls (higher `ballRate`) measurably improve catch odds over a
      basic Poké Ball, all else equal
- [ ] A caught Pokémon is added to the party if there's room, otherwise to the
      box/PC (`addToParty`'s party-vs-box branch) — test both paths explicitly
- [ ] Catching a Pokémon always marks it caught in the Pokédex
      (`registerCaught`), even if it was already "seen" before
- [ ] Attempting to catch a trainer's Pokémon is disallowed (if the game
      intends this — confirm current behavior either way and lock it in)

## 7. Progression: EXP, levels, evolution, moves

*Fits: unit-testable (`gainExp`, `expForLevel`, `evolveInto` are pure logic).*

- [ ] EXP gained after battle matches the intended yield formula
      (`expYield`), and differs correctly between wild and trainer battles
- [ ] Leveling up correctly recalculates stats (`refreshStats`/`calcStats`)
      and heals/adjusts current HP proportionally rather than clamping oddly
- [ ] A Pokémon that levels up multiple times from one large EXP gain (e.g.
      defeating a much higher-level trainer's Pokémon) processes *every*
      intermediate level-up correctly, not just jumping to the final level
- [ ] Moves learned at specific levels (`movesAtLevel`) are actually offered
      when that level is reached, including when a multi-level jump crosses
      more than one move-learn threshold in a single gain
- [ ] A full move set (4 moves) handles learning a new move correctly —
      confirm there's a sensible flow (replace/forget/skip) rather than a crash
- [ ] Evolution (`evolveInto`) triggers at the correct level/condition per
      species, updates the sprite, stats, and species-dependent data
      correctly, and the "What? X is evolving!" / "Congratulations!" messages
      in `main.js`'s `finishBattle` fire for every evolution in a multi-evolution battle
- [ ] The Pokédex "seen" and "caught" counts (`dexSeenCount`/`dexCaughtCount`)
      stay accurate through catching, evolving, and trading (if applicable)

## 8. Party, box (PC), and bag management

*Fits: Playwright once menu screens are reachable in a test flow; some logic is unit-testable directly.*

- [ ] Party never exceeds `MAX_PARTY` (6); the 7th Pokémon correctly overflows
      to the box instead
- [ ] `PartyScreen` navigation (cursor movement, selecting a Pokémon) works
      with both keyboard and touch input
- [ ] The summary screen (`drawSummary`) shows accurate, current stats — not
      stale data after a level-up or stat-stage change within the same session
- [ ] `BagScreen` correctly lists only items with count > 0
      (`bagEntries` filters `n > 0`) and updates immediately after use
- [ ] Using a consumable item decrements its count correctly and removes it
      from the bag entirely at 0 (`removeItem`'s `delete state.bag[id]` branch)
- [ ] `DexScreen` correctly distinguishes seen-but-not-caught vs caught entries
- [ ] `ShopScreen` purchases correctly deduct money (`spendMoney` refuses a
      purchase the player can't afford — confirm the refusal path shows
      correct feedback, not a silent no-op) and add the item to the bag
- [ ] Money never goes negative and is capped correctly at the top end
      (`earnMoney` clamps to `999999`) — try to overflow it and confirm the clamp holds
- [ ] Trainer card (`drawTrainerCard`) shows the correct, live play time
      (`formatPlayTime`) and badge count

## 9. Trainers & the Gym Leader

*Fits: manual/exploratory, plus a couple of good Playwright end-to-end candidates.*

- [ ] Every trainer's party, prize money, and pre-/post-battle dialogue match
      their definition in the map data
- [ ] Prize money is awarded exactly once per trainer, and never again after
      the `beat:<npcId>` flag is set
- [ ] A trainer with multiple Pokémon correctly sends out the next one when
      the current one faints, without ending the battle early
- [ ] The Gym Leader awards a badge (`awardBadge`) on defeat, the badge
      appears on the trainer card, and `hasBadge()` correctly gates anything
      that depends on it (e.g. an obedience check, a locked door, HM use — if
      any exist)
- [ ] The badge/beat-trainer flags persist correctly through save/load (see §10)

## 10. Saving & loading

*Fits: Playwright — this is one of the best-covered areas already, see
`tests/basic.spec.js`'s "saving" tests as a template for more.*

- [x] A fresh profile has no save file
- [x] A valid save file loads without errors and the boot flow completes
- [x] A corrupted save file (`{not valid json`) is handled gracefully, without
      crashing the game
- [ ] `SAVE` from the start menu actually calls `saveGame()` and gives the
      player feedback (the `save` sound effect, a message) that it worked
- [ ] Every field `saveGame()` writes (`player`, `party`, `box`, `bag`, `dex`,
      `flags`, `lastCenter`) round-trips correctly through `loadGame()` —
      write a save, reload, confirm each field matches exactly, including
      nested Pokémon objects (stats, moves, EXP, status) in the party/box
  - [ ] Also test intentionally sparse/undefined fields on old or hand-edited
        saves (e.g. missing `bag` or `dex`) — confirm the game's `|| {}` /
        `|| []` fallbacks are exhaustive and every corresponding property is
        covered, not just the ones currently in the schema
- [ ] A save with an unrecognized `version` (not `1`) is rejected rather than
      partially applied (`loadGame`'s `data.version !== 1` check)
- [ ] Autosave-on-tab-hide (`visibilitychange` → `hidden`) only fires once the
      player has a starter (`hasFlag('gotStarter')`) — confirm hiding the tab
      *before* getting a starter does not save an empty/broken game state
- [ ] Autosave-on-tab-hide correctly captures the *current* state at the
      moment of hiding, not a stale snapshot from a previous point in the session
- [ ] Losing a battle (blackout) correctly heals the party, sends the player
      to `state.lastCenter` (or the Littleroot starting point as a fallback if
      no Center has been visited yet), and this new position is what actually
      gets saved afterward — not the pre-blackout position
- [ ] `deleteSave()` (if exposed anywhere in the UI) actually clears the save
      and a fresh load afterward behaves like a brand-new game

## 11. Audio

*Fits: mostly manual (it's audible, not assertable via the DOM); a couple of
crash/behavior checks fit Playwright fine.*

- [ ] `audio.unlock()` only runs from a genuine user gesture and doesn't throw
      if `AudioContext` is unsupported
- [ ] Music track selection matches location: town music in towns, route
      music on routes, battle music in battles, gym music in the Gym, indoor
      music in buildings, and the one-shot heal jingle in the Pokémon Center
- [ ] Switching areas/scenes swaps the track cleanly — no overlapping tracks,
      no gap that sounds like a freeze, no click/pop at the transition
      (`stop()`'s gain ramp-down is meant to prevent exactly this)
- [ ] Every SFX (`select`, `cancel`, `bump`, `hit`, `super`, `faint`, `ball`,
      `caught`, `levelup`, `save`, `encounter`) fires at the correct moment
      and sounds distinct from the others
- [ ] Mute (`M` / `toggleMute()`) silences both music and SFX immediately, and
      un-muting restores the previous volume rather than a different one
- [ ] Rapidly re-triggering the same SFX (e.g. mashing the confirm button)
      doesn't cause audio glitches, growing latency, or a pile-up of
      overlapping oscillator nodes (`voices` array — confirm finished
      oscillators are actually cleaned up via `onended`, i.e. no slow memory
      leak over a long play session)
- [ ] Backgrounding the tab / device going to sleep and resuming doesn't leave
      music silently "stuck" (suspended `AudioContext` that never resumes)

## 12. Rendering

*Fits: manual visual inspection first; screenshot testing (see
`tests/README.md`) is the natural long-term fit for most of this section.*

- [ ] Canvas renders crisp, unblurred pixel art at every zoom level
      (`imageSmoothingEnabled = false`, nearest-neighbor upscaling via CSS)
- [ ] Every generated sprite (`js/data/species.js` shape lists →
      `render/sprites.js`) rasterizes cleanly with a correct 1px outline and
      no stray anti-aliasing artifacts
- [ ] Back sprites (face-detail shapes dropped) look correct and distinct
      from front sprites for every species
- [ ] The bitmap font (`render/font.js`) renders every character used in the
      game's actual text without missing/garbled glyphs — a good candidate
      for a unit test that checks every string in `js/data/*` and any battle
      message templates only uses characters the font actually defines
- [ ] Tile atlas (`render/tiles.js`) renders every tile type used across all
      maps without a missing/blank tile
- [ ] Sprite depth-sorting ("depth-sort everyone by tile row") looks correct
      when multiple characters overlap vertically
- [ ] Tall grass correctly draws over the lower half of a Pokémon/character
      standing in it, not the other way around
- [ ] Full-screen menus (shop, trainer card, etc.) render on top of the map
      correctly and don't leave rendering artifacts when closed
- [ ] Fullscreen mode (`F`) scales/letterboxes the canvas correctly on
      various screen aspect ratios

## 13. Performance & stability

*Fits: Playwright can help with some of this (long-running sessions,
`page.metrics()` if using the CDP session); otherwise manual/profiling.*

- [ ] Frame rate stays smooth (target ~60fps) during normal play, in battle,
      and with several NPCs on-screen
- [ ] A long play session (tens of minutes) doesn't show memory growth from
      leaked audio nodes, event listeners, or accumulated game-state objects
- [ ] `dt` clamping (`Math.min(0.1, ...)` in `main.js`'s frame loop) correctly
      prevents a big physics/logic jump after the tab was backgrounded for a
      while and comes back
- [ ] No unhandled promise rejections (e.g. `requestFullscreen()` being
      denied) show up as console noise during normal play

## 14. Cross-browser & cross-device

*Fits: Playwright — the config already runs Chromium, Firefox, and WebKit;
make sure all three (plus real mobile devices) actually get exercised regularly.*

- [ ] Full playthrough works in Chromium, Firefox, and WebKit
      (`npx playwright test` runs all three by default)
- [ ] Touch controls work correctly on a real iOS and a real Android device,
      not just desktop devtools' touch emulation
- [ ] Keyboard-only play works with no mouse/touch at all
- [ ] The game is usable at common phone/tablet/desktop viewport sizes
      without layout breakage

## 15. Deployment

*Fits: manual, per-deploy — see the repo's own deploy troubleshooting.*

- [ ] The GitHub Actions workflow (`.github/workflows/deploy.yml`) succeeds on
      every push to `main`
- [ ] The live GitHub Pages URL actually serves the latest deployed commit
      (not a stale cached version — check `index.html`'s content or a version
      marker against the latest commit hash)
- [ ] All asset paths resolve correctly relative to the Pages URL (this repo
      has no build step, so this should Just Work, but worth confirming after
      any path/structure change — GitHub Pages is case-sensitive in a way a
      local Windows filesystem is not, which has bitten this project before)
- [ ] A hard-refresh (bypassing cache) on the live site shows the same
      behavior as local testing

---

## Suggested next steps

1. Work through **§5–§7 and §10** first — they're pure-function-friendly
   (unit tests, no browser) and cover the most bug-prone logic (damage
   formula, catch rate, EXP/leveling, save round-tripping).
2. Add the `window.__game` test hook described in `tests/README.md` once
   you're ready to write Playwright tests for §3, §4, §8, and §9 — those
   need to inspect real game state (player position, party contents, battle
   outcome) that today only lives inside the canvas.
3. Treat §11, §12, and §14 as an ongoing manual pass before each release,
   until/unless screenshot testing or audio-analysis tooling gets added.
