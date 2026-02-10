import { useState, useCallback, useEffect } from 'react';
import type { PokemonData, Position, Combatant } from './engine/types';
import { useBattle } from './ui/hooks/useBattle';
import { PartySelectScreen } from './ui/screens/PartySelectScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import type { BattleResult } from './ui/screens/BattleScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { RestScreen } from './ui/screens/RestScreen';
import { CardDraftScreen } from './ui/screens/CardDraftScreen';
import { RunVictoryScreen } from './ui/screens/RunVictoryScreen';
import { CardDexScreen } from './ui/screens/CardDexScreen';
import { PokeDexScreen } from './ui/screens/PokeDexScreen';
import { SandboxConfigScreen } from './ui/screens/SandboxConfigScreen';
import { ActTransitionScreen } from './ui/screens/ActTransitionScreen';
import { CardRemovalScreen } from './ui/screens/CardRemovalScreen';
import { Flourish } from './ui/components/Flourish';
import { THEME } from './ui/theme';
import type { SandboxPokemon } from './ui/screens/SandboxConfigScreen';
import type { RunState, BattleNode } from './run/types';
import {
  createRunState,
  applyPercentHeal,
  applyFullHealAll,
  applyMaxHpBoost,
  applyExpBoost,
  addCardToDeck,
  syncBattleResults,
  moveToNode,
  isRunComplete,
  isAct1Complete,
  getCurrentNode,
  applyLevelUp,
  transitionToAct2,
  removeCardsFromDeck,
  getCurrentCardRemovalNode,
} from './run/state';

type Screen = 'main_menu' | 'select' | 'map' | 'rest' | 'card_draft' | 'battle' | 'run_victory' | 'run_defeat' | 'card_dex' | 'pokedex' | 'sandbox_config' | 'act_transition' | 'card_removal';

// localStorage keys
const SAVE_KEY = 'pokespire_save';

interface SaveData {
  screen: Screen;
  runState: RunState | null;
  savedAt: number;
}

function saveGame(screen: Screen, runState: RunState | null) {
  // Only save during active runs (not menus, not sandbox)
  const savableScreens: Screen[] = ['map', 'rest', 'card_draft', 'battle', 'act_transition', 'card_removal'];
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
  const [sandboxPlayerTeam, setSandboxPlayerTeam] = useState<SandboxPokemon[]>([]);
  const [sandboxEnemyTeam, setSandboxEnemyTeam] = useState<SandboxPokemon[]>([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);
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
      setRunState(saved.runState);
      // If saved during battle, go to map instead (can't restore battle state)
      if (saved.screen === 'battle') {
        setScreen('map');
      } else {
        setScreen(saved.screen);
      }
    }
  }, []);

  // Start a new run after party selection
  const handleStart = useCallback((party: PokemonData[], positions: Position[]) => {
    const run = createRunState(party, positions, Date.now());
    setRunState(run);
    setScreen('map');
  }, []);

  // Handle node selection on the map
  const handleSelectNode = useCallback((nodeId: string) => {
    if (!runState) return;

    // Move to the selected node (grants EXP, marks completed)
    const newRun = moveToNode(runState, nodeId);
    setRunState(newRun);

    // Get the node type to determine next screen
    const node = getCurrentNode(newRun);
    if (!node) return;

    if (node.type === 'rest') {
      setScreen('rest');
    } else if (node.type === 'battle') {
      battle.startBattleFromRun(newRun, node as BattleNode);
      setScreen('battle');
    } else if (node.type === 'act_transition') {
      setScreen('act_transition');
    } else if (node.type === 'card_removal') {
      setScreen('card_removal');
    }
    // spawn nodes don't do anything special, just stay on map
  }, [runState, battle]);

  // Handle rest choice: heal 30%
  const handleRestHeal = useCallback((pokemonIndex: number) => {
    if (!runState) return;

    const newRun = applyPercentHeal(runState, pokemonIndex, 0.3);
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle rest choice: +5 max HP (and current HP)
  const handleRestTrain = useCallback((pokemonIndex: number) => {
    if (!runState) return;

    const newRun = applyMaxHpBoost(runState, pokemonIndex, 5);
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle rest choice: +1 EXP
  const handleRestMeditate = useCallback((pokemonIndex: number) => {
    if (!runState) return;

    const newRun = applyExpBoost(runState, pokemonIndex, 1);
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

  // Handle rest choice: forget cards (remove from deck)
  const handleRestForget = useCallback((removals: Map<number, number[]>) => {
    if (!runState) return;

    let newRun = runState;
    removals.forEach((cardIndices, pokemonIndex) => {
      newRun = removeCardsFromDeck(newRun, pokemonIndex, cardIndices);
    });
    setRunState(newRun);
    setScreen('map');
  }, [runState]);

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
    } else {
      setScreen('map');
    }
  }, [runState]);

  // Handle battle end
  const handleBattleEnd = useCallback((result: BattleResult, combatants: Combatant[]) => {
    if (!runState) return;

    if (result === 'defeat') {
      setScreen('run_defeat');
      return;
    }

    // Sync HP from battle back to run state
    let newRun = syncBattleResults(runState, combatants);

    // Check if this was the final boss (Mewtwo in Act 2)
    if (isRunComplete(newRun)) {
      setScreen('run_victory');
      setRunState(newRun);
    } else if (isAct1Complete(newRun)) {
      // Giovanni defeated - full heal and go to act transition
      newRun = applyFullHealAll(newRun);
      setRunState(newRun);
      setScreen('act_transition');
    } else {
      setRunState(newRun);
      // Go to card draft after battle
      setScreen('card_draft');
    }
  }, [runState]);

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

  // Handle act transition - continue to Act 2
  const handleActTransitionContinue = useCallback(() => {
    if (!runState) return;
    const newRun = transitionToAct2(runState);
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

  // Restart to main menu
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
    const menuTextStyle: React.CSSProperties = {
      padding: '12px 0',
      fontSize: 22,
      fontWeight: 'bold',
      border: 'none',
      background: 'transparent',
      color: THEME.text.primary,
      cursor: 'pointer',
      letterSpacing: '0.08em',
      transition: 'all 0.2s',
      position: 'relative',
    };
    const secondaryMenuStyle: React.CSSProperties = {
      ...menuTextStyle,
      fontSize: 18,
      color: THEME.text.secondary,
    };
    const hoverIn = (e: React.MouseEvent) => {
      const t = e.currentTarget as HTMLElement;
      t.style.color = THEME.accent;
      t.style.textShadow = `0 0 12px rgba(250, 204, 21, 0.4)`;
    };
    const hoverOut = (e: React.MouseEvent, isSecondary = false) => {
      const t = e.currentTarget as HTMLElement;
      t.style.color = isSecondary ? THEME.text.secondary : THEME.text.primary;
      t.style.textShadow = 'none';
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
        minHeight: '100vh',
        background: THEME.bg.base,
      }}>
        <div style={{
          fontSize: 68,
          fontWeight: 'bold',
          color: THEME.accent,
          textShadow: '0 0 20px rgba(250, 204, 21, 0.5)',
          letterSpacing: '0.2em',
          ...THEME.heading,
        }}>
          POKESPIRE
        </div>

        <Flourish variant="divider" width={240} color={THEME.text.tertiary} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          marginTop: 16,
        }}>
          {hasSavedGame && (
            <button
              onClick={handleContinue}
              onMouseEnter={hoverIn}
              onMouseLeave={(e) => {
                const t = e.currentTarget as HTMLElement;
                t.style.color = '#22c55e';
                t.style.textShadow = 'none';
              }}
              style={{
                ...menuTextStyle,
                color: '#22c55e',
                border: `1px solid ${THEME.border.subtle}`,
                borderRadius: 8,
                padding: '12px 48px',
                marginBottom: 8,
              }}
            >
              Continue Run
            </button>
          )}
          <button
            onClick={() => {
              clearSave();
              setHasSavedGame(false);
              setScreen('select');
            }}
            onMouseEnter={hoverIn}
            onMouseLeave={(e) => hoverOut(e)}
            style={menuTextStyle}
          >
            {hasSavedGame ? 'New Run' : 'Campaign'}
          </button>
          <button
            onClick={handleGoToSandbox}
            onMouseEnter={hoverIn}
            onMouseLeave={(e) => hoverOut(e, true)}
            style={secondaryMenuStyle}
          >
            Sandbox
          </button>
          <button
            onClick={() => setScreen('pokedex')}
            onMouseEnter={hoverIn}
            onMouseLeave={(e) => hoverOut(e, true)}
            style={secondaryMenuStyle}
          >
            PokeDex
          </button>
          <button
            onClick={() => setScreen('card_dex')}
            onMouseEnter={hoverIn}
            onMouseLeave={(e) => hoverOut(e, true)}
            style={secondaryMenuStyle}
          >
            Card Dex
          </button>
        </div>
        <div style={{
          fontSize: 14,
          color: THEME.text.tertiary,
          marginTop: 16,
          textAlign: 'center',
        }}>
          Browse Pokemon stats, decks, and progression trees
        </div>
      </div>
    );
  }

  if (screen === 'card_dex') {
    return <CardDexScreen onBack={() => setScreen('main_menu')} />;
  }

  if (screen === 'pokedex') {
    return <PokeDexScreen onBack={() => setScreen('main_menu')} />;
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
        onRestart={handleRestart}
      />
    );
  }

  if (screen === 'rest' && runState) {
    return (
      <RestScreen
        run={runState}
        onHeal={handleRestHeal}
        onTrain={handleRestTrain}
        onMeditate={handleRestMeditate}
        onForget={handleRestForget}
        onRestart={handleRestart}
      />
    );
  }

  if (screen === 'card_draft' && runState) {
    return (
      <CardDraftScreen
        run={runState}
        onDraftComplete={handleDraftComplete}
        onRestart={handleRestart}
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
        onRestart={handleRestart}
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
        minHeight: '100vh',
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
      minHeight: '100vh',
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
