import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { CombatState, LogEntry, Combatant, Column, MoveRange, Position, MoveDefinition } from '../../engine/types';
import { getCurrentCombatant } from '../../engine/combat';
import { getMove, MOVES } from '../../data/loaders';
import { getValidTargets, getCardValidTargets, requiresTargetSelection, isAoERange, getValidSwitchTargets } from '../../engine/position';
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
import { EnemyHandPreview } from '../components/EnemyHandPreview';
import { useBattleEffects, BattleEffectsLayer } from '../components/BattleEffects';
import type { BattlePhase } from '../hooks/useBattle';
import type { RunState } from '../../run/types';
import { getBattleSpriteScale } from '../../data/heights';
import { Flourish } from '../components/Flourish';
import { THEME } from '../theme';
import battleBgAct1 from '../../../assets/backgrounds/rocket_lab_act_1_v4.png';
import battleBgAct2 from '../../../assets/backgrounds/rocket_lab_act_2.png';
import battleBgAct3 from '../../../assets/backgrounds/rocket_lab_act_3.png';
import { playSound, type SoundEffect } from '../utils/sound';

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
  onSwitchPosition?: (targetPosition: Position) => void;
  onRestart: () => void;
  onBattleEnd?: (result: BattleResult, combatants: Combatant[], goldEarned?: number) => void;
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
  onMouseEnterSprite,
  onMouseLeaveSprite,
  switchTargetPositions,
  onSwitchSelect,
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
  onMouseEnterSprite?: (combatant: Combatant) => void;
  onMouseLeaveSprite?: () => void;
  switchTargetPositions?: Position[];
  onSwitchSelect?: (position: Position) => void;
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

  // Compute arrow character pointing from source toward target cell
  // Player grid: back row on LEFT, front row on RIGHT
  // Enemy grid: front row on LEFT, back row on RIGHT
  const getSwitchArrow = (from: Position, to: Position): string => {
    if (from.row !== to.row) {
      const movingToFront = to.row === 'front';
      // Player: front is RIGHT, back is LEFT. Enemy: front is LEFT, back is RIGHT.
      if (side === 'player') return movingToFront ? '\u2192' : '\u2190';
      return movingToFront ? '\u2190' : '\u2192';
    }
    if (to.column < from.column) return '\u2191';
    return '\u2193';
  };

  const renderCell = (combatant: Combatant | undefined, zIndex: number, tiltX: number, cellPosition: Position) => {
    // Check if this cell is a valid switch target
    const isSwitchTarget = switchTargetPositions?.some(
      p => p.row === cellPosition.row && p.column === cellPosition.column
    ) ?? false;

    const arrow = isSwitchTarget && currentCombatant
      ? getSwitchArrow(currentCombatant.position, cellPosition)
      : '\u2192';

    return (
      <div style={{
        transform: `translateX(${tiltX}px)`,
        position: 'relative',
        zIndex,
        display: 'flex',
        justifyContent: 'center',
      }}>
        {combatant ? (
          <div
            onClick={isSwitchTarget && onSwitchSelect ? () => onSwitchSelect(cellPosition) : undefined}
            style={{
              cursor: isSwitchTarget ? 'pointer' : undefined,
              borderRadius: 8,
              boxShadow: isSwitchTarget ? '0 0 12px 4px rgba(56, 189, 248, 0.6)' : undefined,
            }}
          >
            <PokemonSprite
              combatant={combatant}
              isCurrentTurn={currentCombatant?.id === combatant.id}
              isTargetable={!isSwitchTarget && targetableIds.has(combatant.id)}
              onSelect={isSwitchTarget ? () => onSwitchSelect?.(cellPosition) : () => onSelectTarget(combatant.id)}
              onInspect={!isSwitchTarget && onInspect ? () => onInspect(combatant) : undefined}
              onDragEnter={!isSwitchTarget && onDragEnterTarget ? () => onDragEnterTarget(combatant.id) : undefined}
              onDragLeave={!isSwitchTarget ? onDragLeaveTarget : undefined}
              onDrop={!isSwitchTarget && onDropOnTarget ? () => onDropOnTarget(combatant.id) : undefined}
              isDragHovered={hoveredTargetIds?.has(combatant.id) ?? false}
              damagePreview={damagePreviews?.get(combatant.id)}
              spriteScale={spriteScale}
              onMouseEnter={onMouseEnterSprite ? () => onMouseEnterSprite(combatant) : undefined}
              onMouseLeave={onMouseLeaveSprite}
            />
          </div>
        ) : isSwitchTarget && onSwitchSelect ? (
          <div
            onClick={() => onSwitchSelect(cellPosition)}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              border: '2px dashed rgba(56, 189, 248, 0.6)',
              background: 'rgba(56, 189, 248, 0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: 'rgba(56, 189, 248, 0.7)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(56, 189, 248, 0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(56, 189, 248, 0.12)'; }}
          >
            {arrow}
          </div>
        ) : null}
      </div>
    );
  };

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
        // Left column row depends on side: player left=back, enemy left=front
        const leftRow = side === 'player' ? 'back' : 'front';
        const rightRow = side === 'player' ? 'front' : 'back';
        return [
          <div key={`${col}-l`}>{renderCell(leftCombatant, leftZIndex, tiltX, { row: leftRow, column: col })}</div>,
          <div key={`${col}-r`}>{renderCell(rightCombatant, rightZIndex, tiltX, { row: rightRow, column: col })}</div>,
        ];
      })}
    </div>
  );
}

export function BattleScreen({
  state, phase, logs, pendingCardIndex,
  onSelectCard, onSelectTarget, onPlayCard, onEndTurn, onSwitchPosition, onRestart, onBattleEnd, runState,
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

  // Switch position mode state (declared early — referenced by enemy hover logic)
  const [switchMode, setSwitchMode] = useState(false);

  // Drag-and-drop state (declared early — referenced by enemy hover logic)
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Enemy hand preview state
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);

  const handleEnemySpriteEnter = useCallback((combatant: Combatant) => {
    if (phase === 'player_turn' && pendingCardIndex === null && draggingCardIndex === null && !switchMode
        && combatant.side === 'enemy' && combatant.alive && combatant.hand.length > 0) {
      setHoveredEnemyId(combatant.id);
    }
  }, [phase, pendingCardIndex, draggingCardIndex, switchMode]);

  const handleEnemySpriteLeave = useCallback(() => {
    setHoveredEnemyId(null);
  }, []);

  // Clear hover when leaving player_turn phase or when targeting/dragging a card
  useEffect(() => {
    if (phase !== 'player_turn' || pendingCardIndex !== null || draggingCardIndex !== null || switchMode) {
      setHoveredEnemyId(null);
    }
  }, [phase, pendingCardIndex, draggingCardIndex, switchMode]);

  // Compute valid switch targets when in switch mode
  const switchTargetPositions = useMemo(() => {
    if (!switchMode || !isPlayerTurn || !currentCombatant) return [];
    return getValidSwitchTargets(state, currentCombatant);
  }, [switchMode, isPlayerTurn, currentCombatant, state]);

  // Cancel switch mode on Escape
  useEffect(() => {
    if (!switchMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSwitchMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [switchMode]);

  // Clear switch mode when turn changes
  useEffect(() => {
    setSwitchMode(false);
  }, [currentCombatant?.id]);

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
    // Match by formId + position to handle duplicates and recruit 1v1 battles
    return runState.party.find(p =>
      p.formId === combatant.pokemonId &&
      p.position.row === combatant.position.row &&
      p.position.column === combatant.position.column
    ) ?? runState.party.find(p => p.formId === combatant.pokemonId) ?? null;
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
    const validTargets = getCardValidTargets(state, currentCombatant, card);

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

  // Parse new logs to trigger visual effects and sound
  useEffect(() => {
    const newLogs = logs.slice(processedLogsRef.current);
    processedLogsRef.current = logs.length;

    // Track the current card being played so damage/heal/block sounds
    // can reference the card's contact flag for physical vs special
    let currentCardDef: MoveDefinition | undefined;

    // Deduplicate sounds within this batch — AoE hits and passive triggers
    // can produce many logs of the same type; play each sound at most once.
    const playedSounds = new Set<SoundEffect>();
    const playSoundOnce = (sound: SoundEffect) => {
      if (!playedSounds.has(sound)) {
        playedSounds.add(sound);
        playSound(sound);
      }
    };

    for (let i = 0; i < newLogs.length; i++) {
      const log = newLogs[i];

      // Parse card played first so currentCardDef is set before damage/heal/block
      const cardMatch = log.message.match(/^(.+?) plays (.+?) \(cost/i);
      if (cardMatch) {
        const sourceName = cardMatch[1];
        const cardName = cardMatch[2];
        // Track current card definition for sound categorization
        currentCardDef = Object.values(MOVES).find(m => m.name === cardName);
        battleEffects.showCardPlayed(sourceName, cardName);

        // For enemy cards, trigger card fly animation
        const source = state.combatants.find(c => c.id === log.combatantId);
        if (source && source.side === 'enemy') {
          const sourcePos = getPositionForCombatant(source.id);
          if (sourcePos) {
            const hasDamage = currentCardDef?.effects.some(e => ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko', 'set_damage', 'percent_hp'].includes(e.type)) ?? false;
            const isBlockCard = !hasDamage && (currentCardDef?.effects.some(e => e.type === 'block') ?? false);
            const cardType = currentCardDef?.type ?? 'normal';

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
          // Play attack sound — skip recoil self-damage (not a card effect hit)
          const isRecoil = log.message.includes('recoil');
          if (!isRecoil) {
            playSoundOnce(currentCardDef?.contact ? 'physical_attack' : 'special_attack');
          }
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
          // No sound for status damage (burn/poison/leech) — ambient dot effects
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
          playSoundOnce('heal');
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
          playSoundOnce('block');
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
      let healSoundPlayed = false;
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
            // Play heal sound once for buff status applications (self-beneficial)
            if (!healSoundPlayed && ['strength', 'haste', 'evasion'].includes(statusType)) {
              playSound('heal');
              healSoundPlayed = true;
            }
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
    if (!cardId) return { needsTarget: false, targetableIds: new Set<string>(), rangeLabel: '' };
    const card = getMove(cardId);
    const validTargets = getCardValidTargets(state, currentCombatant, card);

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
    if (!cardId) { onSelectTarget(targetId); return; }
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
    if (!cardId) return; // Hand may have changed since pendingCardIndex was set
    const card = getMove(cardId);
    const validTargets = getCardValidTargets(state, currentCombatant, card);

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
      const timer = setTimeout(() => setVictoryStage('draft_message'), 1000);
      return () => clearTimeout(timer);
    }
    if (victoryStage === 'draft_message') {
      const timer = setTimeout(() => setVictoryStage('transitioning'), 1200);
      return () => clearTimeout(timer);
    }
    if (victoryStage === 'transitioning' && onBattleEnd && !battleEndCalledRef.current) {
      battleEndCalledRef.current = true;
      onBattleEnd('victory', state.combatants, state.goldEarned);
    }
  }, [victoryStage, onBattleEnd, state.combatants, state.goldEarned]);

  // Handle defeat immediately (no celebration needed)
  useEffect(() => {
    if (phase === 'defeat' && onBattleEnd && !battleEndCalledRef.current) {
      battleEndCalledRef.current = true;
      onBattleEnd('defeat', state.combatants, state.goldEarned);
    }
    // Reset ref when game is not over (for next battle)
    if (!gameOver) {
      battleEndCalledRef.current = false;
    }
  }, [gameOver, phase, state.combatants, onBattleEnd]);

  const act = runState?.currentAct ?? 1;
  const battleBackground = act === 3 ? battleBgAct3 : act === 2 ? battleBgAct2 : battleBgAct1;

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
          Main Menu
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

      {/* Switch mode hint */}
      {switchMode && (
        <div style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: 8,
          background: 'rgba(56, 189, 248, 0.15)',
          color: '#7dd3fc',
          fontSize: 15,
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          Select adjacent position
          <button
            onClick={() => setSwitchMode(false)}
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
            targetableIds={dragTargetableIds.size > 0 ? dragTargetableIds : targetableIds}
            onSelectTarget={triggerCardFlyAndSelectTarget}
            onInspect={handleInspect}
            side="player"
            spriteScale={spriteScale}
            onDragEnterTarget={handleDragEnterTarget}
            onDragLeaveTarget={handleDragLeaveTarget}
            onDropOnTarget={handleDropOnTarget}
            hoveredTargetIds={affectedHoverIds}
            switchTargetPositions={switchMode ? switchTargetPositions : undefined}
            onSwitchSelect={switchMode ? (pos) => {
              onSwitchPosition?.(pos);
              setSwitchMode(false);
            } : undefined}
          />
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
            onMouseEnterSprite={handleEnemySpriteEnter}
            onMouseLeaveSprite={handleEnemySpriteLeave}
          />
        </div>
        </div>{/* end scaling wrapper */}

        {/* Enemy hand preview on hover */}
        {hoveredEnemyId && (() => {
          const hoveredEnemy = enemies.find(c => c.id === hoveredEnemyId);
          if (!hoveredEnemy || !hoveredEnemy.alive || hoveredEnemy.hand.length === 0) return null;
          return <EnemyHandPreview combatant={hoveredEnemy} />;
        })()}

        {/* Victory celebration overlay */}
        {phase === 'victory' && victoryStage && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0)',
            gap: 20,
            zIndex: 50,
          }}>
            {/* Dark backdrop that fades in */}
            <div className="battle-victory-backdrop" style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 4, 8, 0.8)',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                className="battle-victory-title"
                style={{
                  fontSize: 56,
                  fontWeight: 'bold',
                  color: THEME.accent,
                  textShadow: '0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(250, 204, 21, 0.15)',
                  ...THEME.heading,
                  letterSpacing: '0.2em',
                }}
              >
                VICTORY
              </div>

              <div className="battle-victory-flourish">
                <Flourish variant="divider" width={200} color={THEME.accent} />
              </div>

              {/* Draft message — appears after title settles */}
              {(victoryStage === 'draft_message' || victoryStage === 'transitioning') && (
                <div
                  className="battle-victory-draft-msg"
                  style={{
                    fontSize: 18,
                    color: THEME.text.secondary,
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                    marginTop: 4,
                  }}
                >
                  Choose a new card for each Pokemon...
                </div>
              )}
            </div>

            <style>{`
              .battle-victory-backdrop {
                animation: bvBackdropIn 0.6s ease-out forwards;
                opacity: 0;
              }
              @keyframes bvBackdropIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .battle-victory-title {
                animation: bvTitleIn 0.7s ease-out forwards;
                opacity: 0;
              }
              @keyframes bvTitleIn {
                from {
                  opacity: 0;
                  transform: translateY(-8px) scale(0.97);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
              .battle-victory-flourish {
                animation: bvFadeIn 0.4s ease-out 0.3s forwards;
                opacity: 0;
              }
              .battle-victory-draft-msg {
                animation: bvFadeIn 0.4s ease-out forwards;
                opacity: 0;
              }
              @keyframes bvFadeIn {
                from {
                  opacity: 0;
                  transform: translateY(6px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
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
            zIndex: 50,
          }}>
            <div className="battle-defeat-backdrop" style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 4, 8, 0.8)',
            }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                className="battle-defeat-title"
                style={{
                  fontSize: 56,
                  fontWeight: 'bold',
                  color: THEME.status.damage,
                  textShadow: '0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.15)',
                  ...THEME.heading,
                  letterSpacing: '0.2em',
                }}
              >
                DEFEAT
              </div>
              <Flourish variant="heading" width={100} color={THEME.status.damage} />
              <button
                onClick={onRestart}
                style={{
                  padding: '12px 32px',
                  fontSize: 16,
                  ...THEME.button.secondary,
                  marginTop: 8,
                }}
              >
                Main Menu
              </button>
            </div>
            <style>{`
              .battle-defeat-backdrop {
                animation: bvBackdropIn 0.6s ease-out forwards;
                opacity: 0;
              }
              .battle-defeat-title {
                animation: bvTitleIn 0.7s ease-out forwards;
                opacity: 0;
              }
            `}</style>
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
              unplayableCardIndices={(() => {
                const indices = new Set<number>();
                currentCombatant.hand.forEach((cardId, idx) => {
                  const card = getMove(cardId);
                  if (getCardValidTargets(state, currentCombatant, card).length === 0) {
                    indices.add(idx);
                  }
                });
                return indices;
              })()}
            />

            {/* Energy vessel + Switch + End Turn (right of hand) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <EnergyPips energy={currentCombatant.energy} energyCap={currentCombatant.energyCap} variant="vessel" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Switch button — ornate with cost badge */}
                {onSwitchPosition && (() => {
                  const canSwitch = !currentCombatant.turnFlags.hasSwitchedThisTurn
                    && currentCombatant.energy >= 2
                    && getValidSwitchTargets(state, currentCombatant).length > 0;
                  const enabled = canSwitch || switchMode;
                  const teal = '#38bdf8';
                  const tealDim = '#1e6a9a';
                  const accent = enabled ? teal : tealDim;
                  return (
                    <button
                      onClick={() => {
                        if (switchMode) {
                          setSwitchMode(false);
                        } else {
                          setSwitchMode(true);
                          onSelectCard(null);
                        }
                      }}
                      disabled={!enabled}
                      title={
                        currentCombatant.turnFlags.hasSwitchedThisTurn ? 'Already switched this turn'
                        : currentCombatant.energy < 2 ? 'Need 2 energy'
                        : 'Switch position (2 energy)'
                      }
                      style={{
                        position: 'relative',
                        border: 'none',
                        background: 'transparent',
                        cursor: enabled ? 'pointer' : 'default',
                        padding: 0,
                        opacity: enabled ? 1 : 0.45,
                      }}
                    >
                      <svg width="82" height="38" viewBox="0 0 82 38" fill="none">
                        {/* Button body */}
                        <path
                          d="M8 2 L74 2 Q80 2 80 8 L80 30 Q80 36 74 36 L8 36 Q2 36 2 30 L2 8 Q2 2 8 2 Z"
                          fill={switchMode ? `${teal}20` : THEME.bg.panelDark}
                          stroke={switchMode ? `${teal}88` : `${accent}55`}
                          strokeWidth="1.2"
                        />
                        {/* Inner border */}
                        <path
                          d="M10 5 L72 5 Q76 5 76 9 L76 29 Q76 33 72 33 L10 33 Q6 33 6 29 L6 9 Q6 5 10 5 Z"
                          fill="none"
                          stroke={switchMode ? `${teal}33` : `${accent}18`}
                          strokeWidth="0.6"
                        />
                        {/* Inset glow fill when active */}
                        {switchMode && (
                          <path
                            d="M10 5 L72 5 Q76 5 76 9 L76 29 Q76 33 72 33 L10 33 Q6 33 6 29 L6 9 Q6 5 10 5 Z"
                            fill={`${teal}0a`}
                          />
                        )}
                        {/* Corner notch accents */}
                        <line x1="4" y1="11" x2="8" y2="11" stroke={`${accent}44`} strokeWidth="0.7" />
                        <line x1="4" y1="27" x2="8" y2="27" stroke={`${accent}44`} strokeWidth="0.7" />
                        <line x1="74" y1="11" x2="78" y2="11" stroke={`${accent}44`} strokeWidth="0.7" />
                        <line x1="74" y1="27" x2="78" y2="27" stroke={`${accent}44`} strokeWidth="0.7" />
                        {/* Left swap arrow */}
                        <path d="M16 15 L20 12 L20 18 Z" fill={enabled ? `${teal}88` : `${tealDim}55`} />
                        <line x1="20" y1="15" x2="26" y2="15" stroke={enabled ? `${teal}44` : `${tealDim}28`} strokeWidth="0.8" />
                        {/* Right swap arrow */}
                        <path d="M66 23 L62 20 L62 26 Z" fill={enabled ? `${teal}88` : `${tealDim}55`} />
                        <line x1="56" y1="23" x2="62" y2="23" stroke={enabled ? `${teal}44` : `${tealDim}28`} strokeWidth="0.8" />
                        {/* Text */}
                        <text
                          x="41" y="20.5"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={enabled ? teal : tealDim}
                          fontSize="13"
                          fontWeight="bold"
                          fontFamily="'Kreon', Georgia, serif"
                        >
                          Switch
                        </text>
                      </svg>
                      {/* Cost badge — diamond notch, top-right */}
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        right: -6,
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="22" height="22" viewBox="0 0 22 22" style={{ position: 'absolute' }}>
                          <path
                            d="M11 1 L20 11 L11 21 L2 11 Z"
                            fill={THEME.bg.panelDark}
                            stroke={enabled ? teal : tealDim}
                            strokeWidth="1"
                          />
                          <path
                            d="M11 4 L17.5 11 L11 18 L4.5 11 Z"
                            fill={enabled ? `${teal}18` : 'transparent'}
                            stroke={enabled ? `${teal}33` : 'transparent'}
                            strokeWidth="0.6"
                          />
                        </svg>
                        <span style={{
                          position: 'relative',
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: enabled ? '#7dd3fc' : tealDim,
                          textShadow: enabled ? `0 0 5px ${teal}66` : 'none',
                          lineHeight: 1,
                        }}>
                          2
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {/* End Turn button — ornate gold */}
                <button
                  onClick={onEndTurn}
                  style={{
                    position: 'relative',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <svg width="96" height="38" viewBox="0 0 96 38" fill="none">
                    {/* Button body */}
                    <path
                      d="M10 2 L86 2 Q94 2 94 10 L94 28 Q94 36 86 36 L10 36 Q2 36 2 28 L2 10 Q2 2 10 2 Z"
                      fill={THEME.bg.panelDark}
                      stroke={THEME.accent}
                      strokeWidth="1.2"
                    />
                    {/* Inner border */}
                    <path
                      d="M12 5 L84 5 Q90 5 90 11 L90 27 Q90 33 84 33 L12 33 Q6 33 6 27 L6 11 Q6 5 12 5 Z"
                      fill="none"
                      stroke={`${THEME.accent}20`}
                      strokeWidth="0.6"
                    />
                    {/* Inset glow fill */}
                    <path
                      d="M12 5 L84 5 Q90 5 90 11 L90 27 Q90 33 84 33 L12 33 Q6 33 6 27 L6 11 Q6 5 12 5 Z"
                      fill={`${THEME.accent}08`}
                    />
                    {/* Corner notch accents */}
                    <line x1="4" y1="12" x2="8" y2="12" stroke={`${THEME.accent}55`} strokeWidth="0.7" />
                    <line x1="4" y1="26" x2="8" y2="26" stroke={`${THEME.accent}55`} strokeWidth="0.7" />
                    <line x1="88" y1="12" x2="92" y2="12" stroke={`${THEME.accent}55`} strokeWidth="0.7" />
                    <line x1="88" y1="26" x2="92" y2="26" stroke={`${THEME.accent}55`} strokeWidth="0.7" />
                    {/* Left scroll flourish */}
                    <path d="M16 19 Q16 14 21 14 L28 14" stroke={`${THEME.accent}44`} strokeWidth="0.8" fill="none" />
                    <path d="M16 19 Q16 24 21 24 L28 24" stroke={`${THEME.accent}44`} strokeWidth="0.8" fill="none" />
                    <circle cx="16" cy="19" r="1.5" stroke={`${THEME.accent}44`} strokeWidth="0.7" fill="none" />
                    {/* Right scroll flourish */}
                    <path d="M80 19 Q80 14 75 14 L68 14" stroke={`${THEME.accent}44`} strokeWidth="0.8" fill="none" />
                    <path d="M80 19 Q80 24 75 24 L68 24" stroke={`${THEME.accent}44`} strokeWidth="0.8" fill="none" />
                    <circle cx="80" cy="19" r="1.5" stroke={`${THEME.accent}44`} strokeWidth="0.7" fill="none" />
                    {/* Center diamond accent */}
                    <path d="M48 13 L51 19 L48 25 L45 19 Z" stroke={`${THEME.accent}33`} strokeWidth="0.6" fill={`${THEME.accent}11`} />
                    {/* Text */}
                    <text
                      x="48" y="21"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={THEME.accent}
                      fontSize="13"
                      fontWeight="bold"
                      fontFamily="'Kreon', Georgia, serif"
                      style={{ textShadow: `0 0 8px ${THEME.accent}44` } as React.CSSProperties}
                    >
                      End Turn
                    </text>
                  </svg>
                </button>
              </div>
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
