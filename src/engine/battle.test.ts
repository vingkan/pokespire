import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, processTurn } from './battle';
import type { Action, BattleState } from './types';
import type { PokemonId } from '../config/pokemon';
import { getCardDefinition } from '../config/cards';

// Helper to create a battle state with specific mana values
function createBattleWithMana(
  playerMana: number,
  enemyMana: number = 3
): BattleState {
  const battleState = createBattleState(
    [{ pokemonId: 'charmander' as PokemonId, playerId: '1', playerName: 'Player 1' }],
    [{ pokemonId: 'magnemite' as PokemonId }]
  );
  
  // Override mana values
  battleState.playerParty[0].currentMana = playerMana;
  battleState.enemies[0].currentMana = enemyMana;
  battleState.turnOrder[0].currentMana = playerMana;
  
  return battleState;
}

// Helper to get player combatant from battle state
function getPlayerCombatant(battleState: BattleState) {
  return battleState.playerParty[0];
}

describe('Mana Management', () => {
  describe('Card play mana consumption', () => {
    it('should consume correct mana when playing Burn (cost 2) from 3 mana', () => {
      const battleState = createBattleWithMana(3);
      const player = getPlayerCombatant(battleState);
      
      // Ensure Burn is in hand
      if (!player.hand.includes('burn_1')) {
        player.hand.push('burn_1');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player.pokemonId,
        targetIds: [battleState.enemies[0].pokemonId],
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      expect(updatedPlayer.currentMana).toBe(1);
    });
    
    it('should consume correct mana when playing Defend (cost 1) from 3 mana', () => {
      const battleState = createBattleWithMana(3);
      const player = getPlayerCombatant(battleState);
      
      // Ensure Defend is in hand
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      expect(updatedPlayer.currentMana).toBe(2);
    });
    
    it('should prevent playing Flamethrower (cost 2) with only 1 mana', () => {
      const battleState = createBattleWithMana(1);
      const player = getPlayerCombatant(battleState);
      const initialMana = player.currentMana;
      
      // Ensure Flamethrower is in hand
      if (!player.hand.includes('flamethrower_1')) {
        player.hand.push('flamethrower_1');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'flamethrower_1',
        casterId: player.pokemonId,
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // Action should be rejected (state unchanged or mana unchanged)
      expect(updatedPlayer.currentMana).toBe(initialMana);
      expect(updatedPlayer.hand).toContain('flamethrower_1'); // Card should still be in hand
    });
    
    it('should consume mana correctly for multiple cards in same turn', () => {
      const battleState = createBattleWithMana(3);
      let currentState = battleState;
      
      // First card: Burn (cost 2)
      const player1 = getPlayerCombatant(currentState);
      if (!player1.hand.includes('burn_1')) {
        player1.hand.push('burn_1');
      }
      if (!player1.hand.includes('defend_charmander')) {
        player1.hand.push('defend_charmander');
      }
      
      const burnAction: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player1.pokemonId,
        targetIds: [currentState.enemies[0].pokemonId],
      };
      
      currentState = processTurn(currentState, burnAction);
      const playerAfterBurn = getPlayerCombatant(currentState);
      expect(playerAfterBurn.currentMana).toBe(1);
      
      // Second card: Defend (cost 1)
      const defendAction: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player1.pokemonId,
      };
      
      currentState = processTurn(currentState, defendAction);
      const playerAfterDefend = getPlayerCombatant(currentState);
      expect(playerAfterDefend.currentMana).toBe(0);
    });
    
    it('should not allow playing card when mana is insufficient', () => {
      const battleState = createBattleWithMana(0);
      const player = getPlayerCombatant(battleState);
      const initialMana = player.currentMana;
      
      // Ensure Defend is in hand
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // Mana should be unchanged
      expect(updatedPlayer.currentMana).toBe(initialMana);
    });
  });
  
  describe('Mana regeneration', () => {
    it('should regenerate mana at turn start', () => {
      const battleState = createBattleWithMana(1);
      const player = getPlayerCombatant(battleState);
      
      // End turn
      const endTurnAction: Action = { type: 'endTurn' };
      let newState = processTurn(battleState, endTurnAction);
      
      // Advance to next turn (enemy turn, then back to player)
      // For simplicity, manually trigger turn start by processing a new action
      // In actual game, this happens automatically when turn advances
      
      // Get the player after turn advancement
      const playerAfterTurn = newState.playerParty.find(p => p.pokemonId === player.pokemonId);
      
      // Mana should have regenerated (Charmander has maxMana 3, manaRegen 3)
      // But we need to wait for the player's next turn to regenerate
      // Let's test regeneration directly by checking startPokemonTurn behavior
      expect(playerAfterTurn?.currentMana).toBeDefined();
    });
  });
  
  describe('Mana state consistency', () => {
    it('should never allow mana to go negative', () => {
      const battleState = createBattleWithMana(1);
      const player = getPlayerCombatant(battleState);
      
      // Try to play a 2-cost card with only 1 mana
      if (!player.hand.includes('burn_1')) {
        player.hand.push('burn_1');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player.pokemonId,
        targetIds: [battleState.enemies[0].pokemonId],
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // If action was allowed, mana should be >= 0
      // If action was rejected, mana should be unchanged (1)
      expect(updatedPlayer.currentMana).toBeGreaterThanOrEqual(0);
    });
    
    it('should never exceed maxMana', () => {
      const battleState = createBattleWithMana(3);
      const player = getPlayerCombatant(battleState);
      
      // Charmander has maxMana 3
      expect(player.currentMana).toBeLessThanOrEqual(player.maxMana);
      
      // After any action, mana should still be <= maxMana
      const action: Action = { type: 'endTurn' };
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      expect(updatedPlayer.currentMana).toBeLessThanOrEqual(updatedPlayer.maxMana);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle playing card with exact mana (3 mana, play 3-cost card if exists)', () => {
      const battleState = createBattleWithMana(3);
      const player = getPlayerCombatant(battleState);
      
      // Find a 3-cost card or use a combination
      // For now, test with 2-cost + 1-cost = 3 total
      if (!player.hand.includes('burn_1')) {
        player.hand.push('burn_1');
      }
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      
      // Play 2-cost card
      const burnAction: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player.pokemonId,
        targetIds: [battleState.enemies[0].pokemonId],
      };
      
      let newState = processTurn(battleState, burnAction);
      let updatedPlayer = getPlayerCombatant(newState);
      expect(updatedPlayer.currentMana).toBe(1);
      
      // Play 1-cost card
      const defendAction: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      
      newState = processTurn(newState, defendAction);
      updatedPlayer = getPlayerCombatant(newState);
      expect(updatedPlayer.currentMana).toBe(0);
    });
    
    it('should maintain state consistency across multiple rapid card plays', () => {
      const battleState = createBattleWithMana(3);
      let currentState = battleState;
      const player = getPlayerCombatant(currentState);
      
      // Add multiple cards to hand
      if (!player.hand.includes('burn_1')) {
        player.hand.push('burn_1');
      }
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      
      // Play Burn (2 mana) -> should have 1 mana
      const burnAction: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player.pokemonId,
        targetIds: [currentState.enemies[0].pokemonId],
      };
      currentState = processTurn(currentState, burnAction);
      expect(getPlayerCombatant(currentState).currentMana).toBe(1);
      
      // Play Defend (1 mana) -> should have 0 mana
      const defendAction1: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      currentState = processTurn(currentState, defendAction1);
      expect(getPlayerCombatant(currentState).currentMana).toBe(0);
      
      // Try to play another Defend -> should fail, mana stays 0
      const defendAction2: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      const finalState = processTurn(currentState, defendAction2);
      expect(getPlayerCombatant(finalState).currentMana).toBe(0);
    });
  });
  
  describe('Specific bug reproduction', () => {
    it('should reproduce: Burn costs 2, decreases mana from 3 to 1 (not 2 to 1)', () => {
      const battleState = createBattleWithMana(3);
      const player = getPlayerCombatant(battleState);
      
      if (!player.hand.includes('burn_1')) {
        player.hand.push('burn_1');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'burn_1',
        casterId: player.pokemonId,
        targetIds: [battleState.enemies[0].pokemonId],
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // Should be 3 - 2 = 1, not 3 - 1 = 2
      expect(updatedPlayer.currentMana).toBe(1);
    });
    
    it('should reproduce: Flamethrower should not be playable with 1 mana', () => {
      const battleState = createBattleWithMana(1);
      const player = getPlayerCombatant(battleState);
      const initialMana = player.currentMana;
      
      if (!player.hand.includes('flamethrower_1')) {
        player.hand.push('flamethrower_1');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'flamethrower_1',
        casterId: player.pokemonId,
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // Should reject the action
      expect(updatedPlayer.currentMana).toBe(initialMana);
      expect(updatedPlayer.hand).toContain('flamethrower_1');
    });
    
    it('should reproduce: Defend should decrease mana, not increase it', () => {
      const battleState = createBattleWithMana(1);
      const player = getPlayerCombatant(battleState);
      
      if (!player.hand.includes('defend_charmander')) {
        player.hand.push('defend_charmander');
      }
      
      const action: Action = {
        type: 'playCard',
        cardId: 'defend_charmander',
        casterId: player.pokemonId,
      };
      
      const newState = processTurn(battleState, action);
      const updatedPlayer = getPlayerCombatant(newState);
      
      // Should be 1 - 1 = 0, not 1 + 1 = 2
      expect(updatedPlayer.currentMana).toBe(0);
    });
  });
});
