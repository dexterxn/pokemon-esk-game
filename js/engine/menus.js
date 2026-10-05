import { drawText, textWidth, LINE_HEIGHT } from '../render/font.js';
import {
  panel, drawHpBar, drawExpBar, drawTypeChip, drawMenuList, UI, SCREEN_W, SCREEN_H,
} from '../render/ui.js';
import { drawPokemon, drawPokemonSilhouette } from '../render/sprites.js';
import { SPECIES_LIST, getSpecies } from '../data/species.js';
import { TYPE_COLORS } from '../data/types.js';
import { getMove } from '../data/moves.js';
import { getItem } from '../data/items.js';
import { state, bagEntries } from './state.js';
import { displayName, speciesOf, STATUS_LABELS, expProgress, expToNext } from './pokemon.js';
import { wasPressed } from '../core/input.js';
import { audio } from '../core/audio.js';
import { clamp } from '../core/util.js';

/** Move a cursor with the d-pad and play the blip. Returns the new index. */
function cursorMove(index, count, vertical = true) {
  if (count === 0) return 0;
  const back = vertical ? 'up' : 'left';
  const fwd = vertical ? 'down' : 'right';
  let next = index;
  if (wasPressed(back)) next = (index - 1 + count) % count;
  else if (wasPressed(fwd)) next = (index + 1) % count;
  if (next !== index) audio.sfx('select');
  return next;
}

const hpRatio = (mon) => clamp(mon.hp / mon.stats.hp, 0, 1);

/** One row of the party list. */
const ROW_SELECTED = { border: '#c07028', borderLight: '#f0c060', fill: '#fff6e0' };
const ROW_MOVING = { border: '#2f7a52', borderLight: '#6fd0a0', fill: '#e6f8ee' };

function drawPartyRow(ctx, mon, x, y, w, h, style) {
  panel(ctx, x, y, w, h, style || {});
  drawPokemon(ctx, mon.species, x + 3, y + Math.round((h - 22) / 2), 22, false, mon.hp > 0 ? 1 : 0.45);

  const name = displayName(mon).toUpperCase();
  drawText(ctx, name, x + 28, y + 4, UI.ink, UI.shadow);
  drawText(ctx, `Lv${mon.level}`, x + 28, y + 4 + LINE_HEIGHT, UI.ink, UI.shadow);

  if (mon.status) {
    drawText(ctx, STATUS_LABELS[mon.status], x + 62, y + 4 + LINE_HEIGHT, '#b04858', UI.shadow);
  }

  const barX = x + w - 76;
  drawText(ctx, 'HP', barX - 14, y + 3, UI.inkDim, null);
  drawHpBar(ctx, barX, y + 6, 60, hpRatio(mon));
  const hpText = `${mon.hp}/${mon.stats.hp}`;
  drawText(ctx, hpText, x + w - 8 - textWidth(hpText), y + 4 + LINE_HEIGHT, UI.ink, UI.shadow);
}

const PARTY_ACTIONS = ['SUMMARY', 'SWITCH', 'CANCEL'];

/**
 * Party list. `mode` 'select' returns the chosen slot; 'view' offers a summary
 * or SWITCH, which lets the player reorder the party.
 */
export class PartyScreen {
  constructor(opts = {}) {
    this.index = 0;
    this.mode = opts.mode || 'view';
    this.title = opts.title || (this.mode === 'select' ? 'Choose a POKéMON.' : 'POKéMON');
    this.filter = opts.filter || null;
    this.noCancel = !!opts.noCancel;
    this.summary = null;
    this.actions = null;      // { index } while the SUMMARY/SWITCH menu is open
    this.swapFrom = null;     // slot being moved during a SWITCH
  }

  update() {
    if (this.summary) {
      if (wasPressed('a') || wasPressed('b')) { audio.sfx('cancel'); this.summary = null; }
      return null;
    }
    if (this.actions) { this.updateActions(); return null; }

    const count = state.party.length;
    this.index = cursorMove(this.index, count);

    if (this.swapFrom !== null) { this.updateSwap(); return null; }

    if (wasPressed('a') && count > 0) {
      const mon = state.party[this.index];
      if (this.filter && !this.filter(mon)) { audio.sfx('cancel'); return null; }
      audio.sfx('select');
      if (this.mode === 'select') return { action: 'select', index: this.index, mon };
      this.actions = { index: 0 };
      return null;
    }
    if ((wasPressed('b') || wasPressed('start')) && !this.noCancel) {
      audio.sfx('cancel');
      return { action: 'cancel' };
    }
    return null;
  }

  updateActions() {
    this.actions.index = cursorMove(this.actions.index, PARTY_ACTIONS.length);
    if (wasPressed('b')) { audio.sfx('cancel'); this.actions = null; return; }
    if (!wasPressed('a')) return;

    const choice = PARTY_ACTIONS[this.actions.index];
    this.actions = null;
    if (choice === 'SUMMARY') { audio.sfx('select'); this.summary = state.party[this.index]; }
    else if (choice === 'SWITCH' && state.party.length > 1) { audio.sfx('select'); this.swapFrom = this.index; }
    else audio.sfx('cancel');
  }

  /** Second half of SWITCH: pick the slot to trade places with. */
  updateSwap() {
    if (wasPressed('b') || wasPressed('start')) { audio.sfx('cancel'); this.swapFrom = null; return; }
    if (!wasPressed('a')) return;
    const from = this.swapFrom;
    const to = this.index;
    this.swapFrom = null;
    if (from === to) { audio.sfx('cancel'); return; }
    [state.party[from], state.party[to]] = [state.party[to], state.party[from]];
    audio.sfx('save');
  }

  draw(ctx) {
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.summary) { drawSummary(ctx, this.summary); return; }

    const rowH = 23;
    state.party.forEach((mon, i) => {
      const style = i === this.swapFrom ? ROW_MOVING : i === this.index ? ROW_SELECTED : null;
      drawPartyRow(ctx, mon, 4, 2 + i * rowH, SCREEN_W - 8, rowH - 1, style);
    });
    if (state.party.length === 0) {
      panel(ctx, 20, 60, 200, 40);
      drawText(ctx, 'You have no POKéMON yet.', 32, 74, UI.ink, UI.shadow);
    }

    panel(ctx, 4, SCREEN_H - 18, SCREEN_W - 8, 16);
    const title = this.swapFrom !== null ? 'Move to where?' : this.title;
    drawText(ctx, title, 12, SCREEN_H - 13, UI.ink, UI.shadow);

    if (this.actions) {
      const w = 70;
      const h = PARTY_ACTIONS.length * LINE_HEIGHT + 10;
      drawMenuList(ctx, PARTY_ACTIONS, this.actions.index, SCREEN_W - w - 4, SCREEN_H - 20 - h, w);
    }
  }
}

/** Detailed stat page for one Pokémon. */
export function drawSummary(ctx, mon) {
  const species = speciesOf(mon);
  panel(ctx, 2, 2, SCREEN_W - 4, SCREEN_H - 4);

  drawPokemon(ctx, mon.species, 8, 12, 48);
  drawText(ctx, displayName(mon).toUpperCase(), 60, 10, UI.ink, UI.shadow);
  drawText(ctx, `Lv${mon.level}`, 60, 22, UI.ink, UI.shadow);
  drawText(ctx, `No.${String(species.num).padStart(3, '0')}`, 100, 22, UI.inkDim, null);

  let tx = 60;
  for (const type of species.types) tx += drawTypeChip(ctx, type, TYPE_COLORS[type], tx, 36) + 4;

  drawText(ctx, 'HP', 8, 64, UI.inkDim, null);
  drawHpBar(ctx, 26, 67, 60, hpRatio(mon));
  drawText(ctx, `${mon.hp}/${mon.stats.hp}`, 92, 62, UI.ink, UI.shadow);

  drawText(ctx, 'EXP', 8, 78, UI.inkDim, null);
  drawExpBar(ctx, 26, 82, 60, expProgress(mon));
  drawText(ctx, `next ${expToNext(mon)}`, 92, 76, UI.inkDim, null);

  const stats = [
    ['ATTACK', mon.stats.attack], ['DEFENSE', mon.stats.defense],
    ['SP.ATK', mon.stats.spAttack], ['SP.DEF', mon.stats.spDefense],
    ['SPEED', mon.stats.speed],
  ];
  stats.forEach(([label, value], i) => {
    const y = 92 + Math.floor(i / 2) * 12;
    const x = 8 + (i % 2) * 62;
    drawText(ctx, label, x, y, UI.inkDim, null);
    drawText(ctx, String(value), x + 44, y, UI.ink, UI.shadow);
  });

  drawText(ctx, 'MOVES', 140, 60, UI.inkDim, null);
  mon.moves.forEach((slot, i) => {
    const move = getMove(slot.id);
    const y = 72 + i * 16;
    drawText(ctx, move.name, 140, y, UI.ink, UI.shadow);
    drawText(ctx, `${slot.pp}/${slot.maxPp}`, 208, y, UI.inkDim, null);
    ctx.fillStyle = TYPE_COLORS[move.type];
    ctx.fillRect(140, y + 9, 60, 2);
  });

  drawText(ctx, 'B: back', 8, SCREEN_H - 14, UI.inkDim, null);
}

/** Bag with a scrolling item list and a description strip. */
export class BagScreen {
  constructor(opts = {}) {
    this.index = 0;
    this.scroll = 0;
    this.context = opts.context || 'field';
    this.rows = 6;
  }

  get items() {
    const all = bagEntries();
    if (this.context !== 'battle') return all;
    return all;
  }

  update() {
    const list = this.items;
    const count = list.length;
    if (count > 0) {
      const before = this.index;
      if (wasPressed('up')) this.index = (this.index - 1 + count) % count;
      if (wasPressed('down')) this.index = (this.index + 1) % count;
      if (before !== this.index) audio.sfx('select');
      this.scroll = clamp(this.scroll, Math.max(0, this.index - this.rows + 1), this.index);
      this.scroll = clamp(this.scroll, 0, Math.max(0, count - this.rows));
    }

    if (wasPressed('a') && count > 0) {
      audio.sfx('select');
      return { action: 'use', item: list[this.index][0] };
    }
    if (wasPressed('b') || wasPressed('start')) {
      audio.sfx('cancel');
      return { action: 'cancel' };
    }
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = '#4a6a4a';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    panel(ctx, 4, 4, SCREEN_W - 8, 108);

    const list = this.items;
    if (list.length === 0) {
      drawText(ctx, 'Your BAG is empty.', 16, 20, UI.ink, UI.shadow);
    }
    list.slice(this.scroll, this.scroll + this.rows).forEach(([id, count], row) => {
      const i = this.scroll + row;
      const y = 12 + row * 16;
      const item = getItem(id);
      drawText(ctx, item.name, 20, y, UI.ink, UI.shadow);
      drawText(ctx, `x${count}`, SCREEN_W - 34, y, UI.ink, UI.shadow);
      if (i === this.index) drawText(ctx, '►', 10, y, UI.ink, null);
    });

    panel(ctx, 4, 114, SCREEN_W - 8, 42);
    const current = list[this.index];
    const desc = current ? getItem(current[0]).desc : 'Nothing to use right now.';
    drawText(ctx, desc, 12, 122, UI.ink, UI.shadow);
    drawText(ctx, this.context === 'battle' ? 'A: use   B: back' : 'A: use   B: close', 12, 138, UI.inkDim, null);
  }
}

/** Pokédex: a scrolling list plus the highlighted entry's sprite. */
export class DexScreen {
  constructor() {
    this.index = 0;
    this.scroll = 0;
    this.rows = 8;
  }

  update() {
    const count = SPECIES_LIST.length;
    const before = this.index;
    if (wasPressed('up')) this.index = (this.index - 1 + count) % count;
    if (wasPressed('down')) this.index = (this.index + 1) % count;
    if (wasPressed('left')) this.index = Math.max(0, this.index - this.rows);
    if (wasPressed('right')) this.index = Math.min(count - 1, this.index + this.rows);
    if (before !== this.index) audio.sfx('select');
    this.scroll = clamp(this.scroll, Math.max(0, this.index - this.rows + 1), this.index);
    this.scroll = clamp(this.scroll, 0, Math.max(0, count - this.rows));

    if (wasPressed('b') || wasPressed('start')) { audio.sfx('cancel'); return { action: 'cancel' }; }
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = '#8a3a3a';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    panel(ctx, 4, 4, 140, SCREEN_H - 8);

    SPECIES_LIST.slice(this.scroll, this.scroll + this.rows).forEach((sp, row) => {
      const i = this.scroll + row;
      const y = 12 + row * 17;
      const seen = state.dex.seen[sp.id];
      const caught = state.dex.caught[sp.id];
      drawText(ctx, String(sp.num).padStart(3, '0'), 20, y, UI.inkDim, null);
      drawText(ctx, seen ? sp.name.toUpperCase() : '----------', 46, y, seen ? UI.ink : UI.inkDim, UI.shadow);
      if (caught) drawText(ctx, '*', 12, y, '#c04040', null);
      if (i === this.index) drawText(ctx, '►', 10, y, UI.ink, null);
    });

    const sp = SPECIES_LIST[this.index];
    const seen = state.dex.seen[sp.id];
    panel(ctx, 148, 4, SCREEN_W - 152, SCREEN_H - 8);
    if (seen) {
      drawPokemon(ctx, sp.id, 168, 14, 48);
      drawText(ctx, sp.name.toUpperCase(), 156, 68, UI.ink, UI.shadow);
      let tx = 156;
      for (const type of sp.types) tx += drawTypeChip(ctx, type, TYPE_COLORS[type], tx, 82) + 3;
      drawText(ctx, `HP  ${sp.base.hp}`, 156, 100, UI.inkDim, null);
      drawText(ctx, `ATK ${sp.base.attack}`, 156, 111, UI.inkDim, null);
      drawText(ctx, `DEF ${sp.base.defense}`, 156, 122, UI.inkDim, null);
      drawText(ctx, `SPD ${sp.base.speed}`, 156, 133, UI.inkDim, null);
    } else {
      drawPokemonSilhouette(ctx, sp.id, 168, 14, 48, '#c8c8c8');
      drawText(ctx, 'Not yet seen', 156, 70, UI.inkDim, null);
    }
    drawText(ctx, 'B: close', 156, SCREEN_H - 16, UI.inkDim, null);
  }
}

/** Shop list used by the Poké Mart clerk. */
export class ShopScreen {
  constructor(stock) {
    this.stock = stock;
    this.index = 0;
    this.scroll = 0;
    this.rows = 6;
  }

  update() {
    const count = this.stock.length + 1; // + CANCEL
    const before = this.index;
    if (wasPressed('up')) this.index = (this.index - 1 + count) % count;
    if (wasPressed('down')) this.index = (this.index + 1) % count;
    if (before !== this.index) audio.sfx('select');
    this.scroll = clamp(this.scroll, Math.max(0, this.index - this.rows + 1), this.index);
    this.scroll = clamp(this.scroll, 0, Math.max(0, count - this.rows));

    if (wasPressed('a')) {
      audio.sfx('select');
      if (this.index >= this.stock.length) return { action: 'cancel' };
      return { action: 'buy', item: this.stock[this.index] };
    }
    if (wasPressed('b')) { audio.sfx('cancel'); return { action: 'cancel' }; }
    return null;
  }

  draw(ctx) {
    const entries = [...this.stock.map((id) => ({ id })), { id: null }];
    panel(ctx, 100, 4, 136, 108);
    entries.slice(this.scroll, this.scroll + this.rows).forEach((entry, row) => {
      const i = this.scroll + row;
      const y = 12 + row * 16;
      if (entry.id) {
        const item = getItem(entry.id);
        drawText(ctx, item.name, 116, y, UI.ink, UI.shadow);
        const price = `$${item.price}`;
        drawText(ctx, price, 228 - textWidth(price), y, UI.ink, UI.shadow);
      } else {
        drawText(ctx, 'CANCEL', 116, y, UI.ink, UI.shadow);
      }
      if (i === this.index) drawText(ctx, '►', 106, y, UI.ink, null);
    });

    panel(ctx, 4, 4, 92, 28);
    drawText(ctx, 'MONEY', 12, 9, UI.inkDim, null);
    drawText(ctx, `$${state.player.money}`, 12, 20, UI.ink, UI.shadow);
  }
}

/** Read-only "trainer card" style status screen. */
export function drawTrainerCard(ctx, playTime) {
  panel(ctx, 8, 8, SCREEN_W - 16, SCREEN_H - 16);
  drawText(ctx, 'TRAINER CARD', 20, 18, UI.ink, UI.shadow);
  drawText(ctx, `NAME    ${state.player.name}`, 20, 40, UI.ink, UI.shadow);
  drawText(ctx, `MONEY   $${state.player.money}`, 20, 54, UI.ink, UI.shadow);
  drawText(ctx, `TIME    ${playTime}`, 20, 68, UI.ink, UI.shadow);
  drawText(ctx, `BADGES  ${state.player.badges.length}`, 20, 82, UI.ink, UI.shadow);
  state.player.badges.forEach((badge, i) => {
    drawText(ctx, `- ${badge}`, 32, 96 + i * 12, UI.inkDim, null);
  });
  drawText(ctx, 'B: close', 20, SCREEN_H - 26, UI.inkDim, null);
}

export { getSpecies };
