/**
 * Progression System - Defines level-up trees for each Pokemon
 */

// Passive ability IDs
export type PassiveId =
  | 'none'
  // Charmander line
  | 'kindling'
  | 'spreading_flames'
  | 'blaze_strike'
  | 'inferno_momentum'
  // Squirtle line
  | 'baby_shell'
  | 'pressure_hull'
  | 'torrent_shield'
  | 'fortified_cannons'
  // Bulbasaur line
  | 'baby_vines'
  | 'spreading_spores'
  | 'overgrow_heal'
  | 'blooming_cycle'
  // Pikachu line
  | 'numbing_strike'
  | 'static_field'
  | 'counter_current'
  // Pidgey line
  | 'gust_force'
  | 'keen_eye'
  | 'whipping_winds'
  | 'slipstream'
  // Rattata line
  | 'scurry'
  | 'quick_feet'
  | 'relentless'
  | 'underdog'
  | 'hustle'
  // Ekans line
  | 'shed_skin'
  | 'poison_point'
  | 'intimidate'
  | 'predators_patience'
  // Tauros
  | 'thick_hide'
  | 'anger_point'
  | 'raging_bull'
  // Snorlax
  | 'thick_fat'
  | 'immunity'
  | 'leftovers'
  | 'power_nap'
  // Kangaskhan
  | 'scrappy'
  | 'parental_bond'
  | 'protective_instinct'
  | 'family_fury'
  // Persian (Giovanni)
  | 'technician'
  // Nidoking line - "Rampage"
  | 'poison_point'  // Already exists for Ekans, shared with Nido lines
  // anger_point shared with Tauros
  | 'toxic_horn'
  | 'sheer_force'
  // Nidoqueen line - "Matriarch"
  // poison_point shared
  // thick_hide shared with Tauros
  | 'protective_toxins'
  // sheer_force shared
  // Rhyhorn/Rhydon line
  // thick_hide shared
  | 'rock_head'
  | 'lightning_rod'
  | 'reckless';

// A single rung in the progression ladder
export interface ProgressionRung {
  level: number;              // 1, 2, 3, or 4
  name: string;               // Display name for the rung
  description: string;        // What this rung grants
  evolvesTo?: string;         // New form ID (if evolution)
  hpBoost: number;            // Max HP increase
  passiveId: PassiveId;       // New passive (replaces previous)
  cardsToAdd: string[];       // Card IDs to add to deck
}

// Full progression tree for a Pokemon species
export interface ProgressionTree {
  baseFormId: string;         // Starting form (e.g., "charmander")
  rungs: ProgressionRung[];   // All 4 rungs (including base at level 1)
}

// Passive definitions with descriptions
export const PASSIVE_DEFINITIONS: Record<PassiveId, { name: string; description: string }> = {
  none: {
    name: 'None',
    description: 'No passive ability.',
  },
  kindling: {
    name: 'Kindling',
    description: 'Unblocked Fire attacks you play apply +1 Burn stack.',
  },
  spreading_flames: {
    name: 'Spreading Flames',
    description: 'Whenever you apply Burn to an enemy, apply 1 Burn to adjacent enemies.',
  },
  blaze_strike: {
    name: 'Blaze Strike',
    description: 'The first Fire attack you play each turn deals double damage.',
  },
  inferno_momentum: {
    name: 'Inferno Momentum',
    description: 'At the start of your turn, reduce the cost of your highest-cost card in hand by 3 (min 0).',
  },
  baby_shell: {
    name: 'Baby Shell',
    description: 'At the start of your turn, gain 3 Block.',
  },
  pressure_hull: {
    name: 'Pressure Hull',
    description: 'At the end of your turn, retain 50% of your Block.',
  },
  torrent_shield: {
    name: 'Torrent Shield',
    description: 'Your first Water attack each turn grants Block equal to the damage dealt.',
  },
  fortified_cannons: {
    name: 'Fortified Cannons',
    description: 'Your Water attacks deal bonus damage equal to 25% of your current Block.',
  },
  baby_vines: {
    name: 'Baby Vines',
    description: 'Unblocked Grass attacks apply +1 Leech stack.',
  },
  spreading_spores: {
    name: 'Spreading Spores',
    description: 'When applying Leech, also apply 1 Leech to an adjacent enemy.',
  },
  overgrow_heal: {
    name: 'Overgrow Heal',
    description: 'The first Grass attack you play each turn heals you equal to damage dealt.',
  },
  blooming_cycle: {
    name: 'Blooming Cycle',
    description: 'Enemies with Leech deal reduced damage (floor(stacks/2)).',
  },
  numbing_strike: {
    name: 'Numbing Strike',
    description: 'Unblocked Electric attacks apply +1 Paralysis.',
  },
  static_field: {
    name: 'Static Field',
    description: 'Take reduced damage from slower enemies (floor((yourSpeed - theirSpeed) / 2)).',
  },
  counter_current: {
    name: 'Counter-Current',
    description: 'Deal bonus damage to slower enemies (floor((yourSpeed - theirSpeed) / 2)).',
  },
  // Pidgey line
  gust_force: {
    name: 'Gust Force',
    description: 'Gust applies +1 Slow.',
  },
  keen_eye: {
    name: 'Keen Eye',
    description: 'Enemies with Slow take +1 damage from your attacks.',
  },
  whipping_winds: {
    name: 'Whipping Winds',
    description: 'Your row-targeting attacks hit ALL enemies instead.',
  },
  slipstream: {
    name: 'Slipstream',
    description: 'When you use Gust, allies act immediately after you.',
  },
  // Rattata line
  scurry: {
    name: 'Scurry',
    description: 'Gain 2 Haste at the start of combat.',
  },
  quick_feet: {
    name: 'Quick Feet',
    description: 'Your first attack each turn costs 1 less.',
  },
  relentless: {
    name: 'Relentless',
    description: 'Each card you play this turn gives your next attack +1 damage.',
  },
  underdog: {
    name: 'Underdog',
    description: 'Basic or Common rarity cards that cost 1 deal +2 damage.',
  },
  hustle: {
    name: 'Hustle',
    description: 'Draw an extra card at start of turn. Your attacks deal +3 damage but cost +1.',
  },
  // Ekans line
  shed_skin: {
    name: 'Shed Skin',
    description: 'At end of turn, remove 1 debuff from yourself.',
  },
  poison_point: {
    name: 'Poison Point',
    description: 'Unblocked Poison attacks apply +1 Poison.',
  },
  intimidate: {
    name: 'Intimidate',
    description: 'Start of combat: apply Enfeeble 2 to all enemies.',
  },
  predators_patience: {
    name: "Predator's Patience",
    description: 'Enemies with Poison take +2 damage from your attacks.',
  },
  // Tauros (shared with Nido lines)
  thick_hide: {
    name: 'Thick Hide',
    description: 'Take 1 less damage from all attacks.',
  },
  anger_point: {
    name: 'Anger Point',
    description: 'Your attacks deal +50% damage when below 50% HP.',
  },
  raging_bull: {
    name: 'Raging Bull',
    description: 'When you take unblocked damage, gain 4 Strength.',
  },
  // Snorlax
  thick_fat: {
    name: 'Thick Fat',
    description: 'Take 25% less damage from Fire and Ice attacks.',
  },
  immunity: {
    name: 'Immunity',
    description: 'You cannot be Poisoned or Burned. Cleanse on application.',
  },
  leftovers: {
    name: 'Leftovers',
    description: 'At the end of your turn, heal 4 HP.',
  },
  power_nap: {
    name: 'Power Nap',
    description: 'When you play Rest, also gain 3 Strength for 2 turns.',
  },
  // Kangaskhan
  scrappy: {
    name: 'Scrappy',
    description: 'Your Normal attacks deal +2 damage.',
  },
  parental_bond: {
    name: 'Parental Bond',
    description: 'The first attack each turn triggers twice (second hit deals 50% damage).',
  },
  protective_instinct: {
    name: 'Protective Instinct',
    description: 'When an ally takes damage, gain 3 Block.',
  },
  family_fury: {
    name: 'Family Fury',
    description: 'When below 50% HP, ALL your attacks trigger Parental Bond.',
  },
  // Persian (Giovanni) - placeholder passives
  technician: {
    name: 'Technician',
    description: '+5 Max HP (placeholder passive).',
  },
  // Nidoking line - "Rampage"
  // anger_point shared with Tauros (L2)
  toxic_horn: {
    name: 'Toxic Horn',
    description: 'When attacking poisoned enemies, gain Strength equal to total damage dealt / 4.',
  },
  sheer_force: {
    name: 'Sheer Force',
    description: 'Your attacks deal 30% more damage. Your moves cannot apply status effects.',
  },
  // Nidoqueen line - "Matriarch"
  // thick_hide shared with Tauros (L2)
  protective_toxins: {
    name: 'Protective Toxins',
    description: 'When attacking poisoned enemies, all allies gain Block equal to half the damage dealt.',
  },
  // Rhyhorn/Rhydon line
  rock_head: {
    name: 'Rock Head',
    description: 'You take no recoil damage from your attacks.',
  },
  lightning_rod: {
    name: 'Lightning Rod',
    description: 'Electric attacks targeting allies hit you instead.',
  },
  reckless: {
    name: 'Reckless',
    description: 'Your recoil moves deal 30% more damage.',
  },
};

// Charmander progression tree
export const CHARMANDER_PROGRESSION: ProgressionTree = {
  baseFormId: 'charmander',
  rungs: [
    {
      level: 1,
      name: 'Charmander',
      description: 'Starting form with Kindling passive.',
      passiveId: 'kindling',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Charmeleon',
      description: 'Evolve to Charmeleon (+10 HP). Add Flamethrower. Gain Spreading Flames.',
      evolvesTo: 'charmeleon',
      passiveId: 'spreading_flames',
      hpBoost: 0,  // HP increase comes from Charmeleon's base stats
      cardsToAdd: ['flamethrower'],
    },
    {
      level: 3,
      name: 'Charizard',
      description: 'Evolve to Charizard (+10 HP). Add Fire Blast. Gain Blaze Strike.',
      evolvesTo: 'charizard',
      passiveId: 'blaze_strike',
      hpBoost: 0,  // HP increase comes from Charizard's base stats
      cardsToAdd: ['fire-blast'],
    },
    {
      level: 4,
      name: 'Charizard (Mastered)',
      description: 'Gain Inferno Momentum.',
      passiveId: 'inferno_momentum',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Bulbasaur progression tree - leech-based sustain theme
export const BULBASAUR_PROGRESSION: ProgressionTree = {
  baseFormId: 'bulbasaur',
  rungs: [
    {
      level: 1,
      name: 'Bulbasaur',
      description: 'Starting form with Baby Vines passive.',
      passiveId: 'baby_vines',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Ivysaur',
      description: 'Evolve to Ivysaur (+10 HP). Add 2x Razor Leaf. Gain Spreading Spores.',
      evolvesTo: 'ivysaur',
      passiveId: 'spreading_spores',
      hpBoost: 0,  // HP increase comes from Ivysaur's base stats
      cardsToAdd: ['razor-leaf', 'razor-leaf'],
    },
    {
      level: 3,
      name: 'Venusaur',
      description: 'Evolve to Venusaur (+10 HP). Add Solar Beam. Gain Overgrow Heal.',
      evolvesTo: 'venusaur',
      passiveId: 'overgrow_heal',
      hpBoost: 0,  // HP increase comes from Venusaur's base stats
      cardsToAdd: ['solar-beam'],
    },
    {
      level: 4,
      name: 'Venusaur (Mastered)',
      description: 'Gain Blooming Cycle.',
      passiveId: 'blooming_cycle',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Squirtle progression tree - defensive/water-based theme
export const SQUIRTLE_PROGRESSION: ProgressionTree = {
  baseFormId: 'squirtle',
  rungs: [
    {
      level: 1,
      name: 'Squirtle',
      description: 'Starting form with Baby Shell passive.',
      passiveId: 'baby_shell',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Wartortle',
      description: 'Evolve to Wartortle (+10 HP). Add Bubble Beam. Gain Pressure Hull.',
      evolvesTo: 'wartortle',
      passiveId: 'pressure_hull',
      hpBoost: 0,  // HP increase comes from Wartortle's base stats
      cardsToAdd: ['bubble-beam'],
    },
    {
      level: 3,
      name: 'Blastoise',
      description: 'Evolve to Blastoise (+10 HP). Add Hydro Pump. Gain Torrent Shield.',
      evolvesTo: 'blastoise',
      passiveId: 'torrent_shield',
      hpBoost: 0,  // HP increase comes from Blastoise's base stats
      cardsToAdd: ['hydro-pump'],
    },
    {
      level: 4,
      name: 'Blastoise (Mastered)',
      description: 'Gain Fortified Cannons.',
      passiveId: 'fortified_cannons',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Pikachu progression tree - speed/paralysis theme with Raichu evolution tradeoff
export const PIKACHU_PROGRESSION: ProgressionTree = {
  baseFormId: 'pikachu',
  rungs: [
    {
      level: 1,
      name: 'Pikachu',
      description: 'Starting form with Numbing Strike passive.',
      passiveId: 'numbing_strike',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Pikachu',
      description: 'Gain Static Field.',
      passiveId: 'static_field',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Pikachu',
      description: 'Gain Counter-Current.',
      passiveId: 'counter_current',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 4,
      name: 'Raichu',
      description: 'Evolve to Raichu (+20 HP, -2 Speed). Add Body Slam, Mega Punch, Thunder.',
      evolvesTo: 'raichu',
      passiveId: 'none',  // No new passive, retains all previous
      hpBoost: 0,  // HP increase comes from Raichu's base stats
      cardsToAdd: ['body-slam', 'mega-punch', 'thunder'],
    },
  ],
};

// Pidgey progression tree - speed manipulation, AoE wind attacks
export const PIDGEY_PROGRESSION: ProgressionTree = {
  baseFormId: 'pidgey',
  rungs: [
    {
      level: 1,
      name: 'Pidgey',
      description: 'Starting form with Gust Force passive.',
      passiveId: 'gust_force',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Pidgeotto',
      description: 'Evolve to Pidgeotto. Gain Keen Eye.',
      evolvesTo: 'pidgeotto',
      passiveId: 'keen_eye',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Pidgeot',
      description: 'Evolve to Pidgeot. Add Razor Wind. Gain Whipping Winds.',
      evolvesTo: 'pidgeot',
      passiveId: 'whipping_winds',
      hpBoost: 0,
      cardsToAdd: ['razor-wind'],
    },
    {
      level: 4,
      name: 'Pidgeot (Mastered)',
      description: 'Gain Slipstream.',
      passiveId: 'slipstream',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Rattata progression tree - multi-hit frenzy, speed advantage
export const RATTATA_PROGRESSION: ProgressionTree = {
  baseFormId: 'rattata',
  rungs: [
    {
      level: 1,
      name: 'Rattata',
      description: 'Starting form. Gain Scurry.',
      passiveId: 'scurry',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Rattata',
      description: 'Add Fury Swipes. Gain Quick Feet.',
      passiveId: 'quick_feet',
      hpBoost: 0,
      cardsToAdd: ['fury-swipes'],
    },
    {
      level: 3,
      name: 'Raticate',
      description: 'Evolve to Raticate. Gain Underdog.',
      evolvesTo: 'raticate',
      passiveId: 'underdog',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 4,
      name: 'Raticate (Mastered)',
      description: 'Gain Hustle.',
      passiveId: 'hustle',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Ekans progression tree - poison stacking, debuff on combat start
export const EKANS_PROGRESSION: ProgressionTree = {
  baseFormId: 'ekans',
  rungs: [
    {
      level: 1,
      name: 'Ekans',
      description: 'Starting form with Shed Skin passive.',
      passiveId: 'shed_skin',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Ekans',
      description: 'Add Sludge. Gain Poison Point.',
      passiveId: 'poison_point',
      hpBoost: 0,
      cardsToAdd: ['sludge'],
    },
    {
      level: 3,
      name: 'Arbok',
      description: 'Evolve to Arbok. Add Toxic. Gain Intimidate.',
      evolvesTo: 'arbok',
      passiveId: 'intimidate',
      hpBoost: 0,
      cardsToAdd: ['toxic'],
    },
    {
      level: 4,
      name: 'Arbok (Mastered)',
      description: "Gain Predator's Patience.",
      passiveId: 'predators_patience',
      hpBoost: 0,
      cardsToAdd: [],
    },
  ],
};

// Tauros progression tree - anger/rage theme (no evolution)
export const TAUROS_PROGRESSION: ProgressionTree = {
  baseFormId: 'tauros',
  rungs: [
    {
      level: 1,
      name: 'Tauros',
      description: 'Starting form with Thick Hide passive.',
      passiveId: 'thick_hide',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Tauros',
      description: 'Gain Anger Point.',
      passiveId: 'anger_point',
      hpBoost: 5,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Tauros',
      description: 'Add Double-Edge. Gain Intimidate.',
      passiveId: 'intimidate',
      hpBoost: 5,
      cardsToAdd: ['double-edge'],
    },
    {
      level: 4,
      name: 'Tauros (Mastered)',
      description: 'Gain Raging Bull.',
      passiveId: 'raging_bull',
      hpBoost: 5,
      cardsToAdd: [],
    },
  ],
};

// Snorlax progression tree - rest/recovery theme (no evolution)
export const SNORLAX_PROGRESSION: ProgressionTree = {
  baseFormId: 'snorlax',
  rungs: [
    {
      level: 1,
      name: 'Snorlax',
      description: 'Starting form with Immunity passive.',
      passiveId: 'immunity',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Snorlax',
      description: 'Gain Thick Fat.',
      passiveId: 'thick_fat',
      hpBoost: 10,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Snorlax',
      description: 'Add Body Slam. Gain Leftovers.',
      passiveId: 'leftovers',
      hpBoost: 10,
      cardsToAdd: ['body-slam'],
    },
    {
      level: 4,
      name: 'Snorlax (Mastered)',
      description: 'Gain Power Nap.',
      passiveId: 'power_nap',
      hpBoost: 10,
      cardsToAdd: [],
    },
  ],
};

// Kangaskhan progression tree - parental bond/multi-hit (no evolution)
export const KANGASKHAN_PROGRESSION: ProgressionTree = {
  baseFormId: 'kangaskhan',
  rungs: [
    {
      level: 1,
      name: 'Kangaskhan',
      description: 'Starting form with Scrappy passive.',
      passiveId: 'scrappy',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Kangaskhan',
      description: 'Gain Parental Bond.',
      passiveId: 'parental_bond',
      hpBoost: 5,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Kangaskhan',
      description: 'Add Body Slam. Gain Protective Instinct.',
      passiveId: 'protective_instinct',
      hpBoost: 5,
      cardsToAdd: ['body-slam'],
    },
    {
      level: 4,
      name: 'Kangaskhan (Mastered)',
      description: 'Gain Family Fury.',
      passiveId: 'family_fury',
      hpBoost: 5,
      cardsToAdd: [],
    },
  ],
};

// Persian progression tree (Giovanni's Pokemon - placeholder)
export const PERSIAN_PROGRESSION: ProgressionTree = {
  baseFormId: 'persian',
  rungs: [
    {
      level: 1,
      name: 'Persian',
      description: 'Starting form with Technician passive.',
      passiveId: 'technician',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Persian',
      description: '+5 Max HP.',
      passiveId: 'technician',
      hpBoost: 5,
      cardsToAdd: [],
    },
    {
      level: 3,
      name: 'Persian',
      description: '+5 Max HP.',
      passiveId: 'technician',
      hpBoost: 5,
      cardsToAdd: [],
    },
    {
      level: 4,
      name: 'Persian (Mastered)',
      description: '+5 Max HP.',
      passiveId: 'technician',
      hpBoost: 5,
      cardsToAdd: [],
    },
  ],
};

// Nidoran♂ progression tree - "Rampage" offensive poison synergy
export const NIDORAN_M_PROGRESSION: ProgressionTree = {
  baseFormId: 'nidoran-m',
  rungs: [
    {
      level: 1,
      name: 'Nidoran♂',
      description: 'Starting form with Poison Point passive.',
      passiveId: 'poison_point',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Nidorino',
      description: 'Evolve to Nidorino. Add Sludge Bomb. Gain Anger Point.',
      evolvesTo: 'nidorino',
      passiveId: 'anger_point',
      hpBoost: 0,
      cardsToAdd: ['sludge-bomb'],
    },
    {
      level: 3,
      name: 'Nidoking',
      description: 'Evolve to Nidoking. Add Earthquake. Gain Toxic Horn.',
      evolvesTo: 'nidoking',
      passiveId: 'toxic_horn',
      hpBoost: 0,
      cardsToAdd: ['earthquake'],
    },
    {
      level: 4,
      name: 'Nidoking (Mastered)',
      description: 'Add Megahorn. Gain Sheer Force.',
      passiveId: 'sheer_force',
      hpBoost: 0,
      cardsToAdd: ['megahorn'],
    },
  ],
};

// Nidoran♀ progression tree - "Matriarch" defensive poison synergy
export const NIDORAN_F_PROGRESSION: ProgressionTree = {
  baseFormId: 'nidoran-f',
  rungs: [
    {
      level: 1,
      name: 'Nidoran♀',
      description: 'Starting form with Poison Point passive.',
      passiveId: 'poison_point',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Nidorina',
      description: 'Evolve to Nidorina. Add Sludge. Gain Thick Hide.',
      evolvesTo: 'nidorina',
      passiveId: 'thick_hide',
      hpBoost: 0,
      cardsToAdd: ['sludge'],
    },
    {
      level: 3,
      name: 'Nidoqueen',
      description: 'Evolve to Nidoqueen. Add Earthquake. Gain Protective Toxins.',
      evolvesTo: 'nidoqueen',
      passiveId: 'protective_toxins',
      hpBoost: 0,
      cardsToAdd: ['earthquake'],
    },
    {
      level: 4,
      name: 'Nidoqueen (Mastered)',
      description: 'Add Body Slam. Gain Sheer Force.',
      passiveId: 'sheer_force',
      hpBoost: 0,
      cardsToAdd: ['body-slam'],
    },
  ],
};

// Rhyhorn → Rhydon progression tree
export const RHYHORN_PROGRESSION: ProgressionTree = {
  baseFormId: 'rhyhorn',
  rungs: [
    {
      level: 1,
      name: 'Rhyhorn',
      description: 'Starting form with Thick Hide passive.',
      passiveId: 'thick_hide',
      hpBoost: 0,
      cardsToAdd: [],
    },
    {
      level: 2,
      name: 'Rhyhorn',
      description: 'Add Take-Down. Gain Rock Head.',
      passiveId: 'rock_head',
      hpBoost: 0,
      cardsToAdd: ['take-down'],
    },
    {
      level: 3,
      name: 'Rhydon',
      description: 'Evolve to Rhydon. Add Earthquake. Gain Lightning Rod.',
      evolvesTo: 'rhydon',
      passiveId: 'lightning_rod',
      hpBoost: 0,
      cardsToAdd: ['earthquake'],
    },
    {
      level: 4,
      name: 'Rhydon (Mastered)',
      description: 'Add Double-Edge. Gain Reckless.',
      passiveId: 'reckless',
      hpBoost: 0,
      cardsToAdd: ['double-edge'],
    },
  ],
};

// All progression trees indexed by base form ID
export const PROGRESSION_TREES: Record<string, ProgressionTree> = {
  charmander: CHARMANDER_PROGRESSION,
  bulbasaur: BULBASAUR_PROGRESSION,
  squirtle: SQUIRTLE_PROGRESSION,
  pikachu: PIKACHU_PROGRESSION,
  pidgey: PIDGEY_PROGRESSION,
  rattata: RATTATA_PROGRESSION,
  ekans: EKANS_PROGRESSION,
  tauros: TAUROS_PROGRESSION,
  snorlax: SNORLAX_PROGRESSION,
  kangaskhan: KANGASKHAN_PROGRESSION,
  persian: PERSIAN_PROGRESSION,
  'nidoran-m': NIDORAN_M_PROGRESSION,
  'nidoran-f': NIDORAN_F_PROGRESSION,
  rhyhorn: RHYHORN_PROGRESSION,
};

/**
 * Get the progression tree for a Pokemon.
 * Returns the tree based on the base form (handles evolved forms too).
 */
export function getProgressionTree(pokemonId: string): ProgressionTree | null {
  // Direct match
  if (PROGRESSION_TREES[pokemonId]) {
    return PROGRESSION_TREES[pokemonId];
  }
  // Check if this is an evolved form
  if (pokemonId === 'charmeleon' || pokemonId === 'charizard') {
    return CHARMANDER_PROGRESSION;
  }
  if (pokemonId === 'wartortle' || pokemonId === 'blastoise') {
    return SQUIRTLE_PROGRESSION;
  }
  if (pokemonId === 'ivysaur' || pokemonId === 'venusaur') {
    return BULBASAUR_PROGRESSION;
  }
  if (pokemonId === 'raichu') {
    return PIKACHU_PROGRESSION;
  }
  if (pokemonId === 'pidgeotto' || pokemonId === 'pidgeot') {
    return PIDGEY_PROGRESSION;
  }
  if (pokemonId === 'raticate') {
    return RATTATA_PROGRESSION;
  }
  if (pokemonId === 'arbok') {
    return EKANS_PROGRESSION;
  }
  if (pokemonId === 'nidorino' || pokemonId === 'nidoking') {
    return NIDORAN_M_PROGRESSION;
  }
  if (pokemonId === 'nidorina' || pokemonId === 'nidoqueen') {
    return NIDORAN_F_PROGRESSION;
  }
  return null;
}

/**
 * Get the base form ID for any form in a progression line.
 */
export function getBaseFormId(pokemonId: string): string {
  if (pokemonId === 'charmeleon' || pokemonId === 'charizard') {
    return 'charmander';
  }
  if (pokemonId === 'wartortle' || pokemonId === 'blastoise') {
    return 'squirtle';
  }
  if (pokemonId === 'ivysaur' || pokemonId === 'venusaur') {
    return 'bulbasaur';
  }
  if (pokemonId === 'raichu') {
    return 'pikachu';
  }
  if (pokemonId === 'pidgeotto' || pokemonId === 'pidgeot') {
    return 'pidgey';
  }
  if (pokemonId === 'raticate') {
    return 'rattata';
  }
  if (pokemonId === 'arbok') {
    return 'ekans';
  }
  if (pokemonId === 'nidorino' || pokemonId === 'nidoking') {
    return 'nidoran-m';
  }
  if (pokemonId === 'nidorina' || pokemonId === 'nidoqueen') {
    return 'nidoran-f';
  }
  return pokemonId;
}

/**
 * Get the rung for a specific level.
 */
export function getRungForLevel(tree: ProgressionTree, level: number): ProgressionRung | null {
  return tree.rungs.find(r => r.level === level) ?? null;
}

/**
 * Check if a Pokemon can level up (has enough EXP).
 * Requires 3 EXP per level up (for Act 1/2 pacing).
 */
export function canLevelUp(level: number, exp: number): boolean {
  // Max level is 4
  if (level >= 4) return false;
  // Need at least 3 EXP to level up
  return exp >= 3;
}
