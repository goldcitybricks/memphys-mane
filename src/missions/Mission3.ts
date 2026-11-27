import Phaser from 'phaser';
import { FightScene, CountPlan, RoundEnd, Speaker } from '../modes/fight/FightScene';
import { Fighter, Move, FLOOR_Y } from '../modes/fight/Fighter';
import { Pip, PipStyle } from '../modes/fight/Pip';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { px } from '../core/text';
import { MANE, PIP } from './lines';

// How Pip fights each round: he gets faster, adds the bottle flip and the crinkle, and in round 3
// O.G. refills him with DeNile so he hits harder.
const ROUNDS: PipStyle[] = [
  { gap: [0.9, 1.6], weights: { jab: 5, jab2: 3, hay: 2, cap: 2, taunt: 1 }, guard: 0.3, crinkle: 0, speed: 1, power: 1, daze: 1.2 },
  { gap: [0.8, 1.5], weights: { jab: 4, jab2: 3, hay: 2, cap: 2, flip: 2, taunt: 1 }, guard: 0.3, crinkle: 0.22, speed: 1.06, power: 1.05, daze: 1.0 },
  { gap: [0.6, 1.25], weights: { jab: 3, jab2: 2, jab3: 2, hay: 3, cap: 2, flip: 3, taunt: 1 }, guard: 0.35, crinkle: 0.3, speed: 1.16, power: 1.15, daze: 0.8 },
];
const ROUND_SECONDS = 75;

// Mission 3: FIGHT NIGHT. Mid-South Coliseum. MEMPHYS Mane vs Pip, the DeNile Water mascot. Three rounds.
export class Mission3 extends FightScene {
  private pip!: Pip;
  private arenaImg!: Phaser.GameObjects.Image;
  private spot!: Phaser.GameObjects.Image;
  private bulbs?: Phaser.Time.TimerEvent;

  constructor() { super('Mission3'); }

  buildArena() {
    this.missionId = 'm3-fight-night';
    this.arenaImg = this.add.image(this.midX, 0, 'arena').setOrigin(0.5, 0).setDepth(-100);
    this.spot = this.add.image(this.midX, 0, 'spotlight').setOrigin(0.5, 0).setScale(1.6, 1).setDepth(20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
    this.ref = this.add.sprite(this.midX + 120, FLOOR_Y - 8, 'ref').setOrigin(0.5, 61 / 64).setScale(2).setDepth(5).setFlipX(true).play('ref:idle');
    // flashbulbs going off in the crowd all night
    this.bulbs = this.time.addEvent({ loop: true, delay: 700, callback: () => { if (Math.random() < 0.7) this.bulb(); } });
  }

  makeFoe(): Fighter {
    this.pip = new Pip(this, this.homes().foe);
    return this.pip;
  }

  onResize() {
    super.onResize();
    this.arenaImg?.setX(this.midX);
    this.spot?.setX(this.midX);
  }

  foeCount(kd: number): CountPlan {
    // rounds 1 and 2 he beats the count and the round goes on; round 3 he's recycled
    if (this.round < 3) return { getUpAt: kd <= 1 ? 5 : 7 };
    return { getUpAt: null, lastWord: 'RECYCLED!' };
  }

  onWindup(f: Fighter, m: Move) {
    super.onWindup(f, m);
    if (f === this.pip && m.id === 'flip') this.tip('flip');
    if (f === this.player && m.id === 'oneTwo') this.tip('oneTwo');
  }

  private bulb(x?: number, y?: number, big = false) {
    const bx = x ?? Phaser.Math.Between(10, this.W - 10), by = y ?? Phaser.Math.Between(70, 140);
    const c = this.add.circle(bx, by, big ? 6 : 3, 0xffffff, 1).setDepth(-90).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, alpha: 0, scale: big ? 3 : 2, duration: big ? 400 : 250, onComplete: () => c.destroy() });
  }

  // a character standing on the apron or walking in the ring
  private extra(tex: string, x: number, y: number, flip = false) {
    return this.add.sprite(x, y, tex).setOrigin(0.5, 61 / 64).setScale(2).setDepth(y > FLOOR_Y + 4 ? 25 : 8).setFlipX(flip).play(`${tex}:idle`);
  }
  private walk(s: Phaser.GameObjects.Sprite, x: number, ms?: number) {
    const tex = s.texture.key;
    s.setFlipX(x < s.x);
    s.play(`${tex}:walk`, true);
    return this.tween({ targets: s, x, duration: ms ?? Math.max(200, Math.abs(x - s.x) * 9) }).then(() => s.play(`${tex}:idle`, true));
  }
  // fighters walk on their own x (render() puts the sprite there)
  private walkF(f: Fighter, x: number, ms?: number) {
    f.setState('scripted');
    f.play('walk', true);
    f.facing = x < f.x ? -1 : 1;
    return this.tween({ targets: f, x, duration: ms ?? Math.max(200, Math.abs(x - f.x) * 9) }).then(() => f.play('idle', true));
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    Audio.music(this, 'music_fight', 0.45);
    this.tip('start');
    this.pip.setStyle(ROUNDS[0]);
    let how: RoundEnd = await this.fightRound(1, ROUND_SECONDS);
    await this.corner(1, how);
    this.pip.setStyle(ROUNDS[1]);
    how = await this.fightRound(2, ROUND_SECONDS);
    await this.corner(2, how);
    this.pip.setStyle(ROUNDS[2]);
    this.pip.tint = 0xc8e8ff;
    // the final round has no clock: it ends when somebody gets recycled
    while ((how = await this.fightRound(3, null)) !== 'ko') { /* he can't get up in round 3 */ }
    await this.ending();
  }

  // ------------------------------------------------------------------ intro: Fight Night at the Coliseum
  private async intro() {
    this.startCutscene();
    const p = this.player, pip = this.pip;
    const h = this.homes();
    p.setState('scripted'); p.x = -80;
    pip.setState('scripted'); pip.z = 400; pip.sprite.setVisible(false);
    Audio.music(this, 'music_backdoor', 0.25);
    // establishing shot: the Coliseum from the street, then we go inside
    const ext = this.add.image(this.midX, 0, 'coliseumExt').setOrigin(0.5, 0).setDepth(5000);
    this.tweens.add({ targets: ext, scale: 1.05, y: -6, duration: 2600 });
    this.cameras.main.fadeIn(700, 0, 0, 0);
    await this.wait(1900);
    this.sfx('crowd', 0.5);
    await this.tween({ targets: ext, alpha: 0, duration: 450 });
    ext.destroy();
    if (!this.skipping) this.events.emit('banner', { top: 'MISSION 3', bottom: 'FIGHT NIGHT' });
    await this.wait(2000);
    await this.caption('', 'THAT SAME NIGHT. MID-SOUTH COLISEUM, RIGHT NEXT DOOR TO ORANGE MOUND.', 2800);
    await this.caption('', 'AETHERCORP IS LAUNCHING DENILE WATER WITH A FIGHT NIGHT. THEIR MASCOT WILL FIGHT ANYBODY.', 3400);

    // O.G. Drive-Out, the promoter, takes the mic
    const og = this.extra('ogFight', this.W + 30, FLOOR_Y, true);
    const ogS = this.speaker(og, 92);
    await this.walk(og, this.midX);
    og.setFlipX(false).play('ogFight:mic');
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 180, () => this.bulb());
    await this.line(ogS, 'LADIES AND GENTLEMEN! DENILE WATER PRESENTS... FIIIGHT NIIIIGHT!', 2600);
    this.sfx('crowd', 0.7);
    await this.line(ogS, 'IN THE BLUE CORNER... ZERO TASTE... ZERO MEMORY...', 2400);
    await this.line(ogS, 'PIIIIIP!', 1200);
    await this.walk(og, this.W - 18);
    og.setFlipX(true).play('ogFight:idle');

    // Pip drops into the spotlight
    pip.sprite.setVisible(true);
    pip.frame('tuck', 0);
    await this.tween({ targets: pip, z: 0, duration: 600, ease: 'Quad.easeIn' });
    pip.z = 0;
    this.sfx('land', 0.9); this.sfx('crinkle', 0.8);
    this.shake(200, 0.01);
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 120, () => this.bulb());
    pip.play('taunt', true);
    await this.line(pip, PIP.entrance, 2600);
    pip.play('idle', true);
    await this.line(ogS, 'I GOT EVERY DOLLAR I OWN ON THIS BOTTLE. WHO WANTS IT?', 2600);
    await this.wait(600);

    // Malik volunteers his friend
    const malik = this.extra('malik', -20, FLOOR_Y + 26);
    const mS = this.speaker(malik, 90);
    await this.walk(malik, this.midX - 160 < 20 ? 20 : this.midX - 160, 600);
    malik.setFlipX(false);
    await this.line(mS, 'HE DO!', 1100);
    // Mane springs over the ropes
    p.play('idle');
    p.facing = 1;
    if (!this.skipping) {
      this.sfx('jump', 0.7);
      await new Promise<void>((r) => {
        this.tweens.addCounter({
          from: 0, to: 1, duration: 650, onUpdate: (tw) => { const k = tw.getValue() ?? 0; p.x = -60 + (h.mane + 60) * k; p.z = Math.sin(k * Math.PI) * 90; p.sprite.setAngle(k * 360); },
          onComplete: () => { p.z = 0; p.sprite.setAngle(0); r(); },
        });
      });
      this.sfx('land', 0.8);
      this.shake(120, 0.005);
    }
    p.x = h.mane; p.z = 0; p.sprite.setAngle(0);
    p.play('taunt', true);
    this.sfx('crowd', 0.8);
    await this.line(p, MANE.start, 1800);
    p.play('idle');
    await this.line(ogS, 'THE LIL CAN FROM THE ALLEY? ...BET.', 2000);
    pip.play('taunt', true);
    await this.line(pip, 'LOOK AT YOU. A SODA IN SHORTS.', 2000);
    pip.play('idle');
    await this.line(p, MANE.trashTalkReply, 1600);
    p.play('taunt', true);
    await this.line(p, MANE.vsPip, 2200);
    this.sfx('ooh', 0.7);
    p.play('idle');

    // the ref's instructions
    const ref = this.ref!;
    await this.walk(ref, this.midX);
    ref.play('ref:fight');
    await this.line(this.speaker(ref, 92), 'KEEP IT CLEAN. NO CAPS, NO CANS. TOUCH GLOVES.', 2400);
    await this.line(pip, 'NAH.', 900);
    await this.walk(ref, this.midX + 120);
    ref.setFlipX(true);

    // make sure everything is in place, skipped or not
    og.destroy(); malik.destroy();
    pip.sprite.setVisible(true); pip.z = 0; pip.x = h.foe; pip.facing = -1;
    p.x = h.mane; p.facing = 1; p.sprite.setAngle(0);
    ref.setPosition(this.midX + 120, FLOOR_Y - 8).play('ref:idle');
    this.endCutscene();
  }

  // ------------------------------------------------------------------ between rounds
  private async corner(n: number, how: RoundEnd) {
    await this.settle();
    this.startCutscene();
    const p = this.player, pip = this.pip;
    if (pip.hp < pip.maxHp) pip.hp = Math.min(pip.maxHp, pip.hp + 15);
    await Promise.all([this.walkF(p, this.midX - 110), this.walkF(pip, this.midX + 110)]);
    p.facing = 1; pip.facing = -1;

    // Pothole carries the round card across the ring
    await this.roundCard(n + 1);

    // Malik in Mane's corner with a cold one
    const malik = this.extra('malik', this.midX - 176 < 18 ? 18 : this.midX - 176, FLOOR_Y + 26);
    const mS = this.speaker(malik, 90);
    malik.play('malik:sip');
    p.play('sip', true);
    this.sfx('sip', 0.8);
    const heal = 35;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    this.sips++;
    this.toast('MEMPHYS! +HEALTH');
    this.events.emit('hud');
    await this.wait(900);
    malik.play('malik:idle');
    if (n === 1) {
      await this.line(mS, 'HE WINDS UP ON THAT BIG ONE. DODGE IT AND HE WIDE OPEN!', 2600);
      await this.line(p, 'I SEEN IT.', 1200);
    } else {
      await this.line(mS, 'MEMPHIS, REMEMBER!', 1600);
      await this.line(p, 'LAST ROUND, PIP. IT\'S RECYCLING DAY.', 2200);
    }
    p.play('idle');

    // O.G. in Pip's corner
    const og = this.extra('ogFight', this.midX + 176 > this.W - 18 ? this.W - 18 : this.midX + 176, FLOOR_Y + 26, true);
    const ogS = this.speaker(og, 92);
    if (n === 1) {
      await this.line(ogS, 'QUIT PLAYIN\' WITH HIM. FLIP ON HIM.', 2200);
      pip.play('taunt', true);
      await this.line(pip, 'BOTTLE FLIP TIME, BABY.', 1800);
    } else {
      // the DeNile refill
      og.play('ogFight:pour');
      this.sfx('splash', 0.7);
      await this.wait(500);
      pip.play('refill', true);
      this.sfx('crinkle', 0.9);
      this.shake(150, 0.004);
      await this.line(pip, PIP.refill, 2400);
      await this.line(p, MANE.twist, 1200);
    }
    og.destroy(); malik.destroy();
    pip.play('idle');
    const h = this.homes();
    await Promise.all([this.walkF(p, h.mane, 500), this.walkF(pip, h.foe, 500)]);
    p.x = h.mane; pip.x = h.foe; p.facing = 1; pip.facing = -1;
    p.toIdle(); pip.toIdle();
    this.endCutscene();
  }

  private async roundCard(n: number) {
    if (this.skipping) return;
    const dog = this.add.sprite(-40, FLOOR_Y + 14, 'dog').setOrigin(0.5, 29 / 32).setScale(2).setDepth(26).play('dog:run');
    const card = this.add.container(0, 0).setDepth(27);
    card.add(this.add.rectangle(0, 0, 54, 26, 0xffffff).setStrokeStyle(2, COLORS.ink));
    card.add(px(this, 0, -8, 'ROUND', COLORS.red).setOrigin(0.5, 0));
    card.add(px(this, 0, 2, String(n), COLORS.ink).setOrigin(0.5, 0));
    card.add(this.add.rectangle(10, 17, 2, 10, 0x6b4a2e));
    const follow = () => card.setPosition(dog.x + 14, dog.y - 62);
    follow();
    this.sfx('bark', 0.6);
    this.sfx('crowd', 0.5);
    await this.tween({ targets: dog, x: this.W + 40, duration: 2600, onUpdate: follow });
    dog.destroy(); card.destroy();
  }

  // ------------------------------------------------------------------ the knockout photo (the oooh)
  async beforeCount(f: Fighter, plan: CountPlan) {
    if (f !== this.pip || plan.getUpAt !== null) return;
    Audio.stopMusic();
    await this.wait(900);
    const p = this.player, pip = this.pip;
    this.events.emit('cutscene', true);
    // Mane stands over him, just like the poster: Pip flat in front, Mane behind him
    this.refTo(this.midX, true);
    p.setState('scripted');
    pip.setState('scripted');
    pip.x = Phaser.Math.Clamp(pip.x, this.midX - 40, this.midX + 90);
    pip.z = -12;
    pip.sprite.setDepth(12);
    p.x = pip.x - 34; p.facing = 1;
    p.play('standOver', true);
    const cam = this.cameras.main;
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(30);
    layer.add(this.add.rectangle(0, 0, W, 216, 0x8a5a20, 0.32).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY));
    layer.add(this.add.rectangle(0, 0, W, 216, 0xffe0a0, 0.08).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD));
    for (const [x, y, w, hh] of [[0, 0, W, 18], [0, 198, W, 18], [0, 0, 22, 216], [W - 22, 0, 22, 216]]) layer.add(this.add.rectangle(x, y, w, hh, 0x000000, 0.55).setOrigin(0));
    cam.pan((p.x + pip.x) / 2 + 4, 128, 500, 'Sine.easeInOut');
    cam.zoomTo(1.35, 500, 'Sine.easeInOut');
    this.sfx('ooh', 0.8);
    for (let i = 0; i < 9; i++) {
      this.time.delayedCall(300 + i * 260 + Math.random() * 120, () => {
        this.sfx('flash', 0.6);
        this.bulb(undefined, undefined, true);
        if (i % 3 === 0) cam.flash(90, 255, 255, 255);
      });
    }
    this.time.delayedCall(1200, () => p.play('standOver', true));
    await this.wait(3400);
    cam.zoomTo(1, 400, 'Sine.easeInOut');
    cam.pan(W / 2, 108, 400, 'Sine.easeInOut');
    await this.wait(420);
    layer.destroy();
    cam.setScroll(0, 0);
    p.x = this.homes().mane - 20;
    p.play('idle');
    pip.z = 0; pip.setState('down');
    this.events.emit('cutscene', false);
  }

  // ------------------------------------------------------------------ ending: recycled, O.G. pays up, the tanker tip
  private async ending() {
    this.startCutscene();
    const p = this.player, pip = this.pip;
    const ref = this.ref!;
    const refS = this.speaker(ref, 92);
    this.sfx('crowd', 0.9);
    ref.play('ref:wave');
    await this.wait(900);

    // into the recycling bin
    const binX = Math.min(this.W - 26, pip.x + 80);
    const bin = this.add.image(binX, FLOOR_Y + 2, 'recycleBin').setOrigin(0.5, 1).setScale(2).setDepth(14);
    bin.setY(FLOOR_Y + 80);
    await this.tween({ targets: bin, y: FLOOR_Y + 2, duration: 300, ease: 'Back.easeOut' });
    await this.walk(ref, pip.x + 30);
    ref.setFlipX(true).play('ref:lift');
    pip.setState('scripted');
    await this.wait(300);
    this.sfx('throw', 0.7);
    const x0 = pip.x;
    await new Promise<void>((r) => {
      if (this.skipping) { r(); return; }
      this.tweens.addCounter({
        from: 0, to: 1, duration: 800, onUpdate: (tw) => { const k = tw.getValue() ?? 0; pip.x = x0 + (binX - x0) * k; pip.z = Math.sin(k * Math.PI) * 70 + (1 - k) * 0 - k * 10; pip.sprite.setAngle(k * 270); },
        onComplete: () => r(),
      });
    });
    pip.sprite.setVisible(false);
    this.sfx('bottle', 0.9); this.sfx('crash', 0.5);
    this.tween({ targets: bin, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 3 }).then(() => bin.setAngle(0));
    ref.play('ref:idle');
    await this.line(refS, 'THAT\'S ONE USE.', 1600);
    await this.line(this.speaker(bin, 70), '...WHERE AM I? WHO AM I?', 2000);
    this.sfx('crowd', 0.8);
    await this.walk(ref, this.W + 40);

    // the crowd goes up, Malik climbs in
    const malik = this.extra('malik', -20, FLOOR_Y + 26);
    await this.walk(malik, Math.max(20, this.midX - 160), 600);
    await this.line(this.speaker(malik, 90), 'MEMPHIS, REMEMBER!', 1600);
    this.sfx('crowd', 0.8);

    // O.G. pays up
    p.setState('scripted');
    p.x = this.homes().mane; p.facing = 1; p.play('idle');
    const og = this.extra('ogFight', this.W + 30, FLOOR_Y, true);
    const ogS = this.speaker(og, 92);
    await this.walk(og, this.midX + 40);
    og.setFlipX(true).play('ogFight:tip');
    await this.line(ogS, 'AIGHT. AIGHT. A BET\'S A BET.', 2000);
    this.cashRain();
    this.addScore(500);
    this.toast('O.G. PAYS UP! +500');
    await this.wait(900);
    og.play('ogFight:idle');
    await this.line(ogS, 'AND SINCE YOU REAL WITH IT... AETHERCORP RUNNIN\' TANKERS FULL OF Y\'ALL WATER ACROSS THE BRIDGE TO ARKANSAS.', 3600);
    await this.line(ogS, 'TONIGHT.', 1200);
    await this.line(p, MANE.twist, 1200);
    await this.line(this.speaker(malik, 90), 'THEY STEALIN\' THE AQUIFER?!', 1800);
    await this.line(p, 'NOT ON MY WATCH. WE RIDIN\' TO THE BRIDGE.', 2200);
    Audio.music(this, 'music_victory', 0.6, false);
    p.play('victory', true);
    this.sfx('shine', 0.7);
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 150, () => this.bulb());
    await this.line(p, MANE.victory, 2400);
    await this.caption('', 'NEXT: THE BRIDGE RUN.', 2200);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    this.bulbs?.remove();
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }

  private cashRain() {
    for (let i = 0; i < 18; i++) {
      const c = this.add.image(Phaser.Math.Between(this.midX - 120, this.midX + 120), -10 - i * 8, 'cash').setScale(2).setDepth(40);
      this.tweens.add({ targets: c, y: FLOOR_Y - Phaser.Math.Between(0, 10), angle: Phaser.Math.Between(-200, 200), duration: 900 + i * 40, ease: 'Quad.easeIn', onComplete: () => { if (i % 4 === 0) this.sfx('pickup', 0.3); this.tweens.add({ targets: c, alpha: 0, delay: 1400, duration: 400, onComplete: () => c.destroy() }); } });
    }
  }
}

export type { Speaker };
