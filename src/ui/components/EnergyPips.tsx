import { THEME } from '../theme';

interface Props {
  energy: number;
  energyCap: number;
  variant?: 'vessel' | 'pips';
}

/**
 * Energy display in two modes:
 * - 'vessel': Large ornate diamond with numeric readout + "ENERGY" label (next to End Turn)
 * - 'pips': Row of small diamond pips (below player HP bars)
 */
export function EnergyPips({ energy, energyCap, variant = 'pips' }: Props) {
  if (variant === 'vessel') {
    return <EnergyVessel energy={energy} energyCap={energyCap} />;
  }
  return <DiamondPips energy={energy} energyCap={energyCap} />;
}

/* ─── Vessel: ornate energy bank display for End Turn area ─── */

function EnergyVessel({ energy, energyCap }: { energy: number; energyCap: number }) {
  const isFull = energy >= energyCap;
  const isEmpty = energy <= 0;
  const color = THEME.status.energy;
  // Fill level as fraction
  const fillFrac = Math.min(energy / energyCap, 1);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
    }}>
      {/* "ENERGY" label */}
      <span style={{
        fontSize: 9,
        fontWeight: 'bold',
        color: isEmpty ? THEME.text.tertiary : `${color}aa`,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: 2,
      }}>
        Energy
      </span>

      {/* Large diamond vessel with number inside */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute' }}>
          <defs>
            <filter id="vessel-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="vessel-inner-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Clip path for fill level effect */}
            <clipPath id="vessel-fill-clip">
              <rect x="0" y={56 * (1 - fillFrac)} width="56" height={56 * fillFrac} />
            </clipPath>
          </defs>

          {/* Outer diamond — dark recess with thicker border */}
          <path
            d="M28 3 L51 28 L28 53 L5 28 Z"
            fill={THEME.bg.panelDark}
            stroke={isEmpty ? THEME.border.medium : color}
            strokeWidth="1.5"
            opacity={isEmpty ? 0.5 : 1}
          />

          {/* Middle diamond — structural edge */}
          <path
            d="M28 7 L47 28 L28 49 L9 28 Z"
            fill="none"
            stroke={isEmpty ? `${THEME.border.subtle}66` : `${color}25`}
            strokeWidth="0.6"
          />

          {/* Inner diamond — fill level indicator */}
          <path
            d="M28 10 L44 28 L28 46 L12 28 Z"
            fill={isEmpty ? 'transparent' : `${color}12`}
            stroke="none"
          />
          {/* Filled portion — clipped to fill level */}
          {!isEmpty && (
            <path
              d="M28 10 L44 28 L28 46 L12 28 Z"
              fill={isFull ? `${color}35` : `${color}22`}
              stroke="none"
              clipPath="url(#vessel-fill-clip)"
              filter="url(#vessel-inner-glow)"
            />
          )}

          {/* Corner accents — ornate notch marks */}
          <line x1="28" y1="5" x2="28" y2="11" stroke={isEmpty ? THEME.border.subtle : `${color}55`} strokeWidth="0.7" />
          <line x1="49" y1="28" x2="43" y2="28" stroke={isEmpty ? THEME.border.subtle : `${color}55`} strokeWidth="0.7" />
          <line x1="28" y1="51" x2="28" y2="45" stroke={isEmpty ? THEME.border.subtle : `${color}55`} strokeWidth="0.7" />
          <line x1="7" y1="28" x2="13" y2="28" stroke={isEmpty ? THEME.border.subtle : `${color}55`} strokeWidth="0.7" />

          {/* Diagonal accent lines in corners for extra detail */}
          <line x1="15" y1="13" x2="18" y2="16" stroke={isEmpty ? 'transparent' : `${color}22`} strokeWidth="0.5" />
          <line x1="41" y1="13" x2="38" y2="16" stroke={isEmpty ? 'transparent' : `${color}22`} strokeWidth="0.5" />
          <line x1="15" y1="43" x2="18" y2="40" stroke={isEmpty ? 'transparent' : `${color}22`} strokeWidth="0.5" />
          <line x1="41" y1="43" x2="38" y2="40" stroke={isEmpty ? 'transparent' : `${color}22`} strokeWidth="0.5" />

          {/* Outer glow ring when not empty */}
          {!isEmpty && (
            <path
              d="M28 3 L51 28 L28 53 L5 28 Z"
              fill="none"
              stroke={`${color}20`}
              strokeWidth="3"
              filter="url(#vessel-glow)"
            />
          )}
        </svg>

        {/* Energy number */}
        <span style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 22,
          fontWeight: 'bold',
          color: isEmpty ? THEME.text.tertiary : isFull ? '#a0c4f0' : color,
          textShadow: isEmpty ? 'none' : `0 0 10px ${color}88`,
          lineHeight: 1,
        }}>
          {energy}
        </span>
      </div>

      {/* Max energy label */}
      <span style={{
        fontSize: 11,
        color: THEME.text.tertiary,
        letterSpacing: '0.05em',
        marginTop: 1,
      }}>
        / {energyCap}
      </span>
    </div>
  );
}

/* ─── Diamond Pips: row of small diamond shapes below HP bar ─── */

function DiamondPips({ energy, energyCap }: { energy: number; energyCap: number }) {
  const color = THEME.status.energy;
  // Each pip is a small diamond
  const pipSize = 10;
  const pipGap = 2;
  const totalWidth = energyCap * pipSize + (energyCap - 1) * pipGap;
  const svgHeight = pipSize + 4;

  return (
    <svg
      width={totalWidth}
      height={svgHeight}
      viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      fill="none"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="pip-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: energyCap }, (_, i) => {
        const cx = i * (pipSize + pipGap) + pipSize / 2;
        const cy = svgHeight / 2;
        const half = pipSize / 2;
        const filled = i < energy;

        // Diamond path centered at (cx, cy)
        const d = `M${cx} ${cy - half} L${cx + half} ${cy} L${cx} ${cy + half} L${cx - half} ${cy} Z`;

        return (
          <path
            key={i}
            d={d}
            fill={filled ? `${color}55` : `${THEME.border.subtle}33`}
            stroke={filled ? `${color}88` : `${THEME.border.subtle}55`}
            strokeWidth={0.8}
            filter={filled ? 'url(#pip-glow)' : undefined}
          />
        );
      })}
    </svg>
  );
}
