import { Fighter, Move } from './Fighter';
import type { FightScene } from './FightScene';
import { Controls } from '../../core/controls';

// Mane's fight moves. Jab is quick, hook is heavy and breaks a guard, jab-jab-hook is the 1-2.
export const MANE_MOVES: Record<string, Move> = {
  jab: { id: 'jab', anim: 'jab', windFrame: 0, hitFrame: 1, windup: 0.08, recover: 0.26, damage: 3, stun: 0.14, meter: 5, score: 10, sfx: 'punch', lunge: 10 },
  hook: { id: 'hook', anim: 'hook', windFrame: 0, hitFrame: 1, windup: 0.22, recover: 0.4, damage: 7, heavy: true, guardBreak: true, stun: 0.4, meter: 9, score: 30, sfx: 'punchHeavy', lunge: 14 },
  oneTwo: { id: 'oneTwo', anim: 'hook', windFrame: 0, hitFrame: 1, windup: 0.16, recover: 0.36, damage: 11, heavy: true, guardBreak: true, stun: 0.5, meter: 12, score: 80, sfx: 'punchHeavy', lunge: 16 },
};

export const SUPER_COST = 100;
export const FLEX_COOLDOWN = 7;
const DODGE_TIME = 0.42; // the whole sway
export const DODGE_INVULN = 0.32; // the part that makes punches miss

// MEMPHYS Mane in the ring, driven by the shared Controls (keyboard + touch).
export class BoxerMane extends Fighter {
  meter = 0;
  flexCd = 0;
  private jabTimes: number[] = [];

  constructor(scene: FightScene, x: number) {
    super(scene, 'maneBox', x, 1, 100);
    this.name = 'MEMPHYS MANE';
  }

  get superReady() { return this.meter >= SUPER_COST; }
  addMeter(n: number) {
    const was = this.superReady;
    this.meter = Math.min(SUPER_COST, this.meter + n);
    if (!was && this.superReady) this.scene.onSuperReady();
  }

  update(dt: number) {
    this.flexCd = Math.max(0, this.flexCd - dt);
    if (this.state === 'dodge' && this.t >= this.dur) this.toIdle();
    super.update(dt);
  }

  think(_dt: number) {
    if (this.state === 'block' && !Controls.isDown('block')) this.toIdle();
    const free = this.state === 'idle' || this.state === 'block';
    if (!free) return;
    if (Controls.consume('dodge')) { this.dodge(); return; }
    if (Controls.consume('super')) { if (this.superReady && this.scene.canSuper()) { this.scene.doSuper(); return; } this.scene.toast(this.superReady ? 'NOT NOW!' : 'SUPER NOT READY'); }
    if (Controls.consume('flex')) { if (this.flexCd <= 0) { this.scene.doShine(); return; } }
    if (Controls.consume('attack')) {
      const now = this.scene.time.now;
      this.jabTimes = [...this.jabTimes.filter((t) => now - t < 1100), now];
      this.startMove(MANE_MOVES.jab);
      return;
    }
    if (Controls.consume('hook')) {
      const now = this.scene.time.now;
      const oneTwo = this.jabTimes.filter((t) => now - t < 1100).length >= 2;
      this.jabTimes = [];
      this.startMove(oneTwo ? MANE_MOVES.oneTwo : MANE_MOVES.hook);
      return;
    }
    if (Controls.isDown('block') && this.state !== 'block') { this.setState('block'); this.play('block'); }
  }

  dodge() {
    this.move = null;
    this.setState('dodge', DODGE_TIME);
    this.play('dodge', true);
    this.scene.sfx('whiff', 0.35);
  }

  get dodging() { return this.state === 'dodge' && this.t < DODGE_INVULN; }
}
