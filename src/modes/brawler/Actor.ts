import Phaser from 'phaser';
import type { BrawlerScene } from './BrawlerScene';

export const GRAVITY = 900;

// Belt-scroller body: x along the street, y = depth on the floor, z = height above it.
export abstract class Actor {
  x: number; y: number; z = 0;
  vx = 0; vy = 0; vz = 0;
  facing: 1 | -1 = 1;
  hp: number; maxHp: number;
  state = 'idle';
  stateTime = 0;
  invuln = 0;
  alive = true;
  radius = 10; // half-width of the body for hit tests
  height = 40;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  texKey: string;
  name = '';

  constructor(public scene: BrawlerScene, tex: string, x: number, y: number, hp: number) {
    this.texKey = tex;
    this.x = x; this.y = y;
    this.hp = this.maxHp = hp;
    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.5).setAlpha(0.9);
    this.sprite = scene.add.sprite(x, y, tex, 0).setOrigin(0.5, 61 / 64);
  }

  setState(s: string) { this.state = s; this.stateTime = 0; }

  play(anim: string, ignoreIfPlaying = true) {
    this.sprite.play(`${this.texKey}:${anim}`, ignoreIfPlaying);
  }

  setTexture(tex: string) {
    const anim = this.sprite.anims.currentAnim?.key.split(':')[1];
    this.texKey = tex;
    this.sprite.setTexture(tex);
    if (anim) this.play(anim, false);
  }

  floor = 0; // height of whatever is under the feet (a picnic table top, or the street)

  get onGround() { return this.z <= this.floor + 0.01 && this.vz <= 0; }

  physics(dt: number) {
    const px = this.x, py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // solid props (tables, jars, stalls): slide along them instead of walking through.
    // If we somehow started inside one, let us walk out.
    if (this.scene.solidAt(this.x, this.y, this.z) && !this.scene.solidAt(px, py, this.z)) {
      if (!this.scene.solidAt(this.x, py, this.z)) this.y = py;
      else if (!this.scene.solidAt(px, this.y, this.z)) this.x = px;
      else { this.x = px; this.y = py; }
    }
    this.floor = this.scene.floorAt(this.x, this.y);
    if (this.z > this.floor || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= this.floor) { this.z = this.floor; const v = this.vz; this.vz = 0; this.onLand(v); }
    } else if (this.z < this.floor) this.z = this.floor;
  }

  onLand(_impact: number) { /* override */ }

  render() {
    const s = this.sprite;
    s.setPosition(Math.round(this.x), Math.round(this.y - this.z));
    s.setFlipX(this.facing < 0);
    s.setDepth(this.y + (this.z > 0.5 ? 7 : 0));
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y - this.floor));
    const k = Math.max(0.45, 1 - (this.z - this.floor) / 90);
    this.shadow.setScale(k * (this.radius / 10) * s.scaleX, k).setDepth(this.floor > 0 ? this.y + 6.5 : this.y - 0.5);
    this.shadow.setVisible(s.visible);
    if (this.invuln > 0 && this.alive) s.setAlpha(Math.floor(this.invuln * 20) % 2 ? 0.45 : 1);
    else s.setAlpha(1);
  }

  destroy() {
    this.alive = false;
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

export interface HitInfo {
  damage: number;
  dir: 1 | -1;
  knockdown?: boolean;
  knockback?: number;
  launch?: number;
  heavy?: boolean;
  source?: Actor | null;
  kind?: 'punch' | 'car' | 'bottle' | 'pothole' | 'flash';
}
