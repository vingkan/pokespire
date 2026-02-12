import { useState } from 'react';
import type { RunPokemon } from '../../run/types';
import type { Combatant, MoveDefinition } from '../../engine/types';
import { getPokemon, getMove } from '../../data/loaders';
import {
  getProgressionTree,
  getBaseFormId,
  canLevelUp,
  PASSIVE_DEFINITIONS,
  type PassiveId,
} from '../../run/progression';
import { EXP_PER_LEVEL } from '../../run/state';
import { getSpriteSize } from '../../data/heights';
import { CardPreview } from './CardPreview';
import { THEME } from '../theme';

type Tab = 'skills' | 'stats' | 'deck';

// Props can accept either RunPokemon (map view) or Combatant (battle view)
interface Props {
  // For map view
  pokemon?: RunPokemon;
  pokemonIndex?: number;
  partySize?: number;
  onNavigate?: (newIndex: number) => void;
  onLevelUp?: (pokemonIndex: number) => void;

  // For battle view
  combatant?: Combatant;

  // Common
  onClose: () => void;
  readOnly?: boolean;
}

/** Infer a combatant's level by checking which progression rungs match its passives. */
function inferLevelFromPassives(pokemonId: string, passiveIds: string[]): number {
  const baseId = getBaseFormId(pokemonId);
  const tree = getProgressionTree(baseId);
  if (!tree) return 1;
  let level = 1;
  for (const rung of tree.rungs) {
    if (rung.level <= 1) continue;
    if (rung.passiveId && rung.passiveId !== 'none' && passiveIds.includes(rung.passiveId)) {
      level = Math.max(level, rung.level);
    }
  }
  return level;
}

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

export function PokemonDetailsPanel({
  pokemon,
  pokemonIndex = 0,
  partySize = 1,
  onNavigate,
  onLevelUp,
  combatant,
  onClose,
  readOnly = false,
}: Props) {
  // Determine which data source we're using
  const isFromBattle = !!combatant;

  // Default to 'skills' tab - shows passives for both map view and battle view
  const [activeTab, setActiveTab] = useState<Tab>('skills');

  // Get base data - normalize from either source
  const formId = isFromBattle ? combatant!.pokemonId : pokemon!.formId;
  const baseFormId = isFromBattle ? combatant!.pokemonId : pokemon!.baseFormId;
  const basePokemon = getPokemon(formId);

  // Stats
  const currentHp = isFromBattle ? combatant!.hp : pokemon!.currentHp;
  const maxHp = isFromBattle ? combatant!.maxHp : pokemon!.maxHp;
  // Infer level from passives when viewing a combatant (combatants don't track level)
  const level = isFromBattle ? inferLevelFromPassives(baseFormId, combatant!.passiveIds) : pokemon!.level;
  const exp = isFromBattle ? 0 : pokemon!.exp;
  const passiveIds = isFromBattle ? combatant!.passiveIds : pokemon!.passiveIds;
  // For combatants, combine all piles to show full deck; for RunPokemon just use deck
  const deck: string[] = isFromBattle
    ? [...combatant!.drawPile, ...combatant!.hand, ...combatant!.discardPile, ...combatant!.vanishedPile]
    : pokemon!.deck;

  // Combat stats from base Pokemon data (use combatant values if in battle for modified stats)
  const energyPerTurn = basePokemon.energyPerTurn;
  const energyCap = basePokemon.energyCap;
  // Hand size can be modified by passives like Hustle (+1)
  const baseHandSize = isFromBattle ? combatant!.handSize : basePokemon.handSize;
  const hustleBonus = passiveIds.includes('hustle') && !isFromBattle ? 1 : 0;
  const handSize = baseHandSize + hustleBonus;
  const speed = basePokemon.baseSpeed;

  const tree = getProgressionTree(baseFormId);
  const canLevel = !readOnly && !isFromBattle && canLevelUp(level, exp);

  // Get all passive info
  const passiveInfos = passiveIds.map(id => ({
    id,
    ...PASSIVE_DEFINITIONS[id as PassiveId],
  }));

  // Get deck cards
  const deckCards = deck.map((cardId: string) => getMove(cardId));

  const handleLevelUp = () => {
    if (onLevelUp && pokemonIndex !== undefined) {
      onLevelUp(pokemonIndex);
    }
  };

  const handlePrevious = () => {
    if (onNavigate) {
      const newIndex = pokemonIndex === 0 ? partySize - 1 : pokemonIndex - 1;
      onNavigate(newIndex);
    }
  };

  const handleNext = () => {
    if (onNavigate) {
      const newIndex = pokemonIndex === partySize - 1 ? 0 : pokemonIndex + 1;
      onNavigate(newIndex);
    }
  };

  const arrowButtonStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '2px solid ' + THEME.border.bright,
    background: '#1e1e2e',
    color: THEME.text.primary,
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 'bold',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    background: activeTab === tab ? '#2d2d3f' : 'transparent',
    color: activeTab === tab ? '#facc15' : THEME.text.tertiary,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      gap: 16,
    }}>
      {/* Left Arrow */}
      {partySize > 1 && !isFromBattle && (
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
        minWidth: 550,
        maxWidth: 650,
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '2px solid #facc15',
        color: THEME.text.primary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid ' + THEME.border.subtle,
          background: '#1a1a24',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <img
              src={getSpriteUrl(formId)}
              alt={basePokemon.name}
              style={{
                width: getSpriteSize(formId),
                height: getSpriteSize(formId),
                imageRendering: 'pixelated',
                objectFit: 'contain',
              }}
            />
            <div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{basePokemon.name}</div>
              <div style={{ fontSize: 14, color: THEME.text.secondary }}>
                {!isFromBattle && `Level ${level} • ${exp}/${EXP_PER_LEVEL} EXP`}
                {isFromBattle && `HP: ${currentHp}/${maxHp}`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: THEME.border.subtle,
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '8px 16px 0',
          background: '#1a1a24',
        }}>
          <button style={tabStyle('skills')} onClick={() => setActiveTab('skills')}>
            Skills
          </button>
          <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>
            Stats
          </button>
          <button style={tabStyle('deck')} onClick={() => setActiveTab('deck')}>
            Deck ({deck.length})
          </button>
        </div>

        {/* Tab Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
          background: '#2d2d3f',
        }}>
          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Combat Stats */}
              <div>
                <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 8, textTransform: 'uppercase' }}>
                  Combat Stats
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                }}>
                  <StatBox label="HP" value={`${currentHp}/${maxHp}`} icon="❤️" color="#ef4444" />
                  <StatBox label="Speed" value={speed.toString()} icon="💨" color="#facc15" />
                  <StatBox label="Energy/Turn" value={energyPerTurn.toString()} icon="🔋" color="#60a5fa" />
                  <StatBox label="Energy Cap" value={energyCap.toString()} icon="🔌" color="#a855f7" />
                  <StatBox label="Cards/Turn" value={handSize.toString()} icon="🃏" color="#4ade80" />
                  <StatBox label="Deck Size" value={deck.length.toString()} icon="📚" color="#f97316" />
                </div>
              </div>

              {/* Passive Abilities */}
              <div>
                <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 8, textTransform: 'uppercase' }}>
                  Passive Abilities
                </div>
                {passiveInfos.length === 0 ? (
                  <div style={{
                    padding: 16,
                    background: '#1e1e2e',
                    borderRadius: 8,
                    color: THEME.text.tertiary,
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}>
                    No passive abilities yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {passiveInfos.map((info, i) => (
                      <div key={i} style={{
                        padding: 12,
                        background: '#1e1e2e',
                        borderRadius: 8,
                        borderLeft: '3px solid #facc15',
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 'bold', color: '#facc15' }}>
                          {info.name}
                        </div>
                        <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
                          {info.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Types */}
              <div>
                <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 8, textTransform: 'uppercase' }}>
                  Types
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {basePokemon.types.map((type, i) => (
                    <TypeBadge key={i} type={type} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Active Passives (shown for all, especially useful for enemies) */}
              {passiveInfos.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text.secondary, marginBottom: 8 }}>
                    Active Passives
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {passiveInfos.map((passive) => (
                      <div
                        key={passive.id}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: '#22c55e22',
                          border: '1px solid #22c55e44',
                        }}
                      >
                        <div style={{ fontSize: 15, fontWeight: 'bold', color: '#22c55e' }}>
                          {passive.name}
                        </div>
                        <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
                          {passive.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {passiveInfos.length === 0 && !tree && (
                <div style={{ color: THEME.text.tertiary, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
                  No passive abilities
                </div>
              )}
              {/* Progression Rungs (only for Pokemon with progression trees) */}
              {tree && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text.secondary, marginBottom: 4 }}>
                  Skill Tree
                </div>
                {tree.rungs.map((rung, i) => {
                  const isUnlocked = level >= rung.level;
                  const isCurrent = level === rung.level;
                  const isNext = level + 1 === rung.level;

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: isCurrent ? '#3b82f633' : isUnlocked ? '#22c55e22' : '#1e1e2e',
                        border: isCurrent
                          ? '2px solid #3b82f6'
                          : isNext && canLevel
                            ? '2px dashed #facc15'
                            : '1px solid ' + THEME.border.subtle,
                        opacity: isUnlocked || isNext ? 1 : 0.5,
                      }}
                    >
                      {/* Level indicator */}
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isUnlocked ? '#22c55e' : '#444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 14,
                        color: isUnlocked ? '#000' : '#888',
                        flexShrink: 0,
                      }}>
                        {isUnlocked ? '✓' : rung.level}
                      </div>

                      {/* Rung info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 'bold',
                          color: isCurrent ? '#3b82f6' : isUnlocked ? '#22c55e' : THEME.text.secondary,
                        }}>
                          {rung.name}
                        </div>
                        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
                          {rung.description}
                        </div>
                        {rung.passiveId !== 'none' && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#60a5fa',
                              marginTop: 4,
                              fontStyle: 'italic',
                            }}
                            title={PASSIVE_DEFINITIONS[rung.passiveId]?.description || ''}
                          >
                            💡 {PASSIVE_DEFINITIONS[rung.passiveId]?.name}: {PASSIVE_DEFINITIONS[rung.passiveId]?.description}
                          </div>
                        )}
                      </div>

                      {/* Next indicator */}
                      {isNext && canLevel && (
                        <div style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: '#facc15',
                          padding: '4px 8px',
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

              {/* Level Up Button (only shown when tree exists) */}
              {tree && (
                <>
              {canLevel && onLevelUp && (
                <button
                  onClick={handleLevelUp}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    fontSize: 16,
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

              {!canLevel && !isFromBattle && level < 4 && (
                <div style={{
                  textAlign: 'center',
                  color: THEME.text.secondary,
                  fontSize: 14,
                  padding: 8,
                }}>
                  Need {EXP_PER_LEVEL} EXP to level up (current: {exp})
                </div>
              )}

              {level >= 4 && (
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
              </>
              )}
            </div>
          )}

          {/* Deck Tab */}
          {activeTab === 'deck' && (
            <div>
              <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 12 }}>
                {deck.length} cards in deck
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
                justifyItems: 'center',
              }}>
                {deckCards.map((card: MoveDefinition, i: number) => (
                  <CardPreview
                    key={`${card.id}-${i}`}
                    card={card}
                    showHoverEffect={false}
                  />
                ))}
              </div>
              {deck.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 32,
                  color: THEME.text.tertiary,
                }}>
                  No cards in deck
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Pokemon indicator */}
        {partySize > 1 && !isFromBattle && (
          <div style={{
            textAlign: 'center',
            color: THEME.text.tertiary,
            fontSize: 13,
            padding: '12px 0',
            borderTop: '1px solid ' + THEME.border.subtle,
            background: '#1a1a24',
          }}>
            {pokemonIndex + 1} / {partySize}
          </div>
        )}
      </div>

      {/* Right Arrow */}
      {partySize > 1 && !isFromBattle && (
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

// Helper component for stat boxes
function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      padding: 12,
      background: '#1e1e2e',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: THEME.text.tertiary }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 'bold', color }}>{value}</div>
      </div>
    </div>
  );
}

// Helper component for type badges
const TYPE_COLORS: Record<string, string> = {
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
  item: '#4ade80',
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || '#888';
  return (
    <div style={{
      padding: '6px 14px',
      borderRadius: 6,
      background: `${color}33`,
      color: color,
      fontWeight: 'bold',
      fontSize: 13,
      textTransform: 'uppercase',
    }}>
      {type}
    </div>
  );
}
