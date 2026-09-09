// Maps are authored as arrays of equal-length strings, one character per tile.
// See render/tiles.js for the character legend.

/** Pokémon Center interior — one per town so the exit warp knows where to go. */
const centerMap = (id, town, exitX, exitY) => ({
  id, name: 'Pokémon Center', kind: 'indoor', music: 'indoor',
  rows: [
    '____________',
    '_ffffffffff_',
    '_fCCCCCffff_',
    '_ffffffffff_',
    '_fffffffPPf_',
    '_ffffffffff_',
    '_fpffffffpf_',
    '_ffffefffff_',
    '____________',
  ],
  warps: [{ x: 5, y: 7, to: town, tx: exitX, ty: exitY, dir: 'down' }],
  npcs: [
    { x: 4, y: 1, dir: 'down', palette: 'nurse', name: 'Nurse Joy', script: 'heal' },
    { x: 9, y: 5, dir: 'left', palette: 'townsman', name: 'Trainer',
      lines: ['The PC in the corner stores your Pokémon records.', 'Resting here restores your whole party for free!'] },
  ],
  signs: {},
});

/** Poké Mart interior. */
const martMap = (id, town, exitX, exitY) => ({
  id, name: 'Poké Mart', kind: 'indoor', music: 'indoor',
  rows: [
    '__________',
    '_ffffffff_',
    '_fCCCfMMf_',
    '_ffffffff_',
    '_ffffffff_',
    '_fpffffpf_',
    '_fffeffff_',
    '__________',
  ],
  warps: [{ x: 4, y: 6, to: town, tx: exitX, ty: exitY, dir: 'down' }],
  npcs: [
    { x: 3, y: 1, dir: 'down', palette: 'clerk', name: 'Clerk', script: 'mart' },
    { x: 7, y: 4, dir: 'left', palette: 'lass', name: 'Shopper',
      lines: ['Great Balls catch better than regular Poké Balls.', "They're worth the extra money on a tough catch."] },
  ],
  signs: {},
});

export const MAPS = {
  littleroot: {
    id: 'littleroot', name: 'Littleroot Town', kind: 'town', music: 'town',
    rows: [
      '###########=############',
      '#..........=...........#',
      '#..F.......=......F....#',
      '#..RRRRR...=...RRRRR...#',
      '#..rrrrr...=...rrrrr...#',
      '#..VWDWV...=...VWDWV...#',
      '#..S.......=......S....#',
      '#..........=...........#',
      '#....FF....=....FF.....#',
      '#..........=...........#',
      '#...|||....=....|||....#',
      '#..........=...........#',
      '#..........=...........#',
      '#..........=.RRRRRRRR..#',
      '#..........=.rrrrrrrr..#',
      '#..........=.WVVDVVWV..#',
      '#..........=...........#',
      '#....FF....=......FF...#',
      '#..........=...........#',
      '########################',
    ],
    warps: [
      { x: 5, y: 5, to: 'player_house', tx: 4, ty: 5, dir: 'down' },
      { x: 17, y: 5, to: 'rival_house', tx: 4, ty: 5, dir: 'down' },
      { x: 16, y: 15, to: 'lab', tx: 6, ty: 6, dir: 'down' },
      { x: 11, y: 0, to: 'route101', tx: 10, ty: 22, dir: 'up' },
    ],
    npcs: [
      { x: 8, y: 9, dir: 'down', palette: 'townsman', name: 'Man', movement: 'wander',
        lines: ['LITTLEROOT TOWN.', 'A town that can\'t be shaded any hue.'] },
      { x: 14, y: 17, dir: 'left', palette: 'lass', name: 'Girl',
        lines: ['PROF. BIRCH studies Pokémon habitats.', 'His lab is just south of here!'] },
    ],
    signs: {
      '3,6': "PLAYER'S HOUSE",
      '18,6': "RIVAL'S HOUSE",
    },
  },

  player_house: {
    id: 'player_house', name: 'Your House', kind: 'indoor', music: 'indoor',
    rows: [
      '__________',
      '_Pbbffftt_',
      '_ffffffBB_',
      '_ffffffff_',
      '_ffffffff_',
      '_fpffffpf_',
      '_fffeffff_',
      '__________',
    ],
    warps: [{ x: 4, y: 6, to: 'littleroot', tx: 5, ty: 6, dir: 'down' }],
    npcs: [
      { x: 6, y: 3, dir: 'down', palette: 'lass', name: 'Mom', script: 'mom' },
    ],
    signs: { '1,1': 'A Pokémon storage PC. It hums quietly.' },
  },

  rival_house: {
    id: 'rival_house', name: 'Neighbour\'s House', kind: 'indoor', music: 'indoor',
    rows: [
      '__________',
      '_ftffffBB_',
      '_ffffffff_',
      '_fbbfffff_',
      '_ffffffff_',
      '_fpffffpf_',
      '_fffeffff_',
      '__________',
    ],
    warps: [{ x: 4, y: 6, to: 'littleroot', tx: 17, ty: 6, dir: 'down' }],
    npcs: [
      { x: 6, y: 2, dir: 'down', palette: 'rival', name: 'MAY',
        lines: ['Oh, hi! You must be the new neighbour.', 'My dad is PROF. BIRCH. He\'s always out in the tall grass.', 'Go see him at the lab — he might have something for you!'] },
    ],
    signs: {},
  },

  lab: {
    id: 'lab', name: "Prof. Birch's Lab", kind: 'indoor', music: 'indoor',
    rows: [
      '______________',
      '_llllffffllll_',
      '_ffffffffffff_',
      '_fBBffffffBBf_',
      '_ffffffffffff_',
      '_ffffffffffff_',
      '_fpffffffffpf_',
      '_fffffeffffff_',
      '______________',
    ],
    warps: [{ x: 6, y: 7, to: 'littleroot', tx: 16, ty: 16, dir: 'down' }],
    npcs: [
      { x: 6, y: 2, dir: 'down', palette: 'prof', name: 'PROF. BIRCH', script: 'starter' },
      { x: 2, y: 4, dir: 'right', palette: 'clerk', name: 'Aide',
        lines: ['The PROFESSOR has three Pokémon in those Poké Balls.', 'TREECKO, TORCHIC and MUDKIP. Choose carefully!'] },
      { x: 11, y: 4, dir: 'left', palette: 'townsman', name: 'Aide',
        lines: ['Type matchups decide most battles.', 'Water beats Fire, Fire beats Grass, Grass beats Water.'] },
    ],
    signs: {},
  },

  route101: {
    id: 'route101', name: 'Route 101', kind: 'route', music: 'route',
    rows: [
      '##########=#########',
      '#.........=........#',
      '#..,,,....=...,,,..#',
      '#..,,,....=...,,,..#',
      '#...,,....=..,,,,..#',
      '#.........=........#',
      '#..#......=......#.#',
      '#.........=........#',
      '#LLLLLLLLL=LLLLLLLL#',
      '#.........=........#',
      '#..,,,,...=..,,,,..#',
      '#..,,,,...=..,,,,..#',
      '#...,,....=...,,,..#',
      '#.........=........#',
      '#.#.......=.......##',
      '#.........=........#',
      '#....S....=........#',
      '#.........=........#',
      '#..,,,....=..,,,...#',
      '#..,,,....=..,,,...#',
      '#.........=........#',
      '#...FF....=....FF..#',
      '#.........=........#',
      '##########=#########',
    ],
    warps: [
      { x: 10, y: 23, to: 'littleroot', tx: 11, ty: 1, dir: 'down' },
      { x: 10, y: 0, to: 'oldale', tx: 11, ty: 18, dir: 'up' },
    ],
    npcs: [
      { x: 6, y: 15, dir: 'down', palette: 'townsman', name: 'Youngster', movement: 'wander',
        lines: ['Wild Pokémon hide in the tall grass.', 'Weaken one in battle, then throw a Poké Ball!'] },
    ],
    signs: {
      '5,16': 'ROUTE 101 — Littleroot Town / Oldale Town',
    },
    encounters: {
      levels: [2, 5],
      table: [
        { species: 'zigzagoon', weight: 26 },
        { species: 'poochyena', weight: 26 },
        { species: 'wurmple', weight: 18 },
        { species: 'taillow', weight: 14 },
        { species: 'shroomish', weight: 9 },
        { species: 'skitty', weight: 7 },
      ],
    },
  },

  oldale: {
    id: 'oldale', name: 'Oldale Town', kind: 'town', music: 'town',
    rows: [
      '########################',
      '#......................#',
      '#..F................F..#',
      '#......................#',
      '#..RRRRRRR....RRRRRRR..#',
      '#..rrrrrrr....rrrrrrr..#',
      '#..VWVDVWV....VWVDVWV..#',
      '#...S.............S....#',
      '#..........=...........#',
      '#..........=...........#',
      '#..........=============',
      '#..........=...........#',
      '#....||....=....||.....#',
      '#..........=...........#',
      '#....F.....=......F....#',
      '#..........=...........#',
      '#..........=...........#',
      '#..........=...........#',
      '#..........=...........#',
      '###########=############',
    ],
    warps: [
      { x: 6, y: 6, to: 'oldale_center', tx: 5, ty: 6, dir: 'down' },
      { x: 17, y: 6, to: 'oldale_mart', tx: 4, ty: 5, dir: 'down' },
      { x: 11, y: 19, to: 'route101', tx: 10, ty: 1, dir: 'down' },
      { x: 23, y: 10, to: 'route102', tx: 1, ty: 7, dir: 'right' },
    ],
    npcs: [
      { x: 13, y: 8, dir: 'down', palette: 'youngster', name: 'Youngster', movement: 'wander',
        lines: ['The POKéMON CENTER heals your party for free.', 'The MART sells Poké Balls — stock up before Route 102!'] },
      { x: 8, y: 16, dir: 'right', palette: 'fisher', name: 'Fisherman',
        lines: ['Heading east? PETALBURG CITY has the GYM.', 'NORMAN is tough. Get your team to level 15 or so first.'] },
    ],
    signs: {
      '4,7': 'OLDALE TOWN — Where things start to happen.',
      '18,7': 'POKé MART — All your adventuring needs.',
    },
  },

  oldale_center: centerMap('oldale_center', 'oldale', 6, 7),
  oldale_mart: martMap('oldale_mart', 'oldale', 17, 7),

  route102: {
    id: 'route102', name: 'Route 102', kind: 'route', music: 'route',
    rows: [
      '############################',
      '#..........................#',
      '#..,,,,......,,,,..........#',
      '#..,,,,......,,,,..........#',
      '#....,,........,,..........#',
      '#.......S..................#',
      '#..#....................#..#',
      '============================',
      '#..#....................#..#',
      '#..........................#',
      '#...,,,,.......,,,,,.......#',
      '#...,,,,.......,,,,,.......#',
      '#..........................#',
      '############################',
    ],
    warps: [
      { x: 0, y: 7, to: 'oldale', tx: 22, ty: 10, dir: 'left' },
      { x: 27, y: 7, to: 'petalburg', tx: 1, ty: 10, dir: 'right' },
    ],
    npcs: [
      { x: 12, y: 5, dir: 'down', palette: 'youngster', name: 'Youngster Ben',
        trainer: {
          intro: 'Hey! You look like you can battle!',
          defeat: 'Wow, you know your type matchups.',
          after: 'Tall grass on the north side has rarer Pokémon.',
          money: 240,
          party: [{ species: 'zigzagoon', level: 7 }, { species: 'poochyena', level: 8 }],
        },
      },
      { x: 20, y: 10, dir: 'up', palette: 'lass', name: 'Lass Tia',
        trainer: {
          intro: 'My Pokémon and I train here every day!',
          defeat: "You're strong. We'll train harder!",
          after: 'NORMAN uses Normal types. Fighting moves work well.',
          money: 280,
          party: [{ species: 'wurmple', level: 7 }, { species: 'shroomish', level: 9 }],
        },
      },
      { x: 5, y: 9, dir: 'right', palette: 'fisher', name: 'Fisherman',
        lines: ['WINGULL glide in from the coast around here.', 'Keep a few Poké Balls handy.'] },
    ],
    signs: {
      '8,5': 'ROUTE 102 — Oldale Town / Petalburg City',
    },
    encounters: {
      levels: [5, 9],
      table: [
        { species: 'zigzagoon', weight: 20 },
        { species: 'poochyena', weight: 18 },
        { species: 'wingull', weight: 14 },
        { species: 'marill', weight: 12 },
        { species: 'whismur', weight: 12 },
        { species: 'taillow', weight: 10 },
        { species: 'ralts', weight: 6 },
        { species: 'makuhita', weight: 4 },
        { species: 'geodude', weight: 3 },
        { species: 'aron', weight: 1 },
      ],
    },
  },

  petalburg: {
    id: 'petalburg', name: 'Petalburg City', kind: 'town', music: 'town',
    rows: [
      '########################',
      '#......................#',
      '#..F................F..#',
      '#.......RRRRRRRRR......#',
      '#.......rrrrrrrrr......#',
      '#.......RRRRRRRRR......#',
      '#.......VWVVDVVWV......#',
      '#.......S.......S......#',
      '#......................#',
      '#......................#',
      '============...........#',
      '#......................#',
      '#..RRRRRRR.....RRRRR...#',
      '#..rrrrrrr.....rrrrr...#',
      '#..VWVDVWV.....VWDWV...#',
      '#......................#',
      '#....FF..........FF....#',
      '#.....||||......||||...#',
      '#......................#',
      '########################',
    ],
    warps: [
      { x: 0, y: 10, to: 'route102', tx: 26, ty: 7, dir: 'left' },
      { x: 12, y: 6, to: 'gym', tx: 5, ty: 9, dir: 'down' },
      { x: 6, y: 14, to: 'petalburg_center', tx: 5, ty: 6, dir: 'down' },
      { x: 17, y: 14, to: 'petalburg_house', tx: 4, ty: 5, dir: 'down' },
    ],
    npcs: [
      { x: 14, y: 9, dir: 'down', palette: 'townsman', name: 'Man', movement: 'wander',
        lines: ['PETALBURG CITY — where people mingle with nature.', 'The GYM LEADER here is NORMAN. He pulls no punches.'] },
      { x: 9, y: 16, dir: 'up', palette: 'lass', name: 'Girl',
        lines: ['Heal at the CENTER before you challenge the GYM.', 'Trust me. I learned the hard way.'] },
    ],
    signs: {
      '8,7': 'PETALBURG CITY GYM — Leader: NORMAN',
      '16,7': 'The GYM door is straight ahead.',
    },
  },

  petalburg_center: centerMap('petalburg_center', 'petalburg', 6, 15),

  petalburg_house: {
    id: 'petalburg_house', name: 'Petalburg House', kind: 'indoor', music: 'indoor',
    rows: [
      '__________',
      '_ftffffBB_',
      '_ffffffff_',
      '_fbbfffff_',
      '_ffffffff_',
      '_fpffffpf_',
      '_fffeffff_',
      '__________',
    ],
    warps: [{ x: 4, y: 6, to: 'petalburg', tx: 17, ty: 15, dir: 'down' }],
    npcs: [
      { x: 6, y: 2, dir: 'down', palette: 'fisher', name: 'Old Man',
        lines: ['A Pokémon at low HP is easier to catch.', 'Putting it to sleep or paralysing it helps even more.'] },
    ],
    signs: {},
  },

  gym: {
    id: 'gym', name: 'Petalburg Gym', kind: 'indoor', music: 'gym',
    rows: [
      '____________',
      '_gggggggggg_',
      '_gggggggggg_',
      '_gggggggggg_',
      '_gggggggggg_',
      '_gg_gggg_gg_',
      '_gggggggggg_',
      '_gg_gggg_gg_',
      '_gggggggggg_',
      '_gggggggggg_',
      '_ggggeggggg_',
      '____________',
    ],
    warps: [{ x: 5, y: 10, to: 'petalburg', tx: 12, ty: 7, dir: 'down' }],
    npcs: [
      { x: 5, y: 2, dir: 'down', palette: 'leader', name: 'LEADER NORMAN',
        trainer: {
          leader: true,
          intro: "So you've made it this far. Let's see what you've learned!",
          defeat: 'That was a fine battle. You have my respect.',
          after: 'The BALANCE BADGE is yours. Keep training!',
          money: 1400,
          badge: 'Balance Badge',
          party: [
            { species: 'zigzagoon', level: 13 },
            { species: 'makuhita', level: 14 },
            { species: 'linoone', level: 16 },
          ],
        },
      },
      { x: 3, y: 6, dir: 'right', palette: 'youngster', name: 'Trainer Kai',
        trainer: {
          intro: 'You need to get past me before you face NORMAN!',
          defeat: 'Not bad at all.',
          after: 'NORMAN is straight ahead. Good luck.',
          money: 420,
          party: [{ species: 'whismur', level: 11 }, { species: 'skitty', level: 12 }],
        },
      },
      { x: 8, y: 6, dir: 'left', palette: 'lass', name: 'Trainer Rin',
        trainer: {
          intro: 'The GYM is no place for a half-trained team!',
          defeat: 'You trained them well.',
          after: 'A Pokémon that likes its trainer battles harder.',
          money: 440,
          party: [{ species: 'marill', level: 12 }, { species: 'poochyena', level: 12 }],
        },
      },
    ],
    signs: {},
  },
};

// Pad every row to the map's widest row so a miscounted literal degrades into a
// wall instead of breaking collision.
for (const map of Object.values(MAPS)) {
  const width = Math.max(...map.rows.map((r) => r.length));
  const filler = map.kind === 'indoor' ? '_' : '#';
  map.rows = map.rows.map((r) => (r.length === width ? r : r.padEnd(width, filler)));
  map.width = width;
  map.height = map.rows.length;
  map.grid = map.rows.map((r) => r.split(''));
  map.npcs = (map.npcs || []).map((n, i) => ({ ...n, id: `${map.id}:${i}` }));
  map.warps = map.warps || [];
  map.signs = map.signs || {};
}

export const getMap = (id) => MAPS[id];
export const START_MAP = 'player_house';
export const START_POS = { x: 4, y: 3, dir: 'down' };
