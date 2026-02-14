import { useMemo } from 'react';
import type { ActMapConfig } from './mapConfig';

interface Props {
  config: ActMapConfig;
}

interface Particle {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
}

export function MapBackground({ config }: Props) {
  const particles = useMemo(() => {
    const result: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      result.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        delay: `${Math.random() * -20}s`,
        duration: `${15 + Math.random() * 10}s`,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
    return result;
  }, []);

  return (
    <>
      {/* Background image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Tint overlay — lighter to let more image through */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: config.tintColor,
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />

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
            background: config.ambientColor,
            opacity: p.opacity,
            animation: `mapParticleFloat ${p.duration} ${p.delay} infinite ease-in-out`,
            pointerEvents: 'none',
          }}
        />
      ))}

      <style>{`
        @keyframes mapParticleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0; }
          25% { opacity: 0.4; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.3; }
          75% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
