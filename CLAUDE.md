# Pokespire Development Guidelines

## Project Context

Pokespire is a Pokemon roguelike deckbuilder with deep mechanical complexity:
- Playable Pokemon with unique progression trees and evolution paths
- Passive abilities that hook into combat events (damage dealt, damage taken, turn start, etc.)
- Status effects, type effectiveness, positioning, turn order
- Cards with varied effects (damage, multi-hit, recoil, heal-on-hit, status application, and more)
- Passives that modify damage, redirect attacks, trigger chain reactions
- Multi-act campaign structure with maps, bosses, and scaling

**All of these systems are designed to expand.** New Pokemon, cards, passives, status effects, acts, and mechanics will be added over time. The codebase must accommodate this growth.

**The combinatorial complexity is high.** Any new mechanic interacts with dozens of existing systems.

---

## Core Principles

### 1. Pause Before Implementing

Before writing code, answer:
- Where does this logic belong? (engine vs UI vs data)
- What existing systems does this touch?
- What edge cases exist? (dead targets, status immunity, passive interactions)
- Will this be easy to extend later?
- Can this be tested in isolation?

If unsure, ask or propose alternatives before coding.

### 2. Separation of Concerns

```
src/
  data/       → Static definitions (pokemon.json, moves.json)
  engine/     → Pure game logic (no React, no side effects)
  run/        → Run/meta state management
  ui/         → React components (display only, minimal logic)
```

**The engine should be runnable without React.** If you can't unit test it without mounting components, the logic is in the wrong place.

### 3. Data-Driven Over Hard-Coded

Prefer:
```typescript
// In cards.json
{ "id": "fire-blast", "effects": [{ "type": "damage", "value": 40 }] }
```

Over:
```typescript
// Hard-coded in engine
if (card.id === 'fire-blast') { dealDamage(40); }
```

New cards, Pokemon, and passives should require minimal code changes.

### 4. Immutable State Updates

Always return new state objects, never mutate:
```typescript
// Good
return { ...state, hp: state.hp - damage };

// Bad
state.hp -= damage;
return state;
```

This enables: undo, replay, debugging, atomic actions, React optimization.

### 5. Explicit Over Clever

Prefer boring, readable code over clever one-liners:
```typescript
// Good - clear intent
const aliveEnemies = combatants.filter(c => c.side === 'enemy' && c.hp > 0);

// Bad - clever but obscure
const aliveEnemies = combatants.filter(c => c.side[0] === 'e' && c.hp);
```

### 6. Consider the Passive Problem

Every damage, heal, status, or state change might trigger a passive. Ask:
- Does this go through the standard damage pipeline?
- Should passives be able to modify/block this?
- What happens if this triggers another passive?
- What's the order of operations?

### 7. Type Safety as Documentation

Use TypeScript strictly:
```typescript
// Good - self-documenting, catches errors
type DamageSource = 'attack' | 'recoil' | 'status' | 'passive';
function dealDamage(target: Combatant, amount: number, source: DamageSource)

// Bad - stringly typed, error-prone
function dealDamage(target: any, amount: number, source: string)
```

### 8. Test the Weird Cases

When implementing a feature, think about:
- What if the target is already dead?
- What if the user has 0 energy?
- What if a passive triggers during another passive?
- What if there are no valid targets?
- What if this status is already applied?

---

## Anti-Patterns to Avoid

### Don't: Add special cases in the wrong layer
```typescript
// Bad - UI shouldn't know about Sheer Force
if (attacker.passives.includes('sheer_force')) {
  showDamageNumber(damage * 1.3);
}
```

### Don't: Duplicate state
```typescript
// Bad - now we have two sources of truth
combatant.currentHp = 50;
combatant.hpPercent = 0.5;
```

### Don't: Mix concerns in one function
```typescript
// Bad - does three unrelated things
function endTurn() {
  applyPoisonDamage();
  drawCards();
  updateUIAnimations();
  saveToLocalStorage();
}
```

### Don't: Assume happy path only
```typescript
// Bad - what if target is null? What if move doesn't exist?
const damage = MOVES[cardId].effects[0].value;
target.hp -= damage;
```

---

## Before Submitting Code

Checklist:
- [ ] Logic is in the right layer (engine vs UI)
- [ ] State updates are immutable
- [ ] Edge cases are handled
- [ ] Types are specific, not `any`
- [ ] New mechanics go through existing pipelines (damage, status, etc.)
- [ ] Could write a unit test for this without React

---

## When in Doubt

Ask: "If we add 50 more cards and 20 more passives, will this approach still work?"

If the answer is "we'd need to add 50 more if-statements," reconsider the design.
