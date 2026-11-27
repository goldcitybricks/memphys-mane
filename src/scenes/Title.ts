import Phaser from 'phaser';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { px } from '../core/text';
import { Controls } from '../core/controls';
import { isTouch } from '../ui/UIScene';
import { Save } from '../core/save';
import { CREDITS } from './credits';
import { canFullscreen, fullscreenButton, toggleFullscreen } from '../core/fullscreen';
import { MISSIONS } from '../core/modes';

export class Title extends Phaser.Scene {
  private started = false;
  private picked = 'Mission1';
  constructor() { super('Title'); }

  create() {
    this.started = false;
    Controls.clear();
    Audio.apply(this);
    const W = this.scale.width;
    this.add.tileSprite(0, 0, W, 216, 'bgSky').setOrigin(0);
    const far = this.add.tileSprite(0, 0, W, 216, 'bgFar').setOrigin(0);
    this.add.rectangle(0, 150, W, 66, 0x141a3a).setOrigin(0);
    this.events.on('update', () => { far.tilePositionX += 0.15; });

    const logo = this.add.image(W / 2, 42, 'logo');
    this.tweens.add({ targets: logo, y: 40, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const mane = this.add.sprite(W / 2, 182, 'mane').setScale(1.5).setOrigin(0.5, 61 / 64);
    mane.play('mane:idle');
    this.add.ellipse(W / 2, 182, 40, 7, 0x000000, 0.4).setDepth(-1);
    this.time.addEvent({ loop: true, delay: 4200, callback: () => { mane.play('mane:shine'); Audio.sfx(this, 'shine', { volume: 0.25 }); mane.once('animationcomplete', () => mane.play('mane:idle')); } });

    px(this, W / 2, 86, 'ROYAL BY NATURE. KEEPER BY CHOICE.', COLORS.cream).setOrigin(0.5);
    // missions unlock as you clear the one before (?play=2 style links open any of them)
    const open = MISSIONS.filter((m, i) => m.available && (i === 0 || !!Save.get(MISSIONS[i - 1].id)));
    const picker = open.length > 1;
    const start = px(this, W / 2, 194, picker ? 'PICK A MISSION' : isTouch() ? 'TAP TO START' : 'PRESS ENTER OR CLICK', COLORS.goldHi).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    this.picked = picker ? open[open.length - 1].scene : 'Mission1';
    if (picker) {
      // the newest mission gets the big card on the right (and ENTER); the earlier ones stack on the left
      const card = (m: (typeof open)[number], x: number, y: number, w: number, h: number, newest: boolean) => {
        const c = this.add.rectangle(x, y, w, h, 0x0b0f26, 0.85).setStrokeStyle(1, newest ? COLORS.goldHi : COLORS.gold).setInteractive({ useHandCursor: true });
        px(this, x, y - (h > 30 ? 10 : 8), `MISSION ${m.number}`, newest ? COLORS.goldHi : COLORS.gold).setOrigin(0.5, 0);
        px(this, x, y + (h > 30 ? 2 : 1), m.title, 0xffffff).setOrigin(0.5, 0);
        c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); this.go(m.scene); });
      };
      const older = open.slice(0, -1).slice(-3);
      const rowH = older.length > 2 ? 24 : 30;
      older.forEach((m, i) => card(m, W / 2 - 92, 146 - ((older.length - 1) * rowH) / 2 + i * rowH, 120, rowH - 3, false));
      card(open[open.length - 1], W / 2 + 92, 146, 120, 34, true);
    }

    const best = Save.get('m1-the-sip');
    if (best) px(this, 6, 4, `BEST ${String(best.bestScore).padStart(6, '0')}`, 0x9aa0c0);

    const credits = px(this, W - 6, 206, 'CREDITS', 0x9aa0c0).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    credits.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); this.showCredits(); });
    const mute = px(this, W - 6, 4, Audio.muted ? 'SOUND OFF' : 'SOUND ON', 0x9aa0c0).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); const m = Audio.toggleMute(this); mute.setText(m ? 'SOUND OFF' : 'SOUND ON'); });


    // full screen: bottom-left on phones, under BEST on desktop (F key too)
    if (isTouch()) { if (canFullscreen(this)) fullscreenButton(this, 6, 206, COLORS.goldHi); }
    else {
      fullscreenButton(this, 6, 15, 0x9aa0c0, '', ' (F)');
      px(this, 6, 206, 'ARROWS MOVE  Z PUNCH  X JUMP  C SIP  V FLEX', 0x9aa0c0);
      this.input.keyboard?.on('keydown-F', () => toggleFullscreen(this));
    }
    // the screen shape changes going in or out of full screen: rebuild the title at the new width
    const relayout = () => { if (!this.started && this.scale.width !== W) this.scene.restart(); };
    this.scale.on('resize', relayout);
    this.events.once('shutdown', () => this.scale.off('resize', relayout));

    this.input.on('pointerdown', () => { if (!picker) this.go(); });
    this.input.keyboard?.on('keydown-ENTER', () => this.go());
    this.input.keyboard?.on('keydown-SPACE', () => this.go());
    this.input.keyboard?.on('keydown-Z', () => this.go());
    // music starts after the first tap (browsers require a gesture)
    this.input.once('pointerdown', () => Audio.music(this, 'music_backdoor', 0.35));
  }

  private showCredits() {
    const W = this.scale.width;
    const layer = this.add.container(0, 0).setDepth(50);
    layer.add(this.add.rectangle(0, 0, W, 216, 0x070a1c, 0.95).setOrigin(0).setInteractive());
    layer.add(px(this, W / 2, 10, 'CREDITS', COLORS.goldHi).setOrigin(0.5, 0));
    CREDITS.forEach((line, i) => layer.add(px(this, 12, 26 + i * 11, line, i % 3 === 0 ? COLORS.gold : 0xffffff)));
    const close = px(this, W / 2, 202, '> CLOSE', COLORS.goldHi).setOrigin(0.5).setInteractive({ useHandCursor: true });
    layer.add(close);
    close.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); layer.destroy(); });
  }

  private go(scene = this.picked) {
    if (this.started) return;
    this.started = true;
    Audio.sfx(this, 'select', { volume: 0.7 });
    // go fullscreen on phones that allow it (Android); iPhone Safari ignores this
    if (isTouch() && this.scale.fullscreen.available && !this.scale.isFullscreen) { try { this.scale.startFullscreen(); } catch { /* ignore */ } }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, () => this.scene.start(scene));
  }
}
