// A tiny offline synth: every sound and song in the first playable is generated here,
// so all audio is original to this project (no third-party samples).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const SR = 44100;

export class Buf {
  d: Float32Array;
  constructor(public seconds: number, public sr = SR) { this.d = new Float32Array(Math.ceil(seconds * sr)); }
  add(i: number, v: number) { if (i >= 0 && i < this.d.length) this.d[i] += v; }
  // mix another buffer in at time t
  mix(b: Float32Array, t: number, gain = 1) { const o = Math.round(t * this.sr); for (let i = 0; i < b.length; i++) this.add(o + i, b[i] * gain); }
  // wrap the tail past `loopLen` back to the start, so the loop is seamless
  wrapTo(loopLen: number) {
    const n = Math.round(loopLen * this.sr);
    const out = new Float32Array(n);
    for (let i = 0; i < this.d.length; i++) out[i % n] += this.d[i];
    this.d = out; this.seconds = loopLen;
  }
  normalize(peak = 0.89) {
    let m = 0; for (const v of this.d) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < this.d.length; i++) this.d[i] = (this.d[i] / m) * peak;
  }
  softClip(drive = 1.2) { for (let i = 0; i < this.d.length; i++) this.d[i] = Math.tanh(this.d[i] * drive); }
}

let seed = 1;
export const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise' | 'pulse25';
export function osc(w: Wave, ph: number): number {
  const p = ph - Math.floor(ph);
  switch (w) {
    case 'sine': return Math.sin(p * Math.PI * 2);
    case 'square': return p < 0.5 ? 1 : -1;
    case 'pulse25': return p < 0.25 ? 1 : -1;
    case 'saw': return p * 2 - 1;
    case 'tri': return p < 0.5 ? p * 4 - 1 : 3 - p * 4;
    case 'noise': return noise();
  }
}

export interface Tone {
  wave: Wave; freq: number | ((t: number) => number); dur: number;
  a?: number; d?: number; s?: number; r?: number; gain?: number;
  vib?: number; vibRate?: number; lp?: number; // one-pole low-pass cutoff in Hz
  hp?: number;
}

export function tone(t: Tone, sr = SR): Float32Array {
  const a = t.a ?? 0.005, d = t.d ?? 0.05, s = t.s ?? 0.7, r = t.r ?? 0.05;
  const total = t.dur + r;
  const out = new Float32Array(Math.ceil(total * sr));
  let ph = 0, lp = 0, hpPrev = 0, hpOut = 0;
  const lpA = t.lp ? 1 - Math.exp((-2 * Math.PI * t.lp) / sr) : 1;
  const hpA = t.hp ? Math.exp((-2 * Math.PI * t.hp) / sr) : 0;
  for (let i = 0; i < out.length; i++) {
    const tt = i / sr;
    let env: number;
    if (tt < a) env = tt / a;
    else if (tt < a + d) env = 1 - (1 - s) * ((tt - a) / d);
    else if (tt < t.dur) env = s;
    else env = s * Math.max(0, 1 - (tt - t.dur) / r);
    let f = typeof t.freq === 'function' ? t.freq(tt) : t.freq;
    if (t.vib) f *= 1 + Math.sin(tt * Math.PI * 2 * (t.vibRate ?? 5.5)) * t.vib;
    ph += f / sr;
    let v = osc(t.wave, ph);
    lp += (v - lp) * lpA; v = lp;
    if (t.hp) { hpOut = hpA * (hpOut + v - hpPrev); hpPrev = v; v = hpOut; }
    out[i] = v * env * (t.gain ?? 1);
  }
  return out;
}

export function writeAudio(buf: Buf, file: string, opts: { mono?: boolean; kbps?: number } = {}) {
  const wav = path.join(path.dirname(file), '.tmp-' + path.basename(file) + '.wav');
  const n = buf.d.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(buf.sr, 24);
  b.writeUInt32LE(buf.sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf.d[i])) * 32767), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(wav, b);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', `${opts.kbps ?? 96}k`, file]);
  fs.unlinkSync(wav);
}
