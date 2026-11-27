import Phaser from 'phaser';
import { BrawlerScene, BrawlerLook, MissionStats } from '../modes/brawler/BrawlerScene';
import { Actor } from '../modes/brawler/Actor';
import { Pharaoh } from '../modes/brawler/Pharaoh';
import { Audio } from '../core/audio';
import { Controls, Button } from '../core/controls';
import { COLORS } from '../core/config';
import { px, wrap } from '../core/text';
import { isTouch } from '../ui/UIScene';
import { MANE, MANE_10, PHARAOH, PIP_ARMY, REMEMBER, AQUIFER_FACT_10 } from './lines';

class Extra extends Actor {
  constructor(scene: BrawlerScene, tex: string, x: number, y: number) {
    super(scene, tex, x, y, 1);
    this.play('idle');
  }
}
// something that talks without a body (the crumpled can, the Pharaoh's voice from everywhere)
class Voice extends Actor {
  constructor(scene: BrawlerScene, x: number, y: number, h: number) {
    super(scene, 'shadow', x, y, 1);
    this.sprite.setVisible(false); this.shadow.setVisible(false);
    this.bubbleH = h;
  }
  render() { this.sprite.setVisible(false); this.shadow.setVisible(false); }
}

const LOOK: BrawlerLook = {
  bg: { sky: 'bgSky10', far: 'bgFar10', ground: 'bgGround10', wall: 'bgWall10' },
  enemies: { rusher: ['pipBrawl'], thrower: ['pipBrawl'], name: 'PIP', talk: PIP_ARMY },
  projectile: { tex: 'capShot', sfx: 'capPop', tint: 0x9ad4ff },
  hazard: { lights: false, label: 'RECYCLED! +200', sfx: 'rumble', warnSfx: 'alarm' },
  pothole: 'sandPit', table: 'columnStump', breakable: 'supplyCrate', breakSfx: 'crash',
};

const LEVEL_W10 = 1200;
const FACT_SPOT = { x: 676, y: 208 };
const BEAT = 0.5; // music_remember is 120 BPM
const PROMPT = 2; // a prompt every 2 beats (one a second)
const HITS_NEEDED = 8;

interface Wave { x: number; y: number; r: number; hit: Set<object>; g: Phaser.GameObjects.Graphics }
interface Drop { x: number; y: number; t: number; shadow: Phaser.GameObjects.Ellipse; img: Phaser.GameObjects.Image }

// Mission 10: THE SOURCE, part two. The Pharaoh of DeNile's Pip army through the cavern, the Pharaoh at the
// jar's empty cradle, then the drain ("Memphis, remember!" and the super on the beat), the crown, and the ending.
export class Mission10B extends BrawlerScene {
  look = LOOK;
  levelW = LEVEL_W10;
  private carry?: MissionStats;
  private ph?: Pharaoh;
  private waves: Wave[] = [];
  private drops: Drop[] = [];
  private factFound = false;
  private factCard?: Phaser.GameObjects.Sprite;
  private stuckTold = false;
  private beamTold = false;
  private captionBox?: Phaser.GameObjects.Container;
  private beatHits = 0;
  private perfects = 0;

  constructor() { super('Mission10B'); }

  init(data: { carry?: MissionStats }) { this.carry = data?.carry; }

  buildLevel() {
    this.missionId = 'm10-the-source';
    this.missionTitle = 'THE SOURCE';
    this.ph = undefined; this.waves = []; this.drops = []; this.factFound = false; this.stuckTold = false; this.beamTold = false;
    this.beatHits = 0; this.perfects = 0;
    for (const [x, y] of [[330, 196], [470, 172], [540, 204], [760, 186], [830, 168]]) this.addPothole(x, y);
    this.addTable(420, 186);
    this.addTable(660, 176);
    this.addTrashCan(290, 162, 'wings');
    this.addTrashCan(590, 160, 'can');
    this.addTrashCan(860, 162, 'bbq');
    this.spawnPickup('can', 200, 190);
    // the hidden Aquifer Fact card, tucked low in the water in front of the second column drum
    this.factCard = this.add.sprite(FACT_SPOT.x, FACT_SPOT.y, 'factCard').setOrigin(0.5, 1).setDepth(FACT_SPOT.y).play('factCard:glow');
    // light drifting up out of the water
    this.time.addEvent({ loop: true, delay: 240, callback: () => {
      const d = this.add.rectangle(Phaser.Math.Between(Math.floor(this.camX), Math.floor(this.camX + this.viewW)), 214, 1, 1, Math.random() < 0.25 ? 0xfff1a8 : 0x9fe8ff, 0.8).setDepth(-900);
      this.tweens.add({ targets: d, y: Phaser.Math.Between(60, 150), alpha: 0, duration: Phaser.Math.Between(2200, 3800), onComplete: () => d.destroy() });
    } });
  }

  async runScript() {
    await this.intro();
    // dev builds only: ?scene=Mission10B&part=boss skips the Pip waves
    const part = import.meta.env.DEV ? new URLSearchParams(location.search).get('part') : null;
    if (part) { this.player.x = LEVEL_W10 - this.viewW * 0.7 - 20; return this.bossOn(); }

    // ----- the Pip army comes down the cavern
    await this.advanceTo(240);
    this.lock(240 - this.viewW * 0.35);
    this.events.emit('tutorial', 'pips');
    await this.wave([
      { kind: 'rusher', side: 'right', y: 172 },
      { kind: 'rusher', side: 'right', y: 198, delay: 500 },
      { kind: 'thrower', side: 'right', y: 186, delay: 1200 },
      { kind: 'rusher', side: 'left', y: 180, delay: 2400 },
    ]);
    this.unlock();

    await this.advanceTo(560);
    this.lock(560 - this.viewW * 0.45);
    await this.wave([
      { kind: 'rusher', side: 'right', y: 168 },
      { kind: 'thrower', side: 'left', y: 200, delay: 300 },
      { kind: 'rusher', side: 'right', y: 194, delay: 900 },
      { kind: 'rusher', side: 'left', y: 174, delay: 1800 },
      { kind: 'thrower', side: 'right', y: 206, delay: 2600 },
      { kind: 'rusher', side: 'right', y: 184, delay: 3400 },
    ]);
    if (this.player.cans > 0) this.events.emit('tutorial', 'sip');
    this.unlock();

    await this.bossOn();
  }

  private async bossOn() {
    // ----- the cradle: the Pharaoh
    await this.advanceTo(LEVEL_W10 - this.viewW * 0.7);
    await this.bossFight();
    await this.remember();
    await this.beatSuper();
    await this.ending();
  }

  // ------------------------------------------------------------------ per-frame: the fact card and the slam hazards
  update(t: number, dt: number) {
    super.update(t, dt);
    if (this.paused || this.continuing) return;
    const p = this.player;
    if (!this.factFound && this.factCard && Math.abs(p.x - FACT_SPOT.x) < 14 && Math.abs(p.y - FACT_SPOT.y) < 10 && p.z < 14) this.findFact();
    this.updateHazards(Math.min(dt, 50) / 1000);
  }

  private findFact() {
    this.factFound = true;
    this.factCard?.destroy();
    this.sfx('pickup', 0.8);
    this.addScore(500);
    this.toast('AQUIFER FACT FOUND! +500');
    const W = this.viewW;
    const panel = this.add.image(0, 0, 'factPanel');
    const t = px(this, 8, 2, AQUIFER_FACT_10, 0xffffff).setOrigin(0.5, 0.5).setCenterAlign();
    const src = px(this, 0, 30, 'SOURCE: CAESER, MLGW', 0x9aa0c0).setOrigin(0.5, 0.5);
    const box = this.add.container(W / 2, 100, [panel, t, src]).setScrollFactor(0).setDepth(5600).setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 200 });
    this.time.delayedCall(4600, () => this.tweens.add({ targets: box, alpha: 0, duration: 400, onComplete: () => box.destroy() }));
  }

  // the flail slam: a ring runs along the water (jump it), crushed bottles rain down (step out from under the shadows)
  private slam(x: number, y: number) {
    this.waves.push({ x, y, r: 8, hit: new Set(), g: this.add.graphics() });
    const p = this.player;
    const spots = [[p.x, p.y], [p.x + Phaser.Math.Between(40, 70), Phaser.Math.Between(166, 204)], [p.x - Phaser.Math.Between(40, 70), Phaser.Math.Between(166, 204)]];
    spots.forEach(([rx, ry], i) => this.time.delayedCall(250 + i * 220, () => this.dropBottle(Phaser.Math.Clamp(rx, this.camX + 16, this.camX + this.viewW - 16), Phaser.Math.Clamp(ry, 162, 206))));
  }
  private dropBottle(x: number, y: number) {
    const shadow = this.add.ellipse(x, y, 4, 2, 0x000000, 0.45).setDepth(y - 1);
    const img = this.add.image(x, y - 220, 'bottle', 0).setScale(1.6).setOrigin(0.5, 1).setDepth(y);
    this.drops.push({ x, y, t: 1.0, shadow, img });
  }
  private updateHazards(dt: number) {
    const p = this.player;
    for (const w of this.waves) {
      w.r += 200 * dt;
      const ry = w.r * 0.24;
      w.g.clear().setDepth(w.y - 2);
      w.g.lineStyle(3, 0x9fe8ff, Math.max(0, 0.9 - w.r / 220)).strokeEllipse(w.x, w.y, w.r * 2, ry * 2);
      w.g.lineStyle(1, 0xfff1a8, Math.max(0, 0.7 - w.r / 220)).strokeEllipse(w.x, w.y, w.r * 2 + 6, ry * 2 + 2);
      for (const a of [p, ...this.enemies]) {
        if (!a.alive || w.hit.has(a) || a === this.ph) continue;
        const d = Math.hypot(a.x - w.x, (a.y - w.y) / 0.24);
        if (Math.abs(d - w.r) < 9 && a.z < 7) {
          w.hit.add(a);
          if (a.takeHit({ damage: a === p ? 10 : 25, dir: (a.x >= w.x ? 1 : -1), knockdown: true, knockback: 120, launch: 200, kind: 'car' })) { this.sfx('punchHeavy', 0.7); this.spark(a.x, a.y - 10, 0x9fe8ff); }
        }
      }
    }
    this.waves = this.waves.filter((w) => { if (w.r > 230) { w.g.destroy(); return false; } return true; });
    for (const r of this.drops) {
      r.t -= dt;
      const k = Math.max(0, 1 - r.t);
      r.shadow.setSize(4 + k * 16, 2 + k * 5);
      r.img.setY(r.y - 220 * Math.max(0, r.t) * Math.max(0, r.t));
      if (r.t <= 0 && r.img.active) {
        this.sfx('crinkle', 0.7); this.splash(r.x, r.y);
        for (const a of [p, ...this.enemies]) {
          if (!a.alive || a === this.ph) continue;
          if (Math.abs(a.x - r.x) < 15 && Math.abs(a.y - r.y) < 8 && a.z < 24) {
            if (a.takeHit({ damage: a === p ? 9 : 30, dir: (a.x >= r.x ? 1 : -1), knockdown: true, knockback: 60, launch: 120, kind: 'car' })) this.spark(a.x, a.y - 30, 0xffffff);
          }
        }
        r.img.destroy(); r.shadow.destroy();
      }
    }
    this.drops = this.drops.filter((r) => r.img.active);
  }

  // the drain beam: the lane lights up, then the jar fires down it
  private beamWarn(y: number) {
    if (!this.beamTold) { this.beamTold = true; this.events.emit('tutorial', 'beam'); }
    const lane = this.add.rectangle(0, y - 2, this.viewW, 16, 0x5ce1ff, 0.08).setOrigin(0, 0.5).setScrollFactor(0).setDepth(-900);
    this.tweens.add({ targets: lane, alpha: { from: 0.05, to: 0.2 }, yoyo: true, repeat: 5, duration: 90, onComplete: () => lane.destroy() });
  }
  private beam(y: number) {
    const ph = this.ph!;
    const x0 = ph.x + ph.facing * 22, cy = y - 34;
    const x1 = ph.facing > 0 ? this.camX + this.viewW + 10 : this.camX - 10;
    const g = this.add.graphics().setDepth(y + 1).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0x5ce1ff, 0.6).fillRect(Math.min(x0, x1), cy - 5, Math.abs(x1 - x0), 10);
    g.fillStyle(0xffffff, 0.9).fillRect(Math.min(x0, x1), cy - 2, Math.abs(x1 - x0), 4);
    this.tweens.add({ targets: g, alpha: 0, duration: 600, onComplete: () => g.destroy() });
    this.shake(200, 0.005);
    const p = this.player;
    const inLane = (a: Actor) => Math.abs(a.y - y) < 9 && (a.x - ph.x) * ph.facing > 0;
    if (p.alive && inLane(p) && p.state !== 'down') {
      if (p.takeHit({ damage: 14, dir: ph.facing, knockdown: true, knockback: 140, launch: 140, heavy: true, kind: 'punch' })) {
        if (p.cans > 0) { p.cans--; this.toast('A CAN GOT DOWNLOADED!'); } else this.toast('MEMORY DOWNLOADED!');
        ph.hp = Math.min(ph.maxHp, ph.hp + 12);
        this.events.emit('hud');
      }
    }
    // it doesn't care who's in the way
    for (const e of this.enemies) if (e !== ph && e.alive && inLane(e)) e.takeHit({ damage: 40, dir: ph.facing, knockdown: true, knockback: 160, launch: 160, kind: 'car' });
  }

  // ------------------------------------------------------------------ cutscene helpers
  private startCutscene() {
    this.inCutscene = true;
    this.events.emit('cutscene', true);
    const p = this.player;
    p.locked = true;
    if (p.inManeMode) p.endManeMode();
  }
  private async settlePlayer() {
    const p = this.player;
    await this.waitUntil(() => p.state === 'idle' || p.state === 'walk' || p.state === 'cutscene' || this.skipping);
    p.setState('cutscene');
    p.vx = p.vy = 0;
    p.play('idle');
  }
  private endCutscene() {
    const p = this.player;
    p.sprite.setVisible(true).clearTint().setScale(1).setAlpha(1).setAngle(0);
    p.locked = false;
    p.setState('idle');
    p.play('idle', false);
    this.clearBubbles();
    this.clearCaption();
    this.inCutscene = false;
    this.skipping = false;
    this.events.emit('cutscene', false);
    Controls.clear();
  }
  skipCutscene() { if (this.inCutscene) this.skipping = true; }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    if (this.skipping) { this.tweens.add({ ...cfg, duration: 0, delay: 0 }); return Promise.resolve(); }
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }
  private async caption(who: string, text: string, ms = 2400) {
    if (this.skipping) return;
    this.clearCaption();
    const W = this.viewW;
    const t = px(this, 0, 0, wrap(text, 52), 0xffffff).setCenterAlign().setOrigin(0.5, 0);
    const name = who ? px(this, 0, 0, who, COLORS.goldHi).setOrigin(0.5, 0) : null;
    const h = t.height + (name ? 14 : 8);
    const bg = this.add.rectangle(0, 0, W - 24, h, 0x070a1c, 0.85).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold);
    if (name) name.setY(4);
    t.setY(name ? 14 : 4);
    this.captionBox = this.add.container(W / 2, 212 - h, [bg, ...(name ? [name] : []), t]).setScrollFactor(0).setDepth(6000);
    Controls.consume('attack');
    const t0 = this.time.now;
    await this.waitUntil(() => this.skipping || this.time.now - t0 > ms || (this.time.now - t0 > 250 && (Controls.consume('attack', 300) || Controls.consume('jump', 300))));
    this.clearCaption();
  }
  private clearCaption() { this.captionBox?.destroy(); this.captionBox = undefined; }
  private extra(tex: string, x: number, y: number) {
    const e = new Extra(this, tex, x, y);
    this.extras.push(e);
    return e;
  }

  // ------------------------------------------------------------------ intro
  async intro() {
    this.startCutscene();
    const p = this.player;
    p.setState('cutscene');
    p.x = 120; p.y = 186;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    if (!this.skipping) {
      p.sprite.anims.stop(); p.sprite.setFrame(27);
      p.z = 120;
      this.sfx('jump', 0.4);
      await this.tween({ targets: p, z: 0, duration: 520, ease: 'Quad.easeIn' });
      this.sfx('land', 0.9); this.splash(p.x, p.y); this.dust(p.x, p.y); this.shake(120, 0.004);
    }
    p.z = 0; p.facing = 1; p.play('idle');
    Audio.music(this, 'music_pharaoh', 0.42);
    this.events.emit('hud');
    this.events.emit('banner', { top: 'MISSION 10', bottom: 'THE PHARAOH OF DENILE' });
    await this.wait(2300);
    await this.caption('THE PHARAOH (FROM EVERYWHERE)', 'COME TO THE CRADLE, KEEPER. BUT FIRST, MEET MY ARMY.', 3000);
    p.play('taunt', false);
    await this.line(p, 'PIPS? Y\'ALL STILL MAKIN\' THESE?', 2000);
    p.play('idle');
    this.endCutscene();
    this.startTime = this.time.now;
    this.time.delayedCall(400, () => this.events.emit('tutorial', 'move'));
  }

  // ------------------------------------------------------------------ the boss
  private async bossFight() {
    const arena = LEVEL_W10 - this.viewW;
    this.lock(arena);
    await this.waitUntil(() => Math.abs(this.camX - arena) < 2);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    await this.walkTo(p, arena + this.viewW * 0.3, 186, 70);
    p.facing = 1; p.play('idle');
    const ph = (this.ph = new Pharaoh(this, arena + this.viewW * 0.74, 180));
    ph.setState('scripted');
    ph.scriptControlled = true;
    ph.facing = -1;
    ph.z = 140;
    ph.play('call');
    this.enemies.push(ph);
    this.sfx('choir', 0.7);
    await this.tween({ targets: ph, z: 0, duration: 900, ease: 'Quad.easeIn' });
    ph.z = 0;
    this.sfx('punchHeavy', 1); this.sfx('splash', 1);
    this.splash(ph.x - 20, ph.y); this.splash(ph.x + 20, ph.y);
    this.shake(300, 0.012);
    this.boss = ph;
    ph.play('idle');
    this.events.emit('banner', { top: 'VICTOR + GIGAZ + THE JAR', bottom: 'THE PHARAOH OF DENILE' });
    await this.wait(2400);
    await this.line(ph, PHARAOH.name, 2400);
    p.play('taunt', false);
    await this.line(p, MANE.flaugin, 1400);

    ph.onSay = (l) => this.say(ph, l, 1300);
    ph.onSlam = (x, y) => this.slam(x, y);
    ph.onStuck = () => {
      this.say(ph, PHARAOH.stuck, 1400);
      if (!this.stuckTold) { this.stuckTold = true; this.toast('THE FLAIL IS STUCK! HIT IT NOW!'); }
    };
    ph.onBeamWarn = (y) => this.beamWarn(y);
    ph.onBeam = (y) => this.beam(y);
    ph.onCall = () => this.time.delayedCall(500, () => {
      if (ph.finale) return;
      this.spawnEnemy('rusher', 'left', Phaser.Math.Between(166, 200));
      this.spawnEnemy('thrower', 'right', Phaser.Math.Between(166, 200));
      if (ph.hp < ph.maxHp * 0.6) this.spawnEnemy('rusher', 'right', Phaser.Math.Between(166, 200));
    });
    const hitLines = PHARAOH.hit;
    let lastHitLine = 0;
    this.events.on('enemyHit', (e: unknown) => {
      if (e === ph && !ph.finale && this.time.now - lastHitLine > 6000 && Math.random() < 0.3) { lastHitLine = this.time.now; this.say(ph, Phaser.Utils.Array.GetRandom(hitLines), 1400); }
    });
    ph.scriptControlled = false;
    ph.setState('approach');
    this.endCutscene();
    this.events.emit('tutorial', 'pharaoh');

    await this.waitUntil(() => ph.finale);
  }

  // ------------------------------------------------------------------ the drain, and the city remembering
  private async remember() {
    const p = this.player, ph = this.ph!;
    this.addScore(2500);
    this.freezeFrame(300, COLORS.gold);
    // the Pips scatter
    for (const e of [...this.enemies]) if (e !== ph && e.alive) { e.hp = 0; e.takeHit({ damage: 99, dir: e.x < ph.x ? -1 : 1, knockdown: true, knockback: 160, launch: 200 }); }
    for (const w of this.waves) w.g.destroy();
    this.waves = [];
    this.startCutscene();
    this.skipping = false;
    await this.waitUntil(() => p.state === 'idle' || p.state === 'walk' || p.state === 'cutscene');
    p.setState('cutscene'); p.vx = p.vy = 0; p.play('idle');
    this.boss = null;
    Audio.stopMusic();
    ph.facing = p.x >= ph.x ? 1 : -1;
    p.facing = ph.x >= p.x ? 1 : -1;
    ph.sprite.play('pharaoh:idle');
    await this.line(ph, PHARAOH.enough, 1600);

    // the drain: Mane lifted, the light pulled out of him into the jar
    ph.sprite.play('pharaoh:drain');
    this.sfx('drain', 0.9);
    const stream = this.add.graphics().setDepth(3001).setBlendMode(Phaser.BlendModes.ADD);
    const parts: { k: number; s: number; c: number; w: number }[] = [];
    const drainEv = this.time.addEvent({ loop: true, delay: 16, callback: () => {
      for (let i = 0; i < 3; i++) parts.push({ k: 0, s: 0.014 + Math.random() * 0.01, c: Math.random() < 0.5 ? 0xfff1a8 : 0x7fd8ff, w: (Math.random() - 0.5) * 24 });
      stream.clear();
      const sx = p.x, sy = p.y - p.z - 26, ex = ph.x + ph.facing * 4, ey = ph.y - 74;
      for (const q of parts) {
        q.k += q.s;
        stream.fillStyle(q.c, 0.9 * (1 - q.k * 0.5)).fillRect(sx + (ex - sx) * q.k, sy + (ey - sy) * q.k - Math.sin(q.k * Math.PI) * (20 + q.w), 2, 2);
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].k >= 1) parts.splice(i, 1);
    } });
    p.play('hurt', false);
    p.sprite.setTint(0x7fa8ff);
    const hp0 = p.hp;
    this.tweens.addCounter({ from: hp0, to: 1, duration: 2600, onUpdate: (tw) => { p.hp = Math.round(tw.getValue() ?? 1); this.events.emit('hud'); } });
    this.tweens.add({ targets: p, z: 26, duration: 900, ease: 'Sine.easeOut' });
    await this.caption('THE PHARAOH OF DENILE', PHARAOH.drain, 3000);
    await this.wait(400);
    drainEv.remove(); stream.destroy();
    p.hp = 1;

    // he hits the water a crumpled can
    const dark = this.add.rectangle(0, 0, this.viewW, 216, 0x081430, 0).setOrigin(0).setScrollFactor(0).setDepth(1500);
    await this.tween({ targets: p, z: 0, duration: 300, ease: 'Quad.easeIn' });
    p.sprite.setVisible(false); p.shadow.setVisible(false);
    const can = this.add.sprite(p.x, p.y + 2, 'crumpledCan', 0).setOrigin(0.5, 0.85).setDepth(p.y + 1);
    this.sfx('crumple', 0.9); this.splash(p.x, p.y);
    ph.sprite.play('pharaoh:idle');
    this.tween({ targets: dark, fillAlpha: 0.55, duration: 1200 });
    await this.wait(1400);
    await this.line(ph, 'THERE. A KING WITH NO KEEPER. A CITY WITH NO MEMORY.', 2800);
    await this.wait(1400);

    // a drip. a ripple. then the faces in the water, one by one.
    const ripple = (x: number, y: number, c = 0x9fe8ff) => {
      const g = this.add.ellipse(x, y, 6, 2).setStrokeStyle(1, c, 0.9).setDepth(1600);
      this.tweens.add({ targets: g, scaleX: 8, scaleY: 6, alpha: 0, duration: 1100, onComplete: () => g.destroy() });
    };
    this.sfx('splash', 0.4);
    ripple(p.x, p.y);
    await this.wait(900);
    const v = this.viewBounds();
    const reflections: Phaser.GameObjects.Sprite[] = [];
    const spots = [0.12, 0.88, 0.3, 0.7, 0.5];
    for (let i = 0; i < REMEMBER.length; i++) {
      const r = REMEMBER[i];
      // they rise out of the water behind the fight, standing on the far waterline
      const x = v.left + this.viewW * spots[i], y = 152 + (i % 2) * 4;
      const s = this.add.sprite(x, y, r.tex, 0).setOrigin(0.5, 61 / 64).setDepth(1601).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      if (r.tex === 'glowDrifter') s.setScale(0.9);
      reflections.push(s);
      ripple(x, y, 0xfff1a8);
      this.sfx('mural', 0.5);
      s.y += 20;
      this.tween({ targets: s, alpha: 0.85, y, duration: 900, ease: 'Sine.easeOut' });
      await this.caption(r.who, r.line, 2800);
    }
    // the musicians, and Pothole
    for (const [i, tex] of (['ghostBlues', 'ghostSoul', 'ghostRock', 'glowDog'] as const).entries()) {
      const x = v.left + this.viewW * (0.2 + i * 0.2), y = 142;
      const s = this.add.sprite(x, y, tex, 0).setOrigin(0.5, 61 / 64).setDepth(1600).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setScale(tex === 'glowDog' ? 1 : 0.8);
      if (tex !== 'glowDog') s.play(`${tex}:play`);
      reflections.push(s);
      ripple(x, y, 0xfff1a8);
      this.tween({ targets: s, alpha: 0.7, duration: 400 });
      await this.wait(300);
    }
    this.sfx('bark', 0.7);
    await this.wait(500);
    // everybody
    this.sfx('choir', 0.9);
    this.cameras.main.flash(500, 255, 241, 168);
    reflections.forEach((s) => this.tweens.add({ targets: s, alpha: 1, duration: 200, yoyo: true, repeat: 2 }));
    await this.caption('ALL OF MEMPHIS', 'MEMPHIS, REMEMBER!', 2600);
    ph.sprite.play('pharaoh:hurt');
    await this.line(ph, PHARAOH.deleted, 2600);
    const canV = new Voice(this, can.x, can.y, 30);
    this.extras.push(canV);
    can.setFrame(1);
    this.sfx('shine', 0.6);
    await this.line(canV, MANE_10.stillThirsty, 2400);

    // the can pops back into shape
    this.tween({ targets: dark, fillAlpha: 0, duration: 500 });
    this.cameras.main.flash(400, 255, 233, 160);
    this.sfx('burst', 0.9); this.sfx('maneMode', 0.8);
    can.destroy(); canV.destroy();
    p.sprite.setVisible(true).clearTint(); p.shadow.setVisible(true);
    p.z = 30;
    p.play('idleShades', false);
    await this.tween({ targets: p, z: 0, duration: 350, ease: 'Quad.easeIn' });
    this.splash(p.x, p.y);
    this.tweens.addCounter({ from: 1, to: p.maxHp, duration: 800, onUpdate: (tw) => { p.hp = Math.round(tw.getValue() ?? p.maxHp); this.events.emit('hud'); } });
    await this.line(p, 'Y\'ALL HEARD \'EM.', 1600);
    dark.destroy();
    this.reflections = reflections;
  }
  private reflections: Phaser.GameObjects.Sprite[] = [];

  // ------------------------------------------------------------------ the super, on the beat: one full-power hit every time the bell lands
  private async beatSuper() {
    const p = this.player, ph = this.ph!;
    const W = this.viewW;
    p.sprite.setTint(0xfff1a8);
    Audio.music(this, 'music_remember', 0.6, true);
    const ui = this.add.container(0, 0).setScrollFactor(0).setDepth(5800);
    const cx = W / 2, cy = 64;
    const target = this.add.circle(cx, cy, 11).setStrokeStyle(2, COLORS.gold);
    const ring = this.add.circle(cx, cy, 40).setStrokeStyle(2, COLORS.goldHi);
    const label = px(this, cx, cy - 4, 'HIT', COLORS.goldHi).setOrigin(0.5, 0);
    const how = px(this, cx, 18, isTouch() ? 'TAP ON THE BEAT!' : 'PRESS Z ON THE BEAT!', 0xffffff).setOrigin(0.5, 0);
    const count = px(this, cx, 88, `0/${HITS_NEEDED}`, COLORS.gold).setOrigin(0.5, 0);
    const judge = px(this, cx, 100, '', COLORS.goldHi, 2).setOrigin(0.5, 0).setAlpha(0);
    ui.add([target, ring, label, how, count, judge]);
    // a tap anywhere on the screen counts too
    let tapped = false;
    const onTap = () => { tapped = true; };
    this.input.on('pointerdown', onTap);
    Controls.clear();
    const used = new Set<number>();
    let pos = 0, lastPos = -1, loops = 0, lastBeat = -1;
    const pressed = () => {
      let any = tapped; tapped = false;
      for (const b of ['attack', 'jump', 'flex', 'sip'] as Button[]) if (Controls.consume(b, 120)) any = true;
      return any;
    };
    const combo = ['punch1', 'punch2', 'punch3', 'kick'];
    let started = this.time.now;
    await new Promise<void>((done) => {
      const ev = this.time.addEvent({ loop: true, delay: 10, callback: () => {
        const raw = Audio.musicPos();
        if (raw !== null) {
          if (raw < lastPos - 1) loops++;
          lastPos = raw;
          pos = loops * 32 + raw; // the loop is 16 bars = 32 seconds
        } else pos = (this.time.now - started) / 1000;
        const period = BEAT * PROMPT;
        const next = Math.ceil(pos / period) * period;
        const k = Math.max(0, Math.min(1, (next - pos) / period));
        ring.setRadius(11 + 30 * k).setAlpha(1 - k * 0.5);
        const beatIdx = Math.floor(pos / BEAT);
        if (beatIdx !== lastBeat) { lastBeat = beatIdx; this.reflections.forEach((s) => s.active && s.setAlpha(beatIdx % 2 ? 0.6 : 1)); target.setScale(1.25); this.time.delayedCall(90, () => target.active && target.setScale(1)); }
        if (this.skipping) { this.beatHits = HITS_NEEDED; }
        if (pressed()) {
          const near = Math.round(pos / period);
          const d = Math.abs(pos - near * period);
          if (used.has(near) || d > 0.22) {
            judge.setText('OFF BEAT').setTint(0x9aa0c0).setAlpha(1);
          } else {
            used.add(near);
            const perfect = d <= 0.1;
            if (perfect) this.perfects++;
            this.beatHits++;
            judge.setText(perfect ? 'PERFECT!' : 'GOOD!').setTint(perfect ? COLORS.goldHi : 0xffffff).setAlpha(1);
            this.addScore(perfect ? 300 : 150);
            count.setText(`${this.beatHits}/${HITS_NEEDED}`);
            // Mane flies in and lands it
            const anim = this.beatHits >= HITS_NEEDED ? 'kick' : combo[(this.beatHits - 1) % 3];
            p.facing = ph.x >= p.x ? 1 : -1;
            const tx = ph.x - p.facing * 34;
            this.tweens.add({ targets: p, x: tx, y: ph.y + 2, duration: 90 });
            p.play(anim, false);
            this.afterimage(p.sprite);
            this.sfx('beatHit', 0.9);
            this.spark(ph.x - p.facing * 10, ph.y - 60, perfect ? COLORS.goldHi : 0xffffff);
            ph.sprite.setFrame(Number(this.anims.get('pharaoh:hurt').frames[this.beatHits % 2].frame.name));
            ph.sprite.setTintFill(0xffffff);
            this.time.delayedCall(70, () => ph.sprite.active && ph.sprite.clearTint());
            this.shake(80, perfect ? 0.008 : 0.004);
            if (perfect) this.hitstop(70);
            this.time.delayedCall(260, () => { if (this.beatHits < HITS_NEEDED) p.play('idleShades', false); });
          }
          this.tweens.killTweensOf(judge);
          this.tweens.add({ targets: judge, alpha: 0, delay: 350, duration: 250 });
        }
        if (this.beatHits >= HITS_NEEDED) { ev.remove(); done(); }
      } });
    });
    this.input.off('pointerdown', onTap);
    ui.destroy();
    // the last one: the whole city in it
    p.play('kick', false);
    this.say(p, MANE.super, 1400);
    this.freezeFrame(500, COLORS.gold);
    this.sfx('punchHeavy', 1); this.sfx('choir', 0.8);
    this.shake(500, 0.014);
    ph.sprite.setFrame(Number(this.anims.get('pharaoh:knockdown').frames[1].frame.name));
    this.tweens.add({ targets: ph, x: ph.x + p.facing * 40, duration: 400, ease: 'Quad.easeOut' });
    this.reflections.forEach((s) => this.tweens.add({ targets: s, alpha: 0, duration: 1200, onComplete: () => s.destroy() }));
    this.reflections = [];
    this.toast(this.perfects >= HITS_NEEDED ? 'ALL PERFECT! +1000' : 'MEMPHIS REMEMBERED!');
    if (this.perfects >= HITS_NEEDED) this.addScore(1000);
    p.sprite.clearTint();
    await this.wait(1600);
  }

  // ------------------------------------------------------------------ the crown, the pour, and the morning after
  private choose(): Promise<'crown' | 'pour'> {
    const W = this.viewW;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(6100);
    const opt = (x: number, label: string, key: 'crown' | 'pour') => {
      const b = this.add.rectangle(x, 120, 130, 26, 0x070a1c, 0.9).setStrokeStyle(1, key === 'pour' ? COLORS.goldHi : COLORS.gold).setInteractive({ useHandCursor: true });
      const t = px(this, x, 116, label, key === 'pour' ? COLORS.goldHi : 0xffffff).setOrigin(0.5, 0);
      layer.add([b, t]);
      return b;
    };
    layer.add(px(this, W / 2, 92, 'WHAT DOES MANE DO?', 0xffffff).setOrigin(0.5, 0));
    const a = opt(W / 2 - 72, 'TAKE THE CROWN', 'crown');
    const b = opt(W / 2 + 72, 'POUR IT OUT', 'pour');
    if (!isTouch()) layer.add(px(this, W / 2, 140, 'LEFT / RIGHT TO PICK, Z TO CHOOSE', 0x9aa0c0).setOrigin(0.5, 0));
    let sel: 'crown' | 'pour' = 'pour';
    const mark = () => { a.setStrokeStyle(sel === 'crown' ? 2 : 1, sel === 'crown' ? COLORS.goldHi : COLORS.gold); b.setStrokeStyle(sel === 'pour' ? 2 : 1, sel === 'pour' ? COLORS.goldHi : COLORS.gold); };
    mark();
    return new Promise((resolve) => {
      let done = false;
      const finish = (k: 'crown' | 'pour') => { if (done) return; done = true; this.sfx('select', 0.8); kb?.off('keydown', onKey); layer.destroy(); resolve(k); };
      a.on('pointerdown', () => finish('crown'));
      b.on('pointerdown', () => finish('pour'));
      const kb = this.input.keyboard;
      const onKey = (e: KeyboardEvent) => {
        const k = e.key.toUpperCase();
        if (k === 'ARROWLEFT' || k === 'A') { sel = 'crown'; mark(); }
        else if (k === 'ARROWRIGHT' || k === 'D') { sel = 'pour'; mark(); }
        else if (k === 'Z' || k === 'J' || k === 'ENTER' || k === ' ') finish(sel);
      };
      kb?.on('keydown', onKey);
      if (this.skipping) finish('pour');
    });
  }

  async ending() {
    const p = this.player, ph = this.ph!;
    this.skipping = false;
    p.setState('cutscene'); p.play('idle');
    p.facing = ph.x >= p.x ? 1 : -1;
    await this.walkTo(p, ph.x - p.facing * 56, ph.y + 4, 60);
    p.facing = ph.x >= p.x ? 1 : -1; p.play('idle');
    ph.facing = (-p.facing) as 1 | -1;
    // it kneels, and holds out the crown
    ph.sprite.play('pharaoh:kneel');
    Audio.music(this, 'music_lost', 0.35);
    await this.wait(800);
    ph.sprite.play('pharaoh:crown');
    this.sfx('shine', 0.7);
    await this.line(ph, PHARAOH.offer, 2600);
    await this.line(ph, PHARAOH.offer2, 3000);
    const crown = this.add.image(ph.x + ph.facing * 28, ph.y - 70, 'crown').setScale(1.5).setDepth(ph.y + 10);
    const crownGlow = this.add.ellipse(crown.x, crown.y, 30, 30, 0xf5c542, 0.25).setDepth(ph.y + 9).setBlendMode(Phaser.BlendModes.ADD);
    this.tween({ targets: [crown, crownGlow], x: (p.x + ph.x) / 2, y: ph.y - 56, duration: 1200, ease: 'Sine.easeInOut' });
    ph.sprite.play('pharaoh:kneel');
    await this.wait(1000);

    const pick = await this.choose();
    if (pick === 'crown') {
      await this.walkTo(p, p.x + p.facing * 12, p.y, 30);
      p.play('idle');
      await this.wait(700);
      await this.line(p, '...NAH.', 1400);
    } else {
      this.addScore(1000);
      this.toast('KEEPER BY CHOICE! +1000');
    }
    await this.line(p, MANE_10.pour, 2800);
    p.play('idleShades', false);
    this.sfx('shine', 0.7);
    await this.line(p, MANE_10.keeper, 2800);

    // he pours himself into the aquifer
    p.play('sip', false);
    await this.wait(500);
    this.sfx('pour', 0.9);
    const pourEv = this.time.addEvent({ loop: true, delay: 30, callback: () => {
      const d = this.add.rectangle(p.x + p.facing * 8 + Phaser.Math.Between(-2, 2), p.y - p.z - 30, 2, 3, Math.random() < 0.6 ? 0xfff1a8 : 0x5ce1ff, 1).setDepth(p.y + 5);
      this.tweens.add({ targets: d, y: p.y, x: d.x + p.facing * 6, duration: 420, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    } });
    this.tween({ targets: p.sprite, angle: p.facing * 100, duration: 900 });
    await this.wait(1200);
    // gold spreads across the water
    const gold = this.add.ellipse(p.x, p.y, 10, 4, 0xf5c542, 0.6).setDepth(-900).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: gold, scaleX: 120, scaleY: 40, alpha: 0.25, duration: 3000 });
    await this.tween({ targets: p.sprite, alpha: 0, duration: 1400 });
    pourEv.remove();
    p.shadow.setVisible(false);
    this.tween({ targets: [crown, crownGlow], y: p.y + 4, alpha: 0, duration: 1200, ease: 'Quad.easeIn' });
    this.cameras.main.flash(800, 255, 241, 168);
    this.sfx('portal', 0.8); this.sfx('choir', 0.6);
    // the Pharaoh melts into rain; what's left is Victor
    await this.line(ph, PHARAOH.fade, 2400);
    const melt = this.anims.get('pharaoh:melt').frames;
    for (const f of melt) { ph.sprite.setFrame(Number(f.frame.name)); this.sfx('splash', 0.4); await this.wait(500); }
    await this.tween({ targets: ph.sprite, alpha: 0, duration: 600 });
    ph.sprite.setVisible(false); ph.shadow.setVisible(false);
    const vic = this.extra('victor', ph.x, ph.y);
    vic.sprite.anims.stop();
    vic.sprite.setFrame(Number(this.anims.get('victor:knockdown').frames[1].frame.name));
    await this.wait(900);
    vic.sprite.setFrame(Number(this.anims.get('victor:getup').frames[0].frame.name));
    vic.bubbleH = 50;
    await this.line(vic, '...WHERE AM I? WHO... AM I?', 2600);
    await this.caption('', 'THE WATER REFILLS. AND ACROSS MEMPHIS...', 2600);

    // ----- the city remembers
    const W = this.viewW;
    const montage = this.add.container(0, 0).setScrollFactor(0).setDepth(5500);
    const panel = async (tex: string, scale: number, cap: string) => {
      montage.removeAll(true);
      montage.add(this.add.rectangle(0, 0, W, 216, 0x0b1430).setOrigin(0));
      const img = this.add.image(W / 2, 86, tex, 2).setScale(scale);
      montage.add(img);
      await this.wait(700);
      this.cameras.main.flash(250, 255, 241, 168);
      this.sfx('remember', 0.7);
      img.setFrame(0);
      await this.caption('', cap, 2400);
    };
    await panel('streetSign', 2, 'THE STREET SIGNS REMEMBER THEIR NAMES.');
    await panel('bbqBoard', 1.4, 'THE RIB SPOT REMEMBERS EVERY RECIPE.');
    await panel('pitSign', 2.4, 'AND UNCLE T\'S PIT REMEMBERS ITS NAME.');
    montage.destroy();

    // ----- the next morning, at the counter
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(450, r));
    Audio.music(this, 'music_credits', 0.4);
    const room = this.add.container(0, 0).setScrollFactor(0).setDepth(5500);
    room.add(this.add.image(W / 2, 0, 'pitBack').setOrigin(0.5, 0));
    const unc = this.add.sprite(W / 2 - 110, 160, 'uncleT').setOrigin(0.5, 61 / 64).setScale(1.5).play('uncleT:idle');
    const mal = this.add.sprite(W / 2 + 110, 160, 'malik').setOrigin(0.5, 61 / 64).setScale(1.5).setFlipX(true).play('malik:idle');
    room.add([unc, mal]);
    room.add(this.add.image(W / 2, 122, 'counterStuff').setOrigin(0.5, 0));
    room.add(this.add.image(W / 2, 146, 'pitCounter').setOrigin(0.5, 0));
    const fresh = this.add.sprite(W / 2, 148, 'canPickup').setOrigin(0.5, 1).setScale(1.5).play('canPickup:glow');
    room.add(fresh);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    await this.caption('', 'THE NEXT MORNING. UNCLE T\'S PIT, PARK & AIRWAYS.', 2600);
    unc.play('uncleT:talk');
    await this.caption('UNCLE T', '...NEPHEW. YOU HEAR THAT?', 2000);
    unc.play('uncleT:idle');
    this.sfx('portal', 0.6);
    this.tween({ targets: fresh, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 6 });
    await this.wait(900);
    this.cameras.main.flash(300, 255, 241, 168);
    this.sfx('burst', 0.9);
    fresh.destroy();
    const mane = this.add.sprite(W / 2, 148, 'mane').setOrigin(0.5, 61 / 64).setScale(1.5).play('mane:taunt');
    room.add(mane);
    this.tween({ targets: mane, y: 140, duration: 200, yoyo: true });
    await this.caption('MANE', MANE.start, 2200);
    mane.play('mane:idle');
    mal.play('malik:scared');
    await this.caption('MALIK', 'MANE!!!', 1400);
    mal.play('malik:idle');
    unc.play('uncleT:talk');
    await this.caption('UNCLE T', 'TOOK YOU LONG ENOUGH, LITTLE CAN.', 2400);
    unc.play('uncleT:idle');
    await this.caption('MANE', 'UNC. YOU REMEMBER ME?', 2000);
    unc.play('uncleT:talk');
    await this.caption('UNCLE T', 'BOY, I REMEMBER EVERYTHING. THAT WATER BEEN FILTERIN\' THROUGH THE SAND FOR TWO THOUSAND YEARS. TOOK ONE CAN TO REMIND THIS CITY.', 4200);
    unc.play('uncleT:idle');
    mane.play('mane:victory');
    this.sfx('shine', 0.7);
    await this.caption('MANE', 'ROYAL BY NATURE.', 2200);
    mane.play('mane:idleShades');
    await this.caption('MALIK AND UNCLE T', 'KEEPER BY CHOICE.', 2400);

    this.cameras.main.fadeOut(900, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(950, r));
    this.scene.start('Finale', { stats: this.stats() });
  }

  stats(): MissionStats {
    const s = super.stats();
    const c = this.carry;
    // Pips recycled (the Pharaoh doesn't count), and the hits that landed on the beat
    const kos = Math.max(0, s.kos);
    if (!c) return { ...s, kos, drivers: this.beatHits };
    return { score: s.score + c.score, timeMs: s.timeMs + c.timeMs, kos, sips: s.sips + c.sips, cans: s.cans, drivers: this.beatHits };
  }
}
