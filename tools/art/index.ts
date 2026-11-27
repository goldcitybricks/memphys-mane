// Generates every first-pass PNG into public/assets/art plus art.json (frame sizes + animation ranges).
// To swap in final hand-drawn art: replace the PNG with the same frame size and frame order.
import fs from 'node:fs';
import path from 'node:path';
import { Pix, sheet, hex } from './pix';
import { maneFrames, manePortraits } from './mane';
import { humanSheet, shiestyDef, shiestyOutfits, malik, malikDef, uncleT, uncleTDef, og, ogDef,
  jackalOutfits, jackalDef, jackalCaptain, jackalCaptainDef, nia, niaDef, vendor, vendorDef, king, kingDef, priest, priestDef, glowFrames } from './human';
import * as W from './world';
import * as E from './egypt';
import * as F from './fight';
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
saveSheet('carAltimaGrey', W.carFrames(hex('#5f636b'), hex('#3e4148'), { model: 'altima', donut: true, seed: 1 }));
saveSheet('carInfiniti', W.carFrames(hex('#b8bcc4'), hex('#7e828c'), { model: 'infiniti', seed: 2 }));
saveSheet('carAltimaBlack', W.carFrames(hex('#2a2c34'), hex('#16171c'), { model: 'altima', seed: 4 }));
saveSheet('carGold', W.carFrames(P.gold, P.goldDark, { model: 'infiniti', gold: true, seed: 3 }));
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

// ------------------------------------------------------------------ Mission 2: Old Memphis
for (const [k, w] of [['jackalSpear', 'spear'], ['jackalBlade', 'khopesh'], ['jackalPot', 'pot']] as const) {
  const s = humanSheet(jackalOutfits[k], jackalDef(w));
  saveSheet(k, s.frames, s.anims);
}
{
  const s = humanSheet(jackalCaptain, jackalCaptainDef());
  saveSheet('jackalCaptain', s.frames, s.anims);
  const n = humanSheet(nia, niaDef());
  saveSheet('nia', glowFrames(n.frames), n.anims);
  for (const [k, o, d] of [['vendor', vendor, vendorDef()], ['king', king, kingDef()], ['priest', priest, priestDef()]] as const) {
    const h = humanSheet(o, d);
    saveSheet(k, h.frames, h.anims);
  }
}
saveImage('bgSky2', E.skyLayer2());
saveImage('bgFar2', E.farLayer2());
saveImage('bgWall2', E.wallLayer2());
saveImage('bgGround2', E.groundLayer2());
saveSheet('pool', E.poolFrames(), { glow: [0, 3] });
saveImage('mudPit', E.mudPit());
saveSheet('urn', E.urnFrames());
saveImage('bench', E.marketBench());
saveImage('stall', E.stallProp());
saveSheet('torch', E.torchFrames(), { flicker: [0, 3] });
saveSheet('pot', E.potProj(), { spin: [0, 3] });
saveImage('bread', E.breadPlate());
saveImage('dates', E.datesBowl());
saveImage('grillProp', E.grillProp());
saveSheet('jar', E.jarFrames());
saveSheet('chariot', E.chariotFrames());
saveImage('memoryHall', E.memoryHall());
saveImage('panOld', E.panOld());
saveImage('panNew', E.panNew());

// ------------------------------------------------------------------ Mission 3: Fight Night
{
  const mb = F.maneBoxFrames();
  saveSheet('maneBox', mb.frames, mb.anims);
  const pip = F.pipFrames();
  saveSheet('pip', pip.frames, pip.anims);
  saveSheet('pipPortrait', F.pipPortrait());
  const r = humanSheet(F.ref, F.refDef());
  saveSheet('ref', r.frames, r.anims);
  const og2 = humanSheet(og, { ...ogDef(), mic: [{ fa: [6, -6], fHand: 'mic', ba: [0, 10], ff: [2, 0], bf: [-3, 0] }, { fa: [7, -8], fHand: 'mic', ba: [8, -4], bHand: 'open', ff: [2, 0], bf: [-3, 0], face: 'smile' }], pour: [{ fa: [10, -10], fHand: 'jug', ba: [0, 10], ff: [2, 0], bf: [-3, 0] }] });
  saveSheet('ogFight', og2.frames, og2.anims);
}
saveImage('arena', F.arena());
saveImage('spotlight', F.spotlight());
saveSheet('capShot', F.capProj(), { spin: [0, 3] });
saveImage('recycleBin', F.recycleBin());
saveImage('cash', F.cashProp());
saveImage('btnJab', W.touchButton('JAB', hex('#c8282e'), 24));
saveImage('btnHook', W.touchButton('HOOK', hex('#d8641e'), 22));
saveImage('btnBlock', W.touchButton('BLOCK', hex('#2c5aa8'), 24));
saveImage('btnDodge', W.touchButton('DODGE', hex('#1f8a8a'), 22));
saveImage('btnSuper', W.touchButton('SUPER', hex('#e0a82e'), 20));

drawFont(P.white, P.ink).save(path.join(OUT, 'font.png'));
manifest.font = { file: 'font.png', frameWidth: CELL_W, frameHeight: CELL_H };

fs.writeFileSync(path.join(OUT, 'art.json'), JSON.stringify({ fontChars: FONT_CHARS, levelWidth: W.LEVEL_W, sprites: manifest }, null, 1));
console.log(`art: ${Object.keys(manifest).length} files written to ${OUT}`);
