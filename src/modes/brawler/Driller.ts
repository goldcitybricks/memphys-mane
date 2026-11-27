import Phaser from 'phaser';
import { HitInfo } from './Actor';
import { Shiesty } from './Shiesty';
import type { BrawlerScene } from './BrawlerScene';
import { COLORS } from '../../core/config';

// Mission 6 boss: AetherCorp's walking drill mech, a contractor in the cab. Big and slow, with four moves:
// a telegraphed drill jab, a charge across the lane that leaves it overheated (the opening: hits land harder),
// a slam that sends a shockwave along the floor and shakes rocks loose (jump the wave, step out of the shadows),
// and a call for the crew at 2/3 and 1/3 health. Charges, slams and calls have super armor.
export class Driller extends Shiesty {
  private plan = 2.4;
  private called = [false, false];
  private poise = 0;
  private hit = new Set<object>();
  private moves = 0;
  onSlam: (x: number, y: number) => void = () => {};
  onCall: () => void = () => {};
  onOverheat: () => void = () => {};
  onSay: (line: string) => void = () => {};
  ko = false;

  constructor(scene: BrawlerScene, x: number, y: number) {
    super(scene, 'rusher', x, y, 'driller');
    this.hp = this.maxHp = 380;
    this.name = 'THE DRILLER';
    this.radius = 22;
    this.speed = 44;
    this.entering = false;
    this.bubbleH = 74;
    this.sprite.setScale(1.3);
  }

  private get armored() { return ['chargeWind', 'charge', 'slamWind', 'slam', 'call'].includes(this.state); }

  thinkRusher(dt: number) {
    const p = this.scene.player;
    this.plan -= dt;
    const frac = this.hp / this.maxHp;
    if (!this.called[0] && frac < 0.66) { this.called[0] = true; return this.start('call'); }
    if (!this.called[1] && frac < 0.33) { this.called[1] = true; return this.start('call'); }
    if (this.plan <= 0 && p.alive && p.state !== 'down') {
      this.plan = Phaser.Math.FloatBetween(3.4, 5.0) * (frac < 0.4 ? 0.75 : 1);
      this.moves++;
      const far = Math.abs(p.x - this.x) > 110;
      return this.start(far || this.moves % 2 === 1 ? 'chargeWind' : 'slamWind');
    }
    // keep a drill's length away and jab
    const v = this.scene.viewBounds();
    let side = this.x < p.x ? -1 : 1;
    let tx = p.x + side * 64;
    if (tx < v.left + 40 || tx > v.right - 40) { side = -side; tx = p.x + side * 64; }
    tx = Phaser.Math.Clamp(tx, v.left + 40, v.right - 40);
    const ty = p.y;
    if (this.state === 'idle') this.setState('approach');
    if (Math.abs(tx - this.x) < 8 && Math.abs(ty - this.y) < 5) {
      this.vx = this.vy = 0;
      this.facing = p.x >= this.x ? 1 : -1;
      this.play('idle');
      if (this.cooldown <= 0 && p.alive && p.state !== 'down') this.start('jabWind');
    } else {
      this.moveToward(tx, ty, dt);
      this.facing = p.x >= this.x ? 1 : -1;
    }
  }

  private start(s: string) {
    const p = this.scene.player;
    this.setState(s);
    this.vx = this.vy = 0;
    this.hit.clear();
    this.facing = p.x >= this.x ? 1 : -1;
    switch (s) {
      case 'jabWind': this.play('punch', false); this.sprite.anims.stop(); this.sprite.setFrame(this.frameOf('punch', 0)); break;
      case 'chargeWind':
        this.play('dash', false); this.sprite.anims.stop(); this.sprite.setFrame(this.frameOf('dash', 0));
        this.scene.sfx('drill', 0.7); this.scene.say(this, '!', 700);
        if (Math.random() < 0.5) this.onSay(Phaser.Math.RND.pick(['OUTTA THE WAY!', 'DIG! DIG! DIG!']));
        break;
      case 'slamWind':
        this.play('slam', false); this.sprite.anims.stop(); this.sprite.setFrame(this.frameOf('slam', 0));
        this.scene.sfx('drill', 0.5); this.onSay('GROUND\'S COMIN\' DOWN!');
        break;
      case 'call': this.play('idle', false); this.onSay('CREW! I NEED BACKUP DOWN HERE!'); this.onCall(); break;
    }
  }

  private recover(cd: number) {
    this.sprite.clearTint();
    this.cooldown = cd;
    this.setState('approach');
    this.play('idle', false);
  }

  update(dt: number) {
    if (this.ko) { this.render(); return; }
    const custom = ['jabWind', 'jab', 'jabEnd', 'chargeWind', 'charge', 'overheat', 'slamWind', 'slam', 'slamEnd', 'call'];
    if (!custom.includes(this.state)) {
      super.update(dt);
      if (this.state === 'dead') {
        // stays down for the ending instead of blinking away
        this.ko = true;
        this.sprite.setVisible(true).clearTint();
        this.sprite.setFrame(this.frameOf('knockdown', 1));
      }
      return;
    }
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const t = this.stateTime;
    switch (this.state) {
      case 'jabWind':
        this.vx = this.vy = 0;
        if (t > 0.25) this.sprite.setFrame(this.frameOf('punch', 1));
        if (t > 0.3) this.sprite.setTintFill(Math.floor(t * 14) % 2 ? 0xffffff : 0xff9a3a);
        if (t > 0.55) { this.sprite.clearTint(); this.setState('jab'); this.sprite.setFrame(this.frameOf('punch', 2)); this.scene.sfx('drill', 0.6); this.vx = this.facing * 50; }
        break;
      case 'jab': {
        this.vx *= Math.pow(0.01, dt);
        if (t < 0.2) for (const h of this.scene.hitTest(this, [14, 74], 12, this.hit, true)) {
          this.hit.add(h);
          if (h.takeHit({ damage: 12, dir: this.facing, knockback: 120, heavy: true, source: this, kind: 'punch' })) this.scene.spark(h.x, h.y - 24, COLORS.white);
        }
        if (t > 0.5) this.recover(Phaser.Math.FloatBetween(1.0, 1.8));
        break;
      }
      case 'chargeWind': {
        this.vx = 0;
        // line up with the player's lane while it revs
        this.vy = (this.scene.player.y - this.y) * 2.5;
        this.sprite.setTintFill(Math.floor(t * 12) % 2 ? 0xffffff : 0xff6a4a);
        this.sprite.setFrame(this.frameOf('dash', Math.floor(t * 16) % 2));
        if (t > 0.8) { this.sprite.clearTint(); this.vy = 0; this.setState('charge'); this.play('dash', false); this.scene.sfx('whiff', 0.7); }
        break;
      }
      case 'charge': {
        this.vx = this.facing * 240; this.vy = 0;
        if (Math.floor(t * 30) % 2 === 0) this.scene.afterimage(this.sprite);
        for (const h of this.scene.hitTest(this, [-14, 70], 14, this.hit, true)) {
          this.hit.add(h);
          if (h.takeHit({ damage: 16, dir: this.facing, knockdown: true, knockback: 210, launch: 240, heavy: true, source: this, kind: 'punch' })) {
            this.scene.sfx('punchHeavy', 0.9); this.scene.spark(h.x, h.y - 24, COLORS.white);
          }
        }
        // crew in the way get bowled over too
        for (const e of this.scene.enemies) if (e !== this && e.alive && !this.hit.has(e) && Math.abs(e.x - this.x) < 50 && Math.abs(e.y - this.y) < 14) {
          this.hit.add(e); e.takeHit({ damage: 30, dir: this.facing, knockdown: true, knockback: 200, launch: 220, kind: 'car' });
        }
        const v = this.scene.viewBounds();
        if (t > 1.3 || (this.facing > 0 && this.x > v.right - 44) || (this.facing < 0 && this.x < v.left + 44)) {
          this.vx = 0;
          this.setState('overheat');
          this.play('dazed', false);
          this.scene.dust(this.x + this.facing * 30, this.y);
          this.scene.shake(140, 0.005);
          this.scene.sfx('piston', 0.6);
          this.onOverheat();
        }
        break;
      }
      case 'overheat':
        // steam pouring off it: the opening
        this.vx *= Math.pow(0.01, dt); this.vy = 0;
        if (t > 1.9) this.recover(0.6);
        break;
      case 'slamWind':
        this.vx = this.vy = 0;
        this.sprite.setFrame(this.frameOf('slam', t > 0.35 ? 1 : 0));
        if (t > 0.4) this.sprite.setTintFill(Math.floor(t * 14) % 2 ? 0xffffff : 0xff9a3a);
        if (t > 0.75) {
          this.sprite.clearTint();
          this.setState('slam');
          this.sprite.setFrame(this.frameOf('slam', 2));
          this.scene.sfx('punchHeavy', 1); this.scene.sfx('rumble', 0.9);
          this.scene.shake(300, 0.01);
          this.scene.dust(this.x + this.facing * 60, this.y);
          this.onSlam(this.x + this.facing * 60, this.y);
        }
        break;
      case 'slam':
        this.vx = this.vy = 0;
        if (t > 0.9) this.recover(0.8);
        break;
      case 'call':
        this.vx = this.vy = 0;
        if (t > 1.1) this.recover(0.5);
        break;
    }
    this.physics(dt);
    this.y = Phaser.Math.Clamp(this.y, 160, 206);
  }

  takeHit(h: HitInfo): boolean {
    if (this.ko || !this.alive) return false;
    if (h.kind === 'pothole') return false;
    if (h.kind === 'flash') {
      if (this.armored || this.state === 'overheat') return false;
      const ok = super.takeHit(h);
      this.dazed = 1.0;
      return ok;
    }
    if (h.kind === 'car') h = { ...h, damage: 25 };
    if (this.state === 'overheat') {
      // overheated: hits land half again as hard and don't knock it out of the steam
      if (this.invuln > 0) return false;
      const dmg = Math.ceil(h.damage * 1.5);
      if (this.hp - dmg > 0) {
        this.hp -= dmg;
        this.invuln = 0.06;
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => { if (!this.ko) this.sprite.clearTint(); });
        this.scene.sfx('clang', 0.5);
        return true;
      }
      h = { ...h, damage: dmg };
    }
    if (this.armored && this.hp - h.damage > 0) {
      if (this.invuln > 0) return false;
      this.hp -= h.damage;
      this.invuln = 0.08;
      if (this.state !== 'chargeWind' && this.state !== 'slamWind') {
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => { if (this.state === 'chargeWind' || this.state === 'slamWind' || this.ko) return; this.sprite.clearTint(); });
      }
      this.scene.sfx('clang', 0.4);
      return true;
    }
    // only every third heavy hit knocks it over
    if (h.knockdown && this.hp - h.damage > 0) {
      this.poise++;
      if (this.poise % 3 !== 0) h = { ...h, knockdown: false, knockback: (h.knockback ?? 60) * 0.3 };
    }
    this.sprite.clearTint();
    return super.takeHit(h);
  }
}
