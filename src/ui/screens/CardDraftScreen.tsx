import { useState, useMemo } from 'react';
import type { RunState } from '../../run/types';
import { getPokemon, getMove } from '../../data/loaders';
import { createRng } from '../../run/rng';
import { sampleDraftCards } from '../../run/draft';
import { CardPreview } from '../components/CardPreview';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';
import { AmbientBackground } from '../components/AmbientBackground';
import { Flourish } from '../components/Flourish';
import { THEME } from '../theme';
import { GoldCoin } from '../components/GoldCoin';

interface Props {
  run: RunState;
  onDraftComplete: (drafts: Map<number, string | null>) => void;
  onRestart: () => void;
  goldEarned?: number;
}

const CARDS_PER_DRAFT = 3;

export function CardDraftScreen({ run, onDraftComplete, onRestart, goldEarned }: Props) {
  // Track which Pokemon we're drafting for (index into party)
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  // Track drafted cards: Map<pokemonIndex, cardId | null (skip)>
  const [drafts, setDrafts] = useState<Map<number, string | null>>(new Map());
  // Track which Pokemon's details panel is open (null = none)
  const [detailsPokemonIndex, setDetailsPokemonIndex] = useState<number | null>(null);

  // Get alive party members to draft for
  const alivePokemonIndices = run.party
    .map((p, i) => ({ index: i, pokemon: p }))
    .filter(({ pokemon }) => pokemon.currentHp > 0)
    .map(({ index }) => index);

  // Get current Pokemon being drafted for
  const currentPokemonIndex = alivePokemonIndices[currentDraftIndex];
  const currentPokemon = currentPokemonIndex !== undefined ? run.party[currentPokemonIndex] : null;

  // Generate card options using seeded RNG with type-based pools
  const cardOptions = useMemo(() => {
    if (currentPokemon === null) return [];

    const nodeHash = run.currentNodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const draftSeed = run.seed + nodeHash * 1000 + currentPokemonIndex * 100;
    const rng = createRng(draftSeed);

    const pokemonData = getPokemon(currentPokemon.formId);
    const types = pokemonData.types;

    return sampleDraftCards(rng, types, currentPokemon.level, CARDS_PER_DRAFT);
  }, [run.seed, run.currentNodeId, currentPokemonIndex, currentDraftIndex, currentPokemon]);

  const handleSelectCard = (cardId: string | null) => {
    const newDrafts = new Map(drafts);
    newDrafts.set(currentPokemonIndex, cardId);
    setDrafts(newDrafts);

    if (currentDraftIndex + 1 >= alivePokemonIndices.length) {
      onDraftComplete(newDrafts);
    } else {
      setCurrentDraftIndex(currentDraftIndex + 1);
    }
  };

  // If no alive Pokemon, skip drafting entirely
  if (alivePokemonIndices.length === 0 || currentPokemon === null) {
    onDraftComplete(new Map());
    return null;
  }

  const basePokemon = getPokemon(currentPokemon.formId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: '40px 32px 48px',
      color: THEME.text.primary,
      minHeight: '100dvh',
      overflowY: 'auto',
      position: 'relative',
    }}>
      <AmbientBackground tint="rgba(250, 204, 21, 0.015)" />

      {/* Main Menu button */}
      <button
        onClick={onRestart}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          fontSize: 13,
          ...THEME.button.secondary,
          zIndex: 2,
        }}
      >
        Main Menu
      </button>

      {/* ── Header ── */}
      <div className="draft-header" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        zIndex: 1,
      }}>
        <h1 style={{
          fontSize: 28,
          margin: 0,
          color: THEME.accent,
          ...THEME.heading,
          letterSpacing: '0.15em',
        }}>
          Card Draft
        </h1>
        <Flourish variant="heading" width={100} color={THEME.text.tertiary} />

        {/* Gold earned banner */}
        {goldEarned && goldEarned > 0 && (
          <div className="draft-gold" style={{
            padding: '4px 16px',
            borderRadius: 6,
            background: 'rgba(250, 204, 21, 0.08)',
            border: `1px solid rgba(250, 204, 21, 0.2)`,
            color: THEME.accent,
            fontSize: 13,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}>
            +{goldEarned}<GoldCoin size={12} /> earned
          </div>
        )}
      </div>

      {/* ── Progress dots ── */}
      <div className="draft-progress" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        zIndex: 1,
      }}>
        {alivePokemonIndices.map((_, i) => {
          const isDone = i < currentDraftIndex;
          const isCurrent = i === currentDraftIndex;
          return (
            <div key={i} style={{
              width: isCurrent ? 10 : 8,
              height: isCurrent ? 10 : 8,
              borderRadius: '50%',
              background: isDone ? THEME.accent
                : isCurrent ? THEME.text.primary
                : THEME.border.medium,
              transition: 'all 0.2s',
              boxShadow: isCurrent ? `0 0 8px ${THEME.text.primary}40` : 'none',
            }} />
          );
        })}
      </div>

      {/* ── Current Pokemon ── */}
      <div
        key={`pokemon-${currentDraftIndex}`}
        className="draft-pokemon"
        onClick={() => setDetailsPokemonIndex(currentPokemonIndex)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '16px 24px',
          background: THEME.chrome.backdrop,
          borderRadius: 12,
          border: `1px solid ${THEME.border.medium}`,
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          position: 'relative',
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = THEME.accent;
          e.currentTarget.style.boxShadow = `0 0 12px rgba(250, 204, 21, 0.1)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = THEME.border.medium;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${currentPokemon.formId}.gif`}
          alt={basePokemon.name}
          style={{
            width: 72,
            height: 72,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.15))',
          }}
        />
        <div style={{
          fontSize: 18,
          fontWeight: 'bold',
          ...THEME.heading,
          letterSpacing: '0.1em',
        }}>
          {basePokemon.name}
        </div>
        <div style={{ fontSize: 12, color: THEME.text.tertiary }}>
          {currentPokemon.deck.length} cards in deck
        </div>
        <div style={{ fontSize: 10, color: THEME.status.energy, opacity: 0.7 }}>
          Click to view details
        </div>
      </div>

      {/* ── Prompt ── */}
      <p className="draft-prompt" style={{
        color: THEME.text.secondary,
        margin: 0,
        textAlign: 'center',
        fontSize: 15,
        position: 'relative',
        zIndex: 1,
      }}>
        Choose a card to add to {basePokemon.name}'s deck
      </p>

      {/* ── Card Options ── */}
      <div
        key={`draft-options-${currentDraftIndex}`}
        className="draft-cards"
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          justifyContent: 'center',
          paddingBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {cardOptions.slice(0, CARDS_PER_DRAFT).map((cardId, idx) => {
          const card = getMove(cardId);
          return (
            <div
              key={`${currentDraftIndex}-${cardId}-${idx}`}
              className="draft-card-option"
              style={{ animationDelay: `${idx * 80 + 100}ms` }}
            >
              <CardPreview
                card={card}
                onClick={() => handleSelectCard(cardId)}
              />
            </div>
          );
        })}
      </div>

      {/* ── Skip Button ── */}
      <button
        className="draft-skip-btn"
        onClick={() => handleSelectCard(null)}
        style={{
          padding: '10px 28px',
          fontSize: 14,
          ...THEME.button.secondary,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Skip
      </button>

      {/* Pokemon Details Panel */}
      {detailsPokemonIndex !== null && (
        <PokemonDetailsPanel
          pokemon={run.party[detailsPokemonIndex]}
          pokemonIndex={detailsPokemonIndex}
          onClose={() => setDetailsPokemonIndex(null)}
          readOnly={true}
        />
      )}

      {/* Animations */}
      <style>{`
        .draft-header {
          animation: draftFadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
        .draft-gold {
          animation: draftFadeIn 0.3s ease-out 0.2s forwards;
          opacity: 0;
        }
        .draft-progress {
          animation: draftFadeIn 0.3s ease-out 0.15s forwards;
          opacity: 0;
        }
        .draft-pokemon {
          animation: draftFadeIn 0.4s ease-out 0.1s forwards;
          opacity: 0;
        }
        .draft-prompt {
          animation: draftFadeIn 0.3s ease-out 0.2s forwards;
          opacity: 0;
        }
        .draft-card-option {
          animation: draftCardIn 0.35s ease-out forwards;
          opacity: 0;
        }
        .draft-skip-btn {
          animation: draftFadeIn 0.3s ease-out 0.4s forwards;
          opacity: 0;
          transition: border-color 0.2s, color 0.2s;
        }
        .draft-skip-btn:hover {
          border-color: ${THEME.text.secondary} !important;
          color: ${THEME.text.primary} !important;
        }
        @keyframes draftFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes draftCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
