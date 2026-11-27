// Pose-driven human sprites: Shiesty Boys, Malik, Uncle T, O.G. Drive-Out.
import { Pix, RGBA } from './pix';
import { P } from './palette';
import { rot90 } from './mane';

export interface Outfit {
  skin: RGBA; skinShade: RGBA;
  top: RGBA; topShade: RGBA; trim?: RGBA; sleeve?: RGBA;
  pants: RGBA; pantsShade: RGBA;
  shoes: RGBA; shoesShade: RGBA;
  head: 'mask' | 'nomask' | 'malik' | 'uncleT' | 'og';
  backpack?: boolean; apron?: boolean; coat?: boolean; hat?: boolean; big?: boolean;
}

export interface HPose {
  x?: number; y?: number; lean?: number; crouch?: number;
  fa: [number, number]; ba: [number, number]; // hand offsets from shoulder
  fab?: number; bab?: number; // elbow bend
  ff: [number, number]; bf: [number, number];
  fHand?: 'fist' | 'open' | 'can' | 'bottle' | 'cane' | 'hatTip';
  bHand?: 'fist' | 'open' | 'can' | 'bottle' | 'cane';
  face?: 'normal' | 'hurt' | 'ko' | 'sip' | 'angry' | 'scared' | 'smile';
  maskOff?: boolean; hatUp?: number;
}

const BASE = 61;

export function drawHuman(o: Outfit, p: HPose): Pix {
  const g = new Pix(64, 64);
  const big = o.big ? 2 : 0;
  const crouch = p.crouch ?? 0;
  const cx = 32 + (p.x ?? 0);
  const hipY = BASE - 16 + crouch + (p.y ?? 0);
  const lean = p.lean ?? 0;
  const torsoH = 15 + big;
  const shY = hipY - torsoH;
  const shX = cx + lean;
  const halfS = 7 + big, halfW = 6 + big;

  const leg = (dx: number, f: [number, number], front: boolean) => {
    const hx = cx + dx, fx = cx + dx + f[0], fy = BASE - 2 + f[1];
    const kx = (hx + fx) / 2 + 3, ky = (hipY + fy) / 2 - 1;
    g.curve(hx, hipY, kx, ky, fx, fy - 1, front ? o.pants : o.pantsShade, 5);
    // shoe
    g.rect(fx - 2, fy - 2, 7, 3, front ? o.shoes : o.shoesShade);
    g.hline(fx - 2, fx + 4, fy + 1, front ? P.white : o.shoesShade);
  };
  const arm = (sx: number, h: [number, number], bend: number, front: boolean, hand: HPose['fHand']) => {
    const hx = sx + h[0], hy = shY + 2 + h[1];
    const mx = (sx + hx) / 2, my = (shY + 2 + hy) / 2;
    const len = Math.hypot(h[0], h[1]) || 1;
    const ex = mx + (-h[1] / len) * bend, ey = my + (h[0] / len) * bend;
    const sleeve = o.sleeve ?? (front ? o.top : o.topShade);
    g.curve(sx, shY + 2, ex, ey, hx, hy, front ? sleeve : o.topShade, 4);
    if (hand === 'cane') {
      g.line(hx, hy, hx + 2, BASE, P.brownDark, 2);
      g.rect(hx - 2, hy - 1, 4, 2, P.brownDark);
    }
    if (hand === 'bottle') {
      g.rect(hx - 1, hy - 7, 3, 6, P.bottle);
      g.set(hx, hy - 8, P.bottleCap);
      g.set(hx - 1, hy - 6, P.white);
    }
    if (hand === 'can') {
      g.rect(hx - 1, hy - 6, 4, 6, P.can);
      g.set(hx - 1, hy - 6, P.rim); g.set(hx + 2, hy - 3, P.gold); g.set(hx + 1, hy - 3, P.gold);
    }
    g.circle(hx, hy, 2, front ? o.skin : o.skinShade);
  };

  // back leg + back arm
  leg(-3, p.bf, false);
  arm(shX - halfS + 2, p.ba, p.bab ?? 3, false, p.bHand);
  if (o.backpack) {
    g.rect(shX - halfS - 4, shY + 1, 6, 10, P.red);
    g.rect(shX - halfS - 4, shY + 9, 6, 2, P.redDark);
  }
  leg(3, p.ff, true);

  // torso
  const pts: [number, number][] = [
    [shX - halfS, shY], [shX + halfS, shY], [cx + halfW, hipY + 1], [cx - halfW, hipY + 1],
  ];
  g.poly(pts, o.top);
  // shading on the back half
  for (let y = shY; y <= hipY; y++) {
    const t = (y - shY) / torsoH;
    const lx = Math.round((shX - halfS) * (1 - t) + (cx - halfW) * t);
    g.hline(lx, lx + 2, y, o.topShade);
  }
  if (o.trim) {
    g.hline(cx - halfW, cx + halfW, hipY, o.trim);
    const t0 = shX + 1;
    g.vline(t0, shY + 1, hipY - 1, o.trim);
  }
  if (o.coat) {
    // long coat hangs down to the knees
    g.poly([[cx - halfW - 1, hipY], [cx + halfW + 1, hipY], [cx + halfW + 3, hipY + 10], [cx - halfW - 2, hipY + 10]], o.top);
    g.vline(cx + 1, shY + 2, hipY + 9, o.topShade);
    g.hline(cx - halfW - 1, cx + halfW + 1, hipY - 3, P.ink);
    g.rect(cx, hipY - 4, 2, 2, P.gold);
    // fur collar
    g.rect(shX - halfS, shY - 1, halfS * 2 + 1, 3, P.tan);
  }
  if (o.apron) {
    g.rect(shX - 2, shY + 3, 7, torsoH - 2, P.apron);
    g.rect(cx - 3, hipY - 1, 8, 7, P.apron);
    g.vline(shX + 4, shY + 3, hipY + 5, P.apronShade);
    g.set(shX + 1, shY + 7, P.sauce); g.set(cx, hipY + 2, P.sauce); g.set(cx + 2, hipY + 3, P.sauce);
  }
  if (o.head === 'mask') {
    // hoodie pocket + drawstrings
    g.hline(cx - 3, cx + 3, hipY - 4, o.topShade);
    g.set(shX + 2, shY + 2, P.white); g.set(shX + 2, shY + 3, P.white);
  }

  // head
  const hx = shX + 1, hy = shY - 5 - (o.big ? 1 : 0);
  g.rect(hx - 1, shY - 2, 4, 3, o.skinShade); // neck
  const face = p.face ?? 'normal';
  const masked = o.head === 'mask' && !p.maskOff;
  g.circle(hx, hy, 5 + (o.big ? 1 : 0), masked ? P.mask : o.skin);
  g.set(hx - 4, hy + 2, masked ? P.mask : o.skinShade); g.set(hx - 3, hy + 3, masked ? P.mask : o.skinShade);
  // eyes look right
  const eyeY = hy - 1;
  if (masked) {
    g.rect(hx - 1, eyeY - 1, 7, 3, o.skin); // eye slit
    g.set(hx + 1, eyeY, face === 'ko' ? P.ink : P.white); g.set(hx + 4, eyeY, face === 'ko' ? P.ink : P.white);
    if (face !== 'ko') { g.set(hx + 2, eyeY, P.ink); g.set(hx + 5, eyeY, P.ink); }
    g.set(hx - 3, hy - 4, P.maskHi); g.set(hx - 2, hy - 5, P.maskHi);
    g.rect(hx - 1, hy - 7, 3, 2, P.mask); // pom
  } else {
    // ear, eyes, mouth
    g.set(hx - 2, hy, o.skinShade); g.set(hx - 2, hy + 1, o.skinShade);
    if (face === 'ko') { g.set(hx + 2, eyeY, P.ink); g.set(hx + 4, eyeY, P.ink); }
    else if (face === 'sip') { g.hline(hx + 2, hx + 4, eyeY, P.ink); }
    else {
      g.set(hx + 2, eyeY, P.white); g.set(hx + 3, eyeY, P.ink);
      g.set(hx + 4, eyeY, P.white); g.set(hx + 5, eyeY, P.ink);
      if (face === 'angry') { g.set(hx + 2, eyeY - 1, P.ink); g.set(hx + 5, eyeY - 2, P.ink); }
      if (face === 'scared') { g.set(hx + 2, eyeY - 2, P.ink); g.set(hx + 5, eyeY - 2, P.ink); }
    }
    if (face === 'scared' || face === 'hurt') g.rect(hx + 3, hy + 2, 2, 2, P.ink);
    else if (face === 'smile') { g.hline(hx + 2, hx + 4, hy + 2, P.ink); g.set(hx + 1, hy + 1, P.ink); }
    else g.hline(hx + 3, hx + 4, hy + 2, o.skinShade);
    // hair / hats
    if (o.head === 'malik') {
      g.ellipse(hx - 1, hy - 4, 5, 2, P.ink);
      g.rect(hx - 5, hy - 4, 3, 4, P.ink);
    } else if (o.head === 'uncleT') {
      g.ellipse(hx - 1, hy - 4, 5, 2, P.grey);
      g.rect(hx - 5, hy - 3, 2, 3, P.grey);
      // reading glasses parked on his head
      g.hline(hx, hx + 5, hy - 5, P.ink); g.rect(hx + 1, hy - 6, 2, 2, P.bottle); g.rect(hx + 4, hy - 6, 2, 2, P.bottle);
      // grey beard
      g.rect(hx + 1, hy + 2, 5, 3, P.grey); g.rect(hx + 2, hy + 3, 2, 1, P.ink);
    } else if (o.head === 'og' || o.hat) {
      const up = p.hatUp ?? 0;
      g.rect(hx - 7, hy - 4 - up, 15, 2, P.purpleDark); // brim
      g.rect(hx - 4, hy - 9 - up, 9, 5, P.purple);
      g.hline(hx - 4, hx + 4, hy - 5 - up, P.gold); // gold band
      // shades + beard
      g.rect(hx + 1, eyeY - 1, 5, 2, P.ink);
      g.rect(hx + 1, hy + 2, 5, 2, P.ink);
    } else if (o.head === 'mask' && p.maskOff) {
      // the surprised face under the mask: short twists
      for (let i = -4; i <= 3; i += 2) g.rect(hx + i, hy - 6, 2, 2, P.ink);
      g.rect(hx + 3, hy + 1, 2, 3, P.ink);
    }
  }

  // front arm on top
  arm(shX + halfS - 2, p.fa, p.fab ?? -3, true, p.fHand);
  if (p.fHand === 'hatTip') { /* hat tip uses hatUp */ }

  g.outline(P.ink);
  return g;
}

type Def = Record<string, HPose[]>;

export function humanSheet(o: Outfit, def: Def) {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  for (const [name, poses] of Object.entries(def)) {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) {
      if ((p as any).flat) {
        const stand = drawHuman(o, { ...p, flat: undefined } as HPose);
        const r = rot90(stand, false);
        const f = new Pix(64, 64);
        f.blit(r, 2, 16);
        frames.push(f);
      } else frames.push(drawHuman(o, p));
    }
  }
  return { frames, anims };
}

const walk4 = (i: number, extra: Partial<HPose> = {}): HPose => {
  const t = (i / 4) * Math.PI * 2;
  const s = Math.sin(t), c = Math.cos(t);
  return {
    y: -Math.round(Math.abs(c)), lean: 1,
    fa: [3 + Math.round(-s * 4), 9], ba: [-1 + Math.round(s * 4), 9],
    ff: [Math.round(s * 5), -Math.round(Math.max(0, -c) * 2)], bf: [Math.round(-s * 5), -Math.round(Math.max(0, c) * 2)],
    ...extra,
  };
};

export const shiestyDef = (): Def => ({
  idle: [
    { fa: [6, 4], ba: [1, 6], ff: [3, 0], bf: [-4, 0], crouch: 1, face: 'angry' },
    { fa: [6, 5], ba: [1, 7], ff: [3, 0], bf: [-4, 0], crouch: 2, face: 'angry' },
  ],
  walk: [0, 1, 2, 3].map((i) => walk4(i, { face: 'angry' })),
  punch: [
    { fa: [-2, 4], ba: [2, 5], ff: [3, 0], bf: [-4, 0], lean: -2, face: 'angry' },
    { fa: [1, 2], ba: [3, 4], ff: [4, 0], bf: [-5, 0], lean: -3, crouch: 1, face: 'angry' },
    { fa: [16, 0], fab: 0, ba: [-2, 6], ff: [5, 0], bf: [-6, 0], lean: 3, face: 'angry' },
  ],
  throw: [
    { fa: [-8, -6], fHand: 'bottle', ba: [4, 4], ff: [3, 0], bf: [-4, 0], lean: -3, face: 'angry' },
    { fa: [-6, -10], fHand: 'bottle', ba: [5, 2], ff: [3, 0], bf: [-4, 0], lean: -4, face: 'angry' },
    { fa: [14, -2], fab: 0, ba: [-3, 6], ff: [5, 0], bf: [-6, 0], lean: 3, face: 'angry' },
  ],
  hurt: [
    { x: -2, fa: [4, -6], ba: [-2, -5], ff: [2, 0], bf: [-3, 0], lean: -4, face: 'hurt' },
    { x: -1, fa: [5, -2], ba: [-1, -2], ff: [2, 0], bf: [-3, 0], lean: -2, face: 'hurt' },
  ],
  knockdown: [
    { x: -3, y: -3, fa: [6, -8], ba: [-2, -9], ff: [6, -4], bf: [2, -3], lean: -6, face: 'hurt' },
    { fa: [7, -4], ba: [-4, -4], ff: [3, 0], bf: [-3, 0], face: 'ko', flat: true } as any,
    { fa: [6, 6], ba: [-2, 8], ff: [5, 0], bf: [-4, 0], crouch: 6, lean: 3, face: 'hurt' },
  ],
  dazed: [
    { fa: [3, 9], ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: -1, face: 'ko' },
    { fa: [3, 9], ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: 1, face: 'ko' },
  ],
});

// Shiesty Boy colorways
export const shiestyOutfits: Record<string, Outfit> = {
  shiestyRed: { skin: P.skin1, skinShade: P.skin1Shade, top: P.hoodRed, topShade: P.hoodRedShade, pants: P.denim, pantsShade: P.denimShade, shoes: P.sneakerW, shoesShade: P.sneakerShade, head: 'mask' },
  shiestyGrey: { skin: P.skin2, skinShade: P.skin2Shade, top: P.hoodGrey, topShade: P.hoodGreyShade, pants: P.inkSoft, pantsShade: P.ink, shoes: P.red, shoesShade: P.redDark, head: 'mask' },
  shiestyGreen: { skin: P.skin3, skinShade: P.skin3Shade, top: P.hoodGreen, topShade: P.hoodGreenShade, pants: P.tan, pantsShade: P.tanShade, shoes: P.sneakerW, shoesShade: P.sneakerShade, head: 'mask' },
};

export const malik: Outfit = {
  skin: P.skin1, skinShade: P.skin1Shade, top: P.blue, topShade: P.blueDark, trim: P.yellow, sleeve: P.white,
  pants: P.tan, pantsShade: P.tanShade, shoes: P.sneakerW, shoesShade: P.sneakerShade, head: 'malik', backpack: true,
};
export const malikDef = (): Def => ({
  idle: [
    { fa: [3, 9], ba: [0, 9], ff: [2, 0], bf: [-3, 0] },
    { fa: [3, 10], ba: [0, 10], ff: [2, 0], bf: [-3, 0], crouch: 1 },
  ],
  walk: [0, 1, 2, 3].map((i) => walk4(i)),
  sip: [
    { fa: [6, 2], fHand: 'can', ba: [0, 9], ff: [2, 0], bf: [-3, 0], face: 'normal' },
    { fa: [5, -5], fHand: 'can', ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: -2, face: 'sip' },
    { fa: [5, -7], fHand: 'can', ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: -3, face: 'sip' },
    { fa: [8, -2], fHand: 'can', ba: [-4, 4], ff: [3, 0], bf: [-4, 0], lean: -1, face: 'scared' },
  ],
  scared: [
    { fa: [6, -6], fHand: 'open', ba: [-2, -6], bHand: 'open', ff: [2, 0], bf: [-4, 0], lean: -3, face: 'scared' },
    { x: -1, fa: [6, -7], fHand: 'open', ba: [-2, -7], bHand: 'open', ff: [2, 0], bf: [-4, 0], lean: -4, face: 'scared' },
  ],
});

export const uncleT: Outfit = {
  skin: P.skin3, skinShade: P.skin3Shade, top: P.greyDark, topShade: P.inkSoft, pants: P.inkSoft, pantsShade: P.ink,
  shoes: P.brown, shoesShade: P.brownDark, head: 'uncleT', apron: true, big: true,
};
export const uncleTDef = (): Def => ({
  idle: [
    { fa: [5, 12], fHand: 'cane', ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: 1 },
    { fa: [5, 12], fHand: 'cane', ba: [0, 10], ff: [2, 0], bf: [-3, 0], lean: 1, crouch: 1 },
  ],
  talk: [
    { fa: [5, 12], fHand: 'cane', ba: [6, 0], bHand: 'open', ff: [2, 0], bf: [-3, 0], lean: 1, face: 'smile' },
    { fa: [5, 12], fHand: 'cane', ba: [8, -3], bHand: 'open', ff: [2, 0], bf: [-3, 0], lean: 2, face: 'normal' },
  ],
  toss: [
    { fa: [5, 12], fHand: 'cane', ba: [-8, -4], bHand: 'can', ff: [2, 0], bf: [-3, 0], lean: -2 },
    { fa: [5, 12], fHand: 'cane', ba: [-4, -12], bHand: 'can', ff: [2, 0], bf: [-3, 0], lean: -1 },
    { fa: [5, 12], fHand: 'cane', ba: [12, -6], bHand: 'open', ff: [3, 0], bf: [-3, 0], lean: 3, face: 'smile' },
  ],
  walk: [0, 1, 2, 3].map((i) => walk4(i, { fHand: 'cane', fa: [5, 12] })),
});

export const og: Outfit = {
  skin: P.skin2, skinShade: P.skin2Shade, top: P.brown, topShade: P.brownDark, pants: P.ink, pantsShade: P.ink,
  shoes: P.gold, shoesShade: P.goldDark, head: 'og', coat: true, big: true,
};
export const ogDef = (): Def => ({
  idle: [
    { fa: [4, 10], ba: [0, 10], ff: [2, 0], bf: [-3, 0] },
    { fa: [4, 11], ba: [0, 11], ff: [2, 0], bf: [-3, 0], crouch: 1 },
  ],
  tip: [
    { fa: [6, -6], ba: [0, 10], ff: [2, 0], bf: [-3, 0] },
    { fa: [5, -14], ba: [0, 10], ff: [2, 0], bf: [-3, 0], hatUp: 2 },
    { fa: [6, -6], ba: [0, 10], ff: [2, 0], bf: [-3, 0], face: 'smile' },
  ],
  walk: [0, 1, 2, 3].map((i) => walk4(i)),
});
