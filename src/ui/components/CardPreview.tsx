import { useState } from 'react';
import type { MoveDefinition, MoveType, CardRarity } from '../../engine/types';
import { THEME } from '../theme';
import { CardTypeMotif } from './CardTypeMotif';
import { ItemMotif } from './ItemMotif';

interface Props {
  card: MoveDefinition;
  onClick?: () => void;
  isSelected?: boolean;
  showHoverEffect?: boolean;
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
  steel: '#b8b8d0',
  fairy: '#ee99ac',
  item: '#4ade80',
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
  any_ally: 'Any Ally',
};

const RARITY_COLORS: Record<CardRarity, string | null> = {
  basic: null,
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#a855f7',
  legendary: '#fbbf24',
};

/** Build a static description (no combat modifiers). */
function buildDescription(card: MoveDefinition): React.ReactNode {
  const parts: React.ReactNode[] = [];

  for (const effect of card.effects) {
    switch (effect.type) {
      case 'damage': {
        const bonusText = effect.bonusCondition === 'target_debuff_stacks'
          ? ` (+${effect.bonusValue} per debuff on target)`
          : effect.bonusCondition === 'user_below_half_hp'
            ? ` (+${effect.bonusValue} below half HP)`
            : '';
        parts.push(<span key={parts.length}>Deal {effect.value} damage{bonusText}.</span>);
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
        const total = effect.value * effect.hits;
        parts.push(
          <span key={parts.length}>
            Hit {effect.hits}× for {effect.value} each ({total} total).
          </span>
        );
        break;
      }
      case 'heal_on_hit': {
        const healPct = Math.round(effect.healPercent * 100);
        parts.push(
          <span key={parts.length}>
            Deal {effect.value} damage. Heal {healPct}% dealt.
          </span>
        );
        break;
      }
      case 'recoil': {
        const recoilPct = Math.round(effect.recoilPercent * 100);
        parts.push(
          <span key={parts.length}>
            Deal {effect.value} damage. Take {recoilPct}% recoil.
          </span>
        );
        break;
      }
      case 'set_damage':
        parts.push(
          <span key={parts.length} style={{ color: '#fbbf24' }}>
            Deal {effect.value} fixed damage.
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
      case 'self_ko':
        parts.push(
          <span key={parts.length} style={{ color: '#ef4444' }}>
            Deal {effect.value} damage. <b>User faints.</b>
          </span>
        );
        break;
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

export function CardPreview({ card, onClick, isSelected = false, showHoverEffect = true }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const primaryEffect = card.effects[0]?.type || 'damage';
  const effectColor = EFFECT_COLORS[primaryEffect] || '#888';
  const moveTypeColor = MOVE_TYPE_COLORS[card.type] || MOVE_TYPE_COLORS.normal;
  const rarityColor = card.rarity ? RARITY_COLORS[card.rarity] : null;

  const isClickable = !!onClick;
  const showHoverGlow = showHoverEffect && isClickable && isHovered && !isSelected;

  // Rarity border glow for rare+ cards
  const rarityGlow = rarityColor && card.rarity && ['rare', 'epic', 'legendary'].includes(card.rarity)
    ? `inset 0 0 12px ${rarityColor}22`
    : '';
  const hoverGlow = showHoverGlow ? `0 0 16px 4px ${moveTypeColor}55` : '';
  const typeTintShadow = `inset 0 0 8px ${moveTypeColor}25`;
  const combinedShadow = [typeTintShadow, rarityGlow, hoverGlow].filter(Boolean).join(', ') || 'none';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 140,
        minHeight: 180,
        background: isSelected
          ? `linear-gradient(to bottom, ${moveTypeColor}18, ${THEME.bg.elevated})`
          : `linear-gradient(to bottom, ${moveTypeColor}14, ${THEME.bg.panel})`,
        border: isSelected
          ? `1.5px solid ${effectColor}`
          : `1.5px solid ${THEME.border.medium}`,
        borderRadius: 8,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        position: 'relative',
        boxShadow: combinedShadow,
        transform: isHovered && isClickable ? 'translateY(-4px)' : 'none',
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
            <filter id="cost-glow-preview" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M16 2 L28 16 L16 30 L4 16 Z"
            fill={THEME.bg.panelDark}
            stroke="#5b8cc9"
            strokeWidth="1.2"
          />
          <path
            d="M16 5 L25.5 16 L16 27 L6.5 16 Z"
            fill="rgba(96, 165, 250, 0.12)"
            stroke="rgba(96, 165, 250, 0.3)"
            strokeWidth="0.8"
            filter="url(#cost-glow-preview)"
          />
        </svg>
        <span style={{
          position: 'relative',
          fontSize: 14,
          fontWeight: 'bold',
          color: '#a0c4f0',
          textShadow: '0 0 6px rgba(96, 165, 250, 0.5)',
        }}>
          {card.cost}
        </span>
      </div>

      {/* SVG type motif band */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '2px 0 0',
        opacity: 0.9,
      }}>
        {card.isItem ? (
          <ItemMotif itemId={card.id} width={120} height={36} />
        ) : (
          <CardTypeMotif type={card.type} color={moveTypeColor} width={120} height={36} />
        )}
      </div>

      {/* Card name */}
      <div style={{
        fontSize: 14,
        fontWeight: 'bold',
        color: THEME.text.primary,
        textAlign: 'center',
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
        <span style={{ flex: 1, height: 1, background: THEME.border.subtle, maxWidth: 24 }} />
        {RANGE_LABELS[card.range] || card.range}
        <span style={{ flex: 1, height: 1, background: THEME.border.subtle, maxWidth: 24 }} />
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12,
        color: THEME.text.secondary,
        flex: 1,
        lineHeight: 1.4,
      }}>
        {buildDescription(card)}
      </div>

      {/* Vanish / Single Use badge */}
      {card.singleUse ? (
        <div style={{
          fontSize: 11,
          color: '#4ade80',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          SINGLE USE
        </div>
      ) : card.vanish ? (
        <div style={{
          fontSize: 11,
          color: '#f97316',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          VANISH
        </div>
      ) : null}

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
        gap: 4,
      }}>
        <span style={{ color: THEME.text.tertiary }}>——</span>
        {card.type}
        <span style={{ color: THEME.text.tertiary }}>——</span>
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
