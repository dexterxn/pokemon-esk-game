// The overworld tileset is painted procedurally into an atlas at boot. Two
// atlas frames are built so water and flowers can animate.

export const TILE = 16;

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const dot = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };

/** Scatter deterministic speckles so every tile of a kind looks identical. */
function speckle(ctx, spots, c) {
  ctx.fillStyle = c;
  for (const [x, y] of spots) ctx.fillRect(x, y, 1, 1);
}

const GRASS_SPECKS = [[2, 3], [9, 2], [13, 6], [4, 9], [11, 12], [6, 14], [1, 11], [14, 1]];

export const TILES = {
  '.': { name: 'grass', draw(c) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    speckle(c, GRASS_SPECKS, '#589c3e');
    speckle(c, [[7, 7], [3, 5], [12, 10]], '#78c058');
  } },

  ',': { name: 'tall grass', encounter: true, draw(c, f) {
    rect(c, 0, 0, 16, 16, '#5aa03e');
    const sway = f ? 1 : 0;
    for (let i = 0; i < 5; i++) {
      const bx = i * 3 + 1;
      rect(c, bx + (i % 2 ? sway : 0), 4, 2, 11, '#3f8a34');
      rect(c, bx + (i % 2 ? sway : 0), 2, 2, 3, '#4f9c40');
    }
    rect(c, 0, 14, 16, 2, '#4a8c36');
  } },

  '=': { name: 'path', draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c49a');
    speckle(c, [[3, 4], [10, 2], [6, 11], [13, 8], [1, 14]], '#c4ae86');
    speckle(c, [[8, 6], [12, 13]], '#e6d6b2');
  } },

  's': { name: 'sand', draw(c) {
    rect(c, 0, 0, 16, 16, '#e8dcae');
    speckle(c, [[2, 6], [11, 3], [7, 12], [14, 9]], '#d6c896');
  } },

  '~': { name: 'water', solid: true, draw(c, f) {
    rect(c, 0, 0, 16, 16, '#4a86cc');
    rect(c, 0, f ? 4 : 8, 16, 2, '#5f9bdd');
    rect(c, 0, f ? 11 : 1, 16, 1, '#3d74b4');
    rect(c, f ? 3 : 9, f ? 6 : 12, 4, 1, '#8fc0ee');
  } },

  '#': { name: 'tree', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    rect(c, 6, 11, 4, 5, '#7a5a34');
    rect(c, 2, 1, 12, 11, '#2f7a30');
    rect(c, 1, 3, 14, 7, '#2f7a30');
    rect(c, 3, 2, 8, 6, '#3f9440');
    rect(c, 4, 3, 4, 3, '#57a84e');
    speckle(c, [[11, 4], [12, 8], [5, 9], [9, 10]], '#256428');
  } },

  '|': { name: 'fence', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    rect(c, 2, 2, 3, 14, '#b09068');
    rect(c, 11, 2, 3, 14, '#b09068');
    rect(c, 0, 5, 16, 2, '#c9a87c');
    rect(c, 0, 10, 16, 2, '#c9a87c');
  } },

  'F': { name: 'flowers', draw(c, f) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    speckle(c, GRASS_SPECKS, '#589c3e');
    const cols = ['#f2d24a', '#e8646e', '#f2f2f2'];
    [[3, 4], [10, 3], [6, 10], [12, 11]].forEach(([x, y], i) => {
      const col = cols[i % 3];
      rect(c, x, y + (f && i % 2 ? 1 : 0), 3, 3, col);
      dot(c, x + 1, y + 1 + (f && i % 2 ? 1 : 0), '#c07a2a');
    });
  } },

  'L': { name: 'ledge', ledge: 'down', draw(c) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    rect(c, 0, 0, 16, 6, '#c9a87c');
    rect(c, 0, 6, 16, 4, '#a8865c');
    rect(c, 0, 10, 16, 2, '#8a6a45');
    speckle(c, [[3, 7], [9, 8], [13, 7]], '#8a6a45');
  } },

  'R': { name: 'roof', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#c45a4a');
    rect(c, 0, 0, 16, 2, '#d97a66');
    for (let y = 3; y < 16; y += 4) rect(c, 0, y, 16, 1, '#a8483c');
    for (let x = 0; x < 16; x += 4) rect(c, x, 0, 1, 16, '#a8483c');
  } },

  'r': { name: 'roof edge', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#8a3a30');
    rect(c, 0, 0, 16, 3, '#a8483c');
    rect(c, 0, 12, 16, 4, '#6f2c24');
  } },

  'W': { name: 'wall', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#e2d4b8');
    rect(c, 0, 0, 16, 1, '#c9bb9c');
    rect(c, 0, 15, 16, 1, '#c9bb9c');
    rect(c, 2, 3, 12, 8, '#a8c8e0');
    rect(c, 3, 4, 10, 6, '#c8e0f0');
    rect(c, 7, 3, 2, 8, '#8aa8c0');
    rect(c, 2, 6, 12, 2, '#8aa8c0');
  } },

  'V': { name: 'blank wall', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#e2d4b8');
    rect(c, 0, 0, 16, 1, '#c9bb9c');
    rect(c, 0, 15, 16, 1, '#c9bb9c');
    speckle(c, [[4, 5], [11, 9]], '#d4c6aa');
  } },

  'D': { name: 'door', door: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#e2d4b8');
    rect(c, 3, 1, 10, 15, '#7a5230');
    rect(c, 4, 2, 8, 13, '#96683c');
    rect(c, 5, 3, 6, 5, '#b8d4e8');
    dot(c, 10, 10, '#e8d24a');
  } },

  'S': { name: 'sign', solid: true, sign: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#68b04a');
    rect(c, 7, 10, 2, 6, '#7a5a34');
    rect(c, 1, 2, 14, 9, '#96683c');
    rect(c, 2, 3, 12, 7, '#c9a87c');
    rect(c, 4, 5, 8, 1, '#7a5a34');
    rect(c, 4, 7, 6, 1, '#7a5a34');
  } },

  'x': { name: 'void', solid: true, draw(c) { rect(c, 0, 0, 16, 16, '#101318'); } },

  'f': { name: 'floor', draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 0, 0, 16, 1, '#c4b49c');
    rect(c, 0, 8, 16, 1, '#c4b49c');
    rect(c, 0, 0, 1, 16, '#c4b49c');
    rect(c, 8, 8, 1, 8, '#c4b49c');
  } },

  'c': { name: 'carpet', draw(c) {
    rect(c, 0, 0, 16, 16, '#c45a6a');
    rect(c, 0, 0, 16, 2, '#d97a86');
    rect(c, 0, 14, 16, 2, '#a8485a');
    speckle(c, [[4, 6], [11, 9]], '#d97a86');
  } },

  'g': { name: 'gym floor', draw(c) {
    rect(c, 0, 0, 16, 16, '#7a8a9a');
    rect(c, 0, 0, 8, 8, '#8d9dad');
    rect(c, 8, 8, 8, 8, '#8d9dad');
    rect(c, 0, 0, 16, 1, '#67757f');
  } },

  '_': { name: 'interior wall', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#b09878');
    for (let y = 0; y < 16; y += 5) rect(c, 0, y, 16, 1, '#9a8264');
    rect(c, 7, 0, 1, 16, '#9a8264');
  } },

  'w': { name: 'papered wall', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#e0d0e8');
    for (let x = 2; x < 16; x += 5) rect(c, x, 0, 1, 16, '#cbb8d8');
    rect(c, 0, 14, 16, 2, '#a8926f');
  } },

  'C': { name: 'counter', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 0, 2, 16, 12, '#a8763c');
    rect(c, 0, 2, 16, 3, '#c99a58');
    rect(c, 0, 12, 16, 2, '#8a5c2c');
  } },

  'M': { name: 'shelf', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 1, 0, 14, 15, '#9a9aa8');
    rect(c, 2, 2, 12, 4, '#e8d24a');
    rect(c, 2, 8, 12, 4, '#5f9bdd');
    rect(c, 1, 6, 14, 2, '#7a7a88');
  } },

  'B': { name: 'bookshelf', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#7a5230');
    rect(c, 1, 1, 14, 6, '#a8763c');
    rect(c, 1, 8, 14, 6, '#a8763c');
    ['#c45a4a', '#4a86cc', '#5aa03e', '#e8d24a'].forEach((col, i) => {
      rect(c, 2 + i * 3, 2, 2, 4, col);
      rect(c, 3 + i * 3, 9, 2, 4, col);
    });
  } },

  'P': { name: 'pc', solid: true, pc: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 2, 1, 12, 12, '#5a6a7a');
    rect(c, 3, 2, 10, 8, '#3a4a5a');
    rect(c, 4, 3, 8, 6, '#6fd8c0');
    rect(c, 4, 11, 8, 1, '#8a9aaa');
    rect(c, 1, 13, 14, 2, '#44525f');
  } },

  'b': { name: 'bed', solid: true, bed: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 1, 0, 14, 16, '#c45a6a');
    rect(c, 2, 1, 12, 5, '#f2f2f2');
    rect(c, 2, 7, 12, 8, '#d97a86');
    rect(c, 1, 0, 14, 1, '#a8485a');
  } },

  't': { name: 'table', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 0, 1, 16, 11, '#c9a87c');
    rect(c, 0, 1, 16, 2, '#e0c096');
    rect(c, 2, 12, 3, 4, '#96683c');
    rect(c, 11, 12, 3, 4, '#96683c');
  } },

  'p': { name: 'plant', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 5, 10, 6, 5, '#a8763c');
    rect(c, 3, 2, 10, 8, '#3f9440');
    rect(c, 4, 1, 8, 4, '#57a84e');
    speckle(c, [[6, 5], [10, 7]], '#2f7a30');
  } },

  'H': { name: 'heal machine', solid: true, heal: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 1, 3, 14, 11, '#e8eef4');
    rect(c, 2, 4, 12, 5, '#b8c8d8');
    [3, 7, 11].forEach((x) => rect(c, x, 10, 2, 2, '#e8484c'));
    rect(c, 1, 13, 14, 2, '#9aa8b8');
  } },

  'l': { name: 'lab machine', solid: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 0, 1, 16, 13, '#9aa8b8');
    rect(c, 2, 3, 5, 5, '#3a4a5a');
    rect(c, 3, 4, 3, 3, '#6fd8c0');
    rect(c, 9, 3, 5, 5, '#3a4a5a');
    rect(c, 10, 4, 3, 3, '#e8d24a');
    rect(c, 2, 10, 12, 2, '#7a8898');
  } },

  'm': { name: 'mat', mat: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#d8c8b0');
    rect(c, 2, 3, 12, 10, '#5aa03e');
    rect(c, 3, 4, 10, 8, '#78c058');
    rect(c, 6, 7, 4, 2, '#4a8c36');
  } },

  'e': { name: 'exit mat', exit: true, draw(c) {
    rect(c, 0, 0, 16, 16, '#c9a87c');
    rect(c, 1, 1, 14, 14, '#a8865c');
    rect(c, 3, 3, 10, 10, '#8a6a45');
  } },
};

let atlases = null;
let index = null;

/** Build (once) the two animation frames of the tile atlas. */
export function buildTiles() {
  if (atlases) return;
  const keys = Object.keys(TILES);
  index = new Map(keys.map((k, i) => [k, i]));
  atlases = [0, 1].map((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = TILE * keys.length;
    canvas.height = TILE;
    const ctx = canvas.getContext('2d');
    keys.forEach((key, i) => {
      ctx.save();
      ctx.translate(i * TILE, 0);
      ctx.beginPath();
      ctx.rect(0, 0, TILE, TILE);
      ctx.clip();
      TILES[key].draw(ctx, frame);
      ctx.restore();
    });
    return canvas;
  });
}

/** Blit one tile. `frame` is 0 or 1. */
export function drawTile(ctx, ch, x, y, frame) {
  const i = index.get(ch);
  if (i === undefined) return;
  ctx.drawImage(atlases[frame & 1], i * TILE, 0, TILE, TILE, x, y, TILE, TILE);
}

export const tileInfo = (ch) => TILES[ch] || TILES['x'];
export const isSolid = (ch) => !!tileInfo(ch).solid;
