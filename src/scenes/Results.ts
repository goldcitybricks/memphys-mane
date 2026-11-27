import Phaser from 'phaser';
import { Audio } from '../core/audio';
import { COLORS, MEMPHYS_URL } from '../core/config';
import { px } from '../core/text';
import { Save } from '../core/save';
import type { MissionStats } from '../modes/brawler/BrawlerScene';
import { Controls } from '../core/controls';
import { missionById, nextMission } from '../core/modes';

const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export class Results extends Phaser.Scene {
  constructor() { super('Results'); }

  create(data: { stats: MissionStats; missionId: string }) {
    Controls.clear();
    const W = this.scale.width;
    const s = data.stats;
    const m = missionById(data.missionId);
    const next = nextMission(m.id);
    // time bonus: under 4 minutes pays
    const timeBonus = Math.max(0, Math.round((240000 - s.timeMs) / 100));
    const total = s.score + timeBonus;
    const { newBest, rec } = Save.record(data.missionId, total, s.timeMs);
    const k = m.number >= 2 ? 1.4 : 1; // longer missions pay more
    const rank = total > 6000 * k ? 'KEEPER' : total > 4200 * k ? 'ROYAL' : total > 2600 * k ? 'HUSTLER' : 'THIRSTY';

    this.add.tileSprite(0, 0, W, 216, m.mode === 'fight' ? (m.number === 7 ? 'riverStage' : 'arena') : m.mode === 'driving' ? (m.number === 8 ? 'loopFar' : 'driveFar') : m.mode === 'shooter' ? (m.number === 9 ? 'gigantumExt' : 'plantExt') : m.number === 10 ? 'sourceExt' : m.number === 6 ? 'bealeExt' : 'egypt').setOrigin(0).setAlpha(0.35);
    this.add.rectangle(0, 0, W, 216, 0x070a1c, 0.55).setOrigin(0);
    px(this, W / 2, 12, `MISSION ${m.number} COMPLETE`, COLORS.goldHi, 2).setOrigin(0.5, 0);
    px(this, W / 2, 34, !next && m.number === 10 ? 'THE END. THANKS FOR PLAYING!' : 'ROYAL BY NATURE.', COLORS.cream).setOrigin(0.5, 0);

    const mane = this.add.sprite(70, 150, m.mode === 'fight' ? 'maneBox' : 'mane').setScale(2).setOrigin(0.5, 61 / 64);
    mane.play(`${mane.texture.key}:victory`);
    mane.once('animationcomplete', () => mane.play(m.mode === 'fight' ? 'maneBox:idle' : 'mane:idleShades'));

    const rows: [string, string][] = [
      ['TIME', fmt(s.timeMs)],
      [m.enemyLabel ?? 'KOS', String(s.kos)],
      [m.hazardLabel ?? 'HAZARD KOS', String(s.drivers)],
      [m.mode === 'fight' ? 'CORNER SIPS' : 'MEMPHYS SIPPED', String(s.sips)],
      ['SCORE', String(s.score)],
      ['TIME BONUS', String(timeBonus)],
      ['TOTAL', String(total)],
    ];
    const x0 = W / 2 - 50, x1 = W - 30;
    rows.forEach(([k, v], i) => {
      const y = 54 + i * 12;
      const a = px(this, x0, y, k, i === rows.length - 1 ? COLORS.goldHi : 0xffffff).setAlpha(0);
      const b = px(this, x1, y, v, i === rows.length - 1 ? COLORS.goldHi : 0xffffff).setOrigin(1, 0).setAlpha(0);
      this.tweens.add({ targets: [a, b], alpha: 1, delay: 300 + i * 220, duration: 150, onStart: () => Audio.sfx(this, 'blip', { volume: 0.5 }) });
    });
    const rk = px(this, (x0 + x1) / 2, 146, `RANK: ${rank}`, COLORS.gold, 2).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: rk, alpha: 1, delay: 300 + rows.length * 220 + 200, duration: 200, onStart: () => Audio.sfx(this, 'shine', { volume: 0.6 }) });
    if (newBest) px(this, (x0 + x1) / 2, 166, 'NEW BEST!', COLORS.goldHi).setOrigin(0.5, 0);
    else px(this, (x0 + x1) / 2, 166, `BEST ${rec.bestScore}`, 0x9aa0c0).setOrigin(0.5, 0);

    const go = (scene: string) => { Audio.sfx(this, 'select', { volume: 0.7 }); this.cameras.main.fadeOut(300, 0, 0, 0); this.time.delayedCall(320, () => this.scene.start(scene)); };
    const again = px(this, 70, 182, '> RUN IT BACK', COLORS.goldHi).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    const ready = next?.available;
    const finale = !next && m.number === 10;
    const nextBtn = px(this, (x0 + x1) / 2, 182, finale ? '> WATCH THE CREDITS' : next ? (ready ? `> NEXT: ${next.title}` : `NEXT: ${next.title} (COMING SOON)`) : '', ready || finale ? COLORS.goldHi : 0x9aa0c0).setOrigin(0.5, 0);
    if (finale) {
      nextBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => go('Finale'));
    }
    if (ready) {
      nextBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => go(next.scene));
      this.tweens.add({ targets: nextBtn, alpha: 0.35, duration: 450, yoyo: true, repeat: -1, delay: 2400 });
    }
    const buy = px(this, W / 2, 202, '> GET THE REAL THING: MEMPHYSWATER.COM', COLORS.gold).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => go(m.scene));
    buy.on('pointerdown', () => window.open(MEMPHYS_URL, '_blank', 'noopener'));
    this.input.keyboard?.on('keydown-ENTER', () => go(ready ? next.scene : finale ? 'Finale' : m.scene));
    this.cameras.main.fadeIn(400);
  }
}
