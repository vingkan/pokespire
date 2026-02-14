/**
 * Minimal single-color SVG icons for each event, keyed by event ID.
 * Same pattern as CardTypeMotif: main / faint (40%) / subtle (20%) opacities.
 */

interface Props {
  eventId: string;
  color: string;
  size?: number;
}

export function EventIcon({ eventId, color, size = 24 }: Props) {
  const main = color;
  const faint = color + '66';
  const subtle = color + '33';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {renderIcon(eventId, main, faint, subtle)}
    </svg>
  );
}

function renderIcon(id: string, main: string, faint: string, subtle: string) {
  switch (id) {
    // ── Act 1 ────────────────────────────────────────────────

    case 'training_camp':
      // Dumbbell
      return (
        <g>
          <rect x="4" y="9" width="4" height="6" rx="1" stroke={main} strokeWidth="1.2" fill={subtle} />
          <rect x="16" y="9" width="4" height="6" rx="1" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="8" y1="12" x2="16" y2="12" stroke={main} strokeWidth="1.5" />
          <line x1="3" y1="10" x2="3" y2="14" stroke={faint} strokeWidth="1" />
          <line x1="21" y1="10" x2="21" y2="14" stroke={faint} strokeWidth="1" />
        </g>
      );

    case 'meditation_chamber':
      // Zen circle (enso) with dot
      return (
        <g>
          <path d="M12 4 A8 8 0 1 1 8 5" stroke={main} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill={main} opacity={0.5} />
          <circle cx="12" cy="12" r="0.8" fill={main} />
        </g>
      );

    case 'move_tutor':
      // Pendulum
      return (
        <g>
          <line x1="12" y1="3" x2="12" y2="5" stroke={faint} strokeWidth="1" />
          <line x1="6" y1="5" x2="18" y2="5" stroke={faint} strokeWidth="1" />
          <line x1="12" y1="5" x2="8" y2="16" stroke={main} strokeWidth="1.2" />
          <circle cx="8" cy="18" r="3" stroke={main} strokeWidth="1.2" fill={subtle} />
          <path d="M5 14 Q3 16 5 18" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M15 10 Q17 12 15 14" stroke={faint} strokeWidth="0.8" fill="none" />
        </g>
      );

    case 'wandering_merchant':
      // Coin pouch / money bag
      return (
        <g>
          <path d="M8 8 Q8 5 12 5 Q16 5 16 8" stroke={main} strokeWidth="1" fill="none" />
          <path d="M6 10 Q6 8 8 8 L16 8 Q18 8 18 10 L19 18 Q19 21 12 21 Q5 21 5 18 Z" stroke={main} strokeWidth="1.2" fill={subtle} />
          <circle cx="12" cy="15" r="2.5" stroke={faint} strokeWidth="0.8" fill="none" />
          <line x1="12" y1="13.5" x2="12" y2="16.5" stroke={faint} strokeWidth="0.8" />
          <line x1="10.5" y1="15" x2="13.5" y2="15" stroke={faint} strokeWidth="0.8" />
        </g>
      );

    case 'trapped_hallway':
      // Spikes / trap teeth
      return (
        <g>
          <path d="M3 4 L6 12 L9 4 L12 12 L15 4 L18 12 L21 4" stroke={main} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          <path d="M3 20 L6 12 L9 20 L12 12 L15 20 L18 12 L21 20" stroke={faint} strokeWidth="1" fill="none" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="1" fill={main} opacity={0.6} />
        </g>
      );

    case 'rattata_nest':
      // Pile of coins / nest shape
      return (
        <g>
          <ellipse cx="12" cy="18" rx="8" ry="3" stroke={main} strokeWidth="1.2" fill={subtle} />
          <ellipse cx="12" cy="15" rx="6" ry="2.5" stroke={faint} strokeWidth="1" fill={subtle} />
          <ellipse cx="12" cy="12.5" rx="4" ry="2" stroke={faint} strokeWidth="0.8" fill={subtle} />
          <circle cx="12" cy="10" r="1" fill={main} opacity={0.6} />
        </g>
      );

    case 'hot_springs':
      // Steam wisps rising from water
      return (
        <g>
          <path d="M4 16 Q8 14 12 16 Q16 18 20 16" stroke={main} strokeWidth="1.2" fill="none" />
          <path d="M5 19 Q9 17 13 19 Q17 21 21 19" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M8 12 Q7 9 8 7" stroke={main} strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M12 11 Q11 8 12 5" stroke={main} strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M16 12 Q15 9 16 7" stroke={main} strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );

    case 'fallen_trainer':
      // Hand offering a card
      return (
        <g>
          <rect x="9" y="3" width="8" height="11" rx="1" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="11" y1="6" x2="15" y2="6" stroke={faint} strokeWidth="0.8" />
          <line x1="11" y1="8" x2="15" y2="8" stroke={faint} strokeWidth="0.6" />
          <path d="M6 21 L6 16 Q6 14 8 14 L16 14 Q18 14 18 16 L18 21" stroke={main} strokeWidth="1.2" fill="none" />
          <line x1="12" y1="14" x2="12" y2="17" stroke={faint} strokeWidth="0.8" />
        </g>
      );

    case 'mysterious_mushrooms':
      // Mushroom
      return (
        <g>
          <path d="M6 13 Q6 6 12 4 Q18 6 18 13" stroke={main} strokeWidth="1.2" fill={subtle} />
          <rect x="10" y="13" width="4" height="7" rx="1" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="8" y1="21" x2="16" y2="21" stroke={faint} strokeWidth="1" />
          <circle cx="9" cy="9" r="1" fill={main} opacity={0.4} />
          <circle cx="14" cy="7" r="1.2" fill={main} opacity={0.4} />
          <circle cx="11" cy="11" r="0.8" fill={main} opacity={0.3} />
        </g>
      );

    case 'locked_vault':
      // Padlock
      return (
        <g>
          <path d="M8 10 L8 8 Q8 4 12 4 Q16 4 16 8 L16 10" stroke={main} strokeWidth="1.5" fill="none" />
          <rect x="6" y="10" width="12" height="10" rx="2" stroke={main} strokeWidth="1.2" fill={subtle} />
          <circle cx="12" cy="15" r="1.5" fill={main} opacity={0.7} />
          <line x1="12" y1="16.5" x2="12" y2="18" stroke={main} strokeWidth="1.2" />
        </g>
      );

    // ── Act 2 ────────────────────────────────────────────────

    case 'power_surge':
      // Lightning bolt with spark
      return (
        <g>
          <path d="M14 3 L9 12 L13 12 L10 21" stroke={main} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
          <circle cx="17" cy="6" r="1" fill={main} opacity={0.6} />
          <circle cx="19" cy="9" r="0.7" fill={faint} />
          <line x1="5" y1="8" x2="7" y2="10" stroke={faint} strokeWidth="0.8" />
          <line x1="5" y1="15" x2="7" y2="14" stroke={faint} strokeWidth="0.8" />
        </g>
      );

    case 'rocket_scientist':
      // Lab flask / beaker
      return (
        <g>
          <path d="M10 3 L10 9 L5 19 Q5 21 7 21 L17 21 Q19 21 19 19 L14 9 L14 3" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="9" y1="3" x2="15" y2="3" stroke={main} strokeWidth="1" />
          <line x1="7" y1="16" x2="17" y2="16" stroke={faint} strokeWidth="0.8" />
          <circle cx="10" cy="18" r="1" fill={main} opacity={0.4} />
          <circle cx="14" cy="19" r="0.7" fill={main} opacity={0.3} />
        </g>
      );

    case 'card_printer':
      // Copy / duplicate cards
      return (
        <g>
          <rect x="4" y="5" width="10" height="14" rx="1.5" stroke={faint} strokeWidth="1" fill={subtle} />
          <rect x="8" y="3" width="10" height="14" rx="1.5" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="10" y1="6" x2="16" y2="6" stroke={faint} strokeWidth="0.7" />
          <line x1="10" y1="8.5" x2="16" y2="8.5" stroke={faint} strokeWidth="0.5" />
          <line x1="10" y1="11" x2="14" y2="11" stroke={faint} strokeWidth="0.5" />
          <path d="M15 19 L18 22 L21 17" stroke={main} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );

    case 'abandoned_cafeteria':
      // Fork and knife
      return (
        <g>
          <line x1="8" y1="4" x2="8" y2="20" stroke={main} strokeWidth="1.2" />
          <line x1="8" y1="4" x2="6" y2="9" stroke={main} strokeWidth="1" />
          <line x1="8" y1="4" x2="10" y2="9" stroke={main} strokeWidth="1" />
          <line x1="8" y1="4" x2="8" y2="9" stroke={main} strokeWidth="0.8" />
          <line x1="6" y1="9" x2="10" y2="9" stroke={faint} strokeWidth="0.8" />
          <path d="M16 4 L16 10 Q16 13 16 13 L16 20" stroke={main} strokeWidth="1.2" fill="none" />
          <path d="M16 4 Q19 4 19 8 Q19 11 16 12" stroke={main} strokeWidth="1.2" fill={subtle} />
        </g>
      );

    case 'mind_games':
      // Brain / spiral
      return (
        <g>
          <path d="M12 4 Q18 4 19 8 Q20 12 17 14 Q20 16 19 19 Q17 22 12 21 Q7 22 5 19 Q4 16 7 14 Q4 12 5 8 Q7 4 12 4" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="12" y1="6" x2="12" y2="21" stroke={faint} strokeWidth="0.8" />
          <path d="M12 8 Q15 9 15 12 Q15 15 12 15" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M12 12 Q9 13 9 15 Q9 17 12 18" stroke={faint} strokeWidth="0.8" fill="none" />
        </g>
      );

    case 'supply_cache':
      // Open crate / box
      return (
        <g>
          <path d="M4 10 L12 6 L20 10 L20 19 L12 22 L4 19 Z" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="12" y1="6" x2="12" y2="22" stroke={faint} strokeWidth="0.8" />
          <line x1="4" y1="10" x2="20" y2="10" stroke={faint} strokeWidth="0.8" />
          <path d="M4 10 L12 14 L20 10" stroke={main} strokeWidth="1" fill="none" />
          <line x1="12" y1="14" x2="12" y2="22" stroke={main} strokeWidth="0.8" />
        </g>
      );

    case 'rocket_armory':
      // Shield
      return (
        <g>
          <path d="M12 3 L20 7 L20 13 Q20 19 12 22 Q4 19 4 13 L4 7 Z" stroke={main} strokeWidth="1.2" fill={subtle} />
          <path d="M12 6 L17 8.5 L17 13 Q17 17 12 19 Q7 17 7 13 L7 8.5 Z" stroke={faint} strokeWidth="0.8" fill="none" />
          <line x1="12" y1="6" x2="12" y2="19" stroke={faint} strokeWidth="0.6" />
        </g>
      );

    case 'security_terminal':
      // Monitor / screen
      return (
        <g>
          <rect x="4" y="4" width="16" height="12" rx="1.5" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="6" y1="7" x2="12" y2="7" stroke={main} strokeWidth="0.8" opacity={0.7} />
          <line x1="6" y1="9.5" x2="18" y2="9.5" stroke={faint} strokeWidth="0.6" />
          <line x1="6" y1="11.5" x2="14" y2="11.5" stroke={faint} strokeWidth="0.6" />
          <line x1="10" y1="16" x2="14" y2="16" stroke={main} strokeWidth="1" />
          <line x1="8" y1="19" x2="16" y2="19" stroke={faint} strokeWidth="1" />
          <circle cx="17" cy="7" r="0.8" fill={main} opacity={0.5} />
        </g>
      );

    case 'mewtwos_trail':
      // Three claw marks
      return (
        <g>
          <path d="M7 5 L10 19" stroke={main} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 4 L12 20" stroke={main} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 5 L14 19" stroke={main} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="7" cy="4" r="1" fill={faint} />
          <circle cx="12" cy="3" r="1" fill={faint} />
          <circle cx="17" cy="4" r="1" fill={faint} />
        </g>
      );

    case 'volunteer_recruit':
      // Pokeball outline
      return (
        <g>
          <circle cx="12" cy="12" r="8" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="4" y1="12" x2="20" y2="12" stroke={main} strokeWidth="1.2" />
          <circle cx="12" cy="12" r="3" stroke={main} strokeWidth="1.2" fill="none" />
          <circle cx="12" cy="12" r="1.2" fill={main} opacity={0.6} />
        </g>
      );

    // ── Act 3 ────────────────────────────────────────────────

    case 'psychic_storm':
      // Eye with lightning
      return (
        <g>
          <path d="M3 12 Q12 4 21 12 Q12 20 3 12" stroke={main} strokeWidth="1.2" fill={subtle} />
          <circle cx="12" cy="12" r="3" stroke={main} strokeWidth="1" fill={faint} />
          <circle cx="12" cy="12" r="1" fill={main} />
          <path d="M6 5 L8 8" stroke={faint} strokeWidth="0.8" />
          <path d="M18 5 L16 8" stroke={faint} strokeWidth="0.8" />
          <path d="M12 2 L12 5" stroke={faint} strokeWidth="0.8" />
        </g>
      );

    case 'ancient_shrine':
      // Torii gate / shrine arch
      return (
        <g>
          <line x1="6" y1="7" x2="6" y2="21" stroke={main} strokeWidth="1.5" />
          <line x1="18" y1="7" x2="18" y2="21" stroke={main} strokeWidth="1.5" />
          <line x1="4" y1="7" x2="20" y2="7" stroke={main} strokeWidth="1.5" />
          <line x1="3" y1="4" x2="21" y2="4" stroke={main} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="12" x2="17" y2="12" stroke={faint} strokeWidth="1" />
          <circle cx="12" cy="16" r="1" fill={main} opacity={0.4} />
        </g>
      );

    case 'reality_fracture':
      // Cracked/shattered glass
      return (
        <g>
          <path d="M12 3 L10 8 L5 10" stroke={main} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          <path d="M12 3 L15 9 L20 11" stroke={main} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          <path d="M10 8 L8 15 L4 20" stroke={faint} strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <path d="M15 9 L14 16 L11 21" stroke={faint} strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <path d="M10 8 L13 14 L18 20" stroke={faint} strokeWidth="1" strokeLinejoin="round" fill="none" />
          <circle cx="12" cy="3" r="1.5" fill={main} opacity={0.5} />
        </g>
      );

    case 'mewtwos_voice':
      // Telepathy waves emanating from center
      return (
        <g>
          <circle cx="12" cy="12" r="2.5" fill={main} opacity={0.6} />
          <circle cx="12" cy="12" r="1" fill={main} />
          <path d="M6 8 Q4 12 6 16" stroke={main} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M18 8 Q20 12 18 16" stroke={main} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M3 6 Q0 12 3 18" stroke={faint} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M21 6 Q24 12 21 18" stroke={faint} strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </g>
      );

    case 'crystal_cave':
      // Crystal / gem formation
      return (
        <g>
          <path d="M12 3 L16 8 L16 17 L12 21 L8 17 L8 8 Z" stroke={main} strokeWidth="1.2" fill={subtle} />
          <line x1="12" y1="3" x2="12" y2="21" stroke={faint} strokeWidth="0.8" />
          <line x1="8" y1="8" x2="16" y2="8" stroke={faint} strokeWidth="0.8" />
          <line x1="8" y1="17" x2="16" y2="17" stroke={faint} strokeWidth="0.6" />
          <path d="M4 12 L6 8 L6 16 L4 20" stroke={faint} strokeWidth="1" fill="none" />
          <path d="M20 10 L18 7 L18 15 L20 18" stroke={faint} strokeWidth="1" fill="none" />
        </g>
      );

    case 'abyssal_pool':
      // Ripples on water
      return (
        <g>
          <circle cx="12" cy="12" r="2" stroke={main} strokeWidth="1.2" fill={main} opacity={0.3} />
          <circle cx="12" cy="12" r="5" stroke={main} strokeWidth="1" fill="none" />
          <circle cx="12" cy="12" r="8" stroke={faint} strokeWidth="0.8" fill="none" />
          <circle cx="12" cy="12" r="10.5" stroke={subtle} strokeWidth="0.6" fill="none" />
          <circle cx="12" cy="12" r="0.8" fill={main} />
        </g>
      );

    case 'ghostly_presence':
      // Ghost wisp
      return (
        <g>
          <path d="M12 4 Q7 5 6 10 Q5 14 7 17 Q8 18 9 16 Q10 14 12 16 Q14 14 15 16 Q16 18 17 17 Q19 14 18 10 Q17 5 12 4" stroke={main} strokeWidth="1.2" fill={subtle} />
          <circle cx="10" cy="9" r="1.2" fill={main} opacity={0.7} />
          <circle cx="14" cy="9" r="1.2" fill={main} opacity={0.7} />
          <path d="M5 10 Q3 8 4 6" stroke={faint} strokeWidth="0.8" fill="none" />
          <path d="M19 10 Q21 8 20 6" stroke={faint} strokeWidth="0.8" fill="none" />
        </g>
      );

    case 'final_rest':
      // Campfire / flame with ground
      return (
        <g>
          <path d="M12 5 Q9 9 9 13 Q9 17 12 17 Q15 17 15 13 Q15 9 12 5" stroke={main} strokeWidth="1.2" fill={subtle} />
          <path d="M12 8 Q11 10 11 12 Q11 14 12 14 Q13 14 13 12 Q13 10 12 8" stroke={main} strokeWidth="0.8" fill={faint} />
          <line x1="5" y1="19" x2="19" y2="19" stroke={faint} strokeWidth="1" />
          <line x1="7" y1="17" x2="17" y2="17" stroke={faint} strokeWidth="0.6" />
          <circle cx="8" cy="15" r="0.6" fill={faint} />
          <circle cx="16" cy="14" r="0.6" fill={faint} />
        </g>
      );

    case 'mirror_of_potential':
      // Ornate mirror / oval with reflection line
      return (
        <g>
          <ellipse cx="12" cy="11" rx="6" ry="8" stroke={main} strokeWidth="1.2" fill={subtle} />
          <ellipse cx="12" cy="11" rx="4" ry="6" stroke={faint} strokeWidth="0.8" fill="none" />
          <line x1="10" y1="7" x2="10" y2="14" stroke={main} strokeWidth="0.8" opacity={0.4} />
          <line x1="12" y1="19" x2="12" y2="22" stroke={main} strokeWidth="1.2" />
          <line x1="9" y1="22" x2="15" y2="22" stroke={faint} strokeWidth="1" />
        </g>
      );

    // ── Fixed Events ─────────────────────────────────────────

    case 'the_chasm':
      // Gap / chasm with bridge
      return (
        <g>
          <line x1="3" y1="12" x2="9" y2="12" stroke={main} strokeWidth="1.5" />
          <line x1="15" y1="12" x2="21" y2="12" stroke={main} strokeWidth="1.5" />
          <path d="M9 12 L9 20" stroke={faint} strokeWidth="1" />
          <path d="M15 12 L15 20" stroke={faint} strokeWidth="1" />
          <line x1="9" y1="10" x2="15" y2="10" stroke={faint} strokeWidth="0.8" strokeDasharray="2 1.5" />
          <path d="M10 14 L12 18 L14 14" stroke={subtle} strokeWidth="0.8" fill="none" />
        </g>
      );

    default:
      // Fallback — diamond
      return (
        <g>
          <path d="M12 4 L18 12 L12 20 L6 12 Z" stroke={main} strokeWidth="1.2" fill={subtle} />
          <circle cx="12" cy="12" r="1.5" fill={main} opacity={0.5} />
        </g>
      );
  }
}
