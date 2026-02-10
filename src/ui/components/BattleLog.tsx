import { useRef, useEffect } from 'react';
import type { LogEntry } from '../../engine/types';

interface Props {
  logs: LogEntry[];
}

export function BattleLog({ logs }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div style={{
      width: '100%',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      background: '#0a0a12',
      borderRadius: 8,
      padding: 8,
      border: '1px solid #222',
    }}>
      {logs.map((log, i) => (
        <div
          key={i}
          style={{
            fontSize: 14,
            color: log.message.includes('---') ? '#facc15'
              : log.message.includes('defeated') ? '#ef4444'
              : log.message.includes('heals') ? '#4ade80'
              : '#94a3b8',
            padding: '1px 0',
          }}
        >
          {log.message}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
