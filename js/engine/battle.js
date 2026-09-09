import { drawText, textWidth } from '../render/font.js';
import {
  panel, drawHpBar, drawExpBar, UI, SCREEN_W, SCREEN_H, MessageBox, DIALOGUE_BOX,
} from '../render/ui.js';
import { drawPokemon } from '../render/sprites.js';
import { getMove } from '../data/moves.js';
import { TYPE_COLORS, effectivenessMessage } from '../data/types.js';
import { getItem } from '../data/items.js';
import { getSpecies } from '../data/species.js';
import { wasPressed } from '../core/input.js';
import { audio } from '../core/audio.js';
import { randInt, chance, clamp } from '../core/util.js';
import {
  createPokemon, displayName, speciesOf, isFainted, computeDamage, moveHits,
  catchAttempt, escapeChance, residualDamage, healPokemon, expYield, gainExp,
  effectiveStat, expProgress, STATUS_LABELS,
} from './pokemon.js';
import {
  state, addToParty, registerSeen, removeItem, earnMoney, awardBadge,
} from './state.js';
import { PartyScreen, BagScreen } from './menus.js';

const STAGE_KEYS = ['attack', 'defense', 'spAttack', 'spDefense', 'speed', 'accuracy', 'evasion'];
const STRUGGLE = { name: 'Struggle', type: 'normal', category: 'physical', power: 50, accuracy: 999, pp: 1, recoil: 0.25 };

function makeCombatant(mon) {
  const stages = {};
  for (const key of STAGE_KEYS) stages[key] = 0;
  return { mon, stages, volatile: { confuse: 0, flinch: false, seeded: false }, displayHp: mon.hp, shake: 0 };
}

const statLabel = {
  attack: 'ATTACK', defense: 'DEFENSE', spAttack: 'SP. ATK', spDefense: 'SP. DEF',
  speed: 'SPEED', accuracy: 'accuracy', evasion: 'evasiveness',
};

export class Battle {
  /**
   * @param {object} opts
   *   opts.wild   — a Pokémon instance for a wild encounter
   *   opts.trainer — { name, party: [{species, level}], intro, defeat, money, badge }
   *   opts.onEnd(result) — 'win' | 'lose' | 'run' | 'caught'
   */
  constructor(opts) {
    this.isTrainer = !!opts.trainer;
    this.trainer = opts.trainer || null;
    this.onEnd = opts.onEnd || (() => {});

    this.foeParty = this.isTrainer
      ? this.trainer.party.map((e) => createPokemon(e.species, e.level))
      : [opts.wild];
    this.foeIndex = 0;

    this.playerIndex = state.party.findIndex((m) => m.hp > 0);
    this.player = makeCombatant(state.party[this.playerIndex]);
    this.foe = makeCombatant(this.foeParty[0]);

    this.participants = new Set([this.playerIndex]);
    this.escapeAttempts = 0;
    this.finished = false;
    this.result = null;
    this.pendingEvolutions = [];

    this.msg = new MessageBox(2.2);
    this.events = [];
    this.autoTimer = 0;
    this.mode = 'events';       // 'events' | 'menu' | 'moves' | 'party' | 'bag'
    this.menuIndex = 0;
    this.moveIndex = 0;
    this.screen = null;
    this.intro = 0;             // 0..1 slide-in
    this.flash = 0;
    this.ballAnim = null;

    registerSeen(this.foe.mon.species);
    audio.play('battle');
    this.queueIntro();
  }

  // -------------------------------------------------------------- event queue

  say(text) { this.events.push({ msg: text }); return this; }
  run(fn) { this.events.push({ fn }); return this; }
  pause(frames) { this.events.push({ wait: frames }); return this; }

  queueIntro() {
    if (this.isTrainer) {
      this.say(`${this.trainer.name} wants to battle!`);
      if (this.trainer.intro) this.say(this.trainer.intro);
      this.say(`${this.trainer.name} sent out ${displayName(this.foe.mon).toUpperCase()}!`);
    } else {
      this.say(`A wild ${displayName(this.foe.mon).toUpperCase()} appeared!`);
    }
    this.say(`Go! ${displayName(this.player.mon).toUpperCase()}!`);
    this.run(() => { this.mode = 'menu'; this.menuIndex = 0; });
  }

  // ------------------------------------------------------------------ update

  update() {
    this.intro = Math.min(1, this.intro + 0.05);
    if (this.flash > 0) this.flash--;
    for (const side of [this.player, this.foe]) {
      if (side.shake > 0) side.shake--;
      const diff = side.mon.hp - side.displayHp;
      if (Math.abs(diff) < 0.6) side.displayHp = side.mon.hp;
      else side.displayHp += Math.sign(diff) * Math.max(0.5, Math.abs(diff) * 0.14);
    }
    if (this.ballAnim) {
      this.ballAnim.t++;
      if (this.ballAnim.t > this.ballAnim.life) this.ballAnim = null;
    }

    // Messages take priority over any open screen, so a "fainted!" line is not
    // swallowed by the forced-switch party menu that follows it.
    if (this.msg.active) {
      this.msg.update();
      if (wasPressed('a') || wasPressed('b')) { this.msg.advance(); this.autoTimer = 0; }
      else if (this.msg.complete) {
        this.autoTimer++;
        if (this.autoTimer > 42) { this.msg.advance(); this.autoTimer = 0; }
      }
      return;
    }

    if (this.screen) {
      const out = this.screen.update();
      if (out) this.handleScreenResult(out);
      return;
    }

    if (this.mode === 'menu') return this.updateActionMenu();
    if (this.mode === 'moves') return this.updateMoveMenu();
    this.pump();
  }

  /** Drain the event queue until something blocks (a message or a wait). */
  pump() {
    while (this.events.length) {
      const ev = this.events[0];
      if (ev.msg !== undefined) {
        this.events.shift();
        this.msg.push(ev.msg);
        this.autoTimer = 0;
        return;
      }
      if (ev.wait !== undefined) {
        if (ev.wait-- <= 0) this.events.shift();
        return;
      }
      this.events.shift();
      ev.fn();
      if (this.mode !== 'events') return;
    }
    if (this.finished) this.close();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onEnd(this.result, this.pendingEvolutions);
  }

  // ---------------------------------------------------------------- the menus

  updateActionMenu() {
    const cols = 2;
    const before = this.menuIndex;
    if (wasPressed('left')) this.menuIndex = this.menuIndex % cols === 0 ? this.menuIndex + 1 : this.menuIndex - 1;
    if (wasPressed('right')) this.menuIndex = this.menuIndex % cols === 0 ? this.menuIndex + 1 : this.menuIndex - 1;
    if (wasPressed('up')) this.menuIndex = (this.menuIndex + 2) % 4;
    if (wasPressed('down')) this.menuIndex = (this.menuIndex + 2) % 4;
    if (before !== this.menuIndex) audio.sfx('select');

    if (!wasPressed('a')) return;
    audio.sfx('select');
    if (this.menuIndex === 0) { this.mode = 'moves'; this.moveIndex = 0; }
    else if (this.menuIndex === 1) { this.screen = new BagScreen({ context: 'battle' }); }
    else if (this.menuIndex === 2) {
      this.screen = new PartyScreen({ mode: 'select', title: 'Send out which POKéMON?' });
    } else {
      this.mode = 'events';
      this.attemptRun();
    }
  }

  updateMoveMenu() {
    const moves = this.player.mon.moves;
    const before = this.moveIndex;
    if (wasPressed('up')) this.moveIndex = (this.moveIndex - 1 + moves.length) % moves.length;
    if (wasPressed('down')) this.moveIndex = (this.moveIndex + 1) % moves.length;
    if (before !== this.moveIndex) audio.sfx('select');

    if (wasPressed('b')) { audio.sfx('cancel'); this.mode = 'menu'; return; }
    if (!wasPressed('a')) return;

    const slot = moves[this.moveIndex];
    if (slot.pp <= 0) { audio.sfx('cancel'); return; }
    audio.sfx('select');
    this.mode = 'events';
    this.takeTurn({ kind: 'move', slot });
  }

  handleScreenResult(out) {
    const wasBag = this.screen instanceof BagScreen;
    this.screen = null;

    if (out.action === 'cancel') { this.mode = 'menu'; return; }

    if (wasBag && out.action === 'use') {
      this.mode = 'events';
      this.useItem(out.item);
      return;
    }

    if (out.action !== 'select') return;

    const bad = out.index === this.playerIndex
      ? `${displayName(out.mon).toUpperCase()} is already out!`
      : out.mon.hp <= 0 ? `${displayName(out.mon).toUpperCase()} has no energy left!` : null;

    if (bad) {
      this.mode = 'events';
      this.say(bad);
      // Re-open the menu, unless we are mid-blackout and must pick a survivor.
      this.run(() => {
        if (this.forcedSwitch) {
          this.screen = new PartyScreen({
            mode: 'select', noCancel: true,
            title: 'Choose a POKéMON to send out.',
            filter: (m) => m.hp > 0,
          });
        } else {
          this.mode = 'menu';
        }
      });
      return;
    }

    this.mode = 'events';
    if (this.forcedSwitch) {
      // Replacing a fainted Pokémon does not hand the foe a free attack.
      this.forcedSwitch = false;
      this.run(() => this.performSwitch(out.index));
      this.run(() => { this.mode = 'menu'; this.menuIndex = 0; });
      return;
    }
    this.takeTurn({ kind: 'switch', index: out.index });
  }

  // ------------------------------------------------------------------- a turn

  /** Build and queue one full round of actions. */
  takeTurn(playerAction) {
    const foeAction = { kind: 'move', slot: this.chooseFoeMove() };

    const order = [];
    if (playerAction.kind === 'move') {
      const pMove = getMove(playerAction.slot.id) || STRUGGLE;
      const fMove = getMove(foeAction.slot.id) || STRUGGLE;
      const pPriority = pMove.priority || 0;
      const fPriority = fMove.priority || 0;
      const pSpeed = effectiveStat(this.player, 'speed');
      const fSpeed = effectiveStat(this.foe, 'speed');
      const playerFirst = pPriority !== fPriority
        ? pPriority > fPriority
        : pSpeed !== fSpeed ? pSpeed > fSpeed : chance(0.5);
      order.push(
        playerFirst ? ['player', playerAction] : ['foe', foeAction],
        playerFirst ? ['foe', foeAction] : ['player', playerAction],
      );
    } else {
      // Switching happens before the opponent's attack.
      order.push(['player', playerAction], ['foe', foeAction]);
    }

    for (const [side, action] of order) {
      this.run(() => {
        if (this.finished) return;
        const self = side === 'player' ? this.player : this.foe;
        const other = side === 'player' ? this.foe : this.player;
        if (isFainted(self.mon) || isFainted(other.mon)) return;
        if (action.kind === 'switch') this.performSwitch(action.index);
        else this.performMove(self, other, action.slot, side === 'player');
      });
    }

    this.run(() => { if (!this.finished) this.endOfTurn(); });
  }

  chooseFoeMove() {
    const usable = this.foe.mon.moves.filter((m) => m.pp > 0);
    if (usable.length === 0) return { id: null, pp: 1, maxPp: 1 };
    if (chance(0.3)) return usable[randInt(0, usable.length - 1)];

    // Otherwise pick the move with the best expected outcome.
    let best = usable[0];
    let bestScore = -1;
    for (const slot of usable) {
      const move = getMove(slot.id);
      let score;
      if (move.category === 'status') {
        score = 12 + randInt(0, 8);
      } else {
        const preview = computeDamage(this.foe, this.player, move);
        score = preview.damage * (preview.effectiveness || 0.1);
      }
      if (score > bestScore) { bestScore = score; best = slot; }
    }
    return best;
  }

  performSwitch(index) {
    const outgoing = displayName(this.player.mon).toUpperCase();
    this.playerIndex = index;
    this.player = makeCombatant(state.party[index]);
    this.participants.add(index);
    this.msg.push(`${outgoing}, come back!`);
    this.msg.push(`Go! ${displayName(this.player.mon).toUpperCase()}!`);
  }

  /** Resolve one Pokémon using one move, including status checks and effects. */
  performMove(self, other, slot, isPlayer) {
    const name = displayName(self.mon).toUpperCase();
    const move = slot.id ? getMove(slot.id) : STRUGGLE;

    // Pre-move status gates.
    if (self.volatile.flinch) {
      self.volatile.flinch = false;
      this.msg.push(`${name} flinched!`);
      return;
    }
    if (self.mon.status === 'freeze') {
      if (chance(0.2)) { self.mon.status = null; this.msg.push(`${name} thawed out!`); }
      else { this.msg.push(`${name} is frozen solid!`); return; }
    }
    if (self.mon.status === 'sleep') {
      self.mon.sleepTurns--;
      if (self.mon.sleepTurns <= 0) { self.mon.status = null; this.msg.push(`${name} woke up!`); }
      else { this.msg.push(`${name} is fast asleep.`); return; }
    }
    if (self.mon.status === 'paralyze' && chance(0.25)) {
      this.msg.push(`${name} is paralysed! It can't move!`);
      return;
    }
    if (self.volatile.confuse > 0) {
      self.volatile.confuse--;
      if (self.volatile.confuse === 0) {
        this.msg.push(`${name} snapped out of confusion!`);
      } else {
        this.msg.push(`${name} is confused!`);
        if (chance(0.5)) {
          const hurt = Math.max(1, Math.floor(self.mon.stats.attack * 0.4));
          this.damage(self, hurt);
          this.msg.push('It hurt itself in its confusion!');
          this.checkFaint(self, other, isPlayer);
          return;
        }
      }
    }

    if (slot.id) slot.pp = Math.max(0, slot.pp - 1);
    this.msg.push(`${name} used ${move.name}!`);

    if (!moveHits(self, other, move)) {
      this.msg.push(`${name}'s attack missed!`);
      return;
    }

    if (move.category === 'status') {
      this.applyStatusMove(self, other, move, isPlayer);
      return;
    }

    const hits = move.multiHit ? (move.maxHits === 2 ? 2 : randInt(2, 5)) : 1;
    let total = 0;
    let effectiveness = 1;
    let anyCrit = false;

    for (let i = 0; i < hits; i++) {
      const roll = computeDamage(self, other, move);
      effectiveness = roll.effectiveness;
      if (roll.effectiveness === 0) break;
      anyCrit = anyCrit || roll.critical;
      total += roll.damage;
      this.damage(other, roll.damage);
      if (isFainted(other.mon)) break;
    }

    other.shake = 12;
    this.flash = 6;
    audio.sfx(effectiveness >= 2 ? 'super' : 'hit');

    if (effectiveness === 0) {
      this.msg.push(`It doesn't affect ${displayName(other.mon).toUpperCase()}...`);
      return;
    }
    if (anyCrit) this.msg.push('A critical hit!');
    if (hits > 1) this.msg.push(`Hit ${hits} times!`);
    const note = effectivenessMessage(effectiveness);
    if (note) this.msg.push(note);

    if (move.drain && total > 0) {
      const healed = healPokemon(self.mon, Math.max(1, Math.floor(total * move.drain)));
      if (healed > 0) this.msg.push(`${name} drained energy!`);
    }
    if (move.recoil && total > 0) {
      this.damage(self, Math.max(1, Math.floor(total * move.recoil)));
      this.msg.push(`${name} is hit with recoil!`);
    }

    if (!isFainted(other.mon)) {
      this.applySecondary(self, other, move);
    }
    this.checkFaint(other, self, !isPlayer);
    if (!this.finished) this.checkFaint(self, other, isPlayer);
  }

  applyStatusMove(self, other, move, isPlayer) {
    if (move.heal) {
      const healed = healPokemon(self.mon, Math.floor(self.mon.stats.hp * move.heal));
      this.msg.push(healed > 0
        ? `${displayName(self.mon).toUpperCase()} regained health!`
        : 'But it failed!');
      return;
    }
    if (move.seed) {
      if (other.volatile.seeded) this.msg.push('But it failed!');
      else {
        other.volatile.seeded = true;
        this.msg.push(`${displayName(other.mon).toUpperCase()} was seeded!`);
      }
      return;
    }
    if (move.status) {
      this.inflictStatus(other, move.status, 1);
      return;
    }
    if (move.stat) {
      const target = move.target === 'self' ? self : other;
      this.applyStatChange(target, move.stat, move.stages);
      return;
    }
    this.msg.push('But nothing happened!');
  }

  applySecondary(self, other, move) {
    if (move.status && move.statusChance && chance(move.statusChance)) {
      this.inflictStatus(other, move.status, move.statusChance);
    }
    if (move.stat && move.statChance && chance(move.statChance)) {
      const target = move.target === 'self' ? self : other;
      this.applyStatChange(target, move.stat, move.stages);
    }
    if (move.flinch && chance(move.flinch)) other.volatile.flinch = true;
  }

  inflictStatus(target, status, prob) {
    const name = displayName(target.mon).toUpperCase();
    if (status === 'confuse') {
      if (target.volatile.confuse > 0) { this.msg.push(`${name} is already confused!`); return; }
      target.volatile.confuse = randInt(2, 5);
      this.msg.push(`${name} became confused!`);
      return;
    }
    const types = speciesOf(target.mon).types;
    const immune =
      (status === 'burn' && types.includes('fire')) ||
      (status === 'poison' && (types.includes('poison') || types.includes('steel'))) ||
      (status === 'freeze' && types.includes('ice')) ||
      (status === 'paralyze' && types.includes('electric'));

    if (target.mon.status) { if (prob >= 1) this.msg.push('But it failed!'); return; }
    if (immune) { if (prob >= 1) this.msg.push("It doesn't affect it..."); return; }

    target.mon.status = status;
    if (status === 'sleep') target.mon.sleepTurns = randInt(2, 4);
    const verbs = {
      burn: 'was burned!', poison: 'was poisoned!', paralyze: 'is paralysed! It may be unable to move!',
      sleep: 'fell asleep!', freeze: 'was frozen solid!',
    };
    this.msg.push(`${name} ${verbs[status]}`);
  }

  applyStatChange(target, stat, stages) {
    const name = displayName(target.mon).toUpperCase();
    const before = target.stages[stat] || 0;
    const after = clamp(before + stages, -6, 6);
    if (after === before) {
      this.msg.push(`${name}'s ${statLabel[stat]} won't go ${stages > 0 ? 'higher' : 'lower'}!`);
      return;
    }
    target.stages[stat] = after;
    const magnitude = Math.abs(stages) >= 2 ? 'sharply ' : '';
    this.msg.push(`${name}'s ${statLabel[stat]} ${stages > 0 ? `${magnitude}rose!` : `${magnitude}fell!`}`);
  }

  damage(target, amount) {
    target.mon.hp = clamp(target.mon.hp - amount, 0, target.mon.stats.hp);
  }

  checkFaint(fainted, winner, faintedIsPlayer) {
    if (!isFainted(fainted.mon) || fainted.fainting) return;
    fainted.fainting = true;
    audio.sfx('faint');
    this.msg.push(`${faintedIsPlayer ? '' : 'Foe '}${displayName(fainted.mon).toUpperCase()} fainted!`);

    if (faintedIsPlayer) this.run(() => this.onPlayerFaint());
    else this.run(() => this.onFoeFaint());
  }

  // ------------------------------------------------------------------ faints

  onFoeFaint() {
    const beaten = this.foe.mon;
    const gained = expYield(beaten, this.isTrainer);
    const learners = [...this.participants]
      .map((i) => state.party[i])
      .filter((m) => m && m.hp > 0);
    const share = Math.max(1, Math.floor(gained / Math.max(1, learners.length)));

    for (const mon of learners) {
      const result = gainExp(mon, share);
      this.say(`${displayName(mon).toUpperCase()} gained ${share} EXP. Points!`);
      for (const level of result.levels) {
        this.run(() => audio.sfx('levelup'));
        this.say(`${displayName(mon).toUpperCase()} grew to Lv${level}!`);
      }
      for (const moveId of result.learned) {
        this.say(`${displayName(mon).toUpperCase()} learned ${getMove(moveId).name}!`);
      }
      if (result.evolveTo) this.pendingEvolutions.push({ mon, into: result.evolveTo });
    }

    if (this.isTrainer) {
      this.foeIndex++;
      if (this.foeIndex < this.foeParty.length) {
        this.run(() => {
          this.foe = makeCombatant(this.foeParty[this.foeIndex]);
          registerSeen(this.foe.mon.species);
          this.intro = 0.4;
        });
        this.say(`${this.trainer.name} sent out ${getSpecies(this.foeParty[this.foeIndex].species).name.toUpperCase()}!`);
        this.run(() => { this.mode = 'menu'; });
        return;
      }
      this.say(`You defeated ${this.trainer.name}!`);
      if (this.trainer.defeat) this.say(this.trainer.defeat);
      this.say(`You got $${this.trainer.money} for winning!`);
      this.run(() => earnMoney(this.trainer.money));
      if (this.trainer.badge) {
        this.say(`You received the ${this.trainer.badge}!`);
        this.run(() => awardBadge(this.trainer.badge));
      }
      if (this.trainer.after) this.say(this.trainer.after);
    }

    this.run(() => { this.finished = true; this.result = 'win'; });
  }

  onPlayerFaint() {
    const next = state.party.findIndex((m) => m.hp > 0);
    if (next === -1) {
      this.say('You have no usable POKéMON left!');
      this.say('You scurried back to the POKéMON CENTER...');
      this.run(() => { this.finished = true; this.result = 'lose'; });
      return;
    }
    this.run(() => {
      this.screen = new PartyScreen({
        mode: 'select',
        noCancel: true,
        title: 'Choose a POKéMON to send out.',
        filter: (m) => m.hp > 0,
      });
      this.mode = 'events';
      this.forcedSwitch = true;
    });
  }

  // ------------------------------------------------------------- items & run

  useItem(itemId) {
    const item = getItem(itemId);
    if (item.kind === 'ball') {
      if (this.isTrainer) {
        this.say("You can't throw a Ball at another trainer's POKéMON!");
        this.run(() => { this.mode = 'menu'; });
        return;
      }
      this.throwBall(itemId, item);
      return;
    }

    if (item.kind === 'heal') {
      const mon = this.player.mon;
      if (mon.hp >= mon.stats.hp) {
        this.say(`${displayName(mon).toUpperCase()} is already at full health!`);
        this.run(() => { this.mode = 'menu'; });
        return;
      }
      removeItem(itemId);
      const healed = healPokemon(mon, item.heal);
      this.say(`${displayName(mon).toUpperCase()} recovered ${healed} HP!`);
      this.takeTurn({ kind: 'item' });
      return;
    }

    if (item.kind === 'status') {
      const mon = this.player.mon;
      const matches = item.cures === 'any' ? !!mon.status : mon.status === item.cures;
      if (!matches) {
        this.say('It would have no effect right now.');
        this.run(() => { this.mode = 'menu'; });
        return;
      }
      removeItem(itemId);
      mon.status = null;
      mon.sleepTurns = 0;
      this.say(`${displayName(mon).toUpperCase()} is looking healthy again!`);
      this.takeTurn({ kind: 'item' });
      return;
    }

    if (item.kind === 'revive') {
      this.say('Save that for outside of battle.');
      this.run(() => { this.mode = 'menu'; });
    }
  }

  throwBall(itemId, item) {
    removeItem(itemId);
    const target = this.foe.mon;
    const outcome = catchAttempt(target, item.ballRate);

    this.run(() => { this.ballAnim = { t: 0, life: 40, shakes: outcome.shakes }; audio.sfx('ball'); });
    this.say(`You threw a ${item.name}!`);
    this.pause(24);

    for (let i = 0; i < outcome.shakes; i++) {
      this.run(() => audio.sfx('ball'));
      this.say(i === outcome.shakes - 1 && !outcome.caught ? 'Shake...' : '...');
    }

    if (outcome.caught) {
      this.run(() => audio.sfx('caught'));
      this.say(`Gotcha! ${displayName(target).toUpperCase()} was caught!`);
      this.run(() => {
        const where = addToParty(target);
        if (where === 'box') this.say(`Your party is full — ${displayName(target).toUpperCase()} was sent to the PC.`);
        this.finished = true;
        this.result = 'caught';
      });
      return;
    }

    this.say(`Oh no! ${displayName(target).toUpperCase()} broke free!`);
    this.takeTurn({ kind: 'item' });
  }

  attemptRun() {
    if (this.isTrainer) {
      this.say("There's no running from a trainer battle!");
      this.run(() => { this.mode = 'menu'; });
      return;
    }
    this.escapeAttempts++;
    const odds = escapeChance(effectiveStat(this.player, 'speed'), effectiveStat(this.foe, 'speed'), this.escapeAttempts);
    if (Math.random() < odds) {
      this.say('Got away safely!');
      this.run(() => { this.finished = true; this.result = 'run'; });
    } else {
      this.say("Can't escape!");
      this.takeTurn({ kind: 'run' });
    }
  }

  // -------------------------------------------------------------- end of turn

  endOfTurn() {
    for (const [side, other] of [[this.player, this.foe], [this.foe, this.player]]) {
      if (isFainted(side.mon)) continue;
      const name = displayName(side.mon).toUpperCase();

      const residual = residualDamage(side.mon);
      if (residual > 0) {
        this.damage(side, residual);
        this.say(`${name} is hurt by its ${side.mon.status}!`);
      }
      if (side.volatile.seeded && !isFainted(side.mon)) {
        const drain = Math.max(1, Math.floor(side.mon.stats.hp / 8));
        this.damage(side, drain);
        healPokemon(other.mon, drain);
        this.say(`${name}'s health was sapped by LEECH SEED!`);
      }
      if (isFainted(side.mon)) {
        const isPlayerSide = side === this.player;
        this.run(() => this.checkFaint(side, other, isPlayerSide));
      }
    }

    this.run(() => {
      if (this.finished) return;
      if (this.forcedSwitch) { this.forcedSwitch = false; return; }
      if (isFainted(this.player.mon) || isFainted(this.foe.mon)) return;
      this.mode = 'menu';
      this.menuIndex = 0;
    });
  }

  // ------------------------------------------------------------------ drawing

  draw(ctx, tick) {
    if (this.screen && !this.msg.active) { this.screen.draw(ctx, tick); return; }

    this.drawBackground(ctx);

    const slide = 1 - this.intro;
    // Foe, upper right.
    const foeX = 150 + slide * 70;
    drawPokemon(ctx, this.foe.mon.species, foeX + (this.foe.shake ? randInt(-1, 1) : 0), 20, 56);
    // Player's Pokémon, lower left, seen from behind.
    const playerX = 26 - slide * 70;
    drawPokemon(ctx, this.player.mon.species, playerX + (this.player.shake ? randInt(-1, 1) : 0), 44, 60, true);

    if (this.ballAnim) this.drawBall(ctx);

    this.drawStatusBox(ctx, this.foe, 8, 8, false);
    this.drawStatusBox(ctx, this.player, SCREEN_W - 116, 62, true);

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash / 12;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
    }

    if (this.msg.active) { this.msg.draw(ctx, tick); return; }
    if (this.mode === 'menu') this.drawActionMenu(ctx);
    else if (this.mode === 'moves') this.drawMoveMenu(ctx);
    else this.msg.draw(ctx, tick);
  }

  drawBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    grad.addColorStop(0, '#8fd0f0');
    grad.addColorStop(1, '#d8ecc0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.fillStyle = '#a8d878';
    ctx.beginPath();
    ctx.ellipse(178, 74, 52, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8ec860';
    ctx.beginPath();
    ctx.ellipse(56, 112, 62, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 96, SCREEN_W, 1);
  }

  drawBall(ctx) {
    const { t, life } = this.ballAnim;
    const p = Math.min(1, t / (life * 0.6));
    const x = 60 + (168 - 60) * p;
    const y = 90 - Math.sin(p * Math.PI) * 46;
    ctx.fillStyle = '#e8484c';
    ctx.beginPath();
    ctx.arc(x, y, 4, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#22252b';
    ctx.fillRect(x - 4, y - 1, 8, 2);
  }

  drawStatusBox(ctx, side, x, y, isPlayer) {
    const mon = side.mon;
    const w = isPlayer ? 108 : 104;
    const h = isPlayer ? 44 : 36;
    panel(ctx, x, y, w, h);

    const name = displayName(mon).toUpperCase();
    drawText(ctx, name, x + 8, y + 6, UI.ink, UI.shadow);
    const lv = `Lv${mon.level}`;
    drawText(ctx, lv, x + w - 8 - textWidth(lv), y + 6, UI.ink, UI.shadow);

    drawText(ctx, 'HP', x + 8, y + 17, UI.inkDim, null);
    drawHpBar(ctx, x + 24, y + 20, w - 34, clamp(side.displayHp / mon.stats.hp, 0, 1));

    if (mon.status) {
      ctx.fillStyle = '#b04858';
      ctx.fillRect(x + 7, y + 25, 22, 9);
      drawText(ctx, STATUS_LABELS[mon.status], x + 9, y + 26, '#ffffff', null);
    }

    if (isPlayer) {
      const hpText = `${Math.round(side.displayHp)}/${mon.stats.hp}`;
      drawText(ctx, hpText, x + w - 8 - textWidth(hpText), y + 26, UI.ink, UI.shadow);
      drawExpBar(ctx, x + 6, y + h - 6, w - 12, expProgress(mon));
    }
  }

  drawActionMenu(ctx) {
    panel(ctx, DIALOGUE_BOX.x, DIALOGUE_BOX.y, 126, DIALOGUE_BOX.h);
    drawText(ctx, `What will ${displayName(this.player.mon).toUpperCase()} do?`, 14, 124, UI.ink, UI.shadow);

    const x = 134;
    const y = DIALOGUE_BOX.y;
    panel(ctx, x, y, SCREEN_W - x - 4, DIALOGUE_BOX.h);
    const labels = ['FIGHT', 'BAG', 'POKéMON', 'RUN'];
    labels.forEach((label, i) => {
      const cx = x + 14 + (i % 2) * 48;
      const cy = y + 10 + Math.floor(i / 2) * 16;
      drawText(ctx, label, cx, cy, UI.ink, UI.shadow);
      if (i === this.menuIndex) drawText(ctx, '►', cx - 8, cy, UI.ink, null);
    });
  }

  drawMoveMenu(ctx) {
    const moves = this.player.mon.moves;
    panel(ctx, DIALOGUE_BOX.x, DIALOGUE_BOX.y, 152, DIALOGUE_BOX.h);
    moves.forEach((slot, i) => {
      const move = getMove(slot.id);
      const cx = 18 + (i % 2) * 72;
      const cy = DIALOGUE_BOX.y + 10 + Math.floor(i / 2) * 16;
      drawText(ctx, move.name, cx, cy, slot.pp > 0 ? UI.ink : '#b04858', UI.shadow);
      if (i === this.moveIndex) drawText(ctx, '►', cx - 8, cy, UI.ink, null);
    });

    const current = moves[this.moveIndex];
    const move = getMove(current.id);
    const x = 160;
    panel(ctx, x, DIALOGUE_BOX.y, SCREEN_W - x - 4, DIALOGUE_BOX.h);
    ctx.fillStyle = TYPE_COLORS[move.type];
    ctx.fillRect(x + 6, DIALOGUE_BOX.y + 6, SCREEN_W - x - 16, 10);
    drawText(ctx, move.type.toUpperCase(), x + 9, DIALOGUE_BOX.y + 7, '#ffffff', 'rgba(0,0,0,0.35)');
    drawText(ctx, `PP ${current.pp}/${current.maxPp}`, x + 8, DIALOGUE_BOX.y + 20, UI.ink, UI.shadow);
    drawText(ctx, move.power ? `POW ${move.power}` : 'STATUS', x + 8, DIALOGUE_BOX.y + 32, UI.inkDim, null);
  }
}

