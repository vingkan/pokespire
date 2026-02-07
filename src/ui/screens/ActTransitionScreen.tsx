import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';

interface Props {
  run: RunState;
  onContinue: () => void;
}

export function ActTransitionScreen({ run, onContinue }: Props) {
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
      background: 'linear-gradient(180deg, #0f0f17 0%, #1a1a2e 50%, #16213e 100%)',
    }}>
      {/* Act Complete Header */}
      <div style={{
        fontSize: 52,
        fontWeight: 'bold',
        color: '#60a5fa',
        textShadow: '0 0 30px #60a5fa55',
        textAlign: 'center',
      }}>
        Act 1 Complete!
      </div>

      {/* Story Text */}
      <div style={{
        fontSize: 18,
        color: '#94a3b8',
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 1.6,
      }}>
        Giovanni has been defeated, but the battle is far from over.
        <br /><br />
        Deep within the facility, Mewtwo awaits. Your party descends
        further into the Rocket Lab, ready to face whatever challenges lie ahead.
      </div>

      {/* Party Healed Message */}
      <div style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: '#22c55e',
        textShadow: '0 0 10px #22c55e55',
      }}>
        Party fully healed!
      </div>

      {/* Party Status Summary */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: 24,
        background: '#1e1e2e',
        borderRadius: 12,
        border: '2px solid #60a5fa',
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
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Lv. {pokemon.level}</div>
              <div style={{
                width: 80,
                height: 8,
                background: '#333',
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
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {pokemon.currentHp}/{pokemon.maxHp} HP
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {pokemon.deck.length} cards
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        style={{
          padding: '16px 48px',
          fontSize: 20,
          fontWeight: 'bold',
          borderRadius: 8,
          border: 'none',
          background: '#60a5fa',
          color: '#000',
          cursor: 'pointer',
          marginTop: 16,
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 0 20px #60a5fa55';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Continue to Act 2
      </button>
    </div>
  );
}
