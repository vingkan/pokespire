import { useState, useCallback, useEffect, useRef } from 'react';
import type { PokemonData, Position, Combatant } from '../../engine/types';
import { useBattle } from '../hooks/useBattle';
import { BattleScreen } from './BattleScreen';
import type { BattleResult } from './BattleScreen';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { getPokemon } from '../../data/loaders';
import prologueBackground from '../../../assets/backgrounds/prologue.jpg';
import {
  INTRO_TEXT,
  BATTLE_1_PRE_DIALOGUE,
  BATTLE_1_POST_DIALOGUE,
  TRANSITION_TEXT,
  BATTLE_2_PRE_DIALOGUE,
  WIPE_SEQUENCE,
  WIPE_CUTSCENE,
  TUTORIAL_TRIGGERS,
  type TutorialDialogue,
  type TutorialEvent,
} from '../../data/tutorialDialogue';

type ProloguePhase =
  | 'intro'
  | 'battle_1_pre'
  | 'battle_1'
  | 'battle_1_post'
  | 'transition'
  | 'battle_2_pre'
  | 'battle_2'
  | 'wipe_sequence'
  | 'wipe_cutscene';

interface Props {
  onComplete: () => void;
}

// ============================================================
// Narrative Screen (shared for all text-only phases)
// ============================================================

function NarrativeScreen({
  dialogues,
  onComplete,
  onSkip,
}: {
  dialogues: TutorialDialogue[];
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = dialogues[index];

  const handleClick = () => {
    if (index < dialogues.length - 1) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: `#0f0f17 url(${prologueBackground}) center/cover no-repeat`,
        color: '#e2e8f0',
        padding: 32,
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={handleClick}
    >
      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 6,
          border: '1px solid #334155',
          background: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          transition: 'color 0.2s, border-color 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.borderColor = '#64748b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#475569';
          e.currentTarget.style.borderColor = '#334155';
        }}
      >
        Skip
      </button>

      <div style={{ maxWidth: 600, textAlign: 'center' }}>
        {/* Speaker indicator */}
        {current.speaker !== 'narrator' && (() => {
          const speakerConfig = {
            slowking: {
              label: 'Slowking',
              sprite: 'https://img.pokemondb.net/sprites/black-white/anim/normal/slowking.gif',
              borderColor: '#60a5fa',
              labelColor: '#60a5fa',
            },
            slowbro: {
              label: 'Slowbro',
              sprite: 'https://img.pokemondb.net/sprites/black-white/anim/normal/slowbro.gif',
              borderColor: '#f472b6',
              labelColor: '#f472b6',
            },
          } as const;
          const cfg = speakerConfig[current.speaker];
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 24,
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 10,
                background: 'rgba(30, 30, 50, 0.9)',
                border: `2px solid ${cfg.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img
                  src={cfg.sprite}
                  alt={cfg.label}
                  style={{ width: 48, height: 48, imageRendering: 'pixelated' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: cfg.labelColor,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                {cfg.label}
              </div>
            </div>
          );
        })()}

        {/* Text */}
        <div style={{
          fontSize: 20,
          lineHeight: 1.7,
          color: current.speaker === 'narrator' ? '#94a3b8' : '#e2e8f0',
          fontStyle: current.speaker === 'narrator' ? 'italic' : 'normal',
        }}>
          {current.text}
        </div>

        {/* Continue hint */}
        <div style={{
          fontSize: 13,
          color: '#334155',
          marginTop: 48,
        }}>
          {index < dialogues.length - 1 ? 'Click to continue' : 'Click to proceed'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PrologueScreen
// ============================================================

export function PrologueScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<ProloguePhase>('intro');
  const battle = useBattle();

  // Tutorial trigger tracking
  const [firedTriggers, setFiredTriggers] = useState<Set<string>>(new Set());
  const [pendingTutorialDialogue, setPendingTutorialDialogue] = useState<TutorialDialogue[] | null>(null);
  const [tutorialDialogueIndex, setTutorialDialogueIndex] = useState(0);

  // Event queue: events are queued and processed one-at-a-time.
  // When a dialogue is showing, processing pauses. When dismissed, it resumes.
  const eventQueueRef = useRef<TutorialEvent[]>([]);
  const [queueVersion, setQueueVersion] = useState(0);

  // Track if we've started the wipe for battle 2
  const wipeTriggeredRef = useRef(false);
  // Track cards played
  const cardsPlayedRef = useRef(0);

  // ---- Battle Setup Helpers ----

  const startTutorialBattle = useCallback(() => {
    const slowbroBase = getPokemon('slowbro');
    const slowkingBase = getPokemon('slowking');
    const pidgeyBase = getPokemon('pidgey');
    const rattata = getPokemon('rattata');

    // skipShuffle: first N elements of deck array = starting hand
    // (engine reverses then pops from end, so array[0] is drawn first)

    // Slowbro starting hand: Tackle, Tackle, Withdraw, Defend, Tail Whip
    // Remaining deck: front-row-only attacks (so player must learn targeting)
    const slowbroData: PokemonData = {
      ...slowbroBase,
      deck: [
        'tackle', 'tackle', 'withdraw', 'defend', 'tail-whip',
        'waterfall', 'tackle', 'waterfall',
      ],
    };

    // Slowking hand: all psychic/water any_enemy moves
    const slowkingData: PokemonData = {
      ...slowkingBase,
      deck: [
        'confusion', 'confusion', 'water-gun', 'water-gun', 'withdraw',
        'withdraw',
      ],
    };

    // Pidgey A: Gust-heavy hand (gust_force passive will apply Slow)
    const pidgeyA: PokemonData = {
      ...pidgeyBase,
      deck: [
        'gust', 'gust', 'peck', 'peck', 'wing-attack',
        'wing-attack', 'sand-attack',
      ],
    };

    // Pidgey B: standard deck (no gust_force, won't apply Slow)
    const pidgeyB: PokemonData = {
      ...pidgeyBase,
      deck: [
        'gust', 'gust', 'peck', 'wing-attack', 'wing-attack',
        'peck', 'sand-attack',
      ],
    };

    const playerPositions: Position[] = [
      { row: 'front', column: 1 },  // Slowbro front center
      { row: 'back', column: 1 },   // Slowking back center
    ];
    const enemyPositions: Position[] = [
      { row: 'front', column: 1 },  // Rattata front center
      { row: 'back', column: 0 },   // Pidgey A back left
      { row: 'back', column: 2 },   // Pidgey B back right
    ];

    // Give Pidgey A the gust_force passive so its Gust applies Slow
    const enemyPassives = new Map<number, string[]>();
    enemyPassives.set(1, ['gust_force']); // slotIndex 1 = Pidgey A

    battle.startTutorialBattle(
      [slowbroData, slowkingData],
      [rattata, pidgeyA, pidgeyB],
      playerPositions,
      enemyPositions,
      enemyPassives,
    );
  }, [battle]);

  const startWipeBattle = useCallback(() => {
    wipeTriggeredRef.current = false;

    const slowbroBase = getPokemon('slowbro');
    const slowkingBase = getPokemon('slowking');
    const arbok = getPokemon('arbok');
    const raticate = getPokemon('raticate');
    const pidgeotto = getPokemon('pidgeotto');

    // Boost enemy HP x1.5
    const boostedArbok: PokemonData = { ...arbok, maxHp: Math.floor(arbok.maxHp * 1.5) };
    const boostedRaticate: PokemonData = { ...raticate, maxHp: Math.floor(raticate.maxHp * 1.5) };
    const boostedPidgeotto: PokemonData = { ...pidgeotto, maxHp: Math.floor(pidgeotto.maxHp * 1.5) };

    const playerPositions: Position[] = [
      { row: 'front', column: 1 },
      { row: 'back', column: 1 },
    ];
    const enemyPositions: Position[] = [
      { row: 'front', column: 0 },
      { row: 'front', column: 1 },
      { row: 'front', column: 2 },
    ];

    battle.startConfiguredBattle(
      [slowbroBase, slowkingBase],
      [boostedArbok, boostedRaticate, boostedPidgeotto],
      playerPositions,
      enemyPositions,
      new Map(),
      new Map(),
    );
  }, [battle]);

  // ---- Tutorial Event Queue ----

  // Push an event to the queue (never dropped, processed when dialogue is clear)
  const queueTutorialEvent = useCallback((event: TutorialEvent) => {
    eventQueueRef.current.push(event);
    setQueueVersion(v => v + 1);
  }, []);

  // Process queued events when no dialogue is showing
  useEffect(() => {
    if (phase !== 'battle_1') return;
    if (pendingTutorialDialogue) return;
    if (!battle.state) return;
    if (eventQueueRef.current.length === 0) return;

    // Process events until one fires a trigger or queue is empty
    while (eventQueueRef.current.length > 0) {
      const event = eventQueueRef.current.shift()!;
      for (const trigger of TUTORIAL_TRIGGERS) {
        if (!firedTriggers.has(trigger.id) && trigger.condition({
          state: battle.state,
          event,
          firedTriggers,
        })) {
          setFiredTriggers(prev => new Set([...prev, trigger.id]));
          setPendingTutorialDialogue(trigger.dialogue);
          setTutorialDialogueIndex(0);
          return; // Stop processing, show this dialogue first
        }
      }
    }
  }, [phase, pendingTutorialDialogue, battle.state, firedTriggers, queueVersion]);

  // ---- Pause battle when tutorial dialogue is showing ----

  useEffect(() => {
    battle.setTutorialPaused(!!pendingTutorialDialogue);
  }, [pendingTutorialDialogue, battle]);

  // ---- Wipe Detection for Battle 2 ----

  useEffect(() => {
    if (
      phase === 'battle_2' &&
      battle.state &&
      battle.state.round >= 3 &&
      !wipeTriggeredRef.current
    ) {
      wipeTriggeredRef.current = true;
      setPhase('wipe_sequence');
    }
  }, [phase, battle.state?.round, battle.state]);

  // Also detect if battle 2 ends naturally (victory/defeat before round 3)
  // In that case, still trigger the wipe
  useEffect(() => {
    if (
      phase === 'battle_2' &&
      battle.phase === 'victory' &&
      !wipeTriggeredRef.current
    ) {
      wipeTriggeredRef.current = true;
      setPhase('wipe_sequence');
    }
    if (
      phase === 'battle_2' &&
      battle.phase === 'defeat' &&
      !wipeTriggeredRef.current
    ) {
      wipeTriggeredRef.current = true;
      setPhase('wipe_sequence');
    }
  }, [phase, battle.phase]);

  // ---- Tutorial Trigger on Turn Change (turn_start + end_turn) ----

  const lastTurnIndexRef = useRef<number>(-1);
  const lastRoundRef = useRef<number>(-1);
  const lastTurnCombatantRef = useRef<Combatant | null>(null);

  useEffect(() => {
    if (phase !== 'battle_1' || !battle.state || battle.state.phase !== 'ongoing') return;

    const { currentTurnIndex, round } = battle.state;
    if (currentTurnIndex === lastTurnIndexRef.current && round === lastRoundRef.current) return;

    // Fire end_turn for the previous player combatant whose turn just ended
    const prevCombatant = lastTurnCombatantRef.current;
    if (prevCombatant && prevCombatant.side === 'player') {
      queueTutorialEvent({ type: 'end_turn', combatant: prevCombatant });
    }

    lastTurnIndexRef.current = currentTurnIndex;
    lastRoundRef.current = round;

    const entry = battle.state.turnOrder[currentTurnIndex];
    if (!entry) return;
    const combatant = battle.state.combatants.find(c => c.id === entry.combatantId);
    lastTurnCombatantRef.current = combatant ?? null;

    if (!combatant || combatant.side !== 'player') return;

    queueTutorialEvent({ type: 'turn_start', combatant });
  }, [phase, battle.state, battle.state?.currentTurnIndex, battle.state?.round, queueTutorialEvent]);

  // ---- Log Watcher (card_played, damage_taken, status_applied) ----

  const processedLogCountRef = useRef(0);

  useEffect(() => {
    if (phase !== 'battle_1' || !battle.state) return;

    const newLogs = battle.logs.slice(processedLogCountRef.current);
    processedLogCountRef.current = battle.logs.length;

    for (const log of newLogs) {
      // Detect card plays: "Slowbro plays Defend (cost 1)."
      if (log.message.includes(' plays ')) {
        const combatant = battle.state.combatants.find(c => c.id === log.combatantId);
        if (combatant && combatant.side === 'player') {
          // Extract card name and map to ID for trigger checking
          let cardId = '';
          if (log.message.includes('plays Withdraw')) cardId = 'withdraw';
          else if (log.message.includes('plays Defend')) cardId = 'defend';
          if (cardId) {
            queueTutorialEvent({ type: 'card_played', combatant, cardId });
          }
        }
      }

      // Detect damage to Slowking (back row hit trigger)
      if (log.message.includes('takes') && log.message.includes('damage')) {
        const target = battle.state.combatants.find(c => c.id === log.combatantId);
        if (target && target.pokemonId === 'slowking' && target.side === 'player') {
          const enemyAttacker = battle.state.combatants.find(c =>
            c.side === 'enemy' && c.alive
          );
          if (enemyAttacker) {
            queueTutorialEvent({
              type: 'damage_taken',
              target,
              source: enemyAttacker,
              moveId: 'gust',
            });
          }
        }
      }

      // Detect status applied to a player Pokemon
      if (log.message.includes('applied to')) {
        const target = battle.state.combatants.find(c =>
          c.side === 'player' && log.message.includes(c.name)
        );
        if (target) {
          const statusMatch = log.message.match(/^(\w[\w\s]*?)\s+\d+\s+applied to/);
          const statusName = statusMatch ? statusMatch[1] : 'unknown';
          queueTutorialEvent({
            type: 'status_applied',
            target,
            statusName,
          });
        }
      }
    }
  }, [phase, battle.logs, battle.state, queueTutorialEvent]);

  // ---- Wrapped Battle Callbacks ----

  const handleSelectCard = useCallback((cardIndex: number | null) => {
    if (pendingTutorialDialogue) return;  // Block input during tutorial
    if (cardIndex === null || !battle.state) {
      battle.setPendingCardIndex(null);
      return;
    }
    battle.setPendingCardIndex(cardIndex);
  }, [battle, pendingTutorialDialogue]);

  const handleSelectTarget = useCallback((targetId: string) => {
    if (pendingTutorialDialogue) return;
    if (battle.pendingCardIndex !== null) {
      battle.playCard(battle.pendingCardIndex, targetId || undefined);
    }
  }, [battle, pendingTutorialDialogue]);

  const handlePlayCard = useCallback((cardIndex: number, targetId?: string) => {
    if (pendingTutorialDialogue) return;
    battle.playCard(cardIndex, targetId);
    cardsPlayedRef.current++;
    // Triggers are detected by the log watcher
  }, [battle, pendingTutorialDialogue]);

  const handleEndTurn = useCallback(() => {
    if (pendingTutorialDialogue) return;
    battle.endPlayerTurn();
    // end_turn trigger is detected by the turn change watcher
  }, [battle, pendingTutorialDialogue]);

  const handleBattleEnd = useCallback((result: BattleResult, _combatants: Combatant[]) => {
    if (phase === 'battle_1') {
      if (result === 'victory') {
        setPhase('battle_1_post');
      } else {
        // Player lost the tutorial battle - restart it
        setPhase('battle_1_pre');
      }
    }
    // battle_2 end is handled by the wipe detection effect
  }, [phase]);

  // ---- Tutorial Overlay Dismiss ----

  const handleDismissTutorial = useCallback(() => {
    if (!pendingTutorialDialogue) return;

    if (tutorialDialogueIndex < pendingTutorialDialogue.length - 1) {
      setTutorialDialogueIndex(tutorialDialogueIndex + 1);
    } else {
      setPendingTutorialDialogue(null);
      setTutorialDialogueIndex(0);
    }
  }, [pendingTutorialDialogue, tutorialDialogueIndex]);

  // ---- Phase Rendering ----

  // Intro narrative
  if (phase === 'intro') {
    return (
      <NarrativeScreen
        key="intro"
        dialogues={INTRO_TEXT}
        onComplete={() => setPhase('battle_1_pre')}
        onSkip={onComplete}
      />
    );
  }

  // Pre-battle 1 dialogue
  if (phase === 'battle_1_pre') {
    return (
      <NarrativeScreen
        key="battle_1_pre"
        dialogues={BATTLE_1_PRE_DIALOGUE}
        onComplete={() => {
          startTutorialBattle();
          setPhase('battle_1');
        }}
        onSkip={onComplete}
      />
    );
  }

  // Battle 1
  if (phase === 'battle_1' && battle.state) {
    return (
      <div style={{ position: 'relative' }}>
        <BattleScreen
          state={battle.state}
          phase={battle.phase}
          logs={battle.logs}
          pendingCardIndex={battle.pendingCardIndex}
          onSelectCard={handleSelectCard}
          onSelectTarget={handleSelectTarget}
          onPlayCard={handlePlayCard}
          onEndTurn={handleEndTurn}
          onRestart={() => setPhase('battle_1_pre')}
          onBattleEnd={handleBattleEnd}
        />
        {/* Tutorial overlay */}
        {pendingTutorialDialogue && (
          <TutorialOverlay
            dialogue={pendingTutorialDialogue[tutorialDialogueIndex]}
            onDismiss={handleDismissTutorial}
          />
        )}
        {/* Skip button during battle */}
        <button
          onClick={onComplete}
          style={{
            position: 'fixed',
            top: 10,
            right: 100,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 4,
            border: '1px solid #334155',
            background: 'rgba(15, 15, 23, 0.7)',
            color: '#475569',
            cursor: 'pointer',
            zIndex: 50,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = '#64748b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#334155';
          }}
        >
          Skip
        </button>
      </div>
    );
  }

  // Post-battle 1 dialogue
  if (phase === 'battle_1_post') {
    return (
      <NarrativeScreen
        key="battle_1_post"
        dialogues={BATTLE_1_POST_DIALOGUE}
        onComplete={() => setPhase('transition')}
        onSkip={onComplete}
      />
    );
  }

  // Transition between battles
  if (phase === 'transition') {
    return (
      <NarrativeScreen
        key="transition"
        dialogues={TRANSITION_TEXT}
        onComplete={() => setPhase('battle_2_pre')}
        onSkip={onComplete}
      />
    );
  }

  // Pre-battle 2 dialogue
  if (phase === 'battle_2_pre') {
    return (
      <NarrativeScreen
        key="battle_2_pre"
        dialogues={BATTLE_2_PRE_DIALOGUE}
        onComplete={() => {
          startWipeBattle();
          setPhase('battle_2');
        }}
        onSkip={onComplete}
      />
    );
  }

  // Battle 2
  if (phase === 'battle_2' && battle.state) {
    return (
      <div style={{ position: 'relative' }}>
        <BattleScreen
          state={battle.state}
          phase={battle.phase}
          logs={battle.logs}
          pendingCardIndex={battle.pendingCardIndex}
          onSelectCard={handleSelectCard}
          onSelectTarget={handleSelectTarget}
          onPlayCard={handlePlayCard}
          onEndTurn={handleEndTurn}
          onRestart={() => setPhase('battle_2_pre')}
          onBattleEnd={handleBattleEnd}
        />
        {/* Skip button during battle */}
        <button
          onClick={onComplete}
          style={{
            position: 'fixed',
            top: 10,
            right: 100,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 4,
            border: '1px solid #334155',
            background: 'rgba(15, 15, 23, 0.7)',
            color: '#475569',
            cursor: 'pointer',
            zIndex: 50,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = '#64748b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#334155';
          }}
        >
          Skip
        </button>
      </div>
    );
  }

  // Wipe sequence
  if (phase === 'wipe_sequence') {
    return (
      <NarrativeScreen
        key="wipe_sequence"
        dialogues={WIPE_SEQUENCE}
        onComplete={() => setPhase('wipe_cutscene')}
        onSkip={onComplete}
      />
    );
  }

  // Wipe cutscene (final)
  if (phase === 'wipe_cutscene') {
    return (
      <NarrativeScreen
        key="wipe_cutscene"
        dialogues={WIPE_CUTSCENE}
        onComplete={onComplete}
        onSkip={onComplete}
      />
    );
  }

  // Fallback (loading state between phases)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0f0f17',
      color: '#475569',
    }}>
      Loading...
    </div>
  );
}
