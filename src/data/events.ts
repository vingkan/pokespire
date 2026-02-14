/**
 * Event Definitions — Data-driven narrative events for the campaign.
 *
 * Each event has 2-4 choices with fixed or probabilistic outcomes.
 * Effects are processed by src/run/events.ts; UI is in EventScreen.tsx.
 */

import type { RunState } from '../run/types';

// ============================================================
// Effect & Choice Types
// ============================================================

export type EffectTarget = 'one' | 'all' | 'random';

export type EventEffect =
  | { type: 'gold'; amount: number }
  | { type: 'maxHpBoost'; target: EffectTarget; amount: number }
  | { type: 'damage'; target: EffectTarget; amount: number }
  | { type: 'healPercent'; target: EffectTarget; percent: number }
  | { type: 'fullHeal'; target: EffectTarget }
  | { type: 'xp'; target: EffectTarget; amount: number }
  | { type: 'energyModifier'; target: 'one'; amount: number }
  | { type: 'drawModifier'; target: 'one'; amount: number }
  | { type: 'addDazed'; target: 'one'; count: number }
  | { type: 'cardRemoval'; mode: 'one' | 'each'; count: number }
  | { type: 'epicDraft'; picks: number }
  | { type: 'shopDraft' }
  | { type: 'cardClone' }
  | { type: 'recruit' }
  | { type: 'setPath'; connections: string[] }
  | { type: 'nothing' };

export type ChoiceOutcome =
  | { type: 'fixed'; effects: EventEffect[]; description: string }
  | { type: 'random'; branches: { weight: number; effects: EventEffect[]; description: string }[] };

export interface EventChoice {
  id: string;
  label: string;
  flavorText?: string;
  outcome: ChoiceOutcome;
  disabled?: (run: RunState) => boolean;
}

export interface EventDefinition {
  id: string;
  act: 1 | 2 | 3;
  title: string;
  narrativeText: string;
  choices: EventChoice[];
}

// ============================================================
// Interactive Effect Helpers
// ============================================================

/** Effects that need UI interaction (card picking, drafting, etc.) */
export const INTERACTIVE_EFFECT_TYPES = new Set([
  'cardRemoval', 'epicDraft', 'shopDraft', 'cardClone', 'recruit',
]);

export function isInteractiveEffect(effect: EventEffect): boolean {
  return INTERACTIVE_EFFECT_TYPES.has(effect.type);
}

/** Check if any effect in a list requires picking a Pokemon first */
export function needsPokemonSelection(effects: EventEffect[]): boolean {
  return effects.some(e => {
    if ('target' in e && e.target === 'one') return true;
    return false;
  });
}

// ============================================================
// Act 1 Events (10)
// ============================================================

const ACT1_EVENTS: EventDefinition[] = [
  // Event 1: Training Camp
  {
    id: 'training_camp',
    act: 1,
    title: 'Training Camp',
    narrativeText: 'A clearing with training dummies and weights. A Machoke flexes nearby.\n\n"Want to train? No pain, no gain!"',
    choices: [
      {
        id: 'train',
        label: 'Train Hard',
        flavorText: '+5 Max HP to one Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'maxHpBoost', target: 'one', amount: 5 }], description: 'The training pays off! Max HP increased.' },
      },
      {
        id: 'skip',
        label: 'No Thanks',
        flavorText: 'Continue on your way',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You nod politely and move on.' },
      },
    ],
  },

  // Event 2: Meditation Chamber
  {
    id: 'meditation_chamber',
    act: 1,
    title: 'Meditation Chamber',
    narrativeText: 'A quiet room with incense and soft light. A Medicham sits cross-legged.\n\n"Clear your mind... let wisdom flow."',
    choices: [
      {
        id: 'meditate',
        label: 'Meditate',
        flavorText: '+1 EXP to one Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'xp', target: 'one', amount: 1 }], description: 'Inner peace achieved. Experience gained.' },
      },
      {
        id: 'skip',
        label: 'No Thanks',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You leave the chamber undisturbed.' },
      },
    ],
  },

  // Event 3: Move Tutor
  {
    id: 'move_tutor',
    act: 1,
    title: 'Move Tutor',
    narrativeText: 'A Hypno swings its pendulum slowly.\n\n"Let go of what holds you back... I can make them forget."',
    choices: [
      {
        id: 'forget',
        label: 'Forget Moves',
        flavorText: 'Remove 1 card from each Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'cardRemoval', mode: 'each', count: 1 }], description: 'The memories fade... unwanted moves forgotten.' },
      },
      {
        id: 'skip',
        label: 'Keep All Moves',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You back away from the swinging pendulum.' },
      },
    ],
  },

  // Event 4: Wandering Merchant
  {
    id: 'wandering_merchant',
    act: 1,
    title: 'Wandering Merchant',
    narrativeText: 'A Meowth with a heavy pack grins at you.\n\n"Pssst... got some rare goods. Real cheap, I promise."',
    choices: [
      {
        id: 'buy',
        label: 'Browse Wares',
        flavorText: 'Pick a free item from the shop',
        outcome: { type: 'fixed', effects: [{ type: 'shopDraft' }], description: 'The Meowth pulls out a selection of items.' },
      },
      {
        id: 'haggle',
        label: 'Demand Gold',
        flavorText: 'Intimidate for 30 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 30 }], description: 'The Meowth nervously hands over some gold.' },
      },
    ],
  },

  // Event 5: Trapped Hallway
  {
    id: 'trapped_hallway',
    act: 1,
    title: 'Trapped Hallway',
    narrativeText: 'The corridor ahead is lined with suspicious tiles. Scorch marks cover the walls.\n\nYou could charge through or try to find the safe path...',
    choices: [
      {
        id: 'careful',
        label: 'Go Carefully',
        flavorText: '6 damage to all',
        outcome: { type: 'fixed', effects: [{ type: 'damage', target: 'all', amount: 6 }], description: 'You trigger a few traps but make it through.' },
      },
      {
        id: 'rush',
        label: 'Sprint Through',
        flavorText: '50/50: 40 gold OR 10 damage to all',
        outcome: {
          type: 'random',
          branches: [
            { weight: 50, effects: [{ type: 'gold', amount: 40 }], description: 'You dash through unscathed and find gold on the other side!' },
            { weight: 50, effects: [{ type: 'damage', target: 'all', amount: 10 }], description: 'Traps everywhere! Your party takes heavy damage.' },
          ],
        },
      },
    ],
  },

  // Event 6: Rattata Nest
  {
    id: 'rattata_nest',
    act: 1,
    title: 'Rattata Nest',
    narrativeText: 'You stumble upon a pile of shiny objects guarded by sleeping Rattata.\n\nYou could sneak some gold... or just kick the pile and run.',
    choices: [
      {
        id: 'sneak',
        label: 'Sneak Gold',
        flavorText: 'Gain 25 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 25 }], description: 'You carefully pocket some coins without waking them.' },
      },
      {
        id: 'kick',
        label: 'Kick the Pile',
        flavorText: '5 damage to all, scatter the nest',
        outcome: { type: 'fixed', effects: [{ type: 'damage', target: 'all', amount: 5 }], description: 'The Rattata swarm bites everyone before fleeing!' },
      },
    ],
  },

  // Event 7: Hot Springs
  {
    id: 'hot_springs',
    act: 1,
    title: 'Hot Springs',
    narrativeText: 'Natural hot springs bubble up from cracks in the cave floor. The warm mist is soothing.\n\nYour Pokemon look eager to rest.',
    choices: [
      {
        id: 'rest',
        label: 'Soak',
        flavorText: 'Heal all Pokemon 25%',
        outcome: { type: 'fixed', effects: [{ type: 'healPercent', target: 'all', percent: 0.25 }], description: 'The warm water soothes all aches. Everyone feels refreshed.' },
      },
      {
        id: 'skip',
        label: 'Keep Moving',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'No time for rest. You press onward.' },
      },
    ],
  },

  // Event 8: Fallen Trainer
  {
    id: 'fallen_trainer',
    act: 1,
    title: 'Fallen Trainer',
    narrativeText: 'A defeated trainer sits against the wall, clutching a rare card.\n\n"Take it... I don\'t need it anymore."',
    choices: [
      {
        id: 'take',
        label: 'Accept the Card',
        flavorText: 'Draft 1 epic card',
        outcome: { type: 'fixed', effects: [{ type: 'epicDraft', picks: 1 }], description: 'You accept the trainer\'s gift. A powerful card!' },
      },
      {
        id: 'help',
        label: 'Help Them Up',
        flavorText: 'Gain 20 gold (they reward your kindness)',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 20 }], description: 'The trainer thanks you and shares some gold.' },
      },
    ],
  },

  // Event 9: Mysterious Mushrooms
  {
    id: 'mysterious_mushrooms',
    act: 1,
    title: 'Mysterious Mushrooms',
    narrativeText: 'Glowing mushrooms sprout from the damp cave walls. A Paras watches you curiously.\n\nThey look... edible? Maybe?',
    choices: [
      {
        id: 'eat',
        label: 'Eat Them',
        flavorText: '50/50: +3 Max HP all OR 4 damage all',
        outcome: {
          type: 'random',
          branches: [
            { weight: 50, effects: [{ type: 'maxHpBoost', target: 'all', amount: 3 }], description: 'Surprisingly nutritious! Everyone feels stronger.' },
            { weight: 50, effects: [{ type: 'damage', target: 'all', amount: 4 }], description: 'Ugh, poisonous! Everyone feels sick.' },
          ],
        },
      },
      {
        id: 'skip',
        label: 'Don\'t Risk It',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'Probably wise. You leave the mushrooms alone.' },
      },
    ],
  },

  // Event 10: Locked Vault
  {
    id: 'locked_vault',
    act: 1,
    title: 'Locked Vault',
    narrativeText: 'A heavy steel door blocks a side room. Through the bars you can see equipment and rare items.\n\nForcing it open will set off alarms...',
    choices: [
      {
        id: 'force',
        label: 'Force It Open',
        flavorText: 'Epic draft + shop item, but 8 damage to all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'epicDraft', picks: 1 },
            { type: 'shopDraft' },
            { type: 'damage', target: 'all', amount: 8 },
          ],
          description: 'The alarm blasts everyone, but the loot is worth it!',
        },
      },
      {
        id: 'leave',
        label: 'Walk Away',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'Too risky. You leave the vault sealed.' },
      },
    ],
  },
];

// ============================================================
// Act 2 Events (10)
// ============================================================

const ACT2_EVENTS: EventDefinition[] = [
  // Event 11: Power Surge
  {
    id: 'power_surge',
    act: 2,
    title: 'Power Surge',
    narrativeText: 'Exposed wiring crackles with unstable energy. A damaged generator hums nearby.\n\nYou could try to siphon some power...',
    choices: [
      {
        id: 'siphon',
        label: 'Siphon Energy',
        flavorText: '+1 energy per turn to one Pokemon, +1 Dazed',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'energyModifier', target: 'one', amount: 1 },
            { type: 'addDazed', target: 'one', count: 1 },
          ],
          description: 'Raw power floods in! But the overload leaves them a bit dazed...',
        },
      },
      {
        id: 'skip',
        label: 'Too Dangerous',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You back away from the sparking wires.' },
      },
    ],
  },

  // Event 12: Rocket Scientist
  {
    id: 'rocket_scientist',
    act: 2,
    title: 'Rocket Scientist',
    narrativeText: 'A disheveled scientist in a Rocket lab coat approaches nervously.\n\n"I defected. Let me help you — I have medical supplies, or gold if you prefer."',
    choices: [
      {
        id: 'heal',
        label: 'Accept Healing',
        flavorText: 'Full heal all Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'fullHeal', target: 'all' }], description: 'The scientist patches everyone up. Full health restored!' },
      },
      {
        id: 'gold',
        label: 'Take the Gold',
        flavorText: 'Gain 40 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 40 }], description: 'The scientist hands over a pouch of gold.' },
      },
    ],
  },

  // Event 13: Card Printer
  {
    id: 'card_printer',
    act: 2,
    title: 'Card Printer',
    narrativeText: 'A malfunctioning TM machine sparks and whirs. It could copy a move...\n\n...or destroy it. The display reads "50/50 CHANCE — PROCEED?"',
    choices: [
      {
        id: 'use',
        label: 'Use the Machine',
        flavorText: 'Pick a card. 50/50: clone it OR lose it',
        outcome: { type: 'fixed', effects: [{ type: 'cardClone' }], description: 'The machine whirs to life...' },
      },
      {
        id: 'skip',
        label: 'Don\'t Touch It',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You decide not to gamble with your moves.' },
      },
    ],
  },

  // Event 14: Abandoned Cafeteria
  {
    id: 'abandoned_cafeteria',
    act: 2,
    title: 'Abandoned Cafeteria',
    narrativeText: 'The lab cafeteria is trashed but some food remains. It looks... mostly edible.\n\nA few vending machines still work.',
    choices: [
      {
        id: 'eat',
        label: 'Eat the Food',
        flavorText: 'Heal all 20%, +2 Max HP all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'healPercent', target: 'all', percent: 0.20 },
            { type: 'maxHpBoost', target: 'all', amount: 2 },
          ],
          description: 'Not gourmet, but filling. Everyone feels a bit tougher.',
        },
      },
      {
        id: 'loot',
        label: 'Loot the Machines',
        flavorText: 'Gain 35 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 35 }], description: 'You crack open the machines and pocket the coins.' },
      },
    ],
  },

  // Event 15: Mind Games
  {
    id: 'mind_games',
    act: 2,
    title: 'Mind Games',
    narrativeText: 'A lingering psychic field warps the air. Faint whispers echo...\n\n"Sharpen your mind... or let it wander..."',
    choices: [
      {
        id: 'focus',
        label: 'Focus Hard',
        flavorText: '+1 draw per turn to one Pokemon, +2 Dazed',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'drawModifier', target: 'one', amount: 1 },
            { type: 'addDazed', target: 'one', count: 2 },
          ],
          description: 'New neural pathways form! But the strain adds some mental fog...',
        },
      },
      {
        id: 'resist',
        label: 'Resist',
        outcome: { type: 'fixed', effects: [{ type: 'nothing' }], description: 'You push back against the psychic field and move on.' },
      },
    ],
  },

  // Event 16: Supply Cache
  {
    id: 'supply_cache',
    act: 2,
    title: 'Supply Cache',
    narrativeText: 'Behind a collapsed wall, you find a Team Rocket supply cache.\n\nMedical kits, rare TMs, and a bag of gold.',
    choices: [
      {
        id: 'medkits',
        label: 'Take Medkits',
        flavorText: 'Heal all 30%',
        outcome: { type: 'fixed', effects: [{ type: 'healPercent', target: 'all', percent: 0.30 }], description: 'Everyone gets patched up.' },
      },
      {
        id: 'tms',
        label: 'Take the TMs',
        flavorText: 'Draft 1 epic card',
        outcome: { type: 'fixed', effects: [{ type: 'epicDraft', picks: 1 }], description: 'A rare TM! This could change the battle.' },
      },
      {
        id: 'gold_bag',
        label: 'Take the Gold',
        flavorText: 'Gain 50 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 50 }], description: 'A heavy bag of coins. Nice.' },
      },
    ],
  },

  // Event 17: Rocket Armory
  {
    id: 'rocket_armory',
    act: 2,
    title: 'Rocket Armory',
    narrativeText: 'Racks of specialized equipment line the walls. Most are locked, but a few cases are open.',
    choices: [
      {
        id: 'equip',
        label: 'Grab Equipment',
        flavorText: 'Pick a free shop item',
        outcome: { type: 'fixed', effects: [{ type: 'shopDraft' }], description: 'You grab the best gear you can carry.' },
      },
      {
        id: 'sell',
        label: 'Pawn It',
        flavorText: 'Gain 45 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 45 }], description: 'You grab some items to sell later.' },
      },
    ],
  },

  // Event 18: Security Terminal
  {
    id: 'security_terminal',
    act: 2,
    title: 'Security Terminal',
    narrativeText: 'A still-functioning terminal displays Rocket base schematics.\n\nYou could study battle data or download financial records.',
    choices: [
      {
        id: 'study',
        label: 'Study Battle Data',
        flavorText: '+1 EXP to all Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'xp', target: 'all', amount: 1 }], description: 'Your Pokemon learn from the battle analysis!' },
      },
      {
        id: 'hack',
        label: 'Hack Finances',
        flavorText: 'Gain 60 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 60 }], description: 'You transfer funds from Rocket accounts. Cha-ching!' },
      },
    ],
  },

  // Event 19: Mewtwo's Trail
  {
    id: 'mewtwos_trail',
    act: 2,
    title: 'Mewtwo\'s Trail',
    narrativeText: 'Deep claw marks and psychic residue mark the wall. Something immensely powerful passed through here.\n\nThe energy lingers...',
    choices: [
      {
        id: 'absorb',
        label: 'Absorb the Energy',
        flavorText: '+5 Max HP to one Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'maxHpBoost', target: 'one', amount: 5 }], description: 'Psychic energy fortifies your Pokemon.' },
      },
      {
        id: 'search',
        label: 'Search the Area',
        flavorText: 'Pick a free shop item',
        outcome: { type: 'fixed', effects: [{ type: 'shopDraft' }], description: 'You find abandoned equipment near the trail.' },
      },
    ],
  },

  // Event 20: Volunteer Recruit
  {
    id: 'volunteer_recruit',
    act: 2,
    title: 'Volunteer Recruit',
    narrativeText: 'A wild Pokemon emerges from the rubble, looking at you expectantly.\n\n"It seems to want to join your team!"',
    choices: [
      {
        id: 'recruit',
        label: 'Welcome Aboard',
        flavorText: 'Add a random Pokemon to your bench',
        outcome: { type: 'fixed', effects: [{ type: 'recruit' }], description: 'A new ally joins your bench!' },
        disabled: (run: RunState) => run.bench.length >= 4,
      },
      {
        id: 'decline',
        label: 'No Room',
        flavorText: 'Gain 20 gold instead',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 20 }], description: 'You wave goodbye and pocket some loose coins.' },
      },
    ],
  },
];

// ============================================================
// Act 3 Events (9)
// ============================================================

const ACT3_EVENTS: EventDefinition[] = [
  // Event 21: Psychic Storm
  {
    id: 'psychic_storm',
    act: 3,
    title: 'Psychic Storm',
    narrativeText: 'Waves of psychic energy crash through the cavern. Reality warps and bends.\n\nYou can try to channel it or endure it.',
    choices: [
      {
        id: 'channel',
        label: 'Channel the Storm',
        flavorText: '+1 energy per turn to one, 6 damage to all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'energyModifier', target: 'one', amount: 1 },
            { type: 'damage', target: 'all', amount: 6 },
          ],
          description: 'Raw psychic power flows in! But the storm batters everyone.',
        },
      },
      {
        id: 'endure',
        label: 'Hunker Down',
        flavorText: '3 damage to all',
        outcome: { type: 'fixed', effects: [{ type: 'damage', target: 'all', amount: 3 }], description: 'You weather the storm with minimal damage.' },
      },
    ],
  },

  // Event 22: Ancient Shrine
  {
    id: 'ancient_shrine',
    act: 3,
    title: 'Ancient Shrine',
    narrativeText: 'A crumbling shrine dedicated to Mew sits in a natural alcove. Faded offerings surround it.\n\nYou feel a gentle presence...',
    choices: [
      {
        id: 'pray',
        label: 'Offer a Prayer',
        flavorText: 'Full heal all Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'fullHeal', target: 'all' }], description: 'A warm light envelops your party. All wounds are healed.' },
      },
      {
        id: 'take_offering',
        label: 'Take the Offerings',
        flavorText: 'Gain 75 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 75 }], description: 'You pocket the ancient coins. Mew probably doesn\'t mind... right?' },
      },
    ],
  },

  // Event 23: Reality Fracture
  {
    id: 'reality_fracture',
    act: 3,
    title: 'Reality Fracture',
    narrativeText: 'A crack in space reveals glimpses of alternate timelines. Your Pokemon see stronger versions of themselves.\n\nThe visions are intoxicating but dangerous.',
    choices: [
      {
        id: 'peek',
        label: 'Peer into the Fracture',
        flavorText: '+1 draw per turn to one, +1 Dazed, 5 damage all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'drawModifier', target: 'one', amount: 1 },
            { type: 'addDazed', target: 'one', count: 1 },
            { type: 'damage', target: 'all', amount: 5 },
          ],
          description: 'Knowledge from another timeline! But reality fights back...',
        },
      },
      {
        id: 'seal',
        label: 'Seal the Fracture',
        flavorText: '+2 Max HP all',
        outcome: { type: 'fixed', effects: [{ type: 'maxHpBoost', target: 'all', amount: 2 }], description: 'You seal the rift. The residual energy strengthens everyone.' },
      },
    ],
  },

  // Event 24: Mewtwo's Voice
  {
    id: 'mewtwos_voice',
    act: 3,
    title: 'Mewtwo\'s Voice',
    narrativeText: 'A telepathic message reverberates through your mind:\n\n"You seek me? Very well. Accept my gift... if you dare."',
    choices: [
      {
        id: 'accept',
        label: 'Accept the Gift',
        flavorText: '50/50: 2 epic drafts OR 15 damage to all',
        outcome: {
          type: 'random',
          branches: [
            { weight: 50, effects: [{ type: 'epicDraft', picks: 2 }], description: 'Mewtwo\'s psychic energy crystallizes into powerful techniques!' },
            { weight: 50, effects: [{ type: 'damage', target: 'all', amount: 15 }], description: 'It was a trap! Psychic energy slams into your party.' },
          ],
        },
      },
      {
        id: 'refuse',
        label: 'Refuse',
        flavorText: '8 damage to one random Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'damage', target: 'random', amount: 8 }], description: '"Foolish." A bolt of energy strikes one of your Pokemon.' },
      },
    ],
  },

  // Event 25: Crystal Cave
  {
    id: 'crystal_cave',
    act: 3,
    title: 'Crystal Cave',
    narrativeText: 'Luminous crystals line the walls, humming with stored energy. They respond to touch.',
    choices: [
      {
        id: 'touch',
        label: 'Touch the Crystals',
        flavorText: '+4 Max HP to all, 3 damage to all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'maxHpBoost', target: 'all', amount: 4 },
            { type: 'damage', target: 'all', amount: 3 },
          ],
          description: 'Crystal energy surges through everyone. Stronger, if a bit singed.',
        },
      },
      {
        id: 'harvest',
        label: 'Harvest for Gold',
        flavorText: 'Gain 55 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 55 }], description: 'You carefully extract the crystals. They\'ll fetch a good price.' },
      },
    ],
  },

  // Event 26: Abyssal Pool
  {
    id: 'abyssal_pool',
    act: 3,
    title: 'Abyssal Pool',
    narrativeText: 'A deep underground pool glows with ethereal light. Strange Pokemon swim in its depths.\n\nDrinking the water feels like it could be transformative.',
    choices: [
      {
        id: 'drink',
        label: 'Drink Deep',
        flavorText: 'Heal 40% all, +1 EXP all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'healPercent', target: 'all', percent: 0.40 },
            { type: 'xp', target: 'all', amount: 1 },
          ],
          description: 'The mystical water heals and enlightens your whole party.',
        },
      },
      {
        id: 'fish',
        label: 'Fish for Treasure',
        flavorText: 'Gain 65 gold',
        outcome: { type: 'fixed', effects: [{ type: 'gold', amount: 65 }], description: 'You pull up ancient coins from the pool\'s depths.' },
      },
    ],
  },

  // Event 27: Ghostly Presence
  {
    id: 'ghostly_presence',
    act: 3,
    title: 'Ghostly Presence',
    narrativeText: 'Spectral shapes flicker in the darkness. A Gengar materializes with a cheshire grin.\n\n"Play a game with me? I\'ll make it worth your while... or not."',
    choices: [
      {
        id: 'play',
        label: 'Play the Game',
        flavorText: '50/50: epic draft + 50 gold OR 12 damage all + 2 Dazed',
        outcome: {
          type: 'random',
          branches: [
            { weight: 50, effects: [{ type: 'epicDraft', picks: 1 }, { type: 'gold', amount: 50 }], description: 'The Gengar cackles with delight! "You win! Here\'s your prize."' },
            { weight: 50, effects: [{ type: 'damage', target: 'all', amount: 12 }, { type: 'addDazed', target: 'one', count: 2 }], description: 'The Gengar\'s laughter is the last thing you hear before the pain.' },
          ],
        },
      },
      {
        id: 'refuse',
        label: 'Decline',
        flavorText: 'Lose 5 damage to random, but stay safe',
        outcome: { type: 'fixed', effects: [{ type: 'damage', target: 'random', amount: 5 }], description: '"Boring!" The Gengar flicks you with a shadow ball as it fades.' },
      },
    ],
  },

  // Event 28: Final Rest
  {
    id: 'final_rest',
    act: 3,
    title: 'Final Rest',
    narrativeText: 'A quiet alcove with soft moss and gentle dripping water. The perfect place to prepare for what lies ahead.\n\nYou sense the end is near.',
    choices: [
      {
        id: 'rest',
        label: 'Rest and Prepare',
        flavorText: 'Heal all 35%, remove 1 card each',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'healPercent', target: 'all', percent: 0.35 },
            { type: 'cardRemoval', mode: 'each', count: 1 },
          ],
          description: 'A brief respite. You heal up and shed dead weight from your decks.',
        },
      },
      {
        id: 'train',
        label: 'Train Intensely',
        flavorText: '+1 EXP all, 5 damage all',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'xp', target: 'all', amount: 1 },
            { type: 'damage', target: 'all', amount: 5 },
          ],
          description: 'Pain is the best teacher. Your Pokemon grow stronger through effort.',
        },
      },
    ],
  },

  // Event 29: Mirror of Potential
  {
    id: 'mirror_of_potential',
    act: 3,
    title: 'Mirror of Potential',
    narrativeText: 'An ornate mirror shows each Pokemon at their absolute peak. The visions are overwhelming.\n\nChoose how to tap into this potential.',
    choices: [
      {
        id: 'purify',
        label: 'Purify the Deck',
        flavorText: 'Remove 3 cards from one Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'cardRemoval', mode: 'one', count: 3 }], description: 'Three memories fade. The deck is lean and focused.' },
      },
      {
        id: 'empower',
        label: 'Absorb Power',
        flavorText: 'Draft 1 epic card',
        outcome: { type: 'fixed', effects: [{ type: 'epicDraft', picks: 1 }], description: 'A powerful technique materializes from the mirror\'s reflection.' },
      },
      {
        id: 'fortify',
        label: 'Fortify Bodies',
        flavorText: '+8 Max HP to one Pokemon',
        outcome: { type: 'fixed', effects: [{ type: 'maxHpBoost', target: 'one', amount: 8 }], description: 'One Pokemon\'s body is permanently strengthened.' },
      },
      {
        id: 'shatter',
        label: 'Shatter the Mirror',
        flavorText: '10 damage to all, remove 1 card each',
        outcome: {
          type: 'fixed',
          effects: [
            { type: 'damage', target: 'all', amount: 10 },
            { type: 'cardRemoval', mode: 'each', count: 1 },
          ],
          description: 'Glass shards cut everyone, but the shattered fragments purify your decks.',
        },
      },
    ],
  },
];

// ============================================================
// Fixed Events (hardcoded to specific map nodes, not in random pool)
// ============================================================

const FIXED_EVENTS: EventDefinition[] = [
  {
    id: 'the_chasm',
    act: 2,
    title: 'The Chasm',
    narrativeText: 'A gaping chasm in the lab floor. Sparking wires dangle into the darkness below. A narrow I-beam stretches across the gap.\n\nAnd something else you can\'t quite put your finger on.',
    choices: [
      {
        id: 'go_around',
        label: 'Go Around',
        flavorText: 'Take the safer route along the walls.',
        outcome: {
          type: 'fixed',
          effects: [{ type: 'nothing' }],
          description: 'You decide to take the safer route around the chasm.',
        },
      },
      {
        id: 'brave_chasm',
        label: 'Try to Jump It',
        flavorText: 'Leap across the narrow I-beam.',
        outcome: {
          type: 'fixed',
          effects: [{ type: 'setPath', connections: ['a2-chasm-ghosts'] }],
          description: 'As you\'re about to jump, a ghostly presence materializes from the darkness below...',
        },
      },
    ],
  },
];

// ============================================================
// Master Lookup
// ============================================================

export const ALL_EVENTS: Record<string, EventDefinition> = {};

for (const event of [...ACT1_EVENTS, ...ACT2_EVENTS, ...ACT3_EVENTS, ...FIXED_EVENTS]) {
  ALL_EVENTS[event.id] = event;
}

/** Get all events for a specific act. */
export function getEventsForAct(act: number): EventDefinition[] {
  if (act === 1) return ACT1_EVENTS;
  if (act === 2) return ACT2_EVENTS;
  if (act === 3) return ACT3_EVENTS;
  return [];
}

/** Get a specific event by ID. */
export function getEvent(id: string): EventDefinition | undefined {
  return ALL_EVENTS[id];
}
