export const ITEMS = {
  pokeball:    { name: 'Poké Ball',   kind: 'ball',   ballRate: 1,   price: 200,  desc: 'A device for catching wild Pokémon.' },
  greatball:   { name: 'Great Ball',  kind: 'ball',   ballRate: 1.5, price: 600,  desc: 'A good Ball with a higher catch rate.' },
  ultraball:   { name: 'Ultra Ball',  kind: 'ball',   ballRate: 2,   price: 1200, desc: 'An excellent Ball with a high catch rate.' },
  potion:      { name: 'Potion',      kind: 'heal',   heal: 20,      price: 300,  desc: 'Restores 20 HP to one Pokémon.' },
  superpotion: { name: 'Super Potion',kind: 'heal',   heal: 50,      price: 700,  desc: 'Restores 50 HP to one Pokémon.' },
  hyperpotion: { name: 'Hyper Potion',kind: 'heal',   heal: 120,     price: 1200, desc: 'Restores 120 HP to one Pokémon.' },
  revive:      { name: 'Revive',      kind: 'revive', price: 1500,   desc: 'Revives a fainted Pokémon to half HP.' },
  antidote:    { name: 'Antidote',    kind: 'status', cures: 'poison',   price: 100, desc: 'Cures a poisoned Pokémon.' },
  paralyzheal: { name: 'Paralyz Heal',kind: 'status', cures: 'paralyze', price: 200, desc: 'Cures a paralyzed Pokémon.' },
  awakening:   { name: 'Awakening',   kind: 'status', cures: 'sleep',    price: 250, desc: 'Awakens a sleeping Pokémon.' },
  burnheal:    { name: 'Burn Heal',   kind: 'status', cures: 'burn',     price: 250, desc: 'Heals a burned Pokémon.' },
  fullheal:    { name: 'Full Heal',   kind: 'status', cures: 'any',      price: 600, desc: 'Cures any status problem.' },
};

export const getItem = (id) => ITEMS[id];

/** What the Poké Mart stocks, in display order. */
export const MART_STOCK = ['pokeball', 'greatball', 'potion', 'superpotion', 'antidote', 'paralyzheal', 'awakening'];
