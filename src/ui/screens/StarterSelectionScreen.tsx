import { useState } from 'react';
import type { PokemonId } from '../../config/pokemon';
import { POKEMON_STATS } from '../../config/pokemon';

interface Player {
  id: string;
  name: string;
}

interface StarterSelectionScreenProps {
  players: Player[];
  onStart: (selections: Record<string, PokemonId>) => void;
  onBack: () => void;
}

const STARTERS: PokemonId[] = ['bulbasaur', 'squirtle', 'charmander', 'pikachu'];

export function StarterSelectionScreen({ players, onStart, onBack }: StarterSelectionScreenProps) {
  const [selections, setSelections] = useState<Record<string, PokemonId>>({});

  const handleSelect = (playerId: string, pokemonId: PokemonId) => {
    // Check if already selected by another player
    const isSelected = Object.values(selections).includes(pokemonId);
    if (isSelected && selections[playerId] !== pokemonId) {
      return; // Can't select already chosen Pokemon
    }
    setSelections({ ...selections, [playerId]: pokemonId });
  };

  const allSelected = players.every(p => selections[p.id]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '40px',
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'auto',
      }}
    >
      <h1 style={{ fontSize: '36px', marginBottom: '32px', marginTop: '40px' }}>Choose Your Starter</h1>
      
      {players.map((player, playerIndex) => {
        const selected = selections[player.id];
        return (
          <div key={player.id} style={{ marginBottom: '32px', width: '100%', maxWidth: '1000px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              {player.name} - Choose Your Pokemon
            </h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {STARTERS.map(pokemonId => {
                const stats = POKEMON_STATS[pokemonId];
                const isSelected = selected === pokemonId;
                const isTaken = Object.values(selections).includes(pokemonId) && !isSelected;
                const spriteUrl = `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;

                return (
                  <div
                    key={pokemonId}
                    onClick={() => !isTaken && handleSelect(player.id, pokemonId)}
                    style={{
                      border: isSelected ? '3px solid #fbbf24' : isTaken ? '2px solid #6b7280' : '2px solid #4b5563',
                      borderRadius: '12px',
                      padding: '16px',
                      backgroundColor: isSelected ? '#1f2937' : isTaken ? '#374151' : '#111827',
                      cursor: isTaken ? 'not-allowed' : 'pointer',
                      opacity: isTaken ? 0.5 : 1,
                      textAlign: 'center',
                      minWidth: '150px',
                    }}
                  >
                    <img
                      src={spriteUrl}
                      alt={stats.name}
                      style={{ width: '100px', height: '100px', imageRendering: 'pixelated' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div style={{ fontWeight: 'bold', marginTop: '8px' }}>{stats.name}</div>
                    {isTaken && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Taken</div>}
                    {isSelected && <div style={{ fontSize: '12px', color: '#fbbf24' }}>Selected</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={() => onStart(selections)}
          disabled={!allSelected}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: allSelected ? '#3b82f6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: allSelected ? 'pointer' : 'not-allowed',
          }}
        >
          Start Campaign
        </button>
      </div>
    </div>
  );
}
