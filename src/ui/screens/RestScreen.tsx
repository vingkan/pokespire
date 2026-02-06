import { useState } from 'react';
import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { EXP_PER_LEVEL } from '../../run/state';

interface Props {
  run: RunState;
  onHeal: (pokemonIndex: number) => void;
  onTrain: (pokemonIndex: number) => void;
  onMeditate: (pokemonIndex: number) => void;
  onRestart: () => void;
}

type RestChoice = 'heal' | 'train' | 'meditate';

const HEAL_PERCENT = 0.3; // 30%
const TRAIN_HP_BOOST = 5;
const MEDITATE_EXP = 1;

// Helper Pokemon sprites for each option
const HELPER_SPRITES = {
  heal: 'chansey',
  train: 'machoke',
  meditate: 'medicham',
};

// Option configurations
const OPTIONS: Record<RestChoice, {
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  icon: string;
  helper: string;
  helperQuote: string;
}> = {
  heal: {
    title: 'Rest',
    subtitle: 'Heal 30% HP',
    color: '#4ade80',
    bgColor: '#4ade8022',
    icon: '+30%',
    helper: HELPER_SPRITES.heal,
    helperQuote: '"Let me take care of you!"',
  },
  meditate: {
    title: 'Meditate',
    subtitle: '+1 EXP',
    color: '#a855f7',
    bgColor: '#a855f722',
    icon: '+1',
    helper: HELPER_SPRITES.meditate,
    helperQuote: '"Clear your mind..."',
  },
  train: {
    title: 'Train',
    subtitle: '+5 Max HP',
    color: '#60a5fa',
    bgColor: '#60a5fa22',
    icon: '+5',
    helper: HELPER_SPRITES.train,
    helperQuote: '"No pain, no gain!"',
  },
};

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

export function RestScreen({ run, onHeal, onTrain, onMeditate, onRestart }: Props) {
  const [selectedChoice, setSelectedChoice] = useState<RestChoice>('heal');

  const handleSelectPokemon = (pokemonIndex: number) => {
    if (selectedChoice === 'heal') {
      onHeal(pokemonIndex);
    } else if (selectedChoice === 'train') {
      onTrain(pokemonIndex);
    } else {
      onMeditate(pokemonIndex);
    }
  };

  const currentOption = OPTIONS[selectedChoice];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: 32,
      color: '#e2e8f0',
      minHeight: '100vh',
      background: '#0f0f17',
      position: 'relative',
    }}>
      {/* Reset button */}
      <button
        onClick={onRestart}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 16px',
          fontSize: 13,
          borderRadius: 6,
          border: '1px solid #555',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
        }}
      >
        Main Menu
      </button>

      <h1 style={{ fontSize: 30, margin: 0, color: '#facc15' }}>
        Pokemon Center
      </h1>

      <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', maxWidth: 500 }}>
        Your Pokemon can rest here. Choose how to spend your time.
      </p>

      {/* Choice Selection with Helper Sprites */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 8,
      }}>
        {(Object.keys(OPTIONS) as RestChoice[]).map((choice) => {
          const opt = OPTIONS[choice];
          const isSelected = selectedChoice === choice;

          return (
            <button
              key={choice}
              onClick={() => setSelectedChoice(choice)}
              style={{
                padding: '16px 20px',
                fontSize: 16,
                fontWeight: 'bold',
                borderRadius: 16,
                border: isSelected ? `3px solid ${opt.color}` : '3px solid #333',
                background: isSelected ? opt.bgColor : '#1e1e2e',
                color: isSelected ? opt.color : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isSelected ? `0 0 20px ${opt.color}44` : 'none',
              }}
            >
              {/* Helper Pokemon sprite */}
              <img
                src={getSpriteUrl(opt.helper)}
                alt={opt.helper}
                style={{
                  width: 64,
                  height: 64,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  filter: isSelected ? 'none' : 'grayscale(60%) brightness(0.7)',
                  transition: 'filter 0.2s',
                }}
              />
              <div style={{ fontSize: 28, fontWeight: 'bold' }}>{opt.icon}</div>
              <div style={{ fontSize: 15 }}>{opt.title}</div>
              <div style={{ fontSize: 12, color: isSelected ? opt.color : '#64748b', opacity: 0.8 }}>
                {opt.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper quote */}
      <div style={{
        padding: '12px 24px',
        background: currentOption.bgColor,
        borderRadius: 12,
        border: `2px solid ${currentOption.color}44`,
        color: currentOption.color,
        fontStyle: 'italic',
        fontSize: 15,
      }}>
        {currentOption.helperQuote}
      </div>

      {/* Pokemon Selection */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 8,
      }}>
        {run.party.map((pokemon, i) => {
          const basePokemon = getPokemon(pokemon.formId);
          const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
          const isDead = pokemon.currentHp <= 0;

          // Calculate preview values for each choice
          const healAmount = Math.floor(pokemon.maxHp * HEAL_PERCENT);
          const previewHealHp = Math.min(pokemon.currentHp + healAmount, pokemon.maxHp);
          const actualHeal = previewHealHp - pokemon.currentHp;

          const previewMaxHp = pokemon.maxHp + TRAIN_HP_BOOST;
          const previewTrainHp = pokemon.currentHp + TRAIN_HP_BOOST;

          const previewExp = pokemon.exp + MEDITATE_EXP;

          return (
            <div
              key={i}
              onClick={() => !isDead && handleSelectPokemon(i)}
              style={{
                width: 170,
                padding: 16,
                borderRadius: 16,
                border: isDead
                  ? '3px solid #333'
                  : `3px solid ${currentOption.color}`,
                background: isDead ? '#1a1a24' : '#1e1e2e',
                cursor: isDead ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: isDead ? 0.4 : 1,
                transition: 'all 0.2s',
                boxShadow: isDead ? 'none' : `0 0 0 0 ${currentOption.color}`,
              }}
              onMouseEnter={(e) => {
                if (!isDead) {
                  e.currentTarget.style.boxShadow = `0 0 16px ${currentOption.color}44`;
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

              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Lv.{pokemon.level} | {pokemon.exp}/{EXP_PER_LEVEL} EXP
              </div>

              {/* HP Bar */}
              <div style={{
                width: '100%',
                height: 8,
                background: '#333',
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

              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {pokemon.currentHp}/{pokemon.maxHp} HP
              </div>

              {/* Preview based on selected choice */}
              {!isDead && (
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  background: currentOption.bgColor,
                  borderRadius: 10,
                  fontSize: 13,
                }}>
                  <div style={{
                    color: currentOption.color,
                    fontWeight: 'bold',
                    marginBottom: 4,
                  }}>
                    After {currentOption.title}:
                  </div>

                  {selectedChoice === 'heal' && (
                    <>
                      <div style={{ color: '#e2e8f0' }}>
                        {previewHealHp}/{pokemon.maxHp} HP
                      </div>
                      <div style={{ color: currentOption.color, fontSize: 12, marginTop: 2 }}>
                        {actualHeal > 0 ? `+${actualHeal} HP healed` : 'Already full!'}
                      </div>
                    </>
                  )}

                  {selectedChoice === 'train' && (
                    <>
                      <div style={{ color: '#e2e8f0' }}>
                        {previewTrainHp}/{previewMaxHp} HP
                      </div>
                      <div style={{ color: currentOption.color, fontSize: 12, marginTop: 2 }}>
                        +{TRAIN_HP_BOOST} Max HP
                      </div>
                    </>
                  )}

                  {selectedChoice === 'meditate' && (
                    <>
                      <div style={{ color: '#e2e8f0' }}>
                        {previewExp}/{EXP_PER_LEVEL} EXP
                      </div>
                      <div style={{ color: currentOption.color, fontSize: 12, marginTop: 2 }}>
                        +{MEDITATE_EXP} EXP gained
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

      {/* Click hint */}
      <div style={{
        color: '#64748b',
        fontSize: 13,
        marginTop: 8,
      }}>
        Click a Pokemon to apply {currentOption.title.toLowerCase()}
      </div>
    </div>
  );
}
