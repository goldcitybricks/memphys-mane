import Phaser from 'phaser';
import { Track, Seg, SEG_LEN, ROAD_W, LANES, RUMBLE } from './Track';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import type { SfxKey } from '../../core/assets';
import { COLORS } from '../../core/config';
import { px, wrap } from '../../core/text';
import { MANE } from '../../missions/lines';
import type { MissionStats } from '../brawler/BrawlerScene';

// The reusable driving engine (Mario Kart / arcade racer style, pseudo-3D, seen from behind the car).
// A mission extends it: builds the course, places traffic, cans, item boxes and hazards, and scripts the story.
// Mission 4 (Bridge Run) chases a tanker point-to-point; Mission 8 (The Loop) can run laps on a looping Track.

// camera and projection
const H = 216, HY = 108; // screen height, horizon
const HW = 192; // the road's horizontal scale is fixed, so wider phones see more roadside, not a wider road
const CAM_H = 1000;
const CAM_DEPTH = 1 / Math.tan((50 * Math.PI) / 180); // 100 degree field of view
const PLAYER_Z = CAM_H * CAM_DEPTH; // the car sits this far in front of the camera, drawn 1:1
const DRAW = 200; // segments drawn ahead
const BAND = 10; // walls and arches are drawn in bands so cars can pass behind them
const NORM = CAM_H / (HW * ROAD_W); // sprite pixels -> road half-widths (at 1:1)
const CAR_LEN = 420; // how long a car is, in world units, for bumping

export const MAX_SPEED = SEG_LEN * 45; // 45 segments a second
export const MAX_CANS = 3;
export const MANE_MODE_SECONDS = 7;

export type CarKind = 'traffic' | 'aether' | 'escort';
export interface Car {
  z: number; x: number; tx: number; speed: number; base: number; tex: string; kind: CarKind;
  spinT: number; ang: number; w: number; bumpCd: number; talkCd: number; gone?: boolean;
  sx: number; sy: number; seen: boolean; // where it was drawn this frame (speech bubbles follow it)
}
export type HazKind = 'pothole' | 'sauce' | 'bones' | 'barrel' | 'sauceShot';
export interface Haz { z: number; x: number; vx: number; kind: HazKind; vz: number; t: number; w: number; gone?: boolean }
export interface Pick { z: number; x: number; kind: 'can' | 'box'; taken: boolean; back: number }
export interface Tanker {
  z: number; x: number; tx: number; speed: number; hp: number; maxHp: number;
  surgeT: number; dropT: number; swerveT: number; ramCd: number; hitT: number;
  sx: number; sy: number; seen: boolean;
}
export type Item = 'tea' | 'sauce' | 'bones';
export interface Speaker { x: number; headY: number }

interface Proj { X1: number; X2: number; Y1: number; Y2: number; W1: number; W2: number; s1: number; s2: number; ok: boolean; seg: Seg; z1: number }
interface Bubble { box: Phaser.GameObjects.Container; who: Speaker; until: number }
interface Waiter { pred: () => boolean; resolve: () => void }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export abstract class DriveScene extends Phaser.Scene {
  track!: Track;
  missionId = '';
  // the player's car
  position = 0; // camera z
  playerX = 0; // -1..1 across the road
  speed = 0;
  steer = 0;
  boostT = 0;
  boostColor = 0xffffff;
  spinT = 0;
  hopT = 0;
  wallCd = 0;
  drift = { on: false, dir: 0, t: 0, sfxT: 0 };
  maneT = 0; // Mane Mode seconds left
  cans = 0;
  item: Item | null = null;
  rolling = 0;
  // the world
  cars: Car[] = [];
  hazards: Haz[] = [];
  picks: Pick[] = [];
  tanker: Tanker | null = null;
  escapeZ = Infinity; // where the tanker gets away
  archLights: 'normal' | 'glyph' = 'normal';
  // flow
  racing = false; // the player has control
  frozen = false; // the world stops (cutscenes that pose everything)
  inCutscene = false;
  skipping = false;
  paused = false;
  continuing = false;
  score = 0;
  elapsed = 0;
  kos = 0; // AetherCars and drive-outs spun out
  rams = 0;
  sips = 0;
  // drawing
  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private roadG!: Phaser.GameObjects.Graphics;
  private bands: Phaser.GameObjects.Graphics[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];
  private poolI = 0;
  private proj: Proj[] = [];
  car!: Phaser.GameObjects.Image;
  private hitstopMs = 0;
  private bubbles: Bubble[] = [];
  private waiters: Waiter[] = [];
  private captionBox?: Phaser.GameObjects.Container;
  private tips = new Set<string>();
  private engine?: { osc: OscillatorNode; sub: OscillatorNode; gain: GainNode; filter: BiquadFilterNode };
  private clock = 0;

  get W() { return this.scale.width; }
  get playerZ() { return this.position + PLAYER_Z; }
  get speedPct() { return this.speed / MAX_SPEED; }

  abstract buildTrack(): Track;
  abstract populate(): void; // place cars, cans, boxes, hazards
  abstract runScript(): Promise<void>;
  // hooks
  onTankerRam(_hp: number) { /* override */ }
  onTankerDown() { /* override */ }
  onTankerEscaped() { this.showContinue(); }

  create() {
    this.position = 0; this.playerX = 0; this.speed = 0; this.steer = 0; this.boostT = 0; this.spinT = 0; this.hopT = 0; this.wallCd = 0;
    this.drift = { on: false, dir: 0, t: 0, sfxT: 0 }; this.maneT = 0; this.cans = 0; this.item = null; this.rolling = 0;
    this.cars = []; this.hazards = []; this.picks = []; this.tanker = null; this.escapeZ = Infinity; this.archLights = 'normal';
    this.racing = false; this.frozen = false; this.inCutscene = false; this.skipping = false; this.paused = false; this.continuing = false;
    this.score = 0; this.elapsed = 0; this.kos = 0; this.rams = 0; this.sips = 0;
    this.pool = []; this.bands = []; this.spk = {}; this.bubbles = []; this.waiters = []; this.tips.clear(); this.hitstopMs = 0; this.clock = 0;
    Controls.clear();
    Audio.apply(this);
    this.cameras.main.setRoundPixels(true);
    this.track = this.buildTrack();
    this.proj = Array.from({ length: DRAW }, () => ({ X1: 0, X2: 0, Y1: 0, Y2: 0, W1: 0, W2: 0, s1: 0, s2: 0, ok: false, seg: this.track.segs[0], z1: 0 }));

    this.sky = this.add.tileSprite(0, 0, this.W, H, 'driveSky').setOrigin(0).setDepth(-20).setScrollFactor(0);
    this.far = this.add.tileSprite(0, 0, this.W, H, 'driveFar').setOrigin(0).setDepth(-19).setScrollFactor(0);
    this.roadG = this.add.graphics().setDepth(50);
    for (let b = 0; b < DRAW / BAND; b++) this.bands.push(this.add.graphics().setDepth(100 + (DRAW - (b * BAND + BAND)) * 2));
    this.fx = this.add.graphics().setDepth(5000);
    this.car = this.add.image(this.W / 2, 214, 'bigBlue', 2).setOrigin(0.5, 1).setDepth(4990);

    this.populate();
    this.setupKeyboard();
    this.startEngine();
    this.scene.launch('DriveUI', { world: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scene.stop('DriveUI'); this.input.keyboard?.removeAllListeners(); this.stopEngine(); });
    const relayout = () => { this.sky.setSize(this.W, H); this.far.setSize(this.W, H); };
    this.scale.on('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
    this.runScript().catch((e) => console.error(e));
  }

  // ---------------------------------------------------------------- input
  private setupKeyboard() {
    const kb = this.input.keyboard!;
    const map: Record<string, Button> = {
      Z: 'item', J: 'item', SPACE: 'item', ENTER: 'item',
      X: 'drift', K: 'drift', SHIFT: 'drift', DOWN: 'drift', S: 'drift',
      C: 'sip', L: 'sip', UP: 'sip', W: 'sip',
      ESC: 'pause', P: 'pause',
    };
    const held = { l: false, r: false };
    const key = (e: KeyboardEvent) => (e.key === ' ' ? 'SPACE' : e.key === 'Escape' ? 'ESC' : e.key.startsWith('Arrow') ? e.key.slice(5).toUpperCase() : e.key.toUpperCase());
    const steer = () => Controls.setKeys((held.r ? 1 : 0) - (held.l ? 1 : 0), 0);
    kb.on('keydown', (e: KeyboardEvent) => {
      const k = key(e);
      if (k === 'LEFT' || k === 'A') { held.l = true; steer(); return; }
      if (k === 'RIGHT' || k === 'D') { held.r = true; steer(); return; }
      if (e.repeat) return;
      const b = map[k];
      if (!b) return;
      if (b === 'pause') { this.togglePause(); return; }
      Controls.press(b);
      if (b === 'item') Controls.press('attack'); // advances dialogue too
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const k = key(e);
      if (k === 'LEFT' || k === 'A') { held.l = false; steer(); return; }
      if (k === 'RIGHT' || k === 'D') { held.r = false; steer(); return; }
      const b = map[k]; if (b) Controls.release(b);
      if (b === 'item') Controls.release('attack');
    });
  }

  togglePause() {
    if (this.continuing) return;
    this.paused = !this.paused;
    if (this.paused) { this.sound.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; this.anims.pauseAll(); }
    else { this.sound.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; this.anims.resumeAll(); }
    this.events.emit('paused', this.paused);
  }

  // ---------------------------------------------------------------- engine sound: a live synth that follows the speed
  private startEngine() {
    const sm = this.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = (sm as any).context as AudioContext | undefined;
    if (!ctx || !(sm as any).destination) return;
    try {
      const gain = ctx.createGain(); gain.gain.value = 0;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 40;
      const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = 20;
      const subG = ctx.createGain(); subG.gain.value = 0.5;
      osc.connect(filter); sub.connect(subG); subG.connect(filter); filter.connect(gain); gain.connect((sm as any).destination);
      osc.start(); sub.start();
      this.engine = { osc, sub, gain, filter };
    } catch { this.engine = undefined; }
  }
  private updateEngine() {
    const e = this.engine;
    if (!e) return;
    const ctx = e.osc.context;
    const on = !this.paused && !this.continuing && this.speed > 1;
    const pct = Math.min(1.5, this.speedPct);
    // three gears so it revs and shifts instead of a single rising whine
    const gear = pct < 0.4 ? pct / 0.4 : pct < 0.8 ? (pct - 0.4) / 0.4 : (pct - 0.8) / 0.7;
    const f = 34 + gear * 46 + (this.boostT > 0 ? 14 : 0);
    e.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
    e.sub.frequency.setTargetAtTime(f / 2, ctx.currentTime, 0.05);
    e.filter.frequency.setTargetAtTime(380 + pct * 700, ctx.currentTime, 0.08);
    e.gain.gain.setTargetAtTime(on ? 0.06 + pct * 0.04 : this.racing || this.speed > 1 ? 0.03 : 0, ctx.currentTime, 0.1);
  }
  idleEngine(on: boolean) { if (this.engine) this.engine.gain.gain.setTargetAtTime(on ? 0.035 : 0, this.engine.osc.context.currentTime, 0.1); }
  private stopEngine() {
    const e = this.engine;
    if (!e) return;
    try { e.gain.gain.value = 0; e.osc.stop(); e.sub.stop(); e.gain.disconnect(); } catch { /* ignore */ }
    this.engine = undefined;
  }

  // ---------------------------------------------------------------- loop
  update(_t: number, deltaMs: number) {
    if (this.paused) { this.updateEngine(); return; }
    const dt = Math.min(deltaMs, 50) / 1000;
    this.clock += dt;
    if (this.hitstopMs > 0) { this.hitstopMs -= deltaMs; this.render(); return; }
    if (!this.frozen && !this.continuing) {
      if (this.racing) this.elapsed += deltaMs;
      this.updatePlayer(dt);
      // the world waits for the green light (and for cutscenes)
      if (this.racing) {
        this.updateTanker(dt);
        this.updateCars(dt);
        this.updateHazards(dt);
        this.collide();
      }
    }
    this.updateEngine();
    this.render();
    this.updateBubbles();
    for (const w of [...this.waiters]) if (w.pred()) { this.waiters.splice(this.waiters.indexOf(w), 1); w.resolve(); }
  }

  private updatePlayer(dt: number) {
    const pct = this.speedPct;
    let steer = this.racing ? Controls.moveX : 0;
    const driftHeld = this.racing && Controls.isDown('drift');
    // spun out: no control for a beat
    if (this.spinT > 0) { this.spinT -= dt; steer = 0; this.speed *= 1 - 1.6 * dt; }
    // drift: hold DRIFT while turning at speed. Hold it longer for blue, then gold sparks; let go for a boost.
    if (this.drift.on) {
      if (!driftHeld || this.spinT > 0 || pct < 0.3) {
        const t = this.drift.t;
        this.drift.on = false;
        if (this.spinT <= 0 && t > 1.5) this.boost(1.1, COLORS.gold, 'GOLD DRIFT BOOST!');
        else if (this.spinT <= 0 && t > 0.75) this.boost(0.6, 0x7fd8ff, 'DRIFT BOOST!');
      } else {
        this.drift.t += dt;
        // turn into the drift; pushing the stick the same way tightens it, the other way widens it
        steer = this.drift.dir * (0.75 + 0.5 * steer * this.drift.dir);
        this.drift.sfxT -= dt;
        if (this.drift.sfxT <= 0) { this.sfx('skid', 0.25); this.drift.sfxT = 0.55; }
      }
    } else if (driftHeld && Math.abs(steer) > 0.3 && pct > 0.5 && this.spinT <= 0) {
      this.drift = { on: true, dir: Math.sign(steer), t: 0, sfxT: 0 };
      this.hopT = 0.18;
      this.sfx('skid', 0.35);
      this.tip('drift');
    }
    this.steer = steer;
    const seg = this.track.segAt(this.playerZ);
    const dx = dt * 2.4 * Math.min(1, pct + 0.15);
    this.playerX += steer * dx * (this.drift.on ? 1.15 : 1);
    this.playerX -= dx * pct * seg.curve * 0.11; // the curve pushes you out
    // speed: auto-gas, DRIFT with no turn brakes, boosts and Mane Mode raise the top end
    const top = MAX_SPEED * (this.maneT > 0 ? 1.15 : 1) * (this.boostT > 0 ? 1.35 : 1);
    if (this.boostT > 0) { this.boostT -= dt; this.speed += MAX_SPEED * 1.2 * dt; }
    if (this.maneT > 0) { this.maneT -= dt; if (this.maneT <= 0) this.events.emit('hud'); }
    if (this.racing && this.spinT <= 0) {
      if (driftHeld && !this.drift.on) this.speed -= MAX_SPEED * 1.1 * dt;
      else this.speed += (MAX_SPEED / 3.2) * dt * (this.speed < MAX_SPEED * 0.5 ? 1.4 : 1);
    } else if (!this.racing) this.speed -= MAX_SPEED * 0.6 * dt;
    if (this.speed > top) this.speed -= Math.min(this.speed - top, MAX_SPEED * 0.9 * dt);
    this.speed = Math.max(0, this.speed);
    // the barriers
    if (Math.abs(this.playerX) > 1) {
      const side = Math.sign(this.playerX);
      this.playerX = side * 1;
      if (this.wallCd <= 0 && this.speed > MAX_SPEED * 0.3) {
        this.speed *= 0.8;
        this.wallCd = 0.45;
        this.shake(120, 0.006);
        this.sfx('crash', 0.35);
        this.sparkAt(this.W / 2 + side * 46, 196, 0xffd890);
        if (Math.random() < 0.3) this.say(this.maneSpeaker(), MANE.hitHard, 900);
      }
    }
    if (this.wallCd > 0) this.wallCd -= dt;
    if (this.hopT > 0) this.hopT -= dt;
    if (this.rolling > 0) { this.rolling -= dt; if (this.rolling <= 0) this.events.emit('item'); }
    this.position += this.speed * dt;
    if (this.track.loop) this.position = ((this.position % this.track.length) + this.track.length) % this.track.length;
    else this.position = Math.min(this.position, this.track.length - PLAYER_Z - SEG_LEN * (DRAW + 2));
    // using things
    if (this.racing && this.spinT <= 0) {
      if (Controls.consume('item')) this.useItem();
      if (Controls.consume('sip')) this.sip();
    }
  }

  boost(sec: number, color: number, label?: string) {
    this.boostT = Math.max(this.boostT, sec);
    this.boostColor = color;
    this.sfx('boost', 0.6);
    if (label) this.toast(label);
  }

  // ---------------------------------------------------------------- items and MEMPHYS
  useItem() {
    if (!this.item || this.rolling > 0) return;
    const it = this.item;
    this.item = null;
    this.events.emit('item');
    if (it === 'tea') { this.boost(1.7, 0xffb050, 'SWEET TEA BOOST!'); this.say(this.maneSpeaker(), 'SWEET TEA!', 900); }
    else if (it === 'sauce') {
      // lobbed ahead: it flies past anything in front, then splats into a slick
      this.hazards.push({ z: this.playerZ + 300, x: this.playerX, vx: 0, kind: 'sauceShot', vz: this.speed + MAX_SPEED * 0.9, t: 0.55, w: 0.22 });
      this.sfx('throw', 0.7);
    } else {
      this.hazards.push({ z: this.playerZ - SEG_LEN * 2, x: this.playerX, vx: 0, kind: 'bones', vz: 0, t: 30, w: 0.2 });
      this.sfx('throw', 0.6);
      this.toast('WING BONES DROPPED!');
    }
  }

  giveItem() {
    if (this.item || this.rolling > 0) return;
    const r = Math.random();
    const tankerNear = this.tanker && this.tanker.z - this.playerZ > SEG_LEN * 25;
    this.item = tankerNear ? (r < 0.6 ? 'tea' : r < 0.85 ? 'sauce' : 'bones') : r < 0.45 ? 'tea' : r < 0.75 ? 'sauce' : 'bones';
    this.rolling = 0.9;
    this.events.emit('itemRoll');
    this.sfx('pickup', 0.6);
    this.tip('item');
  }

  sip() {
    if (this.cans <= 0 || this.maneT > 0) return;
    this.cans--;
    this.sips++;
    this.maneT = MANE_MODE_SECONDS;
    this.spinT = 0;
    this.freezeFrame(220, COLORS.goldHi);
    this.sfx('sip', 0.8);
    this.sfx('maneMode', 0.7);
    this.boost(0.8, COLORS.gold);
    this.say(this.maneSpeaker(), MANE.super, 1300);
    this.events.emit('hud');
  }

  addCan() {
    if (this.cans >= MAX_CANS) { this.addScore(150); this.toast('CANS FULL! +150'); this.sfx('pickup', 0.5); return; }
    this.cans++;
    this.addScore(100);
    this.sfx('pickup', 0.7);
    this.events.emit('hud');
    this.tip('sip');
  }

  spinOut(why: string) {
    if (this.maneT > 0 || this.spinT > 0) return;
    this.spinT = 0.9;
    this.drift.on = false;
    this.speed *= 0.55;
    this.sfx('spin', 0.7);
    this.shake(200, 0.008);
    this.say(this.maneSpeaker(), why || MANE.hitHard, 1000);
  }

  // ---------------------------------------------------------------- the world
  spawnCar(kind: CarKind, z: number, x: number, speed: number, tex: string): Car {
    const c: Car = { z, x, tx: x, speed, base: speed, tex, kind, spinT: 0, ang: 0, w: (tex === 'tanker' ? 128 : 60) * NORM, bumpCd: 0, talkCd: 0, sx: 0, sy: -100, seen: false };
    this.cars.push(c);
    return c;
  }
  addPick(z: number, x: number, kind: 'can' | 'box') { this.picks.push({ z, x, kind, taken: false, back: 0 }); }
  addHaz(z: number, x: number, kind: HazKind) {
    const w = kind === 'pothole' ? 0.17 : kind === 'barrel' ? 0.12 : 0.2;
    this.hazards.push({ z, x, vx: 0, kind, vz: 0, t: 999, w });
  }
  // an item box row across the road
  boxRow(seg: number) { for (const x of [-0.6, 0, 0.6]) this.addPick(seg * SEG_LEN, x, 'box'); }
  lanes() { return Array.from({ length: LANES }, (_, i) => -1 + (2 * i + 1) / LANES); }

  startTanker(z: number, hp: number) {
    this.tanker = { z, x: 0, tx: 0, speed: MAX_SPEED * 0.72, hp, maxHp: hp, surgeT: 0, dropT: 3, swerveT: 2, ramCd: 0, hitT: 0, sx: 0, sy: -100, seen: false };
    this.events.emit('hud');
  }

  private updateTanker(dt: number) {
    const t = this.tanker;
    if (!t || t.hp <= 0) return;
    const gap = t.z - this.playerZ;
    // it cruises a little slower than Big Blue's top speed, eases off if you fall way back, and surges after a ram
    let want = gap > SEG_LEN * 50 ? MAX_SPEED * 0.6 : MAX_SPEED * 0.72;
    if (t.surgeT > 0) { t.surgeT -= dt; want = MAX_SPEED; }
    if (gap < 0) want = Math.max(want, this.speed * 1.2); // you can't just drive past it
    if (!this.racing) want = Math.min(want, this.speed);
    t.speed += Math.sign(want - t.speed) * Math.min(Math.abs(want - t.speed), MAX_SPEED * 0.8 * dt);
    t.z += t.speed * dt;
    t.swerveT -= dt;
    if (t.swerveT <= 0) { t.tx = [-0.45, 0, 0.45][Math.floor(Math.random() * 3)]; t.swerveT = 2 + Math.random() * 2; }
    t.x += Math.sign(t.tx - t.x) * Math.min(Math.abs(t.tx - t.x), 0.35 * dt);
    if (t.ramCd > 0) t.ramCd -= dt;
    if (t.hitT > 0) t.hitT -= dt;
    // coolant barrels roll off the back when you get close
    t.dropT -= dt;
    if (this.racing && gap > 0 && gap < SEG_LEN * 45 && t.dropT <= 0) {
      const b: Haz = { z: t.z - 60, x: t.x + (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 0.5, kind: 'barrel', vz: t.speed * 0.45, t: 12, w: 0.12 };
      this.hazards.push(b);
      t.dropT = 1.9 - (t.maxHp - t.hp) * 0.25 + Math.random() * 0.6;
      this.sfx('clang', 0.35);
      this.tip('barrel');
    }
    if (this.racing && t.z >= this.escapeZ) this.onTankerEscaped();
  }

  // AetherCars block you from in front and ram you from behind; drive-outs just cruise
  private updateCars(dt: number) {
    const pz = this.playerZ;
    for (const c of this.cars) {
      if (c.gone) continue;
      const dz = c.z - pz;
      if (c.spinT > 0) {
        c.spinT -= dt;
        c.ang += dt * 900;
        c.speed += (c.base * 0.35 - c.speed) * Math.min(1, dt * 3);
        if (c.spinT <= 0) { c.ang = 0; c.speed = c.base * 0.6; }
      } else {
        let want = c.base;
        if (c.kind === 'aether' && dz > 0 && dz < SEG_LEN * 28 && this.racing) c.tx = Phaser.Math.Clamp(this.playerX, -0.7, 0.7); // pull in front of you
        if (c.kind === 'escort') {
          if (dz < 0 && dz > -SEG_LEN * 14) { want = this.speed * 1.12 + 300; c.tx = this.playerX; } // ram from behind
          else if (dz > 0 && dz < SEG_LEN * 30) c.tx = Phaser.Math.Clamp(this.playerX, -0.75, 0.75);
          if (this.tanker && c.z > this.tanker.z - SEG_LEN * 3) want = Math.min(want, this.tanker.speed * 0.95);
        }
        c.speed += (want - c.speed) * Math.min(1, dt * 1.5);
      }
      c.x += Math.sign(c.tx - c.x) * Math.min(Math.abs(c.tx - c.x), (c.kind === 'traffic' ? 0.2 : 0.45) * dt);
      c.x = Phaser.Math.Clamp(c.x, -0.85, 0.85);
      c.z += c.speed * dt;
      if (c.bumpCd > 0) c.bumpCd -= dt;
      if (c.talkCd > 0) c.talkCd -= dt;
      if (!this.track.loop && dz < -SEG_LEN * 60) c.gone = true;
    }
    this.cars = this.cars.filter((c) => !c.gone);
  }

  private updateHazards(dt: number) {
    for (const h of this.hazards) {
      if (h.vz) h.z += h.vz * dt;
      if (h.kind === 'barrel') { h.x += h.vx * dt; if (Math.abs(h.x) > 0.9) h.vx = -h.vx; }
      if (h.t < 900) h.t -= dt;
      if (h.kind === 'sauceShot' && h.t <= 0) { h.kind = 'sauce'; h.vz = 0; h.t = 25; this.sfx('splash', 0.4); }
      else if (h.t <= 0) h.gone = true;
      if (h.z < this.playerZ - SEG_LEN * 40 && !this.track.loop) h.gone = true;
      // cars run into slicks, bones and each other's barrels
      if (h.kind !== 'pothole' && h.kind !== 'barrel') {
        for (const c of this.cars) {
          if (c.spinT > 0 || Math.abs(c.z - h.z) > CAR_LEN || Math.abs(c.x - h.x) > (c.w + h.w) / 2) continue;
          this.spinCar(c, h.kind === 'bones' ? 'POP! RECALCULATING...' : 'RECALCULATING...');
          if (h.kind === 'sauceShot') { h.kind = 'sauce'; h.vz = 0; h.t = 20; }
          this.addScore(200);
          this.toast(h.kind === 'bones' ? 'BONED! +200' : 'SAUCED! +200');
        }
      }
    }
    this.hazards = this.hazards.filter((h) => !h.gone);
  }

  spinCar(c: Car, line?: string) {
    c.spinT = 1.4;
    this.kos++;
    this.sfx('spin', 0.45);
    if (line && c.talkCd <= 0) { c.talkCd = 2; this.carSay(c, line); }
    this.events.emit('hud');
  }
  carSay(c: Car, line: string) {
    if (c.kind !== 'traffic') this.sfx('recalc', 0.5);
    this.say(this.carSpeaker(c), line, 1400);
  }

  private collide() {
    const pz = this.playerZ, px0 = this.playerX, pw = 88 * NORM;
    const mm = this.maneT > 0;
    // cars
    for (const c of this.cars) {
      if (c.bumpCd > 0 || Math.abs(c.z - pz) > CAR_LEN || Math.abs(c.x - px0) > (pw + c.w) / 2 * 0.9) continue;
      c.bumpCd = 0.6;
      const talk = c.kind === 'traffic' ? ['AYE, WATCH IT!', 'BRO!', 'MY CAR!'][Math.floor(Math.random() * 3)] : ['RECALCULATING...', 'RECALCULATING...', 'YIELD. YIELD. YIELD.', 'ROUTE BLOCKED.'][Math.floor(Math.random() * 4)];
      if (mm) {
        // Mane Mode: bash them aside
        c.tx = c.x + (c.x >= px0 ? 0.9 : -0.9);
        c.x += c.x >= px0 ? 0.15 : -0.15;
        this.spinCar(c, talk);
        this.addScore(250);
        this.toast('BASHED! +250');
        this.sfx('punchHeavy', 0.6);
        this.sparkAt(this.W / 2, 170, COLORS.goldHi);
        continue;
      }
      this.sfx('crash', 0.55);
      this.shake(150, 0.007);
      if (c.z >= pz) {
        // rear-ended them: you slow down, they get shoved
        this.speed = Math.min(this.speed, c.speed * 0.85);
        this.position = c.z - CAR_LEN - PLAYER_Z;
        c.speed += 800;
        c.tx = c.x + (c.x >= px0 ? 0.3 : -0.3);
      } else {
        // hit from behind: shoved sideways
        this.playerX += c.x >= px0 ? -0.35 : 0.35;
        this.speed = Math.max(this.speed, c.speed * 0.9);
        c.speed *= 0.7;
        c.tx = c.x + (c.x >= px0 ? 0.4 : -0.4);
        if (Math.random() < 0.5) this.say(this.maneSpeaker(), MANE.hitHard, 900);
      }
      if (c.talkCd <= 0) { c.talkCd = 2.5; this.carSay(c, talk); }
    }
    // pickups
    for (const p of this.picks) {
      if (p.taken) { if (p.kind === 'box' && this.clock > p.back) p.taken = false; continue; }
      if (Math.abs(p.z - (pz + 100)) > 260 || Math.abs(p.x - px0) > 0.3) continue;
      p.taken = true;
      if (p.kind === 'can') this.addCan();
      else { p.back = this.clock + 3; this.giveItem(); }
    }
    // hazards
    for (const h of this.hazards) {
      if (h.kind === 'sauceShot' || h.kind === 'bones' || h.gone) continue; // yours
      if (Math.abs(h.z - (pz + 60)) > 220 || Math.abs(h.x - px0) > (pw + h.w) / 2 * 0.8) continue;
      if (h.kind === 'pothole') {
        if (this.hopT > 0) continue;
        this.hopT = 0.35;
        if (!mm) { this.speed *= 0.82; this.shake(120, 0.008); this.sfx('land', 0.9); this.sfx('tonk', 0.5); if (Math.random() < 0.4) this.say(this.maneSpeaker(), 'MEMPHIS POTHOLES, MANE!', 1100); }
        h.z -= 400; // only once
      } else if (h.kind === 'barrel') {
        h.gone = true;
        this.sfx('clang', 0.8);
        this.sparkAt(this.W / 2, 176, 0x7fd8ff);
        if (mm) { this.addScore(100); this.toast('SMASHED! +100'); }
        else this.spinOut('MANE, WHAT?!');
      } else if (h.kind === 'sauce') {
        h.gone = true;
        this.spinOut('WHO LEFT THEY SAUCE?!');
      }
    }
    // the tanker
    const t = this.tanker;
    if (t && t.hp > 0 && t.ramCd <= 0 && this.racing) {
      const gap = t.z - pz;
      if (gap < 140 && gap > -900 && Math.abs(t.x - px0) < (pw + 128 * NORM) / 2 * 0.85) {
        if (gap > -200) this.ramTanker();
        else { this.playerX += t.x >= px0 ? -0.3 : 0.3; this.speed *= 0.8; this.sfx('crash', 0.5); this.shake(120, 0.006); t.ramCd = 0.5; }
      }
    }
  }

  private ramTanker() {
    const t = this.tanker!;
    const hard = this.maneT > 0 || this.boostT > 0;
    t.hp = Math.max(0, t.hp - (this.maneT > 0 ? 2 : 1));
    t.ramCd = 1.2;
    t.hitT = 0.4;
    t.surgeT = 2.4;
    t.speed = Math.max(t.speed, this.speed);
    this.rams++;
    this.speed *= 0.45;
    this.position = t.z - 200 - PLAYER_Z;
    this.freezeFrame(hard ? 160 : 110, hard ? COLORS.goldHi : 0xffffff);
    this.shake(260, 0.014);
    this.sfx('punchHeavy', 0.9);
    this.sfx('crash', 0.8);
    this.sparkAt(this.W / 2 + (t.sx - this.W / 2) * 0.3, 150, COLORS.goldHi);
    this.addScore(500);
    this.toast(t.hp > 0 ? `RAMMED IT! +500` : 'TANKER DOWN!');
    this.events.emit('hud');
    this.onTankerRam(t.hp);
    if (t.hp <= 0) this.onTankerDown();
  }

  // ---------------------------------------------------------------- drawing
  private render() {
    const tr = this.track, N = tr.count, W = this.W, CX = W / 2;
    const base = tr.segAt(this.position);
    const basePct = (this.position % SEG_LEN) / SEG_LEN;
    const pSeg = tr.segAt(this.playerZ);
    const pPct = (this.playerZ % SEG_LEN) / SEG_LEN;
    const camY = lerp(pSeg.y1, pSeg.y2, pPct) + CAM_H - (this.hopT > 0 ? Math.sin((this.hopT / 0.35) * Math.PI) * 30 : 0);
    const camX = this.playerX * ROAD_W;
    let x = 0, dx = -(base.curve * basePct);
    // project near to far (the curve bends the road a little more each segment)
    for (let n = 0; n < DRAW; n++) {
      const p = this.proj[n];
      const idx = base.i + n;
      const seg = tr.loop ? tr.segs[idx % N] : tr.segs[Math.min(idx, N - 1)];
      const z1 = idx * SEG_LEN - this.position;
      const z2 = z1 + SEG_LEN;
      p.seg = seg; p.z1 = z1;
      p.ok = z1 > CAM_DEPTH * 2 && (tr.loop || idx < N);
      const s1 = CAM_DEPTH / Math.max(1, z1), s2 = CAM_DEPTH / z2;
      p.s1 = s1; p.s2 = s2;
      p.X1 = CX + s1 * (x - camX) * HW; p.X2 = CX + s2 * (x + dx - camX) * HW;
      p.Y1 = HY - s1 * (seg.y1 - camY) * HY; p.Y2 = HY - s2 * (seg.y2 - camY) * HY;
      p.W1 = s1 * ROAD_W * HW; p.W2 = s2 * ROAD_W * HW;
      x += dx; dx += seg.curve;
    }
    // background drifts with the curves
    const spd = this.frozen || this.continuing ? 0 : this.speed / SEG_LEN / 60;
    this.far.tilePositionX += pSeg.curve * spd * 1.6;
    this.sky.tilePositionX += pSeg.curve * spd * 0.4;

    const g = this.roadG;
    g.clear();
    for (const b of this.bands) b.clear();
    const far = this.proj[DRAW - 1];
    g.fillStyle(far.seg.theme.ground[0]).fillRect(0, HY, W, H - HY);
    const quad = (gr: Phaser.GameObjects.Graphics, c: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
      gr.fillStyle(c);
      gr.fillTriangle(x1, y1, x2, y2, x3, y3);
      gr.fillTriangle(x1, y1, x3, y3, x4, y4);
    };
    const t = this.clock;
    for (let n = DRAW - 1; n >= 0; n--) {
      const p = this.proj[n];
      if (!p.ok || p.Y2 > p.Y1) continue;
      const seg = p.seg, th = seg.theme;
      const alt = Math.floor(seg.i / RUMBLE) % 2;
      const y1 = Math.round(p.Y1), y2 = Math.round(p.Y2);
      if (y2 > H) continue;
      // ground
      g.fillStyle(th.ground[alt]).fillRect(0, y2, W, Math.max(1, y1 - y2 + 1));
      if (th.water && seg.i % 7 === 0) {
        g.fillStyle(seg.i % 3 ? 0x2a4a8a : 0xf2b950, 0.8);
        for (const side of [-1, 1]) {
          const gx = p.X1 + side * p.W1 * (2.2 + ((seg.i * 13) % 9) * 0.6);
          g.fillRect(gx - p.s1 * 300 * HW, y1, Math.max(2, p.s1 * 600 * HW), 1);
        }
      }
      // curbs, road, lane lines
      const r1 = p.W1 / 6, r2 = p.W2 / 6;
      quad(g, th.rumble[alt], p.X1 - p.W1 - r1, y1, p.X1 - p.W1, y1, p.X2 - p.W2, y2, p.X2 - p.W2 - r2, y2);
      quad(g, th.rumble[alt], p.X1 + p.W1 + r1, y1, p.X1 + p.W1, y1, p.X2 + p.W2, y2, p.X2 + p.W2 + r2, y2);
      quad(g, th.road[alt], p.X1 - p.W1, y1, p.X1 + p.W1, y1, p.X2 + p.W2, y2, p.X2 - p.W2, y2);
      if (alt) {
        const l1 = Math.max(1, p.W1 / 40), l2 = Math.max(1, p.W2 / 40);
        for (let ln = 1; ln < LANES; ln++) {
          const k = -1 + (2 * ln) / LANES;
          quad(g, th.lane, p.X1 + k * p.W1 - l1 / 2, y1, p.X1 + k * p.W1 + l1 / 2, y1, p.X2 + k * p.W2 + l2 / 2, y2, p.X2 + k * p.W2 - l2 / 2, y2);
        }
      }
      // barriers, arch ribs, hangers, bracing and the lights, in this segment's band
      const bg = this.bands[Math.floor(n / BAND)];
      if (th.wall) {
        const h1 = p.s1 * th.wallH * HY, h2 = p.s2 * th.wallH * HY;
        for (const side of [-1, 1]) {
          const ex1 = p.X1 + side * (p.W1 + r1), ex2 = p.X2 + side * (p.W2 + r2);
          quad(bg, th.wall, ex1, y1, ex1, y1 - h1, ex2, y2 - h2, ex2, y2);
          quad(bg, th.wallTop, ex1, y1 - h1, ex1 - side * Math.max(1, r1 * 0.5), y1 - h1, ex2 - side * Math.max(1, r2 * 0.5), y2 - h2, ex2, y2 - h2);
        }
      }
      if (seg.arch1 > 0 || seg.arch2 > 0) {
        const wallH = th.wallH;
        const RIB = 1.32;
        const a1 = (seg.arch1 + wallH) * p.s1 * HY, a2 = (seg.arch2 + wallH) * p.s2 * HY;
        const t1 = Math.max(1, p.s1 * 150 * HY), t2 = Math.max(1, p.s2 * 150 * HY);
        const steel = 0x2c3456;
        for (const side of [-1, 1]) {
          const rx1 = p.X1 + side * p.W1 * RIB, rx2 = p.X2 + side * p.W2 * RIB;
          quad(bg, steel, rx1, y1 - a1, rx2, y2 - a2, rx2, y2 - a2 + t2, rx1, y1 - a1 + t1);
          // hangers down to the deck
          if (seg.i % 6 === 0 && seg.arch1 > 300) {
            bg.fillStyle(0x3a4470).fillRect(rx1, y1 - a1, Math.max(1, p.s1 * 40 * HW), a1 - p.s1 * wallH * HY);
          }
          // the lights along the rib
          if (seg.i % 2 === 0) {
            let c = 0xfff1d0;
            if (this.archLights === 'glyph') c = (Math.floor(seg.i / 4 + t * 12) % 3 === 0) ? 0xffffff : COLORS.gold;
            else if ((seg.i + Math.floor(t * 8)) % 40 === 0) c = 0x7fd8ff;
            const sz = Math.max(1, Math.round(p.s1 * 110 * HY));
            bg.fillStyle(c).fillRect(Math.round(rx1 - sz / 2), Math.round(y1 - a1 - sz / 2), sz, sz);
          }
        }
        // cross bracing over the road near the top of the arch
        if (seg.i % 10 === 0 && seg.arch1 > 2600) {
          const lx = p.X1 - p.W1 * RIB, rx = p.X1 + p.W1 * RIB;
          bg.fillStyle(steel).fillRect(lx, y1 - a1, rx - lx, t1 * 0.8);
          if (this.archLights === 'glyph') bg.fillStyle(COLORS.goldHi, 0.8).fillRect(lx, y1 - a1, rx - lx, Math.max(1, t1 * 0.25));
        }
      }
    }

    // sprites: props, pickups, hazards, cars, the tanker (far to near)
    this.poolI = 0;
    for (let n = DRAW - 1; n >= 1; n--) {
      const p = this.proj[n];
      if (!p.ok) continue;
      const k = p.s1 * CAM_H;
      if (k < 0.04) continue;
      for (const pr of p.seg.props) {
        const sx = p.X1 + p.s1 * pr.offset * ROAD_W * HW;
        const img = this.img(pr.tex, pr.frame ?? 0, sx, p.Y1, k * (pr.scale ?? 1), 100 + (DRAW - n) * 2 + 0.5);
        img.setOrigin(pr.offset < -1 ? 1 : pr.offset > 1 ? 0 : 0.5, 1);
      }
    }
    const put = (z: number, ox: number, tex: string, frame: number, extra = 0) => {
      const rel = z - this.position;
      const n = Math.floor(z / SEG_LEN) - base.i;
      if (rel < PLAYER_Z * 0.6 || n < 0 || n >= DRAW - 1) return null;
      const p = this.proj[n];
      if (!p.ok) return null;
      const pct = (z % SEG_LEN) / SEG_LEN;
      const s = CAM_DEPTH / rel;
      const cx = lerp(p.X1, p.X2, pct), cy = lerp(p.Y1, p.Y2, pct);
      const k = s * CAM_H;
      if (k < 0.04) return null;
      const img = this.img(tex, frame, cx + s * ox * ROAD_W * HW, cy, k, 100 + (DRAW - n - pct) * 2 + 1 + extra);
      img.setOrigin(0.5, 1);
      return img;
    };
    for (const h of this.hazards) {
      const tex = h.kind === 'pothole' ? 'pothole' : h.kind === 'sauce' ? 'saucePuddle' : h.kind === 'bones' ? 'bonesDecal' : h.kind === 'barrel' ? 'barrel' : 'itemSauce';
      const img = put(h.z, h.x, tex, h.kind === 'barrel' ? Math.floor(t * 8) % 2 : 0, h.kind === 'barrel' || h.kind === 'sauceShot' ? 0.4 : 0);
      if (img && h.kind === 'sauceShot') { img.setY(img.y - Math.sin((1 - h.t / 0.55) * Math.PI) * 40 * img.scaleX); img.setAngle(t * 720); }
    }
    for (const pk of this.picks) {
      if (pk.taken) continue;
      const img = put(pk.z, pk.x, pk.kind === 'can' ? 'canPickup' : 'itemBox', Math.floor(t * 8) % 4, 0.3);
      if (img) img.setY(img.y - (6 + Math.sin(t * 5 + pk.z) * 2) * img.scaleX);
    }
    for (const c of this.cars) {
      const yaw = c.tx < c.x - 0.02 ? 0 : c.tx > c.x + 0.02 ? 2 : 1;
      const img = put(c.z, c.x, c.tex, c.spinT > 0 ? Math.floor(t * 12) % 3 : yaw);
      c.seen = !!img;
      if (img) { img.setAngle(c.spinT > 0 ? Math.sin(c.ang * 0.05) * 25 : 0); c.sx = img.x; c.sy = img.y - img.displayHeight; }
    }
    const tk = this.tanker;
    if (tk) {
      const img = put(tk.z, tk.x, 'tanker', tk.hp <= tk.maxHp * 0.34 ? 2 : tk.hp <= tk.maxHp * 0.67 ? 1 : 0, 0.2);
      tk.seen = !!img;
      if (img) {
        if (tk.hitT > 0) img.setX(img.x + Math.sin(t * 90) * 3);
        tk.sx = img.x; tk.sy = img.y - img.displayHeight;
      }
    }
    for (let i = this.poolI; i < this.pool.length; i++) this.pool[i].setVisible(false);

    // the player's car
    const spin = this.spinT > 0;
    let yaw = this.steer < -0.6 ? -2 : this.steer < -0.15 ? -1 : this.steer > 0.6 ? 2 : this.steer > 0.15 ? 1 : 0;
    if (this.drift.on) yaw = this.drift.dir * 2;
    if (spin) yaw = [-2, -1, 0, 1, 2, 1, 0, -1][Math.floor(t * 20) % 8];
    const shades = this.maneT > 0;
    const bump = this.speed > MAX_SPEED * 0.2 && Math.floor(t * 15) % 2 ? 1 : 0;
    const hop = this.hopT > 0 ? Math.round(Math.sin((this.hopT / 0.35) * Math.PI) * 8) : 0;
    this.car.setFrame(yaw + 2 + (shades ? 5 : 0)).setPosition(W / 2 + (this.drift.on ? this.drift.dir * 4 : 0), 214 - bump - hop);
    this.car.setAngle(spin ? Math.sin(t * 30) * 12 : this.drift.on ? this.drift.dir * 3 : 0);
    this.drawFx();
  }

  private img(tex: string, frame: number, x: number, y: number, k: number, depth: number) {
    let im = this.pool[this.poolI];
    if (!im) { im = this.add.image(0, 0, tex); this.pool.push(im); }
    this.poolI++;
    if (im.texture.key !== tex) im.setTexture(tex, frame); else if ((im.frame.name as any) !== frame) im.setFrame(frame);
    im.setVisible(true).setPosition(Math.round(x), Math.round(y)).setScale(k).setDepth(depth).setAngle(0).setAlpha(1);
    return im;
  }

  // boost flames, drift sparks, Mane Mode glow, speed lines
  private drawFx() {
    const f = this.fx, W = this.W, t = this.clock;
    f.clear();
    const cy = this.car.y;
    if (this.boostT > 0) {
      for (const ex of [-20, 20]) {
        const len = 6 + Math.floor(Math.random() * 8);
        f.fillStyle(this.boostColor, 0.9).fillTriangle(W / 2 + ex - 4, cy - 8, W / 2 + ex + 4, cy - 8, W / 2 + ex, cy - 8 + len);
        f.fillStyle(0xffffff, 0.9).fillTriangle(W / 2 + ex - 2, cy - 8, W / 2 + ex + 2, cy - 8, W / 2 + ex, cy - 6 + len / 2);
      }
    }
    if (this.boostT > 0 || this.maneT > 0) {
      f.fillStyle(0xffffff, 0.5);
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2, r0 = 70 + Math.random() * 60;
        const x0 = W / 2 + Math.cos(a) * r0 * 1.6, y0 = HY + Math.sin(a) * r0;
        f.fillRect(x0, y0, Math.cos(a) * 18, 1);
      }
    }
    if (this.drift.on) {
      const c = this.drift.t > 1.5 ? COLORS.gold : this.drift.t > 0.75 ? 0x7fd8ff : 0xffffff;
      for (const ex of [-34, 34]) for (let i = 0; i < 3; i++) {
        f.fillStyle(i % 2 ? 0xffffff : c, 1).fillRect(W / 2 + ex + (Math.random() - 0.5) * 10 + this.drift.dir * 4, cy - 2 - Math.random() * 6, 2, 2);
      }
    }
    if (this.maneT > 0) {
      const a = 0.18 + 0.1 * Math.sin(t * 12);
      f.fillStyle(COLORS.gold, a).fillEllipse(W / 2, cy - 22, 110, 54);
    }
  }

  sparkAt(x: number, y: number, tint = 0xffffff) {
    const s = this.add.sprite(x, y, 'spark').setDepth(5100).setTint(tint).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    s.play('spark:hit');
    s.once('animationcomplete', () => s.destroy());
  }

  // ---------------------------------------------------------------- feel
  freezeFrame(ms: number, color: number) {
    this.hitstopMs = Math.max(this.hitstopMs, ms);
    const c = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(ms + 80, c.r, c.g, c.b);
  }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(key: SfxKey, volume = 0.7) { Audio.sfx(this, key, { volume }); }
  addScore(n: number) { this.score += n; this.events.emit('hud'); }
  toast(s: string) { this.events.emit('toast', s); }
  tip(k: string) { if (this.tips.has(k)) return; this.tips.add(k); this.events.emit('tutorial', k); }
  banner(top: string, bottom: string) { this.events.emit('banner', { top, bottom }); }

  // ---------------------------------------------------------------- the tanker gets away
  showContinue() {
    if (this.continuing) return;
    this.racing = false;
    this.continuing = true;
    this.drift.on = false;
    this.events.emit('continue', true);
  }
  doContinue() {
    this.continuing = false;
    this.score = 0;
    this.speed = MAX_SPEED * 0.7;
    // back up to a checkpoint with the tanker in sight again
    this.position = Math.max(0, this.continueZ() - PLAYER_Z);
    this.playerX = 0; this.spinT = 0; this.drift.on = false;
    if (this.tanker) { this.tanker.z = this.playerZ + SEG_LEN * 35; this.tanker.speed = MAX_SPEED * 0.7; this.tanker.surgeT = 0; this.tanker.x = 0; }
    this.hazards = this.hazards.filter((h) => h.kind !== 'barrel');
    this.cars = this.cars.filter((c) => c.kind !== 'escort' || Math.abs(c.z - this.playerZ) > SEG_LEN * 60);
    for (const p of this.picks) if (p.kind === 'can' && p.z > this.playerZ) p.taken = false;
    this.racing = true;
    this.events.emit('continue', false);
    this.events.emit('hud');
    this.say(this.maneSpeaker(), MANE.getUp, 1600);
  }
  gameOver() { this.scene.restart(); }
  // where the car restarts after a continue (a mission can pick a checkpoint)
  continueZ() { return this.playerZ - SEG_LEN * 600; }

  // ---------------------------------------------------------------- talking
  // one speaker object per talker, so a new line replaces that talker's old bubble
  private spk: Record<string, Speaker> = {};
  maneSpeaker(): Speaker { const c = this.car; return (this.spk.mane ??= { __mane: true, get x() { return c.x - 10; }, get headY() { return c.y - 50; } } as Speaker); }
  malikSpeaker(): Speaker { const c = this.car; return (this.spk.malik ??= { get x() { return c.x + 14; }, get headY() { return c.y - 48; } }); }
  carSpeaker(c: Car): Speaker { return ((c as any).spk ??= { get x() { return c.sx; }, get headY() { return c.seen ? c.sy - 2 : -100; } }); }
  tankerSpeaker(): Speaker { const s = this; return (this.spk.tanker ??= { get x() { return s.tanker?.sx ?? s.W / 2; }, get headY() { return s.tanker?.seen ? Math.max(48, s.tanker.sy - 2) : 60; } }); }
  speaker(s: { x: number; y: number }, head: number): Speaker { return { get x() { return s.x; }, get headY() { return s.y - head; } }; }

  say(who: Speaker, text: string, ms = 1600) {
    this.bubbles.filter((b) => b.who === who).forEach((b) => b.box.destroy());
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    const mane = !!(who as any).__mane;
    const t = px(this, 0, 0, wrap(text, 22), mane ? COLORS.goldHi : 0xffffff);
    const w = t.width + 8, h = t.height + 6;
    t.setPosition(-w / 2 + 4, -h + 3);
    const g = this.add.graphics();
    g.fillStyle(0x0b0f26, 0.92).fillRoundedRect(-w / 2, -h, w, h, 3);
    g.lineStyle(1, 0x9aa0c0, 1).strokeRoundedRect(-w / 2 + 0.5, -h + 0.5, w - 1, h - 1, 3);
    g.fillStyle(0x0b0f26, 0.92).fillTriangle(-3, 0, 3, 0, 0, 4);
    const box = this.add.container(0, 0, [g, t]).setDepth(8000);
    this.bubbles.push({ box, who, until: this.time.now + ms });
    this.updateBubbles();
  }
  private updateBubbles() {
    const now = this.time.now;
    for (const b of this.bubbles) {
      if (now > b.until) { b.box.destroy(); continue; }
      const half = (b.box.getBounds().width || 40) / 2;
      const y = b.who.headY;
      b.box.setVisible(y > -50);
      b.box.setPosition(Math.round(Phaser.Math.Clamp(b.who.x, half + 2, this.W - half - 2)), Math.round(Phaser.Math.Clamp(y, 50, 200)));
    }
    this.bubbles = this.bubbles.filter((b) => b.box.active);
  }
  clearBubbles() { this.bubbles.forEach((b) => b.box.destroy()); this.bubbles = []; }

  // ---------------------------------------------------------------- script helpers
  wait(ms: number) {
    if (this.skipping && this.inCutscene) return Promise.resolve();
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }
  waitUntil(pred: () => boolean) { return new Promise<void>((resolve) => this.waiters.push({ pred, resolve })); }
  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    if (this.skipping) { this.tweens.add({ ...cfg, duration: 0, delay: 0 }); return Promise.resolve(); }
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }
  async line(who: Speaker, text: string, ms = 2000) {
    if (this.skipping) return;
    this.say(who, text, ms + 200);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && Controls.consume('attack', 300)));
    this.clearBubbles();
  }
  async caption(who: string, text: string, ms = 2400) {
    if (this.skipping) return;
    this.clearCaption();
    const W = this.W;
    const t = px(this, 0, 0, wrap(text, 52), 0xffffff).setCenterAlign().setOrigin(0.5, 0);
    const name = who ? px(this, 0, 0, who, COLORS.goldHi).setOrigin(0.5, 0) : null;
    const h = t.height + (name ? 14 : 8);
    const bg = this.add.rectangle(0, 0, W - 24, h, 0x070a1c, 0.85).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold);
    if (name) name.setY(4);
    t.setY(name ? 14 : 4);
    this.captionBox = this.add.container(W / 2, 212 - h, [bg, ...(name ? [name] : []), t]).setDepth(9500);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && Controls.consume('attack', 300)));
    this.clearCaption();
  }
  clearCaption() { this.captionBox?.destroy(); this.captionBox = undefined; }
  startCutscene() { this.inCutscene = true; this.racing = false; this.drift.on = false; this.events.emit('cutscene', true); }
  endCutscene() { this.clearBubbles(); this.clearCaption(); this.inCutscene = false; this.skipping = false; this.events.emit('cutscene', false); Controls.clear(); }
  skipCutscene() { if (this.inCutscene) this.skipping = true; }

  stats(): MissionStats {
    return { score: this.score, timeMs: this.elapsed, kos: this.kos, sips: this.sips, cans: 0, drivers: this.rams };
  }
}
