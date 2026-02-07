/**
 * Passive Ability System
 *
 * Passives are triggered at specific hook points in the battle engine:
 * - onBattleStart: At the start of battle (intimidate)
 * - onTurnStart: After drawing hand at the start of a turn
 * - onDamageDealt: After damage is dealt (after block)
 * - onDamageTaken: When a combatant takes damage (poison_point, anger_point)
 * - onStatusApplied: When a status is applied to a target
 * - onTurnEnd: At the end of a turn (to reset per-turn flags)
 * - onRoundEnd: At the end of a round (reset round flags)
 */

import type { CombatState, Combatant, LogEntry, MoveDefinition, MoveType } from './types';
import { applyStatus, getEffectiveSpeed } from './status';
import { applyHeal } from './damage';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get adjacent enemies in the same row as the target.
 * Adjacent means columns that differ by 1.
 */
export function getAdjacentEnemies(
  state: CombatState,
  target: Combatant
): Combatant[] {
  const enemies = state.combatants.filter(
    c => c.side === target.side && c.alive && c.id !== target.id && c.position.row === target.position.row
  );

  // Adjacent means column differs by exactly 1
  return enemies.filter(e => Math.abs(e.position.column - target.position.column) === 1);
}

/**
 * Find the highest-cost FIRE card in a combatant's hand.
 * Tie-breaker: first in hand order (lowest index).
 */
export function findHighestCostFireCard(
  combatant: Combatant,
  getMove: (id: string) => MoveDefinition
): { cardId: string; index: number; cost: number } | null {
  let highestIdx = -1;
  let highestCost = -1;

  for (let i = 0; i < combatant.hand.length; i++) {
    const move = getMove(combatant.hand[i]);
    // Only consider fire-type cards
    if (move.type !== 'fire') continue;

    if (move.cost > highestCost) {
      highestCost = move.cost;
      highestIdx = i;
    }
  }

  if (highestIdx === -1) return null;

  return {
    cardId: combatant.hand[highestIdx],
    index: highestIdx,
    cost: highestCost,
  };
}

// ============================================================
// Passive Hooks
// ============================================================

/**
 * Called at the START of battle, after all combatants are created.
 * Used for: Intimidate
 */
export function onBattleStart(state: CombatState): LogEntry[] {
  const logs: LogEntry[] = [];

  // Scurry: Gain 2 Haste at start of combat
  for (const combatant of state.combatants) {
    if (!combatant.alive) continue;
    if (!combatant.passiveIds.includes('scurry')) continue;

    applyStatus(state, combatant, 'haste', 2, combatant.id);
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Scurry: ${combatant.name} gains 2 Haste!`,
    });
  }

  // Intimidate: Apply 2 Enfeeble to all enemies at battle start
  for (const combatant of state.combatants) {
    if (!combatant.alive) continue;
    if (!combatant.passiveIds.includes('intimidate')) continue;

    const enemies = state.combatants.filter(
      c => c.side !== combatant.side && c.alive
    );

    for (const enemy of enemies) {
      applyStatus(state, enemy, 'enfeeble', 2, combatant.id);
    }

    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Intimidate: ${combatant.name} applies 2 Enfeeble to all enemies!`,
    });
  }

  // Hustle: Increase hand size by 1
  for (const combatant of state.combatants) {
    if (!combatant.alive) continue;
    if (!combatant.passiveIds.includes('hustle')) continue;

    combatant.handSize += 1;
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Hustle: ${combatant.name}'s hand size increased to ${combatant.handSize}!`,
    });
  }

  return logs;
}

/**
 * Called at the START of a combatant's turn, AFTER drawing hand.
 * Used for: Inferno Momentum, Baby Shell, Shed Skin, Hustle
 */
export function onTurnStart(
  state: CombatState,
  combatant: Combatant,
  getMove: (id: string) => MoveDefinition
): LogEntry[] {
  const logs: LogEntry[] = [];

  // Reset per-turn flags
  combatant.turnFlags.blazeStrikeUsedThisTurn = false;
  combatant.turnFlags.infernoMomentumReducedIndex = null;
  combatant.turnFlags.relentlessUsedThisTurn = false;

  // Inferno Momentum: Reduce highest-cost FIRE card's cost by 3
  if (combatant.passiveIds.includes('inferno_momentum')) {
    const highest = findHighestCostFireCard(combatant, getMove);
    if (highest && highest.cost > 0) {
      combatant.turnFlags.infernoMomentumReducedIndex = highest.index;
      const move = getMove(highest.cardId);
      const newCost = Math.max(0, highest.cost - 3);
      logs.push({
        round: state.round,
        combatantId: combatant.id,
        message: `Inferno Momentum: ${move.name} cost reduced to ${newCost}!`,
      });
    }
  }

  // Baby Shell: Gain 3 Block at turn start
  if (combatant.passiveIds.includes('baby_shell')) {
    combatant.block += 3;
    logs.push({
      round: state.round,
      combatantId: combatant.id,
      message: `Baby Shell: Gained 3 Block!`,
    });
  }

  // Hustle: Draw an extra card at start of turn (card draw handled externally via flag check)
  // Note: The actual card draw is handled in turns.ts by checking this passive

  // Reset Relentless bonus counter at turn start
  combatant.costModifiers['relentlessBonus'] = 0;

  return logs;
}

/**
 * Check if Blaze Strike should trigger for this attack.
 * Used for: Blaze Strike (first Fire attack deals double damage)
 * Returns whether the multiplier should apply, and marks it as used.
 */
export function checkBlazeStrike(
  state: CombatState,
  attacker: Combatant,
  card: MoveDefinition,
  dryRun: boolean = false  // If true, don't set the flag (for preview calculations)
): { shouldApply: boolean; logs: LogEntry[] } {
  const logs: LogEntry[] = [];

  const hasBlaze = attacker.passiveIds.includes('blaze_strike');
  const isFire = card.type === 'fire';
  const notUsed = !attacker.turnFlags.blazeStrikeUsedThisTurn;

  // Blaze Strike: First Fire attack each turn deals double damage
  if (hasBlaze && isFire && notUsed) {
    // Only set the flag if this is NOT a dry run (actual card play)
    if (!dryRun) {
      attacker.turnFlags.blazeStrikeUsedThisTurn = true;
      logs.push({
        round: state.round,
        combatantId: attacker.id,
        message: `Blaze Strike: ${card.name} deals double damage!`,
      });
    }
    return { shouldApply: true, logs };
  }

  return { shouldApply: false, logs };
}

/**
 * Called AFTER damage is dealt (after block reduction).
 * Used for: Kindling (add +1 Burn if unblocked Fire attack)
 */
export function onDamageDealt(
  state: CombatState,
  attacker: Combatant,
  target: Combatant,
  card: MoveDefinition,
  damageDealt: number // Damage that actually got through (after block)
): LogEntry[] {
  const logs: LogEntry[] = [];

  // Kindling: Unblocked Fire attacks apply +1 Burn
  if (attacker.passiveIds.includes('kindling') && card.type === 'fire' && damageDealt > 0) {
    applyStatus(state, target, 'burn', 1, attacker.id);
    logs.push({
      round: state.round,
      combatantId: attacker.id,
      message: `Kindling: +1 Burn applied to ${target.name}!`,
    });

    // Trigger Spreading Flames if attacker has it (even if target died)
    const spreadLogs = onStatusApplied(state, attacker, target, 'burn', 1);
    logs.push(...spreadLogs);
  }

  // Fortified Cannons: Gain Block equal to half damage dealt on Water attacks
  if (attacker.passiveIds.includes('fortified_cannons') && card.type === 'water' && damageDealt > 0) {
    const blockGain = Math.floor(damageDealt / 2);
    if (blockGain > 0) {
      attacker.block += blockGain;
      logs.push({
        round: state.round,
        combatantId: attacker.id,
        message: `Fortified Cannons: Gained ${blockGain} Block!`,
      });
    }
  }

  // Baby Vines: Unblocked Grass attacks apply Leech (+2 with Overgrow)
  if (attacker.passiveIds.includes('baby_vines') && card.type === 'grass' && damageDealt > 0) {
    const leechAmount = attacker.passiveIds.includes('overgrow') ? 2 : 1;
    applyStatus(state, target, 'leech', leechAmount, attacker.id);
    logs.push({
      round: state.round,
      combatantId: attacker.id,
      message: `Baby Vines: +${leechAmount} Leech applied to ${target.name}!`,
    });

    // Trigger Spreading Spores
    const spreadLogs = onStatusApplied(state, attacker, target, 'leech', leechAmount);
    logs.push(...spreadLogs);
  }

  // Numbing Strike: Unblocked Electric attacks apply +1 Paralysis
  if (attacker.passiveIds.includes('numbing_strike') && card.type === 'electric' && damageDealt > 0) {
    applyStatus(state, target, 'paralysis', 1, attacker.id);
    logs.push({
      round: state.round,
      combatantId: attacker.id,
      message: `Numbing Strike: +1 Paralysis applied to ${target.name}!`,
    });
  }

  return logs;
}

/**
 * Called when a status is applied.
 * Used for: Spreading Flames (spread Burn to adjacent enemies)
 */
export function onStatusApplied(
  state: CombatState,
  source: Combatant,
  target: Combatant,
  statusType: string,
  _stacks: number
): LogEntry[] {
  const logs: LogEntry[] = [];

  // Spreading Flames: When applying Burn, also apply 1 Burn to adjacent enemies
  if (source.passiveIds.includes('spreading_flames') && statusType === 'burn') {
    const adjacent = getAdjacentEnemies(state, target);
    for (const adj of adjacent) {
      // Apply 1 Burn to each adjacent enemy
      // Note: This should NOT trigger Spreading Flames recursively
      // We handle this by only checking the source's passive, not re-checking
      applyStatusDirect(state, adj, 'burn', 1, source.id);
      logs.push({
        round: state.round,
        combatantId: source.id,
        message: `Spreading Flames: 1 Burn spreads to ${adj.name}!`,
      });
    }
  }

  // Spreading Spores: Apply 1 Leech to adjacent enemies
  if (source.passiveIds.includes('spreading_spores') && statusType === 'leech') {
    const adjacent = getAdjacentEnemies(state, target);
    for (const adj of adjacent) {
      applyStatusDirect(state, adj, 'leech', 1, source.id);
      logs.push({
        round: state.round,
        combatantId: source.id,
        message: `Spreading Spores: 1 Leech spreads to ${adj.name}!`,
      });
    }
  }

  return logs;
}

/**
 * Direct status application without triggering passive hooks.
 * Used internally to prevent infinite recursion.
 */
function applyStatusDirect(
  state: CombatState,
  target: Combatant,
  statusType: string,
  stacks: number,
  sourceId: string
): void {
  // Use the regular applyStatus but mark it as non-recursive
  applyStatus(state, target, statusType as any, stacks, sourceId);
}

/**
 * Called at the END of a combatant's turn.
 * Used for: Leftovers, Shed Skin
 */
export function onTurnEnd(
  state: CombatState,
  combatant: Combatant
): LogEntry[] {
  const logs: LogEntry[] = [];

  // Leftovers: Heal 4 HP at the end of each turn
  if (combatant.passiveIds.includes('leftovers') && combatant.alive) {
    const healed = applyHeal(combatant, 4);
    if (healed > 0) {
      logs.push({
        round: state.round,
        combatantId: combatant.id,
        message: `Leftovers: ${combatant.name} heals ${healed} HP! (HP: ${combatant.hp}/${combatant.maxHp})`,
      });
    }
  }

  // Shed Skin: At end of turn, remove 1 debuff from yourself
  if (combatant.passiveIds.includes('shed_skin') && combatant.alive) {
    const debuffTypes = ['burn', 'poison', 'paralysis', 'slow', 'enfeeble', 'sleep', 'leech'];
    const debuffs = combatant.statuses.filter(s => debuffTypes.includes(s.type));
    if (debuffs.length > 0) {
      // Remove from highest stacks first
      debuffs.sort((a, b) => b.stacks - a.stacks);
      const toReduce = debuffs[0];
      toReduce.stacks -= 1;
      logs.push({
        round: state.round,
        combatantId: combatant.id,
        message: `Shed Skin: 1 ${toReduce.type} stack removed!`,
      });
      if (toReduce.stacks <= 0) {
        combatant.statuses = combatant.statuses.filter(s => s.type !== toReduce.type);
        logs.push({
          round: state.round,
          combatantId: combatant.id,
          message: `${toReduce.type} on ${combatant.name} expired.`,
        });
      }
    }
  }

  return logs;
}

/**
 * Called at the END of each round (after all combatants have acted).
 * Used for: Resetting round-based flags
 */
export function onRoundEnd(state: CombatState): void {
  // Reset allies damaged this round for all combatants
  for (const c of state.combatants) {
    c.turnFlags.alliesDamagedThisRound = new Set();
  }
}

/**
 * Called when a combatant takes damage (after damage is applied).
 * Used for: Anger Point, Protective Instinct
 * @param wasBlocked - true if some damage was blocked
 * @param hpDamage - actual HP damage dealt (after block)
 */
export function onDamageTaken(
  state: CombatState,
  _attacker: Combatant,
  target: Combatant,
  hpDamage: number,
  _card: MoveDefinition  // Card info preserved for future passives
): LogEntry[] {
  const logs: LogEntry[] = [];

  // Only trigger on actual HP damage (unblocked)
  if (hpDamage <= 0) return logs;

  // Raging Bull: When you take unblocked damage, gain 4 Strength
  if (target.passiveIds.includes('raging_bull') && target.alive) {
    applyStatus(state, target, 'strength', 4, target.id);
    logs.push({
      round: state.round,
      combatantId: target.id,
      message: `Raging Bull: ${target.name} gains 4 Strength!`,
    });
  }

  // Track ally damage and trigger Protective Instinct
  const allies = state.combatants.filter(
    c => c.side === target.side && c.id !== target.id && c.alive
  );
  for (const ally of allies) {
    ally.turnFlags.alliesDamagedThisRound.add(target.id);

    // Protective Instinct: When an ally takes damage, gain 3 Block
    if (ally.passiveIds.includes('protective_instinct')) {
      ally.block += 3;
      logs.push({
        round: state.round,
        combatantId: ally.id,
        message: `Protective Instinct: ${ally.name} gains 3 Block!`,
      });
    }
  }

  return logs;
}

/**
 * Check Poison Point effect.
 * Poison Point: Unblocked Poison attacks apply +1 Poison.
 * Returns true if the effect should trigger.
 */
export function checkPoisonPoint(
  attacker: Combatant,
  card: MoveDefinition,
  damageDealt: number
): boolean {
  return attacker.passiveIds.includes('poison_point') &&
         card.type === 'poison' &&
         damageDealt > 0;
}

/**
 * Check if a card is an attack (has any damage-dealing effect).
 */
export function isAttackCard(card: MoveDefinition): boolean {
  const attackTypes = ['damage', 'multi_hit', 'recoil', 'heal_on_hit', 'self_ko'];
  return card.effects.some(e => attackTypes.includes(e.type));
}

// ============================================================
// New Passive Damage Modifiers
// ============================================================

/**
 * Check Gust Force effect.
 * Gust Force: Gust (card) applies +1 Slow.
 * Returns true if the card is "gust" and should apply extra Slow.
 */
export function checkGustForce(
  attacker: Combatant,
  card: MoveDefinition
): boolean {
  return attacker.passiveIds.includes('gust_force') && card.id === 'gust';
}

/**
 * Check Whipping Winds bonus damage.
 * Whipping Winds: Enemies with Slow take +1 damage from your attacks.
 */
export function checkWhippingWinds(
  attacker: Combatant,
  target: Combatant
): number {
  if (!attacker.passiveIds.includes('whipping_winds')) return 0;
  const hasSlow = target.statuses.some(s => s.type === 'slow' && s.stacks > 0);
  return hasSlow ? 1 : 0;
}

/**
 * Check Predator's Patience bonus damage.
 * Predator's Patience: Enemies with Poison take +2 damage from your attacks.
 */
export function checkPredatorsPatience(
  attacker: Combatant,
  target: Combatant
): number {
  if (!attacker.passiveIds.includes('predators_patience')) return 0;
  const hasPoison = target.statuses.some(s => s.type === 'poison' && s.stacks > 0);
  return hasPoison ? 2 : 0;
}

/**
 * Check Thick Hide damage reduction.
 * Thick Hide: Take 1 less damage from all attacks.
 */
export function checkThickHide(target: Combatant): number {
  if (target.passiveIds.includes('thick_hide')) {
    return 1;
  }
  return 0;
}

/**
 * Check Thick Fat damage reduction multiplier.
 * Thick Fat: Take 25% less damage from Fire and Ice attacks.
 * Returns 0.75 if active, 1.0 otherwise.
 */
export function checkThickFat(target: Combatant, moveType?: MoveType): number {
  if (target.passiveIds.includes('thick_fat') && (moveType === 'fire' || moveType === 'ice')) {
    return 0.75;
  }
  return 1.0;
}

/**
 * Check Underdog bonus damage.
 * Underdog: Basic or Common rarity cards that cost 1 deal +2 damage.
 */
export function checkUnderdog(
  attacker: Combatant,
  card: MoveDefinition
): number {
  if (attacker.passiveIds.includes('underdog') &&
      (card.rarity === 'common' || card.rarity === 'basic') &&
      card.cost === 1) {
    return 2;
  }
  return 0;
}

/**
 * Check Anger Point damage multiplier.
 * Anger Point: Your attacks deal +50% damage when below 50% HP.
 * Returns the multiplier (1.0 normally, 1.5 when active).
 */
export function checkAngerPoint(attacker: Combatant): number {
  if (attacker.passiveIds.includes('anger_point') &&
      attacker.hp < attacker.maxHp * 0.5) {
    return 1.5;
  }
  return 1.0;
}

/**
 * Check Scrappy bonus damage.
 * Scrappy: Your Normal attacks deal +2 damage.
 */
export function checkScrappy(
  attacker: Combatant,
  card: MoveDefinition
): number {
  if (attacker.passiveIds.includes('scrappy') && card.type === 'normal') {
    return 2;
  }
  return 0;
}

/**
 * Check Parental Bond effect.
 * Parental Bond: The first attack each turn triggers twice (second hit deals 50% damage).
 * Family Fury: When below 50% HP, ALL your attacks trigger Parental Bond.
 * Returns true if the passive should trigger.
 */
export function checkParentalBond(attacker: Combatant): boolean {
  // Family Fury: When below 50% HP, ALL attacks trigger Parental Bond
  if (attacker.passiveIds.includes('family_fury') &&
      attacker.hp < attacker.maxHp * 0.5) {
    return true;
  }
  // Parental Bond: First attack each turn only
  if (attacker.passiveIds.includes('parental_bond') &&
      !attacker.turnFlags.relentlessUsedThisTurn) {  // Reuse flag to track first attack
    return true;
  }
  return false;
}

/**
 * Get passive speed bonus.
 * (No speed bonuses in current passive set)
 */
export function getPassiveSpeedBonus(_combatant: Combatant): number {
  // None of the current passives give speed bonuses
  return 0;
}

/**
 * Check Quick Feet cost reduction.
 * Quick Feet: Your first attack each turn costs 1 less.
 * Returns cost reduction (0 or 1).
 */
export function checkQuickFeet(
  combatant: Combatant,
  card: MoveDefinition
): number {
  if (!combatant.passiveIds.includes('quick_feet')) return 0;
  if (combatant.turnFlags.relentlessUsedThisTurn) return 0;  // First attack already played
  if (!isAttackCard(card)) return 0;
  return 1;
}

/**
 * Check Hustle effects.
 * Hustle: Draw an extra card at start of turn. Your attacks deal +2 damage but cost +1.
 */
export function checkHustleDamageBonus(attacker: Combatant): number {
  if (attacker.passiveIds.includes('hustle')) {
    return 3;
  }
  return 0;
}

export function checkHustleCostIncrease(
  combatant: Combatant,
  card: MoveDefinition
): number {
  if (combatant.passiveIds.includes('hustle') && isAttackCard(card)) {
    return 1;
  }
  return 0;
}

/**
 * Track Relentless damage bonus.
 * Relentless: Each card you play this turn gives your next attack +1 damage.
 * Returns bonus based on cards played this turn.
 */
export function checkRelentless(combatant: Combatant): number {
  if (!combatant.passiveIds.includes('relentless')) return 0;
  // The number of cards played is tracked via costModifiers counter
  return combatant.costModifiers['relentlessBonus'] ?? 0;
}

/**
 * Check if Bastion Barrage should provide bonus damage.
 * Bastion Barrage: Water attacks deal +25% of current Block as bonus damage.
 */
export function checkBastionBarrage(
  state: CombatState,
  attacker: Combatant,
  card: MoveDefinition
): { bonusDamage: number; logs: LogEntry[] } {
  const logs: LogEntry[] = [];

  if (attacker.passiveIds.includes('bastion_barrage') && card.type === 'water' && attacker.block > 0) {
    const bonus = Math.floor(attacker.block * 0.25);
    if (bonus > 0) {
      logs.push({
        round: state.round,
        combatantId: attacker.id,
        message: `Bastion Barrage: +${bonus} bonus damage from Block!`,
      });
      return { bonusDamage: bonus, logs };
    }
  }

  return { bonusDamage: 0, logs };
}

/**
 * Check if Counter-Current should provide bonus damage.
 * Counter-Current: Deal bonus damage to slower enemies (floor((yourSpeed - theirSpeed) / 2)).
 */
export function checkCounterCurrent(
  state: CombatState,
  attacker: Combatant,
  target: Combatant
): { bonusDamage: number; logs: LogEntry[] } {
  const logs: LogEntry[] = [];

  if (!attacker.passiveIds.includes('counter_current')) {
    return { bonusDamage: 0, logs };
  }

  const attackerSpeed = getEffectiveSpeed(attacker);
  const targetSpeed = getEffectiveSpeed(target);

  if (attackerSpeed <= targetSpeed) {
    return { bonusDamage: 0, logs };
  }

  const bonus = Math.floor((attackerSpeed - targetSpeed) / 2);
  if (bonus > 0) {
    logs.push({
      round: state.round,
      combatantId: attacker.id,
      message: `Counter-Current: +${bonus} bonus damage (speed ${attackerSpeed} vs ${targetSpeed})!`,
    });
  }

  return { bonusDamage: bonus, logs };
}

/**
 * Check if Static Field should reduce incoming damage.
 * Static Field: Take reduced damage from slower enemies (floor((yourSpeed - theirSpeed) / 2)).
 */
export function checkStaticField(
  state: CombatState,
  attacker: Combatant,
  target: Combatant
): { reduction: number; logs: LogEntry[] } {
  const logs: LogEntry[] = [];

  if (!target.passiveIds.includes('static_field')) {
    return { reduction: 0, logs };
  }

  const attackerSpeed = getEffectiveSpeed(attacker);
  const targetSpeed = getEffectiveSpeed(target);

  if (targetSpeed <= attackerSpeed) {
    return { reduction: 0, logs };
  }

  const reduction = Math.floor((targetSpeed - attackerSpeed) / 2);
  if (reduction > 0) {
    logs.push({
      round: state.round,
      combatantId: target.id,
      message: `Static Field: -${reduction} damage (speed ${targetSpeed} vs ${attackerSpeed})!`,
    });
  }

  return { reduction, logs };
}

/**
 * Check Sheer Force damage multiplier.
 * Sheer Force: Your attacks deal 30% more damage. Your moves cannot apply status effects.
 * Returns the multiplier (1.0 normally, 1.3 when active).
 */
export function checkSheerForce(attacker: Combatant): number {
  if (attacker.passiveIds.includes('sheer_force')) {
    return 1.3;
  }
  return 1.0;
}

/**
 * Check if Sheer Force blocks status application from moves.
 * Returns true if the attacker has Sheer Force (blocking move-based status effects).
 */
export function sheerForceBlocksStatus(attacker: Combatant): boolean {
  return attacker.passiveIds.includes('sheer_force');
}

/**
 * Process Toxic Horn after attacking poisoned enemies.
 * Toxic Horn: When attacking poisoned enemies, gain Strength equal to total damage dealt / 4.
 * This should be called after all damage from a card is dealt.
 */
export function processToxicHorn(
  state: CombatState,
  attacker: Combatant,
  totalDamageToPoisoned: number
): LogEntry[] {
  const logs: LogEntry[] = [];

  if (!attacker.passiveIds.includes('toxic_horn')) return logs;
  if (totalDamageToPoisoned <= 0) return logs;

  const strengthGain = Math.floor(totalDamageToPoisoned / 4);
  if (strengthGain > 0) {
    applyStatus(state, attacker, 'strength', strengthGain, attacker.id);
    logs.push({
      round: state.round,
      combatantId: attacker.id,
      message: `Toxic Horn: ${attacker.name} gains ${strengthGain} Strength from ${totalDamageToPoisoned} damage to poisoned enemies!`,
    });
  }

  return logs;
}

/**
 * Process Protective Toxins after attacking poisoned enemies.
 * Protective Toxins: When attacking poisoned enemies, all allies gain Block equal to total damage dealt.
 * This should be called after all damage from a card is dealt.
 */
export function processProtectiveToxins(
  state: CombatState,
  attacker: Combatant,
  totalDamageToPoisoned: number
): LogEntry[] {
  const logs: LogEntry[] = [];

  if (!attacker.passiveIds.includes('protective_toxins')) return logs;
  if (totalDamageToPoisoned <= 0) return logs;

  // Get all living allies (same team as attacker)
  const allies = state.combatants.filter(c =>
    c.alive && c.team === attacker.team
  );

  for (const ally of allies) {
    ally.block += totalDamageToPoisoned;
  }

  const allyNames = allies.map(a => a.name).join(', ');
  logs.push({
    round: state.round,
    combatantId: attacker.id,
    message: `Protective Toxins: ${allyNames} ${allies.length === 1 ? 'gains' : 'gain'} ${totalDamageToPoisoned} Block!`,
  });

  return logs;
}

/**
 * Check if a target is poisoned.
 */
export function isPoisoned(target: Combatant): boolean {
  return target.statuses.some(s => s.type === 'poison' && s.stacks > 0);
}

// ============================================================
// Rhyhorn/Rhydon Passives
// ============================================================

/**
 * Rock Head: Prevents recoil damage.
 * Returns true if the combatant has Rock Head.
 */
export function hasRockHead(combatant: Combatant): boolean {
  return combatant.passiveIds.includes('rock_head');
}

/**
 * Reckless: Recoil moves deal 30% more damage.
 * Returns the damage multiplier (1.3 if has Reckless, 1.0 otherwise).
 */
export function checkReckless(attacker: Combatant, card: MoveDefinition): number {
  if (!attacker.passiveIds.includes('reckless')) return 1.0;
  // Check if the card has a recoil effect
  const hasRecoil = card.effects.some(e => e.type === 'recoil');
  return hasRecoil ? 1.3 : 1.0;
}

/**
 * Lightning Rod: Redirects Electric attacks targeting allies in the same row.
 * Returns the combatant who should receive the attack (redirected target or original).
 * Also returns whether redirection occurred for damage reduction.
 */
export function checkLightningRod(
  state: CombatState,
  attacker: Combatant,
  originalTarget: Combatant,
  card: MoveDefinition
): { target: Combatant; redirected: boolean } {
  // Only applies to Electric-type attacks
  if (card.type !== 'electric') {
    return { target: originalTarget, redirected: false };
  }

  // Find an ally with Lightning Rod in the same row as the target
  const allies = state.combatants.filter(c =>
    c.alive &&
    c.team === originalTarget.team &&
    c.id !== originalTarget.id &&
    c.row === originalTarget.row &&
    c.passiveIds.includes('lightning_rod')
  );

  if (allies.length === 0) {
    return { target: originalTarget, redirected: false };
  }

  // Redirect to the first ally with Lightning Rod
  return { target: allies[0], redirected: true };
}
