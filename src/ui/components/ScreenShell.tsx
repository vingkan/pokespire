import type { ReactNode, CSSProperties } from 'react';
import { THEME } from '../theme';
import { AmbientBackground } from './AmbientBackground';

/**
 * ScreenShell — the universal viewport wrapper for every screen.
 *
 * Guarantees:
 *  - Content NEVER overflows the viewport without a scrollbar.
 *  - Header stays pinned at top; body scrolls independently.
 *  - Works regardless of how much content the body contains.
 *
 * The fix: flex children default to `min-height: auto` (their content
 * height), so `overflow-y: auto` never kicks in — the child simply
 * grows past the viewport. Setting `minHeight: 0` on the scrollable
 * area overrides that default and lets flex shrink it to fit, which
 * finally activates overflow scrolling.
 *
 * EVERY screen should use this instead of hand-rolling height/flex/overflow.
 */

interface Props {
  /** Fixed header content (navigation, title, action buttons). */
  header?: ReactNode;
  /** Scrollable body content. */
  children: ReactNode;
  /** Extra styles merged onto the scrollable body div. */
  bodyStyle?: CSSProperties;
  /** Show floating particle ambient background instead of flat dark base. */
  ambient?: boolean;
  /** Optional tint for the ambient background (e.g. 'rgba(250,204,21,0.03)'). */
  ambientTint?: string;
}

export function ScreenShell({ header, children, bodyStyle, ambient, ambientTint }: Props) {
  return (
    <div
      style={{
        height: '100dvh',         // dvh = dynamic viewport height (accounts for browser chrome)
        display: 'flex',
        flexDirection: 'column',
        background: ambient ? 'transparent' : THEME.bg.base,
        color: THEME.text.primary,
        position: 'relative',
      }}
    >
      {ambient && <AmbientBackground tint={ambientTint} />}
      {header && (
        <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {header}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,       // ← the critical line
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
