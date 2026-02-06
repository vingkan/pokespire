import type { Combatant } from '../../engine/types';
import { getMove } from '../../data/loaders';
import { getEffectiveCost } from '../../engine/cards';
import { CardDisplay } from './CardDisplay';

interface Props {
  combatant: Combatant;
  selectedIndex: number | null;
  onSelectCard: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  draggingIndex?: number | null;
}

export function HandDisplay({ combatant, selectedIndex, onSelectCard, onDragStart, onDragEnd, draggingIndex }: Props) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      {combatant.hand.map((cardId, idx) => {
        const card = getMove(cardId);
        // Use centralized cost calculation (includes Quick Feet, Hustle, Inferno Momentum)
        const effectiveCost = getEffectiveCost(combatant, idx);
        const canAfford = combatant.energy >= effectiveCost;

        return (
          <CardDisplay
            key={`${cardId}-${idx}`}
            cardId={cardId}
            handIndex={idx}
            card={card}
            combatant={combatant}
            canAfford={canAfford}
            isSelected={selectedIndex === idx}
            onClick={() => onSelectCard(idx)}
            onDragStart={() => onDragStart?.(idx)}
            onDragEnd={onDragEnd}
            isDragging={draggingIndex === idx}
          />
        );
      })}
    </div>
  );
}
