import { useState } from 'react';
import type { PokemonData, Position, Row, Column } from '../../engine/types';
import { STARTER_POKEMON } from '../../data/loaders';

interface Props {
  onStart: (party: PokemonData[], positions: Position[]) => void;
  onRestart: () => void;
}

const allPokemon = Object.values(STARTER_POKEMON);

// Split into recommended (classic starters) and others
const RECOMMENDED_IDS = ['charmander', 'squirtle', 'bulbasaur', 'pikachu'];
const recommendedPokemon = allPokemon.filter(p => RECOMMENDED_IDS.includes(p.id));
const otherPokemon = allPokemon.filter(p => !RECOMMENDED_IDS.includes(p.id));

type Phase = 'select' | 'position';

// Grid slot: row + column
type SlotKey = `${Row}-${Column}`;

export function PartySelectScreen({ onStart, onRestart }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Map from slot key to pokemon id
  const [formation, setFormation] = useState<Map<SlotKey, string>>(new Map());
  // Pokemon waiting to be placed
  const [unplacedPokemon, setUnplacedPokemon] = useState<string[]>([]);
  // Drag state
  const [draggedPokemonId, setDraggedPokemonId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<SlotKey | 'unplaced' | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<SlotKey | 'unplaced' | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const party = allPokemon.filter(s => selected.has(s.id));

  const goToPositioning = () => {
    // Initialize with selected Pokemon as unplaced
    setUnplacedPokemon([...selected]);
    setFormation(new Map());
    setPhase('position');
  };

  const goBackToSelect = () => {
    setPhase('select');
    setFormation(new Map());
    setUnplacedPokemon([]);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, pokemonId: string, source: SlotKey | 'unplaced') => {
    setDraggedPokemonId(pokemonId);
    setDragSource(source);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('pokemonId', pokemonId);
    e.dataTransfer.setData('source', source);
    // Reduce opacity of dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Restore opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedPokemonId(null);
    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, target: SlotKey | 'unplaced') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, target: SlotKey | 'unplaced') => {
    e.preventDefault();
    setDragOverTarget(null);

    const pokemonId = e.dataTransfer.getData('pokemonId');
    const source = e.dataTransfer.getData('source') as SlotKey | 'unplaced';

    if (!pokemonId || !source) return;
    if (source === target) return; // Dropping on same location

    // Handle drop logic
    if (target === 'unplaced') {
      // Moving to unplaced area
      setUnplacedPokemon(prev => [...prev, pokemonId]);
      if (source !== 'unplaced') {
        // Remove from slot
        setFormation(prev => {
          const next = new Map(prev);
          next.delete(source);
          return next;
        });
      } else {
        // Remove from unplaced array (shouldn't happen, but handle it)
        setUnplacedPokemon(prev => prev.filter(id => id !== pokemonId));
      }
    } else {
      // Moving to a slot
      const currentPokemonInSlot = formation.get(target);
      
      setFormation(prev => {
        const next = new Map(prev);
        // Place dragged Pokemon in target slot
        next.set(target, pokemonId);
        // Remove from source if it was a slot
        if (source !== 'unplaced') {
          next.delete(source);
        }
        return next;
      });

      // If slot was occupied, move that Pokemon to unplaced
      if (currentPokemonInSlot) {
        setUnplacedPokemon(prev => [...prev, currentPokemonInSlot]);
      }

      // Remove from unplaced if source was unplaced
      if (source === 'unplaced') {
        setUnplacedPokemon(prev => prev.filter(id => id !== pokemonId));
      }
    }

    setDraggedPokemonId(null);
    setDragSource(null);
  };

  const startBattle = () => {
    // Build party array and positions array in matching order
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
    const key: SlotKey = `${row}-${col}`;
    const id = formation.get(key);
    if (!id) return null;
    return allPokemon.find(p => p.id === id) || null;
  };

  // Selection phase
  if (phase === 'select') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 32,
        color: '#e2e8f0',
        position: 'relative',
        minHeight: '100vh',
        overflowY: 'auto',
        background: '#0f0f17',
      }}>
        {/* Reset button */}
        <button
          onClick={onRestart}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid #555',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Main Menu
        </button>

        <h1 style={{ fontSize: 30, margin: 0, color: '#facc15' }}>
          Choose Your Party
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Select 1-4 Pokemon for battle
        </p>

        {/* Recommended Section */}
        <div style={{ width: '100%', maxWidth: 800 }}>
          <div style={{
            fontSize: 14,
            color: '#facc15',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: 12,
            textAlign: 'center',
          }}>
            Recommended
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {recommendedPokemon.map(pokemon => {
              const isSelected = selected.has(pokemon.id);
              return (
                <div
                  key={pokemon.id}
                  onClick={() => toggle(pokemon.id)}
                  style={{
                    width: 160,
                    padding: 16,
                    borderRadius: 12,
                    border: isSelected ? '3px solid #facc15' : '3px solid #333',
                    background: isSelected ? '#2d2d3f' : '#1e1e2e',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <img
                    src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
                    alt={pokemon.name}
                    style={{ width: 80, height: 80, imageRendering: 'pixelated', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div style={{ fontSize: 17, fontWeight: 'bold', marginTop: 8 }}>
                    {pokemon.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    HP: {pokemon.maxHp} | SPD: {pokemon.baseSpeed}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Others Section */}
        <div style={{
          width: '100%',
          maxWidth: 800,
          marginTop: 24,
          padding: 20,
          background: '#1a1a24',
          borderRadius: 12,
          border: '1px solid #333',
        }}>
          <div style={{
            fontSize: 14,
            color: '#94a3b8',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: 12,
            textAlign: 'center',
          }}>
            Others
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {otherPokemon.map(pokemon => {
              const isSelected = selected.has(pokemon.id);
              return (
                <div
                  key={pokemon.id}
                  onClick={() => toggle(pokemon.id)}
                  style={{
                    width: 140,
                    padding: 12,
                    borderRadius: 10,
                    border: isSelected ? '3px solid #facc15' : '2px solid #333',
                    background: isSelected ? '#2d2d3f' : '#1e1e2e',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <img
                    src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
                    alt={pokemon.name}
                    style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6 }}>
                    {pokemon.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    HP: {pokemon.maxHp} | SPD: {pokemon.baseSpeed}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={goToPositioning}
          disabled={party.length === 0}
          style={{
            padding: '12px 32px',
            fontSize: 17,
            fontWeight: 'bold',
            borderRadius: 8,
            border: 'none',
            background: party.length > 0 ? '#facc15' : '#333',
            color: party.length > 0 ? '#000' : '#666',
            cursor: party.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Set Formation ({party.length} selected)
        </button>
      </div>
    );
  }

  // Positioning phase
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: 32,
      color: '#e2e8f0',
      position: 'relative',
      minHeight: '100vh',
      overflowY: 'auto',
      background: '#0f0f17',
    }}>
      {/* Reset button */}
      <button
        onClick={onRestart}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 16px',
          fontSize: 13,
          borderRadius: 6,
          border: '1px solid #555',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
        }}
      >
        Main Menu
      </button>

      <h1 style={{ fontSize: 30, margin: 0, color: '#facc15' }}>
        Set Formation
      </h1>
      <p style={{ color: '#94a3b8', margin: 0 }}>
        Drag and drop Pokemon to set your formation (Back row is protected by Front row)
      </p>

      {/* Formation Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Back row label */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>
          Back Row (Protected)
        </div>
        {/* Back row */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {([0, 1, 2] as Column[]).map(col => {
            const pokemon = getPokemonInSlot('back', col);
            const slotKey: SlotKey = `back-${col}`;
            return (
              <FormationSlot
                key={`back-${col}`}
                pokemon={pokemon}
                slotKey={slotKey}
                isEmpty={!pokemon}
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

        {/* Front row label */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', textTransform: 'uppercase', marginTop: 8 }}>
          Front Row (Exposed)
        </div>
        {/* Front row */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {([0, 1, 2] as Column[]).map(col => {
            const pokemon = getPokemonInSlot('front', col);
            const slotKey: SlotKey = `front-${col}`;
            return (
              <FormationSlot
                key={`front-${col}`}
                pokemon={pokemon}
                slotKey={slotKey}
                isEmpty={!pokemon}
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
      </div>

      {/* Unplaced Pokemon - Always visible */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>
          {unplacedPokemon.length > 0 ? 'Drag to place:' : 'Drop Pokemon here to unplace:'}
        </div>
        <div
          onDragOver={(e) => handleDragOver(e, 'unplaced')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'unplaced')}
          style={{
            minHeight: 100,
            padding: 16,
            background: dragOverTarget === 'unplaced' ? '#2d2d3f' : '#1a1a24',
            border: dragOverTarget === 'unplaced' 
              ? '2px dashed #facc15' 
              : unplacedPokemon.length > 0 
                ? '2px solid #444' 
                : '2px dashed #444',
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
                <div
                  key={id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, id, 'unplaced')}
                  onDragEnd={handleDragEnd}
                  style={{
                    width: 100,
                    padding: 8,
                    background: '#2d2d3f',
                    border: '2px solid #facc15',
                    borderRadius: 8,
                    cursor: 'grab',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseDown={(e) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.cursor = 'grabbing';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.cursor = 'grab';
                    }
                  }}
                >
                  <img
                    src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
                    alt={pokemon.name}
                    style={{ width: 50, height: 50, imageRendering: 'pixelated', objectFit: 'contain' }}
                    draggable={false}
                  />
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>{pokemon.name}</div>
                </div>
              );
            })
          ) : (
            <div style={{ 
              color: '#64748b', 
              fontSize: 14, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              minHeight: 60,
            }}>
              Drop Pokemon here
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <button
          onClick={goBackToSelect}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 'bold',
            borderRadius: 8,
            border: '2px solid #555',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={startBattle}
          disabled={!allPlaced}
          style={{
            padding: '12px 32px',
            fontSize: 17,
            fontWeight: 'bold',
            borderRadius: 8,
            border: 'none',
            background: allPlaced ? '#facc15' : '#333',
            color: allPlaced ? '#000' : '#666',
            cursor: allPlaced ? 'pointer' : 'not-allowed',
          }}
        >
          Start Battle
        </button>
      </div>
    </div>
  );
}

function FormationSlot({
  pokemon,
  slotKey,
  isEmpty,
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
  isEmpty: boolean;
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
          ? '2px solid #facc15'
          : isEmpty
            ? '2px dashed #444'
            : '2px solid #facc15',
        borderRadius: 8,
        background: isDragOver && canDrop
          ? '#3d3d4f'
          : isEmpty
            ? '#1a1a24'
            : '#2d2d3f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: pokemon ? 'grab' : canDrop ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragOver && canDrop ? '0 0 8px rgba(250, 204, 21, 0.5)' : 'none',
      }}
      onMouseDown={(e) => {
        if (pokemon && e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.cursor = 'grabbing';
        }
      }}
      onMouseUp={(e) => {
        if (pokemon && e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.cursor = 'grab';
        }
      }}
    >
      {pokemon ? (
        <>
          <img
            src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.id}.gif`}
            alt={pokemon.name}
            style={{ width: 60, height: 60, imageRendering: 'pixelated', objectFit: 'contain' }}
            draggable={false}
          />
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e2e8f0' }}>
            {pokemon.name}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 26, color: isDragOver && canDrop ? '#facc15' : '#444' }}>+</div>
      )}
    </div>
  );
}
