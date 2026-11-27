// Mission 2 "Old Memphis": Memphis, Egypt, 3,000 years ago. Gold on navy, the Nile, a market street,
// the temple and the old pyramid. Same specs as the alley: 216 tall, layers tile or span the level.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { drawSparkle } from './mane';

export const LEVEL2_W = 2560;
const GROUND_Y = 146;

const NIGHT = hex('#0d1238'), DUSK = hex('#2a2a5a'), HORIZON = hex('#6a3c5a');
const SAND = hex('#c8901e'), SAND_L = hex('#e0a82e'), SAND_D = hex('#8a5a14');
const MUD = hex('#9a6a3c'), MUD_L = hex('#b98a56'), MUD_D = hex('#6e4826');
const STONE = hex('#c8b48a'), STONE_L = hex('#e2d2aa'), STONE_D = hex('#8e7a58');
const NILE = hex('#2a4a9a'), NILE_L = hex('#4a7ad0'), NILE_HI = hex('#8ab0f0');
const PALM = hex('#1e3a2a'), PALM_L = hex('#2e5a3a'), TRUNK = hex('#4a3420');
const TWILIGHT = hex('#1a2048');

// darken toward the twilight navy so everything sits in one palette
function dusk(g: Pix, x0: number, y0: number, x1: number, y1: number, amt: number, lights: [number, number, number][] = []) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = g.get(x, y);
    if (!c || !c[3]) continue;
    let k = amt;
    for (const [lx, ly, r] of lights) k -= Math.max(0, 1 - Math.hypot(x - lx, (y - ly) * 1.2) / r) * amt * 0.8;
    g.set(x, y, mix(c, TWILIGHT, Math.max(0, k)) as RGBA);
  }
}

function pyramid(g: Pix, cx: number, base: number, h: number, light = P.goldHi, dark = P.goldDark, courses = 5) {
  for (let k = 0; k < h; k++) {
    const y = base - h + k;
    g.hline(cx - k, cx, y, mix(light, P.gold, k / h));
    g.hline(cx + 1, cx + k, y, mix(P.goldMid, dark, k / h));
    if (courses && k % courses === 0 && k > 0) g.hline(cx - k, cx + k, y, mix(dark, P.ink, 0.2));
  }
  // capstone catches the last light
  g.set(cx, base - h, P.white); g.set(cx, base - h + 1, P.goldHi);
}

function palm(g: Pix, x: number, base: number, h: number, seed: number, dark = false) {
  const r = rng(seed);
  const lean = Math.round((r() - 0.5) * 8);
  const tx = x + lean, ty = base - h;
  g.curve(x, base, x + lean * 0.2, base - h * 0.5, tx, ty, dark ? hex('#141c20') : TRUNK, 3);
  for (let y = ty + 2; y < base; y += 3) g.set(x + Math.round(lean * (1 - (y - ty) / h) * 0.6), y, dark ? hex('#0c1014') : hex('#2e2014'));
  const leaf = dark ? hex('#101a20') : PALM, leafL = dark ? hex('#16222a') : PALM_L;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.55 + (r() - 0.5) * 0.2;
    const len = 12 + r() * 6;
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.6 + len * 0.45;
    g.curve(tx, ty, tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 3, ex, ey, k % 2 ? leaf : leafL, 2);
  }
  g.circle(tx, ty + 1, 2, dark ? hex('#141c20') : hex('#3a2a18'));
}

function felucca(g: Pix, x: number, y: number, s = 1) {
  g.poly([[x - 9 * s, y], [x + 10 * s, y], [x + 7 * s, y + 3 * s], [x - 6 * s, y + 3 * s]], hex('#2a1c14'));
  g.vline(x, y - 18 * s, y, hex('#2a1c14'));
  g.poly([[x + 1, y - 18 * s], [x + 1, y - 2], [x + 12 * s, y - 3]], hex('#d8c8a0'));
  g.line(x - 8 * s, y - 14 * s, x + 12 * s, y - 3, hex('#2a1c14'));
}

// ------------------------------------------------------------------ sky: twilight, stars, the pyramids of Giza-style silhouettes far off
export function skyLayer2(): Pix {
  const W = 768, g = new Pix(W, 216);
  const r = rng(201);
  for (let y = 0; y < 216; y++) {
    const t = y / 130;
    const c = t < 0.7 ? mix(NIGHT, DUSK, t / 0.7) : mix(DUSK, HORIZON, Math.min(1, (t - 0.7) / 0.3));
    g.hline(0, W - 1, y, c);
  }
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 80);
    g.set(x, y, r() > 0.8 ? hex('#ffe9a0') : hex('#c8d0ff', 150 + Math.floor(r() * 100)));
  }
  // crescent moon
  g.circle(560, 34, 10, hex('#ffe9b8')); g.circle(565, 30, 9, mix(NIGHT, DUSK, 0.2));
  // far desert dunes and three pyramids glowing on the horizon
  const base = 122;
  for (let x = 0; x < W; x++) {
    const h = Math.round(6 + Math.sin(x / 60) * 3 + Math.sin(x / 23 + 1) * 2);
    g.vline(x, base - h, 216, mix(SAND_D, hex('#3a2a40'), 0.55));
  }
  pyramid(g, 140, base - 2, 40, mix(P.goldHi, HORIZON, 0.35), mix(P.goldDark, HORIZON, 0.5), 0);
  pyramid(g, 196, base - 2, 30, mix(P.goldHi, HORIZON, 0.4), mix(P.goldDark, HORIZON, 0.55), 0);
  pyramid(g, 236, base - 2, 20, mix(P.goldHi, HORIZON, 0.45), mix(P.goldDark, HORIZON, 0.6), 0);
  pyramid(g, 520, base - 2, 26, mix(P.goldHi, HORIZON, 0.45), mix(P.goldDark, HORIZON, 0.6), 0);
  for (let y = base; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#3a2a40'), TWILIGHT, Math.min(1, (y - base) / 20)));
  return g;
}

// ------------------------------------------------------------------ far: the Nile, sails, palms on the far bank, temples
export function farLayer2(): Pix {
  const W = 960, g = new Pix(W, 216);
  const r = rng(211);
  // far bank
  for (let x = 0; x < W; x++) g.vline(x, 104 + Math.round(Math.sin(x / 40) * 1.5), 116, hex('#2a2238'));
  // temples and an obelisk on the far bank
  for (const [x, w, h] of [[120, 50, 22], [430, 70, 28], [760, 44, 20]]) {
    g.poly([[x, 112], [x + w, 112], [x + w - 6, 112 - h], [x + 6, 112 - h]], hex('#3a3050'));
    g.hline(x + 6, x + w - 6, 112 - h, hex('#5a4a6a'));
    g.rect(x + w / 2 - 4, 112 - h + 8, 8, h - 8, hex('#241c34'));
  }
  g.poly([[300, 112], [306, 112], [304, 74], [302, 74]], hex('#3a3050')); g.set(303, 73, P.goldHi);
  for (let k = 0; k < 14; k++) palm(g, Math.floor(20 + k * 68 + r() * 20), 114, 22 + Math.floor(r() * 10), 300 + k, true);
  // the river
  for (let y = 114; y < 150; y++) g.hline(0, W - 1, y, mix(NILE, NILE_L, (y - 114) / 36));
  for (let y = 114; y < 150; y++) g.hline(0, W - 1, y, mix(g.get(0, y)!, TWILIGHT, 0.35));
  // the last light on the water
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = 116 + Math.floor(r() * 32), w = 3 + Math.floor(r() * 10);
    g.hline(x, Math.min(W - 1, x + w), y, r() > 0.6 ? hex('#f5c542', 170) : hex('#8ab0f0', 140));
  }
  // sails
  for (const [x, y, s] of [[200, 128, 1], [520, 136, 1], [690, 124, 1], [880, 132, 1]] as const) felucca(g, x, y, s);
  return g;
}

// ------------------------------------------------------------------ the playfield wall, left to right:
// riverbank quay, the market street, an open quay, the temple colonnade, the temple gate and the old pyramid.
export function wallLayer2(): Pix {
  const W = LEVEL2_W, g = new Pix(W, 216);
  const r = rng(231);

  // --- riverbank (0..380): low quay wall, reeds, a mooring post, palms
  for (let x = 0; x < 380; x++) { g.vline(x, GROUND_Y - 10, GROUND_Y - 1, x % 24 < 1 ? STONE_D : STONE); }
  g.hline(0, 379, GROUND_Y - 10, STONE_L);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * 380), h = 10 + Math.floor(r() * 14);
    g.line(x, GROUND_Y - 6, x + Math.round((r() - 0.5) * 4), GROUND_Y - 6 - h, i % 2 ? PALM_L : hex('#4a6a34'));
    if (r() > 0.6) g.ellipse(x, GROUND_Y - 7 - h, 2, 1, hex('#6a8a40'));
  }
  g.rect(300, GROUND_Y - 30, 6, 26, hex('#5a3a22')); g.rect(298, GROUND_Y - 32, 10, 3, hex('#6a4a2a'));
  palm(g, 60, GROUND_Y - 8, 70, 7); palm(g, 250, GROUND_Y - 8, 84, 8); palm(g, 352, GROUND_Y - 8, 64, 9);

  // --- market street (380..1140): mud-brick houses with awnings, stalls, jars and cloth
  const awnings: [RGBA, RGBA][] = [[hex('#c8282e'), hex('#f2e6b8')], [hex('#2c5aa8'), hex('#f5c542')], [hex('#3a7a4a'), hex('#f2e6b8')], [hex('#e0a82e'), hex('#8a2020')]];
  let x = 380, k = 0;
  while (x < 1130) {
    const w = 96 + Math.floor(r() * 50), h = 64 + Math.floor(r() * 30);
    const top = GROUND_Y - h;
    const x1 = Math.min(1140, x + w);
    g.rect(x, top, x1 - x, h, MUD);
    // mud brick texture
    for (let y = top + 2; y < GROUND_Y; y += 5) for (let bx = x + ((y / 5) % 2 ? 0 : 4); bx < x1; bx += 9) g.set(bx, y, MUD_D);
    for (let i = 0; i < 120; i++) { const px = x + Math.floor(r() * (x1 - x)), py = top + Math.floor(r() * h); g.set(px, py, r() > 0.5 ? MUD_L : MUD_D); }
    g.hline(x, x1 - 1, top, MUD_L); g.rect(x, top - 3, x1 - x, 3, MUD_D); // roof lip
    // roof clutter: a water jar, drying cloth
    g.ellipse(x + 14, top - 6, 4, 4, hex('#b0602e')); g.rect(x + 30, top - 8, 18, 5, awnings[k % 4][1]);
    // small high windows
    for (let wx = x + 12; wx < x1 - 14; wx += 26) { g.rect(wx, top + 10, 7, 6, hex('#1a1424')); g.hline(wx, wx + 6, top + 9, MUD_L); }
    // doorway
    const dx = x + Math.floor((x1 - x) / 2) - 8;
    g.rect(dx, GROUND_Y - 34, 16, 34, hex('#1a1424')); g.rect(dx - 2, GROUND_Y - 36, 20, 3, STONE);
    // striped awning over a stall front
    const [a, b] = awnings[k % 4];
    const ax0 = x + 6, ax1 = x1 - 6, ay = GROUND_Y - 46;
    for (let ax = ax0; ax < ax1; ax++) {
      const col = Math.floor((ax - ax0) / 6) % 2 ? a : b;
      g.vline(ax, ay, ay + 8 + ((ax - ax0) % 6 === 3 ? 2 : 0), col);
    }
    g.hline(ax0, ax1 - 1, ay, mix(a, P.ink, 0.3));
    g.vline(ax0 + 1, ay + 8, GROUND_Y - 1, hex('#5a3a22')); g.vline(ax1 - 2, ay + 8, GROUND_Y - 1, hex('#5a3a22'));
    // goods under the awning: jars, baskets, hanging cloth
    for (let jx = ax0 + 6; jx < ax1 - 8; jx += 14) {
      const kind = Math.floor(r() * 3);
      if (kind === 0) { g.ellipse(jx, GROUND_Y - 8, 5, 6, hex('#b0602e')); g.rect(jx - 2, GROUND_Y - 16, 5, 3, hex('#8a4422')); g.set(jx - 2, GROUND_Y - 10, hex('#e8a070')); }
      else if (kind === 1) { g.rect(jx - 5, GROUND_Y - 9, 11, 8, hex('#b08a4a')); for (let yy = GROUND_Y - 8; yy < GROUND_Y - 1; yy += 2) g.hline(jx - 5, jx + 5, yy, hex('#8a6a34')); g.ellipse(jx, GROUND_Y - 10, 4, 2, [hex('#c8282e'), hex('#e0a82e'), hex('#4a8a3a')][Math.floor(r() * 3)]); }
      else { g.rect(jx - 3, ay + 9, 6, 16, awnings[(k + 1) % 4][0]); g.hline(jx - 3, jx + 2, ay + 24, awnings[(k + 1) % 4][1]); }
    }
    x = x1 + 4 + Math.floor(r() * 6);
    k++;
  }
  dusk(g, 380, 30, 1140, GROUND_Y, 0.42);

  // --- open quay (1140..1420): parapet over the river, a palm, a big moored boat's prow
  for (let qx = 1140; qx < 1420; qx++) g.vline(qx, GROUND_Y - 14, GROUND_Y - 1, qx % 20 < 1 ? STONE_D : STONE);
  g.hline(1140, 1419, GROUND_Y - 14, STONE_L);
  for (let qx = 1150; qx < 1420; qx += 40) { g.rect(qx, GROUND_Y - 22, 8, 8, STONE); g.hline(qx, qx + 7, GROUND_Y - 22, STONE_L); }
  palm(g, 1200, GROUND_Y - 12, 80, 21); palm(g, 1380, GROUND_Y - 12, 70, 22);
  // prow of a moored reed boat, curling up
  g.curve(1250, GROUND_Y - 16, 1290, GROUND_Y - 20, 1306, GROUND_Y - 44, hex('#b08a4a'), 4);
  g.curve(1252, GROUND_Y - 14, 1290, GROUND_Y - 18, 1308, GROUND_Y - 40, hex('#8a6a34'), 1);
  dusk(g, 1140, 30, 1420, GROUND_Y, 0.3);

  // --- temple colonnade (1420..1980): columns with lotus tops, painted bands (patterns, not real writing)
  const cTop = 34;
  g.rect(1420, cTop, 560, 12, STONE); g.hline(1420, 1979, cTop, STONE_L); g.hline(1420, 1979, cTop + 11, STONE_D);
  for (let bx = 1424; bx < 1976; bx += 8) { g.rect(bx, cTop + 3, 4, 2, P.blue); g.set(bx + 2, cTop + 7, P.goldMid); }
  // back wall in shadow between the columns, with painted water lines and sun discs
  g.rect(1420, cTop + 12, 560, GROUND_Y - cTop - 12, hex('#5a4a3a'));
  for (let y = cTop + 30; y < GROUND_Y - 10; y += 22) for (let wx = 1424; wx < 1976; wx += 3) g.set(wx, y + Math.round(Math.sin(wx / 3) * 1.5), hex('#3a6aa0'));
  for (let sx = 1450; sx < 1970; sx += 70) { g.circle(sx, cTop + 22, 4, P.goldMid); g.hline(sx - 9, sx - 5, cTop + 22, P.goldDark); g.hline(sx + 5, sx + 9, cTop + 22, P.goldDark); }
  for (let cx = 1440; cx < 1980; cx += 60) {
    g.rect(cx - 8, cTop + 12, 16, GROUND_Y - cTop - 12, STONE);
    g.vline(cx - 8, cTop + 12, GROUND_Y - 1, STONE_L); g.vline(cx + 7, cTop + 12, GROUND_Y - 1, STONE_D);
    // lotus capital
    g.poly([[cx - 12, cTop + 12], [cx + 12, cTop + 12], [cx + 8, cTop + 22], [cx - 8, cTop + 22]], STONE_L);
    for (let lx = cx - 10; lx <= cx + 10; lx += 4) g.vline(lx, cTop + 13, cTop + 20, hex('#3a7a5a'));
    // painted bands on the shaft
    for (const by of [cTop + 40, cTop + 70]) { g.hline(cx - 7, cx + 6, by, P.blue); g.hline(cx - 7, cx + 6, by + 2, P.goldMid); g.hline(cx - 7, cx + 6, by + 4, hex('#a83a2a')); }
    g.rect(cx - 10, GROUND_Y - 6, 20, 6, STONE_D);
  }
  dusk(g, 1420, cTop - 2, 1980, GROUND_Y, 0.45, [[1640, 100, 140]]);

  // --- temple gate and the old pyramid (1980..2560)
  // the pyramid rises behind the gate (the boss arena backdrop)
  const pcx = 2330;
  pyramid(g, pcx, GROUND_Y - 4, 132, P.goldHi, P.goldDark, 6);
  // two tapered pylon towers flanking the gate
  for (const [px0, px1] of [[1996, 2120], [2300, 2424]]) {
    g.poly([[px0, GROUND_Y], [px1, GROUND_Y], [px1 - 12, 40], [px0 + 12, 40]], STONE);
    g.hline(px0 + 12, px1 - 12, 40, STONE_L); g.rect(px0 + 10, 34, px1 - px0 - 20, 6, STONE_L);
    g.vline(px0 + 12, 40, GROUND_Y, STONE_L);
    // painted water lines and a big sun disc with wings
    const mx = (px0 + px1) / 2;
    g.circle(mx, 62, 7, P.gold); g.circle(mx, 62, 4, P.goldHi);
    for (let wx = 1; wx < 26; wx++) { g.set(mx - 8 - wx, 62 - Math.round(wx / 6), P.blue); g.set(mx + 8 + wx, 62 - Math.round(wx / 6), P.blue); g.set(mx - 8 - wx, 63, P.goldMid); g.set(mx + 8 + wx, 63, P.goldMid); }
    for (let y = 80; y < GROUND_Y - 8; y += 12) for (let wx = px0 + 18; wx < px1 - 18; wx += 3) g.set(wx, y + Math.round(Math.sin(wx / 3) * 1.5), hex('#3a6aa0'));
    // flagpoles with banners
    g.vline(px0 + 6, 14, GROUND_Y, hex('#5a3a22'));
    g.rect(px0 + 7, 16, 10, 22, hex('#c8282e'));
  }
  // gate opening between the towers shows the pyramid's base
  g.rect(2120, 70, 180, 6, STONE); g.hline(2120, 2299, 70, STONE_L);
  g.rect(2120, 76, 180, 8, P.blue); for (let gx = 2122; gx < 2298; gx += 6) g.rect(gx, 78, 3, 3, P.gold);
  // obelisks
  for (const ox of [1990, 2440]) {
    g.poly([[ox, GROUND_Y], [ox + 12, GROUND_Y], [ox + 9, 30], [ox + 3, 30]], STONE_L);
    g.poly([[ox + 3, 30], [ox + 9, 30], [ox + 6, 22]], P.gold);
    for (let y = 40; y < GROUND_Y - 6; y += 9) g.rect(ox + 5, y, 2, 4, STONE_D);
  }
  // steps to the gate
  for (let s = 0; s < 4; s++) g.rect(2112 - s * 4, GROUND_Y - 4 * (4 - s), 196 + s * 8, 4, s % 2 ? STONE : STONE_L);
  dusk(g, 1980, 0, W, GROUND_Y, 0.3, [[2330, 70, 160]]);

  // torch brackets on the walls (the flames are animated sprites placed by the mission)
  for (const tx of [520, 820, 1100, 1470, 1710, 1950, 2140, 2280]) { g.rect(tx - 1, GROUND_Y - 50, 3, 10, hex('#3a2a1a')); g.rect(tx - 3, GROUND_Y - 52, 7, 3, hex('#5a4026')); }
  // base shadow along the whole wall
  g.rect(0, GROUND_Y - 3, W, 3, hex('#2a1c24'));
  return g;
}

// ------------------------------------------------------------------ ground: sand on the bank, paving through town, polished stone at the temple
export function groundLayer2(): Pix {
  const W = LEVEL2_W, g = new Pix(W, 216);
  const r = rng(241);
  for (let y = GROUND_Y; y < 216; y++) {
    const t = (y - GROUND_Y) / 70;
    g.hline(0, W - 1, y, mix(hex('#6a5a5a'), hex('#8a6a48'), t));
  }
  // paving stones from 380 on, with perspective joints
  for (let y = GROUND_Y + 2, row = 0; y < 216; row++) {
    const h = 6 + Math.floor(row * 1.6);
    for (let x = 380 - (row % 2) * 14; x < W; x += 28) {
      g.hline(Math.max(380, x), Math.min(W - 1, x + 27), y, hex('#4a3c40'));
      if (x >= 380) g.vline(x, y, Math.min(215, y + h), hex('#4a3c40'));
    }
    y += h;
  }
  // sand on the riverbank, drifting into the street
  for (let x = 0; x < 460; x++) for (let y = GROUND_Y; y < 216; y++) {
    const edge = 380 + Math.sin(y / 7) * 20 + (y - GROUND_Y) * 0.6;
    if (x < edge) g.set(x, y, mix(SAND_D, SAND, 0.3 + 0.3 * Math.sin(x / 17 + y / 9)));
  }
  // grain and sand ripples
  for (let i = 0; i < 6000; i++) {
    const x = Math.floor(r() * W), y = GROUND_Y + Math.floor(r() * 70);
    g.set(x, y, r() > 0.5 ? [255, 230, 180, 30] : [0, 0, 0, 40]);
  }
  for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 360), y = GROUND_Y + 6 + Math.floor(r() * 60); g.hline(x, x + 8, y, SAND_L); }
  // temple floor: big polished slabs with a gold inlay line
  for (let x = 1980; x < W; x++) for (let y = GROUND_Y; y < 216; y++) {
    const c = g.get(x, y)!; g.set(x, y, mix(c, STONE, 0.35) as RGBA);
  }
  g.hline(1980, W - 1, GROUND_Y + 30, P.goldDark); g.hline(1980, W - 1, GROUND_Y + 31, P.goldMid);
  // twilight over everything
  for (let y = GROUND_Y; y < 216; y++) for (let x = 0; x < W; x++) { const c = g.get(x, y)!; g.set(x, y, mix(c, TWILIGHT, 0.38) as RGBA); }
  // curb / quay edge
  g.hline(0, W - 1, GROUND_Y, hex('#8e7a58')); g.hline(0, W - 1, GROUND_Y + 1, hex('#5a4a3a'));
  return g;
}

// ------------------------------------------------------------------ props
// Reflecting pool where Nia appears (4 frames of shimmer)
export function poolFrames(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(96, 26);
    g.ellipse(48, 13, 46, 11, STONE_D); g.ellipse(48, 12, 45, 10, STONE);
    g.ellipse(48, 13, 40, 8, hex('#1a2a58'));
    g.ellipse(48, 13, 38, 7, mix(hex('#1a2a58'), NILE_L, 0.35 + 0.15 * Math.sin((f / 4) * Math.PI * 2)));
    for (let i = 0; i < 5; i++) { const x = 20 + ((i * 13 + f * 5) % 56); g.hline(x, x + 5, 10 + (i % 3) * 3, i % 2 ? P.goldHi : NILE_HI); }
    if (f === 2) drawSparkle(g, 64, 9, 1);
    return g;
  });
}

export function mudPit(): Pix {
  const g = new Pix(40, 12);
  const r = rng(251);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 40; x++) {
    const dx = (x - 20) / 20, dy = (y - 6) / 6;
    const d = dx * dx + dy * dy + (r() - 0.5) * 0.15;
    if (d < 1) g.set(x, y, d > 0.75 ? hex('#6a4a2e') : d > 0.45 ? hex('#3a2816') : hex('#2a3a5a'));
  }
  g.hline(14, 22, 6, hex('#4a6a9a')); g.set(24, 5, hex('#9fc0e6'));
  return g;
}

// Clay urn: breaks open for bread, dates or a MEMPHYS can
export function urnFrames(): Pix[] {
  const mk = (broken: boolean) => {
    const g = new Pix(20, 28);
    const c = hex('#b0602e'), cd = hex('#7a3a1a'), cl = hex('#d88a52');
    if (!broken) {
      g.ellipse(10, 16, 8, 10, c);
      g.rect(6, 2, 8, 5, c); g.rect(5, 1, 10, 2, cd);
      g.vline(5, 10, 22, cl); g.vline(15, 10, 22, cd);
      g.hline(3, 17, 13, hex('#2a4a9a')); g.hline(3, 17, 15, P.goldMid);
      for (let x = 4; x < 17; x += 3) g.set(x, 14, P.gold);
    } else {
      g.ellipse(10, 21, 8, 5, c);
      g.poly([[2, 21], [5, 14], [8, 18], [11, 12], [14, 17], [18, 21]], c);
      g.hline(3, 17, 20, cd);
    }
    g.outline(P.ink);
    return g;
  };
  return [mk(false), mk(true)];
}

// Market bench with baskets of fruit (solid, stand on it like the picnic tables)
export function marketBench(): Pix {
  const g = new Pix(48, 24);
  const wood = hex('#8a6a3a'), woodD = hex('#5a4026');
  g.rect(2, 8, 44, 3, wood); g.hline(2, 45, 8, hex('#aa8a52'));
  g.rect(4, 11, 3, 12, woodD); g.rect(41, 11, 3, 12, woodD);
  for (const [bx, fc] of [[10, hex('#c8282e')], [24, hex('#e0a82e')], [38, hex('#4a8a3a')]] as const) {
    g.rect(bx - 5, 2, 11, 6, hex('#b08a4a')); g.hline(bx - 5, bx + 5, 4, hex('#8a6a34'));
    for (let fx = bx - 4; fx <= bx + 4; fx += 2) g.set(fx, 1, fc);
    g.set(bx, 0, fc);
  }
  g.outline(P.ink);
  return g;
}

// The vendor's stall, behind him
export function stallProp(): Pix {
  const g = new Pix(80, 64);
  const wood = hex('#7a5a32');
  g.vline(4, 10, 63, wood); g.vline(5, 10, 63, wood); g.vline(74, 10, 63, wood); g.vline(75, 10, 63, wood);
  for (let x = 0; x < 80; x++) g.vline(x, 6, 14 + (x % 10 === 5 ? 2 : 0), Math.floor(x / 10) % 2 ? hex('#2c5aa8') : hex('#f5c542'));
  g.hline(0, 79, 6, hex('#1c3f84'));
  g.rect(6, 40, 68, 20, hex('#8a6a3a')); g.hline(6, 73, 40, hex('#aa8a52'));
  for (let x = 10; x < 70; x += 12) { g.ellipse(x + 4, 38, 5, 3, hex('#6a3a1a')); for (let d = -3; d <= 3; d += 2) g.set(x + 4 + d, 37, hex('#9a5a2a')); }
  // a little price sign with dots (copper rings)
  g.rect(56, 22, 14, 10, hex('#e2d2aa')); g.circle(60, 27, 2, hex('#b86a2e')); g.circle(66, 27, 2, hex('#b86a2e'));
  g.outline(P.ink);
  return g;
}

export function torchFrames(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(16, 24);
    const h = [9, 11, 10, 12][f], w = [3, 4, 3, 4][f];
    g.ellipse(8, 18 - h / 2, w + 2, h / 2 + 2, [255, 170, 60, 60]);
    g.ellipse(8, 19 - h / 2, w, h / 2, hex('#f08a2a'));
    g.ellipse(8, 20 - h / 3, w - 1, h / 3, hex('#ffd46a'));
    g.set(8 + (f % 2 ? 1 : -1), 18 - h, hex('#fff1a8'));
    g.rect(6, 20, 5, 3, hex('#3a2a1a'));
    return g;
  });
}

// Thrown clay pot (4 frames of spin)
export function potProj(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(12, 12);
    g.ellipse(6, 6, 4, 4, hex('#b0602e'));
    const a = (f * Math.PI) / 2;
    g.rect(6 + Math.round(Math.cos(a) * 3) - 1, 6 + Math.round(Math.sin(a) * 3) - 1, 3, 3, hex('#7a3a1a'));
    g.set(5, 4, hex('#e8a070'));
    g.outline(P.ink);
    return g;
  });
}

export function breadPlate(): Pix {
  const g = new Pix(20, 14);
  g.ellipse(10, 9, 9, 3, hex('#8a6a3a')); g.ellipse(10, 8, 9, 3, hex('#b08a4a'));
  g.ellipse(9, 6, 6, 3, hex('#d8a050')); g.hline(5, 13, 5, hex('#f0c070'));
  for (const x of [6, 9, 12]) g.set(x, 6, hex('#9a6a2a'));
  g.ellipse(15, 6, 2, 2, hex('#7a2a5a')); g.set(14, 5, hex('#c86aa0')); // a fig
  g.outline(P.ink);
  return g;
}

export function datesBowl(): Pix {
  const g = new Pix(20, 14);
  g.ellipse(10, 9, 8, 4, hex('#b0602e')); g.hline(3, 17, 8, hex('#d88a52'));
  for (const [x, y] of [[6, 6], [9, 5], [12, 5], [14, 6], [8, 7], [11, 7]]) { g.ellipse(x, y, 2, 1, hex('#6a2a14')); g.set(x - 1, y, hex('#9a4a24')); }
  g.outline(P.ink);
  return g;
}

export function grillProp(): Pix {
  const g = new Pix(14, 8);
  g.rect(2, 2, 10, 4, P.gold);
  g.hline(2, 11, 2, P.goldHi);
  for (let x = 4; x < 12; x += 2) g.vline(x, 3, 5, P.goldDark);
  g.outline(P.ink);
  drawSparkle(g, 11, 1, 1);
  return g;
}

// The golden jar: open (lid lifted) and sealed
export function jarFrames(): Pix[] {
  const mk = (sealed: boolean) => {
    const g = new Pix(32, 40);
    g.ellipse(16, 26, 12, 12, P.gold);
    g.ellipse(13, 23, 6, 8, P.goldHi);
    g.ellipse(20, 30, 5, 6, P.goldMid);
    g.rect(10, 8, 12, 8, P.gold); g.rect(9, 7, 14, 2, P.goldDark);
    g.hline(5, 27, 24, P.blue); g.hline(5, 27, 27, P.blue);
    for (let x = 6; x < 27; x += 4) { g.set(x, 25, P.goldDark); g.set(x + 1, 26, P.ink); }
    const ly = sealed ? 3 : -2;
    if (ly >= 0) { g.ellipse(16, ly + 2, 8, 2, P.goldMid); g.rect(14, ly - 2, 4, 3, P.goldHi); }
    if (sealed) g.hline(9, 22, 6, hex('#7a3a1a'));
    g.outline(P.ink);
    return g;
  };
  return [mk(false), mk(true)];
}

// A war chariot pulled by a horse, driven by a jackal guard. No real-world marks. Nose to the right, 128x48.
export function chariotFrames(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(128, 48);
    const horse = hex('#3a2a24'), horseL = hex('#5a4434'), horseD = hex('#241812');
    // horse body
    g.ellipse(92, 22, 16, 7, horse);
    g.hline(80, 104, 17, horseL);
    // neck + head
    g.poly([[100, 20], [108, 8], [114, 8], [108, 22]], horse);
    g.poly([[108, 8], [120, 11], [121, 15], [112, 15]], horse);
    g.set(117, 11, P.ink); g.set(120, 14, horseD);
    g.line(106, 7, 104, 3, horseD, 2); // ear
    // mane plume (gold)
    g.line(102, 12, 108, 4, P.gold, 2); g.line(108, 4, 106, 0, P.goldHi);
    // legs: alternate between frames
    const legs = f === 0 ? [[80, -4], [86, 4], [100, 5], [106, -5]] : [[80, 4], [86, -4], [100, -5], [106, 5]];
    for (const [lx, sw] of legs) { g.line(lx, 27, lx + sw, 41, horse, 2); g.rect(lx + sw - 1, 41, 3, 2, horseD); }
    g.line(76, 21, 70, 30 + (f ? 2 : -1), horseD, 2); // tail
    // harness pole to the chariot
    g.line(40, 32, 84, 24, hex('#6a4a2a'), 2);
    g.hline(84, 100, 20, P.gold);
    // chariot box
    g.poly([[18, 16], [44, 16], [46, 34], [16, 34]], hex('#b07a3a'));
    g.hline(18, 44, 16, P.gold); g.hline(16, 46, 33, hex('#6a4a2a'));
    for (let x = 22; x < 44; x += 6) g.set(x, 24, P.blue);
    // driver: a jackal guard leaning in, reins out to the horse
    g.circle(34, 6, 4, hex('#1e1c24')); g.poly([[36, 4], [43, 7], [36, 9]], hex('#1e1c24'));
    g.poly([[32, 3], [33, -1], [34, 3]], hex('#1e1c24')); g.set(37, 5, P.gold);
    g.rect(28, 9, 9, 8, P.skin2); g.ellipse(32, 10, 5, 2, P.gold);
    g.line(36, 12, 106, 12, hex('#3a2414'));
    // big six-spoke wheel
    const wx = 30, wy = 36;
    g.circle(wx, wy, 11, hex('#5a3a1a')); g.circle(wx, wy, 9, [0, 0, 0, 0]);
    for (let a = 0; a < 360; a += 3) { const rad = (a * Math.PI) / 180; g.set(wx + Math.round(Math.cos(rad) * 10), wy + Math.round(Math.sin(rad) * 10), hex('#7a5a2a')); }
    const a0 = f * (Math.PI / 6);
    for (let s = 0; s < 6; s++) { const a = a0 + (s * Math.PI) / 3; g.line(wx, wy, wx + Math.round(Math.cos(a) * 9), wy + Math.round(Math.sin(a) * 9), hex('#8a6a3a')); }
    g.circle(wx, wy, 2, P.gold);
    g.outline(P.ink);
    return g;
  });
}

// ------------------------------------------------------------------ Nia's memory: the throne hall, gold on navy, like an old painting
export function memoryHall(): Pix {
  const W = 480, g = new Pix(W, 216);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#1a1840'), hex('#3a2a40'), y / 216));
  // columns
  for (let cx = 30; cx < W; cx += 84) {
    g.rect(cx - 10, 20, 20, 150, hex('#4a3a40'));
    g.vline(cx - 10, 20, 169, hex('#6a5a50')); g.vline(cx + 9, 20, 169, hex('#2a2030'));
    g.poly([[cx - 15, 20], [cx + 15, 20], [cx + 10, 32], [cx - 10, 32]], hex('#6a5a50'));
    for (const by of [60, 100, 140]) { g.hline(cx - 9, cx + 8, by, P.goldDark); g.hline(cx - 9, cx + 8, by + 2, hex('#2a4a8a')); }
  }
  // throne dais in the middle
  for (let s = 0; s < 4; s++) g.rect(170 - s * 10, 150 + s * 5, 140 + s * 20, 5, s % 2 ? hex('#5a4a40') : hex('#6a5a4a'));
  g.rect(222, 96, 36, 54, P.goldDark); g.rect(226, 100, 28, 40, hex('#2a4a8a')); g.rect(218, 92, 44, 6, P.gold);
  // floor
  for (let y = 170; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#4a3a3a'), hex('#2a2030'), (y - 170) / 46));
  for (let x = 0; x < W; x += 30) g.line(x, 170, x + (x - W / 2) * 0.3, 215, hex('#3a2a30'));
  // a sun window high up: the light falls on the dais
  g.circle(240, 30, 12, P.goldMid); g.circle(240, 30, 8, P.goldHi);
  for (let y = 42; y < 170; y++) { const w = Math.round((y - 42) * 0.45); for (let x = 240 - w; x <= 240 + w; x++) g.set(x, y, [255, 230, 150, 22]); }
  // old-painting grain + vignette
  const r = rng(261);
  for (let i = 0; i < 3000; i++) g.set(Math.floor(r() * W), Math.floor(r() * 216), [255, 220, 150, 14]);
  for (let y = 0; y < 216; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 240) / 240, (y - 108) / 120);
    if (d > 0.75) g.set(x, y, [10, 6, 20, Math.round(Math.min(1, (d - 0.75) / 0.4) * 200)]);
  }
  return g;
}

// ------------------------------------------------------------------ the pull-back: same city, 3,000 years apart.
// Both panoramas share one layout: the river bends through the same place and the pyramid stands on the same spot.
const riverY = (x: number) => 150 + Math.sin(x / 90) * 10 + (x - 240) * 0.05;
const PYR_X = 330, PYR_BASE = 138, PYR_H = 58;

export function panOld(): Pix {
  const W = 480, g = new Pix(W, 216);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, y < 130 ? mix(NIGHT, HORIZON, y / 130) : mix(SAND_D, hex('#3a2a40'), 0.4));
  const r = rng(271);
  for (let i = 0; i < 70; i++) g.set(Math.floor(r() * W), Math.floor(r() * 80), hex('#ffe9a0'));
  // the old city on the near bank: flat roofs and temple
  for (let x = 20; x < 300; x += 18 + Math.floor(r() * 10)) { const h = 8 + Math.floor(r() * 10); g.rect(x, PYR_BASE - h, 14, h, mix(MUD, TWILIGHT, 0.45)); g.hline(x, x + 13, PYR_BASE - h, mix(MUD_L, TWILIGHT, 0.3)); }
  g.poly([[150, PYR_BASE], [190, PYR_BASE], [184, PYR_BASE - 26], [156, PYR_BASE - 26]], mix(STONE, TWILIGHT, 0.4));
  pyramid(g, PYR_X, PYR_BASE, PYR_H);
  for (let x = 380; x < 470; x += 22) palm(g, x, PYR_BASE, 20 + Math.floor(r() * 8), 280 + x, true);
  // the Nile bending across the bottom
  for (let x = 0; x < W; x++) { const y0 = Math.round(riverY(x)); for (let y = y0; y < y0 + 26; y++) g.set(x, y, mix(NILE, NILE_L, (y - y0) / 26)); }
  for (let i = 0; i < 40; i++) { const x = Math.floor(r() * W); const y = Math.round(riverY(x)) + 3 + Math.floor(r() * 20); g.hline(x, x + 6, y, r() > 0.5 ? P.goldHi : NILE_HI); }
  felucca(g, 120, Math.round(riverY(120)) + 10);
  return g;
}

export function panNew(): Pix {
  const W = 480, g = new Pix(W, 216);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, y < 130 ? mix(hex('#070a1c'), hex('#1c2550'), y / 130) : hex('#141a3a'));
  const r = rng(281);
  for (let i = 0; i < 50; i++) g.set(Math.floor(r() * W), Math.floor(r() * 70), hex('#c8d0ff', 200));
  // downtown towers on the same bank
  for (const [x, w, h] of [[30, 22, 50], [58, 18, 70], [84, 28, 58], [120, 20, 86], [146, 26, 64], [180, 18, 74], [206, 24, 52], [236, 16, 40]]) {
    g.rect(x, PYR_BASE - h, w, h, hex('#1a1f40'));
    for (let wy = PYR_BASE - h + 4; wy < PYR_BASE - 2; wy += 4) for (let wx = x + 3; wx < x + w - 2; wx += 4) if (r() > 0.5) g.rect(wx, wy, 2, 2, r() > 0.8 ? hex('#f2b950') : hex('#a8783a'));
  }
  // the glass pyramid, same spot, same size
  for (let k = 0; k < PYR_H; k++) {
    const y = PYR_BASE - PYR_H + k;
    g.hline(PYR_X - k, PYR_X, y, mix(hex('#c8d4e8'), hex('#6a7aa0'), k / PYR_H));
    g.hline(PYR_X + 1, PYR_X + k, y, mix(hex('#8a9ac0'), hex('#3a4670'), k / PYR_H));
    if (k % 6 === 0 && k) g.hline(PYR_X - k, PYR_X + k, y, hex('#4a5680'));
  }
  g.set(PYR_X, PYR_BASE - PYR_H, P.white);
  // the Mississippi in the same bend
  for (let x = 0; x < W; x++) { const y0 = Math.round(riverY(x)); for (let y = y0; y < y0 + 26; y++) g.set(x, y, mix(hex('#1a2a58'), hex('#2a4a80'), (y - y0) / 26)); }
  // the bridge: two M arches with lights, crossing the river
  const by = Math.round(riverY(400)) - 2;
  for (let x = 0; x < 150; x++) {
    const t = (x % 75) / 75, h = Math.round(Math.sin(t * Math.PI) * 22);
    g.set(330 + x, by - h, hex('#5a6290'));
    if (x % 6 === 0) { g.vline(330 + x, by - h, by, hex('#3a4170')); g.set(330 + x, by - h - 1, P.white); }
  }
  g.hline(320, 479, by, hex('#5a6290')); g.hline(320, 479, by + 1, hex('#3a4170'));
  for (let i = 0; i < 40; i++) { const x = Math.floor(r() * W); const y = Math.round(riverY(x)) + 3 + Math.floor(r() * 20); g.hline(x, x + 6, y, r() > 0.5 ? hex('#f2b950', 180) : hex('#8ab0f0', 160)); }
  return g;
}
