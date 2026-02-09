import type { RunState, EventNode } from '../../run/types';
import { getPokemon } from '../../data/loaders';

interface Props {
  run: RunState;
  event: EventNode;
  onSelectPokemon: (pokemonIndex: number) => void;
}

export function EventScreen({ run, event, onSelectPokemon }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: 32,
      color: '#e2e8f0',
      minHeight: '100vh',
      overflowY: 'auto',
      background: '#0f0f17',
    }}>
      <h1 style={{ fontSize: 30, margin: 0, color: '#facc15' }}>
        Event: HP Boost
      </h1>

      <div style={{
        padding: 16,
        background: '#2d2d3f',
        borderRadius: 12,
        border: '2px solid #22c55e',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>+{event.hpBoost}</div>
        <div style={{ fontSize: 15, color: '#94a3b8' }}>Max HP & Heal</div>
      </div>

      <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center' }}>
        Choose a Pokemon to receive +{event.hpBoost} max HP and heal +{event.hpBoost} HP
      </p>

      {/* Pokemon Selection */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {run.party.map((pokemon, i) => {
          const basePokemon = getPokemon(pokemon.formId);
          const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
          const isDead = pokemon.currentHp <= 0;
          const newMaxHp = pokemon.maxHp + event.hpBoost;
          const newCurrentHp = Math.min(pokemon.currentHp + event.hpBoost, newMaxHp);

          return (
            <div
              key={i}
              onClick={() => !isDead && onSelectPokemon(i)}
              style={{
                width: 160,
                padding: 16,
                borderRadius: 12,
                border: isDead ? '3px solid #333' : '3px solid #22c55e',
                background: isDead ? '#1a1a24' : '#1e1e2e',
                cursor: isDead ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: isDead ? 0.4 : 1,
                transition: 'all 0.2s',
              }}
            >
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

              <div style={{ fontSize: 17, fontWeight: 'bold', marginTop: 8 }}>
                {basePokemon.name}
              </div>

              {/* Current HP */}
              <div style={{
                width: '100%',
                height: 8,
                background: '#333',
                borderRadius: 4,
                overflow: 'hidden',
                marginTop: 8,
              }}>
                <div style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                  borderRadius: 4,
                }} />
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {pokemon.currentHp}/{pokemon.maxHp} HP
              </div>

              {/* Preview */}
              {!isDead && (
                <div style={{
                  marginTop: 12,
                  padding: 8,
                  background: '#22c55e22',
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div style={{ color: '#22c55e', fontWeight: 'bold' }}>After:</div>
                  <div style={{ color: '#94a3b8' }}>
                    {newCurrentHp}/{newMaxHp} HP
                  </div>
                </div>
              )}

              {isDead && (
                <div style={{
                  marginTop: 12,
                  padding: 8,
                  background: '#ef444422',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#ef4444',
                }}>
                  FAINTED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
