import { SPECIES } from '../data/species.js';

const SIZE = 32;
const OUTLINE = [26, 30, 38];
const cache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawShape(ctx, s) {
  ctx.fillStyle = s.c;
  ctx.beginPath();
  if (s.k === 'e') {
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  } else if (s.k === 'r') {
    ctx.rect(s.x, s.y, s.w, s.h);
  } else if (s.k === 'p') {
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.fill();
}

/**
 * Rasterise a shape list into hard-edged pixel art with a 1px dark outline.
 * @param {boolean} back drop face details, giving a plausible "seen from behind" pose.
 */
function rasterise(shapes, back) {
  // Render one pixel larger on every side so the outline has room to sit.
  const canvas = makeCanvas(SIZE + 2, SIZE + 2);
  const ctx = canvas.getContext('2d');
  ctx.translate(1, 1);
  for (const s of shapes) {
    if (back && s.f) continue;
    drawShape(ctx, s);
  }

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const W = canvas.width;
  const H = canvas.height;

  // Step 1: snap anti-aliased edges to fully opaque or fully clear.
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (px[i * 4 + 3] >= 110) { px[i * 4 + 3] = 255; solid[i] = 1; }
    else { px[i * 4 + 3] = 0; }
  }

  // Step 2: any clear pixel orthogonally touching a solid one becomes outline.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      const touches =
        (x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) ||
        (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
      if (!touches) continue;
      px[i * 4] = OUTLINE[0];
      px[i * 4 + 1] = OUTLINE[1];
      px[i * 4 + 2] = OUTLINE[2];
      px[i * 4 + 3] = 255;
    }
  }

  if (back) {
    // Nudge the whole sprite darker so a back view reads as facing away.
    for (let i = 0; i < W * H; i++) {
      if (!px[i * 4 + 3]) continue;
      for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(px[i * 4 + c] * 0.82);
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Front (or back) sprite canvas for a species, built once and cached. */
export function getPokemonSprite(speciesId, back = false) {
  const key = `${speciesId}:${back ? 'b' : 'f'}`;
  let hit = cache.get(key);
  if (!hit) {
    const sp = SPECIES[speciesId];
    hit = rasterise(sp ? sp.art : [{ k: 'e', x: 6, y: 6, w: 20, h: 20, c: '#888' }], back);
    cache.set(key, hit);
  }
  return hit;
}

/**
 * Draw a species sprite scaled to `size` px, anchored so its feet sit on
 * (x, y + size) and it is horizontally centred on x + size / 2.
 */
export function drawPokemon(ctx, speciesId, x, y, size, back = false, alpha = 1) {
  const sprite = getPokemonSprite(speciesId, back);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x), Math.round(y), size, size);
  ctx.globalAlpha = prev;
}

/** Silhouette used for the "wild Pokémon appeared" flash and for unseen dex slots. */
export function drawPokemonSilhouette(ctx, speciesId, x, y, size, color = '#2b2f3a') {
  const sprite = getPokemonSprite(speciesId, false);
  const tint = makeCanvas(sprite.width, sprite.height);
  const tctx = tint.getContext('2d');
  tctx.drawImage(sprite, 0, 0);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, tint.width, tint.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tint, Math.round(x), Math.round(y), size, size);
}
