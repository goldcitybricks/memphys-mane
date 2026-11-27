// Generates all SFX and music into public/assets/audio as MP3.
import path from 'node:path';
import fs from 'node:fs';
import { Buf, tone, mtof, writeAudio, noise, SR } from './synth';

const OUT = path.resolve('public/assets/audio');
fs.mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ drum voices
const kick = (g = 1) => tone({ wave: 'sine', freq: (t) => 45 + 120 * Math.exp(-t * 35), dur: 0.22, a: 0.001, d: 0.2, s: 0, r: 0.02, gain: g });
const snare = (g = 1) => {
  const n = tone({ wave: 'noise', freq: 1, dur: 0.16, a: 0.001, d: 0.15, s: 0, r: 0.02, gain: 0.8 * g, lp: 7000, hp: 900 });
  const b = tone({ wave: 'tri', freq: (t) => 200 - t * 300, dur: 0.08, a: 0.001, d: 0.08, s: 0, gain: 0.5 * g });
  const o = new Float32Array(n.length); for (let i = 0; i < n.length; i++) o[i] = n[i] + (b[i] ?? 0); return o;
};
const clap = (g = 1) => {
  const o = new Float32Array(Math.ceil(0.2 * SR));
  for (const off of [0, 0.011, 0.022]) {
    const n = tone({ wave: 'noise', freq: 1, dur: off === 0.022 ? 0.14 : 0.02, a: 0.001, d: off === 0.022 ? 0.14 : 0.02, s: 0, gain: 0.7 * g, lp: 5000, hp: 1200 });
    const s = Math.round(off * SR); for (let i = 0; i < n.length && s + i < o.length; i++) o[s + i] += n[i];
  }
  return o;
};
const hat = (g = 1, open = false) => tone({ wave: 'noise', freq: 1, dur: open ? 0.12 : 0.03, a: 0.001, d: open ? 0.12 : 0.03, s: 0, gain: 0.35 * g, hp: 7000 });
const b808 = (note: number, dur: number, glideFrom?: number) => tone({
  wave: 'sine', dur, a: 0.003, d: dur * 0.8, s: 0.35, r: 0.08, gain: 0.95,
  freq: (t) => { const f = mtof(note); if (glideFrom === undefined) return f; const f0 = mtof(glideFrom); return f0 + (f - f0) * Math.min(1, t / 0.06); },
});
const bell = (note: number, dur: number, g = 0.35) => {
  const a = tone({ wave: 'sine', freq: mtof(note), dur, a: 0.002, d: dur, s: 0, r: 0.3, gain: g });
  const b = tone({ wave: 'sine', freq: mtof(note) * 2.76, dur: dur * 0.4, a: 0.001, d: dur * 0.4, s: 0, r: 0.1, gain: g * 0.4 });
  const c = tone({ wave: 'sine', freq: mtof(note) * 5.4, dur: dur * 0.15, a: 0.001, d: dur * 0.15, s: 0, r: 0.05, gain: g * 0.2 });
  for (let i = 0; i < b.length; i++) a[i] += b[i]; for (let i = 0; i < c.length; i++) a[i] += c[i];
  return a;
};
const lead = (note: number, dur: number, g = 0.16, wave: 'square' | 'pulse25' = 'pulse25') =>
  tone({ wave, freq: mtof(note), dur, a: 0.005, d: 0.08, s: 0.6, r: 0.06, gain: g, vib: 0.006, lp: 3200 });
const pad = (notes: number[], dur: number, g = 0.07) => {
  const o = new Float32Array(Math.ceil((dur + 0.3) * SR));
  for (const n of notes) for (const det of [0.997, 1.003]) {
    const t = tone({ wave: 'saw', freq: mtof(n) * det, dur, a: 0.3, d: 0.2, s: 0.8, r: 0.3, gain: g, lp: 1200 });
    for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i];
  }
  return o;
};
const keys = (notes: number[], dur: number, g = 0.12) => {
  const o = new Float32Array(Math.ceil((dur + 0.5) * SR));
  for (const n of notes) {
    const t = tone({ wave: 'sine', freq: mtof(n), dur, a: 0.004, d: dur * 0.9, s: 0.25, r: 0.4, gain: g, vib: 0.002, vibRate: 4 });
    const h = tone({ wave: 'tri', freq: mtof(n) * 2, dur: dur * 0.3, a: 0.002, d: dur * 0.3, s: 0, r: 0.1, gain: g * 0.25 });
    for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i] * (1 + 0.15 * Math.sin((i / SR) * Math.PI * 2 * 5));
    for (let i = 0; i < h.length && i < o.length; i++) o[i] += h[i];
  }
  return o;
};

// ------------------------------------------------------------------ "Pit Stop" (Mission 1, Hip Hop station)
// 140 BPM half-time, C minor, triplet hat rolls, 808s and an eerie bell. Original composition.
function missionTrack() {
  const bpm = 140, beat = 60 / bpm, bar = beat * 4, bars = 32;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // i - VI - iv - V  (Cm, Ab, Fm, G)
  const prog = [[48, 51, 55], [44, 48, 51], [41, 44, 48], [43, 47, 50]];
  const roots = [36, 32, 29, 31];
  const bellLine = [72, 75, 79, 75, 74, 72, 70, 67]; // eighths over two beats
  const hook = [[0, 79, 1], [1, 77, 0.5], [1.5, 75, 0.5], [2, 74, 1], [3, 75, 0.5], [3.5, 72, 2.5], [8, 79, 1], [9, 80, 0.5], [9.5, 79, 0.5], [10, 77, 1], [11, 75, 1], [12, 74, 1], [13, 71, 3]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = b % 4, sec = Math.floor(b / 8); // 4 sections of 8 bars
    // drums: kick on 1 and the "and" of 3, snare/clap on 3 (half-time)
    if (sec > 0 || b >= 4) {
      m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 2.5);
      if (b % 2 === 1) m.mix(kick(0.7), t0 + beat * 1.75);
      m.mix(snare(0.8), t0 + beat * 2); m.mix(clap(0.6), t0 + beat * 2);
    }
    // hats: 8ths, with triplet rolls at the end of every other bar
    for (let k = 0; k < 8; k++) {
      const roll = b % 2 === 1 && k >= 6;
      if (roll) for (let j = 0; j < 3; j++) m.mix(hat(0.8), t0 + beat * (3 + (k - 6) * 0.5) + j * (beat / 6));
      else m.mix(hat(k % 2 ? 0.6 : 0.9), t0 + k * (beat / 2));
    }
    if (b % 4 === 3) m.mix(hat(0.6, true), t0 + beat * 3.5);
    // 808
    if (b >= 2) {
      m.mix(b808(roots[ch], beat * 1.6), t0);
      m.mix(b808(roots[ch], beat * 0.8, roots[ch] + 12), t0 + beat * 2.5);
      if (b % 2) m.mix(b808(roots[ch] + 7, beat * 0.4), t0 + beat * 3.5, 0.8);
    }
    // pad + bell motif
    m.mix(pad(prog[ch], bar * 0.95), t0, 0.9);
    for (let k = 0; k < 8; k++) {
      const n = bellLine[k] - (ch === 1 ? 4 : ch === 2 ? 7 : ch === 3 ? -2 : 0);
      if (sec !== 2 || k % 2 === 0) m.mix(bell(n, beat * 0.45, k === 0 ? 0.3 : 0.2), t0 + k * (beat / 2));
    }
    // chiptune hook in sections 2 and 4
    if ((sec === 1 || sec === 3) && b % 8 < 4 && b % 4 === 0) {
      for (const [st, n, d] of hook) m.mix(lead(n - (sec === 3 ? 0 : 12), beat * d * 0.95, 0.12), t0 + st * beat);
    }
  }
  m.wrapTo(len);
  m.softClip(1.3);
  m.normalize(0.8);
  return m;
}

// ------------------------------------------------------------------ "Back Door Soul" (title, Soul station)
function titleTrack() {
  const bpm = 84, beat = 60 / bpm, bar = beat * 4, bars = 8;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // Ebmaj7 - Cm7 - Fm7 - Bb7
  const prog = [[51, 55, 58, 62], [48, 51, 55, 58], [53, 56, 60, 63], [46, 50, 53, 56]];
  const roots = [39, 36, 41, 34];
  const mel = [[0, 74, 1.5], [1.5, 75, 0.5], [2, 77, 1], [3, 79, 1], [4, 75, 2], [6, 72, 1], [7, 70, 1]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = b % 4;
    m.mix(keys(prog[ch], beat * 1.8), t0);
    m.mix(keys(prog[ch].map((n) => n + 12).slice(1), beat * 0.9, 0.06), t0 + beat * 2.5);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch]), dur: beat * 1.5, a: 0.01, d: 0.4, s: 0.6, r: 0.1, gain: 0.5 }), t0);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch] + 7), dur: beat * 0.8, a: 0.01, d: 0.3, s: 0.5, r: 0.1, gain: 0.4 }), t0 + beat * 2.5);
    m.mix(kick(0.7), t0); m.mix(kick(0.5), t0 + beat * 1.5); m.mix(snare(0.45), t0 + beat); m.mix(snare(0.45), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.35 : 0.55), t0 + k * (beat / 2) + (k % 2 ? beat * 0.08 : 0)); // swung
    if (b >= 4 && b % 2 === 0) for (const [st, n, d] of mel) m.mix(lead(n, beat * d * 0.9, 0.08, 'square'), t0 + st * beat);
  }
  m.wrapTo(len);
  m.softClip(1.2);
  m.normalize(0.75);
  return m;
}

function victoryJingle() {
  const m = new Buf(3.2);
  const notes = [60, 64, 67, 72, 76, 79];
  notes.forEach((n, i) => m.mix(lead(n, 0.12, 0.25, 'square'), i * 0.09));
  m.mix(lead(84, 1.4, 0.22, 'square'), 0.6);
  m.mix(keys([60, 64, 67, 71], 1.6, 0.14), 0.6);
  m.mix(kick(), 0.6); m.mix(clap(0.8), 0.6);
  m.normalize(0.85);
  return m;
}

// ------------------------------------------------------------------ "River Keeper" (Mission 2, Soul station)
// 92 BPM, D Phrygian dominant (the old-world flavor), Rhodes-style keys, round bass, a reedy flute lead. Original.
const flute = (note: number, dur: number, g = 0.14) => {
  const a = tone({ wave: 'sine', freq: mtof(note), dur, a: 0.04, d: 0.1, s: 0.8, r: 0.12, gain: g, vib: 0.012, vibRate: 5 });
  const n = tone({ wave: 'noise', freq: 1, dur, a: 0.03, d: 0.1, s: 0.3, r: 0.1, gain: g * 0.12, lp: 3000, hp: 1200 });
  for (let i = 0; i < n.length && i < a.length; i++) a[i] += n[i];
  return a;
};
const frame = (g = 1) => tone({ wave: 'noise', freq: 1, dur: 0.05, a: 0.001, d: 0.05, s: 0, gain: 0.5 * g, lp: 4000, hp: 1500 }); // finger drum
const doum = (g = 1) => tone({ wave: 'sine', freq: (t) => 70 + 60 * Math.exp(-t * 20), dur: 0.3, a: 0.002, d: 0.28, s: 0, gain: g });
function riverTrack() {
  const bpm = 92, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // D phrygian dominant: D Eb F# G A Bb C. Chords: D, Eb, Cm, D
  const prog = [[50, 54, 57, 60], [51, 55, 58, 62], [48, 51, 55, 58], [50, 54, 57, 62]];
  const roots = [38, 39, 36, 38];
  const mel = [[0, 74, 1], [1, 75, 0.5], [1.5, 78, 0.5], [2, 79, 1.5], [3.5, 78, 0.5], [4, 75, 1], [5, 74, 1], [6, 72, 0.5], [6.5, 70, 0.5], [7, 74, 1]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = Math.floor(b / 2) % 4, sec = Math.floor(b / 4);
    m.mix(keys(prog[ch], beat * 1.8, 0.1), t0);
    m.mix(keys(prog[ch].slice(1).map((n) => n + 12), beat * 0.8, 0.05), t0 + beat * 2.5);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch]), dur: beat * 1.4, a: 0.01, d: 0.4, s: 0.6, r: 0.1, gain: 0.55 }), t0);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch] + 7), dur: beat * 0.7, a: 0.01, d: 0.3, s: 0.5, r: 0.1, gain: 0.4 }), t0 + beat * 2.5);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch] + 12), dur: beat * 0.5, a: 0.01, d: 0.3, s: 0.5, r: 0.1, gain: 0.35 }), t0 + beat * 3.5);
    if (sec > 0) { m.mix(kick(0.7), t0); m.mix(kick(0.5), t0 + beat * 2.5); m.mix(snare(0.4), t0 + beat); m.mix(snare(0.45), t0 + beat * 3); }
    // doum-tek pattern on a hand drum
    m.mix(doum(0.5), t0); m.mix(doum(0.4), t0 + beat * 1.5);
    for (let k = 0; k < 8; k++) m.mix(frame(k % 2 ? 0.5 : 0.8), t0 + k * (beat / 2) + (k % 2 ? beat * 0.07 : 0));
    if (sec >= 1 && b % 2 === 0) for (const [st, n, d] of mel) m.mix(flute(n - (sec === 2 ? 12 : 0), beat * d * 0.95), t0 + st * beat);
  }
  m.wrapTo(len);
  m.softClip(1.2);
  m.normalize(0.75);
  return m;
}

// ------------------------------------------------------------------ "Jackal March" (Mission 2 boss)
function bossTrack() {
  const bpm = 150, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  const roots = [38, 39, 38, 36];
  const riff = [0, 1, 4, 3, 1, 0, 1, 7];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = Math.floor(b / 2) % 4;
    m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 1.5); m.mix(kick(0.9), t0 + beat * 2); if (b % 2) m.mix(kick(0.7), t0 + beat * 3.5);
    m.mix(snare(0.8), t0 + beat); m.mix(snare(0.8), t0 + beat * 3); m.mix(clap(0.5), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.5 : 0.8), t0 + k * (beat / 2));
    for (let k = 0; k < 8; k++) {
      const n = roots[ch] + [0, 1, 4, 5, 7, 8, 10, 12][riff[k]];
      m.mix(tone({ wave: 'saw', freq: mtof(n), dur: beat * 0.4, a: 0.003, d: 0.1, s: 0.5, r: 0.04, gain: 0.3, lp: 900 }), t0 + k * (beat / 2));
    }
    m.mix(b808(roots[ch], beat * 1.8), t0, 0.8);
    if (b >= 8) for (let k = 0; k < 4; k++) m.mix(lead(roots[ch] + 36 + [0, 1, 4, 1][k], beat * 0.9, 0.1, 'square'), t0 + k * beat);
  }
  m.wrapTo(len);
  m.softClip(1.4);
  m.normalize(0.8);
  return m;
}

// ------------------------------------------------------------------ SFX
function sfx(dur: number, fn: (b: Buf) => void, peak = 0.9) {
  const b = new Buf(dur);
  fn(b);
  b.normalize(peak);
  return b;
}

const S: Record<string, Buf> = {
  punch: sfx(0.18, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.05, a: 0.001, d: 0.05, s: 0, gain: 0.9, lp: 3000 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 160 - t * 600, dur: 0.1, a: 0.001, d: 0.1, s: 0, gain: 1 }), 0);
  }),
  punchHeavy: sfx(0.35, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.09, a: 0.001, d: 0.09, s: 0, gain: 1, lp: 2500 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 120 - t * 250, dur: 0.25, a: 0.001, d: 0.25, s: 0, gain: 1.2 }), 0);
    b.mix(tone({ wave: 'square', freq: (t) => 90 - t * 100, dur: 0.12, a: 0.001, d: 0.12, s: 0, gain: 0.3, lp: 800 }), 0);
  }),
  whiff: sfx(0.16, (b) => b.mix(tone({ wave: 'noise', freq: 1, dur: 0.12, a: 0.03, d: 0.1, s: 0, gain: 0.6, lp: 1800, hp: 400 }), 0), 0.5),
  // Mane's hollow can "tonk" when he gets hit
  tonk: sfx(0.4, (b) => {
    b.mix(tone({ wave: 'sine', freq: 520, dur: 0.3, a: 0.001, d: 0.3, s: 0, gain: 0.8 }), 0);
    b.mix(tone({ wave: 'sine', freq: 1310, dur: 0.18, a: 0.001, d: 0.18, s: 0, gain: 0.4 }), 0);
    b.mix(tone({ wave: 'sine', freq: 2270, dur: 0.08, a: 0.001, d: 0.08, s: 0, gain: 0.3 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.02, a: 0.001, d: 0.02, s: 0, gain: 0.5, hp: 2000 }), 0);
  }),
  jump: sfx(0.2, (b) => b.mix(tone({ wave: 'square', freq: (t) => 220 + t * 1800, dur: 0.14, a: 0.002, d: 0.14, s: 0, gain: 0.35, lp: 3000 }), 0), 0.5),
  land: sfx(0.12, (b) => b.mix(tone({ wave: 'sine', freq: (t) => 110 - t * 400, dur: 0.08, a: 0.001, d: 0.08, s: 0, gain: 1 }), 0), 0.55),
  pickup: sfx(0.4, (b) => [76, 79, 84, 88].forEach((n, i) => b.mix(tone({ wave: 'square', freq: mtof(n), dur: 0.07, a: 0.001, d: 0.06, s: 0.3, r: 0.03, gain: 0.3, lp: 5000 }), i * 0.055)), 0.6),
  // can open "pssh" then a glug
  sip: sfx(1.0, (b) => {
    b.mix(tone({ wave: 'sine', freq: 2400, dur: 0.02, a: 0.001, d: 0.02, s: 0, gain: 0.6 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.28, a: 0.003, d: 0.28, s: 0, gain: 0.8, hp: 3500 }), 0.01);
    for (let i = 0; i < 4; i++) b.mix(tone({ wave: 'sine', freq: (t) => 180 + i * 15 + t * 900, dur: 0.07, a: 0.005, d: 0.07, s: 0, gain: 0.7 }), 0.38 + i * 0.13);
  }),
  maneMode: sfx(1.3, (b) => {
    [48, 55, 60, 64, 67, 72].forEach((n, i) => b.mix(tone({ wave: 'saw', freq: mtof(n), dur: 0.9 - i * 0.05, a: 0.01, d: 0.3, s: 0.6, r: 0.3, gain: 0.22, lp: 2500 }), i * 0.04));
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.5, a: 0.3, d: 0.2, s: 0, gain: 0.25, hp: 4000 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 60 + t * 40, dur: 0.6, a: 0.001, d: 0.6, s: 0, gain: 0.8 }), 0);
  }),
  horn: sfx(0.7, (b) => {
    for (const [st, d] of [[0, 0.16], [0.24, 0.36]]) {
      b.mix(tone({ wave: 'square', freq: 392, dur: d, a: 0.005, d: 0.02, s: 0.9, r: 0.03, gain: 0.3, lp: 2200 }), st);
      b.mix(tone({ wave: 'square', freq: 466, dur: d, a: 0.005, d: 0.02, s: 0.9, r: 0.03, gain: 0.3, lp: 2200 }), st);
    }
  }, 0.7),
  carBy: sfx(1.4, (b) => {
    b.mix(tone({ wave: 'saw', freq: (t) => (t < 0.6 ? 70 + t * 30 : 88 - (t - 0.6) * 40), dur: 1.2, a: 0.25, d: 0.3, s: 0.8, r: 0.2, gain: 0.5, lp: 600 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 1.2, a: 0.4, d: 0.5, s: 0.4, r: 0.2, gain: 0.4, lp: 1500 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.3, a: 0.01, d: 0.3, s: 0, gain: 0.3, hp: 3000 }), 0.1); // tire squeal-ish
  }, 0.8),
  bottle: sfx(0.3, (b) => {
    for (let i = 0; i < 6; i++) b.mix(tone({ wave: 'noise', freq: 1, dur: 0.02, a: 0.001, d: 0.02, s: 0, gain: 0.6, hp: 2500, lp: 9000 }), i * 0.025 + noise() * 0.004 + 0.004);
    b.mix(tone({ wave: 'sine', freq: 900, dur: 0.05, a: 0.001, d: 0.05, s: 0, gain: 0.3 }), 0);
  }, 0.6),
  throw: sfx(0.2, (b) => b.mix(tone({ wave: 'noise', freq: 1, dur: 0.15, a: 0.05, d: 0.1, s: 0, gain: 0.6, lp: 2500, hp: 900 }), 0), 0.4),
  ko: sfx(0.7, (b) => {
    b.mix(tone({ wave: 'sine', freq: (t) => 90 - t * 60, dur: 0.5, a: 0.001, d: 0.5, s: 0, gain: 1 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.2, a: 0.001, d: 0.2, s: 0, gain: 0.6, lp: 1200 }), 0);
  }),
  // grill shine "ting"
  shine: sfx(0.9, (b) => {
    b.mix(tone({ wave: 'sine', freq: 2093, dur: 0.6, a: 0.001, d: 0.6, s: 0, r: 0.2, gain: 0.5 }), 0);
    b.mix(tone({ wave: 'sine', freq: 3136, dur: 0.4, a: 0.001, d: 0.4, s: 0, gain: 0.3 }), 0.06);
    b.mix(tone({ wave: 'sine', freq: 4186, dur: 0.3, a: 0.001, d: 0.3, s: 0, gain: 0.2 }), 0.12);
  }, 0.55),
  select: sfx(0.15, (b) => { b.mix(tone({ wave: 'square', freq: mtof(84), dur: 0.05, a: 0.001, d: 0.05, s: 0.4, gain: 0.3 }), 0); b.mix(tone({ wave: 'square', freq: mtof(91), dur: 0.06, a: 0.001, d: 0.06, s: 0.4, gain: 0.3 }), 0.05); }, 0.45),
  grunt: sfx(0.2, (b) => b.mix(tone({ wave: 'saw', freq: (t) => 150 - t * 200, dur: 0.14, a: 0.005, d: 0.14, s: 0, gain: 0.6, lp: 900 }), 0), 0.5),
  eat: sfx(0.6, (b) => {
    for (let i = 0; i < 3; i++) b.mix(tone({ wave: 'noise', freq: 1, dur: 0.06, a: 0.005, d: 0.06, s: 0, gain: 0.6, lp: 1400 }), i * 0.14);
    [72, 76, 79].forEach((n, i) => b.mix(tone({ wave: 'tri', freq: mtof(n), dur: 0.08, a: 0.001, d: 0.08, s: 0.3, gain: 0.4 }), 0.42 + i * 0.05));
  }, 0.6),
  splash: sfx(0.45, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.35, a: 0.005, d: 0.35, s: 0, gain: 0.8, lp: 2600, hp: 300 }), 0);
    for (let i = 0; i < 4; i++) b.mix(tone({ wave: 'sine', freq: (t) => 500 + i * 120 + t * 2000, dur: 0.04, a: 0.002, d: 0.04, s: 0, gain: 0.4 }), 0.05 + i * 0.05);
  }, 0.6),
  bark: sfx(0.3, (b) => {
    for (const st of [0, 0.15]) b.mix(tone({ wave: 'saw', freq: (t) => 520 - t * 1800, dur: 0.08, a: 0.004, d: 0.08, s: 0, gain: 0.6, lp: 2000 }), st);
  }, 0.55),
  crash: sfx(0.5, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.4, a: 0.001, d: 0.4, s: 0, gain: 0.8, hp: 1500 }), 0);
    b.mix(tone({ wave: 'sine', freq: 340, dur: 0.3, a: 0.001, d: 0.3, s: 0, gain: 0.4 }), 0);
    b.mix(tone({ wave: 'sine', freq: 817, dur: 0.2, a: 0.001, d: 0.2, s: 0, gain: 0.3 }), 0);
  }, 0.7),
  portal: sfx(1.6, (b) => {
    [60, 63, 67, 70, 72, 75, 79, 82].forEach((n, i) => b.mix(bell(n, 0.4, 0.3), i * 0.12));
    b.mix(tone({ wave: 'noise', freq: 1, dur: 1.2, a: 0.6, d: 0.4, s: 0, gain: 0.2, hp: 3000 }), 0.2);
  }, 0.7),
  burst: sfx(1.0, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.3, a: 0.001, d: 0.3, s: 0, gain: 0.9, hp: 2500 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 80 + t * 300, dur: 0.5, a: 0.001, d: 0.5, s: 0, gain: 1 }), 0);
    [72, 76, 79, 84].forEach((n, i) => b.mix(lead(n, 0.12, 0.3, 'square'), 0.2 + i * 0.06));
  }),
  blip: sfx(0.05, (b) => b.mix(tone({ wave: 'square', freq: 1200, dur: 0.02, a: 0.001, d: 0.02, s: 0.2, gain: 0.2 }), 0), 0.25),
};

for (const [k, b] of Object.entries(S)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(missionTrack(), path.join(OUT, 'music_pitstop.mp3'), { kbps: 112 });
writeAudio(titleTrack(), path.join(OUT, 'music_backdoor.mp3'), { kbps: 112 });
writeAudio(victoryJingle(), path.join(OUT, 'music_victory.mp3'), { kbps: 112 });
// Mission 2 sounds come after Mission 1's so the shared noise generator leaves Mission 1's files byte-identical
const S2: Record<string, Buf> = {
  // jackal howl: a rising, wavering wail
  howl: sfx(1.4, (b) => {
    b.mix(tone({ wave: 'saw', freq: (t) => 300 + Math.min(1, t * 2) * 380 - Math.max(0, t - 0.8) * 500, dur: 1.2, a: 0.1, d: 0.3, s: 0.8, r: 0.2, gain: 0.5, lp: 1600, vib: 0.03, vibRate: 7 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 600 + Math.min(1, t * 2) * 760 - Math.max(0, t - 0.8) * 900, dur: 1.2, a: 0.1, d: 0.3, s: 0.6, r: 0.2, gain: 0.3, vib: 0.03, vibRate: 7 }), 0);
  }, 0.7),
  // bronze blade "shing"
  clang: sfx(0.6, (b) => {
    for (const [f, g] of [[1320, 0.5], [2150, 0.35], [3410, 0.25], [4870, 0.15]]) b.mix(tone({ wave: 'sine', freq: f, dur: 0.5, a: 0.001, d: 0.5, s: 0, gain: g }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.06, a: 0.001, d: 0.06, s: 0, gain: 0.5, hp: 3000 }), 0);
  }, 0.6),
  // hooves and wheels: the chariot passing
  hooves: sfx(1.4, (b) => {
    for (let i = 0; i < 12; i++) b.mix(tone({ wave: 'noise', freq: 1, dur: 0.04, a: 0.001, d: 0.04, s: 0, gain: 0.5 + Math.sin((i / 12) * Math.PI) * 0.5, lp: 900 }), i * 0.1 + (i % 2) * 0.03);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 1.2, a: 0.4, d: 0.5, s: 0.4, r: 0.2, gain: 0.3, lp: 500 }), 0);
  }, 0.8),
  // clay pot shattering
  potBreak: sfx(0.4, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.25, a: 0.001, d: 0.25, s: 0, gain: 0.9, lp: 3500, hp: 600 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 300 - t * 400, dur: 0.1, a: 0.001, d: 0.1, s: 0, gain: 0.5 }), 0);
    for (let i = 0; i < 4; i++) b.mix(tone({ wave: 'noise', freq: 1, dur: 0.02, a: 0.001, d: 0.02, s: 0, gain: 0.4, hp: 2000 }), 0.08 + i * 0.04);
  }, 0.6),
  // the golden jar's lid slamming shut
  seal: sfx(1.2, (b) => {
    b.mix(tone({ wave: 'sine', freq: (t) => 110 - t * 30, dur: 1.0, a: 0.001, d: 1.0, s: 0, gain: 1 }), 0);
    for (const [f, g] of [[520, 0.4], [870, 0.25], [1310, 0.15]]) b.mix(tone({ wave: 'sine', freq: f, dur: 0.9, a: 0.001, d: 0.9, s: 0, gain: g }), 0);
  }, 0.8),
};
for (const [k, b] of Object.entries(S2)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(riverTrack(), path.join(OUT, 'music_river.mp3'), { kbps: 112 });
writeAudio(bossTrack(), path.join(OUT, 'music_jackal.mp3'), { kbps: 112 });
console.log(`audio: ${Object.keys(S).length + Object.keys(S2).length} sfx + 5 music files written to ${OUT}`);
