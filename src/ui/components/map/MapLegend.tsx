import { MapNodeIcon } from './MapNodeIcon';
import { THEME } from '../../theme';

const NODE_TYPES: Array<{ type: 'spawn' | 'battle' | 'rest' | 'card_removal' | 'act_transition' | 'event' | 'recruit'; label: string }> = [
  { type: 'spawn', label: 'Start' },
  { type: 'battle', label: 'Battle' },
  { type: 'rest', label: 'Rest' },
  { type: 'event', label: 'Event' },
  { type: 'recruit', label: 'Recruit' },
  { type: 'card_removal', label: 'Card Remove' },
  { type: 'act_transition', label: 'Next Act' },
];

const STATE_INDICATORS: Array<{ label: string; color: string; filled: boolean }> = [
  { label: 'Current', color: '#facc15', filled: true },
  { label: 'Visited', color: '#22c55e', filled: true },
  { label: 'Available', color: '#60a5fa', filled: false },
  { label: 'Locked', color: '#555', filled: false },
];

export function MapLegend() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      fontSize: 12,
      color: THEME.text.secondary,
    }}>
      {/* Node type icons */}
      {NODE_TYPES.map(({ type, label }) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapNodeIcon nodeType={type} color={THEME.text.secondary} size={16} />
          <span>{label}</span>
        </div>
      ))}

      <div style={{ width: 1, height: 16, background: THEME.border.subtle }} />

      {/* State indicators — small circles matching the new node style */}
      {STATE_INDICATORS.map(({ label, color, filled }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: filled ? color : 'transparent',
            border: `2px solid ${color}`,
          }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
