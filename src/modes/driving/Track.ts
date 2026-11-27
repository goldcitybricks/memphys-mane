// A pseudo-3D road (the SNES / arcade racer kind): a list of short segments, each with a curve,
// a height and the props standing on it. Missions build their course with the helpers below.
// Works point-to-point (Mission 4, the Bridge Run) or as a loop (laps, for Mission 8's I-240 Loop).

export const SEG_LEN = 200; // world units per segment
export const ROAD_W = 1200; // half the road's width, in world units
export const LANES = 3;
export const RUMBLE = 3; // segments per rumble-strip stripe

// How a stretch of road looks. A mission can add its own.
export interface Theme {
  ground: [number, number]; // the two alternating ground colors (grass, river, lot)
  rumble: [number, number]; // curb stripes
  road: [number, number];
  lane: number; // dashed lane lines
  wall: number; // barrier face (0 = no barrier)
  wallTop: number;
  wallH: number; // barrier height in world units
  water?: boolean; // the ground is a river: draw glints
}

export const THEMES: Record<string, Theme> = {
  city: { ground: [0x161d30, 0x1a2236], rumble: [0xb83a3a, 0xd8d8e0], road: [0x34343f, 0x383846], lane: 0xd8d8d8, wall: 0x6a6e80, wallTop: 0x9aa0b2, wallH: 160 },
  ramp: { ground: [0x111a2c, 0x152036], rumble: [0x8e94a6, 0x6e7486], road: [0x36363f, 0x3a3a46], lane: 0xe8e8e8, wall: 0x7a8092, wallTop: 0xb0b6c8, wallH: 200 },
  bridge: { ground: [0x0c1a36, 0x0f1f40], rumble: [0x8e94a6, 0x6e7486], road: [0x3a3a44, 0x3e3e4a], lane: 0xeeeeee, wall: 0x8a90a2, wallTop: 0xc0c6d6, wallH: 200, water: true },
};

// Something standing beside (or over) the road. offset is in road half-widths: -1 is the left edge, 1 the right.
export interface Prop { tex: string; offset: number; frame?: number; scale?: number }

export interface Seg {
  i: number;
  y1: number; y2: number; // road height at the start and end of the segment
  curve: number;
  theme: Theme;
  arch1: number; arch2: number; // height of the bridge's arch ribs over the deck (0 = no arch)
  props: Prop[];
}

const easeIn = (a: number, b: number, t: number) => a + (b - a) * t * t;
const easeInOut = (a: number, b: number, t: number) => a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);

export class Track {
  segs: Seg[] = [];
  theme: Theme = THEMES.city;
  constructor(public loop = false) {}

  get count() { return this.segs.length; }
  get length() { return this.segs.length * SEG_LEN; }
  private lastY() { return this.segs.length ? this.segs[this.segs.length - 1].y2 : 0; }
  // the segment index at world distance z
  segAt(z: number) {
    const n = Math.floor(z / SEG_LEN);
    return this.loop ? this.segs[((n % this.count) + this.count) % this.count] : this.segs[Math.max(0, Math.min(this.count - 1, n))];
  }

  private seg(curve: number, y: number) {
    this.segs.push({ i: this.segs.length, y1: this.lastY(), y2: y, curve, theme: this.theme, arch1: 0, arch2: 0, props: [] });
  }

  // a stretch of road: ease into the curve, hold it, ease out; dy is how much it climbs (or drops)
  road(enter: number, hold: number, leave: number, curve = 0, dy = 0) {
    const y0 = this.lastY(), y1 = y0 + dy, total = enter + hold + leave;
    for (let n = 0; n < enter; n++) this.seg(easeIn(0, curve, n / enter), easeInOut(y0, y1, n / total));
    for (let n = 0; n < hold; n++) this.seg(curve, easeInOut(y0, y1, (enter + n) / total));
    for (let n = 0; n < leave; n++) this.seg(easeInOut(curve, 0, n / leave), easeInOut(y0, y1, (enter + hold + n) / total));
    return this;
  }
  straight(n: number, dy = 0) { return this.road(Math.floor(n / 4), Math.ceil(n / 2), n - Math.floor(n / 4) - Math.ceil(n / 2), 0, dy); }
  curve(n: number, c: number, dy = 0) { const e = Math.floor(n / 4); return this.road(e, n - 2 * e, e, c, dy); }
  use(theme: Theme) { this.theme = theme; return this; }

  // an arch span over segments [from, to): ribs rise from the deck to `height` and back down
  arch(from: number, to: number, height: number) {
    const len = to - from;
    for (let i = from; i < to && i < this.count; i++) {
      const s = this.segs[i];
      s.arch1 = Math.max(s.arch1, Math.sin(((i - from) / len) * Math.PI) * height);
      s.arch2 = Math.max(s.arch2, Math.sin(((i + 1 - from) / len) * Math.PI) * height);
    }
  }

  prop(i: number, p: Prop) { if (i >= 0 && i < this.count) this.segs[i].props.push(p); }
  // the same prop every `every` segments over a range
  props(from: number, to: number, every: number, make: (i: number, k: number) => Prop | Prop[] | null) {
    for (let i = from, k = 0; i < to; i += every, k++) { const p = make(i, k); if (p) for (const q of Array.isArray(p) ? p : [p]) this.prop(i, q); }
  }
}
