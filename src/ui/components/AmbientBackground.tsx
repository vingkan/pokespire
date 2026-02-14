import { useMemo } from 'react';

interface Particle {
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  driftX: number;
  driftY: number;
}

interface Props {
  /** Optional warm tint overlay (e.g. 'rgba(250,204,21,0.03)' for gold warmth) */
  tint?: string;
  /** Number of particles (default 35) */
  particleCount?: number;
}

export function AmbientBackground({ tint, particleCount = 35 }: Props) {
  const particles = useMemo(() => {
    const result: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      result.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 3,
        delay: Math.random() * -30,
        duration: 18 + Math.random() * 14,
        opacity: 0.1 + Math.random() * 0.25,
        driftX: -15 + Math.random() * 30,
        driftY: -20 + Math.random() * -10, // always drift upward
      });
    }
    return result;
  }, [particleCount]);

  // Generate per-particle keyframes with baked-in values
  // (CSS var() inside @keyframes doesn't resolve per-element in many browsers)
  const keyframes = useMemo(() => {
    return particles.map((p, i) => `
      @keyframes ambientDrift${i} {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 0;
        }
        15% {
          opacity: ${p.opacity};
        }
        50% {
          transform: translate(${p.driftX}px, ${p.driftY}px) scale(1.15);
          opacity: ${p.opacity};
        }
        85% {
          opacity: ${p.opacity};
        }
        100% {
          transform: translate(${p.driftX * 2}px, ${p.driftY * 2}px) scale(1);
          opacity: 0;
        }
      }
    `).join('\n');
  }, [particles]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {/* Radial gradient base — deep navy center fading to black */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, #0d1b2a 0%, #070e18 55%, #020408 100%)',
      }} />

      {/* Vignette — heavy darkening at edges and corners */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%)',
      }} />

      {/* Optional tint overlay */}
      {tint && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: tint,
        }} />
      )}

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(180, 200, 255, 0.6)',
            boxShadow: `0 0 ${p.size + 2}px rgba(180, 200, 255, 0.15)`,
            opacity: 0,
            animation: `ambientDrift${i} ${p.duration}s ${p.delay}s infinite ease-in-out`,
          }}
        />
      ))}

      <style>{keyframes}</style>
    </div>
  );
}
