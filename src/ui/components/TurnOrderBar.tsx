import type { PokemonCombatState } from '../../engine/types';
import { getPokemonStats } from '../../config/pokemon';

interface TurnOrderBarProps {
  turnOrder: PokemonCombatState[];
  currentTurnIndex: number;
}

export function TurnOrderBar({ turnOrder, currentTurnIndex }: TurnOrderBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        padding: '8px',
        backgroundColor: '#1f2937',
        borderRadius: '6px',
        overflowX: 'auto',
      }}
    >
      {turnOrder.map((pokemon, index) => {
        const stats = getPokemonStats(pokemon.pokemonId);
        const isCurrent = index === currentTurnIndex;
        const isDead = pokemon.currentHp <= 0;
        
        return (
          <div
            key={`${pokemon.pokemonId}-${index}`}
            style={{
              padding: '6px 10px',
              backgroundColor: isCurrent ? '#fbbf24' : isDead ? '#6b7280' : '#374151',
              borderRadius: '4px',
              minWidth: '90px',
              textAlign: 'center',
              border: isCurrent ? '2px solid #f59e0b' : '1px solid #4b5563',
              opacity: isDead ? 0.5 : 1,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{stats.name}</div>
            <div style={{ fontSize: '9px', color: '#9ca3af' }}>
              {pokemon.playerId ? `P${pokemon.playerId}` : 'Enemy'}
            </div>
            <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>
              Spd: {pokemon.speed}
            </div>
            {isCurrent && <div style={{ fontSize: '9px', marginTop: '2px' }}>→</div>}
          </div>
        );
      })}
    </div>
  );
}
