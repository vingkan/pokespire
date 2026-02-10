import { useRef, useLayoutEffect, useCallback } from 'react';
import type { CombatState } from '../../engine/types';
import { getCombatant } from '../../engine/combat';
import { getEffectiveSpeed } from '../../engine/status';

interface Props {
  state: CombatState;
}

// Duration of the shuffle animation in ms
const ANIM_DURATION = 400;

export function TurnOrderBar({ state }: Props) {
  // Track DOM elements by combatantId
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Previous order snapshot (combatantIds in order)
  const prevOrderRef = useRef<string[]>([]);
  // Previous pixel positions of each entry
  const prevLeftRef = useRef<Map<string, number>>(new Map());
  // Track active animations to avoid conflicts
  const activeAnimsRef = useRef<Set<string>>(new Set());

  const setRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      entryRefs.current.set(id, el);
    } else {
      entryRefs.current.delete(id);
    }
  }, []);

  // FLIP: after React updates the DOM but before browser paints
  useLayoutEffect(() => {
    const currentOrder = state.turnOrder.map(e => e.combatantId);
    const prevOrder = prevOrderRef.current;
    const prevLeft = prevLeftRef.current;

    // Snapshot current positions (these are the NEW positions after DOM update)
    const currentLeft = new Map<string, number>();
    for (const [id, el] of entryRefs.current) {
      // Only measure entries not currently animating
      if (!activeAnimsRef.current.has(id)) {
        currentLeft.set(id, el.getBoundingClientRect().left);
      }
    }

    // Detect entries that moved
    if (prevOrder.length > 0 && prevLeft.size > 0) {
      const movedEntries: { id: string; deltaX: number; el: HTMLDivElement }[] = [];

      for (const id of currentOrder) {
        const el = entryRefs.current.get(id);
        const oldLeft = prevLeft.get(id);
        const newLeft = currentLeft.get(id);

        if (el && oldLeft !== undefined && newLeft !== undefined) {
          const deltaX = oldLeft - newLeft;
          if (Math.abs(deltaX) > 2 && !activeAnimsRef.current.has(id)) {
            movedEntries.push({ id, deltaX, el });
          }
        }
      }

      if (movedEntries.length > 0) {
        // FLIP Invert: apply inverse transform immediately (no visual jump)
        for (const { id, deltaX, el } of movedEntries) {
          el.style.transform = `translate(${deltaX}px, 0px)`;
          el.style.transition = 'none';
          activeAnimsRef.current.add(id);
        }

        // FLIP Play: animate drop → slide → rise using rAF
        requestAnimationFrame(() => {
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / ANIM_DURATION, 1);

            for (const { id, deltaX, el } of movedEntries) {
              // Phase 1 (0→0.25): drop down from bar
              // Phase 2 (0.15→0.85): slide horizontally
              // Phase 3 (0.75→1.0): rise back into bar
              const dropT = Math.min(t / 0.25, 1);
              const slideT = Math.max(0, Math.min((t - 0.15) / 0.7, 1));
              const riseT = Math.max(0, (t - 0.75) / 0.25);

              // Smooth easing per phase
              const dropEase = 1 - Math.pow(1 - dropT, 2);
              const slideEase = slideT < 0.5 ? 2 * slideT * slideT : 1 - Math.pow(-2 * slideT + 2, 2) / 2;
              const riseEase = riseT * riseT;

              const offsetX = deltaX * (1 - slideEase);
              const offsetY = dropEase * 20 - riseEase * 20;

              el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            }

            if (t < 1) {
              requestAnimationFrame(animate);
            } else {
              // Clean up
              for (const { id, el } of movedEntries) {
                el.style.transform = '';
                el.style.transition = '';
                activeAnimsRef.current.delete(id);
              }
            }
          };

          requestAnimationFrame(animate);
        });
      }
    }

    // Store current positions for next render (only non-animating entries)
    prevLeftRef.current = currentLeft;
    prevOrderRef.current = currentOrder;
  });

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      justifyContent: 'center',
      padding: '8px 16px',
      background: 'transparent',
      borderRadius: 8,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', marginRight: 8 }}>
        Round {state.round}
      </span>
      {state.turnOrder.map((entry, idx) => {
        const c = getCombatant(state, entry.combatantId);
        const isCurrent = idx === state.currentTurnIndex;
        const hasActed = entry.hasActed;

        return (
          <div
            key={entry.combatantId}
            ref={setRef(entry.combatantId)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: isCurrent ? 'bold' : 'normal',
              background: isCurrent
                ? '#facc15'
                : hasActed
                  ? '#1e1e2e'
                  : c.side === 'player'
                    ? '#1e3a5f'
                    : '#5f1e1e',
              color: isCurrent ? '#000' : hasActed ? '#555' : '#e2e8f0',
              opacity: hasActed ? 0.5 : 1,
              border: isCurrent ? '1px solid #facc15' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.6 }}>{getEffectiveSpeed(c)}</span>
            {' '}{c.name}
          </div>
        );
      })}
    </div>
  );
}
