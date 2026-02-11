import type { MoveDefinition, PokemonData, MoveType, MoveRange, CardEffect } from '../engine/types';
import movesData from './moves.json';
import pokemonData from './pokemon.json';

// ============================================================
// Data Loaders — Load JSON data and export typed objects
// ============================================================

// Type for raw move data from JSON (without id)
interface RawMoveData {
  name: string;
  type: string;
  cost: number;
  range: string;
  vanish: boolean;
  effects: CardEffect[];
  description: string;
  rarity?: string;
  pools?: string[];
}

// Type for raw pokemon data from JSON (without id)
interface RawPokemonData {
  name: string;
  types: string[];
  maxHp: number;
  baseSpeed: number;
  energyPerTurn: number;
  energyCap: number;
  handSize: number;
  deck: string[];
  abilities: string[];
}

/** All move definitions, keyed by move ID */
export const MOVES: Record<string, MoveDefinition> = Object.fromEntries(
  Object.entries(movesData as Record<string, RawMoveData>).map(([id, move]) => [
    id,
    {
      id,
      name: move.name,
      type: move.type as MoveType,
      cost: move.cost,
      range: move.range as MoveRange,
      vanish: move.vanish,
      effects: move.effects,
      description: move.description,
      rarity: move.rarity as MoveDefinition['rarity'],
      pools: move.pools as MoveType[] | undefined,
    },
  ])
);

/** All Pokemon definitions, keyed by Pokemon ID */
export const POKEMON: Record<string, PokemonData> = Object.fromEntries(
  Object.entries(pokemonData as Record<string, RawPokemonData>).map(([id, poke]) => [
    id,
    {
      id,
      name: poke.name,
      types: poke.types as MoveType[],
      maxHp: poke.maxHp,
      baseSpeed: poke.baseSpeed,
      energyPerTurn: poke.energyPerTurn,
      energyCap: poke.energyCap,
      handSize: poke.handSize,
      deck: poke.deck,
      abilities: poke.abilities,
    },
  ])
);

/** Starter Pokemon (player-selectable) */
export const STARTER_POKEMON: Record<string, PokemonData> = {
  bulbasaur: POKEMON.bulbasaur,
  squirtle: POKEMON.squirtle,
  charmander: POKEMON.charmander,
  pikachu: POKEMON.pikachu,
  pidgey: POKEMON.pidgey,
  rattata: POKEMON.rattata,
  ekans: POKEMON.ekans,
  tauros: POKEMON.tauros,
  snorlax: POKEMON.snorlax,
  kangaskhan: POKEMON.kangaskhan,
  'nidoran-m': POKEMON['nidoran-m'],
  'nidoran-f': POKEMON['nidoran-f'],
  rhyhorn: POKEMON.rhyhorn,
  drowzee: POKEMON.drowzee,
  growlithe: POKEMON.growlithe,
  voltorb: POKEMON.voltorb,
  caterpie: POKEMON.caterpie,
  weedle: POKEMON.weedle,
};

/** Enemy Pokemon */
export const ENEMY_POKEMON: Record<string, PokemonData> = {
  rattata: POKEMON.rattata,
  pidgey: POKEMON.pidgey,
  ekans: POKEMON.ekans,
};

/**
 * Get a move definition by ID.
 * Handles Parental Bond copies (cards ending in __parental).
 * @throws Error if move not found
 */
export function getMove(id: string): MoveDefinition {
  // Check for Parental Bond copy (e.g., "tackle__parental")
  if (id.endsWith('__parental')) {
    const baseId = id.replace('__parental', '');
    const baseMove = MOVES[baseId];
    if (!baseMove) throw new Error(`Move not found: ${baseId}`);

    // Create a modified copy with 0 cost, vanish, and halved damage
    return {
      ...baseMove,
      id: id,  // Keep the __parental suffix in the ID
      name: `${baseMove.name} (Echo)`,
      cost: 0,
      vanish: true,
      effects: baseMove.effects.map(effect => {
        // Halve all damage-dealing effects
        switch (effect.type) {
          case 'damage':
            return { ...effect, value: Math.floor(effect.value / 2) };
          case 'multi_hit':
            return { ...effect, value: Math.floor(effect.value / 2) };
          case 'recoil':
            return { ...effect, value: Math.floor(effect.value / 2) };
          case 'heal_on_hit':
            return { ...effect, value: Math.floor(effect.value / 2) };
          case 'self_ko':
            return { ...effect, value: Math.floor(effect.value / 2) };
          default:
            return effect;
        }
      }),
    };
  }

  const move = MOVES[id];
  if (!move) throw new Error(`Move not found: ${id}`);
  return move;
}

/**
 * Check if a card ID is a Parental Bond copy.
 */
export function isParentalBondCopy(id: string): boolean {
  return id.endsWith('__parental');
}

/**
 * Get a Pokemon definition by ID.
 * @throws Error if Pokemon not found
 */
export function getPokemon(id: string): PokemonData {
  const pokemon = POKEMON[id];
  if (!pokemon) throw new Error(`Pokemon not found: ${id}`);
  return pokemon;
}

// Legacy alias for backward compatibility during migration
export const getCard = getMove;
