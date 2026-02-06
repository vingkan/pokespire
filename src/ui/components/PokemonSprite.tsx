import { useState } from 'react';
import type { Combatant } from '../../engine/types';
import type { DamagePreview } from '../../engine/preview';
import { HealthBar } from './HealthBar';
import { EnergyBar } from './EnergyBar';
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
}

export function PokemonSprite({ combatant, isCurrentTurn, isTargetable, onSelect, onInspect, onDragEnter, onDragLeave, onDrop, damagePreview, isDragHovered }: Props) {
  const [imgError, setImgError] = useState(false);
  const isEnemy = combatant.side === 'enemy';

  const spriteUrl = isEnemy
    ? `https://img.pokemondb.net/sprites/black-white/anim/normal/${combatant.pokemonId}.gif`
    : `https://img.pokemondb.net/sprites/black-white/anim/back-normal/${combatant.pokemonId}.gif`;

  const opacity = combatant.alive ? 1 : 0.3;

  // Scale sprite based on Pokemon height (Pikachu = 80px reference)
  const spriteSize = getSpriteSize(combatant.pokemonId);

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
        filter: isCurrentTurn
          ? 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.8))'
          : isTargetable && combatant.alive
            ? 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))'
            : 'none',
      }}>
        <div style={{ fontSize: 17, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 4 }}>
          {combatant.name}
        </div>

        {!imgError ? (
          <img
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
          <div style={{
            width: spriteSize,
            height: spriteSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
          }}>
            {isEnemy ? '👾' : '🔮'}
          </div>
        )}
      </div>

      {combatant.block > 0 && (
        <div style={{
          fontSize: 15,
          color: '#60a5fa',
          fontWeight: 'bold',
        }}>
          🛡️ {combatant.block}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 120 }}>
        <HealthBar current={combatant.hp} max={combatant.maxHp} />
      </div>

      {combatant.side === 'player' && (
        <div style={{ width: '100%', maxWidth: 120 }}>
          <EnergyBar current={combatant.energy} max={combatant.energyCap} />
        </div>
      )}

      <StatusIcons statuses={combatant.statuses} />

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
