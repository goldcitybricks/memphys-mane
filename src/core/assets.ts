import Phaser from 'phaser';
import art from '../../public/assets/art/art.json';

type Sprite = { file: string; frameWidth?: number; frameHeight?: number; anims?: Record<string, [number, number]> };
const sprites = art.sprites as unknown as Record<string, Sprite>;

export const LEVEL_W = art.levelWidth as number;
export const FONT_CHARS = art.fontChars as string;

export const SFX = [
  'punch', 'punchHeavy', 'whiff', 'tonk', 'jump', 'land', 'pickup', 'sip', 'maneMode', 'horn', 'carBy', 'bottle',
  'throw', 'ko', 'shine', 'select', 'grunt', 'eat', 'splash', 'bark', 'crash', 'portal', 'burst', 'blip',
  'howl', 'clang', 'hooves', 'potBreak', 'seal',
  'ding', 'crowd', 'ooh', 'crinkle', 'capPop', 'flash', 'block',
  'boost', 'skid', 'spin', 'recalc', 'geyser',
  'spray', 'hydrate', 'radio', 'alarm', 'piston', 'whistle',
  'drill', 'drone', 'drain', 'rumble', 'mural',
  'rocket', 'glitch', 'notify', 'peel',
  'remember', 'forget',
  'zap', 'freeze', 'shatter', 'upload',
] as const;
export type SfxKey = (typeof SFX)[number];
export const MUSIC = ['music_pitstop', 'music_backdoor', 'music_victory', 'music_river', 'music_jackal', 'music_fight', 'music_bridge', 'music_plant', 'music_foreman', 'music_beale', 'music_soul', 'music_driller', 'music_lost', 'music_crowe', 'music_glitch', 'music_loop', 'music_convoy', 'music_gigantum', 'music_core'] as const;

const FPS: Record<string, number> = {
  idle: 5, walk: 11, run: 12, jump: 8, punch1: 16, punch2: 15, punch3: 11, kick: 12, hurt: 10, knockdown: 8, taunt: 8,
  shine: 9, sip: 8, victory: 7, idleShades: 4, punch: 10, throw: 10, dazed: 4, talk: 5, toss: 7, tip: 5, scared: 6,
  glow: 8, spin: 14, hit: 24, puff: 14, rise: 6, bark: 6, runMask: 12,
  flicker: 9, dash: 10, howl: 4, bow: 3, laugh: 5, point: 4, carry: 3, bite: 4, give: 4,
  // Fight Night
  jab: 18, hook: 14, block: 4, dodge: 12, getup: 5, super: 9, standOver: 3, hay: 7, cap: 8, crouch: 1, tuck: 1,
  stuck: 7, crinkle: 10, pop: 10, refill: 6, count: 5, fight: 5, wave: 6, lift: 1, mic: 3, pour: 1,
  // Beale Below
  play: 4, lifted: 6, blank: 2, slam: 6, hover: 16,
  // Crowe Live
  sway: 1, glitch: 12, peel: 3, gigaz: 3,
  // The Loop
  flap: 14,
  // The Gigantum
  frozen: 1, inhale: 1, wince: 1, melt: 1,
};
const LOOP = new Set(['idle', 'walk', 'run', 'idleShades', 'dazed', 'talk', 'glow', 'spin', 'rise', 'scared', 'runMask', 'bark', 'flicker', 'dash', 'howl', 'bow', 'laugh', 'carry', 'stuck', 'crinkle', 'refill', 'mic', 'standOver', 'wave', 'block', 'play', 'lifted', 'blank', 'hover', 'glitch', 'gigaz', 'flap']);

export function preloadAll(scene: Phaser.Scene) {
  const base = 'assets/';
  for (const [key, s] of Object.entries(sprites)) {
    if (key === 'font') { scene.load.image('font', base + 'art/' + s.file); continue; }
    if (s.frameWidth) scene.load.spritesheet(key, base + 'art/' + s.file, { frameWidth: s.frameWidth, frameHeight: s.frameHeight! });
    else scene.load.image(key, base + 'art/' + s.file);
  }
  for (const k of SFX) scene.load.audio(k, base + 'audio/' + k + '.mp3');
  for (const k of MUSIC) scene.load.audio(k, base + 'audio/' + k + '.mp3');
}

export function createAnims(scene: Phaser.Scene) {
  for (const [key, s] of Object.entries(sprites)) {
    if (!s.anims) continue;
    for (const [name, [a, b]] of Object.entries(s.anims)) {
      const k = `${key}:${name}`;
      if (scene.anims.exists(k)) continue;
      scene.anims.create({
        key: k,
        frames: scene.anims.generateFrameNumbers(key, { start: a, end: b }),
        frameRate: FPS[name] ?? 8,
        repeat: LOOP.has(name) ? -1 : 0,
      });
    }
  }
  // two-frame sheets without named anims
  for (const car of ['carAltimaGrey', 'carInfiniti', 'carAltimaBlack', 'carGold', 'chariot', 'bigBlueSide', 'drillCart']) {
    if (!scene.anims.exists(car + ':roll')) scene.anims.create({ key: car + ':roll', frames: scene.anims.generateFrameNumbers(car, { start: 0, end: 1 }), frameRate: 14, repeat: -1 });
  }
}

export function registerFont(scene: Phaser.Scene) {
  if (scene.cache.bitmapFont.exists('px')) return;
  const cfg = {
    image: 'font', width: 7, height: 9, chars: FONT_CHARS, charsPerRow: FONT_CHARS.length,
    spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 2,
  };
  scene.cache.bitmapFont.add('px', Phaser.GameObjects.RetroFont.Parse(scene, cfg as any));
}
