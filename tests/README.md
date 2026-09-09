# Testing this game with Playwright

This folder holds the browser-automation test suite for the game, built on
[Playwright](https://playwright.dev/). This document explains how to run it,
how it's wired up, and — the main point — how to write your own tests once
you're comfortable with the basics in [`basic.spec.js`](./basic.spec.js).

If you've never used Playwright before, read this whole file once. It's
written to double as a short tutorial, not just a reference.

## What's here

```
package.json            devDependency on @playwright/test, plus npm scripts
playwright.config.js    Playwright's configuration (repo root)
tests/
  server.js             tiny static file server, used only to serve the game during tests
  basic.spec.js          the starter test suite — read this first
  README.md             this file
TESTING_CHECKLIST.md    (repo root) the master list of everything worth testing
```

None of this affects the deployed game. `package.json` and `node_modules/`
exist purely for the test tooling — the site itself is still zero-dependency
static HTML/CSS/JS, served as-is by GitHub Pages (see `.github/workflows/deploy.yml`).
`node_modules/` and Playwright's own output folders are already in `.gitignore`.

## Running the tests

One-time setup:

```bash
npm install
npx playwright install        # downloads the actual browser binaries
```

Then:

```bash
npm test                      # run everything, headless, all 3 browsers
npm run test:headed           # same, but watch it happen in a real window
npm run test:ui               # Playwright's interactive UI mode — the best way to learn
npm run test:debug            # step through a test line by line with the inspector
npx playwright test --project=chromium          # just one browser, faster while iterating
npx playwright test tests/basic.spec.js -g save # run tests whose name matches "save"
npm run test:report           # open the last HTML report (screenshots of any failures)
```

`test:ui` is worth trying first — it lets you click through each test, see
the browser state at every step, and re-run a single test in a couple of
seconds. It's the fastest way to get a feel for how Playwright "sees" the
page.

## How the pieces fit together

1. **`playwright.config.js`** tells Playwright where the tests live
   (`testDir: './tests'`), and — importantly — defines a `webServer`: before
   the suite runs, Playwright runs `node tests/server.js` and waits for it to
   respond, then points every test's `page.goto('/')` at it via `baseURL`.
   You never need to start a server yourself.

2. **`tests/server.js`** is a ~40-line static file server with zero
   dependencies. It exists only because the game loads its code as ES
   modules (`<script type="module" src="./js/main.js">` in `index.html`),
   and browsers refuse to load modules from a `file://` URL — the page has
   to be served over `http://`. This is the same requirement described in
   the main `README.md`'s "Running locally" section; this file is just a
   dependency-free stand-in for `npx serve` so the test suite doesn't need
   network access or a globally-installed tool to run.

3. **`tests/basic.spec.js`** is the actual tests, run by the `@playwright/test`
   test runner (`test()` / `expect()`, imported from `@playwright/test`).

## The one thing that makes this project's tests unusual

Almost everything in this game renders to a single `<canvas id="screen">`
(see `js/main.js`). There's no health-bar `<div>`, no `<ul>` of party
Pokémon, no inventory table in the DOM — Playwright can inspect the *DOM*
extremely well, but a `<canvas>` is, as far as the DOM is concerned, one
opaque rectangle. `page.locator('#screen')` can tell you the canvas exists
and is 240×160, but not what's drawn on it.

That shapes what "basic" tests can check right now:

- The static page shell around the canvas (boot screen, start button,
  on-screen d-pad, title, canvas element/attributes).
- `localStorage` — save/load behavior, since that's plain JSON outside the
  canvas.
- That the game doesn't throw errors in response to input, navigation, or a
  corrupted save — i.e., "did anything break", even without being able to
  assert "and the player's Y position is now 6".

**When you outgrow that** (and for a game like this, you will — the
checklist in `TESTING_CHECKLIST.md` has a lot that genuinely lives only
inside the canvas), you have two real options, roughly in order of effort:

- **Visual/screenshot testing.** Playwright can assert on rendered pixels:
  ```js
  await expect(page).toHaveScreenshot('overworld-start.png');
  ```
  The first run saves a baseline image; later runs fail if the render
  differs by more than a tiny pixel threshold. This is a genuinely good fit
  for a pixel-art game like this one — it's exactly how you'd catch "a
  sprite regressed" or "a tile atlas broke" without hand-writing pixel math.
  The catch: anything with a random or time-based element (e.g. wild
  encounter RNG, a title screen animation) needs to be paused, seeded, or
  frozen first, or the screenshot will be flaky. Run
  `npx playwright test --update-snapshots` once you're happy with a shot to
  save it as the new baseline; commit the resulting `.png` alongside the
  test.

- **Expose a small test hook from the game itself.** Right now `js/main.js`
  keeps its `game` object private to the module (`export { game }` only
  makes it importable by other *modules*, not reachable from a test running
  in the page). If you added one line — something like
  `if (new URLSearchParams(location.search).has('test')) window.__game = game;`
  — a test could then do:
  ```js
  await page.goto('/?test=1');
  await page.click('#start-btn');
  const playerPos = await page.evaluate(() => window.__game.world.state.player);
  expect(playerPos.map).toBe('littleroot');
  ```
  This is the standard way real teams add testability to canvas/WebGL
  games without touching gameplay code, and it's the natural next step once
  you want tests that assert on things like HP, party contents, or map
  position directly instead of inferring them from pixels. Gate it behind a
  query param or a build flag so it never ships to real players.

Both are optional — everything in `basic.spec.js` today deliberately avoids
needing either, so you have a working suite from minute one.

## Writing your own tests: a short guide

Playwright's core mental model is:

1. **`page.goto(url)`** — navigate somewhere. `'/'` resolves against the
   `baseURL` in the config.
2. **Find something** with `page.locator(selector)`. This is *lazy* — it
   doesn't query the DOM yet, it just remembers how to find it later. Prefer
   selectors a real user would recognize: `#some-id`, `[data-key="a"]`,
   `text=Press to Start`. Playwright also has semantic locators like
   `page.getByRole('button', { name: 'Start' })` which are worth reaching
   for if you add more real buttons/links to the page later.
3. **Do something**: `.click()`, `page.keyboard.press('ArrowUp')`,
   `page.keyboard.down('KeyB')` / `.up('KeyB')` for held keys, `.fill()` for
   text inputs, `.tap()` for touch.
4. **Assert something** with `expect(locator).toBeVisible()`,
   `.toHaveText()`, `.toHaveAttribute()`, `.toHaveCount()`, etc., or
   `expect(page).toHaveTitle()/toHaveURL()` for page-level checks. Every
   `expect(locator)...` assertion **auto-retries** for a few seconds before
   failing — this is why Playwright tests rarely need manual
   `sleep`/`wait` calls. Reach for `page.waitForTimeout()` (a plain sleep)
   only as a last resort, e.g. to let a few `requestAnimationFrame` ticks
   run before checking "did this throw".

A minimal new test looks like:

```js
test('pressing Escape after starting does not throw', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.click('#start-btn');
  await page.keyboard.press('Escape'); // opens the start menu, per input.js
  await page.waitForTimeout(200);

  expect(errors).toEqual([]);
});
```

Some patterns specific to this game, worth reusing:

- **Seeding a save file before load**: use `page.addInitScript(fn, arg)`, not
  `page.evaluate()` after `page.goto()`. `addInitScript` runs before *any* of
  the page's own scripts on every navigation in that test, which matters
  because `hasSave()`/`loadGame()` (in `js/engine/save.js`) run from the
  start-button click handler — by the time a normal `page.evaluate()` after
  `goto()` could set `localStorage`, it can already be too late depending on
  what you're testing. `basic.spec.js`'s "saving" tests are a template for
  this.
- **Anything gated on a user gesture** (starting audio, entering
  fullscreen): always drive it with a real Playwright action
  (`.click()`, `.press()`, `.tap()`), never `page.evaluate(() => el.click())`.
  Browsers distinguish a synthetic in-page call from a real trusted input
  event, and gesture-gated APIs like `AudioContext` will silently stay
  suspended for the former.
- **Catching regressions, not just crashes**: `page.on('pageerror', ...)`
  catches uncaught exceptions; `page.on('console', msg => msg.type() ===
  'error')` also catches `console.error()` calls that don't throw. Both are
  used in `basic.spec.js` — reuse the same pattern for new tests rather than
  reinventing it.
- **Isolation is automatic**: each `test()` gets a brand-new browser context
  (fresh `localStorage`, cookies, etc.), so you never need to reset game
  state between tests yourself, and tests can safely run in parallel
  (`fullyParallel: true` in the config).

## Where to go next

`TESTING_CHECKLIST.md` at the repo root lists everything about the game
that's worth verifying, organized by system (movement, battles, catching,
saving, audio, and so on), independent of *how* it gets tested — some items
are natural Playwright tests, some are closer to unit tests of pure
functions (e.g. the damage formula in `js/engine/battle.js`), and some are
realistically manual/exploratory testing for a while yet. Use it as a
checklist to work through, not something you need to automate all at once.
