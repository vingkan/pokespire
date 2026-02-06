import { useState } from 'react';
import type { StatusInstance } from '../../engine/types';

const STATUS_INFO: Record<string, { icon: string; color: string; describe: (stacks: number, duration?: number) => string }> = {
  burn: {
    icon: '🔥', color: '#ef4444',
    describe: (s) => `Deals ${s} damage at start of turn (bypasses Block). Loses 1 stack each turn.`,
  },
  poison: {
    icon: '☠️', color: '#a855f7',
    describe: (s) => `Deals ${s} damage at end of turn (bypasses Block). Gains 1 stack each turn. Never expires.`,
  },
  paralysis: {
    icon: '⚡', color: '#facc15',
    describe: (s) => `Reduces speed by ${s}. Permanent until cleansed.`,
  },
  slow: {
    icon: '🐌', color: '#6b7280',
    describe: (s, d) => `Reduces speed by ${s}. ${d} round${d !== 1 ? 's' : ''} remaining.`,
  },
  enfeeble: {
    icon: '💔', color: '#f97316',
    describe: (s) => `This unit deals ${s} less damage (min 1). Removed at end of round.`,
  },
  sleep: {
    icon: '💤', color: '#818cf8',
    describe: (s) => `Skips turn entirely. ${s} turn${s !== 1 ? 's' : ''} remaining.`,
  },
  leech: {
    icon: '🌿', color: '#22c55e',
    describe: (s) => `Takes ${s} damage at start of source's turn (bypasses Block). Heals source. Loses 2 stacks each turn.`,
  },
  evasion: {
    icon: '💨', color: '#67e8f9',
    describe: (s) => `Reduces incoming damage by ${s} (before Block). Permanent.`,
  },
  strength: {
    icon: '💪', color: '#ef4444',
    describe: (s) => `Increases damage dealt by ${s}. Loses 1 stack each turn.`,
  },
  haste: {
    icon: '💨', color: '#22d3ee',
    describe: (s) => `Increases speed by ${s}. Loses 1 stack each turn.`,
  },
};

interface Props {
  statuses: StatusInstance[];
}

export function StatusIcons({ statuses }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (statuses.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
      {statuses.map((s, i) => {
        const info = STATUS_INFO[s.type] || { icon: '?', color: '#888', describe: () => 'Unknown effect.' };
        return (
          <div
            key={`${s.type}-${i}`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              background: info.color + '33',
              border: `1px solid ${info.color}`,
              borderRadius: 4,
              padding: '1px 4px',
              fontSize: 14,
              color: '#fff',
              whiteSpace: 'nowrap',
              cursor: 'help',
              position: 'relative',
            }}
          >
            {info.icon} {s.stacks}
            {hoveredIdx === i && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 6,
                background: '#1e1e2e',
                border: `1px solid ${info.color}`,
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 14,
                lineHeight: '1.4',
                color: '#e2e8f0',
                whiteSpace: 'normal',
                width: 200,
                textAlign: 'center',
                zIndex: 100,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2, color: info.color }}>
                  {s.type.charAt(0).toUpperCase() + s.type.slice(1)} {s.stacks}
                </div>
                {info.describe(s.stacks, s.duration)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
