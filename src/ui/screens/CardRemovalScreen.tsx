import { useState } from 'react';
import type { RunState, CardRemovalNode } from '../../run/types';
import { getPokemon, getMove } from '../../data/loaders';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  node: CardRemovalNode;
  onComplete: (removals: Map<number, number[]>) => void;
  onSkip: () => void;
  onRestart: () => void;
}

export function CardRemovalScreen({ run, node, onComplete, onSkip, onRestart }: Props) {
  // Track selected cards per Pokemon: Map<pokemonIndex, cardIndices[]>
  const [selectedCards, setSelectedCards] = useState<Map<number, Set<number>>>(new Map());

  const toggleCard = (pokemonIndex: number, cardIndex: number) => {
    setSelectedCards(prev => {
      const newMap = new Map(prev);
      const pokemonSelected = new Set(newMap.get(pokemonIndex) ?? []);

      if (pokemonSelected.has(cardIndex)) {
        pokemonSelected.delete(cardIndex);
      } else {
        // Check if we've reached max removals total
        const totalSelected = Array.from(newMap.values()).reduce((sum, set) => sum + set.size, 0);
        if (totalSelected >= node.maxRemovals) {
          return prev; // Can't select more
        }
        pokemonSelected.add(cardIndex);
      }

      newMap.set(pokemonIndex, pokemonSelected);
      return newMap;
    });
  };

  const totalSelected = Array.from(selectedCards.values()).reduce((sum, set) => sum + set.size, 0);

  const handleConfirm = () => {
    const removals = new Map<number, number[]>();
    selectedCards.forEach((cardIndices, pokemonIndex) => {
      if (cardIndices.size > 0) {
        removals.set(pokemonIndex, Array.from(cardIndices));
      }
    });
    onComplete(removals);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: 32,
      color: THEME.text.primary,
      minHeight: '100dvh',
      overflowY: 'auto',
      background: '#0f0f17',
      position: 'relative',
    }}>
      <button
        onClick={onRestart}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          fontSize: 13,
          borderRadius: 6,
          border: '1px solid ' + THEME.border.bright,
          background: 'transparent',
          color: THEME.text.secondary,
          cursor: 'pointer',
        }}
      >
        Main Menu
      </button>

      {/* Header */}
      <div style={{
        fontSize: 36,
        fontWeight: 'bold',
        color: '#f43f5e',
        textShadow: '0 0 20px #f43f5e55',
        letterSpacing: THEME.heading.letterSpacing,
      }}>
        Card Removal
      </div>

      <div style={{
        fontSize: 16,
        color: THEME.text.secondary,
        textAlign: 'center',
      }}>
        Select up to {node.maxRemovals} card{node.maxRemovals > 1 ? 's' : ''} to permanently remove from your decks.
        <br />
        <span style={{ color: THEME.text.tertiary }}>
          ({totalSelected}/{node.maxRemovals} selected)
        </span>
      </div>

      {/* Pokemon Deck Displays */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: '100%',
        maxWidth: 1000,
      }}>
        {run.party.map((pokemon, pokemonIndex) => {
          const basePokemon = getPokemon(pokemon.formId);
          const pokemonSelected = selectedCards.get(pokemonIndex) ?? new Set();

          return (
            <div key={pokemonIndex} style={{
              background: '#1e1e2e',
              borderRadius: 12,
              padding: 16,
              border: '1px solid ' + THEME.border.subtle,
            }}>
              {/* Pokemon Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}>
                <img
                  src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                  alt={basePokemon.name}
                  style={{
                    width: 48,
                    height: 48,
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                  }}
                />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>{basePokemon.name}</div>
                  <div style={{ fontSize: 12, color: THEME.text.tertiary }}>
                    {pokemon.deck.length} cards in deck
                  </div>
                </div>
              </div>

              {/* Card Grid */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                {pokemon.deck.map((cardId, cardIndex) => {
                  const card = getMove(cardId);
                  const isSelected = pokemonSelected.has(cardIndex);
                  const canSelect = isSelected || totalSelected < node.maxRemovals;

                  return (
                    <button
                      key={`${cardId}-${cardIndex}`}
                      onClick={() => canSelect && toggleCard(pokemonIndex, cardIndex)}
                      disabled={!canSelect}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: isSelected ? '2px solid #f43f5e' : '1px solid ' + THEME.border.medium,
                        background: isSelected ? '#f43f5e22' : '#2a2a3e',
                        color: isSelected ? '#f43f5e' : THEME.text.primary,
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        opacity: canSelect ? 1 : 0.5,
                        transition: 'all 0.1s',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{card.name}</div>
                      <div style={{ fontSize: 10, color: THEME.text.tertiary }}>
                        {card.cost} cost • {card.type}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 16,
      }}>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            border: '1px solid ' + THEME.border.bright,
            background: 'transparent',
            color: THEME.text.secondary,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>

        <button
          onClick={handleConfirm}
          disabled={totalSelected === 0}
          style={{
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            border: 'none',
            background: totalSelected > 0 ? '#f43f5e' : '#333',
            color: totalSelected > 0 ? '#fff' : '#666',
            cursor: totalSelected > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Remove {totalSelected} Card{totalSelected !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
