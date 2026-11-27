// One input model for keyboard and touch. Game code only reads this.
// 'attack' is the brawler's punch and the fight's jab; hook/block/dodge/super are the fight mode's
export type Button = 'attack' | 'jump' | 'sip' | 'flex' | 'pause' | 'hook' | 'block' | 'dodge' | 'super';

class ControlsImpl {
  // analog move, -1..1
  moveX = 0;
  moveY = 0;
  touchActive = false;
  private kx = 0;
  private ky = 0;
  private tx = 0;
  private ty = 0;
  private down = new Set<Button>();
  private pressed = new Map<Button, number>(); // time of the press, for input buffering

  setKeys(x: number, y: number) { this.kx = x; this.ky = y; this.sync(); }
  setStick(x: number, y: number) { this.tx = x; this.ty = y; this.sync(); }
  private sync() {
    this.moveX = Math.max(-1, Math.min(1, this.kx + this.tx));
    this.moveY = Math.max(-1, Math.min(1, this.ky + this.ty));
  }

  press(b: Button) { if (!this.down.has(b)) this.pressed.set(b, performance.now()); this.down.add(b); }
  release(b: Button) { this.down.delete(b); }
  isDown(b: Button) { return this.down.has(b); }

  // Consume a press made within the last `bufferMs` (lets players mash ahead of the animation)
  consume(b: Button, bufferMs = 160): boolean {
    const t = this.pressed.get(b);
    if (t === undefined) return false;
    this.pressed.delete(b);
    return performance.now() - t <= bufferMs;
  }
  peek(b: Button, bufferMs = 160): boolean {
    const t = this.pressed.get(b);
    return t !== undefined && performance.now() - t <= bufferMs;
  }
  anyPressed(): boolean {
    const now = performance.now();
    for (const t of this.pressed.values()) if (now - t < 200) return true;
    return false;
  }
  clear() { this.pressed.clear(); this.down.clear(); this.tx = this.ty = this.kx = this.ky = 0; this.sync(); }
}

export const Controls = new ControlsImpl();
