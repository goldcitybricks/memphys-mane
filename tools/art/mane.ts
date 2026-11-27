// MEMPHYS Mane: cream-gold can, rubber-hose arms, white gloves, gold grill, gold kicks.
// Every frame is built from a pose so animation stays bouncy and consistent.
import { Pix, RGBA } from './pix';
import { P } from './palette';

export type Face = 'normal' | 'grin' | 'hurt' | 'yell' | 'ko' | 'sip' | 'smug';
export type Hand = 'fist' | 'open' | 'point' | 'can';

export interface Arm {
  hx: number; // hand x relative to the shoulder
  hy: number;
  bend?: number; // perpendicular bulge of the hose
  hand?: Hand;
  front?: boolean; // draw on top of the body
}

export interface Pose {
  x?: number;
  y?: number; // body lift (negative = up)
  sx?: number; // extra body width (squash/stretch)
  sy?: number; // extra body height
  tilt?: number; // top of can leans by this many pixels
  front: Arm; // right-side arm (facing side)
  back: Arm; // left-side arm
  ff: [number, number]; // front foot offset from its hip, [dx, dy]
  bf: [number, number];
  face?: Face;
  shades?: boolean | number; // number = shades sliding down from above (px)
  sparkle?: number; // 0 none, 1..3 sparkle size
  kickLeg?: boolean; // front leg straight out
}

const W0 = 24, H0 = 32, LEG = 9, BASE = 61;

export function drawMane(p: Pose): Pix {
  const g = new Pix(64, 64);
  const W = W0 + (p.sx ?? 0), H = H0 + (p.sy ?? 0);
  const cx = 32 + (p.x ?? 0);
  const bottom = BASE - LEG - 3 + (p.y ?? 0);
  const top = bottom - H;
  const left = Math.round(cx - W / 2);
  const tilt = p.tilt ?? 0;
  const rowOff = (y: number) => Math.round(tilt * (1 - (y - top) / H));

  // --- legs and shoes (drawn first, behind the can)
  const hipY = bottom;
  const drawLeg = (hipX: number, f: [number, number], frontLeg: boolean) => {
    const fx = hipX + f[0], fy = BASE - 3 + f[1];
    g.curve(hipX, hipY, hipX + f[0] * 0.3, (hipY + fy) / 2, fx, fy, P.ink, 2);
    drawShoe(g, fx, fy, frontLeg);
  };
  if (p.kickLeg) {
    drawLeg(cx - 5, p.bf, false);
    // straight kick: leg out to the right with the sole facing out
    const hx = cx + 4, hy = hipY - 2;
    const fx = hx + p.ff[0], fy = hy + p.ff[1];
    g.line(hx, hy, fx, fy, P.ink, 2);
    drawShoe(g, fx, fy - 1, true);
  } else {
    drawLeg(cx - 5, p.bf, false);
    drawLeg(cx + 4, p.ff, true);
  }

  // --- back arm (behind body unless it swings across)
  const shoulderY = top + Math.round(H * 0.55);
  const backShoulder: [number, number] = [left + 1 + rowOff(shoulderY), shoulderY];
  const frontShoulder: [number, number] = [left + W - 2 + rowOff(shoulderY), shoulderY];
  if (!p.back.front) drawArm(g, backShoulder, p.back, true);

  // --- the can
  for (let y = top; y <= bottom; y++) {
    const o = rowOff(y);
    const inset = y === top ? 2 : y === top + 1 ? 1 : y === bottom ? 1 : 0;
    for (let x = left + inset; x < left + W - inset; x++) {
      const u = (x - left) / (W - 1); // 0..1 across the can
      let c: RGBA;
      if (u < 0.1) c = P.canMid;
      else if (u < 0.24) c = P.canHi;
      else if (u < 0.62) c = P.can;
      else if (u < 0.82) c = P.canMid;
      else c = P.canShade;
      if (y <= top + 2) c = u < 0.3 ? P.white : u > 0.75 ? P.rimDark : P.rim; // lid
      if (y === top + 3) c = P.rimDark;
      if (y >= bottom - 2) c = u > 0.75 ? P.rimDark : P.rim; // base rim
      if (y === bottom - 3) c = P.canDark;
      g.set(x + o, y, c);
    }
  }
  // pull tab
  g.rect(cx - 2 + rowOff(top), top - 1, 4, 1, P.rimDark);

  // --- label art: bridge arch, face, grill, waves + pyramid, "Mane"
  const fx = cx + 2; // face center leans right (3/4 view)
  const L = (x: number, y: number, c: RGBA) => g.set(x + rowOff(y), y, c);
  const bY = top + 6;
  // the M-shaped bridge arches
  for (let i = -8; i <= 8; i++) {
    const a = Math.round(2 * Math.abs(Math.sin(((i + 8) / 16) * Math.PI * 2)));
    L(cx + i, bY - a, P.canDark);
  }
  for (let i = -9; i <= 9; i++) L(cx + i, bY + 1, P.canDark);

  const face = p.face ?? 'normal';
  const eY = top + 13;
  const shadesY = typeof p.shades === 'number' ? p.shades : p.shades ? 0 : null;

  // eyebrows (angry-confident)
  if (face !== 'ko') {
    const up = face === 'hurt' ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      L(fx - 7 + i, eY - 5 + (face === 'hurt' ? -Math.floor(i / 2) + 1 : Math.floor(i / 2)) - up, P.label);
      L(fx + 6 - i, eY - 5 + (face === 'hurt' ? -Math.floor(i / 2) + 1 : Math.floor(i / 2)) - up, P.label);
    }
  }
  // eyes
  const eye = (ex: number) => {
    if (face === 'ko') {
      L(ex - 1, eY - 1, P.label); L(ex + 1, eY + 1, P.label); L(ex, eY, P.label); L(ex + 1, eY - 1, P.label); L(ex - 1, eY + 1, P.label);
      return;
    }
    if (face === 'sip' || face === 'smug') {
      for (let i = -1; i <= 1; i++) L(ex + i, eY, P.label);
      L(ex - 2, eY - 1, P.label); L(ex + 2, eY - 1, P.label);
      return;
    }
    for (let yy = -2; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) L(ex + xx, eY + yy, P.eye);
    for (let yy = -2; yy <= 1; yy++) { L(ex - 2, eY + yy, P.label); L(ex + 2, eY + yy, P.label); }
    L(ex - 1, eY - 3, P.label); L(ex, eY - 3, P.label); L(ex + 1, eY - 3, P.label);
    L(ex - 1, eY + 2, P.label); L(ex, eY + 2, P.label); L(ex + 1, eY + 2, P.label);
    const pdx = face === 'hurt' ? -1 : 1;
    L(ex + pdx, eY - 1, P.ink); L(ex + pdx, eY, P.ink);
  };
  eye(fx - 4); eye(fx + 3);

  // nose
  L(fx, eY + 3, P.canHi); L(fx + 1, eY + 3, P.can); L(fx, eY + 4, P.can); L(fx + 1, eY + 4, P.canShade);
  L(fx - 1, eY + 4, P.label); L(fx + 2, eY + 4, P.label); L(fx, eY + 5, P.label); L(fx + 1, eY + 5, P.label);

  // mouth / gold grill
  const mY = eY + 7;
  if (face === 'sip') {
    for (let i = -1; i <= 2; i++) L(fx + i, mY + 1, P.label);
  } else if (face === 'hurt' || face === 'ko') {
    for (let i = -3; i <= 3; i++) L(fx + i, mY + (Math.abs(i) < 2 ? 0 : 1), P.label);
    L(fx - 1, mY + 1, P.gold); L(fx, mY + 1, P.gold); L(fx + 1, mY + 1, P.gold);
    for (let i = -2; i <= 2; i++) L(fx + i, mY + 2, P.label);
  } else {
    const wide = face === 'grin' || face === 'yell' ? 7 : 6;
    const tall = face === 'yell' ? 4 : 3;
    for (let i = -wide; i <= wide; i++) {
      const curve = Math.abs(i) >= wide - 1 ? -1 : 0;
      L(fx + i, mY - 1 + curve, P.label);
      L(fx + i, mY + tall + (Math.abs(i) >= wide - 1 ? -1 : 0), P.label);
    }
    for (let i = -wide + 1; i <= wide - 1; i++) {
      const edge = Math.abs(i) >= wide - 1;
      for (let j = 0; j < tall; j++) {
        if (edge && j >= tall - 1) continue;
        let c = j === 0 ? P.goldHi : j === tall - 1 ? P.goldMid : P.gold;
        if (face === 'yell' && j === tall - 1 && Math.abs(i) < wide - 2) c = P.ink;
        if ((i + wide) % 2 === 0 && j < tall - 1 && !edge) c = j === 0 ? P.gold : P.goldDark; // tooth gaps
        L(fx + i, mY + j, c);
      }
    }
  }
  // waves + pyramid on the right of the label
  const wY = top + H - 9;
  for (let i = 0; i < 4; i++) L(left + 2 + i, wY + (i % 2), P.labelGold);
  const pyX = left + W - 5;
  for (let r = 0; r < 4; r++) for (let i = -r; i <= r; i++) L(pyX + i, wY + 1 + r, i >= 0 ? P.labelGold : P.goldMid);
  // "Mane" script: a squiggle with a capital loop
  const sY = top + H - 5;
  const script = [0, -1, -2, -1, 0, -1, -2, -1, 0, 0, -1, 0, -1, 0];
  script.forEach((d, i) => L(cx - 9 + i, sY + d, P.label));
  L(cx - 9, sY - 2, P.label); L(cx - 8, sY - 3, P.label);

  // shades
  if (shadesY !== null) {
    const sy0 = eY - 2 - shadesY;
    for (let x = fx - 7; x <= fx + 6; x++) L(x, sy0, P.ink);
    for (let x = fx - 7; x <= fx - 1; x++) for (let y = 1; y <= 3; y++) if (!(y === 3 && (x === fx - 7 || x === fx - 1))) L(x, sy0 + y, P.ink);
    for (let x = fx + 1; x <= fx + 6; x++) for (let y = 1; y <= 3; y++) if (!(y === 3 && (x === fx + 1 || x === fx + 6))) L(x, sy0 + y, P.ink);
    L(fx - 6, sy0 + 1, P.white); L(fx + 2, sy0 + 1, P.white); L(fx - 5, sy0 + 1, P.greyDark);
    // arm of the shades disappearing around the can
    L(fx + 7, sy0, P.ink); L(fx + 8, sy0, P.ink);
  }

  // sparkle on the grill
  if (p.sparkle) drawSparkle(g, fx + 4 + rowOff(mY), mY - 1, p.sparkle);

  // --- front arm, and the back arm if it swings across
  if (p.back.front) drawArm(g, backShoulder, p.back, true, true);
  drawArm(g, frontShoulder, p.front, false);

  return g;
}

function drawArm(g: Pix, sh: [number, number], a: Arm, isBack: boolean, overBody = false) {
  const hx = sh[0] + a.hx, hy = sh[1] + a.hy;
  const mx = (sh[0] + hx) / 2, my = (sh[1] + hy) / 2;
  const len = Math.hypot(a.hx, a.hy) || 1;
  const bend = a.bend ?? 3;
  const cx = mx + (-a.hy / len) * bend, cy = my + (a.hx / len) * bend;
  g.curve(sh[0], sh[1], cx, cy, hx, hy, P.ink, 2);
  drawGlove(g, hx, hy, a.hand ?? 'fist', isBack && !overBody, a.hx >= 0);
}

function drawGlove(g: Pix, x: number, y: number, hand: Hand, dim: boolean, right: boolean) {
  const base = dim ? P.gloveShade : P.glove;
  const shade = dim ? P.grey : P.gloveShade;
  if (hand === 'can') {
    // small MEMPHYS can held up
    g.rect(x - 2, y - 7, 5, 8, P.ink);
    g.rect(x - 1, y - 6, 3, 6, P.can);
    g.set(x - 1, y - 6, P.white); g.set(x + 1, y - 3, P.gold); g.set(x, y - 3, P.gold);
  }
  const r = hand === 'open' ? 3 : 3;
  g.ellipse(x, y, r + 1, r + 1, P.ink);
  g.ellipse(x, y, r, r, base);
  g.set(x + (right ? 1 : -1), y + 2, shade); g.set(x + (right ? 2 : -2), y + 1, shade); g.set(x, y + 2, shade);
  g.set(x - (right ? 1 : -1), y - 2, P.white);
  if (hand === 'open') {
    // fingers up
    for (let i = -2; i <= 2; i += 2) { g.vline(x + i, y - 5, y - 3, P.ink); g.set(x + i, y - 5, base); g.set(x + i, y - 4, base); }
    g.set(x - 3, y - 5, P.ink); g.set(x - 1, y - 5, P.ink); g.set(x + 1, y - 5, P.ink); g.set(x + 3, y - 5, P.ink);
    g.hline(x - 2, x + 2, y - 6, P.ink);
  } else if (hand === 'point') {
    const d = right ? 1 : -1;
    g.hline(x + d * 3, x + d * 6, y - 1, P.ink); g.hline(x + d * 3, x + d * 6, y + 1, P.ink);
    g.hline(x + d * 3, x + d * 5, y, base); g.set(x + d * 7, y, P.ink);
  } else {
    // knuckle lines
    const d = right ? 1 : -1;
    g.set(x + d * 2, y - 1, shade); g.set(x + d * 2, y + 1, shade);
  }
}

function drawShoe(g: Pix, x: number, y: number, front: boolean) {
  const base = front ? P.gold : P.goldMid;
  const dark = P.goldDark;
  // toe points right
  g.rect(x - 4, y - 2, 9, 4, P.ink);
  g.rect(x - 3, y - 3, 6, 1, P.ink);
  g.set(x + 5, y - 1, P.ink); g.set(x + 5, y, P.ink);
  g.rect(x - 3, y - 2, 7, 2, base);
  g.rect(x - 2, y - 2, 4, 1, P.goldHi);
  g.set(x + 4, y - 1, base); g.set(x + 4, y, base);
  g.hline(x - 3, x + 4, y + 1, front ? P.white : P.glove); // white sole
  g.set(x, y - 2, P.white); g.set(x + 1, y - 1, dark); // laces
}

export function drawSparkle(g: Pix, x: number, y: number, s: number) {
  const c = P.white;
  g.set(x, y, c);
  for (let i = 1; i <= s; i++) { g.set(x + i, y, c); g.set(x - i, y, c); g.set(x, y + i, c); g.set(x, y - i, c); }
  if (s >= 2) { g.set(x + 1, y + 1, P.goldHi); g.set(x - 1, y - 1, P.goldHi); g.set(x + 1, y - 1, P.goldHi); g.set(x - 1, y + 1, P.goldHi); }
  if (s >= 3) { g.set(x + 4, y, P.goldHi); g.set(x - 4, y, P.goldHi); g.set(x, y + 4, P.goldHi); g.set(x, y - 4, P.goldHi); }
}

export function rot90(src: Pix, cw: boolean): Pix {
  const d = new Pix(src.h, src.w);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y)!;
      if (!c[3]) continue;
      if (cw) d.set(src.h - 1 - y, x, c);
      else d.set(y, src.w - 1 - x, c);
    }
  return d;
}

// ---------------------------------------------------------------- frames
const A = (hx: number, hy: number, extra: Partial<Arm> = {}): Arm => ({ hx, hy, ...extra });

export function maneFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, poses: (Pose | Pix)[]) => {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(p instanceof Pix ? p : finish(drawMane(p)));
  };

  const idle = (y: number, sy: number, arm: number): Pose => ({
    y, sy, sx: -sy, front: A(6, 9 + arm, { bend: -4 }), back: A(-6, 9 - arm, { bend: 4 }), ff: [2, 0], bf: [-1, 0],
  });
  add('idle', [idle(0, 0, 0), idle(0, 0, 1), idle(1, -1, 1), idle(1, -1, 0)]);

  const walk = (i: number): Pose => {
    const t = (i / 6) * Math.PI * 2;
    const s = Math.sin(t), c = Math.cos(t);
    return {
      y: -Math.round(Math.abs(c) * 2), sy: Math.abs(c) > 0.7 ? 1 : 0, sx: Math.abs(c) > 0.7 ? -1 : 0, tilt: 1,
      front: A(4 + Math.round(s * 5), 6 - Math.round(Math.abs(s) * 2), { bend: -3 }),
      back: A(-4 - Math.round(s * 5), 6 - Math.round(Math.abs(s) * 2), { bend: 3 }),
      ff: [Math.round(-s * 6), -Math.round(Math.max(0, c) * 3)],
      bf: [Math.round(s * 6), -Math.round(Math.max(0, -c) * 3)],
    };
  };
  add('walk', [0, 1, 2, 3, 4, 5].map(walk));

  add('jump', [
    { y: -2, sy: 4, sx: -3, front: A(5, -10, { hand: 'fist' }), back: A(-5, -9), ff: [1, -6], bf: [-2, -4] },
    { y: -4, sy: -1, sx: 1, front: A(7, 1), back: A(-7, 0), ff: [3, -8], bf: [-4, -7] },
    { y: -3, sy: 1, sx: -1, front: A(8, -4, { hand: 'open' }), back: A(-8, -5, { hand: 'open' }), ff: [3, -3], bf: [-3, -2] },
  ]);

  // punch combo: jab, hook, uppercut (9 frames)
  add('punch1', [
    { x: -1, tilt: -2, front: A(-2, 3), back: A(-6, 4), ff: [3, 0], bf: [-4, 0], face: 'normal' },
    { x: 2, tilt: 3, sx: 1, sy: -1, front: A(14, -1, { bend: 0 }), back: A(-6, 3), ff: [4, 0], bf: [-5, 0], face: 'yell' },
    { x: 1, tilt: 1, front: A(10, 1, { bend: -2 }), back: A(-6, 4), ff: [3, 0], bf: [-4, 0] },
  ]);
  add('punch2', [
    { x: 0, tilt: 2, front: A(4, 6), back: A(-10, -2), ff: [3, 0], bf: [-4, 0] },
    { x: 3, tilt: 4, sx: 1, sy: -1, front: A(2, 6), back: A(27, -2, { bend: -6, front: true }), ff: [5, 0], bf: [-5, 0], face: 'yell' },
    { x: 1, tilt: 1, front: A(5, 6), back: A(8, 2, { front: true }), ff: [3, 0], bf: [-4, 0] },
  ]);
  add('punch3', [
    { x: 0, y: 2, sy: -4, sx: 3, tilt: -1, front: A(2, 10, { bend: -2 }), back: A(-7, 4), ff: [4, 0], bf: [-5, 0], face: 'grin' },
    { x: 3, y: -4, sy: 5, sx: -3, tilt: 2, front: A(10, -22, { bend: -4 }), back: A(-7, 6), ff: [3, -2], bf: [-4, 0], face: 'yell' },
    { x: 2, y: -1, sy: 1, sx: -1, tilt: 1, front: A(9, -10, { bend: -3 }), back: A(-6, 6), ff: [3, 0], bf: [-4, 0], face: 'grin' },
  ]);
  add('kick', [
    { y: -4, sy: -1, front: A(6, -4), back: A(-8, -4), ff: [2, -8], bf: [-4, -6] },
    { y: -4, tilt: -3, front: A(-1, -8, { hand: 'fist' }), back: A(-10, -6), ff: [18, -2], bf: [-4, -6], kickLeg: true, face: 'yell' },
    { y: -3, tilt: -1, front: A(5, -2), back: A(-8, -2), ff: [10, -1], bf: [-3, -4], kickLeg: true },
  ]);
  add('hurt', [
    { x: -2, tilt: -5, sx: 2, sy: -2, front: A(4, -10, { hand: 'open' }), back: A(-6, -10, { hand: 'open' }), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
    { x: -1, tilt: -3, sx: 1, sy: -1, front: A(6, -6, { hand: 'open' }), back: A(-7, -7, { hand: 'open' }), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  // knockdown: fall back, flat, sit up, pop up
  const flat = rot90(drawMane({ front: A(8, -6, { hand: 'open' }), back: A(-8, -6, { hand: 'open' }), ff: [3, 0], bf: [-3, 0], face: 'ko' }), false);
  const flatF = new Pix(64, 64); flatF.blit(flat, -2, 12);
  add('knockdown', [
    { x: -4, y: 2, tilt: -9, sx: 1, sy: -2, front: A(6, -10, { hand: 'open' }), back: A(-6, -12, { hand: 'open' }), ff: [5, -3], bf: [2, -1], face: 'hurt' },
    finish(flatF),
    { y: 4, sy: -7, sx: 4, front: A(8, 4, { hand: 'open' }), back: A(-8, 4, { hand: 'open' }), ff: [5, 0], bf: [-5, 0], face: 'hurt' },
    { y: -3, sy: 4, sx: -3, front: A(5, -12, { hand: 'fist' }), back: A(-6, 2), ff: [2, 0], bf: [-2, 0], face: 'grin' },
  ]);
  // "You Thirsty Mane?" taunt: point at the player, lean in
  add('taunt', [
    { tilt: 2, front: A(8, -2, { hand: 'point' }), back: A(-4, 8, { bend: 2 }), ff: [3, 0], bf: [-3, 0], face: 'grin' },
    { tilt: 4, x: 1, sy: 1, front: A(12, -4, { hand: 'point' }), back: A(-4, 8), ff: [4, 0], bf: [-3, 0], face: 'yell' },
    { tilt: 4, x: 1, sy: 1, front: A(12, -5, { hand: 'point' }), back: A(-4, 8), ff: [4, 0], bf: [-3, 0], face: 'grin', sparkle: 1 },
    { tilt: 2, front: A(8, -2, { hand: 'point' }), back: A(-4, 8), ff: [3, 0], bf: [-3, 0], face: 'grin' },
  ]);
  // grill shine: big grin, sparkle pings
  add('shine', [
    { sy: 1, front: A(6, 6), back: A(-6, 6), ff: [2, 0], bf: [-2, 0], face: 'grin', sparkle: 1 },
    { sy: 2, sx: -1, front: A(7, -4, { hand: 'open' }), back: A(-6, 6), ff: [2, 0], bf: [-2, 0], face: 'grin', sparkle: 3 },
    { sy: 2, sx: -1, front: A(7, -4, { hand: 'open' }), back: A(-6, 6), ff: [2, 0], bf: [-2, 0], face: 'grin', sparkle: 2 },
    { sy: 1, front: A(6, 6), back: A(-6, 6), ff: [2, 0], bf: [-2, 0], face: 'grin', sparkle: 1 },
  ]);
  // the Sip: can to mouth, chug, shades slide on
  add('sip', [
    { front: A(4, -4, { hand: 'can' }), back: A(-5, 6), ff: [2, 0], bf: [-2, 0], face: 'normal' },
    { tilt: -3, sy: 1, front: A(2, -9, { hand: 'can', bend: -4 }), back: A(-5, 6), ff: [2, 0], bf: [-2, 0], face: 'sip' },
    { tilt: -4, sy: 2, sx: -1, front: A(1, -11, { hand: 'can', bend: -4 }), back: A(-6, 4), ff: [2, 0], bf: [-2, 0], face: 'sip' },
    { y: 1, sy: -2, sx: 2, front: A(8, -2, { hand: 'fist' }), back: A(-8, -2), ff: [3, 0], bf: [-3, 0], face: 'grin', shades: 6 },
    { y: -1, sy: 3, sx: -2, front: A(6, -14, { hand: 'fist' }), back: A(-7, -4), ff: [3, 0], bf: [-3, 0], face: 'grin', shades: 2 },
    { sy: 1, front: A(6, -12, { hand: 'fist' }), back: A(-6, 6), ff: [3, 0], bf: [-3, 0], face: 'grin', shades: true, sparkle: 2 },
  ]);
  add('victory', [
    { front: A(6, 6), back: A(-6, 6), ff: [2, 0], bf: [-2, 0], face: 'grin' },
    { y: 1, sy: -2, sx: 2, front: A(6, 4), back: A(-6, 4), ff: [3, 0], bf: [-3, 0], face: 'grin' },
    { y: -6, sy: 4, sx: -3, front: A(5, -16), back: A(-7, -6), ff: [1, -4], bf: [-2, -3], face: 'yell', shades: 4 },
    { y: -2, sy: 2, sx: -1, front: A(5, -16), back: A(-6, 6, { bend: 4 }), ff: [2, 0], bf: [-2, 0], face: 'grin', shades: true, sparkle: 1 },
    { front: A(5, -15), back: A(-6, 6, { bend: 4 }), ff: [2, 0], bf: [-2, 0], face: 'grin', shades: true, sparkle: 3 },
    { front: A(5, -15), back: A(-6, 6, { bend: 4 }), ff: [2, 0], bf: [-2, 0], face: 'grin', shades: true, sparkle: 2 },
  ]);
  // idle while in Mane Mode wears the shades
  add('idleShades', [0, 0, 1, 1].map((v, i) => ({ ...idle(v, -v, i % 2), face: 'smug' as Face, shades: true })));
  return { frames, anims };
}

export function finish(g: Pix): Pix {
  g.outline(P.ink);
  return g;
}

// 32x32 HUD portraits: normal, hurt, win (shades)
export function manePortraits(): Pix[] {
  const mk = (face: Face, shades: boolean, sparkle: number) => {
    const big = drawMane({ front: A(5, 8), back: A(-5, 8), ff: [2, 0], bf: [-2, 0], face, shades, sparkle });
    big.outline(P.ink);
    const out = new Pix(32, 32);
    // crop the face area (top of the can)
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const c = big.get(x + 18, y + 17);
      if (c && c[3]) out.set(x, y, c);
    }
    return out;
  };
  return [mk('normal', false, 0), mk('hurt', false, 0), mk('grin', true, 2)];
}
