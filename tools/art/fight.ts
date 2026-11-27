// Mission 3 "Fight Night": boxer Mane (red gloves, white trunks), Pip the DeNile bottle, the ref,
// the ring inside Mid-South Coliseum, and the fight HUD bits. Same specs as everything else:
// 64x64 character frames facing right, feet on the baseline, frames side by side.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawMane, drawBoxingGlove, drawSparkle, finish, rot90, Pose, Arm, Face } from './mane';
import { Outfit, HPose } from './human';

const A = (hx: number, hy: number, extra: Partial<Arm> = {}): Arm => ({ hx, hy, ...extra });

// lay a standing frame flat on the canvas (head to the left), bottom on the baseline
function layFlat(src: Pix, baseline = 60): Pix {
  const r = rot90(src, false);
  let maxY = 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.alpha(x, y)) maxY = Math.max(maxY, y);
  const out = new Pix(64, 64);
  out.blit(r, 0, baseline - maxY);
  return out;
}

// ------------------------------------------------------------------ MEMPHYS Mane, boxer
export function maneBoxFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const B = (p: Pose): Pose => ({ ...p, boxer: true });
  const add = (name: string, poses: (Pose | Pix)[]) => {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(p instanceof Pix ? p : finish(drawMane(B(p))));
  };
  const guard = (y: number, sy: number, k: number, face: Face = 'normal'): Pose => ({
    y, sy, sx: -sy, tilt: 1, front: A(9, -7 + k), back: A(23, 2 + k, { gloveFront: true, bend: -3 }), ff: [4, 0], bf: [-4, 0], face,
  });
  add('idle', [guard(0, 0, 0), guard(0, 0, 1), guard(1, -1, 1), guard(1, -1, 0)]);

  const walk = (i: number): Pose => {
    const t = (i / 6) * Math.PI * 2;
    const s = Math.sin(t), c = Math.cos(t);
    return {
      y: -Math.round(Math.abs(c) * 2), tilt: 1,
      front: A(9, -6 + Math.round(s), { bend: -3 }), back: A(23, 2 - Math.round(s), { gloveFront: true, bend: -3 }),
      ff: [Math.round(-s * 6), -Math.round(Math.max(0, c) * 3)], bf: [Math.round(s * 6), -Math.round(Math.max(0, -c) * 3)],
    };
  };
  add('walk', [0, 1, 2, 3, 4, 5].map(walk));

  // jab: the front hand snaps straight out
  add('jab', [
    { x: 1, tilt: 2, front: A(11, -6, { bend: -2 }), back: A(22, 2, { gloveFront: true }), ff: [4, 0], bf: [-5, 0], face: 'normal' },
    { x: 3, tilt: 4, sx: 1, sy: -1, front: A(16, -6, { bend: 0 }), back: A(21, 3, { gloveFront: true }), ff: [5, 0], bf: [-6, 0], face: 'yell' },
    { x: 2, tilt: 2, front: A(13, -6, { bend: -1 }), back: A(22, 2, { gloveFront: true }), ff: [4, 0], bf: [-5, 0] },
  ]);
  // hook: the back hand loops around
  add('hook', [
    { x: -2, tilt: -3, front: A(8, -8), back: A(-9, -3), ff: [3, 0], bf: [-5, 0], face: 'grin' },
    { x: 3, tilt: 5, sx: 1, sy: -1, front: A(6, -2), back: A(27, -7, { gloveFront: true, bend: -8 }), ff: [5, 0], bf: [-6, 0], face: 'yell' },
    { x: 3, tilt: 4, front: A(6, -2), back: A(25, -3, { gloveFront: true, bend: -5 }), ff: [5, 0], bf: [-6, 0], face: 'grin' },
    { x: 1, tilt: 2, front: A(8, -6), back: A(22, 1, { gloveFront: true }), ff: [4, 0], bf: [-5, 0] },
  ]);
  // block: both gloves up, peeking over them
  add('block', [
    { y: 1, sy: -1, tilt: -1, front: A(5, -12, { bend: -2 }), back: A(19, -9, { gloveFront: true, bend: -2 }), ff: [3, 0], bf: [-4, 0] },
    { y: 2, sy: -2, sx: 1, tilt: -1, front: A(5, -11, { bend: -2 }), back: A(19, -8, { gloveFront: true, bend: -2 }), ff: [3, 0], bf: [-4, 0] },
  ]);
  // dodge: sways way back, rubber-hose style
  add('dodge', [
    { x: -3, tilt: -5, front: A(7, -9), back: A(18, -4, { gloveFront: true }), ff: [5, 0], bf: [-3, 0], face: 'grin' },
    { x: -6, y: 1, tilt: -9, sy: -1, front: A(6, -10), back: A(16, -5, { gloveFront: true }), ff: [8, 0], bf: [-2, 0], face: 'grin', sparkle: 1 },
    { x: -3, tilt: -4, front: A(8, -8), back: A(20, -1, { gloveFront: true }), ff: [5, 0], bf: [-4, 0], face: 'normal' },
  ]);
  add('hurt', [
    { x: -3, tilt: -6, sx: 2, sy: -2, front: A(4, -11), back: A(-6, -10), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
    { x: -1, tilt: -3, sx: 1, sy: -1, front: A(7, -6), back: A(-7, -6), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  const flat = layFlat(finish(drawMane(B({ front: A(8, -6), back: A(-8, -6), ff: [3, 0], bf: [-3, 0], face: 'ko' }))), 61);
  add('knockdown', [
    { x: -4, y: 2, tilt: -9, sx: 1, sy: -2, front: A(6, -10), back: A(-6, -12), ff: [5, -3], bf: [2, -1], face: 'hurt' },
    flat,
  ]);
  add('getup', [
    { y: 4, sy: -7, sx: 4, front: A(8, 4), back: A(-8, 4), ff: [5, 0], bf: [-5, 0], face: 'hurt' },
    { y: -3, sy: 4, sx: -3, front: A(5, -12), back: A(-6, 2), ff: [2, 0], bf: [-2, 0], face: 'grin' },
  ]);
  // super: shades slide on, wind up, gold uppercut
  add('super', [
    { y: 1, sy: -2, sx: 2, front: A(8, -2), back: A(-8, -2), ff: [3, 0], bf: [-3, 0], face: 'grin', shades: 6 },
    { y: -1, sy: 2, sx: -1, front: A(6, -14), back: A(-7, -4), ff: [3, 0], bf: [-3, 0], face: 'grin', shades: 2, sparkle: 1 },
    { y: 3, sy: -4, sx: 3, tilt: -1, x: -1, front: A(2, 8, { bend: -2 }), back: A(22, 0, { gloveFront: true }), ff: [4, 0], bf: [-5, 0], face: 'grin', shades: true, sparkle: 3 },
    { x: 3, y: -5, sy: 5, sx: -3, tilt: 3, front: A(12, -22, { bend: -4 }), back: A(-7, 6), ff: [3, -3], bf: [-4, 0], face: 'yell', shades: true },
    { x: 2, y: -3, sy: 3, sx: -2, tilt: 2, front: A(10, -23, { bend: -3 }), back: A(-6, 4), ff: [3, -1], bf: [-4, 0], face: 'grin', shades: true, sparkle: 2 },
  ]);
  add('shine', [
    { ...guard(0, 1, 0, 'grin'), sparkle: 1 },
    { ...guard(0, 2, 0, 'grin'), sparkle: 3 },
    { ...guard(0, 1, 0, 'grin'), sparkle: 2 },
  ]);
  add('victory', [
    { y: 1, sy: -2, sx: 2, front: A(6, 4), back: A(-6, 4), ff: [3, 0], bf: [-3, 0], face: 'grin' },
    { y: -6, sy: 4, sx: -3, front: A(5, -18), back: A(-7, -17), ff: [1, -4], bf: [-2, -3], face: 'yell', shades: 4 },
    { y: -2, sy: 2, sx: -1, front: A(5, -18), back: A(-7, -17), ff: [2, 0], bf: [-2, 0], face: 'grin', shades: true, sparkle: 1 },
    { front: A(5, -17), back: A(-7, -16), ff: [2, 0], bf: [-2, 0], face: 'grin', shades: true, sparkle: 3 },
  ]);
  // the corner sip
  add('sip', [
    { front: A(4, -4, { hand: 'can' }), back: A(-5, 6), ff: [2, 0], bf: [-2, 0], face: 'normal' },
    { tilt: -3, sy: 1, front: A(2, -9, { hand: 'can', bend: -4 }), back: A(-5, 6), ff: [2, 0], bf: [-2, 0], face: 'sip' },
    { tilt: -4, sy: 2, sx: -1, front: A(1, -11, { hand: 'can', bend: -4 }), back: A(-6, 4), ff: [2, 0], bf: [-2, 0], face: 'sip' },
    { y: -1, sy: 2, sx: -1, front: A(6, -13), back: A(-6, 4), ff: [3, 0], bf: [-3, 0], face: 'grin', sparkle: 2 },
  ]);
  add('taunt', [
    { tilt: 2, front: A(12, -3), back: A(-4, 8, { bend: 2 }), ff: [3, 0], bf: [-3, 0], face: 'grin' },
    { tilt: 4, x: 1, sy: 1, front: A(14, -6), back: A(-4, 8), ff: [4, 0], bf: [-3, 0], face: 'yell' },
    { tilt: 4, x: 1, sy: 1, front: A(14, -7), back: A(-4, 8), ff: [4, 0], bf: [-3, 0], face: 'grin', sparkle: 1 },
  ]);
  // standing over Pip, like the poster: one glove up by his face, one glove low
  add('standOver', [
    { tilt: 3, y: 1, sy: -1, front: A(12, 9, { bend: -3 }), back: A(-3, -14, { bend: 3 }), ff: [5, 0], bf: [-5, 0], face: 'grin' },
    { tilt: 3, y: 1, sy: -1, front: A(12, 9, { bend: -3 }), back: A(-3, -14, { bend: 3 }), ff: [5, 0], bf: [-5, 0], face: 'grin', sparkle: 3 },
  ]);
  // knocked silly: gloves down, wobbling
  add('dazed', [
    { x: -1, tilt: -2, front: A(6, 8), back: A(-6, 8), ff: [3, 0], bf: [-3, 0], face: 'ko' },
    { x: 1, tilt: 2, front: A(6, 8), back: A(-6, 8), ff: [3, 0], bf: [-3, 0], face: 'ko' },
  ]);
  return { frames, anims };
}

// ------------------------------------------------------------------ Pip, the DeNile Water mascot
// A crinkly blue plastic bottle with red gloves and black boxing boots. Loud mouth, zero memory.
type PipFace = 'mean' | 'yell' | 'hurt' | 'ko' | 'smug' | 'dizzy' | 'squint';
interface PipPose {
  x?: number; y?: number; sx?: number; sy?: number; tilt?: number;
  front: Arm; back: Arm; ff: [number, number]; bf: [number, number];
  face?: PipFace; capOff?: boolean; crinkle?: number; glow?: boolean;
}

const PL = hex('#e4f4ff'), PH = hex('#a8dcff'), PM = hex('#7fc4ff'), PS = hex('#4c8fd0'), PD = hex('#2f6aa8');
const BOOT = hex('#1c1c24'), BOOT_HI = hex('#44444f');

function pipShoe(g: Pix, x: number, y: number) {
  // tall black boxing boot, toe to the right
  g.rect(x - 3, y - 6, 6, 7, BOOT);
  g.rect(x + 3, y - 2, 2, 3, BOOT);
  g.vline(x - 2, y - 5, y - 1, BOOT_HI);
  for (let k = 0; k < 3; k++) g.set(x, y - 5 + k * 2, P.white);
  g.hline(x - 3, x + 4, y + 1, P.greyDark);
}

function drawPip(p: PipPose): Pix {
  const g = new Pix(64, 64);
  const W = 18 + (p.sx ?? 0), H = 30 + (p.sy ?? 0);
  const cx = 32 + (p.x ?? 0);
  const bottom = 50 + (p.y ?? 0);
  const top = bottom - H;
  const tilt = p.tilt ?? 0;
  const off = (y: number) => Math.round(tilt * (1 - (y - top) / H));
  const cr = p.crinkle ?? 0;

  // legs and boots
  for (const [hx, f] of [[cx - 4, p.bf], [cx + 4, p.ff]] as [number, [number, number]][]) {
    const fx = hx + f[0], fy = 58 + f[1];
    g.curve(hx, bottom, hx + f[0] * 0.3, (bottom + fy) / 2, fx, fy - 5, P.ink, 2);
    pipShoe(g, fx, fy);
  }
  const shY = top + 12;
  const left = cx - Math.floor(W / 2);
  const backSh: [number, number] = [left + 1 + off(shY), shY];
  const frontSh: [number, number] = [left + W - 2 + off(shY), shY];
  const arm = (sh: [number, number], a: Arm, back: boolean, over: boolean, part: 'all' | 'hose' | 'glove' = 'all') => {
    const hx = sh[0] + a.hx, hy = sh[1] + a.hy;
    const len = Math.hypot(a.hx, a.hy) || 1, bend = a.bend ?? 3;
    if (part === 'glove') { drawBoxingGlove(g, hx, hy, 'fist', false, a.hx >= 0); return; }
    if (part === 'hose') { g.curve(sh[0], sh[1], (sh[0] + hx) / 2 + (-a.hy / len) * bend, (sh[1] + hy) / 2 + (a.hx / len) * bend, hx, hy, P.ink, 2); return; }
    g.curve(sh[0], sh[1], (sh[0] + hx) / 2 + (-a.hy / len) * bend, (sh[1] + hy) / 2 + (a.hx / len) * bend, hx, hy, P.ink, 2);
    drawBoxingGlove(g, hx, hy, 'fist', back && !over, a.hx >= 0);
  };
  if (!p.back.front) arm(backSh, p.back, true, false, p.back.gloveFront ? 'hose' : 'all');

  // the bottle: shoulders, crinkles, translucent blue
  for (let y = top; y <= bottom; y++) {
    const o = off(y);
    const k = Math.min(1, (y - top) / 5);
    let hw = Math.round(4 + (W / 2 - 4) * Math.sqrt(k));
    // crinkly silhouette: dents in and out
    const dent = ((y * 7 + 3) % 5 === 0 ? -1 : (y * 3) % 7 === 0 ? 1 : 0) * (1 + Math.round(cr * 2));
    if (y > top + 4 && y < bottom - 1) hw += dent;
    if (y === bottom) hw -= 1;
    for (let x = cx - hw; x < cx + hw; x++) {
      const u = (x - (cx - hw)) / Math.max(1, hw * 2 - 1);
      let c: RGBA = u < 0.12 ? PS : u < 0.3 ? PH : u < 0.62 ? PM : u < 0.84 ? PS : PD;
      if (u > 0.18 && u < 0.24 && y > top + 3) c = PL; // shine streak
      g.set(x + o, y, p.glow ? mix(c, P.white, 0.25) : c);
    }
    // crinkle ridges: a light line over a dark line, zigzagging
    const ridgeEvery = cr > 0.5 ? 3 : 5;
    if (y > top + 5 && y < bottom - 1 && (y - top) % ridgeEvery === 0) {
      for (let x = cx - hw + 2; x < cx + hw - 2; x++) {
        const zig = (x + y) % 4 < 2 ? 0 : 1;
        g.set(x + o, y + zig, PH);
        g.set(x + o, y + zig + 1, PS);
      }
    }
  }
  // base ridge (the bottle's petal foot)
  for (let x = cx - Math.floor(W / 2) + 1; x < cx + Math.floor(W / 2) - 1; x += 3) g.set(x + off(bottom), bottom, PD);

  // neck and cap
  const nt = top - 3;
  g.rect(cx - 3 + off(nt), nt, 6, 4, PM);
  g.vline(cx - 2 + off(nt), nt, nt + 3, PH);
  g.hline(cx - 4 + off(nt), cx + 3 + off(nt), nt + 3, PS); // neck ring
  if (!p.capOff) {
    g.rect(cx - 4 + off(nt), nt - 4, 8, 4, P.white);
    for (let x = cx - 4; x < cx + 4; x += 2) g.vline(x + off(nt), nt - 4, nt - 1, P.bottleCap);
    g.hline(cx - 4 + off(nt), cx + 3 + off(nt), nt - 4, P.white);
    g.set(cx + 3 + off(nt), nt - 2, P.grey);
  } else {
    g.rect(cx - 3 + off(nt), nt - 1, 6, 1, PD);
  }

  // DeNile label band near the bottom: white with a blue wave
  const lY = bottom - 9;
  for (let y = lY; y < lY + 5; y++) for (let x = cx - Math.floor(W / 2) + 1; x < cx + Math.floor(W / 2) - 1; x++) {
    const u = (x - (cx - W / 2)) / W;
    g.set(x + off(y), y, u > 0.8 ? P.apronShade : P.white);
  }
  for (let x = cx - Math.floor(W / 2) + 2; x < cx + Math.floor(W / 2) - 2; x++) g.set(x + off(lY + 2), lY + 2 + ((x >> 1) % 2), PS);
  g.set(cx + 4 + off(lY + 1), lY + 1, P.red); // a little red drop logo
  g.set(cx + 4 + off(lY + 2), lY + 2, P.red); g.set(cx + 3 + off(lY + 2), lY + 2, P.red); g.set(cx + 5 + off(lY + 2), lY + 2, P.red);

  // the face, leaning right (3/4 view)
  const fx = cx + 2;
  const eY = top + 9;
  const L = (x: number, y: number, c: RGBA) => g.set(x + off(y), y, c);
  const face = p.face ?? 'mean';
  const eye = (ex: number, inner: number) => {
    if (face === 'ko') { L(ex - 1, eY - 1, P.ink); L(ex + 1, eY + 1, P.ink); L(ex, eY, P.ink); L(ex + 1, eY - 1, P.ink); L(ex - 1, eY + 1, P.ink); return; }
    if (face === 'smug' || face === 'squint') { for (let i = -1; i <= 1; i++) L(ex + i, eY, P.ink); L(ex + inner, eY - 1, P.ink); return; }
    for (let yy = -2; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) L(ex + xx, eY + yy, P.white);
    if (face === 'dizzy') { L(ex, eY - 1, P.ink); L(ex + 1, eY, P.ink); L(ex, eY + 1, P.ink); L(ex - 1, eY, P.ink); return; }
    L(ex + 1, eY - 1, P.ink); L(ex + 1, eY, P.ink); // pupils look at Mane
    if (face === 'hurt') { L(ex, eY - 1, P.ink); }
  };
  eye(fx - 4, 1); eye(fx + 3, -1);
  // angry brows slanting down to the middle (raised when hurt)
  if (face !== 'ko' && face !== 'dizzy') {
    const s = face === 'hurt' ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      L(fx - 6 + i, eY - 4 + (s > 0 ? Math.floor(i / 2) : 1 - Math.floor(i / 2)), PD);
      L(fx + 5 - i, eY - 4 + (s > 0 ? Math.floor(i / 2) : 1 - Math.floor(i / 2)), PD);
    }
  }
  // the loud mouth
  const mY = eY + 5;
  if (face === 'yell') {
    for (let y = 0; y < 5; y++) for (let x = -4 + (y > 2 ? y - 2 : 0); x <= 4 - (y > 2 ? y - 2 : 0); x++) L(fx + x, mY + y, P.inkSoft);
    for (let x = -3; x <= 3; x++) L(fx + x, mY, P.white);
    L(fx - 1, mY + 3, P.red); L(fx, mY + 3, P.red); L(fx + 1, mY + 3, P.red);
  } else if (face === 'hurt' || face === 'dizzy') {
    for (let x = -3; x <= 3; x++) L(fx + x, mY + 1 + (x % 2 === 0 ? 0 : 1), PD);
  } else if (face === 'ko') {
    for (let x = -2; x <= 2; x++) L(fx + x, mY + 1, PD);
    L(fx + 1, mY + 2, P.red); L(fx + 2, mY + 2, P.red); L(fx + 1, mY + 3, P.red);
  } else {
    // smirk with teeth
    for (let x = -4; x <= 4; x++) L(fx + x, mY + (x > 2 ? -1 : 0), PD);
    for (let x = -3; x <= 2; x++) L(fx + x, mY + 1, P.white);
    for (let x = -4; x <= 3; x++) L(fx + x, mY + 2, PD);
    if (face === 'smug') L(fx + 4, mY - 2, PD);
  }

  if (p.back.front) arm(backSh, p.back, true, true);
  else if (p.back.gloveFront) arm(backSh, p.back, true, true, 'glove');
  arm(frontSh, p.front, false, false);
  g.outline(P.ink);
  return g;
}

function flipV(src: Pix, baseline = 61): Pix {
  const f = new Pix(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.get(x, src.h - 1 - y)!; if (c[3]) f.set(x, y, c); }
  let maxY = 0;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.alpha(x, y)) maxY = Math.max(maxY, y);
  const out = new Pix(64, 64); out.blit(f, 0, baseline - maxY);
  return out;
}

export function pipFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, poses: (PipPose | Pix)[]) => {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(p instanceof Pix ? p : drawPip(p));
  };
  const guard = (y: number, k: number, face: PipFace = 'mean'): PipPose => ({
    y, sy: -y, tilt: 1, front: A(9, -5 + k), back: A(20, 3 + k, { gloveFront: true }), ff: [4, 0], bf: [-4, 0], face,
  });
  add('idle', [guard(0, 0), guard(0, 1), guard(1, 1), guard(1, 0)]);
  add('walk', [0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return { ...guard(i % 2 ? -1 : 0, 0), ff: [Math.round(-s * 5), i === 1 ? -2 : 0], bf: [Math.round(s * 5), i === 3 ? -2 : 0] } as PipPose;
  }));
  // jab: windup, snap, recover
  add('jab', [
    { x: -2, tilt: -2, front: A(2, -6), back: A(19, 3, { gloveFront: true }), ff: [3, 0], bf: [-5, 0], face: 'mean' },
    { x: 3, tilt: 4, sx: -1, front: A(17, -5, { bend: 0 }), back: A(18, 4, { gloveFront: true }), ff: [5, 0], bf: [-6, 0], face: 'yell' },
    { x: 1, tilt: 2, front: A(12, -5), back: A(19, 3, { gloveFront: true }), ff: [4, 0], bf: [-5, 0], face: 'mean' },
  ]);
  // the single-use haymaker: big windup, big swing
  add('hay', [
    { x: -4, tilt: -5, sy: 1, front: A(4, -4), back: A(-10, -10, { bend: 4 }), ff: [3, 0], bf: [-6, 0], face: 'yell' },
    { x: -5, tilt: -6, sy: 2, front: A(4, -3), back: A(-11, -14, { bend: 5 }), ff: [3, 0], bf: [-6, 0], face: 'yell' },
    { x: 4, tilt: 6, sx: 1, sy: -1, front: A(4, 2), back: A(28, -6, { gloveFront: true, bend: -8 }), ff: [6, 0], bf: [-6, 0], face: 'yell' },
    { x: 3, tilt: 4, front: A(5, 0), back: A(24, -1, { gloveFront: true, bend: -5 }), ff: [5, 0], bf: [-6, 0], face: 'mean' },
  ]);
  // cap shot: grabs his cap, aims, fires it like a bullet
  add('cap', [
    { tilt: -1, front: A(-2, -20, { bend: -3 }), back: A(19, 3, { gloveFront: true }), ff: [3, 0], bf: [-4, 0], face: 'smug' },
    { tilt: 2, sy: 1, front: A(14, -10), back: A(19, 3, { gloveFront: true }), ff: [4, 0], bf: [-5, 0], face: 'yell', capOff: true },
    { tilt: 1, front: A(9, -5), back: A(19, 3, { gloveFront: true }), ff: [4, 0], bf: [-4, 0], face: 'mean', capOff: true },
  ]);
  // bottle flip: crouch, tuck
  add('crouch', [
    { y: 4, sy: -5, sx: 2, front: A(8, 4), back: A(-7, 4), ff: [4, 0], bf: [-4, 0], face: 'yell' },
  ]);
  add('tuck', [
    { y: -6, sy: -2, front: A(6, 2), back: A(-6, 2), ff: [4, -10], bf: [-2, -9], face: 'yell' },
  ]);
  // stuck upside down on his cap, boots kicking
  const kick = (a: number, face: PipFace): PipPose => ({ front: A(10, 8 + a), back: A(-8, 8 - a), ff: [3 + a, -2 - a], bf: [-3 - a, -1 + a], face });
  add('stuck', [flipV(drawPip(kick(2, 'dizzy'))), flipV(drawPip(kick(-2, 'dizzy'))), flipV(drawPip(kick(1, 'hurt')))]);
  // crinkle: crushes himself down so punches fly over
  add('crinkle', [
    { y: 5, sy: -9, sx: 4, crinkle: 1, front: A(4, -12), back: A(14, -12, { gloveFront: true }), ff: [4, 0], bf: [-4, 0], face: 'squint' },
    { y: 6, sy: -10, sx: 5, crinkle: 1, front: A(4, -11), back: A(14, -11, { gloveFront: true }), ff: [4, 0], bf: [-4, 0], face: 'squint' },
  ]);
  // pop: springs back up into an uppercut
  add('pop', [
    { y: -3, sy: 4, sx: -2, tilt: 3, front: A(12, -20, { bend: -4 }), back: A(-6, 2), ff: [3, -2], bf: [-4, 0], face: 'yell' },
    { y: -1, sy: 1, tilt: 2, front: A(10, -16, { bend: -3 }), back: A(-6, 3), ff: [3, 0], bf: [-4, 0], face: 'mean' },
  ]);
  add('block', [
    { y: 1, sy: -1, tilt: -1, front: A(5, -11), back: A(16, -8, { gloveFront: true }), ff: [3, 0], bf: [-4, 0], face: 'squint' },
  ]);
  add('hurt', [
    { x: -3, tilt: -6, sx: 2, sy: -2, crinkle: 0.6, front: A(4, -12), back: A(-6, -10), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
    { x: -1, tilt: -3, sx: 1, sy: -1, crinkle: 0.3, front: A(7, -6), back: A(-7, -6), ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  add('dazed', [
    { x: -1, tilt: -3, front: A(7, 8), back: A(-6, 8), ff: [3, 0], bf: [-3, 0], face: 'dizzy' },
    { x: 1, tilt: 3, front: A(7, 8), back: A(-6, 8), ff: [3, 0], bf: [-3, 0], face: 'dizzy' },
  ]);
  const flat = layFlat(drawPip({ front: A(9, -8), back: A(-8, -9), ff: [3, 0], bf: [-3, 0], face: 'ko', crinkle: 1 }), 61);
  add('knockdown', [
    { x: -4, y: 2, tilt: -9, sx: 1, sy: -2, crinkle: 0.8, front: A(6, -12), back: A(-6, -13), ff: [5, -3], bf: [2, -1], face: 'hurt' },
    flat,
  ]);
  add('getup', [
    { y: 5, sy: -7, sx: 4, crinkle: 0.6, front: A(8, 4), back: A(-8, 4), ff: [5, 0], bf: [-5, 0], face: 'hurt' },
    { y: -2, sy: 3, sx: -2, front: A(8, -8), back: A(-6, 2), ff: [2, 0], bf: [-2, 0], face: 'mean' },
  ]);
  // "come on": gloves out wide, trash talking
  add('taunt', [
    { tilt: -1, sy: 1, front: A(12, -2), back: A(-12, -2), ff: [4, 0], bf: [-4, 0], face: 'yell' },
    { tilt: 1, front: A(13, -6), back: A(-12, -6), ff: [4, 0], bf: [-4, 0], face: 'smug' },
  ]);
  // the DeNile refill: glowing, puffed up
  add('refill', [
    { sy: 2, sx: 2, front: A(10, -14), back: A(-10, -14), ff: [4, 0], bf: [-4, 0], face: 'yell', glow: true },
    { sy: 3, sx: 3, front: A(11, -16), back: A(-11, -16), ff: [4, 0], bf: [-4, 0], face: 'smug', glow: true },
  ]);
  return { frames, anims };
}

// HUD portrait: the top of the bottle
export function pipPortrait(): Pix[] {
  const mk = (face: PipFace) => {
    const big = drawPip({ front: A(9, 8), back: A(-9, 8), ff: [3, 0], bf: [-3, 0], face });
    const out = new Pix(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = big.get(x + 18, y + 8); if (c && c[3]) out.set(x, y, c); }
    return out;
  };
  return [mk('mean'), mk('hurt'), mk('ko')];
}

// ------------------------------------------------------------------ the ref
export const ref: Outfit = {
  skin: P.skin2, skinShade: P.skin2Shade, top: hex('#f0f0f4'), topShade: hex('#b8b8c8'), pants: P.ink, pantsShade: P.ink,
  shoes: P.ink, shoesShade: P.ink, head: 'ref', bowtie: true,
};
const rwalk = (i: number): HPose => {
  const t = (i / 4) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
  return { y: -Math.round(Math.abs(c)), lean: 1, fa: [3 + Math.round(-s * 4), 9], ba: [-1 + Math.round(s * 4), 9], ff: [Math.round(s * 5), -Math.round(Math.max(0, -c) * 2)], bf: [Math.round(-s * 5), -Math.round(Math.max(0, c) * 2)] };
};
export const refDef = (): Record<string, HPose[]> => ({
  idle: [
    { fa: [3, 9], ba: [0, 9], ff: [3, 0], bf: [-4, 0] },
    { fa: [3, 10], ba: [0, 10], ff: [3, 0], bf: [-4, 0], crouch: 1 },
  ],
  walk: [0, 1, 2, 3].map(rwalk),
  // the count: arm up, then chop down with fingers out
  count: [
    { fa: [4, -14], fHand: 'open', ba: [-1, 9], ff: [4, 0], bf: [-4, 0], lean: -1, crouch: 1 },
    { fa: [12, 4], fHand: 'open', fab: 0, ba: [-1, 9], ff: [4, 0], bf: [-4, 0], lean: 3, crouch: 3, face: 'angry' },
  ],
  // "FIGHT!": arms chop between the fighters
  fight: [
    { fa: [10, -10], fHand: 'open', ba: [-8, -10], bHand: 'open', ff: [4, 0], bf: [-4, 0] },
    { fa: [13, 2], fHand: 'open', fab: 0, ba: [-11, 2], bHand: 'open', ff: [5, 0], bf: [-5, 0], face: 'angry' },
  ],
  // waving it off
  wave: [
    { fa: [10, -4], fHand: 'open', ba: [-6, -4], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'angry' },
    { fa: [-4, -4], fHand: 'open', ba: [8, -4], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'angry' },
  ],
  // lifting the bottle into the bin
  lift: [
    { fa: [6, -16], fHand: 'open', ba: [2, -16], bHand: 'open', ff: [3, 0], bf: [-4, 0], lean: -1, face: 'smile' },
  ],
});

// ------------------------------------------------------------------ props + FX
export function capProj(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(10, 10);
    if (f % 2 === 0) { g.rect(2, 3, 6, 4, P.white); for (let x = 2; x < 8; x += 2) g.vline(x, 3, 6, P.bottleCap); }
    else { g.rect(3, 2, 4, 6, P.white); for (let y = 2; y < 8; y += 2) g.hline(3, 6, y, P.bottleCap); }
    g.outline(P.ink);
    return g;
  });
}

export function recycleBin(): Pix {
  const g = new Pix(30, 36);
  const B: RGBA = hex('#2a6ad0'), BD: RGBA = hex('#1c4a98'), BL: RGBA = hex('#5a92e8');
  g.poly([[4, 6], [26, 6], [24, 35], [6, 35]], B);
  g.vline(7, 7, 34, BL); g.vline(8, 7, 34, BL);
  for (let y = 7; y < 35; y++) { g.set(22 - Math.round((y - 7) / 14), y, BD); g.set(23 - Math.round((y - 7) / 14), y, BD); }
  g.rect(2, 2, 26, 4, BD); g.hline(3, 26, 2, BL);
  // three chasing arrows
  const W: RGBA = P.white;
  const cx = 15, cy = 20;
  g.line(cx - 5, cy + 4, cx, cy - 5, W, 1); g.line(cx, cy - 5, cx + 5, cy + 4, W, 1); g.line(cx + 5, cy + 4, cx - 5, cy + 4, W, 1);
  g.set(cx - 1, cy - 5, W); g.set(cx - 2, cy - 4, W); // arrowheads
  g.set(cx + 5, cy + 3, W); g.set(cx + 6, cy + 4, W);
  g.set(cx - 5, cy + 5, W); g.set(cx - 6, cy + 4, W);
  g.outline(P.ink);
  return g;
}

// a DeNile dollar: the bet O.G. pays out
export function cashProp(): Pix {
  const g = new Pix(12, 7);
  g.rect(0, 0, 12, 7, hex('#4a9a4a'));
  g.rect(1, 1, 10, 5, hex('#6cc06c'));
  g.circle(6, 3, 1, hex('#2a6a2a'));
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ the ring at Mid-South Coliseum (480x216)
export const ARENA_W = 480;
export function arena(): Pix {
  const g = new Pix(ARENA_W, 216);
  const r = rng(303);
  const NAVY = hex('#0a0e26'), NAVY2 = hex('#141a3c'), STEEL = hex('#2a3058');
  // the dome
  for (let y = 0; y < 216; y++) g.hline(0, ARENA_W - 1, y, mix(NAVY, NAVY2, Math.min(1, y / 110)));
  for (let i = -6; i < 16; i++) { const x = i * 40; g.line(x, 0, x + 60, 60, STEEL); g.line(x + 60, 0, x, 60, STEEL); }
  g.hline(0, ARENA_W - 1, 60, STEEL); g.hline(0, ARENA_W - 1, 2, STEEL);
  // hanging lights
  for (const lx of [90, 190, 290, 390]) {
    g.vline(lx, 0, 14, STEEL);
    g.rect(lx - 6, 14, 12, 5, P.greyDark);
    g.hline(lx - 5, lx + 5, 19, P.goldHi);
  }
  // the big sponsor banner (fictional): DENILE WATER FIGHT NIGHT
  const bw = 210, bx = ARENA_W / 2 - bw / 2, by = 22;
  g.rect(bx, by, bw, 26, hex('#1c4a98'));
  g.rect(bx + 2, by + 2, bw - 4, 22, hex('#2a6ad0'));
  g.hline(bx + 2, bx + bw - 3, by + 2, hex('#5a92e8'));
  const t1 = 'DENILE WATER PRESENTS';
  text(g, t1, Math.round(ARENA_W / 2 - textWidth(t1) / 2), by + 4, P.white);
  const t2 = 'FIGHT NIGHT';
  text(g, t2, Math.round(ARENA_W / 2 - textWidth(t2, 1, 2) / 2), by + 14, P.gold, 1, 2);
  for (const [x, s] of [[30, 'ZERO TASTE.'], [ARENA_W - 30 - textWidth('ZERO MEMORY.'), 'ZERO MEMORY.']] as [number, string][]) {
    const w = textWidth(s);
    g.rect(x - 3, 34, w + 6, 11, hex('#e8eef8'));
    text(g, s, x, 36, hex('#1c4a98'));
  }
  // crowd: rows of heads and shoulders, getting darker toward the back
  const skins = [P.skin1, P.skin2, P.skin3, hex('#c08a64'), hex('#e0b48c')];
  const shirts = [P.hoodRed, P.blue, P.hoodGrey, P.hoodGreen, P.purple, P.gold, P.white, hex('#d86a2a'), P.denim];
  for (let row = 0; row < 7; row++) {
    const y = 66 + row * 12;
    const dark = 0.75 - row * 0.09;
    for (let x = -6 + (row % 2) * 5; x < ARENA_W + 8; x += 9 + Math.floor(r() * 3)) {
      const sk = skins[Math.floor(r() * skins.length)], sh = shirts[Math.floor(r() * shirts.length)];
      const hy = y + Math.floor(r() * 3);
      g.ellipse(x, hy + 9, 5, 4, mix(sh, NAVY, dark));
      g.circle(x, hy + 2, 3, mix(sk, NAVY, dark));
      if (r() < 0.4) g.ellipse(x, hy, 3, 2, mix(P.ink, NAVY, dark * 0.6)); // hair / hats
      if (r() < 0.07) { g.line(x + 3, hy + 6, x + 6, hy - 4, mix(sk, NAVY, dark), 2); } // a hand up
      if (r() < 0.05 && row > 1) { g.rect(x + 3, hy + 1, 3, 4, P.greyDark); g.set(x + 4, hy + 2, hex('#a0d8ff')); } // phone up
    }
  }
  // fan signs held up over the crowd
  for (const [sx, y, t, c] of [[60, 86, '901', P.gold], [356, 86, 'MANE!', P.white], [150, 110, 'MEMPHIS!', P.white], [300, 110, 'PIP?', hex('#a8dcff')]] as [number, number, string, RGBA][]) {
    const w = textWidth(t);
    g.rect(sx - 3, y - 3, w + 6, 13, P.ink);
    g.rect(sx - 2, y - 2, w + 4, 11, mix(c, NAVY, 0.15));
    text(g, t, sx, y, P.ink);
  }
  // ring posts and the back ropes
  const ROPE = hex('#2a5bb8'), ROPE_HI = hex('#6a9ae8');
  for (const [px, pad] of [[64, P.red], [ARENA_W - 64, P.blue]] as [number, RGBA][]) {
    g.rect(px - 3, 112, 6, 46, P.greyDark); g.vline(px - 2, 112, 157, P.grey);
    for (const y of [118, 130, 142]) g.rect(px - 4, y - 2, 8, 5, pad);
  }
  for (const y of [118, 130, 142]) { g.hline(64, ARENA_W - 64, y, ROPE); g.hline(64, ARENA_W - 64, y - 1, ROPE_HI); }
  // the canvas: cream, a little worn, lit from above
  const CAN = hex('#e9dcbc'), CAN_D = hex('#c8b890'), CAN_DD = hex('#a89870');
  for (let y = 150; y < 200; y++) {
    const inset = Math.round((200 - y) * 0.9);
    for (let x = 8 + inset; x < ARENA_W - 8 - inset; x++) {
      const k = Math.abs(x - ARENA_W / 2) / (ARENA_W / 2);
      let c = mix(CAN, CAN_D, Math.min(1, k * 1.1 + (y < 158 ? 0.35 : 0)));
      if (r() < 0.012) c = CAN_DD;
      g.set(x, y, c);
    }
  }
  g.hline(52, ARENA_W - 52, 150, CAN_DD);
  // the apron skirt
  for (let y = 200; y < 216; y++) g.hline(0, ARENA_W - 1, y, y < 202 ? hex('#3a3f6a') : NAVY2);
  for (let x = 10; x < ARENA_W; x += 132) text(g, 'MID-SOUTH COLISEUM', x, 205, mix(P.gold, NAVY2, 0.45));
  // front corner posts (red: Mane's corner, blue: Pip's)
  for (const [px, pad] of [[14, P.red], [ARENA_W - 14, P.blue]] as [number, RGBA][]) {
    g.rect(px - 4, 120, 8, 82, P.greyDark); g.vline(px - 3, 120, 201, P.grey);
    for (const y of [128, 146, 164]) { g.rect(px - 5, y - 3, 10, 7, pad); g.hline(px - 4, px + 3, y - 3, mix(pad, P.white, 0.4)); }
  }
  // side ropes running from the front posts back to the back posts
  for (const [y0, y1] of [[128, 118], [146, 130], [164, 142]]) {
    g.line(14, y0, 64, y1, ROPE); g.line(ARENA_W - 14, y0, ARENA_W - 64, y1, ROPE);
  }
  // sparkle on the banner
  drawSparkle(g, bx + bw - 8, by + 4, 2);
  return g;
}

// the spotlight beam overlay (drawn additive in the game)
export function spotlight(): Pix {
  const g = new Pix(160, 200);
  for (let y = 0; y < 200; y++) {
    const hw = 10 + y * 0.35;
    for (let x = Math.round(80 - hw); x <= Math.round(80 + hw); x++) {
      const edge = 1 - Math.abs(x - 80) / hw;
      g.set(x, y, [255, 241, 200, Math.round(40 * Math.min(1, edge * 2) * (0.5 + y / 400))]);
    }
  }
  return g;
}

// Mid-South Coliseum from the street at night: the establishing shot before we go inside.
// Round drum, shallow silver dome, ribbed white facade with angled buttresses, the long flat
// covered walkway on square columns, crepe myrtles, the street in front.
export function coliseumExterior(): Pix {
  const W = ARENA_W, H = 216, cx = W / 2;
  const g = new Pix(W, H);
  const r = rng(901);
  const SKY_T = hex('#070a1e'), SKY_B = hex('#2a2458');
  for (let y = 0; y < H; y++) g.hline(0, W - 1, y, mix(SKY_T, SKY_B, Math.min(1, y / 130)));
  for (let i = 0; i < 90; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 95); g.set(x, y, r() < 0.2 ? P.white : hex('#8890c0')); }
  // moon
  g.circle(400, 26, 9, hex('#f4ecd0')); g.circle(404, 23, 8, mix(SKY_T, SKY_B, 0.18));
  // searchlights sweeping up from behind the building
  const beam = (x0: number, y0: number, ang: number) => {
    for (let d = 0; d < 150; d++) {
      const hw = 2 + d * 0.13;
      const bx = x0 + Math.sin(ang) * d, by = y0 - Math.cos(ang) * d;
      for (let o = -hw; o <= hw; o++) g.set(bx + Math.cos(ang) * o, by + Math.sin(ang) * o, [220, 230, 255, Math.round(34 * (1 - d / 150))]);
    }
  };
  beam(196, 96, -0.45); beam(286, 96, 0.38);

  // big dark trees at the edges
  const TREE = hex('#14301e'), TREE_HI = hex('#21482c');
  for (const [tx, ty, rx, ry] of [[28, 128, 40, 30], [70, 138, 26, 20], [452, 126, 40, 32], [412, 140, 24, 18]] as number[][]) {
    g.ellipse(tx, ty, rx, ry, TREE);
    for (let i = 0; i < 26; i++) g.circle(tx + (r() - 0.5) * rx * 1.6, ty + (r() - 0.7) * ry * 1.3, 2 + Math.floor(r() * 3), TREE_HI);
  }

  // the dome: shallow, silver, lit by the moon
  const RIM_Y = 90, RX = 132, DOME_H = 28;
  for (let y = RIM_Y - DOME_H; y <= RIM_Y; y++) {
    const t = (RIM_Y - y) / DOME_H;
    const hw = RX * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const side = (x - cx) / RX;
      g.set(x, y, mix(hex('#c8d0dc'), hex('#5a6478'), Math.min(1, 0.25 + (1 - t) * 0.35 + Math.max(0, side) * 0.45)));
    }
  }
  for (let x = Math.round(cx - 100); x < cx + 20; x++) { const t = (x - cx + 40) / 60; g.set(x, RIM_Y - 12 + Math.round(t * t * 3), [240, 244, 250, Math.round(150 * Math.max(0, 1 - Math.abs(t)))]); }

  // the drum: wider at the top, ribbed with angled buttresses
  const TOP_RX = 130, BOT_RX = 104, TOP_Y = RIM_Y + 1, BOT_Y = 134;
  const topAt = (dx: number) => TOP_Y + 10 * Math.sqrt(Math.max(0, 1 - (dx / TOP_RX) ** 2));
  const botAt = (dx: number) => Math.abs(dx) <= BOT_RX
    ? BOT_Y + 8 * Math.sqrt(Math.max(0, 1 - (dx / BOT_RX) ** 2))
    : TOP_Y + (BOT_Y - TOP_Y) * (TOP_RX - Math.abs(dx)) / (TOP_RX - BOT_RX);
  const FAC = hex('#d8d4c8'), FAC_D = hex('#8a8678'), GLOW = hex('#ffc860');
  for (let x = Math.round(cx - TOP_RX); x <= Math.round(cx + TOP_RX); x++) {
    const dx = x - cx, y0 = Math.round(topAt(dx)), y1 = Math.round(botAt(dx));
    const shade = Math.min(1, Math.abs(dx) / TOP_RX * 0.8 + (dx > 0 ? 0.15 : 0));
    for (let y = y0; y <= y1; y++) g.set(x, y, mix(FAC, FAC_D, shade));
    // the warm band of light along the bottom of the drum
    for (let y = y1 - 7; y <= y1 - 3; y++) if (y > y0 + 6) g.set(x, y, mix(GLOW, FAC_D, 0.25 + shade * 0.5));
  }
  g.hline(Math.round(cx - TOP_RX), Math.round(cx + TOP_RX), TOP_Y, hex('#efece2'));
  // buttresses
  for (let i = 0; i < 22; i++) {
    const th = (i / 22) * Math.PI * 2 + 0.07;
    if (Math.cos(th) < 0.12) continue;
    const s = Math.sin(th);
    const xt = cx + TOP_RX * s, xb = cx + BOT_RX * s;
    const yt = topAt(xt - cx) - 2, yb = botAt(xb - cx) + 1;
    const lit = mix(hex('#fbf8ef'), FAC_D, Math.max(0, s) * 0.6);
    g.line(xt, yt, xb, yb, lit, 4);
    g.line(xt + 3, yt, xb + 3, yb, mix(FAC_D, hex('#3a3830'), 0.4), 1);
  }

  // the low brick base behind the walkway
  const BRICK = hex('#7a6448'), BRICK_D = hex('#5a4a36');
  g.rect(58, 141, W - 116, 35, BRICK);
  for (let y = 144; y < 176; y += 4) g.hline(58, W - 59, y, BRICK_D);
  for (const dx of [-72, -36, 0, 36, 72]) { g.rect(cx + dx - 7, 158, 14, 18, hex('#ffd890')); g.vline(cx + dx, 158, 175, hex('#c89a50')); }

  // crepe myrtles in bloom in front of the drum
  const MYR = hex('#a8285a'), MYR_HI = hex('#e0508a'), MYR_D = hex('#6a1a3c');
  for (const [tx, ty] of [[cx - 70, 136], [cx + 82, 138]]) {
    g.rect(tx - 1, ty + 8, 3, 24, hex('#4a3428'));
    g.ellipse(tx, ty, 24, 15, MYR_D);
    for (let i = 0; i < 40; i++) g.circle(tx + (r() - 0.5) * 40, ty + (r() - 0.6) * 24, 2 + Math.floor(r() * 3), r() < 0.4 ? MYR_HI : MYR);
  }

  // the covered walkway: long flat roof on square columns
  const SLAB = hex('#c8c4b8'), SLAB_D = hex('#8a867c'), COL = hex('#b8b4a8'), COL_D = hex('#7a766c');
  g.rect(0, 150, W, 6, SLAB); g.hline(0, W - 1, 150, hex('#e8e4d8')); g.hline(0, W - 1, 156, SLAB_D);
  for (let x = 4; x < W; x += 12) g.set(x, 157, hex('#ffe0a0')); // lights under the roof
  for (let x = 12; x < W; x += 40) { g.rect(x, 157, 8, 24, COL); g.vline(x + 7, 157, 180, COL_D); }
  // fight night banner on the walkway
  const t1 = 'DENILE WATER PRESENTS', t2 = 'FIGHT NIGHT TONIGHT';
  const bw = Math.max(textWidth(t1), textWidth(t2)) + 12, bx = Math.round(cx - bw / 2);
  g.rect(bx, 158, bw, 19, hex('#1c4a98')); g.rect(bx + 1, 159, bw - 2, 17, hex('#2a6ad0'));
  text(g, t1, Math.round(cx - textWidth(t1) / 2), 160, P.white);
  text(g, t2, Math.round(cx - textWidth(t2) / 2), 168, P.gold);

  // sidewalk, curb, street
  g.rect(0, 181, W, 5, hex('#5a5866')); g.hline(0, W - 1, 181, hex('#7a7888'));
  for (let y = 186; y < H; y++) g.hline(0, W - 1, y, mix(hex('#2a2a36'), hex('#1a1a24'), (y - 186) / 30));
  for (let x = 6; x < W; x += 30) g.rect(x, 202, 14, 2, hex('#c8a040'));
  // street lamps and their pools of light
  for (const lx of [40, W - 40]) {
    g.vline(lx, 132, 183, hex('#3a3a48')); g.hline(lx - 6, lx, 132, hex('#3a3a48'));
    g.rect(lx - 9, 133, 6, 3, hex('#fff0c0'));
    for (let y = 186; y < 214; y++) for (let x = lx - 30; x < lx + 18; x++) {
      const d = Math.hypot((x - lx + 6) / 26, (y - 196) / 10);
      if (d < 1) g.set(x, y, [255, 220, 150, Math.round(50 * (1 - d))]);
    }
  }
  return g;
}
