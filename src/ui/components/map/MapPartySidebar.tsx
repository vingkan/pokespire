import { useState } from 'react';
import type { RunPokemon } from '../../../run/types';
import { getPokemon } from '../../../data/loaders';
import { canPokemonLevelUp, EXP_PER_LEVEL } from '../../../run/state';
import { getSpriteSize } from '../../../data/heights';
import { THEME } from '../../theme';

interface Props {
  party: RunPokemon[];
  bench: RunPokemon[];
  onPokemonClick: (index: number) => void;
  onSwap: (partyIndex: number, benchIndex: number) => void;
  onRestart: () => void;
}

function PokemonRow({ pokemon, index, isDead, canLevel, onClick, isSwapTarget, onSwapClick }: {
  pokemon: RunPokemon;
  index: number;
  isDead: boolean;
  canLevel: boolean;
  onClick: () => void;
  isSwapTarget?: boolean;
  onSwapClick?: () => void;
}) {
  const basePokemon = getPokemon(pokemon.formId);
  const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;

  return (
    <div
      onClick={onSwapClick ?? onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 6px',
        borderRadius: 8,
        opacity: isDead ? 0.4 : 1,
        cursor: isDead && !onSwapClick ? 'default' : 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
        border: isSwapTarget ? '1px solid #60a5fa' : '1px solid transparent',
        background: isSwapTarget ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isDead || onSwapClick) (e.currentTarget as HTMLDivElement).style.background = isSwapTarget ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = isSwapTarget ? 'rgba(96, 165, 250, 0.08)' : 'transparent';
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
          alt={basePokemon.name}
          style={{
            width: Math.min(getSpriteSize(pokemon.formId) * 0.6, 48),
            height: Math.min(getSpriteSize(pokemon.formId) * 0.6, 48),
            imageRendering: 'pixelated',
            objectFit: 'contain',
            filter: isDead ? 'grayscale(100%)' : 'none',
          }}
        />
        {canLevel && !isDead && (
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#facc15',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 12,
            animation: 'pulse 1s infinite',
          }}>
            !
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {basePokemon.name}
        </div>
        <div style={{ fontSize: 10, color: THEME.text.tertiary }}>
          Lv.{pokemon.level} | {pokemon.exp}/{EXP_PER_LEVEL} EXP
        </div>
        <div style={{
          width: '100%',
          height: 5,
          background: THEME.border.subtle,
          borderRadius: 3,
          overflow: 'hidden',
          marginTop: 3,
        }}>
          <div style={{
            width: `${hpPercent}%`,
            height: '100%',
            background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
            borderRadius: 3,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 1 }}>
          {pokemon.currentHp}/{pokemon.maxHp} HP
        </div>
      </div>
    </div>
  );
}

export function MapPartySidebar({ party, bench, onPokemonClick, onSwap, onRestart }: Props) {
  // Swap mode: when a bench Pokemon is clicked, highlight party members to swap with
  const [swapBenchIndex, setSwapBenchIndex] = useState<number | null>(null);

  const handleBenchClick = (benchIndex: number) => {
    if (swapBenchIndex === benchIndex) {
      setSwapBenchIndex(null); // Toggle off
    } else {
      setSwapBenchIndex(benchIndex);
    }
  };

  const handlePartySwapClick = (partyIndex: number) => {
    if (swapBenchIndex !== null) {
      onSwap(partyIndex, swapBenchIndex);
      setSwapBenchIndex(null);
    }
  };

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '16px 12px',
      background: 'rgba(18, 18, 26, 0.6)',
      borderRight: `1px solid ${THEME.border.subtle}`,
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 11,
        color: THEME.text.tertiary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 4,
        textAlign: 'center',
      }}>
        Party
      </div>

      {party.map((pokemon, i) => {
        const isDead = pokemon.currentHp <= 0;
        const canLevel = canPokemonLevelUp(pokemon);
        const isSwapMode = swapBenchIndex !== null;

        return (
          <PokemonRow
            key={`party-${i}`}
            pokemon={pokemon}
            index={i}
            isDead={isDead}
            canLevel={canLevel}
            onClick={() => !isDead && onPokemonClick(i)}
            isSwapTarget={isSwapMode}
            onSwapClick={isSwapMode ? () => handlePartySwapClick(i) : undefined}
          />
        );
      })}

      {/* Bench section */}
      {bench.length > 0 && (
        <>
          <div style={{
            height: 1,
            background: THEME.border.subtle,
            margin: '8px 0 4px',
          }} />
          <div style={{
            fontSize: 11,
            color: THEME.text.tertiary,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 4,
            textAlign: 'center',
          }}>
            Bench
          </div>

          {bench.map((pokemon, i) => {
            const isDead = pokemon.currentHp <= 0;
            const isSelected = swapBenchIndex === i;

            return (
              <div
                key={`bench-${i}`}
                style={{
                  opacity: 0.7,
                  border: isSelected ? '1px solid #f97316' : '1px solid transparent',
                  borderRadius: 8,
                  background: isSelected ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                }}
              >
                <PokemonRow
                  pokemon={pokemon}
                  index={i}
                  isDead={isDead}
                  canLevel={false}
                  onClick={() => handleBenchClick(i)}
                />
              </div>
            );
          })}

          {swapBenchIndex !== null && (
            <div style={{
              fontSize: 11,
              color: '#60a5fa',
              textAlign: 'center',
              padding: '4px 0',
            }}>
              Click a party member to swap
            </div>
          )}
        </>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onRestart}
        style={{
          ...THEME.button.secondary,
          padding: '8px 12px',
          fontSize: 12,
          width: '100%',
          marginTop: 8,
        }}
      >
        Main Menu
      </button>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
