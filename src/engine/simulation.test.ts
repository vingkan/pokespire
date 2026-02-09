/**
 * Simulation Tests
 *
 * Run headless game simulations to find bugs and test balance.
 * Use: npm test -- --run src/engine/simulation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { runSimulation } from './simulation';
import type { SimulationSummary } from './simulation';
import type { Position } from './types';

interface TeamConfig {
  name: string;
  starters: string[];
  positions: Position[];
}

function runLargeExperiment(team: TeamConfig, numSeeds: number, runsPerSeed: number) {
  const seeds = Array.from({ length: numSeeds }, (_, i) => (i + 1) * 100);

  const allResults: SimulationSummary[] = [];
  let totalVictories = 0;
  let totalDefeats = 0;
  let totalErrors = 0;
  let act1Defeats = 0;
  let act2Defeats = 0;

  for (const seed of seeds) {
    const summary = runSimulation({
      starters: team.starters,
      positions: team.positions,
      numRuns: runsPerSeed,
      seed,
    });

    allResults.push(summary);
    totalVictories += summary.victories;
    totalDefeats += summary.defeats;
    totalErrors += summary.errors;
    act1Defeats += summary.defeatsByAct.act1;
    act2Defeats += summary.defeatsByAct.act2;
  }

  const totalRuns = numSeeds * runsPerSeed;
  const beatGiovanni = totalVictories + act2Defeats;
  const beatGiovanniPct = (beatGiovanni / totalRuns * 100).toFixed(1);
  const winPct = (totalVictories / totalRuns * 100).toFixed(1);

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  ${team.name.padEnd(56)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Runs:      ${totalRuns.toString().padStart(5)}                                   ║`);
  console.log(`║  Victories:       ${totalVictories.toString().padStart(5)} (${winPct.padStart(5)}%)                            ║`);
  console.log(`║  Defeats:         ${totalDefeats.toString().padStart(5)} (${(totalDefeats / totalRuns * 100).toFixed(1).padStart(5)}%)                            ║`);
  console.log(`║  Errors:          ${totalErrors.toString().padStart(5)}                                   ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Beat Giovanni:   ${beatGiovanni.toString().padStart(5)} (${beatGiovanniPct.padStart(5)}%)                            ║`);
  console.log(`║  Beat Mewtwo:     ${totalVictories.toString().padStart(5)} (${winPct.padStart(5)}%)                            ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Defeat Breakdown:                                         ║');
  console.log(`║    Act 1 (Giovanni):  ${act1Defeats.toString().padStart(5)} (${(act1Defeats / Math.max(totalDefeats, 1) * 100).toFixed(1).padStart(5)}% of defeats)         ║`);
  console.log(`║    Act 2 (Mewtwo):    ${act2Defeats.toString().padStart(5)} (${(act2Defeats / Math.max(totalDefeats, 1) * 100).toFixed(1).padStart(5)}% of defeats)         ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  return { totalErrors, totalVictories, totalDefeats, act1Defeats, act2Defeats, beatGiovanni, allResults };
}

describe('Debug - Battle Log Analysis', () => {
  it('shows battle log for a2-s1-battle-1 defeat', () => {
    const team: TeamConfig = {
      name: 'DEBUG',
      starters: ['nidoran-m', 'nidoran-f', 'pidgey', 'tauros'],
      positions: [
        { row: 'front', column: 0 },
        { row: 'front', column: 1 },
        { row: 'front', column: 2 },
        { row: 'back', column: 1 },
      ],
    };

    // Find a seed that loses at a2-s1-battle-1
    for (let seed = 100; seed <= 5000; seed += 100) {
      const summary = runSimulation({
        starters: team.starters,
        positions: team.positions,
        numRuns: 1,
        seed,
      });

      const result = summary.results[0];
      if (result.defeatedAtNode === 'a2-s1-battle-1' && result.battleLog) {
        console.log(`\n=== BATTLE LOG (seed ${seed}) - a2-s1-battle-1 ===`);
        console.log(`Party levels: [${result.partyLevels.join(', ')}]`);
        console.log(`Party alive count: ${result.partyAliveCount}`);
        console.log('');
        // Count unique combatants in the log
        const combatantNames = new Set<string>();
        for (const line of result.battleLog) {
          const match = line.match(/^--- (.+?)'s turn ---$/);
          if (match) combatantNames.add(match[1]);
        }
        console.log(`Combatants that took turns: ${[...combatantNames].join(', ')}`);
        console.log('');
        for (const line of result.battleLog) {
          console.log(`  ${line}`);
        }
        console.log('=== END ===\n');
        break; // Just show one example
      }
    }

    expect(true).toBe(true);
  });
});

describe('Run Simulation - Large Scale (2000 runs)', () => {
  it('tests Tauros/Nidoran-F/Snorlax/Nidoran-M team', () => {
    const team: TeamConfig = {
      name: 'TANK TEAM (Tauros, Nidoran-F, Snorlax front | Nidoran-M back)',
      starters: ['tauros', 'nidoran-f', 'snorlax', 'nidoran-m'],
      positions: [
        { row: 'front', column: 0 },  // Tauros
        { row: 'front', column: 1 },  // Nidoran-F
        { row: 'front', column: 2 },  // Snorlax
        { row: 'back', column: 1 },   // Nidoran-M
      ],
    };

    console.log('\n\n========== RUNNING 2000 SIMULATIONS ==========\n');

    const result = runLargeExperiment(team, 20, 100);

    // Collect all individual results for detailed analysis
    const allResults = result.allResults.flatMap(s => s.results);

    // Count defeats by node
    const defeatsByNode: Record<string, number> = {};
    const levelsByDefeatNode: Record<string, number[][]> = {};
    const partySizeByDefeatNode: Record<string, number[]> = {};

    for (const r of allResults) {
      if (r.outcome === 'defeat' && r.defeatedAtNode) {
        defeatsByNode[r.defeatedAtNode] = (defeatsByNode[r.defeatedAtNode] || 0) + 1;
        if (!levelsByDefeatNode[r.defeatedAtNode]) {
          levelsByDefeatNode[r.defeatedAtNode] = [];
          partySizeByDefeatNode[r.defeatedAtNode] = [];
        }
        if (r.partyLevels.length > 0) {
          levelsByDefeatNode[r.defeatedAtNode].push(r.partyLevels);
          partySizeByDefeatNode[r.defeatedAtNode].push(r.partyAliveCount);
        }
      }
    }

    // Sort by count
    const sortedNodes = Object.entries(defeatsByNode)
      .sort((a, b) => b[1] - a[1]);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        DEFEAT BREAKDOWN BY NODE                          ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    console.log('║  Node                           Count    Avg Lvls        Avg Party Size  ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    for (const [node, count] of sortedNodes) {
      const pct = (count / allResults.length * 100).toFixed(1);
      const levels = levelsByDefeatNode[node];
      const partySizes = partySizeByDefeatNode[node];

      let avgLevels = '---';
      if (levels && levels.length > 0) {
        const avgPerSlot = levels[0].map((_, i) => {
          const sum = levels.reduce((acc, l) => acc + (l[i] || 0), 0);
          return (sum / levels.length).toFixed(0);
        });
        avgLevels = `[${avgPerSlot.join(',')}]`;
      }

      let avgPartySize = '---';
      if (partySizes && partySizes.length > 0) {
        const avg = partySizes.reduce((a, b) => a + b, 0) / partySizes.length;
        avgPartySize = avg.toFixed(1) + '/4';
      }

      console.log(`║  ${node.padEnd(28)} ${count.toString().padStart(4)} (${pct.padStart(5)}%)   ${avgLevels.padEnd(12)}   ${avgPartySize.padStart(8)}       ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');

    // Party Attrition Analysis
    // Track where party members are being lost
    const attritionByNode: Record<string, { totalLosses: number; timesVisited: number; avgEntering: number }> = {};

    for (const r of allResults) {
      if (!r.partySizeHistory || r.partySizeHistory.length === 0) continue;

      let prevSize = 4; // Start with full party
      for (const entry of r.partySizeHistory) {
        const nodeId = entry.nodeId;
        if (!attritionByNode[nodeId]) {
          attritionByNode[nodeId] = { totalLosses: 0, timesVisited: 0, avgEntering: 0 };
        }
        const losses = prevSize - entry.aliveAfter;
        attritionByNode[nodeId].totalLosses += losses;
        attritionByNode[nodeId].timesVisited += 1;
        attritionByNode[nodeId].avgEntering += prevSize;
        prevSize = entry.aliveAfter;
      }
    }

    // Calculate averages and sort by total losses
    const attritionEntries = Object.entries(attritionByNode)
      .map(([node, data]) => ({
        node,
        totalLosses: data.totalLosses,
        timesVisited: data.timesVisited,
        avgLossPerVisit: data.totalLosses / data.timesVisited,
        avgEntering: data.avgEntering / data.timesVisited,
      }))
      .filter(e => e.totalLosses > 0)
      .sort((a, b) => b.totalLosses - a.totalLosses);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           PARTY ATTRITION BY NODE                                ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  Node                           Visits    Total KOs   Avg KO/Visit   Avg Entering║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
    for (const entry of attritionEntries.slice(0, 10)) {
      console.log(`║  ${entry.node.padEnd(28)} ${entry.timesVisited.toString().padStart(6)}    ${entry.totalLosses.toString().padStart(6)}        ${entry.avgLossPerVisit.toFixed(2).padStart(5)}         ${entry.avgEntering.toFixed(1).padStart(5)}   ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Assert no errors
    expect(result.totalErrors).toBe(0);
  });
});
