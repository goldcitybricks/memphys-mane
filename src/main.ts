import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Title } from './scenes/Title';
import { Results } from './scenes/Results';
import { Mission1 } from './missions/Mission1';
import { Mission2 } from './missions/Mission2';
import { Mission3 } from './missions/Mission3';
import { Mission4 } from './missions/Mission4';
import { Mission5 } from './missions/Mission5';
import { Mission6 } from './missions/Mission6';
import { Mission7 } from './missions/Mission7';
import { Mission8 } from './missions/Mission8';
import { DriveUI } from './modes/driving/DriveUI';
import { FightUI } from './modes/fight/FightUI';
import { ShooterUI } from './modes/shooter/ShooterUI';
import { UIScene } from './ui/UIScene';
import { VIEW_H, VIEW_W_MAX, VIEW_W_MIN } from './core/config';

// Width follows the screen shape (384 to 480 wide at 216 tall) so wide phones get more alley instead of black bars.
function pickWidth() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  return Math.round(Math.min(VIEW_W_MAX, Math.max(VIEW_W_MIN, VIEW_H * aspect)));
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: pickWidth(),
  height: VIEW_H,
  backgroundColor: '#070a1c',
  pixelArt: true,
  roundPixels: true,
  input: { activePointers: 4 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  audio: { disableWebAudio: false },
  scene: [Boot, Title, Mission1, Mission2, Mission3, Mission4, Mission5, Mission6, Mission7, Mission8, UIScene, FightUI, DriveUI, ShooterUI, Results],
});

// only touch the game size when the width really changes (iPhone Safari fires resize a lot)
function fitWidth() {
  const w = pickWidth();
  if (w !== game.scale.width) game.scale.setGameSize(w, VIEW_H);
}
window.addEventListener('resize', fitWidth);
// some browsers report the new size a beat after entering or leaving full screen
for (const ev of ['enterfullscreen', 'leavefullscreen']) game.scale.on(ev, () => { fitWidth(); setTimeout(() => { fitWidth(); game.scale.refresh(); }, 250); });
// a refused fullscreen request must never surface as an error
window.addEventListener('unhandledrejection', (e) => { if (String(e.reason).match(/fullscreen|permission/i)) e.preventDefault(); });

(window as any).__game = game;
