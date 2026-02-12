/**
 * Item-specific SVG motifs for shop item cards.
 * Each item gets a unique icon inspired by the original Pokemon games.
 */

interface Props {
  itemId: string;
  width?: number;
  height?: number;
}

export function ItemMotif({ itemId, width = 130, height = 40 }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 130 40"
      fill="none"
      style={{ display: 'block' }}
    >
      {renderItemIcon(itemId)}
    </svg>
  );
}

function renderItemIcon(id: string) {
  switch (id) {

    case 'potion':
      // Classic purple spray bottle
      return (
        <g>
          {/* Bottle body */}
          <rect x="55" y="16" width="16" height="20" rx="3" fill="#7c3aed" opacity={0.25} stroke="#a78bfa" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="58" y="11" width="10" height="6" rx="1.5" fill="#7c3aed" opacity={0.2} stroke="#a78bfa" strokeWidth="0.8" />
          {/* Cap */}
          <rect x="57" y="8" width="12" height="4" rx="2" fill="#a78bfa" opacity={0.5} stroke="#a78bfa" strokeWidth="1" />
          {/* Trigger nozzle */}
          <path d="M71 13 L77 13 L77 17 L73 17" stroke="#a78bfa" strokeWidth="0.8" fill="#7c3aed" opacity={0.15} />
          {/* Label cross */}
          <line x1="63" y1="22" x2="63" y2="30" stroke="#a78bfa" strokeWidth="1.2" opacity={0.6} />
          <line x1="59" y1="26" x2="67" y2="26" stroke="#a78bfa" strokeWidth="1.2" opacity={0.6} />
          {/* Spray mist */}
          <circle cx="82" cy="11" r="1.2" fill="#a78bfa" opacity={0.4} />
          <circle cx="85" cy="14" r="0.8" fill="#a78bfa" opacity={0.3} />
          <circle cx="80" cy="15" r="0.6" fill="#a78bfa" opacity={0.25} />
          {/* Sparkle */}
          <path d="M46 20 L48 18 L50 20 L48 22 Z" stroke="#a78bfa" strokeWidth="0.5" fill="none" opacity={0.4} />
        </g>
      );

    case 'super-potion':
      // Larger gold/orange spray bottle — premium look
      return (
        <g>
          {/* Bottle body — taller */}
          <rect x="53" y="14" width="18" height="22" rx="3" fill="#f59e0b" opacity={0.2} stroke="#fbbf24" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="57" y="9" width="10" height="6" rx="1.5" fill="#f59e0b" opacity={0.15} stroke="#fbbf24" strokeWidth="0.8" />
          {/* Cap */}
          <rect x="56" y="6" width="12" height="4" rx="2" fill="#fbbf24" opacity={0.5} stroke="#fbbf24" strokeWidth="1" />
          {/* Trigger nozzle */}
          <path d="M71 11 L78 11 L78 15 L73 15" stroke="#fbbf24" strokeWidth="0.8" fill="#f59e0b" opacity={0.15} />
          {/* Double cross label */}
          <line x1="62" y1="20" x2="62" y2="30" stroke="#fbbf24" strokeWidth="1.2" opacity={0.6} />
          <line x1="57" y1="25" x2="67" y2="25" stroke="#fbbf24" strokeWidth="1.2" opacity={0.6} />
          {/* Star accent */}
          <path d="M62 17 L63 15.5 L64 17 L63 18.5 Z" fill="#fbbf24" opacity={0.5} />
          {/* Spray mist */}
          <circle cx="83" cy="9" r="1.3" fill="#fbbf24" opacity={0.35} />
          <circle cx="86" cy="12" r="1" fill="#fbbf24" opacity={0.25} />
          <circle cx="81" cy="13" r="0.7" fill="#fbbf24" opacity={0.2} />
          {/* Sparkles */}
          <path d="M44" y1="22" />
          <path d="M44 22 L45.5 20 L47 22 L45.5 24 Z" stroke="#fbbf24" strokeWidth="0.5" fill="none" opacity={0.4} />
          <path d="M84 20 L85 19 L86 20 L85 21 Z" stroke="#fbbf24" strokeWidth="0.4" fill="none" opacity={0.3} />
        </g>
      );

    case 'full-heal':
      // Yellow-green bottle with medical cross
      return (
        <g>
          {/* Bottle body — round */}
          <ellipse cx="63" cy="26" rx="11" ry="12" fill="#22c55e" opacity={0.15} stroke="#4ade80" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="59" y="10" width="8" height="6" rx="1.5" fill="#22c55e" opacity={0.15} stroke="#4ade80" strokeWidth="0.8" />
          {/* Cap */}
          <rect x="58" y="7" width="10" height="4" rx="2" fill="#4ade80" opacity={0.5} stroke="#4ade80" strokeWidth="1" />
          {/* Medical cross — prominent */}
          <rect x="60" y="20" width="6" height="14" rx="1" fill="#4ade80" opacity={0.5} />
          <rect x="56" y="24" width="14" height="6" rx="1" fill="#4ade80" opacity={0.5} />
          {/* Shine */}
          <path d="M55 20 Q54 18 56 17" stroke="#4ade80" strokeWidth="0.6" fill="none" opacity={0.5} />
          {/* Sparkles */}
          <path d="M42 18 L43 16 L44 18 L43 20 Z" stroke="#4ade80" strokeWidth="0.5" fill="none" opacity={0.4} />
          <path d="M82 22 L83.5 20 L85 22 L83.5 24 Z" stroke="#4ade80" strokeWidth="0.5" fill="none" opacity={0.4} />
        </g>
      );

    case 'x-attack':
      // Red/orange vial with sword motif
      return (
        <g>
          {/* Vial body */}
          <rect x="56" y="18" width="14" height="18" rx="3" fill="#ef4444" opacity={0.2} stroke="#f87171" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="59" y="13" width="8" height="6" rx="1.5" fill="#ef4444" opacity={0.15} stroke="#f87171" strokeWidth="0.8" />
          {/* Cap — pointed */}
          <path d="M58 14 L63 8 L68 14" stroke="#f87171" strokeWidth="1" fill="#ef4444" opacity={0.3} />
          {/* X label */}
          <line x1="59" y1="22" x2="67" y2="30" stroke="#f87171" strokeWidth="1.5" opacity={0.6} />
          <line x1="67" y1="22" x2="59" y2="30" stroke="#f87171" strokeWidth="1.5" opacity={0.6} />
          {/* Upward arrow — attack boost */}
          <path d="M80 28 L80 14" stroke="#f87171" strokeWidth="1.2" opacity={0.5} />
          <path d="M76 18 L80 12 L84 18" stroke="#f87171" strokeWidth="1" fill="none" opacity={0.5} />
          {/* Sparkle */}
          <path d="M44 24 L45.5 22 L47 24 L45.5 26 Z" stroke="#f87171" strokeWidth="0.5" fill="none" opacity={0.4} />
        </g>
      );

    case 'dire-hit':
      // Red vial with starburst/critical hit symbol
      return (
        <g>
          {/* Vial body */}
          <rect x="56" y="18" width="14" height="18" rx="3" fill="#dc2626" opacity={0.2} stroke="#ef4444" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="59" y="13" width="8" height="6" rx="1.5" fill="#dc2626" opacity={0.15} stroke="#ef4444" strokeWidth="0.8" />
          {/* Cap */}
          <path d="M58 14 L63 8 L68 14" stroke="#ef4444" strokeWidth="1" fill="#dc2626" opacity={0.3} />
          {/* Starburst in vial */}
          <circle cx="63" cy="26" r="4" stroke="#ef4444" strokeWidth="1" fill="#ef4444" opacity={0.15} />
          <line x1="63" y1="21" x2="63" y2="31" stroke="#ef4444" strokeWidth="1" opacity={0.5} />
          <line x1="58" y1="26" x2="68" y2="26" stroke="#ef4444" strokeWidth="1" opacity={0.5} />
          <line x1="59.5" y1="22.5" x2="66.5" y2="29.5" stroke="#ef4444" strokeWidth="0.8" opacity={0.4} />
          <line x1="66.5" y1="22.5" x2="59.5" y2="29.5" stroke="#ef4444" strokeWidth="0.8" opacity={0.4} />
          {/* Explosion lines */}
          <line x1="78" y1="16" x2="84" y2="12" stroke="#ef4444" strokeWidth="0.8" opacity={0.4} />
          <line x1="80" y1="22" x2="86" y2="22" stroke="#ef4444" strokeWidth="0.8" opacity={0.4} />
          <line x1="78" y1="28" x2="84" y2="32" stroke="#ef4444" strokeWidth="0.8" opacity={0.4} />
          <line x1="42" y1="20" x2="48" y2="20" stroke="#ef4444" strokeWidth="0.8" opacity={0.3} />
        </g>
      );

    case 'x-defend':
      // Blue vial with shield motif
      return (
        <g>
          {/* Vial body */}
          <rect x="56" y="18" width="14" height="18" rx="3" fill="#3b82f6" opacity={0.2} stroke="#60a5fa" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="59" y="13" width="8" height="6" rx="1.5" fill="#3b82f6" opacity={0.15} stroke="#60a5fa" strokeWidth="0.8" />
          {/* Cap */}
          <rect x="58" y="10" width="10" height="4" rx="2" fill="#60a5fa" opacity={0.5} stroke="#60a5fa" strokeWidth="1" />
          {/* X label */}
          <line x1="59" y1="22" x2="67" y2="30" stroke="#60a5fa" strokeWidth="1.5" opacity={0.6} />
          <line x1="67" y1="22" x2="59" y2="30" stroke="#60a5fa" strokeWidth="1.5" opacity={0.6} />
          {/* Shield — to the right */}
          <path d="M80 14 L88 17 L88 25 L80 30 L72 25 L72 17 Z" stroke="#60a5fa" strokeWidth="1" fill="#3b82f6" opacity={0.15} />
          <path d="M80 18 L84 20 L84 24 L80 27 L76 24 L76 20 Z" stroke="#60a5fa" strokeWidth="0.6" fill="none" opacity={0.4} />
          {/* Sparkle */}
          <path d="M44 24 L45.5 22 L47 24 L45.5 26 Z" stroke="#60a5fa" strokeWidth="0.5" fill="none" opacity={0.4} />
        </g>
      );

    case 'guard-spec':
      // Green-tinted bottle with ward/barrier lines
      return (
        <g>
          {/* Bottle body — wider, squat */}
          <rect x="54" y="16" width="18" height="20" rx="4" fill="#059669" opacity={0.2} stroke="#34d399" strokeWidth="1.2" />
          {/* Neck */}
          <rect x="59" y="10" width="8" height="7" rx="1.5" fill="#059669" opacity={0.15} stroke="#34d399" strokeWidth="0.8" />
          {/* Cap */}
          <rect x="58" y="7" width="10" height="4" rx="2" fill="#34d399" opacity={0.5} stroke="#34d399" strokeWidth="1" />
          {/* Eye symbol — ward */}
          <ellipse cx="63" cy="26" rx="6" ry="4" stroke="#34d399" strokeWidth="1" fill="none" opacity={0.5} />
          <circle cx="63" cy="26" r="2" fill="#34d399" opacity={0.4} />
          {/* Barrier arcs */}
          <path d="M42 16 Q42 26 50 30" stroke="#34d399" strokeWidth="0.8" fill="none" opacity={0.3} />
          <path d="M40 14 Q40 26 48 32" stroke="#34d399" strokeWidth="0.6" fill="none" opacity={0.2} />
          <path d="M84 16 Q84 26 76 30" stroke="#34d399" strokeWidth="0.8" fill="none" opacity={0.3} />
          <path d="M86 14 Q86 26 78 32" stroke="#34d399" strokeWidth="0.6" fill="none" opacity={0.2} />
        </g>
      );

    case 'ether':
      // Round blue-purple flask — magical PP restore
      return (
        <g>
          {/* Flask body — round */}
          <ellipse cx="63" cy="26" rx="12" ry="11" fill="#6366f1" opacity={0.15} stroke="#818cf8" strokeWidth="1.2" />
          {/* Neck — thin */}
          <rect x="60" y="11" width="6" height="6" rx="1.5" fill="#6366f1" opacity={0.15} stroke="#818cf8" strokeWidth="0.8" />
          {/* Cork stopper */}
          <ellipse cx="63" cy="10" rx="5" ry="2.5" fill="#818cf8" opacity={0.4} stroke="#818cf8" strokeWidth="0.8" />
          {/* Liquid shimmer */}
          <path d="M54 28 Q58 24 63 28 Q68 32 72 28" stroke="#818cf8" strokeWidth="0.8" fill="none" opacity={0.4} />
          {/* Energy sparkles */}
          <path d="M63 22 L64 20 L65 22 L64 24 Z" fill="#a5b4fc" opacity={0.5} />
          <circle cx="58" cy="26" r="1" fill="#a5b4fc" opacity={0.3} />
          <circle cx="68" cy="24" r="0.8" fill="#a5b4fc" opacity={0.3} />
          {/* Magic sparkles outside */}
          <path d="M42 18 L43 16 L44 18 L43 20 Z" stroke="#818cf8" strokeWidth="0.5" fill="#818cf8" opacity={0.3} />
          <path d="M82 14 L83.5 12 L85 14 L83.5 16 Z" stroke="#818cf8" strokeWidth="0.5" fill="#818cf8" opacity={0.3} />
          <path d="M80 28 L81 27 L82 28 L81 29 Z" stroke="#818cf8" strokeWidth="0.4" fill="none" opacity={0.3} />
        </g>
      );

    case 'smoke-ball':
      // Dark sphere with wispy smoke trails
      return (
        <g>
          {/* Main sphere */}
          <circle cx="63" cy="24" r="12" fill="#6b7280" opacity={0.2} stroke="#9ca3af" strokeWidth="1.2" />
          {/* Inner shading arc */}
          <path d="M55 20 Q58 16 65 16" stroke="#9ca3af" strokeWidth="0.6" fill="none" opacity={0.4} />
          {/* Fuse/wick at top */}
          <path d="M63 12 Q60 8 62 5" stroke="#d1d5db" strokeWidth="1" fill="none" opacity={0.5} />
          <circle cx="62" cy="5" r="1.5" fill="#f59e0b" opacity={0.4} />
          {/* Smoke wisps — left */}
          <path d="M50 22 Q44 18 40 22 Q36 26 40 28" stroke="#9ca3af" strokeWidth="0.8" fill="none" opacity={0.3} />
          <path d="M48 28 Q42 26 38 30" stroke="#9ca3af" strokeWidth="0.6" fill="none" opacity={0.2} />
          {/* Smoke wisps — right */}
          <path d="M76 22 Q82 18 86 22 Q90 26 86 28" stroke="#9ca3af" strokeWidth="0.8" fill="none" opacity={0.3} />
          <path d="M78 28 Q84 26 88 30" stroke="#9ca3af" strokeWidth="0.6" fill="none" opacity={0.2} />
          {/* Smoke puffs */}
          <circle cx="38" cy="20" r="2" stroke="#9ca3af" strokeWidth="0.5" fill="none" opacity={0.2} />
          <circle cx="88" cy="20" r="1.5" stroke="#9ca3af" strokeWidth="0.5" fill="none" opacity={0.2} />
        </g>
      );

    default:
      // Generic item — small bottle
      return (
        <g>
          <rect x="57" y="16" width="14" height="18" rx="3" fill="#4ade80" opacity={0.15} stroke="#4ade80" strokeWidth="1" />
          <rect x="60" y="11" width="8" height="6" rx="1.5" fill="#4ade80" opacity={0.1} stroke="#4ade80" strokeWidth="0.7" />
          <rect x="59" y="8" width="10" height="4" rx="2" fill="#4ade80" opacity={0.4} stroke="#4ade80" strokeWidth="0.8" />
          <circle cx="64" cy="25" r="2" fill="#4ade80" opacity={0.3} />
        </g>
      );
  }
}
