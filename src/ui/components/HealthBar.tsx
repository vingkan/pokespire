import { THEME } from '../theme';

interface Props {
  current: number;
  max: number;
  /** Skew angle for parallelogram shape (default 0, use ±11 to match status badges) */
  skewAngle?: number;
}

export function HealthBar({ current, max, skewAngle = 0 }: Props) {
  const pct = Math.max(0, (current / max) * 100);
  const counterSkew = -skewAngle;

  // Darkened green, warmed amber/red — subtle left-to-right gradient for depth
  const fill = pct > 50
    ? 'linear-gradient(to right, #1a6b4a, #237a55, #1a6b4a)'
    : pct > 25
      ? 'linear-gradient(to right, #a07818, #c49520, #a07818)'
      : 'linear-gradient(to right, #8a2828, #a83030, #8a2828)';

  const accentColor = pct > 50 ? '#237a55' : pct > 25 ? '#c49520' : '#a83030';

  return (
    <div style={{
      transform: skewAngle ? `skewX(${skewAngle}deg)` : undefined,
    }}>
      <div style={{
        width: '100%',
        height: 16,
        background: THEME.chrome.backdrop,
        overflow: 'hidden',
        borderLeft: `2px solid ${accentColor}`,
        borderRight: `1px solid ${THEME.border.subtle}`,
        borderTop: `1px solid ${THEME.border.subtle}`,
        borderBottom: `1px solid ${THEME.border.subtle}`,
        position: 'relative',
      }}>
        {/* HP fill */}
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: fill,
          transition: 'width 0.3s ease',
          position: 'relative',
        }}>
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(255,255,255,0.15)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Numeric readout — counter-skew to stay readable */}
        <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          lineHeight: '16px',
          color: THEME.text.primary,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.03em',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          transform: counterSkew ? `skewX(${counterSkew}deg)` : undefined,
        }}>
          {current}/{max}
        </span>
      </div>
    </div>
  );
}
