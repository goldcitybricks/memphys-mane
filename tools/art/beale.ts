// Mission 6 "Beale Below": the flooded tunnels under Beale Street. Old brick cisterns, ghost murals of
// musicians (generic figures, no real people), AetherCorp's dig through the gray clay, the Driller mech and
// the chamber where the golden jar is wired up. Same specs as the alley: 216 tall, layers tile or span the level.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';
import { gigazFace } from './drive';

export const LEVEL6_W = 2560;
const GROUND_Y = 146;

const VOID = hex('#05060f'), DEEP = hex('#0b1024');
const BRICK = hex('#5a2e2a'), BRICK_L = hex('#7a4034'), BRICK_D = hex('#3a1c1c'), MORTAR = hex('#24161a');
const WET = hex('#5cc8ff'), WET_D = hex('#2a6ab0');
const CLAY = hex('#7a7c86'), CLAY_L = hex('#9a9ca6'), CLAY_D = hex('#55565e');
const SAND = hex('#b08a4a'), SAND_D = hex('#7a5a2e');
const SOIL = hex('#4a3426'), SOIL_D = hex('#33231a');
const STEEL = hex('#5a6070'), STEEL_L = hex('#8a92a4'), STEEL_D = hex('#363a46');
const AE_W = hex('#eef2f8'), AE_S = hex('#b8c2d4'), LED = hex('#5ce1ff');
const HAZ = hex('#f2c230'), HAZ_D = hex('#2a2430');
const PLASTER = hex('#6a5a4c'), PLASTER_D = hex('#4a3e36');

// darken everything toward the tunnel dark, except near lamps
function gloom(g: Pix, x0: number, y0: number, x1: number, y1: number, amt: number, lights: [number, number, number][] = []) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = g.get(x, y);
    if (!c || !c[3]) continue;
    let k = amt;
    for (const [lx, ly, r] of lights) k -= Math.max(0, 1 - Math.hypot(x - lx, (y - ly) * 1.1) / r) * amt * 0.85;
    g.set(x, y, mix(c, DEEP, Math.max(0, k)) as RGBA);
  }
}

function bricks(g: Pix, x0: number, y0: number, x1: number, y1: number, seed: number, bw = 12, bh = 5) {
  const r = rng(seed);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g.set(x, y, BRICK);
  for (let y = y0, row = 0; y < y1; y += bh, row++) {
    g.hline(x0, x1 - 1, y, MORTAR);
    for (let x = x0 + (row % 2 ? bw / 2 : 0); x < x1; x += bw) g.vline(Math.round(x), y, Math.min(y1 - 1, y + bh - 1), MORTAR);
    for (let x = x0; x < x1; x += bw) {
      const v = r();
      if (v > 0.8) g.rect(x + 1, y + 1, bw - 2, bh - 1, BRICK_L);
      else if (v < 0.2) g.rect(x + 1, y + 1, bw - 2, bh - 1, BRICK_D);
    }
  }
}

// a brick arch opening punched out to transparent (the far layer shows through)
function archHole(g: Pix, cx: number, top: number, w: number, bottom: number) {
  const r = w / 2;
  for (let y = top; y < bottom; y++) for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
    const dy = y - (top + r);
    if (dy < 0 && Math.hypot(x - cx, dy) > r) continue;
    g.clear(x, y);
  }
  // voussoirs around the curve
  for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.16) {
    const x = cx + Math.cos(a) * (r + 2), y = top + r + Math.sin(a) * (r + 2);
    g.line(cx + Math.cos(a) * r, top + r + Math.sin(a) * r, x + Math.cos(a) * 3, y + Math.sin(a) * 3, BRICK_L, 1);
  }
  for (let y = top + r; y < bottom; y++) { g.set(Math.round(cx - r - 1), y, BRICK_L); g.set(Math.round(cx + r + 1), y, BRICK_D); }
}

function drip(g: Pix, x: number, y: number, len: number) {
  for (let k = 0; k < len; k++) g.set(x, y + k, [92, 200, 255, 200 - k * 10]);
  g.set(x, y + len + 1, WET);
}

function bulb(g: Pix, x: number, y: number) {
  g.vline(x, 0, y - 3, P.ink);
  g.circle(x, y, 2, hex('#ffd46a')); g.set(x, y - 1, P.white);
  g.ellipse(x, y + 2, 9, 7, [255, 200, 90, 40]);
}

function workLight(g: Pix, x: number, y: number) {
  g.rect(x - 4, y - 3, 9, 5, STEEL_D); g.rect(x - 3, y - 2, 7, 3, hex('#e8f8ff'));
  g.vline(x, y + 2, GROUND_Y - 1, STEEL_D);
  g.hline(x - 5, x + 5, GROUND_Y - 1, STEEL_D);
}

// A mural panel: the musician painted in faded colors on plaster (lit up later by the ghost sprite).
function mural(g: Pix, x: number, top: number, fig: Pix, seed: number) {
  const r = rng(seed);
  const w = 70, h = 92;
  g.rect(x - w / 2, top, w, h, PLASTER);
  for (let i = 0; i < 260; i++) g.set(x - w / 2 + Math.floor(r() * w), top + Math.floor(r() * h), r() > 0.5 ? PLASTER_D : hex('#7a6a5a'));
  // painted backdrop: a sunset band and music notes
  for (let y = top + 6; y < top + h - 6; y++) g.hline(x - w / 2 + 5, x + w / 2 - 6, y, mix(hex('#3a2a5a'), hex('#8a4a3a'), (y - top) / h));
  for (const [nx, ny] of [[-24, 16], [20, 12], [24, 34], [-26, 44]]) { g.circle(x + nx, top + ny + 4, 2, hex('#c8a060')); g.vline(x + nx + 2, top + ny - 3, top + ny + 4, hex('#c8a060')); }
  // the figure, painted (scaled up 1.25 to match the ghost)
  const s = 1.25;
  for (let yy = 0; yy < fig.h * s; yy++) for (let xx = 0; xx < fig.w * s; xx++) {
    const c = fig.get(Math.floor(xx / s), Math.floor(yy / s))!;
    if (!c[3]) continue;
    const lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
    g.set(x - (fig.w * s) / 2 + xx, top + h - 2 - fig.h * s + yy + 4, mix(hex('#2a1e30'), hex('#d8b890'), lum * 0.9));
  }
  // flaking edges and a frame
  g.rect(x - w / 2 - 2, top - 2, w + 4, 2, BRICK_D); g.rect(x - w / 2 - 2, top + h, w + 4, 2, BRICK_D);
  for (let i = 0; i < 20; i++) { const ex = x - w / 2 + Math.floor(r() * w); g.rect(ex, top + (r() > 0.5 ? 0 : h - 3), 3, 3, BRICK); }
}

function strata(g: Pix, x0: number, x1: number, seed: number) {
  // the cross-section of the ground: soil, the gray clay that shields the aquifer, then the water-filled sand
  const r = rng(seed);
  for (let x = x0; x < x1; x++) {
    const wob = Math.round(Math.sin(x / 37) * 3 + Math.sin(x / 11) * 1);
    for (let y = 22; y < GROUND_Y; y++) {
      let c: RGBA;
      if (y < 48 + wob) c = (x + y) % 7 === 0 ? SOIL_D : SOIL;
      else if (y < 84 + wob) { const n = Math.sin(x / 7 + y * 0.9) * Math.sin(x / 3.1 - y / 2.3); c = y === 48 + wob || y === 83 + wob ? CLAY_D : n > 0.55 ? CLAY_L : n < -0.6 ? CLAY_D : CLAY; }
      else c = mix(SAND, SAND_D, ((y - 84) / 60) * 0.6);
      g.set(x, y, c);
    }
  }
  // sand grains with water glinting between them (the aquifer)
  for (let i = 0; i < (x1 - x0) * 3; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0)), y = 90 + Math.floor(r() * (GROUND_Y - 92));
    g.set(x, y, r() > 0.55 ? hex('#5cc8ff', 200) : SAND_D);
  }
  // pebbles in the soil
  for (let i = 0; i < (x1 - x0) / 6; i++) g.ellipse(x0 + Math.floor(r() * (x1 - x0)), 28 + Math.floor(r() * 16), 2, 1, hex('#6a5a4a'));
}

// a breach: a crack through the gray clay where shallow water leaks down
function clayCrack(g: Pix, x: number, seed: number) {
  const r = rng(seed);
  let cx = x;
  for (let y = 44; y < 92; y++) {
    cx += Math.round((r() - 0.5) * 3);
    g.set(cx, y, P.ink); g.set(cx + 1, y, mix(P.ink, CLAY_D, 0.5));
    if (y % 3 === 0) g.set(cx + 1, y, [92, 200, 255, 220]);
  }
  for (let k = 0; k < 4; k++) drip(g, cx + k - 2, 92 + k * 4, 4);
}

// ------------------------------------------------------------------ sky: the deep dark beyond the arches, glowing water veins
export function skyLayer6(): Pix {
  const W = 768, g = new Pix(W, 216);
  const r = rng(601);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(VOID, DEEP, Math.min(1, y / 160)));
  // the aquifer glowing far away: veins of light
  for (let k = 0; k < 9; k++) {
    let x = Math.floor(r() * W), y = 40 + Math.floor(r() * 110);
    for (let i = 0; i < 60; i++) {
      x += Math.round((r() - 0.3) * 3); y += Math.round((r() - 0.5) * 2);
      g.set(((x % W) + W) % W, y, r() > 0.85 ? hex('#fff1a8', 160) : hex('#3a8ad8', 120));
    }
  }
  for (let i = 0; i < 90; i++) g.set(Math.floor(r() * W), Math.floor(r() * 200), hex('#5cc8ff', 40 + Math.floor(r() * 80)));
  return g;
}

// ------------------------------------------------------------------ far: brick arches receding, old pipes, black water
export function farLayer6(): Pix {
  const W = 960, g = new Pix(W, 216);
  const r = rng(611);
  // receding tunnel mouths, each one darker
  for (let k = 0; k < 6; k++) {
    const cx = 80 + k * 160, w = 90, top = 46;
    for (let y = top; y < 140; y++) for (let x = cx - w / 2 - 8; x < cx + w / 2 + 8; x++) {
      const dy = y - (top + w / 2);
      const inArch = dy >= 0 || Math.hypot(x - cx, dy) < w / 2;
      const ring = dy >= 0 ? Math.abs(Math.abs(x - cx) - w / 2) < 6 : Math.abs(Math.hypot(x - cx, dy) - w / 2) < 6;
      if (ring) g.set(x, y, (Math.floor(x / 6) + Math.floor(y / 4)) % 2 ? hex('#2a1a20') : hex('#341e22'));
      else if (inArch) {
        // inner arches getting smaller toward the vanishing point
        const d = Math.max(Math.abs(x - cx) / (w / 2), dy < 0 ? Math.hypot(x - cx, dy) / (w / 2) : 0);
        g.set(x, y, mix(VOID, hex('#1a1424'), d));
        if (Math.abs(d - 0.6) < 0.03 || Math.abs(d - 0.35) < 0.04) g.set(x, y, hex('#24182a'));
      }
    }
    // a faint lamp deep inside one of them
    if (k % 2 === 0) { g.circle(cx + 6, 86, 1, hex('#ffd46a')); g.ellipse(cx + 6, 88, 6, 4, [255, 200, 90, 30]); }
  }
  // walls between the mouths
  for (let y = 20; y < 140; y++) for (let x = 0; x < W; x++) if (!g.get(x, y)![3]) g.set(x, y, (Math.floor(x / 8) + Math.floor(y / 4) * 3) % 5 === 0 ? hex('#1e1218') : hex('#26161c'));
  // old pipes along the top
  for (const [y, c] of [[24, hex('#3a3a46')], [30, hex('#4a3a2a')]] as const) { g.hline(0, W - 1, y, c); g.hline(0, W - 1, y + 1, c); g.hline(0, W - 1, y + 2, mix(c, P.ink, 0.5)); }
  for (let x = 40; x < W; x += 120) { g.rect(x, 22, 4, 12, hex('#2a2a34')); }
  // black water with lamp glints
  for (let y = 132; y < 150; y++) g.hline(0, W - 1, y, mix(hex('#0a1430'), hex('#123060'), (y - 132) / 18));
  for (let i = 0; i < 60; i++) { const x = Math.floor(r() * W), y = 134 + Math.floor(r() * 14); g.hline(x, Math.min(W - 1, x + 2 + Math.floor(r() * 6)), y, r() > 0.6 ? hex('#ffd46a', 110) : hex('#5cc8ff', 110)); }
  for (let y = 0; y < 20; y++) g.hline(0, W - 1, y, VOID);
  return g;
}

// ------------------------------------------------------------------ the playfield wall, left to right:
// the old cistern under the manhole (0..640), Echo Hall with the murals (640..1260), AetherCorp's dig through
// the clay (1260..1960), the drilled chamber where the Driller waits and the jar is wired up (1960..2560).
export function wallLayer6(murals: { blues: Pix; soul: Pix; rock: Pix }): Pix {
  const W = LEVEL6_W, g = new Pix(W, 216);
  const r = rng(631);

  // --- the old cistern: brick, a vaulted ceiling, the ladder down from the manhole, two arches to the far tunnels
  bricks(g, 0, 0, 1260, GROUND_Y, 632);
  for (let x = 0; x < 1260; x++) { g.vline(x, 0, 8, VOID); g.set(x, 9, BRICK_D); }
  // vault ribs
  for (let x = 60; x < 1260; x += 120) for (let y = 10; y < 20; y++) g.hline(x - 3, x + 3, y, BRICK_L);
  archHole(g, 300, 42, 84, GROUND_Y);
  archHole(g, 800, 50, 70, GROUND_Y);
  // the manhole and ladder they climb down
  g.rect(118, 0, 44, 8, hex('#1a1a24')); g.ellipse(140, 4, 18, 3, hex('#3a3a46')); g.ellipse(140, 3, 14, 1, hex('#ffd46a', 120));
  for (const lx of [128, 152]) g.vline(lx, 8, GROUND_Y - 1, STEEL);
  for (let y = 16; y < GROUND_Y; y += 9) g.hline(128, 152, y, STEEL_L);
  // a light shaft from the street
  for (let y = 8; y < GROUND_Y; y++) for (let x = 120; x < 162; x++) { const c = g.get(x, y)!; if (c[3]) g.set(x, y, mix(c, hex('#ffe9a0'), 0.12 * (1 - y / GROUND_Y))); }
  // a brass plaque: the city's water history (fact 7)
  g.rect(190, 64, 56, 30, P.goldDark); g.rect(191, 65, 54, 28, P.goldMid);
  text(g, 'ARTESIAN', 194, 67, P.ink); text(g, 'WATER', 203, 75, P.ink); text(g, '1880S', 203, 83, P.ink);
  // old water main with a valve wheel
  g.rect(0, 112, 1260, 5, hex('#3a3440')); g.hline(0, 1259, 112, hex('#5a5466')); g.hline(0, 1259, 116, P.ink);
  for (let x = 90; x < 1260; x += 160) { g.rect(x, 110, 6, 9, hex('#2a2430')); }
  g.circle(560, 114, 7, hex('#8a2020')); g.circle(560, 114, 5, VOID); g.line(553, 114, 567, 114, hex('#8a2020')); g.line(560, 107, 560, 121, hex('#8a2020')); g.circle(560, 114, 1, hex('#c84040'));
  // the murals
  mural(g, 470, 30, murals.blues, 641);
  mural(g, 1000, 30, murals.soul, 642);
  // painted lettering over Echo Hall (just the words, no names)
  text(g, 'BEALE', 680, 22, hex('#8a6a4a')); text(g, 'REMEMBERS', 722, 22, hex('#8a6a4a'));
  // hanging bulbs and drips
  for (const bx of [220, 390, 640, 880, 1130]) bulb(g, bx, 26);
  for (let i = 0; i < 26; i++) drip(g, Math.floor(r() * 1260), 10 + Math.floor(r() * 4), 3 + Math.floor(r() * 5));
  // water stains running down the bricks
  for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 1260); for (let y = 10; y < 40 + r() * 60; y++) g.set(x + Math.round(Math.sin(y / 5)), y, mix(g.get(x, y) ?? BRICK, hex('#2a4a6a'), 0.4)); }
  gloom(g, 0, 0, 1260, GROUND_Y, 0.5, [[140, 30, 90], [220, 30, 60], [390, 30, 60], [470, 70, 70], [640, 30, 60], [880, 30, 60], [1000, 70, 70], [1130, 30, 60]]);

  // --- the dig: AetherCorp shoring and work lights; the wall is cut away to show the ground layers
  strata(g, 1260, 1960, 651);
  // the ceiling here is a raw cut with timbers
  for (let x = 1260; x < 1960; x++) { g.vline(x, 0, 20 + Math.round(Math.sin(x / 9) * 2), SOIL_D); g.set(x, 21, P.ink); }
  for (let x = 1290; x < 1960; x += 90) {
    // steel shoring frames
    g.rect(x, 18, 6, GROUND_Y - 18, STEEL); g.vline(x, 18, GROUND_Y - 1, STEEL_L); g.vline(x + 5, 18, GROUND_Y - 1, STEEL_D);
    g.rect(x - 20, 18, 46, 5, STEEL); g.hline(x - 20, x + 25, 18, STEEL_L);
    for (let y = 30; y < GROUND_Y; y += 22) { g.line(x + 6, y, x + 20, y + 12, STEEL_D, 1); }
  }
  // breaches through the clay where the drills went in
  for (const [x, s] of [[1340, 661], [1470, 662], [1610, 663], [1790, 664], [1900, 665]] as const) clayCrack(g, x, s);
  // drill holes bored into the sand, dripping
  for (const x of [1420, 1560, 1740]) { g.circle(x, 118, 7, VOID); g.circle(x, 118, 5, hex('#0a1430')); g.set(x - 2, 116, WET); drip(g, x, 125, 6); }
  // cables running to the right along the wall (they end up at the jar)
  for (const [y, c] of [[96, hex('#1a1a24')], [100, hex('#2a7ad8')], [104, hex('#1a1a24')]] as const) for (let x = 1260; x < 2400; x++) g.set(x, y + Math.round(Math.sin(x / 40) * 2), c);
  // the AetherCorp banner
  {
    const bx = 1500, by = 30, bw = 140;
    g.rect(bx, by, bw, 22, AE_W); g.rect(bx, by + 18, bw, 4, AE_S); g.hline(bx, bx + bw - 1, by, LED);
    text(g, 'AETHERCORP', bx + Math.round((bw - textWidth('AETHERCORP')) / 2), by + 3, hex('#2a3a5a'));
    text(g, 'DEEP ACCESS', bx + Math.round((bw - textWidth('DEEP ACCESS')) / 2), by + 11, hex('#2a7ad8'));
    gigazFace(g, bx + 10, by + 10); gigazFace(g, bx + bw - 11, by + 10);
  }
  // hazard stripes on the shoring
  for (let x = 1260; x < 1960; x++) if (Math.floor((x + 0) / 6) % 2) { g.set(x, GROUND_Y - 6, HAZ); g.set(x, GROUND_Y - 5, HAZ); } else { g.set(x, GROUND_Y - 6, HAZ_D); g.set(x, GROUND_Y - 5, HAZ_D); }
  // the third mural, left behind on a slab of old brick the dig cut around
  bricks(g, 1660, 22, 1760, GROUND_Y - 8, 666);
  mural(g, 1710, 30, murals.rock, 643);
  for (const lx of [1320, 1440, 1590, 1830, 1940]) workLight(g, lx, 60);
  gloom(g, 1260, 0, 1960, GROUND_Y, 0.42, [[1320, 60, 90], [1440, 60, 90], [1590, 60, 90], [1710, 70, 70], [1830, 60, 90], [1940, 60, 80]]);

  // --- the chamber: a huge bored cavern through the sand, deep water glowing below, cables climbing to the ceiling
  for (let x = 1960; x < W; x++) for (let y = 0; y < GROUND_Y; y++) {
    const band = Math.sin(x / 50 + y / 30) * 0.5 + 0.5;
    g.set(x, y, mix(mix(SAND_D, hex('#3a2a20'), 0.5), hex('#2a1e1a'), band * 0.5 + y / 400));
  }
  // the bore: a huge round tunnel face with drill-bit grooves
  for (let k = 0; k < 9; k++) {
    const cx = 2250, cy = 70, rr = 120 - k * 12;
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const x = Math.round(cx + Math.cos(a) * rr * 1.25), y = Math.round(cy + Math.sin(a) * rr * 0.75);
      if (x >= 1960 && y < GROUND_Y && y >= 0) g.set(x, y, k % 2 ? hex('#4a3426') : hex('#241812'));
    }
  }
  // glowing water seeping through the sand at the bottom of the bore
  for (let i = 0; i < 900; i++) {
    const x = 1960 + Math.floor(r() * (W - 1960)), y = 60 + Math.floor(r() * (GROUND_Y - 60));
    g.set(x, y, r() > 0.7 ? hex('#fff1a8', 120) : hex('#5cc8ff', 90 + Math.floor(r() * 100)));
  }
  // cables climbing up to the ceiling at the right (to The Gigantum)
  for (let k = 0; k < 5; k++) {
    const x = 2440 + k * 6;
    g.vline(x, 0, GROUND_Y - 1, k % 2 ? hex('#2a7ad8') : hex('#1a1a24'));
    g.vline(x + 1, 0, GROUND_Y - 1, k % 2 ? hex('#1a4a98') : hex('#101018'));
  }
  for (let y = 10; y < GROUND_Y; y += 16) g.rect(2436, y, 34, 2, STEEL);
  // a sign by the cables
  g.rect(2340, 40, 70, 20, AE_W); g.hline(2340, 2409, 40, LED);
  text(g, 'TO THE', 2358, 43, hex('#2a3a5a')); text(g, 'GIGANTUM', 2352, 51, hex('#2a7ad8'));
  for (const lx of [2020, 2180]) workLight(g, lx, 50);
  gloom(g, 1960, 0, W, GROUND_Y, 0.4, [[2020, 50, 90], [2180, 50, 90], [2400, 90, 120]]);
  return g;
}

// ------------------------------------------------------------------ the floor: wet brick, then planks over mud, then the rock floor of the bore
export function groundLayer6(): Pix {
  const W = LEVEL6_W, g = new Pix(W, 216);
  const r = rng(671);
  for (let y = GROUND_Y; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#2a1a1e'), hex('#3a2426'), (y - GROUND_Y) / 70));
  // brick paving with perspective rows (0..1260)
  for (let y = GROUND_Y + 2, row = 0; y < 216; row++) {
    const h = 5 + Math.floor(row * 1.4);
    for (let x = -(row % 2) * 10; x < 1260; x += 20) {
      g.hline(Math.max(0, x), Math.min(1259, x + 19), y, hex('#1a1014'));
      if (x >= 0) g.vline(x, y, Math.min(215, y + h), hex('#1a1014'));
      if (r() > 0.7) g.rect(Math.max(0, x + 1), y + 1, 18, h - 1, hex('#4a2a28'));
    }
    y += h;
  }
  // the dig (1260..1960): wet mud with plank walkways
  for (let x = 1260; x < 1960; x++) for (let y = GROUND_Y; y < 216; y++) g.set(x, y, mix(hex('#3a2a1e'), hex('#4a3626'), Math.sin(x / 13 + y / 7) * 0.5 + 0.5));
  for (let y = 160; y < 214; y += 18) for (let x = 1270; x < 1950; x += 34) {
    g.rect(x, y, 32, 7, hex('#6a4a2e')); g.hline(x, x + 31, y, hex('#8a6a42')); g.hline(x, x + 31, y + 6, hex('#3a2818'));
    g.set(x + 3, y + 3, P.ink); g.set(x + 28, y + 3, P.ink);
  }
  // the bore (1960..W): packed sand and rock, a ring of drill marks
  for (let x = 1960; x < W; x++) for (let y = GROUND_Y; y < 216; y++) g.set(x, y, mix(hex('#4a3a2a'), hex('#5a4630'), (Math.sin(x / 21) * Math.cos(y / 6)) * 0.5 + 0.5));
  for (let i = 0; i < 40; i++) { const x = 1980 + Math.floor(r() * (W - 2000)), y = GROUND_Y + 6 + Math.floor(r() * 60); g.ellipse(x, y, 3, 1, hex('#2a2018')); }
  // standing water: a sheen with lamp reflections across the whole floor
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * W), y = GROUND_Y + 3 + Math.floor(r() * 66), w = 2 + Math.floor(r() * 8);
    g.hline(x, Math.min(W - 1, x + w), y, r() > 0.8 ? [255, 212, 106, 70] : [92, 200, 255, 60]);
  }
  // reflections of the bulbs and work lights
  for (const lx of [220, 390, 640, 880, 1130, 1320, 1440, 1590, 1830, 1940, 2020, 2180]) for (let k = 0; k < 8; k++) g.hline(lx - 4 + (k % 2) * 2, lx + 4 - (k % 2) * 2, GROUND_Y + 8 + k * 6, lx < 1260 ? [255, 212, 106, 90 - k * 9] : [200, 240, 255, 90 - k * 9]);
  // gloom over all of it, the curb
  for (let y = GROUND_Y; y < 216; y++) for (let x = 0; x < W; x++) { const c = g.get(x, y)!; g.set(x, y, mix(c, DEEP, 0.3) as RGBA); }
  g.hline(0, W - 1, GROUND_Y, hex('#5a3a30')); g.hline(0, W - 1, GROUND_Y + 1, hex('#1a1014'));
  return g;
}

// ------------------------------------------------------------------ props
// A breach in the floor: a crack with water swirling down (the pothole of this level)
export function breachDecal(): Pix {
  const g = new Pix(40, 12);
  g.ellipse(20, 6, 18, 5, hex('#55565e')); g.ellipse(20, 6, 15, 4, hex('#0a1430'));
  g.ellipse(20, 6, 11, 3, hex('#123a70'));
  for (let a = 0; a < 6; a += 0.5) g.set(20 + Math.round(Math.cos(a) * (2 + a)), 6 + Math.round(Math.sin(a) * (1 + a * 0.4)), WET);
  g.line(2, 6, -4, 3, hex('#33343a')); g.line(38, 5, 44, 2, hex('#33343a'));
  g.set(6, 4, hex('#9a9ca6')); g.set(33, 8, hex('#9a9ca6'));
  return g;
}

// A stack of drill pipe on blocks: solid, jump up and stand on it (the picnic table of this level)
export function pipeStack(): Pix {
  const g = new Pix(48, 24);
  g.rect(4, 14, 6, 10, hex('#5a4026')); g.rect(38, 14, 6, 10, hex('#5a4026'));
  for (const [y, n] of [[13, 5], [8, 4], [3, 3]] as const) {
    const x0 = 24 - n * 4.5;
    for (let k = 0; k < n; k++) { const cx = Math.round(x0 + 4.5 + k * 9 - 4.5 + 4); g.circle(cx, y, 4, STEEL); g.circle(cx, y, 2, STEEL_D); g.set(cx - 2, y - 2, STEEL_L); }
  }
  g.hline(2, 45, 17, HAZ);
  g.outline(P.ink);
  return g;
}

// AetherCorp supply crate: hit it twice (the trash can of this level)
export function supplyCrate(): Pix[] {
  const mk = (broken: boolean) => {
    const g = new Pix(20, 28);
    if (!broken) {
      g.rect(1, 6, 18, 21, AE_W); g.rect(1, 22, 18, 5, AE_S);
      g.hline(1, 18, 6, LED); g.rect(1, 13, 18, 2, AE_S);
      gigazFace(g, 10, 18);
    } else {
      g.rect(1, 16, 18, 11, AE_W); g.rect(1, 23, 18, 4, AE_S);
      g.poly([[1, 16], [6, 11], [9, 16]], AE_S); g.poly([[11, 16], [16, 9], [19, 16]], AE_W);
      g.rect(4, 17, 12, 4, hex('#1a1a24'));
    }
    g.outline(P.ink);
    return g;
  };
  return [mk(false), mk(true)];
}

// Thrown coolant canister (4 frames of spin)
export function canisterProj(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(12, 12);
    const a = (f * Math.PI) / 4;
    const dx = Math.round(Math.cos(a) * 3), dy = Math.round(Math.sin(a) * 3);
    g.line(6 - dx, 6 - dy, 6 + dx, 6 + dy, hex('#5cc8ff'), 3);
    g.set(6 + dx, 6 + dy, P.grey); g.set(6 - dx, 6 - dy, hex('#2a7ad8'));
    if (f === 1) g.set(5, 5, P.white);
    g.outline(P.ink);
    return g;
  });
}

// An AetherCorp drill cart: a tracked cart with a spinning bit on the nose (the drive-out car of this level). 128x48, nose right.
export function drillCartFrames(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(128, 48);
    // tracks
    g.rect(14, 34, 84, 10, hex('#1a1a24'));
    for (let x = 16 + (f ? 3 : 0); x < 96; x += 6) g.rect(x, 35, 3, 8, hex('#3a3a46'));
    for (const wx of [20, 40, 60, 80, 94]) g.circle(Math.min(wx, 92), 39, 4, STEEL_D);
    // body
    g.rect(10, 14, 92, 20, AE_W); g.rect(10, 28, 92, 6, AE_S); g.hline(10, 101, 14, LED); g.hline(10, 101, 22, hex('#2aa8d8'));
    // cab with a GigaZ screen (nobody driving)
    g.rect(20, 2, 30, 13, hex('#2a3a5a')); g.rect(22, 4, 26, 9, hex('#13284a'));
    gigazFace(g, 35, 8);
    // hazard stripes on the front
    for (let y = 14; y < 34; y++) for (let x = 92; x < 102; x++) g.set(x, y, Math.floor((x + y) / 3) % 2 ? HAZ : HAZ_D);
    // the drill bit
    for (let x = 102; x < 126; x++) {
      const t = (x - 102) / 24, h = Math.round(9 * (1 - t));
      for (let y = 24 - h; y <= 24 + h; y++) g.set(x, y, (Math.floor((x + y * 0.8 + f * 3) / 3) % 2) ? STEEL_L : STEEL);
    }
    g.set(126, 24, P.white);
    // headlamp
    g.rect(86, 16, 4, 3, hex('#fff6c8'));
    g.outline(P.ink);
    return g;
  });
}

// A chunk of rock shaken loose from the ceiling
export function rockProj(): Pix {
  const g = new Pix(16, 14);
  g.poly([[2, 8], [5, 2], [11, 1], [15, 6], [13, 12], [5, 13]], hex('#5a4630'));
  g.poly([[5, 3], [10, 2], [12, 6], [7, 7]], hex('#7a6448'));
  g.set(9, 9, hex('#3a2a20')); g.set(4, 9, hex('#3a2a20'));
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ the Driller: AetherCorp's walking drill mech (96x96 frames, feet on y=91)
interface DPose { bob?: number; legA?: number; legB?: number; drill?: number; drillUp?: number; spin?: number; lean?: number; tilt?: number; steam?: boolean; flash?: boolean; down?: boolean; face?: 'normal' | 'yell' | 'ko' }
function drawDriller(p: DPose): Pix {
  const g = new Pix(96, 96);
  const base = 91;
  const bob = p.bob ?? 0, lean = p.lean ?? 0;
  if (p.down) {
    // slumped: body on the ground, legs folded, drill on the floor
    const by = base - 18;
    g.rect(14, by - 18, 50, 28, STEEL); g.rect(14, by + 4, 50, 6, STEEL_D); g.hline(14, 63, by - 18, STEEL_L);
    g.rect(22, by - 30, 30, 14, AE_W); g.rect(25, by - 27, 24, 9, hex('#13284a'));
    gigazFace(g, 37, by - 23, 'glitch');
    g.rect(64, by - 4, 26, 10, STEEL); for (let x = 66; x < 90; x += 4) g.vline(x, by - 4, by + 5, STEEL_D);
    g.rect(6, base - 6, 20, 6, STEEL_D); g.rect(56, base - 6, 20, 6, STEEL_D);
    for (let i = 0; i < 6; i++) g.set(30 + i * 5, by - 34 - (i % 2) * 3, [200, 220, 240, 160]);
    g.outline(P.ink);
    return g;
  }
  const hipY = base - 30 + bob;
  const bx = 18 + lean;
  // legs: hydraulic, back then front
  const leg = (x: number, lift: number, front: boolean) => {
    const kx = x + 4, ky = hipY + 14 - lift;
    const fy = base - lift;
    g.line(x, hipY, kx, ky, front ? STEEL : STEEL_D, 5);
    g.line(kx, ky, x - 2, fy - 3, front ? STEEL : STEEL_D, 5);
    g.circle(kx, ky, 3, front ? STEEL_L : STEEL);
    g.rect(x - 9, fy - 4, 16, 5, front ? hex('#2a2a34') : hex('#1a1a24'));
    g.hline(x - 9, x + 6, fy, HAZ);
  };
  leg(bx + 12, p.legB ?? 0, false);
  // body: a heavy white AetherCorp hull with hazard trim
  const top = hipY - 34;
  g.rect(bx, top, 52, 36, AE_W); g.rect(bx, top + 28, 52, 8, AE_S); g.hline(bx, bx + 51, top, LED);
  g.hline(bx, bx + 51, top + 20, hex('#2aa8d8'));
  for (let x = bx; x < bx + 52; x++) if (Math.floor(x / 4) % 2) g.set(x, top + 35, HAZ); else g.set(x, top + 35, HAZ_D);
  // exhaust stacks
  g.rect(bx + 4, top - 10, 5, 10, STEEL_D); g.rect(bx + 11, top - 7, 4, 7, STEEL_D);
  // the cab: the operator in a hard hat behind the glass
  const cx = bx + 26, cy = top + 4;
  g.rect(cx - 2, cy, 24, 16, hex('#2a3a5a')); g.rect(cx, cy + 2, 20, 12, hex('#5a8ab8'));
  // operator
  g.circle(cx + 10, cy + 9, 4, P.skin2); g.ellipse(cx + 10, cy + 5, 5, 2, P.yellow); g.hline(cx + 5, cx + 15, cy + 6, hex('#a8841e'));
  if (p.face === 'ko') { g.set(cx + 11, cy + 8, P.ink); g.set(cx + 13, cy + 8, P.ink); }
  else { g.set(cx + 11, cy + 8, P.white); g.set(cx + 13, cy + 8, P.white); g.set(cx + 12, cy + 8, P.ink); }
  if (p.face === 'yell') g.rect(cx + 11, cy + 11, 2, 2, P.ink); else g.hline(cx + 11, cx + 12, cy + 11, P.skin2Shade);
  g.rect(cx + 6, cy + 13, 8, 3, hex('#d86a1e')); // vest
  g.hline(cx, cx + 19, cy + 2, hex('#a8d8ff')); // glare
  // the GigaZ badge on the hull
  gigazFace(g, bx + 12, top + 12);
  // the clamp arm (back), the drill arm (front)
  g.rect(bx - 6, top + 14, 10, 6, STEEL_D); g.rect(bx - 10, top + 12, 5, 10, STEEL);
  const ext = p.drill ?? 0, up = p.drillUp ?? 0;
  const ax = bx + 48, ay = top + 22 - up;
  g.rect(bx + 40, top + 18, 12, 8, STEEL); g.circle(bx + 46, top + 22, 4, STEEL_L);
  const dx0 = ax + 2 + ext, dy0 = ay;
  g.line(bx + 46, top + 22, dx0, dy0, STEEL_D, 5);
  // the bit, spinning (stripes shift with spin), pointing forward (or up when raised)
  const len = 26;
  const s = p.spin ?? 0;
  for (let k = 0; k < len; k++) {
    const t = k / len, h = Math.max(0, Math.round(8 * (1 - t)));
    for (let w = -h; w <= h; w++) {
      const x = up > 10 ? dx0 + w : dx0 + k, y = up > 10 ? dy0 - k : dy0 + w;
      const col = Math.floor((k + w * 0.7 + s * 3) / 3) % 2 ? STEEL_L : STEEL;
      g.set(x, y, p.flash ? hex('#ff6a4a') : col);
    }
  }
  g.set(up > 10 ? dx0 : dx0 + len, up > 10 ? dy0 - len : dy0, P.white);
  leg(bx + 34, p.legA ?? 0, true);
  if (p.steam) for (let i = 0; i < 14; i++) { const a = i * 0.9; g.circle(bx + 8 + Math.round(Math.cos(a) * 6), top - 14 - i * 2, 2 + (i % 3), [220, 230, 240, 150]); }
  g.outline(P.ink);
  return g;
}

export function drillerFrames() {
  const def: Record<string, DPose[]> = {
    idle: [{ bob: 0, spin: 0 }, { bob: 1, spin: 1 }],
    walk: [{ legA: 4, spin: 0 }, { bob: 1, spin: 1 }, { legB: 4, spin: 0 }, { bob: 1, spin: 1 }],
    // drill jab: pull back, thrust, spin out
    punch: [{ drill: -6, lean: -2, face: 'yell' }, { drill: -8, lean: -3, spin: 1, face: 'yell' }, { drill: 12, lean: 4, spin: 0, face: 'yell' }],
    throw: [{ drill: -6, lean: -2 }, { drill: -8, lean: -3 }, { drill: 10, lean: 3 }],
    hurt: [{ lean: -4, bob: 2, face: 'yell' }, { lean: -2, bob: 1 }],
    knockdown: [{ lean: -6, bob: 4, face: 'ko' }, { down: true }, { bob: 6, lean: -2, steam: true }],
    // overheated: steam pouring off, operator dazed
    dazed: [{ steam: true, bob: 2, face: 'ko' }, { steam: true, bob: 3, spin: 1, face: 'ko' }],
    // the charge: bit out front, spinning
    dash: [{ drill: 8, lean: 5, legA: 3, spin: 0, face: 'yell' }, { drill: 8, lean: 6, legB: 3, spin: 1, face: 'yell' }],
    // the slam: bit raised, then slammed into the floor
    slam: [{ drillUp: 22, lean: -3, face: 'yell' }, { drillUp: 26, lean: -4, spin: 1, face: 'yell' }, { drill: 14, lean: 6, bob: 3, spin: 0, face: 'yell' }],
  };
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  for (const [name, poses] of Object.entries(def)) {
    anims[name] = [frames.length, frames.length + poses.length - 1];
    for (const p of poses) frames.push(drawDriller(p));
  }
  return { frames, anims };
}

// ------------------------------------------------------------------ the twist: the golden jar, wired into The Gigantum (144x120)
export function jarRig(): Pix {
  const g = new Pix(144, 120);
  // steel cradle and base
  g.rect(20, 104, 104, 14, STEEL_D); g.hline(20, 123, 104, STEEL_L);
  for (let x = 20; x < 124; x++) if (Math.floor(x / 6) % 2) g.set(x, 116, HAZ);
  g.rect(30, 40, 6, 64, STEEL); g.rect(108, 40, 6, 64, STEEL); g.rect(30, 36, 84, 6, STEEL); g.hline(30, 113, 36, STEEL_L);
  // the jar itself: the same gold and blue bands as the jar in Old Memphis, bigger
  const jx = 72, jy = 76;
  g.ellipse(jx, jy, 24, 24, P.gold);
  g.ellipse(jx - 6, jy - 6, 12, 15, P.goldHi);
  g.ellipse(jx + 9, jy + 8, 10, 11, P.goldMid);
  g.rect(jx - 12, jy - 40, 24, 16, P.gold); g.rect(jx - 14, jy - 42, 28, 4, P.goldDark);
  g.ellipse(jx, jy - 42, 16, 4, P.goldMid); g.rect(jx - 4, jy - 50, 8, 6, P.goldHi);
  g.hline(jx - 23, jx + 23, jy - 4, P.blue); g.hline(jx - 23, jx + 23, jy + 2, P.blue);
  g.hline(jx - 23, jx + 23, jy - 3, P.blue); g.hline(jx - 23, jx + 23, jy + 3, P.blue);
  for (let x = jx - 21; x < jx + 22; x += 6) { g.set(x, jy - 1, P.goldDark); g.set(x + 1, jy, P.ink); }
  g.hline(jx - 12, jx + 12, jy - 30, hex('#7a3a1a')); // the old seal
  // clamps and cables plugged straight into the gold
  for (const [x0, y0] of [[jx - 22, jy - 10], [jx + 22, jy - 8], [jx - 18, jy + 16], [jx + 18, jy + 18]] as const) {
    const side = x0 < jx ? -1 : 1;
    g.rect(x0 - 3, y0 - 3, 6, 6, STEEL_D); g.set(x0, y0, LED);
    g.curve(x0, y0, x0 + side * 20, y0 - 10, side < 0 ? 4 : 140, 8 + (y0 % 20), side < 0 ? hex('#1a1a24') : hex('#2a7ad8'), 2);
  }
  // cables up the frame to the top edge (to The Gigantum)
  for (let k = 0; k < 4; k++) g.curve(jx - 6 + k * 4, jy - 50, jx - 6 + k * 4 + (k - 1.5) * 6, 20, jx - 20 + k * 12, 0, k % 2 ? hex('#2a7ad8') : hex('#1a1a24'), 2);
  // status lights on the cradle
  for (let x = 40; x < 106; x += 8) g.set(x, 110, x % 16 ? LED : hex('#ff5a5a'));
  g.outline(P.ink);
  drawSparkle(g, jx - 10, jy - 14, 2);
  return g;
}

// GigaZ on a monitor: smiling, then grinning wide (40x30, 2 frames)
export function gigazScreen(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(40, 30);
    g.rect(1, 1, 38, 24, STEEL_D); g.rect(3, 3, 34, 20, hex('#13284a'));
    for (let y = 4; y < 23; y += 2) g.hline(3, 36, y, hex('#173058'));
    const C = hex('#e8f4ff'), E = hex('#2a7ad8');
    g.circle(14, 14, 4, C); g.circle(20, 11, 6, C); g.circle(26, 14, 4, C); g.rect(11, 14, 18, 4, C);
    g.rect(16, 11, 2, 2, E); g.rect(22, 11, 2, 2, E);
    if (f === 0) { g.hline(17, 23, 16, E); g.set(16, 15, E); g.set(24, 15, E); }
    else { g.rect(16, 15, 9, 2, E); g.set(15, 14, E); g.set(25, 14, E); g.hline(17, 23, 17, hex('#ffffff')); }
    g.rect(18, 25, 4, 4, STEEL_D);
    g.outline(P.ink);
    return g;
  });
}

// An AetherCorp security drone with a claw (32x24, 2 frames of rotor blur)
export function droneFrames(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(32, 24);
    g.rect(9, 7, 14, 8, AE_W); g.rect(9, 13, 14, 2, AE_S); g.hline(9, 22, 7, LED);
    g.set(13, 10, hex('#2a7ad8')); g.set(18, 10, hex('#2a7ad8'));
    // rotors
    for (const rx of [4, 27]) { g.rect(rx - 1, 5, 3, 3, STEEL_D); g.hline(rx - (f ? 5 : 3), rx + (f ? 5 : 3), 4, [200, 210, 230, 200]); }
    g.hline(5, 26, 6, STEEL_D);
    // claw
    g.vline(16, 15, 18, STEEL); g.line(16, 18, 12, 22, STEEL, 1); g.line(16, 18, 20, 22, STEEL, 1);
    g.outline(P.ink);
    return g;
  });
}

// ------------------------------------------------------------------ the intro: Beale Street at night, AetherCorp's rig punched through the street (480x216)
export function bealeExterior(): Pix {
  const W = 480, g = new Pix(W, 216);
  const r = rng(691);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#070a1c'), hex('#2a1a40'), Math.min(1, y / 140)));
  for (let i = 0; i < 60; i++) g.set(Math.floor(r() * W), Math.floor(r() * 60), hex('#c8d0ff', 80 + Math.floor(r() * 120)));
  // far towers
  for (const [x, w, h] of [[10, 40, 110], [60, 30, 140], [400, 50, 120], [440, 36, 150]] as const) {
    g.rect(x, 150 - h, w, h, hex('#141a36'));
    for (let wy = 150 - h + 6; wy < 140; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 6) if (r() > 0.5) g.rect(wx, wy, 2, 3, hex('#ffd46a', 140));
  }
  // the street's two-storey brick fronts with neon signs (made-up names)
  const fronts: [number, number, RGBA, string, RGBA][] = [
    [0, 92, hex('#6a2e2a'), 'DELTA ROOM', hex('#ff5aa0')],
    [92, 86, hex('#5a3a2a'), 'BAR-B-Q', hex('#ff9a3a')],
    [178, 0, hex('#000000'), '', hex('#000000')], // the gap where the rig is
    [300, 92, hex('#4a2a3a'), '12 BAR', hex('#5ce1ff')],
    [392, 88, hex('#6a3a2a'), 'SUNNY\'S', hex('#f5c542')],
  ];
  for (const [x, w, c, name, neon] of fronts) {
    if (!w) continue;
    const top = 72 + Math.floor(r() * 10);
    g.rect(x, top, w, 160 - top, c);
    for (let y = top + 3; y < 160; y += 4) for (let bx = x + (Math.floor(y / 4) % 2 ? 0 : 3); bx < x + w; bx += 7) g.set(bx, y, mix(c, P.ink, 0.35));
    g.rect(x, top - 4, w, 4, mix(c, P.ink, 0.4));
    // upper windows
    for (let wx = x + 8; wx < x + w - 10; wx += 20) { g.rect(wx, top + 8, 10, 14, hex('#ffd46a', 200)); g.vline(wx + 5, top + 8, top + 21, mix(c, P.ink, 0.5)); }
    // neon sign
    const tw = textWidth(name);
    const sx = x + Math.round((w - tw) / 2), sy = top + 30;
    g.rect(sx - 3, sy - 3, tw + 6, 13, hex('#140a1a'));
    text(g, name, sx, sy, neon);
    for (let yy = sy - 6; yy < sy + 14; yy++) for (let xx = sx - 6; xx < sx + tw + 6; xx++) { const cc = g.get(xx, yy)!; if (cc[3] && !(xx >= sx - 3 && xx < sx + tw + 3 && yy >= sy - 3 && yy < sy + 10)) g.set(xx, yy, mix(cc, neon, 0.18)); }
    // doors and a lit window
    g.rect(x + w / 2 - 8, 132, 16, 28, hex('#1a1020')); g.rect(x + 6, 132, 20, 18, hex('#ffb85a', 200));
  }
  // the AetherCorp rig in the gap: a derrick with blue lights over a hole in the street
  g.rect(178, 60, 122, 100, hex('#141a36'));
  for (const [x0, x1] of [[200, 226], [278, 252]]) g.line(x0, 160, x1, 40, STEEL, 2);
  for (let y = 60; y < 160; y += 16) { const t = (y - 40) / 120; g.hline(Math.round(226 - 26 * t), Math.round(252 + 26 * t), y, STEEL_L); }
  g.rect(222, 34, 34, 8, AE_W); g.hline(222, 255, 34, LED);
  for (let y = 46; y < 160; y += 12) { g.set(226 - Math.round((y - 40) / 5), y, LED); g.set(252 + Math.round((y - 40) / 5), y, LED); }
  g.rect(232, 42, 3, 110, STEEL_D); // drill string
  // street, sidewalk, the hole glowing blue
  g.rect(0, 160, W, 56, hex('#1e1a2a'));
  g.rect(0, 156, W, 6, hex('#5a5466')); g.hline(0, W - 1, 156, hex('#8a8496'));
  for (let x = 0; x < W; x += 30) g.rect(x, 186, 14, 2, hex('#e8d070', 150));
  g.ellipse(240, 172, 42, 9, hex('#0a0a14')); g.ellipse(240, 172, 36, 7, hex('#123a70')); g.ellipse(240, 171, 24, 4, hex('#5cc8ff'));
  for (let i = 0; i < 30; i++) g.set(205 + Math.floor(r() * 70), 168 + Math.floor(r() * 9), hex('#fff1a8', 180));
  // barricades and cones
  for (const bx of [176, 284]) { g.rect(bx, 150, 22, 4, HAZ); for (let x = bx; x < bx + 22; x += 6) g.rect(x, 150, 3, 4, HAZ_D); g.vline(bx + 2, 154, 166, STEEL); g.vline(bx + 19, 154, 166, STEEL); }
  for (const cx of [160, 320]) { g.poly([[cx - 4, 168], [cx + 4, 168], [cx, 156]], hex('#f08a2a')); g.hline(cx - 2, cx + 2, 162, P.white); }
  // the street sign
  g.rect(168, 46, 3, 112, STEEL);
  g.rect(146, 36, 48, 12, hex('#1f6a3a')); g.rect(147, 37, 46, 10, hex('#2a8a4a'));
  text(g, 'BEALE ST', 148, 38, P.white);
  // string of lights across the top
  for (let x = 0; x < W; x += 9) { const y = 66 + Math.round(Math.sin(x / 60) * 6); g.set(x, y, [hex('#ff5aa0'), hex('#f5c542'), hex('#5ce1ff')][Math.floor(x / 9) % 3]); }
  return g;
}

// The hidden Aquifer Fact card is the plant's card sprite; this is the big card shown when you find one (200x84).
export function factPanel(): Pix {
  const g = new Pix(200, 84);
  g.rect(0, 0, 200, 84, P.gold); g.rect(2, 2, 196, 80, hex('#0b0f26'));
  g.rect(4, 4, 192, 12, hex('#141c40'));
  text(g, 'AQUIFER FACT', 100 - Math.round(textWidth('AQUIFER FACT') / 2), 6, P.goldHi);
  g.poly([[18, 30], [12, 44], [24, 44]], hex('#5cc8ff')); g.circle(18, 45, 6, hex('#5cc8ff')); g.set(15, 42, P.white);
  return g;
}
