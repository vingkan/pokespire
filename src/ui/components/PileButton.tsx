import { THEME } from '../theme';

interface Props {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function PileButton({ label, count, isActive, onClick }: Props) {
  return (
    <button
      onClick={() => count > 0 && onClick()}
      style={{
        ...THEME.button.secondary,
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: isActive ? 'bold' : 'normal',
        ...(isActive ? {
          borderColor: THEME.accent,
          background: THEME.bg.elevated,
          boxShadow: 'inset 0 0 8px rgba(250,204,21,0.1)',
        } : {}),
        color: count > 0 ? THEME.text.primary : THEME.text.tertiary,
        cursor: count > 0 ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {label} ({count})
    </button>
  );
}
