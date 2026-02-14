import { useRef, useEffect } from 'react';
import type { LogEntry } from '../../engine/types';
import { THEME } from '../theme';

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
      background: THEME.chrome.backdrop,
      borderRadius: 8,
      padding: 8,
      border: '1px solid ' + THEME.border.subtle,
      boxShadow: 'inset 0 0 12px rgba(0,0,0,0.3)',
    }}>
      {/* Decorative scroll header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <svg width={240} height={28} viewBox="0 0 240 28" fill="none" style={{ display: 'block', margin: '0 auto' }}>
          {/* Left scroll curl */}
          <path d="M20 14 Q20 6 28 6 L60 6" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <path d="M20 14 Q20 22 28 22 L60 22" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <circle cx="20" cy="14" r="3" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <circle cx="20" cy="14" r="1" fill={THEME.text.tertiary} />
          {/* Left connecting line */}
          <line x1="60" y1="14" x2="100" y2="14" stroke={THEME.text.tertiary} strokeWidth="1" />
          {/* Central quill accent */}
          <path d="M114 14 L120 8 L126 14 L120 20 Z" stroke={THEME.text.tertiary} strokeWidth="1" fill={THEME.text.tertiary + '33'} />
          <circle cx="120" cy="14" r="2" fill={THEME.text.tertiary} />
          {/* Dot accents */}
          <circle cx="106" cy="14" r="1.2" fill={THEME.text.tertiary} opacity={0.6} />
          <circle cx="134" cy="14" r="1.2" fill={THEME.text.tertiary} opacity={0.6} />
          {/* Right connecting line */}
          <line x1="140" y1="14" x2="180" y2="14" stroke={THEME.text.tertiary} strokeWidth="1" />
          {/* Right scroll curl */}
          <path d="M220 14 Q220 6 212 6 L180 6" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <path d="M220 14 Q220 22 212 22 L180 22" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <circle cx="220" cy="14" r="3" stroke={THEME.text.tertiary} strokeWidth="1" fill="none" />
          <circle cx="220" cy="14" r="1" fill={THEME.text.tertiary} />
        </svg>
      </div>
      {logs.map((log, i) => {
        const isTurnDivider = log.message.includes('---');
        return (
          <div
            key={i}
            style={{
              fontSize: isTurnDivider ? 13 : 14,
              color: isTurnDivider ? THEME.accent
                : log.message.includes('defeated') ? THEME.status.damage
                : log.message.includes('heals') || log.message.includes('drains') ? THEME.status.heal
                : THEME.text.secondary,
              padding: '1px 0',
              ...(isTurnDivider ? { letterSpacing: '0.08em' } : {}),
            }}
          >
            {log.message}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
