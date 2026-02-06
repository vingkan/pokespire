import { useState, useMemo } from 'react';
import type { RunState } from '../../run/types';
import { getPokemon, getMove, MOVES } from '../../data/loaders';
import { createRng, sampleCards } from '../../run/rng';
import { CardPreview } from '../components/CardPreview';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';

interface Props {
  run: RunState;
  onDraftComplete: (drafts: Map<number, string | null>) => void;
  onRestart: () => void;
}

const CARDS_PER_DRAFT = 3;

export function CardDraftScreen({ run, onDraftComplete, onRestart }: Props) {
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

  // Generate card options using seeded RNG
  // Seed is based on run seed + node id hash + pokemon index for determinism
  const cardOptions = useMemo(() => {
    if (currentPokemon === null) return [];

    // Hash the node ID to get a numeric seed component
    const nodeHash = run.currentNodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const draftSeed = run.seed + nodeHash * 1000 + currentPokemonIndex * 100;
    const rng = createRng(draftSeed);

    // Get all available card IDs
    const allCardIds = Object.keys(MOVES);

    return sampleCards(rng, allCardIds, CARDS_PER_DRAFT);
  }, [run.seed, run.currentNodeId, currentPokemonIndex, currentPokemon]);

  const handleSelectCard = (cardId: string | null) => {
    const newDrafts = new Map(drafts);
    newDrafts.set(currentPokemonIndex, cardId);
    setDrafts(newDrafts);

    // Move to next Pokemon or complete
    if (currentDraftIndex + 1 >= alivePokemonIndices.length) {
      // All Pokemon have drafted, complete
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
        Card Draft
      </h1>

      {/* Progress */}
      <div style={{ fontSize: 15, color: '#94a3b8' }}>
        Pokemon {currentDraftIndex + 1} of {alivePokemonIndices.length}
      </div>

      {/* Current Pokemon (clickable to view details) */}
      <div
        onClick={() => setDetailsPokemonIndex(currentPokemonIndex)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: 16,
          background: '#1e1e2e',
          borderRadius: 12,
          border: '2px solid #facc15',
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${currentPokemon.formId}.gif`}
          alt={basePokemon.name}
          style={{ width: 80, height: 80, imageRendering: 'pixelated', objectFit: 'contain' }}
        />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{basePokemon.name}</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          Current deck size: {currentPokemon.deck.length} cards
        </div>
        <div style={{ fontSize: 11, color: '#60a5fa' }}>
          Click to view details
        </div>
      </div>

      <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center' }}>
        Choose a card to add to {basePokemon.name}'s deck, or skip
      </p>

      {/* Card Options */}
      <div style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingBottom: 12,
      }}>
        {cardOptions.map(cardId => {
          const card = getMove(cardId);
          return (
            <CardPreview
              key={cardId}
              card={card}
              onClick={() => handleSelectCard(cardId)}
            />
          );
        })}
      </div>

      {/* Skip Button */}
      <button
        onClick={() => handleSelectCard(null)}
        style={{
          padding: '12px 32px',
          fontSize: 15,
          fontWeight: 'bold',
          borderRadius: 8,
          border: '2px solid #555',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Skip (Add No Card)
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
    </div>
  );
}
