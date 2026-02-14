export const THEME = {
  // Warm text hierarchy
  text: {
    primary: '#f0e6d3',     // warm cream (was #e2e8f0)
    secondary: '#b8a99a',   // warm muted (was #94a3b8)
    tertiary: '#8a7e72',    // warm dim (was #64748b)
  },
  // Accent (unchanged)
  accent: '#facc15',
  // Backgrounds (unchanged)
  bg: {
    base: '#0f0f17',
    panel: '#1e1e2e',
    panelDark: '#1a1a24',
    elevated: '#2d2d3f',
  },
  // Borders - warmer
  border: {
    subtle: '#3a3530',      // warm dark (was #333)
    medium: '#4a4540',      // warm mid (was #444)
    bright: '#5a5550',      // warm bright (was #555)
  },
  // Heading style
  heading: {
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },

  // Semantic colors for status/feedback
  status: {
    damage: '#ef4444',
    heal: '#4ade80',
    energy: '#60a5fa',
    warning: '#f97316',
  },

  // Side colors (player/enemy allegiance)
  side: {
    player: '#2a4a6e',      // muted blue-grey
    enemy: '#6e2a2a',       // muted red-brown
  },

  // Shared chrome patterns — semi-transparent backdrops over battle bg
  chrome: {
    backdrop: 'rgba(18, 18, 26, 0.55)',
    backdropLight: 'rgba(18, 18, 26, 0.35)',
  },

  // Button presets (used as style spreads)
  button: {
    // Primary action (End Turn, Play Again)
    primary: {
      border: '1.5px solid #facc15',
      background: 'transparent',
      color: '#facc15',
      borderRadius: 8,
      fontWeight: 'bold' as const,
      cursor: 'pointer',
      boxShadow: 'inset 0 0 8px rgba(250,204,21,0.1)',
    },
    // Secondary action (Config, Reset, Close, Deck, Discard)
    secondary: {
      border: '1.5px solid #4a4540',
      background: 'rgba(42, 38, 34, 0.6)',
      color: '#b8a99a',
      borderRadius: 6,
      fontWeight: 'bold' as const,
      cursor: 'pointer',
      boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)',
    },
  },
} as const;
