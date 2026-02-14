import { useState } from 'react';
import type { StatusInstance } from '../../engine/types';
import { THEME } from '../theme';

// ── SVG line-art icons (12×12 viewBox, rendered at 16×16) ──────────
// Minimal strokes matching the CardTypeMotif / DexFrame design language.

function BurnIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Multi-pointed flame with 3 tongues */}
      <path d="M6 1 C6 1 4.2 3.5 3.5 5.5 C3 7 3.5 8 4 8.5 C4 7.5 4.5 6.5 5 6 C4.5 8 4.5 9.5 6 10.5 C7.5 9.5 7.5 8 7 6 C7.5 6.5 8 7.5 8 8.5 C8.5 8 9 7 8.5 5.5 C7.8 3.5 6 1 6 1Z" stroke={color} strokeWidth="1" strokeLinejoin="round" fill={color + '30'} />
      <path d="M6 5.5 C5.5 7 5.5 8.5 6 9.5 C6.5 8.5 6.5 7 6 5.5Z" fill={color + '55'} />
    </svg>
  );
}

function PoisonIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Skull: cranium + jaw */}
      <path d="M3 5.5 C3 3 4.2 1.5 6 1.5 C7.8 1.5 9 3 9 5.5 C9 6.8 8.3 7.5 7.5 7.5 L4.5 7.5 C3.7 7.5 3 6.8 3 5.5Z" stroke={color} strokeWidth="1" fill={color + '20'} />
      {/* Eye sockets */}
      <circle cx="4.8" cy="4.8" r="0.9" fill={color} />
      <circle cx="7.2" cy="4.8" r="0.9" fill={color} />
      {/* Nose */}
      <path d="M5.5 6.2 L6 6.8 L6.5 6.2" stroke={color} strokeWidth="0.6" strokeLinecap="round" fill="none" />
      {/* Teeth / jaw */}
      <path d="M4.5 7.5 L4.5 9 L5.3 8.2 L6 9 L6.7 8.2 L7.5 9 L7.5 7.5" stroke={color} strokeWidth="0.8" strokeLinejoin="round" fill={color + '15'} />
    </svg>
  );
}

function ParalysisIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      <path d="M7 1.5 L5 5.5 L7.5 5.5 L4.5 10.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SlowIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Shackle: U-shaped cuff with crossbar */}
      <path d="M3 4 L3 7.5 C3 9.5 4.3 10.5 6 10.5 C7.7 10.5 9 9.5 9 7.5 L9 4" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <line x1="2" y1="4" x2="10" y2="4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Keyhole dot */}
      <circle cx="6" cy="7.5" r="0.8" fill={color + '66'} />
    </svg>
  );
}

function EnfeebleIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Broken blade stub */}
      <path d="M6 3.5 L7 6 L6 6.8 L5 6Z" stroke={color} strokeWidth="0.9" strokeLinejoin="round" fill={color + '25'} />
      {/* Jagged break at top */}
      <path d="M5.2 3.8 L5.8 2.8 L6.3 4 L7 3.2" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Crossguard */}
      <line x1="3.5" y1="7" x2="8.5" y2="7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Grip */}
      <line x1="6" y1="7" x2="6" y2="9.5" stroke={color + '66'} strokeWidth="1.1" strokeLinecap="round" />
      {/* Pommel */}
      <circle cx="6" cy="10.2" r="0.7" fill={color} />
    </svg>
  );
}

function SleepIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      <path d="M8 2.5 C5 2.5 3.5 5 3.5 7 C3.5 8 4.5 9.5 6.5 9.5 C8 9.5 9 8.5 9 7.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill={color + '15'} />
      <circle cx="8.5" cy="3.5" r="0" fill="none" />
      <path d="M7.5 3 C8.5 3.5 9 4.5 8.5 5.5" stroke={color + '55'} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function LeechIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Curved leaf tilted to the right with bent midrib */}
      <path d="M5 10 C4 8 3 5.5 4 3.5 C5 1.5 7.5 1 9.5 2 C8 3 6.5 4.5 5.5 6.5 C4.8 8 5 10 5 10Z" stroke={color} strokeWidth="1" strokeLinejoin="round" fill={color + '20'} />
      {/* Curved midrib vein */}
      <path d="M5 10 C5.5 7.5 6.5 5 9 2.5" stroke={color + '55'} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Small stem */}
      <path d="M5 10 L4 11" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function EvasionIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      <path d="M2 8 Q4 4 6 6 Q8 8 10 4" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="3" cy="3.5" r="0.7" fill={color + '66'} />
      <circle cx="9.5" cy="2.5" r="0.5" fill={color + '44'} />
    </svg>
  );
}

function StrengthIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      {/* Blade */}
      <path d="M6 1 L7 6.5 L6 7.5 L5 6.5Z" stroke={color} strokeWidth="0.9" strokeLinejoin="round" fill={color + '25'} />
      {/* Crossguard */}
      <line x1="3.5" y1="7.5" x2="8.5" y2="7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Grip */}
      <line x1="6" y1="7.5" x2="6" y2="10" stroke={color + '66'} strokeWidth="1.1" strokeLinecap="round" />
      {/* Pommel */}
      <circle cx="6" cy="10.5" r="0.7" fill={color} />
    </svg>
  );
}

function HasteIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none" style={{ transform: 'rotate(-15deg)' }}>
      {/* Running shoe/boot tilted forward */}
      {/* Sole */}
      <path d="M2 9.5 L9 8 L10 8.5 L10 9.5 L2 10.5Z" stroke={color} strokeWidth="0.9" strokeLinejoin="round" fill={color + '25'} />
      {/* Upper / ankle */}
      <path d="M3 9.8 L4 5 L6.5 4 L8.5 4.5 L9 8" stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" fill={color + '15'} />
      {/* Tongue / opening */}
      <path d="M5 5 L5.5 3" stroke={color + '55'} strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}

function TauntIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      <line x1="6" y1="2" x2="6" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="9.5" r="1" fill={color} />
    </svg>
  );
}

// ── Status definitions ─────────────────────────────────────────────

const STATUS_INFO: Record<string, {
  Icon: React.FC<{ color: string }>;
  color: string;
  label: string;
  describe: (stacks: number, duration?: number) => string;
}> = {
  burn: {
    Icon: BurnIcon, color: '#ef4444', label: 'Burn',
    describe: (s) => `Deals ${s} damage at start of turn (bypasses Block). Loses 1 stack each turn.`,
  },
  poison: {
    Icon: PoisonIcon, color: '#a855f7', label: 'Poison',
    describe: (s) => `Deals ${s} damage at end of turn (bypasses Block). Gains 1 stack each turn. Never expires.`,
  },
  paralysis: {
    Icon: ParalysisIcon, color: '#facc15', label: 'Paralysis',
    describe: (s) => `Reduces speed by ${s}. Loses 1 stack each turn.`,
  },
  slow: {
    Icon: SlowIcon, color: '#6b7280', label: 'Slow',
    describe: (s, d) => `Reduces speed by ${s}. ${d} round${d !== 1 ? 's' : ''} remaining.`,
  },
  enfeeble: {
    Icon: EnfeebleIcon, color: '#f97316', label: 'Enfeeble',
    describe: (s) => `This unit deals ${s} less damage (min 1). Removed at end of round.`,
  },
  sleep: {
    Icon: SleepIcon, color: '#818cf8', label: 'Sleep',
    describe: (s) => `Drowsy: loses 1 energy per turn. ${s} turn${s !== 1 ? 's' : ''} remaining.`,
  },
  leech: {
    Icon: LeechIcon, color: '#22c55e', label: 'Leech',
    describe: (s) => `Takes ${s} damage at start of source's turn (bypasses Block). Heals source. Loses 2 stacks each turn.`,
  },
  evasion: {
    Icon: EvasionIcon, color: '#67e8f9', label: 'Evasion',
    describe: (s) => `Reduces incoming damage by ${s} (before Block). Permanent.`,
  },
  strength: {
    Icon: StrengthIcon, color: '#ef4444', label: 'Strength',
    describe: (s) => `Increases damage dealt by ${s}. Loses 1 stack each turn.`,
  },
  haste: {
    Icon: HasteIcon, color: '#22d3ee', label: 'Haste',
    describe: (s) => `Increases speed by ${s}. Loses 1 stack each turn.`,
  },
  taunt: {
    Icon: TauntIcon, color: '#dc2626', label: 'Taunt',
    describe: (s) => `Forces enemies to target this unit when possible. Can only play attack cards. ${s} round${s !== 1 ? 's' : ''} remaining.`,
  },
};

const FALLBACK = {
  Icon: ({ color }: { color: string }) => (
    <svg width={16} height={16} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="3" stroke={color} strokeWidth="1" />
    </svg>
  ),
  color: '#888',
  label: '???',
  describe: () => 'Unknown effect.',
};

// ── Components ─────────────────────────────────────────────────────

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
  const info = STATUS_INFO[status.type] || FALLBACK;
  const { Icon, color, label } = info;
  const isHovered = hoveredIdx === index;

  return (
    <div
      onMouseEnter={() => setHoveredIdx(index)}
      onMouseLeave={() => setHoveredIdx(null)}
      style={{
        background: THEME.chrome.backdrop,
        borderLeft: `2px solid ${color}`,
        borderRight: `1px solid ${THEME.border.subtle}`,
        borderTop: `1px solid ${THEME.border.subtle}`,
        borderBottom: `1px solid ${THEME.border.subtle}`,
        padding: '2px 7px 2px 5px',
        fontSize: 13,
        fontWeight: 600,
        color: THEME.text.primary,
        whiteSpace: 'nowrap',
        cursor: 'help',
        position: 'relative',
        letterSpacing: '0.02em',
        transition: 'border-color 0.15s',
        ...(isHovered ? { borderColor: color + '88' } : {}),
      }}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        transform: `skewX(${counterSkew}deg)`,
      }}>
        <Icon color={color} />
        <span style={{ color: color, fontVariantNumeric: 'tabular-nums' }}>{status.stacks}</span>
      </span>

      {/* ── Tooltip ── */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: `translateX(-50%) skewX(${counterSkew}deg)`,
          marginBottom: 8,
          background: THEME.bg.panel,
          border: `1px solid ${THEME.border.medium}`,
          borderLeft: `2px solid ${color}`,
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: '1.4',
          color: THEME.text.primary,
          whiteSpace: 'normal',
          width: 210,
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            fontWeight: 700,
            marginBottom: 3,
            color,
            fontSize: 12,
            ...THEME.heading,
          }}>
            {label} {status.stacks}
          </div>
          <div style={{ color: THEME.text.secondary, fontSize: 12, lineHeight: '1.45' }}>
            {info.describe(status.stacks, status.duration)}
          </div>
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
