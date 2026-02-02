import { CAMPAIGN_MAP, getNode } from '../../config/campaign';
import { getAvailablePaths } from '../../engine/campaign';
import type { CampaignState } from '../../engine/types';
import { MapNode } from '../components/MapNode';
import { getPokemonStats } from '../../config/pokemon';

interface MapScreenProps {
  campaignState: CampaignState;
  onNodeClick: (nodeId: string) => void;
}

export function MapScreen({ campaignState, onNodeClick }: MapScreenProps) {
  const availablePaths = getAvailablePaths(campaignState);
  const currentNode = getNode(campaignState.currentNodeId);

  // Simple linear layout for now (could be enhanced with graph visualization)
  const allNodes = Object.values(CAMPAIGN_MAP.nodes);

  return (
    <div
      style={{
        height: '100vh',
        padding: '24px',
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'auto',
      }}
    >
      <h1 style={{ fontSize: '36px', marginBottom: '24px', textAlign: 'center' }}>Campaign Map</h1>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px', padding: '20px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Party Status</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {campaignState.party.map((member, i) => {
            const stats = getPokemonStats(member.pokemonId);
            return (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#111827',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{stats.name}</div>
                {member.playerName && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{member.playerName}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Current Node: {currentNode?.name}</h2>
        {availablePaths.length > 0 && (
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Available Paths:</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {availablePaths.map(nodeId => {
                const node = getNode(nodeId);
                if (!node) return null;
                return (
                  <MapNode
                    key={nodeId}
                    node={node}
                    isCurrent={false}
                    isAvailable={true}
                    isCompleted={false}
                    onClick={() => onNodeClick(nodeId)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>All Nodes:</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {allNodes.map(node => (
            <MapNode
              key={node.id}
              node={node}
              isCurrent={node.id === campaignState.currentNodeId}
              isAvailable={availablePaths.includes(node.id)}
              isCompleted={campaignState.completedNodes.has(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
