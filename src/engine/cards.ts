import type { Combatant, CombatState, LogEntry, PlayCardAction, MoveDefinition, MoveRange } from './types';
import { getMove, isParentalBondCopy } from '../data/loaders';
import { getCombatant, rebuildTurnOrderMidRound } from './combat';
import { applyCardDamage, applyHeal, applyBypassDamage, getBloomingCycleReduction } from './damage';
import type { DamageModifiers } from './damage';
import { applyStatus, isSpeedStatus } from './status';
import { getEffectiveFrontRow } from './position';
import {
  checkBlazeStrike, checkBastionBarrage, checkCounterCurrent, checkStaticField,
  onDamageDealt, onDamageTaken, onStatusApplied,
  checkGustForce, checkWhippingWinds, checkPredatorsPatience, checkThickHide, checkThickFat,
  checkUnderdog, checkRagingBull, checkScrappy,
  checkQuickFeet, checkHustleDamageBonus, checkHustleCostIncrease,
  checkRelentless, checkPoisonPoint, isAttackCard
} from './passives';
import { shuffle, MAX_HAND_SIZE } from './deck';
import { getTypeEffectiveness, getEffectivenessLabel } from './typeChart';
import { applySlipstream } from './turns';

// ============================================================
// Card Play & Effect Resolution — Section 6
// ============================================================

/**
 * Validate and play a card from a combatant's hand.
 * Returns log entries describing what happened.
 */
export function playCard(
  state: CombatState,
  combatant: Combatant,
  action: PlayCardAction,
): LogEntry[] {
  const logs: LogEntry[] = [];
  const cardId = action.cardInstanceId;

  // Validate card is in hand
  const handIndex = combatant.hand.indexOf(cardId);
  if (handIndex === -1) {
    throw new Error(`Card ${cardId} not in hand of ${combatant.id}`);
  }

  const card = getMove(cardId);

  // Calculate effective cost (accounting for Inferno Momentum, Quick Feet, Hustle)
  const hasInfernoReduction = combatant.turnFlags.infernoMomentumReducedIndex === handIndex;
  const quickFeetReduction = checkQuickFeet(combatant, card);
  const hustleCostIncrease = checkHustleCostIncrease(combatant, card);

  let effectiveCost = card.cost;
  if (hasInfernoReduction) effectiveCost -= 3;
  effectiveCost -= quickFeetReduction;
  effectiveCost += hustleCostIncrease;
  effectiveCost = Math.max(0, effectiveCost);

  // Validate energy
  if (combatant.energy < effectiveCost) {
    throw new Error(`Not enough energy. Have ${combatant.energy}, need ${effectiveCost}`);
  }

  // Check if Parental Bond / Family Fury should create a copy
  // Don't copy cards that are already copies
  const isFirstAttack = isAttackCard(card) && !combatant.turnFlags.relentlessUsedThisTurn;
  const isAnyAttack = isAttackCard(card);
  const isAlreadyCopy = isParentalBondCopy(cardId);
  const hasParentalBond = combatant.passiveIds.includes('parental_bond');
  const hasFamilyFury = combatant.passiveIds.includes('family_fury') &&
                        combatant.hp < combatant.maxHp * 0.5;
  // Parental Bond: only first attack gets a copy
  // Family Fury: ALL attacks get copies when below 50% HP
  const shouldCreateCopy = !isAlreadyCopy && ((hasParentalBond && isFirstAttack) || (hasFamilyFury && isAnyAttack));

  // Mark first attack as played for Quick Feet / Parental Bond tracking
  if (isAttackCard(card) && !combatant.turnFlags.relentlessUsedThisTurn) {
    combatant.turnFlags.relentlessUsedThisTurn = true;
  }

  // Increment Relentless bonus counter for next attack
  if (combatant.passiveIds.includes('relentless')) {
    combatant.costModifiers['relentlessBonus'] = (combatant.costModifiers['relentlessBonus'] ?? 0) + 1;
  }

  // Spend energy
  combatant.energy -= effectiveCost;

  // Update Inferno Momentum tracking when a card is removed
  const reducedIdx = combatant.turnFlags.infernoMomentumReducedIndex;
  if (reducedIdx !== null) {
    if (handIndex === reducedIdx) {
      // The reduced card was played, clear the flag
      combatant.turnFlags.infernoMomentumReducedIndex = null;
    } else if (handIndex < reducedIdx) {
      // A card before the reduced card was played, shift the index down
      combatant.turnFlags.infernoMomentumReducedIndex = reducedIdx - 1;
    }
    // If handIndex > reducedIdx, no change needed
  }

  // Remove from hand
  combatant.hand.splice(handIndex, 1);

  // Resolve targets
  const targets = resolveTargets(state, combatant, card.range, action.targetId);

  // Log Quick Feet reduction if applicable
  if (quickFeetReduction > 0) {
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Quick Feet: First attack costs ${quickFeetReduction} less!`,
    });
  }

  logs.push({
    round: state.round,
    combatantId: combatant.id,
    message: `${combatant.name} plays ${card.name} (cost ${effectiveCost}).`,
  });

  // Resolve effects on each target
  for (const target of targets) {
    const effectLogs = resolveEffects(state, combatant, target, card);
    logs.push(...effectLogs);
  }

  // Parental Bond: Add a copy of the card to hand
  if (shouldCreateCopy) {
    // Get the base card ID (strip __parental if somehow present)
    const baseCardId = cardId.replace('__parental', '');
    const copyCardId = `${baseCardId}__parental`;
    combatant.hand.push(copyCardId);
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Parental Bond: ${card.name} (Echo) added to hand!`,
    });
  }

  // Power Nap: When you play Rest, also gain 3 Strength
  const baseCardIdForRest = cardId.replace('__parental', '');
  if (baseCardIdForRest === 'rest' && combatant.passiveIds.includes('power_nap')) {
    applyStatus(state, combatant, 'strength', 3, combatant.id);
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Power Nap: ${combatant.name} gains 3 Strength from Rest!`,
    });
  }

  // Vanish or discard
  if (card.vanish) {
    // Card is removed from the game — track in vanished pile
    combatant.vanishedPile.push(cardId);
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `${card.name} vanishes!`,
    });
  } else {
    combatant.discardPile.push(cardId);
  }

  // Slipstream: When using Gust, allies act immediately after you
  if (cardId === 'gust' && combatant.passiveIds.includes('slipstream')) {
    const slipstreamLogs = applySlipstream(state, combatant);
    logs.push(...slipstreamLogs);
  }

  return logs;
}

/**
 * Resolve the targets for a card based on move range.
 */
function resolveTargets(
  state: CombatState,
  source: Combatant,
  range: MoveRange,
  targetId?: string,
): Combatant[] {
  const enemies = state.combatants.filter(c => c.alive && c.side !== source.side);

  if (enemies.length === 0 && range !== 'self') {
    return [];
  }

  const effectiveFrontRow = enemies.length > 0
    ? getEffectiveFrontRow(state, enemies[0].side)
    : 'front';

  // Hurricane: Row-targeting attacks hit ALL enemies instead
  const hasHurricane = source.passiveIds.includes('hurricane');
  const isRowTargeting = ['front_row', 'back_row', 'any_row'].includes(range);
  if (hasHurricane && isRowTargeting) {
    return enemies; // Hit all enemies
  }

  switch (range) {
    case 'self':
      return [source];

    case 'front_enemy': {
      // Single target in front row
      const validTargets = enemies.filter(c => c.position.row === effectiveFrontRow);
      if (targetId) {
        const target = getCombatant(state, targetId);
        if (!validTargets.some(t => t.id === target.id)) {
          throw new Error(`Target ${targetId} is not in front row`);
        }
        return [target];
      }
      if (validTargets.length === 1) return [validTargets[0]];
      if (validTargets.length === 0) return [];
      throw new Error('front_enemy requires targetId when multiple front targets exist');
    }

    case 'back_enemy': {
      // Single target in back row, falls back to front if no back row exists
      let validTargets = enemies.filter(c => c.position.row === 'back');
      if (validTargets.length === 0) {
        // No back row enemies - fall back to front row
        validTargets = enemies.filter(c => c.position.row === effectiveFrontRow);
      }
      if (targetId) {
        const target = getCombatant(state, targetId);
        if (!validTargets.some(t => t.id === target.id)) {
          throw new Error(`Target ${targetId} is not a valid back_enemy target`);
        }
        return [target];
      }
      if (validTargets.length === 1) return [validTargets[0]];
      if (validTargets.length === 0) return [];
      throw new Error('back_enemy requires targetId when multiple targets exist');
    }

    case 'any_enemy': {
      // Single target, any row
      if (targetId) {
        return [getCombatant(state, targetId)];
      }
      if (enemies.length === 1) return [enemies[0]];
      throw new Error('any_enemy requires targetId when multiple enemies exist');
    }

    case 'front_row':
      // AoE: all enemies in effective front row
      return enemies.filter(c => c.position.row === effectiveFrontRow);

    case 'back_row': {
      // AoE: all enemies in back row, falls back to front if no back row exists
      const backEnemies = enemies.filter(c => c.position.row === 'back');
      if (backEnemies.length > 0) return backEnemies;
      // No back row enemies - fall back to front row
      return enemies.filter(c => c.position.row === effectiveFrontRow);
    }

    case 'any_row': {
      // Player picks a row (front or back), hits all enemies in that row
      // targetId should be any enemy in the desired row
      if (!targetId) {
        // If only one row has enemies, target that row
        const frontEnemies = enemies.filter(c => c.position.row === effectiveFrontRow);
        const backEnemies = effectiveFrontRow === 'back' ? [] : enemies.filter(c => c.position.row === 'back');
        if (frontEnemies.length > 0 && backEnemies.length === 0) return frontEnemies;
        if (backEnemies.length > 0 && frontEnemies.length === 0) return backEnemies;
        throw new Error('any_row requires targetId to select which row');
      }
      const target = getCombatant(state, targetId);
      const targetRow = target.position.row;
      return enemies.filter(c => c.position.row === targetRow);
    }

    case 'column': {
      // Hits all enemies in a column (target any enemy, hits all in that column)
      if (!targetId) {
        // If only one column has enemies, target that
        const columns = new Set(enemies.map(e => e.position.column));
        if (columns.size === 1) {
          const col = enemies[0].position.column;
          return enemies.filter(c => c.position.column === col);
        }
        throw new Error('column requires targetId to select which column');
      }
      const target = getCombatant(state, targetId);
      const targetColumn = target.position.column;
      return enemies.filter(c => c.position.column === targetColumn);
    }

    case 'all_enemies':
      // AoE: all enemies
      return enemies;

    default:
      throw new Error(`Unknown range type: ${range}`);
  }
}

/**
 * Build all damage modifiers for an attack.
 */
function buildDamageModifiers(
  state: CombatState,
  source: Combatant,
  target: Combatant,
  card: MoveDefinition,
  logs: LogEntry[],
  _isMultiHit: boolean = false
): DamageModifiers {
  // Check for Blaze Strike
  const { shouldApply: isBlazeStrike, logs: blazeLogs } = checkBlazeStrike(state, source, card);
  logs.push(...blazeLogs);

  // Check for Bastion Barrage
  const { bonusDamage: bastionBonus, logs: bastionLogs } = checkBastionBarrage(state, source, card);
  logs.push(...bastionLogs);

  // Check for Counter-Current
  const { bonusDamage: counterBonus, logs: counterLogs } = checkCounterCurrent(state, source, target);
  logs.push(...counterLogs);

  // Check for Static Field
  const { reduction: staticReduction, logs: staticLogs } = checkStaticField(state, source, target);
  logs.push(...staticLogs);

  // Whipping Winds: Enemies with Slow take +1 damage
  const whippingWindsBonus = checkWhippingWinds(source, target);
  if (whippingWindsBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Whipping Winds: +${whippingWindsBonus} damage (target has Slow)!`,
    });
  }

  // Predator's Patience: Enemies with Poison take +2 damage
  const predatorsPatienceBonus = checkPredatorsPatience(source, target);
  if (predatorsPatienceBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Predator's Patience: +${predatorsPatienceBonus} damage (target has Poison)!`,
    });
  }

  // Thick Hide: Take 1 less damage from all attacks
  const thickHideReduction = checkThickHide(target);
  if (thickHideReduction > 0) {
    logs.push({
      round: state.round,
      combatantId: target.id,
      message: `Thick Hide: -${thickHideReduction} damage!`,
    });
  }

  // Thick Fat: Take 25% less damage from Fire and Ice attacks
  const thickFatMultiplier = checkThickFat(target, card.type);
  if (thickFatMultiplier < 1.0) {
    logs.push({
      round: state.round,
      combatantId: target.id,
      message: `Thick Fat: -25% damage (${card.type} attack)!`,
    });
  }

  // Underdog: Common rarity cards that cost 1 deal +2 damage
  const underdogBonus = checkUnderdog(source, card);
  if (underdogBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Underdog: +${underdogBonus} damage (common 1-cost)!`,
    });
  }

  // Raging Bull: Your attacks deal +50% damage when below 50% HP
  const ragingBullMultiplier = checkRagingBull(source);
  if (ragingBullMultiplier > 1) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Raging Bull: x1.5 damage (below 50% HP)!`,
    });
  }

  // Scrappy: Your Normal attacks deal +2 damage
  const scrappyBonus = checkScrappy(source, card);
  if (scrappyBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Scrappy: +${scrappyBonus} damage (Normal attack)!`,
    });
  }

  // Hustle: Your attacks deal +2 damage
  const hustleBonus = checkHustleDamageBonus(source);
  if (hustleBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Hustle: +${hustleBonus} damage!`,
    });
  }

  // Relentless: Each card you play this turn gives your next attack +1 damage
  const relentlessBonus = checkRelentless(source);
  if (relentlessBonus > 0) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `Relentless: +${relentlessBonus} damage (${relentlessBonus} cards played)!`,
    });
  }

  // Type Effectiveness: Calculate multiplier based on move type vs target types
  const typeEffectiveness = getTypeEffectiveness(card.type, target.types);
  const effectivenessLabel = getEffectivenessLabel(typeEffectiveness);
  if (effectivenessLabel) {
    logs.push({
      round: state.round,
      combatantId: source.id,
      message: `${effectivenessLabel} (x${typeEffectiveness.toFixed(2)})`,
    });
  }

  return {
    isBlazeStrike,
    bastionBarrageBonus: bastionBonus,
    bloomingCycleReduction: getBloomingCycleReduction(state, source),
    counterCurrentBonus: counterBonus,
    staticFieldReduction: staticReduction,
    gustForceBonus: whippingWindsBonus + predatorsPatienceBonus,  // Reusing field for +damage bonus
    thickHideReduction,
    thickFatMultiplier,
    underdogBonus,
    ragingBullMultiplier,
    familyFuryBonus: scrappyBonus + hustleBonus + relentlessBonus,  // Combine flat bonuses
    typeEffectiveness,
    ignoreEvasion: false,  // No passive currently ignores evasion
  };
}

/**
 * Build damage breakdown string for logging.
 */
function buildDamageBreakdown(r: ReturnType<typeof applyCardDamage>): string {
  const parts: string[] = [];
  if (r.stab > 0) parts.push(`+${r.stab} STAB`);
  if (r.strength > 0) parts.push(`+${r.strength} Str`);
  if (r.bastionBarrageBonus > 0) parts.push(`+${r.bastionBarrageBonus} Bastion`);
  if (r.counterCurrentBonus > 0) parts.push(`+${r.counterCurrentBonus} Current`);
  if (r.gustForceBonus > 0) parts.push(`+${r.gustForceBonus} Gust`);
  if (r.underdogBonus > 0) parts.push(`+${r.underdogBonus} Underdog`);
  if (r.familyFuryBonus > 0) parts.push(`+${r.familyFuryBonus} Fury`);
  if (r.enfeeble > 0) parts.push(`-${r.enfeeble} Enfeeble`);
  if (r.blazeStrikeMultiplier > 1) parts.push(`x${r.blazeStrikeMultiplier} Blaze`);
  if (r.ragingBullMultiplier > 1) parts.push(`x${r.ragingBullMultiplier} Bull`);
  if (r.typeEffectiveness !== 1.0) parts.push(`x${r.typeEffectiveness.toFixed(2)} Type`);
  if (r.bloomingCycleReduction > 0) parts.push(`-${r.bloomingCycleReduction} Blooming`);
  if (r.staticFieldReduction > 0) parts.push(`-${r.staticFieldReduction} Static`);
  if (r.thickHideReduction > 0) parts.push(`-${r.thickHideReduction} Hide`);
  if (r.thickFatMultiplier < 1.0) parts.push(`x0.75 Fat`);
  if (r.evasion > 0) parts.push(`-${r.evasion} Evasion`);
  if (r.blockedAmount > 0) parts.push(`${r.blockedAmount} blocked`);
  return parts.length > 0 ? ` (${r.baseDamage} base${parts.map(p => ', ' + p).join('')})` : '';
}

/**
 * Resolve an ordered list of effects against a target.
 */
function resolveEffects(
  state: CombatState,
  source: Combatant,
  target: Combatant,
  card: MoveDefinition,
): LogEntry[] {
  const logs: LogEntry[] = [];

  for (const effect of card.effects) {
    if (!target.alive && effect.type !== 'apply_status_self' && effect.type !== 'draw_cards' && effect.type !== 'gain_energy') break;

    switch (effect.type) {
      case 'damage': {
        // Build all damage modifiers
        const mods = buildDamageModifiers(state, source, target, card, logs, false);

        const r = applyCardDamage(source, target, effect.value, card.type, mods);

        // Build breakdown string
        const breakdown = buildDamageBreakdown(r);
        const dmgMsg = r.hpDamage === 0 && r.blockedAmount > 0
          ? `${target.name} takes 0 damage — fully blocked!${breakdown}`
          : `${target.name} takes ${r.hpDamage} damage.${breakdown} (HP: ${target.hp}/${target.maxHp})`;
        logs.push({
          round: state.round,
          combatantId: target.id,
          message: dmgMsg,
        });

        // Trigger post-damage passive effects (e.g., Kindling)
        if (r.hpDamage > 0) {
          const postDmgLogs = onDamageDealt(state, source, target, card, r.hpDamage);
          logs.push(...postDmgLogs);

          // Gust Force: Gust applies +1 Slow
          if (checkGustForce(source, card)) {
            applyStatus(state, target, 'slow', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Gust Force: +1 Slow applied to ${target.name}!`,
            });
          }

          // Poison Point: Unblocked Poison attacks apply +1 Poison
          if (checkPoisonPoint(source, card, r.hpDamage)) {
            applyStatus(state, target, 'poison', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Poison Point: +1 Poison applied to ${target.name}!`,
            });
          }

          // Trigger onDamageTaken for target's passives (Anger Point, etc.)
          const takenLogs = onDamageTaken(state, source, target, r.hpDamage, card);
          logs.push(...takenLogs);
        }

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }
        break;
      }

      case 'multi_hit': {
        // Multiple damage instances - each hit triggers Strength separately
        // Super Fang: Multi-hit attacks have each hit gain +1 damage
        let totalDamage = 0;
        for (let i = 0; i < effect.hits; i++) {
          if (!target.alive) break;

          const mods = buildDamageModifiers(state, source, target, card, logs, true);  // isMultiHit = true
          const r = applyCardDamage(source, target, effect.value, card.type, mods);
          totalDamage += r.hpDamage;

          if (r.hpDamage > 0) {
            const postDmgLogs = onDamageDealt(state, source, target, card, r.hpDamage);
            logs.push(...postDmgLogs);

            // Gust Force: Gust applies +1 Slow (each hit)
            if (checkGustForce(source, card) && target.alive) {
              applyStatus(state, target, 'slow', 1, source.id);
              logs.push({
                round: state.round,
                combatantId: source.id,
                message: `Gust Force: +1 Slow applied to ${target.name}!`,
              });
            }

            // Poison Point: Unblocked Poison attacks apply +1 Poison (each hit)
            if (checkPoisonPoint(source, card, r.hpDamage) && target.alive) {
              applyStatus(state, target, 'poison', 1, source.id);
              logs.push({
                round: state.round,
                combatantId: source.id,
                message: `Poison Point: +1 Poison applied to ${target.name}!`,
              });
            }

            const takenLogs = onDamageTaken(state, source, target, r.hpDamage, card);
            logs.push(...takenLogs);
          }
        }

        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} is hit ${effect.hits} times for ${totalDamage} total damage. (HP: ${target.hp}/${target.maxHp})`,
        });

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }
        break;
      }

      case 'heal_on_hit': {
        // Lifesteal attack - deal damage then heal based on damage dealt
        const mods = buildDamageModifiers(state, source, target, card, logs, false);
        const r = applyCardDamage(source, target, effect.value, card.type, mods);

        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} takes ${r.hpDamage} damage. (HP: ${target.hp}/${target.maxHp})`,
        });

        // Heal the source based on damage dealt (after block)
        const healAmount = Math.floor(r.hpDamage * effect.healPercent);
        if (healAmount > 0 && source.alive) {
          const healed = applyHeal(source, healAmount);
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} drains ${healed} HP. (HP: ${source.hp}/${source.maxHp})`,
          });
        }

        if (r.hpDamage > 0) {
          const postDmgLogs = onDamageDealt(state, source, target, card, r.hpDamage);
          logs.push(...postDmgLogs);

          if (checkGustForce(source, card) && target.alive) {
            applyStatus(state, target, 'slow', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Gust Force: +1 Slow applied to ${target.name}!`,
            });
          }

          if (checkPoisonPoint(source, card, r.hpDamage) && target.alive) {
            applyStatus(state, target, 'poison', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Poison Point: +1 Poison applied to ${target.name}!`,
            });
          }

          const takenLogs = onDamageTaken(state, source, target, r.hpDamage, card);
          logs.push(...takenLogs);
        }

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }
        break;
      }

      case 'recoil': {
        // Deal damage then take recoil damage
        const mods = buildDamageModifiers(state, source, target, card, logs, false);
        const r = applyCardDamage(source, target, effect.value, card.type, mods);

        // Build breakdown string (same as regular damage)
        const breakdown = buildDamageBreakdown(r);
        const dmgMsg = r.hpDamage === 0 && r.blockedAmount > 0
          ? `${target.name} takes 0 damage — fully blocked!${breakdown}`
          : `${target.name} takes ${r.hpDamage} damage.${breakdown} (HP: ${target.hp}/${target.maxHp})`;
        logs.push({
          round: state.round,
          combatantId: target.id,
          message: dmgMsg,
        });

        if (r.hpDamage > 0) {
          const postDmgLogs = onDamageDealt(state, source, target, card, r.hpDamage);
          logs.push(...postDmgLogs);

          if (checkGustForce(source, card) && target.alive) {
            applyStatus(state, target, 'slow', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Gust Force: +1 Slow applied to ${target.name}!`,
            });
          }

          if (checkPoisonPoint(source, card, r.hpDamage) && target.alive) {
            applyStatus(state, target, 'poison', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Poison Point: +1 Poison applied to ${target.name}!`,
            });
          }

          const takenLogs = onDamageTaken(state, source, target, r.hpDamage, card);
          logs.push(...takenLogs);
        }

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }

        // Apply recoil damage to source (bypasses block/evasion)
        const recoilDamage = Math.floor(r.rawDamage * effect.recoilPercent);
        if (recoilDamage > 0 && source.alive) {
          applyBypassDamage(source, recoilDamage);
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} takes ${recoilDamage} recoil damage! (HP: ${source.hp}/${source.maxHp})`,
          });

          if (!source.alive) {
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `${source.name} is defeated by recoil!`,
            });
          }
        }
        break;
      }

      case 'set_damage': {
        // Fixed damage - ignores Strength, Weak, Block, and Evasion
        const damage = effect.value;
        const hpBefore = target.hp;
        target.hp -= damage;
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
        }
        const actualDamage = hpBefore - target.hp;

        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} takes ${actualDamage} fixed damage. (HP: ${target.hp}/${target.maxHp})`,
        });

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }
        break;
      }

      case 'percent_hp': {
        // Deal percentage of target's HP
        const baseHp = effect.ofMax ? target.maxHp : target.hp;
        const damage = Math.floor(baseHp * effect.percent);
        const hpBefore = target.hp;
        target.hp -= damage;
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
        }
        const actualDamage = hpBefore - target.hp;

        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} takes ${actualDamage} damage (${Math.round(effect.percent * 100)}% of ${effect.ofMax ? 'max' : 'current'} HP). (HP: ${target.hp}/${target.maxHp})`,
        });

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }
        break;
      }

      case 'self_ko': {
        // Deal massive damage, then user dies
        const mods = buildDamageModifiers(state, source, target, card, logs, false);
        const r = applyCardDamage(source, target, effect.value, card.type, mods);

        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} takes ${r.hpDamage} damage. (HP: ${target.hp}/${target.maxHp})`,
        });

        if (r.hpDamage > 0) {
          const postDmgLogs = onDamageDealt(state, source, target, card, r.hpDamage);
          logs.push(...postDmgLogs);

          if (checkGustForce(source, card) && target.alive) {
            applyStatus(state, target, 'slow', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Gust Force: +1 Slow applied to ${target.name}!`,
            });
          }

          if (checkPoisonPoint(source, card, r.hpDamage) && target.alive) {
            applyStatus(state, target, 'poison', 1, source.id);
            logs.push({
              round: state.round,
              combatantId: source.id,
              message: `Poison Point: +1 Poison applied to ${target.name}!`,
            });
          }

          const takenLogs = onDamageTaken(state, source, target, r.hpDamage, card);
          logs.push(...takenLogs);
        }

        if (!target.alive) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${target.name} is defeated!`,
          });
        }

        // User faints
        source.hp = 0;
        source.alive = false;
        logs.push({
          round: state.round,
          combatantId: source.id,
          message: `${source.name} faints from the attack!`,
        });
        break;
      }

      case 'draw_cards': {
        // Draw additional cards (respects MAX_HAND_SIZE, overflow goes to discard)
        let actualDrawn = 0;
        let discardedCount = 0;
        for (let i = 0; i < effect.count; i++) {
          if (source.drawPile.length === 0 && source.discardPile.length === 0) break;

          if (source.drawPile.length === 0) {
            source.drawPile = shuffle([...source.discardPile]);
            source.discardPile = [];
          }

          const card = source.drawPile.pop();
          if (card) {
            if (source.hand.length < MAX_HAND_SIZE) {
              source.hand.push(card);
              actualDrawn++;
            } else {
              // Hand is full, discard the overflow
              source.discardPile.push(card);
              discardedCount++;
            }
          }
        }

        if (actualDrawn > 0) {
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} draws ${actualDrawn} card${actualDrawn > 1 ? 's' : ''}.`,
          });
        }
        if (discardedCount > 0) {
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `Hand full! ${discardedCount} card${discardedCount > 1 ? 's' : ''} discarded.`,
          });
        }
        break;
      }

      case 'gain_energy': {
        // Gain bonus energy
        const energyGained = Math.min(effect.amount, source.energyCap - source.energy);
        source.energy += energyGained;

        if (energyGained > 0) {
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} gains ${energyGained} energy. (Energy: ${source.energy}/${source.energyCap})`,
          });
        }
        break;
      }

      case 'apply_status_self': {
        // Apply status to self (source), not target
        applyStatus(state, source, effect.status, effect.stacks, source.id);
        logs.push({
          round: state.round,
          combatantId: source.id,
          message: `${effect.status} ${effect.stacks} applied to ${source.name}.`,
        });

        // Trigger passive effects for status application
        const statusPassiveLogs = onStatusApplied(
          state, source, source, effect.status, effect.stacks
        );
        logs.push(...statusPassiveLogs);

        // Rebuild turn order mid-round if speed was affected
        if (isSpeedStatus(effect.status)) {
          const reorderLogs = rebuildTurnOrderMidRound(state);
          logs.push(...reorderLogs);
        }
        break;
      }

      case 'cleanse': {
        // Remove debuffs from self (highest stacks first)
        const debuffTypes = ['burn', 'poison', 'paralysis', 'slow', 'enfeeble', 'sleep', 'leech'];
        const debuffs = source.statuses
          .filter(s => debuffTypes.includes(s.type))
          .sort((a, b) => b.stacks - a.stacks);

        const toRemove = debuffs.slice(0, effect.count);
        const removedNames: string[] = [];

        for (const debuff of toRemove) {
          const idx = source.statuses.findIndex(s => s.type === debuff.type);
          if (idx !== -1) {
            source.statuses.splice(idx, 1);
            removedNames.push(`${debuff.type} ${debuff.stacks}`);
          }
        }

        if (removedNames.length > 0) {
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} cleanses ${removedNames.join(', ')}!`,
          });

          // Rebuild turn order if speed-affecting debuffs were removed
          const speedDebuffs = ['paralysis', 'slow'];
          if (toRemove.some(d => speedDebuffs.includes(d.type))) {
            const reorderLogs = rebuildTurnOrderMidRound(state);
            logs.push(...reorderLogs);
          }
        } else {
          logs.push({
            round: state.round,
            combatantId: source.id,
            message: `${source.name} has no debuffs to cleanse.`,
          });
        }
        break;
      }

      case 'block': {
        target.block += effect.value;
        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} gains ${effect.value} Block. (Block: ${target.block})`,
        });
        break;
      }
      case 'heal': {
        const healed = applyHeal(target, effect.value);
        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} heals ${healed} HP. (HP: ${target.hp}/${target.maxHp})`,
        });
        break;
      }
      case 'heal_percent': {
        const healAmount = Math.floor(target.maxHp * effect.percent);
        const healed = applyHeal(target, healAmount);
        logs.push({
          round: state.round,
          combatantId: target.id,
          message: `${target.name} heals ${healed} HP (${Math.round(effect.percent * 100)}% of max). (HP: ${target.hp}/${target.maxHp})`,
        });
        break;
      }
      case 'apply_status': {
        const statusApplied = applyStatus(state, target, effect.status, effect.stacks, source.id);
        if (statusApplied) {
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `${effect.status} ${effect.stacks} applied to ${target.name}.`,
          });

          // Trigger passive effects for status application (e.g., Spreading Flames)
          const statusPassiveLogs = onStatusApplied(
            state, source, target, effect.status, effect.stacks
          );
          logs.push(...statusPassiveLogs);
        } else {
          // Status was blocked (e.g., by Immunity)
          logs.push({
            round: state.round,
            combatantId: target.id,
            message: `Immunity makes ${target.name} immune to ${effect.status}!`,
          });
        }

        // Rebuild turn order mid-round if speed was affected
        if (statusApplied && isSpeedStatus(effect.status)) {
          const reorderLogs = rebuildTurnOrderMidRound(state);
          logs.push(...reorderLogs);
        }
        break;
      }
    }
  }

  return logs;
}

/**
 * Get playable cards from a combatant's hand (cards they can afford).
 */
export function getPlayableCards(combatant: Combatant): string[] {
  return combatant.hand.filter((_cardId, idx) => {
    const effectiveCost = getEffectiveCost(combatant, idx);
    return combatant.energy >= effectiveCost;
  });
}

/**
 * Get the effective cost of a card at a specific hand index.
 * Accounts for: Inferno Momentum, Quick Feet, Hustle
 */
export function getEffectiveCost(combatant: Combatant, handIndex: number): number {
  const cardId = combatant.hand[handIndex];
  if (!cardId) return 0;
  const card = getMove(cardId);

  let cost = card.cost;

  // Inferno Momentum: -3 cost for highest-cost fire card
  const hasInfernoReduction = combatant.turnFlags.infernoMomentumReducedIndex === handIndex;
  if (hasInfernoReduction) cost -= 3;

  // Quick Feet: First attack each turn costs 1 less
  cost -= checkQuickFeet(combatant, card);

  // Hustle: Attacks cost +1
  cost += checkHustleCostIncrease(combatant, card);

  return Math.max(0, cost);
}
