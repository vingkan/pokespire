interface Props {
  nodeType: 'spawn' | 'battle' | 'rest' | 'card_removal' | 'act_transition' | 'event' | 'recruit';
  isBoss?: boolean;
  color: string;
  size?: number;
}

export function MapNodeIcon({ nodeType, isBoss, color, size = 32 }: Props) {
  const main = color;
  const faint = color + '66'; // ~40%
  const subtle = color + '33'; // ~20%

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ display: 'block' }}
    >
      {renderIcon(nodeType, !!isBoss, main, faint, subtle)}
    </svg>
  );
}

function renderIcon(
  nodeType: string,
  isBoss: boolean,
  main: string,
  faint: string,
  subtle: string,
) {
  if (isBoss) {
    // Skull icon
    return (
      <g>
        <circle cx="16" cy="13" r="8" stroke={main} strokeWidth="1.5" fill={subtle} />
        <circle cx="13" cy="12" r="2" fill={main} opacity={0.8} />
        <circle cx="19" cy="12" r="2" fill={main} opacity={0.8} />
        <path d="M12 17 L14 15 L16 17 L18 15 L20 17" stroke={main} strokeWidth="1.2" fill="none" />
        <line x1="13" y1="21" x2="13" y2="26" stroke={faint} strokeWidth="1" />
        <line x1="16" y1="21" x2="16" y2="27" stroke={faint} strokeWidth="1" />
        <line x1="19" y1="21" x2="19" y2="26" stroke={faint} strokeWidth="1" />
      </g>
    );
  }

  switch (nodeType) {
    case 'spawn':
      // Flag / map pin
      return (
        <g>
          <line x1="12" y1="6" x2="12" y2="27" stroke={main} strokeWidth="1.5" />
          <path d="M12 6 L24 10 L12 14" stroke={main} strokeWidth="1.2" fill={subtle} />
          <path d="M12 10 L20 12" stroke={faint} strokeWidth="0.8" />
          <circle cx="12" cy="27" r="2" fill={faint} />
        </g>
      );

    case 'battle':
      // Crossed swords
      return (
        <g>
          <line x1="8" y1="8" x2="24" y2="24" stroke={main} strokeWidth="1.5" />
          <line x1="24" y1="8" x2="8" y2="24" stroke={main} strokeWidth="1.5" />
          {/* Sword guards */}
          <line x1="6" y1="10" x2="10" y2="6" stroke={faint} strokeWidth="1.2" />
          <line x1="22" y1="6" x2="26" y2="10" stroke={faint} strokeWidth="1.2" />
          {/* Pommel dots */}
          <circle cx="7" cy="25" r="1.5" fill={faint} />
          <circle cx="25" cy="25" r="1.5" fill={faint} />
          {/* Clash spark */}
          <circle cx="16" cy="16" r="2" fill={main} opacity={0.5} />
        </g>
      );

    case 'rest':
      // Campfire
      return (
        <g>
          {/* Log base */}
          <line x1="8" y1="25" x2="24" y2="25" stroke={faint} strokeWidth="1.5" />
          <line x1="10" y1="27" x2="22" y2="27" stroke={subtle} strokeWidth="1" />
          {/* Flame */}
          <path d="M16 24 Q14 18 16 12 Q18 18 16 24" stroke={main} strokeWidth="1.5" fill={subtle} />
          <path d="M16 12 Q14 8 16 5 Q18 8 16 12" stroke={main} strokeWidth="1" fill={faint} />
          {/* Sparks */}
          <circle cx="12" cy="16" r="1" fill={faint} />
          <circle cx="20" cy="14" r="1" fill={faint} />
        </g>
      );

    case 'card_removal':
      // Scissors
      return (
        <g>
          {/* Left blade */}
          <path d="M10 8 L18 18" stroke={main} strokeWidth="1.5" fill="none" />
          <circle cx="9" cy="7" r="3" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Right blade */}
          <path d="M22 8 L14 18" stroke={main} strokeWidth="1.5" fill="none" />
          <circle cx="23" cy="7" r="3" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Pivot */}
          <circle cx="16" cy="16" r="1.5" fill={main} opacity={0.7} />
          {/* Handle lines */}
          <line x1="14" y1="18" x2="10" y2="26" stroke={faint} strokeWidth="1.2" />
          <line x1="18" y1="18" x2="22" y2="26" stroke={faint} strokeWidth="1.2" />
        </g>
      );

    case 'act_transition':
      // Ornate arrow / portal
      return (
        <g>
          {/* Arrow shaft */}
          <line x1="6" y1="16" x2="22" y2="16" stroke={main} strokeWidth="1.5" />
          {/* Arrowhead */}
          <path d="M20 10 L28 16 L20 22" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Decorative flourishes */}
          <path d="M8 12 Q6 16 8 20" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M4 14 Q2 16 4 18" stroke={subtle} strokeWidth="0.8" fill="none" />
          <circle cx="28" cy="16" r="1.5" fill={main} opacity={0.6} />
        </g>
      );

    case 'event':
      // Question mark icon
      return (
        <g>
          <path d="M13 10 Q13 6 16 6 Q19 6 19 10 Q19 13 16 14" stroke={main} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="19" r="1.5" fill={main} />
          {/* Decorative sparkles */}
          <circle cx="10" cy="8" r="1" fill={faint} />
          <circle cx="22" cy="12" r="1" fill={faint} />
        </g>
      );

    case 'recruit':
      // Pokeball icon
      return (
        <g>
          {/* Ball outline */}
          <circle cx="16" cy="16" r="9" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Center line */}
          <line x1="7" y1="16" x2="25" y2="16" stroke={main} strokeWidth="1.5" />
          {/* Center button */}
          <circle cx="16" cy="16" r="3" stroke={main} strokeWidth="1.5" fill={faint} />
          <circle cx="16" cy="16" r="1.5" fill={main} />
        </g>
      );

    default:
      return <circle cx="16" cy="16" r="4" fill={main} />;
  }
}
