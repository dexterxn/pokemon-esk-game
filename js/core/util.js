export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Pick from `[{ weight, ...}]`, falling back to the last entry. */
export function weightedPick(entries) {
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight ?? 1;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pad a number to `n` characters with leading spaces (for right-aligned HP etc). */
export const padStart = (v, n, ch = ' ') => String(v).padStart(n, ch);
