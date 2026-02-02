- You are building a **Pokemon-themed deckbuilder + roguelike prototype** based on a detailed game design.  
- Your job is to translate the **domain / game design** into code; any missing technical details (schema shapes, function names, etc.) are up to you.

---

### 1. Overall architecture (must-haves)

- Build this as a **single-page web app** that can be shipped as **static files** (HTML/CSS/JS) and run without a backend.
- Use a modern frontend stack with:
  - A **build system** (we want Vite) so we can bundle into a static SPA.
  - A **component-based UI** (we want React).
- Structure the code in **three layers** that are clearly separated:
  1. **Config layer**  
     - Holds all content and tuning knobs:
       - Cards
       - Pokémon (playable and enemies)
       - Encounters
       - Campaign map
       - Level/evolution breakpoints
     - This should be **data/config**, not hard-coded game rules.
  2. **Game engine (headless) layer**  
     - Implements the rules of:
       - How cards resolve
       - How turns and rounds work
       - How battles are won/lost
       - How status effects behave
       - How the campaign map is traversed
     - Must work **without any UI** (no DOM access).
     - Given a game state and an action, it should produce a new game state.
  3. **UI layer**  
     - React components that:
       - Render the current game and combat state.
       - Let players choose cards, targets, and paths.
       - Display health, mana, statuses, and the map.
     - UI should talk only to the engine via well-defined actions.

- The engine must be **testable headless**:
  - We want to be able to simulate combats and campaign runs purely in code.
  - This includes random choices (e.g., events), which should be manageable (e.g., via seeding or clear control points) so we can test.

---

### 2. Game concepts to support

Design your data structures and logic to express these concepts cleanly from the domain perspective.

#### 2.1. Campaign structure

- There is **one campaign** for the prototype, themed around a **Team Rocket lab** where **Mewtwo** has escaped and is wreaking havoc.
- The campaign is laid out as a **map of nodes connected by paths**, similar to Slay the Spire:
  - Each **node** is one of:
    - A **regular battle**
    - An **event**
    - A **boss battle**
  - Nodes are connected into **branches** that sometimes split and then converge.
- For this campaign:
  - There are **two acts**:
    - **Act 1**: inside the Team Rocket lab, leading to **Giovanni** as a boss.
    - **Act 2**: path toward **Mewtwo** as the final boss.
  - The map has:
    - A starting node.
    - A first branching choice among **three different regular battles**.
    - A convergence into a node where the player’s Pokémon **evolve for the first time**.
    - A **Giovanni boss battle**.
    - Another convergence and then a branch into **three different clone battles** (Venusaur, Charizard, or Blastoise clone teams).
    - A convergence into the final **Mewtwo boss battle**.
- When the player **loses any battle**, the **run ends** and the player restarts from the beginning.

#### 2.2. Party and playable Pokémon

- The player party is made up of **up to four Pokémon**, corresponding to the four Kanto starters:
  - **Bulbasaur line**: Bulbasaur → Ivysaur → Venusaur  
    - Identity: poison, healing, support.
  - **Squirtle line**: Squirtle → Wartortle → Blastoise  
    - Identity: tank, team defense, freezing.
  - **Charmander line**: Charmander → Charmeleon → Charizard  
    - Identity: high damage, burn, some AoE.
  - **Pikachu line**: Pikachu → Raichu  
    - Identity: high damage, paralyze, strong single-target.
- The prototype is **couch co-op**:
  - One device.
  - 1–4 players.
  - Each player chooses a name and is assigned one starter Pokémon to control.
- Each Pokémon needs:
  - Health
  - Mana
  - Speed (for turn order)
  - A deck of cards
  - A place to track temporary combat state (current HP, current mana, statuses, etc.).

#### 2.3. Evolutions and progression

- Across the campaign, Pokémon **gain experience** and **evolve** at fixed story beats:
  - After the **first regular battle**:
    - Bulbasaur → Ivysaur
    - Squirtle → Wartortle
    - Charmander → Charmeleon
    - Pikachu remains Pikachu.
  - After the **clone battle** (before Mewtwo):
    - Ivysaur → Venusaur
    - Wartortle → Blastoise
    - Charmeleon → Charizard
    - Pikachu → Raichu.
- When a Pokémon evolves:
  - Its **maximum health** increases.
  - Its **identity and deck** can change (e.g., stronger versions of moves, maybe new cards).
- For the prototype, you can treat **leveling / EXP** in the simplest way that supports:
  - “After node X, evolve this Pokémon line.”
  - We do not need a fully general XP system yet; we just need the evolution checkpoints to happen reliably.

#### 2.4. Battles and turn structure

- Battles are **turn-based** and involve:
  - The **player party** on the left side.
  - The **enemy party** on the right side.
- A battle proceeds in **rounds**:
  - Each round contains **exactly one turn per Pokémon** that is still alive (player or enemy).
  - The order within a round is determined by **speed** (highest speed acts first).
  - Within one round, **no Pokémon can take more than one turn**; even if you later add speed changes, a character can’t “lap” another and act twice before everyone has acted once.
- On a Pokémon’s turn:
  - If it is a **player Pokémon**:
    - The controlling player can **play cards from that Pokémon’s hand**, in any order, **until they choose to end their turn or they cannot pay the mana costs**.
  - If it is an **enemy Pokémon**:
    - The game engine chooses which card or action they use (you can start with simple AI).
  - After they finish playing cards:
    - End-of-turn effects occur (status damage and decay, etc.).
- The battle ends when:
  - All enemies are knocked out → **victory**.
  - All player Pokémon are knocked out → **defeat** (run ends).

#### 2.5. Decks, hands, and mana

- Each Pokémon has its own **deck of cards**.
- Basic behavior:
  - Cards are drawn from the deck into a **hand**.
  - When a card is played, it goes to a **discard pile**.
  - When the deck is empty and a draw is needed, the discard pile is **shuffled** into a new deck.
  - We do not reshuffle in the middle of a drawless turn; reshuffling happens when a draw is attempted and the deck is empty.
- Each Pokémon’s deck for the prototype has **about 10 cards** with a small number of **distinct cards** so players can learn them quickly.
- **Mana**:
  - Each Pokémon has:
    - A **current mana** amount.
    - A **mana regeneration per turn**.
    - A **maximum mana** cap.
  - At the start of that Pokémon’s turn:
    - It regenerates mana by its regen amount, up to the cap.
  - Mana **carries over between turns** (not reset), but can never exceed the maximum.

#### 2.6. Cards and effects

- Every card has:
  - A **mana cost**.
  - A **name**.
  - An **owner Pokémon line** (e.g., belongs to Bulbasaur line).
  - A **description of its effect(s)**.
- Card effects in this prototype can include:
  - **Damage**:
    - To a single enemy.
    - To all enemies.
  - **Healing**:
    - To a single ally.
    - To all allies.
  - **Block / temporary defense**:
    - Reduces incoming damage this round.
    - Resets after the round or after that Pokémon’s next turn.
  - **Status effects**:
    - Poison
    - Burn
    - Paralyze
    - Freeze
  - **Buffs**:
    - Attack up (increases damage done).
    - (Defense up is optional; block itself is the main defensive mechanism.)
- Status effects:
  - Each status is **stackable** (you can have multiple stacks).
  - At the **end of that Pokémon’s turn**, for each stack-based debuff (poison, burn, paralyze, freeze):
    - The Pokémon takes damage equal to the number of stacks.
    - The stack count decreases by 1 (down to zero).
  - **Attack up**:
    - Each stack increases the damage that Pokémon’s attacks deal (e.g., +1 damage per stack).
    - Attack up **does not decay** automatically and persists for the fight.
- For the prototype, **we are not using Pokémon type advantages** (no “super effective” or “resisted” logic). All differentiation comes from:
  - Deck composition.
  - Status effects.
  - Speed, health, and mana values.

#### 2.7. Specific starter deck identities

Each playable Pokémon starts with a **10-card deck**. Effects and names should match below; the exact schema is up to you.

---

**Bulbasaur line (poison and heal)**

- Total: 10 cards  
- Cards:
  - 4 × **Vine Whip**  
    - Cost: 1 mana  
    - Effect: Deal 6 damage to a single enemy.
  - 4 × **Defend**  
    - Cost: 1 mana  
    - Effect: Give 5 block to self (for the current round).
  - 2 × **Poison Powder**  
    - Cost: 2 mana  
    - Effect: Apply 2 stacks of **poison** to a single enemy.  
    - Poison: At the end of that enemy’s turn, they take damage equal to their poison stacks, then poison stacks are reduced by 1 (to a minimum of 0).
  - 2 × **Heal**  
    - Cost: 2 mana  
    - Effect: Heal 10 HP on a chosen ally (single target).

---

**Squirtle line (tank, team defense, freeze)**

- Total: 10 cards  
- Cards:
  - 4 × **Water Gun**  
    - Cost: 1 mana  
    - Effect: Deal 6 damage to a single enemy.
  - 2 × **Shell Guard** (self-defend)  
    - Cost: 1 mana  
    - Effect: Give 5 block to self.
  - 2 × **Wide Guard** (team-defend)  
    - Cost: 2 mana  
    - Effect: Give 5 block to **all allies**.
  - 2 × **Ice Beam**  
    - Cost: 2 mana  
    - Effect: Apply 2 stacks of **freeze** to a single enemy.  
    - Freeze: Same structure as poison/burn/paralyze (damage equal to stacks at end of turn, then stacks–1).

---

**Charmander line (AoE damage and burn)**

- Total: 10 cards  
- Cards:
  - 4 × **Ember**  
    - Cost: 1 mana  
    - Effect: Deal 6 damage to a single enemy.
  - 4 × **Defend**  
    - Cost: 1 mana  
    - Effect: Give 5 block to self.
  - 2 × **Burn**  
    - Cost: 2 mana  
    - Effect: Apply 2 stacks of **burn** to a single enemy.  
    - Burn: Same behavior as poison (damage = stacks at end of turn, then stacks–1).
  - 2 × **Flamethrower**  
    - Cost: 2 mana  
    - Effect: Deal 6 damage to **all enemies**.

---

**Pikachu line (single-target burst and paralyze)**

- Total: 10 cards  
- Cards:
  - 4 × **Thundershock**  
    - Cost: 1 mana  
    - Effect: Deal 6 damage to a single enemy.
  - 4 × **Defend**  
    - Cost: 1 mana  
    - Effect: Give 5 block to self.
  - 2 × **Thunder Wave**  
    - Cost: 2 mana  
    - Effect: Apply 2 stacks of **paralyze** to a single enemy.  
    - Paralyze: Same decay/damage behavior as poison and burn.
  - 2 × **Thunderbolt**  
    - Cost: 2 mana  
    - Effect: Deal 10 damage to a single enemy.

- For all four status types (poison, burn, freeze, paralyze), use the shared rule:  
  - At the end of the affected Pokémon’s turn, they take damage equal to the current stack count, then that stack count is reduced by 1 (to a minimum of 0).

#### 2.8. Enemy decision logic (prototype)

- On an enemy Pokémon’s turn:
  - Filter hand to **cards it can afford** with current mana.
  - **Priority order** of card types to play:
    1. Direct damage
    2. Status/debuff
    3. Defensive/other
  - **Targets**:
    - Single-target cards hit the **front-most alive player Pokémon**.
    - Multi-target cards are just used (no extra targeting logic).
  - Play cards in that priority order **greedily** until:
    - No affordable cards remain, or
    - The hand is empty.
  - Then end turn and resolve normal end-of-turn status effects.

- No team-wide coordination or advanced tactics; behavior is intentionally simple and predictable for this prototype.

---

### 3. Concrete encounters for the campaign

Use the campaign/map layer to express these battles and branches.

#### 3.1. First branch (Act 1)

After the intro, the party reaches a **three-way choice**; each path is a different themed battle:

- **Path A: Electric swarm**:
  - Enemies: 1 Magneton + 3 Magnemite.
- **Path B: Poison swarm**:
  - Enemies: 1 Muk + 1 Grimer + 2 Zubat.
- **Path C: Normal swarm**:
  - Enemies: 1 Raticate + 3 Rattata.

All three paths **converge** afterward.  

After winning one of these encounters, the party reaches a point where **each starter evolves into its second stage** (except Pikachu, which stays Pikachu).

#### 3.2. Giovanni boss (end of Act 1)

- A boss node where the enemies are:
  - Persian
  - Rhydon
  - Nidoqueen
  - Nidoking
- This should feel like a noticeable step up in difficulty compared to the first battles.

#### 3.3. Clone battles (Act 2 branch)

After defeating Giovanni and progressing, the party again chooses **one of three battles**, each featuring Mewtwo’s clones of the Kanto starters:

- **Venusaur clone team**:
  - Venusaur
  - Ivysaur
  - 2 × Bulbasaur
- **Charizard clone team**:
  - Charizard
  - Charmeleon
  - 2 × Charmander
- **Blastoise clone team**:
  - Blastoise
  - Wartortle
  - 2 × Squirtle

After defeating one of these clone teams, the party’s Pokémon **evolve to their final forms** (Ivysaur → Venusaur, Wartortle → Blastoise, Charmeleon → Charizard, Pikachu → Raichu).

#### 3.4. Final boss: Mewtwo

- The final node is a **boss battle vs Mewtwo**.
- For the prototype:
  - Mewtwo can be a single, very strong enemy:
    - High HP.
    - Strong attacks (including possibly an AoE).
- When Mewtwo is defeated, the **campaign ends in victory**.

---

### 4. UI behavior and screens (from the player’s point of view)

Design the UI to reflect these flows; the exact layout and styling is up to you.

#### 4.1. Start and setup

- **Intro screen**:
  - Very short description of the scenario (Mewtwo escaping the Team Rocket lab).
  - Button to start a new run.
- **Player setup screen**:
  - Let the user choose:
    - Number of players (1–4).
    - Each player’s name (short string).
- **Starter selection / assignment screen**:
  - Show the four starters.
  - Let each player pick which Pokémon they will control.
  - For the prototype, it’s fine if:
    - Either only those chosen Pokémon are used in combat, or
    - All four starters are always used, but only some are assigned to human players.
  - Make sure it’s clear which player controls which Pokémon.

#### 4.2. Map screen

- Represent the campaign as a **node graph**:
  - Show nodes for:
    - First branching encounters.
    - Evolve checkpoint.
    - Giovanni.
    - Clone battles.
    - Mewtwo.
  - Show lines for paths between them.
- Highlight:
  - The **current node**.
  - Available **next nodes** when a choice is present.
- When the party completes a battle:
  - The UI returns to the map and allows the player to choose the next path (if there is a branch).
- Show a small summary of the **party’s current state**:
  - Each Pokémon’s HP.
  - Maybe a simple icon for their evolution stage.

#### 4.3. Combat screen

- Layout should support these elements:
  - **Left side**:
    - The player Pokémon (up to four), each with:
      - Sprite (back-facing for allies).
      - Health bar.
      - Mana bar.
      - Small icons for statuses with stack numbers.
  - **Right side**:
    - Enemy Pokémon with:
      - Sprite (front-facing).
      - Health bar.
      - Status icons and stacks.
  - **Top**:
    - A visible **turn-order bar** showing:
      - All Pokémon in the current round, ordered by speed.
      - Which one is currently acting.
  - **Bottom center**:
    - The current acting Pokémon’s **hand of cards**:
      - Each card shows mana cost, a simple art/icon, its name, and effect text.
    - A way to:
      - Select a card.
      - Select a target (where applicable).
      - Play the card.
      - End the turn.
  - **Bottom left**:
    - Indication of:
      - How many cards remain in the current deck.
      - How many are in the discard pile.
- As the player plays cards:
  - Update mana, HP, block, status icons, and enemy HP.
  - Once they end the turn, move to the next combatant in turn order.

For enemy sprites (front-facing), the image source structure is like this (replace charizard with Pokemon name, all lowercase):

https://img.pokemondb.net/sprites/black-white/anim/normal/charizard.gif

And for allie (back-facing), the image source structure is like this:

https://img.pokemondb.net/sprites/black-white/anim/back-normal/charizard.gif

#### 4.4. End-of-battle and end-of-run

- After a **victory**:
  - Show a simple summary:
    - Battle won.
    - Any evolutions that just happened.
  - Button to **continue** back to the map.
- After defeating **Mewtwo**:
  - Show a **final victory screen** explaining that the player has stopped Mewtwo.
- After a **defeat**:
  - Show a defeat screen.
  - Let the player return to the main menu and optionally start a new run.

---

### 5. Testing expectations (engine behavior)

- The **engine layer** should allow us to:
  - Simulate:
    - A single battle start-to-finish with predetermined actions.
    - A short campaign path (e.g., first branch → evolve → Giovanni).
  - Check:
    - That decks deplete and reshuffle correctly.
    - That statuses:
      - Apply correctly.
      - Stack correctly.
      - Deal damage and decay as described.
    - That mana:
      - Regenerates each turn.
      - Never exceeds the cap.
    - That the turn order:
      - Always gives each alive combatant exactly one turn per round.
- Please design the engine API in a way that makes these tests natural, using the domain concepts above (states, actions, battles, nodes), and choose the specific technical shapes as you see fit.

---

Use this as your **domain-level spec**. Wherever the specification does not pin down a technical detail (field names, exact schemas, helpers, component boundaries, etc.), you are expected to design and implement that yourself, as long as it faithfully represents the behavior and concepts described here.