import type { MoveType } from './types';

// ============================================================
// Type Effectiveness Chart - Softer Pokemon-style multipliers
// ============================================================

// Multipliers:
// - Super Effective: 1.25x (instead of 2.0x in Pokemon)
// - Not Very Effective: 0.75x (instead of 0.5x in Pokemon)
// - Quad Weak: ~1.5x (1.25 × 1.25 = 1.5625, capped at 1.5)
// - Quad Resist: ~0.66x (0.75 × 0.75 = 0.5625, floored at 0.5)
// - No immunities: would-be immunities are 0.5x (double resist)

const SUPER_EFFECTIVE = 1.25;
const NOT_EFFECTIVE = 0.75;
const IMMUNE_REPLACEMENT = 0.5; // No true immunities, just double resist

// Type effectiveness: attacker type → defender type → multiplier
// Only non-1.0 multipliers are specified
const TYPE_CHART: Record<MoveType, Partial<Record<MoveType, number>>> = {
  normal: {
    rock: NOT_EFFECTIVE,
    ghost: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
  fire: {
    grass: SUPER_EFFECTIVE,
    ice: SUPER_EFFECTIVE,
    bug: SUPER_EFFECTIVE,
    // steel: SUPER_EFFECTIVE, // Steel not in MoveType yet
    fire: NOT_EFFECTIVE,
    water: NOT_EFFECTIVE,
    rock: NOT_EFFECTIVE,
    dragon: NOT_EFFECTIVE,
  },
  water: {
    fire: SUPER_EFFECTIVE,
    ground: SUPER_EFFECTIVE,
    rock: SUPER_EFFECTIVE,
    water: NOT_EFFECTIVE,
    grass: NOT_EFFECTIVE,
    dragon: NOT_EFFECTIVE,
  },
  grass: {
    water: SUPER_EFFECTIVE,
    ground: SUPER_EFFECTIVE,
    rock: SUPER_EFFECTIVE,
    fire: NOT_EFFECTIVE,
    grass: NOT_EFFECTIVE,
    poison: NOT_EFFECTIVE,
    flying: NOT_EFFECTIVE,
    bug: NOT_EFFECTIVE,
    dragon: NOT_EFFECTIVE,
  },
  electric: {
    water: SUPER_EFFECTIVE,
    flying: SUPER_EFFECTIVE,
    electric: NOT_EFFECTIVE,
    grass: NOT_EFFECTIVE,
    dragon: NOT_EFFECTIVE,
    ground: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
  poison: {
    grass: SUPER_EFFECTIVE,
    // fairy: SUPER_EFFECTIVE, // Fairy not in MoveType
    poison: NOT_EFFECTIVE,
    ground: NOT_EFFECTIVE,
    rock: NOT_EFFECTIVE,
    ghost: NOT_EFFECTIVE,
    // steel: IMMUNE_REPLACEMENT, // Steel not in MoveType
  },
  flying: {
    grass: SUPER_EFFECTIVE,
    fighting: SUPER_EFFECTIVE,
    bug: SUPER_EFFECTIVE,
    electric: NOT_EFFECTIVE,
    rock: NOT_EFFECTIVE,
  },
  psychic: {
    fighting: SUPER_EFFECTIVE,
    poison: SUPER_EFFECTIVE,
    psychic: NOT_EFFECTIVE,
    dark: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
  dark: {
    psychic: SUPER_EFFECTIVE,
    ghost: SUPER_EFFECTIVE,
    dark: NOT_EFFECTIVE,
    fighting: NOT_EFFECTIVE,
    // fairy: NOT_EFFECTIVE, // Fairy not in MoveType
  },
  fighting: {
    normal: SUPER_EFFECTIVE,
    ice: SUPER_EFFECTIVE,
    rock: SUPER_EFFECTIVE,
    dark: SUPER_EFFECTIVE,
    // steel: SUPER_EFFECTIVE, // Steel not in MoveType
    poison: NOT_EFFECTIVE,
    flying: NOT_EFFECTIVE,
    psychic: NOT_EFFECTIVE,
    bug: NOT_EFFECTIVE,
    // fairy: NOT_EFFECTIVE, // Fairy not in MoveType
    ghost: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
  ice: {
    grass: SUPER_EFFECTIVE,
    ground: SUPER_EFFECTIVE,
    flying: SUPER_EFFECTIVE,
    dragon: SUPER_EFFECTIVE,
    fire: NOT_EFFECTIVE,
    water: NOT_EFFECTIVE,
    ice: NOT_EFFECTIVE,
  },
  bug: {
    grass: SUPER_EFFECTIVE,
    psychic: SUPER_EFFECTIVE,
    dark: SUPER_EFFECTIVE,
    fire: NOT_EFFECTIVE,
    fighting: NOT_EFFECTIVE,
    poison: NOT_EFFECTIVE,
    flying: NOT_EFFECTIVE,
    ghost: NOT_EFFECTIVE,
    // steel: NOT_EFFECTIVE, // Steel not in MoveType
    // fairy: NOT_EFFECTIVE, // Fairy not in MoveType
  },
  dragon: {
    dragon: SUPER_EFFECTIVE,
    // steel: NOT_EFFECTIVE, // Steel not in MoveType
    // fairy: IMMUNE_REPLACEMENT, // Fairy not in MoveType
  },
  ghost: {
    psychic: SUPER_EFFECTIVE,
    ghost: SUPER_EFFECTIVE,
    dark: NOT_EFFECTIVE,
    normal: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
  rock: {
    fire: SUPER_EFFECTIVE,
    ice: SUPER_EFFECTIVE,
    flying: SUPER_EFFECTIVE,
    bug: SUPER_EFFECTIVE,
    fighting: NOT_EFFECTIVE,
    ground: NOT_EFFECTIVE,
  },
  ground: {
    fire: SUPER_EFFECTIVE,
    electric: SUPER_EFFECTIVE,
    poison: SUPER_EFFECTIVE,
    rock: SUPER_EFFECTIVE,
    // steel: SUPER_EFFECTIVE, // Steel not in MoveType
    grass: NOT_EFFECTIVE,
    bug: NOT_EFFECTIVE,
    flying: IMMUNE_REPLACEMENT, // Would be immune in Pokemon
  },
};

/**
 * Get the type effectiveness multiplier for an attack against a defender.
 * Multiplies effectiveness across all defender types.
 *
 * @param attackType - The type of the attacking move
 * @param defenderTypes - Array of defender's types (1-2 types)
 * @returns Multiplier (1.0 = neutral, >1 = super effective, <1 = not effective)
 */
export function getTypeEffectiveness(attackType: MoveType, defenderTypes: MoveType[]): number {
  let multiplier = 1.0;

  for (const defType of defenderTypes) {
    const effectiveness = TYPE_CHART[attackType]?.[defType] ?? 1.0;
    multiplier *= effectiveness;
  }

  // Cap extreme values to keep damage reasonable
  // Max ~1.5x for quad weakness (1.25 × 1.25 = 1.5625)
  // Min ~0.5x for quad resist (0.75 × 0.75 = 0.5625)
  multiplier = Math.max(0.5, Math.min(1.5, multiplier));

  return multiplier;
}

/**
 * Get a display label for type effectiveness.
 * Returns null for neutral (1.0) effectiveness.
 */
export function getEffectivenessLabel(multiplier: number): string | null {
  if (multiplier >= 1.4) return 'Super Effective!';
  if (multiplier > 1.0) return 'Effective!';
  if (multiplier <= 0.6) return 'Barely Effective...';
  if (multiplier < 1.0) return 'Not Very Effective...';
  return null;
}
