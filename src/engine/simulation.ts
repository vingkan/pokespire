/**
 * Headless Run Simulation
 *
 * Simulates complete game runs with AI-controlled decisions for testing.
 * Used to find bugs, test balance, and verify game logic.
 */

import type { CombatState, Combatant, MoveDefinition, Position, PlayCardAction } from './types';
import type { RunState, MapNode, BattleNode } from '../run/types';
import {
  createRunState,
  getAvailableNextNodes,
  moveToNode,
  syncBattleResults,
  applyPercentHeal,
  removeCardsFromDeck,
  applyLevelUp,
  canPokemonLevelUp,
  getRunPokemonData,
  applyFullHealAll,
  transitionToAct2,
  isRunComplete,
  isAct1Complete,
} from '../run/state';
import { createCombatState, getCurrentCombatant } from './combat';
import { startTurn, processAction, endTurn } from './turns';
import { getEffectiveCost, getPlayableCards } from './cards';
import { getPokemon, getMove } from '../data/loaders';
import { sampleDraftCards } from '../run/draft';
import { createRng } from '../run/rng';
import { getTypeEffectiveness } from './typeChart';

// ============================================================
// Configuration
// ============================================================

export interface SimulationConfig {
  starters: string[];           // Pokemon IDs (e.g., ['bulbasaur', 'squirtle', 'charmander', 'pikachu'])
  positions: Position[];        // Party positions
  numRuns: number;              // Number of runs to simulate
  seed?: number;                // Base seed for reproducibility
  verbose?: boolean;            // Log detailed output
  maxTurnsPerBattle?: number;   // Safety limit to prevent infinite loops
}

export interface SimulationResult {
  runNumber: number;
  outcome: 'victory' | 'defeat' | 'error';
  defeatedAtNode?: string;
  defeatedAtAct?: number;
  totalBattles: number;
  finalAct: number;
  errors: string[];
  partyLevels: number[];
  partyAliveCount: number;  // How many party members were alive at end
  battleLog?: string[];     // Log from the final battle (if defeat)
  partySizeHistory: { nodeId: string; aliveAfter: number }[];  // Track party size after each battle
}

export interface SimulationSummary {
  totalRuns: number;
  victories: number;
  defeats: number;
  errors: number;
  averageBattlesBeforeDefeat: number;
  defeatsByAct: { act1: number; act2: number };
  results: SimulationResult[];
}

// ============================================================
// Default Configuration
// ============================================================

const DEFAULT_POSITIONS: Position[] = [
  { row: 'front', column: 0 },  // Bulbasaur - front
  { row: 'front', column: 1 },  // Squirtle - front
  { row: 'back', column: 0 },   // Charmander - back
  { row: 'back', column: 1 },   // Pikachu - back
];

const DEFAULT_STARTERS = ['bulbasaur', 'squirtle', 'charmander', 'pikachu'];

// ============================================================
// Battle AI
// ============================================================

interface CardOption {
  handIndex: number;
  card: MoveDefinition;
  cost: number;
  isHealing: boolean;
  isBlock: boolean;
  damage: number;
}

/**
 * Select the best card to play for a combatant.
 * Returns null if should end turn.
 */
function selectCard(
  _state: CombatState,
  combatant: Combatant
): { handIndex: number; card: MoveDefinition } | null {
  // getPlayableCards returns card IDs, not indices
  // We need to find the indices of playable cards
  const playableCardIds = new Set(getPlayableCards(combatant));
  if (playableCardIds.size === 0) return null;

  // Build options with metadata for each playable card
  const options: CardOption[] = [];
  for (let handIndex = 0; handIndex < combatant.hand.length; handIndex++) {
    const cardId = combatant.hand[handIndex];
    if (!playableCardIds.has(cardId)) continue;

    const card = getMove(cardId);
    const cost = getEffectiveCost(combatant, handIndex);

    const isHealing = card.effects.some(e =>
      e.type === 'heal' || e.type === 'heal_percent' || e.type === 'heal_on_hit'
    );
    const isBlock = card.effects.some(e => e.type === 'block');

    // Estimate damage
    let damage = 0;
    for (const effect of card.effects) {
      if (effect.type === 'damage') damage += effect.value;
      if (effect.type === 'multi_hit') damage += effect.value * effect.hits;
      if (effect.type === 'heal_on_hit') damage += effect.value;
      if (effect.type === 'recoil') damage += effect.value;
      if (effect.type === 'self_ko') damage += effect.value;
    }

    options.push({
      handIndex,
      card,
      cost,
      isHealing,
      isBlock,
      damage,
    });
  }

  if (options.length === 0) return null;

  const hpPercent = combatant.hp / combatant.maxHp;
  const isBackRow = combatant.position.row === 'back';

  // Priority 1: Heal if low HP (< 30%)
  if (hpPercent < 0.3) {
    const healCards = options.filter(o => o.isHealing);
    if (healCards.length > 0) {
      const best = healCards.reduce((a, b) => a.cost > b.cost ? a : b);
      return { handIndex: best.handIndex, card: best.card };
    }
  }

  // Priority 2: Block if low HP (< 50%) AND in front row
  if (hpPercent < 0.5 && !isBackRow) {
    const blockCards = options.filter(o => o.isBlock);
    if (blockCards.length > 0) {
      const best = blockCards.reduce((a, b) => a.cost > b.cost ? a : b);
      return { handIndex: best.handIndex, card: best.card };
    }
  }

  // Priority 3: Play highest damage card
  const damageCards = options.filter(o => o.damage > 0);
  if (damageCards.length > 0) {
    const best = damageCards.reduce((a, b) => a.damage > b.damage ? a : b);
    return { handIndex: best.handIndex, card: best.card };
  }

  // Priority 4: Play any card (status effects, etc.)
  if (options.length > 0) {
    return { handIndex: options[0].handIndex, card: options[0].card };
  }

  return null;
}

/**
 * Select target for an attack card.
 * Focus-fire: All allies target the same enemy (lowest HP).
 */
function selectTarget(
  state: CombatState,
  attacker: Combatant,
  card: MoveDefinition
): string | undefined {
  // Self-targeting cards
  if (card.range === 'self') return attacker.id;

  // Get valid enemies
  const enemies = state.combatants.filter(c =>
    c.side !== attacker.side && c.alive
  );

  if (enemies.length === 0) return undefined;

  // Filter by range
  let validTargets = enemies;
  if (card.range === 'front_enemy') {
    validTargets = enemies.filter(e => e.position.row === 'front');
    // If no front row enemies, fall back to back row
    if (validTargets.length === 0) {
      validTargets = enemies.filter(e => e.position.row === 'back');
    }
  } else if (card.range === 'back_enemy') {
    validTargets = enemies.filter(e => e.position.row === 'back');
    if (validTargets.length === 0) {
      validTargets = enemies.filter(e => e.position.row === 'front');
    }
  }

  if (validTargets.length === 0) validTargets = enemies;

  // Check for type advantage
  const withAdvantage = validTargets.filter(e =>
    getTypeEffectiveness(card.type, e.types) > 1
  );

  // Prefer type advantage targets, then lowest HP
  const targetPool = withAdvantage.length > 0 ? withAdvantage : validTargets;

  // Focus-fire: target lowest HP
  const target = targetPool.reduce((a, b) => a.hp < b.hp ? a : b);
  return target.id;
}

/**
 * Run a single battle to completion.
 * Returns victory/defeat and updated combatants.
 */
function runBattle(
  state: CombatState,
  maxTurns: number = 500,
  verbose: boolean = false
): { victory: boolean; combatants: Combatant[]; error?: string; log: string[] } {
  let turnCount = 0;

  while (state.phase === 'ongoing' && turnCount < maxTurns) {
    turnCount++;

    // Safety check: ensure turn order is valid
    if (state.turnOrder.length === 0) {
      // No combatants left in turn order - shouldn't happen if phase is 'ongoing'
      return {
        victory: false,
        combatants: state.combatants,
        error: 'Turn order empty while battle ongoing',
        log: state.log.map(l => l.message),
      };
    }

    if (state.currentTurnIndex >= state.turnOrder.length) {
      // Index out of bounds - clamp it
      state.currentTurnIndex = state.turnOrder.length - 1;
    }

    // Start turn
    const { logs: startLogs, skipped } = startTurn(state);
    state.log.push(...startLogs);

    if (state.phase !== 'ongoing') break;
    if (skipped) continue;

    const combatant = getCurrentCombatant(state);

    // AI plays cards until out of options or energy
    let actionsThisTurn = 0;
    const maxActionsPerTurn = 20; // Safety limit

    while (actionsThisTurn < maxActionsPerTurn) {
      actionsThisTurn++;

      if (state.phase !== 'ongoing') break;
      if (!combatant.alive) break;

      const cardChoice = selectCard(state, combatant);
      if (!cardChoice) break;

      const targetId = selectTarget(state, combatant, cardChoice.card);

      const action: PlayCardAction = {
        type: 'play_card',
        cardInstanceId: combatant.hand[cardChoice.handIndex],
        targetId,
      };

      const actionLogs = processAction(state, action);
      state.log.push(...actionLogs);
    }

    if (state.phase !== 'ongoing') break;

    // End turn
    const endLogs = endTurn(state);
    state.log.push(...endLogs);
  }

  if (turnCount >= maxTurns) {
    return {
      victory: false,
      combatants: state.combatants,
      error: `Battle exceeded ${maxTurns} turns - possible infinite loop`,
      log: state.log.map(l => l.message),
    };
  }

  const playersAlive = state.combatants.some(c => c.side === 'player' && c.alive);

  if (verbose) {
    console.log('\n=== BATTLE LOG ===');
    for (const entry of state.log) {
      console.log(`  R${entry.round}: ${entry.message}`);
    }
    console.log('=== END BATTLE LOG ===\n');
  }

  return {
    victory: playersAlive && state.phase === 'victory',
    combatants: state.combatants,
    log: state.log.map(l => l.message),
  };
}

// ============================================================
// Node Selection AI
// ============================================================

/**
 * Select which node to move to next.
 * Prefers rest if party is hurt, otherwise battles.
 */
function selectNextNode(run: RunState): MapNode | null {
  const available = getAvailableNextNodes(run);
  if (available.length === 0) return null;

  // Calculate party health
  const aliveParty = run.party.filter(p => !p.knockedOut);
  const avgHpPercent = aliveParty.reduce((sum, p) => sum + p.currentHp / p.maxHp, 0) / aliveParty.length;
  const anyLowHp = aliveParty.some(p => p.currentHp / p.maxHp < 0.4);

  // If party is hurt, prefer rest nodes
  if (anyLowHp || avgHpPercent < 0.6) {
    const restNodes = available.filter(n => n.type === 'rest');
    if (restNodes.length > 0) {
      return restNodes[0];
    }
  }

  // Prefer battle nodes for XP
  const battleNodes = available.filter(n => n.type === 'battle');
  if (battleNodes.length > 0) {
    return battleNodes[0];
  }

  // Take whatever's available
  return available[0];
}

// ============================================================
// Card Draft AI
// ============================================================

/**
 * Decide whether to draft a card.
 * Only takes Epic+ cards that match Pokemon's type.
 */
function shouldDraftCard(
  card: MoveDefinition,
  pokemonTypes: string[]
): boolean {
  // Only consider Epic or Legendary
  if (card.rarity !== 'epic' && card.rarity !== 'legendary') {
    return false;
  }

  // Card must match one of Pokemon's types
  return pokemonTypes.includes(card.type);
}

// ============================================================
// Rest Node AI
// ============================================================

/**
 * Handle rest node decision.
 * Heal if any Pokemon < 60% HP, otherwise remove off-type basics.
 */
function handleRestNode(run: RunState): RunState {
  const aliveParty = run.party.map((p, i) => ({ ...p, index: i })).filter(p => !p.knockedOut);

  // Find lowest HP% Pokemon
  const lowestHp = aliveParty.reduce((a, b) =>
    (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
  );

  const lowestHpPercent = lowestHp.currentHp / lowestHp.maxHp;

  // If any Pokemon below 60%, heal them
  if (lowestHpPercent < 0.6) {
    return applyPercentHeal(run, lowestHp.index, 0.3);
  }

  // Otherwise, try to remove an off-type basic card
  for (const pokemon of aliveParty) {
    const pokemonData = getPokemon(pokemon.formId);
    const pokemonTypes = pokemonData.types;

    // Find off-type basic cards
    const offTypeBasicIndices: number[] = [];
    for (let i = 0; i < pokemon.deck.length; i++) {
      const card = getMove(pokemon.deck[i]);
      if (card.rarity === 'basic' && !pokemonTypes.includes(card.type)) {
        offTypeBasicIndices.push(i);
      }
    }

    if (offTypeBasicIndices.length > 0) {
      // Remove first off-type basic
      return removeCardsFromDeck(run, pokemon.index, [offTypeBasicIndices[0]]);
    }
  }

  // If no off-type basics, just heal lowest HP Pokemon
  return applyPercentHeal(run, lowestHp.index, 0.3);
}

// ============================================================
// Level Up AI
// ============================================================

/**
 * Auto-level any Pokemon that can level up.
 */
function processLevelUps(run: RunState): RunState {
  let newRun = run;
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < newRun.party.length; i++) {
      if (canPokemonLevelUp(newRun.party[i])) {
        newRun = applyLevelUp(newRun, i);
        changed = true;
        break; // Restart loop to check for more level-ups
      }
    }
  }

  return newRun;
}

// ============================================================
// Main Simulation Runner
// ============================================================

/**
 * Run a single simulated game.
 */
function simulateSingleRun(
  config: SimulationConfig,
  runNumber: number
): SimulationResult {
  const result: SimulationResult = {
    runNumber,
    outcome: 'defeat',
    totalBattles: 0,
    finalAct: 1,
    errors: [],
    partyLevels: [],
    partyAliveCount: 0,
    partySizeHistory: [],
  };

  try {
    // Initialize party
    const partyData = config.starters.map(id => getPokemon(id));
    const seed = (config.seed ?? Date.now()) + runNumber * 10000;
    let run = createRunState(partyData, config.positions, seed);

    const maxTurns = config.maxTurnsPerBattle ?? 500;

    // Main game loop
    while (true) {
      // Process any pending level-ups
      run = processLevelUps(run);

      // Select next node
      const nextNode = selectNextNode(run);
      if (!nextNode) {
        result.errors.push('No available nodes');
        result.outcome = 'error';
        break;
      }

      // Move to node
      run = moveToNode(run, nextNode.id);

      // Handle node based on type
      if (nextNode.type === 'battle') {
        result.totalBattles++;
        const battleNode = nextNode as BattleNode;

        // Set up battle
        const playerData = run.party
          .filter(p => !p.knockedOut)
          .map(p => getRunPokemonData(p));

        const playerPositions = run.party
          .filter(p => !p.knockedOut)
          .map(p => p.position);

        const playerSlotIndices = run.party
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => !p.knockedOut)
          .map(({ i }) => i);

        const enemyData = battleNode.enemies.map(id => {
          const pokemon = getPokemon(id);
          // Apply HP multiplier if present (boss fights)
          if (battleNode.enemyHpMultiplier) {
            return {
              ...pokemon,
              maxHp: Math.floor(pokemon.maxHp * battleNode.enemyHpMultiplier),
            };
          }
          return pokemon;
        });

        const combatState = createCombatState(
          playerData,
          enemyData,
          playerPositions,
          battleNode.enemyPositions,
          playerSlotIndices
        );

        // Apply passives from run state to combatants
        const playerCombatants = combatState.combatants.filter(c => c.side === 'player');
        for (let i = 0; i < playerCombatants.length; i++) {
          const slotIndex = playerCombatants[i].slotIndex;
          const runPokemon = run.party[slotIndex];
          if (runPokemon) {
            playerCombatants[i].passiveIds = [...runPokemon.passiveIds];
            playerCombatants[i].hp = runPokemon.currentHp;
          }
        }

        // Run battle
        const battleResult = runBattle(combatState, maxTurns);

        if (battleResult.error) {
          result.errors.push(battleResult.error);
        }

        // Sync results back to run
        run = syncBattleResults(run, battleResult.combatants);

        // Track party size after this battle
        const aliveAfter = run.party.filter(p => !p.knockedOut).length;
        result.partySizeHistory.push({ nodeId: nextNode.id, aliveAfter });

        // Check for defeat
        const allKnockedOut = run.party.every(p => p.knockedOut);
        if (!battleResult.victory || allKnockedOut) {
          result.outcome = 'defeat';
          result.defeatedAtNode = nextNode.id;
          result.defeatedAtAct = run.currentAct;
          result.finalAct = run.currentAct;
          result.battleLog = battleResult.log;
          break;
        }

        // Handle card draft (skip for boss fights)
        const isBoss = nextNode.id.includes('boss');
        if (!isBoss) {
          // Draft cards for each alive Pokemon
          const nodeHash = run.currentNodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

          for (let i = 0; i < run.party.length; i++) {
            const pokemon = run.party[i];
            if (pokemon.knockedOut) continue;

            const draftSeed = run.seed + nodeHash * 1000 + i * 100;
            const rng = createRng(draftSeed);

            const pokemonData = getPokemon(pokemon.formId);
            const draftOptions = sampleDraftCards(rng, pokemonData.types, pokemon.level, 3);

            // Check each option
            for (const cardId of draftOptions) {
              const card = getMove(cardId);
              if (shouldDraftCard(card, pokemonData.types)) {
                run = { ...run };
                const newDeck = [...run.party[i].deck, cardId];
                run.party = run.party.map((p, idx) =>
                  idx === i ? { ...p, deck: newDeck } : p
                );
                break; // Only take one card per Pokemon
              }
            }
          }
        }

        // Check for act completion
        if (run.currentAct === 1 && isAct1Complete(run)) {
          run = applyFullHealAll(run);
          run = transitionToAct2(run);
          result.finalAct = 2;
        } else if (run.currentAct === 2 && isRunComplete(run)) {
          result.outcome = 'victory';
          result.finalAct = 2;
          break;
        }

      } else if (nextNode.type === 'rest') {
        run = handleRestNode(run);

      } else if (nextNode.type === 'card_removal') {
        // Similar to rest logic - remove off-type basics
        for (let i = 0; i < run.party.length; i++) {
          const pokemon = run.party[i];
          if (pokemon.knockedOut) continue;

          const pokemonData = getPokemon(pokemon.formId);
          const pokemonTypes = pokemonData.types;

          const offTypeBasicIndices: number[] = [];
          for (let j = 0; j < pokemon.deck.length; j++) {
            const card = getMove(pokemon.deck[j]);
            if (card.rarity === 'basic' && !pokemonTypes.includes(card.type)) {
              offTypeBasicIndices.push(j);
            }
          }

          if (offTypeBasicIndices.length > 0) {
            run = removeCardsFromDeck(run, i, [offTypeBasicIndices[0]]);
          }
        }

      } else if (nextNode.type === 'act_transition') {
        // Handled after boss battle
        run = transitionToAct2(run);
        result.finalAct = 2;

      } else if (nextNode.type === 'spawn') {
        // Just move on
        continue;
      }
    }

    // Record final party state
    result.partyLevels = run.party.map(p => p.level);
    result.partyAliveCount = run.party.filter(p => !p.knockedOut).length;

  } catch (error) {
    result.outcome = 'error';
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/**
 * Run multiple simulated games and aggregate results.
 */
export function runSimulation(config?: Partial<SimulationConfig>): SimulationSummary {
  const fullConfig: SimulationConfig = {
    starters: config?.starters ?? DEFAULT_STARTERS,
    positions: config?.positions ?? DEFAULT_POSITIONS,
    numRuns: config?.numRuns ?? 10,
    seed: config?.seed,
    verbose: config?.verbose ?? false,
    maxTurnsPerBattle: config?.maxTurnsPerBattle ?? 500,
  };

  const results: SimulationResult[] = [];

  console.log(`\n========================================`);
  console.log(`Starting simulation: ${fullConfig.numRuns} runs`);
  console.log(`Party: ${fullConfig.starters.join(', ')}`);
  console.log(`========================================\n`);

  for (let i = 0; i < fullConfig.numRuns; i++) {
    const result = simulateSingleRun(fullConfig, i);
    results.push(result);

    if (fullConfig.verbose || result.outcome === 'error') {
      console.log(`Run ${i + 1}: ${result.outcome.toUpperCase()}`);
      if (result.defeatedAtNode) {
        console.log(`  Defeated at: ${result.defeatedAtNode} (Act ${result.defeatedAtAct})`);
      }
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }
      console.log(`  Battles: ${result.totalBattles}, Final levels: [${result.partyLevels.join(', ')}]`);
    } else {
      // Compact output
      const symbol = result.outcome === 'victory' ? 'V' : result.outcome === 'defeat' ? 'D' : 'E';
      process.stdout.write(symbol);
    }
  }

  console.log('\n');

  // Aggregate stats
  const victories = results.filter(r => r.outcome === 'victory').length;
  const defeats = results.filter(r => r.outcome === 'defeat').length;
  const errors = results.filter(r => r.outcome === 'error').length;

  const defeatResults = results.filter(r => r.outcome === 'defeat');
  const avgBattles = defeatResults.length > 0
    ? defeatResults.reduce((sum, r) => sum + r.totalBattles, 0) / defeatResults.length
    : 0;

  const act1Defeats = defeatResults.filter(r => r.defeatedAtAct === 1).length;
  const act2Defeats = defeatResults.filter(r => r.defeatedAtAct === 2).length;

  const summary: SimulationSummary = {
    totalRuns: fullConfig.numRuns,
    victories,
    defeats,
    errors,
    averageBattlesBeforeDefeat: avgBattles,
    defeatsByAct: { act1: act1Defeats, act2: act2Defeats },
    results,
  };

  // Print summary
  console.log(`========================================`);
  console.log(`SIMULATION RESULTS`);
  console.log(`========================================`);
  console.log(`Total runs: ${summary.totalRuns}`);
  console.log(`Victories: ${summary.victories} (${(summary.victories / summary.totalRuns * 100).toFixed(1)}%)`);
  console.log(`Defeats: ${summary.defeats} (${(summary.defeats / summary.totalRuns * 100).toFixed(1)}%)`);
  if (summary.errors > 0) {
    console.log(`Errors: ${summary.errors}`);
  }
  console.log(`\nDefeat breakdown:`);
  console.log(`  Act 1: ${summary.defeatsByAct.act1}`);
  console.log(`  Act 2: ${summary.defeatsByAct.act2}`);
  console.log(`  Avg battles before defeat: ${summary.averageBattlesBeforeDefeat.toFixed(1)}`);
  console.log(`========================================\n`);

  // List any errors
  const allErrors = results.flatMap(r => r.errors);
  if (allErrors.length > 0) {
    console.log(`ERRORS FOUND:`);
    const uniqueErrors = [...new Set(allErrors)];
    uniqueErrors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }

  return summary;
}

// Export for direct CLI usage
export { simulateSingleRun };
