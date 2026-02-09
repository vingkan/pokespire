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
  currentNodeId: string;      // Current node ID
  visitedNodeIds: string[];   // All visited node IDs (for path tracking)
  nodes: MapNode[];           // All nodes in the map
  currentAct: number;         // 1 = Act 1, 2 = Act 2
}

// --- Node Types ---

export type MapNode = SpawnNode | RestNode | BattleNode | CardRemovalNode | ActTransitionNode;

export interface BaseNode {
  id: string;                 // Unique node ID
  stage: number;              // Column in map (0 = spawn, 8 = boss)
  connectsTo: string[];       // Node IDs this connects to
  completed: boolean;
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

// Legacy types for backwards compatibility
export type NodeDefinition = EventNode | LegacyBattleNode;

export interface EventNode {
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
