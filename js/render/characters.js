// Overworld people are drawn from rectangles only, so every pixel lands on an
// integer boundary and the result is crisp at any integer zoom. One atlas per
// palette holds 4 directions x 4 walk frames.

export const CHAR_W = 16;
export const CHAR_H = 20;
export const DIRS = ['down', 'up', 'left', 'right'];

const OUTLINE = '#2b2f38';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

export const PALETTES = {
  player:   { hair: '#3a2b22', skin: '#f0c49a', top: '#e8484c', bottom: '#3f4c66', shoe: '#2b2f38', hat: '#f2f2f2', accent: '#c43a3e' },
  rival:    { hair: '#c96a3a', skin: '#f0c49a', top: '#f2a63c', bottom: '#4a4a56', shoe: '#2b2f38', hat: null, accent: '#c98a3a' },
  prof:     { hair: '#4a3a2a', skin: '#f0c49a', top: '#f2f2f2', bottom: '#6a5a44', shoe: '#4a3a2a', hat: null, accent: '#d8d8d8' },
  nurse:    { hair: '#f0a0b8', skin: '#f5d0ae', top: '#f2f2f2', bottom: '#f0a0b8', shoe: '#e8e8e8', hat: '#f2f2f2', accent: '#e8484c' },
  clerk:    { hair: '#2b2b33', skin: '#e0b088', top: '#5f9bdd', bottom: '#3a3a46', shoe: '#2b2f38', hat: null, accent: '#4a86cc' },
  youngster:{ hair: '#3a2b22', skin: '#f0c49a', top: '#5aa03e', bottom: '#c9a87c', shoe: '#7a5230', hat: '#5aa03e', accent: '#4a8c36' },
  lass:     { hair: '#c9a83a', skin: '#f5d0ae', top: '#e888b0', bottom: '#f2f2f2', shoe: '#c45a6a', hat: null, accent: '#d4708f' },
  fisher:   { hair: '#6a5a44', skin: '#d8a878', top: '#4a86cc', bottom: '#3f4c66', shoe: '#2b2f38', hat: '#e8d24a', accent: '#3a6ba8' },
  leader:   { hair: '#2b2b33', skin: '#e0b088', top: '#7a5230', bottom: '#4a3a2a', shoe: '#2b2f38', hat: null, accent: '#a8763c' },
  townsman: { hair: '#5a4a3a', skin: '#e8bd93', top: '#8a6ac4', bottom: '#4a4a56', shoe: '#3a3a46', hat: null, accent: '#7255ad' },
};

/** Vertical bob applied to the body on the two stepping frames. */
const legOffset = (frame) => (frame === 1 ? [-1, 0] : frame === 3 ? [0, -1] : [0, 0]);

function drawFacing(c, dir, frame, p) {
  const [ly, ry] = legOffset(frame);
  const bob = frame === 1 || frame === 3 ? 0 : 0;

  if (dir === 'left') {
    // Legs (profile: one in front of the other).
    R(c, 6, 16 + ly, 4, 4, p.bottom);
    R(c, 6, 19 + ly, 4, 1, p.shoe);
    R(c, 7, 16 + ry, 3, 4, p.accent);
    R(c, 7, 19 + ry, 3, 1, p.shoe);
    // Torso + trailing arm.
    R(c, 5, 10 + bob, 6, 7, p.top);
    R(c, 5, 10 + bob, 2, 5, p.accent);
    R(c, 5, 14 + bob, 2, 2, p.skin);
    // Head.
    R(c, 4, 2, 8, 9, p.skin);
    R(c, 3, 2, 9, 4, p.hair);
    R(c, 9, 3, 3, 6, p.hair);
    if (p.hat) { R(c, 3, 1, 9, 4, p.hat); R(c, 2, 4, 11, 1, p.hat); }
    R(c, 5, 6, 2, 2, OUTLINE);
    R(c, 5, 6, 1, 1, '#ffffff');
    return;
  }

  const facingUp = dir === 'up';
  // Legs.
  R(c, 5, 16 + ly, 3, 4, p.bottom);
  R(c, 5, 19 + ly, 3, 1, p.shoe);
  R(c, 8, 16 + ry, 3, 4, p.bottom);
  R(c, 8, 19 + ry, 3, 1, p.shoe);
  // Torso.
  R(c, 4, 10, 8, 7, p.top);
  R(c, 4, 10, 8, 2, p.accent);
  // Arms.
  R(c, 2, 10, 2, 4, p.top);
  R(c, 12, 10, 2, 4, p.top);
  R(c, 2, 14, 2, 2, p.skin);
  R(c, 12, 14, 2, 2, p.skin);
  // Head.
  R(c, 4, 2, 8, 9, p.skin);
  if (facingUp) {
    R(c, 3, 1, 10, 8, p.hair);
  } else {
    R(c, 3, 1, 10, 4, p.hair);
    R(c, 3, 4, 1, 4, p.hair);
    R(c, 12, 4, 1, 4, p.hair);
    R(c, 5, 6, 2, 2, OUTLINE);
    R(c, 9, 6, 2, 2, OUTLINE);
    R(c, 5, 6, 1, 1, '#ffffff');
    R(c, 9, 6, 1, 1, '#ffffff');
    R(c, 7, 9, 2, 1, '#c08a72');
  }
  if (p.hat) {
    R(c, 3, 1, 10, 3, p.hat);
    R(c, 2, 4, 12, 1, p.hat);
    if (!facingUp) R(c, 6, 2, 4, 1, p.accent);
  }
}

const atlases = new Map();

/** Build (and cache) a 4x4 sprite atlas for a palette name or palette object. */
export function getCharAtlas(paletteName) {
  const key = typeof paletteName === 'string' ? paletteName : JSON.stringify(paletteName);
  let atlas = atlases.get(key);
  if (atlas) return atlas;

  const p = typeof paletteName === 'string' ? (PALETTES[paletteName] || PALETTES.townsman) : paletteName;
  atlas = document.createElement('canvas');
  atlas.width = CHAR_W * 4;
  atlas.height = CHAR_H * 4;
  const ctx = atlas.getContext('2d');

  DIRS.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * CHAR_W, row * CHAR_H);
      ctx.beginPath();
      ctx.rect(0, 0, CHAR_W, CHAR_H);
      ctx.clip();
      if (dir === 'right') {
        // Right is the mirror of left; flip about the cell's centre line.
        ctx.translate(CHAR_W, 0);
        ctx.scale(-1, 1);
        drawFacing(ctx, 'left', frame, p);
      } else {
        drawFacing(ctx, dir, frame, p);
      }
      ctx.restore();
    }
  });

  atlases.set(key, atlas);
  return atlas;
}

/**
 * Draw a character so their feet rest on the bottom of the tile at (x, y).
 * The sprite is 4px taller than a tile, so it overlaps the row above.
 */
export function drawCharacter(ctx, palette, dir, frame, x, y) {
  const atlas = getCharAtlas(palette);
  const row = Math.max(0, DIRS.indexOf(dir));
  ctx.drawImage(
    atlas,
    (frame & 3) * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H,
    Math.round(x), Math.round(y) - 4, CHAR_W, CHAR_H,
  );
}
