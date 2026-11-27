// Mission 4, Bridge Run: the driving mode's art. Big Blue (Uncle T's old boat of a sedan), AetherCars,
// drive-out traffic seen from behind, the AetherCorp tanker, items, road props, signs and the night sky
// over the river. Every car is a generic shape: no badges, no grille emblems, no real logos.
import { Pix, RGBA, hex, rng, mix } from './pix';
import { P } from './palette';
import { text, textWidth } from './font';
import { drawSparkle } from './mane';

const INK = P.ink;
const GLASS = hex('#141c30'), GLASS_HI = hex('#3e5678');
const CHROME = hex('#d8dce4'), CHROME_D = hex('#8a8e98');
const TIRE = hex('#16161c'), TIRE_HI = hex('#2e2e36');
const TAIL = hex('#d42828'), TAIL_HI = hex('#ff7a6a');

// ------------------------------------------------------------------ Big Blue from behind (88x52)
// Uncle T's big old blue sedan: wide trunk, tall fins with stacked taillights, chrome bumper,
// whitewalls. Through the back glass: Mane up high on his phone book (driver side) and Malik riding shotgun.
const BLUE = hex('#2f6fd6'), BLUE_D = hex('#1d4a9a'), BLUE_DD = hex('#14336e'), BLUE_HI = hex('#7aaaff');

function maneInWindow(g: Pix, x: number, y: number, shades: boolean) {
  // the top of the can, seen from behind: rim, cream body, a glove on the wheel
  g.rect(x, y, 10, 9, P.can);
  g.vline(x, y, y + 8, P.canHi);
  g.vline(x + 9, y, y + 8, P.canShade);
  g.hline(x, x + 9, y, hex('#c4c8d0'));
  g.hline(x + 1, x + 8, y - 1, hex('#e9edf2'));
  if (shades) { g.hline(x - 1, x + 10, y + 3, INK); g.set(x - 2, y + 3, INK); g.set(x + 11, y + 3, INK); }
  // gloves up on the wheel
  g.rect(x - 3, y + 6, 3, 3, P.glove); g.rect(x + 10, y + 6, 3, 3, P.glove);
}
function malikInWindow(g: Pix, x: number, y: number) {
  g.ellipse(x + 4, y + 4, 4, 4, P.skin2);
  g.rect(x, y, 9, 3, hex('#1a1210')); // hair
  g.rect(x - 1, y + 7, 11, 3, P.blue); // varsity jacket shoulders
  g.hline(x - 1, x + 9, y + 7, P.yellow);
}

export function bigBlueFrames(): { frames: Pix[]; anims: Record<string, [number, number]> } {
  const frames: Pix[] = [];
  const yaws = [-2, -1, 0, 1, 2];
  for (const shades of [false, true]) for (const yaw of yaws) frames.push(bigBlueRear(yaw, shades));
  return { frames, anims: {} };
}

function bigBlueRear(yaw: number, shades: boolean): Pix {
  const g = new Pix(88, 52);
  const cx = 44 + yaw; // body center shifts a little, the cabin shifts more (the car is turning)
  const top = cx + yaw * 2;
  // tires peeking out under the body
  for (const tx of [cx - 32, cx + 23]) { g.rect(tx, 40, 10, 11, TIRE); g.hline(tx + 1, tx + 8, 41, TIRE_HI); }
  // side panel showing on the outside of the turn
  if (yaw !== 0) {
    const sx = yaw < 0 ? cx + 37 : cx - 37 - Math.abs(yaw) * 2;
    g.rect(sx, 22, Math.abs(yaw) * 2 + 1, 17, BLUE_DD);
    g.rect(yaw < 0 ? sx + Math.abs(yaw) * 2 - 2 : sx, 38, 4, 10, TIRE);
  }
  // trunk and rear body
  g.rect(cx - 37, 22, 75, 17, BLUE);
  g.hline(cx - 36, cx + 37, 22, BLUE_HI);
  g.rect(cx - 37, 33, 75, 6, BLUE_D);
  g.hline(cx - 30, cx + 30, 27, BLUE_D); // trunk lid seam
  g.hline(cx - 30, cx + 30, 26, mix(BLUE, BLUE_HI, 0.5));
  // fins with stacked taillights, rising a little above the trunk
  for (const fx of [cx - 38, cx + 33]) {
    g.rect(fx, 17, 6, 20, BLUE_D);
    g.rect(fx + 1, 18, 4, 16, TAIL);
    g.vline(fx + 1, 18, 33, TAIL_HI);
    g.hline(fx + 1, fx + 4, 25, hex('#8a1818'));
  }
  // chrome bumper and the plate
  g.rect(cx - 38, 38, 77, 4, CHROME);
  g.hline(cx - 38, cx + 38, 41, CHROME_D);
  g.rect(cx - 7, 29, 15, 7, hex('#f2efe0'));
  g.hline(cx - 7, cx + 7, 29, hex('#2a5bb8'));
  for (const k of [-4, -1, 2, 5]) g.vline(cx + k, 31, 34, hex('#3a3a46')); // 901
  // exhaust
  g.rect(cx + 20, 42, 4, 2, hex('#4a4a54'));
  // cabin: C pillars, roof, back glass
  g.poly([[top - 27, 23], [top - 21, 8], [top + 21, 8], [top + 27, 23]], BLUE);
  g.hline(top - 20, top + 20, 8, BLUE_HI);
  g.poly([[top - 23, 22], [top - 18, 10], [top + 18, 10], [top + 23, 22]], GLASS);
  // who's riding
  maneInWindow(g, top - 14, 11, shades);
  malikInWindow(g, top + 6, 13);
  // glass glare
  g.line(top - 16, 20, top - 10, 11, GLASS_HI);
  g.line(top + 13, 21, top + 17, 13, GLASS_HI);
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ Big Blue from the side (160x56), for the cutscene
// Long hood, long trunk, fins at the back, chrome, whitewalls. The driver's window is open so you can see who's in it.
export function bigBlueSide(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(160, 56);
    // nose to the right
    const shape: [number, number][] = [[4, 44], [3, 33], [8, 28], [12, 24], [40, 25], [52, 24], [60, 13], [72, 10], [100, 10], [110, 14], [118, 24], [146, 26], [154, 30], [157, 36], [156, 44]];
    g.poly(shape, BLUE);
    g.rect(5, 37, 151, 7, BLUE_D);
    g.hline(8, 152, 29, BLUE_HI);
    g.hline(8, 152, 36, mix(BLUE, BLUE_D, 0.5));
    // fin
    g.poly([[4, 30], [8, 20], [24, 25], [6, 28]], BLUE_D);
    g.rect(3, 26, 4, 9, TAIL);
    // greenhouse with an open driver window (glass only in the back)
    g.poly([[62, 24], [70, 13], [100, 13], [108, 24]], GLASS);
    g.vline(86, 12, 24, BLUE_D); g.vline(87, 12, 24, BLUE_D);
    for (let y = 14; y < 24; y++) for (let x = 89; x < 105; x++) g.clear(x, y);
    // chrome trim and bumpers
    g.hline(8, 154, 31, CHROME);
    g.rect(0, 40, 10, 4, CHROME); g.rect(150, 40, 10, 4, CHROME);
    g.rect(150, 31, 6, 4, hex('#f4f0d8')); // headlight
    g.vline(62, 26, 42, BLUE_D); g.vline(108, 26, 42, BLUE_D);
    g.rect(98, 30, 5, 1, CHROME);
    // whitewall wheels
    for (const wx of [32, 128]) {
      g.circle(wx, 44, 11, mix(BLUE_D, INK, 0.6));
      g.circle(wx, 44, 9, TIRE);
      g.circle(wx, 44, 7, hex('#ececf0'));
      g.circle(wx, 44, 5, CHROME);
      for (let k = 0; k < 4; k++) { const a = f * (Math.PI / 4) + (k * Math.PI) / 2; g.set(wx + Math.round(Math.cos(a) * 3), 44 + Math.round(Math.sin(a) * 3), CHROME_D); }
      g.circle(wx, 44, 1, CHROME_D);
    }
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ AetherCar from behind (64x40)
// AetherCorp's self-driving pod: white shell, a blue light bar, a spinning sensor on the roof,
// and GigaZ's smiling cloud with river-blue eyes on the back screen.
const AE_W = hex('#eef2f8'), AE_S = hex('#b8c2d4'), AE_D = hex('#7c889e'), AE_LED = hex('#5ce1ff');
function gigazFace(g: Pix, x: number, y: number, mood: 'smile' | 'glitch' = 'smile') {
  // a little cloud: three puffs, two eyes, a smile
  const C = hex('#e8f4ff');
  g.circle(x - 3, y + 1, 2, C); g.circle(x, y - 1, 3, C); g.circle(x + 3, y + 1, 2, C); g.rect(x - 4, y + 1, 9, 2, C);
  g.set(x - 1, y, hex('#2a7ad8')); g.set(x + 2, y, hex('#2a7ad8'));
  if (mood === 'smile') { g.set(x - 1, y + 2, hex('#2a7ad8')); g.set(x, y + 3, hex('#2a7ad8')); g.set(x + 1, y + 3, hex('#2a7ad8')); g.set(x + 2, y + 2, hex('#2a7ad8')); }
  else g.hline(x - 1, x + 2, y + 2, hex('#2a7ad8'));
}
export function aetherCarFrames(): Pix[] {
  return [-1, 0, 1].map((yaw) => {
    const g = new Pix(64, 40);
    const cx = 32 + yaw, top = cx + yaw * 2;
    for (const tx of [cx - 25, cx + 17]) { g.rect(tx, 30, 8, 9, TIRE); g.hline(tx + 1, tx + 6, 31, TIRE_HI); }
    if (yaw !== 0) g.rect(yaw < 0 ? cx + 28 : cx - 30, 16, 3, 14, AE_D);
    // rounded shell
    g.ellipse(cx, 22, 28, 10, AE_W);
    g.rect(cx - 28, 22, 57, 9, AE_W);
    g.rect(cx - 28, 27, 57, 4, AE_S);
    g.hline(cx - 26, cx + 26, 31, AE_D);
    // full-width light bar
    g.hline(cx - 27, cx + 27, 24, AE_LED);
    g.hline(cx - 25, cx + 25, 25, hex('#2aa8d8'));
    // back screen with GigaZ
    g.poly([[top - 20, 20], [top - 15, 9], [top + 15, 9], [top + 20, 20]], GLASS);
    gigazFace(g, top, 14);
    // roof sensor
    g.rect(top - 3, 4, 7, 4, AE_D); g.rect(top - 2, 2, 5, 2, hex('#3a3e4a')); g.set(top + (yaw + 1), 3, AE_LED);
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ drive-out traffic from behind (64x40)
// Generic shapes of a mid-size sedan (Altima-like) and a sporty luxury sedan (Infiniti-like). No badges.
export function sedanRearFrames(body: RGBA, bodyD: RGBA, model: 'altima' | 'infiniti'): Pix[] {
  return [-1, 0, 1].map((yaw) => {
    const g = new Pix(64, 40);
    const cx = 32 + yaw, top = cx + yaw * 2;
    const hi = mix(body, P.white, 0.35);
    for (const tx of [cx - 25, cx + 17]) { g.rect(tx, 30, 8, 9, TIRE); g.hline(tx + 1, tx + 6, 31, TIRE_HI); }
    if (yaw !== 0) g.rect(yaw < 0 ? cx + 27 : cx - 29, 17, 3, 13, bodyD);
    g.rect(cx - 27, 18, 55, 13, body);
    g.hline(cx - 26, cx + 26, 18, hi);
    g.rect(cx - 27, 28, 55, 4, bodyD);
    g.hline(cx - 22, cx + 22, 22, bodyD); // trunk seam
    if (model === 'altima') {
      // boomerang taillights wrapping the corners
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? cx - 27 : cx + 18;
        g.rect(x0, 19, 10, 4, TAIL); g.rect(s < 0 ? x0 : x0 + 6, 23, 4, 3, TAIL);
        g.hline(x0 + 1, x0 + 8, 19, TAIL_HI);
      }
    } else {
      // thin, long taillights with a chrome strip between them
      g.rect(cx - 27, 20, 14, 3, TAIL); g.rect(cx + 14, 20, 14, 3, TAIL);
      g.hline(cx - 13, cx + 13, 21, CHROME);
    }
    g.rect(cx - 6, 24, 13, 5, hex('#f2efe0')); // plate
    g.poly([[top - 20, 18], [top - 14, 7], [top + 14, 7], [top + 20, 18]], body);
    g.poly([[top - 17, 17], [top - 12, 9], [top + 12, 9], [top + 17, 17]], GLASS);
    g.line(top - 12, 16, top - 8, 10, GLASS_HI);
    // a driver's head
    g.ellipse(top - 6, 14, 3, 3, hex('#0c0c12'));
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ the AetherCorp tanker from behind (128x112)
// A self-driving tanker: a big round tank end, a ladder, the AetherCorp cloud, dual tires, a GigaZ screen.
// Frames: intact, dented and leaking, wrecked and cracking with glowing water.
export function tankerFrames(): Pix[] {
  return [0, 1, 2].map((dmg) => {
    const g = new Pix(128, 112);
    const r = rng(77 + dmg);
    const TK = hex('#d8dee8'), TK_S = hex('#a8b2c4'), TK_D = hex('#77839a'), STRIPE = hex('#2a6ad0');
    const cx = 64, cy = 50, R = 46;
    // chassis and dual rear tires
    g.rect(cx - 50, 86, 100, 10, hex('#2a2e3a'));
    for (const tx of [cx - 52, cx - 38, cx + 26, cx + 40]) { g.rect(tx, 90, 12, 21, TIRE); g.hline(tx + 1, tx + 10, 91, TIRE_HI); }
    // the round tank end
    g.circle(cx, cy, R, TK);
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d > R + 0.3) continue;
      if (d > R - 5) g.set(x, y, TK_D);
      else if (dx + dy > 24) g.set(x, y, TK_S);
    }
    g.circle(cx - 12, cy - 14, 10, hex('#eef2f8'));
    // blue stripe and the AetherCorp cloud
    g.rect(cx - R + 3, cy + 14, R * 2 - 6, 5, STRIPE);
    const C = hex('#ffffff');
    g.circle(cx - 8, cy - 4, 5, C); g.circle(cx, cy - 8, 7, C); g.circle(cx + 8, cy - 4, 5, C); g.rect(cx - 12, cy - 4, 24, 5, C);
    g.circle(cx - 8, cy - 4, 4, STRIPE); g.circle(cx, cy - 8, 6, STRIPE); g.circle(cx + 8, cy - 4, 4, STRIPE); g.rect(cx - 11, cy - 4, 22, 4, STRIPE);
    const word = 'AETHERCORP';
    text(g, word, Math.round(cx - textWidth(word, 1) / 2), cy + 3, hex('#1c3f84'));
    // ladder up the middle-right
    for (const lx of [cx + 22, cx + 30]) g.vline(lx, cy - 28, cy + 40, hex('#5a6276'));
    for (let ly = cy - 24; ly < cy + 40; ly += 6) g.hline(cx + 22, cx + 30, ly, hex('#5a6276'));
    // rear bumper with lights and the GigaZ screen
    g.rect(cx - 52, 80, 104, 8, hex('#3a4050'));
    g.hline(cx - 52, cx + 51, 80, hex('#5a6276'));
    for (const lx of [cx - 50, cx + 42]) { g.rect(lx, 81, 8, 5, TAIL); g.hline(lx + 1, lx + 6, 81, TAIL_HI); }
    g.rect(cx - 10, 80, 20, 8, GLASS);
    gigazFace(g, cx, 83, dmg === 2 ? 'glitch' : 'smile');
    g.hline(cx - 30, cx - 16, 84, AE_LED); g.hline(cx + 16, cx + 30, 84, AE_LED);
    // damage
    if (dmg >= 1) {
      for (let i = 0; i < 5 + dmg * 6; i++) {
        const a = r() * Math.PI * 2, d = r() * (R - 10);
        const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
        g.ellipse(x, y, 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), TK_D);
        g.set(x - 1, y - 1, TK_S);
      }
      // a leak spout low on the tank
      g.circle(cx - 20, cy + 30, 2, hex('#7fd8ff'));
    }
    if (dmg >= 2) {
      // cracks with the glowing aquifer water showing through
      const crack = (x0: number, y0: number, n: number) => {
        let x = x0, y = y0;
        for (let i = 0; i < n; i++) { const nx = x + Math.round((r() - 0.5) * 8), ny = y + 3 + Math.floor(r() * 3); g.line(x, y, nx, ny, hex('#7fe8ff')); g.line(x + 1, y, nx + 1, ny, hex('#2a7ad8')); x = nx; y = ny; }
      };
      crack(cx - 20, cy - 36, 7); crack(cx + 12, cy - 30, 8); crack(cx - 34, cy - 6, 5);
      g.circle(cx + 16, cy + 28, 2, hex('#7fd8ff'));
    }
    g.outline(INK);
    return g;
  });
}

// ------------------------------------------------------------------ items and pickups
// Uncle T's to-go box, floating and bobbing: drive through it to get an item.
export function itemBoxFrames(): Pix[] {
  return [0, 1, 2, 3].map((f) => {
    const g = new Pix(28, 28);
    const lift = [0, -1, -2, -1][f];
    const glow = [0.35, 0.5, 0.65, 0.5][f];
    g.ellipse(14, 14 + lift, 13, 12, [245, 197, 66, Math.round(glow * 120)]);
    const o = new Pix(28, 28); o.blit(g, 0, 0);
    const y0 = 8 + lift;
    // styrofoam clamshell: lid and base with the hinge line
    o.rect(4, y0, 20, 6, hex('#f4f4f0'));
    o.rect(4, y0 + 6, 20, 7, hex('#e2e2dc'));
    o.hline(4, 23, y0 + 6, hex('#b8b8b0'));
    o.hline(5, 22, y0, P.white);
    for (let x = 6; x < 23; x += 3) o.set(x, y0 + 3, hex('#d0d0c8'));
    // a gold question mark sticker
    text(o, '?', 11, y0 + 2, P.goldMid);
    const c = new Pix(28, 28); c.rect(4, y0, 20, 13, P.white); c.outline(INK);
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const p = c.get(x, y)!; if (p[0] === INK[0] && p[3]) o.set(x, y, INK); }
    if (f === 2) drawSparkle(o, 22, y0, 1);
    return o;
  });
}

// HUD icons (20x20)
export function sweetTeaIcon(): Pix {
  const g = new Pix(20, 20);
  g.poly([[5, 5], [15, 5], [13, 18], [7, 18]], hex('#e8f0f8', 220));
  g.poly([[6, 8], [14, 8], [13, 17], [7, 17]], hex('#b0661e'));
  g.rect(7, 9, 2, 2, hex('#e8f4ff')); g.rect(11, 11, 2, 2, hex('#e8f4ff')); // ice
  g.rect(4, 4, 12, 2, P.white); // lid
  g.line(11, 4, 14, 0, P.red, 1); g.line(12, 4, 15, 0, P.redDark, 1); // straw
  g.outline(INK);
  return g;
}
export function sauceIcon(): Pix {
  const g = new Pix(20, 20);
  g.rect(6, 7, 8, 11, hex('#8a2a14'));
  g.vline(7, 8, 16, hex('#c2482a'));
  g.rect(7, 4, 6, 3, hex('#e8e0c8'));
  g.rect(9, 1, 2, 3, hex('#e8e0c8'));
  g.rect(7, 10, 6, 4, hex('#f2c230')); // label
  g.hline(8, 11, 12, hex('#8a2a14'));
  g.outline(INK);
  return g;
}
export function bonesIcon(): Pix {
  const g = new Pix(20, 20);
  const B = hex('#f0e6cc'), BD = hex('#c8b890');
  const bone = (x0: number, y0: number, x1: number, y1: number) => {
    g.line(x0, y0, x1, y1, B, 2);
    for (const [x, y] of [[x0, y0], [x1, y1]]) { g.circle(x - 1, y, 1, B); g.circle(x + 1, y + 1, 1, B); }
  };
  bone(4, 5, 15, 14); bone(15, 5, 4, 14);
  g.set(9, 9, BD); g.set(10, 10, BD);
  g.outline(INK);
  return g;
}

// on the road: a sauce slick, scattered wing bones, an AetherCorp coolant barrel
export function saucePuddle(): Pix {
  const g = new Pix(48, 14);
  const r = rng(41);
  g.ellipse(24, 7, 22, 6, hex('#5c1a0c'));
  for (let i = 0; i < 6; i++) g.ellipse(6 + r() * 36, 3 + r() * 8, 3 + r() * 3, 2, hex('#5c1a0c'));
  g.ellipse(18, 5, 8, 2, hex('#8a2a14'));
  g.hline(12, 20, 4, hex('#c2602e'));
  return g;
}
export function bonesDecal(): Pix {
  const g = new Pix(40, 14);
  const r = rng(43);
  const B = hex('#f0e6cc');
  for (let i = 0; i < 7; i++) {
    const x = 4 + r() * 32, y = 3 + r() * 8, a = r() * Math.PI;
    const dx = Math.cos(a) * 4, dy = Math.sin(a) * 2;
    g.line(x - dx, y - dy, x + dx, y + dy, B, 2);
    g.set(x - dx - 1, y - dy, B); g.set(x + dx + 1, y + dy, B);
  }
  g.outline(INK);
  return g;
}
export function barrelFrames(): Pix[] {
  return [0, 1].map((f) => {
    const g = new Pix(28, 32);
    const B = hex('#2a6ad0'), BD = hex('#1c4a98'), BL = hex('#6aa8ff');
    g.ellipse(14, 26, 12, 4, BD);
    g.rect(2, 6, 25, 20, B);
    g.ellipse(14, 6, 12, 4, BL);
    g.ellipse(14, 6, 9, 2, BD);
    g.vline(5 + f * 3, 8, 25, BL);
    // hazard band and a snowflake: coolant
    g.rect(2, 13, 25, 5, hex('#f2c230'));
    for (let x = 2; x < 27; x += 4) g.line(x, 17, x + 3, 13, INK);
    const s = hex('#e8f4ff');
    g.vline(14, 20, 24, s); g.hline(12, 16, 22, s); g.set(12, 20, s); g.set(16, 24, s); g.set(16, 20, s); g.set(12, 24, s);
    g.outline(INK);
    return g;
  });
}

export function phoneBook(): Pix {
  const g = new Pix(24, 8);
  g.rect(0, 1, 24, 7, hex('#f2d230'));
  g.rect(0, 5, 24, 3, hex('#f8f4e8'));
  g.hline(0, 23, 6, hex('#d8d0b8'));
  g.hline(1, 22, 1, hex('#fff4a0'));
  g.rect(3, 2, 8, 2, INK);
  g.outline(INK);
  return g;
}

// ------------------------------------------------------------------ roadside
export function bridgeLamp(): Pix {
  const g = new Pix(20, 80);
  g.rect(9, 8, 3, 72, hex('#3a4060'));
  g.vline(9, 8, 79, hex('#5a6286'));
  g.rect(3, 5, 12, 4, hex('#3a4060'));
  g.rect(2, 8, 8, 3, hex('#ffd890'));
  g.hline(2, 9, 10, hex('#ffb850'));
  g.rect(7, 76, 7, 4, hex('#2a3048'));
  g.outline(INK);
  return g;
}

export function cityTower(seed: number, w: number, h: number, tint: RGBA): Pix {
  const g = new Pix(w, h);
  const r = rng(seed);
  const lit = hex('#f2b950'), dim = hex('#a8783a'), cool = hex('#8ab0e0');
  g.rect(0, 6, w, h - 6, tint);
  g.rect(0, 6, 3, h - 6, mix(tint, P.white, 0.12));
  g.rect(w - 3, 6, 3, h - 6, mix(tint, INK, 0.3));
  g.rect(4, 0, w - 8, 6, mix(tint, INK, 0.2));
  for (let y = 12; y < h - 6; y += 6) for (let x = 6; x < w - 6; x += 6) {
    const v = r();
    if (v > 0.45) g.rect(x, y, 3, 3, v > 0.9 ? cool : v > 0.75 ? lit : dim);
  }
  if (seed % 2) { g.vline(w / 2, 0, 6, INK); g.set(w / 2, 0, P.red); }
  return g;
}

// the Pyramid by the river, glass and steel at night (no signs on it)
export function pyramid(): Pix {
  const g = new Pix(200, 120);
  for (let row = 0; row < 116; row++) {
    const half = Math.round(row * 0.86);
    g.hline(100 - half, 100 + half, 4 + row, mix(hex('#3a4478'), hex('#1e2448'), row / 116));
    if (row % 8 === 0) g.hline(100 - half, 100 + half, 4 + row, hex('#4c5890'));
  }
  // the lit face edge and the tip
  for (let row = 0; row < 116; row++) { g.set(100 + Math.round(row * 0.86), 4 + row, hex('#7f88c0')); g.set(100 - Math.round(row * 0.86), 4 + row, hex('#2c3460')); }
  g.rect(98, 0, 5, 5, hex('#c8d0ff'));
  // a few lit panes
  const r = rng(9);
  for (let i = 0; i < 40; i++) { const row = 20 + Math.floor(r() * 90); const half = Math.round(row * 0.86); const x = 100 - half + 4 + Math.floor(r() * (half * 2 - 8)); g.rect(x, 4 + row, 2, 2, r() > 0.5 ? hex('#f2b950') : hex('#8ab0e0')); }
  g.outline(INK);
  return g;
}

function billboard(lines: [string, RGBA, number][], bg: RGBA, frame: RGBA, art?: (g: Pix) => void): Pix {
  const g = new Pix(120, 76);
  g.rect(28, 50, 4, 26, hex('#2a2f48')); g.rect(88, 50, 4, 26, hex('#2a2f48'));
  g.rect(0, 0, 120, 52, frame);
  g.rect(3, 3, 114, 46, bg);
  let y = 8;
  for (const [s, c, sc] of lines) {
    const w = textWidth(s, sc);
    text(g, s, Math.round(60 - w / 2), y, c, sc);
    y += 7 * sc + 4;
  }
  art?.(g);
  // two little lamps lighting the board
  g.rect(20, 50, 6, 2, hex('#ffd890')); g.rect(94, 50, 6, 2, hex('#ffd890'));
  g.outline(INK);
  return g;
}
export function boardDenile(): Pix {
  return billboard([['DENILE WATER', hex('#ffffff'), 1], ['ZERO TASTE.', hex('#7fc4ff'), 1], ['ZERO MEMORY.', hex('#7fc4ff'), 1]], hex('#2a6ad0'), hex('#d8dee8'), (g) => {
    // a little Pip-blue bottle
    g.rect(104, 24, 6, 18, P.bottle); g.rect(105, 21, 4, 3, P.bottleCap); g.vline(105, 25, 40, hex('#c8e8ff'));
  });
}
export function boardAether(): Pix {
  return billboard([['THE CLOUD', hex('#ffffff'), 1], ['REMEMBERS,', hex('#ffffff'), 1], ['SO YOU DON\'T', hex('#a8dcff'), 1]], hex('#141c40'), hex('#5ce1ff'), (g) => {
    gigazFace(g, 106, 14); gigazFace(g, 14, 14);
  });
}
export function boardMemphys(): Pix {
  return billboard([['MEMPHYS', P.goldHi, 2], ['DRINK LIKE A KING', P.can, 1]], hex('#1a1020'), P.gold, (g) => {
    // the bridge arches over the gold pyramid
    for (let x = 0; x < 30; x++) { const t = (x % 15) / 15; g.set(45 + x, 44 - Math.round(Math.sin(t * Math.PI) * 4), P.canShade); }
    g.hline(44, 76, 44, P.canShade);
    for (let rr = 0; rr < 4; rr++) g.hline(60 - rr, 60 + rr, 40 + rr, P.labelGold);
  });
}
function greenSign(l1: string, l2: string): Pix {
  const w = Math.max(textWidth(l1, 1), textWidth(l2, 1)) + 14;
  const g = new Pix(w, 56);
  g.rect(w / 2 - 2, 30, 4, 26, hex('#8a8e98'));
  g.rect(0, 0, w, 30, hex('#1f7a3a'));
  g.rect(2, 2, w - 4, 26, hex('#1f7a3a'));
  g.hline(2, w - 3, 2, P.white); g.hline(2, w - 3, 27, P.white); g.vline(2, 2, 27, P.white); g.vline(w - 3, 2, 27, P.white);
  text(g, l1, Math.round(w / 2 - textWidth(l1, 1) / 2), 6, P.white);
  text(g, l2, Math.round(w / 2 - textWidth(l2, 1) / 2), 16, P.white);
  g.outline(INK);
  return g;
}
export const signWest = () => greenSign('40 WEST', 'ARKANSAS');
export const signRiver = () => greenSign('MISSISSIPPI', 'RIVER');
export const signState = () => greenSign('ARKANSAS', 'STATE LINE');
export const signBeale = () => greenSign('BEALE ST', 'NEXT EXIT');

// the tire shop at Park & Airways where Big Blue gets her new tires (side view, 220x120)
export function tireShop(): Pix {
  const g = new Pix(220, 120);
  const WALL = hex('#d8d2c0'), WALL_D = hex('#a8a090'), ROOF = hex('#3a3040');
  g.rect(20, 28, 180, 78, WALL);
  g.rect(20, 28, 180, 4, ROOF);
  g.rect(20, 98, 180, 8, WALL_D);
  // two open bays, warm light inside, stacked tires
  for (const bx of [36, 116]) {
    g.rect(bx, 48, 64, 50, hex('#2a2030'));
    g.rect(bx + 2, 50, 60, 46, hex('#5a4630'));
    g.hline(bx + 2, bx + 61, 50, hex('#ffd890'));
    for (let k = 0; k < 4; k++) { g.ellipse(bx + 12, 90 - k * 7, 8, 3, TIRE); g.hline(bx + 6, bx + 18, 90 - k * 7, TIRE_HI); }
    for (let k = 0; k < 3; k++) { g.ellipse(bx + 50, 90 - k * 7, 8, 3, TIRE); g.hline(bx + 44, bx + 56, 90 - k * 7, TIRE_HI); }
  }
  // the sign
  g.rect(52, 6, 116, 20, hex('#c8282e'));
  g.rect(54, 8, 112, 16, hex('#e8402e'));
  const s = 'TIRES + WHEELS';
  text(g, s, Math.round(110 - textWidth(s, 1) / 2), 12, P.white);
  // iron fence and feather flags out front
  for (let x = 0; x < 220; x += 6) g.vline(x, 96, 118, hex('#1a1a22'));
  g.hline(0, 219, 100, hex('#1a1a22')); g.hline(0, 219, 112, hex('#1a1a22'));
  for (const [fx, c] of [[8, hex('#e8402e')], [206, hex('#2a6ad0')], [104, hex('#f2c230')]] as [number, RGBA][]) {
    g.vline(fx, 40, 118, hex('#8a8e98'));
    g.poly([[fx + 1, 42], [fx + 9, 46], [fx + 10, 80], [fx + 1, 84]], c);
  }
  g.outline(INK);
  return g;
}

// the Memory Glyph the bridge lights flash: the bridge's M arches over the pyramid, a drop for an eye (64x64)
export function bridgeGlyph(): Pix {
  const g = new Pix(64, 64);
  const G = P.goldHi, GD = P.gold;
  // two arches
  for (let x = 0; x <= 48; x++) {
    const t = (x % 24) / 24;
    const y = 22 - Math.round(Math.sin(t * Math.PI) * 14);
    g.dot(8 + x, y, G, 2);
  }
  g.hline(6, 58, 24, G); g.hline(6, 58, 25, G);
  // pyramid with a water-drop eye
  for (let row = 0; row < 24; row++) { g.set(32 - row, 30 + row, GD); g.set(32 + row, 30 + row, GD); g.set(33 - row, 30 + row, G); g.set(31 + row, 30 + row, G); }
  g.hline(8, 56, 54, G); g.hline(8, 56, 55, GD);
  g.circle(32, 44, 4, hex('#7fe8ff'));
  g.set(32, 38, hex('#7fe8ff')); g.set(32, 39, hex('#7fe8ff')); g.set(31, 40, hex('#7fe8ff')); g.set(33, 40, hex('#7fe8ff'));
  g.set(31, 43, P.white);
  // ripples
  for (const yy of [58, 61]) for (let x = 14; x < 50; x++) if ((x + yy) % 4 < 2) g.set(x, yy, G);
  return g;
}

// ------------------------------------------------------------------ sky and the far horizon over the river (tile horizontally)
export function driveSky(): Pix {
  const W = 512, g = new Pix(W, 216);
  const r = rng(51);
  for (let y = 0; y < 216; y++) g.hline(0, W - 1, y, mix(hex('#060818'), hex('#22306a'), Math.min(1, y / 112)));
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 80);
    g.set(x, y, r() > 0.85 ? hex('#ffcf7a') : hex('#c8d0ff', 160 + Math.floor(r() * 90)));
  }
  g.circle(400, 26, 10, hex('#f6efd0')); g.circle(404, 23, 9, hex('#0a0e26'));
  return g;
}

// horizon at y=108 (where the road meets the sky). The Memphis skyline and the Pyramid on one stretch,
// the flat Arkansas side with a few lights on another, and far off, a cold blue glow that might be a data center.
export const HORIZON = 108;
export function driveFar(): Pix {
  const W = 1024, g = new Pix(W, 216);
  const r = rng(61);
  const base = HORIZON;
  const bld = hex('#1a1f40'), lit = hex('#f2b950'), litDim = hex('#a8783a');
  // Memphis skyline: towers and the pyramid
  const towers = [[40, 26, 52], [70, 20, 70], [94, 30, 58], [130, 22, 84], [156, 28, 64], [190, 18, 46], [214, 26, 60], [244, 20, 40]];
  for (const [x, w, h] of towers) {
    g.rect(x, base - h, w, h, bld);
    g.rect(x, base - h, 2, h, hex('#232a52'));
    for (let wy = base - h + 4; wy < base - 2; wy += 4) for (let wx = x + 3; wx < x + w - 2; wx += 4) { const v = r(); if (v > 0.55) g.rect(wx, wy, 2, 2, v > 0.85 ? lit : litDim); }
    if (h > 70) { g.vline(x + w / 2, base - h - 8, base - h, bld); g.set(x + w / 2, base - h - 9, P.red); }
  }
  for (let rr = 0; rr < 40; rr++) g.hline(310 - rr, 310 + rr, base - 40 + rr, rr < 2 ? hex('#7f88c0') : mix(hex('#2c3460'), hex('#1e2448'), rr / 40));
  for (let rr = 4; rr < 40; rr += 6) g.hline(310 - rr, 310 + rr, base - 40 + rr, hex('#323a6a'));
  // flat Arkansas: tree lines and a few lights
  for (let x = 380; x < 900; x++) {
    const h = 6 + Math.round(Math.abs(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.23) * 2));
    g.vline(x, base - h, base, hex('#10162e'));
  }
  for (let i = 0; i < 30; i++) g.set(380 + Math.floor(r() * 520), base - 2 - Math.floor(r() * 4), r() > 0.5 ? lit : hex('#ffffff'));
  // the cold glow on the far edge
  for (let k = 0; k < 18; k++) g.ellipse(950, base - 6, 60 - k * 3, 20 - k, [92, 225, 255, 10]);
  g.rect(930, base - 22, 40, 22, hex('#141a36'));
  for (let x = 934; x < 968; x += 4) for (let y = base - 18; y < base - 2; y += 4) g.set(x, y, hex('#5ce1ff'));
  // haze at the horizon
  for (let y = base - 8; y <= base; y++) g.hline(0, W - 1, y, hex('#2a3060', 60));
  return g;
}

// touch buttons for the driving mode come from world.touchButton (same look as the others)
