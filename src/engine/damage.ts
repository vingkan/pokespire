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
  swarmStrikeMultiplier: number;  // 2 if Swarm Strike triggered, 1 otherwise
  fortifiedCannonsBonus: number;  // Bonus from Fortified Cannons (Water + Block)
  fortifiedSpinesBonus: number;   // Bonus from Fortified Spines (Ground + Block)
  bloomingCycleReduction: number; // Damage reduction from Blooming Cycle
  counterCurrentBonus: number;    // Bonus from Counter-Current
  staticFieldReduction: number;   // Reduction from Static Field
  keenEyeBonus: number;           // Bonus from Keen Eye (+1 if target has Slow)
  predatorsPatienceBonus: number;  // Bonus from Predator's Patience
  searingFuryBonus: number;        // Bonus from Searing Fury (+N per Burn stack)
  voltFuryBonus: number;           // Bonus from Volt Fury (+N per Paralysis stack)
  sharpBeakBonus: number;          // Bonus from Sharp Beak (+1 for Flying)
  thickHideReduction: number;     // Reduction from Thick Hide (-2 all)
  thickFatMultiplier: number;     // Multiplier from Thick Fat (0.75 for Fire/Ice)
  multiscaleMultiplier: number;  // Multiplier from Multiscale (0.5 above 75% HP)
  underdogBonus: number;         // Bonus from Underdog (+2 for common 1-cost cards)
  ragingBullMultiplier: number;   // Multiplier from Raging Bull (1.5x Normal below 50% HP)
  hustleMultiplier: number;       // Multiplier from Hustle (1.3x for attacks)
  familyFuryBonus: number;        // Bonus from Family Fury (+2 per damaged ally)
  poisonBarbBonus: number;        // Bonus from Poison Barb (+2 for Poison attacks)
  adaptabilityBonus: number;      // Bonus from Adaptability (+2 extra STAB)
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
  isSwarmStrike?: boolean;
  fortifiedCannonsBonus?: number;
  fortifiedSpinesBonus?: number;
  bloomingCycleReduction?: number;
  counterCurrentBonus?: number;
  staticFieldReduction?: number;
  keenEyeBonus?: number;
  predatorsPatienceBonus?: number;
  searingFuryBonus?: number;
  voltFuryBonus?: number;
  sharpBeakBonus?: number;
  thickHideReduction?: number;
  thickFatMultiplier?: number;
  multiscaleMultiplier?: number;
  underdogBonus?: number;
  ragingBullMultiplier?: number;
  hustleMultiplier?: number;
  familyFuryBonus?: number;
  poisonBarbBonus?: number;
  adaptabilityBonus?: number;
  typeEffectiveness?: number;  // Type matchup multiplier
  ignoreEvasion?: boolean;  // For Scrappy / Sniper
  ignoreBlock?: boolean;    // For Sniper
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
  const fortifiedCannonsBonus = mods.fortifiedCannonsBonus ?? 0;
  const fortifiedSpinesBonus = mods.fortifiedSpinesBonus ?? 0;
  const counterBonus = mods.counterCurrentBonus ?? 0;
  const keenEyeBonus = mods.keenEyeBonus ?? 0;
  const predatorsPatienceBonus = mods.predatorsPatienceBonus ?? 0;
  const searingFuryBonus = mods.searingFuryBonus ?? 0;
  const voltFuryBonus = mods.voltFuryBonus ?? 0;
  const sharpBeakBonus = mods.sharpBeakBonus ?? 0;
  const underdogBonus = mods.underdogBonus ?? 0;
  const familyFuryBonus = mods.familyFuryBonus ?? 0;
  const poisonBarbBonus = mods.poisonBarbBonus ?? 0;
  const adaptabilityBonus = mods.adaptabilityBonus ?? 0;

  let rawDamage = baseDamage + strength + stab + fortifiedCannonsBonus + fortifiedSpinesBonus + counterBonus + keenEyeBonus + predatorsPatienceBonus + searingFuryBonus + voltFuryBonus + sharpBeakBonus + underdogBonus + familyFuryBonus + poisonBarbBonus + adaptabilityBonus - enfeeble;
  rawDamage = Math.max(rawDamage, 1); // floor at 1

  // Step 1.5: Apply strike multipliers (Blaze Strike / Swarm Strike — mutually exclusive)
  const blazeStrikeMultiplier = mods.isBlazeStrike ? 2 : 1;
  const swarmStrikeMultiplier = mods.isSwarmStrike ? 2 : 1;
  rawDamage = rawDamage * Math.max(blazeStrikeMultiplier, swarmStrikeMultiplier);

  // Step 1.6: Apply Raging Bull multiplier (Normal attacks +50% below 50% HP)
  const ragingBullMultiplier = mods.ragingBullMultiplier ?? 1.0;
  rawDamage = Math.floor(rawDamage * ragingBullMultiplier);

  // Step 1.62: Apply Hustle multiplier (attacks deal 30% more damage)
  const hustleMultiplier = mods.hustleMultiplier ?? 1.0;
  rawDamage = Math.floor(rawDamage * hustleMultiplier);

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

  // Step 1.85: Apply Multiscale multiplier (50% reduction above 75% HP)
  const multiscaleMultiplier = mods.multiscaleMultiplier ?? 1.0;
  rawDamage = Math.floor(rawDamage * multiscaleMultiplier);

  // Step 1.9: Shell Armor — cap damage at 20
  if (target.passiveIds.includes('shell_armor') && rawDamage > 20) {
    rawDamage = 20;
  }

  // Step 2: Apply Evasion from target (unless Scrappy ignores it)
  const ignoreEvasion = mods.ignoreEvasion ?? false;
  const evasion = ignoreEvasion ? 0 : getStatusStacks(target, 'evasion');
  let afterEvasion = rawDamage - evasion;
  afterEvasion = Math.max(afterEvasion, 0); // evasion can reduce to 0

  // Step 3: Apply Block (unless Sniper ignores it)
  const ignoreBlock = mods.ignoreBlock ?? false;
  const damageToBlock = ignoreBlock ? 0 : Math.min(afterEvasion, target.block);
  if (!ignoreBlock) target.block -= damageToBlock;

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
    swarmStrikeMultiplier,
    fortifiedCannonsBonus,
    fortifiedSpinesBonus,
    bloomingCycleReduction: bloomingReduction,
    counterCurrentBonus: counterBonus,
    staticFieldReduction: staticReduction,
    keenEyeBonus,
    predatorsPatienceBonus,
    searingFuryBonus,
    voltFuryBonus,
    sharpBeakBonus,
    thickHideReduction: thickHideReduction,
    thickFatMultiplier: thickFatMultiplier,
    multiscaleMultiplier: multiscaleMultiplier,
    underdogBonus: underdogBonus,
    ragingBullMultiplier: ragingBullMultiplier,
    hustleMultiplier: hustleMultiplier,
    familyFuryBonus: familyFuryBonus,
    poisonBarbBonus: poisonBarbBonus,
    adaptabilityBonus: adaptabilityBonus,
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
