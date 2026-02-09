import type { CombatState, BattleAction } from './types';
import { getCurrentCombatant } from './combat';
import { getMove } from '../data/loaders';
import { getValidTargets } from './position';

// ============================================================
// Enemy AI — Section 10 of spec
// ============================================================

/**
 * Choose an action for the current enemy combatant.
 * Simple greedy AI:
 * 1. Play cheapest affordable damage card → valid target (prioritize low HP)
 * 2. If no damage card, play cheapest affordable defense card → self
 * 3. If nothing affordable, end turn
 * Max 2 cards per turn for MVP.
 */
export function chooseEnemyAction(
  state: CombatState,
  cardsPlayedThisTurn: number,
): BattleAction {
  const combatant = getCurrentCombatant(state);

  // Stop after 2 cards
  if (cardsPlayedThisTurn >= 2) {
    return { type: 'end_turn' };
  }

  const hand = combatant.hand;
  const energy = combatant.energy;

  // Find affordable damage cards with valid targets (sorted by cost ascending)
  const damageCards = hand
    .map(id => ({ id, card: getMove(id) }))
    .filter(({ card }) =>
      card.cost <= energy &&
      card.effects.some(e => e.type === 'damage')
    )
    .map(({ id, card }) => ({
      id,
      card,
      validTargets: getValidTargets(state, combatant, card.range),
    }))
    .filter(({ validTargets }) => validTargets.length > 0)
    .sort((a, b) => a.card.cost - b.card.cost);

  if (damageCards.length > 0) {
    const chosen = damageCards[0];
    // Pick a random valid target
    const randomTarget = chosen.validTargets[Math.floor(Math.random() * chosen.validTargets.length)];
    return {
      type: 'play_card',
      cardInstanceId: chosen.id,
      targetId: randomTarget.id,
    };
  }

  // Find affordable defense/self-targeting cards
  const defenseCards = hand
    .map(id => ({ id, card: getMove(id) }))
    .filter(({ card }) =>
      card.cost <= energy &&
      (card.range === 'self' || card.effects.some(e => e.type === 'block'))
    )
    .sort((a, b) => a.card.cost - b.card.cost);

  if (defenseCards.length > 0) {
    return {
      type: 'play_card',
      cardInstanceId: defenseCards[0].id,
    };
  }

  // Try any affordable card with valid targets
  const anyCard = hand
    .map(id => ({ id, card: getMove(id) }))
    .filter(({ card }) => card.cost <= energy)
    .map(({ id, card }) => ({
      id,
      card,
      validTargets: getValidTargets(state, combatant, card.range),
    }))
    .filter(({ validTargets }) => validTargets.length > 0)
    .sort((a, b) => a.card.cost - b.card.cost);

  if (anyCard.length > 0) {
    const chosen = anyCard[0];
    if (chosen.card.range === 'self') {
      return {
        type: 'play_card',
        cardInstanceId: chosen.id,
      };
    }
    // Pick a random valid target
    const randomTarget = chosen.validTargets[Math.floor(Math.random() * chosen.validTargets.length)];
    return {
      type: 'play_card',
      cardInstanceId: chosen.id,
      targetId: randomTarget.id,
    };
  }

  return { type: 'end_turn' };
}
