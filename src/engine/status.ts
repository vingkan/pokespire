import type { Combatant, CombatState, StatusType, StatusInstance, LogEntry } from './types';
import { applyBypassDamage, applyHeal } from './damage';
import { getCombatant } from './combat';
import { getPassiveSpeedBonus } from './passives';

// ============================================================
// Status Effects — Section 7 of spec
// ============================================================

/** Get current stacks for a status type on a combatant (0 if not present). */
export function getStatusStacks(combatant: Combatant, type: StatusType): number {
  const s = combatant.statuses.find(s => s.type === type);
  return s ? s.stacks : 0;
}

/** Get a status instance if present. */
export function getStatus(combatant: Combatant, type: StatusType): StatusInstance | undefined {
  return combatant.statuses.find(s => s.type === type);
}

/** Remove a status entirely. */
export function removeStatus(combatant: Combatant, type: StatusType): void {
  combatant.statuses = combatant.statuses.filter(s => s.type !== type);
}

/**
 * Apply a status effect to a combatant.
 * Follows the stacking rules from Section 7.1.
 */
/**
 * Returns true if the status affects speed (paralysis, slow, haste).
 */
export function isSpeedStatus(type: StatusType): boolean {
  return type === 'paralysis' || type === 'slow' || type === 'haste';
}

/**
 * Check if a combatant is immune to a status type.
 * Returns true if the status should be blocked.
 */
export function checkStatusImmunity(
  target: Combatant,
  type: StatusType
): boolean {
  // Immunity: You cannot be Poisoned or Burned
  if ((type === 'poison' || type === 'burn') && target.passiveIds.includes('immunity')) {
    return true;
  }
  return false;
}

export function applyStatus(
  state: CombatState,
  target: Combatant,
  type: StatusType,
  stacks: number,
  sourceId?: string,
): boolean {
  // Check for immunity
  if (checkStatusImmunity(target, type)) {
    return false; // Status was blocked
  }

  const existing = getStatus(target, type);

  switch (type) {
    case 'burn':
    case 'poison':
    case 'sleep':
    case 'strength':
    case 'paralysis':
    case 'slow':
    case 'enfeeble':
    case 'evasion':
    case 'haste':
      // Additive stacking for all standard statuses
      if (existing) {
        existing.stacks += stacks;
      } else {
        target.statuses.push({
          type,
          stacks,
          appliedOrder: state.statusApplyCounter++,
        });
      }
      break;

    case 'leech':
      // Additive stacking, tracks source for healing
      if (existing) {
        existing.stacks += stacks;
        existing.sourceId = sourceId; // Update source to latest applier
      } else {
        target.statuses.push({
          type,
          stacks,
          sourceId,
          appliedOrder: state.statusApplyCounter++,
        });
      }
      break;
  }
  return true; // Status was applied
}

/**
 * Get the effective speed of a combatant, accounting for Paralysis, Slow, Haste, and passive bonuses.
 */
export function getEffectiveSpeed(combatant: Combatant): number {
  const paralysis = getStatusStacks(combatant, 'paralysis');
  const slow = getStatusStacks(combatant, 'slow');
  const haste = getStatusStacks(combatant, 'haste');
  const passiveBonus = getPassiveSpeedBonus(combatant);
  return Math.max(combatant.baseSpeed + passiveBonus + haste - paralysis - slow, 0);
}

/**
 * Process start-of-turn status ticks (Step 1).
 * All status effects and decay now happen at end of round.
 * This function is kept for compatibility but does nothing.
 */
export function processStartOfTurnStatuses(
  _state: CombatState,
  _combatant: Combatant,
): LogEntry[] {
  // All status processing moved to processRoundBoundary
  return [];
}

/**
 * Process end-of-turn status ticks (Step 7).
 * All status effects and decay now happen at end of round.
 * This function is kept for compatibility but does nothing.
 */
export function processEndOfTurnStatuses(
  _combatant: Combatant,
  _round: number,
): LogEntry[] {
  // All status processing moved to processRoundBoundary
  return [];
}

/**
 * Round boundary cleanup — Section 7.2.
 * Called after the last combatant's turn ends.
 * ALL status effects tick and decay here.
 */
export function processRoundBoundary(state: CombatState): LogEntry[] {
  const logs: LogEntry[] = [];

  // Process all status effects for each combatant
  for (const c of state.combatants) {
    if (!c.alive) continue;

    // Process statuses in appliedOrder (oldest first)
    const sorted = [...c.statuses].sort((a, b) => a.appliedOrder - b.appliedOrder);

    for (const status of sorted) {
      if (!c.alive) break;

      // Burn: deal damage equal to stacks, then decay by 1
      if (status.type === 'burn') {
        const dmg = applyBypassDamage(c, status.stacks);
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `Burn deals ${dmg} damage to ${c.name}. (${status.stacks} → ${status.stacks - 1} stacks)`,
        });
        status.stacks -= 1;
        if (status.stacks <= 0) {
          removeStatus(c, 'burn');
          logs.push({
            round: state.round,
            combatantId: c.id,
            message: `Burn on ${c.name} expired.`,
          });
        }
      }

      // Poison: deal damage equal to stacks, then escalate by 1
      // Potent Venom: Poison deals double damage
      if (status.type === 'poison') {
        // Check if any enemy has Potent Venom (to double our poison damage)
        const hasPotentVenomApplied = status.sourceId
          ? state.combatants.find(comb => comb.id === status.sourceId)?.passiveIds.includes('potent_venom')
          : false;
        const poisonDamage = hasPotentVenomApplied ? status.stacks * 2 : status.stacks;
        const dmg = applyBypassDamage(c, poisonDamage);
        const potentNote = hasPotentVenomApplied ? ' (Potent Venom!)' : '';
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `Poison deals ${dmg} damage to ${c.name}${potentNote}. (${status.stacks} → ${status.stacks + 1} stacks)`,
        });
        status.stacks += 1; // Poison escalates!
      }

      // Leech: deal damage, heal source, decay by 1
      if (status.type === 'leech') {
        const dmg = applyBypassDamage(c, status.stacks);
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `Leech deals ${dmg} damage to ${c.name}. (${status.stacks} → ${status.stacks - 1} stacks)`,
        });

        // Heal the source
        if (status.sourceId) {
          const source = getCombatant(state, status.sourceId);
          if (source?.alive) {
            const healed = applyHeal(source, status.stacks);
            if (healed > 0) {
              logs.push({
                round: state.round,
                combatantId: source.id,
                message: `${source.name} heals ${healed} HP from Leech.`,
              });
            }
          }
        }

        status.stacks -= 1;
        if (status.stacks <= 0) {
          removeStatus(c, 'leech');
          logs.push({
            round: state.round,
            combatantId: c.id,
            message: `Leech on ${c.name} expired.`,
          });
        }
      }

      // All statuses: decay by 1 per round
      if (status.type === 'paralysis' || status.type === 'slow' ||
          status.type === 'enfeeble' || status.type === 'strength' ||
          status.type === 'evasion' || status.type === 'sleep' ||
          status.type === 'haste') {
        const statusName = status.type.charAt(0).toUpperCase() + status.type.slice(1);
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `${statusName} on ${c.name} fades. (${status.stacks} → ${status.stacks - 1} stacks)`,
        });
        status.stacks -= 1;
        if (status.stacks <= 0) {
          removeStatus(c, status.type);
          logs.push({
            round: state.round,
            combatantId: c.id,
            message: `${statusName} on ${c.name} expired.`,
          });
        }
      }
    }

    // Reset Block (but Pressure Hull retains 50% of current block)
    if (c.block > 0) {
      const hasPressureHull = c.passiveIds.includes('pressure_hull');
      if (hasPressureHull) {
        const retained = Math.floor(c.block * 0.5);
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `${c.name}'s Block (${c.block}) resets to ${retained} (Pressure Hull).`,
        });
        c.block = retained;
      } else {
        logs.push({
          round: state.round,
          combatantId: c.id,
          message: `${c.name}'s Block (${c.block}) resets to 0.`,
        });
        c.block = 0;
      }
    }
  }

  return logs;
}
