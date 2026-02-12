/**
 * Card Draft System
 *
 * Handles card pool selection and rarity-weighted drafting for Pokemon.
 * Uses type-based pools with fallback chain for missing rarities.
 */

import type { MoveType, CardRarity, MoveDefinition } from '../engine/types';
import { MOVES } from '../data/loaders';

// ============================================================
// Rarity Distribution by Pokemon Level
// ============================================================

interface RarityWeights {
  basic: number;
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
}

const RARITY_BY_LEVEL: Record<number, RarityWeights> = {
  1: { basic: 20, common: 50, uncommon: 20, rare: 9, epic: 1 },
  2: { basic: 8, common: 45, uncommon: 30, rare: 15, epic: 2 },
  3: { basic: 5, common: 30, uncommon: 35, rare: 25, epic: 5 },
  4: { basic: 0, common: 15, uncommon: 25, rare: 40, epic: 20 },
};

// Fallback order: if target rarity not available, try these in order
const RARITY_FALLBACK_ORDER: CardRarity[] = ['epic', 'rare', 'uncommon', 'common', 'basic'];

// Chance to draw from type pool vs global pool
const TYPE_POOL_CHANCE = 0.75;

// ============================================================
// Pool Building
// ============================================================

/**
 * Get all cards that belong to a specific type pool.
 */
function getCardsInPool(poolType: MoveType): MoveDefinition[] {
  return Object.values(MOVES).filter(move =>
    move.pools?.includes(poolType) && !move.isItem
  );
}

/**
 * Get all cards (global pool).
 */
function getAllCards(): MoveDefinition[] {
  return Object.values(MOVES).filter(move => !move.isItem);
}

/**
 * Filter cards by rarity.
 */
function filterByRarity(cards: MoveDefinition[], rarity: CardRarity): MoveDefinition[] {
  return cards.filter(card => card.rarity === rarity);
}

/**
 * Build the combined type pool for a Pokemon based on their types.
 * Dual-type Pokemon get cards from both type pools.
 */
export function buildTypePool(types: MoveType[]): MoveDefinition[] {
  const seen = new Set<string>();
  const pool: MoveDefinition[] = [];

  for (const type of types) {
    for (const card of getCardsInPool(type)) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        pool.push(card);
      }
    }
  }

  return pool;
}

// ============================================================
// Rarity Selection with Fallback
// ============================================================

/**
 * Roll for a rarity based on level weights.
 */
function rollRarity(rng: () => number, level: number): CardRarity {
  const weights = RARITY_BY_LEVEL[level] || RARITY_BY_LEVEL[1];
  const roll = rng() * 100;

  let cumulative = 0;

  cumulative += weights.basic;
  if (roll < cumulative) return 'basic';

  cumulative += weights.common;
  if (roll < cumulative) return 'common';

  cumulative += weights.uncommon;
  if (roll < cumulative) return 'uncommon';

  cumulative += weights.rare;
  if (roll < cumulative) return 'rare';

  return 'epic';
}

/**
 * Find the fallback rarity index (lower priority = try first for fallback).
 */
function getRarityFallbackIndex(rarity: CardRarity): number {
  return RARITY_FALLBACK_ORDER.indexOf(rarity);
}

/**
 * Try to get cards of a specific rarity from a pool.
 * If not available, fall back to lower rarities.
 * Returns null if pool is completely empty.
 */
function getCardsWithFallback(
  pool: MoveDefinition[],
  targetRarity: CardRarity
): MoveDefinition[] | null {
  const startIndex = getRarityFallbackIndex(targetRarity);

  // Try target rarity and each fallback in order
  for (let i = startIndex; i < RARITY_FALLBACK_ORDER.length; i++) {
    const rarity = RARITY_FALLBACK_ORDER[i];
    const cards = filterByRarity(pool, rarity);
    if (cards.length > 0) {
      return cards;
    }
  }

  // If nothing found going down, try going up (shouldn't happen often)
  for (let i = startIndex - 1; i >= 0; i--) {
    const rarity = RARITY_FALLBACK_ORDER[i];
    const cards = filterByRarity(pool, rarity);
    if (cards.length > 0) {
      return cards;
    }
  }

  return null;
}

// ============================================================
// Main Draft Function
// ============================================================

/**
 * Sample draft cards for a Pokemon.
 *
 * @param rng - Seeded random number generator
 * @param types - Pokemon's types (e.g., ['fire', 'flying'] for Charizard)
 * @param level - Pokemon's current level (1-4)
 * @param count - Number of cards to draft
 * @returns Array of card IDs
 */
export function sampleDraftCards(
  rng: () => number,
  types: MoveType[],
  level: number,
  count: number
): string[] {
  const typePool = buildTypePool(types);
  const globalPool = getAllCards();
  const result: string[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Decide: type pool (75%) or global pool (25%)
    const useTypePool = rng() < TYPE_POOL_CHANCE;

    // Roll for rarity
    const targetRarity = rollRarity(rng, level);

    // Try to get cards from the chosen pool
    let candidatePool: MoveDefinition[] | null = null;

    if (useTypePool && typePool.length > 0) {
      candidatePool = getCardsWithFallback(typePool, targetRarity);
    }

    // If type pool failed or wasn't chosen, try global pool
    if (!candidatePool) {
      candidatePool = getCardsWithFallback(globalPool, targetRarity);
    }

    // Emergency fallback: just get any card from global pool
    if (!candidatePool || candidatePool.length === 0) {
      candidatePool = globalPool;
    }

    // Filter out already-picked cards (no duplicates in same draft)
    const available = candidatePool.filter(c => !usedIds.has(c.id));

    if (available.length > 0) {
      const index = Math.floor(rng() * available.length);
      const selected = available[index];
      result.push(selected.id);
      usedIds.add(selected.id);
    } else if (candidatePool.length > 0) {
      // If all filtered out, allow duplicates as last resort
      const index = Math.floor(rng() * candidatePool.length);
      result.push(candidatePool[index].id);
    }
  }

  // Safeguard: ensure exactly count cards (defensive coding)
  return result.slice(0, count);
}

/**
 * Get the rarity weights for a given level (for UI display).
 */
export function getRarityWeightsForLevel(level: number): RarityWeights {
  return RARITY_BY_LEVEL[level] || RARITY_BY_LEVEL[1];
}
