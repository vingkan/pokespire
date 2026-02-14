import { useState, useRef, useEffect } from 'react';
import type { RunState, RunPokemon, MapNode } from '../../run/types';
import { getAvailableNextNodes } from '../../run/state';
import { PokemonDetailsPanel } from '../components/PokemonDetailsPanel';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

import { getActMapConfig } from '../components/map/mapConfig';
import { MapBackground } from '../components/map/MapBackground';
import { MapNode as MapNodeComponent, type NodeState } from '../components/map/MapNode';
import { MapPath, type PathState } from '../components/map/MapPath';
import { MapTooltip } from '../components/map/MapTooltip';
import { MapLegend } from '../components/map/MapLegend';
import { MapPartySidebar } from '../components/map/MapPartySidebar';
import { RearrangeModal } from '../components/map/RearrangeModal';
import { ShopScreen } from './ShopScreen';
import { MoveDeleterScreen } from './MoveDeleterScreen';

interface Props {
  run: RunState;
  onSelectNode: (nodeId: string) => void;
  onLevelUp: (pokemonIndex: number) => void;
  onSwap: (partyIndex: number, benchIndex: number) => void;
  onPromote: (benchIndex: number) => void;
  onRearrange: (newParty: RunPokemon[], newBench: RunPokemon[]) => void;
  onPurchase: (moveId: string, pokemonIndex: number) => void;
  onForgetCard: (pokemonIndex: number, cardIndex: number, source: 'party' | 'bench') => void;
  onRestart: () => void;
}

// Padding inset so nodes don't sit at the very edge
const MAP_INSET = 40;

function getNodeState(
  nodeId: string,
  currentNodeId: string,
  visitedIds: Set<string>,
  availableIds: Set<string>,
): NodeState {
  if (nodeId === currentNodeId) return 'current';
  if (visitedIds.has(nodeId)) return 'visited';
  if (availableIds.has(nodeId)) return 'available';
  return 'locked';
}

function getPathState(
  fromId: string,
  toId: string,
  visitedIds: Set<string>,
  availableIds: Set<string>,
): PathState {
  if (visitedIds.has(fromId) && visitedIds.has(toId)) return 'visited';
  if (visitedIds.has(fromId) && availableIds.has(toId)) return 'available';
  return 'locked';
}

export function MapScreen({ run, onSelectNode, onLevelUp, onSwap, onPromote, onRearrange, onPurchase, onForgetCard, onRestart }: Props) {
  const [selectedPokemonIndex, setSelectedPokemonIndex] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [mapSize, setMapSize] = useState({ width: 900, height: 500 });
  const [showRearrange, setShowRearrange] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showMoveDeleter, setShowMoveDeleter] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const actConfig = getActMapConfig(run.currentAct);
  const availableNodes = getAvailableNextNodes(run);
  const availableNodeIds = new Set(availableNodes.map(n => n.id));
  const visitedNodeIds = new Set(run.visitedNodeIds);

  // Measure map container on mount and resize
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setMapSize({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute pixel positions from normalized node.x, node.y
  const nodePositions = new Map<string, { x: number; y: number }>();
  for (const node of run.nodes) {
    nodePositions.set(node.id, {
      x: MAP_INSET + node.x * (mapSize.width - MAP_INSET * 2),
      y: MAP_INSET + node.y * (mapSize.height - MAP_INSET * 2),
    });
  }

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px 8px',
    }}>
      <h1 style={{
        fontSize: 24,
        margin: 0,
        color: THEME.accent,
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        {actConfig.title}
      </h1>
      <button
        onClick={onRestart}
        style={{
          ...THEME.button.secondary,
          padding: '6px 14px',
          fontSize: 12,
        }}
      >
        Main Menu
      </button>
    </div>
  );

  return (
    <ScreenShell header={header}>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Party sidebar */}
        <MapPartySidebar
          party={run.party}
          bench={run.bench}
          graveyard={run.graveyard}
          gold={run.gold}
          onPokemonClick={(i) => {
            if (run.party[i].currentHp > 0) setSelectedPokemonIndex(i);
          }}
          onSwap={onSwap}
          onPromote={onPromote}
          onRearrange={() => setShowRearrange(true)}
          onOpenShop={() => setShowShop(true)}
          onOpenMoveDeleter={() => setShowMoveDeleter(true)}
        />

        {/* Map area — fills remaining space */}
        <div
          ref={mapRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background layers */}
          <MapBackground config={actConfig} />

          {/* SVG paths */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
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
                const pState = getPathState(node.id, targetId, visitedNodeIds, availableNodeIds);
                // Hide detour return paths (detour → main) when locked to avoid messy cross-map lines.
                // The entry paths (main → detour) and internal paths (detour → detour) still render.
                if (pState === 'locked' && node.id.includes('detour') && !targetId.includes('detour')) {
                  return null;
                }
                return (
                  <MapPath
                    key={`${node.id}-${targetId}`}
                    fromPos={fromPos}
                    toPos={toPos}
                    state={pState}
                  />
                );
              });
            })}
          </svg>

          {/* Nodes */}
          {run.nodes.map(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;
            const nState = getNodeState(node.id, run.currentNodeId, visitedNodeIds, availableNodeIds);
            const isBoss = node.id === actConfig.bossNodeId;

            return (
              <MapNodeComponent
                key={node.id}
                nodeType={node.type}
                position={pos}
                state={nState}
                isBoss={isBoss}
                nodeSize={node.size}
                eventId={node.type === 'event' ? node.eventId : undefined}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  if (availableNodeIds.has(node.id)) onSelectNode(node.id);
                }}
              />
            );
          })}

          {/* Tooltip */}
          {hoveredNode && nodePositions.get(hoveredNode.id) && (
            <MapTooltip
              node={hoveredNode}
              position={nodePositions.get(hoveredNode.id)!}
              mapBounds={mapSize}
              actConfig={actConfig}
            />
          )}

          {/* Legend at bottom */}
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
          }}>
            <MapLegend />
          </div>

          {/* Instruction banner */}
          {availableNodes.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 18px',
              background: 'rgba(96, 165, 250, 0.12)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              borderRadius: 8,
              color: '#60a5fa',
              fontSize: 13,
              pointerEvents: 'none',
            }}>
              Click a glowing node to continue
            </div>
          )}
        </div>
      </div>

      {/* Pokemon Details Panel */}
      {selectedPokemonIndex !== null && (
        <PokemonDetailsPanel
          pokemon={run.party[selectedPokemonIndex]}
          pokemonIndex={selectedPokemonIndex}
          partySize={run.party.length}
          onClose={() => setSelectedPokemonIndex(null)}
          onLevelUp={onLevelUp}
          onNavigate={setSelectedPokemonIndex}
        />
      )}

      {/* Rearrange Formation Modal */}
      {showRearrange && (
        <RearrangeModal
          party={run.party}
          bench={run.bench}
          onConfirm={(newParty, newBench) => {
            onRearrange(newParty, newBench);
            setShowRearrange(false);
          }}
          onClose={() => setShowRearrange(false)}
        />
      )}

      {/* Shop Modal */}
      {showShop && (
        <ShopScreen
          run={run}
          onPurchase={onPurchase}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Move Deleter Modal */}
      {showMoveDeleter && (
        <MoveDeleterScreen
          run={run}
          onForgetCard={onForgetCard}
          onClose={() => setShowMoveDeleter(false)}
          onRestart={onRestart}
        />
      )}
    </ScreenShell>
  );
}
