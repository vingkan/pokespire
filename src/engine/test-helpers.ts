/**
 * Test helpers for creating mock combatants and combat state.
 */
import type { Combatant, CombatState, MoveType, StatusType } from './types';

let testIdCounter = 0;

export interface TestCombatantOptions {
  id?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  speed?: number;
  types?: MoveType[];
  side?: 'player' | 'enemy';
  slotIndex?: number;
  passiveIds?: string[];
  block?: number;
}

/**
 * Create a test combatant with sensible defaults.
 */
export function createTestCombatant(options: TestCombatantOptions = {}): Combatant {
  const id = options.id ?? `test-${testIdCounter++}`;
  const maxHp = options.maxHp ?? options.hp ?? 100;

  return {
    id,
    pokemonId: 'test-pokemon',
    name: options.name ?? 'TestMon',
    types: options.types ?? ['normal'],
    side: options.side ?? 'player',
    slotIndex: options.slotIndex ?? 0,
    position: { row: 'front', column: 1 },
    hp: options.hp ?? maxHp,
    maxHp,
    speed: options.speed ?? 50,
    baseSpeed: options.speed ?? 50,
    energy: 3,
    energyPerTurn: 3,
    energyCap: 10,
    block: options.block ?? 0,
    statuses: [],
    drawPile: [],
    discardPile: [],
    hand: [],
    vanishedPile: [],
    handSize: 5,
    alive: true,
    passiveIds: options.passiveIds ?? [],
    turnFlags: {
      blazeStrikeUsedThisTurn: false,
      infernoMomentumReducedIndex: null,
      relentlessUsedThisTurn: false,
      alliesDamagedThisRound: new Set(),
      overgrowHealUsedThisTurn: false,
      torrentShieldUsedThisTurn: false,
      swarmStrikeUsedThisTurn: false,
      surgeMomentumReducedIndex: null,
      dragonsMajestyReducedIndex: null,
      sniperUsedThisTurn: false,
      hasSwitchedThisTurn: false,
      finisherUsedThisTurn: false,
    },
    costModifiers: {},
  };
}

/**
 * Create a test combat state with given combatants.
 */
export function createTestCombatState(combatants: Combatant[]): CombatState {
  return {
    combatants,
    turnOrder: combatants.map(c => ({ combatantId: c.id, hasActed: false })),
    currentTurnIndex: 0,
    round: 1,
    phase: 'ongoing',
    log: [],
    statusApplyCounter: 0,
    slipstreamProtectedIds: [],
    goldEarned: 0,
  };
}

/**
 * Apply a status to a combatant (simple helper for tests).
 */
export function addStatus(
  combatant: Combatant,
  type: StatusType,
  stacks: number,
  sourceId?: string
): void {
  combatant.statuses.push({
    type,
    stacks,
    sourceId,
    appliedOrder: 0,
  });
}

/**
 * Reset the test ID counter (call at start of each test file).
 */
export function resetTestIds(): void {
  testIdCounter = 0;
}
