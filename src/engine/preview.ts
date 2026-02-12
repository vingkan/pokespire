import type { Combatant, CombatState, MoveDefinition, CardEffect } from './types';
import { getStatusStacks } from './status';
import { hasSTAB, STAB_BONUS } from './damage';
import { getTypeEffectiveness, getEffectivenessLabel } from './typeChart';
import {
  checkBlazeStrike, checkFortifiedCannons, checkCounterCurrent, checkStaticField,
  checkKeenEye, checkPredatorsPatience, checkThickHide, checkThickFat,
  checkUnderdog, checkAngerPoint, checkSheerForce, checkScrappy,
  checkHustleMultiplier, checkRelentless, checkReckless, checkTintedLens,
  checkPoisonBarb, checkAdaptability, checkSwarmStrike,
  checkSearingFury, checkVoltFury,
  checkMultiscale, checkDragonsMajesty,
  checkSharpBeak, checkSniper,
  checkFortifiedSpines
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
  // Water Absorb: No damage from Water-type attacks (heals instead)
  if (target.passiveIds.includes('water_absorb') && card.type === 'water') {
    return null;
  }

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
      baseDamage = damageEffect.value;
      // Check for bonus damage condition (e.g., Flail)
      if (damageEffect.bonusValue && damageEffect.bonusCondition) {
        if (damageEffect.bonusCondition === 'user_below_half_hp' && source.hp < source.maxHp * 0.5) {
          baseDamage += damageEffect.bonusValue;
        }
      }
      break;
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
  const { bonusDamage: fortifiedCannonsBonus } = checkFortifiedCannons(state, source, card);
  const { bonusDamage: fortifiedSpinesBonus } = checkFortifiedSpines(state, source, card);
  const fortifiedBonus = fortifiedCannonsBonus + fortifiedSpinesBonus;
  const { bonusDamage: counterBonus } = checkCounterCurrent(state, source, target);
  const keenEyeBonus = checkKeenEye(source, target);
  const predatorsPatienceBonus = checkPredatorsPatience(source, target);
  const underdogBonus = checkUnderdog(source, card);
  const scrappyBonus = checkScrappy(source, card);
  const poisonBarbBonus = checkPoisonBarb(source, card);
  const adaptabilityBonus = checkAdaptability(source, card);
  const searingFuryBonus = checkSearingFury(source, target, card);
  const voltFuryBonus = checkVoltFury(source, target);
  const sharpBeakBonus = checkSharpBeak(source, card);
  const hustleMultiplier = checkHustleMultiplier(source);
  const relentlessBonus = checkRelentless(source);

  // Multipliers (dryRun=true to avoid side effects during preview)
  const { shouldApply: isBlazeStrike } = checkBlazeStrike(state, source, card, true);
  const { shouldApply: isSwarmStrike } = checkSwarmStrike(state, source, card, true);
  const blazeStrikeMultiplier = isBlazeStrike ? 2 : isSwarmStrike ? 2 : 1;
  const angerPointMultiplier = checkAngerPoint(source);
  const sheerForceMultiplier = checkSheerForce(source);
  const recklessMultiplier = checkReckless(source, card);
  const dragonsMajestyMultiplier = checkDragonsMajesty(source);
  const combinedMultiplier = angerPointMultiplier * sheerForceMultiplier * recklessMultiplier * hustleMultiplier * dragonsMajestyMultiplier;

  // Type effectiveness (with Tinted Lens adjustment)
  let typeEffectiveness = getTypeEffectiveness(card.type, target.types);
  typeEffectiveness = checkTintedLens(source, typeEffectiveness);
  const effectivenessLabel = getEffectivenessLabel(typeEffectiveness);

  // Defensive modifiers
  const { reduction: staticReduction } = checkStaticField(state, source, target);
  const bloomingReduction = getBloomingCycleReduction(state, source);
  const thickHideReduction = checkThickHide(target);
  const thickFatMultiplier = checkThickFat(target, card.type);

  // Calculate raw damage (before evasion/block)
  let rawDamage = baseDamage + strength + stab + fortifiedBonus + counterBonus +
    keenEyeBonus + predatorsPatienceBonus + underdogBonus +
    scrappyBonus + poisonBarbBonus + adaptabilityBonus + relentlessBonus +
    searingFuryBonus + voltFuryBonus + sharpBeakBonus - enfeeble;
  rawDamage = Math.max(rawDamage, 1);

  // Apply multipliers
  rawDamage = rawDamage * blazeStrikeMultiplier;
  rawDamage = Math.floor(rawDamage * combinedMultiplier);  // Anger Point + Sheer Force
  rawDamage = Math.floor(rawDamage * typeEffectiveness);

  // Apply defensive reductions
  rawDamage = Math.max(rawDamage - bloomingReduction - staticReduction - thickHideReduction, 0);
  rawDamage = Math.floor(rawDamage * thickFatMultiplier);

  // Multiscale: Take half damage if above 75% HP
  const multiscaleMultiplier = checkMultiscale(target);
  rawDamage = Math.floor(rawDamage * multiscaleMultiplier);

  // Shell Armor: Cap damage at 20
  if (target.passiveIds.includes('shell_armor') && rawDamage > 20) {
    rawDamage = 20;
  }

  // Sniper: First attack each turn ignores evasion and block (dryRun=true for preview)
  const { ignoreEvasion: sniperIgnoreEvasion, ignoreBlock: sniperIgnoreBlock } = checkSniper(state, source, card, true);

  // Calculate evasion reduction
  const evasion = sniperIgnoreEvasion ? 0 : getStatusStacks(target, 'evasion');
  let afterEvasion = Math.max(rawDamage - evasion, 0);

  // Calculate block absorption
  const blockedAmount = sniperIgnoreBlock ? 0 : Math.min(afterEvasion, target.block);
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
