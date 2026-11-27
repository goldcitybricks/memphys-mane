import Phaser from 'phaser';
import { Actor, HitInfo } from './Actor';
import type { BrawlerScene } from './BrawlerScene';
import { Controls } from '../../core/controls';
import { FLOOR_TOP, FLOOR_BOTTOM, COLORS } from '../../core/config';
import { MANE } from '../../missions/lines';

interface AttackDef {
  anim: string;
  dur: number;
  active: [number, number];
  reach: [number, number];
  damage: number;
  knockback: number;
  knockdown?: boolean;
  launch?: number;
  lunge: number;
  next?: string;
}

const ATTACKS: Record<string, AttackDef> = {
  punch1: { anim: 'punch1', dur: 0.2, active: [0.06, 0.13], reach: [4, 38], damage: 6, knockback: 30, lunge: 50, next: 'punch2' },
  punch2: { anim: 'punch2', dur: 0.22, active: [0.07, 0.15], reach: [4, 42], damage: 7, knockback: 40, lunge: 60, next: 'punch3' },
  punch3: { anim: 'punch3', dur: 0.36, active: [0.09, 0.2], reach: [2, 36], damage: 13, knockback: 150, knockdown: true, launch: 220, lunge: 40 },
};

const SPEED_X = 96;
const SPEED_Y = 60;
const JUMP_V = 290;
export const MANE_MODE_SECONDS = 10;
export const MAX_CANS = 3;

export class Mane extends Actor {
  cans = 0;
  maneMode = 0;
  combo = 'punch1';
  comboTimer = 0;
  attack: AttackDef | null = null;
  hitSet = new Set<object>();
  hitLanded = false;
  kicked = false;
  flexCd = 0;
  idleTime = 0;
  lastSaid = 0;
  locked = false; // cutscenes
  bounds = { left: 0, right: 384 };
  private glow: Phaser.FX.Glow | null = null;
  private afterTimer = 0;
  private potholeCd = 0;
  sipsUsed = 0;

  constructor(scene: BrawlerScene, x: number, y: number) {
    super(scene, 'mane', x, y, 100);
    this.radius = 11;
    this.name = 'MANE';
    this.play('idle');
  }

  get inManeMode() { return this.maneMode > 0; }
  get canAct() { return this.alive && !this.locked && (this.state === 'idle' || this.state === 'walk'); }

  say(line: string, chance = 1, force = false) {
    const now = this.scene.time.now;
    if (!force && (now - this.lastSaid < 2600 || Math.random() > chance)) return;
    this.lastSaid = now;
    this.scene.say(this, line, 1700);
  }

  update(dt: number) {
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.flexCd = Math.max(0, this.flexCd - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.potholeCd = Math.max(0, this.potholeCd - dt);
    if (this.comboTimer <= 0) this.combo = 'punch1';

    if (this.maneMode > 0) {
      this.maneMode -= dt;
      this.afterTimer -= dt;
      if (this.afterTimer <= 0 && (Math.abs(this.vx) > 20 || this.state === 'attack')) {
        this.afterTimer = 0.05;
        this.scene.afterimage(this.sprite);
      }
      if (this.maneMode <= 0) this.endManeMode();
    }

    const sp = this.inManeMode ? 1.3 : 1;
    const mx = this.locked ? 0 : Controls.moveX;
    const my = this.locked ? 0 : Controls.moveY;

    switch (this.state) {
      case 'idle':
      case 'walk': {
        if (!this.locked) {
          if (Controls.consume('sip')) { if (this.trySip()) break; }
          if (Controls.consume('flex') && this.flexCd <= 0) { this.startFlex(); break; }
          if (Controls.consume('attack')) { this.startAttack(); break; }
          if (Controls.consume('jump')) { this.startJump(); break; }
        }
        const tx = mx * SPEED_X * sp, ty = my * SPEED_Y * sp;
        const k = Math.min(1, dt * 16);
        this.vx += (tx - this.vx) * k;
        this.vy += (ty - this.vy) * k;
        if (Math.abs(mx) > 0.2) this.facing = mx > 0 ? 1 : -1;
        const moving = Math.abs(mx) > 0.15 || Math.abs(my) > 0.15;
        if (moving) {
          this.idleTime = 0;
          if (this.state !== 'walk') this.setState('walk');
          this.play('walk');
          this.sprite.anims.timeScale = sp * (0.6 + 0.5 * Math.max(Math.abs(mx), Math.abs(my)));
        } else {
          this.idleTime += dt;
          if (this.state !== 'idle') this.setState('idle');
          this.sprite.anims.timeScale = 1;
          // stand still for 3 seconds and the grill shines
          if (this.idleTime > 3 && !this.locked) {
            this.idleTime = -2;
            this.play('shine', false);
            this.scene.sfx('shine', 0.4);
            this.sprite.once('animationcomplete', () => { if (this.state === 'idle') this.play(this.inManeMode ? 'idleShades' : 'idle'); });
          } else if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim?.key.endsWith(':walk')) {
            this.play(this.inManeMode ? 'idleShades' : 'idle');
          }
        }
        break;
      }
      case 'jump': {
        const tx = mx * SPEED_X * sp, ty = my * SPEED_Y * sp * 0.6;
        this.vx += (tx - this.vx) * Math.min(1, dt * 5);
        this.vy += (ty - this.vy) * Math.min(1, dt * 5);
        if (!this.kicked && Controls.consume('attack')) {
          this.kicked = true;
          this.hitSet.clear();
          this.play('kick', false);
          this.scene.sfx('whiff', 0.5);
        }
        if (this.kicked) {
          this.activeHit({ anim: 'kick', dur: 0, active: [0, 9], reach: [6, 44], damage: 12, knockback: 140, knockdown: true, launch: 180, lunge: 0 }, true);
        } else {
          this.sprite.setFrame(this.vz > 90 ? 10 : this.vz > -90 ? 11 : 12);
        }
        break;
      }
      case 'attack': {
        const a = this.attack!;
        this.vx *= Math.pow(0.0005, dt);
        this.vy *= Math.pow(0.0005, dt);
        this.activeHit(a, false);
        if (this.stateTime >= a.dur / sp) {
          if (Controls.peek('attack', 260) && a.next) {
            Controls.consume('attack', 260);
            this.combo = a.next;
            this.startAttack();
          } else {
            this.combo = a.next ?? 'punch1';
            this.comboTimer = a.next ? 0.45 : 0;
            this.toIdle();
          }
        }
        break;
      }
      case 'hurt':
        this.vx *= Math.pow(0.01, dt);
        this.vy = 0;
        if (this.stateTime > 0.32) this.toIdle();
        break;
      case 'down':
        this.vx *= Math.pow(0.05, dt);
        if (this.onGround && this.stateTime > 0.25) {
          this.vx = 0;
          if (this.hp <= 0) {
            if (this.stateTime > 0.9) { this.setState('ko'); this.scene.onPlayerKO(); }
          } else if (this.stateTime > 0.75) {
            this.setState('getup');
            this.sprite.setFrame(29);
          }
        }
        break;
      case 'getup':
        if (this.stateTime > 0.15) this.sprite.setFrame(30);
        if (this.stateTime > 0.35) {
          this.invuln = 1.4;
          this.toIdle();
          this.say(MANE.getUp, 0.6);
        }
        break;
      case 'sip':
        this.vx = this.vy = 0;
        if (this.stateTime > 0.3 && !(this as any)._sipFlash) {
          (this as any)._sipFlash = true;
          this.scene.sfx('sip', 0.8);
        }
        if (this.stateTime > 0.55 && !(this as any)._sipFreeze) {
          (this as any)._sipFreeze = true;
          this.scene.sfx('maneMode', 0.8);
          this.scene.freezeFrame(320, COLORS.gold);
          this.startManeMode();
          this.say(MANE.super, 1, true);
        }
        if (this.stateTime > 0.95) this.toIdle();
        break;
      case 'flex':
        this.vx = this.vy = 0;
        if (this.stateTime > 0.12 && !(this as any)._flexed) {
          (this as any)._flexed = true;
          this.scene.grillFlash(this);
        }
        if (this.stateTime > 0.55) this.toIdle();
        break;
      case 'cutscene':
        break;
      case 'ko':
        break;
    }

    // clamp to the floor band and the current screen
    this.physics(dt);
    if (this.y < FLOOR_TOP) { this.y = FLOOR_TOP; this.vy = Math.max(0, this.vy); }
    if (this.y > FLOOR_BOTTOM) { this.y = FLOOR_BOTTOM; this.vy = Math.min(0, this.vy); }
    if (this.state !== 'cutscene') this.x = Phaser.Math.Clamp(this.x, this.bounds.left + 12, this.bounds.right - 12);

    // potholes trip you up (jump them)
    if (this.z === 0 && this.potholeCd <= 0 && (this.state === 'walk' || this.state === 'idle') && this.scene.inPothole(this)) {
      this.potholeCd = 1.2;
      this.scene.sfx('splash', 0.7);
      this.scene.splash(this.x, this.y);
      this.takeHit({ damage: 4, dir: (-this.facing) as 1 | -1, kind: 'pothole', knockback: 30 });
    }

    const scale = this.inManeMode ? 1.2 : 1;
    this.sprite.setScale(scale);
  }

  toIdle() {
    this.attack = null;
    this.kicked = false;
    this.setState('idle');
    this.sprite.anims.timeScale = 1;
    this.play(this.inManeMode ? 'idleShades' : 'idle', false);
  }

  startAttack() {
    const a = ATTACKS[this.combo] ?? ATTACKS.punch1;
    this.attack = a;
    this.hitSet.clear();
    this.hitLanded = false;
    this.setState('attack');
    // let a held direction turn him around
    if (Math.abs(Controls.moveX) > 0.3) this.facing = Controls.moveX > 0 ? 1 : -1;
    const sp = this.inManeMode ? 1.3 : 1;
    this.sprite.anims.timeScale = sp;
    this.play(a.anim, false);
    this.vx = this.facing * a.lunge;
    this.scene.sfx('whiff', 0.35);
  }

  activeHit(a: AttackDef, airborne: boolean) {
    const t = this.stateTime * (this.inManeMode ? 1.3 : 1);
    if (!airborne && (t < a.active[0] || t > a.active[1])) return;
    const mm = this.inManeMode;
    const reach = mm ? [a.reach[0], a.reach[1] * 1.25] : a.reach;
    const hits = this.scene.hitTest(this, reach as [number, number], mm ? 14 : 11, this.hitSet);
    for (const target of hits) {
      this.hitSet.add(target);
      const knock = !!a.knockdown || (mm && a.anim !== 'punch1');
      const info: HitInfo = {
        damage: Math.round(a.damage * (mm ? 2 : 1)),
        dir: this.facing,
        knockdown: knock,
        knockback: a.knockback * (mm ? 1.4 : 1),
        launch: a.launch ?? (knock ? 160 : 0),
        heavy: knock,
        source: this,
        kind: 'punch',
      };
      const landed = target.takeHit(info);
      if (landed) {
        this.hitLanded = true;
        this.scene.onPlayerHit(this, target, info);
      }
    }
  }

  startJump() {
    this.setState('jump');
    this.vz = JUMP_V * (this.inManeMode ? 1.1 : 1);
    this.z = 0.01;
    this.kicked = false;
    this.play('jump', false);
    this.sprite.anims.stop();
    this.sprite.setFrame(10);
    this.scene.sfx('jump', 0.5);
    this.scene.dust(this.x, this.y);
  }

  onLand(impact: number) {
    if (this.state === 'jump') {
      this.scene.sfx('land', 0.5);
      this.scene.dust(this.x - 6, this.y); this.scene.dust(this.x + 6, this.y);
      this.toIdle();
      // squash on landing
      this.scene.tweens.add({ targets: this.sprite, scaleY: { from: this.sprite.scaleY * 0.8, to: this.sprite.scaleY }, duration: 120 });
    } else if (this.state === 'down') {
      if (impact < -150) { this.vz = 90; this.z = 0.01; this.scene.sfx('land', 0.6); this.scene.dust(this.x, this.y); }
    }
  }

  trySip(): boolean {
    if (this.cans <= 0 || this.inManeMode) {
      if (this.cans <= 0) this.scene.toast('NO CANS. FIND A MEMPHYS!');
      return false;
    }
    this.cans--;
    this.sipsUsed++;
    this.setState('sip');
    (this as any)._sipFlash = false;
    (this as any)._sipFreeze = false;
    this.invuln = 1.2;
    this.play('sip', false);
    this.scene.events.emit('hud');
    return true;
  }

  startManeMode() {
    this.maneMode = MANE_MODE_SECONDS;
    this.hp = Math.min(this.maxHp, this.hp + 15);
    if (this.sprite.preFX && !this.glow) this.glow = this.sprite.preFX.addGlow(COLORS.gold, 3, 0, false, 0.1, 10);
    this.scene.events.emit('maneMode', true);
  }

  endManeMode() {
    this.maneMode = 0;
    if (this.glow) { this.sprite.preFX?.remove(this.glow); this.glow = null; }
    this.scene.events.emit('maneMode', false);
    if (this.state === 'idle') this.play('idle', false);
  }

  startFlex() {
    this.flexCd = 3;
    this.setState('flex');
    (this as any)._flexed = false;
    this.play(this.inManeMode ? 'victory' : 'shine', false);
    this.say(Math.random() < 0.5 ? MANE.taunt : MANE.goofy, 1, true);
  }

  takeHit(h: HitInfo): boolean {
    if (!this.alive || this.invuln > 0 || this.state === 'down' || this.state === 'getup' || this.state === 'ko' || this.state === 'cutscene') return false;
    if (this.state === 'sip') return false;
    const dmg = this.inManeMode ? Math.ceil(h.damage * 0.5) : h.damage;
    this.hp = Math.max(0, this.hp - dmg);
    this.scene.events.emit('hud');
    this.scene.sfx('tonk', 0.8);
    this.facing = (-h.dir) as 1 | -1;
    this.attack = null;
    if (h.knockdown || this.hp <= 0) {
      this.setState('down');
      this.sprite.anims.stop();
      this.sprite.setFrame(27);
      this.vx = h.dir * (h.knockback ?? 120);
      this.vz = h.launch ?? 200;
      this.z = 0.01;
      this.scene.time.delayedCall(260, () => { if (this.state === 'down') this.sprite.setFrame(28); });
      this.scene.shake(160, 0.006);
      if (this.hp > 0) this.say(MANE.hitHard, 0.8);
    } else {
      this.setState('hurt');
      this.play('hurt', false);
      this.vx = h.dir * (h.knockback ?? 60);
      this.invuln = 0.5;
      this.scene.shake(80, 0.003);
      if (Math.random() < 0.25) this.say(MANE.hitHard, 1);
    }
    return true;
  }

  revive() {
    this.hp = this.maxHp;
    this.alive = true;
    this.invuln = 2.5;
    this.cans = Math.max(this.cans, 1);
    this.setState('getup');
    this.sprite.setFrame(30);
    this.scene.events.emit('hud');
  }
}
