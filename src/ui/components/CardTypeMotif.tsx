import type { MoveType } from '../../engine/types';

interface Props {
  type: MoveType;
  color: string;
  width?: number;
  height?: number;
}

export function CardTypeMotif({ type, color, width = 130, height = 40 }: Props) {
  const main = color;
  const faint = color + '66'; // ~40% opacity
  const subtle = color + '33'; // ~20% opacity

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 130 40"
      fill="none"
      style={{ display: 'block' }}
    >
      {renderMotif(type, main, faint, subtle)}
    </svg>
  );
}

function renderMotif(type: MoveType, main: string, faint: string, subtle: string) {
  switch (type) {
    case 'normal':
      // Central diamond with radiating lines
      return (
        <g>
          <path d="M65 8 L73 20 L65 32 L57 20 Z" stroke={main} strokeWidth="1.5" fill={subtle} />
          <circle cx="65" cy="20" r="3" fill={main} opacity={0.8} />
          <line x1="40" y1="20" x2="54" y2="20" stroke={faint} strokeWidth="1" />
          <line x1="76" y1="20" x2="90" y2="20" stroke={faint} strokeWidth="1" />
          <line x1="52" y1="11" x2="58" y2="16" stroke={faint} strokeWidth="0.8" />
          <line x1="52" y1="29" x2="58" y2="24" stroke={faint} strokeWidth="0.8" />
          <line x1="78" y1="11" x2="72" y2="16" stroke={faint} strokeWidth="0.8" />
          <line x1="78" y1="29" x2="72" y2="24" stroke={faint} strokeWidth="0.8" />
          <circle cx="38" cy="20" r="1.5" fill={faint} />
          <circle cx="92" cy="20" r="1.5" fill={faint} />
        </g>
      );

    case 'fire':
      // Three flame wisps curling upward from central ember
      return (
        <g>
          <circle cx="65" cy="32" r="3" fill={main} opacity={0.6} />
          {/* Center flame */}
          <path d="M65 30 Q63 22 65 14 Q67 22 65 30" stroke={main} strokeWidth="1.5" fill={subtle} />
          <path d="M65 14 Q62 10 65 6 Q68 10 65 14" stroke={main} strokeWidth="1" fill={faint} />
          {/* Left flame wisp */}
          <path d="M58 32 Q52 24 48 16 Q50 20 55 14" stroke={faint} strokeWidth="1.2" fill="none" />
          <path d="M55 14 Q53 10 55 8" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Right flame wisp */}
          <path d="M72 32 Q78 24 82 16 Q80 20 75 14" stroke={faint} strokeWidth="1.2" fill="none" />
          <path d="M75 14 Q77 10 75 8" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Ember dots */}
          <circle cx="60" cy="26" r="1" fill={main} opacity={0.5} />
          <circle cx="70" cy="26" r="1" fill={main} opacity={0.5} />
        </g>
      );

    case 'water':
      // Flowing wave curves with droplet accents
      return (
        <g>
          <path d="M20 20 Q35 10 50 20 Q65 30 80 20 Q95 10 110 20" stroke={main} strokeWidth="1.5" fill="none" />
          <path d="M25 26 Q40 16 55 26 Q70 36 85 26 Q100 16 115 26" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M30 14 Q45 4 60 14 Q75 24 90 14 Q105 4 115 10" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Droplet accents */}
          <circle cx="42" cy="14" r="2" fill={main} opacity={0.5} />
          <circle cx="88" cy="14" r="2" fill={main} opacity={0.5} />
          <circle cx="65" cy="32" r="1.5" fill={faint} />
        </g>
      );

    case 'grass':
      // Central leaf with branching vein pattern and curling tendrils
      return (
        <g>
          {/* Main leaf shape */}
          <path d="M65 34 Q55 24 50 14 Q58 10 65 8 Q72 10 80 14 Q75 24 65 34" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Central vein */}
          <line x1="65" y1="34" x2="65" y2="10" stroke={main} strokeWidth="1" />
          {/* Side veins */}
          <line x1="65" y1="28" x2="57" y2="22" stroke={faint} strokeWidth="0.8" />
          <line x1="65" y1="28" x2="73" y2="22" stroke={faint} strokeWidth="0.8" />
          <line x1="65" y1="20" x2="58" y2="15" stroke={faint} strokeWidth="0.8" />
          <line x1="65" y1="20" x2="72" y2="15" stroke={faint} strokeWidth="0.8" />
          {/* Left tendril */}
          <path d="M46 16 Q38 18 32 14 Q36 10 40 12" stroke={faint} strokeWidth="1" fill="none" />
          {/* Right tendril */}
          <path d="M84 16 Q92 18 98 14 Q94 10 90 12" stroke={faint} strokeWidth="1" fill="none" />
        </g>
      );

    case 'electric':
      // Central lightning bolt with spark dots
      return (
        <g>
          {/* Main lightning bolt */}
          <path d="M62 6 L56 18 L64 18 L58 34" stroke={main} strokeWidth="2" fill="none" strokeLinejoin="round" />
          {/* Secondary bolt */}
          <path d="M72 8 L68 16 L74 16 L70 28" stroke={faint} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          {/* Spark dots radiating outward */}
          <circle cx="48" cy="12" r="1.5" fill={main} opacity={0.6} />
          <circle cx="42" cy="20" r="1" fill={faint} />
          <circle cx="84" cy="14" r="1.5" fill={main} opacity={0.6} />
          <circle cx="90" cy="22" r="1" fill={faint} />
          <circle cx="46" cy="28" r="1" fill={faint} />
          <circle cx="86" cy="28" r="1" fill={faint} />
          {/* Small spark lines */}
          <line x1="38" y1="14" x2="34" y2="12" stroke={faint} strokeWidth="0.8" />
          <line x1="92" y1="16" x2="96" y2="14" stroke={faint} strokeWidth="0.8" />
        </g>
      );

    case 'poison':
      // Dripping drops from horizontal line with bubbles
      return (
        <g>
          {/* Horizontal drip line */}
          <line x1="30" y1="10" x2="100" y2="10" stroke={faint} strokeWidth="1" />
          {/* Left drop */}
          <path d="M48 10 Q48 18 48 22 Q45 26 42 22 Q42 18 48 10" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Center drop (larger) */}
          <path d="M65 10 Q65 20 65 26 Q61 32 57 26 Q57 20 65 10" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Right drop */}
          <path d="M82 10 Q82 18 82 22 Q85 26 88 22 Q88 18 82 10" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Bubbles */}
          <circle cx="38" cy="18" r="2.5" stroke={faint} strokeWidth="0.8" fill="none" />
          <circle cx="95" cy="16" r="2" stroke={faint} strokeWidth="0.8" fill="none" />
          <circle cx="35" cy="26" r="1.5" stroke={faint} strokeWidth="0.6" fill="none" />
          <circle cx="97" cy="24" r="1.5" stroke={faint} strokeWidth="0.6" fill="none" />
        </g>
      );

    case 'flying':
      // Two stylized wing curves sweeping outward from center
      return (
        <g>
          {/* Left wing */}
          <path d="M62 22 Q50 12 32 8" stroke={main} strokeWidth="1.5" fill="none" />
          <path d="M62 22 Q52 18 36 16" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M62 22 Q54 22 40 22" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Left feather tips */}
          <path d="M32 8 Q30 10 32 12" stroke={main} strokeWidth="0.8" fill="none" />
          <path d="M36 16 Q34 18 36 20" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Right wing */}
          <path d="M68 22 Q80 12 98 8" stroke={main} strokeWidth="1.5" fill="none" />
          <path d="M68 22 Q78 18 94 16" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M68 22 Q76 22 90 22" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Right feather tips */}
          <path d="M98 8 Q100 10 98 12" stroke={main} strokeWidth="0.8" fill="none" />
          <path d="M94 16 Q96 18 94 20" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Center body dot */}
          <circle cx="65" cy="22" r="2.5" fill={main} opacity={0.7} />
        </g>
      );

    case 'psychic':
      // Central eye/iris with concentric ripple arcs
      return (
        <g>
          {/* Eye shape */}
          <path d="M50 20 Q65 8 80 20 Q65 32 50 20" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Iris */}
          <circle cx="65" cy="20" r="4" stroke={main} strokeWidth="1.2" fill={faint} />
          {/* Pupil */}
          <circle cx="65" cy="20" r="1.5" fill={main} />
          {/* Ripple arcs outward */}
          <path d="M42 20 Q42 10 50 8" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M42 20 Q42 30 50 32" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M88 20 Q88 10 80 8" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M88 20 Q88 30 80 32" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Outer ripples */}
          <path d="M34 20 Q34 6 46 4" stroke={subtle} strokeWidth="0.8" fill="none" />
          <path d="M34 20 Q34 34 46 36" stroke={subtle} strokeWidth="0.8" fill="none" />
          <path d="M96 20 Q96 6 84 4" stroke={subtle} strokeWidth="0.8" fill="none" />
          <path d="M96 20 Q96 34 84 36" stroke={subtle} strokeWidth="0.8" fill="none" />
        </g>
      );

    case 'dark':
      // Crescent moon with wispy shadow tendrils
      return (
        <g>
          {/* Crescent moon */}
          <path d="M58 8 Q50 14 50 22 Q50 30 58 36 Q46 30 46 22 Q46 14 58 8" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Inner glow */}
          <circle cx="54" cy="22" r="1.5" fill={main} opacity={0.4} />
          {/* Shadow tendrils curling from edges */}
          <path d="M60 10 Q68 8 76 12 Q80 16 78 20" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M60 34 Q68 36 76 32 Q82 26 80 22" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M78 20 Q84 18 90 20" stroke={subtle} strokeWidth="0.8" fill="none" />
          <path d="M80 22 Q86 24 92 22" stroke={subtle} strokeWidth="0.8" fill="none" />
          {/* Small stars */}
          <circle cx="88" cy="12" r="1" fill={faint} />
          <circle cx="96" cy="18" r="0.8" fill={subtle} />
          <circle cx="84" cy="30" r="0.8" fill={subtle} />
        </g>
      );

    case 'fighting':
      // Two angular chevrons/fists creating a clash symbol
      return (
        <g>
          {/* Left fist/chevron */}
          <path d="M36 10 L52 20 L36 30" stroke={main} strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M30 12 L44 20 L30 28" stroke={faint} strokeWidth="1" fill="none" strokeLinejoin="round" />
          {/* Right fist/chevron */}
          <path d="M94 10 L78 20 L94 30" stroke={main} strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M100 12 L86 20 L100 28" stroke={faint} strokeWidth="1" fill="none" strokeLinejoin="round" />
          {/* Clash burst in center */}
          <circle cx="65" cy="20" r="3" fill={main} opacity={0.5} />
          <line x1="56" y1="14" x2="60" y2="18" stroke={main} strokeWidth="1" />
          <line x1="56" y1="26" x2="60" y2="22" stroke={main} strokeWidth="1" />
          <line x1="74" y1="14" x2="70" y2="18" stroke={main} strokeWidth="1" />
          <line x1="74" y1="26" x2="70" y2="22" stroke={main} strokeWidth="1" />
        </g>
      );

    case 'ice':
      // Hexagonal snowflake crystal with radiating shard lines
      return (
        <g>
          {/* Hexagon outline */}
          <path d="M65 6 L78 13 L78 27 L65 34 L52 27 L52 13 Z" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Inner hexagon */}
          <path d="M65 12 L72 16 L72 24 L65 28 L58 24 L58 16 Z" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Center dot */}
          <circle cx="65" cy="20" r="2" fill={main} opacity={0.6} />
          {/* Radiating shard lines extending beyond hexagon */}
          <line x1="65" y1="6" x2="65" y2="0" stroke={faint} strokeWidth="1" />
          <line x1="65" y1="34" x2="65" y2="40" stroke={faint} strokeWidth="1" />
          <line x1="78" y1="13" x2="86" y2="8" stroke={faint} strokeWidth="1" />
          <line x1="52" y1="13" x2="44" y2="8" stroke={faint} strokeWidth="1" />
          <line x1="78" y1="27" x2="86" y2="32" stroke={faint} strokeWidth="1" />
          <line x1="52" y1="27" x2="44" y2="32" stroke={faint} strokeWidth="1" />
          {/* Small crystal branches */}
          <line x1="65" y1="2" x2="62" y2="4" stroke={subtle} strokeWidth="0.6" />
          <line x1="65" y1="2" x2="68" y2="4" stroke={subtle} strokeWidth="0.6" />
          <line x1="65" y1="38" x2="62" y2="36" stroke={subtle} strokeWidth="0.6" />
          <line x1="65" y1="38" x2="68" y2="36" stroke={subtle} strokeWidth="0.6" />
        </g>
      );

    case 'bug':
      // Stylized butterfly/moth wings with antenna curves
      return (
        <g>
          {/* Left wing */}
          <path d="M62 20 Q48 10 38 12 Q32 16 38 22 Q44 28 62 20" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Right wing */}
          <path d="M68 20 Q82 10 92 12 Q98 16 92 22 Q86 28 68 20" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Wing veins */}
          <path d="M62 20 Q50 14 42 16" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M68 20 Q80 14 88 16" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Body */}
          <line x1="65" y1="16" x2="65" y2="28" stroke={main} strokeWidth="1.5" />
          {/* Head */}
          <circle cx="65" cy="14" r="2" fill={main} opacity={0.7} />
          {/* Antennae */}
          <path d="M64 12 Q58 4 52 6" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M66 12 Q72 4 78 6" stroke={faint} strokeWidth="1" fill="none" />
          <circle cx="52" cy="6" r="1" fill={faint} />
          <circle cx="78" cy="6" r="1" fill={faint} />
        </g>
      );

    case 'dragon':
      // Crown of pointed scales rising upward, flame-like but angular
      return (
        <g>
          {/* Base line */}
          <line x1="32" y1="32" x2="98" y2="32" stroke={faint} strokeWidth="1" />
          {/* Center spike (tallest) */}
          <path d="M60 32 L65 6 L70 32" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Left inner spike */}
          <path d="M48 32 L52 14 L56 32" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Right inner spike */}
          <path d="M74 32 L78 14 L82 32" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Left outer spike (shorter) */}
          <path d="M36 32 L40 20 L44 32" stroke={faint} strokeWidth="1" fill="none" />
          {/* Right outer spike (shorter) */}
          <path d="M86 32 L90 20 L94 32" stroke={faint} strokeWidth="1" fill="none" />
          {/* Decorative flame accents at tips */}
          <path d="M65 6 Q63 4 65 2 Q67 4 65 6" stroke={main} strokeWidth="0.8" fill={faint} />
          <path d="M52 14 Q50 12 52 10" stroke={faint} strokeWidth="0.6" fill="none" />
          <path d="M78 14 Q80 12 78 10" stroke={faint} strokeWidth="0.6" fill="none" />
        </g>
      );

    case 'ghost':
      // Ethereal wisp/spirit flame with curling smoke trails
      return (
        <g>
          {/* Main spirit body */}
          <path d="M65 8 Q55 12 52 22 Q50 30 54 34 Q58 36 60 32 Q62 28 65 32 Q68 28 70 32 Q72 36 76 34 Q80 30 78 22 Q75 12 65 8" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Eyes */}
          <circle cx="60" cy="18" r="2" fill={main} opacity={0.7} />
          <circle cx="70" cy="18" r="2" fill={main} opacity={0.7} />
          {/* Left smoke trail */}
          <path d="M52 22 Q44 18 38 22 Q34 26 38 28" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M38 28 Q34 30 32 28" stroke={subtle} strokeWidth="0.6" fill="none" />
          {/* Right smoke trail */}
          <path d="M78 22 Q86 18 92 22 Q96 26 92 28" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M92 28 Q96 30 98 28" stroke={subtle} strokeWidth="0.6" fill="none" />
        </g>
      );

    case 'rock':
      // Jagged angular crystal formations, three asymmetric peaks
      return (
        <g>
          {/* Left formation */}
          <path d="M32 34 L38 18 L46 24 L42 34" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Center formation (tallest) */}
          <path d="M50 34 L58 10 L68 8 L74 18 L70 34" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Right formation */}
          <path d="M76 34 L84 16 L92 22 L96 34" stroke={main} strokeWidth="1.2" fill={subtle} />
          {/* Internal facet lines */}
          <line x1="58" y1="10" x2="62" y2="34" stroke={faint} strokeWidth="0.8" />
          <line x1="68" y1="8" x2="66" y2="34" stroke={faint} strokeWidth="0.8" />
          <line x1="84" y1="16" x2="86" y2="34" stroke={faint} strokeWidth="0.6" />
          <line x1="38" y1="18" x2="40" y2="34" stroke={faint} strokeWidth="0.6" />
          {/* Ground line */}
          <line x1="28" y1="34" x2="100" y2="34" stroke={faint} strokeWidth="1" />
        </g>
      );

    case 'ground':
      // Layered earth strata lines with central crack/fissure
      return (
        <g>
          {/* Strata layers */}
          <line x1="24" y1="12" x2="106" y2="12" stroke={faint} strokeWidth="0.8" />
          <line x1="20" y1="18" x2="110" y2="18" stroke={faint} strokeWidth="1" />
          <line x1="22" y1="24" x2="108" y2="24" stroke={main} strokeWidth="1.2" />
          <line x1="20" y1="30" x2="110" y2="30" stroke={main} strokeWidth="1.5" />
          {/* Central crack/fissure */}
          <path d="M65 8 L62 14 L68 18 L63 24 L67 30 L64 36" stroke={main} strokeWidth="1.5" fill="none" />
          {/* Side cracks */}
          <path d="M62 14 L56 16" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M68 18 L74 20" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M63 24 L58 26" stroke={faint} strokeWidth="0.8" fill="none" />
          {/* Small debris dots */}
          <circle cx="50" cy="16" r="1" fill={faint} />
          <circle cx="80" cy="22" r="1" fill={faint} />
          <circle cx="45" cy="28" r="1.2" fill={subtle} />
          <circle cx="88" cy="14" r="1" fill={subtle} />
        </g>
      );

    case 'item':
      // Potion spray bottle — rounded body with nozzle spraying mist
      return (
        <g>
          {/* Bottle body */}
          <rect x="58" y="16" width="14" height="18" rx="3" stroke={main} strokeWidth="1.5" fill={subtle} />
          {/* Bottle neck */}
          <rect x="61" y="12" width="8" height="5" rx="1" stroke={main} strokeWidth="1" fill={faint} />
          {/* Nozzle cap */}
          <rect x="60" y="10" width="10" height="3" rx="1.5" stroke={main} strokeWidth="1.2" fill={main} opacity={0.6} />
          {/* Spray trigger */}
          <path d="M72 14 L78 14 L78 18 L74 18" stroke={main} strokeWidth="1" fill={faint} />
          {/* Spray mist particles */}
          <circle cx="84" cy="12" r="1.5" fill={main} opacity={0.5} />
          <circle cx="88" cy="10" r="1" fill={faint} />
          <circle cx="90" cy="14" r="1.2" fill={faint} />
          <circle cx="86" cy="16" r="0.8" fill={subtle} />
          <circle cx="92" cy="12" r="0.8" fill={subtle} />
          {/* Bottle label line */}
          <line x1="60" y1="24" x2="70" y2="24" stroke={main} strokeWidth="0.8" opacity={0.5} />
          {/* Sparkle accents */}
          <path d="M40 18 L42 16 L44 18 L42 20 Z" stroke={faint} strokeWidth="0.6" fill="none" />
          <path d="M48 26 L49 25 L50 26 L49 27 Z" stroke={faint} strokeWidth="0.5" fill="none" />
        </g>
      );

    case 'steel':
      // Steel gear/cog — interlocking gear teeth
      return (
        <g>
          {/* Main gear */}
          <circle cx="65" cy="20" r="8" stroke={main} strokeWidth="1.5" fill={faint} />
          <circle cx="65" cy="20" r="4" stroke={subtle} strokeWidth="1" fill="none" />
          {/* Gear teeth */}
          <rect x="63" y="9" width="4" height="4" rx="0.5" fill={main} opacity={0.6} />
          <rect x="63" y="27" width="4" height="4" rx="0.5" fill={main} opacity={0.6} />
          <rect x="74" y="18" width="4" height="4" rx="0.5" fill={main} opacity={0.6} />
          <rect x="53" y="18" width="4" height="4" rx="0.5" fill={main} opacity={0.6} />
          {/* Diagonal teeth */}
          <rect x="72" y="12" width="3" height="3" rx="0.5" fill={subtle} transform="rotate(45 73.5 13.5)" />
          <rect x="55" y="25" width="3" height="3" rx="0.5" fill={subtle} transform="rotate(45 56.5 26.5)" />
          <rect x="55" y="12" width="3" height="3" rx="0.5" fill={subtle} transform="rotate(45 56.5 13.5)" />
          <rect x="72" y="25" width="3" height="3" rx="0.5" fill={subtle} transform="rotate(45 73.5 26.5)" />
          {/* Small second gear */}
          <circle cx="84" cy="14" r="4" stroke={faint} strokeWidth="1" fill="none" />
          <circle cx="84" cy="14" r="1.5" fill={subtle} />
          {/* Metal shine accents */}
          <line x1="40" y1="28" x2="50" y2="28" stroke={faint} strokeWidth="0.6" />
          <line x1="42" y1="30" x2="48" y2="30" stroke={faint} strokeWidth="0.4" />
        </g>
      );

    case 'fairy':
      // Central sparkle star with fairy dust arcs and smaller stars
      return (
        <g>
          {/* Central four-pointed star */}
          <path d="M65 12 L67.5 17.5 L73 20 L67.5 22.5 L65 28 L62.5 22.5 L57 20 L62.5 17.5 Z" stroke={main} strokeWidth="1.5" fill={subtle} />
          <circle cx="65" cy="20" r="1.5" fill={main} opacity={0.8} />
          {/* Left fairy dust arc */}
          <path d="M55 18 Q44 14 36 18 Q32 22 36 26" stroke={faint} strokeWidth="1.2" fill="none" />
          {/* Right fairy dust arc */}
          <path d="M75 18 Q86 14 94 18 Q98 22 94 26" stroke={faint} strokeWidth="1.2" fill="none" />
          {/* Left small star */}
          <path d="M38 16 L39.5 18.5 L42 19 L39.5 19.5 L38 22 L36.5 19.5 L34 19 L36.5 18.5 Z" stroke={faint} strokeWidth="0.8" fill={subtle} />
          {/* Right small star */}
          <path d="M92 16 L93.5 18.5 L96 19 L93.5 19.5 L92 22 L90.5 19.5 L88 19 L90.5 18.5 Z" stroke={faint} strokeWidth="0.8" fill={subtle} />
          {/* Sparkle dots */}
          <circle cx="48" cy="12" r="1" fill={main} opacity={0.5} />
          <circle cx="82" cy="12" r="1" fill={main} opacity={0.5} />
          <circle cx="32" cy="24" r="0.8" fill={faint} />
          <circle cx="98" cy="24" r="0.8" fill={faint} />
          {/* Bottom accent sparkles */}
          <circle cx="55" cy="28" r="1.2" fill={faint} />
          <circle cx="75" cy="28" r="1.2" fill={faint} />
          <circle cx="60" cy="32" r="0.8" fill={subtle} />
          <circle cx="70" cy="32" r="0.8" fill={subtle} />
        </g>
      );

    default:
      // Fallback — simple horizontal line with dot
      return (
        <g>
          <line x1="30" y1="20" x2="100" y2="20" stroke={faint} strokeWidth="1" />
          <circle cx="65" cy="20" r="2" fill={main} />
        </g>
      );
  }
}
