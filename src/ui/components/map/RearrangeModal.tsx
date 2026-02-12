import { useState } from 'react';
import type { RunPokemon } from '../../../run/types';
import type { Row, Column, Position } from '../../../engine/types';
import { getPokemon } from '../../../data/loaders';
import { getSpriteSize } from '../../../data/heights';
import { THEME } from '../../theme';

interface Props {
  party: RunPokemon[];
  bench: RunPokemon[];
  onConfirm: (newParty: RunPokemon[], newBench: RunPokemon[]) => void;
  onClose: () => void;
}

type SlotKey = `${Row}-${Column}`;

function slotKey(row: Row, col: Column): SlotKey {
  return `${row}-${col}`;
}

function parseSlotKey(key: SlotKey): Position {
  const [row, colStr] = key.split('-') as [Row, string];
  return { row, column: parseInt(colStr) as Column };
}

/**
 * Rearrange Formation modal.
 * Shows the 2x3 grid with party Pokemon and a bench section.
 * Click-to-select, then click-to-swap between any two occupied slots,
 * or click an empty slot to move the selected Pokemon there.
 * Bench Pokemon can be promoted into the grid, party Pokemon can be
 * moved to the bench.
 */
export function RearrangeModal({ party, bench, onConfirm, onClose }: Props) {
  // Working state: grid maps slot → pokemon data, bench is a separate list
  // We track by a unique key combining source + index
  type PokemonEntry = {
    pokemon: RunPokemon;
    originalSource: 'party' | 'bench';
    originalIndex: number;
  };

  // Initialize grid from party positions
  const initGrid = () => {
    const grid = new Map<SlotKey, PokemonEntry>();
    party.forEach((p, i) => {
      grid.set(slotKey(p.position.row, p.position.column), {
        pokemon: p,
        originalSource: 'party',
        originalIndex: i,
      });
    });
    return grid;
  };

  const initBench = () =>
    bench.map((p, i) => ({
      pokemon: p,
      originalSource: 'bench' as const,
      originalIndex: i,
    }));

  const [grid, setGrid] = useState<Map<SlotKey, PokemonEntry>>(initGrid);
  const [benchEntries, setBenchEntries] = useState<PokemonEntry[]>(initBench);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [selectedBenchIdx, setSelectedBenchIdx] = useState<number | null>(null);

  const gridCount = grid.size;
  const totalCount = gridCount + benchEntries.length;

  // Click a grid slot
  const handleGridClick = (key: SlotKey) => {
    const entry = grid.get(key);

    // If a bench Pokemon is selected, place it in this slot
    if (selectedBenchIdx !== null) {
      if (gridCount >= 4 && !entry) {
        // Can't add more than 4 to grid
        setSelectedBenchIdx(null);
        return;
      }
      const benchEntry = benchEntries[selectedBenchIdx];
      const newGrid = new Map(grid);
      const newBench = [...benchEntries];

      if (entry) {
        // Swap: grid Pokemon goes to bench, bench Pokemon takes slot
        newBench.splice(selectedBenchIdx, 1, entry);
        newGrid.set(key, benchEntry);
      } else {
        // Place bench Pokemon in empty slot
        newBench.splice(selectedBenchIdx, 1);
        newGrid.set(key, benchEntry);
      }

      setGrid(newGrid);
      setBenchEntries(newBench);
      setSelectedBenchIdx(null);
      setSelectedSlot(null);
      return;
    }

    // If a grid slot is already selected
    if (selectedSlot !== null) {
      if (selectedSlot === key) {
        // Deselect
        setSelectedSlot(null);
        return;
      }

      const selectedEntry = grid.get(selectedSlot);
      if (!selectedEntry) {
        setSelectedSlot(null);
        return;
      }

      const newGrid = new Map(grid);
      if (entry) {
        // Swap two grid Pokemon
        newGrid.set(key, selectedEntry);
        newGrid.set(selectedSlot, entry);
      } else {
        // Move to empty slot
        newGrid.delete(selectedSlot);
        newGrid.set(key, selectedEntry);
      }
      setGrid(newGrid);
      setSelectedSlot(null);
      return;
    }

    // Nothing selected yet — select this slot if it has a Pokemon
    if (entry) {
      setSelectedSlot(key);
    }
  };

  // Click a bench Pokemon
  const handleBenchClick = (benchIdx: number) => {
    // If a grid Pokemon is selected, swap it to bench
    if (selectedSlot !== null) {
      const selectedEntry = grid.get(selectedSlot);
      if (!selectedEntry) {
        setSelectedSlot(null);
        return;
      }

      // Don't allow demoting if it would leave grid with 0
      if (gridCount <= 1) {
        setSelectedSlot(null);
        return;
      }

      const benchEntry = benchEntries[benchIdx];
      const newGrid = new Map(grid);
      const newBench = [...benchEntries];

      // Swap: selected grid Pokemon goes to bench, bench Pokemon takes the grid slot
      newGrid.set(selectedSlot, benchEntry);
      newBench[benchIdx] = selectedEntry;

      setGrid(newGrid);
      setBenchEntries(newBench);
      setSelectedSlot(null);
      setSelectedBenchIdx(null);
      return;
    }

    // Toggle bench selection
    if (selectedBenchIdx === benchIdx) {
      setSelectedBenchIdx(null);
    } else {
      setSelectedBenchIdx(benchIdx);
      setSelectedSlot(null);
    }
  };

  // Move selected grid Pokemon to bench
  const handleMoveToBench = () => {
    if (selectedSlot === null) return;
    const entry = grid.get(selectedSlot);
    if (!entry) return;
    if (gridCount <= 1) return; // Must keep at least 1 in grid
    if (benchEntries.length >= 4) return; // Bench full

    const newGrid = new Map(grid);
    newGrid.delete(selectedSlot);
    setBenchEntries([...benchEntries, entry]);
    setGrid(newGrid);
    setSelectedSlot(null);
  };

  // Confirm: build final party (with updated positions) and bench arrays
  const handleConfirm = () => {
    const newParty: RunPokemon[] = [];
    grid.forEach((entry, key) => {
      const pos = parseSlotKey(key);
      newParty.push({ ...entry.pokemon, position: pos });
    });

    const newBench: RunPokemon[] = benchEntries.map(e => e.pokemon);

    onConfirm(newParty, newBench);
  };

  const rows: Row[] = ['back', 'front'];
  const cols: Column[] = [0, 1, 2];
  const rowLabels = ['Back', 'Front'];

  const canMoveToBench = selectedSlot !== null && gridCount > 1 && benchEntries.length < 4;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
    }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        background: THEME.bg.panel,
        border: `2px solid ${THEME.border.medium}`,
        borderRadius: 16,
        padding: '24px 32px',
        minWidth: 320,
        maxWidth: 420,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Title */}
        <h2 style={{
          margin: '0 0 16px',
          textAlign: 'center',
          color: THEME.accent,
          fontSize: 18,
          letterSpacing: THEME.heading.letterSpacing,
          textTransform: THEME.heading.textTransform,
        }}>
          Rearrange Formation
        </h2>

        <p style={{
          fontSize: 12,
          color: THEME.text.tertiary,
          textAlign: 'center',
          margin: '0 0 16px',
        }}>
          Click a Pokemon, then click a slot to move it
        </p>

        {/* Formation Grid */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          {rows.map((row, ri) => (
            <div key={row} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}>
              <div style={{
                fontSize: 10,
                color: THEME.text.tertiary,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}>
                {rowLabels[ri]}
              </div>
              {cols.map(col => {
                const key = slotKey(row, col);
                const entry = grid.get(key);
                const isSelected = selectedSlot === key;
                const isTarget = (selectedSlot !== null || selectedBenchIdx !== null) && !isSelected;

                return (
                  <div
                    key={key}
                    onClick={() => handleGridClick(key)}
                    style={{
                      width: 88,
                      height: 100,
                      border: isSelected
                        ? `2px solid ${THEME.accent}`
                        : isTarget
                          ? `2px solid ${THEME.border.bright}`
                          : entry
                            ? `2px solid ${THEME.border.medium}`
                            : `2px dashed ${THEME.border.subtle}`,
                      borderRadius: 10,
                      background: isSelected
                        ? 'rgba(250, 204, 21, 0.1)'
                        : entry
                          ? THEME.bg.panelDark
                          : THEME.bg.base,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: entry || selectedSlot !== null || selectedBenchIdx !== null ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 0 12px rgba(250, 204, 21, 0.25)` : 'none',
                    }}
                  >
                    {entry ? (
                      <>
                        <img
                          src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${entry.pokemon.formId}.gif`}
                          alt={getPokemon(entry.pokemon.formId).name}
                          style={{
                            width: Math.min(getSpriteSize(entry.pokemon.formId) * 0.55, 48),
                            height: Math.min(getSpriteSize(entry.pokemon.formId) * 0.55, 48),
                            imageRendering: 'pixelated',
                            objectFit: 'contain',
                            filter: entry.pokemon.knockedOut ? 'grayscale(100%)' : 'none',
                            opacity: entry.pokemon.knockedOut ? 0.4 : 1,
                          }}
                        />
                        <div style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: isSelected ? THEME.accent : THEME.text.primary,
                          marginTop: 2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 80,
                          textAlign: 'center',
                        }}>
                          {getPokemon(entry.pokemon.formId).name}
                        </div>
                      </>
                    ) : (
                      <div style={{
                        fontSize: 22,
                        color: isTarget ? THEME.text.secondary : THEME.border.medium,
                      }}>
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Move to bench button */}
        {canMoveToBench && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button
              onClick={handleMoveToBench}
              style={{
                ...THEME.button.secondary,
                padding: '5px 14px',
                fontSize: 11,
              }}
            >
              Move to Bench
            </button>
          </div>
        )}

        {/* Bench section */}
        {(benchEntries.length > 0 || totalCount < 8) && (
          <>
            <div style={{
              height: 1,
              background: THEME.border.subtle,
              margin: '0 0 10px',
            }} />
            <div style={{
              fontSize: 10,
              color: THEME.text.tertiary,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 8,
              fontWeight: 'bold',
            }}>
              Bench ({benchEntries.length}/4)
            </div>

            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              minHeight: 40,
            }}>
              {benchEntries.length === 0 ? (
                <div style={{
                  fontSize: 12,
                  color: THEME.text.tertiary,
                  padding: '8px 0',
                }}>
                  No benched Pokemon
                </div>
              ) : (
                benchEntries.map((entry, i) => {
                  const isSelected = selectedBenchIdx === i;
                  const isTarget = selectedSlot !== null;
                  return (
                    <div
                      key={`bench-${i}`}
                      onClick={() => handleBenchClick(i)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: isSelected
                          ? `2px solid #f97316`
                          : isTarget
                            ? `2px solid ${THEME.border.bright}`
                            : `2px solid ${THEME.border.subtle}`,
                        background: isSelected
                          ? 'rgba(249, 115, 22, 0.1)'
                          : THEME.bg.panelDark,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        opacity: 0.85,
                      }}
                    >
                      <img
                        src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${entry.pokemon.formId}.gif`}
                        alt={getPokemon(entry.pokemon.formId).name}
                        style={{
                          width: Math.min(getSpriteSize(entry.pokemon.formId) * 0.5, 36),
                          height: Math.min(getSpriteSize(entry.pokemon.formId) * 0.5, 36),
                          imageRendering: 'pixelated',
                          objectFit: 'contain',
                        }}
                      />
                      <div style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: isSelected ? '#f97316' : THEME.text.primary,
                        marginTop: 2,
                      }}>
                        {getPokemon(entry.pokemon.formId).name}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 20,
        }}>
          <button
            onClick={onClose}
            style={{
              ...THEME.button.secondary,
              padding: '10px 24px',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              ...THEME.button.primary,
              padding: '10px 24px',
              fontSize: 13,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
