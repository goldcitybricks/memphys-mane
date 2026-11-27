import Phaser from 'phaser';
import { BrawlerScene } from '../modes/brawler/BrawlerScene';
import { Actor, HitInfo } from '../modes/brawler/Actor';
import { Shiesty } from '../modes/brawler/Shiesty';
import { Car } from '../modes/brawler/Props';
import { Audio } from '../core/audio';
import { Controls } from '../core/controls';
import { LEVEL_W } from '../core/assets';
import { COLORS } from '../core/config';
import { MANE } from './lines';

// A non-fighting character used in cutscenes (Malik, Uncle T, O.G., Pothole).
class Extra extends Actor {
  constructor(scene: BrawlerScene, tex: string, x: number, y: number) {
    super(scene, tex, x, y, 1);
    this.play('idle');
  }
}

// Mission 1: THE SIP. The alley behind Uncle T's Pit, Park & Airways, Orange Mound, night.
export class Mission1 extends BrawlerScene {
  private maskGag = false;
  private malik?: Extra;
  private uncle?: Extra;

  constructor() { super('Mission1'); }

  buildLevel() {
    this.missionId = 'm1-the-sip';
    this.missionTitle = 'THE SIP';
    this.maskGag = false;
    // set dressing
    this.add.image(545, 150, 'smoker').setOrigin(0.5, 1).setDepth(150);
    const smoke = this.add.sprite(563, 104, 'smoke').play('smoke:rise').setDepth(149).setAlpha(0.8);
    this.time.addEvent({ loop: true, delay: 1600, callback: () => { const s = this.add.sprite(563 + Phaser.Math.Between(-2, 2), 104, 'smoke').play('smoke:rise').setDepth(149).setAlpha(0.7); this.tweens.add({ targets: s, y: 60, alpha: 0, duration: 2400, onComplete: () => s.destroy() }); } });
    void smoke;
    this.addTable(336, 178);
    this.addTable(1420, 184);

    // potholes (jump them)
    for (const [x, y] of [[430, 192], [540, 170], [760, 200], [1050, 176], [1330, 190], [1560, 168], [1620, 200], [2000, 184]]) this.addPothole(x, y);
    // trash cans with goodies
    this.addTrashCan(470, 162, 'bbq');
    this.addTrashCan(880, 160, 'can');
    this.addTrashCan(1180, 162, 'wings');
    this.addTrashCan(1500, 161, 'can');
    this.addTrashCan(1940, 160, 'bbq');
    this.addTrashCan(2130, 162, 'can');
    // loose cans on the ground
    this.spawnPickup('can', 640, 186);
    this.spawnPickup('can', 1640, 180);
  }

  async runScript() {
    await this.intro();
    Audio.music(this, 'music_pitstop', 0.42);
    this.player.locked = false;

    // ----- Wave 1: the two who cornered Malik
    this.lock(0);
    this.time.delayedCall(600, () => this.events.emit('tutorial', 'move'));
    for (const e of this.enemies) { e.scriptControlled = false; e.entering = false; }
    await this.waitUntil(() => this.enemies.every((e) => !e.alive));
    this.unlock();

    // ----- walk: potholes, first trash can, a loose can
    this.events.emit('tutorial', 'jump');
    await this.advanceTo(600);
    this.lock(Math.max(0, 600 - this.viewW * 0.5));
    await this.wave([
      { kind: 'rusher', side: 'right', y: 170 },
      { kind: 'rusher', side: 'left', y: 196, delay: 700 },
      { kind: 'thrower', side: 'right', y: 186, delay: 1500 },
    ]);
    if (this.player.cans > 0) this.events.emit('tutorial', 'sip');
    this.unlock();

    // ----- drive-outs
    await this.advanceTo(1000);
    this.lock(Math.max(0, 1000 - this.viewW * 0.5));
    this.events.emit('tutorial', 'car');
    await this.wait(600);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), -1, 'carAltimaGrey');
    await this.wait(400);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), 1, 'carInfiniti', 900);
    // ----- Wave 3 with a car through the middle
    const w3 = this.wave([
      { kind: 'rusher', side: 'right' },
      { kind: 'rusher', side: 'left', delay: 400 },
      { kind: 'thrower', side: 'right', delay: 900 },
      { kind: 'rusher', side: 'right', delay: 2500 },
    ]);
    this.time.delayedCall(5200, () => { if (this.enemies.length > 1) this.driveBy(Phaser.Math.Between(166, 200), -1, 'carAltimaBlack'); });
    await w3;
    this.unlock();

    // ----- Wave 4: the crew's last stand by the strip mall
    await this.advanceTo(1800);
    this.lock(Math.max(0, 1800 - this.viewW * 0.5));
    const w4a = this.wave([
      { kind: 'rusher', side: 'right', y: 168 },
      { kind: 'thrower', side: 'left', y: 200, delay: 300 },
      { kind: 'rusher', side: 'right', y: 196, delay: 800 },
    ]);
    this.time.delayedCall(3500, () => this.driveBy(Phaser.Math.Between(166, 200), 1, 'carAltimaGrey'));
    await w4a;
    const w4b = this.wave([
      { kind: 'rusher', side: 'left', y: 180 },
      { kind: 'rusher', side: 'right', y: 170, delay: 200 },
      { kind: 'thrower', side: 'right', y: 200, delay: 1200 },
    ]);
    this.time.delayedCall(4000, () => { if (this.enemies.length > 0) this.driveBy(Phaser.Math.Between(166, 200), -1, 'carInfiniti'); });
    await w4b;
    this.unlock();

    await this.advanceTo(LEVEL_W - this.viewW * 0.6);
    await this.ending();
  }

  // ------------------------------------------------------------------ intro
  async intro() {
    this.inCutscene = true;
    this.events.emit('cutscene', true);
    Audio.music(this, 'music_backdoor', 0.35);
    const p = this.player;
    p.locked = true;
    p.setState('cutscene');
    p.sprite.setVisible(false);
    p.x = 150; p.y = 182;

    const malik = (this.malik = new Extra(this, 'malik', 187, 156));
    this.extras.push(malik);
    const g1 = new Shiesty(this, 'rusher', this.viewW + 40, 172, 'shiestyRed');
    const g2 = new Shiesty(this, 'rusher', this.viewW + 70, 194, 'shiestyGreen');
    for (const g of [g1, g2]) { g.scriptControlled = true; g.entering = false; g.setState('scripted'); g.facing = -1; this.enemies.push(g); }

    await this.wait(500);
    await this.walkTo(malik, 150, 182, 50);
    malik.facing = 1;
    const walkGoon = (g: Shiesty, x: number, y: number) => this.walkTo(g, x, y, 70);
    await Promise.all([walkGoon(g1, 260, 174), walkGoon(g2, 286, 194)]);
    g1.facing = g2.facing = -1;
    await this.line(g1, 'AY, WHATCHU GOT IN THE BAG?', 1800);
    malik.play('scared');
    await this.line(malik, "IT'S JUST TRASH, MANE!", 1500);
    await this.line(g2, 'THEN RUN THAT TRASH.', 1500);

    const uncle = (this.uncle = new Extra(this, 'uncleT', 187, 152));
    this.extras.push(uncle);
    uncle.facing = -1;
    await this.line(uncle, 'NEPHEW! CATCH!', 1200);
    uncle.play('toss', false);
    await this.wait(280);
    if (!this.skipping) {
      const can = this.add.image(uncle.x - 6, uncle.y - 40, 'hudCan').setDepth(3000);
      this.tweens.add({ targets: can, x: malik.x + 6, duration: 600 });
      this.tweens.add({ targets: can, y: { from: uncle.y - 40, to: uncle.y - 70 }, duration: 300, yoyo: true, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: can, angle: 720, duration: 600, onComplete: () => can.destroy() });
      await this.wait(620);
    }
    this.sfx('pickup', 0.5);
    uncle.play('talk');
    await this.line(uncle, "THIS AIN'T JUST WATER, NEPHEW. THIS IS REMEMBRANCE IN A CAN.", 3200);
    uncle.play('idle');

    // the sip
    malik.play('sip', false);
    await this.wait(700);
    this.sfx('sip', 0.8);
    await this.wait(700);
    if (!this.skipping) {
      // the alley flickers into ancient Egypt for one frame
      const eg = this.add.image(0, 0, 'egypt').setOrigin(0).setScrollFactor(0).setDepth(5000);
      this.sfx('portal', 0.4);
      await this.wait(140);
      eg.destroy();
      await this.wait(120);
      const eg2 = this.add.image(0, 0, 'egypt').setOrigin(0).setScrollFactor(0).setDepth(5000).setAlpha(0.6);
      await this.wait(60);
      eg2.destroy();
    }
    // Mane bursts out of the can
    this.sfx('burst', 0.9);
    this.cameras.main.flash(300, 255, 241, 168);
    this.shake(200, 0.006);
    for (let i = 0; i < 6; i++) {
      const s = this.add.sprite(p.x + Phaser.Math.Between(-16, 16), p.y - Phaser.Math.Between(6, 30), 'smoke').play('smoke:rise').setDepth(3000);
      this.tweens.add({ targets: s, alpha: 0, y: s.y - 20, duration: 900, onComplete: () => s.destroy() });
    }
    this.spark(p.x, p.y - 26, COLORS.goldHi);
    p.sprite.setVisible(true);
    malik.x = 122; malik.y = 170; malik.facing = 1;
    malik.play('scared');
    p.facing = 1;
    p.play('taunt', false);
    this.events.emit('hud');
    await this.line(p, MANE.start, 2200);
    this.events.emit('banner', { top: 'MISSION 1', bottom: 'THE SIP' });
    await this.line(malik, 'UNCLE T! THE CAN TALKIN\'!', 1500);
    await this.line(uncle, 'MM-HM. BEEN WAITIN\' ON HIM.', 1700);
    await this.line(g1, "A TALKIN' CAN?!", 1200);
    p.play('idle');
    await this.line(p, MANE.trashTalkReply, 1500);

    // Malik and Uncle T head inside
    malik.play('walk');
    const inside = Promise.all([this.walkTo(malik, 187, 152, 90), this.walkTo(uncle, 187, 150, 1)]);
    await inside;
    malik.destroy(); uncle.destroy();
    this.extras = [];

    // reset to a clean state (covers skip too)
    p.sprite.setVisible(true);
    p.locked = false;
    p.setState('idle');
    p.play('idle', false);
    for (const g of [g1, g2]) { if (g.x > this.viewW - 20) { g.x = g === g1 ? 260 : 286; } g.setState('approach'); g.play('idle'); }
    this.clearBubbles();
    this.inCutscene = false;
    this.skipping = false;
    this.events.emit('cutscene', false);
    Controls.clear();
    this.startTime = this.time.now;
  }

  skipCutscene() { if (this.inCutscene) this.skipping = true; }

  // ------------------------------------------------------------------ first punch knocks a mask clean off
  onEnemyStruck(e: Shiesty, _info: HitInfo) {
    if (this.maskGag || e.texKey === 'shiestyGrey') return;
    this.maskGag = true;
    e.setTexture('shiestyNoMask');
    const mask = this.add.image(e.x, e.y - 44, 'maskProp').setDepth(3000);
    const landX = e.x + e.facing * -30;
    this.tweens.add({ targets: mask, x: landX, duration: 600 });
    this.tweens.add({ targets: mask, y: { from: e.y - 44, to: e.y - 74 }, duration: 300, yoyo: true, ease: 'Quad.easeOut', onComplete: () => mask.setDepth(e.y) });
    this.tweens.add({ targets: mask, angle: 540, duration: 600 });
    this.time.delayedCall(900, () => this.say(e, 'MY MASK!', 1200));
    this.time.delayedCall(700, () => this.player.say(MANE.goofy, 1, true));
    // Pothole the dog runs in, grabs it, and is gone
    this.time.delayedCall(1100, async () => {
      const v = this.viewBounds();
      const dog = new Extra(this, 'dog', v.left - 20, e.y + 6);
      dog.sprite.setOrigin(0.5, 29 / 32);
      dog.radius = 6;
      this.extras.push(dog);
      dog.play('run');
      const y = Math.min(208, e.y + 6);
      await this.dogRun(dog, landX, y, 220);
      mask.destroy();
      this.sfx('bark', 0.6);
      dog.play('runMask');
      this.say(dog, 'WOOF!', 700);
      await this.dogRun(dog, this.viewBounds().right + 40, y, 240);
      dog.destroy();
      this.extras = this.extras.filter((x) => x !== dog);
    });
  }

  private dogRun(dog: Extra, x: number, y: number, speed: number) {
    return new Promise<void>((resolve) => {
      const ev = this.time.addEvent({
        loop: true, delay: 16, callback: () => {
          const dx = x - dog.x, dy = y - dog.y, d = Math.hypot(dx, dy);
          if (d < 4) { ev.remove(); resolve(); return; }
          dog.facing = dx > 0 ? 1 : -1;
          dog.x += (dx / d) * speed * 0.016; dog.y += (dy / d) * speed * 0.016;
        },
      });
    });
  }

  // ------------------------------------------------------------------ ending: O.G. Drive-Out, the glowing puddle
  async ending() {
    this.lock(LEVEL_W - this.viewW);
    await this.waitUntil(() => Math.abs(this.camX - (LEVEL_W - this.viewW)) < 2);
    this.inCutscene = true;
    this.events.emit('cutscene', true);
    const p = this.player;
    p.locked = true;
    if (p.inManeMode) p.endManeMode();
    await this.waitUntil(() => p.state === 'idle' || p.state === 'walk');
    p.setState('cutscene');
    p.vx = p.vy = 0;
    Audio.stopMusic();
    const right = LEVEL_W;
    await this.walkTo(p, right - 260, 186, 70);
    p.facing = 1;
    p.play('idle');

    // the gold car rolls up
    this.sfx('carBy', 0.6);
    const car = new Car(this, 'carGold', right + 90, 166, -220);
    this.cars.push(car);
    await this.waitUntil(() => car.x <= right - 110);
    car.vx = 0;
    car.sprite.anims.stop();
    this.sfx('horn', 0.4);
    await this.wait(400);
    const og = new Extra(this, 'og', right - 150, 176);
    og.facing = -1;
    this.extras.push(og);
    og.sprite.setAlpha(0);
    this.tweens.add({ targets: og.sprite, alpha: 1, duration: 200 });
    await this.wait(300);
    await this.line(og, "I DON'T FIGHT FAIR. I FIGHT FIRST.", 2200);
    await this.line(og, 'BUT NOT TONIGHT, CAN. NOT TONIGHT.', 1800);
    og.play('tip', false);
    await this.wait(900);
    await this.line(p, MANE.twist, 1200);
    og.destroy();
    this.extras = this.extras.filter((x) => x !== og);
    car.vx = 260;
    car.sprite.setFlipX(false);
    car.sprite.play('carGold:roll');
    this.sfx('carBy', 0.6);
    await this.wait(900);

    // a puddle glows with pyramids
    const portal = this.add.sprite(right - 170, 200, 'portal').play('portal:glow').setDepth(195).setAlpha(0);
    this.tweens.add({ targets: portal, alpha: 1, duration: 800 });
    this.sfx('portal', 0.6);
    const dog = new Extra(this, 'dog', this.viewBounds().left - 20, 204);
    dog.sprite.setOrigin(0.5, 29 / 32);
    this.extras.push(dog);
    dog.play('run');
    await this.dogRun(dog, right - 200, 206, 200);
    dog.facing = 1;
    dog.play('bark');
    this.sfx('bark', 0.6);
    this.say(dog, 'WOOF! WOOF!', 1000);
    await this.wait(900);
    dog.play('idle');

    Audio.music(this, 'music_victory', 0.6, false);
    p.play('victory', false);
    await this.line(p, MANE.complete, 2400);
    // Mane dives in
    await this.walkTo(p, right - 175, 200, 80);
    p.play('jump', false);
    p.sprite.anims.stop();
    p.sprite.setFrame(10);
    this.sfx('jump', 0.6);
    await new Promise<void>((r) => this.tweens.add({ targets: p.sprite, y: p.sprite.y - 30, duration: 260, yoyo: true, ease: 'Quad.easeOut', onComplete: () => r() }));
    p.render = () => { /* frozen for the dive */ };
    this.sfx('splash', 0.8);
    this.splash(p.x, 200);
    this.tweens.add({ targets: p.sprite, scaleX: 0.2, scaleY: 0.1, y: 200, alpha: 0, duration: 260 });
    this.cameras.main.flash(500, 245, 197, 66);
    this.sfx('portal', 0.7);
    await this.wait(1100);
    this.inCutscene = false;
    this.events.emit('cutscene', false);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    await this.wait(550);
    const s = this.stats();
    this.scene.start('Results', { stats: s, missionId: this.missionId });
  }
}
