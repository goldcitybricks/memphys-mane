import Phaser from 'phaser';
import { Fighter, Move, Outcome, FLOOR_Y } from './Fighter';
import type { FightScene } from './FightScene';
import type { BoxerMane } from './BoxerMane';
import { CROWE_PRIME } from '../../missions/lines';

// Crowe Prime's move list (Mission 7). Every attack has a tell: the fist pulls back, the selfie stick
// winds over his shoulder and glows gold, the rocket boots glow red because you can't block the dash.
export const CROWE_MOVES: Record<string, Move> = {
  jab: { id: 'jab', anim: 'jab', windFrame: 0, hitFrame: 1, windup: 0.4, recover: 0.3, damage: 8, chip: 0.15, stun: 0.25, sfx: 'punch', tell: 'white', lunge: 10 },
  stick: { id: 'stick', anim: 'stick', windFrame: 1, hitFrame: 2, windup: 0.82, recover: 0.6, damage: 18, chip: 0.25, heavy: true, armor: true, stun: 0.5, sfx: 'punchHeavy', tell: 'gold', say: 'SAY CHEESE!', lunge: 14 },
  ping: { id: 'ping', anim: 'ping', windFrame: 0, hitFrame: 1, windup: 0.55, recover: 0.45, damage: 9, chip: 0.2, stun: 0.3, sfx: 'punch', projectile: { tex: 'pingShot', flight: 0.45 } },
  rocket: { id: 'rocket', anim: 'rocket', windFrame: 0, hitFrame: 1, windup: 0.65, recover: 0.5, damage: 21, blockable: false, heavy: true, armor: true, stun: 0.55, sfx: 'punchHeavy', tell: 'red', say: 'BOOTS: ON.', strands: true },
  // GigaZ's move in the encore: a download beam that drains Mane's super meter
  download: { id: 'download', anim: 'ping', windFrame: 0, hitFrame: 1, windup: 0.85, recover: 0.5, damage: 7, chip: 0.2, stun: 0.3, sfx: 'drain', tell: 'white', say: 'DOWNLOADING YOU...' },
  // the counter after it predicts a punch
  counter: { id: 'counter', anim: 'jab', windFrame: 0, hitFrame: 1, windup: 0.24, recover: 0.35, damage: 10, chip: 0.2, stun: 0.3, sfx: 'punch', lunge: 12 },
};

export interface CroweStyle {
  gap: [number, number];
  weights: Partial<Record<'jab' | 'jab2' | 'stick' | 'ping' | 'rocket' | 'download' | 'taunt', number>>;
  guard: number; // chance he blocks a punch he didn't predict
  predict: number; // chance he reads a punch you've thrown 3 times in a row
  speed: number;
  power: number;
  daze: number;
}

// Crowe Prime: Victor's robot body double, with GigaZ underneath. "I was trained on your posts":
// throw the same punch over and over and it reads it, sways back and counters. Mix it up.
export class CrowePrime extends Fighter {
  style: CroweStyle = { gap: [1, 1.8], weights: { jab: 1 }, guard: 0, predict: 0, speed: 1, power: 1, daze: 1.1 };
  swayLine = 'PREDICTED.';
  stuckLabel = 'SYSTEM CRASH!';
  shineLine = 'SENSOR OVERLOAD!';
  glitchy = false;
  onPredict?: () => void;
  onCrash?: () => void;
  private nextAt = 0.8;
  private comboLeft = 0;
  private tauntCd = 4;
  private history: string[] = [];
  private counterNext = false;
  private dashX = 0;
  private dashTo = 0;

  constructor(scene: FightScene, x: number) {
    super(scene, 'crowe', x, -1, 160);
    this.name = 'CROWE PRIME';
  }

  get headY() { return FLOOR_Y - this.z - 106; }

  setStyle(s: CroweStyle) { this.style = s; this.speed = s.speed; this.power = s.power; this.nextAt = 1; }

  update(dt: number) {
    this.tauntCd -= dt;
    if (this.state === 'hurt' || this.state === 'block') this.nextAt -= dt * 0.6;
    switch (this.state) {
      case 'block':
      case 'taunt':
        if (this.t >= this.dur) this.toIdle();
        break;
      case 'sway':
        if (this.t >= this.dur) { this.setState('idle'); this.counterNext = true; }
        break;
      case 'stuck':
        if (this.t >= this.dur) this.getUp(this.hp);
        break;
    }
    super.update(dt);
    if (this.state === 'dash') {
      // flying in low on the rocket boots
      this.dashX += (this.dashTo - this.dashX) * Math.min(1, dt * 14);
      this.x = this.dashX;
      if (Math.abs(this.dashTo - this.dashX) < 4) this.arrive();
    }
  }

  think(dt: number) {
    if (this.state !== 'idle') return;
    if (this.counterNext) {
      this.counterNext = false;
      this.startMove(CROWE_MOVES.counter);
      return;
    }
    if (this.comboLeft > 0) {
      this.comboLeft--;
      this.startMove({ ...CROWE_MOVES.jab, windup: CROWE_MOVES.jab.windup * 0.75 });
      return;
    }
    this.nextAt -= dt;
    if (this.nextAt > 0) return;
    this.nextAt = Phaser.Math.FloatBetween(this.style.gap[0], this.style.gap[1]);
    const w = Object.entries(this.style.weights).filter(([k]) => k !== 'taunt' || this.tauntCd <= 0) as [string, number][];
    const total = w.reduce((a, [, v]) => a + v, 0);
    let r = Math.random() * total;
    let pick = 'jab';
    for (const [k, v] of w) { r -= v; if (r <= 0) { pick = k; break; } }
    switch (pick) {
      case 'jab2': this.comboLeft = 1; this.startMove(CROWE_MOVES.jab); break;
      case 'taunt':
        this.tauntCd = 7;
        this.setState('taunt', 1.1);
        this.play('taunt', true);
        this.scene.sfx('flash', 0.4);
        this.scene.say(this, Phaser.Utils.Array.GetRandom(CROWE_PRIME.talk), 1300);
        break;
      default: this.startMove(CROWE_MOVES[pick]);
    }
  }

  // Mane is throwing. If it's the same punch three times running, it saw it coming.
  onFoeWindup(m: Move) {
    if (m.unstoppable) return;
    const id = m.id === 'oneTwo' ? 'hook' : m.id;
    const streak = this.history.length >= 3 && this.history.slice(-3).every((h) => h === id);
    this.history = [...this.history, id].slice(-6);
    if (this.state !== 'idle' || !this.controllable || !this.scene.fighting) return;
    if (streak && Math.random() < this.style.predict) {
      this.history = [];
      this.setState('sway', 0.42);
      this.play('sway', true);
      this.scene.sfx('glitch', 0.4);
      this.onPredict?.();
      return;
    }
    if (Math.random() < this.style.guard) {
      this.setState('block', Phaser.Math.FloatBetween(0.5, 0.85));
      this.play('block');
    }
  }

  startMove(m: Move) {
    super.startMove(m);
    if (m.id === 'rocket') this.scene.sfx('rocket', 0.7);
  }

  fire() {
    const m = this.move!;
    if (m.id === 'rocket') {
      // the dash: low and fast, right at him
      this.frame('rocket', 1);
      this.setState('dash');
      this.dashX = this.x;
      this.dashTo = this.foe.x - this.facing * 40;
      this.scene.sfx('boost', 0.6);
      return;
    }
    if (m.id === 'ping') this.scene.sfx('notify', 0.8);
    if (m.id === 'download') this.beam();
    super.fire();
  }

  private arrive() {
    const m = this.move;
    if (!m) { this.toIdle(); return; }
    this.setState('windup'); // so afterHit moves on to recover
    this.scene.shake(120, 0.006);
    const out = this.scene.resolve(this, m);
    if (out === 'whiff' || out === 'dodged') this.crash();
    else this.afterHit(m, out);
  }

  // the dash missed: straight into the floor, sparking, rebooting
  private crash() {
    this.move = null;
    this.slideV = this.facing * 90;
    this.setState('stuck', 1.7);
    this.play('stuck', true);
    this.scene.sfx('crash', 0.7);
    this.scene.say(this, 'REBOOTING...', 1300);
    this.onCrash?.();
  }

  // a thin blue beam from the phone to Mane
  private beam() {
    const sc = this.scene;
    const g = sc.add.graphics().setDepth(35).setBlendMode(Phaser.BlendModes.ADD);
    const x0 = this.x + this.facing * 30, y0 = FLOOR_Y - 82, x1 = this.foe.x, y1 = FLOOR_Y - 60;
    g.lineStyle(3, 0x5ce1ff, 0.8).lineBetween(x0, y0, x1, y1);
    g.lineStyle(1, 0xffffff, 1).lineBetween(x0, y0, x1, y1);
    sc.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
  }

  onDodged(m: Move) {
    if (m.id === 'rocket') return; // arrive() handles it
    this.open(0.8);
  }

  afterHit(m: Move, out: Outcome) {
    super.afterHit(m, out);
    if (out !== 'hit') return;
    if (m.id === 'download') {
      const p = this.foe as BoxerMane;
      p.meter = Math.max(0, p.meter - 50);
      this.hp = Math.min(this.maxHp, this.hp + 6);
      this.scene.toast('SUPER METER DOWNLOADED!');
      this.scene.events.emit('hud');
    }
    if (m.id === 'stick' && Math.random() < 0.5) this.scene.say(this, 'CHAT, CLIP THAT.', 1300);
  }

  render() {
    super.render();
    // the encore: GigaZ is driving and the signal is bad
    if (this.glitchy && this.state !== 'down' && this.state !== 'out' && Math.random() < 0.04) {
      this.sprite.x += Phaser.Math.Between(-3, 3);
      this.sprite.setTint(Math.random() < 0.5 ? 0x5ce1ff : 0xff5ac8);
    }
  }
}
