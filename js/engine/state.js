import { START_MAP, START_POS } from '../data/maps.js';
import { MAX_PARTY, createPokemon, fullyHeal, speciesOf } from './pokemon.js';

/** The single mutable game state object. Everything savable lives here. */
export const state = {
  player: {
    name: 'RED',
    x: START_POS.x,
    y: START_POS.y,
    dir: START_POS.dir,
    map: START_MAP,
    money: 3000,
    badges: [],
    steps: 0,
    playTime: 0,
  },
  party: [],
  box: [],
  bag: { pokeball: 5, potion: 3 },
  dex: { seen: {}, caught: {} },
  flags: {},
  lastCenter: null,
};

export function resetState() {
  Object.assign(state.player, {
    name: 'RED', x: START_POS.x, y: START_POS.y, dir: START_POS.dir,
    map: START_MAP, money: 3000, badges: [], steps: 0, playTime: 0,
  });
  state.party = [];
  state.box = [];
  state.bag = { pokeball: 5, potion: 3 };
  state.dex = { seen: {}, caught: {} };
  state.flags = {};
  state.lastCenter = null;
}

// ------------------------------------------------------------------- the bag

export function addItem(id, count = 1) {
  state.bag[id] = (state.bag[id] || 0) + count;
}

export function removeItem(id, count = 1) {
  if (!state.bag[id]) return false;
  state.bag[id] -= count;
  if (state.bag[id] <= 0) delete state.bag[id];
  return true;
}

export const itemCount = (id) => state.bag[id] || 0;
export const bagEntries = () => Object.entries(state.bag).filter(([, n]) => n > 0);

export function spendMoney(amount) {
  if (state.player.money < amount) return false;
  state.player.money -= amount;
  return true;
}

export const earnMoney = (amount) => { state.player.money = Math.min(999999, state.player.money + amount); };

// ----------------------------------------------------------------- the party

/** Add to the party, or to the box when the party is full. Returns where it went. */
export function addToParty(mon) {
  registerCaught(mon.species);
  if (state.party.length < MAX_PARTY) {
    state.party.push(mon);
    return 'party';
  }
  state.box.push(mon);
  return 'box';
}

export const healParty = () => state.party.forEach(fullyHeal);
export const partyAlive = () => state.party.some((m) => m.hp > 0);
export const firstAlive = () => state.party.find((m) => m.hp > 0) || null;

/** Give the player their starter and log the first dex entry. */
export function giveStarter(speciesId) {
  const mon = createPokemon(speciesId, 5);
  addToParty(mon);
  state.flags.gotStarter = true;
  return mon;
}

// ------------------------------------------------------------------- the dex

export function registerSeen(speciesId) {
  state.dex.seen[speciesId] = true;
}

export function registerCaught(speciesId) {
  state.dex.seen[speciesId] = true;
  state.dex.caught[speciesId] = true;
}

export const dexSeenCount = () => Object.keys(state.dex.seen).length;
export const dexCaughtCount = () => Object.keys(state.dex.caught).length;

// ------------------------------------------------------------------- helpers

export const hasFlag = (key) => !!state.flags[key];
export const setFlag = (key, value = true) => { state.flags[key] = value; };

export const hasBadge = (name) => state.player.badges.includes(name);
export function awardBadge(name) {
  if (!hasBadge(name)) state.player.badges.push(name);
}

/** "1:04" style play clock, driven by the main loop. */
export function formatPlayTime() {
  const total = Math.floor(state.player.playTime);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export const partyLabel = (mon) => `${speciesOf(mon).name} Lv${mon.level}`;
