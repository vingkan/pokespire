import { useState } from 'react';
import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { ScreenShell } from '../components/ScreenShell';
import { DexFrame } from '../components/DexFrame';
import { EventIcon } from '../components/EventIcon';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  onRevive: (graveyardIndex: number) => void;
  onSkip: () => void;
}

const COLOR = '#a78bfa';
const NAVY_BG = 'linear-gradient(180deg, rgba(14,14,24,0.85) 0%, rgba(18,18,30,0.75) 100%)';

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

function DiamondMarker({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      background: color,
      transform: 'rotate(45deg)',
      flexShrink: 0,
    }} />
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    }}>
      <DiamondMarker color={COLOR} />
      <div style={{
        fontSize: 9,
        color: THEME.text.tertiary,
        ...THEME.heading,
        letterSpacing: '0.12em',
      }}>
        {children}
      </div>
    </div>
  );
}

export function GhostReviveScreen({ run, onRevive, onSkip }: Props) {
  const [phase, setPhase] = useState<'narrative' | 'pick'>('narrative');

  const hasGraveyard = run.graveyard.length > 0;

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EventIcon eventId="the_chasm" color={COLOR} size={28} />
        <h1 style={{
          fontSize: 24,
          margin: 0,
          color: COLOR,
          letterSpacing: THEME.heading.letterSpacing,
          textTransform: THEME.heading.textTransform,
        }}>
          The Chasm
        </h1>
      </div>
    </div>
  );

  return (
    <ScreenShell header={header} ambient>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '24px 16px 48px',
        maxWidth: 700,
        margin: '0 auto',
      }}>
        {phase === 'narrative' && (
          <>
            <div className="ghost-fadein" style={{ width: '100%', maxWidth: 500 }}>
              <DexFrame>
                <div style={{
                  padding: '20px 28px',
                  background: NAVY_BG,
                  borderRadius: 2,
                  color: THEME.text.primary,
                  fontSize: 15,
                  lineHeight: 1.7,
                  textAlign: 'center',
                }}>
                  The ghostly presence fades. Haunter and Gastly dissolve into the darkness below, finally at peace.
                </div>
              </DexFrame>
            </div>

            <img
              src={getSpriteUrl('gengar')}
              alt="Gengar"
              style={{
                width: 96,
                height: 96,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                filter: `drop-shadow(0 0 12px ${COLOR}66)`,
              }}
            />

            <div className="ghost-fadein" style={{ width: '100%', maxWidth: 500, animationDelay: '0.15s' }}>
              <DexFrame>
                <div style={{
                  padding: '20px 28px',
                  background: NAVY_BG,
                  borderRadius: 2,
                  color: THEME.text.primary,
                  fontSize: 15,
                  lineHeight: 1.7,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}>
                  But Gengar lingers. Its eyes glow with an otherworldly light, and it turns to you with something almost like... sympathy.
                  {hasGraveyard && (
                    <>
                      {'\n\n'}
                      It reaches a shadowy hand toward the void. It can fetch the soul of a departed companion — one who fell in battle.
                    </>
                  )}
                </div>
              </DexFrame>
            </div>

            {hasGraveyard ? (
              <button
                onClick={() => setPhase('pick')}
                style={{ ...THEME.button.primary, padding: '12px 32px', fontSize: 16 }}
              >
                Choose a Fallen Ally
              </button>
            ) : (
              <>
                <div style={{ fontSize: 14, color: THEME.text.tertiary, textAlign: 'center' }}>
                  But none of your companions have fallen. Gengar nods and vanishes.
                </div>
                <button
                  onClick={onSkip}
                  style={{ ...THEME.button.primary, padding: '12px 32px', fontSize: 16 }}
                >
                  Continue
                </button>
              </>
            )}
          </>
        )}

        {phase === 'pick' && (
          <>
            <SectionHeading>CHOOSE A FALLEN ALLY TO REVIVE</SectionHeading>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {run.graveyard.map((pokemon, i) => {
                const data = getPokemon(pokemon.formId);
                return (
                  <div
                    key={i}
                    className="ghost-pick-card"
                    onClick={() => onRevive(i)}
                    style={{
                      width: 150,
                      padding: 16,
                      borderRadius: 2,
                      border: `1px solid ${THEME.border.medium}`,
                      background: THEME.chrome.backdrop,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLOR;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = THEME.border.medium;
                    }}
                  >
                    <img
                      src={getSpriteUrl(pokemon.formId)}
                      alt={data.name}
                      style={{
                        width: 64, height: 64,
                        imageRendering: 'pixelated',
                        objectFit: 'contain',
                        filter: 'brightness(0.6) saturate(0.3)',
                      }}
                    />
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4, color: THEME.text.primary }}>
                      {data.name}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 4 }}>
                      Lv.{pokemon.level} — will revive at {Math.floor(pokemon.maxHp * 0.5)} HP
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={onSkip}
              style={{ ...THEME.button.secondary, padding: '8px 20px', fontSize: 13 }}
            >
              Decline
            </button>
          </>
        )}
      </div>

      <style>{`
        .ghost-pick-card {
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .ghost-pick-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        @keyframes ghost-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ghost-fadein {
          animation: ghost-fadein 0.3s ease-out both;
        }
      `}</style>
    </ScreenShell>
  );
}
