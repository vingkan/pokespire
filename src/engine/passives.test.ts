import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestCombatant,
  createTestCombatState,
  addStatus,
  resetTestIds,
} from './test-helpers';
import {
  processProtectiveToxins,
  processToxicHorn,
  checkThickHide,
  checkThickFat,
  checkUnderdog,
  checkAngerPoint,
  hasRockHead,
  // Battle start hooks
  onBattleStart,
  // Turn start hooks
  onTurnStart,
  // Damage dealt hooks
  onDamageDealt,
  checkBlazeStrike,
  // Status applied hooks
  onStatusApplied,
  // Turn end hooks
  onTurnEnd,
  // Damage taken hooks
  onDamageTaken,
  // Damage modifiers
  checkGustForce,
  checkKeenEye,
  hasWhippingWinds,
  checkPredatorsPatience,
  checkScrappy,
  checkParentalBond,
  checkQuickFeet,
  checkHustleMultiplier,
  checkHustleCostIncrease,
  checkRelentless,
  checkFortifiedCannons,
  checkCounterCurrent,
  checkStaticField,
  checkSheerForce,
  sheerForceBlocksStatus,
  checkReckless,
  checkLightningRod,
  checkPoisonPoint,
} from './passives';
import { getMove } from '../data/loaders';

describe('Passive Abilities', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('Protective Toxins', () => {
    it('gives block to all allies equal to HALF damage dealt to poisoned enemies', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        name: 'Nidoqueen',
        side: 'player',
        passiveIds: ['protective_toxins'],
      });
      const ally = createTestCombatant({
        id: 'ally',
        name: 'Ally',
        side: 'player',
        block: 0,
      });
      const state = createTestCombatState([attacker, ally]);

      // Deal 10 damage to poisoned enemies
      processProtectiveToxins(state, attacker, 10);

      // Half of 10 = 5 block to each ally
      expect(attacker.block).toBe(5);
      expect(ally.block).toBe(5);
    });

    it('rounds down block amount', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        side: 'player',
        passiveIds: ['protective_toxins'],
        block: 0,
      });
      const state = createTestCombatState([attacker]);

      processProtectiveToxins(state, attacker, 7); // Half = 3.5, rounds to 3

      expect(attacker.block).toBe(3);
    });

    it('does nothing if combatant lacks the passive', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'player', block: 0 });
      const state = createTestCombatState([attacker]);

      processProtectiveToxins(state, attacker, 10);

      expect(attacker.block).toBe(0);
    });

    it('does nothing for 0 damage', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        side: 'player',
        passiveIds: ['protective_toxins'],
        block: 0,
      });
      const state = createTestCombatState([attacker]);

      processProtectiveToxins(state, attacker, 0);

      expect(attacker.block).toBe(0);
    });

    it('does nothing for 1 damage (half rounds to 0)', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        side: 'player',
        passiveIds: ['protective_toxins'],
        block: 0,
      });
      const state = createTestCombatState([attacker]);

      processProtectiveToxins(state, attacker, 1);

      expect(attacker.block).toBe(0);
    });
  });

  describe('Toxic Horn', () => {
    it('grants Strength equal to damage/4 when attacking poisoned enemies', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        side: 'player',
        passiveIds: ['toxic_horn'],
      });
      const state = createTestCombatState([attacker]);

      processToxicHorn(state, attacker, 12); // 12/4 = 3 Strength

      expect(attacker.statuses.find(s => s.type === 'strength')?.stacks).toBe(3);
    });

    it('rounds down Strength gain', () => {
      const attacker = createTestCombatant({
        id: 'attacker',
        side: 'player',
        passiveIds: ['toxic_horn'],
      });
      const state = createTestCombatState([attacker]);

      processToxicHorn(state, attacker, 10); // 10/4 = 2.5 -> 2

      expect(attacker.statuses.find(s => s.type === 'strength')?.stacks).toBe(2);
    });
  });

  describe('Thick Hide', () => {
    it('returns 1 for combatants with thick_hide', () => {
      const combatant = createTestCombatant({ passiveIds: ['thick_hide'] });

      expect(checkThickHide(combatant)).toBe(1);
    });

    it('returns 0 for combatants without thick_hide', () => {
      const combatant = createTestCombatant({ passiveIds: [] });

      expect(checkThickHide(combatant)).toBe(0);
    });
  });

  describe('Thick Fat', () => {
    it('returns 0.75 for Fire attacks against thick_fat', () => {
      const combatant = createTestCombatant({ passiveIds: ['thick_fat'] });

      expect(checkThickFat(combatant, 'fire')).toBe(0.75);
    });

    it('returns 0.75 for Ice attacks against thick_fat', () => {
      const combatant = createTestCombatant({ passiveIds: ['thick_fat'] });

      expect(checkThickFat(combatant, 'ice')).toBe(0.75);
    });

    it('returns 1.0 for other attack types', () => {
      const combatant = createTestCombatant({ passiveIds: ['thick_fat'] });

      expect(checkThickFat(combatant, 'water')).toBe(1.0);
      expect(checkThickFat(combatant, 'electric')).toBe(1.0);
    });

    it('returns 1.0 if combatant lacks thick_fat', () => {
      const combatant = createTestCombatant({ passiveIds: [] });

      expect(checkThickFat(combatant, 'fire')).toBe(1.0);
    });
  });

  describe('Underdog', () => {
    it('returns +2 for Basic 1-cost cards', () => {
      const attacker = createTestCombatant({ passiveIds: ['underdog'] });
      const card = getMove('tackle'); // Should be Basic rarity, costs 1

      expect(checkUnderdog(attacker, card)).toBe(2);
    });

    it('returns 0 if combatant lacks underdog', () => {
      const attacker = createTestCombatant({ passiveIds: [] });
      const card = getMove('tackle');

      expect(checkUnderdog(attacker, card)).toBe(0);
    });
  });

  describe('Anger Point', () => {
    it('returns 1.5x multiplier when below 50% HP', () => {
      const attacker = createTestCombatant({ hp: 40, maxHp: 100, passiveIds: ['anger_point'] });

      expect(checkAngerPoint(attacker)).toBe(1.5);
    });

    it('returns 1.0 when at or above 50% HP', () => {
      const attacker = createTestCombatant({ hp: 50, maxHp: 100, passiveIds: ['anger_point'] });

      expect(checkAngerPoint(attacker)).toBe(1.0);
    });

    it('returns 1.0 if combatant lacks anger_point', () => {
      const attacker = createTestCombatant({ hp: 10, maxHp: 100, passiveIds: [] });

      expect(checkAngerPoint(attacker)).toBe(1.0);
    });
  });

  describe('Rock Head', () => {
    it('returns true for combatants with rock_head', () => {
      const combatant = createTestCombatant({ passiveIds: ['rock_head'] });

      expect(hasRockHead(combatant)).toBe(true);
    });

    it('returns false for combatants without rock_head', () => {
      const combatant = createTestCombatant({ passiveIds: [] });

      expect(hasRockHead(combatant)).toBe(false);
    });
  });

  // ============================================================
  // Battle Start Passives
  // ============================================================

  describe('Scurry', () => {
    it('grants 2 Haste at battle start', () => {
      const combatant = createTestCombatant({ passiveIds: ['scurry'] });
      const state = createTestCombatState([combatant]);

      onBattleStart(state);

      expect(combatant.statuses.find(s => s.type === 'haste')?.stacks).toBe(2);
    });
  });

  describe('Intimidate', () => {
    it('applies 2 Enfeeble to all enemies at battle start', () => {
      const player = createTestCombatant({ id: 'player', side: 'player', passiveIds: ['intimidate'] });
      const enemy1 = createTestCombatant({ id: 'enemy1', side: 'enemy' });
      const enemy2 = createTestCombatant({ id: 'enemy2', side: 'enemy' });
      const state = createTestCombatState([player, enemy1, enemy2]);

      onBattleStart(state);

      expect(enemy1.statuses.find(s => s.type === 'enfeeble')?.stacks).toBe(2);
      expect(enemy2.statuses.find(s => s.type === 'enfeeble')?.stacks).toBe(2);
    });

    it('does not apply Enfeeble to allies', () => {
      const player1 = createTestCombatant({ id: 'player1', side: 'player', passiveIds: ['intimidate'] });
      const player2 = createTestCombatant({ id: 'player2', side: 'player' });
      const state = createTestCombatState([player1, player2]);

      onBattleStart(state);

      expect(player2.statuses.find(s => s.type === 'enfeeble')).toBeUndefined();
    });
  });

  describe('Hustle (battle start)', () => {
    it('increases hand size by 1 at battle start', () => {
      const combatant = createTestCombatant({ passiveIds: ['hustle'] });
      const originalHandSize = combatant.handSize;
      const state = createTestCombatState([combatant]);

      onBattleStart(state);

      expect(combatant.handSize).toBe(originalHandSize + 1);
    });
  });

  // ============================================================
  // Turn Start Passives
  // ============================================================

  describe('Baby Shell', () => {
    it('grants 3 Block at turn start', () => {
      const combatant = createTestCombatant({ passiveIds: ['baby_shell'], block: 0 });
      const state = createTestCombatState([combatant]);

      onTurnStart(state, combatant, getMove);

      expect(combatant.block).toBe(3);
    });
  });

  describe('Inferno Momentum', () => {
    it('marks highest-cost fire card for cost reduction', () => {
      const combatant = createTestCombatant({ passiveIds: ['inferno_momentum'] });
      combatant.hand = ['ember', 'flamethrower']; // flamethrower costs more
      const state = createTestCombatState([combatant]);

      onTurnStart(state, combatant, getMove);

      // flamethrower is at index 1, should be marked for reduction
      expect(combatant.turnFlags.infernoMomentumReducedIndex).toBe(1);
    });
  });

  // ============================================================
  // Blaze Strike
  // ============================================================

  describe('Blaze Strike', () => {
    it('triggers on first Fire attack', () => {
      const attacker = createTestCombatant({ passiveIds: ['blaze_strike'] });
      const state = createTestCombatState([attacker]);
      const fireCard = getMove('ember');

      const result = checkBlazeStrike(state, attacker, fireCard);

      expect(result.shouldApply).toBe(true);
    });

    it('does not trigger on second Fire attack', () => {
      const attacker = createTestCombatant({ passiveIds: ['blaze_strike'] });
      const state = createTestCombatState([attacker]);
      const fireCard = getMove('ember');

      // First attack
      checkBlazeStrike(state, attacker, fireCard);

      // Second attack
      const result = checkBlazeStrike(state, attacker, fireCard);
      expect(result.shouldApply).toBe(false);
    });

    it('does not trigger on non-Fire attacks', () => {
      const attacker = createTestCombatant({ passiveIds: ['blaze_strike'] });
      const state = createTestCombatState([attacker]);
      const waterCard = getMove('water-gun');

      const result = checkBlazeStrike(state, attacker, waterCard);

      expect(result.shouldApply).toBe(false);
    });
  });

  // ============================================================
  // Damage Dealt Passives
  // ============================================================

  describe('Kindling', () => {
    it('applies +1 Burn on unblocked Fire attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['kindling'], types: ['fire'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const fireCard = getMove('ember');

      onDamageDealt(state, attacker, target, fireCard, 10);

      expect(target.statuses.find(s => s.type === 'burn')?.stacks).toBe(1);
    });

    it('does not apply Burn if damage was fully blocked', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['kindling'], types: ['fire'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const fireCard = getMove('ember');

      onDamageDealt(state, attacker, target, fireCard, 0); // No damage got through

      expect(target.statuses.find(s => s.type === 'burn')).toBeUndefined();
    });
  });

  describe('Torrent Shield', () => {
    it('grants Block equal to damage dealt on first Water attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['torrent_shield'], types: ['water'], block: 0 });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const waterCard = getMove('water-gun');

      onDamageDealt(state, attacker, target, waterCard, 15);

      expect(attacker.block).toBe(15);
    });

    it('does not grant Block on second Water attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['torrent_shield'], types: ['water'], block: 0 });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const waterCard = getMove('water-gun');

      onDamageDealt(state, attacker, target, waterCard, 15);
      onDamageDealt(state, attacker, target, waterCard, 10);

      expect(attacker.block).toBe(15); // Only first attack
    });
  });

  describe('Overgrow Heal', () => {
    it('heals equal to damage dealt on first Grass attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['overgrow_heal'], types: ['grass'], hp: 50, maxHp: 100 });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const grassCard = getMove('vine-whip');

      onDamageDealt(state, attacker, target, grassCard, 12);

      expect(attacker.hp).toBe(62);
    });

    it('does not overheal past maxHp', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['overgrow_heal'], types: ['grass'], hp: 95, maxHp: 100 });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const grassCard = getMove('vine-whip');

      onDamageDealt(state, attacker, target, grassCard, 20);

      expect(attacker.hp).toBe(100);
    });
  });

  describe('Baby Vines', () => {
    it('applies +1 Leech on unblocked Grass attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['baby_vines'], types: ['grass'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const grassCard = getMove('vine-whip');

      onDamageDealt(state, attacker, target, grassCard, 10);

      expect(target.statuses.find(s => s.type === 'leech')?.stacks).toBe(1);
    });
  });

  describe('Numbing Strike', () => {
    it('applies +1 Paralysis on unblocked Electric attack', () => {
      const attacker = createTestCombatant({ id: 'attacker', passiveIds: ['numbing_strike'], types: ['electric'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);
      const electricCard = getMove('thunder-shock');

      onDamageDealt(state, attacker, target, electricCard, 8);

      expect(target.statuses.find(s => s.type === 'paralysis')?.stacks).toBe(1);
    });
  });

  // ============================================================
  // Status Applied Passives
  // ============================================================

  describe('Spreading Flames', () => {
    it('spreads 1 Burn to adjacent enemies', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'player', passiveIds: ['spreading_flames'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const adjacent = createTestCombatant({ id: 'adjacent', side: 'enemy' });

      // Set positions: target at column 1, adjacent at column 2
      target.position = { row: 'front', column: 1 };
      adjacent.position = { row: 'front', column: 2 };

      const state = createTestCombatState([attacker, target, adjacent]);

      onStatusApplied(state, attacker, target, 'burn', 2);

      expect(adjacent.statuses.find(s => s.type === 'burn')?.stacks).toBe(1);
    });
  });

  describe('Spreading Spores', () => {
    it('spreads 1 Leech to adjacent enemies', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'player', passiveIds: ['spreading_spores'] });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const adjacent = createTestCombatant({ id: 'adjacent', side: 'enemy' });

      target.position = { row: 'front', column: 1 };
      adjacent.position = { row: 'front', column: 0 };

      const state = createTestCombatState([attacker, target, adjacent]);

      onStatusApplied(state, attacker, target, 'leech', 2);

      expect(adjacent.statuses.find(s => s.type === 'leech')?.stacks).toBe(1);
    });
  });

  // ============================================================
  // Turn End Passives
  // ============================================================

  describe('Leftovers', () => {
    it('heals 4 HP at end of turn', () => {
      const combatant = createTestCombatant({ passiveIds: ['leftovers'], hp: 50, maxHp: 100 });
      const state = createTestCombatState([combatant]);

      onTurnEnd(state, combatant);

      expect(combatant.hp).toBe(54);
    });

    it('does not overheal', () => {
      const combatant = createTestCombatant({ passiveIds: ['leftovers'], hp: 98, maxHp: 100 });
      const state = createTestCombatState([combatant]);

      onTurnEnd(state, combatant);

      expect(combatant.hp).toBe(100);
    });
  });

  describe('Shed Skin', () => {
    it('removes 1 stack of highest debuff', () => {
      const combatant = createTestCombatant({ passiveIds: ['shed_skin'] });
      addStatus(combatant, 'burn', 3);
      addStatus(combatant, 'poison', 2);
      const state = createTestCombatState([combatant]);

      onTurnEnd(state, combatant);

      expect(combatant.statuses.find(s => s.type === 'burn')?.stacks).toBe(2); // Reduced from 3
      expect(combatant.statuses.find(s => s.type === 'poison')?.stacks).toBe(2); // Unchanged
    });

    it('removes debuff entirely when stacks reach 0', () => {
      const combatant = createTestCombatant({ passiveIds: ['shed_skin'] });
      addStatus(combatant, 'burn', 1);
      const state = createTestCombatState([combatant]);

      onTurnEnd(state, combatant);

      expect(combatant.statuses.find(s => s.type === 'burn')).toBeUndefined();
    });
  });

  // ============================================================
  // Damage Taken Passives
  // ============================================================

  describe('Raging Bull', () => {
    it('grants 4 Strength when taking unblocked damage', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'enemy' });
      const target = createTestCombatant({ id: 'target', side: 'player', passiveIds: ['raging_bull'] });
      const state = createTestCombatState([attacker, target]);
      const card = getMove('tackle');

      onDamageTaken(state, attacker, target, 10, card);

      expect(target.statuses.find(s => s.type === 'strength')?.stacks).toBe(4);
    });
  });

  describe('Protective Instinct', () => {
    it('grants ally 3 Block when taking damage', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'enemy' });
      const target = createTestCombatant({ id: 'target', side: 'player' });
      const protector = createTestCombatant({ id: 'protector', side: 'player', passiveIds: ['protective_instinct'], block: 0 });
      const state = createTestCombatState([attacker, target, protector]);
      const card = getMove('tackle');

      onDamageTaken(state, attacker, target, 10, card);

      expect(protector.block).toBe(3);
    });
  });

  // ============================================================
  // Damage Modifier Passives
  // ============================================================

  describe('Gust Force', () => {
    it('returns true for gust card with passive', () => {
      const attacker = createTestCombatant({ passiveIds: ['gust_force'] });
      const gustCard = getMove('gust');

      expect(checkGustForce(attacker, gustCard)).toBe(true);
    });

    it('returns false for non-gust cards', () => {
      const attacker = createTestCombatant({ passiveIds: ['gust_force'] });
      const otherCard = getMove('wing-attack');

      expect(checkGustForce(attacker, otherCard)).toBe(false);
    });
  });

  describe('Keen Eye', () => {
    it('returns +1 damage against slowed enemies', () => {
      const attacker = createTestCombatant({ passiveIds: ['keen_eye'] });
      const target = createTestCombatant();
      addStatus(target, 'slow', 2);

      expect(checkKeenEye(attacker, target)).toBe(1);
    });

    it('returns 0 against non-slowed enemies', () => {
      const attacker = createTestCombatant({ passiveIds: ['keen_eye'] });
      const target = createTestCombatant();

      expect(checkKeenEye(attacker, target)).toBe(0);
    });
  });

  describe('Whipping Winds', () => {
    it('returns true when attacker has whipping_winds passive', () => {
      const attacker = createTestCombatant({ passiveIds: ['whipping_winds'] });
      expect(hasWhippingWinds(attacker)).toBe(true);
    });

    it('returns false when attacker lacks whipping_winds passive', () => {
      const attacker = createTestCombatant({ passiveIds: [] });
      expect(hasWhippingWinds(attacker)).toBe(false);
    });
  });

  describe('Predator\'s Patience', () => {
    it('returns +2 damage against poisoned enemies', () => {
      const attacker = createTestCombatant({ passiveIds: ['predators_patience'] });
      const target = createTestCombatant();
      addStatus(target, 'poison', 3);

      expect(checkPredatorsPatience(attacker, target)).toBe(2);
    });
  });

  describe('Scrappy', () => {
    it('returns +2 for Normal attacks', () => {
      const attacker = createTestCombatant({ passiveIds: ['scrappy'] });
      const normalCard = getMove('tackle');

      expect(checkScrappy(attacker, normalCard)).toBe(2);
    });

    it('returns 0 for non-Normal attacks', () => {
      const attacker = createTestCombatant({ passiveIds: ['scrappy'] });
      const fireCard = getMove('ember');

      expect(checkScrappy(attacker, fireCard)).toBe(0);
    });
  });

  describe('Parental Bond', () => {
    it('triggers on first attack of turn', () => {
      const attacker = createTestCombatant({ passiveIds: ['parental_bond'] });

      expect(checkParentalBond(attacker)).toBe(true);
    });

    it('does not trigger after first attack used', () => {
      const attacker = createTestCombatant({ passiveIds: ['parental_bond'] });
      attacker.turnFlags.relentlessUsedThisTurn = true;

      expect(checkParentalBond(attacker)).toBe(false);
    });
  });

  describe('Family Fury', () => {
    it('triggers on all attacks when below 50% HP', () => {
      const attacker = createTestCombatant({ passiveIds: ['family_fury'], hp: 40, maxHp: 100 });
      attacker.turnFlags.relentlessUsedThisTurn = true; // Even after first attack

      expect(checkParentalBond(attacker)).toBe(true);
    });
  });

  describe('Quick Feet', () => {
    it('returns 1 cost reduction for first attack', () => {
      const combatant = createTestCombatant({ passiveIds: ['quick_feet'] });
      const attackCard = getMove('tackle');

      expect(checkQuickFeet(combatant, attackCard)).toBe(1);
    });

    it('returns 0 after first attack used', () => {
      const combatant = createTestCombatant({ passiveIds: ['quick_feet'] });
      combatant.turnFlags.relentlessUsedThisTurn = true;
      const attackCard = getMove('tackle');

      expect(checkQuickFeet(combatant, attackCard)).toBe(0);
    });
  });

  describe('Hustle (damage/cost)', () => {
    it('grants 1.3x damage multiplier', () => {
      const attacker = createTestCombatant({ passiveIds: ['hustle'] });

      expect(checkHustleMultiplier(attacker)).toBe(1.3);
    });

    it('adds +1 cost to attack cards', () => {
      const combatant = createTestCombatant({ passiveIds: ['hustle'] });
      const attackCard = getMove('tackle');

      expect(checkHustleCostIncrease(combatant, attackCard)).toBe(1);
    });
  });

  describe('Relentless', () => {
    it('returns bonus based on cards played', () => {
      const combatant = createTestCombatant({ passiveIds: ['relentless'] });
      combatant.costModifiers['relentlessBonus'] = 3;

      expect(checkRelentless(combatant)).toBe(3);
    });
  });

  describe('Fortified Cannons', () => {
    it('adds 25% of Block as bonus damage for Water attacks', () => {
      const attacker = createTestCombatant({ passiveIds: ['fortified_cannons'], block: 20 });
      const state = createTestCombatState([attacker]);
      const waterCard = getMove('water-gun');

      const result = checkFortifiedCannons(state, attacker, waterCard);

      expect(result.bonusDamage).toBe(5); // 20 * 0.25
    });
  });

  describe('Counter-Current', () => {
    it('adds bonus damage against slower enemies', () => {
      const attacker = createTestCombatant({ passiveIds: ['counter_current'], speed: 10 });
      const target = createTestCombatant({ speed: 4 });
      const state = createTestCombatState([attacker, target]);

      const result = checkCounterCurrent(state, attacker, target);

      expect(result.bonusDamage).toBe(3); // (10 - 4) / 2 = 3
    });

    it('returns 0 against faster enemies', () => {
      const attacker = createTestCombatant({ passiveIds: ['counter_current'], speed: 4 });
      const target = createTestCombatant({ speed: 10 });
      const state = createTestCombatState([attacker, target]);

      const result = checkCounterCurrent(state, attacker, target);

      expect(result.bonusDamage).toBe(0);
    });
  });

  describe('Static Field', () => {
    it('reduces damage from slower attackers', () => {
      const attacker = createTestCombatant({ speed: 4 });
      const target = createTestCombatant({ passiveIds: ['static_field'], speed: 10 });
      const state = createTestCombatState([attacker, target]);

      const result = checkStaticField(state, attacker, target);

      expect(result.reduction).toBe(3); // (10 - 4) / 2 = 3
    });
  });

  describe('Sheer Force', () => {
    it('returns 1.3x damage multiplier', () => {
      const attacker = createTestCombatant({ passiveIds: ['sheer_force'] });

      expect(checkSheerForce(attacker)).toBe(1.3);
    });

    it('blocks status application from moves', () => {
      const attacker = createTestCombatant({ passiveIds: ['sheer_force'] });

      expect(sheerForceBlocksStatus(attacker)).toBe(true);
    });
  });

  describe('Reckless', () => {
    it('returns 1.3x for recoil moves', () => {
      const attacker = createTestCombatant({ passiveIds: ['reckless'] });
      const recoilCard = getMove('take-down');

      expect(checkReckless(attacker, recoilCard)).toBe(1.3);
    });

    it('returns 1.0 for non-recoil moves', () => {
      const attacker = createTestCombatant({ passiveIds: ['reckless'] });
      const normalCard = getMove('tackle');

      expect(checkReckless(attacker, normalCard)).toBe(1.0);
    });
  });

  describe('Lightning Rod', () => {
    it('redirects Electric attacks to self', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'enemy' });
      const originalTarget = createTestCombatant({ id: 'target', side: 'player' });
      const redirector = createTestCombatant({ id: 'redirector', side: 'player', passiveIds: ['lightning_rod'] });

      originalTarget.position = { row: 'front', column: 0 };
      redirector.position = { row: 'front', column: 1 };

      const state = createTestCombatState([attacker, originalTarget, redirector]);
      const electricCard = getMove('thunder-shock');

      const result = checkLightningRod(state, attacker, originalTarget, electricCard);

      expect(result.target.id).toBe('redirector');
      expect(result.redirected).toBe(true);
    });

    it('does not redirect non-Electric attacks', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'enemy' });
      const originalTarget = createTestCombatant({ id: 'target', side: 'player' });
      const redirector = createTestCombatant({ id: 'redirector', side: 'player', passiveIds: ['lightning_rod'] });

      originalTarget.position = { row: 'front', column: 0 };
      redirector.position = { row: 'front', column: 1 };

      const state = createTestCombatState([attacker, originalTarget, redirector]);
      const normalCard = getMove('tackle');

      const result = checkLightningRod(state, attacker, originalTarget, normalCard);

      expect(result.target.id).toBe('target');
      expect(result.redirected).toBe(false);
    });
  });

  describe('Poison Point', () => {
    it('returns true for unblocked Poison attacks', () => {
      const attacker = createTestCombatant({ passiveIds: ['poison_point'] });
      const poisonCard = getMove('poison-sting');

      expect(checkPoisonPoint(attacker, poisonCard, 5)).toBe(true);
    });

    it('returns false when damage is blocked', () => {
      const attacker = createTestCombatant({ passiveIds: ['poison_point'] });
      const poisonCard = getMove('poison-sting');

      expect(checkPoisonPoint(attacker, poisonCard, 0)).toBe(false);
    });
  });
});
