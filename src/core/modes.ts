// The game is built as a set of play modes that missions plug into. Only the brawler exists so far;
// the rest are listed so the structure is ready for them.
export type ModeId = 'hub' | 'brawler' | 'fight' | 'driving' | 'shooter';

export interface MissionDef {
  id: string;
  number: number;
  title: string;
  mode: ModeId;
  scene: string; // Phaser scene key that runs it
  available: boolean;
}

export const MISSIONS: MissionDef[] = [
  { id: 'm1-the-sip', number: 1, title: 'THE SIP', mode: 'brawler', scene: 'Mission1', available: true },
  { id: 'm2-old-memphis', number: 2, title: 'OLD MEMPHIS', mode: 'brawler', scene: 'Mission2', available: false },
  { id: 'm3-fight-night', number: 3, title: 'FIGHT NIGHT', mode: 'fight', scene: 'Mission3', available: false },
  { id: 'm4-bridge-run', number: 4, title: 'BRIDGE RUN', mode: 'driving', scene: 'Mission4', available: false },
  { id: 'm5-the-plant', number: 5, title: 'THE PLANT', mode: 'shooter', scene: 'Mission5', available: false },
];

// Hooks for later features (not built yet): leaderboards by neighborhood, Join the Keepers email save, promo codes.
export interface Services {
  submitScore?(missionId: string, score: number, neighborhood?: string): Promise<void>;
  redeemPromoCode?(code: string): Promise<string | null>;
}
