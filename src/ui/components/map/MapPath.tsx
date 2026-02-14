export type PathState = 'visited' | 'available' | 'locked';

interface Props {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  state: PathState;
}

export function MapPath({ fromPos, toPos, state }: Props) {
  // Cubic Bezier with control points at 40% horizontal offset
  const dx = toPos.x - fromPos.x;
  const cpOffset = dx * 0.4;
  const d = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + cpOffset} ${fromPos.y}, ${toPos.x - cpOffset} ${toPos.y}, ${toPos.x} ${toPos.y}`;

  if (state === 'visited') {
    return (
      <path
        d={d}
        stroke="#d4c9a8"
        strokeWidth={2.5}
        fill="none"
        opacity={0.5}
      />
    );
  }

  if (state === 'available') {
    return (
      <g>
        {/* Glow underlay */}
        <path
          d={d}
          stroke="#60a5fa"
          strokeWidth={4}
          fill="none"
          opacity={0.15}
        />
        {/* Marching dashes */}
        <path
          d={d}
          stroke="#60a5fa"
          strokeWidth={2.5}
          fill="none"
          opacity={0.7}
          strokeDasharray="8 6"
          style={{ animation: 'pathMarch 1.2s linear infinite' }}
        />
        <style>{`
          @keyframes pathMarch {
            to { stroke-dashoffset: -14; }
          }
        `}</style>
      </g>
    );
  }

  // Locked — faint solid line showing the route
  return (
    <path
      d={d}
      stroke="#8895a7"
      strokeWidth={1.5}
      fill="none"
      opacity={0.18}
    />
  );
}
