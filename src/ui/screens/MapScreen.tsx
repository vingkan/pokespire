import { useState } from 'react';
import type { RunState, MapNode, BattleNode } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { canPokemonLevelUp, getAvailableNextNodes, EXP_PER_LEVEL } from '../../run/state';
import { getNodesAtStage, getMaxStage } from '../../run/nodes';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';
import { getSpriteSize } from '../../data/heights';

interface Props {
  run: RunState;
  onSelectNode: (nodeId: string) => void;
  onLevelUp: (pokemonIndex: number) => void;
}

// Position for a node in the map coordinate system
interface NodePosition {
  x: number;  // center x
  y: number;  // center y
}

/** Get mini sprite URL for a Pokemon (using black-white which has all Gen 1) */
function getMiniSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

function getNodeIcon(node: MapNode): string {
  if (node.type === 'spawn') return 'S';
  if (node.type === 'rest') return 'R';
  if (node.type === 'battle') {
    // Show skull for boss, crossed swords for regular battle
    if (node.stage === 8) return '☠';
    return '⚔';
  }
  return '?';
}

function getNodeColor(node: MapNode, isAvailable: boolean, isVisited: boolean, isCurrent: boolean): string {
  if (isCurrent) return '#facc15';
  if (isVisited) return '#22c55e';
  if (isAvailable) return '#60a5fa';
  // Battle nodes get a red tint when not yet available
  if (node.type === 'battle') return '#666';
  return '#444';
}

// Layout constants
const NODE_SIZE = 60;
const NODE_GAP = 20;
const MAP_PADDING_X = 60;
const MAP_PADDING_Y = 40;
const MAP_WIDTH = 900;   // Fixed map content width
const MAP_HEIGHT = 320;  // Fixed map content height

/**
 * Calculate positions for all nodes based on stage and index within stage.
 * Returns a Map from nodeId to {x, y} coordinates (center of node).
 */
function calculateNodePositions(
  nodesByStage: MapNode[][],
  maxStage: number
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  nodesByStage.forEach((stageNodes, stageIndex) => {
    // X position: distribute stages evenly across width
    const x = MAP_PADDING_X + (stageIndex / Math.max(maxStage, 1)) * MAP_WIDTH + NODE_SIZE / 2;

    // Y positions: center the column of nodes vertically
    const totalHeight = stageNodes.length * NODE_SIZE + (stageNodes.length - 1) * NODE_GAP;
    const startY = MAP_PADDING_Y + (MAP_HEIGHT - totalHeight) / 2;

    stageNodes.forEach((node, nodeIndex) => {
      const y = startY + nodeIndex * (NODE_SIZE + NODE_GAP) + NODE_SIZE / 2;
      positions.set(node.id, { x, y });
    });
  });

  return positions;
}

export function MapScreen({ run, onSelectNode, onLevelUp }: Props) {
  const [selectedPokemonIndex, setSelectedPokemonIndex] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

  const availableNodes = getAvailableNextNodes(run);
  const availableNodeIds = new Set(availableNodes.map(n => n.id));
  const visitedNodeIds = new Set(run.visitedNodeIds);
  const maxStage = getMaxStage(run.nodes);

  const handleNodeClick = (node: MapNode) => {
    if (availableNodeIds.has(node.id)) {
      onSelectNode(node.id);
    }
  };

  const handlePokemonClick = (index: number) => {
    const pokemon = run.party[index];
    if (pokemon.currentHp > 0) {
      setSelectedPokemonIndex(index);
    }
  };

  const handleClosePanel = () => {
    setSelectedPokemonIndex(null);
  };

  const handleLevelUp = (pokemonIndex: number) => {
    onLevelUp(pokemonIndex);
  };

  // Group nodes by stage for rendering
  const nodesByStage: MapNode[][] = [];
  for (let stage = 0; stage <= maxStage; stage++) {
    nodesByStage.push(getNodesAtStage(run.nodes, stage));
  }

  // Calculate all node positions from data (no DOM queries needed)
  const nodePositions = calculateNodePositions(nodesByStage, maxStage);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: 32,
      color: '#e2e8f0',
      minHeight: '100vh',
      background: '#0f0f17',
    }}>
      <h1 style={{ fontSize: 30, margin: 0, color: '#facc15' }}>
        Act 1 - Map
      </h1>

      {/* Party Status */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 16,
        padding: 16,
        background: '#1e1e2e',
        borderRadius: 12,
        border: '1px solid #333',
      }}>
        {run.party.map((pokemon, i) => {
          const basePokemon = getPokemon(pokemon.formId);
          const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
          const isDead = pokemon.currentHp <= 0;
          const canLevel = canPokemonLevelUp(pokemon);

          return (
            <div
              key={i}
              onClick={() => handlePokemonClick(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                opacity: isDead ? 0.4 : 1,
                cursor: isDead ? 'default' : 'pointer',
                padding: 8,
                borderRadius: 8,
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* Level-up badge */}
              {canLevel && !isDead && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#facc15',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: 15,
                  animation: 'pulse 1s infinite',
                }}>
                  !
                </div>
              )}

              <img
                src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                alt={basePokemon.name}
                style={{
                  width: getSpriteSize(pokemon.formId) * 0.7,
                  height: getSpriteSize(pokemon.formId) * 0.7,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  filter: isDead ? 'grayscale(100%)' : 'none',
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{basePokemon.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Lv.{pokemon.level} | {pokemon.exp}/{EXP_PER_LEVEL} EXP
              </div>
              <div style={{
                width: 60,
                height: 6,
                background: '#333',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                  borderRadius: 3,
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {pokemon.currentHp}/{pokemon.maxHp}
              </div>
            </div>
          );
        })}
      </div>

      {/* Branching Map */}
      <div
        style={{
          position: 'relative',
          width: MAP_WIDTH + MAP_PADDING_X * 2,
          height: MAP_HEIGHT + MAP_PADDING_Y * 2,
          background: '#1a1a24',
          borderRadius: 16,
          border: '1px solid #333',
          overflow: 'visible',
        }}
      >
        {/* SVG layer for connection paths */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {run.nodes.map(node => {
            const fromPos = nodePositions.get(node.id);
            if (!fromPos) return null;

            return node.connectsTo.map(targetId => {
              const toPos = nodePositions.get(targetId);
              if (!toPos) return null;

              const isPathVisited = visitedNodeIds.has(node.id) && visitedNodeIds.has(targetId);
              const isPathAvailable = visitedNodeIds.has(node.id) && availableNodeIds.has(targetId);

              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isPathVisited ? '#22c55e' : isPathAvailable ? '#60a5fa' : '#444'}
                  strokeWidth={isPathAvailable ? 3 : 2}
                  strokeDasharray={isPathVisited || isPathAvailable ? 'none' : '5,5'}
                  opacity={0.6}
                />
              );
            });
          })}
        </svg>

        {/* Nodes layer - absolutely positioned */}
        {run.nodes.map(node => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isCurrent = node.id === run.currentNodeId;
          const isVisited = visitedNodeIds.has(node.id);
          const isAvailable = availableNodeIds.has(node.id);
          const nodeColor = getNodeColor(node, isAvailable, isVisited, isCurrent);
          const isHovered = hoveredNode?.id === node.id;

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                position: 'absolute',
                left: pos.x - NODE_SIZE / 2,
                top: pos.y - NODE_SIZE / 2,
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: '50%',
                background: isCurrent || isVisited ? nodeColor : '#2a2a3a',
                border: `3px solid ${nodeColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAvailable ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: isAvailable ? `0 0 12px ${nodeColor}66` : 'none',
                transform: isAvailable ? 'scale(1.1)' : 'scale(1)',
                zIndex: isHovered ? 100 : 1,
              }}
            >
              <span style={{
                fontSize: 22,
                fontWeight: 'bold',
                color: isCurrent || isVisited ? '#000' : nodeColor,
              }}>
                {getNodeIcon(node)}
              </span>

              {/* Hover preview for battle nodes */}
              {isHovered && node.type === 'battle' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '100%',
                  transform: 'translateY(-50%)',
                  marginLeft: 12,
                  padding: '6px 10px',
                  background: '#1e1e2e',
                  border: `2px solid ${node.stage === 8 ? '#a855f7' : '#ef4444'}`,
                  borderRadius: 8,
                  display: 'flex',
                  gap: 2,
                  zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {node.stage === 8 ? (
                    /* Mystery silhouette for final boss */
                    <div style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: '#a855f7',
                      textShadow: '0 0 8px #a855f7',
                    }}>
                      ?
                    </div>
                  ) : (
                    (node as BattleNode).enemies.map((enemyId, idx) => (
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
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Stage labels at bottom */}
        {nodesByStage.map((_, stageIndex) => {
          const x = MAP_PADDING_X + (stageIndex / Math.max(maxStage, 1)) * MAP_WIDTH + NODE_SIZE / 2;
          return (
            <div
              key={`label-${stageIndex}`}
              style={{
                position: 'absolute',
                left: x,
                bottom: 8,
                transform: 'translateX(-50%)',
                fontSize: 12,
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              {stageIndex === 0 ? 'Start' : stageIndex === maxStage ? 'Boss' : `Stage ${stageIndex}`}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 24,
        fontSize: 13,
        color: '#94a3b8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#facc15' }} />
          <span>Current</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#22c55e' }} />
          <span>Visited</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #60a5fa', background: 'transparent' }} />
          <span>Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>S = Start</span>
          <span>R = Rest</span>
          <span>B = Boss</span>
        </div>
      </div>

      {/* Instructions */}
      {availableNodes.length > 0 && (
        <div style={{
          padding: '12px 24px',
          background: '#60a5fa22',
          border: '1px solid #60a5fa',
          borderRadius: 8,
          color: '#60a5fa',
          fontSize: 14,
        }}>
          Click a glowing node to continue your journey
        </div>
      )}

      {/* Pokemon Details Panel */}
      {selectedPokemonIndex !== null && (
        <PokemonDetailsPanel
          pokemon={run.party[selectedPokemonIndex]}
          pokemonIndex={selectedPokemonIndex}
          partySize={run.party.length}
          onClose={handleClosePanel}
          onLevelUp={handleLevelUp}
          onNavigate={setSelectedPokemonIndex}
        />
      )}

      {/* Pulse animation for level-up badge */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
