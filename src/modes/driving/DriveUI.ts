import Phaser from 'phaser';
import type { DriveScene } from './DriveScene';
import { MAX_SPEED, MANE_MODE_SECONDS, MAX_CANS } from './DriveScene';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import { COLORS } from '../../core/config';
import { px } from '../../core/text';
import { GAME } from '../../missions/lines';
import { canFullscreen, fullscreenButton } from '../../core/fullscreen';
import { isTouch } from '../../ui/UIScene';

const TIPS_TOUCH: Record<string, string> = {
  start: 'BIG BLUE DRIVES HERSELF FORWARD.\nLEFT THUMB STEERS. HOLD DRIFT TO BRAKE.',
  item: 'GOT AN ITEM! TAP ITEM TO USE IT.\nTEA = BOOST. SAUCE = THROW. BONES = DROP.',
  drift: 'DRIFTING! HOLD IT FOR BLUE, THEN GOLD SPARKS.\nLET GO FOR A BOOST.',
  sip: 'MEMPHYS CAN! TAP SIP FOR MANE MODE:\nFASTER, AND YOU BASH THROUGH ANYTHING.',
  tanker: 'RAM THE BACK OF THE TANKER!\nBOOST OR MANE MODE INTO IT FOR BIG HITS.',
  barrel: 'COOLANT BARRELS! STEER AROUND THEM.',
  driftHow: 'HOLD DRIFT WHILE YOU TURN.\nLET GO WHEN THE SPARKS GO GOLD.',
  // Mission 8
  startLoop: 'BIG BLUE DRIVES HERSELF. LEFT THUMB STEERS.\n3 LAPS AROUND I-240 TO THE LAST EXIT.',
  gantry: 'DRIVE UNDER THE GOLD LIGHT: MEMPHIS REMEMBERS.\nBLUE LIGHTS MAKE THE CITY FORGET.',
  memory: 'KEEP THE MEMORY BAR UP!\nGOLD LIGHTS AND MEMPHYS SIPS BRING IT BACK.',
  convoy: 'THE CONVOY RIDES WITH YOU.\nSTEER AND THE WEDGE STEERS WITH YOU.',
};
const TIPS_KEYS: Record<string, string> = {
  ...TIPS_TOUCH,
  start: 'LEFT / RIGHT STEER. BIG BLUE DRIVES HERSELF.\nZ ITEM   HOLD X DRIFT (OR BRAKE)   C SIP',
  item: 'GOT AN ITEM! PRESS Z TO USE IT.\nTEA = BOOST. SAUCE = THROW. BONES = DROP.',
  sip: 'MEMPHYS CAN! PRESS C FOR MANE MODE:\nFASTER, AND YOU BASH THROUGH ANYTHING.',
  driftHow: 'HOLD X WHILE YOU TURN.\nLET GO WHEN THE SPARKS GO GOLD.',
  startLoop: 'LEFT / RIGHT STEER. BIG BLUE DRIVES HERSELF.\n3 LAPS AROUND I-240.   Z ITEM   X DRIFT   C SIP',
};
const ITEM_TEX: Record<string, string> = { tea: 'itemTea', sauce: 'itemSauce', bones: 'itemBones' };

// HUD, touch controls, pause and continue for the driving mode.
export class DriveUI extends Phaser.Scene {
  world!: DriveScene;
  private portrait!: Phaser.GameObjects.Image;
  private canIcons: Phaser.GameObjects.Image[] = [];
  private mmBack!: Phaser.GameObjects.Rectangle;
  private mmBar!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private itemIcon!: Phaser.GameObjects.Image;
  private itemFrame!: Phaser.GameObjects.Rectangle;
  private rollT?: Phaser.Time.TimerEvent;
  private mph!: Phaser.GameObjects.BitmapText;
  private progBack!: Phaser.GameObjects.Rectangle;
  private progMe!: Phaser.GameObjects.Rectangle;
  private progTk!: Phaser.GameObjects.Rectangle;
  private progL1!: Phaser.GameObjects.BitmapText;
  private progL2!: Phaser.GameObjects.BitmapText;
  private meterObjs: Phaser.GameObjects.GameObject[] = [];
  private meterBar!: Phaser.GameObjects.Rectangle;
  private meterIcon!: Phaser.GameObjects.Image;
  private meterName!: Phaser.GameObjects.BitmapText;
  private meterPct!: Phaser.GameObjects.BitmapText;
  private factLayer?: Phaser.GameObjects.Container;
  private tk: Phaser.GameObjects.GameObject[] = [];
  private tkBar!: Phaser.GameObjects.Rectangle;
  private barW = 90;
  private toastText!: Phaser.GameObjects.BitmapText;
  private toastUntil = 0;
  private tutorial!: Phaser.GameObjects.BitmapText;
  private tutBack?: Phaser.GameObjects.Rectangle;
  private skipBtn!: Phaser.GameObjects.BitmapText;
  private hud: Phaser.GameObjects.GameObject[] = [];
  private touch: Phaser.GameObjects.GameObject[] = [];
  private buttons: { img: Phaser.GameObjects.Image; b: Button; r: number; id: number }[] = [];
  private stick = { id: -1, ox: 0, oy: 0 };
  private stickBase?: Phaser.GameObjects.Image;
  private stickKnob?: Phaser.GameObjects.Image;
  private pauseLayer!: Phaser.GameObjects.Container;
  private contLayer!: Phaser.GameObjects.Container;
  private contTimer?: Phaser.Time.TimerEvent;
  private contCount = 9;

  constructor() { super('DriveUI'); }
  init(data: { world: DriveScene }) { this.world = data.world; }

  create() {
    this.hud = []; this.touch = []; this.buttons = []; this.canIcons = []; this.tk = []; this.meterObjs = [];
    this.stick = { id: -1, ox: 0, oy: 0 };
    this.input.addPointer(3);
    const W = this.scale.width;
    const strip = this.add.rectangle(0, 0, W, 42, 0x070a1c, 0.55).setOrigin(0);
    // Mane, top-left: portrait, cans, Mane Mode, score
    const mf = this.add.rectangle(4, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.gold);
    this.portrait = this.add.image(6, 6, 'manePortrait', 0).setOrigin(0);
    const name = px(this, 44, 4, 'MANE', COLORS.goldHi);
    for (let i = 0; i < MAX_CANS; i++) this.canIcons.push(this.add.image(48 + i * 11, 15, 'hudCanEmpty').setOrigin(0.5, 0));
    this.mmBack = this.add.rectangle(44, 30, 34, 3, 0x0b0f26).setOrigin(0).setStrokeStyle(1, COLORS.ink).setVisible(false);
    this.mmBar = this.add.rectangle(44, 30, 34, 3, COLORS.gold).setOrigin(0).setVisible(false);
    this.scoreText = px(this, 44, 31, '000000', 0xffffff);
    // the item slot
    this.itemFrame = this.add.rectangle(84, 6, 26, 26, 0x0b0f26, 0.9).setOrigin(0).setStrokeStyle(1, COLORS.goldHi);
    this.itemIcon = this.add.image(97, 19, 'itemTea').setVisible(false);
    const itemLbl = px(this, 97, 33, 'ITEM', 0x9aa0c0).setOrigin(0.5, 0);
    // speed and the run from Memphis to Arkansas
    this.mph = px(this, W / 2, 4, '0 MPH', 0xffffff).setOrigin(0.5, 0);
    const pw = Math.min(150, W - 270);
    this.progBack = this.add.rectangle(W / 2 - pw / 2, 20, pw, 3, 0x2a3058).setOrigin(0, 0.5);
    const laps = this.world.lapsTotal > 0;
    const l1 = this.progL1 = px(this, W / 2 - pw / 2 - 3, 16, laps ? 'LAP' : 'TN', laps ? 0xffffff : 0x9aa0c0).setOrigin(1, 0);
    const l2 = this.progL2 = px(this, W / 2 + pw / 2 + 3, 16, laps ? `1/${this.world.lapsTotal}` : 'AR', laps ? COLORS.goldHi : 0x9aa0c0).setOrigin(0, 0);
    this.progTk = this.add.rectangle(W / 2, 20, 5, 7, 0xd8dee8).setStrokeStyle(1, COLORS.ink).setVisible(false);
    this.progMe = this.add.rectangle(W / 2, 20, 5, 7, 0x2f6fd6).setStrokeStyle(1, COLORS.goldHi);
    // the tanker, top-right
    this.barW = Math.max(60, Math.floor(W / 2 - 130));
    const tf = this.add.rectangle(W - 40, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, 0x7fc4ff);
    const tp = this.add.image(W - 22, 22, 'tanker', 0).setScale(0.26);
    const tn = px(this, W - 44, 4, 'TANKER', 0xa8dcff).setOrigin(1, 0);
    const tb = this.add.rectangle(W - 44, 15, this.barW + 2, 7, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.ink);
    this.tkBar = this.add.rectangle(W - 45, 16, this.barW, 5, COLORS.red).setOrigin(1, 0);
    this.tk.push(tf, tp, tn, tb, this.tkBar);
    // or the mission's own bar (Mission 8: Memphis's memory) in the same spot
    const mf2 = this.add.rectangle(W - 40, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, 0x7fc4ff);
    this.meterIcon = this.add.image(W - 22, 22, '__DEFAULT');
    this.meterName = px(this, W - 44, 4, '', 0xa8dcff).setOrigin(1, 0);
    const mb2 = this.add.rectangle(W - 44, 15, this.barW + 2, 7, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.ink);
    this.meterBar = this.add.rectangle(W - 45, 16, this.barW, 5, COLORS.gold).setOrigin(1, 0);
    this.meterPct = px(this, W - 44, 25, '', 0xffffff).setOrigin(1, 0);
    this.meterObjs.push(mf2, this.meterIcon, this.meterName, mb2, this.meterBar, this.meterPct);
    this.hud.push(...this.meterObjs);
    this.hud.push(strip, mf, this.portrait, name, ...this.canIcons, this.mmBack, this.mmBar, this.scoreText, this.itemFrame, this.itemIcon, itemLbl, this.mph, this.progBack, l1, l2, this.progTk, this.progMe, ...this.tk);

    this.toastText = px(this, W / 2, 46, '', COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    this.tutorial = px(this, W / 2, 70, '', 0xffffff).setOrigin(0.5, 0).setCenterAlign().setAlpha(0);
    this.skipBtn = px(this, W - 6, 6, 'SKIP >', 0xffffff).setOrigin(1, 0).setVisible(false).setInteractive({ useHandCursor: true }).setDepth(60);
    this.skipBtn.on('pointerdown', () => this.world.skipCutscene());

    this.buildTouch();
    this.buildPause();
    this.buildContinue();

    const ev = this.world.events;
    const on = (n: string, fn: (...a: any[]) => void) => { ev.on(n, fn, this); this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ev.off(n, fn, this)); };
    on('hud', () => this.refresh());
    on('toast', (s: string) => this.toast(s));
    on('banner', (b: { top: string; bottom: string }) => this.banner(b.top, b.bottom));
    on('tutorial', (k: string) => this.showTip(k));
    on('cutscene', (v: boolean) => this.setCutscene(v));
    on('paused', (v: boolean) => this.pauseLayer.setVisible(v));
    on('continue', (v: boolean) => this.showContinue(v));
    on('itemRoll', () => this.roll());
    on('item', () => this.showItem());
    on('count', (s: string, c?: number) => this.count(s, c));
    on('fact', (title: string, body: string) => this.showFact(title, body));
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
    if (this.world.inCutscene) return;
    this.canIcons.forEach((c, i) => c.setTexture(i < w.cans ? 'hudCan' : 'hudCanEmpty'));
    this.scoreText.setText(String(w.score).padStart(6, '0'));
    const t = w.tanker;
    for (const o of this.tk) (o as any).setVisible(!!t);
    this.progTk.setVisible(!!t);
    const m = !t ? w.meter : null;
    for (const o of this.meterObjs) (o as any).setVisible(!!m);
    if (m) {
      this.meterName.setText(m.label);
      if (this.meterIcon.texture.key !== m.icon) this.meterIcon.setTexture(m.icon, m.frame ?? 0);
      this.meterIcon.setScale(m.scale ?? 1);
    }
    if (w.lapsTotal > 0) this.progL2.setText(`${Math.min(w.lap, w.lapsTotal)}/${w.lapsTotal}`);
    this.showItem();
  }

  update() {
    const w = this.world;
    if (!w.track || w.inCutscene) { if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05)); return; }
    this.portrait.setFrame(w.maneT > 0 ? 2 : w.spinT > 0 ? 1 : 0);
    const mm = w.maneT > 0;
    this.mmBack.setVisible(mm); this.mmBar.setVisible(mm);
    this.scoreText.setVisible(!mm);
    if (mm) { this.mmBar.width = Math.round(34 * (w.maneT / MANE_MODE_SECONDS)); this.mmBar.fillColor = Math.floor(this.time.now / 120) % 2 ? COLORS.goldHi : COLORS.gold; }
    this.mph.setText(`${Math.round((w.speed / MAX_SPEED) * 88)} MPH`).setTint(w.boostT > 0 || mm ? COLORS.goldHi : 0xffffff);
    // progress toward Arkansas (or around this lap)
    const end = Number.isFinite(w.escapeZ) ? w.escapeZ : w.track.length;
    const x0 = this.progBack.x, pw = this.progBack.width;
    const prog = w.track.loop ? (w.playerZ % w.track.length) / w.track.length : w.playerZ / end;
    this.progMe.setX(x0 + pw * Phaser.Math.Clamp(prog, 0, 1));
    const m = !w.tanker ? w.meter : null;
    if (m) {
      const k = Phaser.Math.Clamp(m.value / m.max, 0, 1);
      this.meterBar.width += (Math.round(this.barW * k) - this.meterBar.width) * 0.25;
      const low = k < 0.3;
      this.meterBar.fillColor = low && Math.floor(this.time.now / 200) % 2 ? 0x5ce1ff : m.color;
      this.meterPct.setText(`${Math.ceil(m.value)}%`).setTint(low ? 0x7fd8ff : 0xffffff);
    }
    if (w.tanker) {
      this.progTk.setX(x0 + pw * Phaser.Math.Clamp(w.tanker.z / end, 0, 1));
      const tw = Math.round(this.barW * Math.max(0, w.tanker.hp / w.tanker.maxHp));
      this.tkBar.width += (tw - this.tkBar.width) * 0.25;
    }
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    for (const b of this.buttons) {
      if (b.b === 'sip') b.img.setAlpha(w.cans > 0 && !mm ? (Math.floor(this.time.now / 250) % 2 ? 1 : 0.75) : 0.3);
      if (b.b === 'item') b.img.setAlpha(w.item && w.rolling <= 0 ? 1 : 0.45);
    }
  }

  private showItem() {
    if (this.world.rolling > 0) return;
    const it = this.world.item;
    this.itemIcon.setVisible(!!it && !this.world.inCutscene);
    if (it) this.itemIcon.setTexture(ITEM_TEX[it]);
  }
  private roll() {
    this.rollT?.remove();
    const keys = Object.values(ITEM_TEX);
    let i = 0;
    this.itemIcon.setVisible(true);
    this.rollT = this.time.addEvent({
      loop: true, delay: 80, callback: () => {
        if (this.world.rolling <= 0) { this.rollT?.remove(); this.showItem(); Audio.sfx(this.world, 'select', { volume: 0.5 }); return; }
        this.itemIcon.setTexture(keys[i++ % keys.length]);
        Audio.sfx(this.world, 'blip', { volume: 0.25 });
      },
    });
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

  // the Aquifer Fact card: shows for a few seconds without stopping the race
  showFact(title: string, body: string) {
    const W = this.scale.width;
    this.factLayer?.destroy();
    const t = px(this, 0, 22, body, 0xffffff).setCenterAlign().setOrigin(0.5, 0);
    const h = t.height + 30;
    const bg = this.add.rectangle(0, 0, Math.max(t.width + 24, 180), h, 0x141c40, 0.95).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.goldHi);
    const n = px(this, 0, 6, title, COLORS.goldHi).setOrigin(0.5, 0);
    const card = this.add.image(-bg.width / 2 + 12, 12, 'factCard', 2).setScale(0.6);
    this.factLayer = this.add.container(W / 2, 112 - h / 2, [bg, n, t, card]).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: this.factLayer, alpha: 1, duration: 200 });
    this.tweens.add({ targets: this.factLayer, alpha: 0, delay: 6000, duration: 500 });
  }

  // a big number for the countdown
  count(s: string, color = 0xffffff) {
    const W = this.scale.width;
    const t = px(this, W / 2, 92, s, color, 5).setOrigin(0.5);
    t.setScale(8);
    this.tweens.add({ targets: t, scale: 5, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 250, onComplete: () => t.destroy() });
  }

  showTip(k: string) {
    const t = (isTouch() ? TIPS_TOUCH : TIPS_KEYS)[k];
    if (!t) return;
    this.tutorial.setText(t).setAlpha(1);
    const b = this.tutorial.getTextBounds().global;
    this.tutBack?.destroy();
    this.tutBack = this.add.rectangle(this.tutorial.x, this.tutorial.y - 3, b.width + 12, b.height + 6, 0x070a1c, 0.8).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold, 0.6);
    this.children.moveBelow(this.tutBack, this.tutorial);
    this.tweens.killTweensOf([this.tutorial, this.tutBack]);
    this.tweens.add({ targets: [this.tutorial, this.tutBack], alpha: 0, delay: 4200, duration: 500 });
  }

  // ---------------------------------------------------------------- touch: steer with the left thumb, buttons on the right
  private buildTouch() {
    if (!isTouch()) return;
    this.stickBase = this.add.image(60, 166, 'stickBase').setAlpha(0.6);
    this.stickKnob = this.add.image(60, 166, 'stickKnob').setAlpha(0.8);
    this.touch.push(this.stickBase, this.stickKnob);
    const mk = (tex: string, b: Button, r: number) => {
      const img = this.add.image(0, 0, tex).setAlpha(0.9);
      this.buttons.push({ img, b, r, id: -1 });
      this.touch.push(img);
    };
    mk('btnItem', 'item', 24);
    mk('btnDrift', 'drift', 22);
    mk('btnSip', 'sip', 20);
    mk('btnPause', 'pause', 10);
    this.placeButtons();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.scale.on('resize', this.placeButtons, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.placeButtons, this));
  }

  private placeButtons() {
    const W = this.scale.width;
    const pos: Record<string, [number, number]> = { item: [W - 32, 178], drift: [W - 86, 194], sip: [W - 34, 124], pause: [W / 2, 54] };
    for (const b of this.buttons) b.img.setPosition(...pos[b.b]);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.world.continuing) { this.tryContinue(); return; }
    if (this.world.inCutscene) { Controls.press('attack'); return; }
    for (const b of this.buttons) {
      if (Phaser.Math.Distance.Between(p.x, p.y, b.img.x, b.img.y) <= b.r + 7) {
        b.id = p.id;
        b.img.setScale(0.9);
        if (b.b === 'pause') this.world.togglePause();
        else Controls.press(b.b);
        return;
      }
    }
    if (p.x < this.scale.width * 0.5 && this.stick.id === -1 && this.stickBase && this.stickKnob) {
      this.stick = { id: p.id, ox: p.x, oy: p.y };
      this.stickBase.setPosition(p.x, p.y).setAlpha(0.8);
      this.stickKnob.setPosition(p.x, p.y);
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id !== this.stick.id || !this.stickKnob) return;
    const dx = p.x - this.stick.ox;
    const max = 24;
    const k = Math.max(-max, Math.min(max, dx));
    this.stickKnob.setPosition(this.stick.ox + k, this.stick.oy);
    // steering only needs left-right: small dead zone, analog after that
    const n = dx / max;
    Controls.setStick(Math.abs(n) < 0.12 ? 0 : Math.sign(n) * Math.min(1, (Math.abs(n) - 0.12) / 0.7), 0);
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.stick.id) {
      this.stick.id = -1;
      Controls.setStick(0, 0);
      this.stickBase?.setPosition(60, 166).setAlpha(0.6);
      this.stickKnob?.setPosition(60, 166);
    }
    for (const b of this.buttons) if (b.id === p.id) { b.id = -1; b.img.setScale(1); if (b.b !== 'pause') Controls.release(b.b); }
    if (this.world.inCutscene) Controls.release('attack');
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
    const top = px(this, W / 2, 40, this.world.continueTitle, 0xffffff).setOrigin(0.5);
    const t = px(this, W / 2, 64, GAME.continue, COLORS.goldHi, 2).setOrigin(0.5).setName('t');
    const n = px(this, W / 2, 100, '9', 0xffffff, 3).setOrigin(0.5).setName('n');
    const hint = px(this, W / 2, 132, isTouch() ? 'TAP TO SIP' : 'PRESS Z TO SIP', 0xffffff).setOrigin(0.5).setName('h');
    const buy = px(this, W / 2, 190, GAME.buy, COLORS.gold).setOrigin(0.5);
    this.contLayer = this.add.container(0, 0, [bg, top, t, n, hint, buy]).setDepth(90).setVisible(false);
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
        if (Controls.consume('item', 400) || Controls.consume('sip', 400) || Controls.consume('attack', 400)) { poll.remove(); this.tryContinue(); }
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
    (this.contLayer.getByName('t') as Phaser.GameObjects.BitmapText).setText('GAME OVER');
    (this.contLayer.getByName('n') as Phaser.GameObjects.BitmapText).setText('');
    (this.contLayer.getByName('h') as Phaser.GameObjects.BitmapText).setText(GAME.gameOver);
    this.time.delayedCall(2200, () => this.world.gameOver());
  }
}
