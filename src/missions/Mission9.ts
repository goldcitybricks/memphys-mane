import Phaser from 'phaser';
import { ShooterScene, Ent, Speaker } from '../modes/shooter/ShooterScene';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { MANE, TECH_TALK, GIGAZ_CORE, UNCLE_T_MEMORY, AQUIFER_FACT_9 } from './lines';

// The Gigantum, in map cells (x right, y down). Three rooms: the coolant intake (where the pipes come up from the
// aquifer), the server floor (aisles of racks and four memory banks), and cold storage (GigaZ's cooling core).
const INTAKE = [1, 1, 12, 12] as const;
const SERVER = [14, 1, 33, 20] as const;
const CORE = [17, 23, 33, 33] as const;
const CORE_X = 25.5, CORE_Y = 29.0;
const BOSS_HP = 18;
const UPLOAD = 87; // how much of Uncle T GigaZ has (the story bible's progress bar)
const BANKS: [number, number, string][] = [[23.5, 2.2, 'ORANGE MOUND'], [32.8, 8.5, 'WHITEHAVEN'], [17.5, 11.5, 'FRAYSER'], [24.5, 18.8, 'MIDTOWN']];

// Mission 9: THE GIGANTUM. First person again, inside AetherCorp's data center off the last exit of the Loop.
// Mane hunts for the server holding Uncle T's memory: through the intake, across the server floor (setting four
// neighborhoods' memories free), down to cold storage, where GigaZ keeps Uncle T frozen inside its cooling core.
// Break the chillers to thaw it, then flood it. Uncle T remembers everything, and the floor gives way.
export class Mission9 extends ShooterScene {
  wallSheet = 'gigWalls';
  floorSheet = 'gigFloors';
  fog: [number, number, number] = [6, 12, 34];
  wallAlt: Record<number, number> = { 1: 14 }; // the racks blink
  drifterLooks = ['techA', 'techB', 'techC'];
  trapTex = 'iceOverlay';
  trapTitle = 'FROZEN!';
  trapLine = 'CAN\'T FREEZE WHAT\'S ALREADY COOL.';
  trapSfx = 'freeze' as const;
  bossLabel = 'GIGAZ CORE';
  spillTip = 'frostSpill';
  capShadow?: number; // 0..1 while frost forms under Mane (the HUD draws it)
  private intakeCrew: Ent[] = [];
  private banks: Ent[] = [];
  private banksDone = 0;
  private chillersDown = 0;
  private gateOpen = false;
  private bossOn = false;
  private thawed = false;
  private finale = false;
  private saidIce = false;
  private pieces = 0;
  private drop: { x: number; y: number; t: number; total: number } | null = null;
  constructor() { super('Mission9'); }

  // ------------------------------------------------------------------ the map
  buildMap() {
    this.missionId = 'm9-the-gigantum';
    this.intakeCrew = []; this.banks = []; this.banksDone = 0; this.chillersDown = 0;
    this.gateOpen = false; this.bossOn = false; this.thawed = false; this.finale = false; this.saidIce = false; this.pieces = 0;
    this.drop = null; this.capShadow = undefined;
    this.grid(37, 35, '#');

    // the coolant intake: pipes up from the aquifer, the signs on the north wall
    this.room(...INTAKE);
    this.put(3, 0, 'A'); this.put(7, 0, 'P'); this.put(10, 0, 'G');
    for (let y = 1; y <= 12; y++) if (y % 3 === 0) this.put(0, y, 'p');
    for (let x = 1; x <= 12; x++) if (x % 3 === 2) this.put(x, 13, 'p');
    this.put(13, 3, 'W'); this.put(13, 10, 'p');
    this.put(13, 6, 'L');
    for (const [x, y] of [[6, 10], [7, 10], [10, 7]]) this.put(x, y, '~');
    for (const [x, y] of [[6, 2], [2, 9]]) this.put(x, y, 'o');

    // the server floor: five rows of racks with two cross aisles
    this.room(...SERVER);
    for (const y of [4, 7, 10, 13, 16]) for (const [a, b] of [[16, 19], [21, 26], [28, 31]]) for (let x = a; x <= b; x++) this.put(x, y, 'B');
    this.put(18, 0, 'N'); this.put(22, 0, 'C'); this.put(23, 0, 'C'); this.put(26, 0, 'P'); this.put(30, 0, 'G');
    this.put(34, 3, 'W'); this.put(34, 10, 'G'); this.put(34, 14, 'C');
    this.put(23, 21, 'S'); this.put(27, 21, 'S'); this.put(25, 21, 'M');
    for (const [x, y] of [[22, 8], [23, 8], [29, 14], [15, 18]]) this.put(x, y, '~');
    // a little alcove off the east wall (the fact card's hiding spot)
    this.put(34, 18, '.'); this.put(35, 18, '.');

    // down the stairs to cold storage
    this.put(25, 22, '.');
    this.room(...CORE);
    for (let x = 17; x <= 33; x++) { if (x !== 25) this.put(x, 22, x % 3 === 0 ? 'p' : 'F'); this.put(x, 34, x % 4 === 1 ? 'G' : 'F'); }
    for (let y = 23; y <= 33; y++) { this.put(16, y, y % 3 === 0 ? 'p' : 'F'); this.put(34, y, y % 3 === 0 ? 'p' : 'F'); }
    for (const [x, y] of [[23, 27], [28, 27], [23, 31], [28, 31]]) this.put(x, y, 'o');

    // intake: coolant pipes floor to ceiling (solid), AetherCorp boxes, pickups
    for (const [x, y] of [[4.5, 4.5], [8.5, 4.5], [4.5, 8.5], [8.5, 8.5]]) this.prop(x, y, 'coolPipe', 1, 0.22);
    for (const [x, y] of [[11.5, 1.7], [1.7, 11.4], [2.9, 11.5]]) this.prop(x, y, 'aetherCrate', 0.46, 0.36);
    this.pickup(11.5, 11.5, 'can');
    this.pickup(1.6, 1.6, 'wings');
    this.pickup(6.5, 11.5, 'bbq');
    // the night shift, still logged in, and two drones
    [[6.5, 3.0], [10.5, 4.5], [6.5, 6.5], [3.0, 10.0], [10.5, 9.5]].forEach(([x, y], i) => this.intakeCrew.push(this.drifter(x, y, i)));
    for (const [x, y] of [[9.5, 2.5], [9.5, 10.5]]) this.intakeCrew.push(this.drone(x, y));

    // server floor: the memory banks, pickups, a few boxes
    for (const [x, y, name] of BANKS) {
      const b = this.target(x, y, 'memBank', 0.86, 0.3, 5, { anim: { frames: [0, 1], fps: 3, loop: true, t0: Math.random() }, data: { type: 'bank', name, pct: 40 + Math.floor(Math.random() * 50), told: false } });
      this.banks.push(b);
    }
    this.prop(14.7, 12.5, 'aetherCrate', 0.46, 0.36);
    this.prop(33.3, 1.7, 'rackProp', 0.8, 0.3);
    this.pickup(14.6, 1.6, 'can');
    this.pickup(20.5, 14.5, 'bbq');
    this.pickup(27.5, 11.5, 'wings');
    this.pickup(14.6, 19.5, 'can');
    this.pickup(32.6, 19.5, 'can');
    this.pickup(35.5, 18.5, 'fact');
    [[18, 2.5], [27.5, 2.5], [24, 9], [30, 12], [15, 15], [20.5, 18.5], [29, 18.5]].forEach(([x, y], i) => this.drifter(x, y, i + 1));
    for (const [x, y] of [[24, 5.5], [15, 9], [30, 15.5], [26, 18.5]]) this.drone(x, y);

    // cold storage: four chillers keep the core frozen, pickups along the walls
    for (const [x, y] of [[18.4, 24.4], [32.6, 24.4], [18.4, 32.6], [32.6, 32.6]]) this.target(x, y, 'chiller', 0.62, 0.42, 5, { anim: { frames: [0, 1], fps: 8, loop: true, t0: Math.random() }, data: { type: 'chiller' } });
    this.pickup(17.6, 28.5, 'can');
    this.pickup(33.4, 28.5, 'can');
    this.pickup(25.5, 33.4, 'bbq');
    this.pickup(21.5, 33.4, 'wings');

    // cold lights
    for (const [x, y] of [[3, 3], [9, 6], [3, 7], [17, 2], [24, 2], [31, 2], [22, 8.5], [18, 14.5], [29, 11.5], [24, 18], [33, 18], [21, 26], [30, 26], [21, 31], [30, 31]]) this.deco(x + 0.5, y + 0.5, 'lampCold', 0.36, 1 - 0.36);
    // the core, frozen, waiting in the middle of cold storage
    this.boss = this.ent('boss', CORE_X, CORE_Y, 'gigaCore', { h: 1.9, r: 1.0, solid: true, hp: 4, state: 'sleep', data: { maxHp: 4, cycle: 0, noAim: true, wince: 0 } });

    this.px = 2.0; this.py = 6.5; this.pa = 0;
    this.checkpoint = { x: 2.0, y: 6.5, a: 0 };
  }

  drifterLine(e: Ent) {
    const i = Math.floor(e.homeX * 7 + e.homeY * 3);
    return TECH_TALK[i % TECH_TALK.length];
  }
  droneLine() { return ['PLEASE HOLD STILL.', 'SMILE. YOU ARE BEING REMEMBERED.', 'UNAUTHORIZED CAN.', 'YOUR VISIT HAS BEEN SAVED.'][Math.floor(Math.random() * 4)]; }

  stats() { return { ...super.stats(), drivers: this.dronesDown }; }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    this.playing = true;
    this.showWeaponInCutscene = true;
    Audio.music(this, 'music_gigantum', 0.42);
    this.say(this.maneSpeaker(), MANE.start, 1600);
    this.time.delayedCall(900, () => this.tip('start'));
    this.goal();
    this.signLines();

    // the intake: clear it and the door to the server floor opens
    await this.waitUntil(() => this.intakeLeft() === 0);
    this.gateOpen = true;
    this.unlock('L');
    this.goal();
    this.banner('DOOR OPEN', 'SERVER FLOOR');
    this.time.delayedCall(1300, () => this.say(this.radioSpeaker(), 'DOOR\'S OPEN, MANE! UNC\'S MEMORY ON ONE OF THEM SERVERS. FIND IT.', 2800));

    // the server floor
    await this.waitUntil(() => this.px > 14.3 && this.inArea(...SERVER));
    this.checkpoint = { x: 14.6, y: 6.5, a: 0 };
    this.goal();
    this.say(this.screenSpeaker(), `GIGAZ (ON EVERY SCREEN): ${GIGAZ_CORE.floor}`, 3000);
    this.time.delayedCall(3400, () => this.say(this.radioSpeaker(), 'THEM BIG GLOWIN\' CABINETS? MEMORY BANKS. SPRAY \'EM, MANE. LET \'EM GO.', 2800));
    await this.waitUntil(() => this.banksDone >= BANKS.length);
    this.unlock('M');
    this.goal();
    this.banner('DOOR OPEN', 'COLD STORAGE');
    this.time.delayedCall(1200, () => this.say(this.radioSpeaker(), 'COLD STORAGE? THAT\'S DOWNSTAIRS. THE COOLIN\' CORE. SOUTH DOOR, MANE!', 2800));

    // cold storage
    await this.waitUntil(() => this.py > 23.2 && this.inArea(...CORE));
    await this.coreIntro();
    await this.waitUntil(() => this.finale);
  }

  private intakeLeft() { return this.intakeCrew.filter((e) => !e.gone && (e.kind === 'drifter' ? e.state !== 'saved' : e.hp > 0)).length; }
  private goal() {
    let s = '';
    if (!this.gateOpen) s = `CLEAR THE INTAKE ${this.intakeCrew.length - this.intakeLeft()}/${this.intakeCrew.length}`;
    else if (this.banksDone < BANKS.length) s = `MEMORY BANKS ${this.banksDone}/${BANKS.length}`;
    else if (!this.bossOn && !this.finale) s = 'GET TO COLD STORAGE';
    this.events.emit('goal', s);
  }
  private screenSpeaker(): Speaker { const w = this; return ((this as any).__screen ??= { get x() { return w.W / 2; }, get headY() { return 78; } }); }

  // the signs get a line when you walk up to them
  private async signLines() {
    const near = (x: number, y: number) => () => this.playing && Math.abs(this.px - (x + 0.5)) < 2 && Math.abs(this.py - (y + 0.5)) < 2.6;
    this.waitUntil(near(3, 0)).then(() => this.say(this.radioSpeaker(), 'THAT SIGN SAY THEY PULLIN\' COOLANT STRAIGHT OUT THE MEMPHIS SANDS. THAT\'S OUR DRINKIN\' WATER, MANE.', 3600));
    this.waitUntil(near(7, 0)).then(() => this.say(this.maneSpeaker(), '"THE CLOUD REMEMBERS SO YOU DON\'T." LOOKIN\' AHH SLOGAN.', 2800));
    this.waitUntil(near(18, 0)).then(() => this.say(this.maneSpeaker(), 'MEMPHIS UPLOAD 87%? NAH. WE AIN\'T FINNA BE A PERCENTAGE.', 3000));
  }

  onDrifterSaved(_e: Ent) {
    if (this.kos === 1) this.time.delayedCall(2400, () => this.say(this.maneSpeaker(), 'REAL ONES STAY PURE.', 1600));
    else if (this.kos === 4) this.time.delayedCall(2400, () => this.say(this.radioSpeaker(), 'MANE, FOLKS IN LANYARDS COMIN\' OUT THE FRONT ASKIN\' WHERE THEY CAR AT.', 3000));
    this.goal();
  }
  onDroneDown(_e: Ent) { this.goal(); }

  onPickup(e: Ent) {
    if (e.pick !== 'fact') return;
    this.addScore(500);
    this.sfx('portal', 0.6);
    this.toast('AQUIFER FACT CARD! +500');
    this.events.emit('fact', 'AQUIFER FACT CARD', AQUIFER_FACT_9);
  }

  onContinue() {
    this.drop = null; this.capShadow = undefined;
    if (this.bossOn && this.boss) { this.boss.state = 'idle'; this.boss.t = 2.5; this.boss.cd = 1.5; }
  }

  // ------------------------------------------------------------------ memory banks and chillers
  onTargetShot(o: Ent, dmg: number) {
    if (o.data?.type === 'bank') this.hitBank(o, dmg);
    else if (o.data?.type === 'chiller') this.hitChiller(o, dmg);
  }
  private hitBank(b: Ent, dmg: number) {
    b.hp -= dmg; b.flash = 0.12;
    this.sfx('upload', 0.5);
    if (!b.data.told) { b.data.told = true; this.tip('bank'); this.say(this.entSpeaker(b), `${b.data.name}: ${b.data.pct}% UPLOADED`, 2000); }
    if (b.hp > 0) return;
    // the memories go home
    b.kind = 'prop'; b.anim = undefined; b.frame = 2; b.flash = 0;
    this.banksDone++;
    this.sfx('remember', 0.8);
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 120, () => this.splashAt(b.x + (Math.random() - 0.5) * 0.4, b.y + (Math.random() - 0.5) * 0.4, 0.3 + i * 0.2, true));
    this.addScore(400);
    this.toast(`${b.data.name} REMEMBERS! +400`);
    const last = this.banksDone === BANKS.length;
    this.say(this.entSpeaker(b), `${b.data.name}: RESTORED. UNCLE T: ${last ? 'MOVED TO COLD STORAGE.' : 'NOT FOUND.'}`, 2600);
    if (this.banksDone === 1) this.time.delayedCall(2800, () => this.say(this.radioSpeaker(), 'THAT\'S A WHOLE NEIGHBORHOOD REMEMBERIN\', MANE! BUT NO UNC. KEEP GOIN\'.', 2800));
    else if (this.banksDone === 2) this.time.delayedCall(2800, () => this.say(this.screenSpeaker(), `GIGAZ: ${GIGAZ_CORE.bank}`, 2600));
    else if (this.banksDone === 3) this.time.delayedCall(2800, () => this.say(this.maneSpeaker(), 'ONE MORE. WHERE YOU AT, UNC?', 1800));
    this.goal();
  }
  private hitChiller(c: Ent, dmg: number) {
    c.hp -= dmg; c.flash = 0.12;
    this.sfx('clang', 0.4);
    if (c.hp > 0) return;
    c.kind = 'prop'; c.anim = undefined; c.frame = 2; c.flash = 0;
    this.chillersDown++;
    this.sfx('crash', 0.7);
    this.shake(200, 0.008);
    this.fx(c.x, c.y, 0.5, 'spark', [0, 1, 2], 16, 0.3);
    this.addScore(300);
    const f = this.boss;
    if (f) { f.hp = Math.max(0, 4 - this.chillersDown); this.events.emit('hud'); }
    if (this.chillersDown >= 4) { this.thaw(); return; }
    this.toast(`CHILLER DOWN! ${4 - this.chillersDown} LEFT`);
    this.sfx('freeze', 0.4);
    if (f) this.say(this.entSpeaker(f), GIGAZ_CORE.chiller[this.chillersDown - 1], 2000);
  }

  // ------------------------------------------------------------------ cold storage: GigaZ's cooling core
  private async coreIntro() {
    const f = this.boss!;
    this.startCutscene();
    this.checkpoint = { x: 25.5, y: 23.7, a: Math.PI / 2 };
    this.px = 25.5; this.py = 23.7; this.pa = Math.PI / 2;
    Audio.stopMusic();
    this.sfx('drone', 0.5);
    f.frame = 4;
    await this.wait(700);
    f.frame = 0;
    await this.line(this.entSpeaker(f), GIGAZ_CORE.hello, 2600);
    this.meter = { label: `UNCLE T: ${UPLOAD}%`, v: UPLOAD / 100 };
    this.sfx('upload', 0.6);
    await this.line(this.entSpeaker(f), GIGAZ_CORE.file, 3000);
    await this.line(this.maneSpeaker(), 'THAT AIN\'T A FILE. THAT\'S MY UNC.', 2000);
    await this.line(this.radioSpeaker(), 'UNC JUST LOOKED UP OUT THE WINDOW, MANE. LIKE HE HEARD HIS NAME.', 2800);
    this.endCutscene();
    this.banner('BOSS', 'GIGAZ: COOLING CORE');
    Audio.music(this, 'music_core', 0.45);
    this.bossOn = true;
    f.state = 'idle'; f.t = 2.6; f.cd = 1.2;
    this.playing = true;
    this.events.emit('hud');
    this.goal();
    this.time.delayedCall(1800, () => this.tip('ice'));
  }

  private thaw() {
    const f = this.boss!;
    this.thawed = true;
    this.freezeFrame(260, 0xdff6ff);
    this.sfx('shatter', 0.9);
    this.shake(500, 0.016);
    for (let i = 0; i < 10; i++) this.fx(f.x + (Math.random() - 0.5) * 1.6, f.y + (Math.random() - 0.5) * 1.6, 0.2 + Math.random() * 1.1, 'iceShard', [0, 1, 2, 3], 10, 0.2);
    f.hp = BOSS_HP; f.data.maxHp = BOSS_HP; f.data.noAim = false;
    f.state = 'idle'; f.t = 2.4; f.cd = 1.4; f.frame = 8;
    this.drop = null; this.capShadow = undefined;
    this.banner('THAWED', 'FLOOD THE CLOUD');
    this.say(this.entSpeaker(f), GIGAZ_CORE.thawed, 2400);
    this.time.delayedCall(2600, () => this.say(this.radioSpeaker(), 'THE ICE GONE! HIT IT WITH EVERYTHING, MANE!', 2200));
    this.tip('thaw');
    this.events.emit('hud');
  }

  updateBoss(dt: number) {
    const f = this.boss;
    if (!f || !this.bossOn || f.hp <= 0) return;
    if (f.flash > 0) f.flash -= dt;
    if (f.data.wince > 0) f.data.wince -= dt;
    f.t -= dt;
    const thawed = this.thawed;
    const stage = Math.min(3, this.chillersDown);
    const idleT = thawed ? 2.3 : 3.0, dropT = thawed ? 0.95 : 1.2;
    // thawed, it drifts side to side over the pedestal
    if (thawed) {
      const want = CORE_X + Math.sin(this.clock * 0.45) * 3.2;
      this.moveEnt(f, Phaser.Math.Clamp(want - f.x, -1, 1) * 1.2 * dt, 0);
    }
    switch (f.state) {
      case 'idle': {
        f.frame = thawed ? (f.data.wince > 0 ? 11 : 8 + (Math.floor(this.clock * 3) % 2)) : stage;
        f.cd -= dt;
        if (f.cd <= 0) {
          f.cd = thawed ? 1.1 : 1.6;
          const a = Math.atan2(this.py - f.y, this.px - f.x);
          const n = thawed ? 5 : 3;
          for (let i = 0; i < n; i++) this.capShot(f.x, f.y, a + (i - (n - 1) / 2) * 0.2, 4.2, 'iceShard', 0.4);
          this.sfx('zap', 0.3);
        }
        if (f.t <= 0) {
          f.state = 'windup'; f.t = 0.7;
          this.sfx('alarm', 0.4);
          if (Math.random() < 0.5) this.say(this.entSpeaker(f), GIGAZ_CORE.freeze, 1400);
        }
        break;
      }
      case 'windup':
        f.frame = thawed ? 10 : 4 + stage;
        if (f.t <= 0) {
          f.state = 'drop'; f.t = dropT;
          this.drop = { x: this.px, y: this.py, t: dropT, total: dropT };
          this.sfx('freeze', 0.5);
          this.tip('frost');
        }
        break;
      case 'drop': {
        f.frame = thawed ? 10 : 4 + stage;
        const d = this.drop!;
        d.t -= dt;
        const near = Math.hypot(this.px - d.x, this.py - d.y) < 1.1;
        this.capShadow = near ? 1 - d.t / d.total : undefined;
        if (d.t <= 0) {
          this.capShadow = undefined;
          this.shake(200, 0.01);
          if (Math.hypot(this.px - d.x, this.py - d.y) < 0.85 && this.capped <= 0) this.getCapped(5);
          else {
            this.ent('deco', d.x, d.y, 'iceSlab', { h: 0.2, life: 1.6 });
            this.sfx('freeze', 0.4);
            if (Math.random() < 0.4) this.say(this.maneSpeaker(), 'MISSED ME!', 900);
          }
          this.drop = null;
          f.state = 'idle'; f.t = idleT; f.cd = 0.9;
          f.data.cycle++;
          // every other cycle it calls security
          if (f.data.cycle % 2 === 0) {
            const up = this.ents.filter((e) => e.kind === 'drone' && e.hp > 0 && !e.gone).length;
            if (up < 2) {
              for (const dx of [-2.2, 2.2]) { const dr = this.drone(Phaser.Math.Clamp(f.x + dx, 18, 33), f.y - 1.6); dr.state = 'hunt'; dr.cd = 1.6; }
              this.say(this.entSpeaker(f), GIGAZ_CORE.drones, 1600);
              this.sfx('drone', 0.5);
            }
          }
          // a fresh can rolls out if you're dry
          if (this.cans === 0 && !this.ents.some((e) => e.pick === 'can' && !e.gone)) this.pickup(Phaser.Math.Clamp(this.px, 18, 33), 23.6, 'can');
        }
        break;
      }
    }
  }

  onBossShot(f: Ent, dmg: number) {
    if (!this.thawed) {
      this.sfx('clang', 0.3);
      this.fx(f.x, f.y, 0.7, 'spark', [0, 1, 2], 20, 0.25);
      if (!this.saidIce) { this.saidIce = true; this.say(this.radioSpeaker(), 'IT\'S FROZEN SOLID, MANE! THEM CHILLERS KEEPIN\' IT COLD. HIT THE CHILLERS!', 3000); this.tip('ice'); }
      return;
    }
    f.hp = Math.max(0, f.hp - dmg);
    f.flash = 0.1; f.data.wince = 0.25;
    this.sfx('splash', 0.5); this.sfx('punch', 0.4);
    this.addScore(100);
    // every hit pulls a little more of Uncle T back out of the cloud
    const pct = Math.round((UPLOAD * f.hp) / BOSS_HP);
    this.meter = { label: pct > 0 ? `UNCLE T: ${pct}%` : 'UNCLE T: RESTORED', v: pct / 100 };
    const want = Math.min(UNCLE_T_MEMORY.length, Math.floor(((UPLOAD - pct) / UPLOAD) * (UNCLE_T_MEMORY.length + 1)));
    if (want > this.pieces && f.hp > 0) {
      this.pieces = want;
      const piece = UNCLE_T_MEMORY[want - 1];
      this.say(this.entSpeaker(f), `UNCLE T: ${pct}%... ${piece}...`, 2200);
      this.toast(`RESTORED: ${piece}`);
      this.sfx('remember', 0.6);
    } else if (Math.random() < 0.12) this.say(this.entSpeaker(f), GIGAZ_CORE.hit[Math.floor(Math.random() * GIGAZ_CORE.hit.length)], 1600);
    this.events.emit('hud');
    if (f.hp <= 0) { this.finale = true; this.ending().catch((e) => console.error(e)); }
  }

  // ------------------------------------------------------------------ intro: the front gate of The Gigantum
  private async intro() {
    this.startCutscene();
    this.frozen = true;
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const bg = this.add.image(W / 2, 0, 'gigantumExt').setOrigin(0.5, 0);
    const ramp = this.add.tileSprite(0, 176, W, 40, 'rampStrip').setOrigin(0);
    layer.add([bg, ramp]);
    const carX = W / 2 - 90;
    const car = this.add.sprite(-120, 212, 'bigBlueSide', 0).setOrigin(0.5, 1);
    const unc = this.add.sprite(carX - 40, 206, 'uncleTLost').setOrigin(0.5, 61 / 64).setVisible(false);
    const malik = this.add.sprite(carX + 10, 208, 'malik').setOrigin(0.5, 61 / 64).setVisible(false);
    const mane = this.add.sprite(carX + 30, 206, 'mane').setOrigin(0.5, 61 / 64).setVisible(false);
    const dog = this.add.sprite(carX - 10, 210, 'dog').setOrigin(0.5, 1).setVisible(false);
    layer.add([car, unc, dog, malik, mane]);
    const meS = this.speaker(mane, 48), mS = this.speaker(malik, 50), uS = this.speaker(unc, 52);
    const gS = this.speaker({ x: W / 2, y: 92 }, 0);

    Audio.music(this, 'music_lost', 0.28);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.sfx('carBy', 0.6);
    car.play('bigBlueSide:roll');
    await this.tween({ targets: car, x: carX, duration: 1400, ease: 'Quad.easeOut' });
    car.stop(); car.setFrame(0);
    this.banner('MISSION 9', 'THE GIGANTUM');
    await this.wait(2000);
    await this.caption('', 'THE GIGANTUM. 3 A.M. THE SERVERS NEVER SLEEP.', 2600);
    mane.setVisible(true).setPosition(carX + 20, 190).play('mane:jump');
    malik.setVisible(true).setPosition(carX - 6, 208).play('malik:walk');
    dog.setVisible(true).play('dog:idle');
    unc.setVisible(true).play('uncleTLost:idle');
    this.sfx('jump', 0.5);
    await this.tween({ targets: mane, x: carX + 60, y: 206, duration: 400, ease: 'Quad.easeOut' });
    mane.play('mane:idle');
    await this.tween({ targets: malik, x: carX + 30, duration: 500 });
    malik.play('malik:idle');
    await this.line(mS, 'UNC WOULDN\'T LET US TAKE HIS CAR WITHOUT HIM.', 2200);
    unc.play('uncleTLost:talk');
    await this.line(uS, '...JUST MAKIN\' SURE Y\'ALL DON\'T SCRATCH IT. WHOEVER Y\'ALL ARE.', 2800);
    unc.play('uncleTLost:idle');
    await this.line(mS, 'THEY GOT HIS MEMORY IN THERE. THEY GOT EVERYBODY\'S.', 2400);
    this.sfx('glitch', 0.5);
    await this.line(gS, `GIGAZ: ${GIGAZ_CORE.welcome}`, 3000);
    await this.line(gS, 'GIGAZ: WOULD YOU LIKE ME TO REMEMBER THAT FOR YOU?', 2400);
    await this.line(meS, MANE.trashTalkReply, 1600);
    await this.line(mS, 'SEE THEM PIPES? THEY RUN STRAIGHT DOWN TO THE AQUIFER. THEY COOLIN\' THE SERVERS WITH OUR WATER.', 3400);
    await this.line(mS, 'I GOT THE RADIO. FIND UNC\'S MEMORY AND BRING IT HOME.', 2400);
    await this.line(meS, 'I GOT HIM, MALIK. I GOT ALL OF IT.', 2000);
    unc.play('uncleTLost:talk');
    await this.line(uS, '...NICE NIGHT FOR IT.', 1600);
    unc.play('uncleTLost:idle');
    dog.play('dog:bark'); this.sfx('bark', 0.6);
    mane.play('mane:walk');
    await this.tween({ targets: mane, x: W / 2 + 4, y: 176, scale: 0.6, duration: 1000 });
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(420, r));
    layer.destroy(true);
    this.frozen = false;
    this.endCutscene();
    this.startCutscene();
    Audio.stopMusic();
    this.cameras.main.fadeIn(500, 0, 0, 0);
    await this.caption('', 'INSIDE: THE COOLANT INTAKE. THE NIGHT SHIFT IS STILL LOGGED IN.', 2600);
    this.endCutscene();
  }

  // ------------------------------------------------------------------ the ending: Uncle T remembers, and the floor gives way
  private async ending() {
    const f = this.boss!;
    f.flash = 0;
    this.startCutscene();
    this.capped = 0; this.events.emit('capped', 0);
    this.capShadow = undefined; this.drop = null;
    for (const e of this.ents) if (e.kind === 'cap' || e.kind === 'drone') e.gone = true;
    Audio.stopMusic();
    this.freezeFrame(300, 0xffffff);
    this.addScore(3000);
    this.toast('CORE FLOODED! +3000');
    this.sfx('crash', 0.8); this.sfx('shatter', 0.8);
    f.frame = 12; f.state = 'melt';
    this.bossOn = false; this.events.emit('hud'); this.events.emit('goal', '');
    this.px = 25.5; this.py = 24.4; this.pa = Math.atan2(f.y - this.py, f.x - this.px);
    await this.line(this.entSpeaker(f), GIGAZ_CORE.last, 1800);
    this.sfx('geyser', 0.8);
    const water = await this.flood();
    f.gone = true; this.boss = null;
    this.rain();
    await this.caption('', 'THE AQUIFER POURS BACK UP THE COOLANT PIPES. THE CLOUD MELTS INTO RAIN.', 2800);
    // in the car outside
    const unc = this.radioSpeaker('UNCLE T');
    await this.line(this.radioSpeaker(), 'MANE! UNC JUST SAT STRAIGHT UP IN THE CAR!', 2200);
    await this.line(unc, '...NEPHEW? WHY I\'M IN MY OWN PASSENGER SEAT?', 2400);
    await this.line(this.radioSpeaker(), 'UNC! YOU KNOW ME?!', 1500);
    await this.line(unc, 'KNOW YOU? BOY, I TAUGHT YOU TO TIE YOUR SHOES. BRISKET, 14 HOURS, HICKORY. I REMEMBER ALL OF IT.', 3600);
    await this.line(unc, 'GIMME THAT RADIO. ...CAN. YOU HEAR ME?', 2200);
    await this.line(this.maneSpeaker(), 'I HEAR YOU, UNC.', 1400);
    await this.line(unc, 'I WAS THE LAST KEEPER. THIRTY YEARS I KEPT THAT WATER. I\'M THE ONE WHO PUT YOU IN THAT CAN.', 3600);
    await this.line(this.maneSpeaker(), MANE.twist, 1300);
    await this.line(unc, 'WHOLE CITY DRINKS FROM UNDER OUR FEET. AIN\'T MANY PLACES ON EARTH CAN SAY THAT. NOW IT\'S YOURS TO KEEP.', 3800);
    // the floor gives way
    this.sfx('rumble', 0.9);
    this.shake(1400, 0.012);
    await this.line(this.screenSpeaker(), `GIGAZ (STATIC): ${GIGAZ_CORE.drain}`, 3200);
    this.sfx('rumble', 1);
    this.shake(1600, 0.02);
    await this.line(this.radioSpeaker(), 'MANE! THE WHOLE FLOOR\'S CRACKIN\'!', 1600);
    await this.line(this.maneSpeaker(), MANE.hitHard, 1000);
    water.destroy();
    await this.fall();
  }

  // the room fills with glowing aquifer water from the bottom of the screen up
  private flood(): Promise<Phaser.GameObjects.Graphics> {
    const g = this.add.graphics().setDepth(4000);
    const W = this.W;
    let t = 0;
    const sparks = Array.from({ length: 30 }, () => ({ x: Math.random() * W, y: 0, v: 0.3 + Math.random() * 0.8 }));
    return new Promise((resolve) => {
      const draw = () => {
        g.clear();
        const level = Math.min(1, t / 1800);
        const top = 216 - 96 * level;
        g.fillStyle(0x2a7ad8, 0.45).fillRect(0, top, W, 216 - top);
        g.fillStyle(0x7fd8ff, 0.5).fillRect(0, top, W, 3);
        for (let x = 0; x < W; x += 16) g.fillStyle(0xdff6ff, 0.6).fillRect(x + ((t / 40) % 16), top + 1 + Math.sin((x + t / 10) / 20) * 2, 6, 1);
        for (const s of sparks) { s.y = s.y > 0 ? s.y - s.v : 216; if (s.y < top) s.y = 216; g.fillStyle(COLORS.goldHi, 0.8).fillRect(s.x, s.y, 1, 2); }
      };
      if (this.skipping) { t = 1800; draw(); resolve(g); return; }
      let done = false;
      const ev = this.time.addEvent({ loop: true, delay: 16, callback: () => { t += 16; if (!g.active) { ev.remove(); return; } draw(); if (!done && t >= 1800) { done = true; resolve(g); } } });
    });
  }
  private rain() {
    const g = this.add.graphics().setDepth(4500);
    const drops = Array.from({ length: 70 }, () => ({ x: Math.random() * this.W, y: Math.random() * 216 - 216, v: 2 + Math.random() * 2.5, c: Math.random() < 0.35 ? COLORS.goldHi : 0x9fe8ff }));
    const ev = this.time.addEvent({
      loop: true, delay: 16, callback: () => {
        if (!g.active) { ev.remove(); return; }
        g.clear();
        for (const d of drops) {
          d.y += d.v;
          if (d.y > 216) { d.y = -6; d.x = Math.random() * (this.W + 40); }
          g.fillStyle(d.c, 0.8).fillRect(d.x, d.y, 1, 4);
        }
      },
    });
    this.events.once('fallStart', () => g.destroy());
  }

  // down through the ground: soil, the gray clay that shields the aquifer, the sand, and the glowing water
  private async fall() {
    this.events.emit('fallStart');
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const g = this.add.graphics();
    layer.add(g);
    const mane = this.add.sprite(W / 2, 90, 'mane', 27).setOrigin(0.5).setScale(1.2);
    layer.add(mane);
    this.tweens.add({ targets: mane, angle: 360, duration: 1400, repeat: -1 });
    // the strata, scrolling past (depth in pixels)
    const bands: [number, number, number][] = [[0, 0x24242e, 60], [60, 0x4a3426, 120], [180, 0x7a7c86, 150], [330, 0xb08a4a, 260], [590, 0x1c4a8a, 400]];
    let depth = 0;
    const draw = () => {
      g.clear();
      for (const [d0, c, h] of bands) {
        const y = d0 - depth;
        if (y > 216 || y + h < 0) continue;
        g.fillStyle(c, 1).fillRect(0, y, W, h);
        // texture: specks for soil and sand, streaks for clay, light for the water
        for (let k = 0; k < 40; k++) {
          const sx = (k * 97 + d0 * 13) % W, sy = y + ((k * 53) % h);
          if (c === 0x7a7c86) g.fillStyle(0x9a9ca6, 1).fillRect(sx, sy, 18, 1);
          else if (c === 0x1c4a8a) g.fillStyle(k % 3 ? 0x5ce1ff : COLORS.goldHi, 0.7).fillRect(sx, sy, 2, 2);
          else g.fillStyle(0x000000, 0.25).fillRect(sx, sy, 2, 2);
        }
      }
    };
    this.sfx('drain', 0.8);
    const scroll = async (to: number, ms: number) => {
      const o = { v: depth };
      await this.tween({ targets: o, v: to, duration: ms, ease: 'Sine.easeInOut', onUpdate: () => { depth = o.v; draw(); } });
      depth = to; draw();
    };
    draw();
    await scroll(170, 1200);
    await this.caption('', 'DOWN THROUGH THE GRAY CLAY THAT SHIELDS THE AQUIFER...', 2400);
    await scroll(360, 1000);
    await this.caption('', '...THROUGH SAND THAT HAS BEEN FILTERING THIS WATER FOR MORE THAN 2,000 YEARS...', 3000);
    await scroll(600, 1200);
    this.sfx('splash', 0.9); this.sfx('portal', 0.7);
    this.tweens.killTweensOf(mane);
    mane.setAngle(0).setFrame(0).play('mane:idle');
    this.tweens.add({ targets: mane, y: 120, duration: 900, ease: 'Sine.easeOut' });
    const nia = this.add.sprite(W / 2 + 70, 150, 'nia').setOrigin(0.5, 61 / 64).setAlpha(0).play('nia:idle');
    layer.add(nia);
    Audio.music(this, 'music_river', 0.4);
    await this.caption('', 'THE MEMPHIS SANDS AQUIFER. THE SOURCE.', 2600);
    await this.tween({ targets: nia, alpha: 0.9, duration: 800 });
    const nS = this.speaker(nia, 54), meS = this.speaker(mane, 34);
    nia.play('nia:talk');
    await this.line(nS, 'WELCOME HOME, KEEPER.', 2000);
    await this.line(meS, 'UNC KEPT IT THIRTY YEARS. MY TURN.', 2200);
    await this.line(nS, 'THEN KEEP IT WELL. THE KING IS AWAKE, AND HE IS COMING FOR THE SOURCE.', 3200);
    nia.play('nia:idle');
    await this.line(meS, 'THEN HE GOTTA COME THROUGH ME.', 2000);
    Audio.music(this, 'music_victory', 0.6, false);
    this.sfx('shine', 0.7);
    mane.play('mane:victory');
    await this.line(meS, MANE.complete, 2400);
    await this.caption('', 'NEXT: THE SOURCE.', 2200);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    layer.destroy(true);
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }
}
