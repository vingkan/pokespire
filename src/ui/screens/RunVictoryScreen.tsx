import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { PASSIVE_DEFINITIONS } from '../../run/progression';
import { AmbientBackground } from '../components/AmbientBackground';
import { Flourish } from '../components/Flourish';
import { THEME } from '../theme';
import { GoldCoin } from '../components/GoldCoin';

interface Props {
  run: RunState;
  onNewRun: () => void;
}

export function RunVictoryScreen({ run, onNewRun }: Props) {
  // Combine party + graveyard so KO'd Pokemon still appear on the victory screen
  const fullRoster = [
    ...run.party.map(p => ({ ...p, fallen: false })),
    ...run.graveyard.map(p => ({ ...p, fallen: true })),
  ];
  const aliveCount = run.party.filter(p => p.currentHp > 0).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: '48px 32px',
      color: THEME.text.primary,
      minHeight: '100dvh',
      overflowY: 'auto',
      position: 'relative',
    }}>
      <AmbientBackground tint="rgba(250, 204, 21, 0.02)" />

      {/* Main Menu — subtle top-right */}
      <button
        className="victory-menu-btn"
        onClick={onNewRun}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          fontSize: 13,
          ...THEME.button.secondary,
          zIndex: 1,
        }}
      >
        Main Menu
      </button>

      {/* ── Title Block ── */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div
          className="victory-title"
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: THEME.accent,
            textShadow: `0 0 30px rgba(250, 204, 21, 0.4), 0 0 60px rgba(250, 204, 21, 0.15)`,
            ...THEME.heading,
            letterSpacing: '0.2em',
          }}
        >
          VICTORY
        </div>
        <div className="victory-flourish" style={{ marginTop: 4 }}>
          <Flourish variant="divider" width={280} color={THEME.accent} />
        </div>
      </div>

      {/* ── Subtitle ── */}
      <div
        className="victory-subtitle"
        style={{
          fontSize: 18,
          color: THEME.text.secondary,
          textAlign: 'center',
          maxWidth: 500,
          lineHeight: 1.6,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Mewtwo has been subdued. Team Rocket's ambitions lie in ruins.
        <br />
        Your team emerges from the caverns, triumphant.
      </div>

      {/* ── Party Roster ── */}
      <div
        className="victory-party"
        style={{
          display: 'flex',
          gap: 20,
          padding: '28px 32px',
          background: THEME.chrome.backdrop,
          borderRadius: 12,
          border: `1px solid ${THEME.border.medium}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {fullRoster.map((pokemon, i) => {
          const basePokemon = getPokemon(pokemon.formId);
          const hpPercent = Math.max(0, (pokemon.currentHp / pokemon.maxHp) * 100);
          const isDead = pokemon.fallen || pokemon.currentHp <= 0;
          const passiveNames = pokemon.passiveIds
            .map(id => PASSIVE_DEFINITIONS[id]?.name)
            .filter(Boolean);

          return (
            <div
              key={i}
              className="victory-pokemon"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                opacity: isDead ? 0.35 : 1,
                minWidth: 100,
                animationDelay: `${i * 80 + 400}ms`,
              }}
            >
              {/* Sprite */}
              <div style={{
                position: 'relative',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                  alt={basePokemon.name}
                  style={{
                    width: 80,
                    height: 80,
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                    filter: isDead ? 'grayscale(100%)' : 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.2))',
                  }}
                />
              </div>

              {/* Name */}
              <div style={{
                fontSize: 14,
                fontWeight: 'bold',
                ...THEME.heading,
                letterSpacing: '0.1em',
              }}>
                {basePokemon.name}
              </div>

              {/* Level */}
              <div style={{
                fontSize: 11,
                color: THEME.text.tertiary,
                letterSpacing: '0.08em',
              }}>
                Lv. {pokemon.level}
              </div>

              {/* HP Bar */}
              <div style={{
                width: 80,
                height: 6,
                background: THEME.border.subtle,
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${hpPercent}%`,
                  height: '100%',
                  background: isDead ? THEME.border.medium
                    : hpPercent > 50 ? '#22c55e'
                    : hpPercent > 25 ? '#eab308'
                    : '#ef4444',
                  borderRadius: 3,
                  transition: 'width 1s ease-out',
                }} />
              </div>

              {/* HP Text */}
              <div style={{ fontSize: 11, color: THEME.text.tertiary }}>
                {isDead ? 'KO' : `${pokemon.currentHp}/${pokemon.maxHp}`}
              </div>

              {/* Passives (if any) */}
              {passiveNames.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  marginTop: 2,
                }}>
                  {passiveNames.map((name, pi) => (
                    <div key={pi} style={{
                      fontSize: 9,
                      color: THEME.text.tertiary,
                      opacity: 0.7,
                      letterSpacing: '0.05em',
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              )}

              {/* Card count */}
              <div style={{
                fontSize: 10,
                color: THEME.text.tertiary,
                opacity: 0.5,
              }}>
                {pokemon.deck.length} cards
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Run Stats ── */}
      <div
        className="victory-stats"
        style={{
          display: 'flex',
          gap: 32,
          fontSize: 13,
          color: THEME.text.tertiary,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span>{aliveCount}/{fullRoster.length} survived</span>
        <span>{run.gold}<GoldCoin size={12} /> remaining</span>
      </div>

      {/* ── Bottom Flourish + CTA ── */}
      <div
        className="victory-cta"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Flourish variant="heading" width={100} color={THEME.text.tertiary} />
        <button
          className="victory-new-run-btn"
          onClick={onNewRun}
          style={{
            padding: '14px 48px',
            fontSize: 18,
            fontWeight: 'bold',
            border: `1.5px solid ${THEME.accent}`,
            borderRadius: 8,
            background: 'transparent',
            color: THEME.accent,
            cursor: 'pointer',
            ...THEME.heading,
          }}
        >
          New Run
        </button>
      </div>

      {/* Animations */}
      <style>{`
        .victory-title {
          animation: victoryTitleIn 0.8s ease-out forwards;
          opacity: 0;
        }
        @keyframes victoryTitleIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .victory-flourish {
          animation: victoryFadeIn 0.5s ease-out 0.3s forwards;
          opacity: 0;
        }
        .victory-subtitle {
          animation: victoryFadeIn 0.5s ease-out 0.4s forwards;
          opacity: 0;
        }
        .victory-party {
          animation: victoryFadeIn 0.5s ease-out 0.5s forwards;
          opacity: 0;
        }
        .victory-stats {
          animation: victoryFadeIn 0.4s ease-out 0.7s forwards;
          opacity: 0;
        }
        .victory-cta {
          animation: victoryFadeIn 0.4s ease-out 0.8s forwards;
          opacity: 0;
        }

        @keyframes victoryFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Pokemon staggered entrance */
        .victory-pokemon {
          animation: victoryPokemonIn 0.4s ease-out forwards;
          opacity: 0;
        }
        @keyframes victoryPokemonIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* New Run button hover */
        .victory-new-run-btn {
          transition: all 0.2s ease;
          box-shadow: inset 0 0 8px rgba(250, 204, 21, 0.1);
        }
        .victory-new-run-btn:hover {
          background: rgba(250, 204, 21, 0.08) !important;
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.2), inset 0 0 12px rgba(250, 204, 21, 0.15);
          transform: scale(1.03);
        }

        /* Breathing glow on the New Run button */
        .victory-new-run-btn {
          animation: victoryBtnBreathe 3s ease-in-out 1.5s infinite;
        }
        @keyframes victoryBtnBreathe {
          0%, 100% {
            box-shadow: inset 0 0 8px rgba(250, 204, 21, 0.1);
          }
          50% {
            box-shadow: 0 0 16px rgba(250, 204, 21, 0.15), inset 0 0 12px rgba(250, 204, 21, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
