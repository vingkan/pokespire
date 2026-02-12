import { useState } from 'react';
import type { Combatant } from '../../engine/types';
import type { DamagePreview } from '../../engine/preview';
import { HealthBar } from './HealthBar';
import { EnergyPips } from './EnergyPips';
import { THEME } from '../theme';
import { StatusIcons } from './StatusIcons';
import { getSpriteSize } from '../../data/heights';

interface Props {
  combatant: Combatant;
  isCurrentTurn: boolean;
  isTargetable: boolean;
  onSelect?: () => void;
  onInspect?: () => void;
  // Drag-and-drop props
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  damagePreview?: DamagePreview | null;
  isDragHovered?: boolean;
  /** Global scale factor for battle sprites (preserves size ratios across all Pokemon) */
  spriteScale?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function PokemonSprite({ combatant, isCurrentTurn, isTargetable, onSelect, onInspect, onDragEnter, onDragLeave, onDrop, damagePreview, isDragHovered, spriteScale = 1, onMouseEnter, onMouseLeave }: Props) {
  const [imgError, setImgError] = useState(false);
  const isEnemy = combatant.side === 'enemy';

  const spriteUrl = isEnemy
    ? `https://img.pokemondb.net/sprites/black-white/anim/normal/${combatant.pokemonId}.gif`
    : `https://img.pokemondb.net/sprites/black-white/anim/back-normal/${combatant.pokemonId}.gif`;

  const opacity = combatant.alive ? 1 : 0.3;

  // Scale sprite based on Pokemon weight, with global battle scale applied
  const spriteSize = Math.round(getSpriteSize(combatant.pokemonId) * spriteScale);

  // Handle click: target if targetable, otherwise inspect if available
  const handleClick = () => {
    if (isTargetable && combatant.alive && onSelect) {
      onSelect();
    } else if (onInspect) {
      onInspect();
    }
  };

  const isClickable = (isTargetable && combatant.alive) || !!onInspect;

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (isTargetable && combatant.alive) {
      e.preventDefault(); // Allow drop
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTargetable && combatant.alive) {
      onDragEnter?.();
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the actual element (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    onDragLeave?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTargetable && combatant.alive) {
      onDrop?.();
    }
  };

  // Get effectiveness color
  const getEffectivenessColor = (multiplier: number): string => {
    if (multiplier >= 1.4) return '#4ade80'; // Bright green for super effective
    if (multiplier > 1.0) return '#86efac'; // Light green for effective
    if (multiplier <= 0.6) return '#fca5a5'; // Red for barely effective
    if (multiplier < 1.0) return '#fcd34d'; // Yellow for not very effective
    return '#e2e8f0'; // Neutral
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        cursor: isClickable ? 'pointer' : 'default',
        opacity,
        transition: 'all 0.2s',
        minWidth: 140,
        position: 'relative',
        borderRadius: 8,
        background: isDragHovered ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
        border: isDragHovered ? '2px dashed #ef4444' : '2px solid transparent',
      }}
    >
      {/* Current turn / targetable indicator - subtle glow instead of box */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        filter: isCurrentTurn
          ? 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.8))'
          : isTargetable && combatant.alive
            ? 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))'
            : 'none',
      }}>
        {/* Name + sprite — scoped hover zone for enemy hand preview */}
        <div
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div style={{ fontSize: 17, fontWeight: 'bold', color: THEME.text.primary, marginBottom: 4 }}>
            {combatant.name}
          </div>

          {!imgError ? (
            <img
              data-sprite-id={combatant.id}
              src={spriteUrl}
              alt={combatant.name}
              onError={() => setImgError(true)}
              style={{
                width: spriteSize,
                height: spriteSize,
                imageRendering: 'pixelated',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              data-sprite-id={combatant.id}
              style={{
                width: spriteSize,
                height: spriteSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
              }}
            >
              {isEnemy ? '👾' : '🔮'}
            </div>
          )}
        </div>

        {/* Status icons - positioned behind the sprite, skewed to match formation tilt */}
        <div style={{
          position: 'absolute',
          top: 24,
          ...(isEnemy ? { left: '100%', marginLeft: 4 } : { right: '100%', marginRight: 4 }),
          display: 'flex',
          flexDirection: isEnemy ? 'row' : 'row-reverse',
          gap: 3,
          transform: isEnemy ? 'skewX(11deg)' : 'skewX(-11deg)',
          minWidth: 100,
        }}>
          {combatant.statuses.length > 0 && (
            <StatusIcons statuses={combatant.statuses} maxPerColumn={3} skewAngle={isEnemy ? 11 : -11} />
          )}
        </div>
      </div>

      {/* Health bar with block shield on the right (where HP depletes from) */}
      <div style={{ width: '100%', maxWidth: 120, position: 'relative' }}>
        <HealthBar current={combatant.hp} max={combatant.maxHp} />
        {combatant.block > 0 && (
          <div style={{
            position: 'absolute',
            right: -16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 34,
            zIndex: 5,
          }}>
            <svg viewBox="0 0 24 28" width="30" height="34" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
              <defs>
                <linearGradient id="shieldBase" x1="0" y1="0" x2="0.3" y2="1">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="40%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
                <linearGradient id="shieldShine" x1="0.2" y1="0" x2="0.8" y2="0.6">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              {/* Base shield */}
              <path d="M12 1 L23 6.5 L23 16 C23 21.5 17.5 26 12 27 C6.5 26 1 21.5 1 16 L1 6.5 Z" fill="url(#shieldBase)" stroke="#6b7280" strokeWidth="1.5" />
              {/* Inner highlight */}
              <path d="M12 3 L21 7.5 L21 15.5 C21 20 16.5 24 12 25 C7.5 24 3 20 3 15.5 L3 7.5 Z" fill="url(#shieldShine)" />
              {/* Rim accent */}
              <path d="M12 1 L23 6.5 L23 16 C23 21.5 17.5 26 12 27" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
            </svg>
            <span style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 13,
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}>
              {combatant.block}
            </span>
          </div>
        )}
      </div>

      {combatant.side === 'player' && (
        <EnergyPips energy={combatant.energy} energyCap={combatant.energyCap} />
      )}

      {!combatant.alive && (
        <div style={{ fontSize: 15, color: '#ef4444', fontWeight: 'bold' }}>FAINTED</div>
      )}

      {/* Damage Preview - shown on all valid targets when a card is selected or being dragged */}
      {isTargetable && damagePreview && (
        <div style={{
          position: 'absolute',
          top: -10,
          right: -10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '6px 10px',
          background: 'rgba(0, 0, 0, 0.9)',
          borderRadius: 8,
          border: `2px solid ${getEffectivenessColor(damagePreview.typeEffectiveness)}`,
          zIndex: 100,
          minWidth: 60,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Damage number */}
          <div style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ef4444',
            textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
          }}>
            -{damagePreview.isMultiHit ? damagePreview.totalDamage : damagePreview.finalDamage}
          </div>

          {/* Multi-hit indicator */}
          {damagePreview.isMultiHit && (
            <div style={{
              fontSize: 11,
              color: '#94a3b8',
            }}>
              ({damagePreview.hits}x {damagePreview.finalDamage})
            </div>
          )}

          {/* Type effectiveness label */}
          {damagePreview.effectivenessLabel && (
            <div style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: getEffectivenessColor(damagePreview.typeEffectiveness),
              textAlign: 'center',
            }}>
              {damagePreview.effectivenessLabel}
            </div>
          )}

          {/* Block/Evasion preview */}
          {(damagePreview.blockedAmount > 0 || damagePreview.evasionReduction > 0) && (
            <div style={{
              fontSize: 10,
              color: '#64748b',
              display: 'flex',
              gap: 4,
            }}>
              {damagePreview.blockedAmount > 0 && (
                <span>🛡️-{damagePreview.blockedAmount}</span>
              )}
              {damagePreview.evasionReduction > 0 && (
                <span>👁️-{damagePreview.evasionReduction}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
