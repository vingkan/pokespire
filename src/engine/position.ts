import type { Combatant, CombatState, CombatantSide, Position, Row, Column, MoveRange } from './types';

// ============================================================
// Position Helpers — Grid positioning and targeting
// ============================================================

/**
 * Get the effective front row for a side (accounting for row collapse).
 * If all front row Pokemon are defeated, the back row becomes the "front".
 */
export function getEffectiveFrontRow(state: CombatState, side: CombatantSide): Row {
  const sideUnits = state.combatants.filter(c => c.side === side && c.alive);
  const hasFrontAlive = sideUnits.some(c => c.position.row === 'front');
  return hasFrontAlive ? 'front' : 'back';
}

/**
 * Check if a combatant is in the effective front row.
 */
export function isInEffectiveFrontRow(state: CombatState, combatant: Combatant): boolean {
  const effectiveFront = getEffectiveFrontRow(state, combatant.side);
  return combatant.position.row === effectiveFront;
}

/**
 * Get combatant at a specific position on a side.
 */
export function getCombatantAtPosition(
  state: CombatState,
  side: CombatantSide,
  position: Position
): Combatant | undefined {
  return state.combatants.find(
    c => c.side === side &&
         c.alive &&
         c.position.row === position.row &&
         c.position.column === position.column
  );
}

/**
 * Get all valid targets for a move range.
 * Returns the list of combatants that CAN be targeted (for UI highlighting).
 */
export function getValidTargets(
  state: CombatState,
  source: Combatant,
  range: MoveRange
): Combatant[] {
  if (range === 'self') {
    return [source];
  }

  const enemies = state.combatants.filter(c => c.alive && c.side !== source.side);
  if (enemies.length === 0) return [];

  const effectiveFrontRow = getEffectiveFrontRow(state, enemies[0].side);

  switch (range) {
    case 'front_enemy':
      // Single target in effective front row only
      return enemies.filter(c => c.position.row === effectiveFrontRow);

    case 'back_enemy': {
      // Single target in back row only (if back row exists)
      // If no back row enemies exist, fall back to front row
      const backEnemies = enemies.filter(c => c.position.row === 'back');
      if (backEnemies.length > 0) {
        return backEnemies;
      }
      // No back row - allow targeting front row instead
      return enemies.filter(c => c.position.row === effectiveFrontRow);
    }

    case 'any_enemy':
      // Can target any enemy
      return enemies;

    case 'front_row':
      // All enemies in effective front row (need to select one to activate)
      return enemies.filter(c => c.position.row === effectiveFrontRow);

    case 'back_row': {
      // All enemies in back row
      // If no back row enemies exist, fall back to front row
      const backEnemies = enemies.filter(c => c.position.row === 'back');
      if (backEnemies.length > 0) {
        return backEnemies;
      }
      // No back row - allow targeting front row instead
      return enemies.filter(c => c.position.row === effectiveFrontRow);
    }

    case 'any_row':
      // Can target any enemy (selecting one picks the whole row)
      return enemies;

    case 'column':
      // Can target any enemy (selecting one picks the whole column)
      return enemies;

    case 'all_enemies':
      // All enemies
      return enemies;

    default:
      return [];
  }
}

/**
 * Check if a specific target is valid for a move range.
 */
export function isValidTarget(
  state: CombatState,
  source: Combatant,
  target: Combatant,
  range: MoveRange
): boolean {
  const validTargets = getValidTargets(state, source, range);
  return validTargets.some(t => t.id === target.id);
}

/**
 * Get piercing targets: the front target + any Pokemon in the same column behind.
 */
export function getPiercingTargets(
  state: CombatState,
  _source: Combatant,
  frontTarget: Combatant
): Combatant[] {
  const targets = [frontTarget];

  // Check for combatant in same column, back row
  if (frontTarget.position.row === 'front') {
    const backTarget = getCombatantAtPosition(state, frontTarget.side, {
      row: 'back',
      column: frontTarget.position.column,
    });
    if (backTarget) {
      targets.push(backTarget);
    }
  }

  return targets;
}

/**
 * Auto-assign positions for a party based on size.
 * - 3 or fewer: all in front row
 * - 4+: first 3 in front, rest in back
 */
export function assignPartyPositions(partySize: number): Position[] {
  if (partySize <= 3) {
    // All in front row, centered
    return Array.from({ length: partySize }, (_, i) => ({
      row: 'front' as Row,
      column: i as Column,
    }));
  }

  // Distribute: first 3 in front, rest in back
  return Array.from({ length: partySize }, (_, i) => ({
    row: (i < 3 ? 'front' : 'back') as Row,
    column: (i % 3) as Column,
  }));
}

/**
 * Check if a move range requires manual target selection.
 */
export function requiresTargetSelection(range: MoveRange): boolean {
  switch (range) {
    case 'self':
    case 'all_enemies':
      // These never need target selection
      return false;
    case 'front_enemy':
    case 'back_enemy':
    case 'any_enemy':
    case 'front_row':
    case 'back_row':
    case 'any_row':
    case 'column':
      // These need selection when multiple valid targets exist
      return true;
    default:
      return false;
  }
}

/**
 * Check if a move range is an AoE (affects multiple targets).
 */
export function isAoERange(range: MoveRange): boolean {
  return range === 'front_row' || range === 'back_row' || range === 'any_row' ||
         range === 'column' || range === 'all_enemies';
}
