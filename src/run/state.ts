import type { PokemonData, Position, Column, Row, Combatant } from '../engine/types';
import type { RunState, RunPokemon, MapNode, BattleNode, ActTransitionNode, CardRemovalNode, EventType } from './types';
import { getPokemon } from '../data/loaders';
import { ACT1_NODES, ACT2_NODES, getNodeById } from './nodes';
import {
  getProgressionTree,
  getRungForLevel,
  canLevelUp,
  type ProgressionRung,
} from './progression';

// ============================================================
// EXP Constants
// ============================================================

/** EXP required per level up */
export const EXP_PER_LEVEL = 4;

// ============================================================
// Run State Management
// ============================================================

/**
 * Create initial run state from party selection.
 * Starts at the spawn node with 1 EXP (from entering the run).
 */
export function createRunState(
  party: PokemonData[],
  positions: Position[],
  seed?: number
): RunState {
  const runParty: RunPokemon[] = party.map((pokemon, i) => {
    // Get the initial passive from the progression tree (level 1 rung)
    const tree = getProgressionTree(pokemon.id);
    const initialRung = tree ? getRungForLevel(tree, 1) : null;
    const initialPassives = initialRung?.passiveId && initialRung.passiveId !== 'none'
      ? [initialRung.passiveId]
      : [];

    return {
      baseFormId: pokemon.id,
      formId: pokemon.id,
      currentHp: pokemon.maxHp,
      maxHp: pokemon.maxHp,
      maxHpModifier: 0,
      deck: [...pokemon.deck],
      position: positions[i],
      level: 1,
      exp: 0, // No starting EXP - first EXP comes from first battle
      passiveIds: initialPassives,
      knockedOut: false,
    };
  });

  // Deep copy nodes to avoid mutating the original
  let nodes: MapNode[] = ACT1_NODES.map(node => ({ ...node }));

  // Mark spawn as completed
  const spawnNode = nodes.find(n => n.type === 'spawn');
  if (spawnNode) {
    spawnNode.completed = true;
  }

  const actualSeed = seed ?? Date.now();
  const recruitSeed = actualSeed + 12345;

  // Assign random Pokemon to recruit nodes
  const partyBaseFormIds = party.map(p => p.id);
  nodes = assignRecruitPokemon(nodes, recruitSeed, partyBaseFormIds);

  // Randomize event types for detour events (e.g., detour-tc-event)
  nodes = assignRandomEventTypes(nodes, actualSeed);

  return {
    seed: actualSeed,
    party: runParty,
    bench: [],
    currentNodeId: 's0-spawn', // Start at spawn
    visitedNodeIds: ['s0-spawn'],
    nodes,
    currentAct: 1,
    recruitSeed,
  };
}

/**
 * Get current node from run state.
 */
export function getCurrentNode(run: RunState): MapNode | null {
  return getNodeById(run.nodes, run.currentNodeId) ?? null;
}

/**
 * Get nodes that can be moved to from the current position.
 * Returns nodes connected to the current node that haven't been visited.
 */
export function getAvailableNextNodes(run: RunState): MapNode[] {
  const currentNode = getCurrentNode(run);
  if (!currentNode) return [];

  return currentNode.connectsTo
    .map(id => getNodeById(run.nodes, id))
    .filter((n): n is MapNode => n !== undefined);
}

/**
 * Move to a specific node (player choice in branching).
 * Marks the node as completed and grants EXP.
 */
export function moveToNode(run: RunState, nodeId: string): RunState {
  const targetNode = getNodeById(run.nodes, nodeId);
  if (!targetNode) return run;

  // Verify this is a valid move (connected to current node)
  const currentNode = getCurrentNode(run);
  if (!currentNode || !currentNode.connectsTo.includes(nodeId)) {
    return run;
  }

  // Update nodes to mark target as completed
  const newNodes = run.nodes.map(node => {
    if (node.id !== nodeId) return node;
    return { ...node, completed: true };
  });

  // Grant EXP for visiting the node (party AND bench)
  const newParty = run.party.map(pokemon => ({
    ...pokemon,
    exp: pokemon.exp + 1,
  }));

  const newBench = run.bench.map(pokemon => {
    const withExp = { ...pokemon, exp: pokemon.exp + 1 };
    return autoLevelBenchPokemon(withExp);
  });

  return {
    ...run,
    currentNodeId: nodeId,
    visitedNodeIds: [...run.visitedNodeIds, nodeId],
    nodes: newNodes,
    party: newParty,
    bench: newBench,
  };
}

/**
 * Check if the run is complete (Mewtwo defeated in Act 2).
 */
export function isRunComplete(run: RunState): boolean {
  if (run.currentAct !== 2) return false;
  const mewtwoNode = run.nodes.find(n => n.id === 'a2-s6-boss-mewtwo');
  return mewtwoNode?.completed ?? false;
}

/**
 * Check if Act 1 is complete (Giovanni defeated).
 */
export function isAct1Complete(run: RunState): boolean {
  if (run.currentAct !== 1) return false;
  const giovanniNode = run.nodes.find(n => n.id === 's6-boss-giovanni');
  return giovanniNode?.completed ?? false;
}

/**
 * Check if we're at an act transition node.
 */
export function isAtActTransition(run: RunState): boolean {
  const currentNode = getCurrentNode(run);
  return currentNode?.type === 'act_transition';
}

/**
 * Transition to Act 2 - preserves party, resets nodes to Act 2 map.
 * Note: Party is healed before showing the transition screen.
 */
export function transitionToAct2(run: RunState): RunState {
  // Deep copy Act 2 nodes
  let act2Nodes: MapNode[] = ACT2_NODES.map(node => ({ ...node }));

  // Mark spawn as completed
  const spawnNode = act2Nodes.find(n => n.type === 'spawn');
  if (spawnNode) {
    spawnNode.completed = true;
  }

  // Assign recruit Pokemon for Act 2 (if any recruit nodes exist)
  const excludeIds = [
    ...run.party.map(p => p.baseFormId),
    ...run.bench.map(p => p.baseFormId),
  ];
  act2Nodes = assignRecruitPokemon(act2Nodes, run.recruitSeed + 99999, excludeIds);

  // Randomize event types for detour events (e.g., detour-a2-tc-event)
  act2Nodes = assignRandomEventTypes(act2Nodes, run.seed);

  return {
    ...run,
    currentAct: 2,
    currentNodeId: 'a2-s0-spawn',
    visitedNodeIds: ['a2-s0-spawn'],
    nodes: act2Nodes,
  };
}

/**
 * Get the current act transition node (if at one).
 */
export function getCurrentActTransitionNode(run: RunState): ActTransitionNode | null {
  const node = getCurrentNode(run);
  if (node?.type === 'act_transition') return node;
  return null;
}

/**
 * Get the current card removal node (if at one).
 */
export function getCurrentCardRemovalNode(run: RunState): CardRemovalNode | null {
  const node = getCurrentNode(run);
  if (node?.type === 'card_removal') return node;
  return null;
}

/**
 * Remove cards from a Pokemon's deck.
 */
export function removeCardsFromDeck(
  run: RunState,
  pokemonIndex: number,
  cardIndices: number[]
): RunState {
  const newParty = run.party.map((pokemon, i) => {
    if (i !== pokemonIndex) return pokemon;
    // Remove cards by index (remove from highest to lowest to preserve indices)
    const sortedIndices = [...cardIndices].sort((a, b) => b - a);
    const newDeck = [...pokemon.deck];
    for (const idx of sortedIndices) {
      if (idx >= 0 && idx < newDeck.length) {
        newDeck.splice(idx, 1);
      }
    }
    return {
      ...pokemon,
      deck: newDeck,
    };
  });

  return { ...run, party: newParty };
}

/**
 * Get the current stage (column) in the map.
 */
export function getCurrentStage(run: RunState): number {
  const currentNode = getCurrentNode(run);
  return currentNode?.stage ?? 0;
}

// ============================================================
// Pokemon State Modifications
// ============================================================

/**
 * Apply percentage heal to ALL alive active party Pokemon.
 * Used by Chansey rest nodes. Bench excluded. KO'd excluded.
 */
export function applyPartyPercentHeal(
  run: RunState,
  percent: number
): RunState {
  const newParty = run.party.map(pokemon => {
    if (pokemon.knockedOut || pokemon.currentHp <= 0) return pokemon;
    const healAmount = Math.floor(pokemon.maxHp * percent);
    const newCurrentHp = Math.min(pokemon.currentHp + healAmount, pokemon.maxHp);
    return { ...pokemon, currentHp: newCurrentHp };
  });
  return { ...run, party: newParty };
}

/**
 * Apply percentage heal to a specific Pokemon.
 * Used by rest events for the "heal 30%" option.
 */
export function applyPercentHeal(
  run: RunState,
  pokemonIndex: number,
  percent: number
): RunState {
  const newParty = run.party.map((pokemon, i) => {
    if (i !== pokemonIndex) return pokemon;
    const healAmount = Math.floor(pokemon.maxHp * percent);
    const newCurrentHp = Math.min(pokemon.currentHp + healAmount, pokemon.maxHp);
    return {
      ...pokemon,
      currentHp: newCurrentHp,
    };
  });

  return { ...run, party: newParty };
}

/**
 * Apply full heal to all alive party Pokemon.
 * Used after defeating act bosses.
 * Knocked out Pokemon are NOT healed (they stay dead until resurrection).
 */
export function applyFullHealAll(run: RunState): RunState {
  const newParty = run.party.map(pokemon => {
    // Don't heal knocked out Pokemon
    if (pokemon.knockedOut) return pokemon;
    return {
      ...pokemon,
      currentHp: pokemon.maxHp,
    };
  });

  return { ...run, party: newParty };
}

/**
 * Apply max HP boost to a specific Pokemon.
 * Used by rest events for the "+10 max HP" option.
 * Also heals by the same amount.
 */
export function applyMaxHpBoost(
  run: RunState,
  pokemonIndex: number,
  boost: number
): RunState {
  const newParty = run.party.map((pokemon, i) => {
    if (i !== pokemonIndex) return pokemon;
    const newMaxHpModifier = pokemon.maxHpModifier + boost;
    const newMaxHp = pokemon.maxHp + boost;
    const newCurrentHp = Math.min(pokemon.currentHp + boost, newMaxHp);
    return {
      ...pokemon,
      maxHp: newMaxHp,
      maxHpModifier: newMaxHpModifier,
      currentHp: newCurrentHp,
    };
  });

  return { ...run, party: newParty };
}

/**
 * Grant EXP to a specific Pokemon.
 * Used by rest events for the "meditate" option.
 */
export function applyExpBoost(
  run: RunState,
  pokemonIndex: number,
  amount: number
): RunState {
  const newParty = run.party.map((pokemon, i) => {
    if (i !== pokemonIndex) return pokemon;
    return {
      ...pokemon,
      exp: pokemon.exp + amount,
    };
  });

  return { ...run, party: newParty };
}

/**
 * Add a card to a Pokemon's deck.
 */
export function addCardToDeck(
  run: RunState,
  pokemonIndex: number,
  cardId: string
): RunState {
  const newParty = run.party.map((pokemon, i) => {
    if (i !== pokemonIndex) return pokemon;
    return {
      ...pokemon,
      deck: [...pokemon.deck, cardId],
    };
  });

  return { ...run, party: newParty };
}

/**
 * Sync battle results back to run state.
 * Copies HP from combat combatants back to RunPokemon.
 */
export function syncBattleResults(
  run: RunState,
  combatants: Combatant[]
): RunState {
  const playerCombatants = combatants.filter(c => c.side === 'player');

  const newParty = run.party.map((pokemon, i) => {
    const combatant = playerCombatants.find(c => c.slotIndex === i);
    if (!combatant) return pokemon;

    const newHp = Math.max(0, combatant.hp);
    const isKnockedOut = newHp <= 0 || !combatant.alive;

    return {
      ...pokemon,
      currentHp: newHp,
      knockedOut: pokemon.knockedOut || isKnockedOut, // Once KO'd, stays KO'd
    };
  });

  return { ...run, party: newParty };
}

// ============================================================
// Battle Helpers
// ============================================================

/**
 * Convert RunPokemon back to PokemonData for battle initialization.
 * Uses the current formId for base stats, plus run modifications.
 */
export function getRunPokemonData(runPokemon: RunPokemon): PokemonData {
  const formPokemon = getPokemon(runPokemon.formId);
  return {
    ...formPokemon,
    id: runPokemon.formId,
    maxHp: runPokemon.maxHp,
    deck: [...runPokemon.deck],
  };
}

/**
 * Get positions array from run party.
 */
export function getRunPositions(run: RunState): Position[] {
  return run.party.map(p => p.position);
}

/**
 * Get the current node as a BattleNode (type guard).
 */
export function getCurrentBattleNode(run: RunState): BattleNode | null {
  const node = getCurrentNode(run);
  if (node?.type === 'battle') return node;
  return null;
}

// ============================================================
// Experience & Leveling Functions
// ============================================================

/**
 * Check if a Pokemon can level up.
 * Requires EXP_PER_LEVEL EXP and not at max level.
 */
export function canPokemonLevelUp(pokemon: RunPokemon): boolean {
  return canLevelUp(pokemon.level, pokemon.exp);
}

/**
 * Get the next rung a Pokemon will unlock if they level up.
 */
export function getNextRung(pokemon: RunPokemon): ProgressionRung | null {
  const tree = getProgressionTree(pokemon.baseFormId);
  if (!tree) return null;
  return getRungForLevel(tree, pokemon.level + 1);
}

/**
 * Apply a level-up to a Pokemon.
 * - Consumes EXP_PER_LEVEL (2) EXP
 * - Increments level
 * - Applies rung effects (evolution, HP boost, cards, passive)
 */
export function applyLevelUp(run: RunState, pokemonIndex: number): RunState {
  const pokemon = run.party[pokemonIndex];
  if (!pokemon) return run;

  // Check eligibility
  if (!canPokemonLevelUp(pokemon)) return run;

  const tree = getProgressionTree(pokemon.baseFormId);
  if (!tree) return run;

  const nextRung = getRungForLevel(tree, pokemon.level + 1);
  if (!nextRung) return run;

  // Calculate new form and stats
  const newFormId = nextRung.evolvesTo ?? pokemon.formId;
  const newFormData = getPokemon(newFormId);

  // Calculate HP:
  // newMaxHp = newForm.baseMaxHp + existing modifiers + rung's HP boost
  const newMaxHpModifier = pokemon.maxHpModifier + nextRung.hpBoost;
  const newMaxHp = newFormData.maxHp + newMaxHpModifier;

  // Preserve damage taken: damageTaken = oldMaxHp - currentHp
  const damageTaken = pokemon.maxHp - pokemon.currentHp;
  const newCurrentHp = Math.max(0, newMaxHp - damageTaken);

  // Add new cards to deck
  const newDeck = [...pokemon.deck, ...nextRung.cardsToAdd];

  // Add new passive to the list (if it's not 'none' and not already present)
  const newPassiveIds = [...pokemon.passiveIds];
  if (nextRung.passiveId !== 'none' && !newPassiveIds.includes(nextRung.passiveId)) {
    newPassiveIds.push(nextRung.passiveId);
  }

  // Build updated Pokemon
  const updatedPokemon: RunPokemon = {
    ...pokemon,
    formId: newFormId,
    level: pokemon.level + 1,
    exp: pokemon.exp - EXP_PER_LEVEL,
    maxHp: newMaxHp,
    maxHpModifier: newMaxHpModifier,
    currentHp: newCurrentHp,
    deck: newDeck,
    passiveIds: newPassiveIds,
  };

  // Update party
  const newParty = run.party.map((p, i) =>
    i === pokemonIndex ? updatedPokemon : p
  );

  return { ...run, party: newParty };
}

/**
 * Auto-level a bench Pokemon by applying progression rungs while they have enough EXP.
 * Bench level-ups are automatic (no player interaction needed).
 */
function autoLevelBenchPokemon(pokemon: RunPokemon): RunPokemon {
  let current = pokemon;
  while (canPokemonLevelUp(current)) {
    const tree = getProgressionTree(current.baseFormId);
    if (!tree) break;
    const nextRung = getRungForLevel(tree, current.level + 1);
    if (!nextRung) break;

    const newFormId = nextRung.evolvesTo ?? current.formId;
    const newFormData = getPokemon(newFormId);
    const newMaxHpModifier = current.maxHpModifier + nextRung.hpBoost;
    const newMaxHp = newFormData.maxHp + newMaxHpModifier;

    // Preserve damage taken (bench Pokemon keep their HP state)
    const damageTaken = current.maxHp - current.currentHp;
    const newCurrentHp = Math.max(0, newMaxHp - damageTaken);

    const newDeck = [...current.deck, ...nextRung.cardsToAdd];
    const newPassiveIds = [...current.passiveIds];
    if (nextRung.passiveId !== 'none' && !newPassiveIds.includes(nextRung.passiveId)) {
      newPassiveIds.push(nextRung.passiveId);
    }

    current = {
      ...current,
      formId: newFormId,
      level: current.level + 1,
      exp: current.exp - EXP_PER_LEVEL,
      maxHp: newMaxHp,
      maxHpModifier: newMaxHpModifier,
      currentHp: newCurrentHp,
      deck: newDeck,
      passiveIds: newPassiveIds as import('./progression').PassiveId[],
    };
  }
  return current;
}

/**
 * Check if any party member has a level-up available.
 */
export function anyPokemonCanLevelUp(run: RunState): boolean {
  return run.party.some(p => canPokemonLevelUp(p));
}

// ============================================================
// Bench Operations
// ============================================================

/**
 * Swap a party member with a bench member.
 * Bench Pokemon inherits the departing party member's position.
 */
export function swapPartyAndBench(
  run: RunState,
  partyIndex: number,
  benchIndex: number
): RunState {
  const partyMember = run.party[partyIndex];
  const benchMember = run.bench[benchIndex];
  if (!partyMember || !benchMember) return run;

  // Bench Pokemon takes the position of the departing party member
  const swappedBenchMember: RunPokemon = {
    ...benchMember,
    position: partyMember.position,
  };

  const newParty = run.party.map((p, i) => i === partyIndex ? swappedBenchMember : p);
  const newBench = run.bench.map((p, i) => i === benchIndex ? partyMember : p);

  return { ...run, party: newParty, bench: newBench };
}

/**
 * Promote a bench Pokemon to the active party (if party < 4).
 */
export function promoteFromBench(
  run: RunState,
  benchIndex: number,
  position: Position
): RunState {
  if (run.party.length >= 4) return run;
  const benchMember = run.bench[benchIndex];
  if (!benchMember) return run;

  const promoted: RunPokemon = { ...benchMember, position };
  const newParty = [...run.party, promoted];
  const newBench = run.bench.filter((_, i) => i !== benchIndex);

  return { ...run, party: newParty, bench: newBench };
}

/**
 * Demote an active party member to the bench (if party > 1).
 */
export function demoteToBench(
  run: RunState,
  partyIndex: number
): RunState {
  if (run.party.length <= 1) return run;
  if (run.bench.length >= 4) return run;
  const member = run.party[partyIndex];
  if (!member) return run;

  const newParty = run.party.filter((_, i) => i !== partyIndex);
  const newBench = [...run.bench, member];

  return { ...run, party: newParty, bench: newBench };
}

/**
 * Find the first empty grid position not occupied by any party member.
 * Prefers front row, then back row, in column order.
 */
export function findEmptyPosition(party: RunPokemon[]): Position | null {
  const occupied = new Set(party.map(p => `${p.position.row}-${p.position.column}`));
  const rows: Row[] = ['front', 'back'];
  const cols: Column[] = [0, 1, 2];
  for (const row of rows) {
    for (const col of cols) {
      if (!occupied.has(`${row}-${col}`)) {
        return { row, column: col };
      }
    }
  }
  return null;
}

/**
 * Rearrange party positions on the grid.
 * newPositions must be same length as party and contain valid unique positions.
 */
export function rearrangeParty(run: RunState, newPositions: Position[]): RunState {
  if (newPositions.length !== run.party.length) return run;
  const newParty = run.party.map((p, i) => ({ ...p, position: newPositions[i] }));
  return { ...run, party: newParty };
}

// ============================================================
// Recruit System
// ============================================================

/** All playable starter base form IDs for the recruit pool. */
const RECRUIT_POOL_ALL = [
  'charmander', 'squirtle', 'bulbasaur', 'pikachu', 'pidgey', 'rattata',
  'ekans', 'tauros', 'snorlax', 'kangaskhan', 'nidoran-m', 'nidoran-f',
  'rhyhorn', 'drowzee', 'growlithe', 'voltorb', 'caterpie', 'weedle',
  'magikarp',
  'lapras',
  'magmar',
  'electabuzz',
  'dratini',
  'spearow',
  'sandshrew',
];

/** Simple seeded RNG (Lehmer / Park-Miller). Returns value in [0, 1) and next seed. */
function seededRandom(seed: number): { value: number; nextSeed: number } {
  const next = (seed * 16807) % 2147483647;
  return { value: (next - 1) / 2147483646, nextSeed: next };
}

/**
 * Assign pokemonIds to recruit nodes using seeded RNG.
 * Excludes any baseFormIds already in the party.
 */
export function assignRecruitPokemon(
  nodes: MapNode[],
  recruitSeed: number,
  excludeIds: string[]
): MapNode[] {
  const pool = RECRUIT_POOL_ALL.filter(id => !excludeIds.includes(id));
  if (pool.length === 0) return nodes;

  let currentSeed = Math.max(1, Math.abs(recruitSeed)); // Ensure positive non-zero seed
  const usedIds = new Set<string>();

  return nodes.map(node => {
    if (node.type !== 'recruit' || node.pokemonId !== '') return node;

    // Pick a random Pokemon from pool that hasn't been used yet
    const available = pool.filter(id => !usedIds.has(id));
    if (available.length === 0) return node;

    const { value, nextSeed } = seededRandom(currentSeed);
    currentSeed = nextSeed;

    const picked = available[Math.floor(value * available.length)];
    usedIds.add(picked);

    return { ...node, pokemonId: picked };
  });
}

/**
 * Assign random event types to detour event nodes (IDs starting with 'detour-').
 * Picks randomly from train, meditate, forget using seeded RNG.
 */
function assignRandomEventTypes(nodes: MapNode[], seed: number): MapNode[] {
  const eventTypes: EventType[] = ['train', 'meditate', 'forget'];
  let currentSeed = Math.max(1, Math.abs(seed + 77777));

  return nodes.map(node => {
    if (node.type !== 'event' || !node.id.startsWith('detour-')) return node;

    const { value, nextSeed } = seededRandom(currentSeed);
    currentSeed = nextSeed;

    const picked = eventTypes[Math.floor(value * eventTypes.length)];
    return { ...node, eventType: picked };
  });
}

/**
 * Get the recruit level — matches the lowest active party level.
 */
export function getRecruitLevel(run: RunState): number {
  if (run.party.length === 0) return 1;
  return Math.min(...run.party.map(p => p.level));
}

/**
 * Get available Pokemon for recruit encounters.
 * Excludes any baseFormId already in party or bench.
 */
export function getAvailableRecruitPool(run: RunState): string[] {
  const usedBaseFormIds = new Set([
    ...run.party.map(p => p.baseFormId),
    ...run.bench.map(p => p.baseFormId),
  ]);
  return RECRUIT_POOL_ALL.filter(id => !usedBaseFormIds.has(id));
}

/**
 * Create a RunPokemon at the given level by applying progression tree.
 * Optionally starts with EXP to match the party's progress.
 */
export function createRecruitPokemon(pokemonId: string, level: number, exp: number = 0): RunPokemon {
  const basePokemon = getPokemon(pokemonId);
  const tree = getProgressionTree(pokemonId);

  let formId = pokemonId;
  let maxHpModifier = 0;
  let deck = [...basePokemon.deck];
  const passiveIds: string[] = [];

  // Apply all rungs up to the target level
  if (tree) {
    for (const rung of tree.rungs) {
      if (rung.level > level) break;

      if (rung.evolvesTo) {
        formId = rung.evolvesTo;
      }
      maxHpModifier += rung.hpBoost;
      deck.push(...rung.cardsToAdd);
      if (rung.passiveId !== 'none' && !passiveIds.includes(rung.passiveId)) {
        passiveIds.push(rung.passiveId);
      }
    }
  }

  const formData = getPokemon(formId);
  const maxHp = formData.maxHp + maxHpModifier;

  return {
    baseFormId: pokemonId,
    formId,
    currentHp: maxHp,
    maxHp,
    maxHpModifier,
    deck,
    position: { row: 'front', column: 1 },  // Default, assigned properly on promote
    level,
    exp,
    passiveIds: passiveIds as import('./progression').PassiveId[],
    knockedOut: false,
  };
}

/**
 * Add a recruited Pokemon to the bench.
 */
export function recruitToRoster(run: RunState, pokemon: RunPokemon): RunState {
  if (run.bench.length >= 4) return run; // Bench full
  return { ...run, bench: [...run.bench, pokemon] };
}

// ============================================================
// Save/Load Backwards Compatibility
// ============================================================

/**
 * Migrate old save data to current RunState format.
 * Adds default values for fields that didn't exist in older versions.
 */
export function migrateRunState(run: RunState): RunState {
  let migrated = run;

  // Add bench if missing (pre-bench saves)
  if (!migrated.bench) {
    migrated = { ...migrated, bench: [] };
  }

  // Add recruitSeed if missing
  if (!migrated.recruitSeed) {
    migrated = { ...migrated, recruitSeed: migrated.seed + 12345 };
  }

  // Add x,y to nodes if missing (pre-free-form saves)
  const needsCoords = migrated.nodes.some(n => n.x === undefined || n.y === undefined);
  if (needsCoords) {
    migrated = {
      ...migrated,
      nodes: migrated.nodes.map(n => ({
        ...n,
        x: n.x ?? 0,
        y: n.y ?? 0,
      })),
    };
  }

  return migrated;
}

// ============================================================
// Legacy compatibility (deprecated)
// ============================================================

/** @deprecated Use applyMaxHpBoost instead */
export function applyHpBoost(
  run: RunState,
  pokemonIndex: number,
  boost: number
): RunState {
  return applyMaxHpBoost(run, pokemonIndex, boost);
}

/** @deprecated No longer used with branching maps */
export function advanceNode(run: RunState): RunState {
  // For backwards compatibility, just return the run as-is
  return run;
}

/** @deprecated No longer used with branching maps */
export function grantExpToParty(run: RunState): RunState {
  // EXP is now granted in moveToNode
  return run;
}
