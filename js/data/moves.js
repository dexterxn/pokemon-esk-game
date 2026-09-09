// category: 'physical' | 'special' | 'status'
// effect fields are optional and read by the battle engine.
export const MOVES = {
  tackle:      { name: 'Tackle',       type: 'normal',   category: 'physical', power: 40, accuracy: 100, pp: 35 },
  scratch:     { name: 'Scratch',      type: 'normal',   category: 'physical', power: 40, accuracy: 100, pp: 35 },
  pound:       { name: 'Pound',        type: 'normal',   category: 'physical', power: 40, accuracy: 100, pp: 35 },
  quickattack: { name: 'Quick Attack', type: 'normal',   category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1 },
  bodyslam:    { name: 'Body Slam',    type: 'normal',   category: 'physical', power: 85, accuracy: 100, pp: 15, status: 'paralyze', statusChance: 0.3 },
  headbutt:    { name: 'Headbutt',     type: 'normal',   category: 'physical', power: 70, accuracy: 100, pp: 15, flinch: 0.3 },
  slam:        { name: 'Slam',         type: 'normal',   category: 'physical', power: 80, accuracy: 75,  pp: 20 },
  swift:       { name: 'Swift',        type: 'normal',   category: 'special',  power: 60, accuracy: 999, pp: 20 },
  growl:       { name: 'Growl',        type: 'normal',   category: 'status',   power: 0,  accuracy: 100, pp: 40, stat: 'attack', stages: -1, target: 'foe' },
  tailwhip:    { name: 'Tail Whip',    type: 'normal',   category: 'status',   power: 0,  accuracy: 100, pp: 30, stat: 'defense', stages: -1, target: 'foe' },
  sandattack:  { name: 'Sand-Attack',  type: 'ground',   category: 'status',   power: 0,  accuracy: 100, pp: 15, stat: 'accuracy', stages: -1, target: 'foe' },
  harden:      { name: 'Harden',       type: 'normal',   category: 'status',   power: 0,  accuracy: 999, pp: 30, stat: 'defense', stages: 1, target: 'self' },
  growth:      { name: 'Growth',       type: 'normal',   category: 'status',   power: 0,  accuracy: 999, pp: 20, stat: 'spAttack', stages: 1, target: 'self' },
  agility:     { name: 'Agility',      type: 'psychic',  category: 'status',   power: 0,  accuracy: 999, pp: 30, stat: 'speed', stages: 2, target: 'self' },
  leer:        { name: 'Leer',         type: 'normal',   category: 'status',   power: 0,  accuracy: 100, pp: 30, stat: 'defense', stages: -1, target: 'foe' },

  ember:       { name: 'Ember',        type: 'fire',     category: 'special',  power: 40, accuracy: 100, pp: 25, status: 'burn', statusChance: 0.1 },
  flamethrower:{ name: 'Flamethrower', type: 'fire',     category: 'special',  power: 90, accuracy: 100, pp: 15, status: 'burn', statusChance: 0.1 },
  firepunch:   { name: 'Fire Punch',   type: 'fire',     category: 'physical', power: 75, accuracy: 100, pp: 15, status: 'burn', statusChance: 0.1 },

  watergun:    { name: 'Water Gun',    type: 'water',    category: 'special',  power: 40, accuracy: 100, pp: 25 },
  bubble:      { name: 'Bubble',       type: 'water',    category: 'special',  power: 40, accuracy: 100, pp: 30, stat: 'speed', stages: -1, target: 'foe', statChance: 0.1 },
  surf:        { name: 'Surf',         type: 'water',    category: 'special',  power: 95, accuracy: 100, pp: 15 },
  waterpulse:  { name: 'Water Pulse',  type: 'water',    category: 'special',  power: 60, accuracy: 100, pp: 20, status: 'confuse', statusChance: 0.2 },

  absorb:      { name: 'Absorb',       type: 'grass',    category: 'special',  power: 20, accuracy: 100, pp: 25, drain: 0.5 },
  megadrain:   { name: 'Mega Drain',   type: 'grass',    category: 'special',  power: 40, accuracy: 100, pp: 15, drain: 0.5 },
  vinewhip:    { name: 'Vine Whip',    type: 'grass',    category: 'physical', power: 45, accuracy: 100, pp: 25 },
  razorleaf:   { name: 'Razor Leaf',   type: 'grass',    category: 'physical', power: 55, accuracy: 95,  pp: 25, critBoost: true },
  bulletseed:  { name: 'Bullet Seed',  type: 'grass',    category: 'physical', power: 25, accuracy: 100, pp: 30, multiHit: true },
  leechseed:   { name: 'Leech Seed',   type: 'grass',    category: 'status',   power: 0,  accuracy: 90,  pp: 10, seed: true, target: 'foe' },
  synthesis:   { name: 'Synthesis',    type: 'grass',    category: 'status',   power: 0,  accuracy: 999, pp: 5,  heal: 0.5, target: 'self' },

  thundershock:{ name: 'Thunder Shock',type: 'electric', category: 'special',  power: 40, accuracy: 100, pp: 30, status: 'paralyze', statusChance: 0.1 },
  thunderbolt: { name: 'Thunderbolt',  type: 'electric', category: 'special',  power: 90, accuracy: 100, pp: 15, status: 'paralyze', statusChance: 0.1 },
  spark:       { name: 'Spark',        type: 'electric', category: 'physical', power: 65, accuracy: 100, pp: 20, status: 'paralyze', statusChance: 0.3 },

  gust:        { name: 'Gust',         type: 'flying',   category: 'special',  power: 40, accuracy: 100, pp: 35 },
  wingattack:  { name: 'Wing Attack',  type: 'flying',   category: 'physical', power: 60, accuracy: 100, pp: 35 },
  aerialace:   { name: 'Aerial Ace',   type: 'flying',   category: 'physical', power: 60, accuracy: 999, pp: 20 },
  peck:        { name: 'Peck',         type: 'flying',   category: 'physical', power: 35, accuracy: 100, pp: 35 },

  bite:        { name: 'Bite',         type: 'dark',     category: 'physical', power: 60, accuracy: 100, pp: 25, flinch: 0.3 },
  crunch:      { name: 'Crunch',       type: 'dark',     category: 'physical', power: 80, accuracy: 100, pp: 15 },
  faintattack: { name: 'Faint Attack', type: 'dark',     category: 'physical', power: 60, accuracy: 999, pp: 20 },
  howl:        { name: 'Howl',         type: 'normal',   category: 'status',   power: 0,  accuracy: 999, pp: 40, stat: 'attack', stages: 1, target: 'self' },

  confusion:   { name: 'Confusion',    type: 'psychic',  category: 'special',  power: 50, accuracy: 100, pp: 25, status: 'confuse', statusChance: 0.1 },
  psychic:     { name: 'Psychic',      type: 'psychic',  category: 'special',  power: 90, accuracy: 100, pp: 10, stat: 'spDefense', stages: -1, target: 'foe', statChance: 0.1 },
  hypnosis:    { name: 'Hypnosis',     type: 'psychic',  category: 'status',   power: 0,  accuracy: 60,  pp: 20, status: 'sleep', statusChance: 1, target: 'foe' },

  poisonsting: { name: 'Poison Sting', type: 'poison',   category: 'physical', power: 15, accuracy: 100, pp: 35, status: 'poison', statusChance: 0.3 },
  sludge:      { name: 'Sludge',       type: 'poison',   category: 'special',  power: 65, accuracy: 100, pp: 20, status: 'poison', statusChance: 0.3 },
  stringshot:  { name: 'String Shot',  type: 'bug',      category: 'status',   power: 0,  accuracy: 95,  pp: 40, stat: 'speed', stages: -1, target: 'foe' },
  bugbite:     { name: 'Bug Bite',     type: 'bug',      category: 'physical', power: 60, accuracy: 100, pp: 20 },
  furycutter:  { name: 'Fury Cutter',  type: 'bug',      category: 'physical', power: 40, accuracy: 95,  pp: 20 },

  rockthrow:   { name: 'Rock Throw',   type: 'rock',     category: 'physical', power: 50, accuracy: 90,  pp: 15 },
  rockslide:   { name: 'Rock Slide',   type: 'rock',     category: 'physical', power: 75, accuracy: 90,  pp: 10, flinch: 0.3 },
  magnitude:   { name: 'Magnitude',    type: 'ground',   category: 'physical', power: 70, accuracy: 100, pp: 30 },
  mudslap:     { name: 'Mud-Slap',     type: 'ground',   category: 'special',  power: 20, accuracy: 100, pp: 10, stat: 'accuracy', stages: -1, target: 'foe', statChance: 1 },
  dig:         { name: 'Dig',          type: 'ground',   category: 'physical', power: 80, accuracy: 100, pp: 10 },

  metalclaw:   { name: 'Metal Claw',   type: 'steel',    category: 'physical', power: 50, accuracy: 95,  pp: 35, stat: 'attack', stages: 1, target: 'self', statChance: 0.1 },
  irontail:    { name: 'Iron Tail',    type: 'steel',    category: 'physical', power: 100, accuracy: 75, pp: 15, stat: 'defense', stages: -1, target: 'foe', statChance: 0.3 },

  karatechop:  { name: 'Karate Chop',  type: 'fighting', category: 'physical', power: 50, accuracy: 100, pp: 25, critBoost: true },
  armthrust:   { name: 'Arm Thrust',   type: 'fighting', category: 'physical', power: 15, accuracy: 100, pp: 20, multiHit: true },
  brickbreak:  { name: 'Brick Break',  type: 'fighting', category: 'physical', power: 75, accuracy: 100, pp: 15 },
  doublekick:  { name: 'Double Kick',  type: 'fighting', category: 'physical', power: 30, accuracy: 100, pp: 30, multiHit: true, maxHits: 2 },

  icebeam:     { name: 'Ice Beam',     type: 'ice',      category: 'special',  power: 90, accuracy: 100, pp: 10, status: 'freeze', statusChance: 0.1 },
  powdersnow:  { name: 'Powder Snow',  type: 'ice',      category: 'special',  power: 40, accuracy: 100, pp: 25, status: 'freeze', statusChance: 0.1 },

  uproar:      { name: 'Uproar',       type: 'normal',   category: 'special',  power: 50, accuracy: 100, pp: 10 },
  astonish:    { name: 'Astonish',     type: 'ghost',    category: 'physical', power: 30, accuracy: 100, pp: 15, flinch: 0.3 },
  shadowball:  { name: 'Shadow Ball',  type: 'ghost',    category: 'special',  power: 80, accuracy: 100, pp: 15, stat: 'spDefense', stages: -1, target: 'foe', statChance: 0.2 },
};

export const getMove = (id) => MOVES[id];
