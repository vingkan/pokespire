import { useState, useMemo } from 'react';
import type { PokemonData, MoveType } from '../../engine/types';
import { POKEMON, STARTER_POKEMON, getMove } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import { PokemonTile, TYPE_COLORS } from '../components/PokemonTile';
import { ScreenShell } from '../components/ScreenShell';
import { Flourish } from '../components/Flourish';
import { DexFrame } from '../components/DexFrame';
import {
  PROGRESSION_TREES,
  PASSIVE_DEFINITIONS,
  getBaseFormId,
  type ProgressionTree,
  type ProgressionRung,
} from '../../run/progression';
import { THEME } from '../theme';

interface Props {
  onBack: () => void;
}

// Boss / special forms that shouldn't appear in the PokeDex
const EXCLUDED_IDS = new Set(['mewtwo']);

// Build ordered list: group by evolution line, base form first then evos in tree order
function buildOrderedPokemonList(): PokemonData[] {
  const baseFormIds = Object.keys(STARTER_POKEMON);
  const result: PokemonData[] = [];
  const added = new Set<string>();

  for (const baseId of baseFormIds) {
    // Add the base form
    if (POKEMON[baseId] && !EXCLUDED_IDS.has(baseId)) {
      result.push(POKEMON[baseId]);
      added.add(baseId);
    }

    // Add evolved forms by walking the progression tree
    const tree = PROGRESSION_TREES[baseId];
    if (tree) {
      for (const rung of tree.rungs) {
        if (rung.evolvesTo && POKEMON[rung.evolvesTo] && !added.has(rung.evolvesTo)) {
          result.push(POKEMON[rung.evolvesTo]);
          added.add(rung.evolvesTo);
        }
      }
    }
  }

  // Add any remaining Pokemon not yet included (catches stragglers)
  for (const [id, data] of Object.entries(POKEMON)) {
    if (!added.has(id) && !EXCLUDED_IDS.has(id)) {
      result.push(data);
      added.add(id);
    }
  }

  return result;
}

const allPokemon = buildOrderedPokemonList();

// Derive which types actually exist in the Pokemon pool + counts
const typeCounts: Partial<Record<MoveType, number>> = {};
for (const p of allPokemon) {
  for (const t of p.types) {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
}
const availableTypes = (Object.keys(typeCounts) as MoveType[])
  .filter(t => t !== 'item')
  .sort((a, b) => (typeCounts[b] || 0) - (typeCounts[a] || 0));

// Set of base form IDs for distinguishing base vs evolved in the UI
const BASE_FORM_IDS = new Set(Object.keys(STARTER_POKEMON));

function makeSpriteUrl(id: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${id}.gif`;
}

// ── Main Screen ─────────────────────────────────────────────────────

export function PokeDexScreen({ onBack }: Props) {
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonData | null>(null);
  const [typeFilter, setTypeFilter] = useState<MoveType | null>(null);

  const filteredPokemon = useMemo(() => {
    if (!typeFilter) return allPokemon;
    return allPokemon.filter(p => p.types.includes(typeFilter));
  }, [typeFilter]);

  // Detail page — full takeover
  if (selectedPokemon) {
    return (
      <PokemonDetailPage
        pokemon={selectedPokemon}
        onBack={() => setSelectedPokemon(null)}
        onMainMenu={onBack}
        onNavigate={(id) => {
          const target = POKEMON[id];
          if (target) setSelectedPokemon(target);
        }}
      />
    );
  }

  // Grid page
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
    <ScreenShell header={header} ambient>
      <div style={{
        display: 'flex',
        gap: 0,
        padding: '24px 24px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* ── Type Filter Sidebar ── */}
        <div className="pdex-sidebar" style={{
          width: 160,
          flexShrink: 0,
          paddingRight: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
        }}>
          <DexFrame>
            <div style={{ padding: '14px 12px' }}>
              <div style={{
                fontSize: 10,
                color: THEME.text.tertiary,
                ...THEME.heading,
                letterSpacing: '0.12em',
                marginBottom: 10,
                paddingLeft: 4,
              }}>
                FILTER BY TYPE
              </div>

              <Flourish variant="heading" width={60} color={THEME.border.medium} />

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginTop: 10,
              }}>
                {/* All button */}
                <TypeFilterButton
                  label="All"
                  count={allPokemon.length}
                  color={THEME.text.secondary}
                  isActive={typeFilter === null}
                  onClick={() => setTypeFilter(null)}
                />

                {availableTypes.map(type => (
                  <TypeFilterButton
                    key={type}
                    label={type}
                    count={typeCounts[type] || 0}
                    color={TYPE_COLORS[type]}
                    isActive={typeFilter === type}
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  />
                ))}
              </div>
            </div>
          </DexFrame>
        </div>

        <div style={{ width: 20, flexShrink: 0 }} />

        {/* ── Main Grid Area ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DexFrame>
            <div style={{ padding: '20px 20px 24px' }}>
              {/* Subtitle */}
              <div className="pdex-subtitle" style={{
                textAlign: 'center',
                color: THEME.text.tertiary,
                fontSize: 14,
                marginBottom: 24,
              }}>
                {typeFilter
                  ? `${filteredPokemon.length} ${typeFilter}-type Pokemon`
                  : 'Choose a Pokemon to inspect'
                }
              </div>

              {/* Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 16,
                justifyItems: 'center',
              }}>
                {filteredPokemon.map((pokemon, i) => (
                  <div
                    key={pokemon.id}
                    className="pdex-tile"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <PokemonTile
                      name={pokemon.name}
                      spriteUrl={makeSpriteUrl(pokemon.id)}
                      primaryType={pokemon.types[0]}
                      secondaryType={pokemon.types[1]}
                      size="large"
                      isSelected={false}
                      onClick={() => setSelectedPokemon(pokemon)}
                      stats={`HP: ${pokemon.maxHp} | SPD: ${pokemon.baseSpeed}`}
                    />
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {filteredPokemon.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 0',
                  color: THEME.text.tertiary,
                  fontSize: 14,
                }}>
                  No Pokemon of this type
                </div>
              )}
            </div>
          </DexFrame>
        </div>
      </div>

      <style>{`
        .pdex-subtitle {
          animation: pdexFadeIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .pdex-tile {
          animation: pdexTileIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .pdex-sidebar {
          animation: pdexSidebarIn 0.25s ease-out forwards;
          opacity: 0;
        }
        @keyframes pdexTileIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pdexFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pdexSidebarIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .pdex-type-btn {
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .pdex-type-btn:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>
    </ScreenShell>
  );
}

// ── Type Filter Button ───────────────────────────────────────────────

interface TypeFilterButtonProps {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

function TypeFilterButton({ label, count, color, isActive, onClick }: TypeFilterButtonProps) {
  return (
    <button
      className="pdex-type-btn"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 6,
        border: isActive ? `1px solid ${color}50` : '1px solid transparent',
        background: isActive ? `${color}12` : 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Type color dot */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          opacity: isActive ? 1 : 0.5,
          boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          color: isActive ? color : THEME.text.tertiary,
          fontWeight: isActive ? 'bold' : 'normal',
          textTransform: 'capitalize',
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 10,
        color: isActive ? color : THEME.text.tertiary,
        opacity: isActive ? 0.8 : 0.4,
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Full-Page Detail ────────────────────────────────────────────────

interface DetailPageProps {
  pokemon: PokemonData;
  onBack: () => void;
  onMainMenu: () => void;
  onNavigate: (pokemonId: string) => void;
}

function PokemonDetailPage({ pokemon, onBack, onMainMenu, onNavigate }: DetailPageProps) {
  const baseId = getBaseFormId(pokemon.id);
  const progressionTree = PROGRESSION_TREES[baseId];
  const isEvolvedForm = !BASE_FORM_IDS.has(pokemon.id);
  const primaryColor = TYPE_COLORS[pokemon.types[0]];

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: `1px solid ${THEME.border.subtle}`,
    }}>
      <button onClick={onBack} style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}>
        &larr; All Pokemon
      </button>
      <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
        PokeDex
      </h1>
      <button onClick={onMainMenu} style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}>
        Menu
      </button>
    </div>
  );

  return (
    <ScreenShell header={header} ambient>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '28px 24px 64px',
      }}>
        <DexFrame>
          <div style={{
            padding: '28px 28px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}>
        {/* ── Sprite + Name + Types ── */}
        <div className="pdex-detail-hero" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <img
            src={makeSpriteUrl(pokemon.id)}
            alt={pokemon.name}
            style={{
              width: 120,
              height: 120,
              imageRendering: 'pixelated',
              objectFit: 'contain',
              filter: `drop-shadow(0 0 10px ${primaryColor}30)`,
            }}
          />
          <div style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: THEME.accent,
            ...THEME.heading,
            letterSpacing: '0.15em',
          }}>
            {pokemon.name}
          </div>
          <Flourish variant="divider" width={200} color={primaryColor} />

          {/* Types */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 4,
          }}>
            {pokemon.types.map(type => (
              <span
                key={type}
                style={{
                  fontSize: 11,
                  padding: '3px 12px',
                  borderRadius: 4,
                  border: `1px solid ${TYPE_COLORS[type]}60`,
                  background: `${TYPE_COLORS[type]}15`,
                  color: TYPE_COLORS[type],
                  ...THEME.heading,
                  letterSpacing: '0.12em',
                }}
              >
                {type}
              </span>
            ))}
          </div>

          {/* Evolution line indicator */}
          {isEvolvedForm && progressionTree && (
            <div style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              marginTop: 4,
              letterSpacing: '0.06em',
            }}>
              Evolves from {POKEMON[baseId]?.name ?? baseId}
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="pdex-detail-stats" style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <StatBox label="HP" value={pokemon.maxHp} color={THEME.status.heal} />
          <StatBox label="Speed" value={pokemon.baseSpeed} color={THEME.accent} />
          <StatBox label="Energy" value={pokemon.energyPerTurn} color={THEME.status.energy} />
          <StatBox label="Cap" value={pokemon.energyCap} color="#a855f7" />
          <StatBox label="Hand" value={pokemon.handSize} color={THEME.status.warning} />
        </div>

        {/* ── Progression Tree ── */}
        {progressionTree && (
          <div style={{ width: '100%' }}>
            <SectionHeader label={isEvolvedForm
              ? `${POKEMON[baseId]?.name ?? baseId} Line`
              : 'Progression'
            } />
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              position: 'relative',
              paddingLeft: 20,
            }}>
              {/* Vertical connecting line */}
              <div style={{
                position: 'absolute',
                left: 19,
                top: 20,
                bottom: 20,
                width: 1,
                background: THEME.border.medium,
              }} />

              {progressionTree.rungs.map((rung, index) => (
                <ProgressionRungDisplay
                  key={rung.level}
                  rung={rung}
                  isFirst={index === 0}
                  isLast={index === progressionTree.rungs.length - 1}
                  tree={progressionTree}
                  index={index}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Starting Deck ── */}
        <div style={{ width: '100%' }}>
          <SectionHeader label={`Starting Deck (${pokemon.deck.length})`} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16,
            justifyItems: 'center',
          }}>
            {pokemon.deck.map((cardId, index) => {
              try {
                const card = getMove(cardId);
                return (
                  <div
                    key={`${cardId}-${index}`}
                    className="pdex-deck-card"
                    style={{ animationDelay: `${index * 30 + 120}ms` }}
                  >
                    <CardPreview card={card} showHoverEffect={false} />
                  </div>
                );
              } catch {
                return (
                  <div key={`${cardId}-${index}`} style={{
                    width: 140,
                    height: 180,
                    background: THEME.chrome.backdrop,
                    border: `1px solid ${THEME.status.damage}40`,
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
          </DexFrame>
      </div>

      {/* Animations */}
      <style>{`
        .pdex-detail-hero {
          animation: pdexDetailIn 0.3s ease-out forwards;
          opacity: 0;
        }
        .pdex-detail-stats {
          animation: pdexDetailIn 0.25s ease-out 0.08s forwards;
          opacity: 0;
        }
        .pdex-section-header {
          animation: pdexDetailIn 0.2s ease-out 0.1s forwards;
          opacity: 0;
        }
        .pdex-rung {
          animation: pdexDetailIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .pdex-deck-card {
          animation: pdexDetailIn 0.2s ease-out forwards;
          opacity: 0;
        }
        @keyframes pdexDetailIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .pdex-rung-sprite {
          transition: filter 0.15s, transform 0.15s;
        }
        .pdex-rung-sprite:hover {
          filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.4)) !important;
          transform: scale(1.1);
        }
        .pdex-rung-name {
          transition: color 0.15s;
        }
        .pdex-rung-name:hover {
          color: ${THEME.accent} !important;
        }
      `}</style>
    </ScreenShell>
  );
}

// ── Section Header ──────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pdex-section-header" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      marginBottom: 20,
    }}>
      <Flourish variant="heading" width={80} color={THEME.text.tertiary} />
      <div style={{
        fontSize: 14,
        color: THEME.text.secondary,
        ...THEME.heading,
        letterSpacing: '0.12em',
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Stat Box ────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div style={{
      background: THEME.chrome.backdrop,
      border: `1px solid ${color}25`,
      borderRadius: 8,
      padding: '8px 16px',
      textAlign: 'center',
      minWidth: 70,
    }}>
      <div style={{
        fontSize: 10,
        color: THEME.text.tertiary,
        ...THEME.heading,
        letterSpacing: '0.1em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 'bold',
        color,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Progression Rung ────────────────────────────────────────────────

interface ProgressionRungDisplayProps {
  rung: ProgressionRung;
  isFirst: boolean;
  isLast: boolean;
  tree: ProgressionTree;
  index: number;
  onNavigate: (pokemonId: string) => void;
}

function ProgressionRungDisplay({ rung, isFirst, tree, index, onNavigate }: ProgressionRungDisplayProps) {
  const passive = PASSIVE_DEFINITIONS[rung.passiveId];
  const evolutionSprite = rung.evolvesTo || (isFirst ? tree.baseFormId : null);
  const levelColor = getLevelColor(rung.level);

  return (
    <div
      className="pdex-rung"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: '16px 0',
        position: 'relative',
        animationDelay: `${index * 50 + 150}ms`,
      }}
    >
      {/* Node dot on the vertical line */}
      <div style={{
        width: 11,
        height: 11,
        borderRadius: '50%',
        background: levelColor,
        border: `2px solid ${levelColor}`,
        boxShadow: `0 0 8px ${levelColor}40`,
        flexShrink: 0,
        marginTop: 4,
        marginLeft: -5,
        position: 'relative',
        zIndex: 1,
      }} />

      {/* Evolution sprite — clickable to navigate */}
      {evolutionSprite && (
        <img
          className="pdex-rung-sprite"
          src={makeSpriteUrl(evolutionSprite)}
          alt={rung.name}
          onClick={() => onNavigate(evolutionSprite)}
          style={{
            width: 48,
            height: 48,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            flexShrink: 0,
            filter: `drop-shadow(0 0 4px ${levelColor}30)`,
            cursor: 'pointer',
            borderRadius: 6,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          {/* Level badge */}
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            background: `${levelColor}20`,
            color: levelColor,
            fontWeight: 'bold',
            ...THEME.heading,
            letterSpacing: '0.08em',
          }}>
            LV {rung.level}
          </span>

          {/* Name — clickable if there's a form to navigate to */}
          <span
            className={evolutionSprite ? 'pdex-rung-name' : undefined}
            onClick={evolutionSprite ? () => onNavigate(evolutionSprite) : undefined}
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: THEME.text.primary,
              cursor: evolutionSprite ? 'pointer' : 'default',
            }}
          >
            {rung.name}
          </span>

          {rung.evolvesTo && (
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${THEME.status.heal}20`,
              color: THEME.status.heal,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
            }}>
              EVOLVES
            </span>
          )}
        </div>

        {/* Passive */}
        {rung.passiveId !== 'none' && passive && (
          <div style={{ fontSize: 13, marginBottom: 3, lineHeight: 1.5 }}>
            <span style={{ color: THEME.accent, fontWeight: 'bold' }}>
              {passive.name}
            </span>
            <span style={{ color: THEME.text.tertiary }}> — </span>
            <span style={{ color: THEME.text.secondary }}>
              {passive.description}
            </span>
          </div>
        )}

        {/* HP Boost + Cards on same line when compact */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {rung.hpBoost > 0 && (
            <div style={{ fontSize: 12, color: THEME.status.heal }}>
              +{rung.hpBoost} Max HP
            </div>
          )}
          {rung.cardsToAdd.length > 0 && (
            <div style={{ fontSize: 12, color: THEME.status.energy }}>
              +{rung.cardsToAdd.map(id => {
                try { return getMove(id).name; }
                catch { return id; }
              }).join(', ')}
            </div>
          )}
        </div>
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
