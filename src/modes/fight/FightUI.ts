import Phaser from 'phaser';
import type { FightScene } from './FightScene';
import { SUPER_COST } from './BoxerMane';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import { COLORS } from '../../core/config';
import { px } from '../../core/text';
import { GAME } from '../../missions/lines';
import { canFullscreen, fullscreenButton } from '../../core/fullscreen';
import { isTouch } from '../../ui/UIScene';

const TIPS_TOUCH: Record<string, string> = {
  start: 'JAB IS QUICK. HOOK IS HEAVY AND BREAKS HIS GUARD.\nHOLD BLOCK. DODGE HIS BIG ONES, THEN HIT BACK.',
  counter: 'DODGED! HE\'S WIDE OPEN FOR A SECOND.\nHIT HIM NOW FOR EXTRA DAMAGE.',
  super: 'SUPER METER FULL!\nTAP SUPER.',
  flip: 'RED GLOW = YOU CAN\'T BLOCK IT.\nDODGE THE BOTTLE FLIP!',
  crinkle: 'HE CRINKLES UNDER YOUR PUNCHES.\nBLOCK THE POP-UP, THEN HIT BACK.',
  flex: 'FLEX = GRILL SHINE.\nIT DAZES HIM FOR A BEAT.',
  oneTwo: 'JAB, JAB, HOOK = THE ONE-TWO.\nIT HITS HARDER.',
};
const TIPS_KEYS: Record<string, string> = {
  ...TIPS_TOUCH,
  start: 'Z JAB   X HOOK   HOLD C BLOCK   SPACE DODGE\nV FLEX (GRILL SHINE)   B SUPER',
  super: 'SUPER METER FULL!\nPRESS B.',
};

// HUD, touch controls, the count, pause and continue for the fight mode.
export class FightUI extends Phaser.Scene {
  world!: FightScene;
  private maneBar!: Phaser.GameObjects.Rectangle;
  private foeBar!: Phaser.GameObjects.Rectangle;
  private meterBar!: Phaser.GameObjects.Rectangle;
  private meterLabel!: Phaser.GameObjects.BitmapText;
  private manePort!: Phaser.GameObjects.Image;
  private foePort!: Phaser.GameObjects.Image;
  private roundText!: Phaser.GameObjects.BitmapText;
  private clockText!: Phaser.GameObjects.BitmapText;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private stars: Phaser.GameObjects.Image[] = [];
  private toastText!: Phaser.GameObjects.BitmapText;
  private toastUntil = 0;
  private tutorial!: Phaser.GameObjects.BitmapText;
  private tutBack?: Phaser.GameObjects.Rectangle;
  private countText!: Phaser.GameObjects.BitmapText;
  private mashText!: Phaser.GameObjects.BitmapText;
  private mashBack!: Phaser.GameObjects.Rectangle;
  private mashBar!: Phaser.GameObjects.Rectangle;
  private skipBtn!: Phaser.GameObjects.BitmapText;
  private hud: Phaser.GameObjects.GameObject[] = [];
  private touch: Phaser.GameObjects.GameObject[] = [];
  private buttons: { img: Phaser.GameObjects.Image; b: Button; r: number; id: number }[] = [];
  private pauseLayer!: Phaser.GameObjects.Container;
  private contLayer!: Phaser.GameObjects.Container;
  private contTimer?: Phaser.Time.TimerEvent;
  private contCount = 9;
  private barW = 120;

  constructor() { super('FightUI'); }
  init(data: { world: FightScene }) { this.world = data.world; }

  create() {
    this.hud = []; this.touch = []; this.buttons = []; this.stars = [];
    this.input.addPointer(3);
    const W = this.scale.width;
    this.barW = Math.floor(W / 2 - 84);
    // a dark strip behind the HUD so it reads over the banners
    const strip = this.add.rectangle(0, 0, W, 42, 0x070a1c, 0.6).setOrigin(0);

    // Mane, top-left
    const mf = this.add.rectangle(4, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.gold);
    this.manePort = this.add.image(6, 6, 'manePortrait', 0).setOrigin(0);
    const mn = px(this, 44, 4, 'MANE', COLORS.goldHi);
    const mb = this.add.rectangle(44, 15, this.barW + 2, 7, 0x0b0f26).setOrigin(0).setStrokeStyle(1, COLORS.ink);
    this.maneBar = this.add.rectangle(45, 16, this.barW, 5, COLORS.gold).setOrigin(0);
    const sb = this.add.rectangle(44, 24, this.barW + 2, 5, 0x0b0f26).setOrigin(0).setStrokeStyle(1, COLORS.ink);
    this.meterBar = this.add.rectangle(45, 25, 0, 3, 0x7fc4ff).setOrigin(0);
    this.meterLabel = px(this, 44, 31, 'SUPER', 0x9aa0c0);
    this.scoreText = px(this, 44 + this.barW + 2, 31, '000000', 0xffffff).setOrigin(1, 0);
    // Pip, top-right
    const ff = this.add.rectangle(W - 40, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, 0x7fc4ff);
    this.foePort = this.add.image(W - 6, 6, this.world.foePortrait, 0).setOrigin(1, 0).setFlipX(true);
    const fn = px(this, W - 44, 4, this.world.foeF.name, 0xa8dcff).setOrigin(1, 0);
    const fb = this.add.rectangle(W - 44, 15, this.barW + 2, 7, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.ink);
    this.foeBar = this.add.rectangle(W - 45, 16, this.barW, 5, COLORS.red).setOrigin(1, 0);
    for (let i = 0; i < 3; i++) this.stars.push(this.add.image(W - 50 - i * 12, 30, 'hudCanEmpty').setOrigin(0.5, 0).setScale(0.7).setTint(0x7fc4ff).setAlpha(0.35));
    // round + clock in the middle
    this.roundText = px(this, W / 2, 6, '', COLORS.goldHi).setOrigin(0.5, 0);
    this.clockText = px(this, W / 2, 17, '', 0xffffff, 2).setOrigin(0.5, 0);
    this.hud.push(strip, mf, this.manePort, mn, mb, this.maneBar, sb, this.meterBar, this.meterLabel, this.scoreText, ff, this.foePort, fn, fb, this.foeBar, ...this.stars, this.roundText, this.clockText);

    this.toastText = px(this, W / 2, this.world.toastY, '', COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    this.tutorial = px(this, W / 2, 70, '', 0xffffff).setOrigin(0.5, 0).setCenterAlign().setAlpha(0);
    this.countText = px(this, W / 2, 84, '', 0xffffff, 4).setOrigin(0.5).setVisible(false).setDepth(50);
    this.mashText = px(this, W / 2, 112, isTouch() ? 'TAP ANY BUTTON! GET UP!' : 'MASH Z! GET UP!', COLORS.goldHi).setOrigin(0.5).setVisible(false);
    this.mashBack = this.add.rectangle(W / 2, 124, 122, 8, 0x0b0f26).setStrokeStyle(1, COLORS.gold).setVisible(false);
    this.mashBar = this.add.rectangle(W / 2 - 60, 124, 0, 6, COLORS.gold).setOrigin(0, 0.5).setVisible(false);
    this.skipBtn = px(this, W - 6, 6, 'SKIP >', 0xffffff).setOrigin(1, 0).setVisible(false).setInteractive({ useHandCursor: true }).setDepth(60);
    this.skipBtn.on('pointerdown', () => this.world.skipCutscene());

    this.buildTouch();
    this.buildPause();
    this.buildContinue();

    const ev = this.world.events;
    const on = (name: string, fn: (...a: any[]) => void) => { ev.on(name, fn, this); this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ev.off(name, fn, this)); };
    on('hud', () => this.refresh());
    on('toast', (s: string) => this.toast(s));
    on('banner', (b: { top: string; bottom: string }) => this.banner(b.top, b.bottom));
    on('tutorial', (k: string) => this.showTip(k));
    on('cutscene', (v: boolean) => this.setCutscene(v));
    on('paused', (v: boolean) => this.pauseLayer.setVisible(v));
    on('continue', (v: boolean) => this.showContinue(v));
    on('count', (w: string | null) => this.showCount(w));
    on('mash', (k: number | null) => this.showMash(k));
    this.setCutscene(this.world.inCutscene);
    this.refresh();
  }

  private setCutscene(v: boolean) {
    this.skipBtn.setVisible(v);
    for (const o of this.hud) (o as any).setVisible(!v);
    for (const o of this.touch) (o as any).setVisible(!v);
    if (v) { this.tweens.killTweensOf([this.tutorial, this.tutBack]); this.tutorial.setAlpha(0); this.tutBack?.setAlpha(0); this.toastText.setAlpha(0); }
    this.refresh();
  }

  refresh() {
    const w = this.world;
    const p = w.player, f = w.foeF;
    if (!p || !f) return;
    const pk = Math.max(0, p.hp / p.maxHp);
    this.manePort.setFrame(p.meter >= SUPER_COST ? 2 : pk < 0.3 ? 1 : 0);
    this.foePort.setFrame(f.state === 'down' || f.state === 'out' ? 2 : f.hp / f.maxHp < 0.3 ? 1 : 0);
    this.scoreText.setText(String(w.score).padStart(6, '0'));
    this.roundText.setText(w.round ? w.roundName(w.round) : '');
    this.stars.forEach((s, i) => s.setAlpha(i < f.knockdowns ? 1 : 0.3).setTint(i < f.knockdowns ? 0xffffff : 0x7fc4ff).setTexture(i < f.knockdowns ? 'hudCan' : 'hudCanEmpty'));
  }

  update() {
    const w = this.world, p = w.player, f = w.foeF;
    if (!p || !f) return;
    // bars ease toward their value
    const tp = Math.round(this.barW * Math.max(0, p.hp / p.maxHp));
    this.maneBar.width += (tp - this.maneBar.width) * 0.25;
    this.maneBar.fillColor = p.hp / p.maxHp < 0.3 ? (Math.floor(this.time.now / 150) % 2 ? COLORS.red : COLORS.goldHi) : COLORS.gold;
    const tf = Math.round(this.barW * Math.max(0, f.hp / f.maxHp));
    this.foeBar.width += (tf - this.foeBar.width) * 0.25;
    const full = p.meter >= SUPER_COST;
    this.meterBar.width = Math.round(this.barW * (p.meter / SUPER_COST));
    this.meterBar.fillColor = full ? (Math.floor(this.time.now / 100) % 2 ? COLORS.goldHi : 0xffffff) : 0x7fc4ff;
    this.meterLabel.setText(full ? 'SUPER READY!' : 'SUPER').setTint(full ? COLORS.goldHi : 0x9aa0c0);
    if (w.clock !== null) {
      const s = Math.ceil(w.clock);
      this.clockText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).setTint(s <= 10 ? COLORS.red : 0xffffff);
    } else this.clockText.setText('');
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    // touch buttons light up when they do something
    for (const b of this.buttons) {
      if (b.b === 'super') b.img.setAlpha(full ? (Math.floor(this.time.now / 200) % 2 ? 1 : 0.7) : 0.35);
      if (b.b === 'flex') b.img.setAlpha(p.flexCd > 0 ? 0.35 : 0.9);
    }
  }

  toast(s: string) { this.toastText.setText(s).setAlpha(1); this.toastUntil = this.time.now + 1300; }

  banner(top: string, bottom: string) {
    const W = this.scale.width;
    const bar = this.add.rectangle(W / 2, 96, W, 44, 0x0b0f26, 0.85).setStrokeStyle(1, COLORS.gold).setScale(1, 0);
    const a = px(this, W / 2, 80, top, COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    const b = px(this, W / 2, 92, bottom, COLORS.gold, 2).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: bar, scaleY: 1, duration: 200 });
    this.tweens.add({ targets: [a, b], alpha: 1, duration: 200, delay: 150 });
    this.time.delayedCall(1500, () => this.tweens.add({ targets: [bar, a, b], alpha: 0, duration: 300, onComplete: () => { bar.destroy(); a.destroy(); b.destroy(); } }));
  }

  showTip(k: string) {
    const x = this.world.extraTips;
    const t = (isTouch() ? { ...TIPS_TOUCH, ...x.touch } : { ...TIPS_KEYS, ...x.touch, ...x.keys })[k];
    if (!t) return;
    this.tutorial.setText(t).setAlpha(1);
    const b = this.tutorial.getTextBounds().global;
    this.tutBack?.destroy();
    this.tutBack = this.add.rectangle(this.tutorial.x, this.tutorial.y - 3, b.width + 12, b.height + 6, 0x070a1c, 0.8).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold, 0.6);
    this.children.moveBelow(this.tutBack, this.tutorial);
    this.tweens.killTweensOf([this.tutorial, this.tutBack]);
    this.tweens.add({ targets: [this.tutorial, this.tutBack], alpha: 0, delay: 4200, duration: 500 });
  }

  private showCount(word: string | null) {
    if (word === null) { this.countText.setVisible(false); return; }
    const num = /^\d+$/.test(word);
    this.countText.setText(word).setVisible(true).setScale(num ? 4 : 3).setTint(num ? 0xffffff : 0x7de07d).setAlpha(1);
    this.tweens.killTweensOf(this.countText);
    this.countText.setScale(num ? 6 : 4);
    this.tweens.add({ targets: this.countText, scale: num ? 4 : 3, duration: 160, ease: 'Back.easeOut' });
  }

  private showMash(k: number | null) {
    const v = k !== null;
    this.mashText.setVisible(v); this.mashBack.setVisible(v); this.mashBar.setVisible(v);
    if (v) this.mashBar.width = Math.min(120, Math.round(120 * k!));
  }

  // ---------------------------------------------------------------- touch
  private buildTouch() {
    if (!isTouch()) return;
    const mk = (tex: string, b: Button, r: number) => {
      const img = this.add.image(0, 0, tex).setAlpha(0.9);
      this.buttons.push({ img, b, r, id: -1 });
      this.touch.push(img);
    };
    mk('btnJab', 'attack', 24);
    mk('btnHook', 'hook', 22);
    mk('btnSuper', 'super', 20);
    mk('btnFlex', 'flex', 17);
    mk('btnBlock', 'block', 24);
    mk('btnDodge', 'dodge', 22);
    mk('btnPause', 'pause', 10);
    this.placeButtons();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.scale.on('resize', this.placeButtons, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.placeButtons, this));
  }

  private placeButtons() {
    const W = this.scale.width;
    const pos: Record<string, [number, number]> = {
      attack: [W - 32, 180], hook: [W - 84, 194], super: [W - 30, 124], flex: [W - 74, 144],
      block: [32, 180], dodge: [84, 194], pause: [W / 2, 54],
    };
    for (const b of this.buttons) b.img.setPosition(...pos[b.b]);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.world.continuing) { this.tryContinue(); return; }
    for (const b of this.buttons) {
      if (Phaser.Math.Distance.Between(p.x, p.y, b.img.x, b.img.y) <= b.r + 6) {
        b.id = p.id;
        b.img.setScale(0.9);
        if (b.b === 'pause') this.world.togglePause();
        else Controls.press(b.b);
        return;
      }
    }
    if (this.world.inCutscene || this.world.counting) Controls.press('attack'); // tap anywhere to advance / get up
  }

  private onUp(p: Phaser.Input.Pointer) {
    for (const b of this.buttons) if (b.id === p.id) { b.id = -1; b.img.setScale(1); if (b.b !== 'pause') Controls.release(b.b); }
    if (this.world.inCutscene || this.world.counting) Controls.release('attack');
  }

  // ---------------------------------------------------------------- pause + continue
  private buildPause() {
    const W = this.scale.width;
    const bg = this.add.rectangle(-100, 0, 700, 216, 0x070a1c, 0.8).setOrigin(0);
    const t = px(this, W / 2, 60, 'PAUSED', COLORS.goldHi, 2).setOrigin(0.5);
    const resume = px(this, W / 2, 100, '> RESUME', 0xffffff).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const mute = px(this, W / 2, 120, Audio.muted ? '> SOUND: OFF' : '> SOUND: ON', 0xffffff).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const fs = canFullscreen(this) ? fullscreenButton(this, W / 2, 140, 0xffffff, '> ').setOrigin(0.5) : null;
    const quit = px(this, W / 2, fs ? 160 : 140, '> QUIT TO TITLE', 0xffffff).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on('pointerdown', () => this.world.togglePause());
    mute.on('pointerdown', () => { const m = Audio.toggleMute(this.world); mute.setText(m ? '> SOUND: OFF' : '> SOUND: ON'); });
    quit.on('pointerdown', () => { this.world.togglePause(); Audio.stopMusic(); this.world.scene.start('Title'); });
    this.pauseLayer = this.add.container(0, 0, [bg, t, resume, mute, quit, ...(fs ? [fs] : [])]).setDepth(100).setVisible(false);
  }

  private buildContinue() {
    const W = this.scale.width;
    const bg = this.add.rectangle(-100, 0, 700, 216, 0x070a1c, 0.75).setOrigin(0);
    const t = px(this, W / 2, 64, GAME.continue, COLORS.goldHi, 2).setOrigin(0.5).setName('t');
    const n = px(this, W / 2, 100, '9', 0xffffff, 3).setOrigin(0.5).setName('n');
    const hint = px(this, W / 2, 132, isTouch() ? 'TAP TO SIP' : 'PRESS Z TO SIP', 0xffffff).setOrigin(0.5).setName('h');
    const buy = px(this, W / 2, 190, GAME.buy, COLORS.gold).setOrigin(0.5);
    this.contLayer = this.add.container(0, 0, [bg, t, n, hint, buy]).setDepth(90).setVisible(false);
  }

  private showContinue(v: boolean) {
    this.contLayer.setVisible(v);
    this.contTimer?.remove();
    if (!v) return;
    this.contCount = 9;
    const n = this.contLayer.getByName('n') as Phaser.GameObjects.BitmapText;
    n.setText('9');
    Controls.clear();
    this.contTimer = this.time.addEvent({
      delay: 1000, repeat: 9, callback: () => {
        this.contCount--;
        if (this.contCount < 0) { this.gameOver(); return; }
        n.setText(String(this.contCount));
        Audio.sfx(this.world, 'blip', { volume: 0.6 });
      },
    });
    const poll = this.time.addEvent({
      loop: true, delay: 50, callback: () => {
        if (!this.world.continuing) { poll.remove(); return; }
        if (Controls.consume('attack', 400) || Controls.consume('hook', 400) || Controls.consume('super', 400)) { poll.remove(); this.tryContinue(); }
      },
    });
  }

  private tryContinue() {
    if (!this.world.continuing) return;
    this.contTimer?.remove();
    Audio.sfx(this.world, 'sip', { volume: 0.8 });
    this.world.doContinue();
  }

  private gameOver() {
    this.contTimer?.remove();
    const t = this.contLayer.getByName('t') as Phaser.GameObjects.BitmapText;
    const n = this.contLayer.getByName('n') as Phaser.GameObjects.BitmapText;
    const h = this.contLayer.getByName('h') as Phaser.GameObjects.BitmapText;
    t.setText('GAME OVER');
    n.setText('');
    h.setText(GAME.gameOver);
    this.time.delayedCall(2200, () => this.world.gameOver());
  }
}
