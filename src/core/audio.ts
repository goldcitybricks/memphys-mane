import Phaser from 'phaser';
import { Save } from './save';
import type { SfxKey } from './assets';

let muted = Save.muted();
let music: Phaser.Sound.BaseSound | null = null;
let musicKey = '';

export const Audio = {
  get muted() { return muted; },
  toggleMute(scene: Phaser.Scene) {
    muted = !muted;
    Save.setMuted(muted);
    scene.sound.mute = muted;
    return muted;
  },
  apply(scene: Phaser.Scene) { scene.sound.mute = muted; },
  sfx(scene: Phaser.Scene, key: SfxKey, opts: { volume?: number; detune?: number; rate?: number } = {}) {
    scene.sound.play(key, { volume: opts.volume ?? 0.7, detune: opts.detune ?? Phaser.Math.Between(-60, 60), rate: opts.rate ?? 1 });
  },
  music(scene: Phaser.Scene, key: string, volume = 0.45, loop = true) {
    if (musicKey === key && music?.isPlaying) return;
    music?.stop();
    music?.destroy();
    musicKey = key;
    music = scene.sound.add(key, { loop, volume });
    music.play();
  },
  musicRate(rate: number) { if (music) (music as any).setRate?.(rate); },
  stopMusic() { music?.stop(); musicKey = ''; },
};
