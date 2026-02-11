import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { CombatState, LogEntry, Combatant, Column, MoveRange } from '../../engine/types';
import { getCurrentCombatant } from '../../engine/combat';
import { getMove, MOVES } from '../../data/loaders';
import { getValidTargets, requiresTargetSelection, isAoERange } from '../../engine/position';
import { calculateDamagePreview } from '../../engine/preview';
import type { DamagePreview } from '../../engine/preview';
import { PokemonSprite } from '../components/PokemonSprite';
import { HandDisplay, type HandDisplayRef } from '../components/HandDisplay';
import { TurnOrderBar } from '../components/TurnOrderBar';
import { BattleLog } from '../components/BattleLog';
import { PileButton } from '../components/PileButton';
import { PileModal } from '../components/PileModal';
import { EnergyPips } from '../components/EnergyPips';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';
import { useBattleEffects, BattleEffectsLayer } from '../components/BattleEffects';
import type { BattlePhase } from '../hooks/useBattle';
import type { RunState } from '../../run/types';
import { getBattleSpriteScale } from '../../data/heights';
import { THEME } from '../theme';
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
  onBackToSandboxConfig?: () => void;  // Only present in sandbox mode
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
  hoveredTargetIds,
  damagePreviews,
  spriteScale,
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
  hoveredTargetIds?: Set<string>;
  damagePreviews?: Map<string, DamagePreview | null>;
  spriteScale: number;
}) {
  const frontRow = combatants.filter(c => c.position.row === 'front');
  const backRow = combatants.filter(c => c.position.row === 'back');

  // Layout: 3×2 CSS grid — 3 position rows, 2 depth columns (front/back).
  // CSS Grid ensures each row shares height across both columns, so a back-row
  // Pokemon at column N always aligns vertically with front-row column N.
  // Player: back row on LEFT, front row on RIGHT (front faces enemy)
  // Enemy: front row on LEFT (faces player), back row on RIGHT
  const leftCol = side === 'player' ? backRow : frontRow;
  const rightCol = side === 'player' ? frontRow : backRow;

  // Front row renders on top (z-index) for depth layering
  const leftZIndex = side === 'player' ? 1 : 2;
  const rightZIndex = side === 'player' ? 2 : 1;

  // Tilt: horizontal offset per column slot for isometric depth
  // Both sides tilt the same direction (down-right) so the diagonals match
  const TILT_PX = 36; // pixels per slot

  const SLOT_GAP = 4; // vertical gap between Pokemon in same position
  const ROW_GAP = 50; // horizontal gap between front and back columns

  const renderCell = (combatant: Combatant | undefined, zIndex: number, tiltX: number) => (
    <div style={{
      transform: `translateX(${tiltX}px)`,
      position: 'relative',
      zIndex,
      display: 'flex',
      justifyContent: 'center',
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
          isDragHovered={hoveredTargetIds?.has(combatant.id) ?? false}
          damagePreview={damagePreviews?.get(combatant.id)}
          spriteScale={spriteScale}
        />
      )}
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      gridTemplateRows: 'repeat(3, auto)',
      columnGap: ROW_GAP,
      rowGap: SLOT_GAP,
    }}>
      {([0, 1, 2] as Column[]).flatMap(col => {
        const leftCombatant = leftCol.find(c => c.position.column === col);
        const rightCombatant = rightCol.find(c => c.position.column === col);
        const tiltX = col * TILT_PX;
        return [
          <div key={`${col}-l`}>{renderCell(leftCombatant, leftZIndex, tiltX)}</div>,
          <div key={`${col}-r`}>{renderCell(rightCombatant, rightZIndex, tiltX)}</div>,
        ];
      })}
    </div>
  );
}

export function BattleScreen({
  state, phase, logs, pendingCardIndex,
  onSelectCard, onSelectTarget, onPlayCard, onEndTurn, onRestart, onBattleEnd, runState,
  onBackToSandboxConfig,
}: Props) {
  const isPlayerTurn = phase === 'player_turn';
  const currentCombatant = state.phase === 'ongoing'
    ? getCurrentCombatant(state)
    : null;

  const players = state.combatants.filter(c => c.side === 'player');
  const enemies = state.combatants.filter(c => c.side === 'enemy');

  // Compute global sprite scale: if any Pokemon exceeds the cap, ALL scale down proportionally
  const spriteScale = useMemo(
    () => getBattleSpriteScale(state.combatants.map(c => c.pokemonId)),
    [state.combatants],
  );

  // Inspection state - track which combatant is being inspected
  const [inspectedCombatantId, setInspectedCombatantId] = useState<string | null>(null);

  // Pile viewer state
  const [openPile, setOpenPile] = useState<'draw' | 'discard' | 'vanished' | null>(null);
  const togglePile = (pile: 'draw' | 'discard' | 'vanished') => {
    setOpenPile(prev => prev === pile ? null : pile);
  };

  // Clear open pile when active combatant changes
  useEffect(() => {
    setOpenPile(null);
  }, [currentCombatant?.id]);

  // Drag-and-drop state
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Battlefield scaling: measure the content and scale to fit the available area
  const PLAYER_OFFSET_Y = 60; // player grid pushed down relative to enemy
  const battlefieldContentRef = useRef<HTMLDivElement>(null);
  const battlefieldContainerRef = useRef<HTMLDivElement>(null);
  const [battlefieldScale, setBattlefieldScale] = useState(1);

  useEffect(() => {
    const content = battlefieldContentRef.current;
    const container = battlefieldContainerRef.current;
    if (!content || !container) return;

    // Reset scale to 1 so we measure natural size
    content.style.transform = 'none';
    const contentHeight = content.scrollHeight + PLAYER_OFFSET_Y;
    const contentWidth = content.scrollWidth;
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    const scale = Math.min(1, availableHeight / contentHeight, availableWidth / contentWidth);
    setBattlefieldScale(scale);
    content.style.transform = scale < 1 ? `scale(${scale})` : 'none';
  });

  // Ref to hand display for capturing card positions
  const handDisplayRef = useRef<HandDisplayRef>(null);

  // Battle effects for visual feedback (moved up to be available in handlers)
  const battleEffects = useBattleEffects();
  const processedLogsRef = useRef<number>(0);

  // Status diff tracking: detect new/increased statuses by comparing snapshots
  type StatusSnapshot = Map<string, Map<string, number>>; // combatantId → (statusType → stacks)
  const prevStatusRef = useRef<StatusSnapshot>(new Map());

  // Get screen position for a combatant (for floating numbers and card fly animations)
  // Uses actual DOM element positions via data-sprite-id attributes for accuracy
  const getPositionForCombatant = useCallback((combatantId: string): { x: number; y: number } | null => {
    // Try to get actual DOM position from the sprite element
    const spriteEl = document.querySelector(`[data-sprite-id="${combatantId}"]`);
    if (spriteEl) {
      const rect = spriteEl.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    // Fallback to approximate calculation if DOM element not found
    const combatant = state.combatants.find(c => c.id === combatantId);
    if (!combatant) return null;

    const isPlayer = combatant.side === 'player';
    const col = combatant.position.column;
    const row = combatant.position.row;

    const centerX = window.innerWidth / 2;
    const colOffset = (col - 1) * 170;
    const sideOffset = isPlayer ? -250 : 250;

    const baseY = isPlayer ? 320 : 180;
    const rowOffset = row === 'back' ? (isPlayer ? 60 : -40) : 0;

    return {
      x: centerX + sideOffset + colOffset,
      y: baseY + rowOffset + (col * 15),
    };
  }, [state.combatants]);

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

  // Handle Pokemon inspection (both player and enemy)
  const handleInspect = (combatant: Combatant) => {
    setInspectedCombatantId(combatant.id);
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

    // Capture card position BEFORE playing
    const cardPos = handDisplayRef.current?.getCardPosition(draggingCardIndex);
    const cardId = currentCombatant.hand[draggingCardIndex];
    const card = getMove(cardId);

    // Determine which targets to animate to based on card range
    let targetPositions: { x: number; y: number }[] = [];
    if (isAoERange(card.range)) {
      // AoE: resolve actual hit targets based on selected target's position
      const aliveEnemies = state.combatants.filter(c => c.alive && c.side !== currentCombatant.side);
      const selectedTarget = aliveEnemies.find(e => e.id === targetId);
      let actualTargets: typeof aliveEnemies;

      if (card.range === 'column' && selectedTarget) {
        actualTargets = aliveEnemies.filter(c => c.position.column === selectedTarget.position.column);
      } else if (card.range === 'any_row' && selectedTarget) {
        actualTargets = aliveEnemies.filter(c => c.position.row === selectedTarget.position.row);
      } else {
        actualTargets = getValidTargets(state, currentCombatant, card.range);
      }

      targetPositions = actualTargets
        .map(t => getPositionForCombatant(t.id))
        .filter((p): p is { x: number; y: number } => p !== null);
    } else {
      // Single target: animate only to the selected target
      const pos = getPositionForCombatant(targetId);
      if (pos) targetPositions = [pos];
    }

    // Check if this is a pure block/defend card (no damage effects)
    const hasDamage = card.effects.some(e => ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko', 'set_damage', 'percent_hp'].includes(e.type));
    const isBlockCard = !hasDamage && card.effects.some(e => e.type === 'block');

    // Trigger card fly animation if we have positions
    if (cardPos && targetPositions.length > 0) {
      battleEffects.triggerCardFly({
        cardName: card.name,
        cardType: card.type,
        startPos: cardPos,
        targetPositions,
        isBlockCard,
      });
    }

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
  }, [draggingCardIndex, currentCombatant, onPlayCard, onSelectCard, onSelectTarget, state, battleEffects, getPositionForCombatant]);

  // Calculate damage previews for all valid targets when dragging OR when a card is selected
  const { dragTargetableIds, damagePreviews, activeCardRange } = useMemo(() => {
    // Show previews for either dragging or click-selected card
    const activeCardIndex = draggingCardIndex ?? pendingCardIndex;

    if (activeCardIndex === null || !isPlayerTurn || !currentCombatant) {
      return { dragTargetableIds: new Set<string>(), damagePreviews: new Map<string, DamagePreview | null>(), activeCardRange: undefined as MoveRange | undefined };
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
      activeCardRange: card.range,
    };
  }, [draggingCardIndex, pendingCardIndex, isPlayerTurn, currentCombatant, state]);

  // For AoE cards, expand hover highlighting to all targets that would be hit
  const { affectedHoverIds, visibleDamagePreviews } = useMemo(() => {
    if (!hoveredTargetId) {
      return { affectedHoverIds: new Set<string>(), visibleDamagePreviews: damagePreviews };
    }

    const hoveredTarget = state.combatants.find(c => c.id === hoveredTargetId);
    if (!hoveredTarget) {
      return { affectedHoverIds: new Set([hoveredTargetId]), visibleDamagePreviews: damagePreviews };
    }

    const enemies = state.combatants.filter(c => c.alive && c.side === 'enemy');
    let affectedIds: Set<string>;

    if (activeCardRange === 'column') {
      affectedIds = new Set(enemies.filter(c => c.position.column === hoveredTarget.position.column).map(c => c.id));
    } else if (activeCardRange === 'any_row') {
      affectedIds = new Set(enemies.filter(c => c.position.row === hoveredTarget.position.row).map(c => c.id));
    } else if (activeCardRange === 'front_row' || activeCardRange === 'back_row' || activeCardRange === 'all_enemies') {
      // All valid targets are affected
      affectedIds = dragTargetableIds;
    } else {
      affectedIds = new Set([hoveredTargetId]);
    }

    // Filter damage previews to only affected targets
    const filtered = new Map<string, DamagePreview | null>();
    for (const id of affectedIds) {
      if (damagePreviews.has(id)) {
        filtered.set(id, damagePreviews.get(id)!);
      }
    }

    return { affectedHoverIds: affectedIds, visibleDamagePreviews: filtered };
  }, [hoveredTargetId, activeCardRange, state.combatants, damagePreviews, dragTargetableIds]);

  // Parse new logs to trigger visual effects
  useEffect(() => {
    const newLogs = logs.slice(processedLogsRef.current);
    processedLogsRef.current = logs.length;

    for (let i = 0; i < newLogs.length; i++) {
      const log = newLogs[i];

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
      const cardMatch = log.message.match(/^(.+?) plays (.+?) \(cost/i);
      if (cardMatch) {
        const sourceName = cardMatch[1];
        const cardName = cardMatch[2];
        battleEffects.showCardPlayed(sourceName, cardName);

        // For enemy cards, trigger card fly animation
        const source = state.combatants.find(c => c.id === log.combatantId);
        if (source && source.side === 'enemy') {
          const sourcePos = getPositionForCombatant(source.id);
          if (sourcePos) {
            // Look up card definition by name for type/effects info
            const cardDef = Object.values(MOVES).find(m => m.name === cardName);
            const hasDamage = cardDef?.effects.some(e => ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko', 'set_damage', 'percent_hp'].includes(e.type)) ?? false;
            const isBlockCard = !hasDamage && (cardDef?.effects.some(e => e.type === 'block') ?? false);
            const cardType = cardDef?.type ?? 'normal';

            if (isBlockCard) {
              // Shield animation at enemy's own position (no beam)
              battleEffects.triggerCardFly({
                cardName,
                cardType,
                startPos: sourcePos,
                targetPositions: [sourcePos],
                isBlockCard: true,
              });
            } else {
              // Attack: scan ahead for damage targets in this batch
              const targetIds = new Set<string>();
              for (let j = i + 1; j < newLogs.length; j++) {
                const futureLog = newLogs[j];
                // Stop at next card play
                if (futureLog.message.match(/plays .+? \(cost/i)) break;
                // Collect damage target combatant IDs
                if (futureLog.message.match(/takes \d+.*damage/i) && futureLog.combatantId) {
                  targetIds.add(futureLog.combatantId);
                }
              }

              const targetPositions = [...targetIds]
                .map(id => getPositionForCombatant(id))
                .filter((p): p is { x: number; y: number } => p !== null);

              if (targetPositions.length > 0) {
                battleEffects.triggerCardFly({
                  cardName,
                  cardType,
                  startPos: sourcePos,
                  targetPositions,
                  isBlockCard: false,
                });
              }
            }
          }
        }
      }

    }
  }, [logs, state.combatants, battleEffects, getPositionForCombatant]);

  // Detect status changes via state diffing (handles ALL sources: moves, passives, etc.)
  useEffect(() => {
    const currentSnapshot: StatusSnapshot = new Map();
    for (const c of state.combatants) {
      const statusMap = new Map<string, number>();
      for (const s of c.statuses) {
        statusMap.set(s.type, s.stacks);
      }
      currentSnapshot.set(c.id, statusMap);
    }

    const prev = prevStatusRef.current;
    // Only diff if we have a previous snapshot (skip initial render)
    if (prev.size > 0) {
      for (const c of state.combatants) {
        const prevStatuses = prev.get(c.id);
        const currStatuses = currentSnapshot.get(c.id)!;

        for (const [statusType, stacks] of currStatuses) {
          const prevStacks = prevStatuses?.get(statusType) ?? 0;
          if (stacks > prevStacks) {
            // New status or stacks increased — fire animation
            battleEffects.triggerStatusApplied({
              targetId: c.id,
              statusType,
              stacks: stacks - prevStacks,
            });
          }
        }
      }
    }

    prevStatusRef.current = currentSnapshot;
  }, [state.combatants, battleEffects]);

  // Calculate targetable combatants based on pending card's range
  const { needsTarget, targetableIds, rangeLabel } = useMemo(() => {
    if (pendingCardIndex === null || !isPlayerTurn || !currentCombatant) {
      return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: '' };
    }

    const cardId = currentCombatant.hand[pendingCardIndex];
    const card = getMove(cardId);
    const validTargets = getValidTargets(state, currentCombatant, card.range);

    // Check if this range requires manual target selection
    if (!requiresTargetSelection(card.range, currentCombatant)) {
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

  // Wrapper to trigger card fly animation before selecting target (click-to-play path)
  const triggerCardFlyAndSelectTarget = useCallback((targetId: string) => {
    if (pendingCardIndex === null || !currentCombatant) {
      onSelectTarget(targetId);
      return;
    }

    // Capture card position BEFORE playing
    const cardPos = handDisplayRef.current?.getCardPosition(pendingCardIndex);
    const cardId = currentCombatant.hand[pendingCardIndex];
    const card = getMove(cardId);

    // Determine which targets to animate to based on card range
    let targetPositions: { x: number; y: number }[] = [];
    if (isAoERange(card.range)) {
      // AoE: resolve actual hit targets based on selected target's position
      const enemies = state.combatants.filter(c => c.alive && c.side !== currentCombatant.side);
      const selectedTarget = enemies.find(e => e.id === targetId);
      let actualTargets: typeof enemies;

      if (card.range === 'column' && selectedTarget) {
        // Column: enemies in same column as selected target
        actualTargets = enemies.filter(c => c.position.column === selectedTarget.position.column);
      } else if (card.range === 'any_row' && selectedTarget) {
        // Row: enemies in same row as selected target
        actualTargets = enemies.filter(c => c.position.row === selectedTarget.position.row);
      } else {
        // front_row, back_row, all_enemies: use getValidTargets directly
        actualTargets = getValidTargets(state, currentCombatant, card.range);
      }

      targetPositions = actualTargets
        .map(t => getPositionForCombatant(t.id))
        .filter((p): p is { x: number; y: number } => p !== null);
    } else if (card.range === 'self') {
      // Self-targeting: animate to self
      const pos = getPositionForCombatant(currentCombatant.id);
      if (pos) targetPositions = [pos];
    } else if (targetId) {
      // Single target: animate only to the selected target
      const pos = getPositionForCombatant(targetId);
      if (pos) targetPositions = [pos];
    }

    // Check if this is a pure block/defend card (no damage effects)
    const hasDamage = card.effects.some(e => ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko', 'set_damage', 'percent_hp'].includes(e.type));
    const isBlockCard = !hasDamage && card.effects.some(e => e.type === 'block');

    // Trigger card fly animation if we have positions
    if (cardPos && targetPositions.length > 0) {
      battleEffects.triggerCardFly({
        cardName: card.name,
        cardType: card.type,
        startPos: cardPos,
        targetPositions,
        isBlockCard,
      });
    }

    onSelectTarget(targetId);
  }, [pendingCardIndex, currentCombatant, state, battleEffects, getPositionForCombatant, onSelectTarget]);

  // Handle auto-target selection for single valid target or AoE
  useEffect(() => {
    if (pendingCardIndex === null || !isPlayerTurn || !currentCombatant) return;

    const cardId = currentCombatant.hand[pendingCardIndex];
    const card = getMove(cardId);
    const validTargets = getValidTargets(state, currentCombatant, card.range);

    // AoE or self - auto-play without target
    if (!requiresTargetSelection(card.range, currentCombatant)) {
      triggerCardFlyAndSelectTarget('');
      return;
    }

    // Auto-select if only one valid target
    if (validTargets.length === 1) {
      triggerCardFlyAndSelectTarget(validTargets[0].id);
    }
  }, [pendingCardIndex, isPlayerTurn, currentCombatant, state, triggerCardFlyAndSelectTarget]);

  const handleCardClick = (index: number) => {
    if (!isPlayerTurn) return;
    if (pendingCardIndex === index) {
      onSelectCard(null); // deselect
    } else {
      onSelectCard(index);
    }
  };

  const gameOver = phase === 'victory' || phase === 'defeat';

  // Victory celebration stages: 'celebrating' -> 'draft_message' -> 'transitioning'
  const [victoryStage, setVictoryStage] = useState<'celebrating' | 'draft_message' | 'transitioning' | null>(null);

  // Track if we've already called onBattleEnd for this game over state
  const battleEndCalledRef = useRef(false);

  // Handle victory celebration sequence
  useEffect(() => {
    if (phase === 'victory' && victoryStage === null) {
      setVictoryStage('celebrating');
    }
    // Reset when not in victory
    if (phase !== 'victory') {
      setVictoryStage(null);
    }
  }, [phase, victoryStage]);

  // Progress through victory stages
  useEffect(() => {
    if (victoryStage === 'celebrating') {
      const timer = setTimeout(() => setVictoryStage('draft_message'), 2000);
      return () => clearTimeout(timer);
    }
    if (victoryStage === 'draft_message') {
      const timer = setTimeout(() => setVictoryStage('transitioning'), 1800);
      return () => clearTimeout(timer);
    }
    if (victoryStage === 'transitioning' && onBattleEnd && !battleEndCalledRef.current) {
      battleEndCalledRef.current = true;
      onBattleEnd('victory', state.combatants);
    }
  }, [victoryStage, onBattleEnd, state.combatants]);

  // Handle defeat immediately (no celebration needed)
  useEffect(() => {
    if (phase === 'defeat' && onBattleEnd && !battleEndCalledRef.current) {
      battleEndCalledRef.current = true;
      onBattleEnd('defeat', state.combatants);
    }
    // Reset ref when game is not over (for next battle)
    if (!gameOver) {
      battleEndCalledRef.current = false;
    }
  }, [gameOver, phase, state.combatants, onBattleEnd]);

  return (
    <div style={{
      position: 'relative',
      height: '100dvh',
      backgroundImage: `url(${battleBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 72%',
      color: THEME.text.primary,
      fontFamily: "'Kreon', Georgia, serif",
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
        background: 'transparent',
        padding: 8,
        zIndex: 10,
      }}>
        <div style={{ flex: 1 }}>
          <TurnOrderBar state={state} />
        </div>
        {onBackToSandboxConfig && (
          <button
            onClick={onBackToSandboxConfig}
            style={{
              ...THEME.button.secondary,
              padding: '6px 14px',
              fontSize: 14,
              whiteSpace: 'nowrap',
              marginRight: 8,
            }}
          >
            ← Config
          </button>
        )}
        <button
          onClick={onRestart}
          style={{
            ...THEME.button.secondary,
            padding: '6px 14px',
            fontSize: 14,
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
          background: THEME.status.damage + '25',
          color: '#fca5a5',
          fontSize: 15,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          {rangeLabel}
          <button
            onClick={() => onSelectCard(null)}
            style={{
              ...THEME.button.secondary,
              marginLeft: 12,
              padding: '2px 8px',
              fontSize: 15,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Battlefield - Grid Layout */}
      <div ref={battlefieldContainerRef} style={{
        position: 'absolute',
        top: 20,
        left: 260,
        right: 0,
        bottom: 150,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Scaling wrapper: scales both grids together to fit the available area */}
        <div ref={battlefieldContentRef} style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
          transform: battlefieldScale < 1 ? `scale(${battlefieldScale})` : undefined,
          transformOrigin: 'center center',
        }}>
        {/* Player side - shifted down so top Pokemon sit below enemy's top */}
        <div style={{ transform: `translateY(${PLAYER_OFFSET_Y}px)` }}>
          <BattleGrid
            combatants={players}
            currentCombatant={currentCombatant}
            targetableIds={new Set()} // Players targeting allies not implemented yet
            onSelectTarget={triggerCardFlyAndSelectTarget}
            onInspect={handleInspect}
            side="player"
            spriteScale={spriteScale}
            // No drag targeting for player side (yet)
          />
        </div>

        {/* VS divider */}
        <div style={{
          fontSize: 26,
          fontWeight: 'bold',
          color: THEME.accent + '44',
        }}>
          VS
        </div>

        {/* Enemy side */}
        <div>
          <BattleGrid
            combatants={enemies}
            currentCombatant={currentCombatant}
            targetableIds={dragTargetableIds.size > 0 ? dragTargetableIds : targetableIds}
            onSelectTarget={triggerCardFlyAndSelectTarget}
            onInspect={handleInspect}
            side="enemy"
            spriteScale={spriteScale}
            onDragEnterTarget={handleDragEnterTarget}
            onDragLeaveTarget={handleDragLeaveTarget}
            onDropOnTarget={handleDropOnTarget}
            hoveredTargetIds={affectedHoverIds}
            damagePreviews={visibleDamagePreviews}
          />
        </div>
        </div>{/* end scaling wrapper */}

        {/* Victory celebration overlay */}
        {phase === 'victory' && victoryStage && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            gap: 24,
          }}>
            {/* Victory text with animation */}
            <div style={{
              fontSize: victoryStage === 'celebrating' ? 64 : 48,
              fontWeight: 'bold',
              color: THEME.accent,
              textShadow: '0 0 20px rgba(250, 204, 21, 0.6), 0 0 40px rgba(250, 204, 21, 0.4)',
              animation: victoryStage === 'celebrating' ? 'victoryPulse 0.6s ease-in-out infinite alternate' : 'none',
              transition: 'font-size 0.3s ease',
            }}>
              VICTORY!
            </div>

            {/* Sparkle effects during celebration */}
            {victoryStage === 'celebrating' && (
              <div style={{
                display: 'flex',
                gap: 16,
                fontSize: 32,
                animation: 'sparkle 0.8s ease-in-out infinite',
              }}>
                <span style={{ animationDelay: '0s' }}>✦</span>
                <span style={{ animationDelay: '0.2s' }}>✧</span>
                <span style={{ animationDelay: '0.4s' }}>✦</span>
              </div>
            )}

            {/* Draft message */}
            {(victoryStage === 'draft_message' || victoryStage === 'transitioning') && (
              <div style={{
                fontSize: 24,
                color: '#a5f3fc',
                fontWeight: 500,
                textAlign: 'center',
                animation: 'fadeSlideIn 0.5s ease-out',
                textShadow: '0 0 10px rgba(165, 243, 252, 0.4)',
              }}>
                Choose a new card for each Pokemon!
              </div>
            )}

            {/* CSS animations */}
            <style>{`
              @keyframes victoryPulse {
                from { transform: scale(1); }
                to { transform: scale(1.08); }
              }
              @keyframes sparkle {
                0%, 100% { opacity: 0.4; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.2); }
              }
              @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}

        {/* Defeat overlay */}
        {phase === 'defeat' && (
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
              color: THEME.status.damage,
            }}>
              DEFEAT
            </div>
            <button
              onClick={onRestart}
              style={{
                padding: '12px 32px',
                fontSize: 17,
                fontWeight: 'bold',
                borderRadius: 8,
                border: 'none',
                background: THEME.accent,
                color: '#000',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Battle effects layer - full screen overlay for correct viewport positioning */}
      <BattleEffectsLayer
        events={battleEffects.events}
        cardBanner={battleEffects.cardBanner}
        cardFlyEvents={battleEffects.cardFlyEvents}
        statusAppliedEvents={battleEffects.statusAppliedEvents}
        getPositionForCombatant={getPositionForCombatant}
        onEventComplete={battleEffects.removeEvent}
        onBannerComplete={battleEffects.clearCardBanner}
        onCardFlyComplete={battleEffects.removeCardFlyEvent}
        onStatusAppliedComplete={battleEffects.removeStatusAppliedEvent}
      />

      {/* Battle log - left side column */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 0,
        bottom: 0,
        width: 260,
        padding: 8,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <BattleLog logs={logs} />
      </div>

      {/* Bottom panel: hand + controls */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 260,
        right: 0,
        borderTop: '1px solid ' + THEME.border.subtle,
        background: THEME.chrome.backdrop,
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

        {/* Flow layout: Deck → Hand → Energy+EndTurn → Discard → Vanished */}
        {isPlayerTurn && currentCombatant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            {/* Deck button (left) */}
            <PileButton
              label="Deck"
              count={currentCombatant.drawPile.length}
              isActive={openPile === 'draw'}
              onClick={() => togglePile('draw')}
            />

            {/* Hand cards (center) */}
            <HandDisplay
              ref={handDisplayRef}
              combatant={currentCombatant}
              selectedIndex={pendingCardIndex}
              onSelectCard={handleCardClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              draggingIndex={draggingCardIndex}
            />

            {/* Energy vessel + End Turn (right of hand) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <EnergyPips energy={currentCombatant.energy} energyCap={currentCombatant.energyCap} variant="vessel" />
              <button
                onClick={onEndTurn}
                style={{
                  ...THEME.button.primary,
                  padding: '8px 18px',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                End Turn
              </button>
            </div>

            {/* Discard button */}
            <PileButton
              label="Discard"
              count={currentCombatant.discardPile.length}
              isActive={openPile === 'discard'}
              onClick={() => togglePile('discard')}
            />

            {/* Vanished button (conditional) */}
            {currentCombatant.vanishedPile.length > 0 && (
              <PileButton
                label="Vanished"
                count={currentCombatant.vanishedPile.length}
                isActive={openPile === 'vanished'}
                onClick={() => togglePile('vanished')}
              />
            )}
          </div>
        )}
      </div>

      {/* Pile modal (rendered outside bottom panel for correct overlay stacking) */}
      {openPile && currentCombatant && (() => {
        let cards: string[] = [];
        let title = '';
        if (openPile === 'draw') {
          cards = [...currentCombatant.drawPile].sort(() => Math.random() - 0.5);
          title = `Draw Pile (${currentCombatant.drawPile.length})`;
        } else if (openPile === 'discard') {
          cards = [...currentCombatant.discardPile].reverse();
          title = `Discard Pile (${currentCombatant.discardPile.length})`;
        } else if (openPile === 'vanished') {
          cards = [...currentCombatant.vanishedPile];
          title = `Vanished (${currentCombatant.vanishedPile.length})`;
        }
        if (cards.length === 0) return null;
        return (
          <PileModal
            title={title}
            cards={cards}
            combatant={currentCombatant}
            onClose={() => setOpenPile(null)}
          />
        );
      })()}

      {/* Pokemon inspection panel - works for both player and enemy */}
      {inspectedCombatant && (
        inspectedCombatant.side === 'player' && inspectedRunPokemon && runState ? (
          // Player Pokemon with full RunPokemon data
          <PokemonDetailsPanel
            pokemon={inspectedRunPokemon}
            pokemonIndex={inspectedCombatant.slotIndex}
            partySize={runState.party.length}
            onClose={handleCloseInspection}
            onNavigate={handleNavigateInspection}
            readOnly
          />
        ) : (
          // Enemy Pokemon or sandbox mode - use combatant data only
          <PokemonDetailsPanel
            combatant={inspectedCombatant}
            onClose={handleCloseInspection}
            readOnly
          />
        )
      )}
    </div>
  );
}
