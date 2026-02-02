import type { BattleState, PokemonCombatState, Action } from './types';
import { getCardDefinition } from '../config/cards';
import type { CardDefinition } from '../config/cards';

function getCardPriority(card: CardDefinition): number {
  // Priority: 1 = highest (damage), 2 = medium (status/debuff), 3 = lowest (defensive/other)
  if (card.effect.type === 'damage') {
    return 1;
  } else if (card.effect.type === 'status') {
    return 2;
  } else {
    return 3;
  }
}

function getAffordableCards(
  pokemon: PokemonCombatState
): Array<{ card: CardDefinition; cardId: string }> {
  return pokemon.hand
    .map(cardId => {
      const card = getCardDefinition(cardId);
      return card ? { card, cardId } : null;
    })
    .filter((item): item is { card: CardDefinition; cardId: string } => 
      item !== null && item.card.cost <= pokemon.currentMana
    )
    .sort((a, b) => getCardPriority(a.card) - getCardPriority(b.card));
}

function getFrontMostAlivePlayer(battleState: BattleState): PokemonCombatState | undefined {
  return battleState.playerParty.find(p => p.currentHp > 0);
}

export function chooseEnemyAction(battleState: BattleState, enemy: PokemonCombatState): Action[] {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:34',message:'chooseEnemyAction entry',data:{enemyId:enemy.pokemonId,enemyMana:enemy.currentMana,enemyHand:enemy.hand,enemyHandLength:enemy.hand.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  const actions: Action[] = [];
  let remainingMana = enemy.currentMana;
  const affordableCards = getAffordableCards(enemy);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:37',message:'Affordable cards found',data:{affordableCount:affordableCards.length,affordableCardIds:affordableCards.map(c => c.cardId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // Greedily play cards in priority order
  for (const { card, cardId } of affordableCards) {
    if (remainingMana < card.cost) {
      continue;
    }

    // Determine target
    let targetIds: string[] | undefined;
    
    if (card.effect.type === 'damage' || card.effect.type === 'status') {
      if (card.effect.target === 'all') {
        // Multi-target, no explicit targets needed
        targetIds = undefined;
      } else {
        // Single target - front-most alive player
        const target = getFrontMostAlivePlayer(battleState);
        if (target) {
          targetIds = [target.pokemonId];
        } else {
          continue; // No valid target
        }
      }
    } else if (card.effect.type === 'heal' || card.effect.type === 'block') {
      if (card.effect.target === 'all') {
        targetIds = undefined;
      } else {
        // Single target - self for heals/blocks
        targetIds = [enemy.pokemonId];
      }
    } else if (card.effect.type === 'buff') {
      if (card.effect.target === 'all') {
        targetIds = undefined;
      } else {
        targetIds = [enemy.pokemonId];
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai.ts:76',message:'Adding playCard action',data:{cardId,cardName:card.name,cardCost:card.cost,remainingMana,enemyHand:enemy.hand,cardInHand:enemy.hand.includes(cardId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    actions.push({
      type: 'playCard',
      cardId,
      casterId: enemy.pokemonId,
      targetIds,
    });

    remainingMana -= card.cost;
  }

  // Always end turn after playing cards
  actions.push({
    type: 'endTurn',
  });

  return actions;
}
