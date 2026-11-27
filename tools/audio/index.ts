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

// ------------------------------------------------------------------ Mission 3: Fight Night
// "Fight Night" (Hip Hop station): 96 BPM boom-bap, horn-like square stabs, a walking 808. Original.
function fightTrack() {
  const bpm = 96, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // Gm - Eb - Cm - D
  const prog = [[55, 58, 62], [51, 55, 58], [48, 51, 55], [50, 54, 57]];
  const roots = [31, 27, 24, 26];
  const stab = (notes: number[], t: number, d: number, g = 0.1) => { for (const n of notes) m.mix(tone({ wave: 'square', freq: mtof(n + 12), dur: d, a: 0.003, d: 0.06, s: 0.5, r: 0.05, gain: g, lp: 2400 }), t); };
  const hook = [[0, 74, 0.5], [0.5, 74, 0.5], [1, 77, 0.75], [2, 74, 0.5], [2.5, 72, 0.5], [3, 70, 1]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = Math.floor(b / 2) % 4, sec = Math.floor(b / 4);
    // boom-bap: kick on 1 and the "and" of 2, snare on 2 and 4
    m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 1.5); if (b % 2) m.mix(kick(0.7), t0 + beat * 2.75);
    m.mix(snare(0.9), t0 + beat); m.mix(snare(0.9), t0 + beat * 3); m.mix(clap(0.5), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.45 : 0.8), t0 + k * (beat / 2) + (k % 2 ? beat * 0.06 : 0));
    if (b % 4 === 3) m.mix(hat(0.6, true), t0 + beat * 3.5);
    // 808 walks the root
    m.mix(b808(roots[ch], beat * 1.4), t0, 0.9);
    m.mix(b808(roots[ch] + 7, beat * 0.4), t0 + beat * 2, 0.7);
    m.mix(b808(roots[ch] + 12, beat * 0.4, roots[ch] + 7), t0 + beat * 2.5, 0.7);
    // horn stabs on the off-beats
    if (sec > 0) { stab(prog[ch], t0 + beat * 0.5, beat * 0.25); stab(prog[ch], t0 + beat * 2.5, beat * 0.25, 0.08); }
    // the hook every other bar in the back half
    if (sec >= 2 && b % 2 === 0) for (const [st, n, d] of hook) m.mix(lead(n - (ch === 1 ? 4 : ch === 2 ? 7 : 0), beat * d * 0.9, 0.11, 'square'), t0 + st * beat);
  }
  m.wrapTo(len);
  m.softClip(1.3);
  m.normalize(0.8);
  return m;
}

const S3: Record<string, Buf> = {
  // the ring bell: ding
  ding: sfx(1.6, (b) => {
    for (const [f, g] of [[1180, 0.6], [2950, 0.3], [4410, 0.15], [5960, 0.08]]) b.mix(tone({ wave: 'sine', freq: f, dur: 1.4, a: 0.001, d: 1.4, s: 0, gain: g }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.01, a: 0.001, d: 0.01, s: 0, gain: 0.4, hp: 3000 }), 0);
  }, 0.75),
  // a crowd roar swelling and fading
  crowd: sfx(2.6, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 2.2, a: 0.35, d: 1.2, s: 0.5, r: 0.4, gain: 0.8, lp: 1800, hp: 250 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 2.0, a: 0.5, d: 1.2, s: 0.4, r: 0.4, gain: 0.35, lp: 4200, hp: 1800 }), 0.1);
    for (let i = 0; i < 10; i++) b.mix(tone({ wave: 'saw', freq: 250 + noise() * 120, dur: 0.6, a: 0.1, d: 0.4, s: 0.2, r: 0.2, gain: 0.05, lp: 1400, vib: 0.03 }), 0.2 + i * 0.12);
  }, 0.6),
  // the crowd going "ooooh"
  ooh: sfx(1.6, (b) => {
    for (let i = 0; i < 8; i++) b.mix(tone({ wave: 'saw', freq: (t) => (180 + i * 23) * (1 + t * 0.08), dur: 1.2, a: 0.2, d: 0.6, s: 0.5, r: 0.3, gain: 0.08, lp: 900, vib: 0.02, vibRate: 4 + i * 0.3 }), i * 0.02);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 1.2, a: 0.3, d: 0.6, s: 0.3, r: 0.3, gain: 0.2, lp: 1200, hp: 300 }), 0);
  }, 0.55),
  // plastic bottle crunching
  crinkle: sfx(0.5, (b) => {
    for (let i = 0; i < 14; i++) b.mix(tone({ wave: 'noise', freq: 1, dur: 0.012, a: 0.001, d: 0.012, s: 0, gain: 0.3 + Math.abs(noise()) * 0.7, hp: 1800, lp: 9000 }), i * 0.03 + Math.abs(noise()) * 0.015);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.3, a: 0.02, d: 0.28, s: 0, gain: 0.25, hp: 3000 }), 0);
  }, 0.7),
  // the cap popping off and flying
  capPop: sfx(0.4, (b) => {
    b.mix(tone({ wave: 'sine', freq: (t) => 900 - t * 2400, dur: 0.06, a: 0.001, d: 0.06, s: 0, gain: 1 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.04, a: 0.001, d: 0.04, s: 0, gain: 0.6, hp: 2500 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.25, a: 0.05, d: 0.2, s: 0, gain: 0.3, lp: 2500, hp: 900 }), 0.06);
  }, 0.6),
  // old flashbulb: pop + whine
  flash: sfx(0.5, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.03, a: 0.001, d: 0.03, s: 0, gain: 0.8, hp: 2000 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 3000 + t * 3000, dur: 0.35, a: 0.01, d: 0.35, s: 0, gain: 0.15 }), 0.02);
  }, 0.45),
  // a blocked punch: dull glove-on-glove thud
  block: sfx(0.2, (b) => {
    b.mix(tone({ wave: 'sine', freq: (t) => 220 - t * 500, dur: 0.08, a: 0.001, d: 0.08, s: 0, gain: 0.8 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.04, a: 0.001, d: 0.04, s: 0, gain: 0.4, lp: 1200 }), 0);
  }, 0.55),
};
for (const [k, b] of Object.entries(S3)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(fightTrack(), path.join(OUT, 'music_fight.mp3'), { kbps: 112 });

// ------------------------------------------------------------------ Mission 4: "Bridge Run" (Blues and Rock station)
// A 12-bar blues-rock shuffle in E at 148 BPM: boogie bass, a crunchy saw "guitar" riff, harmonica-ish lead. Original composition.
const guitar = (notes: number[], dur: number, g = 0.12) => {
  const o = new Float32Array(Math.ceil((dur + 0.1) * SR));
  for (const n of notes) for (const det of [0.996, 1.004]) {
    const t = tone({ wave: 'saw', freq: mtof(n) * det, dur, a: 0.003, d: 0.1, s: 0.6, r: 0.05, gain: g, lp: 1800 });
    for (let i = 0; i < t.length && i < o.length; i++) o[i] += Math.tanh(t[i] * 3) * 0.5;
  }
  return o;
};
const harp = (note: number, dur: number, g = 0.12) => tone({ wave: 'square', freq: (t) => mtof(note) * (t < 0.04 ? 0.97 + t * 0.75 : 1), dur, a: 0.02, d: 0.1, s: 0.7, r: 0.08, gain: g, vib: 0.012, vibRate: 6, lp: 2600 });
function bridgeTrack() {
  const bpm = 148, beat = 60 / bpm, bar = beat * 4;
  const form = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7]; // 12-bar blues in E
  const bars = 24;
  const len = bar * bars;
  const m = new Buf(len + 2);
  const sw = (k: number) => (k % 2 ? beat * (2 / 3) : 0) + Math.floor(k / 2) * beat; // swung eighths
  const lick = [[0, 76, 0.66], [0.66, 79, 0.34], [1, 81, 0.5], [1.5, 79, 0.5], [2, 76, 1], [3, 74, 0.66], [3.66, 76, 1.3]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, off = form[b % 12], root = 40 + off, chorus = Math.floor(b / 12);
    // drums: kick 1 and 3, snare 2 and 4, shuffled hats
    m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 2);
    if (b % 2) m.mix(kick(0.6), t0 + sw(5));
    m.mix(snare(0.9), t0 + beat); m.mix(snare(0.9), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.5 : 0.85), t0 + sw(k));
    if (b % 12 === 11) for (let k = 0; k < 4; k++) m.mix(snare(0.5 + k * 0.12), t0 + beat * 2 + k * beat * 0.5);
    // boogie bass: root, 3rd, 5th, 6th, b7, 6th, 5th, 3rd
    const walk = [0, 4, 7, 9, 10, 9, 7, 4];
    for (let k = 0; k < 8; k++) m.mix(tone({ wave: 'tri', freq: mtof(root - 12 + walk[k]), dur: beat * 0.4, a: 0.004, d: 0.1, s: 0.7, r: 0.04, gain: 0.55 }), t0 + sw(k));
    // guitar chug: root+5th then root+6th, shuffled
    for (let k = 0; k < 8; k++) m.mix(guitar([root + 12, root + 12 + (k % 4 < 2 ? 7 : 9)], beat * 0.3, 0.1), t0 + sw(k));
    // harmonica lick on bars 1, 5 and 9 of the second chorus, a turnaround stab on 12
    if (chorus === 1 && b % 4 === 0) for (const [st, n, d] of lick) m.mix(harp(n + off, beat * d * 0.9, 0.1), t0 + st * beat);
    if (b % 12 === 11) m.mix(guitar([71, 75, 78], beat * 0.9, 0.12), t0);
  }
  m.wrapTo(len);
  m.softClip(1.2);
  m.normalize(0.8);
  return m;
}

const S4: Record<string, Buf> = {
  // sweet tea boost: a rising whoosh
  boost: sfx(0.9, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.8, a: 0.05, d: 0.6, s: 0.3, r: 0.1, gain: 0.7, lp: 6000, hp: 600 }), 0);
    b.mix(tone({ wave: 'saw', freq: (t) => 110 + t * 500, dur: 0.7, a: 0.02, d: 0.5, s: 0.3, r: 0.1, gain: 0.35, lp: 2000 }), 0);
  }, 0.7),
  // tires screeching in a drift
  skid: sfx(0.6, (b) => {
    b.mix(tone({ wave: 'square', freq: 1400, dur: 0.5, a: 0.03, d: 0.3, s: 0.6, r: 0.08, gain: 0.25, vib: 0.03, vibRate: 23, lp: 4000, hp: 900 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.5, a: 0.03, d: 0.3, s: 0.5, r: 0.08, gain: 0.35, lp: 5000, hp: 2500 }), 0);
  }, 0.5),
  // spinning out
  spin: sfx(0.7, (b) => {
    b.mix(tone({ wave: 'square', freq: (t) => 900 - t * 900, dur: 0.6, a: 0.005, d: 0.5, s: 0.3, r: 0.05, gain: 0.25, vib: 0.08, vibRate: 14, lp: 3000 }), 0);
  }, 0.55),
  // an AetherCar talking: "re-cal-cu-lat-ing"
  recalc: sfx(0.5, (b) => [84, 79, 84, 79, 76].forEach((n, i) => b.mix(tone({ wave: 'sine', freq: mtof(n), dur: 0.06, a: 0.002, d: 0.05, s: 0.4, r: 0.02, gain: 0.5 }), i * 0.08)), 0.45),
  // the tanker bursting: water rushing up into the sky
  geyser: sfx(3.0, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 2.6, a: 0.05, d: 2.0, s: 0.2, r: 0.4, gain: 1, lp: 2500, hp: 120 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 60 + t * 20, dur: 1.8, a: 0.01, d: 1.6, s: 0.1, r: 0.2, gain: 0.8 }), 0);
    for (let i = 0; i < 12; i++) b.mix(tone({ wave: 'sine', freq: (t) => 500 + i * 90 + t * 1500, dur: 0.05, a: 0.002, d: 0.05, s: 0, gain: 0.25 }), 0.6 + i * 0.17);
  }, 0.85),
};
for (const [k, b] of Object.entries(S4)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(bridgeTrack(), path.join(OUT, 'music_bridge.mp3'), { kbps: 112 });

// ------------------------------------------------------------------ Mission 5: The Plant
// "The Plant" (Hip Hop station): 92 BPM, dark and industrial. Clanking pipe percussion on the off-beats, a
// conveyor-belt arpeggio in F minor, 808s, a hiss on every fourth beat like a capping press. Original composition.
const pipeHit = (f: number, g = 0.5) => {
  const o = new Float32Array(Math.ceil(0.4 * SR));
  for (const [m, gg] of [[1, 1], [2.71, 0.5], [5.2, 0.25]]) { const t = tone({ wave: 'sine', freq: f * m, dur: 0.3, a: 0.001, d: 0.3, s: 0, gain: g * gg }); for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i]; }
  return o;
};
const hiss = (g = 0.4) => tone({ wave: 'noise', freq: 1, dur: 0.22, a: 0.02, d: 0.2, s: 0, gain: g, hp: 4000 });
function plantTrack() {
  const bpm = 92, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // Fm - Db - Bbm - C
  const roots = [29, 25, 22, 24];
  const arp = [[65, 68, 72, 75], [61, 65, 68, 72], [58, 61, 65, 70], [60, 64, 67, 72]];
  const hook = [[0, 77, 0.75], [1, 75, 0.5], [1.5, 72, 0.5], [2, 75, 1], [3, 73, 0.5], [3.5, 72, 0.5]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = Math.floor(b / 2) % 4, sec = Math.floor(b / 4);
    m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 1.75); m.mix(kick(0.7), t0 + beat * 2.5);
    m.mix(snare(0.9), t0 + beat); m.mix(snare(0.9), t0 + beat * 3); m.mix(clap(0.5), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.4 : 0.7), t0 + k * (beat / 2));
    // the machinery: pipe clanks on the off-beats, a press hiss on beat 4
    m.mix(pipeHit(420, 0.35), t0 + beat * 0.5); m.mix(pipeHit(311, 0.3), t0 + beat * 2.75);
    m.mix(hiss(0.35), t0 + beat * 3.5);
    m.mix(b808(roots[ch], beat * 1.6), t0, 0.9);
    m.mix(b808(roots[ch] + 12, beat * 0.4, roots[ch]), t0 + beat * 2.5, 0.6);
    // the conveyor: sixteenth-note arpeggio, comes in after the first 4 bars
    if (sec > 0) for (let k = 0; k < 16; k++) m.mix(tone({ wave: 'pulse25', freq: mtof(arp[ch][k % 4] - 12), dur: beat * 0.2, a: 0.002, d: 0.05, s: 0.4, r: 0.03, gain: 0.06, lp: 2800 }), t0 + k * (beat / 4));
    if (sec >= 2 && b % 2 === 0) for (const [st, n, d] of hook) m.mix(lead(n - (ch === 1 ? 4 : ch === 2 ? 7 : ch === 3 ? 5 : 0), beat * d * 0.9, 0.1, 'square'), t0 + st * beat);
  }
  m.wrapTo(len);
  m.softClip(1.3);
  m.normalize(0.8);
  return m;
}
// "Capping Line" (the Foreman fight): 132 BPM, driving, a stamping-press rhythm and an alarm-like lead. Original.
function foremanTrack() {
  const bpm = 132, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  const roots = [29, 29, 25, 27];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = b % 4, sec = Math.floor(b / 4);
    for (let k = 0; k < 4; k++) m.mix(kick(k === 0 ? 1 : 0.8), t0 + k * beat);
    m.mix(snare(0.8), t0 + beat); m.mix(snare(0.8), t0 + beat * 3);
    if (b % 2) m.mix(snare(0.5), t0 + beat * 3.75);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.8 : 0.4, k === 7), t0 + k * (beat / 2));
    // the press: clank-clank ... hiss
    m.mix(pipeHit(520, 0.3), t0 + beat * 0.5); m.mix(pipeHit(520, 0.3), t0 + beat * 0.75); m.mix(hiss(0.3), t0 + beat * 2.5);
    // driving bass: eighth notes on the root, octave jumps
    for (let k = 0; k < 8; k++) m.mix(tone({ wave: 'saw', freq: mtof(roots[ch] + 12 + (k % 4 === 3 ? 12 : 0)), dur: beat * 0.4, a: 0.003, d: 0.08, s: 0.6, r: 0.03, gain: 0.22, lp: 900 }), t0 + k * (beat / 2));
    // the alarm lead: two notes a half step apart, then a run
    if (sec >= 1) {
      const r = roots[ch] + 48;
      m.mix(lead(r + 7, beat * 0.9, 0.09, 'square'), t0); m.mix(lead(r + 8, beat * 0.9, 0.09, 'square'), t0 + beat);
      if (sec >= 2) [r + 12, r + 10, r + 8, r + 7].forEach((n, i) => m.mix(lead(n, beat * 0.4, 0.08, 'square'), t0 + beat * 2 + i * beat * 0.5));
    }
  }
  m.wrapTo(len);
  m.softClip(1.3);
  m.normalize(0.8);
  return m;
}
const S5: Record<string, Buf> = {
  // the Hydrator: a quick pressurized squirt
  spray: sfx(0.22, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.16, a: 0.003, d: 0.15, s: 0, gain: 0.8, lp: 6000, hp: 1500 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 900 - t * 2500, dur: 0.06, a: 0.001, d: 0.06, s: 0, gain: 0.4 }), 0);
  }, 0.55),
  // a Drifter snapping back: splash, then a little rising "oh!" chime
  hydrate: sfx(1.0, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.3, a: 0.003, d: 0.3, s: 0, gain: 0.7, lp: 3000, hp: 300 }), 0);
    [72, 76, 79, 84].forEach((n, i) => b.mix(bell(n, 0.3, 0.3), 0.18 + i * 0.07));
  }, 0.7),
  // Malik on the walkie: a click and static
  radio: sfx(0.3, (b) => {
    b.mix(tone({ wave: 'square', freq: 1800, dur: 0.015, a: 0.001, d: 0.015, s: 0, gain: 0.5 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.22, a: 0.01, d: 0.2, s: 0.2, gain: 0.35, lp: 3500, hp: 1200 }), 0.02);
  }, 0.45),
  // plant alarm: two-tone whoop
  alarm: sfx(1.0, (b) => {
    for (let i = 0; i < 2; i++) b.mix(tone({ wave: 'square', freq: (t) => 600 + Math.min(1, t / 0.35) * 300, dur: 0.38, a: 0.01, d: 0.1, s: 0.8, r: 0.05, gain: 0.3, lp: 2400 }), i * 0.45);
  }, 0.6),
  // a hydraulic piston: hiss and a heavy clunk
  piston: sfx(0.7, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.4, a: 0.01, d: 0.4, s: 0, gain: 0.6, hp: 3000 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 90 - t * 80, dur: 0.25, a: 0.001, d: 0.25, s: 0, gain: 1 }), 0.3);
    b.mix(pipeHit(180, 0.5), 0.3);
  }, 0.75),
  // the giant cap falling: a descending whistle
  whistle: sfx(1.1, (b) => b.mix(tone({ wave: 'sine', freq: (t) => 1800 - t * 1200, dur: 1.0, a: 0.05, d: 0.2, s: 0.8, r: 0.05, gain: 0.5, vib: 0.01, vibRate: 9 }), 0), 0.5),
};
for (const [k, b] of Object.entries(S5)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(plantTrack(), path.join(OUT, 'music_plant.mp3'), { kbps: 112 });
writeAudio(foremanTrack(), path.join(OUT, 'music_foreman.mp3'), { kbps: 112 });
console.log(`audio: ${Object.keys(S).length + Object.keys(S2).length + Object.keys(S3).length + Object.keys(S4).length + Object.keys(S5).length} sfx + 9 music files written to ${OUT}`);

// ------------------------------------------------------------------ Mission 6: Beale Below (Blues and Rock station, plus the murals' soul)
// "Beale Below" (the tunnels): a slow minor blues in G with a 12/8 lilt, 76 BPM. Organ chords, a walking bass,
// a bent guitar lick answering itself down the tunnel. Original composition.
const organ = (notes: number[], dur: number, g = 0.07) => {
  const o = new Float32Array(Math.ceil((dur + 0.2) * SR));
  for (const n of notes) for (const [mul, gg] of [[1, 1], [2, 0.5], [3, 0.25]] as const) {
    const t = tone({ wave: 'sine', freq: mtof(n) * mul, dur, a: 0.02, d: 0.1, s: 0.85, r: 0.12, gain: g * gg, vib: 0.004, vibRate: 6.5 });
    for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i];
  }
  return o;
};
const bend = (note: number, dur: number, g = 0.12) => tone({ wave: 'saw', freq: (t) => mtof(note) * (t < 0.08 ? 0.94 + t * 0.75 : 1), dur, a: 0.004, d: 0.15, s: 0.55, r: 0.1, gain: g, vib: 0.01, vibRate: 5.5, lp: 2200 });
function bealeTrack() {
  const bpm = 76, beat = 60 / bpm, bar = beat * 4, trip = beat / 3;
  const form = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7]; // quick-change 12-bar minor blues in G
  const bars = 12;
  const len = bar * bars;
  const m = new Buf(len + 2);
  const licks = [[0, 74, 0.66], [0.66, 77, 0.34], [1, 79, 1], [2.33, 77, 0.33], [2.66, 74, 1.2]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, off = form[b], root = 43 + off;
    const minor = [root + 12, root + 15, root + 19, root + 22];
    // drums: soft kick on 1 and 3, rim on 2 and 4, triplet hats
    m.mix(kick(0.8), t0); m.mix(kick(0.6), t0 + beat * 2); m.mix(kick(0.4), t0 + beat * 2 + trip * 2);
    m.mix(snare(0.5), t0 + beat); m.mix(snare(0.5), t0 + beat * 3);
    for (let k = 0; k < 12; k++) m.mix(hat(k % 3 === 0 ? 0.6 : 0.3), t0 + k * trip);
    // walking bass on the triplet grid
    const walk = [0, 3, 5, 7, 10, 7, 5, 3];
    for (let k = 0; k < 8; k++) m.mix(tone({ wave: 'tri', freq: mtof(root - 12 + walk[k]), dur: beat * 0.42, a: 0.004, d: 0.1, s: 0.7, r: 0.05, gain: 0.5 }), t0 + Math.floor(k / 2) * beat + (k % 2 ? trip * 2 : 0));
    // organ swell
    m.mix(organ(minor, bar * 0.95, 0.05), t0);
    // the guitar lick on bars 1, 5 and 9, and its echo two beats later
    if (b % 4 === 0) for (const [st, n, d] of licks) {
      m.mix(bend(n + off - 12 + 12, beat * d * 0.9, 0.11), t0 + st * beat);
      m.mix(bend(n + off - 12 + 12, beat * d * 0.9, 0.04), t0 + st * beat + beat * 0.75);
    }
    if (b === 11) m.mix(bend(62 + 12, beat * 1.5, 0.12), t0 + beat * 2);
  }
  m.wrapTo(len);
  m.softClip(1.2);
  m.normalize(0.78);
  return m;
}
// "Echo Hall" (the soul mural): 98 BPM, a Memphis soul groove in Bb with horn stabs and a tambourine. Original.
const horn = (notes: number[], dur: number, g = 0.09) => {
  const o = new Float32Array(Math.ceil((dur + 0.1) * SR));
  for (const n of notes) for (const det of [0.997, 1.003]) {
    const t = tone({ wave: 'saw', freq: (tt) => mtof(n) * det * (tt < 0.03 ? 0.97 + tt : 1), dur, a: 0.015, d: 0.08, s: 0.7, r: 0.06, gain: g, lp: 2400 });
    for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i];
  }
  return o;
};
const tamb = (g = 0.3) => tone({ wave: 'noise', freq: 1, dur: 0.06, a: 0.002, d: 0.06, s: 0, gain: g, hp: 6000 });
function soulTrack() {
  const bpm = 98, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  // Bb - Eb/Bb - Gm - F
  const prog = [[58, 62, 65], [58, 63, 67], [55, 58, 62], [53, 57, 60]];
  const roots = [34, 34, 31, 29];
  const bass = [[0, 0, 0.75], [1, 0, 0.25], [1.5, 7, 0.5], [2, 12, 0.5], [2.75, 10, 0.25], [3, 7, 0.75]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = Math.floor(b / 2) % 4, sec = Math.floor(b / 4);
    m.mix(kick(0.9), t0); m.mix(kick(0.7), t0 + beat * 1.5); m.mix(kick(0.8), t0 + beat * 2.5);
    m.mix(snare(0.8), t0 + beat); m.mix(snare(0.8), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.35 : 0.6), t0 + k * (beat / 2));
    for (let k = 0; k < 4; k++) m.mix(tamb(k % 2 ? 0.35 : 0.2), t0 + k * beat + beat * 0.5);
    for (const [st, iv, d] of bass) m.mix(tone({ wave: 'tri', freq: mtof(roots[ch] + iv), dur: beat * d * 0.9, a: 0.004, d: 0.1, s: 0.7, r: 0.04, gain: 0.55 }), t0 + st * beat);
    m.mix(keys(prog[ch], beat * 0.4, 0.09), t0 + beat * 0.5); m.mix(keys(prog[ch], beat * 0.4, 0.09), t0 + beat * 2.5);
    // horn stabs answer on the "and" of 4, a rising line in the second half
    if (sec >= 1) m.mix(horn(prog[ch].map((n) => n + 12), beat * 0.3), t0 + beat * 3.5);
    if (sec >= 2 && b % 2 === 1) [70, 72, 74, 77].forEach((n, i) => m.mix(horn([n], beat * 0.35, 0.07), t0 + i * beat * 0.5));
  }
  m.wrapTo(len);
  m.softClip(1.2);
  m.normalize(0.78);
  return m;
}
// "Driller" (the boss): 164 BPM rock in D, palm-muted power chords, a double-kick run into every fourth bar. Original.
function drillerTrack() {
  const bpm = 164, beat = 60 / bpm, bar = beat * 4, bars = 16;
  const len = bar * bars;
  const m = new Buf(len + 2);
  const roots = [38, 38, 46, 45, 38, 38, 43, 45];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, root = roots[b % 8], sec = Math.floor(b / 4);
    m.mix(kick(), t0); m.mix(kick(0.8), t0 + beat * 1.5); m.mix(kick(0.9), t0 + beat * 2);
    m.mix(snare(1), t0 + beat); m.mix(snare(1), t0 + beat * 3);
    for (let k = 0; k < 8; k++) m.mix(hat(k % 2 ? 0.5 : 0.8, k === 7 && b % 2 === 1), t0 + k * (beat / 2));
    if (b % 4 === 3) for (let k = 0; k < 8; k++) m.mix(kick(0.6), t0 + beat * 2 + k * (beat / 4));
    // chugging power chords (root + 5th), an accent on the "and" of 2
    for (let k = 0; k < 8; k++) m.mix(guitar([root + 12, root + 19], beat * (k === 3 ? 0.45 : 0.22), k === 3 ? 0.14 : 0.1), t0 + k * (beat / 2));
    m.mix(tone({ wave: 'saw', freq: mtof(root), dur: bar * 0.95, a: 0.005, d: 0.2, s: 0.6, r: 0.05, gain: 0.18, lp: 600 }), t0);
    // a screaming lead on top after the first section
    if (sec >= 1 && b % 2 === 0) [74, 77, 79, 81, 79, 77].forEach((n, i) => m.mix(bend(n, beat * 0.45, 0.08), t0 + i * beat * 0.5 + beat));
  }
  m.wrapTo(len);
  m.softClip(1.4);
  m.normalize(0.8);
  return m;
}
// "Do I Know You" (the ending): slow and quiet, keys and a held organ in A minor, plays once. Original.
function lostTrack() {
  const bpm = 60, beat = 60 / bpm, bar = beat * 4, bars = 9;
  const m = new Buf(bar * bars + 3);
  // Am - F - C - E7, twice, then a held Am
  const prog = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [56, 59, 62, 64]];
  const roots = [45, 41, 48, 40];
  const mel = [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 2], [4, 69, 3]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = b % 4;
    if (b === 8) { m.mix(organ([57, 60, 64], bar * 1.5, 0.05), t0); m.mix(keys([45, 57], bar, 0.1), t0); break; }
    m.mix(keys(prog[ch], beat * 3.5, 0.08), t0);
    m.mix(organ(prog[ch].map((n) => n - 12), bar * 0.98, 0.03), t0);
    m.mix(tone({ wave: 'sine', freq: mtof(roots[ch] - 12), dur: bar * 0.9, a: 0.05, d: 0.5, s: 0.6, r: 0.3, gain: 0.35 }), t0);
    if (b >= 4 && b % 2 === 0) for (const [st, n, d] of mel) m.mix(keys([n], beat * d, 0.07), t0 + st * beat);
  }
  m.normalize(0.7);
  return m;
}
const S6: Record<string, Buf> = {
  // a hammer drill biting into rock
  drill: sfx(0.9, (b) => {
    b.mix(tone({ wave: 'saw', freq: (t) => 140 + t * 260, dur: 0.8, a: 0.02, d: 0.2, s: 0.8, r: 0.08, gain: 0.4, vib: 0.06, vibRate: 38, lp: 2600 }), 0);
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.8, a: 0.02, d: 0.2, s: 0.6, r: 0.08, gain: 0.45, lp: 3000, hp: 600 }), 0);
  }, 0.65),
  // a drone's rotors
  drone: sfx(0.8, (b) => {
    b.mix(tone({ wave: 'square', freq: 180, dur: 0.7, a: 0.05, d: 0.1, s: 0.8, r: 0.08, gain: 0.25, vib: 0.05, vibRate: 30, lp: 1400 }), 0);
    b.mix(tone({ wave: 'square', freq: 183, dur: 0.7, a: 0.05, d: 0.1, s: 0.8, r: 0.08, gain: 0.25, vib: 0.05, vibRate: 31, lp: 1400 }), 0);
  }, 0.5),
  // a memory being pulled out: a long reversed shimmer down into a hum
  drain: sfx(2.4, (b) => {
    for (let i = 0; i < 10; i++) b.mix(bell(88 - i * 3, 0.4, 0.2), i * 0.18);
    b.mix(tone({ wave: 'sine', freq: (t) => 400 - t * 150, dur: 2.2, a: 0.4, d: 1.0, s: 0.4, r: 0.2, gain: 0.4, vib: 0.02, vibRate: 3 }), 0);
  }, 0.6),
  // rocks shaking loose from the ceiling
  rumble: sfx(1.0, (b) => {
    b.mix(tone({ wave: 'noise', freq: 1, dur: 0.9, a: 0.05, d: 0.6, s: 0.2, r: 0.1, gain: 1, lp: 400 }), 0);
    b.mix(tone({ wave: 'sine', freq: (t) => 55 - t * 15, dur: 0.8, a: 0.01, d: 0.7, s: 0, gain: 0.8 }), 0);
  }, 0.85),
  // a ghost mural coming to life: a rising shimmer of notes
  mural: sfx(1.4, (b) => [67, 70, 74, 79, 82, 86].forEach((n, i) => b.mix(bell(n, 0.6, 0.25), i * 0.09)), 0.6),
};
for (const [k, b] of Object.entries(S6)) writeAudio(b, path.join(OUT, `${k}.mp3`), { kbps: 96 });
writeAudio(bealeTrack(), path.join(OUT, 'music_beale.mp3'), { kbps: 112 });
writeAudio(soulTrack(), path.join(OUT, 'music_soul.mp3'), { kbps: 112 });
writeAudio(drillerTrack(), path.join(OUT, 'music_driller.mp3'), { kbps: 112 });
writeAudio(lostTrack(), path.join(OUT, 'music_lost.mp3'), { kbps: 112 });
