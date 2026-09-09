// Every Pokémon sprite in this game is described as a short list of vector
// shapes in a 32x32 sprite space. `render/sprites.js` rasterises them, snaps the
// alpha to hard edges and adds a 1px outline, which yields chunky pixel art
// without shipping a single image file. Shapes flagged `f` (face) are dropped
// when generating the back sprite, so the same data gives both views.

const E = (x, y, w, h, c) => ({ k: 'e', x, y, w, h, c });            // ellipse by bounding box
const R = (x, y, w, h, c) => ({ k: 'r', x, y, w, h, c });            // rectangle
const P = (c, ...pts) => ({ k: 'p', c, pts });                       // polygon
const F = (shape) => ({ ...shape, f: 1 });                           // face detail (front only)

/** A pair of eyes mirrored about the sprite's centre line (x = 16). */
const EYES = (x, y, r, white = '#ffffff', pupil = '#22252b') => [
  F(E(x - r, y - r, r * 2, r * 2, white)),
  F(E(32 - x - r, y - r, r * 2, r * 2, white)),
  F(E(x - r * 0.5, y - r * 0.45, r, r * 1.1, pupil)),
  F(E(32 - x - r * 0.5, y - r * 0.45, r, r * 1.1, pupil)),
];

/** Solid (pupil-less) eyes, for the beadier designs. */
const DOTS = (x, y, r, c = '#22252b') => [
  F(E(x - r, y - r, r * 2, r * 2, c)),
  F(E(32 - x - r, y - r, r * 2, r * 2, c)),
];

const MOUTH = (x, y, w, h, c = '#3a2b28') => F(E(x, y, w, h, c));

export const SPECIES = {
  treecko: {
    num: 1, name: 'Treecko', types: ['grass'], catchRate: 45, baseExp: 62, growth: 'slow',
    base: { hp: 40, attack: 45, defense: 35, spAttack: 65, spDefense: 55, speed: 70 },
    learnset: [[1, 'pound'], [1, 'leer'], [6, 'absorb'], [11, 'quickattack'], [16, 'megadrain'], [21, 'agility'], [26, 'razorleaf']],
    evolve: { level: 16, into: 'grovyle' },
    art: [
      P('#3f8a38', [21, 17], [31, 8], [31, 16], [23, 24]),
      E(6, 15, 6, 8, '#4f9c43'), E(20, 15, 6, 8, '#4f9c43'),
      E(10, 12, 13, 17, '#6cc257'),
      E(13, 17, 7, 10, '#d8f2ae'),
      E(8, 24, 7, 6, '#4f9c43'), E(17, 24, 7, 6, '#4f9c43'),
      E(7, 2, 18, 15, '#6cc257'),
      E(9, 11, 14, 5, '#8ad673'),
      ...EYES(11, 8, 3, '#f0dcd0', '#1f2329'),
      F(E(9.4, 6.6, 2.2, 2.2, '#e2564a')), F(E(20.4, 6.6, 2.2, 2.2, '#e2564a')),
      MOUTH(14, 13, 4, 2),
    ],
  },

  grovyle: {
    num: 2, name: 'Grovyle', types: ['grass'], catchRate: 45, baseExp: 142, growth: 'slow',
    base: { hp: 50, attack: 65, defense: 45, spAttack: 85, spDefense: 65, speed: 95 },
    learnset: [[1, 'pound'], [1, 'absorb'], [16, 'quickattack'], [20, 'furycutter'], [26, 'megadrain'], [32, 'agility'], [38, 'razorleaf'], [44, 'synthesis']],
    art: [
      P('#3f8a38', [20, 15], [31, 4], [31, 14], [24, 23]),
      P('#5fb84e', [2, 14], [10, 12], [9, 19]), P('#5fb84e', [30, 14], [22, 12], [23, 19]),
      E(10, 11, 13, 18, '#57b348'),
      E(13, 16, 7, 11, '#e0524a'),
      E(8, 24, 7, 6, '#3f8a38'), E(17, 24, 7, 6, '#3f8a38'),
      E(7, 2, 18, 14, '#57b348'),
      P('#3f8a38', [22, 3], [31, 0], [26, 9]),
      ...EYES(11, 8, 3, '#f5e6d8', '#1f2329'),
      F(E(9.4, 6.4, 2.4, 2.4, '#e2564a')), F(E(20.2, 6.4, 2.4, 2.4, '#e2564a')),
      MOUTH(14, 12, 4, 2),
    ],
  },

  torchic: {
    num: 3, name: 'Torchic', types: ['fire'], catchRate: 45, baseExp: 62, growth: 'slow',
    base: { hp: 45, attack: 60, defense: 40, spAttack: 70, spDefense: 50, speed: 45 },
    learnset: [[1, 'scratch'], [1, 'growl'], [7, 'ember'], [13, 'peck'], [19, 'sandattack'], [25, 'quickattack'], [31, 'flamethrower']],
    evolve: { level: 16, into: 'combusken' },
    art: [
      P('#f0b23c', [12, 1], [16, 6], [10, 6]), P('#f0b23c', [16, 0], [21, 6], [13, 6]),
      E(8, 12, 16, 15, '#f5a13f'),
      E(5, 15, 6, 9, '#e8863a'), E(21, 15, 6, 9, '#e8863a'),
      E(9, 4, 14, 13, '#f5a13f'),
      E(11, 22, 4, 7, '#d9762e'), E(17, 22, 4, 7, '#d9762e'),
      ...DOTS(11, 10, 2.6),
      F(E(10.2, 9.1, 1.2, 1.2, '#ffffff')), F(E(19.6, 9.1, 1.2, 1.2, '#ffffff')),
      F(P('#e8c04a', [14, 12], [18, 12], [16, 16])),
    ],
  },

  combusken: {
    num: 4, name: 'Combusken', types: ['fire', 'fighting'], catchRate: 45, baseExp: 142, growth: 'slow',
    base: { hp: 60, attack: 85, defense: 60, spAttack: 85, spDefense: 60, speed: 55 },
    learnset: [[1, 'scratch'], [1, 'ember'], [16, 'doublekick'], [21, 'peck'], [28, 'firepunch'], [34, 'brickbreak'], [42, 'flamethrower']],
    art: [
      P('#f2d24a', [11, 0], [17, 7], [8, 7]), P('#e8813a', [17, 1], [23, 8], [14, 8]),
      E(9, 12, 14, 16, '#f2c94a'),
      E(11, 15, 10, 11, '#e8823a'),
      E(4, 13, 6, 10, '#e8823a'), E(22, 13, 6, 10, '#e8823a'),
      E(9, 3, 14, 13, '#f2c94a'),
      E(10, 25, 5, 5, '#d9762e'), E(17, 25, 5, 5, '#d9762e'),
      ...DOTS(11, 9, 2.8),
      F(E(10.2, 8, 1.3, 1.3, '#ffffff')), F(E(19.4, 8, 1.3, 1.3, '#ffffff')),
      F(P('#c9a03a', [14, 11], [19, 11], [16, 15])),
    ],
  },

  mudkip: {
    num: 5, name: 'Mudkip', types: ['water'], catchRate: 45, baseExp: 62, growth: 'slow',
    base: { hp: 50, attack: 70, defense: 50, spAttack: 50, spDefense: 50, speed: 40 },
    learnset: [[1, 'tackle'], [1, 'growl'], [6, 'watergun'], [10, 'mudslap'], [15, 'bite'], [21, 'bubble'], [28, 'surf']],
    evolve: { level: 16, into: 'marshtomp' },
    art: [
      P('#4d7fc4', [22, 20], [31, 22], [24, 27]),
      E(7, 14, 18, 14, '#69a6e0'),
      E(11, 20, 10, 8, '#a8d4f2'),
      E(6, 4, 20, 15, '#69a6e0'),
      P('#3f6fb0', [13, 0], [19, 0], [16, 6]),
      P('#e8963c', [1, 9], [8, 8], [7, 15]), P('#e8963c', [31, 9], [24, 8], [25, 15]),
      E(7, 25, 6, 5, '#4d7fc4'), E(19, 25, 6, 5, '#4d7fc4'),
      ...DOTS(11, 10, 2.6),
      F(E(10.2, 9, 1.2, 1.2, '#ffffff')), F(E(19.6, 9, 1.2, 1.2, '#ffffff')),
      MOUTH(14, 14, 5, 2, '#2f4f7d'),
    ],
  },

  marshtomp: {
    num: 6, name: 'Marshtomp', types: ['water', 'ground'], catchRate: 45, baseExp: 142, growth: 'slow',
    base: { hp: 70, attack: 85, defense: 70, spAttack: 60, spDefense: 70, speed: 50 },
    learnset: [[1, 'tackle'], [1, 'watergun'], [16, 'mudslap'], [22, 'bite'], [28, 'magnitude'], [35, 'surf'], [42, 'irontail']],
    art: [
      P('#3f6fb0', [21, 18], [31, 20], [23, 27]),
      E(9, 12, 15, 17, '#5b95d4'),
      E(12, 18, 9, 10, '#c8e4f5'),
      E(4, 15, 6, 8, '#4d7fc4'), E(22, 15, 6, 8, '#4d7fc4'),
      E(7, 2, 18, 15, '#5b95d4'),
      P('#2f4f7d', [13, 0], [19, 0], [16, 5]),
      P('#e8963c', [2, 8], [9, 7], [8, 14]), P('#e8963c', [30, 8], [23, 7], [24, 14]),
      R(9, 20, 14, 2, '#2f4f7d'), R(11, 24, 10, 2, '#2f4f7d'),
      E(8, 25, 6, 5, '#3f6fb0'), E(18, 25, 6, 5, '#3f6fb0'),
      ...DOTS(11, 8, 2.7),
      F(E(10.2, 7, 1.2, 1.2, '#ffffff')), F(E(19.6, 7, 1.2, 1.2, '#ffffff')),
      MOUTH(14, 12, 5, 2, '#2f4f7d'),
    ],
  },

  poochyena: {
    num: 7, name: 'Poochyena', types: ['dark'], catchRate: 255, baseExp: 55, growth: 'medium',
    base: { hp: 35, attack: 55, defense: 35, spAttack: 30, spDefense: 30, speed: 35 },
    learnset: [[1, 'tackle'], [5, 'howl'], [9, 'sandattack'], [13, 'bite'], [17, 'leer'], [22, 'faintattack'], [29, 'crunch']],
    evolve: { level: 18, into: 'mightyena' },
    art: [
      P('#4a4a56', [21, 17], [31, 12], [30, 20], [23, 24]),
      E(6, 14, 20, 13, '#8d8d9c'),
      E(11, 19, 10, 8, '#63636f'),
      E(7, 3, 18, 15, '#4a4a56'),
      P('#4a4a56', [7, 6], [5, 0], [13, 4]), P('#4a4a56', [25, 6], [27, 0], [19, 4]),
      E(11, 12, 10, 7, '#8d8d9c'),
      E(6, 24, 6, 5, '#4a4a56'), E(11, 25, 5, 5, '#4a4a56'), E(20, 24, 6, 5, '#4a4a56'),
      ...EYES(11, 9, 2.8, '#f2e05a', '#1f2329'),
      MOUTH(14, 14, 4, 2, '#2b2b33'),
    ],
  },

  mightyena: {
    num: 8, name: 'Mightyena', types: ['dark'], catchRate: 127, baseExp: 128, growth: 'medium',
    base: { hp: 70, attack: 90, defense: 70, spAttack: 60, spDefense: 60, speed: 70 },
    learnset: [[1, 'tackle'], [1, 'bite'], [22, 'howl'], [27, 'faintattack'], [34, 'crunch'], [40, 'swift'], [47, 'bodyslam']],
    art: [
      P('#2f2f38', [22, 15], [31, 8], [31, 17], [24, 23]),
      E(4, 13, 24, 15, '#3b3b46'),
      E(10, 19, 12, 9, '#9a9aa8'),
      E(6, 2, 20, 16, '#3b3b46'),
      P('#2f2f38', [6, 5], [3, 0], [12, 3]), P('#2f2f38', [26, 5], [29, 0], [20, 3]),
      P('#9a9aa8', [9, 12], [23, 12], [16, 19]),
      E(4, 24, 7, 6, '#2f2f38'), E(12, 25, 6, 5, '#2f2f38'), E(21, 24, 7, 6, '#2f2f38'),
      ...EYES(11, 8, 3, '#f2e05a', '#1f2329'),
      MOUTH(14, 13, 5, 2, '#22222a'),
    ],
  },

  zigzagoon: {
    num: 9, name: 'Zigzagoon', types: ['normal'], catchRate: 255, baseExp: 60, growth: 'medium',
    base: { hp: 38, attack: 30, defense: 41, spAttack: 30, spDefense: 41, speed: 60 },
    learnset: [[1, 'tackle'], [1, 'growl'], [5, 'tailwhip'], [9, 'headbutt'], [13, 'sandattack'], [17, 'bite'], [23, 'bodyslam']],
    evolve: { level: 20, into: 'linoone' },
    art: [
      P('#8a6a45', [22, 18], [31, 14], [30, 22], [24, 25]),
      E(5, 15, 22, 13, '#c9a870'),
      R(8, 16, 4, 3, '#8a6a45'), R(14, 15, 4, 3, '#8a6a45'), R(20, 16, 4, 3, '#8a6a45'),
      R(10, 22, 4, 3, '#8a6a45'), R(17, 22, 4, 3, '#8a6a45'),
      E(8, 5, 17, 14, '#c9a870'),
      P('#8a6a45', [9, 7], [7, 2], [14, 5]), P('#8a6a45', [24, 7], [26, 2], [19, 5]),
      R(10, 8, 13, 3, '#8a6a45'),
      E(7, 25, 5, 5, '#8a6a45'), E(20, 25, 5, 5, '#8a6a45'),
      ...DOTS(12, 13, 2.5),
      F(E(11.4, 12.2, 1.1, 1.1, '#ffffff')), F(E(19.6, 12.2, 1.1, 1.1, '#ffffff')),
      MOUTH(14, 16, 4, 2, '#5f4630'),
    ],
  },

  linoone: {
    num: 10, name: 'Linoone', types: ['normal'], catchRate: 90, baseExp: 128, growth: 'medium',
    base: { hp: 78, attack: 70, defense: 61, spAttack: 50, spDefense: 61, speed: 100 },
    learnset: [[1, 'tackle'], [1, 'headbutt'], [23, 'furycutter'], [29, 'bodyslam'], [36, 'slam'], [43, 'crunch'], [50, 'swift']],
    art: [
      P('#8a6a45', [24, 16], [31, 10], [31, 18], [25, 23]),
      E(2, 14, 27, 13, '#eae0d2'),
      R(6, 15, 5, 3, '#7d5f3f'), R(14, 14, 5, 3, '#7d5f3f'), R(22, 15, 5, 3, '#7d5f3f'),
      R(9, 21, 5, 3, '#7d5f3f'), R(18, 21, 5, 3, '#7d5f3f'),
      E(8, 3, 17, 15, '#eae0d2'),
      P('#7d5f3f', [9, 5], [7, 0], [14, 3]), P('#7d5f3f', [24, 5], [26, 0], [19, 3]),
      R(10, 6, 13, 3, '#7d5f3f'),
      E(4, 24, 5, 6, '#7d5f3f'), E(23, 24, 5, 6, '#7d5f3f'),
      ...DOTS(12, 11, 2.6),
      F(E(11.4, 10.2, 1.2, 1.2, '#ffffff')), F(E(19.4, 10.2, 1.2, 1.2, '#ffffff')),
      MOUTH(14, 14, 5, 2, '#5f4630'),
    ],
  },

  wurmple: {
    num: 11, name: 'Wurmple', types: ['bug'], catchRate: 255, baseExp: 54, growth: 'medium',
    base: { hp: 45, attack: 45, defense: 35, spAttack: 20, spDefense: 30, speed: 20 },
    learnset: [[1, 'tackle'], [1, 'stringshot'], [5, 'poisonsting'], [10, 'bugbite'], [15, 'harden'], [20, 'furycutter']],
    art: [
      E(3, 16, 9, 9, '#d4544e'), E(9, 15, 9, 10, '#e0655e'), E(15, 14, 10, 11, '#e0655e'),
      E(19, 8, 12, 13, '#e0655e'),
      E(22, 12, 6, 6, '#f2d24a'),
      P('#f2d24a', [21, 8], [19, 2], [24, 6]), P('#f2d24a', [29, 8], [31, 2], [26, 6]),
      E(4, 21, 4, 4, '#f2d24a'), E(11, 22, 4, 4, '#f2d24a'), E(18, 22, 4, 4, '#f2d24a'),
      F(E(23, 11, 3.4, 3.4, '#ffffff')), F(E(24, 12, 2, 2.4, '#1f2329')),
      F(E(27.5, 12, 2.6, 3, '#1f2329')),
    ],
  },

  taillow: {
    num: 12, name: 'Taillow', types: ['normal', 'flying'], catchRate: 200, baseExp: 59, growth: 'medium',
    base: { hp: 40, attack: 55, defense: 30, spAttack: 30, spDefense: 30, speed: 85 },
    learnset: [[1, 'peck'], [4, 'growl'], [8, 'quickattack'], [13, 'wingattack'], [19, 'sandattack'], [26, 'aerialace']],
    evolve: { level: 22, into: 'swellow' },
    art: [
      P('#3f6fb0', [10, 22], [2, 30], [12, 27]), P('#3f6fb0', [22, 22], [30, 30], [20, 27]),
      E(8, 11, 16, 16, '#4d86cc'),
      E(11, 16, 10, 10, '#f2ede0'),
      E(8, 3, 16, 14, '#4d86cc'),
      P('#d9524a', [10, 10], [16, 4], [22, 10], [16, 13]),
      P('#e8b03c', [15, 12], [21, 15], [15, 17]),
      ...DOTS(11, 9, 2.6),
      F(E(10.2, 8.1, 1.2, 1.2, '#ffffff')), F(E(19.6, 8.1, 1.2, 1.2, '#ffffff')),
      E(2, 14, 7, 8, '#3f6fb0'), E(23, 14, 7, 8, '#3f6fb0'),
    ],
  },

  swellow: {
    num: 13, name: 'Swellow', types: ['normal', 'flying'], catchRate: 45, baseExp: 162, growth: 'medium',
    base: { hp: 60, attack: 85, defense: 60, spAttack: 50, spDefense: 50, speed: 125 },
    learnset: [[1, 'peck'], [1, 'wingattack'], [22, 'quickattack'], [30, 'aerialace'], [38, 'agility'], [45, 'bodyslam']],
    art: [
      P('#2f5fa0', [11, 20], [0, 31], [13, 26]), P('#2f5fa0', [21, 20], [32, 31], [19, 26]),
      E(9, 10, 14, 17, '#3f78c4'),
      E(12, 15, 8, 11, '#f5f0e4'),
      E(9, 2, 14, 13, '#3f78c4'),
      P('#d9524a', [10, 9], [16, 2], [22, 9], [16, 12]),
      P('#e8b03c', [15, 10], [22, 13], [15, 16]),
      ...DOTS(11, 7, 2.6),
      F(E(10.2, 6.1, 1.2, 1.2, '#ffffff')), F(E(19.6, 6.1, 1.2, 1.2, '#ffffff')),
      E(3, 12, 7, 9, '#2f5fa0'), E(22, 12, 7, 9, '#2f5fa0'),
    ],
  },

  wingull: {
    num: 14, name: 'Wingull', types: ['water', 'flying'], catchRate: 190, baseExp: 64, growth: 'medium',
    base: { hp: 40, attack: 30, defense: 30, spAttack: 55, spDefense: 30, speed: 85 },
    learnset: [[1, 'growl'], [1, 'watergun'], [8, 'gust'], [13, 'quickattack'], [20, 'wingattack'], [27, 'waterpulse']],
    art: [
      P('#7fa8d4', [9, 16], [0, 8], [10, 22]), P('#7fa8d4', [23, 16], [32, 8], [22, 22]),
      E(9, 12, 14, 15, '#f5f2ea'),
      E(9, 4, 14, 13, '#f5f2ea'),
      R(10, 12, 12, 3, '#5f8cbf'),
      P('#e8b03c', [15, 10], [23, 13], [15, 15]),
      E(12, 25, 3, 5, '#e8b03c'), E(17, 25, 3, 5, '#e8b03c'),
      ...DOTS(11, 9, 2.4),
      F(E(10.4, 8.2, 1.1, 1.1, '#ffffff')), F(E(19.8, 8.2, 1.1, 1.1, '#ffffff')),
    ],
  },

  ralts: {
    num: 15, name: 'Ralts', types: ['psychic'], catchRate: 235, baseExp: 70, growth: 'slow',
    base: { hp: 28, attack: 25, defense: 25, spAttack: 45, spDefense: 35, speed: 40 },
    learnset: [[1, 'growl'], [6, 'confusion'], [11, 'hypnosis'], [16, 'psychic'], [21, 'swift'], [26, 'agility']],
    evolve: { level: 20, into: 'kirlia' },
    art: [
      P('#f2f0f2', [11, 16], [21, 16], [24, 30], [8, 30]),
      E(11, 12, 10, 9, '#f2f0f2'),
      E(9, 5, 14, 12, '#f2f0f2'),
      P('#5fbf8a', [5, 10], [16, 1], [27, 10], [22, 12], [16, 7], [10, 12]),
      P('#5fbf8a', [4, 9], [10, 12], [5, 15]), P('#5fbf8a', [28, 9], [22, 12], [27, 15]),
      P('#e0524a', [14, 10], [18, 10], [16, 15]),
      MOUTH(14, 13, 4, 2, '#c98a86'),
      F(E(8, 24, 4, 4, '#f2f0f2')), F(E(20, 24, 4, 4, '#f2f0f2')),
    ],
  },

  kirlia: {
    num: 16, name: 'Kirlia', types: ['psychic'], catchRate: 120, baseExp: 140, growth: 'slow',
    base: { hp: 38, attack: 35, defense: 35, spAttack: 65, spDefense: 55, speed: 50 },
    learnset: [[1, 'confusion'], [1, 'growl'], [22, 'hypnosis'], [28, 'psychic'], [34, 'swift'], [40, 'shadowball']],
    art: [
      P('#f2f0f2', [13, 15], [19, 15], [27, 30], [5, 30]),
      E(12, 11, 8, 9, '#f2f0f2'),
      E(10, 3, 12, 12, '#f2f0f2'),
      P('#5fbf8a', [4, 8], [16, 0], [28, 8], [22, 10], [16, 5], [10, 10]),
      P('#5fbf8a', [3, 7], [11, 11], [4, 15]), P('#5fbf8a', [29, 7], [21, 11], [28, 15]),
      P('#e0524a', [14, 8], [18, 8], [16, 13]),
      R(7, 24, 18, 2, '#5fbf8a'),
      ...DOTS(13, 8, 1.8, '#c04a6a'),
      MOUTH(15, 11, 3, 2, '#c98a86'),
    ],
  },

  shroomish: {
    num: 17, name: 'Shroomish', types: ['grass'], catchRate: 255, baseExp: 65, growth: 'medium',
    base: { hp: 60, attack: 40, defense: 60, spAttack: 40, spDefense: 60, speed: 35 },
    learnset: [[1, 'absorb'], [1, 'tackle'], [7, 'leechseed'], [12, 'stringshot'], [18, 'megadrain'], [24, 'growth'], [30, 'bulletseed']],
    evolve: { level: 23, into: 'breloom' },
    art: [
      E(6, 12, 20, 17, '#e8dfae'),
      E(4, 4, 24, 15, '#d8cf9a'),
      E(7, 6, 6, 5, '#4f9c43'), E(19, 7, 6, 5, '#4f9c43'), E(13, 4, 7, 5, '#4f9c43'),
      E(9, 12, 5, 4, '#4f9c43'), E(19, 13, 5, 4, '#4f9c43'),
      E(8, 26, 6, 4, '#c9bd86'), E(18, 26, 6, 4, '#c9bd86'),
      ...DOTS(12, 18, 2.6),
      F(E(11.2, 17, 1.2, 1.2, '#ffffff')), F(E(19.6, 17, 1.2, 1.2, '#ffffff')),
      MOUTH(14, 22, 5, 2, '#8a7f52'),
    ],
  },

  breloom: {
    num: 18, name: 'Breloom', types: ['grass', 'fighting'], catchRate: 90, baseExp: 165, growth: 'medium',
    base: { hp: 60, attack: 130, defense: 80, spAttack: 60, spDefense: 60, speed: 70 },
    learnset: [[1, 'absorb'], [1, 'tackle'], [23, 'headbutt'], [28, 'megadrain'], [34, 'brickbreak'], [40, 'bulletseed'], [46, 'karatechop']],
    art: [
      P('#4f9c43', [21, 22], [30, 20], [24, 27]),
      E(10, 12, 13, 17, '#d8cf9a'),
      E(4, 4, 24, 13, '#4f9c43'),
      E(8, 5, 6, 5, '#e8dfae'), E(19, 6, 6, 5, '#e8dfae'), E(13, 3, 7, 5, '#e8dfae'),
      E(3, 15, 7, 7, '#4f9c43'), E(22, 15, 7, 7, '#4f9c43'),
      E(9, 25, 6, 5, '#c9bd86'), E(17, 25, 6, 5, '#c9bd86'),
      ...DOTS(12, 15, 2.5),
      F(E(11.4, 14.2, 1.1, 1.1, '#ffffff')), F(E(19.6, 14.2, 1.1, 1.1, '#ffffff')),
      MOUTH(14, 19, 5, 2, '#8a7f52'),
    ],
  },

  marill: {
    num: 19, name: 'Marill', types: ['water'], catchRate: 190, baseExp: 88, growth: 'medium',
    base: { hp: 70, attack: 20, defense: 50, spAttack: 20, spDefense: 50, speed: 40 },
    learnset: [[1, 'tackle'], [1, 'watergun'], [7, 'tailwhip'], [12, 'bubble'], [18, 'bodyslam'], [24, 'waterpulse']],
    art: [
      P('#2f5fa0', [22, 22], [29, 14], [31, 18], [25, 25]),
      E(28, 9, 6, 7, '#3f78c4'),
      E(5, 9, 22, 20, '#4d8ad4'),
      E(11, 20, 11, 9, '#f2f2f0'),
      E(3, 4, 8, 8, '#4d8ad4'), E(21, 4, 8, 8, '#4d8ad4'),
      E(5, 6, 4, 4, '#e05a72'), E(23, 6, 4, 4, '#e05a72'),
      ...DOTS(12, 15, 2.6),
      F(E(11.2, 14.1, 1.2, 1.2, '#ffffff')), F(E(19.6, 14.1, 1.2, 1.2, '#ffffff')),
      MOUTH(14, 19, 5, 2, '#2f5fa0'),
    ],
  },

  geodude: {
    num: 20, name: 'Geodude', types: ['rock', 'ground'], catchRate: 255, baseExp: 86, growth: 'medium',
    base: { hp: 40, attack: 80, defense: 100, spAttack: 30, spDefense: 30, speed: 20 },
    learnset: [[1, 'tackle'], [4, 'harden'], [8, 'rockthrow'], [14, 'magnitude'], [20, 'dig'], [26, 'rockslide']],
    art: [
      P('#8a8a8a', [7, 8], [16, 3], [26, 9], [27, 20], [17, 27], [6, 20]),
      P('#a8a8a8', [9, 9], [16, 5], [23, 10], [23, 18], [16, 23], [9, 18]),
      P('#6f6f6f', [0, 12], [7, 11], [8, 18], [1, 20]),
      P('#6f6f6f', [32, 12], [25, 11], [24, 18], [31, 20]),
      R(3, 18, 5, 3, '#6f6f6f'), R(24, 18, 5, 3, '#6f6f6f'),
      ...EYES(12, 13, 3, '#f2f2f2', '#1f2329'),
      F(P('#3a3a3a', [8, 9], [16, 12], [8, 12])), F(P('#3a3a3a', [24, 9], [16, 12], [24, 12])),
      MOUTH(13, 19, 6, 2, '#3a3a3a'),
    ],
  },

  whismur: {
    num: 21, name: 'Whismur', types: ['normal'], catchRate: 190, baseExp: 68, growth: 'medium',
    base: { hp: 64, attack: 51, defense: 23, spAttack: 51, spDefense: 23, speed: 28 },
    learnset: [[1, 'pound'], [5, 'uproar'], [11, 'astonish'], [15, 'howl'], [20, 'slam'], [25, 'bodyslam']],
    evolve: { level: 20, into: 'loudred' },
    art: [
      E(7, 10, 18, 19, '#e8a8c4'),
      E(0, 3, 11, 15, '#e8a8c4'), E(21, 3, 11, 15, '#e8a8c4'),
      E(2, 6, 6, 9, '#f2d24a'), E(24, 6, 6, 9, '#f2d24a'),
      E(11, 22, 4, 6, '#d48ba8'), E(17, 22, 4, 6, '#d48ba8'),
      ...DOTS(12, 15, 1.8),
      F(E(12, 19, 8, 7, '#5c3a4a')), F(E(13, 20, 6, 4, '#e0708a')),
    ],
  },

  loudred: {
    num: 22, name: 'Loudred', types: ['normal'], catchRate: 120, baseExp: 126, growth: 'medium',
    base: { hp: 84, attack: 71, defense: 43, spAttack: 71, spDefense: 43, speed: 39 },
    learnset: [[1, 'pound'], [1, 'uproar'], [23, 'howl'], [29, 'slam'], [36, 'bodyslam'], [43, 'crunch']],
    art: [
      E(6, 10, 20, 19, '#4d7fc4'),
      E(9, 17, 14, 12, '#7fa8d4'),
      E(0, 4, 10, 13, '#3f6fb0'), E(22, 4, 10, 13, '#3f6fb0'),
      E(2, 7, 6, 7, '#f2d24a'), E(24, 7, 6, 7, '#f2d24a'),
      E(6, 25, 6, 5, '#2f5fa0'), E(20, 25, 6, 5, '#2f5fa0'),
      ...DOTS(12, 14, 2),
      F(E(11, 18, 10, 8, '#3a2b33')), F(E(12, 19, 8, 5, '#e0708a')),
    ],
  },

  makuhita: {
    num: 23, name: 'Makuhita', types: ['fighting'], catchRate: 180, baseExp: 87, growth: 'medium',
    base: { hp: 72, attack: 60, defense: 30, spAttack: 20, spDefense: 30, speed: 25 },
    learnset: [[1, 'tackle'], [4, 'armthrust'], [10, 'karatechop'], [16, 'harden'], [22, 'brickbreak'], [28, 'bodyslam']],
    art: [
      E(4, 8, 24, 21, '#e8c07a'),
      E(9, 14, 14, 13, '#f2d9a8'),
      R(6, 20, 20, 3, '#3a3a46'),
      E(0, 12, 8, 8, '#3a3a46'), E(24, 12, 8, 8, '#3a3a46'),
      E(8, 26, 6, 4, '#c9a05f'), E(18, 26, 6, 4, '#c9a05f'),
      P('#c9a05f', [11, 4], [16, 0], [21, 4], [16, 8]),
      ...DOTS(11, 12, 2.4),
      F(E(11, 16, 10, 5, '#8a5f3a')),
    ],
  },

  aron: {
    num: 24, name: 'Aron', types: ['steel', 'rock'], catchRate: 180, baseExp: 96, growth: 'slow',
    base: { hp: 50, attack: 70, defense: 100, spAttack: 40, spDefense: 40, speed: 30 },
    learnset: [[1, 'tackle'], [4, 'harden'], [9, 'metalclaw'], [13, 'headbutt'], [18, 'rockthrow'], [25, 'irontail']],
    evolve: { level: 32, into: 'lairon' },
    art: [
      E(6, 14, 20, 14, '#6f7a86'),
      E(5, 5, 22, 16, '#aeb6bf'),
      P('#8d97a3', [5, 12], [16, 18], [27, 12], [27, 16], [16, 21], [5, 16]),
      P('#aeb6bf', [12, 3], [16, 0], [20, 3]),
      E(6, 25, 6, 5, '#5c6570'), E(20, 25, 6, 5, '#5c6570'),
      E(10, 26, 5, 4, '#5c6570'), E(17, 26, 5, 4, '#5c6570'),
      ...DOTS(12, 10, 2.4, '#2f3640'),
      F(E(11.4, 9.2, 1.1, 1.1, '#ffffff')), F(E(19.4, 9.2, 1.1, 1.1, '#ffffff')),
      MOUTH(13, 15, 6, 2, '#3a4149'),
    ],
  },

  lairon: {
    num: 25, name: 'Lairon', types: ['steel', 'rock'], catchRate: 90, baseExp: 152, growth: 'slow',
    base: { hp: 60, attack: 90, defense: 140, spAttack: 50, spDefense: 50, speed: 40 },
    learnset: [[1, 'tackle'], [1, 'metalclaw'], [32, 'headbutt'], [38, 'rockslide'], [45, 'irontail'], [52, 'magnitude']],
    art: [
      E(3, 13, 26, 16, '#5c6570'),
      E(4, 3, 24, 17, '#9aa4b0'),
      P('#7d8792', [4, 11], [16, 18], [28, 11], [28, 15], [16, 22], [4, 15]),
      P('#c9d0d8', [7, 4], [4, 0], [12, 3]), P('#c9d0d8', [25, 4], [28, 0], [20, 3]),
      R(8, 22, 16, 3, '#7d8792'),
      E(3, 25, 7, 5, '#4a525b'), E(22, 25, 7, 5, '#4a525b'),
      ...DOTS(12, 9, 2.6, '#2f3640'),
      F(E(11.2, 8, 1.2, 1.2, '#ffffff')), F(E(19.6, 8, 1.2, 1.2, '#ffffff')),
      MOUTH(12, 14, 8, 2, '#333a42'),
    ],
  },

  skitty: {
    num: 26, name: 'Skitty', types: ['normal'], catchRate: 255, baseExp: 65, growth: 'medium',
    base: { hp: 50, attack: 45, defense: 45, spAttack: 35, spDefense: 35, speed: 50 },
    learnset: [[1, 'tackle'], [1, 'growl'], [7, 'tailwhip'], [13, 'headbutt'], [19, 'bite'], [25, 'doublekick'], [31, 'bodyslam']],
    art: [
      P('#e8b6c4', [21, 20], [30, 24], [24, 27]),
      E(26, 20, 7, 7, '#f2d0da'),
      E(8, 14, 16, 14, '#f2d0da'),
      E(6, 5, 20, 16, '#f2d0da'),
      P('#f2d0da', [6, 8], [3, 0], [13, 5]), P('#f2d0da', [26, 8], [29, 0], [19, 5]),
      P('#e08aa0', [7, 7], [6, 2], [11, 6]), P('#e08aa0', [25, 7], [26, 2], [21, 6]),
      E(9, 25, 5, 4, '#e8b6c4'), E(18, 25, 5, 4, '#e8b6c4'),
      ...EYES(11, 11, 3, '#ffffff', '#3a2b33'),
      F(E(14, 15, 4, 3, '#e08aa0')),
      F(E(6, 14, 4, 3, '#e8a0b4')), F(E(22, 14, 4, 3, '#e8a0b4')),
    ],
  },
};

// Give every species an id matching its key so a Pokémon can carry just the id.
for (const [id, sp] of Object.entries(SPECIES)) sp.id = id;

export const SPECIES_LIST = Object.values(SPECIES).sort((a, b) => a.num - b.num);
export const getSpecies = (id) => SPECIES[id];
export const DEX_SIZE = SPECIES_LIST.length;
