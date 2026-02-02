import type { CardDefinition } from '../../config/cards';

interface CardDisplayProps {
  card: CardDefinition;
  canAfford: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CardDisplay({ card, canAfford, isSelected = false, onClick }: CardDisplayProps) {
  return (
    <div
      style={{
        border: isSelected ? '3px solid #fbbf24' : '2px solid #4b5563',
        borderRadius: '8px',
        padding: '10px',
        backgroundColor: canAfford ? '#1f2937' : '#374151',
        cursor: canAfford && onClick ? 'pointer' : 'not-allowed',
        minWidth: '140px',
        width: '140px',
        flexShrink: 0,
        opacity: canAfford ? 1 : 0.6,
        transition: 'all 0.2s',
      }}
      onClick={canAfford ? onClick : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{card.name}</div>
        <div
          style={{
            backgroundColor: canAfford ? '#3b82f6' : '#6b7280',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {card.cost}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{card.description}</div>
    </div>
  );
}
