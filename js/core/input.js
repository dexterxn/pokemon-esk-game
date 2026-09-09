// Maps physical keys onto the six logical buttons the game reads. Both the
// arrow cluster and WASD drive movement, as requested.
const KEY_MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  KeyZ: 'a', Space: 'a', Enter: 'a', KeyJ: 'a',
  KeyX: 'b', Backspace: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyK: 'b',
  Escape: 'start', Tab: 'start',
};

export const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start'];

const held = new Set();
const pressedThisFrame = new Set();
const queued = new Set();

/** True while the button is down. */
export const isDown = (btn) => held.has(btn);

/** True only on the frame the button went down (edge-triggered). */
export const wasPressed = (btn) => pressedThisFrame.has(btn);

export const anyPressed = (...btns) => btns.some((b) => pressedThisFrame.has(b));

/** Direction currently held, preferring the most recently pressed axis. */
export function heldDirection() {
  if (held.has('up')) return 'up';
  if (held.has('down')) return 'down';
  if (held.has('left')) return 'left';
  if (held.has('right')) return 'right';
  return null;
}

/** Called once per frame by the main loop, after all systems have read input. */
export function endFrame() {
  pressedThisFrame.clear();
  for (const btn of queued) pressedThisFrame.add(btn);
  queued.clear();
}

function press(btn) {
  if (!held.has(btn)) queued.add(btn);
  held.add(btn);
}

function release(btn) {
  held.delete(btn);
}

export function clearAll() {
  held.clear();
  queued.clear();
  pressedThisFrame.clear();
}

/**
 * @param {(code: string, event: KeyboardEvent) => void} onRawKey extra hook for
 * global shortcuts (mute, fullscreen) that are not game buttons.
 */
export function attachInput(target, onRawKey) {
  window.addEventListener('keydown', (e) => {
    const btn = KEY_MAP[e.code];
    if (btn) {
      e.preventDefault();
      if (!e.repeat) press(btn);
      else held.add(btn);
    }
    if (!e.repeat) onRawKey?.(e.code, e);
  });

  window.addEventListener('keyup', (e) => {
    const btn = KEY_MAP[e.code];
    if (btn) { e.preventDefault(); release(btn); }
  });

  // Losing focus mid-walk would otherwise leave a direction stuck down.
  window.addEventListener('blur', clearAll);

  // On-screen controls for touch devices.
  target?.querySelectorAll('[data-key]').forEach((el) => {
    const btn = el.dataset.key;
    const down = (e) => { e.preventDefault(); press(btn); };
    const up = (e) => { e.preventDefault(); release(btn); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
