import { getSpecies } from '../data/species.js';
import { getMove } from '../data/moves.js';
import { typeEffectiveness } from '../data/types.js';
import { randInt, clamp } from '../core/util.js';

export const MAX_PARTY = 6;
export const STAT_KEYS = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];

export const STATUS_LABELS = {
  poison: 'PSN', burn: 'BRN', paralyze: 'PAR', sleep: 'SLP', freeze: 'FRZ',
};

/** Total experience required to reach `level` on a growth curve. */
export function expForLevel(level, growth) {
  const n = Math.max(1, level);
  return growth === 'slow' ? Math.floor(1.25 * n * n * n) : n * n * n;
}

function calcStats(species, level, ivs) {
  const b = species.base;
  const stats = {};
  stats.hp = Math.floor(((2 * b.hp + ivs.hp) * level) / 100) + level + 10;
  for (const key of STAT_KEYS.slice(1)) {
    stats[key] = Math.floor(((2 * b[key] + ivs[key]) * level) / 100) + 5;
  }
  return stats;
}

/** Every move the species knows by `level`, capped at the newest four. */
export function movesAtLevel(species, level) {
  const known = species.learnset.filter(([lv]) => lv <= level).map(([, id]) => id);
  const unique = [...new Set(known)];
  return unique.slice(-4);
}

export function makeMoveSlot(id) {
  const move = getMove(id);
  return { id, pp: move.pp, maxPp: move.pp };
}

/** Create a fresh Pokémon instance. */
export function createPokemon(speciesId, level, opts = {}) {
  const species = getSpecies(speciesId);
  const ivs = {};
  for (const key of STAT_KEYS) ivs[key] = opts.ivs?.[key] ?? randInt(0, 31);
  const stats = calcStats(species, level, ivs);

  return {
    species: speciesId,
    nickname: opts.nickname || null,
    level,
    exp: expForLevel(level, species.growth),
    ivs,
    stats,
    hp: stats.hp,
    status: null,
    sleepTurns: 0,
    moves: (opts.moves || movesAtLevel(species, level)).map(makeMoveSlot),
    originalTrainer: opts.wild ? null : 'you',
  };
}

export const speciesOf = (mon) => getSpecies(mon.species);
export const displayName = (mon) => mon.nickname || speciesOf(mon).name;
export const maxHp = (mon) => mon.stats.hp;
export const isFainted = (mon) => mon.hp <= 0;

/** Recompute stats after a level change, keeping current HP damage proportional. */
export function refreshStats(mon) {
  const before = mon.stats.hp;
  mon.stats = calcStats(speciesOf(mon), mon.level, mon.ivs);
  mon.hp = clamp(mon.hp + (mon.stats.hp - before), 1, mon.stats.hp);
}

export const expToNext = (mon) => {
  const growth = speciesOf(mon).growth;
  return Math.max(0, expForLevel(mon.level + 1, growth) - mon.exp);
};

export const expProgress = (mon) => {
  const growth = speciesOf(mon).growth;
  const base = expForLevel(mon.level, growth);
  const next = expForLevel(mon.level + 1, growth);
  return next === base ? 0 : clamp((mon.exp - base) / (next - base), 0, 1);
};

/**
 * Award experience and level up as far as it goes.
 * @returns {{levels: number[], learned: string[], evolveTo: string|null}}
 */
export function gainExp(mon, amount) {
  const species = speciesOf(mon);
  const result = { levels: [], learned: [], evolveTo: null };
  mon.exp += amount;

  while (mon.level < 100 && mon.exp >= expForLevel(mon.level + 1, species.growth)) {
    mon.level++;
    refreshStats(mon);
    result.levels.push(mon.level);

    for (const [lv, moveId] of species.learnset) {
      if (lv !== mon.level) continue;
      if (mon.moves.some((m) => m.id === moveId)) continue;
      if (mon.moves.length < 4) {
        mon.moves.push(makeMoveSlot(moveId));
      } else {
        // Keeping it simple: the newest move replaces the oldest slot.
        mon.moves.shift();
        mon.moves.push(makeMoveSlot(moveId));
      }
      result.learned.push(moveId);
    }

    if (species.evolve && mon.level >= species.evolve.level) result.evolveTo = species.evolve.into;
  }
  return result;
}

/** Apply an evolution in place, relearning nothing but keeping HP proportional. */
export function evolveInto(mon, newSpeciesId) {
  const ratio = mon.hp / mon.stats.hp;
  mon.species = newSpeciesId;
  mon.stats = calcStats(getSpecies(newSpeciesId), mon.level, mon.ivs);
  mon.hp = Math.max(1, Math.round(mon.stats.hp * ratio));
}

/** Experience the winner gets for beating `loser`. */
export function expYield(loser, isTrainerBattle) {
  const base = speciesOf(loser).baseExp;
  return Math.max(1, Math.floor((base * loser.level) / 7 * (isTrainerBattle ? 1.5 : 1)));
}

// ---------------------------------------------------------------- battle math

const STAGE_MULT = [0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const ACC_STAGE_MULT = [0.33, 0.36, 0.43, 0.5, 0.6, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];

export const stageMultiplier = (stage) => STAGE_MULT[clamp(stage, -6, 6) + 6];
export const accuracyMultiplier = (stage) => ACC_STAGE_MULT[clamp(stage, -6, 6) + 6];

/** Effective stat for a combatant, including stat stages and status. */
export function effectiveStat(combatant, key) {
  const raw = combatant.mon.stats[key];
  let value = raw * stageMultiplier(combatant.stages[key] || 0);
  if (key === 'attack' && combatant.mon.status === 'burn') value *= 0.5;
  if (key === 'speed' && combatant.mon.status === 'paralyze') value *= 0.25;
  return Math.max(1, Math.floor(value));
}

/**
 * Full damage roll for one hit.
 * @returns {{damage: number, effectiveness: number, critical: boolean}}
 */
export function computeDamage(attacker, defender, move) {
  const defTypes = speciesOf(defender.mon).types;
  const effectiveness = typeEffectiveness(move.type, defTypes);
  if (effectiveness === 0) return { damage: 0, effectiveness, critical: false };

  const physical = move.category === 'physical';
  const atk = effectiveStat(attacker, physical ? 'attack' : 'spAttack');
  const def = effectiveStat(defender, physical ? 'defense' : 'spDefense');

  const critRate = move.critBoost ? 0.125 : 0.0625;
  const critical = Math.random() < critRate;

  let damage = Math.floor(Math.floor((Math.floor((2 * attacker.mon.level) / 5 + 2) * move.power * atk) / def) / 50) + 2;
  if (critical) damage *= 2;
  if (speciesOf(attacker.mon).types.includes(move.type)) damage = Math.floor(damage * 1.5);
  damage = Math.floor(damage * effectiveness);
  damage = Math.floor((damage * randInt(85, 100)) / 100);

  return { damage: Math.max(1, damage), effectiveness, critical };
}

/** Does the move connect? `accuracy: 999` marks moves that never miss. */
export function moveHits(attacker, defender, move) {
  if (move.accuracy >= 999) return true;
  const acc = accuracyMultiplier(attacker.stages.accuracy || 0);
  const eva = accuracyMultiplier(defender.stages.evasion || 0);
  return Math.random() * 100 < move.accuracy * (acc / eva);
}

/**
 * Gen-3 style capture check.
 * @returns {{caught: boolean, shakes: number}}
 */
export function catchAttempt(mon, ballRate) {
  const species = speciesOf(mon);
  const statusBonus = mon.status === 'sleep' || mon.status === 'freeze' ? 2
    : mon.status ? 1.5 : 1;

  const a = ((3 * mon.stats.hp - 2 * mon.hp) * species.catchRate * ballRate * statusBonus) / (3 * mon.stats.hp);
  if (a >= 255) return { caught: true, shakes: 4 };

  const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a)));
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (randInt(0, 65535) >= b) return { caught: false, shakes };
    shakes++;
  }
  return { caught: true, shakes: 4 };
}

/** Chance the player escapes a wild battle, Gen-3 formula with an attempt counter. */
export function escapeChance(playerSpeed, foeSpeed, attempts) {
  if (playerSpeed > foeSpeed) return 1;
  // Gen 3 escapes outright once the odds pass 255; they must not wrap around.
  const odds = Math.floor((playerSpeed * 128) / Math.max(1, foeSpeed)) + 30 * attempts;
  return odds > 255 ? 1 : odds / 256;
}

/** Residual damage at end of turn from burn/poison. Returns HP lost. */
export function residualDamage(mon) {
  if (mon.status === 'burn' || mon.status === 'poison') {
    return Math.max(1, Math.floor(mon.stats.hp / (mon.status === 'burn' ? 16 : 8)));
  }
  return 0;
}

export function healPokemon(mon, amount) {
  const before = mon.hp;
  mon.hp = Math.min(mon.stats.hp, mon.hp + amount);
  return mon.hp - before;
}

export function fullyHeal(mon) {
  mon.hp = mon.stats.hp;
  mon.status = null;
  mon.sleepTurns = 0;
  for (const slot of mon.moves) slot.pp = slot.maxPp;
}
