import { MapNodeIcon } from './MapNodeIcon';

export type NodeState = 'current' | 'visited' | 'available' | 'locked';

interface Props {
  nodeType: 'spawn' | 'battle' | 'rest' | 'card_removal' | 'act_transition' | 'event' | 'recruit';
  position: { x: number; y: number };
  state: NodeState;
  isBoss: boolean;
  nodeSize?: 'small' | 'normal' | 'large';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const NODE_RADIUS = 24;

const STATE_COLORS: Record<NodeState, string> = {
  current: '#facc15',
  visited: '#22c55e',
  available: '#60a5fa',
  locked: '#555',
};

/**
 * Circular map pin with organic decorative ring.
 * Inspired by Hollow Knight map markers — a simple circle
 * with an irregular hand-drawn outer ring and subtle notch marks.
 */
export function MapNode({
  nodeType,
  position,
  state,
  isBoss,
  nodeSize = 'normal',
  onMouseEnter,
  onMouseLeave,
  onClick,
}: Props) {
  const color = STATE_COLORS[state];
  const sizeScale = nodeSize === 'small' ? 0.7 : nodeSize === 'large' ? 1.3 : 1;
  const scale = isBoss ? 1.2 : sizeScale;
  const r = NODE_RADIUS * scale;
  const fullSize = r * 2 + 16; // padding for ring + glow
  const cx = fullSize / 2;
  const cy = fullSize / 2;
  const isClickable = state === 'available';

  const fillColor = (state === 'current' || state === 'visited')
    ? color + '22'
    : 'rgba(18, 18, 28, 0.7)';

  const iconColor = (state === 'current' || state === 'visited') ? color : color + 'cc';
  const bossColor = isBoss ? '#a855f7' : undefined;
  const strokeColor = bossColor ?? color;

  // Organic ring path — slightly wobbly circle drawn with 8 cubic bezier segments
  const ringR = r + 4;
  const organicRing = makeOrganicCircle(cx, cy, ringR);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: position.x - fullSize / 2,
        top: position.y - fullSize / 2,
        width: fullSize,
        height: fullSize,
        cursor: isClickable ? 'pointer' : 'default',
        filter: state === 'available'
          ? `drop-shadow(0 0 8px ${color}88)`
          : state === 'current'
            ? `drop-shadow(0 0 10px ${color}aa)`
            : 'none',
        animation: state === 'available' ? 'nodeGlowPulse 2s infinite ease-in-out' : undefined,
        transition: 'filter 0.2s',
        zIndex: state === 'available' || state === 'current' ? 10 : 1,
      }}
    >
      <svg
        width={fullSize}
        height={fullSize}
        viewBox={`0 0 ${fullSize} ${fullSize}`}
      >
        {/* Outer decorative ring — organic/hand-drawn feel */}
        <path
          d={organicRing}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.2}
          opacity={state === 'locked' ? 0.3 : 0.6}
        />

        {/* Notch marks at cardinal points */}
        {[0, 90, 180, 270].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const innerR = r - 2;
          const outerR = r + 6;
          return (
            <line
              key={angle}
              x1={cx + innerR * Math.cos(rad)}
              y1={cy + innerR * Math.sin(rad)}
              x2={cx + outerR * Math.cos(rad)}
              y2={cy + outerR * Math.sin(rad)}
              stroke={strokeColor}
              strokeWidth={1.5}
              opacity={state === 'locked' ? 0.2 : 0.5}
            />
          );
        })}

        {/* Main circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isBoss ? 2.5 : 2}
        />

        {/* Inner accent ring for active states */}
        {(state === 'current' || state === 'available') && (
          <circle
            cx={cx}
            cy={cy}
            r={r - 4}
            fill="none"
            stroke={color}
            strokeWidth={0.8}
            opacity={0.3}
            strokeDasharray="3 4"
          />
        )}
      </svg>

      {/* Icon centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <MapNodeIcon
          nodeType={nodeType}
          isBoss={isBoss}
          color={iconColor}
          size={isBoss ? 28 : 24}
        />
      </div>

      <style>{`
        @keyframes nodeGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 4px ${color}55); }
          50% { filter: drop-shadow(0 0 12px ${color}99); }
        }
      `}</style>
    </div>
  );
}

/**
 * Generate a slightly irregular circle path using cubic beziers.
 * Each of the 8 arc segments has a small random wobble baked in
 * (deterministic based on index so it doesn't jitter on re-render).
 */
function makeOrganicCircle(cx: number, cy: number, r: number): string {
  const segments = 8;
  const wobbles = [0.97, 1.03, 0.98, 1.02, 0.99, 1.01, 0.97, 1.04]; // deterministic
  const angleStep = (2 * Math.PI) / segments;
  // Magic number for cubic bezier circle approximation
  const k = (4 / 3) * Math.tan(Math.PI / (2 * segments));

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const w = wobbles[i];
    points.push({
      x: cx + r * w * Math.cos(angle),
      y: cy + r * w * Math.sin(angle),
    });
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < segments; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % segments];
    const a0 = i * angleStep - Math.PI / 2;
    const a1 = (i + 1) * angleStep - Math.PI / 2;
    const w0 = wobbles[i];
    const w1 = wobbles[(i + 1) % segments];

    // Control points tangent to the circle at each endpoint
    const cp1x = p0.x + r * w0 * k * Math.cos(a0 + Math.PI / 2);
    const cp1y = p0.y + r * w0 * k * Math.sin(a0 + Math.PI / 2);
    const cp2x = p1.x - r * w1 * k * Math.cos(a1 + Math.PI / 2);
    const cp2y = p1.y - r * w1 * k * Math.sin(a1 + Math.PI / 2);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  d += ' Z';
  return d;
}
