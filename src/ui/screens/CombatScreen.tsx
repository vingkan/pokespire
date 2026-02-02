import { useState, useEffect, useRef } from 'react';
import type { BattleState, Action } from '../../engine/types';
import { chooseEnemyAction } from '../../engine/ai';
import { PokemonDisplay } from '../components/PokemonDisplay';
import { HandDisplay } from '../components/HandDisplay';
import { TurnOrderBar } from '../components/TurnOrderBar';
import { getCardDefinition } from '../../config/cards';
import { getCardTargets } from '../../engine/cards';
import { getPokemonStats } from '../../config/pokemon';

interface CombatScreenProps {
  battleState: BattleState;
  onAction: (action: Action) => void;
  onBattleEnd: (result: 'victory' | 'defeat') => void;
  onResetGame?: () => void;
}

export function CombatScreen({ battleState, onAction, onBattleEnd, onResetGame }: CombatScreenProps) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:16',message:'CombatScreen render',data:{result:battleState.result,turnIndex:battleState.currentTurnIndex,turnOrderLength:battleState.turnOrder.length,playerPartyLength:battleState.playerParty.length,enemiesLength:battleState.enemies.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | undefined>();
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const processingEnemyTurnRef = useRef(false);
  const lastProcessedTurnRef = useRef<string>('');

  const currentCombatant = battleState.turnOrder[battleState.currentTurnIndex];
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:24',message:'Current combatant check',data:{hasCurrentCombatant:!!currentCombatant,combatantId:currentCombatant?.pokemonId,combatantHp:currentCombatant?.currentHp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const isPlayerTurn = currentCombatant?.playerId !== undefined;
  const turnKey = `${battleState.currentTurnIndex}-${currentCombatant?.pokemonId}`;

  // Auto-process enemy turns (only once per turn)
  useEffect(() => {
    if (
      !isPlayerTurn &&
      currentCombatant &&
      battleState.result === 'ongoing' &&
      !processingEnemyTurnRef.current &&
      lastProcessedTurnRef.current !== turnKey
    ) {
      processingEnemyTurnRef.current = true;
      lastProcessedTurnRef.current = turnKey;

      const actions = chooseEnemyAction(battleState, currentCombatant);
      if (actions.length > 0) {
        // Process actions one at a time with delays
        let actionIndex = 0;
        const processNext = () => {
          if (actionIndex < actions.length && battleState.result === 'ongoing') {
            const action = actions[actionIndex];
            onAction(action);
            actionIndex++;
            
            // Continue processing if there are more actions
            if (actionIndex < actions.length && action.type !== 'endTurn') {
              setTimeout(processNext, 800);
            } else {
              // Done processing this enemy's turn
              processingEnemyTurnRef.current = false;
            }
          } else {
            processingEnemyTurnRef.current = false;
          }
        };
        
        // Start processing after a delay
        setTimeout(processNext, 500);
      } else {
        processingEnemyTurnRef.current = false;
      }
    }
  }, [isPlayerTurn, turnKey, battleState.result, onAction]);

  // Check battle end
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:69',message:'Battle end check effect',data:{result:battleState.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (battleState.result === 'victory' || battleState.result === 'defeat') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:71',message:'Calling onBattleEnd',data:{result:battleState.result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      onBattleEnd(battleState.result);
    }
  }, [battleState.result, onBattleEnd]);

  const handleCardClick = (cardIndex: number) => {
    if (!currentCombatant) return;
    
    const cardId = currentCombatant.hand[cardIndex];
    if (!cardId) return;
    
    const card = getCardDefinition(cardId);
    if (!card) return;

    if (currentCombatant.currentMana < card.cost) {
      return; // Can't afford
    }

    setSelectedCardIndex(cardIndex);
    
    // Determine if targeting is needed
    if (card.effect.type === 'damage' || card.effect.type === 'status' || card.effect.type === 'heal') {
      if (card.effect.target === 'single') {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:106',message:'Card requires target selection',data:{cardName:card.name,effectType:card.effect.type,target:card.effect.target,side:card.effect.side},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setSelectedTargetIds([]); // Need to select target
      } else {
        setSelectedTargetIds([]); // All targets, no selection needed
      }
    } else {
      setSelectedTargetIds([]); // No targeting needed
    }
  };

  const handleTargetClick = (uniqueId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:118',message:'handleTargetClick called',data:{uniqueId,selectedCardIndex,hasCurrentCombatant:!!currentCombatant},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (selectedCardIndex === undefined || !currentCombatant) return;
    
    const cardId = currentCombatant.hand[selectedCardIndex];
    if (!cardId) return;
    
    const card = getCardDefinition(cardId);
    if (!card) return;

    // Parse uniqueId to get pokemonId and index
    const [pokemonId, indexStr] = uniqueId.split('-');
    const index = parseInt(indexStr, 10);
    
    // Find target in the appropriate array based on card effect
    let target: PokemonCombatState | undefined;
    if (card.effect.type === 'heal') {
      // Heal targets allies (player party)
      target = battleState.playerParty[index];
    } else if (card.effect.side === 'enemy') {
      // Look in enemies array
      target = battleState.enemies[index];
    } else if (card.effect.side === 'ally') {
      // Look in player party
      target = battleState.playerParty[index];
    }
    
    if (!target || target.pokemonId !== pokemonId || target.currentHp <= 0) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:137',message:'Invalid target',data:{uniqueId,pokemonId,index,found:!!target,hp:target?.currentHp},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Determine valid targets based on card
    if (card.effect.type === 'damage' || card.effect.type === 'status') {
      if (card.effect.side === 'enemy' && !target.playerId) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:145',message:'Target selected - enemy',data:{uniqueId,cardName:card.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setSelectedTargetIds([uniqueId]);
      } else if (card.effect.side === 'ally' && target.playerId) {
        setSelectedTargetIds([uniqueId]);
      }
    } else if (card.effect.type === 'heal') {
      if (target.playerId) {
        setSelectedTargetIds([uniqueId]);
      }
    }
  };

  const handlePlayCard = () => {
    if (selectedCardIndex === undefined || !currentCombatant) return;
    
    const cardId = currentCombatant.hand[selectedCardIndex];
    if (!cardId) return;
    
    const card = getCardDefinition(cardId);
    if (!card) return;

    // Determine targets
    let targetIds: string[] | undefined;
    const needsTarget = (card.effect.type === 'damage' || card.effect.type === 'status' || card.effect.type === 'heal') 
      && card.effect.target === 'single';
    
    if (needsTarget) {
      if (selectedTargetIds.length > 0) {
        // Use the uniqueIds directly - the engine will parse them
        targetIds = selectedTargetIds;
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:170',message:'Using selected target',data:{selectedTargetIds,targetIds,cardName:card.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } else {
        // Don't auto-select - require manual target selection
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:175',message:'Target required but not selected',data:{cardName:card.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return; // Require target selection
      }
    } else if (card.effect.target === 'all') {
      // Multi-target cards don't need explicit target selection
      targetIds = undefined;
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CombatScreen.tsx:180',message:'Playing card',data:{cardId,cardName:card.name,targetIds,selectedTargetIds,effectType:card.effect.type,effectAmount:card.effect.type==='damage'?card.effect.amount:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    onAction({
      type: 'playCard',
      cardId: cardId,
      casterId: currentCombatant.pokemonId,
      targetIds: targetIds, // Pass uniqueIds (format: "pokemonId-index") for precise targeting
    });

    setSelectedCardIndex(undefined);
    setSelectedTargetIds([]);
  };

  const handleEndTurn = () => {
    onAction({ type: 'endTurn' });
    setSelectedCardIndex(undefined);
    setSelectedTargetIds([]);
  };

  if (!currentCombatant) {
    return <div>No active combatant</div>;
  }

  const selectedCardId = selectedCardIndex !== undefined ? currentCombatant.hand[selectedCardIndex] : undefined;
  const selectedCard = selectedCardId ? getCardDefinition(selectedCardId) : undefined;
  const canPlaySelectedCard = selectedCard && currentCombatant.currentMana >= selectedCard.cost;

  const handleResetClick = () => {
    if (onResetGame && window.confirm('Are you sure you want to reset the game? This will clear all progress.')) {
      onResetGame();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Reset Button - Top Right Corner */}
      {onResetGame && (
        <button
          onClick={handleResetClick}
          style={{
            position: 'fixed',
            top: '8px',
            right: '8px',
            zIndex: 1000,
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
        >
          Reset
        </button>
      )}

      {/* Turn Order Bar - Fixed Height */}
      <div style={{ flex: '0 0 auto', padding: '8px 16px', backgroundColor: '#0f172a' }}>
        <TurnOrderBar turnOrder={battleState.turnOrder} currentTurnIndex={battleState.currentTurnIndex} />
      </div>

      {/* Battlefield Section - Horizontal Row */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Section Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>Your Party</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>Enemies</div>
        </div>
        
        {/* Horizontal Pokemon Row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '8px',
            alignItems: 'flex-start',
          }}
        >
          {/* Player Party */}
          {battleState.playerParty.map((pokemon, index) => {
            const needsTarget = selectedCardIndex !== undefined && currentCombatant && (() => {
              const cardId = currentCombatant.hand[selectedCardIndex];
              const card = cardId ? getCardDefinition(cardId) : null;
              return card && (card.effect.type === 'damage' || card.effect.type === 'status' || card.effect.type === 'heal') 
                && card.effect.target === 'single' && ((card.effect.side === 'ally' && card.effect.type !== 'heal') || card.effect.type === 'heal');
            })();
            // Use unique identifier: pokemonId + index to handle duplicates
            const uniqueId = `${pokemon.pokemonId}-${index}`;
            const isSelected = needsTarget && selectedTargetIds.includes(uniqueId);
            return (
              <PokemonDisplay
                key={uniqueId}
                pokemon={pokemon}
                isEnemy={false}
                isCurrentTurn={pokemon.pokemonId === currentCombatant.pokemonId}
                isSelected={isSelected}
                onClick={needsTarget ? () => handleTargetClick(uniqueId) : undefined}
              />
            );
          })}
          
          {/* Visual Separator */}
          {battleState.playerParty.length > 0 && battleState.enemies.length > 0 && (
            <div
              style={{
                width: '2px',
                backgroundColor: '#374151',
                margin: '0 8px',
                alignSelf: 'stretch',
              }}
            />
          )}
          
          {/* Enemies */}
          {battleState.enemies.map((pokemon, index) => {
            const needsTarget = selectedCardIndex !== undefined && currentCombatant && (() => {
              const cardId = currentCombatant.hand[selectedCardIndex];
              const card = cardId ? getCardDefinition(cardId) : null;
              return card && (card.effect.type === 'damage' || card.effect.type === 'status' || card.effect.type === 'heal') 
                && card.effect.target === 'single' && card.effect.side === 'enemy';
            })();
            // Use unique identifier: pokemonId + index to handle duplicates
            const uniqueId = `${pokemon.pokemonId}-${index}`;
            const isSelected = needsTarget && selectedTargetIds.includes(uniqueId);
            return (
              <PokemonDisplay
                key={uniqueId}
                pokemon={pokemon}
                isEnemy={true}
                isCurrentTurn={pokemon.pokemonId === currentCombatant.pokemonId}
                isSelected={isSelected}
                onClick={needsTarget ? () => handleTargetClick(uniqueId) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Hand and Controls - Fixed Height */}
      {isPlayerTurn && currentCombatant && (
        <div
          style={{
            flex: '0 0 auto',
            height: '250px',
            padding: '16px',
            backgroundColor: '#1e293b',
            borderTop: '2px solid #374151',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <div style={{ marginBottom: '12px', flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '4px', fontWeight: 'bold' }}>
                {currentCombatant.playerId}'s Turn - {getPokemonStats(currentCombatant.pokemonId).name}
              </h3>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                Deck: {currentCombatant.deck.length} | Discard: {currentCombatant.discard.length}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              {selectedCardId && canPlaySelectedCard && (
                <button
                  onClick={handlePlayCard}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Play Card
                </button>
              )}
              <button
                onClick={handleEndTurn}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                End Turn
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            <HandDisplay
              pokemon={currentCombatant}
              selectedCardIndex={selectedCardIndex}
              onCardClick={handleCardClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}
