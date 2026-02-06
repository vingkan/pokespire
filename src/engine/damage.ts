import type { Combatant, CombatState, MoveType } from './types';
import { getStatusStacks } from './status';

// ============================================================
// Damage Calculation — Section 8 of spec
// ============================================================

/** STAB (Same Type Attack Bonus) damage bonus */
export const STAB_BONUS = 2;

export interface DamageResult {
  baseDamage: number;
  rawDamage: number;
  strength: number;
  enfeeble: number;
  stab: number;
  blazeStrikeMultiplier: number;  // 2 if Blaze Strike triggered, 1 otherwise
  bastionBarrageBonus: number;    // Bonus damage from Bastion Barrage
  bloomingCycleReduction: number; // Damage reduction from Blooming Cycle
  counterCurrentBonus: number;    // Bonus from Counter-Current
  staticFieldReduction: number;   // Reduction from Static Field
  gustForceBonus: number;         // Bonus from Gust Force (+2 for Flying)
  thickHideReduction: number;     // Reduction from Thick Hide (-2 all)
  thickFatMultiplier: number;     // Multiplier from Thick Fat (0.75 for Fire/Ice)
  underdogBonus: number;         // Bonus from Underdog (+2 for common 1-cost cards)
  ragingBullMultiplier: number;   // Multiplier from Raging Bull (1.5x Normal below 50% HP)
  familyFuryBonus: number;        // Bonus from Family Fury (+2 per damaged ally)
  typeEffectiveness: number;      // Type matchup multiplier (1.25x super effective, 0.75x not effective)
  evasion: number;
  afterEvasion: number;
  blockedAmount: number;
  hpDamage: number;
}

/**
 * Check if a combatant has STAB for a move type.
 */
export function hasSTAB(combatant: Combatant, moveType: MoveType): boolean {
  return combatant.types.includes(moveType);
}

export interface DamageModifiers {
  isBlazeStrike?: boolean;
  bastionBarrageBonus?: number;
  bloomingCycleReduction?: number;
  counterCurrentBonus?: number;
  staticFieldReduction?: number;
  gustForceBonus?: number;
  thickHideReduction?: number;
  thickFatMultiplier?: number;
  underdogBonus?: number;
  ragingBullMultiplier?: number;
  familyFuryBonus?: number;
  typeEffectiveness?: number;  // Type matchup multiplier
  ignoreEvasion?: boolean;  // For Scrappy
}

/**
 * Calculate and apply card damage from source to target.
 * Returns a full breakdown of the damage calculation.
 */
export function applyCardDamage(
  source: Combatant,
  target: Combatant,
  baseDamage: number,
  moveType?: MoveType,
  modifiers?: DamageModifiers,
): DamageResult {
  const mods = modifiers ?? {};

  // Step 1: Apply Strength, Enfeeble, STAB, and all bonuses from source
  const strength = getStatusStacks(source, 'strength');
  const enfeeble = getStatusStacks(source, 'enfeeble');
  const stab = moveType && hasSTAB(source, moveType) ? STAB_BONUS : 0;
  const bastionBonus = mods.bastionBarrageBonus ?? 0;
  const counterBonus = mods.counterCurrentBonus ?? 0;
  const gustBonus = mods.gustForceBonus ?? 0;
  const underdogBonus = mods.underdogBonus ?? 0;
  const familyFuryBonus = mods.familyFuryBonus ?? 0;

  let rawDamage = baseDamage + strength + stab + bastionBonus + counterBonus + gustBonus + underdogBonus + familyFuryBonus - enfeeble;
  rawDamage = Math.max(rawDamage, 1); // floor at 1

  // Step 1.5: Apply Blaze Strike multiplier (after STAB, before other multipliers)
  const blazeStrikeMultiplier = mods.isBlazeStrike ? 2 : 1;
  rawDamage = rawDamage * blazeStrikeMultiplier;

  // Step 1.6: Apply Raging Bull multiplier (Normal attacks +50% below 50% HP)
  const ragingBullMultiplier = mods.ragingBullMultiplier ?? 1.0;
  rawDamage = Math.floor(rawDamage * ragingBullMultiplier);

  // Step 1.65: Apply Type Effectiveness multiplier
  const typeEffectiveness = mods.typeEffectiveness ?? 1.0;
  rawDamage = Math.floor(rawDamage * typeEffectiveness);

  // Step 1.7: Apply defensive reductions
  const bloomingReduction = mods.bloomingCycleReduction ?? 0;
  const staticReduction = mods.staticFieldReduction ?? 0;
  const thickHideReduction = mods.thickHideReduction ?? 0;

  rawDamage = Math.max(rawDamage - bloomingReduction - staticReduction - thickHideReduction, 0);

  // Step 1.8: Apply Thick Fat multiplier (25% reduction for Fire/Ice)
  const thickFatMultiplier = mods.thickFatMultiplier ?? 1.0;
  rawDamage = Math.floor(rawDamage * thickFatMultiplier);

  // Step 2: Apply Evasion from target (unless Scrappy ignores it)
  const ignoreEvasion = mods.ignoreEvasion ?? false;
  const evasion = ignoreEvasion ? 0 : getStatusStacks(target, 'evasion');
  let afterEvasion = rawDamage - evasion;
  afterEvasion = Math.max(afterEvasion, 0); // evasion can reduce to 0

  // Step 3: Apply Block
  const damageToBlock = Math.min(afterEvasion, target.block);
  target.block -= damageToBlock;

  const damageToHp = afterEvasion - damageToBlock;
  const hpBefore = target.hp;
  target.hp -= damageToHp;

  // Step 4: Check death
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
  }

  // Actual HP lost (capped at target's remaining HP, no overkill)
  const actualHpDamage = hpBefore - target.hp;

  return {
    baseDamage,
    rawDamage,
    strength,
    enfeeble,
    stab,
    blazeStrikeMultiplier,
    bastionBarrageBonus: bastionBonus,
    bloomingCycleReduction: bloomingReduction,
    counterCurrentBonus: counterBonus,
    staticFieldReduction: staticReduction,
    gustForceBonus: gustBonus,
    thickHideReduction: thickHideReduction,
    thickFatMultiplier: thickFatMultiplier,
    underdogBonus: underdogBonus,
    ragingBullMultiplier: ragingBullMultiplier,
    familyFuryBonus: familyFuryBonus,
    typeEffectiveness: typeEffectiveness,
    evasion,
    afterEvasion,
    blockedAmount: damageToBlock,
    hpDamage: actualHpDamage,
  };
}

/**
 * Calculate Blooming Cycle damage reduction.
 * If any player-side combatant has Blooming Cycle, enemies with Leech deal reduced damage.
 */
export function getBloomingCycleReduction(
  state: CombatState,
  attacker: Combatant
): number {
  // Check if any player-side combatant has Blooming Cycle
  const playerHasBloomingCycle = state.combatants.some(
    c => c.side === 'player' && c.passiveIds.includes('blooming_cycle')
  );
  if (!playerHasBloomingCycle) return 0;

  // Check if attacker has Leech
  const leechStacks = getStatusStacks(attacker, 'leech');
  return Math.floor(leechStacks / 2);
}

/**
 * Apply bypass damage (burn, poison, leech) — no Strength, Enfeeble, Evasion, or Block.
 * Returns the actual HP damage dealt.
 */
export function applyBypassDamage(target: Combatant, damage: number): number {
  target.hp -= damage;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
  }
  return damage;
}

/**
 * Heal a combatant. Cannot exceed maxHp.
 */
export function applyHeal(target: Combatant, amount: number): number {
  const before = target.hp;
  target.hp = Math.min(target.hp + amount, target.maxHp);
  return target.hp - before;
}
