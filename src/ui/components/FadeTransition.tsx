import { useState, useEffect, useRef } from 'react';

interface Props {
  /** Key that triggers a transition when it changes (e.g. the screen name) */
  transitionKey: string;
  children: React.ReactNode;
  /** Fade-out duration in ms (default 150) */
  fadeOutMs?: number;
  /** Fade-in duration in ms (default 300) */
  fadeInMs?: number;
}

/**
 * Wraps children in a fade-out / fade-in transition when `transitionKey` changes.
 * The ambient background stays constant behind this.
 */
export function FadeTransition({
  transitionKey,
  children,
  fadeOutMs = 150,
  fadeInMs = 300,
}: Props) {
  const [displayKey, setDisplayKey] = useState(transitionKey);
  const [phase, setPhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const pendingKey = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey === displayKey) return;
    pendingKey.current = transitionKey;

    // Start fade-out
    setPhase('fading-out');

    const fadeOutTimer = setTimeout(() => {
      // Swap content and start fade-in
      setDisplayKey(pendingKey.current);
      setPhase('fading-in');

      const fadeInTimer = setTimeout(() => {
        setPhase('visible');
      }, fadeInMs);

      return () => clearTimeout(fadeInTimer);
    }, fadeOutMs);

    return () => clearTimeout(fadeOutTimer);
  }, [transitionKey, displayKey, fadeOutMs, fadeInMs]);

  const opacity = phase === 'fading-out' ? 0 : 1;
  const duration = phase === 'fading-out' ? fadeOutMs : phase === 'fading-in' ? fadeInMs : 0;

  return (
    <div
      style={{
        transition: duration > 0 ? `opacity ${duration}ms ease` : 'none',
        opacity,
        width: '100%',
        minHeight: '100dvh',
      }}
    >
      {children}
    </div>
  );
}
