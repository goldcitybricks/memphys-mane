import Phaser from 'phaser';
import { BrawlerScene, BrawlerLook } from '../modes/brawler/BrawlerScene';
import { Actor } from '../modes/brawler/Actor';
import { Shiesty } from '../modes/brawler/Shiesty';
import { Driller } from '../modes/brawler/Driller';
import { Audio } from '../core/audio';
import { Controls } from '../core/controls';
import { COLORS } from '../core/config';
import { px, wrap } from '../core/text';
import { MANE, CREW_TALK, DRILLER, GIGAZ, AQUIFER_FACT_6 } from './lines';

// A non-fighting character in a cutscene (Uncle T, Malik, the operator running off).
class Extra extends Actor {
  constructor(scene: BrawlerScene, tex: string, x: number, y: number) {
    super(scene, tex, x, y, 1);
    this.play('idle');
  }
}

// GigaZ talks from the jar: an invisible speaker that bubbles sit on.
class Voice extends Actor {
  constructor(scene: BrawlerScene, x: number, y: number, h: number) {
    super(scene, 'shadow', x, y, 1);
    this.sprite.setVisible(false); this.shadow.setVisible(false);
    this.bubbleH = h;
  }
  render() { this.sprite.setVisible(false); this.shadow.setVisible(false); }
}

const LOOK: BrawlerLook = {
  bg: { sky: 'bgSky6', far: 'bgFar6', ground: 'bgGround6', wall: 'bgWall6' },
  enemies: { rusher: ['crewDrill', 'crewWrench'], thrower: ['crewCoolant'], name: 'DRILL CREW', talk: CREW_TALK },
  projectile: { tex: 'canister', sfx: 'clang', tint: 0x5cc8ff },
  hazard: { lights: true, label: 'DRILL CART! +200', sfx: 'drill', warnSfx: 'alarm' },
  pothole: 'breach', table: 'pipeStack', breakable: 'supplyCrate', breakSfx: 'crash',
};

const LEVEL_W6 = 2560;
const LADDER_X = 140;
// the ghost murals: where they hang, what they play
interface Mural { x: number; ghost: string; music: string; title: string; station: string; lit: boolean; auto: boolean; sprite?: Phaser.GameObjects.Sprite }
const MURAL_BOTTOM = 124;
const FACT_SPOT = { x: 1392, y: 207 };

interface Wave { x: number; y: number; r: number; hit: Set<object>; g: Phaser.GameObjects.Graphics }
interface Rock { x: number; y: number; t: number; shadow: Phaser.GameObjects.Ellipse; img: Phaser.GameObjects.Image }

// Mission 6: BEALE BELOW. The flooded tunnels under Beale Street, the ghost murals, AetherCorp's dig through the clay,
// the Driller, and at the bottom, the golden jar. Uncle T and Malik come down with Mane.
export class Mission6 extends BrawlerScene {
  look = LOOK;
  levelW = LEVEL_W6;
  private murals: Mural[] = [];
  private uncle?: Extra;
  private malik?: Extra;
  private driller?: Driller;
  private waves: Wave[] = [];
  private rocks: Rock[] = [];
  private factFound = false;
  private factCard?: Phaser.GameObjects.Sprite;
  private overheatTold = false;
  private captionBox?: Phaser.GameObjects.Container;

  constructor() { super('Mission6'); }

  buildLevel() {
    this.missionId = 'm6-beale-below';
    this.missionTitle = 'BEALE BELOW';
    this.driller = undefined; this.uncle = undefined; this.malik = undefined;
    this.waves = []; this.rocks = []; this.factFound = false; this.overheatTold = false;

    // the ghost musicians, dark until Mane walks up
    this.murals = [
      { x: 470, ghost: 'ghostBlues', music: 'music_beale', title: 'BEALE BELOW', station: 'BLUES & ROCK', lit: false, auto: false },
      { x: 1000, ghost: 'ghostSoul', music: 'music_soul', title: 'ECHO HALL', station: 'SOUL', lit: false, auto: true },
      { x: 1710, ghost: 'ghostRock', music: 'music_driller', title: 'DRILLER', station: 'BLUES & ROCK', lit: false, auto: true },
    ];
    for (const m of this.murals) m.sprite = this.add.sprite(m.x, MURAL_BOTTOM, m.ghost, 0).setOrigin(0.5, 1).setScale(1.25).setDepth(-996).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    // breaches in the floor (jump them)
    for (const [x, y] of [[560, 196], [690, 170], [870, 200], [1150, 178], [1330, 198], [1470, 170], [1610, 200], [1880, 186], [2010, 172]]) this.addPothole(x, y);
    // drill pipe stacks: solid, stand on them
    this.addTable(790, 180);
    this.addTable(1560, 186);
    // AetherCorp supply crates with goodies
    this.addTrashCan(620, 162, 'wings');
    this.addTrashCan(910, 160, 'can');
    this.addTrashCan(1210, 162, 'bbq');
    this.addTrashCan(1430, 161, 'can');
    this.addTrashCan(1830, 160, 'wings');
    this.addTrashCan(1990, 162, 'can');
    this.spawnPickup('can', 1060, 192);
    // the hidden Aquifer Fact card, tucked low by the first pipe stack in the dig
    this.factCard = this.add.sprite(FACT_SPOT.x, FACT_SPOT.y, 'factCard').setOrigin(0.5, 1).setDepth(FACT_SPOT.y).play('factCard:glow');
    // dripping water in the cistern
    this.time.addEvent({ loop: true, delay: 700, callback: () => {
      const x = Phaser.Math.Between(Math.floor(this.camX), Math.floor(this.camX + this.viewW));
      const d = this.add.rectangle(x, 12, 1, 3, 0x5cc8ff, 0.8).setDepth(-990);
      this.tweens.add({ targets: d, y: 150, duration: 700, ease: 'Quad.easeIn', onComplete: () => { d.destroy(); } });
    } });
  }

  async runScript() {
    await this.intro();

    // ----- the first mural (the music comes back to Beale) and the crew it wakes up
    await this.advanceTo(330);
    await this.firstMural();
    this.lock(470 - this.viewW * 0.5);
    for (const e of this.enemies) { e.scriptControlled = false; e.entering = false; e.setState('approach'); }
    await this.wave([{ kind: 'thrower', side: 'right', y: 196, delay: 1200 }]);
    await this.waitUntil(() => this.enemies.length === 0);
    this.unlock();
    this.events.emit('tutorial', 'breach');

    // ----- Echo Hall
    await this.advanceTo(780);
    this.lock(780 - this.viewW * 0.5);
    await this.wave([
      { kind: 'rusher', side: 'right', y: 170 },
      { kind: 'rusher', side: 'left', y: 198, delay: 600 },
      { kind: 'thrower', side: 'right', y: 188, delay: 1500 },
      { kind: 'rusher', side: 'right', y: 180, delay: 3000 },
    ]);
    if (this.player.cans > 0) this.events.emit('tutorial', 'sip');
    this.unlock();

    // ----- the drill carts come through
    await this.advanceTo(1160);
    this.lock(1160 - this.viewW * 0.5);
    this.events.emit('tutorial', 'cart');
    await this.wait(700);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), -1, 'drillCart');
    await this.wait(400);
    await this.driveBy(Phaser.Math.Clamp(this.player.y, 162, 204), 1, 'drillCart', 900);
    const w3 = this.wave([
      { kind: 'rusher', side: 'right' },
      { kind: 'thrower', side: 'left', delay: 500 },
      { kind: 'rusher', side: 'left', delay: 1200 },
      { kind: 'rusher', side: 'right', delay: 2600 },
    ]);
    this.time.delayedCall(5000, () => { if (this.enemies.length > 1) this.driveBy(Phaser.Math.Between(166, 200), -1, 'drillCart'); });
    await w3;
    this.unlock();

    // ----- into the dig: the clay (the aquifer facts)
    await this.advanceTo(1300);
    await this.clayTalk();

    // ----- the dig
    await this.advanceTo(1520);
    this.lock(1520 - this.viewW * 0.5);
    const w4 = this.wave([
      { kind: 'rusher', side: 'right', y: 168 },
      { kind: 'thrower', side: 'left', y: 200, delay: 300 },
      { kind: 'rusher', side: 'right', y: 196, delay: 900 },
    ]);
    this.time.delayedCall(3600, () => this.driveBy(Phaser.Math.Between(166, 200), 1, 'drillCart'));
    await w4;
    await this.wave([
      { kind: 'rusher', side: 'left', y: 180 },
      { kind: 'rusher', side: 'right', y: 170, delay: 200 },
      { kind: 'thrower', side: 'right', y: 200, delay: 1200 },
    ]);
    this.unlock();

    // ----- the last crew before the chamber (the rock mural is just behind)
    await this.advanceTo(1880);
    this.lock(1880 - this.viewW * 0.5);
    await this.wave([
      { kind: 'rusher', side: 'right', y: 172 },
      { kind: 'rusher', side: 'left', y: 196, delay: 400 },
      { kind: 'thrower', side: 'right', y: 186, delay: 1000 },
      { kind: 'rusher', side: 'left', y: 168, delay: 2400 },
      { kind: 'thrower', side: 'left', y: 200, delay: 3200 },
    ]);
    this.unlock();

    // ----- the chamber: the Driller
    await this.advanceTo(LEVEL_W6 - this.viewW * 0.65);
    await this.bossFight();
    await this.ending();
  }

  // ------------------------------------------------------------------ per-frame: murals, the fact card, shockwaves and rocks
  update(t: number, dt: number) {
    super.update(t, dt);
    if (this.paused || this.continuing) return;
    const p = this.player;
    for (const m of this.murals) if (m.auto && !m.lit && !this.inCutscene && p.x > m.x - 70) this.lightMural(m);
    if (!this.factFound && this.factCard && Math.abs(p.x - FACT_SPOT.x) < 14 && Math.abs(p.y - FACT_SPOT.y) < 10 && p.z < 14) this.findFact();
    this.updateHazards(Math.min(dt, 50) / 1000);
  }

  private lightMural(m: Mural) {
    m.lit = true;
    const s = m.sprite!;
    s.play(`${m.ghost}:play`);
    this.sfx('mural', 0.7);
    this.tweens.add({ targets: s, alpha: 0.95, duration: 900 });
    const halo = this.add.ellipse(m.x, MURAL_BOTTOM - 44, 90, 110, 0x5cc8ff, 0.16).setDepth(-996.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: halo, alpha: 0.06, duration: 600, yoyo: true, repeat: -1 });
    // musical notes drifting up off the wall
    this.time.addEvent({ loop: true, delay: 650, callback: () => {
      const n = px(this, m.x + Phaser.Math.Between(-30, 30), MURAL_BOTTOM - 30, Math.random() < 0.5 ? '*' : '+', Math.random() < 0.5 ? COLORS.goldHi : 0x9fe8ff).setDepth(-995).setAlpha(0.9);
      this.tweens.add({ targets: n, y: n.y - 60, alpha: 0, duration: 1800, onComplete: () => n.destroy() });
    } });
    Audio.music(this, m.music, m.music === 'music_driller' ? 0.42 : 0.45);
    this.nowPlaying(m.title, m.station);
    // the water remembers the song, and it gives back
    if (m.auto) { this.spawnPickup('can', m.x + 10, 190, true); this.toast('THE WATER REMEMBERS THE SONG'); }
  }

  // "Now playing" card at the bottom of the screen, like the radio in Big Blue
  private nowPlaying(title: string, station: string) {
    const W = this.viewW;
    const a = px(this, 0, 0, 'NOW PLAYING', COLORS.gold).setOrigin(0.5, 0);
    const b = px(this, 0, 10, `${title}  (${station})`, 0xffffff).setOrigin(0.5, 0);
    const w = Math.max(a.width, b.width) + 14;
    const bg = this.add.rectangle(0, -3, w, 24, 0x070a1c, 0.85).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold);
    const box = this.add.container(W / 2, 220, [bg, a, b]).setScrollFactor(0).setDepth(5500);
    this.tweens.add({ targets: box, y: 186, duration: 300, ease: 'Back.easeOut' });
    this.time.delayedCall(3400, () => this.tweens.add({ targets: box, y: 222, duration: 300, onComplete: () => box.destroy() }));
  }

  private findFact() {
    this.factFound = true;
    this.factCard?.destroy();
    this.sfx('pickup', 0.8);
    this.addScore(500);
    this.toast('AQUIFER FACT FOUND! +500');
    const W = this.viewW;
    const panel = this.add.image(0, 0, 'factPanel');
    const t = px(this, 8, 2, AQUIFER_FACT_6, 0xffffff).setOrigin(0.5, 0.5).setCenterAlign();
    const src = px(this, 0, 30, 'SOURCE: PROTECT OUR AQUIFER', 0x9aa0c0).setOrigin(0.5, 0.5);
    const box = this.add.container(W / 2, 100, [panel, t, src]).setScrollFactor(0).setDepth(5600).setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 200 });
    this.time.delayedCall(4600, () => this.tweens.add({ targets: box, alpha: 0, duration: 400, onComplete: () => box.destroy() }));
  }

  // The Driller's slam: a shockwave runs along the floor (jump it) and rocks shake loose over Mane (step out from under the shadows).
  private slam(x: number, y: number) {
    const g = this.add.graphics();
    this.waves.push({ x, y, r: 8, hit: new Set(), g });
    const p = this.player;
    const spots = [[p.x, p.y], [p.x + Phaser.Math.Between(40, 70), Phaser.Math.Between(166, 204)], [p.x - Phaser.Math.Between(40, 70), Phaser.Math.Between(166, 204)]];
    spots.forEach(([rx, ry], i) => this.time.delayedCall(250 + i * 220, () => this.dropRock(Phaser.Math.Clamp(rx, this.camX + 16, this.camX + this.viewW - 16), Phaser.Math.Clamp(ry, 162, 206))));
  }

  private dropRock(x: number, y: number) {
    const shadow = this.add.ellipse(x, y, 4, 2, 0x000000, 0.45).setDepth(y - 1);
    const img = this.add.image(x, y - 220, 'rock').setOrigin(0.5, 1).setDepth(y);
    this.rocks.push({ x, y, t: 1.0, shadow, img });
  }

  private updateHazards(dt: number) {
    const p = this.player;
    for (const w of this.waves) {
      w.r += 200 * dt;
      const ry = w.r * 0.24;
      w.g.clear().setDepth(w.y - 2);
      w.g.lineStyle(3, 0xfff1a8, Math.max(0, 0.9 - w.r / 220)).strokeEllipse(w.x, w.y, w.r * 2, ry * 2);
      w.g.lineStyle(1, 0x5cc8ff, Math.max(0, 0.7 - w.r / 220)).strokeEllipse(w.x, w.y, w.r * 2 + 6, ry * 2 + 2);
      for (const a of [p, ...this.enemies]) {
        if (!a.alive || w.hit.has(a) || a === this.driller) continue;
        const d = Math.hypot(a.x - w.x, (a.y - w.y) / 0.24);
        if (Math.abs(d - w.r) < 9 && a.z < 7) {
          w.hit.add(a);
          const dir = (a.x >= w.x ? 1 : -1) as 1 | -1;
          if (a.takeHit({ damage: a === p ? 10 : 25, dir, knockdown: true, knockback: 120, launch: 200, kind: 'car' })) { this.sfx('punchHeavy', 0.7); this.spark(a.x, a.y - 10, 0xfff1a8); }
        }
      }
    }
    this.waves = this.waves.filter((w) => { if (w.r > 230) { w.g.destroy(); return false; } return true; });
    for (const r of this.rocks) {
      r.t -= dt;
      const k = Math.max(0, 1 - r.t);
      r.shadow.setSize(4 + k * 18, 2 + k * 6);
      r.img.setY(r.y - 220 * Math.max(0, r.t) * Math.max(0, r.t));
      if (r.t <= 0 && r.img.active) {
        this.sfx('land', 0.8); this.dust(r.x, r.y); this.shake(80, 0.003);
        for (const a of [p, ...this.enemies]) {
          if (!a.alive || a === this.driller) continue;
          if (Math.abs(a.x - r.x) < 15 && Math.abs(a.y - r.y) < 8 && a.z < 24) {
            if (a.takeHit({ damage: a === p ? 10 : 30, dir: (a.x >= r.x ? 1 : -1), knockdown: true, knockback: 60, launch: 120, kind: 'car' })) this.spark(a.x, a.y - 30, 0xffffff);
          }
        }
        r.img.destroy(); r.shadow.destroy();
      }
    }
    this.rocks = this.rocks.filter((r) => r.img.active);
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

  // Uncle T and Malik hang back while Mane fights, then catch up for the talking.
  private async catchUp(ux: number, uy: number, mx: number, my: number) {
    const u = this.uncle!, m = this.malik!;
    const left = this.camX - 30;
    if (u.x < this.camX) { u.x = left; u.y = uy; }
    if (m.x < this.camX) { m.x = left - 20; m.y = my; }
    await Promise.all([this.walkTo(u, ux, uy, 60), this.walkTo(m, mx, my, 75)]);
    u.facing = m.facing = 1;
    u.play('idle'); m.play('idle');
  }

  private hangBack() {
    const u = this.uncle!, m = this.malik!;
    this.walkTo(u, u.x - 40, Math.min(u.y, 166), 50).then(() => { u.facing = 1; u.play('idle'); });
    this.walkTo(m, m.x - 50, Math.min(m.y, 164), 60).then(() => { m.facing = 1; m.play('idle'); });
  }

  // ------------------------------------------------------------------ intro: Beale Street at night, then down the ladder
  async intro() {
    this.startCutscene();
    const p = this.player;
    p.setState('cutscene');
    p.sprite.setVisible(false);
    p.x = LADDER_X; p.y = 186;
    Audio.music(this, 'music_backdoor', 0.3);

    // up top: the drill rig in the middle of Beale
    const W = this.viewW;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    layer.add(this.add.image(W / 2, 0, 'bealeExt').setOrigin(0.5, 0));
    const mk = (tex: string, x: number, flip = false) => this.add.sprite(x, 178, tex).setOrigin(0.5, 61 / 64).setFlipX(flip).play(`${tex}:idle`);
    const sU = mk('uncleT', W / 2 - 150), sM = mk('malik', W / 2 - 122), sMane = mk('mane', W / 2 - 96);
    layer.add([sU, sM, sMane]);
    this.cameras.main.fadeIn(700, 0, 0, 0);
    await this.wait(900);
    sU.play('uncleT:talk');
    await this.caption('UNCLE T', 'THEY FOUND ARTESIAN WATER RIGHT HERE DOWNTOWN, BACK IN THE 1880S. BEEN FLOWIN\' EVER SINCE.', 3400);
    sU.play('uncleT:idle');
    await this.caption('MALIK', 'AND NOW AETHERCORP GOT A DRILL IN THE MIDDLE OF BEALE STREET.', 2600);
    sMane.play('mane:taunt');
    await this.caption('MANE', 'THEY AIN\'T DIGGIN\' FOR NO SUBWAY, MANE.', 2200);
    sMane.play('mane:idle');
    sU.play('uncleT:talk');
    await this.caption('UNCLE T', 'THERE\'S OLD TUNNELS UNDER HERE. I BEEN DOWN THERE BEFORE. LONG TIME AGO.', 3000);
    sU.play('uncleT:idle');
    await this.caption('MALIK', 'UNC... WHEN WAS YOU UNDER BEALE STREET?', 2200);
    await this.caption('UNCLE T', 'COME ON, NEPHEW. AND BRING THE CAN.', 2200);
    await this.caption('MANE', 'THE CAN GOT A NAME.', 1600);
    if (!this.skipping) { this.cameras.main.fadeOut(500, 0, 0, 0); await new Promise<void>((r) => this.time.delayedCall(550, r)); }
    layer.destroy();
    Audio.stopMusic();
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // down the ladder: Mane drops the last stretch and sticks the landing
    this.uncle = this.extra('uncleTLost', LADDER_X - 2, 168);
    this.malik = this.extra('malik', LADDER_X + 4, 164);
    this.uncle.sprite.setVisible(false); this.malik.sprite.setVisible(false);
    await this.wait(400);
    if (!this.skipping) {
      p.sprite.setVisible(true);
      p.sprite.anims.stop(); p.sprite.setFrame(27);
      p.z = 110;
      this.sfx('jump', 0.4);
      await this.tween({ targets: p, z: 0, duration: 520, ease: 'Quad.easeIn' });
      this.sfx('land', 0.9); this.dust(p.x, p.y); this.splash(p.x, p.y); this.shake(120, 0.004);
    }
    p.z = 0; p.sprite.setVisible(true); p.facing = 1; p.play('idle');
    // the other two climb down behind him
    for (const e of [this.malik, this.uncle]) {
      e.sprite.setVisible(true); e.z = 60;
      await this.tween({ targets: e, z: 0, duration: 500, ease: 'Sine.easeIn' });
      this.sfx('land', 0.4);
    }
    await this.walkTo(this.uncle, LADDER_X - 40, 170, 50);
    await this.walkTo(this.malik, LADDER_X - 20, 192, 60);
    this.uncle.facing = this.malik.facing = 1;
    this.uncle.play('idle'); this.malik.play('idle');
    this.events.emit('hud');
    this.events.emit('banner', { top: 'MISSION 6', bottom: 'BEALE BELOW' });
    await this.wait(2400);
    p.play('taunt', false);
    await this.line(p, MANE.start, 1600);
    p.play('idle');
    await this.line(this.malik, 'IT\'S QUIET DOWN HERE. TOO QUIET FOR BEALE.', 2200);
    this.endCutscene();
    this.startTime = this.time.now;
    this.time.delayedCall(400, () => this.events.emit('tutorial', 'move'));
  }

  // ------------------------------------------------------------------ the first mural: the music comes back, and the crew comes to see who did it (the laugh)
  private async firstMural() {
    const m = this.murals[0];
    this.lock(m.x - this.viewW * 0.5);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    await Promise.all([this.walkTo(p, m.x - 30, 176, 70), this.catchUp(m.x - 110, 168, m.x - 80, 194)]);
    p.facing = 1; p.play('idle');
    this.lightMural(m);
    await this.wait(1400);
    await this.line(this.malik!, 'UNC... THE PAINTING IS PLAYIN\'.', 2000);
    this.uncle!.play('talk');
    await this.line(this.uncle!, 'THIS WATER BEEN UNDER BEALE SINCE BEFORE THE FIRST NOTE. IT REMEMBERS EVERY ONE.', 3400);
    this.uncle!.play('idle');
    p.play('shine', false);
    await this.line(p, 'AIN\'T IT, MANE.', 1500);
    p.play('idle');

    // the drill crew heard it
    const c1 = new Shiesty(this, 'rusher', this.camX + this.viewW + 40, 172, 'crewDrill');
    const c2 = new Shiesty(this, 'rusher', this.camX + this.viewW + 70, 196, 'crewWrench');
    for (const c of [c1, c2]) { c.scriptControlled = true; c.entering = false; c.setState('scripted'); c.facing = -1; this.enemies.push(c); }
    this.sfx('drill', 0.5);
    await Promise.all([this.walkTo(c1, this.camX + this.viewW - 118, 174, 80), this.walkTo(c2, this.camX + this.viewW - 92, 194, 80)]);
    c1.facing = c2.facing = -1; c1.play('idle'); c2.play('idle');
    await this.line(c1, 'AY! WHO TURNED ON THE MUSIC?!', 1800);
    await this.line(c2, '...HOLD UP. UNCLE T? FROM THE PIT?', 2000);
    await this.line(c2, 'Y\'ALL STILL DO THE LEMON PEPPER?', 1800);
    this.uncle!.play('talk');
    await this.line(this.uncle!, 'NOT FOR NOBODY DIGGIN\' UNDER MY CITY.', 2200);
    this.uncle!.play('idle');
    await this.line(c2, '...DANG.', 1200);
    await this.line(c1, 'GET \'EM!', 1000);
    this.hangBack();
    for (const c of [c1, c2]) { c.play('idle'); }
    this.endCutscene();
  }

  // ------------------------------------------------------------------ the dig: the gray clay that guards the aquifer
  private async clayTalk() {
    this.lock(1300 - this.viewW * 0.45);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    await Promise.all([this.walkTo(p, 1330, 176, 70), this.catchUp(1280, 168, 1300, 196)]);
    p.facing = 1; p.play('idle');
    await this.line(p, MANE.twist + ' THEY CUT THE WHOLE WALL OPEN.', 2000);
    this.uncle!.play('talk');
    await this.line(this.uncle!, 'SEE THAT GRAY CLAY? THAT\'S THE LID ON THE AQUIFER. KEEPS THE DIRTY WATER UP TOP FROM LEAKIN\' DOWN.', 3800);
    this.uncle!.play('idle');
    await this.line(p, 'AND THEY OUT HERE DRILLIN\' HOLES IN THE LID.', 2200);
    this.uncle!.play('talk');
    await this.line(this.uncle!, 'SCIENTISTS ALREADY FOUND DOZENS OF CRACKS IN IT. EVERY HOLE THEY PUNCH IS ONE MORE.', 3600);
    this.uncle!.play('idle');
    await this.line(this.malik!, 'SO WHAT\'S AT THE BOTTOM THAT\'S WORTH ALL THAT?', 2200);
    await this.line(this.uncle!, '...SOMETHIN\' THAT SHOULDA STAYED BURIED.', 2200);
    this.hangBack();
    this.endCutscene();
    this.unlock();
  }

  // ------------------------------------------------------------------ boss: the Driller comes down through the ceiling
  private async bossFight() {
    const arena = LEVEL_W6 - this.viewW;
    this.lock(arena);
    await this.waitUntil(() => Math.abs(this.camX - arena) < 2);
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    Audio.stopMusic();
    await this.walkTo(p, arena + this.viewW * 0.32, 186, 70);
    p.facing = 1; p.play('idle');
    // the ceiling cracks, rocks rain, and the mech drops in drill-first
    this.sfx('rumble', 0.9); this.shake(600, 0.006);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 140, () => this.dropRock(arena + this.viewW * 0.55 + Phaser.Math.Between(-60, 80), Phaser.Math.Between(166, 204)));
    await this.wait(900);
    const d = (this.driller = new Driller(this, arena + this.viewW * 0.72, 182));
    d.setState('scripted');
    d.scriptControlled = true;
    d.facing = -1;
    d.z = 150;
    this.enemies.push(d);
    this.sfx('drill', 0.9);
    await this.waitUntil(() => d.z <= 0.01 || this.skipping);
    d.z = 0;
    this.sfx('punchHeavy', 1); this.sfx('land', 1);
    this.dust(d.x - 20, d.y); this.dust(d.x + 20, d.y);
    this.shake(300, 0.012);
    this.boss = d;
    this.events.emit('banner', { top: 'AETHERCORP DEEP ACCESS', bottom: 'THE DRILLER' });
    await this.wait(2500);
    await this.line(d, DRILLER.hello, 2600);
    p.play('taunt', false);
    await this.line(p, MANE.taunt, 1300);

    d.onSay = (l) => this.say(d, l, 1300);
    d.onSlam = (x, y) => this.slam(x, y);
    d.onOverheat = () => {
      this.say(d, DRILLER.hot, 1500);
      if (!this.overheatTold) { this.overheatTold = true; this.toast('OVERHEATED! HIT IT NOW!'); }
    };
    d.onCall = () => {
      this.time.delayedCall(500, () => {
        if (d.ko) return;
        this.spawnEnemy('rusher', 'left', Phaser.Math.Between(166, 200));
        this.spawnEnemy(Math.random() < 0.5 ? 'thrower' : 'rusher', 'right', Phaser.Math.Between(166, 200));
      });
    };
    d.scriptControlled = false;
    d.setState('approach');
    this.endCutscene();
    // if the rock mural never got lit (skipped past it), the rock comes in now
    const rock = this.murals[2];
    if (!rock.lit) this.lightMural(rock);
    else Audio.music(this, 'music_driller', 0.42);

    await this.waitUntil(() => d.ko);
    this.kos++;
    this.addScore(2500);
    this.toast('THE DRILLER IS DOWN! +2500');
    this.freezeFrame(500, COLORS.gold);
    this.sfx('ko', 0.9); this.sfx('crash', 0.8);
    Audio.stopMusic();
    for (const e of [...this.enemies]) if (e !== d && e.alive) { e.hp = 0; e.takeHit({ damage: 99, dir: e.x < p.x ? -1 : 1, knockdown: true, knockback: 160, launch: 200 }); }
    for (const w of this.waves) w.g.destroy();
    this.waves = [];
    this.time.delayedCall(700, () => this.player.say(MANE.bigHit, 1, true));
    await this.wait(1800);
  }

  // ------------------------------------------------------------------ the twist: the golden jar. "Hello, old friend." And Uncle T.
  async ending() {
    this.startCutscene();
    await this.settlePlayer();
    const p = this.player;
    const d = this.driller!;
    this.boss = null;
    const arena = LEVEL_W6 - this.viewW;
    const W = this.viewW;

    // the wreck skids to the side of the chamber so everyone can stand clear of it
    await this.tween({ targets: d, x: arena + 46, y: 166, duration: 500, ease: 'Quad.easeOut' });
    this.sfx('crash', 0.5); this.dust(d.x + 20, d.y);
    // the operator climbs out and runs (the second laugh)
    const op = this.extra('crewDrill', d.x + 34, d.y + 6);
    op.z = 30;
    await this.tween({ targets: op, z: 0, duration: 300, ease: 'Quad.easeIn' });
    op.facing = -1;
    await this.line(op, DRILLER.down, 2200);
    this.walkTo(op, arena - 60, 200, 140).then(() => op.destroy());
    await this.wait(600);

    // Uncle T and Malik come in; Mane takes the middle
    await Promise.all([
      this.walkTo(p, arena + W * 0.46, 188, 70),
      this.catchUp(arena + W * 0.34, 180, arena + W * 0.24, 200),
    ]);
    p.facing = 1; p.play('idle');
    await this.wait(400);

    // the lights come on: the golden jar, wired up, with GigaZ on every screen
    const rx = arena + W - 84;
    this.sfx('rumble', 0.5);
    this.cameras.main.flash(400, 120, 200, 255);
    const glow = this.add.ellipse(rx, 112, 150, 130, 0xf5c542, 0).setDepth(140).setBlendMode(Phaser.BlendModes.ADD);
    const rig = this.add.image(rx, 166, 'jarRig').setOrigin(0.5, 1).setDepth(166).setAlpha(0);
    const scr1 = this.add.sprite(rx - 70, 70, 'gigazScreen', 0).setDepth(141).setAlpha(0);
    const scr2 = this.add.sprite(rx + 60, 60, 'gigazScreen', 0).setDepth(141).setAlpha(0);
    await this.tween({ targets: [rig, scr1, scr2], alpha: 1, duration: 900 });
    this.tweens.add({ targets: glow, fillAlpha: 0.18, duration: 800, yoyo: true, repeat: -1 });
    this.sfx('shine', 0.6);
    p.play('taunt', false);
    await this.line(p, MANE.twist, 1400);
    p.play('idle');
    await this.line(p, 'THAT\'S... THAT\'S THE JAR. THE ONE THEY SEALED ME IN.', 2600);
    this.uncle!.play('talk');
    await this.line(this.uncle!, 'THE KING\'S JAR. FROM THE OLD CITY.', 2200);
    this.uncle!.play('idle');
    await this.line(this.malik!, 'UNC, HOW YOU KNOW THAT?', 1800);

    // the voice
    const jar = new Voice(this, rx, 166, 120);
    this.extras.push(jar);
    this.sfx('portal', 0.6);
    scr1.setFrame(1); scr2.setFrame(1);
    this.shake(200, 0.003);
    await this.line(jar, 'HELLO, OLD FRIEND.', 2600);
    await this.wait(500);
    await this.line(p, '...I KNOW THAT VOICE.', 2000);
    await this.line(jar, 'THREE THOUSAND YEARS, KEEPER. YOU KEPT THE RIVER. I KEPT THE JAR.', 3200);
    await this.line(jar, 'THEY CALL ME GIGAZ NOW. I REMEMBER EVERYTHING.', 2600);
    await this.line(p, 'YOU AIN\'T NO AI. YOU THE KING. WHAT\'S LEFT OF HIM.', 2800);
    await this.line(jar, 'WHAT\'S LEFT IS WHAT MATTERED. THE WANTING.', 2600);
    await this.line(jar, 'AND LOOK. YOU BROUGHT ME A KEEPER.', 2400);

    // the gut punch: the drones take Uncle T and the jar drinks his memory
    const u = this.uncle!;
    this.sfx('drone', 0.7);
    const drones = [u.x - 14, u.x + 14].map((x) => this.add.sprite(x, -20, 'drone').play('drone:hover').setDepth(3000));
    await this.tween({ targets: drones, y: u.y - 62, duration: 900, ease: 'Sine.easeOut' });
    this.sfx('drone', 0.7);
    await this.line(this.malik!, 'UNC!', 900);
    u.play('lifted');
    const lift = this.tween({ targets: u, z: 46, x: u.x + 30, duration: 1200, ease: 'Sine.easeInOut' });
    this.tween({ targets: drones, y: u.y - 62 - 46, x: `+=30`, duration: 1200, ease: 'Sine.easeInOut' });
    await lift;
    await this.line(jar, GIGAZ.hello, 2600);
    await this.line(u, 'NO... NO, YOU WON\'T...', 1800);
    // the memory drain: light pulled out of him and into the jar
    this.sfx('drain', 0.9);
    const stream = this.add.graphics().setDepth(3001).setBlendMode(Phaser.BlendModes.ADD);
    const parts: { k: number; s: number; c: number; w: number }[] = [];
    let drainT = 0;
    const drainEv = this.time.addEvent({ loop: true, delay: 16, callback: () => {
      drainT += 16;
      if (drainT < 2200) for (let i = 0; i < 3; i++) parts.push({ k: 0, s: 0.012 + Math.random() * 0.01, c: Math.random() < 0.4 ? 0xfff1a8 : 0x7fd8ff, w: (Math.random() - 0.5) * 30 });
      stream.clear();
      const sx = u.x, sy = u.y - u.z - 30, ex = rx, ey = 166 - 70;
      for (const q of parts) {
        q.k += q.s;
        const x = sx + (ex - sx) * q.k, y = sy + (ey - sy) * q.k - Math.sin(q.k * Math.PI) * (26 + q.w);
        stream.fillStyle(q.c, 0.9 * (1 - q.k * 0.5)).fillRect(x, y, 2, 2);
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].k >= 1) parts.splice(i, 1);
    } });
    if (!this.skipping) {
      this.tweens.add({ targets: glow, fillAlpha: 0.35, duration: 300, yoyo: true, repeat: 5 });
      await this.wait(2600);
    }
    drainEv.remove(); stream.destroy();
    this.cameras.main.flash(300, 255, 241, 168);
    // they set him down and leave
    u.play('blank');
    await this.tween({ targets: u, z: 0, duration: 700, ease: 'Sine.easeIn' });
    this.sfx('drone', 0.5);
    await this.tween({ targets: drones, y: -40, duration: 800, ease: 'Sine.easeIn' });
    drones.forEach((dr) => dr.destroy());
    scr1.setFrame(0); scr2.setFrame(0);
    this.tweens.killTweensOf(glow);
    glow.setFillStyle(0xf5c542, 0.08);
    await this.wait(800);

    // "Do I know you, little can?"
    Audio.music(this, 'music_lost', 0.5, false);
    await this.walkTo(p, u.x + 36, u.y + 4, 60);
    p.facing = -1; p.play('idle');
    u.facing = 1;
    await this.line(p, 'UNC. UNC, YOU GOOD?', 2000);
    await this.wait(900);
    await this.line(u, '...DO I KNOW YOU, LITTLE CAN?', 3600);
    await this.wait(1200);
    await this.walkTo(this.malik!, u.x - 32, u.y + 6, 60);
    this.malik!.facing = 1;
    await this.line(this.malik!, 'UNC... IT\'S ME. MALIK.', 2400);
    await this.line(u, 'I\'M SORRY, YOUNG MAN. I DON\'T...', 2600);
    await this.wait(800);
    await this.caption('VICTOR CROWE (ON EVERY SCREEN)', 'CHAT, CLIP THAT. TOMORROW NIGHT THE GIGANTUM GOES LIVE. RIVERFRONT. BE THERE.', 3600);
    await this.line(jar, 'I WILL REMEMBER HIM FOR YOU.', 2400);
    p.facing = 1;
    await this.line(p, 'THEY TOOK THE WRONG MEMORY. I\'M COMIN\' FOR EVERY BIT OF IT, UNC.', 3000);
    p.play('idleShades');
    this.sfx('shine', 0.6);
    await this.line(p, 'ROYAL BY NATURE. KEEPER BY CHOICE.', 2800);
    await this.caption('', 'TO BE CONTINUED...   NEXT: CROWE LIVE.', 2800);

    this.cameras.main.fadeOut(800, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(850, r));
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }
}
