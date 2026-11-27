import Phaser from 'phaser';
import { BrawlerScene, BrawlerLook } from '../modes/brawler/BrawlerScene';
import { Actor } from '../modes/brawler/Actor';
import { Shiesty } from '../modes/brawler/Shiesty';
import { JackalCaptain } from '../modes/brawler/JackalCaptain';
import { Audio } from '../core/audio';
import { Controls } from '../core/controls';
import { COLORS } from '../core/config';
import { px, wrap } from '../core/text';
import { MANE, JACKAL_TALK } from './lines';

// A non-fighting character in a cutscene (the vendor).
class Extra extends Actor {
  constructor(scene: BrawlerScene, tex: string, x: number, y: number) {
    super(scene, tex, x, y, 1);
    this.play('idle');
  }
}

// Nia: light standing on water. No shadow, a slow shimmer, rises out of the pool.
class Spirit extends Extra {
  glow = 0;
  rise = 0;
  render() {
    super.render();
    this.shadow.setVisible(false);
    const t = this.scene.time.now / 1000;
    this.sprite.setAlpha(this.glow * (0.82 + Math.sin(t * 3) * 0.12));
    this.sprite.setScale(1 + Math.sin(t * 2.2) * 0.02, this.rise);
    this.sprite.setDepth(this.y + 4);
  }
}

const LOOK: BrawlerLook = {
  bg: { sky: 'bgSky2', far: 'bgFar2', ground: 'bgGround2', wall: 'bgWall2' },
  enemies: { rusher: ['jackalSpear', 'jackalBlade'], thrower: ['jackalPot'], name: 'JACKAL GUARD', talk: JACKAL_TALK },
  projectile: { tex: 'pot', sfx: 'potBreak', tint: 0xe8a070 },
  hazard: { lights: false, label: 'CHARIOT! +200', sfx: 'hooves', warnSfx: 'howl' },
  pothole: 'mudPit', table: 'bench', breakable: 'urn', breakSfx: 'potBreak',
};

const LEVEL_W2 = 2560;
const POOL_START = { x: 230, y: 190 };
const POOL_MEMORY = { x: 1650, y: 190 };
const STALL_X = 1040;

// Mission 2: OLD MEMPHIS. Memphis, Egypt, 3,000 years ago. The market on the Nile, the temple, the old pyramid.
export class Mission2 extends BrawlerScene {
  look = LOOK;
  levelW = LEVEL_W2;
  private captain?: JackalCaptain;
  private captionBox?: Phaser.GameObjects.Container;

  constructor() { super('Mission2'); }

  buildLevel() {
    this.missionId = 'm2-old-memphis';
    this.missionTitle = 'OLD MEMPHIS';
    this.captain = undefined;

    // reflecting pools (Nia speaks from these)
    for (const p of [POOL_START, POOL_MEMORY, { x: LEVEL_W2 - 150, y: 200 }]) this.add.sprite(p.x, p.y, 'pool').play('pool:glow').setDepth(-985);
    // torches on the wall brackets
    for (const tx of [520, 820, 1100, 1470, 1710, 1950, 2140, 2280]) {
      this.add.sprite(tx, 97, 'torch').play('torch:flicker').setOrigin(0.5, 1).setDepth(-996);
      const halo = this.add.circle(tx, 86, 18, 0xffa040, 0.12).setDepth(-996).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: halo, alpha: 0.06, duration: 300 + (tx % 5) * 40, yoyo: true, repeat: -1 });
    }
    // the date seller's stall
    this.add.image(STALL_X, 160, 'stall').setOrigin(0.5, 1).setDepth(159);
    // the stall is solid all the way back to the wall: go around the front
    this.addObstacle(STALL_X, 156, 38, 7);

    // mud holes (jump them)
    for (const [x, y] of [[470, 196], [600, 170], [780, 200], [1210, 178], [1330, 198], [1500, 172], [1880, 196], [2010, 176]]) this.addPothole(x, y);
    this.addTable(560, 176);
    this.addTable(1390, 184);
    // clay jars with goodies
    this.addTrashCan(500, 162, 'dates');
    this.addTrashCan(720, 160, 'can');
    this.addTrashCan(1160, 162, 'bread');
    this.addTrashCan(1440, 161, 'can');
    this.addTrashCan(1820, 160, 'dates');
    this.addTrashCan(2060, 162, 'can');
    this.spawnPickup('can', 860, 188);
  }

  async runScript() {
    await this.intro();
    Audio.music(this, 'music_river', 0.45);

    // ----- Wave 1: the riverbank
    this.lock(0);
    for (const e of this.enemies) { e.scriptControlled = false; e.entering = false; }
    await this.wave([{ kind: 'rusher', side: 'right', y: 196, delay: 900 }]);
    await this.waitUntil(() => this.enemies.length === 0);
    this.unlock();

    // ----- the market street
    this.events.emit('tutorial', 'mud');
    await this.advanceTo(640);
    this.lock(640 - this.viewW * 0.5);
    await this.wave([
      { kind: 'rusher', side: 'right', y: 172 },
      { kind: 'rusher', side: 'left', y: 198, delay: 600 },
      { kind: 'thrower', side: 'right', y: 188, delay: 1400 },
      { kind: 'rusher', side: 'right', y: 180, delay: 3200 },
    ]);
    if (this.player.cans > 0) this.events.emit('tutorial', 'sip');
    this.unlock();

    // ----- the date seller (the laugh)
    await this.advanceTo(STALL_X - 100);
    await this.vendorGag();

    // ----- the open quay: chariots
    await this.advanceTo(1260);
    this.lock(1260 - this.viewW * 0.5);
    this.events.emit('tutorial', 'chariot');
    await this.wait(700);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), -1, 'chariot');
    await this.wait(400);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), 1, 'chariot', 900);
    const w3 = this.wave([
      { kind: 'rusher', side: 'right' },
      { kind: 'thrower', side: 'left', delay: 500 },
      { kind: 'rusher', side: 'left', delay: 1200 },
      { kind: 'rusher', side: 'right', delay: 2600 },
    ]);
    this.time.delayedCall(5000, () => { if (this.enemies.length > 1) this.driveBy(Phaser.Math.Between(166, 200), -1, 'chariot'); });
    await w3;
    this.unlock();

    // ----- the temple pool: Nia's memory (the oooh)
    await this.advanceTo(POOL_MEMORY.x - 110);
    await this.memory();

    // ----- the colonnade: the guards' last line
    await this.advanceTo(1880);
    this.lock(1880 - this.viewW * 0.5);
    const w4a = this.wave([
      { kind: 'rusher', side: 'right', y: 168 },
      { kind: 'thrower', side: 'left', y: 200, delay: 300 },
      { kind: 'rusher', side: 'right', y: 196, delay: 900 },
    ]);
    this.time.delayedCall(3600, () => this.driveBy(Phaser.Math.Between(166, 200), 1, 'chariot'));
    await w4a;
    await this.wave([
      { kind: 'rusher', side: 'left', y: 180 },
      { kind: 'rusher', side: 'right', y: 170, delay: 200 },
      { kind: 'thrower', side: 'right', y: 200, delay: 1200 },
      { kind: 'rusher', side: 'left', y: 196, delay: 2400 },
    ]);
    this.unlock();

    // ----- the temple gate: the Jackal Captain
    await this.advanceTo(LEVEL_W2 - this.viewW * 0.65);
    await this.bossFight();
    await this.ending();
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
    p.sprite.setVisible(true).clearTint().setScale(1).setAlpha(1);
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
    if (this.skipping) {
      this.tweens.add({ ...cfg, duration: 0, delay: 0 });
      return Promise.resolve();
    }
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  private spirit(x: number, y: number) {
    const n = new Spirit(this, 'nia', x, y);
    n.facing = -1;
    this.extras.push(n);
    return n;
  }

  private async niaRise(n: Spirit) {
    this.sfx('portal', 0.5);
    this.splash(n.x, n.y);
    await this.tween({ targets: n, glow: 1, rise: 1, duration: 900, ease: 'Sine.easeOut' });
  }

  private async niaSink(n: Spirit) {
    this.sfx('splash', 0.4);
    await this.tween({ targets: n, glow: 0, rise: 0.1, duration: 700, ease: 'Sine.easeIn' });
    n.destroy();
    this.extras = this.extras.filter((x) => x !== n);
  }

  // A caption box across the bottom of the screen, for the memory and the last shot. Tap to advance.
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

  // ------------------------------------------------------------------ intro: out of the water, into Old Memphis
  async intro() {
    this.startCutscene();
    Audio.music(this, 'music_backdoor', 0.3);
    const p = this.player;
    p.setState('cutscene');
    p.sprite.setVisible(false);
    p.x = POOL_START.x; p.y = POOL_START.y;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    await this.wait(900);

    // Mane comes flying up out of the pool and lands on his face
    if (!this.skipping) {
      this.cameras.main.flash(300, 255, 241, 168);
      this.sfx('splash', 0.9);
      this.sfx('portal', 0.5);
      this.splash(p.x, p.y); this.splash(p.x - 10, p.y); this.splash(p.x + 10, p.y);
      p.sprite.setVisible(true);
      p.sprite.anims.stop();
      p.sprite.setFrame(27);
      await new Promise<void>((r) => {
        const x0 = p.x, x1 = 150, y0 = p.y, y1 = 186;
        this.tweens.addCounter({
          from: 0, to: 1, duration: 800, onUpdate: (tw) => {
            const k = tw.getValue() ?? 0;
            p.x = x0 + (x1 - x0) * k; p.y = y0 + (y1 - y0) * k;
            p.z = Math.sin(k * Math.PI) * 70;
            p.sprite.setAngle(-k * 360);
          }, onComplete: () => { p.z = 0; p.sprite.setAngle(0); r(); },
        });
      });
      p.sprite.setFrame(28);
      this.sfx('land', 0.8);
      this.dust(p.x, p.y);
      this.shake(150, 0.005);
      await this.wait(700);
      p.sprite.setFrame(30);
      await this.wait(250);
    }
    p.x = 150; p.y = 186; p.z = 0;
    p.sprite.setVisible(true);
    p.facing = 1;
    p.play('idle');
    this.events.emit('hud');
    this.events.emit('banner', { top: 'MISSION 2', bottom: 'OLD MEMPHIS' });
    await this.wait(2400);
    await this.line(p, 'HOLD UP. I KNOW THIS PLACE.', 2000);

    const nia = this.spirit(POOL_START.x + 8, POOL_START.y - 2);
    await this.niaRise(nia);
    nia.play('talk');
    await this.line(nia, 'WELCOME BACK, KEEPER.', 2200);
    p.play('taunt', false);
    await this.line(p, 'NIA? ' + MANE.twist, 1500);
    p.play('idle');
    await this.line(nia, 'THIS IS MEMPHIS. THE FIRST ONE. THREE THOUSAND YEARS AGO.', 2800);
    await this.line(nia, 'THE KING\'S JACKALS STILL GUARD HIS GREED. FOLLOW THE RIVER TO ME.', 3000);
    nia.play('idle');
    await this.niaSink(nia);

    // two guards come running
    const g1 = new Shiesty(this, 'rusher', this.viewW + 40, 172, 'jackalSpear');
    const g2 = new Shiesty(this, 'rusher', this.viewW + 70, 196, 'jackalBlade');
    for (const g of [g1, g2]) { g.scriptControlled = true; g.entering = false; g.setState('scripted'); g.facing = -1; this.enemies.push(g); }
    await Promise.all([this.walkTo(g1, 290, 174, 80), this.walkTo(g2, 312, 194, 80)]);
    g1.facing = g2.facing = -1;
    await this.line(g1, 'THE JAR SPIRIT! SEIZE HIM!', 1800);
    await this.line(p, MANE.trashTalkReply, 1500);

    for (const g of [g1, g2]) { if (g.x > this.viewW - 20) { g.x = g === g1 ? 290 : 312; } g.setState('approach'); g.play('idle'); }
    this.endCutscene();
    this.startTime = this.time.now;
    this.time.delayedCall(400, () => this.events.emit('tutorial', 'move'));
  }

  // ------------------------------------------------------------------ the laugh: paying with the grill
  private async vendorGag() {
    this.lock(STALL_X - this.viewW * 0.5);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    const v = new Extra(this, 'vendor', STALL_X + 6, 168);
    v.facing = -1;
    this.extras.push(v);
    this.addSolidActor(v);
    await this.walkTo(p, STALL_X - 40, 176, 70);
    p.facing = 1;
    p.play('idle');
    v.play('talk');
    await this.line(v, 'FRESH DATES! TWO COPPER RINGS.', 2000);
    v.play('idle');
    await this.line(p, 'COPPER? MANE, I GOT GOLD.', 1700);

    // out comes the grill
    const grill = this.add.image(p.x + 8, p.y - 30, 'grillProp').setDepth(3000);
    p.play('taunt', false);
    this.sfx('shine', 0.7);
    this.spark(grill.x, grill.y, COLORS.goldHi);
    await this.wait(600);
    await this.tween({ targets: grill, x: v.x - 8, y: v.y - 34, duration: 500, ease: 'Quad.easeOut' });
    grill.setVisible(false);
    v.play('bite', false);
    await this.wait(500);
    this.sfx('clang', 0.4);
    await this.line(v, '...THESE ARE YOUR TEETH.', 1900);
    p.play('idle');
    await this.line(p, 'TWENTY-FOUR KARAT, MANE.', 1700);
    v.play('talk');
    await this.line(v, 'KEEP YOUR TEETH, LITTLE JAR. TAKE THE DATES.', 2400);

    // grill goes back in, the dates come out
    v.play('give', false);
    grill.setPosition(v.x - 8, v.y - 34).setVisible(true);
    await this.tween({ targets: grill, x: p.x + 6, y: p.y - 30, duration: 400 });
    grill.destroy();
    this.sfx('shine', 0.6);
    p.play('shine', false);
    this.spawnPickup('dates', p.x + 22, p.y + 4, true);
    this.spawnPickup('bread', p.x + 34, p.y - 6, true);
    await this.wait(500);
    await this.line(p, 'ROYAL SMILE. DISCOUNT PRICE.', 2000);
    v.play('idle');
    this.endCutscene();
    this.unlock();
  }

  // ------------------------------------------------------------------ the oooh: Nia shows him the day he was sealed
  private async memory() {
    this.lock(POOL_MEMORY.x - this.viewW * 0.5);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    await this.walkTo(p, POOL_MEMORY.x - 60, 186, 70);
    p.facing = 1;
    p.play('idle');
    const nia = this.spirit(POOL_MEMORY.x + 6, POOL_MEMORY.y - 2);
    await this.niaRise(nia);
    nia.play('talk');
    await this.line(nia, 'YOU DON\'T REMEMBER HOW YOU GOT IN THAT CAN.', 2400);
    await this.line(nia, 'THE WATER DOES. LOOK.', 1600);
    nia.play('idle');

    // into the vision
    const W = this.viewW;
    if (!this.skipping) {
      this.sfx('portal', 0.6);
      this.cameras.main.flash(500, 120, 180, 255);
      await this.wait(300);
    }
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    layer.add(this.add.image(W / 2, 0, 'memoryHall').setOrigin(0.5, 0));
    const mk = (tex: string, x: number, anim = 'idle') => this.add.sprite(x, 176, tex).setOrigin(0.5, 61 / 64).setScale(1.4).play(`${tex}:${anim}`);
    const king = mk('king', W / 2 - 60);
    const mane = mk('mane', W / 2 - 4).setTint(0xa8dcff).setFlipX(true);
    layer.add([king, mane]);
    const tint = this.add.rectangle(0, 0, W, 216, 0x3a2a10, 0.18).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    layer.add(tint);
    layer.setAlpha(0);
    await this.tween({ targets: layer, alpha: 1, duration: 500 });

    king.play('king:laugh');
    mane.play('mane:taunt');
    await this.caption('NIA', 'YOU KEPT THE RIVER FOR THIS CITY. THE YOUNG KING WAS YOUR BEST FRIEND.', 3000);
    mane.play('mane:idle');
    king.play('king:idle');
    await this.caption('NIA', 'THEN HE WANTED THE RIVER FOR HIMSELF.', 2400);

    // the priests bring the golden jar
    // they come in from behind him, from the right
    const pr1 = mk('priest', W + 30, 'carry').setFlipX(true);
    const pr2 = mk('priest', W + 76, 'carry').setFlipX(true);
    const jar = this.add.sprite(W + 53, 140, 'jar', 0).setScale(1.4);
    layer.add([pr1, pr2, jar]);
    king.play('king:point');
    this.sfx('howl', 0.25);
    await Promise.all([
      this.tween({ targets: pr1, x: W / 2 + 50, duration: 1600 }),
      this.tween({ targets: pr2, x: W / 2 + 96, duration: 1600 }),
      this.tween({ targets: jar, x: W / 2 + 73, duration: 1600 }),
    ]);
    mane.setFlipX(false);
    await this.wait(400);
    // the jar pulls him in
    const glowRing = this.add.circle(jar.x, jar.y, 6, 0xfff1a8, 0.6).setBlendMode(Phaser.BlendModes.ADD);
    layer.add(glowRing);
    this.tween({ targets: glowRing, radius: 40, alpha: 0, duration: 900, repeat: 1 });
    this.sfx('portal', 0.7);
    mane.play('mane:hurt');
    await this.tween({ targets: mane, x: jar.x, y: jar.y - 10, scaleX: 0.1, scaleY: 0.1, angle: 540, duration: 1100, ease: 'Quad.easeIn' });
    mane.setVisible(false);
    jar.setFrame(1);
    this.sfx('seal', 0.9);
    this.shake(300, 0.008);
    await this.caption('NIA', 'HIS PRIESTS SEALED YOU IN A GOLDEN JAR. THE RIVER DRIED UP. THE CITY FORGOT ITSELF.', 3600);
    await this.caption('MANE', 'SHOW ME HIS FACE.', 1600);
    // the king turns to face us: still nothing but shadow
    king.setFlipX(true);
    await this.wait(500);
    await this.caption('NIA', 'THE WATER WON\'T SHOW HIM. NOT YET.', 2400);

    await this.tween({ targets: layer, alpha: 0, duration: 500 });
    layer.destroy();

    p.play('idle');
    await this.line(p, 'SOMEBODY GON\' ANSWER FOR THAT.', 2000);
    nia.play('talk');
    await this.line(nia, 'START WITH THE CAPTAIN WHO GUARDS HIS HOUSE.', 2400);
    nia.play('idle');
    await this.niaSink(nia);
    this.endCutscene();
    this.unlock();
  }

  // ------------------------------------------------------------------ boss: the Jackal Captain at the temple gate
  private async bossFight() {
    const arena = LEVEL_W2 - this.viewW;
    this.lock(arena);
    await this.waitUntil(() => Math.abs(this.camX - arena) < 2);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    Audio.stopMusic();
    await this.walkTo(p, arena + this.viewW * 0.3, 186, 70);
    p.facing = 1;
    p.play('idle');

    const cap = (this.captain = new JackalCaptain(this, arena + this.viewW * 0.72, 180));
    cap.setState('scripted');
    cap.scriptControlled = true;
    cap.facing = -1;
    cap.z = 90;
    this.enemies.push(cap);
    this.sfx('howl', 0.8);
    await this.waitUntil(() => cap.z <= 0.01 || this.skipping);
    cap.z = 0;
    this.sfx('land', 0.9);
    this.dust(cap.x - 8, cap.y); this.dust(cap.x + 8, cap.y);
    this.shake(220, 0.008);
    this.boss = cap;
    this.events.emit('banner', { top: 'THE KING\'S HOUND', bottom: 'JACKAL CAPTAIN' });
    await this.wait(2500);
    await this.line(cap, 'THE KEEPER CRAWLS BACK TO THE KING\'S HOUSE.', 2400);
    await this.line(cap, 'THE JAR STILL HAS ROOM FOR YOU.', 2000);
    p.play('taunt', false);
    await this.line(p, MANE.taunt, 1300);

    cap.onSay = (line) => this.say(cap, line, 1400);
    cap.onHowl = () => {
      this.time.delayedCall(500, () => {
        if (cap.ko) return;
        this.spawnEnemy('rusher', 'left', Phaser.Math.Between(166, 200));
        this.spawnEnemy(Math.random() < 0.5 ? 'thrower' : 'rusher', 'right', Phaser.Math.Between(166, 200));
      });
    };
    cap.onBow = () => {
      this.say(cap, 'I YIELD, KEEPER. I YIELD...', 1400);
      this.time.delayedCall(1300, () => { if (!cap.ko) this.player.say(MANE.flaugin, 1, true); });
    };
    cap.scriptControlled = false;
    cap.setState('approach');
    this.endCutscene();
    Audio.music(this, 'music_jackal', 0.45);

    await this.waitUntil(() => cap.ko);
    this.kos++;
    this.addScore(2000);
    this.toast('JACKAL CAPTAIN DOWN! +2000');
    this.freezeFrame(500, COLORS.gold);
    this.sfx('ko', 0.9);
    Audio.stopMusic();
    // the rest of the guards run off
    for (const e of [...this.enemies]) if (e !== cap && e.alive) { e.hp = 0; e.takeHit({ damage: 99, dir: e.x < p.x ? -1 : 1, knockdown: true, knockback: 160, launch: 200 }); }
    this.time.delayedCall(700, () => this.player.say(MANE.bigHit, 1, true));
    await this.wait(1800);
  }

  // ------------------------------------------------------------------ ending: "You ain't a king. You a keeper." and the pull-back
  async ending() {
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    const cap = this.captain!;
    this.boss = null;
    // if he went down at the edge of the screen, slide him back into view for his last words
    const v = this.viewBounds();
    const cx = Phaser.Math.Clamp(cap.x, v.left + 60, v.right - 60);
    if (cx !== cap.x) await this.tween({ targets: cap, x: cx, duration: 400 });
    await this.line(cap, 'THE KING... WILL... RETURN...', 2200);
    const pool = { x: LEVEL_W2 - 150, y: 200 };
    await this.walkTo(p, pool.x - 56, 192, 70);
    p.facing = 1;
    p.play('idle');
    const nia = this.spirit(pool.x + 6, pool.y - 2);
    await this.niaRise(nia);
    p.play('taunt', false);
    await this.line(p, 'MANE, THEY SHOULDA MADE ME KING OF THIS WHOLE CITY.', 2600);
    p.play('idle');
    nia.play('talk');
    await this.line(nia, 'YOU AIN\'T A KING. YOU A KEEPER.', 3000);
    nia.play('idle');
    await this.wait(700);
    Audio.music(this, 'music_victory', 0.6, false);
    p.play('victory', false);
    this.sfx('shine', 0.7);
    await this.line(p, MANE.complete, 2400);
    nia.play('talk');
    await this.line(nia, 'THE RIVER REMEMBERS THE WAY HOME. GO ON.', 2400);

    // the pull-back: the Nile lines up with the Mississippi, the old pyramid with the Memphis Pyramid
    const W = this.viewW;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    await this.wait(550);
    Audio.music(this, 'music_backdoor', 0.35);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    const oldC = this.add.image(W / 2, 108, 'panOld');
    const newC = this.add.image(W / 2, 108, 'panNew').setAlpha(0);
    layer.add([oldC, newC]);
    // start tight on the pyramid, then pull back
    const pyr = { x: 330 - 240, y: 110 - 108 };
    for (const im of [oldC, newC]) im.setScale(2.4).setPosition(W / 2 - pyr.x * 2.4, 108 - pyr.y * 2.4);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    const pull = (dur: number) => this.tween({ targets: [oldC, newC], scale: 1, x: W / 2, y: 108, duration: dur, ease: 'Sine.easeInOut' });
    await pull(3200);
    await this.wait(600);
    this.sfx('portal', 0.5);
    await this.tween({ targets: newC, alpha: 1, duration: 2600, ease: 'Sine.easeInOut' });
    await this.caption('', 'SAME CITY. SAME WATER. 3,000 YEARS APART.', 3200);
    await this.wait(400);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    const s = this.stats();
    this.scene.start('Results', { stats: s, missionId: this.missionId });
  }
}
