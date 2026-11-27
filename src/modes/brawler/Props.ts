import Phaser from 'phaser';
import type { BrawlerScene, Obstacle } from './BrawlerScene';
import type { HitInfo } from './Actor';
import type { SfxKey } from '../../core/assets';

export type PickupKind = 'can' | 'bbq' | 'wings' | 'bread' | 'dates';

export class Pickup {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  alive = true;
  t = Math.random() * 6;
  z = 0;
  vz = 0;
  constructor(public scene: BrawlerScene, public kind: PickupKind, public x: number, public y: number, pop = false) {
    const tex = kind === 'can' ? 'canPickup' : kind;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.6, 0.7).setAlpha(0.7);
    this.sprite = scene.add.sprite(x, y, tex).setOrigin(0.5, 1);
    if (kind === 'can') this.sprite.play('canPickup:glow');
    if (pop) { this.vz = 170; this.z = 1; }
  }
  update(dt: number) {
    this.t += dt;
    if (this.z > 0 || this.vz > 0) { this.vz -= 700 * dt; this.z += this.vz * dt; if (this.z < 0) { this.z = 0; this.vz = 0; } }
    const bob = this.kind === 'can' ? Math.round(Math.sin(this.t * 4) * 1.5) + 2 : 0;
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y - this.z - bob + 2)).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 1);
  }
  destroy() { this.alive = false; this.sprite.destroy(); this.shadow.destroy(); }
}

export class Car {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Rectangle;
  lights: Phaser.GameObjects.Triangle;
  alive = true;
  hit = new Set<object>();
  radius = 56;
  constructor(public scene: BrawlerScene, tex: string, public x: number, public y: number, public vx: number, headlights = true) {
    this.shadow = scene.add.rectangle(x, y, 116, 8, 0x000000, 0.4);
    this.sprite = scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setFlipX(vx < 0);
    this.sprite.play(tex + ':roll');
    // headlight beam
    this.lights = scene.add.triangle(0, 0, 0, 0, 90, -14, 90, 14, 0xfff6c8, 0.18).setOrigin(0, 0.5).setVisible(headlights);
  }
  update(dt: number) {
    this.x += this.vx * dt;
    const dir = Math.sign(this.vx);
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y + 3)).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 1).setDepth(this.y - 1);
    this.lights.setPosition(this.x + dir * 62, this.y - 14).setScale(dir, 1).setDepth(this.y + 0.5);
  }
  destroy() { this.alive = false; this.sprite.destroy(); this.shadow.destroy(); this.lights.destroy(); }
}

// Breakable trash can: two hits, then it pops out whatever's inside.
export class TrashCan {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  hp = 2;
  alive = true;
  z = 0;
  radius = 9;
  height = 26;
  broken = false;
  constructor(public scene: BrawlerScene, public x: number, public y: number, public drop: PickupKind | null, tex = 'trashCan', private breakSfx: SfxKey = 'crash') {
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.8, 0.8).setDepth(y - 1);
    this.sprite = scene.add.sprite(x, y + 1, tex, 0).setOrigin(0.5, 1).setDepth(y);
    this.solid = scene.addObstacle(x, y, 9, 4);
  }
  solid: Obstacle;
  takeHit(h: HitInfo): boolean {
    if (this.broken) return false;
    this.hp--;
    this.scene.sfx(this.breakSfx, 0.6);
    this.scene.tweens.add({ targets: this.sprite, x: this.x + h.dir * 3, duration: 50, yoyo: true });
    if (this.hp <= 0 || h.knockdown) {
      this.broken = true;
      this.solid.on = false;
      this.sprite.setFrame(1);
      this.scene.tweens.add({ targets: this.sprite, angle: h.dir * 80, x: this.x + h.dir * 14, y: this.y + 2, duration: 220, ease: 'Quad.easeOut' });
      if (this.drop) this.scene.spawnPickup(this.drop, this.x + h.dir * 10, this.y + 2, true);
      this.scene.addScore(20);
      this.scene.time.delayedCall(1500, () => {
        this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, duration: 400, onComplete: () => { this.sprite.destroy(); this.shadow.destroy(); } });
      });
      this.alive = false;
    }
    return true;
  }
}

export class Bottle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  alive = true;
  z = 22;
  radius = 5;
  height = 8;
  t = 0;
  constructor(public scene: BrawlerScene, public x: number, public y: number, public vx: number, tex = 'bottle') {
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.3, 0.5).setAlpha(0.6);
    this.sprite = scene.add.sprite(x, y - this.z, tex).play(tex + ':spin');
  }
  update(dt: number) {
    this.t += dt;
    this.x += this.vx * dt;
    this.z = 22 - this.t * 6;
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y - this.z)).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 1);
  }
  takeHit(_h: HitInfo): boolean {
    this.scene.sfx(this.scene.look.projectile.sfx, 0.6);
    this.scene.spark(this.x, this.y - this.z, this.scene.look.projectile.tint);
    this.scene.addScore(10);
    this.destroy();
    return true;
  }
  destroy() { this.alive = false; this.sprite.destroy(); this.shadow.destroy(); }
}

export interface Pothole { x: number; y: number; w: number; h: number; img: Phaser.GameObjects.Image }
