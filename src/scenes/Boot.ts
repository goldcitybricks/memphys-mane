import Phaser from 'phaser';
import { preloadAll, createAnims, registerFont } from '../core/assets';
import { COLORS } from '../core/config';
import { MISSIONS } from '../core/modes';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    const back = this.add.rectangle(W / 2, H / 2, 160, 8, 0x0b0f26).setStrokeStyle(1, COLORS.gold);
    const bar = this.add.rectangle(W / 2 - 79, H / 2, 1, 6, COLORS.gold).setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => { bar.width = 158 * v; });
    this.load.once('complete', () => back.destroy());
    preloadAll(this);
  }

  create() {
    createAnims(this);
    registerFont(this);
    const params = new URLSearchParams(location.search);
    // ?play skips the title, ?play=2 jumps to Mission 2 (handy for testing and "challenge a friend" links later)
    const n = Number(params.get('play')) || 1;
    const m = MISSIONS.find((x) => x.number === n && x.available) ?? MISSIONS[0];
    this.scene.start(params.has('play') ? m.scene : 'Title');
  }
}
