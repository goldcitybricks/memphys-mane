import Phaser from 'phaser';
import { FightScene, CountPlan, RoundEnd } from '../modes/fight/FightScene';
import { Fighter, Move, FLOOR_Y } from '../modes/fight/Fighter';
import { Victor, VictorStyle } from '../modes/fight/Victor';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { px } from '../core/text';
import { MANE, MANE_10, VICTOR_10, PHARAOH } from './lines';

// How Victor fights: clean-ish to start, then after he buys his respawn, every cheat he has.
const STYLES: VictorStyle[] = [
  { gap: [0.8, 1.45], weights: { jab: 5, jab2: 3, stick: 2, ping: 2, rocket: 2, pause: 2, refill: 2, taunt: 1 }, guard: 0.3, speed: 1.08, power: 1, daze: 1.1 },
  { gap: [0.65, 1.2], weights: { jab: 4, jab2: 3, stick: 2, ping: 2, rocket: 3, pause: 3, refill: 2, taunt: 1 }, guard: 0.35, speed: 1.18, power: 1.12, daze: 0.9 },
];

// where the golden jar sits in sourceArena.png, relative to the image's center line
const JAR = { dx: 142, y: 112 };

// Mission 10: THE SOURCE, part one. Mane falls into the aquifer under Memphis, and Victor Crowe comes down
// himself, rocket boots and all. One fight with no clock and no ref: knock him down twice. Then the jar takes him.
export class Mission10 extends FightScene {
  private victor!: Victor;
  private bg!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Ellipse;
  private pauseLayer?: Phaser.GameObjects.Container;

  constructor() { super('Mission10'); }

  buildArena() {
    this.missionId = 'm10-the-source';
    this.foePortrait = 'victorPortrait';
    this.extraTips = {
      touch: {
        pause: 'THAT PAUSE IS FAKE! HE CHEATS.\nDODGE THE KNEE, THEN HIT HIM.',
        refill: 'HE\'S DRINKING DENILE TO HEAL.\nHIT HIM BEFORE HE FINISHES IT!',
        rocket: 'RED GLOW = YOU CAN\'T BLOCK IT.\nDODGE THE ROCKET DASH!',
      },
    };
    this.pauseLayer = undefined;
    this.bg = this.add.image(this.midX, 0, 'sourceArena').setOrigin(0.5, 0).setDepth(-100);
    this.glow = this.add.ellipse(this.midX + JAR.dx, JAR.y - 6, 90, 90, 0xf5c542, 0.08).setDepth(-90).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.glow, fillAlpha: 0.18, duration: 1400, yoyo: true, repeat: -1 });
    // motes of light drifting up out of the water
    this.time.addEvent({ loop: true, delay: 260, callback: () => {
      const d = this.add.rectangle(Phaser.Math.Between(0, this.W), 216, 1, 1, Math.random() < 0.25 ? 0xfff1a8 : 0x9fe8ff, 0.8).setDepth(-80);
      this.tweens.add({ targets: d, y: Phaser.Math.Between(60, 150), alpha: 0, duration: Phaser.Math.Between(2000, 3600), onComplete: () => d.destroy() });
    } });
  }

  makeFoe(): Fighter {
    const v = (this.victor = new Victor(this, this.homes().foe));
    v.onPause = (on) => this.fakePause(on);
    v.onSpill = () => { this.toast('SPILLED IT! +100'); this.addScore(100); this.sfx('splash', 0.8); this.say(this.player, MANE.goofy, 900); };
    v.onRefill = () => this.toast('HE REFILLED! HIT HIM MID-SIP');
    return v;
  }

  onResize() {
    super.onResize();
    this.bg?.setX(this.midX);
    this.glow?.setX(this.midX + JAR.dx);
    this.pauseLayer?.setX(this.midX);
  }

  roundName() { return 'THE SOURCE'; }

  foeCount(kd: number): CountPlan {
    if (kd <= 1) {
      // he buys a respawn on three, and comes back meaner
      const onCount = (w: string | null) => {
        if (w !== '2') return;
        this.events.off('count', onCount);
        this.victor.frame('knockdown', 1);
        this.say(this.victor, VICTOR_10.respawn, 1800);
        this.sfx('notify', 0.9);
        this.toast('RESPAWN PURCHASED: $9.99');
      };
      this.events.on('count', onCount);
      this.time.delayedCall(4200, () => { this.victor.setStyle(STYLES[1]); this.say(this.player, MANE_10.respawn, 1600); });
      return { getUpAt: 4, getUpHp: 0.7 };
    }
    return { getUpAt: null, lastWord: 'LOGGED OFF!' };
  }

  onWindup(f: Fighter, m: Move) {
    super.onWindup(f, m);
    if (f === this.victor && (m.id === 'pause' || m.id === 'refill' || m.id === 'rocket')) this.tip(m.id);
  }

  // the fake pause screen: looks like the real one, isn't
  private fakePause(on: boolean) {
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    if (!on) return;
    const bg = this.add.rectangle(0, 96, 170, 46, 0x070a1c, 0.8).setStrokeStyle(1, COLORS.gold);
    const a = px(this, 0, 80, 'II PAUSED', COLORS.goldHi, 2).setOrigin(0.5, 0);
    const b = px(this, 0, 102, '(NOT REALLY)', 0x9aa0c0).setOrigin(0.5, 0).setAlpha(0);
    this.pauseLayer = this.add.container(this.midX, 0, [bg, a, b]).setDepth(3000);
    this.time.delayedCall(500, () => b.active && b.setAlpha(1));
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    Audio.music(this, 'music_source', 0.45);
    this.tip('start');
    this.victor.setStyle(STYLES[0]);
    let how: RoundEnd;
    while ((how = await this.fightRound(1, null)) !== 'ko') { /* no clock: it ends when he stays down */ }
    await this.ending();
  }

  // ------------------------------------------------------------------ intro: down through the layers, into the water
  private async intro() {
    this.startCutscene();
    const p = this.player, v = this.victor;
    const h = this.homes();
    p.setState('scripted'); p.x = h.mane; p.z = 300;
    v.setState('scripted'); v.z = 320; v.sprite.setVisible(false);
    Audio.music(this, 'music_lost', 0.3);

    // the cross-section: the city, the clay, the sand, the sea. A gold glint falling through it.
    const ext = this.add.image(this.midX, 0, 'sourceExt').setOrigin(0.5, 0).setDepth(5000);
    const can = this.add.sprite(this.midX - 40, -20, 'canPickup').play('canPickup:glow').setDepth(5001);
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.tween({ targets: can, y: 150, angle: 540, duration: 4200, ease: 'Sine.easeIn' }).then(() => { if (can.active) { this.sfx('splash', 0.8); can.destroy(); } });
    await this.caption('', 'UNDER MEMPHIS. PAST THE CITY, PAST THE GRAY CLAY THAT SHIELDS IT, DOWN THROUGH THE SAND THAT FILTERS IT...', 3600);
    await this.caption('', 'THE MEMPHIS AQUIFER. AN ESTIMATED 100 TRILLION GALLONS, UP TO 3,000 FEET BENEATH SHELBY COUNTY.', 3800);
    if (can.active) can.destroy();
    if (!this.skipping) this.events.emit('banner', { top: 'MISSION 10', bottom: 'THE SOURCE' });
    await this.wait(2200);
    await this.tween({ targets: ext, alpha: 0, duration: 600 });
    ext.destroy();

    // Mane drops onto the sand bar
    if (!this.skipping) {
      p.frame('knockdown', 0);
      await this.tween({ targets: p, z: 0, duration: 600, ease: 'Quad.easeIn' });
      this.sfx('land', 0.9); this.sfx('splash', 0.7); this.shake(150, 0.006);
    }
    p.z = 0; p.play('idle');
    // Nia, in the water beside the sand
    const nia = this.add.sprite(Math.max(40, this.midX - 150), FLOOR_Y + 8, 'nia').setOrigin(0.5, 61 / 64).setScale(2).setAlpha(0).setDepth(8).setBlendMode(Phaser.BlendModes.ADD).play('nia:idle');
    const nS = this.speaker(nia, 110);
    await this.tween({ targets: nia, alpha: 0.85, duration: 900 });
    nia.play('nia:talk');
    await this.line(nS, 'WELCOME HOME, KEEPER. EVERY DROP DOWN HERE FELL AS RAIN BEFORE YOUR CITY HAD A NAME.', 3600);
    p.play('taunt', true);
    await this.line(p, MANE_10.arrive, 2200);
    p.play('idle');
    await this.line(nS, 'HE IS COMING. NOT THE KING. NOT YET.', 2400);
    nia.play('nia:idle');
    await this.tween({ targets: nia, alpha: 0, duration: 600 });
    nia.destroy();

    // Victor, in person, down on his rocket boots, streaming
    v.sprite.setVisible(true);
    v.frame('rocket', 0);
    this.sfx('rocket', 0.8);
    await this.tween({ targets: v, z: 0, duration: 900, ease: 'Quad.easeOut' });
    v.z = 0;
    this.sfx('land', 0.9); this.sfx('splash', 0.6);
    this.shake(200, 0.008);
    v.play('taunt', true);
    await this.line(v, VICTOR_10.live, 3000);
    v.play('idle', true);
    await this.line(p, MANE_10.noRobot, 2400);
    await this.line(v, VICTOR_10.why, 3400);
    await this.line(v, VICTOR_10.rules, 2800);
    p.play('taunt', true);
    await this.line(p, MANE.taunt, 1200);
    p.play('idle');

    v.sprite.setVisible(true); v.z = 0; v.x = h.foe; v.facing = -1;
    p.x = h.mane; p.facing = 1; p.z = 0;
    this.endCutscene();
  }

  // ------------------------------------------------------------------ the last knockdown: he logs off
  async beforeCount(f: Fighter, plan: CountPlan) {
    if (f !== this.victor || plan.getUpAt !== null) return;
    Audio.stopMusic();
    this.events.emit('cutscene', true);
    await this.wait(600);
    this.say(this.victor, VICTOR_10.down, 1800);
    await this.wait(1800);
    this.events.emit('cutscene', false);
  }

  // ------------------------------------------------------------------ ending: the jar takes Victor. The Pharaoh of DeNile.
  private async ending() {
    this.events.emit('count', null);
    this.startCutscene();
    const p = this.player, v = this.victor;
    this.sfx('crowd', 0.3);
    await this.wait(900);
    p.setState('scripted'); p.facing = 1; p.play('victory', true);
    this.sfx('shine', 0.7);
    await this.wait(1200);
    p.play('idle');

    // he crawls for the jar
    v.setState('scripted');
    v.sprite.play('victor:crawl');
    v.facing = 1;
    this.say(v, VICTOR_10.crawl, 2400);
    await this.tween({ targets: v, x: this.midX + 100, duration: 2200 });
    v.frame('crawl', 0);
    // the jar wakes up
    const jarS = { get x() { return this.mx; }, mx: 0, get headY() { return JAR.y - 50; } };
    jarS.mx = this.midX + JAR.dx;
    this.tweens.killTweensOf(this.glow);
    this.tween({ targets: this.glow, fillAlpha: 0.35, scale: 1.3, duration: 600 });
    this.sfx('portal', 0.7);
    this.shake(200, 0.004);
    await this.line(jarS, PHARAOH.jar, 2200);
    await this.line(v, 'FINALLY. UPLOAD ME SOMETHING. MAKE ME WIN.', 2600);
    await this.line(jarS, PHARAOH.read, 3200);
    await this.line(v, VICTOR_10.terms, 2200);

    // it pulls him in: light and plastic, everything the jar ever drank
    this.sfx('drain', 0.9);
    v.sprite.play('victor:fuse');
    v.facing = -1;
    const drift = this.time.addEvent({ loop: true, delay: 70, callback: () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const b = this.add.sprite(this.midX + side * (this.W / 2 + 10), Phaser.Math.Between(60, 200), 'bottle', 0).setScale(2).setDepth(30).play('bottle:spin');
      this.tweens.add({ targets: b, x: this.midX + JAR.dx, y: JAR.y, scale: 0.6, duration: Phaser.Math.Between(500, 900), ease: 'Quad.easeIn', onComplete: () => b.destroy() });
    } });
    await this.tween({ targets: v, x: this.midX + JAR.dx - 6, z: FLOOR_Y - JAR.y - 10, duration: 1600, ease: 'Sine.easeIn' });
    await this.tween({ targets: v.sprite, alpha: 0, duration: 300 });
    v.sprite.setVisible(false); v.shadow.setVisible(false);
    await this.wait(900);
    drift.remove();
    this.sfx('glitch', 0.9); this.sfx('rumble', 0.9);
    this.shake(700, 0.012);
    this.cameras.main.flash(500, 255, 241, 168);

    // the Pharaoh of DeNile stands up out of the cradle
    const ph = this.add.sprite(this.midX + JAR.dx - 10, FLOOR_Y - 4, 'pharaoh').setOrigin(0.5, 61 / 64).setScale(1.3).setDepth(7).setFlipX(true);
    ph.setFrame(Number(this.anims.get('pharaoh:knockdown').frames[1].frame.name));
    const phS = this.speaker(ph, 150);
    await this.wait(700);
    ph.play('pharaoh:idle');
    Audio.music(this, 'music_pharaoh', 0.35);
    await this.line(phS, PHARAOH.rise, 3200);
    await this.line(p, MANE.twist, 1300);
    await this.line(p, 'THE KING. WHAT\'S LEFT OF HIM. WITH CROWE STUCK INSIDE.', 2800);
    await this.line(phS, PHARAOH.name, 2600);
    await this.wait(500);
    await this.line(p, MANE_10.denile, 2400);
    ph.play('pharaoh:call');
    this.sfx('choir', 0.5);
    await this.line(phS, PHARAOH.army, 2400);
    await this.caption('', 'NEXT: THE PHARAOH OF DENILE.', 1800);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    this.scene.start('Mission10B', { carry: this.stats() });
  }
}
