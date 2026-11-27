import Phaser from 'phaser';
import type { ShooterScene } from './ShooterScene';
import { MAX_HP, MAX_CANS, MANE_MODE_SECONDS } from './ShooterScene';
import { Controls, Button } from '../../core/controls';
import { Audio } from '../../core/audio';
import { COLORS } from '../../core/config';
import { px } from '../../core/text';
import { GAME } from '../../missions/lines';
import { canFullscreen, fullscreenButton } from '../../core/fullscreen';
import { isTouch } from '../../ui/UIScene';

const TIPS_TOUCH: Record<string, string> = {
  start: 'LEFT THUMB WALKS AND TURNS.\nDRAG THE RIGHT SIDE TO LOOK. HOLD SPRAY.',
  drifter: 'DRIFTERS AIN\'T BAD. THEY FORGOT THEMSELVES.\nONE SPLASH SNAPS \'EM BACK.',
  dolla: 'HE WANTS A DOLLA. TAP DOLLA TO ASK HIM\nRIGHT BACK. HE FREEZES, TRYNA FIGURE IT OUT.',
  sip: 'MEMPHYS CAN! TAP SIP FOR MANE MODE:\nGOLD WATER, RAPID FIRE, NOTHING HURTS.',
  pips: 'PIPS SHOOT CAPS. KEEP MOVING.\nTWO SPLASHES RECYCLES ONE.',
  boss: 'IT\'S ARMORED. WAIT FOR THE HATCH\nTO OPEN, THEN SPRAY THE CORE.',
  shadow: 'A SHADOW OVER YOU? MOVE!',
  spill: 'DENILE SPILL. IT SLOWS YOU DOWN.',
  conveyor: 'CONVEYOR BELT. IT CARRIES YOU.',
  drone: 'SECURITY DRONE. IT SHOOTS BACK.\nTWO SPLASHES KNOCK IT OUT THE AIR.',
  bank: 'MEMORY BANK. SPRAY IT TO SET\nTHE MEMORIES FREE.',
  ice: 'FROZEN SOLID. SPRAY THE CHILLERS\nKEEPIN\' IT COLD.',
  frost: 'FROST FORMIN\' UNDER YOU? MOVE!',
  thaw: 'THE ICE IS GONE. FLOOD THE CLOUD!',
  frostSpill: 'COOLANT FROST. IT SLOWS YOU DOWN.',
};
const TIPS_KEYS: Record<string, string> = {
  ...TIPS_TOUCH,
  start: 'W/S WALK   A/D TURN   Q/E STEP   (OR DRAG TO LOOK)\nHOLD Z OR SPACE TO SPRAY',
  dolla: 'HE WANTS A DOLLA. PRESS V TO ASK HIM\nRIGHT BACK. HE FREEZES, TRYNA FIGURE IT OUT.',
  sip: 'MEMPHYS CAN! PRESS C FOR MANE MODE:\nGOLD WATER, RAPID FIRE, NOTHING HURTS.',
};

// HUD, touch controls, the capped screen, pause and continue for the first-person mode.
export class ShooterUI extends Phaser.Scene {
  world!: ShooterScene;
  private portrait!: Phaser.GameObjects.Image;
  private canIcons: Phaser.GameObjects.Image[] = [];
  private hpPips: Phaser.GameObjects.Rectangle[] = [];
  private mmBack!: Phaser.GameObjects.Rectangle;
  private mmBar!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private goal!: Phaser.GameObjects.BitmapText;
  private boss: Phaser.GameObjects.GameObject[] = [];
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossName!: Phaser.GameObjects.BitmapText;
  private barW = 90;
  private cross!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Graphics;
  private toastText!: Phaser.GameObjects.BitmapText;
  private meterG!: Phaser.GameObjects.Graphics;
  private meterText!: Phaser.GameObjects.BitmapText;
  private toastUntil = 0;
  private tutorial!: Phaser.GameObjects.BitmapText;
  private tutBack?: Phaser.GameObjects.Rectangle;
  private factLayer?: Phaser.GameObjects.Container;
  private skipBtn!: Phaser.GameObjects.BitmapText;
  private hud: Phaser.GameObjects.GameObject[] = [];
  private touch: Phaser.GameObjects.GameObject[] = [];
  private buttons: { img: Phaser.GameObjects.Image; b: Button; r: number; id: number }[] = [];
  private stick = { id: -1, ox: 0, oy: 0 };
  private look = { id: -1, x: 0 };
  private stickBase?: Phaser.GameObjects.Image;
  private stickKnob?: Phaser.GameObjects.Image;
  private capLayer!: Phaser.GameObjects.Container;
  private pauseLayer!: Phaser.GameObjects.Container;
  private contLayer!: Phaser.GameObjects.Container;
  private contTimer?: Phaser.Time.TimerEvent;
  private contCount = 9;

  constructor() { super('ShooterUI'); }
  init(data: { world: ShooterScene }) { this.world = data.world; }

  create() {
    this.hud = []; this.touch = []; this.buttons = []; this.canIcons = []; this.hpPips = []; this.boss = [];
    this.stick = { id: -1, ox: 0, oy: 0 }; this.look = { id: -1, x: 0 };
    this.input.addPointer(3);
    const W = this.scale.width;
    const strip = this.add.rectangle(0, 0, W, 42, 0x070a1c, 0.55).setOrigin(0);
    const mf = this.add.rectangle(4, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.gold);
    this.portrait = this.add.image(6, 6, 'manePortrait', 0).setOrigin(0);
    const name = px(this, 44, 4, 'MEMPHYS MANE', COLORS.goldHi);
    for (let i = 0; i < MAX_HP; i++) this.hpPips.push(this.add.rectangle(44 + i * 6, 14, 5, 6, COLORS.gold).setOrigin(0).setStrokeStyle(1, COLORS.ink));
    for (let i = 0; i < MAX_CANS; i++) this.canIcons.push(this.add.image(50 + i * 11, 22, 'hudCanEmpty').setOrigin(0.5, 0));
    this.mmBack = this.add.rectangle(84, 26, 34, 3, 0x0b0f26).setOrigin(0).setStrokeStyle(1, COLORS.ink).setVisible(false);
    this.mmBar = this.add.rectangle(84, 26, 34, 3, COLORS.gold).setOrigin(0).setVisible(false);
    this.scoreText = px(this, 84, 23, '000000', 0xffffff);
    this.goal = px(this, W / 2, 4, '', 0xffffff).setOrigin(0.5, 0);
    // the boss, top-right
    this.barW = Math.max(60, Math.floor(W / 2 - 110));
    this.bossName = px(this, W - 6, 4, this.world.bossLabel, 0xff9a8a).setOrigin(1, 0);
    const bb = this.add.rectangle(W - 6, 15, this.barW + 2, 7, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.ink);
    this.bossBar = this.add.rectangle(W - 7, 16, this.barW, 5, COLORS.red).setOrigin(1, 0);
    this.boss.push(this.bossName, bb, this.bossBar);
    this.cross = this.add.graphics();
    this.cross.fillStyle(0xffffff, 0.75).fillRect(W / 2 - 4, 108, 3, 1).fillRect(W / 2 + 2, 108, 3, 1).fillRect(W / 2, 104, 1, 3).fillRect(W / 2, 110, 1, 3);
    this.shadow = this.add.graphics().setDepth(-1);
    this.meterG = this.add.graphics();
    this.meterText = px(this, W / 2, 15, '', 0xffffff).setOrigin(0.5, 0);
    this.hud.push(strip, mf, this.portrait, name, ...this.hpPips, ...this.canIcons, this.mmBack, this.mmBar, this.scoreText, this.goal, ...this.boss, this.cross, this.meterG, this.meterText);

    this.toastText = px(this, W / 2, 46, '', COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    this.tutorial = px(this, W / 2, 62, '', 0xffffff).setOrigin(0.5, 0).setCenterAlign().setAlpha(0);
    this.skipBtn = px(this, W - 6, 6, 'SKIP >', 0xffffff).setOrigin(1, 0).setVisible(false).setInteractive({ useHandCursor: true }).setDepth(60);
    this.skipBtn.on('pointerdown', () => this.world.skipCutscene());

    this.buildCap();
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
    on('capped', (n: number) => this.showCapped(n));
    on('goal', (s: string) => this.goal.setText(s));
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
    if (w.inCutscene) return;
    this.canIcons.forEach((c, i) => c.setTexture(i < w.cans ? 'hudCan' : 'hudCanEmpty'));
    this.hpPips.forEach((p, i) => { p.fillColor = i < w.hp ? (w.hp <= 3 ? COLORS.red : COLORS.gold) : 0x2a3058; });
    this.scoreText.setText(String(w.score).padStart(6, '0'));
    for (const o of this.boss) (o as any).setVisible(!!w.boss && w.boss.hp > 0 && w.boss.state !== 'sleep');
  }

  update() {
    const w = this.world;
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    if (w.inCutscene || !w.map.length) { this.shadow.clear(); this.meterG.clear(); return; }
    this.portrait.setFrame(w.maneT > 0 ? 2 : w.invuln > 0.4 ? 1 : 0);
    const mm = w.maneT > 0;
    this.mmBack.setVisible(mm); this.mmBar.setVisible(mm);
    this.scoreText.setVisible(!mm);
    if (mm) { this.mmBar.width = Math.round(34 * (w.maneT / MANE_MODE_SECONDS)); this.mmBar.fillColor = Math.floor(this.time.now / 120) % 2 ? COLORS.goldHi : COLORS.gold; }
    if (w.boss && w.boss.hp > 0 && w.boss.state !== 'sleep') {
      const tw = Math.round(this.barW * Math.max(0, w.boss.hp / (w.boss.data?.maxHp ?? 1)));
      this.bossBar.width += (tw - this.bossBar.width) * 0.25;
    }
    for (const b of this.buttons) {
      if (b.b === 'sip') b.img.setAlpha(w.cans > 0 && !mm ? (Math.floor(this.time.now / 250) % 2 ? 1 : 0.75) : 0.3);
      if (b.b === 'flex') b.img.setAlpha(w.dollaCd > 0 ? 0.35 : 0.9);
    }
    // the Foreman's cap coming down: a shadow on the floor in front of you that grows
    // (Mission 9: frost spreading under you, pale blue instead of black)
    const s = (w as any).capShadow as number | undefined;
    const ice = w.trapTex === 'iceOverlay';
    this.shadow.clear();
    if (s !== undefined && s > 0) {
      const W = this.scale.width;
      this.shadow.fillStyle(ice ? 0xbfe8ff : 0x000000, ice ? 0.2 + s * 0.45 : 0.25 + s * 0.4).fillEllipse(W / 2, 200, 120 + s * 260, 30 + s * 60);
      if (ice) this.shadow.lineStyle(2, 0xffffff, 0.4 + s * 0.5).strokeEllipse(W / 2, 200, 120 + s * 260, 30 + s * 60);
      this.shadow.fillStyle(ice ? 0x5ce1ff : 0xd43a3a, 0.5 + 0.5 * Math.sin(this.time.now / 60)).fillRect(W / 2 - 40, 46, 80, 2);
    }
    // an extra meter under the goal (Uncle T's upload)
    this.meterG.clear();
    const m = w.meter;
    this.meterText.setVisible(!!m);
    if (m) {
      const W = this.scale.width, bw = 110, x = W / 2 - bw / 2, y = 14;
      this.meterG.fillStyle(0x0b0f26, 0.9).fillRect(x - 1, y - 1, bw + 2, 13).lineStyle(1, COLORS.gold, 1).strokeRect(x - 1, y - 1, bw + 2, 13);
      this.meterG.fillStyle(m.v > 0.5 ? 0x2a7ad8 : m.v > 0.2 ? 0x3c9ad8 : COLORS.goldDark, 1).fillRect(x, y, Math.round(bw * Math.max(0, Math.min(1, m.v))), 11);
      this.meterText.setText(m.label);
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

  // the Aquifer Fact card: shows for a few seconds without stopping the game
  showFact(title: string, body: string) {
    const W = this.scale.width;
    this.factLayer?.destroy();
    const t = px(this, 0, 22, body, 0xffffff).setCenterAlign().setOrigin(0.5, 0);
    const h = t.height + 30;
    const bg = this.add.rectangle(0, 0, Math.max(t.width + 24, 180), h, 0x141c40, 0.95).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.goldHi);
    const n = px(this, 0, 6, title, COLORS.goldHi).setOrigin(0.5, 0);
    const card = this.add.image(-bg.width / 2 + 12, 12, 'factCard', 2).setScale(0.6);
    this.factLayer = this.add.container(W / 2, 128 - h / 2, [bg, n, t, card]).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: this.factLayer, alpha: 1, duration: 200 });
    this.tweens.add({ targets: this.factLayer, alpha: 0, delay: 6500, duration: 500 });
  }

  // ---------------------------------------------------------------- capped: the inside of a bottle cap, mash to pop it off
  private buildCap() {
    const W = this.scale.width;
    const ice = this.world.trapTex === 'iceOverlay';
    const img = this.add.image(W / 2, 108, this.world.trapTex).setDisplaySize(W + 40, 236);
    const t = px(this, W / 2, 140, this.world.trapTitle, ice ? 0x2a7ad8 : COLORS.red, 3).setOrigin(0.5);
    const m = px(this, W / 2, 168, isTouch() ? 'MASH SPRAY!' : 'MASH Z / SPACE!', 0xffffff, 2).setOrigin(0.5).setName('m');
    this.capLayer = this.add.container(0, 0, [img, t, m]).setDepth(30).setVisible(false);
    this.tweens.add({ targets: m, alpha: 0.4, duration: 200, yoyo: true, repeat: -1 });
  }
  private showCapped(n: number) {
    const was = this.capLayer.visible;
    this.capLayer.setVisible(n > 0);
    if (n > 0 && was) { this.capLayer.setX(Phaser.Math.Between(-4, 4)); this.time.delayedCall(60, () => this.capLayer.setX(0)); }
  }

  // ---------------------------------------------------------------- touch: left thumb moves and turns, drag the right side to look
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
    mk('btnSpray', 'attack', 24);
    mk('btnSip', 'sip', 20);
    mk('btnDolla', 'flex', 19);
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
    const pos: Record<string, [number, number]> = { attack: [W - 36, 174], sip: [W - 34, 120], flex: [W - 92, 194], pause: [W - 20, 56] };
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
    if (p.x < this.scale.width * 0.45) {
      if (this.stick.id === -1 && this.stickBase && this.stickKnob) {
        this.stick = { id: p.id, ox: p.x, oy: p.y };
        this.stickBase.setPosition(p.x, p.y).setAlpha(0.8);
        this.stickKnob.setPosition(p.x, p.y);
      }
    } else if (this.look.id === -1) this.look = { id: p.id, x: p.x };
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id === this.look.id) {
      this.world.lookDelta += (p.x - this.look.x) * 0.014;
      this.look.x = p.x;
      return;
    }
    if (p.id !== this.stick.id || !this.stickKnob) return;
    const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy;
    const max = 24;
    const d = Math.hypot(dx, dy), k = d > max ? max / d : 1;
    this.stickKnob.setPosition(this.stick.ox + dx * k, this.stick.oy + dy * k);
    const nx = dx / max, ny = dy / max;
    const dz = (n: number, z: number) => (Math.abs(n) < z ? 0 : Math.sign(n) * Math.min(1, (Math.abs(n) - z) / (1 - z)));
    // turning is gentler than walking so one thumb can steer and walk at once
    Controls.setStick(dz(nx, 0.2) * 0.8, dz(ny, 0.18));
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.look.id) this.look.id = -1;
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
    const top = px(this, W / 2, 40, 'MANE RAN DRY!', 0xffffff).setOrigin(0.5);
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
        if (Controls.consume('attack', 400) || Controls.consume('sip', 400)) { poll.remove(); this.tryContinue(); }
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
