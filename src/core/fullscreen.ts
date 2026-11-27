import Phaser from 'phaser';
import { px } from './text';

// Fullscreen that works everywhere we can:
// - Android / desktop: real Fullscreen API (also from inside the WordPress iframe, which has allowfullscreen)
// - iPhone inside an iframe: no Fullscreen API, so open the game on its own page where landscape Safari hides the bars
// - iPhone on its own page: nothing to do (Safari hides its bars when the phone is sideways), so no button
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
}

export const canFullscreen = (scene: Phaser.Scene) => scene.scale.fullscreen.available || inIframe();

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
