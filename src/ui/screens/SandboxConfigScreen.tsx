import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PokemonData, Position, Row, Column, MoveType, CardRarity, StatusType } from '../../engine/types';
import { getPokemon, getMove, MOVES } from '../../data/loaders';
import {
  PROGRESSION_TREES,
  getProgressionTree,
  getRungForLevel,
  PASSIVE_DEFINITIONS,
  type PassiveId,
} from '../../run/progression';
import { CardPreview } from '../components/CardPreview';
import { Flourish } from '../components/Flourish';
import { DexFrame } from '../components/DexFrame';
import { PokemonTile, TYPE_COLORS } from '../components/PokemonTile';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

// ── Constants ──────────────────────────────────────────────────────

const AVAILABLE_POKEMON = Object.keys(PROGRESSION_TREES);

const ALL_TYPES: MoveType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'poison',
  'flying', 'psychic', 'dark', 'fighting', 'ice', 'bug',
  'dragon', 'ghost', 'rock', 'ground', 'steel', 'fairy', 'item',
];

const ALL_RARITIES: CardRarity[] = [
  'basic', 'common', 'uncommon', 'rare', 'epic', 'legendary',
];

const ALL_STATUSES: StatusType[] = [
  'burn', 'poison', 'paralysis', 'slow', 'enfeeble', 'sleep', 'leech', 'taunt',
  'strength', 'evasion', 'haste',
];

const STATUS_COLORS: Record<StatusType, string> = {
  burn: '#f97316',
  poison: '#a855f7',
  paralysis: '#facc15',
  slow: '#60a5fa',
  enfeeble: '#f87171',
  sleep: '#94a3b8',
  leech: '#4ade80',
  strength: '#ef4444',
  evasion: '#67e8f9',
  haste: '#fbbf24',
  taunt: '#dc2626',
};


// ── Exported interfaces (preserved for App.tsx compatibility) ──────

export interface SandboxPokemon {
  id: string;
  baseFormId: string;
  level: number;
  has999Hp: boolean;
  startAt50Percent: boolean;
  position: Position;
  customDeck: string[] | null;
}

interface Props {
  onStartBattle: (
    players: PokemonData[],
    enemies: PokemonData[],
    playerPositions: Position[],
    enemyPositions: Position[],
    playerPassives: Map<number, string[]>,
    enemyPassives: Map<number, string[]>,
    hpOverrides: Map<string, { maxHp?: number; startPercent?: number }>
  ) => void;
  onBack: () => void;
  initialPlayerTeam?: SandboxPokemon[];
  initialEnemyTeam?: SandboxPokemon[];
  onConfigChange?: (playerTeam: SandboxPokemon[], enemyTeam: SandboxPokemon[]) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getFormIdAtLevel(baseFormId: string, level: number): string {
  const tree = getProgressionTree(baseFormId);
  if (!tree) return baseFormId;

  let currentFormId = baseFormId;
  for (let l = 1; l <= level; l++) {
    const rung = getRungForLevel(tree, l);
    if (rung?.evolvesTo) {
      currentFormId = rung.evolvesTo;
    }
  }
  return currentFormId;
}

function getPassivesAtLevel(baseFormId: string, level: number): string[] {
  const tree = getProgressionTree(baseFormId);
  if (!tree) return [];

  const passives: string[] = [];
  for (let l = 1; l <= level; l++) {
    const rung = getRungForLevel(tree, l);
    if (rung && rung.passiveId !== 'none') {
      passives.push(rung.passiveId);
    }
  }
  return passives;
}

function getDeckAtLevel(baseFormId: string, level: number): string[] {
  const tree = getProgressionTree(baseFormId);
  const formId = getFormIdAtLevel(baseFormId, level);
  const basePokemon = getPokemon(formId);
  const deck = [...basePokemon.deck];

  if (tree) {
    for (let l = 1; l <= level; l++) {
      const rung = getRungForLevel(tree, l);
      if (rung?.cardsToAdd) {
        deck.push(...rung.cardsToAdd);
      }
    }
  }

  return deck;
}

let nextId = 1;
function generateId(): string {
  return `pokemon-${nextId++}`;
}

function makeSpriteUrl(formId: string, variant: 'front' | 'back' = 'front'): string {
  const prefix = variant === 'back' ? 'back-' : '';
  return `https://img.pokemondb.net/sprites/black-white/anim/${prefix}normal/${formId}.gif`;
}

// ── Sub-components ─────────────────────────────────────────────────

function FilterButton({ label, isSelected, onClick, color }: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 'bold',
        borderRadius: 4,
        border: isSelected ? `2px solid ${color}` : `1px solid transparent`,
        background: isSelected ? `${color}33` : THEME.bg.elevated,
        color: isSelected ? color : THEME.text.secondary,
        cursor: 'pointer',
        textTransform: 'capitalize',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── Section Header (matches PokeDex/CardDex) ─────────────────────

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div style={{
      fontSize: 10,
      color: color ?? THEME.text.tertiary,
      ...THEME.heading,
      letterSpacing: '0.12em',
      textAlign: 'center',
      marginBottom: 6,
    }}>
      {label}
    </div>
  );
}

// ── DeckEditorModal ────────────────────────────────────────────────

function DeckEditorModal({
  currentDeck,
  defaultDeck,
  onUpdateDeck,
  onClose,
}: {
  currentDeck: string[];
  defaultDeck: string[];
  onUpdateDeck: (deck: string[] | null) => void;
  onClose: () => void;
}) {
  const [selectedType, setSelectedType] = useState<MoveType | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<CardRarity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusType | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  const filteredCards = useMemo(() => {
    const allCardIds = Object.keys(MOVES);
    return allCardIds
      .map(id => getMove(id))
      .filter(card => {
        if (selectedType !== 'all' && card.type !== selectedType) return false;
        if (selectedRarity !== 'all' && card.rarity !== selectedRarity) return false;
        if (selectedStatus !== 'all') {
          const appliesStatus = card.effects.some(e =>
            (e.type === 'apply_status' || e.type === 'apply_status_self') && e.status === selectedStatus
          );
          if (!appliesStatus) return false;
        }
        if (searchText && !card.name.toLowerCase().includes(searchText.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const typeCompare = ALL_TYPES.indexOf(a.type) - ALL_TYPES.indexOf(b.type);
        if (typeCompare !== 0) return typeCompare;
        const rarityA = a.rarity ?? 'basic';
        const rarityB = b.rarity ?? 'basic';
        const rarityCompare = ALL_RARITIES.indexOf(rarityA) - ALL_RARITIES.indexOf(rarityB);
        if (rarityCompare !== 0) return rarityCompare;
        return a.name.localeCompare(b.name);
      });
  }, [selectedType, selectedRarity, selectedStatus, searchText]);

  const addCard = (cardId: string) => onUpdateDeck([...currentDeck, cardId]);
  const removeCard = (index: number) => onUpdateDeck(currentDeck.filter((_, i) => i !== index));
  const resetDeck = () => onUpdateDeck(null);
  const isCustomized = JSON.stringify(currentDeck) !== JSON.stringify(defaultDeck);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 1000,
          height: '85%',
          background: THEME.bg.panelDark,
          borderRadius: 12,
          border: `1px solid ${THEME.border.medium}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${THEME.border.subtle}`,
        }}>
          <h2 style={{ margin: 0, color: THEME.accent, fontSize: 20, ...THEME.heading }}>Edit Deck</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            {isCustomized && (
              <button onClick={resetDeck} style={{ padding: '6px 16px', ...THEME.button.secondary, fontSize: 13 }}>
                Reset to Default
              </button>
            )}
            <button onClick={onClose} style={{ padding: '6px 20px', ...THEME.button.primary, fontSize: 13 }}>
              Done
            </button>
          </div>
        </div>

        {/* Current Deck Preview */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${THEME.border.subtle}`,
          background: THEME.bg.base,
        }}>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 8 }}>
            Current Deck ({currentDeck.length} cards) - Click to remove:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
            {currentDeck.length === 0 ? (
              <div style={{ color: THEME.text.tertiary, fontStyle: 'italic', fontSize: 12 }}>No cards in deck</div>
            ) : (
              currentDeck.map((cardId, i) => {
                const card = getMove(cardId);
                return (
                  <div
                    key={`${cardId}-${i}`}
                    onClick={() => removeCard(i)}
                    style={{
                      fontSize: 11, padding: '4px 8px',
                      background: `${TYPE_COLORS[card.type]}22`,
                      border: `1px solid ${TYPE_COLORS[card.type]}66`,
                      borderRadius: 4, color: THEME.text.primary,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    title="Click to remove"
                  >
                    {card.name} x
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${THEME.border.subtle}`,
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            type="text" placeholder="Search cards..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '6px 12px', background: THEME.bg.elevated,
              border: `1px solid ${THEME.border.medium}`, borderRadius: 6,
              color: THEME.text.primary, fontSize: 12, width: 150,
            }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.text.tertiary, marginRight: 4 }}>Type:</span>
            <FilterButton label="All" isSelected={selectedType === 'all'} onClick={() => setSelectedType('all')} color={THEME.text.secondary} />
            {ALL_TYPES.map(type => (
              <FilterButton key={type} label={type} isSelected={selectedType === type} onClick={() => setSelectedType(type)} color={TYPE_COLORS[type]} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.text.tertiary, marginRight: 4 }}>Rarity:</span>
            <FilterButton label="All" isSelected={selectedRarity === 'all'} onClick={() => setSelectedRarity('all')} color={THEME.text.secondary} />
            {ALL_RARITIES.map(rarity => (
              <FilterButton key={rarity} label={rarity} isSelected={selectedRarity === rarity} onClick={() => setSelectedRarity(rarity)} color={THEME.text.secondary} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.text.tertiary, marginRight: 4 }}>Status:</span>
            <FilterButton label="All" isSelected={selectedStatus === 'all'} onClick={() => setSelectedStatus('all')} color={THEME.text.secondary} />
            {ALL_STATUSES.map(status => (
              <FilterButton key={status} label={status} isSelected={selectedStatus === status} onClick={() => setSelectedStatus(status)} color={STATUS_COLORS[status]} />
            ))}
          </div>
        </div>

        <div style={{ padding: '8px 20px', fontSize: 12, color: THEME.text.tertiary }}>
          Showing {filteredCards.length} cards - Click to add to deck
        </div>

        {/* Card Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12, justifyItems: 'center',
          }}>
            {filteredCards.map(card => (
              <div key={card.id} onClick={() => addCard(card.id)} style={{ cursor: 'pointer' }}>
                <CardPreview card={card} showHoverEffect={true} />
              </div>
            ))}
          </div>
          {filteredCards.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: THEME.text.tertiary }}>
              No cards match the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FormationSlot ──────────────────────────────────────────────────

function FormationSlot({
  pokemon,
  onClick,
  onRemove,
  onDrop,
  isSelected,
  side,
}: {
  pokemon: SandboxPokemon | null;
  onClick: () => void;
  onRemove: () => void;
  onDrop: (baseFormId: string) => void;
  isSelected: boolean;
  side: 'player' | 'enemy';
}) {
  const [dragOver, setDragOver] = useState(false);

  const formId = pokemon ? getFormIdAtLevel(pokemon.baseFormId, pokemon.level) : null;
  const sprite = formId
    ? makeSpriteUrl(formId, side === 'player' ? 'back' : 'front')
    : null;

  const borderColor = isSelected
    ? THEME.accent
    : dragOver
      ? THEME.status.energy
      : pokemon
        ? THEME.border.medium
        : THEME.border.subtle;

  const borderStyle = pokemon || isSelected || dragOver ? 'solid' : 'dashed';
  const bg = isSelected
    ? `${THEME.accent}10`
    : dragOver
      ? `${THEME.status.energy}10`
      : pokemon
        ? THEME.bg.panel
        : 'transparent';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const baseFormId = e.dataTransfer.getData('text/plain');
    if (baseFormId) onDrop(baseFormId);
  };

  return (
    <div
      className="sbx-slot"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: 100,
        height: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        border: `1.5px ${borderStyle} ${borderColor}`,
        borderRadius: 8,
        cursor: pokemon ? 'pointer' : 'default',
        position: 'relative',
        transition: 'all 0.2s',
      }}
    >
      {pokemon ? (
        <>
          {sprite && (
            <img
              src={sprite}
              alt={formId || ''}
              style={{
                width: 60,
                height: 60,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                filter: isSelected ? `drop-shadow(0 0 6px ${THEME.accent}40)` : 'none',
                transition: 'filter 0.2s',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={{
            fontSize: 10,
            color: isSelected ? THEME.accent : THEME.text.primary,
            fontWeight: 'bold',
            ...THEME.heading,
            letterSpacing: '0.08em',
          }}>
            Lv.{pokemon.level}
          </div>
          {/* HP indicators */}
          <div style={{ display: 'flex', gap: 2, position: 'absolute', top: 3, right: 3 }}>
            {pokemon.has999Hp && (
              <span style={{
                fontSize: 8,
                background: `${THEME.status.heal}30`,
                color: THEME.status.heal,
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 'bold',
                border: `1px solid ${THEME.status.heal}40`,
              }}>999</span>
            )}
            {pokemon.startAt50Percent && (
              <span style={{
                fontSize: 8,
                background: '#fcd34d20',
                color: '#fcd34d',
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 'bold',
                border: '1px solid #fcd34d40',
              }}>50%</span>
            )}
          </div>
          <button
            className="sbx-remove-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: 'absolute', top: -8, left: -8,
              width: 18, height: 18, borderRadius: '50%',
              background: 'transparent',
              border: `1.5px solid ${THEME.status.damage}60`,
              color: THEME.status.damage,
              cursor: 'pointer', fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            x
          </button>
        </>
      ) : (
        <div style={{
          fontSize: 10,
          color: dragOver ? THEME.status.energy : THEME.text.tertiary,
          ...THEME.heading,
          letterSpacing: '0.06em',
        }}>
          {dragOver ? 'Drop' : 'Empty'}
        </div>
      )}
    </div>
  );
}

// ── FormationGrid (2 columns x 3 rows, mirroring battle layout) ───
// Player: [Back | Front]  (back on left, front faces center)
// Enemy:  [Front | Back]  (front faces center, back on right)

function FormationGrid({
  team,
  side,
  editingId,
  onSlotClick,
  onRemove,
  onDrop,
}: {
  team: SandboxPokemon[];
  side: 'player' | 'enemy';
  editingId: string | null;
  onSlotClick: (row: Row, col: Column) => void;
  onRemove: (row: Row, col: Column) => void;
  onDrop: (row: Row, col: Column, baseFormId: string) => void;
}) {
  const positions: Column[] = [0, 1, 2];
  // Column order: player = back then front; enemy = front then back
  const colOrder: Row[] = side === 'player' ? ['back', 'front'] : ['front', 'back'];
  const colLabels = side === 'player' ? ['Back', 'Front'] : ['Front', 'Back'];

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      {colOrder.map((row, ci) => (
        <div key={row} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontSize: 9,
            color: THEME.text.tertiary,
            ...THEME.heading,
            letterSpacing: '0.1em',
          }}>
            {colLabels[ci]}
          </div>
          {positions.map(col => {
            const pokemon = team.find(p => p.position.row === row && p.position.column === col);
            return (
              <FormationSlot
                key={`${row}-${col}`}
                pokemon={pokemon || null}
                onClick={() => onSlotClick(row, col)}
                onRemove={() => onRemove(row, col)}
                onDrop={(baseFormId) => onDrop(row, col, baseFormId)}
                isSelected={pokemon?.id === editingId}
                side={side}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── InlineDetailEditor ─────────────────────────────────────────────

function InlineDetailEditor({
  pokemon,
  onUpdate,
  onRemove,
  onOpenDeckEditor,
}: {
  pokemon: SandboxPokemon;
  onUpdate: (pokemon: SandboxPokemon) => void;
  onRemove: () => void;
  onOpenDeckEditor: () => void;
}) {
  const formId = getFormIdAtLevel(pokemon.baseFormId, pokemon.level);
  const passives = getPassivesAtLevel(pokemon.baseFormId, pokemon.level);
  const defaultDeck = getDeckAtLevel(pokemon.baseFormId, pokemon.level);
  const currentDeck = pokemon.customDeck ?? defaultDeck;
  const isCustomDeck = pokemon.customDeck !== null;
  const pokemonData = getPokemon(formId);
  const primaryColor = TYPE_COLORS[pokemonData.types[0]];

  return (
    <DexFrame>
      <div className="sbx-editor" style={{
        padding: '18px 24px 22px',
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        {/* Sprite + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, gap: 4 }}>
          <img
            src={makeSpriteUrl(formId)}
            alt={formId}
            style={{
              width: 56,
              height: 56,
              imageRendering: 'pixelated',
              objectFit: 'contain',
              filter: `drop-shadow(0 0 6px ${primaryColor}30)`,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: THEME.accent,
            ...THEME.heading,
            letterSpacing: '0.1em',
          }}>
            {pokemonData.name}
          </div>
          <Flourish variant="heading" width={50} color={primaryColor} />
        </div>

        {/* Level — preserves customDeck */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: THEME.text.tertiary, ...THEME.heading, letterSpacing: '0.1em' }}>Level</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4].map(l => {
              const isActive = pokemon.level === l;
              const levelColor = getLevelColor(l);
              return (
                <button
                  key={l}
                  className="sbx-level-btn"
                  onClick={() => onUpdate({ ...pokemon, level: l })}
                  style={{
                    width: 30, height: 30,
                    border: isActive ? `1.5px solid ${levelColor}` : `1px solid ${THEME.border.subtle}`,
                    background: isActive ? `${levelColor}20` : 'transparent',
                    color: isActive ? levelColor : THEME.text.tertiary,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 'bold',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? `0 0 8px ${levelColor}20` : 'none',
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Passives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
          <div style={{ fontSize: 10, color: THEME.text.tertiary, ...THEME.heading, letterSpacing: '0.1em' }}>Passives</div>
          {passives.length === 0 ? (
            <div style={{ fontSize: 12, color: THEME.text.tertiary, fontStyle: 'italic' }}>None</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {passives.map(p => {
                const def = PASSIVE_DEFINITIONS[p as PassiveId];
                return (
                  <div key={p} style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <span style={{ color: THEME.accent, fontWeight: 'bold' }}>
                      {def?.name ?? p}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HP toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: THEME.text.tertiary, ...THEME.heading, letterSpacing: '0.1em' }}>HP</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox" checked={pokemon.has999Hp}
              onChange={(e) => onUpdate({ ...pokemon, has999Hp: e.target.checked })}
              style={{ width: 14, height: 14, accentColor: THEME.status.heal }}
            />
            <span style={{ fontSize: 12, color: THEME.status.heal }}>999 HP</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox" checked={pokemon.startAt50Percent}
              onChange={(e) => onUpdate({ ...pokemon, startAt50Percent: e.target.checked })}
              style={{ width: 14, height: 14, accentColor: '#fcd34d' }}
            />
            <span style={{ fontSize: 12, color: '#fcd34d' }}>Start 50%</span>
          </label>
        </div>

        {/* Deck preview + Edit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, ...THEME.heading, letterSpacing: '0.1em' }}>
              Deck ({currentDeck.length}){isCustomDeck ? ' *' : ''}
            </div>
            <button
              onClick={onOpenDeckEditor}
              style={{ padding: '3px 10px', ...THEME.button.primary, fontSize: 10 }}
            >
              Edit Deck
            </button>
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 3,
            maxHeight: 56, overflowY: 'auto',
            padding: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 4,
            border: `1px solid ${THEME.border.subtle}`,
          }}>
            {currentDeck.map((cardId, i) => {
              const card = getMove(cardId);
              return (
                <div
                  key={`${cardId}-${i}`}
                  style={{
                    fontSize: 10, padding: '2px 5px',
                    background: `${TYPE_COLORS[card.type]}15`,
                    border: `1px solid ${TYPE_COLORS[card.type]}35`,
                    borderRadius: 3, color: THEME.text.primary,
                  }}
                >
                  {card.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Remove */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center' }}>
          <button
            className="sbx-remove-detail-btn"
            onClick={onRemove}
            style={{
              padding: '6px 14px',
              ...THEME.button.secondary,
              color: THEME.status.damage,
              borderColor: THEME.status.damage + '40',
              fontSize: 11,
              transition: 'all 0.15s',
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </DexFrame>
  );
}

// ── PokemonRosterTile (draggable) ──────────────────────────────────

function PokemonRosterTile({
  pokemonId,
  onDragStart,
  onDragEnd,
}: {
  pokemonId: string;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const pokemon = getPokemon(pokemonId);

  return (
    <PokemonTile
      name={pokemon.name}
      spriteUrl={makeSpriteUrl(pokemonId)}
      primaryType={pokemon.types[0]}
      size="small"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
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

// ── Root: SandboxConfigScreen ──────────────────────────────────────

export function SandboxConfigScreen({
  onStartBattle,
  onBack,
  initialPlayerTeam = [],
  initialEnemyTeam = [],
  onConfigChange,
}: Props) {
  const [playerTeam, setPlayerTeam] = useState<SandboxPokemon[]>(initialPlayerTeam);
  const [enemyTeam, setEnemyTeam] = useState<SandboxPokemon[]>(initialEnemyTeam);
  const [editingPokemonId, setEditingPokemonId] = useState<string | null>(null);
  const [editingSide, setEditingSide] = useState<'player' | 'enemy'>('player');
  const [showDeckEditor, setShowDeckEditor] = useState(false);

  // Persist config changes to parent
  useEffect(() => {
    onConfigChange?.(playerTeam, enemyTeam);
  }, [playerTeam, enemyTeam, onConfigChange]);

  // Close editor on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingPokemonId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const setTeam = (side: 'player' | 'enemy') => side === 'player' ? setPlayerTeam : setEnemyTeam;

  // ── Drag from roster ──

  const handleDragStart = (e: React.DragEvent, baseFormId: string) => {
    e.dataTransfer.setData('text/plain', baseFormId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // ── Drop onto a slot ──

  const handleDrop = useCallback((side: 'player' | 'enemy', row: Row, col: Column, baseFormId: string) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const existingIndex = team.findIndex(p => p.position.row === row && p.position.column === col);

    const newPokemon: SandboxPokemon = {
      id: generateId(),
      baseFormId,
      level: 1,
      has999Hp: true,
      startAt50Percent: false,
      position: { row, column: col },
      customDeck: null,
    };

    if (existingIndex >= 0) {
      // Replace existing pokemon in slot
      setTeam(side)(t => t.map((p, i) => i === existingIndex ? newPokemon : p));
    } else if (team.length < 6) {
      setTeam(side)(t => [...t, newPokemon]);
    }

    // Auto-select the dropped pokemon for editing
    setEditingPokemonId(newPokemon.id);
    setEditingSide(side);
  }, [playerTeam, enemyTeam]);

  // ── Slot click → select for editing, or swap/move if already editing ──

  const handleSlotClick = useCallback((side: 'player' | 'enemy', row: Row, col: Column) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const pokemon = team.find(p => p.position.row === row && p.position.column === col);

    // If editing a pokemon on THIS side and click a different slot → swap/move
    if (editingPokemonId !== null && editingSide === side) {
      const editingPokemon = team.find(p => p.id === editingPokemonId);
      if (editingPokemon) {
        // Same slot → close editor
        if (editingPokemon.position.row === row && editingPokemon.position.column === col) {
          setEditingPokemonId(null);
          return;
        }
        // Swap or move
        if (pokemon) {
          setTeam(side)(t => t.map(p => {
            if (p.id === editingPokemonId) return { ...p, position: { row, column: col } };
            if (p.position.row === row && p.position.column === col) return { ...p, position: editingPokemon.position };
            return p;
          }));
        } else {
          setTeam(side)(t => t.map(p =>
            p.id === editingPokemonId ? { ...p, position: { row, column: col } } : p
          ));
        }
        return;
      }
    }

    // Click a filled slot → select it
    if (pokemon) {
      setEditingPokemonId(pokemon.id);
      setEditingSide(side);
    }
  }, [playerTeam, enemyTeam, editingPokemonId, editingSide]);

  // ── Remove ──

  const handleRemove = useCallback((side: 'player' | 'enemy', row: Row, col: Column) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const pokemon = team.find(p => p.position.row === row && p.position.column === col);
    if (pokemon && pokemon.id === editingPokemonId) setEditingPokemonId(null);
    setTeam(side)(t => t.filter(p => !(p.position.row === row && p.position.column === col)));
  }, [playerTeam, enemyTeam, editingPokemonId]);

  const handleRemoveEditing = useCallback((side: 'player' | 'enemy') => {
    if (!editingPokemonId) return;
    setTeam(side)(t => t.filter(p => p.id !== editingPokemonId));
    setEditingPokemonId(null);
  }, [editingPokemonId]);

  // ── Update pokemon ──

  const handleUpdatePokemon = useCallback((side: 'player' | 'enemy', updated: SandboxPokemon) => {
    setTeam(side)(t => t.map(p => p.id === updated.id ? updated : p));
  }, []);

  // ── Deck editor ──

  const editingPokemon = editingPokemonId
    ? (editingSide === 'player' ? playerTeam : enemyTeam).find(p => p.id === editingPokemonId)
    : null;

  const selectedDefaultDeck = editingPokemon
    ? getDeckAtLevel(editingPokemon.baseFormId, editingPokemon.level) : [];
  const selectedCurrentDeck = editingPokemon
    ? (editingPokemon.customDeck ?? selectedDefaultDeck) : [];

  const handleUpdateDeck = useCallback((deck: string[] | null) => {
    if (!editingPokemonId) return;
    setTeam(editingSide)(t => t.map(p =>
      p.id === editingPokemonId ? { ...p, customDeck: deck } : p
    ));
  }, [editingPokemonId, editingSide]);

  // ── Start battle ──

  const handleStartBattle = useCallback(() => {
    if (playerTeam.length === 0 || enemyTeam.length === 0) return;

    const players: PokemonData[] = playerTeam.map(p => {
      const formId = getFormIdAtLevel(p.baseFormId, p.level);
      const basePokemon = getPokemon(formId);
      const deck = p.customDeck ?? getDeckAtLevel(p.baseFormId, p.level);
      return { ...basePokemon, id: formId, deck };
    });

    const enemies: PokemonData[] = enemyTeam.map(p => {
      const formId = getFormIdAtLevel(p.baseFormId, p.level);
      const basePokemon = getPokemon(formId);
      const deck = p.customDeck ?? getDeckAtLevel(p.baseFormId, p.level);
      return { ...basePokemon, id: formId, deck };
    });

    const playerPositions = playerTeam.map(p => p.position);
    const enemyPositions = enemyTeam.map(p => p.position);

    const playerPassives = new Map<number, string[]>();
    playerTeam.forEach((p, i) => {
      playerPassives.set(i, getPassivesAtLevel(p.baseFormId, p.level));
    });

    const enemyPassives = new Map<number, string[]>();
    enemyTeam.forEach((p, i) => {
      enemyPassives.set(i, getPassivesAtLevel(p.baseFormId, p.level));
    });

    const hpOverrides = new Map<string, { maxHp?: number; startPercent?: number }>();
    [...playerTeam, ...enemyTeam].forEach((p, i) => {
      const overrides: { maxHp?: number; startPercent?: number } = {};
      if (p.has999Hp) overrides.maxHp = 999;
      if (p.startAt50Percent) overrides.startPercent = 0.5;
      if (Object.keys(overrides).length > 0) {
        const key = i < playerTeam.length ? `player-${i}` : `enemy-${i - playerTeam.length}`;
        hpOverrides.set(key, overrides);
      }
    });

    onStartBattle(players, enemies, playerPositions, enemyPositions, playerPassives, enemyPassives, hpOverrides);
  }, [playerTeam, enemyTeam, onStartBattle]);

  const canStart = playerTeam.length > 0 && enemyTeam.length > 0;

  // Helpers for which editor to show
  const playerEditingPokemon = editingSide === 'player' ? editingPokemon : null;
  const enemyEditingPokemon = editingSide === 'enemy' ? editingPokemon : null;

  // ── Render ──

  const headerBar = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: `1px solid ${THEME.border.subtle}`,
    }}>
      <button
        onClick={onBack}
        style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}
      >
        &larr; Back
      </button>
      <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
        Sandbox Battle
      </h1>
      <button
        onClick={handleStartBattle}
        disabled={!canStart}
        style={{
          padding: '10px 24px',
          ...(canStart ? THEME.button.primary : THEME.button.secondary),
          fontSize: 14,
          opacity: canStart ? 1 : 0.4,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}
      >
        Start Battle &rarr;
      </button>
    </div>
  );

  return (
    <ScreenShell header={headerBar} ambient>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* ── Battlefield row: [Player Grid] [Roster] [Enemy Grid] ── */}
        <div className="sbx-battlefield" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: 20,
        }}>
          {/* Player side */}
          <div className="sbx-team-panel" style={{ animationDelay: '0ms' }}>
            <DexFrame>
              <div style={{ padding: '16px 18px 20px' }}>
                <SectionLabel label={`Your Team (${playerTeam.length}/6)`} color={THEME.status.heal} />
                <Flourish variant="heading" width={60} color={`${THEME.status.heal}60`} />
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                  <FormationGrid
                    team={playerTeam}
                    side="player"
                    editingId={editingSide === 'player' ? editingPokemonId : null}
                    onSlotClick={(r, c) => handleSlotClick('player', r, c)}
                    onRemove={(r, c) => handleRemove('player', r, c)}
                    onDrop={(r, c, id) => handleDrop('player', r, c, id)}
                  />
                </div>
              </div>
            </DexFrame>
          </div>

          {/* Shared roster (center) */}
          <div className="sbx-roster-panel" style={{ flex: 1, maxWidth: 480, minWidth: 200 }}>
            <DexFrame>
              <div style={{
                padding: '16px 14px 20px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}>
                <SectionLabel label="Pokemon Roster" />
                <div style={{
                  fontSize: 10,
                  color: THEME.text.tertiary,
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  Drag to either team
                </div>
                <Flourish variant="heading" width={60} color={THEME.border.medium} />
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  justifyContent: 'center',
                  marginTop: 12,
                  flex: 1,
                  overflowY: 'auto',
                }}>
                  {AVAILABLE_POKEMON.map((pokemonId, i) => (
                    <div
                      key={pokemonId}
                      className="sbx-roster-tile"
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <PokemonRosterTile
                        pokemonId={pokemonId}
                        onDragStart={(e) => handleDragStart(e, pokemonId)}
                        onDragEnd={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </DexFrame>
          </div>

          {/* Enemy side */}
          <div className="sbx-team-panel" style={{ animationDelay: '60ms' }}>
            <DexFrame>
              <div style={{ padding: '16px 18px 20px' }}>
                <SectionLabel label={`Enemy Team (${enemyTeam.length}/6)`} color={THEME.status.damage} />
                <Flourish variant="heading" width={60} color={`${THEME.status.damage}60`} />
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                  <FormationGrid
                    team={enemyTeam}
                    side="enemy"
                    editingId={editingSide === 'enemy' ? editingPokemonId : null}
                    onSlotClick={(r, c) => handleSlotClick('enemy', r, c)}
                    onRemove={(r, c) => handleRemove('enemy', r, c)}
                    onDrop={(r, c, id) => handleDrop('enemy', r, c, id)}
                  />
                </div>
              </div>
            </DexFrame>
          </div>
        </div>

        {/* ── Inline editor (below the battlefield row) ── */}
        {(playerEditingPokemon || enemyEditingPokemon) && (
          <div className="sbx-editor-panel">
            {playerEditingPokemon && (
              <InlineDetailEditor
                key={playerEditingPokemon.id}
                pokemon={playerEditingPokemon}
                onUpdate={(p) => handleUpdatePokemon('player', p)}
                onRemove={() => handleRemoveEditing('player')}
                onOpenDeckEditor={() => setShowDeckEditor(true)}
              />
            )}
            {enemyEditingPokemon && (
              <InlineDetailEditor
                key={enemyEditingPokemon.id}
                pokemon={enemyEditingPokemon}
                onUpdate={(p) => handleUpdatePokemon('enemy', p)}
                onRemove={() => handleRemoveEditing('enemy')}
                onOpenDeckEditor={() => setShowDeckEditor(true)}
              />
            )}
          </div>
        )}
      </div>

      {/* Deck Editor Modal */}
      {showDeckEditor && editingPokemon && (
        <DeckEditorModal
          currentDeck={selectedCurrentDeck}
          defaultDeck={selectedDefaultDeck}
          onUpdateDeck={handleUpdateDeck}
          onClose={() => setShowDeckEditor(false)}
        />
      )}

      {/* Animations */}
      <style>{`
        .sbx-battlefield {
          animation: sbxFadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
        .sbx-team-panel {
          animation: sbxSlideIn 0.25s ease-out forwards;
          opacity: 0;
        }
        .sbx-roster-panel {
          animation: sbxFadeIn 0.3s ease-out 0.05s forwards;
          opacity: 0;
        }
        .sbx-roster-tile {
          animation: sbxTileIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .sbx-editor-panel {
          animation: sbxEditorIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .sbx-editor {
          animation: sbxFadeIn 0.15s ease-out forwards;
          opacity: 0;
        }
        @keyframes sbxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sbxSlideIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sbxTileIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sbxEditorIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sbx-slot {
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .sbx-slot:hover {
          box-shadow: inset 0 0 12px rgba(250, 204, 21, 0.06);
        }
        .sbx-remove-btn:hover {
          background: ${THEME.status.damage}20 !important;
          border-color: ${THEME.status.damage} !important;
        }
        .sbx-remove-detail-btn:hover {
          background: ${THEME.status.damage}15 !important;
          border-color: ${THEME.status.damage}80 !important;
        }
        .sbx-level-btn:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>
    </ScreenShell>
  );
}
