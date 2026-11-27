// Mission 8, The Loop: I-240 at night while GigaZ makes the city forget. Signal gantries with one gold lane
// (the water remembering) and the rest stuck on GigaZ blue, overpasses, exit signs and a BBQ billboard that
// lose their words as Memphis forgets, O.G.'s gold car from behind, Pothole hanging out the window,
// Uncle T's Pit at Park & Airways for the intro, and The Gigantum at the end of the last exit.
// Generic shapes only: no real business names, no badges, no logos but the game's own.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { gigazFace, sedanRearFrames } from './drive';
import { drawPit } from './world';

const INK = P.ink;
const STEEL = hex('#3a4060'), STEEL_HI = hex('#5a6286'), STEEL_D = hex('#262b44');
const CONC = hex('#8a8e9a'), CONC_HI = hex('#b4b8c4'), CONC_D = hex('#5e6270');
const BLUE_LIT = hex('#3aa8ff'), BLUE_GLOW = hex('#2a7ad8'), BLUE_HI = hex('#c8ecff');
const GOLD_LIT = hex('#ffd23a');

// a 3-lamp signal head; the lit lamp is the bottom one ("go"), in gold or GigaZ blue
function signalHead(g: Pix, x: number, y: number, lit: 'gold' | 'blue') {
  g.rect(x - 5, y, 11, 24, hex('#14161e'));
  g.rect(x - 6, y - 1, 13, 2, hex('#20232e'));
  for (let k = 0; k < 3; k++) g.circle(x, y + 4 + k * 8, 3, hex('#262838'));
  const c = lit === 'gold' ? GOLD_LIT : BLUE_LIT;
  // the glow spills around the lit lamp
  g.ellipse(x, y + 20, 9, 8, lit === 'gold' ? [255, 210, 58, 70] : [58, 168, 255, 70]);
  g.circle(x, y + 20, 3, c);
  g.set(x - 1, y + 19, lit === 'gold' ? P.goldHi : BLUE_HI);
  // the visor over each lamp
  for (let k = 0; k < 3; k++) g.hline(x - 4, x + 4, y + 1 + k * 8, hex('#0a0b10'));
}

// ------------------------------------------------------------------ signal gantry over the whole road (160x64, drawn at scale 4)
// Frames 0 to 2: that lane is gold, the others blue. Frame 3: all gold (remembered). Frame 4: all blue.
export function gantryFrames(): Pix[] {
  const lanes = [42, 80, 118];
  return [0, 1, 2, 3, 4].map((f) => {
    const g = new Pix(160, 64);
    // legs on the barriers
    for (const lx of [8, 148]) { g.rect(lx, 6, 4, 58, STEEL); g.vline(lx, 6, 63, STEEL_HI); g.rect(lx - 2, 60, 8, 4, STEEL_D); }
    // the truss
    g.rect(6, 4, 148, 3, STEEL); g.rect(6, 11, 148, 2, STEEL);
    g.hline(6, 153, 4, STEEL_HI);
    for (let x = 8; x < 152; x += 6) g.line(x, 6, x + 3, 11, STEEL_D);
    lanes.forEach((x, i) => {
      const gold = f === 3 || f === i;
      g.vline(x, 13, 15, STEEL_D);
      signalHead(g, x, 16, gold ? 'gold' : 'blue');
    });
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ overpass crossing the interstate (240x90, drawn at scale 4)
export function overpass(): Pix {
  const g = new Pix(240, 90);
  // columns on each side, a pier in the median gap past the barriers
  for (const cx of [26, 214]) {
    g.rect(cx - 7, 22, 14, 68, CONC);
    g.vline(cx - 7, 22, 89, CONC_HI);
    g.vline(cx + 6, 22, 89, CONC_D);
    g.rect(cx - 10, 20, 20, 4, CONC_D);
  }
  // the deck: girder face, railing, a strip of light underneath
  g.rect(0, 6, 240, 14, CONC);
  g.hline(0, 239, 6, CONC_HI);
  g.rect(0, 16, 240, 4, CONC_D);
  for (let x = 2; x < 240; x += 5) g.vline(x, 1, 5, hex('#6e7280'));
  g.hline(0, 239, 1, hex('#9aa0b2'));
  // stains and drips
  const r = rng(808);
  for (let i = 0; i < 26; i++) { const x = Math.floor(r() * 236); g.vline(x, 8, 8 + Math.floor(r() * 8), mix(CONC, INK, 0.25)); }
  // sodium lamps under the deck
  for (const lx of [60, 120, 180]) { g.rect(lx - 3, 20, 6, 2, hex('#ffd890')); g.ellipse(lx, 23, 6, 2, [255, 200, 120, 60]); }
  // a little 901 tag on the girder
  text(g, '901', 98, 9, hex('#f5c542', 200));
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ interstate light pole for the median (24x96)
export function hwyLamp(): Pix {
  const g = new Pix(28, 96);
  g.rect(13, 10, 3, 86, STEEL); g.vline(13, 10, 95, STEEL_HI);
  // twin arms over both directions
  g.hline(3, 25, 9, STEEL); g.hline(3, 25, 10, STEEL_D);
  for (const hx of [2, 22]) { g.rect(hx, 8, 5, 3, STEEL); g.rect(hx, 11, 5, 2, hex('#ffd890')); g.hline(hx, hx + 4, 12, hex('#ffb850')); }
  g.rect(10, 92, 9, 4, STEEL_D);
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ green exit signs that forget their words (3 frames)
// Frame 0: the street. Frame 1: letters dropping out. Frame 2: blank.
const SIGN_G = hex('#1f7a3a');
function scramble(s: string, seed: number): string {
  const r = rng(seed);
  return [...s].map((ch) => (ch !== ' ' && r() < 0.45 ? '?' : ch)).join('');
}
function exitSignFrame(l1: string, l2: string, w: number, mode: 0 | 1 | 2, seed: number): Pix {
  const g = new Pix(w, 60);
  g.rect(w / 2 - 2, 32, 4, 28, hex('#8a8e98'));
  const bg = mode === 2 ? mix(SIGN_G, hex('#2a7ad8'), 0.35) : SIGN_G;
  g.rect(0, 0, w, 32, bg);
  const edge = mode === 2 ? hex('#a8d8ff') : P.white;
  g.hline(2, w - 3, 2, edge); g.hline(2, w - 3, 29, edge); g.vline(2, 2, 29, edge); g.vline(w - 3, 2, 29, edge);
  if (mode < 2) {
    const a = mode ? scramble(l1, seed) : l1, b = mode ? scramble(l2, seed + 7) : l2;
    text(g, a, Math.round(w / 2 - textWidth(a, 1) / 2), 7, P.white);
    text(g, b, Math.round(w / 2 - textWidth(b, 1) / 2), 18, mode ? hex('#bfe6ff') : P.white);
    // a little exit-tab on top
    g.rect(w - 30, -1, 26, 1, bg);
  }
  if (mode === 1) { const r = rng(seed + 3); for (let i = 0; i < 18; i++) g.set(4 + Math.floor(r() * (w - 8)), 4 + Math.floor(r() * 24), [92, 200, 255, 180]); }
  if (mode === 2) { const r = rng(seed + 5); for (let y = 5; y < 28; y += 3) g.hline(5 + Math.floor(r() * 10), w - 6 - Math.floor(r() * 10), y, [168, 216, 255, 50]); }
  g.outline(INK);
  return g;
}
export function exitSign(l1: string, l2 = 'NEXT EXIT'): Pix[] {
  const w = Math.max(textWidth(l1, 1), textWidth(l2, 1)) + 16;
  const seed = [...l1].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ([0, 1, 2] as const).map((m) => exitSignFrame(l1, l2, w, m, seed));
}

// the interstate shield, generic: a blue and red shield with the number (32x48)
export function shield240(): Pix {
  const g = new Pix(32, 50);
  g.rect(14, 30, 4, 20, hex('#8a8e98'));
  g.poly([[2, 4], [30, 4], [30, 20], [16, 32], [2, 20]], P.white);
  g.poly([[4, 10], [28, 10], [28, 19], [16, 29], [4, 19]], hex('#1c3f9a'));
  g.rect(4, 6, 25, 4, hex('#c8282e'));
  text(g, '240', 7, 13, P.white);
  text(g, 'LOOP', 5, 37, P.white);
  g.outline(INK);
  return g;
}

// the one sign that's always clear: The Gigantum, off the last exit (AetherCorp blue)
export function signGigantum(): Pix {
  const l1 = 'THE GIGANTUM', l2 = 'LAST EXIT';
  const w = textWidth(l1, 1) + 30;
  const g = new Pix(w, 60);
  g.rect(w / 2 - 2, 32, 4, 28, hex('#8a8e98'));
  g.rect(0, 0, w, 32, hex('#141c40'));
  g.hline(2, w - 3, 2, hex('#5ce1ff')); g.hline(2, w - 3, 29, hex('#5ce1ff')); g.vline(2, 2, 29, hex('#5ce1ff')); g.vline(w - 3, 2, 29, hex('#5ce1ff'));
  text(g, l1, 22, 7, P.white);
  text(g, l2, 22, 18, hex('#a8dcff'));
  gigazFace(g, 12, 15);
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ roadside billboards (120x76, 3 frames)
function boardBase(bg: RGBA, frame: RGBA): Pix {
  const g = new Pix(120, 76);
  g.rect(28, 50, 4, 26, hex('#2a2f48')); g.rect(88, 50, 4, 26, hex('#2a2f48'));
  g.rect(0, 0, 120, 52, frame);
  g.rect(3, 3, 114, 46, bg);
  g.rect(20, 50, 6, 2, hex('#ffd890')); g.rect(94, 50, 6, 2, hex('#ffd890'));
  return g;
}
function centered(g: Pix, s: string, y: number, c: RGBA, sc = 1) { text(g, s, Math.round(60 - textWidth(s, sc) / 2), y, c, sc); }
// a rib joint's board forgetting its own recipe. No business name, just the food.
export function bbqBoard(): Pix[] {
  return [0, 1, 2].map((m) => {
    const g = boardBase(m === 2 ? hex('#1a2440') : hex('#2a1410'), m === 2 ? hex('#7fb8e8') : hex('#d8641e'));
    if (m === 0) {
      centered(g, 'BAR-B-Q', 7, hex('#ffb050'), 2);
      centered(g, 'RIBS + WINGS', 27, P.white);
      centered(g, 'BBQ SPAGHETTI', 38, hex('#f5c542'));
      // a little smoke curl
      for (let k = 0; k < 4; k++) g.set(108 + (k % 2), 30 - k * 3, hex('#d8d2c8'));
    } else if (m === 1) {
      centered(g, 'BAR-?-Q', 7, hex('#ffb050'), 2);
      centered(g, 'R?BS + W??GS', 27, hex('#bfe6ff'));
      centered(g, 'BBQ SPA????TI', 38, hex('#7fb8e8'));
      const r = rng(31); for (let i = 0; i < 24; i++) g.set(4 + Math.floor(r() * 112), 4 + Math.floor(r() * 44), [92, 200, 255, 200]);
    } else {
      centered(g, 'SMOKED', 10, hex('#c8ecff'), 2);
      centered(g, 'PROTEIN?', 32, hex('#7fb8e8'));
      gigazFace(g, 106, 12);
    }
    g.outline(INK);
    return g;
  });
}
// the MEMPHYS board doesn't forget anything (1 frame)
export function boardRemembers(): Pix {
  const g = boardBase(hex('#1a1020'), P.gold);
  centered(g, 'MEMPHYS', 7, P.goldHi, 2);
  centered(g, 'THE WATER', 27, P.can);
  centered(g, 'REMEMBERS.', 37, P.can);
  // a drop
  g.circle(104, 32, 4, hex('#5cc8ff')); g.poly([[104, 24], [101, 30], [107, 30]], hex('#5cc8ff')); g.set(103, 31, P.white);
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ the barricade across the Gigantum exit (160x44, 2 frames)
export function barricadeFrames(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(160, 44);
    if (f === 0) {
      // a hard-light barrier between two emitter posts
      for (const px of [6, 150]) { g.rect(px, 6, 5, 38, hex('#d8dee8')); g.rect(px, 6, 5, 3, hex('#5ce1ff')); g.vline(px, 6, 43, P.white); }
      for (let y = 10; y < 40; y++) g.hline(11, 149, y, [58, 168, 255, y % 3 === 0 ? 150 : 90]);
      g.rect(30, 16, 100, 16, hex('#0e1838'));
      const s1 = 'AUTHORIZED', s2 = 'VEHICLES ONLY';
      text(g, s1, Math.round(80 - textWidth(s1) / 2), 17, P.white);
      text(g, s2, Math.round(80 - textWidth(s2) / 2), 25, hex('#a8dcff'));
      gigazFace(g, 20, 24); gigazFace(g, 140, 24);
    } else {
      // smashed: the posts bent, shards of light on the road
      g.line(8, 43, 2, 20, hex('#d8dee8'), 3); g.line(152, 43, 158, 22, hex('#d8dee8'), 3);
      const r = rng(77);
      for (let i = 0; i < 40; i++) { const x = 10 + Math.floor(r() * 140), y = 30 + Math.floor(r() * 13); g.rect(x, y, 2 + Math.floor(r() * 3), 1, [58, 168, 255, 200]); }
    }
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ O.G. Drive-Out's gold car from behind (64x40, 3 yaws)
export function ogRearFrames(): Pix[] {
  const frames = sedanRearFrames(P.gold, P.goldDark, 'infiniti');
  // O.G.'s hat in the back glass, and a 901 tag on the plate
  return frames.map((g, i) => {
    const top = 32 + (i - 1) * 3;
    g.rect(top - 10, 9, 9, 2, hex('#e8e4d8')); g.rect(top - 9, 7, 7, 2, hex('#e8e4d8')); g.hline(top - 9, top - 3, 8, P.redDark);
    for (let k = 0; k < 3; k++) g.set(32 + (i - 1) - 3 + k * 3, 26, P.ink);
    return g;
  });
}

// ------------------------------------------------------------------ Pothole with his head out the back window (24x20, 3 frames: ears flapping)
export function potholeWindow(): Pix[] {
  const fur = hex('#8a6a45'), furD = hex('#5e452b'), furL = hex('#b08c60');
  return [0, 1, 2].map((f) => {
    const g = new Pix(26, 20);
    // the head, looking forward and out to the right, mouth open in the wind
    g.ellipse(9, 11, 5, 5, fur);
    g.rect(12, 10, 6, 4, furL);
    g.set(18, 10, P.ink);
    g.set(9, 9, P.ink);
    g.rect(13, 14, 4, 2, P.redDark); g.set(16, 15, hex('#e86a7a')); // tongue out
    if (f !== 1) { g.set(17, 16, hex('#e86a7a')); g.set(17, 17, hex('#e86a7a')); }
    // both ears blown straight back and flapping
    const flap = [0, -2, 1][f];
    g.line(6, 7, 0, 4 + flap, furD, 2);
    g.line(7, 9, 1, 9 + flap * -1, furD, 2);
    // scruff in the wind
    g.set(4, 12, furL); g.set(3, 14, furL);
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ Uncle T's Pit at Park & Airways, night (520x146)
// The exact Mission 1 strip-mall front (drawPit in world.ts), so the Pit looks the same in every mission.
// The sign is also cut out as its own sprite (pitSign) so it can forget its name on top of this.
export function pitFront(): Pix {
  const g = new Pix(520, 146);
  drawPit(g, rng(31));
  return g;
}
// its sign, cut from the same render so frame 0 matches pitFront pixel for pixel (156x22, 3 frames):
// UNCLE T'S PIT, then it glitches, then it's GigaZ blue and forgets
export const PIT_SIGN = { x: 110, y: 58, w: 156, h: 22 };
export function pitSign(): Pix[] {
  const frames: [string, RGBA][] = [["UNCLE T'S PIT", hex('#c8282e')], ["UNC?E ?'S P?T", hex('#c8282e')], ['...PIT?', hex('#2a7ad8')]];
  return frames.map(([label, col], m) => {
    const full = new Pix(520, 146);
    drawPit(full, rng(31), 146, label, col);
    const g = new Pix(PIT_SIGN.w, PIT_SIGN.h);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.set(x, y, full.get(PIT_SIGN.x + x, PIT_SIGN.y + y));
    if (m === 1) { const r = rng(5); for (let i = 0; i < 18; i++) g.set(3 + Math.floor(r() * 150), 3 + Math.floor(r() * 16), [92, 200, 255, 220]); }
    return g;
  });
}
// the corner's street sign on its pole: PARK AVE over AIRWAYS BLVD, then blank (44x60, 3 frames)
export function streetSign(): Pix[] {
  return [0, 1, 2].map((m) => {
    const g = new Pix(48, 64);
    g.rect(22, 14, 3, 50, hex('#8a8e98'));
    const G = m === 2 ? hex('#2a4a7a') : hex('#1f7a3a');
    g.rect(0, 0, 48, 8, G); g.rect(4, 9, 40, 8, G);
    const a = ['PARK AVE', 'P?RK ?VE', ''][m], b = ['AIRWAYS', 'A??WAYS', ''][m];
    if (a) text(g, a, Math.round(24 - textWidth(a) / 2), 0, P.white);
    if (b) text(g, b, Math.round(24 - textWidth(b) / 2), 9, P.white);
    g.outline(INK);
    return g;
  });
}
// a corner traffic light on a mast arm, stuck on GigaZ blue (40x80, 2 frames: blue, gold)
export function cornerLight(): Pix[] {
  return (['blue', 'gold'] as const).map((c) => {
    const g = new Pix(40, 84);
    g.rect(32, 6, 3, 78, STEEL); g.vline(32, 6, 83, STEEL_HI);
    g.hline(10, 34, 6, STEEL); g.hline(10, 34, 7, STEEL_D);
    signalHead(g, 12, 9, c);
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ the sky and the far horizon from the Loop (tile horizontally)
export function loopSky(): Pix {
  const W = 512, g = new Pix(W, 216);
  const r = rng(240);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#050816'), hex('#1a2c6a'), Math.min(1, y / 110)));
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 70);
    g.set(x, y, r() > 0.85 ? hex('#ffcf7a') : hex('#c8d0ff', 140 + Math.floor(r() * 100)));
  }
  // long blue cloud bands: GigaZ's weather
  for (let b = 0; b < 5; b++) {
    const y = 30 + b * 13, x0 = Math.floor(r() * W);
    for (let k = 0; k < 9; k++) g.ellipse((x0 + k * 22) % W, y + Math.sin(k) * 3, 18, 3, [58, 140, 255, 26]);
  }
  return g;
}
export function loopFar(): Pix {
  const W = 1024, g = new Pix(W, 216);
  const r = rng(901);
  const base = 108;
  const bld = hex('#161b38'), lit = hex('#f2b950'), litDim = hex('#a8783a');
  // tree lines and rooftops along the loop
  for (let x = 0; x < W; x++) {
    const h = 5 + Math.round(Math.abs(Math.sin(x * 0.05) * 5 + Math.sin(x * 0.17) * 3));
    g.vline(x, base - h, base, hex('#0e1430'));
  }
  // houses and low shops
  for (let x = 10; x < W - 20; x += 18 + Math.floor(r() * 30)) {
    const w = 10 + Math.floor(r() * 14), h = 6 + Math.floor(r() * 8);
    g.rect(x, base - h, w, h, bld);
    g.poly([[x - 1, base - h], [x + w / 2, base - h - 4], [x + w + 1, base - h]], bld);
    if (r() > 0.4) g.rect(x + 3, base - h + 3, 2, 2, r() > 0.5 ? lit : litDim);
  }
  // downtown far off: a small cluster with the Pyramid
  for (const [x, w, h] of [[300, 10, 30], [312, 8, 42], [322, 12, 26], [336, 9, 36], [348, 7, 22]]) {
    g.rect(x, base - h, w, h, hex('#1c2448'));
    for (let wy = base - h + 3; wy < base - 2; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() > 0.55) g.set(wx, wy, r() > 0.8 ? lit : litDim);
  }
  for (let rr = 0; rr < 16; rr++) g.hline(372 - rr, 372 + rr, base - 16 + rr, mix(hex('#3a4478'), hex('#1e2448'), rr / 16));
  // a water tower
  g.rect(560, base - 26, 2, 26, bld); g.rect(570, base - 26, 2, 26, bld); g.ellipse(566, base - 30, 9, 6, hex('#1e2650')); g.hline(558, 574, base - 30, hex('#2c3668'));
  // way out past the last exit: the cold blue glow and GigaZ's cloud over it
  for (let k = 0; k < 22; k++) g.ellipse(820, base - 8, 90 - k * 4, 26 - k, [92, 180, 255, 9]);
  g.rect(780, base - 24, 80, 24, hex('#121836'));
  for (let x = 784; x < 856; x += 4) for (let y = base - 20; y < base - 2; y += 4) g.set(x, y, hex('#5ce1ff'));
  const C: RGBA = [200, 230, 255, 70];
  for (const [cx, cy, rr] of [[796, 52, 14], [820, 42, 20], [846, 52, 14], [820, 58, 16]]) g.circle(cx, cy, rr, C);
  g.circle(812, 48, 2, [42, 122, 216, 200]); g.circle(828, 48, 2, [42, 122, 216, 200]);
  for (let x = 810; x <= 830; x++) g.set(x, 56 + Math.round(Math.abs(x - 820) < 8 ? (64 - (x - 820) ** 2) / 24 : 0), [42, 122, 216, 200]);
  // haze at the horizon
  for (let y = base - 8; y <= base; y++) g.hline(0, W - 1, y, hex('#2a3060', 60));
  return g;
}

// ------------------------------------------------------------------ The Gigantum, from the top of the exit ramp (512x216)
// A giant windowless server hall, coolant pipes running down into the ground, a cloud parked over it.
export function gigantumExt(): Pix {
  const W = 512, g = new Pix(W, 216);
  const r = rng(2026);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#04060f'), hex('#142458'), Math.min(1, y / 140)));
  for (let i = 0; i < 60; i++) g.set(Math.floor(r() * W), Math.floor(r() * 60), hex('#c8d0ff', 120 + Math.floor(r() * 110)));
  // the cloud over it, huge, with GigaZ's face
  const cl = new Pix(W, 120);
  for (const [cx, cy, rr] of [[200, 46, 26], [244, 32, 34], [292, 44, 28], [250, 58, 30], [170, 60, 18], [326, 60, 18]]) cl.circle(cx, cy, rr, [214, 236, 255, 255]);
  cl.mask((x, y) => (y > 64 ? [168, 198, 240, 255] : y > 56 ? [192, 220, 250, 255] : null));
  cl.outline(hex('#0a1230'));
  g.blit(cl, 0, 0);
  g.circle(230, 46, 4, hex('#2a7ad8')); g.circle(262, 46, 4, hex('#2a7ad8'));
  for (let x = 228; x <= 264; x++) g.rect(x, 58 + Math.round((256 - (x - 246) ** 2) / 60), 1, 2, hex('#2a7ad8'));
  // the hall
  const top = 104, bot = 176;
  g.rect(110, top, 300, bot - top, hex('#1a2040'));
  g.rect(110, top, 300, 4, hex('#2c3460'));
  for (let x = 116; x < 404; x += 8) for (let y = top + 10; y < bot - 6; y += 6) g.rect(x, y, 5, 2, r() > 0.15 ? hex('#5ce1ff') : hex('#ffffff'));
  // the cold glow off the roof
  for (let k = 0; k < 14; k++) g.ellipse(260, top, 170 - k * 8, 18 - k, [92, 200, 255, 10]);
  // fans on the roof
  for (let x = 130; x < 400; x += 34) { g.rect(x, top - 8, 22, 8, hex('#262c50')); g.ellipse(x + 11, top - 8, 9, 2, hex('#3a4478')); }
  // coolant pipes going down into the ground
  for (const px of [140, 200, 320, 380]) { g.rect(px, bot, 8, 40, hex('#7a8aa8')); g.vline(px + 1, bot, 215, hex('#b8c8e0')); g.rect(px - 2, bot + 6, 12, 3, hex('#5a6888')); }
  // the gate and AetherCorp's sign (the game's fictional company)
  g.rect(230, bot - 24, 60, 24, hex('#0e1430')); g.rect(234, bot - 20, 52, 20, hex('#5ce1ff', 120));
  const s = 'AETHERCORP';
  text(g, s, Math.round(260 - textWidth(s) / 2), top + 4 + 2, P.white);
  // the ground and the end of the ramp
  g.rect(0, 176, W, 40, hex('#0c1020'));
  for (let x = 0; x < W; x += 9) g.vline(x, 176, 178, hex('#1a2036'));
  // a chain-link fence
  for (let x = 0; x < W; x += 4) g.vline(x, 168, 178, hex('#3a4060', 160));
  g.hline(0, W - 1, 168, hex('#5a6286'));
  return g;
}

// the I-240 ramp the cutscene stands on (side view road strip, 512x40)
export function rampStrip(): Pix {
  const W = 512, g = new Pix(W, 40);
  g.rect(0, 6, W, 34, hex('#2a2a34'));
  g.rect(0, 0, W, 6, CONC); g.hline(0, W - 1, 0, CONC_HI); g.rect(0, 5, W, 1, CONC_D);
  for (let x = 0; x < W; x += 24) g.rect(x, 22, 12, 2, hex('#d8d8d8'));
  return g;
}

export { hex };
