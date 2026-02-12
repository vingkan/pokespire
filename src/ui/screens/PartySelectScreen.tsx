import { useState, useRef } from 'react';
import type { PokemonData, Position, Row, Column } from '../../engine/types';
import { STARTER_POKEMON } from '../../data/loaders';
import { POKEMON_COSTS, STARTING_GOLD } from '../../data/shop';
import { ScreenShell } from '../components/ScreenShell';
import { Flourish } from '../components/Flourish';
import { PokemonTile } from '../components/PokemonTile';
import { THEME } from '../theme';

interface Props {
  onStart: (party: PokemonData[], positions: Position[], gold: number) => void;
  onRestart: () => void;
}

const allPokemon = Object.values(STARTER_POKEMON);

/** Cost tiers in display order. */
const COST_TIERS = [
  { cost: 250, label: 'Starters', color: THEME.accent },
  { cost: 100, label: 'Budget', color: '#9ca3af' },
  { cost: 200, label: 'Standard', color: '#4ade80' },
  { cost: 300, label: 'Premium', color: '#60a5fa' },
  { cost: 400, label: 'Elite', color: '#a855f7' },
];

/** Group Pokemon by their cost tier. */
function getPokemonByTier(cost: number): PokemonData[] {
  return allPokemon.filter(p => (POKEMON_COSTS[p.id] ?? 200) === cost);
}

type Phase = 'select' | 'position';
type SlotKey = `${Row}-${Column}`;

function makeSpriteUrl(id: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${id}.gif`;
}

// ── Pokemon Card (selection phase) ─────────────────────────────────

function PokemonCard({
  pokemon,
  isSelected,
  onClick,
  cost,
  canAfford,
}: {
  pokemon: PokemonData;
  isSelected: boolean;
  onClick: () => void;
  cost: number;
  canAfford: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimmed = !isSelected && !canAfford;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.2s' }}
    >
      <PokemonTile
        name={pokemon.name}
        spriteUrl={makeSpriteUrl(pokemon.id)}
        primaryType={pokemon.types[0]}
        secondaryType={pokemon.types[1]}
        size="large"
        isSelected={isSelected}
        onClick={dimmed ? undefined : onClick}
        stats={`HP: ${pokemon.maxHp} | SPD: ${pokemon.baseSpeed}`}
      />
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 4,
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(0,0,0,0.7)',
        color: '#facc15',
        fontSize: 11,
        fontWeight: 'bold',
      }}>
        {cost}g
      </div>

      {/* Playstyle tooltip on hover */}
      {hovered && pokemon.description && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          padding: '8px 14px',
          borderRadius: 8,
          background: THEME.bg.panelDark,
          border: `1px solid ${THEME.border.medium}`,
          color: THEME.text.secondary,
          fontSize: 12,
          lineHeight: 1.4,
          fontStyle: 'italic',
          width: 200,
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {pokemon.description}
        </div>
      )}
    </div>
  );
}

// ── Formation Slot (positioning phase) ─────────────────────────────

function FormationSlot({
  pokemon,
  slotKey,
  draggedPokemonId,
  dragSource,
  dragOverTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  pokemon: PokemonData | null;
  slotKey: SlotKey;
  draggedPokemonId: string | null;
  dragSource: SlotKey | 'unplaced' | null;
  dragOverTarget: SlotKey | 'unplaced' | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const isDragging = draggedPokemonId !== null && dragSource === slotKey;
  const isDragOver = dragOverTarget === slotKey;
  const canDrop = draggedPokemonId !== null && dragSource !== slotKey;

  return (
    <div
      draggable={!!pokemon}
      onDragStart={pokemon ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        width: 100,
        height: 120,
        border: isDragOver && canDrop
          ? `2px solid ${THEME.accent}`
          : pokemon
            ? `2px solid ${THEME.border.medium}`
            : `2px dashed ${THEME.border.subtle}`,
        borderRadius: 8,
        background: isDragOver && canDrop
          ? THEME.bg.elevated
          : pokemon
            ? THEME.bg.panel
            : THEME.bg.base,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: pokemon ? 'grab' : canDrop ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragOver && canDrop ? `0 0 8px ${THEME.accent}55` : 'none',
      }}
    >
      {pokemon ? (
        <>
          <img
            src={makeSpriteUrl(pokemon.id)}
            alt={pokemon.name}
            style={{ width: 60, height: 60, imageRendering: 'pixelated', objectFit: 'contain' }}
            draggable={false}
          />
          <div style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text.primary }}>
            {pokemon.name}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 26, color: isDragOver && canDrop ? THEME.accent : THEME.border.medium }}>+</div>
      )}
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────────

export function PartySelectScreen({ onStart, onRestart }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gold, setGold] = useState(STARTING_GOLD);
  const [formation, setFormation] = useState<Map<SlotKey, string>>(new Map());
  const [unplacedPokemon, setUnplacedPokemon] = useState<string[]>([]);
  const [draggedPokemonId, setDraggedPokemonId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<SlotKey | 'unplaced' | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<SlotKey | 'unplaced' | null>(null);

  const toggle = (id: string) => {
    const cost = POKEMON_COSTS[id] ?? 200;
    if (selected.has(id)) {
      // Deselect: refund gold
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      setGold(g => g + cost);
    } else if (selected.size < 4 && gold >= cost) {
      // Select: deduct gold
      setSelected(prev => { const next = new Set(prev); next.add(id); return next; });
      setGold(g => g - cost);
    }
  };

  const party = allPokemon.filter(s => selected.has(s.id));

  const goToPositioning = () => {
    setUnplacedPokemon([...selected]);
    setFormation(new Map());
    setPhase('position');
  };

  const goBackToSelect = () => {
    setPhase('select');
    setFormation(new Map());
    setUnplacedPokemon([]);
  };

  // ── Drag handlers ──

  const handleDragStart = (e: React.DragEvent, pokemonId: string, source: SlotKey | 'unplaced') => {
    setDraggedPokemonId(pokemonId);
    setDragSource(source);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('pokemonId', pokemonId);
    e.dataTransfer.setData('source', source);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1';
    setDraggedPokemonId(null);
    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, target: SlotKey | 'unplaced') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const handleDragLeave = () => setDragOverTarget(null);

  const handleDrop = (e: React.DragEvent, target: SlotKey | 'unplaced') => {
    e.preventDefault();
    setDragOverTarget(null);

    const pokemonId = e.dataTransfer.getData('pokemonId');
    const source = e.dataTransfer.getData('source') as SlotKey | 'unplaced';
    if (!pokemonId || !source || source === target) return;

    if (target === 'unplaced') {
      setUnplacedPokemon(prev => [...prev, pokemonId]);
      if (source !== 'unplaced') {
        setFormation(prev => { const next = new Map(prev); next.delete(source); return next; });
      }
    } else {
      const currentPokemonInSlot = formation.get(target);
      setFormation(prev => {
        const next = new Map(prev);
        next.set(target, pokemonId);
        if (source !== 'unplaced') next.delete(source);
        return next;
      });
      if (currentPokemonInSlot) setUnplacedPokemon(prev => [...prev, currentPokemonInSlot]);
      if (source === 'unplaced') setUnplacedPokemon(prev => prev.filter(id => id !== pokemonId));
    }

    setDraggedPokemonId(null);
    setDragSource(null);
  };

  const startBattle = () => {
    const partyList: PokemonData[] = [];
    const positions: Position[] = [];
    formation.forEach((pokemonId, slotKey) => {
      const [row, colStr] = slotKey.split('-') as [Row, string];
      const col = parseInt(colStr) as Column;
      const pokemon = allPokemon.find(p => p.id === pokemonId);
      if (pokemon) {
        partyList.push(pokemon);
        positions.push({ row, column: col });
      }
    });
    onStart(partyList, positions, gold);
  };

  const allPlaced = unplacedPokemon.length === 0 && formation.size > 0;

  const getPokemonInSlot = (row: Row, col: Column): PokemonData | null => {
    const id = formation.get(`${row}-${col}`);
    return id ? allPokemon.find(p => p.id === id) || null : null;
  };

  // ════════════════════════════════════════════════════════════════
  // SELECT PHASE
  // ════════════════════════════════════════════════════════════════

  if (phase === 'select') {
    const selectHeader = (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: `1px solid ${THEME.border.subtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
            Choose Your Party
          </h1>
          <div style={{
            padding: '4px 12px',
            borderRadius: 6,
            background: 'rgba(250, 204, 21, 0.1)',
            border: '1px solid rgba(250, 204, 21, 0.3)',
            color: '#facc15',
            fontSize: 15,
            fontWeight: 'bold',
          }}>
            {gold}g
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={goToPositioning}
            disabled={party.length === 0}
            style={{
              padding: '10px 24px',
              ...(party.length > 0 ? THEME.button.primary : THEME.button.secondary),
              fontSize: 14,
              opacity: party.length > 0 ? 1 : 0.4,
              cursor: party.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Set Formation ({party.length}) &rarr;
          </button>
          <button
            onClick={onRestart}
            style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}
          >
            Main Menu
          </button>
        </div>
      </div>
    );

    return (
      <ScreenShell header={selectHeader} bodyStyle={{ padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center' }}>
            Select 1-4 Pokemon for battle. Leftover gold carries into the run!
          </p>

          {COST_TIERS.map(tier => {
            const tierPokemon = getPokemonByTier(tier.cost);
            if (tierPokemon.length === 0) return null;
            const isStarters = tier.cost === 250;

            return (
              <div
                key={tier.cost}
                style={{
                  width: '100%',
                  padding: isStarters ? 0 : 20,
                  background: isStarters ? 'transparent' : THEME.bg.panelDark,
                  borderRadius: 12,
                  border: isStarters ? 'none' : `1px solid ${THEME.border.subtle}`,
                }}
              >
                {/* Tier header: label + cost badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 13,
                    color: tier.color,
                    fontWeight: 'bold',
                    ...THEME.heading,
                  }}>
                    {tier.label}
                  </div>
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${tier.color}18`,
                    border: `1px solid ${tier.color}44`,
                    color: tier.color,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>
                    {tier.cost}g each
                  </div>
                </div>
                <Flourish variant="heading" color={isStarters ? tier.color : THEME.text.tertiary} />
                <div style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  marginTop: 12,
                }}>
                  {tierPokemon.map(pokemon => (
                    <PokemonCard
                      key={pokemon.id}
                      pokemon={pokemon}
                      isSelected={selected.has(pokemon.id)}
                      onClick={() => toggle(pokemon.id)}
                      cost={tier.cost}
                      canAfford={gold >= tier.cost}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScreenShell>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // POSITION PHASE
  // ════════════════════════════════════════════════════════════════

  const positionHeader = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: `1px solid ${THEME.border.subtle}`,
    }}>
      <button
        onClick={goBackToSelect}
        style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}
      >
        &larr; Back
      </button>
      <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
        Set Formation
      </h1>
      <button
        onClick={startBattle}
        disabled={!allPlaced}
        style={{
          padding: '10px 24px',
          ...(allPlaced ? THEME.button.primary : THEME.button.secondary),
          fontSize: 14,
          opacity: allPlaced ? 1 : 0.4,
          cursor: allPlaced ? 'pointer' : 'not-allowed',
        }}
      >
        Start Battle &rarr;
      </button>
    </div>
  );

  // Render the 2-column x 3-row grid (Back | Front), matching battle layout
  const renderFormationGrid = () => {
    const positions: Column[] = [0, 1, 2];
    const cols: Row[] = ['back', 'front'];
    const labels = ['Back', 'Front'];

    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {cols.map((row, ci) => (
          <div key={row} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, ...THEME.heading }}>{labels[ci]}</div>
            {positions.map(col => {
              const pokemon = getPokemonInSlot(row, col);
              const slotKey: SlotKey = `${row}-${col}`;
              return (
                <FormationSlot
                  key={slotKey}
                  pokemon={pokemon}
                  slotKey={slotKey}
                  draggedPokemonId={draggedPokemonId}
                  dragSource={dragSource}
                  dragOverTarget={dragOverTarget}
                  onDragStart={(e) => pokemon && handleDragStart(e, pokemon.id, slotKey)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, slotKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slotKey)}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ScreenShell header={positionHeader} bodyStyle={{ padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center' }}>
          Drag Pokemon into formation
        </p>

        {/* Positioning guide */}
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: THEME.bg.panelDark,
          border: `1px solid ${THEME.border.subtle}`,
          fontSize: 12,
          lineHeight: 1.6,
          color: THEME.text.tertiary,
          maxWidth: 400,
        }}>
          <div style={{ color: THEME.text.secondary, fontWeight: 'bold', marginBottom: 4 }}>How Positioning Works</div>
          <div><span style={{ color: THEME.text.secondary }}>Front row</span> — shields the back-row Pokemon in its column from most attacks.</div>
          <div><span style={{ color: THEME.text.secondary }}>Back row</span> — safe while the front holds, but exposed if the front falls.</div>
          <div><span style={{ color: THEME.text.secondary }}>Switching</span> — costs 2 energy and can be done once per turn to an adjacent slot.</div>
        </div>

        {/* Formation Grid */}
        {renderFormationGrid()}

        {/* Unplaced Pokemon */}
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: THEME.text.secondary, marginBottom: 8, textAlign: 'center' }}>
            {unplacedPokemon.length > 0 ? 'Drag to place:' : 'Drop here to unplace:'}
          </div>
          <div
            onDragOver={(e) => handleDragOver(e, 'unplaced')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'unplaced')}
            style={{
              minHeight: 90,
              padding: 16,
              background: dragOverTarget === 'unplaced' ? THEME.bg.elevated : THEME.bg.panelDark,
              border: dragOverTarget === 'unplaced'
                ? `2px dashed ${THEME.accent}`
                : unplacedPokemon.length > 0
                  ? `2px solid ${THEME.border.medium}`
                  : `2px dashed ${THEME.border.subtle}`,
              borderRadius: 8,
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              transition: 'all 0.2s',
            }}
          >
            {unplacedPokemon.length > 0 ? (
              unplacedPokemon.map(id => {
                const pokemon = allPokemon.find(p => p.id === id);
                if (!pokemon) return null;
                return (
                  <PokemonTile
                    key={id}
                    name={pokemon.name}
                    spriteUrl={makeSpriteUrl(pokemon.id)}
                    primaryType={pokemon.types[0]}
                    size="small"
                    isSelected
                    draggable
                    onDragStart={(e) => handleDragStart(e, id, 'unplaced')}
                    onDragEnd={handleDragEnd}
                  />
                );
              })
            ) : (
              <div style={{
                color: THEME.text.tertiary, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 50,
              }}>
                Drop Pokemon here
              </div>
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
