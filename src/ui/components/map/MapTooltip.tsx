import type { MapNode, BattleNode, CardRemovalNode, ActTransitionNode, EventNode, RecruitNode } from '../../../run/types';
import type { ActMapConfig } from './mapConfig';
import { ALL_EVENTS } from '../../../data/events';
import { THEME } from '../../theme';

interface Props {
  node: MapNode;
  position: { x: number; y: number };
  mapBounds: { width: number; height: number };
  actConfig: ActMapConfig;
}

function getMiniSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

function getDifficultyLabel(enemyCount: number): string {
  if (enemyCount >= 3) return 'Hard';
  if (enemyCount >= 2) return 'Medium';
  return 'Easy';
}

export function MapTooltip({ node, position, mapBounds, actConfig }: Props) {
  // Position to the right of node, fall back to left if overflowing
  const tooltipWidth = 180;
  const gap = 40;
  const rightOverflow = position.x + gap + tooltipWidth > mapBounds.width;
  const left = rightOverflow
    ? position.x - gap - tooltipWidth
    : position.x + gap;

  return (
    <div style={{
      position: 'absolute',
      left,
      top: position.y,
      transform: 'translateY(-50%)',
      width: tooltipWidth,
      padding: '10px 14px',
      background: 'rgba(20, 18, 28, 0.95)',
      border: `1.5px solid ${THEME.border.bright}`,
      borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      zIndex: 200,
      color: THEME.text.primary,
      fontSize: 13,
    }}>
      {renderContent(node, actConfig)}
      <div style={{
        marginTop: 6,
        paddingTop: 4,
        borderTop: `1px solid ${THEME.border.subtle}`,
        fontSize: 10,
        color: THEME.text.tertiary,
        fontFamily: 'monospace',
        opacity: 0.6,
      }}>
        {node.id}
      </div>
    </div>
  );
}

function renderContent(node: MapNode, actConfig: ActMapConfig) {
  switch (node.type) {
    case 'battle': {
      const battle = node as BattleNode;
      const isBoss = node.id === actConfig.bossNodeId;

      if (isBoss) {
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#a855f7',
              marginBottom: 4,
              letterSpacing: '0.08em',
            }}>
              {actConfig.bossName}
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary }}>Boss Battle</div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              marginTop: 8,
            }}>
              {battle.enemies.map((enemyId, idx) => (
                <img
                  key={idx}
                  src={getMiniSpriteUrl(enemyId)}
                  alt={enemyId}
                  style={{
                    width: 36,
                    height: 36,
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                  }}
                />
              ))}
            </div>
          </div>
        );
      }

      // Regular battle
      const difficulty = getDifficultyLabel(battle.enemies.length);
      return (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}>
            <span style={{ fontWeight: 'bold' }}>Battle</span>
            <span style={{
              fontSize: 11,
              color: difficulty === 'Hard' ? '#ef4444' : difficulty === 'Medium' ? '#eab308' : '#4ade80',
            }}>
              {difficulty}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {battle.enemies.map((enemyId, idx) => (
              <img
                key={idx}
                src={getMiniSpriteUrl(enemyId)}
                alt={enemyId}
                style={{
                  width: 36,
                  height: 36,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    case 'rest':
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Chansey's Rest</div>
          <div style={{ fontSize: 12, color: THEME.text.secondary, lineHeight: 1.4 }}>
            Heal entire party 30% HP
          </div>
        </div>
      );

    case 'card_removal': {
      const removal = node as CardRemovalNode;
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Card Removal</div>
          <div style={{ fontSize: 12, color: THEME.text.secondary }}>
            Remove up to {removal.maxRemovals} card{removal.maxRemovals > 1 ? 's' : ''}
          </div>
        </div>
      );
    }

    case 'act_transition': {
      const transition = node as ActTransitionNode;
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Continue</div>
          <div style={{ fontSize: 12, color: THEME.text.secondary }}>
            Advance to Act {transition.nextAct}
          </div>
        </div>
      );
    }

    case 'event': {
      const eventNode = node as EventNode;
      const eventDef = ALL_EVENTS[eventNode.eventId];
      const eventColor = eventDef ? '#60a5fa' : THEME.text.tertiary;
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: eventColor }}>
            {eventDef?.title ?? 'Event'}
          </div>
          <div style={{ fontSize: 12, color: THEME.text.secondary }}>
            {eventDef ? `${eventDef.choices.length} choices` : 'Unknown event'}
          </div>
        </div>
      );
    }

    case 'recruit': {
      const recruit = node as RecruitNode;
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#f97316' }}>Wild Encounter</div>
          {recruit.pokemonId ? (
            <>
              <img
                src={getMiniSpriteUrl(recruit.pokemonId)}
                alt={recruit.pokemonId}
                style={{
                  width: 48,
                  height: 48,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  margin: '4px auto',
                  display: 'block',
                }}
              />
              <div style={{ fontSize: 12, color: THEME.text.secondary }}>
                {recruit.recruited ? 'Recruited!' : '1v1 to recruit'}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: THEME.text.secondary }}>Fight to recruit</div>
          )}
        </div>
      );
    }

    case 'spawn':
      return (
        <div style={{ fontWeight: 'bold' }}>Starting Point</div>
      );

    default:
      return null;
  }
}
