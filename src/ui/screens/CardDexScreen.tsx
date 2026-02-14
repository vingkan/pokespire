import { useState, useMemo } from 'react';
import type { MoveType, CardRarity, StatusType } from '../../engine/types';
import { MOVES, getMove } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import { ScreenShell } from '../components/ScreenShell';
import { Flourish } from '../components/Flourish';
import { DexFrame } from '../components/DexFrame';
import { THEME } from '../theme';

interface Props {
  onBack: () => void;
}

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
  steel: '#b8b8d0',
  fairy: '#ee99ac',
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
  const [selectedStatus, setSelectedStatus] = useState<StatusType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [showUncollectible, setShowUncollectible] = useState(false);

  const filteredCards = useMemo(() => {
    const allCardIds = Object.keys(MOVES);

    return allCardIds
      .map(id => getMove(id))
      .filter(card => {
        if (!showUncollectible && card.uncollectible) return false;
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
  }, [selectedType, selectedRarity, selectedStatus, searchText, showUncollectible]);

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
        Card Dex
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
        maxWidth: 1300,
        margin: '0 auto',
      }}>
        {/* ── Filter Sidebar ── */}
        <div className="cdex-sidebar" style={{
          width: 180,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
        }}>
          <DexFrame>
            <div style={{ padding: '14px 12px' }}>
              {/* Search */}
              <FilterSection label="SEARCH">
                <input
                  type="text"
                  placeholder="Card name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="cdex-search"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: `1px solid ${THEME.border.medium}`,
                    background: 'rgba(0,0,0,0.2)',
                    color: THEME.text.primary,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </FilterSection>

              {/* Type */}
              <FilterSection label="TYPE">
                <SidebarFilterButton
                  label="All"
                  count={null}
                  color={THEME.text.secondary}
                  isActive={selectedType === 'all'}
                  onClick={() => setSelectedType('all')}
                />
                {ALL_TYPES.map(type => (
                  <SidebarFilterButton
                    key={type}
                    label={type}
                    count={null}
                    color={TYPE_COLORS[type]}
                    isActive={selectedType === type}
                    onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                  />
                ))}
              </FilterSection>

              {/* Rarity */}
              <FilterSection label="RARITY">
                <SidebarFilterButton
                  label="All"
                  count={null}
                  color={THEME.text.secondary}
                  isActive={selectedRarity === 'all'}
                  onClick={() => setSelectedRarity('all')}
                />
                {ALL_RARITIES.map(rarity => (
                  <SidebarFilterButton
                    key={rarity}
                    label={rarity}
                    count={null}
                    color={RARITY_COLORS[rarity]}
                    isActive={selectedRarity === rarity}
                    onClick={() => setSelectedRarity(selectedRarity === rarity ? 'all' : rarity)}
                  />
                ))}
              </FilterSection>

              {/* Status */}
              <FilterSection label="STATUS">
                <SidebarFilterButton
                  label="All"
                  count={null}
                  color={THEME.text.secondary}
                  isActive={selectedStatus === 'all'}
                  onClick={() => setSelectedStatus('all')}
                />
                {ALL_STATUSES.map(status => (
                  <SidebarFilterButton
                    key={status}
                    label={status}
                    count={null}
                    color={STATUS_COLORS[status]}
                    isActive={selectedStatus === status}
                    onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
                  />
                ))}
              </FilterSection>

              {/* Uncollectible toggle */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.border.subtle}` }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: THEME.text.tertiary,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={showUncollectible}
                    onChange={(e) => setShowUncollectible(e.target.checked)}
                    style={{ accentColor: '#a855f7' }}
                  />
                  Uncollectible
                </label>
              </div>
            </div>
          </DexFrame>
        </div>

        <div style={{ width: 20, flexShrink: 0 }} />

        {/* ── Card Grid Area ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DexFrame>
            <div style={{ padding: '20px 20px 24px' }}>
              {/* Result count */}
              <div className="cdex-subtitle" style={{
                textAlign: 'center',
                color: THEME.text.tertiary,
                fontSize: 14,
                marginBottom: 24,
              }}>
                {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} found
              </div>

              {/* Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 16,
                justifyItems: 'center',
              }}>
                {filteredCards.map((card, i) => (
                  <div
                    key={card.id}
                    className="cdex-card"
                    style={{ animationDelay: `${i * 15}ms` }}
                  >
                    <CardPreview
                      card={card}
                      showHoverEffect={false}
                    />
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {filteredCards.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <Flourish variant="heading" width={100} color={THEME.text.tertiary} />
                  <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>
                    No cards match the selected filters
                  </span>
                </div>
              )}
            </div>
          </DexFrame>
        </div>
      </div>

      <style>{`
        .cdex-sidebar {
          animation: cdexSidebarIn 0.25s ease-out forwards;
          opacity: 0;
        }
        .cdex-subtitle {
          animation: cdexFadeIn 0.2s ease-out forwards;
          opacity: 0;
        }
        .cdex-card {
          animation: cdexCardIn 0.2s ease-out forwards;
          opacity: 0;
        }
        @keyframes cdexSidebarIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cdexFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cdexCardIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cdex-filter-btn {
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .cdex-filter-btn:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .cdex-search:focus {
          border-color: ${THEME.border.medium} !important;
        }
      `}</style>
    </ScreenShell>
  );
}

// ── Filter Section ──────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 9,
        color: THEME.text.tertiary,
        ...THEME.heading,
        letterSpacing: '0.12em',
        marginBottom: 6,
        paddingLeft: 4,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Sidebar Filter Button ───────────────────────────────────────────

interface SidebarFilterButtonProps {
  label: string;
  count: number | null;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

function SidebarFilterButton({ label, count, color, isActive, onClick }: SidebarFilterButtonProps) {
  return (
    <button
      className="cdex-filter-btn"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '4px 8px',
        borderRadius: 4,
        border: isActive ? `1px solid ${color}50` : '1px solid transparent',
        background: isActive ? `${color}12` : 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          opacity: isActive ? 1 : 0.5,
          boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          color: isActive ? color : THEME.text.tertiary,
          fontWeight: isActive ? 'bold' : 'normal',
          textTransform: 'capitalize',
          letterSpacing: '0.04em',
        }}>
          {label}
        </span>
      </div>
      {count !== null && (
        <span style={{
          fontSize: 10,
          color: isActive ? color : THEME.text.tertiary,
          opacity: isActive ? 0.8 : 0.4,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}
