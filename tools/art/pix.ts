// Tiny pixel-art canvas: every draw call lands on whole pixels, no anti-aliasing.
// All first-pass art in the game is drawn with this, then saved as PNG sheets
// in public/assets so final hand-drawn art can replace any file one-for-one.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

export type RGBA = [number, number, number, number];

export function hex(h: string, a = 255): RGBA {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a];
}

export class Pix {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  get(x: number, y: number): RGBA | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  set(x: number, y: number, c: RGBA | null) {
    if (!c) return;
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c[3] === 255 || this.data[i + 3] === 0) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = c[3];
    } else {
      const a = c[3] / 255;
      this.data[i] = c[0] * a + this.data[i] * (1 - a);
      this.data[i + 1] = c[1] * a + this.data[i + 1] * (1 - a);
      this.data[i + 2] = c[2] * a + this.data[i + 2] * (1 - a);
      this.data[i + 3] = Math.max(this.data[i + 3], c[3]);
    }
  }

  clear(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = this.data[i + 1] = this.data[i + 2] = this.data[i + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  hline(x0: number, x1: number, y: number, c: RGBA) {
    for (let x = Math.round(Math.min(x0, x1)); x <= Math.round(Math.max(x0, x1)); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: RGBA) {
    for (let y = Math.round(Math.min(y0, y1)); y <= Math.round(Math.max(y0, y1)); y++) this.set(x, y, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }

  circle(cx: number, cy: number, r: number, c: RGBA) { this.ellipse(cx, cy, r, r, c); }

  line(x0: number, y0: number, x1: number, y1: number, c: RGBA, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.dot(x0, y0, c, thick);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  dot(x: number, y: number, c: RGBA, thick: number) {
    if (thick <= 1) return this.set(x, y, c);
    if (thick === 2) { this.rect(x, y, 2, 2, c); return; }
    this.circle(x, y, (thick - 1) / 2, c);
  }

  // Quadratic bezier: the rubber-hose limb.
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, c: RGBA, thick = 2) {
    const steps = Math.max(6, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    let px = x0, py = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      this.line(px, py, x, y, c, thick);
      px = x; py = y;
    }
  }

  poly(pts: [number, number][], c: RGBA) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) {
          xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) this.hline(Math.round(xs[k]), Math.round(xs[k + 1]) - 1, y, c);
    }
  }

  // 1px outline around every opaque pixel (the classic SNES sprite edge).
  outline(c: RGBA, diag = false) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        const n = this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128 ||
          (diag && (this.alpha(x - 1, y - 1) > 128 || this.alpha(x + 1, y + 1) > 128 || this.alpha(x + 1, y - 1) > 128 || this.alpha(x - 1, y + 1) > 128));
        if (n) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }

  // Recolor only where the existing pixel is opaque (shading masks).
  mask(fn: (x: number, y: number, c: RGBA) => RGBA | null) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y)!;
        if (c[3] === 0) continue;
        const r = fn(x, y, c);
        if (r) { const i = (y * this.w + x) * 4; this.data.set(r, i); }
      }
  }

  blit(src: Pix, dx: number, dy: number, flip = false) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flip ? src.w - 1 - x : x, y)!;
        if (c[3] > 0) this.set(dx + x, dy + y, c);
      }
  }

  scaled(n: number): Pix {
    const p = new Pix(this.w * n, this.h * n);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = this.get(Math.floor(x / n), Math.floor(y / n))!;
      if (c[3]) p.set(x, y, c);
    }
    return p;
  }

  save(file: string) {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.data.buffer);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
  }
}

// Frames side by side, left to right (the spec in the story bible).
export function sheet(frames: Pix[]): Pix {
  const w = frames[0].w, h = frames[0].h;
  const s = new Pix(w * frames.length, h);
  frames.forEach((f, i) => s.blit(f, i * w, 0));
  return s;
}

// Deterministic randomness so the art is the same every build.
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t].map(Math.round) as RGBA;
}
