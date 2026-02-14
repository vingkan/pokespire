/**
 * Event Processing Engine — Applies event effects to RunState.
 *
 * Pure functions: no React, no side effects.
 * Interactive effects (drafts, card removal) are queued for UI to drain.
 */

import type { RunState } from './types';
import type { EventEffect, ChoiceOutcome } from '../data/events';
import { isInteractiveEffect, needsPokemonSelection } from '../data/events';
import {
  applyMaxHpBoost,
  applyExpBoost,
  applyEnergyModifier,
  applyDrawModifier,
  addDazedCards,
  applyDamage,
  applyFullHealAll,
  addGold,
} from './state';
import { createRng } from './rng';

// ============================================================
// Types
// ============================================================

export interface PendingInteractive {
  effect: EventEffect;
  /** If the effect needs a pokemon target and one was selected, store it */
  pokemonIndex?: number;
}

export interface ProcessResult {
  run: RunState;
  pendingInteractive: PendingInteractive[];
  outcomeDescription: string;
}

// ============================================================
// Outcome Resolution (seeded RNG for probabilistic events)
// ============================================================

/**
 * Resolve a choice outcome — handles both fixed and random branches.
 * Uses seeded RNG derived from run seed + nodeId for determinism.
 */
export function resolveOutcome(
  outcome: ChoiceOutcome,
  seed: number,
  nodeId: string
): { effects: EventEffect[]; description: string } {
  if (outcome.type === 'fixed') {
    return { effects: outcome.effects, description: outcome.description };
  }

  // Random branch: use seeded RNG
  const nodeHash = nodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = createRng(seed + nodeHash * 137);

  const roll = rng() * 100;
  let cumulative = 0;

  for (const branch of outcome.branches) {
    cumulative += branch.weight;
    if (roll < cumulative) {
      return { effects: branch.effects, description: branch.description };
    }
  }

  // Fallback to last branch
  const last = outcome.branches[outcome.branches.length - 1];
  return { effects: last.effects, description: last.description };
}

// ============================================================
// Effect Processing
// ============================================================

/**
 * Process a list of resolved effects against the run state.
 *
 * Simple effects are applied immediately. Interactive effects (card removal,
 * epic draft, shop draft, card clone, recruit) are queued for the UI.
 *
 * @param pokemonIndex - Index of selected Pokemon for 'one' target effects.
 *   Pass -1 or undefined if no pokemon selection was needed.
 * @param seed - Run seed for any random target selection
 */
export function processEffects(
  run: RunState,
  effects: EventEffect[],
  pokemonIndex: number | undefined,
  seed: number
): ProcessResult {
  let currentRun = run;
  const pendingInteractive: PendingInteractive[] = [];
  const descriptions: string[] = [];

  for (const effect of effects) {
    if (isInteractiveEffect(effect)) {
      pendingInteractive.push({ effect, pokemonIndex });
      continue;
    }

    currentRun = applySimpleEffect(currentRun, effect, pokemonIndex, seed);
  }

  return {
    run: currentRun,
    pendingInteractive,
    outcomeDescription: descriptions.join(' '),
  };
}

/**
 * Apply a single non-interactive effect to the run state.
 */
function applySimpleEffect(
  run: RunState,
  effect: EventEffect,
  pokemonIndex: number | undefined,
  seed: number
): RunState {
  switch (effect.type) {
    case 'nothing':
      return run;

    case 'gold':
      return addGold(run, effect.amount);

    case 'maxHpBoost':
      return applyToTargets(run, effect.target, pokemonIndex, seed, (r, i) =>
        applyMaxHpBoost(r, i, effect.amount)
      );

    case 'damage':
      return applyToTargets(run, effect.target, pokemonIndex, seed, (r, i) =>
        applyDamage(r, i, effect.amount)
      );

    case 'healPercent':
      return applyToTargets(run, effect.target, pokemonIndex, seed, (r, i) => {
        const pokemon = r.party[i];
        if (!pokemon || pokemon.knockedOut || pokemon.currentHp <= 0) return r;
        const healAmount = Math.floor(pokemon.maxHp * effect.percent);
        const newHp = Math.min(pokemon.currentHp + healAmount, pokemon.maxHp);
        const newParty = r.party.map((p, idx) =>
          idx === i ? { ...p, currentHp: newHp } : p
        );
        return { ...r, party: newParty };
      });

    case 'fullHeal':
      if (effect.target === 'all') {
        return applyFullHealAll(run);
      }
      return applyToTargets(run, effect.target, pokemonIndex, seed, (r, i) => {
        const pokemon = r.party[i];
        if (!pokemon || pokemon.knockedOut) return r;
        const newParty = r.party.map((p, idx) =>
          idx === i ? { ...p, currentHp: p.maxHp } : p
        );
        return { ...r, party: newParty };
      });

    case 'xp':
      return applyToTargets(run, effect.target, pokemonIndex, seed, (r, i) =>
        applyExpBoost(r, i, effect.amount)
      );

    case 'energyModifier':
      if (pokemonIndex === undefined) return run;
      return applyEnergyModifier(run, pokemonIndex, effect.amount);

    case 'drawModifier':
      if (pokemonIndex === undefined) return run;
      return applyDrawModifier(run, pokemonIndex, effect.amount);

    case 'addDazed':
      if (pokemonIndex === undefined) return run;
      return addDazedCards(run, pokemonIndex, effect.count);

    case 'setPath':
      return setNodeConnections(run, run.currentNodeId, effect.connections);

    default:
      return run;
  }
}

/**
 * Apply a function to the correct targets based on EffectTarget.
 */
function applyToTargets(
  run: RunState,
  target: 'one' | 'all' | 'random',
  pokemonIndex: number | undefined,
  seed: number,
  fn: (run: RunState, index: number) => RunState
): RunState {
  const aliveIndices = run.party
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.knockedOut && p.currentHp > 0)
    .map(({ i }) => i);

  if (aliveIndices.length === 0) return run;

  switch (target) {
    case 'one': {
      const idx = pokemonIndex !== undefined && aliveIndices.includes(pokemonIndex)
        ? pokemonIndex
        : aliveIndices[0];
      return fn(run, idx);
    }
    case 'all': {
      let result = run;
      for (const i of aliveIndices) {
        result = fn(result, i);
      }
      return result;
    }
    case 'random': {
      const rng = createRng(seed + 54321);
      const idx = aliveIndices[Math.floor(rng() * aliveIndices.length)];
      return fn(run, idx);
    }
  }
}

// ============================================================
// Node Connection Helpers
// ============================================================

/**
 * Replace a node's connections in the run's map.
 * Used by the 'setPath' event effect to force a specific route.
 */
function setNodeConnections(run: RunState, nodeId: string, connections: string[]): RunState {
  return {
    ...run,
    nodes: run.nodes.map(node =>
      node.id === nodeId ? { ...node, connectsTo: connections } : node
    ),
  };
}

// ============================================================
// Re-exports for convenience
// ============================================================

export { needsPokemonSelection, isInteractiveEffect };
