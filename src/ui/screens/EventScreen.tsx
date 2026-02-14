import { useState, useCallback } from 'react';
import type { RunState } from '../../run/types';
import type { EventEffect } from '../../data/events';
import { ALL_EVENTS, needsPokemonSelection } from '../../data/events';
import { resolveOutcome, processEffects } from '../../run/events';
import type { PendingInteractive } from '../../run/events';
import { getPokemon, getMove } from '../../data/loaders';
import { removeCardsFromDeck, addCardToDeck, createRecruitPokemon, getRecruitLevel, recruitToRoster } from '../../run/state';
import { buildTypePool } from '../../run/draft';
import { createRng, sampleCards } from '../../run/rng';
import { SHOP_ITEMS } from '../../data/shop';
import { ScreenShell } from '../components/ScreenShell';
import { CardPreview } from '../components/CardPreview';
import { DexFrame } from '../components/DexFrame';
import { EventIcon } from '../components/EventIcon';
import { THEME } from '../theme';
import type { MoveDefinition } from '../../engine/types';

// ============================================================
// Props
// ============================================================

interface Props {
  run: RunState;
  eventId: string;
  onComplete: (newRun: RunState) => void;
  onRestart: () => void;
}

// ============================================================
// Phase State Machine
// ============================================================

type Phase =
  | { type: 'narrative' }
  | { type: 'pokemon_select'; effects: EventEffect[]; outcomeDesc: string }
  | { type: 'outcome'; description: string; workingRun: RunState; pendingInteractive: PendingInteractive[] }
  | { type: 'interactive'; workingRun: RunState; queue: PendingInteractive[]; currentIndex: number }
  | { type: 'done'; workingRun: RunState };

// ============================================================
// Helpers
// ============================================================

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

function getEventColor(act: number): string {
  if (act === 1) return '#14b8a6';
  if (act === 2) return '#7c3aed';
  return '#dc2626';
}

/** Diamond marker used for choice rows and section headings */
function DiamondMarker({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      background: color,
      transform: 'rotate(45deg)',
      flexShrink: 0,
    }} />
  );
}

/** Section heading with diamond + uppercase label */
function SectionHeading({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    }}>
      <DiamondMarker color={color} />
      <div style={{
        fontSize: 9,
        color: THEME.text.tertiary,
        ...THEME.heading,
        letterSpacing: '0.12em',
      }}>
        {children}
      </div>
    </div>
  );
}

/** Navy gradient background used inside DexFrame panels */
const NAVY_BG = 'linear-gradient(180deg, rgba(14,14,24,0.85) 0%, rgba(18,18,30,0.75) 100%)';

// ============================================================
// Component
// ============================================================

export function EventScreen({ run, eventId, onComplete, onRestart }: Props) {
  const event = ALL_EVENTS[eventId];
  const [phase, setPhase] = useState<Phase>({ type: 'narrative' });

  // Card removal state
  const [removalSelections, setRemovalSelections] = useState<Map<number, number[]>>(new Map());

  // Epic draft state
  const [epicOptions, setEpicOptions] = useState<string[]>([]);
  const [epicPicksRemaining, setEpicPicksRemaining] = useState(0);

  // Shop draft state
  const [shopOptions, setShopOptions] = useState<string[]>([]);

  // Draft card selection (shared by epic/shop drafts)
  const [draftSelectedCard, setDraftSelectedCard] = useState<string | null>(null);

  // Recruit state
  const [recruitPokemonId, setRecruitPokemonId] = useState<string | null>(null);

  // Card clone state
  const [clonePhase, setClonePhase] = useState<'pick_pokemon' | 'pick_card' | 'result'>('pick_pokemon');
  const [clonePokemonIndex, setClonePokemonIndex] = useState<number | null>(null);
  const [cloneResult, setCloneResult] = useState<string>('');

  if (!event) {
    return (
      <ScreenShell>
        <div style={{ padding: 32, color: THEME.text.primary, textAlign: 'center' }}>
          <h1>Unknown Event: {eventId}</h1>
          <button onClick={onRestart} style={THEME.button.secondary}>Main Menu</button>
        </div>
      </ScreenShell>
    );
  }

  const color = getEventColor(event.act);

  // ============================================================
  // Choice Handler
  // ============================================================

  const handleChoice = useCallback((choiceId: string) => {
    const choice = event.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const { effects, description } = resolveOutcome(choice.outcome, run.seed, run.currentNodeId);

    // Check if any effects need a pokemon selection
    if (needsPokemonSelection(effects)) {
      setPhase({ type: 'pokemon_select', effects, outcomeDesc: description });
      return;
    }

    // Process effects immediately
    const result = processEffects(run, effects, undefined, run.seed);
    if (result.pendingInteractive.length > 0) {
      setPhase({
        type: 'outcome',
        description,
        workingRun: result.run,
        pendingInteractive: result.pendingInteractive,
      });
    } else {
      setPhase({ type: 'outcome', description, workingRun: result.run, pendingInteractive: [] });
    }
  }, [event, run]);

  // ============================================================
  // Pokemon Selection Handler
  // ============================================================

  const handlePokemonSelect = useCallback((pokemonIndex: number) => {
    if (phase.type !== 'pokemon_select') return;

    const result = processEffects(run, phase.effects, pokemonIndex, run.seed);
    if (result.pendingInteractive.length > 0) {
      setPhase({
        type: 'outcome',
        description: phase.outcomeDesc,
        workingRun: result.run,
        pendingInteractive: result.pendingInteractive,
      });
    } else {
      setPhase({
        type: 'outcome',
        description: phase.outcomeDesc,
        workingRun: result.run,
        pendingInteractive: [],
      });
    }
  }, [phase, run]);

  // ============================================================
  // Outcome → Interactive / Done
  // ============================================================

  const handleOutcomeContinue = useCallback(() => {
    if (phase.type !== 'outcome') return;

    if (phase.pendingInteractive.length > 0) {
      // Start processing interactive effects
      const firstInteractive = phase.pendingInteractive[0];
      startInteractiveEffect(phase.workingRun, firstInteractive, phase.pendingInteractive, 0);
    } else {
      // No interactive effects — skip the done phase and complete immediately
      onComplete(phase.workingRun);
    }
  }, [phase]);

  // ============================================================
  // Interactive Effect Processing
  // ============================================================

  const startInteractiveEffect = useCallback((workingRun: RunState, current: PendingInteractive, queue: PendingInteractive[], index: number) => {
    const effect = current.effect;

    // Reset shared draft selection on every transition
    setDraftSelectedCard(null);

    if (effect.type === 'epicDraft') {
      // Generate epic cards
      const rng = createRng(workingRun.seed + 88888 + index * 100);
      const allTypes = workingRun.party.flatMap(p => {
        const data = getPokemon(p.formId);
        return data.types;
      });
      const uniqueTypes = [...new Set(allTypes)];
      const pool = buildTypePool(uniqueTypes);
      const epics = pool.filter(c => c.rarity === 'epic');
      const options = sampleCards(rng, epics.map(c => c.id), Math.min(3, epics.length));
      setEpicOptions(options);
      setEpicPicksRemaining(effect.picks);
    } else if (effect.type === 'shopDraft') {
      // Show 3 random shop items
      const rng = createRng(workingRun.seed + 99999 + index * 100);
      const items = sampleCards(rng, SHOP_ITEMS.map(i => i.moveId), 3);
      setShopOptions(items);
    } else if (effect.type === 'cardClone') {
      setClonePhase('pick_pokemon');
      setClonePokemonIndex(null);
      setCloneResult('');
    } else if (effect.type === 'recruit') {
      // Pick the random Pokemon up front so we can show it
      const partyIds = workingRun.party.map(p => p.baseFormId);
      const benchIds = workingRun.bench.map(p => p.baseFormId);
      const graveyardIds = workingRun.graveyard.map(p => p.baseFormId);
      const excluded = new Set([...partyIds, ...benchIds, ...graveyardIds]);
      const RECRUIT_POOL = [
        'charmander', 'squirtle', 'bulbasaur', 'pikachu', 'pidgey', 'rattata',
        'ekans', 'tauros', 'snorlax', 'kangaskhan', 'nidoran-m', 'nidoran-f',
        'rhyhorn', 'drowzee', 'growlithe', 'voltorb', 'caterpie', 'weedle',
        'magikarp', 'lapras', 'magmar', 'electabuzz', 'dratini', 'spearow', 'sandshrew',
        'gastly', 'clefairy', 'machop', 'vulpix', 'oddish', 'meowth', 'jigglypuff', 'paras', 'zubat',
      ];
      const available = RECRUIT_POOL.filter(id => !excluded.has(id));
      if (available.length > 0) {
        const rng = createRng(workingRun.seed + 55555 + index * 100);
        setRecruitPokemonId(available[Math.floor(rng() * available.length)]);
      } else {
        setRecruitPokemonId(null);
      }
    } else if (effect.type === 'cardRemoval') {
      setRemovalSelections(new Map());
    }

    setPhase({ type: 'interactive', workingRun, queue, currentIndex: index });
  }, []);

  const advanceInteractive = useCallback((workingRun: RunState, queue: PendingInteractive[], currentIndex: number) => {
    if (currentIndex + 1 < queue.length) {
      const next = queue[currentIndex + 1];
      startInteractiveEffect(workingRun, next, queue, currentIndex + 1);
    } else {
      setPhase({ type: 'done', workingRun });
    }
  }, [startInteractiveEffect]);

  // ============================================================
  // Epic Draft Handler
  // ============================================================

  const handleEpicDraftPick = useCallback((cardId: string, pokemonIndex: number) => {
    if (phase.type !== 'interactive') return;
    let newRun = addCardToDeck(phase.workingRun, pokemonIndex, cardId);
    const remaining = epicPicksRemaining - 1;
    setEpicPicksRemaining(remaining);

    if (remaining <= 0) {
      advanceInteractive(newRun, phase.queue, phase.currentIndex);
    } else {
      // Remove picked card from options
      setEpicOptions(prev => prev.filter(id => id !== cardId));
      setPhase({ ...phase, workingRun: newRun });
    }
  }, [phase, epicPicksRemaining, advanceInteractive]);

  // ============================================================
  // Shop Draft Handler
  // ============================================================

  const handleShopDraftPick = useCallback((moveId: string, pokemonIndex: number) => {
    if (phase.type !== 'interactive') return;
    const newRun = addCardToDeck(phase.workingRun, pokemonIndex, moveId);
    advanceInteractive(newRun, phase.queue, phase.currentIndex);
  }, [phase, advanceInteractive]);

  // ============================================================
  // Card Clone Handler
  // ============================================================

  const handleClonePokemonPick = useCallback((index: number) => {
    setClonePokemonIndex(index);
    setClonePhase('pick_card');
  }, []);

  const handleCloneCardPick = useCallback((cardIndex: number) => {
    if (phase.type !== 'interactive' || clonePokemonIndex === null) return;
    const pokemon = phase.workingRun.party[clonePokemonIndex];
    if (!pokemon) return;
    const cardId = pokemon.deck[cardIndex];

    // 50/50: clone or lose
    const rng = createRng(phase.workingRun.seed + 77777 + cardIndex);
    const roll = rng();

    let newRun: RunState;
    if (roll < 0.5) {
      // Clone — duplicate the card
      newRun = addCardToDeck(phase.workingRun, clonePokemonIndex, cardId);
      setCloneResult(`Success! ${getMove(cardId).name} was duplicated.`);
    } else {
      // Lose — remove the card
      newRun = removeCardsFromDeck(phase.workingRun, clonePokemonIndex, [cardIndex]);
      setCloneResult(`Failure! ${getMove(cardId).name} was destroyed.`);
    }

    setClonePhase('result');
    setPhase({ ...phase, workingRun: newRun });
  }, [phase, clonePokemonIndex]);

  const handleCloneDone = useCallback(() => {
    if (phase.type !== 'interactive') return;
    advanceInteractive(phase.workingRun, phase.queue, phase.currentIndex);
  }, [phase, advanceInteractive]);

  // ============================================================
  // Card Removal Handler
  // ============================================================

  const handleRemovalToggle = useCallback((pokemonIndex: number, cardIndex: number) => {
    if (phase.type !== 'interactive') return;
    const currentEffect = phase.queue[phase.currentIndex]?.effect;
    if (!currentEffect || currentEffect.type !== 'cardRemoval') return;

    const maxPerPokemon = currentEffect.count;

    setRemovalSelections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(pokemonIndex) ?? [];

      if (current.includes(cardIndex)) {
        // Deselect
        newMap.set(pokemonIndex, current.filter(i => i !== cardIndex));
        if (newMap.get(pokemonIndex)!.length === 0) newMap.delete(pokemonIndex);
      } else if (current.length < maxPerPokemon) {
        // Select
        newMap.set(pokemonIndex, [...current, cardIndex]);
      }

      return newMap;
    });
  }, [phase]);

  const handleRemovalConfirm = useCallback(() => {
    if (phase.type !== 'interactive') return;
    let newRun = phase.workingRun;

    removalSelections.forEach((cardIndices, pokemonIndex) => {
      newRun = removeCardsFromDeck(newRun, pokemonIndex, cardIndices);
    });

    advanceInteractive(newRun, phase.queue, phase.currentIndex);
  }, [phase, removalSelections, advanceInteractive]);

  // ============================================================
  // Done Handler
  // ============================================================

  const handleDone = useCallback(() => {
    if (phase.type !== 'done') return;
    onComplete(phase.workingRun);
  }, [phase, onComplete]);

  // ============================================================
  // Recruit Handler
  // ============================================================

  const handleRecruitAccept = useCallback(() => {
    if (phase.type !== 'interactive' || !recruitPokemonId) return;
    const level = getRecruitLevel(phase.workingRun);
    const newPokemon = createRecruitPokemon(recruitPokemonId, level);
    const newRun = recruitToRoster(phase.workingRun, newPokemon);
    advanceInteractive(newRun, phase.queue, phase.currentIndex);
  }, [phase, advanceInteractive, recruitPokemonId]);

  const handleRecruitSkip = useCallback(() => {
    if (phase.type !== 'interactive') return;
    advanceInteractive(phase.workingRun, phase.queue, phase.currentIndex);
  }, [phase, advanceInteractive]);

  // ============================================================
  // Render
  // ============================================================

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EventIcon eventId={eventId} color={color} size={28} />
        <h1 style={{
          fontSize: 24,
          margin: 0,
          color,
          letterSpacing: THEME.heading.letterSpacing,
          textTransform: THEME.heading.textTransform,
        }}>
          {event.title}
        </h1>
      </div>
      <button onClick={onRestart} style={{ ...THEME.button.secondary, padding: '6px 14px', fontSize: 12 }}>
        Main Menu
      </button>
    </div>
  );

  return (
    <ScreenShell header={header} ambient>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '24px 16px 48px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {/* Narrative Phase */}
        {phase.type === 'narrative' && (
          <>
            {/* Narrative dialogue box in DexFrame */}
            <div className="evt-fadein" style={{ width: '100%', maxWidth: 600 }}>
              <DexFrame>
                <div style={{
                  padding: '20px 28px',
                  background: NAVY_BG,
                  borderRadius: 2,
                  color: THEME.text.primary,
                  fontSize: 15,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  textAlign: 'center',
                }}>
                  {event.narrativeText}
                </div>
              </DexFrame>
            </div>

            {/* Choice buttons in a single DexFrame */}
            <div className="evt-fadein" style={{ width: '100%', maxWidth: 500, animationDelay: '0.1s' }}>
              <DexFrame>
                <div style={{ padding: '8px 0' }}>
                  {event.choices.map((choice, idx) => {
                    const isDisabled = choice.disabled?.(run) ?? false;
                    return (
                      <div key={choice.id}>
                        {idx > 0 && (
                          <div style={{
                            height: 1,
                            background: THEME.border.subtle,
                            margin: '0 16px',
                          }} />
                        )}
                        <div
                          className={isDisabled ? undefined : 'evt-choice'}
                          onClick={() => !isDisabled && handleChoice(choice.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '14px 20px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.4 : 1,
                            transition: 'background 0.15s',
                          }}
                        >
                          <div style={{ paddingTop: 5 }}>
                            <DiamondMarker color={isDisabled ? THEME.border.medium : color} size={6} />
                          </div>
                          <div>
                            <div style={{
                              fontSize: 15,
                              fontWeight: 'bold',
                              color: isDisabled ? THEME.text.tertiary : THEME.text.primary,
                            }}>
                              {choice.label}
                            </div>
                            {choice.flavorText && (
                              <div style={{
                                fontSize: 12,
                                color: THEME.text.secondary,
                                marginTop: 2,
                                paddingLeft: 1,
                              }}>
                                {choice.flavorText}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DexFrame>
            </div>
          </>
        )}

        {/* Pokemon Selection Phase */}
        {phase.type === 'pokemon_select' && (
          <>
            <SectionHeading color={color}>CHOOSE A POKEMON</SectionHeading>
            <PokemonPicker
              party={run.party}
              color={color}
              onSelect={handlePokemonSelect}
            />
          </>
        )}

        {/* Outcome Phase */}
        {phase.type === 'outcome' && (
          <>
            <div className="evt-fadein" style={{ width: '100%', maxWidth: 500 }}>
              <DexFrame>
                <div style={{
                  padding: '20px 28px',
                  background: NAVY_BG,
                  borderRadius: 2,
                  color: THEME.text.primary,
                  fontSize: 16,
                  textAlign: 'center',
                }}>
                  {phase.description}
                </div>
              </DexFrame>
            </div>
            <button
              onClick={handleOutcomeContinue}
              style={{
                ...THEME.button.primary,
                padding: '12px 32px',
                fontSize: 16,
              }}
            >
              Continue
            </button>
          </>
        )}

        {/* Interactive Phase */}
        {phase.type === 'interactive' && (() => {
          const current = phase.queue[phase.currentIndex];
          if (!current) return null;
          const effect = current.effect;

          // Card Removal
          if (effect.type === 'cardRemoval') {
            const isEachMode = effect.mode === 'each';
            return (
              <>
                <SectionHeading color={color}>
                  {isEachMode
                    ? `REMOVE UP TO ${effect.count} CARD${effect.count > 1 ? 'S' : ''} FROM EACH POKEMON`
                    : `REMOVE UP TO ${effect.count} CARD${effect.count > 1 ? 'S' : ''} FROM ONE POKEMON`}
                </SectionHeading>
                <CardRemovalUI
                  run={phase.workingRun}
                  mode={effect.mode}
                  selections={removalSelections}
                  onToggle={handleRemovalToggle}
                  color={color}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleRemovalConfirm}
                    style={{
                      ...THEME.button.primary,
                      padding: '12px 32px',
                      fontSize: 16,
                    }}
                  >
                    {removalSelections.size > 0 ? 'Confirm Removal' : 'Skip'}
                  </button>
                </div>
              </>
            );
          }

          // Epic Draft
          if (effect.type === 'epicDraft') {
            return (
              <>
                <SectionHeading color={color}>
                  {epicPicksRemaining > 1
                    ? `PICK AN EPIC CARD (${epicPicksRemaining} REMAINING)`
                    : 'PICK AN EPIC CARD'}
                </SectionHeading>
                <DraftUI
                  options={epicOptions}
                  party={phase.workingRun.party}
                  onPick={handleEpicDraftPick}
                  color={color}
                  selectedCard={draftSelectedCard}
                  onSelectCard={setDraftSelectedCard}
                />
              </>
            );
          }

          // Shop Draft
          if (effect.type === 'shopDraft') {
            return (
              <>
                <SectionHeading color={color}>PICK A FREE ITEM</SectionHeading>
                <DraftUI
                  options={shopOptions}
                  party={phase.workingRun.party}
                  onPick={handleShopDraftPick}
                  color={color}
                  selectedCard={draftSelectedCard}
                  onSelectCard={setDraftSelectedCard}
                />
              </>
            );
          }

          // Card Clone
          if (effect.type === 'cardClone') {
            return (
              <CardCloneUI
                run={phase.workingRun}
                clonePhase={clonePhase}
                clonePokemonIndex={clonePokemonIndex}
                cloneResult={cloneResult}
                onPickPokemon={handleClonePokemonPick}
                onPickCard={handleCloneCardPick}
                onDone={handleCloneDone}
                color={color}
              />
            );
          }

          // Recruit
          if (effect.type === 'recruit') {
            if (!recruitPokemonId) {
              return (
                <>
                  <SectionHeading color={color}>RECRUIT</SectionHeading>
                  <div style={{ fontSize: 14, color: THEME.text.secondary, textAlign: 'center' }}>
                    No Pokemon available to recruit.
                  </div>
                  <button
                    onClick={handleRecruitSkip}
                    style={{ ...THEME.button.primary, padding: '12px 32px', fontSize: 16 }}
                  >
                    Continue
                  </button>
                </>
              );
            }
            const recruitData = getPokemon(recruitPokemonId);
            return (
              <>
                <SectionHeading color={color}>A WILD POKEMON WANTS TO JOIN</SectionHeading>
                <div className="evt-fadein" style={{ maxWidth: 280 }}>
                  <DexFrame>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: 24,
                      background: NAVY_BG,
                      borderRadius: 2,
                    }}>
                      <img
                        src={getSpriteUrl(recruitPokemonId)}
                        alt={recruitData.name}
                        style={{
                          width: 96, height: 96,
                          imageRendering: 'pixelated',
                          objectFit: 'contain',
                        }}
                      />
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: THEME.text.primary }}>{recruitData.name}</div>
                      <div style={{ fontSize: 13, color: THEME.text.tertiary }}>
                        {recruitData.types.join(' / ')} — Lv.{getRecruitLevel(phase.workingRun)}
                      </div>
                    </div>
                  </DexFrame>
                </div>
                <button
                  onClick={handleRecruitAccept}
                  style={{ ...THEME.button.primary, padding: '12px 32px', fontSize: 16 }}
                >
                  Welcome Aboard
                </button>
              </>
            );
          }

          // Fallback: skip unknown interactive
          advanceInteractive(phase.workingRun, phase.queue, phase.currentIndex);
          return null;
        })()}

        {/* Done Phase */}
        {phase.type === 'done' && (
          <button
            onClick={handleDone}
            style={{
              ...THEME.button.primary,
              padding: '14px 40px',
              fontSize: 18,
            }}
          >
            Return to Map
          </button>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        .evt-choice {
          border-radius: 2px;
        }
        .evt-choice:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .evt-pokemon-card {
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .evt-pokemon-card:not(.evt-dead):hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .evt-card-btn {
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .evt-card-btn:hover {
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.08);
        }
        @keyframes evt-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .evt-fadein {
          animation: evt-fadein 0.3s ease-out both;
        }
      `}</style>
    </ScreenShell>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function PokemonPicker({ party, color, onSelect }: {
  party: RunState['party'];
  color: string;
  onSelect: (index: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      {party.map((pokemon, i) => {
        const basePokemon = getPokemon(pokemon.formId);
        const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
        const isDead = pokemon.knockedOut || pokemon.currentHp <= 0;

        return (
          <div
            key={i}
            className={`evt-pokemon-card${isDead ? ' evt-dead' : ''}`}
            onClick={() => !isDead && onSelect(i)}
            style={{
              width: 150,
              padding: 16,
              borderRadius: 2,
              border: `1px solid ${isDead ? THEME.border.subtle : THEME.border.medium}`,
              background: THEME.chrome.backdrop,
              cursor: isDead ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              opacity: isDead ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isDead) {
                e.currentTarget.style.borderColor = color;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDead) {
                e.currentTarget.style.borderColor = THEME.border.medium;
              }
            }}
          >
            <img
              src={getSpriteUrl(pokemon.formId)}
              alt={basePokemon.name}
              style={{
                width: 64, height: 64,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                filter: isDead ? 'grayscale(100%)' : 'none',
              }}
            />
            <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4, color: THEME.text.primary }}>
              {basePokemon.name}
            </div>
            <div style={{
              width: '100%', height: 6, background: THEME.border.subtle,
              borderRadius: 3, overflow: 'hidden', marginTop: 8,
            }}>
              <div style={{
                width: `${hpPercent}%`, height: '100%',
                background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                borderRadius: 3,
              }} />
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
              {pokemon.currentHp}/{pokemon.maxHp} HP
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DraftUI({ options, party, onPick, color, selectedCard, onSelectCard }: {
  options: string[];
  party: RunState['party'];
  onPick: (cardId: string, pokemonIndex: number) => void;
  color: string;
  selectedCard: string | null;
  onSelectCard: (cardId: string | null) => void;
}) {
  if (selectedCard) {
    // Pick which Pokemon gets the card
    return (
      <>
        <div style={{ fontSize: 14, color: THEME.text.secondary, textAlign: 'center' }}>
          Who receives <strong style={{ color }}>{getMove(selectedCard).name}</strong>?
        </div>
        <PokemonPicker
          party={party}
          color={color}
          onSelect={(idx) => onPick(selectedCard, idx)}
        />
        <button
          onClick={() => onSelectCard(null)}
          style={{ ...THEME.button.secondary, padding: '8px 20px', fontSize: 13 }}
        >
          Back
        </button>
      </>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      {options.map((cardId, idx) => {
        let card: MoveDefinition;
        try {
          card = getMove(cardId);
        } catch {
          return null;
        }
        return (
          <CardPreview
            key={`${cardId}-${idx}`}
            card={card}
            onClick={() => onSelectCard(cardId)}
          />
        );
      })}
    </div>
  );
}

function CardRemovalUI({ run, mode, selections, onToggle, color }: {
  run: RunState;
  mode: 'one' | 'each';
  selections: Map<number, number[]>;
  onToggle: (pokemonIndex: number, cardIndex: number) => void;
  color: string;
}) {
  // In 'one' mode, only allow selection from one Pokemon
  const activePokemonIndex = mode === 'one' && selections.size > 0
    ? selections.keys().next().value
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      {run.party.map((pokemon, pokemonIndex) => {
        if (pokemon.knockedOut || pokemon.currentHp <= 0) return null;
        const basePokemon = getPokemon(pokemon.formId);
        const selected = selections.get(pokemonIndex) ?? [];
        const isLocked = mode === 'one' && activePokemonIndex !== undefined && activePokemonIndex !== pokemonIndex;

        return (
          <div key={pokemonIndex} style={{
            background: THEME.chrome.backdrop,
            borderRadius: 2,
            padding: 16,
            borderLeft: selected.length > 0 ? `3px solid ${color}` : `3px solid transparent`,
            border: `1px solid ${THEME.border.subtle}`,
            borderLeftWidth: 3,
            borderLeftColor: selected.length > 0 ? color : 'transparent',
            opacity: isLocked ? 0.4 : 1,
            transition: 'border-color 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <img
                src={getSpriteUrl(pokemon.formId)}
                alt={basePokemon.name}
                style={{ width: 40, height: 40, imageRendering: 'pixelated', objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text.primary }}>{basePokemon.name}</div>
                <div style={{ fontSize: 12, color: THEME.text.tertiary }}>
                  {pokemon.deck.length} cards {selected.length > 0 ? `- ${selected.length} selected` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pokemon.deck.map((cardId, cardIndex) => {
                const card = getMove(cardId);
                const isSelected = selected.includes(cardIndex);
                return (
                  <button
                    key={`${cardId}-${cardIndex}`}
                    className="evt-card-btn"
                    onClick={() => !isLocked && onToggle(pokemonIndex, cardIndex)}
                    disabled={isLocked}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      borderRadius: 2,
                      border: isSelected ? `1px solid ${color}` : `1px solid ${THEME.border.medium}`,
                      background: isSelected ? `${color}22` : THEME.bg.elevated,
                      color: isSelected ? color : THEME.text.primary,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{card.name}</div>
                    <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{card.cost} cost</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CardCloneUI({ run, clonePhase, clonePokemonIndex, cloneResult, onPickPokemon, onPickCard, onDone, color }: {
  run: RunState;
  clonePhase: 'pick_pokemon' | 'pick_card' | 'result';
  clonePokemonIndex: number | null;
  cloneResult: string;
  onPickPokemon: (index: number) => void;
  onPickCard: (cardIndex: number) => void;
  onDone: () => void;
  color: string;
}) {
  if (clonePhase === 'pick_pokemon') {
    return (
      <>
        <SectionHeading color={color}>PICK A POKEMON TO CLONE FROM (50/50 CHANCE)</SectionHeading>
        <PokemonPicker party={run.party} color={color} onSelect={onPickPokemon} />
      </>
    );
  }

  if (clonePhase === 'pick_card' && clonePokemonIndex !== null) {
    const pokemon = run.party[clonePokemonIndex];
    if (!pokemon) return null;
    const basePokemon = getPokemon(pokemon.formId);

    return (
      <>
        <SectionHeading color={color}>PICK A CARD FROM {basePokemon.name.toUpperCase()}</SectionHeading>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {pokemon.deck.map((cardId, cardIndex) => {
            const card = getMove(cardId);
            return (
              <button
                key={`${cardId}-${cardIndex}`}
                className="evt-card-btn"
                onClick={() => onPickCard(cardIndex)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 2,
                  border: `1px solid ${THEME.border.medium}`,
                  background: THEME.chrome.backdrop,
                  color: THEME.text.primary,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = THEME.border.medium;
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{card.name}</div>
                <div style={{ fontSize: 11, color: THEME.text.tertiary }}>{card.cost} cost</div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (clonePhase === 'result') {
    const isSuccess = cloneResult.startsWith('Success');
    const accentColor = isSuccess ? '#22c55e' : '#ef4444';
    return (
      <>
        <div className="evt-fadein" style={{
          padding: '16px 24px',
          borderRadius: 2,
          background: THEME.chrome.backdrop,
          borderLeft: `3px solid ${accentColor}`,
          color: accentColor,
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          {cloneResult}
        </div>
        <button
          onClick={onDone}
          style={{ ...THEME.button.primary, padding: '12px 32px', fontSize: 16 }}
        >
          Continue
        </button>
      </>
    );
  }

  return null;
}
