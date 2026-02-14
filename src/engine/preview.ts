import type { Combatant, CombatState, MoveDefinition, CardEffect } from './types';
import { getStatusStacks } from './status';
import { hasSTAB, STAB_BONUS } from './damage';
import { getTypeEffectiveness, getEffectivenessLabel } from './typeChart';
import {
  checkBlazeStrike, checkFortifiedCannons, checkCounterCurrent, checkStaticField,
  checkKeenEye, checkPredatorsPatience, checkThickHide, checkThickFat,
  checkProletariat, checkAngerPoint, checkSheerForce, checkScrappy,
  checkHustleMultiplier, checkRelentless, checkReckless, checkTintedLens,
  checkPoisonBarb, checkAdaptability, checkSwarmStrike,
  checkSearingFury, checkVoltFury,
  checkMultiscale, checkDragonsMajesty,
  checkSharpBeak, checkSniper,
  checkFortifiedSpines,
  checkNightAssassin,
  checkFriendGuard,
  checkFinisher, isAttackCard,
  checkMalice, getTotalDebuffStacks,
  checkTechnician, checkAristocrat,
  checkRudeAwakening,
  checkBlindAggression, checkDrySkin
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
  // Water Absorb / Dry Skin: No damage from Water-type attacks (heals instead)
  if ((target.passiveIds.includes('water_absorb') || target.passiveIds.includes('dry_skin')) && card.type === 'water') {
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
      // Check for bonus damage condition (e.g., Flail, Hex)
      if (damageEffect.bonusValue && damageEffect.bonusCondition) {
        if (damageEffect.bonusCondition === 'user_below_half_hp' && source.hp < source.maxHp * 0.5) {
          baseDamage += damageEffect.bonusValue;
        } else if (damageEffect.bonusCondition === 'target_debuff_stacks') {
          baseDamage += damageEffect.bonusValue * getTotalDebuffStacks(target);
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
  const proletariatBonus = checkProletariat(source, card);
  const scrappyBonus = checkScrappy(source, card);
  const blindAggressionBonus = checkBlindAggression(source, target);
  const poisonBarbBonus = checkPoisonBarb(source, card);
  const adaptabilityBonus = checkAdaptability(source, card);
  const searingFuryBonus = checkSearingFury(source, target, card);
  const voltFuryBonus = checkVoltFury(source, target);
  const sharpBeakBonus = checkSharpBeak(source, card);
  const nightAssassinBonus = checkNightAssassin(source, card);
  const maliceBonus = checkMalice(source, target);
  const hustleMultiplier = checkHustleMultiplier(source);
  const relentlessBonus = checkRelentless(source);

  // Multipliers (dryRun=true to avoid side effects during preview)
  const { shouldApply: isBlazeStrike } = checkBlazeStrike(state, source, card, true);
  const { shouldApply: isSwarmStrike } = checkSwarmStrike(state, source, card, true);
  // Finisher: approximate using base cost >= 3 for preview
  const { shouldApply: isFinisherActive } = checkFinisher(state, source, card, card.cost, true);
  const blazeStrikeMultiplier = isBlazeStrike ? 2 : isSwarmStrike ? 2 : isFinisherActive ? 2 : 1;
  const angerPointMultiplier = checkAngerPoint(source);
  const sheerForceMultiplier = checkSheerForce(source);
  const recklessMultiplier = checkReckless(source, card);
  const dragonsMajestyMultiplier = checkDragonsMajesty(source);
  const technicianMultiplier = checkTechnician(source, card);
  const aristocratMultiplier = checkAristocrat(source, card);
  const rudeAwakeningMultiplier = checkRudeAwakening(source, target);
  const combinedMultiplier = angerPointMultiplier * sheerForceMultiplier * recklessMultiplier * hustleMultiplier * dragonsMajestyMultiplier * technicianMultiplier * aristocratMultiplier * rudeAwakeningMultiplier;

  // Type effectiveness (with Tinted Lens adjustment)
  let typeEffectiveness = getTypeEffectiveness(card.type, target.types);
  typeEffectiveness = checkTintedLens(source, typeEffectiveness);
  const effectivenessLabel = getEffectivenessLabel(typeEffectiveness);

  // Defensive modifiers
  const { reduction: staticReduction } = checkStaticField(state, source, target);
  const bloomingReduction = getBloomingCycleReduction(state, source);
  const thickHideReduction = checkThickHide(target);
  const friendGuardReduction = checkFriendGuard(state, target);
  const thickFatMultiplier = checkThickFat(target, card.type);
  const drySkinMultiplier = checkDrySkin(target, card.type);

  // Calculate raw damage (before evasion/block)
  let rawDamage = baseDamage + strength + stab + fortifiedBonus + counterBonus +
    keenEyeBonus + predatorsPatienceBonus + proletariatBonus +
    scrappyBonus + blindAggressionBonus + poisonBarbBonus + adaptabilityBonus + relentlessBonus +
    searingFuryBonus + voltFuryBonus + sharpBeakBonus + nightAssassinBonus +
    maliceBonus - enfeeble;
  rawDamage = Math.max(rawDamage, 1);

  // Apply multipliers
  rawDamage = rawDamage * blazeStrikeMultiplier;
  rawDamage = Math.floor(rawDamage * combinedMultiplier);  // Anger Point + Sheer Force
  rawDamage = Math.floor(rawDamage * typeEffectiveness);

  // Apply defensive reductions
  rawDamage = Math.max(rawDamage - bloomingReduction - staticReduction - thickHideReduction - friendGuardReduction, 0);
  rawDamage = Math.floor(rawDamage * thickFatMultiplier * drySkinMultiplier);

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

// ============================================================
// Hand Preview — Source-only damage modifiers (no target needed)
// ============================================================

export interface HandPreview {
  additive: number;      // Net additive modifier (strength + STAB + passives - enfeeble)
  multiplier: number;    // Combined damage multiplier (blaze, anger point, sheer force, etc.)
  tags: string[];        // Breakdown labels for hover display
}

/**
 * Calculate source-side damage modifiers for displaying on cards in hand.
 * Does NOT include target-dependent modifiers (type effectiveness, evasion, etc).
 * This is the single source of truth — CardDisplay delegates here instead of hand-rolling.
 */
export function calculateHandPreview(
  source: Combatant,
  card: MoveDefinition
): HandPreview {
  const tags: string[] = [];

  // Status-based modifiers
  const strength = getStatusStacks(source, 'strength');
  const enfeeble = getStatusStacks(source, 'enfeeble');
  const stab = hasSTAB(source, card.type) ? STAB_BONUS : 0;

  if (stab > 0) tags.push(`+${stab} STAB`);
  if (strength > 0) tags.push(`+${strength} Strength`);
  if (enfeeble > 0) tags.push(`\u2212${enfeeble} Enfeeble`);

  // Passive additive bonuses (source-only, inlined to avoid CombatState dependency)
  const fortifiedCannonsBonus = (source.passiveIds.includes('fortified_cannons') && card.type === 'water' && source.block > 0)
    ? Math.floor(source.block * 0.25) : 0;
  const fortifiedSpinesBonus = (source.passiveIds.includes('fortified_spines') && card.type === 'ground' && source.block > 0)
    ? Math.floor(source.block * 0.25) : 0;

  if (fortifiedCannonsBonus > 0) tags.push(`+${fortifiedCannonsBonus} Fort. Cannons`);
  if (fortifiedSpinesBonus > 0) tags.push(`+${fortifiedSpinesBonus} Fort. Spines`);

  const proletariatBonus = checkProletariat(source, card);
  const scrappyBonus = checkScrappy(source, card);
  const poisonBarbBonus = checkPoisonBarb(source, card);
  const adaptabilityBonus = checkAdaptability(source, card);
  const sharpBeakBonus = checkSharpBeak(source, card);
  const nightAssassinBonus = checkNightAssassin(source, card);
  const relentlessBonus = checkRelentless(source);

  if (proletariatBonus > 0) tags.push(`+${proletariatBonus} Proletariat`);
  if (scrappyBonus > 0) tags.push(`+${scrappyBonus} Scrappy`);
  if (poisonBarbBonus > 0) tags.push(`+${poisonBarbBonus} Barb`);
  if (adaptabilityBonus > 0) tags.push(`+${adaptabilityBonus} Adapt`);
  if (sharpBeakBonus > 0) tags.push(`+${sharpBeakBonus} Sharp Beak`);
  if (nightAssassinBonus > 0) tags.push(`+${nightAssassinBonus} Night Assassin`);
  if (relentlessBonus > 0) tags.push(`+${relentlessBonus} Relentless`);

  const additive = strength + stab + fortifiedCannonsBonus + fortifiedSpinesBonus +
    proletariatBonus + scrappyBonus + poisonBarbBonus + adaptabilityBonus +
    sharpBeakBonus + nightAssassinBonus + relentlessBonus - enfeeble;

  // Multipliers (source-only, inlined where CombatState was only used for logs)
  const blazeStrikeActive = source.passiveIds.includes('blaze_strike') &&
    card.type === 'fire' && !source.turnFlags.blazeStrikeUsedThisTurn;
  const swarmStrikeActive = source.passiveIds.includes('swarm_strike') &&
    card.type === 'bug' && !source.turnFlags.swarmStrikeUsedThisTurn;
  const finisherActive = source.passiveIds.includes('finisher') &&
    !source.turnFlags.finisherUsedThisTurn &&
    isAttackCard(card) && card.cost >= 3;
  const blazeSwarmMult = blazeStrikeActive ? 2 : swarmStrikeActive ? 2 : finisherActive ? 2 : 1;

  const angerPointMult = checkAngerPoint(source);
  const sheerForceMult = checkSheerForce(source);
  const recklessMult = checkReckless(source, card);
  const hustleMult = checkHustleMultiplier(source);
  const dragonsMajestyMult = checkDragonsMajesty(source);

  if (blazeStrikeActive) tags.push('x2 Blaze');
  if (swarmStrikeActive) tags.push('x2 Swarm');
  if (finisherActive) tags.push('x2 Finisher');
  if (angerPointMult > 1) tags.push(`x${angerPointMult} Anger Pt`);
  if (sheerForceMult > 1) tags.push(`x${sheerForceMult} Sheer Force`);
  if (recklessMult > 1) tags.push(`x${recklessMult} Reckless`);
  if (hustleMult > 1) tags.push(`x${hustleMult} Hustle`);
  if (dragonsMajestyMult > 1) tags.push(`x${dragonsMajestyMult} Dragon`);

  const technicianMult = checkTechnician(source, card);
  const aristocratMult = checkAristocrat(source, card);
  if (technicianMult > 1) tags.push(`x${technicianMult} Tech`);
  if (aristocratMult > 1) tags.push(`x${aristocratMult} Aristocrat`);

  const multiplier = blazeSwarmMult * angerPointMult * sheerForceMult *
    recklessMult * hustleMult * dragonsMajestyMult * technicianMult * aristocratMult;

  return { additive, multiplier, tags };
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
