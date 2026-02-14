import { useState, useEffect, useRef } from 'react';
import type { Combatant } from '../../engine/types';
import { getMove } from '../../data/loaders';
import { CardDisplay } from './CardDisplay';

interface Props {
  combatant: Combatant;
}

export function EnemyHandPreview({ combatant }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate position from the sprite's DOM element
  useEffect(() => {
    const spriteEl = document.querySelector(`[data-sprite-id="${combatant.id}"]`);
    if (!spriteEl) return;

    const rect = spriteEl.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => setVisible(true));
  }, [combatant.id]);

  if (!position || combatant.hand.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 90,
        pointerEvents: 'none',
      }}
    >
      {/* Scaled card row */}
      <div style={{
        display: 'flex',
        gap: 4,
        transform: 'scale(0.65)',
        transformOrigin: 'bottom center',
      }}>
        {combatant.hand.map((cardId, i) => {
          const card = getMove(cardId);
          return (
            <div
              key={`${cardId}-${i}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 150ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms, transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms`,
              }}
            >
              <CardDisplay
                card={card}
                combatant={combatant}
                canAfford={true}
                isSelected={false}
                onClick={() => {}}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
