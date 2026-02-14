// ============================================================
// Battle Engine Types — Single source of truth
// ============================================================

// --- Positioning ---

export type Row = 'front' | 'back';
export type Column = 0 | 1 | 2;

export interface Position {
  row: Row;
  column: Column;
}

// --- Move Range (targeting system) ---

export type MoveRange =
  | 'front_enemy'   // single target in front row only
  | 'back_enemy'    // single target in back row only
  | 'any_enemy'     // single target, either row
  | 'front_row'     // AoE all enemies in front row
  | 'back_row'      // AoE all enemies in back row
  | 'any_row'       // player picks front or back row, hits all in that row
  | 'column'        // hits all enemies in a column (front + back)
  | 'all_enemies'   // AoE all enemies
  | 'self'          // self-targeting
  | 'any_ally';     // any ally (including self)

// --- Legacy Targeting (deprecated) ---

/** @deprecated Use MoveRange instead */
export type TargetType =
  | 'single_enemy'
  | 'all_enemies'
  | 'random_enemy'
  | 'self'
  | 'ally';

// --- Card Effects ---

export type CardEffectType =
  | 'damage'
  | 'block'
  | 'heal'
  | 'heal_percent'
  | 'apply_status'
  | 'multi_hit'
  | 'heal_on_hit'
  | 'recoil'
  | 'set_damage'
  | 'percent_hp'
  | 'self_ko'
  | 'draw_cards'
  | 'gain_energy'
  | 'apply_status_self'
  | 'cleanse';

export interface DamageEffect {
  type: 'damage';
  value: number;
  bonusValue?: number;           // extra damage if condition met
  bonusCondition?: 'user_below_half_hp' | 'target_debuff_stacks';  // condition type
}

export interface BlockEffect {
  type: 'block';
  value: number;
}

export interface HealEffect {
  type: 'heal';
  value: number;
}

/** Percentage HP healing - heals % of max HP */
export interface HealPercentEffect {
  type: 'heal_percent';
  percent: number;  // 0.5 = 50% of max HP
}

export interface ApplyStatusEffect {
  type: 'apply_status';
  status: StatusType;
  stacks: number;
}

/** Multiple damage instances - each hit triggers Strength separately */
export interface MultiHitEffect {
  type: 'multi_hit';
  value: number;  // damage per hit
  hits: number;   // number of hits
}

/** Lifesteal attack - heal a percentage of damage dealt */
export interface HealOnHitEffect {
  type: 'heal_on_hit';
  value: number;        // damage dealt
  healPercent: number;  // 0.5 = heal 50% of damage dealt
}

/** Recoil attack - damage self after attacking */
export interface RecoilEffect {
  type: 'recoil';
  value: number;        // damage dealt
  recoilPercent: number; // 0.5 = take 50% of damage dealt
}

/** Fixed damage - ignores Strength, Enfeeble, Block, and Evasion */
export interface SetDamageEffect {
  type: 'set_damage';
  value: number;  // exact damage dealt
}

/** Percentage HP damage - deals % of target's HP */
export interface PercentHpEffect {
  type: 'percent_hp';
  percent: number;  // 0.5 = 50% of HP
  ofMax: boolean;   // true = max HP, false = current HP
}

/** Self-KO - user faints after attack */
export interface SelfKoEffect {
  type: 'self_ko';
  value: number;  // damage dealt before user dies
}

/** Draw additional cards */
export interface DrawCardsEffect {
  type: 'draw_cards';
  count: number;
}

/** Gain bonus energy */
export interface GainEnergyEffect {
  type: 'gain_energy';
  amount: number;
}

/** Apply status to self (not target) */
export interface ApplyStatusSelfEffect {
  type: 'apply_status_self';
  status: StatusType;
  stacks: number;
}

/** Remove debuffs from self */
export interface CleanseEffect {
  type: 'cleanse';
  count: number;  // number of debuffs to remove (highest stacks first)
}

export type CardEffect =
  | DamageEffect
  | BlockEffect
  | HealEffect
  | HealPercentEffect
  | ApplyStatusEffect
  | MultiHitEffect
  | HealOnHitEffect
  | RecoilEffect
  | SetDamageEffect
  | PercentHpEffect
  | SelfKoEffect
  | DrawCardsEffect
  | GainEnergyEffect
  | ApplyStatusSelfEffect
  | CleanseEffect;

// --- Move Types (elemental) ---

export type MoveType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'poison'
  | 'flying'
  | 'psychic'
  | 'dark'
  | 'fighting'
  | 'ice'
  | 'bug'
  | 'dragon'
  | 'ghost'
  | 'rock'
  | 'ground'
  | 'steel'
  | 'fairy'
  | 'item';

// --- Cards / Moves ---

/** @deprecated Use MoveDefinition instead */
export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  target: TargetType;
  vanish: boolean;
  effects: CardEffect[];
  description: string;
}

// --- Card Rarity ---

export type CardRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Move is the baseline definition (from JSON) */
export interface MoveDefinition {
  id: string;
  name: string;
  type: MoveType;
  cost: number;
  range: MoveRange;
  vanish: boolean;
  effects: CardEffect[];
  description: string;
  rarity?: CardRarity;
  pools?: MoveType[];  // Which type pools this card belongs to (for drafting)
  isItem?: boolean;    // true = shop-only item card, never appears in draft
  singleUse?: boolean; // true = permanently removed from deck after use (not just vanish for battle)
  uncollectible?: boolean; // true = cannot appear in drafts, hidden in Card Dex by default
  goldOnHit?: boolean; // true = gain gold equal to damage dealt (Pay Day)
  contact?: boolean;   // true = physical contact move, false/undefined = special/ranged
}

// --- Status Effects ---

export type StatusType =
  | 'burn'
  | 'poison'
  | 'paralysis'
  | 'slow'
  | 'enfeeble'
  | 'sleep'
  | 'leech'
  | 'evasion'
  | 'strength'
  | 'haste'
  | 'taunt';

export interface StatusInstance {
  type: StatusType;
  stacks: number;
  /** For slow: rounds remaining. For leech: rounds remaining. */
  duration?: number;
  /** For leech: the combatant ID that applied it and receives healing. */
  sourceId?: string;
  /** Tick counter: order in which this was applied (for processing order). */
  appliedOrder: number;
}

// --- Combatant ---

export type CombatantSide = 'player' | 'enemy';

/** Per-turn flags for passive abilities */
export interface CombatantTurnFlags {
  blazeStrikeUsedThisTurn: boolean;
  infernoMomentumReducedIndex: number | null;  // Index of card with cost reduced by Inferno Momentum
  relentlessUsedThisTurn: boolean;  // First attack costs 0 (Rattata line)
  alliesDamagedThisRound: Set<string>;  // IDs of allies who took damage this round (for Family Fury)
  overgrowHealUsedThisTurn: boolean;  // First Grass attack heals (Venusaur line)
  torrentShieldUsedThisTurn: boolean;  // First Water attack grants Block (Blastoise line)
  swarmStrikeUsedThisTurn: boolean;   // First Bug attack deals double (Beedrill line)
  surgeMomentumReducedIndex: number | null;  // Index of card with cost reduced by Surge Momentum
  dragonsMajestyReducedIndex: number | null;  // Index of card with cost reduced by Dragon's Majesty
  sniperUsedThisTurn: boolean;  // First attack ignores evasion and block (Fearow line)
  hasSwitchedThisTurn: boolean;  // Can only switch position once per turn
  finisherUsedThisTurn: boolean;  // First 3+ cost attack deals double, clears Strength (Machamp line)
}

export interface Combatant {
  id: string;               // unique: e.g. "bulbasaur-0", "rattata-1"
  pokemonId: string;         // species: "bulbasaur", "rattata"
  name: string;              // display name
  types: MoveType[];         // pokemon types for STAB calculation
  side: CombatantSide;
  slotIndex: number;         // linear index in party (0-based, for turn order)
  position: Position;        // grid position (row + column)

  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;

  energy: number;
  energyPerTurn: number;
  energyCap: number;

  block: number;

  statuses: StatusInstance[];

  drawPile: string[];        // card definition IDs
  discardPile: string[];
  hand: string[];
  vanishedPile: string[];    // cards removed from game by Vanish
  handSize: number;          // max hand size (4)

  alive: boolean;

  // Passive ability system
  passiveIds: string[];      // IDs of all passive abilities (e.g., ["kindling", "spreading_flames"])
  turnFlags: CombatantTurnFlags;  // Per-turn flags, reset at turn start
  costModifiers: Record<string | number, number>;  // Temporary cost modifiers and passive counters
}

// --- Combat State ---

export interface TurnQueueEntry {
  combatantId: string;
  hasActed: boolean;
}

export interface CombatState {
  combatants: Combatant[];
  turnOrder: TurnQueueEntry[];
  currentTurnIndex: number;
  round: number;
  phase: 'ongoing' | 'victory' | 'defeat';
  log: LogEntry[];
  statusApplyCounter: number;  // monotonic counter for appliedOrder
  slipstreamProtectedIds: string[];  // combatants protected from speed reordering this round
  goldEarned: number;  // gold earned during combat (from Pay Day, etc.)
}

export interface LogEntry {
  round: number;
  combatantId: string;
  message: string;
}

// --- Actions (player input) ---

export interface PlayCardAction {
  type: 'play_card';
  cardInstanceId: string;     // the card ID in hand
  targetId?: string;          // combatant ID for single_enemy / ally
}

export interface EndTurnAction {
  type: 'end_turn';
}

export interface SwitchPositionAction {
  type: 'switch_position';
  targetPosition: Position;
}

export type BattleAction = PlayCardAction | EndTurnAction | SwitchPositionAction;

// --- Pokemon Data (config) ---

export interface PokemonData {
  id: string;
  name: string;
  types: MoveType[];  // one or two types
  maxHp: number;
  baseSpeed: number;
  energyPerTurn: number;
  energyCap: number;
  handSize: number;
  deck: string[];  // move definition IDs
  abilities: string[];  // ability IDs (stubbed for future expansion)
  description?: string;  // playstyle hint shown on hover in party select
  energyModifier?: number;  // Permanent energy per turn modifier from events
  drawModifier?: number;    // Permanent hand size modifier from events
}
