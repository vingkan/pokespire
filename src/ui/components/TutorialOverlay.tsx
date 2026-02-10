import type { TutorialDialogue } from '../../data/tutorialDialogue';

interface Props {
  dialogue: TutorialDialogue;
  onDismiss: () => void;
}

const SPEAKER_CONFIG = {
  slowking: {
    label: 'Slowking',
    sprite: 'https://img.pokemondb.net/sprites/black-white/anim/normal/slowking.gif',
    borderColor: '#60a5fa',
    labelColor: '#60a5fa',
  },
  slowbro: {
    label: 'Slowbro',
    sprite: 'https://img.pokemondb.net/sprites/black-white/anim/normal/slowbro.gif',
    borderColor: '#f472b6',
    labelColor: '#f472b6',
  },
} as const;

export function TutorialOverlay({ dialogue, onDismiss }: Props) {
  const isNarrator = dialogue.speaker === 'narrator';
  const config = !isNarrator ? SPEAKER_CONFIG[dialogue.speaker] : null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        cursor: 'pointer',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          maxWidth: 700,
          width: '100%',
          marginTop: 56,
        }}
      >
        {/* Speaker portrait */}
        {config && (
          <div style={{
            flexShrink: 0,
            width: 80,
            height: 80,
            borderRadius: 12,
            background: 'rgba(30, 30, 50, 0.9)',
            border: `2px solid ${config.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img
              src={config.sprite}
              alt={config.label}
              style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Dialogue box */}
        <div style={{
          flex: 1,
          background: 'rgba(15, 15, 30, 0.95)',
          border: isNarrator
            ? '1px solid #475569'
            : `2px solid ${config!.borderColor}`,
          borderRadius: 12,
          padding: '16px 20px',
          position: 'relative',
        }}>
          {/* Speaker label */}
          {config && (
            <div style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: config.labelColor,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {config.label}
            </div>
          )}

          {/* Text */}
          <div style={{
            fontSize: 16,
            lineHeight: 1.5,
            color: isNarrator ? '#94a3b8' : '#e2e8f0',
            fontStyle: isNarrator ? 'italic' : 'normal',
          }}>
            {dialogue.text}
          </div>

          {/* Click hint */}
          <div style={{
            fontSize: 11,
            color: '#475569',
            textAlign: 'right',
            marginTop: 8,
          }}>
            Click to continue
          </div>
        </div>
      </div>
    </div>
  );
}
