// Mission 5, The Plant: the first-person shooter's art. The DeNile Water plant on Presidents Island:
// wall and floor textures, the Drifters (plant workers who drank DeNile and forgot themselves), mini Pips
// fresh off the line, the Foreman (a giant bottle-capping machine), Mane's Hydrator, props and pickups.
// Every sprite faces the camera (it's a billboard), feet on the bottom row.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';

const INK = P.ink;
const T = 64; // wall and floor texture size

// plant palette
const CON = hex('#6a7286'), CON_D = hex('#4e5468'), CON_H = hex('#8a93a8');
const TILE = hex('#2a6ad0'), TILE_D = hex('#1d4a9a'), TILE_H = hex('#5c94f0');
const STEEL = hex('#8a8e98'), STEEL_D = hex('#5a5e6a'), STEEL_H = hex('#c4c8d2');
const HAZ_Y = hex('#f2c230'), HAZ_K = hex('#1c1c22');
const PIPE = hex('#7a5a3a'), PIPE_D = hex('#4e3a26'), PIPE_H = hex('#b08458');
const DN = hex('#2a6ad0'), DN_HI = hex('#7fc4ff');
const WOOD = hex('#9a6a3a'), WOOD_D = hex('#6a4626'), WOOD_H = hex('#c08c52');
const COVER = hex('#8fa4bc'), COVER_D = hex('#64788e'), COVER_H = hex('#b8c8da');

// ------------------------------------------------------------------ wall textures (one 64x64 frame each)
// 0 concrete block, 1 DeNile tile, 2 steel door, 3 hazard panel, 4 window onto the line, 5 DeNile poster,
// 6 aquifer intake sign, 7 GigaZ screen, 8 pipes, 9 locked door, 10 crate stack, 11 dock roll-up door,
// 12 "memory removal" sign, 13 break room board
function blocks(g: Pix, base: RGBA, dark: RGBA, hi: RGBA, bw = 32, bh = 16, seed = 1) {
  const r = rng(seed);
  g.rect(0, 0, T, T, base);
  for (let row = 0; row < T / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    g.hline(0, T - 1, row * bh, dark);
    g.hline(0, T - 1, row * bh + 1, hi);
    for (let x = -bw; x < T + bw; x += bw) g.vline(Math.round(x + off), row * bh, row * bh + bh - 1, dark);
  }
  for (let i = 0; i < 60; i++) g.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? dark : hi);
}
function signPlate(g: Pix, lines: [string, RGBA][], bg: RGBA, frame: RGBA, y0 = 10) {
  g.rect(4, y0 - 4, 56, lines.length * 10 + 6, frame);
  g.rect(6, y0 - 2, 52, lines.length * 10 + 2, bg);
  lines.forEach(([s, c], i) => text(g, s, Math.round(32 - textWidth(s) / 2), y0 + i * 10, c));
}
function wallTex(i: number): Pix {
  const g = new Pix(T, T);
  switch (i) {
    case 0: blocks(g, CON, CON_D, CON_H, 32, 16, 3); break;
    case 1: {
      // DeNile blue tile, a white stripe at waist height
      g.rect(0, 0, T, T, TILE);
      for (let y = 0; y < T; y += 8) g.hline(0, T - 1, y, TILE_D);
      for (let x = 0; x < T; x += 8) g.vline(x, 0, T - 1, TILE_D);
      for (let y = 1; y < T; y += 8) for (let x = 1; x < T; x += 8) g.set(x, y, TILE_H);
      g.rect(0, 36, T, 6, P.white); g.hline(0, T - 1, 36, hex('#c8d4e8')); g.hline(0, T - 1, 41, TILE_D);
      break;
    }
    case 2: case 9: {
      // steel sliding door with a window slit and a light
      g.rect(0, 0, T, T, STEEL_D);
      g.rect(3, 2, 58, 62, STEEL);
      for (let y = 6; y < 62; y += 6) g.hline(4, 59, y, STEEL_D);
      g.rect(24, 14, 16, 6, hex('#141c30')); g.hline(24, 39, 14, STEEL_H);
      g.vline(3, 2, 63, STEEL_H);
      const lamp = i === 9 ? P.red : hex('#3ce07a');
      g.rect(28, 4, 8, 4, lamp); g.rect(29, 5, 3, 1, P.white);
      if (i === 9) { for (let k = 0; k < 8; k++) { g.rect(8 + k * 6, 54, 3, 6, HAZ_Y); } }
      break;
    }
    case 3: {
      blocks(g, CON, CON_D, CON_H, 32, 16, 5);
      for (let x = -T; x < T; x += 12) for (let y = 0; y < 14; y++) g.hline(x + y, x + y + 5, y + 46, HAZ_Y);
      g.rect(0, 46, T, 1, HAZ_K); g.rect(0, 60, T, 4, HAZ_K);
      for (let x = 0; x < T; x++) for (let y = 47; y < 60; y++) if (!g.get(x, y) || g.get(x, y)![0] !== HAZ_Y[0]) g.set(x, y, HAZ_K);
      break;
    }
    case 4: {
      // window onto the line: rows of little Pip silhouettes behind glass
      blocks(g, TILE, TILE_D, TILE_H, 16, 8, 7);
      g.rect(4, 8, 56, 34, STEEL);
      g.rect(6, 10, 52, 30, hex('#0f1a34'));
      for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
        const x = 9 + k * 8 + row * 4, y = 18 + row * 11;
        g.rect(x, y, 4, 8, hex('#3c78c8')); g.rect(x + 1, y - 2, 2, 2, hex('#d8dee8'));
        g.set(x + 1, y + 2, P.red); g.set(x + 2, y + 2, P.red);
      }
      g.hline(6, 57, 37, hex('#5a5e6a')); // the belt
      for (let k = 0; k < 4; k++) g.line(10 + k * 12, 11, 4 + k * 12, 38, [255, 255, 255, 50]);
      break;
    }
    case 5: {
      blocks(g, TILE, TILE_D, TILE_H, 16, 8, 9);
      g.rect(6, 6, 52, 50, P.white); g.rect(8, 8, 48, 46, DN);
      text(g, 'DENILE', 14, 10, P.white);
      text(g, 'ZERO', 20, 20, DN_HI); text(g, 'TASTE.', 14, 29, DN_HI);
      text(g, 'ZERO', 20, 38, DN_HI); text(g, 'MEMORY.', 11, 47, DN_HI);
      break;
    }
    case 6: {
      // villain-voiced, but the number is the real estimate (MLGW)
      blocks(g, CON, CON_D, CON_H, 32, 16, 11);
      signPlate(g, [['AQUIFER', P.white], ['INTAKE', P.white], ['EST. 100', HAZ_Y], ['TRILLION', HAZ_Y], ['GALLONS.', HAZ_Y]], hex('#1d4a9a'), STEEL_H, 8);
      break;
    }
    case 7: {
      // a GigaZ screen: the polite cloud
      g.rect(0, 0, T, T, hex('#1a1e2a'));
      g.rect(4, 6, 56, 40, hex('#5ce1ff'));
      g.rect(6, 8, 52, 36, hex('#141c40'));
      const C = hex('#e8f4ff');
      g.circle(24, 26, 7, C); g.circle(33, 22, 9, C); g.circle(42, 27, 7, C); g.rect(19, 27, 28, 7, C);
      g.rect(27, 23, 3, 3, hex('#2a7ad8')); g.rect(36, 23, 3, 3, hex('#2a7ad8'));
      g.hline(28, 37, 30, hex('#2a7ad8')); g.set(27, 29, hex('#2a7ad8')); g.set(38, 29, hex('#2a7ad8'));
      g.rect(20, 48, 24, 4, STEEL_D); g.rect(28, 52, 8, 12, STEEL_D);
      break;
    }
    case 8: {
      blocks(g, CON_D, hex('#3a4054'), CON, 32, 16, 13);
      for (const [y, h] of [[10, 8], [34, 12]] as const) {
        g.rect(0, y, T, h, PIPE); g.hline(0, T - 1, y, PIPE_H); g.hline(0, T - 1, y + h - 1, PIPE_D);
        for (let x = 6; x < T; x += 22) { g.rect(x, y - 1, 4, h + 2, STEEL); g.vline(x, y - 1, y + h, STEEL_H); }
      }
      g.rect(46, 50, 10, 10, STEEL); g.circle(51, 55, 3, P.red); // a valve wheel
      break;
    }
    case 10: {
      // stacked DeNile crates
      for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]] as const) {
        g.rect(x, y, 32, 32, WOOD); g.rect(x, y, 32, 2, WOOD_H); g.rect(x, y + 30, 32, 2, WOOD_D);
        g.vline(x, y, y + 31, WOOD_D); g.line(x + 2, y + 2, x + 29, y + 29, WOOD_D, 2);
        g.rect(x + 8, y + 11, 16, 9, P.white); text(g, 'DN', x + 11, y + 12, DN);
      }
      break;
    }
    case 11: {
      g.rect(0, 0, T, T, STEEL_D);
      for (let y = 0; y < 56; y += 4) { g.hline(2, 61, y, STEEL); g.hline(2, 61, y + 1, STEEL_H); }
      g.rect(0, 56, T, 8, HAZ_K); for (let x = 0; x < T; x += 8) g.rect(x, 57, 4, 6, HAZ_Y);
      g.rect(28, 48, 8, 4, STEEL_D);
      break;
    }
    case 12: {
      blocks(g, TILE, TILE_D, TILE_H, 16, 8, 15);
      signPlate(g, [['STAGE 3', HAZ_Y], ['MEMORY', P.white], ['REMOVAL', P.white], ['ZERO LEFT', DN_HI]], hex('#1a1e2a'), HAZ_Y, 12);
      break;
    }
    case 13: {
      blocks(g, CON, CON_D, CON_H, 32, 16, 17);
      g.rect(6, 6, 52, 44, hex('#c8a46a')); g.rect(8, 8, 48, 40, hex('#d8b880'));
      // memo pinned up: shift notes nobody remembers writing
      for (const [x, y, c] of [[11, 11, P.white], [33, 12, hex('#fff1a8')], [14, 29, hex('#ffd0d8')], [35, 30, P.white]] as const) {
        g.rect(x, y, 18, 14, c); g.set(x + 9, y + 1, P.red);
        for (let k = 0; k < 3; k++) g.hline(x + 3, x + 14, y + 5 + k * 3, hex('#7a7f8c'));
      }
      break;
    }
  }
  return g;
}
export function plantWalls(): Pix[] { return Array.from({ length: 14 }, (_, i) => wallTex(i)); }

// ------------------------------------------------------------------ floor and ceiling textures
// 0 concrete floor, 1 conveyor belt (its rollers scroll in the game), 2 drain grate, 3 DeNile spill,
// 4 ceiling panel, 5 ceiling light, 6 hazard floor
export function plantFloors(): Pix[] {
  const out: Pix[] = [];
  const conc = new Pix(T, T);
  { const r = rng(21); conc.rect(0, 0, T, T, hex('#4a4e5c'));
    for (let i = 0; i < 160; i++) conc.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? hex('#3e4250') : hex('#565a6a'));
    conc.hline(0, T - 1, 0, hex('#32364a')); conc.vline(0, 0, T - 1, hex('#32364a')); }
  out.push(conc);
  const belt = new Pix(T, T);
  belt.rect(0, 0, T, T, hex('#26262e'));
  for (let y = 0; y < T; y += 8) { belt.hline(0, T - 1, y, hex('#3a3a46')); belt.hline(0, T - 1, y + 1, hex('#18181e')); }
  for (let y = 4; y < T; y += 16) for (let x = 4; x < T; x += 16) belt.rect(x, y, 3, 2, hex('#4a4a58'));
  belt.rect(0, 0, 3, T, HAZ_Y); belt.rect(T - 3, 0, 3, T, HAZ_Y);
  out.push(belt);
  const drain = conc.scaled(1);
  drain.rect(16, 16, 32, 32, hex('#22242c'));
  for (let x = 18; x < 48; x += 4) drain.rect(x, 18, 2, 28, hex('#5ce1ff'));
  drain.hline(16, 47, 16, STEEL); drain.vline(16, 16, 47, STEEL);
  out.push(drain);
  const spill = conc.scaled(1);
  spill.ellipse(32, 32, 26, 20, [127, 196, 255, 150]); spill.ellipse(22, 24, 8, 5, [220, 240, 255, 120]);
  out.push(spill);
  const ceil = new Pix(T, T);
  ceil.rect(0, 0, T, T, hex('#23283a'));
  ceil.hline(0, T - 1, 0, hex('#141826')); ceil.vline(0, 0, T - 1, hex('#141826'));
  ceil.rect(4, 30, 56, 3, hex('#3a4058')); // a pipe run
  out.push(ceil);
  const light = ceil.scaled(1);
  light.rect(12, 12, 40, 40, hex('#9aa4bc')); light.rect(14, 14, 36, 36, hex('#e8f4ff')); light.rect(16, 16, 32, 32, P.white);
  out.push(light);
  const haz = conc.scaled(1);
  for (let x = -T; x < T * 2; x += 16) for (let y = 0; y < T; y++) haz.hline(x + y, x + y + 6, y, HAZ_Y);
  out.push(haz);
  return out;
}

// ------------------------------------------------------------------ Drifters (48x64, front view)
// Plant workers who drank DeNile: blank white eyes, arms out, shuffling the same loop.
type DFace = 'blank' | 'splash' | 'back' | 'huh';
interface DPose { step: number; arms: 'out' | 'reach' | 'down' | 'scratch' | 'grab'; face: DFace; bob: number; wet?: boolean }
interface DLook { skin: RGBA; skinD: RGBA; hair: RGBA; cap: boolean; beard?: boolean; braids?: boolean;
  // Mission 9's data-center techs: AetherCorp hoodies, a cloud patch, a badge on a lanyard, a headset
  suit?: [RGBA, RGBA, RGBA]; patch?: RGBA; patchHi?: RGBA; badge?: boolean; headset?: boolean }
export const DRIFTER_LOOKS: Record<string, DLook> = {
  drifterA: { skin: P.skin1, skinD: P.skin1Shade, hair: hex('#1a1210'), cap: true },
  drifterB: { skin: P.skin2, skinD: P.skin2Shade, hair: hex('#2a1a12'), cap: false, braids: true },
  drifterC: { skin: P.skin3, skinD: P.skin3Shade, hair: hex('#16100c'), cap: true, beard: true },
  techA: { skin: P.skin2, skinD: P.skin2Shade, hair: hex('#1a1210'), cap: false, suit: [hex('#5a6072'), hex('#40465a'), hex('#7a8296')], patch: hex('#eef2f8'), patchHi: hex('#5ce1ff'), badge: true, headset: true },
  techB: { skin: P.skin1, skinD: P.skin1Shade, hair: hex('#2a1a12'), cap: false, braids: true, suit: [hex('#2e3550'), hex('#1e2438'), hex('#454e70')], patch: hex('#eef2f8'), patchHi: hex('#5ce1ff'), badge: true },
  techC: { skin: P.skin3, skinD: P.skin3Shade, hair: hex('#16100c'), cap: false, beard: true, suit: [hex('#d8dee8'), hex('#a8b0c0'), hex('#f4f6fa')], patch: hex('#2a7ad8'), patchHi: hex('#5ce1ff'), badge: true, headset: true },
};
function drawDrifter(L: DLook, p: DPose): Pix {
  const g = new Pix(48, 64);
  const cx = 24, base = 63 + p.bob;
  const hipY = base - 18;
  const [SU, SU_D, SU_H] = L.suit ?? [COVER, COVER_D, COVER_H];
  // legs and boots
  for (const s of [-1, 1]) {
    const lift = (s < 0 ? p.step : -p.step) > 0 ? 3 : 0;
    const x = cx + s * 5;
    g.rect(x - 3, hipY, 6, 15 - lift, L.suit ? hex('#23263a') : COVER_D);
    g.rect(x - 4, base - 4 - lift, 8, 4, hex('#2a2018'));
  }
  // coveralls
  const top = hipY - 20;
  g.rect(cx - 11, top, 22, 22, SU);
  g.vline(cx - 11, top, hipY + 1, SU_D); g.vline(cx + 10, top, hipY + 1, SU_H);
  if (L.suit) {
    // a little cloud on the chest, a badge on a lanyard
    const pc = L.patch!, ph = L.patchHi!;
    g.circle(cx - 5, top + 7, 2, pc); g.circle(cx - 2, top + 6, 2, pc); g.rect(cx - 7, top + 7, 7, 2, pc); g.set(cx - 4, top + 7, ph); g.set(cx - 2, top + 7, ph);
    if (L.badge) { g.line(cx - 3, top, cx + 3, top + 9, hex('#2a7ad8')); g.line(cx + 3, top, cx + 3, top + 9, hex('#2a7ad8')); g.rect(cx + 1, top + 9, 5, 6, P.white); g.hline(cx + 2, cx + 4, top + 11, hex('#5ce1ff')); }
    g.hline(cx - 11, cx + 10, hipY - 1, SU_D); // hoodie hem
  } else {
    g.rect(cx - 6, top + 4, 7, 6, DN); g.set(cx - 3, top + 6, DN_HI); g.set(cx - 3, top + 7, DN_HI); // the DeNile patch
    g.hline(cx - 11, cx + 10, hipY - 3, COVER_D); // belt line
  }
  if (p.wet) for (let k = 0; k < 6; k++) g.set(cx - 9 + k * 4, top + 3 + (k % 3) * 5, hex('#bfefff'));
  // arms
  const sh = top + 3;
  const arm = (s: number, hx: number, hy: number) => {
    g.line(cx + s * 11, sh, hx, hy, SU_D, 3);
    g.circle(hx, hy, 2, L.skin);
  };
  if (p.arms === 'out') { arm(-1, cx - 13, sh + 8); arm(1, cx + 13, sh + 8); g.rect(cx - 15, sh + 6, 5, 4, L.skin); g.rect(cx + 10, sh + 6, 5, 4, L.skin); }
  else if (p.arms === 'reach') { arm(-1, cx - 8, sh + 4); arm(1, cx + 8, sh + 4); }
  else if (p.arms === 'grab') { arm(-1, cx - 5, sh - 1); arm(1, cx + 5, sh - 1); g.rect(cx - 8, sh - 4, 16, 4, L.skin); }
  else if (p.arms === 'scratch') { arm(-1, cx - 14, hipY - 2); arm(1, cx + 9, top - 12); }
  else { arm(-1, cx - 13, hipY - 1); arm(1, cx + 13, hipY - 1); }
  // head
  const hy = top - 9;
  g.rect(cx - 3, top - 3, 6, 4, L.skinD); // neck
  g.ellipse(cx, hy, 7, 8, L.skin);
  g.vline(cx - 7, hy - 2, hy + 3, L.skinD);
  if (L.braids) { for (let k = -6; k <= 6; k += 3) g.vline(cx + k, hy - 9, hy - 4, L.hair); g.rect(cx - 7, hy - 9, 15, 3, L.hair); g.vline(cx - 8, hy - 6, hy + 6, L.hair); g.vline(cx + 8, hy - 6, hy + 6, L.hair); }
  else g.rect(cx - 7, hy - 8, 15, 4, L.hair);
  if (L.cap) { g.rect(cx - 8, hy - 9, 17, 4, DN); g.rect(cx - 9, hy - 5, 19, 2, TILE_D); g.set(cx, hy - 8, P.white); }
  if (L.beard) g.rect(cx - 5, hy + 4, 11, 4, L.hair);
  if (L.headset) { g.rect(cx - 9, hy - 2, 3, 5, hex('#2a2c38')); g.line(cx - 8, hy + 3, cx - 3, hy + 5, hex('#2a2c38')); g.set(cx - 3, hy + 5, hex('#5ce1ff')); g.hline(cx - 7, cx + 7, hy - 9, hex('#2a2c38')); }
  // eyes and mouth
  const ey = hy - 1;
  if (p.face === 'blank') {
    g.rect(cx - 5, ey, 3, 3, P.white); g.rect(cx + 2, ey, 3, 3, P.white);
    g.hline(cx - 2, cx + 2, hy + 4, L.skinD); g.rect(cx - 1, hy + 4, 3, 2, INK);
  } else if (p.face === 'splash') {
    g.hline(cx - 5, cx - 3, ey + 1, INK); g.hline(cx + 2, cx + 4, ey + 1, INK);
    g.rect(cx - 2, hy + 3, 4, 3, INK);
  } else {
    g.rect(cx - 5, ey, 3, 3, P.white); g.rect(cx + 2, ey, 3, 3, P.white);
    g.set(cx - 4, ey + 1, INK); g.set(cx - 3, ey + 1, INK); g.set(cx + 3, ey + 1, INK); g.set(cx + 4, ey + 1, INK);
    if (p.face === 'huh') { g.hline(cx - 5, cx - 3, ey - 2, L.hair); g.hline(cx + 2, cx + 4, ey - 3, L.hair); g.hline(cx - 1, cx + 1, hy + 4, INK); }
    else { g.hline(cx - 2, cx + 2, hy + 4, INK); g.set(cx - 3, hy + 3, INK); g.set(cx + 3, hy + 3, INK); }
  }
  if (p.wet) { for (let k = 0; k < 5; k++) g.set(cx - 6 + k * 3, hy - 6 + (k % 2) * 9, hex('#bfefff')); }
  g.outline(INK);
  return g;
}
export function drifterFrames(look: string) {
  const L = DRIFTER_LOOKS[look];
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (n: string, poses: DPose[]) => { anims[n] = [frames.length, frames.length + poses.length - 1]; for (const p of poses) frames.push(drawDrifter(L, p)); };
  add('walk', [0, 1, 2, 3].map((i) => ({ step: [1, 0, -1, 0][i], arms: 'out', face: 'blank', bob: i % 2 ? -1 : 0 } as DPose)));
  add('grab', [{ step: 0, arms: 'reach', face: 'blank', bob: 0 }, { step: 0, arms: 'grab', face: 'blank', bob: -1 }]);
  add('splash', [{ step: 0, arms: 'down', face: 'splash', bob: 0, wet: true }]);
  add('back', [{ step: 0, arms: 'scratch', face: 'huh', bob: 0, wet: true }, { step: 0, arms: 'scratch', face: 'back', bob: 0, wet: true }]);
  add('idle', [{ step: 0, arms: 'down', face: 'blank', bob: 0 }]);
  return { frames, anims };
}

// ------------------------------------------------------------------ mini Pips (40x56, front view)
// The plant's main line isn't stamping bottles. It's stamping Pips.
interface MPose { cap: boolean; eyes: 'off' | 'mean' | 'x'; arm: 'down' | 'up'; squash: number; crush: number }
function drawMiniPip(p: MPose): Pix {
  const g = new Pix(40, 56);
  const cx = 20, base = 55;
  const h = 34 - p.squash - p.crush * 8, w = 16 + p.squash + p.crush * 4;
  const top = base - 6 - h;
  // boots
  g.rect(cx - 9, base - 5, 7, 5, P.redDark); g.rect(cx + 2, base - 5, 7, 5, P.redDark); g.hline(cx - 9, cx - 3, base - 5, P.red); g.hline(cx + 2, cx + 8, base - 5, P.red);
  // bottle body with crinkle ridges
  g.rect(cx - w / 2, top + 8, w, h - 8, P.bottle);
  g.ellipse(cx, top + 9, w / 2, 4, P.bottle);
  g.vline(Math.round(cx - w / 2), top + 8, base - 7, P.bottleShade);
  g.vline(Math.round(cx - w / 2 + 3), top + 9, base - 8, hex('#c8e8ff'));
  for (let y = top + 14; y < base - 8; y += 5) g.hline(Math.round(cx - w / 2), Math.round(cx + w / 2) - 1, y, P.bottleShade);
  if (p.crush) for (let k = 0; k < 4; k++) g.line(cx - w / 2 + k * 5, top + 10 + k * 3, cx - w / 2 + k * 5 + 4, top + 14 + k * 3, P.bottleShade);
  // label band
  g.rect(cx - w / 2, top + 18 - p.crush * 2, w, 6, P.white);
  text(g, 'DN', cx - 5, top + 18 - p.crush * 2, DN);
  // neck and cap
  g.rect(cx - 3, top + 2, 6, 6, P.bottle);
  if (p.cap) { g.rect(cx - 4, top - 2, 8, 4, P.bottleCap); g.hline(cx - 4, cx + 3, top - 2, P.white); }
  // eyes
  const ey = top + 11;
  if (p.eyes === 'off') { g.rect(cx - 5, ey, 3, 2, P.bottleShade); g.rect(cx + 2, ey, 3, 2, P.bottleShade); }
  else if (p.eyes === 'x') { for (const ex of [cx - 5, cx + 2]) { g.set(ex, ey, INK); g.set(ex + 2, ey, INK); g.set(ex + 1, ey + 1, INK); g.set(ex, ey + 2, INK); g.set(ex + 2, ey + 2, INK); } }
  else {
    g.rect(cx - 5, ey, 3, 3, P.white); g.rect(cx + 2, ey, 3, 3, P.white);
    g.set(cx - 4, ey + 1, P.red); g.set(cx + 3, ey + 1, P.red);
    g.line(cx - 6, ey - 2, cx - 2, ey - 1, INK); g.line(cx + 5, ey - 2, cx + 1, ey - 1, INK);
  }
  // red gloves
  const gy = p.arm === 'up' ? top + 2 : top + 18;
  g.circle(cx - w / 2 - 3, top + 20, 3, P.red);
  g.circle(cx + w / 2 + 3, gy, 3, P.red); g.set(cx + w / 2 + 2, gy - 1, hex('#ff8a8a'));
  g.outline(INK);
  return g;
}
export function miniPipFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (n: string, poses: MPose[]) => { anims[n] = [frames.length, frames.length + poses.length - 1]; for (const p of poses) frames.push(drawMiniPip(p)); };
  add('off', [{ cap: true, eyes: 'off', arm: 'down', squash: 0, crush: 0 }]);
  add('hop', [{ cap: true, eyes: 'mean', arm: 'down', squash: 0, crush: 0 }, { cap: true, eyes: 'mean', arm: 'down', squash: 3, crush: 0 }]);
  add('shoot', [{ cap: true, eyes: 'mean', arm: 'up', squash: 0, crush: 0 }, { cap: false, eyes: 'mean', arm: 'up', squash: 1, crush: 0 }]);
  add('hurt', [{ cap: true, eyes: 'x', arm: 'down', squash: 2, crush: 1 }]);
  add('crush', [{ cap: false, eyes: 'x', arm: 'down', squash: 4, crush: 1 }, { cap: false, eyes: 'x', arm: 'down', squash: 8, crush: 2 }]);
  return { frames, anims };
}

// ------------------------------------------------------------------ the Foreman (160x176)
// A giant bottle-capping machine: steel gantry, a DeNile tank for a belly, two warning lamps for eyes,
// a piston head holding a cap the size of a manhole cover, a chute that spits out Pips.
type FState = 'idle' | 'idle2' | 'windup' | 'slam' | 'open' | 'hurt' | 'broken';
function drawForeman(s: FState): Pix {
  const g = new Pix(160, 176);
  const cx = 80, base = 175;
  const broken = s === 'broken';
  // gantry legs and the floor rail
  g.rect(10, base - 6, 140, 6, HAZ_K); for (let x = 12; x < 148; x += 10) g.rect(x, base - 5, 5, 4, HAZ_Y);
  for (const lx of [18, 128]) { g.rect(lx, 20, 14, base - 26, STEEL_D); g.rect(lx + 2, 22, 4, base - 30, STEEL); g.vline(lx + 2, 22, base - 9, STEEL_H);
    for (let y = 40; y < base - 10; y += 22) g.line(lx + 2, y, lx + 11, y + 11, STEEL_D, 2); }
  g.rect(14, 14, 132, 12, STEEL_D); g.rect(16, 16, 128, 4, STEEL); g.hline(16, 143, 16, STEEL_H);
  // the belly: a big DeNile tank
  const ty = 84;
  g.rect(36, ty, 88, 70, TILE_D); g.rect(38, ty + 2, 84, 66, TILE);
  g.vline(42, ty + 4, ty + 64, TILE_H); g.vline(43, ty + 4, ty + 64, TILE_H);
  for (let y = ty + 10; y < ty + 66; y += 12) g.hline(38, 121, y, TILE_D);
  // name plate
  g.rect(52, ty + 52, 56, 12, STEEL); text(g, 'FOREMAN', 59, ty + 54, INK);
  // the hatch over the core
  if (s === 'open' || s === 'hurt' || broken) {
    g.rect(58, ty + 12, 44, 34, INK);
    g.rect(60, ty + 14, 40, 30, broken ? hex('#2a4a8a') : hex('#5ce1ff'));
    if (!broken) { g.rect(64, ty + 18, 32, 22, hex('#bfefff')); g.rect(72, ty + 22, 16, 14, P.white); for (let k = 0; k < 5; k++) g.set(65 + k * 7, ty + 16 + (k % 2) * 25, P.goldHi); }
    g.rect(102, ty + 12, 14, 34, STEEL_D); // hatch swung open
    if (s === 'hurt') { g.rect(60, ty + 14, 40, 30, P.white); }
  } else {
    g.rect(58, ty + 12, 44, 34, STEEL_D); g.rect(60, ty + 14, 40, 30, STEEL);
    for (let k = 0; k < 4; k++) { g.circle(63 + k * 11, ty + 17, 1, STEEL_D); g.circle(63 + k * 11, ty + 41, 1, STEEL_D); }
    // pressure gauge
    g.circle(80, ty + 29, 8, P.white); g.circle(80, ty + 29, 7, hex('#f0f0f0'));
    g.line(80, ty + 29, s === 'windup' ? 86 : 75, ty + 23, P.red, 2);
  }
  // shoulders and the warning-lamp eyes
  g.rect(30, 60, 100, 26, STEEL_D); g.rect(32, 62, 96, 22, STEEL); g.hline(32, 127, 62, STEEL_H);
  const lampOn = s === 'windup' || s === 'slam' ? P.red : s === 'open' ? HAZ_Y : broken ? hex('#3a1010') : hex('#e85a2a');
  for (const ex of [52, 108]) { g.circle(ex, 73, 8, INK); g.circle(ex, 73, 7, lampOn); if (!broken) { g.rect(ex - 3, 69, 3, 2, P.white); } }
  // angry brow plates
  g.line(42, 62, 62, 66, INK, 3); g.line(118, 62, 98, 66, INK, 3);
  // the piston and capper head
  const headY = s === 'windup' ? 24 : s === 'slam' ? 70 : s === 'idle2' ? 32 : 36;
  if (!broken) {
    g.rect(74, 20, 12, headY - 18, STEEL_H); g.vline(76, 20, headY, P.white);
    if (s !== 'slam') {
      g.rect(56, headY, 48, 14, STEEL_D); g.rect(58, headY + 2, 44, 10, STEEL);
      // the giant cap it holds
      g.rect(62, headY + 12, 36, 8, P.bottleCap); for (let x = 63; x < 98; x += 3) g.vline(x, headY + 12, headY + 19, hex('#b8b8c8'));
    } else {
      // slammed: head down in front of the lamps, sparks
      g.rect(54, headY - 8, 52, 14, STEEL_D); g.rect(56, headY - 6, 48, 10, STEEL);
      for (const [x, y] of [[48, headY + 2], [112, headY], [44, headY - 8], [116, headY - 10]] as const) drawSparkle(g, x, y, 2);
    }
  } else {
    // broken: the piston snapped, steam, hanging cap
    g.rect(74, 20, 12, 14, STEEL_H);
    g.line(80, 34, 96, 52, STEEL_D, 4);
    g.rect(90, 50, 30, 7, P.bottleCap);
    for (const [x, y] of [[60, 50], [66, 40], [100, 44]] as const) { g.circle(x, y, 5, [230, 236, 248, 150]); }
  }
  // the chute on the side
  g.rect(124, 96, 30, 12, STEEL_D); g.rect(126, 98, 26, 8, hex('#1a1e2a')); g.rect(146, 108, 8, 30, STEEL_D);
  if (s === 'idle2') { g.rect(140, 110, 6, 10, P.bottle); g.rect(141, 108, 4, 2, P.bottleCap); }
  // dents and leaks when broken
  if (broken) for (let k = 0; k < 6; k++) g.rect(44 + k * 13, ty + 66, 2, 6 + (k % 3) * 3, hex('#7fc4ff'));
  g.outline(INK);
  return g;
}
export function foremanFrames() {
  const states: FState[] = ['idle', 'idle2', 'windup', 'slam', 'open', 'hurt', 'broken'];
  const anims: Record<string, [number, number]> = { idle: [0, 1], windup: [2, 2], slam: [3, 3], open: [4, 4], hurt: [5, 5], broken: [6, 6] };
  return { frames: states.map(drawForeman), anims };
}

// ------------------------------------------------------------------ Mane's Hydrator, first person (144x88)
// White gloves on a cream-gold water blaster with a MEMPHYS-can tank on top. Gold glow in Mane Mode.
// The Hydrator: a gold pump-action water blaster held at the hip, seen from behind Mane's right shoulder.
// Pressure tank on top with a strap band, long white barrel with a blue nozzle cap, a ribbed pump
// under the barrel, pistol grip and trigger. The tank wears the MEMPHYS mark: the bridge M over the pyramid.
function drawHydrator(fire: number, gold: boolean): Pix {
  const g = new Pix(200, 120);
  const kx = fire ? 3 : 0, ky = fire ? 2 : 0;
  const N = [62 + kx, 40 + ky], R = [168 + kx, 80 + ky];
  const dx = R[0] - N[0], dy = R[1] - N[1], len = Math.hypot(dx, dy);
  const ux = dy / len, uy = -dx / len; // "up" across the gun
  const sc = (t: number) => 0.8 + 0.7 * t; // nearer parts are bigger
  const at = (t: number, off: number): [number, number] => [N[0] + dx * t + ux * off * sc(t), N[1] + dy * t + uy * off * sc(t)];
  const band = (t0: number, t1: number, lo: number, hi: number, c: RGBA) => g.poly([at(t0, lo), at(t1, lo), at(t1, hi), at(t0, hi)], c);
  const ring = (t: number, lo: number, hi: number, c: RGBA) => { const a = at(t, lo), b = at(t, hi); g.line(a[0], a[1], b[0], b[1], c); };
  const BODY = gold ? P.goldHi : P.gold, BODY_D = gold ? P.gold : P.goldMid, BODY_DD = P.goldDark;
  const CAP = hex('#2a7ad8'), CAP_D = hex('#1a4e9a'), CAP_H = hex('#6fb0ff');
  const TUBE = gold ? P.goldHi : hex('#f4f6fa'), TUBE_D = gold ? P.gold : hex('#b8c0d0');

  // pistol grip and trigger guard (drawn first, the body overlaps their tops)
  const g0 = at(0.74, -16), g1 = at(0.86, -16);
  g.poly([g0, g1, [g1[0] + 10, g1[1] + 30], [g1[0] - 2, g1[1] + 34], [g0[0] + 2, g0[1] + 26]], BODY_D);
  g.poly([[g1[0] + 3, g1[1] + 6], [g1[0] + 10, g1[1] + 30], [g1[0] + 4, g1[1] + 32]], BODY_DD);
  const tg = at(0.66, -16);
  g.poly([[tg[0], tg[1]], [tg[0] + 4, tg[1] + 14], [tg[0] + 13, tg[1] + 14], [tg[0] + 12, tg[1] + 2]], BODY_DD);
  g.poly([[tg[0] + 3, tg[1] + 1], [tg[0] + 6, tg[1] + 11], [tg[0] + 10, tg[1] + 11], [tg[0] + 9, tg[1] + 2]], hex('#20263a'));
  g.poly([[tg[0] + 5, tg[1]], [tg[0] + 6, tg[1] + 8], [tg[0] + 8, tg[1] + 8], [tg[0] + 8, tg[1] + 1]], CAP); // trigger

  // long barrel and the nozzle cap
  band(0.0, 0.44, -4, 4, TUBE); band(0.0, 0.44, 1.5, 4, gold ? P.white : hex('#ffffff')); band(0.0, 0.44, -4, -2, TUBE_D);
  band(-0.05, 0.03, -6.5, 6.5, CAP); band(-0.05, 0.03, 3, 6.5, CAP_H); band(-0.05, 0.03, -6.5, -4, CAP_D);
  for (const t of [-0.03, -0.01, 0.01]) ring(t, -6, 6, CAP_D);
  const tip = at(-0.05, 0); g.circle(tip[0], tip[1], 2, hex('#20263a'));

  // pump handle under the barrel, ribbed
  band(0.12, 0.42, -15, -3, BODY); band(0.12, 0.42, -6, -3, gold ? P.white : P.goldHi); band(0.12, 0.42, -15, -12, BODY_DD);
  for (let t = 0.16; t < 0.4; t += 0.035) ring(t, -12, -6, BODY_DD);

  // main body with a blue pressure collar at the front
  band(0.44, 1.0, -18, 8, BODY); band(0.44, 1.0, 4, 8, gold ? P.white : P.goldHi); band(0.44, 1.0, -18, -13, BODY_D);
  band(0.40, 0.46, -19, 9, CAP); band(0.40, 0.46, 5, 9, CAP_H); band(0.40, 0.46, -19, -14, CAP_D);
  for (const t of [0.56, 0.7, 0.84]) ring(t, -11, 2, BODY_D); // panel seams
  for (let t = 0.6; t < 0.82; t += 0.04) ring(t, -16, -14, BODY_DD); // grip texture along the bottom

  // pressure tank on top: a rounded capsule with a strap band and a fill cap
  const TANK = gold ? P.goldHi : P.can, TANK_H = P.canHi, TANK_D = gold ? P.gold : P.canShade;
  for (const t of [0.52, 0.86]) band(t - 0.03, t + 0.03, 7, 12, BODY_D); // mounts
  const f0 = at(0.32, 22), f1 = at(0.94, 22);
  g.ellipse(f0[0], f0[1], 11, 13, TANK); g.ellipse(f1[0], f1[1], 14, 17, TANK);
  band(0.32, 0.94, 11, 33, TANK); band(0.32, 0.94, 27, 33, TANK_H); band(0.32, 0.94, 11, 15, TANK_D);
  g.ellipse(f0[0] - 2, f0[1] - 3, 3, 4, TANK_H);
  band(0.50, 0.57, 9, 35, BODY); band(0.50, 0.57, 9, 35, BODY); ring(0.50, 9, 35, BODY_DD); ring(0.57, 9, 35, BODY_DD);
  band(0.50, 0.57, 30, 35, gold ? P.white : P.goldHi);
  const fc = at(0.84, 33); // fill cap on top of the tank
  g.rect(fc[0] - 5, fc[1] - 6, 11, 7, CAP); g.hline(fc[0] - 5, fc[0] + 5, fc[1] - 6, CAP_H);
  for (let k = 0; k < 4; k++) g.vline(fc[0] - 4 + k * 3, fc[1] - 4, fc[1], CAP_D);
  // water sloshing low in the tank (window)
  band(0.62, 0.86, 13, 17, hex('#7fd8ff')); band(0.62, 0.86, 16, 17, hex('#dff6ff'));
  // MEMPHYS mark on the tank: the bridge M arches over the gold pyramid
  const m = at(0.75, 24);
  const mx = Math.round(m[0]), my = Math.round(m[1]);
  for (let x = 0; x <= 22; x++) { const t = (x % 11) / 11; const y = my - 5 - Math.round(Math.sin(t * Math.PI) * 6); g.set(mx - 11 + x, y, P.label); g.set(mx - 11 + x, y + 1, P.label); }
  g.hline(mx - 11, mx + 11, my - 3, P.label); for (const x of [-11, 0, 11]) { g.vline(mx + x, my - 5, my + 7, P.label); }
  for (let r = 0; r < 7; r++) g.hline(mx - r, mx + r, my + 1 + r, gold ? P.goldDark : P.labelGold);
  g.set(mx, my + 1, P.goldHi);
  // a small pyramid stamped on the body side too
  const pb = at(0.92, -5); for (let r = 0; r < 4; r++) g.hline(Math.round(pb[0]) - r, Math.round(pb[0]) + r, Math.round(pb[1]) - 3 + r, BODY_DD);

  // white gloves: left hand on the pump, right hand on the grip
  const lh = at(0.27, -16);
  g.ellipse(lh[0], lh[1] + 2, 11, 8, P.glove); g.ellipse(lh[0] + 2, lh[1] + 5, 8, 4, P.gloveShade);
  for (let k = 0; k < 3; k++) g.hline(lh[0] - 8 + k * 2, lh[0] - 2 + k * 2, lh[1] - 3 + k * 3, P.gloveShade);
  g.poly([[lh[0] - 4, lh[1] + 6], [lh[0] + 8, lh[1] + 6], [lh[0] + 2, lh[1] + 30], [lh[0] - 14, lh[1] + 30]], P.glove); // wrist
  const rh = [g1[0] + 2, g1[1] + 18];
  g.ellipse(rh[0], rh[1], 15, 12, P.glove); g.ellipse(rh[0] + 4, rh[1] + 4, 10, 7, P.gloveShade);
  for (let k = 0; k < 3; k++) g.hline(rh[0] - 12, rh[0] - 2, rh[1] - 6 + k * 4, P.gloveShade);
  g.poly([[rh[0] - 6, rh[1] + 8], [rh[0] + 12, rh[1] + 6], [rh[0] + 18, 120], [rh[0] - 4, 120]], P.glove); // cuff and sleeve
  g.hline(rh[0] - 5, rh[0] + 13, rh[1] + 10, P.gloveShade);

  // the spray leaving the nozzle
  if (fire) {
    const c = gold ? P.goldHi : hex('#bfefff');
    const s = at(-0.1, 0), s2 = at(-0.16, 0);
    g.ellipse(s[0], s[1], fire === 1 ? 6 : 8, fire === 1 ? 5 : 7, c);
    g.ellipse(s2[0], s2[1], fire === 1 ? 3 : 5, fire === 1 ? 3 : 4, c);
    g.ellipse(s[0] - 1, s[1] - 1, 3, 2, P.white);
    for (let k = 0; k < 4; k++) g.set(s[0] - 10 + k * 5, s[1] - 7 - (k % 2) * 4, c);
  }
  if (gold) { const a = at(0.6, 40), b = at(0.2, 10); drawSparkle(g, a[0], a[1], 2); drawSparkle(g, b[0], b[1], 1); }
  g.outline(INK);
  return g;
}
export function hydratorFrames(): Pix[] { return [drawHydrator(0, false), drawHydrator(1, false), drawHydrator(2, false), drawHydrator(0, true), drawHydrator(1, true), drawHydrator(2, true)]; }

// ------------------------------------------------------------------ shots, splashes, props, pickups
export function waterShot(): Pix[] {
  return [0, 1, 2, 3].map((i) => {
    const g = new Pix(16, 16);
    const gold = i >= 2;
    const c = gold ? P.gold : hex('#5cc8ff'), hi = gold ? P.goldHi : hex('#dff6ff');
    const r = i % 2 ? 5 : 6;
    g.circle(8, 8, r, c); g.circle(7, 7, r - 3, hi); g.set(6, 5, P.white);
    return g;
  });
}
export function splashFrames(): Pix[] {
  return [0, 1, 2].map((i) => {
    const g = new Pix(32, 32);
    const c = hex('#7fd8ff'), hi = hex('#dff6ff');
    const n = 8, r0 = 3 + i * 5;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      g.circle(16 + Math.cos(a) * r0, 18 + Math.sin(a) * r0 * 0.7, Math.max(1, 3 - i), k % 2 ? c : hi);
    }
    if (i === 0) g.circle(16, 18, 4, hi);
    return g;
  });
}
export function crateProp(): Pix {
  const g = new Pix(48, 48);
  g.rect(2, 4, 44, 44, WOOD); g.rect(2, 4, 44, 3, WOOD_H); g.rect(2, 45, 44, 3, WOOD_D);
  g.vline(2, 4, 47, WOOD_H); g.vline(45, 4, 47, WOOD_D);
  for (const y of [16, 30]) g.hline(3, 44, y, WOOD_D);
  g.line(4, 6, 43, 45, WOOD_D, 2);
  g.rect(12, 18, 24, 11, P.white); text(g, 'DN', 18, 20, DN);
  g.outline(INK);
  return g;
}
export function palletProp(): Pix {
  // shrink-wrapped DeNile bottles stacked on a pallet
  const g = new Pix(56, 56);
  g.rect(2, 48, 52, 8, WOOD); g.rect(2, 48, 52, 2, WOOD_H); for (const x of [4, 26, 48]) g.rect(x, 52, 4, 4, WOOD_D);
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) {
    const x = 5 + k * 8, y = 34 - row * 15;
    g.rect(x, y, 6, 14, P.bottle); g.rect(x + 1, y - 2, 4, 2, P.bottleCap); g.vline(x + 1, y + 1, y + 12, hex('#c8e8ff'));
    g.rect(x, y + 6, 6, 3, P.white);
  }
  // the wrap
  for (let x = 4; x < 52; x += 3) g.set(x, 12 + (x % 7), [255, 255, 255, 140]);
  g.rect(3, 10, 50, 38, [220, 240, 255, 40]);
  g.outline(INK);
  return g;
}
export function pillarProp(): Pix {
  // a big intake pipe running floor to ceiling
  const g = new Pix(24, 96);
  g.rect(3, 0, 18, 96, PIPE); g.vline(5, 0, 95, PIPE_H); g.vline(6, 0, 95, PIPE_H); g.vline(19, 0, 95, PIPE_D);
  for (const y of [8, 46, 86]) { g.rect(1, y, 22, 6, STEEL); g.hline(1, 22, y, STEEL_H); g.hline(1, 22, y + 5, STEEL_D); }
  text(g, 'H', 9, 24, hex('#e8d8b0')); text(g, '2', 9, 32, hex('#e8d8b0')); text(g, 'O', 9, 60, hex('#e8d8b0'));
  g.outline(INK);
  return g;
}
export function lampProp(): Pix {
  // a hanging work light (drawn from the ceiling down)
  const g = new Pix(24, 40);
  g.vline(12, 0, 22, hex('#3a3a46'));
  g.poly([[4, 32], [8, 22], [16, 22], [20, 32]], hex('#3a4a3a'));
  g.rect(7, 32, 10, 3, hex('#fff1d0')); g.rect(9, 33, 6, 2, P.white);
  for (let k = 0; k < 6; k++) g.set(6 + k * 2, 37 + (k % 2), [255, 241, 208, 120]);
  return g;
}
export function factCard(): Pix[] {
  // the hidden Aquifer Fact card: a gold-edged card with a water drop, glowing
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(24, 28);
    const glow = [0.3, 0.5, 0.7, 0.5][f];
    g.ellipse(12, 14, 11, 13, [92, 225, 255, Math.round(glow * 140)]);
    g.rect(5, 4, 14, 20, P.gold); g.rect(6, 5, 12, 18, hex('#141c40'));
    g.poly([[12, 7], [8, 15], [16, 15]], hex('#5cc8ff')); g.circle(12, 15, 4, hex('#5cc8ff')); g.set(10, 13, P.white);
    g.hline(8, 15, 21, P.goldHi);
    if (f === 2) drawSparkle(g, 19, 5, 1);
    g.outline(INK);
    return g;
  });
}
export function questionMark(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(12, 16);
    text(g, '?', 3, 4 + f, HAZ_Y);
    g.outline(INK);
    return g;
  });
}
export function bigCap(): Pix {
  // the giant cap the Foreman drops on you (as seen from below, coming down)
  const g = new Pix(64, 24);
  g.ellipse(32, 6, 30, 5, hex('#f8f8fc'));
  g.rect(2, 6, 60, 14, P.bottleCap);
  for (let x = 3; x < 62; x += 3) g.vline(x, 7, 19, hex('#b8b8c8'));
  g.ellipse(32, 20, 30, 4, hex('#9a9aaa'));
  g.outline(INK);
  return g;
}
export function capOverlay(W = 480, H = 216): Pix {
  // what you see after getting capped: the inside of a bottle cap, ridged rim around the edge
  const g = new Pix(W, H);
  g.rect(0, 0, W, H, hex('#141418'));
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - cx) / (W * 0.62), (y - cy) / (H * 0.7));
    if (d > 1) g.set(x, y, (Math.floor(Math.atan2(y - cy, x - cx) * 40) % 2) ? hex('#d8d8e0') : hex('#a8a8b8'));
    else if (d > 0.94) g.set(x, y, hex('#5a5a6a'));
  }
  // light leaking in around the rim
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; g.circle(cx + Math.cos(a) * W * 0.6, cy + Math.sin(a) * H * 0.68, 1, [255, 255, 255, 90]); }
  text(g, 'DENILE', Math.round(cx - textWidth('DENILE', 3) / 2), Math.round(cy - 12), hex('#2a2a34'), 3);
  return g;
}

// ------------------------------------------------------------------ the plant from outside, at night (480x216)
export function plantExterior(): Pix {
  const W = 480, H = 216;
  const g = new Pix(W, H);
  const r = rng(51);
  for (let y = 0; y < 120; y++) g.hline(0, W - 1, y, mix(hex('#070a1c'), hex('#1c2450'), y / 120));
  for (let i = 0; i < 80; i++) g.set(Math.floor(r() * W), Math.floor(r() * 90), r() < 0.2 ? P.goldHi : hex('#c8d0f0'));
  g.circle(410, 30, 9, hex('#f2ecd0')); g.circle(414, 27, 8, hex('#141c40'));
  // the river behind the island, with the city far off on the right
  g.rect(0, 104, W, 18, hex('#141c40'));
  for (let x = 300; x < W; x += 7) { const h = 6 + Math.floor(r() * 18); g.rect(x, 104 - h, 6, h, hex('#1a2048')); if (r() < 0.6) g.set(x + 2, 104 - h + 3, P.goldHi); }
  for (let y = 106; y < 122; y += 3) for (let x = Math.floor(r() * 12); x < W; x += 14 + Math.floor(r() * 10)) g.hline(x, x + 4, y, r() < 0.3 ? P.goldMid : hex('#2a3a7a'));
  // dock cranes
  for (const cx of [40, 120]) {
    g.rect(cx, 40, 4, 70, hex('#3a2a20')); g.rect(cx + 20, 40, 4, 70, hex('#3a2a20'));
    g.rect(cx - 20, 36, 70, 6, hex('#4a3426')); g.line(cx, 42, cx + 24, 70, hex('#3a2a20'), 2);
    g.rect(cx + 44, 42, 2, 20, hex('#222')); g.set(cx + 24, 34, P.red);
  }
  // the plant: a long blue building, stacks, the DeNile sign glowing
  g.rect(150, 58, 260, 66, hex('#1d2c58')); g.rect(150, 58, 260, 4, hex('#2a3e78'));
  for (let x = 158; x < 400; x += 18) g.rect(x, 74, 10, 6, r() < 0.7 ? hex('#5ce1ff') : hex('#24345e'));
  for (const sx of [180, 220, 360]) { g.rect(sx, 22, 12, 36, hex('#2a3048')); g.rect(sx, 22, 12, 3, P.red); g.circle(sx + 6, 14, 5, [200, 210, 230, 110]); g.circle(sx + 10, 6, 6, [200, 210, 230, 80]); }
  g.rect(238, 30, 112, 22, hex('#0b0f26')); g.rect(240, 32, 108, 18, DN);
  text(g, 'DENILE WATER', 242 + Math.round((104 - textWidth('DENILE WATER')) / 2), 34, P.white);
  text(g, 'ZERO MEMORY.', 242 + Math.round((104 - textWidth('ZERO MEMORY.')) / 2), 42, DN_HI);
  for (let x = 238; x < 350; x += 6) g.set(x, 53, [92, 225, 255, 120]);
  // the loading dock doors
  for (const dx of [170, 214, 300, 344]) { g.rect(dx, 94, 34, 30, STEEL_D); for (let y = 96; y < 122; y += 4) g.hline(dx + 1, dx + 32, y, STEEL); }
  g.rect(258, 98, 30, 26, hex('#fff1d0')); g.rect(260, 100, 26, 24, hex('#e8d8a8')); // the open door, lit
  // ground: lot, fence
  g.rect(0, 122, W, 94, hex('#24242e'));
  for (let y = 124; y < H; y += 2) for (let x = (y * 7) % 11; x < W; x += 11) g.set(x, y, hex('#2c2c38'));
  g.hline(0, W - 1, 122, hex('#6a6e80'));
  for (let x = 0; x < W; x += 6) { g.line(x, 126, x + 6, 146, hex('#5a5e6a')); g.line(x + 6, 126, x, 146, hex('#5a5e6a')); }
  g.hline(0, W - 1, 126, hex('#8a8e98')); for (let x = 0; x < W; x += 40) g.rect(x, 124, 3, 24, hex('#8a8e98'));
  // the open gate in the fence
  g.rect(232, 124, 80, 24, hex('#24242e'));
  g.rect(230, 112, 4, 38, hex('#8a8e98')); g.rect(310, 112, 4, 38, hex('#8a8e98'));
  g.rect(214, 103, 116, 9, DN); text(g, 'PRESIDENTS ISLAND', 214 + Math.round((116 - textWidth('PRESIDENTS ISLAND')) / 2), 104, P.white);
  g.hline(0, W - 1, 186, hex('#d8b830'));
  return g;
}
