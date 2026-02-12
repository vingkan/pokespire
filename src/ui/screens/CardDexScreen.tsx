import { useState, useMemo } from 'react';
import type { MoveType, CardRarity } from '../../engine/types';
import { MOVES, getMove } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';

interface Props {
  onBack: () => void;
}

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
  item: '#4ade80',
};

const RARITY_COLORS: Record<CardRarity, string> = {
  basic: '#64748b',
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#a855f7',
  legendary: '#fbbf24',
};

export function CardDexScreen({ onBack }: Props) {
  const [selectedType, setSelectedType] = useState<MoveType | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<CardRarity | 'all'>('all');

  // Get all card IDs and filter them
  const filteredCards = useMemo(() => {
    const allCardIds = Object.keys(MOVES);

    return allCardIds
      .map(id => getMove(id))
      .filter(card => {
        if (selectedType !== 'all' && card.type !== selectedType) return false;
        if (selectedRarity !== 'all' && card.rarity !== selectedRarity) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by type, then by rarity, then by name
        const typeCompare = ALL_TYPES.indexOf(a.type) - ALL_TYPES.indexOf(b.type);
        if (typeCompare !== 0) return typeCompare;
        const rarityA = a.rarity ?? 'basic';
        const rarityB = b.rarity ?? 'basic';
        const rarityCompare = ALL_RARITIES.indexOf(rarityA) - ALL_RARITIES.indexOf(rarityB);
        if (rarityCompare !== 0) return rarityCompare;
        return a.name.localeCompare(b.name);
      });
  }, [selectedType, selectedRarity]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
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
          Card Dex
        </h1>
        <div style={{ width: 80 }} /> {/* Spacer for centering */}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 24,
        padding: '16px 24px',
        borderBottom: '1px solid #333',
        background: '#15151f',
        flexWrap: 'wrap',
      }}>
        {/* Type Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
            Type
          </label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
        </div>

        {/* Rarity Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
            Rarity
          </label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                color={RARITY_COLORS[rarity]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Card Count */}
      <div style={{
        padding: '12px 24px',
        fontSize: 14,
        color: '#64748b',
      }}>
        Showing {filteredCards.length} cards
      </div>

      {/* Card Grid */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 24px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 16,
          justifyItems: 'center',
        }}>
          {filteredCards.map(card => (
            <CardPreview
              key={card.id}
              card={card}
              showHoverEffect={false}
            />
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 48,
            color: '#64748b',
          }}>
            No cards match the selected filters
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}

function FilterButton({ label, isSelected, onClick, color }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 'bold',
        borderRadius: 4,
        border: isSelected ? `2px solid ${color}` : '2px solid transparent',
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
