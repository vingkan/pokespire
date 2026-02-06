import { useState, useCallback } from 'react';
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
import { SandboxConfigScreen } from './ui/screens/SandboxConfigScreen';
import type { SandboxPokemon } from './ui/screens/SandboxConfigScreen';
import type { RunState, BattleNode } from './run/types';
import {
  createRunState,
  applyPercentHeal,
  applyMaxHpBoost,
  applyExpBoost,
  addCardToDeck,
  syncBattleResults,
  moveToNode,
  isRunComplete,
  getCurrentNode,
  applyLevelUp,
} from './run/state';

type Screen = 'main_menu' | 'select' | 'map' | 'rest' | 'card_draft' | 'battle' | 'run_victory' | 'run_defeat' | 'card_dex' | 'sandbox_config';

export default function App() {
  const [screen, setScreen] = useState<Screen>('main_menu');
  const [runState, setRunState] = useState<RunState | null>(null);
  const [isSandboxBattle, setIsSandboxBattle] = useState(false);
  const [sandboxPlayerTeam, setSandboxPlayerTeam] = useState<SandboxPokemon[]>([]);
  const [sandboxEnemyTeam, setSandboxEnemyTeam] = useState<SandboxPokemon[]>([]);
  const battle = useBattle();

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
    const newRun = syncBattleResults(runState, combatants);
    setRunState(newRun);

    // Check if this was the final boss
    if (isRunComplete(newRun)) {
      setScreen('run_victory');
    } else {
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

  // Restart to main menu
  const handleRestart = useCallback(() => {
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
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 32,
        color: '#e2e8f0',
        minHeight: '100vh',
        background: '#0f0f17',
      }}>
        <div style={{
          fontSize: 64,
          fontWeight: 'bold',
          color: '#facc15',
          textShadow: '0 0 20px rgba(250, 204, 21, 0.5)',
        }}>
          POKESPIRE
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginTop: 32,
        }}>
          <button
            onClick={() => setScreen('select')}
            style={{
              padding: '16px 64px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 8,
              border: 'none',
              background: '#facc15',
              color: '#000',
              cursor: 'pointer',
              minWidth: 200,
            }}
          >
            Campaign
          </button>
          <button
            onClick={handleGoToSandbox}
            style={{
              padding: '16px 64px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 8,
              border: '2px solid #64748b',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              minWidth: 200,
            }}
          >
            Sandbox
          </button>
          <button
            onClick={() => setScreen('card_dex')}
            style={{
              padding: '16px 64px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 8,
              border: '2px solid #64748b',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              minWidth: 200,
            }}
          >
            Card Dex
          </button>
        </div>
        <div style={{
          fontSize: 14,
          color: '#64748b',
          marginTop: 16,
          textAlign: 'center',
        }}>
          Sandbox: Configure custom battles for testing
        </div>
      </div>
    );
  }

  if (screen === 'card_dex') {
    return <CardDexScreen onBack={() => setScreen('main_menu')} />;
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
        color: '#e2e8f0',
        minHeight: '100vh',
        background: '#0f0f17',
      }}>
        <div style={{
          fontSize: 64,
          fontWeight: 'bold',
          color: '#ef4444',
        }}>
          RUN OVER
        </div>
        <div style={{
          fontSize: 24,
          color: '#94a3b8',
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
            background: '#facc15',
            color: '#000',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}
