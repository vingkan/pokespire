import type { MapNode } from './types';

/**
 * Act 1 Branching Map
 *
 * Structure:
 * - Stage 0: Spawn
 * - Stage 1: Easy battles (Rattata, Pidgey)
 * - Stage 2: Easy battles (mixed basic Pokemon)
 * - Stage 3: Medium battles (evolved forms)
 * - Stage 4: Medium battles + Rest
 * - Stage 5: Hard battles (Tauros, Pidgeot, mini-bosses)
 * - Stage 6: Giovanni Boss Fight (Persian, Nidoking, Rhydon)
 *
 * Giovanni's Pokemon have boosted HP:
 * - Persian: 55 base * 1.45 = 80 HP
 * - Nidoking: 81 base * 1.48 = 120 HP
 * - Rhydon: 105 base * 1.43 = 150 HP
 */

export const ACT1_NODES: MapNode[] = [
  // ============================================
  // Stage 0: Spawn
  // ============================================
  {
    id: 's0-spawn',
    type: 'spawn',
    stage: 0,
    connectsTo: ['s1-battle-rattata', 's1-battle-pidgey'],
    completed: false,
  },

  // ============================================
  // Stage 1: Easy intro (2 nodes)
  // ============================================
  {
    id: 's1-battle-rattata',
    type: 'battle',
    stage: 1,
    connectsTo: ['s2-battle-duo', 's2-rest'],
    completed: false,
    enemies: ['rattata'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's1-battle-pidgey',
    type: 'battle',
    stage: 1,
    connectsTo: ['s2-rest', 's2-battle-duo-2'],
    completed: false,
    enemies: ['pidgey'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },

  // ============================================
  // Stage 2: More easy battles - multi-fights (3 nodes)
  // ============================================
  {
    id: 's2-battle-duo',
    type: 'battle',
    stage: 2,
    connectsTo: ['s3-battle-raticate', 's3-battle-pidgeotto'],
    completed: false,
    enemies: ['pidgey', 'rattata'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 's2-rest',
    type: 'rest',
    stage: 2,
    connectsTo: ['s3-battle-pidgeotto', 's3-battle-arbok'],
    completed: false,
  },
  {
    id: 's2-battle-duo-2',
    type: 'battle',
    stage: 2,
    connectsTo: ['s3-battle-arbok'],
    completed: false,
    enemies: ['ekans', 'pidgey'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },

  // ============================================
  // Stage 3: Medium battles - evolved forms (3 nodes)
  // ============================================
  {
    id: 's3-battle-raticate',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-rest', 's4-battle-combo'],
    completed: false,
    enemies: ['raticate'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's3-battle-pidgeotto',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-battle-combo', 's4-battle-evolved'],
    completed: false,
    enemies: ['pidgeotto'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's3-battle-arbok',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-battle-evolved', 's4-rest'],
    completed: false,
    enemies: ['arbok'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },

  // ============================================
  // Stage 4: Mix of rest and harder battles (3 nodes)
  // ============================================
  {
    id: 's4-rest',
    type: 'rest',
    stage: 4,
    connectsTo: ['s5-battle-tauros', 's5-battle-snorlax'],
    completed: false,
  },
  {
    id: 's4-battle-combo',
    type: 'battle',
    stage: 4,
    connectsTo: ['s5-battle-tauros', 's5-battle-pidgeot'],
    completed: false,
    enemies: ['raticate', 'pidgeotto'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 's4-battle-evolved',
    type: 'battle',
    stage: 4,
    connectsTo: ['s5-battle-pidgeot', 's5-battle-kangaskhan'],
    completed: false,
    enemies: ['arbok', 'raticate'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },

  // ============================================
  // Stage 5: Hard battles - mini-bosses (4 nodes)
  // ============================================
  {
    id: 's5-battle-tauros',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-giovanni'],
    completed: false,
    enemies: ['tauros'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's5-battle-pidgeot',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-giovanni'],
    completed: false,
    enemies: ['pidgeot'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's5-battle-snorlax',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-giovanni'],
    completed: false,
    enemies: ['snorlax'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },
  {
    id: 's5-battle-kangaskhan',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-giovanni'],
    completed: false,
    enemies: ['kangaskhan'],
    enemyPositions: [{ row: 'front', column: 1 }],
  },

  // ============================================
  // Stage 6: Giovanni Boss Fight
  // ============================================
  {
    id: 's6-boss-giovanni',
    type: 'battle',
    stage: 6,
    connectsTo: ['act1-complete'],
    completed: false,
    enemies: ['persian', 'nidoking', 'rhydon'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    // No HP multiplier for now - using base stats
    enemyHpMultiplier: 1,
  },

  // ============================================
  // Act Transition Node
  // ============================================
  {
    id: 'act1-complete',
    type: 'act_transition',
    stage: 7,
    connectsTo: [],
    completed: false,
    nextAct: 2,
  },
];

/**
 * Act 2 Branching Map
 *
 * Structure:
 * - Stage 0: Post-Giovanni transition
 * - Stage 1: Harder battles + card removal
 * - Stage 2: Gauntlet paths begin
 * - Stage 3: Mixed battles and events
 * - Stage 4: Elite encounters
 * - Stage 5: Pre-boss gauntlet
 * - Stage 6: Mewtwo Final Boss
 */

export const ACT2_NODES: MapNode[] = [
  // ============================================
  // Stage 0: Start of Act 2
  // ============================================
  {
    id: 'a2-s0-spawn',
    type: 'spawn',
    stage: 0,
    connectsTo: ['a2-s1-battle-1', 'a2-s1-removal'],
    completed: false,
  },

  // ============================================
  // Stage 1: Card removal or battle
  // ============================================
  {
    id: 'a2-s1-battle-1',
    type: 'battle',
    stage: 1,
    connectsTo: ['a2-s2-battle-1', 'a2-s2-battle-2'],
    completed: false,
    enemies: ['arbok', 'raticate', 'pidgeotto'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s1-rest',
    type: 'rest',
    stage: 1,
    connectsTo: ['a2-s2-battle-2', 'a2-s2-battle-3'],
    completed: false,
  },

  // ============================================
  // Stage 2: Gauntlet paths (multi-fight nodes)
  // ============================================
  {
    id: 'a2-s2-battle-1',
    type: 'battle',
    stage: 2,
    connectsTo: ['a2-s3-rest', 'a2-s3-battle-1'],
    completed: false,
    enemies: ['tauros', 'pidgeot'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s2-battle-2',
    type: 'battle',
    stage: 2,
    connectsTo: ['a2-s3-battle-1', 'a2-s3-battle-2'],
    completed: false,
    enemies: ['snorlax'],
    enemyPositions: [{ row: 'front', column: 1 }],
    enemyHpMultiplier: 1.2, // Slightly tougher
  },
  {
    id: 'a2-s2-battle-3',
    type: 'battle',
    stage: 2,
    connectsTo: ['a2-s3-battle-2', 'a2-s3-removal'],
    completed: false,
    enemies: ['kangaskhan'],
    enemyPositions: [{ row: 'front', column: 1 }],
    enemyHpMultiplier: 1.2,
  },

  // ============================================
  // Stage 3: Mixed events and battles
  // ============================================
  {
    id: 'a2-s3-rest',
    type: 'rest',
    stage: 3,
    connectsTo: ['a2-s4-battle-1', 'a2-s4-battle-2'],
    completed: false,
  },
  {
    id: 'a2-s3-battle-1',
    type: 'battle',
    stage: 3,
    connectsTo: ['a2-s4-battle-1', 'a2-s4-gauntlet'],
    completed: false,
    enemies: ['tauros', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s3-battle-2',
    type: 'battle',
    stage: 3,
    connectsTo: ['a2-s4-battle-2', 'a2-s4-gauntlet'],
    completed: false,
    enemies: ['snorlax', 'pidgeot'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s3-rest-2',
    type: 'rest',
    stage: 3,
    connectsTo: ['a2-s4-gauntlet'],
    completed: false,
  },

  // ============================================
  // Stage 4: Elite encounters
  // ============================================
  {
    id: 'a2-s4-battle-1',
    type: 'battle',
    stage: 4,
    connectsTo: ['a2-s5-rest', 'a2-s5-battle-1'],
    completed: false,
    enemies: ['snorlax', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.15,
  },
  {
    id: 'a2-s4-battle-2',
    type: 'battle',
    stage: 4,
    connectsTo: ['a2-s5-battle-1', 'a2-s5-battle-2'],
    completed: false,
    enemies: ['tauros', 'tauros'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s4-gauntlet',
    type: 'battle',
    stage: 4,
    connectsTo: ['a2-s5-battle-2'],
    completed: false,
    enemies: ['arbok', 'raticate', 'pidgeotto'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
  },

  // ============================================
  // Stage 5: Pre-boss gauntlet
  // ============================================
  {
    id: 'a2-s5-rest',
    type: 'rest',
    stage: 5,
    connectsTo: ['a2-s6-boss-mewtwo'],
    completed: false,
  },
  {
    id: 'a2-s5-battle-1',
    type: 'battle',
    stage: 5,
    connectsTo: ['a2-s6-boss-mewtwo'],
    completed: false,
    enemies: ['snorlax', 'tauros', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
  },
  {
    id: 'a2-s5-battle-2',
    type: 'battle',
    stage: 5,
    connectsTo: ['a2-s6-boss-mewtwo'],
    completed: false,
    enemies: ['pidgeot', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
  },

  // ============================================
  // Stage 6: Mewtwo Final Boss
  // ============================================
  {
    id: 'a2-s6-boss-mewtwo',
    type: 'battle',
    stage: 6,
    connectsTo: [],
    completed: false,
    enemies: ['mewtwo'],
    enemyPositions: [{ row: 'front', column: 1 }],
    // Mewtwo already has 200 HP, no multiplier needed
  },
];

/**
 * Helper to get node by ID
 */
export function getNodeById(nodes: MapNode[], id: string): MapNode | undefined {
  return nodes.find(n => n.id === id);
}

/**
 * Get all nodes at a specific stage
 */
export function getNodesAtStage(nodes: MapNode[], stage: number): MapNode[] {
  return nodes.filter(n => n.stage === stage);
}

/**
 * Get the maximum stage number in the map
 */
export function getMaxStage(nodes: MapNode[]): number {
  return Math.max(...nodes.map(n => n.stage));
}

/**
 * Get nodes for a specific act
 */
export function getNodesForAct(act: number): MapNode[] {
  return act === 1 ? ACT1_NODES : ACT2_NODES;
}
