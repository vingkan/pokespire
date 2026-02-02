import type { PokemonCombatState } from '../../engine/types';
import { getCardDefinition } from '../../config/cards';
import { CardDisplay } from './CardDisplay';

interface HandDisplayProps {
  pokemon: PokemonCombatState;
  selectedCardIndex?: number;
  onCardClick?: (cardIndex: number) => void;
}

export function HandDisplay({ pokemon, selectedCardIndex, onCardClick }: HandDisplayProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'nowrap',
        justifyContent: 'flex-start',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '4px 0',
        minHeight: '120px',
      }}
    >
      {pokemon.hand.map((cardId, index) => {
        const card = getCardDefinition(cardId);
        if (!card) return null;
        
        const canAfford = pokemon.currentMana >= card.cost;
        return (
          <CardDisplay
            key={`${cardId}-${index}`}
            card={card}
            canAfford={canAfford}
            isSelected={selectedCardIndex === index}
            onClick={() => onCardClick?.(index)}
          />
        );
      })}
    </div>
  );
}
