import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestCombatant,
  addStatus,
  resetTestIds,
} from './test-helpers';
import {
  applyCardDamage,
  applyBypassDamage,
  applyHeal,
  hasSTAB,
  STAB_BONUS,
} from './damage';

describe('Damage System', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('hasSTAB', () => {
    it('returns true when combatant type matches move type', () => {
      const combatant = createTestCombatant({ types: ['fire'] });
      expect(hasSTAB(combatant, 'fire')).toBe(true);
    });

    it('returns false when types do not match', () => {
      const combatant = createTestCombatant({ types: ['water'] });
      expect(hasSTAB(combatant, 'fire')).toBe(false);
    });

    it('returns true for dual-type Pokemon matching either type', () => {
      const combatant = createTestCombatant({ types: ['fire', 'flying'] });
      expect(hasSTAB(combatant, 'fire')).toBe(true);
      expect(hasSTAB(combatant, 'flying')).toBe(true);
      expect(hasSTAB(combatant, 'water')).toBe(false);
    });
  });

  describe('applyCardDamage', () => {
    it('deals base damage to HP when no modifiers', () => {
      const source = createTestCombatant({ types: ['normal'] });
      const target = createTestCombatant({ hp: 100 });

      const result = applyCardDamage(source, target, 10);

      expect(result.hpDamage).toBe(10);
      expect(target.hp).toBe(90);
    });

    it('adds STAB bonus when type matches', () => {
      const source = createTestCombatant({ types: ['fire'] });
      const target = createTestCombatant({ hp: 100 });

      const result = applyCardDamage(source, target, 10, 'fire');

      expect(result.stab).toBe(STAB_BONUS);
      expect(result.hpDamage).toBe(10 + STAB_BONUS);
    });

    it('no STAB for typeless attacks', () => {
      const source = createTestCombatant({ types: ['fire'] });
      const target = createTestCombatant({ hp: 100 });

      const result = applyCardDamage(source, target, 10); // No move type

      expect(result.stab).toBe(0);
    });

    describe('Strength', () => {
      it('adds Strength stacks to damage', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });
        addStatus(source, 'strength', 5);

        const result = applyCardDamage(source, target, 10);

        expect(result.strength).toBe(5);
        expect(result.hpDamage).toBe(15);
      });
    });

    describe('Enfeeble', () => {
      it('reduces damage by Enfeeble stacks', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });
        addStatus(source, 'enfeeble', 3);

        const result = applyCardDamage(source, target, 10);

        expect(result.enfeeble).toBe(3);
        expect(result.hpDamage).toBe(7);
      });

      it('damage floors at 1 (cannot be reduced below 1 by enfeeble)', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });
        addStatus(source, 'enfeeble', 20);

        const result = applyCardDamage(source, target, 5);

        expect(result.rawDamage).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Block', () => {
      it('reduces damage by Block amount', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100, block: 5 });

        const result = applyCardDamage(source, target, 10);

        expect(result.blockedAmount).toBe(5);
        expect(result.hpDamage).toBe(5);
        expect(target.block).toBe(0);
      });

      it('block absorbs full damage if higher than damage', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100, block: 20 });

        const result = applyCardDamage(source, target, 10);

        expect(result.blockedAmount).toBe(10);
        expect(result.hpDamage).toBe(0);
        expect(target.hp).toBe(100);
        expect(target.block).toBe(10); // 20 - 10
      });
    });

    describe('Evasion', () => {
      it('reduces damage before block', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });
        addStatus(target, 'evasion', 3);

        const result = applyCardDamage(source, target, 10);

        expect(result.evasion).toBe(3);
        expect(result.afterEvasion).toBe(7);
        expect(result.hpDamage).toBe(7);
      });

      it('can reduce damage to 0', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });
        addStatus(target, 'evasion', 15);

        const result = applyCardDamage(source, target, 10);

        expect(result.afterEvasion).toBe(0);
        expect(result.hpDamage).toBe(0);
      });
    });

    describe('Blaze Strike', () => {
      it('doubles damage when isBlazeStrike is true', () => {
        const source = createTestCombatant({ types: ['fire'] });
        const target = createTestCombatant({ hp: 100 });

        const result = applyCardDamage(source, target, 10, 'fire', { isBlazeStrike: true });

        expect(result.blazeStrikeMultiplier).toBe(2);
        // Base 10 + STAB 2 = 12, then x2 = 24
        expect(result.hpDamage).toBe(24);
      });
    });

    describe('Type Effectiveness', () => {
      it('applies super effective multiplier (1.25x)', () => {
        const source = createTestCombatant({ types: ['water'] });
        const target = createTestCombatant({ hp: 100 });

        const result = applyCardDamage(source, target, 10, 'water', { typeEffectiveness: 1.25 });

        expect(result.typeEffectiveness).toBe(1.25);
        // (10 + 2 STAB) * 1.25 = 15
        expect(result.hpDamage).toBe(15);
      });

      it('applies not effective multiplier (0.75x)', () => {
        const source = createTestCombatant({ types: ['fire'] });
        const target = createTestCombatant({ hp: 100 });

        const result = applyCardDamage(source, target, 10, 'fire', { typeEffectiveness: 0.75 });

        expect(result.typeEffectiveness).toBe(0.75);
        // (10 + 2 STAB) * 0.75 = 9
        expect(result.hpDamage).toBe(9);
      });
    });

    describe('Thick Hide', () => {
      it('reduces damage by fixed amount', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 100 });

        const result = applyCardDamage(source, target, 10, undefined, { thickHideReduction: 2 });

        expect(result.thickHideReduction).toBe(2);
        expect(result.hpDamage).toBe(8);
      });
    });

    describe('Thick Fat', () => {
      it('reduces Fire/Ice damage by 25%', () => {
        const source = createTestCombatant({ types: ['fire'] });
        const target = createTestCombatant({ hp: 100 });

        const result = applyCardDamage(source, target, 12, 'fire', { thickFatMultiplier: 0.75 });

        expect(result.thickFatMultiplier).toBe(0.75);
        // (12 + 2 STAB) * 0.75 = 10.5 -> 10
        expect(result.hpDamage).toBe(10);
      });
    });

    describe('Death', () => {
      it('sets alive to false when HP reaches 0', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 10 });

        applyCardDamage(source, target, 15);

        expect(target.hp).toBe(0);
        expect(target.alive).toBe(false);
      });

      it('does not go below 0 HP', () => {
        const source = createTestCombatant();
        const target = createTestCombatant({ hp: 5 });

        const result = applyCardDamage(source, target, 100);

        expect(target.hp).toBe(0);
        expect(result.hpDamage).toBe(5); // Actual damage dealt
      });
    });
  });

  describe('applyBypassDamage', () => {
    it('deals direct HP damage (ignores block)', () => {
      const target = createTestCombatant({ hp: 50, block: 20 });

      const result = applyBypassDamage(target, 10);

      expect(result).toBe(10);
      expect(target.hp).toBe(40);
      expect(target.block).toBe(20); // Unchanged
    });

    it('can kill a combatant', () => {
      const target = createTestCombatant({ hp: 5 });

      applyBypassDamage(target, 10);

      expect(target.hp).toBe(0);
      expect(target.alive).toBe(false);
    });
  });

  describe('applyHeal', () => {
    it('heals the specified amount', () => {
      const target = createTestCombatant({ hp: 50, maxHp: 100 });

      const healed = applyHeal(target, 20);

      expect(healed).toBe(20);
      expect(target.hp).toBe(70);
    });

    it('does not heal above maxHp', () => {
      const target = createTestCombatant({ hp: 90, maxHp: 100 });

      const healed = applyHeal(target, 20);

      expect(healed).toBe(10); // Only healed 10 to cap
      expect(target.hp).toBe(100);
    });

    it('returns 0 if already at max HP', () => {
      const target = createTestCombatant({ hp: 100, maxHp: 100 });

      const healed = applyHeal(target, 20);

      expect(healed).toBe(0);
    });
  });
});
