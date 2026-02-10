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
    describe: (s) => `Reduces speed by ${s}. Loses 1 stack each turn.`,
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
  /** Max statuses per column before wrapping to a new column (default 3) */
  maxPerColumn?: number;
  /** Skew angle applied to the container — text is counter-skewed by the negative (default 11) */
  skewAngle?: number;
}

function StatusBadge({ status, index, hoveredIdx, setHoveredIdx, counterSkew }: {
  status: StatusInstance;
  index: number;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
  counterSkew: number;
}) {
  const info = STATUS_INFO[status.type] || { icon: '?', color: '#888', describe: () => 'Unknown effect.' };
  return (
    <div
      onMouseEnter={() => setHoveredIdx(index)}
      onMouseLeave={() => setHoveredIdx(null)}
      style={{
        background: info.color + '33',
        border: `1px solid ${info.color}`,
        borderRadius: 2,
        padding: '1px 6px',
        fontSize: 14,
        color: '#fff',
        whiteSpace: 'nowrap',
        cursor: 'help',
        position: 'relative',
      }}
    >
      <span style={{ display: 'inline-block', transform: `skewX(${counterSkew}deg)` }}>
        {info.icon} {status.stacks}
      </span>
      {hoveredIdx === index && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: `translateX(-50%) skewX(${counterSkew}deg)`,
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
            {status.type.charAt(0).toUpperCase() + status.type.slice(1)} {status.stacks}
          </div>
          {info.describe(status.stacks, status.duration)}
        </div>
      )}
    </div>
  );
}

export function StatusIcons({ statuses, maxPerColumn = 3, skewAngle = 11 }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const counterSkew = -skewAngle;

  if (statuses.length === 0) return null;

  // Chunk statuses into columns
  const columns: StatusInstance[][] = [];
  for (let i = 0; i < statuses.length; i += maxPerColumn) {
    columns.push(statuses.slice(i, i + maxPerColumn));
  }

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {columns.map((col, colIdx) => (
        <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {col.map((s, i) => {
            const globalIdx = colIdx * maxPerColumn + i;
            return (
              <StatusBadge
                key={`${s.type}-${globalIdx}`}
                status={s}
                index={globalIdx}
                hoveredIdx={hoveredIdx}
                setHoveredIdx={setHoveredIdx}
                counterSkew={counterSkew}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
