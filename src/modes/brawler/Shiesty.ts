import Phaser from 'phaser';
import { Actor, HitInfo } from './Actor';
import type { BrawlerScene } from './BrawlerScene';
import { FLOOR_TOP, FLOOR_BOTTOM } from '../../core/config';
import { SHIESTY_TALK } from '../../missions/lines';

export type ShiestyKind = 'rusher' | 'thrower';

// O.G. Drive-Out's street crew. Rushers crowd you; throwers keep distance and lob plastic bottles.
export class Shiesty extends Actor {
  kind: ShiestyKind;
  speed: number;
  waitTimer = 0;
  cooldown = 0;
  hasToken = false;
  side: 1 | -1 = 1;
  hitSet = new Set<object>();
  maskOff = false;
  entering = true;
  enterX = 0;
  dazed = 0;
  talked = false;
  scriptControlled = false;
  hurtCount = 0;

  constructor(scene: BrawlerScene, kind: ShiestyKind, x: number, y: number, tex?: string) {
    super(scene, tex ?? (kind === 'thrower' ? 'shiestyGrey' : Phaser.Math.RND.pick(['shiestyRed', 'shiestyGreen'])), x, y, kind === 'thrower' ? 22 : 30);
    this.kind = kind;
    this.name = 'SHIESTY BOY';
    this.speed = kind === 'thrower' ? 46 : Phaser.Math.Between(50, 62);
    this.radius = 10;
    this.cooldown = Phaser.Math.FloatBetween(0.5, 1.4);
    this.play('idle');
  }

  update(dt: number) {
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.scene.player;
    const view = this.scene.viewBounds();

    switch (this.state) {
      case 'idle':
      case 'approach':
      case 'wait': {
        if (this.scriptControlled) { this.vx = this.vy = 0; this.play('idle'); break; }
        const dx = p.x - this.x;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.entering) {
          // walk into the screen first
          const tx = Phaser.Math.Clamp(this.x, view.left + 30, view.right - 30);
          if (Math.abs(tx - this.x) < 4) this.entering = false;
          this.moveToward(tx, this.y, dt, 1.1);
          if (!this.talked && Math.random() < 0.35) { this.talked = true; this.scene.say(this, Phaser.Math.RND.pick(SHIESTY_TALK), 1400); }
          break;
        }
        if (this.kind === 'thrower') this.thinkThrower(dt, view);
        else this.thinkRusher(dt);
        break;
      }
      case 'windup':
        this.vx = this.vy = 0;
        if (this.stateTime > 0.18) this.sprite.setFrame(this.frameOf('punch', 1));
        if (this.stateTime > 0.36) {
          this.setState('attack');
          this.sprite.anims.stop();
          this.sprite.setFrame(this.frameOf('punch', 2));
          this.hitSet.clear();
          this.vx = this.facing * 40;
        }
        break;
      case 'attack': {
        this.vx *= Math.pow(0.001, dt);
        if (this.stateTime < 0.14) {
          const hits = this.scene.hitTest(this, [2, 34], 9, this.hitSet, true);
          for (const t of hits) {
            this.hitSet.add(t);
            t.takeHit({ damage: 8, dir: this.facing, knockback: 70, source: this, kind: 'punch' });
          }
        }
        if (this.stateTime > 0.5) this.endAttack();
        break;
      }
      case 'throwWind':
        this.vx = this.vy = 0;
        if (this.stateTime > 0.25) this.sprite.setFrame(this.frameOf('throw', 1));
        if (this.stateTime > 0.5) {
          this.setState('throwing');
          this.sprite.anims.stop();
          this.sprite.setFrame(this.frameOf('throw', 2));
          this.scene.throwBottle(this);
        }
        break;
      case 'throwing':
        if (this.stateTime > 0.4) this.endAttack();
        break;
      case 'hurt':
        this.vx *= Math.pow(0.01, dt);
        this.vy = 0;
        if (this.stateTime > 0.32) this.backToIdle();
        break;
      case 'dazed':
        this.vx = this.vy = 0;
        this.dazed -= dt;
        if (this.dazed <= 0) this.backToIdle();
        break;
      case 'down':
        this.vx *= Math.pow(0.1, dt);
        if (this.onGround && this.stateTime > 0.3) {
          this.vx = 0;
          this.sprite.setFrame(this.frameOf('knockdown', 1));
          if (this.hp <= 0) { this.setState('dead'); }
          else if (this.stateTime > 1.0) { this.setState('getup'); this.sprite.setFrame(this.frameOf('knockdown', 2)); }
        }
        break;
      case 'getup':
        if (this.stateTime > 0.3) { this.invuln = 0.4; this.backToIdle(); }
        break;
      case 'dead':
        this.sprite.setVisible(Math.floor(this.stateTime * 16) % 2 === 0);
        if (this.stateTime > 0.8) { this.destroy(); this.scene.onEnemyGone(this); }
        break;
      case 'scripted':
        break;
    }
    this.physics(dt);
    if (this.state !== 'scripted' && !this.entering) {
      this.y = Phaser.Math.Clamp(this.y, FLOOR_TOP, FLOOR_BOTTOM);
    }
    if (this.z === 0 && (this.state === 'approach' || this.state === 'wait') && this.scene.inPothole(this) && Math.random() < dt * 3) {
      this.scene.sfx('splash', 0.4);
      this.scene.splash(this.x, this.y);
      this.takeHit({ damage: 3, dir: (-this.facing) as 1 | -1, knockback: 20, kind: 'pothole' });
    }
  }

  frameOf(anim: string, i: number) {
    const a = this.scene.anims.get(`${this.texKey}:${anim}`);
    return a ? Number(a.frames[i].frame.name) : 0;
  }

  moveToward(tx: number, ty: number, dt: number, mul = 1) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { this.vx = this.vy = 0; this.play('idle'); return true; }
    this.vx = (dx / d) * this.speed * mul;
    this.vy = (dy / d) * this.speed * 0.7 * mul;
    this.play('walk');
    void dt;
    return false;
  }

  thinkRusher(dt: number) {
    const p = this.scene.player;
    // pick a side and keep it unless the player crosses over
    if (this.state !== 'approach' && this.state !== 'wait') this.setState('approach');
    const want = this.x < p.x ? -1 : 1;
    this.side = want as 1 | -1;
    const tx = p.x + this.side * 34;
    const ty = p.y + (this.side > 0 ? 2 : -2);
    const dx = tx - this.x, dy = ty - this.y;
    if (this.state === 'approach') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 4) {
        this.setState('wait');
        this.waitTimer = Phaser.Math.FloatBetween(0.2, 0.8);
        this.vx = this.vy = 0;
        this.play('idle');
      } else this.moveToward(tx, ty, dt);
    } else {
      this.waitTimer -= dt;
      this.play('idle');
      if (Math.abs(dx) > 16 || Math.abs(dy) > 8) this.setState('approach');
      else if (this.waitTimer <= 0 && this.cooldown <= 0 && p.alive && p.state !== 'down' && this.scene.requestToken(this)) {
        this.hasToken = true;
        this.setState('windup');
        this.play('punch', false);
        this.sprite.anims.pause();
      } else if (this.waitTimer <= 0) {
        this.waitTimer = Phaser.Math.FloatBetween(0.2, 0.6);
        // shuffle a bit so the crowd feels alive
        this.vx = Phaser.Math.Between(-12, 12);
        this.vy = Phaser.Math.Between(-10, 10);
      }
    }
  }

  thinkThrower(dt: number, view: { left: number; right: number }) {
    const p = this.scene.player;
    const side = this.x < p.x ? -1 : 1;
    let tx = p.x + side * 120;
    if (tx < view.left + 20 || tx > view.right - 20) tx = p.x - side * 120;
    tx = Phaser.Math.Clamp(tx, view.left + 20, view.right - 20);
    const ty = p.y;
    const close = Math.abs(p.x - this.x) < 50 && Math.abs(p.y - this.y) < 14;
    if (close && this.cooldown <= 0 && this.scene.requestToken(this)) {
      // too close: shove
      this.hasToken = true;
      this.setState('windup');
      this.play('punch', false);
      this.sprite.anims.pause();
      return;
    }
    const aligned = Math.abs(ty - this.y) < 6 && Math.abs(tx - this.x) < 30;
    if (aligned && this.cooldown <= 0) {
      this.setState('throwWind');
      this.play('throw', false);
      this.sprite.anims.pause();
      this.scene.sfx('throw', 0.4);
      return;
    }
    this.setState('approach');
    this.moveToward(tx, ty, dt);
  }

  endAttack() {
    if (this.hasToken) { this.scene.releaseToken(this); this.hasToken = false; }
    this.cooldown = this.kind === 'thrower' ? Phaser.Math.FloatBetween(1.6, 2.6) : Phaser.Math.FloatBetween(0.9, 1.8);
    this.backToIdle();
  }

  backToIdle() {
    this.setState('approach');
    this.play('idle', false);
  }

  takeHit(h: HitInfo): boolean {
    if (!this.alive || this.invuln > 0 || ['down', 'getup', 'dead'].includes(this.state)) return false;
    this.entering = false;
    this.scriptControlled = false;
    if (this.hasToken) { this.scene.releaseToken(this); this.hasToken = false; }
    if (h.kind === 'flash') {
      this.setState('dazed');
      this.dazed = 1.8;
      this.play('dazed', false);
      return true;
    }
    this.hp -= h.damage;
    this.facing = (-h.dir) as 1 | -1;
    this.hurtCount++;
    if (h.knockdown || this.hp <= 0) {
      this.setState('down');
      this.sprite.anims.stop();
      this.sprite.setFrame(this.frameOf('knockdown', 0));
      this.vx = h.dir * (h.knockback ?? 120);
      this.vz = h.launch ?? 180;
      this.z = Math.max(this.z, 0.01);
      this.scene.sfx(this.hp <= 0 ? 'ko' : 'grunt', 0.7);
    } else {
      this.setState('hurt');
      this.play('hurt', false);
      this.vx = h.dir * (h.knockback ?? 40);
      this.scene.sfx('grunt', 0.45);
    }
    return true;
  }

  onLand(impact: number) {
    if (this.state === 'down') {
      this.scene.dust(this.x, this.y);
      if (impact < -160) { this.vz = 80; this.z = 0.01; this.scene.sfx('land', 0.5); this.scene.shake(60, 0.002); }
    }
  }
}
