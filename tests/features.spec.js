// -----------------------------------------------------------------------------
// FEATURE TESTS — save files, party reordering, battle move grid
// -----------------------------------------------------------------------------
// Unlike basic.spec.js, these reach into the running game. The page loads
// js/main.js as a module, so `import('/js/...')` from page.evaluate returns the
// *same* module instances the game is using — handy for setting up state
// (a party, a battle) without playing through the game to get there.
// -----------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** Press a key and give the game loop a couple of frames to read it. */
async function tap(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(60);
}

/** Start the game with a two-Pokémon party. */
async function startWithParty(page) {
  await page.goto('/');
  await page.click('#start-btn');
  await page.evaluate(async () => {
    const { state, giveStarter, addToParty } = await import('/js/engine/state.js');
    const { createPokemon } = await import('/js/engine/pokemon.js');
    giveStarter('mudkip');
    addToParty(createPokemon('poochyena', 4));
    state.player.name = 'TESTER';
  });
}

test.describe('portable save files', () => {
  test('download produces a save file that loads on a fresh machine', async ({ page, browser }) => {
    await startWithParty(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-save-btn'),
    ]);
    expect(download.suggestedFilename()).toMatch(/^pokemon-save-.*\.txt$/);
    const path = await download.path();
    const text = await readFile(path, 'utf8');
    expect(text.split('\n')[0]).toBe('POKEMON-ESK-GAME SAVE v1');

    // A brand-new context has empty localStorage — a different machine, in effect.
    const other = await browser.newContext();
    const fresh = await other.newPage();
    await fresh.goto('/');
    await fresh.setInputFiles('#save-file-input', path);
    await expect(fresh.locator('#boot-hint')).toContainText('Save loaded');
    await fresh.click('#start-btn');

    const loaded = await fresh.evaluate(async () => {
      const { state } = await import('/js/engine/state.js');
      return { name: state.player.name, party: state.party.map((m) => m.species) };
    });
    expect(loaded).toEqual({ name: 'TESTER', party: ['mudkip', 'poochyena'] });
    await other.close();
  });

  test('a file that is not a save is rejected with a message', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('#save-file-input', {
      name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('shopping list'),
    });
    await expect(page.locator('#boot-hint')).toHaveText('That file is not a save file.');
  });

  test('loading a file mid-game swaps to that save', async ({ page }) => {
    await startWithParty(page);
    const text = await page.evaluate(async () => (await import('/js/engine/save.js')).exportSaveText());

    await page.evaluate(async () => {
      const { state } = await import('/js/engine/state.js');
      state.party.length = 0;
      state.player.name = 'OTHER';
    });
    await page.setInputFiles('#save-file-input', {
      name: 'save.txt', mimeType: 'text/plain', buffer: Buffer.from(text),
    });
    await expect(page.locator('#save-status')).toContainText('Loaded save: TESTER');
    const party = await page.evaluate(async () => (await import('/js/engine/state.js')).state.party.length);
    expect(party).toBe(2);
  });
});

test.describe('party', () => {
  test('SWITCH swaps two party members', async ({ page }) => {
    await startWithParty(page);
    await page.evaluate(async () => {
      const { game } = await import('/js/main.js');
      const { PartyScreen } = await import('/js/engine/menus.js');
      game.world.screen = new PartyScreen({ mode: 'view' });
    });

    await tap(page, 'KeyZ');       // open SUMMARY / SWITCH / CANCEL on slot 1
    await tap(page, 'ArrowDown');  // SWITCH
    await tap(page, 'KeyZ');
    await tap(page, 'ArrowDown');  // move cursor to slot 2
    await tap(page, 'KeyZ');       // swap

    const order = await page.evaluate(async () =>
      (await import('/js/engine/state.js')).state.party.map((m) => m.species));
    expect(order).toEqual(['poochyena', 'mudkip']);
  });
});

test.describe('battle move grid', () => {
  test('arrows move around the 2x2 grid by row and column', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');
    await page.evaluate(async () => {
      const { game } = await import('/js/main.js');
      const { state, addToParty } = await import('/js/engine/state.js');
      const { createPokemon } = await import('/js/engine/pokemon.js');
      state.flags.gotStarter = true;
      addToParty(createPokemon('mudkip', 10, { moves: ['tackle', 'growl', 'watergun', 'mudslap'] }));
      game.world.pendingBattle = { wild: createPokemon('zigzagoon', 2) };
    });

    // Wait for the intro messages to finish and the action menu to appear.
    // (waitForFunction can't be used here: an async callback returns a
    // Promise, which is always truthy, so it would resolve immediately.)
    await expect.poll(
      () => page.evaluate(async () => (await import('/js/main.js')).game.battle?.mode),
      { timeout: 15000 },
    ).toBe('menu');

    const moveIndex = () => page.evaluate(async () => (await import('/js/main.js')).game.battle.moveIndex);
    await tap(page, 'KeyZ');            // FIGHT
    expect(await moveIndex()).toBe(0);
    await tap(page, 'ArrowDown');       // top-left -> bottom-left
    expect(await moveIndex()).toBe(2);
    await tap(page, 'ArrowRight');      // -> bottom-right
    expect(await moveIndex()).toBe(3);
    await tap(page, 'ArrowUp');         // -> top-right
    expect(await moveIndex()).toBe(1);
    await tap(page, 'ArrowLeft');       // -> top-left
    expect(await moveIndex()).toBe(0);
  });
});
