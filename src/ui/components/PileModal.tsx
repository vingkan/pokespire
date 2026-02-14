import type { Combatant } from '../../engine/types';
import { getMove } from '../../data/loaders';
import { CardDisplay } from './CardDisplay';
import { THEME } from '../theme';

interface Props {
  title: string;
  cards: string[];
  combatant: Combatant;
  onClose: () => void;
}

export function PileModal({ title, cards, combatant, onClose }: Props) {
  return (
    <div
      style={{
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
      onClick={onClose}
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
            onClick={onClose}
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
  );
}
