import Phaser from 'phaser';

// Pixel text. The font is uppercase; lowercase input is upper-cased.
export function px(scene: Phaser.Scene, x: number, y: number, s: string, tint = 0xffffff, scale = 1) {
  const t = scene.add.bitmapText(x, y, 'px', s.toUpperCase()).setLetterSpacing(-1).setScale(scale);
  if (tint !== 0xffffff) t.setTint(tint);
  return t;
}

// Word-wrap by characters (the font is fixed width: 6px advance)
export function wrap(s: string, maxChars: number): string {
  const words = s.toUpperCase().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join('\n');
}
