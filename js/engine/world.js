import { getMap } from '../data/maps.js';
import { MART_STOCK, getItem } from '../data/items.js';
import { TILE, buildTiles, drawTile, tileInfo, isSolid } from '../render/tiles.js';
import { drawCharacter } from '../render/characters.js';
import { drawText, textWidth } from '../render/font.js';
import {
  panel, drawMenuList, MessageBox, UI, SCREEN_W, SCREEN_H, fadeOverlay,
} from '../render/ui.js';
import { drawPokemon } from '../render/sprites.js';
import { wasPressed, isDown, heldDirection } from '../core/input.js';
import { audio } from '../core/audio.js';
import { randInt, chance, weightedPick, clamp } from '../core/util.js';
import { createPokemon, displayName, healPokemon, speciesOf } from './pokemon.js';
import {
  state, hasFlag, giveStarter, healParty, addItem, removeItem, spendMoney,
  formatPlayTime, dexSeenCount, dexCaughtCount,
} from './state.js';
import { saveGame } from './save.js';
import { PartyScreen, BagScreen, DexScreen, ShopScreen, drawTrainerCard } from './menus.js';

const DIR_VECTORS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const WALK_FRAMES = 8;
const RUN_FRAMES = 5;
const ENCOUNTER_RATE = 0.12;
const STARTERS = ['treecko', 'torchic', 'mudkip'];

export class World {
  constructor() {
    buildTiles();
    this.map = getMap(state.player.map);
    this.player = {
      x: state.player.x, y: state.player.y, dir: state.player.dir,
      moving: false, progress: 0, fromX: state.player.x, fromY: state.player.y,
      animTimer: 0, animFrame: 0, jump: 0,
    };
    this.msg = new MessageBox();
    this.mode = 'walk';       // walk | message | menu | screen | choice | quantity | alert
    this.screen = null;
    this.choice = null;
    this.quantity = null;
    this.menuIndex = 0;
    this.fade = 0;            // 0 = clear, 1 = black
    this.fadeDir = 0;
    this.pendingWarp = null;
    this.alert = null;
    this.pendingBattle = null; // main.js picks this up
    this.npcState = new Map();
    this.bumpCooldown = 0;
    this.syncMusic();
    this.resetNpcs();
  }

  // ------------------------------------------------------------------- setup

  resetNpcs() {
    this.npcState.clear();
    for (const npc of this.map.npcs) {
      this.npcState.set(npc.id, {
        x: npc.x, y: npc.y, dir: npc.dir || 'down',
        homeX: npc.x, homeY: npc.y,
        moving: false, progress: 0, fromX: npc.x, fromY: npc.y,
        animFrame: 0, cooldown: randInt(60, 240), alert: 0,
      });
    }
  }

  syncMusic() {
    audio.play(this.map.music || 'town');
  }

  enterMap(mapId, x, y, dir) {
    this.map = getMap(mapId);
    Object.assign(this.player, {
      x, y, dir, moving: false, progress: 0, fromX: x, fromY: y, jump: 0,
    });
    state.player.map = mapId;
    state.player.x = x;
    state.player.y = y;
    state.player.dir = dir;
    this.resetNpcs();
    this.syncMusic();
  }

  // ------------------------------------------------------------- map queries

  tileAt(x, y) {
    if (x < 0 || y < 0 || y >= this.map.height || x >= this.map.width) return 'x';
    return this.map.grid[y][x];
  }

  npcAt(x, y) {
    for (const npc of this.map.npcs) {
      const s = this.npcState.get(npc.id);
      if (!s) continue;
      if ((s.x === x && s.y === y) || (s.moving && s.fromX === x && s.fromY === y)) return { npc, s };
    }
    return null;
  }

  blocked(x, y) {
    if (x < 0 || y < 0 || y >= this.map.height || x >= this.map.width) return true;
    if (isSolid(this.tileAt(x, y))) return true;
    if (this.npcAt(x, y)) return true;
    return false;
  }

  warpAt(x, y) {
    return this.map.warps.find((w) => w.x === x && w.y === y) || null;
  }

  // ------------------------------------------------------------------ update

  update() {
    this.msg.update();
    if (this.bumpCooldown > 0) this.bumpCooldown--;
    this.updateFade();
    this.updateNpcs();

    if (this.fadeDir !== 0) return;      // no input during transitions
    if (this.alert) { this.updateAlert(); return; }
    if (this.quantity) { this.updateQuantity(); return; }
    if (this.screen) { this.updateScreen(); return; }
    if (this.choice) { this.updateChoice(); return; }
    if (this.msg.active) { this.updateMessage(); return; }
    if (this.mode === 'menu') { this.updateMenu(); return; }
    this.updateWalk();
  }

  updateFade() {
    if (this.fadeDir === 0) return;
    this.fade = clamp(this.fade + this.fadeDir * 0.09, 0, 1);
    if (this.fadeDir > 0 && this.fade >= 1) {
      const warp = this.pendingWarp;
      this.pendingWarp = null;
      this.fadeDir = -1;
      if (warp) {
        if (warp.kind === 'battle') {
          this.fade = 1;
          this.fadeDir = 0;
          this.pendingBattle = warp.battle;
          return;
        }
        this.enterMap(warp.to, warp.tx, warp.ty, warp.dir);
      }
    } else if (this.fadeDir < 0 && this.fade <= 0) {
      this.fadeDir = 0;
    }
  }

  /** Called by main.js once a battle finishes so the world can fade back in. */
  resumeFromBattle() {
    this.fade = 1;
    this.fadeDir = -1;
    this.syncMusic();
  }

  updateMessage() {
    if (wasPressed('a') || wasPressed('b')) {
      this.msg.advance();
      audio.sfx('select');
    }
  }

  updateAlert() {
    this.alert.timer--;
    if (this.alert.timer <= 0) {
      const done = this.alert.onDone;
      this.alert = null;
      done?.();
    }
  }

  // --------------------------------------------------------------- walking

  updateWalk() {
    if (wasPressed('start')) {
      audio.sfx('select');
      this.mode = 'menu';
      this.menuIndex = 0;
      return;
    }

    if (this.player.moving) {
      this.advanceStep();
      return;
    }

    if (wasPressed('a')) { this.interact(); return; }

    const dir = heldDirection();
    if (!dir) { this.player.animFrame = 0; return; }

    if (this.player.dir !== dir) {
      this.player.dir = dir;
      state.player.dir = dir;
    }

    const [dx, dy] = DIR_VECTORS[dir];
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // Ledges can only be hopped in the direction they face.
    const info = tileInfo(this.tileAt(nx, ny));
    if (info.ledge === 'down' && dir === 'down' && !this.blocked(nx, ny + 1)) {
      this.startStep(nx, ny + 1, true);
      return;
    }

    if (this.blocked(nx, ny)) {
      if (this.bumpCooldown === 0) { audio.sfx('bump'); this.bumpCooldown = 18; }
      return;
    }
    this.startStep(nx, ny, false);
  }

  startStep(nx, ny, jump) {
    this.player.fromX = this.player.x;
    this.player.fromY = this.player.y;
    this.player.x = nx;
    this.player.y = ny;
    this.player.moving = true;
    this.player.progress = 0;
    this.player.jump = jump ? 1 : 0;
  }

  advanceStep() {
    const frames = isDown('b') ? RUN_FRAMES : WALK_FRAMES;
    this.player.progress += 1 / (this.player.jump ? frames * 1.6 : frames);
    this.player.animTimer++;
    if (this.player.progress >= 1) {
      this.player.progress = 0;
      this.player.moving = false;
      this.player.jump = 0;
      this.player.animFrame = (this.player.animFrame + 1) % 4;
      this.onStepComplete();
    }
  }

  onStepComplete() {
    state.player.x = this.player.x;
    state.player.y = this.player.y;
    state.player.steps++;

    const warp = this.warpAt(this.player.x, this.player.y);
    if (warp) {
      if (this.blockRouteExit(warp)) return;
      audio.sfx('select');
      this.pendingWarp = warp;
      this.fadeDir = 1;
      return;
    }

    if (this.checkTrainerSight()) return;

    const info = tileInfo(this.tileAt(this.player.x, this.player.y));
    if (info.encounter && state.party.length > 0 && chance(ENCOUNTER_RATE)) {
      this.startWildBattle();
    }
  }

  /** Keep the player in town until Prof. Birch has handed over a starter. */
  blockRouteExit(warp) {
    const leavingTown = warp.to && getMap(warp.to)?.kind === 'route';
    if (!leavingTown || state.party.length > 0) return false;
    this.player.x = this.player.fromX;
    this.player.y = this.player.fromY;
    state.player.x = this.player.x;
    state.player.y = this.player.y;
    this.msg.push([
      'Wait! Wild POKéMON live in the tall grass out there.',
      'You need a POKéMON of your own first. Try the LAB!',
    ]);
    return true;
  }

  startWildBattle() {
    const table = this.map.encounters;
    if (!table) return;
    const entry = weightedPick(table.table);
    const level = randInt(table.levels[0], table.levels[1]);
    const wild = createPokemon(entry.species, level, { wild: true });
    audio.sfx('encounter');
    this.pendingWarp = { kind: 'battle', battle: { wild } };
    this.fadeDir = 1;
  }

  // ------------------------------------------------------------- interaction

  interact() {
    const [dx, dy] = DIR_VECTORS[this.player.dir];
    let tx = this.player.x + dx;
    let ty = this.player.y + dy;

    let found = this.npcAt(tx, ty);
    // Counters are meant to be talked across.
    if (!found && this.tileAt(tx, ty) === 'C') {
      found = this.npcAt(tx + dx, ty + dy);
      if (found) { tx += dx; ty += dy; }
    }

    if (found) { this.talkTo(found.npc, found.s); return; }

    const signKey = `${tx},${ty}`;
    if (this.map.signs[signKey]) {
      audio.sfx('select');
      this.msg.push(this.map.signs[signKey]);
      return;
    }

    const info = tileInfo(this.tileAt(tx, ty));
    if (info.pc) {
      audio.sfx('save');
      const stored = state.box.length;
      this.msg.push([
        'You booted up the PC.',
        `POKéDEX: ${dexCaughtCount()} caught / ${dexSeenCount()} seen.`,
        stored ? `${stored} POKéMON are stored in the BOX.` : 'The BOX is empty.',
      ]);
      return;
    }
    if (info.bed) {
      audio.sfx('heal');
      healParty();
      this.msg.push('You took a nap. Your POKéMON are full of energy!');
      return;
    }
    if (info.name === 'bookshelf') {
      this.msg.push('Rows of books on POKéMON habitats.');
    }
  }

  talkTo(npc, s) {
    audio.sfx('select');
    // Face the player.
    const facing = { up: 'down', down: 'up', left: 'right', right: 'left' }[this.player.dir];
    s.dir = facing;

    if (npc.trainer && !hasFlag(`beat:${npc.id}`)) { this.startTrainerBattle(npc); return; }
    if (npc.trainer) { this.msg.push(npc.trainer.after || 'Good battle!'); return; }

    switch (npc.script) {
      case 'heal': return this.nurseScript();
      case 'mart': return this.martScript();
      case 'starter': return this.starterScript();
      case 'mom': return this.momScript();
      default:
        this.msg.push(npc.lines || ['...']);
    }
  }

  // ----------------------------------------------------------------- scripts

  nurseScript() {
    // Remember this Center so a blackout sends the player back here.
    const exit = this.map.warps[0];
    if (exit) state.lastCenter = { map: exit.to, x: exit.tx, y: exit.ty, dir: 'down' };
    this.msg.push('Welcome! Shall we heal your POKéMON?', () => {
      this.choice = {
        items: ['YES', 'NO'],
        index: 0,
        x: 176, y: 66, w: 60,
        onPick: (i) => {
          this.choice = null;
          if (i !== 0) { this.msg.push('We hope to see you again!'); return; }
          healParty();
          audio.sfx('save');
          audio.play('heal');
          this.msg.push(['Your POKéMON are fully healed.', 'We hope to see you again!'], () => this.syncMusic());
        },
      };
    });
  }

  martScript() {
    this.msg.push('Welcome! How may I help you?', () => {
      this.screen = new ShopScreen(MART_STOCK);
    });
  }

  starterScript() {
    if (hasFlag('gotStarter')) {
      this.msg.push([
        'How is your POKéMON doing? Treat it well!',
        'Head north through ROUTE 101 to reach OLDALE TOWN.',
      ]);
      return;
    }
    this.msg.push([
      'Ah, you must be the new neighbour!',
      "I'm PROF. BIRCH. I study where POKéMON live in the wild.",
      'Go on — choose one of these three as your partner.',
    ], () => {
      this.choice = {
        items: STARTERS.map((id) => speciesOf({ species: id }).name.toUpperCase()),
        index: 0,
        x: 150, y: 40, w: 86,
        preview: true,
        onPick: (i) => {
          const id = STARTERS[i];
          this.choice = null;
          this.msg.push(`So, you'll take ${speciesOf({ species: id }).name.toUpperCase()}?`, () => {
            this.choice = {
              items: ['YES', 'NO'],
              index: 0,
              x: 176, y: 66, w: 60,
              onPick: (yes) => {
                this.choice = null;
                if (yes !== 0) { this.starterScript(); return; }
                const mon = giveStarter(id);
                audio.sfx('caught');
                this.msg.push([
                  `${displayName(mon).toUpperCase()} is yours! Take good care of it.`,
                  'Tall grass north of town is full of wild POKéMON.',
                  'Weaken one in battle, then throw a POKé BALL to catch it!',
                ]);
              },
            };
          });
        },
      };
    });
  }

  momScript() {
    healParty();
    const lines = hasFlag('gotStarter')
      ? ['Take care out there! Your POKéMON look rested now.']
      : ['PROF. BIRCH was looking for you. His LAB is south of here!'];
    this.msg.push(lines);
  }

  // ------------------------------------------------------------- battles

  startTrainerBattle(npc) {
    const s = this.npcState.get(npc.id);
    s.alert = 40;
    this.alert = {
      timer: 44,
      onDone: () => {
        this.msg.push(npc.trainer.intro, () => {
          this.pendingWarp = {
            kind: 'battle',
            battle: { trainer: { ...npc.trainer, name: npc.name }, npcId: npc.id },
          };
          this.fadeDir = 1;
        });
      },
    };
  }

  /** Look down each trainer's line of sight for the player. */
  checkTrainerSight() {
    for (const npc of this.map.npcs) {
      if (!npc.trainer || hasFlag(`beat:${npc.id}`)) continue;
      const s = this.npcState.get(npc.id);
      const [dx, dy] = DIR_VECTORS[s.dir];
      for (let step = 1; step <= 4; step++) {
        const cx = s.x + dx * step;
        const cy = s.y + dy * step;
        if (isSolid(this.tileAt(cx, cy))) break;
        if (cx === this.player.x && cy === this.player.y) {
          this.startTrainerBattle(npc);
          return true;
        }
      }
    }
    return false;
  }

  // ------------------------------------------------------------------- menus

  updateMenu() {
    const items = this.menuItems();
    const before = this.menuIndex;
    if (wasPressed('up')) this.menuIndex = (this.menuIndex - 1 + items.length) % items.length;
    if (wasPressed('down')) this.menuIndex = (this.menuIndex + 1) % items.length;
    if (before !== this.menuIndex) audio.sfx('select');

    if (wasPressed('b') || wasPressed('start')) {
      audio.sfx('cancel');
      this.mode = 'walk';
      return;
    }
    if (!wasPressed('a')) return;
    audio.sfx('select');

    switch (items[this.menuIndex]) {
      case 'POKéDEX': this.screen = new DexScreen(); break;
      case 'POKéMON': this.screen = new PartyScreen({ mode: 'view' }); break;
      case 'BAG': this.screen = new BagScreen({ context: 'field' }); break;
      case 'CARD': this.screen = { kind: 'card' }; break;
      case 'SAVE':
        this.mode = 'walk';
        this.msg.push(saveGame() ? 'Your progress has been saved.' : 'Saving failed — storage is unavailable.');
        audio.sfx('save');
        break;
      default:
        this.mode = 'walk';
    }
  }

  menuItems() {
    const items = [];
    if (dexSeenCount() > 0) items.push('POKéDEX');
    if (state.party.length > 0) items.push('POKéMON');
    items.push('BAG', 'CARD', 'SAVE', 'EXIT');
    return items;
  }

  updateScreen() {
    if (this.screen.kind === 'card') {
      if (wasPressed('b') || wasPressed('a') || wasPressed('start')) {
        audio.sfx('cancel');
        this.screen = null;
      }
      return;
    }

    const out = this.screen.update();
    if (!out) return;

    if (this.screen instanceof ShopScreen) {
      if (out.action === 'cancel') {
        this.screen = null;
        this.mode = 'walk';
        this.msg.push('Please come again!');
        return;
      }
      this.quantity = { item: out.item, count: 1, price: getItem(out.item).price };
      return;
    }

    if (this.screen instanceof BagScreen && out.action === 'use') {
      this.useFieldItem(out.item);
      return;
    }

    // A party pick that follows "use item on which POKéMON?".
    if (this.pendingItem && out.action === 'select') {
      this.applyFieldItem(this.pendingItem, out.mon);
      return;
    }

    this.pendingItem = null;
    this.screen = null;
    this.mode = 'walk';
  }

  useFieldItem(itemId) {
    const item = getItem(itemId);
    if (item.kind === 'ball') {
      this.screen = null;
      this.mode = 'walk';
      this.msg.push('There is no target for that out here.');
      return;
    }
    this.pendingItem = itemId;
    this.screen = new PartyScreen({ mode: 'select', title: `Use ${item.name} on which POKéMON?` });
  }

  /** Resolve a bag item used on a party member outside battle. */
  applyFieldItem(itemId, mon) {
    const item = getItem(itemId);
    const name = displayName(mon).toUpperCase();
    let message;

    if (item.kind === 'heal') {
      if (mon.hp <= 0) message = `${name} has fainted. Use a REVIVE first.`;
      else if (mon.hp >= mon.stats.hp) message = `${name} is already at full health.`;
      else {
        const healed = healPokemon(mon, item.heal);
        removeItem(itemId);
        message = `${name} recovered ${healed} HP!`;
      }
    } else if (item.kind === 'revive') {
      if (mon.hp > 0) message = `${name} does not need reviving.`;
      else {
        mon.hp = Math.max(1, Math.floor(mon.stats.hp / 2));
        mon.status = null;
        removeItem(itemId);
        message = `${name} was revived!`;
      }
    } else if (item.kind === 'status') {
      const matches = item.cures === 'any' ? !!mon.status : mon.status === item.cures;
      if (!matches) message = 'It would have no effect.';
      else {
        mon.status = null;
        mon.sleepTurns = 0;
        removeItem(itemId);
        message = `${name} is feeling much better!`;
      }
    } else {
      message = 'It had no effect.';
    }

    this.pendingItem = null;
    this.screen = null;
    this.mode = 'walk';
    audio.sfx('save');
    this.msg.push(message);
  }

  updateQuantity() {
    const q = this.quantity;
    const max = Math.min(99, Math.floor(state.player.money / q.price)) || 1;
    if (wasPressed('up')) { q.count = clamp(q.count + 1, 1, max); audio.sfx('select'); }
    if (wasPressed('down')) { q.count = clamp(q.count - 1, 1, max); audio.sfx('select'); }
    if (wasPressed('right')) { q.count = clamp(q.count + 10, 1, max); audio.sfx('select'); }
    if (wasPressed('left')) { q.count = clamp(q.count - 10, 1, max); audio.sfx('select'); }

    if (wasPressed('b')) { audio.sfx('cancel'); this.quantity = null; return; }
    if (!wasPressed('a')) return;

    const total = q.price * q.count;
    this.quantity = null;
    this.screen = null;
    const reopen = () => { this.screen = new ShopScreen(MART_STOCK); };

    if (!spendMoney(total)) {
      audio.sfx('cancel');
      this.msg.push("You don't have enough money.", reopen);
      return;
    }
    addItem(q.item, q.count);
    audio.sfx('save');
    this.msg.push(`${getItem(q.item).name} x${q.count}. Thank you!`, reopen);
  }

  updateChoice() {
    const c = this.choice;
    const before = c.index;
    if (wasPressed('up')) c.index = (c.index - 1 + c.items.length) % c.items.length;
    if (wasPressed('down')) c.index = (c.index + 1) % c.items.length;
    if (before !== c.index) audio.sfx('select');

    if (wasPressed('b')) {
      audio.sfx('cancel');
      const pick = c.onPick;
      this.choice = null;
      pick(c.items.length - 1);
      return;
    }
    if (wasPressed('a')) {
      audio.sfx('select');
      c.onPick(c.index);
    }
  }

  // ------------------------------------------------------------------- NPCs

  updateNpcs() {
    for (const npc of this.map.npcs) {
      const s = this.npcState.get(npc.id);
      if (!s) continue;
      if (s.alert > 0) s.alert--;

      if (s.moving) {
        s.progress += 1 / 14;
        if (s.progress >= 1) {
          s.progress = 0;
          s.moving = false;
          s.animFrame = (s.animFrame + 1) % 4;
        }
        continue;
      }
      if (npc.movement !== 'wander' || this.msg.active || this.mode !== 'walk') continue;

      s.cooldown--;
      if (s.cooldown > 0) continue;
      s.cooldown = randInt(90, 260);

      const dir = ['up', 'down', 'left', 'right'][randInt(0, 3)];
      const [dx, dy] = DIR_VECTORS[dir];
      const nx = s.x + dx;
      const ny = s.y + dy;
      s.dir = dir;
      // Wanderers stay within one tile of where they started.
      if (Math.abs(nx - s.homeX) > 1 || Math.abs(ny - s.homeY) > 1) continue;
      if (this.blocked(nx, ny)) continue;
      if (nx === this.player.x && ny === this.player.y) continue;
      s.fromX = s.x; s.fromY = s.y;
      s.x = nx; s.y = ny;
      s.moving = true;
      s.progress = 0;
    }
  }

  // ---------------------------------------------------------------- drawing

  pixelPos(entity) {
    const px = (entity.moving ? entity.fromX + (entity.x - entity.fromX) * entity.progress : entity.x) * TILE;
    const py = (entity.moving ? entity.fromY + (entity.y - entity.fromY) * entity.progress : entity.y) * TILE;
    return [px, py];
  }

  camera() {
    const [px, py] = this.pixelPos(this.player);
    const mapW = this.map.width * TILE;
    const mapH = this.map.height * TILE;
    let camX = px + TILE / 2 - SCREEN_W / 2;
    let camY = py + TILE / 2 - SCREEN_H / 2;
    camX = mapW <= SCREEN_W ? (mapW - SCREEN_W) / 2 : clamp(camX, 0, mapW - SCREEN_W);
    camY = mapH <= SCREEN_H ? (mapH - SCREEN_H) / 2 : clamp(camY, 0, mapH - SCREEN_H);
    return [Math.round(camX), Math.round(camY)];
  }

  draw(ctx, tick) {
    // Full-screen menus replace the map; the shop and trainer card sit on top of it.
    const overlayOnly = !this.screen || this.screen.kind === 'card' || this.screen instanceof ShopScreen;
    if (overlayOnly) this.drawWorld(ctx, tick);

    if (this.screen) {
      if (this.screen.kind === 'card') drawTrainerCard(ctx, formatPlayTime());
      else this.screen.draw(ctx, tick);
    }

    if (overlayOnly) {
      if (this.mode === 'menu') this.drawStartMenu(ctx);
      if (this.msg.active) this.msg.draw(ctx, tick);
      if (this.choice) this.drawChoice(ctx);
    }
    if (this.quantity) this.drawQuantity(ctx);
    fadeOverlay(ctx, this.fade);
  }

  drawWorld(ctx, tick) {
    const [camX, camY] = this.camera();
    const frame = Math.floor(tick / 34) & 1;

    ctx.fillStyle = '#101318';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(this.map.width - 1, Math.ceil((camX + SCREEN_W) / TILE));
    const y1 = Math.min(this.map.height - 1, Math.ceil((camY + SCREEN_H) / TILE));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        drawTile(ctx, this.map.grid[y][x], x * TILE - camX, y * TILE - camY, frame);
      }
    }

    // Depth-sort everyone by their tile row so sprites overlap correctly.
    const actors = this.map.npcs.map((npc) => {
      const s = this.npcState.get(npc.id);
      return { kind: 'npc', npc, entity: s, y: s.y };
    });
    actors.push({ kind: 'player', entity: this.player, y: this.player.y });
    actors.sort((a, b) => a.y - b.y);

    for (const actor of actors) {
      const [px, py] = this.pixelPos(actor.entity);
      const hop = actor.kind === 'player' && this.player.jump
        ? -Math.sin(this.player.progress * Math.PI) * 10 : 0;
      const frameIndex = actor.entity.moving
        ? [0, 1, 2, 3][Math.floor(actor.entity.progress * 4) % 4]
        : 0;

      const palette = actor.kind === 'player' ? 'player' : actor.npc.palette;
      drawCharacter(ctx, palette, actor.entity.dir, actor.entity.moving ? frameIndex : 0,
        px - camX, py - camY + hop);

      // Tall grass draws over the lower half of whoever is standing in it.
      const tile = this.tileAt(actor.entity.x, actor.entity.y);
      if (tile === ',') {
        drawTile(ctx, ',', actor.entity.x * TILE - camX, actor.entity.y * TILE - camY, frame);
      }

      if (actor.kind === 'npc' && actor.entity.alert > 0) {
        this.drawAlert(ctx, px - camX + 5, py - camY - 16);
      }
    }
  }

  drawAlert(ctx, x, y) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 2, y - 2, 10, 14);
    ctx.fillStyle = '#e04030';
    ctx.fillRect(x + 1, y, 4, 7);
    ctx.fillRect(x + 1, y + 9, 4, 3);
  }

  drawStartMenu(ctx) {
    const items = this.menuItems();
    drawMenuList(ctx, items, this.menuIndex, SCREEN_W - 74, 4, 70);
  }

  drawChoice(ctx) {
    const c = this.choice;
    drawMenuList(ctx, c.items, c.index, c.x, c.y, c.w);
    if (c.preview) {
      const id = STARTERS[c.index];
      panel(ctx, 12, 20, 72, 76);
      drawPokemon(ctx, id, 24, 30, 48);
      const sp = speciesOf({ species: id });
      drawText(ctx, sp.types[0].toUpperCase(), 20, 82, UI.inkDim, null);
    }
  }

  drawQuantity(ctx) {
    const q = this.quantity;
    const total = q.price * q.count;
    panel(ctx, 60, 60, 120, 40);
    drawText(ctx, getItem(q.item).name, 70, 68, UI.ink, UI.shadow);
    drawText(ctx, `x${q.count}`, 70, 82, UI.ink, UI.shadow);
    const cost = `$${total}`;
    drawText(ctx, cost, 172 - textWidth(cost), 82, UI.ink, UI.shadow);
  }
}

export { getMap };
