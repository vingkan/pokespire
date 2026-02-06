import { useState, useCallback, useMemo } from 'react';
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

// Get all available base form Pokemon IDs (ones with progression trees)
const AVAILABLE_POKEMON = Object.keys(PROGRESSION_TREES);

// All types and rarities for filtering
const ALL_TYPES: MoveType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'poison',
  'flying', 'psychic', 'dark', 'fighting', 'ice', 'bug',
  'dragon', 'ghost', 'rock', 'ground',
];

const ALL_RARITIES: CardRarity[] = [
  'basic', 'common', 'uncommon', 'rare', 'epic', 'legendary',
];

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

interface SandboxPokemon {
  id: string; // unique id for this slot
  baseFormId: string;
  level: number;
  has999Hp: boolean;
  startAt50Percent: boolean;
  position: Position;
  customDeck: string[] | null; // null = use default deck
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
}

// Get the Pokemon form ID at a given level (handles evolution)
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

// Get all passives accumulated up to a level
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

// Get deck at a level (base deck + added cards from progression)
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

// Filter button component
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
        border: isSelected ? `2px solid ${color}` : '1px solid transparent',
        background: isSelected ? `${color}33` : '#2a2a3a',
        color: isSelected ? color : '#94a3b8',
        cursor: 'pointer',
        textTransform: 'capitalize',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// Deck Editor Modal
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

  // Get all cards filtered
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

  const addCard = (cardId: string) => {
    onUpdateDeck([...currentDeck, cardId]);
  };

  const removeCard = (index: number) => {
    const newDeck = currentDeck.filter((_, i) => i !== index);
    onUpdateDeck(newDeck);
  };

  const resetDeck = () => {
    onUpdateDeck(null);
  };

  const isCustomized = JSON.stringify(currentDeck) !== JSON.stringify(defaultDeck);

  return (
    <div
      onClick={onClose}
      style={{
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 1000,
          height: '85%',
          background: '#1a1a24',
          borderRadius: 12,
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
          borderBottom: '1px solid #333',
        }}>
          <h2 style={{ margin: 0, color: '#facc15', fontSize: 20 }}>Edit Deck</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            {isCustomized && (
              <button
                onClick={resetDeck}
                style={{
                  padding: '6px 16px',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: 6,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Reset to Default
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '6px 20px',
                background: '#facc15',
                border: 'none',
                borderRadius: 6,
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 13,
              }}
            >
              Done
            </button>
          </div>
        </div>

        {/* Current Deck Preview */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #333',
          background: '#15151f',
        }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
            Current Deck ({currentDeck.length} cards) - Click to remove:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            maxHeight: 80,
            overflowY: 'auto',
          }}>
            {currentDeck.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>
                No cards in deck
              </div>
            ) : (
              currentDeck.map((cardId, i) => {
                const card = getMove(cardId);
                return (
                  <div
                    key={`${cardId}-${i}`}
                    onClick={() => removeCard(i)}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      background: `${TYPE_COLORS[card.type]}22`,
                      border: `1px solid ${TYPE_COLORS[card.type]}66`,
                      borderRadius: 4,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
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
          borderBottom: '1px solid #333',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search cards..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#2a2a3e',
              border: '1px solid #444',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: 12,
              width: 150,
            }}
          />

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Type:</span>
            <FilterButton
              label="All"
              isSelected={selectedType === 'all'}
              onClick={() => setSelectedType('all')}
              color="#94a3b8"
            />
            {ALL_TYPES.map(type => (
              <FilterButton
                key={type}
                label={type}
                isSelected={selectedType === type}
                onClick={() => setSelectedType(type)}
                color={TYPE_COLORS[type]}
              />
            ))}
          </div>

          {/* Rarity Filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Rarity:</span>
            <FilterButton
              label="All"
              isSelected={selectedRarity === 'all'}
              onClick={() => setSelectedRarity('all')}
              color="#94a3b8"
            />
            {ALL_RARITIES.map(rarity => (
              <FilterButton
                key={rarity}
                label={rarity}
                isSelected={selectedRarity === rarity}
                onClick={() => setSelectedRarity(rarity)}
                color="#94a3b8"
              />
            ))}
          </div>
        </div>

        {/* Card Count */}
        <div style={{ padding: '8px 20px', fontSize: 12, color: '#64748b' }}>
          Showing {filteredCards.length} cards - Click to add to deck
        </div>

        {/* Card Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            justifyItems: 'center',
          }}>
            {filteredCards.map(card => (
              <div
                key={card.id}
                onClick={() => addCard(card.id)}
                style={{ cursor: 'pointer' }}
              >
                <CardPreview card={card} showHoverEffect={true} />
              </div>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              No cards match the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pokemon tile for selection
function PokemonTile({
  pokemonId,
  isSelected,
  onClick,
}: {
  pokemonId: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pokemon = getPokemon(pokemonId);
  const spriteUrl = `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;

  return (
    <div
      onClick={onClick}
      style={{
        width: 72,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isSelected ? '#3b3b5c' : '#1e1e2e',
        border: isSelected ? '2px solid #60a5fa' : '1px solid #333',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <img
        src={spriteUrl}
        alt={pokemon.name}
        style={{ width: 48, height: 48, imageRendering: 'pixelated', objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>
        {pokemon.name}
      </div>
    </div>
  );
}

// Formation grid slot
function FormationSlot({
  row: _row,
  col: _col,
  pokemon,
  onDrop,
  onRemove,
  onSelect,
  isSelected,
  side,
}: {
  row: Row;
  col: Column;
  pokemon: SandboxPokemon | null;
  onDrop: (pokemonId: string) => void;
  onRemove: () => void;
  onSelect: () => void;
  isSelected: boolean;
  side: 'player' | 'enemy';
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const pokemonId = e.dataTransfer.getData('text/plain');
    if (pokemonId) {
      onDrop(pokemonId);
    }
  };

  const formId = pokemon ? getFormIdAtLevel(pokemon.baseFormId, pokemon.level) : null;
  const spriteUrl = formId
    ? `https://img.pokemondb.net/sprites/black-white/anim/${side === 'player' ? 'back-' : ''}normal/${formId}.gif`
    : null;

  return (
    <div
      onClick={pokemon ? onSelect : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: 100,
        height: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isSelected ? '#3b3b5c' : pokemon ? '#1e1e2e' : '#0f0f17',
        border: isSelected ? '2px solid #facc15' : pokemon ? '1px solid #444' : '2px dashed #333',
        borderRadius: 8,
        cursor: pokemon ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {pokemon ? (
        <>
          {spriteUrl && (
            <img
              src={spriteUrl}
              alt={formId || ''}
              style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 'bold' }}>
            Lv.{pokemon.level}
          </div>
          {/* HP indicators */}
          <div style={{ display: 'flex', gap: 2, position: 'absolute', top: 4, right: 4 }}>
            {pokemon.has999Hp && (
              <span style={{ fontSize: 10, background: '#4ade80', color: '#000', padding: '1px 3px', borderRadius: 2 }}>999</span>
            )}
            {pokemon.startAt50Percent && (
              <span style={{ fontSize: 10, background: '#fcd34d', color: '#000', padding: '1px 3px', borderRadius: 2 }}>50%</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#ef4444',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            x
          </button>
        </>
      ) : (
        <div style={{ fontSize: 11, color: '#444' }}>
          Drop here
        </div>
      )}
    </div>
  );
}

// Pokemon details panel (shown when selected)
function PokemonDetailsPanel({
  pokemon,
  onUpdate,
  onOpenDeckEditor,
}: {
  pokemon: SandboxPokemon;
  onUpdate: (pokemon: SandboxPokemon) => void;
  onOpenDeckEditor: () => void;
}) {
  const formId = getFormIdAtLevel(pokemon.baseFormId, pokemon.level);
  const passives = getPassivesAtLevel(pokemon.baseFormId, pokemon.level);
  const defaultDeck = getDeckAtLevel(pokemon.baseFormId, pokemon.level);
  const currentDeck = pokemon.customDeck ?? defaultDeck;
  const isCustomDeck = pokemon.customDeck !== null;

  return (
    <div style={{
      padding: 16,
      background: '#1e1e2e',
      borderRadius: 8,
      border: '1px solid #444',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${formId}.gif`}
          alt={formId}
          style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
        />
        <div>
          <h3 style={{ margin: 0, color: '#facc15' }}>{getPokemon(formId).name}</h3>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {passives.map(p => PASSIVE_DEFINITIONS[p as PassiveId]?.name).join(', ') || 'No passives'}
          </div>
        </div>
      </div>

      {/* Level selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Level:</span>
        {[1, 2, 3, 4].map(l => (
          <button
            key={l}
            onClick={() => onUpdate({ ...pokemon, level: l, customDeck: null })}
            style={{
              width: 32,
              height: 32,
              background: pokemon.level === l ? '#60a5fa' : '#2a2a3e',
              border: 'none',
              borderRadius: 4,
              color: pokemon.level === l ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: pokemon.level === l ? 'bold' : 'normal',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* HP toggles */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pokemon.has999Hp}
            onChange={(e) => onUpdate({ ...pokemon, has999Hp: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: '#4ade80' }}>999 HP</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pokemon.startAt50Percent}
            onChange={(e) => onUpdate({ ...pokemon, startAt50Percent: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: '#fcd34d' }}>Start at 50% HP</span>
        </label>
      </div>

      {/* Deck section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            Deck ({currentDeck.length} cards){isCustomDeck && ' *'}
          </span>
          <button
            onClick={onOpenDeckEditor}
            style={{
              padding: '6px 16px',
              background: '#60a5fa',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Edit Deck
          </button>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          maxHeight: 150,
          overflowY: 'auto',
          padding: 8,
          background: '#0f0f17',
          borderRadius: 4,
        }}>
          {currentDeck.map((cardId, i) => {
            const card = getMove(cardId);
            return (
              <div
                key={`${cardId}-${i}`}
                style={{
                  fontSize: 11,
                  padding: '3px 6px',
                  background: `${TYPE_COLORS[card.type]}22`,
                  border: `1px solid ${TYPE_COLORS[card.type]}44`,
                  borderRadius: 4,
                  color: '#e2e8f0',
                }}
              >
                {card.name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SandboxConfigScreen({ onStartBattle, onBack }: Props) {
  const [playerTeam, setPlayerTeam] = useState<SandboxPokemon[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<SandboxPokemon[]>([]);

  const [selectedPokemonId, setSelectedPokemonId] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<'player' | 'enemy'>('player');
  const [draggedBaseForm, setDraggedBaseForm] = useState<string | null>(null);
  const [showDeckEditor, setShowDeckEditor] = useState(false);

  const selectedPokemon = selectedPokemonId
    ? (selectedSide === 'player' ? playerTeam : enemyTeam).find(p => p.id === selectedPokemonId)
    : null;

  const handleDragStart = (e: React.DragEvent, baseFormId: string) => {
    e.dataTransfer.setData('text/plain', baseFormId);
    setDraggedBaseForm(baseFormId);
  };

  const handleDragEnd = () => {
    setDraggedBaseForm(null);
  };

  const addPokemonToSlot = (side: 'player' | 'enemy', row: Row, col: Column, baseFormId: string) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const setTeam = side === 'player' ? setPlayerTeam : setEnemyTeam;

    // Check if slot is occupied
    const existingIndex = team.findIndex(p => p.position.row === row && p.position.column === col);
    if (existingIndex >= 0) {
      // Replace existing
      const newTeam = [...team];
      newTeam[existingIndex] = {
        id: generateId(),
        baseFormId,
        level: 1,
        has999Hp: false,
        startAt50Percent: false,
        position: { row, column: col },
        customDeck: null,
      };
      setTeam(newTeam);
    } else if (team.length < 6) {
      // Add new
      setTeam([...team, {
        id: generateId(),
        baseFormId,
        level: 1,
        has999Hp: false,
        startAt50Percent: false,
        position: { row, column: col },
        customDeck: null,
      }]);
    }
  };

  const removePokemonFromSlot = (side: 'player' | 'enemy', row: Row, col: Column) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const setTeam = side === 'player' ? setPlayerTeam : setEnemyTeam;

    const newTeam = team.filter(p => !(p.position.row === row && p.position.column === col));
    setTeam(newTeam);

    // Clear selection if removed
    const removed = team.find(p => p.position.row === row && p.position.column === col);
    if (removed && removed.id === selectedPokemonId) {
      setSelectedPokemonId(null);
    }
  };

  const selectPokemon = (side: 'player' | 'enemy', row: Row, col: Column) => {
    const team = side === 'player' ? playerTeam : enemyTeam;
    const pokemon = team.find(p => p.position.row === row && p.position.column === col);
    if (pokemon) {
      setSelectedPokemonId(pokemon.id);
      setSelectedSide(side);
    }
  };

  const updateSelectedPokemon = (updated: SandboxPokemon) => {
    if (selectedSide === 'player') {
      setPlayerTeam(team => team.map(p => p.id === updated.id ? updated : p));
    } else {
      setEnemyTeam(team => team.map(p => p.id === updated.id ? updated : p));
    }
  };

  const updateSelectedPokemonDeck = (deck: string[] | null) => {
    if (!selectedPokemon) return;
    updateSelectedPokemon({ ...selectedPokemon, customDeck: deck });
  };

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
    playerTeam.forEach((p, i) => {
      const overrides: { maxHp?: number; startPercent?: number } = {};
      if (p.has999Hp) overrides.maxHp = 999;
      if (p.startAt50Percent) overrides.startPercent = 0.5;
      if (Object.keys(overrides).length > 0) {
        hpOverrides.set(`player-${i}`, overrides);
      }
    });
    enemyTeam.forEach((p, i) => {
      const overrides: { maxHp?: number; startPercent?: number } = {};
      if (p.has999Hp) overrides.maxHp = 999;
      if (p.startAt50Percent) overrides.startPercent = 0.5;
      if (Object.keys(overrides).length > 0) {
        hpOverrides.set(`enemy-${i}`, overrides);
      }
    });

    onStartBattle(players, enemies, playerPositions, enemyPositions, playerPassives, enemyPassives, hpOverrides);
  }, [playerTeam, enemyTeam, onStartBattle]);

  const canStart = playerTeam.length > 0 && enemyTeam.length > 0;

  const renderFormationGrid = (side: 'player' | 'enemy', team: SandboxPokemon[]) => {
    const rows: Row[] = side === 'player' ? ['front', 'back'] : ['back', 'front'];
    const cols: Column[] = [0, 1, 2];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(row => (
          <div key={row} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {cols.map(col => {
              const pokemon = team.find(p => p.position.row === row && p.position.column === col);
              return (
                <FormationSlot
                  key={`${row}-${col}`}
                  row={row}
                  col={col}
                  pokemon={pokemon || null}
                  onDrop={(baseFormId) => addPokemonToSlot(side, row, col, baseFormId)}
                  onRemove={() => removePokemonFromSlot(side, row, col)}
                  onSelect={() => selectPokemon(side, row, col)}
                  isSelected={pokemon?.id === selectedPokemonId}
                  side={side}
                />
              );
            })}
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b' }}>
          {side === 'player' ? 'Your Team (Front -> Back)' : 'Enemy Team (Back -> Front)'}
        </div>
      </div>
    );
  };

  // Get default and current deck for selected pokemon
  const selectedDefaultDeck = selectedPokemon
    ? getDeckAtLevel(selectedPokemon.baseFormId, selectedPokemon.level)
    : [];
  const selectedCurrentDeck = selectedPokemon
    ? (selectedPokemon.customDeck ?? selectedDefaultDeck)
    : [];

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
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: 6,
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <h1 style={{ margin: 0, color: '#facc15', fontSize: 24 }}>Sandbox Battle</h1>
        <button
          onClick={handleStartBattle}
          disabled={!canStart}
          style={{
            padding: '10px 24px',
            background: canStart ? '#facc15' : '#333',
            border: 'none',
            borderRadius: 6,
            color: canStart ? '#000' : '#666',
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          Start Battle
        </button>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Pokemon selector (left) */}
        <div style={{
          width: 280,
          borderRight: '1px solid #333',
          padding: 16,
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
            Drag Pokemon to formation:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_POKEMON.map(pokemonId => (
              <div
                key={pokemonId}
                draggable
                onDragStart={(e) => handleDragStart(e, pokemonId)}
                onDragEnd={handleDragEnd}
                style={{ cursor: 'grab' }}
              >
                <PokemonTile
                  pokemonId={pokemonId}
                  isSelected={draggedBaseForm === pokemonId}
                  onClick={() => {}}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Formations (center) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          padding: 24,
        }}>
          {/* Enemy formation */}
          <div>
            <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold', marginBottom: 12 }}>
              Enemy Team ({enemyTeam.length}/6)
            </div>
            {renderFormationGrid('enemy', enemyTeam)}
          </div>

          <div style={{ fontSize: 20, color: '#facc1555', fontWeight: 'bold' }}>VS</div>

          {/* Player formation */}
          <div>
            <div style={{ textAlign: 'center', color: '#4ade80', fontWeight: 'bold', marginBottom: 12 }}>
              Your Team ({playerTeam.length}/6)
            </div>
            {renderFormationGrid('player', playerTeam)}
          </div>
        </div>

        {/* Details panel (right) */}
        <div style={{
          width: 320,
          borderLeft: '1px solid #333',
          padding: 16,
          overflowY: 'auto',
        }}>
          {selectedPokemon ? (
            <PokemonDetailsPanel
              pokemon={selectedPokemon}
              onUpdate={updateSelectedPokemon}
              onOpenDeckEditor={() => setShowDeckEditor(true)}
            />
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: 48 }}>
              Click a Pokemon in the formation to edit its level, HP, and deck.
            </div>
          )}
        </div>
      </div>

      {/* Deck Editor Modal */}
      {showDeckEditor && selectedPokemon && (
        <DeckEditorModal
          currentDeck={selectedCurrentDeck}
          defaultDeck={selectedDefaultDeck}
          onUpdateDeck={updateSelectedPokemonDeck}
          onClose={() => setShowDeckEditor(false)}
        />
      )}
    </div>
  );
}
