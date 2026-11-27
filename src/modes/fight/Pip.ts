import Phaser from 'phaser';
import { Fighter, Move, Outcome } from './Fighter';
import type { FightScene } from './FightScene';

// Pip's move list. Every attack has a tell you can read: the glove pulls back, big ones glow,
// and the bottle flip glows red because you can't block it.
export const PIP_MOVES: Record<string, Move> = {
  jab: { id: 'jab', anim: 'jab', windFrame: 0, hitFrame: 1, windup: 0.42, recover: 0.32, damage: 8, chip: 0.15, stun: 0.25, sfx: 'punch', tell: 'white', lunge: 10 },
  hay: { id: 'hay', anim: 'hay', windFrame: 1, hitFrame: 2, windup: 0.85, recover: 0.6, damage: 19, chip: 0.25, heavy: true, armor: true, stun: 0.5, sfx: 'punchHeavy', tell: 'gold', say: 'SINGLE-USE!', lunge: 16 },
  cap: { id: 'cap', anim: 'cap', windFrame: 0, hitFrame: 1, windup: 0.55, recover: 0.5, damage: 10, chip: 0.2, stun: 0.3, sfx: 'capPop', projectile: { tex: 'capShot', flight: 0.42 } },
  flip: { id: 'flip', anim: 'crouch', windFrame: 0, hitFrame: 0, windup: 0.6, recover: 0.45, damage: 22, blockable: false, heavy: true, armor: true, stun: 0.55, sfx: 'punchHeavy', tell: 'red', say: 'BOTTLE FLIP!' },
  pop: { id: 'pop', anim: 'pop', windFrame: 0, hitFrame: 0, windup: 0.2, recover: 0.45, damage: 13, chip: 0.2, heavy: true, stun: 0.4, sfx: 'punchHeavy', lunge: 12 },
};

// How Pip fights in a given round
export interface PipStyle {
  gap: [number, number]; // seconds between attacks
  weights: Partial<Record<'jab' | 'jab2' | 'jab3' | 'hay' | 'cap' | 'flip' | 'taunt', number>>;
  guard: number; // chance he blocks when Mane throws
  crinkle: number; // chance he crinkles under it instead
  speed: number;
  power: number;
  daze: number; // how long the grill shine dazes him
}

export const PIP_TALK = [
  'ZERO TASTE!', 'ZERO MEMORY!', 'YOU LOOK FLAT, SODA.', 'WHO ARE YOU AGAIN?', 'CRINKLE CRINKLE!', 'I FORGOT YOU ALREADY.',
];

export class Pip extends Fighter {
  style: PipStyle = { gap: [1, 1.8], weights: { jab: 1 }, guard: 0, crinkle: 0, speed: 1, power: 1, daze: 1.1 };
  private nextAt = 0.8;
  private comboLeft = 0;
  private tauntCd = 4;
  private hitTimes: number[] = [];
  private counterNext = false;
  onFlipWhiff?: () => void;

  constructor(scene: FightScene, x: number) {
    super(scene, 'pip', x, -1, 160);
    this.name = 'PIP';
  }

  get headY() { return 186 - this.z - 86; }

  setStyle(s: PipStyle) { this.style = s; this.speed = s.speed; this.power = s.power; this.nextAt = 1; }

  update(dt: number) {
    this.tauntCd -= dt;
    if (this.state === 'hurt' || this.state === 'block') this.nextAt -= dt * 0.6;
    switch (this.state) {
      case 'block':
      case 'taunt':
        if (this.t >= this.dur) this.toIdle();
        break;
      case 'crinkle':
        if (this.t >= this.dur) { this.setState('idle'); this.startMove(PIP_MOVES.pop); this.frame('crinkle', 1); }
        break;
      case 'air': {
        // tumbling through the air
        const k = Math.min(1, this.t / 0.75);
        this.sprite.setAngle(-this.facing * 360 * k);
        this.x += (this.foe.x + this.facing * -46 - this.x) * Math.min(1, dt * 4);
        break;
      }
      case 'stuck':
        if (this.t >= this.dur) { this.getUp(this.hp); this.sprite.setAngle(0); }
        break;
    }
    super.update(dt);
  }

  // Punch-Out rule: three clean hits in a row and he covers up, then fires right back
  stagger(stun: number, heavy = false) {
    const now = this.scene.time.now;
    this.hitTimes = [...this.hitTimes.filter((t) => now - t < 1600), now];
    if (this.hitTimes.length >= 3 && this.state !== 'windup') {
      this.hitTimes = [];
      this.move = null;
      this.setState('block', 0.55);
      this.play('block');
      this.counterNext = true;
      if (Math.random() < 0.5) this.scene.say(this, Phaser.Utils.Array.GetRandom(['NAH!', 'MY TURN!', 'BACK UP!']), 700);
      return;
    }
    super.stagger(stun, heavy);
  }

  think(dt: number) {
    if (this.state !== 'idle') return;
    if (this.counterNext) {
      this.counterNext = false;
      this.startMove({ ...PIP_MOVES.jab, windup: 0.32 });
      return;
    }
    if (this.comboLeft > 0) {
      this.comboLeft--;
      this.startMove({ ...PIP_MOVES.jab, windup: PIP_MOVES.jab.windup * 0.75 });
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
      case 'jab2': this.comboLeft = 1; this.startMove(PIP_MOVES.jab); break;
      case 'jab3': this.comboLeft = 2; this.startMove(PIP_MOVES.jab); break;
      case 'taunt':
        this.tauntCd = 7;
        this.setState('taunt', 1.0);
        this.play('taunt', true);
        this.scene.say(this, Phaser.Utils.Array.GetRandom(PIP_TALK), 1200);
        break;
      default: this.startMove(PIP_MOVES[pick]);
    }
  }

  // Mane is throwing: maybe block it, maybe crinkle under it
  onFoeWindup(m: Move) {
    if (this.state !== 'idle' || !this.controllable || !this.scene.fighting) return;
    const r = Math.random();
    if (m.unstoppable) return;
    if (r < this.style.crinkle) {
      this.setState('crinkle', 0.5);
      this.play('crinkle', true);
      this.scene.sfx('crinkle', 0.8);
      this.scene.tip('crinkle');
    } else if (r < this.style.crinkle + this.style.guard) {
      this.setState('block', Phaser.Math.FloatBetween(0.5, 0.9));
      this.play('block');
    }
  }

  fire() {
    const m = this.move!;
    if (m.id === 'flip') {
      // up he goes, tumbling, and comes down on Mane
      this.setState('air');
      this.vz = 420;
      this.z = 1;
      this.frame('tuck', 0);
      this.scene.sfx('jump', 0.6);
      return;
    }
    if (m.id === 'cap') this.scene.sfx('capPop', 0.8);
    super.fire();
  }

  onLand() {
    if (this.state !== 'air' || !this.move) return;
    this.sprite.setAngle(0);
    this.scene.shake(160, 0.008);
    this.scene.sfx('land', 0.9);
    const m = this.move;
    this.setState('windup'); // so afterHit moves on to recover
    const out = this.scene.resolve(this, m);
    if (out === 'whiff' || out === 'dodged') this.stuck();
    else { this.frame('getup', 1); this.afterHit(m, out); }
  }

  // the flip missed: upside down on his cap, boots kicking
  stuck() {
    this.move = null;
    this.setState('stuck', 1.7);
    this.play('stuck', true);
    this.scene.say(this, 'LIL HELP?!', 1300);
    this.onFlipWhiff?.();
  }

  onDodged(m: Move) {
    if (m.id === 'flip') return; // onLand handles it
    this.open(0.8);
  }

  afterHit(m: Move, out: Outcome) {
    super.afterHit(m, out);
    if (out === 'hit' && m.id === 'hay' && Math.random() < 0.5) this.scene.say(this, 'ONE USE IS ALL I NEED!', 1300);
  }
}
