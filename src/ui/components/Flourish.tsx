import { THEME } from '../theme';

interface Props {
  variant?: 'divider' | 'heading';
  width?: number;
  color?: string;
}

export function Flourish({ variant = 'divider', width = 200, color = THEME.text.tertiary }: Props) {
  if (variant === 'heading') {
    return (
      <svg width={width * 0.5} height="12" viewBox="0 0 100 12" fill="none" style={{ display: 'block', margin: '0 auto' }}>
        <path d="M0 6 Q25 0 50 6 Q75 12 100 6" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="50" cy="6" r="2.5" fill={color} />
      </svg>
    );
  }

  return (
    <svg width={width} height="20" viewBox="0 0 200 20" fill="none" style={{ display: 'block', margin: '0 auto' }}>
      {/* Left line */}
      <line x1="10" y1="10" x2="80" y2="10" stroke={color} strokeWidth="1" />
      {/* Center diamond */}
      <path d="M95 4 L100 10 L105 16 L100 10 L95 4 Z" stroke={color} strokeWidth="1" fill="none" />
      <circle cx="100" cy="10" r="2" fill={color} />
      {/* Right line */}
      <line x1="120" y1="10" x2="190" y2="10" stroke={color} strokeWidth="1" />
      {/* Left curl */}
      <path d="M80 10 Q87 4 95 4" stroke={color} strokeWidth="1" fill="none" />
      <path d="M80 10 Q87 16 95 16" stroke={color} strokeWidth="1" fill="none" />
      {/* Right curl */}
      <path d="M120 10 Q113 4 105 4" stroke={color} strokeWidth="1" fill="none" />
      <path d="M120 10 Q113 16 105 16" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
}
