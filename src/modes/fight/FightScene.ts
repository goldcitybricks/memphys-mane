import Phaser from 'phaser';
import { Fighter, Move, Outcome, FLOOR_Y } from './Fighter';
import { BoxerMane, SUPER_COST, FLEX_COOLDOWN } from './BoxerMane';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import type { SfxKey } from '../../core/assets';
import { COLORS } from '../../core/config';
import { px, wrap } from '../../core/text';
import { MANE } from '../../missions/lines';
import type { MissionStats } from '../brawler/BrawlerScene';

// Anything that can talk: fighters, the ref, people on the apron.
export interface Speaker { x: number; headY: number }

interface Bubble { box: Phaser.GameObjects.Container; who: Speaker; until: number }
interface Waiter { pred: () => boolean; resolve: () => void }

export type RoundEnd = 'time' | 'foeDown' | 'ko';

// How a knockdown count goes: who gets up and when, and what the ref says at the end.
export interface CountPlan { getUpAt: number | null; lastWord?: string }

// The reusable 1-on-1 fight engine (Mortal Kombat / Fight Night style, side view, big sprites).
// A mission extends it: dresses the arena, makes the opponent, and scripts the rounds and the story.
export abstract class FightScene extends Phaser.Scene {
  player!: BoxerMane;
  foeF!: Fighter;
  ref?: Phaser.GameObjects.Sprite;
  missionId = '';
  round = 0;
  clock: number | null = null; // seconds left, or null for no clock
  fighting = false; // fighters can act
  inCutscene = false;
  skipping = false;
  paused = false;
  continuing = false;
  counting = false;
  score = 0;
  elapsed = 0;
  knockdownsScored = 0;
  dodgeCounters = 0;
  sips = 0;
  private downEvent: Fighter | null = null;
  private hitstopMs = 0;
  private bubbles: Bubble[] = [];
  private waiters: Waiter[] = [];
  private projectiles: { img: Phaser.GameObjects.Sprite; att: Fighter; m: Move; t: number; flight: number; x0: number; x1: number }[] = [];
  private captionBox?: Phaser.GameObjects.Container;
  private tips = new Set<string>();

  get W() { return this.scale.width; }
  get midX() { return this.W / 2; }

  abstract buildArena(): void;
  abstract makeFoe(): Fighter;
  abstract runScript(): Promise<void>;
  // how each knockdown of the opponent is counted (mission decides who beats the count)
  abstract foeCount(knockdown: number): CountPlan;

  create() {
    this.round = 0; this.clock = null; this.fighting = false; this.inCutscene = false; this.skipping = false; this.paused = false;
    this.continuing = false; this.counting = false; this.score = 0; this.elapsed = 0; this.knockdownsScored = 0; this.dodgeCounters = 0; this.sips = 0;
    this.downEvent = null; this.hitstopMs = 0; this.bubbles = []; this.waiters = []; this.projectiles = []; this.tips.clear();
    Controls.clear();
    Audio.apply(this);
    this.cameras.main.setRoundPixels(true);
    this.buildArena();
    this.player = new BoxerMane(this, this.homes().mane);
    this.foeF = this.makeFoe();
    this.setupKeyboard();
    this.scene.launch('FightUI', { world: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scene.stop('FightUI'); this.input.keyboard?.removeAllListeners(); });
    // the screen can change width (rotation, full screen): keep the ring centered
    const relayout = () => this.onResize();
    this.scale.on('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
    this.runScript().catch((e) => console.error(e));
  }

  // fighters stand either side of the middle
  homes() { return { mane: this.midX - 44, foe: this.midX + 44 }; }
  onResize() {
    const h = this.homes();
    this.player.homeX = h.mane; this.foeF.homeX = h.foe;
  }

  // how far from the middle a fighter can be pushed before the ropes stop him
  ringHalf() { return Math.min(150, this.W / 2 - 50); }

  other(f: Fighter): Fighter { return f === this.player ? this.foeF : this.player; }

  // ---------------------------------------------------------------- input
  private setupKeyboard() {
    const kb = this.input.keyboard!;
    const map: Record<string, Button> = {
      Z: 'attack', J: 'attack', ENTER: 'attack', RIGHT: 'attack', D: 'attack',
      X: 'hook', K: 'hook',
      C: 'block', L: 'block', DOWN: 'block', S: 'block',
      SPACE: 'dodge', SHIFT: 'dodge', LEFT: 'dodge', A: 'dodge',
      V: 'flex', I: 'flex',
      B: 'super', U: 'super', UP: 'super', W: 'super',
      ESC: 'pause', P: 'pause',
    };
    const key = (e: KeyboardEvent) => (e.key === ' ' ? 'SPACE' : e.key === 'Escape' ? 'ESC' : e.key.startsWith('Arrow') ? e.key.slice(5).toUpperCase() : e.key.toUpperCase());
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      const b = map[key(e)];
      if (!b) return;
      if (b === 'pause') { this.togglePause(); return; }
      Controls.press(b);
    });
    kb.on('keyup', (e: KeyboardEvent) => { const b = map[key(e)]; if (b) Controls.release(b); });
  }

  togglePause() {
    if (this.continuing) return;
    this.paused = !this.paused;
    if (this.paused) { this.sound.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; this.anims.pauseAll(); }
    else { this.sound.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; this.anims.resumeAll(); }
    this.events.emit('paused', this.paused);
  }

  // ---------------------------------------------------------------- loop
  update(_t: number, deltaMs: number) {
    if (this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.hitstopMs > 0) {
      this.hitstopMs -= deltaMs;
      if (this.hitstopMs <= 0) this.anims.resumeAll();
      return;
    }
    if (this.fighting) {
      this.elapsed += deltaMs;
      if (this.clock !== null) this.clock = Math.max(0, this.clock - dt);
    }
    this.player.update(dt);
    this.foeF.update(dt);
    this.updateProjectiles(dt);
    this.player.render();
    this.foeF.render();
    // whoever is closer to the camera is drawn on top: the attacker
    const attacking = (f: Fighter) => f.state === 'windup' || f.state === 'recover' || f.state === 'air';
    this.player.sprite.setDepth(attacking(this.player) && !attacking(this.foeF) ? 12 : 10);
    this.foeF.sprite.setDepth(attacking(this.foeF) ? 11 : this.player.sprite.depth === 12 ? 10 : 11);
    this.updateBubbles();
    for (const w of [...this.waiters]) if (w.pred()) { this.waiters.splice(this.waiters.indexOf(w), 1); w.resolve(); }
  }

  // ---------------------------------------------------------------- combat
  onWindup(f: Fighter, m: Move) {
    if (f === this.player) (this.foeF as any).onFoeWindup?.(m);
  }

  canSuper() { return this.fighting && !['air', 'down', 'getup', 'out'].includes(this.foeF.state); }

  // An attack lands (or doesn't). The heart of the engine.
  resolve(att: Fighter, m: Move): Outcome {
    const def = this.other(att);
    const isMane = att === this.player;
    if (!this.fighting && !m.unstoppable) return 'whiff';
    if (['down', 'out', 'getup', 'air', 'scripted'].includes(def.state) || def.invuln > 0) return 'whiff';
    // dodged: the attacker is left wide open
    const dodging = (def as BoxerMane).dodging === true;
    if (dodging && m.dodgeable !== false && !m.unstoppable) {
      this.dodgeCounters++;
      this.addScore(50);
      this.player.addMeter(18);
      (att as any).onDodged ? (att as any).onDodged(m) : att.open(0.8);
      this.say(this.player, m.id === 'flip' ? MANE.goofy : 'TOO SLOW!', 900);
      this.toast(m.id === 'flip' ? 'DODGED! HE\'S STUCK!' : 'DODGED! COUNTER!');
      this.tip('counter');
      return 'dodged';
    }
    // crinkled down: high punches fly over
    if (def.state === 'crinkle' && m.high !== false && !m.unstoppable) {
      this.say(def, 'CRINKLE!', 700);
      return 'whiff';
    }
    // blocked
    if (def.state === 'block' && m.blockable !== false && !m.unstoppable) {
      const dmg = m.damage * (m.chip ?? 0.1) * att.power;
      def.hp = Math.max(1, def.hp - dmg);
      def.t = 0;
      def.slideV = -def.facing * 50;
      this.sfx('block', 0.8);
      this.spark((att.x + def.x) / 2, FLOOR_Y - 70, 0x9aa0c0);
      if (m.guardBreak && def !== this.player) {
        def.open(0.75);
        this.say(def, 'MY GUARD!', 800);
        this.toast('GUARD BREAK!');
        this.addScore(40);
      }
      if (def === this.player) this.player.addMeter(3);
      this.events.emit('hud');
      return 'blocked';
    }
    // a clean hit
    let mult = 1;
    let label = '';
    if (isMane) {
      if (def.state === 'windup' && !def.move?.armor) { mult = 1.3; label = 'COUNTER!'; }
      if (def.state === 'open' || def.state === 'stuck' || def.state === 'taunt') { mult = 1.5; label = label || (def.state === 'stuck' ? 'BOTTOMS UP!' : ''); }
    }
    const dmg = m.damage * mult * att.power;
    def.hp = Math.max(0, def.hp - dmg);
    const heavy = !!m.heavy || mult > 1.2;
    this.hitstop(heavy ? 110 : 50);
    this.sfx(m.sfx ?? 'punch', 0.85);
    if (def === this.player) this.sfx('tonk', 0.5);
    if (heavy) this.shake(110, 0.006);
    this.spark((att.x + def.x) / 2 + att.facing * 8, FLOOR_Y - 72, heavy ? COLORS.goldHi : 0xffffff);
    if (isMane) {
      this.addScore(Math.round((m.score ?? 10) * mult));
      this.player.addMeter(Math.round((m.meter ?? 4) * mult));
      if (label) this.toast(label);
      if (m.id === 'oneTwo') this.toast('ONE-TWO HOOK!');
    } else if (m.heavy && Math.random() < 0.5) this.say(this.player, MANE.hitHard, 900);
    if (def.hp <= 0) { this.knockDown(def); return 'hit'; }
    // a punish window (stuck, wide open) stays open; anything else staggers
    if (def.state !== 'stuck' && def.state !== 'open') def.stagger(m.stun ?? 0.3, !!m.heavy || !!m.unstoppable);
    this.events.emit('hud');
    return 'hit';
  }

  private knockDown(f: Fighter) {
    this.fighting = false;
    this.downEvent = f;
    f.knockedDown();
    this.other(f).move = null;
    if (this.other(f).state !== 'down') this.other(f).toIdle();
    this.freezeFrame(380, COLORS.goldHi);
    this.sfx('ko', 0.9);
    this.sfx('crowd', 0.8);
    this.shake(250, 0.01);
    this.clearProjectiles();
    this.events.emit('hud');
  }

  launchProjectile(att: Fighter, m: Move) {
    const def = this.other(att);
    const x0 = att.x + att.facing * 30;
    const img = this.add.sprite(x0, FLOOR_Y - 78, m.projectile!.tex).setScale(2).setDepth(30);
    img.play(`${m.projectile!.tex}:spin`);
    this.projectiles.push({ img, att, m, t: 0, flight: m.projectile!.flight / att.speed, x0, x1: def.x - att.facing * 10 });
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.t += dt;
      const k = Math.min(1, p.t / p.flight);
      p.img.x = p.x0 + (p.x1 - p.x0) * k;
      if (k >= 1) {
        const out = this.resolve(p.att, p.m);
        if (out === 'dodged' || out === 'whiff') {
          // sails on by
          this.tweens.add({ targets: p.img, x: p.img.x - p.att.facing * -300, y: p.img.y - 30, duration: 500, onComplete: () => p.img.destroy() });
        } else p.img.destroy();
        p.t = -999;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.t >= 0);
  }

  private clearProjectiles() { for (const p of this.projectiles) p.img.destroy(); this.projectiles = []; }

  // The super: shades on, a flurry, a gold uppercut. Unblockable.
  doSuper() {
    const p = this.player, f = this.foeF;
    p.meter = 0;
    p.move = null;
    p.setState('super');
    p.controllable = false;
    f.move = null;
    if (f.state === 'crinkle' || f.state === 'block' || f.state === 'windup') f.toIdle();
    this.events.emit('hud');
    this.sfx('maneMode', 0.8);
    this.freezeFrame(260, COLORS.gold);
    this.say(p, MANE.super, 1400);
    p.tint = 0xffe9a0;
    const step = (ms: number, fn: () => void) => this.time.delayedCall(ms, () => { if (p.state === 'super') fn(); });
    p.frame('super', 0);
    step(220, () => p.frame('super', 1));
    step(480, () => p.frame('super', 2));
    const hit = (dmg: number, last: boolean): Move => ({ id: 'super', anim: 'super', damage: dmg, windup: 0, recover: 0, unstoppable: true, heavy: last, stun: last ? 0.7 : 0.35, score: last ? 300 : 60, meter: 0, sfx: last ? 'punchHeavy' : 'punch' });
    step(640, () => { p.frame('jab', 1); p.x += 8; this.resolve(p, hit(8, false)); });
    step(820, () => { p.frame('hook', 1); p.x += 6; this.resolve(p, hit(8, false)); });
    step(1080, () => {
      p.frame('super', 3); p.x += 10;
      this.freezeFrame(200, COLORS.goldHi);
      this.resolve(p, hit(16, true));
      if (f.state !== 'down') f.slideV = -f.facing * 220;
    });
    step(1400, () => p.frame('super', 4));
    step(1750, () => { p.tint = null; if (p.state === 'super') { p.toIdle(); } p.controllable = true; });
    this.time.delayedCall(1800, () => { p.tint = null; p.controllable = true; });
  }

  // Grill shine: a flash off the gold teeth that dazes him for a beat
  doShine() {
    const p = this.player, f = this.foeF;
    p.flexCd = FLEX_COOLDOWN;
    p.move = null;
    p.setState('recover', 0.35);
    p.play('shine', true);
    this.sfx('shine', 0.8);
    const beam = this.add.triangle(p.x + 14, FLOOR_Y - 80, 0, 0, 130, -30, 130, 30, COLORS.goldHi, 0.5).setOrigin(0, 0.5).setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0, scaleY: 1.4, duration: 320, onComplete: () => beam.destroy() });
    this.spark(p.x + 14, FLOOR_Y - 80, COLORS.goldHi);
    if (['idle', 'windup', 'recover', 'block', 'taunt'].includes(f.state)) {
      f.open((f as any).style?.daze ?? 1.1);
      this.say(f, '?! MY EYES!', 900);
      this.addScore(15);
    }
  }

  hitstop(ms: number) { this.hitstopMs = Math.max(this.hitstopMs, ms); this.anims.pauseAll(); }
  freezeFrame(ms: number, color: number) {
    this.hitstop(ms);
    const c = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(ms + 80, c.r, c.g, c.b);
  }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(key: SfxKey, volume = 0.7) { Audio.sfx(this, key, { volume }); }
  spark(x: number, y: number, tint = 0xffffff) {
    const s = this.add.sprite(x, y, 'spark').setDepth(40).setTint(tint).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    s.play('spark:hit');
    s.once('animationcomplete', () => s.destroy());
  }
  addScore(n: number) { this.score += n; this.events.emit('hud'); }
  toast(s: string) { this.events.emit('toast', s); }
  // a one-time tip, shown the first time something comes up
  tip(k: string) { if (this.tips.has(k)) return; this.tips.add(k); this.events.emit('tutorial', k); }
  onSuperReady() { this.toast('SUPER READY!'); this.sfx('pickup', 0.6); this.tip('super'); }

  // ---------------------------------------------------------------- rounds
  // Runs one round until the clock runs out or someone stays down.
  async fightRound(n: number, seconds: number | null): Promise<RoundEnd> {
    this.round = n;
    this.clock = seconds;
    this.downEvent = null;
    Controls.clear();
    this.events.emit('hud');
    this.events.emit('banner', { top: n === 3 ? 'FINAL ROUND' : `ROUND ${n}`, bottom: 'FIGHT!' });
    this.refPose('fight');
    this.sfx('ding', 0.8);
    this.time.delayedCall(350, () => this.sfx('ding', 0.6));
    for (const f of [this.player, this.foeF]) { f.toIdle(); f.controllable = true; }
    this.fighting = true;
    for (;;) {
      await this.waitUntil(() => this.downEvent !== null || (this.clock !== null && this.clock <= 0 && this.fighting));
      if (this.downEvent === null) {
        // time
        this.fighting = false;
        this.sfx('ding', 0.8);
        this.time.delayedCall(300, () => this.sfx('ding', 0.6));
        this.events.emit('banner', { top: `ROUND ${n}`, bottom: 'TIME!' });
        await this.settle();
        return 'time';
      }
      const down = this.downEvent as Fighter;
      this.downEvent = null;
      if (down === this.foeF) {
        this.knockdownsScored++;
        this.addScore(1000);
        const plan = this.foeCount(down.knockdowns);
        await this.beforeCount(down, plan);
        const up = await this.count(down, plan);
        if (!up) return 'ko';
        await this.settle();
        return 'foeDown';
      }
      // Mane is down: tap to get up before ten
      const up = await this.maneCount();
      if (!up) {
        await this.continueScreen();
        this.player.getUp(this.player.maxHp);
        this.say(this.player, MANE.getUp, 1600);
      }
      this.player.invuln = 1.2;
      await this.wait(500);
      this.foeF.toIdle();
      this.player.toIdle();
      this.fighting = true;
    }
  }

  // a mission can stage something between the knockdown and the count (the KO photo)
  async beforeCount(_f: Fighter, _plan: CountPlan) { /* override */ }

  // everybody stops and goes back to their spot
  async settle() {
    this.fighting = false;
    this.clearProjectiles();
    await this.waitUntil(() => [this.player, this.foeF].every((f) => !['windup', 'air', 'super'].includes(f.state)));
    for (const f of [this.player, this.foeF]) if (f.state !== 'down' && f.state !== 'out') { f.toIdle(); f.controllable = false; }
  }

  // The ref counts. Returns true if the fighter beats the count.
  async count(f: Fighter, plan: CountPlan) {
    this.counting = true;
    const other = this.other(f);
    other.controllable = false;
    await this.wait(700);
    this.refTo(f.x + (f === this.player ? 46 : -46));
    for (let i = 1; i <= 10; i++) {
      const last = i === 10 || (plan.lastWord && i === 10);
      const word = i === 10 && plan.lastWord ? plan.lastWord : String(i);
      this.refPose('count');
      this.events.emit('count', word);
      this.sfx(last ? 'ding' : 'blip', last ? 0.8 : 0.8);
      if (plan.getUpAt !== null && i === plan.getUpAt) {
        f.getUp(f.maxHp);
        this.events.emit('count', null);
        this.counting = false;
        this.refTo(this.midX, true);
        await this.wait(600);
        return true;
      }
      if (i === 10) break;
      await this.wait(i >= 8 ? 900 : 700);
    }
    f.setState('out');
    this.counting = false;
    this.time.delayedCall(1600, () => this.events.emit('count', null));
    return false;
  }

  // Mane's count: mash to get up
  private async maneCount() {
    this.counting = true;
    const p = this.player;
    const need = 8 + p.knockdowns * 5;
    let taps = 0;
    await this.wait(600);
    this.refTo(p.x + 46);
    this.events.emit('mash', 0);
    Controls.clear();
    for (let i = 1; i <= 10; i++) {
      this.refPose('count');
      this.events.emit('count', String(i));
      this.sfx('blip', 0.8);
      const t0 = this.time.now;
      await this.waitUntil(() => {
        for (const b of ['attack', 'hook', 'jump', 'dodge', 'super', 'flex'] as Button[]) if (Controls.consume(b, 400)) { taps++; this.events.emit('mash', taps / need); }
        return taps >= need || this.time.now - t0 > 850;
      });
      if (taps >= need) {
        p.getUp(i <= 5 ? 50 : 40);
        this.sfx('jump', 0.7);
        this.say(p, MANE.getUp, 1600);
        this.events.emit('count', null);
        this.events.emit('mash', null);
        this.counting = false;
        this.refTo(this.midX, true);
        return true;
      }
    }
    this.events.emit('count', null);
    this.events.emit('mash', null);
    this.counting = false;
    return false;
  }

  private continueScreen() {
    this.continuing = true;
    this.events.emit('continue', true);
    return this.waitUntil(() => !this.continuing);
  }
  doContinue() {
    this.continuing = false;
    this.score = 0;
    this.player.meter = 0;
    this.events.emit('continue', false);
    this.events.emit('hud');
  }
  gameOver() { this.scene.restart(); }

  // ---------------------------------------------------------------- the ref
  refTo(x: number, back = false) {
    const r = this.ref;
    if (!r) return;
    const tx = back ? this.midX + 120 : x;
    r.setFlipX(tx < r.x);
    r.play('ref:walk', true);
    this.tweens.killTweensOf(r);
    this.tweens.add({ targets: r, x: tx, duration: Math.min(700, Math.abs(tx - r.x) * 4 + 100), onComplete: () => { r.play('ref:idle'); r.setFlipX(back); } });
  }
  refPose(anim: string) {
    const r = this.ref;
    if (!r) return;
    r.play(`ref:${anim}`, false);
    r.once('animationcomplete', () => r.active && r.play('ref:idle'));
  }

  // ---------------------------------------------------------------- talking
  say(who: Speaker, text: string, ms = 1600) {
    this.bubbles.filter((b) => b.who === who).forEach((b) => b.box.destroy());
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    const mane = who === this.player;
    const t = px(this, 0, 0, wrap(text, 22), mane ? COLORS.goldHi : 0xffffff);
    const w = t.width + 8, h = t.height + 6;
    t.setPosition(-w / 2 + 4, -h + 3);
    const g = this.add.graphics();
    g.fillStyle(0x0b0f26, 0.92).fillRoundedRect(-w / 2, -h, w, h, 3);
    g.lineStyle(1, mane ? COLORS.gold : 0x9aa0c0, 1).strokeRoundedRect(-w / 2 + 0.5, -h + 0.5, w - 1, h - 1, 3);
    g.fillStyle(0x0b0f26, 0.92).fillTriangle(-3, 0, 3, 0, 0, 4);
    const box = this.add.container(0, 0, [g, t]).setDepth(2000);
    this.bubbles.push({ box, who, until: this.time.now + ms });
    this.updateBubbles();
  }
  private updateBubbles() {
    const now = this.time.now;
    for (const b of this.bubbles) {
      if (now > b.until) { b.box.destroy(); continue; }
      const half = (b.box.getBounds().width || 40) / 2;
      b.box.setPosition(Math.round(Phaser.Math.Clamp(b.who.x, half + 2, this.W - half - 2)), Math.round(Math.max(44, b.who.headY)));
    }
    this.bubbles = this.bubbles.filter((b) => b.box.active);
  }
  clearBubbles() { this.bubbles.forEach((b) => b.box.destroy()); this.bubbles = []; }

  // a speaker for any sprite (feet at sprite.y), `head` px above the feet
  speaker(s: { x: number; y: number }, head: number): Speaker {
    return { get x() { return s.x; }, get headY() { return s.y - head; } };
  }

  // ---------------------------------------------------------------- script helpers
  wait(ms: number) {
    if (this.skipping && this.inCutscene) return Promise.resolve();
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }
  waitUntil(pred: () => boolean) { return new Promise<void>((resolve) => this.waiters.push({ pred, resolve })); }
  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    if (this.skipping) { this.tweens.add({ ...cfg, duration: 0, delay: 0 }); return Promise.resolve(); }
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  async line(who: Speaker, text: string, ms = 2000) {
    if (this.skipping) return;
    this.say(who, text, ms + 200);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && Controls.consume('attack', 300)));
    this.clearBubbles();
  }

  async caption(who: string, text: string, ms = 2400) {
    if (this.skipping) return;
    this.clearCaption();
    const W = this.W;
    const t = px(this, 0, 0, wrap(text, 52), 0xffffff).setCenterAlign().setOrigin(0.5, 0);
    const name = who ? px(this, 0, 0, who, COLORS.goldHi).setOrigin(0.5, 0) : null;
    const h = t.height + (name ? 14 : 8);
    const bg = this.add.rectangle(0, 0, W - 24, h, 0x070a1c, 0.85).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold);
    if (name) name.setY(4);
    t.setY(name ? 14 : 4);
    this.captionBox = this.add.container(W / 2, 212 - h, [bg, ...(name ? [name] : []), t]).setDepth(6000);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && Controls.consume('attack', 300)));
    this.clearCaption();
  }
  clearCaption() { this.captionBox?.destroy(); this.captionBox = undefined; }

  startCutscene() {
    this.inCutscene = true;
    this.fighting = false;
    this.events.emit('cutscene', true);
  }
  endCutscene() {
    this.clearBubbles();
    this.clearCaption();
    this.inCutscene = false;
    this.skipping = false;
    this.events.emit('cutscene', false);
    Controls.clear();
  }
  skipCutscene() { if (this.inCutscene) this.skipping = true; }

  stats(): MissionStats {
    return { score: this.score, timeMs: this.elapsed, kos: this.knockdownsScored, sips: this.sips, cans: 0, drivers: this.dodgeCounters };
  }
}

export { SUPER_COST };
