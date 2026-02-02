import { useState, useCallback, useEffect } from 'react';
import type { GameState, Action, BattleState, CampaignState } from '../../engine/types';
import { createCampaignState, getCurrentEncounter, checkEvolutionCheckpoint, applyEvolutions, progressToNode } from '../../engine/campaign';
import { createBattleState, processTurn } from '../../engine/battle';
import { chooseEnemyAction } from '../../engine/ai';
import { getEncounter } from '../../config/encounters';
import { getNode } from '../../config/campaign';
import type { PokemonId } from '../../config/pokemon';

const STORAGE_KEY = 'pokespire_game_state';

// Helper to serialize/deserialize game state (handles Sets)
function serializeGameState(state: GameState): string {
  const serializable = {
    ...state,
    campaign: state.campaign ? {
      ...state.campaign,
      completedNodes: Array.from(state.campaign.completedNodes),
    } : undefined,
    battle: state.battle ? {
      ...state.battle,
      roundActed: Array.from(state.battle.roundActed),
    } : undefined,
  };
  return JSON.stringify(serializable);
}

function deserializeGameState(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      campaign: parsed.campaign ? {
        ...parsed.campaign,
        completedNodes: new Set(parsed.campaign.completedNodes || []),
      } : undefined,
      battle: parsed.battle ? {
        ...parsed.battle,
        roundActed: new Set(parsed.battle.roundActed || []),
      } : undefined,
    };
  } catch {
    return null;
  }
}

function loadGameState(): GameState | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return deserializeGameState(stored);
}

function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, serializeGameState(state));
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const loaded = loadGameState();
    return loaded || { screen: 'intro' };
  });

  // Save to localStorage whenever game state changes
  useEffect(() => {
    if (gameState.screen !== 'intro' && gameState.screen !== 'playerSetup' && gameState.screen !== 'starterSelection') {
      saveGameState(gameState);
    }
  }, [gameState]);

  const handleStartCampaign = useCallback((players: Array<{ id: string; name: string; pokemonId: PokemonId }>) => {
    const campaignState = createCampaignState(players);
    setGameState({
      screen: 'map',
      campaign: campaignState,
      players: players.map(p => ({ id: p.id, name: p.name, pokemonId: p.pokemonId })),
    });
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setGameState(prev => {
      if (!prev.campaign) return prev;

      const node = getNode(nodeId);
      if (!node) return prev;

      // Check if it's a battle node
      if (node.type === 'battle' || node.type === 'boss') {
        const encounterId = node.encounterId;
        if (!encounterId) return prev;

        const encounter = getEncounter(encounterId);
        if (!encounter) return prev;

        // Create battle state
        const party = prev.campaign.party.map(p => ({
          pokemonId: p.pokemonId,
          playerId: p.playerId,
          playerName: p.playerName,
        }));

        const enemies = encounter.enemies.map(e => ({ pokemonId: e.pokemonId }));
        const battleState = createBattleState(party, enemies);

        return {
          ...prev,
          screen: 'combat',
          battle: battleState,
        };
      }

      // For evolution nodes, just progress
      if (node.type === 'evolution') {
        const evolutions = checkEvolutionCheckpoint(prev.campaign, nodeId);
        const newCampaign = applyEvolutions(prev.campaign, evolutions);
        const updatedCampaign = progressToNode(newCampaign, nodeId);
        
        return {
          ...prev,
          campaign: updatedCampaign,
          evolutions,
        };
      }

      // For event nodes, just progress
      const updatedCampaign = progressToNode(prev.campaign, nodeId);
      return {
        ...prev,
        campaign: updatedCampaign,
      };
    });
  }, []);

  const handleBattleAction = useCallback((action: Action) => {
    setGameState(prev => {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:78',message:'handleBattleAction called',data:{actionType:action.type,hasBattle:!!prev.battle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:81',message:'handleBattleAction - before processTurn',data:{hasBattle:!!prev.battle,battleResult:prev.battle?.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!prev.battle) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:84',message:'ERROR: No battle state in handleBattleAction',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return prev;
      }

      try {
        let newBattleState = processTurn(prev.battle, action);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:88',message:'handleBattleAction - after processTurn',data:{newResult:newBattleState.result,hasPlayerParty:newBattleState.playerParty.length>0,hasEnemies:newBattleState.enemies.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        // If battle ended, handle it
        if (newBattleState.result === 'victory' || newBattleState.result === 'defeat') {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:93',message:'Battle ended',data:{result:newBattleState.result,hasCampaign:!!prev.campaign},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (newBattleState.result === 'victory' && prev.campaign) {
          // Check if we're at an evolution checkpoint
          const currentNode = getNode(prev.campaign.currentNodeId);
          const evolutions = currentNode ? checkEvolutionCheckpoint(prev.campaign, currentNode.id) : [];
          
          if (evolutions.length > 0) {
            // Apply evolutions
            const newCampaign = applyEvolutions(prev.campaign, evolutions);
            return {
              ...prev,
              screen: 'victory',
              lastBattleResult: newBattleState.result,
              evolutions,
              campaign: newCampaign,
            };
          }

          // Check if it's the final boss (Mewtwo)
          const isFinalVictory = currentNode?.encounterId === 'mewtwo';
          
          return {
            ...prev,
            screen: 'victory',
            lastBattleResult: newBattleState.result,
            isFinalVictory,
          };
        } else {
          return {
            ...prev,
            screen: 'defeat',
            lastBattleResult: newBattleState.result,
          };
        }
      }

        const newState = {
          ...prev,
          battle: newBattleState,
        };
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:125',message:'handleBattleAction - returning ongoing state',data:{screen:newState.screen,hasBattle:!!newState.battle,battleResult:newState.battle?.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return newState;
      } catch (error) {
        // Log error and return state with error flag
        console.error('Error processing battle action:', error);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGameState.ts:202',message:'ERROR in handleBattleAction',data:{error:error instanceof Error ? error.message : String(error),actionType:action.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        // Return previous state unchanged, but with error flag
        return {
          ...prev,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }, []);

  const handleBattleEnd = useCallback((result: 'victory' | 'defeat') => {
    setGameState(prev => {
      if (result === 'defeat') {
        return {
          ...prev,
          screen: 'defeat',
          lastBattleResult: result,
        };
      }

      // Victory - check for evolutions
      if (prev.campaign) {
        const currentNode = getNode(prev.campaign.currentNodeId);
        const evolutions = currentNode ? checkEvolutionCheckpoint(prev.campaign, currentNode.id) : [];
        
        if (evolutions.length > 0) {
          const newCampaign = applyEvolutions(prev.campaign, evolutions);
          return {
            ...prev,
            screen: 'victory',
            lastBattleResult: result,
            evolutions,
            campaign: newCampaign,
          };
        }

        // Check if final victory
        const isFinalVictory = currentNode?.encounterId === 'mewtwo';
        
        return {
          ...prev,
          screen: 'victory',
          lastBattleResult: result,
          isFinalVictory,
        };
      }

      return {
        ...prev,
        screen: 'victory',
        lastBattleResult: result,
      };
    });
  }, []);

  const handleContinueFromVictory = useCallback(() => {
    setGameState(prev => {
      if (prev.isFinalVictory) {
        // Return to intro
        return {
          screen: 'intro',
        };
      }
      // Return to map
      return {
        ...prev,
        screen: 'map',
        battle: undefined,
        evolutions: undefined,
      };
    });
  }, []);

  const handleReturnToMenu = useCallback(() => {
    setGameState({
      screen: 'intro',
    });
  }, []);

  const handleResetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState({
      screen: 'intro',
    });
  }, []);

  const handleClearError = useCallback(() => {
    setGameState(prev => {
      const { error, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    gameState,
    handleClearError,
    handleStartCampaign,
    handleNodeClick,
    handleBattleAction,
    handleBattleEnd,
    handleContinueFromVictory,
    handleReturnToMenu,
    handleResetGame,
  };
}
