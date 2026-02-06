import type { CombatState, BattleAction, LogEntry, Combatant } from './types';
import {
  getCurrentCombatant, checkBattleEnd, removeDeadFromTurnOrder, advanceRound,
  getCombatant,
} from './combat';
import { processStartOfTurnStatuses, processEndOfTurnStatuses } from './status';
import { drawCards, discardHand } from './deck';
import { playCard } from './cards';
import { getStatus } from './status';
import { onTurnStart, onTurnEnd } from './passives';
import { getMove } from '../data/loaders';

// ============================================================
// Turn Sequence — Section 4 of spec
// ============================================================

export interface TurnState {
  /** Whether the current combatant's turn has started (steps 1-4 done). */
  turnStarted: boolean;
  /** Whether the turn is waiting for player input. */
  waitingForInput: boolean;
}

/**
 * Start a combatant's turn: Steps 1-4.
 * Returns logs and whether the turn was skipped by sleep.
 */
export function startTurn(state: CombatState): { logs: LogEntry[]; skipped: boolean } {
  const logs: LogEntry[] = [];
  const combatant = getCurrentCombatant(state);

  logs.push({
    round: state.round,
    combatantId: combatant.id,
    message: `--- ${combatant.name}'s turn ---`,
  });

  // Step 1: Start-of-turn status ticks
  const startLogs = processStartOfTurnStatuses(state, combatant);
  logs.push(...startLogs);

  // Check if combatant died from start-of-turn effects
  if (!combatant.alive) {
    removeDeadFromTurnOrder(state);
    checkBattleEnd(state);
    return { logs, skipped: true };
  }

  // Step 2: Gain energy (reduced by Sleep stacks)
  const sleep = getStatus(combatant, 'sleep');
  const sleepStacks = sleep?.stacks ?? 0;
  const energyGain = Math.max(0, combatant.energyPerTurn - sleepStacks);
  combatant.energy = Math.min(combatant.energy + energyGain, combatant.energyCap);

  if (sleepStacks > 0) {
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `${combatant.name} is drowsy! Gains ${energyGain} energy (${combatant.energyPerTurn} - ${sleepStacks} Sleep). (Energy: ${combatant.energy})`,
    });
  } else {
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `${combatant.name} gains ${energyGain} energy. (Energy: ${combatant.energy})`,
    });
  }

  // Step 4: Draw cards
  const drawn = drawCards(combatant);
  if (drawn.length > 0) {
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `${combatant.name} draws ${drawn.length} card(s).`,
    });
  }

  // Step 4.5: Trigger passive abilities (after drawing)
  const passiveLogs = onTurnStart(state, combatant, getMove);
  logs.push(...passiveLogs);

  return { logs, skipped: false };
}

/**
 * Process a player/AI action during Step 5.
 */
export function processAction(
  state: CombatState,
  action: BattleAction,
): LogEntry[] {
  const logs: LogEntry[] = [];
  const combatant = getCurrentCombatant(state);

  if (action.type === 'play_card') {
    const cardLogs = playCard(state, combatant, action);
    logs.push(...cardLogs);

    // Remove dead from turn order
    removeDeadFromTurnOrder(state);
    checkBattleEnd(state);
  }
  // end_turn is handled in endTurn()

  return logs;
}

/**
 * End the current combatant's turn: Steps 6-7 + advance.
 */
export function endTurn(state: CombatState): LogEntry[] {
  const logs: LogEntry[] = [];
  const combatant = getCurrentCombatant(state);

  // Step 6: Discard remaining hand
  if (combatant.hand.length > 0) {
    discardHand(combatant);
  }

  // Step 7: End-of-turn status ticks
  const endLogs = processEndOfTurnStatuses(combatant, state.round);
  logs.push(...endLogs);

  // Step 7.5: Trigger end-of-turn passive abilities
  const passiveEndLogs = onTurnEnd(state, combatant);
  logs.push(...passiveEndLogs);

  // Check death from end-of-turn effects
  removeDeadFromTurnOrder(state);
  checkBattleEnd(state);

  if (state.phase !== 'ongoing') return logs;

  // Mark as acted and advance
  const advLogs = advanceToNextTurn(state);
  logs.push(...advLogs);

  return logs;
}

/**
 * Skip turn (for sleep) and advance.
 */
export function skipTurnAndAdvance(state: CombatState): LogEntry[] {
  // No end-of-turn status ticks when sleep-skipped (sleep skips steps 3-7)
  // But wait — spec says sleep skips "steps 3 through 7", which includes step 7.
  // So NO end-of-turn status ticks.

  if (state.phase !== 'ongoing') return [];

  return advanceToNextTurn(state);
}

/**
 * Mark current combatant as acted, advance to next.
 * If everyone has acted, start a new round.
 */
function advanceToNextTurn(state: CombatState): LogEntry[] {
  const logs: LogEntry[] = [];

  // Mark current as acted
  state.turnOrder[state.currentTurnIndex].hasActed = true;

  // Check if all have acted
  const allActed = state.turnOrder.every(e => e.hasActed);

  if (allActed) {
    // Round boundary
    const roundLogs = advanceRound(state);
    logs.push(...roundLogs);
  } else {
    // Advance to next un-acted combatant
    state.currentTurnIndex++;
    // Skip dead combatants (shouldn't exist in queue, but safety check)
    while (
      state.currentTurnIndex < state.turnOrder.length &&
      state.turnOrder[state.currentTurnIndex].hasActed
    ) {
      state.currentTurnIndex++;
    }
  }

  return logs;
}

/**
 * Slipstream: Move all allies to act immediately after the current combatant.
 * Triggered when using Gust with the Slipstream passive.
 */
export function applySlipstream(state: CombatState, combatant: Combatant): LogEntry[] {
  const logs: LogEntry[] = [];
  const currentIdx = state.currentTurnIndex;

  // Find allies that haven't acted yet (excluding current combatant)
  const allyIndices: number[] = [];
  for (let i = currentIdx + 1; i < state.turnOrder.length; i++) {
    const entry = state.turnOrder[i];
    if (entry.hasActed) continue;
    const c = getCombatant(state, entry.combatantId);
    if (c.side === combatant.side && c.id !== combatant.id && c.alive) {
      allyIndices.push(i);
    }
  }

  if (allyIndices.length === 0) return logs;

  // Extract ally entries (in reverse order to maintain relative order when removing)
  const allyEntries = allyIndices.map(i => state.turnOrder[i]);

  // Remove allies from their current positions (in reverse order)
  for (let i = allyIndices.length - 1; i >= 0; i--) {
    state.turnOrder.splice(allyIndices[i], 1);
  }

  // Insert allies right after current combatant
  state.turnOrder.splice(currentIdx + 1, 0, ...allyEntries);

  const allyNames = allyEntries.map(e => getCombatant(state, e.combatantId).name);
  logs.push({
    round: state.round,
    combatantId: combatant.id,
    message: `${combatant.name}'s gust stirs up a slipstream! ${allyNames.join(', ')} will act next!`,
  });

  return logs;
}
