import type { RunPokemon } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import {
  getProgressionTree,
  canLevelUp,
  PASSIVE_DEFINITIONS,
} from '../../run/progression';
import { EXP_PER_LEVEL } from '../../run/state';
import { getSpriteSize } from '../../data/heights';

interface Props {
  pokemon: RunPokemon;
  pokemonIndex: number;
  partySize: number;
  onClose: () => void;
  onLevelUp: (pokemonIndex: number) => void;
  onNavigate: (newIndex: number) => void;
  readOnly?: boolean;
}

export function ProgressionPanel({ pokemon, pokemonIndex, partySize, onClose, onLevelUp, onNavigate, readOnly }: Props) {
  const basePokemon = getPokemon(pokemon.formId);
  const tree = getProgressionTree(pokemon.baseFormId);
  const canLevel = !readOnly && canLevelUp(pokemon.level, pokemon.exp);

  const handleLevelUp = () => {
    onLevelUp(pokemonIndex);
  };

  const handlePrevious = () => {
    const newIndex = pokemonIndex === 0 ? partySize - 1 : pokemonIndex - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = pokemonIndex === partySize - 1 ? 0 : pokemonIndex + 1;
    onNavigate(newIndex);
  };

  // Get all passive info
  const passiveInfos = pokemon.passiveIds.map(id => ({
    id,
    ...PASSIVE_DEFINITIONS[id],
  }));

  const arrowButtonStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '2px solid #64748b',
    background: '#1e1e2e',
    color: '#e2e8f0',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      gap: 16,
    }}>
      {/* Left Arrow */}
      {partySize > 1 && (
        <button
          onClick={handlePrevious}
          style={arrowButtonStyle}
          title="Previous Pokemon"
        >
          ‹
        </button>
      )}

      <div style={{
        background: '#1e1e2e',
        borderRadius: 16,
        padding: 24,
        minWidth: 400,
        maxWidth: 500,
        border: '2px solid #facc15',
        color: '#e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <img
              src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
              alt={basePokemon.name}
              style={{
                width: getSpriteSize(pokemon.formId),
                height: getSpriteSize(pokemon.formId),
                imageRendering: 'pixelated',
                objectFit: 'contain',
              }}
            />
            <div>
              <div style={{ fontSize: 22, fontWeight: 'bold' }}>{basePokemon.name}</div>
              <div style={{ fontSize: 15, color: '#94a3b8' }}>
                Level {pokemon.level} • {pokemon.exp} EXP
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: '#333',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Current Passives */}
        <div style={{
          padding: 12,
          background: '#2d2d3f',
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 8 }}>
            {passiveInfos.length === 0 ? 'No Passives' : passiveInfos.length === 1 ? 'Current Passive' : 'Current Passives'}
          </div>
          {passiveInfos.length === 0 ? (
            <div style={{ fontSize: 15, color: '#64748b', fontStyle: 'italic' }}>
              No passive abilities yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {passiveInfos.map((info, i) => (
                <div key={i}>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: '#facc15' }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: 15, color: '#94a3b8' }}>
                    {info.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progression Rungs */}
        {tree && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 4 }}>
              Progression
            </div>
            {tree.rungs.map((rung, i) => {
              const isUnlocked = pokemon.level >= rung.level;
              const isCurrent = pokemon.level === rung.level;
              const isNext = pokemon.level + 1 === rung.level;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    borderRadius: 8,
                    background: isCurrent ? '#3b82f633' : isUnlocked ? '#22c55e22' : '#333',
                    border: isCurrent
                      ? '2px solid #3b82f6'
                      : isNext && canLevel
                        ? '2px dashed #facc15'
                        : '1px solid #444',
                    opacity: isUnlocked || isNext ? 1 : 0.5,
                  }}
                >
                  {/* Level indicator */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isUnlocked ? '#22c55e' : '#444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 15,
                    color: isUnlocked ? '#000' : '#888',
                  }}>
                    {isUnlocked ? '✓' : rung.level}
                  </div>

                  {/* Rung info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 'bold',
                      color: isCurrent ? '#3b82f6' : isUnlocked ? '#22c55e' : '#94a3b8',
                    }}>
                      {rung.name}
                    </div>
                    <div style={{ fontSize: 15, color: '#94a3b8' }}>
                      {rung.description}
                    </div>
                  </div>

                  {/* Next indicator */}
                  {isNext && canLevel && (
                    <div style={{
                      fontSize: 15,
                      fontWeight: 'bold',
                      color: '#facc15',
                      padding: '2px 6px',
                      background: '#facc1522',
                      borderRadius: 4,
                    }}>
                      NEXT
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Level Up Button */}
        {canLevel && (
          <button
            onClick={handleLevelUp}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: 17,
              fontWeight: 'bold',
              borderRadius: 8,
              border: 'none',
              background: '#facc15',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            Level Up (Spend {EXP_PER_LEVEL} EXP)
          </button>
        )}

        {!canLevel && pokemon.level < 4 && (
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 15,
            padding: 8,
          }}>
            Need {EXP_PER_LEVEL} EXP to level up (current: {pokemon.exp})
          </div>
        )}

        {pokemon.level >= 4 && (
          <div style={{
            textAlign: 'center',
            color: '#22c55e',
            fontSize: 15,
            fontWeight: 'bold',
            padding: 8,
          }}>
            Max Level Reached!
          </div>
        )}

        {/* Pokemon indicator */}
        {partySize > 1 && (
          <div style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: 13,
            marginTop: 12,
          }}>
            {pokemonIndex + 1} / {partySize}
          </div>
        )}
      </div>

      {/* Right Arrow */}
      {partySize > 1 && (
        <button
          onClick={handleNext}
          style={arrowButtonStyle}
          title="Next Pokemon"
        >
          ›
        </button>
      )}
    </div>
  );
}
