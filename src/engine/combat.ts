import type {
  Combatant, CombatState, CombatantSide, TurnQueueEntry,
  PokemonData, LogEntry, Position,
} from './types';
import { shuffle } from './deck';
import { getEffectiveSpeed, processRoundBoundary } from './status';
import { assignPartyPositions } from './position';
import { onRoundEnd } from './passives';
import { getProgressionTree, getRungForLevel } from '../run/progression';

// ============================================================
// Combat State Creation & Turn Order — Sections 3, 9
// ============================================================

let combatantCounter = 0;

function createCombatant(
  data: PokemonData,
  side: CombatantSide,
  slotIndex: number,
  position: Position,
  skipShuffle?: boolean,
): Combatant {
  const id = `${data.id}-${combatantCounter++}`;
  return {
    id,
    pokemonId: data.id,
    name: data.name,
    types: data.types,
    side,
    slotIndex,
    position,
    hp: data.maxHp,
    maxHp: data.maxHp,
    speed: data.baseSpeed,
    baseSpeed: data.baseSpeed,
    energy: 0,           // Section 5.2: start at 0
    energyPerTurn: data.energyPerTurn,
    energyCap: data.energyCap,
    block: 0,
    statuses: [],
    drawPile: skipShuffle ? [...data.deck].reverse() : shuffle([...data.deck]),
    discardPile: [],
    hand: [],
    vanishedPile: [],
    handSize: data.handSize,
    alive: true,
    // Passive ability system - defaults
    passiveIds: [],
    turnFlags: {
      blazeStrikeUsedThisTurn: false,
      infernoMomentumReducedIndex: null,
      relentlessUsedThisTurn: false,
      alliesDamagedThisRound: new Set(),
      overgrowHealUsedThisTurn: false,
      torrentShieldUsedThisTurn: false,
      swarmStrikeUsedThisTurn: false,
    },
    costModifiers: {},
  };
}

/**
 * Initialize a fresh combat state.
 * @param playerParty - Array of Pokemon data for the player's team
 * @param enemyParty - Array of Pokemon data for the enemy's team
 * @param playerPositions - Optional custom positions for player Pokemon (auto-assigned if not provided)
 * @param enemyPositions - Optional custom positions for enemy Pokemon (auto-assigned if not provided)
 * @param playerSlotIndices - Optional slot indices for players (used when some party members are knocked out)
 */
export function createCombatState(
  playerParty: PokemonData[],
  enemyParty: PokemonData[],
  playerPositions?: Position[],
  enemyPositions?: Position[],
  playerSlotIndices?: number[],
  skipShuffle?: boolean,
): CombatState {
  combatantCounter = 0;

  const pPositions = playerPositions ?? assignPartyPositions(playerParty.length);
  const ePositions = enemyPositions ?? assignPartyPositions(enemyParty.length);
  const pSlotIndices = playerSlotIndices ?? playerParty.map((_, i) => i);

  const combatants: Combatant[] = [
    ...playerParty.map((p, i) => createCombatant(p, 'player', pSlotIndices[i], pPositions[i], skipShuffle)),
    ...enemyParty.map((e, i) => createCombatant(e, 'enemy', i, ePositions[i], skipShuffle)),
  ];

  // Assign level 1 passives to enemies
  const enemyCombatants = combatants.filter(c => c.side === 'enemy');
  for (const enemy of enemyCombatants) {
    const tree = getProgressionTree(enemy.pokemonId);
    if (tree) {
      const level1Rung = getRungForLevel(tree, 1);
      if (level1Rung && level1Rung.passiveId !== 'none') {
        enemy.passiveIds = [level1Rung.passiveId];
      }
    }
  }

  const state: CombatState = {
    combatants,
    turnOrder: [],
    currentTurnIndex: 0,
    round: 1,
    phase: 'ongoing',
    log: [],
    statusApplyCounter: 0,
    slipstreamProtectedIds: [],
  };

  // Build initial turn order
  state.turnOrder = buildTurnOrder(state);

  return state;
}

/**
 * Build turn order queue — Section 3.1.
 * Highest speed first.
 * Tiebreakers:
 *   - Player before enemy
 *   - Player ties: rightmost slot first (higher slotIndex)
 *   - Enemy ties: leftmost slot first (lower slotIndex)
 */
export function buildTurnOrder(state: CombatState): TurnQueueEntry[] {
  const living = state.combatants.filter(c => c.alive);

  living.sort((a, b) => {
    const speedA = getEffectiveSpeed(a);
    const speedB = getEffectiveSpeed(b);

    // Primary: speed descending
    if (speedA !== speedB) return speedB - speedA;

    // Tiebreaker 1: player before enemy
    if (a.side !== b.side) return a.side === 'player' ? -1 : 1;

    // Tiebreaker 2: same side
    if (a.side === 'player') {
      // Rightmost slot first (higher index first)
      return b.slotIndex - a.slotIndex;
    } else {
      // Leftmost slot first (lower index first)
      return a.slotIndex - b.slotIndex;
    }
  });

  return living.map(c => ({ combatantId: c.id, hasActed: false }));
}

/**
 * Snapshot effective speeds for all alive combatants.
 * Used to detect speed changes after an action.
 */
export function snapshotSpeeds(state: CombatState): Map<string, number> {
  const speeds = new Map<string, number>();
  for (const c of state.combatants) {
    if (c.alive) {
      speeds.set(c.id, getEffectiveSpeed(c));
    }
  }
  return speeds;
}

/**
 * Check if any combatant's speed changed, and rebuild turn order if so.
 * This is the canonical way to handle speed changes - call this after any
 * action that might affect speed (statuses, passives, future abilities, etc.)
 */
export function checkSpeedChangesAndRebuild(
  state: CombatState,
  previousSpeeds: Map<string, number>
): LogEntry[] {
  // Check if any speed changed
  let speedChanged = false;
  for (const c of state.combatants) {
    if (c.alive) {
      const prev = previousSpeeds.get(c.id);
      const curr = getEffectiveSpeed(c);
      if (prev !== curr) {
        speedChanged = true;
        break;
      }
    }
  }

  if (!speedChanged) {
    return [];
  }

  return rebuildTurnOrderMidRound(state);
}

/**
 * Rebuild turn order mid-round after a speed change.
 * Keeps already-acted entries in place, re-sorts only the remaining entries.
 * Respects Slipstream protection: protected allies maintain their order ahead of enemies.
 */
export function rebuildTurnOrderMidRound(state: CombatState): LogEntry[] {
  const logs: LogEntry[] = [];
  const currentId = state.turnOrder[state.currentTurnIndex]?.combatantId;

  // Split into acted and remaining
  const acted = state.turnOrder.filter(e => e.hasActed);
  const remaining = state.turnOrder.filter(e => !e.hasActed);

  // Separate protected (Slipstream) from unprotected
  const protectedIds = new Set(state.slipstreamProtectedIds);
  const protectedEntries = remaining.filter(e => protectedIds.has(e.combatantId));
  const unprotectedEntries = remaining.filter(e => !protectedIds.has(e.combatantId));

  // Sort only unprotected by speed
  const unprotectedCombatants = unprotectedEntries
    .map(e => getCombatant(state, e.combatantId))
    .filter(c => c.alive);

  unprotectedCombatants.sort((a, b) => {
    const speedA = getEffectiveSpeed(a);
    const speedB = getEffectiveSpeed(b);
    if (speedA !== speedB) return speedB - speedA;
    if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
    if (a.side === 'player') return b.slotIndex - a.slotIndex;
    return a.slotIndex - b.slotIndex;
  });

  const sortedUnprotected: TurnQueueEntry[] = unprotectedCombatants.map(c => ({
    combatantId: c.id,
    hasActed: false,
  }));

  // Protected allies should stay AFTER the current combatant, not before.
  // Find where current combatant lands in sorted unprotected, insert protected right after.
  let newRemaining: TurnQueueEntry[];
  const currentInSorted = sortedUnprotected.findIndex(e => e.combatantId === currentId);
  if (currentInSorted >= 0) {
    // Current is unprotected: insert protected allies right after current
    newRemaining = [
      ...sortedUnprotected.slice(0, currentInSorted + 1),
      ...protectedEntries,
      ...sortedUnprotected.slice(currentInSorted + 1),
    ];
  } else if (protectedIds.has(currentId ?? '')) {
    // Current is protected: keep protected at front (they include current)
    newRemaining = [...protectedEntries, ...sortedUnprotected];
  } else {
    // Fallback: current not in remaining (already acted?), append protected after sorted
    newRemaining = [...sortedUnprotected, ...protectedEntries];
  }
  const oldRemainingIds = remaining.map(e => e.combatantId);
  const newRemainingIds = newRemaining.map(e => e.combatantId);
  const changed = oldRemainingIds.some((id, i) => id !== newRemainingIds[i]);

  if (changed) {
    state.turnOrder = [...acted, ...newRemaining];
    // Fix currentTurnIndex to point at the current actor
    if (currentId) {
      const newIdx = state.turnOrder.findIndex(e => e.combatantId === currentId);
      if (newIdx >= 0) {
        state.currentTurnIndex = newIdx;
      }
    }
    logs.push({
      round: state.round,
      combatantId: '',
      message: `Turn order reshuffled due to speed change!`,
    });
  }

  return logs;
}

/**
 * Get combatant by ID.
 */
export function getCombatant(state: CombatState, id: string): Combatant {
  const c = state.combatants.find(c => c.id === id);
  if (!c) throw new Error(`Combatant not found: ${id}`);
  return c;
}

/**
 * Get the combatant whose turn it currently is.
 * Returns null if turn order is empty (battle should be ending).
 */
export function getCurrentCombatant(state: CombatState): Combatant {
  // Safety: clamp index to valid range
  if (state.turnOrder.length === 0) {
    throw new Error('No combatants in turn order - battle should have ended');
  }
  if (state.currentTurnIndex >= state.turnOrder.length) {
    state.currentTurnIndex = state.turnOrder.length - 1;
  }
  if (state.currentTurnIndex < 0) {
    state.currentTurnIndex = 0;
  }

  const entry = state.turnOrder[state.currentTurnIndex];
  return getCombatant(state, entry.combatantId);
}

/**
 * Check win/loss conditions — Section 11.
 */
export function checkBattleEnd(state: CombatState): void {
  const playersAlive = state.combatants.some(c => c.side === 'player' && c.alive);
  const enemiesAlive = state.combatants.some(c => c.side === 'enemy' && c.alive);

  if (!enemiesAlive) {
    state.phase = 'victory';
  } else if (!playersAlive) {
    state.phase = 'defeat';
  }
}

/**
 * Remove dead combatants from turn order — Section 3.3.
 */
export function removeDeadFromTurnOrder(state: CombatState): void {
  const currentId = state.turnOrder[state.currentTurnIndex]?.combatantId;
  const oldIndex = state.currentTurnIndex;

  state.turnOrder = state.turnOrder.filter(entry => {
    const c = getCombatant(state, entry.combatantId);
    return c.alive;
  });

  // Handle empty turn order (battle should end, but be safe)
  if (state.turnOrder.length === 0) {
    state.currentTurnIndex = 0;
    return;
  }

  // Try to find the current combatant in the new order
  if (currentId) {
    const newIndex = state.turnOrder.findIndex(e => e.combatantId === currentId);
    if (newIndex >= 0) {
      // Current combatant still alive, point to their new position
      state.currentTurnIndex = newIndex;
      return;
    }
  }

  // Current combatant was removed (died) - clamp to valid range
  state.currentTurnIndex = Math.min(oldIndex, state.turnOrder.length - 1);
  state.currentTurnIndex = Math.max(0, state.currentTurnIndex);
}

/**
 * Advance to the next round.
 * Process round boundary cleanup, rebuild turn order.
 */
export function advanceRound(state: CombatState): LogEntry[] {
  // Capture old turn order for comparison
  const oldOrder = state.turnOrder.map(e => e.combatantId);

  const logs = processRoundBoundary(state);

  // Check if status effects ended the battle (e.g., Leech killing last enemy)
  checkBattleEnd(state);
  if (state.phase !== 'ongoing') {
    return logs;
  }

  // Reset round-based passive flags
  onRoundEnd(state);

  // Clear Slipstream protection (only lasts one round)
  state.slipstreamProtectedIds = [];

  state.round += 1;
  state.turnOrder = buildTurnOrder(state);
  state.currentTurnIndex = 0;

  logs.push({
    round: state.round,
    combatantId: '',
    message: `--- Round ${state.round} begins ---`,
  });

  // Log position changes caused by speed modifiers
  const newOrder = state.turnOrder.map(e => e.combatantId);
  for (let i = 0; i < newOrder.length; i++) {
    const id = newOrder[i];
    const oldIdx = oldOrder.indexOf(id);
    if (oldIdx >= 0 && oldIdx !== i) {
      const c = getCombatant(state, id);
      const speed = getEffectiveSpeed(c);
      if (oldIdx > i) {
        logs.push({
          round: state.round,
          combatantId: id,
          message: `${c.name} moves up in turn order (speed ${speed}).`,
        });
      } else {
        logs.push({
          round: state.round,
          combatantId: id,
          message: `${c.name} moves down in turn order (speed ${speed}).`,
        });
      }
    }
  }

  return logs;
}
