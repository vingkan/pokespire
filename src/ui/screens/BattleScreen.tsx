import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { CombatState, LogEntry, Combatant, Column } from '../../engine/types';
import { getCurrentCombatant } from '../../engine/combat';
import { getMove } from '../../data/loaders';
import { getValidTargets, requiresTargetSelection } from '../../engine/position';
import { calculateDamagePreview } from '../../engine/preview';
import type { DamagePreview } from '../../engine/preview';
import { PokemonSprite } from '../components/PokemonSprite';
import { HandDisplay } from '../components/HandDisplay';
import { TurnOrderBar } from '../components/TurnOrderBar';
import { BattleLog } from '../components/BattleLog';
import { PileViewer } from '../components/PileViewer';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';
import { useBattleEffects, BattleEffectsLayer } from '../components/BattleEffects';
import type { BattlePhase } from '../hooks/useBattle';
import type { RunState } from '../../run/types';
import battleBackground from '../../../assets/backgrounds/rocket_lab_act_1_v4.png';

export type BattleResult = 'victory' | 'defeat';

interface Props {
  state: CombatState;
  phase: BattlePhase;
  logs: LogEntry[];
  pendingCardIndex: number | null;
  onSelectCard: (index: number | null) => void;
  onSelectTarget: (targetId: string) => void;
  onPlayCard?: (cardIndex: number, targetId?: string) => void;
  onEndTurn: () => void;
  onRestart: () => void;
  onBattleEnd?: (result: BattleResult, combatants: Combatant[]) => void;
  runState?: RunState;
}

/** Render a 2-row grid for one side of the battle */
function BattleGrid({
  combatants,
  currentCombatant,
  targetableIds,
  onSelectTarget,
  onInspect,
  side,
  onDragEnterTarget,
  onDragLeaveTarget,
  onDropOnTarget,
  hoveredTargetId,
  damagePreviews,
}: {
  combatants: Combatant[];
  currentCombatant: Combatant | null;
  targetableIds: Set<string>;
  onSelectTarget: (id: string) => void;
  onInspect?: (combatant: Combatant) => void;
  side: 'player' | 'enemy';
  onDragEnterTarget?: (id: string) => void;
  onDragLeaveTarget?: () => void;
  onDropOnTarget?: (id: string) => void;
  hoveredTargetId?: string | null;
  damagePreviews?: Map<string, DamagePreview | null>;
}) {
  const frontRow = combatants.filter(c => c.position.row === 'front');
  const backRow = combatants.filter(c => c.position.row === 'back');

  // Swapped: front row on top, back row on bottom for player
  // Swapped: back row on top, front row on bottom for enemy
  const topRow = side === 'player' ? frontRow : backRow;
  const bottomRow = side === 'player' ? backRow : frontRow;
  const topLabel = side === 'player' ? 'Front' : 'Back';
  const bottomLabel = side === 'player' ? 'Back' : 'Front';

  // Back rows are offset: player's back (bottom) shifts left, enemy's back (top) shifts right
  const topOffset = side === 'enemy' ? 80 : 0;
  const bottomOffset = side === 'player' ? -80 : 0;

  // Tilt: both sides tilt down to the right, creating diagonal depth
  const getTiltOffset = (col: number) => {
    const tiltAmount = 15; // pixels per column
    // Column 0 highest, column 2 lowest (both sides tilt same direction)
    return col * tiltAmount;
  };

  const renderRow = (row: Combatant[], _label: string, offsetX: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'flex-end',
        minHeight: 160,
        transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
      }}>
        {([0, 1, 2] as Column[]).map(col => {
          const combatant = row.find(c => c.position.column === col);
          const tiltY = getTiltOffset(col);
          return (
            <div key={col} style={{
              width: 160,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              transform: `translateY(${tiltY}px)`,
            }}>
              {combatant && (
                <PokemonSprite
                  combatant={combatant}
                  isCurrentTurn={currentCombatant?.id === combatant.id}
                  isTargetable={targetableIds.has(combatant.id)}
                  onSelect={() => onSelectTarget(combatant.id)}
                  onInspect={onInspect ? () => onInspect(combatant) : undefined}
                  onDragEnter={onDragEnterTarget ? () => onDragEnterTarget(combatant.id) : undefined}
                  onDragLeave={onDragLeaveTarget}
                  onDrop={onDropOnTarget ? () => onDropOnTarget(combatant.id) : undefined}
                  isDragHovered={hoveredTargetId === combatant.id}
                  damagePreview={damagePreviews?.get(combatant.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {renderRow(topRow, topLabel, topOffset)}
      {renderRow(bottomRow, bottomLabel, bottomOffset)}
    </div>
  );
}

export function BattleScreen({
  state, phase, logs, pendingCardIndex,
  onSelectCard, onSelectTarget, onPlayCard, onEndTurn, onRestart, onBattleEnd, runState,
}: Props) {
  const isPlayerTurn = phase === 'player_turn';
  const currentCombatant = state.phase === 'ongoing'
    ? getCurrentCombatant(state)
    : null;

  const players = state.combatants.filter(c => c.side === 'player');
  const enemies = state.combatants.filter(c => c.side === 'enemy');

  // Inspection state - track which combatant is being inspected
  const [inspectedCombatantId, setInspectedCombatantId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Find the RunPokemon for an inspected player combatant
  const getRunPokemonForCombatant = (combatant: Combatant) => {
    if (!runState || combatant.side !== 'player') return null;
    // Match by slotIndex (party position)
    return runState.party[combatant.slotIndex] ?? null;
  };

  const inspectedCombatant = inspectedCombatantId
    ? state.combatants.find(c => c.id === inspectedCombatantId) ?? null
    : null;
  const inspectedRunPokemon = inspectedCombatant
    ? getRunPokemonForCombatant(inspectedCombatant)
    : null;

  // Handle Pokemon inspection
  const handleInspect = (combatant: Combatant) => {
    // Only allow inspection of player Pokemon with runState available
    if (combatant.side === 'player' && runState) {
      setInspectedCombatantId(combatant.id);
    }
  };

  const handleCloseInspection = () => {
    setInspectedCombatantId(null);
  };

  // Navigate to a different player Pokemon in inspection
  const handleNavigateInspection = (newIndex: number) => {
    // Find the player combatant at this slot index
    const targetCombatant = players.find(c => c.slotIndex === newIndex);
    if (targetCombatant) {
      setInspectedCombatantId(targetCombatant.id);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = useCallback((cardIndex: number) => {
    if (!isPlayerTurn || !currentCombatant) return;
    setDraggingCardIndex(cardIndex);
    // Clear any pending click selection
    onSelectCard(null);
  }, [isPlayerTurn, currentCombatant, onSelectCard]);

  const handleDragEnd = useCallback(() => {
    setDraggingCardIndex(null);
    setHoveredTargetId(null);
  }, []);

  const handleDragEnterTarget = useCallback((targetId: string) => {
    setHoveredTargetId(targetId);
  }, []);

  const handleDragLeaveTarget = useCallback(() => {
    setHoveredTargetId(null);
  }, []);

  const handleDropOnTarget = useCallback((targetId: string) => {
    if (draggingCardIndex === null || !currentCombatant) return;

    // Directly play the card (bypasses two-step selection to avoid flash of "Select target" message)
    if (onPlayCard) {
      onPlayCard(draggingCardIndex, targetId);
    } else {
      // Fallback to two-step if onPlayCard not provided
      onSelectCard(draggingCardIndex);
      setTimeout(() => onSelectTarget(targetId), 0);
    }

    // Reset drag state
    setDraggingCardIndex(null);
    setHoveredTargetId(null);
  }, [draggingCardIndex, currentCombatant, onPlayCard, onSelectCard, onSelectTarget]);

  // Calculate damage previews for all valid targets when dragging OR when a card is selected
  const { dragTargetableIds, damagePreviews } = useMemo(() => {
    // Show previews for either dragging or click-selected card
    const activeCardIndex = draggingCardIndex ?? pendingCardIndex;

    if (activeCardIndex === null || !isPlayerTurn || !currentCombatant) {
      return { dragTargetableIds: new Set<string>(), damagePreviews: new Map<string, DamagePreview | null>() };
    }

    const cardId = currentCombatant.hand[activeCardIndex];
    const card = getMove(cardId);
    const validTargets = getValidTargets(state, currentCombatant, card.range);

    // Calculate damage preview for each valid target
    const previews = new Map<string, DamagePreview | null>();
    for (const target of validTargets) {
      const preview = calculateDamagePreview(state, currentCombatant, target, card);
      previews.set(target.id, preview);
    }

    return {
      dragTargetableIds: new Set(validTargets.map(t => t.id)),
      damagePreviews: previews,
    };
  }, [draggingCardIndex, pendingCardIndex, isPlayerTurn, currentCombatant, state]);

  // Battle effects for visual feedback
  const battleEffects = useBattleEffects();
  const processedLogsRef = useRef<number>(0);

  // Parse new logs to trigger visual effects
  useEffect(() => {
    const newLogs = logs.slice(processedLogsRef.current);
    processedLogsRef.current = logs.length;

    for (const log of newLogs) {
      // Parse damage: "X takes Y damage" (most common pattern)
      const damageMatch = log.message.match(/takes (\d+)(?: \w+)? damage/i);
      // Also match multi-hit: "is hit X times for Y total damage"
      const multiHitMatch = log.message.match(/is hit \d+ times for (\d+) total damage/i);
      // Also match status damage: "Burn/Poison/Leech deals X damage to Y"
      const statusDamageMatch = log.message.match(/deals (\d+) damage to (\w+)/i);

      if (damageMatch || multiHitMatch) {
        const damage = parseInt(damageMatch?.[1] || multiHitMatch?.[1] || '0');
        // Target is in the log's combatantId
        const target = state.combatants.find(c => c.id === log.combatantId);
        if (target && damage > 0) {
          battleEffects.addEvent({
            type: 'damage',
            targetId: target.id,
            value: damage,
          });
        }
      } else if (statusDamageMatch) {
        const damage = parseInt(statusDamageMatch[1]);
        const targetName = statusDamageMatch[2];
        const target = state.combatants.find(c =>
          c.name.toLowerCase() === targetName.toLowerCase()
        );
        if (target && damage > 0) {
          battleEffects.addEvent({
            type: 'damage',
            targetId: target.id,
            value: damage,
          });
        }
      }

      // Parse heal: "heals X HP" or "drains X HP"
      const healMatch = log.message.match(/(?:heals|drains) (\d+) HP/i);
      if (healMatch) {
        const heal = parseInt(healMatch[1]);
        const target = state.combatants.find(c => c.id === log.combatantId);
        if (target && heal > 0) {
          battleEffects.addEvent({
            type: 'heal',
            targetId: target.id,
            value: heal,
          });
        }
      }

      // Parse block: "gains X Block"
      const blockMatch = log.message.match(/gains (\d+) Block/i);
      if (blockMatch) {
        const block = parseInt(blockMatch[1]);
        const target = state.combatants.find(c => c.id === log.combatantId);
        if (target && block > 0) {
          battleEffects.addEvent({
            type: 'block',
            targetId: target.id,
            value: block,
          });
        }
      }

      // Parse card played: "X plays CardName (cost Y)."
      const cardMatch = log.message.match(/^(\w+) plays (.+?) \(cost/i);
      if (cardMatch) {
        const sourceName = cardMatch[1];
        const cardName = cardMatch[2];
        battleEffects.showCardPlayed(sourceName, cardName);
      }
    }
  }, [logs, state.combatants, battleEffects]);

  // Get approximate screen position for a combatant (for floating numbers)
  const getPositionForCombatant = useCallback((combatantId: string): { x: number; y: number } | null => {
    const combatant = state.combatants.find(c => c.id === combatantId);
    if (!combatant) return null;

    const isPlayer = combatant.side === 'player';
    const col = combatant.position.column;
    const row = combatant.position.row;

    // Approximate positions based on the grid layout
    // These are rough estimates - in a real app we'd use refs
    const centerX = window.innerWidth / 2;
    const colOffset = (col - 1) * 170; // 170px per column
    const sideOffset = isPlayer ? -250 : 250; // player left, enemy right

    const baseY = isPlayer ? 320 : 180;
    const rowOffset = row === 'back' ? (isPlayer ? 60 : -40) : 0;

    return {
      x: centerX + sideOffset + colOffset,
      y: baseY + rowOffset + (col * 15), // account for tilt
    };
  }, [state.combatants]);

  // Calculate targetable combatants based on pending card's range
  const { needsTarget, targetableIds, rangeLabel } = useMemo(() => {
    if (pendingCardIndex === null || !isPlayerTurn || !currentCombatant) {
      return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: '' };
    }

    const cardId = currentCombatant.hand[pendingCardIndex];
    const card = getMove(cardId);
    const validTargets = getValidTargets(state, currentCombatant, card.range);

    // Check if this range requires manual target selection
    if (!requiresTargetSelection(card.range)) {
      // AoE or self - no target needed, auto-play
      return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: '' };
    }

    // Auto-select if only one valid target
    if (validTargets.length === 1) {
      // Will be handled in useEffect or callback
      return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: '' };
    }

    if (validTargets.length === 0) {
      return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: 'No valid targets!' };
    }

    // Create label based on range
    let label = 'Select a target';
    if (card.range === 'front_enemy') label = 'Select front row target';
    else if (card.range === 'back_enemy') label = 'Select back row target';
    else if (card.range === 'column') label = 'Select target (hits column)';

    return {
      needsTarget: true,
      targetableIds: new Set(validTargets.map(t => t.id)),
      rangeLabel: label,
    };
  }, [pendingCardIndex, isPlayerTurn, currentCombatant, state]);

  // Handle auto-target selection for single valid target or AoE
  useEffect(() => {
    if (pendingCardIndex === null || !isPlayerTurn || !currentCombatant) return;

    const cardId = currentCombatant.hand[pendingCardIndex];
    const card = getMove(cardId);
    const validTargets = getValidTargets(state, currentCombatant, card.range);

    // AoE or self - auto-play without target
    if (!requiresTargetSelection(card.range)) {
      onSelectTarget('');
      return;
    }

    // Auto-select if only one valid target
    if (validTargets.length === 1) {
      onSelectTarget(validTargets[0].id);
    }
  }, [pendingCardIndex, isPlayerTurn, currentCombatant, state, onSelectTarget]);

  const handleCardClick = (index: number) => {
    if (!isPlayerTurn) return;
    if (pendingCardIndex === index) {
      onSelectCard(null); // deselect
    } else {
      onSelectCard(index);
    }
  };

  const gameOver = phase === 'victory' || phase === 'defeat';

  // Track if we've already called onBattleEnd for this game over state
  const battleEndCalledRef = useRef(false);

  // Call onBattleEnd when battle ends
  useEffect(() => {
    if (gameOver && onBattleEnd && !battleEndCalledRef.current) {
      battleEndCalledRef.current = true;
      const result: BattleResult = phase === 'victory' ? 'victory' : 'defeat';
      onBattleEnd(result, state.combatants);
    }
    // Reset ref when game is not over (for next battle)
    if (!gameOver) {
      battleEndCalledRef.current = false;
    }
  }, [gameOver, phase, state.combatants, onBattleEnd]);

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      backgroundImage: `url(${battleBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 72%',
      color: '#e2e8f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Top bar: turn order + reset */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(18, 18, 26, 0.4)',
        padding: 8,
        zIndex: 10,
      }}>
        <div style={{ flex: 1 }}>
          <TurnOrderBar state={state} />
        </div>
        <button
          onClick={onRestart}
          style={{
            padding: '6px 14px',
            fontSize: 15,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '1px solid #555',
            background: '#333',
            color: '#ccc',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginRight: 8,
          }}
        >
          Reset
        </button>
      </div>

      {/* Targeting hint */}
      {needsTarget && (
        <div style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: 8,
          background: '#ef444433',
          color: '#fca5a5',
          fontSize: 15,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          {rangeLabel}
          <button
            onClick={() => onSelectCard(null)}
            style={{
              marginLeft: 12,
              padding: '2px 8px',
              background: '#333',
              border: '1px solid #555',
              color: '#ccc',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Battlefield - Grid Layout */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        bottom: 200,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 20,
        padding: '16px 16px 8px 16px',
      }}>
        {/* Player side */}
        <div style={{ transform: 'translateY(-150px)' }}>
          <BattleGrid
            combatants={players}
            currentCombatant={currentCombatant}
            targetableIds={new Set()} // Players targeting allies not implemented yet
            onSelectTarget={onSelectTarget}
            onInspect={runState ? handleInspect : undefined}
            side="player"
            // No drag targeting for player side (yet)
          />
        </div>

        {/* VS divider */}
        <div style={{
          fontSize: 26,
          fontWeight: 'bold',
          color: '#facc1555',
        }}>
          VS
        </div>

        {/* Enemy side */}
        <div style={{ transform: 'translateY(-370px)' }}>
          <BattleGrid
            combatants={enemies}
            currentCombatant={currentCombatant}
            targetableIds={dragTargetableIds.size > 0 ? dragTargetableIds : targetableIds}
            onSelectTarget={onSelectTarget}
            side="enemy"
            onDragEnterTarget={handleDragEnterTarget}
            onDragLeaveTarget={handleDragLeaveTarget}
            onDropOnTarget={handleDropOnTarget}
            hoveredTargetId={hoveredTargetId}
            damagePreviews={damagePreviews}
          />
        </div>

        {/* Battle effects layer (floating numbers, card announcements) */}
        <BattleEffectsLayer
          events={battleEffects.events}
          cardBanner={battleEffects.cardBanner}
          getPositionForCombatant={getPositionForCombatant}
          onEventComplete={battleEffects.removeEvent}
          onBannerComplete={battleEffects.clearCardBanner}
        />

        {/* Game over overlay */}
        {gameOver && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            gap: 16,
          }}>
            <div style={{
              fontSize: 52,
              fontWeight: 'bold',
              color: phase === 'victory' ? '#facc15' : '#ef4444',
            }}>
              {phase === 'victory' ? 'VICTORY!' : 'DEFEAT'}
            </div>
            <button
              onClick={onRestart}
              style={{
                padding: '12px 32px',
                fontSize: 17,
                fontWeight: 'bold',
                borderRadius: 8,
                border: 'none',
                background: '#facc15',
                color: '#000',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom panel: hand + controls + log */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: '1px solid #222',
        background: 'rgba(18, 18, 26, 0.4)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 10,
      }}>
        {/* Enemy thinking indicator */}
        {phase === 'enemy_turn' && (
          <div style={{
            textAlign: 'center',
            fontSize: 15,
            color: '#fca5a5',
            fontWeight: 'bold',
          }}>
            Enemy is thinking...
          </div>
        )}

        {/* Hand + pile viewer (only during player turn) */}
        {isPlayerTurn && currentCombatant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            {/* Energy + Pile viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'rgba(96, 165, 250, 0.2)',
                borderRadius: 8,
                border: '1px solid #60a5fa',
              }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ fontSize: 20, fontWeight: 'bold', color: '#60a5fa' }}>
                  {currentCombatant.energy}
                </span>
              </div>
              <PileViewer combatant={currentCombatant} />
            </div>
            <HandDisplay
              combatant={currentCombatant}
              selectedIndex={pendingCardIndex}
              onSelectCard={handleCardClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              draggingIndex={draggingCardIndex}
            />
            <button
              onClick={onEndTurn}
              style={{
                padding: '10px 20px',
                fontSize: 15,
                fontWeight: 'bold',
                borderRadius: 8,
                border: '2px solid #facc15',
                background: 'transparent',
                color: '#facc15',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              End Turn
            </button>
          </div>
        )}

        {/* Battle log */}
        <BattleLog logs={logs} />
      </div>

      {/* Pokemon inspection panel */}
      {inspectedRunPokemon && inspectedCombatant && runState && (
        <PokemonDetailsPanel
          pokemon={inspectedRunPokemon}
          pokemonIndex={inspectedCombatant.slotIndex}
          partySize={runState.party.length}
          onClose={handleCloseInspection}
          onNavigate={handleNavigateInspection}
          readOnly
        />
      )}
    </div>
  );
}
