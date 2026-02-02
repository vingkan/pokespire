import type { PokemonCombatState } from '../../engine/types';
import { getPokemonStats } from '../../config/pokemon';
import { HealthBar } from './HealthBar';
import { ManaBar } from './ManaBar';
import { StatusIcon } from './StatusIcon';

interface PokemonDisplayProps {
  pokemon: PokemonCombatState;
  isEnemy?: boolean;
  isCurrentTurn?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function PokemonDisplay({ pokemon, isEnemy = false, isCurrentTurn = false, isSelected = false, onClick }: PokemonDisplayProps) {
  const stats = getPokemonStats(pokemon.pokemonId);
  const spriteUrl = isEnemy
    ? `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.pokemonId}.gif`
    : `https://img.pokemondb.net/sprites/black-white/anim/back-normal/${pokemon.pokemonId}.gif`;

  // Determine background and shadow for selection/turn indication
  const backgroundColor = isSelected ? '#1e3a5f' : isCurrentTurn ? '#1f2937' : '#111827';
  const boxShadow = isSelected 
    ? '0 0 10px rgba(59, 130, 246, 0.5)' 
    : isCurrentTurn 
    ? '0 0 8px rgba(251, 191, 36, 0.4)' 
    : 'none';

  return (
    <div
      style={{
        borderRadius: '6px',
        padding: '6px',
        backgroundColor: backgroundColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: pokemon.currentHp <= 0 ? 0.5 : 1,
        boxShadow: boxShadow,
        width: '120px',
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <img
          src={spriteUrl}
          alt={stats.name}
          style={{
            width: '60px',
            height: '60px',
            imageRendering: 'pixelated',
          }}
          onError={(e) => {
            // Fallback if sprite doesn't exist
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div style={{ fontWeight: 'bold', marginTop: '2px', fontSize: '13px' }}>{stats.name}</div>
        {pokemon.playerId && (
          <div style={{ fontSize: '9px', color: '#9ca3af' }}>P{pokemon.playerId}</div>
        )}
        <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>
          Spd: {pokemon.speed}
        </div>
      </div>
      
      {/* Compact Health Bar - Constrained to sprite width (60px) */}
      <div style={{ marginBottom: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: '60px',
            height: '8px',
            backgroundColor: '#374151',
            borderRadius: '2px',
            overflow: 'hidden',
            border: '1px solid #4b5563',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, (pokemon.currentHp / pokemon.maxHp) * 100))}%`,
              height: '100%',
              backgroundColor: (pokemon.currentHp / pokemon.maxHp) > 0.5 ? '#4ade80' : (pokemon.currentHp / pokemon.maxHp) > 0.25 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: '9px', marginTop: '2px', textAlign: 'center' }}>
          {pokemon.currentHp} / {pokemon.maxHp}
        </div>
      </div>
      
      {/* Compact Mana Bar (only for player) - Constrained to sprite width (60px) */}
      {!isEnemy && (
        <div style={{ marginBottom: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '6px',
              backgroundColor: '#1e3a5f',
              borderRadius: '2px',
              overflow: 'hidden',
              border: '1px solid #3b82f6',
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (pokemon.currentMana / pokemon.maxMana) * 100))}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '8px', marginTop: '1px', textAlign: 'center', color: '#93c5fd' }}>
            {pokemon.currentMana} / {pokemon.maxMana}
          </div>
        </div>
      )}
      
      {/* Status Icons and Buffs - Compact Row */}
      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center' }}>
        {pokemon.statuses.map((status, i) => (
          <StatusIcon key={i} type={status.type} stacks={status.stacks} />
        ))}
        {pokemon.buffs.map((buff, i) => (
          <StatusIcon key={`buff-${i}`} type={buff.type} stacks={buff.stacks} />
        ))}
      </div>
      
      {/* Block - Compact */}
      {pokemon.block > 0 && (
        <div style={{ 
          marginTop: '3px', 
          fontSize: '9px', 
          fontWeight: 'bold',
          color: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.2)',
          padding: '2px 6px',
          borderRadius: '3px',
          textAlign: 'center',
        }}>
          🛡️ {pokemon.block}
        </div>
      )}
      
      {/* Selected Indicator - Compact */}
      {isSelected && (
        <div style={{
          marginTop: '3px',
          fontSize: '9px',
          color: '#3b82f6',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          ✓ Target
        </div>
      )}
    </div>
  );
}
