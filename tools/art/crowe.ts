// Mission 7 "Crowe Live": Crowe Prime (Victor Crowe's robot body double), Victor on his yacht cam,
// the launch-concert stage at Tom Lee Park with the river and the bridge behind it, and the reveal:
// the robot's face peels off and GigaZ's cloud face is underneath. Same specs as everything else:
// 64x64 character frames facing right, feet on the baseline, frames side by side.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { rot90, drawSparkle } from './mane';

// ------------------------------------------------------------------ Victor's look (fictional: silver swoop, AR visor, crow-feather pin)
const SKIN = hex('#e8c4a6'), SKIN_S = hex('#c89c80'), SKIN_D = hex('#a87c64');
const HAIR = hex('#c8ccd8'), HAIR_HI = hex('#eef0f6'), HAIR_D = hex('#3a3a46');
const HOOD = hex('#1e1e28'), HOOD_S = hex('#121218');
const BLAZER = hex('#4c5878'), BLAZER_S = hex('#343e5a'), LAPEL = hex('#7280aa');
const JEANS = hex('#2a2e3a'), JEANS_S = hex('#1c1f28');
const BOOT = hex('#eef2f8'), BOOT_S = hex('#b8c2d4'), NOZZLE = hex('#5a6070');
const LED = hex('#5ce1ff'), LED_D = hex('#2a7ad8');
const VISOR = hex('#5ce1ff', 200), VISOR_D = hex('#1a2a44');
const SCREEN = hex('#0c1630'), CLOUD = hex('#e8f4ff'), GZ_EYE = hex('#2a7ad8');
const FLAME = hex('#ffb040'), FLAME_HI = hex('#fff1a8'), FLAME_C = hex('#7fe8ff');
const STEEL = hex('#5a6070'), STEEL_L = hex('#8a92a4'), STEEL_D = hex('#363a46');

type CFace = 'smug' | 'talk' | 'angry' | 'hurt' | 'ko' | 'crack' | 'peel' | 'gigaz' | 'gigazGrin' | 'confused';
type CHand = 'fist' | 'open' | 'stick' | 'stickBack' | 'stickSwing' | 'phone' | 'phoneOut' | 'bottle' | 'bag' | 'rib';
interface CPose {
  x?: number; y?: number; lean?: number; crouch?: number;
  fa: [number, number]; ba: [number, number]; // hand offsets from the shoulders
  fab?: number; bab?: number; // elbow bend
  ff: [number, number]; bf: [number, number];
  fHand?: CHand; bHand?: CHand;
  face?: CFace;
  flames?: 0 | 1 | 2; // rocket boots
  sparks?: boolean;
  glitch?: number; // rows slip sideways
  human?: boolean; // the real Victor (Mission 10): no jaw seam
  apron?: boolean; // the post-credits job at Uncle T's
  noVisor?: boolean; // memory wiped: just his own eyes
}

const BASE = 61;

// a selfie stick with the phone on the end, from (x0,y0) to (x1,y1)
function selfieStick(g: Pix, x0: number, y0: number, x1: number, y1: number) {
  g.line(x0, y0, x1, y1, STEEL_L, 1);
  g.rect(x1 - 2, y1 - 3, 4, 6, P.ink);
  g.rect(x1 - 1, y1 - 2, 2, 4, LED);
  g.set(x1 - 1, y1 - 2, P.white);
}

// GigaZ's face on a dark screen: a smiling cloud with river-blue eyes
function gigazFace(g: Pix, hx: number, hy: number, grin: boolean) {
  g.circle(hx - 2, hy + 1, 2, CLOUD); g.circle(hx + 1, hy - 1, 3, CLOUD); g.circle(hx + 4, hy + 1, 2, CLOUD);
  g.rect(hx - 3, hy + 1, 8, 2, CLOUD);
  g.set(hx, hy, GZ_EYE); g.set(hx + 3, hy, GZ_EYE);
  if (grin) { g.hline(hx - 1, hx + 4, hy + 2, GZ_EYE); g.set(hx - 2, hy + 1, GZ_EYE); g.set(hx + 5, hy + 1, GZ_EYE); }
  else { g.hline(hx, hx + 3, hy + 2, GZ_EYE); }
}

function drawCrowe(p: CPose): Pix {
  const g = new Pix(64, 64);
  const crouch = p.crouch ?? 0;
  const cx = 31 + (p.x ?? 0);
  const hipY = BASE - 19 + crouch + (p.y ?? 0);
  const lean = p.lean ?? 0;
  const torsoH = 15;
  const shY = hipY - torsoH;
  const shX = cx + lean;
  const halfS = 8, halfW = 6;
  const face = p.face ?? 'smug';

  const leg = (dx: number, f: [number, number], front: boolean) => {
    const hx = cx + dx, fx = cx + dx + f[0], fy = BASE - 1 + f[1] + Math.min(0, p.y ?? 0);
    const kx = (hx + fx) / 2 + 3 + crouch * 0.5, ky = (hipY + fy) / 2 - 1;
    g.curve(hx, hipY, kx, ky, fx, fy - 5, front ? JEANS : JEANS_S, 5);
    // rocket boot: chunky, white, an LED stripe, the nozzle at the heel
    g.rect(fx - 3, fy - 6, 8, 6, front ? BOOT : BOOT_S);
    g.rect(fx + 5, fy - 3, 2, 3, front ? BOOT : BOOT_S);
    g.hline(fx - 3, fx + 6, fy - 1, BOOT_S);
    g.hline(fx - 2, fx + 4, fy - 4, front ? LED : LED_D);
    g.rect(fx - 5, fy - 4, 2, 3, NOZZLE);
    const fl = p.flames ?? 0;
    if (fl > 0) {
      // the flame blows down and back from the heel
      const len = fl === 2 ? 9 : 4;
      for (let i = 0; i < len; i++) {
        const w = Math.max(0, Math.round((len - i) / 3));
        const c = i < 2 ? FLAME_HI : i < len * 0.6 ? FLAME : FLAME_C;
        if (fl === 2) g.rect(fx - 6 - i, fy - 3 - w + Math.floor(i / 3), 1, w * 2 + 1, c);
        else g.rect(fx - 5 - w, fy - 1 + i, w * 2 + 1, 1, c);
      }
    }
  };
  const arm = (sx: number, h: [number, number], bend: number, front: boolean, hand: CHand | undefined) => {
    const hx = sx + h[0], hy = shY + 2 + h[1];
    const mx = (sx + hx) / 2, my = (shY + 2 + hy) / 2;
    const len = Math.hypot(h[0], h[1]) || 1;
    const ex = mx + (-h[1] / len) * bend, ey = my + (h[0] / len) * bend;
    g.curve(sx, shY + 2, ex, ey, hx, hy, front ? BLAZER : BLAZER_S, 5);
    // hoodie cuff poking out of the blazer sleeve
    const ux = hx - (h[0] / len) * 3, uy = hy - (h[1] / len) * 3;
    g.circle(ux, uy, 1.5, HOOD);
    if (hand === 'stick') selfieStick(g, hx, hy, hx + 5, hy - 16);
    if (hand === 'stickBack') selfieStick(g, hx, hy, hx - 9, hy - 13);
    if (hand === 'stickSwing') selfieStick(g, hx, hy, hx + 16, hy - 1);
    if (hand === 'phone') { g.rect(hx - 1, hy - 7, 4, 6, P.ink); g.rect(hx, hy - 6, 2, 4, LED); }
    if (hand === 'phoneOut') { g.rect(hx + 1, hy - 3, 6, 4, P.ink); g.rect(hx + 2, hy - 2, 4, 2, LED); g.set(hx + 6, hy - 2, P.white); }
    if (hand === 'bottle') {
      // a DeNile bottle: blue plastic, red label, white cap
      g.rect(hx - 1, hy - 9, 4, 9, P.bottle); g.vline(hx + 2, hy - 9, hy - 1, P.bottleShade);
      g.rect(hx - 1, hy - 6, 4, 3, P.red); g.rect(hx, hy - 11, 2, 2, P.bottleCap);
    }
    if (hand === 'bag') {
      // a black trash bag, knotted at the top
      g.ellipse(hx + 1, hy + 9, 6, 7, hex('#1c1c24')); g.ellipse(hx - 1, hy + 7, 2, 3, hex('#34343e'));
      g.rect(hx, hy, 2, 3, hex('#1c1c24'));
    }
    if (hand === 'rib') { g.rect(hx - 1, hy - 4, 7, 3, P.meat); g.hline(hx - 1, hx + 5, hy - 4, P.meatHi); g.rect(hx + 6, hy - 4, 2, 1, P.plate); }
    g.circle(hx, hy, 2, front ? SKIN : SKIN_S);
    if (hand === 'fist' || !hand) g.set(hx + 1, hy - 1, SKIN_D);
  };

  // back leg + back arm
  leg(-3, p.bf, false);
  arm(shX - halfS + 2, p.ba, p.bab ?? 3, false, p.bHand);
  leg(3, p.ff, true);

  // the hood bunched behind the neck
  g.ellipse(shX - 3, shY, 4, 3, HOOD);
  // torso: an open blazer over a black hoodie
  g.poly([[shX - halfS, shY], [shX + halfS, shY], [cx + halfW, hipY + 1], [cx - halfW, hipY + 1]], BLAZER);
  for (let y = shY; y <= hipY; y++) {
    const t = (y - shY) / torsoH;
    const lx = Math.round((shX - halfS) * (1 - t) + (cx - halfW) * t);
    const rx = Math.round((shX + halfS) * (1 - t) + (cx + halfW) * t);
    g.hline(lx, lx + 2, y, BLAZER_S);
    // the hoodie front between the lapels
    const hl = Math.round((shX + 1) * (1 - t) + (cx + 0) * t), hr = Math.round((shX + 5) * (1 - t) + (cx + 3) * t);
    g.hline(hl, Math.min(rx - 1, hr), y, y < shY + 2 ? HOOD_S : HOOD);
  }
  // the blazer hem and pocket
  g.poly([[cx - halfW - 1, hipY - 1], [cx + halfW + 1, hipY - 1], [cx + halfW + 1, hipY + 3], [cx - halfW, hipY + 3]], BLAZER);
  g.hline(cx - halfW, cx - 1, hipY + 3, BLAZER_S);
  g.hline(cx - 4, cx - 1, hipY - 5, BLAZER_S);
  // lapels
  g.line(shX, shY, shX + 2, shY + 7, LAPEL, 1);
  g.line(shX + 7, shY, shX + 5, shY + 7, LAPEL, 1);
  // drawstrings
  g.set(shX + 2, shY + 3, P.white); g.set(shX + 2, shY + 4, P.white); g.set(shX + 4, shY + 3, P.white); g.set(shX + 4, shY + 5, P.white);
  // the black crow-feather pin on the front lapel, with a blue glint
  g.line(shX + 7, shY + 2, shX + 8, shY + 6, P.ink, 1); g.set(shX + 6, shY + 3, P.ink); g.set(shX + 7, shY + 5, hex('#3a4a8a'));
  g.set(shX + 8, shY + 2, LED);

  // head
  const hx = shX + 1, hy = shY - 8;
  g.rect(hx - 2, shY - 3, 5, 4, SKIN_S); // neck
  const screenFace = face === 'gigaz' || face === 'gigazGrin';
  g.ellipse(hx, hy, 6, 7, screenFace ? SCREEN : SKIN);
  if (!screenFace) {
    for (let y = hy - 4; y <= hy + 6; y++) g.set(hx - 5 + (y > hy + 3 ? 1 : 0), y, SKIN_S);
    g.set(hx - 2, hy + 1, SKIN_S); g.set(hx - 2, hy + 2, SKIN_D); // ear
    // the jaw seam: the giveaway that this is the robot
    if (!p.human) g.line(hx - 1, hy + 4, hx + 4, hy + 6, SKIN_D, 1);
  } else {
    g.set(hx - 4, hy - 4, hex('#24365a')); g.set(hx - 3, hy - 5, hex('#24365a')); // glass glint
  }
  if (p.apron) {
    // Uncle T's spare apron, strings tied over the hoodie
    g.poly([[shX - 3, shY + 3], [shX + 6, shY + 3], [cx + 6, hipY + 7], [cx - 5, hipY + 7]], P.apron);
    g.hline(cx - 5, cx + 6, hipY + 7, P.apronShade); g.vline(shX - 3, shY + 3, hipY, P.apronShade);
    g.line(shX - 2, shY + 3, shX + 1, shY - 1, P.apronShade, 1); g.line(shX + 5, shY + 3, shX + 3, shY - 1, P.apronShade, 1);
    g.rect(cx - 2, hipY - 2, 5, 3, P.apronShade); // the pocket
    g.set(cx - 1, hipY - 5, P.sauce); g.set(cx + 3, hipY + 2, P.sauce); // sauce stains
  }
  // the silver swoop with a dark undercut
  g.ellipse(hx - 1, hy - 5, 6, 3, HAIR);
  g.poly([[hx - 1, hy - 8], [hx + 7, hy - 6], [hx + 6, hy - 4], [hx + 1, hy - 4]], HAIR);
  g.hline(hx - 3, hx + 4, hy - 7, HAIR_HI);
  g.rect(hx - 6, hy - 4, 3, 5, HAIR_D);

  const eyeY = hy - 1;
  if (screenFace) {
    gigazFace(g, hx + 1, hy + 1, face === 'gigazGrin');
  } else if (face === 'peel') {
    // the face plate is coming off: screen underneath, the skin flap hanging from the jaw
    g.ellipse(hx + 2, hy + 1, 4, 5, SCREEN);
    g.set(hx + 2, hy, GZ_EYE); g.set(hx + 4, hy, GZ_EYE); g.circle(hx + 3, hy + 2, 1, CLOUD);
    g.poly([[hx + 1, hy + 5], [hx + 7, hy + 4], [hx + 8, hy + 11], [hx + 3, hy + 10]], SKIN);
    g.hline(hx + 3, hx + 7, hy + 10, SKIN_D);
    g.set(hx + 5, hy + 7, VISOR_D); g.set(hx + 6, hy + 7, LED); // the visor dangling off the flap
    for (const [sx, sy] of [[hx + 1, hy - 3], [hx + 6, hy - 2], [hx - 1, hy + 4]]) g.set(sx, sy, FLAME_HI);
  } else if (p.noVisor) {
    // no visor, no stream: just a man who doesn't know where he is
    g.set(hx + 3, eyeY, P.ink); g.set(hx + 6, eyeY, P.ink);
    g.set(hx + 3, eyeY - 2, SKIN_D); g.set(hx + 6, eyeY - 3, SKIN_D);
    const mY = hy + 3;
    if (face === 'talk') { g.rect(hx + 3, mY, 3, 2, P.inkSoft); }
    else if (face === 'confused') { g.rect(hx + 4, mY, 2, 2, P.inkSoft); }
    else g.hline(hx + 3, hx + 5, mY, P.inkSoft);
  } else {
    // AR visor across the eyes, eyes glowing behind it
    g.hline(hx + 1, hx + 7, eyeY - 1, VISOR_D);
    g.rect(hx + 1, eyeY, 7, 2, VISOR);
    if (face === 'ko') { g.set(hx + 3, eyeY, P.ink); g.set(hx + 6, eyeY + 1, P.ink); g.line(hx + 2, eyeY - 1, hx + 6, eyeY + 2, P.ink, 1); }
    else { g.set(hx + 3, eyeY, P.white); g.set(hx + 6, eyeY, P.white); }
    if (face === 'angry') { g.set(hx + 2, eyeY - 2, VISOR_D); g.set(hx + 6, eyeY - 2, VISOR_D); g.set(hx + 5, eyeY - 1, P.ink); g.set(hx + 3, eyeY - 1, P.ink); }
    // mouth
    const mY = hy + 3;
    if (face === 'talk') { g.rect(hx + 3, mY, 3, 2, P.inkSoft); g.hline(hx + 3, hx + 5, mY, P.white); }
    else if (face === 'hurt') { g.rect(hx + 3, mY, 3, 2, P.inkSoft); g.set(hx + 6, mY - 1, SKIN_D); }
    else if (face === 'angry') g.hline(hx + 2, hx + 6, mY, P.inkSoft);
    else if (face === 'ko') { g.hline(hx + 3, hx + 5, mY + 1, P.inkSoft); }
    else { g.hline(hx + 3, hx + 5, mY, P.inkSoft); g.set(hx + 6, mY - 1, P.inkSoft); } // the smirk
    if (face === 'crack' || face === 'ko') {
      // cracks across the cheek, a chip missing with the screen glowing through
      g.line(hx + 6, hy - 4, hx + 3, hy + 1, P.ink, 1); g.line(hx + 3, hy + 1, hx + 5, hy + 4, P.ink, 1);
      g.set(hx + 4, hy + 2, LED); g.set(hx + 5, hy + 2, GZ_EYE);
    }
  }

  // front arm on top
  arm(shX + halfS - 2, p.fa, p.fab ?? -3, true, p.fHand);

  if (p.sparks) {
    for (const [sx, sy] of [[hx + 8, hy - 6], [hx - 7, hy - 1], [hx + 9, hy + 3], [shX + 10, shY + 6]]) {
      g.set(sx, sy, FLAME_HI); g.set(sx + 1, sy, FLAME); g.set(sx, sy + 1, FLAME);
    }
    g.line(hx + 7, hy - 9, hx + 9, hy - 7, LED, 1); g.line(hx + 9, hy - 7, hx + 8, hy - 5, LED, 1);
  }
  g.outline(P.ink);
  if (p.glitch) glitchRows(g, p.glitch);
  return g;
}

// a corrupted signal: bands of rows slip sideways and pick up color
function glitchRows(g: Pix, seed: number) {
  const r = rng(700 + seed);
  const copy = new Pix(g.w, g.h); copy.data.set(g.data);
  for (let band = 0; band < 4; band++) {
    const y0 = 10 + Math.floor(r() * 44), h = 1 + Math.floor(r() * 3), dx = r() < 0.5 ? -2 : 2;
    const tint: RGBA = band % 2 ? [92, 225, 255, 255] : [255, 90, 200, 255];
    for (let y = y0; y < y0 + h && y < g.h; y++) {
      for (let x = 0; x < g.w; x++) g.clear(x, y);
      for (let x = 0; x < g.w; x++) { const c = copy.get(x, y)!; if (c[3]) g.set(x + dx, y, mix(c, tint, 0.35)); }
    }
  }
}

function layFlat(src: Pix, baseline = 61): Pix {
  const r = rot90(src, false);
  let maxY = 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.alpha(x, y)) maxY = Math.max(maxY, y);
  const out = new Pix(64, 64);
  out.blit(r, 2, baseline - maxY);
  return out;
}

export function croweFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, poses: (CPose | Pix)[]) => {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(p instanceof Pix ? p : drawCrowe(p));
  };
  // a cocky low guard: fists loose, chin up
  const guard = (k: number, c = 0, face: CFace = 'smug'): CPose => ({ crouch: c, fa: [10, -4 + k], ba: [13, -1 + k], ff: [4, 0], bf: [-4, 0], face });
  add('idle', [guard(0), guard(1), guard(1, 1), guard(0, 1)]);
  add('walk', [0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return { ...guard(0), y: i % 2 ? -1 : 0, ff: [Math.round(-s * 5), i === 1 ? -2 : 0], bf: [Math.round(s * 5), i === 3 ? -2 : 0] } as CPose;
  }));
  add('jab', [
    { lean: -1, fa: [3, -5], ba: [12, -1], ff: [3, 0], bf: [-5, 0], face: 'smug' },
    { x: 2, lean: 3, fa: [19, -6], fab: 0, ba: [11, 0], ff: [5, 0], bf: [-6, 0], face: 'talk' },
    { x: 1, lean: 1, fa: [13, -5], ba: [12, -1], ff: [4, 0], bf: [-5, 0], face: 'smug' },
  ]);
  // the selfie stick: wound back over the shoulder, then swung like a bat
  add('stick', [
    { lean: -2, fa: [-3, -12], fHand: 'stickBack', ba: [9, 2], ff: [3, 0], bf: [-5, 0], face: 'talk' },
    { x: -2, lean: -4, crouch: 1, fa: [-5, -15], fHand: 'stickBack', ba: [8, 3], ff: [3, 0], bf: [-6, 0], face: 'talk' },
    { x: 3, lean: 4, fa: [14, -4], fab: 0, fHand: 'stickSwing', ba: [-4, 4], ff: [6, 0], bf: [-6, 0], face: 'angry' },
    { x: 2, lean: 3, fa: [10, 3], fHand: 'stickSwing', ba: [-4, 6], ff: [5, 0], bf: [-6, 0], face: 'smug' },
  ]);
  // the ping: thumbs a post, then flicks it
  add('ping', [
    { lean: -1, fa: [5, -12], fHand: 'phone', ba: [10, 0], ff: [3, 0], bf: [-4, 0], face: 'smug' },
    { x: 2, lean: 3, fa: [16, -8], fab: 0, fHand: 'phoneOut', ba: [8, 2], ff: [5, 0], bf: [-5, 0], face: 'talk' },
    { x: 1, lean: 1, fa: [11, -6], fHand: 'phoneOut', ba: [10, 0], ff: [4, 0], bf: [-4, 0], face: 'smug' },
  ]);
  // rocket boots: a crouch with the boots lighting up, then the dash
  add('rocket', [
    { crouch: 4, lean: 3, fa: [6, 2], ba: [-8, 0], ff: [4, 0], bf: [-4, 0], flames: 1, face: 'angry' },
    { y: -4, lean: 6, x: 2, fa: [17, -4], fab: 0, ba: [-11, 2], ff: [2, -2], bf: [-8, -4], flames: 2, face: 'angry' },
  ]);
  // crashed into the speaker stack: slumped, sparking, rebooting
  const slump = (k: number, glitch = 0): CPose => ({ crouch: 7, lean: 4, fa: [6, 9 + k], ba: [-4, 9], ff: [6, 0], bf: [-6, 0], face: 'hurt', sparks: k % 2 === 0, glitch });
  add('stuck', [slump(0), slump(1, 3), slump(2)]);
  add('block', [{ lean: -1, fa: [7, -12], ba: [10, -10], ff: [3, 0], bf: [-4, 0], face: 'angry' }]);
  add('hurt', [
    { x: -3, lean: -4, fa: [2, -10], ba: [-6, -8], ff: [3, 0], bf: [-3, 0], face: 'hurt', glitch: 1 },
    { x: -1, lean: -2, fa: [6, -4], ba: [-6, -4], ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  add('dazed', [
    { lean: -2, fa: [6, 8], ba: [-5, 8], ff: [3, 0], bf: [-3, 0], face: 'ko', sparks: true },
    { lean: 2, fa: [7, 8], ba: [-5, 8], ff: [3, 0], bf: [-3, 0], face: 'hurt', glitch: 2 },
  ]);
  add('knockdown', [
    { x: -4, lean: -6, crouch: 2, fa: [4, -12], ba: [-8, -12], ff: [5, -3], bf: [2, -1], face: 'hurt' },
    layFlat(drawCrowe({ fa: [11, -4], ba: [7, -13], ff: [3, 0], bf: [-3, 0], face: 'ko', sparks: true }), 61),
  ]);
  add('getup', [
    { crouch: 8, lean: 3, fa: [8, 8], ba: [-6, 8], ff: [6, 0], bf: [-6, 0], face: 'hurt' },
    { crouch: 2, fa: [9, -4], ba: [5, -2], ff: [4, 0], bf: [-4, 0], face: 'angry' },
  ]);
  // the selfie for the stream
  add('taunt', [
    { fa: [3, -16], fHand: 'stick', ba: [7, 3], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'smug' },
    { lean: 1, fa: [4, -17], fHand: 'stick', ba: [9, -1], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'talk' },
  ]);
  // "predicted": leans back out of a punch it saw coming
  add('sway', [{ x: -5, lean: -6, fa: [4, -6], ba: [9, -4], ff: [5, 0], bf: [-6, 0], face: 'smug' }]);
  add('glitch', [{ ...guard(0), glitch: 4 }, { ...guard(1), glitch: 5, face: 'crack' }]);
  // the reveal: kneeling, the face cracks, peels, and GigaZ looks out
  const kneel = (face: CFace, sparks = false, glitch = 0): CPose => ({ crouch: 8, lean: 1, fa: [7, 8], ba: [-5, 8], ff: [6, 0], bf: [-6, 0], face, sparks, glitch });
  add('peel', [kneel('crack', true), kneel('peel', true), kneel('gigaz')]);
  add('gigaz', [kneel('gigaz'), kneel('gigazGrin', false, 6)]);
  return { frames, anims };
}

// HUD portrait: head and shoulders
export function crowePortrait(): Pix[] {
  const mk = (face: CFace) => {
    const big = drawCrowe({ fa: [9, 8], ba: [-9, 8], ff: [3, 0], bf: [-3, 0], face });
    const out = new Pix(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = big.get(x + 17, y + 5); if (c && c[3]) out.set(x, y, c); }
    return out;
  };
  return [mk('smug'), mk('hurt'), mk('crack')];
}

// ------------------------------------------------------------------ Victor on his yacht cam (56x44): smug, talking, mad, shocked
export function croweCam(): Pix[] {
  return (['smug', 'talk', 'mad', 'shocked'] as const).map((mood) => {
    const g = new Pix(56, 44);
    for (let y = 0; y < 44; y++) g.hline(0, 55, y, mix(hex('#0a0e26'), hex('#22204a'), y / 30));
    for (const [sx, sy] of [[6, 4], [44, 7], [50, 2], [14, 11]]) g.set(sx, sy, hex('#c8d0ff'));
    // the river behind the boat, with the bridge lights smeared on it
    for (let y = 30; y < 44; y++) g.hline(0, 55, y, hex('#101c3c'));
    for (let i = 0; i < 6; i++) g.hline(4 + i * 9, 7 + i * 9, 32 + (i % 3) * 3, hex('#f5c542', 160));
    // the rail of the yacht
    g.hline(0, 55, 28, hex('#d8dce4')); g.hline(0, 55, 29, hex('#8a8e98'));
    for (let x = 2; x < 56; x += 9) g.vline(x, 29, 36, hex('#8a8e98'));
    // Victor: blazer shoulders, hoodie, the pin
    g.poly([[10, 44], [14, 32], [22, 29], [34, 29], [42, 32], [46, 44]], BLAZER);
    g.poly([[23, 29], [33, 29], [31, 44], [25, 44]], HOOD);
    g.line(22, 30, 25, 40, LAPEL, 1); g.line(34, 30, 31, 40, LAPEL, 1);
    g.line(37, 33, 38, 38, P.ink, 1); g.set(36, 34, P.ink); g.set(38, 33, LED); // feather pin
    g.set(26, 31, P.white); g.set(26, 32, P.white); g.set(30, 31, P.white); g.set(30, 33, P.white);
    g.ellipse(28, 28, 7, 3, HOOD_S); // hood behind the neck
    g.rect(25, 24, 7, 5, SKIN_S);
    // the head
    const hx = 28, hy = 15;
    g.ellipse(hx, hy, 8, 10, SKIN);
    for (let y = hy - 6; y < hy + 8; y++) g.set(hx - 8 + (y > hy + 4 ? 1 : 0), y, SKIN_S);
    g.rect(hx - 9, hy, 2, 4, SKIN_S); g.rect(hx + 8, hy, 2, 4, SKIN_S); // ears
    // the swoop
    g.ellipse(hx, hy - 8, 9, 4, HAIR);
    g.poly([[hx - 4, hy - 11], [hx + 10, hy - 9], [hx + 9, hy - 5], [hx - 2, hy - 6]], HAIR);
    g.hline(hx - 5, hx + 5, hy - 10, HAIR_HI);
    g.rect(hx - 9, hy - 7, 2, 5, HAIR_D); g.rect(hx + 8, hy - 7, 2, 4, HAIR_D);
    // visor
    g.hline(hx - 7, hx + 7, hy - 2, VISOR_D);
    g.rect(hx - 7, hy - 1, 15, 3, VISOR);
    const ey = hy;
    if (mood === 'shocked') { g.rect(hx - 4, ey - 1, 2, 2, P.white); g.rect(hx + 3, ey - 1, 2, 2, P.white); }
    else { g.set(hx - 4, ey, P.white); g.set(hx + 3, ey, P.white); }
    if (mood === 'mad') { g.line(hx - 6, hy - 4, hx - 2, hy - 3, P.ink, 1); g.line(hx + 6, hy - 4, hx + 2, hy - 3, P.ink, 1); }
    if (mood === 'shocked') { g.hline(hx - 6, hx - 2, hy - 5, P.ink); g.hline(hx + 2, hx + 6, hy - 5, P.ink); }
    // mouth
    const my = hy + 5;
    if (mood === 'smug') { g.hline(hx - 2, hx + 3, my, P.inkSoft); g.set(hx + 4, my - 1, P.inkSoft); g.set(hx - 3, my + 1, SKIN_D); }
    else if (mood === 'talk') { g.rect(hx - 2, my - 1, 5, 3, P.inkSoft); g.hline(hx - 1, hx + 1, my - 1, P.white); }
    else if (mood === 'mad') { g.rect(hx - 3, my, 7, 2, P.inkSoft); g.hline(hx - 2, hx + 2, my, P.white); }
    else { g.ellipse(hx, my + 1, 2, 3, P.inkSoft); }
    // sweat when it's going badly
    if (mood === 'mad' || mood === 'shocked') { g.set(hx + 7, hy - 4, hex('#a8dcff')); g.set(hx + 7, hy - 3, hex('#a8dcff')); }
    // his phone hand on the selfie stick, bottom right
    g.line(46, 44, 50, 34, STEEL_L, 1); g.circle(50, 36, 2, SKIN);
    g.outline(P.ink);
    return g;
  });
}

// the ping: a red notification badge, spinning as it flies (12x12)
export function pingShot(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(12, 12);
    const w = f % 2 ? 4 : 5;
    g.ellipse(6, 6, w, 5, hex('#e8343a'));
    g.ellipse(6 - 1, 4, Math.max(1, w - 3), 1, hex('#ff8a8a'));
    if (f % 2 === 0) { g.vline(6, 3, 6, P.white); g.set(6, 8, P.white); } else { g.vline(6, 3, 8, P.white); g.set(5, 4, P.white); }
    g.outline(P.ink);
    return g;
  });
}

// the face plate, flying off at the reveal (16x16)
export function facePlate(): Pix {
  const g = new Pix(16, 16);
  g.ellipse(8, 8, 5, 6, SKIN);
  for (let y = 3; y < 14; y++) g.set(3 + (y > 10 ? 1 : 0), y, SKIN_S);
  g.hline(8, 14, 6, VISOR_D); g.rect(8, 7, 6, 2, VISOR); g.set(10, 7, P.white); g.set(13, 7, P.white);
  g.hline(9, 11, 11, P.inkSoft); g.set(12, 10, P.inkSoft);
  g.line(12, 3, 9, 8, P.ink, 1);
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ the launch stage at Tom Lee Park (480x216)
// The river and the bridge behind the stage, a truss with lights, speaker stacks, a big LED screen
// (the game draws the livestream onto it), and the front row's phones up along the bottom.
export const STAGE_W = 480;
export const STAGE_SCREEN = { x: 118, y: 44, w: 244, h: 50 };
function riverAndBridge(g: Pix, W: number, r: () => number, horizon: number, yachtX = 70) {
  for (let y = horizon; y < 216; y++) g.hline(0, W - 1, y, hex('#0a1028'));
  for (let y = 0; y < horizon; y++) g.hline(0, W - 1, y, mix(hex('#070a1c'), hex('#2a2052'), Math.min(1, y / horizon)));
  for (let i = 0; i < 70; i++) g.set(Math.floor(r() * W), Math.floor(r() * horizon * 0.6), hex('#c8d0ff', 90 + Math.floor(r() * 140)));
  // Arkansas: a low dark shore with a few lights
  g.rect(0, horizon - 4, W, 4, hex('#0c1020'));
  for (let x = 4; x < W; x += 13 + Math.floor(r() * 20)) g.set(x, horizon - 3, hex('#f2b950'));
  // the river
  for (let y = horizon; y < horizon + 26; y++) g.hline(0, W - 1, y, mix(hex('#121c40'), hex('#0a1028'), (y - horizon) / 26));
  // the Hernando-DeSoto bridge, the "M" arches lit white, off to the right
  const bx = W - 230, deck = horizon - 10;
  for (let x = 0; x < 200; x++) {
    const t = (x % 100) / 100;
    const h = Math.round(Math.sin(t * Math.PI) * 34);
    g.set(bx + x, deck - h, hex('#4a5290'));
    g.set(bx + x, deck - h + 1, hex('#2a3060'));
    if (x % 7 === 0) { g.vline(bx + x, deck - h + 1, deck, hex('#262c56')); g.set(bx + x, deck - h - 1, P.white); }
  }
  g.hline(bx - 30, W - 1, deck, hex('#4a5290')); g.hline(bx - 30, W - 1, deck + 1, hex('#262c56'));
  for (const px of [bx - 20, bx + 100, bx + 199]) g.rect(px - 1, deck + 2, 3, horizon - deck + 2, hex('#1a1f40'));
  // bridge lights smeared on the water
  for (let i = 0; i < 40; i++) {
    const x = bx - 20 + Math.floor(r() * 230), y = horizon + 2 + Math.floor(r() * 22);
    g.hline(x, x + 2 + Math.floor(r() * 4), y, hex('#e8ecff', 90 + Math.floor(r() * 60)));
  }
  // Victor's yacht out on the water, a camera light on the top deck
  const yx = yachtX, yy = horizon + 8;
  g.poly([[yx - 26, yy], [yx + 30, yy], [yx + 24, yy + 6], [yx - 22, yy + 6]], hex('#e8ecf4'));
  g.hline(yx - 22, yx + 24, yy + 5, hex('#8a92a4'));
  g.rect(yx - 14, yy - 6, 30, 6, hex('#d8dce4')); g.rect(yx - 6, yy - 10, 16, 4, hex('#c8ccd8'));
  for (let x = yx - 12; x < yx + 14; x += 4) g.rect(x, yy - 4, 2, 2, LED);
  g.set(yx + 4, yy - 11, hex('#ff5a5a')); g.set(yx + 5, yy - 11, P.white);
  for (let y = yy + 6; y < yy + 14; y++) g.hline(yx - 20 + (y - yy), yx + 20 - (y - yy), y, hex('#c8d0ff', 30));
}

export function riverStage(): Pix {
  const W = STAGE_W, g = new Pix(W, 216);
  const r = rng(707);
  riverAndBridge(g, W, r, 122, 150);
  // the truss: two towers and a span across the top with stage lights hanging off it
  const truss = (x0: number, y0: number, x1: number, y1: number) => {
    const vert = x0 === x1;
    const len = vert ? y1 - y0 : x1 - x0;
    for (let k = 0; k <= len; k++) {
      const x = vert ? x0 : x0 + k, y = vert ? y0 + k : y0;
      g.set(x, y, STEEL_L); g.set(vert ? x + 5 : x, vert ? y : y + 5, STEEL);
      if (k % 6 === 0) g.line(x, y, vert ? x + 5 : x + 6, vert ? y + 6 : y + 5, STEEL_D, 1);
    }
  };
  truss(34, 4, 34, 150); truss(W - 40, 4, W - 40, 150); truss(34, 4, W - 34, 4);
  const lights: [number, RGBA][] = [[70, hex('#ff5ab0')], [120, LED], [180, P.gold], [300, P.gold], [360, LED], [410, hex('#ff5ab0')]];
  for (const [lx, c] of lights) {
    g.rect(lx - 3, 10, 7, 5, STEEL_D); g.hline(lx - 2, lx + 2, 15, c);
    // the beams fan down onto the stage
    for (let y = 16; y < 150; y++) {
      const hw = 1 + (y - 16) * 0.12, cxb = lx + (lx < W / 2 ? 1 : -1) * (y - 16) * 0.25;
      for (let x = Math.round(cxb - hw); x <= Math.round(cxb + hw); x++) g.set(x, y, [c[0], c[1], c[2], Math.round(26 * (1 - (y - 16) / 140))]);
    }
  }
  // the AetherCorp banner across the top truss
  const t1 = 'THE GIGANTUM GOES LIVE';
  const bw = textWidth(t1) + 14, bx = Math.round(W / 2 - bw / 2);
  g.rect(bx, 20, bw, 13, AE()); g.rect(bx + 1, 21, bw - 2, 11, hex('#eef2f8')); g.hline(bx + 1, bx + bw - 2, 31, LED);
  text(g, t1, Math.round(W / 2 - textWidth(t1) / 2), 23, hex('#1c3f84'));
  // the LED screen (the livestream gets drawn on it in the game)
  const S = STAGE_SCREEN;
  g.rect(S.x - 3, S.y - 3, S.w + 6, S.h + 6, STEEL_D); g.rect(S.x - 2, S.y - 2, S.w + 4, S.h + 4, hex('#14161e'));
  for (let y = S.y; y < S.y + S.h; y++) g.hline(S.x, S.x + S.w - 1, y, y % 2 ? hex('#0a1020') : hex('#0d1428'));
  g.vline(W / 2, S.y + S.h + 3, 150, STEEL_D); // the screen's mount
  // the slogan under the screen
  const t2 = 'THE CLOUD REMEMBERS, SO YOU DON\'T HAVE TO.';
  text(g, t2, Math.round(W / 2 - textWidth(t2) / 2), S.y + S.h + 6, hex('#8aa0c8'));
  // speaker stacks either side of the stage
  for (const sx of [44, W - 84]) {
    for (let k = 0; k < 3; k++) {
      const y = 92 + k * 20;
      g.rect(sx, y, 40, 19, hex('#16161e')); g.rect(sx + 1, y + 1, 38, 17, hex('#22222c'));
      g.circle(sx + 12, y + 9, 6, hex('#0c0c12')); g.circle(sx + 12, y + 9, 2, STEEL);
      g.circle(sx + 29, y + 9, 6, hex('#0c0c12')); g.circle(sx + 29, y + 9, 2, STEEL);
    }
    g.hline(sx, sx + 39, 152, LED);
  }
  // the stage deck: black and glossy, the lights reflecting in it, an LED strip on the front edge
  for (let y = 150; y < 200; y++) {
    const inset = Math.round((200 - y) * 0.7);
    for (let x = 6 + inset; x < W - 6 - inset; x++) {
      let c = mix(hex('#1c1e2a'), hex('#0c0d14'), Math.min(1, (y - 150) / 50));
      if (r() < 0.01) c = hex('#2a2e40');
      g.set(x, y, c);
    }
  }
  for (const [lx, c] of lights) for (let y = 156; y < 196; y += 3) g.hline(lx - 4 + (y % 2), lx + 4, y, [c[0], c[1], c[2], 40]);
  g.hline(40, W - 40, 150, hex('#3a3e52'));
  g.hline(6, W - 7, 199, LED); g.hline(6, W - 7, 200, LED_D);
  // the front skirt
  for (let y = 201; y < 216; y++) g.hline(0, W - 1, y, hex('#0a0c16'));
  for (let x = 12; x < W; x += 150) text(g, 'AETHERCORP', x, 205, hex('#2a3a5a'));
  // the front row: heads, and phones up, all filming
  const skins = [P.skin1, P.skin2, P.skin3, hex('#c08a64'), hex('#e0b48c')];
  for (let x = -4; x < W + 6; x += 11 + Math.floor(r() * 4)) {
    const hy = 208 + Math.floor(r() * 4);
    g.circle(x, hy, 5, mix(skins[Math.floor(r() * skins.length)], hex('#05060c'), 0.7));
    if (r() < 0.45) {
      const px = x + 3, py = hy - 12 - Math.floor(r() * 4);
      g.line(x + 1, hy - 3, px, py + 4, mix(P.skin2, hex('#05060c'), 0.6), 2);
      g.rect(px - 1, py, 4, 6, P.ink); g.rect(px, py + 1, 2, 4, hex('#bfe8ff'));
    }
  }
  drawSparkle(g, bx + bw - 6, 22, 1);
  return g;
}
const AE = () => hex('#b8c2d4');

// ------------------------------------------------------------------ the establishing shot: Tom Lee Park from above the crowd (480x216)
export function riverfrontExt(): Pix {
  const W = 480, g = new Pix(W, 216);
  const r = rng(717);
  riverAndBridge(g, W, r, 112);
  // the moon over Arkansas
  g.circle(60, 26, 9, hex('#f4ecd0')); g.circle(64, 23, 8, hex('#0e1230'));
  // AetherCorp's drone show: hundreds of lights making GigaZ's cloud in the sky
  const dots: [number, number][] = [];
  const cloud = (cx: number, cy: number, rr: number) => { for (let a = 0; a < Math.PI * 2; a += 0.35) dots.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]); };
  cloud(222, 40, 14); cloud(244, 32, 18); cloud(268, 40, 14);
  for (let x = 210; x <= 280; x += 4) dots.push([x, 54]);
  for (const [x, y] of dots) if (y < 52 || x < 214 || x > 276 || y > 53) g.set(x, y, CLOUD);
  for (const [ex, ey] of [[236, 34], [254, 34]]) { g.rect(ex, ey, 3, 3, LED); }
  for (let x = 236; x <= 256; x += 2) g.set(x, 44 + Math.round(Math.sin(((x - 236) / 20) * Math.PI) * 3), LED);
  // the park: dark grass, the stage at the far end glowing, its screen showing the cloud
  for (let y = 134; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#0e1a14'), hex('#08100c'), (y - 134) / 82));
  const sx = W / 2;
  g.rect(sx - 90, 96, 180, 42, hex('#14161e'));
  g.rect(sx - 96, 92, 6, 46, STEEL); g.rect(sx + 90, 92, 6, 46, STEEL); g.rect(sx - 96, 90, 192, 4, STEEL_L);
  g.rect(sx - 40, 98, 80, 26, hex('#13284a'));
  g.circle(sx - 8, 112, 4, CLOUD); g.circle(sx, 108, 6, CLOUD); g.circle(sx + 8, 112, 4, CLOUD); g.rect(sx - 11, 112, 22, 4, CLOUD);
  g.rect(sx - 3, 108, 2, 2, GZ_EYE); g.rect(sx + 3, 108, 2, 2, GZ_EYE);
  g.rect(sx - 90, 134, 180, 6, hex('#1c1e2a')); g.hline(sx - 90, sx + 89, 134, LED);
  for (const [lx, c] of [[sx - 70, LED], [sx - 30, P.gold], [sx + 30, P.gold], [sx + 70, hex('#ff5ab0')]] as [number, RGBA][]) {
    for (let y = 94; y < 134; y++) { const hw = 1 + (y - 94) * 0.2; for (let x = Math.round(lx - hw); x <= Math.round(lx + hw); x++) g.set(x, y, [c[0], c[1], c[2], 36]); }
  }
  // searchlights
  for (const [x0, ang] of [[sx - 120, -0.5], [sx + 120, 0.45]] as [number, number][]) {
    for (let d = 0; d < 120; d++) {
      const hw = 1 + d * 0.1, bx = x0 + Math.sin(ang) * d, by = 132 - Math.cos(ang) * d;
      for (let o = -hw; o <= hw; o++) g.set(bx + Math.cos(ang) * o, by + Math.sin(ang) * o, [220, 230, 255, Math.round(30 * (1 - d / 120))]);
    }
  }
  // the crowd: half the city, phones up
  for (let row = 0; row < 9; row++) {
    const y = 142 + row * 8;
    const dark = 0.75 - row * 0.06;
    for (let x = -4 + (row % 2) * 4; x < W + 6; x += 6 + Math.floor(r() * 3)) {
      const sk = [P.skin1, P.skin2, P.skin3, hex('#c08a64')][Math.floor(r() * 4)];
      const sh = [P.hoodRed, P.blue, P.hoodGrey, P.gold, P.white, P.purple][Math.floor(r() * 6)];
      g.ellipse(x, y + 6, 3 + row * 0.2, 3, mix(sh, hex('#05060c'), dark));
      g.circle(x, y + 1, 2 + Math.floor(row / 4), mix(sk, hex('#05060c'), dark));
      if (r() < 0.08) g.rect(x + 2, y - 4, 2, 3, hex('#bfe8ff'));
    }
  }
  return g;
}

// ------------------------------------------------------------------ Mission 10 "The Source": the real Victor, in person
// Same look as his robot (it copied him), minus the jaw seam. He cheats: a fake pause, a DeNile refill, rocket boots.
export function victorFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, poses: (CPose | Pix)[]) => {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(p instanceof Pix ? p : drawCrowe({ human: true, ...p }));
  };
  const guard = (k: number, c = 0, face: CFace = 'smug'): CPose => ({ crouch: c, fa: [10, -4 + k], ba: [13, -1 + k], ff: [4, 0], bf: [-4, 0], face });
  // he bounces on the boots: a little hover between steps
  add('idle', [guard(0), { ...guard(1), flames: 1 }, guard(1, 1), { ...guard(0, 1), flames: 1 }]);
  add('walk', [0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return { ...guard(0), y: i % 2 ? -1 : 0, ff: [Math.round(-s * 5), i === 1 ? -2 : 0], bf: [Math.round(s * 5), i === 3 ? -2 : 0] } as CPose;
  }));
  add('jab', [
    { lean: -1, fa: [3, -5], ba: [12, -1], ff: [3, 0], bf: [-5, 0], face: 'smug' },
    { x: 2, lean: 3, fa: [19, -6], fab: 0, ba: [11, 0], ff: [5, 0], bf: [-6, 0], face: 'talk' },
    { x: 1, lean: 1, fa: [13, -5], ba: [12, -1], ff: [4, 0], bf: [-5, 0], face: 'smug' },
  ]);
  add('stick', [
    { lean: -2, fa: [-3, -12], fHand: 'stickBack', ba: [9, 2], ff: [3, 0], bf: [-5, 0], face: 'talk' },
    { x: -2, lean: -4, crouch: 1, fa: [-5, -15], fHand: 'stickBack', ba: [8, 3], ff: [3, 0], bf: [-6, 0], face: 'talk' },
    { x: 3, lean: 4, fa: [14, -4], fab: 0, fHand: 'stickSwing', ba: [-4, 4], ff: [6, 0], bf: [-6, 0], face: 'angry' },
    { x: 2, lean: 3, fa: [10, 3], fHand: 'stickSwing', ba: [-4, 6], ff: [5, 0], bf: [-6, 0], face: 'smug' },
  ]);
  add('ping', [
    { lean: -1, fa: [5, -12], fHand: 'phone', ba: [10, 0], ff: [3, 0], bf: [-4, 0], face: 'smug' },
    { x: 2, lean: 3, fa: [16, -8], fab: 0, fHand: 'phoneOut', ba: [8, 2], ff: [5, 0], bf: [-5, 0], face: 'talk' },
    { x: 1, lean: 1, fa: [11, -6], fHand: 'phoneOut', ba: [10, 0], ff: [4, 0], bf: [-4, 0], face: 'smug' },
  ]);
  add('rocket', [
    { crouch: 4, lean: 3, fa: [6, 2], ba: [-8, 0], ff: [4, 0], bf: [-4, 0], flames: 1, face: 'angry' },
    { y: -4, lean: 6, x: 2, fa: [17, -4], fab: 0, ba: [-11, 2], ff: [2, -2], bf: [-8, -4], flames: 2, face: 'angry' },
  ]);
  // the fake pause: phone held up at you ("PAUSED"), then the cheap shot: a rocket knee
  add('pause', [
    { lean: -1, fa: [9, -16], fHand: 'phoneOut', ba: [6, 2], ff: [3, 0], bf: [-4, 0], face: 'smug' },
    { y: -3, lean: 5, x: 3, fa: [12, -6], ba: [-8, 0], ff: [9, -8], bf: [-6, -2], flames: 2, face: 'angry' },
  ]);
  // the refill: chugging a DeNile ("ZERO TASTE. FULL HEALTH.")
  add('refill', [
    { lean: -2, fa: [6, -15], fHand: 'bottle', ba: [9, 1], ff: [3, 0], bf: [-4, 0], face: 'talk' },
    { lean: -3, fa: [4, -17], fHand: 'bottle', ba: [9, 2], ff: [3, 0], bf: [-4, 0], face: 'smug' },
  ]);
  const slump = (k: number): CPose => ({ crouch: 7, lean: 4, fa: [6, 9 + k], ba: [-4, 9], ff: [6, 0], bf: [-6, 0], face: 'hurt', sparks: k % 2 === 0 });
  add('stuck', [slump(0), slump(1), slump(2)]);
  add('block', [{ lean: -1, fa: [7, -12], ba: [10, -10], ff: [3, 0], bf: [-4, 0], face: 'angry' }]);
  add('hurt', [
    { x: -3, lean: -4, fa: [2, -10], ba: [-6, -8], ff: [3, 0], bf: [-3, 0], face: 'hurt' },
    { x: -1, lean: -2, fa: [6, -4], ba: [-6, -4], ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  add('dazed', [
    { lean: -2, fa: [6, 8], ba: [-5, 8], ff: [3, 0], bf: [-3, 0], face: 'ko' },
    { lean: 2, fa: [7, 8], ba: [-5, 8], ff: [3, 0], bf: [-3, 0], face: 'hurt' },
  ]);
  add('knockdown', [
    { x: -4, lean: -6, crouch: 2, fa: [4, -12], ba: [-8, -12], ff: [5, -3], bf: [2, -1], face: 'hurt' },
    layFlat(drawCrowe({ human: true, fa: [11, -4], ba: [7, -13], ff: [3, 0], bf: [-3, 0], face: 'ko' }), 61),
  ]);
  add('getup', [
    { crouch: 8, lean: 3, fa: [8, 8], ba: [-6, 8], ff: [6, 0], bf: [-6, 0], face: 'hurt' },
    { crouch: 2, fa: [9, -4], ba: [5, -2], ff: [4, 0], bf: [-4, 0], face: 'angry' },
  ]);
  add('taunt', [
    { fa: [3, -16], fHand: 'stick', ba: [7, 3], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'smug' },
    { lean: 1, fa: [4, -17], fHand: 'stick', ba: [9, -1], bHand: 'open', ff: [4, 0], bf: [-4, 0], face: 'talk' },
  ]);
  add('sway', [{ x: -5, lean: -6, fa: [4, -6], ba: [9, -4], ff: [5, 0], bf: [-6, 0], face: 'smug' }]);
  // crawling to the jar after the count
  add('crawl', [
    { crouch: 9, lean: 7, fa: [12, 10], ba: [4, 10], ff: [2, 0], bf: [-8, 0], face: 'hurt' },
    { crouch: 9, lean: 7, fa: [8, 10], ba: [10, 10], ff: [-2, 0], bf: [-6, 0], face: 'talk' },
  ]);
  // pulled up into the jar: arms out, glitching
  add('fuse', [
    { y: -2, fa: [8, -16], ba: [-8, -16], ff: [2, 2], bf: [-3, 2], face: 'hurt', glitch: 3 },
    { y: -4, fa: [10, -18], ba: [-6, -18], ff: [3, 3], bf: [-2, 3], face: 'ko', glitch: 6 },
  ]);
  // post-credits: memory wiped, in Uncle T's spare apron, taking out the trash
  const job: CPose = { apron: true, noVisor: true, fa: [8, 6], fHand: 'bag', ba: [-4, 8], ff: [3, 0], bf: [-3, 0], face: 'smug' };
  add('trash', [0, 1, 2, 3].map((i) => {
    const s = Math.sin((i / 4) * Math.PI * 2);
    return { ...job, y: i % 2 ? -1 : 0, ff: [Math.round(-s * 4), i === 1 ? -2 : 0], bf: [Math.round(s * 4), i === 3 ? -2 : 0] } as CPose;
  }));
  add('sniff', [
    { apron: true, noVisor: true, fa: [7, -12], fHand: 'rib', ba: [-4, 8], ff: [3, 0], bf: [-3, 0], face: 'confused' },
    { apron: true, noVisor: true, lean: 1, fa: [6, -14], fHand: 'rib', ba: [-4, 8], ff: [3, 0], bf: [-3, 0], face: 'talk' },
  ]);
  add('blank', [
    { apron: true, noVisor: true, fa: [8, 6], ba: [-4, 8], ff: [3, 0], bf: [-3, 0], face: 'confused' },
    { apron: true, noVisor: true, fa: [8, 7], ba: [-4, 7], ff: [3, 0], bf: [-3, 0], face: 'smug' },
  ]);
  return { frames, anims };
}

export function victorPortrait(): Pix[] {
  const mk = (face: CFace) => {
    const big = drawCrowe({ human: true, fa: [9, 8], ba: [-9, 8], ff: [3, 0], bf: [-3, 0], face });
    const out = new Pix(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = big.get(x + 17, y + 5); if (c && c[3]) out.set(x, y, c); }
    return out;
  };
  return [mk('smug'), mk('hurt'), mk('angry')];
}
