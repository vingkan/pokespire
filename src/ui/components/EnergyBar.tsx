interface Props {
  current: number;
  max: number;
}

export function EnergyBar({ current, max }: Props) {
  const pct = Math.max(0, (current / max) * 100);

  return (
    <div style={{
      width: '100%',
      height: 20,
      background: '#1e1e2e',
      borderRadius: 6,
      overflow: 'hidden',
      border: '2px solid #333',
      position: 'relative',
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: '#60a5fa',
        transition: 'width 0.3s ease',
      }} />
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: '20px',
        color: '#fff',
        fontWeight: 'bold',
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
      }}>
        ⚡ {current}/{max}
      </span>
    </div>
  );
}
