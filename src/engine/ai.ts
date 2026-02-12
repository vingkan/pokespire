import type { CombatState, BattleAction, Combatant, MoveDefinition } from './types';
import { getCurrentCombatant } from './combat';
import { getMove } from '../data/loaders';
import { getValidTargets } from './position';
import { getEffectiveCost } from './cards';

// ============================================================
// Enemy AI — Score-based greedy card selection
// ============================================================

/** Effect types that deal damage */
const DAMAGE_EFFECTS = ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko'];

/** Debuff status types that target enemies */
const DEBUFF_STATUSES = ['burn', 'poison', 'paralysis', 'slow', 'enfeeble', 'sleep', 'leech'];

/**
 * Check if a card deals damage to enemies.
 */
function isDamageCard(card: MoveDefinition): boolean {
  return card.effects.some(e => DAMAGE_EFFECTS.includes(e.type));
}

/**
 * Check if a card applies debuffs to enemies.
 */
function isDebuffCard(card: MoveDefinition): boolean {
  return card.effects.some(e =>
    e.type === 'apply_status' && DEBUFF_STATUSES.includes(e.status)
  );
}

/**
 * Check if a card is defensive (block, heal, self-buff).
 */
function isDefenseCard(card: MoveDefinition): boolean {
  return card.range === 'self' || card.effects.some(e =>
    e.type === 'block' || e.type === 'heal_percent' ||
    (e.type === 'apply_status_self' && !DEBUFF_STATUSES.includes(e.status))
  );
}

/**
 * Get the total damage output of a card.
 */
function getCardDamage(card: MoveDefinition): number {
  let total = 0;
  for (const e of card.effects) {
    switch (e.type) {
      case 'damage':
        total += e.value + (e.bonusValue ?? 0); // include bonus as optimistic estimate
        break;
      case 'multi_hit':
        total += e.value * e.hits;
        break;
      case 'recoil':
      case 'heal_on_hit':
      case 'self_ko':
        total += e.value;
        break;
    }
  }
  return total;
}

/**
 * Get the total debuff value of a card (sum of stacks applied).
 */
function getDebuffValue(card: MoveDefinition): number {
  let value = 0;
  for (const e of card.effects) {
    if (e.type === 'apply_status' && DEBUFF_STATUSES.includes(e.status)) {
      value += e.stacks * 2; // weight stacks
    }
  }
  return value;
}

/**
 * Get the defensive value of a card.
 */
function getDefenseValue(card: MoveDefinition): number {
  let value = 0;
  for (const e of card.effects) {
    if (e.type === 'block') value += e.value;
    if (e.type === 'heal_percent') value += 10; // rough value
    if (e.type === 'apply_status_self') value += e.stacks * 2;
  }
  return value;
}

/**
 * Count how many enemies a card hits (for AoE scoring).
 */
function countTargetedEnemies(state: CombatState, source: Combatant, card: MoveDefinition): number {
  switch (card.range) {
    case 'all_enemies':
      return state.combatants.filter(c => c.side !== source.side && c.alive).length;
    case 'front_row':
    case 'back_row':
    case 'any_row':
    case 'column':
      // Approximate: these hit multiple enemies
      return Math.max(1, Math.floor(
        state.combatants.filter(c => c.side !== source.side && c.alive).length * 0.5
      ));
    default:
      return 1;
  }
}

interface ScoredPlay {
  cardId: string;
  handIndex: number;
  card: MoveDefinition;
  score: number;
  targetId?: string;
}

/**
 * Score a card for a given target (or no target for self cards).
 * Higher score = better play.
 */
function scorePlay(
  state: CombatState,
  source: Combatant,
  card: MoveDefinition,
  target: Combatant | null,
): number {
  let score = 0;

  // Damage scoring
  if (isDamageCard(card)) {
    const baseDmg = getCardDamage(card);
    const targetCount = countTargetedEnemies(state, source, card);
    score += baseDmg * targetCount;

    // Lethal bonus: strongly prefer cards that can KO (considers block)
    if (target && target.hp + target.block <= baseDmg) {
      score += 15;
    }
  }

  // Debuff scoring
  if (isDebuffCard(card)) {
    const debuffVal = getDebuffValue(card);
    score += debuffVal;

    // Reduced value if target already has the debuff at high stacks
    if (target) {
      for (const e of card.effects) {
        if (e.type === 'apply_status' && DEBUFF_STATUSES.includes(e.status)) {
          const existing = target.statuses.find(s => s.type === e.status);
          if (existing && existing.stacks >= 3) {
            score -= 2; // diminishing returns on stacking
          }
        }
      }
    }
  }

  // Defense scoring — scales with missing HP
  if (isDefenseCard(card)) {
    const defVal = getDefenseValue(card);
    const hpPercent = source.hp / source.maxHp;
    // Base value + bonus when low HP
    score += defVal * (hpPercent < 0.5 ? 2 : hpPercent < 0.75 ? 1.2 : 0.5);
  }

  // Cards that are both damage + status (like Ember) get combined score
  // (already handled above since both isDamageCard and isDebuffCard can be true)

  return score;
}

/**
 * Choose the best target for a damage/debuff card.
 * Prefers lethal targets, then lowest HP.
 */
function chooseBestTarget(
  targets: Combatant[],
  card: MoveDefinition,
): Combatant {
  const dmg = getCardDamage(card);

  // Prefer targets we can KO (accounting for block)
  const lethalTargets = targets.filter(t => t.hp + t.block <= dmg);
  if (lethalTargets.length > 0) {
    // KO the one with highest effective HP among lethal (maximize value)
    return lethalTargets.sort((a, b) => (b.hp + b.block) - (a.hp + a.block))[0];
  }

  // Otherwise prefer lowest effective HP target
  return targets.sort((a, b) => (a.hp + a.block) - (b.hp + b.block))[0];
}

/**
 * Choose an action for the current enemy combatant.
 * Score-based greedy AI that plays until out of energy.
 */
export function chooseEnemyAction(
  state: CombatState,
  _cardsPlayedThisTurn: number,
): BattleAction {
  const combatant = getCurrentCombatant(state);
  const hand = combatant.hand;

  // Build list of all playable cards with scores
  const plays: ScoredPlay[] = [];

  for (let i = 0; i < hand.length; i++) {
    const cardId = hand[i];
    const card = getMove(cardId);
    const cost = getEffectiveCost(combatant, i);

    // Can't afford
    if (cost > combatant.energy) continue;

    // Self-targeting cards
    if (card.range === 'self') {
      const score = scorePlay(state, combatant, card, null);
      if (score > 0) {
        plays.push({ cardId, handIndex: i, card, score, targetId: undefined });
      }
      continue;
    }

    // Ally-targeting cards — target self
    if (card.range === 'any_ally') {
      const score = scorePlay(state, combatant, card, combatant);
      if (score > 0) {
        plays.push({ cardId, handIndex: i, card, score, targetId: combatant.id });
      }
      continue;
    }

    // Enemy-targeting cards
    const validTargets = getValidTargets(state, combatant, card.range);
    if (validTargets.length === 0) continue;

    // For AoE cards, score doesn't depend on specific target
    const isAoE = ['all_enemies', 'front_row', 'back_row'].includes(card.range);
    if (isAoE) {
      const score = scorePlay(state, combatant, card, validTargets[0]);
      plays.push({ cardId, handIndex: i, card, score, targetId: validTargets[0].id });
      continue;
    }

    // For single-target cards, pick best target and score against it
    const bestTarget = chooseBestTarget(validTargets, card);
    const score = scorePlay(state, combatant, card, bestTarget);
    if (score > 0) {
      plays.push({ cardId, handIndex: i, card, score, targetId: bestTarget.id });
    }
  }

  if (plays.length === 0) {
    return { type: 'end_turn' };
  }

  // Sort by score descending — but always play 0-cost cards first (free value)
  plays.sort((a, b) => {
    const aCost = getEffectiveCost(combatant, a.handIndex);
    const bCost = getEffectiveCost(combatant, b.handIndex);
    // 0-cost cards always go first
    if (aCost === 0 && bCost !== 0) return -1;
    if (bCost === 0 && aCost !== 0) return 1;
    // Then by score
    return b.score - a.score;
  });

  const best = plays[0];
  return {
    type: 'play_card',
    cardInstanceId: best.cardId,
    targetId: best.targetId,
  };
}
