import Phaser from 'phaser';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import type { SfxKey } from '../../core/assets';
import { COLORS } from '../../core/config';
import { px, wrap } from '../../core/text';
import { MANE } from '../../missions/lines';
import type { MissionStats } from '../brawler/BrawlerScene';

// The reusable first-person engine (Chex Quest / Wolfenstein style raycaster, drawn pixel by pixel into a canvas).
// A mission extends it: builds the map, places Drifters, Pips, props and pickups, and scripts the story.
// Mission 5 (The Plant) runs the DeNile plant; Mission 9 (The Gigantum) can reuse it with new textures and a new boss.

const H = 216;
const HZ = 108; // horizon
const CAM = 0.42; // camera height (walls are 1 tall): Mane is a can, so he sees the world from a little low
const FOV = 0.66;
const TEX = 64;
const FOG: [number, number, number] = [8, 10, 26];
const LEVELS = 16; // light levels: the banded, cartridge look
const R = 0.24; // the player's radius

export const MAX_HP = 10;
export const MAX_CANS = 3;
export const MANE_MODE_SECONDS = 10;

export type EntKind = 'drifter' | 'pip' | 'boss' | 'prop' | 'pickup' | 'shot' | 'cap' | 'fx' | 'deco';
export type PickKind = 'can' | 'bbq' | 'wings' | 'fact';
export interface Ent {
  kind: EntKind;
  x: number; y: number;
  tex: string; frame: number;
  h: number; // height in wall units
  z: number; // lift off the floor
  r: number; // collision radius (solid ents only)
  solid: boolean;
  hp: number;
  state: string;
  t: number; // state timer
  vx: number; vy: number;
  flash: number;
  talkCd: number;
  homeX: number; homeY: number;
  tx: number; ty: number;
  pick?: PickKind;
  life?: number;
  gold?: boolean;
  frozen?: number;
  mark?: Ent; // the question mark over a frozen Drifter
  cd: number; // attack cooldown
  los: boolean; losT: number;
  gone?: boolean;
  anim?: { frames: number[]; fps: number; loop: boolean; t0: number };
  // where it was drawn this frame
  sx: number; top: number; dist: number; seen: boolean;
  data?: any;
}
export interface Speaker { x: number; headY: number }
interface Bubble { box: Phaser.GameObjects.Container; who: Speaker; until: number }
interface Waiter { pred: () => boolean; resolve: () => void }
interface Door { x: number; y: number; open: number; locked: boolean; opening: boolean }
interface TexData { data: Uint32Array; w: number; h: number }
interface FrameData { tex: TexData; x: number; y: number; w: number; h: number }

const WALL_TEX: Record<string, number> = { '#': 0, B: 1, D: 2, H: 3, W: 4, P: 5, A: 6, G: 7, p: 8, L: 9, M: 9, C: 10, R: 11, S: 12, N: 13 };
const DOORS = new Set(['D', 'L', 'M']);
// floors: . concrete, > < ^ v conveyors (push that way), o drain, ~ DeNile spill (slow), h hazard stripes
const FLOOR_TEX: Record<string, number> = { '.': 0, '>': 1, '<': 1, '^': 1, v: 1, o: 2, '~': 3, h: 6 };
const BELT: Record<string, [number, number]> = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], v: [0, 1] };

export abstract class ShooterScene extends Phaser.Scene {
  missionId = '';
  map: string[][] = [];
  mapW = 0; mapH = 0;
  doors = new Map<string, Door>();
  ents: Ent[] = [];
  // the player
  px = 2.5; py = 2.5; pa = 0;
  hp = MAX_HP;
  cans = 0;
  maneT = 0;
  invuln = 0;
  fireCd = 0;
  fireAnim = 0;
  dollaCd = 0;
  bob = 0;
  lookDelta = 0; // radians queued by dragging to look
  strafe = 0;
  capped = 0; // presses left to pop the cap off (0 = not capped)
  checkpoint = { x: 2.5, y: 2.5, a: 0 };
  boss: Ent | null = null;
  // flow
  playing = false; // the player has control
  frozen = false;
  inCutscene = false;
  skipping = false;
  paused = false;
  continuing = false;
  score = 0;
  elapsed = 0;
  kos = 0; // Drifters hydrated
  pipsDown = 0;
  sips = 0;
  // drawing
  private view!: Phaser.GameObjects.Image;
  private canvasTex?: Phaser.Textures.CanvasTexture;
  private img?: ImageData;
  private buf?: Uint32Array;
  private bw = 0;
  private zbuf = new Float32Array(0);
  private texCache: Record<string, TexData> = {};
  private frameCache: Record<string, FrameData> = {};
  private lut = new Uint8Array(0);
  weapon!: Phaser.GameObjects.Image;
  private hitstopMs = 0;
  private bubbles: Bubble[] = [];
  private waiters: Waiter[] = [];
  private captionBox?: Phaser.GameObjects.Container;
  private tips = new Set<string>();
  clock = 0;
  private stepT = 0;

  get W() { return this.scale.width; }

  abstract buildMap(): void; // fill this.map (rows of cells), place ents, set the start
  abstract runScript(): Promise<void>;
  // hooks
  onDrifterSaved(_e: Ent) { /* override */ }
  onPipDown(_e: Ent) { /* override */ }
  onBossShot(_e: Ent, _dmg: number) { /* override */ }
  updateBoss(_dt: number) { /* override */ }
  onPickup(_e: Ent) { /* override */ }

  create() {
    this.map = []; this.doors = new Map(); this.ents = []; this.boss = null;
    this.hp = MAX_HP; this.cans = 0; this.maneT = 0; this.invuln = 0; this.fireCd = 0; this.fireAnim = 0; this.dollaCd = 0;
    this.bob = 0; this.lookDelta = 0; this.strafe = 0; this.capped = 0;
    this.playing = false; this.frozen = false; this.inCutscene = false; this.skipping = false; this.paused = false; this.continuing = false;
    this.score = 0; this.elapsed = 0; this.kos = 0; this.pipsDown = 0; this.sips = 0;
    this.spk = {}; this.bubbles = []; this.waiters = []; this.tips.clear(); this.hitstopMs = 0; this.clock = 0; this.stepT = 0;
    this.texCache = {}; this.frameCache = {};
    Controls.clear();
    Audio.apply(this);
    this.buildLut();
    this.buildMap();
    this.mapH = this.map.length; this.mapW = this.map[0].length;
    for (let y = 0; y < this.mapH; y++) for (let x = 0; x < this.mapW; x++) {
      const c = this.map[y][x];
      if (DOORS.has(c)) this.doors.set(`${x},${y}`, { x, y, open: 0, locked: c !== 'D', opening: false });
    }
    this.setupView();
    this.weapon = this.add.image(this.W / 2 + 44, H + 8, 'hydrator', 0).setOrigin(0.5, 1).setDepth(4990);
    this.setupKeyboard();
    this.scene.launch('ShooterUI', { world: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('ShooterUI');
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
    });
    const relayout = () => this.setupView();
    this.scale.on('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
    this.setupMouseLook();
    this.runScript().catch((e) => console.error(e));
  }

  // ---------------------------------------------------------------- the canvas the world is drawn into
  private setupView() {
    const w = this.W;
    if (this.canvasTex && this.bw === w) return;
    this.view?.destroy();
    if (this.textures.exists('shooterView')) this.textures.remove('shooterView');
    this.canvasTex = this.textures.createCanvas('shooterView', w, H)!;
    const ctx = this.canvasTex.getContext();
    this.img = ctx.createImageData(w, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.bw = w;
    this.zbuf = new Float32Array(w);
    this.view = this.add.image(0, 0, 'shooterView').setOrigin(0).setDepth(0);
    this.weapon?.setX(w / 2 + 44);
  }

  // shade lookup: LUT[level*256 + v] for each channel, fading toward the fog color
  private buildLut() {
    this.lut = new Uint8Array(LEVELS * 256 * 3);
    for (let l = 0; l < LEVELS; l++) {
      const s = l / (LEVELS - 1);
      for (let v = 0; v < 256; v++) for (let c = 0; c < 3; c++) this.lut[(c * LEVELS + l) * 256 + v] = Math.round(v * s + FOG[c] * (1 - s));
    }
  }
  private shadeOf(dist: number, k = 1) {
    const s = Math.max(0, Math.min(1, (1.25 - dist / 11) * k));
    return Math.round(s * (LEVELS - 1));
  }
  private sh(c: number, l: number) {
    const L = this.lut, o = l * 256;
    return (0xff000000 | (L[(2 * LEVELS) * 256 + o + ((c >>> 16) & 255)] << 16) | (L[LEVELS * 256 + o + ((c >>> 8) & 255)] << 8) | L[o + (c & 255)]) >>> 0;
  }

  private texData(key: string): TexData {
    const hit = this.texCache[key];
    if (hit) return hit;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src as CanvasImageSource, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const t = { data: new Uint32Array(d.data.buffer), w: c.width, h: c.height };
    this.texCache[key] = t;
    return t;
  }
  private frameData(key: string, frame: number): FrameData {
    const k = key + ':' + frame;
    const hit = this.frameCache[k];
    if (hit) return hit;
    const tex = this.texData(key);
    const f = this.textures.getFrame(key, frame) ?? this.textures.getFrame(key);
    const fd = { tex, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight };
    this.frameCache[k] = fd;
    return fd;
  }

  // ---------------------------------------------------------------- the map
  cell(x: number, y: number) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || iy >= this.mapH || ix >= this.mapW) return '#';
    return this.map[iy][ix];
  }
  isWall(c: string) { return WALL_TEX[c] !== undefined; }
  solidCell(x: number, y: number) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const c = this.cell(ix, iy);
    if (!this.isWall(c)) return false;
    if (DOORS.has(c)) { const d = this.doors.get(`${ix},${iy}`); return !d || d.open < 0.9; }
    return true;
  }
  unlock(ch: 'L' | 'M') {
    for (const d of this.doors.values()) if (this.map[d.y][d.x] === ch) { d.locked = false; d.opening = true; }
    this.sfx('portal', 0.5);
  }
  // fill helpers for missions
  grid(w: number, h: number, fill = '#') { this.map = Array.from({ length: h }, () => Array.from({ length: w }, () => fill)); }
  room(x0: number, y0: number, x1: number, y1: number, floor = '.') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.map[y][x] = floor; }
  put(x: number, y: number, c: string) { this.map[y][x] = c; }

  // ---------------------------------------------------------------- ents
  ent(kind: EntKind, x: number, y: number, tex: string, o: Partial<Ent> = {}): Ent {
    const e: Ent = {
      kind, x, y, tex, frame: 0, h: 0.5, z: 0, r: 0, solid: false, hp: 1, state: '', t: 0, vx: 0, vy: 0, flash: 0, talkCd: 2 + Math.random() * 4,
      homeX: x, homeY: y, tx: x, ty: y, cd: 0, los: false, losT: Math.random() * 0.3, sx: 0, top: -100, dist: 99, seen: false, ...o,
    };
    this.ents.push(e);
    return e;
  }
  prop(x: number, y: number, tex: string, h: number, r: number) { return this.ent('prop', x, y, tex, { h, r, solid: r > 0 }); }
  deco(x: number, y: number, tex: string, h: number, z = 0) { return this.ent('deco', x, y, tex, { h, z }); }
  pickup(x: number, y: number, kind: PickKind) {
    const tex = kind === 'can' ? 'canPickup' : kind === 'fact' ? 'factCard' : kind;
    const glow = kind === 'can' || kind === 'fact';
    return this.ent('pickup', x, y, tex, { pick: kind, h: kind === 'can' ? 0.24 : kind === 'fact' ? 0.26 : 0.14, z: 0.03, anim: glow ? { frames: [0, 1, 2, 3], fps: 8, loop: true, t0: Math.random() } : undefined });
  }
  drifter(x: number, y: number, look = 0) {
    return this.ent('drifter', x, y, ['drifterA', 'drifterB', 'drifterC'][look % 3], { h: 0.64, r: 0.22, solid: true, hp: 1, state: 'wander', t: Math.random() * 2 });
  }
  pip(x: number, y: number, awake = true) {
    return this.ent('pip', x, y, 'pipMini', { h: 0.46, r: 0.18, solid: true, hp: 2, state: awake ? 'hop' : 'off', cd: 1.5 + Math.random() * 1.5, frame: awake ? 1 : 0 });
  }
  wakePip(e: Ent) { if (e.state !== 'off') return; e.state = 'hop'; e.cd = 0.8 + Math.random() * 1.6; e.t = Math.random() * 3; }
  fx(x: number, y: number, z: number, tex: string, frames: number[], fps: number, h = 0.3) {
    return this.ent('fx', x, y, tex, { h, z, life: frames.length / fps, anim: { frames, fps, loop: false, t0: this.clock } });
  }
  splashAt(x: number, y: number, z = 0.2, gold = false) {
    const f = this.fx(x, y, z, 'splash', [0, 1, 2], 18, 0.32);
    f.gold = gold;
    return f;
  }
  dist(e: { x: number; y: number }) { return Math.hypot(e.x - this.px, e.y - this.py); }
  lineOfSight(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(d / 0.2);
    for (let i = 1; i < n; i++) if (this.solidCell(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }
  // moves an ent (or the player) with walls and solid props in the way; slides along whatever it hits
  blocked(x: number, y: number, r: number, self: Ent | null) {
    if (this.solidCell(x - r, y - r) || this.solidCell(x + r, y - r) || this.solidCell(x - r, y + r) || this.solidCell(x + r, y + r)) return true;
    for (const e of this.ents) {
      if (!e.solid || e === self || e.gone) continue;
      const rr = e.r + r;
      if (Math.abs(e.x - x) < rr && Math.abs(e.y - y) < rr && Math.hypot(e.x - x, e.y - y) < rr) {
        // already overlapping: only block moves that go further in
        if (self && Math.hypot(e.x - self.x, e.y - self.y) < rr && Math.hypot(e.x - x, e.y - y) >= Math.hypot(e.x - self.x, e.y - self.y)) continue;
        return true;
      }
    }
    if (self && Math.hypot(this.px - x, this.py - y) < R + r) return true; // ents can't walk through Mane either
    return false;
  }
  moveEnt(e: Ent, dx: number, dy: number) {
    if (!this.blocked(e.x + dx, e.y, e.r || 0.15, e)) e.x += dx;
    if (!this.blocked(e.x, e.y + dy, e.r || 0.15, e)) e.y += dy;
  }
  private movePlayer(dx: number, dy: number) {
    const me = { x: this.px, y: this.py } as Ent;
    const hit = (x: number, y: number) => {
      if (this.solidCell(x - R, y - R) || this.solidCell(x + R, y - R) || this.solidCell(x - R, y + R) || this.solidCell(x + R, y + R)) return true;
      for (const e of this.ents) {
        if (!e.solid || e.gone) continue;
        const rr = e.r + R, now = Math.hypot(e.x - me.x, e.y - me.y), next = Math.hypot(e.x - x, e.y - y);
        if (next < rr && next < now) return true;
      }
      return false;
    };
    if (!hit(this.px + dx, this.py)) this.px += dx;
    me.x = this.px;
    if (!hit(this.px, this.py + dy)) this.py += dy;
  }

  // ---------------------------------------------------------------- input
  private setupKeyboard() {
    const kb = this.input.keyboard!;
    const map: Record<string, Button> = {
      Z: 'attack', J: 'attack', SPACE: 'attack', ENTER: 'attack',
      C: 'sip', L: 'sip',
      V: 'flex', I: 'flex',
      ESC: 'pause', P: 'pause',
    };
    const held = { l: false, r: false, u: false, d: false, sl: false, sr: false };
    const key = (e: KeyboardEvent) => (e.key === ' ' ? 'SPACE' : e.key === 'Escape' ? 'ESC' : e.key.startsWith('Arrow') ? e.key.slice(5).toUpperCase() : e.key.toUpperCase());
    const sync = () => { Controls.setKeys((held.r ? 1 : 0) - (held.l ? 1 : 0), (held.d ? 1 : 0) - (held.u ? 1 : 0)); this.strafe = (held.sr ? 1 : 0) - (held.sl ? 1 : 0); };
    const dirKey = (k: string, v: boolean) => {
      if (k === 'LEFT' || k === 'A') held.l = v;
      else if (k === 'RIGHT' || k === 'D') held.r = v;
      else if (k === 'UP' || k === 'W') held.u = v;
      else if (k === 'DOWN' || k === 'S') held.d = v;
      else if (k === 'Q' || k === ',') held.sl = v;
      else if (k === 'E' || k === '.') held.sr = v;
      else return false;
      sync();
      return true;
    };
    kb.on('keydown', (e: KeyboardEvent) => {
      const k = key(e);
      if (dirKey(k, true)) return;
      if (e.repeat) return;
      const b = map[k];
      if (!b) return;
      if (b === 'pause') { this.togglePause(); return; }
      Controls.press(b);
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const k = key(e);
      if (dirKey(k, false)) return;
      const b = map[k]; if (b) Controls.release(b);
    });
  }
  // desktop: click and drag anywhere to look around (phones drag the right half, see ShooterUI)
  private setupMouseLook() {
    let last: number | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) last = p.x; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (last !== null && p.isDown && !p.wasTouch) { this.lookDelta += (p.x - last) * 0.011; last = p.x; } });
    this.input.on('pointerup', () => { last = null; });
  }

  togglePause() {
    if (this.continuing) return;
    this.paused = !this.paused;
    if (this.paused) { this.sound.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; }
    else { this.sound.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; }
    this.events.emit('paused', this.paused);
  }

  // ---------------------------------------------------------------- loop
  update(_t: number, deltaMs: number) {
    if (this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    this.clock += dt;
    if (this.hitstopMs > 0) { this.hitstopMs -= deltaMs; this.render(); return; }
    if (!this.frozen && !this.continuing) {
      if (this.playing) this.elapsed += deltaMs;
      this.updateDoors(dt);
      this.updatePlayer(dt);
      if (this.playing) {
        this.updateEnts(dt);
        this.updateBoss(dt);
      } else this.updateFx(dt);
    }
    this.render();
    this.updateBubbles();
    for (const w of [...this.waiters]) if (w.pred()) { this.waiters.splice(this.waiters.indexOf(w), 1); w.resolve(); }
  }

  private updateDoors(dt: number) {
    for (const d of this.doors.values()) {
      if (!d.locked && Math.hypot(d.x + 0.5 - this.px, d.y + 0.5 - this.py) < 1.8) { if (!d.opening && d.open < 1) this.sfx('throw', 0.5); d.opening = true; }
      if (d.opening && d.open < 1) d.open = Math.min(1, d.open + dt * 2.2);
    }
  }

  private updatePlayer(dt: number) {
    if (this.maneT > 0) { this.maneT -= dt; if (this.maneT <= 0) this.events.emit('hud'); }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.fireAnim > 0) this.fireAnim -= dt;
    if (this.dollaCd > 0) this.dollaCd -= dt;
    let moving = 0;
    if (this.playing && this.capped <= 0) {
      // turning: the stick's left-right (or A/D) turns, dragging adds on top
      const mm = this.maneT > 0 ? 1.25 : 1;
      this.pa += Controls.moveX * 2.5 * dt + this.lookDelta;
      this.lookDelta = 0;
      const fwd = -Controls.moveY, side = this.strafe;
      const cell = this.cell(this.px, this.py);
      const slow = cell === '~' ? 0.5 : 1;
      if (cell === '~') this.tip('spill');
      const sp = 3.1 * mm * slow;
      const dx = Math.cos(this.pa), dy = Math.sin(this.pa);
      const mx = (dx * fwd - dy * side) * sp * dt, my = (dy * fwd + dx * side) * sp * dt;
      // conveyors carry you along
      const belt = BELT[cell];
      const bx = belt ? belt[0] * 1.3 * dt : 0, by = belt ? belt[1] * 1.3 * dt : 0;
      if (belt) this.tip('conveyor');
      this.movePlayer(mx + bx, my + by);
      moving = Math.min(1, Math.hypot(fwd, side));
      if (moving > 0.2) {
        this.stepT -= dt * moving;
        if (this.stepT <= 0) { this.stepT = 0.36; this.sfx('land', 0.18); }
      }
      // using things
      if (Controls.isDown('attack') && this.fireCd <= 0) this.fire();
      if (Controls.consume('sip')) this.sip();
      if (Controls.consume('flex')) this.dolla();
    } else {
      this.lookDelta = 0;
      // capped: mash SPRAY to pop it off
      if (this.capped > 0 && this.playing && Controls.consume('attack', 300)) {
        this.capped--;
        this.shake(80, 0.006);
        this.sfx('tonk', 0.6);
        this.events.emit('capped', this.capped);
        if (this.capped <= 0) this.uncap();
      }
    }
    this.bob += dt * (moving > 0.2 ? 9 : 2);
    const by = moving > 0.2 ? Math.abs(Math.sin(this.bob)) * 5 : Math.sin(this.bob) * 1;
    const bx = moving > 0.2 ? Math.cos(this.bob) * 6 : 0;
    const gold = this.maneT > 0 ? 3 : 0;
    const f = this.fireAnim > 0 ? (this.fireAnim > 0.06 ? 1 : 2) : 0;
    this.weapon.setFrame(f + gold).setPosition(this.W / 2 + 44 + bx, H + 3 + by + (this.capped > 0 ? 40 : 0));
    this.weapon.setVisible(!this.inCutscene || this.showWeaponInCutscene);
  }
  showWeaponInCutscene = false;

  // ---------------------------------------------------------------- the Hydrator, MEMPHYS, the dolla
  fire() {
    const gold = this.maneT > 0;
    this.fireCd = gold ? 0.11 : 0.24;
    this.fireAnim = 0.12;
    // a little aim help: lock onto the nearest target close to the crosshair
    let ang = this.pa, best = 0.13;
    for (const e of this.ents) {
      if (!this.shootable(e)) continue;
      const d = this.dist(e);
      if (d > 10) continue;
      let da = Math.atan2(e.y - this.py, e.x - this.px) - this.pa;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const lim = Math.max(0.06, 0.13 * Math.min(1, 3 / d)) + (e.kind === 'boss' ? 0.2 : 0);
      if (Math.abs(da) < Math.min(best, lim) && this.lineOfSight(this.px, this.py, e.x, e.y)) { best = Math.abs(da); ang = this.pa + da; }
    }
    const sp = 9;
    this.ent('shot', this.px + Math.cos(ang) * 0.3, this.py + Math.sin(ang) * 0.3, 'waterShot', {
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, h: 0.1, z: 0.3, life: 1.1, gold, frame: gold ? 2 : 0,
    });
    this.sfx('spray', gold ? 0.35 : 0.45);
  }
  shootable(e: Ent) {
    if (e.gone) return false;
    if (e.kind === 'drifter') return e.state !== 'saved';
    if (e.kind === 'pip') return e.state !== 'crush' && e.state !== 'off';
    if (e.kind === 'boss') return e.hp > 0;
    return false;
  }

  sip() {
    if (this.cans <= 0 || this.maneT > 0) return;
    this.cans--;
    this.sips++;
    this.maneT = MANE_MODE_SECONDS;
    this.freezeFrame(220, COLORS.goldHi);
    this.sfx('sip', 0.8);
    this.sfx('maneMode', 0.7);
    this.hp = Math.min(MAX_HP, this.hp + 2);
    this.say(this.maneSpeaker(), MANE.super, 1300);
    this.events.emit('hud');
  }

  // "Aye mane, you got a dolla?" Every Drifter in front of Mane freezes for 3 seconds trying to figure it out.
  dolla() {
    if (this.dollaCd > 0) return;
    this.dollaCd = 5;
    this.say(this.maneSpeaker(), 'AYE MANE, YOU GOT A DOLLA?', 1600);
    this.sfx('select', 0.6);
    let n = 0;
    for (const e of this.ents) {
      if (e.kind !== 'drifter' || e.state === 'saved') continue;
      const d = this.dist(e);
      if (d > 6) continue;
      let da = Math.atan2(e.y - this.py, e.x - this.px) - this.pa;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 0.9 || !this.lineOfSight(this.px, this.py, e.x, e.y)) continue;
      e.state = 'frozen'; e.t = 3; e.frame = 9;
      e.mark?.gone && (e.mark = undefined);
      if (!e.mark) e.mark = this.ent('deco', e.x, e.y, 'qmark', { h: 0.14, z: 0.68, anim: { frames: [0, 1], fps: 4, loop: true, t0: this.clock } });
      n++;
    }
    if (n) this.toast(n > 1 ? `${n} DRIFTERS STUMPED!` : 'STUMPED!');
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

  hurt(n: number, why = '') {
    if (this.invuln > 0 || !this.playing || this.continuing) return;
    if (this.maneT > 0) { this.sfx('tonk', 0.4); return; } // Mane Mode: nothing hurts
    this.hp = Math.max(0, this.hp - n);
    this.invuln = 0.8;
    this.sfx('tonk', 0.8);
    this.shake(160, 0.01);
    this.cameras.main.flash(160, 200, 40, 40);
    if (why) this.say(this.maneSpeaker(), why, 900);
    else if (Math.random() < 0.3) this.say(this.maneSpeaker(), MANE.hitHard, 900);
    this.events.emit('hud');
    if (this.hp <= 0) this.showContinue();
  }
  // the Foreman's cap landed on Mane
  getCapped(presses = 6) {
    if (this.maneT > 0) { this.sfx('clang', 0.8); this.toast('BOUNCED OFF! MANE MODE!'); return; }
    this.hurt(2);
    if (this.hp <= 0) return;
    this.capped = presses;
    this.sfx('capPop', 0.9); this.sfx('clang', 0.8);
    this.events.emit('capped', presses);
  }
  uncap() {
    this.capped = 0;
    this.sfx('capPop', 0.9);
    this.events.emit('capped', 0);
    this.say(this.maneSpeaker(), 'I AIN\'T SINGLE-USE, MANE.', 1600);
  }

  // ---------------------------------------------------------------- the world
  private updateEnts(dt: number) {
    const pdx = Math.cos(this.pa), pdy = Math.sin(this.pa);
    for (const e of this.ents) {
      if (e.gone) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.talkCd > 0) e.talkCd -= dt;
      e.losT -= dt;
      if (e.losT <= 0 && (e.kind === 'drifter' || e.kind === 'pip')) { e.losT = 0.25; e.los = this.dist(e) < 12 && this.lineOfSight(e.x, e.y, this.px, this.py); }
      switch (e.kind) {
        case 'drifter': this.updateDrifter(e, dt); break;
        case 'pip': this.updatePip(e, dt); break;
        case 'shot': this.updateShot(e, dt); break;
        case 'cap': this.updateCap(e, dt); break;
        case 'pickup':
          if (this.dist(e) < 0.5) { e.gone = true; this.takePickup(e); }
          break;
        default: break;
      }
    }
    void pdx; void pdy;
    this.updateFx(dt);
  }
  private updateFx(dt: number) {
    for (const e of this.ents) {
      if (e.gone) continue;
      if (e.life !== undefined && (e.kind === 'fx' || e.kind === 'deco')) { e.life -= dt; if (e.life <= 0) e.gone = true; }
      if (e.anim) {
        const k = Math.floor((this.clock - e.anim.t0) * e.anim.fps);
        e.frame = e.anim.frames[e.anim.loop ? k % e.anim.frames.length : Math.min(k, e.anim.frames.length - 1)];
      }
    }
    this.ents = this.ents.filter((e) => !e.gone);
  }

  private takePickup(e: Ent) {
    if (e.pick === 'can') this.addCan();
    else if (e.pick === 'bbq' || e.pick === 'wings') {
      const n = e.pick === 'bbq' ? 4 : 2;
      this.hp = Math.min(MAX_HP, this.hp + n);
      this.addScore(50);
      this.sfx('eat', 0.7);
      this.toast(e.pick === 'bbq' ? 'BBQ PLATE! +4' : 'WINGS! +2');
      this.events.emit('hud');
    }
    this.onPickup(e);
  }

  private updateDrifter(e: Ent, dt: number) {
    const d = this.dist(e);
    e.t -= dt;
    if (e.mark) { e.mark.x = e.x; e.mark.y = e.y; }
    const walkFrame = () => { e.frame = Math.floor(this.clock * 5 + e.homeX) % 4; };
    const toward = (tx: number, ty: number, sp: number) => {
      const a = Math.atan2(ty - e.y, tx - e.x);
      const before = [e.x, e.y];
      this.moveEnt(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
      // stuck on something: pick a new spot
      if (Math.hypot(e.x - before[0], e.y - before[1]) < sp * dt * 0.2) { e.tx = e.homeX + (Math.random() - 0.5) * 3; e.ty = e.homeY + (Math.random() - 0.5) * 3; }
    };
    switch (e.state) {
      case 'wander':
        walkFrame();
        if (Math.hypot(e.tx - e.x, e.ty - e.y) < 0.2 || e.t <= 0) { e.tx = e.homeX + (Math.random() - 0.5) * 3; e.ty = e.homeY + (Math.random() - 0.5) * 3; e.t = 3 + Math.random() * 2; }
        toward(e.tx, e.ty, 0.55);
        if (e.los && d < 6.5) { e.state = 'chase'; this.tip('drifter'); }
        break;
      case 'chase':
        walkFrame();
        if (e.cd > 0) e.cd -= dt;
        if (d > 0.8) toward(this.px, this.py, 0.95);
        if (d < 0.85 && e.cd <= 0) { e.state = 'grab'; e.t = 0.75; }
        if (!e.los && d > 8) e.state = 'wander';
        break;
      case 'grab':
        e.frame = e.t > 0.35 ? 4 : 5;
        if (e.t <= 0) {
          if (d < 1.15) {
            this.hurt(1);
            const a = Math.atan2(this.py - e.y, this.px - e.x);
            this.movePlayer(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
          }
          e.state = 'chase'; e.cd = 1;
        }
        break;
      case 'frozen':
        e.frame = 9;
        if (e.t <= 0) { e.state = 'chase'; if (e.mark) { e.mark.gone = true; e.mark = undefined; } }
        break;
      case 'saved':
        if (e.t > 2.4) e.frame = 6;
        else e.frame = Math.floor(this.clock * 3) % 2 ? 7 : 8;
        if (e.t <= 0) { e.gone = true; this.fx(e.x, e.y, 0.2, 'splash', [0, 1, 2], 10, 0.5); }
        break;
    }
    // they loop the same street lines, stuck
    if ((e.state === 'chase' || e.state === 'wander') && e.talkCd <= 0 && d < 5 && e.los) {
      e.talkCd = 6 + Math.random() * 6;
      const line = this.drifterLine(e);
      this.say(this.entSpeaker(e), line, 2000);
      if (line.includes('DOLLA')) this.tip('dolla');
    }
  }
  drifterLine(_e: Ent) { return 'AYE MANE, YOU GOT A DOLLA FOR THE BUS?'; }
  saveDrifter(e: Ent, gold: boolean) {
    const bonus = e.state === 'frozen' ? 100 : 0;
    e.state = 'saved'; e.t = 3.2; e.solid = false; e.frame = 6;
    if (e.mark) { e.mark.gone = true; e.mark = undefined; }
    this.kos++;
    this.sfx('hydrate', 0.8);
    this.addScore(200 + bonus + (gold ? 50 : 0));
    this.toast(bonus ? 'HYDRATED! +300' : 'HYDRATED! +200');
    this.time.delayedCall(700, () => { if (!e.gone) this.say(this.entSpeaker(e), '...WHERE MY CAR?', 1800); });
    this.events.emit('hud');
    this.onDrifterSaved(e);
  }

  private updatePip(e: Ent, dt: number) {
    const d = this.dist(e);
    e.t += dt;
    switch (e.state) {
      case 'off': e.frame = 0; e.z = 0; break;
      case 'hop': {
        e.frame = 1 + (Math.floor(e.t * 6) % 2);
        e.z = Math.abs(Math.sin(e.t * 7)) * 0.07;
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        const want = d > 4.2 ? 1 : d < 2.2 ? -1 : 0;
        const side = Math.sin(e.t * 1.3 + e.homeX) * 0.9;
        const sp = 1.6;
        this.moveEnt(e, (Math.cos(a) * want - Math.sin(a) * side) * sp * dt, (Math.sin(a) * want + Math.cos(a) * side) * sp * dt);
        e.cd -= dt;
        if (e.cd <= 0 && e.los && d < 9) { e.state = 'shoot'; e.data = { t: 0.45 }; }
        if (e.talkCd <= 0 && d < 6 && e.los) { e.talkCd = 7 + Math.random() * 7; this.say(this.entSpeaker(e), this.pipLine(), 1500); }
        break;
      }
      case 'shoot':
        e.z = 0;
        e.data.t -= dt;
        e.frame = e.data.t > 0.2 ? 3 : 4;
        if (e.data.t <= 0) {
          this.capShot(e.x, e.y, Math.atan2(this.py - e.y, this.px - e.x), 4.2);
          e.state = 'hop'; e.cd = 1.8 + Math.random() * 1.4;
        }
        break;
      case 'hurt':
        e.frame = 5; e.data.t -= dt;
        if (e.data.t <= 0) e.state = 'hop';
        break;
      case 'crush':
        e.data.t -= dt;
        e.frame = e.data.t > 0.2 ? 6 : 7;
        if (e.data.t <= 0) e.gone = true;
        break;
    }
  }
  pipLine() { return ['SINGLE-USE, BABY!', 'ZERO TASTE!', 'ZERO MEMORY!', 'ONE USE IS ALL I NEED!', 'FRESH OFF THE LINE!'][Math.floor(Math.random() * 5)]; }
  hitPip(e: Ent, dmg: number) {
    if (e.state === 'off') { this.wakePip(e); return; }
    e.hp -= dmg; e.flash = 0.12;
    this.sfx('crinkle', 0.6);
    if (e.hp <= 0) {
      e.state = 'crush'; e.data = { t: 0.4 }; e.solid = false; e.z = 0;
      this.pipsDown++;
      this.addScore(150);
      this.toast('RECYCLED! +150');
      this.sfx('capPop', 0.5);
      this.events.emit('hud');
      this.onPipDown(e);
    } else { e.state = 'hurt'; e.data = { t: 0.25 }; }
  }
  capShot(x: number, y: number, a: number, sp: number) {
    this.ent('cap', x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, 'capShot', { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, h: 0.12, z: 0.25, life: 3, anim: { frames: [0, 1, 2, 3], fps: 14, loop: true, t0: this.clock } });
    this.sfx('capPop', 0.35);
  }

  private updateShot(e: Ent, dt: number) {
    e.life! -= dt;
    if (e.life! <= 0) { e.gone = true; return; }
    e.frame = (e.gold ? 2 : 0) + (Math.floor(this.clock * 20) % 2);
    for (let s = 0; s < 3; s++) {
      e.x += (e.vx * dt) / 3; e.y += (e.vy * dt) / 3;
      if (this.solidCell(e.x, e.y)) { e.gone = true; this.splashAt(e.x - e.vx * 0.02, e.y - e.vy * 0.02, e.z, e.gold); this.sfx('splash', 0.25); return; }
      for (const o of this.ents) {
        if (o.gone || o === e) continue;
        if (o.kind === 'prop' && o.solid && Math.hypot(o.x - e.x, o.y - e.y) < o.r + 0.05) { e.gone = true; this.splashAt(e.x, e.y, e.z, e.gold); this.sfx('splash', 0.2); return; }
        if (o.kind === 'drifter' && o.state !== 'saved' && Math.hypot(o.x - e.x, o.y - e.y) < 0.36) {
          e.gone = true; this.splashAt(e.x, e.y, 0.35, e.gold); this.saveDrifter(o, !!e.gold); return;
        }
        if (o.kind === 'pip' && o.state !== 'crush' && Math.hypot(o.x - e.x, o.y - e.y) < 0.32) {
          e.gone = true; this.splashAt(e.x, e.y, 0.2, e.gold); this.hitPip(o, e.gold ? 2 : 1); return;
        }
        if (o.kind === 'boss' && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < o.r + 0.1) {
          e.gone = true; this.splashAt(e.x, e.y, 0.4, e.gold); this.onBossShot(o, e.gold ? 2 : 1); return;
        }
      }
    }
  }
  private updateCap(e: Ent, dt: number) {
    e.life! -= dt;
    if (e.life! <= 0) { e.gone = true; return; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (this.solidCell(e.x, e.y)) { e.gone = true; this.fx(e.x, e.y, 0.25, 'spark', [0, 1, 2], 20, 0.2); return; }
    for (const o of this.ents) if (o.kind === 'prop' && o.solid && Math.hypot(o.x - e.x, o.y - e.y) < o.r) { e.gone = true; this.fx(e.x, e.y, 0.25, 'spark', [0, 1, 2], 20, 0.2); this.sfx('clang', 0.2); return; }
    if (this.dist(e) < 0.32) { e.gone = true; this.hurt(1); }
  }

  // ---------------------------------------------------------------- drawing
  private render() {
    const buf = this.buf!, W = this.bw, zb = this.zbuf;
    const dirX = Math.cos(this.pa), dirY = Math.sin(this.pa);
    const plX = -dirY * FOV, plY = dirX * FOV;
    const pX = this.px, pY = this.py;
    const walls = this.texData('plantWalls'), floors = this.texData('plantFloors');
    const wd = walls.data, ww = walls.w, fd = floors.data, fw = floors.w;
    const belt = (this.clock * 1.3 * TEX) | 0;
    // floor and ceiling, row by row
    const rd0x = dirX - plX, rd0y = dirY - plY, rd1x = dirX + plX, rd1y = dirY + plY;
    for (let y = 0; y < H; y++) {
      const floor = y > HZ;
      const p = floor ? y - HZ : HZ - y;
      if (p === 0) { for (let x = 0; x < W; x++) buf[y * W + x] = 0xff000000 | (FOG[2] << 16) | (FOG[1] << 8) | FOG[0]; continue; }
      const rowDist = ((floor ? CAM : 1 - CAM) * H) / p;
      const lvl = this.shadeOf(rowDist, floor ? 1 : 0.85);
      const stX = (rowDist * (rd1x - rd0x)) / W, stY = (rowDist * (rd1y - rd0y)) / W;
      let fx = pX + rowDist * rd0x, fy = pY + rowDist * rd0y;
      const row = y * W;
      for (let x = 0; x < W; x++, fx += stX, fy += stY) {
        const cx = Math.floor(fx), cy = Math.floor(fy);
        let tx = ((fx - cx) * TEX) | 0, ty = ((fy - cy) * TEX) | 0;
        let t: number;
        if (floor) {
          const c = cy >= 0 && cy < this.mapH && cx >= 0 && cx < this.mapW ? this.map[cy][cx] : '.';
          t = FLOOR_TEX[c] ?? 0;
          const b = BELT[c];
          if (b) {
            // belts: rollers run along the direction of travel
            if (b[0] !== 0) { const u = ty; ty = (tx - belt * b[0]) & 63; tx = u; }
            else ty = (ty - belt * b[1]) & 63;
          }
        } else t = (((cx % 4) + 4) % 4 === 1 && ((cy % 4) + 4) % 4 === 1) ? 5 : 4;
        buf[row + x] = this.sh(fd[ty * fw + t * TEX + tx], t === 5 ? LEVELS - 1 : lvl);
      }
    }
    // walls, column by column (DDA)
    for (let x = 0; x < W; x++) {
      const camX = (2 * x) / W - 1;
      const rx = dirX + plX * camX, ry = dirY + plY * camX;
      let mx = Math.floor(pX), my = Math.floor(pY);
      const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry);
      const sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
      let sdx = rx < 0 ? (pX - mx) * ddx : (mx + 1 - pX) * ddx;
      let sdy = ry < 0 ? (pY - my) * ddy : (my + 1 - pY) * ddy;
      let side = 0, perp = 30, tex = 0, u = 0, hit = false;
      for (let i = 0; i < 64; i++) {
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
        if (mx < 0 || my < 0 || mx >= this.mapW || my >= this.mapH) break;
        const c = this.map[my][mx];
        const ti = WALL_TEX[c];
        if (ti === undefined) continue;
        const pd = side === 0 ? sdx - ddx : sdy - ddy;
        let wx = side === 0 ? pY + pd * ry : pX + pd * rx;
        wx -= Math.floor(wx);
        if (DOORS.has(c)) {
          const d = this.doors.get(`${mx},${my}`);
          const open = d ? d.open : 0;
          if (wx < open) continue; // slid open this far
          wx -= open;
        }
        perp = pd; tex = ti; u = wx; hit = true;
        break;
      }
      zb[x] = perp;
      if (!hit) continue;
      let tx = (u * TEX) | 0;
      if ((side === 0 && rx > 0) || (side === 1 && ry < 0)) tx = TEX - 1 - tx;
      const lineH = H / perp;
      const top = HZ - (1 - CAM) * lineH;
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H - 1, Math.floor(HZ + CAM * lineH));
      const lvl = this.shadeOf(perp, side ? 0.8 : 1);
      const step = TEX / lineH;
      let ty = (y0 - top) * step;
      const base = tex * TEX + tx;
      for (let y = y0; y <= y1; y++, ty += step) buf[y * W + x] = this.sh(wd[(Math.min(63, ty | 0)) * ww + base], lvl);
    }
    // sprites, far to near
    const inv = 1 / (plX * dirY - dirX * plY);
    const vis: Ent[] = [];
    for (const e of this.ents) {
      e.seen = false;
      if (e.gone) continue;
      const dx = e.x - pX, dy = e.y - pY;
      const ty = inv * (-plY * dx + plX * dy);
      if (ty < 0.15) continue;
      e.dist = ty;
      e.sx = (W / 2) * (1 + (inv * (dirY * dx - dirX * dy)) / ty);
      vis.push(e);
    }
    vis.sort((a, b) => b.dist - a.dist);
    for (const e of vis) this.drawSprite(e, W);
    this.canvasTex!.getContext().putImageData(this.img!, 0, 0);
    this.canvasTex!.refresh();
  }

  private drawSprite(e: Ent, W: number) {
    const buf = this.buf!, zb = this.zbuf;
    const f = this.frameData(e.tex, e.frame);
    const t = e.dist;
    const sH = (e.h * H) / t;
    const sW = (sH * f.w) / f.h;
    const bottom = HZ + ((CAM - e.z) * H) / t;
    const top = bottom - sH;
    const left = e.sx - sW / 2;
    const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W - 1, Math.floor(left + sW));
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H - 1, Math.floor(bottom));
    e.top = top;
    if (x0 > x1 || y0 > y1) return;
    const cx = Math.round(Phaser.Math.Clamp(e.sx, 0, W - 1));
    e.seen = zb[cx] > t || (x1 - x0 > 4 && zb[Math.min(x1, Math.max(x0, cx))] > t);
    const lvl = e.kind === 'fx' || e.kind === 'shot' || e.kind === 'pickup' ? LEVELS - 1 : this.shadeOf(t);
    const td = f.tex.data, tw = f.tex.w;
    const flash = e.flash > 0;
    const gold = e.gold && e.kind === 'fx';
    for (let x = x0; x <= x1; x++) {
      if (zb[x] <= t) continue;
      const u = f.x + Math.min(f.w - 1, (((x - left) * f.w) / sW) | 0);
      const vs = f.h / sH;
      let v = (y0 - top) * vs;
      for (let y = y0; y <= y1; y++, v += vs) {
        const c = td[(f.y + Math.min(f.h - 1, v | 0)) * tw + u];
        if ((c >>> 24) < 128) continue;
        let o = c;
        if (flash) o = 0xffffffff;
        else if (gold) o = 0xff000000 | (Math.min(255, (c & 255) + 60)) | (Math.min(255, ((c >>> 8) & 255) + 30) << 8) | (((c >>> 16) & 255) >> 2) << 16;
        buf[y * W + x] = this.sh(o, lvl);
      }
    }
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
  hasTip(k: string) { return this.tips.has(k); }
  banner(top: string, bottom: string) { this.events.emit('banner', { top, bottom }); }

  // ---------------------------------------------------------------- running dry: sip to continue
  showContinue() {
    if (this.continuing) return;
    this.playing = false;
    this.continuing = true;
    this.capped = 0;
    this.events.emit('capped', 0);
    this.events.emit('continue', true);
  }
  doContinue() {
    this.continuing = false;
    this.score = 0;
    this.hp = MAX_HP;
    this.invuln = 2;
    this.px = this.checkpoint.x; this.py = this.checkpoint.y; this.pa = this.checkpoint.a;
    // clear the air: no caps in flight
    for (const e of this.ents) if (e.kind === 'cap') e.gone = true;
    this.onContinue();
    this.playing = true;
    this.events.emit('continue', false);
    this.events.emit('hud');
    this.say(this.maneSpeaker(), MANE.getUp, 1600);
  }
  onContinue() { /* override */ }
  gameOver() { this.scene.restart(); }

  // ---------------------------------------------------------------- talking
  private spk: Record<string, Speaker> = {};
  maneSpeaker(): Speaker { const s = this; return (this.spk.mane ??= { __mane: true, get x() { return s.W / 2; }, get headY() { return 150; } } as Speaker); }
  radioSpeaker(): Speaker { return (this.spk.radio ??= { __radio: true, get x() { return 92; }, get headY() { return 204; } } as Speaker); }
  entSpeaker(e: Ent): Speaker { return ((e as any).spk ??= { get x() { return e.sx; }, get headY() { return e.seen ? e.top - 2 : -100; } }); }
  speaker(s: { x: number; y: number }, head: number): Speaker { return { get x() { return s.x; }, get headY() { return s.y - head; } }; }

  say(who: Speaker, text: string, ms = 1600) {
    this.bubbles.filter((b) => b.who === who).forEach((b) => b.box.destroy());
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    const mane = !!(who as any).__mane;
    const radio = !!(who as any).__radio;
    const t = px(this, 0, 0, wrap(radio ? `MALIK (RADIO): ${text}` : text, 24), mane ? COLORS.goldHi : radio ? 0xa8dcff : 0xffffff);
    const w = t.width + 8, h = t.height + 6;
    t.setPosition(-w / 2 + 4, -h + 3);
    const g = this.add.graphics();
    g.fillStyle(0x0b0f26, 0.92).fillRoundedRect(-w / 2, -h, w, h, 3);
    g.lineStyle(1, radio ? 0x7fc4ff : 0x9aa0c0, 1).strokeRoundedRect(-w / 2 + 0.5, -h + 0.5, w - 1, h - 1, 3);
    if (!radio) g.fillStyle(0x0b0f26, 0.92).fillTriangle(-3, 0, 3, 0, 0, 4);
    const box = this.add.container(0, 0, [g, t]).setDepth(8000);
    this.bubbles.push({ box, who, until: this.time.now + ms });
    if (radio) this.sfx('radio', 0.5);
    this.updateBubbles();
  }
  private updateBubbles() {
    const now = this.time.now;
    for (const b of this.bubbles) {
      if (now > b.until) { b.box.destroy(); continue; }
      const half = (b.box.getBounds().width || 40) / 2;
      const y = b.who.headY;
      b.box.setVisible(y > -50);
      b.box.setPosition(Math.round(Phaser.Math.Clamp(b.who.x, half + 2, this.W - half - 2)), Math.round(Phaser.Math.Clamp(y, 54, 200)));
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
  startCutscene() { this.inCutscene = true; this.playing = false; this.events.emit('cutscene', true); }
  endCutscene() { this.clearBubbles(); this.clearCaption(); this.inCutscene = false; this.skipping = false; this.events.emit('cutscene', false); Controls.clear(); this.strafe = 0; }
  skipCutscene() { if (this.inCutscene) this.skipping = true; }
  // a rectangle of the map the player is standing in
  inArea(x0: number, y0: number, x1: number, y1: number) { return this.px >= x0 && this.px <= x1 + 1 && this.py >= y0 && this.py <= y1 + 1; }

  stats(): MissionStats {
    return { score: this.score, timeMs: this.elapsed, kos: this.kos, sips: this.sips, cans: 0, drivers: this.pipsDown };
  }
}
