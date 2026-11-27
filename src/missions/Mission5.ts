import Phaser from 'phaser';
import { ShooterScene, Ent, Speaker } from '../modes/shooter/ShooterScene';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { MANE, GIGAZ, DRIFTER_TALK, FOREMAN, AQUIFER_FACT } from './lines';

// The plant, in map cells (x right, y down). Four rooms, left to right and down:
// the loading dock, the bottling hall, Line 2 (where the Pips come off the line), and the Foreman's capping floor.
const DOCK = [1, 2, 10, 12] as const;
const HALL = [12, 1, 29, 13] as const;
const LINE2 = [12, 15, 29, 28] as const;
const BOSS = [31, 15, 38, 28] as const;
const GATE = 10; // Drifters to hydrate before the door to Line 2 opens
const BOSS_HP = 14;
const RAIL = [16.6, 27.4] as const; // the Foreman slides along the back wall

// Mission 5: THE PLANT. First person, Chex Quest style, inside the DeNile Water plant on Presidents Island.
// Mane's weapon is the Hydrator. The Drifters are workers who drank DeNile and forgot themselves: one splash and they snap back.
export class Mission5 extends ShooterScene {
  capShadow?: number; // 0..1 while the Foreman's cap comes down over Mane (the HUD draws it)
  private gateOpen = false;
  private pipPhase = false;
  private bossOn = false;
  private finale = false;
  private saidArmor = false;
  private saidHatch = false;
  private phase2 = false;
  private drop: { x: number; y: number; t: number; total: number } | null = null;
  constructor() { super('Mission5'); }

  // ------------------------------------------------------------------ the map
  buildMap() {
    this.missionId = 'm5-the-plant';
    this.gateOpen = false; this.pipPhase = false; this.bossOn = false; this.finale = false;
    this.saidArmor = false; this.saidHatch = false; this.phase2 = false; this.drop = null; this.capShadow = undefined;
    this.grid(42, 30, '#');
    // the loading dock: concrete, roll-up doors on the river side
    this.room(...DOCK);
    for (const y of [4, 7, 10]) this.put(0, y, 'R');
    this.put(5, 1, 'N'); this.put(8, 1, 'P');
    this.put(11, 7, 'D');
    // the bottling hall: DeNile blue tile, two belts, the signs on the north wall, windows onto Line 2
    this.room(...HALL);
    for (let x = 12; x <= 29; x++) { this.put(x, 0, 'B'); this.put(x, 14, 'B'); }
    for (let y = 1; y <= 13; y++) this.put(30, y, 'B');
    this.put(14, 0, 'P'); this.put(18, 0, 'A'); this.put(22, 0, 'P'); this.put(26, 0, 'S'); this.put(30, 7, 'G');
    for (const x of [14, 15, 24, 25]) this.put(x, 14, 'W');
    this.put(20, 14, 'L');
    for (let x = 14; x <= 27; x++) { this.put(x, 4, '>'); this.put(x, 10, '<'); }
    for (const [x, y] of [[17, 7], [18, 7], [24, 6], [25, 12], [13, 11]]) this.put(x, y, '~');
    // Line 2: pipes and hazard walls, three belts, GigaZ on the back wall
    this.room(...LINE2);
    for (let y = 15; y <= 28; y++) { this.put(11, y, 'H'); this.put(30, y, 'H'); }
    for (let x = 12; x <= 29; x++) this.put(x, 29, 'p');
    for (const x of [16, 20, 24]) this.put(x, 29, 'G');
    for (let x = 13; x <= 28; x++) { this.put(x, 18, '>'); this.put(x, 22, '<'); this.put(x, 26, '>'); }
    this.put(30, 22, 'M');
    // the capping floor
    this.room(...BOSS);
    for (let y = 15; y <= 28; y++) this.put(39, y, 'H');
    for (let x = 31; x <= 38; x++) { this.put(x, 14, 'H'); this.put(x, 29, 'H'); }
    this.put(39, 18, 'G'); this.put(39, 25, 'G');
    for (let y = 16; y <= 27; y++) this.put(38, y, 'h');
    for (const [x, y] of [[32, 17], [32, 26], [35, 21]]) this.put(x, y, 'o');

    // dock: crates and pallets (solid: Mane walks around them), the fact card tucked in the corner
    this.prop(1.5, 11.3, 'crate', 0.48, 0.36);
    this.prop(2.7, 12.4, 'crate', 0.48, 0.36);
    this.prop(2.0, 3.0, 'crate', 0.48, 0.36);
    this.prop(6.5, 4.0, 'pallet', 0.56, 0.4);
    this.prop(8.6, 4.2, 'pallet', 0.56, 0.4);
    this.prop(7.5, 10.6, 'pallet', 0.56, 0.4);
    this.prop(9.6, 10.8, 'crate', 0.48, 0.36);
    this.pickup(1.5, 12.5, 'fact');
    this.pickup(9.5, 2.6, 'can');
    this.pickup(5.5, 12.4, 'wings');
    // hall: intake pipes floor to ceiling, pallets
    for (const x of [16.5, 22.5, 27.5]) this.prop(x, 7.5, 'pillar', 1, 0.22);
    this.prop(13.0, 2.0, 'pallet', 0.56, 0.4);
    this.prop(28.8, 12.6, 'pallet', 0.56, 0.4);
    this.prop(20.5, 12.4, 'crate', 0.48, 0.36);
    this.pickup(29.0, 2.0, 'can');
    this.pickup(19.5, 7.5, 'bbq');
    this.pickup(12.6, 12.6, 'can');
    // Line 2: pickups along the walls
    this.pickup(12.5, 20.5, 'bbq');
    this.pickup(28.5, 16.0, 'can');
    this.pickup(12.5, 28.0, 'wings');
    this.pickup(28.5, 28.0, 'can');
    for (const [x, y] of [[13.2, 24.2], [28.8, 20.2]]) this.prop(x, y, 'crate', 0.48, 0.36);
    // the boss floor
    this.pickup(31.6, 15.6, 'can');
    this.pickup(31.6, 28.4, 'can');
    this.pickup(34.5, 15.6, 'bbq');
    this.pickup(34.5, 28.4, 'wings');
    for (const [x, y] of [[33.6, 18.5], [33.6, 24.5]]) this.prop(x, y, 'pillar', 1, 0.22);

    // the Drifters: four in the dock, nine in the hall
    const dr: [number, number][] = [[6.5, 7.5], [8.5, 6.0], [4.5, 9.5], [9.0, 8.5], [14.5, 7.0], [19.5, 2.5], [24.5, 8.0], [26.5, 2.5], [21.0, 11.5], [15.0, 12.0], [28.0, 9.0], [18.5, 9.0], [25.5, 12.5]];
    dr.forEach(([x, y], i) => this.drifter(x, y, i));
    // the Pip army, standing on the belts, switched off
    for (const y of [18.5, 22.5, 26.5]) for (const x of [14.5, 17.5, 20.5, 23.5, 26.5]) this.pip(x + (y === 22.5 ? 1 : 0), y, false);
    // and more coming down the belts, still switched off (scenery: the line never stops)
    for (const [y, dir] of [[18.5, 1], [22.5, -1], [26.5, 1]] as const) for (let x = 13.3; x < 28.8; x += 1.05) {
      this.ent('deco', x, y + (Math.random() - 0.5) * 0.15, 'pipMini', { h: 0.4, data: { belt: dir } });
    }
    // work lights
    for (const [x, y] of [[4, 5], [8, 9], [15, 5.5], [21, 3], [21, 9], [26, 5.5], [16, 20], [22, 24], [27, 20], [34.5, 19], [34.5, 24]]) this.deco(x + 0.5, y + 0.5, 'lamp', 0.36, 1 - 0.36);
    // the Foreman, waiting at the back of the capping floor
    this.boss = this.ent('boss', 37.3, 21.5, 'foreman', { h: 1.7, r: 0.9, solid: true, hp: BOSS_HP, state: 'sleep', data: { maxHp: BOSS_HP, cycle: 0 } });

    this.px = 2.5; this.py = 7.5; this.pa = 0;
    this.checkpoint = { x: 2.5, y: 7.5, a: 0 };
  }

  update(t: number, dms: number) {
    super.update(t, dms);
    if (this.paused || this.frozen) return;
    // the belts on Line 2 keep carrying fresh bottles along
    const dt = Math.min(dms, 50) / 1000;
    for (const e of this.ents) if (e.data?.belt) { e.x += e.data.belt * 1.3 * dt; if (e.x > 28.9) e.x -= 15.6; if (e.x < 13.3) e.x += 15.6; }
  }

  drifterLine(e: Ent) {
    // each Drifter is stuck on a loop
    const i = Math.floor(e.homeX * 7 + e.homeY * 3);
    return DRIFTER_TALK[i % DRIFTER_TALK.length];
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    this.playing = true;
    this.showWeaponInCutscene = true;
    Audio.music(this, 'music_plant', 0.42);
    this.say(this.maneSpeaker(), MANE.start, 1600);
    this.time.delayedCall(900, () => this.tip('start'));
    this.goal();

    // the hall
    await this.waitUntil(() => this.inArea(...HALL));
    this.checkpoint = { x: 12.6, y: 7.5, a: 0 };
    this.say(this.radioSpeaker(), 'THAT\'S THE BOTTLIN\' HALL. CAREFUL ON THEM BELTS.', 2600);
    this.signLines();
    await this.waitUntil(() => this.kos >= GATE);
    this.gateOpen = true;
    this.unlock('L');
    this.goal();
    this.banner('DOOR OPEN', 'LINE 2');
    this.time.delayedCall(1500, () => this.say(this.radioSpeaker(), 'A DOOR JUST OPENED! SOUTH WALL, THE ONE THAT SAY LINE 2.', 2800));

    // Line 2: the Pip army
    await this.waitUntil(() => this.py > 15.25 && this.inArea(...LINE2));
    await this.reveal();
    this.checkpoint = { x: 20.5, y: 15.6, a: Math.PI / 2 };
    await this.waitUntil(() => this.pipsLeft() === 0);
    this.pipPhase = false;
    this.unlock('M');
    this.goal();
    this.say(this.radioSpeaker(), 'ALL THEM BOTTLES RECYCLED? GO! EAST DOOR!', 2400);

    // the Foreman
    await this.waitUntil(() => this.px > 31.2 && this.inArea(...BOSS));
    await this.foremanIntro();
    await this.waitUntil(() => this.finale);
  }

  private goal() {
    let s = '';
    if (!this.gateOpen) s = `HYDRATE DRIFTERS ${Math.min(this.kos, GATE)}/${GATE}`;
    else if (this.pipPhase) s = `PIPS LEFT ${this.pipsLeft()}`;
    else if (!this.bossOn && !this.finale) s = this.pipsLeft() === 15 ? 'GET TO LINE 2' : 'GET TO THE CAPPING FLOOR';
    this.events.emit('goal', s);
  }
  private pipsLeft() { return this.ents.filter((e) => e.kind === 'pip' && e.state !== 'crush').length; }

  // the signs on the hall's north wall get a line when you walk up to them
  private async signLines() {
    const near = (x: number) => () => this.playing && Math.abs(this.px - (x + 0.5)) < 2.2 && this.py < 3.6 && this.py > 1;
    const a = this.waitUntil(near(18)).then(() => this.say(this.radioSpeaker(), 'THAT SIGN SAY A HUNDRED TRILLION GALLONS DOWN THERE. AND THEY STILL WANT ALL OF IT.', 3600));
    const b = this.waitUntil(near(26)).then(() => this.say(this.maneSpeaker(), 'THIS WATER BEEN FILTERIN\' THROUGH SAND 2,000 YEARS. AND THEY "REMOVIN\'" IT?', 3200));
    await Promise.all([a, b]);
  }

  onDrifterSaved(_e: Ent) {
    if (this.kos === 1) this.time.delayedCall(2400, () => this.say(this.maneSpeaker(), 'REAL ONES STAY PURE.', 1600));
    else if (this.kos === 5) this.time.delayedCall(2400, () => this.say(this.radioSpeaker(), 'MANE, PEOPLE COMIN\' OUT THE DOCK DOORS ASKIN\' WHERE THEY CAR AT.', 2800));
    this.goal();
  }

  onPickup(e: Ent) {
    if (e.pick !== 'fact') return;
    this.addScore(500);
    this.sfx('portal', 0.6);
    this.toast('AQUIFER FACT CARD! +500');
    this.events.emit('fact', 'AQUIFER FACT CARD', AQUIFER_FACT);
  }

  onPipDown(_e: Ent) {
    this.goal();
    this.wakeMore();
  }
  // the army comes at you a few at a time
  private wakeMore() {
    if (!this.pipPhase) return;
    const awake = this.ents.filter((e) => e.kind === 'pip' && (e.state === 'hop' || e.state === 'shoot' || e.state === 'hurt')).length;
    if (awake >= 3) return;
    const off = this.ents.filter((e) => e.kind === 'pip' && e.state === 'off').sort((a, b) => this.dist(a) - this.dist(b));
    off.slice(0, 4).forEach((e, i) => this.time.delayedCall(i * 250, () => { this.wakePip(e); if (i === 0) this.say(this.entSpeaker(e), this.pipLine(), 1300); }));
  }

  onContinue() {
    this.drop = null; this.capShadow = undefined;
    if (this.bossOn && this.boss) { this.boss.state = 'idle'; this.boss.t = 2.5; this.boss.cd = 1.5; }
  }

  // ------------------------------------------------------------------ intro: Presidents Island at night, the Hydrator, the first Drifter
  private async intro() {
    this.startCutscene();
    this.frozen = true;
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const back = this.add.image(W / 2, 0, 'plantExt').setOrigin(0.5, 0);
    layer.add(back);
    const carX = W / 2 - 120;
    const car = this.add.sprite(-120, 200, 'bigBlueSide', 0).setOrigin(0.5, 1);
    const mane = this.add.sprite(carX + 30, 196, 'mane').setOrigin(0.5, 61 / 64).setVisible(false);
    const malik = this.add.sprite(carX + 10, 198, 'malik').setOrigin(0.5, 61 / 64).setVisible(false);
    const earl = this.add.sprite(W / 2 + 40, 186, 'drifterA', 0).setOrigin(0.5, 1).play('drifterA:walk');
    layer.add([earl, car, malik, mane]);
    const meS = this.speaker(mane, 48), mS = this.speaker(malik, 50), eS = this.speaker(earl, 60);
    this.tweens.add({ targets: earl, x: W / 2 + 70, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    Audio.music(this, 'music_backdoor', 0.25);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    // Big Blue rolls up to the gate
    this.sfx('carBy', 0.6);
    car.play('bigBlueSide:roll');
    await this.tween({ targets: car, x: carX, duration: 1400, ease: 'Quad.easeOut' });
    car.stop(); car.setFrame(0);
    this.banner('MISSION 5', 'THE PLANT');
    await this.wait(2000);
    await this.caption('', 'PRESIDENTS ISLAND. THE DENILE WATER PLANT RUNS ALL NIGHT.', 2600);
    // out they hop
    mane.setVisible(true).setPosition(carX + 20, 190).play('mane:jump');
    malik.setVisible(true).setPosition(carX - 6, 198).play('malik:idle');
    this.sfx('jump', 0.5);
    await this.tween({ targets: mane, x: carX + 52, y: 196, duration: 400, ease: 'Quad.easeOut' });
    mane.play('mane:idle');
    malik.play('malik:walk');
    await this.tween({ targets: malik, x: carX + 26, duration: 500 });
    malik.play('malik:idle');
    await this.line(mS, 'THE TAG SAID THEY BOTTLIN\' IT RIGHT HERE.', 2200);
    await this.line(meS, 'OUR WATER. IN PLASTIC. MANE, WHAT?!', 2000);
    // a worker shuffles up to the fence
    this.tweens.killTweensOf(earl);
    await this.tween({ targets: earl, x: carX + 100, duration: 1200 });
    earl.stop(); earl.setFrame(9);
    await this.line(eS, DRIFTER_TALK[0], 3000);
    malik.play('malik:scared');
    await this.line(mS, 'THAT\'S MR. EARL. HE WORK HERE. HE DON\'T EVEN KNOW WHERE HE AT.', 2800);
    malik.play('malik:idle');
    await this.line(mS, 'UNCLE T SENT YOU SOMETHIN\'.', 1600);
    // the Hydrator, tossed over
    this.sfx('throw', 0.6);
    const gun = this.add.image(malik.x, malik.y - 40, 'hydrator', 0).setScale(0.3);
    layer.add(gun);
    await this.tween({ targets: gun, x: mane.x + 8, y: mane.y - 26, angle: 360, duration: 500 });
    this.sfx('pickup', 0.6);
    mane.play('mane:shine');
    this.sfx('shine', 0.5);
    await this.line(mS, 'THE HYDRATOR. ONE SPLASH OF THE REAL THING AND THEY SNAP BACK.', 2600);
    await this.line(meS, 'A WATER GUN?', 1300);
    await this.line(mS, 'UNCLE T SAY THIS WATER FELL AS RAIN OVER 2,000 YEARS AGO. IT REMEMBERS, EVEN WHEN PEOPLE DON\'T.', 3600);
    // one splash
    mane.play('mane:punch1');
    this.sfx('spray', 0.7);
    const g = this.add.graphics();
    layer.add(g);
    if (!this.skipping) {
      await new Promise<void>((r) => this.tweens.addCounter({
        from: 0, to: 1, duration: 300,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          g.clear();
          const x0 = mane.x + 16, y0 = mane.y - 26, x1 = Phaser.Math.Linear(x0, earl.x, k), y1 = Phaser.Math.Linear(y0, earl.y - 46, k) - Math.sin(k * Math.PI) * 10;
          g.lineStyle(3, 0x7fd8ff, 0.9).lineBetween(x0, y0, x1, y1);
          g.fillStyle(0xdff6ff).fillCircle(x1, y1, 3);
        },
        onComplete: () => r(),
      }));
    }
    g.destroy(); gun.destroy();
    this.sfx('hydrate', 0.8);
    earl.setFrame(6);
    await this.wait(700);
    earl.play('drifterA:back');
    await this.line(eS, '...WHERE MY CAR?', 1800);
    malik.play('malik:idle');
    await this.line(mS, 'IT WORK!', 1100);
    mane.play('mane:idle');
    await this.line(meS, 'REAL ONES STAY PURE.', 1600);
    await this.line(meS, 'STAY ON THE RADIO, MALIK. I\'M GOIN\' IN.', 2000);
    await this.line(mS, 'I GOT THE CAR.', 1200);
    await this.line(eS, 'WAIT. WHERE MY CAR?', 1600);
    mane.play('mane:walk').setFlipX(false);
    await this.tween({ targets: mane, x: W / 2 + 10, y: 150, scale: 0.6, duration: 900 });
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(420, r));
    layer.destroy(true);
    this.frozen = false;
    this.endCutscene();
    this.startCutscene();
    Audio.stopMusic();
    this.cameras.main.fadeIn(500, 0, 0, 0);
    await this.caption('', 'INSIDE THE LOADING DOCK. THE DRIFTERS ARE STILL ON SHIFT.', 2400);
    this.endCutscene();
  }

  // ------------------------------------------------------------------ Line 2: it isn't making bottles
  private async reveal() {
    this.startCutscene();
    this.showWeaponInCutscene = true;
    this.px = 20.5; this.py = 15.6; this.pa = Math.PI / 2;
    Audio.stopMusic();
    this.sfx('ooh', 0.5);
    await this.wait(600);
    await this.line(this.maneSpeaker(), MANE.twist, 1300);
    await this.line(this.radioSpeaker(), 'WHAT? WHAT YOU SEEIN\'?', 1600);
    await this.line(this.maneSpeaker(), 'THEY AIN\'T MAKIN\' BOTTLES, MALIK. THEY MAKIN\' PIPS.', 2600);
    const screen: Speaker = { x: this.W / 2, headY: 78 };
    this.sfx('recalc', 0.6);
    await this.line(screen, `GIGAZ (ON EVERY SCREEN): ${GIGAZ.hello}`, 2800);
    // every Pip on the line switches on
    this.sfx('alarm', 0.7);
    this.shake(400, 0.006);
    this.pipPhase = true;
    this.wakeMore();
    this.wakeMore();
    this.banner('PIP ARMY', 'FRESH OFF THE LINE');
    await this.wait(1600);
    this.endCutscene();
    this.playing = true;
    Audio.music(this, 'music_plant', 0.42);
    this.tip('pips');
    this.goal();
  }

  // ------------------------------------------------------------------ the Foreman
  private async foremanIntro() {
    const f = this.boss!;
    this.startCutscene();
    this.checkpoint = { x: 31.8, y: 21.5, a: 0 };
    this.px = 31.8; this.py = 21.5; this.pa = 0;
    Audio.stopMusic();
    this.sfx('piston', 0.8);
    f.frame = 2;
    await this.wait(500);
    f.frame = 3; this.shake(300, 0.01); this.sfx('clang', 0.8);
    await this.wait(400);
    f.frame = 0;
    await this.line(this.entSpeaker(f), FOREMAN.hello, 2600);
    await this.line(this.maneSpeaker(), 'CAP WHO?', 1200);
    await this.line(this.entSpeaker(f), FOREMAN.quota, 2200);
    this.endCutscene();
    this.banner('BOSS', 'THE FOREMAN');
    Audio.music(this, 'music_foreman', 0.45);
    this.bossOn = true;
    f.state = 'idle'; f.t = 2.2; f.cd = 1.2;
    this.playing = true;
    this.events.emit('hud');
    this.goal();
    this.time.delayedCall(1800, () => this.tip('boss'));
  }

  updateBoss(dt: number) {
    const f = this.boss;
    if (!f || !this.bossOn || f.hp <= 0) return;
    if (f.flash > 0) f.flash -= dt;
    f.t -= dt;
    const idleT = this.phase2 ? 1.7 : 2.4, dropT = this.phase2 ? 0.85 : 1.1, openT = this.phase2 ? 2.2 : 2.7;
    switch (f.state) {
      case 'idle': {
        f.frame = Math.floor(this.clock * 4) % 2;
        // slide along the rail toward Mane
        const want = Phaser.Math.Clamp(this.py, RAIL[0], RAIL[1]);
        f.y += Math.sign(want - f.y) * Math.min(Math.abs(want - f.y), 0.9 * dt);
        f.cd -= dt;
        if (f.cd <= 0) {
          f.cd = this.phase2 ? 0.9 : 1.2;
          const a = Math.atan2(this.py - f.y, this.px - f.x);
          const n = this.phase2 ? 5 : 3;
          for (let i = 0; i < n; i++) this.capShot(f.x - 0.6, f.y, a + (i - (n - 1) / 2) * 0.22, 4.4);
        }
        if (f.t <= 0) { f.state = 'windup'; f.t = 0.8; this.sfx('alarm', 0.6); this.say(this.entSpeaker(f), FOREMAN.capping, 1200); }
        break;
      }
      case 'windup':
        f.frame = 2;
        if (f.t <= 0) {
          f.state = 'drop'; f.t = dropT;
          this.drop = { x: this.px, y: this.py, t: dropT, total: dropT };
          this.sfx('whistle', 0.8);
          this.tip('shadow');
        }
        break;
      case 'drop': {
        f.frame = 2;
        const d = this.drop!;
        d.t -= dt;
        const near = Math.hypot(this.px - d.x, this.py - d.y) < 1.1;
        this.capShadow = near ? 1 - d.t / d.total : undefined;
        if (d.t <= 0) {
          this.capShadow = undefined;
          f.state = 'slam'; f.t = 0.35; f.frame = 3;
          this.shake(260, 0.014);
          this.sfx('clang', 0.9);
          if (Math.hypot(this.px - d.x, this.py - d.y) < 0.85 && this.capped <= 0) {
            this.getCapped(6);
            this.time.delayedCall(500, () => this.say(this.entSpeaker(f), FOREMAN.capped, 1800));
          } else {
            this.ent('deco', d.x, d.y, 'bigCap', { h: 0.2, life: 1.6 });
            if (Math.random() < 0.5) this.say(this.maneSpeaker(), 'MISSED ME!', 900);
          }
          this.drop = null;
        }
        break;
      }
      case 'slam':
        f.frame = 3;
        if (f.t <= 0) {
          f.state = 'open'; f.t = openT;
          this.sfx('piston', 0.7);
          if (!this.saidHatch) { this.saidHatch = true; this.say(this.radioSpeaker(), 'THE HATCH IS OPEN! HIT IT NOW!', 1800); }
        }
        break;
      case 'open':
        f.frame = f.flash > 0 ? 5 : 4;
        if (f.t <= 0) {
          f.state = 'idle'; f.t = idleT; f.cd = 0.8;
          f.data.cycle++;
          this.sfx('piston', 0.5);
          // every other cycle the chute spits out more Pips
          if (f.data.cycle % 2 === 0) {
            const awake = this.ents.filter((e) => e.kind === 'pip' && e.state !== 'crush').length;
            if (awake < 4) {
              for (const dy of [-1.3, 1.3]) { const p = this.pip(f.x - 1.4, Phaser.Math.Clamp(f.y + dy, 15.6, 28.4)); p.cd = 1.5; }
              this.say(this.entSpeaker(f), FOREMAN.quota, 1500);
              this.sfx('capPop', 0.6);
            }
          }
          // a fresh can rolls out if you're dry
          if (this.cans === 0 && !this.ents.some((e) => e.pick === 'can')) this.pickup(32.5, Phaser.Math.Clamp(this.py, 16, 27), 'can');
        }
        break;
    }
  }

  onBossShot(f: Ent, dmg: number) {
    if (f.state !== 'open') {
      this.sfx('clang', 0.3);
      this.fx(f.x - 0.8, f.y, 0.45, 'spark', [0, 1, 2], 20, 0.25);
      if (!this.saidArmor) { this.saidArmor = true; this.say(this.radioSpeaker(), 'IT\'S ARMORED, MANE! WAIT TILL IT OPENS UP!', 2200); }
      return;
    }
    f.hp = Math.max(0, f.hp - dmg);
    f.flash = 0.12;
    this.sfx('splash', 0.5); this.sfx('punch', 0.5);
    this.addScore(100);
    this.events.emit('hud');
    if (!this.phase2 && f.hp <= BOSS_HP / 2) {
      this.phase2 = true;
      this.say(this.entSpeaker(f), FOREMAN.angry, 2200);
      this.say(this.maneSpeaker(), MANE.bigHit, 1200);
    }
    if (f.hp <= 0) { this.finale = true; this.ending().catch((e) => console.error(e)); }
  }

  // ------------------------------------------------------------------ the ending: the water goes home
  private async ending() {
    const f = this.boss!;
    f.flash = 0;
    this.startCutscene();
    this.capped = 0; this.events.emit('capped', 0);
    this.capShadow = undefined; this.drop = null;
    for (const e of this.ents) if (e.kind === 'cap' || e.kind === 'pip') e.gone = true;
    Audio.stopMusic();
    this.freezeFrame(300, 0xffffff);
    this.addScore(3000);
    this.toast('FOREMAN DOWN! +3000');
    this.sfx('crash', 0.9); this.sfx('punchHeavy', 0.9);
    // it shakes apart
    const x0 = f.x;
    for (let i = 0; i < 8; i++) {
      f.x = x0 + (i % 2 ? 0.06 : -0.06);
      f.frame = i % 2 ? 5 : 4;
      if (i % 2) this.fx(f.x - 0.8, f.y + (Math.random() - 0.5), 0.3 + Math.random() * 0.5, 'spark', [0, 1, 2], 18, 0.3);
      this.sfx('clang', 0.4);
      await this.wait(140);
    }
    f.x = x0; f.frame = 6; f.state = 'broken';
    this.boss = null; this.bossOn = false; this.events.emit('hud'); this.events.emit('goal', '');
    this.px = 32.4; this.py = f.y; this.pa = 0;
    this.shake(600, 0.02);
    this.sfx('geyser', 0.9);
    await this.geyser(f);
    this.rain();
    await this.caption('', 'THE WATER POURS DOWN THE FLOOR DRAINS, BACK INTO THE GROUND.', 2800);
    // the Drifters you saved come looking
    const looks = ['drifterA', 'drifterB', 'drifterC'];
    const crowd = [[34.6, f.y - 1.1], [35.1, f.y], [34.6, f.y + 1.1]].map(([x, y], i) => this.ent('deco', x, y, looks[i], { h: 0.64, frame: 8 }));
    await this.line(this.entSpeaker(crowd[0]), '...WHERE MY CAR?', 1500);
    await this.line(this.entSpeaker(crowd[2]), 'WHERE MY CAR?', 1400);
    await this.line(this.entSpeaker(crowd[1]), 'Y\'ALL SEEN MY CAR?', 1600);
    await this.line(this.maneSpeaker(), 'Y\'ALL CAR IS IN THE PARKIN\' LOT, MANE. GO HOME.', 2400);
    await this.line(this.radioSpeaker(), 'MANE! WORKERS POURIN\' OUT THE DOCK DOORS. THEY KNOW THEY NAMES AGAIN!', 3000);
    await this.caption('NIA', '(FROM THE WATER ON THE FLOOR) THIS WATER FELL AS RAIN BEFORE YOUR GREAT-GREAT-GREAT GRANDPARENTS WERE BORN. IT REMEMBERS.', 3800);
    await this.line(this.maneSpeaker(), 'AND NOW IT\'S GOIN\' HOME. BACK THROUGH THE SAND.', 2400);
    for (const c of crowd) c.gone = true;
    await this.caption('', 'A WORK ORDER SLIDES OUT OF THE FOREMAN: "SEND THE DRILL CREWS UNDER BEALE STREET. DIG DEEPER. -V.C."', 3600);
    await this.line(this.maneSpeaker(), 'UNDER BEALE? THEY TRYNA DIG FOR IT NOW.', 2200);
    await this.line(this.radioSpeaker(), 'THAT\'S DOWNTOWN, MANE.', 1500);
    await this.line(this.maneSpeaker(), 'THEN THAT\'S WHERE WE GOIN\'.', 1800);
    Audio.music(this, 'music_victory', 0.6, false);
    this.maneT = 99; // gold Hydrator for the pose
    this.sfx('shine', 0.7);
    await this.line(this.maneSpeaker(), MANE.complete, 2400);
    await this.caption('', 'NEXT: BEALE BELOW.', 2200);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }

  // a column of water out of the Foreman's core, drawn over the view
  private geyser(f: Ent) {
    const g = this.add.graphics().setDepth(4000);
    const drops: { x: number; y: number; vy: number; vx: number; c: number }[] = [];
    let t = 0;
    return new Promise<void>((resolve) => {
      const ev = this.time.addEvent({
        loop: true, delay: 16, callback: () => {
          t += 16;
          g.clear();
          const x = f.seen ? f.sx : this.W / 2;
          const base = f.seen ? f.top + 60 : 120;
          const h = Math.min(1, t / 400);
          const fade = t > 2000 ? Math.max(0, 1 - (t - 2000) / 500) : 1;
          const w = 18 + Math.sin(t / 40) * 4;
          g.fillStyle(0x7fd8ff, 0.85 * fade).fillRect(x - w / 2, base - 220 * h, w, 220 * h);
          g.fillStyle(0xffffff, 0.9 * fade).fillRect(x - w / 5, base - 220 * h, w / 2.5, 220 * h);
          if (fade > 0 && t < 2200) for (let i = 0; i < 4; i++) drops.push({ x: x + (Math.random() - 0.5) * w, y: base - Math.random() * 150 * h, vy: -2 - Math.random() * 3, vx: (Math.random() - 0.5) * 4, c: Math.random() < 0.3 ? COLORS.goldHi : 0xbfefff });
          for (const d of drops) { d.x += d.vx; d.y += d.vy; d.vy += 0.15; g.fillStyle(d.c, 0.9).fillRect(d.x, d.y, 2, 3); }
          if (t > 2600) { ev.remove(); g.destroy(); resolve(); }
        },
      });
      if (this.skipping) { ev.remove(); g.destroy(); resolve(); }
    });
  }
  private rain() {
    const g = this.add.graphics().setDepth(4500);
    const drops = Array.from({ length: 70 }, () => ({ x: Math.random() * this.W, y: Math.random() * 216 - 216, v: 2 + Math.random() * 2.5, c: Math.random() < 0.35 ? COLORS.goldHi : 0x9fe8ff }));
    this.time.addEvent({
      loop: true, delay: 16, callback: () => {
        if (!g.active) return;
        g.clear();
        for (const d of drops) {
          d.y += d.v;
          if (d.y > 216) { d.y = -6; d.x = Math.random() * (this.W + 40); }
          g.fillStyle(d.c, 0.8).fillRect(d.x, d.y, 1, 4);
        }
      },
    });
  }
}
