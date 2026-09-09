import { state, resetState } from './state.js';

const KEY = 'pokemon-esk-game.save.v1';

export function saveGame() {
  try {
    const payload = {
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
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Save failed:', err);
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function loadGame() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { return false; }
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
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
