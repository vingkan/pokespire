import act1Bg from '../../../../assets/backgrounds/campaign_1_act_1_map_background.jpg';
import act2Bg from '../../../../assets/backgrounds/campaign_1_act_2_map_background.jpg';

export interface ActMapConfig {
  backgroundImage: string;
  tintColor: string;       // RGBA overlay tint
  ambientColor: string;    // Particle / glow base color
  title: string;
  bossNodeId: string;
  bossName: string;
}

const ACT_MAP_CONFIGS: Record<number, ActMapConfig> = {
  1: {
    backgroundImage: act1Bg,
    tintColor: 'rgba(10, 30, 15, 0.4)',
    ambientColor: '#4ade80',
    title: 'Act 1 — Rocket Lab',
    bossNodeId: 's6-boss-giovanni',
    bossName: 'Giovanni',
  },
  2: {
    backgroundImage: act2Bg,
    tintColor: 'rgba(25, 10, 35, 0.4)',
    ambientColor: '#a855f7',
    title: 'Act 2 — The Depths',
    bossNodeId: 'a2-s6-boss-mewtwo',
    bossName: 'Mewtwo',
  },
};

export function getActMapConfig(act: number): ActMapConfig {
  return ACT_MAP_CONFIGS[act] ?? ACT_MAP_CONFIGS[1];
}
