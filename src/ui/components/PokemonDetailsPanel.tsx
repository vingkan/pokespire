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
import { DexFrame } from './DexFrame';
import { THEME } from '../theme';

type Tab = 'skills' | 'stats' | 'deck';

const TAB_COLORS: Record<Tab, string> = {
  skills: THEME.accent,   // gold
  stats: '#60a5fa',        // blue
  deck: '#4ade80',         // green
};

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

interface PassiveInfo {
  id: string;
  name: string;
  description: string;
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

// ── Small SVG helpers ────────────────────────────────────────────────

function DiamondNode({ color, size = 12 }: { color: string; size?: number }) {
  const h = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: 'block' }}>
      <path d={`M${h} 0 L${size} ${h} L${h} ${size} L0 ${h} Z`} fill={color} />
    </svg>
  );
}

function DiamondPip({ filled }: { filled: boolean }) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" style={{ display: 'block' }}>
      <path
        d="M5 1 L9 5 L5 9 L1 5 Z"
        fill={filled ? THEME.accent : 'transparent'}
        stroke={filled ? THEME.accent : THEME.border.medium}
        strokeWidth={1}
      />
    </svg>
  );
}

// ── Type colors ──────────────────────────────────────────────────────

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
  steel: '#b8b8d0',
  fairy: '#ee99ac',
  item: '#4ade80',
};

// ── Nav button style ─────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: `1px solid ${THEME.border.medium}`,
  background: 'transparent',
  color: THEME.text.secondary,
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: 0,
  lineHeight: 1,
};

// ── Main component ───────────────────────────────────────────────────

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
  const isFromBattle = !!combatant;
  const [activeTab, setActiveTab] = useState<Tab>('skills');

  // Normalize data from either source
  const formId = isFromBattle ? combatant!.pokemonId : pokemon!.formId;
  const baseFormId = isFromBattle ? combatant!.pokemonId : pokemon!.baseFormId;
  const basePokemon = getPokemon(formId);

  const currentHp = isFromBattle ? combatant!.hp : pokemon!.currentHp;
  const maxHp = isFromBattle ? combatant!.maxHp : pokemon!.maxHp;
  const level = isFromBattle ? inferLevelFromPassives(baseFormId, combatant!.passiveIds) : pokemon!.level;
  const exp = isFromBattle ? 0 : pokemon!.exp;
  const passiveIds = isFromBattle ? combatant!.passiveIds : pokemon!.passiveIds;
  const deck: string[] = isFromBattle
    ? [...combatant!.drawPile, ...combatant!.hand, ...combatant!.discardPile, ...combatant!.vanishedPile]
    : pokemon!.deck;

  const energyPerTurn = basePokemon.energyPerTurn;
  const energyCap = basePokemon.energyCap;
  const baseHandSize = isFromBattle ? combatant!.handSize : basePokemon.handSize;
  const hustleBonus = passiveIds.includes('hustle') && !isFromBattle ? 1 : 0;
  const handSize = baseHandSize + hustleBonus;
  const speed = basePokemon.baseSpeed;

  const tree = getProgressionTree(baseFormId);
  const canLevel = !readOnly && !isFromBattle && canLevelUp(level, exp);

  const passiveInfos: PassiveInfo[] = passiveIds
    .map(id => {
      const def = PASSIVE_DEFINITIONS[id as PassiveId];
      return def ? { id, name: def.name, description: def.description } : null;
    })
    .filter((x): x is PassiveInfo => x !== null);

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

  const showNav = partySize > 1 && !isFromBattle;

  return (
    <div className="pdp-overlay" style={{
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
    }}>
      <div className="pdp-panel">
        <DexFrame>
          <div style={{
            overflow: 'hidden',
            borderRadius: 2,
            background: THEME.bg.panel,
            height: '75vh',
            width: 'clamp(500px, 45vw, 650px)',
            display: 'flex',
            flexDirection: 'column',
            color: THEME.text.primary,
          }}>
            {/* ── Header ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderBottom: `1px solid ${THEME.border.subtle}`,
              background: THEME.bg.panelDark,
              flexShrink: 0,
            }}>
              {showNav && (
                <button
                  onClick={handlePrevious}
                  className="pdp-nav-btn"
                  style={navBtnStyle}
                  title="Previous Pokemon"
                >
                  &#8249;
                </button>
              )}

              <img
                src={getSpriteUrl(formId)}
                alt={basePokemon.name}
                style={{
                  width: Math.min(getSpriteSize(formId), 56),
                  height: Math.min(getSpriteSize(formId), 56),
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', ...THEME.heading, letterSpacing: '0.08em' }}>
                  {basePokemon.name}
                </div>
                {isFromBattle ? (
                  <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 2 }}>
                    HP {currentHp}/{maxHp}
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: THEME.text.secondary }}>Lv.{level}</span>
                      <span style={{ fontSize: 10, color: THEME.text.tertiary }}>
                        {level >= 4 ? 'MAX' : `${exp}/${EXP_PER_LEVEL} EXP`}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 5,
                      background: THEME.border.subtle,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: level >= 4 ? '100%' : `${(exp / EXP_PER_LEVEL) * 100}%`,
                        height: '100%',
                        background: level >= 4 ? '#22c55e' : THEME.accent,
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {showNav && (
                <button
                  onClick={handleNext}
                  className="pdp-nav-btn"
                  style={navBtnStyle}
                  title="Next Pokemon"
                >
                  &#8250;
                </button>
              )}

              <button
                onClick={onClose}
                className="pdp-nav-btn"
                style={{
                  ...navBtnStyle,
                  marginLeft: showNav ? 0 : 'auto',
                }}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* ── Tabs ── */}
            <div style={{
              display: 'flex',
              gap: 2,
              padding: '8px 16px',
              background: THEME.bg.panelDark,
              borderBottom: `1px solid ${THEME.border.subtle}`,
              flexShrink: 0,
            }}>
              {(['skills', 'stats', 'deck'] as Tab[]).map(tab => {
                const isActive = activeTab === tab;
                const color = TAB_COLORS[tab];
                const label = tab === 'deck'
                  ? `Deck (${deck.length})`
                  : tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="pdp-tab-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 4,
                      border: isActive ? `1px solid ${color}50` : '1px solid transparent',
                      background: isActive ? `${color}12` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isActive ? 'bold' : 'normal',
                      color: isActive ? color : THEME.text.tertiary,
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      opacity: isActive ? 1 : 0.4,
                      boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content (scrollable, keyed for cross-fade) ── */}
            <div
              key={`${formId}-${activeTab}`}
              className="pdp-content"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: 20,
                background: 'radial-gradient(ellipse at 50% 45%, #0d1b2a 0%, #070e18 55%, #020408 100%)',
              }}
            >
              {activeTab === 'stats' && (
                <StatsContent
                  currentHp={currentHp}
                  maxHp={maxHp}
                  speed={speed}
                  energyPerTurn={energyPerTurn}
                  energyCap={energyCap}
                  handSize={handSize}
                  deckSize={deck.length}
                  types={basePokemon.types}
                  passiveInfos={passiveInfos}
                />
              )}

              {activeTab === 'skills' && (
                <SkillsContent
                  tree={tree}
                  level={level}
                  exp={exp}
                  canLevel={canLevel}
                  isFromBattle={isFromBattle}
                  passiveInfos={passiveInfos}
                  onLevelUp={onLevelUp ? handleLevelUp : undefined}
                />
              )}

              {activeTab === 'deck' && (
                <DeckContent deck={deck} deckCards={deckCards} />
              )}
            </div>

            {/* ── Footer: diamond pips ── */}
            {showNav && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 0',
                borderTop: `1px solid ${THEME.border.subtle}`,
                background: THEME.bg.panelDark,
                flexShrink: 0,
              }}>
                {Array.from({ length: partySize }, (_, i) => (
                  <DiamondPip key={i} filled={i === pokemonIndex} />
                ))}
              </div>
            )}
          </div>
        </DexFrame>
      </div>

      {/* ── Animations ── */}
      <style>{`
        .pdp-overlay {
          animation: pdpFadeIn 0.15s ease-out forwards;
        }
        .pdp-panel {
          animation: pdpSlideIn 0.2s ease-out forwards;
        }
        .pdp-content {
          animation: pdpContentIn 0.15s ease-out forwards;
        }
        @keyframes pdpFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pdpSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pdpContentIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pdp-nav-btn {
          transition: border-color 0.15s, color 0.15s;
        }
        .pdp-nav-btn:hover {
          border-color: ${THEME.accent} !important;
          color: ${THEME.accent} !important;
        }
        .pdp-tab-btn {
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .pdp-tab-btn:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .pdp-content::-webkit-scrollbar { width: 4px; }
        .pdp-content::-webkit-scrollbar-track { background: transparent; }
        .pdp-content::-webkit-scrollbar-thumb {
          background: ${THEME.border.subtle};
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ── Stats tab ────────────────────────────────────────────────────────

function StatsContent({
  currentHp, maxHp, speed, energyPerTurn, energyCap, handSize, deckSize, types, passiveInfos,
}: {
  currentHp: number;
  maxHp: number;
  speed: number;
  energyPerTurn: number;
  energyCap: number;
  handSize: number;
  deckSize: number;
  types: string[];
  passiveInfos: PassiveInfo[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Combat Stats */}
      <div>
        <SectionLabel>Combat Stats</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <StatBox label="HP" value={`${currentHp}/${maxHp}`} color="#ef4444" />
          <StatBox label="Speed" value={speed.toString()} color={THEME.accent} />
          <StatBox label="Energy / Turn" value={energyPerTurn.toString()} color="#60a5fa" />
          <StatBox label="Energy Cap" value={energyCap.toString()} color="#a855f7" />
          <StatBox label="Cards / Turn" value={handSize.toString()} color="#4ade80" />
          <StatBox label="Deck Size" value={deckSize.toString()} color="#f97316" />
        </div>
      </div>

      {/* Types */}
      <div>
        <SectionLabel>Types</SectionLabel>
        <div style={{ display: 'flex', gap: 12 }}>
          {types.map((type, i) => {
            const color = TYPE_COLORS[type] || '#888';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {type}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Passive Abilities */}
      <div>
        <SectionLabel>Passive Abilities</SectionLabel>
        {passiveInfos.length === 0 ? (
          <div style={{
            padding: 16,
            background: THEME.chrome.backdrop,
            borderRadius: 4,
            color: THEME.text.tertiary,
            fontStyle: 'italic',
            textAlign: 'center',
            fontSize: 13,
          }}>
            No passive abilities yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {passiveInfos.map((info, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: THEME.chrome.backdrop,
                borderRadius: 4,
                borderLeft: `3px solid ${THEME.accent}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: THEME.accent }}>
                  {info.name}
                </div>
                <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 3 }}>
                  {info.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skills tab ───────────────────────────────────────────────────────

function SkillsContent({
  tree, level, exp, canLevel, isFromBattle, passiveInfos, onLevelUp,
}: {
  tree: ReturnType<typeof getProgressionTree>;
  level: number;
  exp: number;
  canLevel: boolean;
  isFromBattle: boolean;
  passiveInfos: PassiveInfo[];
  onLevelUp?: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Active passives (especially useful for enemy inspection) */}
      {passiveInfos.length > 0 && (
        <div>
          <SectionLabel>Active Passives</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {passiveInfos.map((passive) => (
              <div key={passive.id} style={{
                padding: '10px 12px',
                borderRadius: 4,
                background: '#22c55e12',
                border: '1px solid #22c55e30',
              }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#22c55e' }}>
                  {passive.name}
                </div>
                <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 3 }}>
                  {passive.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {passiveInfos.length === 0 && !tree && (
        <div style={{ color: THEME.text.tertiary, fontStyle: 'italic', textAlign: 'center', padding: 24, fontSize: 13 }}>
          No passive abilities
        </div>
      )}

      {/* Skill tree — disclaimer-style dividers with diamond rail */}
      {tree && (
        <div>
          <SectionLabel>Skill Tree</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tree.rungs.map((rung, i) => {
              const isUnlocked = level >= rung.level;
              const isCurrent = level === rung.level;
              const isNext = level + 1 === rung.level;
              const diamondColor = isCurrent
                ? THEME.accent
                : isUnlocked ? '#22c55e' : THEME.border.medium;

              return (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  {/* Left rail: connector + diamond */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 14,
                    flexShrink: 0,
                  }}>
                    {i > 0 && (
                      <div style={{
                        width: 1,
                        height: 8,
                        background: isUnlocked ? '#22c55e50' : THEME.border.subtle,
                      }} />
                    )}
                    <DiamondNode color={diamondColor} size={12} />
                    {i < tree.rungs.length - 1 && (
                      <div style={{
                        width: 1,
                        flex: 1,
                        background: isUnlocked ? '#22c55e50' : THEME.border.subtle,
                      }} />
                    )}
                  </div>

                  {/* Right: rung content — disclaimer-style structure */}
                  <div style={{
                    flex: 1,
                    paddingTop: i > 0 ? 10 : 0,
                    paddingBottom: 10,
                    borderTop: i > 0 ? `1px solid ${THEME.border.subtle}` : 'none',
                    opacity: isUnlocked || isNext ? 1 : 0.5,
                  }}>
                    <div style={{ paddingLeft: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: isCurrent ? THEME.text.primary : isUnlocked ? '#22c55e' : THEME.text.secondary,
                        }}>
                          {rung.name}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 'bold',
                            color: THEME.accent,
                            ...THEME.heading,
                            letterSpacing: '0.1em',
                          }}>
                            CURRENT
                          </span>
                        )}
                        {isNext && canLevel && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 'bold',
                            color: THEME.accent,
                            padding: '2px 6px',
                            border: `1px dashed ${THEME.accent}60`,
                            borderRadius: 3,
                            ...THEME.heading,
                            letterSpacing: '0.1em',
                          }}>
                            NEXT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 2 }}>
                        {rung.description}
                      </div>
                      {rung.passiveId !== 'none' && (
                        <div
                          style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}
                          title={PASSIVE_DEFINITIONS[rung.passiveId]?.description || ''}
                        >
                          {PASSIVE_DEFINITIONS[rung.passiveId]?.name}: {PASSIVE_DEFINITIONS[rung.passiveId]?.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Level up / status */}
      {tree && (
        <div style={{ marginTop: 4 }}>
          {canLevel && onLevelUp && (
            <button
              onClick={onLevelUp}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: 14,
                ...THEME.button.primary,
              }}
            >
              Level Up (Spend {EXP_PER_LEVEL} EXP)
            </button>
          )}

          {!canLevel && !isFromBattle && level < 4 && (
            <div style={{
              textAlign: 'center',
              color: THEME.text.tertiary,
              fontSize: 13,
              padding: 8,
            }}>
              Need {EXP_PER_LEVEL} EXP to level up (current: {exp})
            </div>
          )}

          {level >= 4 && (
            <div style={{
              textAlign: 'center',
              color: '#22c55e',
              fontSize: 14,
              fontWeight: 'bold',
              padding: 8,
            }}>
              Max Level Reached
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deck tab ─────────────────────────────────────────────────────────

function DeckContent({ deck, deckCards }: { deck: string[]; deckCards: MoveDefinition[] }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: THEME.text.tertiary, marginBottom: 16, textAlign: 'center' }}>
        {deck.length} card{deck.length !== 1 ? 's' : ''} in deck
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
          fontStyle: 'italic',
          fontSize: 13,
        }}>
          No cards in deck
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9,
      color: THEME.text.tertiary,
      ...THEME.heading,
      letterSpacing: '0.12em',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: THEME.chrome.backdrop,
      borderRadius: 4,
      borderLeft: `3px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 12, color: THEME.text.secondary }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 'bold', color }}>{value}</span>
    </div>
  );
}
