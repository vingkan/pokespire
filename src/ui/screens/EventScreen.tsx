import { useState } from 'react';
import type { RunState, EventType } from '../../run/types';
import { getPokemon, getMove } from '../../data/loaders';
import { EXP_PER_LEVEL } from '../../run/state';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  eventType: EventType;
  onTrain: (pokemonIndex: number) => void;
  onMeditate: (pokemonIndex: number) => void;
  onForget: (removals: Map<number, number[]>) => void;
  onRestart: () => void;
}

const TRAIN_HP_BOOST = 5;
const MEDITATE_EXP = 1;

const EVENT_CONFIG: Record<EventType, {
  title: string;
  description: string;
  color: string;
  bgColor: string;
  helper: string;
  helperQuote: string;
}> = {
  train: {
    title: 'Training Camp',
    description: 'Machoke offers to train one of your Pokemon. +5 Max HP.',
    color: '#60a5fa',
    bgColor: '#60a5fa22',
    helper: 'machoke',
    helperQuote: '"No pain, no gain!"',
  },
  meditate: {
    title: 'Meditation',
    description: 'Medicham guides one Pokemon in meditation. +1 EXP.',
    color: '#a855f7',
    bgColor: '#a855f722',
    helper: 'medicham',
    helperQuote: '"Clear your mind..."',
  },
  forget: {
    title: 'Move Tutor',
    description: 'Hypno helps your Pokemon forget unwanted moves. Remove 1 card each.',
    color: '#f43f5e',
    bgColor: '#f43f5e22',
    helper: 'hypno',
    helperQuote: '"Let go of what holds you back..."',
  },
};

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

export function EventScreen({ run, eventType, onTrain, onMeditate, onForget, onRestart }: Props) {
  const config = EVENT_CONFIG[eventType];
  const [forgetSelections, setForgetSelections] = useState<Map<number, number>>(new Map());

  const handleSelectPokemon = (pokemonIndex: number) => {
    if (eventType === 'train') {
      onTrain(pokemonIndex);
    } else if (eventType === 'meditate') {
      onMeditate(pokemonIndex);
    }
  };

  const handleForgetCardSelect = (pokemonIndex: number, cardIndex: number) => {
    setForgetSelections(prev => {
      const newMap = new Map(prev);
      if (newMap.get(pokemonIndex) === cardIndex) {
        newMap.delete(pokemonIndex);
      } else {
        newMap.set(pokemonIndex, cardIndex);
      }
      return newMap;
    });
  };

  const handleForgetConfirm = () => {
    const removals = new Map<number, number[]>();
    forgetSelections.forEach((cardIndex, pokemonIndex) => {
      removals.set(pokemonIndex, [cardIndex]);
    });
    onForget(removals);
  };

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
    }}>
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
      <h1 style={{
        fontSize: 24,
        margin: 0,
        color: config.color,
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        {config.title}
      </h1>
      <div style={{ width: 80 }} />
    </div>
  );

  return (
    <ScreenShell header={header}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '24px 16px 48px',
      }}>
        {/* Helper sprite */}
        <img
          src={getSpriteUrl(config.helper)}
          alt={config.helper}
          style={{
            width: 96,
            height: 96,
            imageRendering: 'pixelated',
            objectFit: 'contain',
          }}
        />

        <div style={{
          padding: '12px 24px',
          background: config.bgColor,
          borderRadius: 12,
          border: `2px solid ${config.color}44`,
          color: config.color,
          fontStyle: 'italic',
          fontSize: 15,
        }}>
          {config.helperQuote}
        </div>

        <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center', maxWidth: 500 }}>
          {config.description}
        </p>

        {/* Train/Meditate: pick one Pokemon */}
        {eventType !== 'forget' && (
          <>
            <div style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {run.party.map((pokemon, i) => {
                const basePokemon = getPokemon(pokemon.formId);
                const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
                const isDead = pokemon.knockedOut || pokemon.currentHp <= 0;

                return (
                  <div
                    key={i}
                    onClick={() => !isDead && handleSelectPokemon(i)}
                    style={{
                      width: 170,
                      padding: 16,
                      borderRadius: 16,
                      border: isDead ? '3px solid ' + THEME.border.subtle : `3px solid ${config.color}`,
                      background: '#1e1e2e',
                      cursor: isDead ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      opacity: isDead ? 0.4 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDead) {
                        e.currentTarget.style.boxShadow = `0 0 16px ${config.color}44`;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img
                      src={getSpriteUrl(pokemon.formId)}
                      alt={basePokemon.name}
                      style={{
                        width: 72,
                        height: 72,
                        imageRendering: 'pixelated',
                        objectFit: 'contain',
                        filter: isDead ? 'grayscale(100%)' : 'none',
                      }}
                    />
                    <div style={{ fontSize: 17, fontWeight: 'bold', marginTop: 4 }}>
                      {basePokemon.name}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
                      Lv.{pokemon.level} | {pokemon.exp}/{EXP_PER_LEVEL} EXP
                    </div>

                    {/* HP Bar */}
                    <div style={{
                      width: '100%',
                      height: 8,
                      background: THEME.border.subtle,
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginTop: 8,
                    }}>
                      <div style={{
                        width: `${hpPercent}%`,
                        height: '100%',
                        background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                        borderRadius: 4,
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 4 }}>
                      {pokemon.currentHp}/{pokemon.maxHp} HP
                    </div>

                    {/* Preview */}
                    {!isDead && (
                      <div style={{
                        marginTop: 12,
                        padding: 10,
                        background: config.bgColor,
                        borderRadius: 10,
                        fontSize: 13,
                      }}>
                        <div style={{ color: config.color, fontWeight: 'bold', marginBottom: 4 }}>
                          After:
                        </div>
                        {eventType === 'train' && (
                          <>
                            <div style={{ color: THEME.text.primary }}>
                              {pokemon.currentHp + TRAIN_HP_BOOST}/{pokemon.maxHp + TRAIN_HP_BOOST} HP
                            </div>
                            <div style={{ color: config.color, fontSize: 12, marginTop: 2 }}>
                              +{TRAIN_HP_BOOST} Max HP
                            </div>
                          </>
                        )}
                        {eventType === 'meditate' && (
                          <>
                            <div style={{ color: THEME.text.primary }}>
                              {pokemon.exp + MEDITATE_EXP}/{EXP_PER_LEVEL} EXP
                            </div>
                            <div style={{ color: config.color, fontSize: 12, marginTop: 2 }}>
                              +{MEDITATE_EXP} EXP
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {isDead && (
                      <div style={{
                        marginTop: 12,
                        padding: 10,
                        background: '#ef444422',
                        borderRadius: 10,
                        fontSize: 13,
                        color: '#ef4444',
                        fontWeight: 'bold',
                      }}>
                        FAINTED
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ color: THEME.text.tertiary, fontSize: 13 }}>
              Click a Pokemon to apply
            </div>
          </>
        )}

        {/* Forget mode - card selection per Pokemon */}
        {eventType === 'forget' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 900,
            gap: 20,
          }}>
            {run.party.map((pokemon, pokemonIndex) => {
              const basePokemon = getPokemon(pokemon.formId);
              const selectedCardIndex = forgetSelections.get(pokemonIndex);

              return (
                <div key={pokemonIndex} style={{
                  background: '#1e1e2e',
                  borderRadius: 12,
                  padding: 16,
                  border: selectedCardIndex !== undefined ? '2px solid #f43f5e' : '1px solid ' + THEME.border.subtle,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}>
                    <img
                      src={getSpriteUrl(pokemon.formId)}
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
                        {pokemon.deck.length} cards {selectedCardIndex !== undefined ? '- 1 selected' : '- select a card to forget'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {pokemon.deck.map((cardId, cardIndex) => {
                      const card = getMove(cardId);
                      const isSelected = selectedCardIndex === cardIndex;

                      return (
                        <button
                          key={`${cardId}-${cardIndex}`}
                          onClick={() => handleForgetCardSelect(pokemonIndex, cardIndex)}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: isSelected ? '2px solid #f43f5e' : '1px solid ' + THEME.border.medium,
                            background: isSelected ? '#f43f5e22' : '#2a2a3e',
                            color: isSelected ? '#f43f5e' : THEME.text.primary,
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>{card.name}</div>
                          <div style={{ fontSize: 10, color: THEME.text.tertiary }}>
                            {card.cost} cost
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
            }}>
              <button
                onClick={handleForgetConfirm}
                disabled={forgetSelections.size === 0}
                style={{
                  padding: '12px 32px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  borderRadius: 8,
                  border: 'none',
                  background: forgetSelections.size > 0 ? '#f43f5e' : '#333',
                  color: forgetSelections.size > 0 ? '#fff' : '#666',
                  cursor: forgetSelections.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Forget {forgetSelections.size} Card{forgetSelections.size !== 1 ? 's' : ''}
              </button>
              <div style={{ color: THEME.text.tertiary, fontSize: 12 }}>
                Select one card from each Pokemon (optional)
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
