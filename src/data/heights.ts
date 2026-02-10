/**
 * Pokemon weights in kg.
 * Used to scale sprites proportionally in battle.
 * Weight works better than height since "height" for snake-like Pokemon is actually length.
 * Pikachu (6kg) is the reference size.
 */
export const POKEMON_WEIGHTS: Record<string, number> = {
  // Starters
  bulbasaur: 6.9,
  ivysaur: 13,
  venusaur: 70,      // Real: 100kg, adjusted -30% for sprite scaling
  charmander: 8.5,
  charmeleon: 19,
  charizard: 90.5,
  squirtle: 9,
  wartortle: 9.5, // Real: 22.5, adjusted -25% for sprite scaling
  blastoise: 29.3, // Real: 85.5, adjusted -30% for sprite scaling

  // Others
  pikachu: 11,  // Real: 6kg, increased 20% for sprite scaling
  raichu: 30,
  rattata: 3.5,
  raticate: 18.5,
  pidgey: 6,    // Real: 1.8kg, increased 50% for sprite scaling
  pidgeotto: 30,
  pidgeot: 39.5,
  ekans: 6.9,
  arbok: 65,
  snorlax: 109,     // Real: 460kg, reduced 10% for sprite scaling
  tauros: 88.4,
  kangaskhan: 80,
  mewtwo: 122,

  // Giovanni's team
  persian: 16,  // Real: 32kg, reduced 20% for sprite scaling

  // Rhyhorn line
  rhyhorn: 26,   // Real: 115kg, reduced ~40% for sprite scaling
  rhydon: 46,   // Real: 120kg, reduced ~30% for sprite scaling

  // Nidoking line
  'nidoran-m': 6.5, // Real: 9kg, reduced 10% for sprite scaling
  nidorino: 19.5,
  nidoking: 26,   // Real: 62kg, reduced 25% for sprite scaling

  // Nidoqueen line
  'nidoran-f': 5,   // Real: 7kg, reduced 10% for sprite scaling
  nidorina: 20,
  nidoqueen: 17,  // Real: 60kg, reduced 35% for sprite scaling

  // Drowzee line
  drowzee: 10,    // Real: 32.4kg, reduced for sprite scaling
  hypno: 25,      // Real: 75.6kg, reduced for sprite scaling

  // Growlithe line
  growlithe: 12,  // Real: 19kg, reduced for sprite scaling
  arcanine: 50,   // Real: 155kg, reduced for sprite scaling

  // Voltorb line
  voltorb: 10,
  electrode: 12,

  // Caterpie line
  caterpie: 1,
  butterfree: 8,  // Real: 32kg, increased for sprite scaling
};

// Reference Pokemon and base sprite size
const REFERENCE_WEIGHT = 6; // Pikachu's weight in kg
const BASE_SPRITE_SIZE = 80; // Pikachu's sprite size in pixels

/** Maximum sprite size in the battle grid. If any Pokemon exceeds this,
 *  ALL sprites are scaled down proportionally to preserve size ratios. */
export const MAX_BATTLE_SPRITE_SIZE = 200;

/**
 * Calculate sprite size for a Pokemon based on its weight.
 * Uses cube root scaling since weight scales with volume (length^3).
 * This gives a more natural size progression.
 * Returns the NATURAL (uncapped) size — callers in the battle grid
 * should apply the proportional scale from `getBattleSpriteScale`.
 */
export function getSpriteSize(pokemonId: string): number {
  const weight = POKEMON_WEIGHTS[pokemonId] ?? REFERENCE_WEIGHT;
  // Cube root scaling: weight ~ volume ~ size^3, so size ~ weight^(1/3)
  const scale = Math.cbrt(weight / REFERENCE_WEIGHT);
  return Math.round(BASE_SPRITE_SIZE * scale);
}

/**
 * Compute a global sprite scale factor for a battle.
 * If the largest Pokemon's natural sprite size exceeds MAX_BATTLE_SPRITE_SIZE,
 * returns a factor < 1 that all sprites should be multiplied by.
 * This preserves relative size ratios (Snorlax stays ~2.6x Pikachu).
 */
export function getBattleSpriteScale(pokemonIds: string[]): number {
  if (pokemonIds.length === 0) return 1;
  const maxNatural = Math.max(...pokemonIds.map(id => getSpriteSize(id)));
  return Math.min(1, MAX_BATTLE_SPRITE_SIZE / maxNatural);
}
