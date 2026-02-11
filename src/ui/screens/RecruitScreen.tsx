import type { RunState, RecruitNode } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { getRecruitLevel } from '../../run/state';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  node: RecruitNode;
  battleResult: 'pending' | 'victory' | 'defeat' | null;
  onStartFight: (partyIndex: number) => void;
  onRecruit: () => void;
  onDecline: () => void;
  onRestart: () => void;
}

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

export function RecruitScreen({ run, node, battleResult, onStartFight, onRecruit, onDecline, onRestart }: Props) {
  const wildPokemon = getPokemon(node.pokemonId);
  const recruitLevel = getRecruitLevel(run);
  const benchFull = run.bench.length >= 4;

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
    }}>
      <button
        onClick={onRestart}
        style={{
          ...THEME.button.secondary,
          padding: '6px 14px',
          fontSize: 12,
        }}
      >
        Main Menu
      </button>
      <h1 style={{
        fontSize: 24,
        margin: 0,
        color: '#f97316',
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        Wild Encounter
      </h1>
      <div style={{ width: 80 }} />
    </div>
  );

  return (
    <ScreenShell header={header}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '32px 16px 48px',
      }}>
        {/* Wild Pokemon display */}
        <div style={{
          textAlign: 'center',
          padding: 24,
          background: '#f9731622',
          border: '2px solid #f9731644',
          borderRadius: 16,
        }}>
          <img
            src={getSpriteUrl(node.pokemonId)}
            alt={wildPokemon.name}
            style={{
              width: 120,
              height: 120,
              imageRendering: 'pixelated',
              objectFit: 'contain',
            }}
          />
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f97316', marginTop: 8 }}>
            {wildPokemon.name}
          </div>
          <div style={{ fontSize: 14, color: THEME.text.secondary, marginTop: 4 }}>
            Level {recruitLevel} | {wildPokemon.maxHp} HP
          </div>
          <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
            Type: {wildPokemon.types.join(' / ')}
          </div>
        </div>

        {/* Phase: Select fighter */}
        {!battleResult && (
          <>
            <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center', maxWidth: 450 }}>
              A wild {wildPokemon.name} appears! Choose one of your Pokemon to fight it 1-on-1. Win to recruit it to your bench.
            </p>

            <div style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {run.party.map((pokemon, i) => {
                const basePokemon = getPokemon(pokemon.formId);
                const isDead = pokemon.knockedOut || pokemon.currentHp <= 0;
                const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;

                return (
                  <div
                    key={i}
                    onClick={() => !isDead && onStartFight(i)}
                    style={{
                      width: 150,
                      padding: 14,
                      borderRadius: 14,
                      border: isDead ? '3px solid ' + THEME.border.subtle : '3px solid #f97316',
                      background: '#1e1e2e',
                      cursor: isDead ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      opacity: isDead ? 0.4 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDead) {
                        e.currentTarget.style.boxShadow = '0 0 16px #f9731644';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img
                      src={getSpriteUrl(pokemon.formId)}
                      alt={basePokemon.name}
                      style={{
                        width: 64,
                        height: 64,
                        imageRendering: 'pixelated',
                        objectFit: 'contain',
                        filter: isDead ? 'grayscale(100%)' : 'none',
                      }}
                    />
                    <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 4 }}>
                      {basePokemon.name}
                    </div>
                    <div style={{
                      width: '100%',
                      height: 6,
                      background: THEME.border.subtle,
                      borderRadius: 3,
                      overflow: 'hidden',
                      marginTop: 6,
                    }}>
                      <div style={{
                        width: `${hpPercent}%`,
                        height: '100%',
                        background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                        borderRadius: 3,
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>
                      {pokemon.currentHp}/{pokemon.maxHp} HP
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Phase: Victory */}
        {battleResult === 'victory' && (
          <>
            <div style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#4ade80',
            }}>
              {wildPokemon.name} wants to join your team!
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={onRecruit}
                disabled={benchFull}
                style={{
                  padding: '14px 36px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  borderRadius: 10,
                  border: 'none',
                  background: benchFull ? '#333' : '#f97316',
                  color: benchFull ? '#666' : '#000',
                  cursor: benchFull ? 'not-allowed' : 'pointer',
                }}
              >
                {benchFull ? 'Bench Full' : 'Add to Bench'}
              </button>
              <button
                onClick={onDecline}
                style={{
                  padding: '14px 36px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  borderRadius: 10,
                  border: `2px solid ${THEME.border.bright}`,
                  background: 'transparent',
                  color: THEME.text.secondary,
                  cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </div>

            {benchFull && (
              <div style={{ fontSize: 13, color: '#ef4444' }}>
                Your bench is full (4/4). Decline to continue.
              </div>
            )}
          </>
        )}

        {/* Phase: Defeat */}
        {battleResult === 'defeat' && (
          <>
            <div style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ef4444',
            }}>
              The wild {wildPokemon.name} fled!
            </div>
            <button
              onClick={onDecline}
              style={{
                padding: '14px 36px',
                fontSize: 16,
                fontWeight: 'bold',
                borderRadius: 10,
                border: 'none',
                background: THEME.accent,
                color: '#000',
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
