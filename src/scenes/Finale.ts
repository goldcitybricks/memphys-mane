import Phaser from 'phaser';
import { Audio } from '../core/audio';
import { COLORS, MEMPHYS_URL } from '../core/config';
import { px, wrap } from '../core/text';
import { Controls } from '../core/controls';
import type { MissionStats } from '../modes/brawler/BrawlerScene';
import { ALL_FACTS } from '../missions/lines';

// The end credits: the cast, the music, what the water remembers, the last card, then the post-credits scene.
// Hold (or tap and hold) to roll faster. After the scene it lands on the Mission 10 results.
const MUSIC = ['PIT STOP', 'BACK DOOR SOUL', 'RIVER KEEPER', 'JACKAL MARCH', 'FIGHT NIGHT', 'BRIDGE RUN', 'THE PLANT', 'CAPPING LINE', 'BEALE BELOW', 'ECHO HALL', 'DRILLER', 'DO I KNOW YOU', 'CROWE LIVE', 'SIGNAL LOST', 'THE LOOP', 'CONVOY', 'THE GIGANTUM', 'COLD STORAGE', 'THE SOURCE', 'PHARAOH OF DENILE', 'MEMPHIS REMEMBER', 'ROYAL BY NATURE'];

type Row = { t: string; c?: number; s?: number; gap?: number; sprite?: string };

export class Finale extends Phaser.Scene {
  private stats?: MissionStats;
  private fast = false;
  constructor() { super('Finale'); }

  init(data: { stats?: MissionStats }) { this.stats = data?.stats; this.fast = false; }

  create() {
    Controls.clear();
    const W = this.scale.width;
    this.cameras.main.setBackgroundColor('#070a1c');
    Audio.music(this, 'music_credits', 0.5, true);
    // the water table behind it all, slowly drifting
    this.add.tileSprite(0, 0, W, 216, 'sourceExt').setOrigin(0).setAlpha(0.18).setScrollFactor(0);
    for (let i = 0; i < 26; i++) {
      const d = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 216), 1, 2, 0x5ce1ff, 0.5).setScrollFactor(0);
      this.tweens.add({ targets: d, y: 230, duration: Phaser.Math.Between(5000, 9000), repeat: -1, delay: Phaser.Math.Between(0, 4000), onRepeat: () => { d.y = -4; d.x = Phaser.Math.Between(0, W); } });
    }

    const rows: Row[] = [
      { t: 'THE LEGEND OF MEMPHYS MANE', c: COLORS.goldHi, s: 2, gap: 24 },
      { t: 'A PROMO GAME FOR MEMPHYS WATER', c: COLORS.cream, gap: 30 },
      { t: 'STARRING', c: COLORS.gold, gap: 8 },
      { t: 'MEMPHYS MANE', sprite: 'mane:idleShades', gap: 4 },
      { t: 'UNCLE T', sprite: 'uncleT:idle', gap: 4 },
      { t: 'MALIK', sprite: 'malik:idle', gap: 4 },
      { t: 'NIA', sprite: 'nia:idle', gap: 4 },
      { t: 'VICTOR CROWE', sprite: 'victor:idle', gap: 4 },
      { t: 'AND THE PIPS, THE JACKALS, THE SHIESTIES', c: 0x9aa0c0 },
      { t: 'AND O.G., THE DRIFTERS, AND THE MUSICIANS', c: 0x9aa0c0, gap: 30 },
      { t: 'CREATIVE DIRECTOR', c: COLORS.gold, gap: 6 },
      { t: 'JACK', gap: 22 },
      { t: 'ART + CODE', c: COLORS.gold, gap: 6 },
      { t: 'FIRST-PASS PIXEL ART, DRAWN IN CODE', gap: 22 },
      { t: 'ORIGINAL MUSIC', c: COLORS.gold, gap: 6 },
      ...MUSIC.map((m, i) => ({ t: m, gap: i === MUSIC.length - 1 ? 22 : 2 })),
      { t: 'ENGINE', c: COLORS.gold, gap: 6 },
      { t: 'PHASER 3 (MIT LICENSE)', gap: 22 },
      { t: 'PLACES', c: COLORS.gold, gap: 6 },
      { t: 'UNCLE T\'S PIT IS FICTIONAL. ORANGE MOUND, MEMPHIS TN', gap: 2 },
      { t: 'OLD MEMPHIS IS IMAGINED, INSPIRED BY MEMPHIS, EGYPT', gap: 36 },
      { t: 'WHAT THE WATER REMEMBERS', c: COLORS.goldHi, s: 2, gap: 16 },
    ];
    for (const [fact, src] of ALL_FACTS) {
      for (const line of wrap(fact, Math.floor((W - 40) / 6)).split('\n')) rows.push({ t: line, gap: 2 });
      rows.push({ t: `(${src})`, c: 0x5ce1ff, gap: 14 });
    }

    // lay the roll out in one container that scrolls up
    const roll = this.add.container(0, 0);
    let y = 230;
    for (const r of rows) {
      if (r.sprite) {
        const [tex] = r.sprite.split(':');
        const spr = this.add.sprite(W / 2, y + 44, tex).setOrigin(0.5, 61 / 64).play(r.sprite);
        if (tex === 'victor') spr.setFlipX(true);
        roll.add(spr);
        y += 46;
      }
      const t = px(this, W / 2, y, r.t, r.c ?? 0xffffff, r.s ?? 1).setOrigin(0.5, 0);
      roll.add(t);
      y += (r.s ?? 1) * 9 + (r.gap ?? 4);
    }
    const end = y + 40;

    const hint = px(this, W - 6, 206, 'HOLD TO SPEED UP', 0x9aa0c0).setOrigin(1, 0).setAlpha(0.6).setScrollFactor(0);
    this.input.on('pointerdown', () => { this.fast = true; });
    this.input.on('pointerup', () => { this.fast = false; });
    const kb = this.input.keyboard;
    kb?.on('keydown', () => { this.fast = true; });
    kb?.on('keyup', () => { this.fast = false; });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.removeAllListeners(); kb?.removeAllListeners(); });

    let done = false;
    this.events.on('update', (_t: number, dtMs: number) => {
      if (done) return;
      const held = this.fast || Controls.isDown('attack');
      roll.y -= (dtMs / 1000) * (held ? 120 : 22);
      if (roll.y + end < 0) { done = true; hint.destroy(); roll.destroy(); this.lastCard(); }
    });
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  // the last card holds until a tap
  private lastCard() {
    const W = this.scale.width;
    const card = this.add.container(0, 0).setAlpha(0);
    card.add(this.add.image(W / 2, 74, 'finalCard'));
    card.add(px(this, W / 2, 46, 'MEMPHIS DRINKS 2,000-YEAR-OLD WATER,', 0xffffff).setOrigin(0.5, 0));
    card.add(px(this, W / 2, 58, 'FILTERED BY NATURE.', 0xffffff).setOrigin(0.5, 0));
    card.add(px(this, W / 2, 78, 'PROTECT IT.', COLORS.goldHi, 2).setOrigin(0.5, 0));
    const caeser = px(this, W / 2, 132, '> CAESER: MEMPHIS.EDU/CAESER', 0x5ce1ff).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    const poa = px(this, W / 2, 146, '> PROTECTOURAQUIFER.ORG', 0x5ce1ff).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    const royal = px(this, W / 2, 166, 'ROYAL BY NATURE.', COLORS.gold).setOrigin(0.5, 0);
    const site = px(this, W / 2, 180, '> MEMPHYSWATER.COM', COLORS.gold).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    const cont = px(this, W / 2, 202, 'TAP TO CONTINUE', 0x9aa0c0).setOrigin(0.5, 0).setAlpha(0);
    card.add([caeser, poa, royal, site, cont]);
    const open = (url: string) => (e?: Phaser.Input.Pointer) => { void e; window.open(url, '_blank', 'noopener'); };
    let linkHit = false;
    caeser.on('pointerdown', () => { linkHit = true; open('https://www.memphis.edu/caeser/')(); });
    poa.on('pointerdown', () => { linkHit = true; open('https://www.protectouraquifer.org')(); });
    site.on('pointerdown', () => { linkHit = true; open(MEMPHYS_URL)(); });
    this.tweens.add({ targets: card, alpha: 1, duration: 1200 });
    Audio.sfx(this, 'shine', { volume: 0.6 });
    this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: cont, alpha: 1, duration: 300 });
      this.tweens.add({ targets: cont, alpha: 0.35, duration: 500, yoyo: true, repeat: -1, delay: 300 });
      const go = () => {
        if (linkHit) { linkHit = false; return; }
        this.input.off('pointerup', go); this.input.keyboard?.off('keydown-ENTER', go); this.input.keyboard?.off('keydown-Z', go);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(650, () => { card.destroy(); this.postCredits(); });
      };
      this.input.on('pointerup', go);
      this.input.keyboard?.on('keydown-ENTER', go);
      this.input.keyboard?.on('keydown-Z', go);
    });
  }

  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(this.fast ? ms * 0.4 : ms, r)); }

  private async say(x: number, y: number, who: string, line: string, ms: number) {
    const W = this.scale.width;
    const box = this.add.container(0, 0).setDepth(900);
    box.add(this.add.rectangle(W / 2, 196, W - 16, 30, 0x070a1c, 0.88).setStrokeStyle(1, COLORS.gold));
    box.add(px(this, 14, 184, who, COLORS.gold).setOrigin(0, 0));
    box.add(px(this, 14, 196, line, 0xffffff).setOrigin(0, 0));
    void x; void y;
    Audio.sfx(this, 'blip', { volume: 0.4 });
    await this.wait(ms);
    box.destroy();
  }

  // after the credits: back in the alley behind Uncle T's, where it all started
  private async postCredits() {
    const W = this.scale.width;
    this.fast = false;
    Audio.music(this, 'music_pitstop', 0.3, true);
    const cam = this.cameras.main;
    const bx = 280;
    this.add.tileSprite(0, 0, W, 216, 'bgSky').setOrigin(0).setDepth(-10);
    this.add.tileSprite(0, 0, W, 216, 'bgFar').setOrigin(0).setDepth(-9).setTilePosition(bx * 0.3, 0);
    this.add.image(-bx, 0, 'bgGround').setOrigin(0).setDepth(-8);
    this.add.image(-bx, 0, 'bgWall').setOrigin(0).setDepth(-7);
    cam.fadeIn(800, 0, 0, 0);
    px(this, W / 2, 10, 'MEANWHILE, BEHIND UNCLE T\'S PIT...', COLORS.cream).setOrigin(0.5, 0);

    const vic = this.add.sprite(-30, 186, 'victor').setOrigin(0.5, 61 / 64).play('victor:trash').setDepth(186);
    await new Promise<void>((r) => this.tweens.add({ targets: vic, x: W / 2 - 30, duration: 2400, onComplete: () => r() }));
    Audio.sfx(this, 'crash', { volume: 0.4 });
    await this.say(0, 0, 'VICTOR', 'DISHES. TRASH. DISHES. TRASH. THIS IS MY CONTENT NOW.', 2600);
    vic.play('victor:sniff');
    await this.wait(1200);
    await this.say(0, 0, 'VICTOR', 'IS THIS... SMOKED PROTEIN?', 2400);
    const unc = this.add.sprite(W + 30, 188, 'uncleT').setOrigin(0.5, 61 / 64).setFlipX(true).play('uncleT:walk').setDepth(188);
    await new Promise<void>((r) => this.tweens.add({ targets: unc, x: W / 2 + 60, duration: 1400, onComplete: () => r() }));
    unc.play('uncleT:talk');
    await this.say(0, 0, 'UNCLE T', 'IT\'S BARBECUE, VICTOR.', 2400);
    unc.play('uncleT:idle');
    // the rib slips, and the alley takes it
    const hole = this.add.image(W / 2 - 4, 192, 'pothole').setDepth(150);
    const rib = this.add.rectangle(vic.x + 10, 150, 8, 3, 0x8a3b1c).setDepth(200);
    vic.play('victor:hurt');
    Audio.sfx(this, 'whiff', { volume: 0.6 });
    await new Promise<void>((r) => this.tweens.add({ targets: rib, x: hole.x, y: hole.y, angle: 360, duration: 500, ease: 'Quad.easeIn', onComplete: () => r() }));
    rib.destroy();
    Audio.sfx(this, 'splash', { volume: 0.5 });
    await this.say(0, 0, 'VICTOR', '...THE POTHOLE GOT IT.', 1800);
    unc.play('uncleT:talk');
    await this.say(0, 0, 'UNCLE T', 'POTHOLE EATS FIRST AROUND HERE. GET THE NEXT BAG.', 2400);
    unc.play('uncleT:walk');
    vic.play('victor:trash').setFlipX(true);
    this.tweens.add({ targets: unc, x: W + 40, duration: 1400 });
    await new Promise<void>((r) => this.tweens.add({ targets: vic, x: -40, duration: 2600, onComplete: () => r() }));

    // one more thing
    await this.wait(800);
    Audio.music(this, 'music_lost', 0.3);
    const puddle = this.add.sprite(W / 2 + 30, 200, 'portal').play('portal:glow').setDepth(195).setAlpha(0);
    this.tweens.add({ targets: puddle, alpha: 1, duration: 1200 });
    Audio.sfx(this, 'portal', { volume: 0.6 });
    await this.wait(1600);
    const nia = this.add.sprite(W / 2 - 60, 188, 'nia').setOrigin(0.5, 61 / 64).play('nia:idle').setDepth(188).setAlpha(0);
    await new Promise<void>((r) => this.tweens.add({ targets: nia, alpha: 1, duration: 700, onComplete: () => r() }));
    nia.play('nia:talk');
    await this.say(0, 0, 'NIA', '...MANE. THERE WERE TWO JARS.', 3200);
    nia.play('nia:idle');
    cam.flash(300, 92, 225, 255);
    await this.wait(600);
    const tbc = px(this, W / 2, 96, 'TO BE CONTINUED...', COLORS.goldHi, 2).setOrigin(0.5, 0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: tbc, alpha: 1, duration: 800 });
    await this.wait(3200);
    cam.fadeOut(900, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(950, r));
    if (this.stats) this.scene.start('Results', { stats: this.stats, missionId: 'm10-the-source' });
    else this.scene.start('Title');
  }
}
