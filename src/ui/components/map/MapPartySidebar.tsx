import { useState } from 'react';
import type { RunPokemon } from '../../../run/types';
import { getPokemon } from '../../../data/loaders';
import { canPokemonLevelUp, EXP_PER_LEVEL } from '../../../run/state';
import { getSpriteSize } from '../../../data/heights';
import { THEME } from '../../theme';

interface Props {
  party: RunPokemon[];
  bench: RunPokemon[];
  graveyard: RunPokemon[];
  gold: number;
  onPokemonClick: (index: number) => void;
  onSwap: (partyIndex: number, benchIndex: number) => void;
  onPromote: (benchIndex: number) => void;
  onRearrange: () => void;
  onOpenShop: () => void;
  onOpenMoveDeleter: () => void;
}

function PokemonRow({ pokemon, isDead, canLevel, onClick, isSwapTarget, onSwapClick }: {
  pokemon: RunPokemon;
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

export function MapPartySidebar({ party, bench, graveyard, gold, onPokemonClick, onSwap, onPromote, onRearrange, onOpenShop, onOpenMoveDeleter }: Props) {
  // Swap mode: when party is full and a bench Pokemon is clicked, highlight party members to swap with
  const [swapBenchIndex, setSwapBenchIndex] = useState<number | null>(null);
  const [showGraveyard, setShowGraveyard] = useState(false);

  const partyHasRoom = party.length < 4;

  const handleBenchClick = (benchIndex: number) => {
    if (partyHasRoom) {
      // Directly promote to party when there's room
      onPromote(benchIndex);
      return;
    }
    // Party full — enter swap mode
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
      {/* Gold display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 0',
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 13, color: '#facc15', fontWeight: 'bold' }}>
          {gold}g
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 4,
      }}>
        <div style={{
          fontSize: 11,
          color: THEME.text.tertiary,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Party
        </div>
        <button
          onClick={onRearrange}
          style={{
            ...THEME.button.secondary,
            padding: '2px 8px',
            fontSize: 10,
          }}
        >
          Rearrange
        </button>
      </div>

      {party.map((pokemon, i) => {
        const isDead = pokemon.currentHp <= 0;
        const canLevel = canPokemonLevelUp(pokemon);
        const isSwapMode = swapBenchIndex !== null;

        return (
          <PokemonRow
            key={`party-${i}`}
            pokemon={pokemon}
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

          {partyHasRoom && (
            <div style={{
              fontSize: 11,
              color: '#4ade80',
              textAlign: 'center',
              padding: '4px 0',
            }}>
              Click to add to party
            </div>
          )}
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Graveyard section */}
      {graveyard.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setShowGraveyard(!showGraveyard)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              color: THEME.text.tertiary,
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: 0.7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          >
            <span style={{ fontSize: 13 }}>{'\u2020'}</span>
            <span style={{ letterSpacing: '0.08em' }}>
              Fallen ({graveyard.length})
            </span>
            <span style={{ fontSize: 9 }}>{showGraveyard ? '\u25B2' : '\u25BC'}</span>
          </button>

          {showGraveyard && (
            <div style={{ marginTop: 4 }}>
              {graveyard.map((pokemon, i) => {
                const basePokemon = getPokemon(pokemon.formId);
                return (
                  <div
                    key={`grave-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 6px',
                      opacity: 0.4,
                    }}
                  >
                    <img
                      src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                      alt={basePokemon.name}
                      style={{
                        width: Math.min(getSpriteSize(pokemon.formId) * 0.5, 36),
                        height: Math.min(getSpriteSize(pokemon.formId) * 0.5, 36),
                        imageRendering: 'pixelated',
                        objectFit: 'contain',
                        filter: 'grayscale(100%)',
                      }}
                    />
                    <div style={{ fontSize: 12, color: THEME.text.tertiary }}>
                      {basePokemon.name}
                      <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>
                        Lv.{pokemon.level}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onOpenShop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 14px',
          fontSize: 14,
          fontWeight: 'bold',
          width: '100%',
          marginTop: 8,
          border: '1.5px solid #4ade80',
          background: 'rgba(74, 222, 128, 0.06)',
          color: '#4ade80',
          borderRadius: 10,
          cursor: 'pointer',
          boxShadow: 'inset 0 0 10px rgba(74, 222, 128, 0.12), 0 0 8px rgba(74, 222, 128, 0.08)',
          letterSpacing: '0.05em',
        }}
      >
        {/* Kecleon side-profile — open strokes facing left */}
        <svg width="32" height="32" viewBox="-2 -2 28 28" fill="none">
          {/* Crown — zigzag peaks along top */}
          <path d="M5.5 4.5 L7 1 L9 4 L10.5 0.5 L12.5 3.5 L13.5 1.5 L15 4.5" stroke="#4ade80" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
          {/* Forehead down to snout tip */}
          <path d="M5.5 4.5 Q3.5 7 1 11" stroke="#4ade80" strokeWidth="1.1" strokeLinecap="round" />
          {/* Back of head — dome from crown curving down */}
          <path d="M15 4.5 Q19 4 21 7 Q22.5 10 22 14" stroke="#4ade80" strokeWidth="1.1" strokeLinecap="round" />
          {/* Back-of-head spikes */}
          <path d="M21 6.5 L23.5 5 L21.5 9" stroke="#4ade80" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M22 9.5 L24 8.5 L22 12" stroke="#4ade80" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
          {/* Eye ridge — forehead marking to eye */}
          <line x1="6" y1="6" x2="8.5" y2="8.5" stroke="#4ade80" strokeWidth="0.8" strokeLinecap="round" />
          {/* Eye — large circle */}
          <circle cx="12" cy="11.5" r="4" stroke="#4ade80" strokeWidth="1.1" />
          {/* Pupil */}
          <circle cx="11" cy="11" r="1.4" fill="#4ade80" opacity="0.7" />
          {/* Upper mouth line — from snout back */}
          <path d="M1 12 Q5.5 14 12 13" stroke="#4ade80" strokeWidth="0.8" strokeLinecap="round" />
          {/* Lower jaw — sweeping curve from snout down and back */}
          <path d="M1 12.5 Q4.5 18 10 20 Q15 22 20 22" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" />
        </svg>
        Kecleon Shop
      </button>

      <button
        onClick={onOpenMoveDeleter}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 14px',
          fontSize: 14,
          fontWeight: 'bold',
          width: '100%',
          marginTop: 8,
          border: '1.5px solid #fbbf24',
          background: 'rgba(251, 191, 36, 0.06)',
          color: '#fbbf24',
          borderRadius: 10,
          cursor: 'pointer',
          boxShadow: 'inset 0 0 10px rgba(251, 191, 36, 0.12), 0 0 8px rgba(251, 191, 36, 0.08)',
          letterSpacing: '0.05em',
        }}
      >
        {/* Hypno side-profile — open strokes facing left, matching Kecleon style */}
        <svg width="32" height="32" viewBox="-2 -2 28 28" fill="none">
          {/* Ears — two pointed peaks across the top */}
          <path d="M4 8 L7 1 L12 7 L15 5 L19 1 L22 7" stroke="#fbbf24" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
          {/* Small ear fold between ears */}
          <path d="M14 6 Q15 7.5 16.5 5.5" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
          {/* Forehead — curves down from left ear */}
          <path d="M4 8 Q1 12 3 16" stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round" />
          {/* Nose — sharp point going down-left */}
          <path d="M3 16 L0 21 L5 19" stroke="#fbbf24" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
          {/* Back of head — curves down from right ear */}
          <path d="M22 7 Q24 11 23 16" stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round" />
          {/* Eyes — two sleepy slit curves */}
          <path d="M6 9.5 Q7.5 11 9 9.5" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M13 9 Q15 10.5 17.5 9" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
          {/* Jaw line from nose tip back */}
          <path d="M5 19 Q7 22 10 22" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
          {/* Ruff / collar at bottom */}
          <path d="M13 23 Q16 24 20 23" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        Hypno's Parlor
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
