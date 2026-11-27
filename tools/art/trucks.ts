// Missions 4 and 8: 18-wheelers in traffic and the Tennessee State Trooper who chases you for speeding.
// Everything is seen from behind like the rest of the driving traffic. The trailers carry made-up or
// in-game names only (no real carrier logos). Reference: white dry vans, a red cab, a white cab pulling a
// green shipping container, a blue cab, and a white and navy pickup trooper truck with a camper shell.
import { Pix, RGBA, hex, mix } from './pix';
import { P } from './palette';

const INK = P.ink;
const TIRE = hex('#16161c'), TIRE_HI = hex('#2e2e36');
const TAIL = hex('#d42828'), TAIL_HI = hex('#ff7a6a');
const CHROME_TANK = hex('#c8ccd4');
const STEEL = hex('#3a3e4a'), STEEL_HI = hex('#5a6070');
const TAPE_R = hex('#d43030'), TAPE_W = hex('#f4f4f4');

// a 3x5 micro font for decals too small for the 5x7 one
const MICRO: Record<string, string> = {
  A: '010 101 111 101 101', B: '110 101 110 101 110', C: '011 100 100 100 011', D: '110 101 101 101 110',
  E: '111 100 110 100 111', F: '111 100 110 100 100', G: '011 100 101 101 011', H: '101 101 111 101 101',
  I: '111 010 010 010 111', K: '101 101 110 101 101', L: '100 100 100 100 111', M: '101 111 111 101 101',
  N: '110 101 101 101 101', O: '010 101 101 101 010', P: '110 101 110 100 100', R: '110 101 110 101 101',
  S: '011 100 010 001 110', T: '111 010 010 010 010', U: '101 101 101 101 111', W: '101 101 111 111 101',
  X: '101 101 010 101 101', Y: '101 101 010 010 010', Z: '111 001 010 100 111', ' ': '000 000 000 000 000',
  '0': '111 101 101 101 111', '1': '010 110 010 010 111', '2': '110 001 010 100 111', '3': '110 001 010 001 110',
  '4': '101 101 111 001 001', '5': '111 100 110 001 110', '7': '111 001 010 010 010', '9': '111 101 111 001 110',
  '-': '000 000 111 000 000', '.': '000 000 000 000 010',
};
export const microWidth = (s: string) => s.length * 4 - 1;
export function micro(g: Pix, s: string, x: number, y: number, c: RGBA) {
  for (const ch of s) {
    const rows = (MICRO[ch] ?? MICRO[' ']).split(' ');
    rows.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '1') g.set(x + i, y + j, c); });
    x += 4;
  }
}
const microC = (g: Pix, s: string, cx: number, y: number, c: RGBA) => micro(g, s, Math.round(cx - microWidth(s) / 2), y, c);

// ------------------------------------------------------------------ 18-wheelers from behind (88x104)
// Frames: yaw left, straight, yaw right (like the cars). Turned a little, you see down the trailer's side
// to the cab up front, so a red cab still reads as a red cab from behind. The mirrors stick out past the
// trailer in the cab's color.
export type SemiStyle = {
  cab: RGBA; cabD: RGBA;
  trailer: 'van' | 'container';
  box: RGBA; boxD: RGBA; // the trailer or container
  decal?: (g: Pix, cx: number) => void; // whatever is painted on the doors
};

export function semiFrames(st: SemiStyle): Pix[] {
  return [-1, 0, 1].map((yaw) => {
    const g = new Pix(88, 104);
    const cx = 44 + yaw;
    const L = cx - 40, R = cx + 39; // trailer edges
    const top = 6, bot = 80;
    const hi = mix(st.box, P.white, 0.5);
    // turned: the trailer's side runs off toward the cab
    if (yaw !== 0) {
      const sx = yaw < 0 ? R + 1 : L - 4; // the side we see
      const d = yaw < 0 ? 1 : -1;
      for (let i = 0; i < 4; i++) g.vline(sx + i, top + 2 + i, bot - 2 - i, i < 2 ? st.boxD : mix(st.boxD, INK, 0.3));
      // the cab's corner up front, low and in its own color, with a fuel tank
      const cxs = yaw < 0 ? R + 2 : L - 6;
      g.rect(cxs, 52, 5, 22, st.cab); g.vline(cxs + (d > 0 ? 4 : 0), 52, 73, st.cabD);
      g.rect(cxs, 74, 5, 4, CHROME_TANK);
    }
    // mirrors on both sides, in the cab's color
    for (const s of [-1, 1]) {
      const mx = s < 0 ? L - 4 : R + 1;
      g.rect(mx, 44, 4, 10, st.cab); g.rect(mx + (s < 0 ? 0 : 1), 45, 3, 8, hex('#c8d0dc'));
      g.hline(s < 0 ? mx + 3 : mx - 1, s < 0 ? mx + 4 : mx, 50, st.cabD);
    }
    // the rear of the trailer
    g.rect(L, top, R - L + 1, bot - top, st.box);
    g.hline(L, R, top, hi);
    g.rect(L, top, 3, bot - top, st.boxD); g.rect(R - 2, top, 3, bot - top, st.boxD); // corner posts
    g.rect(L, top, R - L + 1, 3, st.boxD); // header
    g.rect(L, bot - 5, R - L + 1, 5, STEEL); // sill
    if (st.trailer === 'van') {
      // two swing doors: center seam, four lock rods, hinges
      g.vline(cx, top + 3, bot - 6, st.boxD);
      for (const rx of [L + 10, cx - 8, cx + 8, R - 10]) {
        g.vline(rx, top + 4, bot - 7, STEEL_HI);
        g.rect(rx - 1, 40, 3, 3, STEEL); g.set(rx + 1, 43, STEEL);
      }
      for (const hy of [14, 34, 54, 70]) { g.rect(L + 3, hy, 3, 2, STEEL); g.rect(R - 5, hy, 3, 2, STEEL); }
    } else {
      // a shipping container: ribbed doors, four lock rods, corner castings
      for (let x = L + 4; x < R - 3; x += 3) g.vline(x, top + 4, bot - 7, st.boxD);
      g.vline(cx, top + 3, bot - 6, mix(st.boxD, INK, 0.4));
      for (const rx of [L + 9, cx - 7, cx + 7, R - 9]) { g.vline(rx, top + 4, bot - 7, STEEL_HI); g.rect(rx - 1, 42, 3, 4, STEEL); }
      for (const [x, y] of [[L, top], [R - 3, top], [L, bot - 9], [R - 3, bot - 9]] as const) { g.rect(x, y, 4, 4, mix(st.boxD, INK, 0.5)); g.set(x + 1, y + 1, INK); g.set(x + 2, y + 1, INK); }
    }
    st.decal?.(g, cx);
    // red and white reflective tape along the bottom and up the corners
    for (let x = L; x <= R; x++) g.set(x, bot - 6, Math.floor((x - L) / 5) % 2 ? TAPE_W : TAPE_R);
    for (let y = top + 1; y < top + 8; y++) { g.set(L + 1, y, y % 4 < 2 ? TAPE_R : TAPE_W); g.set(R - 1, y, y % 4 < 2 ? TAPE_R : TAPE_W); }
    // tail and marker lights
    for (const lx of [L + 3, R - 8]) { g.rect(lx, bot - 3, 6, 3, TAIL); g.hline(lx + 1, lx + 4, bot - 3, TAIL_HI); }
    for (const lx of [cx - 6, cx - 1, cx + 4]) g.rect(lx, top + 1, 2, 2, TAIL);
    // underneath: the frame, the dual tires and mud flaps, the underride bumper
    g.rect(L + 6, bot, R - L - 11, 6, hex('#22242c'));
    for (const tx of [L + 2, L + 13, R - 22, R - 11]) { g.rect(tx, bot + 2, 10, 20, TIRE); g.hline(tx + 1, tx + 8, bot + 3, TIRE_HI); }
    for (const fx of [L + 1, R - 11]) g.rect(fx, bot + 13, 11, 9, hex('#101014'));
    g.rect(L + 14, bot + 10, R - L - 27, 4, STEEL_HI); g.hline(L + 14, R - 14, bot + 13, STEEL);
    for (const px of [L + 22, R - 22]) g.vline(px, bot + 5, bot + 10, STEEL);
    g.rect(cx - 7, bot + 1, 14, 6, hex('#f2efe0')); g.hline(cx - 5, cx + 4, bot + 3, hex('#5a6276')); // plate
    g.outline(INK);
    return g;
  });
}

// the trailer names: made up, or ours
function slantWord(g: Pix, s: string, cx: number, y: number, c: RGBA) {
  // a forward-leaning wordmark: the micro font drawn twice as big, each row nudged right as it goes up
  const w = microWidth(s) * 2;
  const x0 = Math.round(cx - w / 2);
  let x = x0;
  for (const ch of s) {
    const rows = (MICRO[ch] ?? MICRO[' ']).split(' ');
    rows.forEach((r, j) => {
      const lean = Math.floor((4 - j) / 2);
      for (let i = 0; i < 3; i++) if (r[i] === '1') g.rect(x + i * 2 + lean, y + j * 2, 2, 2, c);
    });
    x += 8;
  }
}
export const SEMIS: Record<string, SemiStyle> = {
  // white Volvo-style cab, white dry van with MEMPHYS on the doors
  semiMemphys: {
    cab: hex('#eef0f4'), cabD: hex('#a8acb8'), trailer: 'van', box: hex('#e8eaee'), boxD: hex('#b4b8c4'),
    decal: (g, cx) => {
      g.rect(cx - 30, 20, 61, 20, P.ink); g.rect(cx - 29, 21, 59, 18, hex('#1c2a5a'));
      g.hline(cx - 29, cx + 29, 21, P.gold); g.hline(cx - 29, cx + 29, 38, P.gold);
      microC(g, 'MEMPHYS', cx, 24, P.goldHi);
      microC(g, 'WATER', cx, 31, hex('#9ad4ff'));
    },
  },
  // red cab, white van with a dark slanted wordmark
  semiRed: {
    cab: hex('#c42a22'), cabD: hex('#7e1612'), trailer: 'van', box: hex('#e2e4e8'), boxD: hex('#aeb2bc'),
    decal: (g, cx) => { slantWord(g, 'BLUFF', cx, 18, hex('#3a3c48')); slantWord(g, 'CITY', cx, 30, hex('#c42a22')); },
  },
  // white cab pulling a green shipping container
  semiGreen: {
    cab: hex('#eef0f4'), cabD: hex('#a8acb8'), trailer: 'container', box: hex('#2f5a3c'), boxD: hex('#1e3e28'),
  },
  // blue cab, plain white van with a little orange stripe
  semiBlue: {
    cab: hex('#2a3c8a'), cabD: hex('#18245a'), trailer: 'van', box: hex('#eceef2'), boxD: hex('#b8bcc6'),
    decal: (g, cx) => { g.hline(cx - 30, cx + 30, 62, hex('#e07020')); g.hline(cx - 30, cx + 30, 63, hex('#e07020')); g.hline(cx - 30, cx + 30, 64, hex('#2a3c8a')); },
  },
};

// ------------------------------------------------------------------ the Tennessee State Trooper (72x48)
// A white full-size pickup with a dark navy camper shell and roof, a blue light bar, the gold TENNESSEE
// badge and STATE TROOPER on the tailgate. Frames: yaw left, straight, yaw right, then the same three with
// the lights on the other flash.
const NAVY = hex('#1a2240'), NAVY_HI = hex('#33406c'), TW = hex('#f2f2f0'), TW_D = hex('#b8bac2');
const BADGE = hex('#d8b25a'), BADGE_D = hex('#8a6a2a');
export function trooperFrames(): Pix[] {
  const out: Pix[] = [];
  for (const flash of [0, 1]) for (const yaw of [-1, 0, 1]) {
    const g = new Pix(72, 48);
    const cx = 36 + yaw, top = cx + yaw * 2;
    for (const tx of [cx - 29, cx + 20]) { g.rect(tx, 37, 10, 10, TIRE); g.hline(tx + 1, tx + 8, 38, TIRE_HI); }
    if (yaw !== 0) {
      // the side: white door, navy stripe
      const sx = yaw < 0 ? cx + 31 : cx - 34;
      g.rect(sx, 20, 4, 17, TW_D); g.hline(sx, sx + 3, 26, NAVY); g.hline(sx, sx + 3, 28, NAVY);
    }
    // the bed and tailgate
    g.rect(cx - 31, 20, 63, 18, TW);
    g.hline(cx - 30, cx + 30, 20, hex('#ffffff'));
    g.rect(cx - 31, 33, 63, 5, TW_D);
    g.rect(cx - 33, 37, 67, 4, hex('#2a2c34')); // bumper
    g.hline(cx - 33, cx + 33, 37, hex('#4a4e5a'));
    // taillights up the corners
    for (const lx of [cx - 31, cx + 28]) { g.rect(lx, 21, 4, 11, TAIL); g.vline(lx + 1, 22, 30, TAIL_HI); }
    // the navy pinstripes from the side wrap the corners
    g.hline(cx - 27, cx - 20, 23, NAVY); g.hline(cx + 20, cx + 27, 23, NAVY);
    // gold TENNESSEE badge and STATE TROOPER
    g.poly([[cx - 21, 22], [cx + 21, 22], [cx + 18, 29], [cx - 18, 29]], BADGE);
    g.hline(cx - 21, cx + 21, 22, hex('#f0d890')); g.hline(cx - 18, cx + 18, 29, BADGE_D);
    microC(g, 'TENNESSEE', cx, 23, hex('#1a1408'));
    microC(g, 'STATE TROOPER', cx, 31, NAVY);
    g.rect(cx - 5, 38, 10, 3, hex('#f2efe0'));
    // the camper shell and cab roof, dark navy, with the back glass
    g.poly([[top - 30, 20], [top - 27, 6], [top + 27, 6], [top + 30, 20]], NAVY);
    g.hline(top - 27, top + 27, 6, NAVY_HI);
    g.rect(top - 21, 9, 43, 9, hex('#0c1020')); g.line(top - 16, 16, top - 11, 10, hex('#2a3a60'));
    g.hline(top - 22, top + 22, 8, hex('#5a6276')); // the shell's trim
    // the light bar on the cab roof: blue and white, alternating
    const bl = hex('#2a6aff'), bh = hex('#9ad0ff'), wh = hex('#ffffff'), off = hex('#1a2a5a');
    g.rect(top - 17, 0, 35, 6, hex('#20242c'));
    for (let i = 0; i < 7; i++) {
      const on = (i < 3) !== (flash === 1);
      const c = i === 3 ? (flash ? wh : off) : on ? (i % 2 ? bh : bl) : off;
      g.rect(top - 16 + i * 5, 1, 4, 4, c);
    }
    // lights low on the bumper too
    g.rect(cx - 26, 38, 4, 2, flash ? off : bl); g.rect(cx + 23, 38, 4, 2, flash ? bl : off);
    g.outline(INK);
    out.push(g);
  }
  return out;
}

// the trooper in your rear-view mirror (32x20): the grille, the headlights and the flashing bar. Two frames.
export function trooperMirrorFrames(): Pix[] {
  return [0, 1].map((flash) => {
    const g = new Pix(32, 20);
    g.rect(4, 4, 24, 6, NAVY); // windshield and roof
    g.rect(6, 5, 20, 4, hex('#3e5678'));
    g.rect(2, 10, 28, 8, TW);
    g.rect(10, 11, 12, 5, hex('#2a2c34')); // grille
    g.rect(3, 11, 6, 3, hex('#fff6d0')); g.rect(23, 11, 6, 3, hex('#fff6d0'));
    g.rect(1, 16, 30, 3, hex('#2a2c34')); // push bar
    g.rect(6, 1, 9, 3, flash ? hex('#1a2a5a') : hex('#2a6aff'));
    g.rect(17, 1, 9, 3, flash ? hex('#2a6aff') : hex('#1a2a5a'));
    g.rect(15, 1, 2, 3, flash ? hex('#ffffff') : hex('#1a2a5a'));
    g.outline(INK);
    return g;
  });
}
