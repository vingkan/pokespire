import type { Position } from '../engine/types';
import type { PassiveId } from './progression';

// ============================================================
// Run System Types — State that persists across battles
// ============================================================

/**
 * Pokemon state within a run (persists HP, deck changes across nodes)
 */
export interface RunPokemon {
  baseFormId: string;         // Original pokemon ID (e.g., "charmander") - never changes
  formId: string;             // Current form ID (e.g., "charmeleon" after evolution)
  currentHp: number;          // Persists across nodes
  maxHp: number;              // Current max HP (base + modifiers)
  maxHpModifier: number;      // HP bonus from events/leveling (separate from base)
  deck: string[];             // Card IDs, modified by drafting
  position: Position;         // Grid position
  level: number;              // 1-4
  exp: number;                // Accumulated experience
  passiveIds: PassiveId[];    // All accumulated passive abilities
  knockedOut: boolean;        // True if Pokemon was KO'd (kept for future resurrection features)
}

/**
 * Full run state
 */
export interface RunState {
  seed: number;               // RNG seed for deterministic drafting
  party: RunPokemon[];        // Party with run-specific state
  bench: RunPokemon[];        // Bench Pokemon (not in active party, no EXP, no healing)
  graveyard: RunPokemon[];    // KO'd Pokemon (removed from party, kept for future resurrection)
  currentNodeId: string;      // Current node ID
  visitedNodeIds: string[];   // All visited node IDs (for path tracking)
  nodes: MapNode[];           // All nodes in the map
  currentAct: number;         // 1 = Act 1, 2 = Act 2
  recruitSeed: number;        // Separate seed for recruit encounter RNG
  gold: number;               // PokeGold currency
}

// --- Node Types ---

export type MapNode = SpawnNode | RestNode | BattleNode | CardRemovalNode | ActTransitionNode | EventNode | RecruitNode;

export type NodeType = MapNode['type'];

export interface BaseNode {
  id: string;                 // Unique node ID
  stage: number;              // Column in map (0 = spawn, 8 = boss)
  connectsTo: string[];       // Node IDs this connects to
  completed: boolean;
  x: number;                  // Normalized 0-1 horizontal position on map
  y: number;                  // Normalized 0-1 vertical position on map
  size?: 'small' | 'normal' | 'large'; // Visual size on map (default: 'normal')
}

export interface SpawnNode extends BaseNode {
  type: 'spawn';
}

export interface RestNode extends BaseNode {
  type: 'rest';
  // Player chooses: heal 30% OR +10 max HP
}

export interface BattleNode extends BaseNode {
  type: 'battle';
  enemies: string[];          // Pokemon IDs
  enemyPositions: Position[];
  enemyHpMultiplier?: number; // Optional HP multiplier for boss fights
}

export interface CardRemovalNode extends BaseNode {
  type: 'card_removal';
  maxRemovals: number;        // 1-2 cards can be removed
}

export interface ActTransitionNode extends BaseNode {
  type: 'act_transition';
  nextAct: number;            // Act number to transition to
}

export type EventType = 'train' | 'meditate' | 'forget';

export interface EventNode extends BaseNode {
  type: 'event';
  eventType: EventType;       // Which event: train (+5 HP), meditate (+1 EXP), forget (remove cards)
}

export interface RecruitNode extends BaseNode {
  type: 'recruit';
  pokemonId: string;          // Wild Pokemon available to recruit
  recruited: boolean;         // Whether the player already recruited this Pokemon
}

// Legacy types for backwards compatibility
export type NodeDefinition = LegacyEventNode | LegacyBattleNode;

export interface LegacyEventNode {
  type: 'event';
  hpBoost: number;
  completed: boolean;
}

export interface LegacyBattleNode {
  type: 'battle';
  enemies: string[];
  enemyPositions: Position[];
  completed: boolean;
}
