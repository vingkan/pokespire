import type { PokemonId } from '../config/pokemon';
import type { StatusType, BuffType } from '../config/cards';

export type BattleResult = 'ongoing' | 'victory' | 'defeat';

export interface StatusEffect {
  type: StatusType;
  stacks: number;
}

export interface BuffEffect {
  type: BuffType;
  stacks: number;
}

export interface PokemonCombatState {
  pokemonId: PokemonId;
  playerId?: string; // If controlled by a player
  currentHp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  manaRegen: number;
  speed: number;
  block: number; // Temporary defense, resets at end of round
  statuses: StatusEffect[];
  buffs: BuffEffect[];
  hand: string[]; // Card IDs
  deck: string[]; // Card IDs
  discard: string[]; // Card IDs
  hasActedThisRound: boolean;
}

export interface BattleState {
  playerParty: PokemonCombatState[];
  enemies: PokemonCombatState[];
  turnOrder: PokemonCombatState[]; // All combatants sorted by speed
  currentTurnIndex: number; // Index in turnOrder
  currentRound: number;
  roundActed: Set<string>; // Pokemon IDs that have acted this round
  result: BattleResult;
}

export type Action = 
  | PlayCardAction
  | EndTurnAction
  | ChoosePathAction
  | StartBattleAction
  | StartCampaignAction;

export interface PlayCardAction {
  type: 'playCard';
  cardId: string;
  casterId: string; // Pokemon ID
  targetIds?: string[]; // Pokemon IDs (for single-target or multi-target effects)
}

export interface EndTurnAction {
  type: 'endTurn';
}

export interface ChoosePathAction {
  type: 'choosePath';
  nodeId: string;
}

export interface StartBattleAction {
  type: 'startBattle';
  encounterId: string;
}

export interface StartCampaignAction {
  type: 'startCampaign';
  players: Array<{
    id: string;
    name: string;
    pokemonId: PokemonId;
  }>;
}

export interface CampaignState {
  currentNodeId: string;
  completedNodes: Set<string>;
  party: Array<{
    playerId?: string;
    playerName?: string;
    pokemonId: PokemonId;
  }>;
}

export interface GameState {
  screen: 'intro' | 'playerSetup' | 'starterSelection' | 'map' | 'combat' | 'victory' | 'defeat';
  campaign?: CampaignState;
  battle?: BattleState;
  lastBattleResult?: BattleResult;
  evolutions?: Array<{ from: PokemonId; to: PokemonId }>;
  isFinalVictory?: boolean;
  players?: Array<{
    id: string;
    name: string;
    pokemonId?: PokemonId;
  }>;
  error?: string; // Error message if an error occurred
}
