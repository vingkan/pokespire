import { useState, useEffect } from 'react';
import type { RunState } from '../../run/types';
import { HYPNO_DIALOGUE, CARD_FORGET_COST } from '../../data/shop';
import { getMove, getPokemon } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';
import { GoldCoin } from '../components/GoldCoin';
import { getSpriteSize } from '../../data/heights';

interface Props {
  run: RunState;
  onForgetCard: (pokemonIndex: number, cardIndex: number, source: 'party' | 'bench') => void;
  onClose: () => void;
  onRestart: () => void;
}

const HYPNO_COLOR = '#fbbf24';

export function MoveDeleterScreen({ run, onForgetCard, onClose, onRestart }: Props) {
  const [selectedPokemon, setSelectedPokemon] = useState<{ index: number; source: 'party' | 'bench' } | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [dialogue, setDialogue] = useState<string>(HYPNO_DIALOGUE.welcome);
  const [fadeTimer, setFadeTimer] = useState(false);

  // After forgetting, briefly show confirmation then reset to pokemon-selected dialogue
  useEffect(() => {
    if (!fadeTimer) return;
    const timer = setTimeout(() => {
      if (selectedPokemon) {
        setDialogue(HYPNO_DIALOGUE.pokemonSelected);
      } else {
        setDialogue(HYPNO_DIALOGUE.welcome);
      }
      setFadeTimer(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [fadeTimer, selectedPokemon]);

  const handleSelectPokemon = (index: number, source: 'party' | 'bench') => {
    setSelectedPokemon({ index, source });
    setSelectedCardIndex(null);
    setDialogue(HYPNO_DIALOGUE.pokemonSelected);
  };

  const handleSelectCard = (cardIndex: number) => {
    setSelectedCardIndex(prev => prev === cardIndex ? null : cardIndex);
  };

  const handleForget = () => {
    if (selectedPokemon === null || selectedCardIndex === null) return;

    if (run.gold < CARD_FORGET_COST) {
      setDialogue(HYPNO_DIALOGUE.cantAfford);
      return;
    }

    onForgetCard(selectedPokemon.index, selectedCardIndex, selectedPokemon.source);
    setSelectedCardIndex(null);
    setDialogue(HYPNO_DIALOGUE.cardForgotten);
    setFadeTimer(true);
  };

  const handleBack = () => {
    setSelectedPokemon(null);
    setSelectedCardIndex(null);
    setDialogue(HYPNO_DIALOGUE.welcome);
  };

  // Get the selected Pokemon's deck
  const selectedDeck: string[] | null = selectedPokemon
    ? (selectedPokemon.source === 'party'
        ? run.party[selectedPokemon.index]?.deck
        : run.bench[selectedPokemon.index]?.deck) ?? null
    : null;

  const selectedPokemonData = selectedPokemon
    ? (selectedPokemon.source === 'party'
        ? run.party[selectedPokemon.index]
        : run.bench[selectedPokemon.index]) ?? null
    : null;

  const canAfford = run.gold >= CARD_FORGET_COST;

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
    }}>
      <h1 style={{
        fontSize: 24,
        margin: 0,
        color: HYPNO_COLOR,
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        Hypno's Parlor
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: 6,
          background: 'rgba(250, 204, 21, 0.1)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          color: '#facc15',
          fontSize: 16,
          fontWeight: 'bold',
        }}>
          {run.gold}<GoldCoin size={14} />
        </div>
        <button
          onClick={onClose}
          style={{
            ...THEME.button.secondary,
            padding: '6px 14px',
            fontSize: 13,
          }}
        >
          Leave
        </button>
        <button
          onClick={onRestart}
          style={{
            ...THEME.button.secondary,
            padding: '6px 14px',
            fontSize: 12,
          }}
        >
          Main Menu
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
    }}>
      <ScreenShell header={header} ambient>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          padding: '24px 16px 48px',
        }}>
          {/* Hypno sprite */}
          <img
            src="https://img.pokemondb.net/sprites/black-white/anim/normal/hypno.gif"
            alt="Hypno"
            style={{
              width: 96,
              height: 96,
              imageRendering: 'pixelated',
              objectFit: 'contain',
            }}
          />

          {/* Dialogue bubble */}
          <div style={{
            padding: '12px 24px',
            background: `${HYPNO_COLOR}22`,
            borderRadius: 12,
            border: `2px solid ${HYPNO_COLOR}44`,
            color: HYPNO_COLOR,
            fontStyle: 'italic',
            fontSize: 15,
            maxWidth: 400,
            textAlign: 'center',
          }}>
            {dialogue}
          </div>

          {/* Pokemon selected: show deck + forget button */}
          {selectedPokemon && selectedDeck && selectedPokemonData && (
            <>
              <p style={{
                color: THEME.text.secondary,
                margin: 0,
                textAlign: 'center',
                fontSize: 14,
              }}>
                <span style={{ color: THEME.text.primary, fontWeight: 'bold' }}>
                  {getPokemon(selectedPokemonData.formId).name}
                </span>'s deck ({selectedDeck.length} cards)
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                justifyContent: 'center',
                maxWidth: 820,
              }}>
                {selectedDeck.map((cardId, i) => {
                  const move = getMove(cardId);
                  return (
                    <CardPreview
                      key={`${cardId}-${i}`}
                      card={move}
                      onClick={() => handleSelectCard(i)}
                      isSelected={selectedCardIndex === i}
                    />
                  );
                })}
              </div>

              {/* Forget button */}
              {selectedCardIndex !== null && (
                <button
                  onClick={handleForget}
                  disabled={!canAfford}
                  style={{
                    padding: '12px 32px',
                    fontSize: 16,
                    fontWeight: 'bold',
                    borderRadius: 8,
                    border: canAfford
                      ? `2px solid ${HYPNO_COLOR}`
                      : `2px solid ${THEME.border.subtle}`,
                    background: canAfford
                      ? `${HYPNO_COLOR}18`
                      : 'transparent',
                    color: canAfford ? HYPNO_COLOR : THEME.text.tertiary,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    boxShadow: canAfford
                      ? `0 0 12px ${HYPNO_COLOR}33`
                      : 'none',
                  }}
                >
                  Forget ({CARD_FORGET_COST}<GoldCoin size={12} />)
                </button>
              )}

              <button
                onClick={handleBack}
                style={{
                  ...THEME.button.secondary,
                  padding: '8px 20px',
                  fontSize: 13,
                }}
              >
                Back to roster
              </button>
            </>
          )}

          {/* Pokemon selection: show party + bench */}
          {!selectedPokemon && (
            <>
              {/* Party */}
              <div style={{
                fontSize: 11,
                color: THEME.text.tertiary,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Party
              </div>
              <div style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {run.party.map((pokemon, i) => {
                  const data = getPokemon(pokemon.formId);
                  const isDead = pokemon.currentHp <= 0 || pokemon.knockedOut;
                  return (
                    <PokemonTile
                      key={`party-${i}`}
                      name={data.name}
                      formId={pokemon.formId}
                      deckCount={pokemon.deck.length}
                      isDead={isDead}
                      themeColor={HYPNO_COLOR}
                      onClick={() => !isDead && handleSelectPokemon(i, 'party')}
                    />
                  );
                })}
              </div>

              {/* Bench */}
              {run.bench.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11,
                    color: THEME.text.tertiary,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginTop: 8,
                  }}>
                    Bench
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}>
                    {run.bench.map((pokemon, i) => {
                      const data = getPokemon(pokemon.formId);
                      const isDead = pokemon.currentHp <= 0 || pokemon.knockedOut;
                      return (
                        <PokemonTile
                          key={`bench-${i}`}
                          name={data.name}
                          formId={pokemon.formId}
                          deckCount={pokemon.deck.length}
                          isDead={isDead}
                          themeColor={HYPNO_COLOR}
                          onClick={() => !isDead && handleSelectPokemon(i, 'bench')}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScreenShell>
    </div>
  );
}

/** Reusable Pokemon tile for selection (mirrors ShopScreen pattern). */
function PokemonTile({ name, formId, deckCount, isDead, themeColor, onClick }: {
  name: string;
  formId: string;
  deckCount: number;
  isDead: boolean;
  themeColor: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 170,
        padding: 16,
        borderRadius: 16,
        border: isDead
          ? `3px solid ${THEME.border.subtle}`
          : `3px solid ${themeColor}`,
        background: THEME.bg.panel,
        cursor: isDead ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        opacity: isDead ? 0.4 : 1,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isDead) {
          e.currentTarget.style.boxShadow = `0 0 16px ${themeColor}44`;
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <img
        src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${formId}.gif`}
        alt={name}
        style={{
          width: Math.min(getSpriteSize(formId) * 0.7, 56),
          height: Math.min(getSpriteSize(formId) * 0.7, 56),
          imageRendering: 'pixelated',
          objectFit: 'contain',
          filter: isDead ? 'grayscale(100%)' : 'none',
        }}
      />
      <div style={{ fontSize: 17, fontWeight: 'bold', marginTop: 4 }}>
        {name}
      </div>
      <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
        {deckCount} cards
      </div>
      {isDead && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          background: '#ef444422',
          borderRadius: 8,
          fontSize: 12,
          color: '#ef4444',
          fontWeight: 'bold',
        }}>
          FAINTED
        </div>
      )}
    </div>
  );
}
