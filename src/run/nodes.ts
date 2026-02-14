import type { MapNode } from './types';

/**
 * Act 1 Branching Map — Room-Aligned Layout
 *
 * Structure (28 nodes):
 * - Stage 0: Spawn
 * - Stage 1: First split (Rattata/Pidgey) + corner recruit detours (TL, BL)
 * - Stage 2: Early mid (rest, duo battles)
 * - Stage 3: Center room (evolved battles) + events (train, meditate)
 * - Stage 4: Harder battles + forget event + top-right recruit detour (TR)
 * - Stage 5: Pre-boss mini-bosses + train event
 * - Stage 6: Ariana Boss Fight (Arbok, Raticate, Hypno)
 *
 * Corner detour mechanic: junction → battle → recruit → backtrack to main path
 * After visiting a recruit node, the player rejoins the main path at the same
 * forward options they would have had from the junction.
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
    x: 0.05, y: 0.44,
  },

  // ============================================
  // Stage 1: First Split
  // ============================================
  {
    id: 's1-battle-rattata',
    type: 'battle',
    stage: 1,
    connectsTo: ['s2-rest', 's2-battle-duo', 'detour-tl-battle'],
    completed: false,
    enemies: ['rattata'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.24, y: 0.36,
  },
  {
    id: 's1-battle-pidgey',
    type: 'battle',
    stage: 1,
    connectsTo: ['s2-battle-duo', 's2-battle-duo-2', 'detour-bl-battle'],
    completed: false,
    enemies: ['pidgey'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.24, y: 0.52,
  },

  // ============================================
  // Top-Left Corner Detour (recruit path from rattata)
  // ============================================
  {
    id: 'detour-tl-battle',
    type: 'battle',
    stage: 1,
    connectsTo: ['detour-tl-recruit'],
    completed: false,
    enemies: ['pidgey', 'pidgey'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.16, y: 0.16,
  },
  {
    id: 'detour-tl-recruit',
    type: 'recruit',
    stage: 1,
    connectsTo: ['s2-rest', 's2-battle-duo'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.08, y: 0.10,
    size: 'large',
  },

  // ============================================
  // Bottom-Left Corner Detour (recruit path from pidgey)
  // ============================================
  {
    id: 'detour-bl-battle',
    type: 'battle',
    stage: 1,
    connectsTo: ['detour-bl-recruit'],
    completed: false,
    enemies: ['rattata', 'rattata'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.16, y: 0.76,
  },
  {
    id: 'detour-bl-recruit',
    type: 'recruit',
    stage: 1,
    connectsTo: ['s2-battle-duo', 's2-battle-duo-2'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.08, y: 0.86,
    size: 'large',
  },

  // ============================================
  // Stage 2: Early Mid
  // ============================================
  {
    id: 's2-rest',
    type: 'battle',
    stage: 2,
    connectsTo: ['s3-battle-raticate'],
    completed: false,
    enemies: ['ekans', 'pidgey'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.36, y: 0.33,
  },
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
    x: 0.36, y: 0.515,
  },
  {
    id: 's2-battle-duo-2',
    type: 'rest',
    stage: 2,
    connectsTo: ['s3-battle-pidgeotto', 's3-battle-arbok'],
    completed: false,
    x: 0.36, y: 0.70,
  },

  // ============================================
  // Stage 3: Center Room
  // ============================================
  {
    id: 's3-battle-raticate',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-rest', 's4-battle-combo', 's3-event-train'],
    completed: false,
    enemies: ['raticate'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.47, y: 0.33,
  },
  {
    id: 's3-battle-pidgeotto',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-battle-combo', 's4-battle-evolved'],
    completed: false,
    enemies: ['pidgeotto'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.47, y: 0.515,
  },
  {
    id: 's3-battle-arbok',
    type: 'battle',
    stage: 3,
    connectsTo: ['s4-battle-evolved', 's3-event-meditate'],
    completed: false,
    enemies: ['arbok'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.47, y: 0.70,
  },

  // ============================================
  // Stage 3: Events (above/below center room)
  // ============================================
  {
    id: 's3-event-train',
    type: 'event',
    stage: 3,
    connectsTo: ['s4-rest'],
    completed: false,
    eventId: '',
    x: 0.44, y: 0.14,
  },
  {
    id: 's3-event-meditate',
    type: 'event',
    stage: 3,
    connectsTo: ['s4-battle-evolved'],
    completed: false,
    eventId: '',
    x: 0.41, y: 0.90,
  },

  // ============================================
  // Stage 4: Harder
  // ============================================
  {
    id: 's4-rest',
    type: 'rest',
    stage: 4,
    connectsTo: ['s5-battle-tauros', 'detour-tc-event'],
    completed: false,
    x: 0.57, y: 0.33,
  },

  // ============================================
  // Top-Center Detour (random event from s4-rest)
  // ============================================
  {
    id: 'detour-tc-event',
    type: 'event',
    stage: 4,
    connectsTo: ['s5-battle-tauros'],
    completed: false,
    eventId: '',  // Assigned at runtime by assignRandomEvents()
    x: 0.60, y: 0.14,
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
    x: 0.57, y: 0.515,
  },
  {
    id: 's4-battle-evolved',
    type: 'battle',
    stage: 4,
    connectsTo: ['s5-battle-pidgeot', 's5-battle-snorlax', 's5-battle-kangaskhan', 's4-event-forget'],
    completed: false,
    enemies: ['arbok', 'raticate'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.57, y: 0.70,
  },
  {
    id: 's4-event-forget',
    type: 'event',
    stage: 4,
    connectsTo: ['s5-battle-snorlax', 's5-battle-kangaskhan'],
    completed: false,
    eventId: '',
    x: 0.60, y: 0.90,
  },

  // ============================================
  // Top-Right Corner Detour (recruit path from s4-rest)
  // ============================================
  {
    id: 'detour-tr-battle',
    type: 'battle',
    stage: 4,
    connectsTo: ['detour-tr-recruit'],
    completed: false,
    enemies: ['kangaskhan'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.86, y: 0.16,
  },
  {
    id: 'detour-tr-recruit',
    type: 'recruit',
    stage: 4,
    connectsTo: ['s6-boss-ariana'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.92, y: 0.10,
    size: 'large',
  },

  // ============================================
  // Stage 5: Pre-Boss
  // ============================================
  {
    id: 's5-battle-tauros',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-ariana', 'detour-tr-battle'],
    completed: false,
    enemies: ['tauros'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.68, y: 0.32,
  },
  {
    id: 's5-battle-pidgeot',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-ariana'],
    completed: false,
    enemies: ['pidgeot'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.68, y: 0.45,
  },
  {
    id: 's5-battle-snorlax',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-ariana'],
    completed: false,
    enemies: ['snorlax'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.68, y: 0.58,
  },
  {
    id: 's5-battle-kangaskhan',
    type: 'battle',
    stage: 5,
    connectsTo: ['s6-boss-ariana', 's5-rest'],
    completed: false,
    enemies: ['kangaskhan'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.68, y: 0.70,
  },
  {
    id: 's5-rest',
    type: 'rest',
    stage: 5,
    connectsTo: ['s6-boss-ariana'],
    completed: false,
    x: 0.80, y: 0.78,
  },

  // ============================================
  // Stage 6: Ariana Boss Fight
  // ============================================
  {
    id: 's6-boss-ariana',
    type: 'battle',
    stage: 6,
    connectsTo: ['act1-complete'],
    completed: false,
    enemies: ['arbok', 'raticate', 'hypno'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.88, y: 0.44,
    size: 'large',
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
    x: 0.95, y: 0.44,
  },
];

/**
 * Act 2 Branching Map — Room-Aligned Layout (Destroyed Rocket Lab)
 *
 * Structure (26 nodes):
 * - Stage 0: Spawn (left perimeter)
 * - Stage 1: First split (arbok+pidgeotto / raticate duo) + corner recruit detours (TL, BL)
 * - Stage 2: Left-center (rest, duo battles)
 * - Stage 3: Center crater (scaled battles) + events (top-center random, bottom meditate)
 * - Stage 4: Right-center (harder battles) + forget event
 * - Stage 5: Pre-boss mini-bosses + TR recruit detour + BR rest
 * - Stage 6: Giovanni Boss Fight
 *
 * Corner detour mechanic: junction → battle → recruit → backtrack to main path
 * Perimeter event detours: battle → event → backtrack to main path
 */

export const ACT2_NODES: MapNode[] = [
  // ============================================
  // Stage 0: Spawn
  // ============================================
  {
    id: 'a2-s0-spawn',
    type: 'spawn',
    stage: 0,
    connectsTo: ['a2-s1-battle-upper', 'a2-s1-battle-lower'],
    completed: false,
    x: 0.08, y: 0.48,
  },

  // ============================================
  // Stage 1: First Split
  // ============================================
  {
    id: 'a2-s1-battle-upper',
    type: 'battle',
    stage: 1,
    connectsTo: ['a2-s2-rest', 'a2-s2-battle-1', 'detour-a2-tl-battle'],
    completed: false,
    enemies: ['arbok', 'pidgeotto'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.24, y: 0.36,
  },
  {
    id: 'a2-s1-battle-lower',
    type: 'battle',
    stage: 1,
    connectsTo: ['a2-s2-battle-1', 'a2-s2-battle-2', 'detour-a2-bl-battle'],
    completed: false,
    enemies: ['raticate', 'raticate'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    x: 0.24, y: 0.56,
  },

  // ============================================
  // Top-Left Corner Detour (recruit)
  // ============================================
  {
    id: 'detour-a2-tl-battle',
    type: 'battle',
    stage: 1,
    connectsTo: ['detour-a2-tl-recruit'],
    completed: false,
    enemies: ['pidgeot'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.16, y: 0.14,
  },
  {
    id: 'detour-a2-tl-recruit',
    type: 'recruit',
    stage: 1,
    connectsTo: ['a2-s2-rest', 'a2-s2-battle-1'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.08, y: 0.08,
    size: 'large',
  },

  // ============================================
  // Bottom-Left Corner Detour (recruit)
  // ============================================
  {
    id: 'detour-a2-bl-battle',
    type: 'battle',
    stage: 1,
    connectsTo: ['detour-a2-bl-recruit'],
    completed: false,
    enemies: ['kangaskhan'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.16, y: 0.80,
  },
  {
    id: 'detour-a2-bl-recruit',
    type: 'recruit',
    stage: 1,
    connectsTo: ['a2-s2-battle-1', 'a2-s2-battle-2'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.08, y: 0.88,
    size: 'large',
  },

  // ============================================
  // Stage 2: Left-Center
  // ============================================
  {
    id: 'a2-s2-rest',
    type: 'rest',
    stage: 2,
    connectsTo: ['a2-s3-battle-1'],
    completed: false,
    x: 0.36, y: 0.34,
  },
  {
    id: 'a2-s2-battle-1',
    type: 'event',
    stage: 2,
    connectsTo: ['a2-s3-battle-1', 'a2-s3-battle-3'],
    completed: false,
    eventId: 'the_chasm',
    x: 0.36, y: 0.50,
  },
  // Chasm ghost battle — unlocked by choosing "Brave the Chasm" at the event above
  {
    id: 'a2-chasm-ghosts',
    type: 'battle',
    stage: 3,
    connectsTo: ['a2-s5-battle-2'],
    completed: false,
    enemies: ['gengar', 'haunter', 'gastly'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'back', column: 1 },
    ],
    x: 0.54, y: 0.50,
  },
  {
    id: 'a2-s2-battle-2',
    type: 'battle',
    stage: 2,
    connectsTo: ['a2-s3-battle-3'],
    completed: false,
    enemies: ['snorlax'],
    enemyPositions: [{ row: 'front', column: 1 }],
    enemyHpMultiplier: 1.2,
    x: 0.36, y: 0.76,
  },

  // ============================================
  // Stage 3: Center (crater area)
  // ============================================
  {
    id: 'a2-s3-battle-1',
    type: 'battle',
    stage: 3,
    connectsTo: ['a2-s4-battle-1', 'detour-a2-tc-event'],
    completed: false,
    enemies: ['snorlax', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.15,
    x: 0.48, y: 0.34,
  },
  {
    id: 'a2-s3-battle-3',
    type: 'battle',
    stage: 3,
    connectsTo: ['a2-s4-battle-3', 'a2-s3-event-meditate'],
    completed: false,
    enemies: ['arbok', 'raticate', 'pidgeotto'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.48, y: 0.76,
  },

  // ============================================
  // Top-Center Detour (random event)
  // ============================================
  {
    id: 'detour-a2-tc-event',
    type: 'event',
    stage: 3,
    connectsTo: ['a2-s4-battle-1'],
    completed: false,
    eventId: '',  // Assigned at runtime by assignRandomEvents()
    x: 0.44, y: 0.12,
  },

  // ============================================
  // Bottom-Center Detour (meditate)
  // ============================================
  {
    id: 'a2-s3-event-meditate',
    type: 'event',
    stage: 3,
    connectsTo: ['a2-s4-battle-3'],
    completed: false,
    eventId: '',
    x: 0.48, y: 0.90,
  },

  // ============================================
  // Stage 4: Right-Center
  // ============================================
  {
    id: 'a2-s4-battle-1',
    type: 'battle',
    stage: 4,
    connectsTo: ['a2-s5-battle-1', 'a2-s5-battle-2', 'detour-a2-tr-event'],
    completed: false,
    enemies: ['pidgeot', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.60, y: 0.34,
  },

  // ============================================
  // Top-Right Detour (train event from a2-s4-battle-1)
  // ============================================
  {
    id: 'detour-a2-tr-event',
    type: 'event',
    stage: 4,
    connectsTo: ['a2-s5-battle-1', 'a2-s5-battle-2'],
    completed: false,
    eventId: '',
    x: 0.60, y: 0.12,
  },

  {
    id: 'a2-s4-battle-3',
    type: 'battle',
    stage: 4,
    connectsTo: ['a2-s5-battle-2', 'a2-s5-battle-3', 'a2-s4-event-forget'],
    completed: false,
    enemies: ['tauros', 'pidgeot'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.60, y: 0.76,
  },

  // ============================================
  // Bottom-Right-Center Detour (forget)
  // ============================================
  {
    id: 'a2-s4-event-forget',
    type: 'event',
    stage: 4,
    connectsTo: ['a2-s5-battle-2', 'a2-s5-battle-3'],
    completed: false,
    eventId: '',
    x: 0.60, y: 0.90,
  },

  // ============================================
  // Stage 5: Pre-Boss
  // ============================================
  {
    id: 'a2-s5-battle-1',
    type: 'battle',
    stage: 5,
    connectsTo: ['a2-s6-boss-giovanni', 'detour-a2-tr-battle'],
    completed: false,
    enemies: ['snorlax', 'tauros', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.72, y: 0.36,
  },
  {
    id: 'a2-s5-battle-2',
    type: 'battle',
    stage: 5,
    connectsTo: ['a2-s6-boss-giovanni'],
    completed: false,
    enemies: ['pidgeot', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.72, y: 0.56,
  },
  {
    id: 'a2-s5-battle-3',
    type: 'battle',
    stage: 5,
    connectsTo: ['a2-s6-boss-giovanni', 'a2-s5-rest'],
    completed: false,
    enemies: ['snorlax', 'pidgeot'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.72, y: 0.76,
  },

  // ============================================
  // Top-Right Corner Detour (recruit)
  // ============================================
  {
    id: 'detour-a2-tr-battle',
    type: 'battle',
    stage: 5,
    connectsTo: ['detour-a2-tr-recruit'],
    completed: false,
    enemies: ['snorlax'],
    enemyPositions: [{ row: 'front', column: 1 }],
    enemyHpMultiplier: 1.2,
    x: 0.88, y: 0.14,
  },
  {
    id: 'detour-a2-tr-recruit',
    type: 'recruit',
    stage: 5,
    connectsTo: ['a2-s6-boss-giovanni'],
    completed: false,
    pokemonId: '',
    recruited: false,
    x: 0.92, y: 0.08,
    size: 'large',
  },

  // ============================================
  // Bottom-Right Corner Detour (rest)
  // ============================================
  {
    id: 'a2-s5-rest',
    type: 'rest',
    stage: 5,
    connectsTo: ['a2-s6-boss-giovanni'],
    completed: false,
    x: 0.90, y: 0.66,
  },

  // ============================================
  // Stage 6: Giovanni Boss Fight
  // ============================================
  {
    id: 'a2-s6-boss-giovanni',
    type: 'battle',
    stage: 6,
    connectsTo: ['a2-act2-complete'],
    completed: false,
    enemies: ['persian', 'nidoking', 'rhydon'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.90, y: 0.44,
    size: 'large',
  },

  // ============================================
  // Act Transition Node
  // ============================================
  {
    id: 'a2-act2-complete',
    type: 'act_transition',
    stage: 7,
    connectsTo: [],
    completed: false,
    nextAct: 3,
    x: 0.97, y: 0.44,
  },
];

/**
 * Act 3 Branching Map — Underground Caverns
 *
 * Structure (~20 nodes, diamond branching pattern):
 * - Stage 0: Spawn
 * - Stage 1: First split (2 battles, evolved Pokemon)
 * - Stage 2: 2 battles + 1 rest
 * - Stage 3: 3 battles (3-4 enemies, 1.15x HP)
 * - Stage 4: 2 battles + 1 train event (3-4 enemies, 1.2x HP)
 * - Stage 5: 3 battles + 1 rest (3-4 enemies, 1.25x HP)
 * - Stage 6: Mewtwo Final Boss
 */

export const ACT3_NODES: MapNode[] = [
  // ============================================
  // Stage 0: Spawn
  // ============================================
  {
    id: 'a3-s0-spawn',
    type: 'spawn',
    stage: 0,
    connectsTo: ['a3-s1-battle-1', 'a3-s1-battle-2'],
    completed: false,
    x: 0.05, y: 0.44,
  },

  // ============================================
  // Stage 1: First Split (evolved Pokemon)
  // ============================================
  {
    id: 'a3-s1-battle-1',
    type: 'battle',
    stage: 1,
    connectsTo: ['a3-s2-battle-1', 'a3-s2-rest'],
    completed: false,
    enemies: ['arcanine', 'nidoking', 'sandslash'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.18, y: 0.30,
  },
  {
    id: 'a3-s1-battle-2',
    type: 'battle',
    stage: 1,
    connectsTo: ['a3-s2-rest', 'a3-s2-battle-2'],
    completed: false,
    enemies: ['gyarados', 'nidoqueen', 'fearow'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.18, y: 0.58,
  },

  // ============================================
  // Stage 2: Mid-early (2 battles + 1 rest)
  // ============================================
  {
    id: 'a3-s2-battle-1',
    type: 'battle',
    stage: 2,
    connectsTo: ['a3-s3-battle-1', 'a3-s3-battle-2'],
    completed: false,
    enemies: ['rhydon', 'electrode', 'hypno'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.30, y: 0.24,
  },
  {
    id: 'a3-s2-rest',
    type: 'rest',
    stage: 2,
    connectsTo: ['a3-s3-battle-2'],
    completed: false,
    x: 0.30, y: 0.44,
  },
  {
    id: 'a3-s2-battle-2',
    type: 'battle',
    stage: 2,
    connectsTo: ['a3-s3-battle-2', 'a3-s3-battle-3'],
    completed: false,
    enemies: ['dragonair', 'lapras', 'pidgeot'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    x: 0.30, y: 0.64,
  },

  // ============================================
  // Stage 3: Center (3 battles, 3-4 enemies, 1.15x HP)
  // ============================================
  {
    id: 'a3-s3-battle-1',
    type: 'battle',
    stage: 3,
    connectsTo: ['a3-s4-battle-1', 'a3-s4-event-train'],
    completed: false,
    enemies: ['nidoking', 'nidoqueen', 'arcanine'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.15,
    x: 0.42, y: 0.24,
  },
  {
    id: 'a3-s3-battle-2',
    type: 'battle',
    stage: 3,
    connectsTo: ['a3-s4-battle-1', 'a3-s4-battle-2'],
    completed: false,
    enemies: ['snorlax', 'kangaskhan', 'lapras', 'hypno'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
      { row: 'back', column: 1 },
    ],
    enemyHpMultiplier: 1.15,
    x: 0.42, y: 0.44,
  },
  {
    id: 'a3-s3-battle-3',
    type: 'battle',
    stage: 3,
    connectsTo: ['a3-s4-battle-2', 'a3-s4-event-train'],
    completed: false,
    enemies: ['gyarados', 'dragonair', 'rhydon'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.15,
    x: 0.42, y: 0.64,
  },

  // ============================================
  // Stage 4: Harder (2 battles + 1 train event, 1.2x HP)
  // ============================================
  {
    id: 'a3-s4-battle-1',
    type: 'battle',
    stage: 4,
    connectsTo: ['a3-s5-battle-1', 'a3-s5-battle-2'],
    completed: false,
    enemies: ['dragonite', 'arcanine', 'nidoking'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.55, y: 0.30,
  },
  {
    id: 'a3-s4-event-train',
    type: 'event',
    stage: 4,
    connectsTo: ['a3-s5-battle-2'],
    completed: false,
    eventId: '',
    x: 0.55, y: 0.44,
  },
  {
    id: 'a3-s4-battle-2',
    type: 'battle',
    stage: 4,
    connectsTo: ['a3-s5-battle-2', 'a3-s5-battle-3'],
    completed: false,
    enemies: ['gyarados', 'lapras', 'electrode', 'sandslash'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
      { row: 'back', column: 1 },
    ],
    enemyHpMultiplier: 1.2,
    x: 0.55, y: 0.58,
  },

  // ============================================
  // Stage 5: Pre-Boss (3 battles + 1 rest, 1.25x HP)
  // ============================================
  {
    id: 'a3-s5-battle-1',
    type: 'battle',
    stage: 5,
    connectsTo: ['a3-s6-boss-mewtwo'],
    completed: false,
    enemies: ['dragonite', 'snorlax', 'kangaskhan'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.25,
    x: 0.68, y: 0.26,
  },
  {
    id: 'a3-s5-battle-2',
    type: 'battle',
    stage: 5,
    connectsTo: ['a3-s6-boss-mewtwo', 'a3-s5-rest'],
    completed: false,
    enemies: ['nidoking', 'nidoqueen', 'arcanine', 'rhydon'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
      { row: 'back', column: 1 },
    ],
    enemyHpMultiplier: 1.25,
    x: 0.68, y: 0.44,
  },
  {
    id: 'a3-s5-battle-3',
    type: 'battle',
    stage: 5,
    connectsTo: ['a3-s6-boss-mewtwo'],
    completed: false,
    enemies: ['gyarados', 'dragonite', 'lapras'],
    enemyPositions: [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ],
    enemyHpMultiplier: 1.25,
    x: 0.68, y: 0.62,
  },
  {
    id: 'a3-s5-rest',
    type: 'rest',
    stage: 5,
    connectsTo: ['a3-s6-boss-mewtwo'],
    completed: false,
    x: 0.80, y: 0.58,
  },

  // ============================================
  // Stage 6: Mewtwo Final Boss
  // ============================================
  {
    id: 'a3-s6-boss-mewtwo',
    type: 'battle',
    stage: 6,
    connectsTo: [],
    completed: false,
    enemies: ['mewtwo'],
    enemyPositions: [{ row: 'front', column: 1 }],
    x: 0.88, y: 0.44,
    size: 'large',
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
  if (act === 1) return ACT1_NODES;
  if (act === 2) return ACT2_NODES;
  return ACT3_NODES;
}
