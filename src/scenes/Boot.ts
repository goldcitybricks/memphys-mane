import Phaser from 'phaser';
import { preloadAll, createAnims, registerFont } from '../core/assets';
import { COLORS } from '../core/config';

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
    // ?play skips the title (handy for testing and for "challenge a friend" links later)
    this.scene.start(params.has('play') ? 'Mission1' : 'Title');
  }
}
