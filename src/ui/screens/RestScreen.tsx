import type { RunState } from '../../run/types';
import { getPokemon } from '../../data/loaders';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

interface Props {
  run: RunState;
  onHeal: () => void;
  onRestart: () => void;
}

const HEAL_PERCENT = 0.3;

function getSpriteUrl(pokemonId: string): string {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemonId}.gif`;
}

export function RestScreen({ run, onHeal, onRestart }: Props) {
  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
    }}>
      <h1 style={{
        fontSize: 24,
        margin: 0,
        color: '#4ade80',
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        Chansey's Rest
      </h1>
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
    </div>
  );

  return (
    <ScreenShell header={header} ambient>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '32px 16px 48px',
      }}>
        {/* Chansey sprite */}
        <img
          src={getSpriteUrl('chansey')}
          alt="Chansey"
          style={{
            width: 96,
            height: 96,
            imageRendering: 'pixelated',
            objectFit: 'contain',
          }}
        />

        <div style={{
          padding: '12px 24px',
          background: '#4ade8022',
          borderRadius: 12,
          border: '2px solid #4ade8044',
          color: '#4ade80',
          fontStyle: 'italic',
          fontSize: 15,
        }}>
          "Let me take care of your team!"
        </div>

        <p style={{ color: THEME.text.secondary, margin: 0, textAlign: 'center', maxWidth: 400 }}>
          Chansey heals your entire active party by 30%.
        </p>

        {/* Party heal preview */}
        <div style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {run.party.map((pokemon, i) => {
            const basePokemon = getPokemon(pokemon.formId);
            const isDead = pokemon.knockedOut || pokemon.currentHp <= 0;
            const healAmount = isDead ? 0 : Math.floor(pokemon.maxHp * HEAL_PERCENT);
            const afterHp = isDead ? 0 : Math.min(pokemon.currentHp + healAmount, pokemon.maxHp);
            const actualHeal = afterHp - pokemon.currentHp;
            const hpPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
            const afterPercent = (afterHp / pokemon.maxHp) * 100;

            return (
              <div
                key={i}
                style={{
                  width: 160,
                  padding: 14,
                  borderRadius: 14,
                  border: isDead ? '2px solid ' + THEME.border.subtle : '2px solid #4ade8066',
                  background: '#1e1e2e',
                  textAlign: 'center',
                  opacity: isDead ? 0.4 : 1,
                }}
              >
                <img
                  src={getSpriteUrl(pokemon.formId)}
                  alt={basePokemon.name}
                  style={{
                    width: 56,
                    height: 56,
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                    filter: isDead ? 'grayscale(100%)' : 'none',
                  }}
                />
                <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 4 }}>
                  {basePokemon.name}
                </div>

                {/* HP bar showing current + heal preview */}
                <div style={{
                  width: '100%',
                  height: 8,
                  background: THEME.border.subtle,
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginTop: 8,
                  position: 'relative',
                }}>
                  {/* After-heal bar (lighter green behind) */}
                  <div style={{
                    position: 'absolute',
                    width: `${afterPercent}%`,
                    height: '100%',
                    background: '#4ade8066',
                    borderRadius: 4,
                  }} />
                  {/* Current HP bar */}
                  <div style={{
                    position: 'relative',
                    width: `${hpPercent}%`,
                    height: '100%',
                    background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444',
                    borderRadius: 4,
                  }} />
                </div>

                <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 4 }}>
                  {pokemon.currentHp} → {afterHp} / {pokemon.maxHp} HP
                </div>

                {isDead ? (
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#ef4444',
                    fontWeight: 'bold',
                  }}>
                    FAINTED
                  </div>
                ) : actualHeal > 0 ? (
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#4ade80',
                    fontWeight: 'bold',
                  }}>
                    +{actualHeal} HP
                  </div>
                ) : (
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: THEME.text.tertiary,
                  }}>
                    Already full
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Heal button */}
        <button
          onClick={onHeal}
          style={{
            padding: '14px 48px',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 10,
            border: 'none',
            background: '#4ade80',
            color: '#000',
            cursor: 'pointer',
            marginTop: 8,
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Heal Party
        </button>
      </div>
    </ScreenShell>
  );
}
