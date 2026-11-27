import Phaser from 'phaser';
import { HitInfo } from './Actor';
import { Shiesty } from './Shiesty';
import type { BrawlerScene } from './BrawlerScene';
import { COLORS } from '../../core/config';

// Mission 10 boss: the Pharaoh of DeNile (Victor, GigaZ and the golden jar, fused). Big, slow, and loud about it:
// - a crook swipe with a long reach (it flashes blue before it swings),
// - a flail slam that sends a ring along the floor (jump it) and rains crushed bottles (step out of the shadows),
//   and leaves the flail stuck in the sand: the opening, hits land half again as hard,
// - a drain beam out of the jar down one lane (the lane lights up first: get out of it), which steals a can,
// - calls for more Pips at 80% and 55%.
// At 30% it stops fighting fair: the mission takes over (the drain, then "Memphis, remember!").
export class Pharaoh extends Shiesty {
  private plan = 2.2;
  private called = [false, false];
  private hit = new Set<object>();
  private moves = 0;
  onSlam: (x: number, y: number) => void = () => {};
  onCall: () => void = () => {};
  onStuck: () => void = () => {};
  onBeamWarn: (y: number) => void = () => {};
  onBeam: (y: number) => void = () => {};
  onSay: (line: string) => void = () => {};
  onFinale: () => void = () => {};
  finale = false;
  beamY = 0;
  readonly floorHp: number;

  constructor(scene: BrawlerScene, x: number, y: number) {
    super(scene, 'rusher', x, y, 'pharaoh');
    this.hp = this.maxHp = 440;
    this.floorHp = Math.round(this.maxHp * 0.3);
    this.name = 'THE PHARAOH OF DENILE';
    this.radius = 22;
    this.speed = 40;
    this.entering = false;
    this.bubbleH = 118;
  }

  private get armored() { return ['slamWind', 'slam', 'beamWind', 'beam', 'call'].includes(this.state); }

  thinkRusher(dt: number) {
    if (this.finale) return;
    const p = this.scene.player;
    this.plan -= dt;
    const frac = this.hp / this.maxHp;
    if (!this.called[0] && frac < 0.8) { this.called[0] = true; return this.start('call'); }
    if (!this.called[1] && frac < 0.55) { this.called[1] = true; return this.start('call'); }
    if (this.plan <= 0 && p.alive && p.state !== 'down') {
      this.plan = Phaser.Math.FloatBetween(3.0, 4.4) * (frac < 0.5 ? 0.8 : 1);
      this.moves++;
      return this.start(this.moves % 3 === 2 ? 'beamWind' : 'slamWind');
    }
    // keep a crook's length away and swipe
    const v = this.scene.viewBounds();
    let side = this.x < p.x ? -1 : 1;
    let tx = p.x + side * 62;
    if (tx < v.left + 40 || tx > v.right - 40) { side = -side; tx = p.x + side * 62; }
    tx = Phaser.Math.Clamp(tx, v.left + 40, v.right - 40);
    const ty = p.y;
    if (this.state === 'idle') this.setState('approach');
    if (Math.abs(tx - this.x) < 8 && Math.abs(ty - this.y) < 5) {
      this.vx = this.vy = 0;
      this.facing = p.x >= this.x ? 1 : -1;
      this.play('idle');
      if (this.cooldown <= 0 && p.alive && p.state !== 'down') this.start('swipeWind');
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
    const hold = (anim: string, i: number) => { this.play(anim, false); this.sprite.anims.stop(); this.sprite.setFrame(this.frameOf(anim, i)); };
    switch (s) {
      case 'swipeWind': hold('punch', 0); if (Math.random() < 0.35) this.onSay(Phaser.Math.RND.pick(['KNEEL.', 'BOW.', 'MINE.'])); break;
      case 'slamWind': hold('slam', 0); this.scene.sfx('rumble', 0.5); this.onSay('THE RIVER IS THE KING\'S!'); break;
      case 'beamWind':
        hold('beam', 0);
        this.beamY = Phaser.Math.Clamp(p.y, 160, 206);
        this.scene.sfx('drain', 0.5);
        this.onSay('GIVE ME YOUR MEMORIES.');
        this.onBeamWarn(this.beamY);
        break;
      case 'call': this.play('call', false); this.scene.sfx('choir', 0.4); this.onSay('MORE PIPS!'); this.onCall(); break;
    }
  }

  private recover(cd: number) {
    this.sprite.clearTint();
    this.cooldown = cd;
    this.setState('approach');
    this.play('idle', false);
  }

  update(dt: number) {
    if (this.finale) { this.render(); return; }
    const custom = ['swipeWind', 'swipe', 'slamWind', 'slam', 'stuck', 'beamWind', 'beam', 'call'];
    if (!custom.includes(this.state)) { super.update(dt); return; }
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    const t = this.stateTime;
    switch (this.state) {
      case 'swipeWind':
        this.vx = this.vy = 0;
        if (t > 0.3) this.sprite.setTintFill(Math.floor(t * 14) % 2 ? 0xffffff : 0x5ce1ff);
        if (t > 0.62) { this.sprite.clearTint(); this.setState('swipe'); this.sprite.setFrame(this.frameOf('punch', 1)); this.scene.sfx('whiff', 0.8); this.vx = this.facing * 40; }
        break;
      case 'swipe': {
        this.vx *= Math.pow(0.01, dt);
        if (t > 0.14) this.sprite.setFrame(this.frameOf('punch', 2));
        if (t < 0.2) for (const h of this.scene.hitTest(this, [8, 82], 14, this.hit, true)) {
          this.hit.add(h);
          if (h.takeHit({ damage: 13, dir: this.facing, knockback: 150, knockdown: Math.random() < 0.4, launch: 160, heavy: true, source: this, kind: 'punch' })) this.scene.spark(h.x, h.y - 24, COLORS.white);
        }
        if (t > 0.6) this.recover(Phaser.Math.FloatBetween(1.0, 1.7));
        break;
      }
      case 'slamWind':
        this.vx = this.vy = 0;
        if (t > 0.4) this.sprite.setTintFill(Math.floor(t * 14) % 2 ? 0xffffff : 0xf5c542);
        if (t > 0.85) {
          this.sprite.clearTint();
          this.setState('slam');
          this.sprite.setFrame(this.frameOf('slam', 1));
          this.scene.sfx('punchHeavy', 1); this.scene.sfx('rumble', 0.9); this.scene.sfx('splash', 0.8);
          this.scene.shake(300, 0.01);
          this.scene.splash(this.x + this.facing * 50, this.y);
          this.onSlam(this.x + this.facing * 50, this.y);
        }
        break;
      case 'slam':
        this.vx = this.vy = 0;
        if (t > 0.4) { this.setState('stuck'); this.sprite.setFrame(this.frameOf('slam', 2)); this.onStuck(); }
        break;
      case 'stuck':
        // the flail is stuck in the sand: the opening
        this.vx = this.vy = 0;
        if (t > 1.8) this.recover(0.6);
        break;
      case 'beamWind':
        this.vx = this.vy = 0;
        // turn to face down the lane it's going to fire along
        this.y += (this.beamY - this.y) * Math.min(1, dt * 3);
        this.sprite.setTint(Math.floor(t * 12) % 2 ? 0xfff1a8 : 0xffffff);
        if (t > 1.1) { this.sprite.clearTint(); this.setState('beam'); this.sprite.setFrame(this.frameOf('beam', 1)); this.scene.sfx('zap', 0.9); this.onBeam(this.beamY); }
        break;
      case 'beam':
        this.vx = this.vy = 0;
        if (t > 0.9) this.recover(0.8);
        break;
      case 'call':
        this.vx = this.vy = 0;
        if (t > 1.2) this.recover(0.5);
        break;
    }
    this.physics(dt);
    this.y = Phaser.Math.Clamp(this.y, 160, 206);
  }

  takeHit(h: HitInfo): boolean {
    if (this.finale || !this.alive) return false;
    if (h.kind === 'pothole' || h.kind === 'car') return false;
    if (h.kind === 'flash') {
      if (this.armored || this.state === 'stuck') return false;
      const ok = super.takeHit(h);
      this.dazed = 1.0;
      return ok;
    }
    let dmg = h.damage;
    if (this.state === 'stuck') dmg = Math.ceil(dmg * 1.5);
    // it can't go below its floor: at 30% the mission takes over
    if (this.hp - dmg <= this.floorHp) {
      if (this.invuln > 0) return false;
      this.hp = this.floorHp;
      this.finale = true;
      this.vx = this.vy = 0;
      this.sprite.clearTint();
      this.play('hurt', false);
      this.onFinale();
      return true;
    }
    if (this.state === 'stuck' || this.armored) {
      if (this.invuln > 0) return false;
      this.hp -= dmg;
      this.invuln = 0.07;
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(60, () => { if (!this.finale && this.state !== 'beamWind' && this.state !== 'slamWind') this.sprite.clearTint(); });
      this.scene.sfx('clang', 0.45);
      return true;
    }
    // it never gets knocked flat in phase 2: big hits just stagger it
    this.sprite.clearTint();
    return super.takeHit({ ...h, damage: dmg, knockdown: false, knockback: (h.knockback ?? 40) * 0.3 });
  }
}
