import type { BattleState, PokemonCombatState, Action, BattleResult } from './types';
import type { PokemonId } from '../config/pokemon';
import { getPokemonStats } from '../config/pokemon';
import { getStarterDeck } from '../config/cards';
import { createDeck, drawCards, playCard as moveCardToDiscard } from './deck';
import { resolveCardEffect, getCardTargets } from './cards';
import { getCardDefinition } from '../config/cards';
import { processEndOfTurnStatuses, resetBlock } from './status';

export function createBattleState(
  playerParty: Array<{ pokemonId: PokemonId; playerId?: string; playerName?: string }>,
  enemies: Array<{ pokemonId: PokemonId }>
): BattleState {
  const playerCombatStates: PokemonCombatState[] = playerParty.map(p => {
    const stats = getPokemonStats(p.pokemonId);
    const deck = createDeck(getStarterDeck(p.pokemonId));
    const { hand, deck: remainingDeck } = drawCards(deck, [], [], 5);
    
    return {
      pokemonId: p.pokemonId,
      playerId: p.playerId,
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      currentMana: stats.maxMana,
      maxMana: stats.maxMana,
      manaRegen: stats.manaRegen,
      speed: stats.speed,
      block: 0,
      statuses: [],
      buffs: [],
      hand,
      deck: remainingDeck,
      discard: [],
      hasActedThisRound: false,
    };
  });

  const enemyCombatStates: PokemonCombatState[] = enemies.map(e => {
    const stats = getPokemonStats(e.pokemonId);
    const deck = createDeck(getStarterDeck(e.pokemonId));
    const { hand, deck: remainingDeck } = drawCards(deck, [], [], 5);
    
    return {
      pokemonId: e.pokemonId,
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      currentMana: stats.maxMana,
      maxMana: stats.maxMana,
      manaRegen: stats.manaRegen,
      speed: stats.speed,
      block: 0,
      statuses: [],
      buffs: [],
      hand,
      deck: remainingDeck,
      discard: [],
      hasActedThisRound: false,
    };
  });

  const allCombatants = [...playerCombatStates, ...enemyCombatStates];
  const turnOrder = calculateTurnOrder(allCombatants);

  return {
    playerParty: playerCombatStates,
    enemies: enemyCombatStates,
    turnOrder,
    currentTurnIndex: 0,
    currentRound: 1,
    roundActed: new Set(),
    result: 'ongoing',
  };
}

export function calculateTurnOrder(combatants: PokemonCombatState[]): PokemonCombatState[] {
  return [...combatants]
    .filter(p => p.currentHp > 0)
    .sort((a, b) => b.speed - a.speed);
}

export function checkBattleEnd(battleState: BattleState): BattleResult {
  const alivePlayers = battleState.playerParty.filter(p => p.currentHp > 0);
  const aliveEnemies = battleState.enemies.filter(e => e.currentHp > 0);

  if (alivePlayers.length === 0) {
    return 'defeat';
  }
  if (aliveEnemies.length === 0) {
    return 'victory';
  }
  return 'ongoing';
}

function startNewRound(battleState: BattleState): BattleState {
  // Reset block for all combatants
  const newPlayerParty = battleState.playerParty.map(resetBlock);
  const newEnemies = battleState.enemies.map(resetBlock);
  
  // Recalculate turn order
  const allCombatants = [...newPlayerParty, ...newEnemies];
  const turnOrder = calculateTurnOrder(allCombatants);
  
  // Reset round tracking
  const newRoundActed = new Set<string>();
  
  // Draw cards for all living Pokemon at end of round (up to 5 cards each)
  const updatedPlayerParty = newPlayerParty.map(p => {
    if (p.currentHp <= 0) {
      // Dead Pokemon don't draw cards, but still mark as not acted
      return { ...p, hasActedThisRound: false };
    }
    const { hand, deck, discard } = drawCards(p.deck, p.hand, p.discard, 5);
    return { ...p, hand, deck, discard, hasActedThisRound: false };
  });
  
  const updatedEnemies = newEnemies.map(e => {
    if (e.currentHp <= 0) {
      // Dead Pokemon don't draw cards, but still mark as not acted
      return { ...e, hasActedThisRound: false };
    }
    const { hand, deck, discard } = drawCards(e.deck, e.hand, e.discard, 5);
    return { ...e, hand, deck, discard, hasActedThisRound: false };
  });

  // Update turn order with the new hand states
  const updatedTurnOrder = turnOrder.map(pokemon => {
    if (pokemon.playerId) {
      const updated = updatedPlayerParty.find(p => p.pokemonId === pokemon.pokemonId);
      return updated || pokemon;
    } else {
      const updated = updatedEnemies.find(e => e.pokemonId === pokemon.pokemonId);
      return updated || pokemon;
    }
  });

  return {
    ...battleState,
    playerParty: updatedPlayerParty,
    enemies: updatedEnemies,
    turnOrder: updatedTurnOrder,
    currentTurnIndex: 0,
    currentRound: battleState.currentRound + 1,
    roundActed: newRoundActed,
  };
}

function startPokemonTurn(pokemon: PokemonCombatState): PokemonCombatState {
  // Regenerate mana only - cards are drawn at end of round, not start of turn
  const newMana = Math.min(
    pokemon.maxMana,
    pokemon.currentMana + pokemon.manaRegen
  );

  return {
    ...pokemon,
    currentMana: newMana,
  };
}

export function processTurn(
  battleState: BattleState,
  action: Action
): BattleState {
  if (battleState.result !== 'ongoing') {
    return battleState;
  }

  let newBattleState = { ...battleState };
  let currentCombatant = newBattleState.turnOrder[newBattleState.currentTurnIndex];
  
  if (!currentCombatant || currentCombatant.currentHp <= 0) {
    // Skip dead combatants
    return advanceToNextTurn(newBattleState);
  }

  // Check if we need to start a new round
  const allActed = newBattleState.turnOrder.every(p => 
    p.currentHp <= 0 || newBattleState.roundActed.has(p.pokemonId)
  );
  
  if (allActed) {
    newBattleState = startNewRound(newBattleState);
    // Re-get current combatant after round reset
    const newCurrent = newBattleState.turnOrder[newBattleState.currentTurnIndex];
    if (!newCurrent || newCurrent.currentHp <= 0) {
      return advanceToNextTurn(newBattleState);
    }
  }

  // Start turn (regenerate mana, draw cards)
  if (!newBattleState.roundActed.has(currentCombatant.pokemonId)) {
    const updatedCombatant = startPokemonTurn(currentCombatant);
    
    // Update in appropriate array
    if (updatedCombatant.playerId) {
      const index = newBattleState.playerParty.findIndex(p => p.pokemonId === updatedCombatant.pokemonId);
      if (index >= 0) {
        newBattleState.playerParty[index] = updatedCombatant;
      }
    } else {
      const index = newBattleState.enemies.findIndex(e => e.pokemonId === updatedCombatant.pokemonId);
      if (index >= 0) {
        newBattleState.enemies[index] = updatedCombatant;
      }
    }
    
    // Update turn order
    const turnOrderIndex = newBattleState.turnOrder.findIndex(p => p.pokemonId === updatedCombatant.pokemonId);
    if (turnOrderIndex >= 0) {
      newBattleState.turnOrder[turnOrderIndex] = updatedCombatant;
    }
    
    // Update currentCombatant reference to use the updated one
    currentCombatant = updatedCombatant;
  }

  // Process action - use the most up-to-date combatant state
  if (action.type === 'playCard') {
    newBattleState = processPlayCard(newBattleState, action, currentCombatant);
  } else if (action.type === 'endTurn') {
    newBattleState = processEndTurn(newBattleState);
  }

  // Check battle end
  newBattleState.result = checkBattleEnd(newBattleState);

  return newBattleState;
}

function processPlayCard(
  battleState: BattleState,
  action: Action & { type: 'playCard' },
  currentCombatantOverride?: PokemonCombatState
): BattleState {
  // Use override if provided (most up-to-date state), otherwise get from turn order
  const currentCombatant = currentCombatantOverride || battleState.turnOrder[battleState.currentTurnIndex];
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:227',message:'processPlayCard entry',data:{casterId:action.casterId,cardId:action.cardId,currentCombatantMana:currentCombatant?.currentMana,currentCombatantHand:currentCombatant?.hand,currentCombatantHandLength:currentCombatant?.hand.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!currentCombatant || currentCombatant.pokemonId !== action.casterId) {
    return battleState; // Invalid action
  }

  const card = getCardDefinition(action.cardId);
  if (!card) {
    return battleState; // Invalid card
  }

  // Check if can afford
  if (currentCombatant.currentMana < card.cost) {
    return battleState; // Can't afford
  }
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:241',message:'Card affordability check',data:{cardName:card.name,cardCost:card.cost,currentMana:currentCombatant.currentMana,canAfford:currentCombatant.currentMana >= card.cost},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // Get targets
  const targets = getCardTargets(card, currentCombatant, battleState, action.targetIds);
  if (targets.length === 0 && card.effect.type !== 'block' && card.effect.target !== 'all') {
    return battleState; // No valid targets
  }

  // Resolve card effect
  let newBattleState = resolveCardEffect(card, currentCombatant, targets, battleState);

  // Update caster's mana and hand (use currentCombatant's hand/mana, not updatedCaster's)
  const casterParty = currentCombatant.playerId ? newBattleState.playerParty : newBattleState.enemies;
  const casterIndex = casterParty.findIndex(p => p.pokemonId === action.casterId);
  if (casterIndex >= 0) {
    // Get the updated caster (block may have been updated by card effect)
    const updatedCaster = casterParty[casterIndex];
    
    // Get the most up-to-date combatant from battleState (hand may have changed from previous actions)
  const latestCombatant = casterParty[casterIndex];
  
  // Check if card is still in hand (it might have been played already in a previous action)
  if (!latestCombatant.hand.includes(action.cardId)) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:264',message:'Card not in hand - skipping',data:{cardId:action.cardId,hand:latestCombatant.hand,handLength:latestCombatant.hand.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    return battleState; // Card already played or not in hand, skip this action
  }
  
  // Use latestCombatant's hand (most up-to-date state) to find the card
  // Use currentCombatant's mana (source of truth after regeneration) to calculate new mana
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:264',message:'Before moveCardToDiscard',data:{cardId:action.cardId,handBefore:latestCombatant.hand,handLength:latestCombatant.hand.length,cardInHand:latestCombatant.hand.includes(action.cardId),currentCombatantMana:currentCombatant.currentMana,latestCombatantMana:latestCombatant.currentMana,cardCost:card.cost},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const { hand, discard } = moveCardToDiscard(
    latestCombatant.hand,  // Use latest to check if card exists
    action.cardId,
    currentCombatant.discard  // Use currentCombatant's discard
  );
    
    // Calculate new mana from currentCombatant's mana (source of truth after regeneration)
    const newMana = currentCombatant.currentMana - card.cost;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:271',message:'Mana calculation',data:{currentCombatantMana:currentCombatant.currentMana,latestCombatantMana:latestCombatant.currentMana,cardCost:card.cost,calculatedNewMana:newMana,updatedCasterMana:updatedCaster.currentMana},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Update mana, hand, and discard - preserve block and other stats from card effect
    casterParty[casterIndex] = {
      ...updatedCaster,
      currentMana: newMana,
      hand,
      discard,
    };
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:279',message:'After updating caster',data:{finalMana:casterParty[casterIndex].currentMana,handLength:casterParty[casterIndex].hand.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'battle.ts:250',message:'Updated caster after card play',data:{casterId:action.casterId,block:casterParty[casterIndex].block,mana:casterParty[casterIndex].currentMana},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Update turn order with the updated caster
    const turnOrderIndex = newBattleState.turnOrder.findIndex(p => p.pokemonId === currentCombatant.pokemonId);
    if (turnOrderIndex >= 0) {
      newBattleState.turnOrder[turnOrderIndex] = casterParty[casterIndex];
    }
  }

  return newBattleState;
}

function processEndTurn(battleState: BattleState): BattleState {
  const currentCombatant = battleState.turnOrder[battleState.currentTurnIndex];
  if (!currentCombatant) {
    return advanceToNextTurn(battleState);
  }

  // Process end-of-turn status effects
  let newBattleState = { ...battleState };
  const casterParty = currentCombatant.playerId ? newBattleState.playerParty : newBattleState.enemies;
  const casterIndex = casterParty.findIndex(p => p.pokemonId === currentCombatant.pokemonId);
  
  if (casterIndex >= 0) {
    const updatedCaster = processEndOfTurnStatuses(casterParty[casterIndex]);
    casterParty[casterIndex] = updatedCaster;
    
    // Update turn order
    const turnOrderIndex = newBattleState.turnOrder.findIndex(p => p.pokemonId === currentCombatant.pokemonId);
    if (turnOrderIndex >= 0) {
      newBattleState.turnOrder[turnOrderIndex] = updatedCaster;
    }
  }

  // Mark as acted this round
  newBattleState.roundActed.add(currentCombatant.pokemonId);

  // Check battle end after status effects
  newBattleState.result = checkBattleEnd(newBattleState);
  if (newBattleState.result !== 'ongoing') {
    return newBattleState;
  }

  return advanceToNextTurn(newBattleState);
}

function advanceToNextTurn(battleState: BattleState): BattleState {
  let nextIndex = battleState.currentTurnIndex + 1;
  
  // Find next alive combatant that hasn't acted
  while (nextIndex < battleState.turnOrder.length) {
    const next = battleState.turnOrder[nextIndex];
    if (next.currentHp > 0 && !battleState.roundActed.has(next.pokemonId)) {
      return {
        ...battleState,
        currentTurnIndex: nextIndex,
      };
    }
    nextIndex++;
  }

  // If we've gone through everyone, start new round
  return startNewRound(battleState);
}
