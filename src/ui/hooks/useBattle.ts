import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CombatState, LogEntry,
  PokemonData, Position, Combatant,
} from '../../engine/types';
import {
  createCombatState, getCurrentCombatant, buildTurnOrder,
} from '../../engine/combat';
import { startTurn, processAction, endTurn, skipTurnAndAdvance } from '../../engine/turns';
import { drawCards } from '../../engine/deck';
import { chooseEnemyAction } from '../../engine/ai';
import type { RunState, BattleNode as MapBattleNode } from '../../run/types';
import { getRunPokemonData } from '../../run/state';
import { getPokemon } from '../../data/loaders';
import { onBattleStart } from '../../engine/passives';

export type BattlePhase = 'selecting' | 'player_turn' | 'enemy_turn' | 'animating' | 'victory' | 'defeat';

export interface BattleHook {
  state: CombatState | null;
  phase: BattlePhase;
  logs: LogEntry[];
  startBattle: (players: PokemonData[], enemies: PokemonData[], playerPositions?: Position[], enemyPositions?: Position[]) => void;
  startBattleFromRun: (run: RunState, node: MapBattleNode) => void;
  startSandboxBattle: () => void;
  startConfiguredBattle: (
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    playerPassives: Map<number, string[]>,
    enemyPassives: Map<number, string[]>,
    hpOverrides?: Map<string, { maxHp?: number; startPercent?: number }>
  ) => void;
  startTutorialBattle: (
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    enemyPassives?: Map<number, string[]>,
  ) => void;
  playCard: (cardIndex: number, targetId?: string) => void;
  switchPosition: (targetPosition: Position) => void;
  endPlayerTurn: () => void;
  needsTarget: boolean;
  pendingCardIndex: number | null;
  setPendingCardIndex: (index: number | null) => void;
  getCombatants: () => Combatant[];
  /** Pause/resume battle progression (enemy turns, turn transitions). Used by tutorial overlay. */
  setTutorialPaused: (paused: boolean) => void;
}

export function useBattle(): BattleHook {
  const [state, setState] = useState<CombatState | null>(null);
  const [phase, setPhase] = useState<BattlePhase>('selecting');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null);
  const enemyTimerRef = useRef<number | null>(null);
  const tutorialPausedRef = useRef(false);

  const setTutorialPaused = useCallback((paused: boolean) => {
    tutorialPausedRef.current = paused;
  }, []);

  // Use refs to break circular dependency between callbacks
  const processNextTurnRef = useRef<(s: CombatState) => void>(() => {});
  const scheduleEnemyTurnRef = useRef<(s: CombatState) => void>(() => {});

  const addLogs = useCallback((newLogs: LogEntry[]) => {
    setLogs(prev => [...prev, ...newLogs]);
  }, []);

  const processNextTurn = useCallback((s: CombatState) => {
    // If tutorial is paused, poll until unpaused
    if (tutorialPausedRef.current) {
      setTimeout(() => processNextTurnRef.current(s), 100);
      return;
    }

    if (s.phase !== 'ongoing') {
      setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
      setState({ ...s });
      return;
    }

    const { logs: turnLogs, skipped } = startTurn(s);
    addLogs(turnLogs);

    if (s.phase !== 'ongoing') {
      setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
      setState({ ...s });
      return;
    }

    if (skipped) {
      const advLogs = skipTurnAndAdvance(s);
      addLogs(advLogs);
      setState({ ...s });
      // Recurse with delay to avoid blocking
      setTimeout(() => processNextTurnRef.current(s), 300);
      return;
    }

    const current = getCurrentCombatant(s);
    setPhase(current.side === 'player' ? 'player_turn' : 'enemy_turn');
    setState({ ...s });

    if (current.side === 'enemy') {
      scheduleEnemyTurnRef.current(s);
    }
  }, [addLogs]);

  const scheduleEnemyTurn = useCallback((s: CombatState) => {
    let cardsPlayed = 0;

    const playNext = () => {
      // If tutorial is paused, poll until unpaused
      if (tutorialPausedRef.current) {
        enemyTimerRef.current = window.setTimeout(playNext, 100);
        return;
      }

      try {
        if (s.phase !== 'ongoing') {
          setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
          setState({ ...s });
          return;
        }

        const action = chooseEnemyAction(s, cardsPlayed);

        if (action.type === 'end_turn') {
          // End enemy turn
          const endLogs = endTurn(s);
          addLogs(endLogs);
          setState({ ...s });

          // Check if battle ended from end-of-turn effects (poison/burn killed last enemy)
          if (s.phase !== 'ongoing') {
            setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
            return;
          }

          // Next combatant (pause before transitioning)
          setTimeout(() => processNextTurnRef.current(s), 800);
          return;
        }

        const actionLogs = processAction(s, action);
        addLogs(actionLogs);
        cardsPlayed++;

        if (s.phase !== 'ongoing') {
          setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
          setState({ ...s });
          return;
        }

        setState({ ...s });
        // Delay between enemy card plays (slower for readability)
        enemyTimerRef.current = window.setTimeout(playNext, 1200);
      } catch (error) {
        console.error('Error during enemy turn:', error);
        // Try to recover by ending the enemy's turn
        try {
          const endLogs = endTurn(s);
          addLogs(endLogs);
          setState({ ...s });
          setTimeout(() => processNextTurnRef.current(s), 500);
        } catch (e) {
          console.error('Failed to recover from enemy turn error:', e);
        }
      }
    };

    // Initial delay before enemy starts playing (gives player time to see it's enemy turn)
    enemyTimerRef.current = window.setTimeout(playNext, 800);
  }, [addLogs]);

  // Update refs when callbacks change
  useEffect(() => {
    processNextTurnRef.current = processNextTurn;
    scheduleEnemyTurnRef.current = scheduleEnemyTurn;
  }, [processNextTurn, scheduleEnemyTurn]);

  const initializeBattle = useCallback((
    s: CombatState,
    runHpOverrides?: Map<number, number>,
    runPassiveOverrides?: Map<number, string[]>
  ) => {
    // Apply HP overrides from run state (for HP persistence)
    if (runHpOverrides) {
      const playerCombatants = s.combatants.filter(c => c.side === 'player');
      runHpOverrides.forEach((hp, slotIndex) => {
        const combatant = playerCombatants.find(c => c.slotIndex === slotIndex);
        if (combatant) {
          combatant.hp = hp;
        }
      });
    }

    // Apply passive ability overrides from run state
    if (runPassiveOverrides) {
      const playerCombatants = s.combatants.filter(c => c.side === 'player');
      runPassiveOverrides.forEach((passiveIds, slotIndex) => {
        const combatant = playerCombatants.find(c => c.slotIndex === slotIndex);
        if (combatant) {
          combatant.passiveIds = passiveIds;
        }
      });
    }

    setState(s);
    const initialLogs: LogEntry[] = [{ round: 1, combatantId: '', message: '--- Battle Start! ---' }];

    // Trigger battle start passives (Intimidate, Scurry, etc.)
    const battleStartLogs = onBattleStart(s);
    initialLogs.push(...battleStartLogs);

    // Rebuild turn order after battle start passives (Haste from Scurry affects speed)
    s.turnOrder = buildTurnOrder(s);
    s.currentTurnIndex = 0;

    // Pre-draw hands for all combatants so enemy hands are visible during player turn
    for (const c of s.combatants) {
      if (c.alive) drawCards(c);
    }

    setLogs(initialLogs);
    setPhase('selecting');

    // Start first turn
    const { logs: turnLogs, skipped } = startTurn(s);
    setLogs(prev => [...prev, ...turnLogs]);

    if (s.phase !== 'ongoing') {
      setPhase(s.phase === 'victory' ? 'victory' : 'defeat');
      setState({ ...s });
      return;
    }

    if (skipped) {
      const advLogs = skipTurnAndAdvance(s);
      setLogs(prev => [...prev, ...advLogs]);
      setState({ ...s });
      // Continue to next turn
      processNextTurnRef.current(s);
      return;
    }

    const current = getCurrentCombatant(s);
    setPhase(current.side === 'player' ? 'player_turn' : 'enemy_turn');
    setState({ ...s });

    if (current.side === 'enemy') {
      scheduleEnemyTurnRef.current(s);
    }
  }, []);

  const startBattle = useCallback((players: PokemonData[], enemies: PokemonData[], playerPositions?: Position[], enemyPositions?: Position[]) => {
    const s = createCombatState(players, enemies, playerPositions, enemyPositions);
    initializeBattle(s);
  }, [initializeBattle]);

  const startBattleFromRun = useCallback((run: RunState, node: MapBattleNode) => {
    // Filter out knocked out Pokemon, keeping track of original indices
    const aliveParty: { pokemon: typeof run.party[0]; originalIndex: number }[] = [];
    run.party.forEach((rp, i) => {
      if (!rp.knockedOut) {
        aliveParty.push({ pokemon: rp, originalIndex: i });
      }
    });

    // Convert alive RunPokemon to PokemonData
    const players = aliveParty.map(({ pokemon }) => getRunPokemonData(pokemon));
    const playerPositions = aliveParty.map(({ pokemon }) => pokemon.position);
    const playerSlotIndices = aliveParty.map(({ originalIndex }) => originalIndex);

    // Get enemy Pokemon data, applying HP multiplier if present (for boss fights)
    const hpMultiplier = node.enemyHpMultiplier ?? 1;
    const enemies = node.enemies.map(id => {
      const basePokemon = getPokemon(id);
      if (hpMultiplier !== 1) {
        return {
          ...basePokemon,
          maxHp: Math.floor(basePokemon.maxHp * hpMultiplier),
        };
      }
      return basePokemon;
    });
    const enemyPositions = node.enemyPositions;

    // Create combat state with original slot indices preserved
    const s = createCombatState(players, enemies, playerPositions, enemyPositions, playerSlotIndices);

    // Build HP overrides from run state (using original indices)
    const hpOverrides = new Map<number, number>();
    aliveParty.forEach(({ pokemon, originalIndex }) => {
      hpOverrides.set(originalIndex, pokemon.currentHp);
    });

    // Build passive ability overrides from run state (using original indices)
    const passiveOverrides = new Map<number, string[]>();
    aliveParty.forEach(({ pokemon, originalIndex }) => {
      passiveOverrides.set(originalIndex, pokemon.passiveIds);
    });

    initializeBattle(s, hpOverrides, passiveOverrides);
  }, [initializeBattle]);

  // Sandbox battle for testing Blastoise passives (Bastion Barrage, etc.)
  // Player: Blastoise with ALL water line passives and water/block cards
  // Enemies: Rattata x3 (simple targets)
  const startSandboxBattle = useCallback(() => {
    // Get base Pokemon data
    const blastoiseData = getPokemon('blastoise');
    const rattataData = getPokemon('rattata');

    // Blastoise test deck: block cards + water attacks to test Bastion Barrage
    const blastoiseDeck = [
      'withdraw',       // 1 cost - Gain 8 Block (water type)
      'withdraw',       // duplicate for testing
      'defend',         // 1 cost - Gain 5 Block (normal type)
      'defend',         // duplicate
      'water-gun',      // 1 cost - 5 damage (water) - should get Bastion Barrage bonus
      'water-gun',      // duplicate
      'hydro-pump',     // 3 cost - 15 damage (water) - big Bastion Barrage test
      'bubble-beam',    // 2 cost - 9 damage (water)
      'surf',           // 2 cost - 10 damage to all (water)
      'tackle',         // 1 cost - 6 damage (normal) - no Bastion bonus
    ];

    // Simple splash deck for enemies
    const splashDeck = Array(10).fill('splash');

    // Player Blastoise with high energy to test combos
    const sandboxBlastoise: PokemonData = {
      ...blastoiseData,
      maxHp: 100,
      energyPerTurn: 10,
      energyCap: 15,
      deck: blastoiseDeck,
    };

    // Simple enemies
    const sandboxRattata: PokemonData = {
      ...rattataData,
      maxHp: 50,
      deck: splashDeck,
    };

    // Positions: Blastoise front, 3 Rattata front row
    const playerPositions: Position[] = [{ row: 'front', column: 1 }];
    const enemyPositions: Position[] = [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ];

    // Create combat state
    const enemies = [sandboxRattata, sandboxRattata, sandboxRattata];
    const s = createCombatState([sandboxBlastoise], enemies, playerPositions, enemyPositions);

    // Give Blastoise ALL water line passives for testing
    const blastoiseCombatant = s.combatants.find(c => c.side === 'player');
    if (blastoiseCombatant) {
      blastoiseCombatant.passiveIds = [
        'baby_shell',        // +3 Block at turn start
        'pressure_hull',     // Retain 50% Block at round end
        'torrent_shield',    // Water attacks grant Block = 100% damage dealt
        'fortified_cannons', // Water attacks deal +25% of current Block as bonus
      ];
    }

    initializeBattle(s);
  }, [initializeBattle]);

  // Start a configured battle from sandbox config screen
  const startConfiguredBattle = useCallback((
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    playerPassives: Map<number, string[]>,
    enemyPassives: Map<number, string[]>,
    hpOverrides?: Map<string, { maxHp?: number; startPercent?: number }>
  ) => {
    // Create combat state
    const s = createCombatState(players, enemies, playerPositions, enemyPositions);

    // Apply player passive overrides
    const playerCombatants = s.combatants.filter(c => c.side === 'player');
    playerPassives.forEach((passiveIds, slotIndex) => {
      const combatant = playerCombatants.find(c => c.slotIndex === slotIndex);
      if (combatant) {
        combatant.passiveIds = passiveIds;
      }
    });

    // Apply enemy passive overrides
    const enemyCombatants = s.combatants.filter(c => c.side === 'enemy');
    enemyPassives.forEach((passiveIds, slotIndex) => {
      const combatant = enemyCombatants.find(c => c.slotIndex === slotIndex);
      if (combatant) {
        combatant.passiveIds = passiveIds;
      }
    });

    // Apply HP overrides (999 HP, start at 50%, etc.)
    if (hpOverrides) {
      hpOverrides.forEach((override, key) => {
        const [side, indexStr] = key.split('-');
        const index = parseInt(indexStr);
        const combatant = s.combatants.find(c =>
          c.side === side && c.slotIndex === index
        );
        if (combatant) {
          if (override.maxHp) {
            combatant.maxHp = override.maxHp;
            combatant.hp = override.maxHp;
          }
          if (override.startPercent !== undefined) {
            combatant.hp = Math.floor(combatant.maxHp * override.startPercent);
          }
        }
      });
    }

    initializeBattle(s);
  }, [initializeBattle]);

  // Start a tutorial battle with skipShuffle (cards dealt in deck order)
  const startTutorialBattle = useCallback((
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    enemyPassives?: Map<number, string[]>,
  ) => {
    const s = createCombatState(players, enemies, playerPositions, enemyPositions, undefined, true);
    if (enemyPassives) {
      const enemyCombatants = s.combatants.filter(c => c.side === 'enemy');
      enemyPassives.forEach((passiveIds, slotIndex) => {
        const combatant = enemyCombatants.find(c => c.slotIndex === slotIndex);
        if (combatant) {
          combatant.passiveIds = [...combatant.passiveIds, ...passiveIds];
        }
      });
    }
    initializeBattle(s);
  }, [initializeBattle]);

  const playCard = useCallback((cardIndex: number, targetId?: string) => {
    if (!state || phase !== 'player_turn') return;

    const combatant = getCurrentCombatant(state);
    const cardId = combatant.hand[cardIndex];
    if (!cardId) return;

    const actionLogs = processAction(state, {
      type: 'play_card',
      cardInstanceId: cardId,
      targetId,
    });
    addLogs(actionLogs);
    setPendingCardIndex(null);

    if (state.phase !== 'ongoing') {
      setPhase(state.phase === 'victory' ? 'victory' : 'defeat');
    }
    setState({ ...state });
  }, [state, phase, addLogs]);

  const switchPosition = useCallback((targetPosition: Position) => {
    if (!state || phase !== 'player_turn') return;

    const actionLogs = processAction(state, {
      type: 'switch_position',
      targetPosition,
    });
    addLogs(actionLogs);

    if (state.phase !== 'ongoing') {
      setPhase(state.phase === 'victory' ? 'victory' : 'defeat');
    }
    setState({ ...state });
  }, [state, phase, addLogs]);

  const endPlayerTurn = useCallback(() => {
    if (!state || phase !== 'player_turn') return;

    const endLogs = endTurn(state);
    addLogs(endLogs);
    setPendingCardIndex(null);

    setState({ ...state });

    // Check if battle ended from end-of-turn effects
    if (state.phase !== 'ongoing') {
      setPhase(state.phase === 'victory' ? 'victory' : 'defeat');
      return;
    }

    setTimeout(() => processNextTurnRef.current(state), 500);
  }, [state, phase, addLogs]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (enemyTimerRef.current) clearTimeout(enemyTimerRef.current);
    };
  }, []);

  const needsTarget = pendingCardIndex !== null;

  const getCombatants = useCallback((): Combatant[] => {
    return state?.combatants ?? [];
  }, [state]);

  return {
    state,
    phase,
    logs,
    startBattle,
    startBattleFromRun,
    startSandboxBattle,
    startConfiguredBattle,
    startTutorialBattle,
    playCard,
    switchPosition,
    endPlayerTurn,
    needsTarget,
    pendingCardIndex,
    setPendingCardIndex,
    getCombatants,
    setTutorialPaused,
  };
}
