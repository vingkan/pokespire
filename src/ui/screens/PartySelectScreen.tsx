import { useState } from 'react';
import type { PokemonData, Position, Row, Column } from '../../engine/types';
import { STARTER_POKEMON } from '../../data/loaders';
import { ScreenShell } from '../components/ScreenShell';
import { Flourish } from '../components/Flourish';
import { PokemonTile } from '../components/PokemonTile';
import { THEME } from '../theme';

interface Props {
  onStart: (party: PokemonData[], positions: Position[]) => void;
  onRestart: () => void;
}

const allPokemon = Object.values(STARTER_POKEMON);

const RECOMMENDED_IDS = ['charmander', 'squirtle', 'bulbasaur', 'pikachu'];
const recommendedPokemon = allPokemon.filter(p => RECOMMENDED_IDS.includes(p.id));
const otherPokemon = allPokemon.filter(p => !RECOMMENDED_IDS.includes(p.id));

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
  size,
}: {
  pokemon: PokemonData;
  isSelected: boolean;
  onClick: () => void;
  size: 'large' | 'small';
}) {
  return (
    <PokemonTile
      name={pokemon.name}
      spriteUrl={makeSpriteUrl(pokemon.id)}
      primaryType={pokemon.types[0]}
      secondaryType={pokemon.types[1]}
      size={size === 'large' ? 'large' : 'medium'}
      isSelected={isSelected}
      onClick={onClick}
      stats={`HP: ${pokemon.maxHp} | SPD: ${pokemon.baseSpeed}`}
    />
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
  const [formation, setFormation] = useState<Map<SlotKey, string>>(new Map());
  const [unplacedPokemon, setUnplacedPokemon] = useState<string[]>([]);
  const [draggedPokemonId, setDraggedPokemonId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<SlotKey | 'unplaced' | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<SlotKey | 'unplaced' | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
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
    onStart(partyList, positions);
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
        <button
          onClick={onRestart}
          style={{ padding: '8px 16px', ...THEME.button.secondary, fontSize: 13 }}
        >
          Main Menu
        </button>
        <h1 style={{ margin: 0, color: THEME.accent, fontSize: 22, ...THEME.heading }}>
          Choose Your Party
        </h1>
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
      </div>
    );

    return (
      <ScreenShell header={selectHeader} bodyStyle={{ padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center' }}>
            Select 1-4 Pokemon for battle
          </p>

          {/* Recommended Section */}
          <div style={{ width: '100%' }}>
            <div style={{
              fontSize: 13, color: THEME.accent, fontWeight: 'bold',
              ...THEME.heading, marginBottom: 12, textAlign: 'center',
            }}>
              Recommended
            </div>
            <Flourish variant="heading" color={THEME.accent} />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
              {recommendedPokemon.map(pokemon => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  isSelected={selected.has(pokemon.id)}
                  onClick={() => toggle(pokemon.id)}
                  size="large"
                />
              ))}
            </div>
          </div>

          {/* Others Section */}
          <div style={{
            width: '100%',
            padding: 20,
            background: THEME.bg.panelDark,
            borderRadius: 12,
            border: `1px solid ${THEME.border.subtle}`,
          }}>
            <div style={{
              fontSize: 13, color: THEME.text.secondary, fontWeight: 'bold',
              ...THEME.heading, marginBottom: 12, textAlign: 'center',
            }}>
              Others
            </div>
            <Flourish variant="heading" color={THEME.text.tertiary} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
              {otherPokemon.map(pokemon => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  isSelected={selected.has(pokemon.id)}
                  onClick={() => toggle(pokemon.id)}
                  size="small"
                />
              ))}
            </div>
          </div>
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
          Drag Pokemon into formation — Back row is protected by Front row
        </p>

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
