// Mission 9, The Gigantum: the shooter's second skin. Inside AetherCorp's data center: server racks with blinking
// lights, coolant pipes running down to the aquifer, memory banks full of Memphis, security drones, and GigaZ's
// cooling core (a frozen cloud) down in cold storage. Billboards face the camera, feet on the bottom row.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';

const INK = P.ink;
const T = 64;

// data center palette: cold navy panels, white AetherCorp plastic, cyan LEDs, frost
const PNL = hex('#2a3048'), PNL_D = hex('#1c2034'), PNL_H = hex('#3c4462');
const AE = hex('#eef2f8'), AE_S = hex('#b8c2d4'), AE_D = hex('#8a94aa');
const LED = hex('#5ce1ff'), LED_D = hex('#2a7ad8'), LED_G = hex('#3ce07a'), LED_R = hex('#ff4a5a');
const RACK = hex('#14182a'), RACK_H = hex('#2a3048');
const COOL = hex('#5a8ad0'), COOL_D = hex('#34589a'), COOL_H = hex('#a8ccf4');
const FROST = hex('#dff6ff'), FROST_D = hex('#a8d8f0'), ICE = hex('#bfe8ff');
const STEEL = hex('#8a8e98'), STEEL_D = hex('#5a5e6a'), STEEL_H = hex('#c4c8d2');
const SKY = hex('#e8f4ff'), SKY_S = hex('#a8c8ec'), EYE = hex('#2a7ad8');

function panel(g: Pix, seed: number) {
  const r = rng(seed);
  g.rect(0, 0, T, T, PNL);
  for (const y of [0, 32]) { g.hline(0, T - 1, y, PNL_D); g.hline(0, T - 1, y + 1, PNL_H); }
  for (const x of [0, 32]) g.vline(x, 0, T - 1, PNL_D);
  // a thin cyan seam at waist height, the AetherCorp look
  g.hline(0, T - 1, 40, LED_D); g.hline(0, T - 1, 41, hex('#1a3a6a'));
  for (let i = 0; i < 40; i++) g.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? PNL_D : PNL_H);
}
function plate(g: Pix, lines: [string, RGBA][], bg: RGBA, frame: RGBA, y0 = 10) {
  g.rect(4, y0 - 4, 56, lines.length * 10 + 6, frame);
  g.rect(6, y0 - 2, 52, lines.length * 10 + 2, bg);
  lines.forEach(([s, c], i) => text(g, s, Math.round(32 - textWidth(s) / 2), y0 + i * 10, c));
}
// the smiling cloud (GigaZ), any size
function cloud(g: Pix, cx: number, cy: number, s: number, c: RGBA = SKY, shade: RGBA = SKY_S) {
  g.circle(cx - 9 * s, cy + 2 * s, 7 * s, c); g.circle(cx, cy - 3 * s, 10 * s, c); g.circle(cx + 9 * s, cy + 2 * s, 7 * s, c);
  g.rect(cx - 14 * s, cy + 2 * s, 28 * s, 7 * s, c);
  g.rect(cx - 14 * s, cy + 7 * s, 28 * s, 2 * s, shade);
}
function face(g: Pix, cx: number, cy: number, s: number, mood: 'smile' | 'glow' | 'wince' | 'o' | 'melt') {
  const e = Math.max(1, Math.round(1.5 * s));
  const eyeC = mood === 'glow' ? LED : EYE;
  if (mood === 'wince') { g.line(cx - 6 * s, cy - 2 * s, cx - 3 * s, cy, EYE, e); g.line(cx + 6 * s, cy - 2 * s, cx + 3 * s, cy, EYE, e); }
  else { g.circle(cx - 4 * s, cy - 1 * s, e, eyeC); g.circle(cx + 4 * s, cy - 1 * s, e, eyeC); }
  if (mood === 'glow') { g.circle(cx - 4 * s, cy - 1 * s, Math.max(1, e - 1), P.white); g.circle(cx + 4 * s, cy - 1 * s, Math.max(1, e - 1), P.white); }
  if (mood === 'o') g.ellipse(cx, cy + 4 * s, 3 * s, 3 * s, EYE);
  else if (mood === 'melt') g.line(cx - 4 * s, cy + 5 * s, cx + 4 * s, cy + 3 * s, EYE, e);
  else if (mood === 'wince') g.hline(cx - 4 * s, cx + 4 * s, cy + 4 * s, EYE);
  else { const n = Math.round(5 * s); for (let x = -n; x <= n; x++) { const y = cy + 3 * s + Math.round(2 * s * (1 - (x * x) / (n * n))); g.rect(cx + x, y, 1, Math.max(1, Math.round(s * 0.8)), EYE); } }
}

// ------------------------------------------------------------------ wall textures (64x64 each, same slots as the plant)
// 0 panel, 1 server rack, 2 glass door, 3 cold-aisle warning, 4 window onto the racks, 5 AetherCorp poster,
// 6 coolant source sign, 7 GigaZ screen, 8 coolant pipes, 9 locked door, 10 memory archive shelves,
// 11 blast door, 12 cold storage sign, 13 Memphis upload board, 14 server rack (lights blink), 15 frozen panel
function rack(g: Pix, blink: number) {
  const r = rng(77 + blink);
  g.rect(0, 0, T, T, RACK);
  for (const x of [0, 31, 32, 63]) g.vline(x, 0, T - 1, RACK_H);
  // stacked servers, two columns
  for (let col = 0; col < 2; col++) for (let y = 3; y < T - 3; y += 6) {
    const x0 = 3 + col * 31;
    g.rect(x0, y, 27, 5, hex('#1e2338')); g.hline(x0, x0 + 26, y, hex('#343a56'));
    for (let k = 0; k < 6; k++) g.vline(x0 + 9 + k * 2, y + 1, y + 3, hex('#141828'));
    const on = r();
    g.set(x0 + 2, y + 2, on < 0.6 ? LED_G : on < 0.9 ? LED : LED_R);
    if (r() < 0.6) g.set(x0 + 4, y + 2, r() < 0.5 ? LED : LED_G);
    if (r() < 0.3) g.set(x0 + 24, y + 2, LED);
  }
}
function wallTex(i: number): Pix {
  const g = new Pix(T, T);
  switch (i) {
    case 0: panel(g, 3); break;
    case 1: rack(g, 0); break;
    case 14: rack(g, 1); break;
    case 2: case 9: {
      // glass sliding door in a white frame, a light on top
      g.rect(0, 0, T, T, AE_D); g.rect(3, 2, 58, 62, AE_S);
      g.rect(7, 10, 50, 54, hex('#1a2c4c')); g.rect(9, 12, 46, 52, hex('#24406a'));
      for (let k = 0; k < 3; k++) g.line(14 + k * 14, 14, 6 + k * 14, 62, [255, 255, 255, 40]);
      g.vline(32, 10, 63, AE_D);
      const lamp = i === 9 ? LED_R : LED;
      g.rect(26, 3, 12, 4, lamp); g.rect(27, 4, 4, 1, P.white);
      if (i === 9) { g.rect(22, 34, 20, 9, hex('#3a0e18')); text(g, 'LOCK', 22, 35, LED_R); }
      break;
    }
    case 3: {
      panel(g, 5);
      for (let x = -T; x < T; x += 12) for (let y = 0; y < 14; y++) g.hline(x + y, x + y + 5, y + 46, FROST);
      for (let x = 0; x < T; x++) for (let y = 46; y < 60; y++) { const c = g.get(x, y)!; if (c[0] !== FROST[0]) g.set(x, y, LED_D); }
      g.rect(0, 45, T, 1, INK); g.rect(0, 60, T, 4, INK);
      plate(g, [['COLD', P.white], ['AISLE', LED]], hex('#14182a'), LED_D, 12);
      break;
    }
    case 4: {
      // a window onto the server hall: rows of racks fading into blue
      panel(g, 7);
      g.rect(4, 6, 56, 34, AE_S); g.rect(6, 8, 52, 30, hex('#0b1430'));
      for (let k = 0; k < 6; k++) { const x = 8 + k * 9, h = 18 - Math.abs(k - 2.5) * 2; g.rect(x, 34 - h, 6, h, hex('#1c2440')); for (let y = 34 - h + 2; y < 33; y += 3) g.set(x + 1 + (y % 2), y, k % 2 ? LED : LED_G); }
      for (let k = 0; k < 4; k++) g.line(10 + k * 12, 9, 4 + k * 12, 37, [255, 255, 255, 40]);
      break;
    }
    case 5: {
      // the AetherCorp billboard line
      panel(g, 9);
      g.rect(1, 3, 62, 54, AE); g.rect(2, 4, 60, 52, hex('#141c40'));
      cloud(g, 32, 13, 0.5); g.set(30, 12, EYE); g.set(34, 12, EYE);
      text(g, 'THE CLOUD', 32 - Math.round(textWidth('THE CLOUD') / 2), 21, P.white);
      text(g, 'REMEMBERS', 32 - Math.round(textWidth('REMEMBERS') / 2), 30, LED);
      text(g, 'SO YOU', 32 - Math.round(textWidth('SO YOU') / 2), 39, P.white);
      text(g, "DON'T.", 32 - Math.round(textWidth("DON'T.") / 2), 47, LED);
      break;
    }
    case 6: {
      // villain-voiced: they pull the coolant straight out of the aquifer
      panel(g, 11);
      plate(g, [['COOLANT', P.white], ['SOURCE:', P.white], ['MEMPHIS', LED], ['SANDS', LED], ['AQUIFER', LED]], hex('#1d2c58'), AE_S, 8);
      break;
    }
    case 7: {
      g.rect(0, 0, T, T, hex('#1a1e2a'));
      g.rect(4, 6, 56, 40, LED); g.rect(6, 8, 52, 36, hex('#141c40'));
      cloud(g, 32, 24, 0.85); face(g, 32, 25, 0.8, 'smile');
      g.rect(20, 48, 24, 4, STEEL_D); g.rect(28, 52, 8, 12, STEEL_D);
      break;
    }
    case 8: {
      // coolant pipes, frosted, running down to the aquifer
      panel(g, 13);
      for (const [x, w] of [[8, 12], [30, 16], [52, 8]] as const) {
        g.rect(x, 0, w, T, COOL); g.vline(x + 1, 0, T - 1, COOL_H); g.vline(x + w - 1, 0, T - 1, COOL_D);
        for (let y = 6; y < T; y += 20) { g.rect(x - 1, y, w + 2, 4, STEEL); g.hline(x - 1, x + w, y, STEEL_H); }
        for (let k = 0; k < 6; k++) g.set(x + 2 + ((k * 5) % (w - 3)), 4 + k * 10, FROST);
      }
      text(g, 'H2O', 31, 30, FROST);
      g.rect(0, 58, T, 6, FROST_D); for (let x = 0; x < T; x += 5) g.vline(x, 54 + (x % 3), 58, FROST);
      break;
    }
    case 10: {
      // memory archive: shelves of drives labeled with dates nobody remembers
      g.rect(0, 0, T, T, RACK);
      for (let y = 2; y < T; y += 15) {
        g.hline(0, T - 1, y + 13, STEEL_D);
        for (let x = 2; x < T - 4; x += 5) { g.rect(x, y + 1, 4, 12, (x + y) % 3 ? AE_S : AE); g.set(x + 1, y + 3, (x * y) % 4 ? LED : LED_G); }
      }
      break;
    }
    case 11: {
      g.rect(0, 0, T, T, STEEL_D);
      for (let y = 0; y < 56; y += 4) { g.hline(2, 61, y, STEEL); g.hline(2, 61, y + 1, STEEL_H); }
      g.rect(0, 56, T, 8, INK); for (let x = 0; x < T; x += 8) g.rect(x, 57, 4, 6, LED_D);
      break;
    }
    case 12: {
      panel(g, 15);
      plate(g, [['COLD', LED], ['STORAGE', P.white], ['STAIRS', AE_S], ['DOWN', AE_S]], hex('#14182a'), LED, 12);
      break;
    }
    case 13: {
      // the city's upload, on a board
      panel(g, 17);
      g.rect(4, 6, 56, 46, AE_S); g.rect(6, 8, 52, 42, hex('#0b1430'));
      text(g, 'MEMPHIS', 32 - Math.round(textWidth('MEMPHIS') / 2), 11, P.white);
      text(g, 'UPLOAD', 32 - Math.round(textWidth('UPLOAD') / 2), 20, P.white);
      g.rect(9, 31, 46, 7, hex('#1c2440')); g.rect(10, 32, 40, 5, LED);
      text(g, '87%', 32 - Math.round(textWidth('87%') / 2), 40, LED);
      break;
    }
    case 15: {
      // a panel crusted over with ice
      panel(g, 19);
      const r = rng(91);
      for (let k = 0; k < 14; k++) { const x = Math.floor(r() * T), y = Math.floor(r() * T), s = 4 + Math.floor(r() * 9); g.poly([[x, y - s], [x + s * 0.6, y], [x, y + s], [x - s * 0.6, y]], k % 3 ? [191, 232, 255, 170] : [223, 246, 255, 210]); }
      g.rect(0, 56, T, 8, FROST_D); for (let x = 0; x < T; x += 4) g.vline(x, 50 + (x * 7) % 6, 56, FROST);
      for (let x = 2; x < T; x += 7) g.vline(x, 0, 3 + (x % 5), FROST);
      break;
    }
  }
  return g;
}
export function gigWalls(): Pix[] { return Array.from({ length: 16 }, (_, i) => wallTex(i)); }

// ------------------------------------------------------------------ floor and ceiling (same slots as the plant)
// 0 raised floor tile, 1 cable tray grate, 2 cold vent, 3 coolant frost (slow), 4 ceiling, 5 ceiling light, 6 hazard
export function gigFloors(): Pix[] {
  const out: Pix[] = [];
  const tile = new Pix(T, T);
  tile.rect(0, 0, T, T, hex('#3a4054'));
  for (const v of [0, 32]) { tile.hline(0, T - 1, v, hex('#24283a')); tile.vline(v, 0, T - 1, hex('#24283a')); tile.hline(0, T - 1, v + 1, hex('#4a5068')); }
  out.push(tile);
  const tray = tile.scaled(1);
  tray.rect(8, 0, 48, T, hex('#1a1e2c'));
  for (let y = 0; y < T; y += 6) tray.hline(8, 55, y, STEEL_D);
  for (let y = 3; y < T; y += 12) { tray.hline(14, 50, y, LED_D); tray.hline(14, 50, y + 1, hex('#e04a8a')); }
  out.push(tray);
  const vent = tile.scaled(1);
  vent.rect(10, 10, 44, 44, hex('#101424'));
  for (let y = 13; y < 52; y += 4) vent.rect(12, y, 40, 2, hex('#5ce1ff'));
  vent.hline(10, 53, 10, STEEL); vent.vline(10, 10, 53, STEEL);
  out.push(vent);
  const frost = tile.scaled(1);
  frost.ellipse(32, 32, 27, 21, [191, 232, 255, 170]); frost.ellipse(22, 24, 9, 5, [255, 255, 255, 140]);
  for (let k = 0; k < 8; k++) frost.line(32, 32, 32 + Math.cos(k) * 22, 32 + Math.sin(k) * 16, [255, 255, 255, 90]);
  out.push(frost);
  const ceil = new Pix(T, T);
  ceil.rect(0, 0, T, T, hex('#1a1e2c'));
  ceil.hline(0, T - 1, 0, hex('#10131e')); ceil.vline(0, 0, T - 1, hex('#10131e'));
  ceil.rect(0, 28, T, 8, hex('#262c40')); for (let x = 2; x < T; x += 6) ceil.vline(x, 28, 35, hex('#10131e')); // a cable tray overhead
  out.push(ceil);
  const light = ceil.scaled(1);
  light.rect(6, 22, 52, 20, hex('#5c7aa8')); light.rect(8, 24, 48, 16, hex('#bff2ff')); light.rect(10, 28, 44, 8, P.white);
  out.push(light);
  const haz = tile.scaled(1);
  for (let x = -T; x < T * 2; x += 16) for (let y = 0; y < T; y++) haz.hline(x + y, x + y + 6, y, LED_D);
  out.push(haz);
  return out;
}

// ------------------------------------------------------------------ props
export function coolPipe(): Pix {
  // a coolant pipe running floor to ceiling, frosted where it's coldest
  const g = new Pix(24, 96);
  g.rect(3, 0, 18, 96, COOL); g.vline(5, 0, 95, COOL_H); g.vline(6, 0, 95, COOL_H); g.vline(19, 0, 95, COOL_D);
  for (const y of [8, 46, 86]) { g.rect(1, y, 22, 6, STEEL); g.hline(1, 22, y, STEEL_H); g.hline(1, 22, y + 5, STEEL_D); }
  for (let y = 60; y < 86; y += 3) for (let x = 4; x < 20; x += 4) if ((x + y) % 7 < 3) g.set(x, y, FROST);
  text(g, 'H', 9, 20, FROST); text(g, '2', 9, 28, FROST); text(g, 'O', 9, 36, FROST);
  g.rect(3, 90, 18, 6, FROST_D);
  g.outline(INK);
  return g;
}
export function rackProp(): Pix {
  // a free-standing server cabinet
  const g = new Pix(40, 72);
  g.rect(2, 2, 36, 70, RACK); g.rect(2, 2, 36, 3, RACK_H); g.vline(2, 2, 71, RACK_H);
  const r = rng(303);
  for (let y = 8; y < 66; y += 5) { g.rect(5, y, 30, 4, hex('#1e2338')); g.set(7, y + 1, r() < 0.7 ? LED_G : LED); if (r() < 0.5) g.set(9, y + 1, LED); for (let k = 0; k < 5; k++) g.vline(16 + k * 3, y + 1, y + 2, hex('#141828')); }
  cloud(g, 20, 4, 0.18);
  g.outline(INK);
  return g;
}
export function aetherCrate(): Pix {
  const g = new Pix(48, 48);
  g.rect(2, 6, 44, 42, AE); g.rect(2, 6, 44, 3, P.white); g.rect(2, 44, 44, 4, AE_S);
  g.vline(2, 6, 47, P.white); g.vline(45, 6, 47, AE_D);
  g.hline(3, 44, 24, AE_S); g.rect(20, 6, 8, 42, hex('#d8dee8'));
  cloud(g, 24, 30, 0.45, LED, LED_D);
  text(g, 'FRAGILE', 24 - Math.round(textWidth('FRAGILE') / 2), 11, AE_D);
  g.outline(INK);
  return g;
}
export function lampCold(): Pix {
  const g = new Pix(24, 40);
  g.vline(12, 0, 22, hex('#3a3a46'));
  g.poly([[4, 32], [8, 22], [16, 22], [20, 32]], hex('#2a3048'));
  g.rect(7, 32, 10, 3, hex('#bff2ff')); g.rect(9, 33, 6, 2, P.white);
  for (let k = 0; k < 6; k++) g.set(6 + k * 2, 37 + (k % 2), [191, 242, 255, 120]);
  return g;
}

// a memory bank (48x80): a tall cabinet with a screen and an upload bar. 0-1 uploading (blinks), 2 restored (gold), 3 hit
export function memBank(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(48, 80);
    const gold = f === 2;
    const body = gold ? hex('#3a2a14') : RACK, trim = gold ? P.goldMid : LED_D;
    g.rect(4, 4, 40, 76, body); g.rect(4, 4, 40, 3, trim); g.vline(4, 4, 79, trim); g.vline(43, 4, 79, trim);
    // the screen
    g.rect(8, 10, 32, 22, gold ? P.goldDark : hex('#0b1430'));
    g.rect(10, 12, 28, 18, gold ? hex('#4a3410') : hex('#141c40'));
    if (gold) {
      // the memories going home: a gold drop and sparkles
      g.poly([[24, 13], [19, 22], [29, 22]], P.gold); g.circle(24, 23, 5, P.gold); g.set(22, 21, P.goldHi); g.set(22, 22, P.white);
      drawSparkle(g, 13, 15, 1); drawSparkle(g, 34, 26, 1);
    } else {
      cloud(g, 24, 17, 0.28); face(g, 24, 17, 0.3, 'smile');
      g.rect(12, 25, 24, 3, hex('#1c2440')); g.rect(12, 25, f === 1 ? 20 : 19, 3, LED);
    }
    // drive bays
    for (let y = 36; y < 76; y += 5) {
      g.rect(8, y, 32, 4, gold ? hex('#4a3618') : hex('#1e2338'));
      g.set(10, y + 1, gold ? P.goldHi : (y + f) % 10 < 5 ? LED : LED_G);
      if (!gold && (y * 3 + f) % 7 < 3) g.set(12, y + 1, LED);
    }
    if (f === 3) g.rect(8, 10, 32, 22, P.white);
    if (gold) for (let k = 0; k < 4; k++) drawSparkle(g, 6 + k * 12, 2 + (k % 2) * 4, 1);
    g.outline(INK);
    return g;
  });
}

// a chiller (64x72) that keeps the core frozen: 0-1 running (the fan turns), 2 broken (steam, red light)
export function chiller(): Pix[] {
  return [0, 1, 2].map((f) => {
    const g = new Pix(64, 72);
    const broken = f === 2;
    // the pipe up to the ceiling and over to the core
    g.rect(26, 0, 12, 24, broken ? STEEL_D : COOL); g.vline(28, 0, 23, broken ? STEEL : COOL_H);
    for (let y = 2; y < 22; y += 5) g.set(30 + (y % 3), y, FROST);
    // the box
    g.rect(4, 22, 56, 50, AE_S); g.rect(4, 22, 56, 3, AE); g.rect(4, 68, 56, 4, AE_D); g.vline(4, 22, 71, AE); g.vline(59, 22, 71, AE_D);
    // fan grille
    g.circle(24, 46, 15, hex('#1a1e2c')); g.circle(24, 46, 14, hex('#22283a'));
    if (!broken) {
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + (f ? Math.PI / 4 : 0); g.line(24, 46, 24 + Math.cos(a) * 12, 46 + Math.sin(a) * 12, STEEL_H, 3); }
    } else for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.4; g.line(24, 46, 24 + Math.cos(a) * 9, 46 + Math.sin(a) * 9, STEEL_D, 2); }
    g.circle(24, 46, 3, STEEL_D);
    for (let k = 0; k < 7; k++) g.hline(11, 37, 34 + k * 4, [20, 24, 36, 120]);
    // readout
    g.rect(42, 30, 14, 10, hex('#0b1430')); text(g, broken ? 'X' : '-4', broken ? 46 : 43, 31, broken ? LED_R : LED);
    g.rect(44, 44, 10, 4, broken ? LED_R : LED_G);
    // frost on the top, or steam when broken
    if (!broken) { g.rect(4, 22, 56, 2, FROST); for (let x = 6; x < 58; x += 5) g.vline(x, 24, 25 + (x % 3), FROST); }
    else for (const [x, y, r] of [[18, 16, 6], [30, 8, 7], [44, 14, 5]] as const) g.circle(x, y, r, [230, 236, 248, 140]);
    text(g, 'CHILL', 44 - Math.round(textWidth('CHILL') / 2), 58, AE_D);
    g.outline(INK);
    return g;
  });
}

// GigaZ's cooling core (176x176): a frozen cloud on a coolant pedestal, wired to the ceiling.
// 0-3 frozen (the ice cracks a little more as each chiller dies), 4-7 the same with its eyes glowing (winding up),
// 8-9 thawed and dripping, 10 inhaling (a flash freeze coming), 11 wince (hit), 12 melting away (beaten)
type CState = { ice: number; mood: 'smile' | 'glow' | 'wince' | 'o' | 'melt'; thaw: boolean; puff?: boolean; melt?: boolean; bob?: number };
function drawCore(s: CState): Pix {
  const g = new Pix(176, 176);
  const cx = 88, base = 175;
  // the pedestal: a ring of steel with cyan lights, frost around the foot
  g.ellipse(cx, base - 6, 64, 8, STEEL_D); g.rect(cx - 56, base - 34, 112, 28, STEEL_D); g.rect(cx - 52, base - 32, 104, 24, STEEL);
  g.hline(cx - 52, cx + 51, base - 32, STEEL_H); g.ellipse(cx, base - 34, 56, 6, STEEL_H); g.ellipse(cx, base - 34, 50, 4, hex('#1a1e2c'));
  for (let k = 0; k < 9; k++) g.rect(cx - 46 + k * 11, base - 22, 5, 3, s.melt ? hex('#2a3a5a') : LED);
  text(g, 'COLD STORAGE', cx - Math.round(textWidth('COLD STORAGE') / 2), base - 16, INK);
  if (!s.thaw) { g.ellipse(cx, base - 4, 70, 6, FROST_D); for (let x = cx - 66; x < cx + 66; x += 6) g.vline(x, base - 8 - ((x * 7) % 5), base - 3, FROST); }
  else for (let k = 0; k < 7; k++) g.ellipse(cx - 54 + k * 18, base - 3, 7, 2, [92, 200, 255, 200]);
  // the cables up into the ceiling
  for (const [x0, x1] of [[cx - 30, cx - 60], [cx + 30, cx + 60], [cx - 8, cx - 14], [cx + 8, cx + 16]] as const) g.line(x0, 70, x1, 0, s.melt ? STEEL_D : LED_D, 3);
  const x0 = cx - 62, x1 = cx + 62, y0 = 26, y1 = base - 34;
  if (!s.thaw) g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, [40, 70, 120, 255]); // the dark inside of the ice block
  // the cloud
  const cy = 86 + (s.bob ?? 0);
  const sc = s.puff ? 3.4 : 3.1;
  cloud(g, cx, cy, sc, s.melt ? hex('#c8dcf0') : SKY, s.melt ? hex('#8aa8cc') : SKY_S);
  if (s.puff) { g.circle(cx - 32, cy + 10, 8, SKY); g.circle(cx + 32, cy + 10, 8, SKY); }
  face(g, cx, cy + 4, 2.6, s.mood);
  if (s.thaw) for (let k = 0; k < 7; k++) { const x = cx - 36 + k * 12; const len = 4 + ((k * 5) % 9) + (s.melt ? 10 : 0); g.vline(x, cy + 26, cy + 26 + len, hex('#7fd8ff')); g.circle(x, cy + 27 + len, 1, hex('#bfefff')); }
  if (s.melt) { // half of it dissolving into rain
    for (let y = cy - 30; y < cy + 30; y += 2) for (let x = cx - 50; x < cx + 50; x += 3) if (((x * 13 + y * 7) % 11) < 3) g.clear(x, y + (x % 2));
  }
  // the ice block around it: a light glaze in front, a bright rim, shine and cracks
  if (!s.thaw) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      const facet = ((x + y * 2) >> 4) % 2;
      g.set(x, y, edge < 3 ? [223, 246, 255, 240] : facet ? [191, 232, 255, 70] : [168, 216, 240, 45]);
    }
    for (let k = 0; k < 3; k++) g.line(x0 + 10 + k * 8, y0 + 6, x0 + 4 + k * 8, y0 + 40, [255, 255, 255, 150], 2);
    // cracks spread as the chillers die (kept inside the block)
    const r = rng(404);
    const cracks = [0, 4, 9, 15][s.ice] ?? 0;
    const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    for (let k = 0; k < cracks; k++) {
      let x = x0 + 8 + r() * 108, y = y0 + 8 + r() * 100;
      for (let j = 0; j < 4; j++) { const nx = cl(x + (r() - 0.5) * 30, x0 + 3, x1 - 3), ny = cl(y + (r() - 0.3) * 22, y0 + 3, y1 - 3); g.line(x, y, nx, ny, [255, 255, 255, 240]); x = nx; y = ny; }
    }
  }
  g.outline(INK);
  return g;
}
export function coreFrames() {
  const frames: Pix[] = [];
  for (let i = 0; i < 4; i++) frames.push(drawCore({ ice: i, mood: 'smile', thaw: false }));
  for (let i = 0; i < 4; i++) frames.push(drawCore({ ice: i, mood: 'glow', thaw: false }));
  frames.push(drawCore({ ice: 0, mood: 'smile', thaw: true }));
  frames.push(drawCore({ ice: 0, mood: 'smile', thaw: true, bob: -3 }));
  frames.push(drawCore({ ice: 0, mood: 'glow', thaw: true, puff: true }));
  frames.push(drawCore({ ice: 0, mood: 'wince', thaw: true }));
  frames.push(drawCore({ ice: 0, mood: 'melt', thaw: true, melt: true }));
  return { frames, anims: { frozen: [0, 3] as [number, number], glow: [4, 7] as [number, number], idle: [8, 9] as [number, number], inhale: [10, 10] as [number, number], wince: [11, 11] as [number, number], melt: [12, 12] as [number, number] } };
}

// ------------------------------------------------------------------ shots and the frozen screen
export function iceShard(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(16, 16);
    const a = (f / 4) * Math.PI;
    const dx = Math.cos(a) * 6, dy = Math.sin(a) * 6, px = -Math.sin(a) * 3, py = Math.cos(a) * 3;
    g.poly([[8 + dx, 8 + dy], [8 + px, 8 + py], [8 - dx, 8 - dy], [8 - px, 8 - py]], ICE);
    g.line(8 - dx * 0.6, 8 - dy * 0.6, 8 + dx * 0.6, 8 + dy * 0.6, P.white);
    g.outline(LED_D);
    return g;
  });
}
export function laserShot(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(16, 16);
    g.circle(8, 8, f % 2 ? 4 : 5, [255, 74, 90, 200]); g.circle(8, 8, 2, P.white);
    if (f >= 2) for (let k = 0; k < 4; k++) g.set(8 + Math.round(Math.cos(k * 1.57) * 6), 8 + Math.round(Math.sin(k * 1.57) * 6), LED_R);
    return g;
  });
}
export function iceSlab(): Pix {
  // what a missed flash freeze leaves on the floor
  const g = new Pix(64, 24);
  g.ellipse(32, 14, 30, 8, [191, 232, 255, 200]); g.ellipse(26, 12, 12, 3, [255, 255, 255, 170]);
  for (let k = 0; k < 7; k++) { const x = 8 + k * 8; g.poly([[x, 14], [x + 3, 2 + (k % 3) * 3], [x + 6, 14]], k % 2 ? FROST : ICE); }
  g.outline(LED_D);
  return g;
}
export function iceOverlay(W = 480, H = 216): Pix {
  // frozen solid: frost creeping in from every edge, a clearer patch in the middle
  const g = new Pix(W, H);
  const cx = W / 2, cy = H / 2;
  const r = rng(707);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - cx) / (W * 0.55), (y - cy) / (H * 0.62));
    if (d > 0.55) {
      const t = Math.min(1, (d - 0.55) / 0.5);
      const facet = ((x * 3 + y * 5) >> 5) % 2;
      g.set(x, y, mix(facet ? hex('#a8d8f0', 120) : hex('#bfe8ff', 120), hex('#eef8ff', 245), t));
    } else g.set(x, y, [168, 216, 240, 50]);
  }
  // crystals
  for (let k = 0; k < 60; k++) {
    const a = r() * Math.PI * 2, rr = 0.62 + r() * 0.4;
    const x = cx + Math.cos(a) * W * 0.55 * rr, y = cy + Math.sin(a) * H * 0.62 * rr, s = 6 + r() * 12;
    for (let j = 0; j < 3; j++) { const b = (j / 3) * Math.PI; g.line(x - Math.cos(b) * s, y - Math.sin(b) * s, x + Math.cos(b) * s, y + Math.sin(b) * s, [255, 255, 255, 200]); }
  }
  return g;
}
