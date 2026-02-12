import { useState, useEffect, useCallback } from 'react';
import type { MoveType } from '../../engine/types';

// Types for battle events
export interface BattleEvent {
  id: string;
  type: 'damage' | 'heal' | 'block' | 'status' | 'card_played';
  targetId?: string;
  sourceId?: string;
  value?: number;
  text?: string;
  timestamp: number;
}

// Status applied animation event
export interface StatusAppliedEvent {
  id: string;
  targetId: string;
  statusType: string;
  stacks: number;
  isBuff: boolean;
  timestamp: number;
}

const BUFF_STATUSES = new Set(['strength', 'haste', 'evasion']);

const STATUS_DISPLAY: Record<string, { icon: string; color: string }> = {
  burn: { icon: '🔥', color: '#ef4444' },
  poison: { icon: '☠️', color: '#a855f7' },
  paralysis: { icon: '⚡', color: '#facc15' },
  slow: { icon: '🐌', color: '#6b7280' },
  enfeeble: { icon: '💔', color: '#f97316' },
  sleep: { icon: '💤', color: '#818cf8' },
  leech: { icon: '🌿', color: '#22c55e' },
  evasion: { icon: '💨', color: '#67e8f9' },
  strength: { icon: '💪', color: '#ef4444' },
  haste: { icon: '💨', color: '#22d3ee' },
};

// Card fly animation event
export interface CardFlyEvent {
  id: string;
  cardName: string;
  cardType: MoveType;
  startPos: { x: number; y: number };
  targetPositions: { x: number; y: number }[];
  timestamp: number;
  isBlockCard?: boolean;  // If true, show shield animation instead of attack
}

interface FloatingNumberProps {
  event: BattleEvent;
  position: { x: number; y: number };
  onComplete: () => void;
}

// Floating damage/heal number that animates upward and fades
function FloatingNumber({ event, position, onComplete }: FloatingNumberProps) {
  const [opacity, setOpacity] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    // Animate upward and fade out
    const startTime = Date.now();
    const duration = 1000; // 1 second animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setOffsetY(-60 * progress); // Move up 60px
      setOpacity(1 - progress * 0.8); // Fade to 20% opacity

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  const color = event.type === 'damage' ? '#ef4444'
    : event.type === 'heal' ? '#4ade80'
    : event.type === 'block' ? '#60a5fa'
    : '#facc15';

  const prefix = event.type === 'damage' ? '-'
    : event.type === 'heal' ? '+'
    : event.type === 'block' ? '🛡️+'
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y + offsetY,
        transform: 'translate(-50%, -50%)',
        fontSize: 28,
        fontWeight: 'bold',
        color,
        textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)',
        opacity,
        pointerEvents: 'none',
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}{event.value}
    </div>
  );
}

interface CardPlayedBannerProps {
  sourceName: string;
  cardName: string;
  onComplete: () => void;
}

// Banner that shows what card was played
function CardPlayedBanner({ sourceName, cardName, onComplete }: CardPlayedBannerProps) {
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    // Fade in, hold, fade out
    const startTime = Date.now();
    const fadeInDuration = 150;
    const holdDuration = 600;
    const fadeOutDuration = 200;
    const totalDuration = fadeInDuration + holdDuration + fadeOutDuration;

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < fadeInDuration) {
        // Fade in
        const progress = elapsed / fadeInDuration;
        setOpacity(progress);
        setScale(0.8 + 0.2 * progress);
      } else if (elapsed < fadeInDuration + holdDuration) {
        // Hold
        setOpacity(1);
        setScale(1);
      } else if (elapsed < totalDuration) {
        // Fade out
        const progress = (elapsed - fadeInDuration - holdDuration) / fadeOutDuration;
        setOpacity(1 - progress);
      } else {
        onComplete();
        return;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '35%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        padding: '12px 24px',
        background: 'rgba(30, 30, 46, 0.95)',
        border: '2px solid #facc15',
        borderRadius: 12,
        opacity,
        pointerEvents: 'none',
        zIndex: 200,
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: 14, color: '#94a3b8' }}>{sourceName}</div>
      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#facc15' }}>{cardName}</div>
    </div>
  );
}

// Type colors for card fly animations (matches CardDisplay)
const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  poison: '#a040a0',
  flying: '#a890f0',
  psychic: '#f85888',
  dark: '#705848',
  fighting: '#c03028',
  ice: '#98d8d8',
  bug: '#a8b820',
  dragon: '#7038f8',
  ghost: '#705898',
  rock: '#b8a038',
  ground: '#e0c068',
  item: '#4ade80',
};

// Animation configuration
const CARD_FLY_CONFIG = {
  FLIGHT_DURATION: 300,    // ms to reach target
  IMPACT_DURATION: 200,    // ms for burst effect
  TRAIL_LENGTH: 4,         // ghost positions
  SPLIT_POINT: 0.5,        // when AoE splits (0-1)
  CARD_SIZE: { width: 55, height: 70 },  // Larger for better visibility
};

interface CardFlyAnimationProps {
  event: CardFlyEvent;
  onComplete: () => void;
}

// Shield shape component for block cards
function ShieldShape({ size, color, style }: { size: number; color: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size,
      height: size * 1.15,
      position: 'relative',
      ...style,
    }}>
      {/* Shield body */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, ${color} 60%, ${color}cc 100%)`,
        borderRadius: `${size * 0.15}px ${size * 0.15}px ${size * 0.5}px ${size * 0.5}px`,
        border: `3px solid ${color}`,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}88, inset 0 0 15px rgba(255,255,255,0.5)`,
      }} />
      {/* Shield emblem (inner circle) */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: size * 0.4,
        height: size * 0.4,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, ${color}88 100%)`,
        border: `2px solid ${color}`,
      }} />
    </div>
  );
}

// Flying card animation component
function CardFlyAnimation({ event, onComplete }: CardFlyAnimationProps) {
  const [phase, setPhase] = useState<'flying' | 'impact' | 'done'>('flying');
  const [progress, setProgress] = useState(0);
  const [trailPositions, setTrailPositions] = useState<{ x: number; y: number; opacity: number }[]>([]);
  const [splitProgress, setSplitProgress] = useState(0);

  const isBlockCard = event.isBlockCard ?? false;
  const blockColor = '#60a5fa';  // Blue for block/shield
  const typeColor = isBlockCard ? blockColor : (MOVE_TYPE_COLORS[event.cardType] || MOVE_TYPE_COLORS.normal);
  const isMultiTarget = event.targetPositions.length > 1;

  useEffect(() => {
    const startTime = Date.now();
    const { FLIGHT_DURATION, IMPACT_DURATION, TRAIL_LENGTH, SPLIT_POINT } = CARD_FLY_CONFIG;

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (phase === 'flying') {
        const flightProgress = Math.min(elapsed / FLIGHT_DURATION, 1);
        setProgress(flightProgress);

        // Update trail positions (previous positions with fading opacity)
        const currentPos = getCurrentPosition(flightProgress);
        setTrailPositions(prev => {
          const newTrail = [
            { ...currentPos, opacity: 0.6 },
            ...prev.slice(0, TRAIL_LENGTH - 1).map((p, i) => ({
              ...p,
              opacity: 0.6 - (i + 1) * (0.6 / TRAIL_LENGTH)
            }))
          ];
          return newTrail;
        });

        // For multi-target, track split progress
        if (isMultiTarget && flightProgress > SPLIT_POINT) {
          setSplitProgress((flightProgress - SPLIT_POINT) / (1 - SPLIT_POINT));
        }

        if (flightProgress >= 1) {
          setPhase('impact');
        } else {
          requestAnimationFrame(animate);
        }
      } else if (phase === 'impact') {
        const impactElapsed = elapsed - FLIGHT_DURATION;
        const impactProgress = Math.min(impactElapsed / IMPACT_DURATION, 1);
        setProgress(impactProgress);

        if (impactProgress >= 1) {
          setPhase('done');
          onComplete();
        } else {
          requestAnimationFrame(animate);
        }
      }
    };

    requestAnimationFrame(animate);
  }, [phase, onComplete, isMultiTarget]);

  // Calculate current position during flight
  const getCurrentPosition = (t: number) => {
    const { startPos, targetPositions } = event;
    // For single target or pre-split, fly toward first target
    const target = targetPositions[0];

    // Ease-out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - t, 3);

    return {
      x: startPos.x + (target.x - startPos.x) * eased,
      y: startPos.y + (target.y - startPos.y) * eased,
    };
  };

  // Get split positions for multi-target
  const getSplitPositions = () => {
    if (!isMultiTarget || splitProgress === 0) return [];

    const { startPos, targetPositions } = event;
    const { SPLIT_POINT } = CARD_FLY_CONFIG;

    // Calculate the split point position
    const splitPos = {
      x: startPos.x + (targetPositions[0].x - startPos.x) * SPLIT_POINT,
      y: startPos.y + (targetPositions[0].y - startPos.y) * SPLIT_POINT,
    };

    // Each particle flies from split point to its target
    return targetPositions.map(target => {
      const eased = 1 - Math.pow(1 - splitProgress, 3);
      return {
        x: splitPos.x + (target.x - splitPos.x) * eased,
        y: splitPos.y + (target.y - splitPos.y) * eased,
      };
    });
  };

  if (phase === 'done') return null;

  const { CARD_SIZE } = CARD_FLY_CONFIG;
  const currentPos = getCurrentPosition(progress);
  const scale = phase === 'flying' ? 1 - progress * 0.4 : 1; // Shrink during flight
  const rotation = phase === 'flying' ? progress * 360 : 0; // Rotate during flight

  // Render impact effect at all target positions
  if (phase === 'impact') {
    if (isBlockCard) {
      // Shield pulse effect - shield appears and pulses once
      const pulseScale = 1 + Math.sin(progress * Math.PI) * 0.3; // Pulse up then down
      const pulseOpacity = 1 - progress * 0.5; // Fade out towards end

      return (
        <>
          {event.targetPositions.map((target, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: target.x,
                top: target.y,
                transform: `translate(-50%, -50%) scale(${pulseScale})`,
                opacity: pulseOpacity,
                pointerEvents: 'none',
                zIndex: 150,
              }}
            >
              <ShieldShape size={70} color={typeColor} />
              {/* Pulse ring */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 90 + progress * 40,
                height: 100 + progress * 40,
                borderRadius: '15px 15px 50% 50%',
                border: `3px solid ${typeColor}`,
                opacity: 1 - progress,
                boxShadow: `0 0 20px ${typeColor}`,
              }} />
            </div>
          ))}
        </>
      );
    } else {
      // Attack burst effect - expanding explosion
      const impactScale = 1 + progress * 2;
      const impactOpacity = 1 - progress;

      return (
        <>
          {event.targetPositions.map((target, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: target.x,
                top: target.y,
                transform: `translate(-50%, -50%) scale(${impactScale})`,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, ${typeColor} 30%, ${typeColor}00 70%)`,
                boxShadow: `0 0 30px ${typeColor}, 0 0 60px ${typeColor}88`,
                opacity: impactOpacity,
                pointerEvents: 'none',
                zIndex: 150,
              }}
            />
          ))}
        </>
      );
    }
  }

  // Flying phase - render card/shield and trail
  const splitPositions = getSplitPositions();

  // For block cards, render shield shapes; for attack cards, render cards
  if (isBlockCard) {
    return (
      <>
        {/* Trail ghost shields */}
        {trailPositions.map((pos, i) => (
          <div
            key={`trail-${i}`}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) scale(${scale * 0.7})`,
              opacity: pos.opacity * 0.5,
              pointerEvents: 'none',
              zIndex: 149 - i,
            }}
          >
            <div style={{
              width: 45,
              height: 52,
              background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, ${typeColor}44 100%)`,
              borderRadius: '8px 8px 50% 50%',
              border: `2px solid ${typeColor}44`,
            }} />
          </div>
        ))}

        {/* Main flying shield */}
        <div
          style={{
            position: 'absolute',
            left: currentPos.x,
            top: currentPos.y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            pointerEvents: 'none',
            zIndex: 150,
          }}
        >
          <ShieldShape size={55} color={typeColor} />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Trail ghost cards */}
      {trailPositions.map((pos, i) => (
        <div
          key={`trail-${i}`}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            transform: `translate(-50%, -50%) scale(${scale * 0.8})`,
            width: CARD_SIZE.width,
            height: CARD_SIZE.height,
            borderRadius: 6,
            background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, ${typeColor}44 100%)`,
            border: `2px solid ${typeColor}66`,
            opacity: pos.opacity,
            pointerEvents: 'none',
            zIndex: 149 - i,
          }}
        />
      ))}

      {/* Main flying card (or split particles) */}
      {splitPositions.length > 0 ? (
        // Multi-target: render split particles (energy orbs)
        splitPositions.map((pos, i) => (
          <div
            key={`split-${i}`}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) scale(${0.6}) rotate(${rotation}deg)`,
              width: CARD_SIZE.width * 0.6,
              height: CARD_SIZE.height * 0.6,
              borderRadius: 6,
              background: `radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.9) 0%, ${typeColor} 50%, ${typeColor}cc 100%)`,
              border: `2px solid ${typeColor}`,
              boxShadow: `0 0 16px ${typeColor}, 0 0 32px ${typeColor}88, inset 0 0 8px rgba(255,255,255,0.5)`,
              pointerEvents: 'none',
              zIndex: 150,
            }}
          />
        ))
      ) : (
        // Single target or pre-split: render main card
        <div
          style={{
            position: 'absolute',
            left: currentPos.x,
            top: currentPos.y,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            width: CARD_SIZE.width,
            height: CARD_SIZE.height,
            borderRadius: 6,
            background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 40%, ${typeColor} 100%)`,
            border: `3px solid ${typeColor}`,
            boxShadow: `0 0 20px ${typeColor}, 0 0 40px ${typeColor}88, 0 2px 8px rgba(0,0,0,0.4)`,
            pointerEvents: 'none',
            zIndex: 150,
          }}
        />
      )}
    </>
  );
}

// Status applied animation: arrows + icon pop
interface StatusAppliedAnimationProps {
  event: StatusAppliedEvent;
  position: { x: number; y: number };
  onComplete: () => void;
}

function StatusAppliedAnimation({ event, position, onComplete }: StatusAppliedAnimationProps) {
  const [progress, setProgress] = useState(0);

  const display = STATUS_DISPLAY[event.statusType] || { icon: '?', color: '#888' };
  const arrowColor = event.isBuff ? '#4ade80' : '#ef4444';
  const direction = event.isBuff ? -1 : 1; // -1 = up, 1 = down

  useEffect(() => {
    const startTime = Date.now();
    const duration = 800;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  // Arrow positions: 3 arrows spread horizontally, staggered timing
  const arrows = [
    { xOff: -28, delay: 0 },
    { xOff: 0, delay: 0.12 },
    { xOff: 28, delay: 0.24 },
  ];

  // Icon pop: scale up then fade
  const iconPhase = Math.max(0, progress - 0.1) / 0.9; // starts slightly after arrows
  const iconScale = iconPhase < 0.3
    ? (iconPhase / 0.3) * 1.3 // scale up to 1.3
    : iconPhase < 0.5
      ? 1.3 - (iconPhase - 0.3) / 0.2 * 0.3 // settle to 1.0
      : 1.0;
  const iconOpacity = iconPhase < 0.6 ? 1 : 1 - (iconPhase - 0.6) / 0.4;

  return (
    <>
      {/* Directional arrows */}
      {arrows.map((arrow, i) => {
        const localP = Math.max(0, Math.min(1, (progress - arrow.delay) / 0.6));
        // Each arrow slides 50px in direction, fading in then out
        const slideY = localP * 50 * direction;
        const arrowOpacity = localP < 0.3 ? localP / 0.3 : localP < 0.7 ? 1 : 1 - (localP - 0.7) / 0.3;
        const arrowChar = event.isBuff ? '▲' : '▼';

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: position.x + arrow.xOff,
              top: position.y + slideY - (event.isBuff ? 20 : -20),
              transform: 'translate(-50%, -50%)',
              fontSize: 22,
              fontWeight: 'bold',
              color: arrowColor,
              opacity: arrowOpacity,
              textShadow: `0 0 8px ${arrowColor}, 0 0 16px ${arrowColor}88`,
              pointerEvents: 'none',
              zIndex: 160,
            }}
          >
            {arrowChar}
          </div>
        );
      })}

      {/* Status icon pop */}
      {iconPhase > 0 && (
        <div
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y - 10,
            transform: `translate(-50%, -50%) scale(${iconScale})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            opacity: iconOpacity,
            pointerEvents: 'none',
            zIndex: 170,
          }}
        >
          <div style={{
            fontSize: 36,
            filter: `drop-shadow(0 0 6px ${display.color}) drop-shadow(0 0 12px ${display.color}88)`,
          }}>
            {display.icon}
          </div>
          {event.stacks > 1 && (
            <div style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: display.color,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              x{event.stacks}
            </div>
          )}
        </div>
      )}

      {/* Brief color flash behind the Pokemon */}
      {progress < 0.4 && (
        <div
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)',
            width: 80 + progress * 60,
            height: 80 + progress * 60,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${display.color}44 0%, ${display.color}00 70%)`,
            opacity: 1 - progress / 0.4,
            pointerEvents: 'none',
            zIndex: 155,
          }}
        />
      )}
    </>
  );
}

// Hook to manage battle effects
export function useBattleEffects() {
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [cardBanner, setCardBanner] = useState<{ sourceName: string; cardName: string; id: string } | null>(null);
  const [cardFlyEvents, setCardFlyEvents] = useState<CardFlyEvent[]>([]);

  const addEvent = useCallback((event: Omit<BattleEvent, 'id' | 'timestamp'>) => {
    const newEvent: BattleEvent = {
      ...event,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setEvents(prev => [...prev, newEvent]);
  }, []);

  const showCardPlayed = useCallback((sourceName: string, cardName: string) => {
    setCardBanner({ sourceName, cardName, id: `${Date.now()}` });
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearCardBanner = useCallback(() => {
    setCardBanner(null);
  }, []);

  const triggerCardFly = useCallback((event: Omit<CardFlyEvent, 'id' | 'timestamp'>) => {
    const newEvent: CardFlyEvent = {
      ...event,
      id: `fly-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setCardFlyEvents(prev => [...prev, newEvent]);
  }, []);

  const removeCardFlyEvent = useCallback((id: string) => {
    setCardFlyEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const [statusAppliedEvents, setStatusAppliedEvents] = useState<StatusAppliedEvent[]>([]);

  const triggerStatusApplied = useCallback((event: { targetId: string; statusType: string; stacks: number }) => {
    const newEvent: StatusAppliedEvent = {
      ...event,
      id: `status-${Date.now()}-${Math.random()}`,
      isBuff: BUFF_STATUSES.has(event.statusType),
      timestamp: Date.now(),
    };
    setStatusAppliedEvents(prev => [...prev, newEvent]);
  }, []);

  const removeStatusAppliedEvent = useCallback((id: string) => {
    setStatusAppliedEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    events,
    cardBanner,
    cardFlyEvents,
    statusAppliedEvents,
    addEvent,
    showCardPlayed,
    removeEvent,
    clearCardBanner,
    triggerCardFly,
    removeCardFlyEvent,
    triggerStatusApplied,
    removeStatusAppliedEvent,
  };
}

interface BattleEffectsLayerProps {
  events: BattleEvent[];
  cardBanner: { sourceName: string; cardName: string; id: string } | null;
  cardFlyEvents: CardFlyEvent[];
  statusAppliedEvents: StatusAppliedEvent[];
  getPositionForCombatant: (combatantId: string) => { x: number; y: number } | null;
  onEventComplete: (id: string) => void;
  onBannerComplete: () => void;
  onCardFlyComplete: (id: string) => void;
  onStatusAppliedComplete: (id: string) => void;
}

// The visual layer that renders all effects
export function BattleEffectsLayer({
  events,
  cardBanner,
  cardFlyEvents,
  statusAppliedEvents,
  getPositionForCombatant,
  onEventComplete,
  onBannerComplete,
  onCardFlyComplete,
  onStatusAppliedComplete,
}: BattleEffectsLayerProps) {
  return (
    <>
      {/* Card fly animations */}
      {cardFlyEvents.map(event => (
        <CardFlyAnimation
          key={event.id}
          event={event}
          onComplete={() => onCardFlyComplete(event.id)}
        />
      ))}

      {/* Status applied animations */}
      {statusAppliedEvents.map(event => {
        const position = getPositionForCombatant(event.targetId);
        if (!position) return null;
        return (
          <StatusAppliedAnimation
            key={event.id}
            event={event}
            position={position}
            onComplete={() => onStatusAppliedComplete(event.id)}
          />
        );
      })}

      {/* Floating numbers */}
      {events.map(event => {
        if (!event.targetId || event.value === undefined) return null;
        const position = getPositionForCombatant(event.targetId);
        if (!position) return null;

        return (
          <FloatingNumber
            key={event.id}
            event={event}
            position={position}
            onComplete={() => onEventComplete(event.id)}
          />
        );
      })}

      {/* Card played banner */}
      {cardBanner && (
        <CardPlayedBanner
          key={cardBanner.id}
          sourceName={cardBanner.sourceName}
          cardName={cardBanner.cardName}
          onComplete={onBannerComplete}
        />
      )}
    </>
  );
}
