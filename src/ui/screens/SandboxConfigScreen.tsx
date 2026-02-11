import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PokemonData, Position, Row, Column, MoveType, CardRarity } from '../../engine/types';
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
import { PokemonTile, TYPE_COLORS } from '../components/PokemonTile';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

// ── Constants ──────────────────────────────────────────────────────

const AVAILABLE_POKEMON = Object.keys(PROGRESSION_TREES);

const ALL_TYPES: MoveType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'poison',
  'flying', 'psychic', 'dark', 'fighting', 'ice', 'bug',
  'dragon', 'ghost', 'rock', 'ground',
];

const ALL_RARITIES: CardRarity[] = [
  'basic', 'common', 'uncommon', 'rare', 'epic', 'legendary',
];


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
  const [searchText, setSearchText] = useState('');

  const filteredCards = useMemo(() => {
    const allCardIds = Object.keys(MOVES);
    return allCardIds
      .map(id => getMove(id))
      .filter(card => {
        if (selectedType !== 'all' && card.type !== selectedType) return false;
        if (selectedRarity !== 'all' && card.rarity !== selectedRarity) return false;
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
  }, [selectedType, selectedRarity, searchText]);

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
    ? THEME.bg.elevated
    : dragOver
      ? `${THEME.status.energy}15`
      : pokemon
        ? THEME.bg.panel
        : THEME.bg.base;

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
        border: `2px ${borderStyle} ${borderColor}`,
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
              style={{ width: 60, height: 60, imageRendering: 'pixelated', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={{ fontSize: 11, color: THEME.text.primary, fontWeight: 'bold' }}>
            Lv.{pokemon.level}
          </div>
          {/* HP indicators */}
          <div style={{ display: 'flex', gap: 2, position: 'absolute', top: 3, right: 3 }}>
            {pokemon.has999Hp && (
              <span style={{ fontSize: 9, background: THEME.status.heal, color: '#000', padding: '1px 3px', borderRadius: 2, fontWeight: 'bold' }}>999</span>
            )}
            {pokemon.startAt50Percent && (
              <span style={{ fontSize: 9, background: '#fcd34d', color: '#000', padding: '1px 3px', borderRadius: 2, fontWeight: 'bold' }}>50%</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: 'absolute', top: -8, left: -8,
              width: 20, height: 20, borderRadius: '50%',
              background: THEME.status.damage, border: 'none',
              color: '#fff', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            x
          </button>
        </>
      ) : (
        <div style={{ fontSize: 11, color: THEME.text.tertiary }}>
          {dragOver ? 'Drop here' : 'Empty'}
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
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
      {colOrder.map((row, ci) => (
        <div key={row} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 9, color: THEME.text.tertiary, ...THEME.heading }}>{colLabels[ci]}</div>
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

  return (
    <div style={{
      padding: '14px 20px',
      background: THEME.bg.panel,
      border: `1px solid ${THEME.border.medium}`,
      borderRadius: 8,
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}>
      {/* Sprite + Name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
        <img
          src={makeSpriteUrl(formId)}
          alt={formId}
          style={{ width: 56, height: 56, imageRendering: 'pixelated', objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ fontSize: 13, fontWeight: 'bold', color: THEME.accent, marginTop: 4 }}>
          {pokemonData.name}
        </div>
      </div>

      {/* Level — preserves customDeck */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, color: THEME.text.tertiary, ...THEME.heading }}>Level</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4].map(l => (
            <button
              key={l}
              onClick={() => onUpdate({ ...pokemon, level: l })}
              style={{
                width: 30, height: 30,
                ...(pokemon.level === l ? THEME.button.primary : THEME.button.secondary),
                fontSize: 13, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Passives */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
        <div style={{ fontSize: 11, color: THEME.text.tertiary, ...THEME.heading }}>Passives</div>
        {passives.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.text.tertiary, fontStyle: 'italic' }}>None</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {passives.map(p => (
              <div key={p} style={{ fontSize: 12, color: THEME.text.secondary }}>
                {PASSIVE_DEFINITIONS[p as PassiveId]?.name ?? p}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HP toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, color: THEME.text.tertiary, ...THEME.heading }}>HP</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: THEME.text.tertiary, ...THEME.heading }}>
            Deck ({currentDeck.length}){isCustomDeck ? ' *' : ''}
          </div>
          <button
            onClick={onOpenDeckEditor}
            style={{ padding: '3px 10px', ...THEME.button.primary, fontSize: 11 }}
          >
            Edit Deck
          </button>
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 3,
          maxHeight: 56, overflowY: 'auto',
          padding: 6, background: THEME.bg.base, borderRadius: 4,
        }}>
          {currentDeck.map((cardId, i) => {
            const card = getMove(cardId);
            return (
              <div
                key={`${cardId}-${i}`}
                style={{
                  fontSize: 10, padding: '2px 5px',
                  background: `${TYPE_COLORS[card.type]}22`,
                  border: `1px solid ${TYPE_COLORS[card.type]}44`,
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
          onClick={onRemove}
          style={{
            padding: '6px 14px', ...THEME.button.secondary,
            color: THEME.status.damage, borderColor: THEME.status.damage + '55',
            fontSize: 12,
          }}
        >
          Remove
        </button>
      </div>
    </div>
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
    <ScreenShell header={headerBar} bodyStyle={{ padding: '20px 16px 48px' }}>
        {/* ── Battlefield row: [Player Grid] [Roster] [Enemy Grid] ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 20,
        }}>
          {/* Player side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: THEME.status.heal, ...THEME.heading }}>
              Your Team ({playerTeam.length}/6)
            </span>
            <FormationGrid
              team={playerTeam}
              side="player"
              editingId={editingSide === 'player' ? editingPokemonId : null}
              onSlotClick={(r, c) => handleSlotClick('player', r, c)}
              onRemove={(r, c) => handleRemove('player', r, c)}
              onDrop={(r, c, id) => handleDrop('player', r, c, id)}
            />
          </div>

          {/* Shared roster (center) */}
          <div style={{
            flex: 1,
            maxWidth: 480,
            minWidth: 200,
            padding: '12px',
            background: THEME.bg.panel,
            border: `1px solid ${THEME.border.subtle}`,
            borderRadius: 8,
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: THEME.text.tertiary, ...THEME.heading }}>
                Pokemon Roster
              </span>
              <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 2 }}>
                Drag to either team
              </div>
            </div>
            <Flourish variant="heading" color={THEME.text.tertiary} />
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'center',
              marginTop: 8,
              flex: 1,
              overflowY: 'auto',
            }}>
              {AVAILABLE_POKEMON.map(pokemonId => (
                <PokemonRosterTile
                  key={pokemonId}
                  pokemonId={pokemonId}
                  onDragStart={(e) => handleDragStart(e, pokemonId)}
                  onDragEnd={() => {}}
                />
              ))}
            </div>
          </div>

          {/* Enemy side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: THEME.status.damage, ...THEME.heading }}>
              Enemy Team ({enemyTeam.length}/6)
            </span>
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

        {/* ── Inline editor (below the battlefield row) ── */}
        <div style={{ maxWidth: 960, margin: '16px auto 0' }}>
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

      {/* Deck Editor Modal */}
      {showDeckEditor && editingPokemon && (
        <DeckEditorModal
          currentDeck={selectedCurrentDeck}
          defaultDeck={selectedDefaultDeck}
          onUpdateDeck={handleUpdateDeck}
          onClose={() => setShowDeckEditor(false)}
        />
      )}
    </ScreenShell>
  );
}
