import { useState } from 'react';

interface Player {
  id: string;
  name: string;
}

interface PlayerSetupScreenProps {
  onContinue: (players: Player[]) => void;
  onBack: () => void;
}

export function PlayerSetupScreen({ onContinue, onBack }: PlayerSetupScreenProps) {
  const [numPlayers, setNumPlayers] = useState(1);
  const [players, setPlayers] = useState<Player[]>([{ id: '1', name: '' }]);

  const handleNumPlayersChange = (num: number) => {
    setNumPlayers(num);
    const newPlayers: Player[] = [];
    for (let i = 1; i <= num; i++) {
      newPlayers.push(players[i - 1] || { id: String(i), name: '' });
    }
    setPlayers(newPlayers);
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], name };
    setPlayers(newPlayers);
  };

  const handleContinue = () => {
    if (players.every(p => p.name.trim())) {
      onContinue(players);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '40px',
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'auto',
      }}
    >
      <h1 style={{ fontSize: '36px', marginBottom: '32px', marginTop: '40px' }}>Player Setup</h1>
      
      <div style={{ width: '100%', maxWidth: '700px', marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '18px' }}>
          Number of Players:
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[1, 2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => handleNumPlayersChange(num)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: numPlayers === num ? '#3b82f6' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '700px', marginBottom: '32px' }}>
        {players.map((player, index) => (
          <div key={player.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Player {index + 1} Name:
            </label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => handlePlayerNameChange(index, e.target.value)}
              placeholder={`Enter player ${index + 1} name`}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#1e293b',
                color: 'white',
                border: '2px solid #374151',
                borderRadius: '8px',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          tabIndex={0}
          onClick={onBack}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          tabIndex={1}
          onClick={handleContinue}
          disabled={!players.every(p => p.name.trim())}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: players.every(p => p.name.trim()) ? '#3b82f6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: players.every(p => p.name.trim()) ? 'pointer' : 'not-allowed',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
