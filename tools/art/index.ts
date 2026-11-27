// Generates every first-pass PNG into public/assets/art plus art.json (frame sizes + animation ranges).
// To swap in final hand-drawn art: replace the PNG with the same frame size and frame order.
import fs from 'node:fs';
import path from 'node:path';
import { Pix, sheet, hex } from './pix';
import { maneFrames, manePortraits } from './mane';
import { humanSheet, shiestyDef, shiestyOutfits, malik, malikDef, uncleT, uncleTDef, og, ogDef } from './human';
import * as W from './world';
import { drawFont, FONT_CHARS, CELL_W, CELL_H } from './font';
import { P } from './palette';

const OUT = path.resolve('public/assets/art');
fs.mkdirSync(OUT, { recursive: true });

type Entry = { file: string; frameWidth?: number; frameHeight?: number; anims?: Record<string, [number, number]> };
const manifest: Record<string, Entry> = {};

function saveSheet(key: string, frames: Pix[], anims?: Record<string, [number, number]>) {
  sheet(frames).save(path.join(OUT, `${key}.png`));
  manifest[key] = { file: `${key}.png`, frameWidth: frames[0].w, frameHeight: frames[0].h, anims };
}
function saveImage(key: string, img: Pix) {
  img.save(path.join(OUT, `${key}.png`));
  manifest[key] = { file: `${key}.png` };
}

const mane = maneFrames();
saveSheet('mane', mane.frames, mane.anims);
saveSheet('manePortrait', manePortraits());

for (const [k, o] of Object.entries(shiestyOutfits)) {
  const s = humanSheet(o, shiestyDef());
  saveSheet(k, s.frames, s.anims);
}
// the goon whose mask gets knocked off
const nm = humanSheet(shiestyOutfits.shiestyRed, Object.fromEntries(Object.entries(shiestyDef()).map(([k, v]) => [k, v.map((p) => ({ ...p, maskOff: true }))])));
saveSheet('shiestyNoMask', nm.frames, nm.anims);

for (const [k, o, d] of [['malik', malik, malikDef()], ['uncleT', uncleT, uncleTDef()], ['og', og, ogDef()]] as const) {
  const s = humanSheet(o, d);
  saveSheet(k, s.frames, s.anims);
}

const dog = W.dogFrames();
saveSheet('dog', dog.frames, dog.anims);
saveSheet('carMaroon', W.carFrames(hex('#7a2430'), hex('#521820'), { primer: true, seed: 1 }));
saveSheet('carSilver', W.carFrames(hex('#9aa0ac'), hex('#6a707c'), { seed: 2 }));
saveSheet('carBlue', W.carFrames(hex('#2c4c8a'), hex('#1e3462'), { primer: true, seed: 4 }));
saveSheet('carGold', W.carFrames(P.gold, P.goldDark, { gold: true, seed: 3 }));
saveSheet('canPickup', W.canPickup(), { glow: [0, 3] });
saveImage('bbq', W.bbqPlate());
saveImage('wings', W.wingsPlate());
saveSheet('trashCan', W.trashCan());
saveSheet('bottle', W.bottleProj(), { spin: [0, 3] });
saveImage('pothole', W.potholeDecal());
saveSheet('portal', W.puddlePortal(), { glow: [0, 3] });
saveSheet('spark', W.hitSpark(), { hit: [0, 2] });
saveSheet('dust', W.dust(), { puff: [0, 2] });
saveSheet('smoke', W.smoke(), { rise: [0, 3] });
saveImage('shadow', W.shadow());
saveImage('maskProp', W.maskProp());
saveImage('sweat', W.sweatDrop());
saveImage('smoker', W.smokerProp());
saveImage('picnic', W.picnicTable());
const hud = W.hudBits();
saveImage('hudCan', hud.can);
saveImage('hudCanEmpty', hud.canEmpty);
saveImage('btnPunch', W.touchButton('HIT', hex('#c8282e'), 24));
saveImage('btnJump', W.touchButton('JUMP', hex('#2c5aa8'), 20));
saveImage('btnSip', W.touchButton('SIP', hex('#e0a82e'), 20));
saveImage('btnFlex', W.touchButton('FLEX', hex('#6a3a9a'), 17));
saveImage('btnPause', W.touchButton('II', hex('#333344'), 10));
saveImage('stickBase', W.stickBase());
saveImage('stickKnob', W.stickKnob());
saveImage('logo', W.logo());
saveImage('bgSky', W.skyLayer());
saveImage('bgFar', W.farLayer());
saveImage('bgWall', W.wallLayer());
saveImage('bgGround', W.groundLayer());
saveImage('egypt', W.egyptFlash());

drawFont(P.white, P.ink).save(path.join(OUT, 'font.png'));
manifest.font = { file: 'font.png', frameWidth: CELL_W, frameHeight: CELL_H };

fs.writeFileSync(path.join(OUT, 'art.json'), JSON.stringify({ fontChars: FONT_CHARS, levelWidth: W.LEVEL_W, sprites: manifest }, null, 1));
console.log(`art: ${Object.keys(manifest).length} files written to ${OUT}`);
