# Pokespire - Current State & Roadmap

**Last Updated:** 2026-02-05

---

## Overview

**Pokespire** is a tactical deck-building roguelike combining Pokemon with Slay the Spire mechanics. Players control a party of up to 4 Pokemon, battle enemies using card-based combat, and progress through leveling and evolution systems.

**Core Pillars:**
- Turn-based tactical combat with grid positioning (front/back rows)
- Card-based moves played from hand using energy
- Progression system with leveling, evolution, and stacking passive abilities
- Status effects creating diverse strategic interactions
- Passive ability synergies rewarding playstyle choices

---

## Technical Architecture

### Delivery Format
- Single-page web app
- Ships as **static files (HTML/CSS/JS)** - no backend required, can be hosted anywhere (like GitHub Pages)
- Built with **Vite + React + TypeScript**

### Three-Layer Separation

The codebase is organized into three distinct layers:

#### 1. Config Layer (Data)
All tunable content - Pokemon stats, moves, decks, enemies, encounters, campaign map. Lives in JSON files. Easy to modify without touching game logic.

#### 2. Game Engine (Logic)
Pure game rules with no visuals. Handles turn order, damage calculation, status effects, positioning. Given a game state and an action, produces the new game state. Fully testable.

#### 3. UI Layer (React)
Renders the current game state, handles player input (card selection, targeting, map navigation). Communicates with the engine through well-defined actions.

---

# CURRENT STATE (What's Built)

## Combat System - COMPLETE

### Turn Structure
Each combatant's turn:
1. **Status Ticks** - Burn deals damage (decays by 1), Paralysis decays
2. **Sleep Check** - If asleep, skip turn
3. **Gain Energy** - Add `energyPerTurn` (capped at `energyCap`)
4. **Draw Cards** - Draw to hand size (typically 5)
5. **Play Cards** - Spend energy to play moves (repeatable)
6. **Discard Hand** - Remaining cards go to discard pile
7. **End-of-Turn** - Poison deals damage (escalates by 1)

### Turn Order
Sorted by:
1. **Effective Speed** (base speed minus Paralysis/Slow) - highest goes first
2. **Side** (tiebreaker) - Player before enemy
3. **Slot** (tiebreaker) - Player: rightmost first; Enemy: leftmost first

When speed-affecting status is applied mid-round, turn order recalculates for remaining combatants.

### Round Boundary
After all combatants act:
- Leech ticks (damage to target, heal to source, decay by 2)
- Block resets to 0 (Pressure Hull retains 50%)
- Slow duration decrements
- Enfeeble removed

---

## Damage Calculation - COMPLETE

**Full Formula (in order):**
```
1. rawDamage = baseDamage + Strength + STAB - Enfeeble
2. Floor at 1
3. Apply passive bonuses (Bastion Barrage, Counter-Current)
4. Apply Blaze Strike multiplier (x2 if triggered)
5. Subtract defensive passives (Blooming Cycle, Static Field)
6. Subtract Evasion
7. Apply to Block first, remainder to HP
```

| Modifier | Source | Effect |
|----------|--------|--------|
| Strength | Status | +1 damage per stack |
| Enfeeble | Status | -1 damage per stack |
| STAB | Type match | +2 if move type matches Pokemon type |
| Blaze Strike | Passive | x2 on first Fire attack per turn |
| Bastion Barrage | Passive | +floor(Block x 0.25) on Water attacks |
| Counter-Current | Passive | +floor((yourSpeed - theirSpeed) / 2) vs slower enemies |
| Blooming Cycle | Passive | -floor(leechStacks / 2) from enemies with Leech |
| Static Field | Passive | -floor((yourSpeed - theirSpeed) / 2) from slower enemies |
| Evasion | Status | -1 damage per stack |

---

## Status Effects - COMPLETE

| Status | Stacking | Decay | Effect |
|--------|----------|-------|--------|
| **Burn** | Additive | Turn start (-1) | Deals stacks damage at turn start |
| **Poison** | Additive | Never (escalates +1) | Deals stacks damage at turn end |
| **Paralysis** | Additive | Turn start (-1) | Reduces speed by stacks |
| **Slow** | Replace | Round end | Reduces speed by stacks for duration |
| **Enfeeble** | Replace | Round end (removed) | Reduces outgoing damage by stacks |
| **Leech** | Additive | Round end (-2) | Deals stacks damage, heals source |
| **Evasion** | Replace | Persistent | Reduces incoming damage by stacks |
| **Strength** | Additive | Persistent | Increases outgoing damage by stacks |
| **Sleep** | Additive | Turn start (-1) | Skips turn |

---

## Positioning System - COMPLETE

**Grid Layout:**
- 3 columns (0, 1, 2) per side
- 2 rows (front, back)
- Party size 1-3: front row only
- Party size 4-6: first 3 front, rest back

**Targeting Ranges:**
| Range | Description |
|-------|-------------|
| `self` | Self-targeting |
| `front_enemy` | Single target in front row |
| `back_enemy` | Single target in back row |
| `any_enemy` | Single target, either row |
| `front_row` | AoE: all front row enemies |
| `back_row` | AoE: all back row enemies |
| `any_row` | Player selects which row |
| `column` | Front target + same column behind |
| `all_enemies` | AoE: all enemies |

**Row Collapse:** When all front row Pokemon die, back row becomes the "effective front."

---

## Progression System - COMPLETE

Each Pokemon has 4 progression levels. Passives **stack** (not replaced) as you level up.

- **EXP Required:** 2 EXP per level
- **Level Up Grants:** Form evolution, Max HP boost (+10), new passives, new cards

### Charmander Line - "Inferno" (IMPLEMENTED)
**Theme:** Burn stacking and explosive damage

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Charmander | **Kindling** - Unblocked Fire attacks apply +1 Burn | - |
| 2 | Charmeleon | **Spreading Flames** - Burn spreads to adjacent enemies | Flamethrower |
| 3 | Charizard | **Blaze Strike** - First Fire attack each turn deals 2x damage | Fire Blast |
| 4 | Charizard | **Inferno Momentum** - Start of turn: reduce highest-cost card by 3 | - |

**Synergy:** Kindling applies Burn on Fire damage. Spreading Flames spreads it. Blaze Strike doubles first Fire attack. Inferno Momentum discounts your biggest Fire card.

### Squirtle Line - "Bastion" (IMPLEMENTED)
**Theme:** Defensive synergy with Block retention and Water attacks

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Squirtle | **Baby Shell** - Start of turn: gain 3 Block | - |
| 2 | Wartortle | **Pressure Hull** - End of turn: retain 50% Block | Bubble Beam |
| 3 | Blastoise | **Fortified Cannons** - Water attacks grant Block equal to half damage dealt | Hydro Pump |
| 4 | Blastoise | **Bastion Barrage** - Water attacks deal +25% of current Block as bonus damage | - |

**Synergy:** Baby Shell grants Block passively. Pressure Hull keeps it. Fortified Cannons gains more Block on attacks. Bastion Barrage turns all that Block into bonus damage.

### Bulbasaur Line - "Overgrowth" (IMPLEMENTED)
**Theme:** Leech-based healing and damage reduction

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Bulbasaur | **Baby Vines** - Unblocked Grass attacks apply +1 Leech | - |
| 2 | Ivysaur | **Spreading Spores** - Leech spreads to adjacent enemies | 2x Razor Leaf |
| 3 | Venusaur | **Overgrow** - Baby Vines now applies +2 Leech instead | Solar Beam |
| 4 | Venusaur | **Blooming Cycle** - Enemies with Leech deal reduced damage | - |

**Synergy:** Baby Vines applies Leech for sustain. Spreading Spores spreads it. Overgrow doubles application. Blooming Cycle makes leeched enemies weaker.

### Pikachu Line - "Static" (IMPLEMENTED)
**Theme:** Speed advantage for offense and defense, paralysis

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Pikachu | **Numbing Strike** - Unblocked Electric attacks apply +1 Paralysis | - |
| 2 | Pikachu | **Static Field** - Take reduced damage from slower enemies | - |
| 3 | Pikachu | **Counter-Current** - Deal bonus damage to slower enemies | - |
| 4 | Raichu | No new passive (speed -2, +20 HP) | Body Slam, Mega Punch, Thunder |

**Unique Design:** Pikachu doesn't evolve until level 4, gaining all three speed-based passives first. Raichu evolution is a tradeoff: sacrificing speed advantage for tankiness and powerful cards.

---

## Campaign Map - IMPLEMENTED (Act 1 Only)

### Current Structure (Prototype)
Single act with branching paths leading to Mewtwo as the final boss.

**Stages:**
- Stage 0: Spawn
- Stages 1-2: Easy battles (Rattata, Pidgey) + Rest
- Stage 3: Rest only
- Stages 4-5: Medium battles (Raticate, Pidgeotto, Arbok) + Rest
- Stage 6: Hard battles (Tauros, Pidgeot)
- Stage 7: Mini-boss choice (Snorlax or Kangaskhan) + Rest
- Stage 8: Final Boss (Mewtwo)

**Node Types:**
- **spawn** - Starting node, grants 1 EXP
- **battle** - Enemy encounter
- **rest** - Heal 30% HP or gain +10 Max HP

---

## Content Summary - IMPLEMENTED

### Playable Pokemon (4 starters)
| Pokemon | Types | HP | Speed | Starter Deck |
|---------|-------|-----|-------|--------------|
| Charmander | Fire | 30 | 6 | Scratch x3, Defend x2, Ember x2, Metal Claw, Smokescreen, Growl |
| Squirtle | Water | 38 | 4 | Tackle x3, Defend x2, Water Gun x2, Withdraw, Bubble, Tail Whip |
| Bulbasaur | Grass/Poison | 36 | 5 | Tackle x3, Defend x2, Vine Whip x2, Leech Seed, Growth, Poison Powder |
| Pikachu | Electric | 28 | 8 | Quick Attack x3, Defend x2, Thunder Shock x2, Thunder Wave, Double Team, Tail Whip |

### Enemy Pokemon (10+)
Rattata, Raticate, Pidgey, Pidgeotto, Pidgeot, Ekans, Arbok, Snorlax, Kangaskhan, Mewtwo, Tauros, Tentacool

### Move Pool
- **168 total moves** across 16 types
- Mix of damage, defense, status application, multi-hit, heal, utility
- Some "Vanish" cards removed permanently when played

---

## UI Screens - IMPLEMENTED

- **Main Menu** - Start Campaign, Sandbox mode, Card Dex
- **Party Select** - Choose 1-4 starters
- **Map Screen** - Navigate branching campaign nodes
- **Battle Screen** - Full combat with targeting, hand display, turn order, battle log
- **Rest Screen** - Choose between healing or max HP boost
- **Card Draft** - Post-battle card acquisition
- **Run Victory** - Campaign completion screen
- **Card Dex** - Browse all moves/cards

---

# DESIGN PHILOSOPHY

## Elemental Identity
Each starter has a distinct mechanical identity tied to their element:
- **Fire:** Aggressive burn damage over time
- **Water:** Defensive block accumulation
- **Grass:** Sustain through life drain
- **Electric:** Speed manipulation and advantage

## Passive Stacking
Unlike typical RPGs where abilities replace each other, Pokespire passives **stack**. A level 4 Pokemon has all 4 passives active simultaneously, creating powerful synergies.

## Meaningful Tradeoffs
Raichu's evolution exemplifies this - trading Pikachu's exceptional speed (and passive effectiveness) for raw stats and powerful cards.

## Difficulty Philosophy
- Game is intentionally overtuned for fresh saves
- Meta-progression gradually makes runs more achievable
- Similar to Hades/Across the Obelisk where early runs are expected to fail
- Victory becomes more consistent as players unlock Pokemon, build mastery, and spend currencies

---

# ROADMAP (Planned Features)

## Near-Term: Campaign Expansion

### Two-Act Structure (PLANNED)
- **Act 1:** Team Rocket Lab → **Giovanni boss**
- **Act 2:** Escape path → **Mewtwo final boss**

The current single-act prototype will expand to this full structure.

### Additional Node Types (PLANNED)
- **Event nodes** - Story encounters with choices
- **Recruitment nodes** - Find additional party members during runs
- **Boss unlock nodes** - Defeat to permanently unlock new Pokemon

---

## Near-Term: Additional Pokemon Lines

### Pidgey Line - "Tailwind" (DESIGNED)
**Theme:** Speed manipulation, AoE wind attacks

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Pidgey | **Gust Force** - Gust applies +1 Slow | - |
| 2 | Pidgeotto | **Whipping Winds** - Enemies with Slow take +1 damage from your attacks | Razor Wind |
| 3 | Pidgeot | **Hurricane** - Your row-targeting attacks hit ALL enemies instead | Gust, Gust |
| 4 | Pidgeot | **Slipstream** - Allies act immediately after you in turn order | - |

### Rattata Line - "Scrappy" (DESIGNED)
**Theme:** Multi-hit frenzy, reward for playing many cards

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Rattata | **Quick Feet** - Your first attack each turn costs 1 less | - |
| 2 | Rattata | **Relentless** - Each card you play this turn gives your next attack +1 damage | Fury Swipes |
| 3 | Raticate | **Super Fang** - Multi-hit attacks have each hit gain +1 damage | Hyper Fang, Double-Edge |
| 4 | Raticate | **Hustle** - Draw an extra card at start of turn. Your attacks deal +2 damage but cost +1 | - |

### Ekans Line - "Venomous" (DESIGNED)
**Theme:** Poison stacking, debuff on combat start

| Level | Form | Passive | Cards Added |
|-------|------|---------|-------------|
| 1 | Ekans | **Shed Skin** - At end of turn, remove 1 debuff from yourself | - |
| 2 | Ekans | **Poison Point** - Unblocked Poison attacks apply +1 Poison | Sludge |
| 3 | Arbok | **Intimidate** - Start of combat: apply Enfeeble 2 to all enemies | Toxic |
| 4 | Arbok | **Potent Venom** - Poison deals double damage when it ticks | - |

---

## Mid-Term: New Systems

### Held Items (PLANNED)
- Function like **relics** in Slay the Spire
- Examples: Leftovers, Scope Lens, Choice Band
- **Do not persist between runs**, but shape builds within a run
- Meta-unlock: Progress lets you find certain items earlier

### Colorless/Item Cards (PLANNED)
- Generic non-Pokemon cards (Potion, Energy boost, temporary buffs)
- Acquired from special events
- Similar to colorless cards in Slay the Spire

### Soft Type Weaknesses (PLANNED)
- Mild damage modifiers (e.g., Water takes 25% less from Fire)
- Goal: Encourage variety without making bad matchups run-ending
- NOT full main-series type dominance

---

## Long-Term: Meta-Progression

### Run Structure (PLANNED)
- Player starts each run by selecting ONE pokemon from their unlocked roster
- During the run, recruitment nodes let them add teammates from unlocked pool
- Progress through acts, fighting battles and collecting cards/items
- Optional boss nodes can be challenged to unlock new pokemon permanently

### Pokedex Completion / Coins (PLANNED)
- First time taking a pokemon to the final act awards coins
- Coins are one-time reward per pokemon, incentivizing trying everyone
- **Coins spent on:** Pre-run influence (weight recruitment, start with items)

### Mastery System (PLANNED)
- Each pokemon has individual mastery that accumulates as you use them
- Mastery unlocks a **SECOND skill tree** for that pokemon
- Two trees have distinct identities (e.g., offensive vs defensive)
- Players can mix and match upgrades from both trees
- Rewards depth without inflating raw power

### Dust/Essence Currency (PLANNED)
- Earned from completing runs, achievements
- **Spent on:** Permanent unlocks (new TMs in loot pool, new items, permanent perks)
- **Pool management:** Lock items OUT of the pool to prevent dilution

### Shiny Pokemon (PLANNED)
1. Appear very rarely as map encounters (shiny charm scales with pokedex completion)
2. Significantly harder fights than normal recruitment
3. Defeating a shiny permanently unlocks that shiny variant
4. Toggle between normal and shiny appearance anytime
5. Purely cosmetic - no mechanical differences

---

## Future Considerations

- Online multiplayer (requires backend)
- Daily/weekly challenge runs
- Additional generations/environments
- Legendary Pokemon as special unlocks

---

# Implementation Checklist

## COMPLETE
- [x] Core battle system with turn order
- [x] Damage calculation with all modifiers
- [x] 9 status effects with proper decay/escalation
- [x] 15 card effect types
- [x] 10 targeting ranges with row collapse
- [x] 16 passives across 4 Pokemon lines
- [x] 4 Pokemon with full progression trees
- [x] 168 moves in card pool
- [x] Act 1 campaign map with branching
- [x] Deck management (draw, discard, vanish, reshuffle)
- [x] Party select, map navigation, rest, card draft UI
- [x] Enemy AI system
- [x] Run state tracking and level-ups

## IN PROGRESS
- [ ] Balance pass on existing moves/encounters

## NOT STARTED
- [ ] Act 2 with Giovanni boss
- [ ] Event nodes
- [ ] Recruitment nodes
- [ ] Boss unlock nodes
- [ ] Pidgey/Rattata/Ekans progression trees
- [ ] Held items system
- [ ] Colorless/item cards
- [ ] Soft type weaknesses
- [ ] Pokedex tracking
- [ ] Coin currency
- [ ] Mastery system / second skill trees
- [ ] Dust/Essence currency
- [ ] Meta shop
- [ ] Shiny Pokemon system

---

## Asset References

**Enemy sprites (front-facing):**
`https://img.pokemondb.net/sprites/black-white/anim/normal/{pokemon}.gif`

**Ally sprites (back-facing):**
`https://img.pokemondb.net/sprites/black-white/anim/back-normal/{pokemon}.gif`

(Replace `{pokemon}` with lowercase name)

## Mini sprites for preview
https://img.pokemondb.net/sprites/sword-shield/normal/{pokemon}.png
(Replace `{pokemon}` with lowercase name)

## Sprite Scaling

Sprites are scaled based on Pokemon weight using cube root scaling (since weight ~ volume ~ size³).

**Reference:** Pikachu (6kg) = 80px sprite size

**To add a new Pokemon:**
1. Look up the weight in `docs/pokemon_height_weight.csv` (Weight in kgs column)
2. Add the Pokemon to `POKEMON_WEIGHTS` in `src/data/heights.ts`
3. Large Pokemon may need adjusted weights to prevent sprites from being too big (see Snorlax, Venusaur comments)

**Formula:** `spriteSize = 80 * Math.cbrt(weight / 6)`

Examples:
- Pikachu (6kg): 80px
- Rattata (3.5kg): 71px
- Snorlax (150kg adjusted): 232px
- Mewtwo (122kg): 219px
