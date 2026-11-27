// Local-only progress for now. "Join the Keepers" (email save across devices) plugs in here later.
export interface MissionRecord { bestScore: number; bestTimeMs: number; clears: number }

const KEY = 'memphys-mane:v1';

function read(): Record<string, MissionRecord> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export const Save = {
  get(id: string): MissionRecord | undefined { return read()[id]; },
  record(id: string, score: number, timeMs: number): { newBest: boolean; rec: MissionRecord } {
    const all = read();
    const prev = all[id] ?? { bestScore: 0, bestTimeMs: 0, clears: 0 };
    const newBest = score > prev.bestScore;
    const rec: MissionRecord = {
      bestScore: Math.max(prev.bestScore, score),
      bestTimeMs: prev.bestTimeMs ? Math.min(prev.bestTimeMs, timeMs) : timeMs,
      clears: prev.clears + 1,
    };
    all[id] = rec;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private mode: fine */ }
    return { newBest, rec };
  },
  muted(): boolean { try { return localStorage.getItem(KEY + ':muted') === '1'; } catch { return false; } },
  setMuted(m: boolean) { try { localStorage.setItem(KEY + ':muted', m ? '1' : '0'); } catch { /* ignore */ } },
};
