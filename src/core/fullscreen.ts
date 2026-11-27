import Phaser from 'phaser';
import { px } from './text';
import { COLORS } from './config';

// Fullscreen that works everywhere we can:
// - Android / desktop: real Fullscreen API (also from inside the WordPress iframe, which has allowfullscreen)
// - iPhone inside an iframe: no Fullscreen API, so open the game on its own page where landscape Safari hides the bars
// - iPhone on its own page: explain Add to Home Screen, which launches with no browser bars at all
const inIframe = () => { try { return window.self !== window.top; } catch { return true; } };

export const fsLabel = (scene: Phaser.Scene) => (scene.scale.isFullscreen ? 'EXIT FULL SCREEN' : 'FULL SCREEN');

export function toggleFullscreen(scene: Phaser.Scene) {
  const s = scene.scale;
  if (s.fullscreen.available) {
    if (s.isFullscreen) { s.stopFullscreen(); return; }
    try { s.startFullscreen(); } catch { /* ignore */ }
    // phones: stay sideways once fullscreen
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.('landscape').catch(() => { /* not supported */ });
    return;
  }
  if (inIframe()) {
    const url = location.href.split('#')[0];
    if (!window.open(url, '_blank')) location.href = url;
    return;
  }
  homeScreenHint(scene);
}

function homeScreenHint(scene: Phaser.Scene) {
  const W = scene.scale.width;
  const layer = scene.add.container(0, 0).setDepth(200);
  const bg = scene.add.rectangle(0, 0, W, 216, 0x070a1c, 0.95).setOrigin(0).setInteractive();
  layer.add(bg);
  const lines = [
    ['FULL SCREEN ON IPHONE', COLORS.goldHi],
    ['', 0xffffff],
    ['1. TAP THE SHARE BUTTON IN SAFARI', 0xffffff],
    ['2. TAP  ADD TO HOME SCREEN', 0xffffff],
    ['3. OPEN MEMPHYS MANE FROM YOUR HOME SCREEN', 0xffffff],
    ['', 0xffffff],
    ['IT PLAYS FULL SCREEN WITH NO BROWSER BARS.', COLORS.cream],
    ['', 0xffffff],
    ['TAP TO CLOSE', 0x9aa0c0],
  ] as const;
  lines.forEach(([t, c], i) => layer.add(px(scene, W / 2, 50 + i * 13, t, c).setOrigin(0.5)));
  bg.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); layer.destroy(); });
}

// a tappable text button that toggles fullscreen and keeps its label current
export function fullscreenButton(scene: Phaser.Scene, x: number, y: number, color: number, prefix = '', suffix = '') {
  const b = px(scene, x, y, prefix + fsLabel(scene) + suffix, color).setInteractive({ useHandCursor: true });
  // stop the tap from also starting the game / closing menus
  b.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e.stopPropagation());
  b.on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); toggleFullscreen(scene); });
  const upd = () => b.active && b.setText(prefix + fsLabel(scene) + suffix);
  scene.scale.on('enterfullscreen', upd);
  scene.scale.on('leavefullscreen', upd);
  scene.events.once('shutdown', () => { scene.scale.off('enterfullscreen', upd); scene.scale.off('leavefullscreen', upd); });
  return b;
}
