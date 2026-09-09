import { drawText, wrapText, textWidth, LINE_HEIGHT } from './font.js';

export const SCREEN_W = 240;
export const SCREEN_H = 160;

export const UI = {
  ink: '#38404a',
  inkDim: '#7d8590',
  shadow: '#c4ccd4',
  fill: '#f8f8f0',
  fillAlt: '#e8ecf0',
  border: '#38507a',
  borderLight: '#7a9ad0',
  hpGreen: '#48c860',
  hpYellow: '#f0c030',
  hpRed: '#e05048',
  expBlue: '#48a8f0',
};

/** The framed window every menu and message sits in. */
export function panel(ctx, x, y, w, h, opts = {}) {
  const fill = opts.fill || UI.fill;
  ctx.fillStyle = opts.border || UI.border;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = opts.borderLight || UI.borderLight;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  // Clip the hard corners so the frame reads as rounded.
  ctx.fillStyle = opts.outside || 'transparent';
  if (opts.outside) {
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x + w - 1, y, 1, 1);
    ctx.fillRect(x, y + h - 1, 1, 1);
    ctx.fillRect(x + w - 1, y + h - 1, 1, 1);
  }
}

export const DIALOGUE_BOX = { x: 4, y: 110, w: 232, h: 46 };

export function drawDialogueBox(ctx) {
  panel(ctx, DIALOGUE_BOX.x, DIALOGUE_BOX.y, DIALOGUE_BOX.w, DIALOGUE_BOX.h);
}

/** Text lines inside the dialogue box, plus the blinking "more" arrow. */
export function drawDialogueText(ctx, lines, showArrow, tick) {
  lines.forEach((line, i) => {
    drawText(ctx, line, DIALOGUE_BOX.x + 10, DIALOGUE_BOX.y + 10 + i * LINE_HEIGHT, UI.ink, UI.shadow);
  });
  if (showArrow && Math.floor(tick / 20) % 2 === 0) {
    drawText(ctx, '▼', DIALOGUE_BOX.x + DIALOGUE_BOX.w - 14, DIALOGUE_BOX.y + DIALOGUE_BOX.h - 14, UI.ink, null);
  }
}

/** A vertical list of choices with a ► cursor. */
export function drawMenuList(ctx, items, index, x, y, w, opts = {}) {
  const lineH = opts.lineH || LINE_HEIGHT;
  const h = items.length * lineH + 10;
  panel(ctx, x, y, w, h);
  items.forEach((item, i) => {
    const label = typeof item === 'string' ? item : item.label;
    const right = typeof item === 'object' ? item.right : null;
    const ty = y + 6 + i * lineH;
    drawText(ctx, label, x + 14, ty, UI.ink, UI.shadow);
    if (right) drawText(ctx, right, x + w - 8 - textWidth(right), ty, UI.ink, UI.shadow);
    if (i === index) drawText(ctx, '►', x + 6, ty, UI.ink, null);
  });
  return h;
}

/** HP bar drawn as an outlined capsule that changes colour as it drains. */
export function drawHpBar(ctx, x, y, w, ratio) {
  ctx.fillStyle = '#40484f';
  ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#20262c';
  ctx.fillRect(x, y, w, 3);
  const fillW = Math.max(ratio > 0 ? 1 : 0, Math.round(w * ratio));
  ctx.fillStyle = ratio > 0.5 ? UI.hpGreen : ratio > 0.2 ? UI.hpYellow : UI.hpRed;
  ctx.fillRect(x, y, fillW, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(x, y, fillW, 1);
}

export function drawExpBar(ctx, x, y, w, ratio) {
  ctx.fillStyle = '#20262c';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = UI.expBlue;
  ctx.fillRect(x, y, Math.round(w * ratio), 2);
}

/** Small pill showing a Pokémon's type. */
export function drawTypeChip(ctx, type, color, x, y) {
  const label = type.slice(0, 3).toUpperCase();
  const w = textWidth(label) + 8;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 2, w, 11);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x, y + 7, w, 2);
  drawText(ctx, label, x + 4, y, '#ffffff', 'rgba(0,0,0,0.35)');
  return w;
}

/** Full-screen tint used for fades and battle flashes. */
export function fadeOverlay(ctx, alpha, color = '#000') {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = 1;
}

/**
 * A message queue with a typewriter reveal.
 * `push` adds pages; `advance` is called when the player presses A.
 */
export class MessageBox {
  constructor(charsPerTick = 1.6) {
    this.pages = [];
    this.page = null;
    this.revealed = 0;
    this.speed = charsPerTick;
    this.onDone = null;
  }

  get active() { return this.page !== null || this.pages.length > 0; }
  get complete() { return this.page !== null && this.revealed >= this.page.text.length; }

  /** Queue one or more messages. `onDone` fires once the queue empties. */
  push(text, onDone) {
    const list = Array.isArray(text) ? text : [text];
    for (const entry of list) {
      this.pages.push({ text: entry, lines: wrapText(entry, DIALOGUE_BOX.w - 24) });
    }
    if (onDone) this.onDone = onDone;
    if (!this.page) this.next();
  }

  next() {
    this.page = this.pages.shift() || null;
    this.revealed = 0;
    if (!this.page) {
      const cb = this.onDone;
      this.onDone = null;
      cb?.();
    }
  }

  /** Skip the typewriter, or move to the next page. Returns true if it consumed input. */
  advance() {
    if (!this.page) return false;
    if (!this.complete) { this.revealed = this.page.text.length; return true; }
    this.next();
    return true;
  }

  update() {
    if (this.page && !this.complete) this.revealed += this.speed;
  }

  /** The lines to draw right now, respecting the reveal cursor. */
  visibleLines() {
    if (!this.page) return [];
    let budget = Math.floor(this.revealed);
    const out = [];
    for (const line of this.page.lines) {
      if (budget <= 0) break;
      out.push(line.slice(0, budget));
      budget -= line.length + 1;
    }
    // Long messages scroll: only the last two lines stay on screen.
    return out.slice(-2);
  }

  clear() {
    this.pages = [];
    this.page = null;
    this.revealed = 0;
    this.onDone = null;
  }

  draw(ctx, tick) {
    if (!this.page) return;
    drawDialogueBox(ctx);
    drawDialogueText(ctx, this.visibleLines(), this.complete, tick);
  }
}
