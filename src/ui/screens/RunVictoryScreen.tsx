import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  onNewRun: () => void;
}

export function RunVictoryScreen({ run, onNewRun }: Props) {
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
      overflowY: 'auto',
      background: '#0f0f17',
      position: 'relative',
    }}>
      <button
        onClick={onNewRun}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 16px',
          fontSize: 13,
          borderRadius: 6,
          border: '1px solid ' + THEME.border.bright,
          background: 'transparent',
          color: THEME.text.secondary,
          cursor: 'pointer',
        }}
      >
        Main Menu
      </button>

      <div style={{
        fontSize: 68,
        fontWeight: 'bold',
        color: '#facc15',
        textShadow: '0 0 30px #facc1555',
        letterSpacing: THEME.heading.letterSpacing,
      }}>
        VICTORY!
      </div>

      <div style={{
        fontSize: 26,
        color: THEME.text.secondary,
        textAlign: 'center',
      }}>
        You completed the run!
      </div>

      {/* Final Party State */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: 24,
        background: '#1e1e2e',
        borderRadius: 12,
        border: '2px solid #facc15',
      }}>
        {run.party.map((pokemon, i) => {
          const basePokemon = getPokemon(pokemon.formId);
          const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
          const isDead = pokemon.currentHp <= 0;

          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              opacity: isDead ? 0.4 : 1,
            }}>
              <img
                src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                alt={basePokemon.name}
                style={{
                  width: 80,
                  height: 80,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  filter: isDead ? 'grayscale(100%)' : 'none',
                }}
              />
              <div style={{ fontSize: 15, fontWeight: 'bold' }}>{basePokemon.name}</div>
              <div style={{
                width: 80,
                height: 8,
                background: THEME.border.subtle,
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                  borderRadius: 4,
                }} />
              </div>
              <div style={{ fontSize: 12, color: THEME.text.secondary }}>
                {pokemon.currentHp}/{pokemon.maxHp} HP
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary }}>
                {pokemon.deck.length} cards
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNewRun}
        style={{
          padding: '16px 48px',
          fontSize: 20,
          fontWeight: 'bold',
          borderRadius: 8,
          border: 'none',
          background: '#facc15',
          color: '#000',
          cursor: 'pointer',
          marginTop: 16,
        }}
      >
        New Run
      </button>
    </div>
  );
}
