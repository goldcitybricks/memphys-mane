// The game is built as a set of play modes that missions plug into. The brawler, the 1-on-1 fight, driving and the shooter exist;
// the rest are listed so the structure is ready for them.
export type ModeId = 'hub' | 'brawler' | 'fight' | 'driving' | 'shooter';

export interface MissionDef {
  id: string;
  number: number;
  title: string;
  mode: ModeId;
  scene: string; // Phaser scene key that runs it
  available: boolean;
  enemyLabel?: string; // results screen rows
  hazardLabel?: string;
}

export const MISSIONS: MissionDef[] = [
  { id: 'm1-the-sip', number: 1, title: 'THE SIP', mode: 'brawler', scene: 'Mission1', available: true, enemyLabel: 'SHIESTY BOYS KO', hazardLabel: 'DRIVE-OUT KOS' },
  { id: 'm2-old-memphis', number: 2, title: 'OLD MEMPHIS', mode: 'brawler', scene: 'Mission2', available: true, enemyLabel: 'JACKALS KO', hazardLabel: 'CHARIOT KOS' },
  { id: 'm3-fight-night', number: 3, title: 'FIGHT NIGHT', mode: 'fight', scene: 'Mission3', available: true, enemyLabel: 'KNOCKDOWNS', hazardLabel: 'DODGE COUNTERS' },
  { id: 'm4-bridge-run', number: 4, title: 'BRIDGE RUN', mode: 'driving', scene: 'Mission4', available: true, enemyLabel: 'AETHERCARS SPUN', hazardLabel: 'TANKER RAMS' },
  { id: 'm5-the-plant', number: 5, title: 'THE PLANT', mode: 'shooter', scene: 'Mission5', available: true, enemyLabel: 'DRIFTERS HYDRATED', hazardLabel: 'PIPS RECYCLED' },
  { id: 'm6-beale-below', number: 6, title: 'BEALE BELOW', mode: 'brawler', scene: 'Mission6', available: true, enemyLabel: 'DRILL CREW KO', hazardLabel: 'DRILL CART KOS' },
  { id: 'm7-crowe-live', number: 7, title: 'CROWE LIVE', mode: 'fight', scene: 'Mission7', available: true, enemyLabel: 'KNOCKDOWNS', hazardLabel: 'DODGE COUNTERS' },
  { id: 'm8-the-loop', number: 8, title: 'THE LOOP', mode: 'driving', scene: 'Mission8', available: true, enemyLabel: 'AETHERCARS SPUN', hazardLabel: 'GOLD LIGHTS' },
  { id: 'm9-the-gigantum', number: 9, title: 'THE GIGANTUM', mode: 'shooter', scene: 'Mission9', available: true, enemyLabel: 'TECHS HYDRATED', hazardLabel: 'DRONES DOWN' },
  { id: 'm10-the-source', number: 10, title: 'THE SOURCE', mode: 'brawler', scene: 'Mission10', available: true, enemyLabel: 'PIPS RECYCLED', hazardLabel: 'ON-BEAT HITS' },
];

// Hooks for later features (not built yet): leaderboards by neighborhood, Join the Keepers email save, promo codes.
export interface Services {
  submitScore?(missionId: string, score: number, neighborhood?: string): Promise<void>;
  redeemPromoCode?(code: string): Promise<string | null>;
}

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
export const nextMission = (id: string) => MISSIONS[MISSIONS.findIndex((m) => m.id === id) + 1];
