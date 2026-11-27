import Phaser from 'phaser';
import { Fighter, Move, Outcome, FLOOR_Y } from './Fighter';
import type { FightScene } from './FightScene';
import { VICTOR_10 } from '../../missions/lines';

// Victor Crowe in person (Mission 10). Fast and dirty, and he cheats. Every cheat has a tell:
// - the fake pause: he holds his phone up, a PAUSED screen drops, then a rocket knee comes in. Red: dodge it.
// - the refill: he stops to chug a DeNile and heals. Hit him while he drinks and he spills it.
// - the rocket dash: red, unblockable. Dodge it and he faceplants in the sand.
export const VICTOR_MOVES: Record<string, Move> = {
  jab: { id: 'jab', anim: 'jab', windFrame: 0, hitFrame: 1, windup: 0.34, recover: 0.28, damage: 8, chip: 0.15, stun: 0.25, sfx: 'punch', tell: 'white', lunge: 10 },
  stick: { id: 'stick', anim: 'stick', windFrame: 1, hitFrame: 2, windup: 0.75, recover: 0.55, damage: 17, chip: 0.25, heavy: true, armor: true, stun: 0.5, sfx: 'punchHeavy', tell: 'gold', say: 'SAY CHEESE!', lunge: 14 },
  ping: { id: 'ping', anim: 'ping', windFrame: 0, hitFrame: 1, windup: 0.5, recover: 0.4, damage: 9, chip: 0.2, stun: 0.3, sfx: 'punch', projectile: { tex: 'pingShot', flight: 0.42 } },
  rocket: { id: 'rocket', anim: 'rocket', windFrame: 0, hitFrame: 1, windup: 0.6, recover: 0.5, damage: 20, blockable: false, heavy: true, armor: true, stun: 0.55, sfx: 'punchHeavy', tell: 'red', say: 'BOOTS: ON.', strands: true },
  // the fake pause: long, obvious, unblockable
  pause: { id: 'pause', anim: 'pause', windFrame: 0, hitFrame: 1, windup: 0.95, recover: 0.5, damage: 18, blockable: false, heavy: true, stun: 0.5, sfx: 'punchHeavy', tell: 'red', lunge: 26 },
  // the refill: no damage, it heals him unless you hit him first
  refill: { id: 'refill', anim: 'refill', windFrame: 0, hitFrame: 1, windup: 1.15, recover: 0.3, damage: 0, sfx: 'sip', tell: null },
};

export interface VictorStyle {
  gap: [number, number];
  weights: Partial<Record<'jab' | 'jab2' | 'stick' | 'ping' | 'rocket' | 'pause' | 'refill' | 'taunt', number>>;
  guard: number;
  speed: number;
  power: number;
  daze: number;
}

export class Victor extends Fighter {
  style: VictorStyle = { gap: [1, 1.8], weights: { jab: 1 }, guard: 0, speed: 1, power: 1, daze: 1.1 };
  stuckLabel = 'FACEPLANT!';
  shineLine = 'MY VISOR!';
  swayLine = 'MISSED ME.';
  onPause?: (on: boolean) => void;
  onSpill?: () => void;
  onRefill?: () => void;
  private nextAt = 0.8;
  private comboLeft = 0;
  private tauntCd = 4;
  private refillCd = 0;
  private dashX = 0;
  private dashTo = 0;

  constructor(scene: FightScene, x: number) {
    super(scene, 'victor', x, -1, 150);
    this.name = 'VICTOR CROWE';
  }

  get headY() { return FLOOR_Y - this.z - 104; }

  setStyle(s: VictorStyle) { this.style = s; this.speed = s.speed; this.power = s.power; this.nextAt = 1; }

  update(dt: number) {
    this.tauntCd -= dt;
    this.refillCd -= dt;
    if (this.state === 'hurt' || this.state === 'block') this.nextAt -= dt * 0.6;
    switch (this.state) {
      case 'block':
      case 'taunt':
        if (this.t >= this.dur) this.toIdle();
        break;
      case 'stuck':
        if (this.t >= this.dur) this.getUp(this.hp);
        break;
    }
    super.update(dt);
    if (this.state === 'dash') {
      this.dashX += (this.dashTo - this.dashX) * Math.min(1, dt * 14);
      this.x = this.dashX;
      if (Math.abs(this.dashTo - this.dashX) < 4) this.arrive();
    }
  }

  think(dt: number) {
    if (this.state !== 'idle') return;
    if (this.comboLeft > 0) {
      this.comboLeft--;
      this.startMove({ ...VICTOR_MOVES.jab, windup: VICTOR_MOVES.jab.windup * 0.7 });
      return;
    }
    this.nextAt -= dt;
    if (this.nextAt > 0) return;
    this.nextAt = Phaser.Math.FloatBetween(this.style.gap[0], this.style.gap[1]);
    // he only refills when he's hurt, and not too often
    const w = Object.entries(this.style.weights).filter(([k]) => (k !== 'taunt' || this.tauntCd <= 0) && (k !== 'refill' || (this.refillCd <= 0 && this.hp < this.maxHp * 0.7))) as [string, number][];
    const total = w.reduce((a, [, v]) => a + v, 0);
    let r = Math.random() * total;
    let pick = 'jab';
    for (const [k, v] of w) { r -= v; if (r <= 0) { pick = k; break; } }
    switch (pick) {
      case 'jab2': this.comboLeft = 1; this.startMove(VICTOR_MOVES.jab); break;
      case 'taunt':
        this.tauntCd = 7;
        this.setState('taunt', 1.1);
        this.play('taunt', true);
        this.scene.sfx('flash', 0.4);
        this.scene.say(this, Phaser.Utils.Array.GetRandom(VICTOR_10.talk), 1300);
        break;
      case 'refill': this.refillCd = 9; this.startMove(VICTOR_MOVES.refill); break;
      default: this.startMove(VICTOR_MOVES[pick]);
    }
  }

  // he reads nothing, but he does flinch into a guard sometimes
  onFoeWindup() {
    if (this.state !== 'idle' || !this.controllable || !this.scene.fighting) return;
    if (Math.random() < this.style.guard) { this.setState('block', Phaser.Math.FloatBetween(0.4, 0.75)); this.play('block'); }
  }

  startMove(m: Move) {
    super.startMove(m);
    if (m.id === 'rocket') this.scene.sfx('rocket', 0.7);
    if (m.id === 'pause') { this.scene.say(this, VICTOR_10.pause, 1200); this.onPause?.(true); this.scene.sfx('select', 0.8); }
    if (m.id === 'refill') { this.scene.say(this, VICTOR_10.refill, 1300); this.play('refill', true); }
  }

  fire() {
    const m = this.move!;
    if (m.id === 'pause') this.onPause?.(false);
    if (m.id === 'refill') {
      // he finished the bottle
      this.hp = Math.min(this.maxHp, this.hp + 22);
      this.scene.sfx('sip', 0.8);
      this.onRefill?.();
      this.scene.events.emit('hud');
      this.setState('recover', m.recover);
      return;
    }
    if (m.id === 'rocket') {
      this.frame('rocket', 1);
      this.setState('dash');
      this.dashX = this.x;
      this.dashTo = this.foe.x - this.facing * 40;
      this.scene.sfx('boost', 0.6);
      return;
    }
    if (m.id === 'ping') this.scene.sfx('notify', 0.8);
    super.fire();
  }

  // hit while drinking or pausing: the cheat falls apart
  stagger(stun: number, heavy = false) {
    const m = this.state === 'windup' ? this.move : null;
    if (m?.id === 'pause') this.onPause?.(false);
    if (m?.id === 'refill') {
      this.move = null;
      this.onSpill?.();
      this.scene.say(this, VICTOR_10.spilled, 1100);
      this.open(1.0);
      return;
    }
    super.stagger(stun, heavy);
  }

  knockedDown() {
    if (this.state === 'windup' && this.move?.id === 'pause') this.onPause?.(false);
    super.knockedDown();
  }

  private arrive() {
    const m = this.move;
    if (!m) { this.toIdle(); return; }
    this.setState('windup');
    this.scene.shake(120, 0.006);
    const out = this.scene.resolve(this, m);
    if (out === 'whiff' || out === 'dodged') this.crash();
    else this.afterHit(m, out);
  }

  // the dash missed: face first into the sand
  private crash() {
    this.move = null;
    this.slideV = this.facing * 90;
    this.setState('stuck', 1.6);
    this.play('stuck', true);
    this.scene.sfx('crash', 0.6);
    this.scene.say(this, VICTOR_10.lagging, 1300);
  }

  onDodged(m: Move) {
    if (m.id === 'rocket') return;
    this.open(m.id === 'pause' ? 1.1 : 0.8);
  }

  afterHit(m: Move, out: Outcome) {
    super.afterHit(m, out);
    if (out === 'hit' && m.id === 'stick' && Math.random() < 0.5) this.scene.say(this, 'CHAT, CLIP THAT.', 1300);
  }
}
