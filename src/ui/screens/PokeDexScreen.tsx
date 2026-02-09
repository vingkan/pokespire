import { useState } from 'react';
import type { PokemonData, MoveType } from '../../engine/types';
import { STARTER_POKEMON, getMove } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import {
  PROGRESSION_TREES,
  PASSIVE_DEFINITIONS,
  type ProgressionTree,
  type ProgressionRung,
} from '../../run/progression';

interface Props {
  onBack: () => void;
}

const TYPE_COLORS: Record<MoveType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  poison: '#a040a0',
  flying: '#a890f0',
  psychic: '#f85888',
  dark: '#705848',
  fighting: '#c03028',
  ice: '#98d8d8',
  bug: '#a8b820',
  dragon: '#7038f8',
  ghost: '#705898',
  rock: '#b8a038',
  ground: '#e0c068',
};

const allPokemon = Object.values(STARTER_POKEMON);

export function PokeDexScreen({ onBack }: Props) {
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonData | null>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0f0f17',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #333',
        background: '#1a1a24',
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 'bold',
            borderRadius: 6,
            border: '1px solid #555',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <h1 style={{ fontSize: 28, margin: 0, color: '#facc15' }}>
          PokeDex
        </h1>
        <div style={{ width: 80 }} />
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Pokemon Grid */}
        <div style={{
          width: selectedPokemon ? '300px' : '100%',
          padding: 24,
          overflowY: 'auto',
          borderRight: selectedPokemon ? '1px solid #333' : 'none',
          transition: 'width 0.3s',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedPokemon
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16,
            justifyItems: 'center',
          }}>
            {allPokemon.map(pokemon => (
              <PokemonCard
                key={pokemon.id}
                pokemon={pokemon}
                isSelected={selectedPokemon?.id === pokemon.id}
                onClick={() => setSelectedPokemon(pokemon)}
                compact={!!selectedPokemon}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedPokemon && (
          <div style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
          }}>
            <PokemonDetail
              pokemon={selectedPokemon}
              onClose={() => setSelectedPokemon(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface PokemonCardProps {
  pokemon: PokemonData;
  isSelected: boolean;
  onClick: () => void;
  compact: boolean;
}

function PokemonCard({ pokemon, isSelected, onClick, compact }: PokemonCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: compact ? 120 : 140,
        padding: compact ? 12 : 16,
        borderRadius: 12,
        border: isSelected ? '3px solid #facc15' : '3px solid #333',
        background: isSelected ? '#2d2d3f' : '#1e1e2e',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s',
      }}
    >
      <img
        src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
        alt={pokemon.name}
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          imageRendering: 'pixelated',
          objectFit: 'contain',
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div style={{
        fontSize: compact ? 13 : 15,
        fontWeight: 'bold',
        marginTop: 6,
      }}>
        {pokemon.name}
      </div>
      {!compact && (
        <div style={{
          display: 'flex',
          gap: 4,
          justifyContent: 'center',
          marginTop: 6,
        }}>
          {pokemon.types.map(type => (
            <span
              key={type}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: TYPE_COLORS[type] + '33',
                color: TYPE_COLORS[type],
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}
            >
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface PokemonDetailProps {
  pokemon: PokemonData;
  onClose: () => void;
}

function PokemonDetail({ pokemon, onClose }: PokemonDetailProps) {
  const progressionTree = PROGRESSION_TREES[pokemon.id];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24,
      }}>
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
          alt={pokemon.name}
          style={{
            width: 96,
            height: 96,
            imageRendering: 'pixelated',
            objectFit: 'contain',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <h2 style={{ fontSize: 28, margin: 0, color: '#facc15' }}>
              {pokemon.name}
            </h2>
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #555',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>

          {/* Types */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
          }}>
            {pokemon.types.map(type => (
              <span
                key={type}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: TYPE_COLORS[type] + '44',
                  color: TYPE_COLORS[type],
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                }}
              >
                {type}
              </span>
            ))}
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginTop: 16,
          }}>
            <StatBox label="HP" value={pokemon.maxHp} color="#4ade80" />
            <StatBox label="Speed" value={pokemon.baseSpeed} color="#facc15" />
            <StatBox label="Energy" value={pokemon.energyPerTurn} color="#60a5fa" />
            <StatBox label="Cap" value={pokemon.energyCap} color="#a855f7" />
            <StatBox label="Hand" value={pokemon.handSize} color="#f97316" />
          </div>
        </div>
      </div>

      {/* Progression Tree */}
      {progressionTree && (
        <div>
          <h3 style={{
            fontSize: 18,
            margin: '0 0 16px 0',
            color: '#94a3b8',
            borderBottom: '1px solid #333',
            paddingBottom: 8,
          }}>
            Progression Tree
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {progressionTree.rungs.map((rung, index) => (
              <ProgressionRungDisplay
                key={rung.level}
                rung={rung}
                isFirst={index === 0}
                tree={progressionTree}
              />
            ))}
          </div>
        </div>
      )}

      {/* Starting Deck */}
      <div>
        <h3 style={{
          fontSize: 18,
          margin: '0 0 16px 0',
          color: '#94a3b8',
          borderBottom: '1px solid #333',
          paddingBottom: 8,
        }}>
          Starting Deck ({pokemon.deck.length} cards)
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          justifyItems: 'center',
        }}>
          {pokemon.deck.map((cardId, index) => {
            try {
              const card = getMove(cardId);
              return <CardPreview key={`${cardId}-${index}`} card={card} showHoverEffect={false} />;
            } catch {
              return (
                <div key={`${cardId}-${index}`} style={{
                  width: 140,
                  height: 180,
                  background: '#1e1e2e',
                  border: '2px solid #ef4444',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: 12,
                  textAlign: 'center',
                  padding: 8,
                }}>
                  Missing: {cardId}
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div style={{
      background: '#1e1e2e',
      border: '1px solid #333',
      borderRadius: 6,
      padding: 8,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 'bold',
        color,
      }}>
        {value}
      </div>
    </div>
  );
}

interface ProgressionRungDisplayProps {
  rung: ProgressionRung;
  isFirst: boolean;
  tree: ProgressionTree;
}

function ProgressionRungDisplay({ rung, isFirst, tree }: ProgressionRungDisplayProps) {
  const passive = PASSIVE_DEFINITIONS[rung.passiveId];
  const evolutionSprite = rung.evolvesTo || (isFirst ? tree.baseFormId : null);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      background: '#1a1a24',
      border: '1px solid #333',
      borderRadius: 8,
      padding: 12,
    }}>
      {/* Level indicator */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: getLevelColor(rung.level),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#fff',
        flexShrink: 0,
      }}>
        L{rung.level}
      </div>

      {/* Evolution sprite (if any) */}
      {evolutionSprite && (
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${evolutionSprite}.gif`}
          alt={rung.name}
          style={{
            width: 48,
            height: 48,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            flexShrink: 0,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#e2e8f0',
          marginBottom: 4,
        }}>
          {rung.name}
          {rung.evolvesTo && (
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: '#4ade8033',
              color: '#4ade80',
            }}>
              EVOLVES
            </span>
          )}
        </div>

        {/* Passive */}
        {rung.passiveId !== 'none' && passive && (
          <div style={{
            fontSize: 13,
            marginBottom: 4,
          }}>
            <span style={{ color: '#facc15', fontWeight: 'bold' }}>
              {passive.name}:
            </span>{' '}
            <span style={{ color: '#94a3b8' }}>
              {passive.description}
            </span>
          </div>
        )}

        {/* HP Boost */}
        {rung.hpBoost > 0 && (
          <div style={{
            fontSize: 13,
            color: '#4ade80',
          }}>
            +{rung.hpBoost} Max HP
          </div>
        )}

        {/* Cards Added */}
        {rung.cardsToAdd.length > 0 && (
          <div style={{
            fontSize: 13,
            color: '#60a5fa',
          }}>
            +Cards: {rung.cardsToAdd.map(id => {
              try {
                return getMove(id).name;
              } catch {
                return id;
              }
            }).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

function getLevelColor(level: number): string {
  switch (level) {
    case 1: return '#4ade80';
    case 2: return '#60a5fa';
    case 3: return '#a855f7';
    case 4: return '#facc15';
    default: return '#64748b';
  }
}
