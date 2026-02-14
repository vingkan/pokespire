import { useState, useCallback } from 'react';
import type { RunState } from '../../run/types';
import type { Position } from '../../engine/types';
import { getEventsForAct } from '../../data/events';
import type { EventDefinition } from '../../data/events';
import { EventScreen } from './EventScreen';
import { createRunState, applyLevelUp, applyDamage } from '../../run/state';
import { EXP_PER_LEVEL } from '../../run/state';
import { getPokemon } from '../../data/loaders';
import { ScreenShell } from '../components/ScreenShell';
import { THEME } from '../theme';

interface Props {
  onBack: () => void;
}

function createMockRunState(): RunState {
  const starters = ['charmander', 'squirtle', 'bulbasaur', 'pikachu'];
  const positions: Position[] = [
    { row: 'front', column: 0 },
    { row: 'front', column: 2 },
    { row: 'back', column: 0 },
    { row: 'back', column: 2 },
  ];

  const party = starters.map(id => getPokemon(id));
  let run = createRunState(party, positions, 42, 500);

  // Level up to 3 for a realistic mid-run state
  run = { ...run, party: run.party.map(p => ({ ...p, exp: EXP_PER_LEVEL * 2 })) };
  for (let lvl = 0; lvl < 2; lvl++) {
    for (let i = 0; i < run.party.length; i++) {
      run = applyLevelUp(run, i);
    }
  }

  // Rough up the party a bit (varied HP)
  run = applyDamage(run, 0, 15);
  run = applyDamage(run, 1, 8);
  run = applyDamage(run, 3, 20);

  return run;
}

export function EventTesterScreen({ onBack }: Props) {
  const [mockRun, setMockRun] = useState<RunState>(createMockRunState);
  const [selectedEvent, setSelectedEvent] = useState<EventDefinition | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleEventComplete = useCallback((newRun: RunState) => {
    setMockRun(newRun);
    setSelectedEvent(null);

    // Show a diff summary
    const goldDiff = newRun.gold - mockRun.gold;
    const hpSummary = newRun.party.map((p, i) => {
      const old = mockRun.party[i];
      if (!old) return '';
      const hpDiff = p.currentHp - old.currentHp;
      const maxDiff = p.maxHp - old.maxHp;
      const expDiff = p.exp - old.exp;
      const deckDiff = p.deck.length - old.deck.length;
      const parts: string[] = [];
      if (hpDiff !== 0) parts.push(`HP ${hpDiff > 0 ? '+' : ''}${hpDiff}`);
      if (maxDiff !== 0) parts.push(`MaxHP ${maxDiff > 0 ? '+' : ''}${maxDiff}`);
      if (expDiff !== 0) parts.push(`EXP ${expDiff > 0 ? '+' : ''}${expDiff}`);
      if (deckDiff !== 0) parts.push(`Cards ${deckDiff > 0 ? '+' : ''}${deckDiff}`);
      if (p.energyModifier !== old.energyModifier) parts.push(`Energy +${p.energyModifier - old.energyModifier}`);
      if (p.drawModifier !== old.drawModifier) parts.push(`Draw +${p.drawModifier - old.drawModifier}`);
      return parts.length > 0 ? `${getPokemon(p.formId).name}: ${parts.join(', ')}` : '';
    }).filter(Boolean);

    const lines = [];
    if (goldDiff !== 0) lines.push(`Gold: ${goldDiff > 0 ? '+' : ''}${goldDiff}`);
    lines.push(...hpSummary);
    setLastResult(lines.length > 0 ? lines.join('\n') : 'No changes');
  }, [mockRun]);

  const handleReset = useCallback(() => {
    setMockRun(createMockRunState());
    setLastResult(null);
  }, []);

  // If an event is selected, render the real EventScreen
  if (selectedEvent) {
    // Use a fresh seed each time so random outcomes actually vary
    const testRun = { ...mockRun, currentNodeId: `test-event-${Date.now()}`, seed: Date.now() };
    return (
      <EventScreen
        run={testRun}
        eventId={selectedEvent.id}
        onComplete={handleEventComplete}
        onRestart={() => setSelectedEvent(null)}
      />
    );
  }

  const actColors = { 1: '#60a5fa', 2: '#f59e0b', 3: '#a855f7' };

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
        color: THEME.accent,
        letterSpacing: THEME.heading.letterSpacing,
        textTransform: THEME.heading.textTransform,
      }}>
        Event Tester
      </h1>
      <button onClick={onBack} style={{ ...THEME.button.secondary, padding: '6px 14px', fontSize: 12 }}>
        Back
      </button>
    </div>
  );

  return (
    <ScreenShell header={header} ambient>
      <div style={{ padding: '16px', maxWidth: 800, margin: '0 auto' }}>
        {/* State Summary */}
        <div style={{
          background: THEME.bg.panel,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          border: `1px solid ${THEME.border.subtle}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text.secondary }}>
              Mock Party State
            </div>
            <button onClick={handleReset} style={{ ...THEME.button.secondary, padding: '4px 12px', fontSize: 11 }}>
              Reset State
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {mockRun.party.map((p, i) => {
              const data = getPokemon(p.formId);
              return (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: THEME.bg.elevated,
                  borderRadius: 8,
                  fontSize: 12,
                }}>
                  <div style={{ fontWeight: 'bold' }}>{data.name} Lv.{p.level}</div>
                  <div style={{ color: THEME.text.tertiary }}>
                    {p.currentHp}/{p.maxHp} HP | {p.deck.length} cards
                  </div>
                  {(p.energyModifier > 0 || p.drawModifier > 0) && (
                    <div style={{ color: '#22c55e', fontSize: 11 }}>
                      {p.energyModifier > 0 ? `+${p.energyModifier} energy ` : ''}
                      {p.drawModifier > 0 ? `+${p.drawModifier} draw` : ''}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{
              padding: '8px 12px',
              background: THEME.bg.elevated,
              borderRadius: 8,
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 'bold', color: THEME.accent }}>Gold: {mockRun.gold}</div>
              <div style={{ color: THEME.text.tertiary }}>Bench: {mockRun.bench.length}</div>
            </div>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div style={{
            background: '#22c55e11',
            border: '1px solid #22c55e44',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: '#22c55e',
            whiteSpace: 'pre-line',
          }}>
            Last result: {lastResult}
          </div>
        )}

        {/* Event List by Act */}
        {([1, 2, 3] as const).map(act => {
          const events = getEventsForAct(act);
          const actColor = actColors[act];
          return (
            <div key={act} style={{ marginBottom: 24 }}>
              <h2 style={{
                fontSize: 18,
                color: actColor,
                marginBottom: 12,
                letterSpacing: THEME.heading.letterSpacing,
                textTransform: THEME.heading.textTransform,
              }}>
                Act {act} ({events.length} events)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `1px solid ${actColor}44`,
                      background: THEME.bg.panel,
                      color: THEME.text.primary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = actColor;
                      e.currentTarget.style.boxShadow = `0 0 8px ${actColor}33`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${actColor}44`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: actColor }}>{event.title}</span>
                        <span style={{ fontSize: 12, color: THEME.text.tertiary, marginLeft: 8 }}>
                          {event.id}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: THEME.text.secondary }}>
                        {event.choices.length} choice{event.choices.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}
