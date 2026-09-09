// -----------------------------------------------------------------------------
// BASIC PLAYWRIGHT TESTS — Pokémon-esque browser game
// -----------------------------------------------------------------------------
// This file is meant to be read top to bottom as a tutorial, not just run.
// Every test below exercises something real about the game, but the comments
// are written to explain *how Playwright works*, not just what this game does.
// See tests/README.md for the bigger picture (how to run these, how the test
// server works, and a guide to writing your own).
//
// A quick note on why these tests look the way they do: the entire game
// renders itself onto a single <canvas> element (see js/main.js). There is no
// game-state in the DOM to query — no health bar <div>, no inventory list —
// so Playwright can't "read" most of what's happening in-game the way it
// could with a normal web app. These tests focus on the things that ARE
// observable from outside the canvas: the DOM shell around it, localStorage,
// and whether the page throws errors. tests/README.md explains how to get
// deeper coverage later (canvas screenshots, or exposing a test hook).
// -----------------------------------------------------------------------------

import { test, expect } from '@playwright/test';

// The localStorage key the game saves to. Kept in one place here so it's
// obvious this is coupled to js/engine/save.js — if that key ever changes,
// this constant (and the tests that use it) need to change with it.
const SAVE_KEY = 'pokemon-esk-game.save.v1';

test.describe('page shell', () => {
  test('loads with the right title, canvas, and boot screen', async ({ page }) => {
    // page.goto uses the baseURL from playwright.config.js, so this hits
    // whatever tests/server.js is serving at http://localhost:4173/.
    await page.goto('/');

    // `expect(page)` (as opposed to `expect(locator)`) asserts on page-level
    // things like title and URL.
    await expect(page).toHaveTitle(/Pokémon Emerald/);

    // `page.locator(selector)` doesn't fetch anything itself — it's a lazy
    // reference. The actual DOM query happens when you await an assertion
    // or action on it, and Playwright auto-retries that query for a few
    // seconds until it passes or times out. That's what makes Playwright
    // tests resistant to timing flakiness without manual waits/sleeps.
    const canvas = page.locator('#screen');
    await expect(canvas).toBeVisible();

    // The game is hard-coded to the GBA's resolution (see js/main.js) and
    // scaled up with CSS — asserting the *attributes* pins down the actual
    // render resolution, independent of however large it appears on screen.
    await expect(canvas).toHaveAttribute('width', '240');
    await expect(canvas).toHaveAttribute('height', '160');

    // The boot overlay ("Press to Start") should cover the screen before
    // the player has interacted with the page at all.
    await expect(page.locator('#boot')).toBeVisible();
    await expect(page.locator('#start-btn')).toHaveText(/Press to Start/i);
  });

  test('renders the on-screen d-pad with the buttons the input system expects', async ({ page }) => {
    await page.goto('/');

    // js/core/input.js maps each `data-key` attribute to a logical button.
    // This test doesn't press them yet (that comes later) — it just checks
    // the control surface itself matches what the input mapper is coded to
    // look for. If someone renamed a data-key in index.html without
    // updating input.js, on-screen touch controls would silently stop
    // working — this test exists to catch exactly that class of bug.
    const expectedKeys = ['up', 'down', 'left', 'right', 'a', 'b', 'start'];
    for (const key of expectedKeys) {
      await expect(page.locator(`[data-key="${key}"]`)).toHaveCount(1);
    }
  });

  test('has no accessibility-breaking console errors on load', async ({ page }) => {
    // Collect every console message the page prints. This array fills up
    // as page.goto() runs, because the listener is attached first.
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // pageerror fires for *uncaught* exceptions — different from a
    // console.error() call, and worth catching separately.
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Give any deferred module-loading errors a moment to surface.
    await page.waitForTimeout(250);

    expect(errors).toEqual([]);
  });
});

test.describe('starting the game', () => {
  test('clicking "Press to Start" hides the boot screen', async ({ page }) => {
    await page.goto('/');

    // `.click()` simulates a real user gesture (mousedown+mouseup), which
    // matters here: js/main.js calls audio.unlock() from this handler, and
    // browsers refuse to start a WebAudio context without one. A
    // synthetic page.evaluate(() => btn.click()) would NOT satisfy that —
    // always prefer real Playwright actions (click/press/tap) over
    // page.evaluate when a user-gesture requirement is involved.
    await page.click('#start-btn');

    // #boot.hidden { display: none } — see styles.css. toBeHidden() treats
    // display:none (and a few other cases) as "not visible" automatically.
    await expect(page.locator('#boot')).toBeHidden();

    // NOTE: js/main.js also calls canvas.focus() here, but the <canvas> in
    // index.html has no `tabindex` attribute, so that call is currently a
    // no-op — browsers only let .focus() land on elements that are
    // focusable by default (links, buttons, inputs...) or explicitly made
    // focusable via tabindex. It happens to be harmless: js/core/input.js
    // attaches its keydown/keyup listeners to `window`, not the canvas, so
    // gameplay input doesn't actually depend on the canvas holding focus
    // (the "arrow keys ... do not throw" test below confirms input still
    // works). This is exactly the kind of small, easy-to-miss discrepancy
    // that writing a test tends to surface — worth knowing about even
    // though there's nothing to fix for gameplay to work correctly.
  });

  test('arrow keys and WASD do not throw once the game has started', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.click('#start-btn');

    // page.keyboard sends real KeyboardEvents to whatever has focus — this
    // is the same input path a player's physical keyboard would take,
    // exercising js/core/input.js's `keydown`/`keyup` listeners for real,
    // unlike calling a game function directly from page.evaluate().
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']) {
      await page.keyboard.press(key);
    }

    // Let a few animation frames run so any exception inside the game loop
    // (js/main.js's frame()) has a chance to actually fire.
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    // The game should still be running, not stuck back on the boot screen
    // (e.g. from an uncaught exception unwinding back to an early return).
    await expect(page.locator('#boot')).toBeHidden();
  });
});

test.describe('saving', () => {
  test('a fresh browser profile has no save file', async ({ page }) => {
    await page.goto('/');

    // Every Playwright test gets an isolated browser context (think: a
    // fresh incognito profile) by default, so there's no localStorage
    // bleed-over between tests or test files — you never need to clear it
    // yourself between tests in this suite.
    const saved = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    expect(saved).toBeNull();
  });

  test('a valid save file in localStorage is picked up on boot without errors', async ({ page }) => {
    // This seeds localStorage with a minimal payload shaped like the one
    // js/engine/save.js writes (see saveGame()), to test the *loading*
    // path (loadGame()) in isolation without having to play through the
    // game first to produce a real save.
    //
    // IMPORTANT: page.addInitScript runs before any of the page's own
    // scripts, on every navigation in this test — that's the only reliable
    // way to seed localStorage ahead of a module that reads it at import
    // time. Setting localStorage *after* page.goto() would be too late,
    // since hasSave()/loadGame() are only called from the start-button
    // click handler, but seeding via addInitScript is still the safest,
    // most future-proof pattern to reach for whenever "state before the
    // page's own code runs" matters.
    const fakeSave = {
      version: 1,
      savedAt: Date.now(),
      player: { name: 'ASH', x: 5, y: 6, dir: 'down', map: 'littleroot', money: 1234, badges: [], steps: 10, playTime: 42 },
      party: [],
      box: [],
      bag: { pokeball: 2 },
      dex: { seen: {}, caught: {} },
      flags: { gotStarter: true },
      lastCenter: null,
    };

    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: SAVE_KEY, value: fakeSave },
    );

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.click('#start-btn');
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    await expect(page.locator('#boot')).toBeHidden();
  });

  test('a corrupted save file does not crash the game on boot', async ({ page }) => {
    // js/engine/save.js's loadGame() wraps JSON.parse in a try/catch and
    // falls back gracefully — this test is here specifically to guard that
    // behaviour. If someone "simplifies" loadGame() and drops the
    // try/catch, this is the test that should catch it.
    await page.addInitScript(
      (key) => localStorage.setItem(key, '{not valid json'),
      SAVE_KEY,
    );

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.click('#start-btn');
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    await expect(page.locator('#boot')).toBeHidden();
  });
});
