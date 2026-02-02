interface IntroScreenProps {
  onStart: () => void;
  onReset?: () => void;
  hasSavedGame?: boolean;
}

export function IntroScreen({ onStart, onReset, hasSavedGame }: IntroScreenProps) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'auto',
      }}
    >
      <h1 style={{ fontSize: '48px', marginBottom: '24px', textAlign: 'center' }}>Pokespire</h1>
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          padding: '32px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}
      >
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>The Team Rocket Lab</h2>
        <p style={{ marginBottom: '12px' }}>
          Mewtwo has escaped from the Team Rocket laboratory and is wreaking havoc. 
          As a trainer, you must navigate through the lab, battle through waves of 
          enemies, and face Giovanni before confronting the escaped Mewtwo.
        </p>
        <p>
          Choose your starter Pokemon, build your deck, and fight your way through 
          this roguelike adventure!
        </p>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', alignItems: 'center' }}>
        {hasSavedGame && (
          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
            Saved game detected. Starting will resume your progress.
          </div>
        )}
        <button
          onClick={onStart}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          {hasSavedGame ? 'Continue Game' : 'Start New Run'}
        </button>
        {hasSavedGame && onReset && (
          <button
            onClick={onReset}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
          >
            Reset Game
          </button>
        )}
      </div>
    </div>
  );
}
