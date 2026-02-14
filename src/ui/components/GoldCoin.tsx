/**
 * Small inline gold coin SVG — replaces the plain "g" suffix on currency amounts.
 * Filled gold disc with a subtle inner ring for depth.
 * Uses inline-flex so it sits naturally next to numbers in any text context.
 */
export function GoldCoin({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{
        display: 'inline-block',
        verticalAlign: '-0.1em',
        marginLeft: 2,
        filter: 'drop-shadow(0 0 2px rgba(250, 204, 21, 0.35))',
      }}
    >
      <circle cx="6" cy="6" r="5.2" fill="#facc15" />
      <circle cx="6" cy="6" r="3.6" fill="none" stroke="#b89100" strokeWidth="0.7" opacity="0.35" />
    </svg>
  );
}
