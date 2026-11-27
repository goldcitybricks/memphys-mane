// Mission 10 "The Source": the aquifer itself, under the city. A glowing sea in a cavern of sand, with the gray
// clay above it and the city on top of that. Old Memphis columns stand half-sunk in the water (the two cities
// meet down here), AetherCorp's coolant pipes hang broken from the ceiling, and the Pharaoh of DeNile rises
// out of the golden jar: servers and crushed plastic in the shape of the old king. Plus the Pip army for the
// brawler, the ending at Uncle T's counter and the props the story needs. Same specs as every other mission.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';
import { jarRig } from './beale';
import { pipFrames } from './fight';

export const LEVEL10_W = 1200;
const GROUND_Y = 146;

const VOID = hex('#03050c'), DEEP = hex('#081430'), SEA = hex('#123a78'), SEA_L = hex('#2a7ad8');
const GLOW = hex('#5cc8ff'), GLOW_HI = hex('#bff0ff');
const SOIL = hex('#3a2a20'), SOIL_D = hex('#261a14'), ROOT = hex('#5a4030');
const CLAY = hex('#6a6c78'), CLAY_L = hex('#8a8c98'), CLAY_D = hex('#4a4b55');
const SAND = hex('#a8844a'), SAND_L = hex('#c8a464'), SAND_D = hex('#6a5030'), SAND_W = hex('#4a6a80');
const STONE = hex('#b89a64'), STONE_L = hex('#d8bc84'), STONE_D = hex('#7a6038');
const ROCK = hex('#1c2238'), ROCK_L = hex('#2c3654'), ROCK_D = hex('#121628');
const STEEL = hex('#5a6070'), STEEL_L = hex('#8a92a4'), STEEL_D = hex('#363a46');
const LED = hex('#5ce1ff'), LED_D = hex('#2a7ad8'), RED_LED = hex('#ff5a5a');
const CLOUD = hex('#e8f4ff'), GZ_EYE = hex('#2a7ad8'), SCREEN = hex('#0c1630');
const PLASTIC = hex('#9ad4ff'), PLASTIC_L = hex('#dff4ff'), PLASTIC_D = hex('#5a9ad8');
const BOOT = hex('#eef2f8'), BOOT_S = hex('#b8c2d4');
const HAIR = hex('#c8ccd8');

const wrapX = (x: number, w: number) => ((Math.round(x) % w) + w) % w;

// sand grains, clay, soil: the layers between the city and the water
function strata(g: Pix, x0: number, x1: number, soil: [number, number], clay: [number, number], sand: [number, number], seed: number) {
  const r = rng(seed);
  const W = g.w;
  for (let x = x0; x < x1; x++) {
    const wob = Math.round(Math.sin(x / 37) * 2 + Math.sin(x / 11) * 1);
    for (let y = soil[0]; y < soil[1] + wob; y++) g.set(wrapX(x, W), y, y % 5 === 0 && r() > 0.6 ? SOIL_D : SOIL);
    for (let y = soil[1] + wob; y < clay[1] + wob; y++) g.set(wrapX(x, W), y, (y - clay[0]) % 4 === 0 ? CLAY_D : (y + x) % 9 === 0 ? CLAY_L : CLAY);
    for (let y = clay[1] + wob; y < sand[1]; y++) {
      const k = r();
      g.set(wrapX(x, W), y, k > 0.9 ? SAND_L : k < 0.12 ? SAND_D : (y > sand[1] - 6 ? SAND_W : SAND));
    }
  }
  // roots reaching down through the soil
  for (let k = 0; k < (x1 - x0) / 40; k++) {
    let x = x0 + r() * (x1 - x0), y = soil[0];
    for (let i = 0; i < 16; i++) { g.set(wrapX(x, W), y, ROOT); x += (r() - 0.5) * 2; y += 1; }
  }
  // cracks in the clay (the breaches the scientists keep finding), a drip of water under each
  for (let k = 0; k < (x1 - x0) / 120; k++) {
    let x = x0 + 20 + r() * (x1 - x0 - 40);
    for (let y = clay[0] + 1; y < clay[1]; y++) { g.set(wrapX(x, W), y, hex('#2a2a34')); x += r() > 0.5 ? 1 : -1; }
    for (let y = clay[1]; y < clay[1] + 6; y++) g.set(wrapX(x, W), y, hex('#5cc8ff', 120));
  }
}

// ------------------------------------------------------------------ the brawler layers (Mission 10, phase 2)
// sky: the cavern ceiling: soil, the gray clay, sand, then the glowing open water space. Tiles horizontally.
export function skyLayer10(): Pix {
  const W = 768, g = new Pix(W, 216);
  const r = rng(1001);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(VOID, hex('#0c2650'), Math.min(1, Math.max(0, y - 40) / 120)));
  strata(g, 0, W, [0, 10], [10, 24], [24, 36], 1002);
  // the sand ceiling hangs down in soft drips
  for (let x = 0; x < W; x += 3) {
    const h = Math.round(3 + Math.abs(Math.sin(x / 17)) * 6 + r() * 2);
    for (let y = 36; y < 36 + h; y++) g.set(x, y, y > 36 + h - 2 ? SAND_W : SAND_D);
  }
  // shafts of light filtering down through the sand
  for (const sx of [90, 300, 520, 690]) for (let y = 44; y < 200; y++) {
    const w = 6 + (y - 44) * 0.12;
    for (let x = Math.round(sx - w); x <= sx + w; x++) g.set(wrapX(x + (y - 44) * 0.2, W), y, hex('#9fe8ff', Math.max(0, 22 - Math.abs(x - sx) * 2)));
  }
  // glowing motes (the water remembering)
  for (let i = 0; i < 140; i++) g.set(Math.floor(r() * W), 48 + Math.floor(r() * 150), r() > 0.8 ? hex('#fff1a8', 180) : hex('#5cc8ff', 60 + Math.floor(r() * 120)));
  return g;
}

// far: the sea under the city, and the two pyramids on its horizon (Old Memphis and the Memphis Pyramid), reflected
export function farLayer10(): Pix {
  const W = 960, g = new Pix(W, 216);
  const r = rng(1011);
  const hor = 116;
  // cave pillars far off, dark against the glow
  for (const [x, w] of [[40, 26], [170, 18], [420, 30], [560, 16], [820, 24]] as const) {
    for (let y = 40; y < hor; y++) {
      const ww = w * (0.6 + 0.4 * Math.abs(y - 78) / 38);
      g.hline(Math.round(x - ww / 2), Math.round(x + ww / 2), y, mix(hex('#0a1430'), hex('#14284c'), (y - 40) / 76));
    }
  }
  // the old pyramid (sandstone, faint gold) and the Memphis Pyramid (steel and glass)
  const pyr = (cx: number, w: number, h: number, c: RGBA, cl: RGBA, glass: boolean) => {
    for (let y = 0; y < h; y++) {
      const half = Math.round((y / h) * w / 2);
      g.hline(cx - half, cx + half, hor - h + y, c);
      g.hline(cx - half, cx - half + Math.max(1, Math.round(half * 0.35)), hor - h + y, cl);
      if (glass && y % 6 === 0) g.hline(cx - half + 2, cx + half - 2, hor - h + y, mix(c, cl, 0.5));
      // its reflection, upside down and fading
      const ry = hor + y;
      for (let x = cx - half; x <= cx + half; x++) if ((x + y) % 2 === 0) g.set(x, ry, mix(c, SEA, 0.55 + y / h * 0.4));
    }
    if (glass) { g.set(cx, hor - h, hex('#ffffff')); g.set(cx, hor - h - 1, hex('#5ce1ff')); }
  };
  pyr(250, 120, 52, hex('#6a5a3a'), hex('#9a8452'), false);
  pyr(690, 112, 56, hex('#4a5a78'), hex('#8aa0c8'), true);
  // the sea: deep blue, bright toward the horizon, with long glints
  for (let y = hor; y < 216; y++) for (let x = 0; x < W; x++) {
    const c = g.get(x, y)!;
    const base = mix(hex('#2a6ab8'), SEA, Math.min(1, (y - hor) / 40));
    g.set(x, y, c[3] ? mix(base, c, 0.5) : base);
  }
  g.hline(0, W - 1, hor, GLOW_HI); g.hline(0, W - 1, hor + 1, GLOW);
  for (let i = 0; i < 120; i++) {
    const y = hor + 3 + Math.floor(r() * 30), x = Math.floor(r() * W), len = 3 + Math.floor(r() * 10);
    g.hline(x, Math.min(W - 1, x + len), y, r() > 0.75 ? hex('#fff1a8', 200) : hex('#9fe8ff', 160));
  }
  return g;
}

// a column from Old Memphis, half sunk in the aquifer: papyrus capital, a glowing glyph band
function sunkColumn(g: Pix, cx: number, top: number, bottom: number, seed: number) {
  const r = rng(seed);
  const w = 26;
  for (let y = top + 14; y < bottom; y++) {
    g.hline(cx - w / 2, cx + w / 2, y, STONE);
    g.hline(cx - w / 2, cx - w / 2 + 4, y, STONE_L);
    g.hline(cx + w / 2 - 4, cx + w / 2, y, STONE_D);
    for (const fx of [-6, 0, 6]) g.set(cx + fx, y, STONE_D);
  }
  // papyrus capital flaring out
  for (let y = top; y < top + 14; y++) {
    const half = w / 2 + Math.round((14 - (y - top)) * 0.9);
    g.hline(cx - half, cx + half, y, y === top ? STONE_L : STONE);
    g.set(cx - half, y, STONE_D); g.set(cx + half, y, STONE_D);
  }
  g.rect(cx - w / 2 - 2, top + 12, w + 4, 3, STONE_D);
  // the glyph band: eye, water lines, the jar
  const gy = top + 30;
  g.rect(cx - w / 2, gy, w + 1, 12, hex('#5a4626'));
  const gold = hex('#f5c542'), glowG = hex('#fff1a8');
  g.hline(cx - 8, cx - 3, gy + 3, gold); g.set(cx - 6, gy + 4, glowG); g.hline(cx - 7, cx - 4, gy + 5, gold);
  for (let k = 0; k < 3; k++) for (let x = cx + 1; x < cx + 9; x++) g.set(x, gy + 3 + k * 3 + (x % 2), hex('#5cc8ff'));
  // cracks and moss
  for (let k = 0; k < 4; k++) { let x = cx - 8 + r() * 16, y = top + 16 + r() * 40; for (let i = 0; i < 8; i++) { g.set(x, y, STONE_D); x += r() > 0.5 ? 1 : -1; y += 1; } }
  for (let x = cx - w / 2; x <= cx + w / 2; x++) if (r() > 0.4) g.set(x, top + 15 + Math.floor(r() * 3), hex('#3a6a4a'));
}

// a broken AetherCorp coolant pipe hanging from the ceiling, dripping
function brokenPipe(g: Pix, x: number, len: number) {
  for (let y = 0; y < len; y++) { g.hline(x - 5, x + 5, y, STEEL); g.hline(x - 5, x - 3, y, STEEL_L); g.hline(x + 3, x + 5, y, STEEL_D); }
  for (let y = 10; y < len; y += 22) { g.rect(x - 7, y, 15, 4, STEEL_D); g.hline(x - 7, x + 7, y, STEEL_L); }
  // the torn end, frost and a glowing drip
  for (let k = -6; k <= 6; k++) g.set(x + k, len + (Math.abs(k) % 3), STEEL_D);
  g.hline(x - 4, x + 4, len - 6, LED_D);
  for (let y = len + 3; y < len + 12; y += 3) g.set(x, y, GLOW);
}

// a rock column, cave stone with water veins of light
function rockColumn(g: Pix, cx: number, w: number, seed: number, top = 0, bottom = GROUND_Y + 2) {
  const r = rng(seed);
  for (let y = top; y < bottom; y++) {
    const ww = w * (0.55 + 0.45 * Math.abs(y - (top + bottom) / 2) / ((bottom - top) / 2)) + Math.sin(y / 7) * 2;
    const l = Math.round(cx - ww / 2), rr = Math.round(cx + ww / 2);
    g.hline(l, rr, y, ROCK);
    g.hline(l, l + 3, y, ROCK_L);
    g.hline(rr - 3, rr, y, ROCK_D);
  }
  for (let k = 0; k < 3; k++) {
    let x = cx - w / 4 + r() * (w / 2), y = top + 10 + r() * 40;
    for (let i = 0; i < 50 && y < bottom; i++) { g.set(x, y, i % 9 === 0 ? GLOW_HI : GLOW); x += (r() - 0.5) * 2.2; y += 1.4; }
  }
}

// wall: the near cavern. Rock columns, sunken columns, broken pipes, and at the far end the jar's empty cradle.
export function wallLayer10(): Pix {
  const W = LEVEL10_W, g = new Pix(W, 216);
  rockColumn(g, 60, 70, 1021);
  sunkColumn(g, 260, 54, GROUND_Y + 2, 1022);
  brokenPipe(g, 400, 70);
  rockColumn(g, 520, 46, 1023, 0, 60);
  sunkColumn(g, 610, 70, GROUND_Y + 2, 1024);
  brokenPipe(g, 760, 52);
  rockColumn(g, 890, 60, 1025);
  // the far end: the jar's cradle, empty and smoking, cables hanging loose (the jar is in the Pharaoh now)
  const jx = 1080;
  g.rect(jx - 52, 104, 104, 14, STEEL_D); g.hline(jx - 52, jx + 51, 104, STEEL_L);
  for (let x = jx - 52; x < jx + 52; x++) if (Math.floor(x / 6) % 2) g.set(x, 116, hex('#f2c230'));
  g.rect(jx - 42, 36, 6, 68, STEEL); g.rect(jx + 36, 36, 6, 68, STEEL); g.rect(jx - 42, 32, 84, 6, STEEL); g.hline(jx - 42, jx + 41, 32, STEEL_L);
  for (let k = 0; k < 5; k++) g.curve(jx - 24 + k * 12, 0, jx - 30 + k * 14, 50, jx - 20 + k * 10, 80 + (k % 2) * 10, k % 2 ? LED_D : hex('#1a1a24'), 2);
  for (let x = jx - 34; x < jx + 34; x += 8) g.set(x, 110, x % 16 ? RED_LED : LED);
  // a sandy shore line where the cave floor meets the water
  const r = rng(1026);
  for (let x = 0; x < W; x++) {
    const h = 3 + Math.round(Math.abs(Math.sin(x / 23)) * 3);
    for (let y = GROUND_Y - h; y < GROUND_Y + 1; y++) if (!g.alpha(x, y) || y > GROUND_Y - 2) g.set(x, y, r() > 0.85 ? SAND_L : SAND);
  }
  g.outline(P.ink);
  return g;
}

// ground: shallow glowing water over sand, brighter rings where it wells up
export function groundLayer10(): Pix {
  const W = LEVEL10_W, g = new Pix(W, 216);
  const r = rng(1031);
  for (let y = GROUND_Y; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#1c4a7a'), hex('#0e2a54'), (y - GROUND_Y) / 70));
  // the sand bottom showing through in patches
  for (let i = 0; i < 70; i++) {
    const cx = r() * W, cy = GROUND_Y + 8 + r() * 60, rx = 14 + r() * 30, ry = 2 + r() * 4;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d < 1 && x >= 0 && x < W && y < 216) g.set(x, y, mix(g.get(x, y)!, SAND_D, 0.35 * (1 - d)));
    }
  }
  // caustics: little bright squiggles in perspective rows
  for (let y = GROUND_Y + 3, row = 0; y < 216; row++) {
    const step = 6 + row * 2;
    for (let x = (row * 13) % step; x < W; x += step + Math.floor(r() * 8)) {
      const len = 2 + Math.floor(row / 2) + Math.floor(r() * 3);
      g.hline(x, Math.min(W - 1, x + len), y, r() > 0.85 ? hex('#fff1a8', 150) : hex('#5cc8ff', 110));
    }
    y += 3 + Math.floor(row * 0.8);
  }
  // springs welling up through the sand
  for (const [sx, sy] of [[180, 190], [470, 176], [720, 198], [960, 184]] as const) {
    for (const rr of [5, 9, 14]) for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      g.set(Math.round(sx + Math.cos(t) * rr * 2), Math.round(sy + Math.sin(t) * rr * 0.5), hex('#9fe8ff', 170 - rr * 8));
    }
  }
  // the shoreline foam
  for (let x = 0; x < W; x++) if ((x * 7) % 5 < 3) g.set(x, GROUND_Y + 1, hex('#bff0ff', 180));
  return g;
}

// soft sand that grabs your feet (the brawler's pothole)
export function sandPit(): Pix {
  const g = new Pix(36, 12);
  g.ellipse(18, 6, 17, 5, SAND_D);
  g.ellipse(18, 6, 13, 3, hex('#4a3820'));
  for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 4; const rr = 2 + a * 0.3; g.set(Math.round(18 + Math.cos(t) * rr), Math.round(6 + Math.sin(t) * rr * 0.3), SAND); }
  g.set(18, 6, hex('#2a2014'));
  return g;
}

// a fallen drum of an old column: solid, stand on top of it
export function columnStump(): Pix {
  const g = new Pix(48, 26);
  g.rect(3, 6, 42, 18, STONE); g.rect(3, 6, 6, 18, STONE_L); g.rect(39, 6, 6, 18, STONE_D);
  g.ellipse(24, 6, 21, 4, STONE_L); g.ellipse(24, 6, 15, 2, STONE);
  g.rect(3, 13, 42, 4, hex('#5a4626'));
  for (let x = 8; x < 40; x += 6) { g.set(x, 14, P.gold); g.set(x + 1, 15, hex('#5cc8ff')); }
  g.hline(3, 44, 23, hex('#5cc8ff', 160));
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ the Pip army: Pip's fight frames, rearranged for the brawler
export function pipBrawlFrames() {
  const src = pipFrames();
  const at = (anim: string, i: number) => src.frames[src.anims[anim][0] + i];
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, list: Pix[]) => { anims[name] = [frames.length, frames.length + list.length - 1]; frames.push(...list); };
  add('idle', [0, 1, 2, 3].map((i) => at('idle', i)));
  add('walk', [0, 1, 2, 3].map((i) => at('walk', i)));
  add('punch', [at('jab', 0), at('jab', 2), at('jab', 1)]);
  add('throw', [at('cap', 0), at('cap', 1), at('cap', 2)]);
  add('hurt', [at('hurt', 0), at('hurt', 1)]);
  add('dazed', [at('dazed', 0), at('dazed', 1)]);
  add('knockdown', [at('knockdown', 0), at('knockdown', 1), at('getup', 0)]);
  add('taunt', [at('taunt', 0), at('taunt', 1)]);
  return { frames, anims };
}

// ------------------------------------------------------------------ the Pharaoh of DeNile (128x128 frames, feet at y=121)
// Victor, GigaZ and the golden jar, fused: a server-rack body with the jar glowing in its chest, shoulders and
// arms of crushed plastic bottles, a nemes headdress striped in gold and AetherCorp blue, GigaZ's cloud for a
// face, a crook bent out of the selfie stick, a flail of cables with bottle caps, and Victor's rocket boots.
type PhFace = 'calm' | 'grin' | 'angry' | 'hurt' | 'glitch';
type PhTool = 'crook' | 'crookBack' | 'crookSwing' | 'flail' | 'flailUp' | 'flailDown' | 'open' | 'crown' | 'none';
interface PhPose {
  bob?: number; lean?: number; kneel?: number; // 0..1
  fa: [number, number]; ba: [number, number]; // hand offsets from the shoulders
  fTool?: PhTool; bTool?: PhTool;
  step?: number; // -1..1
  glow?: 0 | 1 | 2;
  face?: PhFace;
  sparks?: boolean;
  melt?: number; // 0..1: dissolving into rain
  led?: number;
  beam?: boolean;
}

function crookAt(g: Pix, hx: number, hy: number, ex: number, ey: number) {
  g.line(hx, hy, ex, ey, STEEL_L, 2);
  // the hook at the end, bent selfie-stick steel, the phone still on it
  const dx = ex - hx, dy = ey - hy, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  g.curve(ex, ey, ex + nx * 8 + dx / len * 6, ey + ny * 8 + dy / len * 6, ex + nx * 9, ey + ny * 9, STEEL_L, 2);
  g.rect(Math.round(ex + nx * 9) - 2, Math.round(ey + ny * 9) - 2, 4, 5, P.ink); g.set(Math.round(ex + nx * 9), Math.round(ey + ny * 9), LED);
  for (let k = 0.2; k < 0.9; k += 0.2) g.set(Math.round(hx + dx * k), Math.round(hy + dy * k), P.gold);
}
function flailAt(g: Pix, hx: number, hy: number, dirX: number, dirY: number) {
  g.rect(hx - 1, hy - 1, 3, 3, STEEL_D);
  for (let k = 0; k < 3; k++) {
    const ex = hx + dirX * (16 + k * 3) + (k - 1) * 4, ey = hy + dirY * (16 + k * 3) + (k - 1) * 2;
    g.curve(hx, hy, (hx + ex) / 2 + (k - 1) * 3, (hy + ey) / 2 + 4, ex, ey, k === 1 ? LED_D : hex('#1a1a24'), 1);
    g.circle(ex, ey, 2, P.bottleCap); g.set(ex, ey, P.red);
  }
}

function drawPharaoh(p: PhPose): Pix {
  const g = new Pix(128, 128);
  const r = rng(1100 + (p.led ?? 0));
  const kneel = p.kneel ?? 0;
  const bob = p.bob ?? 0;
  const cx = 62 + (p.lean ?? 0) * 0.5;
  const feet = 121;
  const hipY = 92 + bob + Math.round(kneel * 16);
  const shY = 52 + bob + Math.round(kneel * 16);
  const lean = p.lean ?? 0;
  const shX = cx + lean;
  const step = p.step ?? 0;

  // ---- legs: crushed plastic, rocket boots
  const leg = (dx: number, front: boolean, st: number) => {
    const hx = cx + dx, fx = cx + dx + st * 6 + (kneel > 0.5 && front ? 10 : 0), fy = feet - (kneel > 0.5 && !front ? 0 : 0);
    const ky = kneel > 0.5 ? (front ? hipY + 6 : feet - 4) : (hipY + fy) / 2;
    const kx = kneel > 0.5 ? (front ? hx + 14 : hx - 2) : (hx + fx) / 2 + 2;
    g.curve(hx, hipY, kx, ky, fx, fy - 8, front ? PLASTIC : PLASTIC_D, 9);
    for (let k = 0; k < 4; k++) g.set(Math.round(hx + (kx - hx) * (k / 4) + 2), Math.round(hipY + (ky - hipY) * (k / 4)), PLASTIC_L);
    g.rect(fx - 6, fy - 9, 15, 9, front ? BOOT : BOOT_S);
    g.hline(fx - 5, fx + 8, fy - 5, front ? LED : LED_D);
    g.rect(fx - 9, fy - 6, 3, 4, STEEL_D);
    g.hline(fx - 6, fx + 8, fy - 1, BOOT_S);
  };
  leg(-6, false, -step);
  // ---- back arm (flail)
  const arm = (sx: number, h: [number, number], front: boolean, tool: PhTool | undefined) => {
    const hx = sx + h[0], hy = shY + 4 + h[1];
    const mx = (sx + hx) / 2 + (front ? 0 : -2), my = (shY + 4 + hy) / 2 + 4;
    g.curve(sx, shY + 4, mx, my, hx, hy, front ? PLASTIC : PLASTIC_D, 8);
    // crushed-bottle segments along the arm
    for (let k = 1; k < 4; k++) {
      const t = k / 4, x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * hx, y = (1 - t) * (1 - t) * (shY + 4) + 2 * (1 - t) * t * my + t * t * hy;
      g.hline(Math.round(x - 3), Math.round(x + 3), Math.round(y), front ? PLASTIC_D : hex('#3a6aa8'));
      g.set(Math.round(x - 1), Math.round(y - 2), PLASTIC_L);
    }
    g.rect(hx - 3, hy - 3, 7, 4, P.gold); // gold cuff
    g.circle(hx + 1, hy + 2, 3, front ? PLASTIC_L : PLASTIC);
    if (tool === 'crook') crookAt(g, hx, hy, hx + 4, hy - 30);
    if (tool === 'crookBack') crookAt(g, hx, hy, hx - 20, hy - 24);
    if (tool === 'crookSwing') crookAt(g, hx, hy, hx + 32, hy - 2);
    if (tool === 'flail') flailAt(g, hx, hy, 0.3, 1);
    if (tool === 'flailUp') flailAt(g, hx, hy, -0.4, -1);
    if (tool === 'flailDown') flailAt(g, hx, hy, 1, 0.4);
    if (tool === 'crown') crownAt(g, hx + 6, hy - 10);
  };
  arm(shX - 18, p.ba, false, p.bTool);
  leg(6, true, step);

  // ---- the skirt: pleated plastic labels
  for (let y = hipY - 4; y < hipY + 14; y++) {
    const t = (y - hipY + 4) / 18;
    const half = 16 + Math.round(t * 6);
    for (let x = cx - half; x <= cx + half; x++) g.set(x, y, (x - cx + 40) % 5 === 0 ? PLASTIC_D : (y > hipY + 10 ? hex('#e8f2ff') : PLASTIC_L));
  }
  g.rect(cx - 6, hipY + 2, 13, 5, P.red); // a DeNile label in the middle
  g.hline(cx - 4, cx + 4, hipY + 4, P.white);
  g.rect(cx - 18, hipY - 6, 37, 4, P.gold); g.hline(cx - 18, cx + 18, hipY - 6, P.goldHi);
  for (let x = cx - 16; x < cx + 18; x += 5) g.set(x, hipY - 4, LED_D);

  // ---- the torso: a server rack, the jar in the chest
  const tw = 20;
  for (let y = shY; y < hipY - 5; y++) {
    const t = (y - shY) / (hipY - 5 - shY);
    const half = Math.round(tw * (1 - t * 0.25));
    g.hline(shX - half, cx + half, y, STEEL_D);
    g.hline(shX - half, shX - half + 2, y, STEEL);
  }
  for (let y = shY + 4; y < hipY - 7; y += 4) {
    g.hline(shX - 15, cx + 14, y, hex('#22262f'));
    for (let x = shX - 14; x < cx + 14; x += 3) if (r() > 0.45) g.set(x, y + 2, r() > 0.75 ? RED_LED : r() > 0.4 ? LED : hex('#9aff9a'));
  }
  // the golden jar, set into the chest
  const jx = shX + 3, jy = shY + 20;
  const glow = p.glow ?? 0;
  if (glow > 0) g.ellipse(jx, jy, 15 + glow * 3, 15 + glow * 3, hex('#fff1a8', glow === 2 ? 150 : 45));
  g.ellipse(jx, jy, 11, 11, P.gold);
  g.ellipse(jx - 3, jy - 3, 5, 6, P.goldHi);
  g.ellipse(jx + 4, jy + 4, 4, 4, P.goldMid);
  g.hline(jx - 10, jx + 10, jy - 1, P.blue); g.hline(jx - 10, jx + 10, jy + 1, P.blue);
  for (const [ox, oy] of [[-11, -4], [11, -3], [-9, 7], [10, 7]]) { g.rect(jx + ox - 1, jy + oy - 1, 3, 3, STEEL_L); g.set(jx + ox, jy + oy, LED); }
  if (glow === 2) for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; g.line(jx + Math.cos(t) * 13, jy + Math.sin(t) * 13, jx + Math.cos(t) * 19, jy + Math.sin(t) * 19, hex('#fff1a8', 200), 1); }

  // ---- shoulders: piles of crushed bottles
  for (const [sx, sgn] of [[shX - 18, -1], [shX + 18, 1]] as const) {
    for (let k = 0; k < 4; k++) {
      const bx = sx + sgn * (k % 2) * 4 - 2 + k, by = shY - 2 + Math.floor(k / 2) * 4;
      g.ellipse(bx, by, 6, 3, k % 2 ? PLASTIC : PLASTIC_D); g.hline(bx - 3, bx + 1, by - 2, PLASTIC_L);
      g.rect(bx + sgn * 5, by - 1, 2, 2, P.bottleCap);
    }
  }
  // ---- the broad collar (usekh): gold and blue bands
  for (let k = 0; k < 4; k++) {
    const rr = 14 + k * 3;
    for (let a = 0; a <= 32; a++) {
      const t = Math.PI * (a / 32);
      g.set(Math.round(shX + 2 + Math.cos(t) * rr), Math.round(shY - 3 + Math.sin(t) * rr * 0.45), k % 2 ? LED_D : P.gold);
    }
  }
  // Victor's black feather pin, now on a pharaoh
  g.line(shX + 14, shY + 2, shX + 15, shY + 7, P.ink, 1); g.set(shX + 15, shY + 2, LED);

  // ---- the head: nemes headdress, GigaZ's face, the cable beard
  const hx = shX + 3, hy = shY - 18;
  // lappets hanging down to the shoulders
  for (const s of [-1, 1]) for (let y = hy + 2; y < shY + 6; y++) for (let x = 0; x < 6; x++) g.set(hx + s * (9 + x) - (s > 0 ? 0 : 0), y, (y + Math.floor(y / 1)) % 4 < 2 ? P.gold : LED_D);
  // the headdress cap: flaring stripes
  for (let y = hy - 14; y < hy + 4; y++) {
    const half = 9 + Math.round((y - hy + 14) * 0.45);
    for (let x = hx - half; x <= hx + half; x++) g.set(x, y, (y - hy) % 3 === 0 ? LED_D : P.gold);
    g.set(hx - half, y, P.goldDark); g.set(hx + half, y, P.goldDark);
  }
  // server-light rows blinking in the blue stripes
  for (let y = hy - 12; y < hy + 3; y += 3) for (let x = hx - 10; x < hx + 11; x += 4) if (r() > 0.55) g.set(x, y, LED);
  g.hline(hx - 10, hx + 10, hy - 14, P.goldHi);
  // a lock of Victor's silver swoop poking out
  g.poly([[hx + 4, hy - 13], [hx + 13, hy - 15], [hx + 10, hy - 11]], HAIR);
  // the uraeus: a cobra coiled out of a charging cable, LED eye
  g.curve(hx, hy - 14, hx + 2, hy - 20, hx - 1, hy - 23, hex('#1a1a24'), 2);
  g.rect(hx - 3, hy - 25, 5, 3, hex('#1a1a24')); g.set(hx - 1, hy - 24, RED_LED);
  // the face: a dark screen with GigaZ's cloud on it
  g.ellipse(hx + 2, hy + 4, 8, 9, SCREEN);
  for (let y = hy - 3; y < hy + 12; y += 2) g.hline(hx - 4, hx + 8, y, hex('#13244a'));
  const face = p.face ?? 'calm';
  const fx = hx + 2, fy = hy + 3;
  g.circle(fx - 3, fy + 1, 2, CLOUD); g.circle(fx + 1, fy - 1, 3, CLOUD); g.circle(fx + 4, fy + 1, 2, CLOUD); g.rect(fx - 4, fy + 1, 9, 2, CLOUD);
  if (face === 'hurt') { g.line(fx - 2, fy - 1, fx, fy + 1, GZ_EYE, 1); g.line(fx + 2, fy + 1, fx + 4, fy - 1, GZ_EYE, 1); }
  else if (face === 'angry') { g.set(fx - 1, fy, RED_LED); g.set(fx + 3, fy, RED_LED); g.line(fx - 2, fy - 2, fx, fy - 1, GZ_EYE, 1); g.line(fx + 2, fy - 1, fx + 4, fy - 2, GZ_EYE, 1); }
  else { g.set(fx - 1, fy, GZ_EYE); g.set(fx + 3, fy, GZ_EYE); }
  if (face === 'grin' || face === 'angry') { g.hline(fx - 2, fx + 4, fy + 2, GZ_EYE); g.set(fx - 3, fy + 1, GZ_EYE); g.set(fx + 5, fy + 1, GZ_EYE); }
  else if (face === 'hurt') g.rect(fx, fy + 2, 3, 2, GZ_EYE);
  else g.hline(fx - 1, fx + 3, fy + 2, GZ_EYE);
  // the false beard: a braid of cables
  for (let y = hy + 12; y < hy + 22; y++) { g.hline(hx, hx + 4, y, y % 2 ? hex('#1a1a24') : LED_D); }
  g.hline(hx, hx + 4, hy + 22, P.gold);

  // ---- front arm on top (the crook)
  arm(shX + 18, p.fa, true, p.fTool);

  g.outline(P.ink);
  if (p.sparks) for (const [sx, sy] of [[hx + 14, hy - 6], [shX - 22, shY + 14], [shX + 22, shY + 24], [hx - 12, hy + 8]]) {
    g.set(sx, sy, hex('#fff1a8')); g.set(sx + 1, sy, hex('#ffb040')); g.set(sx, sy + 1, hex('#ffb040')); g.set(sx - 1, sy - 1, LED);
  }
  if (p.face === 'glitch') {
    const copy = new Pix(g.w, g.h); copy.data.set(g.data);
    for (let band = 0; band < 5; band++) {
      const y0 = 20 + Math.floor(r() * 90), h = 1 + Math.floor(r() * 3), dx = r() < 0.5 ? -3 : 3;
      for (let y = y0; y < y0 + h; y++) { for (let x = 0; x < g.w; x++) g.clear(x, y); for (let x = 0; x < g.w; x++) { const c = copy.get(x, y)!; if (c[3]) g.set(x + dx, y, mix(c, band % 2 ? [92, 225, 255, 255] : [255, 90, 200, 255], 0.35)); } }
    }
  }
  if (p.beam) {
    // the drain beam pouring out of the jar
    for (let x = jx + 10; x < 128; x++) {
      const w = 3 + Math.round(Math.sin(x / 3) * 1);
      for (let y = jy - w; y <= jy + w; y++) g.set(x, y, Math.abs(y - jy) < 2 ? hex('#ffffff', 230) : hex('#5ce1ff', 180));
    }
  }
  if (p.melt) {
    // dissolving into rain: rows thin out from the top down, drops fall
    const m = p.melt;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y)!;
      if (!c[3]) continue;
      if (r() < m * (1.2 - y / 128) ) { g.clear(x, y); if (r() < 0.08) g.set(x, Math.min(127, y + 4 + Math.floor(r() * 20)), hex('#9fe8ff', 220)); }
      else g.set(x, y, mix(c, [120, 200, 255, 255], m * 0.6));
    }
  }
  return g;
}

function crownAt(g: Pix, x: number, y: number) {
  // the double crown of DeNile: a gold band, a tall blue top lit like a server, a cable cobra on the front
  g.rect(x - 6, y + 4, 13, 5, P.gold); g.hline(x - 6, x + 6, y + 4, P.goldHi);
  g.poly([[x - 5, y + 4], [x - 3, y - 10], [x + 2, y - 12], [x + 4, y + 4]], LED_D);
  g.poly([[x + 3, y + 4], [x + 7, y - 3], [x + 9, y - 2], [x + 7, y + 4]], P.gold);
  for (let k = -8; k < 2; k += 3) g.set(x, y + k, LED);
  g.set(x - 4, y + 3, RED_LED);
}

export function pharaohFrames() {
  const frames: Pix[] = [];
  const anims: Record<string, [number, number]> = {};
  const add = (name: string, poses: PhPose[]) => { anims[name] = [frames.length, frames.length + poses.length - 1]; for (const p of poses) frames.push(drawPharaoh(p)); };
  const stand = (b: number, led: number, face: PhFace = 'calm'): PhPose => ({ bob: b, fa: [8, 12], fTool: 'crook', ba: [-6, 16], bTool: 'flail', led, face, glow: 1 });
  add('idle', [stand(0, 1), stand(1, 2)]);
  add('walk', [0, 1, 2, 3].map((i) => ({ ...stand(i % 2, 3 + i), step: Math.sin((i / 4) * Math.PI * 2) })));
  // the crook swipe: wound back, swung through, followed through
  add('punch', [
    { lean: -4, fa: [-4, -10], fTool: 'crookBack', ba: [-8, 14], bTool: 'flail', face: 'grin', led: 8, glow: 1 },
    { lean: 6, fa: [18, 2], fTool: 'crookSwing', ba: [-10, 12], bTool: 'flail', face: 'angry', led: 9, glow: 1 },
    { lean: 4, fa: [16, 10], fTool: 'crookSwing', ba: [-8, 14], bTool: 'flail', face: 'grin', led: 10, glow: 1 },
  ]);
  add('throw', [stand(0, 11, 'grin'), stand(1, 12, 'grin'), stand(0, 13, 'grin')]);
  add('hurt', [
    { lean: -6, fa: [4, 6], fTool: 'crook', ba: [-10, 10], bTool: 'flail', face: 'hurt', led: 14, glow: 0, sparks: true },
    { lean: -3, fa: [6, 10], fTool: 'crook', ba: [-8, 14], bTool: 'flail', face: 'hurt', led: 15, glow: 1 },
  ]);
  add('dazed', [
    { lean: -2, fa: [6, 18], fTool: 'crook', ba: [-6, 20], bTool: 'flail', face: 'glitch', led: 16, sparks: true },
    { lean: 2, fa: [8, 18], fTool: 'crook', ba: [-4, 20], bTool: 'flail', face: 'hurt', led: 17 },
  ]);
  add('knockdown', [
    { lean: -8, kneel: 0.4, fa: [2, 4], fTool: 'crook', ba: [-12, 6], bTool: 'flail', face: 'hurt', sparks: true, led: 18 },
    { lean: -2, kneel: 1, fa: [10, 22], fTool: 'crook', ba: [-4, 24], bTool: 'flail', face: 'glitch', sparks: true, led: 19 },
    { lean: 0, kneel: 0.6, fa: [10, 16], fTool: 'crook', ba: [-4, 18], bTool: 'flail', face: 'hurt', led: 20 },
  ]);
  // the flail slam: raised high, slammed into the floor, stuck there (the opening)
  add('slam', [
    { lean: -3, fa: [8, 12], fTool: 'crook', ba: [-2, -26], bTool: 'flailUp', face: 'angry', led: 21, glow: 1 },
    { lean: 8, kneel: 0.3, fa: [10, 14], fTool: 'crook', ba: [22, 26], bTool: 'flailDown', face: 'angry', led: 22, glow: 2 },
    { lean: 7, kneel: 0.4, fa: [8, 18], fTool: 'crook', ba: [20, 28], bTool: 'flailDown', face: 'hurt', led: 23, sparks: true },
  ]);
  // the drain beam: the jar charges, then pours a beam out along the lane
  add('beam', [
    { lean: -2, fa: [-4, 4], fTool: 'crook', ba: [-14, 2], bTool: 'flail', face: 'grin', led: 24, glow: 2 },
    { lean: 2, fa: [-6, 6], fTool: 'crook', ba: [-16, 4], bTool: 'flail', face: 'grin', led: 25, glow: 2, beam: true },
  ]);
  // calling the army: both arms up
  add('call', [
    { bob: -1, fa: [6, -24], fTool: 'crook', ba: [-4, -26], bTool: 'flailUp', face: 'grin', led: 26, glow: 2 },
    { bob: -1, fa: [8, -26], fTool: 'crook', ba: [-2, -24], bTool: 'flailUp', face: 'calm', led: 27, glow: 1 },
  ]);
  // draining the Keeper: the crook dropped, a hand held out at him
  add('drain', [
    { lean: 4, fa: [26, -6], fTool: 'open', ba: [-8, 14], bTool: 'flail', face: 'grin', led: 28, glow: 2 },
    { lean: 5, fa: [27, -7], fTool: 'open', ba: [-8, 14], bTool: 'flail', face: 'calm', led: 29, glow: 2 },
  ]);
  // beaten: kneeling, then holding out the crown ("Be king with me.")
  add('kneel', [{ kneel: 1, lean: -2, fa: [10, 22], fTool: 'none', ba: [-4, 24], bTool: 'none', face: 'hurt', led: 30, glow: 1, sparks: true }]);
  add('crown', [
    { kneel: 1, lean: 2, fa: [22, 2], fTool: 'crown', ba: [-4, 24], bTool: 'none', face: 'calm', led: 31, glow: 2 },
    { kneel: 1, lean: 3, fa: [23, 1], fTool: 'crown', ba: [-4, 24], bTool: 'none', face: 'calm', led: 32, glow: 1 },
  ]);
  add('melt', [0.25, 0.5, 0.78].map((m, i) => ({ kneel: 1, lean: 0, fa: [10, 22], fTool: 'none', ba: [-4, 24], bTool: 'none', face: 'hurt', led: 33 + i, melt: m }) as PhPose));
  return { frames, anims };
}

export function crownProp(): Pix {
  const g = new Pix(24, 28);
  crownAt(g, 11, 16);
  g.outline(P.ink);
  drawSparkle(g, 6, 6, 1);
  return g;
}

// ------------------------------------------------------------------ Mane, drained: a crumpled can (32x32, 2 frames)
export function crumpledCan(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(32, 32);
    // the can, crushed and bent, lying on its side
    g.poly([[4, 26], [8, 18], [14, 20], [18, 15], [26, 17], [28, 26]], P.canShade);
    g.poly([[6, 25], [9, 20], [14, 22], [18, 18], [24, 19], [26, 25]], P.can);
    g.line(9, 20, 12, 25, P.canDark, 1); g.line(18, 18, 17, 25, P.canDark, 1); g.line(14, 21, 22, 23, P.canDark, 1);
    g.rect(11, 22, 8, 2, P.label); g.set(14, 22, P.labelGold);
    g.ellipse(27, 21, 2, 4, P.rimDark); g.ellipse(5, 23, 2, 3, P.rim);
    // one glove, limp; the grill, dull
    g.curve(20, 24, 24, 28, 29, 28, P.ink, 1); g.circle(29, 28, 2, P.gloveShade);
    g.hline(15, 18, 20, f ? P.goldMid : P.goldDark);
    // the eyes: X'd out, or flickering
    g.set(13, 19, P.ink); g.set(15, 19, P.ink);
    if (f) { g.set(13, 19, P.goldHi); }
    g.outline(P.ink);
    if (f) for (const [x, y] of [[10, 12], [20, 9], [24, 13]]) g.set(x, y, hex('#fff1a8', 200));
    return g;
  });
}

// ------------------------------------------------------------------ the fight arena (phase 1): a sand bar in the glowing aquifer, the jar lit behind (480x216)
export function sourceArena(): Pix {
  const W = 480, g = new Pix(W, 216);
  const sky = skyLayer10(), far = farLayer10();
  g.blit(sky, 0, 0);
  for (let y = 0; y < 216; y++) for (let x = 0; x < W; x++) { const c = far.get(x + 120, y)!; if (c[3]) g.set(x, y, c); }
  // two sunk columns framing the stage, a broken pipe
  sunkColumn(g, 60, 48, 160, 1201);
  sunkColumn(g, 430, 62, 160, 1202);
  brokenPipe(g, 150, 64);
  // the golden jar on its cradle, glowing, cables up into the dark (The Gigantum is up there)
  for (let y = 10; y < 150; y++) for (let x = 250; x < 470; x++) {
    const d = Math.hypot(x - 382, (y - 92) * 1.1);
    if (d < 80) g.set(x, y, hex('#f5c542', Math.round(Math.max(0, 1 - d / 80) * 70)));
  }
  const jar = jarRig();
  g.blit(jar, 310, 36);
  // the sand bar: the floor they fight on, wet at the edges
  const r = rng(1203);
  for (let y = 150; y < 216; y++) {
    const t = (y - 150) / 66;
    const half = 190 + t * 70;
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - 240);
      if (dx < half) g.set(x, y, r() > 0.92 ? SAND_L : r() < 0.08 ? SAND_D : mix(SAND, SAND_D, t * 0.4));
      else if (dx < half + 8) g.set(x, y, SAND_W);
      else g.set(x, y, mix(hex('#1c4a7a'), hex('#0e2a54'), t));
    }
  }
  for (let x = 0; x < W; x++) if (x % 3) g.set(x, 150, hex('#bff0ff', 160));
  // ripples in the water at the sides
  for (let i = 0; i < 40; i++) { const y = 156 + Math.floor(r() * 56), x = r() < 0.5 ? Math.floor(r() * 40) : 440 + Math.floor(r() * 40); g.hline(x, x + 4, y, hex('#5cc8ff', 140)); }
  return g;
}

// ------------------------------------------------------------------ the intro shot: the city on top, the clay, the sand, and the glowing sea (480x216)
export function sourceExt(): Pix {
  const W = 480, g = new Pix(W, 216);
  const r = rng(1211);
  // night sky and skyline on top
  for (let y = 0; y < 40; y++) g.hline(0, W - 1, y, mix(hex('#070a1c'), hex('#1c2550'), y / 40));
  for (let i = 0; i < 40; i++) g.set(Math.floor(r() * W), Math.floor(r() * 20), hex('#c8d0ff', 120));
  for (const [x, w, h] of [[20, 26, 22], [52, 18, 30], [80, 30, 18], [300, 24, 28], [330, 16, 34], [360, 28, 20], [420, 22, 26]] as const) {
    g.rect(x, 40 - h, w, h, hex('#141a36'));
    for (let wy = 40 - h + 3; wy < 38; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (r() > 0.5) g.set(wx, wy, hex('#f0c060'));
  }
  // the Memphis Pyramid and the bridge's M lights
  for (let y = 0; y < 26; y++) g.hline(190 - y, 190 + y, 14 + y, mix(hex('#4a5a78'), hex('#2a3450'), y / 26));
  g.set(190, 13, hex('#ffffff'));
  g.curve(226, 40, 246, 18, 266, 40, hex('#f5c542'), 1); g.curve(262, 40, 282, 20, 302, 40, hex('#f5c542'), 1);
  // the ground line, then the layers: soil, the gray clay that shields the water, the sand that filters it
  g.hline(0, W - 1, 40, hex('#3a3a4a'));
  strata(g, 0, W, [41, 66], [66, 86], [86, 128], 1212);
  // a well pipe reaching down from the city to the water
  for (let y = 36; y < 140; y++) { g.hline(398, 401, y, STEEL); g.set(398, y, STEEL_L); }
  // water seeping down through the sand, more and more of it
  for (let i = 0; i < 400; i++) { const y = 96 + Math.floor(r() * 34), x = Math.floor(r() * W); if (r() < (y - 96) / 34) g.set(x, y, hex('#5cc8ff', 140 + Math.floor(r() * 100))); }
  // the sea under the city
  for (let y = 128; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#2a7ad8'), hex('#081a40'), (y - 128) / 88));
  for (let x = 0; x < W; x++) { g.set(x, 128, GLOW_HI); if (x % 2) g.set(x, 129, GLOW); }
  for (let i = 0; i < 160; i++) { const y = 132 + Math.floor(r() * 80), x = Math.floor(r() * W), len = 2 + Math.floor(r() * 8); g.hline(x, Math.min(W - 1, x + len), y, r() > 0.8 ? hex('#fff1a8', 190) : hex('#9fe8ff', 120)); }
  // the old columns standing in it, far off
  for (const cx of [90, 380]) for (let y = 136; y < 216; y++) { g.hline(cx - 6, cx + 6, y, mix(hex('#6a5a3a'), hex('#1a2a40'), (y - 136) / 80)); }
  return g;
}

// ------------------------------------------------------------------ the ending: inside Uncle T's Pit, the morning after (480x216 back, a counter front)
export function pitBack(): Pix {
  const W = 480, g = new Pix(W, 216);
  // warm wood paneling
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#5a3a24'), hex('#3a2416'), y / 216));
  for (let x = 0; x < W; x += 16) g.vline(x, 30, 215, hex('#2e1c10'));
  g.rect(0, 0, W, 30, hex('#2a1a10')); g.hline(0, W - 1, 30, hex('#7a5a3a'));
  // the window: morning over Park & Airways
  const wx = 330, wy = 46, ww = 120, wh = 70;
  for (let y = wy; y < wy + wh; y++) g.hline(wx, wx + ww, y, mix(hex('#ffb070'), hex('#ffe8b0'), (y - wy) / wh));
  g.rect(wx, wy + wh - 18, ww + 1, 18, hex('#6a6a7a'));
  g.rect(wx + 10, wy + 20, 18, 34, hex('#8a6a5a')); g.rect(wx + 70, wy + 14, 28, 40, hex('#7a5a5a'));
  g.rect(wx + 40, wy + 30, 2, 26, hex('#3a3a46')); g.rect(wx + 32, wy + 26, 18, 6, hex('#2a8a4a')); text(g, 'PARK', wx + 33, wy + 26, P.white);
  g.circle(wx + 100, wy + 12, 8, hex('#fff1a8'));
  for (let k = 0; k <= 2; k++) { g.vline(wx + k * 60, wy, wy + wh, hex('#2a1a10')); }
  g.rect(wx - 3, wy - 3, ww + 7, 3, hex('#2a1a10')); g.rect(wx - 3, wy + wh, ww + 7, 4, hex('#2a1a10'));
  // the menu board
  const mx = 40, my = 38, mw = 240, mh = 66;
  g.rect(mx, my, mw, mh, hex('#141414')); g.rect(mx + 2, my + 2, mw - 4, mh - 4, hex('#1c2018'));
  const t1 = "UNCLE T'S PIT";
  text(g, t1, mx + mw / 2 - Math.round(textWidth(t1) / 2), my + 6, P.gold);
  const rows = [['RIBS', '12'], ['WINGS  LEMON PEPPER', '9'], ['BRISKET', '14'], ['MEMPHYS WATER', '2']];
  rows.forEach(([a, b], i) => { text(g, a, mx + 10, my + 20 + i * 10, P.white); text(g, b, mx + mw - 10 - textWidth(b), my + 20 + i * 10, P.goldHi); });
  // a framed photo of a young Uncle T with a gold can (the last Keeper)
  g.rect(296, 50, 24, 30, P.gold); g.rect(298, 52, 20, 26, hex('#3a3a4a'));
  g.circle(305, 60, 3, P.skin1); g.rect(302, 63, 7, 10, P.apron); g.rect(311, 66, 3, 5, P.gold);
  // the kitchen door, the smoker's glow through the pass
  g.rect(4, 110, 30, 50, hex('#2a1a10')); g.rect(8, 114, 22, 14, hex('#ff8a3a', 160));
  return g;
}
export function pitCounter(): Pix {
  const W = 480, g = new Pix(W, 74);
  g.rect(0, 6, W, 68, hex('#6a4426'));
  for (let x = 0; x < W; x += 24) g.vline(x, 8, 73, hex('#4a2e18'));
  g.rect(0, 0, W, 7, hex('#c8ccd8')); g.hline(0, W - 1, 0, P.white); g.hline(0, W - 1, 6, hex('#8a8e98'));
  return g;
}
export function counterStuff(): Pix {
  const g = new Pix(480, 30);
  // register (left)
  g.rect(36, 6, 40, 22, hex('#3a3a46')); g.rect(40, 2, 32, 8, hex('#2a2a34')); g.rect(44, 4, 24, 4, hex('#5ce1ff', 200));
  // sauce bottles
  for (const [x, c] of [[110, P.sauce], [118, P.red], [126, hex('#e0a82e')]] as const) { g.rect(x, 12, 6, 16, c); g.rect(x + 1, 8, 4, 4, P.white); }
  // a stack of to-go boxes
  for (let k = 0; k < 3; k++) { g.rect(360, 22 - k * 7, 36, 6, P.plate); g.hline(360, 395, 22 - k * 7, P.plateShade); }
  g.rect(410, 16, 14, 12, P.white); g.hline(410, 423, 18, P.plateShade); // napkins
  g.outline(P.ink);
  return g;
}

// ------------------------------------------------------------------ the credits' last card frame (a big fact panel)
export function finalCard(): Pix {
  const g = new Pix(300, 96);
  g.rect(0, 0, 300, 96, P.gold); g.rect(2, 2, 296, 92, hex('#0b0f26'));
  g.rect(4, 4, 292, 12, hex('#141c40'));
  const t = 'WHAT THE WATER REMEMBERS';
  text(g, t, 150 - Math.round(textWidth(t) / 2), 6, P.goldHi);
  g.poly([[20, 34], [13, 50], [27, 50]], GLOW); g.circle(20, 51, 7, GLOW); g.set(17, 47, P.white);
  g.poly([[280, 34], [273, 50], [287, 50]], GLOW); g.circle(280, 51, 7, GLOW); g.set(277, 47, P.white);
  return g;
}
