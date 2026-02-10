import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Combatant } from '../../engine/types';
import { getMove } from '../../data/loaders';
import { getEffectiveCost } from '../../engine/cards';
import { CardDisplay } from './CardDisplay';

export interface HandDisplayRef {
  getCardPosition: (index: number) => { x: number; y: number } | null;
}

interface Props {
  combatant: Combatant;
  selectedIndex: number | null;
  onSelectCard: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  draggingIndex?: number | null;
}

export const HandDisplay = forwardRef<HandDisplayRef, Props>(function HandDisplay(
  { combatant, selectedIndex, onSelectCard, onDragStart, onDragEnd, draggingIndex },
  ref
) {
  // Refs to track card DOM positions
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const getCardPosition = useCallback((index: number): { x: number; y: number } | null => {
    const el = cardRefs.current.get(index);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  // Expose getCardPosition to parent via ref
  useImperativeHandle(ref, () => ({
    getCardPosition,
  }), [getCardPosition]);

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
          <div
            key={`${cardId}-${idx}`}
            ref={(el) => {
              if (el) {
                cardRefs.current.set(idx, el);
              } else {
                cardRefs.current.delete(idx);
              }
            }}
          >
            <CardDisplay
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
          </div>
        );
      })}
    </div>
  );
});
