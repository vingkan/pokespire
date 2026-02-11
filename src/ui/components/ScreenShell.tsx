import type { ReactNode, CSSProperties } from 'react';
import { THEME } from '../theme';

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
}

export function ScreenShell({ header, children, bodyStyle }: Props) {
  return (
    <div
      style={{
        height: '100dvh',         // dvh = dynamic viewport height (accounts for browser chrome)
        display: 'flex',
        flexDirection: 'column',
        background: THEME.bg.base,
        color: THEME.text.primary,
      }}
    >
      {header && (
        <div style={{ flexShrink: 0 }}>
          {header}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,       // ← the critical line
          overflowY: 'auto',
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
