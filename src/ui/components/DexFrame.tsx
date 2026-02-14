import { THEME } from '../theme';

// ── Dex Frame — electronic database panel with beveled corners ──────
//
// Layout: beveled (diagonal-cut) corners connected by thin edge lines,
// diamond nodes at each junction, crosshair ticks at edge midpoints,
// and a faint inner scan-line near the top for a data-readout feel.

const FC = THEME.border.subtle;   // frame color
const FC2 = THEME.border.medium;  // accent (nodes, ticks)
const BV = 10;                    // bevel size (corner diagonal)

type Corner = 'tl' | 'tr' | 'bl' | 'br';

function BevelCorner({ pos }: { pos: Corner }) {
  const s = BV + 1;
  // "/" diagonal for TL & BR, "\" diagonal for TR & BL
  const slash = pos === 'tl' || pos === 'br';
  const line = slash
    ? { x1: 0.5, y1: BV + 0.5, x2: BV + 0.5, y2: 0.5 }
    : { x1: 0.5, y1: 0.5, x2: BV + 0.5, y2: BV + 0.5 };

  // Diamond at the diagonal midpoint
  const cx = s / 2;
  const cy = s / 2;
  const d = 2.2;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    ...(pos.includes('t') ? { top: -0.5 } : { bottom: -0.5 }),
    ...(pos.includes('l') ? { left: -0.5 } : { right: -0.5 }),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" style={posStyle}>
      <line {...line} stroke={FC} strokeWidth="1" />
      <path
        d={`M${cx} ${cy - d} L${cx + d} ${cy} L${cx} ${cy + d} L${cx - d} ${cy} Z`}
        fill={FC2}
      />
    </svg>
  );
}

function EdgeTick({ axis, side }: { axis: 'h' | 'v'; side: 'start' | 'end' }) {
  const len = 6;
  const style: React.CSSProperties = {
    position: 'absolute',
    background: FC,
    pointerEvents: 'none',
  };

  if (axis === 'h') {
    return <div style={{
      ...style,
      width: 1,
      height: len,
      left: '50%',
      marginLeft: -0.5,
      ...(side === 'start' ? { top: -Math.floor(len / 2) } : { bottom: -Math.floor(len / 2) }),
    }} />;
  }
  return <div style={{
    ...style,
    height: 1,
    width: len,
    top: '50%',
    marginTop: -0.5,
    ...(side === 'start' ? { left: -Math.floor(len / 2) } : { right: -Math.floor(len / 2) }),
  }} />;
}

export function DexFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* ── Edge lines (between beveled corners) ── */}
      <div style={{ position: 'absolute', top: 0, left: BV, right: BV, height: 1, background: FC }} />
      <div style={{ position: 'absolute', bottom: 0, left: BV, right: BV, height: 1, background: FC }} />
      <div style={{ position: 'absolute', left: 0, top: BV, bottom: BV, width: 1, background: FC }} />
      <div style={{ position: 'absolute', right: 0, top: BV, bottom: BV, width: 1, background: FC }} />

      {/* ── Beveled corners with diamond nodes ── */}
      <BevelCorner pos="tl" />
      <BevelCorner pos="tr" />
      <BevelCorner pos="bl" />
      <BevelCorner pos="br" />

      {/* ── Mid-edge crosshair ticks ── */}
      <EdgeTick axis="h" side="start" />
      <EdgeTick axis="h" side="end" />
      <EdgeTick axis="v" side="start" />
      <EdgeTick axis="v" side="end" />

      {/* ── Inner scan-line accent (top) ── */}
      <div style={{
        position: 'absolute',
        top: 5,
        left: BV + 12,
        right: BV + 12,
        height: 1,
        background: `${FC}50`,
        pointerEvents: 'none',
      }} />

      {children}
    </div>
  );
}
