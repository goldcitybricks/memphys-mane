import Phaser from 'phaser';
import art from '../../../public/assets/art/art.json';
import type { SfxKey } from '../../core/assets';
import type { FightScene } from './FightScene';

// A move in the 1-on-1 fight engine. Every attack is data, so a new boss is a new move list plus a brain.
export interface Move {
  id: string;
  anim: string;
  windFrame?: number; // frame of `anim` held during the windup
  hitFrame?: number; // frame shown when it lands
  windup: number; // seconds of tell before it lands
  recover: number; // seconds stuck after
  damage: number;
  chip?: number; // share of damage that goes through a block
  blockable?: boolean; // default true
  dodgeable?: boolean; // default true
  high?: boolean; // default true: a crinkle ducks under it
  heavy?: boolean; // big hitstop + shake; breaks armor
  armor?: boolean; // light hits don't interrupt the windup
  guardBreak?: boolean; // knocks a blocking fighter open
  unstoppable?: boolean; // the super: nothing evades it
  stun?: number; // how long the defender is stunned on hit
  knockback?: number;
  lunge?: number; // px forward when it lands
  meter?: number; // super meter gained when it lands
  score?: number;
  sfx?: SfxKey;
  tell?: 'white' | 'red' | 'gold' | null; // glow during the windup (red = can't block it)
  say?: string; // speech bubble at the start of the windup
  projectile?: { tex: string; flight: number }; // resolves when it arrives
  strands?: boolean; // dodging it leaves the attacker stuck (Pip's bottle flip, Crowe Prime's rocket dash)
}

export type Outcome = 'hit' | 'blocked' | 'dodged' | 'whiff';

type Sprites = Record<string, { anims?: Record<string, [number, number]> }>;
const SPRITES = art.sprites as unknown as Sprites;
export const frameOf = (tex: string, anim: string, i = 0) => {
  const r = SPRITES[tex]?.anims?.[anim];
  return r ? Math.min(r[1], r[0] + i) : 0;
};

export const FLOOR_Y = 186; // feet line on the canvas
export const SCALE = 2; // fighters are drawn big, Punch-Out style

// One fighter: position on a line, a state machine, and the move it's throwing. Controllers subclass it.
export abstract class Fighter {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  x: number; homeX: number; z = 0; vz = 0;
  facing: 1 | -1;
  hp: number; maxHp: number;
  state = 'idle';
  t = 0; // time in the current state
  dur = 0; // planned length of timed states
  move: Move | null = null;
  slideV = 0;
  power = 1; // damage multiplier (round 3 Pip hits harder)
  speed = 1; // windup speed multiplier
  invuln = 0;
  name = '';
  knockdowns = 0;
  tint: number | null = null;
  controllable = false;
  private flashT = 0;

  constructor(public scene: FightScene, public tex: string, x: number, facing: 1 | -1, hp: number) {
    this.x = this.homeX = x;
    this.facing = facing;
    this.hp = this.maxHp = hp;
    this.shadow = scene.add.ellipse(x, FLOOR_Y, 56, 8, 0x000000, 0.35).setDepth(9);
    this.sprite = scene.add.sprite(x, FLOOR_Y, tex, 0).setOrigin(0.5, 61 / 64).setScale(SCALE).setDepth(10);
    this.play('idle');
  }

  get foe(): Fighter { return this.scene.other(this); }
  get alive() { return this.state !== 'down' && this.state !== 'out'; }
  // top of the head, for speech bubbles
  get headY() { return FLOOR_Y - this.z - 92; }

  play(anim: string, restart = false) { this.sprite.play(`${this.tex}:${anim}`, !restart); }
  frame(anim: string, i: number) { this.sprite.anims.stop(); this.sprite.setFrame(frameOf(this.tex, anim, i)); }

  setState(s: string, dur = 0) { this.state = s; this.t = 0; this.dur = dur; }

  // ---------------------------------------------------------------- actions
  startMove(m: Move) {
    this.move = m;
    this.setState('windup', m.windup / this.speed);
    this.frame(m.anim, m.windFrame ?? 0);
    if (m.say) this.scene.say(this, m.say, Math.max(900, m.windup * 1000 + 400));
    this.scene.onWindup(this, m);
  }

  // the fighter got hit: stagger, unless an armored windup shrugs off a light hit
  stagger(stun: number, heavy = false) {
    if (this.state === 'windup' && this.move?.armor && !heavy) { this.flashT = 0.12; return; }
    this.move = null;
    this.setState('hurt', stun);
    this.play('hurt', true);
    this.slideV = -this.facing * (heavy ? 140 : 70);
  }

  // left wide open (after a dodge, a guard break, a whiffed flip): hits do more
  open(dur: number, anim = 'dazed') {
    this.move = null;
    this.setState('open', dur);
    this.play(anim, true);
  }

  knockedDown() {
    this.move = null;
    this.knockdowns++;
    this.setState('down');
    this.frame('knockdown', 0);
    this.slideV = -this.facing * 160;
    this.scene.time.delayedCall(260, () => { if (this.state === 'down') this.frame('knockdown', 1); });
  }

  getUp(hp: number) {
    this.hp = Math.min(this.maxHp, hp);
    this.setState('getup', 0.5);
    this.frame('getup', 0);
    this.scene.time.delayedCall(250, () => { if (this.state === 'getup') this.frame('getup', 1); });
  }

  toIdle() { this.move = null; this.setState('idle'); this.play('idle'); }

  // ---------------------------------------------------------------- loop
  abstract think(dt: number): void;

  update(dt: number) {
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    // slide from knockback, then drift back to the home spot
    if (this.slideV) {
      this.x += this.slideV * dt;
      this.slideV *= Math.pow(0.0015, dt);
      if (Math.abs(this.slideV) < 6) this.slideV = 0;
    } else if (this.state !== 'down' && this.state !== 'out' && this.state !== 'scripted') {
      this.x += (this.homeX - this.x) * Math.min(1, dt * 6);
    }
    // the ropes: nobody leaves the ring
    const lim = this.scene.ringHalf();
    if (this.state !== 'scripted') this.x = Phaser.Math.Clamp(this.x, this.scene.midX - lim, this.scene.midX + lim);
    // jumping (Pip's bottle flip)
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 1100 * dt;
      this.z = Math.max(0, this.z + this.vz * dt);
      if (this.z === 0) { this.vz = 0; this.onLand(); }
    }
    switch (this.state) {
      case 'windup':
        if (this.t >= this.dur && this.move) this.fire();
        break;
      case 'recover':
      case 'hurt':
      case 'open':
      case 'getup':
        if (this.t >= this.dur) this.toIdle();
        break;
    }
    if (this.controllable && this.scene.fighting) this.think(dt);
  }

  // the windup is over: the punch lands (or flies)
  fire() {
    const m = this.move!;
    this.frame(m.anim, m.hitFrame ?? 1);
    if (m.lunge) this.x += this.facing * m.lunge;
    if (m.projectile) {
      this.scene.launchProjectile(this, m);
      this.setState('recover', m.recover);
      return;
    }
    const out = this.scene.resolve(this, m);
    this.afterHit(m, out);
  }

  afterHit(m: Move, out: Outcome) {
    if (this.state === 'windup' || this.state === 'active') this.setState('recover', m.recover);
    if (out === 'whiff' || out === 'dodged') this.scene.sfx('whiff', 0.5);
    // play out the rest of the swing
    const [a, b] = SPRITES[this.tex]?.anims?.[m.anim] ?? [0, 0];
    const hit = a + (m.hitFrame ?? 1);
    if (b > hit) this.scene.time.delayedCall(Math.min(140, m.recover * 450), () => { if (this.state === 'recover' && this.move === m) this.sprite.setFrame(Math.min(b, hit + 1)); });
  }

  onLand() { /* override */ }

  render() {
    const s = this.sprite;
    s.setPosition(Math.round(this.x), Math.round(FLOOR_Y - this.z));
    s.setFlipX(this.facing < 0);
    this.shadow.setPosition(Math.round(this.x), FLOOR_Y + 1);
    const k = Math.max(0.4, 1 - this.z / 160);
    this.shadow.setScale(k, k);
    // tells: a pulsing glow while winding up something big
    const tell = this.state === 'windup' ? this.move?.tell : null;
    if (this.flashT > 0) s.setTintFill(0xffffff);
    else if (tell) {
      const on = Math.floor(this.t * 14) % 2 === 0;
      const c = tell === 'red' ? 0xff6060 : tell === 'gold' ? 0xffe080 : 0xffffff;
      if (on) s.setTint(c); else s.clearTint();
    } else if (this.tint !== null) s.setTint(this.tint);
    else s.clearTint();
    s.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 16) % 2 ? 0.5 : 1);
  }
}
