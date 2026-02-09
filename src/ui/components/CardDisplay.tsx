import { useState } from 'react';
import type { MoveDefinition, Combatant, MoveType, CardRarity } from '../../engine/types';
import { getStatusStacks } from '../../engine/status';
import { hasSTAB, STAB_BONUS } from '../../engine/damage';
import { isParentalBondCopy } from '../../data/loaders';
import { getEffectiveCost } from '../../engine/cards';

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

const MOVE_TYPE_COLORS: Record<MoveType, string> = {
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
function buildDescription(card: MoveDefinition, combatant: Combatant): React.ReactNode {
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

  const additiveMod = strength + stab + fortifiedBonus + scrappyBonus + hustleBonus - enfeeble;

  // Check for Blaze Strike multiplier (first fire attack of the turn)
  const hasBlazeStrike = combatant.passiveIds.includes('blaze_strike');
  const blazeStrikeActive = hasBlazeStrike && card.type === 'fire' && !combatant.turnFlags.blazeStrikeUsedThisTurn;

  // Check for Raging Bull multiplier (all attacks +50% when below 50% HP)
  const ragingBullActive = combatant.passiveIds.includes('raging_bull') &&
    combatant.hp < combatant.maxHp * 0.5;

  let multiplier = 1;
  if (blazeStrikeActive) multiplier *= 2;
  if (ragingBullActive) multiplier *= 1.5;

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
            {changed && (
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {' '}({multiplier > 1 ? '(' : ''}{effect.value}{additiveMod > 0 ? `+${additiveMod}` : additiveMod !== 0 ? additiveMod : ''}{multiplier > 1 ? `) x${multiplier}` : ''})
              </span>
            )}
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
    </>
  );
}

export function CardDisplay({ cardId, handIndex, card, combatant, canAfford, isSelected, onClick, onDragStart, onDragEnd, isDragging }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const primaryEffect = card.effects[0]?.type || 'damage';
  const effectColor = EFFECT_COLORS[primaryEffect] || '#888';
  const moveTypeColor = MOVE_TYPE_COLORS[card.type] || MOVE_TYPE_COLORS.normal;
  const isSTAB = hasSTAB(combatant, card.type);

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

  // Echo copies get a persistent purple glow
  const echoGlow = isEchoCopy ? '0 0 12px 3px #a855f788' : '';
  const combinedShadow = [echoGlow, showHoverGlow ? `0 0 16px 4px ${effectColor}66` : ''].filter(Boolean).join(', ') || 'none';

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
        background: isSelected
          ? '#3b3b5c'
          : isEchoCopy
            ? '#2a1e3e'
            : canAfford
              ? '#1e1e2e'
              : '#111118',
        border: isSelected
          ? `2px solid ${effectColor}`
          : isEchoCopy
            ? '2px solid #a855f7'
            : canAfford
              ? '2px solid #444'
              : '2px solid #222',
        borderRadius: 8,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        cursor: canAfford ? (isDragging ? 'grabbing' : 'grab') : 'not-allowed',
        opacity: isDragging ? 0.5 : canAfford ? 1 : 0.5,
        transition: 'all 0.15s',
        position: 'relative',
        boxShadow: combinedShadow,
        transform: isDragging ? 'scale(0.95)' : undefined,
      }}
    >
      {/* Cost badge */}
      <div style={{
        position: 'absolute',
        top: -8,
        right: -8,
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: costReduced ? '#4ade80' : '#60a5fa',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        fontWeight: 'bold',
        border: '2px solid #1e1e2e',
      }}>
        {effectiveCost}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#e2e8f0',
        borderBottom: `2px solid ${moveTypeColor}`,
        paddingBottom: 4,
      }}>
        {card.name}
      </div>

      {/* Range indicator */}
      <div style={{
        fontSize: 11,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {RANGE_LABELS[card.range] || card.range}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 13,
        color: '#94a3b8',
        flex: 1,
      }}>
        {buildDescription(card, combatant)}
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

      {/* Move type badge */}
      <div style={{
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '2px 6px',
        borderRadius: 4,
        background: moveTypeColor + '33',
        color: moveTypeColor,
        textTransform: 'uppercase',
        border: isSTAB ? `1px solid ${moveTypeColor}` : '1px solid transparent',
      }}>
        {card.type}{isSTAB && ' (STAB)'}
      </div>

      {/* Rarity gem indicator */}
      {card.rarity && RARITY_COLORS[card.rarity] && (
        <div style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `12px solid ${RARITY_COLORS[card.rarity]}`,
          filter: card.rarity === 'legendary' ? 'drop-shadow(0 0 4px #fbbf24)' : 'none',
        }} />
      )}
    </div>
  );
}
