import { useState, useEffect } from 'react';
import { IntroScreen } from './ui/screens/IntroScreen';
import { PlayerSetupScreen } from './ui/screens/PlayerSetupScreen';
import { StarterSelectionScreen } from './ui/screens/StarterSelectionScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { CombatScreen } from './ui/screens/CombatScreen';
import { VictoryScreen } from './ui/screens/VictoryScreen';
import { DefeatScreen } from './ui/screens/DefeatScreen';
import { useGameState } from './ui/hooks/useGameState';
import type { PokemonId } from './config/pokemon';
import './App.css';

function App() {
  const gameState = useGameState();
  const [screen, setScreen] = useState<'intro' | 'playerSetup' | 'starterSelection' | 'game'>(() => {
    // If there's a saved game, start in game mode
    if (gameState.gameState.screen === 'map' || gameState.gameState.screen === 'combat' || 
        gameState.gameState.screen === 'victory' || gameState.gameState.screen === 'defeat') {
      return 'game';
    }
    return 'intro';
  });
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);

  // Check if there's a saved game
  const hasSavedGame = gameState.gameState.screen !== 'intro' && 
    (gameState.gameState.campaign !== undefined || gameState.gameState.battle !== undefined);

  const handleStart = () => {
    // If there's a saved game, resume it
    if (hasSavedGame) {
      setScreen('game');
    } else {
      setScreen('playerSetup');
    }
  };

  const handleReset = () => {
    gameState.handleResetGame();
    setScreen('intro');
    setPlayers([]);
  };

  const handlePlayerSetupContinue = (setupPlayers: Array<{ id: string; name: string }>) => {
    setPlayers(setupPlayers);
    setScreen('starterSelection');
  };

  const handleStarterSelection = (selections: Record<string, PokemonId>) => {
    const playersWithPokemon = players.map(p => ({
      id: p.id,
      name: p.name,
      pokemonId: selections[p.id],
    }));
    gameState.handleStartCampaign(playersWithPokemon);
    setScreen('game');
  };

  const handleBack = () => {
    if (screen === 'playerSetup') {
      setScreen('intro');
    } else if (screen === 'starterSelection') {
      setScreen('playerSetup');
    }
  };

  if (screen === 'intro') {
    return (
      <IntroScreen
        onStart={handleStart}
        onReset={handleReset}
        hasSavedGame={hasSavedGame}
      />
    );
  }

  if (screen === 'playerSetup') {
    return (
      <PlayerSetupScreen
        onContinue={handlePlayerSetupContinue}
        onBack={handleBack}
      />
    );
  }

  if (screen === 'starterSelection') {
    return (
      <StarterSelectionScreen
        players={players}
        onStart={handleStarterSelection}
        onBack={handleBack}
      />
    );
  }

  // Game screens
  if (screen === 'game') {
    const { gameState: state } = gameState;

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:97',message:'App render - game screen routing',data:{screen:state.screen,hasBattle:!!state.battle,hasCampaign:!!state.campaign,battleResult:state.battle?.result,hasError:!!state.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Error modal
    if (state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '600px',
              color: 'white',
              border: '2px solid #ef4444',
            }}
          >
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>
              Game Error
            </h2>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              An error occurred while processing your action. The game state has not been changed.
            </p>
            <p style={{ marginBottom: '24px', fontSize: '14px', color: '#9ca3af', fontFamily: 'monospace', backgroundColor: '#111827', padding: '12px', borderRadius: '6px' }}>
              {state.error}
            </p>
            <p style={{ marginBottom: '24px', fontSize: '14px', color: '#9ca3af' }}>
              Please check the browser console for more details.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  // Clear error and continue
                  gameState.handleClearError?.();
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  // Clear error by resetting game state
                  gameState.handleResetGame();
                  setScreen('intro');
                  setPlayers([]);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (state.screen === 'map' && state.campaign) {
      return (
        <MapScreen
          campaignState={state.campaign}
          onNodeClick={gameState.handleNodeClick}
        />
      );
    }

    if (state.screen === 'combat' && state.battle) {
      return (
        <CombatScreen
          battleState={state.battle}
          onAction={gameState.handleBattleAction}
          onBattleEnd={gameState.handleBattleEnd}
          onResetGame={() => {
            gameState.handleResetGame();
            setScreen('intro');
            setPlayers([]);
          }}
        />
      );
    }

    if (state.screen === 'combat' && !state.battle) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/052177c7-b559-47bb-b50f-ee17a791e993',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:115',message:'CRITICAL: combat screen but no battle state',data:{screen:state.screen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return <div style={{padding:'20px',color:'white'}}>Error: Combat screen but no battle state</div>;
    }

    if (state.screen === 'victory') {
      return (
        <VictoryScreen
          isFinalVictory={state.isFinalVictory || false}
          evolutions={state.evolutions}
          onContinue={gameState.handleContinueFromVictory}
        />
      );
    }

    if (state.screen === 'defeat') {
      return <DefeatScreen onReturnToMenu={gameState.handleReturnToMenu} />;
    }
  }

  return <div>Unknown screen state</div>;
}

export default App;
