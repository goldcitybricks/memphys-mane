// Pothole the dog, the drive-out cars, props, effects, HUD bits and the alley backgrounds.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';

// ------------------------------------------------------------------ Pothole the dog (32x32)
export function dogFrames() {
  const fur = hex('#8a6a45'), furD = hex('#5e452b'), furL = hex('#b08c60');
  const mk = (legPhase: number, run: boolean, bark: boolean, mouthItem: boolean) => {
    const g = new Pix(32, 32);
    const by = 21 - (run ? Math.round(Math.abs(Math.sin(legPhase)) * 2) : 0);
    // legs
    const legs = [[10, 0], [13, Math.PI], [20, Math.PI / 2], [23, Math.PI * 1.5]];
    for (const [lx, ph] of legs) {
      const sw = run ? Math.round(Math.sin(legPhase + ph) * 3) : 0;
      g.line(lx, by + 3, lx + sw, 29, lx % 2 ? furD : fur, 2);
    }
    // body + tail
    g.ellipse(16, by, 9, 4, fur);
    g.hline(9, 22, by + 3, furD);
    g.line(7, by - 1, 4, by - 5 + (run ? Math.round(Math.sin(legPhase * 2)) : 0), fur, 2);
    // scruff
    for (let i = 9; i < 22; i += 3) g.set(i, by - 4, furL);
    // head
    const hx = 25, hy = by - 6 - (bark ? 1 : 0);
    g.ellipse(hx, hy, 4, 4, fur);
    g.rect(hx + 2, hy + 1, 4, 3, furL); // snout
    g.set(hx + 6, hy + 1, P.ink); // nose
    g.set(hx + 1, hy - 1, P.ink); // eye
    // one ear up, one flopped
    g.line(hx - 2, hy - 3, hx - 3, hy - 8, furD, 2);
    g.line(hx + 1, hy - 3, hx + 3, hy - 1, furD, 2);
    if (bark) { g.rect(hx + 3, hy + 3, 3, 2, P.redDark); g.set(hx + 5, hy + 4, P.white); }
    if (mouthItem) { g.rect(hx + 3, hy + 3, 5, 4, P.mask); g.set(hx + 5, hy + 4, P.skin1); g.set(hx + 6, hy + 4, P.skin1); }
    g.outline(P.ink);
    return g;
  };
  const frames = [
    mk(0, false, false, false), mk(0.4, false, false, false),
    mk(0, true, false, false), mk(Math.PI / 2, true, false, false), mk(Math.PI, true, false, false), mk(Math.PI * 1.5, true, false, false),
    mk(0, false, true, false), mk(0, false, false, false),
    mk(0, true, false, true), mk(Math.PI / 2, true, false, true), mk(Math.PI, true, false, true), mk(Math.PI * 1.5, true, false, true),
  ];
  return { frames, anims: { idle: [0, 1], run: [2, 5], bark: [6, 7], runMask: [8, 11] } as Record<string, [number, number]> };
}

// ------------------------------------------------------------------ drive-out cars (128x48)
export function carFrames(body: RGBA, bodyD: RGBA, opts: { primer?: boolean; gold?: boolean; seed: number }) {
  const out: Pix[] = [];
  for (let f = 0; f < 2; f++) {
    const g = new Pix(128, 48);
    const r = rng(opts.seed);
    const hi = mix(body, P.white, 0.35);
    // body: long low sedan, nose to the right
    g.poly([[6, 30], [10, 24], [34, 22], [48, 10], [86, 10], [100, 22], [120, 25], [124, 30], [124, 38], [4, 38]], body);
    g.rect(4, 34, 120, 4, bodyD);
    g.hline(10, 120, 25, hi);
    // windows
    g.poly([[51, 13], [66, 13], [66, 22], [40, 22]], hex('#1d2a3c'));
    g.poly([[70, 13], [84, 13], [96, 22], [70, 22]], hex('#1d2a3c'));
    g.line(53, 14, 47, 20, hex('#5a7aa0')); g.line(74, 14, 72, 20, hex('#5a7aa0'));
    g.vline(68, 11, 22, bodyD);
    // doors
    g.vline(68, 22, 36, bodyD); g.vline(40, 23, 36, bodyD); g.vline(98, 23, 36, bodyD);
    g.rect(60, 27, 4, 1, bodyD); g.rect(90, 27, 4, 1, bodyD);
    if (opts.primer) g.rect(70, 23, 27, 12, hex('#7d7d84')); // primer grey door
    if (opts.gold) { g.hline(6, 122, 31, P.goldHi); for (let i = 0; i < 4; i++) g.set(20 + i * 30, 27, P.white); }
    // dents and rust
    for (let i = 0; i < 6; i++) { const x = 8 + Math.floor(r() * 108); g.set(x, 30 + Math.floor(r() * 4), opts.gold ? P.goldDark : hex('#6b3b22')); }
    // lights: headlight right, tail left
    g.rect(119, 27, 5, 3, hex('#fff6c8'));
    g.rect(4, 28, 3, 4, P.red);
    // bumpers
    g.rect(118, 33, 7, 3, P.grey); g.rect(3, 33, 6, 3, P.grey);
    // wheels with turning spokes (no badges, no logos)
    for (const wx of [26, 102]) {
      g.circle(wx, 38, 8, P.ink);
      g.circle(wx, 38, 6, hex('#2a2a30'));
      g.circle(wx, 38, 4, opts.gold ? P.gold : P.grey);
      g.circle(wx, 38, 1, P.ink);
      const a = f * (Math.PI / 4);
      for (let k = 0; k < 4; k++) {
        const ang = a + (k * Math.PI) / 2;
        g.line(wx, 38, wx + Math.round(Math.cos(ang) * 3), 38 + Math.round(Math.sin(ang) * 3), opts.gold ? P.goldDark : P.greyDark);
      }
      // wheel arch
      for (let k = -9; k <= 9; k++) { const y = 38 - Math.round(Math.sqrt(Math.max(0, 81 - k * k))); g.set(wx + k, y - 1, P.ink); }
    }
    g.outline(P.ink);
    out.push(g);
  }
  return out;
}

// ------------------------------------------------------------------ props and FX
export function canPickup(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(16, 16);
    const glow = [0.25, 0.45, 0.6, 0.45][f];
    g.ellipse(8, 8, 7, 7, [245, 197, 66, Math.round(glow * 140)]);
    g.rect(5, 3, 6, 10, P.can);
    g.rect(5, 3, 6, 1, P.rim); g.rect(5, 12, 6, 1, P.rim);
    g.vline(6, 4, 11, P.canHi); g.vline(10, 4, 11, P.canShade);
    g.hline(6, 9, 5, P.label); // bridge
    g.rect(7, 8, 3, 1, P.gold); // grill
    g.set(7, 7, P.ink); g.set(9, 7, P.ink);
    const o = new Pix(16, 16); o.blit(g, 0, 0);
    // outline only the can
    const c = new Pix(16, 16);
    c.rect(5, 3, 6, 10, P.white); c.outline(P.ink);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const p = c.get(x, y)!; if (p[0] === P.ink[0] && p[3]) o.set(x, y, P.ink); }
    if (f === 2) drawSparkle(o, 11, 4, 1);
    return o;
  });
}

export function bbqPlate(): Pix {
  const g = new Pix(20, 14);
  g.ellipse(10, 9, 9, 3, P.plateShade);
  g.ellipse(10, 8, 9, 3, P.plate);
  // rack of ribs
  g.rect(4, 4, 12, 4, P.meat);
  g.hline(4, 15, 4, P.meatHi);
  for (let x = 5; x < 16; x += 3) g.vline(x, 4, 7, P.sauce);
  g.set(17, 6, hex('#e8d9a8')); g.set(17, 5, hex('#e8d9a8'));
  g.rect(2, 7, 2, 1, hex('#3c8a3a')); // pickle
  g.outline(P.ink);
  return g;
}

export function wingsPlate(): Pix {
  const g = new Pix(20, 14);
  g.ellipse(10, 9, 8, 3, P.plateShade);
  g.ellipse(10, 8, 8, 3, P.plate);
  for (const [x, y] of [[6, 6], [10, 5], [14, 6], [8, 7], [12, 7]]) { g.ellipse(x, y, 2, 1, P.meatHi); g.set(x - 1, y, P.meat); }
  g.outline(P.ink);
  return g;
}

export function trashCan(): Pix[] {
  const mk = (dent: boolean) => {
    const g = new Pix(20, 28);
    const m = hex('#8c939e'), md = hex('#5d636e'), ml = hex('#b9c0ca');
    g.rect(3, 6, 14, 20, m);
    g.vline(5, 7, 25, ml); g.vline(14, 7, 25, md); g.vline(15, 7, 25, md);
    for (let y = 10; y < 26; y += 5) g.hline(3, 16, y, md);
    g.rect(2, 3, 16, 3, ml); g.rect(8, 1, 4, 2, md); // lid
    if (dent) { g.rect(2, 0, 16, 6, [0, 0, 0, 0]); g.rect(4, 8, 4, 4, md); }
    g.outline(P.ink);
    return g;
  };
  return [mk(false), mk(true)];
}

export function bottleProj(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(12, 12);
    const a = (f * Math.PI) / 2;
    const dx = Math.round(Math.cos(a) * 3), dy = Math.round(Math.sin(a) * 3);
    g.line(6 - dx, 6 - dy, 6 + dx, 6 + dy, P.bottle, 3);
    g.set(6 + dx, 6 + dy, P.bottleCap);
    g.set(6 - dx, 6 - dy, P.bottleShade);
    g.outline(P.ink);
    return g;
  });
}

export function potholeDecal(w = 40, h = 12, seed = 3): Pix {
  const g = new Pix(w, h);
  const r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
    const d = dx * dx + dy * dy + (r() - 0.5) * 0.15;
    if (d < 1) g.set(x, y, d > 0.75 ? hex('#3a3f4c') : d > 0.5 ? hex('#151a24') : hex('#1c2a3e'));
  }
  // water shine
  g.hline(w / 2 - 6, w / 2 + 2, h / 2, hex('#3e5a80'));
  g.hline(w / 2 - 2, w / 2 + 6, h / 2 + 2, hex('#2e4466'));
  g.set(w / 2 + 4, h / 2 - 1, hex('#9fc0e6'));
  return g;
}

export function puddlePortal(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(64, 20);
    const gl = [0.6, 0.8, 1, 0.8][f];
    g.ellipse(32, 10, 30, 8, [245, 197, 66, Math.round(60 * gl)]);
    g.ellipse(32, 10, 26, 6, hex('#1a2a48'));
    g.ellipse(32, 10, 24, 5, mix(hex('#1a2a48'), hex('#2a4a80'), gl));
    // pyramids in the reflection
    for (const [px, s] of [[26, 4], [36, 3]]) for (let r = 0; r < s; r++) g.hline(px - r, px + r, 8 + r - (s - 3), mix(P.goldMid, P.goldHi, gl));
    g.hline(12 + f * 3, 18 + f * 3, 12, mix(P.gold, P.white, 0.5));
    g.hline(40 - f * 2, 46 - f * 2, 9, P.goldHi);
    return g;
  });
}

export function hitSpark(): Pix[] {
  return [0, 1, 2].map((f) => {
    const g = new Pix(24, 24);
    const R = [5, 9, 11][f];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + (f % 2) * 0.3;
      const len = k % 2 ? R * 0.6 : R;
      g.line(12, 12, 12 + Math.cos(a) * len, 12 + Math.sin(a) * len, f === 2 ? P.goldHi : P.white, f === 0 ? 2 : 1);
    }
    if (f < 2) g.circle(12, 12, 3 - f, P.white);
    return g;
  });
}

export function dust(): Pix[] {
  return [0, 1, 2].map((f) => {
    const g = new Pix(16, 16);
    const c: RGBA = [200, 190, 170, 220 - f * 60];
    g.circle(6 - f, 10 - f, 2 + f, c);
    g.circle(10 + f, 10 - f, 2 + f, c);
    return g;
  });
}

export function shadow(): Pix {
  const g = new Pix(28, 8);
  g.ellipse(14, 4, 12, 3, [0, 0, 0, 110]);
  return g;
}

export function maskProp(): Pix {
  const g = new Pix(10, 10);
  g.circle(5, 5, 4, P.mask);
  g.rect(3, 4, 5, 2, [0, 0, 0, 0]);
  g.set(4, 1, P.maskHi);
  g.outline(P.ink);
  return g;
}

export function sweatDrop(): Pix {
  const g = new Pix(6, 6);
  g.circle(3, 3, 2, P.bottle); g.set(2, 2, P.white);
  return g;
}

export function smoke(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(24, 24);
    const a = 150 - f * 35;
    g.circle(12, 14 - f * 2, 4 + f * 2, [150, 150, 160, a]);
    g.circle(9, 12 - f * 2, 3 + f, [180, 180, 190, a]);
    return g;
  });
}

// ------------------------------------------------------------------ HUD + touch buttons
export function hudBits() {
  const heart = new Pix(8, 8);
  heart.rect(1, 1, 6, 5, P.red);
  const can = new Pix(8, 10);
  can.rect(1, 1, 6, 8, P.can); can.hline(1, 6, 1, P.rim); can.hline(2, 5, 6, P.gold); can.vline(2, 2, 7, P.canHi);
  can.outline(P.ink);
  const canEmpty = new Pix(8, 10);
  canEmpty.rect(1, 1, 6, 8, [80, 80, 100, 200]); canEmpty.outline(P.ink);
  return { can, canEmpty };
}

export function touchButton(label: string, base: RGBA, r = 22): Pix {
  const s = r * 2 + 4;
  const g = new Pix(s, s);
  const c = s / 2;
  g.circle(c, c, r, [10, 8, 20, 120]);
  g.circle(c, c, r - 1, [base[0], base[1], base[2], 150]);
  g.circle(c - 2, c - 2, r - 5, [Math.min(255, base[0] + 40), Math.min(255, base[1] + 40), Math.min(255, base[2] + 40), 120]);
  // ring
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    g.set(c + Math.cos(rad) * r, c + Math.sin(rad) * r, [255, 255, 255, 170]);
  }
  const w = textWidth(label, 1);
  text(g, label, Math.round(c - w / 2), Math.round(c - 3), P.ink);
  text(g, label, Math.round(c - w / 2) - 1, Math.round(c - 4), P.white);
  return g;
}

export function stickBase(): Pix {
  const g = new Pix(64, 64);
  g.circle(32, 32, 30, [10, 8, 20, 90]);
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    g.set(32 + Math.cos(rad) * 30, 32 + Math.sin(rad) * 30, [255, 255, 255, 120]);
  }
  return g;
}
export function stickKnob(): Pix {
  const g = new Pix(28, 28);
  g.circle(14, 14, 12, [245, 197, 66, 200]);
  g.circle(12, 12, 7, [255, 241, 168, 200]);
  return g;
}

// ------------------------------------------------------------------ logo
export function logo(): Pix {
  const g = new Pix(300, 74);
  const fill = (s: string, x: number, y: number, scale: number, top: RGBA, bot: RGBA) => {
    const tmp = new Pix(g.w, g.h);
    text(tmp, s, x, y, P.white, scale, 1);
    const h = 7 * scale;
    tmp.mask((xx, yy) => mix(top, bot, Math.min(1, Math.max(0, (yy - y) / h))));
    // drop shadow
    const sh = new Pix(g.w, g.h);
    text(sh, s, x + 2, y + 2, P.goldDark, scale, 1);
    g.blit(sh, 0, 0);
    g.blit(tmp, 0, 0);
  };
  const small = 'THE LEGEND OF';
  text(g, small, Math.round(150 - textWidth(small, 1) / 2), 2, P.canHi, 1);
  const w1 = textWidth('MEMPHYS', 5, 1);
  fill('MEMPHYS', Math.round(150 - w1 / 2), 13, 5, P.goldHi, P.goldMid);
  const w2 = textWidth('MANE', 3, 1);
  fill('MANE', Math.round(150 - w2 / 2), 52, 3, P.canHi, P.canShade);
  g.outline(P.ink, true);
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ backgrounds (384x216 view)
export const LEVEL_W = 2560;

export function skyLayer(): Pix {
  // night sky + Memphis skyline: bridge arches, the pyramid, lit towers. Tiles horizontally.
  const W = 768, g = new Pix(W, 216);
  const r = rng(11);
  for (let y = 0; y < 216; y++) {
    const c = mix(hex('#070a1c'), hex('#1c2550'), Math.min(1, y / 150));
    g.hline(0, W - 1, y, c);
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 90);
    g.set(x, y, r() > 0.85 ? hex('#ffcf7a') : hex('#c8d0ff', 180 + Math.floor(r() * 75)));
  }
  // moon
  g.circle(600, 30, 9, hex('#f6efd0')); g.circle(604, 27, 8, hex('#0d1230'));
  const sky = hex('#141a3a');
  const bld = hex('#1a1f40'), lit = hex('#f2b950'), litDim = hex('#a8783a');
  const base = 120;
  // the Hernando-DeSoto bridge, "M" arches with lights
  const bx = 30;
  for (let x = 0; x < 150; x++) {
    const t = (x % 75) / 75;
    const h = Math.round(Math.sin(t * Math.PI) * 26);
    g.set(bx + x, base - 6 - h, hex('#3a4170'));
    if (x % 6 === 0) { g.vline(bx + x, base - 6 - h, base - 6, hex('#262c56')); g.set(bx + x, base - 7 - h, hex('#ffffff')); }
  }
  g.hline(bx - 10, bx + 160, base - 6, hex('#3a4170'));
  g.hline(bx - 10, bx + 160, base - 5, hex('#262c56'));
  // the pyramid
  for (let rr = 0; rr < 46; rr++) g.hline(250 - rr, 250 + rr, base - 46 + rr, rr < 2 ? hex('#7f88c0') : mix(hex('#2c3460'), hex('#1e2448'), rr / 46));
  for (let rr = 4; rr < 46; rr += 6) g.hline(250 - rr, 250 + rr, base - 46 + rr, hex('#323a6a'));
  // towers
  const towers = [[320, 40, 62], [366, 28, 88], [398, 34, 70], [440, 22, 100], [466, 30, 76], [506, 26, 58], [540, 36, 84], [586, 24, 64], [620, 40, 50], [700, 30, 44]];
  for (const [x, w, h] of towers) {
    g.rect(x, base - h, w, h, bld);
    g.rect(x, base - h, 2, h, hex('#232a52'));
    for (let wy = base - h + 4; wy < base - 2; wy += 4) for (let wx = x + 3; wx < x + w - 2; wx += 4) {
      const v = r();
      if (v > 0.55) g.rect(wx, wy, 2, 2, v > 0.85 ? lit : litDim);
    }
    if (h > 80) { g.vline(x + w / 2, base - h - 10, base - h, bld); g.set(x + w / 2, base - h - 11, P.red); }
  }
  // old brick tower (Orange Mound landmark silhouette)
  g.rect(150, base - 50, 12, 50, hex('#3a2630')); g.rect(148, base - 54, 16, 4, hex('#4a3038'));
  // low haze
  for (let y = base - 10; y < 216; y++) g.hline(0, W - 1, y, y < base ? mix(sky, hex('#2a2550'), 0.3) : hex('#141a3a'));
  return g;
}

export function farLayer(): Pix {
  // Orange Mound rooftops, trees, utility poles, a blank billboard. Tiles horizontally.
  const W = 960, g = new Pix(W, 216);
  const r = rng(21);
  const roof = hex('#141834'), roofHi = hex('#20264a'), win = hex('#f0c060');
  let x = 0;
  while (x < W) {
    const kind = r();
    if (kind < 0.45) {
      // shotgun house: gable roof
      const w = 34 + Math.floor(r() * 14), h = 26 + Math.floor(r() * 10);
      const by = 132;
      g.rect(x, by - h, w, h, roof);
      for (let k = 0; k < w / 2; k++) g.hline(x + k, x + w - k - 1, by - h - Math.floor(k * 0.7), roof);
      g.hline(x, x + w - 1, by - h, roofHi);
      if (r() > 0.4) { g.rect(x + 6, by - h + 8, 5, 6, win); g.vline(x + 8, by - h + 8, by - h + 13, roof); }
      if (r() > 0.6) g.rect(x + w - 12, by - h + 8, 5, 6, hex('#7a90c0'));
      x += w + 4 + Math.floor(r() * 10);
    } else if (kind < 0.7) {
      // big tree
      const cx = x + 20, cy = 96 + Math.floor(r() * 10);
      for (let k = 0; k < 7; k++) g.circle(cx - 12 + Math.floor(r() * 24), cy - 6 + Math.floor(r() * 16), 9 + Math.floor(r() * 5), hex('#0f1a2a'));
      g.rect(cx - 2, cy + 10, 4, 30, hex('#0c1220'));
      x += 44;
    } else if (kind < 0.82) {
      // billboard on legs (blank, waiting for AetherCorp ads later)
      g.rect(x, 64, 70, 30, hex('#2a2f55'));
      g.rect(x + 2, 66, 66, 26, hex('#3b4677'));
      text(g, 'PURE', x + 10, 70, hex('#f5c542'), 1);
      text(g, 'MEMPHYS', x + 10, 80, hex('#fff1a8'), 1);
      g.vline(x + 15, 94, 132, roof); g.vline(x + 55, 94, 132, roof);
      x += 84;
    } else {
      // flat-top commercial block
      const w = 60 + Math.floor(r() * 30), h = 30;
      g.rect(x, 132 - h, w, h, hex('#161c3c'));
      g.hline(x, x + w, 132 - h, hex('#262d58'));
      x += w + 6;
    }
  }
  // utility poles and wires across the whole strip
  for (let px = 40; px < W; px += 160) {
    g.vline(px, 50, 140, hex('#0b0f20')); g.vline(px + 1, 50, 140, hex('#0b0f20'));
    g.hline(px - 8, px + 9, 56, hex('#0b0f20'));
    const nx = px + 160;
    for (const off of [-7, 0, 7]) {
      for (let t = 0; t <= 160; t++) {
        const sag = Math.round(Math.sin((t / 160) * Math.PI) * 8);
        g.set(px + off + t, 56 + sag, hex('#0b0f20', 220));
      }
    }
    void nx;
  }
  return g;
}

// The playfield wall: back of Uncle T's Pit and the alley behind Park & Airways.
export function wallLayer(): Pix {
  const W = LEVEL_W, g = new Pix(W, 216);
  const r = rng(31);
  const groundY = 146;

  // --- Uncle T's Pit (based on the Wing Factory: white walls, blue stripe, red sign)
  const utX = 0, utW = 520, utTop = 46;
  g.rect(utX, utTop, utW, groundY - utTop, hex('#c9ccd6'));
  // cinder blocks
  for (let y = utTop + 4; y < groundY; y += 6) {
    g.hline(utX, utX + utW, y, hex('#b2b6c4'));
    for (let x = utX + ((y / 6) % 2 ? 0 : 8); x < utX + utW; x += 16) g.vline(x, y - 5, y, hex('#b2b6c4'));
  }
  // night shading: wall darker at the top, lit from the back door
  for (let y = utTop; y < groundY; y++) for (let x = utX; x < utX + utW; x++) {
    const c = g.get(x, y)!;
    const d = Math.hypot(x - 190, (y - 96) * 1.4);
    const light = Math.max(0, 1 - d / 170);
    const dark = 0.55 - light * 0.5;
    g.set(x, y, mix(c, hex('#20264a'), dark) as RGBA);
  }
  // blue stripe along the base
  g.rect(utX, groundY - 16, utW, 10, hex('#2c5aa8'));
  g.hline(utX, utX + utW, groundY - 16, hex('#4a7ad0'));
  // roof parapet
  g.rect(utX, utTop - 4, utW, 5, hex('#8a8ea0'));
  g.hline(utX, utX + utW, utTop - 4, hex('#b8bccc'));
  // rooftop sign: UNCLE T'S PIT, red with neon outline
  const sx = 120, sy = 14;
  g.rect(sx - 4, sy - 4, 188, 26, hex('#9a1c24'));
  g.rect(sx - 2, sy - 2, 184, 22, hex('#c8282e'));
  const label = "UNCLE T'S PIT";
  const tw = textWidth(label, 2);
  text(g, label, sx + 90 - tw / 2 + 1, sy + 4, hex('#5a0a10'), 2);
  text(g, label, sx + 90 - tw / 2, sy + 3, hex('#fff4e0'), 2);
  g.vline(sx + 20, sy + 22, utTop - 4, hex('#3a3a46')); g.vline(sx + 160, sy + 22, utTop - 4, hex('#3a3a46'));
  // back door with a bulb
  g.rect(170, 82, 34, groundY - 82, hex('#3a4466'));
  g.rect(172, 84, 30, groundY - 84, hex('#56628c'));
  g.rect(196, 112, 3, 6, hex('#c8c8d8'));
  g.rect(176, 88, 22, 10, hex('#f0d890')); // little window, lit
  g.rect(181, 72, 12, 4, hex('#555')); g.rect(185, 76, 4, 3, hex('#fff6c0'));
  // boarded window
  g.rect(70, 70, 46, 34, hex('#8a6a45'));
  for (let y = 72; y < 104; y += 6) g.hline(70, 115, y, hex('#6b4e30'));
  g.line(70, 70, 115, 103, hex('#5a4026'), 2);
  // menu board of the week, hand painted (fictional)
  g.rect(300, 66, 80, 46, hex('#1a1a22'));
  g.rect(302, 68, 76, 42, hex('#2a2a36'));
  text(g, 'RIBS', 308, 72, hex('#f5c542'));
  text(g, 'WINGS', 308, 82, hex('#f5c542'));
  text(g, 'TIPS', 308, 92, hex('#f5c542'));
  text(g, 'SLAW', 346, 72, hex('#e0e0e0'));
  text(g, 'BEANS', 342, 82, hex('#e0e0e0'));
  text(g, 'TEA', 350, 92, hex('#e0e0e0'));
  // AC unit and pipes
  g.rect(420, 60, 36, 22, hex('#9096a8')); for (let x = 422; x < 454; x += 3) g.vline(x, 62, 80, hex('#6a7084'));
  g.vline(470, utTop, groundY - 16, hex('#6a7084')); g.vline(471, utTop, groundY - 16, hex('#8a90a4'));

  // --- chain-link fence lot
  const fX = 520, fW = 300;
  for (let x = fX; x < fX + fW; x++) for (let y = 80; y < groundY; y++) {
    if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.set(x, y, hex('#5a6280', 200));
  }
  for (let x = fX; x <= fX + fW; x += 50) { g.vline(x, 76, groundY, hex('#7a82a0')); g.vline(x + 1, 76, groundY, hex('#4a5070')); }
  g.hline(fX, fX + fW, 78, hex('#7a82a0'));
  // dumpster in front of the fence
  g.rect(560, 104, 70, 38, hex('#2f5a3a'));
  g.rect(556, 100, 78, 6, hex('#3e7048'));
  g.hline(560, 630, 120, hex('#244a2e'));
  g.rect(566, 110, 2, 20, hex('#244a2e')); g.rect(620, 110, 2, 20, hex('#244a2e'));

  // --- brick building with a 901 mural
  const bX = 820, bW = 460, bTop = 36;
  g.rect(bX, bTop, bW, groundY - bTop, hex('#5a2a2a'));
  for (let y = bTop; y < groundY; y += 4) {
    g.hline(bX, bX + bW, y, hex('#3e1c1e'));
    for (let x = bX + ((y / 4) % 2 ? 0 : 5); x < bX + bW; x += 10) g.vline(x, y, y + 3, hex('#3e1c1e'));
  }
  for (let y = bTop; y < groundY; y++) for (let x = bX; x < bX + bW; x++) {
    const c = g.get(x, y)!; g.set(x, y, mix(c, hex('#1a1830'), 0.35 + (bTop + 20 - y > 0 ? 0.2 : 0)) as RGBA);
  }
  // mural panel: 901 tag, gold on navy, with a can and a pyramid
  const mX = bX + 60, mY = 54;
  g.rect(mX, mY, 240, 78, hex('#1e2a5a'));
  for (let y = mY; y < mY + 78; y++) g.hline(mX, mX + 239, y, mix(hex('#24346e'), hex('#141c40'), (y - mY) / 78));
  for (let rr = 0; rr < 30; rr++) g.hline(mX + 196 - rr, mX + 196 + rr, mY + 44 + rr, mix(P.goldMid, P.goldDark, rr / 30)); // pyramid
  g.circle(mX + 30, mY + 22, 12, hex('#f5c542')); // sun
  const t901 = '901';
  text(g, t901, mX + 64 + 3, mY + 12 + 3, hex('#0a0e24'), 7);
  text(g, t901, mX + 64, mY + 12, hex('#f5c542'), 7);
  text(g, 'ORANGE MOUND', mX + 70, mY + 64, hex('#ffffff'));
  g.rect(mX, mY + 76, 240, 2, hex('#0a0e24'));
  // fire escape
  for (let y = 50; y < 120; y += 24) { g.rect(bX + 350, y, 60, 2, hex('#20202c')); for (let x = bX + 350; x < bX + 410; x += 4) g.vline(x, y - 8, y, hex('#20202c')); }
  g.line(bX + 352, 74, bX + 406, 50, hex('#20202c'), 2); g.line(bX + 352, 98, bX + 406, 74, hex('#20202c'), 2);
  g.rect(bX + 360, 112, 20, 30, hex('#2a1a1c')); // side door

  // --- tire shop back: iron fence + stacks of tires
  const tX = 1280, tW = 420;
  g.rect(tX, 60, tW, groundY - 60, hex('#3c3a52'));
  g.rect(tX, 56, tW, 6, hex('#55536e'));
  g.rect(tX + 40, 80, 120, groundY - 80, hex('#2a2a3a')); // roll-up door
  for (let y = 82; y < groundY; y += 4) g.hline(tX + 42, tX + 158, y, hex('#383848'));
  text(g, 'TIRES', tX + 210, 74, hex('#e8e0c0'), 2);
  text(g, 'USED + NEW', tX + 212, 94, hex('#c8c0a0'));
  for (const [x, n] of [[tX + 190, 4], [tX + 222, 3], [tX + 300, 5], [tX + 330, 2]]) {
    for (let k = 0; k < n; k++) { g.rect(x, groundY - 8 - k * 8, 26, 8, hex('#16161c')); g.hline(x + 3, x + 22, groundY - 5 - k * 8, hex('#3a3a44')); }
  }
  for (let x = tX + 170; x < tX + tW; x += 6) { g.vline(x, 104, groundY, hex('#111118')); g.set(x, 103, hex('#2a2a34')); }
  g.hline(tX + 170, tX + tW, 106, hex('#111118')); g.hline(tX + 170, tX + tW, 130, hex('#111118'));

  // --- strip mall back: green metal roof, loading doors, dryer vents
  const sX = 1700, sW = 520;
  g.rect(sX, 50, sW, groundY - 50, hex('#b8b4a4'));
  for (let y = 50; y < groundY; y++) for (let x = sX; x < sX + sW; x++) { const c = g.get(x, y)!; g.set(x, y, mix(c, hex('#1a2044'), 0.68) as RGBA); }
  g.rect(sX - 6, 40, sW + 12, 12, hex('#2e6a4a'));
  for (let x = sX - 6; x < sX + sW + 6; x += 4) g.vline(x, 40, 51, hex('#245a3e'));
  for (let k = 0; k < 4; k++) {
    const dx = sX + 30 + k * 125;
    g.rect(dx, 92, 30, groundY - 92, hex('#4a4e66'));
    g.rect(dx + 24, 116, 3, 4, hex('#c0c0d0'));
    text(g, ['LAUNDRY', 'TAX', 'DISCOUNT', 'BARBER'][k], dx - 2, 80, hex('#d8d4c4'));
    // dryer vents puffing
    if (k === 0) for (let v = 0; v < 3; v++) g.rect(dx + 50 + v * 14, 70, 8, 8, hex('#808499'));
  }
  // a painted wall message
  text(g, 'WE MUST VOTE', sX + 300, 62, hex('#e8e4d4'), 1);

  // --- open lot at the end of the alley, glowing toward the street
  const eX = 2220;
  for (let x = eX; x < W; x++) for (let y = 70; y < groundY; y++) {
    if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.set(x, y, hex('#5a6280', 160));
  }
  for (let x = eX; x < W; x += 50) g.vline(x, 66, groundY, hex('#4a5070'));
  // street light
  g.vline(eX + 120, 30, groundY, hex('#2a2a34')); g.hline(eX + 120, eX + 140, 30, hex('#2a2a34'));
  g.rect(eX + 136, 31, 8, 3, hex('#fff4c0'));
  for (let y = 34; y < groundY; y++) {
    const w = Math.round((y - 34) * 0.35);
    for (let x = eX + 140 - w; x <= eX + 140 + w; x++) g.set(x, y, [255, 240, 180, 26]);
  }

  // curb + base shadow along the whole wall
  g.rect(0, groundY - 4, W, 4, hex('#22263c'));
  // utility poles along the alley (front of walls)
  for (const px of [490, 1100, 1660, 2180]) {
    g.rect(px, 8, 5, groundY - 8, hex('#3a2a22')); g.vline(px + 1, 8, groundY, hex('#54402e'));
    g.rect(px - 14, 18, 33, 3, hex('#3a2a22'));
    g.rect(px + 6, 26, 8, 10, hex('#5a5a66'));
  }
  // a few graffiti-free stickers and wear
  for (let i = 0; i < 160; i++) { const x = Math.floor(r() * W), y = 50 + Math.floor(r() * 90); if (g.alpha(x, y)) g.set(x, y, [0, 0, 0, 50]); }
  return g;
}

export function groundLayer(): Pix {
  const W = LEVEL_W, g = new Pix(W, 216);
  const r = rng(41);
  const top = 146;
  for (let y = top; y < 216; y++) {
    const c = mix(hex('#262a3e'), hex('#363a50'), (y - top) / 70);
    g.hline(0, W - 1, y, c);
  }
  // asphalt grain
  for (let i = 0; i < 5200; i++) {
    const x = Math.floor(r() * W), y = top + Math.floor(r() * 70);
    g.set(x, y, r() > 0.5 ? hex('#2e3248') : hex('#42465e'));
  }
  // faded parking stripes (perspective slant)
  for (let x = 60; x < W; x += 140) {
    for (let y = top + 6; y < 212; y++) { const sx = x + Math.round((y - top) * 0.5); g.set(sx, y, hex('#8a7a3a', 140)); g.set(sx + 1, y, hex('#8a7a3a', 140)); }
  }
  // cracks
  for (let i = 0; i < 40; i++) {
    let x = Math.floor(r() * W), y = top + 8 + Math.floor(r() * 60);
    for (let k = 0; k < 14; k++) { g.set(x, y, hex('#181b28')); x += Math.round(r() * 2 - 0.3); y += Math.round(r() * 2 - 1); if (y < top) break; }
  }
  // oil stains and neon puddle reflections
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * W), y = top + 12 + Math.floor(r() * 50);
    g.ellipse(x, y, 8 + Math.floor(r() * 10), 2 + Math.floor(r() * 2), [20, 18, 30, 110]);
  }
  for (const x of [220, 1000, 1840]) {
    g.ellipse(x, 172, 20, 4, hex('#2a3658'));
    g.hline(x - 8, x + 6, 171, x < 400 ? hex('#c8282e', 160) : hex('#f5c542', 120));
  }
  // curb top edge
  g.hline(0, W - 1, top, hex('#4a4e66'));
  g.hline(0, W - 1, top + 1, hex('#3a3e56'));
  return g;
}

// Smoker (separate sprite so smoke can rise from it)
export function smokerProp(): Pix {
  const g = new Pix(56, 48);
  g.rect(4, 14, 44, 20, hex('#1a1a20'));
  g.ellipse(26, 14, 22, 6, hex('#26262e'));
  g.hline(8, 44, 12, hex('#3a3a46'));
  g.rect(42, 0, 6, 14, hex('#1a1a20')); // chimney
  g.rect(10, 34, 3, 12, hex('#1a1a20')); g.rect(40, 34, 3, 12, hex('#1a1a20'));
  g.circle(11, 44, 3, hex('#2a2a30')); g.circle(41, 44, 3, hex('#2a2a30'));
  g.rect(20, 22, 12, 2, hex('#888')); // handle
  g.rect(6, 30, 40, 2, hex('#ff7a2a')); // fire glow
  g.outline(P.ink);
  return g;
}

export function picnicTable(): Pix {
  const g = new Pix(48, 24);
  const wood = hex('#7a5a3a'), woodD = hex('#5a4026');
  g.rect(2, 4, 44, 4, wood); g.hline(2, 45, 4, hex('#9a7a52'));
  g.rect(0, 13, 48, 3, woodD);
  g.line(8, 8, 4, 22, woodD, 2); g.line(40, 8, 44, 22, woodD, 2);
  g.outline(P.ink);
  return g;
}

// One-frame flash of Old Memphis, Egypt, when Malik sips (gold on navy).
export function egyptFlash(): Pix {
  const W = 480, g = new Pix(W, 216);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#0d1238'), hex('#2a2a5a'), y / 216));
  const r = rng(77);
  for (let i = 0; i < 60; i++) g.set(Math.floor(r() * W), Math.floor(r() * 110), hex('#ffe9a0'));
  g.circle(400, 40, 14, hex('#ffd46a')); g.circle(406, 36, 13, hex('#1a1d48'));
  const pyr = (cx: number, base: number, h: number) => {
    for (let k = 0; k < h; k++) {
      g.hline(cx - k, cx, base - h + k, mix(P.goldHi, P.gold, k / h));
      g.hline(cx + 1, cx + k, base - h + k, mix(P.goldMid, P.goldDark, k / h));
      if (k % 5 === 0) g.hline(cx - k, cx + k, base - h + k, P.goldDark);
    }
  };
  pyr(170, 160, 70); pyr(290, 160, 96); pyr(380, 160, 50);
  g.rect(0, 160, W, 56, hex('#c8901e'));
  for (let y = 160; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#e0a82e'), hex('#8a5a14'), (y - 160) / 56));
  // the Nile
  for (let y = 176; y < 196; y++) g.hline(0, W - 1, y, mix(hex('#2a4a9a'), hex('#4a7ad0'), (y - 176) / 20));
  for (let i = 0; i < 30; i++) g.hline(Math.floor(r() * W), Math.floor(r() * W) % W, 178 + Math.floor(r() * 16), hex('#8ab0f0'));
  return g;
}
