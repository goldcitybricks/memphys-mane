import Phaser from 'phaser';
import { HitInfo } from './Actor';
import { Shiesty } from './Shiesty';
import type { BrawlerScene } from './BrawlerScene';
import { COLORS } from '../../core/config';

// Mission 2 boss. Fights like a big spear guard, plus three tricks:
// a telegraphed charge across the arena, a howl that calls two guards, and a fake surrender.
export class JackalCaptain extends Shiesty {
  private plan = 2.2; // seconds until the next special move
  private howled = [false, false];
  private bowed = false;
  private poise = 0;
  private dashHit = new Set<object>();
  onHowl: () => void = () => {};
  onBow: () => void = () => {};
  onSay: (line: string) => void = () => {};
  ko = false;

  constructor(scene: BrawlerScene, x: number, y: number) {
    super(scene, 'rusher', x, y, 'jackalCaptain');
    this.hp = this.maxHp = 300;
    this.name = 'JACKAL CAPTAIN';
    this.radius = 13;
    this.speed = 58;
    this.punchDamage = 11;
    this.entering = false;
    this.sprite.setScale(1.3);
  }

  thinkRusher(dt: number) {
    const p = this.scene.player;
    this.plan -= dt;
    const frac = this.hp / this.maxHp;
    if (!this.howled[0] && frac < 0.7) { this.howled[0] = true; return this.startHowl(); }
    if (!this.bowed && frac < 0.5) { this.bowed = true; return this.startBow(); }
    if (!this.howled[1] && frac < 0.3) { this.howled[1] = true; return this.startHowl(); }
    if (this.plan <= 0 && p.alive && p.state !== 'down') {
      this.plan = Phaser.Math.FloatBetween(3.2, 5.0) * (frac < 0.4 ? 0.75 : 1);
      return this.startDashWind();
    }
    // otherwise he swings like a guard, but never waits for an attack token
    super.thinkRusher(dt);
  }

  private startDashWind() {
    this.setState('dashWind');
    this.facing = this.scene.player.x >= this.x ? 1 : -1;
    // line up with the player's lane first
    this.y = Phaser.Math.Linear(this.y, this.scene.player.y, 0.6);
    this.play('dash', false);
    this.sprite.anims.stop();
    this.sprite.setFrame(this.frameOf('dash', 0));
    this.scene.sfx('clang', 0.6);
    this.scene.say(this, '!', 600);
  }

  private startHowl() {
    this.setState('howl');
    this.play('howl', false);
    this.scene.sfx('howl', 0.8);
    this.scene.shake(300, 0.004);
    this.onSay(Phaser.Math.RND.pick(['GUARDS! TO ME!', 'AROOOO!']));
    this.onHowl();
  }

  private startBow() {
    this.setState('bow');
    this.play('bow', false);
    this.onBow();
  }

  update(dt: number) {
    if (this.ko) { this.render(); return; }
    switch (this.state) {
      case 'dashWind':
        this.stateTime += dt;
        this.vx = this.vy = 0;
        // flash white so it reads on a phone
        this.sprite.setTintFill(Math.floor(this.stateTime * 12) % 2 ? 0xffffff : 0xff6a4a);
        if (this.stateTime > 0.7) {
          this.sprite.clearTint();
          this.setState('dash');
          this.dashHit.clear();
          this.play('dash', false);
          this.scene.sfx('whiff', 0.7);
        }
        this.physics(dt);
        return;
      case 'dash': {
        this.stateTime += dt;
        this.vx = this.facing * 270; this.vy = 0;
        if (Math.floor(this.stateTime * 30) % 2 === 0) this.scene.afterimage(this.sprite);
        const hits = this.scene.hitTest(this, [-6, 30], 12, this.dashHit, true);
        for (const t of hits) {
          this.dashHit.add(t);
          if (t.takeHit({ damage: 15, dir: this.facing, knockdown: true, knockback: 200, launch: 230, heavy: true, source: this, kind: 'punch' })) {
            this.scene.sfx('punchHeavy', 0.9);
            this.scene.spark(t.x, t.y - 24, COLORS.white);
          }
        }
        const v = this.scene.viewBounds();
        if (this.stateTime > 1.1 || (this.facing > 0 && this.x > v.right - 24) || (this.facing < 0 && this.x < v.left + 24)) {
          this.setState('dashEnd');
          this.vx = 0;
          this.play('idle', false);
          this.scene.dust(this.x, this.y);
        }
        this.physics(dt);
        return;
      }
      case 'dashEnd':
        // out of breath: the opening
        this.stateTime += dt;
        this.vx *= Math.pow(0.01, dt);
        this.play('dazed');
        if (this.stateTime > 1.1) this.backToIdle();
        this.physics(dt);
        return;
      case 'howl':
        this.stateTime += dt;
        this.vx = this.vy = 0;
        if (this.stateTime > 1.3) this.backToIdle();
        this.physics(dt);
        return;
      case 'bow':
        this.stateTime += dt;
        this.vx = this.vy = 0;
        if (this.stateTime > 1.8) {
          // the fake-out: straight into a swing
          this.facing = this.scene.player.x >= this.x ? 1 : -1;
          this.setState('windup');
          this.hasToken = false;
          this.play('punch', false);
          this.sprite.anims.pause();
        }
        this.physics(dt);
        return;
    }
    super.update(dt);
    if (this.state === 'dead') {
      // stays down for the ending instead of blinking away
      this.ko = true;
      this.sprite.setVisible(true);
      this.sprite.setFrame(this.frameOf('knockdown', 1));
    }
  }

  takeHit(h: HitInfo): boolean {
    if (this.ko || !this.alive) return false;
    const armored = this.state === 'dash' || this.state === 'howl' || this.state === 'dashWind';
    if (h.kind === 'flash') {
      if (armored) return false;
      const ok = super.takeHit(h);
      this.dazed = 1.0;
      return ok;
    }
    if (h.kind === 'car') h = { ...h, damage: 25 };
    if (armored && this.hp - h.damage > 0) {
      // super armor: takes the damage, keeps coming
      if (this.invuln > 0) return false;
      this.hp -= h.damage;
      this.invuln = 0.08;
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(60, () => { if (this.state === 'dashWind') return; this.sprite.clearTint(); });
      this.scene.sfx('clang', 0.4);
      return true;
    }
    // only every third heavy hit knocks him down
    if (h.knockdown && this.hp - h.damage > 0) {
      this.poise++;
      if (this.poise % 3 !== 0) h = { ...h, knockdown: false, knockback: (h.knockback ?? 60) * 0.4 };
    }
    this.sprite.clearTint();
    return super.takeHit(h);
  }
}
