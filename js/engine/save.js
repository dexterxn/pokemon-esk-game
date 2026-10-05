import { state, resetState } from './state.js';
import { getSpecies } from '../data/species.js';
import { getMove } from '../data/moves.js';
import { getMap } from '../data/maps.js';

const KEY = 'pokemon-esk-game.save.v1';

/** First line of an exported save file, so stray text files are rejected. */
const FILE_HEADER = 'POKEMON-ESK-GAME SAVE v1';

function snapshot() {
  return {
    version: 1,
    savedAt: Date.now(),
    player: state.player,
    party: state.party,
    box: state.box,
    bag: state.bag,
    dex: state.dex,
    flags: state.flags,
    lastCenter: state.lastCenter,
  };
}

export function saveGame() {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot()));
    return true;
  } catch (err) {
    console.warn('Save failed:', err);
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

/** Copy a parsed save into the live state. Returns false if it is unusable. */
function applySave(data) {
  if (!data || data.version !== 1) return false;
  resetState();
  Object.assign(state.player, data.player || {});
  state.party = data.party || [];
  state.box = data.box || [];
  state.bag = data.bag || {};
  state.dex = data.dex || { seen: {}, caught: {} };
  state.flags = data.flags || {};
  state.lastCenter = data.lastCenter || null;
  return true;
}

export function loadGame() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { return false; }
  if (!raw) return false;

  try {
    return applySave(JSON.parse(raw));
  } catch (err) {
    console.warn('Save file is corrupt, ignoring it:', err);
    return false;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch { /* nothing we can do */ }
}

export function saveTimestamp() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    return data?.savedAt ? new Date(data.savedAt) : null;
  } catch { return null; }
}

// --------------------------------------------------------- portable save files

/** The current game as the text of a downloadable save file. */
export function exportSaveText() {
  return `${FILE_HEADER}\n${JSON.stringify(snapshot(), null, 1)}\n`;
}

/** Trigger a browser download of the current game as a .txt save file. */
export function downloadSaveFile() {
  const blob = new Blob([exportSaveText()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pokemon-save-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const validMon = (mon) =>
  mon && typeof mon === 'object' &&
  getSpecies(mon.species) &&
  Number.isFinite(mon.level) && Number.isFinite(mon.hp) &&
  mon.stats && Number.isFinite(mon.stats.hp) &&
  Array.isArray(mon.moves) && mon.moves.length > 0 &&
  mon.moves.every((m) => m && getMove(m.id));

/**
 * Parse an exported save file. Returns the save data, or throws an Error whose
 * message is safe to show the player.
 */
export function parseSaveText(text) {
  const body = String(text).trim();
  const json = body.startsWith(FILE_HEADER) ? body.slice(FILE_HEADER.length) : body;
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('That file is not a save file.'); }

  if (!data || data.version !== 1) throw new Error('That save file is from an unknown version.');
  if (!data.player || !getMap(data.player.map)) throw new Error('That save file is damaged.');
  if (!Array.isArray(data.party) || !data.party.every(validMon)) throw new Error('That save file is damaged.');
  if (data.box && (!Array.isArray(data.box) || !data.box.every(validMon))) throw new Error('That save file is damaged.');
  return data;
}

/** Load an exported save file into the game and persist it to this browser. */
export function importSaveText(text) {
  const data = parseSaveText(text);
  applySave(data);
  saveGame();
  return data;
}
