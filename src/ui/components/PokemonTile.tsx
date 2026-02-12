import { useState } from 'react';
import type { MoveType } from '../../engine/types';
import { THEME } from '../theme';
import { CardTypeMotif } from './CardTypeMotif';

// ── Type color map (shared across the app) ──────────────────────────

export const TYPE_COLORS: Record<MoveType, string> = {
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
  item: '#4ade80',
};

// ── Size presets ─────────────────────────────────────────────────────

type TileSize = 'small' | 'medium' | 'large';

interface SizeConfig {
  width: number;
  spriteSize: number;
  motifWidth: number;
  motifHeight: number;
  nameFontSize: number;
  typeFontSize: number;
  flankerMaxWidth: number;
  padding: number;
  gap: number;
  showType: boolean;
  showStats: boolean;
}

const SIZE_CONFIGS: Record<TileSize, SizeConfig> = {
  small: {
    width: 80,
    spriteSize: 48,
    motifWidth: 70,
    motifHeight: 18,
    nameFontSize: 10,
    typeFontSize: 0,     // hidden at small
    flankerMaxWidth: 12,
    padding: 6,
    gap: 2,
    showType: false,
    showStats: false,
  },
  medium: {
    width: 120,
    spriteSize: 64,
    motifWidth: 100,
    motifHeight: 24,
    nameFontSize: 13,
    typeFontSize: 9,
    flankerMaxWidth: 18,
    padding: 10,
    gap: 3,
    showType: true,
    showStats: false,
  },
  large: {
    width: 150,
    spriteSize: 80,
    motifWidth: 130,
    motifHeight: 30,
    nameFontSize: 15,
    typeFontSize: 10,
    flankerMaxWidth: 24,
    padding: 14,
    gap: 4,
    showType: true,
    showStats: true,
  },
};

// ── Props ────────────────────────────────────────────────────────────

interface Props {
  /** Display name. */
  name: string;
  /** Sprite URL — the tile renders the image. */
  spriteUrl: string;
  /** Primary type (first in the pokemon's type array). Used for motif + color. */
  primaryType: MoveType;
  /** Optional second type — shown in dual-type badge at large size. */
  secondaryType?: MoveType;
  /** Tile size preset. */
  size?: TileSize;
  /** Whether this tile is currently selected (accent border + glow). */
  isSelected?: boolean;
  /** Click handler. */
  onClick?: () => void;
  /** Whether the tile is draggable. */
  draggable?: boolean;
  /** Drag start handler. */
  onDragStart?: (e: React.DragEvent) => void;
  /** Drag end handler. */
  onDragEnd?: (e: React.DragEvent) => void;
  /** Optional stat line (e.g. "HP: 45 | SPD: 65"). */
  stats?: string;
  /** Extra content rendered below the name (badges, level, etc). */
  children?: React.ReactNode;
}

export function PokemonTile({
  name,
  spriteUrl,
  primaryType,
  secondaryType,
  size = 'medium',
  isSelected = false,
  onClick,
  draggable: isDraggable,
  onDragStart,
  onDragEnd,
  stats,
  children,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const cfg = SIZE_CONFIGS[size];
  const typeColor = TYPE_COLORS[primaryType] || TYPE_COLORS.normal;

  const isClickable = !!onClick;
  const showHoverGlow = isClickable && isHovered && !isSelected;

  // ── Shadow layers (same pattern as CardPreview) ──
  const typeTint = `inset 0 0 ${cfg.width * 0.08}px ${typeColor}20`;
  const selectedGlow = isSelected ? `inset 0 0 14px ${typeColor}30, 0 0 10px ${typeColor}33` : '';
  const hoverGlow = showHoverGlow ? `0 0 12px 2px ${typeColor}44` : '';
  const combinedShadow = [typeTint, selectedGlow, hoverGlow].filter(Boolean).join(', ') || 'none';

  return (
    <div
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: cfg.width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: cfg.gap,
        padding: cfg.padding,
        // Type-tinted gradient background (matches card style)
        background: isSelected
          ? `linear-gradient(to bottom, ${typeColor}18, ${THEME.bg.elevated})`
          : `linear-gradient(to bottom, ${typeColor}10, ${THEME.bg.panel})`,
        border: isSelected
          ? `1.5px solid ${typeColor}`
          : `1.5px solid ${THEME.border.medium}`,
        borderRadius: 8,
        cursor: isDraggable ? 'grab' : isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        boxShadow: combinedShadow,
        transform: isHovered && isClickable ? 'translateY(-3px)' : 'none',
        position: 'relative',
      }}
    >
      {/* ── Type motif header band ── */}
      <div style={{ opacity: 0.85, flexShrink: 0 }}>
        <CardTypeMotif
          type={primaryType}
          color={typeColor}
          width={cfg.motifWidth}
          height={cfg.motifHeight}
        />
      </div>

      {/* ── Sprite ── */}
      <img
        src={spriteUrl}
        alt={name}
        draggable={false}
        style={{
          width: cfg.spriteSize,
          height: cfg.spriteSize,
          imageRendering: 'pixelated',
          objectFit: 'contain',
          flexShrink: 0,
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      {/* ── Name with flanking lines ── */}
      <div style={{
        fontSize: cfg.nameFontSize,
        fontWeight: 'bold',
        color: THEME.text.primary,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        justifyContent: 'center',
        width: '100%',
      }}>
        <span style={{
          flex: 1,
          height: 1,
          background: THEME.border.subtle,
          maxWidth: cfg.flankerMaxWidth,
        }} />
        <span style={{ lineHeight: 1.2 }}>{name}</span>
        <span style={{
          flex: 1,
          height: 1,
          background: THEME.border.subtle,
          maxWidth: cfg.flankerMaxWidth,
        }} />
      </div>

      {/* ── Stats (large only) ── */}
      {cfg.showStats && stats && (
        <div style={{
          fontSize: 11,
          color: THEME.text.secondary,
          textAlign: 'center',
        }}>
          {stats}
        </div>
      )}

      {/* ── Extra content (badges, level indicators, etc) ── */}
      {children}

      {/* ── Type badge with em-dashes (medium/large) ── */}
      {cfg.showType && (
        <div style={{
          fontSize: cfg.typeFontSize,
          fontWeight: 'bold',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          width: '100%',
        }}>
          <span style={{ color: THEME.text.tertiary }}>——</span>
          <span style={{ color: typeColor }}>{primaryType}</span>
          {secondaryType && secondaryType !== primaryType && (
            <>
              <span style={{ color: THEME.text.tertiary }}>/</span>
              <span style={{ color: TYPE_COLORS[secondaryType] || typeColor }}>
                {secondaryType}
              </span>
            </>
          )}
          <span style={{ color: THEME.text.tertiary }}>——</span>
        </div>
      )}
    </div>
  );
}
