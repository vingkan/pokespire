import { useState, useCallback, useEffect } from 'react';
import type { PokemonData, Position, Combatant } from './engine/types';
import { useBattle } from './ui/hooks/useBattle';
import { PartySelectScreen } from './ui/screens/PartySelectScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import type { BattleResult } from './ui/screens/BattleScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { RestScreen } from './ui/screens/RestScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { RecruitScreen } from './ui/screens/RecruitScreen';
import { CardDraftScreen } from './ui/screens/CardDraftScreen';
import { RunVictoryScreen } from './ui/screens/RunVictoryScreen';
import { CardDexScreen } from './ui/screens/CardDexScreen';
import { PokeDexScreen } from './ui/screens/PokeDexScreen';
import { SandboxConfigScreen } from './ui/screens/SandboxConfigScreen';
import { ActTransitionScreen } from './ui/screens/ActTransitionScreen';
import { CardRemovalScreen } from './ui/screens/CardRemovalScreen';
import { Flourish } from './ui/components/Flourish';
import { AmbientBackground } from './ui/components/AmbientBackground';
import { ScreenShell } from './ui/components/ScreenShell';
import { DexFrame } from './ui/components/DexFrame';
import { THEME } from './ui/theme';
import type { SandboxPokemon } from './ui/screens/SandboxConfigScreen';
import { EventTesterScreen } from './ui/screens/EventTesterScreen';
import { GhostReviveScreen } from './ui/screens/GhostReviveScreen';
import type { RunState, RunPokemon, BattleNode, EventNode, RecruitNode } from './run/types';
import { getPokemon } from './data/loaders';
import { SHOP_ITEMS, CARD_FORGET_COST } from './data/shop';
import {
  createRunState,
  createAct2TestState,
  createAct3TestState,
  applyPartyPercentHeal,
  applyFullHealAll,
  addCardToDeck,
  syncBattleResults,
  moveKnockedOutToGraveyard,
  moveToNode,
  isRunComplete,
  isAct1Complete,
  isAct2Complete,
  getCurrentNode,
  applyLevelUp,
  transitionToAct2,
  transitionToAct3,
  removeCardsFromDeck,
  removeCardFromBench,
  getCurrentCardRemovalNode,
  migrateRunState,
  swapPartyAndBench,
  promoteFromBench,
  findEmptyPosition,
  getRecruitLevel,
  createRecruitPokemon,
  recruitToRoster,
  getRunPokemonData,
  getBattleGoldReward,
  applyPickupBonus,
  addGold,
  spendGold,
  reviveFromGraveyard,
} from './run/state';

type Screen = 'main_menu' | 'select' | 'map' | 'rest' | 'event' | 'recruit' | 'card_draft' | 'battle' | 'run_victory' | 'run_defeat' | 'card_dex' | 'pokedex' | 'sandbox_config' | 'act_transition' | 'card_removal' | 'event_tester' | 'ghost_revive' | 'disclaimer';

// localStorage keys
const SAVE_KEY = 'pokespire_save';

interface SaveData {
  screen: Screen;
  runState: RunState | null;
  savedAt: number;
}

function saveGame(screen: Screen, runState: RunState | null) {
  // Only save during active runs (not menus, not sandbox)
  const savableScreens: Screen[] = ['map', 'rest', 'event', 'recruit', 'card_draft', 'battle', 'act_transition', 'card_removal'];
  if (runState && savableScreens.includes(screen)) {
    const saveData: SaveData = { screen, runState, savedAt: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }
}

function loadGame(): SaveData | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      return JSON.parse(saved) as SaveData;
    }
  } catch (e) {
    console.warn('Failed to load save:', e);
  }
  return null;
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('main_menu');
  const [runState, setRunState] = useState<RunState | null>(null);
  const [isSandboxBattle, setIsSandboxBattle] = useState(false);
  const [isRecruitBattle, setIsRecruitBattle] = useState(false);
  const [recruitFighterIndex, setRecruitFighterIndex] = useState<number | null>(null);
  const [recruitBattleResult, setRecruitBattleResult] = useState<'pending' | 'victory' | 'defeat' | null>(null);
  const [sandboxPlayerTeam, setSandboxPlayerTeam] = useState<SandboxPokemon[]>([]);
  const [sandboxEnemyTeam, setSandboxEnemyTeam] = useState<SandboxPokemon[]>([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [lastGoldEarned, setLastGoldEarned] = useState<number | undefined>(undefined);
  const [pendingBattleNodeId, setPendingBattleNodeId] = useState<string | null>(null);
  const battle = useBattle();

  // Check for saved game and prologue status on mount
  useEffect(() => {
    const saved = loadGame();
    setHasSavedGame(saved !== null);
  }, []);

  // Save game whenever screen or runState changes
  useEffect(() => {
    saveGame(screen, runState);
  }, [screen, runState]);

  // Continue saved game
  const handleContinue = useCallback(() => {
    const saved = loadGame();
    if (saved) {
      // Migrate old saves to current format
      const run = saved.runState ? migrateRunState(saved.runState) : null;
      setRunState(run);
      // If saved during battle, go to map instead (can't restore battle state)
      if (saved.screen === 'battle') {
        setScreen('map');
      } else {
        setScreen(saved.screen);
      }
    }
  }, []);

  // Start a new run after party selection
  const handleStart = useCallback((party: PokemonData[], positions: Position[], gold: number) => {
    const run = createRunState(party, positions, Date.now(), gold);
    setRunState(run);
    setScreen('map');
  }, []);

  // Handle node selection on the map
  const handleSelectNode = useCallback((nodeId: string) => {
    if (!runState) return;

    // Check node type before advancing — battle nodes defer moveToNode until victory
    const targetNode = runState.nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    if (targetNode.type === 'battle') {
      // Don't call moveToNode yet — if the game crashes mid-battle,
      // the save retains pre-battle state so the player can retry
      battle.startBattleFromRun(runState, targetNode as BattleNode);
      setPendingBattleNodeId(nodeId);
      setScreen('battle');
      return;
    }

    // For all other node types, advance immediately (grants EXP, marks completed)
    const newRun = moveToNode(runState, nodeId);
    setRunState(newRun);

    const node = getCurrentNode(newRun);
    if (!node) return;

    if (node.type === 'rest') {
      setScreen('rest');
    } else if (node.type === 'event') {
      setScreen('event');
    } else if (node.type === 'act_transition') {
      setScreen('act_transition');
    } else if (node.type === 'card_removal') {
      setScreen('card_removal');
    } else if (node.type === 'recruit') {
      setRecruitBattleResult(null);
      setRecruitFighterIndex(null);
      setIsRecruitBattle(false);
      setScreen('recruit');
    }
    // spawn nodes don't have a screen
  }, [runState, battle]);

  // Handle rest: Chansey heals whole party 30%
  const handleRestHeal = useCallback(() => {
    if (!runState) return;

    const newRun = applyPartyPercentHeal(runState, 0.3);
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle event completion (new data-driven event system)
  const handleEventComplete = useCallback((newRun: RunState) => {
    // Mark the event as seen
    const currentNode = getCurrentNode(newRun);
    const eventId = currentNode?.type === 'event' ? (currentNode as EventNode).eventId : '';
    const updatedRun = eventId && !newRun.seenEventIds.includes(eventId)
      ? { ...newRun, seenEventIds: [...newRun.seenEventIds, eventId] }
      : newRun;

    setRunState(updatedRun);
    setScreen('map');
  }, []);

  // Handle card draft completion (happens after battles)
  const handleDraftComplete = useCallback((drafts: Map<number, string | null>) => {
    if (!runState) return;

    // Add drafted cards to decks
    let newRun = runState;
    drafts.forEach((cardId, pokemonIndex) => {
      if (cardId !== null) {
        newRun = addCardToDeck(newRun, pokemonIndex, cardId);
      }
    });

    setRunState(newRun);

    // Check if run is complete
    if (isRunComplete(newRun)) {
      setScreen('run_victory');
    } else if (newRun.currentNodeId === 'a2-chasm-ghosts') {
      // Special: Gengar offers to revive a fallen ally after the chasm fight
      setScreen('ghost_revive');
    } else {
      setScreen('map');
    }
  }, [runState]);

  // Handle battle end
  const handleBattleEnd = useCallback((result: BattleResult, combatants: Combatant[], combatGoldEarned?: number) => {
    if (!runState) return;

    // Recruit battles: sync HP back to fighter, return to recruit screen
    if (isRecruitBattle && recruitFighterIndex !== null) {
      const playerCombatant = combatants.find(c => c.side === 'player');
      let newParty = runState.party;
      if (playerCombatant) {
        const newHp = Math.max(0, playerCombatant.hp);
        const isKO = newHp <= 0 || !playerCombatant.alive;
        newParty = runState.party.map((p, i) => {
          if (i !== recruitFighterIndex) return p;
          return { ...p, currentHp: newHp, knockedOut: p.knockedOut || isKO };
        });
        let updatedRun = moveKnockedOutToGraveyard({ ...runState, party: newParty });
        setRunState(updatedRun);
        newParty = updatedRun.party;
      }

      // Check for full party wipe
      const allDead = newParty.every(p => p.currentHp <= 0 || p.knockedOut);
      if (allDead) {
        setIsRecruitBattle(false);
        setScreen('run_defeat');
        return;
      }

      setRecruitBattleResult(result === 'victory' ? 'victory' : 'defeat');
      setIsRecruitBattle(false);
      setScreen('recruit');
      return;
    }

    if (result === 'defeat') {
      setPendingBattleNodeId(null);
      setScreen('run_defeat');
      return;
    }

    // Advance the node NOW (deferred from handleSelectNode for battle nodes)
    let newRun = pendingBattleNodeId
      ? moveToNode(runState, pendingBattleNodeId)
      : runState;
    setPendingBattleNodeId(null);

    // Sync HP from battle back to run state, then move KO'd to graveyard
    newRun = syncBattleResults(newRun, combatants);
    newRun = moveKnockedOutToGraveyard(newRun);

    // Award gold for battle
    const currentNode = getCurrentNode(newRun);
    let goldEarned = 0;
    if (currentNode?.type === 'battle') {
      const baseGold = getBattleGoldReward(currentNode as BattleNode, newRun.currentAct);
      goldEarned = applyPickupBonus(newRun, baseGold) + (combatGoldEarned ?? 0);
      newRun = addGold(newRun, goldEarned);
    }

    // Check if this was the final boss (Mewtwo in Act 3)
    if (isRunComplete(newRun)) {
      setScreen('run_victory');
      setRunState(newRun);
    } else if (isAct2Complete(newRun)) {
      // Giovanni defeated in Act 2 - full heal and go to act transition
      newRun = applyFullHealAll(newRun);
      setRunState(newRun);
      setScreen('act_transition');
    } else if (isAct1Complete(newRun)) {
      // Ariana defeated - full heal and go to act transition
      newRun = applyFullHealAll(newRun);
      setRunState(newRun);
      setScreen('act_transition');
    } else {
      setRunState(newRun);
      setLastGoldEarned(goldEarned > 0 ? goldEarned : undefined);
      // Go to card draft after battle
      setScreen('card_draft');
    }
  }, [runState, isRecruitBattle, recruitFighterIndex, pendingBattleNodeId]);

  // Handle card selection during battle
  const handleSelectCard = useCallback((cardIndex: number | null) => {
    if (cardIndex === null || !battle.state) {
      battle.setPendingCardIndex(null);
      return;
    }
    battle.setPendingCardIndex(cardIndex);
  }, [battle]);

  // Handle target selection during battle
  const handleSelectTarget = useCallback((targetId: string) => {
    if (battle.pendingCardIndex !== null) {
      battle.playCard(battle.pendingCardIndex, targetId || undefined);
    }
  }, [battle]);

  // Handle direct card play (for drag-and-drop, bypasses two-step selection)
  const handlePlayCard = useCallback((cardIndex: number, targetId?: string) => {
    battle.playCard(cardIndex, targetId);
  }, [battle]);

  // Handle level-up from map screen
  const handleLevelUp = useCallback((pokemonIndex: number) => {
    if (!runState) return;
    const newRun = applyLevelUp(runState, pokemonIndex);
    setRunState(newRun);
  }, [runState]);

  // Handle shop purchase
  const handlePurchase = useCallback((moveId: string, pokemonIndex: number) => {
    if (!runState) return;
    const item = SHOP_ITEMS.find(i => i.moveId === moveId);
    if (!item) return;
    const afterSpend = spendGold(runState, item.goldCost);
    if (!afterSpend) return;
    const afterAdd = addCardToDeck(afterSpend, pokemonIndex, moveId);
    setRunState(afterAdd);
  }, [runState]);

  // Handle card removal from Hypno's Parlor
  const handleForgetCard = useCallback((pokemonIndex: number, cardIndex: number, source: 'party' | 'bench') => {
    if (!runState) return;
    const afterSpend = spendGold(runState, CARD_FORGET_COST);
    if (!afterSpend) return;
    const afterRemove = source === 'party'
      ? removeCardsFromDeck(afterSpend, pokemonIndex, [cardIndex])
      : removeCardFromBench(afterSpend, pokemonIndex, [cardIndex]);
    setRunState(afterRemove);
  }, [runState]);

  // Handle act transition - continue to next act
  const handleActTransitionContinue = useCallback(() => {
    if (!runState) return;
    let newRun: RunState;
    if (runState.currentAct === 1) {
      newRun = transitionToAct2(runState);
    } else {
      newRun = transitionToAct3(runState);
    }
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle card removal completion
  const handleCardRemovalComplete = useCallback((removals: Map<number, number[]>) => {
    if (!runState) return;

    let newRun = runState;
    removals.forEach((cardIndices, pokemonIndex) => {
      newRun = removeCardsFromDeck(newRun, pokemonIndex, cardIndices);
    });

    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle card removal skip
  const handleCardRemovalSkip = useCallback(() => {
    setScreen('map');
  }, []);

  // Handle swap between party and bench
  const handleSwap = useCallback((partyIndex: number, benchIndex: number) => {
    if (!runState) return;
    const newRun = swapPartyAndBench(runState, partyIndex, benchIndex);
    setRunState(newRun);
  }, [runState]);

  // Handle promoting a bench Pokemon to the active party
  const handlePromote = useCallback((benchIndex: number) => {
    if (!runState) return;
    const emptyPos = findEmptyPosition(runState.party);
    if (!emptyPos) return;
    const newRun = promoteFromBench(runState, benchIndex, emptyPos);
    setRunState(newRun);
  }, [runState]);

  // Handle rearranging party formation (including promote/demote from modal)
  const handleRearrange = useCallback((newParty: RunPokemon[], newBench: RunPokemon[]) => {
    if (!runState) return;
    setRunState({ ...runState, party: newParty, bench: newBench });
  }, [runState]);

  // Handle starting a 1v1 recruit fight
  const handleRecruitFight = useCallback((partyIndex: number) => {
    if (!runState) return;

    const currentNode = getCurrentNode(runState);
    if (!currentNode || currentNode.type !== 'recruit') return;
    const recruitNode = currentNode as RecruitNode;

    const fighter = runState.party[partyIndex];
    const recruitLevel = getRecruitLevel(runState);
    const recruitMon = createRecruitPokemon(recruitNode.pokemonId, recruitLevel);

    // Build enemy data at recruit level with proper HP and deck
    const enemyData = getPokemon(recruitMon.formId);
    const enemyWithHp = {
      ...enemyData,
      maxHp: recruitMon.maxHp,
      deck: [...recruitMon.deck],
    };

    // Start 1v1 battle: fighter vs wild Pokemon (with passives from progression tree)
    const fighterData = getRunPokemonData(fighter);
    battle.startConfiguredBattle(
      [fighterData],
      [enemyWithHp],
      [fighter.position],
      [{ row: 'front', column: 1 }],
      new Map([[0, fighter.passiveIds]]),
      new Map([[0, recruitMon.passiveIds]]),
      new Map([['player-0', { maxHp: fighter.maxHp, startPercent: fighter.currentHp / fighter.maxHp }]])
    );

    setIsRecruitBattle(true);
    setRecruitFighterIndex(partyIndex);
    setRecruitBattleResult('pending');
    setScreen('battle');
  }, [runState, battle]);

  // Handle recruit confirm (add to bench)
  const handleRecruitConfirm = useCallback(() => {
    if (!runState) return;

    const currentNode = getCurrentNode(runState);
    if (!currentNode || currentNode.type !== 'recruit') return;
    const recruitNode = currentNode as RecruitNode;

    const level = getRecruitLevel(runState);
    const matchingExp = Math.min(...runState.party.map(p => p.exp));
    const newPokemon = createRecruitPokemon(recruitNode.pokemonId, level, matchingExp);
    let newRun = recruitToRoster(runState, newPokemon);

    // Mark the node as recruited
    newRun = {
      ...newRun,
      nodes: newRun.nodes.map(n =>
        n.id === recruitNode.id && n.type === 'recruit'
          ? { ...n, recruited: true }
          : n
      ),
    };

    setRunState(newRun);
    setRecruitBattleResult(null);
    setRecruitFighterIndex(null);
    setScreen('map');
  }, [runState]);

  // Handle recruit decline (skip recruitment, back to map)
  const handleRecruitDecline = useCallback(() => {
    setRecruitBattleResult(null);
    setRecruitFighterIndex(null);
    setScreen('map');
  }, []);

  // Return to main menu (preserves save)
  const handleMainMenu = useCallback(() => {
    setScreen('main_menu');
    setHasSavedGame(!!runState);
  }, [runState]);

  // Handle ghost revive (after chasm battle)
  const handleGhostRevive = useCallback((graveyardIndex: number) => {
    if (!runState) return;
    const newRun = reviveFromGraveyard(runState, graveyardIndex, 0.5);
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  const handleGhostReviveSkip = useCallback(() => {
    setScreen('map');
  }, []);

  // Abandon run and return to main menu (clears save)
  const handleRestart = useCallback(() => {
    clearSave();
    setHasSavedGame(false);
    setRunState(null);
    setScreen('main_menu');
  }, []);

  // Go to sandbox configuration screen
  const handleGoToSandbox = useCallback(() => {
    setScreen('sandbox_config');
  }, []);

  // Start a test run at Act 2 with a leveled party
  const handleTestAct2 = useCallback(() => {
    clearSave();
    const run = createAct2TestState();
    setRunState(run);
    setScreen('map');
  }, []);

  // Start a test run at Act 3 with a leveled party
  const handleTestAct3 = useCallback(() => {
    clearSave();
    const run = createAct3TestState();
    setRunState(run);
    setScreen('map');
  }, []);

  // Start a configured sandbox battle
  const handleStartSandboxBattle = useCallback((
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    playerPassives: Map<number, string[]>,
    enemyPassives: Map<number, string[]>,
    hpOverrides: Map<string, { maxHp?: number; startPercent?: number }>
  ) => {
    battle.startConfiguredBattle(
      players, enemies, playerPositions, enemyPositions,
      playerPassives, enemyPassives, hpOverrides
    );
    setIsSandboxBattle(true);
    setScreen('battle');
  }, [battle]);

  // Go back to sandbox config (from sandbox battle)
  const handleBackToSandboxConfig = useCallback(() => {
    setIsSandboxBattle(false);
    setScreen('sandbox_config');
  }, []);

  // Update sandbox config state (called by SandboxConfigScreen)
  const handleSandboxConfigChange = useCallback((playerTeam: SandboxPokemon[], enemyTeam: SandboxPokemon[]) => {
    setSandboxPlayerTeam(playerTeam);
    setSandboxEnemyTeam(enemyTeam);
  }, []);

  // Render based on current screen
  if (screen === 'main_menu') {
    // Stagger index for entrance animations (Continue button shifts indices)
    let menuIdx = 0;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 32,
        color: THEME.text.primary,
        minHeight: '100dvh',
        position: 'relative',
      }}>
        <AmbientBackground />

        {/* Title — fades in and drifts up */}
        <div
          className="menu-title"
          style={{
            fontSize: 68,
            fontWeight: 'bold',
            color: THEME.accent,
            textShadow: '0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(250, 204, 21, 0.15)',
            ...THEME.heading,
            letterSpacing: '0.2em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          POKESPIRE
        </div>

        {/* Flourish — fades in after title */}
        <div className="menu-flourish" style={{ position: 'relative', zIndex: 1 }}>
          <Flourish variant="divider" width={240} color={THEME.text.tertiary} />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          marginTop: 16,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Continue Run — breathing glow */}
          {hasSavedGame && (
            <button
              className={`menu-item menu-item-continue`}
              onClick={handleContinue}
              style={{
                padding: '12px 0',
                fontSize: 22,
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                color: '#22c55e',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                position: 'relative',
                marginBottom: 8,
                animationDelay: `${(menuIdx++) * 50 + 250}ms`,
              }}
            >
              Continue Run
            </button>
          )}
          <button
            className="menu-item"
            onClick={() => {
              clearSave();
              setHasSavedGame(false);
              setScreen('select');
            }}
            style={{
              padding: '12px 0',
              fontSize: 22,
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: THEME.text.primary,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              position: 'relative',
              animationDelay: `${(menuIdx++) * 50 + 250}ms`,
            }}
          >
            {hasSavedGame ? 'New Run' : 'Campaign'}
          </button>
          <button
            className="menu-item"
            onClick={handleGoToSandbox}
            style={{
              padding: '12px 0',
              fontSize: 22,
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: THEME.text.primary,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              position: 'relative',
              animationDelay: `${(menuIdx++) * 50 + 250}ms`,
            }}
          >
            Sandbox
          </button>

          {/* Separator between play and browse */}
          <div className="menu-flourish-sep" style={{
            margin: '8px 0',
            animationDelay: `${(menuIdx) * 50 + 250}ms`,
          }}>
            <Flourish variant="heading" width={120} color={THEME.text.tertiary} />
          </div>

          <button
            className="menu-item menu-item-secondary"
            onClick={() => setScreen('pokedex')}
            style={{
              padding: '10px 0',
              fontSize: 18,
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: THEME.text.secondary,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              position: 'relative',
              animationDelay: `${(menuIdx++) * 50 + 250}ms`,
            }}
          >
            PokeDex
          </button>
          <button
            className="menu-item menu-item-secondary"
            onClick={() => setScreen('card_dex')}
            style={{
              padding: '10px 0',
              fontSize: 18,
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: THEME.text.secondary,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              position: 'relative',
              animationDelay: `${(menuIdx++) * 50 + 250}ms`,
            }}
          >
            Card Dex
          </button>
          <button
            className="menu-item menu-item-tertiary"
            onClick={() => setScreen('disclaimer')}
            style={{
              padding: '8px 0',
              fontSize: 14,
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: THEME.text.tertiary,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              position: 'relative',
              marginTop: 8,
              animationDelay: `${(menuIdx++) * 50 + 250}ms`,
            }}
          >
            Disclaimer
          </button>
          <div className="menu-item" style={{
            display: 'flex',
            gap: 16,
            marginTop: 16,
            animationDelay: `${(menuIdx++) * 50 + 250}ms`,
          }}>
            <button
              className="menu-item-dev"
              onClick={handleTestAct2}
              style={{
                padding: '6px 0',
                fontSize: 14,
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                color: THEME.text.tertiary,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                opacity: 0.6,
                position: 'relative',
              }}
            >
              Test Act 2
            </button>
            <button
              className="menu-item-dev"
              onClick={handleTestAct3}
              style={{
                padding: '6px 0',
                fontSize: 14,
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                color: THEME.text.tertiary,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                opacity: 0.6,
                position: 'relative',
              }}
            >
              Test Act 3
            </button>
            <button
              className="menu-item-dev"
              onClick={() => setScreen('event_tester')}
              style={{
                padding: '6px 0',
                fontSize: 14,
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                color: THEME.text.tertiary,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                opacity: 0.6,
                position: 'relative',
              }}
            >
              Event Tester
            </button>
          </div>
        </div>

        {/* Menu animations */}
        <style>{`
          /* Title entrance */
          .menu-title {
            animation: menuTitleIn 0.7s ease-out forwards;
            opacity: 0;
          }
          @keyframes menuTitleIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Flourish entrance */
          .menu-flourish {
            animation: menuFadeIn 0.4s ease-out 0.2s forwards;
            opacity: 0;
          }
          .menu-flourish-sep {
            animation: menuFadeIn 0.3s ease-out forwards;
            animation-delay: inherit;
            opacity: 0;
          }
          @keyframes menuFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Menu item staggered entrance */
          .menu-item {
            animation: menuItemIn 0.3s ease-out forwards;
            opacity: 0;
          }
          @keyframes menuItemIn {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Hover flourish lines extending from text */
          .menu-item::before,
          .menu-item::after {
            content: '';
            position: absolute;
            top: 50%;
            height: 1px;
            background: ${THEME.accent};
            opacity: 0;
            transition: all 0.3s ease-out;
            transform: translateY(-50%);
          }
          .menu-item::before {
            right: 100%;
            width: 0;
            margin-right: 12px;
          }
          .menu-item::after {
            left: 100%;
            width: 0;
            margin-left: 12px;
          }
          .menu-item:hover::before,
          .menu-item:hover::after {
            width: 32px;
            opacity: 0.5;
          }

          /* Hover glow for menu items */
          .menu-item:hover {
            color: ${THEME.accent} !important;
            text-shadow: 0 0 12px rgba(250, 204, 21, 0.4);
          }
          .menu-item-secondary:hover {
            color: ${THEME.accent} !important;
            text-shadow: 0 0 12px rgba(250, 204, 21, 0.4);
          }
          .menu-item-tertiary:hover {
            color: ${THEME.accent} !important;
            text-shadow: 0 0 12px rgba(250, 204, 21, 0.4);
          }
          .menu-item-dev {
            transition: all 0.2s;
          }
          .menu-item-dev:hover {
            color: ${THEME.accent} !important;
            text-shadow: 0 0 12px rgba(250, 204, 21, 0.4);
            opacity: 1 !important;
          }

          /* Continue Run breathing glow */
          .menu-item-continue {
            text-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
            animation: menuItemIn 0.3s ease-out forwards, continueBreathe 3s ease-in-out 1s infinite !important;
          }
          .menu-item-continue:hover {
            color: ${THEME.accent} !important;
            text-shadow: 0 0 12px rgba(250, 204, 21, 0.4) !important;
          }
          @keyframes continueBreathe {
            0%, 100% {
              text-shadow: 0 0 12px rgba(34, 197, 94, 0.25);
            }
            50% {
              text-shadow: 0 0 24px rgba(34, 197, 94, 0.6), 0 0 48px rgba(34, 197, 94, 0.2);
            }
          }
        `}</style>
      </div>
    );
  }

  if (screen === 'card_dex') {
    return <CardDexScreen onBack={() => setScreen('main_menu')} />;
  }

  if (screen === 'pokedex') {
    return <PokeDexScreen onBack={() => setScreen('main_menu')} />;
  }

  if (screen === 'disclaimer') {
    return (
      <ScreenShell
        ambient
        header={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: `1px solid ${THEME.border.subtle}`,
          }}>
            <button
              onClick={() => setScreen('main_menu')}
              style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}
            >
              &larr; Back
            </button>
            <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
              Disclaimer
            </h1>
            <div style={{ width: 80 }} />
          </div>
        }
      >
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 64px' }}>
          <DexFrame>
            <div className="disc-content" style={{
              padding: '28px 32px 36px',
              lineHeight: 1.7,
              color: THEME.text.secondary,
              fontSize: 14,
            }}>
              <DisclaimerSection title="Fan Project Notice" first>
                Pokespire is an unofficial, non-commercial fan project created for educational
                and entertainment purposes only. It is not affiliated with, endorsed by, sponsored by,
                or in any way officially connected to Nintendo, The Pokemon Company, Game Freak,
                or Creatures Inc.
              </DisclaimerSection>

              <DisclaimerSection title="Intellectual Property">
                <p style={{ margin: '0 0 8px' }}>
                  Pokemon, the Pokemon logo, and all related character names, artwork, and trademarks
                  are the intellectual property of Nintendo, The Pokemon Company, Game Freak, and
                  Creatures Inc. All rights to these properties are reserved by their respective owners.
                </p>
                <p style={{ margin: 0 }}>
                  This project uses Pokemon names, types, move names, and game mechanics as references
                  to create a fan-made experience. No copyright or trademark infringement is intended.
                </p>
              </DisclaimerSection>

              <DisclaimerSection title="Non-Commercial Use">
                This project is provided entirely free of charge. It is not sold, licensed, or
                monetized in any form. No donations, subscriptions, or payments of any kind are
                accepted. The source code is made available solely for educational and personal use.
              </DisclaimerSection>

              <DisclaimerSection title="No Distribution of Copyrighted Assets">
                This project does not distribute, bundle, or host any copyrighted artwork, sprites,
                music, or other media assets owned by the rights holders. Any visual or audio assets
                used are either original creations or sourced from publicly available community
                resources under applicable fair-use terms.
              </DisclaimerSection>

              <DisclaimerSection title="Disclaimer of Liability">
                This project is provided &ldquo;as is&rdquo; without warranty of any kind, express or implied.
                The authors assume no responsibility or liability for any consequences arising from
                the use or misuse of this project.
              </DisclaimerSection>

              <DisclaimerSection title="Takedown" last>
                If any rights holder has concerns about this project, please open an issue on
                the repository or contact the maintainer directly. The project will be modified
                or removed promptly upon request.
              </DisclaimerSection>
            </div>
          </DexFrame>
        </div>

        <style>{`
          .disc-content {
            animation: discIn 0.25s ease-out forwards;
            opacity: 0;
          }
          @keyframes discIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </ScreenShell>
    );
  }

  if (screen === 'sandbox_config') {
    return (
      <SandboxConfigScreen
        onStartBattle={handleStartSandboxBattle}
        onBack={() => setScreen('main_menu')}
        initialPlayerTeam={sandboxPlayerTeam}
        initialEnemyTeam={sandboxEnemyTeam}
        onConfigChange={handleSandboxConfigChange}
      />
    );
  }

if (screen === 'select') {
    return <PartySelectScreen onStart={handleStart} onRestart={handleRestart} />;
  }

  if (screen === 'map' && runState) {
    return (
      <MapScreen
        run={runState}
        onSelectNode={handleSelectNode}
        onLevelUp={handleLevelUp}
        onSwap={handleSwap}
        onPromote={handlePromote}
        onRearrange={handleRearrange}
        onPurchase={handlePurchase}
        onForgetCard={handleForgetCard}
        onRestart={handleMainMenu}
      />
    );
  }

  if (screen === 'rest' && runState) {
    return (
      <RestScreen
        run={runState}
        onHeal={handleRestHeal}
        onRestart={handleMainMenu}
      />
    );
  }

  if (screen === 'event' && runState) {
    const currentNode = getCurrentNode(runState);
    const eventId = currentNode?.type === 'event' ? (currentNode as EventNode).eventId : 'training_camp';
    return (
      <EventScreen
        run={runState}
        eventId={eventId}
        onComplete={handleEventComplete}
        onRestart={handleMainMenu}
      />
    );
  }

  if (screen === 'event_tester') {
    return <EventTesterScreen onBack={() => setScreen('main_menu')} />;
  }

  if (screen === 'ghost_revive' && runState) {
    return (
      <GhostReviveScreen
        run={runState}
        onRevive={handleGhostRevive}
        onSkip={handleGhostReviveSkip}
      />
    );
  }

  if (screen === 'recruit' && runState) {
    const currentNode = getCurrentNode(runState);
    if (currentNode?.type === 'recruit') {
      return (
        <RecruitScreen
          run={runState}
          node={currentNode as RecruitNode}
          battleResult={recruitBattleResult}
          onStartFight={handleRecruitFight}
          onRecruit={handleRecruitConfirm}
          onDecline={handleRecruitDecline}
          onRestart={handleMainMenu}
        />
      );
    }
    // Fallback to map if node not found
    setScreen('map');
    return null;
  }

  if (screen === 'card_draft' && runState) {
    return (
      <CardDraftScreen
        run={runState}
        onDraftComplete={handleDraftComplete}
        onRestart={handleMainMenu}
        goldEarned={lastGoldEarned}
      />
    );
  }

  if (screen === 'battle' && battle.state) {
    return (
      <BattleScreen
        state={battle.state}
        phase={battle.phase}
        logs={battle.logs}
        pendingCardIndex={battle.pendingCardIndex}
        onSelectCard={handleSelectCard}
        onSelectTarget={handleSelectTarget}
        onPlayCard={handlePlayCard}
        onEndTurn={battle.endPlayerTurn}
        onSwitchPosition={battle.switchPosition}
        onRestart={handleMainMenu}
        onBattleEnd={handleBattleEnd}
        runState={runState ?? undefined}
        onBackToSandboxConfig={isSandboxBattle ? handleBackToSandboxConfig : undefined}
      />
    );
  }

  if (screen === 'act_transition' && runState) {
    return (
      <ActTransitionScreen
        run={runState}
        onContinue={handleActTransitionContinue}
        onRestart={handleMainMenu}
      />
    );
  }

  if (screen === 'card_removal' && runState) {
    const cardRemovalNode = getCurrentCardRemovalNode(runState);
    if (cardRemovalNode) {
      return (
        <CardRemovalScreen
          run={runState}
          node={cardRemovalNode}
          onComplete={handleCardRemovalComplete}
          onSkip={handleCardRemovalSkip}
          onRestart={handleMainMenu}
        />
      );
    }
    // Fallback to map if node not found
    setScreen('map');
    return null;
  }

  if (screen === 'run_victory' && runState) {
    return <RunVictoryScreen run={runState} onNewRun={handleRestart} />;
  }

  if (screen === 'run_defeat') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 32,
        color: THEME.text.primary,
        minHeight: '100dvh',
        background: THEME.bg.base,
      }}>
        <div style={{
          fontSize: 64,
          fontWeight: 'bold',
          color: '#ef4444',
          letterSpacing: THEME.heading.letterSpacing,
        }}>
          RUN OVER
        </div>
        <Flourish variant="heading" color="#ef4444" />
        <div style={{
          fontSize: 24,
          color: THEME.text.secondary,
          textAlign: 'center',
        }}>
          Your party was defeated...
        </div>
        <button
          onClick={handleRestart}
          style={{
            padding: '16px 48px',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 8,
            border: 'none',
            background: THEME.accent,
            color: '#000',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Fallback: Unknown state - show debug info instead of blank screen
  const debugState = {
    screen,
    hasRunState: runState !== null,
    runState: runState ? {
      currentAct: runState.currentAct,
      currentNodeId: runState.currentNodeId,
      partySize: runState.party.length,
      party: runState.party.map(p => ({
        formId: p.formId,
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        knockedOut: p.knockedOut,
      })),
    } : null,
    hasBattleState: battle.state !== null,
    battlePhase: battle.phase,
    isSandboxBattle,
  };

  const copyDebugInfo = () => {
    const fullDebug = {
      ...debugState,
      fullRunState: runState,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(fullDebug, null, 2));
    alert('Debug info copied to clipboard!');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 32,
      color: THEME.text.primary,
      minHeight: '100dvh',
      background: THEME.bg.base,
    }}>
      <div style={{
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f59e0b',
      }}>
        Unexpected State
      </div>
      <div style={{
        fontSize: 16,
        color: THEME.text.secondary,
        textAlign: 'center',
        maxWidth: 500,
      }}>
        The game reached an unexpected state. This info can help debug the issue:
      </div>
      <pre style={{
        background: THEME.bg.panel,
        padding: 16,
        borderRadius: 8,
        fontSize: 12,
        color: '#a5f3fc',
        maxWidth: '90vw',
        overflow: 'auto',
        maxHeight: 300,
      }}>
        {JSON.stringify(debugState, null, 2)}
      </pre>
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={copyDebugInfo}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            border: `2px solid ${THEME.border.bright}`,
            background: 'transparent',
            color: THEME.text.secondary,
            cursor: 'pointer',
          }}
        >
          Copy Debug Info
        </button>
        <button
          onClick={handleRestart}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            border: 'none',
            background: THEME.accent,
            color: '#000',
            cursor: 'pointer',
          }}
        >
          Return to Menu
        </button>
      </div>
      {hasSavedGame && (
        <button
          onClick={handleContinue}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            border: '2px solid #22c55e',
            background: 'transparent',
            color: '#22c55e',
            cursor: 'pointer',
          }}
        >
          Try to Recover from Save
        </button>
      )}
    </div>
  );
}

// ── Disclaimer Section ──────────────────────────────────────────────

function DisclaimerSection({ title, children, first, last }: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
        ...(first ? {} : { marginTop: 20, paddingTop: 16, borderTop: `1px solid ${THEME.border.subtle}` }),
      }}>
        <div style={{
          width: 4,
          height: 4,
          background: THEME.border.medium,
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }} />
        <h2 style={{
          margin: 0,
          fontSize: 14,
          color: THEME.text.primary,
          ...THEME.heading,
          letterSpacing: '0.08em',
        }}>
          {title}
        </h2>
      </div>
      <div style={{ paddingLeft: 14 }}>
        {children}
      </div>
    </div>
  );
}
