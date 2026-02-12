import { useState, useEffect } from 'react';
import type { RunState } from '../../run/types';
import { SHOP_ITEMS, KECLEON_DIALOGUE } from '../../data/shop';
import { getMove, getPokemon } from '../../data/loaders';
import { CardPreview } from '../components/CardPreview';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';
import { getSpriteSize } from '../../data/heights';

interface Props {
  run: RunState;
  onPurchase: (moveId: string, pokemonIndex: number) => void;
  onClose: () => void;
}

const KECLEON_COLOR = '#4ade80';

/** Inline SVG shop mat — woven cloth with fringe tassels. */
function ShopMat({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', padding: '32px 24px 40px' }}>
      {/* SVG mat background */}
      <svg
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <defs>
          {/* Crosshatch weave pattern */}
          <pattern id="mat-weave" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#5c3d2e" />
            <line x1="0" y1="0" x2="12" y2="12" stroke="#6b4a38" strokeWidth="0.8" opacity="0.5" />
            <line x1="12" y1="0" x2="0" y2="12" stroke="#6b4a38" strokeWidth="0.8" opacity="0.5" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#4e3425" strokeWidth="0.4" opacity="0.3" />
            <line x1="0" y1="6" x2="12" y2="6" stroke="#4e3425" strokeWidth="0.4" opacity="0.3" />
          </pattern>

          {/* Soft shadow beneath mat */}
          <filter id="mat-shadow" x="-5%" y="-5%" width="110%" height="115%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feOffset in="blur" dx="0" dy="4" result="shifted" />
            <feComponentTransfer in="shifted">
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main mat body */}
        <rect
          x="20" y="20" width="560" height="360" rx="16" ry="16"
          fill="url(#mat-weave)"
          filter="url(#mat-shadow)"
        />

        {/* Border trim */}
        <rect
          x="20" y="20" width="560" height="360" rx="16" ry="16"
          fill="none"
          stroke="#8b6914"
          strokeWidth="3"
        />
        {/* Inner border */}
        <rect
          x="30" y="30" width="540" height="340" rx="10" ry="10"
          fill="none"
          stroke="#8b691444"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />

        {/* Fringe tassels — left edge */}
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={`tassel-l-${i}`}
            x1="20"
            y1={45 + i * 28}
            x2="8"
            y2={52 + i * 28}
            stroke="#8b6914"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}

        {/* Fringe tassels — right edge */}
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={`tassel-r-${i}`}
            x1="580"
            y1={45 + i * 28}
            x2="592"
            y2={52 + i * 28}
            stroke="#8b6914"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}
      </svg>

      {/* Items rendered on top of the mat */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function ShopScreen({ run, onPurchase, onClose }: Props) {
  // null = browsing catalog, string = choosing which Pokemon gets this item
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState(KECLEON_DIALOGUE.welcome);
  const [thankYouTimer, setThankYouTimer] = useState(false);

  // After purchase, briefly show "thank you" then reset to welcome
  useEffect(() => {
    if (!thankYouTimer) return;
    const timer = setTimeout(() => {
      setDialogue(KECLEON_DIALOGUE.welcome);
      setThankYouTimer(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [thankYouTimer]);

  const handleSelectItem = (moveId: string) => {
    const item = SHOP_ITEMS.find(i => i.moveId === moveId);
    if (!item) return;
    if (run.gold < item.goldCost) {
      setDialogue(KECLEON_DIALOGUE.cantAfford);
      return;
    }
    setSelectedMoveId(moveId);
    setDialogue(KECLEON_DIALOGUE.choosePokemon);
  };

  const handleBuy = (pokemonIndex: number) => {
    if (!selectedMoveId) return;
    onPurchase(selectedMoveId, pokemonIndex);
    setSelectedMoveId(null);
    setDialogue(KECLEON_DIALOGUE.purchased);
    setThankYouTimer(true);
  };

  const handleBack = () => {
    setSelectedMoveId(null);
    setDialogue(KECLEON_DIALOGUE.welcome);
  };

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
        color: KECLEON_COLOR,
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        Kecleon Shop
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: 6,
          background: 'rgba(250, 204, 21, 0.1)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          color: '#facc15',
          fontSize: 16,
          fontWeight: 'bold',
        }}>
          {run.gold}g
        </div>
        <button
          onClick={onClose}
          style={{
            ...THEME.button.secondary,
            padding: '6px 14px',
            fontSize: 13,
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
    }}>
      <ScreenShell header={header}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          padding: '24px 16px 48px',
        }}>
          {/* Kecleon sprite */}
          <img
            src="https://img.pokemondb.net/sprites/black-white/anim/normal/kecleon.gif"
            alt="Kecleon"
            style={{
              width: 96,
              height: 96,
              imageRendering: 'pixelated',
              objectFit: 'contain',
            }}
          />

          {/* Dialogue bubble */}
          <div style={{
            padding: '12px 24px',
            background: `${KECLEON_COLOR}22`,
            borderRadius: 12,
            border: `2px solid ${KECLEON_COLOR}44`,
            color: KECLEON_COLOR,
            fontStyle: 'italic',
            fontSize: 15,
            maxWidth: 400,
            textAlign: 'center',
          }}>
            {dialogue}
          </div>

          {/* Step 2: Pokemon picker */}
          {selectedMoveId && (
            <>
              <p style={{
                color: THEME.text.secondary,
                margin: 0,
                textAlign: 'center',
                fontSize: 14,
              }}>
                Add <span style={{ color: THEME.text.primary, fontWeight: 'bold' }}>
                  {getMove(selectedMoveId).name}
                </span> to whose deck?
              </p>

              <div style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {run.party.map((pokemon, i) => {
                  const data = getPokemon(pokemon.formId);
                  const isDead = pokemon.currentHp <= 0 || pokemon.knockedOut;
                  return (
                    <div
                      key={i}
                      onClick={() => !isDead && handleBuy(i)}
                      style={{
                        width: 170,
                        padding: 16,
                        borderRadius: 16,
                        border: isDead
                          ? `3px solid ${THEME.border.subtle}`
                          : `3px solid ${KECLEON_COLOR}`,
                        background: THEME.bg.panel,
                        cursor: isDead ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        opacity: isDead ? 0.4 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDead) {
                          e.currentTarget.style.boxShadow = `0 0 16px ${KECLEON_COLOR}44`;
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${pokemon.formId}.gif`}
                        alt={data.name}
                        style={{
                          width: Math.min(getSpriteSize(pokemon.formId) * 0.7, 56),
                          height: Math.min(getSpriteSize(pokemon.formId) * 0.7, 56),
                          imageRendering: 'pixelated',
                          objectFit: 'contain',
                          filter: isDead ? 'grayscale(100%)' : 'none',
                        }}
                      />
                      <div style={{ fontSize: 17, fontWeight: 'bold', marginTop: 4 }}>
                        {data.name}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
                        {pokemon.deck.length} cards
                      </div>

                      {isDead && (
                        <div style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          background: '#ef444422',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#ef4444',
                          fontWeight: 'bold',
                        }}>
                          FAINTED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleBack}
                style={{
                  ...THEME.button.secondary,
                  padding: '8px 20px',
                  fontSize: 13,
                }}
              >
                Back to catalog
              </button>
            </>
          )}

          {/* Step 1: Item catalog on mat */}
          {!selectedMoveId && (
            <ShopMat>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                justifyContent: 'center',
                maxWidth: 820,
                margin: '0 auto',
              }}>
                {SHOP_ITEMS.map(item => {
                  const move = getMove(item.moveId);
                  const canAfford = run.gold >= item.goldCost;
                  return (
                    <div
                      key={item.moveId}
                      style={{
                        position: 'relative',
                        opacity: canAfford ? 1 : 0.5,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <CardPreview
                        card={move}
                        onClick={() => handleSelectItem(item.moveId)}
                      />
                      {/* Gold price badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '2px 10px',
                        borderRadius: 10,
                        background: THEME.bg.panelDark,
                        border: '1px solid rgba(250, 204, 21, 0.4)',
                        color: '#facc15',
                        fontSize: 12,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.goldCost}g
                      </div>
                    </div>
                  );
                })}
              </div>
            </ShopMat>
          )}
        </div>
      </ScreenShell>
    </div>
  );
}
