import type { CombatState, Combatant } from '../engine/types';

// ============================================================
// Tutorial Dialogue & Trigger Definitions
// ============================================================

export interface TutorialDialogue {
  speaker: 'narrator' | 'slowking' | 'slowbro';
  text: string;
}

export interface TutorialContext {
  state: CombatState;
  /** The action that just happened */
  event: TutorialEvent;
  /** Triggers already shown */
  firedTriggers: Set<string>;
}

export type TutorialEvent =
  | { type: 'turn_start'; combatant: Combatant }
  | { type: 'card_played'; combatant: Combatant; cardId: string }
  | { type: 'end_turn'; combatant: Combatant }
  | { type: 'damage_taken'; target: Combatant; source: Combatant; moveId: string }
  | { type: 'status_applied'; target: Combatant; statusName: string };

export interface TutorialTrigger {
  id: string;
  condition: (ctx: TutorialContext) => boolean;
  dialogue: TutorialDialogue[];
}

// ============================================================
// Prologue Narrative Text
// ============================================================

export const INTRO_TEXT: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: 'The Rocket facility sits carved into the mountainside. No signs. No windows. Just a steel door left ajar.',
  },
  {
    speaker: 'narrator',
    text: 'Your first field assignment. The briefing was simple: get in, document what you find, get out.',
  },
  {
    speaker: 'slowking',
    text: "Stay behind us. Slowbro takes point, I provide support from the back. Standard formation.",
  },
  {
    speaker: 'slowbro',
    text: "Slowww... bro!",
  },
  {
    speaker: 'slowking',
    text: "That's the spirit. I think.",
  },
  {
    speaker: 'narrator',
    text: 'The door is open. You step inside.',
  },
];

export const BATTLE_1_PRE_DIALOGUE: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: "Two guards at the entrance. Their Pokemon are already out \u2014 a Rattata up front, and a pair of Pidgey hanging back.",
  },
];

export const BATTLE_1_POST_DIALOGUE: TutorialDialogue[] = [
  {
    speaker: 'slowking',
    text: "Efficient enough. Let's move before they send something worse.",
  },
  {
    speaker: 'slowbro',
    text: "Slowbro!",
  },
  {
    speaker: 'slowking',
    text: "Yes, you did very well. Come on.",
  },
];

export const TRANSITION_TEXT: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: "The corridor narrows. Fluorescent lights buzz overhead. It's quieter here than it should be.",
  },
  {
    speaker: 'slowking',
    text: "Something feels off. There's a psychic presence down here. Faint, but... large.",
  },
  {
    speaker: 'slowbro',
    text: "...Bro?",
  },
  {
    speaker: 'slowking',
    text: "It's fine. Probably.",
  },
];

export const BATTLE_2_PRE_DIALOGUE: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: "The hallway opens into a larger chamber. Three Rocket operatives turn to face you. These ones aren't nervous.",
  },
  {
    speaker: 'slowking',
    text: "...There are more of them than I'd like.",
  },
];

export const WIPE_SEQUENCE: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: "The floor trembles. A sound that isn't sound fills your head \u2014 pressure behind your eyes, in your teeth, at the base of your skull.",
  },
  {
    speaker: 'slowking',
    text: "That's not them. Something deeper. Something\u2014",
  },
  {
    speaker: 'narrator',
    text: "The wave hits. Not an attack. A scream \u2014 psychic, massive, from something buried far below this place.",
  },
  {
    speaker: 'narrator',
    text: "Slowbro hits the wall. Doesn't get up.",
  },
  {
    speaker: 'narrator',
    text: "Slowking catches you with telekinesis before you hit the ground. The world blinks.",
  },
];

export const WIPE_CUTSCENE: TutorialDialogue[] = [
  {
    speaker: 'narrator',
    text: 'You come to on the hillside. Dawn light. The steel door is still ajar.',
  },
  {
    speaker: 'narrator',
    text: 'Slowbro lies beside you, breathing but done. Slowking stands nearby, barely upright.',
  },
  {
    speaker: 'slowking',
    text: "I got us out. Barely.",
  },
  {
    speaker: 'narrator',
    text: 'It sits down heavily.',
  },
  {
    speaker: 'slowking',
    text: "Whatever is in the basement of that facility just threw a psychic tantrum that I felt through three floors of concrete.",
  },
  {
    speaker: 'narrator',
    text: 'Slowking glances at the unconscious Slowbro.',
  },
  {
    speaker: 'slowking',
    text: "He'll be fine. Probably didn't even notice. But he needs rest. Significant rest.",
  },
  {
    speaker: 'narrator',
    text: 'Slowking closes its eyes.',
  },
  {
    speaker: 'slowking',
    text: "You're going to go back in, aren't you.",
  },
  {
    speaker: 'narrator',
    text: '...',
  },
  {
    speaker: 'slowking',
    text: "Then you'll need a new team. I'd suggest Pokemon that are... less unconscious than your current options.",
  },
  {
    speaker: 'narrator',
    text: 'Slowking opens one eye.',
  },
  {
    speaker: 'slowking',
    text: "Good luck. Try not to die. The paperwork would be dreadful.",
  },
];

// ============================================================
// Tutorial Battle Triggers
// ============================================================

export const TUTORIAL_TRIGGERS: TutorialTrigger[] = [
  // Fires on Slowbro's first turn — opening formation dialogue + energy intro
  {
    id: 'FORMATION_INTRO',
    condition: (ctx) =>
      ctx.event.type === 'turn_start' &&
      ctx.event.combatant.pokemonId === 'slowbro' &&
      ctx.event.combatant.side === 'player' &&
      !ctx.firedTriggers.has('FORMATION_INTRO'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "I'll direct from the back row. Harder to hit me there. Theoretically.",
      },
      {
        speaker: 'slowbro',
        text: "...",
      },
      {
        speaker: 'slowking',
        text: "Slowbro has a variety of attacks. Each card costs energy \u2014 see the number in the corner. He has 3 energy this turn. Use what you can afford.",
      },
    ],
  },
  // Fires when player plays Withdraw or Defend — block timing explanation
  {
    id: 'BLOCK_PLAYED',
    condition: (ctx) =>
      ctx.event.type === 'card_played' &&
      ctx.event.combatant.side === 'player' &&
      (ctx.event.cardId === 'withdraw' || ctx.event.cardId === 'defend') &&
      !ctx.firedTriggers.has('BLOCK_PLAYED'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "Good instinct. Slowbro moved before the enemies this round, so his Block is up before they attack. It'll absorb damage before it hits HP \u2014 but it resets at the end of the round.",
      },
    ],
  },
  // Fires on first end turn
  {
    id: 'END_TURN',
    condition: (ctx) =>
      ctx.event.type === 'end_turn' &&
      ctx.event.combatant.side === 'player' &&
      !ctx.firedTriggers.has('END_TURN'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "Energy refills each turn. No reason to hold back.",
      },
    ],
  },
  // Fires when a player Pokemon gets a status condition (likely Slow from Gust Force)
  {
    id: 'STATUS_EFFECT',
    condition: (ctx) =>
      ctx.event.type === 'status_applied' &&
      ctx.event.target.side === 'player' &&
      !ctx.firedTriggers.has('STATUS_EFFECT'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "See that icon? That's a status condition. The number shows how many charges it has \u2014 it ticks down each round. For now, it'll slow Slowbro down in the turn order.",
      },
      {
        speaker: 'slowking',
        text: "Hover over status icons if you want the details. I'd explain them all, but we're in the middle of something.",
      },
    ],
  },
  // Fires when Slowking takes damage from an enemy (back row teaching)
  {
    id: 'BACK_ROW_HIT',
    condition: (ctx) =>
      ctx.event.type === 'damage_taken' &&
      ctx.event.target.pokemonId === 'slowking' &&
      ctx.event.target.side === 'player' &&
      ctx.event.source.side === 'enemy' &&
      !ctx.firedTriggers.has('BACK_ROW_HIT'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "...Ow. Some attacks can reach the back row as well. I'm getting too old for this.",
      },
    ],
  },
  // Fires on Slowking's first turn — multi-Pokemon hand explanation
  {
    id: 'SLOWKING_TURN',
    condition: (ctx) =>
      ctx.event.type === 'turn_start' &&
      ctx.event.combatant.pokemonId === 'slowking' &&
      ctx.event.combatant.side === 'player' &&
      !ctx.firedTriggers.has('SLOWKING_TURN'),
    dialogue: [
      {
        speaker: 'slowking',
        text: "My turn. Each Pokemon has their own hand and energy. You'll notice my attacks can all reach any enemy from back here.",
      },
    ],
  },
];

/**
 * Check all triggers against the current context.
 * Returns the first trigger that fires, or null if none.
 */
export function checkTutorialTriggers(ctx: TutorialContext): TutorialTrigger | null {
  for (const trigger of TUTORIAL_TRIGGERS) {
    if (!ctx.firedTriggers.has(trigger.id) && trigger.condition(ctx)) {
      return trigger;
    }
  }
  return null;
}
