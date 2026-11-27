// Pose-driven human sprites: Shiesty Boys, Malik, Uncle T, O.G. Drive-Out.
import { Pix, RGBA, mix } from './pix';
import { P } from './palette';
import { rot90 } from './mane';

export interface Outfit {
  skin: RGBA; skinShade: RGBA;
  top: RGBA; topShade: RGBA; trim?: RGBA; sleeve?: RGBA;
  pants: RGBA; pantsShade: RGBA;
  shoes: RGBA; shoesShade: RGBA;
  head: 'mask' | 'nomask' | 'malik' | 'uncleT' | 'og' | 'jackal' | 'jackalCaptain' | 'nia' | 'vendor' | 'king' | 'priest' | 'ref'
    | 'hardhat' | 'hazmat' | 'afro';
  // Beale Below (Mission 6) wardrobe
  vest?: RGBA; // hi-vis vest with reflective stripes
  tank?: boolean; // coolant tank on the back
  hatColor?: RGBA;
  bowtie?: boolean; // Fight Night referee
  backpack?: boolean; apron?: boolean; coat?: boolean; hat?: boolean; big?: boolean;
  // Old Memphis wardrobe
  kilt?: boolean; // bare legs under a pleated kilt (pants color = the kilt)
  dress?: boolean; // long robe to the ankles (pants color = the robe)
  collar?: RGBA; // broad beaded collar
  cape?: RGBA;
  sandals?: boolean;
}

export interface HPose {
  x?: number; y?: number; lean?: number; crouch?: number;
  fa: [number, number]; ba: [number, number]; // hand offsets from shoulder
  fab?: number; bab?: number; // elbow bend
  ff: [number, number]; bf: [number, number];
  fHand?: Hand | 'hatTip';
  bHand?: Hand;
  face?: 'normal' | 'hurt' | 'ko' | 'sip' | 'angry' | 'scared' | 'smile' | 'blank';
  maskOff?: boolean; hatUp?: number;
}

export type Hand = 'fist' | 'open' | 'can' | 'bottle' | 'cane' | 'spear' | 'spearThrust' | 'pot' | 'khopesh' | 'khopeshSwing' | 'grill' | 'dates' | 'mic' | 'jug'
  | 'wrench' | 'drill' | 'canister' | 'guitar' | 'guitarUp' | 'sax';

const BASE = 61;
const BRONZE: RGBA = [214, 160, 64, 255], BRONZE_D: RGBA = [150, 100, 36, 255], WOOD: RGBA = [120, 84, 48, 255];
const CLAY: RGBA = [190, 100, 52, 255], CLAY_D: RGBA = [132, 64, 32, 255];

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
    const bare = o.kilt;
    g.curve(hx, hipY, kx, ky, fx, fy - 1, bare ? (front ? o.skin : o.skinShade) : front ? o.pants : o.pantsShade, bare ? 4 : 5);
    if (o.sandals) {
      g.rect(fx - 2, fy, 7, 2, front ? o.shoes : o.shoesShade);
      g.set(fx, fy - 1, o.shoesShade);
      return;
    }
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
    if (hand === 'spear') {
      // held upright
      g.line(hx, hy - 20, hx, hy + 9, WOOD, 1);
      g.poly([[hx - 2, hy - 20], [hx + 3, hy - 20], [hx + 1, hy - 26]], BRONZE);
      g.set(hx, hy - 23, P.goldHi);
    }
    if (hand === 'spearThrust') {
      g.line(hx - 16, hy, hx + 10, hy, WOOD, 1);
      g.poly([[hx + 10, hy - 2], [hx + 10, hy + 3], [hx + 16, hy + 1]], BRONZE);
      g.set(hx + 12, hy, P.goldHi);
    }
    if (hand === 'khopesh') {
      g.line(hx, hy, hx, hy - 6, BRONZE_D, 1);
      g.curve(hx, hy - 6, hx + 1, hy - 14, hx + 6, hy - 14, BRONZE, 2);
      g.set(hx + 7, hy - 13, P.goldHi);
    }
    if (hand === 'khopeshSwing') {
      g.line(hx, hy, hx + 6, hy, BRONZE_D, 1);
      g.curve(hx + 6, hy, hx + 13, hy - 1, hx + 14, hy + 5, BRONZE, 2);
      g.set(hx + 15, hy + 6, P.goldHi);
    }
    if (hand === 'pot') {
      g.ellipse(hx, hy - 4, 3, 3, CLAY);
      g.rect(hx - 1, hy - 8, 3, 2, CLAY_D);
      g.hline(hx - 2, hx + 2, hy - 3, CLAY_D);
      g.set(hx - 1, hy - 5, [230, 150, 96, 255]);
    }
    if (hand === 'grill') {
      g.rect(hx - 2, hy - 4, 6, 2, P.gold);
      g.set(hx - 1, hy - 4, P.goldHi); g.set(hx + 2, hy - 4, P.goldHi);
    }
    if (hand === 'dates') {
      g.ellipse(hx + 1, hy - 3, 4, 2, [150, 110, 60, 255]);
      for (const dx of [-1, 1, 3]) g.set(hx + dx, hy - 4, [92, 36, 20, 255]);
    }
    if (hand === 'mic') {
      g.line(hx, hy, hx + 3, hy - 5, P.ink, 2);
      g.circle(hx + 4, hy - 7, 2, P.greyDark); g.set(hx + 3, hy - 8, P.grey);
    }
    if (hand === 'jug') {
      // a big jug of DeNile Water
      g.rect(hx - 3, hy - 10, 8, 10, P.bottle);
      g.rect(hx - 1, hy - 12, 4, 2, P.bottleCap);
      g.vline(hx - 2, hy - 9, hy - 2, P.white);
      g.hline(hx - 3, hx + 4, hy - 5, P.bottleShade);
    }
    if (hand === 'wrench') {
      g.line(hx, hy, hx + 5, hy - 9, P.grey, 2);
      g.rect(hx + 3, hy - 13, 5, 3, P.grey); g.set(hx + 5, hy - 12, P.ink); g.set(hx + 4, hy - 13, P.white);
    }
    if (hand === 'drill') {
      // a heavy-duty AetherCorp hammer drill, bit pointing forward
      g.rect(hx - 2, hy - 5, 9, 5, [236, 240, 246, 255]); g.hline(hx - 2, hx + 6, hy - 1, [124, 136, 158, 255]);
      g.rect(hx - 1, hy, 3, 4, P.inkSoft);
      g.set(hx + 5, hy - 4, [92, 225, 255, 255]);
      g.line(hx + 7, hy - 3, hx + 13, hy - 3, P.grey, 1); g.set(hx + 10, hy - 4, P.greyDark); g.set(hx + 12, hy - 2, P.greyDark);
    }
    if (hand === 'canister') {
      g.rect(hx - 2, hy - 8, 5, 8, [92, 200, 255, 255]); g.rect(hx - 2, hy - 9, 5, 1, P.grey);
      g.vline(hx - 1, hy - 7, hy - 2, P.white); g.hline(hx - 2, hx + 2, hy - 4, [44, 120, 200, 255]);
    }
    if (hand === 'guitar' || hand === 'guitarUp') {
      // body at the hand, neck up and forward
      const up = hand === 'guitarUp';
      const nx = hx + (up ? 9 : 14), ny = hy - (up ? 18 : 9);
      g.line(hx + 2, hy - 2, nx, ny, P.brownDark, 2);
      g.rect(nx - 1, ny - 2, 3, 3, P.brownDark);
      g.ellipse(hx - 1, hy, 5, 4, P.red); g.ellipse(hx - 3, hy + 2, 3, 2, P.redDark);
      g.set(hx, hy - 1, P.ink); g.hline(hx - 3, hx + 1, hy + 1, P.goldHi);
    }
    if (hand === 'sax') {
      g.curve(hx - 2, hy - 8, hx + 4, hy - 2, hx + 2, hy + 6, P.gold, 3);
      g.ellipse(hx + 4, hy + 6, 3, 2, P.goldMid); g.set(hx + 3, hy + 5, P.goldHi);
      g.line(hx - 2, hy - 8, hx - 4, hy - 11, P.ink, 1);
    }
    if (hand === 'can') {
      g.rect(hx - 1, hy - 6, 4, 6, P.can);
      g.set(hx - 1, hy - 6, P.rim); g.set(hx + 2, hy - 3, P.gold); g.set(hx + 1, hy - 3, P.gold);
    }
    g.circle(hx, hy, 2, front ? o.skin : o.skinShade);
  };

  if (o.cape) {
    // cape hangs from the shoulders, behind everything
    g.poly([[shX - halfS - 1, shY], [shX + 2, shY], [cx - 2, BASE - 8], [cx - halfW - 7, BASE - 6]], o.cape);
    g.line(shX - halfS, shY + 2, cx - halfW - 6, BASE - 7, mix(o.cape, P.ink, 0.35), 1);
  }
  // back leg + back arm
  leg(-3, p.bf, false);
  arm(shX - halfS + 2, p.ba, p.bab ?? 3, false, p.bHand);
  if (o.backpack) {
    g.rect(shX - halfS - 4, shY + 1, 6, 10, P.red);
    g.rect(shX - halfS - 4, shY + 9, 6, 2, P.redDark);
  }
  if (o.tank) {
    g.rect(shX - halfS - 5, shY - 1, 6, 14, P.grey);
    g.rect(shX - halfS - 5, shY - 1, 6, 2, P.greyDark); g.vline(shX - halfS - 4, shY + 1, shY + 11, P.white);
    g.set(shX - halfS - 2, shY + 6, [92, 225, 255, 255]);
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
  if (o.vest) {
    // hi-vis vest over the coveralls, two reflective stripes
    g.poly([[shX - halfS + 1, shY + 1], [shX + halfS - 1, shY + 1], [cx + halfW, hipY - 1], [cx - halfW, hipY - 1]], o.vest);
    for (let y = shY + 1; y < hipY; y++) { const t = (y - shY) / torsoH; const lx = Math.round((shX - halfS + 1) * (1 - t) + (cx - halfW) * t); g.hline(lx, lx + 1, y, mix(o.vest, P.ink, 0.3)); }
    for (const yy of [shY + 6, hipY - 4]) { const t = (yy - shY) / torsoH; const lx = Math.round((shX - halfS + 1) * (1 - t) + (cx - halfW) * t); const rx = Math.round((shX + halfS - 1) * (1 - t) + (cx + halfW) * t); g.hline(lx, rx, yy, [220, 226, 236, 255]); }
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
  if (o.kilt) {
    // pleated kilt with a belt
    g.poly([[cx - halfW - 1, hipY - 2], [cx + halfW + 1, hipY - 2], [cx + halfW + 4, hipY + 8], [cx - halfW - 2, hipY + 8]], o.pants);
    for (let x = cx - halfW; x <= cx + halfW + 2; x += 2) g.vline(x, hipY + 1, hipY + 7, o.pantsShade);
    g.hline(cx - halfW - 1, cx + halfW + 1, hipY - 2, o.collar ?? P.gold);
  }
  if (o.dress) {
    g.poly([[cx - halfW - 1, hipY - 3], [cx + halfW + 1, hipY - 3], [cx + halfW + 4, BASE - 2], [cx - halfW - 4, BASE - 2]], o.pants);
    for (let x = cx - halfW + 1; x <= cx + halfW; x += 3) g.vline(x, hipY + 2, BASE - 3, o.pantsShade);
    g.hline(cx - halfW - 1, cx + halfW + 1, hipY - 3, o.collar ?? o.pantsShade);
  }
  if (o.collar) {
    // broad collar across the shoulders
    g.ellipse(shX + 1, shY + 1, halfS, 3, o.collar);
    g.hline(shX - halfS + 2, shX + halfS, shY + 3, mix(o.collar, P.ink, 0.3));
    for (let x = shX - halfS + 3; x < shX + halfS; x += 3) g.set(x, shY + 2, P.blue);
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
  const jackal = o.head === 'jackal' || o.head === 'jackalCaptain';
  if (jackal) {
    const cap = o.head === 'jackalCaptain';
    const fur: RGBA = cap ? [26, 24, 34, 255] : [30, 28, 36, 255], furHi: RGBA = [64, 60, 80, 255];
    const r = 5 + (o.big ? 1 : 0);
    // striped headcloth lappets behind the head
    g.rect(hx - 5, hy - 2, 4, 9, cap ? P.gold : P.blue);
    for (let y = hy - 1; y < hy + 7; y += 2) g.hline(hx - 5, hx - 2, y, cap ? P.goldDark : P.gold);
    g.circle(hx, hy, r, fur);
    // long snout to the right
    g.poly([[hx + 2, hy - 2], [hx + 11, hy + 1], [hx + 11, hy + 3], [hx + 2, hy + 4]], fur);
    g.set(hx + 11, hy + 1, P.ink);
    g.hline(hx + 4, hx + 10, hy + 3, furHi);
    // tall ears
    g.poly([[hx - 3, hy - 3], [hx, hy - 4], [hx - 2, hy - 13]], fur);
    g.poly([[hx + 1, hy - 4], [hx + 4, hy - 3], [hx + 3, hy - 12]], fur);
    if (cap) { g.set(hx - 2, hy - 12, P.goldHi); g.set(hx + 3, hy - 11, P.goldHi); g.set(hx - 2, hy - 11, P.gold); g.set(hx + 3, hy - 10, P.gold); }
    g.vline(hx - 1, hy - 9, hy - 5, furHi);
    // eye
    const eyeC: RGBA = face === 'ko' ? P.ink : cap ? P.red : P.gold;
    g.rect(hx + 2, hy - 1, 2, 1, eyeC);
    if (face === 'angry' && face !== ('ko' as string)) g.set(hx + 1, hy - 2, eyeC);
    if (face === 'hurt') g.rect(hx + 5, hy + 4, 3, 1, P.white);
    // gold band on the snout
    g.vline(hx + 5, hy - 1, hy + 3, cap ? P.goldHi : P.gold);
  }
  const masked = o.head === 'mask' && !p.maskOff;
  if (!jackal) {
  g.circle(hx, hy, 5 + (o.big ? 1 : 0), masked ? P.mask : o.skin);
  g.set(hx - 4, hy + 2, masked ? P.mask : o.skinShade); g.set(hx - 3, hy + 3, masked ? P.mask : o.skinShade);
  }
  // eyes look right
  const eyeY = hy - 1;
  if (jackal) { /* drawn above */ } else if (o.head === 'king') {
    // nemes headcloth, face lost in shadow
    g.circle(hx, hy, 5, P.ink);
    g.poly([[hx - 6, hy - 5], [hx + 5, hy - 6], [hx + 6, hy - 1], [hx - 2, hy + 1]], P.gold);
    g.poly([[hx - 6, hy - 4], [hx - 2, hy], [hx - 3, hy + 9], [hx - 7, hy + 9]], P.gold);
    for (let y = hy - 4; y < hy + 9; y += 2) g.hline(hx - 7, hx - 2, y, P.blue);
    for (let x = hx - 4; x < hx + 5; x += 2) g.set(x, hy - 4, P.blue);
    g.rect(hx + 1, hy - 1, 5, 6, [14, 10, 22, 255]);
    g.set(hx + 3, hy - 7, P.goldHi); g.set(hx + 3, hy - 8, P.goldHi); // cobra
    if (face === 'angry') { g.set(hx + 2, eyeY, P.red); g.set(hx + 5, eyeY, P.red); }
  } else if (o.head === 'hazmat') {
    // hood over the whole head, a blue visor on the face
    g.circle(hx, hy, 6, o.top); g.set(hx - 4, hy - 4, P.white);
    g.rect(hx + 1, hy - 3, 5, 5, [44, 120, 200, 255]); g.hline(hx + 1, hx + 5, hy - 3, [130, 220, 255, 255]);
    if (face === 'ko') { g.set(hx + 2, hy - 1, P.ink); g.set(hx + 4, hy - 1, P.ink); } else { g.set(hx + 3, hy - 1, P.white); g.set(hx + 5, hy - 1, P.white); }
    g.rect(hx - 1, hy + 4, 3, 2, P.greyDark); // filter
  } else if (masked) {
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
    else if (face === 'blank') { g.set(hx + 2, eyeY, P.grey); g.set(hx + 4, eyeY, P.grey); }
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
    } else if (o.head === 'nia') {
      // long braids, gold circlet
      g.ellipse(hx - 1, hy - 3, 6, 3, P.ink);
      g.rect(hx - 6, hy - 3, 5, 13, P.ink);
      for (let y = hy; y < hy + 10; y += 2) g.set(hx - 5, y, P.inkSoft);
      g.hline(hx - 5, hx + 5, hy - 4, P.gold); g.set(hx + 5, hy - 5, P.goldHi);
    } else if (o.head === 'vendor') {
      // head wrap and a full beard
      g.ellipse(hx - 1, hy - 4, 6, 3, P.apron);
      g.hline(hx - 6, hx + 5, hy - 2, P.apronShade);
      g.rect(hx + 1, hy + 2, 5, 3, P.ink);
      if (face === 'sip') g.rect(hx + 3, hy + 1, 3, 2, P.white);
    } else if (o.head === 'priest') {
      g.ellipse(hx, hy - 3, 5, 3, mix(o.skin, P.white, 0.15)); // shaved head shine
      g.set(hx - 1, hy - 5, mix(o.skin, P.white, 0.4));
    } else if (o.head === 'ref') {
      // short grey hair and a mustache
      g.ellipse(hx - 1, hy - 4, 5, 2, P.grey);
      g.rect(hx - 5, hy - 4, 2, 4, P.grey);
      g.hline(hx + 2, hx + 5, hy + 1, P.greyDark);
    } else if (o.head === 'hardhat') {
      // hard hat with a headlamp, goggles pushed up on the brim
      const hc = o.hatColor ?? P.yellow;
      g.ellipse(hx, hy - 6, 6, 3, hc); g.rect(hx - 6, hy - 4, 14, 1, mix(hc, P.ink, 0.35));
      g.hline(hx - 3, hx + 2, hy - 8, mix(hc, P.white, 0.5));
      g.rect(hx + 4, hy - 7, 2, 2, P.white); g.set(hx + 6, hy - 6, [255, 246, 200, 255]);
    } else if (o.head === 'afro') {
      g.ellipse(hx - 3, hy - 5, 7, 4, P.ink); g.set(hx - 6, hy - 7, P.inkSoft); g.set(hx, hy - 8, P.inkSoft);
    } else if (o.head === 'mask' && p.maskOff) {
      // the surprised face under the mask: short twists
      for (let i = -4; i <= 3; i += 2) g.rect(hx + i, hy - 6, 2, 2, P.ink);
      g.rect(hx + 3, hy + 1, 2, 3, P.ink);
    }
  }

  if (o.bowtie) {
    g.rect(shX - 1, shY, 2, 2, P.ink); g.rect(shX + 3, shY, 2, 2, P.ink); g.set(shX + 2, shY + 1, P.ink);
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

// ------------------------------------------------------------------ Old Memphis (Mission 2)
const KILT: RGBA = [236, 230, 210, 255], KILT_D: RGBA = [190, 180, 156, 255];
const SANDAL: RGBA = [140, 96, 52, 255], SANDAL_D: RGBA = [96, 64, 34, 255];

// The king's jackal-masked guards. Spear guards rush; pot throwers keep their distance.
export const jackalOutfits: Record<string, Outfit> = {
  jackalSpear: { skin: P.skin2, skinShade: P.skin2Shade, top: P.skin2, topShade: P.skin2Shade, pants: KILT, pantsShade: KILT_D, shoes: SANDAL, shoesShade: SANDAL_D, head: 'jackal', kilt: true, collar: P.gold, sandals: true },
  jackalBlade: { skin: P.skin1, skinShade: P.skin1Shade, top: P.skin1, topShade: P.skin1Shade, pants: KILT, pantsShade: KILT_D, shoes: SANDAL, shoesShade: SANDAL_D, head: 'jackal', kilt: true, collar: P.goldMid, sandals: true },
  jackalPot: { skin: P.skin3, skinShade: P.skin3Shade, top: P.skin3, topShade: P.skin3Shade, pants: [200, 170, 120, 255], pantsShade: [160, 130, 86, 255], shoes: SANDAL, shoesShade: SANDAL_D, head: 'jackal', kilt: true, collar: P.blue, sandals: true },
};

export const jackalDef = (weapon: 'spear' | 'khopesh' | 'pot'): Def => {
  const held: Hand = weapon === 'spear' ? 'spear' : weapon === 'khopesh' ? 'khopesh' : 'open';
  const strike: Hand = weapon === 'spear' ? 'spearThrust' : weapon === 'khopesh' ? 'khopeshSwing' : 'fist';
  return {
    idle: [
      { fa: [6, 4], fHand: held, ba: [1, 6], ff: [3, 0], bf: [-4, 0], crouch: 1, face: 'angry' },
      { fa: [6, 5], fHand: held, ba: [1, 7], ff: [3, 0], bf: [-4, 0], crouch: 2, face: 'angry' },
    ],
    walk: [0, 1, 2, 3].map((i) => walk4(i, { face: 'angry', fHand: held, fa: [5, 5] })),
    punch: [
      { fa: [-2, 3], fHand: weapon === 'spear' ? 'spearThrust' : held, ba: [2, 5], ff: [3, 0], bf: [-4, 0], lean: -2, face: 'angry' },
      { fa: [-1, 1], fHand: weapon === 'spear' ? 'spearThrust' : held, ba: [3, 4], ff: [4, 0], bf: [-5, 0], lean: -3, crouch: 1, face: 'angry' },
      { fa: [15, 0], fab: 0, fHand: strike, ba: [-2, 6], ff: [5, 0], bf: [-6, 0], lean: 3, face: 'angry' },
    ],
    throw: [
      { fa: [-8, -6], fHand: 'pot', ba: [4, 4], ff: [3, 0], bf: [-4, 0], lean: -3, face: 'angry' },
      { fa: [-6, -10], fHand: 'pot', ba: [5, 2], ff: [3, 0], bf: [-4, 0], lean: -4, face: 'angry' },
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
  };
};

// The Jackal Captain: bigger, gold ears, red eyes, red cape, a khopesh.
export const jackalCaptain: Outfit = {
  skin: P.skin3, skinShade: P.skin3Shade, top: P.skin3, topShade: P.skin3Shade, pants: [30, 30, 44, 255], pantsShade: [18, 18, 28, 255],
  shoes: P.gold, shoesShade: P.goldDark, head: 'jackalCaptain', kilt: true, collar: P.gold, cape: [150, 30, 40, 255], sandals: true, big: true,
};
export const jackalCaptainDef = (): Def => ({
  ...jackalDef('khopesh'),
  // charging lunge with the blade out front
  dash: [
    { fa: [14, 2], fab: 0, fHand: 'khopeshSwing', ba: [-6, 4], ff: [7, 0], bf: [-8, -2], lean: 5, crouch: 2, face: 'angry' },
    { fa: [14, 3], fab: 0, fHand: 'khopeshSwing', ba: [-7, 3], ff: [4, -2], bf: [-6, 0], lean: 6, crouch: 3, face: 'angry' },
  ],
  // head back, arms wide: calls the guards
  howl: [
    { fa: [8, -10], fHand: 'khopesh', ba: [-6, -8], bHand: 'open', ff: [3, 0], bf: [-4, 0], lean: -3, face: 'angry' },
    { fa: [9, -12], fHand: 'khopesh', ba: [-7, -10], bHand: 'open', ff: [3, 0], bf: [-4, 0], lean: -4, face: 'angry' },
  ],
  // fake surrender, a bow
  bow: [
    { fa: [6, 10], fHand: 'khopesh', ba: [2, 11], ff: [3, 0], bf: [-4, 0], lean: 5, crouch: 4, face: 'normal' },
    { fa: [6, 11], fHand: 'khopesh', ba: [2, 12], ff: [3, 0], bf: [-4, 0], lean: 6, crouch: 5, face: 'normal' },
  ],
});

// Nia, priestess of Old Memphis. Drawn plain, then turned to light by glowSheet.
export const nia: Outfit = {
  skin: P.skin2, skinShade: P.skin2Shade, top: KILT, topShade: KILT_D, pants: KILT, pantsShade: KILT_D,
  shoes: SANDAL, shoesShade: SANDAL_D, head: 'nia', dress: true, collar: P.gold, sandals: true,
};
export const niaDef = (): Def => ({
  idle: [
    { fa: [4, 9], ba: [0, 9], ff: [2, 0], bf: [-2, 0] },
    { fa: [4, 10], ba: [0, 10], ff: [2, 0], bf: [-2, 0], y: -1 },
  ],
  talk: [
    { fa: [9, -2], fHand: 'open', ba: [0, 9], ff: [2, 0], bf: [-2, 0], face: 'smile' },
    { fa: [10, -5], fHand: 'open', ba: [0, 9], ff: [2, 0], bf: [-2, 0] },
  ],
});

export const vendor: Outfit = {
  skin: P.skin1, skinShade: P.skin1Shade, top: [196, 150, 90, 255], topShade: [150, 110, 64, 255], pants: [196, 150, 90, 255], pantsShade: [150, 110, 64, 255],
  shoes: SANDAL, shoesShade: SANDAL_D, head: 'vendor', dress: true, sandals: true, big: true,
};
export const vendorDef = (): Def => ({
  idle: [
    { fa: [6, 6], fHand: 'dates', ba: [0, 9], ff: [2, 0], bf: [-3, 0] },
    { fa: [6, 7], fHand: 'dates', ba: [0, 10], ff: [2, 0], bf: [-3, 0], crouch: 1 },
  ],
  talk: [
    { fa: [8, -2], fHand: 'open', ba: [0, 9], ff: [2, 0], bf: [-3, 0], face: 'smile' },
    { fa: [9, -5], fHand: 'open', ba: [0, 9], ff: [2, 0], bf: [-3, 0], face: 'normal' },
  ],
  // holds the grill up to his mouth and bites it
  bite: [
    { fa: [6, -7], fHand: 'grill', ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: -1, face: 'normal' },
    { fa: [5, -9], fHand: 'grill', ba: [0, 9], ff: [2, 0], bf: [-3, 0], lean: -2, face: 'sip' },
  ],
  give: [
    { fa: [12, 2], fHand: 'dates', ba: [0, 9], ff: [3, 0], bf: [-3, 0], lean: 2, face: 'smile' },
  ],
});

// The young king (face in shadow) and his priests, for Nia's memory.
export const king: Outfit = {
  skin: P.skin2, skinShade: P.skin2Shade, top: P.skin2, topShade: P.skin2Shade, pants: KILT, pantsShade: KILT_D,
  shoes: P.gold, shoesShade: P.goldDark, head: 'king', kilt: true, collar: P.gold, cape: [40, 60, 140, 255], sandals: true,
};
export const kingDef = (): Def => ({
  idle: [
    { fa: [5, 8], ba: [0, 9], ff: [2, 0], bf: [-3, 0] },
    { fa: [5, 9], ba: [0, 10], ff: [2, 0], bf: [-3, 0], crouch: 1 },
  ],
  laugh: [
    { fa: [8, -4], fHand: 'open', ba: [0, 6], ff: [2, 0], bf: [-3, 0], lean: -2, face: 'smile' },
    { fa: [8, -2], fHand: 'open', ba: [0, 7], ff: [2, 0], bf: [-3, 0], lean: -1, face: 'smile' },
  ],
  point: [
    { fa: [16, -4], fab: 0, fHand: 'open', ba: [-2, 8], ff: [3, 0], bf: [-4, 0], lean: 2, face: 'angry' },
  ],
});
export const priest: Outfit = {
  skin: P.skin3, skinShade: P.skin3Shade, top: KILT, topShade: KILT_D, pants: KILT, pantsShade: KILT_D,
  shoes: SANDAL, shoesShade: SANDAL_D, head: 'priest', dress: true, sandals: true,
};
export const priestDef = (): Def => ({
  idle: [
    { fa: [4, 9], ba: [0, 9], ff: [2, 0], bf: [-3, 0] },
    { fa: [4, 10], ba: [0, 10], ff: [2, 0], bf: [-3, 0], crouch: 1 },
  ],
  carry: [
    { fa: [10, -2], fHand: 'open', ba: [8, -1], bHand: 'open', ff: [2, 0], bf: [-3, 0], lean: 1 },
    { fa: [10, -3], fHand: 'open', ba: [8, -2], bHand: 'open', ff: [3, 0], bf: [-3, 0], lean: 1, y: -1 },
  ],
  walk: [0, 1, 2, 3].map((i) => walk4(i)),
});

// Turns a sheet into light: blue water in the shadows, gold where it's bright, gold edge.
export function glowFrames(frames: Pix[]): Pix[] {
  return frames.map((f) => {
    const g = new Pix(f.w, f.h);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const c = f.get(x, y)!;
      if (!c[3]) continue;
      const lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
      const edge = f.alpha(x - 1, y) === 0 || f.alpha(x + 1, y) === 0 || f.alpha(x, y - 1) === 0 || f.alpha(x, y + 1) === 0;
      const col: RGBA = edge ? [255, 232, 150, 255] : lum > 0.6 ? [190, 236, 255, 235] : lum > 0.3 ? [96, 170, 240, 215] : [52, 104, 200, 200];
      g.set(x, y, col);
    }
    return g;
  });
}

// ------------------------------------------------------------------ Beale Below (Mission 6)
const COVERALL: RGBA = [74, 82, 100, 255], COVERALL_D: RGBA = [52, 58, 74, 255];
const HIVIS: RGBA = [232, 112, 34, 255];
const BOOT: RGBA = [70, 52, 36, 255], BOOT_D: RGBA = [46, 34, 24, 255];
const HAZMAT: RGBA = [228, 232, 238, 255], HAZMAT_D: RGBA = [176, 184, 198, 255];

// AetherCorp's drill crews. Hard hats with headlamps, hi-vis vests; the Coolant Crew are in hazmat suits with tanks.
export const crewOutfits: Record<string, Outfit> = {
  crewDrill: { skin: P.skin2, skinShade: P.skin2Shade, top: COVERALL, topShade: COVERALL_D, pants: COVERALL, pantsShade: COVERALL_D, shoes: BOOT, shoesShade: BOOT_D, head: 'hardhat', vest: HIVIS },
  crewWrench: { skin: P.skin1, skinShade: P.skin1Shade, top: [96, 70, 52, 255], topShade: [70, 50, 38, 255], pants: P.denim, pantsShade: P.denimShade, shoes: BOOT, shoesShade: BOOT_D, head: 'hardhat', vest: [196, 220, 60, 255], hatColor: P.white },
  crewCoolant: { skin: P.skin3, skinShade: P.skin3Shade, top: HAZMAT, topShade: HAZMAT_D, pants: HAZMAT, pantsShade: HAZMAT_D, shoes: [44, 120, 200, 255], shoesShade: [30, 84, 150, 255], head: 'hazmat', tank: true },
};
export const crewDef = (tool: 'drill' | 'wrench' | 'canister'): Def => {
  const held: Hand = tool === 'canister' ? 'open' : tool;
  return {
    idle: [
      { fa: [6, 4], fHand: held, ba: [1, 6], ff: [3, 0], bf: [-4, 0], crouch: 1, face: 'angry' },
      { fa: [6, 5], fHand: held, ba: [1, 7], ff: [3, 0], bf: [-4, 0], crouch: 2, face: 'angry' },
    ],
    walk: [0, 1, 2, 3].map((i) => walk4(i, { face: 'angry', fHand: held, fa: [5, 5] })),
    punch: [
      { fa: [-2, 3], fHand: held, ba: [2, 5], ff: [3, 0], bf: [-4, 0], lean: -2, face: 'angry' },
      { fa: [-1, 0], fHand: held, ba: [3, 4], ff: [4, 0], bf: [-5, 0], lean: -3, crouch: 1, face: 'angry' },
      { fa: [15, 0], fab: 0, fHand: tool === 'canister' ? 'fist' : held, ba: [-2, 6], ff: [5, 0], bf: [-6, 0], lean: 3, face: 'angry' },
    ],
    throw: [
      { fa: [-8, -6], fHand: 'canister', ba: [4, 4], ff: [3, 0], bf: [-4, 0], lean: -3, face: 'angry' },
      { fa: [-6, -10], fHand: 'canister', ba: [5, 2], ff: [3, 0], bf: [-4, 0], lean: -4, face: 'angry' },
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
  };
};

// The ghost musicians in the murals: generic figures (no real people), turned to light with glowFrames.
export const musicians: Record<string, Outfit> = {
  blues: { skin: P.skin3, skinShade: P.skin3Shade, top: [90, 60, 40, 255], topShade: [60, 40, 28, 255], pants: P.inkSoft, pantsShade: P.ink, shoes: P.brown, shoesShade: P.brownDark, head: 'malik', hat: true },
  soul: { skin: P.skin1, skinShade: P.skin1Shade, top: [200, 60, 90, 255], topShade: [150, 40, 66, 255], pants: [200, 60, 90, 255], pantsShade: [150, 40, 66, 255], shoes: P.gold, shoesShade: P.goldDark, head: 'afro', dress: true },
  rock: { skin: P.skin2, skinShade: P.skin2Shade, top: P.ink, topShade: P.inkSoft, pants: P.denim, pantsShade: P.denimShade, shoes: P.sneakerW, shoesShade: P.sneakerShade, head: 'malik' },
};
export const musicianDef = (who: 'blues' | 'soul' | 'rock'): Def => {
  if (who === 'blues') return {
    play: [
      { fa: [2, 10], fHand: 'guitar', ba: [8, 4], ff: [3, 0], bf: [-4, 0], lean: -1, face: 'sip' },
      { fa: [2, 11], fHand: 'guitar', ba: [8, 6], ff: [3, 0], bf: [-4, 0], lean: 0, crouch: 1, face: 'normal' },
    ],
  };
  if (who === 'soul') return {
    play: [
      { fa: [8, -4], fHand: 'mic', ba: [-4, -6], bHand: 'open', ff: [2, 0], bf: [-2, 0], lean: -2, face: 'sip' },
      { fa: [8, -6], fHand: 'mic', ba: [-6, -10], bHand: 'open', ff: [2, 0], bf: [-2, 0], lean: -3, face: 'smile' },
    ],
  };
  return {
    play: [
      { fa: [3, 9], fHand: 'guitarUp', ba: [8, 2], ff: [6, 0], bf: [-7, 0], lean: -4, crouch: 2, face: 'sip' },
      { fa: [4, 8], fHand: 'guitarUp', ba: [9, -1], ff: [6, -2], bf: [-7, 0], lean: -5, crouch: 3, face: 'smile' },
    ],
  };
};

// Uncle T at the bottom of the dig: carried off by the drones, then standing there with nothing behind his eyes.
export const uncleTLostDef = (): Def => ({
  idle: uncleTDef().idle,
  talk: uncleTDef().talk,
  walk: uncleTDef().walk,
  lifted: [
    { y: -2, fa: [6, -12], fHand: 'open', ba: [-2, -12], bHand: 'open', ff: [2, 3], bf: [-3, 4], lean: -1, face: 'scared' },
    { y: -3, fa: [7, -13], fHand: 'open', ba: [-3, -12], bHand: 'open', ff: [3, 4], bf: [-2, 3], lean: -2, face: 'scared' },
  ],
  blank: [
    { fa: [5, 12], fHand: 'cane', ba: [0, 10], ff: [2, 0], bf: [-3, 0], lean: 0, face: 'blank' },
    { fa: [5, 12], fHand: 'cane', ba: [0, 10], ff: [2, 0], bf: [-3, 0], lean: 0, crouch: 1, face: 'blank' },
  ],
});
