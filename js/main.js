import { attachInput, endFrame, wasPressed } from './core/input.js';
import { audio } from './core/audio.js';
import { SCREEN_H, MessageBox } from './render/ui.js';
import { drawText } from './render/font.js';
import { World } from './engine/world.js';
import { Battle } from './engine/battle.js';
import { state, setFlag, healParty, hasFlag, formatPlayTime } from './engine/state.js';
import {
  loadGame, hasSave, saveGame, downloadSaveFile, importSaveText,
} from './engine/save.js';
import { displayName, evolveInto } from './engine/pokemon.js';
import { getSpecies } from './data/species.js';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const boot = document.getElementById('boot');
const startBtn = document.getElementById('start-btn');
const pad = document.getElementById('pad');

const game = {
  scene: null,        // 'world' | 'battle'
  world: null,
  battle: null,
  tick: 0,
  running: false,
  post: null,         // post-battle message queue (evolutions, blackout)
};

// -------------------------------------------------------------------- startup

function begin() {
  audio.unlock();
  if (hasSave()) loadGame();
  game.world = new World();
  game.scene = 'world';
  game.running = true;
  boot.classList.add('hidden');
  canvas.focus();
}

startBtn.addEventListener('click', begin);

attachInput(pad, (code) => {
  if (!game.running) { if (code === 'Enter' || code === 'Space') begin(); return; }
  if (code === 'KeyM') {
    const muted = audio.toggleMute();
    flashToast(muted ? 'Sound off' : 'Sound on');
  }
  if (code === 'KeyF') toggleFullscreen();
});

function toggleFullscreen() {
  const target = document.getElementById('screen-wrap');
  if (document.fullscreenElement) document.exitFullscreen?.();
  else target.requestFullscreen?.();
}

// ----------------------------------------------------------- save file transfer

const saveStatus = document.getElementById('save-status');
const bootHint = document.getElementById('boot-hint');
const fileInput = document.getElementById('save-file-input');

function setSaveStatus(text) {
  saveStatus.textContent = text;
}

document.getElementById('download-save-btn').addEventListener('click', () => {
  // Before Start is pressed the live state is still blank, so export the
  // browser's save instead of a fresh game.
  if (!game.running && hasSave()) loadGame();
  downloadSaveFile();
  setSaveStatus('Save file downloaded.');
  if (game.running) flashToast('Save exported');
});

document.querySelectorAll('.load-save-btn').forEach((btn) => {
  btn.addEventListener('click', () => fileInput.click());
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  try {
    importSaveText(await file.text());
  } catch (err) {
    setSaveStatus(err.message);
    if (!game.running) bootHint.textContent = err.message;
    return;
  }
  const summary = `${state.player.name} · ${state.party.length} POKéMON · ${formatPlayTime()}`;
  setSaveStatus(`Loaded save: ${summary}`);
  if (!game.running) {
    bootHint.textContent = `Save loaded (${summary}). Press Start to continue.`;
    return;
  }
  // Swap the running game over to the imported save.
  game.battle = null;
  game.post = null;
  game.world = new World();
  game.scene = 'world';
  flashToast('Save loaded');
});

let toast = null;
function flashToast(text) {
  toast = { text, life: 90 };
}

// --------------------------------------------------------------- battle glue

function startBattle(request) {
  game.battle = new Battle({
    wild: request.wild,
    trainer: request.trainer,
    onEnd: (result, evolutions) => finishBattle(request, result, evolutions),
  });
  game.scene = 'battle';
}

function finishBattle(request, result, evolutions) {
  const queue = new MessageBox();
  game.post = { msg: queue, blackout: false };

  if (result === 'win' && request.npcId) setFlag(`beat:${request.npcId}`);

  for (const { mon, into } of evolutions || []) {
    const before = displayName(mon).toUpperCase();
    const after = getSpecies(into).name.toUpperCase();
    evolveInto(mon, into);
    queue.push(`What? ${before} is evolving!`);
    queue.push(`Congratulations! Your ${before} evolved into ${after}!`);
  }

  if (result === 'lose') {
    game.post.blackout = true;
    queue.push('You blacked out!');
  }

  if (!queue.active) settleAfterBattle(result);
}

/** Return control to the overworld once post-battle messages are done. */
function settleAfterBattle(result) {
  const world = game.world;
  if (result === 'lose') {
    healParty();
    const home = state.lastCenter || { map: 'littleroot', x: 5, y: 6, dir: 'down' };
    world.enterMap(home.map, home.x, home.y, home.dir || 'down');
  }
  game.post = null;
  game.battle = null;
  game.scene = 'world';
  world.resumeFromBattle();
}

// ------------------------------------------------------------------ main loop

let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!game.running) return;

  game.tick++;
  state.player.playTime += dt;

  if (game.post) {
    const queue = game.post.msg;
    queue.update();
    if (!queue.active) {
      settleAfterBattle(game.post.blackout ? 'lose' : 'win');
    } else if (wasPressed('a') || wasPressed('b')) {
      queue.advance();
    }
  } else if (game.scene === 'battle') {
    game.battle.update();
  } else {
    game.world.update();
    if (game.world.pendingBattle) {
      const request = game.world.pendingBattle;
      game.world.pendingBattle = null;
      startBattle(request);
    }
  }

  render();
  endFrame();
}

function render() {
  ctx.imageSmoothingEnabled = false;

  if (game.scene === 'battle' && game.battle) game.battle.draw(ctx, game.tick);
  else game.world.draw(ctx, game.tick);

  if (game.post?.msg.active) game.post.msg.draw(ctx, game.tick);

  if (toast) {
    toast.life--;
    const alpha = Math.min(1, toast.life / 20);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(16,20,26,0.85)';
    ctx.fillRect(6, SCREEN_H - 20, 80, 14);
    drawText(ctx, toast.text, 12, SCREEN_H - 17, '#f0f4f8', null);
    ctx.globalAlpha = 1;
    if (toast.life <= 0) toast = null;
  }
}

requestAnimationFrame(frame);

// Autosave when the tab goes away, so a closed tab does not lose progress.
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && game.running && hasFlag('gotStarter')) saveGame();
});

export { game };
