// ============================================================
// Shop System — Item catalog, Pokemon costs, and Kecleon dialogue
// ============================================================

/** Context-sensitive Kecleon shopkeeper dialogue. */
export const KECLEON_DIALOGUE = {
  welcome: '"Welcome to my shop! Take a look around!"',
  choosePokemon: '"A fine choice! Who shall carry it?"',
  purchased: '"Thank you for your business!"',
  cantAfford: '"Hmm, you\'ll need a bit more gold for that..."',
} as const;

export interface ShopItem {
  moveId: string;
  goldCost: number;
}

/** Items available for purchase in the shop. */
export const SHOP_ITEMS: ShopItem[] = [
  { moveId: 'potion', goldCost: 75 },
  { moveId: 'super-potion', goldCost: 150 },
  { moveId: 'full-heal', goldCost: 100 },
  { moveId: 'x-attack', goldCost: 100 },
  { moveId: 'dire-hit', goldCost: 125 },
  { moveId: 'x-defend', goldCost: 100 },
  { moveId: 'guard-spec', goldCost: 75 },
  { moveId: 'ether', goldCost: 125 },
  { moveId: 'smoke-ball', goldCost: 100 },
];

/** Context-sensitive Hypno move-deleter dialogue. */
export const HYPNO_DIALOGUE = {
  welcome: '"Come closer... I can make them forget..."',
  pokemonSelected: '"Ah yes... which memory shall we erase?"',
  cardForgotten: '"It is done. The memory fades..."',
  cantAfford: '"Your pockets are too light for my services..."',
} as const;

/** Gold cost per card removal at Hypno's Parlor. */
export const CARD_FORGET_COST = 100;

/** Starting gold for a new run. */
export const STARTING_GOLD = 1000;

/** Gold cost for each starter Pokemon. */
export const POKEMON_COSTS: Record<string, number> = {
  // 100g — weak stage 1, need heavy investment
  caterpie: 100, weedle: 100, rattata: 100, ekans: 100, spearow: 100,
  // 200g — decent lines, modest final forms
  pidgey: 200, sandshrew: 200, voltorb: 200, magikarp: 200,
  // 250g — classic starters
  bulbasaur: 250, charmander: 250, squirtle: 250, pikachu: 250,
  // 200g — decent lines, modest final forms (continued)
  'nidoran-m': 200, 'nidoran-f': 200, drowzee: 200,
  // 300g — strong lines with powerful passives
  growlithe: 300, rhyhorn: 300, electabuzz: 300, magmar: 300,
  // 400g — high base stats or legendary potential
  tauros: 400, kangaskhan: 400, snorlax: 400, lapras: 400, dratini: 400,
};
