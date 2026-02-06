import type { Combatant, CombatState, MoveDefinition, CardEffect } from './types';
import { getStatusStacks } from './status';
import { hasSTAB, STAB_BONUS } from './damage';
import { getTypeEffectiveness, getEffectivenessLabel } from './typeChart';
import {
  checkBlazeStrike, checkBastionBarrage, checkCounterCurrent, checkStaticField,
  checkWhippingWinds, checkPredatorsPatience, checkThickHide, checkThickFat,
  checkUnderdog, checkRagingBull, checkScrappy,
  checkHustleDamageBonus, checkRelentless
} from './passives';
import { getBloomingCycleReduction } from './damage';

// ============================================================
// Damage Preview Calculation - For drag-and-drop targeting
// ============================================================

export interface DamagePreview {
  baseDamage: number;
  finalDamage: number;
  typeEffectiveness: number;
  effectivenessLabel: string | null;
  blockedAmount: number;
  evasionReduction: number;
  isMultiHit: boolean;
  hits: number;
  totalDamage: number; // For multi-hit, this is hits × finalDamage
}

/**
 * Calculate a damage preview for dragging a card over a target.
 * This mirrors the actual damage calculation but doesn't mutate state.
 */
export function calculateDamagePreview(
  state: CombatState,
  source: Combatant,
  target: Combatant,
  card: MoveDefinition
): DamagePreview | null {
  // Find the first damage-dealing effect
  const damageEffect = card.effects.find(e =>
    e.type === 'damage' || e.type === 'multi_hit' || e.type === 'heal_on_hit' ||
    e.type === 'recoil' || e.type === 'self_ko'
  ) as CardEffect | undefined;

  if (!damageEffect) {
    return null; // No damage to preview
  }

  // Get base damage value
  let baseDamage = 0;
  let isMultiHit = false;
  let hits = 1;

  switch (damageEffect.type) {
    case 'damage':
    case 'heal_on_hit':
    case 'recoil':
    case 'self_ko':
      baseDamage = damageEffect.value;
      break;
    case 'multi_hit':
      baseDamage = damageEffect.value;
      isMultiHit = true;
      hits = damageEffect.hits;
      break;
    default:
      return null;
  }

  // Calculate all modifiers (mirroring buildDamageModifiers logic)
  const strength = getStatusStacks(source, 'strength');
  const enfeeble = getStatusStacks(source, 'enfeeble');
  const stab = hasSTAB(source, card.type) ? STAB_BONUS : 0;

  // Passive bonuses
  const { bonusDamage: bastionBonus } = checkBastionBarrage(state, source, card);
  const { bonusDamage: counterBonus } = checkCounterCurrent(state, source, target);
  const whippingWindsBonus = checkWhippingWinds(source, target);
  const predatorsPatienceBonus = checkPredatorsPatience(source, target);
  const underdogBonus = checkUnderdog(source, card);
  const scrappyBonus = checkScrappy(source, card);
  const hustleBonus = checkHustleDamageBonus(source);
  const relentlessBonus = checkRelentless(source);

  // Multipliers
  const { shouldApply: isBlazeStrike } = checkBlazeStrike(state, source, card);
  const blazeStrikeMultiplier = isBlazeStrike ? 2 : 1;
  const ragingBullMultiplier = checkRagingBull(source);

  // Type effectiveness
  const typeEffectiveness = getTypeEffectiveness(card.type, target.types);
  const effectivenessLabel = getEffectivenessLabel(typeEffectiveness);

  // Defensive modifiers
  const { reduction: staticReduction } = checkStaticField(state, source, target);
  const bloomingReduction = getBloomingCycleReduction(state, source);
  const thickHideReduction = checkThickHide(target);
  const thickFatMultiplier = checkThickFat(target, card.type);

  // Calculate raw damage (before evasion/block)
  let rawDamage = baseDamage + strength + stab + bastionBonus + counterBonus +
    whippingWindsBonus + predatorsPatienceBonus + underdogBonus +
    scrappyBonus + hustleBonus + relentlessBonus - enfeeble;
  rawDamage = Math.max(rawDamage, 1);

  // Apply multipliers
  rawDamage = rawDamage * blazeStrikeMultiplier;
  rawDamage = Math.floor(rawDamage * ragingBullMultiplier);
  rawDamage = Math.floor(rawDamage * typeEffectiveness);

  // Apply defensive reductions
  rawDamage = Math.max(rawDamage - bloomingReduction - staticReduction - thickHideReduction, 0);
  rawDamage = Math.floor(rawDamage * thickFatMultiplier);

  // Calculate evasion reduction
  const evasion = getStatusStacks(target, 'evasion');
  let afterEvasion = Math.max(rawDamage - evasion, 0);

  // Calculate block absorption
  const blockedAmount = Math.min(afterEvasion, target.block);
  const finalDamage = afterEvasion - blockedAmount;

  // For multi-hit, calculate total (each hit goes through the calculation)
  const totalDamage = isMultiHit ? finalDamage * hits : finalDamage;

  return {
    baseDamage,
    finalDamage,
    typeEffectiveness,
    effectivenessLabel,
    blockedAmount,
    evasionReduction: evasion > 0 ? Math.min(evasion, rawDamage) : 0,
    isMultiHit,
    hits,
    totalDamage,
  };
}

/**
 * Check if a card deals damage to enemies.
 */
export function cardDealsDamage(card: MoveDefinition): boolean {
  return card.effects.some(e =>
    e.type === 'damage' || e.type === 'multi_hit' || e.type === 'heal_on_hit' ||
    e.type === 'recoil' || e.type === 'self_ko'
  );
}
