import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestCombatant,
  createTestCombatState,
  addStatus,
  resetTestIds,
} from './test-helpers';
import {
  getStatusStacks,
  applyStatus,
  getEffectiveSpeed,
  processRoundBoundary,
  checkStatusImmunity,
} from './status';
import { startTurn } from './turns';

describe('Status Effects', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('getStatusStacks', () => {
    it('returns 0 when combatant has no statuses', () => {
      const combatant = createTestCombatant();
      expect(getStatusStacks(combatant, 'burn')).toBe(0);
    });

    it('returns correct stack count', () => {
      const combatant = createTestCombatant();
      addStatus(combatant, 'burn', 3);
      expect(getStatusStacks(combatant, 'burn')).toBe(3);
    });
  });

  describe('applyStatus', () => {
    it('adds new status when not present', () => {
      const combatant = createTestCombatant();
      const state = createTestCombatState([combatant]);

      applyStatus(state, combatant, 'burn', 2);

      expect(getStatusStacks(combatant, 'burn')).toBe(2);
    });

    it('stacks additively when status already present', () => {
      const combatant = createTestCombatant();
      const state = createTestCombatState([combatant]);

      applyStatus(state, combatant, 'burn', 2);
      applyStatus(state, combatant, 'burn', 3);

      expect(getStatusStacks(combatant, 'burn')).toBe(5);
    });

    it('tracks source ID for leech', () => {
      const attacker = createTestCombatant({ id: 'attacker', side: 'player' });
      const target = createTestCombatant({ id: 'target', side: 'enemy' });
      const state = createTestCombatState([attacker, target]);

      applyStatus(state, target, 'leech', 3, 'attacker');

      const leechStatus = target.statuses.find(s => s.type === 'leech');
      expect(leechStatus?.sourceId).toBe('attacker');
    });
  });

  describe('Status Immunity', () => {
    it('Immunity passive blocks poison', () => {
      const combatant = createTestCombatant({ passiveIds: ['immunity'] });

      expect(checkStatusImmunity(combatant, 'poison')).toBe(true);
    });

    it('Immunity does not block burn', () => {
      const combatant = createTestCombatant({ passiveIds: ['immunity'] });

      expect(checkStatusImmunity(combatant, 'burn')).toBe(false);
    });

    it('Immunity does not block paralysis', () => {
      const combatant = createTestCombatant({ passiveIds: ['immunity'] });

      expect(checkStatusImmunity(combatant, 'paralysis')).toBe(false);
    });

    it('applyStatus respects immunity', () => {
      const combatant = createTestCombatant({ passiveIds: ['immunity'] });
      const state = createTestCombatState([combatant]);

      const result = applyStatus(state, combatant, 'poison', 5);

      expect(result.applied).toBe(false);
      expect(getStatusStacks(combatant, 'poison')).toBe(0);
    });
  });

  describe('getEffectiveSpeed', () => {
    it('returns base speed with no modifiers', () => {
      const combatant = createTestCombatant({ speed: 50 });

      expect(getEffectiveSpeed(combatant)).toBe(50);
    });

    it('reduces speed with paralysis', () => {
      const combatant = createTestCombatant({ speed: 50 });
      addStatus(combatant, 'paralysis', 10);

      expect(getEffectiveSpeed(combatant)).toBe(40);
    });

    it('reduces speed with slow', () => {
      const combatant = createTestCombatant({ speed: 50 });
      addStatus(combatant, 'slow', 15);

      expect(getEffectiveSpeed(combatant)).toBe(35);
    });

    it('increases speed with haste', () => {
      const combatant = createTestCombatant({ speed: 50 });
      addStatus(combatant, 'haste', 20);

      expect(getEffectiveSpeed(combatant)).toBe(70);
    });

    it('combines multiple speed modifiers', () => {
      const combatant = createTestCombatant({ speed: 50 });
      addStatus(combatant, 'haste', 10);
      addStatus(combatant, 'paralysis', 5);
      addStatus(combatant, 'slow', 3);

      // 50 + 10 - 5 - 3 = 52
      expect(getEffectiveSpeed(combatant)).toBe(52);
    });

    it('floors speed at 0', () => {
      const combatant = createTestCombatant({ speed: 10 });
      addStatus(combatant, 'paralysis', 50);

      expect(getEffectiveSpeed(combatant)).toBe(0);
    });
  });

  describe('processRoundBoundary', () => {
    describe('Burn', () => {
      it('deals damage equal to stacks', () => {
        const combatant = createTestCombatant({ hp: 50 });
        addStatus(combatant, 'burn', 3);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.hp).toBe(47); // 50 - 3
      });

      it('decays by 1 each round', () => {
        const combatant = createTestCombatant({ hp: 100 });
        addStatus(combatant, 'burn', 3);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'burn')).toBe(2);
      });

      it('removes burn when stacks reach 0', () => {
        const combatant = createTestCombatant({ hp: 100 });
        addStatus(combatant, 'burn', 1);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'burn')).toBe(0);
        expect(combatant.statuses.find(s => s.type === 'burn')).toBeUndefined();
      });

      it('can kill a combatant', () => {
        const combatant = createTestCombatant({ hp: 3 });
        addStatus(combatant, 'burn', 5);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.hp).toBe(0);
        expect(combatant.alive).toBe(false);
      });
    });

    describe('Poison', () => {
      it('deals damage equal to stacks', () => {
        const combatant = createTestCombatant({ hp: 50 });
        addStatus(combatant, 'poison', 2);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.hp).toBe(48); // 50 - 2
      });

      it('escalates by 1 each round (does not decay)', () => {
        const combatant = createTestCombatant({ hp: 100 });
        addStatus(combatant, 'poison', 2);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'poison')).toBe(3); // Escalated!
      });

      it('escalates and deals increasing damage over rounds', () => {
        const combatant = createTestCombatant({ hp: 100 });
        addStatus(combatant, 'poison', 1);
        const state = createTestCombatState([combatant]);

        // Round 1: 1 damage, escalate to 2
        processRoundBoundary(state);
        expect(combatant.hp).toBe(99);
        expect(getStatusStacks(combatant, 'poison')).toBe(2);

        // Round 2: 2 damage, escalate to 3
        processRoundBoundary(state);
        expect(combatant.hp).toBe(97);
        expect(getStatusStacks(combatant, 'poison')).toBe(3);

        // Round 3: 3 damage, escalate to 4
        processRoundBoundary(state);
        expect(combatant.hp).toBe(94);
        expect(getStatusStacks(combatant, 'poison')).toBe(4);
      });
    });

    describe('Leech', () => {
      it('deals damage equal to stacks', () => {
        const target = createTestCombatant({ id: 'target', hp: 50, side: 'enemy' });
        addStatus(target, 'leech', 4);
        const state = createTestCombatState([target]);

        processRoundBoundary(state);

        expect(target.hp).toBe(46); // 50 - 4
      });

      it('heals the source combatant', () => {
        const source = createTestCombatant({ id: 'source', hp: 50, maxHp: 100, side: 'player' });
        const target = createTestCombatant({ id: 'target', hp: 50, side: 'enemy' });
        addStatus(target, 'leech', 4, 'source');
        const state = createTestCombatState([source, target]);

        processRoundBoundary(state);

        expect(source.hp).toBe(54); // 50 + 4
      });

      it('decays by 1 each round', () => {
        const target = createTestCombatant({ hp: 100 });
        addStatus(target, 'leech', 3);
        const state = createTestCombatState([target]);

        processRoundBoundary(state);

        expect(getStatusStacks(target, 'leech')).toBe(2);
      });

      it('removes leech when stacks reach 0', () => {
        const target = createTestCombatant({ hp: 100 });
        addStatus(target, 'leech', 1);
        const state = createTestCombatState([target]);

        processRoundBoundary(state);

        expect(getStatusStacks(target, 'leech')).toBe(0);
      });

      it('does not overheal past maxHp', () => {
        const source = createTestCombatant({ id: 'source', hp: 98, maxHp: 100, side: 'player' });
        const target = createTestCombatant({ id: 'target', hp: 50, side: 'enemy' });
        addStatus(target, 'leech', 10, 'source');
        const state = createTestCombatState([source, target]);

        processRoundBoundary(state);

        expect(source.hp).toBe(100); // Capped at maxHp
      });
    });

    describe('Block Reset', () => {
      it('resets block to 0 at end of round', () => {
        const combatant = createTestCombatant({ block: 15 });
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.block).toBe(0);
      });

      it('Pressure Hull retains 50% block', () => {
        const combatant = createTestCombatant({ block: 20, passiveIds: ['pressure_hull'] });
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.block).toBe(10); // 50% of 20
      });

      it('Pressure Hull rounds down', () => {
        const combatant = createTestCombatant({ block: 15, passiveIds: ['pressure_hull'] });
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(combatant.block).toBe(7); // floor(15 * 0.5)
      });
    });

    describe('Sleep Decay', () => {
      it('sleep decays by 1 each round', () => {
        const combatant = createTestCombatant();
        addStatus(combatant, 'sleep', 3);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'sleep')).toBe(2);
      });

      it('removes sleep when stacks reach 0', () => {
        const combatant = createTestCombatant();
        addStatus(combatant, 'sleep', 1);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'sleep')).toBe(0);
        expect(combatant.statuses.find(s => s.type === 'sleep')).toBeUndefined();
      });

      it('sleep stacks additively (extends duration)', () => {
        const combatant = createTestCombatant();
        const state = createTestCombatState([combatant]);

        applyStatus(state, combatant, 'sleep', 2);
        applyStatus(state, combatant, 'sleep', 3);

        expect(getStatusStacks(combatant, 'sleep')).toBe(5);
      });
    });

    describe('Status Decay', () => {
      it('paralysis decays by 1', () => {
        const combatant = createTestCombatant();
        addStatus(combatant, 'paralysis', 3);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'paralysis')).toBe(2);
      });

      it('strength decays by 1', () => {
        const combatant = createTestCombatant();
        addStatus(combatant, 'strength', 5);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'strength')).toBe(4);
      });

      it('haste decays by 1', () => {
        const combatant = createTestCombatant();
        addStatus(combatant, 'haste', 2);
        const state = createTestCombatState([combatant]);

        processRoundBoundary(state);

        expect(getStatusStacks(combatant, 'haste')).toBe(1);
      });
    });
  });

  describe('Sleep Energy Reduction (via startTurn)', () => {
    it('reduces energy gain by 1 when sleeping', () => {
      const combatant = createTestCombatant();
      combatant.energy = 0;
      combatant.energyPerTurn = 3;
      addStatus(combatant, 'sleep', 2);
      const state = createTestCombatState([combatant]);

      startTurn(state);

      // Should gain 2 energy (3 - 1), not 1 (3 - 2)
      expect(combatant.energy).toBe(2);
    });

    it('reduces energy by exactly 1 regardless of sleep stacks', () => {
      const combatant = createTestCombatant();
      combatant.energy = 0;
      combatant.energyPerTurn = 3;
      addStatus(combatant, 'sleep', 5);
      const state = createTestCombatState([combatant]);

      startTurn(state);

      // 5 stacks should still only reduce by 1
      expect(combatant.energy).toBe(2);
    });

    it('does not reduce energy when not sleeping', () => {
      const combatant = createTestCombatant();
      combatant.energy = 0;
      combatant.energyPerTurn = 3;
      const state = createTestCombatState([combatant]);

      startTurn(state);

      expect(combatant.energy).toBe(3);
    });

    it('energy gain floors at 0 when energyPerTurn is 1', () => {
      const combatant = createTestCombatant();
      combatant.energy = 0;
      combatant.energyPerTurn = 1;
      addStatus(combatant, 'sleep', 2);
      const state = createTestCombatState([combatant]);

      startTurn(state);

      // 1 - 1 = 0, not negative
      expect(combatant.energy).toBe(0);
    });

    it('sleep lasts for stacks turns then expires', () => {
      const combatant = createTestCombatant();
      combatant.energy = 0;
      combatant.energyPerTurn = 3;
      addStatus(combatant, 'sleep', 2);
      const state = createTestCombatState([combatant]);

      // Turn 1: sleeping (2 stacks), gain 2 energy
      startTurn(state);
      expect(combatant.energy).toBe(2);

      // Round boundary: sleep decays 2 -> 1
      processRoundBoundary(state);
      expect(getStatusStacks(combatant, 'sleep')).toBe(1);

      // Turn 2: still sleeping (1 stack), gain 2 energy
      combatant.energy = 0;
      state.currentTurnIndex = 0;
      state.turnOrder[0].hasActed = false;
      startTurn(state);
      expect(combatant.energy).toBe(2);

      // Round boundary: sleep decays 1 -> 0, expires
      processRoundBoundary(state);
      expect(getStatusStacks(combatant, 'sleep')).toBe(0);

      // Turn 3: no longer sleeping, gain full 3 energy
      combatant.energy = 0;
      state.currentTurnIndex = 0;
      state.turnOrder[0].hasActed = false;
      startTurn(state);
      expect(combatant.energy).toBe(3);
    });
  });
});
