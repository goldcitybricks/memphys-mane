import Phaser from 'phaser';
import { canFullscreen, fullscreenButton } from '../core/fullscreen';
import type { BrawlerScene } from '../modes/brawler/BrawlerScene';
import { MANE_MODE_SECONDS, MAX_CANS } from '../modes/brawler/Mane';
import { Controls, Button } from '../core/controls';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { px } from '../core/text';
import { GAME } from '../missions/lines';
import type { Shiesty } from '../modes/brawler/Shiesty';

export const isTouch = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// HUD, touch controls, captions, pause and continue screens. Runs on top of a brawler mission.
export class UIScene extends Phaser.Scene {
  world!: BrawlerScene;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBack!: Phaser.GameObjects.Rectangle;
  private mmBar!: Phaser.GameObjects.Rectangle;
  private mmBack!: Phaser.GameObjects.Rectangle;
  private portrait!: Phaser.GameObjects.Image;
  private canIcons: Phaser.GameObjects.Image[] = [];
  private scoreText!: Phaser.GameObjects.BitmapText;
  private enemyName!: Phaser.GameObjects.BitmapText;
  private enemyBar!: Phaser.GameObjects.Rectangle;
  private enemyBack!: Phaser.GameObjects.Rectangle;
  private enemyTarget: Shiesty | null = null;
  private enemyHideAt = 0;
  private bossName!: Phaser.GameObjects.BitmapText;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBack!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.BitmapText;
  private toastUntil = 0;
  private go!: Phaser.GameObjects.BitmapText;
  private tutorial!: Phaser.GameObjects.BitmapText;
  private tutBack?: Phaser.GameObjects.Rectangle;
  private skipBtn!: Phaser.GameObjects.BitmapText;
  private pauseLayer!: Phaser.GameObjects.Container;
  private contLayer!: Phaser.GameObjects.Container;
  private contCount = 9;
  private contTimer?: Phaser.Time.TimerEvent;
  private touch: Phaser.GameObjects.GameObject[] = [];
  private stick = { id: -1, ox: 0, oy: 0 };
  private stickBase!: Phaser.GameObjects.Image;
  private stickKnob!: Phaser.GameObjects.Image;
  private buttons: { img: Phaser.GameObjects.Image; b: Button; r: number; id: number }[] = [];
  private sipCount!: Phaser.GameObjects.BitmapText;
  private hudGroup: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('UI'); }

  init(data: { world: BrawlerScene }) { this.world = data.world; }

  create() {
    this.canIcons = []; this.buttons = []; this.touch = []; this.hudGroup = [];
    this.input.addPointer(3);
    const W = this.scale.width;

    // --- HUD, top-left: portrait, health, cans, score
    const frame = this.add.rectangle(4, 4, 36, 36, 0x0b0f26, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.gold);
    this.portrait = this.add.image(6, 6, 'manePortrait', 0).setOrigin(0);
    const name = px(this, 44, 4, 'MEMPHYS MANE', COLORS.goldHi);
    this.hpBack = this.add.rectangle(44, 15, 82, 7, 0x0b0f26).setOrigin(0).setStrokeStyle(1, COLORS.ink);
    this.hpBar = this.add.rectangle(45, 16, 80, 5, COLORS.gold).setOrigin(0);
    this.mmBack = this.add.rectangle(44, 24, 82, 4, 0x0b0f26).setOrigin(0).setVisible(false);
    this.mmBar = this.add.rectangle(45, 25, 80, 2, 0xffffff).setOrigin(0).setVisible(false);
    for (let i = 0; i < MAX_CANS; i++) this.canIcons.push(this.add.image(46 + i * 11, 28, 'hudCanEmpty').setOrigin(0));
    this.scoreText = px(this, 80, 31, '0', 0xffffff);
    this.hudGroup.push(frame, this.portrait, name, this.hpBack, this.hpBar, ...this.canIcons, this.scoreText);

    // --- enemy health, top-right
    this.enemyName = px(this, W - 6, 4, '', 0xffffff).setOrigin(1, 0).setVisible(false);
    this.enemyBack = this.add.rectangle(W - 6, 15, 62, 6, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.ink).setVisible(false);
    this.enemyBar = this.add.rectangle(W - 7, 16, 60, 4, COLORS.red).setOrigin(1, 0).setVisible(false);

    // boss health: a long bar across the top right
    this.bossName = px(this, W - 6, 4, '', COLORS.goldHi).setOrigin(1, 0).setVisible(false);
    this.bossBack = this.add.rectangle(W - 6, 15, W - 138, 8, 0x0b0f26).setOrigin(1, 0).setStrokeStyle(1, COLORS.gold).setVisible(false);
    this.bossBar = this.add.rectangle(W - 7, 16, W - 140, 6, COLORS.red).setOrigin(1, 0).setVisible(false);

    this.toastText = px(this, W / 2, 46, '', COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    this.go = px(this, W - 10, 92, 'GO >', COLORS.goldHi, 2).setOrigin(1, 0.5).setVisible(false);
    this.tutorial = px(this, W / 2, 100, '', 0xffffff).setOrigin(0.5, 0).setCenterAlign().setAlpha(0);
    this.skipBtn = px(this, W - 6, 6, 'SKIP >', 0xffffff).setOrigin(1, 0).setVisible(false).setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerdown', () => (this.world as any).skipCutscene?.());

    this.buildTouch();
    this.buildPause();
    this.buildContinue();

    const ev = this.world.events;
    const on = (name: string, fn: (...a: any[]) => void) => { ev.on(name, fn, this); this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ev.off(name, fn, this)); };
    on('hud', () => this.refresh());
    on('toast', (s: string) => this.toast(s));
    on('go', (v: boolean) => this.go.setVisible(v));
    on('maneMode', () => this.refresh());
    on('enemyHit', (e: Shiesty | null) => { if (e) { this.enemyTarget = e; this.enemyHideAt = this.time.now + 2500; } });
    on('banner', (b: { top: string; bottom: string }) => this.banner(b.top, b.bottom));
    on('tutorial', (k: string) => this.showTutorial(k));
    on('carWarn', (w: { y: number; dir: number; ms: number }) => this.carWarn(w.y, w.dir, w.ms));
    on('cutscene', (v: boolean) => {
      this.skipBtn.setVisible(v); this.setHudVisible(!v);
      // tips never sit on top of a cutscene's dialogue
      if (v) { this.tweens.killTweensOf([this.tutorial, this.tutBack]); this.tutorial.setAlpha(0); this.tutBack?.setAlpha(0); }
    });
    on('paused', (v: boolean) => this.pauseLayer.setVisible(v));
    on('continue', (v: boolean) => this.showContinue(v));
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
    this.refresh();
    if (this.world.inCutscene) { this.skipBtn.setVisible(true); this.setHudVisible(false); }
  }

  private setHudVisible(v: boolean) {
    for (const o of this.hudGroup) (o as any).setVisible(v);
    for (const o of this.touch) (o as any).setVisible(v && isTouch());
    if (v) this.refresh();
  }

  private layout() {
    const W = this.scale.width;
    this.enemyName.setX(W - 6); this.enemyBack.setX(W - 6); this.enemyBar.setX(W - 7);
    this.bossName.setX(W - 6); this.bossBack.setX(W - 6).setSize(W - 138, 8); this.bossBar.setX(W - 7);
    this.toastText.setX(W / 2); this.go.setX(W - 10); this.tutorial.setX(W / 2); this.skipBtn.setX(W - 6);
    this.placeButtons();
    // pause + continue menus are centered; shift them with the width
    for (const l of [this.pauseLayer, this.contLayer]) if (l) l.setX((W - this.builtW) / 2);
  }

  refresh() {
    const p = this.world.player;
    if (!p) return;
    const k = Math.max(0, p.hp / p.maxHp);
    this.hpBar.width = Math.round(80 * k);
    this.hpBar.fillColor = k < 0.3 ? COLORS.red : COLORS.gold;
    this.portrait.setFrame(p.inManeMode ? 2 : k < 0.3 ? 1 : 0);
    this.canIcons.forEach((c, i) => c.setTexture(i < p.cans ? 'hudCan' : 'hudCanEmpty'));
    this.scoreText.setText(String(this.world.score).padStart(6, '0'));
    if (this.sipCount) this.sipCount.setText(String(p.cans));
  }

  update() {
    const p = this.world.player;
    if (!p) return;
    // Mane Mode timer
    const mm = p.maneMode > 0;
    this.mmBack.setVisible(mm); this.mmBar.setVisible(mm);
    if (mm) { this.mmBar.width = Math.round(80 * (p.maneMode / MANE_MODE_SECONDS)); this.mmBar.fillColor = Math.floor(this.time.now / 100) % 2 ? COLORS.goldHi : 0xffffff; }
    // health bar eases (keeps it readable on hits)
    const k = Math.max(0, p.hp / p.maxHp);
    this.hpBar.width += (Math.round(80 * k) - this.hpBar.width) * 0.3;
    // enemy bar
    const boss = this.world.boss;
    const showB = !!boss && boss.alive && !this.world.inCutscene;
    this.bossName.setVisible(showB); this.bossBack.setVisible(showB); this.bossBar.setVisible(showB);
    if (showB && boss) {
      this.bossName.setText(boss.name);
      const full = this.scale.width - 140;
      const target = Math.max(0, Math.round(full * (boss.hp / boss.maxHp)));
      this.bossBar.width += (target - this.bossBar.width) * 0.2;
      this.bossBar.fillColor = Math.floor(this.time.now / 120) % 2 && boss.hp / boss.maxHp < 0.3 ? COLORS.goldHi : COLORS.red;
    }
    const e = this.enemyTarget;
    const showE = !!e && this.time.now < this.enemyHideAt && !showB;
    this.enemyName.setVisible(showE); this.enemyBack.setVisible(showE); this.enemyBar.setVisible(showE);
    if (showE && e) {
      this.enemyName.setText(e.name);
      this.enemyBar.width = Math.max(0, Math.round(60 * (e.hp / e.maxHp)));
    }
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    if (this.go.visible) this.go.setAlpha(Math.floor(this.time.now / 300) % 2 ? 1 : 0.3);
    if (this.sipCount) {
      const sip = this.buttons.find((b) => b.b === 'sip');
      if (sip) sip.img.setAlpha(p.cans > 0 && !p.inManeMode ? 1 : 0.4);
    }
  }

  toast(s: string) {
    this.toastText.setText(s).setAlpha(1);
    this.toastUntil = this.time.now + 1500;
  }

  banner(top: string, bottom: string) {
    const W = this.scale.width;
    const bar = this.add.rectangle(W / 2, 96, W, 44, 0x0b0f26, 0.85).setStrokeStyle(1, COLORS.gold).setScale(1, 0);
    const a = px(this, W / 2, 80, top, COLORS.goldHi).setOrigin(0.5, 0).setAlpha(0);
    const b = px(this, W / 2, 92, bottom, COLORS.gold, 2).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: bar, scaleY: 1, duration: 200 });
    this.tweens.add({ targets: [a, b], alpha: 1, duration: 200, delay: 150 });
    this.time.delayedCall(2000, () => this.tweens.add({ targets: [bar, a, b], alpha: 0, duration: 300, onComplete: () => { bar.destroy(); a.destroy(); b.destroy(); } }));
  }

  showTutorial(k: string) {
    const touch = isTouch();
    const t: Record<string, string> = touch
      ? { move: 'LEFT THUMB: MOVE\nHIT: PUNCH. TAP FAST FOR A COMBO', jump: 'JUMP OVER POTHOLES\nJUMP + HIT: FLYING KICK', sip: 'TAP SIP: CHUG A MEMPHYS\n10 SECONDS OF MANE MODE', car: 'DRIVE-OUT!\nJUMP OR GET OUT THE LANE', chariot: 'CHARIOT!\nJUMP OR GET OUT THE LANE', mud: 'JUMP THE MUD HOLES\nHIT THE JARS FOR FOOD + CANS', breach: 'JUMP THE BREACHES\nHIT THE CRATES FOR FOOD + CANS', cart: 'DRILL CART!\nJUMP OR GET OUT THE LANE' }
      : { move: 'ARROWS/WASD: MOVE   Z/J: PUNCH\nTAP FAST FOR A COMBO', jump: 'X/K/SPACE: JUMP OVER POTHOLES\nJUMP + PUNCH: FLYING KICK', sip: 'C/L: SIP A MEMPHYS\n10 SECONDS OF MANE MODE. V: FLEX', car: 'DRIVE-OUT!\nJUMP OR GET OUT THE LANE', chariot: 'CHARIOT!\nJUMP OR GET OUT THE LANE', mud: 'X/K/SPACE: JUMP THE MUD HOLES\nHIT THE JARS FOR FOOD + CANS', breach: 'X/K/SPACE: JUMP THE BREACHES\nHIT THE CRATES FOR FOOD + CANS', cart: 'DRILL CART!\nJUMP OR GET OUT THE LANE' };
    this.tutorial.setText(t[k] ?? '').setAlpha(1);
    const b = this.tutorial.getTextBounds().global;
    this.tutBack?.destroy();
    this.tutBack = this.add.rectangle(this.tutorial.x, this.tutorial.y - 3, b.width + 12, b.height + 6, 0x070a1c, 0.75).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.gold, 0.6);
    this.children.moveBelow(this.tutBack, this.tutorial);
    this.tweens.killTweensOf([this.tutorial, this.tutBack]);
    this.tweens.add({ targets: [this.tutorial, this.tutBack], alpha: 0, delay: 4200, duration: 500 });
  }

  carWarn(y: number, dir: number, ms: number) {
    const W = this.scale.width;
    const x = dir > 0 ? 14 : W - 14;
    const arrow = px(this, x, y - 20, dir > 0 ? '!>' : '<!', COLORS.red, 2).setOrigin(0.5);
    this.tweens.add({ targets: arrow, alpha: { from: 1, to: 0.2 }, yoyo: true, repeat: Math.floor(ms / 200), duration: 100, onComplete: () => arrow.destroy() });
  }

  // ---------------------------------------------------------------- touch controls
  private buildTouch() {
    if (!isTouch()) return;
    this.stickBase = this.add.image(60, 160, 'stickBase').setAlpha(0.6);
    this.stickKnob = this.add.image(60, 160, 'stickKnob').setAlpha(0.8);
    this.touch.push(this.stickBase, this.stickKnob);
    const mk = (tex: string, b: Button, r: number) => {
      const img = this.add.image(0, 0, tex).setAlpha(0.9);
      this.buttons.push({ img, b, r, id: -1 });
      this.touch.push(img);
    };
    mk('btnPunch', 'attack', 26);
    mk('btnJump', 'jump', 22);
    mk('btnSip', 'sip', 22);
    mk('btnFlex', 'flex', 19);
    mk('btnPause', 'pause', 12);
    this.sipCount = px(this, 0, 0, '0', COLORS.ink).setOrigin(0.5);
    this.touch.push(this.sipCount);
    this.placeButtons();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
  }

  private placeButtons() {
    if (!this.buttons.length) return;
    const W = this.scale.width;
    const pos: Record<string, [number, number]> = {
      attack: [W - 34, 180], jump: [W - 86, 194], sip: [W - 30, 128], flex: [W - 76, 146], pause: [W - 16, 60],
    };
    for (const b of this.buttons) b.img.setPosition(...pos[b.b]);
    const sip = pos.sip;
    this.sipCount.setPosition(sip[0] + 14, sip[1] - 14);
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
    if (p.x < this.scale.width * 0.5 && this.stick.id === -1) {
      this.stick = { id: p.id, ox: p.x, oy: p.y };
      this.stickBase.setPosition(p.x, p.y).setAlpha(0.8);
      this.stickKnob.setPosition(p.x, p.y);
    } else if (this.world.inCutscene) {
      Controls.press('attack'); // tap anywhere to advance dialogue
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id !== this.stick.id) return;
    const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy;
    const max = 22;
    const d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1;
    this.stickKnob.setPosition(this.stick.ox + dx * k, this.stick.oy + dy * k);
    // dead zone, then full speed quickly (feels better on glass)
    const nx = dx / max, ny = dy / max;
    const shape = (v: number) => (Math.abs(v) < 0.18 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.18) / 0.55));
    Controls.setStick(shape(nx), shape(ny));
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.stick.id) {
      this.stick.id = -1;
      Controls.setStick(0, 0);
      this.stickBase.setPosition(60, 160).setAlpha(0.6);
      this.stickKnob.setPosition(60, 160);
    }
    for (const b of this.buttons) if (b.id === p.id) { b.id = -1; b.img.setScale(1); if (b.b !== 'pause') Controls.release(b.b); }
  }

  // ---------------------------------------------------------------- pause + continue
  private builtW = 0;
  private buildPause() {
    const W = this.scale.width;
    this.builtW = W;
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
    const buy = px(this, W / 2, 190, GAME.buy, COLORS.gold).setOrigin(0.5).setName('b');
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
        if (Controls.consume('attack', 400) || Controls.consume('sip', 400) || Controls.consume('jump', 400)) { poll.remove(); this.tryContinue(); }
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
    this.world.continuing = false;
    const t = this.contLayer.getByName('t') as Phaser.GameObjects.BitmapText;
    const n = this.contLayer.getByName('n') as Phaser.GameObjects.BitmapText;
    const h = this.contLayer.getByName('h') as Phaser.GameObjects.BitmapText;
    t.setText('GAME OVER').setScale(2);
    n.setText('');
    h.setText(GAME.gameOver);
    this.time.delayedCall(2200, () => this.world.gameOver());
  }
}
