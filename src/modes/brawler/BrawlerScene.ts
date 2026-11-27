import Phaser from 'phaser';
import { Actor, HitInfo } from './Actor';
import { Mane, MAX_CANS } from './Mane';
import { Shiesty, ShiestyKind } from './Shiesty';
import { Bottle, Car, Pickup, PickupKind, Pothole, TrashCan } from './Props';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import { LEVEL_W, SfxKey } from '../../core/assets';
import { COLORS, FLOOR_BOTTOM, FLOOR_TOP, VIEW_W_MAX } from '../../core/config';
import { px, wrap } from '../../core/text';
import { MANE } from '../../missions/lines';

export interface Hittable {
  x: number; y: number; z: number; radius: number; alive: boolean;
  takeHit(h: HitInfo): boolean;
}

interface Bubble { box: Phaser.GameObjects.Container; actor: Actor; until: number }
interface Waiter { pred: () => boolean; resolve: () => void }

export interface MissionStats { score: number; timeMs: number; kos: number; sips: number; cans: number; drivers: number }

// The reusable brawler engine (Turtles in Time style). Each mission extends it and writes a script.
export abstract class BrawlerScene extends Phaser.Scene {
  player!: Mane;
  enemies: Shiesty[] = [];
  pickups: Pickup[] = [];
  cars: Car[] = [];
  bottles: Bottle[] = [];
  cans: TrashCan[] = [];
  potholes: Pothole[] = [];
  extras: Actor[] = []; // cutscene characters
  private tokens = new Set<Shiesty>();
  private bubbles: Bubble[] = [];
  private waiters: Waiter[] = [];
  private hitstopMs = 0;
  lockX: number | null = null;
  camX = 0;
  score = 0;
  kos = 0;
  pickupsTaken = 0;
  driveOutKOs = 0;
  startTime = 0;
  elapsed = 0;
  inCutscene = false;
  skipping = false;
  paused = false;
  continuing = false;
  missionId = '';
  missionTitle = '';
  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  abstract runScript(): Promise<void>;

  get viewW() { return this.scale.width; }
  viewBounds() { return { left: this.camX, right: this.camX + this.viewW }; }

  create() {
    this.enemies = []; this.pickups = []; this.cars = []; this.bottles = []; this.cans = []; this.potholes = []; this.extras = [];
    this.tokens.clear(); this.bubbles = []; this.waiters = [];
    this.lockX = null; this.camX = 0; this.score = 0; this.kos = 0; this.pickupsTaken = 0; this.driveOutKOs = 0;
    this.elapsed = 0; this.inCutscene = false; this.skipping = false; this.paused = false; this.continuing = false; this.hitstopMs = 0;
    Controls.clear();
    Audio.apply(this);

    // parallax: sky + far rooftops are fixed to the camera and scroll their texture
    this.sky = this.add.tileSprite(0, 0, VIEW_W_MAX, 216, 'bgSky').setOrigin(0).setScrollFactor(0).setDepth(-1000);
    this.far = this.add.tileSprite(0, 0, VIEW_W_MAX, 216, 'bgFar').setOrigin(0).setScrollFactor(0).setDepth(-999);
    this.add.image(0, 0, 'bgGround').setOrigin(0).setDepth(-998);
    this.add.image(0, 0, 'bgWall').setOrigin(0).setDepth(-997);
    this.cameras.main.setBounds(0, 0, LEVEL_W, 216);
    this.cameras.main.setRoundPixels(true);

    this.player = new Mane(this, 120, 182);
    this.setupKeyboard();
    this.scene.launch('UI', { world: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scene.stop('UI'); this.input.keyboard?.removeAllListeners(); });
    this.startTime = this.time.now;
    this.buildLevel();
    this.runScript().catch((e) => console.error(e));
  }

  abstract buildLevel(): void;

  // ---------------------------------------------------------------- input
  private setupKeyboard() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    const map: Record<string, Button> = {
      Z: 'attack', J: 'attack', X: 'jump', K: 'jump', SPACE: 'jump', C: 'sip', L: 'sip', V: 'flex', I: 'flex', ENTER: 'attack', ESC: 'pause', P: 'pause',
    };
    kb.on('keydown', (e: KeyboardEvent) => {
      const k = e.key === ' ' ? 'SPACE' : e.key === 'Escape' ? 'ESC' : e.key.toUpperCase();
      const b = map[k];
      if (!b) return;
      if (b === 'pause') { this.togglePause(); return; }
      Controls.press(b);
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const k = e.key === ' ' ? 'SPACE' : e.key === 'Escape' ? 'ESC' : e.key.toUpperCase();
      const b = map[k];
      if (b) Controls.release(b);
    });
  }

  private readKeys() {
    const k = this.keys;
    const x = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const y = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    Controls.setKeys(x, y);
  }

  togglePause() {
    if (this.continuing) return;
    this.paused = !this.paused;
    if (this.paused) { this.sound.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; this.anims.pauseAll(); }
    else { this.sound.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; this.anims.resumeAll(); }
    this.events.emit('paused', this.paused);
  }

  // ---------------------------------------------------------------- main loop
  update(_t: number, deltaMs: number) {
    this.readKeys();
    if (this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.hitstopMs > 0) {
      this.hitstopMs -= deltaMs;
      if (this.hitstopMs <= 0) this.anims.resumeAll();
      return;
    }
    if (this.continuing) { this.updateBubbles(); return; }
    if (!this.inCutscene) this.elapsed += deltaMs;

    this.player.update(dt);
    for (const e of [...this.enemies]) if (e.alive) e.update(dt);
    for (const x of this.extras) if (x.alive) (x as any).update?.(dt);
    this.updateProjectiles(dt);
    this.updateCars(dt);
    this.updatePickups(dt);
    this.updateCamera(dt);

    this.player.render();
    for (const e of this.enemies) if (e.alive) e.render();
    for (const x of this.extras) if (x.alive) x.render();
    this.updateBubbles();

    for (const w of [...this.waiters]) if (w.pred()) { this.waiters.splice(this.waiters.indexOf(w), 1); w.resolve(); }
  }

  private updateCamera(dt: number) {
    const W = this.viewW;
    let target: number;
    if (this.lockX !== null) target = this.lockX;
    else target = Math.max(this.camX, this.player.x - W * 0.42);
    target = Phaser.Math.Clamp(target, 0, LEVEL_W - W);
    this.camX += (target - this.camX) * Math.min(1, dt * 5);
    if (Math.abs(target - this.camX) < 0.5) this.camX = target;
    this.cameras.main.scrollX = Math.round(this.camX);
    this.sky.tilePositionX = this.camX * 0.15;
    this.far.tilePositionX = this.camX * 0.4;
    // the player can't leave the screen (or the locked arena)
    const left = this.lockX !== null ? Math.max(this.camX, Math.min(this.lockX, this.camX)) : this.camX;
    this.player.bounds.left = left;
    this.player.bounds.right = this.camX + W;
  }

  // ---------------------------------------------------------------- combat
  hitTest(a: Actor, reach: [number, number], depth: number, exclude: Set<object>, againstPlayer = false): Hittable[] {
    const out: Hittable[] = [];
    const targets: Hittable[] = againstPlayer ? [this.player] : [...this.enemies, ...this.cans, ...this.bottles];
    for (const t of targets) {
      if (!t.alive || exclude.has(t) || (t as unknown) === a) continue;
      const dx = (t.x - a.x) * a.facing;
      if (dx < reach[0] - t.radius || dx > reach[1] + t.radius) continue;
      if (Math.abs(t.y - a.y) > depth) continue;
      if (Math.abs(t.z - a.z) > 34) continue;
      out.push(t);
    }
    return out;
  }

  onPlayerHit(p: Mane, t: Hittable, info: HitInfo) {
    const isEnemy = t instanceof Shiesty;
    const cx = (p.x + t.x) / 2 + p.facing * 4;
    const cy = t.y - t.z - 26;
    this.spark(cx, cy, info.heavy ? COLORS.goldHi : COLORS.white);
    if (isEnemy) {
      this.addScore(info.heavy ? 30 : 10);
      this.hitstop(info.heavy ? 110 : 55);
      this.sfx(info.heavy ? 'punchHeavy' : 'punch', 0.8);
      if (info.heavy) this.shake(90, 0.004);
      if (info.heavy && Math.random() < 0.3) p.say(MANE.bigHit, 1);
      this.events.emit('enemyHit', t);
      this.onEnemyStruck(t as Shiesty, info);
    }
  }

  // Missions can hook the first-punch gag and other beats here.
  onEnemyStruck(_e: Shiesty, _info: HitInfo) { /* override */ }

  requestToken(e: Shiesty) {
    if (this.tokens.size >= 2) return false;
    this.tokens.add(e);
    return true;
  }
  releaseToken(e: Shiesty) { this.tokens.delete(e); }

  grillFlash(p: Mane) {
    this.sfx('shine', 0.8);
    const fx = p.x + p.facing * 8, fy = p.y - p.z - 26;
    const beam = this.add.triangle(fx, fy, 0, 0, 120, -26, 120, 26, COLORS.goldHi, 0.55).setOrigin(0, 0.5).setScale(p.facing, 1).setDepth(500).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0, scaleY: 1.4, duration: 300, onComplete: () => beam.destroy() });
    this.spark(fx, fy - 2, COLORS.goldHi);
    for (const e of this.enemies) {
      const dx = (e.x - p.x) * p.facing;
      if (e.alive && dx > 0 && dx < 130 && Math.abs(e.y - p.y) < 24) {
        if (e.takeHit({ damage: 0, dir: p.facing, kind: 'flash' })) {
          this.addScore(15);
          this.say(e, '?!', 900);
        }
      }
    }
  }

  hitstop(ms: number) {
    this.hitstopMs = Math.max(this.hitstopMs, ms);
    this.anims.pauseAll();
  }

  freezeFrame(ms: number, color: number) {
    this.hitstop(ms);
    const c = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(ms + 80, c.r, c.g, c.b);
  }

  shake(ms: number, intensity: number) { this.cameras.main.shake(ms, intensity); }

  // ---------------------------------------------------------------- spawning
  spawnEnemy(kind: ShiestyKind, side: 'left' | 'right', y?: number, x?: number): Shiesty {
    const v = this.viewBounds();
    const sx = x ?? (side === 'left' ? v.left - 30 : v.right + 30);
    const sy = y ?? Phaser.Math.Between(FLOOR_TOP + 4, FLOOR_BOTTOM - 4);
    const e = new Shiesty(this, kind, sx, sy);
    e.facing = side === 'left' ? 1 : -1;
    this.enemies.push(e);
    return e;
  }

  onEnemyGone(e: Shiesty) {
    this.enemies = this.enemies.filter((x) => x !== e);
    this.tokens.delete(e);
    this.kos++;
    this.addScore(100);
    this.events.emit('enemyHit', null);
  }

  spawnPickup(kind: PickupKind, x: number, y: number, pop = false) {
    this.pickups.push(new Pickup(this, kind, x, y, pop));
  }

  addTrashCan(x: number, y: number, drop: PickupKind | null) { this.cans.push(new TrashCan(this, x, y, drop)); }

  addPothole(x: number, y: number) {
    const img = this.add.image(x, y, 'pothole').setDepth(-990);
    this.potholes.push({ x, y, w: 17, h: 5, img });
  }

  inPothole(a: Actor) {
    for (const p of this.potholes) {
      const dx = (a.x - p.x) / p.w, dy = (a.y - p.y) / p.h;
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }

  throwBottle(e: Shiesty) {
    this.sfx('throw', 0.5);
    this.bottles.push(new Bottle(this, e.x + e.facing * 12, e.y, e.facing * 150));
  }

  private updateProjectiles(dt: number) {
    const p = this.player;
    for (const b of this.bottles) {
      if (!b.alive) continue;
      b.update(dt);
      if (Math.abs(b.x - p.x) < 10 && Math.abs(b.y - p.y) < 8 && p.z < 20) {
        if (p.takeHit({ damage: 6, dir: Math.sign(b.vx) as 1 | -1, knockback: 50, kind: 'bottle' })) {
          this.sfx('bottle', 0.6);
          this.spark(b.x, b.y - b.z, 0x7fc4ff);
          b.destroy();
        }
      }
      const v = this.viewBounds();
      if (b.alive && (b.x < v.left - 40 || b.x > v.right + 40 || b.z < 0)) b.destroy();
    }
    this.bottles = this.bottles.filter((b) => b.alive);
  }

  // A drive-out car whips through a lane. Warns first: horn + flashing arrow.
  async driveBy(laneY: number, dir: 1 | -1, tex = 'carMaroon', warnMs = 1100) {
    this.events.emit('carWarn', { y: laneY, dir, ms: warnMs });
    this.sfx('horn', 0.6);
    const lane = this.add.rectangle(0, laneY, VIEW_W_MAX, 14, 0xfff6c8, 0.08).setOrigin(0, 0.5).setScrollFactor(0).setDepth(-900);
    this.tweens.add({ targets: lane, alpha: { from: 0.04, to: 0.16 }, yoyo: true, repeat: -1, duration: 160 });
    await this.wait(warnMs);
    lane.destroy();
    const v = this.viewBounds();
    const x = dir > 0 ? v.left - 80 : v.right + 80;
    const car = new Car(this, tex, x, laneY, dir * 370);
    this.cars.push(car);
    this.sfx('carBy', 0.7);
    await this.waitUntil(() => !car.alive);
  }

  private updateCars(dt: number) {
    for (const c of this.cars) {
      if (!c.alive) continue;
      c.update(dt);
      const dir = Math.sign(c.vx) as 1 | -1;
      const victims: Actor[] = [this.player, ...this.enemies];
      for (const a of victims) {
        if (!a.alive || c.hit.has(a)) continue;
        if (Math.abs(a.y - c.y) < 11 && Math.abs(a.x - c.x) < 58 && a.z < 20) {
          c.hit.add(a);
          const landed = (a as Mane | Shiesty).takeHit({ damage: a === this.player ? 18 : 40, dir, knockdown: true, knockback: 220, launch: 260, heavy: true, kind: 'car' });
          if (landed) {
            this.sfx('punchHeavy', 0.9);
            this.spark(a.x, a.y - 24, COLORS.white);
            this.shake(140, 0.006);
            if (a !== this.player) { this.driveOutKOs++; this.addScore(200); this.toast('DRIVE-OUT! +200'); }
          }
        }
      }
      const v = this.viewBounds();
      if ((dir > 0 && c.x > v.right + 140) || (dir < 0 && c.x < v.left - 140)) c.destroy();
    }
    this.cars = this.cars.filter((c) => c.alive);
  }

  private updatePickups(dt: number) {
    const p = this.player;
    for (const k of this.pickups) {
      if (!k.alive) continue;
      k.update(dt);
      if (k.z < 4 && Math.abs(k.x - p.x) < 14 && Math.abs(k.y - p.y) < 9 && p.z < 14 && p.alive && p.state !== 'down') this.collect(k);
    }
    this.pickups = this.pickups.filter((k) => k.alive);
  }

  private collect(k: Pickup) {
    const p = this.player;
    this.pickupsTaken++;
    if (k.kind === 'can') {
      if (p.cans < MAX_CANS) { p.cans++; this.toast(p.cans === 1 ? 'MEMPHYS! TAP SIP FOR MANE MODE' : 'MEMPHYS +1'); }
      else { this.addScore(300); this.toast('CANS FULL +300'); }
      this.sfx('pickup', 0.7);
    } else {
      const heal = k.kind === 'bbq' ? 40 : 22;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.sfx('eat', 0.7);
      this.toast(k.kind === 'bbq' ? 'RIBS! +HEALTH' : 'WINGS! +HEALTH');
    }
    this.addScore(50);
    this.spark(k.x, k.y - 8, COLORS.goldHi);
    k.destroy();
    this.events.emit('hud');
  }

  // ---------------------------------------------------------------- feedback
  sfx(key: SfxKey, volume = 0.7) { Audio.sfx(this, key, { volume }); }

  spark(x: number, y: number, tint = 0xffffff) {
    const s = this.add.sprite(x, y, 'spark').setDepth(900).setTint(tint).setBlendMode(Phaser.BlendModes.ADD);
    s.play('spark:hit');
    s.once('animationcomplete', () => s.destroy());
  }

  dust(x: number, y: number) {
    const d = this.add.sprite(x, y - 4, 'dust').setDepth(y + 1);
    d.play('dust:puff');
    d.once('animationcomplete', () => d.destroy());
  }

  splash(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const drop = this.add.image(x, y - 2, 'sweat').setDepth(y + 2);
      this.tweens.add({ targets: drop, x: x + Phaser.Math.Between(-16, 16), y: y - Phaser.Math.Between(8, 20), alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => drop.destroy() });
    }
  }

  afterimage(src: Phaser.GameObjects.Sprite) {
    const g = this.add.image(src.x, src.y, src.texture.key, src.frame.name).setOrigin(src.originX, src.originY)
      .setFlipX(src.flipX).setScale(src.scaleX, src.scaleY).setDepth(src.depth - 1).setTint(COLORS.gold).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  addScore(n: number) { this.score += n; this.events.emit('hud'); }
  toast(s: string) { this.events.emit('toast', s); }

  // Speech bubble that follows a character
  say(actor: Actor, text: string, ms = 1600) {
    this.bubbles.filter((b) => b.actor === actor).forEach((b) => b.box.destroy());
    this.bubbles = this.bubbles.filter((b) => b.actor !== actor);
    const t = px(this, 0, 0, wrap(text, 22), actor === this.player ? COLORS.goldHi : 0xffffff);
    const w = t.width + 8, h = t.height + 6;
    t.setPosition(-w / 2 + 4, -h + 3);
    const g = this.add.graphics();
    g.fillStyle(0x0b0f26, 0.92).fillRoundedRect(-w / 2, -h, w, h, 3);
    g.lineStyle(1, actor === this.player ? COLORS.gold : 0x9aa0c0, 1).strokeRoundedRect(-w / 2 + 0.5, -h + 0.5, w - 1, h - 1, 3);
    g.fillStyle(0x0b0f26, 0.92).fillTriangle(-3, 0, 3, 0, 0, 4);
    const box = this.add.container(0, 0, [g, t]).setDepth(2000);
    this.bubbles.push({ box, actor, until: this.time.now + ms });
    this.updateBubbles();
  }

  private updateBubbles() {
    const now = this.time.now;
    for (const b of this.bubbles) {
      if (now > b.until || !b.actor.alive) { b.box.destroy(); continue; }
      const a = b.actor;
      const top = a.y - a.z - (a.texKey === 'dog' ? 26 : a.texKey.startsWith('car') ? 50 : 52) * a.sprite.scaleY;
      const v = this.viewBounds();
      const half = (b.box.getBounds().width || 40) / 2;
      b.box.setPosition(Math.round(Phaser.Math.Clamp(a.x, v.left + half + 2, v.right - half - 2)), Math.round(Math.max(24, top)));
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

  // Dialogue line in a cutscene: tap/press to advance early.
  async line(actor: Actor, text: string, ms = 2000) {
    if (this.skipping) return;
    this.say(actor, text, ms + 200);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && (Controls.consume('attack', 300) || Controls.consume('jump', 300))));
    this.clearBubbles();
  }

  async wave(spawns: { kind: ShiestyKind; side: 'left' | 'right'; y?: number; delay?: number }[]) {
    const mine: Shiesty[] = [];
    for (const s of spawns) {
      if (s.delay) await this.wait(s.delay);
      mine.push(this.spawnEnemy(s.kind, s.side, s.y));
    }
    await this.waitUntil(() => mine.every((e) => !e.alive));
  }

  lock(x: number) { this.lockX = Phaser.Math.Clamp(x, 0, LEVEL_W - this.viewW); }
  unlock() { this.lockX = null; this.events.emit('go', true); }

  async advanceTo(x: number) {
    this.events.emit('go', true);
    await this.waitUntil(() => this.player.x >= x);
    this.events.emit('go', false);
  }

  // Walk a character to a point (cutscenes)
  walkTo(a: Actor, x: number, y: number, speed = 60) {
    return new Promise<void>((resolve) => {
      if (this.skipping) { a.x = x; a.y = y; resolve(); return; }
      a.play('walk');
      const ev = this.time.addEvent({
        loop: true, delay: 16, callback: () => {
          const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy);
          if (d < 2 || this.skipping) { a.x = x; a.y = y; ev.remove(); a.play(a.texKey === 'mane' ? 'idle' : 'idle'); resolve(); return; }
          a.facing = dx >= 0 ? 1 : -1;
          a.x += (dx / d) * speed * 0.016; a.y += (dy / d) * speed * 0.016;
        },
      });
    });
  }

  // ---------------------------------------------------------------- end states
  onPlayerKO() {
    this.continuing = true;
    this.events.emit('continue', true);
  }

  doContinue() {
    this.continuing = false;
    this.score = 0;
    this.player.revive();
    this.player.say(MANE.getUp, 1, true);
    for (const e of this.enemies) e.takeHit({ damage: 0, dir: e.x < this.player.x ? -1 : 1, knockdown: true, knockback: 120, launch: 160 });
    this.events.emit('continue', false);
    this.events.emit('hud');
  }

  gameOver() {
    this.scene.restart();
  }

  stats(): MissionStats {
    return { score: this.score, timeMs: this.elapsed, kos: this.kos, sips: this.player.sipsUsed, cans: this.pickupsTaken, drivers: this.driveOutKOs };
  }
}
