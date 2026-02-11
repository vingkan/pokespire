import { useState } from 'react';
import type { PokemonData, MoveType } from '../../engine/types';
import { STARTER_POKEMON, getMove } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import { PokemonTile, TYPE_COLORS } from '../components/PokemonTile';
import { ScreenShell } from '../components/ScreenShell';
import {
  PROGRESSION_TREES,
  PASSIVE_DEFINITIONS,
  type ProgressionTree,
  type ProgressionRung,
} from '../../run/progression';
import { THEME } from '../theme';

interface Props {
  onBack: () => void;
}

const allPokemon = Object.values(STARTER_POKEMON);

function makeSpriteUrl(id: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${id}.gif`;
}

export function PokeDexScreen({ onBack }: Props) {
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonData | null>(null);

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: `1px solid ${THEME.border.subtle}`,
    }}>
      <button onClick={onBack} style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}>
        &larr; Back
      </button>
      <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
        PokeDex
      </h1>
      <div style={{ width: 80 }} />
    </div>
  );

  return (
    <ScreenShell header={header}>
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Pokemon Grid */}
        <div style={{
          width: selectedPokemon ? '340px' : '100%',
          padding: 24,
          overflowY: 'auto',
          borderRight: selectedPokemon ? `1px solid ${THEME.border.subtle}` : 'none',
          transition: 'width 0.3s',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedPokemon
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
            justifyItems: 'center',
          }}>
            {allPokemon.map(pokemon => (
              <PokemonTile
                key={pokemon.id}
                name={pokemon.name}
                spriteUrl={makeSpriteUrl(pokemon.id)}
                primaryType={pokemon.types[0]}
                secondaryType={pokemon.types[1]}
                size={selectedPokemon ? 'medium' : 'large'}
                isSelected={selectedPokemon?.id === pokemon.id}
                onClick={() => setSelectedPokemon(pokemon)}
                stats={`HP: ${pokemon.maxHp} | SPD: ${pokemon.baseSpeed}`}
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
    </ScreenShell>
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
            <h2 style={{ fontSize: 28, margin: 0, color: THEME.accent }}>
              {pokemon.name}
            </h2>
            <button
              onClick={onClose}
              style={{ marginLeft: 'auto', padding: '4px 12px', ...THEME.button.secondary, fontSize: 12 }}
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
            <StatBox label="HP" value={pokemon.maxHp} color={THEME.status.heal} />
            <StatBox label="Speed" value={pokemon.baseSpeed} color={THEME.accent} />
            <StatBox label="Energy" value={pokemon.energyPerTurn} color={THEME.status.energy} />
            <StatBox label="Cap" value={pokemon.energyCap} color="#a855f7" />
            <StatBox label="Hand" value={pokemon.handSize} color={THEME.status.warning} />
          </div>
        </div>
      </div>

      {/* Progression Tree */}
      {progressionTree && (
        <div>
          <h3 style={{
            fontSize: 18,
            margin: '0 0 16px 0',
            color: THEME.text.secondary,
            borderBottom: `1px solid ${THEME.border.subtle}`,
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
          color: THEME.text.secondary,
          borderBottom: `1px solid ${THEME.border.subtle}`,
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
                  background: THEME.bg.panel,
                  border: `2px solid ${THEME.status.damage}`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: THEME.status.damage,
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
      background: THEME.bg.panel,
      border: `1px solid ${THEME.border.subtle}`,
      borderRadius: 6,
      padding: 8,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11,
        color: THEME.text.tertiary,
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
      background: THEME.bg.panelDark,
      border: `1px solid ${THEME.border.subtle}`,
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
          src={makeSpriteUrl(evolutionSprite)}
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
          color: THEME.text.primary,
          marginBottom: 4,
        }}>
          {rung.name}
          {rung.evolvesTo && (
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${THEME.status.heal}33`,
              color: THEME.status.heal,
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
            <span style={{ color: THEME.accent, fontWeight: 'bold' }}>
              {passive.name}:
            </span>{' '}
            <span style={{ color: THEME.text.secondary }}>
              {passive.description}
            </span>
          </div>
        )}

        {/* HP Boost */}
        {rung.hpBoost > 0 && (
          <div style={{
            fontSize: 13,
            color: THEME.status.heal,
          }}>
            +{rung.hpBoost} Max HP
          </div>
        )}

        {/* Cards Added */}
        {rung.cardsToAdd.length > 0 && (
          <div style={{
            fontSize: 13,
            color: THEME.status.energy,
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
