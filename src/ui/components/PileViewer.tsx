import { useState } from 'react';
import type { Combatant } from '../../engine/types';
import { getMove } from '../../data/loaders';
import { CardDisplay } from './CardDisplay';
import { THEME } from '../theme';

type PileType = 'draw' | 'discard' | 'vanished';

interface Props {
  combatant: Combatant;
}

export function PileViewer({ combatant }: Props) {
  const [openPile, setOpenPile] = useState<PileType | null>(null);

  const drawCount = combatant.drawPile.length;
  const discardCount = combatant.discardPile.length;
  const vanishedCount = combatant.vanishedPile.length;

  const toggle = (pile: PileType) => {
    setOpenPile(prev => prev === pile ? null : pile);
  };

  let cards: string[] = [];
  let title = '';
  if (openPile === 'draw') {
    // Show in random order (shuffled copy)
    cards = [...combatant.drawPile].sort(() => Math.random() - 0.5);
    title = `Draw Pile (${drawCount})`;
  } else if (openPile === 'discard') {
    // Show in order (most recent first)
    cards = [...combatant.discardPile].reverse();
    title = `Discard Pile (${discardCount})`;
  } else if (openPile === 'vanished') {
    cards = [...combatant.vanishedPile];
    title = `Vanished (${vanishedCount})`;
  }

  const btnStyle = (pile: PileType, count: number): React.CSSProperties => ({
    ...THEME.button.secondary,
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: openPile === pile ? 'bold' : 'normal',
    ...(openPile === pile ? {
      borderColor: THEME.accent,
      background: THEME.bg.elevated,
      boxShadow: 'inset 0 0 8px rgba(250,204,21,0.1)',
    } : {}),
    color: count > 0 ? THEME.text.primary : THEME.text.tertiary,
    cursor: count > 0 ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button onClick={() => drawCount > 0 && toggle('draw')} style={btnStyle('draw', drawCount)}>
        Deck ({drawCount})
      </button>
      <button onClick={() => discardCount > 0 && toggle('discard')} style={btnStyle('discard', discardCount)}>
        Discard ({discardCount})
      </button>
      {vanishedCount > 0 && (
        <button onClick={() => toggle('vanished')} style={btnStyle('vanished', vanishedCount)}>
          Vanished ({vanishedCount})
        </button>
      )}

      {openPile && cards.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
          onClick={() => setOpenPile(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: THEME.bg.panel,
              borderRadius: 10,
              border: `1.5px solid ${THEME.border.medium}`,
              padding: 20,
              maxWidth: 700,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: THEME.accent }}>
                {title}
              </div>
              <button
                onClick={() => setOpenPile(null)}
                style={{
                  ...THEME.button.secondary,
                  padding: '4px 12px',
                  fontSize: 15,
                }}
              >
                Close
              </button>
            </div>
            <div style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {cards.map((cardId, idx) => {
                const card = getMove(cardId);
                return (
                  <CardDisplay
                    key={`${cardId}-${idx}`}
                    card={card}
                    combatant={combatant}
                    canAfford={false}
                    isSelected={false}
                    onClick={() => {}}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
