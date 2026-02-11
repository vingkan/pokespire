import { useState } from 'react';
import type { MoveDefinition, Combatant, MoveType, CardRarity } from '../../engine/types';
import { getStatusStacks } from '../../engine/status';
import { hasSTAB, STAB_BONUS } from '../../engine/damage';
import { isParentalBondCopy } from '../../data/loaders';
import { getEffectiveCost } from '../../engine/cards';
import { THEME } from '../theme';
import { CardTypeMotif } from './CardTypeMotif';

interface Props {
  cardId?: string;
  handIndex?: number;
  card: MoveDefinition;
  combatant: Combatant;
  canAfford: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

const EFFECT_COLORS: Record<string, string> = {
  damage: '#ef4444',
  block: '#60a5fa',
  heal: '#4ade80',
  apply_status: '#a855f7',
  multi_hit: '#ef4444',
  heal_on_hit: '#4ade80',
  recoil: '#f97316',
  set_damage: '#fbbf24',
  percent_hp: '#f87171',
  self_ko: '#dc2626',
  draw_cards: '#60a5fa',
  gain_energy: '#fbbf24',
  apply_status_self: '#4ade80',
  cleanse: '#67e8f9',
};

export const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  poison: '#a040a0',
  flying: '#a890f0',
  psychic: '#f85888',
  dark: '#705848',
  fighting: '#c03028',
  ice: '#98d8d8',
  bug: '#a8b820',
  dragon: '#7038f8',
  ghost: '#705898',
  rock: '#b8a038',
  ground: '#e0c068',
};

const RANGE_LABELS: Record<string, string> = {
  front_enemy: 'Front',
  back_enemy: 'Back',
  any_enemy: 'Any',
  front_row: 'Front Row',
  back_row: 'Back Row',
  any_row: 'Any Row',
  column: 'Column',
  all_enemies: 'All',
  self: 'Self',
};

const RARITY_COLORS: Record<CardRarity, string | null> = {
  basic: null,       // No indicator
  common: '#9ca3af', // Grey
  uncommon: '#4ade80', // Green
  rare: '#60a5fa',   // Blue
  epic: '#a855f7',   // Purple
  legendary: '#fbbf24', // Gold
};

/** Build a live description reflecting current modifiers from passives. */
function buildDescription(card: MoveDefinition, combatant: Combatant, isHovered: boolean): React.ReactNode {
  const strength = getStatusStacks(combatant, 'strength');
  const enfeeble = getStatusStacks(combatant, 'enfeeble');
  const stab = hasSTAB(combatant, card.type) ? STAB_BONUS : 0;

  // Check for Fortified Cannons bonus (water attacks gain +25% of current block)
  const hasFortifiedCannons = combatant.passiveIds.includes('fortified_cannons');
  const fortifiedBonus = (hasFortifiedCannons && card.type === 'water' && combatant.block > 0)
    ? Math.floor(combatant.block * 0.25)
    : 0;

  // Check for Scrappy bonus (Normal attacks deal +2 damage)
  const scrappyBonus = (combatant.passiveIds.includes('scrappy') && card.type === 'normal') ? 2 : 0;

  // Check for Hustle bonus (attacks deal +2 damage)
  const hustleBonus = combatant.passiveIds.includes('hustle') ? 2 : 0;

  // Check for Poison Barb bonus (+2 for Poison attacks)
  const poisonBarbBonus = (combatant.passiveIds.includes('poison_barb') && card.type === 'poison') ? 2 : 0;

  // Check for Adaptability bonus (+2 extra STAB)
  const adaptabilityBonus = (combatant.passiveIds.includes('adaptability') && combatant.types.includes(card.type)) ? 2 : 0;

  const additiveMod = strength + stab + fortifiedBonus + scrappyBonus + hustleBonus + poisonBarbBonus + adaptabilityBonus - enfeeble;

  // Check for Blaze Strike multiplier (first fire attack of the turn)
  const hasBlazeStrike = combatant.passiveIds.includes('blaze_strike');
  const blazeStrikeActive = hasBlazeStrike && card.type === 'fire' && !combatant.turnFlags.blazeStrikeUsedThisTurn;

  // Check for Swarm Strike multiplier (first bug attack of the turn)
  const hasSwarmStrike = combatant.passiveIds.includes('swarm_strike');
  const swarmStrikeActive = hasSwarmStrike && card.type === 'bug' && !combatant.turnFlags.swarmStrikeUsedThisTurn;

  // Check for Raging Bull multiplier (all attacks +50% when below 50% HP)
  const ragingBullActive = combatant.passiveIds.includes('raging_bull') &&
    combatant.hp < combatant.maxHp * 0.5;

  let multiplier = 1;
  if (blazeStrikeActive) multiplier *= 2;
  if (swarmStrikeActive) multiplier *= 2;
  if (ragingBullActive) multiplier *= 1.5;

  // Build modifier tags for hover display
  const tags: string[] = [];
  if (stab > 0) tags.push(`+${stab} STAB`);
  if (strength > 0) tags.push(`+${strength} Strength`);
  if (enfeeble > 0) tags.push(`\u2212${enfeeble} Enfeeble`);
  if (fortifiedBonus > 0) tags.push(`+${fortifiedBonus} Fort. Cannons`);
  if (scrappyBonus > 0) tags.push(`+${scrappyBonus} Scrappy`);
  if (hustleBonus > 0) tags.push(`+${hustleBonus} Hustle`);
  if (poisonBarbBonus > 0) tags.push(`+${poisonBarbBonus} Barb`);
  if (adaptabilityBonus > 0) tags.push(`+${adaptabilityBonus} Adapt`);
  if (blazeStrikeActive) tags.push('x2 Blaze');
  if (swarmStrikeActive) tags.push('x2 Swarm');
  if (ragingBullActive) tags.push('x1.5 Rage');

  const hasDamageEffect = card.effects.some(e =>
    e.type === 'damage' || e.type === 'multi_hit' || e.type === 'heal_on_hit' ||
    e.type === 'recoil' || e.type === 'self_ko'
  );
  const showTags = isHovered && tags.length > 0 && hasDamageEffect;

  const parts: React.ReactNode[] = [];
  for (const effect of card.effects) {
    switch (effect.type) {
      case 'damage': {
        const afterAdditive = Math.max(effect.value + additiveMod, 1);
        const effective = Math.floor(afterAdditive * multiplier);
        const changed = additiveMod !== 0 || multiplier > 1;
        parts.push(
          <span key={parts.length}>
            Deal{' '}
            {changed ? (
              <span style={{ color: effective > effect.value ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>
                {effective}
              </span>
            ) : (
              <>{effective}</>
            )}
            {' '}damage.
          </span>
        );
        break;
      }
      case 'block':
        parts.push(<span key={parts.length}>Gain {effect.value} Block.</span>);
        break;
      case 'heal':
        parts.push(<span key={parts.length}>Heal {effect.value} HP.</span>);
        break;
      case 'apply_status':
        parts.push(<span key={parts.length}>Apply {effect.status} {effect.stacks}.</span>);
        break;
      case 'multi_hit': {
        const perHit = Math.floor(Math.max(effect.value + additiveMod, 1) * multiplier);
        const total = perHit * effect.hits;
        const changed = additiveMod !== 0 || multiplier > 1;
        parts.push(
          <span key={parts.length}>
            Hit {effect.hits}× for{' '}
            {changed ? (
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{perHit}</span>
            ) : (
              <>{perHit}</>
            )}
            {' '}each ({total} total).
          </span>
        );
        break;
      }
      case 'heal_on_hit': {
        const afterAdditive = Math.max(effect.value + additiveMod, 1);
        const effective = Math.floor(afterAdditive * multiplier);
        const healPct = Math.round(effect.healPercent * 100);
        const changed = additiveMod !== 0 || multiplier > 1;
        parts.push(
          <span key={parts.length}>
            Deal{' '}
            {changed ? (
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{effective}</span>
            ) : (
              <>{effective}</>
            )}
            {' '}damage. Heal {healPct}% dealt.
          </span>
        );
        break;
      }
      case 'recoil': {
        const afterAdditive = Math.max(effect.value + additiveMod, 1);
        const effective = Math.floor(afterAdditive * multiplier);
        const recoilPct = Math.round(effect.recoilPercent * 100);
        const changed = additiveMod !== 0 || multiplier > 1;
        parts.push(
          <span key={parts.length}>
            Deal{' '}
            {changed ? (
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{effective}</span>
            ) : (
              <>{effective}</>
            )}
            {' '}damage. Take {recoilPct}% recoil.
          </span>
        );
        break;
      }
      case 'set_damage':
        parts.push(
          <span key={parts.length} style={{ color: '#fbbf24' }}>
            Deal {effect.value} fixed damage (ignores modifiers).
          </span>
        );
        break;
      case 'percent_hp': {
        const pct = Math.round(effect.percent * 100);
        const hpType = effect.ofMax ? 'max' : 'current';
        parts.push(
          <span key={parts.length} style={{ color: '#f87171' }}>
            Deal {pct}% of target's {hpType} HP.
          </span>
        );
        break;
      }
      case 'self_ko': {
        const afterAdditive = Math.max(effect.value + additiveMod, 1);
        const effective = Math.floor(afterAdditive * multiplier);
        const changed = additiveMod !== 0 || multiplier > 1;
        parts.push(
          <span key={parts.length} style={{ color: '#ef4444' }}>
            Deal{' '}
            {changed ? (
              <span style={{ fontWeight: 'bold' }}>{effective}</span>
            ) : (
              <>{effective}</>
            )}
            {' '}damage. <b>User faints.</b>
          </span>
        );
        break;
      }
      case 'draw_cards':
        parts.push(
          <span key={parts.length} style={{ color: '#60a5fa' }}>
            Draw {effect.count} card{effect.count > 1 ? 's' : ''}.
          </span>
        );
        break;
      case 'gain_energy':
        parts.push(
          <span key={parts.length} style={{ color: '#fbbf24' }}>
            Gain {effect.amount} energy.
          </span>
        );
        break;
      case 'apply_status_self':
        parts.push(
          <span key={parts.length} style={{ color: '#4ade80' }}>
            Gain {effect.status} {effect.stacks}.
          </span>
        );
        break;
      case 'cleanse':
        parts.push(
          <span key={parts.length} style={{ color: '#67e8f9' }}>
            Cleanse {effect.count} debuff{effect.count > 1 ? 's' : ''}.
          </span>
        );
        break;
    }
  }

  return (
    <>
      {parts.map((p, i) => (
        <div key={i}>{p}</div>
      ))}
      {showTags && (
        <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 2 }}>
          {tags.join(' \u00b7 ')}
        </div>
      )}
    </>
  );
}

export function CardDisplay({ cardId, handIndex, card, combatant, canAfford, isSelected, onClick, onDragStart, onDragEnd, isDragging }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const primaryEffect = card.effects[0]?.type || 'damage';
  const effectColor = EFFECT_COLORS[primaryEffect] || '#888';
  const moveTypeColor = MOVE_TYPE_COLORS[card.type] || MOVE_TYPE_COLORS.normal;
  const rarityColor = card.rarity ? RARITY_COLORS[card.rarity] : null;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canAfford) {
      e.preventDefault();
      return;
    }
    // Set drag data (required for Firefox)
    e.dataTransfer.setData('text/plain', cardId || '');
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  // Check if this is a Parental Bond Echo copy
  const isEchoCopy = cardId ? isParentalBondCopy(cardId) : false;

  // Calculate effective cost (includes Quick Feet, Hustle, Inferno Momentum)
  const effectiveCost = handIndex !== undefined ? getEffectiveCost(combatant, handIndex) : card.cost;
  const costReduced = effectiveCost < card.cost || isEchoCopy;

  // Hover glow for playable cards
  const showHoverGlow = canAfford && isHovered && !isSelected;

  // Build layered box-shadow
  const typeTintShadow = `inset 0 0 8px ${moveTypeColor}25`;
  const rarityGlow = rarityColor && card.rarity && ['rare', 'epic', 'legendary'].includes(card.rarity)
    ? `inset 0 0 12px ${rarityColor}22`
    : '';
  const echoGlow = isEchoCopy ? '0 0 12px 3px #a855f788' : '';
  const hoverGlow = showHoverGlow ? `0 0 16px 4px ${moveTypeColor}55` : '';
  const combinedShadow = [typeTintShadow, rarityGlow, echoGlow, hoverGlow].filter(Boolean).join(', ') || 'none';

  // Background: type-tinted gradient, echo purple tint, or dimmed when can't afford
  // Uses opaque colors so cards remain readable when hovering over the battlefield
  const bgGradient = isSelected
    ? `linear-gradient(to bottom, ${moveTypeColor}18, ${THEME.bg.elevated}) , linear-gradient(${THEME.bg.panel}, ${THEME.bg.panel})`
    : isEchoCopy
      ? `linear-gradient(to bottom, #a855f718, #2a1e3e), linear-gradient(${THEME.bg.panel}, ${THEME.bg.panel})`
      : canAfford
        ? `linear-gradient(to bottom, ${moveTypeColor}14, ${THEME.bg.panel}), linear-gradient(${THEME.bg.panel}, ${THEME.bg.panel})`
        : `linear-gradient(to bottom, ${moveTypeColor}08, #111118), linear-gradient(#111118, #111118)`;

  // Border
  const borderColor = isSelected
    ? effectColor
    : isEchoCopy
      ? '#a855f7'
      : canAfford
        ? THEME.border.medium
        : '#222';

  return (
    <div
      draggable={canAfford}
      onClick={canAfford ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        width: 130,
        minHeight: 160,
        background: bgGradient,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: canAfford ? (isDragging ? 'grabbing' : 'grab') : 'not-allowed',
        opacity: isDragging ? 0.5 : canAfford ? 1 : 0.5,
        transition: 'all 0.15s',
        position: 'relative',
        boxShadow: combinedShadow,
        transform: isDragging ? 'scale(0.95)' : undefined,
      }}
    >
      {/* Cost badge — diamond notch */}
      <div style={{
        position: 'absolute',
        top: -12,
        right: -12,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ position: 'absolute' }}>
          <defs>
            <filter id={`cost-glow-${costReduced ? 'g' : 'b'}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Outer diamond — dark recess */}
          <path
            d="M16 2 L28 16 L16 30 L4 16 Z"
            fill={THEME.bg.panelDark}
            stroke={costReduced ? '#34d399' : '#5b8cc9'}
            strokeWidth="1.2"
          />
          {/* Inner diamond — luminous fill */}
          <path
            d="M16 5 L25.5 16 L16 27 L6.5 16 Z"
            fill={costReduced ? 'rgba(52, 211, 153, 0.15)' : 'rgba(96, 165, 250, 0.12)'}
            stroke={costReduced ? 'rgba(52, 211, 153, 0.4)' : 'rgba(96, 165, 250, 0.3)'}
            strokeWidth="0.8"
            filter={`url(#cost-glow-${costReduced ? 'g' : 'b'})`}
          />
        </svg>
        <span style={{
          position: 'relative',
          fontSize: 14,
          fontWeight: 'bold',
          color: costReduced ? '#6ee7b7' : '#a0c4f0',
          textShadow: costReduced
            ? '0 0 6px rgba(52, 211, 153, 0.6)'
            : '0 0 6px rgba(96, 165, 250, 0.5)',
        }}>
          {effectiveCost}
        </span>
      </div>

      {/* SVG type motif band */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '2px 0 0',
        opacity: 0.85,
      }}>
        <CardTypeMotif type={card.type} color={moveTypeColor} width={110} height={34} />
      </div>

      {/* Card name */}
      <div style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.text.primary,
        textAlign: 'center',
        lineHeight: 1.15,
      }}>
        {card.name}
      </div>

      {/* Range with flanking lines */}
      <div style={{
        fontSize: 10,
        color: THEME.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        justifyContent: 'center',
      }}>
        <span style={{ flex: 1, height: 1, background: THEME.border.subtle, maxWidth: 20 }} />
        {(() => {
          // Whipping Winds / Hurricane converts row attacks to all-enemy attacks
          const hasRowToAll = combatant.passiveIds.includes('whipping_winds') ||
                              combatant.passiveIds.includes('hurricane');
          const isRowTargeting = card.range === 'front_row' || card.range === 'back_row' || card.range === 'any_row';
          if (hasRowToAll && isRowTargeting) {
            return 'All';
          }
          return RANGE_LABELS[card.range] || card.range;
        })()}
        <span style={{ flex: 1, height: 1, background: THEME.border.subtle, maxWidth: 20 }} />
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12,
        color: THEME.text.secondary,
        flex: 1,
        lineHeight: 1.3,
      }}>
        {buildDescription(card, combatant, isHovered)}
      </div>

      {/* Echo badge for Parental Bond copies */}
      {isEchoCopy && (
        <div style={{
          fontSize: 11,
          color: '#a855f7',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          ECHO
        </div>
      )}

      {/* Vanish badge */}
      {card.vanish && !isEchoCopy && (
        <div style={{
          fontSize: 11,
          color: '#f97316',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          VANISH
        </div>
      )}

      {/* Type badge with flanking em-dashes */}
      <div style={{
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        color: moveTypeColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        border: '1px solid transparent',
        borderRadius: 4,
        padding: '1px 4px',
      }}>
        <span style={{ color: THEME.text.tertiary, fontSize: 8 }}>——</span>
        {card.type}
        <span style={{ color: THEME.text.tertiary, fontSize: 8 }}>——</span>
      </div>

      {/* Rarity gemstone — triangle pointing up into the card */}
      {rarityColor && card.rarity && card.rarity !== 'basic' && (
        <div style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 0 L15 12 L1 12 Z" fill={rarityColor + '55'} stroke={rarityColor} strokeWidth="1.2" />
          </svg>
        </div>
      )}
    </div>
  );
}
